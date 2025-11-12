# Platform Rebuild: Next.js + Go Architecture

## 🏗️ Architecture Overview

### Tech Stack
**Frontend:**
- Next.js 14 (Client-side only, no API routes)
- TypeScript
- Tailwind CSS
- Axios for API calls
- React Query for data fetching

**Backend:**
- Go 1.21+
- Gin Web Framework (fast, lightweight)
- GORM (Go ORM for PostgreSQL)
- JWT for authentication
- AWS SDK / Supabase Go client for file storage

**Database:**
- PostgreSQL (Neon)

**Storage:**
- Supabase Storage

**Deployment:**
- Backend: Railway, Render, or Fly.io
- Frontend: Vercel or Netlify
- Docker containerization

---

## 📋 Complete Feature List

### User Management
1. ✅ Three roles: Admin, Reviewer, Contributor
2. ✅ JWT authentication
3. ✅ Admin approval for reviewers
4. ✅ Profile management (view stats, edit name/password)
5. ✅ Admin can delete users (contributors/reviewers)
6. ✅ **Admin can switch user roles** (NEW)

### Submission System
1. ✅ Upload ZIP files (max 10MB)
2. ✅ Domain selection (7 options)
3. ✅ Language selection (11 + Other)
4. ✅ Auto-assignment to reviewers (fair distribution)
5. ✅ Status tracking (PENDING → CLAIMED → ELIGIBLE → APPROVED)
6. ✅ Color-coded status indicators
7. ✅ Delete submissions (contributors own, admins any)
8. ✅ Download files (signed URLs)
9. ✅ Search by title/domain/language
10. ✅ Status tabs (All/Pending/Claimed/Eligible/Approved)

### Review System
1. ✅ Automatic task assignment (no claim button)
2. ✅ Fair workload distribution
3. ✅ Feedback submission
4. ✅ "Account Posted In" field (admin-only visibility)
5. ✅ Mark as eligible
6. ✅ Reviewers see only assigned tasks

### Admin Features
1. ✅ Approve reviewers
2. ✅ Approve eligible tasks
3. ✅ View activity logs
4. ✅ Comprehensive stats dashboard
5. ✅ See task assignments
6. ✅ Delete users and submissions
7. ✅ **Switch user roles** (NEW)
8. ✅ Admin can review tasks
9. ✅ Leaderboard

### UI/UX
1. ✅ Modern gradient designs
2. ✅ Search bars on all dashboards
3. ✅ Delete buttons with confirmations
4. ✅ Auto-refresh (every 30 seconds)
5. ✅ Loading states and animations
6. ✅ Toast notifications
7. ✅ Responsive design

---

## 🗂️ Project Structure

```
adzzatxperts/
├── backend/                    # Go backend
│   ├── cmd/
│   │   └── api/
│   │       └── main.go        # Entry point
│   ├── internal/
│   │   ├── models/            # Database models
│   │   ├── handlers/          # HTTP handlers (controllers)
│   │   ├── services/          # Business logic
│   │   ├── middleware/        # Auth, CORS, logging
│   │   ├── database/          # DB connection
│   │   ├── storage/           # File storage (Supabase)
│   │   └── utils/             # Helpers
│   ├── migrations/            # SQL migrations
│   ├── go.mod
│   ├── go.sum
│   ├── Dockerfile
│   └── .env.example
│
├── frontend/                   # Next.js frontend
│   ├── src/
│   │   ├── app/               # Next.js 14 app directory
│   │   ├── components/        # React components
│   │   ├── hooks/             # Custom React hooks
│   │   ├── lib/               # Utilities
│   │   ├── services/          # API client
│   │   └── types/             # TypeScript types
│   ├── public/
│   ├── package.json
│   └── .env.local.example
│
├── docker-compose.yml         # Local development
├── README.md
└── DEPLOYMENT.md
```

---

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/signup` - Register user
- `POST /api/auth/signin` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users` - List users (admin only)
- `GET /api/users/:id` - Get user details
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (admin only)
- `PUT /api/users/:id/role` - Change user role (admin only) **NEW**
- `PUT /api/users/:id/approve` - Approve reviewer (admin only)

### Profile
- `GET /api/profile` - Get current user profile with stats
- `PUT /api/profile` - Update profile (name/password)

### Submissions
- `POST /api/submissions` - Upload submission
- `GET /api/submissions` - List submissions (with filters)
- `GET /api/submissions/:id` - Get submission details
- `DELETE /api/submissions/:id` - Delete submission
- `GET /api/submissions/:id/download` - Get download URL
- `POST /api/submissions/:id/feedback` - Submit feedback
- `PUT /api/submissions/:id/approve` - Approve submission (admin)

### Activity Logs
- `GET /api/logs` - Get activity logs (admin only)

### Stats
- `GET /api/stats` - Get platform statistics (admin only)
- `GET /api/stats/leaderboard` - Get leaderboard

### Auto-Assignment
- Auto-assignment happens automatically on upload
- `POST /api/admin/reassign-all` - Manually trigger reassignment (admin)

---

## 🔐 Authentication Flow

1. User signs up → JWT token issued
2. Frontend stores JWT in httpOnly cookie
3. Every request includes JWT in Authorization header
4. Backend middleware validates JWT
5. Protected routes check user role

---

## 📊 Database Schema

