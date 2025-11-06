# Complete Deployment Walkthrough

This guide walks you through setting up and deploying your AdzzatXperts platform from scratch.

## Overview

You'll complete these steps:
1. ✅ Set up Neon Database (PostgreSQL)
2. ✅ Set up Supabase Storage (file storage)
3. ✅ Configure local environment
4. ✅ Run locally to test
5. ✅ Deploy to Vercel
6. ✅ Test production deployment

**Estimated time**: 20-30 minutes

---

## Step 1: Set Up Neon Database (5 minutes)

Neon provides free PostgreSQL hosting with no credit card required.

### 1.1 Create Neon Account

1. Go to **https://neon.tech**
2. Click **"Sign Up"**
3. Sign up with **GitHub** (fastest option)
4. Verify your email if prompted

### 1.2 Create a Database Project

1. After login, click **"Create a project"**
2. Fill in:
   - **Project name**: `AdzzatXperts` (or any name you like)
   - **PostgreSQL version**: Leave default (latest)
   - **Region**: Choose closest to your location (e.g., US East, EU West)
3. Click **"Create project"**
4. Wait 10-15 seconds for setup

### 1.3 Get Database Connection String

1. On the project dashboard, you'll see **"Connection string"**
2. Make sure **"Pooled connection"** is selected
3. Copy the connection string - it looks like:
   ```
   postgresql://username:password@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
4. **Save this somewhere** - you'll need it in Step 3

**✅ Checkpoint**: You should have a connection string starting with `postgresql://`

---

## Step 2: Set Up Supabase Storage (5 minutes)

Supabase provides 1GB free file storage with no credit card required.

### 2.1 Create Supabase Account

1. Go to **https://supabase.com**
2. Click **"Start your project"** or **"Sign In"**
3. Sign up with **GitHub** (fastest and free)

### 2.2 Create a Project

1. After login, click **"New project"**
2. Select your organization (or create one)
3. Fill in:
   - **Name**: `AdzzatXperts`
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to your location
   - **Plan**: **Free** (should be selected by default)
4. Click **"Create new project"**
5. **Wait 2-3 minutes** for project setup (grab a coffee ☕)

### 2.3 Create Storage Bucket

1. Once project is ready, click **"Storage"** in the left sidebar (icon looks like a folder)
2. Click **"Create a new bucket"**
3. Fill in:
   - **Name**: `submissions` (exactly this, lowercase)
   - **Public bucket**: **OFF** (keep it private/unchecked)
4. Click **"Create bucket"**

### 2.4 Get Supabase Credentials

1. Click **"Settings"** (gear icon) in the left sidebar
2. Click **"API"** under Project Settings
3. You'll see two important values:

   **Project URL**:
   ```
   https://abcdefghijklmnop.supabase.co
   ```
   Copy this entire URL

   **API Keys** - Scroll down to find two keys:
   - `anon` `public` - **DON'T USE THIS ONE**
   - `service_role` `secret` - **USE THIS ONE** ⭐

4. Click **"Reveal"** next to `service_role` key
5. Copy the long token (starts with `eyJhbGc...`)

