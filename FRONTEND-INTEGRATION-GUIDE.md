# Frontend Integration Guide

## Overview

This guide explains how to integrate the Next.js frontend with the new Go backend API.

## Current Architecture

**Before (Old System):**
```
Next.js App
├── Frontend Pages (React)
└── API Routes (/app/api/*)
    └── Direct Prisma Database Access
```

**After (New System):**
```
Next.js App (Frontend Only)          Go Backend API
├── Pages (React)                    ├── REST API Endpoints
├── API Client Service     ←────────→├── JWT Authentication
└── Token Management                 ├── Business Logic
                                     └── Database (GORM)
```

---

## Step 1: Create API Client Service

### File: `lib/api-client.ts`

```typescript
import axios, { AxiosInstance } from 'axios'

class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Add token to all requests
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('authToken')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    })

    // Handle 401 errors globally
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('authToken')
          window.location.href = '/signin'
        }
        return Promise.reject(error)
      }
    )
  }

  // Auth
  async signup(data: { email: string; password: string; name: string; role: string }) {
    const response = await this.client.post('/auth/signup', data)
    if (response.data.token) {
      localStorage.setItem('authToken', response.data.token)
    }
    return response.data
  }

  async signin(data: { email: string; password: string }) {
    const response = await this.client.post('/auth/signin', data)
    if (response.data.token) {
      localStorage.setItem('authToken', response.data.token)
    }
    return response.data
  }

  async logout() {
    const response = await this.client.post('/auth/logout')
    localStorage.removeItem('authToken')
    return response.data
  }

  async getMe() {
    const response = await this.client.get('/auth/me')
    return response.data
  }

  // Profile
  async getProfile() {
    const response = await this.client.get('/profile')
    return response.data.profile
  }

  async updateProfile(data: { name?: string; password?: string }) {
    const response = await this.client.put('/profile', data)
    return response.data
  }

  // Submissions
  async uploadSubmission(formData: FormData) {
    const response = await this.client.post('/submissions', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  }

  async getSubmissions(params?: { status?: string; search?: string }) {
    const response = await this.client.get('/submissions', { params })
    return response.data.submissions
  }

  async getSubmission(id: string) {
    const response = await this.client.get(`/submissions/${id}`)
    return response.data.submission
  }

  async deleteSubmission(id: string) {
    const response = await this.client.delete(`/submissions/${id}`)
    return response.data
  }

  async getDownloadURL(id: string) {
    const response = await this.client.get(`/submissions/${id}/download`)
    return response.data.downloadUrl
  }

  async submitFeedback(id: string, data: { feedback: string; accountPostedIn?: string; markEligible: boolean }) {
    const response = await this.client.post(`/submissions/${id}/feedback`, data)
    return response.data
  }

  // Admin
  async getUsers() {
    const response = await this.client.get('/users')
    return response.data.users
  }

  async approveReviewer(userId: string) {
    const response = await this.client.put(`/users/${userId}/approve`)
    return response.data
  }

  async switchUserRole(userId: string, newRole: string) {
    const response = await this.client.put(`/users/${userId}/role`, { newRole })
    return response.data
  }

  async deleteUser(userId: string) {
    const response = await this.client.delete(`/users/${userId}`)
    return response.data
  }

  async approveSubmission(id: string) {
    const response = await this.client.put(`/submissions/${id}/approve`)
    return response.data
  }

  async getLogs(limit?: number) {
    const response = await this.client.get('/logs', { params: { limit } })
    return response.data.logs
  }

  async getStats() {
    const response = await this.client.get('/stats')
    return response.data
  }

  async getLeaderboard() {
    const response = await this.client.get('/leaderboard')
    return response.data.leaderboard
  }
}

export const apiClient = new ApiClient()
```

---

## Step 2: Update Authentication Context

### File: `lib/auth.ts` (Update existing)

**Replace all server-side functions with API client calls:**

```typescript
// OLD: Server-side with Prisma
export async function getCurrentUser() {
  const token = cookies().get('token')?.value
  // ... prisma queries
}

// NEW: Client-side with API client
export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.getMe()
      .then(data => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  return { user, loading }
}
```

---

## Step 3: Update All Pages

### Example: Contributor Dashboard

**OLD (`app/contributor/page.tsx`):**
```typescript
const response = await fetch('/api/submissions', {
  headers: { Cookie: cookies().toString() }
})
const data = await response.json()
```

**NEW:**
```typescript
'use client'

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api-client'

export default function ContributorDashboard() {
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadSubmissions()
  }, [])

  async function loadSubmissions() {
    try {
      const data = await apiClient.getSubmissions({ search: searchQuery })
      setSubmissions(data)
    } catch (error) {
      console.error('Failed to load submissions:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleUpload(formData: FormData) {
    try {
      await apiClient.uploadSubmission(formData)
      loadSubmissions() // Refresh list
    } catch (error) {
      console.error('Upload failed:', error)
    }
  }

  async function handleDelete(id: string) {
    if (confirm('Are you sure?')) {
      try {
        await apiClient.deleteSubmission(id)
        loadSubmissions() // Refresh list
      } catch (error) {
        console.error('Delete failed:', error)
      }
    }
  }

  // ... render UI
}
```

