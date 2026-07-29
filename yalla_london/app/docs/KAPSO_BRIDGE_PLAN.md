# Kapso + Post Bridge Integration Plan

**Date:** March 28, 2026
**Branch:** `claude/integrate-kapso-bridge-IC9I8`
**Status:** Plan finalized — ready for implementation

---

## A. Kapso Integration Design

### A.1 Overview

Replace raw `fetch()` calls to Meta Cloud API in `lib/agents/channels/whatsapp.ts` with Kapso SDK (`@kapso/whatsapp-cloud-api`). The `ChannelAdapter` interface contract is preserved — consumers (CEO Brain, webhook handler, CRM) see no change.

### A.2 Kapso Client Wrapper

**File:** `lib/integrations/kapso-client.ts`

```
Purpose: Singleton factory for Kapso WhatsAppClient
Pattern: Lazy initialization, env-var driven config, proxy/direct mode toggle

getKapsoClient() → WhatsAppClient
  - Reads WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID
  - If KAPSO_API_KEY + KAPSO_PROXY_ENABLED=true → proxy mode (api.kapso.ai)
  - Else → direct mode (graph.facebook.com)
  - Singleton cached in module scope

isKapsoConfigured() → boolean
  - Returns true if WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_NUMBER_ID are set
  - Same check as existing isWhatsAppConfigured()
```

### A.3 WhatsApp Adapter Migration

**File:** `lib/agents/channels/whatsapp.ts` (MODIFY)

