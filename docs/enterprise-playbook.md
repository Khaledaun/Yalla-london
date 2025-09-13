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

#### Feature Flag Refresh Endpoint

**Endpoint**: `POST /api/feature-flags/refresh`
**Access**: Admin-only  
**Purpose**: Reloads feature flags from environment variables at runtime

This endpoint allows administrators to refresh feature flags without restarting the application, useful for runtime configuration changes and testing different feature combinations.

```bash
# Refresh feature flags
curl -X POST /api/feature-flags/refresh \
  -H "Authorization: Bearer <admin-token>"
```

**Response Format**:
```json
{
  "status": "success",
  "message": "Feature flags refreshed successfully",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "refresh_details": {
    "total_flags": 10,
    "flags_enabled": 7,
    "flags_disabled": 3,
    "changes": {
      "flags_changed": true,
      "before": { "total": 10, "enabled": 6, "disabled": 4 },
      "after": { "total": 10, "enabled": 7, "disabled": 3 }
    }
  }
}
```

**Usage & Troubleshooting**:
- **Runtime Updates**: Change environment variables and call this endpoint to apply changes immediately
- **Testing**: Verify feature flag changes in staging before production deployment  
- **Validation**: Use `GET /api/phase4/status` after refresh to confirm changes
- **Rollback**: Set environment variables back to previous values and refresh again
- **Monitoring**: All refresh operations are logged for audit purposes

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

### Enhanced Role-Based Access Control (RBAC)

The application implements a comprehensive RBAC system with three primary roles and granular permissions.

#### Role Hierarchy

**Admin (admin)**
- Full system access and management
- User management capabilities
- All content and analytics permissions
- System configuration and feature flag management
- Audit log access and compliance reporting

**Editor (editor)**
- Content creation and editing
- Content publishing capabilities
- Analytics viewing
- Limited user viewing (no management)

**Viewer (viewer)**
- Analytics viewing only
- Report access
- No content modification capabilities

#### Permission System

The system uses granular permissions that can be assigned to roles or individual users:

**Content Management Permissions:**
- `create_content` - Create new content
- `edit_content` - Edit existing content
- `delete_content` - Delete content
- `publish_content` - Publish/unpublish content

**User Management Permissions:**
- `manage_users` - Create, edit, delete users and manage roles
- `view_users` - View user information

**System Administration Permissions:**
- `manage_system` - System configuration and administration
- `view_audit_logs` - Access to audit logs and compliance data
- `manage_permissions` - Modify user roles and permissions
- `manage_features` - Control feature flags and system features

**Analytics and Reporting Permissions:**
- `view_analytics` - Access to analytics dashboards
- `export_data` - Export data and generate reports
- `view_reports` - Access to usage, error, and compliance reports

#### RBAC Implementation

```typescript
// Check user permission
import { requirePermission, PERMISSIONS } from '@/lib/rbac';

export const GET = async (request: NextRequest) => {
  const authResult = await requirePermission(request, PERMISSIONS.VIEW_ANALYTICS);
  if (authResult instanceof NextResponse) return authResult;
  
  const { user } = authResult;
  // Continue with authorized request
};
```

#### User Role Management

Users are assigned roles in the database with the following schema:

```sql
-- User table includes RBAC fields
ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'viewer';
ALTER TABLE users ADD COLUMN permissions TEXT[] DEFAULT '{}';
ALTER TABLE users ADD COLUMN isActive BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN lastLoginAt TIMESTAMP;
```

### Admin Access Control

**Legacy Admin Control (Backward Compatible):**
Admins are defined by email addresses in the `ADMIN_EMAILS` environment variable:

```bash
ADMIN_EMAILS=admin@company.com,owner@company.com,super@company.com
```

**New RBAC Admin Control:**
Admins are users with `role = 'admin'` in the database. The system supports both methods for backward compatibility.

### Session Security Enhancements

**Session Configuration:**
- Session duration: 24 hours (configurable)
- JWT strategy with secure token handling
- Automatic session renewal on activity
- Session invalidation on logout

**Security Features:**
- IP address tracking and logging
- User agent tracking for session security
- Failed login attempt monitoring
- Suspicious activity detection

### Audit Trail and Compliance

**Comprehensive Audit Logging:**
All user actions are logged with the following information:
- User ID and email
- Action performed
- Resource accessed
- Success/failure status
- IP address and user agent
- Timestamp and additional context

**Audit Log Categories:**
- Authentication events (login, logout, failed attempts)
- Authorization events (access granted/denied)
- Data access and modification
- Administrative actions
- Export and reporting activities

**Compliance Features:**
- GDPR compliance tracking
- Data export audit trails
- User permission change history
- Security event monitoring
- Automated compliance reporting

### Rate Limiting

- Admin endpoints: Higher rate limits (500 requests/hour)
- User endpoints: Standard rate limits (100 requests/hour)
- Public endpoints: Basic rate limits (50 requests/hour)
- Cron endpoints: No rate limiting (internal only)

## Enterprise Analytics & Reporting

### Analytics Integration

**Google Analytics 4 (GA4) Integration:**
- Configurable GA4 measurement ID
- Custom event tracking
- E-commerce tracking support
- Privacy-compliant data collection

**Google Tag Manager (GTM) Support:**
- Container-based tag management
- Custom event forwarding
- Advanced tracking configuration

**Custom Analytics Platform:**
- Server-side event tracking
- Custom metrics and dimensions
- Real-time analytics processing
- Data retention policy enforcement

#### Analytics Configuration

```bash
# Analytics Environment Variables
GA4_MEASUREMENT_ID=G-XXXXXXXXXX
GA4_API_SECRET=your-ga4-api-secret
GTM_CONTAINER_ID=GTM-XXXXXXX
FEATURE_CONTENT_ANALYTICS=true
ANALYTICS_PERSONALIZATION=false
ANALYTICS_RETENTION_DAYS=365
ANALYTICS_ANONYMIZE_IP=true
ANALYTICS_REQUIRE_CONSENT=true
```

#### Analytics Privacy Controls

**Data Privacy Features:**
- IP address anonymization
- Cookie consent management
- Data retention policy enforcement
- User opt-out capabilities
- GDPR compliance features

**Privacy Configuration:**
- Automatic IP anonymization for EU users
- Configurable data retention periods
- Cookie consent requirement
- User data export capabilities
- Right to be forgotten implementation

### Reporting API Endpoints

#### 1. Usage Reports

**Endpoint:** `GET /api/reports/usage`
**Permission:** `view_reports`
**Description:** Comprehensive usage analytics and system metrics

**Parameters:**
- `start_date` (optional): ISO date string (default: 30 days ago)
- `end_date` (optional): ISO date string (default: today)
- `format` (optional): `json` or `csv` (default: json)

**Response includes:**
- User activity metrics (total, active, new users)
- Content performance (page views, top content)
- System performance (requests, response times, uptime)
- Feature usage statistics

