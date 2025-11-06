# Quick Start Guide for Windows

## Issue: Tailwind CSS Error When Running `npm run dev`

If you see this error:
```
Error: It looks like you're trying to use `tailwindcss` directly as a PostCSS plugin...
```

**Don't worry!** This is a known issue with Tailwind CSS v4. Follow the steps below to fix it.

---

## Quick Fix - Choose ONE Method

### Method 1: Using PowerShell Script (RECOMMENDED)

1. **Open PowerShell** in your project directory:
   - Right-click the `AdzzatXperts` folder
   - Select **"Open in Terminal"** or **"Open PowerShell window here"**

2. **Run the fix script:**
   ```powershell
   .\fix-tailwind.ps1
   ```

3. **If you get "execution policy" error:**
   ```powershell
   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
   .\fix-tailwind.ps1
   ```

---

### Method 2: Using Batch File (If PowerShell is Blocked)

1. **Open Command Prompt** in your project directory:
   - Right-click the `AdzzatXperts` folder
   - Select **"Open in Command Prompt"**
   - Or press `Shift + Right-click` and select **"Open command window here"**

2. **Run the fix script:**
   ```cmd
   fix-tailwind.bat
   ```

---

### Method 3: Manual Fix (If Scripts Don't Work)

Run these commands one by one in PowerShell or Command Prompt:

```powershell
# 1. Clear cache
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue

# 2. Uninstall Tailwind v4
npm uninstall tailwindcss

# 3. Install Tailwind v3
npm install -D tailwindcss@3.4.1

# 4. Reinstall dependencies
npm install

# 5. Clear npm cache
npm cache clean --force
```

**For Command Prompt users, use these instead:**
```cmd
rmdir /s /q .next
rmdir /s /q node_modules\.cache
npm uninstall tailwindcss
npm install -D tailwindcss@3.4.1
npm install
npm cache clean --force
```

---

## After Running the Fix

### 1. Verify Your `.env.local` File

Make sure you have a `.env.local` file in your project root with these variables:

```env
# From Neon (Part 1 - Database)
DATABASE_URL="postgresql://username:password@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require"

# Generate a random 32+ character string
JWT_SECRET="your-super-secret-jwt-key-at-least-32-characters-long-random-string"

# From Supabase (Part 2 - Storage)
SUPABASE_URL="https://xxxxxxxxxxxxx.supabase.co"
SUPABASE_SERVICE_KEY="eyJhbGc...your-long-service-role-key..."

# For local development
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**IMPORTANT:**
- Replace the placeholder values with YOUR actual credentials
- Use the **service_role** key from Supabase, NOT the anon public key
- Don't add extra spaces or quotes

### 2. Initialize Database (First Time Only)

If this is your first time running the project:

```powershell
# Push database schema to Neon
npm run db:push

# Create admin user
npm run db:seed
```

You should see:
```
Admin user created: admin@adzzat.com
Password: admin123
```

### 3. Start Development Server

```powershell
npm run dev
```

**Expected output:**
```
▲ Next.js 14.2.33
- Local:        http://localhost:3000

✓ Ready in 2.1s
```

### 4. Open in Browser

Go to: **http://localhost:3000**

**Sign in with:**
- Email: `admin@adzzat.com`
- Password: `admin123`

---

## Common Issues & Solutions

### Issue 1: "Cannot find module '@supabase/supabase-js'"

**Solution:**
```powershell
npm install @supabase/supabase-js
```

### Issue 2: "Prisma Client not found"

**Solution:**
```powershell
npm run postinstall
```
or
```powershell
npx prisma generate
```

### Issue 3: "DATABASE_URL is not defined"

**Solution:**
- Make sure `.env.local` exists in your project root
- Verify it has `DATABASE_URL` with your Neon connection string
- Restart your dev server after saving `.env.local`

### Issue 4: "Failed to upload file"

**Solution:**
- Check `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` in `.env.local`
- Verify you're using the **service_role** key (the secret one), NOT anon public
- Make sure your Supabase bucket is named exactly `submissions` (lowercase)
- Verify you created the storage policy in Supabase dashboard

### Issue 5: Port 3000 Already in Use

**Solution:**
```powershell
# Use a different port
npm run dev -- -p 3001
```
Then open: **http://localhost:3001**

---

## Still Having Issues?

If you're still seeing errors:

1. **Copy the FULL error message** from your terminal
2. **Check which step failed** (the error usually shows the file/line)
3. **Share the error** so I can help you fix it

Common things to check:
- [ ] Node.js version 18+ installed (`node --version`)
- [ ] npm is working (`npm --version`)
- [ ] You're in the correct directory (`dir` or `ls` should show `package.json`)
- [ ] `.env.local` exists and has all 5 required variables
- [ ] Internet connection is working (for npm packages)

---

## Next Steps After Successful Setup

Once you see the sign-in page:

1. **Test Admin Account:**
   - Sign in with `admin@adzzat.com` / `admin123`
   - Explore the admin dashboard

2. **Create Test Accounts:**
   - Sign out and create a Contributor account
   - Sign out and create a Reviewer account
   - Sign back in as Admin to approve the Reviewer

3. **Test File Upload:**
   - Sign in as Contributor
   - Upload a test ZIP file
   - Add domain and language info

4. **Test Review Flow:**
   - Sign in as Reviewer
   - Claim a task
   - Give feedback and mark as eligible

5. **Test Admin Approval:**
   - Sign in as Admin
   - See the blue (eligible) submission
   - Approve it (turns green)

---

## Ready to Deploy?

Once everything works locally, check out the **README.md** for deployment instructions to Vercel!

---

**Need more help?** Let me know what error you're seeing!
