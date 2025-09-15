# Yalla London

Yalla London website system - A luxury travel content management platform.

## 🚀 Quick Start

For detailed setup instructions, see the application directory: [`yalla_london/app/`](./yalla_london/app/)

## 🔧 CI/CD Environment Setup

This repository uses GitHub Actions for continuous integration and deployment. The following environment variables must be configured in your repository secrets for the CI/CD pipeline to work properly:

### Required Secrets Configuration

| Secret | Description | Required For | Default/Fallback |
|--------|-------------|--------------|-------------------|
| `DATABASE_URL` | Production database connection string | All jobs | None - **REQUIRED** |
| `DIRECT_URL` | Direct database connection (for connection pooling) | Migration jobs | Falls back to `DATABASE_URL` |
| `NEXTAUTH_SECRET` | NextAuth.js secret (32+ characters) | Build & Test jobs | Test key for CI builds |
| `ABACUSAI_API_KEY` | AI content generation API key | Build jobs | Test key for CI builds |
| `AWS_ACCESS_KEY_ID` | AWS S3 access key | Build jobs | Test value for CI builds |
| `AWS_SECRET_ACCESS_KEY` | AWS S3 secret key | Build jobs | Test value for CI builds |
| `AWS_REGION` | AWS region | Build jobs | `us-east-1` |

### Optional Secrets (for enhanced features)

| Secret | Description | Required For | Default/Fallback |
|--------|-------------|--------------|-------------------|
| `SHADOW_DATABASE_URL` | Shadow database for migration validation | Migration checks | Optional - enables migration diff |
| `LHCI_URL_STAGING` | Lighthouse CI staging URL | Lighthouse audits | Uses localhost |
| `LHCI_GITHUB_APP_TOKEN` | Lighthouse CI GitHub App token | Lighthouse audits | Uses temporary storage |
| `SNYK_TOKEN` | Snyk security scanning token | Security scans | Optional - enables Snyk scan |
| `STAGING_DATABASE_URL` | Staging database URL | Staging deployments | Fallback value |
| `STAGING_NEXTAUTH_URL` | Staging application URL | Staging deployments | Default staging URL |
| `STAGING_ABACUSAI_API_KEY` | Staging AI API key | Staging deployments | Falls back to main key |

### 🔑 Setting Up GitHub Secrets

#### Step 1: Navigate to Repository Settings
1. Go to your GitHub repository
2. Click on **Settings** tab
3. In the left sidebar, click **Secrets and variables** → **Actions**

#### Step 2: Add Required Secrets
Click **New repository secret** for each required secret:

```bash
# Production Database (REQUIRED)
DATABASE_URL = postgresql://username:password@host:port/database

# Authentication (REQUIRED for secure builds)
NEXTAUTH_SECRET = your-secure-32-character-secret-key-here

# AI Content Generation (REQUIRED for content features)
ABACUSAI_API_KEY = your-abacus-ai-api-key-here

# AWS S3 Storage (REQUIRED for media uploads)
AWS_ACCESS_KEY_ID = AKIA...
AWS_SECRET_ACCESS_KEY = your-aws-secret-key
AWS_REGION = us-east-1
```

#### Step 3: Optional Enhancement Secrets
For enhanced CI/CD features, add these optional secrets:

```bash
# Database Migration Validation
SHADOW_DATABASE_URL = postgresql://username:password@shadow-host:port/shadow-db

# Security Scanning
SNYK_TOKEN = your-snyk-api-token

# Staging Environment
STAGING_DATABASE_URL = postgresql://username:password@staging-host:port/staging-db
STAGING_NEXTAUTH_URL = https://staging.your-domain.com
```

#### Step 4: Verify Secret Configuration
After adding secrets, check the workflow runs to see debug output showing secret availability:

![GitHub Secrets Setup](docs/images/github-secrets-ui.png)

*Note: The debug steps in workflows will show "✅ yes" or "❌ no" for each secret without revealing values.*

You can also run the validation script locally:
```bash
./scripts/validate-secrets.sh
```

This script provides guidance on secret configuration and validation steps.

### 🐛 Troubleshooting Secrets

#### Common Issues and Solutions

**1. "DATABASE_URL secret not configured" error:**
- Ensure `DATABASE_URL` is set in repository secrets
- Check that the secret name matches exactly (case-sensitive)
- Verify the database connection string format

**2. "Migration deployment requires production database access" error:**
- This occurs when `DATABASE_URL` is missing for main branch deployments
- Add the production database URL to secrets immediately

**3. Fallback values being used:**
- Workflows will show which secrets are missing in debug steps
- Add missing secrets to enable full functionality
- Fallback values allow CI to continue but may limit features

**4. Secrets not available in forks:**
- GitHub secrets are not available in pull requests from forks
- This is a security feature to prevent secret exposure
- Fork PRs will use fallback values automatically

#### Debug Steps in Workflows

Each critical job includes debug steps that show secret availability:

```yaml
- name: Debug - Check secrets availability
  run: |
    echo "DATABASE_URL: $([[ -n "${{ secrets.DATABASE_URL }}" ]] && echo "✅ yes" || echo "❌ no")"
    echo "NEXTAUTH_SECRET: $([[ -n "${{ secrets.NEXTAUTH_SECRET }}" ]] && echo "✅ yes" || echo "❌ no")"
    # ... more secrets
```

### Environment Variable Configuration

