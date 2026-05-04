# CEO + CTO Agent Platform — Architecture Document

**Date:** March 27, 2026
**Author:** Claude Code (CTO Agent prototype)
**Version:** 1.0
**Related:** `docs/CEOBRAIN_DISCOVERY.md` (existing infrastructure)

---

## 1. System Architecture

```
                         INBOUND CHANNELS
            ┌──────────┬──────────┬──────────┬──────────┐
            │ WhatsApp │  Email   │   Web    │ Internal │
            │ Cloud API│  Resend  │  Forms   │  Crons   │
            └────┬─────┴────┬─────┴────┬─────┴────┬─────┘
                 │          │          │          │
                 ▼          ▼          ▼          ▼
            ┌──────────────────────────────────────────┐
            │           EVENT ROUTER                    │
            │  lib/agents/event-router.ts               │
            │  • Normalize any channel → CEOEvent       │
            │  • Resolve contact (CRM lookup)            │
            │  • Classify intent (AI or rule-based)      │
            │  • Route to CEO or CTO agent               │
            └──────────┬───────────────────┬───────────┘
                       │                   │
              ┌────────▼────────┐ ┌────────▼────────┐
              │   CEO AGENT     │ │   CTO AGENT     │
              │ lib/agents/     │ │ lib/agents/     │
              │ ceo-brain.ts    │ │ cto-brain.ts    │
              │                 │ │                 │
              │ • Build context │ │ • SCAN crons    │
              │ • AI tool loop  │ │ • BROWSE docs   │
              │ • Safety gates  │ │ • PROPOSE fixes │
              │ • Route response│ │ • EXECUTE safe  │
              │                 │ │ • REPORT results│
              └────────┬────────┘ └────────┬────────┘
                       │                   │
              ┌────────▼───────────────────▼────────┐
              │         SHARED TOOL LAYER            │
              │     lib/agents/tool-registry.ts      │
              │                                      │
              │  CRM    Analytics  Content   SEO     │
              │  Email  Affiliate  Finance   Design  │
              │  Browse Repo       QA                │
              └────────┬───────────────────┬────────┘
                       │                   │
              ┌────────▼───────────────────▼────────┐
              │      EXISTING PLATFORM SYSTEMS       │
              │  (unchanged — agents wrap, never     │
              │   modify these directly)             │
              │                                      │
              │  lib/ai/provider.ts     (AI calls)   │
              │  lib/email/resend-*.ts  (Email)      │
              │  lib/affiliate/*.ts     (Revenue)    │
              │  lib/seo/orchestrator/  (SEO)        │
              │  lib/ops/ceo-inbox.ts   (Alerts)     │
              │  lib/ceo-engine/*.ts    (Metrics)    │
              │  lib/billing/stripe.ts  (Finance)    │
              │  lib/design/brand-*.ts  (Design)     │
              │  config/sites.ts        (Config)     │
              └─────────────────────────────────────┘
```

---

## 2. CRM Entity-Relationship Diagram

