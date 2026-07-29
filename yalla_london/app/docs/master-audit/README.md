# Master Audit Engine

Production-grade SEO audit engine for the Zenitha Content Network. Batch-safe, resumable, multi-site, read-only.

## Quick Start

```bash
cd yalla_london/app

# Run against live site (read-only)
npm run audit:master -- --site=yalla-london --mode=prod

# Run against local dev server
npm run audit:master -- --site=yalla-london --mode=preview

# Resume an interrupted run
npm run audit:master -- --resume=yalla-london-20260221-120000-a1b2

# Custom settings
npm run audit:master -- --site=yalla-london --mode=prod --batchSize=200 --concurrency=6
```

## Modes

| Mode | Base URL | Rate Limit | Use Case |
|------|----------|-----------|----------|
| `preview` | http://localhost:3000 | Relaxed | Local dev testing |
| `prod` | From site config | 6 concurrent, 200ms delay | Live site audit |
| `full` | From site config | Default | Alias for prod |
| `quick` | From site config | Default | Quick scan (first batch only) |
| `resume` | From previous run | Preserved | Continue interrupted run |

## CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `--site=<id>` | Site ID (required unless resuming) | — |
| `--mode=<mode>` | Audit mode | `prod` |
| `--batchSize=<n>` | URLs per batch | 200 |
| `--concurrency=<n>` | Max concurrent requests | 6 |
| `--baseUrl=<url>` | Override base URL | From config |
| `--resume=<runId>` | Resume previous run | — |

## Outputs

Each run creates a directory at `docs/master-audit/<run_id>/`:

| File | Description |
|------|-------------|
| `state.json` | Batch state (for resume support) |
| `config_snapshot.json` | Exact config used for this run |
| `url_inventory.json` | All URLs audited with source and status |
| `crawl-results.json` | Raw crawl data (HTML, headers, timing) |
| `issues.json` | All issues found (JSON array) |
| `result.json` | Full audit result with hard gates |
| `EXEC_SUMMARY.md` | Executive summary — read this first |
| `FIX_PLAN.md` | Fix plan grouped by root cause |
| `CHANGELOG.md` | Run metadata |

## Hard Gates

These must be 100% pass for the audit to succeed:

| Gate | Rule | Category |
|------|------|----------|
| broken-internal-links | Zero broken internal links on indexable pages | links |
| non-200-indexable | No 5xx errors on indexable pages | http |
| missing-canonical | All indexable pages must have canonical tags | canonical |
| malformed-jsonld | No malformed JSON-LD on indexable pages | schema |
| hreflang-reciprocity | All hreflang tags must have valid reciprocal links | hreflang |
| sitemap-valid | Sitemap must parse successfully, only indexable URLs | sitemap |

## Validators

8 validators run against every crawled page:

1. **HTTP** — Status codes, redirects, response time
2. **Canonical** — Presence, format, self-referencing, cross-domain
3. **Hreflang** — Expected languages, reciprocity, duplicates
4. **Sitemap** — Parse success, indexable-only URLs, duplicates
5. **Schema** — JSON-LD validity, required types per route, deprecated types
6. **Links** — Broken internal links, orphan pages
7. **Metadata** — Title/description presence, length, uniqueness
8. **Robots** — Noindex/sitemap contradictions, nofollow, nosnippet

## Risk Scanners

3 spam policy risk scanners:

1. **Scaled Content Abuse** — Near-duplicate clustering, thin content clusters, entity coverage
2. **Site Reputation Abuse** — Topic drift, outbound link dominance, missing editorial ownership
3. **Expired Domain Abuse** — Topic pivot from domain name, legacy orphan pages

## Batch + Resume

The audit crawls URLs in configurable batches (default: 200 per batch).
After each batch, state is saved to `state.json`. If the audit is interrupted:

1. The `state.json` records which batches are completed
2. Resume with `--resume=<runId>` to skip completed batches
3. Crawl results from completed batches are cached in `crawl-results.json`

## Configuration

Config files at `config/sites/`:

- `_default.audit.json` — Base config for all sites
- `yalla-london.audit.json` — Yalla London overrides
- `zenitha-yachts-med.audit.json` — Zenitha Yachts overrides

Config layers are deep-merged: default → site-specific → CLI overrides.

## Adding a New Site

1. Create `config/sites/<site-id>.audit.json` with at minimum:
   ```json
   {
     "baseUrl": "https://www.example.com",
     "staticRoutes": ["/", "/blog", "/about"],
     "validators": {
       "requiredSchemaByRoute": {
         "/": ["Organization", "WebSite"]
       }
     }
   }
   ```
2. Run: `npm run audit:master -- --site=<site-id> --mode=prod`

## Weekly Policy Monitor

Checks Google policy sources for changes:

```bash
npm run audit:weekly-policy-monitor -- --site=yalla-london
```

If material changes are detected, re-run the master audit:

```bash
npm run audit:weekly-policy-monitor -- --site=yalla-london && npm run audit:master -- --site=yalla-london --mode=prod
```

## Architecture

```
lib/master-audit/
├── index.ts              # Main orchestrator
├── types.ts              # All TypeScript interfaces
├── config-loader.ts      # Deep-merge config with validation
├── inventory-builder.ts  # URL collection from sitemap + static routes
├── crawler.ts            # HTTP crawler with batching + rate limiting
├── extractor.ts          # HTML → SEO signal extraction (regex-based)
├── state-manager.ts      # Batch resume state persistence
├── reporter.ts           # EXEC_SUMMARY.md + FIX_PLAN.md generation
├── validators/           # 8 hard-gate validators
│   ├── http.ts
│   ├── canonical.ts
│   ├── hreflang.ts
│   ├── sitemap.ts
│   ├── schema.ts
│   ├── links.ts
│   ├── metadata.ts
│   └── robots.ts
└── risk-scanners/        # 3 spam policy risk scanners
    ├── scaled-content.ts
    ├── site-reputation.ts
    └── expired-domain.ts
```

## Tests

```bash
# Run all audit engine tests
npx vitest test/master-audit/

# Run specific test file
npx vitest test/master-audit/validators.spec.ts
```
