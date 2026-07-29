# Kapso + Post Bridge Integration — Test Plan

**Date:** March 28, 2026
**Branch:** `claude/integrate-kapso-bridge-IC9I8`

---

## 1. Unit Test Inventory

No dedicated unit test spec files (`kapso.spec.ts`, `post-bridge.spec.ts`) were created in this integration. The rationale is documented in Section 4 below.

### Planned Unit Tests (kapso.spec.ts)

| # | Test | What It Verifies |
|---|------|-----------------|
| 1 | `getKapsoClient() returns singleton` | Second call returns same instance |
| 2 | `resetKapsoClient() clears singleton` | After reset, next call creates new instance |
| 3 | `isKapsoConfigured() returns false when no env vars` | No crash on missing credentials |
| 4 | `isKapsoConfigured() returns true when WHATSAPP_ACCESS_TOKEN set` | Direct mode detection |
| 5 | `isKapsoProxyEnabled() returns true only when both vars set` | Requires KAPSO_API_KEY AND KAPSO_PROXY_ENABLED=true |
| 6 | `getKapsoClient() throws when no credentials` | Clear error message with module tag |
| 7 | `getKapsoClient() creates direct client when only access token` | WhatsAppClient({ accessToken }) |
| 8 | `getKapsoClient() creates proxy client when proxy enabled` | WhatsAppClient({ kapsoApiKey, baseUrl }) |
| 9 | `getPhoneNumberId() returns env var` | Reads WHATSAPP_PHONE_NUMBER_ID |

### Planned Unit Tests (post-bridge.spec.ts)

| # | Test | What It Verifies |
|---|------|-----------------|
| 1 | `getPostBridgeClient() returns null when unconfigured` | No crash, returns null |
| 2 | `getPostBridgeClient() returns singleton` | Second call returns same instance |
| 3 | `resetPostBridgeClient() clears singleton` | After reset, next call creates new instance |
| 4 | `isPostBridgeConfigured() reads POST_BRIDGE_API_KEY` | Returns boolean correctly |
| 5 | `PostBridgeClient.getAccounts() calls GET /v1/social-accounts` | Correct URL and method |
| 6 | `PostBridgeClient.createPost() calls POST /v1/posts` | Correct URL, method, body |
| 7 | `PostBridgeClient.createMediaUploadUrl() calls POST /v1/media/create-upload-url` | Correct URL and payload shape |
| 8 | `PostBridgeClient handles 401 with clear message` | mapErrorMessage returns "API key invalid" |
| 9 | `PostBridgeClient handles 429 with retry-after` | Extracts retry_after from error body |
| 10 | `PostBridgeClient handles non-JSON error body` | Falls back to text, then undefined |
| 11 | `PostBridgeError has statusCode and apiError` | Custom error class properties preserved |
| 12 | `PostBridgeClient uses custom baseUrl` | POST_BRIDGE_BASE_URL override respected |

---

## 2. Smoke Test Inventory

No smoke tests have been added to `scripts/smoke-test.ts` yet. The following tests should be added:

| # | Test Name | Category | What It Checks |
|---|-----------|----------|---------------|
| 1 | `kapso-client.ts exports getKapsoClient` | Integration | File exists with expected export |
| 2 | `kapso-client.ts exports isKapsoConfigured` | Integration | File exists with expected export |
| 3 | `post-bridge-client.ts exports getPostBridgeClient` | Integration | File exists with expected export |
| 4 | `post-bridge-client.ts exports isPostBridgeConfigured` | Integration | File exists with expected export |
| 5 | `post-bridge-types.ts exports PostBridgeError` | Integration | Error class exists |
| 6 | `social.ts exports publishToSocial` | Agent Tools | Tool handler exists |
| 7 | `social.ts exports getSocialStatus` | Agent Tools | Tool handler exists |
| 8 | `sync-accounts route exists` | Admin Routes | File at expected path |
| 9 | `sync-accounts route uses requireAdmin` | Security | Auth middleware present |
| 10 | `whatsapp.ts imports from kapso-client` | Wiring | SDK migration confirmed |
| 11 | `scheduler.ts imports post-bridge-client` | Wiring | Post Bridge integration confirmed |
| 12 | `social cron imports post-bridge-client` | Wiring | Cron routes through Post Bridge |
| 13 | `tool-registry has publish_to_social` | Agent Tools | Tool definition registered |
| 14 | `tool-registry has get_social_status` | Agent Tools | Tool definition registered |
| 15 | `.env.example has KAPSO_API_KEY` | Config | Env var documented |
| 16 | `.env.example has POST_BRIDGE_API_KEY` | Config | Env var documented |

