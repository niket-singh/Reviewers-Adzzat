package handlers

import (
	"io"
	"net/http"
	"strings"

	"github.com/adzzatxperts/backend/internal/database"
	"github.com/adzzatxperts/backend/internal/models"
	"github.com/adzzatxperts/backend/internal/services"
	"github.com/adzzatxperts/backend/internal/storage"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)


func UploadSubmission(c *gin.Context) {
	userID, _ := c.Get("userId")
	userRole, _ := c.Get("userRole")

	
	if userRole != string(models.RoleContributor) && userRole != string(models.RoleAdmin) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only contributors and admins can upload submissions"})
		return
	}

	
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File is required"})
		return
	}
	defer file.Close()

	
	if !strings.HasSuffix(header.Filename, ".zip") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Only ZIP files are allowed"})
		return
	}

	
	title := c.PostForm("title")
	domain := c.PostForm("domain")
	language := c.PostForm("language")

	if title == "" || domain == "" || language == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Title, domain, and language are required"})
		return
	}

	
	fileData, err := io.ReadAll(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read file"})
		return
	}

	
	fileURL, err := storage.UploadFile(fileData, header.Filename, "application/zip")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to upload file"})
		return
	}

	
	uid, _ := uuid.Parse(userID.(string))
	submission := models.Submission{
		Title:         title,
		Domain:        domain,
		Language:      language,
		FileURL:       fileURL,
		FileName:      header.Filename,
		ContributorID: uid,
	}

	if err := database.DB.Create(&submission).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create submission"})
		return
	}

	
	userName, _ := c.Get("userEmail")
	userRoleStr := userRole.(string)
	targetType := "submission"
	userNameStr := userName.(string)

	services.LogActivity(services.LogActivityParams{
		Action:      "UPLOAD",
		Description: "Contributor uploaded task \"" + title + "\"",
		UserID:      &uid,
		UserName:    &userNameStr,
		UserRole:    &userRoleStr,
		TargetID:    &submission.ID,
		TargetType:  &targetType,
		Metadata: map[string]interface{}{
			"title":    title,
			"domain":   domain,
			"language": language,
			"fileName": header.Filename,
		},
	})

	
	testerID, _ := services.AutoAssignSubmission(submission.ID)

	c.JSON(http.StatusCreated, gin.H{
		"message":    "Submission uploaded successfully",
		"submission": submission,
		"assigned":   testerID != nil,
	})
}


func GetSubmissions(c *gin.Context) {
	userID, _ := c.Get("userId")
	userRole, _ := c.Get("userRole")
	uid, _ := uuid.Parse(userID.(string))

	status := c.Query("status")
	search := c.Query("search")

	query := database.DB.Model(&models.Submission{}).
		Preload("Contributor").
		Preload("ClaimedBy").
		Preload("Reviews.Tester")

	
	if userRole == string(models.RoleContributor) {
		query = query.Where("contributor_id = ?", uid)
	} else if userRole == string(models.RoleTester) {
		query = query.Where("claimed_by_id = ?", uid)
	} else if userRole == string(models.RoleAdmin) {
		
		viewMode := c.Query("view")
		if viewMode == "mine" {
			
			query = query.Where("claimed_by_id = ?", uid)
		}
		
	}

	
	if status != "" && status != "all" {
		query = query.Where("status = ?", strings.ToUpper(status))
	}

	
	if search != "" {
		searchPattern := "%" + search + "%"
		query = query.Where("title ILIKE ? OR domain ILIKE ? OR language ILIKE ?",
			searchPattern, searchPattern, searchPattern)
	}

	var submissions []models.Submission
	if err := query.Order("created_at DESC").Find(&submissions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch submissions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"submissions": submissions})
}


