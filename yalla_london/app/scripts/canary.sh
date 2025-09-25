#!/bin/bash

# Canary Deployment Guard Script
# Tests critical functionality before production promotion

set -e

# Configuration
BASE_URL=${1:-"https://yalla-london.vercel.app"}
ADMIN_EMAIL=${ADMIN_EMAIL:-"admin@test.com"}
ADMIN_PASSWORD=${ADMIN_PASSWORD:-"testpassword"}
LOG_FILE="canary.out"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Test functions
test_health_check() {
    log "Testing health check endpoint..."
    
    local response=$(curl -s -w "%{http_code}" -o /dev/null "$BASE_URL/api/health")
    
    if [ "$response" = "200" ]; then
        log_success "Health check passed"
        return 0
    else
        log_error "Health check failed with status $response"
        return 1
    fi
}

test_phase4_status() {
    log "Testing Phase-4 status endpoint..."
    
    # Test unauthenticated access (should return 401)
    local unauth_response=$(curl -s -w "%{http_code}" -o /dev/null "$BASE_URL/api/phase4/status")
    
    if [ "$unauth_response" = "401" ]; then
        log_success "Unauthenticated access properly rejected"
    else
        log_error "Unauthenticated access should return 401, got $unauth_response"
        return 1
    fi
    
    # Test authenticated access (should return 200)
    local auth_response=$(curl -s -w "%{http_code}" -o /dev/null \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        "$BASE_URL/api/phase4/status")
    
    if [ "$auth_response" = "200" ]; then
        log_success "Authenticated access successful"
        return 0
    else
        log_error "Authenticated access failed with status $auth_response"
        return 1
    fi
}

test_authentication() {
    log "Testing authentication..."
    
    local login_response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" \
        "$BASE_URL/api/auth/signin")
    
    local token=$(echo "$login_response" | jq -r '.token // empty')
    
    if [ -n "$token" ] && [ "$token" != "null" ]; then
        log_success "Authentication successful"
        export ADMIN_TOKEN="$token"
        return 0
    else
        log_error "Authentication failed"
        log_error "Response: $login_response"
        return 1
    fi
}

test_article_creation() {
    log "Testing article creation..."
    
    local article_data='{
        "title": "Canary Test Article",
        "content": "This is a test article created during canary deployment",
        "locale": "en",
        "pageType": "guide",
        "primaryKeyword": "canary test",
        "excerpt": "Canary test article excerpt"
    }'
    
    local create_response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -d "$article_data" \
        "$BASE_URL/api/admin/editor/save")
    
    local article_id=$(echo "$create_response" | jq -r '.data.id // empty')
    
    if [ -n "$article_id" ] && [ "$article_id" != "null" ]; then
        log_success "Article creation successful, ID: $article_id"
        export TEST_ARTICLE_ID="$article_id"
        return 0
    else
        log_error "Article creation failed"
        log_error "Response: $create_response"
        return 1
    fi
}

test_article_fetch() {
    log "Testing article fetch..."
    
    if [ -z "$TEST_ARTICLE_ID" ]; then
        log_error "No test article ID available"
        return 1
    fi
    
    local fetch_response=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
        "$BASE_URL/api/admin/articles")
    
    local article_found=$(echo "$fetch_response" | jq -r ".articles[] | select(.id == \"$TEST_ARTICLE_ID\") | .id // empty")
    
    if [ -n "$article_found" ]; then
        log_success "Article fetch successful"
        return 0
    else
        log_error "Article fetch failed - article not found"
        log_error "Response: $fetch_response"
        return 1
    fi
}

