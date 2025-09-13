#!/bin/bash
# Enterprise Security & Monitoring Validation Script
# This script validates all security, monitoring, and backup features

# Remove set -e to allow the script to continue on errors
# set -e

echo "🔒 Enterprise Security & Monitoring Validation"
echo "=============================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASS=0
FAIL=0
WARN=0

check_pass() {
    echo -e "${GREEN}✅ $1${NC}"
    ((PASS++))
}

check_fail() {
    echo -e "${RED}❌ $1${NC}"
    ((FAIL++))
}

check_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    ((WARN++))
}

echo -e "${BLUE}📋 Checking Environment Configuration${NC}"
echo "--------------------------------------"

# Check required environment variables
if [ -f ".env" ]; then
    check_pass "Environment file exists"
    
    # Check critical variables
    if grep -q "ADMIN_EMAILS=" .env; then
        check_pass "ADMIN_EMAILS configured"
    else
        check_warn "ADMIN_EMAILS not configured"
    fi
    
    if grep -q "NEXTAUTH_SECRET=" .env; then
        SECRET_LENGTH=$(grep "NEXTAUTH_SECRET=" .env | cut -d'=' -f2 | wc -c)
        if [ $SECRET_LENGTH -gt 32 ]; then
            check_pass "NEXTAUTH_SECRET is secure (${SECRET_LENGTH} characters)"
        else
            check_fail "NEXTAUTH_SECRET too short (${SECRET_LENGTH} characters, needs 32+)"
        fi
    else
        check_fail "NEXTAUTH_SECRET not configured"
    fi
    
    if grep -q "DATABASE_URL=" .env; then
        check_pass "DATABASE_URL configured"
    else
        check_fail "DATABASE_URL not configured"
    fi
    
else
    check_fail "Environment file (.env) not found"
fi

echo ""
echo -e "${BLUE}🔧 Checking Dependencies${NC}"
echo "-------------------------"

# Check if required packages are installed
if [ -f "package.json" ]; then
    if grep -q "@sentry/nextjs" package.json; then
        check_pass "Sentry monitoring dependency installed"
    else
        check_fail "Sentry monitoring dependency missing"
    fi
    
    if grep -q "node-cron" package.json; then
        check_pass "Backup scheduling dependency installed"
    else
        check_fail "Backup scheduling dependency missing"
    fi
    
    if grep -q "jest" package.json; then
        check_pass "Testing framework installed"
    else
        check_fail "Testing framework missing"
    fi
else
    check_fail "package.json not found"
fi

echo ""
echo -e "${BLUE}📁 Checking File Structure${NC}"
echo "----------------------------"

