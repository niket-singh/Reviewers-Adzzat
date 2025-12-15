package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"time"

	"github.com/adzzatxperts/backend/internal/database"
	"github.com/adzzatxperts/backend/internal/models"
	"github.com/adzzatxperts/backend/internal/services"
	"github.com/adzzatxperts/backend/internal/utils"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// SignupRequest represents signup request body
type SignupRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
	Name     string `json:"name" binding:"required"`
	Role     string `json:"role" binding:"required,oneof=CONTRIBUTOR REVIEWER"`
}

// SigninRequest represents signin request body
type SigninRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// Signup handles user registration
func Signup(c *gin.Context) {
	var req SignupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if user already exists
	var existingUser models.User
	if err := database.DB.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "User already exists"})
		return
	}

	// Hash password
	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process password"})
		return
	}

	// Create user
	user := models.User{
		Email:        req.Email,
		PasswordHash: hashedPassword,
		Name:         req.Name,
		Role:         models.UserRole(req.Role),
	}

	if err := database.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	// Log activity
	userRole := string(user.Role)
	targetType := "user"
	services.LogActivity(services.LogActivityParams{
		Action:      "SIGNUP",
		Description: user.Name + " signed up as " + userRole,
		UserID:      &user.ID,
		UserName:    &user.Name,
		UserRole:    &userRole,
		TargetID:    &user.ID,
		TargetType:  &targetType,
	})

	// Generate JWT
	token, err := utils.GenerateJWT(user.ID.String(), user.Email, string(user.Role))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"user": gin.H{
			"id":         user.ID,
			"email":      user.Email,
			"name":       user.Name,
			"role":       user.Role,
			"isApproved": user.IsApproved,
		},
		"token": token,
	})
}

// Signin handles user login
func Signin(c *gin.Context) {
	var req SigninRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Find user
	var user models.User
	if err := database.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Check password
	if !utils.CheckPassword(req.Password, user.PasswordHash) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Generate short-lived access token (15 minutes)
	accessToken, err := utils.GenerateShortLivedJWT(user.ID.String(), user.Email, string(user.Role))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate access token"})
		return
	}

	// Generate refresh token (30 days)
	refreshTokenString, err := utils.GenerateRefreshToken()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate refresh token"})
		return
	}

	// Store refresh token in database
	refreshToken := models.RefreshToken{
		UserID:    user.ID,
		Token:     refreshTokenString,
		ExpiresAt: utils.GetRefreshTokenExpiry(),
	}

	if err := database.DB.Create(&refreshToken).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to store refresh token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user": gin.H{
			"id":         user.ID,
			"email":      user.Email,
			"name":       user.Name,
			"role":       user.Role,
			"isApproved": user.IsApproved,
		},
		"accessToken":  accessToken,
		"refreshToken": refreshTokenString,
	})
}

// GetMe returns current user info
func GetMe(c *gin.Context) {
	userID, _ := c.Get("userId")
	userIDStr := userID.(string)

	uid, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var user models.User
	if err := database.DB.First(&user, uid).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user": gin.H{
			"id":         user.ID,
			"email":      user.Email,
			"name":       user.Name,
			"role":       user.Role,
			"isApproved": user.IsApproved,
		},
	})
}

// Logout handles user logout (client-side token removal)
func Logout(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
}

// ForgotPasswordRequest represents forgot password request body
type ForgotPasswordRequest struct {
	Email string `json:"email" binding:"required,email"`
}

// ResetPasswordRequest represents reset password request body
type ResetPasswordRequest struct {
	Token       string `json:"token" binding:"required"`
	NewPassword string `json:"newPassword" binding:"required,min=8"`
}

// ForgotPassword handles password reset request
func ForgotPassword(c *gin.Context) {
	var req ForgotPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Find user by email
	var user models.User
	if err := database.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		// Don't reveal if email exists for security (return success anyway)
		c.JSON(http.StatusOK, gin.H{"message": "If an account exists, a password reset link has been sent"})
		return
	}

	// Generate secure random token
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate reset token"})
		return
	}
	token := hex.EncodeToString(tokenBytes)

	// Delete any existing unused tokens for this user
	database.DB.Where("user_id = ? AND used = ?", user.ID, false).Delete(&models.PasswordResetToken{})

	// Create password reset token (expires in 1 hour)
	resetToken := models.PasswordResetToken{
		UserID:    user.ID,
		Token:     token,
		ExpiresAt: time.Now().Add(1 * time.Hour),
		Used:      false,
	}

	if err := database.DB.Create(&resetToken).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create reset token"})
		return
	}

	// Log activity
	userRole := string(user.Role)
	targetType := "user"
	services.LogActivity(services.LogActivityParams{
		Action:      "PASSWORD_RESET_REQUEST",
		Description: "Password reset requested for " + user.Email,
		UserID:      &user.ID,
		UserName:    &user.Name,
		UserRole:    &userRole,
		TargetID:    &user.ID,
		TargetType:  &targetType,
	})

	// Return success message
	// Note: In production, implement email service to send reset link
	// For now, token must be obtained through other means (admin panel, logs, etc.)
	c.JSON(http.StatusOK, gin.H{
		"message": "Password reset token generated successfully",
		"token":   token, // TODO: Remove in production - only for development
	})
}

