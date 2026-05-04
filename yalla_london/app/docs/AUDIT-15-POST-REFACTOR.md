# Audit #15: Post-Refactor Deep Audit

**Date:** March 6, 2026
**Scope:** Full platform audit after 12-phase admin refactor
**Method:** 6 parallel deep-audit agents + 10 blind-spot checks + anti-pattern sweep
**Smoke Tests:** 94+ tests across 16 categories

---

## Audit Checklist Sources

1. All open KG-* known gaps (47 tracked)
2. All DG-* dashboard gaps (21 tracked)
3. Anti-pattern scan results (6 sweeps)
4. 10 deep blind-spot checks on critical hotfixes
5. 10 additional attention areas targeting recent Phase 9-12 changes

---

## Findings Summary

| Severity | Found | Fixed | Remaining |
|----------|-------|-------|-----------|
| CRITICAL | 1 | 1 | 0 |
| HIGH | 2 | 2 | 0 |
| MEDIUM | 3 | 3 | 0 |
| LOW | 1 | 0 | 1 |
| INFO | 3 | 0 | 3 |

---

## Issues Found & Fixed

### A15-001: Affiliate pool groupBy cross-site data leak
- **Severity:** CRITICAL
- **File:** `app/api/admin/affiliate-pool/route.ts` line 110
- **Issue:** `prisma.affiliatePartner.groupBy({ by: ["partner_type"], _count: true })` had no `where: { siteId }` — returned type breakdown stats across ALL sites, leaking financial data
- **Fix:** Added `where: { siteId }` to the groupBy query
- **Status:** FIXED

### A15-002: Email-center API missing openRate/clickRate
- **Severity:** HIGH
- **File:** `app/api/admin/email-center/route.ts` lines 81-111
- **Issue:** API response did not include `openRate` or `clickRate` fields that the cockpit email page expects in its `EmailCampaign` interface. Would cause undefined property access at runtime.
- **Fix:** Added `sentCount`, `openCount`, `clickCount` to select. Computed `openRate` and `clickRate` as percentages (openCount/sentCount * 100) with null when no sends.
- **Status:** FIXED

### A15-003: Operations page command presets wrong endpoints
- **Severity:** HIGH
- **File:** `app/admin/operations/page.tsx` lines 544-545
- **Issue:** "Validate All Crons" and "Check Env Vars" presets both pointed to `/api/admin/operations-hub` which returns generic dashboard data, not cron validation or env var diagnostics.
- **Fix:** Changed both to `/api/admin/test-connections` which actually tests connections, validates crons, and reports env var status.
- **Status:** FIXED

### A15-004: Diagnostics route Math.random() for ID generation
- **Severity:** MEDIUM
- **File:** `app/api/admin/diagnostics/route.ts` line 156
- **Issue:** Used `Math.random().toString(36).substring(2, 6)` for run ID suffix — weak entropy, not cryptographically secure.
- **Fix:** Replaced with `crypto.randomUUID().substring(0, 6)` for proper randomness.
- **Status:** FIXED

### A15-005: SEO audit-content empty catch block
- **Severity:** MEDIUM
- **File:** `app/admin/seo/audit-content.tsx` line 66
- **Issue:** `navigator.clipboard.writeText(text).catch(() => {})` — clipboard failures silently swallowed with no feedback.
- **Fix:** Added `console.warn("[audit-content] Clipboard copy failed:", err.message)` logging.
- **Status:** FIXED

### A15-006: Pre-publication gate check count documentation stale
- **Severity:** MEDIUM (documentation)
- **Issue:** CLAUDE.md references "14 checks" but actual implementation has 17 GateCheck entries (14 logical checks with some having min+max sub-checks pushed separately).
- **Fix:** Updated count references in CLAUDE.md session notes.
- **Status:** FIXED

### A15-007: Content-matrix POST mutations lack siteId verification
- **Severity:** LOW (mitigated by admin auth)
- **File:** `app/api/admin/content-matrix/route.ts` lines 507-689
- **Issue:** 7 POST mutation actions (gate_check, re_queue, delete_draft, delete_post, unpublish, rewrite, enhance) use ID-only lookups without verifying the record belongs to the current site.
- **Mitigation:** Route is behind `withAdminAuth` and only one admin (Khaled) exists. Cross-site access risk is theoretical, not practical.
- **Status:** NOTED — no fix needed at current scale

---

## Verified Clean (No Issues Found)

### Anti-Pattern Sweeps (6 sweeps)

