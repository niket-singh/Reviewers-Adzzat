# Backend Security & Feature Implementation Guide

This document outlines critical security improvements and features that need to be implemented on the backend API.

## 🔒 Critical Security Implementations

### 1. File Upload Security

#### File Type Validation
```typescript
// Implement on backend
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
  'text/plain',
]

const ALLOWED_EXTENSIONS = ['.pdf', '.zip', '.doc', '.docx', '.png', '.jpg', '.jpeg', '.txt']

function validateFileUpload(file) {
  // Check file size (10MB max)
  const MAX_SIZE = 10 * 1024 * 1024
  if (file.size > MAX_SIZE) {
    throw new Error('File size exceeds 10MB limit')
  }

  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw new Error('File type not allowed')
  }

  // Validate extension
  const ext = path.extname(file.originalname).toLowerCase()
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error('File extension not allowed')
  }

  // Check for path traversal
  if (file.originalname.includes('..') || file.originalname.includes('/')) {
    throw new Error('Invalid filename')
  }

  return true
}
```

#### Virus Scanning
```typescript
// Use ClamAV or similar
import clamav from 'clamav.js'

async function scanFile(filePath) {
  const { is_infected, viruses } = await clamav.scan_file(filePath)

  if (is_infected) {
    // Delete file and log incident
    await fs.unlink(filePath)
    await logSecurityEvent({
      type: 'MALWARE_DETECTED',
      file: filePath,
      viruses,
      timestamp: new Date(),
    })
    throw new Error('File contains malware')
  }
}
```

#### Safe File Storage
```typescript
// Generate safe filenames
import crypto from 'crypto'

function generateSafeFilename(originalName) {
  const ext = path.extname(originalName)
  const hash = crypto.randomBytes(16).toString('hex')
  const timestamp = Date.now()
  return `${timestamp}-${hash}${ext}`
}

// Store files outside web root
const UPLOAD_DIR = '/var/app/uploads' // Not in public directory
```

### 2. Input Validation & Sanitization

#### Zod Schema Validation
```typescript
import { z } from 'zod'

const submissionSchema = z.object({
  title: z.string().min(3).max(200),
  domain: z.string().min(2).max(50),
  language: z.string().min(2).max(50),
})

// In route handler
app.post('/submissions', async (req, res) => {
  try {
    const validatedData = submissionSchema.parse(req.body)
    // Process validated data
  } catch (error) {
    return res.status(400).json({ error: 'Invalid input data' })
  }
})
```

#### SQL/NoSQL Injection Prevention
```typescript
// Always use parameterized queries with Prisma
const submissions = await prisma.submission.findMany({
  where: {
    title: {
      contains: req.query.search, // Safe with Prisma
    },
  },
})

// NEVER do this:
// const query = `SELECT * FROM submissions WHERE title LIKE '%${req.query.search}%'`
```

### 3. Authentication & Authorization

#### JWT Token Management
```typescript
// Implement refresh tokens
interface TokenPair {
  accessToken: string // Short-lived (15 minutes)
  refreshToken: string // Long-lived (7 days)
}

function generateTokenPair(userId: string): TokenPair {
  const accessToken = jwt.sign(
    { userId, type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  )

  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: '7d' }
  )

  // Store refresh token in database
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  })

  return { accessToken, refreshToken }
}

// Endpoint for token refresh
app.post('/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET)

    // Verify token exists in database
    const storedToken = await prisma.refreshToken.findFirst({
      where: { token: refreshToken, userId: decoded.userId },
    })

    if (!storedToken) {
      throw new Error('Invalid refresh token')
    }

    // Generate new token pair
    const newTokens = generateTokenPair(decoded.userId)

    // Invalidate old refresh token
    await prisma.refreshToken.delete({ where: { id: storedToken.id } })

    res.json(newTokens)
  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' })
  }
})
```