| Current (raw fetch) | After (Kapso SDK) |
|---------------------|-------------------|
| `fetch('https://graph.facebook.com/v19.0/{phoneId}/messages', { body: { type: 'text', text: { body } } })` | `client.messages.sendText({ to, body })` |
| `fetch(..., { body: { type: 'template', template: { name, components } } })` | `client.messages.sendTemplate({ to, name, language, components })` |
| `fetch(..., { body: { messaging_product: 'whatsapp', status: 'read' } })` | `client.messages.markAsRead({ messageId })` |
| Manual JSON parsing of webhook payload | Same — webhook format unchanged (Meta format) |
| Manual HMAC-SHA256 verification | Same — keep existing verification (Kapso doesn't change webhook auth) |

**What changes:**
- `sendTextMessage()` → uses `client.messages.sendText()`
- `sendTemplateMessage()` → uses `client.messages.sendTemplate()`
- `markAsRead()` → uses `client.messages.markAsRead()`
- Import `getKapsoClient` from `kapso-client.ts`

**What stays the same:**
- `parseWebhookPayload()` — Meta webhook format is identical
- `verifySignature()` — HMAC-SHA256 stays (Kapso doesn't modify webhook auth)
- `createWhatsAppAdapter()` factory — same interface, same return type
- All exports: `isWhatsAppConfigured`, `createWhatsAppAdapter`, `verifyWebhookSubscription`, `markAsRead`

### A.4 Webhook Handler

**File:** `app/api/webhooks/whatsapp/route.ts` (MINOR MODIFY)

No structural changes. The only modification is the `markAsRead` import path if it moves to use the SDK internally. The webhook handler calls `adapter.parseInbound()` and `adapter.sendResponse()` — both of which are the adapter methods being migrated.

### A.5 Number Routing

Not needed for v1. Single WhatsApp number per Kapso project, matching current setup. Multi-number support can be added later via Kapso's number management APIs if needed for Zenitha Yachts.

### A.6 Idempotency

Kapso SDK returns message IDs from Meta (`wamid.*`). Existing `Message` model stores `externalId` — no change needed. For proxy mode, Kapso adds its own deduplication via stored messages.

### A.7 Retry & Failure

Current retry strategy: none (fire-and-forget with error logging). Kapso SDK throws typed errors. We wrap in try/catch with descriptive logging — same pattern as current code.

### A.8 Logging & CRM Hooks

No changes. The webhook handler pipeline (store Conversation → store Message → CRM resolve → CEO Brain → respond → log Interaction) remains identical. The adapter is an internal implementation detail.

### A.9 Feature Flag Strategy

```
KAPSO_PROXY_ENABLED=true    → Kapso proxy mode (stored messages, enriched data)
KAPSO_PROXY_ENABLED=false   → Direct Meta API via Kapso SDK (typed but no storage)
No env var                  → Direct Meta API via Kapso SDK (default)
```

No DB feature flag needed — the Kapso SDK is always used (replaces raw fetch). The proxy toggle is env-var only.

---

## B. Post Bridge Integration Design

### B.1 Overview

Create a new Post Bridge API client that the existing social scheduler delegates to. Replace per-platform publishing logic with unified Post Bridge API calls. Feature-flagged — existing Twitter direct integration is preserved as fallback.

### B.2 Post Bridge Types

**File:** `lib/integrations/post-bridge-types.ts`

```typescript
// Core types derived from Post Bridge API docs

interface PostBridgeConfig {
  apiKey: string;
  baseUrl: string; // default: https://api.post-bridge.com
}

interface SocialAccount {
  id: string;
  platform: PostBridgePlatform;
  username: string;
  profile_image_url?: string;
  connected: boolean;
}

type PostBridgePlatform =
  | "twitter" | "instagram" | "linkedin" | "facebook"
  | "tiktok" | "youtube" | "bluesky" | "threads" | "pinterest";

interface CreatePostRequest {
  caption: string;
  social_account_ids: string[];
  media_ids?: string[];
  media_urls?: string[];
  scheduled_at?: string;       // ISO 8601 — omit for instant
  platform_config?: Record<string, unknown>;
  is_draft?: boolean;
}

interface CreatePostResponse {
  id: string;
  status: "scheduled" | "published" | "draft" | "failed";
  published_url?: string;
  error?: string;
}

interface MediaUploadUrlResponse {
  upload_url: string;
  media_id: string;
}
```

### B.3 Post Bridge Client

**File:** `lib/integrations/post-bridge-client.ts`

```
Purpose: Typed HTTP client for Post Bridge REST API
Pattern: Class with methods per endpoint, auth header injection, error normalization

class PostBridgeClient {
  constructor(config: PostBridgeConfig)

  // Accounts
  getAccounts(): Promise<SocialAccount[]>

  // Media
  createMediaUploadUrl(fileName: string, contentType: string): Promise<MediaUploadUrlResponse>
  uploadMedia(uploadUrl: string, fileBuffer: Buffer, contentType: string): Promise<void>

  // Posts
  createPost(request: CreatePostRequest): Promise<CreatePostResponse>

  // Internal
  private fetch<T>(method, path, body?): Promise<T>  // auth header + error handling
}

// Factory
getPostBridgeClient(): PostBridgeClient | null
  - Returns null if POST_BRIDGE_API_KEY not set
  - Singleton cached

isPostBridgeConfigured(): boolean
  - Returns true if POST_BRIDGE_API_KEY is set
```

### B.4 Account Mapping

Post Bridge accounts are identified by `id` (UUID). We need to map platform names from our ScheduledContent model to Post Bridge account IDs.

**Storage:** `SiteSettings` table (existing) with key `post_bridge_accounts`:
```json
{
  "twitter": "pb-account-id-1",
  "instagram": "pb-account-id-2",
  "linkedin": "pb-account-id-3"
}
```

**Sync endpoint:** `POST /api/admin/post-bridge/sync-accounts` — fetches accounts from Post Bridge API, stores mapping in SiteSettings.

### B.5 Scheduler Integration

**File:** `lib/social/scheduler.ts` (MODIFY)

Current `publishPost()` flow:
```
1. Fetch ScheduledContent by ID
2. If platform === "twitter" && Twitter creds configured → twitter-api-v2
3. Else → return "Manual publish required"
```

After modification:
```
1. Fetch ScheduledContent by ID
2. If POST_BRIDGE_API_KEY configured && platform in Post Bridge accounts:
   a. Get Post Bridge account ID for platform
   b. If post has media → createMediaUploadUrl + upload
   c. createPost({ caption, social_account_ids, media_ids?, scheduled_at? })
   d. Store post ID + published URL in metadata
   e. Mark as published
3. Else if platform === "twitter" && Twitter creds configured → existing twitter-api-v2 path
4. Else → return "Manual publish required"
```

**Priority:** Post Bridge first (handles most platforms), then Twitter direct (if Post Bridge not configured), then manual fallback.

### B.6 Social Cron Integration

**File:** `app/api/cron/social/route.ts` (MODIFY)

Current auto-publish detection:
```
const canAutoPublish = (platform) => platform === "twitter" && twitterConfigured
```

After:
```
const canAutoPublish = (platform) => {
  if (isPostBridgeConfigured() && getPostBridgeAccountId(siteId, platform)) return true;
  if (platform === "twitter" && twitterConfigured) return true;
  return false;
}
```

This means `pendingManual` count drops as Post Bridge accounts are connected — existing dashboard logic shows the right numbers automatically.

### B.7 CEO Agent Social Tool

**File:** `lib/agents/tools/social.ts` (CREATE)

New tool: `publish_to_social` registered in tool-registry.ts

```
Name: publish_to_social
Description: Schedule or instantly publish a social media post to connected platforms
Safety: NEEDS_APPROVAL (social posts are public-facing)
Rate limit: 10 per hour

Parameters:
  - caption: string (required)
  - platforms: string[] (required, e.g. ["twitter", "instagram"])
  - media_urls?: string[]
  - scheduled_at?: string (ISO 8601)
  - siteId?: string

Behavior:
  1. Validate platforms against connected Post Bridge accounts
  2. Create ScheduledContent record (or use Post Bridge directly for instant)
  3. If instant: call publishPost() which routes through Post Bridge
  4. Return: { postIds, platforms, scheduledAt, status }
```

### B.8 Error Normalization

Post Bridge errors are HTTP status codes + JSON body. Normalize to:
```typescript
class PostBridgeError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public apiError?: unknown
  ) { super(message); }
}
```

Map common errors:
- 401 → "Post Bridge API key invalid or expired"
- 403 → "Platform not connected or insufficient permissions"
- 404 → "Social account not found in Post Bridge"
- 422 → "Invalid post content (check platform requirements)"
- 429 → "Rate limited — retry after {retryAfter}s"

### B.9 Feature Flag Strategy

```
POST_BRIDGE_API_KEY set → Post Bridge enabled
POST_BRIDGE_API_KEY not set → Post Bridge disabled, existing behavior preserved

DB FeatureFlag: "post-bridge-publishing" → kill switch for emergencies
```

Twitter direct integration preserved as fallback when Post Bridge is not configured or Post Bridge is down (circuit breaker pattern).

---

## C. Shared Integration Standards

### C.1 Integration Audit Record

Both integrations log to `CronJobLog` with structured `result_summary`:
```json
{
  "integration": "kapso" | "post-bridge",
  "action": "send_message" | "publish_post" | "sync_accounts",
  "success": true,
  "durationMs": 234,
  "metadata": { ... }
}
```

### C.2 Error Handling Pattern

```typescript
try {
  const result = await client.someMethod(params);
  return { success: true, data: result };
} catch (err) {
  const message = err instanceof Error ? err.message : JSON.stringify(err);
  console.warn(`[integration-name] ${action} failed:`, message);
  return { success: false, error: message };
}
```

No empty catch blocks. No silent failures.

### C.3 Env Var Documentation

All new env vars documented in `.env.example` with:
- Purpose comment
- Default value (if any)
- Where to get it (dashboard URL)

### C.4 Test Strategy

| Layer | What | Tool |
|-------|------|------|
| Unit | Client methods, type validation, error mapping | Vitest |
| Smoke | Env var presence, import resolution, config check | smoke-test.ts |
| Integration | End-to-end with mock server (optional) | Vitest |

---

## D. Implementation Phases

### Phase 1: Kapso Wrapper (lib/integrations/kapso-client.ts)
- Install `@kapso/whatsapp-cloud-api`
- Create client singleton factory
- Export `getKapsoClient()`, `isKapsoConfigured()`

### Phase 2: Kapso Routing + Outbound
- Migrate `whatsapp.ts` to use Kapso SDK
- Replace 3 `fetch()` calls with SDK methods
- Add proxy mode toggle
- Update `.env.example`

### Phase 3: Post Bridge Wrapper
- Create types file
- Create client class with 4 methods
- Export `getPostBridgeClient()`, `isPostBridgeConfigured()`
- Update `.env.example`

### Phase 4: Post Bridge Operations
- Modify `scheduler.ts` publish path
- Modify `social/route.ts` auto-publish detection
- Create `social.ts` CEO agent tool
- Create account sync endpoint

### Phase 5: Shared Hardening
- Add smoke tests (both integrations)
- Add unit tests (both clients)
- Update `cron-feature-guard.ts` if needed
- Update `departures/route.ts` if new crons added
- Create audit doc + test doc + execution log

---

## E. Files Summary

| File | Action | Phase |
|------|--------|-------|
| `lib/integrations/kapso-client.ts` | CREATE | 1 |
| `lib/integrations/post-bridge-client.ts` | CREATE | 3 |
| `lib/integrations/post-bridge-types.ts` | CREATE | 3 |
| `lib/agents/channels/whatsapp.ts` | MODIFY | 2 |
| `lib/social/scheduler.ts` | MODIFY | 4 |
| `app/api/cron/social/route.ts` | MODIFY | 4 |
| `lib/agents/tools/social.ts` | CREATE | 4 |
| `app/api/admin/post-bridge/sync-accounts/route.ts` | CREATE | 4 |
| `.env.example` | MODIFY | 2+3 |
| `package.json` | MODIFY | 1 |
| `test/integrations/kapso.spec.ts` | CREATE | 5 |
| `test/integrations/post-bridge.spec.ts` | CREATE | 5 |
| `scripts/smoke-test.ts` | MODIFY | 5 |
| `docs/KAPSO_BRIDGE_AUDIT.md` | CREATE | 5 |
| `docs/KAPSO_BRIDGE_TESTS.md` | CREATE | 5 |
| `docs/KAPSO_BRIDGE_LOG.md` | CREATE | 5 |
