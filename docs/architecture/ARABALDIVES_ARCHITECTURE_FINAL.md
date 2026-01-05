# Arabaldives-on-Engine: Final Target Architecture

> **Version:** 2.0.0 (Refined)
> **Date:** 2025-12-17
> **Status:** Final Review
> **Supersedes:** ARABALDIVES_MONOREPO_ARCHITECTURE.md v1.0.0

---

## Section 1: Flaws and Risks in Draft Architecture

### Critical Flaw #1: Vercel Multi-App Routing Does Not Work

**The Problem:**
```json
// THIS DOES NOT WORK ON VERCEL
{
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/apps/yalla-london-web/$1",
      "conditions": { "host": ["yallalondon.com"] }  // ❌ Not supported
    }
  ]
}
```

Vercel does not support host-based routing conditions within a single project. The `conditions.host` syntax in `vercel.json` is **not a real Vercel feature**. Each Vercel project serves exactly one build output.

**Impact:** The entire multi-app deployment strategy in the draft is non-functional.

---

### Critical Flaw #2: Proxy-Based Prisma Wrapper is Unsafe

**The Problem:**
```typescript
// FRAGILE AND INCOMPLETE
export function getTenantPrisma(siteId: string): TenantPrismaClient {
  return new Proxy(prisma, {
    get(target, prop: string) {
      // This misses: $transaction, $queryRaw, upsert, nested writes, relations
    }
  });
}
```

Issues:
1. **Doesn't intercept `$transaction`** - bulk operations bypass tenant filter
2. **Doesn't handle `upsert`** - creates without `site_id` on insert path
3. **Doesn't handle nested writes** - `create: { posts: { create: {...} } }` bypasses filter
4. **Doesn't handle `$queryRaw`** - raw SQL bypasses everything
5. **TypeScript lies** - `TenantPrismaClient` type doesn't reflect actual behavior
6. **Easy to bypass** - `const { prisma } = require('@yalla/db')` skips the proxy

**Impact:** Cross-tenant data leakage is likely with this approach.

---

### Critical Flaw #3: No Database-Level Tenant Enforcement

**The Problem:**
The draft relies entirely on application-level filtering. If any code path misses the filter, data leaks.

```prisma
// Draft schema - no database enforcement
model Resort {
  site_id String
  @@index([site_id])  // Just an index, not a constraint
}
```

**Missing:**
- Row-Level Security (RLS) not possible with Prisma/Postgres directly
- No foreign key from `site_id` to `Site.id` (allows orphan data)
- No composite unique constraints on lookup fields

---

### Critical Flaw #4: Cron Jobs in Separate App Don't Work on Vercel

**The Problem:**
```
apps/
  cron/                # This cannot be deployed as a separate Vercel project
    jobs/
    runner.ts
```

Vercel cron jobs must be API routes within a Next.js app. A standalone `apps/cron` package with `runner.ts` cannot be invoked by Vercel's cron scheduler.

**Impact:** All cron automation is non-functional.

---

### Critical Flaw #5: RTL Component Testing Strategy Missing

**The Problem:**
The draft describes RTL utilities but has no concrete testing strategy to prevent regressions.

```typescript
// Draft mentions "RTL direction tests" but doesn't specify:
// - How to test Radix components in RTL
// - How to catch `ml-4` vs `ms-4` mistakes
// - How to validate Arabic typography rendering
```

**Impact:** RTL bugs will ship to production.

---

## Section 2: Final Architecture

### Deployment Strategy: Option A - Single Next.js App + Runtime Tenant Resolution

**Justification:**
- Vercel supports one Next.js app per project natively
- Runtime tenant resolution via middleware is well-supported
- Simplest path that actually works
- Admin can be a route group (`/admin/*`) or separate Vercel project
- No Turborepo/monorepo complexity on Vercel

**Architecture:**
```
┌─────────────────────────────────────────────────────────────┐
│                    VERCEL PROJECT: yalla-platform           │
│  ┌───────────────────────────────────────────────────────┐ │
│  │              SINGLE NEXT.JS 14 APP                     │ │
│  │  ┌─────────────────────────────────────────────────┐  │ │
│  │  │ middleware.ts (tenant resolution)               │  │ │
│  │  │ ↓                                               │  │ │
│  │  │ app/                                            │  │ │
│  │  │   (public)/        ← yallalondon.com routes     │  │ │
│  │  │   (arabaldives)/   ← arabaldives.com routes     │  │ │
│  │  │   (admin)/         ← admin.*.com routes         │  │ │
│  │  │   api/             ← shared API routes          │  │ │
│  │  └─────────────────────────────────────────────────┘  │ │
│  └───────────────────────────────────────────────────────┘ │
│                              │                              │
│  Domains: yallalondon.com, arabaldives.com, admin.*        │
└─────────────────────────────────────────────────────────────┘
```

### Final Repository Layout