---

## 3. Integration Test Scenarios (Manual)

These require real API credentials and should be run manually when env vars are configured.

### 3.1 Kapso WhatsApp Integration

**Prerequisites:** `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` set in Vercel.

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 1 | Send text message (direct mode) | Call `sendTextMessage("+1234567890", "test")` | Message delivered, `messageId` returned |
| 2 | Send template message | Call `sendTemplateMessage("+1234567890", "hello_world")` | Template message delivered |
| 3 | Mark as read | Call `markAsRead(messageId)` after receiving inbound | Blue ticks appear in WhatsApp |
| 4 | Proxy mode | Set `KAPSO_API_KEY` + `KAPSO_PROXY_ENABLED=true`, send text | Routes through api.kapso.ai, message delivered |
| 5 | Webhook inbound | Send a WhatsApp message to the business number | Webhook fires, `parseWebhookPayload()` returns CEOEvent, CEO Brain processes |
| 6 | Mode switching | Toggle `KAPSO_PROXY_ENABLED`, call `resetKapsoClient()` | Next call uses new mode |

### 3.2 Post Bridge Social Publishing

**Prerequisites:** `POST_BRIDGE_API_KEY` set in Vercel, at least one social account connected in Post Bridge dashboard.

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 1 | List connected accounts | GET `/api/admin/post-bridge/sync-accounts` | Returns array of connected accounts with platform and username |
| 2 | Sync accounts (force refresh) | POST `/api/admin/post-bridge/sync-accounts` | Returns fresh account list, `synced: true` |
| 3 | Publish to connected platform | Create ScheduledContent, call `publishPost(id)` | Post Bridge `createPost()` called, `post_bridge_id` in metadata |
| 4 | Publish fallthrough to Twitter | Disconnect platform in Post Bridge, publish Twitter post | Falls through to Twitter direct API |
| 5 | Publish fallthrough to manual | No Post Bridge account, no Twitter keys | Post stays `status: "pending"`, shows in Social Calendar |
| 6 | CEO Agent publish tool | Via Agent HQ, trigger `publish_to_social` with platform + content | Approval gate fires, then publishes via priority chain |
| 7 | CEO Agent social status | Via Agent HQ, trigger `get_social_status` | Returns counts + Post Bridge platforms + Twitter config |
| 8 | Social cron batch | Wait for social cron to fire | Pending posts for connected platforms auto-published |
| 9 | Account cache invalidation | POST to sync-accounts | `resetPostBridgeAccountsCache()` clears cache, next publish uses fresh accounts |

### 3.3 End-to-End Flow

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 1 | CEO Agent WhatsApp -> Social Post | Receive WhatsApp "post to twitter: Hello world" | CEO Brain extracts intent, calls `publish_to_social`, approval gate, published via Post Bridge or Twitter |
| 2 | Dashboard Social Calendar -> Post Bridge | Create post in Social Calendar, auto-publish triggers | Published through Post Bridge, `post_bridge_id` stored |
| 3 | Cron batch with mixed platforms | Schedule posts for Twitter + Instagram + LinkedIn | Post Bridge handles all connected platforms, Twitter direct as fallback for X |

---

## 4. What Is NOT Tested and Why

| Area | Reason |
|------|--------|
| **Actual Kapso SDK API calls** | Requires real Meta WhatsApp Business API credentials. The SDK is a thin typed wrapper -- the risk surface is in credential config (covered by unit tests) and webhook parsing (existing tests cover). |
| **Actual Post Bridge API calls** | Requires a Post Bridge account and API key. The client is a standard HTTP wrapper -- the risk surface is in error mapping and auth header construction (covered by unit tests). |
| **WhatsApp webhook HMAC verification** | Requires `WHATSAPP_APP_SECRET` env var. The existing `timingSafeEqual` implementation was not changed by this integration -- no regression risk. |
| **Multi-platform Post Bridge publishing** | Each platform has unique content requirements (character limits, media formats). Post Bridge handles validation server-side. Our client passes content through and surfaces errors. |
| **Rate limiting / retry logic** | Post Bridge returns 429 with `retry_after`. We surface the error but do not auto-retry. This is by design -- the social cron will pick up failed posts on next run. |
| **Media upload flow** | `createMediaUploadUrl()` + `uploadMedia()` methods exist but are not wired into any publish path yet. Media-attached social posts are a future enhancement. |
| **Kapso proxy mode in production** | Proxy mode (api.kapso.ai) is an optional optimization. Direct mode (graph.facebook.com) is the default and primary path. Proxy mode will be tested when Kapso provides production API keys. |
