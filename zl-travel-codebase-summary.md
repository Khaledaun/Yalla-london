# ZL Travel — Phase 1 Codebase Summary

Companion to `zl-travel-phase1-artifacts.zip`. Map, not a tour.

Generated: 2026-05-02
Branch: `claude/zl-travel-phase1-handoff-ziyKs`
Last commit: `a1a692e` Merge PR #780 (claude/fix-yalla-london-seo-lzFxF) — 2026-04-30

---

## 1. Repo overview

**Stack confirmed:**
- Next.js `^14.2.32` (App Router)
- Prisma `6.16.2` + `@prisma/client ^6.16.2`
- TypeScript `5.2.2`
- React `18.2.0`
- PostgreSQL via Supabase (PgBouncer pooler) — `datasource db { provider = "postgresql"; url = env("DATABASE_URL") }`
- Hosted on Vercel Pro (300s function maxDuration on heavy crons via `vercel.json` overrides)

**Top-level layout:**
The deployed Next.js app lives at `yalla_london/app/`, NOT the repo root. The repo root holds session/orchestration assets (`CLAUDE.md`, `.claude/`, `docs/`, `Uploads/`, `prisma/` is a stub, `scripts/` is the operator toolkit). Anything under `yalla_london/app/` is the actual production code: `app/` (Next routes), `lib/` (business logic), `prisma/schema.prisma` (the real schema, 5,160 lines), `components/`, `config/`, `middleware.ts`. There is also a parallel `yalla_london/docs/` (Chrome Bridge playbook lives here) separate from `yalla_london/app/docs/`.

**Branch state:**
- Active: `claude/zl-travel-phase1-handoff-ziyKs` (this branch)
- 0 commits ahead of `origin/main` at start (this handoff PR will be the first)
- Working tree clean before this task

---

## 2. Schema summary

**Total Prisma models: 165** (in `yalla_london/app/prisma/schema.prisma`, 5,160 lines)

### Domain grouping

**Identity & access (8):**
User, Account, Session, VerificationToken, UserExtended, UserSession, TeamMember, TeamMemberExpertise

**Multi-tenant primitives (8):**
Site, SiteTheme, SiteMember, SiteSettings, SiteConfig, SiteHealthCheck, Tenant, TenantIntegration *(note: `Site*` and `Tenant*` are parallel concepts that have NOT been reconciled — see Section 10)*

**Content (15):**
Category, BlogPost, ArticleDraft, InformationSection, InformationCategory, InformationArticle, FactEntry, NewsItem, NewsResearchLog, ContentGeneration, ScheduledContent, ContentScheduleRule, ContentImport, ContentCredit, MediaAsset

**Topic & pipeline (8):**
TopicProposal, TopicPolicy, RulebookVersion, PageTypeRecipe, PromptTemplate, ContentPipeline, ContentPerformance, ContentScheduleRule

**SEO (14):**
SeoMeta, SeoRedirect, SeoInternalLink, SeoKeyword, SeoContentAnalysis, SeoReport, SeoHealthMetric, SeoPageMetric, SeoSitemapEntry, SeoHreflangEntry, SeoStructuredData, SeoAuditResult, SeoAuditReport, SeoAuditAction

**Indexing & GSC (5):**
URLIndexingStatus, GscPagePerformance, AuditRun, AuditIssue, ChromeAuditReport

**Affiliate / commerce (22):**
AffiliatePartner, AffiliateWidget, AffiliateAssignment, AffiliateClick, AffiliateNetwork, TrackingPartner, CjAdvertiser, CjLink, CjOffer, CjCommission, CjPlacement, CjPlacementRule, CjClickEvent, CjSyncLog, Conversion, Lead, LeadActivity, DigitalProduct, Purchase, ProductBrief, ProductPack, CommerceCampaign

**Etsy (3):**
EtsyListingDraft, EtsyShopConfig, CommerceTask

**Yacht charter (Zenitha Yachts — 8):**
Yacht, YachtDestination, CharterInquiry, YachtAvailability, YachtReview, CharterItinerary, BrokerPartner, YachtSyncLog

**Pipeline ops & telemetry (12):**
CronJobLog, JobRun, BackgroundJob, AutoFixLog, ApiUsageLog, AnalyticsSnapshot, AnalyticsEvent, SystemMetrics, AuditLog, SystemDiagnostic, DevTask, PerformanceAudit

**CEO / CTO Agent platform (8):**
Conversation, Message, AgentTask, CrmOpportunity, InteractionLog, RetentionSequence, RetentionProgress, FinanceEvent

**Email / subscribers (5):**
Subscriber, ConsentLog, EmailTemplate, EmailCampaign, RetentionSequence

**Design & media (8):**
Design, MediaAsset, ImageAsset, MediaEnrichment, PdfGuide, PdfDownload, VideoProject, VideoAsset, DistributionAsset, UnsplashCache

**Billing & finance (8):**
BillingEntity, Subscription, PaymentMethod, Invoice, FinanceEvent, CommerceOrder, Payout, PayoutProfileTemplate, CommerceSettings

