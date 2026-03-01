# Conversion Audit

Run a full conversion rate optimization audit using the Conversion Optimization Agent.

## Steps

1. **Funnel Mapping** — Use `google-analytics` to map the conversion funnel per site
2. **Drop-off Analysis** — Identify biggest drop-off points in each funnel stage
3. **Page Audit** — Use `page-cro` to audit high-traffic pages for conversion issues
4. **Form Audit** — Use `form-cro` to review all lead capture and contact forms
5. **CTA Review** — Evaluate CTA placement, copy, and design using `copywriting`
6. **Mobile Experience** — Check mobile conversion rate vs. desktop (use `playwright-skill`)
7. **Trust Signals** — Audit social proof, reviews, partner logos per site
8. **Affiliate Optimization** — Review affiliate CTA placement and click-through rates
9. **Experiment Plan** — Use `ab-test-setup` to design top 3 experiments

## Input

$ARGUMENTS — Site to audit (default: all), funnel stage to focus on (optional)

## Output

- CRO score (0-100) per site
- Funnel visualization with conversion rates at each stage
- Top 5 quick wins (high impact, low effort)
- Top 5 strategic improvements (high impact, medium effort)
- Experiment roadmap with hypotheses and expected lift
- Priority ranking: Traffic × Conversion Gap × Effort
