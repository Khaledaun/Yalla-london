#!/usr/bin/env bash
# =============================================================================
# Yalla London — Post-Audit Deployment Script
# =============================================================================
# Run this ONCE after merging the audit fix branch.
#
# Prerequisites:
#   1. A .env file at yalla_london/app/.env with DATABASE_URL and DIRECT_URL
#   2. Node.js 18+ and npm installed
#   3. Access to the Supabase/PostgreSQL database
#
# Usage:
#   chmod +x scripts/deploy-audit-fixes.sh
#   ./scripts/deploy-audit-fixes.sh
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$SCRIPT_DIR/../yalla_london/app"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()   { echo -e "${GREEN}[OK]${NC}   $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
fail()  { echo -e "${RED}[FAIL]${NC} $1"; exit 1; }

# ── Step 0: Verify prerequisites ────────────────────────────────────────────
echo ""
echo "=============================="
echo " Yalla London Deploy Script"
echo "=============================="
echo ""

cd "$APP_DIR" || fail "Cannot cd to $APP_DIR"

if [ ! -f ".env" ]; then
  fail ".env file not found at $APP_DIR/.env — copy .env.example and fill in values"
fi

if ! grep -q "DATABASE_URL" .env; then
  fail "DATABASE_URL not set in .env"
fi

if ! grep -q "NEXTAUTH_SECRET" .env; then
  fail "NEXTAUTH_SECRET not set in .env"
fi

log "Prerequisites verified"

# ── Step 1: Install dependencies ────────────────────────────────────────────
echo ""
echo "--- Step 1: Install dependencies ---"
PUPPETEER_SKIP_DOWNLOAD=true npm install --ignore-scripts 2>/dev/null
log "Dependencies installed"

# ── Step 2: Generate Prisma client ──────────────────────────────────────────
echo ""
echo "--- Step 2: Generate Prisma client ---"
npx prisma generate
log "Prisma client generated"

# ── Step 3: Run database migration ─────────────────────────────────────────
echo ""
echo "--- Step 3: Run database migration ---"
echo "This will apply the security audit migration (passwordHash, soft delete, indexes)"
echo ""

npx prisma migrate deploy
log "Migration applied successfully"

# ── Step 4: Verify migration ───────────────────────────────────────────────
echo ""
echo "--- Step 4: Verify migration applied ---"

# Quick check: does the passwordHash column exist?
VERIFY=$(npx prisma db execute --stdin <<'SQL' 2>&1 || true
SELECT column_name FROM information_schema.columns
WHERE table_name = 'User' AND column_name = 'passwordHash';
SQL
)

if echo "$VERIFY" | grep -q "passwordHash"; then
  log "passwordHash column exists on User table"
else
  warn "Could not verify passwordHash column — check manually"
fi

# ── Step 5: Seed admin user ────────────────────────────────────────────────
echo ""
echo "--- Step 5: Seed initial admin user ---"

# Check required env vars
if [ -z "${INITIAL_ADMIN_EMAIL:-}" ]; then
  echo ""
  warn "INITIAL_ADMIN_EMAIL not set in environment"
  echo "  Set it now or add to .env, then run:"
  echo "    INITIAL_ADMIN_EMAIL=you@example.com INITIAL_ADMIN_PASSWORD='YourSecurePass123!' npx tsx lib/initial-admin-setup.ts"
  echo ""
else
  if [ -z "${INITIAL_ADMIN_PASSWORD:-}" ]; then
    fail "INITIAL_ADMIN_PASSWORD is required when INITIAL_ADMIN_EMAIL is set"
  fi
  npx tsx -e "
    require('dotenv').config();
    const { createInitialAdminUser } = require('./lib/initial-admin-setup');
    createInitialAdminUser().then(r => {
      if (r.success) { console.log('Admin created:', r.user.email); }
      else { console.error('Failed:', r.error); process.exit(1); }
    });
  "
  log "Admin user seeded"
fi

# ── Step 6: Build verification ─────────────────────────────────────────────
echo ""
echo "--- Step 6: Build verification ---"
npx next build
log "Build successful"

# ── Summary ─────────────────────────────────────────────────────────────────
echo ""
echo "=============================="
echo " Deployment Complete"
echo "=============================="
echo ""
echo "Required env vars for production:"
echo "  DATABASE_URL          — PostgreSQL connection string"
echo "  DIRECT_URL            — Direct DB connection (for migrations)"
echo "  NEXTAUTH_SECRET       — openssl rand -base64 32"
echo "  NEXTAUTH_URL          — https://yourdomain.com"
echo "  ADMIN_EMAILS          — comma-separated admin emails"
echo "  INITIAL_ADMIN_EMAIL   — first admin email (one-time setup)"
echo "  INITIAL_ADMIN_PASSWORD — first admin password, min 12 chars"
echo ""
echo "Optional env vars:"
echo "  LIGHTHOUSE_API_KEY    — Google PageSpeed Insights API key"
echo "  CRON_SECRET           — Secret for cron job endpoints"
echo "  SENTRY_DSN            — Error tracking"
echo ""
log "All done. Run 'npm start' to launch."
