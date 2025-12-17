# Arabaldives-on-Engine: Target Monorepo Architecture

> **Version:** 1.0.0
> **Date:** 2025-12-17
> **Status:** Proposed

---

## 1. Architecture Decision Summary

### Core Decisions

1. **Monorepo-in-repo structure using `/packages` and `/apps` folders** - Keeps existing code intact while enabling clean separation. No Turborepo/Nx initially; use TypeScript path aliases and simple build scripts.

2. **Host-based tenant resolution in Next.js middleware** - `middleware.ts` maps incoming hostname to `siteId`, injecting `x-tenant-id` header into all requests. Zero changes to existing routes initially.

3. **Tenant-scoped Prisma client wrapper** - All database queries go through `getTenantPrisma(siteId)` which automatically injects `site_id` WHERE clauses. Direct `prisma` import blocked via ESLint rule.

4. **Shared `/packages/core` for tenant-agnostic logic** - Auth, RBAC, feature flags, S3, analytics integrations live here. Apps import from `@yalla/core`.

5. **Per-tenant `/apps/arabaldives-web` and `/apps/arabaldives-admin`** - Arabaldives gets its own Next.js apps with RTL-first design. Shares engine via packages.

6. **RTL-first using CSS logical properties + Tailwind RTL plugin** - `dir="rtl"` at document level, `ms-*`/`me-*` (margin-start/end) instead of `ml-*`/`mr-*`. No conditional LTR/RTL classes.

7. **Domain modules as packages: `@yalla/resorts`, `@yalla/comparisons`, `@yalla/products`, `@yalla/leads`** - Each module owns its Prisma models, service functions, and API handlers. UI components stay in apps.

8. **Feature flags evaluated per-tenant** - `isFeatureEnabled(flag, siteId)` signature. Flags stored in `SiteConfig.feature_flags_json` with fallback to env vars.

9. **Cron jobs receive explicit `siteId` parameter** - No global cron. Each invocation targets one tenant or iterates with explicit tenant context. Audit logs include `site_id`.

10. **Incremental migration via adapter pattern** - Existing code wrapped in adapters that inject default tenant. New code uses tenant-aware APIs from day one.

11. **Strict dependency direction: apps → domain packages → core packages → shared types** - Enforced via ESLint `import/no-restricted-paths`. Domain packages cannot import from apps.

12. **Single Prisma schema with tenant discriminator** - All models include optional `site_id`. Migration adds column with default for existing data.

### Major Trade-offs

| Decision | Pros | Cons |
|----------|------|------|
| **Monorepo-in-repo (no Turborepo)** | Simple setup, no new tooling, works today | Manual dependency management, no smart caching |
| **Host-based tenancy (not path-based)** | Clean URLs, SEO-friendly, true multi-domain | Requires DNS/Vercel domain config per tenant |
| **Single Prisma schema (not schema-per-tenant)** | Simpler migrations, shared indexes | Requires discipline on `site_id` filtering |

---

## 2. Proposed Repository Layout

```
/
├── apps/
│   ├── yalla-london-web/          # Existing public site (migrated)
│   │   ├── app/                   # Next.js App Router
│   │   ├── components/            # Site-specific components
│   │   └── package.json
│   │
│   ├── yalla-london-admin/        # Existing admin (migrated)
│   │   ├── app/
│   │   ├── components/
│   │   └── package.json
│   │
│   ├── arabaldives-web/           # NEW: Arabic RTL public site
│   │   ├── app/
│   │   │   ├── layout.tsx         # RTL root layout
│   │   │   ├── page.tsx           # Homepage
│   │   │   ├── resorts/
│   │   │   │   ├── page.tsx       # Resort listing
│   │   │   │   └── [slug]/page.tsx
│   │   │   ├── compare/
│   │   │   ├── guides/
│   │   │   ├── products/
│   │   │   └── api/               # App-specific API routes
│   │   ├── components/            # RTL-first components
│   │   └── package.json
│   │
│   ├── arabaldives-admin/         # NEW: Arabic RTL admin
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── dashboard/
│   │   │   ├── resorts/
│   │   │   ├── comparisons/
│   │   │   ├── products/
│   │   │   └── leads/
│   │   ├── components/
│   │   └── package.json
│   │
│   └── cron/                      # Shared cron runner
│       ├── jobs/
│       │   ├── publish-scheduled.ts
│       │   ├── seo-audit.ts
│       │   ├── analytics-refresh.ts
│       │   └── resort-freshness-check.ts
│       ├── runner.ts              # Tenant-aware job runner
│       └── package.json
│
├── packages/
│   ├── core/                      # Tenant-agnostic engine
│   │   ├── auth/
│   │   │   ├── index.ts           # Exports: NextAuth config, session helpers
│   │   │   ├── rbac.ts
│   │   │   └── middleware.ts
│   │   ├── tenant/
│   │   │   ├── index.ts           # Exports: resolveTenant, TenantContext
│   │   │   ├── middleware.ts      # Host → siteId mapping
│   │   │   └── prisma-tenant.ts   # Tenant-scoped Prisma wrapper
│   │   ├── feature-flags/
│   │   │   ├── index.ts           # Exports: isFeatureEnabled(flag, siteId)
│   │   │   └── types.ts
│   │   ├── storage/
│   │   │   ├── s3.ts
│   │   │   └── index.ts
│   │   ├── analytics/
│   │   │   ├── ga4.ts
│   │   │   ├── gsc.ts
│   │   │   └── index.ts
│   │   ├── email/
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── db/                        # Database layer
│   │   ├── prisma/
│   │   │   ├── schema.prisma      # Single source of truth
│   │   │   └── migrations/
│   │   ├── client.ts              # Base Prisma client
│   │   ├── tenant-client.ts       # getTenantPrisma(siteId)
│   │   ├── types.ts               # Generated types re-export
│   │   └── package.json
│   │
│   ├── ui/                        # Shared UI primitives
│   │   ├── primitives/            # Radix-based (Button, Input, Dialog)
│   │   ├── rtl/                   # RTL-specific utilities
│   │   │   ├── use-direction.ts
│   │   │   ├── logical-props.ts
│   │   │   └── rtl-provider.tsx
│   │   ├── tailwind-preset.js     # Shared Tailwind config
│   │   └── package.json
│   │
│   ├── seo/                       # SEO engine
│   │   ├── sitemap.ts
│   │   ├── robots.ts
│   │   ├── schema-org.ts
│   │   ├── audit.ts
│   │   ├── internal-linking.ts
│   │   └── package.json
│   │
│   ├── content/                   # Content pipeline
│   │   ├── generation/
│   │   ├── scheduling/
│   │   ├── publishing/
│   │   └── package.json
│   │
│   ├── i18n/                      # Internationalization
│   │   ├── index.ts
│   │   ├── ar.json
│   │   ├── en.json
│   │   ├── rtl-utils.ts
│   │   └── package.json
│   │
│   │── # DOMAIN PACKAGES (Arabaldives-specific, but reusable)
│   │
│   ├── resorts/                   # Resort domain module
│   │   ├── models.ts              # Prisma model extensions
│   │   ├── service.ts             # Business logic
│   │   ├── scoring.ts             # Resort scoring algorithm
│   │   ├── freshness.ts           # Verification tracking
│   │   ├── types.ts
│   │   └── package.json
│   │
│   ├── comparisons/               # Comparison engine
│   │   ├── models.ts
│   │   ├── service.ts
│   │   ├── table-builder.ts
│   │   ├── best-for-logic.ts
│   │   ├── types.ts
│   │   └── package.json
│   │
│   ├── products/                  # Digital products
│   │   ├── models.ts
│   │   ├── service.ts
│   │   ├── checkout.ts
│   │   ├── delivery.ts            # Secure PDF delivery
│   │   ├── types.ts
│   │   └── package.json
│   │
│   ├── leads/                     # Lead capture
│   │   ├── models.ts
│   │   ├── service.ts
│   │   ├── segmentation.ts
│   │   ├── consent.ts
│   │   ├── types.ts
│   │   └── package.json
│   │
│   └── affiliates/                # Affiliate system (existing, extracted)
│       ├── models.ts
│       ├── service.ts
│       ├── widgets.ts
│       ├── tracking.ts
│       └── package.json
│
├── config/
│   ├── tenants/
│   │   ├── yalla-london.json      # Tenant-specific config
│   │   └── arabaldives.json
│   ├── shared.json
│   └── feature-flags.json
│
├── tooling/
│   ├── eslint/
│   │   └── dependency-rules.js    # Import restriction rules
│   ├── scripts/
│   │   ├── build-all.sh
│   │   ├── dev.sh
│   │   └── migrate.sh
│   └── tsconfig/
│       ├── base.json
│       ├── app.json
│       └── package.json
│
├── docs/
│   ├── architecture/
│   │   └── ARABALDIVES_MONOREPO_ARCHITECTURE.md
│   └── runbooks/
│
├── tests/
│   ├── e2e/
│   ├── integration/
│   └── unit/
│
├── package.json                   # Root workspace config
├── pnpm-workspace.yaml            # Workspace definition
├── tsconfig.json                  # Root TS config
└── turbo.json                     # (Optional) Turborepo config
```

