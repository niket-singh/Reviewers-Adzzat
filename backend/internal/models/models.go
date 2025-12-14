package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// UserRole enum
type UserRole string

const (
	RoleAdmin       UserRole = "ADMIN"
	RoleTester      UserRole = "TESTER"
	RoleContributor UserRole = "CONTRIBUTOR"
)

// TaskStatus enum (for Project X)
type TaskStatus string

const (
	StatusPending  TaskStatus = "PENDING"
	StatusClaimed  TaskStatus = "CLAIMED"
	StatusEligible TaskStatus = "ELIGIBLE"
	StatusApproved TaskStatus = "APPROVED"
)

// ProjectVStatus enum (for Project V)
type ProjectVStatus string

const (
	ProjectVStatusSubmitted            ProjectVStatus = "TASK_SUBMITTED"
	ProjectVStatusEligibleManualReview ProjectVStatus = "ELIGIBLE_FOR_MANUAL_REVIEW"
	ProjectVStatusFinalChecks          ProjectVStatus = "FINAL_CHECKS"
	ProjectVStatusApproved             ProjectVStatus = "APPROVED"
	ProjectVStatusRejected             ProjectVStatus = "REJECTED"
)

// User model
type User struct {
	ID           uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Email        string    `gorm:"uniqueIndex;not null" json:"email"`
	PasswordHash string    `gorm:"not null" json:"-"`
	Name         string    `gorm:"not null;index" json:"name"` // Index for search
	Role         UserRole  `gorm:"type:varchar(20);not null;default:'CONTRIBUTOR';index" json:"role"` // Index for filtering by role
	IsApproved   bool      `gorm:"default:false;index" json:"isApproved"` // Index for filtering approved users
	IsGreenLight bool      `gorm:"default:true;index" json:"isGreenLight"` // Index for active reviewer queries
	CreatedAt    time.Time `gorm:"index" json:"createdAt"` // Index for sorting by date
	UpdatedAt    time.Time `json:"updatedAt"`

	// Relations
	Submissions        []Submission `gorm:"foreignKey:ContributorID" json:"submissions,omitempty"`
	ClaimedSubmissions []Submission `gorm:"foreignKey:ClaimedByID" json:"claimedSubmissions,omitempty"`
	Reviews            []Review     `gorm:"foreignKey:TesterID" json:"reviews,omitempty"`
}

// Submission model
type Submission struct {
	ID            uuid.UUID   `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Title         string      `gorm:"not null;index" json:"title"` // Index for search
	Domain        string      `gorm:"not null;index" json:"domain"` // Index for filtering by domain
	Language      string      `gorm:"not null;index" json:"language"` // Index for filtering by language
	FileURL       string      `gorm:"not null" json:"fileUrl"`
	FileName      string      `gorm:"not null" json:"fileName"`
	Status        TaskStatus  `gorm:"type:varchar(20);not null;default:'PENDING';index" json:"status"` // Index for filtering by status
	ClaimedByID   *uuid.UUID  `gorm:"type:uuid;index" json:"claimedById,omitempty"` // Index for reviewer queries
	AssignedAt    *time.Time  `gorm:"index" json:"assignedAt,omitempty"` // Index for sorting
	ContributorID uuid.UUID   `gorm:"type:uuid;not null;index" json:"contributorId"` // Index for contributor queries
	CreatedAt     time.Time   `gorm:"index" json:"createdAt"` // Index for sorting by date
	UpdatedAt     time.Time   `json:"updatedAt"`

	// Relations
	Contributor *User    `gorm:"foreignKey:ContributorID" json:"contributor,omitempty"`
	ClaimedBy   *User    `gorm:"foreignKey:ClaimedByID" json:"claimedBy,omitempty"`
	Reviews     []Review `gorm:"foreignKey:SubmissionID;constraint:OnDelete:CASCADE" json:"reviews,omitempty"`
}

// Review model
type Review struct {
	ID              uuid.UUID  `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Feedback        string     `gorm:"type:text;not null" json:"feedback"`
	AccountPostedIn *string    `json:"accountPostedIn,omitempty"`
	SubmissionID    uuid.UUID  `gorm:"type:uuid;not null;index" json:"submissionId"` // Index for fetching reviews by submission
	TesterID        uuid.UUID  `gorm:"type:uuid;not null;index" json:"testerId"` // Index for tester stats
	CreatedAt       time.Time  `gorm:"index" json:"createdAt"` // Index for sorting
	UpdatedAt       time.Time  `json:"updatedAt"`

	// Relations
	Submission *Submission `gorm:"foreignKey:SubmissionID" json:"submission,omitempty"`
	Tester     *User       `gorm:"foreignKey:TesterID" json:"tester,omitempty"`
}

