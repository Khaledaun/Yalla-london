# Workflow Automation Plan — Yalla London / Zenitha.Luxury

> **Created**: 2026-04-03
> **Status**: AWAITING APPROVAL
> **Scope**: 7 phases of Claude Code automation infrastructure
> **Estimated files created/modified**: ~25

---

## Executive Summary

This plan adds the operational automation layer that turns the existing Claude Code configuration (9 agents, 47 skills, 17 commands, 3 MCP servers) from "tools available" to "tools running automatically." The project has enterprise-grade tooling but almost zero automation infrastructure — no hooks, no session logging, no auto-formatting enforcement, no project status tracking, and permissions that only allow "Skill".

---

## Current State Inventory

### What EXISTS
| Category | Count | Location |
|----------|-------|----------|
| Custom agents | 9 | `.claude/agents/` |
| Commands | 17 | `.claude/commands/` |
| Skills | 47 | `.claude/skills/` |
| MCP servers | 3 | `.mcp.json` (GA4/GSC, CJ Affiliate, Platform Control) |
| DESIGN.md | 1 (8K+ lines) | `/DESIGN.md` |
| Husky pre-commit | 1 | `.husky/pre-commit` → lint-staged (eslint + prettier) |
| Stop hook | 1 | `~/.claude/stop-hook-git-check.sh` (global, git status check) |
| Global settings | 1 | `~/.claude/settings.json` (only allows "Skill") |
| CI workflows | 5 | `.github/workflows/` |
| Cron jobs | 42 | `vercel.json` |
| Prisma models | 162+ | `prisma/schema.prisma` |
| NPM scripts | 60+ | `yalla_london/app/package.json` |
| ESLint config | 1 | `yalla_london/app/.eslintrc.json` (next/core-web-vitals, warns) |

### What's MISSING (This Plan Creates)
- No project-level `.claude/settings.json` (everything global)
- No hooks beyond a basic global Stop hook
- No session logging (`.claude/logs/`)
- No `.claude/loops/` documentation
- No `PROJECT_STATUS.md`
- No ops dashboard for Claude Code automation visibility
- Permission allow/deny lists are empty beyond "Skill"

---

## Boris Cherny's Claude Code Patterns — Mapped to This Project

### Pattern 1: Hooks (HIGH VALUE)

**What they are:** Shell commands that run automatically at Claude Code lifecycle events.

**Hook Events Available:**
| Event | Trigger | Stdin JSON | Use Case |
|-------|---------|------------|----------|
| `SessionStart` | Session begins | `{session_id, cwd}` | Load project context, check health |
| `PreToolUse` | Before any tool call | `{tool_name, tool_input}` | Block dangerous operations |
| `PostToolUse` | After any tool call | `{tool_name, tool_input, tool_output}` | Auto-format, validate, log |
| `Stop` | Agent stops | `{session_id, stop_hook_active}` | Git check, session summary |
| `Notification` | Notifications sent | `{message}` | Route to phone (future) |

