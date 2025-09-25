#!/bin/bash

# Phase-4C Smoke Test Script
# Returns non-zero exit code if any critical endpoint fails

set -e

BASE_URL=${1:-"http://localhost:3000"}
FAILED=0

echo "🚀 Running Phase-4C smoke tests against: $BASE_URL"

# Function to test endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local expected_status=$3
    local description=$4
    local auth_header=${5:-""}
    
    echo "Testing: $description"
    
    if [ -n "$auth_header" ]; then
        response=$(curl -s -w "%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -H "$auth_header" \
            "$BASE_URL$endpoint" || echo "000")
    else
        response=$(curl -s -w "%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            "$BASE_URL$endpoint" || echo "000")
    fi
    
    status_code="${response: -3}"
    
    if [ "$status_code" = "$expected_status" ]; then
        echo "✅ $description: $status_code"
    else
        echo "❌ $description: Expected $expected_status, got $status_code"
        FAILED=1
    fi
}

# Test basic health endpoint
test_endpoint "GET" "/api/health" "200" "Health check"

# Test Phase-4 status endpoint without auth (should return 401)
test_endpoint "GET" "/api/phase4/status" "401" "Phase-4 status (unauthenticated)"

# Test admin routes without auth (should return 401)
test_endpoint "POST" "/api/admin/editor/save" "401" "Article save (unauthenticated)"

# Test media upload without auth (should return 401)
test_endpoint "POST" "/api/admin/media/upload" "401" "Media upload (unauthenticated)"

# Test that we're not using JSON storage in production
if [ "$NODE_ENV" = "production" ]; then
    echo "Testing production environment guards..."
    
    # Check if DEV_FILE_STORE_ONLY is set in production (should not be)
    if [ -n "$DEV_FILE_STORE_ONLY" ]; then
        echo "❌ DEV_FILE_STORE_ONLY should not be set in production"
        FAILED=1
    else
        echo "✅ DEV_FILE_STORE_ONLY not set in production"
    fi
fi

# Test database connection
echo "Testing database connection..."
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL environment variable is missing"
    FAILED=1
else
    echo "✅ DATABASE_URL is set"
    
    # Check if it's using proper SSL mode
    if [[ "$DATABASE_URL" == *"sslmode=require"* ]]; then
        echo "✅ Database URL uses sslmode=require"
    else
        echo "⚠️  Database URL should use sslmode=require for production"
    fi
fi

# Test that no JSON files are being written in production
if [ "$NODE_ENV" = "production" ]; then
    echo "Checking for JSON file writes in production..."
    
    # Look for any data/ directory that might contain JSON files
    if [ -d "data" ] && [ "$(find data -name "*.json" 2>/dev/null | wc -l)" -gt 0 ]; then
        echo "❌ JSON files found in data/ directory in production"
        FAILED=1
    else
        echo "✅ No JSON files found in production"
    fi
    
    # Check for DEV_FILE_STORE_ONLY being set in production
    if [ -n "$DEV_FILE_STORE_ONLY" ]; then
        echo "❌ DEV_FILE_STORE_ONLY should not be set in production"
        FAILED=1
    else
        echo "✅ DEV_FILE_STORE_ONLY not set in production"
    fi
    
    # Test that save endpoint rejects JSON storage
    echo "Testing save endpoint for JSON storage rejection..."
    save_response=$(curl -s -w "%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -d '{"title":"Test","content":"Test content"}' \
        "$BASE_URL/api/admin/editor/save" || echo "000")
    
    save_status="${save_response: -3}"
    if [ "$save_status" = "500" ]; then
        echo "✅ Save endpoint properly rejects requests in production"
    else
        echo "⚠️  Save endpoint returned status $save_status (expected 500 for JSON storage rejection)"
    fi
fi

# Summary
echo ""
if [ $FAILED -eq 0 ]; then
    echo "🎉 All smoke tests passed!"
    exit 0
else
    echo "💥 Some smoke tests failed!"
    exit 1
fi
