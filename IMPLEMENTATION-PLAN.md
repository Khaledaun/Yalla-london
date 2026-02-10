# Audit Recommendations Implementation Plan

**Date:** 2026-02-10
**Scope:** Security hardening, code quality, database optimization, testing
**Status:** Phase 1 Complete

---

## Overview

This document tracks the implementation of recommendations from two comprehensive audit reports:

1. **AUDIT-REPORT.md** (2026-02-07) — Full project audit covering security, architecture, testing, DevOps
2. **AUDIT_REPORT.md** (2026-02-10) — CMS, automation, design studio & admin dashboard audit

---

## Phase 1: Implemented (Current Sprint)

### 1.1 Critical Security Fixes

| Fix | File | Issue | Resolution | Status |
|-----|------|-------|------------|--------|
| Signup password not saved | `app/api/signup/route.ts` | `passwordHash` computed but not included in `prisma.user.create()` | Added `passwordHash` field to create call | DONE |
| Signup missing validation | `app/api/signup/route.ts` | No email format or password complexity validation | Added email regex check + minimum 12-character password requirement | DONE |
| Cron autopilot auth bypass | `app/api/cron/autopilot/route.ts` | `if (cronSecret && ...)` allowed unauthenticated access when `CRON_SECRET` not set | Changed to fail-closed: reject all requests if `CRON_SECRET` is missing | DONE |
| Cron auto-generate timing attack | `app/api/cron/auto-generate/route.ts` | String comparison for bearer token vulnerable to timing attacks | Replaced with `timingSafeEqual` from `crypto` module | DONE |
| Cron autopilot timing attack | `app/api/cron/autopilot/route.ts` | Same timing attack vulnerability | Same fix: `timingSafeEqual`-based `safeCompare()` function | DONE |
| Error details leaked | `app/api/cron/auto-generate/route.ts` | Internal error messages (DB host, port) returned to client | Return generic "Cron job failed" message; log details server-side only | DONE |
| Content generation unrate-limited | `app/api/generate-content/route.ts` | Expensive LLM API calls had no rate limiting | Wrapped with `withRateLimit(HEAVY_OPERATIONS)` — 2 requests/min/IP | DONE |
| CI secret fallback predictable | `.github/workflows/ci.yml` | `NEXTAUTH_SECRET` fallback used `github.run_id` (simple integer) | Changed to composite `run_id-run_attempt-sha` (harder to predict) | DONE |

### 1.2 Database Performance Improvements

| Change | Model | Index Added | Rationale |
|--------|-------|-------------|-----------|
| User role lookup | `User` | `@@index([role])` | RBAC permission checks filter by role |
| User active filter | `User` | `@@index([isActive])` | Dashboard queries filter active users |
| User creation date | `User` | `@@index([createdAt])` | Analytics and pagination queries |
| Lead email lookup | `Lead` | `@@index([email])` | Duplicate detection queries filter by email alone (not just composite) |
| PageView tenant+path | `PageView` | `@@index([site_id, path])` | Multi-tenant path analytics queries need composite index |

### 1.3 TypeScript Strict Mode (Incremental)

Enabled the following strict flags in `tsconfig.json`:

| Flag | Before | After | Impact |
|------|--------|-------|--------|
| `noImplicitReturns` | `false` | `true` | Catches missing return statements |
| `noImplicitThis` | `false` | `true` | Prevents `this` type errors |
| `strictFunctionTypes` | `false` | `true` | Enforces correct function signatures |
| `strictBindCallApply` | `false` | `true` | Type-checks `bind`, `call`, `apply` |
| `noImplicitOverride` | `false` | `true` | Requires `override` keyword for overrides |

**Not yet enabled** (require significant codebase changes):
- `strict: true` — umbrella flag, deferred to Phase 3
- `strictNullChecks` — requires fixing 100+ null-related patterns, deferred to Phase 2
- `noImplicitAny` — requires adding types to ~50+ untyped parameters, deferred to Phase 2

**12 TypeScript errors fixed** across 8 files to satisfy new strict flags:
- `app/components/admin/mobile-media-uploader.tsx` — Fixed `useState` misuse (was `useEffect`)
- `components/admin/async-action-toast.tsx` — Added explicit return
- `components/marketing/exit-intent-popup.tsx` — Added explicit return
- `components/marketing/social-proof.tsx` — Added explicit return
- `components/seo/breadcrumbs.tsx` — Added explicit return
- `components/seo/structured-content.tsx` — Added explicit return
- `components/ui/carousel.tsx` — Added explicit return
- `lib/seo/advanced-analytics.ts` — Added explicit returns (4 functions)

### 1.4 Testing

New test file: `test/security/audit-fixes.spec.ts` — **17 tests, all passing**

| Test Suite | Tests | Description |
|------------|-------|-------------|
| `safeCompare` | 5 | Timing-safe string comparison correctness |
| Signup password saving | 3 | Verifies `passwordHash` in create, password length validation, email validation |
| Cron autopilot auth | 3 | Fail-closed without CRON_SECRET, rejects wrong GET token, rejects wrong POST secret |
| Cron auto-generate errors | 1 | Verifies internal error details not leaked to client |
| Generate content rate limit | 1 | Verifies POST export is rate-limited |
| Schema indexes | 3 | Structural verification of User, Lead, PageView indexes |
| TypeScript config | 1 | Verifies strict flags are enabled |

---

## Phase 2: Planned (Next Sprint)

### 2.1 Security Hardening

