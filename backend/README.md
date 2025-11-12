# AdzzatXperts Backend (Go API)

A high-performance REST API backend built with Go, Gin framework, and PostgreSQL.

## Features

- ✅ JWT Authentication
- ✅ Role-based access control (Admin, Reviewer, Contributor)
- ✅ File upload/download with Supabase Storage
- ✅ Auto-assignment system with fair distribution
- ✅ Activity logging
- ✅ Comprehensive admin statistics
- ✅ Search functionality
- ✅ **Role switching** (Admin can change user roles)
- ✅ RESTful API design

## Tech Stack

- **Go 1.21+**
- **Gin** - Web framework
- **GORM** - ORM for PostgreSQL
- **JWT** - Authentication
- **Supabase** - File storage
- **PostgreSQL** - Database (Neon)

## Project Structure

```
backend/
├── cmd/
│   └── api/
│       └── main.go           # Application entry point
├── internal/
│   ├── models/               # Database models
│   ├── handlers/             # HTTP handlers (controllers)
│   ├── services/             # Business logic
│   ├── middleware/           # Auth, CORS middleware
│   ├── database/             # DB connection
│   ├── storage/              # File storage (Supabase)
│   └── utils/                # Utilities (JWT, hashing)
├── Dockerfile
├── go.mod
└── .env.example
```

## Prerequisites

- Go 1.21 or higher
- PostgreSQL database (Neon recommended)
- Supabase account for file storage

## Setup

### 1. Install Go

Download from [golang.org](https://golang.org/dl/)

Verify installation:
```bash
go version
```

### 2. Clone and Navigate

```bash
cd backend
```

### 3. Install Dependencies

```bash
go mod download
```

### 4. Configure Environment

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` with your values:
```env
DATABASE_URL=postgresql://user:pass@host:5432/dbname?sslmode=require
JWT_SECRET=your-long-secret-key-min-32-chars
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
PORT=8080
CORS_ORIGINS=http://localhost:3000
```

### 5. Run the Server

```bash
go run cmd/api/main.go
```

The server will start on `http://localhost:8080`

You should see:
```
✓ Database connected successfully
✓ Database migrations completed
✓ Routes configured
🚀 Server starting on port 8080
```

## API Endpoints

### Authentication

```
POST   /api/auth/signup       Register new user
POST   /api/auth/signin       Login
POST   /api/auth/logout       Logout
GET    /api/auth/me           Get current user
```

### Profile

```
GET    /api/profile           Get user profile with stats
PUT    /api/profile           Update profile (name/password)
```

### Submissions

```
POST   /api/submissions                Upload submission
GET    /api/submissions                List submissions (with filters)
GET    /api/submissions/:id            Get submission details
DELETE /api/submissions/:id            Delete submission
GET    /api/submissions/:id/download   Get download URL
POST   /api/submissions/:id/feedback   Submit feedback
PUT    /api/submissions/:id/approve    Approve submission (Admin)
```

Query parameters for list:
- `status` - Filter by status (all, pending, claimed, eligible, approved)
- `search` - Search by title, domain, or language

### Admin (Admin only)

```
GET    /api/users                      List all users
PUT    /api/users/:id/approve          Approve reviewer
PUT    /api/users/:id/role             Switch user role ⭐ NEW
DELETE /api/users/:id                  Delete user
GET    /api/logs                       Get activity logs
GET    /api/stats                      Get platform statistics
GET    /api/leaderboard                Get leaderboard
```

## Development

### Run with hot reload (Air)

Install Air:
```bash
go install github.com/cosmtrek/air@latest
```

Run:
```bash
air
```

### Run tests

```bash
go test ./...
```

### Build for production

```bash
go build -o server cmd/api/main.go
./server
```

## Docker

### Build image

```bash
docker build -t adzzatxperts-backend .
```

### Run container

```bash
docker run -p 8080:8080 --env-file .env adzzatxperts-backend
```

## Deployment

### Railway

1. Install Railway CLI:
```bash
npm install -g @railway/cli
```

2. Login and initialize:
```bash
railway login
railway init
```

3. Add environment variables in Railway dashboard

4. Deploy:
```bash
railway up
```

### Render

1. Create new Web Service on Render
2. Connect your GitHub repository
3. Set build command: `go build -o server cmd/api/main.go`
4. Set start command: `./server`
5. Add environment variables
6. Deploy

### Fly.io

1. Install flyctl
2. Run: `fly launch`
3. Configure fly.toml
4. Run: `fly deploy`

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://...` |
| `JWT_SECRET` | Secret key for JWT signing | `min-32-chars-long` |
| `SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Supabase service role key | `eyJhbGc...` |
| `PORT` | Server port | `8080` |
| `CORS_ORIGINS` | Allowed origins (comma-separated) | `http://localhost:3000` |

## Database Migrations

Migrations run automatically on startup using GORM AutoMigrate.

To run manually:
```go
database.Connect()
database.AutoMigrate()
```

## Authentication Flow

1. User signs up/signs in → JWT token returned
2. Client stores token (localStorage or cookie)
3. Client sends token in Authorization header: `Bearer <token>`
4. Middleware validates token and extracts user info
5. Protected endpoints check user role

## Auto-Assignment Logic

When a contributor uploads a task:
1. Find all approved reviewers
2. Count active tasks for each reviewer
3. Assign to reviewer with fewest tasks
4. Update task status to CLAIMED
5. Log the assignment

This ensures fair workload distribution.

## Activity Logging

All major actions are logged:
- SIGNUP - User registration
- UPLOAD - Task uploaded
- AUTO_ASSIGN - Task auto-assigned
- REVIEW - Feedback submitted
- APPROVE - Task approved
- DELETE - Submission deleted
- DELETE_USER - User account deleted
- SWITCH_ROLE - User role changed ⭐ NEW
- APPROVE_REVIEWER - Reviewer approved

Logs are stored in the `activity_logs` table and can be viewed by admins.

## API Response Format

### Success Response
```json
{
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "error": "Error message"
}
```

## Performance

- Go's concurrency model handles many requests efficiently
- Database queries are optimized with indexes
- File downloads use signed URLs (no proxy overhead)
- Middleware caching where appropriate

## Security

- Passwords hashed with bcrypt
- JWT tokens with expiration
- Role-based access control
- Input validation on all endpoints
- SQL injection prevention (GORM parameterized queries)
- File upload validation
- CORS properly configured

## Troubleshooting

### Database connection fails
- Check DATABASE_URL format
- Ensure database is accessible
- Verify SSL mode if using cloud database

### File upload/download fails
- Verify SUPABASE_URL and SUPABASE_SERVICE_KEY
- Check Supabase bucket "submissions" exists
- Ensure bucket has correct permissions

### JWT token invalid
- Check JWT_SECRET is set
- Ensure token hasn't expired
- Verify Authorization header format

### CORS errors
- Add frontend URL to CORS_ORIGINS
- Check header format (comma-separated)

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Run tests
5. Submit pull request

## License

ISC

---

**Built with ❤️ using Go and Gin**
