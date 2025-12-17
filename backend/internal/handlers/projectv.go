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
	title := c.PostForm("title")
	language := c.PostForm("language")
	category := c.PostForm("category")
	difficulty := c.PostForm("difficulty")
	description := c.PostForm("description")
	githubRepo := c.PostForm("githubRepo")
	commitHash := c.PostForm("commitHash")
	issueURL := c.PostForm("issueUrl")

	// Validate required fields
	if title == "" || language == "" || category == "" || difficulty == "" || description == "" || githubRepo == "" || commitHash == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "All required fields must be filled"})
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
		Title:            title,
		Language:         language,
		Category:         category,
		Difficulty:       difficulty,
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

	// Auto-assign tester based on workload
	testerID, err := services.AutoAssignTester(submission.ID)
	if err == nil && testerID != nil {
		submission.TesterID = testerID
		submission.Status = models.ProjectVStatusInTesting
		database.DB.Save(&submission)
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Submission created successfully.",
		"id":      submission.ID,
	})
}

// GetProjectVSubmissions returns all Project V submissions for the authenticated user
func GetProjectVSubmissions(c *gin.Context) {
	userID := c.GetString("userId")
	userRole := c.GetString("userRole")

	var submissions []models.ProjectVSubmission
	query := database.DB.Preload("Contributor").Preload("Tester").Preload("Reviewer")

	if userRole == "CONTRIBUTOR" {
		contributorID, _ := uuid.Parse(userID)
		query = query.Where("contributor_id = ?", contributorID)
	}
	// Testers and admins see all submissions

	if err := query.Order("created_at DESC").Find(&submissions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch submissions"})
		return
	}

	// Generate signed URLs for all file URLs with proper download filenames
	for i := range submissions {
		testPatchURL, err := storage.GetSignedDownloadURL(submissions[i].TestPatchURL, "test.patch", 3600)
		if err == nil {
			submissions[i].TestPatchURL = testPatchURL
		}

		dockerfileURL, err := storage.GetSignedDownloadURL(submissions[i].DockerfileURL, "Dockerfile", 3600)
		if err == nil {
			submissions[i].DockerfileURL = dockerfileURL
		}

		solutionPatchURL, err := storage.GetSignedDownloadURL(submissions[i].SolutionPatchURL, "solution.patch", 3600)
		if err == nil {
			submissions[i].SolutionPatchURL = solutionPatchURL
		}
	}

	// Hide sensitive fields based on role
	if userRole == "CONTRIBUTOR" {
		for i := range submissions {
			submissions[i].AccountPostedIn = nil
			submissions[i].SubmittedAccount = nil
			submissions[i].TaskLink = nil
			submissions[i].TaskLinkSubmitted = nil
			submissions[i].Reviewer = nil
			submissions[i].ReviewerID = nil
		}
	}

	// Hide submittedAccount from reviewers (only tester and admin can see)
	if userRole == "REVIEWER" {
		for i := range submissions {
			submissions[i].SubmittedAccount = nil
		}
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
	if err := database.DB.Preload("Contributor").Preload("Tester").Preload("Reviewer").First(&submission, submissionID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Submission not found"})
		return
	}

	// Generate signed URLs for files with proper download filenames
	testPatchURL, err := storage.GetSignedDownloadURL(submission.TestPatchURL, "test.patch", 3600)
	if err == nil {
		submission.TestPatchURL = testPatchURL
	}

	dockerfileURL, err := storage.GetSignedDownloadURL(submission.DockerfileURL, "Dockerfile", 3600)
	if err == nil {
		submission.DockerfileURL = dockerfileURL
	}

	solutionPatchURL, err := storage.GetSignedDownloadURL(submission.SolutionPatchURL, "solution.patch", 3600)
	if err == nil {
		submission.SolutionPatchURL = solutionPatchURL
	}

	c.JSON(http.StatusOK, submission)
}

// UpdateProjectVStatus updates the status of a Project V submission (tester/admin only)
func UpdateProjectVStatus(c *gin.Context) {
	userRole := c.GetString("userRole")
	if userRole != "TESTER" && userRole != "ADMIN" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only testers and admins can update status"})
		return
	}

	id := c.Param("id")
	submissionID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid submission ID"})
		return
	}

	var req struct {
		Status          string  `json:"status" binding:"required"`
		AccountPostedIn *string `json:"accountPostedIn,omitempty"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// Only admin can approve tasks
	if req.Status == string(models.ProjectVStatusApproved) && userRole != "ADMIN" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only admins can approve tasks"})
		return
	}

	// Validate status
	validStatuses := []string{
		string(models.ProjectVStatusSubmitted),
		string(models.ProjectVStatusInTesting),
		string(models.ProjectVStatusPendingReview),
		string(models.ProjectVStatusChangesRequested),
		string(models.ProjectVStatusChangesDone),
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

	// Update status and assign tester if not already assigned
	submission.Status = models.ProjectVStatus(req.Status)

	if submission.TesterID == nil {
		testerID, _ := uuid.Parse(c.GetString("userId"))
		submission.TesterID = &testerID
	}

	// If status is PENDING_REVIEW and no reviewer assigned, assign one
	if req.Status == string(models.ProjectVStatusPendingReview) && submission.ReviewerID == nil {
		reviewerID, err := services.AutoAssignReviewer(submissionID)
		if err == nil && reviewerID != nil {
			submission.ReviewerID = reviewerID
		}
	}

	// Update accountPostedIn if provided
	if req.AccountPostedIn != nil {
		submission.AccountPostedIn = req.AccountPostedIn
	}

	if err := database.DB.Save(&submission).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update status"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Status updated successfully", "submission": submission})
}

// MarkChangesRequested allows reviewers to request changes with feedback
func MarkChangesRequested(c *gin.Context) {
	userRole := c.GetString("userRole")
	if userRole != "REVIEWER" && userRole != "ADMIN" {
		c.JSON(http.StatusForbidden, gin.H{
			"error":        "Only reviewers can request changes",
			"receivedRole": userRole,
			"expectedRole": "REVIEWER or ADMIN",
		})
		return
	}

	id := c.Param("id")
	submissionID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid submission ID"})
		return
	}

	var req struct {
		Feedback string `json:"feedback" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Feedback is required"})
		return
	}

	var submission models.ProjectVSubmission
	if err := database.DB.First(&submission, submissionID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Submission not found"})
		return
	}

	// Verify task is in correct status
	if submission.Status != models.ProjectVStatusEligible &&
		submission.Status != models.ProjectVStatusPendingReview &&
		submission.Status != models.ProjectVStatusChangesDone {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":         "Task is not in a reviewable state",
			"currentStatus": submission.Status,
			"allowedStates": "ELIGIBLE_FOR_MANUAL_REVIEW, PENDING_REVIEW, or CHANGES_DONE",
		})
		return
	}

	// Assign reviewer if not already assigned
	userID, _ := uuid.Parse(c.GetString("userId"))
	if submission.ReviewerID == nil {
		submission.ReviewerID = &userID
	}

	// Update submission
	submission.Status = models.ProjectVStatusChangesRequested
	submission.ReviewerFeedback = req.Feedback
	submission.HasChangesRequested = true
	submission.ChangesDone = false

	if err := database.DB.Save(&submission).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update submission"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Changes requested successfully", "submission": submission})
}

