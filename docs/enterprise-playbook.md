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

The Lighthouse CI is configured with balanced thresholds for this luxury content platform:
- **Performance**: ≥0.75 (content-heavy pages with rich visuals)
- **Accessibility**: ≥0.85 (high standards with flexibility)
- **Best Practices**: ≥0.85 (realistic for modern web apps)
- **SEO**: ≥0.9 (maintain high discoverability standards)

**Troubleshooting steps**:
1. **Check Bundle Size**: `yarn build` and review `.next/static/`
2. **Optimize Images**: Ensure proper image formats and sizes
3. **Review JavaScript**: Check for unnecessary client-side code
4. **Database Queries**: Review API endpoints for N+1 queries
5. **Feature Flags**: Disable non-essential features during testing:
   ```bash
   FEATURE_ANALYTICS_ENABLED=false
   FEATURE_SOCIAL_EMBEDS=false
   FEATURE_ADVANCED_ANIMATIONS=false
   ```
6. **CI Configuration**: Lighthouse config in `.github/workflows/ci.yml` under `Configure Lighthouse CI for staging`

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
- Lighthouse scores below thresholds:
  - Performance <0.75 (warning)
  - Accessibility <0.85 (critical)
  - Best Practices <0.85 (warning)
  - SEO <0.9 (critical)
- Security scan failures (immediate)
- Build failures on main branch (immediate)
- Dependency vulnerabilities (daily summary)