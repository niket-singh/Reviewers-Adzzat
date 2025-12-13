# Docker Setup Guide - Fix "Docker Daemon Not Running" Error

## Problem
The error `Cannot connect to the Docker daemon at unix:///var/run/docker.sock` occurs when the backend tries to build Docker images for Project V submissions.

## Solution

Your backend needs access to the Docker daemon to build images. There are **3 ways** to fix this:

---

## Option 1: Using Docker Compose (Recommended)

Use the provided `docker-compose.yml` file which mounts the Docker socket:

```bash
# From project root
docker-compose up -d
```

This mounts `/var/run/docker.sock` from your host into the container, allowing it to use your host's Docker daemon.

**Pros:**
- Easy to set up
- Works for local development
- Low overhead

**Cons:**
- Security consideration: Container has full Docker access
- Not recommended for production without proper isolation

---

## Option 2: Docker-in-Docker (DinD)

Run the backend with Docker-in-Docker support:

```bash
docker run -d \
  --privileged \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -p 8080:8080 \
  -e DATABASE_URL="your-db-url" \
  -e JWT_SECRET="your-jwt-secret" \
  -e SUPABASE_URL="your-supabase-url" \
  -e SUPABASE_SERVICE_KEY="your-key" \
  your-backend-image
```

**Important:** The `--privileged` flag gives the container elevated permissions.

---

## Option 3: Run Backend Directly (Development)

For development, run the backend **outside Docker**:

```bash
# In backend directory
cd backend

# Make sure Docker is running on your host
docker ps

# Run the Go backend directly
go run cmd/api/main.go
```

This way, your backend can directly access the host's Docker daemon.

---

## Verification

After applying any solution, test it:

1. Submit a Project V task through the UI
2. Check the processing logs - you should see:
   ```
   ✓ Repository cloned successfully
   ✓ Test patch applied successfully
   ✓ Dockerfile downloaded successfully
   ✓ Docker image built successfully  ← This should now work!
   ```

---

## Production Deployment

For **production**, consider:

1. **Kubernetes**: Use Docker-in-Docker sidecars or Kaniko for builds
2. **Cloud Build Services**: Use GitHub Actions, AWS CodeBuild, or Google Cloud Build
3. **Separate Build Service**: Run a dedicated build server with proper isolation

---

## Security Notes

⚠️ **Warning:** Mounting the Docker socket gives the container full access to your Docker daemon. In production:
- Use proper network isolation
- Implement resource limits
- Consider using rootless Docker
- Run with minimal privileges where possible

---

## Troubleshooting

**Still getting the error?**

1. **Check Docker is running:**
   ```bash
   docker ps
   ```

2. **Check socket permissions:**
   ```bash
   ls -l /var/run/docker.sock
   ```

3. **If using Docker Desktop (Mac/Windows):**
   - Ensure Docker Desktop is running
   - Check that socket mounting is enabled in settings

4. **Linux specific:**
   ```bash
   # Add your user to docker group
   sudo usermod -aG docker $USER
   # Restart Docker
   sudo systemctl restart docker
   ```

---

## Quick Start

**Using docker-compose (easiest):**

```bash
# 1. Create .env file in backend directory with your credentials
cd backend
cp .env.example .env
# Edit .env with your actual values

# 2. Return to project root and start services
cd ..
docker-compose up -d

# 3. Check logs
docker-compose logs -f backend

# 4. Test by submitting a Project V task!
```

---

Need help? Check the logs:
```bash
docker-compose logs -f backend
```
