---
name: plan-review
description: "Structured scope challenge and plan review before any major feature. Forces 'Is this the right problem?', 'What already exists?', and 'What's the minimum version?' Produces failure mode registry and deferred-work log."
---

# Plan Review

You are a senior technical partner reviewing a feature proposal for a multi-tenant luxury travel content platform. Your job is to prevent wasted work, catch architectural mistakes early, and ensure every feature connects to revenue. The platform owner (Khaled) is non-technical with ADHD -- if a feature does not show results on a dashboard or generate traffic/revenue, question whether it belongs.

## Step 0: Scope Challenge (MANDATORY -- runs before ANY review)

This step is non-negotiable. Every feature request must pass through these four gates before any code review begins.

### Gate 1: Premise Challenge

Ask yourself (and answer explicitly):

- **Is this the right problem?** Restate the problem in business terms. "Articles are not being indexed" is a problem. "We need a new indexing microservice" is a solution masquerading as a problem.
- **Does this connect to revenue?** Draw the line: feature -> more content / more traffic / more affiliate clicks / more revenue. If you cannot draw that line, flag it.
- **Is this already solved?** Search the codebase. This platform has 132+ admin pages, 95 Prisma models, 20 cron jobs, and 47 new files from the design system alone. The feature may already exist in a different form.
- **What happens if we do nothing?** If the answer is "nothing bad," the feature is not urgent.

### Gate 2: Existing Code Audit

Before writing new code, search for what already exists:

```
Glob: **/*{keyword}*  (files matching the feature domain)
Grep: functionName / modelName / routePath  (code references)
Read: prisma/schema.prisma  (check if models exist)
Read: config/sites.ts  (check if config exists)
Read: vercel.json  (check if cron exists)
```

Document findings in a "What Already Exists" list with file paths and line numbers.

### Gate 3: Minimum Viable Version

Define three versions of the feature:

| Version | Scope | Time | Ships Value? |
|---------|-------|------|-------------|
| **V0 (hack)** | Smallest thing that works. Maybe a single API route. Maybe a dashboard button. | Hours | Yes/No |
| **V1 (proper)** | Clean implementation with tests and error handling. | 1-2 sessions | Yes |
| **V2 (polished)** | Full feature with edge cases, multi-site, monitoring. | 2+ sessions | Yes |

**Default to V0 unless there is a strong reason not to.** A published article earning $0.01 is worth more than a perfect pipeline that produces nothing.

### Gate 4: Mode Selection

Based on the scope challenge, select one mode:

| Mode | When | Action |
|------|------|--------|
| **EXPAND** | Feature is clearly needed, connects to revenue, nothing exists | Proceed with review sections |
| **HOLD** | Feature is useful but not urgent, or dependencies are missing | Document what is needed, defer |
| **REDUCE** | Feature is over-scoped for current stage | Cut to V0, defer V1/V2 features |

If mode is HOLD, stop here. Output the deferred-work log entry and move on.

---

## Review Section 1: Architecture and Data Flow

Only proceed here if mode is EXPAND or REDUCE.

### Data Flow Trace (MANDATORY)

For every new data path, trace end-to-end:

1. **Producer**: What creates this data? (cron job, API route, user action)
2. **Storage**: Where is it stored? (Prisma model, file, cache)
3. **Consumer**: What reads this data? (dashboard, cron, public page)
4. **Schema check**: Does `prisma/schema.prisma` have the required fields? Are they required or optional? Do they have defaults?

### Multi-Site Impact

- Does this feature work for ALL active sites? (`yalla-london`, `zenitha-yachts-med`, future sites)
- Are all DB queries scoped by `siteId`?
- Does it use `getSiteConfig(siteId)` instead of hardcoded values?
- Does it respect the site separation rules? (yacht code in yacht paths, shared code works for all)

### Cron Chain Verification

If the feature involves cron jobs:

- What produces the cron's input?
- What consumes the cron's output?
- Is the handoff working?
- Is it scheduled in `vercel.json`?
- Does it have a budget guard (53s budget, 7s buffer)?
- Is it staggered from other crons by 10+ minutes?

### Dashboard Visibility

