# 🔧 Vercel Environment Variables Checklist

This document lists **all required environment variables** for deploying Yalla London to Vercel across different environments.

> **Reference File**: See `./env.example` in the repository root for the complete template with all variables and inline comments.

## 📋 Environment Variables by Category

### 🚨 **CRITICAL - Required for Basic Functionality**

| Variable | Description | Used In | Dev | Preview | Production |
|----------|-------------|---------|-----|---------|------------|
| `DATABASE_URL` | PostgreSQL connection string | Database, Prisma | ✅ | ✅ | ✅ |
| `DIRECT_URL` | Direct PostgreSQL connection | Prisma migrations | ✅ | ✅ | ✅ |
| `NEXTAUTH_SECRET` | NextAuth.js secret key (32+ chars) | Authentication | ✅ | ✅ | ✅ |
| `NEXTAUTH_URL` | Base URL for authentication | Authentication | ✅ | ✅ | ✅ |
| `NEXT_PUBLIC_SITE_URL` | Public site URL | SEO, Links, Sitemaps | ✅ | ✅ | ✅ |
| `NEXT_PUBLIC_APP_URL` | Application base URL | Core app | ✅ | ✅ | ✅ |
| `NEXT_PUBLIC_BRAND_TYPE` | Brand configuration | Core app | ✅ | ✅ | ✅ |
| `NODE_ENV` | Environment mode | Build system | ✅ | ✅ | ✅ |

### 🔐 **SUPABASE - Optional (Graceful Fallback)**

| Variable | Description | Used In | Dev | Preview | Production |
|----------|-------------|---------|-----|---------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase client | ⚠️ | ⚠️ | ⚠️ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Supabase client | ⚠️ | ⚠️ | ⚠️ |
| `SUPABASE_URL` | Supabase project URL (legacy) | Supabase client | ⚠️ | ⚠️ | ⚠️ |
| `SUPABASE_KEY` | Supabase anonymous key (legacy) | Supabase client | ⚠️ | ⚠️ | ⚠️ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Server operations | ⚠️ | ⚠️ | ⚠️ |

### 🎯 **SEO FEATURE FLAGS - Enable/Disable Features**

| Variable | Description | Used In | Dev | Preview | Production |
|----------|-------------|---------|-----|---------|------------|
| `FEATURE_SEO` | Enable SEO features | SEO system | 0 | 1 | 1 |
| `NEXT_PUBLIC_FEATURE_SEO` | Enable SEO in client | SEO components | 0 | 1 | 1 |
| `FEATURE_AI_SEO_AUDIT` | Enable AI SEO features | AI SEO | 0 | 1 | 1 |
| `FEATURE_ANALYTICS_DASHBOARD` | Enable analytics | Analytics | 0 | 1 | 1 |
| `FEATURE_MULTILINGUAL_SEO` | Enable multilingual SEO | SEO system | 0 | 1 | 1 |
| `FEATURE_SCHEMA_GENERATION` | Enable schema generation | SEO system | 0 | 1 | 1 |
| `FEATURE_SITEMAP_AUTO_UPDATE` | Enable auto sitemap updates | SEO system | 0 | 1 | 1 |

### 📝 **CONTENT FEATURE FLAGS**

| Variable | Description | Used In | Dev | Preview | Production |
|----------|-------------|---------|-----|---------|------------|
| `FEATURE_PHASE4B_ENABLED` | Enable Phase 4B features | Content pipeline | 0 | 1 | 1 |
| `FEATURE_AUTO_PUBLISHING` | Enable auto publishing | Content pipeline | 0 | 0 | 1 |
| `FEATURE_CONTENT_PIPELINE` | Enable content pipeline | Content pipeline | 0 | 1 | 1 |

### 🎨 **MEDIA & UI FEATURE FLAGS**

| Variable | Description | Used In | Dev | Preview | Production |
|----------|-------------|---------|-----|---------|------------|
| `FEATURE_MEDIA` | Enable media library | Media management | 0 | 1 | 1 |
| `FEATURE_EMBEDS` | Enable social embeds | Media components | 0 | 1 | 1 |
| `FEATURE_HOMEPAGE_BUILDER` | Enable homepage builder | Homepage management | 0 | 1 | 1 |

### 🤖 **AI SERVICES - Required if AI features enabled**

| Variable | Description | Used In | Dev | Preview | Production |
|----------|-------------|---------|-----|---------|------------|
| `ABACUSAI_API_KEY` | Abacus AI API key | AI content generation | ❌ | ⚠️ | ⚠️ |
| `OPENAI_API_KEY` | OpenAI API key | AI services | ❌ | ⚠️ | ⚠️ |
| `PPLX_API_KEY` | Perplexity API key | AI research | ❌ | ⚠️ | ⚠️ |

