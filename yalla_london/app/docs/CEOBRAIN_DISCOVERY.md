# CEO Brain — Codebase Discovery Report

**Date:** March 27, 2026
**Author:** Claude Code (CTO Agent prototype)
**Purpose:** Document existing infrastructure that the CEO + CTO Agent Platform integrates with.

---

## 1. Existing Agent Systems (5 registered)

| Agent | Domain | Status | File |
|-------|--------|--------|------|
| SEO Orchestrator | SEO & search rankings | Active | `lib/seo/orchestrator/` |
| Content Engine | Content lifecycle | Active | `lib/content-engine/` |
| Diagnostic Agent | Pipeline health | Active | `lib/ops/diagnostic-agent.ts` |
| CEO Intelligence Engine | Business metrics | Active | `lib/ceo-engine/intelligence.ts` |
| CEO Inbox | Incident response | Active | `lib/ops/ceo-inbox.ts` |

**What the new agents ADD:**
- CEO Agent: bidirectional customer communication, CRM pipeline management, WhatsApp integration
- CTO Agent: autonomous code quality, browsing, QA, maintenance loop

---

## 2. Existing CRM Models

### Lead (`leads` table)
- Fields: `id`, `site_id`, `email`, `name`, `phone`, `lead_type` (enum), `lead_source`, `interests_json`, `budget_range`, `travel_dates`, `party_size`, UTM fields, `score`, `score_factors`, `status` (enum), `assigned_to`, `value`, `marketing_consent`, `consent_ip`, `consent_at`
- Relations: `LeadActivity[]`
- Indexes: `[site_id, email]` unique, `[email]`, `[site_id, created_at]`, `[lead_type]`, `[status]`, `[score]`

### Subscriber
- Fields: `id`, `site_id`, `email`, `first_name`, `last_name`, `status` (enum: PENDING/CONFIRMED/UNSUBSCRIBED/BOUNCED/COMPLAINED), `source`, `preferences_json`, `metadata_json`, double-optin fields, `unsubscribed_at`, `engagement_score`
- Relations: `ConsentLog[]`
- Indexes: `[site_id, email]` unique, `[site_id]`, `[status]`, `[source]`

### CharterInquiry (`charter_inquiries` table)
- Fields: `id`, `referenceNumber`, `firstName`, `lastName`, `email`, `phone`, `whatsappNumber`, `destination`, `preferredDates` (Json), `guestCount`, `childrenCount`, `budget` (Decimal), `budgetCurrency`, `yachtTypePreference` (enum), `preferences` (Json), `experienceLevel`, `languagePreference`, `contactPreference`, `message`, `status` (enum: NEW/CONTACTED/QUALIFIED/SENT_TO_BROKER/BOOKED/LOST), `brokerAssigned`, `brokerNotes`, UTM fields, `yachtId`, `siteId`
- Relations: `Yacht?`

### ConsentLog
- Fields: `id`, `site_id`, `subscriber_id`, `consent_type`, `consent_version`, `action`, `legal_basis`, `processing_purposes[]`, `data_categories[]`, `consent_text`, `ip_address`, `user_agent`, `timestamp`
- Relations: `Subscriber` (cascade delete)

**What's MISSING (new models fill):**
- No `Conversation` or `Message` model for multi-message threads
- No `CrmOpportunity` for sales pipeline stages
- No `InteractionLog` for unified contact timeline
- No `RetentionSequence`/`RetentionProgress` for email automation
- No `FinanceEvent` for Stripe/Mercury webhook processing
- No `AgentTask` for CEO/CTO task tracking

---

## 3. AI Provider System

**File:** `lib/ai/provider.ts`

**Key function:** `generateCompletion(prompt, systemPrompt?, options?)` → `AICompletionResult`

**Providers (priority order):** Grok → OpenAI → Claude → Perplexity

**Features:**
- Circuit breaker (3 consecutive failures → open for 30s, quota exhaustion → 5min)
- Cost tracking to `ApiUsageLog` with per-task attribution
- Budget-aware: first provider gets 50% of budget, rest shared
- Task-type routing via `ModelRoute` DB table

**Integration point:** CEO Brain will call `generateCompletion()` for intent classification, response generation, and summarization with `taskType: "agent-ceo"` and `calledFrom: "ceo-brain"`.

---

## 4. Email System

