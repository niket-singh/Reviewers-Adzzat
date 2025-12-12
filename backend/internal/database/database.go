package database

import (
	"fmt"
	"log"
	"os"
	"time"

	"github.com/adzzatxperts/backend/internal/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

// Connect initializes the database connection with optimized pool settings
func Connect() error {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		return fmt.Errorf("DATABASE_URL environment variable is not set")
	}

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
		// Preload associations to avoid N+1 queries
		PrepareStmt: true,
	})
	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}

	// Configure connection pooling for better performance
	sqlDB, err := DB.DB()
	if err != nil {
		return fmt.Errorf("failed to get database instance: %w", err)
	}

	// Set maximum number of open connections to the database
	sqlDB.SetMaxOpenConns(25)

	// Set maximum number of idle connections in the pool
	sqlDB.SetMaxIdleConns(10)

	// Set maximum lifetime of a connection (15 minutes)
	sqlDB.SetConnMaxLifetime(15 * time.Minute)

	// Set maximum idle time for a connection (5 minutes)
	sqlDB.SetConnMaxIdleTime(5 * time.Minute)

	log.Println("✓ Database connected successfully with connection pooling")
	log.Printf("  - Max Open Connections: 25")
	log.Printf("  - Max Idle Connections: 10")
	log.Printf("  - Connection Max Lifetime: 15m")
	return nil
}

// AutoMigrate runs database migrations
func AutoMigrate() error {
	log.Println("Running database migrations...")

	// Disable PrepareStmt temporarily during migrations to avoid cache issues
	sqlDB, err := DB.DB()
	if err != nil {
		return fmt.Errorf("failed to get database instance: %w", err)
	}

	// Close all existing prepared statements
	sqlDB.SetMaxOpenConns(0)
	sqlDB.SetMaxOpenConns(25)

	// Run migrations without prepared statements
	err = DB.Session(&gorm.Session{PrepareStmt: false}).AutoMigrate(
		&models.User{},
		&models.Submission{},
		&models.Review{},
		&models.ActivityLog{},
		&models.PasswordResetToken{},
		&models.AuditLog{},
		&models.ProjectVSubmission{},
	)
	if err != nil {
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	log.Println("✓ Database migrations completed")
	return nil
}

// GetDB returns the database instance
func GetDB() *gorm.DB {
	return DB
}