// MarkFinalChecks allows reviewers to mark task for final checks
func MarkFinalChecks(c *gin.Context) {
	userRole := c.GetString("userRole")
	if userRole != "REVIEWER" && userRole != "ADMIN" {
		c.JSON(http.StatusForbidden, gin.H{
			"error":        "Only reviewers can mark for final checks",
			"receivedRole": userRole,
			"expectedRole": "REVIEWER or ADMIN",
		})
		return
	}

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

	// Verify task is in correct status
	if submission.Status != models.ProjectVStatusEligible &&
		submission.Status != models.ProjectVStatusPendingReview &&
		submission.Status != models.ProjectVStatusChangesDone {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":         "Task is not in a reviewable state",
			"currentStatus": submission.Status,
			"allowedStates": "ELIGIBLE_FOR_MANUAL_REVIEW, PENDING_REVIEW, or CHANGES_DONE",
		})
		return
	}

	// Assign reviewer if not already assigned
	userID, _ := uuid.Parse(c.GetString("userId"))
	if submission.ReviewerID == nil {
		submission.ReviewerID = &userID
	}

	// Update submission
	submission.Status = models.ProjectVStatusFinalChecks

	if err := database.DB.Save(&submission).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update submission"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Marked for final checks successfully", "submission": submission})
}

// MarkChangesDone allows contributors to mark changes as done
func MarkChangesDone(c *gin.Context) {
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

	// Verify user is the contributor or admin
	if userRole != "ADMIN" && submission.ContributorID.String() != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to update this submission"})
		return
	}

	// Verify task has changes requested
	if submission.Status != models.ProjectVStatusChangesRequested {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Task does not have changes requested"})
		return
	}

	// Update submission - send back to tester, keep the same reviewer
	submission.Status = models.ProjectVStatusInTesting
	submission.ChangesDone = true

	if err := database.DB.Save(&submission).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update submission"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Changes marked as done successfully", "submission": submission})
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

