# Kapso + Post Bridge Integration — Discovery Report

**Date:** March 28, 2026
**Branch:** `claude/integrate-kapso-bridge-IC9I8`
**Status:** Discovery complete — ready for planning phase

---

## 1. Executive Summary

This document captures the full discovery audit of the Yalla London platform in preparation for integrating **Kapso** (WhatsApp Business API provider) and **Post Bridge** (social media scheduling/posting API).

**Key finding:** The platform already has a production-grade WhatsApp integration using direct Meta Cloud API calls. Kapso provides a typed TypeScript SDK (`@kapso/whatsapp-cloud-api`) that wraps the same Meta API with added features: message storage, contact querying, template management, Flows support, and an MCP server. The migration path is **incremental replacement** of raw `fetch()` calls with the Kapso SDK — not a rewrite.

For Post Bridge, the platform currently has Twitter/X auto-publishing only. All other social platforms (Instagram, TikTok, LinkedIn, Facebook) require manual copy-paste. Post Bridge's API (`api.post-bridge.com`) provides unified cross-platform posting to 9+ platforms. This fills a critical gap.

---

## 2. What Kapso Is

**Kapso** ([kapso.ai](https://kapso.ai)) is a WhatsApp Business API developer platform.

| Attribute | Detail |
|-----------|--------|
| **What it does** | Typed TypeScript SDK wrapping Meta Cloud API v19.0, plus optional proxy with storage/query APIs |
| **npm package** | `@kapso/whatsapp-cloud-api` |
| **GitHub** | [github.com/gokapso/whatsapp-cloud-api-js](https://github.com/gokapso/whatsapp-cloud-api-js) |
| **Docs** | [docs.kapso.ai](https://docs.kapso.ai/docs/whatsapp/typescript-sdk/introduction) |
| **API base (proxy)** | `https://api.kapso.ai/meta/whatsapp` |
| **API base (direct)** | Uses Meta's `graph.facebook.com/v19.0` directly |
| **MCP endpoint** | `https://app.kapso.ai/mcp` (HTTP streamable transport) |
| **Auth** | `accessToken` (Meta token) for direct mode; `kapsoApiKey` for proxy mode |
| **Free tier** | 2,000 messages/month, 1 WhatsApp number, sandbox number available |
| **Pro tier** | Up to 3 numbers, higher limits |

### Kapso SDK Namespaces
- `client.messages` — send text/media/interactive/templates, mark as read, send raw payloads
- `client.templates` — list/get/create/delete WhatsApp message templates
- `client.flows` — deploy/create/update/publish WhatsApp Flows
- History endpoints — query conversations, messages, contacts with Meta-compatible paging

### Kapso Proxy Mode (Optional)
When pointed to `https://api.kapso.ai/meta/whatsapp`:
- Stores all messages/conversations/contacts automatically
- Adds `kapso(...)` fields to responses with enriched data
- Provides query endpoints for stored data
- Webhooks for: message_received, message_sent, conversation_inactive

### Kapso MCP Server
- Endpoint: `https://app.kapso.ai/mcp`
- Tools: `whatsapp_send_text_message`, `whatsapp_send_template`
- HTTP streamable transport only (not SSE)
- API key header required on every request

---

## 3. What Post Bridge Is

**Post Bridge** ([post-bridge.com](https://www.post-bridge.com)) is a social media scheduling and cross-posting API.

| Attribute | Detail |
|-----------|--------|
| **What it does** | Unified API for posting/scheduling to 9+ social platforms |
| **API base** | `https://api.post-bridge.com` |
| **API docs** | [api.post-bridge.com/reference](https://api.post-bridge.com/reference) |
| **npm package** | `post-bridge-api` (unofficial, v0.1.1) |
| **Auth** | API key (from dashboard at post-bridge.com/dashboard/api-keys) |
| **Pricing** | $5/month API add-on (requires active subscription, plans from ~$29/month) |
| **Support** | Discord `#api` channel |

### Supported Platforms
Twitter/X, Instagram, LinkedIn, Facebook, TikTok, YouTube, Bluesky, Threads, Pinterest

### API Endpoints (Known)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/v1/social-accounts` | List connected accounts (id, platform, username) |
| POST | `/v1/media/create-upload-url` | Get pre-signed upload URL for media |
| POST | `/v1/posts` | Create/schedule a post |

### POST /v1/posts Payload
```json
{
  "caption": "Post content text",
  "media_ids": ["media-id-1"],
  "social_account_ids": ["account-id-1", "account-id-2"],
  "scheduled_at": "2026-03-29T10:00:00Z",
  "platform_config": { ... },
  "is_draft": false
}
```
- Omit `scheduled_at` for instant posting
- Use `media_urls` (public URLs) instead of `media_ids` for URL-based media
- Set `is_draft: true` to save without processing

### Limitations
- One account per platform per post (no multi-account same-platform)
- No thread scheduling (X threads, Instagram Threads)
- Minimal analytics (no engagement metrics API)

---

## 4. Current Platform State

### 4.1 WhatsApp Integration (EXISTING — Production-Grade)

**Location:** `lib/agents/channels/whatsapp.ts` + `app/api/webhooks/whatsapp/route.ts`

**What exists:**
- Full Meta Cloud API v19.0 integration via raw `fetch()` calls
- Bidirectional messaging (text, image, document, location, contacts, interactive buttons/lists)
- Template message support with parameters
- HMAC-SHA256 webhook signature verification (timing-safe)
- Message parsing: `entry[0].changes[0].value.messages[0]` → normalized `CEOEvent`
- Blue tick (mark as read) functionality
- Full pipeline: parse → verify → store → CRM resolve → CEO Brain → respond → log

**Environment variables used:**
```
WHATSAPP_PHONE_NUMBER_ID
WHATSAPP_ACCESS_TOKEN
WHATSAPP_VERIFY_TOKEN
WHATSAPP_BUSINESS_ACCOUNT_ID
WHATSAPP_APP_SECRET
```

**Webhook handler pipeline (305 lines):**
1. Verify HMAC signature
2. Parse inbound message via adapter
3. Return 200 immediately to Meta
4. Background: mark as read → find/create Conversation → store Message → resolve Contact → CEO Brain → send response → store outbound Message → log Interaction

**Assessment:** This is solid production code. The Kapso SDK would replace the raw `fetch()` calls with typed methods while maintaining the same pipeline.

### 4.2 Channel Adapter Pattern (EXISTING — Extensible)

**Location:** `lib/agents/channels/`

| Adapter | File | Status | External API |
|---------|------|--------|-------------|
| WhatsApp | `whatsapp.ts` | Production | Meta Cloud API v19.0 |
| Email | `email.ts` | Production | Resend |
| Web | `web.ts` | Production | Email reply |
| Internal | `internal.ts` | Production | AgentTask DB |

**Interface contract (`lib/agents/types.ts`):**
```typescript
interface ChannelAdapter {
  readonly channel: Channel;
  parseInbound(rawPayload: unknown): Promise<CEOEvent | null>;
  sendResponse(externalId: string, content: string, options?: SendOptions): Promise<SendResult>;
  verifySignature?(request: Request): Promise<boolean>;
}

type Channel = "whatsapp" | "email" | "web" | "internal";
```

**Assessment:** Clean, extensible. New channels fit naturally. The `Channel` type needs extending for social platforms if we add DM capabilities.

### 4.3 Social Media Scheduling (EXISTING — Partial)

**Location:** `lib/social/scheduler.ts` + `app/api/cron/social/route.ts`

**What works:**
- ScheduledContent DB model with full lifecycle (pending → published/failed/cancelled)
- Query, reschedule, mark-as-published operations
- Twitter/X auto-publish via `twitter-api-v2` npm package
- Social cron runs every 15 minutes, feature-flag guarded
- Social Calendar admin page (`/admin/social-calendar`) — week/month views, 6 platforms

**What doesn't work:**
- Instagram: InstagramAPI class exists in `lib/integrations/instagram.ts` but `publishMedia()` is incomplete
- TikTok: Class exists in `lib/integrations/tiktok.ts` but not wired
- LinkedIn: Only env vars defined, no implementation
- Facebook: Only env vars defined, no implementation
- All non-Twitter platforms show "manual posting required" in UI

**Assessment:** Post Bridge replaces the need for individual platform SDKs. Instead of building 5 separate integrations, one Post Bridge client handles all 9 platforms.

### 4.4 CEO/CTO Agent Brain (EXISTING — Full)

**Location:** `lib/agents/`

**Relevant components:**
- `ceo-brain.ts` — Event processing with tool-calling loop (max 5 rounds)
- `tool-registry.ts` — 22 tools registered (CRM, analytics, content, SEO, affiliate, finance, email, design, browsing, repo, QA)
- `event-router.ts` — Normalizes raw channel payloads to CEOEvent
- `safety.ts` — Approval gates, rate limits, PII filtering
- `types.ts` — 40+ interfaces for the agent platform

**Assessment:** The agent platform is a consumer of channel adapters. Kapso integration should be transparent to the brain — same CEOEvent format. Post Bridge could be exposed as a new tool (`publish_to_social`) in the tool registry.

### 4.5 CRM & Data Models (EXISTING — Full)

**Location:** `lib/agents/crm/` + `prisma/schema.prisma`

**Models used by channel integrations:**
- `Conversation` — channel, externalId, contactName/Email/Phone, leadId, subscriberId, status, sentiment
- `Message` — conversationId, direction, channel, content, contentType, mediaUrls, agentId, toolsUsed, confidence
- `InteractionLog` — siteId, opportunityId, conversationId, channel, interactionType, summary, sentiment
- `CrmOpportunity` — stage pipeline (new → qualifying → proposal → negotiation → won/lost)
- `Lead` — contact data, interests, travel preferences, UTM tracking
- `Subscriber` — email list with engagement scoring
- `ScheduledContent` — social media scheduling (content_type, platform, status, scheduled_time)
- `AgentTask` — CEO/CTO task assignments with scheduling

**Assessment:** Schema is comprehensive. No new models needed for Kapso/Post Bridge integration — existing models support the full lifecycle.

### 4.6 Environment Variable Strategy

**Location:** `.env.example` (444 lines)

**Pattern:** All secrets in env vars, loaded via `process.env.*`, validated at point of use (not centrally). Feature flags in FeatureFlag DB table + `lib/cron-feature-guard.ts`.

**Missing for Kapso:**
```
KAPSO_API_KEY           # Kapso project API key (proxy mode)
KAPSO_PROXY_ENABLED     # "true" to use Kapso proxy instead of direct Meta API
```
Note: Existing `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` etc. are reused by Kapso SDK.

**Missing for Post Bridge:**
```
POST_BRIDGE_API_KEY     # Post Bridge API key
POST_BRIDGE_BASE_URL    # Default: https://api.post-bridge.com (overridable for testing)
```

### 4.7 Test Structure

**Existing test infrastructure:**
- Vitest (unit/integration): `npm test`
- Playwright (e2e): `npm run test:e2e`
- Smoke tests: `scripts/smoke-test.ts` (159+ tests across 29 categories)
- Integration tests: `test/integration/`, `tests/deployment/`

**No existing tests for:**
- WhatsApp adapter (no unit tests for parsing, signature verification)
- Social scheduler (no unit tests for publish flow)
- Channel adapter contracts

**Assessment:** Test infrastructure exists. We need to add tests for the new integration wrappers.

---

## 5. Risk Assessment

### 5.1 Kapso Integration Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Breaking existing WhatsApp flow | HIGH | Keep current adapter as fallback; feature-flag the Kapso path |
| Kapso SDK version instability (v0.x) | MEDIUM | Pin exact version; wrap in adapter layer |
| Proxy mode adds latency | LOW | Direct mode available; proxy is optional |
| Kapso free tier limit (2K msgs/month) | LOW | Can use direct Meta mode without Kapso proxy |
| Webhook format differences | LOW | Kapso uses same Meta webhook format |

### 5.2 Post Bridge Integration Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| API add-on cost ($5/month + subscription) | LOW | Minimal cost vs building 9 platform integrations |
| Unofficial npm SDK (v0.1.1) | MEDIUM | Build our own typed client instead |
| Rate limits per platform (Instagram 25/day) | MEDIUM | Queue + rate limiter in scheduler |
| Media upload complexity | MEDIUM | Two-step flow (get URL → upload → post) |
| Post Bridge downtime affects all platforms | MEDIUM | Graceful degradation; queue posts for retry |
| No engagement analytics from API | LOW | Use GA4 + platform-native analytics instead |

### 5.3 Cross-Integration Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Existing Twitter integration conflict | MEDIUM | Feature flag to choose Twitter path (direct vs Post Bridge) |
| Channel type expansion | LOW | Extend `Channel` union type carefully |
| Agent tool registration conflicts | LOW | Namespace new tools clearly |

---

## 6. Recommended Integration Approach

### 6.1 Kapso — Incremental SDK Migration

**Strategy:** Replace raw `fetch()` calls in `whatsapp.ts` with Kapso SDK methods, preserving the existing `ChannelAdapter` interface. Feature-flag proxy mode as optional.

1. Install `@kapso/whatsapp-cloud-api`
2. Create `lib/integrations/kapso-client.ts` — singleton client factory
3. Refactor `lib/agents/channels/whatsapp.ts` — replace `fetch()` calls with SDK methods
4. Keep webhook handler unchanged (same Meta format)
5. Add Kapso proxy mode behind `KAPSO_PROXY_ENABLED` feature flag
6. Add template management endpoints (new capability from SDK)

**What changes:** Internal implementation of WhatsApp adapter
**What stays the same:** ChannelAdapter interface, CEOEvent format, webhook handler pipeline, CRM integration

### 6.2 Post Bridge — New Social Publishing Layer

**Strategy:** Create a new `lib/integrations/post-bridge-client.ts` service that the existing social scheduler delegates to. Replace per-platform publishing logic with Post Bridge API calls.

1. Create `lib/integrations/post-bridge-client.ts` — typed HTTP client
2. Create `lib/integrations/post-bridge-types.ts` — request/response types
3. Modify `lib/social/scheduler.ts` — add Post Bridge publishing path alongside existing Twitter path
4. Add Post Bridge account mapping to `SiteSettings` or config
5. Add `publish_to_social` tool to CEO Agent tool registry
6. Feature-flag: `POST_BRIDGE_ENABLED` in FeatureFlag table

**What changes:** Social publishing path (from Twitter-only to multi-platform via Post Bridge)
**What stays the same:** ScheduledContent model, Social Calendar UI, social cron structure

---

## 7. Files That Will Be Modified

### Kapso Integration
| File | Change Type | Description |
|------|------------|-------------|
| `lib/agents/channels/whatsapp.ts` | MODIFY | Replace `fetch()` with Kapso SDK |
| `lib/integrations/kapso-client.ts` | CREATE | Kapso client singleton factory |
| `app/api/webhooks/whatsapp/route.ts` | MINOR MODIFY | Add Kapso proxy webhook support (optional) |
| `.env.example` | MODIFY | Add KAPSO_API_KEY, KAPSO_PROXY_ENABLED |
| `package.json` | MODIFY | Add `@kapso/whatsapp-cloud-api` |

### Post Bridge Integration
| File | Change Type | Description |
|------|------------|-------------|
| `lib/integrations/post-bridge-client.ts` | CREATE | Post Bridge API client |
| `lib/integrations/post-bridge-types.ts` | CREATE | TypeScript types for Post Bridge API |
| `lib/social/scheduler.ts` | MODIFY | Add Post Bridge publishing path |
| `app/api/cron/social/route.ts` | MODIFY | Add Post Bridge platform detection |
| `lib/agents/tools/social.ts` | CREATE | CEO Agent social publishing tool |
| `.env.example` | MODIFY | Add POST_BRIDGE_API_KEY, POST_BRIDGE_BASE_URL |

### Shared
| File | Change Type | Description |
|------|------------|-------------|
| `test/integrations/kapso.spec.ts` | CREATE | Kapso adapter tests |
| `test/integrations/post-bridge.spec.ts` | CREATE | Post Bridge client tests |
| `scripts/smoke-test.ts` | MODIFY | Add Kapso + Post Bridge smoke tests |
| `docs/KAPSO_BRIDGE_PLAN.md` | CREATE | Integration plan |
| `docs/KAPSO_BRIDGE_AUDIT.md` | CREATE | Audit findings |
| `docs/KAPSO_BRIDGE_TESTS.md` | CREATE | Test documentation |
| `docs/KAPSO_BRIDGE_LOG.md` | CREATE | Execution log |

---

## 8. What Already Exists (Do Not Rebuild)

These components are production-ready and must NOT be rewritten:

1. **WhatsApp webhook handler** (`app/api/webhooks/whatsapp/route.ts`) — full pipeline with HMAC verification, CRM integration, CEO Brain routing
2. **Channel adapter interface** (`lib/agents/types.ts`) — `ChannelAdapter`, `CEOEvent`, `SendResult` types
3. **Event router** (`lib/agents/event-router.ts`) — normalizes all channel events
4. **CEO Brain** (`lib/agents/ceo-brain.ts`) — tool-calling agent with safety gates
5. **CRM contact resolver** (`lib/agents/crm/contact-resolver.ts`) — unified contact resolution
6. **Social scheduler** (`lib/social/scheduler.ts`) — scheduling, querying, status tracking
7. **Social cron** (`app/api/cron/social/route.ts`) — feature-flagged, budget-guarded
8. **Social Calendar UI** (`app/admin/social-calendar/page.tsx`) — 6-platform calendar

---

## 9. Open Questions for Owner

1. **Kapso account:** Do you have a Kapso account? If so, what plan? Do you have an API key?
2. **Post Bridge account:** Do you have a Post Bridge account with API add-on? Do you have an API key?
3. **Post Bridge connected accounts:** Which social platforms are already connected in Post Bridge?
4. **Twitter preference:** Keep existing direct Twitter integration or route through Post Bridge?
5. **Kapso proxy vs direct:** Do you want Kapso's message storage features, or just the typed SDK over direct Meta API?
6. **WhatsApp number:** Is the current Meta Cloud API WhatsApp number the same one to use with Kapso?

---

## 10. Next Steps

1. **Create** `docs/KAPSO_BRIDGE_PLAN.md` — detailed implementation plan
2. **Implement Phase 1** — Kapso client wrapper + SDK migration
3. **Implement Phase 2** — Post Bridge client + social publishing
4. **Implement Phase 3** — Testing + hardening
5. **Create** `docs/KAPSO_BRIDGE_AUDIT.md` — audit both integrations
6. **Push** to `claude/integrate-kapso-bridge-IC9I8`
