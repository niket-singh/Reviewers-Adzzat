# 🚨 URGENT: Fix Azure Deployment Connection

Your frontend is trying to connect to `localhost:8080` but you're on Azure! Follow these steps to fix it NOW.

---

## ⚡ Quick Fix (5 minutes)

### Step 1: Get Your Backend URL (Choose ONE method)

#### Method A: Azure CLI (Fastest)
```bash
az containerapp show \
  --name reviewers-backend-app \
  --resource-group adzzat-reviewers-rg \
  --query properties.configuration.ingress.fqdn \
  -o tsv
```

**This will output something like:**
```
reviewers-backend-app.kindwave-a1b2c3d4.eastus.azurecontainerapps.io
```

#### Method B: Azure Portal (Most Reliable)

1. **Open:** https://portal.azure.com
2. **Search:** "Container Apps" in the top search bar
3. **Click:** `reviewers-backend-app`
4. **Copy:** The **Application URL** from the Overview page

   Example: `https://reviewers-backend-app.kindwave-12345678.eastus.azurecontainerapps.io`

#### Method C: GitHub Actions Logs

1. **Go to:** https://github.com/niket-singh/Reviewers-Adzzat/actions
2. **Find:** Latest successful workflow: "Trigger auto deployment for reviewers-backend-app"
3. **Open:** The workflow run
4. **Look for:** Container App URL in the deployment logs

---

### Step 2: Test Your Backend URL

Before configuring, verify the backend is working:

```bash
# Replace with YOUR actual URL
curl https://reviewers-backend-app.XXXXXXXX.REGION.azurecontainerapps.io/health
```

**Expected Response:**
```json
{"status":"healthy"}
```

If you see this, your backend is working! ✅

If not, check that your backend is deployed and running in Azure Portal.

---

### Step 3: Configure Azure Static Web Apps

1. **Open Azure Portal:** https://portal.azure.com

2. **Navigate to Static Web Apps:**
   - Search for "Static Web Apps" in the top search
   - Click on your Static Web App (check GitHub Actions for the exact name)

3. **Go to Environment Variables:**
   - In the left sidebar, click **Settings** → **Environment variables**

4. **Add TWO Environment Variables:**

   **Variable #1:**
   - Click **+ Add**
   - **Name:** `NEXT_PUBLIC_API_URL`
   - **Value:** `https://reviewers-backend-app.XXXXXXXX.REGION.azurecontainerapps.io/api`

     ⚠️ **IMPORTANT:**
     - Replace `XXXXXXXX.REGION` with your actual URL
     - Must end with `/api`
     - Must start with `https://`

   - **Environment:** `Production` (or leave default)
   - Click **OK**

   **Variable #2:**
   - Click **+ Add**
   - **Name:** `NEXT_PUBLIC_WS_URL`
   - **Value:** `wss://reviewers-backend-app.XXXXXXXX.REGION.azurecontainerapps.io/api/ws`

     ⚠️ **IMPORTANT:**
     - Same URL but with `wss://` (not `https://`)
     - Must end with `/api/ws`

   - **Environment:** `Production` (or leave default)
   - Click **OK**

5. **Save:**
   - Click **Save** button at the top
   - Wait for "Configuration saved successfully" message

---

### Step 4: Wait & Verify (2-3 minutes)

Azure needs time to apply the new configuration:

1. **Wait:** 2-3 minutes after saving
2. **Clear Cache:**
   - In your browser, press `Ctrl+Shift+R` (Windows/Linux)
   - Or `Cmd+Shift+R` (Mac)
3. **Test:** Try to sign in again
4. **Check Network Tab:**
   - Press `F12` → Network tab
   - Look for `/auth/signin` request
   - Should now go to `https://reviewers-backend-app.XXXXXXXX.../api/auth/signin`
   - Should NOT be `localhost:8080` anymore

---

## 🔍 Troubleshooting

### Still seeing "localhost:8080"?

**Cause:** Browser cache or Static Web App hasn't updated yet

**Fix:**
1. Hard refresh: `Ctrl+Shift+R` / `Cmd+Shift+R`
2. Clear browser cache completely
3. Try incognito/private window
4. Wait another 2-3 minutes

### "ERR_CONNECTION_REFUSED" with Azure URL?

**Cause:** Backend is not running or URL is wrong

**Fix:**
1. Check backend health:
   ```bash
   curl https://YOUR-BACKEND-URL/health
   ```
2. Verify backend is running:
   - Azure Portal → Container Apps → reviewers-backend-app
   - Status should be "Running"
3. Check URL has `/api` at the end

### "ERR_NAME_NOT_RESOLVED"?

**Cause:** Invalid URL or typo

**Fix:**
1. Double-check the URL you entered
2. Make sure it's the FULL URL from Azure Portal
3. Include `https://` at the start
4. Include `/api` at the end

---

## 📋 Quick Reference

### Correct URL Format:

| Variable | Format |
|----------|--------|
| `NEXT_PUBLIC_API_URL` | `https://reviewers-backend-app.{id}.{region}.azurecontainerapps.io/api` |
| `NEXT_PUBLIC_WS_URL` | `wss://reviewers-backend-app.{id}.{region}.azurecontainerapps.io/api/ws` |

### Example (Replace with YOUR values):

```
NEXT_PUBLIC_API_URL=https://reviewers-backend-app.kindwave-a1b2c3d4.eastus.azurecontainerapps.io/api
NEXT_PUBLIC_WS_URL=wss://reviewers-backend-app.kindwave-a1b2c3d4.eastus.azurecontainerapps.io/api/ws
```

---

## ✅ Success Indicators

You'll know it's working when:

1. ✅ Browser Network tab shows requests to Azure URL (not localhost)
2. ✅ Sign in/sign up works without "Network Error"
3. ✅ No more `ERR_CONNECTION_REFUSED` errors
4. ✅ Console shows successful API responses

---

## 🆘 Need Help?

If you're still stuck after following all steps:

1. **Check backend health endpoint:**
   ```bash
   curl https://YOUR-BACKEND-URL/health
   ```

2. **Verify environment variables in Azure:**
   - Go to Static Web Apps → Environment variables
   - Make sure both variables are there
   - Click "Edit" to verify the values

3. **Check browser console:**
   - Press F12 → Console tab
   - Look for any error messages
   - Check Network tab for failed requests

4. **Verify Static Web App name:**
   - Check `.github/workflows/azure-frontend.yml`
   - Look for the actual app name in the workflow

---

## 🚀 After Configuration

Once configured, your app will:
- ✅ Connect to Azure backend automatically
- ✅ Work from anywhere (not just your machine)
- ✅ Handle authentication properly
- ✅ Support real-time features via WebSocket

The configuration persists - you only need to do this once!
