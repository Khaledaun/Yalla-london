# Code Review

Pre-commit semantic code review against CLAUDE.md engineering standards. Run this before committing to catch issues lint-staged misses.

## Steps

1. **Gather changes** — Run `git diff --cached` (staged) and `git diff` (unstaged). If nothing staged, review unstaged changes.

2. **Schema validation** — For every `prisma.*.create()` or `prisma.*.update()` call in the diff:
   - Read `yalla_london/app/prisma/schema.prisma`
   - Verify every field exists, is the correct type, and required fields have values
   - **Known traps**: BlogPost has `title_en`/`title_ar` (NOT `title`), `seo_score` (NOT `quality_score`), `created_at` (NOT `published_at`). ArticleDraft has `keyword` (NOT `title`), `topic_proposal_id` (NOT `topic_id`), NO `slug` field.

3. **Function signature check** — For every function call in the diff:
   - Read the actual function definition in the source file
   - Verify argument count, order, and types match the signature
   - **Known traps**: `getLinksForContent(content, language, category, tags, maxLinks?, siteId?)` requires 4-6 args, NOT 3.

4. **Import path check** — Verify all imports resolve:
   - `@/lib/db` is canonical for Prisma (NOT `@/lib/prisma`, NOT `@/lib/auth/admin`)
   - `@/lib/admin-middleware` exports `requireAdmin`, `withAdminAuth`, `requireAdminOrCron`
   - `@/lib/content-pipeline/constants` is the single source of truth for retry caps, budget values, thresholds

5. **Engineering standards sweep**:
   - No empty `catch {}` blocks (must log with context)
   - No `Math.random()` for IDs (use `crypto.randomUUID()`)
   - No hardcoded `"yalla-london"` (use `getDefaultSiteId()`)
   - No hardcoded URLs (use `getSiteDomain()` / `getBaseUrl()`)
   - No `|| 0` on nullable Prisma fields (use `?? defaultValue`)
   - No `dangerouslySetInnerHTML` without `sanitizeHtml()`
   - No `window.confirm()` (use `useConfirm` hook)
   - All admin API routes have `requireAdmin` as FIRST guard
   - All cron routes have budget guards (`BUDGET_MS`)
   - All DB queries on content tables include `siteId` scope

6. **Multi-site coherence** — If the change touches shared code (`lib/`, `config/`, `middleware`):
   - Grep for all callers/consumers
   - Verify the change works for ALL 6 configured sites
   - Check for hardcoded site-specific values

7. **Report** — Output findings as:
   - 🛑 **BLOCKING**: Must fix before commit (schema mismatch, wrong imports, security gaps)
   - ⚠️ **WARNING**: Should fix but won't break (missing siteId scope, hardcoded strings)
   - ✅ **CLEAN**: No issues found

## Arguments
$ARGUMENTS (optional: `--staged-only` to review only staged changes)