### users
```sql
id              UUID PRIMARY KEY
email           VARCHAR UNIQUE NOT NULL
password_hash   VARCHAR NOT NULL
name            VARCHAR NOT NULL
role            VARCHAR NOT NULL (ADMIN, REVIEWER, CONTRIBUTOR)
is_approved     BOOLEAN DEFAULT FALSE
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

### submissions
```sql
id              UUID PRIMARY KEY
title           VARCHAR NOT NULL
domain          VARCHAR NOT NULL
language        VARCHAR NOT NULL
file_url        VARCHAR NOT NULL
file_name       VARCHAR NOT NULL
status          VARCHAR NOT NULL (PENDING, CLAIMED, ELIGIBLE, APPROVED)
claimed_by_id   UUID (FK to users)
assigned_at     TIMESTAMP
contributor_id  UUID NOT NULL (FK to users)
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

### reviews
```sql
id                  UUID PRIMARY KEY
feedback            TEXT NOT NULL
account_posted_in   VARCHAR
submission_id       UUID NOT NULL (FK to submissions, CASCADE)
reviewer_id         UUID NOT NULL (FK to users)
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

### activity_logs
```sql
id              UUID PRIMARY KEY
action          VARCHAR NOT NULL
description     TEXT NOT NULL
user_id         UUID (FK to users)
user_name       VARCHAR
user_role       VARCHAR
target_id       UUID
target_type     VARCHAR
metadata        JSONB
created_at      TIMESTAMP
```

---

## 🚀 Development Workflow

### Backend Setup
```bash
cd backend
go mod init github.com/yourusername/adzzatxperts-backend
go get -u github.com/gin-gonic/gin
go get -u gorm.io/gorm
go get -u gorm.io/driver/postgres
go get -u github.com/golang-jwt/jwt/v5
go get -u github.com/supabase-community/storage-go
go run cmd/api/main.go
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Database Migration
```bash
# Go will use GORM auto-migration or custom SQL migrations
# Run migrations on startup
```

---

## 🎯 Implementation Plan

### Phase 1: Backend Core (Day 1-2)
1. Project setup and structure
2. Database models (GORM)
3. Authentication (JWT)
4. User CRUD operations
5. Role switching endpoint **NEW**

### Phase 2: Backend Features (Day 3-4)
1. Submission upload with Supabase
2. Auto-assignment logic
3. Review system
4. Activity logging
5. Search functionality
6. Delete operations

### Phase 3: Backend Admin (Day 5)
1. Admin stats API
2. Activity logs API
3. User management
4. Leaderboard

### Phase 4: Frontend Core (Day 6-7)
1. Authentication pages
2. API client setup (Axios)
3. Protected routes
4. Dashboard layouts

### Phase 5: Frontend Features (Day 8-9)
1. Contributor dashboard
2. Reviewer dashboard
3. Admin dashboard
4. Profile pages
5. Search functionality
6. Delete confirmations

### Phase 6: UI/UX Polish (Day 10)
1. Modern design implementation
2. Auto-refresh
3. Animations
4. Error handling
5. Loading states

### Phase 7: Deployment (Day 11)
1. Docker setup
2. Backend deployment (Railway/Render)
3. Frontend deployment (Vercel)
4. Environment configuration
5. Testing

---

## 🔄 Migration Strategy

### Data Migration (if needed)
1. Export existing data from current database
2. Transform data format if needed
3. Import into new PostgreSQL instance
4. Verify data integrity

### Zero-Downtime Approach
1. Deploy new backend separately
2. Test thoroughly
3. Deploy new frontend
4. Switch DNS/routing
5. Deprecate old system

---

## 📦 Deployment Architecture

```
┌─────────────────┐
│  User Browser   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Next.js        │  ← Vercel/Netlify
│  (Frontend)     │
└────────┬────────┘
         │ HTTPS/API
         ▼
┌─────────────────┐
│  Go API Server  │  ← Railway/Render/Fly.io
│  (Backend)      │
└────┬────┬───────┘
     │    │
     │    └──────────┐
     ▼               ▼
┌─────────┐    ┌──────────────┐
│  Neon   │    │  Supabase    │
│  (DB)   │    │  (Storage)   │
└─────────┘    └──────────────┘
```

---

## ✅ Benefits of New Architecture

1. **Separation of Concerns** - Frontend and backend fully decoupled
2. **Better Performance** - Go is faster than Node.js
3. **Scalability** - Can scale frontend and backend independently
4. **Type Safety** - Go's strong typing + TypeScript
5. **Easier Deployment** - Containerized Go backend
6. **Better Error Handling** - Go's explicit error handling
7. **Concurrent Operations** - Go's goroutines for async tasks
8. **Industry Standard** - Microservices architecture

---

## 🎨 Frontend Features

### Modern UI Components
- Gradient backgrounds per role
- Smooth page transitions
- Skeleton loaders
- Toast notifications (react-hot-toast)
- Modal dialogs
- Search with debounce
- Auto-refresh with React Query
- Status badges
- Action buttons with icons

### State Management
- React Query for server state
- Context API for auth state
- Local storage for user preferences

---

## 🔧 Environment Variables

### Backend (.env)
```env
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
SUPABASE_URL=https://...
SUPABASE_SERVICE_KEY=...
PORT=8080
CORS_ORIGINS=http://localhost:3000,https://your-frontend.vercel.app
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8080
# or in production
NEXT_PUBLIC_API_URL=https://your-api.railway.app
```

---

## 📝 Next Steps

1. ✅ Review architecture plan
2. Start building Go backend
3. Implement all features systematically
4. Build Next.js frontend
5. Test thoroughly
6. Deploy

---

**Ready to start building?** Let's begin with the Go backend setup! 🚀
