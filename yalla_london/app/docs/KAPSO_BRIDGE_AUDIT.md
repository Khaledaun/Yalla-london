# Kapso + Post Bridge Integration Audit

**Date:** March 28, 2026
**Branch:** `claude/integrate-kapso-bridge-IC9I8`
**Auditor:** Claude Code (automated)

---

## 1. Integration Scope

Two external services integrated into the Yalla London platform:

| Service | Package / API | Purpose | Mode |
|---------|---------------|---------|------|
| **Kapso** | `@kapso/whatsapp-cloud-api` v0.2.1 | Typed WhatsApp Cloud API SDK for CEO Agent | Direct (graph.facebook.com) or Proxy (api.kapso.ai) |
| **Post Bridge** | REST API at `api.post-bridge.com` | Social media scheduling across 9 platforms | HTTP client with Bearer auth |

**Publish priority chain:** Post Bridge --> Twitter direct --> manual fallback.

---

## 2. Per-File Audit

### 2.1 `lib/integrations/kapso-client.ts` (NEW)

**What it does:** Singleton factory for the Kapso `WhatsAppClient`. Reads env vars, creates client in direct or proxy mode.

| Check | Status | Notes |
|-------|--------|-------|
| Singleton pattern | PASS | Module-scoped `_client` with `getKapsoClient()` factory |
| Credential validation | PASS | Throws if neither `WHATSAPP_ACCESS_TOKEN` nor `KAPSO_API_KEY` is set |
| No secrets in exports | PASS | Only exposes `isKapsoConfigured()`, `isKapsoProxyEnabled()`, `getPhoneNumberId()`, `getKapsoClient()`, `resetKapsoClient()` |
| Test-friendliness | PASS | `resetKapsoClient()` clears singleton for test isolation |
| Error handling | PASS | Clear error message with `[kapso-client]` module tag |

**Security notes:** Access token never logged or returned in responses. Proxy mode requires both `KAPSO_API_KEY` AND `KAPSO_PROXY_ENABLED=true` -- cannot accidentally enable proxy.

### 2.2 `lib/integrations/post-bridge-client.ts` (NEW)

**What it does:** Typed HTTP client for Post Bridge REST API. Singleton factory with Bearer auth.

| Check | Status | Notes |
|-------|--------|-------|
| Singleton pattern | PASS | Module-scoped `_client` with `getPostBridgeClient()` factory |
| Returns null when unconfigured | PASS | `getPostBridgeClient()` returns `null` if `POST_BRIDGE_API_KEY` not set |
| Error mapping | PASS | `mapErrorMessage()` covers 401, 403, 404, 422, 429 (with retry-after) |
| Error class | PASS | Custom `PostBridgeError` extends `Error` with `statusCode` and `apiError` |
| No secrets in responses | PASS | API key only used in `Authorization` header, never exposed |
| Non-JSON error handling | PASS | `res.json()` in catch falls back to `res.text()`, then `undefined` |
| Test-friendliness | PASS | `resetPostBridgeClient()` clears singleton |

**Security notes:** Bearer token constructed in the private `fetch()` method only. No credential logging anywhere.

### 2.3 `lib/integrations/post-bridge-types.ts` (NEW)

**What it does:** TypeScript interfaces for Post Bridge API.

| Check | Status | Notes |
|-------|--------|-------|
| Type coverage | PASS | Config, 9-platform union, SocialAccount, CreatePostRequest/Response, MediaUploadUrlResponse, PostBridgeError |
| Platform union complete | PASS | All 9 platforms: twitter, instagram, linkedin, facebook, tiktok, youtube, bluesky, threads, pinterest |
| No runtime logic | PASS | Pure type definitions + one error class |

### 2.4 `lib/agents/channels/whatsapp.ts` (MODIFIED)

**What changed:** Replaced raw `fetch()` calls to `graph.facebook.com` with Kapso SDK method calls.

| Check | Status | Notes |
|-------|--------|-------|
| SDK import path | PASS | Imports from `@/lib/integrations/kapso-client` |
| `sendTextMessage()` | PASS | Uses `client.messages.sendText({ phoneNumberId, to, body })` |
| `sendTemplateMessage()` | PASS | Uses `client.messages.sendTemplate()` with proper components array |
| `markAsRead()` | PASS | Uses `client.messages.sendRaw()` with status payload (SDK has no dedicated method) |
| `isWhatsAppConfigured()` | PASS | Delegates to `isKapsoConfigured()` |
| Webhook parsing | PASS | Unchanged -- correctly parses Meta Cloud API webhook format |
| Error handling | PASS | All catch blocks log with `[whatsapp]` tag |
| HMAC verification | PASS | Unchanged -- existing `timingSafeEqual` verification intact |

