package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type UserRole string

const (
	RoleAdmin       UserRole = "ADMIN"
	RoleTester      UserRole = "TESTER"
	RoleReviewer    UserRole = "REVIEWER"
	RoleContributor UserRole = "CONTRIBUTOR"
)

type TaskStatus string

const (
	StatusPending  TaskStatus = "PENDING"
	StatusClaimed  TaskStatus = "CLAIMED"
	StatusEligible TaskStatus = "ELIGIBLE"
	StatusApproved TaskStatus = "APPROVED"
)

type ProjectVStatus string

const (
	ProjectVStatusSubmitted               ProjectVStatus = "TASK_SUBMITTED"
	ProjectVStatusInTesting               ProjectVStatus = "IN_TESTING"
	ProjectVStatusTaskSubmittedToPlatform ProjectVStatus = "TASK_SUBMITTED_TO_PLATFORM"
	ProjectVStatusPendingReview           ProjectVStatus = "PENDING_REVIEW"
	ProjectVStatusChangesRequested        ProjectVStatus = "CHANGES_REQUESTED"
	ProjectVStatusChangesDone             ProjectVStatus = "CHANGES_DONE"
	ProjectVStatusFinalChecks             ProjectVStatus = "FINAL_CHECKS"
	ProjectVStatusApproved                ProjectVStatus = "APPROVED"
	ProjectVStatusRejected                ProjectVStatus = "REJECTED"
	ProjectVStatusRework                  ProjectVStatus = "REWORK"
	ProjectVStatusReworkDone              ProjectVStatus = "REWORK_DONE"
	ProjectVStatusEligible                ProjectVStatus = "ELIGIBLE_FOR_MANUAL_REVIEW"
)

type RefreshToken struct {
	ID        uuid.UUID  `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	UserID    uuid.UUID  `gorm:"type:uuid;not null;index" json:"userId"`
	Token     string     `gorm:"type:text;uniqueIndex;not null" json:"token"`
	ExpiresAt time.Time  `gorm:"not null;index" json:"expiresAt"`
	CreatedAt time.Time  `gorm:"index" json:"createdAt"`
	RevokedAt *time.Time `gorm:"index" json:"revokedAt,omitempty"`

	User *User `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"user,omitempty"`
}

type User struct {
	ID           uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Email        string    `gorm:"uniqueIndex;not null" json:"email"`
	PasswordHash string    `gorm:"not null" json:"-"`
	Name         string    `gorm:"not null;index" json:"name"`
	Role         UserRole  `gorm:"type:varchar(20);not null;default:'CONTRIBUTOR';index" json:"role"`
	IsApproved   bool      `gorm:"default:false;index" json:"isApproved"`
	IsGreenLight bool      `gorm:"default:true;index" json:"isGreenLight"`
	CreatedAt    time.Time `gorm:"index" json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`

	Submissions        []Submission   `gorm:"foreignKey:ContributorID" json:"submissions,omitempty"`
	ClaimedSubmissions []Submission   `gorm:"foreignKey:ClaimedByID" json:"claimedSubmissions,omitempty"`
	Reviews            []Review       `gorm:"foreignKey:TesterID" json:"reviews,omitempty"`
	RefreshTokens      []RefreshToken `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"refreshTokens,omitempty"`
}

type Submission struct {
	ID            uuid.UUID  `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Title         string     `gorm:"not null;index" json:"title"`
	Domain        string     `gorm:"not null;index" json:"domain"`
	Language      string     `gorm:"not null;index" json:"language"`
	FileURL       string     `gorm:"not null" json:"fileUrl"`
	FileName      string     `gorm:"not null" json:"fileName"`
	Status        TaskStatus `gorm:"type:varchar(20);not null;default:'PENDING';index" json:"status"`
	ClaimedByID   *uuid.UUID `gorm:"type:uuid;index" json:"claimedById,omitempty"`
	AssignedAt    *time.Time `gorm:"index" json:"assignedAt,omitempty"`
	ContributorID uuid.UUID  `gorm:"type:uuid;not null;index" json:"contributorId"`
	CreatedAt     time.Time  `gorm:"index" json:"createdAt"`
	UpdatedAt     time.Time  `json:"updatedAt"`

	Contributor *User    `gorm:"foreignKey:ContributorID" json:"contributor,omitempty"`
	ClaimedBy   *User    `gorm:"foreignKey:ClaimedByID" json:"claimedBy,omitempty"`
	Reviews     []Review `gorm:"foreignKey:SubmissionID;constraint:OnDelete:CASCADE" json:"reviews,omitempty"`
}

type Review struct {
	ID              uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Feedback        string    `gorm:"type:text;not null" json:"feedback"`
	AccountPostedIn *string   `json:"accountPostedIn,omitempty"`
	SubmissionID    uuid.UUID `gorm:"type:uuid;not null;index" json:"submissionId"`
	TesterID        uuid.UUID `gorm:"type:uuid;not null;index" json:"testerId"`
	CreatedAt       time.Time `gorm:"index" json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`

	Submission *Submission `gorm:"foreignKey:SubmissionID" json:"submission,omitempty"`
	Tester     *User       `gorm:"foreignKey:TesterID" json:"tester,omitempty"`
}