```bash
# Get usage report for last 30 days
curl -X GET "/api/reports/usage" \
  -H "Authorization: Bearer <session-token>"

# Export as CSV for specific date range
curl -X GET "/api/reports/usage?start_date=2024-01-01&end_date=2024-01-31&format=csv"
```

#### 2. Error Reports

**Endpoint:** `GET /api/reports/errors`
**Permission:** `view_reports`
**Description:** Error tracking and system health reporting

**Parameters:**
- `start_date` (optional): ISO date string (default: 7 days ago)
- `end_date` (optional): ISO date string (default: today)
- `severity` (optional): Filter by severity level
- `format` (optional): `json` or `csv`

**Response includes:**
- Error rate and trends
- Top error types and patterns
- Affected user count
- System availability metrics
- Error details and stack traces

```bash
# Get error report for last week
curl -X GET "/api/reports/errors" \
  -H "Authorization: Bearer <session-token>"

# Get high-severity errors only
curl -X GET "/api/reports/errors?severity=error"
```

#### 3. Compliance Reports

**Endpoint:** `GET /api/reports/compliance`
**Permission:** `view_audit_logs`
**Description:** Compliance and audit reporting for regulatory requirements

**Parameters:**
- `start_date` (optional): ISO date string (default: 30 days ago)
- `end_date` (optional): ISO date string (default: today)
- `type` (optional): `gdpr`, `security`, `access`, `data_retention`, or `all`
- `format` (optional): `json` or `csv`

**Response includes:**
- Audit trail summary
- Access control events
- Data governance metrics
- Security incidents
- Compliance score and recommendations

```bash
# Get general compliance report
curl -X GET "/api/reports/compliance" \
  -H "Authorization: Bearer <admin-token>"

# Get GDPR-specific compliance data
curl -X GET "/api/reports/compliance?type=gdpr&format=csv"
```

#### 4. Analytics Configuration

**Endpoint:** `GET /api/analytics/config`
**Permission:** `view_analytics`
**Description:** Retrieve current analytics configuration

**Endpoint:** `POST /api/analytics/config`
**Permission:** `manage_features`
**Description:** Update analytics configuration

```bash
# Get current analytics configuration
curl -X GET "/api/analytics/config" \
  -H "Authorization: Bearer <session-token>"

# Update analytics settings
curl -X POST "/api/analytics/config" \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "enableAnalytics": true,
    "anonymizeIp": true,
    "ga4MeasurementId": "G-XXXXXXXXXX"
  }'
```

### Analytics Event Tracking

**Enhanced Event Tracking:**
The analytics system supports custom event tracking with the following capabilities:

**Event Types:**
- Page views and navigation
- User interactions (clicks, form submissions)
- Content engagement (time on page, scroll depth)
- E-commerce events (purchases, cart actions)
- Custom business events

**Event Structure:**
```typescript
interface AnalyticsEvent {
  eventName: string;        // Required event identifier
  category?: string;        // Event category (default: 'engagement')
  label?: string;          // Event label for categorization
  value?: number;          // Numeric value for the event
  userId?: string;         // Associated user ID
  sessionId?: string;      // Session identifier
  properties?: object;     // Additional event properties
}
```

**Usage Example:**
```typescript
// Track page view
await analyticsService.trackPageView({
  page: '/blog/article-title',
  title: 'Article Title',
  userId: 'user-123',
  sessionId: 'session-456'
});

// Track custom event
await analyticsService.trackEvent({
  eventName: 'newsletter_signup',
  category: 'conversion',
  label: 'footer_form',
  userId: 'user-123'
});
```

### Data Retention and Cleanup

**Automated Data Cleanup:**
- Configurable retention periods (default: 365 days)
- Automatic cleanup of old analytics events
- System metrics archival
- Audit log retention policies

**Manual Data Management:**
```bash
# Trigger manual cleanup (admin only)
curl -X POST "/api/analytics/cleanup" \
  -H "Authorization: Bearer <admin-token>"
```

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

## Environment Bootstrap

### Overview

This section provides step-by-step instructions for creating and configuring new environments for the Yalla London platform. Follow this guide when setting up development, staging, or production environments.

### Step 1: Environment Setup

#### 1.1 Create Environment File

1. Copy the template environment file:
   ```bash
   cp .env.example .env
   ```

2. Generate secure secrets:
   ```bash
   # Generate NextAuth secret (32+ characters)
   openssl rand -base64 32
   
   # Generate cron secret
   openssl rand -base64 32
   ```

3. Set basic configuration:
   ```bash
   # Required for all environments
   NEXTAUTH_SECRET=<generated-secret-32-chars>
   NEXTAUTH_URL=<your-domain-or-localhost>
   NODE_ENV=<development|staging|production>
   ```

#### 1.2 Database Configuration

1. **Development Environment**:
   ```bash
   # Local PostgreSQL setup
   DATABASE_URL=postgresql://localhost:5432/yalla_london_dev
   DIRECT_URL=postgresql://localhost:5432/yalla_london_dev
   ```

2. **Staging/Production Environment**:
   ```bash
   # Use managed database service (AWS RDS, DigitalOcean, etc.)
   DATABASE_URL=postgresql://user:pass@host:5432/yalla_london
   DIRECT_URL=postgresql://user:pass@host:5432/yalla_london
   SHADOW_DATABASE_URL=postgresql://user:pass@host:5432/yalla_london_shadow
   ```

3. **Initialize Database**:
   ```bash
   # Run migrations
   yarn prisma migrate deploy
   
   # Generate Prisma client
   yarn prisma generate
   
   # Seed database (optional)
   yarn prisma db seed
   ```

### Step 2: Security Configuration

#### 2.1 Admin Access Setup

1. Configure admin emails:
   ```bash
   ADMIN_EMAILS=admin@yourcompany.com,owner@yourcompany.com
   ```

2. Set cron security:
   ```bash
   CRON_SECRET=<generated-secure-secret>
   ```

3. Verify admin access:
   ```bash
   # Test admin endpoint access
   curl -X GET /api/phase4/status
   ```

#### 2.2 AWS Storage Setup

1. Create AWS IAM user with S3 permissions
2. Create S3 bucket with appropriate CORS settings  
3. Configure environment:
   ```bash
   AWS_ACCESS_KEY_ID=<your-access-key>
   AWS_SECRET_ACCESS_KEY=<your-secret-key>
   AWS_BUCKET_NAME=<your-bucket-name>
   AWS_REGION=<your-region>
   ```

### Step 3: Feature Flag Configuration

#### 3.1 Environment-Specific Flag Setup

1. **Development Environment** (enable all features for testing):
   ```bash
   FEATURE_PHASE4B_ENABLED=true
   FEATURE_AUTO_PUBLISHING=false  # Usually disabled in dev
   FEATURE_CONTENT_ANALYTICS=true
   FEATURE_SEO_OPTIMIZATION=true
   FEATURE_SOCIAL_MEDIA_INTEGRATION=true
   FEATURE_ADVANCED_TOPICS=true
   FEATURE_EXPORT_WORDPRESS=true
   FEATURE_AUDIT_SYSTEM=true
   FEATURE_ENTERPRISE_FEATURES=true
   FEATURE_ADVANCED_CRON=false  # Usually disabled in dev
   ```