**Hook Configuration (in settings.json):**
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [{ "type": "command", "command": "script.sh" }]
      }
    ]
  }
}
```

**Exit codes:** 0 = success, 2 = blocking error (stops the tool call for PreToolUse hooks).

**For this project:**
- **SessionStart** → load git status, recent cron health, pipeline state (~2s)
- **PostToolUse (Write|Edit)** → auto-format .ts/.tsx/.css/.json files with prettier (~1s per file)
- **Stop** → session summary log + git status check (extends existing global hook)

**Pitfalls:** Hooks >5s slow down every interaction. Keep them fast. PostToolUse runs on EVERY tool call matching the pattern — heavy logic kills productivity.

### Pattern 2: Permissions (HIGH VALUE)

**What they are:** Allow/deny lists in settings.json that control which tool calls are auto-approved vs require user confirmation.

**Evaluation order:** deny (checked first) → allow → ask (default).

**Pattern syntax:**
- `Bash(npm run *)` — allows any npm run command
- `Edit:yalla_london/app/**` — allows edits anywhere in the app
- `Bash(git push --force*)` — denies force push

**For this project:** The current `"allow": ["Skill"]` forces permission prompts for every bash command, edit, and write. Need to pre-allow safe development commands while denying destructive operations.

### Pattern 3: Custom Agents (MEDIUM VALUE)

**What they are:** Markdown files with YAML frontmatter in `.claude/agents/`.

**Key frontmatter fields:**
```yaml
---
name: agent-name
description: What triggers automatic delegation
model: sonnet  # or opus, haiku
tools: [Read, Grep, Glob, Bash, Edit, Write]
disallowedTools: [Agent]
permissionMode: auto  # or default, bypassPermissions
isolation: worktree  # runs in isolated git worktree
maxTurns: 25
---
```

**For this project:** Existing 9 agents have basic frontmatter but lack `tools`, `permissionMode`, and `isolation` scoping. Enhancement approach: add proper frontmatter to existing agents, create 2 new agents that fill gaps.

### Pattern 4: /loop (LOW-MEDIUM VALUE)

**What it is:** Runs a prompt on a recurring interval. Syntax: `/loop 5m /foo` (defaults to 10m).

**For this project:** 42 Vercel crons already handle recurring tasks. Loops are only useful for local dev monitoring (build health, deployment watch) — document patterns, don't auto-activate.

**Cost implications:** Each cycle consumes tokens. A 10-minute loop for 1 hour = 6 cycles. Keep prompts minimal.

---

## Implementation Plan

### PHASE 1: HOOKS

**Files to create:**
- `.claude/hooks/session-start.sh`
- `.claude/hooks/post-edit-format.sh`
- `.claude/hooks/session-stop.sh`

**Hook configuration goes in `.claude/settings.json` (Phase 2).**

#### Hook 1: SessionStart
```bash
#!/usr/bin/env bash
# Reads stdin JSON: {session_id, cwd}
# Outputs to stderr (displayed to user)

set -euo pipefail
cd "$(jq -r '.cwd' < /dev/stdin)" 2>/dev/null || cd /home/user/Yalla-london

echo "--- Session Context ---" >&2

# Git state
BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
CHANGES=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
LAST_COMMIT=$(git log --oneline -1 2>/dev/null || echo "no commits")
echo "Branch: $BRANCH | Uncommitted: $CHANGES | Last: $LAST_COMMIT" >&2

# Pipeline health (quick check from PROJECT_STATUS.md if it exists)
if [ -f PROJECT_STATUS.md ]; then
  head -20 PROJECT_STATUS.md | grep -E "^-" >&2 || true
fi

echo "--- End Context ---" >&2
```
**Target execution:** <2s

#### Hook 2: PostToolUse (Write|Edit on .ts/.tsx/.css/.json files)
```bash
#!/usr/bin/env bash
# Reads stdin JSON: {tool_name, tool_input, tool_output}
# Only fires for Write|Edit (configured via matcher)

set -euo pipefail

# Extract file path from tool_input
FILE_PATH=$(echo "$1" 2>/dev/null || jq -r '.tool_input.file_path // .tool_input.filePath // empty' < /dev/stdin)

# Only format files in yalla_london/app/ directory
case "$FILE_PATH" in
  */yalla_london/app/*.ts|*/yalla_london/app/*.tsx|*/yalla_london/app/*.css|*/yalla_london/app/*.json)
    # Skip node_modules, .next, generated files
    case "$FILE_PATH" in
      */node_modules/*|*/.next/*|*/generated/*|*/prisma/migrations/*) exit 0 ;;
    esac
    
    # Run prettier (project already has it via lint-staged)
    cd /home/user/Yalla-london/yalla_london/app
    npx prettier --write "$FILE_PATH" 2>/dev/null || true
    ;;
esac

exit 0
```
**Target execution:** <1s per file

#### Hook 3: Stop (extends existing global hook)
```bash
#!/usr/bin/env bash
# Session summary + git state check
# Reads stdin JSON: {session_id, stop_hook_active}

set -euo pipefail
cd /home/user/Yalla-london

SESSION_ID=$(jq -r '.session_id // "unknown"' < /dev/stdin 2>/dev/null || echo "unknown")
TIMESTAMP=$(date '+%Y-%m-%d_%H-%M')
LOG_DIR=".claude/logs/sessions"
mkdir -p "$LOG_DIR"

# Git state
BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
DIFF_STAT=$(git diff --stat HEAD 2>/dev/null || echo "no changes")
CHANGES=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')

# Write session log
cat > "$LOG_DIR/${TIMESTAMP}.md" << EOF
# Session Log: $TIMESTAMP
- **Session ID:** $SESSION_ID
- **Branch:** $BRANCH
- **Uncommitted changes:** $CHANGES

## Changes
\`\`\`
$DIFF_STAT
\`\`\`
EOF

# Warn about uncommitted changes
if [ "$CHANGES" -gt 0 ]; then
  echo "WARNING: $CHANGES uncommitted changes on branch $BRANCH" >&2
fi

exit 0
```
**Target execution:** <3s

---

### PHASE 2: PERMISSIONS

**File:** `.claude/settings.json` (NEW — project-level, merges with global)

```json
{
  "permissions": {
    "allow": [
      "Skill",
      "Read",
      "Glob",
      "Grep",
      "Agent",
      "Bash(npm run *)",
      "Bash(npx *)",
      "Bash(node *)",
      "Bash(git status*)",
      "Bash(git diff*)",
      "Bash(git log*)",
      "Bash(git branch*)",
      "Bash(git checkout*)",
      "Bash(git add *)",
      "Bash(git commit *)",
      "Bash(git push -u origin *)",
      "Bash(git fetch *)",
      "Bash(git pull *)",
      "Bash(git stash*)",
      "Bash(git merge*)",
      "Bash(ls *)",
      "Bash(mkdir *)",
      "Bash(wc *)",
      "Bash(cd *)",
      "Bash(cat *)",
      "Bash(head *)",
      "Bash(tail *)",
      "Bash(which *)",
      "Bash(echo *)",
      "Bash(pwd)",
      "Bash(date *)"
    ],
    "deny": [
      "Bash(git push --force*)",
      "Bash(git push -f *)",
      "Bash(git reset --hard*)",
      "Bash(rm -rf *)",
      "Bash(rm -r /)",
      "Bash(npm publish*)",
      "Bash(npx prisma migrate reset*)",
      "Bash(npx prisma db push --force-reset*)",
      "Edit:.env*",
      "Edit:**/credentials*",
      "Edit:**/secrets*",
      "Write:.env*",
      "Write:**/credentials*",
      "Write:**/secrets*"
    ]
  },
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash /home/user/Yalla-london/.claude/hooks/session-start.sh"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "bash /home/user/Yalla-london/.claude/hooks/post-edit-format.sh"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash /home/user/Yalla-london/.claude/hooks/session-stop.sh"
          }
        ]
      }
    ]
  }
}
```

**Permission design rationale:**
- **Allow:** All safe read operations, git operations (except force push/hard reset), npm/npx for build/test/lint, basic filesystem navigation
- **Deny:** Destructive git operations, rm -rf, npm publish, database force-reset, .env file modifications
- **Default (ask):** Write, Edit (except denied paths), any Bash command not in allow list — user gets prompted

---

### PHASE 3: CUSTOM AGENTS

**Approach:** Enhance 2 existing agents with proper frontmatter. Create 2 new agents that fill real gaps.

#### Enhance Existing: `brand-guardian.md`
Add scoped tools and model selection:
```yaml
---
name: brand-guardian
description: Validates UI changes against DESIGN.md brand specification
model: sonnet
tools: [Read, Glob, Grep]
disallowedTools: [Edit, Write, Bash, Agent]
maxTurns: 15
---
```
*(Keep existing system prompt intact, only add/update frontmatter)*

#### Enhance Existing: `seo-growth-agent.md`
Add scoped tools:
```yaml
---
name: seo-growth-agent
description: SEO analysis and optimization recommendations
model: sonnet
tools: [Read, Glob, Grep, Bash]
disallowedTools: [Agent]
maxTurns: 20
---
```

#### NEW: `deploy-checker.md`
Pre-deployment validation agent:
```yaml
---
name: deploy-checker
description: Pre-deployment validation — type check, smoke tests, build verification
model: haiku
tools: [Read, Bash, Glob, Grep]
disallowedTools: [Edit, Write, Agent]
maxTurns: 15
---
```
System prompt: Run `npx tsc --noEmit`, check for build errors, verify critical env vars are documented, check for console.log in production code, verify no .env files are staged.

#### NEW: `session-auditor.md`
Post-session review agent:
```yaml
---
name: session-auditor
description: Reviews what changed in a session and checks against CLAUDE.md rules
model: haiku
tools: [Read, Glob, Grep]
disallowedTools: [Edit, Write, Bash, Agent]
maxTurns: 10
---
```
System prompt: Read git diff, identify changed files, cross-reference against CLAUDE.md engineering standards (schema-first validation, no silent failures, budget guards, etc.), flag potential violations.

---

### PHASE 4: LOOP & SCHEDULE PATTERNS

**File:** `.claude/loops/README.md`

**These are DOCUMENTED patterns only — not auto-started.** The 42 Vercel crons handle all production recurring tasks. Loops are for local development monitoring only.

| Loop | Command | Frequency | Use Case | Exit Condition | Est. Tokens/Cycle |
|------|---------|-----------|----------|----------------|-------------------|
| Build Health | `/loop 15m "run tsc --noEmit, report errors only"` | 15min | Watch for type errors during development | Build passes 3x consecutively | ~500 |
| Pipeline Watch | `/loop 30m "check /api/admin/queue-monitor for stalled pipeline"` | 30min | Monitor content pipeline during heavy changes | Pipeline HEALTHY for 2h | ~800 |
| Deploy Watch | `/loop 5m "check Vercel deployment status via git log"` | 5min | After pushing, watch for successful deploy | Deploy succeeds or fails | ~300 |

**When NOT to use loops:**
- Anything already covered by Vercel crons (content generation, SEO, affiliates, analytics)
- Anything that mutates production data
- Anything running longer than 1 hour without a clear exit condition

---

### PHASE 5: PROJECT STATUS SYSTEM

**File:** `PROJECT_STATUS.md` at project root

```markdown
# Project Status — Yalla London / Zenitha.Luxury
> Auto-updated by Claude Code session hooks

