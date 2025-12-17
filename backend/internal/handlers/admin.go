package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/adzzatxperts/backend/internal/database"
	"github.com/adzzatxperts/backend/internal/models"
	"github.com/adzzatxperts/backend/internal/services"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// GetLogs returns activity logs
func GetLogs(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "100")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 {
		limit = 100
	}
	if limit > 500 {
		limit = 500
	}

	logs, err := services.GetRecentLogs(limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch logs"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"logs": logs})
}

// GetStats returns comprehensive platform statistics
func GetStats(c *gin.Context) {
	// Get all contributors with stats
	var contributors []models.User
	database.DB.Where("role = ?", models.RoleContributor).Find(&contributors)

	var contributorStats []gin.H
	for _, contributor := range contributors {
		var total, pending, claimed, eligible, approved int64
		database.DB.Model(&models.Submission{}).Where("contributor_id = ?", contributor.ID).Count(&total)
		database.DB.Model(&models.Submission{}).Where("contributor_id = ? AND status = ?", contributor.ID, models.StatusPending).Count(&pending)
		database.DB.Model(&models.Submission{}).Where("contributor_id = ? AND status = ?", contributor.ID, models.StatusClaimed).Count(&claimed)
		database.DB.Model(&models.Submission{}).Where("contributor_id = ? AND status = ?", contributor.ID, models.StatusEligible).Count(&eligible)
		database.DB.Model(&models.Submission{}).Where("contributor_id = ? AND status = ?", contributor.ID, models.StatusApproved).Count(&approved)

		approvalRate := 0.0
		if total > 0 {
			approvalRate = float64(approved) / float64(total) * 100
		}

		contributorStats = append(contributorStats, gin.H{
			"userId":           contributor.ID,
			"name":             contributor.Name,
			"email":            contributor.Email,
			"joinedAt":         contributor.CreatedAt,
			"totalSubmissions": total,
			"pending":          pending,
			"claimed":          claimed,
			"eligibleCount":    eligible,
			"approvedCount":    approved,
			"approvalRate":     approvalRate,
		})
	}

	// Get all testers with stats
	var testers []models.User
	database.DB.Where("role = ?", models.RoleTester).Find(&testers)

	var testerStats []gin.H
	for _, tester := range testers {
		var assignedTasks, pendingReview, eligible, approved, reviewed int64
		database.DB.Model(&models.Submission{}).Where("claimed_by_id = ?", tester.ID).Count(&assignedTasks)
		database.DB.Model(&models.Submission{}).Where("claimed_by_id = ? AND status IN ?", tester.ID, []string{
			string(models.StatusPending), string(models.StatusClaimed),
		}).Count(&pendingReview)
		database.DB.Model(&models.Submission{}).Where("claimed_by_id = ? AND status = ?", tester.ID, models.StatusEligible).Count(&eligible)
		database.DB.Model(&models.Submission{}).Where("claimed_by_id = ? AND status = ?", tester.ID, models.StatusApproved).Count(&approved)
		database.DB.Model(&models.Review{}).Where("tester_id = ?", tester.ID).Count(&reviewed)

		// Get assigned tasks
		var tasks []models.Submission
		database.DB.Where("claimed_by_id = ?", tester.ID).
			Select("id, title, status, assigned_at").
			Order("assigned_at DESC").
			Find(&tasks)

		testerStats = append(testerStats, gin.H{
			"userId":          tester.ID,
			"name":            tester.Name,
			"email":           tester.Email,
			"isApproved":      tester.IsApproved,
			"isGreenLight":    tester.IsGreenLight,
			"joinedAt":        tester.CreatedAt,
			"tasksInStack":    assignedTasks,
			"pendingReview":   pendingReview,
			"eligible":        eligible,
			"approved":        approved,
			"reviewedCount":   reviewed,
			"currentWorkload": pendingReview,
			"tasks":           tasks,
		})
	}

	// Overall platform stats
	var totalUsers, totalContributors, totalTesters, approvedTesters, pendingTesters, activeTesters, inactiveTesters, totalSubmissions, pendingReviews, queuedTasks int64
	database.DB.Model(&models.User{}).Count(&totalUsers)
	database.DB.Model(&models.User{}).Where("role = ?", models.RoleContributor).Count(&totalContributors)
	database.DB.Model(&models.User{}).Where("role = ?", models.RoleTester).Count(&totalTesters)
	database.DB.Model(&models.User{}).Where("role = ? AND is_approved = ?", models.RoleTester, true).Count(&approvedTesters)
	database.DB.Model(&models.User{}).Where("role = ? AND is_approved = ?", models.RoleTester, false).Count(&pendingTesters)
	database.DB.Model(&models.User{}).Where("role = ? AND is_approved = ? AND is_green_light = ?", models.RoleTester, true, true).Count(&activeTesters)
	database.DB.Model(&models.User{}).Where("role = ? AND is_approved = ? AND is_green_light = ?", models.RoleTester, true, false).Count(&inactiveTesters)
	database.DB.Model(&models.Submission{}).Count(&totalSubmissions)
	database.DB.Model(&models.Submission{}).Where("status IN ?", []string{
		string(models.StatusPending), string(models.StatusClaimed),
	}).Count(&pendingReviews)
	database.DB.Model(&models.Submission{}).Where("status = ?", models.StatusPending).Count(&queuedTasks)

	// Submissions by status
	var statusCounts []struct {
		Status string
		Count  int64
	}
	database.DB.Model(&models.Submission{}).
		Select("status, COUNT(*) as count").
		Group("status").
		Scan(&statusCounts)

	statusCountsMap := make(map[string]int64)
	for _, sc := range statusCounts {
		statusCountsMap[sc.Status] = sc.Count
	}

	c.JSON(http.StatusOK, gin.H{
		"overview": gin.H{
			"totalUsers":        totalUsers,
			"totalContributors": totalContributors,
			"totalTesters":      totalTesters,
			"approvedTesters":   approvedTesters,
			"pendingTesters":    pendingTesters,
			"activeTesters":     activeTesters,
			"inactiveTesters":   inactiveTesters,
			"totalSubmissions":  totalSubmissions,
			"pendingReviews":    pendingReviews,
			"queuedTasks":       queuedTasks,
			"statusCounts":      statusCountsMap,
		},
		"contributors": contributorStats,
		"testers":      testerStats,
	})
}