### 📊 **GOOGLE SERVICES - Required if analytics/SEO enabled**

| Variable | Description | Used In | Dev | Preview | Production |
|----------|-------------|---------|-----|---------|------------|
| `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` | GA4 measurement ID | Analytics tracking | ❌ | ⚠️ | ⚠️ |
| `GOOGLE_SEARCH_CONSOLE_KEY` | GSC API key | Search Console | ❌ | ⚠️ | ⚠️ |
| `GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL` | GSC service account email | Search Console | ❌ | ⚠️ | ⚠️ |
| `GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY` | GSC private key | Search Console | ❌ | ⚠️ | ⚠️ |
| `GOOGLE_SEARCH_CONSOLE_CX` | Custom search engine ID | Search Console | ❌ | ⚠️ | ⚠️ |

### 🗂️ **AWS S3 STORAGE - Required for file uploads**

| Variable | Description | Used In | Dev | Preview | Production |
|----------|-------------|---------|-----|---------|------------|
| `AWS_BUCKET_NAME` | S3 bucket name | File storage | ✅ | ✅ | ✅ |
| `AWS_ACCESS_KEY_ID` | AWS access key | File storage | ✅ | ✅ | ✅ |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | File storage | ✅ | ✅ | ✅ |
| `AWS_REGION` | AWS region | File storage | ⚠️ | ⚠️ | ⚠️ |
| `AWS_FOLDER_PREFIX` | S3 folder prefix | File storage | ⚠️ | ⚠️ | ⚠️ |
| `AWS_ENDPOINT_URL` | Custom S3 endpoint | File storage | ❌ | ❌ | ❌ |

### 🔍 **SEARCH ENGINE OPTIMIZATION**

| Variable | Description | Used In | Dev | Preview | Production |
|----------|-------------|---------|-----|---------|------------|
| `INDEXNOW_KEY` | IndexNow API key | Search engine indexing | ❌ | ⚠️ | ⚠️ |

### 📧 **EMAIL SERVICES - Optional**

| Variable | Description | Used In | Dev | Preview | Production |
|----------|-------------|---------|-----|---------|------------|
| `SMTP_HOST` | Email server host | Email notifications | ❌ | ❌ | ⚠️ |
| `SMTP_PORT` | Email server port | Email notifications | ❌ | ❌ | ⚠️ |
| `SMTP_USER` | Email username | Email notifications | ❌ | ❌ | ⚠️ |
| `SMTP_PASS` | Email password | Email notifications | ❌ | ❌ | ⚠️ |

### 🔧 **MONITORING & SECURITY**

| Variable | Description | Used In | Dev | Preview | Production |
|----------|-------------|---------|-----|---------|------------|
| `SENTRY_DSN` | Sentry error tracking URL | Error monitoring | ❌ | ⚠️ | ⚠️ |
| `SENTRY_ENVIRONMENT` | Sentry environment name | Error monitoring | ❌ | ⚠️ | ⚠️ |
| `CRON_SECRET` | Secret for cron job security | Scheduled tasks | ❌ | ⚠️ | ⚠️ |
| `ADMIN_EMAILS` | Admin user emails | User management | ⚠️ | ⚠️ | ⚠️ |

### 🛠️ **BUILD CONFIGURATION - Optional**

| Variable | Description | Used In | Dev | Preview | Production |
|----------|-------------|---------|-----|---------|------------|
| `NEXT_DIST_DIR` | Next.js build directory | Build system | ❌ | ❌ | ❌ |
| `NEXT_OUTPUT_MODE` | Next.js output mode | Build system | ❌ | ❌ | ❌ |
| `CUSTOM_KEY` | Custom application key | Build system | ❌ | ❌ | ❌ |
| `FEATURE_SITEMAP_AUTO_UPDATE` | Enable sitemap updates | SEO system | 0 | 1 | 1 |

### 🤖 **AI SERVICES - Optional (Feature-Gated)**

| Variable | Description | Used In | Dev | Preview | Production |
|----------|-------------|---------|-----|---------|------------|
| `ABACUSAI_API_KEY` | Abacus.ai API key | AI content generation | - | ⚠️ | ⚠️ |
| `OPENAI_API_KEY` | OpenAI API key | AI services | - | ⚠️ | ⚠️ |
| `ANTHROPIC_API_KEY` | Anthropic API key | AI services | - | ⚠️ | ⚠️ |

