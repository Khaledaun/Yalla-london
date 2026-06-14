# Content Pipeline Architecture — Reservoir + Incremental Builder

## Overview

The content pipeline generates high-quality, bilingual (EN/AR) travel articles autonomously. It replaces the monolithic "generate everything in one API call" approach with an 8-phase incremental pipeline that:

- Fits within Vercel's 120s function timeout (uses 53s budget per invocation)
- Produces crash-resilient, resumable articles (each phase saves to DB)
- Generates EN and AR as independent drafts with culturally adapted prompts
- Scores articles deterministically before publishing
- Publishes only the best articles from a quality reservoir

---

## Architecture Diagram

```
                                     Every 15 min
                                         |
                                  content-builder
                                         |
                          +------- Pick a draft -------+
                          |                            |
                    [Has in-progress?]          [No → Create pair]
                          |                            |
                    Pick oldest,                 EN draft (research)
                    most advanced                AR draft (research)
                          |                    linked via paired_draft_id
                          v
                    Run ONE phase
                          |
    +-----+-------+------+------+-------+------+------+
    |     |       |      |      |       |      |      |
  research outline drafting assembly images  seo  scoring
    |     |       |      |      |       |      |      |
    v     v    (batched)  v      v       v      v      v
  Save   Save  up to 3  Save   Save   Save   Save  reservoir
  to DB  to DB sections  to DB  to DB  to DB  to DB  or rejected
                to DB
                                                        |
                                                  Daily 08:30 UTC
                                                        |
                                                 content-selector
                                                        |
                                              Quality ≥ 60? ──No──> stays in reservoir
                                                        |
                                                       Yes
                                                        |
                                              Keyword diversity OK?
                                                        |
                                              Look up paired draft
                                              Merge EN + AR content
                                                        |
                                                        v
                                              BlogPost (bilingual)
                                              + SeoMeta
                                              + URLIndexingStatus
                                              + "needs-review" tag
```

---

## Key Files

| File | Purpose | Lines |
|------|---------|-------|
| `lib/content-pipeline/phases.ts` | All 8 phase implementations + dispatcher | ~806 |
| `app/api/cron/content-builder/route.ts` | Cron: picks draft, runs one phase, saves | ~381 |
| `app/api/cron/content-selector/route.ts` | Cron: publishes best reservoir articles | ~500 |
| `prisma/schema.prisma` (ArticleDraft) | Data model storing all pipeline state | ~30 fields |
| `data/photo-library.ts` | Curated photo library for image injection | ~200 photos |
| `config/sites.ts` | Site config (topics, keywords, prompts) | 5 sites |

---

## The 8 Phases

### Phase 1: Research
- **Input**: keyword, locale, site config
- **Output**: `research_data` (SERP insights, audience, keyword data, content strategy)
- **AI**: Yes (generateJSON)
- **Budget**: ~5-10s

### Phase 2: Outline
- **Input**: research_data, keyword, locale
- **Output**: `outline_data` (title, sections[], intro, conclusion, affiliatePlacements, internalLinkPlan, schemaType), `topic_title`, `sections_total`
- **AI**: Yes (generateJSON)
- **Budget**: ~5-10s

### Phase 3: Drafting (Batched)
- **Input**: outline_data, existing sections_data, sections_completed
- **Output**: `sections_data` (array of {heading, content, wordCount, keywords_used, level}), `sections_completed`
- **AI**: Yes (generateJSON per section)
- **Budget**: Up to 3 sections per invocation, budget-aware (stops if <15s remaining)
- **Multi-invocation**: A 8-section article takes 3 invocations (3+3+2 sections)

### Phase 4: Assembly
- **Input**: sections_data, outline_data
- **Output**: `assembled_html` (polished, coherent article with internal links + affiliate placeholders), `word_count`
- **AI**: Yes (generateJSON — editorial pass)
- **Budget**: ~10-15s

