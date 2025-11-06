# Netlify Deployment Guide (Vercel Alternative)

Netlify is very similar to Vercel but with an easier environment variable interface.

## Quick Setup (15 minutes)

### Step 1: Sign Up for Netlify

1. Go to **https://app.netlify.com/signup**
2. Click **"Sign up with GitHub"**
3. Authorize Netlify to access your repositories

### Step 2: Import Your Project

1. After login, click **"Add new site"** → **"Import an existing project"**
2. Click **"Deploy with GitHub"**
3. Authorize Netlify if prompted
4. Search for and select **"AdzzatXperts"** repository
5. Select the branch: `claude/scalable-web-platform-011CUpsUdnnhCw25JJLS4vRg` (or your main branch)

### Step 3: Configure Build Settings

You'll see a configuration screen:

1. **Site name**: Choose a name (e.g., `adzzatxperts-prod`) - this will be your URL
2. **Branch to deploy**: `claude/scalable-web-platform-011CUpsUdnnhCw25JJLS4vRg` (or main)
3. **Build command**:
   ```
   npm run build
   ```
4. **Publish directory**:
   ```
   .next
   ```
5. **Functions directory**: Leave empty

### Step 4: Add Environment Variables (EASY!)

Click **"Add environment variables"** or **"Show advanced"** → **"New variable"**

Add these one by one (much simpler than Vercel!):

#### Variable 1: DATABASE_URL
- **Key**: `DATABASE_URL`
- **Value**: Your Neon connection string
  ```
  postgresql://username:password@ep-xxx.aws.neon.tech/neondb?sslmode=require
  ```
- Click **"Add"** or press Enter

#### Variable 2: JWT_SECRET
- **Key**: `JWT_SECRET`
- **Value**: A long random string (32+ characters)
  ```
  my-super-secret-jwt-key-for-production-use-change-this-random-string
  ```
- Click **"Add"**

#### Variable 3: SUPABASE_URL
- **Key**: `SUPABASE_URL`
- **Value**: Your Supabase project URL
  ```
  https://xxxxx.supabase.co
  ```
- Click **"Add"**

#### Variable 4: SUPABASE_SERVICE_KEY
- **Key**: `SUPABASE_SERVICE_KEY`
- **Value**: Your Supabase service_role key
  ```
  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  ```
- Click **"Add"**

