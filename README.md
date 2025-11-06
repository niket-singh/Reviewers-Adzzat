# AdzzatXperts - Task Submission & Review Platform

A scalable web platform for task submission and review, supporting up to 500+ users with three user types: Admin, Reviewer, and Contributor.

## Features

### User Roles
- **Contributors**: Upload tasks, view submissions, and receive feedback
- **Reviewers**: Review tasks, provide feedback, mark eligible submissions (requires admin approval)
- **Admins**: Approve reviewers, approve eligible tasks, manage users, view leaderboard

### Key Functionality
- **File Upload**: Contributors can upload ZIP files with domain and language selection (dropdowns + custom input)
- **Download System**: Reviewers and admins can download submission files
- **Review System**: Reviewers can claim and review tasks with feedback and optional account field
- **Admin Reviews**: Admins can now claim and review tasks (in addition to approving)
- **Fair Task Distribution**: Tasks are distributed evenly among reviewers
- **Status Tracking**: Visual color-coded status system (Pending → Claimed → Eligible/Blue → Approved/Green)
- **Status Tabs**: Filter submissions by status (All/Pending/Claimed/Eligible/Approved)
- **Profile Pages**: All users can view stats and edit name/password
- **Account Tracking**: Reviewers can specify where content was posted (visible only to admins)
- **Leaderboard**: Track top contributors by eligible and approved tasks
- **User Management**: Admin panel for managing users and approvals
- **Modern UI**: Beautiful gradient backgrounds and smooth transitions

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (Serverless)
- **Database**: PostgreSQL (via Neon - free tier)
- **ORM**: Prisma
- **File Storage**: Supabase Storage (1GB free - NO CREDIT CARD REQUIRED!)
- **Authentication**: JWT + HTTP-only cookies
- **Deployment**: Vercel

## Prerequisites