```
                    ┌──────────────────┐
                    │   Conversation   │
                    │                  │
                    │  id (PK)         │
                    │  siteId          │
                    │  channel         │
                    │  externalId      │
                    │  contactName     │
                    │  contactEmail    │
                    │  contactPhone    │
                    │  status          │
                    │  summary         │
                    │  sentiment       │
                    │  tags[]          │
                    │  lastMessageAt   │
                    │  leadId ─────────┼───────┐
                    │  subscriberId ───┼───┐   │
                    │  inquiryId ──────┼─┐ │   │
                    │  opportunityId ──┼┐│ │   │
                    └──────┬───────────┘││ │   │
                           │            ││ │   │
                    ┌──────▼──────┐     ││ │   │
                    │   Message   │     ││ │   │
                    │             │     ││ │   │
                    │  id (PK)    │     ││ │   │
                    │  conv.Id(FK)│     ││ │   │
                    │  direction  │     ││ │   │
                    │  channel    │     ││ │   │
                    │  content    │     ││ │   │
                    │  contentType│     ││ │   │
                    │  mediaUrls[]│     ││ │   │
                    │  senderName │     ││ │   │
                    │  agentId    │     ││ │   │
                    │  toolsUsed[]│     ││ │   │
                    │  confidence │     ││ │   │
                    │  approved   │     ││ │   │
                    └─────────────┘     ││ │   │
                                        ││ │   │
   ┌────────────────────────────────────┘│ │   │
   │  ┌──────────────────────────────────┘ │   │
   │  │  ┌────────────────────────────────┘   │
   │  │  │  ┌────────────────────────────────┘
   │  │  │  │
   │  │  │  │   EXISTING MODELS (unchanged)
   │  │  │  │
   │  │  │  │  ┌────────────────┐
   │  │  │  └──► Lead           │
   │  │  │     │                │
   │  │  │     │  id (PK)       │
   │  │  │     │  site_id       │
   │  │  │     │  email         │
   │  │  │     │  name          │
   │  │  │     │  phone         │
   │  │  │     │  lead_type     │
   │  │  │     │  lead_source   │
   │  │  │     │  score         │
   │  │  │     │  score_factors │
   │  │  │     │  status        │
   │  │  │     │  value         │
   │  │  │     │  mkt_consent   │
   │  │  │     └───────┬────────┘
   │  │  │             │ activities[]
   │  │  │             ▼
   │  │  │     ┌────────────────┐
   │  │  │     │  LeadActivity  │
   │  │  │     └────────────────┘
   │  │  │
   │  │  │  ┌────────────────────┐
   │  │  └──► Subscriber         │
   │  │     │                    │
   │  │     │  id (PK)           │
   │  │     │  site_id           │
   │  │     │  email             │
   │  │     │  first_name        │
   │  │     │  last_name         │
   │  │     │  status (enum)     │
   │  │     │  engagement_score  │
   │  │     │  unsubscribed_at   │
   │  │     └────────┬───────────┘
   │  │              │ consentLogs[]
   │  │              ▼
   │  │     ┌────────────────────┐
   │  │     │  ConsentLog        │
   │  │     └────────────────────┘
   │  │
   │  │  ┌──────────────────────┐
   │  └──► CharterInquiry       │
   │     │                      │
   │     │  id (PK)             │
   │     │  firstName, lastName │
   │     │  email, phone        │
   │     │  whatsappNumber      │
   │     │  destination         │
   │     │  budget, guestCount  │
   │     │  yachtTypePreference │
   │     │  status (enum)       │
   │     │  brokerAssigned      │
   │     │  siteId              │
   │     └──────────────────────┘
   │
   │     NEW MODELS
   │
   │  ┌───────────────────────┐
   └──► CrmOpportunity        │
      │                       │
      │  id (PK)              │
      │  siteId               │
      │  leadId ──────────────┼──► Lead
      │  inquiryId ───────────┼──► CharterInquiry
      │  subscriberId ────────┼──► Subscriber
      │  contactName          │
      │  contactEmail         │
      │  contactPhone         │
      │  stage (pipeline)     │
      │  value (deal $)       │
      │  source               │
      │  lostReason           │
      │  nextAction           │
      │  nextActionAt         │
      │  assignedTo           │
      │  tags[]               │
      │  closedAt             │
      └───────────┬───────────┘
                  │ interactions[]
                  ▼
      ┌───────────────────────┐
      │  InteractionLog       │
      │                       │
      │  id (PK)              │
      │  siteId               │
      │  opportunityId (FK)───┼──► CrmOpportunity
      │  conversationId (FK)──┼──► Conversation
      │  leadId               │
      │  channel              │
      │  direction            │
      │  interactionType      │
      │  summary              │
      │  sentiment            │
      │  agentId              │
      └───────────────────────┘


      ┌───────────────────────┐
      │  AgentTask            │
      │                       │
      │  id (PK)              │
      │  agentType (ceo/cto)  │
      │  taskType             │
      │  priority             │
      │  status               │
      │  description          │
      │  input/output (Json)  │
      │  changes[]            │
      │  testsRun[]           │
      │  findings[]           │
      │  followUps[]          │
      │  durationMs           │
      │  siteId               │
      │  conversationId       │
      │  dueAt                │
      │  completedAt          │
      └───────────────────────┘


      RETENTION SYSTEM

      ┌───────────────────────┐
      │  RetentionSequence    │
      │                       │
      │  id (PK)              │
      │  siteId               │
      │  name (unique w/site) │
      │  triggerEvent         │
      │  steps (Json[])       │──── Array of {delayHours, templateId, subject}
      │  active               │
      └───────────┬───────────┘
                  │
                  ▼
      ┌───────────────────────┐
      │  RetentionProgress    │
      │                       │
      │  id (PK)              │
      │  sequenceId (FK) ─────┼──► RetentionSequence
      │  subscriberId ────────┼──► Subscriber
      │  currentStep          │
      │  status               │
      │  lastSentAt           │
      │  nextSendAt           │
      │  (unique: seq+sub)    │
      └───────────────────────┘


      FINANCE TRACKING

      ┌───────────────────────┐
      │  FinanceEvent         │
      │                       │
      │  id (PK)              │
      │  siteId               │
      │  source (stripe/etc)  │
      │  eventType            │
      │  externalId           │
      │  amount               │
      │  currency             │
      │  contactEmail         │
      │  opportunityId        │
      │  status               │
      │  agentAction          │
      │  processedAt          │
      └───────────────────────┘
```

