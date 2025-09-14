#!/bin/bash

# validate-secrets.sh
# Validation script for GitHub Actions secrets configuration
# Usage: ./scripts/validate-secrets.sh

set -e

echo "🔐 GitHub Actions Secrets Validation Script"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
REQUIRED_COUNT=0
OPTIONAL_COUNT=0
MISSING_REQUIRED=0
MISSING_OPTIONAL=0

# Function to check if running in GitHub Actions
is_github_actions() {
    [ -n "${GITHUB_ACTIONS}" ]
}

# Function to check secret availability (GitHub Actions context)
check_secret_gh() {
    local secret_name="$1"
    local is_required="$2"
    local description="$3"
    
    if is_github_actions; then
        # In GitHub Actions, we can't directly check secret values
        # This would be used in workflow files
        echo "  GitHub Actions context detected - use workflow debug steps"
        return 0
    else
        echo "  Not in GitHub Actions - manual verification needed"
        return 1
    fi
}

# Function to validate required secrets
validate_required_secrets() {
    echo "📋 Required Secrets (Production)"
    echo "================================"
    
    local secrets=(
        "DATABASE_URL:Production database connection string"
        "NEXTAUTH_SECRET:NextAuth.js authentication secret (32+ chars)"
        "ABACUSAI_API_KEY:AI content generation API key"
        "AWS_ACCESS_KEY_ID:AWS S3 access key ID"
        "AWS_SECRET_ACCESS_KEY:AWS S3 secret access key"
    )
    
    for secret_info in "${secrets[@]}"; do
        IFS=':' read -r secret_name description <<< "$secret_info"
        REQUIRED_COUNT=$((REQUIRED_COUNT + 1))
        
        echo -n "  ${secret_name}: "
        if is_github_actions; then
            echo "${YELLOW}Check workflow debug output${NC}"
        else
            echo "${YELLOW}Manual verification required${NC}"
            echo "    Description: ${description}"
        fi
    done
    
    echo ""
}

# Function to validate optional secrets
validate_optional_secrets() {
    echo "📋 Optional Secrets (Enhanced Features)"
    echo "======================================"
    
    local secrets=(
        "DIRECT_URL:Direct database connection (falls back to DATABASE_URL)"
        "SHADOW_DATABASE_URL:Shadow database for migration validation"
        "AWS_REGION:AWS region (defaults to us-east-1)"
        "SNYK_TOKEN:Snyk security scanning token"
        "LHCI_URL_STAGING:Lighthouse CI staging URL"
        "LHCI_GITHUB_APP_TOKEN:Lighthouse CI GitHub App token"
        "STAGING_DATABASE_URL:Staging environment database"
        "STAGING_NEXTAUTH_URL:Staging environment URL"
        "STAGING_ABACUSAI_API_KEY:Staging AI API key"
    )
    
    for secret_info in "${secrets[@]}"; do
        IFS=':' read -r secret_name description <<< "$secret_info"
        OPTIONAL_COUNT=$((OPTIONAL_COUNT + 1))
        
        echo -n "  ${secret_name}: "
        if is_github_actions; then
            echo "${YELLOW}Check workflow debug output${NC}"
        else
            echo "${YELLOW}Manual verification required${NC}"
            echo "    Description: ${description}"
        fi
    done
    
    echo ""
}

# Function to provide setup instructions
provide_setup_instructions() {
    echo "🔧 Setup Instructions"
    echo "===================="
    echo ""
    echo "1. ${GREEN}Navigate to GitHub Repository Settings:${NC}"
    echo "   - Go to your repository on GitHub"
    echo "   - Click 'Settings' tab"
    echo "   - Go to 'Secrets and variables' → 'Actions'"
    echo ""
    echo "2. ${GREEN}Add Required Secrets:${NC}"
    echo "   - Click 'New repository secret'"
    echo "   - Enter secret name and value"
    echo "   - Click 'Add secret'"
    echo ""
    echo "3. ${GREEN}Verify Configuration:${NC}"
    echo "   - Run a workflow to see debug output"
    echo "   - Check for ✅ yes or ❌ no indicators"
    echo "   - Review workflow artifacts for detailed logs"
    echo ""
    echo "4. ${GREEN}Test with Feature Branch:${NC}"
    echo "   - Create branch: copilot/ci-secrets-final-fix"
    echo "   - Push changes to trigger workflows"
    echo "   - Verify secrets are properly configured"
    echo ""
}

# Function to show validation command examples
show_validation_examples() {
    echo "🔍 Validation Examples"
    echo "====================="
    echo ""
    echo "Check secrets in GitHub Actions workflow:"
    echo ""
    cat << 'EOF'
- name: Debug - Check secrets availability
  run: |
    echo "🔐 Checking required secrets availability..."
    echo "DATABASE_URL: $([[ -n "${{ secrets.DATABASE_URL }}" ]] && echo "✅ yes" || echo "❌ no")"
    echo "NEXTAUTH_SECRET: $([[ -n "${{ secrets.NEXTAUTH_SECRET }}" ]] && echo "✅ yes" || echo "❌ no")"
    echo "ABACUSAI_API_KEY: $([[ -n "${{ secrets.ABACUSAI_API_KEY }}" ]] && echo "✅ yes" || echo "❌ no")"
EOF
    echo ""
    echo "Local environment validation:"
    echo ""
    cat << 'EOF'
# Check local .env file
if [ -f "yalla_london/app/.env.local" ]; then
    echo "✅ Local environment file exists"
    grep -E '^(DATABASE_URL|NEXTAUTH_SECRET|ABACUSAI_API_KEY)=' yalla_london/app/.env.local > /dev/null
    if [ $? -eq 0 ]; then
        echo "✅ Required variables found in local env"
    else
        echo "❌ Some required variables missing from local env"
    fi
else
    echo "❌ Local environment file not found"
    echo "Copy yalla_london/app/.env.example to yalla_london/app/.env.local"
fi
EOF
    echo ""
}

# Main execution
main() {
    echo "Starting validation..."
    echo ""
    
    if is_github_actions; then
        echo "${GREEN}✅ Running in GitHub Actions context${NC}"
        echo "Secret values are automatically hidden in GitHub Actions."
        echo "Use workflow debug steps to verify secret availability."
    else
        echo "${YELLOW}⚠️ Running outside GitHub Actions${NC}"
        echo "This script provides validation guidance."
        echo "Actual secret verification requires GitHub Actions workflow execution."
    fi
    
    echo ""
    
    validate_required_secrets
    validate_optional_secrets
    provide_setup_instructions
    show_validation_examples
    
    echo "📊 Summary"
    echo "=========="
    echo "Required secrets to configure: ${REQUIRED_COUNT}"
    echo "Optional secrets available: ${OPTIONAL_COUNT}"
    echo ""
    echo "${GREEN}✅ Validation complete${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Configure required secrets in GitHub repository settings"
    echo "2. Run workflows to verify secret configuration"
    echo "3. Check debug output for secret availability"
    echo "4. Review troubleshooting guide if issues occur"
    echo ""
    echo "For detailed help, see: docs/ci-cd-troubleshooting.md"
}

# Run main function
main "$@"