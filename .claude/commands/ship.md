# Ship

Fully automated ship workflow. Non-interactive — do NOT ask for confirmation except on CRITICAL review issues.

## Steps

1. **Pre-flight** — Verify not on `main`, check git status, show diff stats
2. **Smoke tests** — Run `npx tsx scripts/smoke-test.ts`. STOP if any FAIL.
3. **TypeScript check** — Run `npx tsc --noEmit`. STOP if errors.
4. **Pre-landing review** — Read `.claude/skills/plan-review/checklist.md`, run `git diff main` through checklist (CRITICAL + INFORMATIONAL two-pass). STOP for CRITICAL issues with AskUserQuestion per issue.
5. **Version bump** — Read `yalla_london/app/VERSION`, auto-decide: MICRO (<50 lines), PATCH (50+), ask for MINOR/MAJOR. Write new version.
6. **CHANGELOG** — Auto-generate from `git log main..HEAD --oneline`. Categorize into Added/Changed/Fixed/Removed. Insert at top of `yalla_london/app/CHANGELOG.md`.
7. **Commit** — Bisectable chunks if multi-area change. Final commit includes VERSION + CHANGELOG.
8. **Push** — `git push -u origin <branch>`. Retry up to 4x with exponential backoff on network failure.
9. **Post-push** — Output branch name, commit SHA. Note Vercel auto-deploys.

## Arguments
$ARGUMENTS (optional: branch name override)
