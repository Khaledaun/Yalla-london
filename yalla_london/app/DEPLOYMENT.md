# Deployment Guide for PR #44

This document provides comprehensive deployment validation and troubleshooting guidance for PR #44 (copilot/fix-07aa333c-423c-4a4a-a57a-e13ca27e594b).

## 🎯 Overview

PR #44 introduces Supabase integration and enhanced content management features. This guide ensures successful deployment on Vercel with proper environment configuration.

## 🔧 Pre-Deployment Requirements

### Required Environment Variables

```bash
# Supabase Configuration (REQUIRED for PR #44)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Database Configuration (REQUIRED)
DATABASE_URL=postgresql://user:pass@host:5432/database
DIRECT_URL=postgresql://user:pass@host:5432/database

# Authentication (REQUIRED)
NEXTAUTH_SECRET=your-32-character-secret-key-minimum
NEXTAUTH_URL=https://your-domain.com

# Admin Configuration (RECOMMENDED)
ADMIN_EMAILS=admin@yourcompany.com,owner@yourcompany.com
```

### Optional Configuration

```bash
# AWS S3 for file uploads
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_BUCKET_NAME=your-bucket-name
AWS_REGION=us-east-1

# Error Tracking
SENTRY_DSN=https://your-sentry-dsn
SENTRY_ENVIRONMENT=production

# Feature Flags (OFF by default for safe deployment)
FEATURE_TOPICS_RESEARCH=false
FEATURE_CONTENT_PIPELINE=false
FEATURE_AI_SEO_AUDIT=true
FEATURE_ANALYTICS_DASHBOARD=false
FEATURE_MEDIA_ENRICH=false
FEATURE_PROMPT_CONTROL=false
```

## 🚀 Deployment Process

### 1. Pre-Deployment Validation

Run the deployment tests to validate readiness:

```bash
cd yalla_london/app
npm test tests/deployment/
```

This will run:
- ✅ Supabase integration tests
- ✅ Environment variable validation
- ✅ API endpoint tests
- ✅ Build compatibility tests

### 2. Vercel Deployment

```bash
# Deploy to Vercel
vercel --prod

# Or deploy specific environment
vercel --target production
```

### 3. Post-Deployment Validation

After deployment, verify these endpoints:

```bash
# Health check
curl https://your-domain.com/api/health

# Feature flags status
curl https://your-domain.com/api/feature-flags

# Database connectivity (if configured)
curl https://your-domain.com/api/admin/settings
```

## 🔍 Validation Tests

### Running Deployment Tests

```bash
# Run all deployment tests
npm test tests/deployment/

# Run specific test suites
npm test tests/deployment/supabase-integration.test.ts
npm test tests/deployment/environment-validation.test.ts
npm test tests/deployment/api-integration.test.ts
npm test tests/deployment/smoke-test.test.ts
```

### Test Coverage

The deployment tests validate:

1. **Supabase Integration**
   - Environment variable format validation
   - Client initialization (mock fallback)
   - Database connectivity tests
   - Build-time compatibility

2. **Environment Variables**
   - Required variables presence
   - Format validation
   - Feature flag configuration
   - Security settings

3. **API Integration**
   - All PR #44 endpoints availability
   - Mock request/response handling
   - Database integration
   - Error handling

4. **Deployment Smoke Tests**
   - TypeScript compilation
   - Next.js compatibility
   - Memory usage validation
   - Security configuration

## 🚨 Troubleshooting

### Common Issues

#### 1. Supabase Connection Errors

**Symptoms:**
```
Error: Invalid Supabase URL or key
```

**Solutions:**
```bash
# Check environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# Validate URL format
curl -I https://your-project.supabase.co

# Test connection
npm test tests/deployment/supabase-integration.test.ts
```

#### 2. Database Connection Issues

**Symptoms:**
```
Error: Can't reach database server
```

**Solutions:**
```bash
# Check database URL format
echo $DATABASE_URL

# Test connection directly
npx prisma db pull

# Validate schema
npx prisma generate
```

#### 3. Build Failures

**Symptoms:**
```
Error: Module not found or compilation error
```

**Solutions:**
```bash
# Clear cache and reinstall
rm -rf .next node_modules
npm install

# Check TypeScript compilation
npm run build:deps
npx tsc --noEmit

# Run smoke tests
npm test tests/deployment/smoke-test.test.ts
```

#### 4. Feature Flag Issues

**Symptoms:**
```
Features not working as expected
```

**Solutions:**
```bash
# Check feature flag status
curl https://your-domain.com/api/feature-flags

# Refresh feature flags
curl -X POST https://your-domain.com/api/feature-flags/refresh

# Validate environment variables
npm test tests/deployment/environment-validation.test.ts
```

### Error Logs Analysis

Check these logs for deployment issues:

1. **Vercel Build Logs**
   - Look for TypeScript compilation errors
   - Check dependency installation issues
   - Validate environment variable access

2. **Runtime Logs**
   - Database connection errors
   - API endpoint failures
   - Feature flag initialization issues

3. **Browser Console**
   - Client-side JavaScript errors
   - Network request failures
   - Authentication issues

## ✅ Deployment Checklist

### Pre-Deployment
- [ ] All required environment variables set
- [ ] Supabase project configured and accessible
- [ ] Database URLs pointing to correct instances
- [ ] Authentication secrets configured
- [ ] Admin emails configured
- [ ] Feature flags set appropriately

### During Deployment
- [ ] Vercel build completes successfully
- [ ] No TypeScript compilation errors
- [ ] Dependencies install correctly
- [ ] Environment variables accessible during build

### Post-Deployment
- [ ] Application loads without errors
- [ ] Database connectivity working
- [ ] Authentication flow functional
- [ ] API endpoints responding
- [ ] Feature flags operating correctly
- [ ] Admin functionality accessible

## 🔄 Rollback Procedure

If deployment fails:

1. **Immediate Rollback**
   ```bash
   # Rollback to previous deployment
   vercel rollback
   ```

2. **Feature Flag Rollback**
   ```bash
   # Disable problematic features
   vercel env add FEATURE_TOPICS_RESEARCH false
   vercel env add FEATURE_CONTENT_PIPELINE false
   # Redeploy
   vercel --prod
   ```

3. **Environment Reset**
   ```bash
   # Reset to minimal configuration
   vercel env rm NEXT_PUBLIC_SUPABASE_URL
   vercel env rm SUPABASE_SERVICE_ROLE_KEY
   # Redeploy with mock clients
   vercel --prod
   ```

## 📊 Monitoring & Health Checks

### Health Endpoints

- `GET /api/health` - Overall application health
- `GET /api/feature-flags` - Feature flag status
- `GET /api/admin/settings` - Database connectivity (requires auth)

### Key Metrics to Monitor

1. **Response Times**
   - API endpoint latency
   - Database query performance
   - Supabase operation speed

2. **Error Rates**
   - 5xx server errors
   - Database connection failures
   - Authentication issues

3. **Resource Usage**
   - Memory consumption
   - CPU utilization
   - Database connection pool

## 🎯 Success Criteria

PR #44 deployment is successful when:

✅ All deployment tests pass  
✅ Application builds without errors  
✅ Database connectivity established  
✅ Supabase integration functional  
✅ Feature flags operational  
✅ API endpoints responding  
✅ Authentication working  
✅ Admin access functional  

## 📞 Support

If you encounter issues not covered in this guide:

1. Check the test output from `npm test tests/deployment/`
2. Review Vercel build logs
3. Validate environment variable configuration
4. Test individual components using the provided tests

For urgent deployment issues, ensure all environment variables are correctly set and run the full deployment test suite for detailed diagnostics.