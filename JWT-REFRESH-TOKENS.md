# 🔐 JWT Refresh Tokens Implementation Guide

## Overview

This document explains the JWT refresh token system implemented for enhanced security and better user experience.

---

## Security Benefits

### Why Refresh Tokens?

**Before (Long-lived JWTs only):**
- Access tokens valid for 7 days
- If token stolen, attacker has 7 days of access
- No way to revoke access without database check on every request
- Users logged out after 7 days (poor UX)

**After (Short-lived Access + Refresh Tokens):**
- Access tokens valid for **15 minutes** only
- Refresh tokens valid for **30 days**
- Stolen access token = limited 15-minute window
- Refresh tokens can be revoked instantly
- Users stay logged in for 30 days (great UX)

### Security Score

| Feature | Without Refresh | With Refresh |
|---------|----------------|--------------|
| Token theft exposure | 7 days | 15 minutes |
| Instant revocation | ❌ No | ✅ Yes |
| Session duration | 7 days | 30 days |
| Database overhead | None | Minimal |

---

## Architecture

### Token Types

**1. Access Token (JWT)**
- Short-lived: **15 minutes**
- Stateless: No database lookup needed
- Used for: API requests
- Storage: Memory only (never localStorage)

**2. Refresh Token**
- Long-lived: **30 days**
- Stateful: Stored in database
- Used for: Getting new access tokens
- Storage: Secure, httpOnly cookie (recommended) or localStorage

### Flow Diagram

```
┌──────────┐                                    ┌──────────┐
│          │  1. POST /auth/signin             │          │
│  Client  │ ──────────────────────────────>   │  Server  │
│          │                                    │          │
│          │  2. accessToken + refreshToken    │          │
│          │ <──────────────────────────────   │          │
└──────────┘                                    └──────────┘
     │                                                │
     │                                                │
     │  3. API Request + accessToken                 │
     │ ──────────────────────────────────────────>   │
     │                                                │
     │  4. 401 Unauthorized (token expired)          │
     │ <──────────────────────────────────────────   │
     │                                                │
     │  5. POST /auth/refresh + refreshToken         │
     │ ──────────────────────────────────────────>   │
     │                                                │
     │  6. New accessToken                           │
     │ <──────────────────────────────────────────   │
     │                                                │
     │  7. Retry API Request + new accessToken       │
     │ ──────────────────────────────────────────>   │
```

---

## API Endpoints