**Social, distribution, A/B (6):**
SocialEmbed, HomepageBlock, HomepageVersion, AbTest, Campaign, CampaignItem

**Premium / WTM legacy clones (8):**
SitePremium, SiteThemePremium, HomepageVersionPremium, AuditLogPremium, ChangePremium, SiteMemberPremium, UserExtended *(legacy duplicates — see Section 10)*

**Misc / orphan (rest):**
DatabaseBackup, ApiSettings, FeatureFlag, ModelProvider, ModelRoute, Credential, Domain, GoogleDriveAccount, Place, Skill, ExitIntentImpression, Agreement, Event, PerplexityTask, PerplexitySchedule, TrendRun, TrendSignal, KeywordCluster, CommerceAlert, DailyBriefing

### Orphan models (per CLAUDE.md KG-020 — 31 unreferenced)

CLAUDE.md flags 31 orphan models with zero code references. The list isn't enumerated in CLAUDE.md, but the strongest candidates (premium clones + legacy etsy/commerce duplicates + unused MagicLink/AccountWeb tables) are: `SitePremium`, `SiteThemePremium`, `HomepageVersionPremium`, `AuditLogPremium`, `ChangePremium`, `SiteMemberPremium`, `Agreement`, `RulebookVersion`, `PageTypeRecipe`, `Place`, `MediaEnrichment`, `Skill`, `ExitIntentImpression`, `BackgroundJob`, `JobRun`, `Subscription`, `PaymentMethod`, `Invoice`, `BillingEntity`, `PayoutProfileTemplate`, `EtsyListingDraft`, `EtsyShopConfig`, `CommerceTask`, `CommerceCampaign`, `CommerceAlert`, `ProductPack`, `CommerceOrder`, `Payout`, `CommerceSettings`, `DigitalProduct`, `Purchase`. **Architect should run `prisma validate` + grep before any deletion.**

### Models WITHOUT siteId/tenantId/site relation (67 of 165)

These assume single-tenant context. Some are correct (User/Account/Session — global identity), others need siteId for ZL Travel multi-tenant:

**Globally-correct (no siteId needed):** User, Account, Session, VerificationToken, ModelProvider, ModelRoute, Site, Tenant, FeatureFlag, Credential.

**Single-tenant assumptions to break (need siteId for ZL Travel):**
- `Category`, `Recommendation`, `ContentGeneration`, `SocialEmbed`, `HomepageBlock`, `HomepageVersion`, `ContentScheduleRule`, `RulebookVersion`, `PageTypeRecipe`, `ImageAsset`, `Place`, `SeoAuditResult`, `MediaEnrichment`, `PromptTemplate`, `SiteTheme`, `AuditLog`, `AnalyticsEvent`, `SystemMetrics`, `UserSession`, `UserExtended`
- All `Seo*` standalone tables: `SeoMeta`, `SeoRedirect`, `SeoInternalLink`, `SeoKeyword`, `SeoContentAnalysis`, `SeoHealthMetric`, `SeoPageMetric`, `SeoSitemapEntry`, `SeoHreflangEntry`, `SeoStructuredData` *(SEO data is per-site by definition — these need siteId or a Site relation)*
- `Skill`, `TeamMemberExpertise`, `ContentCredit`, `TrackingPartner`, `LeadActivity`
- `BillingEntity`, `Subscription`, `PaymentMethod`, `Invoice` *(billing per tenant!)*
- `CampaignItem`, `Design`, `PdfGuide`, `PdfDownload`, `EmailTemplate`, `EmailCampaign`, `VideoProject`, `ContentPipeline`, `ContentPerformance`
- `YachtAvailability`
- `AffiliateNetwork`, `CjAdvertiser`, `CjLink`, `CjPlacement`, `CjPlacementRule`, `CjSyncLog` *(CJ shared resources — but `CjLink` placement is per-site)*
- `UnsplashCache`, `Message`, `RetentionProgress`

Full list of 67 in the artifact.

---

## 3. Cron inventory

**Total: 48 cron route handlers in `app/api/cron/`**, scheduled in `vercel.json`.

