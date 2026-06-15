# Climb Plan — Niche Focus + Authority Concentration (June 15, 2026)

## Diagnosis (data-backed, last 28d)
- 333 published articles, **280 (84%) get ZERO impressions** — dead weight diluting site quality.
- The **halal/Arab/Muslim-London niche = 55% of impressions, 75% of clicks** from a fraction of articles. This is what Google trusts the site for.
- 29 pages at **positions 11–30 with 3,702 impressions** — page-2, one push from page-1.
- Root cause: the engine was tuned to "80% general / 20% niche" — backwards for this site. General content can't rank (no authority) and dilutes the niche that can.

## Strategy: stop the bleeding, concentrate on what works.

### Phase A — Re-point the content engine to the niche (DURABLE, stops dead-weight production)
Flip every topic-generation ratio from "80% general" to niche-dominant (serve Arab/Gulf/Muslim travellers to London; weave the lens into broader topics).
- `app/api/cron/weekly-topics/route.ts` (×2 prompts)
- `lib/ai/grok-live-search.ts`
- `app/api/admin/topic-research/route.ts`
- `config/sites.ts` — yalla-london AUDIENCE block

### Phase B — Prune dead weight (CONCENTRATE authority, reversible via noindex)
- Add `noindex Boolean @default(false)` to BlogPost (migration).
- Wire into blog `generateMetadata` robots + exclude from sitemap.
- Set `noindex=true` on the conservative dead-weight subset: zero impressions 28d AND off-niche AND zero inbound internal links AND older than 30 days. Protect niche, recent, and any-impression pages.

### Phase C — Push the 29 striking-distance pages (FAST measurable win)
- Concentrate inbound internal links on the pos 11–30 pages with real impressions.

## Owner split
- Mine (executing now): Phases A, B, C.
- Khaled's (the real ceiling): backlinks/digital PR, real first-hand photos, brand/social, named-author credentials. Without these the site caps at long-tail; with them the niche authority compounds.

## Success metric (watch in GSC over 2–4 weeks)
- Niche pages climb toward top 3; striking-distance pages reach page 1.
- Indexed-but-zero-impression count falls (dead weight de-indexed).
- New articles are niche-focused (engine re-pointed).

---

## EXECUTED (June 15, 2026)

**Phase A — engine re-pointed to niche (DONE, code):**
- `weekly-topics/route.ts` (×2), `grok-live-search.ts`, `topic-research/route.ts`: flipped "80% general / 20% niche" → niche-dominant (3-of-5 / 6-7-of-10 serve Arab/Gulf/Muslim travellers; the rest cover broader London through that lens).
- `config/sites.ts` yalla-london: AUDIENCE re-focused from "all international visitors" to Arab/Gulf/Muslim travellers (primary), lens woven into every topic.
→ New content stops producing off-niche dead weight.

**Phase B — dead weight pruned (DONE, reversible):**
- Added `BlogPost.noindex` (migration `add_noindex_to_blogpost` applied to DB).
- Wired into blog `generateMetadata` robots (`shouldIndex = substantive && !noindex`) + excluded `noindex:true` from both sitemap queries.
- Set `noindex=true` on **124** off-niche + zero-impression + >30-day-old pages. Site goes 333 → **209 focused indexable pages**. Protected: all 81 niche, all 122 with any impressions, all 84 recent. Fully reversible (flip the flag).
- NOTE: noindex robots behaviour activates on deploy; the DB flags + migration are already live.

**Phase C — striking-distance (covered):**
- All 29 striking-distance pages (pos 11-30 w/ impressions) were auto-protected from the prune (they have impressions). The deployed seo-agent striking-distance link-targeting (batch 1) concentrates internal authority on them; the prune frees crawl budget toward them.

**Result:** TypeScript 0 errors. Engine niche-focused; index concentrated 333 → 209 on the niche + proven pages.

**Khaled's lever (the ceiling, not mine):** backlinks/digital PR, real first-hand photos, brand/social, named-author credentials. The on-page foundation is now optimal; authority is the remaining constraint.