1. **In GitHub repository settings**:
   - Go to Settings → Secrets and variables → Actions
   - Add the required secrets listed above

2. **For local development**:
   - Copy `yalla_london/app/.env.example` to `yalla_london/app/.env.local`
   - Fill in your development environment values

### CI/CD Pipeline Overview

The CI/CD pipeline includes:

- **Lint & TypeScript Check**: Code quality validation
- **Migration Check**: Database schema validation (PR only)
- **Build & Test**: Application building and testing with coverage
- **Security Scan**: Vulnerability and secret scanning
- **Lighthouse CI**: Performance auditing (PR only)
- **Deploy Migrations**: Production database migrations (main branch only)
- **Full Test Suite**: Comprehensive integration testing (main branch only)

### Troubleshooting CI/CD Issues

**Missing DATABASE_URL error:**
- Ensure `DATABASE_URL` is set in repository secrets
- For migration jobs, `DIRECT_URL` will automatically fallback to `DATABASE_URL` if not set

**Node.js version compatibility:**
- The pipeline uses Node.js 20.17.0
- Ensure your local development uses a compatible version

**Integration test failures:**
- Check that required environment variables are set
- Verify the test script syntax with: `node --check yalla_london/app/scripts/test-integrations.js`

## 📖 Documentation

### Production Readiness
- [SSL/HTTPS Setup Guide](./docs/ssl-https-setup.md) - Comprehensive SSL configuration for all deployment environments
- [Security Review Checklist](./docs/security-review-checklist.md) - Complete security audit and compliance requirements
- [Real Device QA Checklist](./docs/real-device-qa-checklist.md) - Physical device testing procedures and matrix

### Development & Design
- [Mobile-First CSS Improvements](./docs/mobile-css-improvements.md) - Mobile optimization guidelines and implementation
- [Accessibility Review Checklist](./docs/accessibility-review-checklist.md) - WCAG 2.1 AA compliance and testing procedures
- [Enterprise Playbook](./docs/enterprise-playbook.md) - Comprehensive deployment and management guide

### Application Specific
- [Environment Variables](./yalla_london/app/ENVIRONMENT-VARIABLES.md) - Detailed environment configuration
- [Database Migrations](./yalla_london/app/PRISMA-MIGRATIONS.md) - Database schema management
- [Integration Setup](./yalla_london/app/INTEGRATION_SETUP.md) - Third-party service integration guide

## 🛡️ Production Security Features

### Authentication & Authorization
- ✅ **NextAuth.js Integration**: Secure authentication with session management
- ✅ **Role-Based Access Control (RBAC)**: Granular permission system
- ✅ **Rate Limiting**: Comprehensive protection on all public endpoints
- ✅ **Input Validation**: Zod schema validation throughout

### Data Protection
- ✅ **GDPR Compliance**: Full privacy policy, cookie consent, data rights
- ✅ **Encryption**: Database and transit encryption enabled
- ✅ **Backup Security**: Encrypted automated backups with restore procedures
- ✅ **Secret Management**: Secure environment variable handling

### Infrastructure Security
- ✅ **HTTPS Enforcement**: SSL/TLS with security headers
- ✅ **Content Security Policy**: XSS and injection protection
- ✅ **Vulnerability Scanning**: Automated Snyk integration
- ✅ **Security Headers**: HSTS, frame options, content type protection

## 🎯 Production Features

### User Experience
- ✅ **PWA Support**: Offline functionality and app-like experience
- ✅ **Mobile-First Design**: Optimized for all devices with touch targets
- ✅ **Accessibility**: WCAG 2.1 AA compliant with screen reader support
- ✅ **Multi-language**: English/Arabic with RTL support

### Legal & Compliance
- ✅ **Privacy Policy**: Comprehensive GDPR/UK data protection compliance
- ✅ **Terms of Use**: Clear user agreements and liability protection
- ✅ **Cookie Consent**: GDPR-compliant banner with granular controls
- ✅ **Contact Forms**: Professional inquiry handling with categorization

### Error Handling
- ✅ **Custom Error Pages**: 404 and 500 pages with helpful navigation
- ✅ **Global Error Boundary**: React error boundary with reporting
- ✅ **Offline Support**: Service worker with cached content access
- ✅ **Graceful Degradation**: Progressive enhancement throughout

### Admin & Monitoring
- ✅ **Health Monitoring**: Comprehensive health checks and metrics
- ✅ **Admin Notifications**: Slack/Discord webhook integration
- ✅ **Error Tracking**: Sentry integration for production monitoring
- ✅ **Performance Monitoring**: Core Web Vitals and user experience tracking

## 🚀 Quick Deployment

### Production Deployment Checklist
- [ ] Run security compliance check: `./scripts/legal-compliance-check.sh`
- [ ] Verify SSL/HTTPS configuration
- [ ] Test mobile responsiveness on real devices
- [ ] Validate accessibility compliance
- [ ] Confirm privacy policy and terms are current
- [ ] Test contact form and notification webhooks
- [ ] Verify PWA functionality and offline support

## 🏗️ Architecture

The platform is built with:
- **Frontend**: Next.js with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Deployment**: Vercel (staging/production)
- **CI/CD**: GitHub Actions

## 🔒 Security

- All secrets are managed through environment variables
- Regular security scanning via GitHub Actions
- Database migrations are validated before deployment
- Integration tests verify system functionality

For detailed security guidelines, see the [Enterprise Playbook](./docs/enterprise-playbook.md).