// ActivityLog model
type ActivityLog struct {
	ID          uuid.UUID  `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Action      string     `gorm:"not null;index" json:"action"` // Index for filtering by action
	Description string     `gorm:"type:text;not null" json:"description"`
	UserID      *uuid.UUID `gorm:"type:uuid;index" json:"userId,omitempty"` // Index for user activity
	UserName    *string    `json:"userName,omitempty"`
	UserRole    *string    `json:"userRole,omitempty"`
	TargetID    *uuid.UUID `gorm:"type:uuid" json:"targetId,omitempty"`
	TargetType  *string    `json:"targetType,omitempty"`
	Metadata    *string    `gorm:"type:jsonb" json:"metadata,omitempty"`
	CreatedAt   time.Time  `gorm:"index" json:"createdAt"` // Index for sorting by date
}

// PasswordResetToken model for password reset flow
type PasswordResetToken struct {
	ID        uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	UserID    uuid.UUID `gorm:"type:uuid;not null;index" json:"userId"` // Index for cleanup queries
	Token     string    `gorm:"uniqueIndex;not null" json:"token"` // Already has unique index
	ExpiresAt time.Time `gorm:"not null;index" json:"expiresAt"` // Index for expiry checks
	Used      bool      `gorm:"default:false;index" json:"used"` // Index for unused token queries
	CreatedAt time.Time `json:"createdAt"`

	// Relations
	User *User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// AuditLog model - enhanced version for security tracking
type AuditLog struct {
	ID         uuid.UUID  `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	UserID     uuid.UUID  `gorm:"type:uuid;not null;index" json:"userId"` // Index for user activity queries
	UserName   string     `gorm:"not null" json:"userName"`
	Action     string     `gorm:"not null;index" json:"action"` // Index for filtering by action
	EntityType string     `gorm:"not null;index" json:"entityType"` // Index for filtering by entity type
	EntityID   *uuid.UUID `gorm:"type:uuid" json:"entityId,omitempty"`
	Metadata   *string    `gorm:"type:jsonb" json:"metadata,omitempty"`
	IPAddress  string     `gorm:"not null;index" json:"ipAddress"` // Index for IP-based queries
	UserAgent  string     `gorm:"type:text" json:"userAgent"`
	CreatedAt  time.Time  `gorm:"index" json:"createdAt"` // Index for sorting by date

	// Relations
	User *User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// ProjectVSubmission model - for Project V workflow
type ProjectVSubmission struct {
	ID            uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Description   string         `gorm:"type:text;not null" json:"description"`
	GithubRepo    string         `gorm:"not null" json:"githubRepo"`
	CommitHash    string         `gorm:"not null" json:"commitHash"`
	IssueURL      string         `gorm:"not null" json:"issueUrl"`
	TestPatchURL  string         `gorm:"not null" json:"testPatchUrl"`
	SolutionPatchURL string      `gorm:"not null" json:"solutionPatchUrl"`
	Status        ProjectVStatus `gorm:"type:varchar(50);not null;default:'TASK_SUBMITTED';index" json:"status"`
	ContributorID uuid.UUID      `gorm:"type:uuid;not null;index" json:"contributorId"`
	TesterID      *uuid.UUID     `gorm:"type:uuid;index" json:"testerId,omitempty"`
	AccountPostedIn *string      `gorm:"type:text" json:"accountPostedIn,omitempty"` // Only visible to testers/admins

	// Processing results (simplified - no Docker testing)
	ValidationComplete bool   `gorm:"default:false" json:"validationComplete"`
	ValidationNotes    string `gorm:"type:text" json:"validationNotes,omitempty"`

	CreatedAt time.Time `gorm:"index" json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`

	// Relations
	Contributor *User `gorm:"foreignKey:ContributorID" json:"contributor,omitempty"`
	Tester      *User `gorm:"foreignKey:TesterID" json:"tester,omitempty"`
}

// BeforeCreate hook for User
func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}
	// Auto-approve contributors
	if u.Role == RoleContributor {
		u.IsApproved = true
	}
	return nil
}

// BeforeCreate hooks for other models
func (s *Submission) BeforeCreate(tx *gorm.DB) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return nil
}

func (r *Review) BeforeCreate(tx *gorm.DB) error {
	if r.ID == uuid.Nil {
		r.ID = uuid.New()
	}
	return nil
}

func (a *ActivityLog) BeforeCreate(tx *gorm.DB) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return nil
}

func (p *PasswordResetToken) BeforeCreate(tx *gorm.DB) error {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	return nil
}

func (a *AuditLog) BeforeCreate(tx *gorm.DB) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return nil
}

func (p *ProjectVSubmission) BeforeCreate(tx *gorm.DB) error {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	return nil
}
