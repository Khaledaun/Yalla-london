# Chrome Bridge CHANGELOG

All changes to the Claude Chrome Bridge capabilities, versioned.

Format: `version` (ISO date + increment). Claude Chrome checks `bridgeVersion`
via `GET /capabilities` and re-loads PLAYBOOK.md when it changes.

---

## 2026-04-20.3 — Revenue attribution

**Added:**
- `GET /api/admin/chrome-bridge/revenue?siteId=X&days=N&limit=N` — per-page
  affiliate attribution. Joins BlogPost → CjClickEvent (via SID parse from
  sessionId) → CjCommission (via metadata.sid). Returns per-page: organic
  clicks/impressions, affiliate clicks, commission count + total, EPC,
  conversion rate, hasAffiliateLinks flag, and classification:
  - `earner` — has commissions or affiliate clicks
  - `dead_weight` — ≥20 organic clicks, 0 affiliate clicks, has affiliate links
  - `unmonetized` — no affiliate links injected in content
  - `fresh` — <14 days old (excluded from classification)
  - `cold` — nothing happening yet
- Response also surfaces `topEarners` (top 10 by commission), `deadWeight`
  (ranked by wasted traffic), `unmonetized` (ranked by impressions).
- `GET /page/[id]` now includes `revenue` block with 30d affiliate clicks,
  commission count + total, EPC, recent commissions. Claude Chrome sees
  page earnings inline with SEO / indexing / enhancement log.

**Why:** The #1 blind spot in page audits was "is this page even earning?"
Claude Chrome can now differentiate traffic optimization (dead_weight —
monetize first) from monetization optimization (unmonetized — inject
affiliates first) from protect-mode (top earners — don't disturb).

---

## 2026-04-20.2 — Awareness layer

**Added:**
- `GET /api/admin/chrome-bridge/capabilities` — self-documenting manifest endpoint with endpoint schemas, feature flags, env availability, and session-start instructions
- `lib/chrome-bridge/manifest.ts` — single source of truth for exposed endpoints and versions
- `_hints` field standard on bridge responses — every response now includes `{ version, playbookVersion, suggested: string[], playbook, capabilities, viewer }` so Claude Chrome stays aware of new capabilities without re-reading the playbook between sessions
- PLAYBOOK.md now has versioned YAML frontmatter (`version: 2026-04-20`) so Claude Chrome can detect when the playbook has changed

**Why:** Keeps Claude Chrome sessions aligned as the bridge expands. When a new
endpoint ships, the capabilities manifest is updated + the version bumps, and
Claude sees the new capability on the next session without manual intervention.

---

## 2026-04-20.1 — Initial release

**Added:**
- Bearer-token auth with admin-session fallback (`lib/agents/bridge-auth.ts`)
- `ChromeAuditReport` Prisma model + migration for report persistence
- 11 bridge endpoints (9 read + 2 write):
  - `GET /` (self-doc index)
  - `GET /sites` (active sites + config)
  - `GET /overview` (cross-site snapshot)
  - `GET /pages` (published pages + GSC 7d)
  - `GET /page/[id]` (deep dive)
  - `GET /action-logs` (unified log view)
  - `GET /cycle-health` (pipeline signals)
  - `GET /aggregated-report` (latest SEO audits)
  - `GET /gsc` (GSC top pages/keywords/sitemaps)
  - `GET /ga4` (GA4 metrics)
  - `POST /report` (audit upload)
  - `POST /triage` (log triage upload)
- `lib/chrome-bridge/interpret.ts` — 5 pure interpretation functions
  (CTR vs position, GA4 engagement, indexing failures, page content, action log clustering)
- `lib/chrome-bridge/types.ts` — Zod schemas for findings and actions
- `lib/chrome-bridge/helpers.ts` — report path builder, AgentTask creator,
  CronJobLog writer, CEO Inbox alert
- `docs/chrome-audits/PLAYBOOK.md` — 5-pillar auditor methodology + thresholds
- `scripts/mcp-platform-server.ts` — 6 Chrome Bridge MCP tools
- `/admin/chrome-audits` — iPhone-first viewer with Apply Fix / Dismiss / Mark
  Reviewed / Mark Fixed actions that queue `AgentTask` records for CLI pick-up

**Why:** Give Claude Chrome a read/write surface into the platform so it can
audit per-page and sitewide, while keeping Claude Code CLI as the executor for
applied fixes. Reports land in a DB + markdown-backed store that the owner
reviews from iPhone.

---

## Planned — Phase 5 continuation (2026-04-20.3+)

- `GET /revenue?siteId=X&days=N` — per-page affiliate clicks / commissions / EPC
- `GET /history?siteId=X&pageUrl=X` — past audit reports for a URL (memory loop)
- `GET /opportunities?siteId=X` — TopicProposal queue + GSC near-miss queries
- `GET /lighthouse?url=X&strategy=mobile|desktop` — PageSpeed API wrapper

## Planned — Phase 6 (2026-04-21+)

- `GET /schema?url=X` — JSON-LD validator
- `GET /broken-links?siteId=X` — dead internal links + orphan pages
- `GET /rejected-drafts?siteId=X` — pattern-mine pipeline rejections
- `GET /errors?siteId=X` — 404 / error log from Vercel logs
- `GET /arabic-ssr?siteId=X` — per-page SSR compliance check (closes KG-032)

## Planned — Phase 7 (needs decisions)

- `GET /serp?keyword=X` — competitor SERP via DataForSEO (~$10/mo)
- `GET /screenshot?url=X&viewport=mobile|desktop` — needs Browserless (~$15/mo) or defer
- `GET /replay?url=X` — Microsoft Clarity session URLs (free, needs install)
- `POST /ab-test` — register and track A/B tests
- `GET /impact?reportId=X` — measure CTR/bounce delta after applied fix