### 📊 **ANALYTICS - Optional (Feature-Gated)**

| Variable | Description | Used In | Dev | Preview | Production |
|----------|-------------|---------|-----|---------|------------|
| `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` | Google Analytics 4 ID | Analytics tracking | - | ⚠️ | ⚠️ |
| `GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL` | GSC service account email | Search Console | - | ⚠️ | ⚠️ |
| `GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY` | GSC private key | Search Console | - | ⚠️ | ⚠️ |
| `GOOGLE_SEARCH_CONSOLE_KEY` | GSC API key | Search Console | - | ⚠️ | ⚠️ |
| `GOOGLE_SEARCH_CONSOLE_CX` | Custom search engine ID | Search Console | - | ⚠️ | ⚠️ |

### 🏗️ **BUILD & DEPLOYMENT - Vercel Managed**

| Variable | Description | Used In | Dev | Preview | Production |
|----------|-------------|---------|-----|---------|------------|
| `NODE_ENV` | Node environment | Build system | development | preview | production |
| `SKIP_ENV_VALIDATION` | Skip env validation | Build process | true | true | true |
| `PRISMA_GENERATE_SKIP_DOWNLOAD` | Skip Prisma download | Build process | true | true | true |
| `PRISMA_CLIENT_ENGINE_TYPE` | Prisma engine type | Build process | binary | binary | binary |
| `PRISMA_CLI_BINARY_TARGETS` | Prisma binary targets | Build process | debian-openssl-3.0.x | debian-openssl-3.0.x | debian-openssl-3.0.x |

### 🎨 **CONTENT FEATURES - Optional**

| Variable | Description | Used In | Dev | Preview | Production |
|----------|-------------|---------|-----|---------|------------|
| `FEATURE_PHASE4B_ENABLED` | Enable Phase 4B features | Content pipeline | 0 | 1 | 1 |
| `FEATURE_AUTO_PUBLISHING` | Enable auto publishing | Content system | 0 | 1 | 1 |
| `FEATURE_CONTENT_PIPELINE` | Enable content pipeline | Content system | 0 | 1 | 1 |
| `FEATURE_MEDIA` | Enable media library | Media system | 0 | 1 | 1 |
| `FEATURE_EMBEDS` | Enable social embeds | Media system | 0 | 1 | 1 |
| `FEATURE_HOMEPAGE_BUILDER` | Enable homepage builder | Homepage system | 0 | 1 | 1 |

### 🔒 **SECURITY & MONITORING - Optional**

| Variable | Description | Used In | Dev | Preview | Production |
|----------|-------------|---------|-----|---------|------------|
| `SENTRY_DSN` | Sentry error tracking | Error monitoring | - | ⚠️ | ⚠️ |
| `SENTRY_ENVIRONMENT` | Sentry environment | Error monitoring | development | preview | production |
| `ADMIN_EMAILS` | Admin user emails | Authentication | - | ⚠️ | ⚠️ |

### 📧 **EMAIL - Optional**

| Variable | Description | Used In | Dev | Preview | Production |
|----------|-------------|---------|-----|---------|------------|
| `SMTP_HOST` | SMTP server host | Email system | - | ⚠️ | ⚠️ |
| `SMTP_PORT` | SMTP server port | Email system | - | ⚠️ | ⚠️ |
| `SMTP_USER` | SMTP username | Email system | - | ⚠️ | ⚠️ |
| `SMTP_PASSWORD` | SMTP password | Email system | - | ⚠️ | ⚠️ |

### ☁️ **AWS S3 - Optional**

| Variable | Description | Used In | Dev | Preview | Production |
|----------|-------------|---------|-----|---------|------------|
| `AWS_BUCKET_NAME` | S3 bucket name | File storage | - | ⚠️ | ⚠️ |
| `AWS_FOLDER_PREFIX` | S3 folder prefix | File storage | - | ⚠️ | ⚠️ |
| `AWS_ACCESS_KEY_ID` | AWS access key | File storage | - | ⚠️ | ⚠️ |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | File storage | - | ⚠️ | ⚠️ |
| `AWS_REGION` | AWS region | File storage | - | ⚠️ | ⚠️ |
| `AWS_ENDPOINT_URL` | AWS endpoint URL | File storage | - | ⚠️ | ⚠️ |

---

## 🎯 **Environment-Specific Recommendations**

### **Development Environment**
```bash
# Minimal setup for local development
DATABASE_URL=postgresql://localhost:5432/yalla_london_dev
DIRECT_URL=postgresql://localhost:5432/yalla_london_dev
NEXTAUTH_SECRET=your-32-character-secret-key-here
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# All feature flags disabled by default
FEATURE_SEO=0
NEXT_PUBLIC_FEATURE_SEO=0
# ... other flags = 0
```

