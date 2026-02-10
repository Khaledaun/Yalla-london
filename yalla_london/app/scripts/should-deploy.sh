#!/bin/bash
# ─────────────────────────────────────────────────────────────────
# Vercel Ignored Build Step — Selective Deployment
#
# Each Vercel project sets SITE_ID env var (e.g. "yalla-london").
# This script decides whether to build based on what files changed.
#
# Exit 1 = proceed with build
# Exit 0 = skip build
#
# Setup: In each Vercel project → Settings → Git → Ignored Build Step:
#   bash scripts/should-deploy.sh
#
# Each Vercel project must have these env vars:
#   SITE_ID = "yalla-london" (or "arabaldives", etc.)
# ─────────────────────────────────────────────────────────────────

set -e

SITE_ID="${SITE_ID:-}"

# If no SITE_ID set, always build (safety fallback)
if [ -z "$SITE_ID" ]; then
  echo "⚠ No SITE_ID env var set — building by default"
  exit 1
fi

echo "🔍 Checking deployment for site: $SITE_ID"

# ─── Get changed files ────────────────────────────────────────────
# VERCEL_GIT_PREVIOUS_SHA is set by Vercel to the last successful deployment commit
# If not available (first deploy), always build
if [ -z "$VERCEL_GIT_PREVIOUS_SHA" ]; then
  echo "✅ First deployment — building"
  exit 1
fi

CHANGED_FILES=$(git diff --name-only "$VERCEL_GIT_PREVIOUS_SHA"...HEAD 2>/dev/null || echo "")

# If we can't determine changes, always build (safety)
if [ -z "$CHANGED_FILES" ]; then
  echo "⚠ Cannot determine changed files — building by default"
  exit 1
fi

echo "📝 Changed files since last deploy:"
echo "$CHANGED_FILES" | head -30
TOTAL_CHANGED=$(echo "$CHANGED_FILES" | wc -l)
if [ "$TOTAL_CHANGED" -gt 30 ]; then
  echo "   ... and $((TOTAL_CHANGED - 30)) more"
fi

# ─── Classification rules ─────────────────────────────────────────
#
# CORE FILES → all sites must rebuild:
#   - middleware.ts (tenant routing)
#   - lib/ (shared libraries)
#   - components/ (shared UI)
#   - app/ pages and API routes (shared)
#   - config/sites.ts (all site configs)
#   - prisma/ (database schema)
#   - package.json, yarn.lock, next.config.* (dependencies)
#   - tsconfig.json, .eslintrc.json (tooling)
#   - public/ (shared static assets)
#   - styles/ (shared CSS)
#
# SITE-SPECIFIC FILES → only that site rebuilds:
#   - sites/{site-id}/ (site-specific overrides, assets, content)
#
# NON-CODE FILES → skip build entirely:
#   - .claude/ (AI memory, skills — not deployed)
#   - docs/, *.md (documentation only)
#   - scripts/ (dev tooling, not part of the build)
#   - .github/ (CI config)
#   - .gitignore, .env.example
#

HAS_CORE_CHANGES=false
HAS_MY_SITE_CHANGES=false
HAS_OTHER_SITE_CHANGES=false
ONLY_NONDEPLOY_CHANGES=true

while IFS= read -r file; do
  # Skip empty lines
  [ -z "$file" ] && continue

  # ── Non-deployable files (never trigger builds) ──
  case "$file" in
    .claude/*|docs/*|*.md|scripts/*|.github/*|.gitignore|.env.example|.env.*.example)
      continue
      ;;
  esac

  # If we get here, at least one deployable file changed
  ONLY_NONDEPLOY_CHANGES=false

  # ── Site-specific files ──
  # Convention: sites/{site-id}/ contains per-site overrides
  if echo "$file" | grep -qE "^(yalla_london/app/)?sites/"; then
    # Extract site-id from path: sites/{site-id}/...
    FILE_SITE=$(echo "$file" | sed -E 's|^(yalla_london/app/)?sites/([^/]+)/.*|\2|')
    if [ "$FILE_SITE" = "$SITE_ID" ]; then
      HAS_MY_SITE_CHANGES=true
      echo "  📌 Site-specific change (mine): $file"
    else
      HAS_OTHER_SITE_CHANGES=true
      echo "  🔇 Site-specific change (other: $FILE_SITE): $file"
    fi
    continue
  fi

  # ── Everything else is a core change ──
  HAS_CORE_CHANGES=true
  echo "  ⚙️  Core change: $file"

done <<< "$CHANGED_FILES"

# ─── Decision ──────────────────────────────────────────────────────

echo ""
echo "─── Deployment Decision ───"
echo "  Site:               $SITE_ID"
echo "  Core changes:       $HAS_CORE_CHANGES"
echo "  My site changes:    $HAS_MY_SITE_CHANGES"
echo "  Other site changes: $HAS_OTHER_SITE_CHANGES"
echo "  Only non-deploy:    $ONLY_NONDEPLOY_CHANGES"

# Skip if only non-deployable files changed (docs, scripts, .claude)
if [ "$ONLY_NONDEPLOY_CHANGES" = true ]; then
  echo ""
  echo "⏭ SKIP — only non-deployable files changed (docs, scripts, etc.)"
  exit 0
fi

# Build if any core file changed (affects all sites)
if [ "$HAS_CORE_CHANGES" = true ]; then
  echo ""
  echo "✅ BUILD — core files changed (affects all sites)"
  exit 1
fi

# Build if my site's specific files changed
if [ "$HAS_MY_SITE_CHANGES" = true ]; then
  echo ""
  echo "✅ BUILD — site-specific files changed for $SITE_ID"
  exit 1
fi

# Skip if only other sites' specific files changed
if [ "$HAS_OTHER_SITE_CHANGES" = true ]; then
  echo ""
  echo "⏭ SKIP — only other sites' files changed (not $SITE_ID)"
  exit 0
fi

# Safety fallback — if we can't decide, build
echo ""
echo "⚠ FALLBACK BUILD — could not classify changes"
exit 1
