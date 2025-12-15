# 📚 Swagger API Documentation Guide

## Overview

Complete OpenAPI 3.0 specification for the Reviewers-Adzzat Platform API with interactive documentation.

---

## 🚀 Quick Start

### Option 1: Local HTML Viewer (Easiest)

1. **Open the documentation**:
   ```bash
   cd backend/docs
   # Open swagger-ui.html in your browser
   open swagger-ui.html  # macOS
   xdg-open swagger-ui.html  # Linux
   start swagger-ui.html  # Windows
   ```

2. **Or use a local web server**:
   ```bash
   # Python 3
   python3 -m http.server 8000 -d backend/docs

   # Then visit: http://localhost:8000/swagger-ui.html
   ```

### Option 2: Online Swagger Editor

1. Go to [editor.swagger.io](https://editor.swagger.io/)
2. File → Import File → Select `backend/docs/swagger.yaml`
3. Interactive documentation with "Try it out" feature

### Option 3: Serve from Go Backend (Production)

Add Swagger UI endpoint to your Go server:

```bash
# Install Swagger files package
go get github.com/swaggo/files
go get github.com/swaggo/gin-swagger
```

Then in `cmd/api/main.go`:
```go
import (
    swaggerFiles "github.com/swaggo/files"
    ginSwagger "github.com/swaggo/gin-swagger"
)

// Add route
router.GET("/docs/*any", ginSwagger.WrapHandler(swaggerFiles.Handler,
    ginSwagger.URL("/api/docs/swagger.yaml")))
```

Access at: `http://localhost:8080/docs/index.html`

---

## 📖 Documentation Structure

### Sections

1. **Authentication** - Signin, signup, refresh tokens, password reset
2. **Submissions (Project X)** - Task submission and review workflows
3. **Project V** - Advanced task submission system
4. **Admin** - User management, statistics, analytics
5. **WebSocket** - Real-time updates

### Key Features

✅ **Complete API Reference**
- All endpoints documented
- Request/response schemas
- Authentication requirements
- Query parameters
- Status codes

✅ **Interactive "Try it out"**
- Test endpoints directly from docs
- Auto-generated code samples
- Request/response examples

✅ **Security Definitions**
- JWT Bearer authentication
- Refresh token flow
- Rate limiting details

✅ **Schema Validation**
- OpenAPI 3.0 compliant
- Type definitions
- Required fields
- Enum values

---

## 🔐 Authentication in Swagger UI

### Step 1: Sign In

1. Find `POST /auth/signin` endpoint
2. Click "Try it out"
3. Enter credentials:
   ```json
   {
     "email": "user@example.com",
     "password": "password123"
   }
   ```
4. Click "Execute"
5. Copy the `accessToken` from response

### Step 2: Authorize

1. Click the green "Authorize" button (top right)
2. In the "Value" field, paste: `Bearer <your-access-token>`
   ```
   Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
3. Click "Authorize"
4. Click "Close"

### Step 3: Make Authenticated Requests

Now all "Try it out" requests will include your JWT token automatically!

### Token Refresh

When your access token expires (15 minutes):
1. Use `POST /auth/refresh` with your refresh token
2. Get new access token
3. Update authorization (click Authorize button again)

---

## 📋 API Endpoints Summary

### Authentication (7 endpoints)
```
POST   /auth/signup           - Register new user
POST   /auth/signin           - Login (get tokens)
POST   /auth/refresh          - Refresh access token
POST   /auth/revoke           - Logout (revoke refresh token)
GET    /auth/me               - Get current user
POST   /auth/forgot-password  - Request password reset
POST   /auth/reset-password   - Reset password with token
```

### Submissions - Project X (10 endpoints)
```
GET    /submissions              - List submissions
POST   /submissions              - Create submission
GET    /submissions/reviewed     - Get reviewed submissions
GET    /submissions/:id          - Get submission details
DELETE /submissions/:id          - Delete submission
GET    /submissions/:id/download - Download file
POST   /submissions/:id/feedback - Submit review feedback
PUT    /submissions/:id/claim    - Claim submission (reviewer)
PUT    /submissions/:id/approve  - Approve submission (admin)
```

### Project V (13 endpoints)
```
GET    /projectv/submissions                        - List all
POST   /projectv/submissions                        - Create new
GET    /projectv/submissions/:id                    - Get details
PUT    /projectv/submissions/:id/status             - Update status
PUT    /projectv/submissions/:id/changes-requested  - Request changes
PUT    /projectv/submissions/:id/changes-done       - Mark changes done
PUT    /projectv/submissions/:id/final-checks       - Move to final checks
PUT    /projectv/submissions/:id/task-submitted     - Mark task submitted
PUT    /projectv/submissions/:id/eligible           - Mark eligible for review
PUT    /projectv/submissions/:id/tester-feedback    - Send tester feedback
PUT    /projectv/submissions/:id/rejected           - Reject submission
DELETE /projectv/submissions/:id                    - Delete submission
```

### Admin (12 endpoints)
```
GET    /users                    - List all users
PUT    /users/:id/approve        - Approve tester
PUT    /users/:id/greenlight     - Toggle green light
PUT    /users/:id/role           - Switch user role
DELETE /users/:id                - Delete user
GET    /stats                    - Platform statistics
GET    /logs                     - Activity logs
GET    /leaderboard              - User leaderboard
GET    /admin/analytics          - Analytics data
GET    /admin/analytics/chart    - Chart data
GET    /admin/audit-logs         - Audit logs
```

### WebSocket (1 endpoint)
```
GET    /ws?token=<jwt>  - WebSocket connection
```

**Total: 43 documented endpoints**

---

## 🎨 Code Generation

### Generate Client SDK

Swagger can auto-generate client SDKs in multiple languages:

```bash
# Install Swagger Codegen
npm install -g @openapitools/openapi-generator-cli

# Generate TypeScript/Axios client
openapi-generator-cli generate \
  -i backend/docs/swagger.yaml \
  -g typescript-axios \
  -o frontend/src/api-client

# Generate Python client
openapi-generator-cli generate \
  -i backend/docs/swagger.yaml \
  -g python \
  -o python-client

# Generate Go client
openapi-generator-cli generate \
  -i backend/docs/swagger.yaml \
  -g go \
  -o go-client
```

### Available Languages

- typescript-axios, typescript-fetch
- javascript, javascript-es6
- python, python-legacy
- java, kotlin
- go, rust
- php, ruby
- swift, dart
- And 50+ more!

---

## 🔍 Testing with Swagger

### Test Workflow Example

**1. Register a new user:**
```
POST /auth/signup
Body: {
  "email": "test@example.com",
  "password": "Test123!",
  "name": "Test User",
  "role": "CONTRIBUTOR"
}
```

**2. Sign in:**
```
POST /auth/signin
Body: {
  "email": "test@example.com",
  "password": "Test123!"
}
```

**3. Authorize with access token** (click green Authorize button)

**4. Upload a submission:**
```
POST /submissions
FormData: {
  title: "My First Task",
  domain: "Frontend",
  language: "TypeScript",
  file: <select file>
}
```

**5. Check your submissions:**
```
GET /submissions
```

---

## 📊 Schema Examples

### User Schema
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "CONTRIBUTOR",
  "isApproved": true,
  "isGreenLight": true,
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:30:00Z"
}
```

### Submission Schema
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "title": "Implement authentication",
  "domain": "Backend",
  "language": "Go",
  "fileUrl": "https://storage.example.com/files/...",
  "fileName": "auth.zip",
  "status": "PENDING",
  "contributorId": "550e8400-e29b-41d4-a716-446655440000",
  "claimedById": null,
  "assignedAt": null,
  "createdAt": "2025-01-15T11:00:00Z"
}
```

### Error Schema
```json
{
  "error": "Invalid credentials"
}
```

---

## 🚦 Status Codes

### Success Codes
- `200` - OK (GET, PUT, DELETE)
- `201` - Created (POST)

### Client Error Codes
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `429` - Too Many Requests (rate limit exceeded)

### Server Error Codes
- `500` - Internal Server Error

---

## 🔄 Rate Limiting

**Limits:**
- 1000 requests per minute per IP address

**Headers:**
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 995
X-RateLimit-Reset: 1642234800
```

