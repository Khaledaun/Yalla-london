# Weekly Retro Snapshot Schema

JSON schema for weekly snapshots saved to `docs/retros/{date}.json`.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["date", "period", "siteId", "metrics", "wins", "issues", "nextFocus"],
  "properties": {
    "date": {
      "type": "string",
      "format": "date",
      "description": "Snapshot date (YYYY-MM-DD)"
    },
    "period": {
      "type": "string",
      "description": "Date range covered (e.g., '2026-03-07 to 2026-03-14')"
    },
    "siteId": {
      "type": "string",
      "description": "Site this retro covers"
    },
    "metrics": {
      "type": "object",
      "properties": {
        "articlesPublished": { "type": "integer" },
        "pagesIndexed": { "type": "integer" },
        "gscClicks": { "type": "integer" },
        "gscImpressions": { "type": "integer" },
        "gscAvgCtr": { "type": "number" },
        "gscAvgPosition": { "type": "number" },
        "aiSpendUsd": { "type": "number" },
        "cronSuccessRate": { "type": "number" },
        "cronFailures": { "type": "integer" },
        "affiliateClicks": { "type": "integer" },
        "revenueUsd": { "type": "number" },
        "affiliateCoverage": { "type": "number" },
        "reservoirSize": { "type": "integer" },
        "stuckDrafts": { "type": "integer" },
        "activeInPipeline": { "type": "integer" },
        "topicsQueued": { "type": "integer" },
        "commitCount": { "type": "integer" },
        "filesChanged": { "type": "integer" },
        "linesAdded": { "type": "integer" },
        "linesRemoved": { "type": "integer" }
      }
    },
    "wins": {
      "type": "array",
      "items": { "type": "string" },
      "description": "3-5 concrete achievements"
    },
    "issues": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "severity": { "enum": ["critical", "warning", "info"] },
          "area": { "type": "string" },
          "description": { "type": "string" },
          "suggestedFix": { "type": "string" }
        }
      }
    },
    "nextFocus": {
      "type": "array",
      "items": { "type": "string" },
      "description": "3 priorities for next week"
    },
    "deltas": {
      "type": "object",
      "description": "Computed deltas vs previous snapshot (filled automatically)"
    },
    "kpiStatus": {
      "type": "object",
      "description": "Status vs 30/90-day KPI targets",
      "additionalProperties": {
        "type": "object",
        "properties": {
          "target": { "type": "number" },
          "current": { "type": "number" },
          "status": { "enum": ["AHEAD", "ON_TRACK", "BEHIND"] }
        }
      }
    }
  }
}
```

## Usage

1. After generating retro, save snapshot: `docs/retros/2026-03-14.json`
2. Load previous: `docs/retros/2026-03-07.json` (7 days prior)
3. Compute deltas between current and previous metrics
4. Use kpiStatus to compare against CLAUDE.md Business KPIs table
