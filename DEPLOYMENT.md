# Deployment Guide 🚀

Complete guide to deploy your Reviewers platform for production use.

## Architecture Overview

Your platform consists of:
- **Frontend**: Next.js 14 (React + TypeScript)
- **Backend**: Go/Gin API
- **Database**: PostgreSQL (via Supabase)
- **Storage**: Supabase Storage
- **Docker**: Required for Project V image building

---

## Option 1: Recommended - Separate Services (Easiest)

### Frontend Deployment: Vercel (Free Tier Available)

Vercel is built for Next.js and offers the best performance with zero configuration.

#### Steps:

1. **Push your code to GitHub** (if not already):
   ```bash
   git push origin claude/fix-project-selection-01G3CSQtDZTJAhG1pSpFWTCa
   ```

2. **Deploy to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository
   - Vercel auto-detects Next.js
   - Click "Deploy"

3. **Configure Environment Variables** in Vercel Dashboard:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-url.com
   ```

4. **Deploy**: Vercel automatically builds and deploys
   - You get: `https://your-app.vercel.app`
   - Can add custom domain later

**Cost**: Free for personal projects, $20/month for team features

---

### Backend Deployment: Multiple Options

#### Option A: Railway.app (Recommended - Easy + Docker Support)

Railway supports Docker out of the box and provides persistent volumes.

**Steps:**

1. **Create `railway.toml`** (optional, for configuration):
   ```toml
   [build]
   builder = "dockerfile"
   dockerfilePath = "backend/Dockerfile"

   [deploy]
   startCommand = "./server"
   healthcheckPath = "/health"
   healthcheckTimeout = 100
   restartPolicyType = "on-failure"
   ```

