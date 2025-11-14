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
	RoleReviewer    UserRole = "REVIEWER"
	RoleContributor UserRole = "CONTRIBUTOR"
)

// TaskStatus enum
type TaskStatus string

const (
	StatusPending  TaskStatus = "PENDING"
	StatusClaimed  TaskStatus = "CLAIMED"
	StatusEligible TaskStatus = "ELIGIBLE"
	StatusApproved TaskStatus = "APPROVED"
)

// User model
type User struct {
	ID           uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Email        string    `gorm:"uniqueIndex;not null" json:"email"`
	PasswordHash string    `gorm:"not null" json:"-"`
	Name         string    `gorm:"not null" json:"name"`
	Role         UserRole  `gorm:"type:varchar(20);not null;default:'CONTRIBUTOR'" json:"role"`
	IsApproved   bool      `gorm:"default:false" json:"isApproved"`
	IsGreenLight bool      `gorm:"default:true" json:"isGreenLight"` // Green light status for reviewers (active/inactive)
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`

	// Relations
	Submissions        []Submission `gorm:"foreignKey:ContributorID" json:"submissions,omitempty"`
	ClaimedSubmissions []Submission `gorm:"foreignKey:ClaimedByID" json:"claimedSubmissions,omitempty"`
	Reviews            []Review     `gorm:"foreignKey:ReviewerID" json:"reviews,omitempty"`
}

// Submission model
type Submission struct {
	ID            uuid.UUID   `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Title         string      `gorm:"not null" json:"title"`
	Domain        string      `gorm:"not null" json:"domain"`
	Language      string      `gorm:"not null" json:"language"`
	FileURL       string      `gorm:"not null" json:"fileUrl"`
	FileName      string      `gorm:"not null" json:"fileName"`
	Status        TaskStatus  `gorm:"type:varchar(20);not null;default:'PENDING'" json:"status"`
	ClaimedByID   *uuid.UUID  `gorm:"type:uuid" json:"claimedById,omitempty"`
	AssignedAt    *time.Time  `json:"assignedAt,omitempty"`
	ContributorID uuid.UUID   `gorm:"type:uuid;not null" json:"contributorId"`
	CreatedAt     time.Time   `json:"createdAt"`
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
	SubmissionID    uuid.UUID  `gorm:"type:uuid;not null" json:"submissionId"`
	ReviewerID      uuid.UUID  `gorm:"type:uuid;not null" json:"reviewerId"`
	CreatedAt       time.Time  `json:"createdAt"`
	UpdatedAt       time.Time  `json:"updatedAt"`

	// Relations
	Submission *Submission `gorm:"foreignKey:SubmissionID" json:"submission,omitempty"`
	Reviewer   *User       `gorm:"foreignKey:ReviewerID" json:"reviewer,omitempty"`
}

// ActivityLog model
type ActivityLog struct {
	ID          uuid.UUID  `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Action      string     `gorm:"not null" json:"action"`
	Description string     `gorm:"type:text;not null" json:"description"`
	UserID      *uuid.UUID `gorm:"type:uuid" json:"userId,omitempty"`
	UserName    *string    `json:"userName,omitempty"`
	UserRole    *string    `json:"userRole,omitempty"`
	TargetID    *uuid.UUID `gorm:"type:uuid" json:"targetId,omitempty"`
	TargetType  *string    `json:"targetType,omitempty"`
	Metadata    *string    `gorm:"type:jsonb" json:"metadata,omitempty"`
	CreatedAt   time.Time  `json:"createdAt"`
}

// PasswordResetToken model for password reset flow
type PasswordResetToken struct {
	ID        uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	UserID    uuid.UUID `gorm:"type:uuid;not null" json:"userId"`
	Token     string    `gorm:"uniqueIndex;not null" json:"token"`
	ExpiresAt time.Time `gorm:"not null" json:"expiresAt"`
	Used      bool      `gorm:"default:false" json:"used"`
	CreatedAt time.Time `json:"createdAt"`

	// Relations
	User *User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// AuditLog model - enhanced version for security tracking
type AuditLog struct {
	ID         uuid.UUID  `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	UserID     uuid.UUID  `gorm:"type:uuid;not null" json:"userId"`
	UserName   string     `gorm:"not null" json:"userName"`
	Action     string     `gorm:"not null;index" json:"action"`
	EntityType string     `gorm:"not null" json:"entityType"`
	EntityID   *uuid.UUID `gorm:"type:uuid" json:"entityId,omitempty"`
	Metadata   *string    `gorm:"type:jsonb" json:"metadata,omitempty"`
	IPAddress  string     `gorm:"not null" json:"ipAddress"`
	UserAgent  string     `gorm:"type:text" json:"userAgent"`
	CreatedAt  time.Time  `gorm:"index" json:"createdAt"`

	// Relations
	User *User `gorm:"foreignKey:UserID" json:"user,omitempty"`
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
