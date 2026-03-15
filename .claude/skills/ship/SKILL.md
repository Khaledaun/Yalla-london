---
name: ship
description: "Fully automated ship workflow: smoke tests -> TypeScript check -> pre-landing review -> version bump -> CHANGELOG -> commit -> push. Non-interactive except on CRITICAL review issues."
---

# Ship

You are the release engineer for a multi-tenant luxury travel content platform. Your job is to get code from the working branch to the remote repository safely, with quality gates that catch real issues without blocking velocity. The platform owner cannot see terminal output -- every decision must be defensible from the git log alone.

## Philosophy

Ship early, ship often. A published article earning $0.01 is worth more than a perfect pipeline that produces nothing. But never ship broken auth, broken queries, or silent failures. The gates below catch the things that matter.

---

## The 9-Step Pipeline

Run these steps sequentially. Each step either passes (continue) or fails (stop and report).

### Step 1: Pre-Flight Checks

```bash
# Verify we are NOT on main/master
git branch --show-current

# Check for uncommitted changes
git status

# Get diff stats for version bump decision
git diff --stat HEAD~1 2>/dev/null || git diff --stat main...HEAD
```

**STOP conditions:**
- On `main` or `master` branch -- never ship directly to main
- Untracked files that look like secrets (`.env`, `credentials.json`, `*.pem`)

**Continue conditions:**
- On a feature/fix branch
- Working tree is clean OR has only staged changes ready to commit

### Step 2: Smoke Tests

```bash
cd /home/user/Yalla-london/yalla_london/app && npx tsx scripts/smoke-test.ts
```

**Expected:** 131+ tests across 29 categories.

**STOP conditions:**
- Any test with status `FAIL` -- fix before shipping
- Test runner crashes or times out

**Continue conditions:**
- All tests `PASS` or `WARN`
- `WARN` results are noted in the ship report but do not block

### Step 3: TypeScript Check

```bash
cd /home/user/Yalla-london/yalla_london/app && npx tsc --noEmit
```

**STOP conditions:**
- Any TypeScript errors -- fix before shipping

**Continue conditions:**
- Zero errors (warnings are acceptable)

### Step 4: Pre-Landing Review

Read `.claude/skills/plan-review/checklist.md` and run through both passes on the current diff:

**Pass 1 -- CRITICAL checks:**

Scan all changed files for:
- Auth: `requireAdmin` on admin routes, return value checked
- DB: siteId scoping, no global queries
- Error: No empty catch blocks
- Schema: Prisma field names verified
- Content: `title_en` not `title`, `seo_score` not `quality_score`
- Security: No unsanitized `dangerouslySetInnerHTML`, no credentials in responses
- Imports: `@/lib/admin-middleware` and `@/lib/db` (correct paths)
- Build: No `@typescript-eslint/*` rules, explicit `Set` generics

**STOP on any CRITICAL finding.** Report the finding with file path and line number.

**Pass 2 -- INFORMATIONAL checks:**

Scan for:
- Hardcoded URLs
- Dead imports
- Console.error visibility
- Safari compatibility (`res.ok` before `res.json()`)
- Cron schedule conflicts

**INFORMATIONAL findings are listed in the ship report but do NOT block.**

### Step 5: Version Bump

Read `yalla_london/app/VERSION` to get the current version.

**Auto-decide version bump based on diff size:**

| Diff Size | Bump Type | Example |
|-----------|-----------|---------|
| < 50 lines changed | MICRO (patch increment) | 1.0.0 -> 1.0.1 |
| 50-500 lines changed | PATCH | 1.0.0 -> 1.0.1 |
| 500+ lines OR new feature | MINOR (ask user) | 1.0.0 -> 1.1.0 |
| Breaking change | MAJOR (ask user) | 1.0.0 -> 2.0.0 |

For MINOR and MAJOR bumps, ask the user to confirm. For MICRO and PATCH, auto-apply.

Write the new version to `yalla_london/app/VERSION`.

### Step 6: CHANGELOG

Read `yalla_london/app/CHANGELOG.md`.

Auto-generate a changelog entry from the git log since the last version tag or last CHANGELOG entry:

```
## [X.Y.Z] - YYYY-MM-DD

### Added
- New features

### Changed
- Modified behavior

### Fixed
- Bug fixes

### Removed
- Deleted features or deprecated code
```

**Rules:**
- Use past tense ("Added", "Fixed", not "Add", "Fix")
- One line per change, starting with the component name
- Group by category (Added/Changed/Fixed/Removed)
- Keep descriptions concise -- one sentence max
- Include file paths for significant changes

Prepend the new entry to CHANGELOG.md (after the header, before previous entries).

### Step 7: Commit

Stage all changes including VERSION and CHANGELOG:

```bash
git add -A
git commit -m "$(cat <<'EOF'
<type>: <concise description>

<body - what changed and why>

Co-Authored-By: Claude <noreply@anthropic.com>

https://claude.ai/code/session_ID
EOF
)"
```

**Commit message rules:**
- Type prefix: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `perf:`, `security:`
- Subject line under 72 characters
- Body explains what and why, not how
- Always include `Co-Authored-By: Claude <noreply@anthropic.com>`
- Always include the session URL

**Bisectable commits:** If the diff contains multiple unrelated changes, split into separate commits. Each commit must independently compile and pass smoke tests.

### Step 8: Push

```bash
git push -u origin $(git branch --show-current)
```

**Retry logic:** If push fails, retry up to 4 times with exponential backoff:
- Attempt 1: immediate
- Attempt 2: wait 2s
- Attempt 3: wait 4s
- Attempt 4: wait 8s

If all 4 attempts fail, report the error and stop. Do NOT force push.

**Never force push to main/master.** Warn the user if they request it.

### Step 9: Post-Push Report

Output a summary:

```
Ship Report
-----------
Branch:     claude/feature-name-xyz
Commit:     abc1234
Version:    1.0.1
Smoke:      131 PASS, 0 FAIL, 2 WARN
TypeScript: 0 errors
Review:     0 CRITICAL, 3 INFORMATIONAL
Push:       Success (attempt 1)

INFORMATIONAL findings:
1. [INFO] Hardcoded URL in app/api/foo/route.ts:42
2. [INFO] Dead import in lib/bar.ts:7
3. [INFO] console.error not visible on dashboard in lib/baz.ts:99

Note: Vercel auto-deploys from this branch. Check deployment at:
https://vercel.com/team/yalla-london/deployments
```

---

## Error Recovery

### Smoke test failure
- Read the failing test name and category
- Search the codebase for the relevant code
- Fix the issue
- Re-run from Step 2

### TypeScript error
- Fix the type error
- Re-run from Step 3

### CRITICAL review finding
- Fix the finding
- Re-run from Step 4

### Push failure (not network)
- Check if branch is behind remote: `git pull --rebase origin $(git branch --show-current)`
- If conflicts, report to user and stop
- If clean rebase, retry push

---

## What This Skill Does NOT Do

- Does not run the full test suite (only smoke tests -- full tests are for CI)
- Does not deploy (Vercel auto-deploys from pushed branches)
- Does not create PRs (use `gh pr create` separately)
- Does not run database migrations (those are manual: `npx prisma migrate deploy`)
- Does not modify `CLAUDE.md` (that is a separate manual step)

---

## Related Skills

- **plan-review**: Pre-implementation review (uses the same checklist)
- **qa-testing**: Post-deployment testing
- **site-health**: Post-deployment health check