### Module Details

#### `/packages/core` - Engine Core
| Export | Purpose | Cannot Import |
|--------|---------|---------------|
| `@yalla/core/auth` | NextAuth config, session helpers, RBAC | Domain packages, apps |
| `@yalla/core/tenant` | Tenant resolution, context, middleware | Domain packages, apps |
| `@yalla/core/feature-flags` | Flag evaluation with tenant scope | Domain packages, apps |
| `@yalla/core/storage` | S3 upload/download | Domain packages, apps |
| `@yalla/core/analytics` | GA4/GSC integrations | Domain packages, apps |
| `@yalla/core/email` | Email sending service | Domain packages, apps |

#### `/packages/db` - Database Layer
| Export | Purpose | Cannot Import |
|--------|---------|---------------|
| `@yalla/db` | Base Prisma client | Everything except `@yalla/core/tenant` |
| `@yalla/db/tenant` | `getTenantPrisma(siteId)` | Apps, domain packages |
| `@yalla/db/types` | Generated Prisma types | Nothing |

#### `/packages/ui` - UI Primitives
| Export | Purpose | Cannot Import |
|--------|---------|---------------|
| `@yalla/ui` | Radix-based components | `@yalla/db`, domain packages |
| `@yalla/ui/rtl` | RTL utilities, hooks | `@yalla/db`, domain packages |

#### `/packages/resorts` - Resort Domain
| Export | Purpose | Cannot Import |
|--------|---------|---------------|
| `@yalla/resorts` | Resort CRUD, scoring, freshness | Other domain packages, apps |
| `@yalla/resorts/types` | TypeScript types | Nothing |

#### `/packages/comparisons` - Comparison Engine
| Export | Purpose | Cannot Import |
|--------|---------|---------------|
| `@yalla/comparisons` | Comparison builder, "best for" logic | `@yalla/products`, `@yalla/leads`, apps |
| `@yalla/comparisons/types` | TypeScript types | Nothing |

---

## 3. Module Boundaries and Dependency Rules

### Dependency Graph (Allowed)

```
┌─────────────────────────────────────────────────────────────┐
│                         APPS LAYER                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │ arabaldives-web │  │ arabaldives-    │  │ yalla-      │ │
│  │                 │  │ admin           │  │ london-*    │ │
│  └────────┬────────┘  └────────┬────────┘  └──────┬──────┘ │
└───────────┼────────────────────┼─────────────────┼─────────┘
            │                    │                  │
            ▼                    ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                      DOMAIN PACKAGES                        │
│  ┌──────────┐ ┌────────────┐ ┌──────────┐ ┌──────────────┐ │
│  │ resorts  │ │comparisons │ │ products │ │    leads     │ │
│  └────┬─────┘ └─────┬──────┘ └────┬─────┘ └──────┬───────┘ │
└───────┼─────────────┼─────────────┼──────────────┼─────────┘
        │             │             │              │
        ▼             ▼             ▼              ▼
┌─────────────────────────────────────────────────────────────┐
│                      CORE PACKAGES                          │
│  ┌──────┐ ┌─────┐ ┌──────────────┐ ┌─────┐ ┌───────────┐   │
│  │ core │ │ db  │ │     seo      │ │ ui  │ │  content  │   │
│  └──┬───┘ └──┬──┘ └──────┬───────┘ └──┬──┘ └─────┬─────┘   │
└─────┼────────┼───────────┼────────────┼──────────┼─────────┘
      │        │           │            │          │
      ▼        ▼           ▼            ▼          ▼
┌─────────────────────────────────────────────────────────────┐
│                     SHARED TYPES                            │
│              ┌──────────────────────┐                       │
│              │   @yalla/db/types    │                       │
│              │      (Prisma)        │                       │
│              └──────────────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

### Explicit "DO NOT" Rules

```typescript
// .eslintrc.js - import/no-restricted-paths rules