// MarkTaskSubmitted allows testers to mark task as submitted with account info
func MarkTaskSubmitted(c *gin.Context) {
	userRole := c.GetString("userRole")
	if userRole != "TESTER" && userRole != "ADMIN" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only testers can mark task as submitted"})
		return
	}

	id := c.Param("id")
	submissionID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid submission ID"})
		return
	}

	var req struct {
		SubmittedAccount  string `json:"submittedAccount" binding:"required"`
		TaskLinkSubmitted string `json:"taskLinkSubmitted" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Submitted account and task link are required"})
		return
	}

	var submission models.ProjectVSubmission
	if err := database.DB.First(&submission, submissionID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Submission not found"})
		return
	}

	// Assign tester if not already assigned
	userID, _ := uuid.Parse(c.GetString("userId"))
	if submission.TesterID == nil {
		submission.TesterID = &userID
	}

	// Update submission - mark as submitted to platform
	submission.Status = models.ProjectVStatusTaskSubmittedToPlatform
	submission.SubmittedAccount = &req.SubmittedAccount
	submission.TaskLinkSubmitted = &req.TaskLinkSubmitted

	if err := database.DB.Save(&submission).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update submission"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Task marked as submitted successfully", "submission": submission})
}

// MarkEligibleForManualReview allows testers to mark task as eligible with task link
func MarkEligibleForManualReview(c *gin.Context) {
	userRole := c.GetString("userRole")
	if userRole != "TESTER" && userRole != "ADMIN" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only testers can mark task as eligible"})
		return
	}

	id := c.Param("id")
	submissionID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid submission ID"})
		return
	}

	var req struct {
		TaskLink string `json:"taskLink" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Task link is required"})
		return
	}

	var submission models.ProjectVSubmission
	if err := database.DB.First(&submission, submissionID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Submission not found"})
		return
	}

	// Assign tester if not already assigned
	userID, _ := uuid.Parse(c.GetString("userId"))
	if submission.TesterID == nil {
		submission.TesterID = &userID
	}

	// Update submission - mark as eligible and assign to reviewer
	submission.Status = models.ProjectVStatusEligible
	submission.TaskLink = &req.TaskLink

	// Auto-assign reviewer only if not already assigned (preserve reviewer for changes done flow)
	if submission.ReviewerID == nil {
		reviewerID, err := services.AutoAssignReviewer(submissionID)
		if err == nil && reviewerID != nil {
			submission.ReviewerID = reviewerID
		}
	}

	if err := database.DB.Save(&submission).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update submission"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Task marked as eligible for manual review successfully", "submission": submission})
}

// SendTesterFeedback allows testers to send feedback (marks task as REWORK)
func SendTesterFeedback(c *gin.Context) {
	userRole := c.GetString("userRole")
	if userRole != "TESTER" && userRole != "ADMIN" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only testers can send feedback"})
		return
	}

	id := c.Param("id")
	submissionID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid submission ID"})
		return
	}

	var req struct {
		Feedback string `json:"feedback" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Feedback is required"})
		return
	}

	var submission models.ProjectVSubmission
	if err := database.DB.First(&submission, submissionID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Submission not found"})
		return
	}

	// Assign tester if not already assigned
	userID, _ := uuid.Parse(c.GetString("userId"))
	if submission.TesterID == nil {
		submission.TesterID = &userID
	}

	// Update submission - mark as rework with feedback
	submission.Status = models.ProjectVStatusRework
	submission.TesterFeedback = req.Feedback

	if err := database.DB.Save(&submission).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update submission"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Feedback sent successfully", "submission": submission})
}

// MarkRejected allows reviewers to reject a task with reason
func MarkRejected(c *gin.Context) {
	userRole := c.GetString("userRole")
	if userRole != "REVIEWER" && userRole != "ADMIN" {
		c.JSON(http.StatusForbidden, gin.H{
			"error":        "Only reviewers can reject tasks",
			"receivedRole": userRole,
			"expectedRole": "REVIEWER or ADMIN",
		})
		return
	}

	id := c.Param("id")
	submissionID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid submission ID"})
		return
	}

	var req struct {
		RejectionReason string `json:"rejectionReason" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Rejection reason is required"})
		return
	}

	var submission models.ProjectVSubmission
	if err := database.DB.First(&submission, submissionID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Submission not found"})
		return
	}

	// Verify task is in correct status
	if submission.Status != models.ProjectVStatusEligible && submission.Status != models.ProjectVStatusPendingReview && submission.Status != models.ProjectVStatusChangesDone {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Task is not in a reviewable state"})
		return
	}

	// Assign reviewer if not already assigned
	userID, _ := uuid.Parse(c.GetString("userId"))
	if submission.ReviewerID == nil {
		submission.ReviewerID = &userID
	}

	// Update submission - mark as rejected with reason
	submission.Status = models.ProjectVStatusRejected
	submission.RejectionReason = &req.RejectionReason

	if err := database.DB.Save(&submission).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update submission"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Task rejected successfully", "submission": submission})
}