// GetLeaderboard returns top contributors
func GetLeaderboard(c *gin.Context) {
	type LeaderboardEntry struct {
		UserID         string
		UserName       string
		Email          string
		TotalCount     int64
		EligibleCount  int64
		ApprovedCount  int64
	}

	var contributors []models.User
	database.DB.Where("role = ?", models.RoleContributor).Find(&contributors)

	var leaderboard []gin.H
	for _, contributor := range contributors {
		var total, eligible, approved int64
		database.DB.Model(&models.Submission{}).Where("contributor_id = ? AND status IN ?", contributor.ID, []string{
			string(models.StatusEligible), string(models.StatusApproved),
		}).Count(&total)
		database.DB.Model(&models.Submission{}).Where("contributor_id = ? AND status = ?", contributor.ID, models.StatusEligible).Count(&eligible)
		database.DB.Model(&models.Submission{}).Where("contributor_id = ? AND status = ?", contributor.ID, models.StatusApproved).Count(&approved)

		if total > 0 {
			leaderboard = append(leaderboard, gin.H{
				"userId":         contributor.ID,
				"userName":       contributor.Name,
				"email":          contributor.Email,
				"totalCount":     total,
				"eligibleCount":  eligible,
				"approvedCount":  approved,
			})
		}
	}

	// Sort by approved count (in Go, we'd use sort.Slice but for simplicity, let database do it)
	// For now, return unsorted; frontend can sort or we can add proper sorting

	c.JSON(http.StatusOK, gin.H{"leaderboard": leaderboard})
}