const DO_NOT_RULES = [
  // 1. UI cannot import database directly
  {
    from: '@yalla/db',
    target: 'packages/ui/**',
    message: 'UI components must not import database. Pass data as props.'
  },

  // 2. Domain packages cannot import from apps
  {
    from: 'apps/**',
    target: 'packages/{resorts,comparisons,products,leads}/**',
    message: 'Domain packages cannot depend on apps. Invert the dependency.'
  },

  // 3. Domain packages cannot import each other (no circular deps)
  {
    from: '@yalla/comparisons',
    target: 'packages/resorts/**',
    message: 'Domain packages cannot import each other. Use core or types only.'
  },

  // 4. Core packages cannot import domain packages
  {
    from: '@yalla/{resorts,comparisons,products,leads}',
    target: 'packages/core/**',
    message: 'Core packages must remain domain-agnostic.'
  },

  // 5. No direct Prisma client import in apps (must use tenant wrapper)
  {
    from: '@prisma/client',
    target: 'apps/**',
    message: 'Use @yalla/db/tenant getTenantPrisma() instead of direct Prisma.'
  },

  // 6. No cross-tenant data access patterns
  {
    from: '@yalla/db',
    target: 'apps/**',
    message: 'Apps must use getTenantPrisma(siteId), not raw db client.'
  },

  // 7. SEO package cannot import UI
  {
    from: '@yalla/ui',
    target: 'packages/seo/**',
    message: 'SEO package is backend-only. No UI dependencies.'
  },

  // 8. Content package cannot import domain packages
  {
    from: '@yalla/{resorts,comparisons,products,leads}',
    target: 'packages/content/**',
    message: 'Content pipeline must remain domain-agnostic.'
  },

  // 9. No environment variables in packages (except core)
  {
    pattern: 'process.env',
    target: 'packages/{resorts,comparisons,products,leads,ui}/**',
    message: 'Environment config must come from @yalla/core. No direct env access.'
  },

  // 10. Cron jobs must import from packages, not apps
  {
    from: 'apps/{arabaldives,yalla-london}-{web,admin}/**',
    target: 'apps/cron/**',
    message: 'Cron jobs must use packages, not app code.'
  }
];
```

### Layer Definitions

| Layer | Packages | Can Import | Cannot Import |
|-------|----------|------------|---------------|
| **Apps** | `apps/*` | Domain, Core, Shared Types | Other apps |
| **Domain** | `resorts`, `comparisons`, `products`, `leads` | Core, Shared Types | Other domains, Apps |
| **Core** | `core`, `db`, `seo`, `ui`, `content`, `i18n` | Shared Types | Domain, Apps |
| **Shared Types** | `@yalla/db/types` | Nothing | - |

---

## 4. Tenancy Model (Critical)

### 4.1 Host-Based Tenant Resolution

```typescript
// packages/core/tenant/middleware.ts

import { NextRequest, NextResponse } from 'next/server';
import { getTenantByDomain } from './resolver';

export async function tenantMiddleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';

  // Strip port for local development
  const domain = hostname.split(':')[0];

  // Resolve tenant from database or config
  const tenant = await getTenantByDomain(domain);

  if (!tenant) {
    // Unknown domain - return 404 or redirect
    return NextResponse.rewrite(new URL('/404', request.url));
  }

  // Clone headers and inject tenant context
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tenant-id', tenant.id);
  requestHeaders.set('x-tenant-slug', tenant.slug);
  requestHeaders.set('x-tenant-locale', tenant.defaultLocale);

  return NextResponse.next({
    request: { headers: requestHeaders }
  });
}

// Domain → Tenant mapping
const TENANT_DOMAINS: Record<string, string> = {
  'yallalondon.com': 'yalla-london',
  'www.yallalondon.com': 'yalla-london',
  'arabaldives.com': 'arabaldives',
  'www.arabaldives.com': 'arabaldives',
  'localhost': process.env.DEFAULT_TENANT || 'yalla-london',
};
```

### 4.2 Tenant Context Helper

```typescript
// packages/core/tenant/context.ts

import { headers } from 'next/headers';
import { cache } from 'react';

export interface TenantContext {
  id: string;
  slug: string;
  locale: string;
  config: TenantConfig;
}

// React cache ensures single DB call per request
export const getTenantContext = cache(async (): Promise<TenantContext> => {
  const headerStore = headers();
  const tenantId = headerStore.get('x-tenant-id');

  if (!tenantId) {
    throw new Error('Tenant context not available. Middleware misconfigured?');
  }

  // Load full tenant config (cached in memory for 60s)
  const config = await loadTenantConfig(tenantId);

  return {
    id: tenantId,
    slug: headerStore.get('x-tenant-slug') || '',
    locale: headerStore.get('x-tenant-locale') || 'en',
    config,
  };
});

// For API routes and server actions
export function getTenantFromRequest(request: Request): string {
  const tenantId = request.headers.get('x-tenant-id');
  if (!tenantId) {
    throw new Error('Missing x-tenant-id header');
  }
  return tenantId;
}
```

### 4.3 Tenant-Scoped Prisma Queries

```typescript
// packages/db/tenant-client.ts

import { PrismaClient, Prisma } from '@prisma/client';
import { prisma } from './client';

type TenantScopedModel =
  | 'blogPost'
  | 'category'
  | 'resort'
  | 'comparison'
  | 'product'
  | 'lead'
  | 'subscriber'
  | 'affiliatePartner';

interface TenantPrismaClient extends PrismaClient {
  $tenantId: string;
}

export function getTenantPrisma(siteId: string): TenantPrismaClient {
  // Create a proxy that auto-injects site_id into queries
  return new Proxy(prisma, {
    get(target, prop: string) {
      const model = target[prop as keyof PrismaClient];

      if (typeof model === 'object' && model !== null && isTenantScopedModel(prop)) {
        return createTenantScopedModel(model, siteId);
      }

      if (prop === '$tenantId') {
        return siteId;
      }

      return model;
    }
  }) as TenantPrismaClient;
}

function createTenantScopedModel(model: any, siteId: string) {
  return new Proxy(model, {
    get(target, method: string) {
      const originalMethod = target[method];

      if (typeof originalMethod !== 'function') {
        return originalMethod;
      }

      // Intercept query methods
      if (['findMany', 'findFirst', 'findUnique', 'count', 'aggregate'].includes(method)) {
        return (args: any = {}) => {
          args.where = { ...args.where, site_id: siteId };
          return originalMethod.call(target, args);
        };
      }

      if (['create', 'createMany'].includes(method)) {
        return (args: any) => {
          if (Array.isArray(args.data)) {
            args.data = args.data.map((d: any) => ({ ...d, site_id: siteId }));
          } else {
            args.data = { ...args.data, site_id: siteId };
          }
          return originalMethod.call(target, args);
        };
      }

      if (['update', 'updateMany', 'delete', 'deleteMany'].includes(method)) {
        return (args: any) => {
          args.where = { ...args.where, site_id: siteId };
          return originalMethod.call(target, args);
        };
      }

      return originalMethod.bind(target);
    }
  });
}

// Usage in app:
// const db = getTenantPrisma(tenantContext.id);
// const posts = await db.blogPost.findMany(); // Auto-filtered by site_id
```

### 4.4 Tenant-Scoped SEO (Sitemap/Robots/Canonical)

```typescript
// packages/seo/sitemap.ts

import { getTenantPrisma } from '@yalla/db/tenant';
import { TenantContext } from '@yalla/core/tenant';

export async function generateTenantSitemap(tenant: TenantContext): Promise<string> {
  const db = getTenantPrisma(tenant.id);
  const baseUrl = tenant.config.domain;

  // Only fetch content for this tenant
  const [posts, resorts, products] = await Promise.all([
    db.blogPost.findMany({
      where: { status: 'PUBLISHED' },
      select: { slug: true, updated_at: true }
    }),
    db.resort.findMany({
      where: { is_active: true },
      select: { slug: true, updated_at: true }
    }),
    db.product.findMany({
      where: { status: 'ACTIVE' },
      select: { slug: true, updated_at: true }
    }),
  ]);

  const urls = [
    { loc: baseUrl, priority: 1.0 },
    ...posts.map(p => ({
      loc: `${baseUrl}/blog/${p.slug}`,
      lastmod: p.updated_at.toISOString(),
      priority: 0.8
    })),
    ...resorts.map(r => ({
      loc: `${baseUrl}/resorts/${r.slug}`,
      lastmod: r.updated_at.toISOString(),
      priority: 0.9
    })),
    ...products.map(p => ({
      loc: `${baseUrl}/products/${p.slug}`,
      lastmod: p.updated_at.toISOString(),
      priority: 0.7
    })),
  ];

  return generateSitemapXml(urls);
}

// robots.txt per tenant
export function generateTenantRobots(tenant: TenantContext): string {
  return `
User-agent: *
Allow: /

Sitemap: https://${tenant.config.domain}/sitemap.xml

# Tenant: ${tenant.slug}
# Generated: ${new Date().toISOString()}
`.trim();
}
```

### 4.5 Tenant-Specific Configuration

```typescript
// config/tenants/arabaldives.json
{
  "id": "arabaldives",
  "slug": "arabaldives",
  "name": "Arab Aldives",
  "domain": "arabaldives.com",
  "defaultLocale": "ar",
  "direction": "rtl",

  "branding": {
    "primaryColor": "#0C4A6E",
    "secondaryColor": "#0EA5E9",
    "logoUrl": "/images/arabaldives-logo.svg",
    "faviconUrl": "/images/favicon.ico"
  },

  "analytics": {
    "ga4MeasurementId": "G-XXXXXXXXXX",
    "gscPropertyId": "sc-domain:arabaldives.com"
  },

  "features": {
    "resorts": true,
    "comparisons": true,
    "products": true,
    "leads": true,
    "affiliates": true,
    "contentPipeline": false,
    "aiSeoAudit": true
  },

  "seo": {
    "defaultTitle": "Arab Aldives - دليلك للمالديف",
    "titleTemplate": "%s | Arab Aldives",
    "defaultDescription": "دليلك الشامل لأفضل منتجعات المالديف"
  },

  "automation": {
    "autoPublish": false,
    "contentGeneration": false,
    "seoAuditSchedule": "0 2 * * *"
  }
}
```

---

## 5. Cron + Automation Safety

### 5.1 Tenant-Aware Job Runner

```typescript
// apps/cron/runner.ts

import { getTenantPrisma } from '@yalla/db/tenant';
import { logAuditEvent } from '@yalla/core/audit';

interface CronJobContext {
  jobName: string;
  siteId: string;
  startedAt: Date;
  traceId: string;
}

export async function runTenantJob<T>(
  jobName: string,
  siteId: string,
  jobFn: (ctx: CronJobContext, db: ReturnType<typeof getTenantPrisma>) => Promise<T>
): Promise<{ success: boolean; result?: T; error?: string }> {
  const ctx: CronJobContext = {
    jobName,
    siteId,
    startedAt: new Date(),
    traceId: crypto.randomUUID(),
  };

  const db = getTenantPrisma(siteId);

  // Log job start
  await logAuditEvent({
    action: 'cron_job_start',
    resource: 'cron',
    resourceId: jobName,
    siteId,
    traceId: ctx.traceId,
    details: { startedAt: ctx.startedAt },
  });

  try {
    const result = await jobFn(ctx, db);

    // Log job success
    await logAuditEvent({
      action: 'cron_job_complete',
      resource: 'cron',
      resourceId: jobName,
      siteId,
      traceId: ctx.traceId,
      success: true,
      details: {
        duration: Date.now() - ctx.startedAt.getTime(),
        result: summarizeResult(result),
      },
    });

    return { success: true, result };
  } catch (error) {
    // Log job failure
    await logAuditEvent({
      action: 'cron_job_failed',
      resource: 'cron',
      resourceId: jobName,
      siteId,
      traceId: ctx.traceId,
      success: false,
      details: {
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - ctx.startedAt.getTime(),
      },
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Iterate all tenants safely
export async function runForAllTenants<T>(
  jobName: string,
  jobFn: (ctx: CronJobContext, db: ReturnType<typeof getTenantPrisma>) => Promise<T>
): Promise<Map<string, { success: boolean; result?: T; error?: string }>> {
  const tenants = await getAllActiveTenants();
  const results = new Map();

  for (const tenant of tenants) {
    // Check if tenant has this job enabled
    if (!isTenantJobEnabled(tenant.id, jobName)) {
      results.set(tenant.id, { success: true, result: 'skipped' });
      continue;
    }

    const result = await runTenantJob(jobName, tenant.id, jobFn);
    results.set(tenant.id, result);
  }

  return results;
}
```

### 5.2 Job Implementations

```typescript
// apps/cron/jobs/publish-scheduled.ts

import { runForAllTenants } from '../runner';
import { isFeatureEnabled } from '@yalla/core/feature-flags';

export async function publishScheduledContent() {
  return runForAllTenants('publish-scheduled', async (ctx, db) => {
    // Check tenant-specific feature flag
    if (!await isFeatureEnabled('FEATURE_CONTENT_PIPELINE', ctx.siteId)) {
      return { skipped: true, reason: 'Feature disabled for tenant' };
    }

    const now = new Date();

    // Find scheduled content for THIS tenant only (auto-filtered)
    const scheduled = await db.scheduledContent.findMany({
      where: {
        status: 'SCHEDULED',
        scheduled_at: { lte: now },
      },
    });

    let published = 0;
    for (const content of scheduled) {
      await db.blogPost.update({
        where: { id: content.blog_post_id },
        data: { status: 'PUBLISHED', published_at: now },
      });

      await db.scheduledContent.update({
        where: { id: content.id },
        data: { status: 'PUBLISHED' },
      });

      published++;
    }

    return { published, total: scheduled.length };
  });
}
```

### 5.3 Security Policy Checklist

```markdown
## Cron + Automation Security Policy

### ✅ MUST Requirements
- [ ] Every cron job receives explicit `siteId` parameter
- [ ] All Prisma queries use `getTenantPrisma(siteId)`, never raw client
- [ ] Feature flags checked with tenant context: `isFeatureEnabled(flag, siteId)`
- [ ] Audit logs include: `site_id`, `trace_id`, `action`, `success`, `duration`
- [ ] Job failures do not leak data to other tenants in error messages
- [ ] CRON_SECRET validated on every endpoint
- [ ] Rate limiting applied per tenant

### ❌ NEVER Do
- [ ] Never use raw `prisma` client in cron jobs
- [ ] Never iterate tenants without per-tenant error isolation
- [ ] Never assume feature flags are global
- [ ] Never log sensitive tenant data (API keys, credentials)
- [ ] Never allow cron to create/modify resources without `site_id`
- [ ] Never skip audit logging for tenant-affecting operations

### 🔒 Additional Safeguards
- [ ] Tenant isolation test in CI: verify no cross-tenant query results
- [ ] Cron job output sanitized before logging
- [ ] Job timeout enforced (max 5 minutes)
- [ ] Retry logic respects tenant context
- [ ] Dead letter queue for failed jobs (per tenant)
```

---

## 6. RTL-First UI System

### 6.1 Document-Level Direction

```typescript
// apps/arabaldives-web/app/layout.tsx

import { Cairo, Noto_Sans_Arabic } from 'next/font/google';

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  variable: '--font-cairo',
  display: 'swap',
});

const notoSansArabic = Noto_Sans_Arabic({
  subsets: ['arabic'],
  variable: '--font-noto-arabic',
  display: 'swap',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} ${notoSansArabic.variable}`}>
      <body className="font-cairo antialiased">
        {children}
      </body>
    </html>
  );
}
```

### 6.2 Tailwind RTL Strategy (CSS Logical Properties)

```javascript
// packages/ui/tailwind-preset.js

module.exports = {
  theme: {
    extend: {
      // Use logical properties by default
      spacing: {}, // Keep standard spacing
      margin: {
        // ms = margin-start, me = margin-end (RTL-aware)
      },
    },
  },
  plugins: [
    require('tailwindcss-rtl'), // Adds ms-*, me-*, ps-*, pe-* utilities

    // Custom plugin for RTL-aware components
    function({ addUtilities }) {
      addUtilities({
        // Flip transforms in RTL
        '.flip-rtl': {
          '[dir="rtl"] &': {
            transform: 'scaleX(-1)',
          },
        },
        // Text alignment
        '.text-start': {
          textAlign: 'start',
        },
        '.text-end': {
          textAlign: 'end',
        },
      });
    },
  ],
};
```

### 6.3 RTL-Safe Utility Classes

```css
/* packages/ui/rtl/logical-props.css */