**✅ Checkpoint**: You should have:
- Supabase Project URL (https://xxxxx.supabase.co)
- Service Role Key (long token starting with eyJhbGc)
- A bucket named "submissions" exists

---

## Step 3: Configure Local Environment (3 minutes)

### 3.1 Create Environment File

1. Open your terminal in the project folder:
   ```bash
   cd /home/user/AdzzatXperts
   ```

2. Create `.env.local` file:
   ```bash
   touch .env.local
   ```

3. Open `.env.local` in a text editor and paste:

   ```env
   # Database (from Neon - Step 1.3)
   DATABASE_URL="postgresql://username:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"

   # JWT Secret (generate a random 32+ character string)
   JWT_SECRET="change-this-to-a-long-random-string-at-least-32-characters-long"

   # Supabase Storage (from Supabase - Step 2.4)
   SUPABASE_URL="https://abcdefghijklmnop.supabase.co"
   SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ey..."

   # App URL (local for now)
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   ```

4. **Replace the values**:
   - `DATABASE_URL`: Paste your Neon connection string from Step 1.3
   - `JWT_SECRET`: Generate a random string (use https://passwordsgenerator.net/ or just type random characters)
   - `SUPABASE_URL`: Paste your Supabase Project URL from Step 2.4
   - `SUPABASE_SERVICE_KEY`: Paste your service_role key from Step 2.4

5. Save the file

**✅ Checkpoint**: `.env.local` file exists with all 5 variables filled in

---

## Step 4: Run Locally (5 minutes)

### 4.1 Install Dependencies

```bash
npm install
```

**Expected time**: 1-2 minutes

### 4.2 Set Up Database Schema

Push the database schema to Neon:

```bash
npx prisma db push
```

**Expected output**:
```
Your database is now in sync with your Prisma schema. Done in 2.5s
✔ Generated Prisma Client
```

### 4.3 Create Admin User

Seed the database with a default admin account:

```bash
npm run db:seed
```

**Expected output**:
```
Admin user created successfully
Email: admin@adzzat.com
Password: admin123
```

**Important**: You'll change this password after first login!

### 4.4 Start Development Server

```bash
npm run dev
```

**Expected output**:
```
▲ Next.js 14.x.x
- Local:        http://localhost:3000
✓ Ready in 2.3s
```

### 4.5 Test Locally

1. Open browser and go to **http://localhost:3000**
2. You should see the login/signup page

**Test the platform**:

#### Test 1: Admin Login
1. Click **"Sign In"**
2. Use:
   - Email: `admin@adzzat.com`
   - Password: `admin123`
3. You should be redirected to admin dashboard
4. **Change password**: Click "Profile" → Edit → Change password

#### Test 2: Create a Contributor
1. Logout (if logged in)
2. Click **"Sign Up"**
3. Fill in:
   - Name: `Test Contributor`
   - Email: `contributor@test.com`
   - Password: `test123`
   - Role: **Contributor**
4. Click Sign Up
5. You should be automatically approved and see contributor dashboard

#### Test 3: Upload a Task
1. Still logged in as contributor
2. Click **"Upload New Task"**
3. Fill in:
   - Title: `Test Task`
   - Domain: Select any option (e.g., "Bug Fixes")
   - Language: Select any option (e.g., "JavaScript")
   - File: Create a test ZIP file (any ZIP file will work)
4. Click **"Upload"**
5. You should see your submission in the list with gray background (PENDING)

#### Test 4: Create a Reviewer
1. Logout
2. Sign up again with:
   - Name: `Test Reviewer`
   - Email: `reviewer@test.com`
   - Password: `test123`
   - Role: **Reviewer**
3. You'll see "Waiting for admin approval"

#### Test 5: Approve Reviewer (as Admin)
1. Logout
2. Login as admin (`admin@adzzat.com`)
3. Go to **"Users"** tab
4. You should see "Test Reviewer" with "Approve" button
5. Click **"Approve"**

#### Test 6: Review a Task
1. Logout
2. Login as reviewer (`reviewer@test.com`)
3. You should see the test task in pending
4. Click **"Claim Task"**
5. Enter feedback: `Great work!`
6. (Optional) Enter account: `GitHub`
7. Check **"Mark as Eligible"**
8. Click **"Submit Feedback"**
9. Task should now have blue background

#### Test 7: Download Feature
1. Still logged in as reviewer
2. Click the **download button** (⬇ icon) on the task
3. The ZIP file should download

#### Test 8: Approve Task (as Admin)
1. Logout
2. Login as admin
3. Go to **"Submissions"** tab
4. Filter by **"Eligible"**
5. You should see the test task with blue background
6. Expand it and see the review with "Posted in: GitHub"
7. Click **"Approve"**
8. Task should turn green (APPROVED)

#### Test 9: Profile Page
1. Click **"Profile"** in navigation
2. You should see your stats
3. Click **"Edit"** to test editing name/password

**✅ Checkpoint**: All tests pass, features work locally

**If everything works**, press `Ctrl+C` in terminal to stop the server. Time to deploy!

---

## Step 5: Deploy to Vercel (10 minutes)

### 5.1 Push to GitHub (if not already)

1. Check if you need to push:
   ```bash
   git status
   ```

2. If there are uncommitted changes, commit them:
   ```bash
   git add .
   git commit -m "Ready for production deployment"
   git push
   ```

3. Make sure all code is pushed to your GitHub repository

### 5.2 Create Vercel Account

1. Go to **https://vercel.com**
2. Click **"Sign Up"**
3. Choose **"Continue with GitHub"**
4. Authorize Vercel to access your GitHub account

### 5.3 Import Project

1. After login, click **"Add New..."** → **"Project"**
2. Find **"Import Git Repository"** section
3. Find `AdzzatXperts` repository
4. Click **"Import"**

### 5.4 Configure Project

1. **Framework Preset**: Next.js (should auto-detect)
2. **Root Directory**: `./` (leave default)
3. **Build Command**: Leave default (`npm run build`)
4. **Output Directory**: Leave default (`.next`)

### 5.5 Add Environment Variables

Click **"Environment Variables"** section and add these **one by one**:

1. **DATABASE_URL**
   - Key: `DATABASE_URL`
   - Value: Paste your Neon connection string (same as in `.env.local`)
   - ✅ Check all environments (Production, Preview, Development)

2. **JWT_SECRET**
   - Key: `JWT_SECRET`
   - Value: Generate a NEW random string (different from local, make it long!)
   - ✅ Check all environments

3. **SUPABASE_URL**
   - Key: `SUPABASE_URL`
   - Value: Your Supabase project URL (same as in `.env.local`)
   - ✅ Check all environments

4. **SUPABASE_SERVICE_KEY**
   - Key: `SUPABASE_SERVICE_KEY`
   - Value: Your Supabase service_role key (same as in `.env.local`)
   - ✅ Check all environments

5. **NEXT_PUBLIC_APP_URL**
   - Key: `NEXT_PUBLIC_APP_URL`
   - Value: Leave empty for now (we'll update after deployment)
   - ✅ Check all environments

**Double-check**:
- [ ] 5 environment variables added
- [ ] DATABASE_URL is correct
- [ ] SUPABASE_SERVICE_KEY is the service_role key (not anon key)
- [ ] All variables checked for all environments

### 5.6 Deploy

1. Click **"Deploy"**
2. Wait 2-3 minutes for build and deployment
3. You'll see a progress log - don't close the window
4. **Expected steps**:
   - ✓ Building
   - ✓ Prisma Client generation
   - ✓ Database migration
   - ✓ Deployment

### 5.7 Get Deployment URL

1. After successful deployment, you'll see: **"Congratulations!"** 🎉
2. Click **"Continue to Dashboard"**
3. You'll see your deployment URL at the top, like:
   ```
   https://adzzat-xperts-abc123.vercel.app
   ```
4. **Copy this URL**

### 5.8 Update NEXT_PUBLIC_APP_URL

1. In Vercel dashboard, click **"Settings"**
2. Click **"Environment Variables"**
3. Find `NEXT_PUBLIC_APP_URL`
4. Click the **"⋯"** menu → **"Edit"**
5. Change value to your Vercel URL (e.g., `https://adzzat-xperts-abc123.vercel.app`)
6. Click **"Save"**
7. Go back to **"Deployments"** tab
8. Click **"⋯"** on the latest deployment → **"Redeploy"**
9. Click **"Redeploy"** to confirm
10. Wait 1-2 minutes for redeployment

### 5.9 Seed Production Database

You need to create the admin user in production:

**Option A: Using Vercel CLI** (if installed)
```bash
npm i -g vercel
vercel login
vercel env pull .env.production
npm run db:seed
```

**Option B: Using Prisma Studio** (easier)
1. In your terminal:
   ```bash
   # Set DATABASE_URL temporarily to production
   export DATABASE_URL="your-neon-connection-string"
   npm run db:seed
   ```

**Option C: Manual in Prisma Studio**
1. Go to https://console.neon.tech
2. Open your project → SQL Editor
3. Run this SQL:
   ```sql
   INSERT INTO "User" (id, email, password, name, role, "isApproved", "createdAt", "updatedAt")
   VALUES (
     'admin-prod-' || gen_random_uuid()::text,
     'admin@adzzat.com',
     '$2a$10$rKjvXJF.HF9qVZFcJZqm2.Z8j8OxS.XxQQ1xrXxdXxXxXxXxXxXx',
     'Admin',
     'ADMIN',
     true,
     NOW(),
     NOW()
   );
   ```
   Note: Password will be `admin123` (you'll change it)

**✅ Checkpoint**: Admin user created in production database

---

## Step 6: Test Production (5 minutes)

### 6.1 Access Your Deployed App

1. Open your Vercel URL: `https://your-app.vercel.app`
2. You should see the login/signup page

### 6.2 Quick Smoke Tests

**Test 1: Admin Login**
1. Login with `admin@adzzat.com` / `admin123`
2. Change password immediately in Profile

**Test 2: Create Test Account**
1. Logout, sign up as a contributor
2. Upload a test task
3. Verify file uploads to Supabase

**Test 3: End-to-End Flow**
1. Sign up as reviewer → wait for approval
2. Login as admin → approve reviewer
3. Login as reviewer → claim task → submit feedback
4. Login as admin → approve task
5. Verify colors change (gray → yellow → blue → green)

**Test 4: Download**
1. As reviewer or admin, download a submission
2. Verify file downloads correctly

### 6.3 Check Logs (if issues)

If something doesn't work:
1. Go to Vercel dashboard
2. Click **"Logs"** tab
3. Look for errors in real-time logs
4. Common issues:
   - Database connection: Check DATABASE_URL
   - File upload: Check SUPABASE_SERVICE_KEY
   - Build errors: Check deployment logs

---

## Troubleshooting

### Issue: Build Fails with "Prisma Client Error"

**Solution**:
```bash
# In Vercel, add this to "Build Command" in Settings → General:
npx prisma generate && npm run build
```

### Issue: Database Connection Fails

**Solution**:
1. Check DATABASE_URL in Vercel environment variables
2. Make sure it includes `?sslmode=require`
3. Test connection locally first
4. In Neon dashboard, check if database is active

### Issue: File Upload Fails

**Solution**:
1. Verify SUPABASE_SERVICE_KEY (not anon key)
2. Check bucket "submissions" exists in Supabase
3. Check bucket is private (not public)
4. Go to Supabase → Storage → submissions → Policies → Create policy:
   - Policy name: `Allow service role`
   - Target roles: `service_role`
   - Allowed operations: All (SELECT, INSERT, UPDATE, DELETE)

### Issue: "Admin not found" after deployment

**Solution**: Run the seed script with production DATABASE_URL (see Step 5.9)

### Issue: Getting 500 errors

**Solution**:
1. Check Vercel logs (Vercel Dashboard → Logs)
2. Common causes:
   - Missing environment variables
   - Wrong Supabase key (using anon instead of service_role)
   - Database not migrated (run `npx prisma db push` with production DATABASE_URL)

---

## Post-Deployment Checklist

- [ ] App accessible at Vercel URL
- [ ] Admin login works
- [ ] Can create contributor account
- [ ] Can create reviewer account
- [ ] Admin can approve reviewers
- [ ] Contributors can upload tasks
- [ ] File upload works (check Supabase Storage)
- [ ] Reviewers can download files
- [ ] Reviewers can submit feedback with account field
- [ ] Admin can see account field in reviews
- [ ] Admin can approve tasks
- [ ] Colors change correctly (gray → yellow → blue → green)
- [ ] Profile pages show correct stats
- [ ] Profile editing works
- [ ] Leaderboard shows data
- [ ] All tabs work (Status filtering)
- [ ] Changed admin password from default

---

## Next Steps

### Customize Domain (Optional)

1. Buy a domain (e.g., Namecheap, Google Domains)
2. In Vercel: Settings → Domains → Add Domain
3. Follow DNS setup instructions
4. Update `NEXT_PUBLIC_APP_URL` to your custom domain
5. Redeploy

### Set Up Email Notifications (Optional)

Consider adding:
- Email notifications for reviewer approvals
- Email notifications for task approvals
- Welcome emails

You can use:
- **Resend** (free tier: 3,000 emails/month)
- **SendGrid** (free tier: 100 emails/day)

### Monitor Usage

- **Neon**: Check database size in dashboard
- **Supabase**: Check storage usage in dashboard
- **Vercel**: Check bandwidth and function usage

### Scale Up (When Needed)

When you exceed free tiers:
- **Neon**: $19/month for more storage
- **Supabase**: $25/month for 100GB storage
- **Vercel**: $20/month for Pro plan

---

## Success! 🎉

You now have a fully functional, deployed web platform with:
- ✅ User authentication
- ✅ File upload/download
- ✅ Review system
- ✅ Admin panel
- ✅ Leaderboard
- ✅ Profile management
- ✅ Beautiful modern UI
- ✅ All hosted for FREE!

**Share your deployment URL with your team and start onboarding users!**

---

## Support

If you run into issues:
1. Check the troubleshooting section above
2. Review Vercel deployment logs
3. Check Neon/Supabase dashboards for service status
4. Review the main README.md for additional documentation
5. Check DATABASE-MIGRATION.md if you have existing data

## Useful Commands Reference

```bash
# Local development
npm run dev

# Database operations
npx prisma db push        # Push schema to database
npx prisma generate       # Regenerate Prisma Client
npx prisma studio         # Open database GUI
npm run db:seed          # Seed admin user

# Build for production (local test)
npm run build
npm start

# Check what's not committed
git status

# Deploy updates
git add .
git commit -m "Your changes"
git push
# Vercel auto-deploys on push
```

---

**Congratulations on your deployment!** 🚀
