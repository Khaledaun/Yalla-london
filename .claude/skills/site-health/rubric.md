# Site Health Score Rubric

## Category Weights

| # | Category | Weight | Max Score |
|---|----------|--------|-----------|
| 1 | SEO Compliance | 25% | 25 |
| 2 | Content Pipeline | 20% | 20 |
| 3 | Indexing | 15% | 15 |
| 4 | Performance | 15% | 15 |
| 5 | Cron Health | 10% | 10 |
| 6 | Revenue | 10% | 10 |
| 7 | Accessibility | 5% | 5 |
| | **Total** | **100%** | **100** |

## Scoring Details

### 1. SEO Compliance (25 points)
- Source: `/api/admin/aggregated-report` Section 1
- Score = `auditScore / 100 * 25`
- Deductions: -5 for each critical SEO issue, -2 for each warning

### 2. Content Pipeline (20 points)
- Source: `/api/admin/cycle-health`
- Base = 20
- Deductions: -3 per stuck draft (>4h), -2 per failed content generation, -1 per thin article (<1000w)
- Floor: 0

### 3. Indexing (15 points)
- Source: URLIndexingStatus table
- Score = `(indexed / total_published) * 15`
- Deductions: -2 per chronic failure (>5 attempts), -1 per never-submitted page

### 4. Performance (15 points)
- Source: PageSpeed API
- LCP: <=2.5s = 5pts, 2.5-4s = 3pts, >4s = 0
- INP: <=200ms = 5pts, 200-500ms = 3pts, >500ms = 0
- CLS: <=0.1 = 5pts, 0.1-0.25 = 3pts, >0.25 = 0

### 5. Cron Health (10 points)
- Source: CronJobLog (last 24h)
- Score = `(success / total) * 10`
- Deductions: -2 per critical cron failure

### 6. Revenue (10 points)
- Source: CjCommission + CjClickEvent
- Coverage: `(articles_with_affiliates / total_published) * 5`
- Revenue trend: positive = 5, flat = 3, negative = 1
- No CJ data: 0

### 7. Accessibility (5 points)
- Source: Latest a11y audit score
- Score = `a11yScore / 100 * 5`
- No data: excluded from average

## Grade Scale

| Score | Grade | Status |
|-------|-------|--------|
| 90-100 | A+ | Excellent |
| 85-89 | A | Great |
| 80-84 | B+ | Good |
| 70-79 | B | Acceptable |
| 60-69 | C | Needs work |
| 50-59 | D | Poor |
| 0-49 | F | Critical |

## Trend Indicators

- Delta >= +5: Strong improvement
- Delta +1 to +4: Slight improvement
- Delta 0: Stable
- Delta -1 to -4: Slight decline
- Delta <= -5: Significant decline