**Error Response:**
```json
{
  "error": "Rate limit exceeded. Please try again later."
}
```

---

## 🌐 CORS

The API supports CORS for web applications.

**Allowed Origins:**
- Development: `http://localhost:3000`
- Production: `https://app.reviewers-adzzat.com`

**Allowed Methods:**
- GET, POST, PUT, DELETE, OPTIONS

**Allowed Headers:**
- Content-Type, Authorization

---

## 📝 Request/Response Examples

### Authentication Flow

**Request:**
```bash
curl -X POST http://localhost:8080/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

**Response:**
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "CONTRIBUTOR",
    "isApproved": true
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "base64-encoded-secure-random-token"
}
```

### Making Authenticated Request

**Request:**
```bash
curl -X GET http://localhost:8080/api/submissions \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response:**
```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Implement authentication",
    "domain": "Backend",
    "language": "Go",
    "status": "PENDING",
    "createdAt": "2025-01-15T11:00:00Z",
    "contributor": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "John Doe",
      "email": "user@example.com"
    }
  }
]
```

---

## 🔧 Advanced Features

### Filtering & Search

Many list endpoints support filtering:

```bash
# Filter by status
GET /submissions?status=APPROVED

# Search by title
GET /submissions?search=authentication

# Combine filters
GET /projectv/submissions?status=PENDING_REVIEW&search=backend
```

### Pagination

For large datasets, use limit/offset:

```bash
# Get first 20 items
GET /submissions?limit=20&offset=0