2. **Staging Environment** (mirror production with safe defaults):
   ```bash
   FEATURE_PHASE4B_ENABLED=true
   FEATURE_AUTO_PUBLISHING=false  # Keep disabled for safety
   FEATURE_CONTENT_ANALYTICS=true
   FEATURE_SEO_OPTIMIZATION=true
   FEATURE_SOCIAL_MEDIA_INTEGRATION=false  # Avoid accidental posts
   FEATURE_ADVANCED_TOPICS=true
   FEATURE_EXPORT_WORDPRESS=false  # Avoid accidental exports
   FEATURE_AUDIT_SYSTEM=true
   FEATURE_ENTERPRISE_FEATURES=true
   FEATURE_ADVANCED_CRON=true
   ```

3. **Production Environment** (enable based on business requirements):
   ```bash
   # Configure based on your specific needs
   # Start with conservative settings and enable features gradually
   ```

#### 3.2 Runtime Flag Management

1. **Check current status**:
   ```bash
   curl -X GET /api/phase4/status
   ```

2. **Update flags without restart**:
   ```bash
   # Update environment variables, then:
   curl -X POST /api/feature-flags/refresh
   ```

### Step 4: Integration Setup

#### 4.1 Email Service Configuration

Choose and configure email provider:

**Option A: SendGrid**
```bash
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=<your-sendgrid-key>
SENDGRID_FROM_EMAIL=noreply@yourcompany.com
```

**Option B: Mailgun**  
```bash
EMAIL_PROVIDER=mailgun
MAILGUN_API_KEY=<your-mailgun-key>
MAILGUN_DOMAIN=mg.yourcompany.com
```

#### 4.2 Social Media Integration (Optional)

Configure only if `FEATURE_SOCIAL_MEDIA_INTEGRATION=true`:

```bash
# Twitter/X
TWITTER_API_KEY=<your-twitter-key>
TWITTER_API_SECRET=<your-twitter-secret>
TWITTER_ACCESS_TOKEN=<your-access-token>
TWITTER_ACCESS_TOKEN_SECRET=<your-token-secret>

# Facebook/Meta
FACEBOOK_APP_ID=<your-facebook-app-id>
FACEBOOK_APP_SECRET=<your-facebook-secret>
FACEBOOK_ACCESS_TOKEN=<your-page-token>

# LinkedIn
LINKEDIN_CLIENT_ID=<your-linkedin-id>
LINKEDIN_CLIENT_SECRET=<your-linkedin-secret>
```

#### 4.3 Google Services Integration (Optional)

Configure for SEO and analytics features:

```bash
# Google Search Console (for SEO features)
GOOGLE_SEARCH_CONSOLE_CLIENT_ID=<your-client-id>
GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET=<your-client-secret>

# Google Analytics (for analytics features)
GOOGLE_ANALYTICS_TRACKING_ID=GA-XXXXX-X
GOOGLE_ANALYTICS_CLIENT_EMAIL=<service-account-email>
GOOGLE_ANALYTICS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
```

### Step 5: Testing & Validation

#### 5.1 Environment Health Check

Run comprehensive validation:

```bash
# 1. Test database connectivity
yarn prisma migrate status

# 2. Check feature flag status
curl -X GET /api/phase4/status

# 3. Test admin access
curl -X GET /api/audits

# 4. Verify file uploads (if AWS configured)
curl -X POST /api/media/upload -F "file=@test-image.jpg"

# 5. Test email functionality
curl -X POST /api/newsletter/test

# 6. Check external integrations
curl -X GET /api/social/status
```

#### 5.2 Feature-Specific Testing

Test enabled features individually:

```bash
# Content generation (if FEATURE_PHASE4B_ENABLED=true)
curl -X POST /api/generate-content

# Analytics (if FEATURE_CONTENT_ANALYTICS=true)  
curl -X GET /api/analytics/dashboard

# SEO tools (if FEATURE_SEO_OPTIMIZATION=true)
curl -X GET /api/seo/audit

# Export functionality (if FEATURE_EXPORT_WORDPRESS=true)
curl -X GET /api/export/wordpress?format=json&limit=1
```

### Step 6: Troubleshooting

#### 6.1 Common Issues & Solutions

**Issue: Database connection failed**
```bash
# Check database URL format
echo $DATABASE_URL | grep postgresql://

# Test direct connection
psql "$DATABASE_URL" -c "SELECT 1;"

# Verify network connectivity and credentials
```

**Issue: Admin access denied**
```bash
# Verify admin email configuration
echo $ADMIN_EMAILS

# Check NextAuth session
curl -X GET /api/auth/session

# Verify user authentication flow
```

**Issue: Feature flags not updating**
```bash
# Check environment variables are set
env | grep FEATURE_

# Refresh flags manually
curl -X POST /api/feature-flags/refresh

# Verify flag status
curl -X GET /api/phase4/status
```

**Issue: AWS/S3 upload failures**
```bash
# Test AWS credentials
aws s3 ls s3://$AWS_BUCKET_NAME

# Check bucket permissions and CORS
aws s3api get-bucket-cors --bucket $AWS_BUCKET_NAME

# Verify IAM permissions
```

#### 6.2 Environment Validation Checklist

Before going live with any environment:

**Database & Core Services**
- [ ] Database migrations applied successfully
- [ ] Database connection pool configured appropriately  
- [ ] Admin user accounts created and tested
- [ ] Authentication flow working end-to-end
- [ ] File upload/storage working correctly

**Security & Access Control**
- [ ] NEXTAUTH_SECRET is secure and unique (32+ characters)
- [ ] ADMIN_EMAILS contains only authorized administrators
- [ ] CRON_SECRET is secure and not shared publicly
- [ ] All API keys and secrets are environment-specific
- [ ] No hardcoded credentials in codebase

**Feature Flag Configuration**  
- [ ] All required feature flags are set appropriately
- [ ] Feature flag refresh endpoint working
- [ ] Disabled features are properly gated and don't cause errors
- [ ] Feature flag changes logged for audit trail

**External Integrations**
- [ ] Email service configured and tested
- [ ] AWS S3 bucket accessible with correct permissions
- [ ] Social media integrations tested (if enabled)
- [ ] Google services authenticated (if enabled)
- [ ] WordPress export tested (if enabled)

**Performance & Monitoring**
- [ ] Health check endpoints responding correctly
- [ ] Error logging and monitoring configured
- [ ] Performance metrics collection enabled
- [ ] Database query performance acceptable
- [ ] CDN configured for static assets (production)

**Environment-Specific Checks**
- [ ] NODE_ENV matches environment type
- [ ] External service URLs point to correct instances
- [ ] Rate limiting configured appropriately
- [ ] Backup and recovery procedures tested
- [ ] SSL certificates valid and properly configured

