package services

import (
	"time"

	"github.com/adzzatxperts/backend/internal/database"
	"github.com/adzzatxperts/backend/internal/models"
	"github.com/google/uuid"
)

func AutoAssignSubmission(submissionID uuid.UUID) (*uuid.UUID, error) {

	var testers []models.User
	err := database.DB.Where("role = ? AND is_approved = ? AND is_green_light = ?",
		models.RoleTester, true, true).Find(&testers).Error
	if err != nil {
		return nil, err
	}

	if len(testers) == 0 {

		return nil, nil
	}

	type TesterTaskCount struct {
		TesterID uuid.UUID
		Count    int64
	}

	var testerCounts []TesterTaskCount
	for _, tester := range testers {
		var count int64
		database.DB.Model(&models.Submission{}).
			Where("claimed_by_id = ? AND status IN ?", tester.ID, []string{
				string(models.StatusPending),
				string(models.StatusClaimed),
				string(models.StatusEligible),
			}).
			Count(&count)

		testerCounts = append(testerCounts, TesterTaskCount{
			TesterID: tester.ID,
			Count:    count,
		})
	}

	minCount := testerCounts[0].Count
	selectedTesterID := testerCounts[0].TesterID

	for _, rc := range testerCounts {
		if rc.Count < minCount {
			minCount = rc.Count
			selectedTesterID = rc.TesterID
		}
	}

	now := time.Now()
	err = database.DB.Model(&models.Submission{}).
		Where("id = ?", submissionID).
		Updates(map[string]interface{}{
			"claimed_by_id": selectedTesterID,
			"assigned_at":   now,
			"status":        models.StatusClaimed,
		}).Error

	if err != nil {
		return nil, err
	}

	var submission models.Submission
	database.DB.Preload("Contributor").First(&submission, submissionID)

	var tester models.User
	database.DB.First(&tester, selectedTesterID)

	userID := uuid.MustParse("00000000-0000-0000-0000-000000000000")
	userName := "System"
	userRole := "SYSTEM"
	targetType := "submission"

	LogActivity(LogActivityParams{
		Action:      "AUTO_ASSIGN",
		Description: "Task \"" + submission.Title + "\" auto-assigned to " + tester.Name,
		UserID:      &userID,
		UserName:    &userName,
		UserRole:    &userRole,
		TargetID:    &submissionID,
		TargetType:  &targetType,
		Metadata: map[string]interface{}{
			"testerId":        selectedTesterID.String(),
			"testerName":      tester.Name,
			"contributorName": submission.Contributor.Name,
		},
	})

	return &selectedTesterID, nil
}

func AssignQueuedTasks() (int, error) {

	var pendingSubmissions []models.Submission
	err := database.DB.Where("status = ?", models.StatusPending).Order("created_at ASC").Find(&pendingSubmissions).Error
	if err != nil {
		return 0, err
	}

	if len(pendingSubmissions) == 0 {
		return 0, nil
	}

	var testers []models.User
	err = database.DB.Where("role = ? AND is_approved = ? AND is_green_light = ?",
		models.RoleTester, true, true).Find(&testers).Error
	if err != nil {
		return 0, err
	}

	if len(testers) == 0 {
		return 0, nil
	}

	testerTaskCounts := make(map[uuid.UUID]int64)
	for _, tester := range testers {
		var count int64
		database.DB.Model(&models.Submission{}).
			Where("claimed_by_id = ? AND status IN ?", tester.ID, []string{
				string(models.StatusPending),
				string(models.StatusClaimed),
				string(models.StatusEligible),
			}).
			Count(&count)
		testerTaskCounts[tester.ID] = count
	}

	assignedCount := 0

	for _, submission := range pendingSubmissions {

		var selectedTesterID uuid.UUID
		minCount := int64(-1)

		for _, tester := range testers {
			count := testerTaskCounts[tester.ID]
			if minCount == -1 || count < minCount {
				minCount = count
				selectedTesterID = tester.ID
			}
		}

		now := time.Now()
		err = database.DB.Model(&models.Submission{}).
			Where("id = ?", submission.ID).
			Updates(map[string]interface{}{
				"claimed_by_id": selectedTesterID,
				"assigned_at":   now,
				"status":        models.StatusClaimed,
			}).Error

		if err != nil {
			continue
		}

		testerTaskCounts[selectedTesterID]++
		assignedCount++

		var tester models.User
		database.DB.First(&tester, selectedTesterID)

		userID := uuid.MustParse("00000000-0000-0000-0000-000000000000")
		userName := "System"
		userRole := "SYSTEM"
		targetType := "submission"

		LogActivity(LogActivityParams{
			Action:      "AUTO_ASSIGN",
			Description: "Queued task \"" + submission.Title + "\" assigned to " + tester.Name,
			UserID:      &userID,
			UserName:    &userName,
			UserRole:    &userRole,
			TargetID:    &submission.ID,
			TargetType:  &targetType,
			Metadata: map[string]interface{}{
				"testerId":   selectedTesterID.String(),
				"testerName": tester.Name,
				"wasQueued":  true,
			},
		})
	}

	return assignedCount, nil
}

