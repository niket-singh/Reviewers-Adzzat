# Vercel Deployment Checklist ✅

Use this quick checklist to deploy your AdzzatXperts platform to Vercel.

---

## 📝 Before You Start

### Prerequisites (Must Have)
- [ ] Neon Database created with connection string
- [ ] Supabase Storage bucket created with credentials
- [ ] Code pushed to GitHub repository
- [ ] Local development working (`npm run dev` works)

---

## 🚀 Deployment Steps

### 1. GitHub Repository
- [ ] Code is pushed to GitHub
- [ ] All changes are committed
- [ ] Branch is `main` or your deployment branch

### 2. Vercel Account Setup
- [ ] Go to https://vercel.com
- [ ] Sign up with GitHub
- [ ] Authorize Vercel to access your repositories

### 3. Import Project
- [ ] Click "Add New..." → "Project"
- [ ] Select "AdzzatXperts" repository
- [ ] Click "Import"

### 4. Configure Project
- [ ] Framework: Next.js (auto-detected)
- [ ] Root Directory: `./` (default)
- [ ] Build Command: `npm run build`
- [ ] Install Command: `npm install`

### 5. Environment Variables (CRITICAL!)

Copy these values from your local `.env.local`:

- [ ] **DATABASE_URL**
  ```
  postgresql://username:password@ep-xxx.aws.neon.tech/dbname?sslmode=require
  ```

- [ ] **JWT_SECRET**
  ```
  Generate NEW 32+ character random string for production
  ```

- [ ] **SUPABASE_URL**
  ```
  https://xxxxxxxxxxxxx.supabase.co
  ```

- [ ] **SUPABASE_SERVICE_KEY**
  ```
  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (the long service_role key)
  ```

- [ ] **NEXT_PUBLIC_APP_URL**
  ```
  Leave empty now - update after deployment
  ```

### 6. Deploy
- [ ] Click "Deploy" button
- [ ] Wait 2-5 minutes for build
- [ ] Deployment succeeds ✅

### 7. Post-Deployment
- [ ] Copy your Vercel URL: `https://xxx.vercel.app`
- [ ] Update `NEXT_PUBLIC_APP_URL` environment variable with your URL
- [ ] Redeploy (Deployments → ... → Redeploy)

### 8. Database Setup
- [ ] Run `npx prisma db push` (with production DATABASE_URL)
- [ ] Run `npm run db:seed` to create admin user

### 9. Testing
- [ ] Visit your Vercel URL
- [ ] Sign in as admin (`admin@adzzat.com` / `admin123`)
- [ ] Create test contributor account
- [ ] Upload test file
- [ ] Create test reviewer account
- [ ] Approve reviewer as admin
- [ ] Test review workflow
- [ ] Verify leaderboard works

---

## 🔧 Environment Variables Quick Reference

| Variable | Where to Get It | Example |
|----------|----------------|---------|
| `DATABASE_URL` | Neon Dashboard → Connection Details | `postgresql://user:pass@ep-xxx.neon.tech/db?sslmode=require` |
| `JWT_SECRET` | Generate random 32+ chars | `prod-secret-2024-xyz789-random` |
| `SUPABASE_URL` | Supabase → Settings → API | `https://abcdef.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Supabase → Settings → API → service_role | `eyJhbGc...` (long key) |
| `NEXT_PUBLIC_APP_URL` | Your Vercel deployment URL | `https://your-app.vercel.app` |

---

## ⚠️ Common Mistakes to Avoid

- [ ] ❌ Using `anon` public key instead of `service_role` key
- [ ] ❌ Forgetting `?sslmode=require` at end of DATABASE_URL
- [ ] ❌ Using local development JWT_SECRET in production
- [ ] ❌ Not updating NEXT_PUBLIC_APP_URL after deployment
- [ ] ❌ Forgetting to run database migrations
- [ ] ❌ Not creating admin user with seed script

---

## 📊 Success Indicators

You'll know deployment is successful when:

✅ Build completes without errors
✅ Vercel shows "Deployment succeeded"
✅ You can access your URL
✅ Sign-in page loads correctly
✅ Admin login works
✅ File uploads work
✅ All user roles work correctly

---

## 🐛 Troubleshooting Quick Reference

| Error | Quick Fix |
|-------|-----------|
| Build fails | Check Vercel build logs for specific error |
| Environment variables undefined | Verify all 5 variables are set, then redeploy |
| Database connection fails | Check DATABASE_URL has `?sslmode=require` |
| File upload fails | Verify using service_role key, not anon key |
| 404 on routes | Clear Vercel cache and redeploy |
| Prisma errors | Ensure `prisma generate` runs in build command |

---

## 🎯 After Deployment

- [ ] Share live URL with team
- [ ] Change admin password
- [ ] Test all features end-to-end
- [ ] Monitor Vercel analytics
- [ ] Set up custom domain (optional)
- [ ] Document for your team

---

## 📞 Need Help?

If you get stuck:

1. Check **Vercel build logs** (shows detailed errors)
2. Check **Vercel function logs** (shows runtime errors)
3. Review **VERCEL-DEPLOYMENT.md** for detailed instructions
4. Copy error message and ask for help!

---

**Time to deploy: 10-15 minutes** ⏱️

**Total cost: $0** 💰

**Ready to go live!** 🚀
