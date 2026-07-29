# Loop Patterns — Yalla London / Zenitha.Luxury

> These are **documented patterns only** — not auto-started.
> The 42 Vercel crons handle all production recurring tasks.
> Loops are for **local development monitoring** during active sessions.

## Available Loop Patterns

### 1. Build Health Monitor
```
/loop 15m "Run npx tsc --noEmit in yalla_london/app. Report ONLY errors. If zero errors, say 'Build clean'."
```
- **When to use:** During heavy refactoring or multi-file changes
- **Exit condition:** Build passes 3x consecutively
- **Token cost:** ~500/cycle
- **Never use when:** Just reading code or writing docs

### 2. Pipeline Watch
```
/loop 30m "Check queue health: how many drafts are stuck, what's the pipeline status? Use /api/admin/queue-monitor data."
```
- **When to use:** After modifying content pipeline code (phases.ts, build-runner.ts, select-runner.ts)
- **Exit condition:** Pipeline HEALTHY for 2h straight
- **Token cost:** ~800/cycle
- **Never use when:** Working on unrelated features (dashboard, design, affiliates)

### 3. Deploy Watch
```
/loop 5m "Check git log --oneline -3 and report if there's a new commit since last check. Say 'No new commits' or 'New: <commit message>'."
```
- **When to use:** After pushing, to monitor CI/deploy progress
- **Exit condition:** Deploy succeeds or fails
- **Token cost:** ~300/cycle
- **Never use when:** Not actively deploying

## Rules for Loop Usage

1. **Never run more than 1 loop simultaneously** — each loop consumes context on every cycle
2. **Always set an exit condition** — open-ended loops burn tokens indefinitely
3. **Never use loops for anything covered by Vercel crons** — content generation, SEO auditing, affiliate sync, analytics are all handled server-side
4. **Keep loop prompts minimal** — the prompt is re-sent every cycle; longer prompts = more token cost
5. **Stop loops before ending session** — they don't persist between sessions but waste budget if forgotten

## Vercel Cron Reference (DO NOT duplicate with loops)

| Category | Crons | Schedule |
|----------|-------|----------|
| Content Pipeline | content-builder, content-builder-create, content-selector, schedule-executor | Every 15min-2h |
| SEO | seo-agent (3x/day), seo-deep-review, gsc-sync, process-indexing-queue | Daily |
| Affiliates | affiliate-injection, sync-advertisers, sync-commissions, discover-deals | Daily |
| Analytics | analytics, gsc-sync | Daily |
| Maintenance | diagnostic-sweep, content-auto-fix, content-auto-fix-lite, sweeper | Every 2-4h |
| Publishing | scheduled-publish (2x/day), reserve-publisher | Daily |

See `vercel.json` for the full schedule of 42 cron jobs.