func RedistributeTasks() (int, error) {

	var testers []models.User
	err := database.DB.Where("role = ? AND is_approved = ? AND is_green_light = ?",
		models.RoleTester, true, true).Find(&testers).Error
	if err != nil {
		return 0, err
	}

	if len(testers) == 0 {
		return 0, nil
	}

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
		return 0, nil
	}

	tasksPerTester := len(allTasks) / len(testers)
	remainder := len(allTasks) % len(testers)

	testerTaskAssignments := make(map[uuid.UUID]int)
	for _, tester := range testers {
		testerTaskAssignments[tester.ID] = 0
	}

	redistributedCount := 0

	testerIndex := 0
	for _, task := range allTasks {
		tester := testers[testerIndex]

		now := time.Now()
		err = database.DB.Model(&models.Submission{}).
			Where("id = ?", task.ID).
			Updates(map[string]interface{}{
				"claimed_by_id": tester.ID,
				"assigned_at":   now,
				"status":        models.StatusClaimed,
			}).Error

		if err != nil {
			continue
		}

		testerTaskAssignments[tester.ID]++
		redistributedCount++

		currentTesterQuota := tasksPerTester
		if testerIndex < remainder {
			currentTesterQuota++
		}

		if testerTaskAssignments[tester.ID] >= currentTesterQuota {
			testerIndex++
			if testerIndex >= len(testers) {
				testerIndex = 0
			}
		}
	}

	userID := uuid.MustParse("00000000-0000-0000-0000-000000000000")
	userName := "System"
	userRole := "SYSTEM"

	LogActivity(LogActivityParams{
		Action:      "REDISTRIBUTE",
		Description: "Redistributed tasks fairly among active testers",
		UserID:      &userID,
		UserName:    &userName,
		UserRole:    &userRole,
		Metadata: map[string]interface{}{
			"taskCount":   redistributedCount,
			"testerCount": len(testers),
		},
	})

	return redistributedCount, nil
}