### 2.5 `lib/social/scheduler.ts` (MODIFIED)

**What changed:** Added Post Bridge as primary publish path in `publishPost()`. Added account caching.

| Check | Status | Notes |
|-------|--------|-------|
| Post Bridge priority | PASS | Checks Post Bridge first, falls through to Twitter direct on failure |
| Account caching | PASS | `getPostBridgeAccountId()` caches for 5 minutes (`PB_CACHE_TTL_MS`) |
| Platform normalization | PASS | `"x"` mapped to `"twitter"` for account lookup |
| Failure fallthrough | PASS | Post Bridge failure catches error, logs, updates metadata, falls through |
| DB updates on success | PASS | Sets `status`, `published`, `published_time`, `metadata.post_bridge_id` |
| DB updates on failure | PASS | Sets `status: "failed"`, `metadata.last_publish_error` |
| Cache reset export | PASS | `resetPostBridgeAccountsCache()` exported for sync endpoint |
| Empty catch blocks | PASS | All catch blocks log with `[social-scheduler]` tag |

### 2.6 `app/api/cron/social/route.ts` (MODIFIED)

**What changed:** Routes all platforms through `publishPost()` (which now tries Post Bridge first).

| Check | Status | Notes |
|-------|--------|-------|
| Post Bridge account fetch | PASS | Fetches connected platforms, merges with Twitter direct |
| Auto-publish platform set | PASS | `Set<string>` dedup of Post Bridge platforms + Twitter |
| Error handling | PASS | Post Bridge account fetch failure logged, does not block cron |
| Site scoping | PASS | Uses `getActiveSiteIds()` for pending count query |

### 2.7 `lib/agents/tools/social.ts` (NEW)

**What it does:** CEO Agent tool handlers: `publishToSocial` and `getSocialStatus`.

| Check | Status | Notes |
|-------|--------|-------|
| Parameter validation | PASS | Returns error for missing `platform` or `content` |
| siteId resolution | PASS | `params.siteId || ctx.siteId || getDefaultSiteId()` |
| DB record creation | PASS | Creates `ScheduledContent` before publish attempt |
| Publish delegation | PASS | Calls `publishPost()` from scheduler (uses full priority chain) |
| Status query scoping | PASS | All 3 count queries scoped by `site_id` |
| Post Bridge connectivity check | PASS | Fetches connected accounts, returns platform list |
| Twitter config check | PASS | Checks all 4 env vars (with `ACCESS_SECRET` alias) |
| Empty catch | PASS | Post Bridge `getAccounts()` catch has comment (acceptable for optional check) |

**Minor note:** The catch block at line 119 has no `console.warn` -- it silently swallows the error. This is acceptable because the function continues with empty `postBridgePlatforms` and reports the status honestly, but adding a log would be ideal.

### 2.8 `app/api/admin/post-bridge/sync-accounts/route.ts` (NEW)

**What it does:** Admin endpoint to view/refresh Post Bridge connected accounts.

| Check | Status | Notes |
|-------|--------|-------|
| Admin auth | PASS | Both GET and POST call `requireAdmin(request)` with return check |
| Config guard | PASS | Returns `configured: false` when `POST_BRIDGE_API_KEY` not set |
| Client null guard | PASS | Returns 500 if client init fails |
| Response shape | PASS | Strips `profile_image_url` from accounts (no sensitive data leak) |
| POST cache bust | PASS | Calls `resetPostBridgeAccountsCache()` before fetch |
| Error handling | PASS | Both handlers catch errors with `[post-bridge-sync]` tag, return 502 |
| No secrets in response | PASS | Only returns id, platform, username, connected |

### 2.9 `lib/agents/tool-registry.ts` (MODIFIED)

**What changed:** Added `publish_to_social` and `get_social_status` tool definitions.

| Check | Status | Notes |
|-------|--------|-------|
| Tool definitions | PASS | Both have name, description, agents, safety, inputSchema |
| `publish_to_social` safety | PASS | `needs_approval` -- goes through human approval gate |
| `get_social_status` safety | PASS | `auto` -- read-only, no approval needed |
| Platform enum in schema | PASS | Lists all 9 platforms in description |
| Required fields | PASS | `publish_to_social` requires `["platform", "content"]`; `get_social_status` requires `[]` |
| Execute wiring | NOTE | Uses `stub("publish_to_social")` -- actual handler wiring happens in ceo-brain.ts tool dispatch |