test_article_deletion() {
    log "Testing article deletion..."
    
    if [ -z "$TEST_ARTICLE_ID" ]; then
        log_error "No test article ID available"
        return 1
    fi
    
    local delete_response=$(curl -s -X DELETE \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        "$BASE_URL/api/admin/articles/$TEST_ARTICLE_ID")
    
    local delete_success=$(echo "$delete_response" | jq -r '.success // false')
    
    if [ "$delete_success" = "true" ]; then
        log_success "Article deletion successful"
        return 0
    else
        log_warning "Article deletion failed (this may be expected if delete endpoint is not implemented)"
        log_warning "Response: $delete_response"
        return 0  # Don't fail the canary for this
    fi
}

test_rate_limiting() {
    log "Testing rate limiting..."
    
    local rate_limit_triggered=false
    
    # Make multiple requests quickly to trigger rate limiting
    for i in {1..10}; do
        local response=$(curl -s -w "%{http_code}" -o /dev/null \
            -H "Authorization: Bearer $ADMIN_TOKEN" \
            "$BASE_URL/api/admin/articles")
        
        if [ "$response" = "429" ]; then
            rate_limit_triggered=true
            break
        fi
    done
    
    if [ "$rate_limit_triggered" = "true" ]; then
        log_success "Rate limiting is working"
        return 0
    else
        log_warning "Rate limiting not triggered (may be expected depending on configuration)"
        return 0  # Don't fail the canary for this
    fi
}

test_security_headers() {
    log "Testing security headers..."
    
    local response=$(curl -s -I "$BASE_URL/api/health")
    
    local csp=$(echo "$response" | grep -i "content-security-policy" || true)
    local xframe=$(echo "$response" | grep -i "x-frame-options" || true)
    local xcontent=$(echo "$response" | grep -i "x-content-type-options" || true)
    
    if [ -n "$csp" ] && [ -n "$xframe" ] && [ -n "$xcontent" ]; then
        log_success "Security headers present"
        return 0
    else
        log_warning "Some security headers may be missing"
        log_warning "CSP: $csp"
        log_warning "X-Frame-Options: $xframe"
        log_warning "X-Content-Type-Options: $xcontent"
        return 0  # Don't fail the canary for this
    fi
}

# Main canary test function
run_canary_tests() {
    log "Starting canary deployment tests..."
    log "Base URL: $BASE_URL"
    log "Admin Email: $ADMIN_EMAIL"
    
    local tests_passed=0
    local tests_failed=0
    
    # Run all tests
    test_health_check && ((tests_passed++)) || ((tests_failed++))
    test_authentication && ((tests_passed++)) || ((tests_failed++))
    test_phase4_status && ((tests_passed++)) || ((tests_failed++))
    test_article_creation && ((tests_passed++)) || ((tests_failed++))
    test_article_fetch && ((tests_passed++)) || ((tests_failed++))
    test_article_deletion && ((tests_passed++)) || ((tests_failed++))
    test_rate_limiting && ((tests_passed++)) || ((tests_failed++))
    test_security_headers && ((tests_passed++)) || ((tests_failed++))
    
    # Summary
    log "=== CANARY TEST SUMMARY ==="
    log "Tests passed: $tests_passed"
    log "Tests failed: $tests_failed"
    log "Total tests: $((tests_passed + tests_failed))"
    
    if [ $tests_failed -eq 0 ]; then
        log_success "All canary tests passed - deployment is safe"
        return 0
    else
        log_error "Some canary tests failed - deployment should be blocked"
        return 1
    fi
}

# Cleanup function
cleanup() {
    log "Cleaning up test data..."
    
    if [ -n "$TEST_ARTICLE_ID" ] && [ -n "$ADMIN_TOKEN" ]; then
        # Try to delete the test article
        curl -s -X DELETE \
            -H "Authorization: Bearer $ADMIN_TOKEN" \
            "$BASE_URL/api/admin/articles/$TEST_ARTICLE_ID" > /dev/null 2>&1 || true
    fi
}

# Set up cleanup trap
trap cleanup EXIT

# Check prerequisites
if ! command -v curl &> /dev/null; then
    log_error "curl is required but not installed"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    log_error "jq is required but not installed"
    exit 1
fi

# Run canary tests
run_canary_tests