```
/
├── app/                              # Single Next.js 14 App
│   ├── middleware.ts                 # Tenant resolution (CRITICAL)
│   ├── layout.tsx                    # Root layout (direction-aware)
│   │
│   ├── (public)/                     # Yalla London public routes
│   │   ├── layout.tsx                # LTR layout
│   │   ├── page.tsx
│   │   ├── blog/
│   │   └── recommendations/
│   │
│   ├── (arabaldives)/                # Arabaldives public routes (RTL)
│   │   ├── layout.tsx                # RTL layout with Arabic fonts
│   │   ├── page.tsx                  # Arabic homepage
│   │   ├── resorts/
│   │   │   ├── page.tsx
│   │   │   └── [slug]/page.tsx
│   │   ├── compare/
│   │   │   └── [slug]/page.tsx
│   │   ├── guides/
│   │   └── products/
│   │
│   ├── (admin)/                      # Shared admin (tenant-aware)
│   │   ├── layout.tsx                # Admin shell
│   │   ├── dashboard/
│   │   ├── resorts/                  # Arabaldives-specific
│   │   ├── comparisons/
│   │   ├── content/                  # Shared content management
│   │   └── settings/
│   │
│   └── api/
│       ├── cron/                     # Vercel cron endpoints
│       │   ├── publish-scheduled/route.ts
│       │   ├── seo-audit/route.ts
│       │   └── resort-freshness/route.ts
│       ├── resorts/
│       ├── comparisons/
│       ├── leads/
│       └── webhooks/
│
├── lib/                              # Shared libraries
│   ├── tenant/
│   │   ├── context.ts                # TenantContext type & helpers
│   │   ├── middleware.ts             # Tenant resolution logic
│   │   ├── config.ts                 # Tenant config loader
│   │   └── constants.ts              # Tenant IDs, domains
│   │
│   ├── db/
│   │   ├── client.ts                 # Prisma client singleton
│   │   ├── tenant-queries.ts         # Tenant-safe query builders
│   │   ├── assertions.ts             # Runtime tenant assertions
│   │   └── types.ts                  # Re-exported Prisma types
│   │
│   ├── domains/                      # Domain modules
│   │   ├── resorts/
│   │   │   ├── service.ts
│   │   │   ├── scoring.ts
│   │   │   ├── queries.ts            # Tenant-safe Prisma queries
│   │   │   └── types.ts
│   │   ├── comparisons/
│   │   │   ├── service.ts
│   │   │   ├── table-builder.ts
│   │   │   └── queries.ts
│   │   ├── products/
│   │   │   ├── service.ts
│   │   │   ├── checkout.ts
│   │   │   └── queries.ts
│   │   └── leads/
│   │       ├── service.ts
│   │       ├── consent.ts
│   │       └── queries.ts
│   │
│   ├── auth/                         # Existing auth (unchanged)
│   ├── seo/                          # Existing SEO (add tenant scope)
│   └── feature-flags/                # Add tenant scope
│
├── components/
│   ├── ui/                           # Shared primitives
│   ├── rtl/                          # RTL-specific components
│   │   ├── RTLProvider.tsx
│   │   ├── DirectionAware.tsx
│   │   └── RadixRTLFixes.tsx
│   ├── admin/                        # Admin components
│   ├── arabaldives/                  # Arabaldives-specific
│   │   ├── ResortCard.tsx
│   │   ├── ComparisonTable.tsx
│   │   └── LeadCaptureForm.tsx
│   └── public/                       # Yalla London components
│
├── prisma/
│   ├── schema.prisma                 # Single schema with all models
│   └── migrations/
│
├── config/
│   ├── tenants/
│   │   ├── yalla-london.ts
│   │   └── arabaldives.ts
│   └── feature-flags.ts
│
├── tests/
│   ├── tenant-isolation/             # CRITICAL: Cross-tenant tests
│   │   ├── resort-isolation.test.ts
│   │   ├── lead-isolation.test.ts
│   │   └── cron-isolation.test.ts
│   ├── rtl/
│   │   ├── component-direction.test.ts
│   │   └── logical-props.test.ts
│   ├── e2e/
│   └── unit/
│
├── package.json
├── vercel.json
├── next.config.js
└── tsconfig.json
```

### Module Responsibilities

| Module | Responsibility | Tenant Awareness |
|--------|----------------|------------------|
| `lib/tenant/` | Resolve tenant from request, provide context | Source of truth |
| `lib/db/` | Prisma client, tenant-safe query helpers | Enforces tenant scope |
| `lib/domains/resorts/` | Resort business logic | Receives `siteId` param |
| `lib/domains/comparisons/` | Comparison engine | Receives `siteId` param |
| `lib/domains/products/` | Digital products, checkout | Receives `siteId` param |
| `lib/domains/leads/` | Lead capture, consent | Receives `siteId` param |
| `components/rtl/` | RTL-specific UI utilities | Direction from context |
| `components/arabaldives/` | Arabaldives UI components | Hardcoded RTL |
| `app/api/cron/` | Vercel cron handlers | Iterates tenants safely |

---

## Section 3: Tenancy Enforcement (No Proxy)

### 3.1 Explicit Query Builders (Recommended Pattern)

**Instead of Proxy magic, use explicit tenant-scoped query functions:**

```typescript
// lib/db/tenant-queries.ts

import { prisma } from './client';
import { Prisma } from '@prisma/client';

/**
 * PATTERN: Every query function takes siteId as FIRST parameter.
 * This makes tenant scoping explicit and auditable.
 */

// ============== RESORTS ==============

export async function findResorts(
  siteId: string,
  where: Omit<Prisma.ResortWhereInput, 'site_id'> = {},
  options: {
    select?: Prisma.ResortSelect;
    orderBy?: Prisma.ResortOrderByWithRelationInput;
    take?: number;
    skip?: number;
  } = {}
) {
  return prisma.resort.findMany({
    where: { ...where, site_id: siteId },  // ALWAYS inject site_id
    ...options,
  });
}

export async function findResortBySlug(siteId: string, slug: string) {
  return prisma.resort.findUnique({
    where: {
      site_id_slug: { site_id: siteId, slug },  // Composite unique
    },
  });
}

export async function createResort(
  siteId: string,
  data: Omit<Prisma.ResortCreateInput, 'site' | 'site_id'>
) {
  return prisma.resort.create({
    data: {
      ...data,
      site: { connect: { id: siteId } },  // FK relationship
    },
  });
}

export async function updateResort(
  siteId: string,
  resortId: string,
  data: Prisma.ResortUpdateInput
) {
  // First verify the resort belongs to this tenant
  const existing = await prisma.resort.findFirst({
    where: { id: resortId, site_id: siteId },
    select: { id: true },
  });

  if (!existing) {
    throw new TenantAccessError(`Resort ${resortId} not found for tenant ${siteId}`);
  }

  return prisma.resort.update({
    where: { id: resortId },
    data,
  });
}

export async function deleteResort(siteId: string, resortId: string) {
  // Verify tenant ownership before delete
  const deleted = await prisma.resort.deleteMany({
    where: { id: resortId, site_id: siteId },
  });

  if (deleted.count === 0) {
    throw new TenantAccessError(`Resort ${resortId} not found for tenant ${siteId}`);
  }

  return deleted;
}

// ============== LEADS ==============

export async function findLeadByEmail(siteId: string, email: string) {
  return prisma.lead.findUnique({
    where: {
      site_id_email: { site_id: siteId, email },  // Composite unique
    },
  });
}

export async function createLead(
  siteId: string,
  data: Omit<Prisma.LeadCreateInput, 'site' | 'site_id'>
) {
  return prisma.lead.create({
    data: {
      ...data,
      site: { connect: { id: siteId } },
    },
  });
}

// ============== CUSTOM ERROR ==============

export class TenantAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TenantAccessError';
  }
}
```