### Phase 5: Images
- **Input**: assembled_html, keyword, locale
- **Output**: `assembled_html` (with images injected), `images_data` (featured + inline photo metadata)
- **AI**: No (library search + optional Unsplash API)
- **Strategy cascade**:
  1. Photo library keyword search
  2. Individual word fragment search
  3. Category inference mapping (e.g., "restaurant" → "restaurants-food")
  4. Unsplash API fallback (if `UNSPLASH_ACCESS_KEY` set)
  5. Random library photos as last resort
- **Injection**: 1 featured image after first heading + 2-3 inline images at evenly-spaced h2 tags
- **Non-fatal**: If images fail completely, proceeds without images

### Phase 6: SEO
- **Input**: assembled_html, research_data, outline_data, images_data
- **Output**: `seo_meta` (metaTitle, metaDescription, slug, keywords[], schema JSON-LD, ogImage, seoChecklist)
- **AI**: Yes (generateJSON)
- **Budget**: ~5-10s

### Phase 7: Scoring
- **Input**: assembled_html, seo_meta, word_count, images_data
- **Output**: `quality_score`, `seo_score`, `readability_score`, `content_depth_score`
- **AI**: No (deterministic scoring)
- **Scoring breakdown** (max 100 points):

| Category | Max Points | Criteria |
|----------|-----------|----------|
| Word count | 25 | ≥2000=25, ≥1500=20, ≥1200=15, ≥800=10, else=5 |
| Meta title | 10 | 10-60 chars with content = 10 |
| Meta description | 10 | 120-160 chars = 10 |
| Schema markup | 10 | Present = 10 |
| H2 headings | 10 | ≥4 = 10, ≥2 = 5 |
| H3 headings | 5 | ≥2 = 5 |
| Internal links | 10 | ≥3 = 10, ≥1 = 5 |
| Affiliates | 5 | ≥2 = 5, ≥1 = 3 |
| Images | 10 | ≥3 = 10, ≥1 = 5 |
| Keywords in content | 5 | Primary keyword present = 5 |

- **Quality gate**: ≥50 → "reservoir", <50 → "rejected"

### Phase 8: Terminal States
- **reservoir**: Article is ready for the content-selector to evaluate for publishing
- **published**: Article was promoted to BlogPost
- **rejected**: Article failed quality gate or had too many phase failures (≥3 retries)

---

## Bilingual Strategy

### How It Works
Each topic creates TWO independent drafts:
- **EN draft**: locale="en", processes through all 8 phases with English prompts
- **AR draft**: locale="ar", processes through all 8 phases with Arabic-native prompts

They are linked via `paired_draft_id` (bidirectional: each points to the other).

### Arabic Is Not Translation
Arabic articles use `getLocaleDirectives()` which embeds into every AI prompt:
- Gulf Arabic (Modern Standard Arabic with Gulf terminology)
- Arabic sentence structure (VSO: verb-subject-object)
- Arabic punctuation: ، ؛ ؟ ! « »
- Halal-first framing (HMC/HFA certification, mosque proximity)
- Family-friendly focus
- Prices in both GBP and AED
- RTL HTML attributes (`dir="rtl" lang="ar"`)
- No alcohol references (replaced with alternatives)

### Bilingual BlogPost Merging
When content-selector promotes a draft:
1. Looks up `paired_draft_id` to find the other language's draft
2. If paired draft has assembled_html → merges both into one BlogPost:
   - `content_en` ← EN draft's `assembled_html`
   - `content_ar` ← AR draft's `assembled_html`
   - `title_en` ← EN draft's `topic_title`
   - `title_ar` ← AR draft's `topic_title`
3. If paired draft hasn't completed → publishes with one language, tags "missing-english" or "missing-arabic"
4. Both drafts are marked as "published" to prevent double-publishing

---

## Content Builder Cron

**Schedule**: Every 15 minutes (`*/15 * * * *`)

### Execution Flow
1. **Find work**: Query for oldest in-progress draft, sorted by pipeline advancement (more advanced phases processed first: scoring > seo > images > assembly > drafting > outline > research)
2. **Create if empty**: If no in-progress drafts, create a new EN+AR pair from TopicProposal queue (or fallback to site template topics)
3. **Run phase**: Execute the current phase within the remaining time budget
4. **Save result**: Update ArticleDraft with phase output and advance to next phase
5. **Error handling**: Increment `phase_attempts`, reject after 3 failures

