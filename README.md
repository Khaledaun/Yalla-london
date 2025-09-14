# Yalla London

Yalla London website system - A luxury travel content management platform.

## 🚀 Quick Start

For detailed setup instructions, see the application directory: [`yalla_london/app/`](./yalla_london/app/)

## 🔧 CI/CD Environment Setup

This repository uses GitHub Actions for continuous integration and deployment. The following environment variables must be configured in your repository secrets for the CI/CD pipeline to work properly:

### Required Environment Variables

| Variable | Description | Required For | Default/Fallback |
|----------|-------------|--------------|-------------------|
| `DATABASE_URL` | Production database connection string | All jobs | None - **REQUIRED** |
| `DIRECT_URL` | Direct database connection (for connection pooling) | Migration jobs | Falls back to `DATABASE_URL` |
| `NEXTAUTH_SECRET` | NextAuth.js secret (32+ characters) | Build & Test jobs | Test key for CI builds |
| `SHADOW_DATABASE_URL` | Shadow database for migration validation | Migration checks | Optional |
| `LHCI_GITHUB_APP_TOKEN` | Lighthouse CI GitHub App token | Lighthouse audits | Optional |

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

- [Enterprise Playbook](./docs/enterprise-playbook.md) - Comprehensive deployment and management guide
- [Environment Variables](./yalla_london/app/ENVIRONMENT-VARIABLES.md) - Detailed environment configuration
- [Database Migrations](./yalla_london/app/PRISMA-MIGRATIONS.md) - Database schema management

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
