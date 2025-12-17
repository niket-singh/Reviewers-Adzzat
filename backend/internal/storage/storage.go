package storage

import (
	"bytes"
	"fmt"
	"os"
	"time"

	storage_go "github.com/supabase-community/storage-go"
)

var client *storage_go.Client

func InitStorage() error {
	supabaseURL := os.Getenv("SUPABASE_URL")
	supabaseKey := os.Getenv("SUPABASE_SERVICE_KEY")

	if supabaseURL == "" || supabaseKey == "" {
		return fmt.Errorf("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")
	}

	client = storage_go.NewClient(supabaseURL+"/storage/v1", supabaseKey, nil)
	return nil
}

func UploadFile(fileData []byte, fileName string, contentType string) (string, error) {
	if client == nil {
		return "", fmt.Errorf("storage client not initialized")
	}

	key := fmt.Sprintf("%d-%s", time.Now().Unix(), fileName)

	_, err := client.UploadFile("submissions", key, bytes.NewReader(fileData))
	if err != nil {
		return "", fmt.Errorf("failed to upload file: %w", err)
	}

	return key, nil
}

func GetSignedURL(fileKey string, expiresIn int) (string, error) {
	if client == nil {
		return "", fmt.Errorf("storage client not initialized")
	}

	if expiresIn == 0 {
		expiresIn = 3600
	}

	resp, err := client.CreateSignedUrl("submissions", fileKey, expiresIn)
	if err != nil {
		return "", fmt.Errorf("failed to create signed URL: %w", err)
	}

	return resp.SignedURL, nil
}

func GetSignedDownloadURL(fileKey string, filename string, expiresIn int) (string, error) {
	if client == nil {
		return "", fmt.Errorf("storage client not initialized")
	}

	if expiresIn == 0 {
		expiresIn = 3600
	}

	resp, err := client.CreateSignedUrl("submissions", fileKey, expiresIn)
	if err != nil {
		return "", fmt.Errorf("failed to create signed URL: %w", err)
	}

	downloadURL := resp.SignedURL + "&download=" + filename

	return downloadURL, nil
}

func DownloadFile(fileKey string) ([]byte, error) {
	if client == nil {
		return nil, fmt.Errorf("storage client not initialized")
	}

	resp, err := client.DownloadFile("submissions", fileKey)
	if err != nil {
		return nil, fmt.Errorf("failed to download file: %w", err)
	}

	return resp, nil
}

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