- Node.js 18+ and npm
- A Neon PostgreSQL database (free at [neon.tech](https://neon.tech))
- Supabase Storage (free at [supabase.com](https://supabase.com) - no credit card needed!)

## Setup Instructions

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd AdzzatXperts
npm install
```

### 2. Database Setup (Neon PostgreSQL)

1. Go to [neon.tech](https://neon.tech) and create a free account
2. Create a new project
3. Copy your connection string (looks like: `postgresql://username:password@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require`)

### 3. Supabase Storage Setup (NO CREDIT CARD NEEDED!)

1. Go to [supabase.com](https://supabase.com) and sign up with GitHub (fastest)
2. Create a new project:
   - Project name: `AdzzatXperts`
   - Database password: Create a strong password (save it!)
   - Region: Choose closest to you
   - Plan: **Free** (default)
3. Wait 2-3 minutes for project setup
4. Click **"Storage"** in left sidebar
5. Click **"Create a new bucket"**:
   - Name: `submissions`
   - Public bucket: **OFF** (keep private)
6. Go to **Settings** (gear icon) → **API**
7. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **service_role key** (the secret one, NOT anon public): `eyJhbGc...`

### 4. Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Edit `.env.local` (or create it from `.env.example`):

```env
# Database (from Neon)
DATABASE_URL="postgresql://username:password@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require"

# JWT Secret (generate a random string - at least 32 characters)
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# Supabase Storage (from Supabase Project Settings -> API)
SUPABASE_URL="https://xxxxx.supabase.co"
SUPABASE_SERVICE_KEY="your-service-role-key-here"

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**IMPORTANT**: Use the `service_role` key (secret), NOT the `anon` public key!

### 5. Database Migration

Push the schema to your database:

```bash
npm run db:push
```

### 6. Seed Admin User

Create the default admin account:

```bash
npm run db:seed
```

This creates an admin user:
- Email: `admin@adzzat.com`
- Password: `admin123`

**Important**: Change this password after first login!

### 7. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Migrating Existing Installations

⚠️ **If you have an existing installation** and are updating to the latest version, you need to migrate your database.

The latest updates add new features:
- **Download functionality** for reviewers and admins
- **Account field** in feedback (visible only to admins)
- **Admin review capability** (admins can now claim and review tasks)
- **Fair task distribution** (tracks which reviewer claimed each task)

### Quick Migration

```bash
# Pull latest changes
git pull

# Run Prisma migration
npx prisma migrate dev --name add_claimed_and_account_fields

# Or for production
npx prisma migrate deploy

# Restart your dev server
npm run dev
```

### Full Migration Guide

See [DATABASE-MIGRATION.md](./DATABASE-MIGRATION.md) for:
- Detailed migration steps
- Manual SQL migration (if needed)
- Troubleshooting common issues
- Production deployment guidance
- Rollback procedures

**New installations can skip this section** - the setup instructions above will create the correct schema automatically.

## Usage Guide

### For Contributors

1. Sign up with role "Contributor"
2. Automatically approved and redirected to dashboard
3. Click "Upload New Task"
4. Fill in:
   - Task title
   - **Domain**: Select from dropdown (Bug Fixes, DevOps/Security, etc.)
   - **Language**: Select from dropdown (Python, JavaScript, etc.) or choose "Other" to specify
   - Upload ZIP file (max 10MB)
5. **View submissions by status**: Use tabs (All/Pending/Claimed/Eligible/Approved)
6. **Profile**: View your total submissions, eligible tasks, and approved tasks
7. Color coding:
   - Gray = Pending
   - Yellow = Claimed by reviewer
   - Blue = Eligible for admin approval
   - Green = Approved by admin

### For Reviewers

1. Sign up with role "Reviewer"
2. Wait for admin approval
3. After approval, sign in to reviewer dashboard
4. **Browse tasks**: Use tabs (Pending/Claimed/Eligible)
5. **Claim a task**: Click "Claim Task" on pending submissions
6. **Download files**: Click download button to review ZIP files
7. **Provide feedback**:
   - Enter detailed feedback in the form
   - (Optional) Specify "Account Posted In" - e.g., GitHub, LinkedIn (visible only to admins)
   - Check "Mark as Eligible" to recommend for admin approval
8. **Profile**: View total reviews, tasks claimed, and eligible tasks marked

### For Admins

1. Sign in with admin credentials
2. **Submissions Tab**:
   - Filter by status (Eligible/All/Pending/Claimed/Approved)
   - Download submission files
   - Approve eligible (blue) tasks to turn them green
   - View "Account Posted In" field from reviewer feedback
3. **Review Tab** (NEW):
   - Admins can now claim and review tasks like reviewers
   - Provide feedback and mark as eligible
4. **Users Tab**:
   - Approve pending reviewers
   - View all user accounts
5. **Leaderboard Tab**:
   - View top contributors by eligible and approved tasks
6. **Profile**: View total reviews, tasks claimed, and eligible tasks marked

## Deployment to Vercel

### 1. Push to GitHub

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Add environment variables in Vercel dashboard:
   - `DATABASE_URL` (from Neon)
   - `JWT_SECRET` (generate a new long random string)
   - `SUPABASE_URL` (from Supabase project)
   - `SUPABASE_SERVICE_KEY` (from Supabase project)
   - `NEXT_PUBLIC_APP_URL` (your Vercel URL, e.g., `https://your-app.vercel.app`)
4. Deploy!

### 3. Run Database Migration on Production

After deployment, run:

```bash
npx prisma db push
```

Then seed the admin user:

```bash
npm run db:seed
```

## Project Structure

```
AdzzatXperts/
├── app/                      # Next.js app directory
│   ├── api/                  # API routes
│   │   ├── auth/            # Authentication endpoints
│   │   ├── submissions/     # Submission management
│   │   └── admin/           # Admin endpoints
│   ├── contributor/         # Contributor dashboard
│   ├── reviewer/            # Reviewer dashboard
│   ├── admin/               # Admin dashboard
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Landing/auth page
│   └── globals.css          # Global styles
├── lib/                     # Utility libraries
│   ├── prisma.ts           # Prisma client
│   ├── auth.ts             # Auth utilities
│   └── r2.ts               # R2 storage utilities
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── seed.ts             # Seed script
├── types/                   # TypeScript types
├── middleware.ts           # Next.js middleware
└── package.json
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/signin` - Sign in
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Submissions
- `POST /api/submissions/upload` - Upload task (Contributor)
- `GET /api/submissions/list` - List submissions with status filtering (role-based)
- `POST /api/submissions/claim` - Claim task (Reviewer/Admin)
- `POST /api/submissions/feedback` - Submit feedback with optional account field (Reviewer/Admin)
- `POST /api/submissions/approve` - Approve task (Admin)
- `GET /api/submissions/download` - Download submission file (Reviewer/Admin) (NEW)
- `GET /api/submissions/next-task` - Get next task for fair distribution (Reviewer/Admin) (NEW)

### Profile
- `GET /api/profile` - Get user profile with role-based statistics (NEW)
- `POST /api/profile/update` - Update name and password (NEW)

### Admin
- `GET /api/admin/users` - List all users
- `POST /api/admin/approve-reviewer` - Approve reviewer
- `GET /api/admin/leaderboard` - Get leaderboard

## Database Schema

### User
- id, email, password, name, role, isApproved, timestamps
- Relations: submissions (contributor), claimedSubmissions (reviewer), reviews

### Submission
- id, title, domain, language, fileUrl, fileName, status, contributorId, claimedById, timestamps
- **claimedById**: Tracks which reviewer/admin claimed the task (NEW)

### Review
- id, feedback, accountPostedIn, submissionId, reviewerId, timestamps
- **accountPostedIn**: Optional field for where content was posted, visible only to admins (NEW)

## Status Flow

```
PENDING (Gray)
   ↓ (Reviewer claims)
CLAIMED (Yellow)
   ↓ (Reviewer marks eligible)
ELIGIBLE (Blue)
   ↓ (Admin approves)
APPROVED (Green)
```

## Free Tier Limits

- **Neon PostgreSQL**: 10GB storage, 1 project - NO CREDIT CARD
- **Supabase Storage**: 1GB storage, 2GB bandwidth/month - NO CREDIT CARD
- **Vercel**: 100GB bandwidth, unlimited deployments

**This setup easily handles 500+ users without any payment!**

For growth beyond 500 users, you can upgrade Supabase Storage to 100GB for just $25/month.

## Troubleshooting

### Database Connection Issues
- Verify your `DATABASE_URL` in `.env`
- Ensure your IP is allowed in Neon dashboard

### File Upload Issues
- Check `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are correct in `.env.local`
- Verify you're using the `service_role` key, NOT the `anon` public key
- Ensure bucket name is `submissions` (lowercase)
- Check bucket exists in Supabase Storage dashboard
- Verify Supabase project is active (not paused)

### Build Errors
- Run `npm run postinstall` to generate Prisma client
- Clear `.next` folder and rebuild

## License

ISC

## Support

For issues, please create a GitHub issue or contact the development team.

---

Built with ❤️ for AdzzatXperts