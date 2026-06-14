# Phase 7: Content Generation Consistency & Resilience Audit
> **Date:** 2026-04-04 | **Auditor:** Claude Platform Health Audit | **Branch:** `claude/platform-health-audit-6jxH8`

---

## Executive Summary

**Overall Score: 87/100 (A-)**

The content generation pipeline is the platform's strongest subsystem. The 8-phase pipeline with centralized constants, multi-layered recovery (circuit breaker → last-defense → raw fallback), diagnostic agent every 2h, and formal state machine transitions make this a production-grade autonomous content engine. Minor gaps: Gemini provider frozen (reduces fallback chain), diagnostic agent 2h delay can leave stuck drafts waiting, and slug artifacts are WARNING not BLOCKER in pre-pub gate.

| Dimension | Score | Grade | Summary |
|-----------|-------|-------|---------|
| Pipeline Architecture | 95/100 | A+ | 8-phase with centralized constants, formal state machine, atomic claiming |
| AI Provider Resilience | 85/100 | A- | Circuit breaker + last-defense; Gemini frozen, Perplexity exhausted |
| Recovery Systems | 90/100 | A | Diagnostic agent (2h), sweeper, failure hooks, queue monitor (6 rules) |
| Quality Gates | 85/100 | A- | 20-check pre-pub gate; slug artifacts WARNING-only |
| Content Velocity | 80/100 | B+ | Target 4/day achievable; reservoir overflow occasional |
| Observability | 90/100 | A | CronJobLog, ApiUsageLog, trace_id, enhancement_log, CEO Inbox |

---

## Detailed Findings

### 1. Pipeline Architecture (95/100)

**8-Phase Pipeline:**
```
research → outline → drafting → assembly → images → seo → scoring → reservoir
```

**Strengths (All Excellent):**

| Feature | Status | Evidence |
|---------|--------|---------|
| Centralized constants | ✅ | `lib/content-pipeline/constants.ts` — single source of truth for ALL retry caps, budgets |
| Formal state machine | ✅ | `VALID_TRANSITIONS` map validates every `current_phase` update |
| Atomic claiming | ✅ | `updateMany` with current_phase in WHERE prevents duplicate processing |
| Optimistic concurrency | ✅ | `optimisticBlogPostUpdate()` on all 24 BlogPost update calls |
| Enhancement ownership | ✅ | `ENHANCEMENT_OWNERS` manifest — each modification type has one owning cron |
| Per-article trace ID | ✅ | `trace_id` flows ArticleDraft → BlogPost → CronJobLog → URLIndexingStatus |
| Source pipeline tracking | ✅ | `source_pipeline` field distinguishes 8-phase vs legacy-direct |
| Bilingual pair creation | ✅ | EN+AR drafts created in `$transaction` with 30s timeout |

**Phase Attempt Limits (from `constants.ts`):**

| Phase | Max Attempts | Notes |
|-------|-------------|-------|
| research | 3 | Light AI call |
| outline | 3 | Light AI call |
| drafting | 8 | Multi-section, needs multiple cron runs |
| assembly | 5 | Raw HTML fallback at attempt ≥2 |
| images | 3 | No AI call (Unsplash API) |
| seo | 3 | No AI call (metadata generation) |
| scoring | 3 | No AI call (formula-based) |

### 2. AI Provider Resilience (85/100)

**Provider Chain:** Grok (xAI) → Claude → OpenAI → Perplexity

| Provider | Status | Circuit Breaker | Notes |
|----------|--------|-----------------|-------|
| Grok (xAI) | ACTIVE | ✅ 3 failures / 5min cooldown | Primary for content generation |
| Claude (Anthropic) | ACTIVE | ✅ 3 failures / 5min cooldown | Secondary fallback |
| OpenAI | DEGRADED | ✅ + quotaExhausted flag (5min) | Quota issues — key may need removal |
| Perplexity | EXHAUSTED | ✅ 3 failures / 5min cooldown | Quota exhausted |
| Gemini | FROZEN | N/A | Account billing issue |

**Budget Allocation:**
- First provider: 50% of budget (was 65%, fixed March 17)
- Each subsequent fallback: proportional share of remaining
- Minimum floor: `Math.max(500, remaining - 500)` prevents negative timeouts
- Phase-aware hints: light (45%), medium (50%), heavy (55%)

**Last-Defense Fallback (`lib/ai/last-defense.ts`):**
- Activates when normal pipeline fails 2+ times
- Probes ALL providers including disabled ones
- Phase-specific defense: combined research+outline, condensed single-prompt drafting
- Assembly always succeeds (raw HTML concatenation)

### 3. Recovery Systems (90/100)

**4-Layer Recovery:**

| Layer | Component | Frequency | What It Does |
|-------|-----------|-----------|-------------|
| L1 | Failure Hooks | On failure | Immediate retry logic, attempt increment, CEO Inbox notification |
| L2 | Diagnostic Agent | Every 2h | 3-phase: Diagnose → Fix → Verify. Classifies root cause, auto-repairs |
| L3 | Sweeper | On demand | Cleans stuck drafts, resets phases, removes zombie markers |
| L4 | Queue Monitor | On demand | 6 health rules with auto-fix (near-max-attempts, stuck-24h, drafting-backlog, assembly-stuck, diagnostic-stuck, pipeline-stalled) |

