#!/bin/bash

# Demo script to test the new RBAC and Analytics endpoints
# This shows how to use the new enterprise features

echo "🎯 Enterprise RBAC & Analytics Demo"
echo "===================================="

BASE_URL="${1:-http://localhost:3000}"
echo "Testing against: $BASE_URL"
echo ""

# Function to make API calls with error handling
api_call() {
    local method=$1
    local endpoint=$2
    local description=$3
    local data=$4
    
    echo "📡 $description"
    echo "   $method $endpoint"
    
    if [[ -n "$data" ]]; then
        response=$(curl -s -X $method "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data" \
            -w "HTTP_STATUS:%{http_code}")
    else
        response=$(curl -s -X $method "$BASE_URL$endpoint" \
            -w "HTTP_STATUS:%{http_code}")
    fi
    
    http_status=$(echo "$response" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
    body=$(echo "$response" | sed 's/HTTP_STATUS:[0-9]*$//')
    
    if [[ $http_status -ge 200 && $http_status -lt 300 ]]; then
        echo "   ✅ Status: $http_status"
        echo "$body" | jq . 2>/dev/null || echo "$body"
    else
        echo "   ❌ Status: $http_status"
        echo "$body" | jq . 2>/dev/null || echo "$body"
    fi
    echo ""
}

echo "🔍 Testing Public Endpoints (no auth required)"
echo "==============================================="

# Test analytics event tracking
api_call "POST" "/api/analytics/track-event" "Track Analytics Event" '{
  "event": "demo_test",
  "category": "testing",
  "label": "api_demo",
  "value": 1,
  "properties": {
    "demo": true,
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'"
  }
}'

echo "🔐 Testing Protected Endpoints (requires authentication)"
echo "========================================================"
echo "Note: These will return 401 Unauthorized without valid session"

# Test analytics configuration (requires auth)
api_call "GET" "/api/analytics/config" "Get Analytics Configuration"

# Test usage reports (requires permission)
api_call "GET" "/api/reports/usage?format=json" "Get Usage Report"

# Test error reports (requires permission)
api_call "GET" "/api/reports/errors?format=json" "Get Error Report"

# Test compliance reports (requires admin permission)
api_call "GET" "/api/reports/compliance?format=json" "Get Compliance Report"

echo "📊 Testing Report Exports"
echo "=========================="

# Test CSV export
api_call "GET" "/api/reports/usage?format=csv" "Export Usage Report as CSV"

echo "🎛️ Testing Admin Features"
echo "========================="

# Test analytics configuration update (admin only)
api_call "POST" "/api/analytics/config" "Update Analytics Configuration" '{
  "enableAnalytics": true,
  "anonymizeIp": true,
  "cookieConsent": true
}'

echo ""
echo "📋 Demo Summary"
echo "==============="
echo "✅ Analytics event tracking tested"
echo "🔒 Protected endpoints tested (expect 401 without auth)"
echo "📊 Report export formats tested"
echo "🎛️ Admin configuration tested"
echo ""
echo "🔧 Next Steps:"
echo "1. Set up authentication to test protected endpoints"
echo "2. Configure admin emails in ADMIN_EMAILS environment variable"
echo "3. Set up GA4 integration with GA4_MEASUREMENT_ID"
echo "4. Review audit logs in the database"
echo ""
echo "📚 For full documentation, see docs/enterprise-playbook.md"