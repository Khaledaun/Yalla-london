# Analytics Review

Run a comprehensive analytics review using the Analytics Intelligence Agent.

## Steps

1. **Traffic Analysis** — Use `google-analytics` to pull sessions, users, bounce rate by site
2. **Source/Medium** — Break down traffic by organic, direct, social, referral, email
3. **Content Performance** — Identify top 10 and bottom 10 pages by engagement
4. **Conversion Funnel** — Map visitor → engagement → lead → conversion per site
5. **SEO Metrics** — Cross-reference with GSC: impressions, clicks, CTR, position
6. **Tracking Audit** — Use `analytics-tracking` to verify all events are firing
7. **Opportunities** — Use `page-cro` insights to identify conversion optimization targets
8. **Experiments** — Review active A/B tests and recommend new ones via `ab-test-setup`

## Input

$ARGUMENTS — Time period (default: last 30 days), site filter (default: all sites)

## Output

- Executive summary with key metrics per site
- Traffic trend (growing/flat/declining) with percentage change
- Top performing content with engagement metrics
- Underperforming content flagged for optimization
- Conversion funnel visualization with drop-off percentages
- Recommended experiments with expected impact
- Tracking gaps that need fixing