**Gap:** Diagnostic agent runs every 2h — a draft stuck at 1:01 AM waits until 3:00 AM for diagnosis. During this window, the draft consumes one of the 2-active-draft-per-site slots.

**Lifetime Recovery Cap:** 5 total attempts across ALL recovery systems. After 5, draft is permanently rejected with `MAX_RECOVERIES_EXCEEDED`.

### 4. Quality Gates (85/100)

**Pre-Publication Gate (20 checks):**

| # | Check | Severity | Status |
|---|-------|----------|--------|
| 1-2 | Route existence (EN + AR) | Blocker | ✅ Working |
| 3 | SEO minimums (title, meta, description) | Blocker | ✅ Working |
| 4 | SEO score (<30 blocks, <40 warns) | Blocker/Warning | ✅ Working |
| 5 | Heading hierarchy | Warning | ✅ Working |
| 6 | Word count (500 blocker, 1200 target) | Blocker | ✅ Working |
| 7 | Internal links (3 minimum) | Warning | ✅ Working |
| 8 | Readability (Flesch-Kincaid ≤12) | Warning | ✅ Working |
| 9 | Image alt text | Warning | ✅ Working |
| 10 | Author attribution (E-E-A-T) | Warning | ✅ Working |
| 11 | Structured data presence | Warning | ✅ Working |
| 12 | Authenticity signals | Warning | ✅ Too permissive |
| 13 | Affiliate links | Warning | ✅ Working |
| 14 | AIO readiness | Warning | ✅ Working |
| 15 | Internal link ratio | Warning | ✅ Working |
| 16 | Citability / GEO | Warning | ✅ Working |
| 17-20 | Content-type specific checks | Various | ✅ Working |

**Per-Content-Type Thresholds:**

| Type | Min Words | Quality Gate | SEO Blocker |
|------|-----------|-------------|-------------|
| blog | 500 | 40 | 30 |
| news | 150 | 40 | 15 |
| information | 300 | 50 | 20 |
| guide | 400 | 50 | 25 |

**Gap:** Slug artifacts (e.g., "EXPAND: halal-restaurants-london-luxury-2024-guide") are WARNING-only in pre-pub gate. Title sanitization via `cleanTitle()` catches most, but edge cases can slip through.

### 5. Content Velocity (80/100)

**Target:** 4 articles/day (2 EN + 2 AR)

**Pipeline Flow:**
```
schedule-executor (every 2h) → creates 2 drafts (1 EN + 1 AR)
content-builder (every 15 min) → advances through 8 phases
content-selector (4x/day) → promotes top 2 from reservoir
scheduled-publish (2x/day) → publishes + auto-publishes orphans
seo-agent (3x/day) → IndexNow + schema + meta
```

**Bottleneck:** Reservoir overflow — pipeline produces faster than content-selector publishes. When reservoir exceeds 50, all creation crons block. Mitigated by:
- 7-day reservoir age-out (diagnostic agent Phase 0e)
- Force-publish fallback (content-selector publishes best candidate when all blocked by keyword overlap)
- Cannibalization threshold at 0.85 Jaccard (not too aggressive)

### 6. Observability (90/100)

| Tracking System | Coverage | Notes |
|----------------|----------|-------|
| CronJobLog | 100% of crons | Status, duration, items processed, errors |
| ApiUsageLog | 100% of AI calls | Provider, model, tokens, cost, task, caller |
| trace_id | 100% of drafts | ArticleDraft → BlogPost lifecycle |
| enhancement_log | 100% of BlogPost modifications | Type, cron, timestamp, summary (capped at 50) |
| CEO Inbox | 43+ crons | Auto-fix strategies, delayed retest, daily alert cap (10) |
| Queue Monitor | 6 health rules | Snapshot API with recommended actions |

---

## Top Issues (Ranked by Impact)

| # | Issue | Severity | Impact | Fix Effort |
|---|-------|----------|--------|------------|
| 1 | Gemini + Perplexity providers frozen/exhausted | MEDIUM | Reduced fallback chain (2 active vs 4) | LOW (reactivate when billing resolved) |
| 2 | Diagnostic agent 2h gap | MEDIUM | Stuck drafts wait up to 2h | MEDIUM (reduce to 1h or add lightweight check) |
| 3 | Slug artifacts WARNING-only | LOW | Edge cases reach production | LOW (promote to BLOCKER) |
| 4 | Assembly raw fallback content quality | LOW | Raw HTML concatenation produces lower-quality articles | MEDIUM (post-publish enhancement covers this) |
| 5 | Phase attempt budgets underpowered for images/SEO | LOW | Light phases occasionally timeout | LOW (already have +20 priority boost) |

---

## Recommendations

### Immediate (This Week)
1. Reactivate Gemini provider when billing resolved (restores 4-provider fallback chain)
2. Promote slug artifact check to BLOCKER in pre-pub gate

### Short-Term (30 Days)
3. Reduce diagnostic agent frequency from 2h to 1h
4. Add lightweight "stuck draft" check to content-builder-create (check before creating new)
5. Monitor reservoir overflow patterns — adjust content-selector publish rate if needed

### Medium-Term (90 Days)
6. Build content quality comparison: 8-phase vs legacy-direct vs raw-fallback articles
7. Add AI content quality scoring (beyond formula-based SEO score)