| Cron | Category | In CONTENT_GEN_CRONS? |
|------|----------|----------------------|
| `weekly-topics` | content-generating | YES |
| `daily-content-generate` | content-generating | YES |
| `schedule-executor` | content-generating | YES |
| `content-builder-create` | content-generating | YES |
| `trends-monitor` | content-generating | YES |
| `london-news` | content-generating | YES |
| `content-builder` | content-generating (advances drafts) | NO |
| `content-selector` | content-generating (promotes to BlogPost) | NO |
| `scheduled-publish` | content-generating (publishes ScheduledContent) | NO |
| `reserve-publisher` | content-generating (safety net 1 article/day) | NO |
| `ai-voice-rewrite-runner` | content (rewrite voice) | NO |
| `quality-recovery-runner` | recovery/fix-up | NO |
| `content-auto-fix` | recovery/fix-up | NO |
| `content-auto-fix-lite` | recovery/fix-up | NO |
| `content-cleanup-daily` | recovery/fix-up | NO |
| `content-freshness` | recovery/fix-up | NO |
| `diagnostic-sweep` | recovery/fix-up | NO |
| `sweeper` | recovery/fix-up (stuck draft sweeper) | NO |
| `seo-deep-review` | recovery/fix-up | NO |
| `seo-agent` | recovery/fix-up | NO |
| `seo-agent-intelligence` | recovery/fix-up | NO |
| `seo-orchestrator` | recovery/fix-up | NO |
| `seo-audit-runner` | diagnostic | NO |
| `daily-seo-audit` | diagnostic | NO |
| `gsc-sync` | diagnostic / data sync | NO |
| `process-indexing-queue` | diagnostic / indexing submitter | NO |
| `verify-indexing` | diagnostic | NO |
| `google-indexing` | diagnostic / submitter | NO |
| `discovery-monitor` | diagnostic | NO |
| `pipeline-health` | diagnostic | NO |
| `site-health-check` | diagnostic | NO |
| `audit-roundup` | diagnostic | NO |
| `affiliate-injection` | other / monetization | NO |
| `analytics` | other / data sync | NO |
| `data-refresh` | other / cache warming | NO |
| `events-sync` | other (Ticketmaster) | NO |
| `image-pipeline` | other (Unsplash) | NO |
| `social` | other (Twitter auto-post) | NO |
| `subscriber-emails` | other (email sender) | NO |
| `retention-executor` | other (email sequences) | NO |
| `campaign-executor` | other (article enhancement campaigns) | NO |
| `ceo-intelligence` | other (weekly CEO Engine) | NO |
| `daily-briefing` | other (email briefing to Khaled) | NO |
| `agent-maintenance` | other (CTO Agent 5-phase loop) | NO |
| `followup-executor` | other (CEO Agent follow-up tasks) | NO |
| `fact-verification` | other | NO |
| `perplexity-scheduler` | other (Perplexity Computer) | NO |
| `perplexity-executor` | other | NO |

**Recent failures:** I did not query CronJobLog directly. CLAUDE.md (March 28 + 29 sections) and the discovery audit context note these as failure-prone or recently-fixed: `seo-agent` (budget cap), `daily-content-generate` (AI provider timeouts), `retention-executor` (per-loop import overhead), `followup-executor` (zombie tasks). For live data, query `/api/admin/action-logs` or `/api/admin/cycle-health` after deploy.

**Master kill-switch:** `CONTENT_GENERATION_PAUSE` env var or DB feature flag disables all 6 content-generating crons in one shot, leaving recovery/diagnostic/email crons running. See `lib/cron-feature-guard.ts`.

---

## 4. Bridge endpoint inventory

**Total: 41 endpoints under `app/api/admin/chrome-bridge/`** (CLAUDE.md mentions "44" — the 3-endpoint discrepancy is likely (a) the manifest counts also `/admin/chrome-audits` admin pages, OR (b) 3 endpoints landed after the doc count. Architect should reconcile against `lib/chrome-bridge/manifest.ts` ENDPOINTS array.)

All routes require `requireBridgeToken()` (bearer `CLAUDE_BRIDGE_TOKEN` OR admin-session fallback) EXCEPT `/ab-test/track` which is a public beacon.

| Endpoint | Purpose |
|----------|---------|
| `route.ts` (root) | Top-level info / version / health |
| `capabilities/` | Manifest of all available endpoints + version + featureFlags |
| `sites/` | List sites |
| `overview/` | Site high-level stats |
| `pages/` | List published pages with index status |
| `page/[id]/` | Single page detail |
| `action-logs/` | Recent action log entries |
| `cycle-health/` | 17-check health analyzer output |
| `aggregated-report/` | v2 9-section aggregated report |
| `gsc/` | GSC search performance (top-level) |
| `gsc/inspect/` | GSC URL Inspection per URL |
| `gsc/breakdown/` | Multi-dim Search Analytics |
| `gsc/coverage-summary/` | Derived coverage report from URLIndexingStatus |
| `ga4/` | GA4 metrics top-level |
| `ga4/channels/` | Channel breakdown |
| `ga4/conversions/` | Event conversions |
| `ga4/realtime/` | Active users now |
| `ga4/funnel/` | Per-page funnel |
| `report/` | POST: upload ChromeAuditReport |
| `triage/` | POST: upload triage decisions, create AgentTask for CLI |
| `revenue/` | Per-page revenue with 5-state classification |
| `history/` | Audit memory + delta vs prior reports |
| `opportunities/` | TopicProposal queue + GSC near-miss queries |
| `lighthouse/` | PageSpeed wrapper (CWV + interpreted findings) |
| `schema/` | JSON-LD validator (deprecated-type flagging) |
| `broken-links/` | Dead /blog/<slug> refs + orphan pages + weak-link pages |
| `rejected-drafts/` | Pattern-mining of recent rejections |
| `errors/` | 404 inference from indexing + sitemap + cron failures |
| `arabic-ssr/` | KG-032: 5-check Arabic SSR compliance scan |
| `serp/` | DataForSEO SERP fetch |
| `keyword-research/` | DataForSEO keyword volume/CPC |
| `ab-test/` | List/create A/B tests |
| `ab-test/[id]/` | Get/update single test, declare winner |
| `ab-test/track/` | **PUBLIC** beacon — record impression/conversion |
| `impact/` | Closed-loop: 7/14/30d delta before vs after `fixedAt` |
| `affiliate/gaps/` | Unlinked brand mentions in articles |
| `affiliate/recommendations/` | Program recs from intent volume |
| `affiliate/commission-trends/` | Weekly commission velocity |
| `affiliate/approval-queue/` | CJ approval state |
| `not-indexed-details/` | Per-URL "why not indexed" with reasons |
| `enhance-not-indexed/` | POST: trigger enhancement for non-indexed URLs |

