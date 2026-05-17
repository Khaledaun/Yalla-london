# Claude Chrome Audit Reports

Reports uploaded by the Claude Chrome Bridge live here, organized by date and site.

## Directory Convention

```
docs/chrome-audits/
  YYYY-MM-DD/
    <siteId>/
      pages/
        <slug>.md          # per-page audit (SEO + AIO + UX + layout)
      sitewide.md          # sitewide audit (architecture, cross-cutting)
      action-log-triage.md # action log triage
      offsite.md           # backlinks + competitive + brand mentions
  PLAYBOOK.md              # auditor methodology + system prompt
  README.md                # this file
```

## Audit Types

| Type | Scope | Destination |
|------|-------|-------------|
| `per_page` | Single URL deep dive | `pages/<slug>.md` |
| `sitewide` | Architecture, internal linking, cross-cutting | `sitewide.md` |
| `action_log_triage` | Cron/API/audit log failure clustering | `action-log-triage.md` |
| `offsite` | Backlinks, brand mentions, competitive SERP | `offsite.md` |

## Report Structure (markdown frontmatter)

```yaml
---
siteId: yalla-london
pageUrl: https://www.yalla-london.com/blog/best-halal-restaurants-london
auditType: per_page
severity: warning
uploadedAt: 2026-04-20T16:35:00Z
agentTaskId: null  # filled when "Apply Fix" is clicked
---
```

Body follows the 5-pillar structure from `PLAYBOOK.md`:
1. On-page SEO
2. Technical SEO
3. AIO Readiness
4. UX / Readability
5. Off-site (when applicable)

## How Fixes Happen

1. Chrome Bridge uploads report → `ChromeAuditReport` row + markdown file + `AgentTask` record
2. Admin reviews on `/admin/chrome-audits` page
3. "Apply Fix" button → sets `AgentTask.status = queued`
4. Claude Code CLI reads queued tasks, applies fixes, commits directly, updates `ChromeAuditReport.fixedAt`
5. CEO Inbox gets plain-English note per batch

## Rotating the Bridge Token

The `CLAUDE_BRIDGE_TOKEN` env var in Vercel should be rotated monthly:

```bash
# Generate new token
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"

# Update in Vercel: Settings > Environment Variables > CLAUDE_BRIDGE_TOKEN
# Update in Claude Chrome connector config
```
