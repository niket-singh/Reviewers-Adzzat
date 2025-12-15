package handlers

import (
	"net/http"

	"github.com/adzzatxperts/backend/internal/database"
	"github.com/adzzatxperts/backend/internal/models"
	"github.com/adzzatxperts/backend/internal/services"
	"github.com/adzzatxperts/backend/internal/storage"
	"github.com/adzzatxperts/backend/internal/utils"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// GetUsers returns all users (admin only)
func GetUsers(c *gin.Context) {
	var users []models.User
	if err := database.DB.Order("created_at DESC").Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
		return
	}

	// Remove password hashes
	var response []gin.H
	for _, user := range users {
		response = append(response, gin.H{
			"id":           user.ID,
			"email":        user.Email,
			"name":         user.Name,
			"role":         user.Role,
			"isApproved":   user.IsApproved,
			"isGreenLight": user.IsGreenLight,
			"createdAt":    user.CreatedAt,
		})
	}

	c.JSON(http.StatusOK, gin.H{"users": response})
}

// ApproveTester approves a tester
func ApproveTester(c *gin.Context) {
	userID := c.Param("id")
	uid, err := uuid.Parse(userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var user models.User
	if err := database.DB.First(&user, uid).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	if user.Role != models.RoleTester {
		c.JSON(http.StatusBadRequest, gin.H{"error": "User is not a tester"})
		return
	}

	user.IsApproved = true
	if err := database.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to approve tester"})
		return
	}

	// Log activity
	currentUserID, _ := c.Get("userId")
	currentUserName, _ := c.Get("userEmail")
	currentUserRole, _ := c.Get("userRole")
	uid2, _ := uuid.Parse(currentUserID.(string))
	userName := currentUserName.(string)
	userRole := currentUserRole.(string)
	targetType := "user"

	services.LogActivity(services.LogActivityParams{
		Action:      "APPROVE_TESTER",
		Description: "Admin approved tester: " + user.Name,
		UserID:      &uid2,
		UserName:    &userName,
		UserRole:    &userRole,
		TargetID:    &uid,
		TargetType:  &targetType,
	})

	c.JSON(http.StatusOK, gin.H{"message": "Tester approved successfully"})
}

// ToggleGreenLight toggles the green light status for a tester
func ToggleGreenLight(c *gin.Context) {
	userID := c.Param("id")
	uid, err := uuid.Parse(userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var user models.User
	if err := database.DB.First(&user, uid).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	if user.Role != models.RoleTester && user.Role != models.RoleReviewer {
		c.JSON(http.StatusBadRequest, gin.H{"error": "User must be a tester or reviewer"})
		return
	}

	// Toggle the green light status
	user.IsGreenLight = !user.IsGreenLight
	if err := database.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to toggle green light"})
		return
	}

	// If green light was turned ON, redistribute all tasks fairly among active testers
	var redistributedCount int
	if user.IsGreenLight {
		count, err := services.RedistributeTasks()
		if err == nil {
			redistributedCount = count
		}
	}

	// Log activity
	currentUserID, _ := c.Get("userId")
	currentUserName, _ := c.Get("userEmail")
	currentUserRole, _ := c.Get("userRole")
	uid2, _ := uuid.Parse(currentUserID.(string))
	userName := currentUserName.(string)
	userRole := currentUserRole.(string)
	targetType := "user"

	status := "OFF"
	if user.IsGreenLight {
		status = "ON"
	}

	metadata := map[string]interface{}{
		"status": status,
	}
	if redistributedCount > 0 {
		metadata["tasksRedistributed"] = redistributedCount
	}

	services.LogActivity(services.LogActivityParams{
		Action:      "TOGGLE_GREEN_LIGHT",
		Description: "Admin turned " + status + " green light for tester: " + user.Name,
		UserID:      &uid2,
		UserName:    &userName,
		UserRole:    &userRole,
		TargetID:    &uid,
		TargetType:  &targetType,
		Metadata:    metadata,
	})

	c.JSON(http.StatusOK, gin.H{
		"message":            "Green light toggled successfully",
		"isGreenLight":       user.IsGreenLight,
		"tasksRedistributed": redistributedCount,
	})
}

