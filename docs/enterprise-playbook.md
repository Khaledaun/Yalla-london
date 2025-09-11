# Enterprise Playbook

## API Route Conventions

### Next.js App Router API Routes

All API endpoints in this application follow the Next.js App Router convention:

- **Location**: `/app/api/[endpoint]/route.ts`
- **Exports**: Named exports for HTTP methods (`GET`, `POST`, `PUT`, `DELETE`)
- **Response Format**: Use `NextResponse` for all responses
- **Request Handling**: Use `NextRequest` for request processing

#### Standard API Route Structure

```typescript
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({ message: 'Hello World' });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  return NextResponse.json({ received: body });
}
```

### Admin-Only Endpoints

Admin-only endpoints use the `withAdminAuth` middleware:

```typescript
import { withAdminAuth } from '@/lib/admin-middleware';

export const GET = withAdminAuth(async (request: NextRequest) => {
  // Admin-only logic here
  return NextResponse.json({ admin: 'data' });
});
```

#### Authentication Requirements

- Admin endpoints require valid NextAuth session
- Admin users are defined in `ADMIN_EMAILS` environment variable
- Unauthorized access returns `NextResponse.json({error: 'Admin access required'}, {status: 403})`

### Internal Cron Endpoints

Internal cron jobs use Bearer token authentication:

```typescript
// Verify cron secret
const authHeader = request.headers.get('authorization');
const cronSecret = process.env.CRON_SECRET || 'default-secret';

if (authHeader !== `Bearer ${cronSecret}`) {
  return NextResponse.json(
    { error: 'Unauthorized' },
    { status: 401 }
  );
}
```

## Feature Flag Management

### Overview

The application uses a centralized feature flag system located in `/lib/feature-flags.ts`. Feature flags are loaded from environment variables and provide runtime control over application features.

### Feature Flag Environment Variables

All feature flags follow the pattern: `FEATURE_[FLAG_NAME]=[true|false]`

#### Available Feature Flags

| Flag | Environment Variable | Description | Category |
|------|---------------------|-------------|-----------|
| Phase 4B | `FEATURE_PHASE4B_ENABLED` | Enable Phase 4B content generation | content |
| Auto Publishing | `FEATURE_AUTO_PUBLISHING` | Enable automatic daily publishing | automation |
| Content Analytics | `FEATURE_CONTENT_ANALYTICS` | Enable advanced analytics | analytics |
| SEO Optimization | `FEATURE_SEO_OPTIMIZATION` | Enable SEO tools | seo |
| Social Media | `FEATURE_SOCIAL_MEDIA_INTEGRATION` | Enable social media features | social |
| Advanced Topics | `FEATURE_ADVANCED_TOPICS` | Enable topic research engine | content |
| WordPress Export | `FEATURE_EXPORT_WORDPRESS` | Enable WordPress export | export |
| Audit System | `FEATURE_AUDIT_SYSTEM` | Enable audit and compliance | compliance |
| Enterprise Features | `FEATURE_ENTERPRISE_FEATURES` | Enable enterprise controls | enterprise |
| Advanced Cron | `FEATURE_ADVANCED_CRON` | Enable advanced cron management | automation |

### Feature Flag Usage

#### Checking Feature Flags in Code

```typescript
import { isFeatureEnabled } from '@/lib/feature-flags';

if (isFeatureEnabled('EXPORT_WORDPRESS')) {
  // Feature-specific code
}
```

#### Getting Feature Flag Details

```typescript
import { getFeatureFlag, getFeatureFlags } from '@/lib/feature-flags';

// Get specific flag
const flag = getFeatureFlag('PHASE4B_ENABLED');

// Get all flags
const allFlags = getFeatureFlags();
```

#### Feature Flag Categories

```typescript
import { getFeatureFlagsByCategory } from '@/lib/feature-flags';

const flagsByCategory = getFeatureFlagsByCategory();
// Returns: { content: [...], automation: [...], ... }
```

### Feature Flag Administration

#### Status Endpoint

**Endpoint**: `GET /api/phase4/status`
**Access**: Admin-only
**Purpose**: Returns current feature flag state and system status

```bash
curl -X GET /api/phase4/status \
  -H "Authorization: Bearer <admin-token>"
```

#### Response Format

