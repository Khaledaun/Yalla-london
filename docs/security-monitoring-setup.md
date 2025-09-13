# Enterprise Security & Monitoring Setup Guide

This guide provides step-by-step instructions for setting up the enterprise security, monitoring, and disaster recovery features.

## Required Environment Variables

Add these variables to your `.env` file or environment configuration:

### Core Security & Audit Configuration
```bash
# Admin access (comma-separated emails)
ADMIN_EMAILS="admin@company.com,owner@company.com"

# NextAuth security
NEXTAUTH_SECRET="your-secure-32-character-secret-here"
NEXTAUTH_URL="https://your-domain.com"

# Database configuration
DATABASE_URL="postgresql://user:password@host:port/database"
DIRECT_URL="postgresql://user:password@host:port/database"

# Feature flags for enterprise features
FEATURE_AUDIT_SYSTEM=true
FEATURE_PERFORMANCE_MONITORING=true
FEATURE_AUTOMATED_BACKUPS=true
```

### Performance Monitoring (Sentry)
```bash
# Sentry configuration for error tracking and APM
SENTRY_DSN="https://your_dsn@sentry.io/project_id"
SENTRY_ENVIRONMENT="production"  # or staging, development
SENTRY_RELEASE="1.0.0"
SENTRY_SAMPLE_RATE="1.0"        # Error sampling rate (0.0 - 1.0)
SENTRY_TRACES_SAMPLE_RATE="0.1" # Performance sampling rate (0.0 - 1.0)
```

### Backup & Disaster Recovery
```bash
# AWS S3 configuration for backups
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
AWS_REGION="us-east-1"
AWS_BUCKET_NAME="your-backup-bucket"
AWS_FOLDER_PREFIX="backups/"

# Backup configuration
BACKUP_ENABLED=true
BACKUP_RETENTION_DAYS=365  # Adjust based on environment
```

### Security Scanning (CI/CD)
```bash
# Snyk security scanning
SNYK_TOKEN="your-snyk-api-token"

# GitHub Actions secrets
SENTRY_AUTH_TOKEN="your-sentry-auth-token"
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd yalla_london/app
yarn add @sentry/nextjs
yarn install
```

### 2. Configure Sentry for Performance Monitoring

1. **Create Sentry Account**: Go to [sentry.io](https://sentry.io) and create an account
2. **Create Project**: Create a new Next.js project
3. **Get DSN**: Copy the DSN from your project settings
4. **Configure Environment Variables**: Add the Sentry variables to your `.env`

### 3. Set Up AWS S3 for Backups

1. **Create S3 Bucket**:
   ```bash
   aws s3 mb s3://your-backup-bucket
   ```

2. **Configure Bucket Policy** (for cross-region replication):
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Principal": {
           "AWS": "arn:aws:iam::ACCOUNT:root"
         },
         "Action": [
           "s3:GetObject",
           "s3:PutObject",
           "s3:DeleteObject"
         ],
         "Resource": "arn:aws:s3:::your-backup-bucket/*"
       }
     ]
   }
   ```

3. **Enable Versioning**:
   ```bash
   aws s3api put-bucket-versioning \
     --bucket your-backup-bucket \
     --versioning-configuration Status=Enabled
   ```

### 4. Configure Security Scanning

1. **Snyk Setup**:
   - Create account at [snyk.io](https://snyk.io)
   - Generate API token
   - Add token to GitHub secrets as `SNYK_TOKEN`

2. **GitHub Actions Setup**:
   - The security automation workflow is already configured
   - Add required secrets to your GitHub repository:
     - `SNYK_TOKEN`
     - `SENTRY_AUTH_TOKEN` (if using Sentry releases)

### 5. Initialize Backup Scheduler

For production environments:

```bash
# Test manual backup
yarn tsx scripts/backup-scheduler.ts backup full

# Check backup status
yarn tsx scripts/backup-scheduler.ts status

# Start backup scheduler daemon (optional - can use cron instead)
yarn tsx scripts/backup-scheduler.ts
```

### 6. Validate Security Tests

Run the automated security tests:

```bash
# Run RBAC security tests
yarn jest tests/rbac.spec.ts tests/security-automation.spec.ts