---

## 3. CEO Agent — Event Processing Flow

```
STEP 1: INBOUND
  WhatsApp webhook / Email forward / Web form / Internal cron alert
      │
      ▼
STEP 2: NORMALIZE (event-router.ts)
  Parse channel-specific payload → CEOEvent {
    channel, direction, content, contentType,
    senderPhone, senderEmail, senderName,
    siteId, timestamp, rawPayload
  }
      │
      ▼
STEP 3: RESOLVE CONTACT (crm/contact-resolver.ts)
  phone/email → Lead + Subscriber + CharterInquiry + CrmOpportunity
  → ResolvedContact {
    name, email, phone, leadId, subscriberId,
    inquiryId, opportunityId, score, status,
    recentInteractions[], tags[], hasMarketingConsent
  }
      │
      ▼
STEP 4: BUILD CONTEXT (ceo-brain.ts)
  CEOEvent + ResolvedContact + Brand + Conversation History
  → CEOContext {
    event, contact, siteId, brandProfile,
    conversationHistory, permissions, safetyConfig
  }
      │
      ▼
STEP 5: AI TOOL-CALLING LOOP (ceo-brain.ts)
  System prompt + context → generateCompletion() → tool calls → results
  → repeat until AI produces final response (max 5 iterations)
      │
      ▼
STEP 6: SAFETY CHECK (safety.ts)
  Check response against guardrails:
  • Money actions >$100 → needs_approval
  • Confidence <0.6 → escalate to Khaled
  • PII in response → redact
  • Rate limit check → throttle
      │
      ▼
STEP 7: EXECUTE & RESPOND
  • Store Message in Conversation
  • Log InteractionLog
  • Update CrmOpportunity stage (if applicable)
  • Schedule follow-up AgentTask (if applicable)
  • Send response via channel adapter
      │
      ▼
STEP 8: POST-PROCESS
  • Score lead (lead-scoring.ts)
  • Start retention sequence (if new subscriber)
  • Update conversation summary (AI)
```

---

## 4. CTO Agent — Maintenance Loop

```
PHASE 1: SCAN (budget: 5 min)
  ├─ Query CronJobLog for recurring failures
  ├─ Check TypeScript errors (tsc --noEmit)
  ├─ Check smoke test results
  ├─ Check queue-monitor health snapshot
  └─ Output: prioritized issue list

PHASE 2: BROWSE (budget: 3 min, if issues found)
  ├─ Fetch relevant docs (allow-listed domains only)
  ├─ Check for deprecation notices
  └─ Output: research context per issue

PHASE 3: PROPOSE (budget: 2 min)
  ├─ Generate fix proposals via AI
  ├─ Classify each: auto-fixable | needs-approval | info-only
  └─ Output: proposal list with confidence scores

PHASE 4: EXECUTE (budget: 5 min, auto-fixable only)
  ├─ Apply small, safe changes
  ├─ Run tests after each change
  ├─ Revert on test failure
  └─ Output: changes applied + test results

PHASE 5: REPORT (budget: 1 min)
  ├─ Write AgentTask record with findings
  ├─ Send summary email if findings > 0
  ├─ Update CTOBRAIN_LOG.md
  └─ Output: report delivered
```

---

## 5. CRM Pipeline Stages

```
  NEW ──► QUALIFYING ──► PROPOSAL ──► NEGOTIATION ──► WON
   │          │             │              │            │
   └──────────┴─────────────┴──────────────┴────► LOST
                                                    │
                                              lostReason stored

Stage transitions:
  • new → qualifying: first meaningful interaction
  • qualifying → proposal: budget + dates confirmed
  • negotiation → won: booking confirmed / payment received
  • any → lost: explicit rejection or 30d no response
  • won/lost → notify Khaled via WhatsApp always
```

---

## 6. Tool Registry — CEO Agent Tools

### CRM & Sales Pipeline
| Tool ID | Wraps | Safety |
|---------|-------|--------|
| `crm_lookup` | contact-resolver.ts | auto |
| `crm_create_lead` | prisma.lead.create | auto |
| `crm_create_opportunity` | prisma.crmOpportunity.create | auto |
| `crm_update_stage` | prisma.crmOpportunity.update | needs_approval (won/lost) |
| `crm_log_interaction` | prisma.interactionLog.create | auto |
| `crm_schedule_followup` | prisma.agentTask.create | auto |