#### 6.3 Emergency Procedures

**Rollback Feature Flags**
```bash
# Disable problematic feature immediately
export FEATURE_PROBLEMATIC_FEATURE=false
curl -X POST /api/feature-flags/refresh
```

**Database Rollback**  
```bash
# Rollback last migration (emergency only)
yarn prisma migrate reset --force
yarn prisma migrate deploy --to <previous-migration-id>
```

**Application Recovery**
```bash
# Restart application with safe defaults
export FEATURE_PHASE4B_ENABLED=false
export FEATURE_AUTO_PUBLISHING=false
# Restart application service
```

### Step 7: Ongoing Maintenance

#### 7.1 Regular Tasks

**Weekly**:
- Review feature flag usage and performance impact
- Check error logs and resolve any issues
- Verify backup systems are working correctly

**Monthly**:
- Update environment variables for rotating secrets
- Review and update feature flag settings based on usage
- Audit admin access and remove unnecessary permissions

**Quarterly**:
- Review all integrations and API key expiration dates
- Update dependencies and security patches
- Full environment security audit

#### 7.2 Feature Flag Lifecycle Management

1. **New Feature Development**:
   - Create feature flag (default: disabled)
   - Test in development with flag enabled
   - Deploy to staging with flag enabled  
   - Enable in production after validation

2. **Feature Rollout**:
   - Enable for internal users first
   - Gradual rollout to larger user base
   - Monitor metrics and error rates
   - Full rollout after validation

3. **Feature Cleanup**:
   - Remove feature flag code after feature is stable
   - Archive old feature flags
   - Update documentation

## Enterprise Compliance & Audit System

### Centralized Audit Logging

#### Audit Log Access & Administration

**Admin API Endpoint**: `/api/audits`
- **Authentication**: Requires admin-level access (ADMIN_EMAILS environment variable)
- **Methods**: 
  - `GET` - Retrieve audit logs with filtering
  - `POST` - Trigger manual audit scans

**Query Parameters**:
```bash
# Get all audit logs (last 50)
curl -X GET /api/audits

# Filter by audit type
curl -X GET /api/audits?type=security&limit=100

# Date range filtering
curl -X GET /api/audits?start_date=2024-01-01&end_date=2024-01-31

# Pagination
curl -X GET /api/audits?offset=50&limit=25
```

**Audit Types Available**:
- `all` - Complete audit across all systems
- `security` - Security-focused audit (access, auth, permissions)
- `performance` - System performance metrics
- `compliance` - GDPR, SOC2, and regulatory compliance checks

#### Audit Log Retention Policy

**Retention Schedule**:
- **Development**: 30 days
- **Staging**: 90 days  
- **Production**: 7 years (regulatory compliance)

**Storage**:
- Primary: PostgreSQL database (`AuditLog` table)
- Backup: Included in automated database backups
- Archive: Long-term storage in AWS S3 (production only)

**Data Retention Controls**:
```sql
-- Manual cleanup (development only)
DELETE FROM "AuditLog" WHERE timestamp < NOW() - INTERVAL '30 days';

-- Production retention (automated via cron)
-- Archived to S3, then removed from active database after 1 year
```

#### Critical Actions Logged

**Authentication & Authorization**:
- User login/logout attempts (success/failure)
- Admin privilege escalations
- Permission changes and role modifications
- Session management events

**Content Management**:
- Blog post creation, updates, deletions
- Publishing/unpublishing actions
- Content exports (WordPress, data dumps)
- Media uploads and modifications

**System Administration**:
- Feature flag changes
- System configuration updates
- Manual audit triggers
- Backup/restore operations
- Database migrations

**Data Access**:
- Analytics data exports
- User data access
- API key usage and rate limiting
- External integrations access

#### Audit Log Schema

```typescript
interface AuditLogEntry {
  id: string;
  userId?: string;          // User performing action
  action: string;           // Action performed
  resource?: string;        // Resource affected
  resourceId?: string;      // Specific record ID
  details?: object;         // Additional context
  ipAddress?: string;       // Source IP
  userAgent?: string;       // Browser/client info
  success: boolean;         // Operation success
  errorMessage?: string;    // Error details if failed
  timestamp: Date;          // When action occurred
}
```

### Automated Security & Compliance

#### RBAC Testing Automation

**Test Coverage**:
- Role hierarchy validation
- Permission boundary enforcement
- Privilege escalation prevention
- Access control matrix verification

**Automated Test Schedule**:
- **CI/CD Pipeline**: On every pull request
- **Daily**: Full RBAC test suite
- **Weekly**: Penetration testing simulation

#### Security Scanning Integration

**SAST (Static Application Security Testing)**:
- **Tool**: ESLint Security Plugin + Snyk
- **Frequency**: Every commit/PR
- **Coverage**: Code vulnerabilities, dependency scanning

**DAST (Dynamic Application Security Testing)**:
- **Tool**: OWASP ZAP integration
- **Frequency**: Weekly on staging environment
- **Coverage**: Runtime vulnerabilities, injection attacks

#### Compliance Controls Documentation

**GDPR Compliance**:
- ✅ Data retention policies implemented
- ✅ User consent tracking in audit logs
- ✅ Right to erasure (data deletion) procedures
- ✅ Data portability (export functionality)
- ✅ Privacy by design in audit logging

**SOC2 Type II Controls**:
- ✅ Access control (RBAC system)
- ✅ Audit logging and monitoring
- ✅ Data encryption (at rest and in transit)
- ✅ Backup and disaster recovery procedures
- ✅ Change management (feature flags, migrations)

**Additional Compliance Standards**:
- ISO 27001: Information security management
- PCI DSS: Payment card data (if processing payments)
- CCPA: California privacy requirements

## Performance Monitoring & APM

### Sentry Error Tracking

**Integration Setup**:
```bash
# Environment variables
SENTRY_DSN="https://your_dsn@sentry.io/project_id"
SENTRY_ENVIRONMENT="production"  # or staging, development
SENTRY_RELEASE="1.0.0"
```

**Performance Monitoring Features**:
- Real-time error tracking and alerting
- Performance transaction monitoring
- User session replay (optional)
- Custom metrics and dashboards

**Alert Configuration**:
- **Critical Errors**: Immediate Slack/email notification
- **Performance Degradation**: > 2s response time alerts
- **Error Rate Threshold**: > 1% error rate triggers alert

### Application Performance Monitoring

**Metrics Collected**:
- API response times (P50, P95, P99)
- Database query performance
- Memory and CPU utilization
- Error rates by endpoint
- User session metrics

**Vercel Analytics Integration**:
```bash
# Enable in production
VERCEL_ANALYTICS_ENABLED=true
```

**Custom Performance Metrics**:
```typescript
// Track business-critical operations
await logAuditEvent({
  action: 'performance_metric',
  resource: 'content_generation',
  details: {
    operation_time: responseTime,
    user_agent: request.headers['user-agent'],
    endpoint: request.url
  }
});
```