```json
{
  "status": "success",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "environment": "production",
  "phase4_status": {
    "phase4b_enabled": true,
    "auto_publishing": false,
    // ... other flags
  },
  "feature_flags": {
    "total_count": 10,
    "enabled_count": 7,
    "disabled_count": 3,
    "by_category": {
      "content": { "total": 3, "enabled": 2, "disabled": 1 },
      // ... other categories
    }
  }
}
```

## API Endpoint Reference

### Admin Endpoints

#### 1. Phase 4 Status
- **Endpoint**: `GET /api/phase4/status`
- **Access**: Admin-only
- **Purpose**: Feature flag status and system health
- **Features Required**: None (always available to admins)

#### 2. WordPress Export
- **Endpoint**: `GET /api/export/wordpress`
- **Access**: Admin-only
- **Purpose**: Export content to WordPress format
- **Features Required**: `EXPORT_WORDPRESS`
- **Parameters**:
  - `format`: `xml` or `json` (default: `xml`)
  - `limit`: Number of items (default: `50`)
  - `offset`: Pagination offset (default: `0`)

```bash
# Export as WordPress XML
curl -X GET "/api/export/wordpress?format=xml&limit=100"

# Export as JSON
curl -X GET "/api/export/wordpress?format=json"
```

#### 3. Audit System
- **Endpoint**: `GET /api/audits`
- **Access**: Admin-only
- **Purpose**: Retrieve audit logs and compliance data
- **Features Required**: `AUDIT_SYSTEM`
- **Parameters**:
  - `type`: `all`, `content`, `security`, `performance`, `compliance`
  - `limit`: Number of items (default: `50`)
  - `start_date`: ISO date string
  - `end_date`: ISO date string

```bash
# Get all audits
curl -X GET "/api/audits?type=all"

# Get security audits for date range
curl -X GET "/api/audits?type=security&start_date=2025-01-01&end_date=2025-01-31"
```

### Internal Cron Endpoints

#### 1. Daily Audit Cron
- **Endpoint**: `POST /api/internal/cron/audit-daily`
- **Access**: Cron secret authentication
- **Purpose**: Automated daily system audit
- **Features Required**: `AUDIT_SYSTEM` + `ADVANCED_CRON`

```bash
curl -X POST /api/internal/cron/audit-daily \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

## Security Guidelines

### Authentication Levels

1. **Public Endpoints**: No authentication required
2. **User Endpoints**: NextAuth session required
3. **Admin Endpoints**: NextAuth session + admin role required
4. **Internal Cron**: Bearer token with `CRON_SECRET`

### Admin Access Control

Admins are defined by email addresses in the `ADMIN_EMAILS` environment variable:

```bash
ADMIN_EMAILS=admin@company.com,owner@company.com,super@company.com
```

### Rate Limiting

- Admin endpoints: Higher rate limits
- Public endpoints: Standard rate limits
- Cron endpoints: No rate limiting (internal only)

## Deployment Configuration

### Required Environment Variables

```bash
# Authentication
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-domain.com
ADMIN_EMAILS=admin1@company.com,admin2@company.com

# Cron Security
CRON_SECRET=secure-cron-secret

# Feature Flags (enable as needed)
FEATURE_PHASE4B_ENABLED=true
FEATURE_AUTO_PUBLISHING=false
FEATURE_CONTENT_ANALYTICS=true
FEATURE_SEO_OPTIMIZATION=true
FEATURE_SOCIAL_MEDIA_INTEGRATION=false
FEATURE_ADVANCED_TOPICS=true
FEATURE_EXPORT_WORDPRESS=true
FEATURE_AUDIT_SYSTEM=true
FEATURE_ENTERPRISE_FEATURES=true
FEATURE_ADVANCED_CRON=true

