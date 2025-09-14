#!/bin/bash

# =============================================================================
# Production Readiness Integration Tests
# Tests all new endpoints and functionality for "Good to Go" status
# =============================================================================

set -e

BASE_URL="${1:-http://localhost:3000}"
TEST_RESULTS_FILE="integration-test-results.log"

echo "🧪 Running Production Readiness Integration Tests"
echo "Base URL: $BASE_URL"
echo "================================================"

# Initialize results tracking
PASSED_TESTS=0
FAILED_TESTS=0
TOTAL_TESTS=0

# Helper function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_status="${3:-200}"
    
    echo "🔍 Testing: $test_name"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if eval "$test_command"; then
        echo "✅ PASS: $test_name"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo "❌ FAIL: $test_name"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    echo "---"
}

# Helper function to test HTTP endpoint
test_endpoint() {
    local name="$1"
    local url="$2"
    local method="${3:-GET}"
    local expected_status="${4:-200}"
    local data="${5:-}"
    
    local curl_cmd="curl -s -o /dev/null -w '%{http_code}' -X $method"
    
    if [ -n "$data" ]; then
        curl_cmd="$curl_cmd -H 'Content-Type: application/json' -d '$data'"
    fi
    
    curl_cmd="$curl_cmd '$BASE_URL$url'"
    
    run_test "$name" "[ \$($curl_cmd) -eq $expected_status ]"
}

# Test Health Endpoints
echo "🏥 Testing Health Endpoints"
test_endpoint "Basic Health Check" "/api/health" "GET" "200"

# Test Feature Flag Endpoints
echo "🏁 Testing Feature Flag Endpoints"
test_endpoint "Feature Flags Status" "/api/phase4/status" "GET" "401"  # Should require auth
test_endpoint "Feature Flags Refresh Info" "/api/feature-flags/refresh" "GET" "200"

# Test Rate Limiting
echo "🚦 Testing Rate Limiting"
echo "Testing rate limiting on social embeds endpoint..."

# Make multiple requests to test rate limiting
for i in {1..35}; do
    status=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/api/social-embeds")
    if [ "$status" = "429" ]; then
        echo "✅ Rate limiting working - got 429 after $i requests"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        break
    fi
    if [ "$i" = "35" ]; then
        echo "⚠️ Rate limiting may not be working - no 429 after 35 requests"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
done
TOTAL_TESTS=$((TOTAL_TESTS + 1))

# Test Audit Endpoints (These require auth, so we expect 401)
echo "🔍 Testing Audit Endpoints"
test_endpoint "Audit Article (Unauthenticated)" "/api/audit/article" "POST" "401"
test_endpoint "Apply Fixes (Unauthenticated)" "/api/audit/fixes" "POST" "401"

# Test RBAC Protection
echo "🔒 Testing RBAC Protection"
test_endpoint "Admin Endpoint Protection" "/api/feature-flags/refresh" "POST" "401"

# Test Environment Variables and Configuration
echo "⚙️ Testing Configuration"
run_test "Environment Variables Loaded" "[ -n \"$NEXTAUTH_SECRET\" ]"
run_test "Database URL Configured" "[ -n \"$DATABASE_URL\" ]"

# Test Feature Flag Configuration
echo "🏁 Testing Feature Flag Configuration"
run_test "New Feature Flags Available" "grep -q 'FEATURE_AI_SEO_AUDIT' .env.example"
run_test "Content Pipeline Flag Available" "grep -q 'FEATURE_CONTENT_PIPELINE' .env.example"
run_test "Rich Editor Flag Available" "grep -q 'FEATURE_RICH_EDITOR' .env.example"
run_test "Homepage Builder Flag Available" "grep -q 'FEATURE_HOMEPAGE_BUILDER' .env.example"
run_test "Internal Links Flag Available" "grep -q 'FEATURE_INTERNAL_LINKS' .env.example"

# Test Code Quality
echo "💻 Testing Code Quality"
run_test "TypeScript Compilation" "yarn tsc --noEmit"
run_test "ESLint Passes" "yarn lint"

# Test File Structure
echo "📁 Testing File Structure"
run_test "Audit Engine Exists" "[ -f 'lib/audit-engine.ts' ]"
run_test "Rate Limiting Exists" "[ -f 'lib/rate-limiting.ts' ]"
run_test "Enhanced RBAC Exists" "[ -f 'lib/rbac.ts' ]"
run_test "Audit API Routes Exist" "[ -f 'app/api/audit/article/route.ts' ] && [ -f 'app/api/audit/fixes/route.ts' ]"

# Test Production Environment Template
echo "📋 Testing Production Configuration"
run_test "Production Env Template Complete" "grep -q 'SENTRY_DSN' .env.example"
run_test "Database Configuration Complete" "grep -q 'SHADOW_DATABASE_URL' .env.example"
run_test "Security Configuration Complete" "grep -q 'CRON_SECRET' .env.example"
run_test "Analytics Configuration Complete" "grep -q 'GOOGLE_ANALYTICS_ID' .env.example"

# Summary
echo ""
echo "🎯 Integration Test Summary"
echo "========================="
echo "Total Tests: $TOTAL_TESTS"
echo "Passed: $PASSED_TESTS"
echo "Failed: $FAILED_TESTS"
echo "Success Rate: $(( PASSED_TESTS * 100 / TOTAL_TESTS ))%"

# Save results
{
    echo "Production Readiness Integration Test Results"
    echo "Timestamp: $(date)"
    echo "Total Tests: $TOTAL_TESTS"
    echo "Passed: $PASSED_TESTS" 
    echo "Failed: $FAILED_TESTS"
    echo "Success Rate: $(( PASSED_TESTS * 100 / TOTAL_TESTS ))%"
} > "$TEST_RESULTS_FILE"

if [ "$FAILED_TESTS" -gt 0 ]; then
    echo ""
    echo "❌ Some integration tests failed. Check the logs above for details."
    exit 1
else
    echo ""
    echo "✅ All integration tests passed! System is production ready."
    exit 0
fi