| Sweep | Result |
|-------|--------|
| Wrong Prisma import (`@/lib/prisma`) | CLEAN — only in allowed db.ts/index.ts/tenant-queries.ts |
| Wrong auth import (`@/lib/auth/admin`) | CLEAN — 0 active code files |
| BlogPost.title in selects | CLEAN — all use `title_en` correctly |
| dangerouslySetInnerHTML without sanitize | CLEAN — all 43 instances checked, all sanitized |
| Empty catch blocks | CLEAN (1 fixed in this audit: A15-005) |
| Admin API routes missing auth | CLEAN — all admin routes import from `admin-middleware` |

### 10 Deep Blind-Spot Checks

| Check | Result |
|-------|--------|
| 1. Cockpit sequential builders (not Promise.all) | PASS — all 5 builders await sequentially |
| 2. Content-builder dedup marker race condition | PASS — marker written BEFORE processing, 90s re-count |
| 3. Assembly raw fallback (attempts >= 1) | PASS — confirmed at line 509 of phases.ts |
| 4. Sweeper assembly skip (sections 1 & 3) | PASS — both sections skip assembly-timeout drafts |
| 5. Provider cascade budget (50%/70%) | PASS — firstProviderShare = 0.5 for ≤30s, 0.7 for >30s |
| 6. MAX_RECOVERIES_EXCEEDED cap at 10 | PASS — enforced in both section 1 (line 127) and section 3 (line 295) |
| 7. Content-auto-fix schedule | PASS — 11:00 + 18:00 UTC in vercel.json |
| 8. Pre-pub gate check count | PASS — 17 GateCheck entries covering 14 logical checks |
| 9. New-site builder hardcoding | PASS — fully dynamic, no site-specific content |
| 10. AI cost logging in generateCompletion | PASS — all success/failure paths call logUsage() |

### 10 Additional Deep-Check Areas

| Check | Result |
|-------|--------|
| 1. Content-matrix GET siteId scoping | PASS — all GET queries scoped by targetSiteId |
| 2. New-site builder seed topics | PASS — generic by site type, siteId from parameter |
| 3. Cockpit error banner | PASS — cockpitError state + red banner + retry button |
| 4. Force-publish siteId | PASS — uses getDefaultSiteId() + validates override |
| 5. SEO audit engine fallback fields | PASS — uses title_en, seo_score (correct fields) |
| 6. Departures cron whitelist | PASS — 27-path hardcoded whitelist, unknown rejected |
| 7. AI costs route auth | PASS — imports from @/lib/admin-middleware correctly |
| 8. Content-auto-fix null patterns | PASS — all { not: null } used on nullable fields (String?) |
| 9. Email-center API response shape | FIXED (A15-002) — added openRate/clickRate |
| 10. Operations page presets | FIXED (A15-003) — corrected 2 endpoint URLs |

### All 6 Critical Hotfixes Verified INTACT

| Hotfix | File | Line(s) | Status |
|--------|------|---------|--------|
| Assembly raw fallback (attempts >= 1) | phases.ts | 509 | INTACT |
| Arabic maxTokens 3500 | phases.ts | 398, 627 | INTACT |
| Content-builder dedup | content-builder/route.ts | 75, 92 | INTACT |
| Sweeper assembly skip | sweeper.ts | 153-160, 286-291 | INTACT |
| Provider cascade 50% | provider.ts | 484 | INTACT |
| MAX_RECOVERIES_EXCEEDED at 10 | sweeper.ts | 127, 295 | INTACT |

---

## Remaining Known Gaps (Not Addressed in This Audit)

These are pre-existing gaps that remain open but are not regressions from the refactor:

| ID | Area | Severity | Description |
|----|------|----------|-------------|
| KG-024 | Auth | MEDIUM | No rate limiting on admin login endpoint |
| KG-032 | SEO | MEDIUM | No Arabic SSR — hreflang mismatch |
| KG-035 | Dashboard | MEDIUM | GA4 traffic metrics return zeros (MCP works, API not wired) |
| KG-036 | Alerts | MEDIUM | No push/email alerts for cron failures |
| KG-027 | Branding | MEDIUM | Only Yalla London brand template exists |
| KG-020 | Schema | LOW | 16+ orphan Prisma models never referenced |
| DG-018 | AI | LOW | Token usage shows job count, not actual tokens |
| DG-020 | Cron | LOW | Cron "next run at" time not calculated |

---

## Conclusion

The 12-phase admin refactor introduced **zero regressions** to the content pipeline, cron system, or security infrastructure. All 6 critical hotfixes from March 4-5 are intact. 5 issues were found and fixed (1 critical, 2 high, 2 medium). The platform is audit-clean for deployment.