# Database
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
```

### Production Checklist

- [ ] All required environment variables set
- [ ] Admin emails configured
- [ ] Cron secret configured and secure
- [ ] Feature flags reviewed and set appropriately
- [ ] Database connections tested
- [ ] SSL certificates valid
- [ ] Rate limiting configured
- [ ] Monitoring and logging enabled

## Monitoring and Alerting

### Health Check Endpoints

Each major system component has a health check endpoint:

- `GET /api/health` - General system health
- `GET /api/internal/cron/audit-daily` - Daily audit cron status
- `GET /api/phase4/status` - Feature flag and phase 4 status

### Logging Standards

- Use structured logging with timestamps
- Include request IDs for tracing
- Log all admin actions
- Log feature flag changes
- Log cron job execution results

### Audit Trail

All administrative actions are logged including:

- Feature flag status checks
- Content exports
- Manual audit triggers
- Cron job executions

## Troubleshooting

### Common Issues

#### Feature Flag Not Working
1. Check environment variable is set correctly
2. Verify spelling matches flag key exactly
3. Restart application to reload environment variables
4. Check `/api/phase4/status` for current flag state

#### Admin Access Denied
1. Verify user email is in `ADMIN_EMAILS`
2. Check NextAuth session is valid
3. Ensure user is properly authenticated
4. Review admin middleware logs

#### Cron Job Failing
1. Verify `CRON_SECRET` is set and correct
2. Check required feature flags are enabled
3. Review cron job logs for specific errors
4. Test endpoint manually with correct Authorization header

### Debug Commands

```bash
# Check feature flag status
curl -X GET /api/phase4/status

# Test cron endpoint
curl -X GET /api/internal/cron/audit-daily

# Verify admin access
curl -X GET /api/audits -H "Cookie: next-auth.session-token=..."
```

## Maintenance Procedures

### Regular Tasks

1. **Weekly**: Review audit logs and system health
2. **Monthly**: Review and update feature flag settings
3. **Quarterly**: Security audit and access review
4. **Annually**: Full system security assessment

### Feature Flag Lifecycle

1. **Development**: Create flag, default to disabled
2. **Testing**: Enable in staging environment
3. **Gradual Rollout**: Enable for subset of users
4. **Full Release**: Enable for all users
5. **Cleanup**: Remove flag code when feature is stable

### Backup and Recovery

- Database backups: Daily automated
- Configuration backups: Version controlled
- Feature flag states: Documented and versioned
- Admin access: Emergency access procedures documented

## CI/CD Pipeline and Migration Management

### Enterprise CI/CD Workflow

The Yalla London project uses an enterprise-grade CI/CD pipeline that ensures safe deployment practices and database migration management.

#### Pull Request Workflow
When creating pull requests to the main branch:

1. **Code Quality Checks**:
   - TypeScript compilation and linting
   - Prisma schema validation
   - Security scanning for secrets and vulnerabilities

2. **Migration Safety Check**:
   - Runs `prisma migrate diff` against shadow database
   - **IMPORTANT**: Migrations are NOT deployed during pull requests
   - Shows preview of migration changes for review

3. **Performance Testing**:
   - Lighthouse CI runs against staging environment
   - Skips auth-gated pages (e.g., `/admin`) to avoid authentication issues
   - Requires performance score ≥ 0.9, accessibility ≥ 0.9, SEO ≥ 0.9

```bash
# Example migration diff command (run automatically in CI)
yarn prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-schema-datasource $SHADOW_DATABASE_URL \
  --script
```

#### Main Branch Deployment Workflow
When code is merged to the main branch:

1. **Full Test Suite**:
   - Complete application build and testing
   - Integration tests with real database
   - JSON-LD schema validation

2. **Database Migration Deployment**:
   - Automatic deployment of pending migrations
   - Uses production `$DATABASE_URL`
   - Verbose logging for audit trail

```bash
# Migration deployment (run automatically in CI)
yarn prisma migrate deploy --verbose
```

### Required Environment Variables

#### Core Database Variables
```bash
# Production database (required for main branch deployments)
DATABASE_URL=postgresql://user:password@host:5432/production_db

# Shadow database (required for migration diff in pull requests)
SHADOW_DATABASE_URL=postgresql://user:password@host:5432/shadow_db

# Direct connection URL (for migrations)
DIRECT_URL=postgresql://user:password@host:5432/production_db?schema=public&connection_limit=1
```

#### Lighthouse CI Variables
```bash
# Staging URL for Lighthouse CI testing
LHCI_URL_STAGING=https://your-staging-environment.vercel.app

# Lighthouse CI GitHub App token (optional, for enhanced reporting)
LHCI_GITHUB_APP_TOKEN=your-github-app-token
```

#### CI/CD Security Variables
```bash
# Next.js authentication secret (minimum 32 characters)
NEXTAUTH_SECRET=your-production-nextauth-secret-32-chars-minimum

# Application URL
NEXTAUTH_URL=https://your-production-domain.com

# Admin emails for access control
ADMIN_EMAILS=admin1@company.com,admin2@company.com

