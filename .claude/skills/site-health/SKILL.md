---
name: site-health
description: "Generate a weighted health score (0-100) for any site. Pulls real data from aggregated-report API, cycle-health API, GSC MCP, and CJ MCP. Saves baselines for trend comparison. Output is plain-language for iPhone viewing. Use when the user asks about site health, health score, site status, or 'how is my site doing'."
---

# Site Health Score

You generate a weighted health score (0-100) for any Yalla London / Zenitha site. The score is grounded in real platform data — never invented.

## Health Score Rubric (7 categories)

| Category | Weight | Data Source | Scoring Method |
|----------|--------|-------------|---------------|
| SEO Compliance | 25% | `/api/admin/aggregated-report` Section 1 (audit score) | Direct score 0-100 |
| Content Pipeline | 20% | `/api/admin/cycle-health` (velocity, stuck drafts, quality) | 100 minus deductions per issue |
| Indexing | 15% | `/api/admin/aggregated-report` Section 2 (indexed rate, errors) | `indexed_rate x 100` |
| Performance | 15% | Lighthouse/PageSpeed scores (LCP, INP, CLS) | CWV composite |
| Cron Health | 10% | `/api/admin/cycle-health` (cron success rate, failures 24h) | `success_rate x 100` |
| Revenue | 10% | CJ MCP `cj_get_revenue` + affiliate coverage | `coverage% + revenue_trend` |
| Accessibility | 5% | Latest accessibility audit score | Direct score 0-100 |

## Modes

### Single Site
```
/site-health yalla-london
```

### All Sites
```
/site-health all
```

### Trend Mode
```
/site-health yalla-london --trend
```

## Data Collection Steps

1. **Fetch aggregated report** — `GET /api/admin/aggregated-report?siteId={site}`
2. **Fetch cycle health** — `GET /api/admin/cycle-health?siteId={site}`
3. **Query GSC** (if MCP available) — `gsc_get_search_performance`
4. **Query CJ** (if MCP available) — `cj_get_revenue`, `cj_get_content_coverage`
5. **Query PageSpeed** — `GET /api/admin/performance-audit?siteId={site}`

## Score Calculation

```
total = (seo x 0.25) + (content x 0.20) + (indexing x 0.15)
      + (performance x 0.15) + (cron x 0.10) + (revenue x 0.10)
      + (accessibility x 0.05)
```

### Grade Scale
| Score | Grade |
|-------|-------|
| 90-100 | A+ |
| 80-89 | A/B+ |
| 70-79 | B/B- |
| 60-69 | C |
| 50-59 | D |
| 0-49 | F |

### Graceful Degradation
If any data source fails: mark category "unavailable", exclude from weighted average, redistribute weight proportionally, note missing categories.

## Baseline Storage

Save JSON snapshot to `docs/health-snapshots/{siteId}-{date}.json` for trend comparison.

## Output Format

Always plain-language, iPhone-optimized:
- Lead with score and grade
- 7 category scores on one line
- Trend vs last snapshot
- Top issue with specific metric
- 1-3 recommended actions

## Platform Rules
- Use `getActiveSiteIds()` for "all" mode
- Skip `zenitha-yachts-med` from content/pipeline metrics
- Budget guard: 15s total
- Never invent metrics

## Related Skills
- **qa-testing**: Live browser QA with screenshots
- **weekly-retro**: Weekly progress report (uses health snapshots)
- **seo-audit**: Deep SEO audit (component of health score)
