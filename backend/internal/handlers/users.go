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


func GetUsers(c *gin.Context) {
	var users []models.User
	if err := database.DB.Order("created_at DESC").Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
		return
	}

	
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

	
	user.IsGreenLight = !user.IsGreenLight
	if err := database.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to toggle green light"})
		return
	}

	
	var redistributedCount int
	if user.IsGreenLight {
		count, err := services.RedistributeTasks()
		if err == nil {
			redistributedCount = count
		}
	}

	
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

	
	user.Role = models.UserRole(newRole)

	
	if user.Role == models.RoleContributor {
		user.IsApproved = true
	}

	
	if user.Role == models.RoleTester && oldRole != string(models.RoleTester) {
		user.IsApproved = false
	}

	if err := database.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to switch role"})
		return
	}

	
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

	
	if user.Role == models.RoleContributor {
		for _, submission := range user.Submissions {
			storage.DeleteFile(submission.FileURL)
			deletionSummary["filesDeleted"] = deletionSummary["filesDeleted"].(int) + 1
		}
		database.DB.Where("contributor_id = ?", uid).Delete(&models.Submission{})
		deletionSummary["submissionsDeleted"] = len(user.Submissions)
	}

	
	if user.Role == models.RoleTester {
		
		database.DB.Model(&models.Submission{}).
			Where("claimed_by_id = ?", uid).
			Updates(map[string]interface{}{
				"claimed_by_id": nil,
				"assigned_at":   nil,
				"status":        models.StatusPending,
			})
		deletionSummary["assignmentsUnassigned"] = len(user.ClaimedSubmissions)

		
		database.DB.Where("tester_id = ?", uid).Delete(&models.Review{})
		deletionSummary["reviewsDeleted"] = len(user.Reviews)
	}

	
	if err := database.DB.Delete(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete user"})
		return
	}

	
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

	
	if req.Name != "" {
		user.Name = req.Name
	}

	
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

	
	if !utils.CheckPassword(req.Password, user.PasswordHash) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid password"})
		return
	}

	
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

	
	if user.Role == models.RoleContributor {
		for _, submission := range user.Submissions {
			storage.DeleteFile(submission.FileURL)
			deletionSummary["filesDeleted"] = deletionSummary["filesDeleted"].(int) + 1
		}
		database.DB.Where("contributor_id = ?", uid).Delete(&models.Submission{})
		deletionSummary["submissionsDeleted"] = len(user.Submissions)

		
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

	
	if user.Role == models.RoleTester {
		
		database.DB.Model(&models.Submission{}).
			Where("claimed_by_id = ?", uid).
			Updates(map[string]interface{}{
				"claimed_by_id": nil,
				"assigned_at":   nil,
				"status":        models.StatusPending,
			})
		deletionSummary["assignmentsUnassigned"] = len(user.ClaimedSubmissions)

		
		database.DB.Where("tester_id = ?", uid).Delete(&models.Review{})
		deletionSummary["reviewsDeleted"] = len(user.Reviews)
	}

	
	if user.Role == models.RoleReviewer {
		
		database.DB.Model(&models.ProjectVSubmission{}).
			Where("reviewer_id = ?", uid).
			Update("reviewer_id", nil)
	}

	
	if err := database.DB.Delete(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete account"})
		return
	}

	
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
