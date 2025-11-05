# AdzzatXperts - Task Submission & Review Platform

A scalable web platform for task submission and review, supporting up to 500+ users with three user types: Admin, Reviewer, and Contributor.

## Features

### User Roles
- **Contributors**: Upload tasks, view submissions, and receive feedback
- **Reviewers**: Review tasks, provide feedback, mark eligible submissions (requires admin approval)
- **Admins**: Approve reviewers, approve eligible tasks, manage users, view leaderboard

### Key Functionality
- **File Upload**: Contributors can upload ZIP files with domain and language metadata
- **Review System**: Reviewers can claim and review tasks
- **Status Tracking**: Visual color-coded status system (Pending → Claimed → Eligible/Blue → Approved/Green)
- **Leaderboard**: Track top contributors by eligible and approved tasks
- **User Management**: Admin panel for managing users and approvals

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (Serverless)
- **Database**: PostgreSQL (via Neon - free tier)
- **ORM**: Prisma
- **File Storage**: Cloudflare R2 (10GB free)
- **Authentication**: JWT + HTTP-only cookies
- **Deployment**: Vercel

## Prerequisites

- Node.js 18+ and npm
- A Neon PostgreSQL database (free at [neon.tech](https://neon.tech))
- Cloudflare R2 storage (free at [cloudflare.com](https://dash.cloudflare.com))

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

### 3. Cloudflare R2 Setup

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to R2 Object Storage
3. Create a new bucket (e.g., `adzzat-submissions`)
4. Go to "Manage R2 API Tokens" and create a new API token
5. Copy:
   - Account ID
   - Access Key ID
   - Secret Access Key
   - Your bucket name
   - Public URL (if you set up a public domain)

### 4. Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Database (from Neon)
DATABASE_URL="postgresql://username:password@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require"

# JWT Secret (generate a random string)
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# Cloudflare R2 Storage
R2_ACCOUNT_ID="your-cloudflare-account-id"
R2_ACCESS_KEY_ID="your-r2-access-key"
R2_SECRET_ACCESS_KEY="your-r2-secret-key"
R2_BUCKET_NAME="adzzat-submissions"
R2_PUBLIC_URL="https://your-bucket.r2.dev"  # Optional

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

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

## Usage Guide

### For Contributors

1. Sign up with role "Contributor"
2. Automatically approved and redirected to dashboard
3. Click "Upload New Task"
4. Fill in:
   - Task title
   - Domain (e.g., "Web Development")
   - Language (e.g., "JavaScript")
   - Upload ZIP file
5. View submissions and feedback on homepage
6. Blue background = Eligible for admin approval
7. Green background = Approved by admin

### For Reviewers

1. Sign up with role "Reviewer"
2. Wait for admin approval
3. After approval, sign in
4. See all pending and claimed tasks
5. Click "Claim Task" to review
6. Provide feedback
7. Check "Mark as Eligible" to send to admin for approval

### For Admins

1. Sign in with admin credentials
2. **Submissions Tab**: View and approve eligible (blue) tasks
3. **Users Tab**: Approve pending reviewers
4. **Leaderboard Tab**: View top contributors

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
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `R2_ACCOUNT_ID`
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`
   - `R2_BUCKET_NAME`
   - `R2_PUBLIC_URL`
   - `NEXT_PUBLIC_APP_URL` (your Vercel URL)
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
- `GET /api/submissions/list` - List submissions (role-based)
- `POST /api/submissions/claim` - Claim task (Reviewer)
- `POST /api/submissions/feedback` - Submit feedback (Reviewer)
- `POST /api/submissions/approve` - Approve task (Admin)

### Admin
- `GET /api/admin/users` - List all users
- `POST /api/admin/approve-reviewer` - Approve reviewer
- `GET /api/admin/leaderboard` - Get leaderboard

## Database Schema

### User
- id, email, password, name, role, isApproved, timestamps

### Submission
- id, title, domain, language, fileUrl, fileName, status, contributorId, timestamps

### Review
- id, feedback, submissionId, reviewerId, timestamps

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

- **Neon PostgreSQL**: 10GB storage, 1 project
- **Cloudflare R2**: 10GB storage, 10 million read requests/month
- **Vercel**: 100GB bandwidth, unlimited deployments

This setup easily handles 500+ users!

## Troubleshooting

### Database Connection Issues
- Verify your `DATABASE_URL` in `.env`
- Ensure your IP is allowed in Neon dashboard

### File Upload Issues
- Check R2 credentials are correct
- Verify bucket name matches
- Ensure CORS is configured in R2 if needed

### Build Errors
- Run `npm run postinstall` to generate Prisma client
- Clear `.next` folder and rebuild

## License

ISC

## Support

For issues, please create a GitHub issue or contact the development team.

---

Built with ❤️ for AdzzatXperts