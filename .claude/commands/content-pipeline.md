# Content Pipeline

Execute the full content creation pipeline from research to optimization.

## Steps

1. **Research** — Use `tavily-web` and `exa-search` to discover topics and gather sources
2. **Outline** — Use `content-research-writer` to build structured outline with citations
3. **Create** — Use `content-creator` with site-specific brand voice for bilingual content (EN/AR)
4. **Edit** — Use `copy-editing` for clarity, tone, and accuracy passes
5. **Optimize** — Use `seo-optimizer` for keyword density, meta tags, internal links
6. **Schema** — Use `schema-markup` to add Article + FAQ JSON-LD
7. **Validate** — Run pre-publication gate (SEO score >= 70, content length, metadata completeness)
8. **Track** — Verify `analytics-tracking` events are in place

## Input

$ARGUMENTS — Topic, keyword, or site to create content for.

Examples:
- `/content-pipeline "Best restaurants in Mayfair" for yalla-london`
- `/content-pipeline "Top 10 Maldives resorts" for arabaldives`
- `/content-pipeline trending topics for dubai`

## Output

- BlogPost record with bilingual content
- SEO metadata (title, description, OG image)
- JSON-LD structured data
- Internal links (minimum 3)
- Social distribution brief (for Growth Agent)