// ResubmitProjectVSubmission allows contributors to resubmit a task with feedback
func ResubmitProjectVSubmission(c *gin.Context) {
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

	// Verify user is the contributor or admin
	if userRole != "ADMIN" && submission.ContributorID.String() != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to update this submission"})
		return
	}

	// Verify task has feedback (REWORK or CHANGES_REQUESTED)
	if submission.Status != models.ProjectVStatusRework && submission.Status != models.ProjectVStatusChangesRequested {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Task does not have feedback to address"})
		return
	}

	// Parse multipart form
	if err := c.Request.ParseMultipartForm(50 << 20); err != nil { // 50MB max
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to parse form data"})
		return
	}

	// Get form values (only update if provided)
	title := c.PostForm("title")
	language := c.PostForm("language")
	category := c.PostForm("category")
	difficulty := c.PostForm("difficulty")
	description := c.PostForm("description")
	githubRepo := c.PostForm("githubRepo")
	commitHash := c.PostForm("commitHash")
	issueURL := c.PostForm("issueUrl")

	// Update fields if provided
	if title != "" {
		submission.Title = title
	}
	if language != "" {
		submission.Language = language
	}
	if category != "" {
		submission.Category = category
	}
	if difficulty != "" {
		submission.Difficulty = difficulty
	}
	if description != "" {
		// Validate description (no non-ASCII characters)
		if !isASCII(description) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Description must contain only ASCII characters"})
			return
		}
		submission.Description = description
	}
	if githubRepo != "" {
		// Validate GitHub repo URL format
		if !isValidGitHubURL(githubRepo) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid GitHub repository URL"})
			return
		}
		submission.GithubRepo = githubRepo
	}
	if commitHash != "" {
		submission.CommitHash = commitHash
	}
	if issueURL != "" {
		submission.IssueURL = issueURL
	}

	// Handle file uploads (optional - only if provided)
	testPatchFile, testPatchHeader, err := c.Request.FormFile("testPatch")
	if err == nil {
		defer testPatchFile.Close()
		testPatchData, err := io.ReadAll(testPatchFile)
		if err == nil {
			// Delete old file and upload new one
			storage.DeleteFile(submission.TestPatchURL)
			testPatchURL, err := storage.UploadFile(testPatchData, testPatchHeader.Filename, "text/plain")
			if err == nil {
				submission.TestPatchURL = testPatchURL
			}
		}
	}

	dockerFile, dockerHeader, err := c.Request.FormFile("dockerfile")
	if err == nil {
		defer dockerFile.Close()
		dockerData, err := io.ReadAll(dockerFile)
		if err == nil {
			// Delete old file and upload new one
			storage.DeleteFile(submission.DockerfileURL)
			dockerfileURL, err := storage.UploadFile(dockerData, dockerHeader.Filename, "text/plain")
			if err == nil {
				submission.DockerfileURL = dockerfileURL
			}
		}
	}

	solutionPatchFile, solutionHeader, err := c.Request.FormFile("solutionPatch")
	if err == nil {
		defer solutionPatchFile.Close()
		solutionPatchData, err := io.ReadAll(solutionPatchFile)
		if err == nil {
			// Delete old file and upload new one
			storage.DeleteFile(submission.SolutionPatchURL)
			solutionPatchURL, err := storage.UploadFile(solutionPatchData, solutionHeader.Filename, "text/plain")
			if err == nil {
				submission.SolutionPatchURL = solutionPatchURL
			}
		}
	}

	// Update status based on current state
	if submission.Status == models.ProjectVStatusRework {
		submission.Status = models.ProjectVStatusReworkDone
	} else if submission.Status == models.ProjectVStatusChangesRequested {
		submission.Status = models.ProjectVStatusInTesting
		submission.ChangesDone = true
	}

	// Save the updated submission
	if err := database.DB.Save(&submission).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update submission"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    "Submission resubmitted successfully",
		"submission": submission,
	})
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