/* Instead of: ml-4 mr-2 → Use: ms-4 me-2 */
/* Instead of: left-0 → Use: start-0 */
/* Instead of: pl-4 pr-2 → Use: ps-4 pe-2 */
/* Instead of: border-l → Use: border-s */
/* Instead of: rounded-l → Use: rounded-s */
/* Instead of: text-left → Use: text-start */

/* Component-specific RTL fixes */
.rtl-flip {
  [dir="rtl"] & {
    transform: scaleX(-1);
  }
}

.rtl-reverse {
  [dir="rtl"] & {
    flex-direction: row-reverse;
  }
}

/* Icon alignment */
.icon-start {
  margin-inline-end: 0.5rem;
}

.icon-end {
  margin-inline-start: 0.5rem;
}
```

### 6.4 Radix UI RTL Pitfalls & Solutions

```typescript
// packages/ui/rtl/radix-fixes.tsx

/**
 * PITFALL 1: Dropdown Menu alignment
 * Radix uses left/right which don't flip in RTL
 */
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

export function RTLDropdownMenu({ children, ...props }: DropdownMenu.DropdownMenuProps) {
  return (
    <DropdownMenu.Root {...props}>
      {children}
    </DropdownMenu.Root>
  );
}

export function RTLDropdownMenuContent({
  align = 'start', // Use 'start'/'end' instead of 'left'/'right'
  side = 'bottom',
  ...props
}: DropdownMenu.DropdownMenuContentProps) {
  return (
    <DropdownMenu.Content
      align={align}
      side={side}
      {...props}
    />
  );
}

/**
 * PITFALL 2: Dialog/Sheet slide direction
 * Must flip animation direction in RTL
 */
import * as Dialog from '@radix-ui/react-dialog';

export function RTLSheet({ side = 'right', ...props }) {
  // In RTL, 'right' should animate from left
  const rtlSide = document.dir === 'rtl'
    ? (side === 'right' ? 'left' : 'right')
    : side;

  return <Dialog.Content data-side={rtlSide} {...props} />;
}

/**
 * PITFALL 3: Slider/Progress direction
 * Range inputs need dir attribute
 */
import * as Slider from '@radix-ui/react-slider';

export function RTLSlider(props: Slider.SliderProps) {
  return (
    <Slider.Root
      dir="rtl" // Explicit RTL direction
      {...props}
    />
  );
}

/**
 * PITFALL 4: Tabs orientation
 * Tab order should reverse in RTL
 */
import * as Tabs from '@radix-ui/react-tabs';

export function RTLTabs({ children, ...props }: Tabs.TabsProps) {
  return (
    <Tabs.Root dir="rtl" {...props}>
      {children}
    </Tabs.Root>
  );
}
```

### 6.5 Component-Specific RTL Guidelines

```typescript
// Table in RTL
<table className="w-full text-start">
  <thead>
    <tr>
      {/* First column aligns to start (right in RTL) */}
      <th className="text-start ps-4">الاسم</th>
      <th className="text-start">التقييم</th>
      <th className="text-end pe-4">السعر</th>
    </tr>
  </thead>
</table>

// Carousel in RTL - reverse navigation
<Carousel
  opts={{ direction: 'rtl' }} // Built-in Embla option
  className="w-full"
