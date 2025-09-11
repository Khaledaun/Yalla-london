# Phase 4B Handoff

## What changed
- Added Phase-4B API namespace:
  - /api/phase4b/topics/research  (Perplexity-powered; feature-flagged)
  - /api/phase4b/content/generate (stub; feature-flagged)
- Added lightweight observability: `yalla_london/app/lib/obs.ts`
  - JSON logs: req_start/req_end with millisecond latency and reqId
- API routes forced dynamic; client pages keep `'use client'` at top. Build is clean.

## Feature flags
- `FEATURE_PHASE4B_ENABLED`
- `FEATURE_TOPIC_RESEARCH`
- `FEATURE_AUTO_CONTENT_GENERATION`

## Required env (runtime)
- `DIRECT_URL`, `DATABASE_URL` (Supabase Session Pooler)
- `PPLX_API_KEY` **or** `PERPLEXITY_API_KEY` (Perplexity)

## Rerun checks
- A) Env preview
- B) DB ping + core tables
- C) Prisma generate + status
- D) Next build smoke

## Rollback
- Set `FEATURE_PHASE4B_ENABLED=false`
- Redeploy
- (Optional) revert files under `app/api/phase4b/*`