// GetAnalytics returns analytics data for admin dashboard
func GetAnalytics(c *gin.Context) {
	// Get overall stats
	var totalSubmissions, totalUsers, approvedSubmissions, pendingSubmissions int64
	database.DB.Model(&models.Submission{}).Count(&totalSubmissions)
	database.DB.Model(&models.User{}).Count(&totalUsers)
	database.DB.Model(&models.Submission{}).Where("status = ?", models.StatusApproved).Count(&approvedSubmissions)
	database.DB.Model(&models.Submission{}).Where("status = ?", models.StatusPending).Count(&pendingSubmissions)

	// Calculate approval rate
	approvalRate := 0.0
	if totalSubmissions > 0 {
		approvalRate = float64(approvedSubmissions) / float64(totalSubmissions) * 100
	}

	// Calculate average review time (in hours)
	// This is a simplified calculation - you'd want more sophisticated logic in production
	avgReviewTime := 24.5 // Mock for now

	// Get top contributors
	type ContributorStat struct {
		UserID   uuid.UUID
		UserName string
		Count    int64
	}
	var topContributors []gin.H
	rows, err := database.DB.Raw(`
		SELECT u.id as user_id, u.name as user_name, COUNT(s.id) as count
		FROM users u
		JOIN submissions s ON u.id = s.contributor_id
		WHERE s.status IN (?, ?)
		GROUP BY u.id, u.name
		ORDER BY count DESC
		LIMIT 5
	`, models.StatusEligible, models.StatusApproved).Rows()

	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var userID uuid.UUID
			var userName string
			var count int64
			rows.Scan(&userID, &userName, &count)
			topContributors = append(topContributors, gin.H{
				"userId":   userID,
				"userName": userName,
				"count":    count,
			})
		}
	}

	// Get domain breakdown
	var domainStats []struct {
		Domain string
		Count  int64
	}
	database.DB.Model(&models.Submission{}).
		Select("domain, COUNT(*) as count").
		Group("domain").
		Order("count DESC").
		Limit(10).
		Scan(&domainStats)

	domains := make([]gin.H, 0)
	for _, ds := range domainStats {
		domains = append(domains, gin.H{
			"domain": ds.Domain,
			"count":  ds.Count,
		})
	}

	// Get language breakdown
	var languageStats []struct {
		Language string
		Count    int64
	}
	database.DB.Model(&models.Submission{}).
		Select("language, COUNT(*) as count").
		Group("language").
		Order("count DESC").
		Limit(10).
		Scan(&languageStats)

	languages := make([]gin.H, 0)
	for _, ls := range languageStats {
		languages = append(languages, gin.H{
			"language": ls.Language,
			"count":    ls.Count,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"overview": gin.H{
			"totalSubmissions": totalSubmissions,
			"totalUsers":       totalUsers,
			"approvalRate":     approvalRate,
			"avgReviewTime":    avgReviewTime,
		},
		"topContributors": topContributors,
		"domains":         domains,
		"languages":       languages,
	})
}

// GetAnalyticsChartData returns time-series data for charts
func GetAnalyticsChartData(c *gin.Context) {
	rangeParam := c.DefaultQuery("range", "30d")

	var days int
	switch rangeParam {
	case "7d":
		days = 7
	case "30d":
		days = 30
	case "90d":
		days = 90
	default:
		days = 30
	}

	startDate := time.Now().AddDate(0, 0, -days)

	// Get daily submission counts
	type DailyCount struct {
		Date     time.Time
		Total    int64
		Approved int64
		Rejected int64
		Pending  int64
	}

	var chartData []gin.H
	for i := 0; i <= days; i++ {
		date := startDate.AddDate(0, 0, i)
		nextDate := date.AddDate(0, 0, 1)

		var total, approved, pending int64
		database.DB.Model(&models.Submission{}).
			Where("created_at >= ? AND created_at < ?", date, nextDate).
			Count(&total)
		database.DB.Model(&models.Submission{}).
			Where("created_at >= ? AND created_at < ? AND status = ?", date, nextDate, models.StatusApproved).
			Count(&approved)
		database.DB.Model(&models.Submission{}).
			Where("created_at >= ? AND created_at < ? AND status = ?", date, nextDate, models.StatusPending).
			Count(&pending)

		// Calculate rejected (simplified - in reality you'd track rejections)
		rejected := total - approved - pending

		chartData = append(chartData, gin.H{
			"date":     date.Format("Jan 02"),
			"total":    total,
			"approved": approved,
			"rejected": rejected,
			"pending":  pending,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"range": rangeParam,
		"data":  chartData,
	})
}

// GetAuditLogs returns audit logs with filtering and pagination
func GetAuditLogs(c *gin.Context) {
	// Parse query parameters
	limitStr := c.DefaultQuery("limit", "20")
	offsetStr := c.DefaultQuery("offset", "0")
	action := c.Query("action")
	userIDStr := c.Query("userId")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	offset, err := strconv.Atoi(offsetStr)
	if err != nil || offset < 0 {
		offset = 0
	}

	// Build query
	query := database.DB.Model(&models.AuditLog{})

	if action != "" && action != "all" {
		query = query.Where("action = ?", action)
	}

	if userIDStr != "" {
		userID, err := uuid.Parse(userIDStr)
		if err == nil {
			query = query.Where("user_id = ?", userID)
		}
	}

	// Get total count
	var total int64
	query.Count(&total)

	// Get logs with pagination
	var logs []models.AuditLog
	query.Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&logs)

	// Get action counts for filters
	var actionCounts []struct {
		Action string
		Count  int64
	}
	database.DB.Model(&models.AuditLog{}).
		Select("action, COUNT(*) as count").
		Group("action").
		Order("count DESC").
		Scan(&actionCounts)

	actionCountsMap := make(map[string]int64)
	for _, ac := range actionCounts {
		actionCountsMap[ac.Action] = ac.Count
	}

	c.JSON(http.StatusOK, gin.H{
		"logs":         logs,
		"total":        total,
		"limit":        limit,
		"offset":       offset,
		"actionCounts": actionCountsMap,
	})
}