>
  <CarouselContent>
    {items.map(item => (
      <CarouselItem key={item.id}>{item.content}</CarouselItem>
    ))}
  </CarouselContent>
  {/* Arrows flip: Next (←) is on left, Prev (→) is on right */}
  <CarouselPrevious className="end-0" /> {/* Right side in RTL */}
  <CarouselNext className="start-0" />   {/* Left side in RTL */}
</Carousel>

// Drawer in RTL - slides from left
<Drawer direction="right"> {/* Will slide from left in RTL context */}
  <DrawerContent className="ps-6 pe-6">
    {/* Content with logical padding */}
  </DrawerContent>
</Drawer>

// Breadcrumb in RTL
<nav className="flex" aria-label="Breadcrumb">
  <ol className="flex items-center gap-2">
    <li><a href="/">الرئيسية</a></li>
    <li className="text-muted-foreground">/</li> {/* Separator stays same */}
    <li><a href="/resorts">المنتجعات</a></li>
  </ol>
</nav>
```

### 6.6 Arabic Typography Guidelines

```css
/* packages/ui/rtl/typography.css */

:root {
  /* Arabic-optimized font stack */
  --font-arabic: 'Cairo', 'Noto Sans Arabic', 'Segoe UI', system-ui, sans-serif;

  /* Slightly larger base for Arabic readability */
  --font-size-base: 1rem;      /* 16px */
  --font-size-lg: 1.125rem;    /* 18px - for body text */
  --font-size-xl: 1.25rem;     /* 20px */

  /* Increased line height for Arabic */
  --line-height-normal: 1.75;  /* vs 1.5 for Latin */
  --line-height-relaxed: 2;

  /* Letter spacing - tighter for Arabic */
  --letter-spacing-normal: -0.01em;
}

/* Base typography */
[dir="rtl"] {
  font-family: var(--font-arabic);
  line-height: var(--line-height-normal);
  letter-spacing: var(--letter-spacing-normal);
}

/* Headings */
[dir="rtl"] h1,
[dir="rtl"] h2,
[dir="rtl"] h3 {
  font-weight: 700;
  line-height: 1.4;
}

/* Body text - slightly larger for Arabic */
[dir="rtl"] p {
  font-size: var(--font-size-lg);
  line-height: var(--line-height-relaxed);
}

/* Numbers - use Eastern Arabic numerals optionally */
.numerals-arabic {
  font-feature-settings: 'locl';
}

/* Kashida justification */
[dir="rtl"] .text-justify {
  text-align: justify;
  text-justify: kashida;
}
```

---

## 7. Domain Modules for Arabaldives

### 7.1 Resorts Module

#### Prisma Schema

```prisma
// Added to packages/db/prisma/schema.prisma

model Resort {
  id                String    @id @default(cuid())
  site_id           String
  slug              String
  name_ar           String
  name_en           String?

  // Location
  atoll             String    // e.g., "North Malé Atoll"
  island            String
  latitude          Float?
  longitude         Float?
  transfer_type     TransferType
  transfer_duration Int?      // minutes from Malé

  // Classification
  star_rating       Int       // 4, 5, 6 (for ultra-luxury)
  category          ResortCategory
  style             ResortStyle[]

  // Pricing
  price_range       PriceRange
  starting_price    Int?      // USD per night
  all_inclusive     Boolean   @default(false)

  // Attributes (JSON for flexibility)
  attributes_json   Json      // { "reef": "house", "beach": "lagoon", "villas": 50 }
  amenities         String[]
  dining_options    String[]

  // Scoring
  overall_score     Float?
  score_breakdown   Json?     // { "beach": 9.2, "reef": 8.5, "service": 9.0 }
  review_count      Int       @default(0)

  // Content
  description_ar    String    @db.Text
  description_en    String?   @db.Text
  highlights_ar     String[]
  highlights_en     String[]

  // Media
  hero_image_url    String?
  gallery_urls      String[]
  video_url         String?

  // Freshness
  last_verified_at  DateTime?
  verified_by       String?
  data_source       String?   // "official", "partner", "research"

  // Affiliate
  affiliate_url     String?
  affiliate_partner_id String?
  commission_rate   Float?

  // SEO
  meta_title_ar     String?
  meta_description_ar String?
  schema_json       Json?

  // Status
  is_active         Boolean   @default(true)
  is_featured       Boolean   @default(false)
  created_at        DateTime  @default(now())
  updated_at        DateTime  @updatedAt

  // Relations
  site              Site      @relation(fields: [site_id], references: [id])
  comparisons       ComparisonResort[]

  @@unique([site_id, slug])
  @@index([site_id, is_active])
  @@index([site_id, category])
  @@index([site_id, atoll])
}

enum TransferType {
  SPEEDBOAT
  SEAPLANE
  DOMESTIC_FLIGHT
  SPEEDBOAT_SEAPLANE
}

enum ResortCategory {
  LUXURY
  ULTRA_LUXURY
  PREMIUM
  MID_RANGE
  BOUTIQUE
}

enum ResortStyle {
  FAMILY
  ROMANTIC
  HONEYMOON
  DIVING
  SURFING
  WELLNESS
  ADULTS_ONLY
  ALL_INCLUSIVE
}

enum PriceRange {
  BUDGET        // < $500/night
  MID           // $500-$1000
  HIGH          // $1000-$2000
  ULTRA         // $2000+
}
```

#### Service Functions

```typescript
// packages/resorts/service.ts

import { getTenantPrisma } from '@yalla/db/tenant';
import type { Resort, ResortCategory, ResortStyle, PriceRange } from '@yalla/db/types';
import { calculateResortScore } from './scoring';
import { checkFreshness } from './freshness';

export interface ResortFilters {
  category?: ResortCategory;
  styles?: ResortStyle[];
  priceRange?: PriceRange;
  atoll?: string;
  transferType?: string;
  minScore?: number;
  amenities?: string[];
  isFeatured?: boolean;
}

export interface ResortListResult {
  resorts: Resort[];
  total: number;
  facets: {
    categories: { value: string; count: number }[];
    atolls: { value: string; count: number }[];
    priceRanges: { value: string; count: number }[];
  };
}

// List resorts with filters
export async function listResorts(
  siteId: string,
  filters: ResortFilters = {},
  pagination: { page: number; limit: number } = { page: 1, limit: 20 }
): Promise<ResortListResult>;

// Get single resort by slug
export async function getResortBySlug(
  siteId: string,
  slug: string
): Promise<Resort | null>;

// Create resort
export async function createResort(
  siteId: string,
  data: CreateResortInput
): Promise<Resort>;

// Update resort
export async function updateResort(
  siteId: string,
  resortId: string,
  data: UpdateResortInput
): Promise<Resort>;

// Recalculate resort score
export async function recalculateScore(
  siteId: string,
  resortId: string
): Promise<{ oldScore: number; newScore: number }>;

// Mark resort as verified
export async function verifyResort(
  siteId: string,
  resortId: string,
  verifiedBy: string
): Promise<Resort>;

// Get stale resorts (not verified in X days)
export async function getStaleResorts(
  siteId: string,
  staleDays: number = 90
): Promise<Resort[]>;

// Bulk import resorts
export async function bulkImportResorts(
  siteId: string,
  resorts: CreateResortInput[]
): Promise<{ created: number; updated: number; errors: string[] }>;
```

#### Admin Pages Needed

- `/admin/resorts` - List all resorts with filters
- `/admin/resorts/new` - Create resort form
- `/admin/resorts/[id]` - Edit resort
- `/admin/resorts/[id]/verify` - Verification workflow
- `/admin/resorts/import` - Bulk import from CSV/JSON
- `/admin/resorts/stale` - Stale resorts dashboard

---

### 7.2 Comparisons Module

#### Prisma Schema

```prisma
model Comparison {
  id                String    @id @default(cuid())
  site_id           String
  slug              String

  // Content
  title_ar          String
  title_en          String?
  subtitle_ar       String?
  intro_ar          String    @db.Text
  intro_en          String?   @db.Text
  conclusion_ar     String?   @db.Text

  // Type
  comparison_type   ComparisonType

  // Configuration
  criteria          Json      // [{ "key": "beach", "label_ar": "الشاطئ", "weight": 1.0 }]
  display_config    Json?     // { "showPrices": true, "showScores": true }

  // SEO
  meta_title_ar     String?
  meta_description_ar String?
  target_keyword    String?
  schema_json       Json?

  // Status
  status            ContentStatus @default(DRAFT)
  is_featured       Boolean   @default(false)
  published_at      DateTime?
  created_at        DateTime  @default(now())
  updated_at        DateTime  @updatedAt

  // Relations
  site              Site      @relation(fields: [site_id], references: [id])
  resorts           ComparisonResort[]

  @@unique([site_id, slug])
  @@index([site_id, status])
}