## Last Session
- Date: (auto-filled by stop hook)
- Branch: (auto-filled)
- Summary: (auto-filled)
- Files changed: (auto-filled)

## Active Branches
| Branch | Purpose | Status |
|--------|---------|--------|

## Health Checks
- Build: (check with `npx tsc --noEmit`)
- Last deploy: (check Vercel)
- Pipeline: (check /api/admin/queue-monitor)

## Quick Links
- Cockpit: /admin/cockpit
- Departures: /admin/departures
- Affiliate HQ: /admin/affiliate-hq
- AI Costs: /admin/ai-costs
- Cycle Health: /admin/cockpit/health

## External Services
- Vercel: connected (Pro)
- Supabase: connected (Pro)
- GA4: configured (G-H7YNG7CH88)
- GSC: configured
- CJ Affiliate: active (Vrbo approved)
- Travelpayouts: active (3 programs)
- Resend: configured
- Stay22: active
- Ticketmaster: configured
- Unsplash: configured (50 req/hr)
```

The Stop hook (Phase 1) auto-updates the "Last Session" section.

---

### PHASE 6: OPERATIONS DASHBOARD

**Route:** `/admin/ops/claude-dashboard` (follows existing admin convention)

**Implementation:** Next.js page (dev-only guard) that reads from:
- `.claude/logs/sessions/*.md` — session history
- `.claude/settings.json` — active hooks and permissions
- `.claude/agents/*.md` — agent registry
- `.claude/loops/README.md` — documented loops
- Git log — recent commits
- `package.json` scripts — available commands

**Features:**
- Session log table (date, branch, summary, files changed)
- Hooks status panel (which hooks are active)
- Agent registry with descriptions
- Quick action buttons (run build, run lint, run smoke tests)
- Health indicators

**Guard:** `process.env.NODE_ENV === 'development'` — never accessible in production.

**Size estimate:** ~400 lines (page.tsx) + ~150 lines (API route)

---

### PHASE 7: CLAUDE.MD INTEGRATION

**Append to existing CLAUDE.md (do NOT rewrite):**

```markdown
## Claude Code Automation Infrastructure

### Hooks (.claude/settings.json)
- **SessionStart**: loads git status, project health summary
- **PostToolUse (Write|Edit)**: auto-formats .ts/.tsx/.css/.json with prettier
- **Stop**: logs session summary to .claude/logs/sessions/, checks git state

### Permissions
- **Allow**: safe dev commands (build, lint, test, git operations, file navigation)
- **Deny**: force push, rm -rf, database reset, npm publish, .env modifications
- **Protected**: .env files, credentials, secrets (denied for both Edit and Write)

### Custom Agents (.claude/agents/)
[existing 9 agents + 2 new: deploy-checker, session-auditor]

### Loop Patterns (.claude/loops/README.md)
[3 documented dev-only loops for build health, pipeline watch, deploy watch]

### Project Status (PROJECT_STATUS.md)
Auto-updated on session stop.

### Operations Dashboard (/admin/ops/claude-dashboard)
Dev-only route showing session logs, hooks, agents, health.
```

---

## Execution Order

| Order | Phase | What | Risk | Time Est. |
|-------|-------|------|------|-----------|
| 1 | Phase 2 | Permissions (settings.json) | LOW — config only | 5 min |
| 2 | Phase 1 | Hooks (3 shell scripts) | LOW — can be disabled | 10 min |
| 3 | Phase 5 | Project Status (PROJECT_STATUS.md) | NONE — new file | 5 min |
| 4 | Phase 3 | Agents (2 enhanced + 2 new) | LOW — additive | 10 min |
| 5 | Phase 4 | Loop docs (.claude/loops/README.md) | NONE — docs only | 5 min |
| 6 | Phase 6 | Ops Dashboard (Next.js page + API) | LOW — dev-only | 20 min |
| 7 | Phase 7 | CLAUDE.md append | NONE — docs only | 5 min |

**Total estimated time:** ~60 minutes

---

## What This Plan Does NOT Do

- **Does NOT activate loops** — documents patterns only
- **Does NOT modify existing agents** body content — only adds/updates YAML frontmatter
- **Does NOT duplicate Vercel crons** — hooks are for Claude Code session lifecycle only
- **Does NOT add WhatsApp/Telegram routing** — requires a 24/7 webhook server (future TODO)
- **Does NOT modify global settings** — all changes are project-level (.claude/settings.json)
- **Does NOT touch production code paths** — ops dashboard is dev-only

---

## Approval Checklist

Before executing, confirm:
- [ ] Phase order is acceptable (permissions first, then hooks)
- [ ] Permission allow/deny lists look correct for your workflow
- [ ] New agents (deploy-checker, session-auditor) are useful additions
- [ ] Ops dashboard at `/admin/ops/claude-dashboard` is the right location
- [ ] No concerns about hook execution overhead (~1-3s per trigger)