### 3.2 Prisma Schema with Composite Unique Constraints

```prisma
// prisma/schema.prisma

model Site {
  id          String   @id @default(cuid())
  slug        String   @unique
  domain      String   @unique
  name        String
  // ... other fields

  // Relations
  resorts     Resort[]
  comparisons Comparison[]
  products    Product[]
  leads       Lead[]
}

model Resort {
  id                String    @id @default(cuid())
  site_id           String
  slug              String

  // ... other fields

  // Relations with explicit FK
  site              Site      @relation(fields: [site_id], references: [id], onDelete: Cascade)
  comparisons       ComparisonResort[]

  // CRITICAL: Composite unique for tenant-scoped lookups
  @@unique([site_id, slug], name: "site_id_slug")

  // Index for filtered queries
  @@index([site_id, is_active])
  @@index([site_id, category])
}

model Lead {
  id          String   @id @default(cuid())
  site_id     String
  email       String

  // ... other fields

  site        Site     @relation(fields: [site_id], references: [id], onDelete: Cascade)

  // CRITICAL: Email unique per tenant, not globally
  @@unique([site_id, email], name: "site_id_email")

  @@index([site_id, status])
}

model Comparison {
  id          String   @id @default(cuid())
  site_id     String
  slug        String

  // ... other fields

  site        Site     @relation(fields: [site_id], references: [id], onDelete: Cascade)

  @@unique([site_id, slug], name: "site_id_slug")
  @@index([site_id, status])
}

model Product {
  id          String   @id @default(cuid())
  site_id     String
  slug        String

  // ... other fields

  site        Site     @relation(fields: [site_id], references: [id], onDelete: Cascade)

  @@unique([site_id, slug], name: "site_id_slug")
  @@index([site_id, status])
}
```

### 3.3 Runtime Assertion Helper

```typescript
// lib/db/assertions.ts

import { prisma } from './client';

/**
 * Assert that a record belongs to the specified tenant.
 * Use this before any update/delete operation.
 */
export async function assertTenantOwnership<T extends { site_id: string }>(
  record: T | null,
  expectedSiteId: string,
  resourceType: string
): asserts record is T {
  if (!record) {
    throw new TenantAccessError(`${resourceType} not found`);
  }

  if (record.site_id !== expectedSiteId) {
    // Log this as a security event
    console.error(`[SECURITY] Tenant mismatch: expected ${expectedSiteId}, got ${record.site_id}`);
    throw new TenantAccessError(`${resourceType} not found`);  // Don't reveal tenant mismatch
  }
}

/**
 * Wrap a Prisma query to ensure results match expected tenant.
 * Use as a safety net for complex queries.
 */
export function assertAllBelongToTenant<T extends { site_id: string }>(
  records: T[],
  expectedSiteId: string
): T[] {
  for (const record of records) {
    if (record.site_id !== expectedSiteId) {
      console.error(`[SECURITY] Cross-tenant data in result set`);
      throw new TenantAccessError('Data integrity violation');
    }
  }
  return records;
}
```

### 3.4 Test Strategy for Tenant Isolation

```typescript
// tests/tenant-isolation/resort-isolation.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/db/client';
import { findResorts, findResortBySlug, createResort } from '@/lib/db/tenant-queries';

describe('Resort Tenant Isolation', () => {
  const TENANT_A = 'tenant-a-test';
  const TENANT_B = 'tenant-b-test';

  beforeAll(async () => {
    // Create test tenants
    await prisma.site.createMany({
      data: [
        { id: TENANT_A, slug: 'tenant-a', domain: 'tenant-a.test', name: 'Tenant A' },
        { id: TENANT_B, slug: 'tenant-b', domain: 'tenant-b.test', name: 'Tenant B' },
      ],
    });

    // Create resorts for each tenant
    await prisma.resort.createMany({
      data: [
        { site_id: TENANT_A, slug: 'resort-1', name_ar: 'منتجع أ1', description_ar: 'وصف' },
        { site_id: TENANT_A, slug: 'resort-2', name_ar: 'منتجع أ2', description_ar: 'وصف' },
        { site_id: TENANT_B, slug: 'resort-1', name_ar: 'منتجع ب1', description_ar: 'وصف' },  // Same slug, different tenant
      ],
    });
  });

  afterAll(async () => {
    await prisma.resort.deleteMany({ where: { site_id: { in: [TENANT_A, TENANT_B] } } });
    await prisma.site.deleteMany({ where: { id: { in: [TENANT_A, TENANT_B] } } });
  });

  it('findResorts only returns resorts for specified tenant', async () => {
    const resortsA = await findResorts(TENANT_A);
    const resortsB = await findResorts(TENANT_B);

    expect(resortsA).toHaveLength(2);
    expect(resortsB).toHaveLength(1);

    // Verify no cross-contamination
    expect(resortsA.every(r => r.site_id === TENANT_A)).toBe(true);
    expect(resortsB.every(r => r.site_id === TENANT_B)).toBe(true);
  });

  it('findResortBySlug respects tenant boundary', async () => {
    // Same slug exists in both tenants
    const resortA = await findResortBySlug(TENANT_A, 'resort-1');
    const resortB = await findResortBySlug(TENANT_B, 'resort-1');

    expect(resortA?.site_id).toBe(TENANT_A);
    expect(resortB?.site_id).toBe(TENANT_B);
    expect(resortA?.name_ar).toBe('منتجع أ1');
    expect(resortB?.name_ar).toBe('منتجع ب1');
  });

  it('createResort assigns correct tenant', async () => {
    const newResort = await createResort(TENANT_A, {
      slug: 'new-resort',
      name_ar: 'منتجع جديد',
      description_ar: 'وصف',
    });

    expect(newResort.site_id).toBe(TENANT_A);

    // Cleanup
    await prisma.resort.delete({ where: { id: newResort.id } });
  });

  it('cannot access other tenant resort by ID', async () => {
    const resortB = await prisma.resort.findFirst({ where: { site_id: TENANT_B } });

    // Attempt to fetch Tenant B's resort using Tenant A's context
    const result = await findResortBySlug(TENANT_A, resortB!.slug);

    // Should not find it (same slug, wrong tenant)
    expect(result?.id).not.toBe(resortB!.id);
  });
});
```

