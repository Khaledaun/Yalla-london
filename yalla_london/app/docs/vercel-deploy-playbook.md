# 🚀 Vercel Deployment Playbook

This guide provides **dashboard-only** deployment steps for Yalla London, with no CLI commands required.

## 📋 Pre-Deployment Checklist

Before deploying, ensure you have:
- [ ] GitHub repository with latest code
- [ ] Vercel account (free tier is sufficient)
- [ ] Database connection string (PostgreSQL)
- [ ] Required API keys (optional, with graceful fallbacks)

---

## 🎯 **Path A: Git Integration Enabled (Recommended)**

### **Step 1: Link Repository to Vercel**

1. **Go to Vercel Dashboard**
   - Visit [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click **"New Project"**

2. **Import from Git**
   - Select **"Import Git Repository"**
   - Choose your GitHub repository: `Yalla-london`
   - Click **"Import"**

3. **Configure Project Settings**
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `yalla_london/app`
   - **Build Command**: `yarn build` (auto-detected)
   - **Output Directory**: `.next` (auto-detected)
   - **Install Command**: `yarn install --frozen-lockfile --ignore-engines`

4. **Environment Variables Setup**
   - Click **"Environment Variables"** tab
   - Add variables from [Environment Checklist](./vercel-env-checklist.md)
   - Set for **Production**, **Preview**, and **Development** environments

### **Step 2: Deploy**

1. **Automatic Deployment**
   - Vercel automatically builds and deploys on every push to main branch
   - Preview deployments are created for pull requests

2. **Manual Deployment**
   - Go to **"Deployments"** tab
   - Click **"Redeploy"** on latest deployment
   - Or push new commits to trigger automatic deployment

### **Step 3: Post-Deploy Verification**

1. **Check Deployment Status**
   - Go to **"Deployments"** tab
   - Verify latest deployment shows **"Ready"** status
   - Check build logs for any errors

2. **Test Health Endpoints**
   - Open: `https://your-app.vercel.app/api/health`
   - Expected: `{"ok": true, "version": "1.0.0", "timestamp": "..."}`
   - Open: `https://your-app.vercel.app/api/seo/health`
   - Expected: `{"ok": true/false, "seo": {...}, "reasons": [...]}`

3. **Test Ready Page**
   - Open: `https://your-app.vercel.app/ready`
   - Expected: Green "Ready" status with health check results

---

## 🔧 **Path B: Git Integration Not Available**

### **Alternative 1: Import via Vercel Dashboard**

1. **Manual Import**
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click **"New Project"**
   - Select **"Import Git Repository"**
   - If GitHub integration is not available:
     - Click **"Configure GitHub App"**
     - Follow GitHub authorization process
     - Grant necessary permissions

2. **Repository Access**
   - Ensure Vercel has access to your repository
   - Check repository settings in GitHub
   - Verify Vercel GitHub App is installed

### **Alternative 2: Manual Upload (Not Recommended)**

If Git integration is completely unavailable:

1. **Create Deployment Package**
   - Download repository as ZIP
   - Extract to local folder
   - Remove unnecessary files (`.git`, `node_modules`, etc.)

2. **Upload to Vercel**
   - Use Vercel CLI (if available): `vercel --prod`
   - Or use Vercel's drag-and-drop deployment feature

---

## ⚙️ **Vercel Dashboard Configuration**

### **Project Settings**

1. **General Settings**
   ```
   Project Name: yalla-london
   Framework: Next.js
   Root Directory: yalla_london/app
   Build Command: yarn build
   Output Directory: .next
   Install Command: yarn install --frozen-lockfile --ignore-engines
   ```

2. **Environment Variables**
   - Go to **Settings** → **Environment Variables**
   - Add all variables from [Environment Checklist](./vercel-env-checklist.md)
   - Set appropriate values for each environment

3. **Functions Configuration**
   ```
   API Routes Timeout: 30 seconds (default)
   Memory: 1024 MB (default)
   Node.js Version: 18.x (auto-detected)
   ```

### **Domain Configuration**

1. **Custom Domain (Optional)**
   - Go to **Settings** → **Domains**
   - Add your custom domain: `yalla-london.com`
   - Configure DNS records as instructed

2. **SSL Certificate**
   - Automatically provisioned by Vercel
   - No additional configuration needed

---

## 🔍 **Post-Deployment Verification**

### **1. Health Check URLs**

Test these URLs after deployment:

| URL | Expected Response | Purpose |
|-----|------------------|---------|
| `/api/health` | `{"ok": true, "version": "1.0.0"}` | General health |
| `/api/seo/health` | `{"ok": true/false, "seo": {...}}` | SEO system status |
| `/ready` | Green "Ready" page | Visual health dashboard |

### **2. Expected JSON Responses**

#### **General Health (`/api/health`)**
```json
{
  "ok": true,
  "version": "1.0.0",
  "timestamp": "2024-01-15T10:00:00.000Z",
  "environment": "production",
  "uptime": 123.45,
  "memory": {
    "used": 45,
    "total": 128
  },
  "services": {
    "database": "unknown",
    "seo": "unknown"
  }
}
```

#### **SEO Health (`/api/seo/health`)**
```json
{
  "ok": true,
  "timestamp": "2024-01-15T10:00:00.000Z",
  "environment": "production",
  "seo": {
    "enabled": true,
    "aiEnabled": true,
    "analyticsEnabled": true,
    "databaseConnected": true
  },
  "featureFlags": {
    "FEATURE_SEO": {"enabled": true, "hasDependencies": false, "missingDependencies": []},
    "FEATURE_AI_SEO_AUDIT": {"enabled": true, "hasDependencies": true, "missingDependencies": []}
  },
  "reasons": ["All checks passed"],
  "recommendations": []
}
```

### **3. Error Scenarios**

#### **SEO Disabled**
```json
{
  "ok": false,
  "seo": {
    "enabled": false,
    "databaseConnected": false
  },
  "reasons": [
    "SEO features are disabled (FEATURE_SEO or NEXT_PUBLIC_FEATURE_SEO not set to 1)"
  ],
  "recommendations": [
    "Set FEATURE_SEO=1 and NEXT_PUBLIC_FEATURE_SEO=1 to enable SEO features"
  ]
}
```

#### **Database Issues**
```json
{
  "ok": false,
  "seo": {
    "enabled": true,
    "databaseConnected": false
  },
  "reasons": [
    "SEO database tables do not exist - run migration: npx prisma db push"
  ]
}
```

---

## 🎯 **What Success Looks Like**

### **✅ Successful Deployment**

1. **Build Status**: Green "Ready" in Vercel dashboard
2. **Health Endpoints**: Return `{"ok": true}` with proper data
3. **Ready Page**: Shows green "Ready" status with all checks passing
4. **SEO System**: All feature flags enabled, database connected
5. **No Errors**: Clean build logs, no runtime errors

### **⚠️ Partial Success (Graceful Degradation)**

1. **Build Status**: Green "Ready" in Vercel dashboard
2. **Health Endpoints**: Return `{"ok": true}` for general health
3. **SEO Health**: May show `{"ok": false}` with specific reasons
4. **Feature Flags**: Some features disabled due to missing API keys
5. **Graceful Fallbacks**: App works without optional features

### **❌ Failed Deployment**

1. **Build Status**: Red "Failed" in Vercel dashboard
2. **Build Logs**: Show specific error messages
3. **Health Endpoints**: Return 500 errors or don't respond
4. **Common Issues**: Missing environment variables, build errors, database connection failures

---

## 🚨 **Troubleshooting**

### **Build Failures**

1. **Check Build Logs**
   - Go to **Deployments** → **Latest Deployment** → **Build Logs**
   - Look for specific error messages
   - Common issues: missing dependencies, TypeScript errors, environment variables

2. **Environment Variables**
   - Verify all required variables are set
   - Check variable names match exactly (case-sensitive)
   - Ensure no extra spaces or quotes

3. **Database Connection**
   - Verify `DATABASE_URL` is correct
   - Check database is accessible from Vercel
   - Ensure database has required tables

### **Runtime Errors**

1. **Function Timeouts**
   - Check API route performance
   - Optimize database queries
   - Increase function timeout in `vercel.json`

2. **Memory Issues**
   - Monitor function memory usage
   - Optimize code for memory efficiency
   - Consider upgrading Vercel plan

### **SEO System Issues**

1. **Feature Flags**
   - Ensure `FEATURE_SEO=1` and `NEXT_PUBLIC_FEATURE_SEO=1`
   - Check all required flags are enabled

2. **Database Tables**
   - Run database migration: `npx prisma db push`
   - Verify SEO tables exist in database

3. **API Keys**
   - Check optional API keys are set if features are enabled
   - Verify key format and permissions

---

## 📞 **Support & Resources**

### **Vercel Resources**
- [Vercel Documentation](https://vercel.com/docs)
- [Next.js on Vercel](https://vercel.com/docs/frameworks/nextjs)
- [Environment Variables](https://vercel.com/docs/projects/environment-variables)

### **Project Resources**
- [Environment Checklist](./vercel-env-checklist.md)
- [SEO Activation Guide](./seo-activation.md)
- [Deployment Verification Report](./deploy-verification-report.md)

### **Getting Help**
1. **Check Health Endpoints**: First step for any issues
2. **Review Build Logs**: Look for specific error messages
3. **Verify Environment Variables**: Ensure all required variables are set
4. **Test Locally**: Reproduce issues in local development
5. **Create Issue**: Document the problem with logs and configuration

---

## 🎉 **Deployment Complete!**

Once all verification steps pass:

1. **Update DNS**: Point your domain to Vercel (if using custom domain)
2. **Monitor Performance**: Check Vercel analytics and function logs
3. **Set Up Monitoring**: Configure alerts for health endpoint failures
4. **Document Changes**: Update any deployment documentation
5. **Team Notification**: Inform team of successful deployment

**Your Yalla London application is now live and ready for users! 🚀**




