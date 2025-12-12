package handlers

import (
	"fmt"
	"io"
	"net/http"
	"regexp"
	"unicode"

	"github.com/adzzatxperts/backend/internal/database"
	"github.com/adzzatxperts/backend/internal/models"
	"github.com/adzzatxperts/backend/internal/services"
	"github.com/adzzatxperts/backend/internal/storage"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// CreateProjectVSubmission handles new Project V submissions
func CreateProjectVSubmission(c *gin.Context) {
	userID := c.GetString("userId")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	contributorID, err := uuid.Parse(userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	// Parse multipart form
	if err := c.Request.ParseMultipartForm(50 << 20); err != nil { // 50MB max
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to parse form data"})
		return
	}

	// Get form values
	description := c.PostForm("description")
	githubRepo := c.PostForm("githubRepo")
	commitHash := c.PostForm("commitHash")
	issueURL := c.PostForm("issueUrl")

	// Validate required fields
	if description == "" || githubRepo == "" || commitHash == "" || issueURL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "All fields are required"})
		return
	}

	// Validate description (no non-ASCII characters)
	if !isASCII(description) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Description must contain only ASCII characters"})
		return
	}

	// Validate GitHub repo URL format
	if !isValidGitHubURL(githubRepo) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid GitHub repository URL"})
		return
	}

	// Get uploaded files
	testPatchFile, testPatchHeader, err := c.Request.FormFile("testPatch")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Test patch file is required"})
		return
	}
	defer testPatchFile.Close()

	dockerFile, dockerHeader, err := c.Request.FormFile("dockerfile")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dockerfile is required"})
		return
	}
	defer dockerFile.Close()

	solutionPatchFile, solutionHeader, err := c.Request.FormFile("solutionPatch")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Solution patch file is required"})
		return
	}
	defer solutionPatchFile.Close()

	// Read file data
	testPatchData, err := io.ReadAll(testPatchFile)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read test patch"})
		return
	}

	dockerData, err := io.ReadAll(dockerFile)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read Dockerfile"})
		return
	}

	solutionPatchData, err := io.ReadAll(solutionPatchFile)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read solution patch"})
		return
	}

	// Upload files to Supabase
	testPatchURL, err := storage.UploadFile(testPatchData, testPatchHeader.Filename, "text/plain")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to upload test patch: %v", err)})
		return
	}

	dockerfileURL, err := storage.UploadFile(dockerData, dockerHeader.Filename, "text/plain")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to upload Dockerfile: %v", err)})
		return
	}

	solutionPatchURL, err := storage.UploadFile(solutionPatchData, solutionHeader.Filename, "text/plain")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to upload solution patch: %v", err)})
		return
	}

	// Create submission record
	submission := models.ProjectVSubmission{
		Description:      description,
		GithubRepo:       githubRepo,
		CommitHash:       commitHash,
		IssueURL:         issueURL,
		TestPatchURL:     testPatchURL,
		DockerfileURL:    dockerfileURL,
		SolutionPatchURL: solutionPatchURL,
		ContributorID:    contributorID,
		Status:           models.ProjectVStatusSubmitted,
	}

	if err := database.DB.Create(&submission).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create submission"})
		return
	}

	// Start async processing
	go services.ProcessProjectVSubmission(submission.ID)

	c.JSON(http.StatusCreated, gin.H{
		"message": "Submission created successfully. Processing started.",
		"id":      submission.ID,
	})
}

// GetProjectVSubmissions returns all Project V submissions for the authenticated user
func GetProjectVSubmissions(c *gin.Context) {
	userID := c.GetString("userId")
	userRole := c.GetString("userRole")

	var submissions []models.ProjectVSubmission
	query := database.DB.Preload("Contributor").Preload("Reviewer")

	if userRole == "CONTRIBUTOR" {
		contributorID, _ := uuid.Parse(userID)
		query = query.Where("contributor_id = ?", contributorID)
	}
	// Reviewers and admins see all submissions

	if err := query.Order("created_at DESC").Find(&submissions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch submissions"})
		return
	}

	c.JSON(http.StatusOK, submissions)
}

// GetProjectVSubmission returns a single Project V submission by ID
func GetProjectVSubmission(c *gin.Context) {
	id := c.Param("id")
	submissionID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid submission ID"})
		return
	}

	var submission models.ProjectVSubmission
	if err := database.DB.Preload("Contributor").Preload("Reviewer").First(&submission, submissionID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Submission not found"})
		return
	}

	c.JSON(http.StatusOK, submission)
}

// UpdateProjectVStatus updates the status of a Project V submission (reviewer/admin only)
func UpdateProjectVStatus(c *gin.Context) {
	userRole := c.GetString("userRole")
	if userRole != "REVIEWER" && userRole != "ADMIN" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only reviewers and admins can update status"})
		return
	}

	id := c.Param("id")
	submissionID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid submission ID"})
		return
	}

	var req struct {
		Status string `json:"status" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// Validate status
	validStatuses := []string{
		string(models.ProjectVStatusSubmitted),
		string(models.ProjectVStatusEligibleManualReview),
		string(models.ProjectVStatusFinalChecks),
		string(models.ProjectVStatusApproved),
		string(models.ProjectVStatusRejected),
	}

	isValid := false
	for _, s := range validStatuses {
		if s == req.Status {
			isValid = true
			break
		}
	}

	if !isValid {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid status"})
		return
	}

	var submission models.ProjectVSubmission
	if err := database.DB.First(&submission, submissionID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Submission not found"})
		return
	}

	// Update status and assign reviewer if not already assigned
	submission.Status = models.ProjectVStatus(req.Status)

	if submission.ReviewerID == nil {
		reviewerID, _ := uuid.Parse(c.GetString("userId"))
		submission.ReviewerID = &reviewerID
	}

	if err := database.DB.Save(&submission).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update status"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Status updated successfully", "submission": submission})
}

// DeleteProjectVSubmission deletes a Project V submission (contributor can delete their own, admin can delete any)
func DeleteProjectVSubmission(c *gin.Context) {
	userID := c.GetString("userId")
	userRole := c.GetString("userRole")

	id := c.Param("id")
	submissionID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid submission ID"})
		return
	}

	var submission models.ProjectVSubmission
	if err := database.DB.First(&submission, submissionID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Submission not found"})
		return
	}

	// Check permissions
	if userRole != "ADMIN" && submission.ContributorID.String() != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to delete this submission"})
		return
	}

	// Delete files from Supabase
	storage.DeleteFile(submission.TestPatchURL)
	storage.DeleteFile(submission.DockerfileURL)
	storage.DeleteFile(submission.SolutionPatchURL)

	// Delete submission
	if err := database.DB.Delete(&submission).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete submission"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Submission deleted successfully"})
}

// Helper function to check if string contains only ASCII characters
func isASCII(s string) bool {
	for _, r := range s {
		if r > unicode.MaxASCII {
			return false
		}
	}
	return true
}

// Helper function to validate GitHub URL
func isValidGitHubURL(url string) bool {
	pattern := `^https?://github\.com/[\w-]+/[\w.-]+/?$`
	matched, _ := regexp.MatchString(pattern, url)
	return matched
}