---

## 5. Admin pages inventory

**Total: 83 directories under `app/admin/`** (each with `page.tsx`).

Stale-vs-active classification is approximate — based on CLAUDE.md session history. Cockpit + named tools = active. Many older single-purpose pages are kept but not the primary path.

### Active (per CLAUDE.md cockpit redesign + recent sessions)
- `cockpit/` — Mission control, 7 tabs, mobile-first (the primary admin landing — `/admin` redirects here)
- `cockpit/per-page-audit/` — sortable per-page audit
- `cockpit/health/` — Cycle Health Analyzer
- `cockpit/campaigns/` — campaign enhancement
- `cockpit/commerce/` — affiliate partner management
- `cockpit/new-site/` — 8-step new website wizard
- `cockpit/design/` — Design Studio
- `cockpit/email/` — Email Center
- `affiliate-hq/` — 6-tab affiliate command center
- `chrome-audits/` — Claude Chrome audit viewer + Apply Fix actions
- `departures/` — Airport-style departures board with countdown timers
- `cron-logs/` — filterable history
- `content/` — Content Hub (Generation Monitor, Indexing tab)
- `topics/`, `topics-pipeline/` — Topic queue
- `seo-audits/`, `seo-dashboard/`, `master-audit/` — SEO views
- `legal/` — Legal pages manager (CRUD per-site, per-locale)
- `ai-assistant/` — Embedded coding assistant (chat with Claude)
- `ai-costs/` — AI spend dashboard
- `agent/` — Agent HQ (CEO + CTO status)
- `agent/conversations/` — multi-channel conversation browser
- `email-campaigns/`, `social-calendar/` — channel management
- `discovery/` — discovery audit
- `intelligence/` — top pages, GSC analytics
- `wordpress/` — WordPress sync admin (see Section 9)
- `yachts/` — Zenitha Yachts admin (8 sub-pages)
- `chrome-audits/` — Claude Chrome audit viewer

### Likely stale or single-use
- `command-center/` — predates cockpit
- `automation/`, `automation-hub/` — placeholder per KG-046
- `ai-studio/`, `ai-prompt-studio/` — overlap with ai-assistant
- `design/`, `design-studio/` — older Design Hub before cockpit redesign
- `news/`, `facts/` — flagged as broken nav links (KG-047)
- `kaspo/`, `etsy/` — early commerce experiments
- `feature-flags/`, `variable-vault/` — present but the variable-vault API route doesn't exist (the page references a missing endpoint)
- `pipeline/`, `pipeline-phases/`, `cron-monitor/` — replaced by cockpit + departures
- `members/`, `team/`, `people/` — three pages for the same concept; some unused
- `social-hub/`, `communications/` — social-calendar is the canonical version
- `audit-logs/`, `health-monitoring/`, `api-monitor/`, `api-security/` — overlap with cockpit health tab
- `sync-test/`, `help/`, `profile/` — utility/dev pages

Architect should treat the active list as the real surface. The 83 count overstates the working dashboard.

---

## 6. Known integrations