type ActivityLog struct {
	ID          uuid.UUID  `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Action      string     `gorm:"not null;index" json:"action"`
	Description string     `gorm:"type:text;not null" json:"description"`
	UserID      *uuid.UUID `gorm:"type:uuid;index" json:"userId,omitempty"`
	UserName    *string    `json:"userName,omitempty"`
	UserRole    *string    `json:"userRole,omitempty"`
	TargetID    *uuid.UUID `gorm:"type:uuid" json:"targetId,omitempty"`
	TargetType  *string    `json:"targetType,omitempty"`
	Metadata    *string    `gorm:"type:jsonb" json:"metadata,omitempty"`
	CreatedAt   time.Time  `gorm:"index" json:"createdAt"`
}

type PasswordResetToken struct {
	ID        uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	UserID    uuid.UUID `gorm:"type:uuid;not null;index" json:"userId"`
	Token     string    `gorm:"uniqueIndex;not null" json:"token"`
	ExpiresAt time.Time `gorm:"not null;index" json:"expiresAt"`
	Used      bool      `gorm:"default:false;index" json:"used"`
	CreatedAt time.Time `json:"createdAt"`

	User *User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

type AuditLog struct {
	ID         uuid.UUID  `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	UserID     uuid.UUID  `gorm:"type:uuid;not null;index" json:"userId"`
	UserName   string     `gorm:"not null" json:"userName"`
	Action     string     `gorm:"not null;index" json:"action"`
	EntityType string     `gorm:"not null;index" json:"entityType"`
	EntityID   *uuid.UUID `gorm:"type:uuid" json:"entityId,omitempty"`
	Metadata   *string    `gorm:"type:jsonb" json:"metadata,omitempty"`
	IPAddress  string     `gorm:"not null;index" json:"ipAddress"`
	UserAgent  string     `gorm:"type:text" json:"userAgent"`
	CreatedAt  time.Time  `gorm:"index" json:"createdAt"`

	User *User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

type ProjectVSubmission struct {
	ID               uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Title            string    `gorm:"not null;index" json:"title"`
	Language         string    `gorm:"not null;index" json:"language"`
	Category         string    `gorm:"not null;index" json:"category"`
	Difficulty       string    `gorm:"not null;index" json:"difficulty"`
	Description      string    `gorm:"type:text;not null" json:"description"`
	GithubRepo       string    `gorm:"not null" json:"githubRepo"`
	CommitHash       string    `gorm:"not null" json:"commitHash"`
	IssueURL         string    `json:"issueUrl"`
	TestPatchURL     string    `gorm:"not null" json:"testPatchUrl"`
	DockerfileURL    string    `gorm:"not null" json:"dockerfileUrl"`
	SolutionPatchURL string    `gorm:"not null" json:"solutionPatchUrl"`

	Status        ProjectVStatus `gorm:"type:varchar(50);not null;default:'TASK_SUBMITTED';index" json:"status"`
	ContributorID uuid.UUID      `gorm:"type:uuid;not null;index" json:"contributorId"`
	TesterID      *uuid.UUID     `gorm:"type:uuid;index" json:"testerId,omitempty"`
	ReviewerID    *uuid.UUID     `gorm:"type:uuid;index" json:"reviewerId,omitempty"`

	TesterFeedback    string  `gorm:"type:text" json:"testerFeedback,omitempty"`
	SubmittedAccount  *string `gorm:"type:text" json:"submittedAccount,omitempty"`
	TaskLink          *string `gorm:"type:text" json:"taskLink,omitempty"`
	TaskLinkSubmitted *string `gorm:"type:text" json:"taskLinkSubmitted,omitempty"`

	ReviewerFeedback    string  `gorm:"type:text" json:"reviewerFeedback,omitempty"`
	HasChangesRequested bool    `gorm:"default:false" json:"hasChangesRequested"`
	ChangesDone         bool    `gorm:"default:false" json:"changesDone"`
	RejectionReason     *string `gorm:"type:text" json:"rejectionReason,omitempty"`
	AccountPostedIn     *string `gorm:"type:text" json:"accountPostedIn,omitempty"`

	ProcessingLogs       string `gorm:"type:text" json:"processingLogs,omitempty"`
	ProcessingComplete   bool   `gorm:"default:false" json:"processingComplete"`
	CloneSuccess         bool   `gorm:"default:false" json:"cloneSuccess"`
	CloneError           string `gorm:"type:text" json:"cloneError,omitempty"`
	TestPatchSuccess     bool   `gorm:"default:false" json:"testPatchSuccess"`
	TestPatchError       string `gorm:"type:text" json:"testPatchError,omitempty"`
	DockerBuildSuccess   bool   `gorm:"default:false" json:"dockerBuildSuccess"`
	DockerBuildError     string `gorm:"type:text" json:"dockerBuildError,omitempty"`
	BaseTestSuccess      bool   `gorm:"default:false" json:"baseTestSuccess"`
	BaseTestError        string `gorm:"type:text" json:"baseTestError,omitempty"`
	NewTestSuccess       bool   `gorm:"default:false" json:"newTestSuccess"`
	NewTestError         string `gorm:"type:text" json:"newTestError,omitempty"`
	SolutionPatchSuccess bool   `gorm:"default:false" json:"solutionPatchSuccess"`
	SolutionPatchError   string `gorm:"type:text" json:"solutionPatchError,omitempty"`
	FinalBaseTestSuccess bool   `gorm:"default:false" json:"finalBaseTestSuccess"`
	FinalBaseTestError   string `gorm:"type:text" json:"finalBaseTestError,omitempty"`
	FinalNewTestSuccess  bool   `gorm:"default:false" json:"finalNewTestSuccess"`
	FinalNewTestError    string `gorm:"type:text" json:"finalNewTestError,omitempty"`

	CreatedAt time.Time `gorm:"index" json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`

	Contributor *User `gorm:"foreignKey:ContributorID" json:"contributor,omitempty"`
	Tester      *User `gorm:"foreignKey:TesterID" json:"tester,omitempty"`
	Reviewer    *User `gorm:"foreignKey:ReviewerID" json:"reviewer,omitempty"`
}

func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}

	if u.Role == RoleContributor {
		u.IsApproved = true
	}
	return nil
}

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