| Task | Priority | Estimated Effort | Description |
|------|----------|------------------|-------------|
| Enable `strictNullChecks` | HIGH | 3-5 days | Fix ~100+ null-related patterns across codebase |
| Enable `noImplicitAny` | HIGH | 2-3 days | Add types to ~50+ untyped parameters |
| Prompt injection defenses | HIGH | 1-2 days | Add structured prompt templates with clear delimiters to AI endpoints |
| GDPR data export/deletion | MEDIUM | 2-3 days | Implement right-to-portability and right-to-erasure endpoints |
| Session timeout | MEDIUM | 1 day | Add configurable session expiry to NextAuth config |
| Audit log viewer | MEDIUM | 1-2 days | Surface existing AuditLog data in admin settings UI |

### 2.2 Content Management

| Task | Priority | Estimated Effort | Description |
|------|----------|------------------|-------------|
| Approval workflow | HIGH | 3-5 days | Multi-step content approval with reviewer assignment |
| Content calendar view | HIGH | 2-3 days | Month/week/day calendar with drag-drop scheduling |
| Bulk operations | HIGH | 2 days | Bulk select, edit, publish, delete, tag operations |
| Content versioning UI | HIGH | 2-3 days | Version history timeline with diff view |
| Breadcrumb navigation | HIGH | 1 day | Consistent breadcrumbs across all 71+ admin pages |

### 2.3 Automation Pipeline

| Task | Priority | Estimated Effort | Description |
|------|----------|------------------|-------------|
| Email notification handler | HIGH | 2 days | Implement `subscriber_notification` background job handler |
| Plagiarism detection | HIGH | 1-2 days | Integrate plagiarism API check before auto-publishing |
| Generation queue UI | MEDIUM | 2 days | Real-time generation progress in Automation Hub |
| A/B testing publish times | MEDIUM | 2-3 days | Track engagement by publish time and optimize schedule |

### 2.4 Design Studio

| Task | Priority | Estimated Effort | Description |
|------|----------|------------------|-------------|
| Image crop/resize tools | HIGH | 2-3 days | In-canvas crop, resize, and filter tools |
| Stock image integration | HIGH | 1-2 days | Unsplash/Pexels API integration for stock photos |
| Social media presets | MEDIUM | 1 day | Instagram, Story, TikTok, Twitter dimension presets |
| Export formats | LOW | 1 day | SVG, PDF, JPEG export in addition to PNG |

---

## Phase 3: Future (Backlog)

| Task | Priority | Description |
|------|----------|-------------|
| Full `strict: true` in TypeScript | HIGH | Complete TypeScript strict mode migration |
| Consolidate auth system | HIGH | Merge remaining auth-related file duplications |
| Consolidate duplicate dashboards | MEDIUM | Choose single dashboard component, remove duplicates |
| Consolidate Prisma client files | MEDIUM | Single `@/lib/db` entry point |
| Row-level security (RLS) | MEDIUM | PostgreSQL RLS policies for tenant isolation |
| Dark mode implementation | MEDIUM | Apply `dark:` variant classes throughout admin UI |
| Content syndication | MEDIUM | Cross-site content sharing |
| 2FA support | LOW | TOTP-based two-factor authentication |
| Custom font uploads | LOW | Support .woff2/.ttf font uploads in Design Studio |

---

## Files Modified in This Implementation

| File | Changes |
|------|---------|
| `app/api/signup/route.ts` | Save `passwordHash`, add email validation, enforce 12-char minimum |
| `app/api/cron/autopilot/route.ts` | Fail-closed auth, timing-safe comparison, hide error details |
| `app/api/cron/auto-generate/route.ts` | Timing-safe comparison, hide error details from client |
| `app/api/generate-content/route.ts` | Add rate limiting (2 req/min), fix streaming return type |
| `.github/workflows/ci.yml` | Improve NEXTAUTH_SECRET fallback unpredictability |
| `prisma/schema.prisma` | Add indexes on User(role, isActive, createdAt), Lead(email), PageView(site_id, path) |
| `tsconfig.json` | Enable 5 incremental strict flags |
| `app/components/admin/mobile-media-uploader.tsx` | Fix useState→useEffect, explicit return |
| `components/admin/async-action-toast.tsx` | Add explicit return path |
| `components/marketing/exit-intent-popup.tsx` | Add explicit return path |
| `components/marketing/social-proof.tsx` | Add explicit return path |
| `components/seo/breadcrumbs.tsx` | Add explicit return path |
| `components/seo/structured-content.tsx` | Add explicit return path |
| `components/ui/carousel.tsx` | Add explicit return path |
| `lib/seo/advanced-analytics.ts` | Add explicit return paths (4 functions) |
| `test/security/audit-fixes.spec.ts` | **NEW** — 17 comprehensive tests for all fixes |

---

## Verification

- **TypeScript compilation:** Zero errors (`npx tsc --noEmit`)
- **New test suite:** 17/17 passing (`npx vitest run test/security/audit-fixes.spec.ts`)
- **Existing tests:** No regressions (pre-existing failures in smoke tests due to missing `node-mocks-http` dependency are unrelated)

---

## References

- `AUDIT-REPORT.md` — Full project audit (2026-02-07)
- `AUDIT_REPORT.md` — CMS & admin dashboard audit (2026-02-10)
- `docs/security-review-checklist.md` — OWASP compliance checklist
- `docs/security-monitoring-setup.md` — Monitoring & alerting guide
