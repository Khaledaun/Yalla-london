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