func GetReviewedSubmissions(c *gin.Context) {
	userID, _ := c.Get("userId")
	userRole, _ := c.Get("userRole")
	uid, _ := uuid.Parse(userID.(string))

	
	if userRole != string(models.RoleTester) && userRole != string(models.RoleAdmin) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	
	search := c.Query("search")

	
	var reviews []models.Review
	var query *gorm.DB

	if userRole == string(models.RoleAdmin) {
		
		query = database.DB.Model(&models.Review{})
	} else {
		
		query = database.DB.Where("tester_id = ?", uid)
	}

	if err := query.Find(&reviews).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch reviews"})
		return
	}

	
	submissionIDs := make([]uuid.UUID, 0)
	for _, review := range reviews {
		submissionIDs = append(submissionIDs, review.SubmissionID)
	}

	if len(submissionIDs) == 0 {
		c.JSON(http.StatusOK, gin.H{"submissions": []models.Submission{}})
		return
	}

	
	submissionQuery := database.DB.
		Preload("Contributor").
		Preload("Reviews.Tester").
		Preload("ClaimedBy").
		Where("id IN ?", submissionIDs)

	
	if search != "" {
		searchPattern := "%" + search + "%"
		submissionQuery = submissionQuery.Where("title ILIKE ? OR domain ILIKE ? OR language ILIKE ?",
			searchPattern, searchPattern, searchPattern)
	}

	var submissions []models.Submission
	if err := submissionQuery.Order("updated_at DESC").Find(&submissions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch submissions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"submissions": submissions})
}


func GetSubmission(c *gin.Context) {
	submissionID := c.Param("id")
	sid, err := uuid.Parse(submissionID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid submission ID"})
		return
	}

	var submission models.Submission
	if err := database.DB.
		Preload("Contributor").
		Preload("ClaimedBy").
		Preload("Reviews.Tester").
		First(&submission, sid).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Submission not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"submission": submission})
}


func DeleteSubmission(c *gin.Context) {
	submissionID := c.Param("id")
	sid, err := uuid.Parse(submissionID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid submission ID"})
		return
	}

	userID, _ := c.Get("userId")
	userRole, _ := c.Get("userRole")
	uid, _ := uuid.Parse(userID.(string))

	var submission models.Submission
	if err := database.DB.Preload("Contributor").Preload("Reviews").First(&submission, sid).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Submission not found"})
		return
	}

	
	if userRole == string(models.RoleContributor) && submission.ContributorID != uid {
		c.JSON(http.StatusForbidden, gin.H{"error": "You can only delete your own submissions"})
		return
	}

	
	storage.DeleteFile(submission.FileURL)

	
	if err := database.DB.Delete(&submission).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete submission"})
		return
	}

	
	userName, _ := c.Get("userEmail")
	userRoleStr := userRole.(string)
	userNameStr := userName.(string)
	targetType := "submission"

	services.LogActivity(services.LogActivityParams{
		Action:      "DELETE",
		Description: userRoleStr + " deleted submission \"" + submission.Title + "\"",
		UserID:      &uid,
		UserName:    &userNameStr,
		UserRole:    &userRoleStr,
		TargetID:    &sid,
		TargetType:  &targetType,
		Metadata: map[string]interface{}{
			"title":           submission.Title,
			"contributorName": submission.Contributor.Name,
			"reviewCount":     len(submission.Reviews),
		},
	})

	c.JSON(http.StatusOK, gin.H{"message": "Submission deleted successfully"})
}


func GetDownloadURL(c *gin.Context) {
	submissionID := c.Param("id")
	sid, err := uuid.Parse(submissionID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid submission ID"})
		return
	}

	userID, _ := c.Get("userId")
	userRole, _ := c.Get("userRole")
	uid, _ := uuid.Parse(userID.(string))

	var submission models.Submission
	if err := database.DB.First(&submission, sid).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Submission not found"})
		return
	}

	
	isOwner := submission.ContributorID == uid
	canDownload := userRole == string(models.RoleTester) || userRole == string(models.RoleAdmin) || (userRole == string(models.RoleContributor) && isOwner)

	if !canDownload {
		c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to download this file"})
		return
	}

	
	fileData, err := storage.DownloadFile(submission.FileURL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to download file"})
		return
	}

	
	c.Header("Content-Description", "File Transfer")
	c.Header("Content-Transfer-Encoding", "binary")
	c.Header("Content-Disposition", "attachment; filename=\""+submission.FileName+"\"")
	c.Header("Content-Type", "application/zip")
	c.Header("Cache-Control", "no-cache, no-store, must-revalidate")
	c.Header("Pragma", "no-cache")
	c.Header("Expires", "0")

	
	c.Data(http.StatusOK, "application/zip", fileData)
}