## Disaster Recovery & Business Continuity

### Automated Database Backup System

**Backup Schedule**:
- **Development**: Daily backups, 7-day retention
- **Staging**: Daily backups, 30-day retention  
- **Production**: 
  - Hourly incremental backups
  - Daily full backups
  - Weekly compressed archives
  - 7-year retention for compliance

**Backup Automation Script**: `/scripts/backup-restore.ts`
```bash
# Automated backup (runs via cron)
node scripts/backup-restore.ts backup

# Manual backup with custom name
node scripts/backup-restore.ts backup "pre-migration-backup"

# List available backups
node scripts/backup-restore.ts list

# Restore from backup
node scripts/backup-restore.ts restore "backup-name"
```

**Backup Storage**:
- **Local**: Development and testing
- **AWS S3**: Production with versioning enabled
- **Cross-Region Replication**: Disaster recovery

### Disaster Recovery Plan

**Recovery Time Objective (RTO)**: 4 hours
**Recovery Point Objective (RPO)**: 1 hour

**Disaster Scenarios & Procedures**:

1. **Database Corruption**:
   - Restore from latest backup
   - Verify data integrity
   - Update DNS if needed
   - Estimated recovery: 2 hours

2. **Application Server Failure**:
   - Deploy to backup infrastructure
   - Redirect traffic via load balancer
   - Estimated recovery: 30 minutes

3. **Complete Infrastructure Loss**:
   - Deploy to DR region
   - Restore database from S3 backup
   - Update DNS and certificates
   - Estimated recovery: 4 hours

### Environment Validation Checklist

**Pre-Deployment Validation**:
- [ ] Database connectivity and migration status
- [ ] All environment variables configured
- [ ] SSL certificates valid and installed
- [ ] Backup systems operational
- [ ] Monitoring and alerting configured
- [ ] Admin access verified
- [ ] Feature flags tested
- [ ] Performance benchmarks met

**Post-Deployment Validation**:
- [ ] Health check endpoints responding
- [ ] Audit logging functional
- [ ] Error tracking operational
- [ ] Backup jobs scheduled and running
- [ ] Performance metrics within normal ranges
- [ ] Security scans passed
- [ ] Compliance controls verified

**Backup/Recovery Validation**:
- [ ] Backup creation successful
- [ ] Backup integrity verified
- [ ] Restore procedure tested (staging)
- [ ] Recovery time within RTO
- [ ] Data loss within RPO limits
- [ ] Disaster recovery documentation updated

## Monitoring and Alerting

### Health Check Endpoints

Each major system component has a health check endpoint:

- `GET /api/health` - General system health
- `GET /api/internal/cron/audit-daily` - Daily audit cron status
- `GET /api/phase4/status` - Feature flag and phase 4 status
- `GET /api/audits` - Audit system health and latest logs

### Logging Standards

- Use structured logging with timestamps
- Include request IDs for tracing
- Log all admin actions
- Log feature flag changes
- Log cron job execution results
- Centralize logs in audit system

### Audit Trail

All administrative actions are logged including:

- Feature flag status checks
- Content exports
- Manual audit triggers
- Cron job executions
- Security events and access attempts
- Performance metrics and thresholds

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

### Enterprise CI/CD Workflow with Comprehensive Automation

The Yalla London project uses an enterprise-grade CI/CD pipeline with robust error handling, comprehensive monitoring, and automated GitHub issue creation for critical failures.

#### Enhanced Workflow Features

**🔍 Robust Error Handling:**
- Retry logic for network-dependent operations (Prisma binary downloads, dependency installation)
- Detailed error categorization with troubleshooting guidance
- Environment variable validation before critical operations
- Comprehensive logging and artifact collection for debugging

**📊 Job Summaries and Reporting:**
- Rich GitHub step summaries with detailed status tables
- Build metrics including time, size, and test coverage
- Vulnerability analysis with severity breakdown
- Migration deployment tracking with backup points
- Security scan results with actionable recommendations

**🔒 File Validation and Security:**
- Prevents accidentally committed coverage directories, IDE files, temporary files
- Validates environment files aren't committed (security risk)
- Checks for config file integrity and build artifacts
- Enhanced secret detection with categorized warnings

**🗄️ Prisma Binary and Database Management:**
- Firewall/allowlist detection for binaries.prisma.sh access
- Network error handling with retry logic
- Environment validation before migration operations
- Production backup points before critical deployments

**📈 Coverage Enforcement:**
- Coverage warnings that don't fail builds (warn, don't break)
- Different thresholds for security modules (90%) vs regular code (70%)
- Detailed coverage reporting in job summaries
- Coverage trend analysis and artifact storage

#### Pull Request Workflow (Enhanced)

When creating pull requests to the main branch:

1. **Comprehensive Code Quality Checks**:
   ```bash
   # File Validation
   ✅ No unwanted files (coverage/, .vscode/, *.tmp, .env)
   ✅ Config file integrity validation
   ✅ Build artifact validation
   
   # TypeScript & Linting
   ✅ TypeScript compilation with detailed error reporting
   ✅ ESLint with security plugin (max 10 warnings allowed)
   ✅ Code quality metrics and trend analysis
   ```

2. **Enhanced Migration Safety Check**:
   ```bash
   # Prisma Binary Validation
   ✅ Prisma CLI accessibility with firewall detection
   ✅ Network connectivity validation with retry logic
   ✅ Environment variable validation before operations
   
   # Migration Analysis
   ✅ Schema syntax validation with best practice checks
   ✅ Migration diff against shadow database (if configured)
   ✅ Destructive operation warnings (DROP/DELETE/TRUNCATE)
   ✅ Performance impact analysis (index changes)
   
   # Migration Complexity Reporting
   📊 Line count of SQL changes
   ⚠️ Warnings for high-risk operations
   ℹ️ Information about performance impacts
   ```

3. **Comprehensive Security Scanning**:
   ```bash
   # Dependency Vulnerability Analysis
   🔍 npm audit with detailed severity breakdown
   🔍 yarn audit for cross-validation
   📦 Outdated package detection and recommendations
   
   # Secret and Credential Detection
   🔒 API key pattern detection with categorized warnings
   🔒 Hardcoded credential scanning with false positive filtering
   🔒 Environment file validation
   
   # Additional Security Checks
   🛡️ eval() usage detection (security risk)
   🛡️ innerHTML usage analysis (XSS potential)
   🛡️ TypeScript strict mode verification
   🛡️ Unsafe dependency version detection
   ```

4. **Performance Testing**:
   ```bash
   # Lighthouse CI with Adaptive Configuration
   ⚡ Performance: ≥75% (content-heavy luxury platform)
   ♿ Accessibility: ≥85% (high standards with flexibility)
   📋 Best Practices: ≥85% (realistic for modern web apps)
   🔍 SEO: ≥90% (maintain high discoverability)
   
   # Environment-Specific Testing
   🏠 Local: Tests all pages including /admin routes
   🎭 Staging: Skips auth-gated pages, uses staging URL
   📊 Adaptive thresholds based on page complexity
   ```