# Run full test suite
yarn test
```

## Environment-Specific Configurations

### Development Environment
```bash
NODE_ENV=development
BACKUP_RETENTION_DAYS=7
SENTRY_SAMPLE_RATE=0.1  # Lower sampling for development
BACKUP_ENABLED=false    # Disable automated backups
```

### Staging Environment
```bash
NODE_ENV=staging
BACKUP_RETENTION_DAYS=30
SENTRY_ENVIRONMENT=staging
BACKUP_ENABLED=true
```

### Production Environment
```bash
NODE_ENV=production
BACKUP_RETENTION_DAYS=2555  # 7 years for compliance
SENTRY_ENVIRONMENT=production
SENTRY_SAMPLE_RATE=1.0
SENTRY_TRACES_SAMPLE_RATE=0.1
BACKUP_ENABLED=true
```

## Security Checklist

Before deploying to production:

- [ ] All admin emails configured in `ADMIN_EMAILS`
- [ ] Strong `NEXTAUTH_SECRET` (32+ characters)
- [ ] Sentry DSN configured and tested
- [ ] AWS S3 backup bucket created and accessible
- [ ] Security tests passing
- [ ] Backup automation tested
- [ ] Performance monitoring active
- [ ] Audit logging functional

## Monitoring & Alerting Setup

### Sentry Alerting Rules

Configure these alert rules in Sentry:

1. **Critical Errors**: Any error with level `fatal` or `error`
2. **Performance Degradation**: API response time > 2 seconds
3. **High Error Rate**: Error rate > 1% over 5 minutes
4. **Failed Backups**: Any backup failure events

### Health Check Endpoints

Monitor these endpoints for system health:

- `GET /api/health` - General system health
- `GET /api/audits` - Audit system health
- `GET /api/phase4/status` - Feature flag status

### Log Monitoring

Key log patterns to monitor:

- **Failed Authentication**: `Authentication error` or `Access denied`
- **Backup Failures**: `Backup failed` or `❌ Backup`
- **Performance Issues**: Response times > 2000ms
- **Security Events**: `privilege_escalation_attempt`

## Disaster Recovery Procedures

### Database Recovery

1. **List Available Backups**:
   ```bash
   yarn tsx scripts/backup-restore.ts list
   ```

2. **Restore from Backup**:
   ```bash
   yarn tsx scripts/backup-restore.ts restore "backup-filename"
   ```

3. **Verify Recovery**:
   ```bash
   yarn prisma migrate status
   ```

### Application Recovery

1. **Rollback Feature Flags**:
   ```bash
   curl -X POST /api/feature-flags/refresh \
     -H "Content-Type: application/json" \
     -d '{"FEATURE_PROBLEMATIC_FEATURE": false}'
   ```

2. **Check System Health**:
   ```bash
   curl /api/health
   ```

3. **Monitor Error Rates**:
   - Check Sentry dashboard
   - Review audit logs
   - Validate critical endpoints

## Compliance Validation

### GDPR Compliance

- [ ] Data retention policies implemented
- [ ] User consent tracking active
- [ ] Right to erasure procedures documented
- [ ] Data portability (export) available
- [ ] Privacy by design in audit logging

### SOC2 Compliance

- [ ] Access controls (RBAC) validated
- [ ] Audit logging comprehensive
- [ ] Data encryption verified
- [ ] Backup procedures tested
- [ ] Change management documented

## Troubleshooting

### Common Issues

1. **Sentry Not Receiving Events**:
   - Check DSN configuration
   - Verify network connectivity
   - Check sampling rates

2. **Backup Failures**:
   - Verify AWS credentials
   - Check S3 bucket permissions
   - Test database connectivity

3. **Security Test Failures**:
   - Review RBAC configuration
   - Check admin email setup
   - Validate permission mappings

4. **Performance Alerts**:
   - Check database query performance
   - Review API response times
   - Monitor system resources

### Support Contacts

- **Security Issues**: Contact security team immediately
- **Backup Failures**: Check backup logs and AWS CloudWatch
- **Performance Issues**: Review Sentry performance dashboard
- **Compliance Questions**: Consult legal/compliance team