// GetAllReviews returns all reviews/feedback across all submissions (Admin God Mode)
func GetAllReviews(c *gin.Context) {
	// Parse query parameters for filtering and pagination
	limitStr := c.DefaultQuery("limit", "100")
	offsetStr := c.DefaultQuery("offset", "0")
	testerIDStr := c.Query("testerId")
	submissionIDStr := c.Query("submissionId")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 {
		limit = 100
	}
	if limit > 500 {
		limit = 500
	}

	offset, err := strconv.Atoi(offsetStr)
	if err != nil || offset < 0 {
		offset = 0
	}

	// Build query with all relations preloaded
	query := database.DB.Model(&models.Review{}).
		Preload("Tester").
		Preload("Submission").
		Preload("Submission.Contributor")

	// Apply filters
	if testerIDStr != "" {
		testerID, err := uuid.Parse(testerIDStr)
		if err == nil {
			query = query.Where("tester_id = ?", testerID)
		}
	}

	if submissionIDStr != "" {
		submissionID, err := uuid.Parse(submissionIDStr)
		if err == nil {
			query = query.Where("submission_id = ?", submissionID)
		}
	}

	// Get total count
	var total int64
	query.Count(&total)

	// Get reviews with pagination
	var reviews []models.Review
	err = query.Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&reviews).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch reviews"})
		return
	}

	// Transform reviews into detailed response
	reviewsResponse := make([]gin.H, 0, len(reviews))
	for _, review := range reviews {
		reviewData := gin.H{
			"id":        review.ID,
			"feedback":  review.Feedback,
			"createdAt": review.CreatedAt,
		}

		// Add account posted in if available
		if review.AccountPostedIn != nil {
			reviewData["accountPostedIn"] = *review.AccountPostedIn
		}

		// Add tester info
		if review.Tester != nil {
			reviewData["tester"] = gin.H{
				"id":    review.Tester.ID,
				"name":  review.Tester.Name,
				"email": review.Tester.Email,
			}
		}

		// Add submission info
		if review.Submission != nil {
			submissionData := gin.H{
				"id":     review.Submission.ID,
				"title":  review.Submission.Title,
				"domain": review.Submission.Domain,
				"status": review.Submission.Status,
			}

			// Add contributor info if available
			if review.Submission.Contributor != nil {
				submissionData["contributor"] = gin.H{
					"id":    review.Submission.Contributor.ID,
					"name":  review.Submission.Contributor.Name,
					"email": review.Submission.Contributor.Email,
				}
			}

			reviewData["submission"] = submissionData
		}

		reviewsResponse = append(reviewsResponse, reviewData)
	}

	c.JSON(http.StatusOK, gin.H{
		"reviews": reviewsResponse,
		"total":   total,
		"limit":   limit,
		"offset":  offset,
	})
}