### Reservoir Cap
Will not create new drafts if reservoir already has ≥10 articles (waits for content-selector to publish some).

### Topic Source Priority
1. TopicProposal table (status: ready/queued/planned/proposed, ordered by confidence_score desc)
2. Fallback: site.topicsEN template topics (cycled by day-of-year)

---

## Content Selector Cron

**Schedule**: Daily at 08:30 UTC (`30 8 * * *`)

### Execution Flow
1. **Find candidates**: reservoir articles with quality_score ≥ 60
2. **Keyword diversity**: Skip articles with overlapping keywords (substring match)
3. **Paired draft de-duplication**: Skip EN/AR pair's other draft if one is already selected
4. **Promote**: For each selected draft (max 2 per run):
   - Look up paired draft → merge bilingual content
   - Create BlogPost with both languages
   - Create SeoMeta with canonical URL, schema, OG tags
   - Create URLIndexingStatus (discovered) for Google Indexing cron
   - Auto-inject structured data via enhancedSchemaInjector
   - Mark both drafts as published
   - Tag BlogPost with "needs-review" for admin dashboard
5. **Budget guard**: Stop if <5s remaining

---

## Quality Thresholds

| Threshold | Value | Where | Effect |
|-----------|-------|-------|--------|
| Scoring quality gate | ≥ 50 | phases.ts (scoring) | ≥50 → reservoir, <50 → rejected |
| Publishing quality gate | ≥ 60 | content-selector | Only reservoir articles scoring ≥60 get promoted to BlogPost |
| Max retries per phase | 3 | content-builder | After 3 failures, draft is rejected |
| Reservoir cap | 10 | content-builder | No new drafts created if ≥10 in reservoir |
| Max published per run | 2 | content-selector | At most 2 articles published per daily run |

**Note**: Articles scoring 50-59 enter the reservoir but never get published. They accumulate harmlessly. This provides a buffer zone — if the quality threshold is lowered in the future, those articles become immediately available.

---

## Data Model (ArticleDraft)

```
ArticleDraft
├── Identity: id, site_id, keyword, locale, topic_title
├── Pipeline: current_phase, phase_attempts, last_error, phase_started_at
├── Sections: sections_completed, sections_total
├── Phase Data (all JsonB):
│   ├── research_data    ← Phase 1 output
│   ├── outline_data     ← Phase 2 output
│   ├── sections_data    ← Phase 3 output (array)
│   ├── seo_meta         ← Phase 6 output
│   └── images_data      ← Phase 5 output
├── Content: assembled_html (Text), assembled_html_alt (Text, legacy)
├── Scores: quality_score, seo_score, word_count, readability_score, content_depth_score
├── Bilingual: paired_draft_id (links EN↔AR)
├── Publishing: blog_post_id, published_at, needs_review
├── Meta: ai_model_used, generation_strategy, topic_proposal_id
├── Lifecycle: created_at, updated_at, completed_at, rejection_reason
└── Indexes: [current_phase, site_id], [quality_score], [paired_draft_id]
```

**Phase flow values for `current_phase`**:
```
research → outline → drafting → assembly → images → seo → scoring → reservoir → published
                                                                         ↘ rejected
```

---

## Image Pipeline

### Photo Library (`data/photo-library.ts`)
Curated collection of ~200+ photos with:
- `alt_en` / `alt_ar` (bilingual alt text)
- Categories: london-landmarks, restaurants-food, hotels-luxury, shopping, football-stadiums, events-celebrations, transport, parks-nature, architecture
- Tags for keyword matching
- Source/photographer attribution

### Strategy Cascade
```
1. searchPhotos(keyword)           → Match by keyword + tags
2. searchPhotos(individual words)  → Match by word fragments
3. getPhotosByCategory(inferred)   → "hotel" → hotels-luxury, etc.
4. Unsplash API                    → External fallback (needs UNSPLASH_ACCESS_KEY)
5. Random from library             → Last resort
```

