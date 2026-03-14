---
name: admin-rebuild
description: "Systematic dead code elimination and admin consolidation. 4-phase methodology: Audit (read-only scan) -> Report (classification + action plan) -> Execute (batched consolidation) -> Verify (smoke tests + navigation check). Never deletes without verifying zero references. Use when the user asks to 'clean up admin', 'remove dead pages', 'consolidate admin', 'simplify dashboard', or 'admin rebuild'."
---

# Admin Rebuild

Systematically identify and eliminate dead admin code, merge duplicate pages, consolidate the admin dashboard from ~132 pages to ~60.

## 4-Phase Methodology

### Phase 1: AUDIT (read-only)
Classify each admin page as KEEP, MERGE, ARCHIVE, DELETE, or REBUILD.
- Check sidebar links in `premium-admin-nav.tsx`
- Check git log for recent activity
- Grep for references
- Check API routes for real data vs mock

### Phase 2: REPORT
Generate `page-registry.md` (every page classified) and `consolidation-map.md` (execution order).

### Phase 3: EXECUTE (batched, user-approved)
Each batch: present scope → update sidebar → delete/merge → run smoke tests → commit.

Known consolidation targets:
| Cluster | Current | Canonical | Action |
|---------|---------|-----------|--------|
| Affiliate | ~15 pages | affiliate-hq/ | Keep 6-tab HQ, delete rest |
| Content | ~11 pages | articles/ + content-engine/ | Merge duplicates |
| SEO | ~6 pages | seo/ (tabbed) | Keep tabbed, delete rest |
| Design | ~4 pages | design/ + media/ | Merge design-studio |
| Cron | ~5 pages | departures/ | Keep departures, delete rest |
| Settings | ~3 pages | settings/ + operations/ | Delete command-center/settings |

### Phase 4: VERIFY
- Run smoke tests (131+ tests)
- Zero sidebar 404s
- Cockpit loads all tabs
- No orphaned API routes
- Update CLAUDE.md

## Methodology Rules (MANDATORY)
1. NEVER delete without grep confirming zero references
2. ALWAYS redirect via sidebar update (not silent 404)
3. ALWAYS run smoke tests between batches
4. ALWAYS commit after each batch (bisectable)
5. ALWAYS use AskUserQuestion before each batch
6. Preserve useful patterns from deleted pages

## Related Skills
- **ship**: Commit and push batched changes
- **plan-review**: Review batch scope
- **site-health**: Verify health unchanged after rebuild
