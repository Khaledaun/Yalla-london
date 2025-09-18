# Deployment Guide for Yalla London Platform

This guide covers deploying the Yalla London platform to Vercel or other cloud providers after the PR #44 comprehensive deployment fixes.

## Prerequisites

Before deployment, ensure you have:

- [ ] Database access (PostgreSQL)
- [ ] Supabase project (recommended but optional)
- [ ] Environment variables configured
- [ ] Domain/subdomain for deployment

## Environment Variables Setup

### Required Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

### Critical Variables

1. **Database Configuration**
   ```env
   DATABASE_URL=postgresql://username:password@host:port/database
   DIRECT_URL=postgresql://username:password@host:port/database
   ```

2. **Authentication**
   ```env
   NEXTAUTH_SECRET=your-32-character-secret-key-here
   NEXTAUTH_URL=https://your-domain.com
   ADMIN_EMAILS=admin@yourcompany.com
   ```

3. **Supabase (Optional but Recommended)**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

### Optional Variables

- AWS S3 for file uploads
- Google Analytics for tracking
- Social media API keys
- Email service configuration

## Deployment Steps

### 1. Pre-Deployment Validation

```bash
# Run smoke tests
yarn test:smoke

# Run deployment validation
yarn validate:deployment

# Verify build works
yarn build
```

### 2. Database Setup

If deploying for the first time:

```bash
# Generate Prisma client
yarn build:prisma

# Run migrations
npx prisma migrate deploy

# Verify database connection
npx prisma db pull
```

### 3. Vercel Deployment

#### Option A: GitHub Integration (Recommended)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push

#### Option B: Manual Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Set environment variables
vercel env add DATABASE_URL
vercel env add NEXTAUTH_SECRET
# ... add other required variables
```

### 4. Post-Deployment Verification

1. **Health Check**: Visit `/api/health`
2. **Feature Status**: Visit `/api/phase4/status`
3. **Admin Access**: Test admin login
4. **Database**: Verify data access in admin panel

## Troubleshooting

### Build Failures

**Issue**: Database connection fails during build
**Solution**: The build process now gracefully handles missing database connections

**Issue**: Prisma client generation fails
**Solution**: Build uses fallback mechanisms and retries

### Runtime Issues

**Issue**: 500 errors on pages using database
**Solution**: Check DATABASE_URL and DIRECT_URL are correctly set

**Issue**: Authentication not working
**Solution**: Verify NEXTAUTH_SECRET and NEXTAUTH_URL are set

### Environment Issues

**Issue**: Features not working
**Solution**: Check feature flags in environment variables

**Issue**: Supabase errors
**Solution**: Application works without Supabase, uses mock client

## Monitoring

### Health Endpoints

- `/api/health` - Basic application health
- `/api/phase4/status` - Feature and database status
- `/api/feature-flags/refresh` - Feature flag management

### Logs

Monitor these patterns in deployment logs:

- `✅ Build preparation complete` - Successful build
- `⚠️ Supabase not configured` - Non-critical warning
- `❌ Database not accessible` - Needs attention

## Production Checklist

- [ ] Environment variables configured
- [ ] Database accessible and migrated
- [ ] Admin user accounts created
- [ ] SSL certificate configured
- [ ] Custom domain configured
- [ ] Monitoring/alerting configured
- [ ] Backup strategy implemented
- [ ] Performance testing completed

## Feature Flags

The platform uses feature flags for gradual rollout:

```env
# Core features (recommended enabled)
FEATURE_AUDIT_SYSTEM=true
FEATURE_PERFORMANCE_MONITORING=true

# Content features (enable as needed)
FEATURE_TOPICS_RESEARCH=false
FEATURE_CONTENT_PIPELINE=false
FEATURE_AUTO_PUBLISHING=false

# Advanced features (enterprise)
FEATURE_ENTERPRISE_FEATURES=false
FEATURE_ADVANCED_CRON=false
```

## Security Considerations

1. **Secrets**: Never commit `.env` files
2. **Admin Access**: Limit ADMIN_EMAILS to trusted addresses
3. **Database**: Use read-only users for analytics queries
4. **API Keys**: Rotate keys regularly
5. **HTTPS**: Always use SSL in production

## Support

For deployment issues:

1. Check the deployment logs
2. Run smoke tests locally
3. Verify environment variables
4. Test database connectivity
5. Check feature flag configuration

The platform is designed to be resilient and will gracefully handle missing configurations with appropriate fallbacks.