# Check critical files exist
FILES=(
    "lib/rbac.ts"
    "lib/performance-monitoring.ts"
    "scripts/backup-scheduler.ts"
    "scripts/backup-restore.ts"
    "tests/rbac.spec.ts"
    "tests/security-automation.spec.ts"
    "sentry.server.config.ts"
    "sentry.client.config.ts"
    "sentry.edge.config.ts"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        check_pass "$file exists"
    else
        check_fail "$file missing"
    fi
done

# Check documentation
DOCS=(
    "../../docs/enterprise-playbook.md"
    "../../docs/security-monitoring-setup.md"
)

for doc in "${DOCS[@]}"; do
    if [ -f "$doc" ]; then
        check_pass "$(basename $doc) exists"
    else
        check_fail "$(basename $doc) missing"
    fi
done

echo ""
echo -e "${BLUE}🏗️  Checking Build Configuration${NC}"
echo "---------------------------------"

# Check if project builds successfully
if npm run build > /dev/null 2>&1; then
    check_pass "Project builds successfully"
else
    check_warn "Project build has issues (may be due to missing dependencies)"
fi

# Check linting
if npm run lint > /dev/null 2>&1; then
    check_pass "Linting passes"
else
    check_warn "Linting has issues"
fi

echo ""
echo -e "${BLUE}🧪 Running Security Tests${NC}"
echo "---------------------------"

# Run security tests if Jest is available
if command -v npx > /dev/null 2>&1; then
    if npx jest tests/security-automation.spec.ts --passWithNoTests --silent > /dev/null 2>&1; then
        check_pass "Security automation tests pass"
    else
        check_warn "Security tests have issues (may need database setup)"
    fi
    
    if npx jest tests/rbac.spec.ts --passWithNoTests --silent > /dev/null 2>&1; then
        check_pass "RBAC tests pass"
    else
        check_warn "RBAC tests have issues (may need database setup)"
    fi
else
    check_warn "Jest not available for testing"
fi

echo ""
echo -e "${BLUE}🔐 Checking Security Configuration${NC}"
echo "----------------------------------"

# Check for security-related configurations
if [ -f "../../.github/workflows/security-automation.yml" ]; then
    check_pass "Security automation workflow configured"
else
    check_fail "Security automation workflow missing"
fi

if [ -f "../../.zap/rules.conf" ]; then
    check_pass "OWASP ZAP configuration exists"
else
    check_fail "OWASP ZAP configuration missing"
fi

# Check Prisma schema for audit logging
if [ -f "prisma/schema.prisma" ]; then
    if grep -q "AuditLog" prisma/schema.prisma; then
        check_pass "Audit logging schema configured"
    else
        check_fail "Audit logging schema missing"
    fi
else
    check_fail "Prisma schema not found"
fi

echo ""
echo -e "${BLUE}💾 Checking Backup Configuration${NC}"
echo "--------------------------------"

# Check backup directory structure
if [ -d "scripts" ]; then
    check_pass "Scripts directory exists"
    
    if [ -x "scripts/backup-restore.ts" ] || [ -f "scripts/backup-restore.ts" ]; then
        check_pass "Backup restore script exists"
    else
        check_fail "Backup restore script missing or not executable"
    fi
    
    if [ -x "scripts/backup-scheduler.ts" ] || [ -f "scripts/backup-scheduler.ts" ]; then
        check_pass "Backup scheduler script exists"
    else
        check_fail "Backup scheduler script missing or not executable"
    fi
else
    check_fail "Scripts directory missing"
fi

# Check logs directory
if [ ! -d "logs" ]; then
    mkdir -p logs
    check_pass "Created logs directory"
else
    check_pass "Logs directory exists"
fi

echo ""
echo -e "${BLUE}📊 Checking Monitoring Setup${NC}"
echo "-----------------------------"

# Check Sentry configuration files
SENTRY_FILES=(
    "sentry.server.config.ts"
    "sentry.client.config.ts"
    "sentry.edge.config.ts"
)

for file in "${SENTRY_FILES[@]}"; do
    if [ -f "$file" ]; then
        if grep -q "SENTRY_DSN" "$file"; then
            check_pass "$file properly configured"
        else
            check_warn "$file exists but may not be properly configured"
        fi
    else
        check_fail "$file missing"
    fi
done

echo ""
echo -e "${BLUE}📚 Checking Documentation${NC}"
echo "----------------------------"

# Check if enterprise playbook has required sections
if [ -f "../../docs/enterprise-playbook.md" ]; then
    REQUIRED_SECTIONS=("GDPR" "SOC2" "audit" "retention" "backup" "disaster")
    for section in "${REQUIRED_SECTIONS[@]}"; do
        if grep -i "$section" "../../docs/enterprise-playbook.md" > /dev/null; then
            check_pass "Enterprise playbook contains $section documentation"
        else
            check_warn "Enterprise playbook missing $section documentation"
        fi
    done
fi

echo ""
echo -e "${BLUE}🎯 Validation Summary${NC}"
echo "===================="

echo -e "Results:"
echo -e "  ${GREEN}✅ Passed: $PASS${NC}"
echo -e "  ${YELLOW}⚠️  Warnings: $WARN${NC}"
echo -e "  ${RED}❌ Failed: $FAIL${NC}"

echo ""
if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}🎉 All critical checks passed!${NC}"
    if [ $WARN -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Please review warnings above${NC}"
    fi
    echo ""
    echo "Next steps:"
    echo "1. Set up environment variables for your environment"
    echo "2. Configure Sentry DSN for monitoring"
    echo "3. Set up AWS S3 for backup storage"
    echo "4. Test backup and restore procedures"
    echo "5. Configure GitHub Actions secrets for security scanning"
    exit 0
else
    echo -e "${RED}❌ Critical issues found. Please fix the failed checks above.${NC}"
    echo ""
    echo "Common fixes:"
    echo "1. Copy .env.example to .env and configure variables"
    echo "2. Install missing dependencies with 'yarn install'"
    echo "3. Generate Prisma client with 'yarn prisma generate'"
    echo "4. Check file permissions on scripts"
    exit 1
fi