2. **Deploy**:
   - Go to [railway.app](https://railway.app)
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository
   - Set root directory to `backend`
   - Railway auto-detects Dockerfile

3. **Add Environment Variables** in Railway Dashboard:
   ```
   DATABASE_URL=postgresql://username:password@host:5432/database?sslmode=require
   JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_SERVICE_KEY=your-supabase-service-role-key
   PORT=8080
   CORS_ORIGINS=https://your-app.vercel.app
   ```

4. **Enable Docker Access**:
   - Railway provides Docker daemon in containers
   - No additional configuration needed
   - Project V image building will work automatically

5. **Get your backend URL**:
   - Railway provides: `https://your-backend.railway.app`
   - Use this in your frontend's `NEXT_PUBLIC_API_URL`

**Cost**:
- $5/month credit free (with GitHub Student Pack)
- Pay-as-you-go after: ~$5-20/month for small apps

---

#### Option B: Render.com (Free Tier Available)

**Pros**: Free tier, easy setup
**Cons**: Spins down after inactivity (slow cold starts on free tier)

**Steps:**

1. **Create `render.yaml`** in project root:
   ```yaml
   services:
     - type: web
       name: reviewers-backend
       runtime: docker
       dockerfilePath: ./backend/Dockerfile
       dockerContext: ./backend
       envVars:
         - key: PORT
           value: 8080
         - key: DATABASE_URL
           sync: false
         - key: JWT_SECRET
           sync: false
         - key: SUPABASE_URL
           sync: false
         - key: SUPABASE_SERVICE_KEY
           sync: false
         - key: CORS_ORIGINS
           sync: false
       healthCheckPath: /health
   ```

2. **Deploy**:
   - Go to [render.com](https://render.com)
   - Click "New +" → "Blueprint"
   - Connect GitHub repository
   - Render reads `render.yaml` automatically

3. **Add Environment Variables** in Render Dashboard

4. **Docker Access**:
   - **Free tier**: Docker not available (Project V won't work)
   - **Paid tier**: Docker available with Docker-in-Docker setup

**Cost**: Free tier (limited), $7/month for starter

---

#### Option C: DigitalOcean App Platform

**Steps:**

1. **Create `.do/app.yaml`**:
   ```yaml
   name: reviewers-platform
   services:
   - name: backend
     dockerfile_path: backend/Dockerfile
     source_dir: backend
     github:
       repo: your-username/Reviewers-Adzzat
       branch: main
     http_port: 8080
     health_check:
       http_path: /health
     envs:
     - key: DATABASE_URL
       scope: RUN_TIME
       type: SECRET
     - key: JWT_SECRET
       scope: RUN_TIME
       type: SECRET
     - key: SUPABASE_URL
       scope: RUN_TIME
     - key: SUPABASE_SERVICE_KEY
       scope: RUN_TIME
       type: SECRET
     - key: PORT
       value: "8080"
     - key: CORS_ORIGINS
       scope: RUN_TIME
   ```

2. **Deploy**: Connect GitHub and deploy from dashboard

**Cost**: $5/month minimum

---

#### Option D: AWS EC2 / VPS (Full Control)

For when you need complete control and Docker access.

**Steps:**

1. **Provision a server**:
   - AWS EC2 (t2.micro free tier for 1 year)
   - DigitalOcean Droplet ($6/month)
   - Linode ($5/month)
   - Hetzner (€4/month)

2. **SSH into server and install dependencies**:
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y

   # Install Docker
   sudo apt install -y docker.io docker-compose
   sudo systemctl start docker
   sudo systemctl enable docker

   # Install Git
   sudo apt install -y git

   # Clone your repository
   git clone https://github.com/your-username/Reviewers-Adzzat.git
   cd Reviewers-Adzzat
   ```

3. **Create `.env` file** with production values

4. **Deploy with Docker Compose**:
   ```bash
   # Build and start
   docker-compose up -d

   # Check logs
   docker-compose logs -f backend
   ```

5. **Set up reverse proxy** (nginx):
   ```bash
   sudo apt install -y nginx

   # Create nginx config
   sudo nano /etc/nginx/sites-available/reviewers-backend
   ```

   ```nginx
   server {
       listen 80;
       server_name api.yourdomain.com;

       location / {
           proxy_pass http://localhost:8080;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       }
   }
   ```

   ```bash
   # Enable site
   sudo ln -s /etc/nginx/sites-available/reviewers-backend /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

6. **Set up SSL with Let's Encrypt**:
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d api.yourdomain.com
   ```

7. **Set up auto-restart**:
   ```bash
   # Create systemd service
   sudo nano /etc/systemd/system/reviewers-backend.service
   ```

   ```ini
   [Unit]
   Description=Reviewers Backend API
   After=docker.service
   Requires=docker.service

   [Service]
   Type=simple
   WorkingDirectory=/home/ubuntu/Reviewers-Adzzat
   ExecStart=/usr/bin/docker-compose up
   ExecStop=/usr/bin/docker-compose down
   Restart=always
   User=ubuntu

   [Install]
   WantedBy=multi-user.target
   ```

   ```bash
   sudo systemctl enable reviewers-backend
   sudo systemctl start reviewers-backend
   ```

**Cost**: $5-10/month, full control, guaranteed Docker access

---

## Option 2: All-in-One Deployment

### Deploy Everything on One VPS

Use the EC2/VPS method above but also host the Next.js frontend:

1. **Build Next.js for standalone deployment**:
   ```bash
   cd /path/to/frontend
   npm run build
   npm start  # Runs on port 3000
   ```

2. **Set up nginx for both services**:
   ```nginx
   # Frontend
   server {
       listen 80;
       server_name yourdomain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }

   # Backend
   server {
       listen 80;
       server_name api.yourdomain.com;

       location / {
           proxy_pass http://localhost:8080;
           # ... same proxy settings as above
       }
   }
   ```

3. **Use PM2 to manage Next.js**:
   ```bash
   npm install -g pm2
   cd /path/to/frontend
   pm2 start npm --name "reviewers-frontend" -- start
   pm2 save
   pm2 startup
   ```

---

## Database & Storage: Supabase (Already Set Up)

Your Supabase project provides:
- ✅ PostgreSQL database (hosted)
- ✅ File storage (for patches and Docker builds)
- ✅ Free tier: 500MB database, 1GB storage

**No additional deployment needed** - just update `DATABASE_URL`, `SUPABASE_URL`, and `SUPABASE_SERVICE_KEY` in your backend environment variables.

**Remember**: Create the "submissions" bucket in Supabase dashboard:
1. Go to Storage → Create bucket
2. Name: `submissions`
3. Public: No (private)
4. Set up RLS policies if needed

---

## Environment Configuration Summary

### Frontend (.env.local or Vercel env vars):
```bash
NEXT_PUBLIC_API_URL=https://your-backend-url.com
```

### Backend (.env or platform env vars):
```bash
DATABASE_URL=postgresql://username:password@host:5432/database?sslmode=require
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=your-supabase-service-role-key
PORT=8080
CORS_ORIGINS=https://your-app.vercel.app,https://yourdomain.com
```

**Important**:
- Use **service_role key** (not anon key) for `SUPABASE_SERVICE_KEY`
- Add ALL frontend URLs to `CORS_ORIGINS` (comma-separated)
- Use strong random string for `JWT_SECRET` (min 32 chars)

---

## Deployment Checklist

Before going live:

- [ ] **Database**: Supabase project created with "submissions" bucket
- [ ] **Environment Variables**: All secrets updated (no placeholders)
- [ ] **CORS**: Backend `CORS_ORIGINS` includes your frontend URL
- [ ] **Frontend API URL**: `NEXT_PUBLIC_API_URL` points to backend
- [ ] **Docker**: Backend has Docker access (for Project V)
- [ ] **SSL**: HTTPS enabled on both frontend and backend
- [ ] **Domain**: Custom domain configured (optional)
- [ ] **Monitoring**: Set up logging/monitoring (optional)
- [ ] **Backup**: Database backup strategy (Supabase auto-backups on paid tier)

---

## Recommended Deployment Path

**For beginners / quickest setup**:
1. **Frontend**: Vercel (free, 2 minutes to deploy)
2. **Backend**: Railway.app (easy, Docker support, $5-10/month)
3. **Database**: Supabase (already using, free tier)

**Total cost**: $5-10/month with free frontend

**Deployment time**: 15-30 minutes

---

## Testing Your Deployment

After deployment:

1. **Check backend health**:
   ```bash
   curl https://your-backend-url.com/health
   ```

2. **Test frontend**:
   - Visit `https://your-app.vercel.app`
   - Try logging in
   - Submit a Project V task
   - Check processing logs

3. **Verify Docker builds**:
   - Submit a test patch
   - Watch processing logs
   - Should see: "✓ Docker image built successfully"

---

## Scaling Considerations

As your platform grows:

- **Database**: Supabase free tier → paid tier ($25/month for more resources)
- **Backend**: Add horizontal scaling (multiple instances behind load balancer)
- **Frontend**: Vercel handles scaling automatically
- **Docker builds**: Move to dedicated build servers or CI/CD pipeline
- **Monitoring**: Add Sentry, LogRocket, or DataDog

---

## Need Help?

Common issues:
- **CORS errors**: Check `CORS_ORIGINS` includes your frontend URL
- **Docker builds fail**: Ensure backend has Docker access
- **Database connection**: Verify `DATABASE_URL` and Supabase is accessible
- **500 errors**: Check backend logs for details

---

## Quick Start Commands

**After choosing your platform**:

```bash
# Update environment variables
vim backend/.env

# Test locally first
cd backend
go run cmd/api/main.go

# Then deploy to your chosen platform
# (Follow specific platform steps above)
```

Good luck with your deployment! 🚀