#### Main Branch Deployment Workflow (Enhanced)

When code is merged to the main branch:

1. **Enhanced Test Suite with Coverage Analysis**:
   ```bash
   # Comprehensive Testing
   🧪 Unit tests with coverage collection
   🧪 Integration tests with database validation
   🧪 JSON-LD schema validation
   🧪 API endpoint testing
   
   # Coverage Analysis (warn, don't fail)
   📊 Lines: ≥70% (warn if below, don't block)
   📊 Functions: ≥70% (with detailed reporting)
   📊 Branches: ≥70% (trend analysis)
   📊 Statements: ≥70% (artifact storage)
   
   # Security Module Higher Thresholds
   🔒 RBAC modules: ≥90% coverage required
   🔒 Security modules: ≥80% coverage required
   ```

2. **Production Migration Deployment with Safety**:
   ```bash
   # Pre-deployment Validation
   🔐 Production environment variable validation
   🗄️ Database connectivity testing with timeout
   🔧 Prisma binary availability with network validation
   
   # Migration Status Analysis
   📋 Current migration status check
   📊 Pending migration count and complexity analysis
   💾 Backup point creation with unique identifier
   📝 Schema state recording before changes
   
   # Deployment with Monitoring
   🚀 Migration deployment with verbose logging
   ⏱️ Deployment time tracking and performance metrics
   🔍 Post-deployment verification and testing
   🗄️ Database operation validation
   🔧 Fresh Prisma client generation test
   
   # Recovery Information
   📝 Backup identifier for rollback: backup-YYYYMMDD-HHMMSS-{SHA}
   🔗 Direct links to workflow run and commit details
   ```

### Required Environment Variables (Updated)

#### Core Database Variables (Enhanced)
```bash
# Production database with connection validation
DATABASE_URL=postgresql://user:password@host:5432/production_db
# Tested for connectivity before migration deployment

# Shadow database for migration validation in PRs
SHADOW_DATABASE_URL=postgresql://user:password@host:5432/shadow_db
# Used for migration diff analysis and destructive operation detection

# Direct connection URL with connection limits
DIRECT_URL=postgresql://user:password@host:5432/production_db?schema=public&connection_limit=1
# Validated before critical operations
```

#### Enhanced Security Variables
```bash
# Next.js authentication (minimum 32 characters, validated)
NEXTAUTH_SECRET=your-production-nextauth-secret-32-chars-minimum

# Application URL with environment-specific validation
NEXTAUTH_URL=https://your-production-domain.com

# Admin access control with email validation
ADMIN_EMAILS=admin1@company.com,admin2@company.com

# Cron security with strength validation  
CRON_SECRET=generated-secure-secret-minimum-32-characters
```

#### CI/CD Enhancement Variables
```bash
# Staging environment for Lighthouse CI
LHCI_URL_STAGING=https://your-staging-environment.vercel.app

# Enhanced GitHub App integration
LHCI_GITHUB_APP_TOKEN=your-github-app-token-for-enhanced-reporting

# Security scanning integration
SNYK_TOKEN=your-snyk-token-for-vulnerability-scanning

# Staging database for multi-environment support
STAGING_DATABASE_URL=postgresql://staging:password@host:5432/staging_db
STAGING_NEXTAUTH_URL=https://staging.your-domain.com
```

### Lighthouse CI Configuration (Enhanced)

The Lighthouse CI now includes adaptive configuration based on environment and content type:

#### Environment-Adaptive Testing
```javascript
// Enhanced lighthouserc.js with content-aware thresholds
module.exports = {
  ci: {
    collect: {
      url: [
        process.env.LHCI_URL_STAGING || 'http://localhost:3000',
        (process.env.LHCI_URL_STAGING || 'http://localhost:3000') + '/blog',
        (process.env.LHCI_URL_STAGING || 'http://localhost:3000') + '/recommendations',
        // Admin routes only tested locally (auth complications in staging)
      ],
      startServerCommand: process.env.LHCI_URL_STAGING ? undefined : 'yarn start',
      numberOfRuns: 3
    },
    assert: {
      assertions: {
        // Balanced thresholds for luxury content platform with rich visuals
        'categories:performance': ['warn', {minScore: 0.75}],  // Content-heavy
        'categories:accessibility': ['error', {minScore: 0.85}], // High standards
        'categories:best-practices': ['warn', {minScore: 0.85}], // Realistic
        'categories:seo': ['error', {minScore: 0.9}],           // Discoverability
        'categories:pwa': 'off'  // Not applicable
      }
    },
    upload: {
      target: 'temporary-public-storage'
    }
  }
}
```

### Database Migration Best Practices (Enhanced)

#### Development Workflow with Validation
```bash
# 1. Schema Changes with Validation
yarn prisma migrate dev --name descriptive_name
# ✅ Validates schema syntax and relationships
# ✅ Checks for breaking changes and data compatibility
# ✅ Generates migration with complexity analysis

# 2. Local Testing with Safety Checks
yarn prisma migrate status  # Check current state
yarn prisma validate        # Validate schema syntax
# ✅ Verify migration applies cleanly
# ✅ Test application with new schema
# ✅ Check for performance implications

# 3. Commit with Validation
git add prisma/schema.prisma prisma/migrations/
# ✅ Both schema and migration files included
# ✅ Migration reviewed for destructive operations
# ✅ Documentation updated if needed
```

#### Production Deployment with Safety
```bash
# Automatic production deployment process:

# 1. Environment Validation
✅ DATABASE_URL connectivity test with timeout
✅ DIRECT_URL validation and connection limits
✅ Prisma binary availability with network checks
✅ Production environment variable validation

# 2. Pre-deployment Analysis  
📊 Migration status check and pending migration count
💾 Backup point creation with unique identifier
📝 Schema state recording for rollback capability
⚠️ Destructive operation warnings and complexity analysis

# 3. Deployment with Monitoring
🚀 yarn prisma migrate deploy --verbose
⏱️ Deployment time tracking and performance monitoring
🔍 Real-time status updates with detailed logging

# 4. Post-deployment Verification
✅ Migration status confirmation
✅ Database connectivity and operation testing
✅ Fresh Prisma client generation validation
🔗 Backup identifier for emergency rollback
```

### Troubleshooting Guide (Comprehensive)

#### Enhanced Error Resolution

**Migration Issues with Network Detection:**
```bash
# Issue: Prisma binary download fails (firewall/allowlist)
❌ Error: ENOTFOUND binaries.prisma.sh

# Solution: Network access configuration
1. Add binaries.prisma.sh to firewall allowlist
2. Configure GitHub Actions runner network access
3. Alternative: Use cached Prisma binaries in CI
4. Verify: Test with curl https://binaries.prisma.sh

# Issue: Migration deployment fails with detailed analysis
❌ Error: Migration failed with connection timeout

# Enhanced Solution:
1. Check DATABASE_URL format and connectivity
2. Verify database server availability and load
3. Check migration complexity and duration
4. Review backup identifier for potential rollback
5. Analyze migration logs for specific error patterns
```