---

## Section 4: Deployment Strategy

### Chosen: Option A - Single Next.js App + Runtime Tenant Resolution

**Why not Option B (Multiple Vercel Projects)?**
- Requires deploying and maintaining multiple projects
- Shared packages need to be published or use relative imports
- More complex CI/CD
- Higher cost (multiple projects)

**Why not Option C (Multiple apps in one project)?**
- Vercel does not support this for host-based routing
- Would require custom edge middleware hacks

### Vercel Configuration

```json
// vercel.json
{
  "framework": "nextjs",
  "regions": ["iad1"],
  "crons": [
    {
      "path": "/api/cron/publish-scheduled",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/seo-audit",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/resort-freshness",
      "schedule": "0 6 * * 1"
    }
  ]
}
```

### Domain Configuration (Vercel Dashboard)

```
Production Domains:
├── yallalondon.com        → Production
├── www.yallalondon.com    → Production
├── arabaldives.com        → Production
├── www.arabaldives.com    → Production
├── admin.yallalondon.com  → Production
└── admin.arabaldives.com  → Production

Preview Domains:
└── *.vercel.app           → Preview
```

### Middleware Tenant Resolution

```typescript
// app/middleware.ts

import { NextRequest, NextResponse } from 'next/server';

// Tenant configuration
const TENANT_DOMAINS: Record<string, { id: string; routeGroup: string; locale: string }> = {
  'yallalondon.com': { id: 'yalla-london', routeGroup: '(public)', locale: 'en' },
  'www.yallalondon.com': { id: 'yalla-london', routeGroup: '(public)', locale: 'en' },
  'arabaldives.com': { id: 'arabaldives', routeGroup: '(arabaldives)', locale: 'ar' },
  'www.arabaldives.com': { id: 'arabaldives', routeGroup: '(arabaldives)', locale: 'ar' },
  'admin.yallalondon.com': { id: 'yalla-london', routeGroup: '(admin)', locale: 'en' },
  'admin.arabaldives.com': { id: 'arabaldives', routeGroup: '(admin)', locale: 'ar' },
  'localhost': { id: process.env.DEFAULT_TENANT || 'yalla-london', routeGroup: '(public)', locale: 'en' },
};

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host')?.split(':')[0] || 'localhost';
  const tenant = TENANT_DOMAINS[hostname];

  if (!tenant) {
    return NextResponse.rewrite(new URL('/404', request.url));
  }

  // Add tenant context to headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tenant-id', tenant.id);
  requestHeaders.set('x-tenant-locale', tenant.locale);
  requestHeaders.set('x-tenant-route-group', tenant.routeGroup);

  // Rewrite to appropriate route group
  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  // Skip rewrite for API routes, static files, etc.
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.includes('.')
  ) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Rewrite to tenant-specific route group
  // e.g., /resorts → /(arabaldives)/resorts for arabaldives.com
  if (!pathname.startsWith(`/${tenant.routeGroup.replace(/[()]/g, '')}`)) {
    url.pathname = `/${tenant.routeGroup.replace(/[()]/g, '')}${pathname}`;
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

---

## Section 5: Cron Safety Model

### Cron Endpoint Pattern

```typescript
// app/api/cron/publish-scheduled/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { findScheduledContent, publishContent } from '@/lib/domains/content/queries';
import { isFeatureEnabled } from '@/lib/feature-flags';