func SubmitFeedback(c *gin.Context) {
	submissionID := c.Param("id")
	sid, err := uuid.Parse(submissionID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid submission ID"})
		return
	}

	userID, _ := c.Get("userId")
	userRole, _ := c.Get("userRole")

	if userRole != string(models.RoleTester) && userRole != string(models.RoleAdmin) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only testers and admins can submit feedback"})
		return
	}

	var req struct {
		Feedback        string  `json:"feedback" binding:"required"`
		AccountPostedIn *string `json:"accountPostedIn"`
		MarkAsEligible  bool    `json:"markAsEligible"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	uid, _ := uuid.Parse(userID.(string))

	
	review := models.Review{
		Feedback:        req.Feedback,
		AccountPostedIn: req.AccountPostedIn,
		SubmissionID:    sid,
		TesterID:        uid,
	}

	if err := database.DB.Create(&review).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to submit feedback"})
		return
	}

	
	if req.MarkAsEligible {
		database.DB.Model(&models.Submission{}).
			Where("id = ?", sid).
			Update("status", models.StatusEligible)
	}

	
	var submission models.Submission
	database.DB.Preload("Contributor").First(&submission, sid)

	userName, _ := c.Get("userEmail")
	userRoleStr := userRole.(string)
	userNameStr := userName.(string)
	targetType := "submission"

	services.LogActivity(services.LogActivityParams{
		Action:      "REVIEW",
		Description: userRoleStr + " reviewed task \"" + submission.Title + "\"",
		UserID:      &uid,
		UserName:    &userNameStr,
		UserRole:    &userRoleStr,
		TargetID:    &sid,
		TargetType:  &targetType,
		Metadata: map[string]interface{}{
			"markAsEligible": req.MarkAsEligible,
			"hasAccount":     req.AccountPostedIn != nil,
		},
	})

	c.JSON(http.StatusCreated, gin.H{
		"message": "Feedback submitted successfully",
		"review":  review,
	})
}


func ApproveSubmission(c *gin.Context) {
	submissionID := c.Param("id")
	sid, err := uuid.Parse(submissionID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid submission ID"})
		return
	}

	var submission models.Submission
	if err := database.DB.Preload("Contributor").First(&submission, sid).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Submission not found"})
		return
	}

	if submission.Status != models.StatusEligible {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Only eligible submissions can be approved"})
		return
	}

	submission.Status = models.StatusApproved
	if err := database.DB.Save(&submission).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to approve submission"})
		return
	}

	
	userID, _ := c.Get("userId")
	userName, _ := c.Get("userEmail")
	userRole, _ := c.Get("userRole")
	uid, _ := uuid.Parse(userID.(string))
	userNameStr := userName.(string)
	userRoleStr := userRole.(string)
	targetType := "submission"

	services.LogActivity(services.LogActivityParams{
		Action:      "APPROVE",
		Description: "Admin approved task \"" + submission.Title + "\"",
		UserID:      &uid,
		UserName:    &userNameStr,
		UserRole:    &userRoleStr,
		TargetID:    &sid,
		TargetType:  &targetType,
		Metadata: map[string]interface{}{
			"contributorName": submission.Contributor.Name,
		},
	})

	c.JSON(http.StatusOK, gin.H{"message": "Submission approved successfully"})
}


func ClaimSubmission(c *gin.Context) {
	submissionID := c.Param("id")
	sid, err := uuid.Parse(submissionID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid submission ID"})
		return
	}

	
	userID, _ := c.Get("userId")
	userRole, _ := c.Get("userRole")

	if userRole != string(models.RoleAdmin) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only admins can manually claim tasks"})
		return
	}

	uid, _ := uuid.Parse(userID.(string))

	var submission models.Submission
	if err := database.DB.Preload("Contributor").First(&submission, sid).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Submission not found"})
		return
	}

	
	if submission.Status != models.StatusPending && submission.Status != models.StatusClaimed {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Can only claim pending or claimed tasks"})
		return
	}

	
	submission.ClaimedByID = &uid
	submission.Status = models.StatusClaimed
	if err := database.DB.Save(&submission).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to claim submission"})
		return
	}

	
	userName, _ := c.Get("userEmail")
	userNameStr := userName.(string)
	userRoleStr := userRole.(string)
	targetType := "submission"

	services.LogActivity(services.LogActivityParams{
		Action:      "MANUAL_CLAIM",
		Description: "Admin manually claimed task \"" + submission.Title + "\"",
		UserID:      &uid,
		UserName:    &userNameStr,
		UserRole:    &userRoleStr,
		TargetID:    &sid,
		TargetType:  &targetType,
		Metadata: map[string]interface{}{
			"contributorName": submission.Contributor.Name,
		},
	})

	c.JSON(http.StatusOK, gin.H{"message": "Task claimed successfully"})
}
