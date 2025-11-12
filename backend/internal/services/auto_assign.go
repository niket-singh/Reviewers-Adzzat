package services

import (
	"time"

	"github.com/adzzatxperts/backend/internal/database"
	"github.com/adzzatxperts/backend/internal/models"
	"github.com/google/uuid"
)

// AutoAssignSubmission automatically assigns a submission to the reviewer with the least tasks
func AutoAssignSubmission(submissionID uuid.UUID) (*uuid.UUID, error) {
	// Get all approved reviewers
	var reviewers []models.User
	err := database.DB.Where("role = ? AND is_approved = ?", models.RoleReviewer, true).Find(&reviewers).Error
	if err != nil {
		return nil, err
	}

	if len(reviewers) == 0 {
		return nil, nil // No reviewers available
	}

	// Count tasks for each reviewer
	type ReviewerTaskCount struct {
		ReviewerID uuid.UUID
		Count      int64
	}

	var reviewerCounts []ReviewerTaskCount
	for _, reviewer := range reviewers {
		var count int64
		database.DB.Model(&models.Submission{}).
			Where("claimed_by_id = ? AND status IN ?", reviewer.ID, []string{
				string(models.StatusPending),
				string(models.StatusClaimed),
				string(models.StatusEligible),
			}).
			Count(&count)

		reviewerCounts = append(reviewerCounts, ReviewerTaskCount{
			ReviewerID: reviewer.ID,
			Count:      count,
		})
	}

	// Find reviewer with least tasks
	minCount := reviewerCounts[0].Count
	selectedReviewerID := reviewerCounts[0].ReviewerID

	for _, rc := range reviewerCounts {
		if rc.Count < minCount {
			minCount = rc.Count
			selectedReviewerID = rc.ReviewerID
		}
	}

	// Assign the task
	now := time.Now()
	err = database.DB.Model(&models.Submission{}).
		Where("id = ?", submissionID).
		Updates(map[string]interface{}{
			"claimed_by_id": selectedReviewerID,
			"assigned_at":   now,
			"status":        models.StatusClaimed,
		}).Error

	if err != nil {
		return nil, err
	}

	// Get submission details for logging
	var submission models.Submission
	database.DB.Preload("Contributor").First(&submission, submissionID)

	// Get reviewer details
	var reviewer models.User
	database.DB.First(&reviewer, selectedReviewerID)

	// Log the activity
	userID := uuid.MustParse("00000000-0000-0000-0000-000000000000") // System user
	userName := "System"
	userRole := "SYSTEM"
	targetType := "submission"

	LogActivity(LogActivityParams{
		Action:      "AUTO_ASSIGN",
		Description: "Task \"" + submission.Title + "\" auto-assigned to " + reviewer.Name,
		UserID:      &userID,
		UserName:    &userName,
		UserRole:    &userRole,
		TargetID:    &submissionID,
		TargetType:  &targetType,
		Metadata: map[string]interface{}{
			"reviewerId":      selectedReviewerID.String(),
			"reviewerName":    reviewer.Name,
			"contributorName": submission.Contributor.Name,
		},
	})

	return &selectedReviewerID, nil
}