export async function POST(request: NextRequest) {
  // 1. Validate cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Get all active tenants
  const tenants = await prisma.site.findMany({
    where: { is_active: true },
    select: { id: true, slug: true },
  });

  const results: Record<string, { success: boolean; published?: number; error?: string }> = {};

  // 3. Process each tenant in isolation
  for (const tenant of tenants) {
    try {
      // Check tenant-specific feature flag
      if (!await isFeatureEnabled('FEATURE_CONTENT_PIPELINE', tenant.id)) {
        results[tenant.slug] = { success: true, published: 0 };
        continue;
      }

      // Process only this tenant's content
      const scheduled = await findScheduledContent(tenant.id, {
        status: 'SCHEDULED',
        scheduledBefore: new Date(),
      });

      let published = 0;
      for (const content of scheduled) {
        await publishContent(tenant.id, content.id);
        published++;
      }

      // Audit log
      await prisma.auditLog.create({
        data: {
          site_id: tenant.id,
          action: 'cron_publish_scheduled',
          resource: 'scheduled_content',
          details: { published, total: scheduled.length },
          success: true,
        },
      });

      results[tenant.slug] = { success: true, published };
    } catch (error) {
      // Log error but continue with other tenants
      await prisma.auditLog.create({
        data: {
          site_id: tenant.id,
          action: 'cron_publish_scheduled',
          resource: 'scheduled_content',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
          success: false,
        },
      });

      results[tenant.slug] = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  return NextResponse.json({ results });
}
```

### Cron Security Checklist

| Requirement | Implementation |
|-------------|----------------|
| Auth on every endpoint | `CRON_SECRET` header validation |
| Tenant iteration | Loop through `site.findMany()` |
| Error isolation | Try/catch per tenant |
| Feature flag check | `isFeatureEnabled(flag, tenantId)` |
| Audit logging | `auditLog.create()` per tenant |
| No cross-tenant data | Use tenant-scoped query functions |
| Timeout handling | Vercel 60s default (Pro: 300s) |

---

## Section 6: RTL UI Contract

### RTL Testing Strategy

```typescript
// tests/rtl/component-direction.test.tsx

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ResortCard } from '@/components/arabaldives/ResortCard';

describe('RTL Component Tests', () => {
  const renderRTL = (ui: React.ReactElement) => {
    return render(
      <div dir="rtl" lang="ar">
        {ui}
      </div>
    );
  };

  it('ResortCard uses logical properties, not physical', async () => {
    const { container } = renderRTL(
      <ResortCard
        resort={{
          name_ar: 'منتجع الشمس',
          slug: 'sun-resort',
          // ...
        }}
      />
    );

    // Check for forbidden physical properties
    const styles = container.innerHTML;

    // These should NOT appear
    expect(styles).not.toContain('margin-left');
    expect(styles).not.toContain('margin-right');
    expect(styles).not.toContain('padding-left');
    expect(styles).not.toContain('padding-right');
    expect(styles).not.toContain('text-align: left');
    expect(styles).not.toContain('text-align: right');
    expect(styles).not.toContain('float: left');
    expect(styles).not.toContain('float: right');
  });

  it('ResortCard renders price on correct side in RTL', () => {
    renderRTL(
      <ResortCard
        resort={{
          name_ar: 'منتجع الشمس',
          starting_price: 500,
          // ...
        }}
      />
    );

    const priceElement = screen.getByText('$500');
    const styles = window.getComputedStyle(priceElement);

    // In RTL, "end" should compute to "left"
    expect(styles.textAlign).toBe('left');  // Or check for 'end' if using logical
  });
});
```

### ESLint Rule for Physical Properties

```javascript
// .eslintrc.js

module.exports = {
  rules: {
    // Custom rule or use stylelint
    'no-restricted-syntax': [
      'error',
      {
        selector: 'Literal[value=/\\b(ml-|mr-|pl-|pr-|left-|right-|text-left|text-right)\\b/]',
        message: 'Use logical properties (ms-, me-, ps-, pe-, start-, end-, text-start, text-end) instead of physical properties for RTL support.',
      },
    ],
  },
};
```

### RTL Component Checklist

| Component Type | RTL Requirement |
|----------------|-----------------|
| Layout | Use `ms-*`/`me-*` not `ml-*`/`mr-*` |
| Flex | Use `gap` or logical margins |
| Position | Use `start-*`/`end-*` not `left-*`/`right-*` |
| Text | Use `text-start`/`text-end` |
| Icons | Flip chevrons with `transform: scaleX(-1)` |
| Tables | First column aligns to start |
| Carousels | Reverse navigation arrows |
| Drawers | Slide from opposite side |
| Dropdowns | Use `align="start"` not `align="left"` |

---

## Section 7: PR Plan

### PR 1: Tenant Middleware Foundation
**Goal:** Add tenant resolution without breaking existing functionality

**Files touched:**
```
app/middleware.ts                    (create)
lib/tenant/context.ts                (create)
lib/tenant/config.ts                 (create)
lib/tenant/constants.ts              (create)
config/tenants/yalla-london.ts       (create)
tests/unit/tenant-middleware.test.ts (create)
```

**Migration steps:**
1. Create tenant config files
2. Add middleware with fallback to 'yalla-london'
3. Existing routes continue working unchanged

**Tests:**
- Middleware resolves correct tenant from host
- Unknown host returns 404
- Headers are injected correctly
- Fallback works for localhost

**Acceptance criteria:**
- [ ] All existing routes work unchanged
- [ ] `x-tenant-id` header present on all requests
- [ ] Tests pass
- [ ] Production deployment succeeds

---

### PR 2: Tenant-Safe Query Layer
**Goal:** Create explicit tenant-scoped Prisma queries

**Files touched:**
```
lib/db/tenant-queries.ts             (create)
lib/db/assertions.ts                 (create)
lib/db/client.ts                     (modify - ensure singleton)
tests/tenant-isolation/base.test.ts  (create)
```

**Migration steps:**
1. Create query builder functions
2. Add assertion helpers
3. Do not modify existing direct Prisma usage yet

**Tests:**
- Query functions inject site_id correctly
- Assertion helpers throw on mismatch
- Cross-tenant queries return empty

**Acceptance criteria:**
- [ ] New query layer available for new code
- [ ] Existing code unchanged
- [ ] Isolation tests pass

---

### PR 3: Schema Migration - Add Tenant Columns
**Goal:** Add site_id to models that lack it + composite uniques

**Files touched:**
```
prisma/schema.prisma                          (modify)
prisma/migrations/YYYYMMDD_add_tenant_cols/   (create)
scripts/backfill-tenant.ts                    (create)
```

**Migration steps:**
1. Add `site_id String?` to models (nullable first)
2. Run migration
3. Backfill existing data with 'yalla-london' site_id
4. Second migration: make `site_id` required, add composite uniques

**Tests:**
- Migration applies cleanly
- Backfill script works
- Composite unique constraints enforced

**Acceptance criteria:**
- [ ] All models have site_id
- [ ] Composite uniques prevent duplicate slugs per tenant
- [ ] Zero-downtime migration

---

### PR 4: Route Group Structure
**Goal:** Create route group structure for multi-tenant routing

**Files touched:**
```
app/(public)/layout.tsx              (create - copy from app/layout.tsx)
app/(public)/page.tsx                (move from app/page.tsx)
app/(public)/blog/                   (move from app/blog/)
app/(arabaldives)/layout.tsx         (create - RTL layout)
app/(arabaldives)/page.tsx           (create - placeholder)
app/(admin)/layout.tsx               (move from app/admin/layout.tsx)
```

**Migration steps:**
1. Create route groups
2. Move existing public routes to `(public)`
3. Create RTL layout for `(arabaldives)`
4. Update middleware rewrite logic

**Tests:**
- Existing routes accessible via yallalondon.com
- Arabaldives routes return placeholder

**Acceptance criteria:**
- [ ] No regression on existing routes
- [ ] Route groups properly isolated
- [ ] RTL layout renders correctly

---

### PR 5: Resort Domain Module
**Goal:** Implement resorts for Arabaldives

**Files touched:**
```
lib/domains/resorts/service.ts       (create)
lib/domains/resorts/queries.ts       (create)
lib/domains/resorts/types.ts         (create)
lib/domains/resorts/scoring.ts       (create)
prisma/schema.prisma                 (add Resort model)
prisma/migrations/YYYYMMDD_resorts/  (create)
app/(arabaldives)/resorts/page.tsx   (create)
app/(arabaldives)/resorts/[slug]/page.tsx (create)
components/arabaldives/ResortCard.tsx (create)
components/arabaldives/ResortFilters.tsx (create)
tests/domains/resorts.test.ts        (create)
tests/tenant-isolation/resort-isolation.test.ts (create)
```

**Tests:**
- Resort CRUD operations
- Scoring algorithm
- Tenant isolation
- RTL rendering

**Acceptance criteria:**
- [ ] Resort listing page works
- [ ] Resort detail page works
- [ ] Tenant isolation verified
- [ ] RTL layout correct

---

### PR 6: Comparison Engine
**Goal:** Implement comparison functionality

**Files touched:**
```
lib/domains/comparisons/service.ts   (create)
lib/domains/comparisons/queries.ts   (create)
lib/domains/comparisons/table-builder.ts (create)
prisma/schema.prisma                 (add Comparison, ComparisonResort)
prisma/migrations/YYYYMMDD_comparisons/ (create)
app/(arabaldives)/compare/[slug]/page.tsx (create)
components/arabaldives/ComparisonTable.tsx (create)
tests/domains/comparisons.test.ts    (create)
```

**Tests:**
- Comparison CRUD
- Table builder generates correct data
- "Best for" logic

**Acceptance criteria:**
- [ ] Comparison pages render
- [ ] Tables responsive in RTL
- [ ] Links to resort pages work

---

### PR 7: Admin Dashboard
**Goal:** Tenant-aware admin for Arabaldives

**Files touched:**
```
app/(admin)/layout.tsx               (modify for tenant awareness)
app/(admin)/resorts/page.tsx         (create)
app/(admin)/resorts/new/page.tsx     (create)
app/(admin)/resorts/[id]/page.tsx    (create)
app/(admin)/comparisons/page.tsx     (create)
app/(admin)/comparisons/new/page.tsx (create)
components/admin/ResortForm.tsx      (create)
components/admin/ComparisonBuilder.tsx (create)
lib/auth/tenant-auth.ts              (modify - add tenant check)
tests/admin/resort-crud.test.ts      (create)
```

**Tests:**
- Admin auth includes tenant check
- CRUD operations scoped to tenant
- Forms validate correctly

**Acceptance criteria:**
- [ ] Admin login works for both tenants
- [ ] CRUD operations tenant-scoped
- [ ] Cannot access other tenant's data

---

### PR 8: Cron Jobs + Audit Logging
**Goal:** Tenant-safe cron implementation

**Files touched:**
```
app/api/cron/publish-scheduled/route.ts (create)
app/api/cron/resort-freshness/route.ts (create)
lib/audit/logger.ts                  (create)
prisma/schema.prisma                 (add AuditLog if missing)
vercel.json                          (add cron config)
tests/cron/tenant-isolation.test.ts  (create)
```

**Tests:**
- Cron auth validation
- Per-tenant processing
- Audit log creation
- Error isolation between tenants

**Acceptance criteria:**
- [ ] Cron endpoints protected
- [ ] Each tenant processed independently
- [ ] Errors don't affect other tenants
- [ ] Audit logs created

---

### PR 9: Products + Leads Modules
**Goal:** Monetization features for Arabaldives

**Files touched:**
```
lib/domains/products/service.ts      (create)
lib/domains/products/checkout.ts     (create)
lib/domains/leads/service.ts         (create)
lib/domains/leads/consent.ts         (create)
prisma/schema.prisma                 (add Product, Purchase, Lead models)
prisma/migrations/YYYYMMDD_products_leads/ (create)
app/(arabaldives)/products/page.tsx  (create)
app/(arabaldives)/products/[slug]/page.tsx (create)
app/api/webhooks/stripe/route.ts     (create)
components/arabaldives/LeadCaptureForm.tsx (create)
tests/domains/products.test.ts       (create)
tests/domains/leads.test.ts          (create)
```

**Tests:**
- Product CRUD
- Checkout flow (mock Stripe)
- Lead capture with consent
- Download token generation

**Acceptance criteria:**
- [ ] Products display correctly
- [ ] Checkout redirects work
- [ ] Lead capture stores consent
- [ ] Download tokens work

---

### PR 10: Domain Management Platform
**Goal:** Self-service tenant/domain management in admin dashboard

**Files touched:**
```
prisma/schema.prisma                          (add Domain model, update Site)
prisma/migrations/YYYYMMDD_domain_mgmt/       (create)
lib/tenant/resolver.ts                        (dynamic DB-based resolution)
lib/tenant/cache.ts                           (tenant config caching)
lib/domains/sites/service.ts                  (create)
lib/domains/sites/queries.ts                  (create)
app/(admin)/sites/page.tsx                    (list all sites)
app/(admin)/sites/new/page.tsx                (create site wizard)
app/(admin)/sites/[id]/page.tsx               (edit site settings)
app/(admin)/sites/[id]/domains/page.tsx       (manage domains)
app/(admin)/sites/[id]/branding/page.tsx      (logo, colors, fonts)
app/(admin)/sites/[id]/features/page.tsx      (feature toggles)
app/(admin)/sites/[id]/team/page.tsx          (team members)
components/admin/SiteForm.tsx                 (create)
components/admin/DomainVerification.tsx       (create)
tests/admin/site-management.test.ts           (create)
```

**New Prisma Models:**
```prisma
model Domain {
  id          String   @id @default(cuid())
  site_id     String
  hostname    String   @unique
  is_primary  Boolean  @default(false)
  verified    Boolean  @default(false)
  verified_at DateTime?
  site        Site     @relation(fields: [site_id], references: [id], onDelete: Cascade)
  created_at  DateTime @default(now())
}
```

**Tests:**
- CRUD operations for sites
- Domain uniqueness validation
- Tenant resolution from database
- Cache invalidation on update

**Acceptance criteria:**
- [ ] Can create new tenant from admin UI
- [ ] Can add/remove domains per tenant
- [ ] Middleware resolves tenant from database
- [ ] Cache refreshes on config change
- [ ] Super-admin can manage all sites

---

### PR 11: Team & Expertise System
**Goal:** World-class team profiles with skills and roles

**Files touched:**
```
prisma/schema.prisma                          (add TeamMember, Skill, Expertise)
prisma/migrations/YYYYMMDD_team_expertise/    (create)
lib/domains/team/service.ts                   (create)
lib/domains/team/queries.ts                   (create)
app/(admin)/team/page.tsx                     (team directory)
app/(admin)/team/new/page.tsx                 (add team member)
app/(admin)/team/[id]/page.tsx                (edit member profile)
app/(admin)/team/skills/page.tsx              (manage skill taxonomy)
app/(public)/about/team/page.tsx              (public team page)
app/(arabaldives)/about/team/page.tsx         (Arabic team page)
components/TeamMemberCard.tsx                 (create)
components/SkillBadge.tsx                     (create)
components/ExpertiseShowcase.tsx              (create)
```

**New Prisma Models:**
```prisma
model TeamMember {
  id              String   @id @default(cuid())
  site_id         String?  // null = global team member across sites
  user_id         String?  // optional link to User for login

  // Profile
  name_en         String
  name_ar         String?
  slug            String   @unique
  title_en        String   // "Senior Travel Content Strategist"
  title_ar        String?
  bio_en          String   @db.Text
  bio_ar          String?  @db.Text

  // Media
  avatar_url      String?
  cover_image_url String?

  // Contact (optional public)
  email_public    String?
  linkedin_url    String?
  twitter_url     String?
  website_url     String?

  // Status
  is_active       Boolean  @default(true)
  is_featured     Boolean  @default(false)
  display_order   Int      @default(0)

  // Relations
  site            Site?    @relation(fields: [site_id], references: [id])
  expertise       TeamMemberExpertise[]

  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  @@index([site_id, is_active])
}

model Skill {
  id          String   @id @default(cuid())
  slug        String   @unique
  name_en     String
  name_ar     String?
  category    SkillCategory
  icon        String?  // Lucide icon name or URL
  color       String?  // Hex color for badge

  expertise   TeamMemberExpertise[]

  @@index([category])
}

model TeamMemberExpertise {
  id              String   @id @default(cuid())
  team_member_id  String
  skill_id        String

  proficiency     Proficiency @default(EXPERT)
  years_experience Int?
  description     String?     // Optional context
  is_primary      Boolean     @default(false)  // Top 3-5 skills

  team_member     TeamMember @relation(fields: [team_member_id], references: [id], onDelete: Cascade)
  skill           Skill      @relation(fields: [skill_id], references: [id])

  @@unique([team_member_id, skill_id])
}

enum SkillCategory {
  ENGINEERING        // Coding, Architecture, DevOps
  AI_ML              // AI Implementation, Prompt Engineering, ML
  DESIGN             // UI/UX, Visual Design, Brand Design
  DATA               // Database, Analytics, BI
  CONTENT            // Travel Writing, SEO Content, Copywriting
  MARKETING          // Affiliate, Growth, Paid Media
  PSYCHOLOGY         // Consumer Behavior, Persuasion, UX Research
  BUSINESS           // Strategy, Operations, Finance
  TRAVEL             // Destination Expertise, Industry Knowledge
}

enum Proficiency {
  LEARNING           // Currently developing
  PROFICIENT         // Solid working knowledge
  EXPERT             // Deep expertise
  THOUGHT_LEADER     // Industry recognition
}
```

**Skill Categories Included:**
| Category | Examples |
|----------|----------|
| ENGINEERING | Full-Stack Development, System Architecture, API Design |
| AI_ML | AI Implementation, Prompt Engineering, LLM Integration |
| DESIGN | High-End UI/UX, Visual Design, Motion Design |
| DATA | Database Management, Analytics, Data Modeling |
| CONTENT | Travel Content Writing, SEO Copywriting, Editorial |
| MARKETING | Affiliate Marketing, Growth Strategy, Conversion Optimization |
| PSYCHOLOGY | Consumer Behavior, Persuasion Design, UX Research |
| BUSINESS | Strategy, Operations, Partnership Development |
| TRAVEL | Destination Expertise, Hospitality Industry, Luxury Travel |

**Tests:**
- Team member CRUD
- Skill assignment
- Public team page rendering (LTR + RTL)
- Filtering by skill category

**Acceptance criteria:**
- [ ] Can add team members with full profiles
- [ ] Can assign multiple skills with proficiency levels
- [ ] Public team page showcases expertise
- [ ] Skills display correctly in Arabic
- [ ] Can filter/search by skill category

---

### PR 12: Launch Readiness
**Goal:** Final polish and verification

**Files touched:**
```
app/(arabaldives)/sitemap.ts         (create)
app/(arabaldives)/robots.ts          (create)
config/tenants/arabaldives.ts        (finalize)
tests/e2e/arabaldives-flow.test.ts   (create)
docs/runbooks/tenant-operations.md   (create)
```

**Tests:**
- E2E flow: browse resorts → compare → capture lead
- SEO: sitemap, robots, meta tags
- Performance: Lighthouse scores

**Acceptance criteria:**
- [ ] All pages accessible
- [ ] SEO files generated correctly
- [ ] Performance acceptable
- [ ] No console errors in production

---

## Section 8: Risk Register

| # | Risk | Category | Likelihood | Impact | Mitigation |
|---|------|----------|------------|--------|------------|
| 1 | **Cross-tenant data leakage** | Security | Medium | Critical | Explicit query functions (no proxy); isolation tests in CI; composite unique constraints |
| 2 | **Middleware performance bottleneck** | Performance | Low | Medium | Cache tenant config; use edge middleware; benchmark with load tests |
| 3 | **Route group conflicts** | DevEx | Medium | Low | Clear naming conventions; documentation; CI checks for route collisions |
| 4 | **RTL regressions in shared components** | UX | High | Medium | RTL-specific tests; ESLint rules for logical properties; visual regression tests |
| 5 | **Cron job timeout on many tenants** | Ops | Medium | Medium | Process tenants in parallel; set Vercel Pro timeout (300s); pagination |
| 6 | **SEO duplicate content penalties** | SEO | Medium | High | Unique sitemaps per tenant; proper canonical tags; different content focus |
| 7 | **Affiliate tracking loss on tenant switch** | Revenue | Low | High | Server-side tracking; session-based attribution; separate affiliate accounts |
| 8 | **Database migration downtime** | Ops | Low | Critical | Blue-green migrations; nullable-first pattern; tested rollback scripts |
| 9 | **Admin auth bypass for other tenant** | Security | Low | Critical | Tenant ID in session; server-side tenant verification on every request |
| 10 | **Arabic font loading failures** | UX | Medium | Medium | Font fallback stack; local font hosting; preload hints; monitoring |

---

## Appendix: ESLint Dependency Rules (10 Explicit DO NOTs)

```javascript
// .eslintrc.js

module.exports = {
  rules: {
    'import/no-restricted-paths': [
      'error',
      {
        zones: [
          // 1. DO NOT import Prisma client directly in route handlers
          {
            target: './app/**/*.ts',
            from: '@prisma/client',
            message: 'Use lib/db/tenant-queries.ts instead of direct Prisma imports in routes.',
          },

          // 2. DO NOT import domain modules from other domain modules
          {
            target: './lib/domains/resorts/**',
            from: './lib/domains/comparisons/**',
            message: 'Domain modules must not import from each other. Use shared types only.',
          },
          {
            target: './lib/domains/comparisons/**',
            from: './lib/domains/resorts/**',
            message: 'Domain modules must not import from each other. Use shared types only.',
          },

          // 3. DO NOT import app code from lib
          {
            target: './lib/**',
            from: './app/**',
            message: 'Library code must not import from app. Invert the dependency.',
          },

          // 4. DO NOT import components from lib (except types)
          {
            target: './lib/**',
            from: './components/**',
            message: 'Library code must not import React components.',
          },

          // 5. DO NOT import tenant context in public API routes (use header instead)
          {
            target: './app/api/**',
            from: './lib/tenant/context.ts',
            message: 'API routes should read x-tenant-id header, not import context directly.',
          },

          // 6. DO NOT use process.env in domain modules
          {
            target: './lib/domains/**',
            from: null,
            message: 'Domain modules must receive config via parameters, not process.env.',
            disallowedImports: [], // Would need custom rule for process.env
          },

          // 7. DO NOT import admin components in public routes
          {
            target: './app/(public)/**',
            from: './components/admin/**',
            message: 'Public routes must not import admin components.',
          },
          {
            target: './app/(arabaldives)/**',
            from: './components/admin/**',
            message: 'Arabaldives public routes must not import admin components.',
          },

          // 8. DO NOT import arabaldives components in yalla-london routes
          {
            target: './app/(public)/**',
            from: './components/arabaldives/**',
            message: 'Yalla London routes must not import Arabaldives-specific components.',
          },

          // 9. DO NOT import raw prisma in tests (use test utilities)
          {
            target: './tests/**',
            from: './lib/db/client.ts',
            except: ['./tests/setup.ts', './tests/utils.ts'],
            message: 'Tests should use test utilities, not raw Prisma client.',
          },

          // 10. DO NOT import server code in client components
          {
            target: './components/**/*.tsx',
            from: './lib/db/**',
            message: 'Client components cannot import database code. Fetch data in server components.',
          },
        ],
      },
    ],
  },
};
```

---

*Document generated: 2025-12-17*
*Author: Staff Engineering Review*
*Status: Final - Ready for Implementation*