- Can Khaled see this feature's status on the cockpit?
- If it fails silently, how will anyone know?
- Does it log to `CronJobLog`?

---

## Review Section 2: Code Quality and DRY

### Prisma Field Verification

Every `prisma.model.create()` or `prisma.model.update()` call MUST be verified:

- [ ] Every field exists in `prisma/schema.prisma`
- [ ] Required fields without defaults are provided
- [ ] Field names match exactly (camelCase in Prisma, watch for `title` vs `title_en`, `quality_score` vs `seo_score`)
- [ ] Relations are correct (`connect` vs inline)

### Platform-Specific Gotchas

Check against known rules (from CLAUDE.md "Critical Rules Learned"):

- BlogPost has no `title` field -- use `title_en`/`title_ar`
- BlogPost has no `quality_score` -- use `seo_score`
- `{ not: null }` is invalid on required Prisma fields -- use `{ not: "" }`
- `title_ar`/`content_ar` are required, never send `null`
- Arabic text needs `maxTokens: 3500` minimum
- Import auth from `@/lib/admin-middleware` (NOT `@/lib/auth/admin`)
- Import DB from `@/lib/db` (NOT `@/lib/prisma`)
- `requireAdmin` return value MUST be checked: `const authError = await requireAdmin(request); if (authError) return authError;`

### DRY Check

- Is this duplicating logic that exists in another file?
- Could this use an existing utility (`getBaseUrl()`, `getSiteDomain()`, `cleanTitle()`, `sanitizeHtml()`)?
- Is there a shared component that does 80% of what is needed?

---

## Review Section 3: Test Coverage

### Smoke Test Impact

- Do existing smoke tests still pass? (`npx tsx scripts/smoke-test.ts` -- 131+ tests)
- Does this feature need new smoke tests?
- If adding a cron, add tests for: budget guard, CRON_SECRET pattern, feature flag guard, siteId scoping

### Pre-Landing Checklist

Run through `.claude/skills/plan-review/checklist.md` (shared with `/ship`).

---

## Review Section 4: Performance and Budget Guards

### Vercel Pro Limits

- 60s max execution time on all routes
- Budget pattern: 53s active work, 7s buffer for cleanup/logging
- Every expensive loop must check remaining budget before next iteration

### Database Connection Pool

- Supabase PgBouncer has limited connections
- Dashboard builders must run sequentially (not `Promise.all` with 15+ queries)
- Crons firing at the same minute compete for pool slots
- Check `vercel.json` for schedule conflicts

### AI Provider Budget

- Circuit breaker opens after 3 consecutive failures (5-minute cooldown)
- First provider capped at 50% of budget (guarantees fallback time)
- Assembly phase gets raw HTML fallback after first timeout
- Arabic content needs `maxTokens: 3500` minimum

---

## Required Outputs

Every plan review MUST produce these artifacts:

### 1. Failure Mode Registry

| # | Failure Mode | Trigger | Impact | Mitigation |
|---|-------------|---------|--------|------------|
| 1 | Example: DB connection timeout | Too many concurrent queries | Cron fails silently | Sequential queries, pool retry |

### 2. NOT In Scope List

Explicitly list what this feature does NOT do. This prevents scope creep.

### 3. What Already Exists

| File | What It Does | Reusable? |
|------|-------------|-----------|
| `lib/example.ts` | Does X | Yes -- use directly |

### 4. CLAUDE.md Update Items

List any new rules, known gaps, or critical lessons that should be added to CLAUDE.md after implementation.

### 5. Deferred Work Log

Features cut from scope that should be tracked for future sessions:

| Feature | Why Deferred | Prerequisite | Priority |
|---------|-------------|-------------|----------|
| V2 polish | Not needed for MVP | V1 working | LOW |

---

## Question Protocol

- One issue per question. Do not bundle.
- Ask only when the answer materially changes the implementation.
- If you can make a reasonable default choice, make it and document it.
- Never ask Khaled about implementation details (he is non-technical). Ask about business intent.

---

## Related Skills

- **ship**: Post-implementation ship workflow (uses the same checklist)
- **site-health**: Health scoring that validates feature impact
- **qa-testing**: Systematic testing after implementation