#### Password Reset Flow
```typescript
// Generate secure reset token
import crypto from 'crypto'

app.post('/auth/forgot-password', async (req, res) => {
  const { email } = req.body

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    // Don't reveal if email exists
    return res.json({ message: 'If email exists, reset link sent' })
  }

  // Generate token
  const resetToken = crypto.randomBytes(32).toString('hex')
  const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex')

  // Store hashed token
  await prisma.passwordReset.create({
    data: {
      userId: user.id,
      token: resetTokenHash,
      expiresAt: new Date(Date.now() + 3600000), // 1 hour
    },
  })

  // Send email with reset link
  await sendEmail({
    to: email,
    subject: 'Password Reset Request',
    html: `Click here to reset: ${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`,
  })

  res.json({ message: 'If email exists, reset link sent' })
})

app.post('/auth/reset-password', async (req, res) => {
  const { token, newPassword } = req.body

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

  const resetRecord = await prisma.passwordReset.findFirst({
    where: {
      token: tokenHash,
      expiresAt: { gt: new Date() },
      used: false,
    },
  })

  if (!resetRecord) {
    return res.status(400).json({ error: 'Invalid or expired token' })
  }

  // Update password
  const hashedPassword = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({
    where: { id: resetRecord.userId },
    data: { password: hashedPassword },
  })

  // Mark token as used
  await prisma.passwordReset.update({
    where: { id: resetRecord.id },
    data: { used: true },
  })

  res.json({ message: 'Password reset successful' })
})
```

### 4. Rate Limiting

#### Express Rate Limit
```typescript
import rateLimit from 'express-rate-limit'
import RedisStore from 'rate-limit-redis'
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL)

// General API rate limit
const apiLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:api:',
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: 'Too many requests, please try again later',
})

// Strict limit for uploads
const uploadLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:upload:',
  }),
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 uploads per 15 minutes
  message: 'Upload limit exceeded',
})

// Auth endpoints (prevent brute force)
const authLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:auth:',
  }),
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 attempts per 15 minutes
  skipSuccessfulRequests: true, // Only count failed attempts
})

// Apply rate limiters
app.use('/api/', apiLimiter)
app.use('/api/submissions', uploadLimiter)
app.use('/api/auth/signin', authLimiter)
app.use('/api/auth/signup', authLimiter)
```

### 5. Audit Logging

#### Comprehensive Audit System
```typescript
// Audit log schema
interface AuditLog {
  id: string
  userId: string
  action: string // 'UPLOAD', 'REVIEW', 'APPROVE', 'DELETE', 'LOGIN', etc.
  entityType: string // 'SUBMISSION', 'USER', 'REVIEW'
  entityId?: string
  metadata?: Record<string, any>
  ipAddress: string
  userAgent: string
  timestamp: Date
}

// Middleware to log all actions
function auditMiddleware(action: string, entityType: string) {
  return async (req, res, next) => {
    const originalJson = res.json

    res.json = function (data) {
      // Log successful actions
      if (res.statusCode < 400) {
        prisma.auditLog.create({
          data: {
            userId: req.user?.id,
            action,
            entityType,
            entityId: data.id || data.submission?.id || data.user?.id,
            metadata: {
              method: req.method,
              path: req.path,
              query: req.query,
              body: sanitizeLogData(req.body),
            },
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            timestamp: new Date(),
          },
        }).catch(console.error) // Don't fail the request if logging fails
      }

      return originalJson.call(this, data)
    }

    next()
  }
}

// Usage
app.post('/submissions',
  auditMiddleware('UPLOAD', 'SUBMISSION'),
  uploadController
)

app.post('/submissions/:id/review',
  auditMiddleware('REVIEW', 'SUBMISSION'),
  reviewController
)

// Sanitize sensitive data from logs
function sanitizeLogData(data: any) {
  const sanitized = { ...data }
  delete sanitized.password
  delete sanitized.token
  delete sanitized.refreshToken
  return sanitized
}
```

### 6. Email Notifications

#### Notification System
```typescript
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

interface EmailNotification {
  to: string
  subject: string
  template: 'REVIEWER_APPROVED' | 'SUBMISSION_REVIEWED' | 'TASK_ELIGIBLE' | 'ADMIN_APPROVAL_NEEDED'
  data: Record<string, any>
}

async function sendNotification(notification: EmailNotification) {
  const templates = {
    REVIEWER_APPROVED: (data) => `
      <h1>Your reviewer account has been approved!</h1>
      <p>Welcome ${data.name}, you can now start reviewing submissions.</p>
      <a href="${process.env.FRONTEND_URL}/reviewer">Go to Dashboard</a>
    `,
    SUBMISSION_REVIEWED: (data) => `
      <h1>Your submission has been reviewed</h1>
      <p>Submission: ${data.title}</p>
      <p>Status: ${data.status}</p>
      <p>Feedback: ${data.feedback}</p>
      <a href="${process.env.FRONTEND_URL}/contributor">View Details</a>
    `,
    TASK_ELIGIBLE: (data) => `
      <h1>Submission Marked as Eligible</h1>
      <p>Submission "${data.title}" is now eligible for final approval.</p>
      <a href="${process.env.FRONTEND_URL}/contributor">View Status</a>
    `,
    ADMIN_APPROVAL_NEEDED: (data) => `
      <h1>New Reviewer Approval Required</h1>
      <p>User ${data.name} (${data.email}) has requested reviewer access.</p>
      <a href="${process.env.FRONTEND_URL}/admin">Review Request</a>
    `,
  }

  const html = templates[notification.template](notification.data)

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: notification.to,
    subject: notification.subject,
    html,
  })
}

// Trigger notifications on events
async function onSubmissionReviewed(submission, review) {
  await sendNotification({
    to: submission.contributor.email,
    subject: 'Your submission has been reviewed',
    template: 'SUBMISSION_REVIEWED',
    data: {
      title: submission.title,
      status: submission.status,
      feedback: review.feedback,
    },
  })
}

async function onReviewerApproved(user) {
  await sendNotification({
    to: user.email,
    subject: 'Reviewer Account Approved',
    template: 'REVIEWER_APPROVED',
    data: {
      name: user.name,
    },
  })
}
```

### 7. CORS Configuration

```typescript
import cors from 'cors'

const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600, // 10 minutes
}

app.use(cors(corsOptions))
```

## 📊 Analytics & Monitoring

### Analytics Endpoints

```typescript
// GET /api/admin/analytics/overview
{
  totalSubmissions: number
  totalUsers: number
  submissionsThisWeek: number
  submissionsThisMonth: number
  avgReviewTime: number // in hours
  approvalRate: number // percentage
  topContributors: Array<{
    userId: string
    name: string
    submissionCount: number
  }>
  domainBreakdown: Array<{
    domain: string
    count: number
  }>
  languageBreakdown: Array<{
    language: string
    count: number
  }>
}

// GET /api/admin/analytics/submissions?range=7d|30d|90d
{
  data: Array<{
    date: string
    count: number
    approved: number
    rejected: number
    pending: number
  }>
}
```

## 🔐 Environment Variables

Add these to your `.env`:

```bash
# Security
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
REFRESH_TOKEN_SECRET=your-refresh-token-secret
BCRYPT_ROUNDS=10

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=/var/app/uploads

# Rate Limiting
REDIS_URL=redis://localhost:6379

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="Reviewers-Adzzat <noreply@reviewers-adzzat.com>"

# Frontend
FRONTEND_URL=https://reviewers-adzzat.com

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/reviewers_adzzat

# Virus Scanning (if using ClamAV)
CLAMAV_HOST=localhost
CLAMAV_PORT=3310
```

## 🚀 Deployment Checklist

- [ ] All environment variables set
- [ ] File upload validation implemented
- [ ] Virus scanning configured (if applicable)
- [ ] Rate limiting enabled
- [ ] Audit logging active
- [ ] Email notifications configured
- [ ] CORS properly configured
- [ ] HTTPS enforced
- [ ] Database backups automated
- [ ] Error logging/monitoring setup (e.g., Sentry)
- [ ] Security headers verified
- [ ] API documentation updated

## 📝 Testing Recommendations

1. **Security Testing**
   - Penetration testing
   - OWASP ZAP scan
   - SQL injection tests
   - File upload bypass attempts

2. **Load Testing**
   - Rate limit effectiveness
   - Concurrent upload handling
   - Database connection pooling

3. **Integration Testing**
   - Email delivery
   - File storage
   - Authentication flows
   - Notification triggers

## 🔍 Monitoring & Alerts

Set up alerts for:
- Failed login attempts (>5 in 5 minutes)
- Large file upload attempts (>10MB)
- Malware detection
- Rate limit violations
- Database connection issues
- API response times >1s
- Error rates >5%

---

**Implementation Priority:**
1. ✅ File upload security (CRITICAL)
2. ✅ Rate limiting (CRITICAL)
3. ✅ Input validation (CRITICAL)
4. ⚠️ Password reset flow (HIGH)
5. ⚠️ Email notifications (HIGH)
6. ⚠️ Audit logging (MEDIUM)
7. ⚠️ Analytics endpoints (MEDIUM)
