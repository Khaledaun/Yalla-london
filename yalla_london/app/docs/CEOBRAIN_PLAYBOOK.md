# CEO Agent Operations Playbook

> How the CEO Agent works, what it can do, how to extend it.

## Overview

The CEO Agent is a business automation brain that handles customer interactions, CRM pipeline management, marketing metrics, and operational follow-ups. It processes events from multiple channels (WhatsApp, email, web, internal) through an AI tool-calling loop with safety gates.

## Architecture

```
Channel (WhatsApp/Email/Web/Internal)
    ↓ raw message
Event Router (lib/agents/event-router.ts)
    ↓ normalized CEOEvent
Contact Resolver (lib/agents/crm/contact-resolver.ts)
    ↓ ResolvedContact + history
CEO Brain (lib/agents/ceo-brain.ts)
    ↓ AI tool-calling loop (max 5 rounds)
    ↓ uses: Tool Registry → 18 tools
    ↓ checks: Safety Module → approval gates
    ↓ produces: CEOActionResult
Channel Adapter → send response back
    ↓
DB: Conversation + Message + InteractionLog
```

## Available Tools (18)

### CRM & Sales Pipeline
| Tool | What It Does |
|------|-------------|
| `crm_lookup` | Find contact by phone/email, return full history |
| `crm_create_lead` | Create new lead from inquiry |
| `crm_create_opportunity` | Open sales pipeline opportunity |
| `crm_update_stage` | Move opportunity through pipeline (new→qualifying→proposal→negotiation→won→lost) |
| `crm_log_interaction` | Track any touchpoint (message, inquiry, booking, complaint) |
| `crm_schedule_followup` | Schedule CEO Agent follow-up (creates AgentTask with dueAt) |

### Business Intelligence
| Tool | What It Does |
|------|-------------|
| `get_metrics` | GA4/GSC metrics: sessions, users, page views, top pages, traffic sources |
| `get_articles` | List recent/popular articles from BlogPost table |
| `search_knowledge` | Search published content to answer customer questions |
| `get_site_health` | Active alerts, cron health, pipeline status |
| `check_cron_health` | Query CronJobLog for recent failures |
| `check_pipeline_health` | Query queue-monitor for pipeline state |

### Content & Marketing
| Tool | What It Does |
|------|-------------|
| `get_content_pipeline_status` | Articles in each pipeline phase |
| `get_recent_topics` | Recently generated topic proposals |
| `get_affiliate_status` | Revenue, coverage, partner status |
| `get_finance_summary` | Stripe balance, recent payments |
| `send_email` | Send email to contact via Resend |
| `trigger_retention` | Start/pause email sequence for subscriber |
| `get_design_assets` | Brand kit, Canva video assets |

## Safety Rules

1. **Money actions** (refunds, billing, >$100 commitments) → require Khaled's WhatsApp approval
2. **Data deletion** (GDPR) → auto-execute via `/api/gdpr/delete` but log + notify
3. **Publishing** → auto-execute if passes pre-publication gate
4. **Rate limits** — max 100 outbound messages/day per channel, 20 AI calls/hour
5. **PII handling** — never include PII in AI prompts beyond first name + inquiry topic
6. **Escalation** — confidence < 0.6 OR complaint/legal/dispute → route to Khaled
7. **Finance events** — payment_failed, dispute_created always escalate
8. **Opportunity stage** — won/lost transitions always notify Khaled

## Cron Jobs

| Cron | Schedule | What It Does |
|------|----------|-------------|
| `ceo-intelligence` | Sundays 5:50 UTC | Weekly metrics, KPI comparison, AI plans, email report |
| `retention-executor` | Every 4h | Send due retention emails, trigger re-engagement, seed sequences |
| `followup-executor` | Every 4h | Process due AgentTask follow-ups via CEO Brain |
| `subscriber-emails` | Daily 11:00 UTC | Content notification emails |
| `campaign-executor` | Every 30min | Campaign enhancement batches |

## Retention Sequences (Default)

| Sequence | Trigger | Steps |
|----------|---------|-------|
| `welcome_series` | subscriber_created | Welcome (0h), Top Articles (48h), Newsletter Invite (168h) |
| `re_engagement` | 30d_inactive | Miss You (0h) |
| `post_booking` | opportunity_won | Booking Follow-up (24h) |

## How to Add a New Tool

1. Create the tool handler in `lib/agents/tools/<domain>.ts`:
   ```typescript
   export async function myNewTool(
     params: Record<string, unknown>,
     ctx: ToolContext,
   ): Promise<ToolResult> {
     // Implementation
     return { success: true, data: {...}, summary: "..." };
   }
   ```

2. Add the tool definition to `lib/agents/tool-registry.ts` in `CEO_TOOL_DEFS`:
   ```typescript
   { name: "my_new_tool", description: "...", parameters: {...}, execute: stub }
   ```

3. Wire the handler in `lib/agents/ceo-brain.ts` HANDLER_MAP:
   ```typescript
   my_new_tool: myNewTool,
   ```

4. Import the handler at the top of `ceo-brain.ts`.

## How to Add a New Channel

1. Create adapter in `lib/agents/channels/<channel>.ts` implementing:
   - `receive(rawPayload)` → CEOEvent
   - `send(response, externalId)` → delivery confirmation

2. Create webhook route at `app/api/webhooks/<channel>/route.ts`

3. Wire into event-router.ts for normalization

## How to Add a Retention Sequence

Call `seedDefaultSequences(siteId)` or create directly:
```typescript
const { prisma } = await import("@/lib/db");
await prisma.retentionSequence.create({
  data: {
    siteId: "yalla-london",
    name: "my_sequence",
    triggerEvent: "custom_trigger",
    steps: [
      { delayHours: 0, templateId: "welcome", subject: "Hello {{name}}!" },
      { delayHours: 48, templateId: "follow_up", subject: "Did you see this?" },
    ],
    active: true,
  },
});
```

Then trigger it:
```typescript
const { startSequence } = await import("@/lib/agents/crm/retention");
await startSequence(siteId, subscriberId, "custom_trigger");
```

## Monitoring

- **Agent HQ**: `/admin/agent` — CEO + CTO status, recent conversations
- **Conversation Browser**: `/admin/agent/conversations` — search + filter
- **Departures Board**: `/admin/departures` — cron schedule + Do Now buttons
- **Cycle Health**: `/admin/cockpit/health` — evidence-based diagnostics
- **AI Costs**: `/admin/ai-costs` — per-task AI spend tracking
- **CEO Inbox**: Cockpit Mission Control tab — automated incident response