| Service | Env vars | Library / wrapper file |
|---------|----------|------------------------|
| **Anthropic Claude** | `ANTHROPIC_API_KEY`, `CLAUDE_BRIDGE_TOKEN` | `lib/ai/provider.ts` (provider chain), `lib/agents/bridge-auth.ts` |
| **OpenAI** | `OPENAI_API_KEY` | `lib/ai/provider.ts` (currently flagged dead — quota exhausted; rule #168) |
| **xAI Grok** | `XAI_API_KEY`, `GROK_API_KEY` | `lib/ai/provider.ts` (primary content-gen provider) |
| **Perplexity** | `PERPLEXITY_API_KEY` | `lib/ai/provider.ts` (KG-056: quota exhausted) |
| **Gemini** | (none active — CLAUDE.md notes account frozen) | — |
| **CJ Affiliate** | `CJ_API_TOKEN`, `CJ_WEBSITE_ID`, `CJ_PUBLISHER_CID` | `lib/affiliate/cj-client.ts`, `lib/affiliate/cj-sync.ts`, `lib/affiliate/link-injector.ts`, `lib/affiliate/monitor.ts`, `lib/affiliate/deal-discovery.ts`, `lib/affiliate/link-tracker.ts` |
| **Travelpayouts** | `TRAVELPAYOUTS_API_TOKEN`, `TRAVELPAYOUTS_MARKER`, `NEXT_PUBLIC_TRAVELPAYOUTS_MARKER` | `lib/affiliate/travelpayouts.ts` (rules in `affiliate-injection/route.ts`), `components/integrations/monetization-scripts.tsx` |
| **Stay22** | `NEXT_PUBLIC_STAY22_AID` | `components/integrations/monetization-scripts.tsx`, `components/integrations/stay22-map.tsx` |
| **Ticketmaster** | `TICKETMASTER_API_KEY` | `lib/apis/events.ts` |
| **Unsplash** | `UNSPLASH_ACCESS_KEY` | `lib/apis/unsplash.ts`, `lib/unsplash.ts`, `lib/unsplash-collections.ts` |
| **Resend** | `RESEND_API_KEY`, `RESEND_DOMAIN_VERIFIED`, `RESEND_WEBHOOK_SECRET`, `EMAIL_FROM`, `EMAIL_REPLY_TO` | `lib/email/resend-service.ts`, `lib/email/sender.ts`, `app/api/email/send/route.ts`, `app/api/email/webhook/route.ts` |
| **SendGrid** | `SENDGRID_API_KEY` | `lib/email/sender.ts` (multi-provider fallback) |
| **SMTP** | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | `lib/email/sender.ts` |
| **Mailchimp** | `MAILCHIMP_API_KEY`, `MAILCHIMP_AUDIENCE_ID`, `MAILCHIMP_SERVER_PREFIX` | `lib/integrations/` *(referenced but I didn't trace the wrapper file — env vars present)* |
| **ConvertKit** | `CONVERTKIT_API_KEY`, `CONVERTKIT_FORM_ID` | as above — env vars present, wrapper not traced |
| **GA4** | `GA4_MEASUREMENT_ID`, `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `GA4_API_SECRET`, `GA4_PROPERTY_ID`, `GOOGLE_SERVICE_ACCOUNT_KEY` (JSON blob fallback) | `lib/analytics/ga4-measurement-protocol.ts`, `lib/seo/ga4-data-api.ts`, `components/analytics-tracker.tsx` |
| **Google Search Console** | `GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL`, `GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY`, `GSC_SITE_URL`, `GSC_*` legacy + `GOOGLE_SERVICE_ACCOUNT_KEY` JSON blob fallback | `lib/seo/gsc-trend-analysis.ts`, `lib/seo/google-indexing-api.ts`, GSC API endpoints in chrome-bridge |
| **Google PageSpeed** | `GOOGLE_PAGESPEED_API_KEY`, `PAGESPEED_API_KEY`, `PSI_API_KEY` (all 3 fallback chain) | `lib/performance/site-auditor.ts`, `lib/seo/lighthouse-audit.ts` |
| **Google Ads** | `GOOGLE_ADS_CLIENT_ID`, `GOOGLE_ADS_CLIENT_SECRET`, `GOOGLE_ADS_DEVELOPER_TOKEN`, `GOOGLE_ADS_CUSTOMER_ID`, `GOOGLE_ADS_LOGIN_CUSTOMER_ID`, `GOOGLE_ADS_REFRESH_TOKEN` | `lib/integrations/` *(env vars present, wrapper not traced — likely dormant)* |
| **Google Drive** | `GOOGLE_DRIVE_CLIENT_ID`, `GOOGLE_DRIVE_CLIENT_SECRET`, `GOOGLE_DRIVE_REDIRECT_URI` | (admin page exists; integration partial) |
| **Google Trends** | `GOOGLE_TRENDS_API_KEY`, `GOOGLE_TRENDS_SERVICE_TYPE` | (env vars present, wrapper not traced) |
| **Google general** | `GOOGLE_API_KEY` | shared key |
| **IndexNow** | `INDEXNOW_KEY` (env var, not above grep) | `lib/seo/indexing-service.ts`, `app/api/indexnow-key/route.ts`, multi-engine submission to Bing + Yandex + api.indexnow.org |
| **DataForSEO** | `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD` | `lib/chrome-bridge/dataforseo.ts` (SERP + keyword research) |
| **Stripe** | `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY` | `lib/billing/stripe.ts`, `app/api/webhooks/stripe-agent/route.ts`, `lib/agents/tools/finance.ts` |
| **Mercury (banking)** | `MERCURY_API_KEY` | `lib/billing/mercury.ts` *(or similar — referenced in agents/tools/finance.ts)* |
| **Calendly** | `CALENDLY_ACCESS_TOKEN`, `CALENDLY_USER_URI` | (env vars present, wrapper not traced) |
| **Cloudflare** | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ZONE_ID` | (env vars present — likely DNS / cache purge) |
| **Charter Index (yacht inventory)** | `CHARTER_INDEX_API_KEY`, `CHARTER_INDEX_BASE_URL` | `lib/yacht/` (sync routes under app/api/admin/yachts/sync/) |
| **WhatsApp Cloud API** | `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_BUSINESS_ACCOUNT_ID`, `WHATSAPP_APP_SECRET` | `lib/agents/channels/whatsapp.ts`, `app/api/webhooks/whatsapp/route.ts` |
| **Twitter / X** | `TWITTER_API_KEY`, `TWITTER_API_SECRET`, `TWITTER_ACCESS_TOKEN`, `TWITTER_ACCESS_TOKEN_SECRET` | `lib/social/scheduler.ts` (uses `twitter-api-v2` dynamic import) |
| **Instagram (manual flow only)** | `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_BUSINESS_ACCOUNT_ID` | `lib/social/` |
| **TikTok (manual flow only)** | `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `TIKTOK_ACCESS_TOKEN` | `lib/social/` |
| **SerpAPI** | `SERPAPI_API_KEY` | (env var present, wrapper not traced) |
| **Slack / Discord notifications** | `SLACK_WEBHOOK_URL`, `DISCORD_WEBHOOK_URL` | (notification fallbacks) |
| **Kapso (proxy)** | `KAPSO_API_KEY`, `KAPSO_PROXY_ENABLED` | `lib/integrations/` |
| **Post Bridge** | `POST_BRIDGE_API_KEY`, `POST_BRIDGE_BASE_URL` | (purpose unclear from env scan — wrapper not traced) |
| **Supabase** | `DATABASE_URL`, plus `lib/supabase.ts` for non-Prisma client work | `lib/db.ts` (Prisma singleton), `lib/supabase.ts` |

**MCP servers (from `.mcp.json` and `scripts/`):**
- `scripts/mcp-google-server.ts` — GA4 + GSC tools for Claude Code sessions (env: GOOGLE_SERVICE_ACCOUNT_KEY, GA4_PROPERTY_ID, GSC_SITE_URL)
- `scripts/mcp-cj-server.ts` — CJ revenue/coverage tools for Claude Code
- `scripts/mcp-platform-server.ts` — Platform tools including Chrome Bridge wrappers

---

## 7. The .claude/ inventory

**Path: `/home/user/Yalla-london/.claude/` (repo root)**

- **Agents:** 11 in `.claude/agents/` (analytics-intelligence, brand-guardian, ceo-agent, content-pipeline, conversion-optimization, deploy-checker, frontend-optimization, growth-marketing, research-intelligence, seo-growth, session-auditor)
- **Commands (slash commands):** 17 in `.claude/commands/` — admin-rebuild, analytics-review, ceo, code-review, competitive-research, content-pipeline, conversion-audit, full-seo-audit, performance-audit, perplexity-computer, plan-review, qa, retro, security-scan, ship, site-health, tdd
- **Hooks:** 3 in `.claude/hooks/` — `session-start.sh` (SessionStart event), `post-edit-format.sh` (PostToolUse Write|Edit), `session-stop.sh` (Stop event)
- **Loops:** 1 file (`.claude/loops/README.md`) — documents 3 dev-only patterns (build health, pipeline watch, deploy watch); no active loops registered
- **Skills:** 47 in `.claude/skills/` — full grid: ab-test-setup, accessibility, admin-rebuild, analytics-tracking, browser-automation, content-creator, content-research-writer, copy-editing, copywriting, core-web-vitals, exa-search, firecrawl-scraper, form-cro, frontend-design, frontend-dev-guidelines, google-analytics, i18n-localization, marketing-strategy-pmm, multi-tenant-platform, nextjs-best-practices, page-cro, perplexity-computer, plan-review, playwright-skill, prisma-expert, programmatic-seo, qa-testing, react-best-practices, react-patterns, react-ui-patterns, roier-seo, schema-markup, seo, seo-audit, seo-fundamentals, seo-optimizer, ship, signup-flow-cro, site-health, social-content, tailwind-patterns, tavily-web, vercel-deploy, viral-generator-builder, web-performance-optimization, weekly-retro, workflow-orchestrator
- **Plans:** 2 in `.claude/plans/` — `platform-health-audit-plan.md`, `workflow-automation-plan.md`
- **Logs:** `.claude/logs/sessions/` (NOT shipped in zip — bloat, per task spec)

**`settings.json` (86 lines):**
- 31 allow rules (Skill, Read/Write/Edit/Glob/Grep/Agent + safe Bash patterns: npm/npx/node, all `git status*`, `git diff*`, `git log*`, `git branch*`, `git checkout*`, `git add *`, `git commit *`, `git push -u origin *`, `git fetch *`, `git pull *`, `git stash*`, `git merge*`, plus `ls *`, `mkdir *`, `wc *`, `cd *`, `cat *`, `head *`, `tail *`, `which *`, `echo *`, `pwd`, `date *`)
- 14 deny rules (`git push --force*`, `git push -f *`, `git reset --hard*`, `rm -rf *`, `rm -r /`, `npm publish*`, `npx prisma migrate reset*`, `npx prisma db push --force-reset*`, edit/write `.env*`, `**/credentials*`, `**/secrets*`)
- 3 hook events (SessionStart, PostToolUse Write|Edit, Stop) all running shell scripts in `.claude/hooks/`

---

## 8. Known Gaps reference

40 KG-XXX IDs found in `CLAUDE.md`. Ordered by ID; status inferred from CLAUDE.md text marking ("Resolved", "DONE", "FIXED", "DEPLOYED"):

| ID | One-line | Status |
|----|----------|--------|
| KG-001 | GA4 Dashboard not connected (returned 0s) | partially-addressed — MCP works; daily fetch landed |
| KG-018 | Dual content pipelines (8-phase + legacy direct) | open by design (both gated) |
| KG-019 | Duplicate IndexNow submission (seo-agent + seo/cron) | closed |
| KG-020 | 31 orphan Prisma models | open (low priority — needs `prisma validate` cleanup) |
| KG-021 | ~30 hardcoded URLs in API routes/lib | partially-addressed (most replaced w/ getSiteDomain()) |
| KG-022 | Hardcoded emails in code | closed |
| KG-023 | XSS via `dangerouslySetInnerHTML` (9 instances) | closed (sanitizeHtml/sanitizeSvg) |
| KG-024 | No rate limiting on admin login | closed (5/15min + middleware) |
| KG-025 | Pipeline race conditions (atomic claiming missing) | closed |
| KG-026 | Missing CSP headers | closed (already in next.config.js — false positive) |
| KG-027 | Brand templates exist only for Yalla London | closed (brand-provider.ts handles all 6 sites) |
| KG-028 | CRON_SECRET bypass (auth chain) | closed |
| KG-029 | daily-publish dead code | closed (deprecation stub) |
| KG-030 | Build-runner single-site | closed (loops all sites) |
| KG-031 | Trends monitor single-site | closed |
| KG-032 | Arabic SSR — `/ar/` renders English on server | closed (March 11 — `serverLocale` prop on BlogPostClient) |
| KG-033 | Related articles static-only | closed (DB + static merged) |
| KG-034 | Affiliate injection London-only | closed |
| KG-035 | No traffic/revenue data on dashboard | partially-addressed (cockpit calls fetchGA4Metrics) |
| KG-036 | No push/email alerts for cron failures | closed (CEO Inbox + email) |
| KG-037 | Scheduled-publish POST bypass (no gate) | closed |
| KG-038 | IndexNow 24h window | closed (extended to 7 days) |
| KG-039 | Blog slug global uniqueness | closed (queries scoped by siteId) |
| KG-040 | Unauthenticated database routes | closed |
| KG-041 | Admin setup password reset bypass | closed |
| KG-042 | 7 public mutation APIs missing auth | closed |
| KG-043 | 34 empty catch blocks | closed |
| KG-044 | Static metadata URLs | closed (generateMetadata + getBaseUrl) |
| KG-045 | 13+ admin pages show mock/fake data | partially-addressed (most purged Feb 18 audit) |
| KG-046 | 14+ admin buttons dead | partially-addressed (most wired) |
| KG-047 | Broken sidebar links to /admin/news, /admin/facts | partially-addressed (some still 404) |
| KG-048 | Analytics API credential exposure | closed |
| KG-049 | content-generator.ts crash | closed |
| KG-050 | 4 remaining XSS vectors | closed |
| KG-051 | Math.random() fake metrics | closed |
| KG-052 | Pre-pub gate meta description threshold mismatch | closed |
| KG-054 | Hotels/Experiences/Recommendations pages — static, no affiliate tracking | open |
| KG-056 | Perplexity quota exhausted | open (manual top-up needed) |
| KG-057 | OAuth flow UI for social account linking | open |
| KG-058 | AI-generated author personas — E-E-A-T risk | open (TeamMember rotation landed but personas still synthetic) |

---

## 9. WordPress integration status

WordPress integration **EXISTS** in the Yalla London codebase (it powers the WTME export path), and these files are included in the artifact zip under `lib/integrations/`:

- `lib/integrations/wordpress.ts` — main wrapper (likely auth + REST/XML-RPC client + post sync)
- `lib/integrations/wordpress-audit.ts` — audit/health checks against a WordPress target
- `app/api/admin/wordpress/route.ts` — admin API for WordPress operations
- `app/api/admin/wordpress/audit/route.ts` — audit endpoint
- `app/api/export/wordpress/route.ts` — WordPress export (likely WXR or REST-formatted blog content)
- `app/admin/wordpress/page.tsx` — admin UI

I did not deeply read these files for this handoff. They are present and shipped in the zip. The architect should treat this as **scaffolding to evaluate, not a finished WTME bridge** — there is no documented session in CLAUDE.md describing it as actively used or tested in production.

---

## 10. Questions surfaced during gathering

### Architectural ambiguities

1. **`Site` vs `Tenant` are parallel models that have NOT been reconciled.** Schema has both `Site` (used everywhere with `siteId`) and `Tenant` (introduced later, with `TenantIntegration`). Most queries use `siteId`, not `tenantId`. ZL Travel's multi-tenant story should pick one and migrate the other away. Architect: which one is the long-term primary?

2. **`*Premium` model duplicates** (`SitePremium`, `SiteThemePremium`, `HomepageVersionPremium`, `AuditLogPremium`, `ChangePremium`, `SiteMemberPremium`) — these look like leftovers from a "Premium" parallel schema. Zero references in code. Likely deletable.

3. **Variable Vault page exists, API doesn't.** `app/admin/variable-vault/page.tsx` is referenced (and present), but the **`app/api/admin/variable-vault/` route directory does not exist** — the page would fetch from a missing endpoint. Either the page is dead (use cockpit settings tab) or the API was deleted in cleanup.

4. **Two `chrome-audits` directories** with different purposes: `app/admin/chrome-audits/` (the audit viewer) and `app/api/admin/chrome-audits/` (alongside `chrome-bridge/`). Easy to confuse — the bridge endpoints are at `chrome-bridge/`, not `chrome-audits/`.

### Files I expected to find but didn't

5. **`lib/auth/` directory does not exist** — the task spec asked for "lib/auth/ — entire directory", but the codebase only has `lib/auth.ts`, `lib/auth-enhanced.ts`, and `lib/admin-middleware.ts` (which is the canonical auth import per CLAUDE.md rule #10). I shipped all three single files in lieu of the directory. Architect should treat `lib/admin-middleware.ts` as the primary auth contract (`requireAdmin`, `withAdminAuth`, `requireAdminOrCron`).

6. **`lib/cron/cron-feature-guard.ts` not at the path the task spec implied** — the actual file is `lib/cron-feature-guard.ts` (top-level, not inside `lib/cron/`). Shipped at the actual path inside the zip.

7. **`sweeper-agent` cron does not exist** — the closest match is `app/api/cron/sweeper/`, which is shipped. CLAUDE.md references `sweeper` consistently; `sweeper-agent` may be a typo in the task spec.

8. **Chrome Bridge endpoint count is 41, not 44** — see Section 4 for the discrepancy. Manifest is the source of truth.

### Integrations whose env vars exist but whose code I couldn't trace

9. `MAILCHIMP_*`, `CONVERTKIT_*`, `GOOGLE_ADS_*`, `GOOGLE_TRENDS_*`, `CALENDLY_*`, `CLOUDFLARE_*`, `KAPSO_*`, `POST_BRIDGE_*`, `SERPAPI_*`, `SLACK_WEBHOOK_URL`, `DISCORD_WEBHOOK_URL` — env vars are referenced somewhere in `lib/`, but I didn't trace the wrapper file to confirm active vs dormant. Architect should treat these as "configured but unverified" until reading the call sites.

10. **`MERCURY_API_KEY`** is referenced in agent finance tools but `lib/billing/mercury.ts` was not directly verified. CLAUDE.md mentions Mercury (banking integration) repeatedly — likely real but I didn't open the file.

### Other notes

11. **The Charter v0.3 document referenced in the task brief was not found in the repo.** I searched `Uploads/`, `docs/`, and the root for "charter" — only `docs/business-plans/YACHT-CHARTER-DEVELOPMENT-PLAN.md` exists, which is the Zenitha Yachts product doc, not a ZL Travel architecture charter. Architect: please re-share if needed.

12. **PROJECT_STATUS.md is auto-updated by Stop hook** — useful one-page status if the architect wants a "what changed last session" view. Not in zip but at repo root.

13. **No actual secrets were found in any shipped file.** I scanned for common patterns (sk-live-, sk-test-, AIza..., whsec_, xoxb-, GOCSPX-, hardcoded api_key=...). All AI provider, GA4, GSC, CJ, Travelpayouts, Stripe references are properly `process.env.X` — no inline values. `.env*` files were excluded by the staging step regardless.

14. **CLAUDE.md is 5,817 lines (456 KB)** — the largest single artifact. Architect should treat its "Critical Rules Learned" sections (rules 1–110+ at the bottom) as the authoritative bug registry. Every published rule represents a regression that has bitten the codebase before.

15. **Discovery audit context (April 30):** the platform is in a "PUBLISH FEWER, MUCH BETTER" reset phase. 239 articles published, 22 indexed, 19 with impressions, 3 organic clicks/week. Root cause was content quality + topical dilution, not infrastructure. The new `lib/standards/professional-standards.ts` (4-tier grading: Bronze → Platinum) is the going-forward standard. The legacy `lib/seo/standards.ts` is the currently-enforced floor; both shipped for diff context.
