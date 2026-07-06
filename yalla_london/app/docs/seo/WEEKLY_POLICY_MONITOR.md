# Weekly Policy Monitor

Automated monitoring of Google Search policy changes for the Zenitha Content Network.

## Purpose

Google periodically updates its search policies, ranking algorithms, spam policies, and structured data requirements. This monitor:

1. Checks official policy sources weekly
2. Snapshots current policy content
3. Diffs against previous snapshots to detect changes
4. Flags material changes that may require audit config updates

## How It Works

### Sources Monitored

| Source | URL | What Changes to Watch |
|--------|-----|----------------------|
| Google Search Status Dashboard | status.search.google.com | Ranking updates, indexing issues |
| Google Search Central Blog | developers.google.com/search/blog | Algorithm updates, deprecations |
| Google Spam Policies | developers.google.com/search/docs/essentials/spam-policies | Scaled content abuse, site reputation abuse, expired domain abuse |
| Google Helpful Content | developers.google.com/search/docs/fundamentals/creating-helpful-content | Quality guidelines |

### Run Schedule

```bash
# Manual run
npm run audit:weekly-policy-monitor -- --site=yalla-london

# Recommended: weekly on Monday mornings
# GitHub Actions or cron:
# 0 8 * * 1 cd yalla_london/app && npm run audit:weekly-policy-monitor -- --site=yalla-london
```

### Output Files

Each run saves to two locations:

1. **Latest report:** `docs/seo/WEEKLY_POLICY_MONITOR.md` (overwritten each run)
2. **Dated archive:** `docs/seo/policy-monitor/<date>/`
   - `DIFF.md` — Diff report for this run
   - `policy-snapshot.json` — Source hashes and standards snapshot

### How Diffing Works

1. The monitor fetches each policy source page
2. It hashes the content of each page
3. It compares hashes against the most recent previous snapshot
4. If any hash changes, the source is flagged as "CHANGED"
5. Material changes trigger a recommendation to re-run the master audit

## Acting on Changes

### No Changes Detected

No action needed. Continue monitoring next week.

### Material Changes Detected

1. **Read the DIFF.md** — identifies which sources changed
2. **Visit the changed source URL** — review what's new
3. **Determine impact:**
   - New ranking update → Re-run master audit
   - New spam policy → Update `docs/seo/MAX_SEO_AIO_SPEC.md` + audit config
   - Schema deprecation → Update `deprecatedSchemaTypes` in config
   - Core Web Vitals change → Update thresholds
4. **Update configs if needed:**
   - `config/sites/_default.audit.json` — default thresholds
   - `lib/seo/standards.ts` — centralized SEO standards
5. **Re-run master audit:**
   ```bash
   npm run audit:master -- --site=yalla-london --mode=prod
   ```

### Updating the Spec

When policy changes require spec updates:

1. Edit `docs/seo/MAX_SEO_AIO_SPEC.md`
2. Add an entry to the Changelog section at the bottom
3. Bump the version date at the top of the file
4. Update corresponding config values in `config/sites/_default.audit.json`
5. Run tests to verify: `npx vitest test/master-audit/`

## Multi-Site

The monitor accepts any configured site ID:

```bash
npm run audit:weekly-policy-monitor -- --site=yalla-london
npm run audit:weekly-policy-monitor -- --site=zenitha-yachts-med
```

Each site gets its own dated snapshot history under `docs/seo/policy-monitor/`.

## Automation

### GitHub Actions (recommended)

```yaml
name: Weekly Policy Monitor
on:
  schedule:
    - cron: '0 8 * * 1'  # Every Monday at 8am UTC
  workflow_dispatch:

jobs:
  monitor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci --legacy-peer-deps
        working-directory: yalla_london/app
      - run: npm run audit:weekly-policy-monitor -- --site=yalla-london
        working-directory: yalla_london/app
      - run: npm run audit:master -- --site=yalla-london --mode=prod
        working-directory: yalla_london/app
        if: success()
```

### Combined Command

```bash
npm run audit:weekly-policy-monitor -- --site=yalla-london && npm run audit:master -- --site=yalla-london --mode=prod
```