**Build and Test Issues with Coverage Guidance:**
```bash
# Issue: Coverage below threshold (warns, doesn't fail)
⚠️ Warning: Coverage below 70% threshold

# Response Strategy:
1. Review coverage report in job summary
2. Identify uncovered code paths
3. Add tests for critical functionality
4. Note: Build continues with warning
5. Security modules require higher coverage (90%)

# Issue: TypeScript compilation with enhanced reporting
❌ Error: TS2345 - Argument type mismatch

# Enhanced Solution:
1. Review detailed TypeScript error log
2. Check for new strict mode requirements
3. Verify type definitions are up to date
4. Use TSC error codes for specific guidance
```

**Security and Compliance Issues:**
```bash
# Issue: Dependency vulnerabilities detected
🚨 Critical: 3 critical vulnerabilities found

# Enhanced Resolution:
1. Review vulnerability report in job artifacts
2. Run npm audit fix for automatic fixes
3. Check for manual update requirements
4. Verify fixes don't break functionality
5. Critical issues require immediate attention

# Issue: RBAC or compliance validation failures
❌ Error: RBAC matrix validation failed

# Enhanced Solution:
1. Review RBAC configuration in lib/rbac.ts
2. Validate role-permission mappings
3. Check for missing admin permissions
4. Verify compliance documentation completeness
5. Update enterprise playbook as needed
```

### CI/CD Failure Detection and Automation (New)

#### Automated Issue Creation

The CI/CD pipeline includes comprehensive failure detection that automatically creates GitHub issues when critical jobs fail or are skipped.

**Monitored Critical Jobs:**
- **Main CI Pipeline**: `lint-and-typecheck`, `build-and-test`, `security-scan`, `migration-check`, `deploy-migrations`, `full-test-suite`, `enterprise-compliance`
- **Security Automation**: `sast-security-scan`, `rbac-security-tests`, `dependency-audit`, `compliance-check`, `dast-security-scan`
- **Staging Pipeline**: `staging-lint-and-build`, `staging-security-check` (with fallback detection)

**Issue Creation Features:**
```yaml
# Automatic issue creation with rich context
Title: "CI/CD Critical Failure Detected - [Workflow] (Run #[ID])"
Labels: ["ci-failure", "automated", "priority-high"]

Content Includes:
- 📊 Workflow name, run number, and branch information
- 🔍 Failed/skipped job names with IDs and links
- 📋 Job summary data and metrics
- 🔗 Direct link to workflow run for detailed logs
- ⏰ Timestamp and commit SHA for tracking
- 📝 Next steps and resolution guidance
- 🚫 Deduplication prevents multiple issues per run
```

**Enhanced Issue Context:**
- Build metrics (time, size, coverage percentages)
- Security scan results (vulnerability counts by severity)
- Migration deployment status and backup identifiers
- Error categorization and troubleshooting hints
- Links to relevant documentation sections

#### Testing Failure Detection

Use the test workflow to validate automation:
```bash
# Test critical job failure detection
gh workflow run test-failure-detection.yml \
  -f simulate_failure=test-job-1

# Test job skip detection  
gh workflow run test-failure-detection.yml \
  -f simulate_skip=test-job-2

# Verify issue creation with proper context
# Check issue includes job summaries and metrics
# Confirm deduplication works correctly
```

### Monitoring and Alerts (Enhanced)

#### Key Metrics with Automation
- **Migration deployment success rate** with backup tracking
- **Lighthouse CI score trends** with adaptive thresholds
- **Build and test duration** with performance analysis
- **Security scan results** with severity trending
- **Database connection health** with timeout monitoring
- **CI/CD failure detection accuracy** with issue tracking
- **Issue creation and resolution times** with automation metrics

#### Enhanced Alerting Rules
```yaml
# Immediate Alerts (automated via GitHub issues)
- Failed migration deployments → Automatic issue with backup ID
- Critical security vulnerabilities → Issue with severity breakdown
- Build failures on main branch → Issue with build metrics
- Prisma binary access issues → Issue with network guidance

# Warning Alerts (job summaries with recommendations)
- Lighthouse scores below adaptive thresholds
- Coverage below recommended levels (warn, don't fail)
- Dependency vulnerabilities (moderate severity)
- RBAC/compliance validation warnings

# Trending Alerts (artifact analysis)
- Build time increases → Performance regression tracking
- Test coverage decreases → Coverage trend analysis
- Security vulnerability increases → Vulnerability tracking

## Recent CI/CD Fixes and Prevention (December 2024)

### Critical Deployment Failures Fixed

This section documents the recent critical CI/CD deployment failures and the comprehensive fixes implemented to prevent similar issues.

#### Issue 1: Package Manager Conflicts ✅ FIXED

**Problem:**
- `package-lock.json` file conflicting with Yarn workflows causing infinite dependency resolution loops
- SIGKILL termination during `yarn add @prisma/client@6.7.0 --silent` commands
- Mixed package manager warnings causing installation instability

**Root Cause:**
Mixed package managers (npm lock file present in Yarn-based workflows) causing dependency resolution conflicts and timeout issues.

**Solution Implemented:**
```bash
# Removed conflicting package-lock.json
rm -f yalla_london/app/package-lock.json

# Enhanced .gitignore to prevent future conflicts
# Package manager lock files (enforce Yarn consistency)
package-lock.json
npm-shrinkwrap.json

# Added runtime detection and cleanup
if [ -f "package-lock.json" ]; then
  echo "⚠️ package-lock.json found - removing to prevent Yarn conflicts"
  rm -f package-lock.json
fi
```

**Prevention Measures:**
- Enhanced `.gitignore` patterns to prevent future package manager conflicts
- Runtime detection and automatic removal of conflicting lock files
- Standardized on Yarn with frozen lockfile for consistency
- Dependency validation checks before critical operations

#### Issue 2: Prisma Environment Variable Timing ✅ FIXED

**Problem:**
- Prisma CLI was called before `DIRECT_URL` environment variable was available
- Migration checks failed with "Environment variable not found: DIRECT_URL"
- Schema validation triggered errors during CI execution

**Root Cause:**
Environment variables were defined at the end of workflow steps but Prisma CLI needed them from the start.

**Solution Implemented:**
```yaml
# BEFORE (problematic)
- name: Validate Prisma binary and environment
  run: |
    npx prisma --version  # ❌ No env vars available yet
  env:
    DIRECT_URL: "postgresql://..."  # ❌ Too late
    
# AFTER (fixed)  
- name: Validate Prisma binary and environment
  env:
    DIRECT_URL: "postgresql://..."  # ✅ Available from start
    DATABASE_URL: "postgresql://..."
  run: |
    npx prisma --version  # ✅ Env vars accessible
