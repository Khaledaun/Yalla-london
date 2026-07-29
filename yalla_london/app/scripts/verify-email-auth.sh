#!/bin/bash
# =============================================================================
# Email Authentication Verification Script
# Checks SPF, DKIM, DMARC, and MX records for Zenitha.Luxury LLC domains
# Run: bash scripts/verify-email-auth.sh
# =============================================================================

set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

pass() { echo -e "${GREEN}✓ $1${NC}"; }
fail() { echo -e "${RED}✗ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠ $1${NC}"; }

DOMAINS=("zenitha.luxury" "yalla-london.com")

echo "============================================"
echo "  Email Authentication Verification"
echo "  $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "============================================"
echo ""

for DOMAIN in "${DOMAINS[@]}"; do
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  Domain: $DOMAIN"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  # --- SPF ---
  echo "📧 SPF Record:"
  SPF=$(dig +short TXT "$DOMAIN" 2>/dev/null | grep -i "v=spf1" || true)
  if [ -n "$SPF" ]; then
    pass "SPF found: $SPF"
    if echo "$SPF" | grep -q "send.resend.com"; then
      pass "Resend SPF included"
    else
      warn "Resend SPF NOT included — add 'include:send.resend.com' to SPF record"
    fi
    if echo "$SPF" | grep -q "_spf.google.com"; then
      pass "Google Workspace SPF included"
    fi
  else
    fail "No SPF record found"
    echo "  → Add TXT record: v=spf1 include:send.resend.com ~all"
    if [ "$DOMAIN" = "zenitha.luxury" ]; then
      echo "  → With Google Workspace: v=spf1 include:_spf.google.com include:send.resend.com ~all"
    fi
  fi
  echo ""

  # --- DKIM ---
  echo "🔑 DKIM Records:"
  RESEND_DKIM=$(dig +short TXT "resend._domainkey.$DOMAIN" 2>/dev/null || true)
  if [ -n "$RESEND_DKIM" ]; then
    pass "Resend DKIM found for resend._domainkey.$DOMAIN"
  else
    RESEND_DKIM_CNAME=$(dig +short CNAME "resend._domainkey.$DOMAIN" 2>/dev/null || true)
    if [ -n "$RESEND_DKIM_CNAME" ]; then
      pass "Resend DKIM CNAME found: $RESEND_DKIM_CNAME"
    else
      fail "No Resend DKIM record at resend._domainkey.$DOMAIN"
      echo "  → Add the CNAME records provided by Resend dashboard after domain verification"
    fi
  fi
  echo ""

  # --- DMARC ---
  echo "🛡️  DMARC Record:"
  DMARC=$(dig +short TXT "_dmarc.$DOMAIN" 2>/dev/null || true)
  if [ -n "$DMARC" ]; then
    pass "DMARC found: $DMARC"
    if echo "$DMARC" | grep -q "p=reject"; then
      pass "Policy: REJECT (strictest)"
    elif echo "$DMARC" | grep -q "p=quarantine"; then
      warn "Policy: QUARANTINE (medium)"
    elif echo "$DMARC" | grep -q "p=none"; then
      warn "Policy: NONE (monitoring only — tighten after 2 weeks)"
    fi
  else
    fail "No DMARC record found"
    echo "  → Add TXT record at _dmarc.$DOMAIN:"
    echo "    v=DMARC1; p=none; rua=mailto:dmarc@zenitha.luxury; fo=1"
  fi
  echo ""

  # --- MX ---
  echo "📬 MX Records:"
  MX=$(dig +short MX "$DOMAIN" 2>/dev/null || true)
  if [ -n "$MX" ]; then
    pass "MX records found:"
    echo "$MX" | while read -r line; do echo "    $line"; done
  else
    warn "No MX records found (may be expected for $DOMAIN)"
  fi
  echo ""
done

echo "============================================"
echo "  DNS Records Needed for Resend Integration"
echo "============================================"
echo ""
echo "After adding domain in Resend dashboard (resend.com/domains):"
echo ""
echo "1. SPF — Add 'include:send.resend.com' to existing TXT record"
echo "2. DKIM — Add CNAME records provided by Resend"
echo "3. DMARC — Start with p=none, tighten to p=reject over 4 weeks"
echo ""
echo "Cloudflare DNS for zenitha.luxury:"
echo "  Nameservers: georgia.ns.cloudflare.com / marty.ns.cloudflare.com"
echo ""
echo "For yalla-london.com, add records in the domain registrar's DNS panel"
echo "or point nameservers to Cloudflare for unified management."
echo ""
