# Fix Docker Daemon in Production 🔧

You're getting this error in production:
```
ERROR: Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?
```

This means your backend can't access Docker to build Project V images. The fix depends on **which platform you deployed to**.

---

## Option 1: Railway.app

Railway **supports Docker-in-Docker** natively. If you deployed to Railway and getting this error, here's the fix:

### Solution: Enable Docker Socket Access

1. **Go to your Railway project dashboard**
2. **Click on your backend service**
3. **Go to Settings → Deploy**
4. **Add this to your `railway.toml`** (create it in your repo root if it doesn't exist):

```toml
[build]
builder = "dockerfile"
dockerfilePath = "backend/Dockerfile"

[deploy]
startCommand = "./server"
healthcheckPath = "/health"
healthcheckTimeout = 100
restartPolicyType = "on-failure"

# Enable Docker access
[deploy.docker]
socketAccess = true
```

5. **Commit and push**:
```bash
git add railway.toml
git commit -m "Enable Docker socket access for Railway"
git push
```

Railway will automatically redeploy with Docker access enabled.

### Alternative: Use Railway's Build Service

Railway can build Docker images for you without needing Docker-in-Docker:

1. Update your backend code to use Railway's API instead of local Docker
2. Or: Pre-build images and push to Docker Hub, then just run them

---

## Option 2: Render.com

**Render free tier does NOT support Docker-in-Docker.**

### Solution A: Upgrade to Paid Tier ($7/month)

1. **Upgrade to Standard plan** in Render dashboard
2. **Add Docker socket mounting** in `render.yaml`:

```yaml
services:
  - type: web
    name: reviewers-backend
    runtime: docker
    dockerfilePath: ./backend/Dockerfile
    dockerContext: ./backend
    dockerCommand: ./server

    # Enable Docker access (paid tier only)
    dockerAccess: true

    envVars:
      - key: PORT
        value: 8080
      # ... other env vars
```

3. **Redeploy** from dashboard

### Solution B: Switch to Railway/VPS (Recommended)

Render's free tier won't work for Project V. Consider:
- **Railway**: $5-10/month, Docker support
- **DigitalOcean Droplet**: $6/month, full control
- **Hetzner VPS**: €4/month, full control

---

## Option 3: Vercel

**Vercel does NOT support Docker builds at all.**

Vercel is for frontend only. Your backend must be deployed elsewhere:
- Railway (recommended)
- Render (paid tier)
- VPS/EC2

---

## Option 4: DigitalOcean App Platform

**App Platform has limited Docker support.**

### Solution: Use Privileged Mode

1. **Update `.do/app.yaml`**:

```yaml
services:
  - name: backend
    dockerfile_path: backend/Dockerfile
    source_dir: backend

    # Enable Docker access
    instance_size_slug: professional-xs  # Requires paid tier

    # Mount Docker socket
    volumes:
      - name: docker-socket
        mount_path: /var/run/docker.sock
        host_path: /var/run/docker.sock
```

2. **Redeploy** from dashboard

**Note**: This requires professional tier ($12/month minimum)

---

## Option 5: VPS (EC2, DigitalOcean Droplet, Linode, Hetzner)

**This is the EASIEST fix if you're using a VPS.**

### If Using Docker Compose:

Your `docker-compose.yml` already has socket mounting. Just make sure Docker is installed:

```bash
# SSH into your server
ssh user@your-server-ip

# Check if Docker is running
sudo systemctl status docker

# If not installed, install it
sudo apt-get update
sudo apt-get install -y docker.io docker-compose

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker

# Restart your backend
cd /path/to/Reviewers-Adzzat
docker-compose down
docker-compose up -d

# Check logs
docker-compose logs -f backend
```

### If Running Backend Directly:

```bash
# SSH into your server
ssh user@your-server-ip

# Make sure Docker is installed and running
docker --version
docker ps

# If Docker is installed, just restart your backend
# The backend will automatically connect to the Docker daemon
```

---

## Option 6: AWS Elastic Beanstalk

### Solution: Enable Privileged Mode

1. **Add `.ebextensions/docker-socket.config`**:

```yaml
option_settings:
  aws:elasticbeanstalk:environment:proxy:
    ProxyServer: none

container_commands:
  01_enable_docker:
    command: |
      sudo usermod -aG docker webapp
      sudo systemctl restart docker
```

2. **Deploy**:

```bash
eb deploy
```

---

## Option 7: Google Cloud Run

**Cloud Run does NOT support Docker-in-Docker.**

### Workaround: Use Google Cloud Build

Instead of building Docker images in your backend, use Cloud Build API:

1. **Enable Cloud Build API** in Google Cloud Console
2. **Update your backend code** to call Cloud Build API instead of local Docker
3. **Or**: Use a separate worker service for building images

---

## Option 8: Heroku

**Heroku does NOT support Docker-in-Docker.**

### Solution: Switch Platform

Heroku doesn't allow nested Docker containers. You need to:
- Switch to Railway ($5-10/month)
- Use a VPS ($5-10/month)
- Use AWS ECS with proper configuration

---

## Quick Platform Comparison for Project V

| Platform | Docker Support | Setup Difficulty | Cost | Recommended |
|----------|---------------|------------------|------|-------------|
| **Railway** | ✅ Native | Easy | $5-10/mo | ⭐ **Yes** |
| **Render (Paid)** | ✅ Yes | Easy | $7/mo | ✅ Okay |
| **Render (Free)** | ❌ No | - | Free | ❌ Won't work |
| **VPS** | ✅ Full Control | Medium | $5-10/mo | ⭐ **Yes** |
| **DigitalOcean App** | ⚠️ Paid Only | Medium | $12/mo | ⚠️ Expensive |
| **Vercel** | ❌ No | - | - | ❌ Frontend only |
| **Heroku** | ❌ No | - | - | ❌ Won't work |
| **Cloud Run** | ⚠️ Workaround | Hard | Variable | ⚠️ Complex |

---

## Recommended Fix (Universal)

If you don't know which platform you're on or the above doesn't work:

### **Deploy to Railway (Easiest)**

1. **Sign up at [railway.app](https://railway.app)**

2. **Create new project from GitHub**:
   - Connect your GitHub account
   - Select `Reviewers-Adzzat` repository
   - Set root directory to `backend`
   - Railway auto-detects Dockerfile

3. **Add environment variables**:
   ```
   DATABASE_URL=your-supabase-connection-string
   JWT_SECRET=your-secret
   SUPABASE_URL=your-supabase-url
   SUPABASE_SERVICE_KEY=your-service-key
   PORT=8080
   CORS_ORIGINS=your-frontend-url
   ```

4. **Deploy** - Railway automatically:
   - Builds your Docker image
   - Enables Docker socket access
   - Provides a public URL
   - Auto-redeploys on git push

5. **Update frontend** `NEXT_PUBLIC_API_URL` to Railway URL

**Cost**: $5-10/month with $5 free credit

**Time**: 10 minutes

**Docker builds**: ✅ Work out of the box

---

## Verification

After applying the fix, test it:

1. **Submit a Project V task** through your frontend

2. **Check processing logs** - you should see:
   ```
   ✓ Repository cloned successfully
   ✓ Test patch applied successfully
   ✓ Dockerfile downloaded successfully
   ✓ Docker image built successfully  ← This should now work!
   ✓ Base tests passed
   ...
   ```

3. **If still failing**, check backend logs for detailed error

---

## Need Help?

**Tell me which platform you deployed to**, and I can give you specific instructions for that platform.

Common platforms:
- Railway
- Render
- Vercel (+ separate backend)
- DigitalOcean
- AWS
- Heroku
- Your own VPS

Or run: `curl your-backend-url.com/health` and share any headers/info that might indicate the platform.
