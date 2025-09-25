# Yalla London - Phase-4C Production Ready

A luxury London guide platform with comprehensive admin dashboard and content management system.

## Phase-4C Readiness Features

### ✅ Hard Health Gates
- **Database as Single Source of Truth**: All data persists to PostgreSQL via Prisma
- **No JSON Storage in Production**: File-based storage blocked with `DEV_FILE_STORE_ONLY` guard
- **Admin Authentication Required**: All admin routes protected with `withAdminAuth` middleware
- **Automated CI Validation**: GitHub Actions blocks merges on any failure

### ✅ Production Database Configuration
- **Pooler URL**: Used for application traffic (`DATABASE_URL`)
- **Direct URL**: Used for migrations and maintenance (`DIRECT_URL`)
- **SSL Mode**: Uses `sslmode=require` in production URLs
- **Migration Status**: CI validates no drift with `prisma migrate status`

### ✅ Feature Flag Governance
All new features ship **disabled by default**:
- `FEATURE_AI_SEO_AUDIT=0`
- `FEATURE_CONTENT_PIPELINE=0`
- `FEATURE_WP_CONNECTOR=0`
- `FEATURE_WHITE_LABEL=0`
- `FEATURE_BACKLINK_OFFERS=0`

Enable progressively by setting environment variables to `1`.

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Environment variables configured

### Installation
```bash
# Install dependencies
yarn install --frozen-lockfile

# Generate Prisma client
yarn prisma generate

# Run migrations
PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=true yarn prisma migrate deploy

# Start development server
yarn dev
```

### Environment Variables
```bash
# Database (Required)
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
DIRECT_URL=postgresql://user:pass@host:5432/db?sslmode=require

# Authentication
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000
ADMIN_EMAILS=admin@example.com,admin2@example.com

# Feature Flags (All default to 0 - disabled)
FEATURE_AI_SEO_AUDIT=0
FEATURE_CONTENT_PIPELINE=0
FEATURE_WP_CONNECTOR=0
FEATURE_WHITE_LABEL=0
FEATURE_BACKLINK_OFFERS=0

# Storage
STORAGE_PROVIDER=supabase
SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

## Database Management

### Migrations
```bash
# Deploy migrations
PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=true yarn prisma migrate deploy

# Check migration status
yarn prisma migrate status

# Create new migration
yarn prisma migrate dev --name migration-name

# Reset database (development only)
yarn prisma migrate reset
```

### Rollback Procedures
```bash
# Mark migration as rolled back
yarn prisma migrate resolve --rolled-back migration-name

# Deploy previous migration
yarn prisma migrate deploy
```

## Testing

### Smoke Tests
```bash
# Run all smoke tests
yarn test:smoke

# Run smoke script
bash scripts/smoke.sh http://localhost:3000
```

### E2E Tests
```bash
# Run Playwright tests
yarn test:e2e

# Run specific test
yarn playwright test e2e/login.spec.ts
```

### API Tests
```bash
# Run Postman collection
newman run collections/yalla-phase4.postman_collection.json \
  --environment collections/environments/local.postman_environment.json
```

## CI/CD Pipeline

### GitHub Actions
The CI pipeline runs on every push and PR:

1. **Dependencies**: `yarn install --frozen-lockfile`
2. **Prisma**: `yarn prisma generate`
3. **Migrations**: `PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=true yarn prisma migrate deploy`
4. **Status Check**: `yarn prisma migrate status` (fails on drift)
5. **Linting**: `yarn lint && yarn typecheck`
6. **Tests**: `yarn test && yarn test:smoke`
7. **Build**: `yarn build`
8. **Postman**: Newman API tests
9. **E2E**: Playwright tests

### Blocking Conditions
Merges are blocked unless:
- ✅ All migrations deploy successfully
- ✅ No migration drift detected
- ✅ All tests pass (unit, smoke, E2E)
- ✅ Build completes without TypeScript errors
- ✅ All admin routes reject unauthenticated access
- ✅ No JSON persistence in production

## API Endpoints

### Health & Status
- `GET /api/health` - Basic health check
- `GET /api/phase4/status` - Admin-protected system status

### Admin Routes (Authentication Required)
- `POST /api/admin/editor/save` - Save article
- `POST /api/admin/media/upload` - Upload media
- `GET /api/admin/articles` - List articles

### Authentication
- `POST /api/auth/signin` - Admin login
- `GET /admin/login` - Login page

## Admin Dashboard

Access at `/admin` (requires authentication):

- **Command Center**: Overview and metrics
- **AI Tools & Prompt Studio**: Content generation
- **Topics & Pipeline**: Content planning
- **Content Hub**: Article management
- **Paste & Preview Editor**: Content creation
- **SEO Command Center**: SEO optimization
- **Site Control**: Site configuration
- **API & Keys Safe**: Credential management
- **Feature Flags & Health**: System monitoring

## Production Deployment

### Vercel
```bash
# Deploy to production
vercel --prod

# Check deployment status
vercel ls
```

### Environment Setup
1. Set all required environment variables in Vercel dashboard
2. Ensure `DATABASE_URL` and `DIRECT_URL` use `sslmode=require`
3. Set feature flags to `0` (disabled) initially
4. Configure admin emails in `ADMIN_EMAILS`

### Health Monitoring
- Monitor `/api/health` endpoint
- Check `/api/phase4/status` for system health
- Review CI pipeline status
- Monitor database connection health

## Troubleshooting

### Common Issues

**Migration Drift**
```bash
# Check status
yarn prisma migrate status

# Resolve drift
yarn prisma migrate resolve --rolled-back migration-name
```

**Database Connection**
```bash
# Test connection
yarn prisma db pull

# Check environment
echo $DATABASE_URL
```

**Authentication Issues**
- Verify `NEXTAUTH_SECRET` is set
- Check `ADMIN_EMAILS` configuration
- Ensure user email is in admin list

**Feature Flag Issues**
- All flags default to `0` (disabled)
- Set to `1` to enable specific features
- Check `/api/phase4/status` for current state

### Support
- Check CI logs for build issues
- Review application logs in Vercel
- Run smoke tests locally: `bash scripts/smoke.sh`
- Verify database connectivity and migrations

## Security

- All admin routes require authentication
- Database connections use SSL in production
- Feature flags prevent unauthorized feature access
- CI pipeline validates security requirements
- No secrets logged or exposed

## Performance

- Database connection pooling via `DATABASE_URL`
- Direct connections for migrations via `DIRECT_URL`
- Optimized Prisma queries
- Efficient file upload handling
- Cached feature flag reads
