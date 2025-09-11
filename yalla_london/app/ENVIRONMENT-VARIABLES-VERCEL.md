# Environment Variables for Vercel Deployment

This document lists all environment variables required for deploying Yalla London with Phase 4B features to Vercel.

## Required Variables (Must Set Manually)

### Database Connection
```bash
DATABASE_URL=postgresql://username:password@host:5432/database
DIRECT_URL=postgresql://username:password@host:5432/database
```
**Source**: Neon.tech, Supabase, or your PostgreSQL provider

### Authentication
```bash
NEXTAUTH_SECRET=your-secret-32-chars-minimum
NEXTAUTH_URL=https://your-domain.vercel.app
```
**Generate**: `openssl rand -base64 32`

### AWS S3 Storage
```bash
AWS_BUCKET_NAME=your-bucket-name
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_FOLDER_PREFIX=uploads/
```
**Source**: AWS IAM Console

### Phase 4B API Keys
```bash
PERPLEXITY_API_KEY=pplx-...
GOOGLE_ANALYTICS_ACCESS_TOKEN=ya29...
GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN=ya29...
```
**Source**: 
- Perplexity: https://www.perplexity.ai/settings/api
- Google: Google Cloud Console OAuth2

## Feature Flags (Safe Defaults)

### Phase 4B Master Controls
```bash
FEATURE_PHASE4B_ENABLED=false
FEATURE_PIPELINE_MONITORING=false
```

### Content Pipeline
```bash
FEATURE_TOPIC_RESEARCH=false
FEATURE_AUTO_CONTENT_GENERATION=false
FEATURE_AUTO_PUBLISHING=false
FEATURE_CONTENT_SCHEDULING=false
FEATURE_DRAFT_MANAGEMENT=false
```

### SEO & Analytics
```bash
FEATURE_SEO_AUTOMATION=false
FEATURE_ANALYTICS_REFRESH=false
FEATURE_SEO_AUDIT_GATE=false
FEATURE_READABILITY_CHECK=false
```

### Admin Features
```bash
FEATURE_TOPIC_APPROVAL_WORKFLOW=false
```

### Legacy Feature Flags
```bash
FEATURE_SEO=1
FEATURE_EMBEDS=1
FEATURE_MEDIA=1
FEATURE_HOMEPAGE_BUILDER=1
```

## Pipeline Configuration

### Content Generation Settings
```bash
PIPELINE_POSTS_PER_DAY=2
PIPELINE_AUTO_PUBLISH=false
PIPELINE_QUALITY_THRESHOLD=70
PIPELINE_DRAFT_BACKLOG_TARGET=30
```

### Content Categories
```bash
PIPELINE_CATEGORIES=london_travel,london_events,london_football,london_hidden_gems
PIPELINE_LOCALES=en,ar
```

## Cron Job Controls

```bash
CRON_CONTENT_PIPELINE_ENABLED=false
CRON_TOPIC_RESEARCH_ENABLED=false
CRON_ANALYTICS_REFRESH_ENABLED=false
CRON_SEO_AUDIT_ENABLED=false
```

## Monitoring & Alerts (Optional)

```bash
SENTRY_DSN=https://...@sentry.io/...
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
LOG_LEVEL=info
PERFORMANCE_MONITORING_ENABLED=false
```

## Analytics (Optional)
```bash
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=G-...
```

## Setting Variables in Vercel

### Command Line Method
```bash
# Required variables
vercel env add DATABASE_URL
vercel env add NEXTAUTH_SECRET
vercel env add AWS_BUCKET_NAME
vercel env add AWS_ACCESS_KEY_ID
vercel env add AWS_SECRET_ACCESS_KEY
vercel env add PERPLEXITY_API_KEY

# Feature flags (start disabled)
vercel env add FEATURE_PHASE4B_ENABLED false
vercel env add FEATURE_TOPIC_RESEARCH false
vercel env add FEATURE_AUTO_CONTENT_GENERATION false
vercel env add FEATURE_AUTO_PUBLISHING false
vercel env add FEATURE_SEO_AUTOMATION false

# Configuration
vercel env add PIPELINE_POSTS_PER_DAY 2
vercel env add PIPELINE_QUALITY_THRESHOLD 70
vercel env add LOG_LEVEL info
```

### Vercel Dashboard Method
1. Go to your project in Vercel dashboard
2. Navigate to Settings → Environment Variables
3. Add each variable with appropriate values
4. Set environment: Production, Preview, Development

## Variable Validation Checklist

### Before Deployment
- [ ] DATABASE_URL connects successfully
- [ ] NEXTAUTH_SECRET is 32+ characters
- [ ] AWS credentials have proper S3 permissions
- [ ] PERPLEXITY_API_KEY is valid and has quota
- [ ] All Phase 4B features are set to `false`

### After Deployment
- [ ] Test database connection: `/api/health`
- [ ] Verify feature flags: `/api/phase4b/topics/research` should return "disabled"
- [ ] Check admin dashboard loads: `/admin`
- [ ] Validate environment with: `vercel env ls`

## Progressive Enablement Plan

### Phase 1: Enable Basic Monitoring
```bash
vercel env add FEATURE_PHASE4B_ENABLED true
vercel env add FEATURE_PIPELINE_MONITORING true
```
**Test**: Admin dashboard shows Phase 4B section

### Phase 2: Enable Topic Research
```bash
vercel env add FEATURE_TOPIC_RESEARCH true
vercel env add FEATURE_TOPIC_APPROVAL_WORKFLOW true
```
**Test**: `/api/phase4b/topics/research` accepts requests

### Phase 3: Enable Content Generation
```bash
vercel env add FEATURE_AUTO_CONTENT_GENERATION true
vercel env add FEATURE_DRAFT_MANAGEMENT true
```
**Test**: Content generation creates drafts

### Phase 4: Enable SEO & Publishing
```bash
vercel env add FEATURE_SEO_AUTOMATION true
vercel env add FEATURE_AUTO_PUBLISHING true
vercel env add FEATURE_SEO_AUDIT_GATE true
```
**Test**: End-to-end content pipeline

## Security Notes

- Never commit API keys or secrets to Git
- Use Vercel's encrypted environment variables
- Rotate API keys regularly
- Monitor API usage and set alerts
- Use least-privilege IAM policies for AWS

## Backup Strategy

Keep a backup of critical environment variables:
```bash
# Export current env vars
vercel env ls > vercel-env-backup.txt

# Pull to local for backup
vercel env pull .env.backup
```

Store securely and version control the **structure** (not values) of your environment configuration.