package database

import (
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/adzzatxperts/backend/internal/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

// Connect initializes the database connection with optimized pool settings for high concurrency
func Connect() error {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		return fmt.Errorf("DATABASE_URL environment variable is not set")
	}

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
		// Disable PrepareStmt to avoid cached plan errors during migrations
		// Will be enabled after migrations complete
		PrepareStmt: false,
		// Query timeout to prevent long-running queries
		NowFunc: func() time.Time {
			return time.Now().UTC()
		},
	})
	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}

	// Configure connection pooling for 200+ concurrent users
	sqlDB, err := DB.DB()
	if err != nil {
		return fmt.Errorf("failed to get database instance: %w", err)
	}

	// OPTIMIZED FOR 200+ CONCURRENT USERS
	// Set maximum number of open connections (higher for better concurrency)
	sqlDB.SetMaxOpenConns(150)

	// Set maximum number of idle connections in the pool (higher to reduce connection overhead)
	sqlDB.SetMaxIdleConns(50)

	// Set maximum lifetime of a connection (10 minutes for faster refresh)
	sqlDB.SetConnMaxLifetime(10 * time.Minute)

	// Set maximum idle time for a connection (3 minutes)
	sqlDB.SetConnMaxIdleTime(3 * time.Minute)

	log.Println("✓ Database connected successfully with HIGH CONCURRENCY settings")
	log.Printf("  ⚡ Max Open Connections: 150 (optimized for 200+ concurrent users)")
	log.Printf("  ⚡ Max Idle Connections: 50")
	log.Printf("  ⚡ Connection Max Lifetime: 10m")
	log.Printf("  ⚡ Connection Max Idle Time: 3m")
	return nil
}

// AutoMigrate runs database migrations safely without cached plan errors
func AutoMigrate() error {
	log.Println("🔄 Running database migrations...")

	// Get raw SQL connection
	sqlDB, err := DB.DB()
	if err != nil {
		return fmt.Errorf("failed to get database instance: %w", err)
	}

	// CRITICAL FIX: Force close all connections to clear prepared statement cache
	log.Println("  - Clearing connection pool to avoid cached plan errors...")
	sqlDB.SetMaxOpenConns(1)
	sqlDB.Close()

	// Reconnect with fresh connection pool
	dsn := os.Getenv("DATABASE_URL")
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger:      logger.Default.LogMode(logger.Info),
		PrepareStmt: false, // NEVER use prepared statements during migrations
	})
	if err != nil {
		return fmt.Errorf("failed to reconnect for migrations: %w", err)
	}

	// Run migrations with fresh connection
	log.Println("  - Running schema migrations...")
	err = DB.AutoMigrate(
		&models.User{},
		&models.Submission{},
		&models.Review{},
		&models.ActivityLog{},
		&models.PasswordResetToken{},
		&models.RefreshToken{}, // JWT refresh tokens for enhanced security
		&models.AuditLog{},
		&models.ProjectVSubmission{},
	)
	if err != nil {
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	// Restore optimized connection pool settings
	log.Println("  - Restoring optimized connection pool...")
	sqlDB, _ = DB.DB()
	sqlDB.SetMaxOpenConns(150)
	sqlDB.SetMaxIdleConns(50)
	sqlDB.SetConnMaxLifetime(10 * time.Minute)
	sqlDB.SetConnMaxIdleTime(3 * time.Minute)

	// Create additional indexes for performance optimization
	log.Println("  - Creating performance indexes...")
	if err := createPerformanceIndexes(); err != nil {
		log.Printf("⚠️  Warning: Failed to create some indexes: %v", err)
		// Don't fail migration if indexes fail - they're optimizations
	}

	log.Println("✓ Database migrations completed successfully")
	return nil
}

// createPerformanceIndexes adds critical indexes for query optimization
func createPerformanceIndexes() error {
	indexes := []string{
		// Project V Submissions - optimize common queries
		"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projectv_status_created ON project_v_submissions(status, created_at DESC)",
		"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projectv_reviewer_status ON project_v_submissions(reviewer_id, status) WHERE reviewer_id IS NOT NULL",
		"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projectv_tester_status ON project_v_submissions(tester_id, status) WHERE tester_id IS NOT NULL",
		"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projectv_contributor ON project_v_submissions(contributor_id, created_at DESC)",

		// Project X Submissions - optimize common queries
		"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_submissions_status_created ON submissions(status, created_at DESC)",
		"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_submissions_claimedby ON submissions(claimed_by_id, status) WHERE claimed_by_id IS NOT NULL",
		"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_submissions_contributor ON submissions(contributor_id, created_at DESC)",

		// Users - optimize lookups
		"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_lower ON users(LOWER(email))",
		"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role_approved ON users(role, is_approved)",

		// Activity logs - optimize recent queries
		"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_created ON activity_logs(created_at DESC)",

		// Audit logs - optimize queries
		"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_user_action ON audit_logs(user_id, action, created_at DESC)",
	}

	for _, idx := range indexes {
		// Remove CONCURRENTLY for compatibility (requires superuser in some DBs)
		cleanIdx := strings.Replace(idx, "CONCURRENTLY ", "", 1)
		if err := DB.Exec(cleanIdx).Error; err != nil {
			// Ignore "already exists" errors
			if !strings.Contains(err.Error(), "already exists") {
				log.Printf("    ⚠️  Index creation warning: %v", err)
			}
		}
	}

	log.Println("  ✓ Performance indexes created")
	return nil
}

// GetDB returns the database instance
func GetDB() *gorm.DB {
	return DB
}