### 1. POST /api/auth/signin

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "CONTRIBUTOR",
    "isApproved": true
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "base64-encoded-secure-random-token"
}
```

**Note:** Changed from `token` to `accessToken` and added `refreshToken`.

---

### 2. POST /api/auth/refresh

**Request:**
```json
{
  "refreshToken": "previous-refresh-token"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Status Codes:**
- `200` - Success, new access token generated
- `401` - Invalid or expired refresh token
- `400` - Missing refresh token

---

### 3. POST /api/auth/revoke

**Request:**
```json
{
  "refreshToken": "token-to-revoke"
}
```

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

**Use Case:** Logout on single device

---

## Frontend Integration

### React/Next.js Implementation

#### 1. Auth Context with Auto-Refresh

```tsx
// lib/auth-context.tsx
'use client'

import { createContext, useContext, useEffect, useState } from 'react'

interface AuthContextType {
  accessToken: string | null
  refreshToken: string | null
  user: User | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshAccessToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)

  // Load tokens from localStorage on mount
  useEffect(() => {
    const storedRefreshToken = localStorage.getItem('refreshToken')
    if (storedRefreshToken) {
      setRefreshToken(storedRefreshToken)
      refreshAccessToken(storedRefreshToken)
    }
  }, [])

  // Auto-refresh access token before it expires (every 14 minutes)
  useEffect(() => {
    if (!refreshToken) return

    const interval = setInterval(() => {
      refreshAccessToken(refreshToken)
    }, 14 * 60 * 1000) // 14 minutes

    return () => clearInterval(interval)
  }, [refreshToken])

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) throw new Error('Login failed')

    const data = await response.json()
    setAccessToken(data.accessToken)
    setRefreshToken(data.refreshToken)
    setUser(data.user)

    // Store refresh token (NOT access token)
    localStorage.setItem('refreshToken', data.refreshToken)
  }

  const refreshAccessToken = async (token?: string) => {
    const tokenToUse = token || refreshToken
    if (!tokenToUse) return null

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: tokenToUse }),
      })

      if (!response.ok) {
        // Refresh token expired or invalid
        logout()
        return null
      }

      const data = await response.json()
      setAccessToken(data.accessToken)
      return data.accessToken
    } catch (error) {
      logout()
      return null
    }
  }

  const logout = async () => {
    if (refreshToken) {
      await fetch('/api/auth/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
    }

    setAccessToken(null)
    setRefreshToken(null)
    setUser(null)
    localStorage.removeItem('refreshToken')
  }

  return (
    <AuthContext.Provider value={{ accessToken, refreshToken, user, login, logout, refreshAccessToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
```

---

#### 2. API Client with Auto-Retry

```tsx
// lib/api-client.ts
import { useAuth } from './auth-context'

export function createApiClient(getAccessToken: () => string | null, refreshAccessToken: () => Promise<string | null>) {
  async function fetchWithAuth(url: string, options: RequestInit = {}) {
    let accessToken = getAccessToken()

    // First attempt
    let response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${accessToken}`,
      },
    })

    // If unauthorized, try refreshing token
    if (response.status === 401) {
      accessToken = await refreshAccessToken()

      if (!accessToken) {
        throw new Error('Session expired')
      }

      // Retry with new token
      response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${accessToken}`,
        },
      })
    }

    return response
  }

  return {
    get: (url: string) => fetchWithAuth(url),
    post: (url: string, data: any) =>
      fetchWithAuth(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    put: (url: string, data: any) =>
      fetchWithAuth(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    delete: (url: string) => fetchWithAuth(url, { method: 'DELETE' }),
  }
}
```

---

### Usage Example

```tsx
'use client'

import { useAuth } from '@/lib/auth-context'
import { useEffect, useState } from 'react'

export default function ProfilePage() {
  const { accessToken, refreshAccessToken } = useAuth()
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    fetchProfile()
  }, [])

  async function fetchProfile() {
    const apiClient = createApiClient(
      () => accessToken,
      refreshAccessToken
    )

    const response = await apiClient.get('/api/profile')
    const data = await response.json()
    setProfile(data)
  }

  return <div>{/* Render profile */}</div>
}
```

---

## Database Schema

### refresh_tokens Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to users table |
| token | TEXT | The refresh token (unique) |
| expires_at | TIMESTAMP | Expiration time (30 days) |
| created_at | TIMESTAMP | Creation time |
| revoked_at | TIMESTAMP | Revocation time (NULL if active) |

**Indexes:**
- `user_id` - Fast lookup by user
- `token` - Fast validation
- `expires_at` - Cleanup queries
- `revoked_at` - Filter active tokens

---

## Security Best Practices

### DO ✅

1. **Store refresh token securely**
   - httpOnly cookies (best)
   - localStorage (acceptable for SPAs)
   - NEVER in sessionStorage or regular cookies

2. **Use HTTPS in production**
   - Prevents token interception
   - Required for httpOnly cookies

3. **Implement token rotation** (optional, commented in code)
   - Issue new refresh token with each refresh
   - Revoke old refresh token
   - Better security, slight complexity increase

4. **Set up cleanup job**
   ```go
   // Run daily at midnight
   func setupTokenCleanup() {
       ticker := time.NewTicker(24 * time.Hour)
       go func() {
           for range ticker.C {
               handlers.CleanupExpiredRefreshTokens()
           }
       }()
   }
   ```

5. **Monitor for suspicious activity**
   - Multiple refresh requests from different IPs
   - Failed refresh attempts
   - Unusual token usage patterns

### DON'T ❌

1. **Never store access tokens in localStorage**
   - XSS vulnerability
   - Use memory only

2. **Don't use refresh tokens for API requests**
   - Refresh tokens are only for /auth/refresh
   - Use access tokens for all other API calls

3. **Don't make refresh tokens too long-lived**
   - 30 days is reasonable
   - 1 year is too long

4. **Don't expose refresh tokens in logs**
   - Sensitive data
   - Log token ID instead

---

## Migration Guide

### For Existing Users

Users with old long-lived tokens will continue to work until they expire. No immediate action required.

### For New API Calls

**Old:**
```tsx
const response = await fetch('/api/auth/signin', ...)
const { token } = await response.json()
localStorage.setItem('token', token)
```

**New:**
```tsx
const response = await fetch('/api/auth/signin', ...)
const { accessToken, refreshToken } = await response.json()
// Store refresh token only
localStorage.setItem('refreshToken', refreshToken)
// Keep access token in memory
```

---

## Testing

### Test Scenarios

1. **Normal Flow**
   - Login → Get tokens → Make API calls → Access token expires → Auto-refresh → Continue

2. **Logout**
   - Logout → Refresh token revoked → Can't refresh → Login required

3. **Expired Refresh Token**
   - Wait 30 days → Refresh fails → Redirect to login

4. **Token Theft**
   - Attacker steals access token → 15 minutes of access max
   - Legitimate user logs out → Attacker's access token still works for 15 min but refresh fails

5. **Concurrent Sessions**
   - Login on desktop → Get refresh token A
   - Login on mobile → Get refresh token B
   - Both work independently
   - Logout on desktop → Only revokes token A
   - Mobile still works

---

## Performance Impact

### Minimal Overhead

- **Database queries per auth**: 1 extra (refresh token validation)
- **Network requests**: +1 every 14 minutes (auto-refresh)
- **Storage**: ~100 bytes per user

### Benefits Far Outweigh Cost

- Drastically improved security
- Better user experience (longer sessions)
- Instant revocation capability

---

## Advanced: Token Rotation

Uncomment the rotation block in `handlers.RefreshToken` to enable:

**Benefits:**
- Even better security
- Detects token theft faster
- Industry best practice

**Trade-offs:**
- Slightly more complex
- One extra DB write per refresh

---

## Troubleshooting

### "Invalid or expired refresh token"

**Causes:**
- Token actually expired (30 days)
- Token was revoked (user logged out)
- Token doesn't exist in database
- Database connection issue

**Solution:**
- Clear localStorage
- Login again

### Access token expired but auto-refresh not working

**Causes:**
- Refresh token not stored
- Network error
- Wrong API endpoint

**Solution:**
- Check browser console for errors
- Verify refresh token in localStorage
- Check network tab for failed requests

### Users logged out unexpectedly

**Causes:**
- Refresh token expired (30 days)
- Server cleanup deleted tokens
- Database was reset

**Solution:**
- Extend refresh token expiry if needed
- Check cleanup job settings

---

## Future Enhancements

1. **Device Management**
   - Track refresh tokens per device
   - Allow users to revoke specific devices
   - Show active sessions

2. **Refresh Token Rotation**
   - Enable commented rotation code
   - More secure, industry standard

3. **Rate Limiting**
   - Limit refresh requests per user
   - Prevent token enumeration attacks

4. **Push Notifications**
   - Notify users of new logins
   - Alert on suspicious activity

---

## References

- [RFC 6749 - OAuth 2.0](https://tools.ietf.org/html/rfc6749)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [OWASP Token-Based Authentication](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