### **Preview Environment**
```bash
# Production-like setup for testing
DATABASE_URL=postgresql://preview-db-url
DIRECT_URL=postgresql://preview-db-url
NEXTAUTH_SECRET=preview-secret-key
NEXTAUTH_URL=https://your-app-git-branch.vercel.app
NEXT_PUBLIC_SITE_URL=https://your-app-git-branch.vercel.app

# Enable core features
FEATURE_SEO=1
NEXT_PUBLIC_FEATURE_SEO=1
FEATURE_AI_SEO_AUDIT=1
FEATURE_ANALYTICS_DASHBOARD=1

# Optional: Add API keys for testing
ABACUSAI_API_KEY=preview-key
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=G-PREVIEW
```

### **Production Environment**
```bash
# Full production setup
DATABASE_URL=postgresql://production-db-url
DIRECT_URL=postgresql://production-db-url
NEXTAUTH_SECRET=production-secret-key
NEXTAUTH_URL=https://yalla-london.com
NEXT_PUBLIC_SITE_URL=https://yalla-london.com

# Enable all features
FEATURE_SEO=1
NEXT_PUBLIC_FEATURE_SEO=1
FEATURE_AI_SEO_AUDIT=1
FEATURE_ANALYTICS_DASHBOARD=1
FEATURE_MULTILINGUAL_SEO=1
FEATURE_SCHEMA_GENERATION=1
FEATURE_SITEMAP_AUTO_UPDATE=1
FEATURE_PHASE4B_ENABLED=1
FEATURE_AUTO_PUBLISHING=1
FEATURE_CONTENT_PIPELINE=1
FEATURE_MEDIA=1
FEATURE_EMBEDS=1
FEATURE_HOMEPAGE_BUILDER=1

# Production API keys
ABACUSAI_API_KEY=production-key
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=G-PRODUCTION
GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL=prod@service.com
GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY=production-private-key
GOOGLE_SEARCH_CONSOLE_KEY=production-gsc-key
```

---

## 🔍 **Variable Usage Locations**

### **Database Variables**
- `DATABASE_URL`: `lib/db.ts`, Prisma schema, all database operations
- `DIRECT_URL`: Prisma migrations, direct database connections

### **Authentication Variables**
- `NEXTAUTH_SECRET`: NextAuth.js configuration, session encryption
- `NEXTAUTH_URL`: NextAuth.js callbacks, authentication flows
- `ADMIN_EMAILS`: Admin access control, user permissions

### **SEO Variables**
- `FEATURE_SEO`: `lib/flags.ts`, SEO API routes, admin components
- `NEXT_PUBLIC_FEATURE_SEO`: Client-side SEO components, public pages
- `ABACUSAI_API_KEY`: `app/api/seo/generate-meta/route.ts`, AI content generation
- `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID`: Analytics tracking, SEO dashboards

### **Build Variables**
- `NODE_ENV`: Build process, environment detection
- `SKIP_ENV_VALIDATION`: Build optimization, deployment speed
- `PRISMA_*`: Prisma client generation, database connectivity

---

## ⚠️ **Important Notes**

1. **Feature Flags**: All `FEATURE_*` variables default to `0` (disabled) for safety
2. **API Keys**: Optional variables marked with `⚠️` have graceful fallbacks
3. **Build Variables**: Vercel automatically sets most build-related variables
4. **Security**: Never commit real API keys or secrets to version control
5. **Environment Sync**: Use Vercel's environment variable sync for consistency

---

## 🚀 **Quick Setup Commands**

### **Copy from .env.local to Vercel**
```bash
# Export from local .env.local
cat .env.local | grep -E '^[A-Z]' > vercel-env-vars.txt

# Import to Vercel (manual process via dashboard)
# Go to Vercel Dashboard → Project → Settings → Environment Variables
```

### **Bulk Environment Setup**
```bash
# Set all SEO features to enabled
vercel env add FEATURE_SEO production
vercel env add NEXT_PUBLIC_FEATURE_SEO production
vercel env add FEATURE_AI_SEO_AUDIT production
# ... continue for all required variables
```

---

## 📞 **Support**

If you encounter issues with environment variables:

1. **Check Health Endpoints**: Visit `/api/health` and `/api/seo/health`
2. **Review Logs**: Check Vercel deployment logs for missing variables
3. **Validate Setup**: Use the deployment verification guide
4. **Contact Support**: Create an issue with environment variable details