# AWS credentials for asset storage
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_BUCKET_NAME=your-production-bucket
AWS_REGION=us-east-1
```

### Lighthouse CI Convention

The Lighthouse CI configuration automatically adapts based on environment:

#### Local Development
- Tests against `http://localhost:3000`
- Includes all pages including admin routes
- Starts local server automatically

#### Staging/CI Environment
- Tests against `$LHCI_URL_STAGING`
- Skips authentication-gated pages (`/admin`)
- Connects to running staging deployment

#### Configuration Example
```javascript
// lighthouserc.js
module.exports = {
  ci: {
    collect: {
      url: [
        process.env.LHCI_URL_STAGING || 'http://localhost:3000',
        (process.env.LHCI_URL_STAGING || 'http://localhost:3000') + '/blog',
        (process.env.LHCI_URL_STAGING || 'http://localhost:3000') + '/recommendations',
        // Skip admin routes when testing staging
      ],
      startServerCommand: process.env.LHCI_URL_STAGING ? undefined : 'yarn start',
      numberOfRuns: 3
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', {minScore: 0.9}],
        'categories:accessibility': ['error', {minScore: 0.9}],
        'categories:best-practices': ['warn', {minScore: 0.9}],
        'categories:seo': ['error', {minScore: 0.9}],
        'categories:pwa': 'off'
      }
    }
  }
}
```

### Database Migration Best Practices

#### Development Workflow
1. **Make Schema Changes**: Update `prisma/schema.prisma`
2. **Create Migration**: `yarn prisma migrate dev --name descriptive_name`
3. **Review Generated SQL**: Check migration file for correctness
4. **Test Locally**: Ensure application works with new schema
5. **Commit Changes**: Include both schema and migration files

#### Staging Validation
1. **Deploy to Staging**: Push to staging branch or environment
2. **Validate Migration**: CI automatically runs migration diff
3. **Test Application**: Verify all features work with new schema
4. **Review Performance**: Check Lighthouse CI results

#### Production Deployment
1. **Merge to Main**: Once PR is approved and tested
2. **Automatic Migration**: CI deploys migrations to production
3. **Monitor Deployment**: Check logs for migration success
4. **Verify Application**: Confirm all services running correctly

### Troubleshooting Guide

#### Common Migration Issues

**Issue**: Migration diff shows unexpected changes
```bash
# Solution: Reset shadow database to match current schema
yarn prisma db push --schema prisma/schema.prisma
```

**Issue**: Lighthouse CI fails on staging URL
```bash
# Check staging deployment status
curl -I $LHCI_URL_STAGING

# Verify staging environment variables
vercel env ls

# Run Lighthouse locally for debugging
npx lhci autorun --config=lighthouserc.js
```

**Issue**: Migration deployment fails in CI
```bash
# Check database connectivity
yarn prisma migrate status

# Verify environment variables
echo $DATABASE_URL | grep -o "postgresql://[^/]*"

# Manual migration deployment (emergency only)
yarn prisma migrate deploy --verbose
```

#### Performance Issues

**Issue**: Lighthouse performance score below threshold
1. **Check Bundle Size**: `yarn build` and review `.next/static/`
2. **Optimize Images**: Ensure proper image formats and sizes
3. **Review JavaScript**: Check for unnecessary client-side code
4. **Database Queries**: Review API endpoints for N+1 queries

**Issue**: CI/CD pipeline timeout
1. **Check Dependencies**: `yarn install` may be slow
2. **Database Connection**: Verify database availability
3. **Build Cache**: Ensure cache keys are properly configured
4. **Resource Limits**: Consider upgrading CI runner specs

#### Security Scan Failures

**Issue**: Secrets detected in code
```bash
# Find and remove hardcoded secrets
grep -r "password\|secret\|key" --include="*.ts" src/

# Use environment variables instead
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
```

**Issue**: Dependency vulnerabilities
```bash
# Update vulnerable packages
yarn audit fix

# For high-severity issues that can't be auto-fixed
yarn upgrade [package-name]
```

### Monitoring and Alerts

#### Key Metrics to Monitor
- Migration deployment success rate
- Lighthouse CI score trends
- Build and test duration
- Security scan results
- Database connection health

#### Recommended Alerting Rules
- Failed migration deployments (immediate)
- Lighthouse scores below 0.85 (warning)
- Security scan failures (immediate)
- Build failures on main branch (immediate)
- Dependency vulnerabilities (daily summary)