```

**Prevention Measures:**
- All Prisma-related steps now have environment variables defined at the step level
- Environment variable validation added before Prisma CLI calls
- Consistent database configuration across all workflow jobs
- Documentation updated to emphasize environment variable ordering

#### Issue 3: Prisma Client Generator Configuration ✅ FIXED

**Problem:**
- Missing output path in Prisma client generator caused warnings
- "Output path not set" warnings during client generation
- Potential issues with client location and imports

**Root Cause:**
Prisma client generator configuration was minimal, missing explicit output specification.

**Solution Implemented:**
```prisma
# BEFORE (minimal configuration)
generator client {
    provider = "prisma-client-js"
}

# AFTER (complete configuration)
generator client {
    provider = "prisma-client-js"
    output   = "./node_modules/@prisma/client"
}
```

**Prevention Measures:**
- All Prisma generators now have complete configuration
- Output path explicitly specified for consistency
- Schema best practices documented and enforced
- Regular schema validation includes completeness checks

#### Issue 4: Node.js Version Compatibility ✅ VERIFIED

**Analysis:**
- All workflows already correctly configured with Node.js 20.17.0
- Compatible with npm@11.6.0 requirements (Node.js ^20.17.0)
- No changes required for version compatibility

**Current Configuration:**
```yaml
env:
  NODE_VERSION: '20.17.0'  # ✅ Meets npm@11.6.0 requirements

steps:
- uses: actions/setup-node@v4
  with:
    node-version: ${{ env.NODE_VERSION }}
```

**Prevention Measures:**
- Centralized Node.js version configuration across all workflows
- Version compatibility validated during dependency updates
- CI pipeline tests against specified Node.js version
- Documentation includes Node.js version requirements

### Prevention Strategies Implemented

#### 1. Package Manager Standardization

**Conflict Prevention:**
```bash
# Standard pattern for all dependency installations
- name: Install dependencies
  env:
    DATABASE_URL: "postgresql://..."
    DIRECT_URL: "postgresql://..."
  run: |
    # Check for conflicting package managers
    if [ -f "package-lock.json" ]; then
      echo "⚠️ package-lock.json found - removing to prevent Yarn conflicts"
      rm -f package-lock.json
    fi
    
    yarn install --frozen-lockfile --network-timeout 300000
```

**Enhanced .gitignore:**
```gitignore
# Package manager lock files (enforce Yarn consistency)
package-lock.json
npm-shrinkwrap.json
```

#### 2. Environment Variable Best Practices

**Consistent Ordering:**
```yaml
# Standard pattern for all database operations
- name: Database Operation
  env:
    DATABASE_URL: "postgresql://..."
    DIRECT_URL: "postgresql://..."
    SHADOW_DATABASE_URL: ${{ secrets.SHADOW_DATABASE_URL }}
  run: |
    # All environment variables available from start
```

**Validation Before Use:**
```bash
# Environment validation pattern
echo "🔐 Validating environment variables..."
if [ -z "$DIRECT_URL" ]; then
    echo "❌ DIRECT_URL not configured"
    exit 1
fi
echo "✅ Required environment variables validated"
```

#### 3. Prisma Configuration Standards

**Complete Generator Configuration:**
```prisma
generator client {
    provider = "prisma-client-js"
    output   = "./node_modules/@prisma/client"
    binaryTargets = ["native", "linux-musl"]  # For Docker compatibility
}

datasource db {
    provider  = "postgresql"
    url       = env("DATABASE_URL")
    directUrl = env("DIRECT_URL")
}
```

**Schema Validation Enhancements:**
- Syntax validation before all operations
- Best practice checks for missing configurations
- Primary key validation for all models
- Relationship integrity verification

#### 4. CI/CD Workflow Robustness

**Enhanced Error Detection:**
```yaml
# Network connectivity validation
if grep -q "ENOTFOUND\|ECONNREFUSED\|getaddrinfo" error.log; then
    echo "🚫 Network connectivity issue detected"
    echo "💡 Add binaries.prisma.sh to allowlist"
fi

# Retry logic with backoff
RETRY_COUNT=0
MAX_RETRIES=3
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if command_succeeds; then break; fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    sleep $((RETRY_COUNT * 10))
done
```

**Comprehensive Logging:**
```bash
# Detailed status reporting
echo "📊 Operation: $OPERATION_NAME"
echo "🕐 Started: $(date -Iseconds)"
echo "📍 Working Directory: $(pwd)"
echo "🔧 Node Version: $(node --version)"
echo "📦 NPM Version: $(npm --version)"
```

### Troubleshooting Quick Reference

#### Package Manager Conflicts
```bash
# Check for conflicting lock files
ls -la package-lock.json yarn.lock

# Remove conflicting npm files
rm -f package-lock.json npm-shrinkwrap.json

# Clean install with Yarn only
yarn install --frozen-lockfile
```

#### Environment Variable Issues
```bash
# Check if variables are set
env | grep -E "(DATABASE_URL|DIRECT_URL)"

# Validate database connectivity
npx prisma db execute --stdin <<< "SELECT 1;"

# Test Prisma CLI with environment
DIRECT_URL="postgresql://..." npx prisma --version
```

#### Prisma Configuration Issues  
```bash
# Validate schema syntax
npx prisma validate --schema prisma/schema.prisma

# Check generator configuration
grep -A5 "generator client" prisma/schema.prisma

# Verify client generation
npx prisma generate --schema prisma/schema.prisma
```

#### Node.js Version Issues
```bash
# Check current version
node --version  # Should be v20.17.0+

# Verify npm compatibility
npm --version   # Should work with Node.js 20.17.0

# Validate in CI environment
echo "Node: $(node --version), NPM: $(npm --version)"
```

### Monitoring and Prevention

#### Automated Monitoring
- Package manager conflict detection in all installation steps
- Environment variable availability checks before critical operations
- Prisma schema validation in all workflow steps
- Node.js version compatibility verification
- Network connectivity monitoring for external dependencies

#### Documentation Updates
- Workflow files include references to troubleshooting guide
- Package manager standardization requirements clearly documented
- Environment variable requirements clearly documented
- Prisma configuration best practices enforced
- Prevention measures integrated into development workflow

#### Developer Education
- Clear error messages with resolution guidance
- Links to relevant documentation sections
- Troubleshooting commands for common issues
- Best practices emphasized in code review process

### Future Improvements

1. **Automated Environment Validation:**
   - Pre-flight checks before workflow execution
   - Package manager conflict detection and automatic resolution
   - Environment variable dependency mapping
   - Validation scripts for local development

2. **Enhanced Error Recovery:**
   - Automatic retry with exponential backoff
   - Fallback mechanisms for network issues
   - Self-healing workflow capabilities

3. **Proactive Monitoring:**
   - Environment drift detection
   - Configuration compliance checks
   - Dependency vulnerability monitoring

This comprehensive approach ensures that the critical CI/CD failures documented above will not recur and provides a robust foundation for ongoing development and deployment reliability.
```