# Project Status — Yalla London / Zenitha.Luxury
> Auto-updated by Claude Code session hooks

## Last Session
- Date: 2026-04-04 21:57 UTC
- Branch: (auto-filled on session stop)
- Summary: Initial automation setup
- Files changed: 2 files

## Active Branches
| Branch | Purpose | Status |
|--------|---------|--------|
| `main` | Production | Active |
| `claude/audit-and-automation-setup-7kqNf` | Automation infrastructure | In progress |

## Health Checks
- Build: run `cd yalla_london/app && npx tsc --noEmit`
- Pipeline: check `/api/admin/queue-monitor`
- Crons: check `/admin/departures`
- Last deploy: check Vercel dashboard

## Quick Links
| Page | Path |
|------|------|
| Cockpit | `/admin/cockpit` |
| Departures Board | `/admin/departures` |
| Affiliate HQ | `/admin/affiliate-hq` |
| AI Costs | `/admin/ai-costs` |
| Cycle Health | `/admin/cockpit/health` |
| Per-Page Audit | `/admin/cockpit/per-page-audit` |
| Agent HQ | `/admin/agent` |
| Ops Dashboard | `/admin/ops/claude-dashboard` (dev only) |

## External Services
| Service | Status | Notes |
|---------|--------|-------|
| Vercel | Connected (Pro) | 42 cron jobs scheduled |
| Supabase | Connected (Pro) | 162+ Prisma models |
| GA4 | Configured | `G-H7YNG7CH88` |
| GSC | Configured | www.yalla-london.com |
| CJ Affiliate | Active | Vrbo approved |
| Travelpayouts | Active | 3 programs (Welcome Pickups, Tiqets, TicketNetwork) |
| Resend | Configured | Email sending active |
| Stay22 | Active | Auto-monetization |
| Ticketmaster | Configured | Live events |
| Unsplash | Configured | 50 req/hr free tier |

## Claude Code Automation
| Component | Count | Location |
|-----------|-------|----------|
| Custom agents | 11 | `.claude/agents/` |
| Commands | 17 | `.claude/commands/` |
| Skills | 47 | `.claude/skills/` |
| MCP servers | 3 | `.mcp.json` |
| Hooks | 3 | `.claude/hooks/` (SessionStart, PostToolUse, Stop) |
| Permissions | 31 allow / 13 deny | `.claude/settings.json` |