// ResetPassword handles password reset with token
func ResetPassword(c *gin.Context) {
	var req ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Find valid reset token
	var resetToken models.PasswordResetToken
	if err := database.DB.Where("token = ? AND used = ? AND expires_at > ?",
		req.Token, false, time.Now()).First(&resetToken).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid or expired reset token"})
		return
	}

	// Get user
	var user models.User
	if err := database.DB.First(&user, resetToken.UserID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Hash new password
	hashedPassword, err := utils.HashPassword(req.NewPassword)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process password"})
		return
	}

	// Update user password
	if err := database.DB.Model(&user).Update("password_hash", hashedPassword).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update password"})
		return
	}

	// Mark token as used
	database.DB.Model(&resetToken).Update("used", true)

	// Log activity
	userRole := string(user.Role)
	targetType := "user"
	services.LogActivity(services.LogActivityParams{
		Action:      "PASSWORD_RESET",
		Description: "Password reset completed for " + user.Email,
		UserID:      &user.ID,
		UserName:    &user.Name,
		UserRole:    &userRole,
		TargetID:    &user.ID,
		TargetType:  &targetType,
	})

	c.JSON(http.StatusOK, gin.H{"message": "Password reset successful"})
}

// RefreshTokenRequest represents refresh token request body
type RefreshTokenRequest struct {
	RefreshToken string `json:"refreshToken" binding:"required"`
}

// RefreshToken handles token refresh using a valid refresh token
func RefreshToken(c *gin.Context) {
	var req RefreshTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Find valid refresh token in database
	var refreshToken models.RefreshToken
	if err := database.DB.Where("token = ? AND revoked_at IS NULL AND expires_at > ?",
		req.RefreshToken, time.Now()).Preload("User").First(&refreshToken).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired refresh token"})
		return
	}

	user := refreshToken.User
	if user == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "User not found"})
		return
	}

	// Generate new access token (15 minutes)
	accessToken, err := utils.GenerateShortLivedJWT(user.ID.String(), user.Email, string(user.Role))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate access token"})
		return
	}

	// Optionally implement refresh token rotation for enhanced security
	// This creates a new refresh token and revokes the old one
	// Uncomment the block below to enable rotation

	/*
	// Generate new refresh token
	newRefreshTokenString, err := utils.GenerateRefreshToken()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate new refresh token"})
		return
	}

	// Revoke old refresh token
	now := time.Now()
	if err := database.DB.Model(&refreshToken).Update("revoked_at", &now).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to revoke old refresh token"})
		return
	}

	// Store new refresh token
	newRefreshToken := models.RefreshToken{
		UserID:    user.ID,
		Token:     newRefreshTokenString,
		ExpiresAt: utils.GetRefreshTokenExpiry(),
	}

	if err := database.DB.Create(&newRefreshToken).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to store new refresh token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"accessToken":  accessToken,
		"refreshToken": newRefreshTokenString, // Return new refresh token
	})
	*/

	// Without rotation (simpler, but less secure)
	c.JSON(http.StatusOK, gin.H{
		"accessToken": accessToken,
	})
}

// Logout handles user logout by revoking refresh tokens
func RevokeRefreshToken(c *gin.Context) {
	var req RefreshTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Find and revoke refresh token
	var refreshToken models.RefreshToken
	if err := database.DB.Where("token = ?", req.RefreshToken).First(&refreshToken).Error; err != nil {
		// Don't reveal if token exists - just return success
		c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
		return
	}

	// Revoke the token
	now := time.Now()
	if err := database.DB.Model(&refreshToken).Update("revoked_at", &now).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to revoke token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
}

// CleanupExpiredRefreshTokens removes expired refresh tokens from the database
// This should be called periodically (e.g., via cron job)
func CleanupExpiredRefreshTokens() error {
	// Delete tokens that expired more than 7 days ago
	result := database.DB.Where("expires_at < ?", time.Now().AddDate(0, 0, -7)).Delete(&models.RefreshToken{})
	if result.Error != nil {
		return result.Error
	}

	// Log the number of deleted tokens
	if result.RowsAffected > 0 {
		database.DB.Exec("SELECT pg_notify('refresh_tokens_cleaned', ?)", result.RowsAffected)
	}

	return nil
}