// GetAllProjectVSubmissions returns all Project V submissions with full details (Admin God Mode)
func GetAllProjectVSubmissions(c *gin.Context) {
	// Parse query parameters for filtering and pagination
	limitStr := c.DefaultQuery("limit", "100")
	offsetStr := c.DefaultQuery("offset", "0")
	statusStr := c.Query("status")
	contributorIDStr := c.Query("contributorId")
	testerIDStr := c.Query("testerId")
	reviewerIDStr := c.Query("reviewerId")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 {
		limit = 100
	}
	if limit > 500 {
		limit = 500
	}

	offset, err := strconv.Atoi(offsetStr)
	if err != nil || offset < 0 {
		offset = 0
	}

	// Build query with all relations preloaded
	query := database.DB.Model(&models.ProjectVSubmission{}).
		Preload("Contributor").
		Preload("Tester").
		Preload("Reviewer")

	// Apply filters
	if statusStr != "" {
		query = query.Where("status = ?", statusStr)
	}

	if contributorIDStr != "" {
		contributorID, err := uuid.Parse(contributorIDStr)
		if err == nil {
			query = query.Where("contributor_id = ?", contributorID)
		}
	}

	if testerIDStr != "" {
		testerID, err := uuid.Parse(testerIDStr)
		if err == nil {
			query = query.Where("tester_id = ?", testerID)
		}
	}

	if reviewerIDStr != "" {
		reviewerID, err := uuid.Parse(reviewerIDStr)
		if err == nil {
			query = query.Where("reviewer_id = ?", reviewerID)
		}
	}

	// Get total count
	var total int64
	query.Count(&total)

	// Get submissions with pagination
	var submissions []models.ProjectVSubmission
	err = query.Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&submissions).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch Project V submissions"})
		return
	}

	// Transform submissions into detailed response
	submissionsResponse := make([]gin.H, 0, len(submissions))
	for _, sub := range submissions {
		submissionData := gin.H{
			"id":                   sub.ID,
			"title":                sub.Title,
			"language":             sub.Language,
			"category":             sub.Category,
			"difficulty":           sub.Difficulty,
			"description":          sub.Description,
			"githubRepo":           sub.GithubRepo,
			"commitHash":           sub.CommitHash,
			"issueUrl":             sub.IssueURL,
			"testPatchUrl":         sub.TestPatchURL,
			"dockerfileUrl":        sub.DockerfileURL,
			"solutionPatchUrl":     sub.SolutionPatchURL,
			"status":               sub.Status,
			"createdAt":            sub.CreatedAt,
			"updatedAt":            sub.UpdatedAt,
			"testerFeedback":       sub.TesterFeedback,
			"reviewerFeedback":     sub.ReviewerFeedback,
			"hasChangesRequested":  sub.HasChangesRequested,
			"changesDone":          sub.ChangesDone,
			"processingComplete":   sub.ProcessingComplete,
			"processingLogs":       sub.ProcessingLogs,
			"cloneSuccess":         sub.CloneSuccess,
			"cloneError":           sub.CloneError,
			"testPatchSuccess":     sub.TestPatchSuccess,
			"testPatchError":       sub.TestPatchError,
			"dockerBuildSuccess":   sub.DockerBuildSuccess,
			"dockerBuildError":     sub.DockerBuildError,
			"baseTestSuccess":      sub.BaseTestSuccess,
			"baseTestError":        sub.BaseTestError,
			"newTestSuccess":       sub.NewTestSuccess,
			"newTestError":         sub.NewTestError,
			"solutionPatchSuccess": sub.SolutionPatchSuccess,
			"solutionPatchError":   sub.SolutionPatchError,
			"finalBaseTestSuccess": sub.FinalBaseTestSuccess,
			"finalBaseTestError":   sub.FinalBaseTestError,
			"finalNewTestSuccess":  sub.FinalNewTestSuccess,
			"finalNewTestError":    sub.FinalNewTestError,
		}

		// Add optional fields
		if sub.SubmittedAccount != nil {
			submissionData["submittedAccount"] = *sub.SubmittedAccount
		}
		if sub.TaskLink != nil {
			submissionData["taskLink"] = *sub.TaskLink
		}
		if sub.TaskLinkSubmitted != nil {
			submissionData["taskLinkSubmitted"] = *sub.TaskLinkSubmitted
		}
		if sub.RejectionReason != nil {
			submissionData["rejectionReason"] = *sub.RejectionReason
		}
		if sub.AccountPostedIn != nil {
			submissionData["accountPostedIn"] = *sub.AccountPostedIn
		}

		// Add contributor info
		if sub.Contributor != nil {
			submissionData["contributor"] = gin.H{
				"id":    sub.Contributor.ID,
				"name":  sub.Contributor.Name,
				"email": sub.Contributor.Email,
			}
		}

		// Add tester info if assigned
		if sub.Tester != nil {
			submissionData["tester"] = gin.H{
				"id":    sub.Tester.ID,
				"name":  sub.Tester.Name,
				"email": sub.Tester.Email,
			}
		}

		// Add reviewer info if assigned
		if sub.Reviewer != nil {
			submissionData["reviewer"] = gin.H{
				"id":    sub.Reviewer.ID,
				"name":  sub.Reviewer.Name,
				"email": sub.Reviewer.Email,
			}
		}

		submissionsResponse = append(submissionsResponse, submissionData)
	}

	c.JSON(http.StatusOK, gin.H{
		"submissions": submissionsResponse,
		"total":       total,
		"limit":       limit,
		"offset":      offset,
	})
}

// ReassignPendingTasks reassigns all pending Project V tasks that don't have a tester (Admin only)
func ReassignPendingTasks(c *gin.Context) {
	assignedCount, err := services.ReassignPendingProjectVTasks()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reassign tasks"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":       "Pending tasks reassigned successfully",
		"assignedCount": assignedCount,
	})
}