---

## Step 4: Environment Variables

### File: `.env.local` (Frontend)

```env
NEXT_PUBLIC_API_URL=http://localhost:8080/api
```

### Production:
- **Vercel/Netlify**: Set `NEXT_PUBLIC_API_URL` to your deployed backend URL
- **Backend URL**: `https://your-backend.railway.app/api`

---

## Step 5: Remove Old API Routes

```bash
rm -rf app/api
```

Delete all existing API route files since the Go backend now handles all API requests.

---

## Migration Checklist

### Authentication
- [ ] Replace `/app/signin/page.tsx` to use `apiClient.signin()`
- [ ] Replace `/app/signup/page.tsx` to use `apiClient.signup()`
- [ ] Update auth context to use `apiClient.getMe()`
- [ ] Store JWT token in localStorage (not cookies)

### Contributor Pages
- [ ] Update dashboard to use `apiClient.getSubmissions()`
- [ ] Update upload form to use `apiClient.uploadSubmission()`
- [ ] Add delete buttons using `apiClient.deleteSubmission()`
- [ ] Add search bar with `apiClient.getSubmissions({ search })`
- [ ] Update profile page to use `apiClient.getProfile()`

### Reviewer Pages
- [ ] Update dashboard to use `apiClient.getSubmissions()`
- [ ] Update feedback form to use `apiClient.submitFeedback()`
- [ ] Add download functionality using `apiClient.getDownloadURL()`
- [ ] Add search functionality
- [ ] Update profile page

### Admin Pages
- [ ] Update user management to use `apiClient.getUsers()`
- [ ] Add role switching UI using `apiClient.switchUserRole()`
- [ ] Add delete user functionality using `apiClient.deleteUser()`
- [ ] Update stats dashboard to use `apiClient.getStats()`
- [ ] Create logs viewer using `apiClient.getLogs()`
- [ ] Update leaderboard to use `apiClient.getLeaderboard()`
- [ ] Update submission approval to use `apiClient.approveSubmission()`

### Components
- [ ] Remove all `fetch('/api/...')` calls
- [ ] Add loading states
- [ ] Add error handling
- [ ] Add success notifications

---

## Testing the Integration

### 1. Start Backend
```bash
cd backend
# Set up .env file first
go run cmd/api/main.go
```

Backend should start on `http://localhost:8080`

### 2. Start Frontend
```bash
cd .. # back to root
npm run dev
```

Frontend should start on `http://localhost:3000`

### 3. Test Flow
1. Sign up as contributor
2. Upload a submission
3. Sign in as admin
4. Approve reviewer
5. Sign in as reviewer
6. Review the submission
7. Sign in as admin
8. Approve the submission
9. Test search functionality
10. Test delete functionality
11. Test role switching

---

## Common Issues & Solutions

### Issue: CORS errors
**Solution**: Ensure backend `.env` has:
```env
CORS_ORIGINS=http://localhost:3000
```

### Issue: 401 Unauthorized
**Solution**:
- Check JWT_SECRET is set in backend
- Verify token is stored in localStorage
- Check Authorization header format is "Bearer <token>"

### Issue: Network errors
**Solution**:
- Verify backend is running on port 8080
- Check NEXT_PUBLIC_API_URL is correct
- Ensure firewall isn't blocking requests

### Issue: File uploads fail
**Solution**:
- Check SUPABASE_URL and SUPABASE_SERVICE_KEY in backend
- Verify "submissions" bucket exists in Supabase
- Ensure bucket permissions allow uploads

---

## Auto-Refresh Implementation

Add to dashboards for automatic updates every 30 seconds:

```typescript
useEffect(() => {
  const interval = setInterval(() => {
    loadSubmissions()
  }, 30000) // 30 seconds

  return () => clearInterval(interval)
}, [])
```

Or use React Query for better caching:

```typescript
import { useQuery } from '@tanstack/react-query'

const { data: submissions, refetch } = useQuery({
  queryKey: ['submissions'],
  queryFn: () => apiClient.getSubmissions(),
  refetchInterval: 30000, // Auto-refetch every 30s
})
```

---

## Deployment

### Backend (Railway)
1. Create new project on Railway
2. Add environment variables
3. Deploy from GitHub
4. Note the public URL

### Frontend (Vercel)
1. Create new project on Vercel
2. Set `NEXT_PUBLIC_API_URL` to Railway URL
3. Deploy from GitHub

### Backend (Render)
1. Create new Web Service
2. Build: `go build -o server cmd/api/main.go`
3. Start: `./server`
4. Add environment variables

---

## Next Steps

1. **Complete frontend refactor** following this guide
2. **Test locally** to ensure everything works
3. **Deploy backend** to Railway or Render
4. **Deploy frontend** to Vercel or Netlify
5. **Test production** end-to-end
6. **Monitor** activity logs for any issues

---

**Status**: Ready for frontend integration! Backend is complete and waiting.
