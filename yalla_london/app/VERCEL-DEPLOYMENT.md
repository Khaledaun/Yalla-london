# Phase 4B Deployment Guide for Vercel

## Prerequisites

- Vercel CLI installed (`npm i -g vercel`)
- Node.js 18+ and Yarn
- PostgreSQL database (Neon.tech recommended)
- AWS S3 bucket configured
- Perplexity API key

## Environment Variables Required

### Database
```bash
DATABASE_URL=postgresql://username:password@host:5432/database
DIRECT_URL=postgresql://username:password@host:5432/database
```

### Authentication
```bash
NEXTAUTH_SECRET=your-nextauth-secret-32-chars-min
NEXTAUTH_URL=https://your-domain.vercel.app
```

### AWS S3
```bash
AWS_BUCKET_NAME=your-bucket-name
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
```

### Phase 4B APIs
```bash
PERPLEXITY_API_KEY=your_perplexity_api_key_here
GOOGLE_ANALYTICS_ACCESS_TOKEN=your_ga4_access_token
GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN=your_search_console_token
```

### Feature Flags (Start with all disabled)
```bash
FEATURE_PHASE4B_ENABLED=false
FEATURE_TOPIC_RESEARCH=false
FEATURE_AUTO_CONTENT_GENERATION=false
FEATURE_AUTO_PUBLISHING=false
FEATURE_SEO_AUTOMATION=false
FEATURE_ANALYTICS_REFRESH=false
FEATURE_CONTENT_SCHEDULING=false
FEATURE_DRAFT_MANAGEMENT=false
FEATURE_SEO_AUDIT_GATE=false
FEATURE_READABILITY_CHECK=false
FEATURE_TOPIC_APPROVAL_WORKFLOW=false
FEATURE_PIPELINE_MONITORING=false
```

## Deployment Steps

### 1. Install Dependencies
```bash
cd yalla_london/app
yarn install
```

### 2. Database Setup
```bash
# Generate Prisma client
npx prisma generate

# Apply database migrations (in production)
npx prisma migrate deploy
```

### 3. Build Validation
```bash
# Test build locally
npm run validate-build

# Run tests
npm run test:phase4b
```

### 4. Vercel Deployment
```bash
# Link project
vercel link

# Set environment variables
vercel env add DATABASE_URL
vercel env add NEXTAUTH_SECRET
vercel env add PERPLEXITY_API_KEY
# ... add all required environment variables

# Deploy
vercel --prod
```

### 5. Post-Deployment Setup
```bash
# Run database migrations on Vercel
vercel exec -- npx prisma migrate deploy

# Verify API endpoints
curl https://your-domain.vercel.app/api/phase4b/topics/research
# Should return: {"error":"Topic research feature is disabled"}
```

## Progressive Feature Enablement

### Phase 1: Basic Phase 4B (Safe)
```bash
vercel env add FEATURE_PHASE4B_ENABLED true
vercel env add FEATURE_PIPELINE_MONITORING true
```

### Phase 2: Topic Research
```bash
vercel env add FEATURE_TOPIC_RESEARCH true
vercel env add FEATURE_TOPIC_APPROVAL_WORKFLOW true
```

### Phase 3: Content Generation
```bash
vercel env add FEATURE_AUTO_CONTENT_GENERATION true
vercel env add FEATURE_DRAFT_MANAGEMENT true
```

### Phase 4: SEO & Publishing
```bash
vercel env add FEATURE_SEO_AUTOMATION true
vercel env add FEATURE_AUTO_PUBLISHING true
vercel env add FEATURE_SEO_AUDIT_GATE true
```

## Monitoring & Validation

### Health Checks
```bash
# Basic API health
curl https://your-domain.vercel.app/api/health

# Phase 4B endpoints (should return feature disabled initially)
curl https://your-domain.vercel.app/api/phase4b/topics/research
curl https://your-domain.vercel.app/api/phase4b/content/generate
curl https://your-domain.vercel.app/api/phase4b/seo/audit
```

### Admin Dashboard Access
- Navigate to: `https://your-domain.vercel.app/admin`
- Phase 4B features should be visible when enabled

## Troubleshooting

### Build Errors
1. Check Node.js version (18+)
2. Verify all dependencies installed: `yarn install`
3. Check TypeScript errors: `npx tsc --noEmit`

### Database Issues
1. Verify DATABASE_URL is correct
2. Run migrations: `npx prisma migrate deploy`
3. Generate client: `npx prisma generate`

### API Errors
1. Check feature flags are set correctly
2. Verify API keys are valid
3. Check Vercel function logs: `vercel logs`

### Environment Variables
1. List all variables: `vercel env ls`
2. Update variables: `vercel env add VARIABLE_NAME`
3. Remove variables: `vercel env rm VARIABLE_NAME`

## Security Notes

- All Phase 4B features are disabled by default
- API keys should be added as Vercel environment variables (not in code)
- Use least-privilege IAM policies for AWS S3
- Monitor API usage and set rate limits if needed

## Support

- Check logs: `vercel logs --follow`
- Test locally: `npm run dev`
- Database GUI: Use Prisma Studio (`npx prisma studio`)
- API testing: Use the built-in test suite (`npm run test:phase4b`)