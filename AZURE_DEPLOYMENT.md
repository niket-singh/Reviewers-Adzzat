# Azure Deployment Guide with GitHub Enterprise

This guide covers deploying your Next.js application to Azure using GitHub Enterprise.

## Prerequisites

1. Azure account with active subscription
2. GitHub Enterprise repository access
3. Azure CLI installed (optional, for command-line deployment)

## Deployment Options

### Option 1: Azure Static Web Apps (Static Export)

**Best for:** Static sites, simpler deployments
**Limitations:** No SSR, no ISR, no middleware
**Cost:** Free tier available

#### Setup Steps:

1. **Update next.config.js for static export:**
   ```javascript
   const nextConfig = {
     output: 'export',
     images: {
       unoptimized: true,
     },
   }
   ```

2. **Create Static Web App in Azure Portal:**
   - Go to Azure Portal → Create Resource → Static Web App
   - Select "GitHub Enterprise" as source
   - Authenticate with your GitHub Enterprise instance
   - Select repository: `Reviewers-Adzzat`
   - Select branch: `main`
   - Build preset: Next.js
   - App location: `/`
   - Output location: `out`

3. **Configure Build:**
   Azure will automatically create a workflow file in `.github/workflows/`

---

### Option 2: Azure App Service (Full Next.js)

**Best for:** Full Next.js features (SSR, ISR, middleware)
**Cost:** Starts at ~$13/month (Basic tier)

#### Setup via GitHub Actions:

1. **Create App Service in Azure Portal:**
   ```bash
   # Using Azure CLI
   az webapp create \
     --resource-group <resource-group-name> \
     --plan <app-service-plan-name> \
     --name <app-name> \
     --runtime "NODE|18-lts"
   ```

2. **Get Publish Profile:**
   - Go to Azure Portal → Your App Service
   - Click "Get publish profile" (download)
   - Copy the entire XML content

3. **Add GitHub Secret:**
   - Go to your GitHub Enterprise repository
   - Settings → Secrets and variables → Actions
   - New repository secret:
     - Name: `AZURE_WEBAPP_PUBLISH_PROFILE`
     - Value: (paste the publish profile XML)

4. **Update workflow file** (already created at `.github/workflows/azure-app-service-deploy.yml`)
   - Change `AZURE_WEBAPP_NAME` to your app name

5. **Push to trigger deployment:**
   ```bash
   git add .
   git commit -m "Add Azure deployment configuration"
   git push origin main
   ```

#### Manual Configuration in App Service:

After deployment, configure these in Azure Portal → App Service → Configuration:

**Application Settings:**
```
NODE_ENV=production
WEBSITE_NODE_DEFAULT_VERSION=18-lts
SCM_DO_BUILD_DURING_DEPLOYMENT=true
```

**Environment Variables** (add your actual values):
```
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-key>
# Add any other env vars from your .env file
```

---

### Option 3: Azure Container Apps (Docker)

**Best for:** Microservices, maximum control
**Requires:** Docker knowledge

1. **Create Dockerfile** (if not exists)
2. **Build and push to Azure Container Registry**
3. **Deploy to Azure Container Apps**

---

## GitHub Enterprise Specific Considerations

### 1. **Network Access**
If your GitHub Enterprise Server is behind a firewall:
- Whitelist Azure IP ranges
- Configure Azure VNet integration if needed

### 2. **Authentication**
- Use GitHub Enterprise OAuth Apps for Azure authentication
- Create Personal Access Token (PAT) with `repo` and `workflow` scopes
- Add PAT as GitHub secret if using self-hosted runners

### 3. **Self-Hosted Runners** (Optional)
For GitHub Enterprise Server with restricted network:

```yaml
# .github/workflows/azure-app-service-deploy.yml
jobs:
  build:
    runs-on: [self-hosted, linux]  # Use your runner labels
```

---

## Environment Variables Setup

### For Azure App Service:

1. **Via Azure Portal:**
   - App Service → Configuration → Application settings
   - Add each environment variable

2. **Via Azure CLI:**
   ```bash
   az webapp config appsettings set \
     --resource-group <resource-group> \
     --name <app-name> \
     --settings \
     NEXT_PUBLIC_SUPABASE_URL="<url>" \
     NEXT_PUBLIC_SUPABASE_ANON_KEY="<key>"
   ```

3. **Via GitHub Actions:**
   - Store secrets in GitHub Enterprise
   - Reference in workflow with `${{ secrets.SECRET_NAME }}`

---

## Deployment Commands

### Using Azure CLI:

```bash
# Login to Azure
az login

# Deploy from GitHub (one-time setup)
az webapp deployment source config \
  --name <app-name> \
  --resource-group <resource-group> \
  --repo-url https://github.com/niket-singh/Reviewers-Adzzat \
  --branch main \
  --git-token <github-pat>

# Manual deployment
az webapp deployment source sync \
  --name <app-name> \
  --resource-group <resource-group>
```

---

## Troubleshooting

### Build Fails
- Check Node.js version matches (18.x recommended)
- Verify all dependencies are in package.json
- Check build logs in Azure Portal → Deployment Center

### App Doesn't Start
- Check Application Insights logs
- Verify `PORT` environment variable
- Check startup command in Configuration → General settings

### GitHub Enterprise Connection Issues
- Verify webhook is active in GitHub repo settings
- Check Azure firewall rules
- Validate Personal Access Token hasn't expired

---

## Monitoring

### Enable Application Insights:
1. App Service → Application Insights → Enable
2. Monitor performance, errors, and usage

### View Logs:
```bash
# Stream logs
az webapp log tail --name <app-name> --resource-group <resource-group>

# Download logs
az webapp log download --name <app-name> --resource-group <resource-group>
```

---

## Cost Optimization

1. **Use Free/Basic tier** for development
2. **Auto-scaling**: Configure based on actual usage
3. **Stop/Start**: Stop app service when not needed (dev environments)
4. **Reserved instances**: For production (savings up to 72%)

---

## Next Steps

1. Choose your deployment option (Static Web Apps or App Service)
2. Set up Azure resources
3. Configure GitHub secrets
4. Update workflow file with your app name
5. Push to trigger deployment
6. Configure custom domain (optional)
7. Set up SSL certificate (free with Azure)

---

## Support Resources

- [Azure App Service Documentation](https://docs.microsoft.com/azure/app-service/)
- [Next.js Deployment Documentation](https://nextjs.org/docs/deployment)
- [GitHub Actions for Azure](https://github.com/Azure/actions)
