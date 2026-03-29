---
name: perplexity-computer
description: "Manage Perplexity Computer agentic AI tasks — browser automation, form filling, competitive research, SEO audits, and business intelligence. Create tasks from templates, manage schedules, and monitor task execution across 10 use case categories."
---

# Perplexity Computer Skill

You are managing the **Perplexity Computer** integration for the Zenitha.Luxury LLC platform. Perplexity Computer is an agentic AI with 400+ integrations that can automate browser tasks, fill forms, conduct research, and monitor the AI landscape.

## What You Can Do

### Task Management
- **Create tasks** from 13 pre-built templates or custom prompts
- **Monitor tasks** — view status, results, errors across all 10 categories
- **Retry/cancel** failed or queued tasks
- **Batch create** multiple tasks at once

### Template System
13 templates across 7 categories, each with `{{variable}}` interpolation:
- `reg-affiliate-apply` — Apply to affiliate programs ({{programName}}, {{siteDomain}})
- `reg-directory-submit` — Submit to travel directories
- `seo-competitor-audit` — Full competitor SEO analysis
- `seo-ai-citation-check` — Check AI search engine citations
- `seo-gsc-deep-analysis` — Deep GSC analysis with PageSpeed
- `design-mystery-shopper` — UX audit as a real user
- `content-ai-trace-audit` — Trace content across AI platforms
- `content-photo-license-check` — Verify stock photo licensing
- `content-fact-check` — Fact-check published claims
- `intel-market-research` — Market opportunity research
- `intel-partnership-scan` — Scan for business partnerships
- `ai-travel-tool-scan` — Monitor AI travel tools landscape
- `strategy-content-gap` — Identify content gaps vs competitors

### Schedule Management
- **Create schedules** with cron expressions for recurring tasks
- **Toggle schedules** on/off without deleting
- **Seed recommended** schedules from templates that have built-in schedules

## API Endpoints

| Action | Endpoint | Method |
|--------|----------|--------|
| Dashboard data | `/api/admin/perplexity-tasks?view=dashboard` | GET |
| Task list | `/api/admin/perplexity-tasks?view=list&status=&category=` | GET |
| Single task | `/api/admin/perplexity-tasks?view=task&taskId=` | GET |
| Templates | `/api/admin/perplexity-tasks?view=templates` | GET |
| Schedules | `/api/admin/perplexity-tasks?view=schedules` | GET |
| Create task | `/api/admin/perplexity-tasks` | POST `{ action: "create", ... }` |
| Create from template | `/api/admin/perplexity-tasks` | POST `{ action: "create_from_template", templateId, variables }` |
| Batch create | `/api/admin/perplexity-tasks` | POST `{ action: "batch_create", tasks: [...] }` |
| Cancel | `/api/admin/perplexity-tasks` | POST `{ action: "cancel", taskId }` |
| Retry | `/api/admin/perplexity-tasks` | POST `{ action: "retry", taskId }` |
| Update status | `/api/admin/perplexity-tasks` | POST `{ action: "update_status", taskId, status, resultSummary, resultData }` |
| Create schedule | `/api/admin/perplexity-tasks` | POST `{ action: "create_schedule", ... }` |
| Toggle schedule | `/api/admin/perplexity-tasks` | POST `{ action: "toggle_schedule", scheduleId, enabled }` |
| Seed recommended | `/api/admin/perplexity-tasks` | POST `{ action: "seed_recommended" }` |

## 10 Use Case Categories (by ROI)

1. **registration** (9/10) — Affiliate signups, directory submissions
2. **content** (9/10) — Content quality audits, fact-checking
3. **seo** (8/10) — Competitor audits, citation checks, GSC analysis
4. **design** (8/10) — UX mystery shopping, design reviews
5. **ai-monitoring** (7/10) — AI travel tool landscape scanning
6. **intelligence** (7/10) — Market research, partnership scanning
7. **email** (7/10) — Email marketing setup automation
8. **strategy** (6/10) — Content gap analysis, revenue benchmarking
9. **social** (6/10) — Social media management
10. **development** (4/10) — Dev action items

## Key Files

| File | Purpose |
|------|---------|
| `lib/perplexity-computer/types.ts` | Type definitions |
| `lib/perplexity-computer/templates.ts` | 13 task templates |
| `lib/perplexity-computer/task-manager.ts` | CRUD, scheduling, dashboard |
| `lib/perplexity-computer/index.ts` | Public API barrel |
| `app/api/admin/perplexity-tasks/route.ts` | API route (GET + POST) |
| `app/api/cron/perplexity-scheduler/route.ts` | Cron for schedule processing |
| `app/admin/perplexity-computer/page.tsx` | Admin dashboard UI |

## Integration Points

- **CEO Agent**: `assistant-context.ts` includes `perplexityStatus` field
- **CEO System Prompt**: Perplexity task actions included in available actions
- **Departures Board**: `perplexity-scheduler` cron in whitelist
- **Sidebar Nav**: Under "AI Tools" section
- **Cycle Health**: Perplexity task queue monitored for alerts

## Cost Management

- Each template has `estimatedCredits` (5-50 credits per task)
- Dashboard tracks credits used (7d) and estimated queued
- Perplexity Max tier: ~$200/mo, 4,000 bonus credits for Pro
- Priority system (critical/high/medium/low) helps budget allocation