// SwitchUserRole changes a user's role (NEW FEATURE)
func SwitchUserRole(c *gin.Context) {
	userID := c.Param("id")
	uid, err := uuid.Parse(userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var req struct {
		NewRole string `json:"newRole" binding:"required,oneof=CONTRIBUTOR REVIEWER TESTER ADMIN"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := database.DB.First(&user, uid).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	oldRole := string(user.Role)
	newRole := req.NewRole

	// Update role
	user.Role = models.UserRole(newRole)

	// Auto-approve if switching to contributor
	if user.Role == models.RoleContributor {
		user.IsApproved = true
	}

	// Reset approval if switching to tester
	if user.Role == models.RoleTester && oldRole != string(models.RoleTester) {
		user.IsApproved = false
	}

	if err := database.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to switch role"})
		return
	}

	// Log activity
	currentUserID, _ := c.Get("userId")
	currentUserName, _ := c.Get("userEmail")
	currentUserRole, _ := c.Get("userRole")
	uid2, _ := uuid.Parse(currentUserID.(string))
	userName := currentUserName.(string)
	userRole := currentUserRole.(string)
	targetType := "user"

	services.LogActivity(services.LogActivityParams{
		Action:      "SWITCH_ROLE",
		Description: "Admin switched " + user.Name + "'s role from " + oldRole + " to " + newRole,
		UserID:      &uid2,
		UserName:    &userName,
		UserRole:    &userRole,
		TargetID:    &uid,
		TargetType:  &targetType,
		Metadata: map[string]interface{}{
			"oldRole": oldRole,
			"newRole": newRole,
		},
	})

	c.JSON(http.StatusOK, gin.H{
		"message": "Role switched successfully",
		"user": gin.H{
			"id":         user.ID,
			"email":      user.Email,
			"name":       user.Name,
			"role":       user.Role,
			"isApproved": user.IsApproved,
		},
	})
}

// DeleteUser deletes a user account
func DeleteUser(c *gin.Context) {
	userID := c.Param("id")
	uid, err := uuid.Parse(userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	currentUserID, _ := c.Get("userId")
	if currentUserID.(string) == userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Cannot delete your own account"})
		return
	}

	var user models.User
	if err := database.DB.Preload("Submissions").Preload("ClaimedSubmissions").Preload("Reviews").First(&user, uid).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	if user.Role == models.RoleAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Cannot delete admin users"})
		return
	}

	deletionSummary := gin.H{
		"userName":              user.Name,
		"userEmail":             user.Email,
		"userRole":              user.Role,
		"submissionsDeleted":    0,
		"filesDeleted":          0,
		"reviewsDeleted":        0,
		"assignmentsUnassigned": 0,
	}

	// Handle contributor deletion
	if user.Role == models.RoleContributor {
		for _, submission := range user.Submissions {
			storage.DeleteFile(submission.FileURL)
			deletionSummary["filesDeleted"] = deletionSummary["filesDeleted"].(int) + 1
		}
		database.DB.Where("contributor_id = ?", uid).Delete(&models.Submission{})
		deletionSummary["submissionsDeleted"] = len(user.Submissions)
	}

	// Handle tester deletion
	if user.Role == models.RoleTester {
		// Unassign tasks
		database.DB.Model(&models.Submission{}).
			Where("claimed_by_id = ?", uid).
			Updates(map[string]interface{}{
				"claimed_by_id": nil,
				"assigned_at":   nil,
				"status":        models.StatusPending,
			})
		deletionSummary["assignmentsUnassigned"] = len(user.ClaimedSubmissions)

		// Delete reviews
		database.DB.Where("tester_id = ?", uid).Delete(&models.Review{})
		deletionSummary["reviewsDeleted"] = len(user.Reviews)
	}

	// Delete user
	if err := database.DB.Delete(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete user"})
		return
	}

	// Log activity
	currentUserName, _ := c.Get("userEmail")
	currentUserRole, _ := c.Get("userRole")
	uid2, _ := uuid.Parse(currentUserID.(string))
	userName := currentUserName.(string)
	userRole := currentUserRole.(string)
	targetType := "user"

	services.LogActivity(services.LogActivityParams{
		Action:      "DELETE_USER",
		Description: "Admin deleted " + string(user.Role) + " account: " + user.Name,
		UserID:      &uid2,
		UserName:    &userName,
		UserRole:    &userRole,
		TargetID:    &uid,
		TargetType:  &targetType,
		Metadata:    deletionSummary,
	})

	c.JSON(http.StatusOK, gin.H{
		"message":         "User deleted successfully",
		"deletionSummary": deletionSummary,
	})
}

// UpdateProfile updates user profile
func UpdateProfile(c *gin.Context) {
	userID, _ := c.Get("userId")
	uid, _ := uuid.Parse(userID.(string))

	var req struct {
		Name     string `json:"name"`
		Password string `json:"password"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := database.DB.First(&user, uid).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Update name if provided
	if req.Name != "" {
		user.Name = req.Name
	}

	// Update password if provided
	if req.Password != "" {
		if len(req.Password) < 6 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Password must be at least 6 characters"})
			return
		}

		hashedPassword, err := utils.HashPassword(req.Password)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process password"})
			return
		}
		user.PasswordHash = hashedPassword
	}

	if err := database.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Profile updated successfully",
		"user": gin.H{
			"id":         user.ID,
			"email":      user.Email,
			"name":       user.Name,
			"role":       user.Role,
			"isApproved": user.IsApproved,
		},
	})
}

