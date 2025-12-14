#!/bin/bash

# Azure Setup Script for Reviewers Platform
# This script creates all necessary Azure resources

set -e

# Configuration
RESOURCE_GROUP="adzzat-reviewers-rg"
LOCATION="eastus"
ACR_NAME="adzzatregistry"
CONTAINER_APP_ENV="reviewers-env"
BACKEND_APP_NAME="reviewers-backend-app"
FRONTEND_APP_NAME="reviewers-adzzat-frontend"
DB_SERVER_NAME="adzzat-reviewers-db"
DB_NAME="reviewers"
DB_ADMIN_USER="adzzatadmin"

echo "🚀 Starting Azure Resource Setup..."
echo "=================================="

# Step 1: Create Resource Group
echo "📦 Creating Resource Group..."
az group create --name $RESOURCE_GROUP --location $LOCATION

# Step 2: Create Azure Container Registry
echo "🐳 Creating Azure Container Registry..."
az acr create \
  --resource-group $RESOURCE_GROUP \
  --name $ACR_NAME \
  --sku Basic \
  --admin-enabled true

# Get ACR credentials
ACR_USERNAME=$(az acr credential show --name $ACR_NAME --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name $ACR_NAME --query passwords[0].value -o tsv)

echo "📝 ACR Username: $ACR_USERNAME"
echo "📝 ACR Password: [HIDDEN]"

# Step 3: Create PostgreSQL Database
echo "🗄️  Creating PostgreSQL Database..."
echo "⚠️  You will be prompted to enter a password for the database admin user"
read -sp "Enter database admin password: " DB_ADMIN_PASSWORD
echo

az postgres flexible-server create \
  --resource-group $RESOURCE_GROUP \
  --name $DB_SERVER_NAME \
  --location $LOCATION \
  --admin-user $DB_ADMIN_USER \
  --admin-password $DB_ADMIN_PASSWORD \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 14 \
  --public-access 0.0.0.0-255.255.255.255

# Create database
az postgres flexible-server db create \
  --resource-group $RESOURCE_GROUP \
  --server-name $DB_SERVER_NAME \
  --database-name $DB_NAME

# Get connection string
DB_HOST="${DB_SERVER_NAME}.postgres.database.azure.com"
DATABASE_URL="postgresql://${DB_ADMIN_USER}:${DB_ADMIN_PASSWORD}@${DB_HOST}:5432/${DB_NAME}?sslmode=require"

echo "✅ Database created successfully"
echo "📝 Connection String: $DATABASE_URL"

# Step 4: Create Container App Environment
echo "🌐 Creating Container App Environment..."
az containerapp env create \
  --name $CONTAINER_APP_ENV \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION

# Step 5: Create Backend Container App
echo "🔧 Creating Backend Container App..."
echo "⚠️  Please enter your environment variables:"
read -p "Enter SUPABASE_URL: " SUPABASE_URL
read -sp "Enter SUPABASE_SERVICE_KEY: " SUPABASE_SERVICE_KEY
echo
read -sp "Enter JWT_SECRET (min 32 chars): " JWT_SECRET
echo

az containerapp create \
  --name $BACKEND_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --environment $CONTAINER_APP_ENV \
  --image mcr.microsoft.com/azuredocs/containerapps-helloworld:latest \
  --target-port 8080 \
  --ingress external \
  --registry-server ${ACR_NAME}.azurecr.io \
  --registry-username $ACR_USERNAME \
  --registry-password $ACR_PASSWORD \
  --env-vars \
    DATABASE_URL="$DATABASE_URL" \
    SUPABASE_URL="$SUPABASE_URL" \
    SUPABASE_SERVICE_KEY="$SUPABASE_SERVICE_KEY" \
    JWT_SECRET="$JWT_SECRET" \
    PORT="8080" \
    CORS_ORIGINS="https://reviewer.adzzat.com,http://localhost:3000" \
  --cpu 0.5 \
  --memory 1.0Gi \
  --min-replicas 1 \
  --max-replicas 3

# Get backend URL
BACKEND_URL=$(az containerapp show \
  --name $BACKEND_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query properties.configuration.ingress.fqdn -o tsv)

echo "✅ Backend created successfully"
echo "📝 Backend URL: https://$BACKEND_URL"

# Step 6: Create Static Web App for Frontend
echo "🌍 Creating Azure Static Web App..."
az staticwebapp create \
  --name $FRONTEND_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --source https://github.com/YOUR_GITHUB_USERNAME/Reviewers-Adzzat \
  --branch main \
  --app-location "/" \
  --output-location ".next" \
  --login-with-github

# Get Static Web App URL
FRONTEND_URL=$(az staticwebapp show \
  --name $FRONTEND_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query defaultHostname -o tsv)

echo "✅ Frontend created successfully"
echo "📝 Frontend URL: https://$FRONTEND_URL"

# Step 7: Get deployment token for GitHub Actions
STATIC_WEB_APP_TOKEN=$(az staticwebapp secrets list \
  --name $FRONTEND_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query properties.apiKey -o tsv)

echo ""
echo "=================================="
echo "✅ Azure Setup Complete!"
echo "=================================="
echo ""
echo "📋 IMPORTANT: Add these secrets to your GitHub repository:"
echo ""
echo "GitHub Secrets (Settings > Secrets and variables > Actions > New repository secret):"
echo "------------------------------------------------------------------------------------"
echo "1. AZURE_CREDENTIALS (see below for how to create)"
echo "2. ACR_USERNAME = $ACR_USERNAME"
echo "3. ACR_PASSWORD = [The password shown above]"
echo "4. AZURE_STATIC_WEB_APPS_API_TOKEN = [The token shown below]"
echo ""
echo "Static Web App Deployment Token:"
echo "$STATIC_WEB_APP_TOKEN"
echo ""
echo "To create AZURE_CREDENTIALS, run this command:"
echo "az ad sp create-for-rbac --name 'reviewers-github-actions' --role contributor --scopes /subscriptions/\$(az account show --query id -o tsv)/resourceGroups/$RESOURCE_GROUP --sdk-auth"
echo ""
echo "📝 Resource URLs:"
echo "Backend API: https://$BACKEND_URL"
echo "Frontend: https://$FRONTEND_URL"
echo "Database: $DB_HOST"
echo ""
echo "🌐 Next Steps:"
echo "1. Add the GitHub secrets listed above"
echo "2. Update your frontend .env to point to: https://$BACKEND_URL"
echo "3. Configure custom domain in GoDaddy (instructions below)"
echo "4. Push to main branch to trigger deployment"