func AutoAssignTester(submissionID uuid.UUID) (*uuid.UUID, error) {

	var testers []models.User
	err := database.DB.Where("role = ? AND is_approved = ? AND is_green_light = ?",
		models.RoleTester, true, true).Find(&testers).Error
	if err != nil {
		return nil, err
	}

	if len(testers) == 0 {

		return nil, nil
	}

	type TesterTaskCount struct {
		TesterID uuid.UUID
		Count    int64
	}

	var testerCounts []TesterTaskCount
	for _, tester := range testers {
		var count int64
		database.DB.Model(&models.ProjectVSubmission{}).
			Where("tester_id = ? AND status IN ?", tester.ID, []string{
				string(models.ProjectVStatusInTesting),
				string(models.ProjectVStatusTaskSubmittedToPlatform),
				string(models.ProjectVStatusEligible),
				string(models.ProjectVStatusRework),
				string(models.ProjectVStatusReworkDone),
			}).
			Count(&count)

		testerCounts = append(testerCounts, TesterTaskCount{
			TesterID: tester.ID,
			Count:    count,
		})
	}

	minCount := testerCounts[0].Count
	selectedTesterID := testerCounts[0].TesterID

	for _, tc := range testerCounts {
		if tc.Count < minCount {
			minCount = tc.Count
			selectedTesterID = tc.TesterID
		}
	}

	var submission models.ProjectVSubmission
	database.DB.Preload("Contributor").First(&submission, submissionID)

	var tester models.User
	database.DB.First(&tester, selectedTesterID)

	userID := uuid.MustParse("00000000-0000-0000-0000-000000000000")
	userName := "System"
	userRole := "SYSTEM"
	targetType := "projectv_submission"

	LogActivity(LogActivityParams{
		Action:      "AUTO_ASSIGN_TESTER",
		Description: "Project V task \"" + submission.Title + "\" auto-assigned to tester " + tester.Name,
		UserID:      &userID,
		UserName:    &userName,
		UserRole:    &userRole,
		TargetID:    &submissionID,
		TargetType:  &targetType,
		Metadata: map[string]interface{}{
			"testerId":        selectedTesterID.String(),
			"testerName":      tester.Name,
			"contributorName": submission.Contributor.Name,
		},
	})

	return &selectedTesterID, nil
}

func AutoAssignReviewer(submissionID uuid.UUID) (*uuid.UUID, error) {

	var reviewers []models.User
	err := database.DB.Where("role = ? AND is_approved = ? AND is_green_light = ?",
		models.RoleReviewer, true, true).Find(&reviewers).Error
	if err != nil {
		return nil, err
	}

	if len(reviewers) == 0 {

		return nil, nil
	}

	type ReviewerTaskCount struct {
		ReviewerID uuid.UUID
		Count      int64
	}

	var reviewerCounts []ReviewerTaskCount
	for _, reviewer := range reviewers {
		var count int64
		database.DB.Model(&models.ProjectVSubmission{}).
			Where("reviewer_id = ? AND status IN ?", reviewer.ID, []string{
				string(models.ProjectVStatusPendingReview),
				string(models.ProjectVStatusChangesRequested),
				string(models.ProjectVStatusChangesDone),
				string(models.ProjectVStatusFinalChecks),
			}).
			Count(&count)

		reviewerCounts = append(reviewerCounts, ReviewerTaskCount{
			ReviewerID: reviewer.ID,
			Count:      count,
		})
	}

	minCount := reviewerCounts[0].Count
	selectedReviewerID := reviewerCounts[0].ReviewerID

	for _, rc := range reviewerCounts {
		if rc.Count < minCount {
			minCount = rc.Count
			selectedReviewerID = rc.ReviewerID
		}
	}

	var submission models.ProjectVSubmission
	database.DB.Preload("Contributor").First(&submission, submissionID)

	var reviewer models.User
	database.DB.First(&reviewer, selectedReviewerID)

	userID := uuid.MustParse("00000000-0000-0000-0000-000000000000")
	userName := "System"
	userRole := "SYSTEM"
	targetType := "projectv_submission"

	LogActivity(LogActivityParams{
		Action:      "AUTO_ASSIGN_REVIEWER",
		Description: "Project V task \"" + submission.Title + "\" auto-assigned to reviewer " + reviewer.Name,
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

func ReassignPendingProjectVTasks() (int, error) {

	var pendingSubmissions []models.ProjectVSubmission
	err := database.DB.Where("status = ? AND tester_id IS NULL", models.ProjectVStatusSubmitted).
		Find(&pendingSubmissions).Error
	if err != nil {
		return 0, err
	}

	assignedCount := 0
	for _, submission := range pendingSubmissions {
		testerID, err := AutoAssignTester(submission.ID)
		if err == nil && testerID != nil {

			submission.TesterID = testerID
			submission.Status = models.ProjectVStatusInTesting
			if err := database.DB.Save(&submission).Error; err == nil {
				assignedCount++
			}
		}
	}

	return assignedCount, nil
}