### Business Intelligence
| Tool ID | Wraps | Safety |
|---------|-------|--------|
| `get_metrics` | lib/ceo-engine/intelligence.ts | auto |
| `get_articles` | prisma.blogPost.findMany | auto |
| `get_affiliate_status` | lib/affiliate/monitor.ts | auto |
| `get_site_health` | lib/ops/ceo-inbox.ts | auto |
| `get_finance_summary` | lib/billing/stripe.ts + FinanceEvent | auto |
| `search_knowledge` | BlogPost full-text search | auto |

### Content & Marketing
| Tool ID | Wraps | Safety |
|---------|-------|--------|
| `trigger_content` | content pipeline | needs_approval |
| `send_email` | lib/email/resend-service.ts | auto |
| `trigger_retention` | retention.ts | auto |
| `get_design_assets` | lib/design/brand-provider.ts | auto |

---

## 7. Tool Registry — CTO Agent Tools

| Tool ID | Type | Safety |
|---------|------|--------|
| `read_file` | Repo | auto |
| `search_code` | Repo | auto |
| `list_files` | Repo | auto |
| `run_typecheck` | QA | auto |
| `run_smoke_tests` | QA | auto |
| `run_build` | QA | needs_approval |
| `http_get` | Browse | auto (allow-listed) |
| `web_search` | Browse | auto (allow-listed) |
| `check_cron_health` | Ops | auto |
| `check_pipeline_health` | Ops | auto |

### CTO Browsing Allow-List
- `nextjs.org/docs/*`
- `www.prisma.io/docs/*`
- `vercel.com/docs/*`
- `developers.google.com/*`
- `developer.mozilla.org/*`
- `www.yalla-london.com/*`
- `github.com/khaledaun/*`

---

## 8. Safety & Guardrails

| Rule | Trigger | Action |
|------|---------|--------|
| Money guard | >$100 commitment, refund, billing change | `needs_approval` → WhatsApp Khaled |
| Confidence gate | AI confidence < 0.6 | Escalate to Khaled |
| Complaint/legal | Topic is complaint, legal, dispute | Escalate to Khaled |
| PII filter | Personal data in AI prompt | Strip to first name + IDs only |
| Rate limit | >100 outbound msgs/day/channel | Throttle + warn |
| AI budget | >20 AI calls/hour | Queue remaining |
| Stage notify | Opportunity → won or lost | Always notify Khaled |
| Finance escalate | payment_failed, dispute_created | Always escalate |
| Data deletion | GDPR request | Auto-execute + log + notify |
| Publishing | New article/social post | Auto if passes pre-pub gate |

---

## 9. Channel Adapters

Each adapter implements the `ChannelAdapter` interface:

```typescript
interface ChannelAdapter {
  channel: Channel;
  parseInbound(rawPayload: unknown): CEOEvent | null;
  sendResponse(to: string, content: string, options?): Promise<boolean>;
  sendTemplate?(to: string, templateName: string, params: Record<string, string>): Promise<boolean>;
  verifySignature?(headers: Headers, body: string): boolean;
}
```

| Adapter | Protocol | Auth | Send Capability |
|---------|----------|------|-----------------|
| WhatsApp | Meta Cloud API (HTTP) | Verify token + app secret HMAC | Text, template, media |
| Email | Resend SDK | API key | HTML email (React Email) |
| Web | HTTP POST | Session/CSRF | JSON response |
| Internal | Direct function call | N/A | CronJobLog + AgentTask |

---

## 10. Data Flow — WhatsApp Example

```
1. User sends "I want to book a yacht in Mykonos" on WhatsApp
2. Meta Cloud API → POST /api/webhooks/whatsapp
3. Webhook verifies HMAC signature
4. WhatsApp adapter parses → CEOEvent {
     channel: "whatsapp",
     content: "I want to book a yacht in Mykonos",
     senderPhone: "+971501234567",
     siteId: "zenitha-yachts-med"
   }
5. Event router → resolveContact(phone: "+971501234567")
   → ResolvedContact { name: "Ahmed", leadId: "...", score: 45 }
6. CEO Brain builds context:
   - Contact: Ahmed, score 45, 2 prior interactions
   - Brand: Zenitha Yachts, navy+gold palette
   - History: asked about Santorini last week
7. AI tool-calling loop:
   - Call 1: crm_create_opportunity(stage: "qualifying", destination: "Mykonos")
   - Call 2: search_knowledge("yacht charter Mykonos")
   - Call 3: AI generates response with yacht recommendations
8. Safety check: no money commitment, confidence 0.85 → auto
9. Store Message, InteractionLog, update Conversation
10. WhatsApp adapter sends response with yacht images
11. Post-process: scoreAndUpdateLead → score 65 (upgrade from 45)
```

