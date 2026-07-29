# TDD

Test-driven development workflow. Enforces write-test-first → implement → verify → refactor cycle.

## Steps

1. **Understand the requirement** — Read the feature description from $ARGUMENTS. If unclear, ask one clarifying question (max).

2. **Write the test FIRST**:
   - For pipeline/cron changes: Add test functions to `yalla_london/app/scripts/smoke-test.ts`
   - For API routes: Add test to `yalla_london/app/public/test-connections.html`
   - For library functions: Add test to `yalla_london/app/test/` (appropriate spec file)
   - For new dev tasks: Add test function to `yalla_london/app/lib/dev-tasks/live-tests.ts` and register in TEST_REGISTRY
   - The test MUST fail before implementation (red phase)

3. **Implement the minimum code** to make the test pass:
   - Follow all CLAUDE.md engineering standards
   - Import from `constants.ts` for any retry/budget values
   - Use `optimisticBlogPostUpdate()` for any BlogPost writes
   - Validate phase transitions via `validatePhaseTransition()`
   - Check `requireAdmin` on admin routes, budget guards on crons

4. **Verify** — Run the specific test:
   - Smoke tests: `npx tsx scripts/smoke-test.ts 2>&1 | grep -A2 "TEST_NAME"`
   - TypeScript: `npx tsc --noEmit 2>&1 | grep "error TS" | head -20`
   - Unit tests: `npx vitest run test/FILE.spec.ts` (if vitest configured)

5. **Refactor** (only if test passes):
   - Remove duplication
   - Extract constants to `constants.ts` if reused
   - Ensure no hardcoded values that should be configurable

6. **Repeat** — If the feature has multiple parts, cycle back to step 2 for each part.

7. **Final verification**:
   - Run full smoke test suite: `npx tsx scripts/smoke-test.ts`
   - Run TypeScript check: `npx tsc --noEmit`
   - Verify no regressions

## Arguments
$ARGUMENTS (required: description of the feature/fix to implement using TDD)
