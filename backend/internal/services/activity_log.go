package services

import (
	"encoding/json"

	"github.com/adzzatxperts/backend/internal/database"
	"github.com/adzzatxperts/backend/internal/models"
	"github.com/google/uuid"
)

type LogActivityParams struct {
	Action      string
	Description string
	UserID      *uuid.UUID
	UserName    *string
	UserRole    *string
	TargetID    *uuid.UUID
	TargetType  *string
	Metadata    map[string]interface{}
}

func LogActivity(params LogActivityParams) error {
	var metadataJSON *string
	if params.Metadata != nil {
		bytes, err := json.Marshal(params.Metadata)
		if err == nil {
			str := string(bytes)
			metadataJSON = &str
		}
	}

	log := models.ActivityLog{
		Action:      params.Action,
		Description: params.Description,
		UserID:      params.UserID,
		UserName:    params.UserName,
		UserRole:    params.UserRole,
		TargetID:    params.TargetID,
		TargetType:  params.TargetType,
		Metadata:    metadataJSON,
	}

	return database.DB.Create(&log).Error
}

func GetRecentLogs(limit int) ([]models.ActivityLog, error) {
	var logs []models.ActivityLog
	err := database.DB.
		Order("created_at DESC").
		Limit(limit).
		Find(&logs).Error
	return logs, err
}
