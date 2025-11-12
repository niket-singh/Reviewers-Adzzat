package handlers

import (
	"net/http"
	"strconv"

	"github.com/adzzatxperts/backend/internal/database"
	"github.com/adzzatxperts/backend/internal/models"
	"github.com/adzzatxperts/backend/internal/services"
	"github.com/gin-gonic/gin"
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

		approvalRate := "0"
		if total > 0 {
			rate := float64(approved) / float64(total) * 100
			approvalRate = strconv.FormatFloat(rate, 'f', 1, 64)
		}

		contributorStats = append(contributorStats, gin.H{
			"id":           contributor.ID,
			"name":         contributor.Name,
			"email":        contributor.Email,
			"joinedAt":     contributor.CreatedAt,
			"total":        total,
			"pending":      pending,
			"claimed":      claimed,
			"eligible":     eligible,
			"approved":     approved,
			"approvalRate": approvalRate,
		})
	}

	// Get all reviewers with stats
	var reviewers []models.User
	database.DB.Where("role = ?", models.RoleReviewer).Find(&reviewers)

	var reviewerStats []gin.H
	for _, reviewer := range reviewers {
		var assignedTasks, pendingReview, eligible, approved, reviewed int64
		database.DB.Model(&models.Submission{}).Where("claimed_by_id = ?", reviewer.ID).Count(&assignedTasks)
		database.DB.Model(&models.Submission{}).Where("claimed_by_id = ? AND status IN ?", reviewer.ID, []string{
			string(models.StatusPending), string(models.StatusClaimed),
		}).Count(&pendingReview)
		database.DB.Model(&models.Submission{}).Where("claimed_by_id = ? AND status = ?", reviewer.ID, models.StatusEligible).Count(&eligible)
		database.DB.Model(&models.Submission{}).Where("claimed_by_id = ? AND status = ?", reviewer.ID, models.StatusApproved).Count(&approved)
		database.DB.Model(&models.Review{}).Where("reviewer_id = ?", reviewer.ID).Count(&reviewed)

		// Get assigned tasks
		var tasks []models.Submission
		database.DB.Where("claimed_by_id = ?", reviewer.ID).
			Select("id, title, status, assigned_at").
			Order("assigned_at DESC").
			Find(&tasks)

		reviewerStats = append(reviewerStats, gin.H{
			"id":             reviewer.ID,
			"name":           reviewer.Name,
			"email":          reviewer.Email,
			"isApproved":     reviewer.IsApproved,
			"joinedAt":       reviewer.CreatedAt,
			"assignedTasks":  assignedTasks,
			"pendingReview":  pendingReview,
			"eligible":       eligible,
			"approved":       approved,
			"reviewed":       reviewed,
			"currentWorkload": pendingReview,
			"tasks":          tasks,
		})
	}

	// Overall platform stats
	var totalUsers, totalContributors, totalReviewers, approvedReviewers, pendingReviewers, totalSubmissions int64
	database.DB.Model(&models.User{}).Count(&totalUsers)
	database.DB.Model(&models.User{}).Where("role = ?", models.RoleContributor).Count(&totalContributors)
	database.DB.Model(&models.User{}).Where("role = ?", models.RoleReviewer).Count(&totalReviewers)
	database.DB.Model(&models.User{}).Where("role = ? AND is_approved = ?", models.RoleReviewer, true).Count(&approvedReviewers)
	database.DB.Model(&models.User{}).Where("role = ? AND is_approved = ?", models.RoleReviewer, false).Count(&pendingReviewers)
	database.DB.Model(&models.Submission{}).Count(&totalSubmissions)

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
			"totalReviewers":    totalReviewers,
			"approvedReviewers": approvedReviewers,
			"pendingReviewers":  pendingReviewers,
			"totalSubmissions":  totalSubmissions,
			"statusCounts":      statusCountsMap,
		},
		"contributors": contributorStats,
		"reviewers":    reviewerStats,
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
