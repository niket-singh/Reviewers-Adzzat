package services

import (
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/adzzatxperts/backend/internal/database"
	"github.com/adzzatxperts/backend/internal/models"
	"github.com/adzzatxperts/backend/internal/storage"
	"github.com/google/uuid"
)

func ProcessProjectVSubmission(submissionID uuid.UUID) {
	var submission models.ProjectVSubmission
	if err := database.DB.First(&submission, submissionID).Error; err != nil {
		log.Printf("Failed to find submission %s: %v", submissionID, err)
		return
	}

	logs := []string{}
	workDir := filepath.Join(os.TempDir(), "projectv", submissionID.String())

	defer func() {

		submission.ProcessingLogs = strings.Join(logs, "\n")
		database.DB.Save(&submission)

		os.RemoveAll(workDir)
	}()

	if err := os.MkdirAll(workDir, 0755); err != nil {
		logs = append(logs, fmt.Sprintf("ERROR: Failed to create work directory: %v", err))
		submission.ProcessingComplete = true
		return
	}

	logs = append(logs, "Step 1: Cloning repository...")
	if err := cloneRepo(submission.GithubRepo, submission.CommitHash, workDir, &logs); err != nil {
		submission.CloneError = err.Error()
		submission.ProcessingComplete = true
		logs = append(logs, fmt.Sprintf("ERROR: Clone failed: %v", err))
		return
	}
	submission.CloneSuccess = true
	database.DB.Save(&submission)
	logs = append(logs, "✓ Repository cloned successfully")

	logs = append(logs, "\nStep 2: Applying test patch...")
	testPatchPath := filepath.Join(workDir, "test.patch")
	if err := downloadFile(submission.TestPatchURL, testPatchPath); err != nil {
		submission.TestPatchError = fmt.Sprintf("Failed to download test patch: %v", err)
		submission.ProcessingComplete = true
		logs = append(logs, fmt.Sprintf("ERROR: %s", submission.TestPatchError))
		return
	}

	if err := applyPatch(workDir, testPatchPath, &logs); err != nil {
		submission.TestPatchError = err.Error()
		submission.ProcessingComplete = true
		logs = append(logs, fmt.Sprintf("ERROR: Test patch application failed: %v", err))
		return
	}
	submission.TestPatchSuccess = true
	database.DB.Save(&submission)
	logs = append(logs, "✓ Test patch applied successfully")

	logs = append(logs, "\nStep 3: Setting up Dockerfile...")
	dockerfilePath := filepath.Join(workDir, "Dockerfile")
	if err := downloadFile(submission.DockerfileURL, dockerfilePath); err != nil {
		submission.DockerBuildError = fmt.Sprintf("Failed to download Dockerfile: %v", err)
		submission.ProcessingComplete = true
		logs = append(logs, fmt.Sprintf("ERROR: %s", submission.DockerBuildError))
		return
	}
	logs = append(logs, "✓ Dockerfile downloaded successfully")

	logs = append(logs, "\nStep 4: Building Docker image...")
	imageName := fmt.Sprintf("projectv-%s:initial", submissionID.String())
	if err := buildDockerImage(workDir, imageName, &logs); err != nil {
		submission.DockerBuildError = err.Error()
		submission.ProcessingComplete = true
		logs = append(logs, fmt.Sprintf("ERROR: Docker build failed: %v", err))
		return
	}
	submission.DockerBuildSuccess = true
	database.DB.Save(&submission)
	logs = append(logs, "✓ Docker image built successfully")

	logs = append(logs, "\nStep 5: Running base mode tests...")
	if err := runDockerTests(imageName, "base", &logs); err != nil {
		submission.BaseTestError = err.Error()
		submission.ProcessingComplete = true
		logs = append(logs, fmt.Sprintf("ERROR: Base tests failed (they should pass): %v", err))
		return
	}
	submission.BaseTestSuccess = true
	database.DB.Save(&submission)
	logs = append(logs, "✓ Base tests passed as expected")

	logs = append(logs, "\nStep 6: Running new mode tests...")
	if err := runDockerTests(imageName, "new", &logs); err == nil {

		submission.NewTestError = "New tests passed but they should have failed"
		submission.ProcessingComplete = true
		logs = append(logs, "ERROR: New tests passed but they should have failed")
		return
	}
	submission.NewTestSuccess = true
	database.DB.Save(&submission)
	logs = append(logs, "✓ New tests failed as expected")

	logs = append(logs, "\nStep 7: Applying solution patch...")
	solutionPatchPath := filepath.Join(workDir, "solution.patch")
	if err := downloadFile(submission.SolutionPatchURL, solutionPatchPath); err != nil {
		submission.SolutionPatchError = fmt.Sprintf("Failed to download solution patch: %v", err)
		submission.ProcessingComplete = true
		logs = append(logs, fmt.Sprintf("ERROR: %s", submission.SolutionPatchError))
		return
	}

	if err := applyPatch(workDir, solutionPatchPath, &logs); err != nil {
		submission.SolutionPatchError = err.Error()
		submission.ProcessingComplete = true
		logs = append(logs, fmt.Sprintf("ERROR: Solution patch application failed: %v", err))
		return
	}
	submission.SolutionPatchSuccess = true
	database.DB.Save(&submission)
	logs = append(logs, "✓ Solution patch applied successfully")

	logs = append(logs, "\nStep 8: Rebuilding Docker image with solution...")
	imageNameFinal := fmt.Sprintf("projectv-%s:final", submissionID.String())
	if err := buildDockerImage(workDir, imageNameFinal, &logs); err != nil {
		submission.FinalBaseTestError = fmt.Sprintf("Failed to rebuild Docker: %v", err)
		submission.ProcessingComplete = true
		logs = append(logs, fmt.Sprintf("ERROR: Docker rebuild failed: %v", err))
		return
	}
	logs = append(logs, "✓ Docker image rebuilt successfully")

	logs = append(logs, "\nStep 9: Running base mode tests after solution...")
	if err := runDockerTests(imageNameFinal, "base", &logs); err != nil {
		submission.FinalBaseTestError = err.Error()
		submission.ProcessingComplete = true
		logs = append(logs, fmt.Sprintf("ERROR: Final base tests failed: %v", err))
		return
	}
	submission.FinalBaseTestSuccess = true
	database.DB.Save(&submission)
	logs = append(logs, "✓ Final base tests passed")

	logs = append(logs, "\nStep 10: Running new mode tests after solution...")
	if err := runDockerTests(imageNameFinal, "new", &logs); err != nil {
		submission.FinalNewTestError = err.Error()
		submission.ProcessingComplete = true
		logs = append(logs, fmt.Sprintf("ERROR: Final new tests failed: %v", err))
		return
	}
	submission.FinalNewTestSuccess = true
	database.DB.Save(&submission)
	logs = append(logs, "✓ Final new tests passed")

	submission.ProcessingComplete = true
	logs = append(logs, "\n✓✓✓ All validation steps completed successfully! ✓✓✓")

	exec.Command("docker", "rmi", imageName).Run()
	exec.Command("docker", "rmi", imageNameFinal).Run()
}