### 2.10 `.env.example` (MODIFIED)

**What changed:** Added Kapso and Post Bridge env var sections.

| Check | Status | Notes |
|-------|--------|-------|
| Kapso section | PASS | Documents `KAPSO_API_KEY`, `KAPSO_PROXY_ENABLED=false` |
| Post Bridge section | PASS | Documents `POST_BRIDGE_API_KEY`, `POST_BRIDGE_BASE_URL` (commented) |
| No actual secrets | PASS | Placeholder values only |

---

## 3. Auth / Security Review

| Area | Status | Details |
|------|--------|---------|
| Admin middleware | PASS | `sync-accounts` route uses `requireAdmin()` with return check on both GET and POST |
| Env var handling | PASS | All secrets read from `process.env`, never logged or returned |
| API key in headers only | PASS | Post Bridge Bearer token constructed in private `fetch()` method |
| No secrets in error responses | PASS | Error messages are mapped to generic strings (`mapErrorMessage`) |
| WhatsApp HMAC verification | PASS | Existing `timingSafeEqual` verification unchanged by migration |
| CEO Agent safety gate | PASS | `publish_to_social` marked `needs_approval` -- requires human confirmation before posting |

---

## 4. Multi-Site Compatibility

| Check | Status | Details |
|-------|--------|---------|
| `publishToSocial` siteId | PASS | Resolves from params -> context -> `getDefaultSiteId()` |
| `getSocialStatus` siteId | PASS | Same resolution chain, scopes all DB queries by `site_id` |
| `ScheduledContent.site_id` | PASS | Set on every record created by social tools |
| Social cron site scoping | PASS | Uses `getActiveSiteIds()` for pending counts |
| Post Bridge account cache | NOTE | Cache is global (not per-site) -- accounts are platform-level, not site-level. This is correct because Post Bridge accounts map to social profiles, not to Yalla London sites. |

---

## 5. Error Handling Review

| File | Empty catch blocks | Module-tagged logging |
|------|-------------------|---------------------|
| `kapso-client.ts` | 0 | Yes (`[kapso-client]`) |
| `post-bridge-client.ts` | 0 | N/A (throws `PostBridgeError`) |
| `whatsapp.ts` | 0 | Yes (`[whatsapp]`) |
| `scheduler.ts` | 0 | Yes (`[social-scheduler]`) |
| `social/route.ts` | 0 | Yes (`[social-cron]`) |
| `social.ts` (tools) | 1 (line 119) | Missing -- silently swallows Post Bridge `getAccounts()` error |
| `sync-accounts/route.ts` | 0 | Yes (`[post-bridge-sync]`) |

**Verdict:** 1 silent catch in `social.ts` line 119. Non-critical (function continues correctly with empty platforms list), but adding a `console.warn` would be ideal for observability.

---

## 6. Known Limitations / Gaps

| # | Limitation | Severity | Notes |
|---|-----------|----------|-------|
| 1 | Tool registry uses `stub()` wiring | LOW | Actual handler dispatch happens in `ceo-brain.ts` via tool name matching. The `stub()` placeholder works but creates an indirection that could confuse auditors. |
| 2 | Post Bridge account cache is global | LOW | If multiple sites use different Post Bridge accounts for the same platform, the cache returns the first match. Currently not an issue (single site active). |
| 3 | No retry on Post Bridge 429 | MEDIUM | `mapErrorMessage` extracts `retry_after` but the client does not automatically retry. Callers must handle. |
| 4 | Kapso SDK version pinned to v0.2.1 | LOW | Early-stage SDK. Monitor for breaking changes on updates. |
| 5 | No Post Bridge webhook handler | LOW | Post Bridge may send status callbacks for async publishes. Currently we poll via `sync-accounts`. |
| 6 | `social.ts` line 119 silent catch | LOW | See error handling section. |
| 7 | No smoke tests yet | MEDIUM | See KAPSO_BRIDGE_TESTS.md for test plan. |

---

## 7. Overall Verdict

**PASS** -- Integration is clean, secure, and follows platform conventions.

- All admin routes are authenticated with `requireAdmin()`
- No secrets are logged or exposed in API responses
- Error handling uses module-tagged logging throughout (1 minor exception)
- Multi-site scoping is correct on all DB queries
- Publish priority chain (Post Bridge -> Twitter -> manual) degrades gracefully
- Singleton pattern with reset functions enables testability
- Type safety is thorough (custom error class, typed interfaces, platform union)