# Get next 20 items
GET /submissions?limit=20&offset=20
```

### Sorting

Sort results with `sort` parameter:

```bash
# Sort by creation date (newest first)
GET /submissions?sort=-createdAt

# Sort by title (A-Z)
GET /submissions?sort=title
```

---

## 🐛 Troubleshooting

### "401 Unauthorized" on all requests

**Cause**: Missing or invalid access token

**Solution**:
1. Sign in to get new access token
2. Click "Authorize" button in Swagger UI
3. Enter: `Bearer <your-token>`

### "Invalid or expired refresh token"

**Cause**: Refresh token expired (30 days) or was revoked

**Solution**: Sign in again to get new tokens

### CORS errors in browser

**Cause**: Making requests from unauthorized origin

**Solution**:
- Use Swagger UI at same origin as API
- Or configure CORS in backend to allow your origin

### Rate limit exceeded

**Cause**: Too many requests (>1000/min)

**Solution**: Wait 1 minute or implement request throttling

---

## 📦 Postman Collection

### Import to Postman

1. Go to Postman
2. Import → Link → Enter: `https://converter.swagger.io/api/convert?url=<your-swagger-url>`
3. Or import `swagger.yaml` directly

### Environment Variables

Create Postman environment:
```json
{
  "baseUrl": "http://localhost:8080/api",
  "accessToken": "",
  "refreshToken": ""
}
```

Use in requests: `{{baseUrl}}/submissions`

---

## 🎓 Best Practices

### For API Consumers

1. **Cache access tokens** - Don't request new token for every API call
2. **Implement auto-refresh** - Refresh token before it expires
3. **Handle rate limits** - Implement exponential backoff
4. **Validate input** - Check schemas before sending requests
5. **Handle errors gracefully** - Display user-friendly error messages

### For API Developers

1. **Keep swagger.yaml updated** - Document changes immediately
2. **Version your API** - Use `/v1/`, `/v2/` prefixes
3. **Add examples** - Include request/response samples
4. **Document errors** - Specify all possible error responses
5. **Test endpoints** - Use Swagger UI to verify functionality

---

## 🔗 Useful Links

- [OpenAPI 3.0 Specification](https://swagger.io/specification/)
- [Swagger Editor](https://editor.swagger.io/)
- [Swagger UI](https://swagger.io/tools/swagger-ui/)
- [Code Generation](https://github.com/OpenAPITools/openapi-generator)
- [Postman](https://www.postman.com/)

---

## 📧 Support

For API support or questions:
- Email: support@reviewers-adzzat.com
- GitHub: [Issues](https://github.com/reviewers-adzzat/platform/issues)
- Slack: #api-support

---

## 📄 License

This API documentation is licensed under MIT License.
