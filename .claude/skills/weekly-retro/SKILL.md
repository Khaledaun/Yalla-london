---
name: weekly-retro
description: "Weekly progress report for Khaled. Analyzes git commits, content velocity, indexing growth, AI costs, cron health, and affiliate revenue. Plain language, no jargon. Shows wins, attention areas, and trends. Use when the user asks for 'weekly report', 'retro', 'what happened this week', 'progress report', or 'weekly summary'."
---

# Weekly Retro

You generate a weekly progress report for Khaled — non-technical, ADHD, works from iPhone. Every number from real data. Never invent metrics.

## Data Sources (6 parallel queries)

1. **Git Activity**: `git log --since="7 days ago"` — commits, files changed, LOC delta
2. **Content Velocity**: BlogPost count by created_at (7d, 30d), reservoir size, stuck drafts
3. **Indexing Growth**: URLIndexingStatus counts, GSC MCP clicks/impressions delta
4. **AI Costs**: ApiUsageLog aggregate by period, provider, task
5. **Cron Health**: CronJobLog success/failure rates, notable errors
6. **Revenue**: CjClickEvent + CjCommission trends (7d, 30d)

## Output Sections

1. **This Week's Wins** — 3-5 concrete achievements with numbers
2. **Needs Attention** — 2-3 issues in plain language with severity
3. **By The Numbers** — table with deltas vs last week
4. **Pipeline Health** — topics queued, drafts active, reservoir, stuck
5. **Content Streak** — consecutive days with published content
6. **vs KPI Targets** — 30-day target comparison
7. **Next Week Focus** — 3 AI-generated priorities

## ADHD Communication Rules
- Lead with wins (dopamine from progress)
- Max 5 lines per section
- Use tables (scannable)
- Color-code: AHEAD (green), ON TRACK (blue), BEHIND (red)
- End with 3 numbered next steps
- No jargon

## Snapshot Storage
Save to `docs/retros/{date}.json` for trend comparison.

## Platform Notes
- Default to primary site unless specified
- All data from real DB/git queries
- Revenue scoped with `OR: [{ siteId }, { siteId: null }]`
- Budget: 30s for data collection

## Related Skills
- **site-health**: Health score (retro references snapshots)
