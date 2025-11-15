# AdzzatXperts - Task Submission & Review Platform

A scalable web platform for managing task submissions and reviews with three user roles: Contributors, Reviewers, and Admins.

## 🏗️ Architecture

**Frontend**: Next.js 14 (React, TypeScript, Tailwind CSS)
**Backend**: Go (Gin framework, GORM)
**Database**: PostgreSQL (Neon)
**Storage**: Supabase Storage
**Authentication**: JWT tokens

---

## ✨ Features

### For Contributors
- ✅ Upload ZIP files with domain and language selection
- ✅ Track submission status (Pending → Claimed → Eligible → Approved)
- ✅ View reviewer feedback
- ✅ **Delete submissions** (PENDING, CLAIMED, ELIGIBLE - not APPROVED)
- ✅ Search submissions by title, domain, or language
- ✅ Auto-refresh dashboard every 30 seconds
- ✅ View submission statistics

### For Reviewers
- ✅ **Auto-assigned tasks** (fair distribution algorithm)
- ✅ **Three dashboard tabs**: Claimed, Eligible, Reviewed
- ✅ **Reviewed tab** shows all tasks you've given feedback on
- ✅ Download submission files
- ✅ Submit detailed feedback
- ✅ Mark submissions as eligible
- ✅ Search tasks across all tabs
- ✅ Auto-refresh dashboard
- ✅ View review statistics
- ✅ **Requires admin approval** to start reviewing

### For Admins
- ✅ **5 comprehensive dashboard tabs**:
  - **Submissions**: View, approve, delete, **manually claim** any submission
  - **Users**: Manage users, approve reviewers, **toggle green light**, **switch roles**, delete accounts
  - **Stats**: Platform overview, contributor stats, reviewer workload
  - **Logs**: Activity log viewer (recent 50 actions)
  - **Leaderboard**: Top contributors ranking
- ✅ **Manual task claiming** - Admins excluded from auto-assignment, can claim tasks manually
- ✅ **Green light toggle** - Activate/deactivate reviewers, triggers fair task redistribution
- ✅ **Fair task redistribution** - When reviewers are activated, all tasks redistributed evenly
- ✅ Search functionality across all tabs
- ✅ Delete users with cascade warnings
- ✅ **Role switching** capability
- ✅ Comprehensive statistics and analytics
- ✅ Auto-refresh

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ (for frontend)
- **Go** 1.21+ (for backend)
- **PostgreSQL** database (Neon recommended)
- **Supabase** account (for file storage)

### 1. Clone Repository
```bash
git clone https://github.com/your-username/AdzzatXperts.git
cd AdzzatXperts
```

### 2. Setup Backend
```bash
cd backend

# Create .env file
cp .env.example .env

# Edit .env with your credentials:
# - DATABASE_URL (PostgreSQL connection string)
# - JWT_SECRET (min 32 characters)
# - SUPABASE_URL and SUPABASE_SERVICE_KEY
# - PORT=8080
# - CORS_ORIGINS=http://localhost:3000

# Install dependencies
go mod download

# Run backend
go run cmd/api/main.go
```

Backend will start on `http://localhost:8080`

### 3. Setup Frontend
```bash
# In root directory
npm install

# Create .env.local
cp .env.local.example .env.local

# Edit .env.local:
# NEXT_PUBLIC_API_URL=http://localhost:8080/api

# Run frontend
npm run dev
```

Frontend will start on `http://localhost:3000`

### 4. Create Supabase Bucket
1. Go to your Supabase project
2. Navigate to Storage
3. Create a bucket named `submissions`
4. Set bucket to public or configure policies

### 5. Test the Application
1. Open `http://localhost:3000`
2. Sign up as a contributor
3. Sign up as a reviewer (will need approval)
4. Sign up as an admin (first user can be made admin via database)

---

## 📁 Project Structure

```
AdzzatXperts/
├── app/                    # Next.js pages (frontend)
│   ├── admin/             # Admin dashboard
│   ├── contributor/       # Contributor dashboard
│   ├── reviewer/          # Reviewer dashboard
│   ├── profile/           # User profile page
│   ├── page.tsx           # Landing/auth page
│   └── layout.tsx         # Root layout
├── lib/                   # Frontend utilities
│   ├── api-client.ts      # Axios API client
│   ├── auth-context.tsx   # Auth provider
│   └── constants/         # App constants
├── backend/               # Go backend
│   ├── cmd/api/          # Main entry point
│   ├── internal/
│   │   ├── handlers/     # HTTP handlers
│   │   ├── services/     # Business logic
│   │   ├── models/       # Database models
│   │   ├── middleware/   # Auth & CORS
│   │   ├── database/     # DB connection
│   │   ├── utils/        # JWT & password utilities
│   │   └── storage/      # File storage
│   ├── go.mod            # Go dependencies
│   ├── Dockerfile        # Container build
│   └── README.md         # Backend documentation
├── components/            # Reusable React components
├── types/                 # TypeScript type definitions
├── .env.local.example     # Frontend environment template
└── README.md              # This file
```