model ComparisonResort {
  id              String    @id @default(cuid())
  comparison_id   String
  resort_id       String

  // Position & Verdict
  position        Int       // Display order
  verdict_ar      String?   // "الأفضل للعائلات"
  verdict_en      String?
  is_winner       Boolean   @default(false)
  is_best_value   Boolean   @default(false)

  // Per-resort notes
  pros_ar         String[]
  cons_ar         String[]
  custom_scores   Json?     // Override scores for this comparison

  // Relations
  comparison      Comparison @relation(fields: [comparison_id], references: [id], onDelete: Cascade)
  resort          Resort    @relation(fields: [resort_id], references: [id])

  @@unique([comparison_id, resort_id])
  @@index([comparison_id, position])
}

enum ComparisonType {
  HEAD_TO_HEAD      // 2 resorts
  CATEGORY          // "Best family resorts"
  PRICE_BRACKET     // "Best luxury under $1000"
  LOCATION          // "Best in North Malé Atoll"
  STYLE             // "Best for honeymoon"
}

enum ContentStatus {
  DRAFT
  REVIEW
  SCHEDULED
  PUBLISHED
  ARCHIVED
}
```

#### Service Functions

```typescript
// packages/comparisons/service.ts

export interface ComparisonWithResorts extends Comparison {
  resorts: (ComparisonResort & { resort: Resort })[];
}

// List comparisons
export async function listComparisons(
  siteId: string,
  filters?: { type?: ComparisonType; status?: ContentStatus }
): Promise<Comparison[]>;

// Get comparison with full resort data
export async function getComparisonBySlug(
  siteId: string,
  slug: string
): Promise<ComparisonWithResorts | null>;

// Create comparison
export async function createComparison(
  siteId: string,
  data: CreateComparisonInput
): Promise<Comparison>;

// Add resort to comparison
export async function addResortToComparison(
  siteId: string,
  comparisonId: string,
  resortId: string,
  data: AddResortInput
): Promise<ComparisonResort>;

// Reorder resorts
export async function reorderComparisonResorts(
  siteId: string,
  comparisonId: string,
  order: string[] // resort IDs in order
): Promise<void>;

// Generate comparison table data
export async function buildComparisonTable(
  siteId: string,
  comparisonId: string
): Promise<ComparisonTableData>;

// Auto-determine "best for" verdicts
export async function calculateBestForVerdicts(
  siteId: string,
  comparisonId: string
): Promise<{ resortId: string; verdict: string }[]>;

// Publish comparison
export async function publishComparison(
  siteId: string,
  comparisonId: string
): Promise<Comparison>;
```

#### Admin Pages Needed

- `/admin/comparisons` - List comparisons
- `/admin/comparisons/new` - Create comparison wizard
- `/admin/comparisons/[id]` - Edit comparison
- `/admin/comparisons/[id]/resorts` - Manage comparison resorts
- `/admin/comparisons/[id]/preview` - Preview comparison page

---

### 7.3 Products Module

#### Prisma Schema

```prisma
model Product {
  id                String    @id @default(cuid())
  site_id           String
  slug              String

  // Content
  name_ar           String
  name_en           String?
  description_ar    String    @db.Text
  description_en    String?   @db.Text

  // Type & Delivery
  product_type      ProductType
  delivery_method   DeliveryMethod

  // File (for digital products)
  file_url          String?   // S3 signed URL generated on purchase
  file_size_bytes   Int?
  file_format       String?   // "PDF", "EPUB"
  preview_url       String?   // Free preview

  // Pricing
  price_usd         Int       // In cents
  price_aed         Int?
  sale_price_usd    Int?
  sale_ends_at      DateTime?

  // Display
  cover_image_url   String?
  gallery_urls      String[]

  // Metadata
  page_count        Int?
  language          String    @default("ar")

  // SEO
  meta_title_ar     String?
  meta_description_ar String?

  // Status
  status            ProductStatus @default(DRAFT)
  is_featured       Boolean   @default(false)
  created_at        DateTime  @default(now())
  updated_at        DateTime  @updatedAt

  // Relations
  site              Site      @relation(fields: [site_id], references: [id])
  purchases         Purchase[]

  @@unique([site_id, slug])
  @@index([site_id, status])
}

model Purchase {
  id                String    @id @default(cuid())
  site_id           String
  product_id        String

  // Customer
  customer_email    String
  customer_name     String?

  // Payment
  amount_usd        Int       // In cents
  currency          String    @default("USD")
  payment_provider  String    // "stripe", "paddle"
  payment_id        String?   // External payment ID
  payment_status    PaymentStatus

  // Delivery
  download_token    String    @unique @default(cuid())
  download_count    Int       @default(0)
  max_downloads     Int       @default(5)
  expires_at        DateTime  // Download link expiry

  // Tracking
  ip_address        String?
  user_agent        String?
  referrer          String?

  created_at        DateTime  @default(now())
  updated_at        DateTime  @updatedAt

  // Relations
  product           Product   @relation(fields: [product_id], references: [id])

  @@index([site_id, customer_email])
  @@index([download_token])
}

enum ProductType {
  PDF_GUIDE
  EBOOK
  CHECKLIST
  TEMPLATE
  VIDEO_COURSE
}

enum DeliveryMethod {
  INSTANT_DOWNLOAD
  EMAIL_DELIVERY
  ACCESS_LINK
}

enum ProductStatus {
  DRAFT
  ACTIVE
  PAUSED
  ARCHIVED
}

enum PaymentStatus {
  PENDING
  COMPLETED
  FAILED
  REFUNDED
}
```

#### Service Functions

```typescript
// packages/products/service.ts

// List products
export async function listProducts(
  siteId: string,
  filters?: { status?: ProductStatus; type?: ProductType }
): Promise<Product[]>;

// Get product by slug
export async function getProductBySlug(
  siteId: string,
  slug: string
): Promise<Product | null>;

// Create product
export async function createProduct(
  siteId: string,
  data: CreateProductInput
): Promise<Product>;

// Update product
export async function updateProduct(
  siteId: string,
  productId: string,
  data: UpdateProductInput
): Promise<Product>;

// Upload product file
export async function uploadProductFile(
  siteId: string,
  productId: string,
  file: Buffer,
  filename: string
): Promise<{ fileUrl: string; fileSize: number }>;

// --- Checkout ---

// Initiate checkout
export async function initiateCheckout(
  siteId: string,
  productId: string,
  customerEmail: string
): Promise<{ checkoutUrl: string; sessionId: string }>;

// Handle payment webhook
export async function handlePaymentWebhook(
  provider: string,
  payload: unknown
): Promise<{ success: boolean; purchaseId?: string }>;

// --- Delivery ---

// Generate download URL
export async function generateDownloadUrl(
  downloadToken: string
): Promise<{ url: string; expiresAt: Date } | { error: string }>;

// Record download
export async function recordDownload(
  downloadToken: string,
  ipAddress: string
): Promise<{ remaining: number }>;