#### Variable 5: NEXT_PUBLIC_APP_URL
- **Key**: `NEXT_PUBLIC_APP_URL`
- **Value**: Leave empty for now (we'll update after deployment)
- Click **"Add"**

### Step 5: Deploy!

1. Review your settings
2. Click **"Deploy [your-site-name]"**
3. Wait 3-5 minutes for build and deployment
4. Watch the build logs (you can see real-time progress)

### Step 6: Get Your URL and Update Environment Variable

1. After successful deployment, you'll see: **"Your site is live! 🎉"**
2. Your URL will be something like: `https://adzzatxperts-prod.netlify.app`
3. Copy this URL
4. Go to **"Site configuration"** → **"Environment variables"**
5. Find `NEXT_PUBLIC_APP_URL`
6. Click **"Options"** → **"Edit"**
7. Paste your Netlify URL
8. Click **"Save"**
9. Go to **"Deploys"** tab
10. Click **"Trigger deploy"** → **"Deploy site"**
11. Wait 2-3 minutes for redeployment

### Step 7: Seed Production Database

You need to create the admin user in production database:

**Option A: Using your local machine**

1. Open terminal
2. Temporarily set DATABASE_URL to production:
   ```bash
   export DATABASE_URL="your-neon-production-connection-string"
   npm run db:seed
   ```

**Option B: Using Neon SQL Editor**

1. Go to https://console.neon.tech
2. Select your project
3. Click **"SQL Editor"**
4. Run:
   ```sql
   -- Create admin user with hashed password (admin123)
   INSERT INTO "User" (id, email, password, name, role, "isApproved", "createdAt", "updatedAt")
   VALUES (
     gen_random_uuid()::text,
     'admin@adzzat.com',
     '$2a$10$YourHashedPasswordHere',
     'Admin',
     'ADMIN',
     true,
     NOW(),
     NOW()
   );
   ```

   Or use the seed script locally with production DATABASE_URL as shown in Option A.

### Step 8: Test Your Deployment

1. Visit your Netlify URL: `https://your-site.netlify.app`
2. You should see the login page
3. Login with: `admin@adzzat.com` / `admin123`
4. Test uploading a task
5. Test downloading a file
6. Change admin password in Profile

## Netlify Dashboard Overview

After deployment, you'll have access to:

- **Deploys**: See deployment history and logs
- **Site configuration**:
  - **Environment variables**: Easy to edit!
  - **Domain management**: Add custom domain
  - **Build & deploy**: Configure build settings
- **Functions**: Not needed for this project
- **Forms**: Not needed for this project

## Benefits of Netlify vs Vercel

✅ **Easier environment variables** - No confusing secrets or @ references
✅ **Better build logs** - Easier to debug
✅ **Instant rollbacks** - Click to rollback to previous deploy
✅ **Branch deploys** - Every branch gets a preview URL
✅ **No secret management confusion** - Just plain key/value pairs

## Updating Environment Variables Later

Super easy on Netlify:

1. Go to **Site configuration** → **Environment variables**
2. Find the variable you want to change
3. Click **"Options"** → **"Edit"**
4. Update the value
5. Click **"Save"**
6. Trigger a new deploy (optional - variables update on next deploy automatically)

## Custom Domain (Optional)

1. Buy a domain (Namecheap, Google Domains, etc.)
2. In Netlify: **Domain management** → **"Add custom domain"**
3. Enter your domain (e.g., `adzzatxperts.com`)
4. Follow DNS setup instructions
5. Netlify provides free SSL certificate automatically

## Troubleshooting

### Build Fails with Prisma Error

**Solution**: Update build command in **Site configuration** → **Build & deploy** → **Build settings**:

```bash
npx prisma generate && npm run build
```

### Database Connection Error

- Check DATABASE_URL in environment variables
- Make sure it includes `?sslmode=require`
- Test connection from local machine first

### File Upload Not Working

- Verify SUPABASE_SERVICE_KEY is correct (service_role, not anon)
- Check bucket "submissions" exists in Supabase
- Verify bucket is private

### Site is Slow or Not Loading

- Check build logs for errors
- Verify all environment variables are set
- Make sure Next.js build completed successfully

## Useful Netlify Commands

If you want to use Netlify CLI:

```bash
# Install CLI
npm install -g netlify-cli

# Login
netlify login

# Link to your site
netlify link

# Deploy from command line
netlify deploy --prod

# View environment variables
netlify env:list

# Add environment variable via CLI
netlify env:set DATABASE_URL "your-value"
```

## Monitoring and Logs

### View Function Logs (Real-time)

1. Go to **Functions** tab
2. See all API route executions
3. Click on any function to see detailed logs

### View Build Logs

1. Go to **Deploys** tab
2. Click on any deployment
3. View full build log

### Analytics (Optional - Paid)

Netlify offers analytics for $9/month if you want:
- Page views
- Unique visitors
- Top pages
- Bandwidth usage

But the free tier is enough for 500+ users!

## Free Tier Limits

- **100GB bandwidth/month** - Enough for thousands of requests
- **300 build minutes/month** - ~10 deploys per day
- **Unlimited sites** - Deploy as many as you want
- **1 concurrent build** - One build at a time

**This easily handles 500+ users for FREE!**

## Next Steps

1. ✅ Deploy to Netlify
2. ✅ Test all functionality
3. ✅ Share your Netlify URL with users
4. Consider:
   - Add custom domain
   - Set up monitoring
   - Enable branch previews for testing

## Support

If you have issues:
- Check Netlify build logs (very detailed!)
- Visit Netlify forums: https://answers.netlify.com
- Check Netlify docs: https://docs.netlify.com

---

**Congratulations! You're now deployed on Netlify! 🎉**
