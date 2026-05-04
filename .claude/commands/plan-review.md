# Plan Review

Run a structured scope challenge and engineering review before implementing a feature.

## Usage

```
/plan-review <feature description or task>
```

## Steps

1. **Read the feature description** from $ARGUMENTS
2. **Step 0: Scope Challenge** (mandatory, never skipped)
   - Gate 1: Premise Challenge -- is this the right problem? Does it connect to revenue?
   - Gate 2: Existing Code Audit -- search codebase for what already exists
   - Gate 3: Minimum Viable Version -- define V0 (hack), V1 (proper), V2 (polished)
   - Gate 4: Mode Selection -- EXPAND / HOLD / REDUCE
3. **Review Sections** (only if mode is EXPAND or REDUCE)
   - Section 1: Architecture and data flow trace
   - Section 2: Code quality, DRY, Prisma field verification
   - Section 3: Test coverage and smoke test impact
   - Section 4: Performance and budget guards
4. **Run pre-landing checklist** from `.claude/skills/plan-review/checklist.md` (CRITICAL checks only)
5. **Generate outputs**:
   - Failure mode registry (table)
   - NOT in scope list
   - What already exists (file paths)
   - CLAUDE.md update items
   - Deferred work log

## Output

A structured review report containing:

- **Mode decision**: EXPAND / HOLD / REDUCE with justification
- **Failure mode registry**: Table of what could go wrong and mitigations
- **NOT in scope**: Explicit boundaries to prevent scope creep
- **What already exists**: Code references with file paths and line numbers
- **Recommended version**: V0, V1, or V2 with rationale
- **CLAUDE.md updates**: New rules or known gaps to document
- **Deferred work log**: Features cut from scope for future sessions

## Examples

```
/plan-review Add email digest for weekly content summary
/plan-review Build a competitor monitoring dashboard
/plan-review Implement Arabic server-side rendering for all static pages
```

$ARGUMENTS