func cloneRepo(repoURL, commitHash, targetDir string, logs *[]string) error {
	*logs = append(*logs, fmt.Sprintf("  Cloning %s...", repoURL))

	cmd := exec.Command("git", "clone", repoURL, targetDir)
	output, err := cmd.CombinedOutput()
	if err != nil {
		*logs = append(*logs, fmt.Sprintf("  Git clone output: %s", string(output)))
		return fmt.Errorf("git clone failed: %w", err)
	}

	*logs = append(*logs, fmt.Sprintf("  Checking out commit %s...", commitHash))
	cmd = exec.Command("git", "-C", targetDir, "checkout", commitHash)
	output, err = cmd.CombinedOutput()
	if err != nil {
		*logs = append(*logs, fmt.Sprintf("  Git checkout output: %s", string(output)))
		return fmt.Errorf("git checkout failed: %w", err)
	}

	return nil
}

func downloadFile(fileKey, targetPath string) error {

	return storage.DownloadFileToPath(fileKey, targetPath)
}

func applyPatch(workDir, patchPath string, logs *[]string) error {
	*logs = append(*logs, fmt.Sprintf("  Applying patch: %s", filepath.Base(patchPath)))

	cmd := exec.Command("git", "-C", workDir, "apply", patchPath)
	output, err := cmd.CombinedOutput()
	if err != nil {
		*logs = append(*logs, fmt.Sprintf("  Patch output: %s", string(output)))
		return fmt.Errorf("patch application failed: %w", err)
	}

	return nil
}

func buildDockerImage(workDir, imageName string, logs *[]string) error {
	*logs = append(*logs, fmt.Sprintf("  Building image: %s", imageName))

	cmd := exec.Command("docker", "build", "-t", imageName, workDir)
	cmd.Dir = workDir

	output, err := cmd.CombinedOutput()
	*logs = append(*logs, fmt.Sprintf("  Build output: %s", string(output)))

	if err != nil {
		return fmt.Errorf("docker build failed: %w", err)
	}

	return nil
}

func runDockerTests(imageName, mode string, logs *[]string) error {
	*logs = append(*logs, fmt.Sprintf("  Running tests in %s mode...", mode))

	cmd := exec.Command("docker", "run", "--rm", imageName, "./test.sh", mode)
	cmd.Env = append(os.Environ(), fmt.Sprintf("TEST_MODE=%s", mode))

	done := make(chan error, 1)
	go func() {
		output, err := cmd.CombinedOutput()
		*logs = append(*logs, fmt.Sprintf("  Test output (%s): %s", mode, string(output)))
		done <- err
	}()

	select {
	case err := <-done:
		return err
	case <-time.After(5 * time.Minute):
		cmd.Process.Kill()
		return fmt.Errorf("test timeout after 5 minutes")
	}
}
