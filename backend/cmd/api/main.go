package main

import (
	"log"
	"os"

	"github.com/adzzatxperts/backend/internal/database"
	"github.com/adzzatxperts/backend/internal/handlers"
	"github.com/adzzatxperts/backend/internal/middleware"
	"github.com/adzzatxperts/backend/internal/storage"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	// Connect to database
	if err := database.Connect(); err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Run migrations
	if err := database.AutoMigrate(); err != nil {
		log.Fatal("Failed to run migrations:", err)
	}

	// Initialize storage
	if err := storage.InitStorage(); err != nil {
		log.Fatal("Failed to initialize storage:", err)
	}

	// Initialize services
	handlers.InitWebSocket()

	// Setup router
	router := setupRouter()

	// Get port from environment
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("🚀 Server starting on port %s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}

func setupRouter() *gin.Engine {
	router := gin.Default()

	// Apply global middlewares
	router.Use(middleware.CORSMiddleware())
	router.Use(middleware.CompressionMiddleware()) // Gzip compression
	router.Use(middleware.RateLimitMiddleware(100)) // 100 requests per minute per IP

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "healthy"})
	})

	// API routes
	api := router.Group("/api")
	{
		// Authentication routes (public)
		auth := api.Group("/auth")
		{
			auth.POST("/signup", handlers.Signup)
			auth.POST("/signin", handlers.Signin)
			auth.POST("/logout", handlers.Logout)
			auth.GET("/me", middleware.AuthMiddleware(), handlers.GetMe)
			auth.POST("/forgot-password", handlers.ForgotPassword)
			auth.POST("/reset-password", handlers.ResetPassword)
		}

		// WebSocket route (uses query param auth for browser compatibility)
		api.GET("/ws", middleware.WebSocketAuthMiddleware(), handlers.HandleWebSocket)

		// Protected routes
		protected := api.Group("/")
		protected.Use(middleware.AuthMiddleware())
		{

			// Profile routes
			protected.GET("/profile", handlers.GetProfile)
			protected.PUT("/profile", handlers.UpdateProfile)

			// Submission routes (Project X)
			submissions := protected.Group("/submissions")
			{
				submissions.POST("", handlers.UploadSubmission)
				submissions.GET("", handlers.GetSubmissions)
				submissions.GET("/reviewed", handlers.GetReviewedSubmissions)
				submissions.GET("/:id", handlers.GetSubmission)
				submissions.DELETE("/:id", handlers.DeleteSubmission)
				submissions.GET("/:id/download", handlers.GetDownloadURL)
				submissions.POST("/:id/feedback", handlers.SubmitFeedback)
			}

			// Project V routes
			projectv := protected.Group("/projectv")
			{
				projectv.POST("/submissions", handlers.CreateProjectVSubmission)
				projectv.GET("/submissions", handlers.GetProjectVSubmissions)
				projectv.GET("/submissions/:id", handlers.GetProjectVSubmission)
				projectv.PUT("/submissions/:id/status", handlers.UpdateProjectVStatus)
				projectv.DELETE("/submissions/:id", handlers.DeleteProjectVSubmission)
			}

			// Admin-only routes
			admin := protected.Group("/")
			admin.Use(middleware.AdminOnly())
			{
				// User management
				admin.GET("/users", handlers.GetUsers)
				admin.PUT("/users/:id/approve", handlers.ApproveTester)
				admin.PUT("/users/:id/greenlight", handlers.ToggleGreenLight)
				admin.PUT("/users/:id/role", handlers.SwitchUserRole)
				admin.DELETE("/users/:id", handlers.DeleteUser)

				// Submission approval and claiming
				admin.PUT("/submissions/:id/approve", handlers.ApproveSubmission)
				admin.PUT("/submissions/:id/claim", handlers.ClaimSubmission)

				// Stats and logs
				admin.GET("/logs", handlers.GetLogs)
				admin.GET("/stats", handlers.GetStats)
				admin.GET("/leaderboard", handlers.GetLeaderboard)

				// Analytics
				admin.GET("/admin/analytics", handlers.GetAnalytics)
				admin.GET("/admin/analytics/chart", handlers.GetAnalyticsChartData)

				// Audit logs
				admin.GET("/admin/audit-logs", handlers.GetAuditLogs)
			}
		}
	}

	log.Println("✓ Routes configured")
	return router
}
