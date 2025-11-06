# Deploy to Vercel - Complete Guide

This guide will walk you through deploying your AdzzatXperts platform to Vercel (100% free hosting).

---

## 📋 Pre-Deployment Checklist

Before deploying, make sure you have:

- [x] **Neon Database** set up with connection string
- [x] **Supabase Storage** created with bucket and credentials
- [x] **GitHub account** (you already have this)
- [x] **Code pushed to GitHub** (we already did this)
- [ ] **Vercel account** (we'll create this)

---

## Part 1: Push Your Code to Main Branch

### Step 1: Check Current Branch

In your local project folder, run:

```powershell
git branch
```

You'll see something like:
```
* claude/scalable-web-platform-011CUpsUdnnhCw25JJLS4vRg
  main
```

### Step 2: Merge to Main Branch

```powershell
# Switch to main branch
git checkout main

# Pull latest changes
git pull origin main

# Merge your feature branch
git merge claude/scalable-web-platform-011CUpsUdnnhCw25JJLS4vRg

# Push to main
git push origin main
```

**Note:** If you get conflicts, let me know and I'll help you resolve them.

**Alternative:** You can also deploy directly from your feature branch - Vercel supports that!

---

## Part 2: Create Vercel Account

### Step 1: Go to Vercel

1. Open your browser and go to: **https://vercel.com**
2. Click **"Sign Up"** (top right corner)

### Step 2: Sign Up with GitHub

1. Click **"Continue with GitHub"**
2. It will redirect to GitHub - click **"Authorize Vercel"**
3. Vercel will ask for permission to access your repositories - **allow it**

✅ That's it! No credit card required for the free tier.

---

## Part 3: Deploy Your Project

### Step 1: Import Your Repository

1. After signing in, you'll see the Vercel dashboard
2. Click **"Add New..."** button → **"Project"**
3. You'll see a list of your GitHub repositories
4. Find **"AdzzatXperts"** in the list
5. Click **"Import"** next to it

### Step 2: Configure Your Project

You'll see a configuration page:

**Framework Preset:**
- Should auto-detect as **"Next.js"** ✅

**Root Directory:**
- Leave as **"./"** (default) ✅

**Build and Output Settings:**
- Leave default (Vercel knows how to build Next.js) ✅

**Install Command:**
- Should be `npm install` ✅

**Build Command:**
- Should be `npm run build` ✅

**Output Directory:**
- Should be `.next` ✅

### Step 3: Add Environment Variables (CRITICAL!)

This is the **most important step**!

1. Click to **expand "Environment Variables"** section
2. Add these **5 variables** one by one:

#### Variable 1: DATABASE_URL
```
Key:   DATABASE_URL
Value: [Paste your Neon connection string]
```
Example: `postgresql://username:password@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require`

#### Variable 2: JWT_SECRET
```
Key:   JWT_SECRET
Value: [Create a new long random string - at least 32 characters]
```
Example: `production-secret-key-2024-vercel-adzzat-platform-xyz789-random-string`

**⚠️ IMPORTANT:** Generate a NEW secret for production! Don't use your local one.

#### Variable 3: SUPABASE_URL
```
Key:   SUPABASE_URL
Value: [Your Supabase project URL]
```
Example: `https://xxxxxxxxxxxxx.supabase.co`

#### Variable 4: SUPABASE_SERVICE_KEY
```
Key:   SUPABASE_SERVICE_KEY
Value: [Your Supabase service_role key - the long one]
```
Example: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS...`

#### Variable 5: NEXT_PUBLIC_APP_URL
```
Key:   NEXT_PUBLIC_APP_URL
Value: [Leave empty for now - we'll update this after deployment]
```
Or use: `https://your-project-name.vercel.app` (if you know it)

### Step 4: Deploy!

1. After adding all 5 environment variables, click **"Deploy"**
2. Vercel will start building your project
3. You'll see a progress screen with logs
4. **Wait 2-5 minutes** for the build to complete

You'll see:
```
Building...
Running "npm run build"
Generating Prisma Client...
Creating optimized production build...
✓ Compiled successfully
```

---

## Part 4: Update Environment Variable

### Step 1: Get Your Deployment URL

After deployment succeeds, you'll see:
```
🎉 Congratulations! Your project has been deployed!
```

And a URL like: **`https://adzzat-xperts-xyz123.vercel.app`**

Copy this URL!

### Step 2: Update NEXT_PUBLIC_APP_URL

1. Click **"Go to Dashboard"** or go to your Vercel project dashboard
2. Click **"Settings"** tab
3. Click **"Environment Variables"** in the left sidebar
4. Find **"NEXT_PUBLIC_APP_URL"**
5. Click the **"Edit"** button (three dots → Edit)
6. Update the value to your Vercel URL:
   ```
   https://adzzat-xperts-xyz123.vercel.app
   ```
7. Click **"Save"**

### Step 3: Redeploy

After updating the environment variable:

1. Go to **"Deployments"** tab
2. Click the **three dots** (...) on the latest deployment
3. Click **"Redeploy"**
4. Confirm by clicking **"Redeploy"** again

---

## Part 5: Initialize Production Database

### Step 1: Open Vercel Deployment URL

Go to your live site: `https://your-project.vercel.app`

**You might see:** Database connection errors - this is expected! We need to run migrations first.

### Step 2: Run Database Migration Locally

In your local terminal:

```powershell
# Make sure your .env.local has the PRODUCTION database URL
# Or run with production DATABASE_URL directly:

npx prisma db push
```

This will create all tables in your Neon database.

### Step 3: Seed Admin User

```powershell
npm run db:seed
```

This creates the admin account for production.

**Alternative Method - Using Vercel CLI:**

Install Vercel CLI:
```powershell
npm install -g vercel
```

Login to Vercel:
```powershell
vercel login
```

Link your project:
```powershell
vercel link
```

Run commands on production:
```powershell
vercel env pull .env.production
npx prisma db push --preview-feature
```

---

## Part 6: Test Your Deployment

### Step 1: Open Your Live Site

Go to: **`https://your-project.vercel.app`**

You should see the **sign-in page**!

### Step 2: Sign In as Admin

- Email: `admin@adzzat.com`
- Password: `admin123`

✅ You should see the admin dashboard!

### Step 3: Test All Features

1. **Create Contributor Account:**
   - Sign out
   - Sign up with a test email
   - Choose "Contributor" role
   - Should redirect to contributor dashboard

2. **Test File Upload:**
   - Upload a test ZIP file
   - Verify it uploads to Supabase

3. **Create Reviewer Account:**
   - Sign out
   - Sign up with another test email
   - Choose "Reviewer" role
   - Sign in as admin
   - Approve the reviewer

4. **Test Review Flow:**
   - Sign in as reviewer
   - Claim a task
   - Give feedback

5. **Test Admin Approval:**
   - Sign in as admin
   - Approve eligible tasks

---

## Part 7: Update Supabase CORS (If Needed)

If file uploads fail with CORS errors:

1. Go to **Supabase Dashboard**
2. Click **"Storage"** → Select `submissions` bucket
3. Click **"Configuration"** tab
4. Add your Vercel URL to allowed origins:
   ```
   https://your-project.vercel.app
   ```

---

## 🎉 Deployment Complete!

Your platform is now live at: **`https://your-project.vercel.app`**

### What You Get with Vercel Free Tier:

✅ **Unlimited deployments**
✅ **100GB bandwidth per month**
✅ **Automatic HTTPS**
✅ **Custom domain support** (you can add your own domain later)
✅ **Automatic deployments** on git push
✅ **Preview deployments** for pull requests

---

## 🔄 Updating Your Live Site

Every time you push changes to GitHub, Vercel will automatically deploy!

```powershell
# Make changes to your code
git add .
git commit -m "Your changes"
git push origin main
```

Vercel will:
1. Detect the push
2. Build your project
3. Deploy automatically
4. Send you an email when done

---

## 🎨 Custom Domain (Optional)

Want to use your own domain like `adzzatxperts.com`?

1. Go to **Vercel Dashboard** → **Settings** → **Domains**
2. Click **"Add"**
3. Enter your domain name
4. Follow the DNS configuration instructions
5. Wait for DNS propagation (5-30 minutes)

**Free domains:** You can get free domains from:
- Freenom (free .tk, .ml domains)
- GitHub Student Pack (includes free .me domain)

---

## 📊 Monitoring & Analytics

Vercel provides built-in analytics:

1. Go to **Vercel Dashboard**
2. Click **"Analytics"** tab
3. See:
   - Page views
   - Load times
   - Visitor locations
   - Real-time visitors

---

## 🐛 Common Deployment Issues

### Issue 1: Build Fails - Prisma Error

**Error:** `Prisma Client not generated`

**Solution:**
- The `postinstall` script should handle this
- If not, add to `package.json`:
  ```json
  "scripts": {
    "build": "prisma generate && next build"
  }
  ```

### Issue 2: Environment Variables Not Working

**Error:** Variables are undefined

**Solution:**
- Make sure you saved them in Vercel dashboard
- Redeploy after adding/changing variables
- Check for typos in variable names

### Issue 3: Database Connection Fails

**Error:** `Can't reach database server`

**Solution:**
- Verify `DATABASE_URL` is correct in Vercel settings
- Check Neon database is active (not paused)
- Make sure `?sslmode=require` is at the end of the URL

### Issue 4: File Upload Fails

**Error:** `403 Forbidden` or CORS error

**Solution:**
- Verify `SUPABASE_SERVICE_KEY` is the service_role key (not anon)
- Check Supabase bucket exists and is named `submissions`
- Add Vercel URL to Supabase CORS settings

### Issue 5: 404 on Routes

**Error:** Pages show 404

**Solution:**
- Clear Vercel cache: Settings → General → Clear Cache
- Redeploy

---

## 📈 Scaling Beyond Free Tier

When you grow beyond 500 users:

**Neon Database:**
- Free: 10GB storage
- Paid: $20/month for 100GB

**Supabase Storage:**
- Free: 1GB storage
- Paid: $25/month for 100GB

**Vercel:**
- Free: 100GB bandwidth/month
- Paid: $20/month for 1TB bandwidth

Total cost for 1000+ users: ~$65/month

---

## 🎯 Next Steps

After successful deployment:

1. ✅ Share your live URL with users
2. ✅ Change admin password (important!)
3. ✅ Set up backups for your database
4. ✅ Monitor usage in Vercel dashboard
5. ✅ Add custom domain (optional)
6. ✅ Set up email notifications (future enhancement)

---

## 🆘 Need Help?

If you encounter any issues during deployment:

1. Check the **Vercel build logs** (shows detailed error messages)
2. Check the **Function logs** (runtime errors)
3. Verify all **environment variables** are set correctly
4. Make sure **database is accessible** from Vercel

**Copy the error message and let me know!** I'll help you fix it.

---

**Your platform is production-ready!** 🎉

Users can now sign up, upload tasks, review submissions, and compete on the leaderboard - all hosted for free on Vercel!
