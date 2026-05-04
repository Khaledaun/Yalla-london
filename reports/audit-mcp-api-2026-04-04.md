# Phase 10: MCP Orchestration & API Health Audit
> **Date:** 2026-04-04 | **Auditor:** Claude Platform Health Audit | **Branch:** `claude/platform-health-audit-6jxH8`

---

## Executive Summary

**Overall Score: 78/100 (B+)**

The platform has a well-architected integration layer with 3 MCP servers, 22 external service connections, and circuit breakers on critical paths. AI provider resilience is excellent with the circuit breaker + last-defense fallback pattern. However, Resend email has no circuit breaker (a single outage causes silent email loss), rate limiting is per-instance only (resets on Vercel cold start), and there is no API key rotation policy for the 15+ external service credentials.

| Dimension | Score | Grade | Summary |
|-----------|-------|-------|---------|
| MCP Server Configuration | 85/100 | A- | 3 servers configured, dotenv integration, tool coverage good |
| External Service Health | 80/100 | B+ | 19/22 ACTIVE, 2 STALE, 1 DEGRADED |
| Circuit Breakers | 85/100 | A- | AI providers + CJ excellent; Resend missing |
| Rate Limiting | 65/100 | C+ | In-memory only, resets on cold start |
| Error Handling | 80/100 | B+ | 712+ catch blocks all have logging; CEO Inbox for critical paths |
| Key Management | 60/100 | C | No rotation policy, no expiry monitoring |

---

## Detailed Findings

### 1. MCP Server Configuration (85/100)

| MCP Server | Status | Tools | Notes |
|------------|--------|-------|-------|
| Google Analytics/GSC | ACTIVE | 8 tools (ga4_get_metrics, gsc_get_search_performance, etc.) | Dotenv integration for standalone mode |
| CJ Affiliate | ACTIVE | 7 tools (cj_get_advertisers, cj_get_revenue, etc.) | Circuit breaker integrated |
| Platform Control | ACTIVE | Various admin operations | Internal platform management |

**Strengths:**
- All 3 servers configured in `.claude/settings.json`
- Google MCP: dotenv loading with 4-path fallback for credential discovery
- CJ MCP: follows same pattern as Google MCP
- All servers accessible via Claude Code sessions

**Gap:** No health check endpoint for MCP servers themselves — if a server crashes, detection is manual.

### 2. External Service Health (80/100)

| # | Service | Status | Circuit Breaker | Rate Limit |
|---|---------|--------|----------------|------------|
| 1 | Supabase + Prisma | ACTIVE | ✅ $connect() retry | Connection pool (60) |
| 2 | Vercel (Pro) | ACTIVE | N/A (hosting) | N/A |
| 3 | Resend | ACTIVE | ❌ Missing | 100/day free tier |
| 4 | SendGrid | AVAILABLE | ❌ Missing | N/A (fallback) |
| 5 | Stripe | ACTIVE | N/A | Standard API limits |
| 6 | GA4 | ACTIVE | N/A | Quota-based |
| 7 | Google Search Console | ACTIVE | N/A | Quota-based |
| 8 | xAI Grok | ACTIVE | ✅ 3-failure/5min | Budget-based per call |
| 9 | Anthropic Claude | ACTIVE | ✅ 3-failure/5min | Budget-based per call |
| 10 | OpenAI | DEGRADED | ✅ + quotaExhausted | Quota issues |
| 11 | Perplexity | EXHAUSTED | ✅ 3-failure/5min | Quota exhausted |
| 12 | CJ Affiliate | ACTIVE | ✅ 3-failure/5min | 25 req/min |
| 13 | Travelpayouts | ACTIVE | N/A | Marker-based (no API calls) |
| 14 | Stay22 | ACTIVE | N/A | Client-side script |
| 15 | Unsplash | ACTIVE | N/A | 50 req/hr free tier |
| 16 | Ticketmaster | ACTIVE | N/A | 5000/day |
| 17 | IndexNow (3 engines) | ACTIVE | Exponential backoff | Batch POST |
| 18 | Frankfurter | ACTIVE | N/A | Free, no key |
| 19 | Open-Meteo | ACTIVE | N/A | Free, no key |
| 20 | Sentry | ACTIVE | N/A | Event-based |
| 21 | Gemini | STALE | N/A (frozen) | Account frozen |
| 22 | Mercury | STALE | N/A (stub) | Not integrated |

### 3. Circuit Breaker Analysis (85/100)

**AI Provider Circuit Breakers (Excellent):**
```
State Machine: CLOSED → OPEN (after 3 failures) → HALF_OPEN (after 5min) → CLOSED (on success)
Special: quotaExhausted flag → 5min cooldown (not 30s) for billing/quota errors
```

| Component | Threshold | Cooldown | Alert | Status |
|-----------|-----------|----------|-------|--------|
| AI Providers (each) | 3 consecutive failures | 5 min (normal), 5 min (quota) | CEO Inbox | ✅ Excellent |
| CJ API | 3 consecutive failures | 5 min | ❌ None → CEO Inbox | ✅ Good (alert added March 10) |
| Supabase | Connection retry | 500ms backoff × 3 | Console | ✅ Good |
| Resend Email | ❌ None | N/A | ❌ None | ❌ Missing |
| IndexNow | Exponential backoff | Per-engine | Console | ✅ Adequate |

**Critical Gap:** Resend email has no circuit breaker. If Resend goes down:
- CEO Inbox failure alerts silently fail (no email sent)
- Welcome emails to subscribers silently fail
- Booking confirmations silently fail
- No fallback to SendGrid (code exists but not wired to circuit breaker)

