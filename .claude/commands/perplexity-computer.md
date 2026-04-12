# Perplexity Computer

Manage Perplexity Computer agentic AI tasks for the platform.

## Steps

1. **Understand the request** — Determine if the user wants to:
   - Create a new task (from template or custom)
   - View task status or results
   - Manage schedules
   - Check the Perplexity task dashboard

2. **For task creation:**
   - Check available templates via `GET /api/admin/perplexity-tasks?view=templates`
   - If a template matches, use `create_from_template` action
   - If custom, use `create` action with appropriate category and priority
   - Fill template variables from context (siteId, siteDomain, etc.)

3. **For status checks:**
   - Use `GET /api/admin/perplexity-tasks?view=dashboard` for overview
   - Use `GET /api/admin/perplexity-tasks?view=list&status=failed` for failures
   - Use `GET /api/admin/perplexity-tasks?view=task&taskId=X` for details

4. **For schedule management:**
   - Use `seed_recommended` to populate from templates
   - Use `toggle_schedule` to enable/disable
   - Use `create_schedule` for custom recurring tasks

## Output

- Task creation: confirm task ID, title, estimated credits
- Status: summary of queued/running/completed/failed counts
- Results: display task resultSummary and key findings
- Schedules: list active schedules with next run times

## Available Templates

| ID | Category | Title | Credits |
|----|----------|-------|---------|
| reg-affiliate-apply | registration | Apply to Affiliate Program | 15 |
| reg-directory-submit | registration | Submit to Travel Directory | 10 |
| seo-competitor-audit | seo | Competitor SEO Audit | 25 |
| seo-ai-citation-check | seo | AI Citation Check | 20 |
| seo-gsc-deep-analysis | seo | GSC Deep Analysis | 30 |
| design-mystery-shopper | design | UX Mystery Shopper | 20 |
| content-ai-trace-audit | content | AI Content Trace | 15 |
| content-photo-license-check | content | Photo License Check | 10 |
| content-fact-check | content | Fact Check Audit | 15 |
| intel-market-research | intelligence | Market Research | 30 |
| intel-partnership-scan | intelligence | Partnership Scan | 20 |
| ai-travel-tool-scan | ai-monitoring | AI Travel Tool Monitor | 25 |
| strategy-content-gap | strategy | Content Gap Analysis | 25 |
