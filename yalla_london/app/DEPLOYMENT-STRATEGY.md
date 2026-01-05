# Multi-Environment Deployment Strategy

## Overview

This document outlines the deployment strategy for Yalla London across multiple environments, designed to support scalable expansion.

## Environment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Git Repository                               │
│                                                                 │
│  ┌──────────┐    ┌──────────┐    ┌──────────────────┐         │
│  │  main    │───▶│ staging  │───▶│ feature branches │         │
│  │ (prod)   │    │ (test)   │    │ (development)    │         │
│  └────┬─────┘    └────┬─────┘    └────────┬─────────┘         │
│       │               │                    │                    │
└───────┼───────────────┼────────────────────┼────────────────────┘
        │               │                    │
        ▼               ▼                    ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────────┐
│  PRODUCTION   │ │   STAGING     │ │   PREVIEW         │
│  yalla-london │ │yalla-london-  │ │ Auto-generated    │
│  .vercel.app  │ │staging.vercel │ │ per PR            │
│               │ │.app           │ │                   │
└───────────────┘ └───────────────┘ └───────────────────┘
```

## Vercel Projects

### 1. Production (`yalla-london`)
- **Project ID:** `prj_6Veo50z7sdGmZZrWbKDJlDDwiNHI`
- **Branch:** `main`
- **Domain:** `yallalondon.com` (custom domain)
- **Purpose:** Live user-facing application

### 2. Staging (`yalla-london-staging`)
- **Project ID:** Configure in Vercel Dashboard
- **Branch:** `staging`
- **Domain:** `yalla-london-staging.vercel.app`
- **Purpose:** Pre-production testing, QA, stakeholder review

## Branch Strategy

### Branch Flow
```
feature/* ──▶ staging ──▶ main
     │            │          │
     │            │          └── Production deployment
     │            └── Staging deployment + QA
     └── Preview deployments (auto per PR)
```

### Branch Purposes

| Branch | Purpose | Auto-Deploy | Protected |
|--------|---------|-------------|-----------|
| `main` | Production releases | Yes (Production) | Yes |
| `staging` | Pre-production testing | Yes (Staging) | Yes |
| `feature/*` | Feature development | Preview only | No |
| `claude/*` | AI-assisted development | Preview only | No |
| `hotfix/*` | Emergency fixes | Preview only | No |

## Vercel Configuration

### Production Project Settings
```
Production Branch: main
Automatic Deployments: Enabled
Preview Deployments: Disabled (use staging project)
```

### Staging Project Settings
```
Production Branch: staging
Automatic Deployments: Enabled
Preview Deployments: Enabled (for PRs to staging)
```

## Environment Variables

### Per-Environment Variables

| Variable | Production | Staging | Development |
|----------|-----------|---------|-------------|
| `APP_ENV` | `production` | `staging` | `development` |
| `DATABASE_URL` | prod-db | staging-db | local/test-db |
| `ENABLE_AUTOPILOT` | `true` | `true` | `true` |
| `ENABLE_SOCIAL_POSTING` | `true` | `false` | `true` |
| `ENABLE_EMAIL_CAMPAIGNS` | `true` | `false` | `true` |

### Vercel Dashboard Setup

For **each** Vercel project, configure:

```bash
# In Vercel Dashboard > Project > Settings > Environment Variables

# Production Project (yalla-london)
APP_ENV=production
NEXT_PUBLIC_APP_ENV=production
DATABASE_URL=<production-connection-string>
SUPABASE_SERVICE_ROLE_KEY=<production-key>
ENABLE_SOCIAL_POSTING=true
ENABLE_EMAIL_CAMPAIGNS=true

# Staging Project (yalla-london-staging)
APP_ENV=staging
NEXT_PUBLIC_APP_ENV=staging
DATABASE_URL=<staging-connection-string>
SUPABASE_SERVICE_ROLE_KEY=<staging-key>
ENABLE_SOCIAL_POSTING=false
ENABLE_EMAIL_CAMPAIGNS=false
```

## Workflow for New Features

### 1. Development
```bash
# Create feature branch from staging
git checkout staging
git pull origin staging
git checkout -b feature/my-feature

# Develop and test locally
yarn dev

# Push for preview deployment
git push -u origin feature/my-feature
```

### 2. Staging Review
```bash
# Create PR to staging
gh pr create --base staging --title "Feature: My Feature"

# After PR approval and merge, staging auto-deploys
# QA team tests at: yalla-london-staging.vercel.app
```

### 3. Production Release
```bash
# Create PR from staging to main
gh pr create --base main --head staging --title "Release: v1.x.x"

# After approval and merge, production auto-deploys
```

## Database Strategy

### Separate Databases per Environment

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Production    │     │    Staging      │     │   Development   │
│   Supabase      │     │   Supabase      │     │   Local/Mock    │
│                 │     │                 │     │                 │
│ nphnntnvqfpv... │     │ (create new)    │     │ mock prisma     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Creating Staging Database

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Create new project: `yalla-london-staging`
3. Copy connection strings to Vercel staging project
4. Run migrations: `yarn prisma migrate deploy`

## Expansion Support

This architecture supports:

### Multi-Site Expansion
- Each new site can share staging infrastructure
- Production deployments per site with custom domains
- Centralized Command Center manages all sites

### Regional Expansion
- Database replicas per region (Supabase supports this)
- CDN configuration in Vercel for global edge
- Environment variables per region if needed

### Team Scaling
- Feature branches for parallel development
- Protected branches prevent accidental deployments
- Preview deployments for code review

## Quick Reference

### Create Staging Branch (One-time)
```bash
# From main branch
git checkout main
git pull origin main
git checkout -b staging
git push -u origin staging
```

### Link Staging Vercel Project
```bash
cd yalla_london/app
vercel link
# Select: yalla-london-staging project
# This creates .vercel/project.json for staging
```

### Sync Staging with Main
```bash
# Periodically sync staging with production
git checkout staging
git pull origin staging
git merge main
git push origin staging
```

## Monitoring

### Health Checks
- Production: `https://yallalondon.com/api/health`
- Staging: `https://yalla-london-staging.vercel.app/api/health`

### Deployment Logs
- Vercel Dashboard > Deployments
- GitHub Actions > Workflows

---

**Last Updated:** January 2026
**Maintainer:** Development Team
