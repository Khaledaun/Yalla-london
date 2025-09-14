#!/bin/bash

# =============================================================================
# Secret Scanner and Security Validation Script
# Validates that secrets are properly configured and not exposed
# =============================================================================

set -e

echo "🔒 Running Secret Scanner and Security Validation"
echo "================================================"

SECURITY_ISSUES=0
WARNINGS=0

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Helper functions
error() {
    echo -e "${RED}❌ ERROR: $1${NC}"
    SECURITY_ISSUES=$((SECURITY_ISSUES + 1))
}

warning() {
    echo -e "${YELLOW}⚠️ WARNING: $1${NC}"
    WARNINGS=$((WARNINGS + 1))
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

info() {
    echo "ℹ️ $1"
}

# Check for exposed secrets in code
echo "🔍 Scanning for exposed secrets in code..."

# API Keys and tokens
if grep -r -E "(sk-[a-zA-Z0-9]{20,}|pk_[a-zA-Z0-9]{20,}|AIza[0-9A-Za-z_-]{35}|ya29\.[0-9A-Za-z_-]+)" \
   --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.json" \
   --exclude-dir=node_modules --exclude-dir=.next . 2>/dev/null | head -5; then
    error "Potential API keys or secrets found in code"
else
    success "No API keys detected in source code"
fi

# Hardcoded credentials
info "Checking for hardcoded credentials..."
CRED_RESULTS=$(grep -r -E "(password|secret|token|credential)\s*[:=]\s*['\"][^'\"]{8,}" \
    --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
    --exclude-dir=node_modules --exclude-dir=.next . | \
    grep -v ".example" | \
    grep -v "test-secret" | \
    grep -v "@types" | \
    grep -v "_API_KEY" | \
    grep -v "_SECRET_KEY" | \
    grep -v "_ACCESS_TOKEN" | \
    grep -v "_CLIENT_KEY" | \
    grep -v "console.error" | \
    grep -v "key.*labelEn" | \
    grep -v "key.*href" | \
    grep -v "key.*ENABLED" | \
    head -5) || true

if [ -n "$CRED_RESULTS" ]; then
    warning "Potential hardcoded credentials found"
    echo "$CRED_RESULTS"
else
    success "No hardcoded credentials detected"
fi

# Check for committed environment files
echo ""
echo "📁 Checking for committed environment files..."
if find . -name ".env" -o -name ".env.local" -o -name ".env.production" \
   -not -path "./node_modules/*" -not -path "./.next/*" | grep -q .; then
    error "Environment files found in repository"
    find . -name ".env*" -not -path "./node_modules/*" -not -path "./.next/*" -not -name ".env.example"
else
    success "No environment files committed to repository"
fi

# Validate .env.example completeness
echo ""
echo "📋 Validating .env.example completeness..."

required_secrets=(
    "DATABASE_URL"
    "DIRECT_URL"
    "NEXTAUTH_SECRET"
    "NEXTAUTH_URL"
    "SENTRY_DSN"
    "GOOGLE_ANALYTICS_ID"
    "AWS_ACCESS_KEY_ID"
    "AWS_SECRET_ACCESS_KEY"
    "ABACUSAI_API_KEY"
    "FEATURE_AI_SEO_AUDIT"
    "FEATURE_CONTENT_PIPELINE"
    "FEATURE_INTERNAL_LINKS"
    "FEATURE_RICH_EDITOR"
    "FEATURE_HOMEPAGE_BUILDER"
)

missing_from_example=0
for secret in "${required_secrets[@]}"; do
    if ! grep -q "^$secret=" .env.example 2>/dev/null; then
        warning "Missing from .env.example: $secret"
        missing_from_example=$((missing_from_example + 1))
    fi
done

if [ $missing_from_example -eq 0 ]; then
    success "All required secrets are documented in .env.example"
else
    warning "$missing_from_example secrets missing from .env.example"
fi

# Check environment variable validation in code
echo ""
echo "⚙️ Checking environment variable validation..."

if grep -q "requiredEnvVars\|criticalSecrets" app/api/health/route.ts 2>/dev/null; then
    success "Environment variable validation found in health endpoint"
else
    warning "No environment variable validation found in health endpoint"
fi

# Check for eval() usage (security risk)
echo ""
echo "🚨 Checking for dangerous code patterns..."

if grep -r "eval(" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
   --exclude-dir=node_modules --exclude-dir=.next . 2>/dev/null | head -3; then
    error "eval() usage found - potential security risk"
else
    success "No eval() usage detected"
fi

# Check for innerHTML usage
if grep -r "innerHTML\s*=" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
   --exclude-dir=node_modules --exclude-dir=.next . 2>/dev/null | head -3; then
    warning "innerHTML usage found - review for XSS potential"
else
    success "No dangerous innerHTML usage detected"
fi

# Check TypeScript strict mode
echo ""
echo "🔧 Checking TypeScript configuration..."
if grep -q '"strict":\s*true' tsconfig.json 2>/dev/null; then
    success "TypeScript strict mode enabled"
else
    warning "TypeScript strict mode not enabled"
fi

# Check for rate limiting implementation
echo ""
echo "🚦 Checking security implementations..."

if [ -f "lib/rate-limiting.ts" ]; then
    success "Rate limiting implementation found"
else
    error "Rate limiting implementation missing"
fi

if [ -f "lib/rbac.ts" ]; then
    success "RBAC implementation found"
else
    error "RBAC implementation missing"
fi

if [ -f "lib/audit-engine.ts" ]; then
    success "Audit engine implementation found"
else
    error "Audit engine implementation missing"
fi

# Check CI/CD security
echo ""
echo "🔄 Checking CI/CD security configuration..."

if grep -q "secrets\." .github/workflows/ci.yml 2>/dev/null; then
    success "CI/CD uses GitHub secrets"
else
    warning "CI/CD may not be using GitHub secrets properly"
fi

if grep -q "security-scan" .github/workflows/ci.yml 2>/dev/null; then
    success "Security scanning enabled in CI/CD"
else
    warning "No security scanning found in CI/CD"
fi

# Check for proper secret handling in API routes
echo ""
echo "🔌 Checking API endpoint security..."

api_routes_with_auth=0
total_api_routes=0

for route in $(find app/api -name "route.ts" 2>/dev/null); do
    total_api_routes=$((total_api_routes + 1))
    if grep -q "withAdminAuth\|withPermission\|requireAuth\|requireAdmin" "$route" 2>/dev/null; then
        api_routes_with_auth=$((api_routes_with_auth + 1))
    fi
done

if [ $total_api_routes -gt 0 ]; then
    auth_percentage=$((api_routes_with_auth * 100 / total_api_routes))
    if [ $auth_percentage -ge 70 ]; then
        success "$auth_percentage% of API routes have authentication ($api_routes_with_auth/$total_api_routes)"
    else
        warning "Only $auth_percentage% of API routes have authentication ($api_routes_with_auth/$total_api_routes)"
    fi
else
    info "No API routes found"
fi

# Final security score
echo ""
echo "🎯 Security Validation Summary"
echo "=============================="
echo "Security Issues: $SECURITY_ISSUES"
echo "Warnings: $WARNINGS"
echo "Total API Routes: $total_api_routes"
echo "Authenticated Routes: $api_routes_with_auth"

# Determine security status
if [ $SECURITY_ISSUES -eq 0 ] && [ $WARNINGS -le 3 ]; then
    echo ""
    success "🛡️ SECURITY STATUS: GOOD TO GO"
    echo "✅ All critical security checks passed"
    echo "✅ Secrets are properly secured"
    echo "✅ No major security vulnerabilities detected"
    exit 0
elif [ $SECURITY_ISSUES -eq 0 ]; then
    echo ""
    echo -e "${YELLOW}🛡️ SECURITY STATUS: ACCEPTABLE WITH WARNINGS${NC}"
    echo "⚠️ No critical issues but some warnings to address"
    echo "✅ Safe for production with monitoring"
    exit 0
else
    echo ""
    error "🛡️ SECURITY STATUS: NEEDS ATTENTION"
    echo "❌ Critical security issues must be resolved before production"
    echo "🔧 Address the errors above before deployment"
    exit 1
fi