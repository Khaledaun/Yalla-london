# Pre-Landing Review Checklist

Shared by `/plan-review` and `/ship` pre-landing review step.

## CRITICAL Checks (must be 0 violations — STOP ship if any found)

1. **Auth on all admin routes** — every `/api/admin/*` route uses `requireAdmin` with return value checked: `const authError = await requireAdmin(request); if (authError) return authError;`
2. **siteId scoping on all DB queries** — every Prisma query for content, articles, topics, affiliates includes `siteId` in WHERE clause
3. **No empty catch blocks** — every `catch` must log, recover, or cascade. `catch {}` is forbidden.
4. **Prisma field names match schema** — verify every `create()`/`update()`/`select()` field against `prisma/schema.prisma`. Common traps: BlogPost has no `title` (use `title_en`), no `quality_score` (use `seo_score`)
5. **Budget guards on cron routes** — 53s budget, 7s buffer for Vercel Pro 60s limit
6. **No `@/lib/prisma` imports** — canonical is `@/lib/db`
7. **No `@/lib/auth/admin` imports** — canonical is `@/lib/admin-middleware`
8. **No `{ not: null }` on required Prisma fields** — use `{ not: "" }` for String fields
9. **Required BlogPost fields provided** — `title_ar`/`content_ar` are non-nullable, always provide fallback values
10. **requireAdmin return value checked** — discarding the return silently bypasses auth

## INFORMATIONAL Checks (log but do not block ship)

1. **Hardcoded URLs** — any literal domain instead of `getBaseUrl()`/`getSiteDomain()`
2. **console.error visibility** — errors logged where Khaled can't see them (should be CronJobLog or dashboard)
3. **Dead imports** — unused import statements
4. **Over-engineering** — helpers/utilities created for one-time operations
5. **Missing type annotations** — `any` types that could be specific
6. **Hardcoded email addresses** — should be dynamic from site config
7. **Missing `res.ok` check before `res.json()`** — Safari compatibility
8. **Missing explicit Set generic** — `new Set(array)` instead of `new Set<string>(array)`
9. **Cron schedule conflicts** — two crons at the same minute in `vercel.json`
10. **Missing siteId on new CJ records** — CjCommission, CjClickEvent, CjOffer need siteId
