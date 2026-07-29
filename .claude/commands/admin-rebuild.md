# Admin Rebuild

Systematic dead code elimination and admin consolidation.

## Steps

1. Use the `admin-rebuild` skill with 4-phase methodology
2. **Phase 1: AUDIT** — Read-only scan of all 132 admin pages
3. **Phase 2: REPORT** — Generate page-registry.md and consolidation-map.md
4. **Phase 3: EXECUTE** — Batched consolidation with user approval per batch
5. **Phase 4: VERIFY** — Smoke tests + navigation check

## Arguments
$ARGUMENTS (optional: phase to start from — audit, report, execute, verify)
