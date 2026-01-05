# Arabaldives Command Center - Complete System Test Suite

> **Version:** 2.0
> **Last Updated:** January 2026
> **Platform:** Arabaldives-on-Engine Multi-Tenant Travel Platform

---

## Table of Contents

1. [Environment Setup](#1-environment-setup)
2. [System Health & Status](#2-system-health--status)
3. [API Keys Management](#3-api-keys-management)
4. [Site Management & Configuration](#4-site-management--configuration)
5. [Design System & Theming](#5-design-system--theming)
6. [AI Content Generation](#6-ai-content-generation)
7. [Autopilot & Automation](#7-autopilot--automation)
8. [Analytics & Reporting](#8-analytics--reporting)
9. [Social Media Management](#9-social-media-management)
10. [Affiliate & Revenue Tracking](#10-affiliate--revenue-tracking)
11. [PDF Guide Generation](#11-pdf-guide-generation)
12. [Email Marketing & Lead Capture](#12-email-marketing--lead-capture)
13. [SEO Automation](#13-seo-automation)
14. [Multi-Tenant Operations](#14-multi-tenant-operations)
15. [Workflow Automation Recipes](#15-workflow-automation-recipes)
16. [Performance & Load Testing](#16-performance--load-testing)
17. [Security Testing](#17-security-testing)
18. [Database Verification](#18-database-verification)
19. [Error Handling & Edge Cases](#19-error-handling--edge-cases)
20. [Production Deployment Checklist](#20-production-deployment-checklist)

---

## 1. Environment Setup

### 1.1 Required Environment Variables

```bash
# Create comprehensive .env.local
cat > .env.local << 'EOF'
# ===========================================
# DATABASE
# ===========================================
DATABASE_URL="postgresql://user:password@localhost:5432/arabaldives"
DIRECT_URL="postgresql://user:password@localhost:5432/arabaldives"

# ===========================================
# AI PROVIDERS (Configure at least one)
# ===========================================
# Anthropic Claude (Recommended for Arabic)
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxx

# OpenAI GPT-4
OPENAI_API_KEY=sk-xxxxxxxxxxxxx

# Google Gemini
GOOGLE_AI_API_KEY=AIzaSyxxxxxxxxxxxxx

# Default AI provider priority: claude > openai > gemini
AI_PROVIDER_PRIORITY=claude,openai,gemini

# ===========================================
# SECURITY & ENCRYPTION
# ===========================================
NEXTAUTH_SECRET=your-32-character-secret-key-minimum
NEXTAUTH_URL=http://localhost:3000
ENCRYPTION_KEY=your-32-character-encryption-key!!

# Cron job authentication
CRON_SECRET=your-secure-cron-secret-key

# Admin authentication
ADMIN_EMAIL=admin@arabaldives.com
ADMIN_PASSWORD_HASH=bcrypt-hash-here

# ===========================================
# EXTERNAL SERVICES
# ===========================================
# Google Analytics 4
GA4_PROPERTY_ID=123456789
GA4_SERVICE_ACCOUNT_JSON={"type":"service_account",...}

# Google Search Console
SEARCH_CONSOLE_SITE=https://arabaldives.com
GSC_SERVICE_ACCOUNT_JSON={"type":"service_account",...}

# Social Media OAuth Tokens
TWITTER_API_KEY=xxxxx
TWITTER_API_SECRET=xxxxx
TWITTER_ACCESS_TOKEN=xxxxx
TWITTER_ACCESS_SECRET=xxxxx

INSTAGRAM_ACCESS_TOKEN=xxxxx
INSTAGRAM_BUSINESS_ID=xxxxx

FACEBOOK_PAGE_TOKEN=xxxxx
FACEBOOK_PAGE_ID=xxxxx

# ===========================================
# EMAIL SERVICES
# ===========================================
# Resend (Recommended)
RESEND_API_KEY=re_xxxxx

# Or SendGrid
SENDGRID_API_KEY=SG.xxxxx

# Email sender
EMAIL_FROM=noreply@arabaldives.com
EMAIL_REPLY_TO=support@arabaldives.com

# ===========================================
# FILE STORAGE
# ===========================================
# Cloudflare R2 / AWS S3
S3_BUCKET=arabaldives-assets
S3_REGION=auto
S3_ACCESS_KEY=xxxxx
S3_SECRET_KEY=xxxxx
S3_ENDPOINT=https://xxx.r2.cloudflarestorage.com

# CDN URL for assets
CDN_URL=https://cdn.arabaldives.com

# ===========================================
# REDIS (Optional - for caching)
# ===========================================
REDIS_URL=redis://localhost:6379
CACHE_TTL=3600

# ===========================================
# FEATURE FLAGS
# ===========================================
ENABLE_AI_CONTENT=true
ENABLE_AUTOPILOT=true
ENABLE_SOCIAL_POSTING=true
ENABLE_EMAIL_CAMPAIGNS=true
ENABLE_PDF_GENERATION=true
ENABLE_ANALYTICS_SYNC=true
EOF
```

### 1.2 Database Setup

```bash
# Install dependencies
yarn install

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Seed initial data
npx prisma db seed

# Verify database
npx prisma studio
```

### 1.3 Start Development Server

```bash
# Development mode
yarn dev

# Production build test
yarn build && yarn start

# With debug logging
DEBUG=* yarn dev
```

---

## 2. System Health & Status

### 2.1 Health Check Endpoints

```bash
BASE_URL="http://localhost:3000"

# Basic health
curl -X GET "$BASE_URL/api/health" | jq

# Command Center status
curl -X GET "$BASE_URL/api/admin/command-center/status" | jq

# Expected response:
# {
#   "aiAvailable": true,
#   "aiProviders": {
#     "claude": { "configured": true, "model": "claude-sonnet-4-20250514" },
#     "openai": { "configured": true, "model": "gpt-4o" },
#     "gemini": { "configured": false }
#   },
#   "pendingTasks": 5,
#   "activeSites": 3,
#   "systemHealth": {
#     "database": "healthy",
#     "cache": "healthy",
#     "storage": "healthy"
#   },
#   "stats": {
#     "totalContent": 150,
#     "totalLeads": 1250,
#     "monthlyRevenue": 4500
#   }
# }
```

### 2.2 Detailed System Diagnostics

```bash
# Full diagnostics
curl -X GET "$BASE_URL/api/admin/command-center/status?detailed=true" | jq

# Check specific subsystem
curl -X GET "$BASE_URL/api/admin/command-center/status?check=ai" | jq
curl -X GET "$BASE_URL/api/admin/command-center/status?check=database" | jq
curl -X GET "$BASE_URL/api/admin/command-center/status?check=storage" | jq
curl -X GET "$BASE_URL/api/admin/command-center/status?check=cron" | jq
```

---

## 3. API Keys Management

### 3.1 View Configured Keys

```bash
# Get all API keys (masked)
curl -X GET "$BASE_URL/api/admin/command-center/settings/api-keys" | jq

# Expected:
# {
#   "providers": [
#     {
#       "provider": "claude",
#       "model": "claude-sonnet-4-20250514",
#       "isActive": true,
#       "maskedKey": "sk-ant-***...***xyz",
#       "lastUsed": "2026-01-05T10:30:00Z",
#       "usageCount": 1250
#     }
#   ]
# }
```

### 3.2 Configure AI Providers

```bash
# Save Claude API key
curl -X PUT "$BASE_URL/api/admin/command-center/settings/api-keys" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "claude",
    "apiKey": "sk-ant-api03-your-key-here",
    "model": "claude-sonnet-4-20250514",
    "settings": {
      "maxTokens": 4096,
      "temperature": 0.7,
      "systemPrompt": "You are a luxury travel content expert specializing in Arabic-speaking markets."
    }
  }' | jq

# Save OpenAI API key
curl -X PUT "$BASE_URL/api/admin/command-center/settings/api-keys" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "openai",
    "apiKey": "sk-your-openai-key",
    "model": "gpt-4o",
    "settings": {
      "maxTokens": 4096,
      "temperature": 0.7
    }
  }' | jq

# Save Google Gemini API key
curl -X PUT "$BASE_URL/api/admin/command-center/settings/api-keys" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "gemini",
    "apiKey": "AIzaSy-your-key",
    "model": "gemini-pro",
    "settings": {
      "maxTokens": 4096
    }
  }' | jq
```

### 3.3 Test API Key Validity

```bash
# Test Claude
curl -X POST "$BASE_URL/api/admin/command-center/settings/api-keys/test" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "claude",
    "apiKey": "sk-ant-api03-your-key"
  }' | jq

# Expected:
# {
#   "valid": true,
#   "provider": "claude",
#   "model": "claude-sonnet-4-20250514",
#   "latency": 245,
#   "testResponse": "API key is valid and working correctly."
# }

# Test all configured providers
curl -X POST "$BASE_URL/api/admin/command-center/settings/api-keys/test" \
  -H "Content-Type: application/json" \
  -d '{ "testAll": true }' | jq
```

### 3.4 Manage Provider Priority

```bash
# Set provider fallback order
curl -X PATCH "$BASE_URL/api/admin/command-center/settings/api-keys/priority" \
  -H "Content-Type: application/json" \
  -d '{
    "priority": ["claude", "openai", "gemini"]
  }' | jq

# Disable a provider temporarily
curl -X PATCH "$BASE_URL/api/admin/command-center/settings/api-keys" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "openai",
    "isActive": false
  }' | jq
```

---

## 4. Site Management & Configuration

### 4.1 List All Sites

```bash
# Get all sites with stats
curl -X GET "$BASE_URL/api/admin/command-center/sites" | jq

# Filter by status
curl -X GET "$BASE_URL/api/admin/command-center/sites?status=active" | jq
curl -X GET "$BASE_URL/api/admin/command-center/sites?status=draft" | jq

# With full stats
curl -X GET "$BASE_URL/api/admin/command-center/sites?includeStats=true" | jq
```

### 4.2 AI-Powered Site Generation

```bash
# Generate complete site config from natural language
curl -X POST "$BASE_URL/api/admin/command-center/sites/generate-config" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Create a luxury Maldives travel website targeting Saudi Arabian honeymooners. Focus on 5-star overwater villas, romantic experiences, and halal dining options. Arabic-first with English support. Premium feel with gold and deep blue colors.",
    "locale": "ar",
    "options": {
      "generateLogo": true,
      "generateContent": true,
      "suggestAffiliates": true,
      "createSamplePages": true
    }
  }' | jq

# Expected comprehensive config:
# {
#   "config": {
#     "name": "جزر المالديف الفاخرة",
#     "nameEn": "Luxury Maldives",
#     "slug": "luxury-maldives-ar",
#     "tagline": "وجهتك لشهر عسل لا يُنسى",
#     "description": "...",
#     "domain": "maldives.arabaldives.com",
#     "defaultLocale": "ar",
#     "supportedLocales": ["ar", "en"],
#     "branding": {
#       "primaryColor": "#0A4D68",
#       "secondaryColor": "#D4AF37",
#       "accentColor": "#088395",
#       "backgroundColor": "#FAFAFA",
#       "textColor": "#1A1A1A",
#       "fontFamily": "Cairo",
#       "fontFamilyEn": "Playfair Display",
#       "logoSuggestion": "Crescent moon over water with Arabic calligraphy"
#     },
#     "categories": [...],
#     "pages": [...],
#     "affiliates": [...],
#     "seo": {...},
#     "contentPlan": {...}
#   }
# }
```

### 4.3 Create Site with Full Configuration

```bash
# Create a new site
curl -X POST "$BASE_URL/api/admin/command-center/sites/create" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "جزر المالديف الفاخرة",
    "nameEn": "Luxury Maldives",
    "slug": "luxury-maldives",
    "tagline": "وجهتك لشهر عسل لا يُنسى",
    "taglineEn": "Your Unforgettable Honeymoon Destination",
    "description": "دليلك الشامل لأفخم منتجعات المالديف",
    "domain": "maldives.arabaldives.com",
    "defaultLocale": "ar",
    "supportedLocales": ["ar", "en"],

    "branding": {
      "primaryColor": "#0A4D68",
      "secondaryColor": "#D4AF37",
      "accentColor": "#088395",
      "backgroundColor": "#FAFAFA",
      "textColor": "#1A1A1A",
      "fontFamily": "Cairo",
      "fontFamilyEn": "Playfair Display",
      "borderRadius": "12px",
      "logoUrl": "https://cdn.arabaldives.com/logos/luxury-maldives.svg"
    },

    "categories": [
      {
        "name": "منتجعات فاخرة",
        "nameEn": "Luxury Resorts",
        "slug": "luxury-resorts",
        "icon": "hotel",
        "description": "أفخم المنتجعات في جزر المالديف"
      },
      {
        "name": "شهر العسل",
        "nameEn": "Honeymoon",
        "slug": "honeymoon",
        "icon": "heart",
        "description": "تجارب رومانسية لا تُنسى"
      },
      {
        "name": "فلل فوق الماء",
        "nameEn": "Overwater Villas",
        "slug": "overwater-villas",
        "icon": "water",
        "description": "إقامة فريدة فوق المياه الفيروزية"
      },
      {
        "name": "مطاعم حلال",
        "nameEn": "Halal Dining",
        "slug": "halal-dining",
        "icon": "utensils",
        "description": "أفضل المطاعم الحلال"
      },
      {
        "name": "أنشطة ومغامرات",
        "nameEn": "Activities",
        "slug": "activities",
        "icon": "compass",
        "description": "غوص، سنوركلينج، ورحلات"
      }
    ],

    "affiliates": [
      {
        "partner": "booking",
        "affiliateId": "aid=123456",
        "commission": 4.0
      },
      {
        "partner": "agoda",
        "affiliateId": "cid=789012",
        "commission": 5.0
      },
      {
        "partner": "getyourguide",
        "affiliateId": "partner_id=345678",
        "commission": 8.0
      },
      {
        "partner": "viator",
        "affiliateId": "pid=901234",
        "commission": 8.0
      }
    ],

    "seo": {
      "titleTemplate": "%s | جزر المالديف الفاخرة",
      "defaultTitle": "جزر المالديف الفاخرة - دليلك لأفخم المنتجعات",
      "defaultDescription": "اكتشف أفخم منتجعات المالديف، فلل فوق الماء، وتجارب شهر العسل. دليلك الشامل بالعربية.",
      "keywords": ["المالديف", "منتجعات فاخرة", "شهر العسل", "فلل فوق الماء"],
      "ogImage": "https://cdn.arabaldives.com/og/luxury-maldives.jpg"
    },

    "settings": {
      "enableComments": false,
      "enableNewsletter": true,
      "enableExitIntent": true,
      "enablePdfGuides": true,
      "showPrices": true,
      "currency": "USD",
      "secondaryCurrency": "SAR",
      "timezone": "Asia/Riyadh",
      "analyticsId": "G-XXXXXXXXXX"
    }
  }' | jq

# Store the site ID
SITE_ID=$(curl -s ... | jq -r '.site.id')
```

### 4.4 Update Site Settings

```bash
# Update branding
curl -X PATCH "$BASE_URL/api/admin/command-center/sites" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "SITE_ID",
    "branding": {
      "primaryColor": "#1A5F7A",
      "secondaryColor": "#FFD700"
    }
  }' | jq

# Update SEO settings
curl -X PATCH "$BASE_URL/api/admin/command-center/sites" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "SITE_ID",
    "seo": {
      "titleTemplate": "%s | المالديف الفاخرة 2026"
    }
  }' | jq

# Toggle site status
curl -X PATCH "$BASE_URL/api/admin/command-center/sites" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "SITE_ID",
    "isActive": false
  }' | jq
```

### 4.5 Domain Management

```bash
# Add custom domain
curl -X POST "$BASE_URL/api/admin/command-center/sites/domains" \
  -H "Content-Type: application/json" \
  -d '{
    "siteId": "SITE_ID",
    "domain": "luxurymaldives.com",
    "isPrimary": true
  }' | jq

# Verify domain DNS
curl -X POST "$BASE_URL/api/admin/command-center/sites/domains/verify" \
  -H "Content-Type: application/json" \
  -d '{
    "siteId": "SITE_ID",
    "domain": "luxurymaldives.com"
  }' | jq

# Generate SSL certificate
curl -X POST "$BASE_URL/api/admin/command-center/sites/domains/ssl" \
  -H "Content-Type: application/json" \
  -d '{
    "siteId": "SITE_ID",
    "domain": "luxurymaldives.com"
  }' | jq
```

---

## 5. Design System & Theming

### 5.1 Theme Configuration

```bash
# Get current theme
curl -X GET "$BASE_URL/api/admin/command-center/sites/SITE_ID/theme" | jq

# Update complete theme
curl -X PUT "$BASE_URL/api/admin/command-center/sites/SITE_ID/theme" \
  -H "Content-Type: application/json" \
  -d '{
    "colors": {
      "primary": {
        "50": "#E6F3F7",
        "100": "#CCE7EF",
        "200": "#99CFDF",
        "300": "#66B7CF",
        "400": "#339FBF",
        "500": "#0A4D68",
        "600": "#083E53",
        "700": "#062E3E",
        "800": "#041F2A",
        "900": "#020F15"
      },
      "secondary": {
        "50": "#FFF9E6",
        "100": "#FFF3CC",
        "200": "#FFE799",
        "300": "#FFDB66",
        "400": "#FFCF33",
        "500": "#D4AF37",
        "600": "#AA8C2C",
        "700": "#7F6921",
        "800": "#554616",
        "900": "#2A230B"
      },
      "accent": "#088395",
      "success": "#10B981",
      "warning": "#F59E0B",
      "error": "#EF4444",
      "info": "#3B82F6"
    },

    "typography": {
      "fontFamily": {
        "ar": "Cairo, Noto Sans Arabic, sans-serif",
        "en": "Playfair Display, Georgia, serif",
        "body": "Inter, system-ui, sans-serif"
      },
      "fontSize": {
        "xs": "0.75rem",
        "sm": "0.875rem",
        "base": "1rem",
        "lg": "1.125rem",
        "xl": "1.25rem",
        "2xl": "1.5rem",
        "3xl": "1.875rem",
        "4xl": "2.25rem",
        "5xl": "3rem"
      },
      "fontWeight": {
        "normal": 400,
        "medium": 500,
        "semibold": 600,
        "bold": 700
      },
      "lineHeight": {
        "tight": 1.25,
        "normal": 1.5,
        "relaxed": 1.75
      }
    },

    "spacing": {
      "container": {
        "sm": "640px",
        "md": "768px",
        "lg": "1024px",
        "xl": "1280px"
      },
      "section": {
        "sm": "2rem",
        "md": "4rem",
        "lg": "6rem"
      }
    },

    "borderRadius": {
      "none": "0",
      "sm": "4px",
      "md": "8px",
      "lg": "12px",
      "xl": "16px",
      "full": "9999px"
    },

    "shadows": {
      "sm": "0 1px 2px rgba(0,0,0,0.05)",
      "md": "0 4px 6px rgba(0,0,0,0.1)",
      "lg": "0 10px 15px rgba(0,0,0,0.1)",
      "xl": "0 20px 25px rgba(0,0,0,0.15)"
    },

    "components": {
      "button": {
        "borderRadius": "lg",
        "padding": "12px 24px",
        "fontSize": "base",
        "fontWeight": "semibold"
      },
      "card": {
        "borderRadius": "xl",
        "shadow": "md",
        "padding": "24px"
      },
      "input": {
        "borderRadius": "md",
        "borderColor": "gray-300",
        "focusColor": "primary-500"
      }
    },

    "rtl": {
      "enabled": true,
      "defaultDirection": "rtl",
      "flipIcons": true,
      "mirrorLayout": true
    }
  }' | jq
```

### 5.2 Component Style Overrides

```bash
# Update specific component styles
curl -X PATCH "$BASE_URL/api/admin/command-center/sites/SITE_ID/theme/components" \
  -H "Content-Type: application/json" \
  -d '{
    "hero": {
      "height": "80vh",
      "overlay": "rgba(0,0,0,0.4)",
      "textAlign": "center",
      "titleSize": "4xl",
      "subtitleSize": "xl"
    },
    "resortCard": {
      "aspectRatio": "4/3",
      "showRating": true,
      "showPrice": true,
      "showQuickView": true,
      "hoverEffect": "lift"
    },
    "newsletter": {
      "style": "floating",
      "position": "bottom-right",
      "showOnScroll": 50,
      "exitIntent": true
    },
    "navigation": {
      "style": "sticky",
      "transparent": true,
      "blur": true,
      "height": "72px"
    },
    "footer": {
      "columns": 4,
      "showNewsletter": true,
      "showSocial": true,
      "style": "dark"
    }
  }' | jq
```

### 5.3 Generate Theme from Image

```bash
# Extract colors from inspiration image
curl -X POST "$BASE_URL/api/admin/command-center/sites/SITE_ID/theme/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://example.com/maldives-sunset.jpg",
    "style": "luxury",
    "generateFull": true
  }' | jq
```

### 5.4 CSS Custom Properties Export

```bash
# Get CSS variables for theme
curl -X GET "$BASE_URL/api/admin/command-center/sites/SITE_ID/theme/css" | jq

# Expected:
# {
#   "css": ":root { --color-primary: #0A4D68; --color-secondary: #D4AF37; ... }"
# }
```

---

## 6. AI Content Generation

### 6.1 Resort Reviews

```bash
# Generate Arabic resort review
curl -X POST "$BASE_URL/api/admin/command-center/content/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "resort_review",
    "siteId": "SITE_ID",
    "locale": "ar",
    "destination": "Soneva Fushi",
    "options": {
      "rating": 5,
      "priceRange": "$$$$",
      "highlights": [
        "Private beach",
        "Butler service",
        "Underwater restaurant",
        "Spa over water",
        "Cinema under stars"
      ],
      "amenities": [
        "Overwater villa",
        "Private pool",
        "Halal dining",
        "Kids club",
        "Diving center"
      ],
      "targetAudience": "honeymooners",
      "tone": "luxurious",
      "wordCount": 2000,
      "includeSections": [
        "overview",
        "location",
        "accommodation",
        "dining",
        "activities",
        "spa",
        "verdict",
        "practical_info"
      ],
      "includeAffiliateLinks": true,
      "generateImages": true
    }
  }' | jq
```

### 6.2 Comparison Articles

```bash
# Generate resort comparison
curl -X POST "$BASE_URL/api/admin/command-center/content/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "comparison",
    "siteId": "SITE_ID",
    "locale": "ar",
    "destination": "Maldives Luxury Resorts",
    "options": {
      "resorts": [
        {
          "name": "Soneva Fushi",
          "priceRange": "$$$$",
          "category": "eco-luxury"
        },
        {
          "name": "One&Only Reethi Rah",
          "priceRange": "$$$$",
          "category": "ultra-luxury"
        },
        {
          "name": "Conrad Maldives",
          "priceRange": "$$$",
          "category": "luxury"
        },
        {
          "name": "Anantara Kihavah",
          "priceRange": "$$$$",
          "category": "luxury"
        }
      ],
      "criteria": [
        "price_value",
        "location_accessibility",
        "villa_quality",
        "dining_options",
        "activities",
        "spa_wellness",
        "family_friendly",
        "romance_factor",
        "service_quality"
      ],
      "format": "detailed",
      "includeTable": true,
      "includeVerdict": true,
      "targetAudience": "Gulf tourists"
    }
  }' | jq
```

### 6.3 Travel Guides

```bash
# Generate comprehensive travel guide
curl -X POST "$BASE_URL/api/admin/command-center/content/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "travel_guide",
    "siteId": "SITE_ID",
    "locale": "ar",
    "destination": "Maldives",
    "options": {
      "sections": [
        {
          "type": "intro",
          "title": "مقدمة عن جزر المالديف"
        },
        {
          "type": "best_time",
          "title": "أفضل وقت للزيارة",
          "includeWeatherChart": true
        },
        {
          "type": "getting_there",
          "title": "كيفية الوصول",
          "fromCities": ["Riyadh", "Dubai", "Jeddah", "Kuwait"]
        },
        {
          "type": "visa",
          "title": "متطلبات التأشيرة",
          "forNationalities": ["Saudi", "UAE", "Kuwait", "Qatar"]
        },
        {
          "type": "accommodation",
          "title": "أنواع الإقامة",
          "budgetRanges": ["budget", "mid-range", "luxury", "ultra-luxury"]
        },
        {
          "type": "activities",
          "title": "الأنشطة والتجارب",
          "categories": ["water", "relaxation", "adventure", "romance"]
        },
        {
          "type": "dining",
          "title": "المطاعم والطعام",
          "includeHalal": true
        },
        {
          "type": "budget",
          "title": "تكاليف الرحلة",
          "currency": "SAR"
        },
        {
          "type": "tips",
          "title": "نصائح مهمة"
        },
        {
          "type": "packing",
          "title": "قائمة التعبئة"
        },
        {
          "type": "itineraries",
          "title": "برامج مقترحة",
          "durations": ["5-days", "7-days", "10-days"]
        }
      ],
      "wordCount": 5000,
      "includeAffiliateLinks": true,
      "includeImages": true,
      "seoOptimized": true
    }
  }' | jq
```

### 6.4 Listicles & Rankings

```bash
# Generate top 10 list
curl -X POST "$BASE_URL/api/admin/command-center/content/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "listicle",
    "siteId": "SITE_ID",
    "locale": "ar",
    "destination": "Maldives",
    "options": {
      "title": "أفضل 10 منتجعات لشهر العسل في المالديف 2026",
      "count": 10,
      "criteria": "honeymoon",
      "includeDetails": true,
      "includeRankingFactors": true,
      "includePrices": true,
      "includeBookingLinks": true
    }
  }' | jq
```

### 6.5 Content Ideas Generator

```bash
# Generate content ideas for content calendar
curl -X POST "$BASE_URL/api/admin/command-center/content/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "ideas",
    "siteId": "SITE_ID",
    "locale": "ar",
    "destination": "Maldives",
    "options": {
      "count": 30,
      "timeframe": "monthly",
      "categories": ["resorts", "activities", "tips", "comparisons"],
      "includeKeywords": true,
      "includeSearchVolume": true,
      "includeDifficulty": true,
      "targetAudience": "Gulf tourists",
      "contentTypes": ["article", "listicle", "guide", "comparison"]
    }
  }' | jq
```

### 6.6 Content Improvement

```bash
# Improve existing content
curl -X POST "$BASE_URL/api/admin/command-center/content/improve" \
  -H "Content-Type: application/json" \
  -d '{
    "contentId": "CONTENT_ID",
    "improvements": [
      "seo_optimization",
      "readability",
      "add_statistics",
      "update_prices",
      "add_affiliate_links",
      "expand_sections"
    ],
    "targetWordCount": 3000
  }' | jq
```

### 6.7 Bulk Content Generation

```bash
# Generate multiple articles at once
curl -X POST "$BASE_URL/api/admin/command-center/content/bulk-generate" \
  -H "Content-Type: application/json" \
  -d '{
    "siteId": "SITE_ID",
    "locale": "ar",
    "items": [
      {
        "type": "resort_review",
        "destination": "Soneva Jani",
        "priority": 1
      },
      {
        "type": "resort_review",
        "destination": "Four Seasons Landaa Giraavaru",
        "priority": 2
      },
      {
        "type": "comparison",
        "destination": "Water Villas vs Beach Villas",
        "priority": 3
      }
    ],
    "schedule": "sequential",
    "notifyOnComplete": true
  }' | jq
```

---

## 7. Autopilot & Automation

### 7.1 View Automation Dashboard

```bash
# Get autopilot overview
curl -X GET "$BASE_URL/api/admin/command-center/autopilot/dashboard" | jq

# Expected:
# {
#   "status": "running",
#   "activeTasks": 5,
#   "completedToday": 12,
#   "failedToday": 1,
#   "nextExecution": "2026-01-05T11:00:00Z",
#   "queued": 8,
#   "stats": {
#     "contentGenerated": 150,
#     "postsPublished": 45,
#     "emailsSent": 1200
#   }
# }
```

### 7.2 Task Management

```bash
# List all tasks
curl -X GET "$BASE_URL/api/admin/command-center/autopilot/tasks" | jq

# Create content generation task
curl -X POST "$BASE_URL/api/admin/command-center/autopilot/tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Weekly Resort Reviews",
    "description": "Generate 3 resort reviews every Monday",
    "taskType": "content_generation",
    "schedule": "0 9 * * 1",
    "timezone": "Asia/Riyadh",
    "siteId": "SITE_ID",
    "isActive": true,
    "config": {
      "contentType": "resort_review",
      "locale": "ar",
      "count": 3,
      "autoPublish": false,
      "notifyOnComplete": true,
      "destinations": [
        "Soneva Fushi",
        "Conrad Maldives",
        "One&Only Reethi Rah"
      ]
    },
    "retryPolicy": {
      "maxRetries": 3,
      "backoffMinutes": 30
    }
  }' | jq

# Create SEO audit task
curl -X POST "$BASE_URL/api/admin/command-center/autopilot/tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Daily SEO Audit",
    "taskType": "seo_optimization",
    "schedule": "0 3 * * *",
    "timezone": "Asia/Riyadh",
    "siteId": "SITE_ID",
    "isActive": true,
    "config": {
      "action": "full_audit",
      "checkBrokenLinks": true,
      "checkMetaTags": true,
      "checkImages": true,
      "checkSpeed": true,
      "autoFix": {
        "metaDescriptions": true,
        "imageAlt": true,
        "internalLinks": false
      },
      "sendReport": true,
      "reportEmail": "seo@arabaldives.com"
    }
  }' | jq

# Create social posting task
curl -X POST "$BASE_URL/api/admin/command-center/autopilot/tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Daily Social Posts",
    "taskType": "social_posting",
    "schedule": "0 10,14,18 * * *",
    "timezone": "Asia/Riyadh",
    "siteId": "SITE_ID",
    "isActive": true,
    "config": {
      "platforms": ["twitter", "instagram", "facebook"],
      "contentSource": "latest_articles",
      "includeImages": true,
      "hashtags": ["المالديف", "سفر", "منتجعات"],
      "randomize": true
    }
  }' | jq

# Create analytics sync task
curl -X POST "$BASE_URL/api/admin/command-center/autopilot/tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Daily Analytics Sync",
    "taskType": "analytics_sync",
    "schedule": "0 4 * * *",
    "timezone": "UTC",
    "isActive": true,
    "config": {
      "sources": ["ga4", "search_console"],
      "dateRange": "7d",
      "generateReport": true
    }
  }' | jq

# Create email campaign task
curl -X POST "$BASE_URL/api/admin/command-center/autopilot/tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Weekly Newsletter",
    "taskType": "email_campaign",
    "schedule": "0 10 * * 4",
    "timezone": "Asia/Riyadh",
    "siteId": "SITE_ID",
    "isActive": true,
    "config": {
      "templateId": "weekly_newsletter",
      "subject": "أفضل العروض هذا الأسبوع 🏝️",
      "includeLatestContent": 5,
      "includeDeals": true,
      "segmentation": {
        "subscribedDays": 7,
        "interests": ["luxury", "honeymoon"]
      }
    }
  }' | jq

# Create PDF regeneration task
curl -X POST "$BASE_URL/api/admin/command-center/autopilot/tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Monthly PDF Update",
    "taskType": "pdf_generation",
    "schedule": "0 2 1 * *",
    "timezone": "UTC",
    "siteId": "SITE_ID",
    "isActive": true,
    "config": {
      "updateExisting": true,
      "destinations": ["Maldives", "Bali", "Seychelles"],
      "templates": ["luxury", "honeymoon"],
      "locales": ["ar", "en"]
    }
  }' | jq
```

### 7.3 Task Control

```bash
# Pause a task
curl -X PATCH "$BASE_URL/api/admin/command-center/autopilot/tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "TASK_ID",
    "isActive": false
  }' | jq

# Resume a task
curl -X PATCH "$BASE_URL/api/admin/command-center/autopilot/tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "TASK_ID",
    "isActive": true
  }' | jq

# Run task immediately (manual trigger)
curl -X POST "$BASE_URL/api/admin/command-center/autopilot/tasks/TASK_ID/run" | jq

# Delete task
curl -X DELETE "$BASE_URL/api/admin/command-center/autopilot/tasks?id=TASK_ID" | jq
```

### 7.4 View Logs & History

```bash
# Get execution logs
curl -X GET "$BASE_URL/api/admin/command-center/autopilot/logs?limit=50" | jq

# Filter by task type
curl -X GET "$BASE_URL/api/admin/command-center/autopilot/logs?type=content_generation" | jq

# Filter by status
curl -X GET "$BASE_URL/api/admin/command-center/autopilot/logs?status=failed" | jq

# Get specific task history
curl -X GET "$BASE_URL/api/admin/command-center/autopilot/tasks/TASK_ID/history" | jq
```

### 7.5 Cron Endpoints

```bash
# Trigger autopilot cron manually
curl -X POST "$BASE_URL/api/cron/autopilot" \
  -H "Content-Type: application/json" \
  -d '{"secret": "your-cron-secret"}' | jq

# Trigger analytics sync
curl -X GET "$BASE_URL/api/cron/analytics" \
  -H "Authorization: Bearer your-cron-secret" | jq

# Trigger social posting
curl -X GET "$BASE_URL/api/cron/social" \
  -H "Authorization: Bearer your-cron-secret" | jq
```

---

## 8. Analytics & Reporting

### 8.1 Unified Analytics Dashboard

```bash
# Get all-sites analytics
curl -X GET "$BASE_URL/api/admin/command-center/analytics?range=30d" | jq

# Expected:
# {
#   "overview": {
#     "totalPageviews": 125000,
#     "uniqueVisitors": 45000,
#     "avgSessionDuration": "3:45",
#     "bounceRate": 42.5,
#     "conversionRate": 2.8
#   },
#   "bysite": [...],
#   "traffic": {
#     "organic": 65,
#     "direct": 20,
#     "referral": 10,
#     "social": 5
#   },
#   "topPages": [...],
#   "topCountries": [...],
#   "revenue": {
#     "total": 15000,
#     "affiliates": 12000,
#     "products": 3000
#   }
# }
```

### 8.2 Site-Specific Analytics

```bash
# Get site analytics
curl -X GET "$BASE_URL/api/admin/command-center/analytics?site=SITE_ID&range=7d" | jq

# Get content performance
curl -X GET "$BASE_URL/api/admin/command-center/analytics/content?site=SITE_ID" | jq

# Get conversion funnel
curl -X GET "$BASE_URL/api/admin/command-center/analytics/funnel?site=SITE_ID" | jq
```

### 8.3 Search Console Data

```bash
# Get search performance
curl -X GET "$BASE_URL/api/admin/command-center/analytics/search?site=SITE_ID&range=28d" | jq

# Expected:
# {
#   "totalClicks": 8500,
#   "totalImpressions": 125000,
#   "avgCTR": 6.8,
#   "avgPosition": 12.5,
#   "topQueries": [
#     { "query": "منتجعات المالديف", "clicks": 450, "impressions": 5200, "ctr": 8.6, "position": 5.2 }
#   ],
#   "indexingStatus": {
#     "indexed": 150,
#     "notIndexed": 5,
#     "errors": 2
#   }
# }
```

### 8.4 Generate Reports

```bash
# Generate PDF report
curl -X POST "$BASE_URL/api/admin/command-center/analytics/report" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "monthly",
    "sites": ["SITE_ID"],
    "dateRange": "2025-12-01/2025-12-31",
    "sections": [
      "traffic_overview",
      "content_performance",
      "search_visibility",
      "revenue_breakdown",
      "recommendations"
    ],
    "format": "pdf",
    "sendTo": ["reports@arabaldives.com"]
  }' | jq
```

---

## 9. Social Media Management

### 9.1 Account Management

```bash
# List connected accounts
curl -X GET "$BASE_URL/api/admin/command-center/social/accounts" | jq

# Connect Twitter/X
curl -X POST "$BASE_URL/api/admin/command-center/social/accounts" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "twitter",
    "credentials": {
      "apiKey": "your-api-key",
      "apiSecret": "your-api-secret",
      "accessToken": "your-access-token",
      "accessSecret": "your-access-secret"
    },
    "handle": "@arabaldives",
    "siteId": "SITE_ID"
  }' | jq

# Connect Instagram
curl -X POST "$BASE_URL/api/admin/command-center/social/accounts" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "instagram",
    "credentials": {
      "accessToken": "your-instagram-token",
      "businessId": "your-business-id"
    },
    "handle": "@arabaldives",
    "siteId": "SITE_ID"
  }' | jq

# Connect Facebook Page
curl -X POST "$BASE_URL/api/admin/command-center/social/accounts" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "facebook",
    "credentials": {
      "pageToken": "your-page-token",
      "pageId": "your-page-id"
    },
    "pageName": "Arabaldives",
    "siteId": "SITE_ID"
  }' | jq

# Disconnect account
curl -X DELETE "$BASE_URL/api/admin/command-center/social/accounts?id=ACCOUNT_ID" | jq
```

### 9.2 Post Management

```bash
# List all posts
curl -X GET "$BASE_URL/api/admin/command-center/social/posts?status=all" | jq

# Create scheduled post
curl -X POST "$BASE_URL/api/admin/command-center/social/posts" \
  -H "Content-Type: application/json" \
  -d '{
    "content": {
      "ar": "🏝️ اكتشف سحر جزر المالديف! دليلنا الجديد يكشف أفضل فلل فوق الماء لعام 2026.\n\n#المالديف #سفر #شهر_العسل",
      "en": "🏝️ Discover the magic of Maldives! Our new guide reveals the best overwater villas for 2026.\n\n#Maldives #Travel #Honeymoon"
    },
    "platforms": ["twitter", "instagram", "facebook"],
    "siteId": "SITE_ID",
    "scheduledFor": "2026-01-06T10:00:00+03:00",
    "media": [
      {
        "type": "image",
        "url": "https://cdn.arabaldives.com/social/maldives-villa.jpg",
        "alt": "Overwater villa at sunset"
      }
    ],
    "link": "https://arabaldives.com/guides/overwater-villas",
    "options": {
      "firstComment": "Book now and save up to 20%! Link in bio.",
      "crossPost": true
    }
  }' | jq

# Create post with AI-generated content
curl -X POST "$BASE_URL/api/admin/command-center/social/posts/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "contentId": "ARTICLE_ID",
    "platforms": ["twitter", "instagram"],
    "tone": "engaging",
    "includeEmojis": true,
    "generateHashtags": true,
    "locale": "ar",
    "scheduledFor": "2026-01-06T14:00:00+03:00"
  }' | jq

# Update post
curl -X PATCH "$BASE_URL/api/admin/command-center/social/posts" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "POST_ID",
    "scheduledFor": "2026-01-07T10:00:00+03:00"
  }' | jq

# Delete post
curl -X DELETE "$BASE_URL/api/admin/command-center/social/posts?id=POST_ID" | jq
```

### 9.3 Content Calendar

```bash
# Get calendar view
curl -X GET "$BASE_URL/api/admin/command-center/social/calendar?month=2026-01" | jq

# Bulk schedule posts
curl -X POST "$BASE_URL/api/admin/command-center/social/posts/bulk" \
  -H "Content-Type: application/json" \
  -d '{
    "posts": [
      {
        "content": "Post 1 content",
        "platforms": ["twitter"],
        "scheduledFor": "2026-01-06T10:00:00Z"
      },
      {
        "content": "Post 2 content",
        "platforms": ["twitter", "instagram"],
        "scheduledFor": "2026-01-07T10:00:00Z"
      }
    ],
    "siteId": "SITE_ID"
  }' | jq
```

### 9.4 Social Analytics

```bash
# Get social performance
curl -X GET "$BASE_URL/api/admin/command-center/social/analytics?range=30d" | jq

# Expected:
# {
#   "overview": {
#     "totalPosts": 45,
#     "totalEngagement": 12500,
#     "avgEngagementRate": 4.2,
#     "followers": {
#       "twitter": 15000,
#       "instagram": 25000,
#       "facebook": 8000
#     }
#   },
#   "byPlatform": {...},
#   "topPosts": [...],
#   "bestTimes": {...}
# }
```

---

## 10. Affiliate & Revenue Tracking

### 10.1 Affiliate Dashboard

```bash
# Get affiliate overview
curl -X GET "$BASE_URL/api/admin/command-center/affiliates?range=30d" | jq

# Expected:
# {
#   "revenue": {
#     "total": 15000,
#     "pending": 3500,
#     "paid": 11500
#   },
#   "clicks": 45000,
#   "conversions": 850,
#   "conversionRate": 1.89,
#   "avgOrderValue": 450,
#   "byPartner": [
#     {
#       "partner": "Booking.com",
#       "clicks": 20000,
#       "conversions": 400,
#       "revenue": 7200,
#       "commission": 4.0
#     }
#   ],
#   "topContent": [...],
#   "trends": {...}
# }
```

### 10.2 Partner Management

```bash
# List partners
curl -X GET "$BASE_URL/api/admin/command-center/affiliates/partners" | jq

# Add new partner
curl -X POST "$BASE_URL/api/admin/command-center/affiliates/partners" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Booking.com",
    "slug": "booking",
    "partnerType": "HOTEL",
    "affiliateId": "aid=123456",
    "trackingDomain": "www.booking.com",
    "commissionRate": 4.0,
    "cookieDays": 30,
    "paymentTerms": "monthly",
    "minimumPayout": 100,
    "currency": "USD",
    "deepLinkFormat": "https://www.booking.com/hotel/{slug}.html?aid=123456",
    "apiCredentials": {
      "apiKey": "your-api-key",
      "secret": "your-secret"
    },
    "isActive": true
  }' | jq

# Update partner
curl -X PATCH "$BASE_URL/api/admin/command-center/affiliates/partners" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "PARTNER_ID",
    "commissionRate": 5.0
  }' | jq
```

### 10.3 Link Management

```bash
# Generate affiliate link
curl -X POST "$BASE_URL/api/admin/command-center/affiliates/links/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "partnerId": "PARTNER_ID",
    "destination": "https://www.booking.com/hotel/mv/soneva-fushi.html",
    "campaign": "maldives-guide",
    "contentId": "CONTENT_ID"
  }' | jq

# Get link analytics
curl -X GET "$BASE_URL/api/admin/command-center/affiliates/links/LINK_ID/stats" | jq
```

### 10.4 Revenue Reports

```bash
# Generate revenue report
curl -X POST "$BASE_URL/api/admin/command-center/affiliates/reports" \
  -H "Content-Type: application/json" \
  -d '{
    "dateRange": "2025-12-01/2025-12-31",
    "groupBy": "partner",
    "format": "csv",
    "sendTo": ["finance@arabaldives.com"]
  }' | jq
```

---

## 11. PDF Guide Generation

### 11.1 List PDF Guides

```bash
# Get all guides
curl -X GET "$BASE_URL/api/admin/command-center/products/pdf" | jq

# Filter by site
curl -X GET "$BASE_URL/api/admin/command-center/products/pdf?site=SITE_ID" | jq

# Filter by status
curl -X GET "$BASE_URL/api/admin/command-center/products/pdf?status=published" | jq
```

### 11.2 Generate PDF Guide

```bash
# Generate luxury Arabic guide
curl -X POST "$BASE_URL/api/admin/command-center/products/pdf/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "دليل المالديف الفاخر 2026",
    "subtitle": "كل ما تحتاج معرفته لرحلة لا تُنسى",
    "destination": "Maldives",
    "template": "luxury",
    "locale": "ar",
    "siteId": "SITE_ID",
    "includeAffiliate": true,
    "options": {
      "coverImage": "https://cdn.arabaldives.com/covers/maldives-luxury.jpg",
      "pageCount": 25,
      "sections": [
        {
          "type": "intro",
          "title": "مقدمة",
          "aiGenerate": true
        },
        {
          "type": "resorts",
          "title": "أفضل 10 منتجعات",
          "count": 10,
          "aiGenerate": true
        },
        {
          "type": "activities",
          "title": "الأنشطة والتجارب",
          "aiGenerate": true
        },
        {
          "type": "dining",
          "title": "المطاعم الحلال",
          "aiGenerate": true
        },
        {
          "type": "itinerary",
          "title": "برنامج 7 أيام",
          "days": 7,
          "aiGenerate": true
        },
        {
          "type": "budget",
          "title": "تقدير التكاليف",
          "currency": "SAR",
          "aiGenerate": true
        },
        {
          "type": "packing",
          "title": "قائمة التعبئة",
          "aiGenerate": true
        },
        {
          "type": "tips",
          "title": "نصائح مهمة",
          "aiGenerate": true
        },
        {
          "type": "affiliate",
          "title": "احجز رحلتك",
          "partners": ["booking", "agoda", "getyourguide"]
        }
      ],
      "branding": {
        "primaryColor": "#0A4D68",
        "secondaryColor": "#D4AF37",
        "fontFamily": "Cairo"
      },
      "watermark": false,
      "generateThumbnail": true
    }
  }' | jq
```

### 11.3 Template Options

```bash
# Available templates
# - luxury: Gold accents, elegant typography
# - budget: Green theme, practical focus
# - family: Blue theme, kid-friendly content
# - adventure: Orange theme, activity focus
# - honeymoon: Pink/rose theme, romantic content

# Generate honeymoon guide
curl -X POST "$BASE_URL/api/admin/command-center/products/pdf/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Maldives Honeymoon Guide 2026",
    "subtitle": "Plan Your Perfect Romantic Getaway",
    "destination": "Maldives",
    "template": "honeymoon",
    "locale": "en",
    "siteId": "SITE_ID",
    "options": {
      "focus": "romance",
      "includeCoupleActivities": true,
      "includePrivateDining": true
    }
  }' | jq
```

### 11.4 Download Tracking & Lead Capture

```bash
# Track download with lead capture
curl -X POST "$BASE_URL/api/admin/command-center/products/pdf/download" \
  -H "Content-Type: application/json" \
  -d '{
    "guideId": "GUIDE_ID",
    "email": "user@example.com",
    "name": "Ahmed",
    "source": "exit_intent_popup",
    "metadata": {
      "page": "/maldives/resorts",
      "referrer": "google",
      "device": "mobile"
    }
  }' | jq

# Get download statistics
curl -X GET "$BASE_URL/api/admin/command-center/products/pdf/download?guideId=GUIDE_ID&days=30" | jq
```

### 11.5 PDF Preview

```bash
# Preview PDF without saving
curl -X PUT "$BASE_URL/api/admin/command-center/products/pdf/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Preview Guide",
    "destination": "Bali",
    "template": "adventure",
    "locale": "en",
    "sections": [
      {"type": "intro", "title": "Welcome", "content": "Test content"}
    ],
    "branding": {
      "primaryColor": "#E65100",
      "secondaryColor": "#FF9800",
      "siteName": "Test Site"
    }
  }' | jq '.html' > preview.html && open preview.html
```

---

## 12. Email Marketing & Lead Capture

### 12.1 Lead Management

```bash
# Get all leads
curl -X GET "$BASE_URL/api/admin/command-center/leads?limit=100" | jq

# Filter leads
curl -X GET "$BASE_URL/api/admin/command-center/leads?source=pdf_download&status=new" | jq

# Export leads
curl -X GET "$BASE_URL/api/admin/command-center/leads/export?format=csv" > leads.csv
```

### 12.2 Email Campaigns

```bash
# Create campaign
curl -X POST "$BASE_URL/api/admin/command-center/email/campaigns" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "January Newsletter",
    "subject": {
      "ar": "🏝️ أفضل العروض لشهر يناير",
      "en": "🏝️ Best January Deals"
    },
    "templateId": "newsletter",
    "siteId": "SITE_ID",
    "scheduledFor": "2026-01-10T10:00:00+03:00",
    "segments": ["all_subscribers"],
    "content": {
      "header": "أهلاً بك في نشرتنا الأسبوعية",
      "featuredContent": ["CONTENT_ID_1", "CONTENT_ID_2"],
      "deals": true,
      "footer": "تابعنا على وسائل التواصل"
    }
  }' | jq

# Send test email
curl -X POST "$BASE_URL/api/admin/command-center/email/campaigns/CAMPAIGN_ID/test" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@arabaldives.com"
  }' | jq

# Send campaign
curl -X POST "$BASE_URL/api/admin/command-center/email/campaigns/CAMPAIGN_ID/send" | jq
```

### 12.3 Email Templates

```bash
# List templates
curl -X GET "$BASE_URL/api/admin/command-center/email/templates" | jq

# Create template
curl -X POST "$BASE_URL/api/admin/command-center/email/templates" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "welcome_series_1",
    "subject": "مرحباً بك في عائلة أرابالديفز! 🏝️",
    "type": "automation",
    "html": "<html>...</html>",
    "variables": ["name", "download_link"]
  }' | jq
```

### 12.4 Automation Sequences

```bash
# Create welcome sequence
curl -X POST "$BASE_URL/api/admin/command-center/email/automations" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "PDF Download Welcome",
    "trigger": "pdf_download",
    "siteId": "SITE_ID",
    "isActive": true,
    "emails": [
      {
        "templateId": "welcome_1",
        "delay": 0,
        "subject": "Here is your guide! 🏝️"
      },
      {
        "templateId": "tips_email",
        "delay": 3,
        "delayUnit": "days",
        "subject": "Planning your trip? Here are our top tips"
      },
      {
        "templateId": "deals_email",
        "delay": 7,
        "delayUnit": "days",
        "subject": "Exclusive deals for you"
      }
    ]
  }' | jq
```

---

## 13. SEO Automation

### 13.1 SEO Audit

```bash
# Run full SEO audit
curl -X POST "$BASE_URL/api/admin/command-center/seo/audit" \
  -H "Content-Type: application/json" \
  -d '{
    "siteId": "SITE_ID",
    "checks": [
      "meta_tags",
      "headings",
      "images",
      "links",
      "schema",
      "speed",
      "mobile",
      "accessibility"
    ]
  }' | jq

# Get audit results
curl -X GET "$BASE_URL/api/admin/command-center/seo/audit/AUDIT_ID" | jq
```

### 13.2 Auto-Optimization

```bash
# Enable auto-optimization
curl -X POST "$BASE_URL/api/admin/command-center/seo/auto-optimize" \
  -H "Content-Type: application/json" \
  -d '{
    "siteId": "SITE_ID",
    "features": {
      "autoMetaDescriptions": true,
      "autoImageAlt": true,
      "autoInternalLinks": true,
      "autoSchema": true,
      "autoSitemap": true
    }
  }' | jq
```

### 13.3 Keyword Tracking

```bash
# Add keywords to track
curl -X POST "$BASE_URL/api/admin/command-center/seo/keywords" \
  -H "Content-Type: application/json" \
  -d '{
    "siteId": "SITE_ID",
    "keywords": [
      {"keyword": "منتجعات المالديف", "locale": "ar"},
      {"keyword": "maldives resorts", "locale": "en"},
      {"keyword": "شهر العسل المالديف", "locale": "ar"}
    ]
  }' | jq

# Get keyword rankings
curl -X GET "$BASE_URL/api/admin/command-center/seo/keywords?site=SITE_ID" | jq
```

### 13.4 Schema Generation

```bash
# Generate schema for content
curl -X POST "$BASE_URL/api/admin/command-center/seo/schema/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "contentId": "CONTENT_ID",
    "types": ["Article", "FAQPage", "HowTo", "Review"]
  }' | jq
```

---

## 14. Multi-Tenant Operations

### 14.1 Tenant Management

```bash
# List all tenants
curl -X GET "$BASE_URL/api/admin/command-center/tenants" | jq

# Create tenant
curl -X POST "$BASE_URL/api/admin/command-center/tenants" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Partner Travel Agency",
    "slug": "partner-agency",
    "plan": "professional",
    "limits": {
      "sites": 5,
      "contentPerMonth": 100,
      "storageGB": 10
    },
    "owner": {
      "email": "partner@agency.com",
      "name": "Partner Admin"
    }
  }' | jq
```

### 14.2 Cross-Site Operations

```bash
# Bulk content across sites
curl -X POST "$BASE_URL/api/admin/command-center/content/cross-site" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "duplicate",
    "sourceContent": "CONTENT_ID",
    "targetSites": ["SITE_ID_1", "SITE_ID_2"],
    "localize": true
  }' | jq

# Sync settings across sites
curl -X POST "$BASE_URL/api/admin/command-center/sites/sync" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceSite": "SITE_ID",
    "targetSites": ["SITE_ID_1", "SITE_ID_2"],
    "syncItems": ["affiliates", "seo_settings", "email_templates"]
  }' | jq
```

---

## 15. Workflow Automation Recipes

### 15.1 Complete Site Launch Workflow

```bash
#!/bin/bash
BASE_URL="http://localhost:3000"

echo "=== WORKFLOW: Complete Site Launch ==="

# Step 1: Generate site config
echo "Step 1: Generating site configuration..."
CONFIG=$(curl -s -X POST "$BASE_URL/api/admin/command-center/sites/generate-config" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Luxury Seychelles travel site for Gulf tourists",
    "locale": "ar"
  }')
echo "Config generated: $(echo $CONFIG | jq -r '.config.name')"

# Step 2: Create site
echo "Step 2: Creating site..."
SITE=$(curl -s -X POST "$BASE_URL/api/admin/command-center/sites/create" \
  -H "Content-Type: application/json" \
  -d "$(echo $CONFIG | jq '.config')")
SITE_ID=$(echo $SITE | jq -r '.site.id')
echo "Site created: $SITE_ID"

# Step 3: Generate initial content (5 articles)
echo "Step 3: Generating initial content..."
for i in {1..5}; do
  curl -s -X POST "$BASE_URL/api/admin/command-center/content/generate" \
    -H "Content-Type: application/json" \
    -d "{
      \"type\": \"resort_review\",
      \"destination\": \"Seychelles Resort $i\",
      \"locale\": \"ar\",
      \"siteId\": \"$SITE_ID\"
    }" > /dev/null
  echo "  Article $i generated"
  sleep 2
done

# Step 4: Create PDF guide
echo "Step 4: Creating PDF guide..."
curl -s -X POST "$BASE_URL/api/admin/command-center/products/pdf/generate" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"دليل سيشل الشامل\",
    \"destination\": \"Seychelles\",
    \"template\": \"luxury\",
    \"locale\": \"ar\",
    \"siteId\": \"$SITE_ID\"
  }" > /dev/null
echo "  PDF guide created"

# Step 5: Set up autopilot
echo "Step 5: Configuring autopilot..."
curl -s -X POST "$BASE_URL/api/admin/command-center/autopilot/tasks" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Weekly Content\",
    \"taskType\": \"content_generation\",
    \"schedule\": \"0 9 * * 1\",
    \"siteId\": \"$SITE_ID\",
    \"config\": {\"contentType\": \"resort_review\", \"locale\": \"ar\"},
    \"isActive\": true
  }" > /dev/null
echo "  Autopilot configured"

# Step 6: Schedule social posts
echo "Step 6: Scheduling social posts..."
for day in {1..7}; do
  DATE=$(date -d "+$day days" +%Y-%m-%dT10:00:00Z 2>/dev/null || date -v+${day}d +%Y-%m-%dT10:00:00Z)
  curl -s -X POST "$BASE_URL/api/admin/command-center/social/posts" \
    -H "Content-Type: application/json" \
    -d "{
      \"content\": \"Discover Seychelles! Day $day tip 🏝️ #Seychelles #Travel\",
      \"platforms\": [\"twitter\"],
      \"siteId\": \"$SITE_ID\",
      \"scheduledFor\": \"$DATE\"
    }" > /dev/null
done
echo "  7 social posts scheduled"

echo "=== Site launch complete! ==="
echo "Site ID: $SITE_ID"
```

### 15.2 Content Pipeline Workflow

```bash
#!/bin/bash
BASE_URL="http://localhost:3000"
SITE_ID="your-site-id"

echo "=== WORKFLOW: Monthly Content Pipeline ==="

# Generate content ideas
echo "Generating content ideas..."
IDEAS=$(curl -s -X POST "$BASE_URL/api/admin/command-center/content/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "ideas",
    "destination": "Maldives",
    "locale": "ar",
    "options": {"count": 20}
  }')

# Create content for top 10 ideas
echo "Creating content..."
echo $IDEAS | jq -r '.ideas[0:10][].title' | while read title; do
  echo "  Generating: $title"
  curl -s -X POST "$BASE_URL/api/admin/command-center/content/generate" \
    -H "Content-Type: application/json" \
    -d "{
      \"type\": \"article\",
      \"title\": \"$title\",
      \"locale\": \"ar\",
      \"siteId\": \"$SITE_ID\"
    }" > /dev/null
  sleep 3
done

echo "=== Content pipeline complete ==="
```

### 15.3 Full Backup & Migration Workflow

```bash
#!/bin/bash
BASE_URL="http://localhost:3000"
SITE_ID="source-site-id"
TARGET_SITE_ID="target-site-id"

echo "=== WORKFLOW: Site Migration ==="

# Export site data
echo "Exporting site data..."
curl -s -X GET "$BASE_URL/api/admin/command-center/sites/$SITE_ID/export" \
  -o site-backup.json

# Export content
curl -s -X GET "$BASE_URL/api/admin/command-center/content?site=$SITE_ID&export=true" \
  -o content-backup.json

# Import to target
echo "Importing to target site..."
curl -s -X POST "$BASE_URL/api/admin/command-center/sites/$TARGET_SITE_ID/import" \
  -H "Content-Type: application/json" \
  -d @site-backup.json

curl -s -X POST "$BASE_URL/api/admin/command-center/content/import" \
  -H "Content-Type: application/json" \
  -d "{\"siteId\": \"$TARGET_SITE_ID\", \"content\": $(cat content-backup.json)}"

echo "=== Migration complete ==="
```

---

## 16. Performance & Load Testing

### 16.1 API Response Times

```bash
# Install hey: brew install hey

# Status endpoint (should be <100ms)
hey -n 100 -c 10 "$BASE_URL/api/admin/command-center/status"

# Sites list (should be <200ms)
hey -n 50 -c 5 "$BASE_URL/api/admin/command-center/sites"

# Analytics (should be <500ms)
hey -n 20 -c 2 "$BASE_URL/api/admin/command-center/analytics"

# Content list (should be <300ms)
hey -n 50 -c 5 "$BASE_URL/api/admin/command-center/content"
```

### 16.2 AI Generation Performance

```bash
# Measure AI content generation time
echo "Testing AI generation performance..."
for i in {1..5}; do
  START=$(date +%s.%N)
  curl -s -X POST "$BASE_URL/api/admin/command-center/content/generate" \
    -H "Content-Type: application/json" \
    -d '{
      "type": "resort_review",
      "destination": "Test Resort",
      "locale": "en",
      "siteId": "SITE_ID"
    }' > /dev/null
  END=$(date +%s.%N)
  DURATION=$(echo "$END - $START" | bc)
  echo "  Request $i: ${DURATION}s"
done
```

### 16.3 Database Query Performance

```bash
# Check slow queries
psql $DATABASE_URL << 'SQL'
SELECT query, calls, mean_time, total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
SQL
```

---

## 17. Security Testing

### 17.1 Authentication Tests

```bash
# Test without auth
curl -X GET "$BASE_URL/api/admin/command-center/status" -v

# Test with invalid token
curl -X GET "$BASE_URL/api/admin/command-center/status" \
  -H "Authorization: Bearer invalid-token" -v

# Test cron without secret
curl -X GET "$BASE_URL/api/cron/autopilot" -v
# Expected: 401 Unauthorized

# Test cron with wrong secret
curl -X GET "$BASE_URL/api/cron/autopilot" \
  -H "Authorization: Bearer wrong-secret" -v
# Expected: 401 Unauthorized
```

### 17.2 Input Validation

```bash
# Test XSS prevention
curl -X POST "$BASE_URL/api/admin/command-center/sites/create" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "<script>alert(1)</script>",
    "slug": "test"
  }'

# Test SQL injection
curl -X GET "$BASE_URL/api/admin/command-center/sites?id=1;DROP TABLE sites;--"

# Test path traversal
curl -X GET "$BASE_URL/api/admin/command-center/content?file=../../../etc/passwd"
```

### 17.3 Rate Limiting

```bash
# Test rate limits
for i in {1..100}; do
  curl -s -o /dev/null -w "%{http_code}\n" "$BASE_URL/api/admin/command-center/status"
done | sort | uniq -c
# Should see 429 responses after limit
```

### 17.4 API Key Security

```bash
# Verify keys are encrypted in database
psql $DATABASE_URL << 'SQL'
SELECT provider,
       LEFT(api_key_encrypted, 20) as encrypted_preview,
       LENGTH(api_key_encrypted) as length
FROM "ModelProvider"
WHERE api_key_encrypted IS NOT NULL;
SQL
# Keys should be encrypted, not plaintext
```

---

## 18. Database Verification

### 18.1 Schema Verification

```bash
# Open Prisma Studio
npx prisma studio

# Or query directly
psql $DATABASE_URL << 'SQL'
-- Check all tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check Site table
\d "Site"

-- Check relationships
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY';
SQL
```

### 18.2 Data Integrity Checks

```bash
psql $DATABASE_URL << 'SQL'
-- Check for orphaned records
SELECT COUNT(*) as orphaned_articles
FROM "Article" a
LEFT JOIN "Site" s ON a.site_id = s.id
WHERE s.id IS NULL;

-- Check content status distribution
SELECT status, COUNT(*)
FROM "Article"
GROUP BY status;

-- Check PDF guide stats
SELECT
  COUNT(*) as total_guides,
  SUM(download_count) as total_downloads,
  AVG(download_count) as avg_downloads
FROM "PdfGuide";

-- Check background job status
SELECT status, COUNT(*)
FROM "BackgroundJob"
GROUP BY status;

-- Check audit log entries
SELECT action, COUNT(*)
FROM "AuditLog"
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY action
ORDER BY COUNT(*) DESC;
SQL
```

---

## 19. Error Handling & Edge Cases

### 19.1 AI Provider Failures

```bash
# Test with invalid API key
curl -X POST "$BASE_URL/api/admin/command-center/content/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "resort_review",
    "destination": "Test"
  }'
# Should return error or fallback content

# Test provider fallback (disable primary)
curl -X PATCH "$BASE_URL/api/admin/command-center/settings/api-keys" \
  -H "Content-Type: application/json" \
  -d '{"provider": "claude", "isActive": false}'

# Generate content (should use OpenAI)
curl -X POST "$BASE_URL/api/admin/command-center/content/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "resort_review",
    "destination": "Test"
  }'
```

### 19.2 Missing Required Fields

```bash
# Missing site ID
curl -X POST "$BASE_URL/api/admin/command-center/content/generate" \
  -H "Content-Type: application/json" \
  -d '{"type": "resort_review"}'

# Missing content type
curl -X POST "$BASE_URL/api/admin/command-center/content/generate" \
  -H "Content-Type: application/json" \
  -d '{"destination": "Test"}'

# Empty request
curl -X POST "$BASE_URL/api/admin/command-center/sites/create" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 19.3 Concurrent Operations

```bash
# Parallel content generation
for i in {1..5}; do
  curl -X POST "$BASE_URL/api/admin/command-center/content/generate" \
    -H "Content-Type: application/json" \
    -d "{\"type\": \"resort_review\", \"destination\": \"Resort $i\"}" &
done
wait

# Parallel site updates
for i in {1..3}; do
  curl -X PATCH "$BASE_URL/api/admin/command-center/sites" \
    -H "Content-Type: application/json" \
    -d "{\"id\": \"SITE_ID\", \"name\": \"Update $i\"}" &
done
wait
```

---

## 20. Production Deployment Checklist

### 20.1 Pre-Deployment

```bash
# Environment check
echo "Checking environment..."
[ -z "$DATABASE_URL" ] && echo "❌ DATABASE_URL missing" || echo "✅ DATABASE_URL set"
[ -z "$NEXTAUTH_SECRET" ] && echo "❌ NEXTAUTH_SECRET missing" || echo "✅ NEXTAUTH_SECRET set"
[ -z "$ENCRYPTION_KEY" ] && echo "❌ ENCRYPTION_KEY missing" || echo "✅ ENCRYPTION_KEY set"
[ -z "$CRON_SECRET" ] && echo "❌ CRON_SECRET missing" || echo "✅ CRON_SECRET set"

# At least one AI provider
[ -z "$ANTHROPIC_API_KEY" ] && [ -z "$OPENAI_API_KEY" ] && echo "❌ No AI provider configured" || echo "✅ AI provider configured"

# Build check
yarn build && echo "✅ Build successful" || echo "❌ Build failed"

# Database migration
npx prisma migrate deploy && echo "✅ Migrations applied" || echo "❌ Migration failed"
```

### 20.2 Post-Deployment Verification

```bash
PROD_URL="https://your-domain.com"

# Health check
curl -s "$PROD_URL/api/health" | jq

# Command center status
curl -s "$PROD_URL/api/admin/command-center/status" | jq

# Test AI availability
curl -s "$PROD_URL/api/admin/command-center/settings/api-keys" | jq '.providers[].isActive'

# Test cron endpoints
curl -s "$PROD_URL/api/cron/autopilot" \
  -H "Authorization: Bearer $CRON_SECRET" | jq
```

### 20.3 Monitoring Setup

```bash
# Set up monitoring alerts for:
# - API response times > 2s
# - Error rate > 1%
# - AI provider failures
# - Cron job failures
# - Database connection issues
# - Storage quota warnings
```

---

## Summary: Expected Test Results

| Category | Tests | Expected Pass Rate |
|----------|-------|-------------------|
| System Health | 5 | 100% |
| API Keys | 10 | 100% |
| Site Management | 15 | 100% |
| Design/Theming | 8 | 100% |
| AI Content | 20 | 95%+ (AI variability) |
| Autopilot | 12 | 100% |
| Analytics | 8 | 100% |
| Social Media | 10 | 100% |
| Affiliates | 8 | 100% |
| PDF Generation | 10 | 100% |
| Email Marketing | 8 | 100% |
| SEO | 6 | 100% |
| Security | 15 | 100% |
| Performance | 10 | 95%+ |

---

## Quick Start Commands

```bash
# Full test suite
./scripts/test-all.sh

# API only
./scripts/test-api.sh

# AI generation
./scripts/test-ai.sh

# Single workflow
./scripts/workflow-site-launch.sh
```

---

**Document Version:** 2.0
**Last Updated:** January 2026
**Maintainer:** Arabaldives Engineering Team