---

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/signin` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Profile
- `GET /api/profile` - Get user profile with stats
- `PUT /api/profile` - Update name/password

### Submissions
- `POST /api/submissions` - Upload submission (FormData)
- `GET /api/submissions` - List submissions (with search/filter)
- `GET /api/submissions/reviewed` - Get reviewed submissions (reviewer/admin) ⭐
- `GET /api/submissions/:id` - Get single submission
- `DELETE /api/submissions/:id` - Delete submission (contributor: non-approved only)
- `GET /api/submissions/:id/download` - Get download URL
- `POST /api/submissions/:id/feedback` - Submit review
- `PUT /api/submissions/:id/approve` - Approve (admin only)
- `PUT /api/submissions/:id/claim` - Manually claim task (admin only) ⭐

### Admin
- `GET /api/users` - List all users
- `PUT /api/users/:id/approve` - Approve reviewer
- `PUT /api/users/:id/greenlight` - Toggle reviewer active status (triggers redistribution) ⭐
- `PUT /api/users/:id/role` - Switch user role ⭐
- `DELETE /api/users/:id` - Delete user
- `GET /api/logs` - Get activity logs ⭐
- `GET /api/stats` - Get platform statistics ⭐
- `GET /api/leaderboard` - Get top contributors

**Full API documentation**: See `backend/README.md`

---

## 🎨 Tech Stack

### Frontend
- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **React Hooks** - State management

### Backend
- **Go 1.21+** - Programming language
- **Gin** - Web framework
- **GORM** - ORM for PostgreSQL
- **golang-jwt/jwt/v5** - JWT authentication
- **bcrypt** - Password hashing
- **Supabase Storage Go** - File storage client

### Database & Storage
- **PostgreSQL** - Main database (Neon)
- **Supabase Storage** - File storage for ZIP uploads

---

## 🔒 Security Features

- **JWT Authentication** - Secure token-based auth
- **Password Hashing** - Bcrypt with cost factor 14
- **Role-Based Access Control** - Middleware enforces permissions
- **CORS Protection** - Configurable allowed origins
- **SQL Injection Prevention** - GORM parameterized queries
- **XSS Protection** - React auto-escaping
- **File Upload Validation** - ZIP files only

---

## 📊 Key Features

### Auto-Assignment & Redistribution System
- **Auto-Assignment**: Tasks are automatically assigned to active reviewers with the fewest tasks
- **Admins Excluded**: Admins are not auto-assigned; they must manually claim tasks
- **Fair Redistribution**: When reviewers are activated/deactivated (green light toggle), all tasks are redistributed evenly among active reviewers
- **Queue Management**: When no reviewers are active, tasks remain in PENDING status and are visible to admins
- **Load Balancing**: Round-robin distribution ensures balanced workload across all active reviewers

### Activity Logging
All platform actions are logged for admin oversight:
- User signups
- Submissions uploaded
- Reviews submitted
- Approvals granted
- Role changes
- Deletions
- Task redistribution (when reviewers activated)
- Manual task claims (admin)

### Comprehensive Statistics
Admins can view:
- Platform overview (total users, submissions, pending reviews)
- Contributor stats (approval rates, totals)
- Reviewer stats (workload, tasks reviewed)

### Role Switching
Admins can dynamically change user roles:
- CONTRIBUTOR ↔ REVIEWER ↔ ADMIN
- Auto-approval logic for contributors
- Reset approval when switching to reviewer

---

## 🚀 Deployment

### Backend Deployment (Railway/Render)

**Railway**:
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

**Render**:
1. Create new Web Service
2. Connect GitHub repository
3. Set build command: `go build -o server cmd/api/main.go`
4. Set start command: `./server`
5. Add environment variables

### Frontend Deployment (Vercel/Netlify)

**Vercel**:
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel
```

**Netlify**:
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy
```

**Important**: Set `NEXT_PUBLIC_API_URL` to your backend URL (must include `https://` protocol)

---

## 📝 Environment Variables

### Frontend (`.env.local`)
```env
# Local development
NEXT_PUBLIC_API_URL=http://localhost:8080/api

# Production (example)
# NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api
```

### Backend (`backend/.env`)
```env
DATABASE_URL=postgresql://user:pass@host:5432/dbname
JWT_SECRET=your-secret-key-min-32-characters
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
PORT=8080
CORS_ORIGINS=http://localhost:3000
```

---

## 🧪 Testing

### Manual Testing Checklist
- [ ] Sign up as contributor
- [ ] Upload submission
- [ ] Sign up as reviewer
- [ ] Admin approves reviewer
- [ ] Reviewer sees auto-assigned task
- [ ] Reviewer submits feedback (appears in "Reviewed" tab)
- [ ] Reviewer marks as eligible
- [ ] Admin approves submission
- [ ] Test delete functionality (contributor can delete PENDING/CLAIMED/ELIGIBLE, not APPROVED)
- [ ] Test search functionality
- [ ] Test green light toggle (tasks redistribute fairly)
- [ ] Test admin manual claim
- [ ] Test role switching (admin)
- [ ] View activity logs (admin)
- [ ] View statistics (admin)
- [ ] Check reviewer "Reviewed" tab

---

## 📚 Documentation

- **`backend/README.md`** - Complete backend documentation
- **`SETUP-AND-DEPLOYMENT-GUIDE.md`** - Detailed setup and deployment instructions
- **`BACKEND_SECURITY_GUIDE.md`** - Security best practices and guidelines
- **`BACKEND_HEALTH_CHECK.md`** - Health check and monitoring guide

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 👥 Support

For issues or questions:
- Open an issue on GitHub
- Check existing documentation
- Review activity logs for errors

---

## 🎯 Roadmap

### Future Enhancements
- [ ] Email notifications
- [ ] Password reset flow
- [ ] User avatars
- [ ] File preview
- [ ] Advanced filtering and sorting
- [ ] Data export (CSV/PDF)
- [ ] Mobile app
- [ ] Real-time notifications (WebSocket)
- [ ] Bulk operations
- [ ] Advanced analytics dashboard

---

**Built with ❤️ using Go, Next.js, and modern web technologies**

**Version**: 2.1.0 (Enhanced Task Management & Fair Distribution)
**Last Updated**: November 2025
