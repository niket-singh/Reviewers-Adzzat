package services

import (
	"time"

	"github.com/adzzatxperts/backend/internal/database"
	"github.com/adzzatxperts/backend/internal/models"
	"github.com/google/uuid"
)

// AutoAssignSubmission automatically assigns a submission to the reviewer with the least tasks
func AutoAssignSubmission(submissionID uuid.UUID) (*uuid.UUID, error) {
	// Get all approved reviewers with green light ON (active)
	// Exclude admins - they must manually claim tasks
	var reviewers []models.User
	err := database.DB.Where("role = ? AND is_approved = ? AND is_green_light = ?",
		models.RoleReviewer, true, true).Find(&reviewers).Error
	if err != nil {
		return nil, err
	}

	if len(reviewers) == 0 {
		// No active reviewers available - task stays in PENDING status
		return nil, nil
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

// AssignQueuedTasks assigns all pending (queued) tasks to active reviewers
// This is called when a reviewer's green light is turned ON
func AssignQueuedTasks() (int, error) {
	// Get all PENDING submissions (tasks waiting in queue)
	var pendingSubmissions []models.Submission
	err := database.DB.Where("status = ?", models.StatusPending).Order("created_at ASC").Find(&pendingSubmissions).Error
	if err != nil {
		return 0, err
	}

	if len(pendingSubmissions) == 0 {
		return 0, nil // No queued tasks
	}

	// Get all active reviewers (approved + green light ON)
	// Exclude admins - they must manually claim tasks
	var reviewers []models.User
	err = database.DB.Where("role = ? AND is_approved = ? AND is_green_light = ?",
		models.RoleReviewer, true, true).Find(&reviewers).Error
	if err != nil {
		return 0, err
	}

	if len(reviewers) == 0 {
		return 0, nil // No active reviewers - tasks stay queued
	}

	// Build reviewer task count map for fair distribution
	reviewerTaskCounts := make(map[uuid.UUID]int64)
	for _, reviewer := range reviewers {
		var count int64
		database.DB.Model(&models.Submission{}).
			Where("claimed_by_id = ? AND status IN ?", reviewer.ID, []string{
				string(models.StatusPending),
				string(models.StatusClaimed),
				string(models.StatusEligible),
			}).
			Count(&count)
		reviewerTaskCounts[reviewer.ID] = count
	}

	assignedCount := 0

	// Assign each pending task to reviewer with least current workload
	for _, submission := range pendingSubmissions {
		// Find reviewer with minimum tasks
		var selectedReviewerID uuid.UUID
		minCount := int64(-1)

		for _, reviewer := range reviewers {
			count := reviewerTaskCounts[reviewer.ID]
			if minCount == -1 || count < minCount {
				minCount = count
				selectedReviewerID = reviewer.ID
			}
		}

		// Assign the task
		now := time.Now()
		err = database.DB.Model(&models.Submission{}).
			Where("id = ?", submission.ID).
			Updates(map[string]interface{}{
				"claimed_by_id": selectedReviewerID,
				"assigned_at":   now,
				"status":        models.StatusClaimed,
			}).Error

		if err != nil {
			continue // Skip this task and continue with others
		}

		// Increment task count for this reviewer
		reviewerTaskCounts[selectedReviewerID]++
		assignedCount++

		// Get reviewer details for logging
		var reviewer models.User
		database.DB.First(&reviewer, selectedReviewerID)

		// Log the activity
		userID := uuid.MustParse("00000000-0000-0000-0000-000000000000")
		userName := "System"
		userRole := "SYSTEM"
		targetType := "submission"

		LogActivity(LogActivityParams{
			Action:      "AUTO_ASSIGN",
			Description: "Queued task \"" + submission.Title + "\" assigned to " + reviewer.Name,
			UserID:      &userID,
			UserName:    &userName,
			UserRole:    &userRole,
			TargetID:    &submission.ID,
			TargetType:  &targetType,
			Metadata: map[string]interface{}{
				"reviewerId":   selectedReviewerID.String(),
				"reviewerName": reviewer.Name,
				"wasQueued":    true,
			},
		})
	}

	return assignedCount, nil
}

// RedistributeTasks redistributes all tasks fairly among all active reviewers
// This is called when a reviewer is activated to ensure fair distribution
func RedistributeTasks() (int, error) {
	// Get all active reviewers (approved + green light ON)
	// Exclude admins - they must manually claim tasks
	var reviewers []models.User
	err := database.DB.Where("role = ? AND is_approved = ? AND is_green_light = ?",
		models.RoleReviewer, true, true).Find(&reviewers).Error
	if err != nil {
		return 0, err
	}

	if len(reviewers) == 0 {
		return 0, nil // No active reviewers
	}

	// Get all tasks that need redistribution (PENDING, CLAIMED, ELIGIBLE)
	// Exclude APPROVED tasks as they're already finalized
	var allTasks []models.Submission
	err = database.DB.Where("status IN ?", []string{
		string(models.StatusPending),
		string(models.StatusClaimed),
		string(models.StatusEligible),
	}).Order("created_at ASC").Find(&allTasks).Error
	if err != nil {
		return 0, err
	}

	if len(allTasks) == 0 {
		return 0, nil // No tasks to redistribute
	}

	// Calculate how many tasks each reviewer should get
	tasksPerReviewer := len(allTasks) / len(reviewers)
	remainder := len(allTasks) % len(reviewers)

	// Initialize task counts for each reviewer
	reviewerTaskAssignments := make(map[uuid.UUID]int)
	for _, reviewer := range reviewers {
		reviewerTaskAssignments[reviewer.ID] = 0
	}

	redistributedCount := 0

	// Distribute tasks fairly
	reviewerIndex := 0
	for _, task := range allTasks {
		reviewer := reviewers[reviewerIndex]

		// Assign task to this reviewer
		now := time.Now()
		err = database.DB.Model(&models.Submission{}).
			Where("id = ?", task.ID).
			Updates(map[string]interface{}{
				"claimed_by_id": reviewer.ID,
				"assigned_at":   now,
				"status":        models.StatusClaimed,
			}).Error

		if err != nil {
			continue // Skip this task and continue
		}

		reviewerTaskAssignments[reviewer.ID]++
		redistributedCount++

		// Move to next reviewer in round-robin fashion
		// Give extra tasks to first reviewers if there's a remainder
		currentReviewerQuota := tasksPerReviewer
		if reviewerIndex < remainder {
			currentReviewerQuota++
		}

		if reviewerTaskAssignments[reviewer.ID] >= currentReviewerQuota {
			reviewerIndex++
			if reviewerIndex >= len(reviewers) {
				reviewerIndex = 0
			}
		}
	}

	// Log the redistribution
	userID := uuid.MustParse("00000000-0000-0000-0000-000000000000")
	userName := "System"
	userRole := "SYSTEM"

	LogActivity(LogActivityParams{
		Action:      "REDISTRIBUTE",
		Description: "Redistributed tasks fairly among active reviewers",
		UserID:      &userID,
		UserName:    &userName,
		UserRole:    &userRole,
		Metadata: map[string]interface{}{
			"taskCount":     redistributedCount,
			"reviewerCount": len(reviewers),
		},
	})

	return redistributedCount, nil
}
