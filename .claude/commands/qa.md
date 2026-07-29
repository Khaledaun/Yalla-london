# QA Testing

Systematically QA test the live site like a real user.

## Steps

1. Determine mode from arguments (default: diff-aware)
2. Use the `qa-testing` skill to run browser tests via playwright
3. Produce structured report with screenshots
4. Save evidence to `docs/qa-reports/`

## Modes
- `diff` (default) — Test only pages affected by recent changes
- `full` — Test all public pages + admin routes
- `quick` — 30-second smoke test
- `regression` — Compare against saved baseline

## Arguments
$ARGUMENTS (mode: diff, full, quick, regression; optional site ID)
