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

	// Longer expiration: 1 hour (3600 seconds)
	if expiresIn == 0 {
		expiresIn = 3600
	}

	// Create signed URL with download parameter - use transform options
	resp, err := client.CreateSignedUrl("submissions", fileKey, expiresIn)
	if err != nil {
		return "", fmt.Errorf("failed to create signed URL: %w", err)
	}

	// Return the signed URL - Supabase will handle content-disposition based on bucket settings
	return resp.SignedURL, nil
}

// GetSignedDownloadURL generates a signed URL that forces download with original filename
func GetSignedDownloadURL(fileKey string, filename string, expiresIn int) (string, error) {
	if client == nil {
		return "", fmt.Errorf("storage client not initialized")
	}

	// Longer expiration: 1 hour (3600 seconds)
	if expiresIn == 0 {
		expiresIn = 3600
	}

	// Create signed URL
	resp, err := client.CreateSignedUrl("submissions", fileKey, expiresIn)
	if err != nil {
		return "", fmt.Errorf("failed to create signed URL: %w", err)
	}

	// Add download parameter with filename to force download with correct name
	downloadURL := resp.SignedURL + "&download=" + filename

	return downloadURL, nil
}

// DownloadFile retrieves file content from Supabase storage
func DownloadFile(fileKey string) ([]byte, error) {
	if client == nil {
		return nil, fmt.Errorf("storage client not initialized")
	}

	// Download file from Supabase
	resp, err := client.DownloadFile("submissions", fileKey)
	if err != nil {
		return nil, fmt.Errorf("failed to download file: %w", err)
	}

	return resp, nil
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

// DownloadFileToPath downloads a file from Supabase and saves it to the specified path
func DownloadFileToPath(fileKey string, targetPath string) error {
	data, err := DownloadFile(fileKey)
	if err != nil {
		return err
	}

	if err := os.WriteFile(targetPath, data, 0644); err != nil {
		return fmt.Errorf("failed to write file: %w", err)
	}

	return nil
}