---

## 11. Integration Points Summary

| Existing System | CEO Agent Integration | CTO Agent Integration |
|----------------|----------------------|----------------------|
| `lib/ai/provider.ts` | `generateCompletion()` for intent + response | `generateCompletion()` for fix proposals |
| `lib/ceo-engine/intelligence.ts` | `get_metrics` tool wraps KPI gathering | `check_pipeline_health` wraps health |
| `lib/ops/ceo-inbox.ts` | Agent failures → existing inbox | Check recurring patterns |
| `lib/email/resend-service.ts` | Email adapter + retention sends | Send CTO report emails |
| `lib/affiliate/monitor.ts` | `get_affiliate_status` tool | Check affiliate health |
| `lib/seo/orchestrator/*` | Report SEO health to customers | Audit SEO compliance |
| `lib/billing/stripe.ts` | Process FinanceEvents | — |
| `lib/design/brand-provider.ts` | `get_design_assets` tool | — |
| `config/sites.ts` | Read site config (never write) | Read site config |
| `lib/content-pipeline/*` | Trigger content creation | Check pipeline health |
| Prisma (Lead, Subscriber, etc.) | Full CRM resolution + creation | — |

---

## 12. File Map

```
lib/agents/
├── types.ts                     ← All interfaces (CEOEvent, CEOContext, etc.)
├── ceo-brain.ts                 ← CEO Agent core loop
├── cto-brain.ts                 ← CTO Agent maintenance loop
├── event-router.ts              ← Normalize + route events
├── tool-registry.ts             ← Unified tool definitions
├── safety.ts                    ← Guardrails + approval gates
├── channels/
│   ├── types.ts                 ← ChannelAdapter interface
│   ├── whatsapp.ts              ← WhatsApp Cloud API
│   ├── email.ts                 ← Resend wrapper
│   ├── web.ts                   ← Web form/chat
│   └── internal.ts              ← System events
├── tools/
│   ├── crm.ts                   ← CRM pipeline tools
│   ├── content.ts               ← Content pipeline tools
│   ├── analytics.ts             ← GA4/GSC tools
│   ├── seo.ts                   ← SEO tools
│   ├── affiliate.ts             ← Revenue tools
│   ├── finance.ts               ← Stripe/Mercury tools
│   ├── email-send.ts            ← Email sending tools
│   ├── design.ts                ← Brand/design tools
│   ├── browsing.ts              ← CTO: HTTP fetch
│   ├── repo.ts                  ← CTO: code inspection
│   └── qa.ts                    ← CTO: test runner
└── crm/
    ├── contact-resolver.ts      ← Phone/email → unified contact
    ├── lead-scoring.ts          ← Auto-score leads
    └── retention.ts             ← Email sequence engine
```

---

## 13. Deployment Requirements

### Environment Variables (New)
| Var | Required By | Purpose |
|-----|-------------|---------|
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp adapter | Meta Business API |
| `WHATSAPP_ACCESS_TOKEN` | WhatsApp adapter | Meta Business API |
| `WHATSAPP_VERIFY_TOKEN` | Webhook verification | Custom string |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | WhatsApp adapter | Meta Business API |

### Prisma Migration
```bash
npx prisma migrate deploy
# Creates: conversations, messages, agent_tasks, crm_opportunities,
#          interaction_logs, retention_sequences, retention_progress,
#          finance_events
```

### New Cron Jobs
| Cron | Schedule | Purpose |
|------|----------|---------|
| `agent-maintenance` | Weekly Sunday 3:00 UTC | CTO maintenance loop |
| `retention-executor` | Daily 10:00 UTC | Process due retention emails |

---

## 14. Scope Boundaries

The agent platform does NOT:
1. Replace any existing system — wraps them via tool layer
2. Train custom AI models — uses existing `generateCompletion()`
3. Handle voice/calls — text channels only
4. Initiate financial transactions — reports only
5. Deploy code automatically — CTO proposes, human deploys
6. Require new npm packages — WhatsApp is HTTP fetch
7. Use a separate database — same Supabase/Prisma
8. Build a real-time web chat — web adapter is for forms
9. Integrate Instagram/TikTok DMs — APIs unreliable
10. Replace Canva — shares existing video registry links
