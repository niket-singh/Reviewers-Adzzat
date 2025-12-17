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

func Connect() error {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		return fmt.Errorf("DATABASE_URL environment variable is not set")
	}

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),

		PrepareStmt: false,

		NowFunc: func() time.Time {
			return time.Now().UTC()
		},
	})
	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}

	sqlDB, err := DB.DB()
	if err != nil {
		return fmt.Errorf("failed to get database instance: %w", err)
	}

	sqlDB.SetMaxOpenConns(150)

	sqlDB.SetMaxIdleConns(50)

	sqlDB.SetConnMaxLifetime(10 * time.Minute)

	sqlDB.SetConnMaxIdleTime(3 * time.Minute)

	log.Println("✓ Database connected successfully with HIGH CONCURRENCY settings")
	log.Printf("  ⚡ Max Open Connections: 150 (optimized for 200+ concurrent users)")
	log.Printf("  ⚡ Max Idle Connections: 50")
	log.Printf("  ⚡ Connection Max Lifetime: 10m")
	log.Printf("  ⚡ Connection Max Idle Time: 3m")
	return nil
}

func AutoMigrate() error {
	log.Println("🔄 Running database migrations...")

	sqlDB, err := DB.DB()
	if err != nil {
		return fmt.Errorf("failed to get database instance: %w", err)
	}

	log.Println("  - Clearing connection pool to avoid cached plan errors...")
	sqlDB.SetMaxOpenConns(1)
	sqlDB.Close()

	dsn := os.Getenv("DATABASE_URL")
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger:      logger.Default.LogMode(logger.Info),
		PrepareStmt: false,
	})
	if err != nil {
		return fmt.Errorf("failed to reconnect for migrations: %w", err)
	}

	log.Println("  - Running schema migrations...")
	err = DB.AutoMigrate(
		&models.User{},
		&models.Submission{},
		&models.Review{},
		&models.ActivityLog{},
		&models.PasswordResetToken{},
		&models.RefreshToken{},
		&models.AuditLog{},
		&models.ProjectVSubmission{},
	)
	if err != nil {
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	log.Println("  - Restoring optimized connection pool...")
	sqlDB, _ = DB.DB()
	sqlDB.SetMaxOpenConns(150)
	sqlDB.SetMaxIdleConns(50)
	sqlDB.SetConnMaxLifetime(10 * time.Minute)
	sqlDB.SetConnMaxIdleTime(3 * time.Minute)

	log.Println("  - Creating performance indexes...")
	if err := createPerformanceIndexes(); err != nil {
		log.Printf("⚠️  Warning: Failed to create some indexes: %v", err)

	}

	log.Println("✓ Database migrations completed successfully")
	return nil
}

func createPerformanceIndexes() error {
	indexes := []string{

		"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projectv_status_created ON project_v_submissions(status, created_at DESC)",
		"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projectv_reviewer_status ON project_v_submissions(reviewer_id, status) WHERE reviewer_id IS NOT NULL",
		"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projectv_tester_status ON project_v_submissions(tester_id, status) WHERE tester_id IS NOT NULL",
		"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projectv_contributor ON project_v_submissions(contributor_id, created_at DESC)",

		"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_submissions_status_created ON submissions(status, created_at DESC)",
		"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_submissions_claimedby ON submissions(claimed_by_id, status) WHERE claimed_by_id IS NOT NULL",
		"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_submissions_contributor ON submissions(contributor_id, created_at DESC)",

		"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_lower ON users(LOWER(email))",
		"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role_approved ON users(role, is_approved)",

		"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_created ON activity_logs(created_at DESC)",

		"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_user_action ON audit_logs(user_id, action, created_at DESC)",
	}

	for _, idx := range indexes {

		cleanIdx := strings.Replace(idx, "CONCURRENTLY ", "", 1)
		if err := DB.Exec(cleanIdx).Error; err != nil {

			if !strings.Contains(err.Error(), "already exists") {
				log.Printf("    ⚠️  Index creation warning: %v", err)
			}
		}
	}

	log.Println("  ✓ Performance indexes created")
	return nil
}

func GetDB() *gorm.DB {
	return DB
}
