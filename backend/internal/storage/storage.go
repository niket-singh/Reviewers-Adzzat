package storage

import (
	"bytes"
	"fmt"
	"os"
	"time"

	storage_go "github.com/supabase-community/storage-go"
)

var client *storage_go.Client

// InitStorage initializes the Supabase storage client
func InitStorage() error {
	supabaseURL := os.Getenv("SUPABASE_URL")
	supabaseKey := os.Getenv("SUPABASE_SERVICE_KEY")

	if supabaseURL == "" || supabaseKey == "" {
		return fmt.Errorf("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")
	}

	client = storage_go.NewClient(supabaseURL+"/storage/v1", supabaseKey, nil)
	return nil
}

// UploadFile uploads a file to Supabase storage
func UploadFile(fileData []byte, fileName string, contentType string) (string, error) {
	if client == nil {
		return "", fmt.Errorf("storage client not initialized")
	}

	// Generate unique file key
	key := fmt.Sprintf("%d-%s", time.Now().Unix(), fileName)

	// Upload to Supabase
	_, err := client.UploadFile("submissions", key, bytes.NewReader(fileData))
	if err != nil {
		return "", fmt.Errorf("failed to upload file: %w", err)
	}

	return key, nil
}

// GetSignedURL generates a signed URL for downloading a file
func GetSignedURL(fileKey string, expiresIn int) (string, error) {
	if client == nil {
		return "", fmt.Errorf("storage client not initialized")
	}

	// Default expiration: 60 seconds
	if expiresIn == 0 {
		expiresIn = 60
	}

	resp, err := client.CreateSignedUrl("submissions", fileKey, expiresIn)
	if err != nil {
		return "", fmt.Errorf("failed to create signed URL: %w", err)
	}

	return resp.SignedURL, nil
}

// DeleteFile deletes a file from Supabase storage
func DeleteFile(fileKey string) error {
	if client == nil {
		return fmt.Errorf("storage client not initialized")
	}

	_, err := client.RemoveFile("submissions", []string{fileKey})
	if err != nil {
		return fmt.Errorf("failed to delete file: %w", err)
	}

	return nil
}