// GetProfile returns user profile with stats
func GetProfile(c *gin.Context) {
	userID, _ := c.Get("userId")
	uid, _ := uuid.Parse(userID.(string))

	var user models.User
	if err := database.DB.First(&user, uid).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	stats := gin.H{}

	if user.Role == models.RoleContributor {
		var total, pending, claimed, eligible, approved int64
		database.DB.Model(&models.Submission{}).Where("contributor_id = ?", uid).Count(&total)
		database.DB.Model(&models.Submission{}).Where("contributor_id = ? AND status = ?", uid, models.StatusPending).Count(&pending)
		database.DB.Model(&models.Submission{}).Where("contributor_id = ? AND status = ?", uid, models.StatusClaimed).Count(&claimed)
		database.DB.Model(&models.Submission{}).Where("contributor_id = ? AND status = ?", uid, models.StatusEligible).Count(&eligible)
		database.DB.Model(&models.Submission{}).Where("contributor_id = ? AND status = ?", uid, models.StatusApproved).Count(&approved)

		stats = gin.H{
			"totalSubmissions":    total,
			"pending":             pending,
			"claimed":             claimed,
			"eligibleSubmissions": eligible,
			"approvedSubmissions": approved,
		}
	} else if user.Role == models.RoleTester || user.Role == models.RoleAdmin {
		var reviewsCount, claimedTasks, eligibleMarked int64
		database.DB.Model(&models.Review{}).Where("tester_id = ?", uid).Count(&reviewsCount)
		database.DB.Model(&models.Submission{}).Where("claimed_by_id = ?", uid).Count(&claimedTasks)
		database.DB.Model(&models.Submission{}).Where("claimed_by_id = ? AND status = ?", uid, models.StatusEligible).Count(&eligibleMarked)

		stats = gin.H{
			"totalReviews":   reviewsCount,
			"tasksClaimed":   claimedTasks,
			"eligibleMarked": eligibleMarked,
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"user": gin.H{
			"id":         user.ID,
			"email":      user.Email,
			"name":       user.Name,
			"role":       user.Role,
			"isApproved": user.IsApproved,
			"createdAt":  user.CreatedAt,
		},
		"stats": stats,
	})
}

// DeleteMyAccount allows users to delete their own account
func DeleteMyAccount(c *gin.Context) {
	userID, _ := c.Get("userId")
	uid, _ := uuid.Parse(userID.(string))

	var req struct {
		Password string `json:"password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Password is required"})
		return
	}

	var user models.User
	if err := database.DB.Preload("Submissions").Preload("ClaimedSubmissions").Preload("Reviews").First(&user, uid).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Verify password
	if !utils.CheckPasswordHash(req.Password, user.PasswordHash) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid password"})
		return
	}

	// Admins cannot delete their own account
	if user.Role == models.RoleAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Admins cannot delete their own account. Contact another admin."})
		return
	}

	deletionSummary := gin.H{
		"userName":              user.Name,
		"userEmail":             user.Email,
		"userRole":              user.Role,
		"submissionsDeleted":    0,
		"filesDeleted":          0,
		"reviewsDeleted":        0,
		"assignmentsUnassigned": 0,
	}

	// Handle contributor deletion
	if user.Role == models.RoleContributor {
		for _, submission := range user.Submissions {
			storage.DeleteFile(submission.FileURL)
			deletionSummary["filesDeleted"] = deletionSummary["filesDeleted"].(int) + 1
		}
		database.DB.Where("contributor_id = ?", uid).Delete(&models.Submission{})
		deletionSummary["submissionsDeleted"] = len(user.Submissions)

		// Delete ProjectV submissions
		var projectVSubmissions []models.ProjectVSubmission
		database.DB.Where("contributor_id = ?", uid).Find(&projectVSubmissions)
		for _, submission := range projectVSubmissions {
			storage.DeleteFile(submission.TestPatchURL)
			storage.DeleteFile(submission.DockerfileURL)
			storage.DeleteFile(submission.SolutionPatchURL)
			deletionSummary["filesDeleted"] = deletionSummary["filesDeleted"].(int) + 3
		}
		database.DB.Where("contributor_id = ?", uid).Delete(&models.ProjectVSubmission{})
	}

	// Handle tester deletion
	if user.Role == models.RoleTester {
		// Unassign tasks
		database.DB.Model(&models.Submission{}).
			Where("claimed_by_id = ?", uid).
			Updates(map[string]interface{}{
				"claimed_by_id": nil,
				"assigned_at":   nil,
				"status":        models.StatusPending,
			})
		deletionSummary["assignmentsUnassigned"] = len(user.ClaimedSubmissions)

		// Delete reviews
		database.DB.Where("tester_id = ?", uid).Delete(&models.Review{})
		deletionSummary["reviewsDeleted"] = len(user.Reviews)
	}

	// Handle reviewer deletion (for ProjectV)
	if user.Role == models.RoleReviewer {
		// Unassign ProjectV submissions
		database.DB.Model(&models.ProjectVSubmission{}).
			Where("reviewer_id = ?", uid).
			Update("reviewer_id", nil)
	}

	// Delete user
	if err := database.DB.Delete(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete account"})
		return
	}

	// Log activity
	targetType := "user"
	services.LogActivity(services.LogActivityParams{
		Action:      "DELETE_OWN_ACCOUNT",
		Description: string(user.Role) + " deleted their own account: " + user.Name,
		UserID:      &uid,
		UserName:    &user.Name,
		UserRole:    (*string)(&user.Role),
		TargetID:    &uid,
		TargetType:  &targetType,
		Metadata:    deletionSummary,
	})

	c.JSON(http.StatusOK, gin.H{
		"message":         "Account deleted successfully",
		"deletionSummary": deletionSummary,
	})
}
