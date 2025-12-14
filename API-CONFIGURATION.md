# API Configuration Guide

This guide explains how to configure the backend API URL for the Reviewers platform.

## 📋 Overview

The platform uses different environment configurations:

- **Local Development** (`.env.local`): Points to `http://localhost:8080/api`
- **Production** (Azure Static Web Apps): Must be configured in Azure Portal

## 🔧 Local Development Setup

For local development, the `.env.local` file is automatically used and already configured:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8080/api
NEXT_PUBLIC_WS_URL=ws://localhost:8080/api/ws
```

**To run locally:**

1. Start the backend server (runs on port 8080 by default)
2. Start the frontend: `npm run dev`
3. The frontend will connect to `http://localhost:8080/api`

## ☁️ Production (Azure) Setup

### Step 1: Find Your Backend URL

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Container Apps** → **reviewers-backend-app**
3. In the **Overview** tab, copy the **Application URL**
   - Example: `https://reviewers-backend-app.kindwave-12345678.eastus.azurecontainerapps.io`
4. Add `/api` at the end
   - Final URL: `https://reviewers-backend-app.kindwave-12345678.eastus.azurecontainerapps.io/api`

### Step 2: Configure in Azure Static Web Apps

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Static Web Apps** → **Your Frontend App**
3. In the left menu, click **Settings** → **Environment variables**
4. Click **+ Add** and create two variables:

#### Variable 1: API URL
- **Name**: `NEXT_PUBLIC_API_URL`
- **Value**: `https://reviewers-backend-app.{your-unique-id}.{region}.azurecontainerapps.io/api`
- **Environment**: Production

#### Variable 2: WebSocket URL
- **Name**: `NEXT_PUBLIC_WS_URL`
- **Value**: `wss://reviewers-backend-app.{your-unique-id}.{region}.azurecontainerapps.io/api/ws`
  - Note: Use `wss://` (not `https://`) for WebSocket
- **Environment**: Production

5. Click **Save** at the top
6. Wait for the configuration to apply (~1-2 minutes)
7. Refresh your frontend application

## 🔍 Troubleshooting

### Error: "ERR_NAME_NOT_RESOLVED"

**Cause**: Backend URL is not configured or is invalid

**Solution**:
- Verify the URL is correct in Azure Portal
- Make sure it includes `https://` and `/api` suffix
- Wait 1-2 minutes after saving for changes to apply

### Error: "Cannot connect to backend"

**Cause**: Backend server is not running or URL is incorrect

**Solution**:
1. Check if backend is deployed and running:
   - Azure Portal → Container Apps → reviewers-backend-app
   - Check if "Status" shows "Running"
2. Test the health endpoint directly:
   ```bash
   curl https://reviewers-backend-app.{your-id}.{region}.azurecontainerapps.io/health
   ```
   Should return: `{"status":"healthy"}`

### Local Development: "Network Error"

**Cause**: Backend server is not running locally

**Solution**:
1. Navigate to backend directory: `cd backend`
2. Make sure environment variables are set (DATABASE_URL, SUPABASE_URL, etc.)
3. Start the backend server
4. Backend should start on port 8080

## 🧪 Testing the Connection

### Method 1: Browser Console

Open browser developer tools (F12) → Console → Run:

```javascript
fetch('https://your-backend-url/health')
  .then(r => r.json())
  .then(console.log)
```

Should return: `{status: "healthy"}`

### Method 2: Network Tab

1. Open browser developer tools (F12)
2. Go to **Network** tab
3. Try to sign in
4. Look for `/auth/signin` request
5. Check if it goes to the correct URL and returns a response

## 📝 URL Format Reference

| Environment | API URL Format | WebSocket URL Format |
|------------|----------------|---------------------|
| Local | `http://localhost:8080/api` | `ws://localhost:8080/api/ws` |
| Azure Production | `https://{app-name}.{id}.{region}.azurecontainerapps.io/api` | `wss://{app-name}.{id}.{region}.azurecontainerapps.io/api/ws` |

## ⚙️ Environment Variable Priority

Next.js loads environment variables in this order (highest to lowest priority):

1. `.env.local` (used for local development, **never** committed to git)
2. `.env.production` (used when building for production)
3. Default fallback in code: `http://localhost:8080/api`

## 🔒 Security Notes

- **Never** commit actual URLs to `.env.production`
- Always configure production URLs in Azure Portal
- `.env.local` is in `.gitignore` and won't be committed
- Production environment variables in Azure are encrypted

## 📚 Additional Resources

- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Azure Static Web Apps Configuration](https://learn.microsoft.com/en-us/azure/static-web-apps/application-settings)
- [Azure Container Apps Documentation](https://learn.microsoft.com/en-us/azure/container-apps/)