// Resend download email
export async function resendDownloadEmail(
  siteId: string,
  purchaseId: string
): Promise<void>;
```

#### Admin Pages Needed

- `/admin/products` - List products
- `/admin/products/new` - Create product
- `/admin/products/[id]` - Edit product
- `/admin/products/[id]/file` - Upload/manage file
- `/admin/purchases` - View purchases
- `/admin/purchases/[id]` - Purchase details

---

### 7.4 Leads Module

#### Prisma Schema

```prisma
model Lead {
  id                String    @id @default(cuid())
  site_id           String

  // Contact
  email             String
  name              String?
  phone             String?

  // Source
  source            LeadSource
  source_url        String?   // Page where captured
  source_campaign   String?   // UTM campaign
  referrer          String?

  // Segmentation
  segments          String[]  // ["honeymoon", "luxury", "family"]
  interests         String[]  // ["diving", "spa", "kids-club"]
  budget_range      String?   // "$500-$1000"
  travel_dates      String?   // "2025-03"

  // Engagement
  lead_score        Int       @default(0)
  last_activity_at  DateTime?
  email_opens       Int       @default(0)
  email_clicks      Int       @default(0)

  // Status
  status            LeadStatus @default(NEW)
  assigned_to       String?
  notes             String?

  // Consent
  marketing_consent Boolean   @default(false)
  consent_timestamp DateTime?
  consent_ip        String?

  created_at        DateTime  @default(now())
  updated_at        DateTime  @updatedAt

  // Relations
  site              Site      @relation(fields: [site_id], references: [id])
  consents          LeadConsent[]
  activities        LeadActivity[]

  @@unique([site_id, email])
  @@index([site_id, status])
  @@index([site_id, lead_score])
}

model LeadConsent {
  id                String    @id @default(cuid())
  lead_id           String

  purpose           ConsentPurpose
  granted           Boolean
  timestamp         DateTime  @default(now())
  ip_address        String?
  user_agent        String?

  // For audit
  consent_text      String?   // Exact text shown to user
  form_version      String?

  lead              Lead      @relation(fields: [lead_id], references: [id], onDelete: Cascade)

  @@index([lead_id, purpose])
}

model LeadActivity {
  id                String    @id @default(cuid())
  lead_id           String

  activity_type     ActivityType
  details           Json?
  timestamp         DateTime  @default(now())

  lead              Lead      @relation(fields: [lead_id], references: [id], onDelete: Cascade)

  @@index([lead_id, timestamp])
}

enum LeadSource {
  NEWSLETTER
  GUIDE_DOWNLOAD
  COMPARISON_PAGE
  RESORT_INQUIRY
  CONTACT_FORM
  POPUP
  EXIT_INTENT
  PARTNER_REFERRAL
}

enum LeadStatus {
  NEW
  CONTACTED
  QUALIFIED
  CONVERTED
  UNSUBSCRIBED
  INVALID
}

enum ConsentPurpose {
  MARKETING_EMAIL
  PARTNER_OFFERS
  PERSONALIZATION
  ANALYTICS
}

enum ActivityType {
  FORM_SUBMIT
  EMAIL_OPEN
  EMAIL_CLICK
  PAGE_VIEW
  DOWNLOAD
  PURCHASE
  INQUIRY
}
```

#### Service Functions

```typescript
// packages/leads/service.ts

// Capture lead
export async function captureLead(
  siteId: string,
  data: CaptureLeadInput
): Promise<Lead>;

// Get lead by email
export async function getLeadByEmail(
  siteId: string,
  email: string
): Promise<Lead | null>;

// Update lead
export async function updateLead(
  siteId: string,
  leadId: string,
  data: UpdateLeadInput
): Promise<Lead>;

// Add lead to segment
export async function addToSegment(
  siteId: string,
  leadId: string,
  segment: string
): Promise<Lead>;

// Remove from segment
export async function removeFromSegment(
  siteId: string,
  leadId: string,
  segment: string
): Promise<Lead>;

// --- Consent ---

// Record consent
export async function recordConsent(
  siteId: string,
  leadId: string,
  consent: RecordConsentInput
): Promise<LeadConsent>;

// Get consent status
export async function getConsentStatus(
  siteId: string,
  leadId: string,
  purpose: ConsentPurpose
): Promise<{ granted: boolean; timestamp?: Date }>;

// --- Scoring ---

// Calculate lead score
export async function calculateLeadScore(
  siteId: string,
  leadId: string
): Promise<{ score: number; factors: ScoreFactor[] }>;

// Recalculate all scores
export async function recalculateAllScores(
  siteId: string
): Promise<{ updated: number }>;

// --- Segmentation ---

// List leads by segment
export async function getLeadsBySegment(
  siteId: string,
  segment: string,
  pagination?: { page: number; limit: number }
): Promise<{ leads: Lead[]; total: number }>;

// Auto-segment leads
export async function autoSegmentLeads(
  siteId: string
): Promise<{ segmented: number }>;

// --- Export ---