**File:** `lib/email/resend-service.ts`

**Key functions:**
- `sendResendEmail(options)` — low-level Resend SDK
- `sendWelcomeEmail(to, name, locale, siteId?)` — React Email template
- `sendBookingConfirmation(to, booking, siteId?)`
- `sendNewsletterDigest(to[], articles[], locale, siteId?)`
- `sendContactConfirmation(to, inquiry, siteId?)`

**Integration point:** CEO Agent email channel adapter wraps these. Retention engine calls `sendResendEmail()` directly for sequence emails.

---

## 5. Cron Infrastructure

**40+ cron jobs** scheduled in `vercel.json`, all with:
- `withCronLog` wrapper for execution logging
- `checkCronEnabled(jobName)` feature flag guard
- Budget guards (53s standard, 280s for heavy jobs)
- `onCronFailure()` hook → CEO Inbox auto-fix

**New crons needed:**
- `agent-maintenance` — weekly CTO maintenance loop
- `retention-executor` — processes due retention emails

---

## 6. Affiliate System

**Files:** `lib/affiliate/*.ts`

- CJ integration (deep links, SID tracking, commission sync)
- Travelpayouts (Welcome Pickups, Tiqets, TicketNetwork)
- Stay22 (hotel map auto-monetization)
- Per-article revenue attribution via `CjClickEvent`

**Integration point:** CEO Agent `get_affiliate_status` tool wraps `monitor.ts`.

---

## 7. Design System

**File:** `lib/design/brand-provider.ts`

- `getBrandProfile(siteId)` → unified brand data for all 6 sites
- Colors, typography, logos, social templates
- PDF covers via `app/api/admin/pdf-covers/route.tsx`
- Canva video registry: 433 clips in `lib/canva/video-registry.ts`

**Integration point:** CEO Agent `get_design_assets` tool wraps brand provider.

---

## 8. Finance System

**Files:** `lib/billing/stripe.ts`

- Stripe integration for subscriptions and checkout
- No Mercury API integration yet (manual/dashboard only)

**Integration point:** New `FinanceEvent` model logs Stripe webhooks. CEO Agent processes them (receipts, dispute escalation).

---

## 9. MCP Servers (2)

| Server | File | Tools |
|--------|------|-------|
| Google | `scripts/mcp-google-server.ts` | `ga4_get_metrics`, `gsc_get_search_performance`, `gsc_inspect_url`, etc. |
| CJ | `scripts/mcp-cj-server.ts` | `cj_get_advertisers`, `cj_get_revenue`, `cj_get_content_coverage`, etc. |

**Integration point:** CEO Agent tools call these directly (same Node process, no MCP protocol needed).

---

## 10. Key Configuration

**Site config:** `config/sites.ts` — `SITES` object with 6 sites, each with brand, prompts, keywords, affiliate categories

**Entity config:** `config/entity.ts` — Zenitha.Luxury LLC legal entity details

**Constants:** `lib/content-pipeline/constants.ts` — single source of truth for retry caps, budgets, thresholds

---

## Architecture Principle

**The new agent platform does NOT replace any existing system.** It wraps them:

```
Existing Systems (unchanged)
├── lib/ai/provider.ts        → CEO/CTO call generateCompletion()
├── lib/email/resend-service.ts → Email channel adapter wraps this
├── lib/affiliate/monitor.ts   → CEO tool wraps getRevenueReport()
├── lib/seo/orchestrator/      → CTO tool wraps audit functions
├── lib/ops/ceo-inbox.ts       → Agent failures route through existing inbox
├── lib/ceo-engine/             → CEO tool wraps intelligence.ts
└── config/sites.ts             → Agents read site config, never write it

New Agent Layer (additive)
├── lib/agents/types.ts         → All interfaces
├── lib/agents/ceo-brain.ts     → Event → AI → Tools → Response
├── lib/agents/cto-brain.ts     → Scan → Browse → Propose → Execute → Report
├── lib/agents/event-router.ts  → Normalize any channel to CEOEvent
├── lib/agents/tool-registry.ts → Unified tool definitions
├── lib/agents/safety.ts        → Guardrails, approval gates
├── lib/agents/channels/        → WhatsApp, email, web, internal adapters
├── lib/agents/tools/           → Wrappers around existing lib/ functions
└── lib/agents/crm/             → Contact resolver, lead scoring, retention
```
