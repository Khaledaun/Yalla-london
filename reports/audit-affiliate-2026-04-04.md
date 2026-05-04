# Phase 3: Affiliate Management System Audit
> **Date:** 2026-04-04 | **Auditor:** Claude Platform Health Audit | **Branch:** `claude/platform-health-audit-6jxH8`

---

## Executive Summary

**Overall Score: 78/100 (B+)**

The affiliate system has an excellent multi-network architecture (CJ + Travelpayouts + Stay22) with per-site isolation, atomic SID attribution, and a comprehensive 6-tab command center. However, FTC disclosure visibility gaps on category pages, missing circuit breaker alerting, and incomplete Travelpayouts injection tracking create operational blind spots.

| Dimension | Score | Grade | Summary |
|-----------|-------|-------|---------|
| Architecture | 20/20 | A+ | Multi-network, per-site, atomic attribution |
| API Integration | 18/20 | A- | CJ strong, Travelpayouts stacked well; missing coverage detection for client-side |
| Click Tracking | 18/20 | A- | DB + GA4 dual tracking, SID extraction solid; injection failure unmeasured |
| FTC Compliance | 12/15 | B | Disclosure component exists; missing on category page layouts |
| Monitoring | 10/15 | C+ | Coverage report exists; circuit breaker unalerted |
| Data Quality | 10/10 | A+ | All dashboard data real, zero mocks |

---

## Detailed Findings

### 1. Affiliate Network Stack

| Network | Status | Programs | Revenue Model |
|---------|--------|----------|---------------|
| **CJ Affiliate** | ACTIVE | Vrbo (approved), 56 synced | Deep links + SID tracking |
| **Travelpayouts** | ACTIVE | Welcome Pickups (8-9%), Tiqets (3.5-8%), TicketNetwork (6-12.5%) | Marker-based |
| **Stay22** | ACTIVE | Auto-monetization | LetMeAllez script (30%+ rev share) |

**Architecture Strengths:**
- Per-site keyword rules for all 6 configured sites
- CJ circuit breaker (3 failures, 5-min cooldown, half-open probe)
- SID attribution format: `{siteId}_{articleSlug}` (max 100 chars)
- Deep link generation without API calls: `anrdoezrs.net/links/{publisherCid}/type/dlg/sid/{sid}/https://{advertiserUrl}`
- Rule priority: DB rules > CJ rules > Travelpayouts > static fallback

### 2. Click Tracking Pipeline

```
User clicks affiliate link → analytics-tracker fires gtag event
    → GET /api/affiliate/click?id=X&sid=siteId_slug&ga_cid=gaClientId
    → Server: AuditLog.create (device, country, article, partner)
    → Server: GA4 Measurement Protocol event (fire-and-forget)
    → Server: 302 redirect to affiliate URL with SID
```

**Strengths:**
- Dual client-side + server-side tracking (server always works even with ad blockers)
- GA4 Measurement Protocol with `engagement_time_msec: 100` (required for standard reports)
- `ga_cid` passthrough for client ID attribution

**Gap:** Direct URL clicks (no CjLink record) tracked via AuditLog instead of CjClickEvent — revenue attribution may be less precise for non-CJ networks.

### 3. Coverage Detection

**Current Patterns Detected:**
- `rel="sponsored"` / `rel="noopener sponsored"`
- `class="affiliate-cta-block"` / `class="affiliate-recommendation"`
- `data-affiliate-id` / `data-affiliate-partner`
- `/api/affiliate/click` URL pattern

**Gap:** Client-side injections by Stay22 LetMeAllez and Travelpayouts Drive scripts are NOT detected by server-side coverage queries. Coverage may under-report by 10-20%.

### 4. FTC Compliance

**What Exists:**
- `<AffiliateDisclosure>` component with bilingual text
- Disclosure on blog post pages (embedded in article layout)
- `rel="sponsored"` on all CJ-injected links

**Critical Finding:** Category page layouts (`/hotels`, `/experiences`, `/recommendations`, `/events`) do NOT include the `<AffiliateDisclosure>` component despite containing affiliate links via Stay22 auto-monetization and static fallback rules.

### 5. Revenue Attribution

| Component | Status | Notes |
|-----------|--------|-------|
| SID on CjClickEvent | Working | Parsed from `sessionId` field |
| SID on CjCommission | Working | Parsed from `rec.sid` in commission sync |
| siteId on CjCommission | Working | Extracted from SID prefix |
| GA4 affiliate_click event | Working | Server-side Measurement Protocol |
| Per-article revenue rollup | Working | Affiliate HQ Revenue tab |

### 6. Circuit Breaker & Resilience

| Component | Threshold | Cooldown | Alert |
|-----------|-----------|----------|-------|
| CJ API | 3 consecutive failures | 5 min | **NONE** |
| AI providers | 3 consecutive failures | 5 min | CEO Inbox |
| Resend email | **NONE** | N/A | **NONE** |

**Critical Finding:** CJ API circuit breaker opens silently — no CEO Inbox alert, no dashboard indicator. CJ failures cascade to zero affiliate injection until cooldown expires.

---

## Top Issues (Ranked by Impact)

| # | Issue | Severity | Impact | Fix Effort |
|---|-------|----------|--------|------------|
| 1 | FTC disclosure missing on category pages | HIGH | FTC violation risk | LOW |
| 2 | Circuit breaker opens without alert | HIGH | Silent revenue loss | LOW |
| 3 | Travelpayouts injection not tracked in metadata | MEDIUM | Unmeasured injection failures | MEDIUM |
| 4 | Client-side injection coverage detection gap | MEDIUM | Coverage under-reported 10-20% | MEDIUM |
| 5 | Incomplete advertiser coverage (50% may have zero outbound URLs) | MEDIUM | Revenue leakage | MEDIUM |
| 6 | Product Search API deprecated (CJ GraphQL migration pending) | LOW | Graceful degradation active | LOW |

---

## Security Assessment

| Component | Risk | Mitigation | Status |
|-----------|------|-----------|--------|
| Click endpoint | Open redirect | URL validation + whitelist | Secure |
| SID parameter | Injection | Max 100 chars, no special chars | Safe |
| GA4 Measurement Protocol | Silent failure | Fire-and-forget | OK |
| CJ API token | Exposure | Env var only, never logged | Secure |
| Rate limiter | Bypass | Singleton, no user override | Enforced |

---

## Recommendations

### Immediate (This Week)
1. Add `<AffiliateDisclosure>` to category page layouts (`/hotels`, `/experiences`, `/recommendations`, `/events`)
2. Implement circuit breaker alerting via CEO Inbox
3. Add Travelpayouts injection tracking to metadata

### Short-Term (30 Days)
4. Measure link injection success rate per cron run
5. Auto-generate deep links in `syncLinks()` for zero-link advertisers
6. Add fallback Vrbo deep link to articles with 0 injected links

### Long-Term (90 Days)
7. Monitor CJ GraphQL migration for product search
8. Consider AWIN for supplemental network diversification
9. Build historical revenue trends (per advertiser, per site, per category)