### Injection
- **Featured image**: After first h1/h2, `loading="eager"`, with figcaption
- **Inline images**: Evenly spaced at h2 boundaries, `loading="lazy"`
- Alt text uses `alt_ar` for Arabic locale, `alt_en` for English

---

## Error Handling & Resilience

| Scenario | Handling |
|----------|----------|
| Phase fails | Increment `phase_attempts`, retry on next cron run |
| Phase fails 3 times | Draft rejected with reason |
| Image phase fails | Non-fatal — proceeds to SEO phase without images |
| SeoMeta creation fails | Non-fatal — BlogPost still created |
| URLIndexingStatus fails | Non-fatal — BlogPost still created |
| Paired draft not ready | Publish single language, tag "missing-[language]" |
| Budget exhausted | Stop current work, save partial progress |
| AI provider fails | generateJSON falls back through: Grok → Claude → OpenAI → Gemini → AbacusAI |
| DB table missing | Return 503 with migration instructions |

---

## Admin Review

All auto-published articles are flagged for human review:
- BlogPost tagged with `"needs-review"`
- ArticleDraft has `needs_review: true`
- Articles missing one language tagged with `"missing-english"` or `"missing-arabic"`
- Articles tagged with `"bilingual"` when both languages are present

Admin dashboard can filter by these tags to prioritize review.

---

## Vercel Configuration

```json
{
  "crons": [
    { "path": "/api/cron/content-builder", "schedule": "*/15 * * * *" },
    { "path": "/api/cron/content-selector", "schedule": "30 8 * * *" }
  ],
  "functions": {
    "app/api/cron/**/*.ts": { "maxDuration": 120 }
  }
}
```

Both routes support GET and POST for Vercel cron compatibility.
Both routes support `?healthcheck=true` for monitoring.

---

## Post-Deploy Checklist

1. Run DB migration to create `article_drafts` table with all new columns
2. Verify `CRON_SECRET` is set in Vercel environment
3. (Optional) Set `UNSPLASH_ACCESS_KEY` for image fallback
4. Verify healthcheck: `GET /api/cron/content-builder?healthcheck=true`
5. Verify healthcheck: `GET /api/cron/content-selector?healthcheck=true`
6. Monitor first few cron runs in Vercel logs for phase execution
7. Check admin dashboard for "needs-review" articles after first full cycle

---

## Audit Findings (2026-02-14)

### Critical Fix Applied
**Bilingual BlogPost creation was broken.** Each draft only contained one language's content (EN or AR), but the content-selector was trying to fill both `content_en` and `content_ar` from a single draft. For AR drafts, the Arabic title was incorrectly placed in `title_en`.

**Fix**: Content-selector now looks up the paired draft via `paired_draft_id`, extracts content from both languages, and merges them into a single bilingual BlogPost. Both drafts are marked as published. If the paired draft hasn't completed its pipeline yet, the article publishes with one language and is tagged for review.

### All Cross-Reference Checks Passed
- phases.ts output fields ↔ content-builder merge logic: All match
- content-builder DB writes ↔ ArticleDraft schema: All match
- content-selector DB reads ↔ ArticleDraft schema: All match
- content-selector BlogPost creation ↔ BlogPost schema: All match
- content-selector SeoMeta creation ↔ SeoMeta schema: All match
- content-selector URLIndexingStatus ↔ URLIndexingStatus schema: All match
- SiteConfig fields (categoryName, destination, domain, name) ↔ usage: All match

### TypeScript Compilation
Zero errors in pipeline source code. Pre-existing `.next/types/` cache errors are unrelated.

### Notes
- Articles scoring 50-59 enter reservoir but never publish (threshold gap between scoring gate=50 and publish gate=60). Harmless but worth knowing.
- `assembled_html_alt` field in ArticleDraft is legacy from the old translation approach. It's never written by the current pipeline (each locale has its own draft). Can be removed in a future cleanup.