### 4. Rate Limiting (65/100)

**Implementation:** `lib/rate-limit.ts` — in-memory sliding window counters.

| Tier | Limit | Scope |
|------|-------|-------|
| Auth | 10/min | Login + admin mutations |
| Heavy | 2/min | AI generation, bulk operations |
| Mutation | 20/min | Standard write operations |
| Read | 100/min | Standard read operations |

**Critical Gap:** Counters are per-instance (in-memory `Map`). On Vercel serverless:
- Each cold start gets fresh counters (zero state)
- Concurrent function instances each have independent counters
- An attacker can bypass rate limiting by hitting different instances
- No shared state (Redis, DB, or Vercel KV) for cross-instance coordination

**Recommendation:** Move to Vercel KV (free tier: 30K requests/day) or Upstash Redis for cross-instance rate limiting.

### 5. Error Handling (80/100)

**Strengths:**
- 712+ catch blocks across codebase — ALL have descriptive logging (zero empty catches)
- CEO Inbox: 43+ cron-to-fix-strategy mappings in `JOB_FIX_MAP`
- Error interpretation: 17 raw error patterns → plain English + fix suggestion
- `onCronFailure()` fires on every cron error (never blocks the failure response)

**Pattern:**
```
Cron fails → onCronFailure() → CEO Inbox → interpretError() + autoFix() → delayed retest (2min) → email notification
```

**Gap:** Non-cron API route errors (e.g., admin actions, webhook failures) don't route to CEO Inbox — only visible in Vercel logs.

### 6. Key Management (60/100)

| Aspect | Status | Notes |
|--------|--------|-------|
| Key storage | ✅ Env vars only | Never in code, never logged |
| Key validation on startup | ❌ None | No pre-flight check that keys are valid |
| Key rotation policy | ❌ None | No documentation on rotation schedule |
| Key expiry monitoring | ❌ None | No alerts when keys approach expiration |
| Credential exposure scanning | ✅ AgentShield | Baseline B (86/100), 0 critical findings |

**15+ API keys with no rotation awareness:**
- `XAI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `PERPLEXITY_API_KEY`
- `CJ_API_TOKEN`, `TRAVELPAYOUTS_API_TOKEN`
- `RESEND_API_KEY`, `GA4_API_SECRET`
- `TICKETMASTER_API_KEY`, `UNSPLASH_ACCESS_KEY`
- `STRIPE_SECRET_KEY`, `SENTRY_DSN`
- Google service account credentials (JSON blob)

---

## Webhook Health

| Webhook | Endpoint | Status | Verification |
|---------|----------|--------|-------------|
| Stripe | `/api/webhooks/stripe-agent` | CONFIGURED | HMAC-SHA256 |
| Resend | `/api/email/webhook` | CONFIGURED | HMAC-SHA256 via svix |
| WhatsApp | `/api/webhooks/whatsapp` | NOT CONFIGURED | HMAC-SHA256 (code ready) |
| CJ Commission Sync | Cron-based | ACTIVE | API token auth |
| IndexNow | Batch POST | ACTIVE | Key verification |

---

## Top Issues (Ranked by Impact)

| # | Issue | Severity | Impact | Fix Effort |
|---|-------|----------|--------|------------|
| 1 | Resend email has no circuit breaker | HIGH | Silent email loss on outage | MEDIUM |
| 2 | Rate limiting per-instance only | HIGH | Bypassable on serverless | MEDIUM (Vercel KV) |
| 3 | No API key rotation policy | MEDIUM | Security risk over time | LOW (documentation) |
| 4 | No key validation on startup | MEDIUM | Invalid keys cause silent failures | LOW |
| 5 | OpenAI + Perplexity providers degraded | LOW | Reduced AI fallback chain | LOW (remove or replenish) |
| 6 | No MCP server health check | LOW | Manual detection of MCP crashes | LOW |

---

## Security Assessment

| Component | Risk | Mitigation | Status |
|-----------|------|-----------|--------|
| Admin routes | Auth bypass | `requireAdmin()` on all admin APIs | ✅ Secure |
| Public API info disclosure | Internal error leakage | Generic error messages on all public endpoints | ✅ Secure |
| Click endpoint | Open redirect | URL validation + pattern allowlist | ✅ Secure |
| XSS | Unsanitized HTML | `sanitizeHtml()` on all 9 dangerouslySetInnerHTML | ✅ Secure |
| CSRF | Cross-site attacks | Middleware CSRF protection | ✅ Secure |
| Webhook verification | Spoofed events | HMAC-SHA256 on Stripe + Resend | ✅ Secure |
| API keys | Code exposure | Env vars only, never logged, AgentShield scanned | ✅ Secure |
| Rate limiting | DDoS/abuse | Per-instance only (see gap above) | ⚠️ Partial |

---

## Recommendations

### Immediate (This Week)
1. Add circuit breaker to Resend email service with SendGrid automatic fallback
2. Document API key rotation schedule (quarterly for AI providers, annually for others)

### Short-Term (30 Days)
3. Migrate rate limiting to Vercel KV or Upstash Redis for cross-instance state
4. Add key validation check on app startup (verify each key returns 200/valid)
5. Remove or replenish OpenAI and Perplexity API keys

### Medium-Term (90 Days)
6. Build key expiry monitoring dashboard
7. Add MCP server health check endpoints
8. Build non-cron error routing to CEO Inbox for webhook/API failures