// Export leads for email platform
export async function exportForEmailPlatform(
  siteId: string,
  filters: LeadFilters
): Promise<{ csv: string; count: number }>;
```

#### Admin Pages Needed

- `/admin/leads` - Lead list with filters
- `/admin/leads/[id]` - Lead detail/edit
- `/admin/leads/segments` - Segment management
- `/admin/leads/export` - Export leads
- `/admin/leads/forms` - Manage capture forms

---

## 8. Incremental Migration Plan (PR Sequence)

### PR 1: Workspace Foundation
**Goal:** Set up monorepo structure without breaking existing code

**Code areas touched:**
- Root `package.json` (add workspaces)
- `pnpm-workspace.yaml` (new)
- `tsconfig.json` (add path aliases)
- Move existing code to `yalla_london/app/` → `apps/yalla-london-web/`

**Tests required:**
- Existing tests pass after move
- Build succeeds
- Vercel deployment works

**Acceptance criteria:**
- [ ] `pnpm install` works from root
- [ ] `pnpm build` builds all apps
- [ ] Existing Vercel deployment unchanged
- [ ] All existing tests pass

---

### PR 2: Core Package Extraction
**Goal:** Extract tenant-agnostic code into `@yalla/core`

**Code areas touched:**
- Create `packages/core/`
- Extract `lib/auth.ts` → `packages/core/auth/`
- Extract `lib/rbac.ts` → `packages/core/auth/`
- Extract `lib/feature-flags.ts` → `packages/core/feature-flags/`
- Extract `lib/s3.ts` → `packages/core/storage/`
- Update imports in existing app

**Tests required:**
- Auth tests pass
- Feature flag tests pass
- RBAC tests pass

**Acceptance criteria:**
- [ ] `@yalla/core` exports all auth functions
- [ ] `@yalla/core` exports feature flag functions
- [ ] Existing app uses `@yalla/core` imports
- [ ] No functionality changes

---

### PR 3: Database Package + Tenant Wrapper
**Goal:** Create `@yalla/db` with tenant-scoped client

**Code areas touched:**
- Create `packages/db/`
- Move `prisma/schema.prisma`
- Create `getTenantPrisma()` wrapper
- Add `site_id` to remaining models

**Tests required:**
- Prisma client generation works
- Tenant scoping integration tests
- Migration tests

**Acceptance criteria:**
- [ ] `@yalla/db` exports Prisma client
- [ ] `getTenantPrisma(siteId)` auto-filters queries
- [ ] All models have `site_id` column
- [ ] Migration runs successfully

---

### PR 4: Tenant Resolution Middleware
**Goal:** Implement host-based tenant resolution

**Code areas touched:**
- Create `packages/core/tenant/`
- Add `middleware.ts` with tenant resolution
- Create tenant config files
- Update `_app` to use tenant context

**Tests required:**
- Middleware unit tests
- Integration tests for host resolution
- Default tenant fallback tests

**Acceptance criteria:**
- [ ] `x-tenant-id` header injected on all requests
- [ ] `getTenantContext()` available in server components
- [ ] Unknown domains return 404
- [ ] Local development uses default tenant

---

### PR 5: UI Package + RTL Foundation
**Goal:** Extract UI primitives, add RTL utilities

**Code areas touched:**
- Create `packages/ui/`
- Extract Radix components from `components/ui/`
- Add `packages/ui/rtl/`
- Create Tailwind preset with RTL utilities

**Tests required:**
- Component render tests
- RTL direction tests
- Visual regression tests (optional)

**Acceptance criteria:**
- [ ] `@yalla/ui` exports all primitives
- [ ] RTL utilities work with `dir="rtl"`
- [ ] Existing app uses `@yalla/ui` imports
- [ ] Tailwind preset includes logical properties

---

### PR 6: Arabaldives Web App Shell
**Goal:** Create empty Arabaldives web app with RTL layout

**Code areas touched:**
- Create `apps/arabaldives-web/`
- RTL root layout with Arabic fonts
- Basic homepage
- Vercel configuration for multi-app

**Tests required:**
- App builds successfully
- RTL rendering tests
- Lighthouse accessibility

**Acceptance criteria:**
- [ ] `arabaldives-web` builds independently
- [ ] RTL layout renders correctly
- [ ] Arabic fonts load properly
- [ ] Vercel preview deploys both apps

---

### PR 7: Resorts Domain Module
**Goal:** Implement full resorts module

**Code areas touched:**
- Create `packages/resorts/`
- Add Resort Prisma models
- Implement service functions
- Create resort pages in `arabaldives-web`

**Tests required:**
- Service function unit tests
- Resort CRUD integration tests
- Scoring algorithm tests

**Acceptance criteria:**
- [ ] Resort listing page works
- [ ] Resort detail page works
- [ ] Scoring calculation correct
- [ ] Freshness tracking works

---

### PR 8: Comparisons Domain Module
**Goal:** Implement comparison engine

**Code areas touched:**
- Create `packages/comparisons/`
- Add Comparison Prisma models
- Implement table builder
- Create comparison pages in `arabaldives-web`

**Tests required:**
- Comparison service tests
- Table builder tests
- "Best for" logic tests

**Acceptance criteria:**
- [ ] Comparison listing works
- [ ] Comparison detail with table works
- [ ] "Best for" verdicts calculate
- [ ] Mobile-responsive table

---

### PR 9: Products + Leads Modules
**Goal:** Implement digital products and lead capture

**Code areas touched:**
- Create `packages/products/`
- Create `packages/leads/`
- Add Prisma models
- Implement checkout flow
- Create lead capture forms

**Tests required:**
- Product service tests
- Purchase flow integration tests
- Lead capture tests
- Consent logging tests

**Acceptance criteria:**
- [ ] Product listing works
- [ ] Checkout redirects to Stripe
- [ ] Download delivery works
- [ ] Lead capture with consent works

---

### PR 10: Arabaldives Admin + Cron Safety
**Goal:** Complete admin dashboard, secure cron jobs

**Code areas touched:**
- Create `apps/arabaldives-admin/`
- All admin pages for resorts/comparisons/products/leads
- Update cron jobs for tenant safety
- Add audit logging

**Tests required:**
- Admin page tests
- Cron tenant isolation tests
- Audit log tests

**Acceptance criteria:**
- [ ] All admin CRUD works
- [ ] Cron jobs tenant-scoped
- [ ] Audit logs include `site_id`
- [ ] No cross-tenant data leakage

---

## 9. Risk Register

| # | Risk | Category | Likelihood | Impact | Mitigation |
|---|------|----------|------------|--------|------------|
| 1 | **Cross-tenant data leakage** via missing `site_id` filter | Security | Medium | Critical | ESLint rule blocking raw Prisma; integration tests with two tenants verifying isolation |
| 2 | **SEO duplicate content** between tenants | SEO | Medium | High | Canonical URLs per tenant; unique sitemaps; hreflang only within tenant |
| 3 | **Cron job publishes to wrong tenant** | Ops | Low | High | Explicit `siteId` parameter required; no global cron; audit log on every publish |
| 4 | **Breaking existing Yalla London** during migration | Ops | Medium | High | Feature flags for new code paths; parallel deployment; rollback plan |
| 5 | **RTL layout bugs** in complex components (tables, carousels) | UX | High | Medium | RTL-first design; component testing with `dir="rtl"`; dedicated QA pass |
| 6 | **Performance degradation** from tenant resolution | Performance | Low | Medium | Cache tenant config; middleware benchmark; edge caching |
| 7 | **Affiliate tracking fails** cross-domain | Revenue | Medium | High | Server-side tracking; first-party cookies; UTM parameter preservation |
| 8 | **PDF products pirated** via shared download links | Revenue | Medium | Medium | Download limits; token expiry; IP logging; watermarking |
| 9 | **Database migration breaks production** | Ops | Low | Critical | Zero-downtime migrations; add columns nullable first; backfill in batches |
| 10 | **Vercel build times increase** with monorepo | DevEx | Medium | Low | Turborepo remote caching; affected-only builds; parallel builds |

---

## 10. Minimal MVP Scope (14 Days)

### Week 1: Foundation + Resorts

**Day 1-2: Workspace Setup**
- PR 1: Workspace foundation (partial - just structure)
- Configure pnpm workspaces
- Path aliases working

**Day 3-4: Core + DB Packages**
- Extract auth into `@yalla/core`
- Create `@yalla/db` with tenant wrapper
- Basic tenant middleware

**Day 5-7: Arabaldives Shell + Resorts**
- RTL layout with Cairo font
- Resort Prisma model (simplified)
- Resort listing page (10 resorts)
- Resort detail page

### Week 2: Comparisons + Launch

**Day 8-9: Comparison Engine**
- Comparison model (simplified)
- Head-to-head comparison page
- Comparison table component

**Day 10-11: Admin Basics**
- Resort CRUD admin
- Comparison builder admin
- Basic auth protection

**Day 12-13: Polish + Deploy**
- Mobile responsive fixes
- RTL bug fixes
- Vercel multi-domain setup
- DNS configuration

**Day 14: Launch**
- Soft launch with 10 resorts
- 3 comparison pages
- Analytics verification

### MVP Feature Scope

| Feature | Included | Deferred |
|---------|----------|----------|
| Resort listing | ✅ | - |
| Resort detail | ✅ | Video, scoring algorithm |
| Comparisons | ✅ Basic table | Auto verdicts, complex types |
| Products | ❌ | Full checkout flow |
| Leads | ✅ Newsletter only | Segmentation, scoring |
| Admin | ✅ Basic CRUD | Bulk import, verification |
| SEO | ✅ Sitemap, meta | Schema.org, audit |
| Affiliates | ✅ Manual links | Auto-placement, tracking |

### MVP Pages

**Public (arabaldives.com):**
1. Homepage - Hero + featured resorts
2. `/resorts` - Resort listing with filters
3. `/resorts/[slug]` - Resort detail
4. `/compare/[slug]` - Comparison page
5. `/guides` - Static guide pages (placeholder)

**Admin (admin.arabaldives.com):**
1. `/login`
2. `/dashboard`
3. `/resorts` - List/create/edit
4. `/comparisons` - List/create/edit

---

## Appendix A: TypeScript Path Aliases

```json
// tsconfig.json (root)
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@yalla/core/*": ["packages/core/*"],
      "@yalla/core": ["packages/core/index.ts"],
      "@yalla/db/*": ["packages/db/*"],
      "@yalla/db": ["packages/db/index.ts"],
      "@yalla/ui/*": ["packages/ui/*"],
      "@yalla/ui": ["packages/ui/index.ts"],
      "@yalla/seo/*": ["packages/seo/*"],
      "@yalla/seo": ["packages/seo/index.ts"],
      "@yalla/resorts/*": ["packages/resorts/*"],
      "@yalla/resorts": ["packages/resorts/index.ts"],
      "@yalla/comparisons/*": ["packages/comparisons/*"],
      "@yalla/comparisons": ["packages/comparisons/index.ts"],
      "@yalla/products/*": ["packages/products/*"],
      "@yalla/products": ["packages/products/index.ts"],
      "@yalla/leads/*": ["packages/leads/*"],
      "@yalla/leads": ["packages/leads/index.ts"],
      "@yalla/i18n/*": ["packages/i18n/*"],
      "@yalla/i18n": ["packages/i18n/index.ts"]
    }
  }
}
```

## Appendix B: Vercel Multi-App Configuration

```json
// vercel.json
{
  "version": 2,
  "builds": [
    {
      "src": "apps/yalla-london-web/package.json",
      "use": "@vercel/next"
    },
    {
      "src": "apps/arabaldives-web/package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/apps/yalla-london-web/$1",
      "headers": { "x-matched-path": "/$1" },
      "conditions": {
        "host": ["yallalondon.com", "www.yallalondon.com"]
      }
    },
    {
      "src": "/(.*)",
      "dest": "/apps/arabaldives-web/$1",
      "headers": { "x-matched-path": "/$1" },
      "conditions": {
        "host": ["arabaldives.com", "www.arabaldives.com"]
      }
    }
  ]
}
```

---

*Document generated: 2025-12-17*
*Author: Architecture Team*
*Status: Proposed - Pending Review*
