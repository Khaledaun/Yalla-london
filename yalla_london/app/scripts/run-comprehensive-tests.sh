#!/bin/bash

################################################################################
# Comprehensive Test Runner Script
# Runs all three test suites and generates a comprehensive report
################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
DASHBOARD_TESTS_PASSED=false
CONNECTION_TESTS_PASSED=false
AI_TESTS_PASSED=false
E2E_TESTS_PASSED=false

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         Yalla London - Comprehensive Test Suite           ║${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}║  Testing:                                                  ║${NC}"
echo -e "${BLUE}║  1. Dashboard Functionality                                ║${NC}"
echo -e "${BLUE}║  2. Dashboard ↔ Public Website Connection                  ║${NC}"
echo -e "${BLUE}║  3. AI Content Generation                                  ║${NC}"
echo -e "${BLUE}║  4. End-to-End User Workflows                              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo -e "${RED}Error: package.json not found. Please run from project root.${NC}"
  exit 1
fi

# Create test results directory
mkdir -p test-results
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_FILE="test-results/comprehensive-test-report-${TIMESTAMP}.txt"

# Function to write to report
log_to_report() {
  echo "$1" | tee -a "$REPORT_FILE"
}

# Start report
log_to_report "╔════════════════════════════════════════════════════════════╗"
log_to_report "║         Comprehensive Test Report                          ║"
log_to_report "║         Generated: $(date)                    ║"
log_to_report "╚════════════════════════════════════════════════════════════╝"
log_to_report ""

################################################################################
# Pre-flight Checks
################################################################################

echo -e "${BLUE}🔍 Running pre-flight checks...${NC}"
log_to_report "═══════════════════════════════════════════════════════════"
log_to_report "PRE-FLIGHT CHECKS"
log_to_report "═══════════════════════════════════════════════════════════"

# Check Node.js
if command -v node &> /dev/null; then
  NODE_VERSION=$(node --version)
  echo -e "${GREEN}✓${NC} Node.js: $NODE_VERSION"
  log_to_report "✓ Node.js: $NODE_VERSION"
else
  echo -e "${RED}✗${NC} Node.js not found"
  log_to_report "✗ Node.js not found"
  exit 1
fi

# Check if database is accessible
if [ ! -z "$DATABASE_URL" ]; then
  echo -e "${GREEN}✓${NC} Database URL configured"
  log_to_report "✓ Database URL configured"
else
  echo -e "${YELLOW}⚠${NC} DATABASE_URL not set in environment"
  log_to_report "⚠ DATABASE_URL not set in environment"
fi

# Check if AI keys are configured
if [ ! -z "$ABACUSAI_API_KEY" ] || [ ! -z "$OPENAI_API_KEY" ]; then
  echo -e "${GREEN}✓${NC} AI API keys configured"
  log_to_report "✓ AI API keys configured"
  if [ ! -z "$ABACUSAI_API_KEY" ]; then
    echo -e "  - Abacus.AI: Configured"
    log_to_report "  - Abacus.AI: Configured"
  fi
  if [ ! -z "$OPENAI_API_KEY" ]; then
    echo -e "  - OpenAI: Configured"
    log_to_report "  - OpenAI: Configured"
  fi
else
  echo -e "${YELLOW}⚠${NC} No AI API keys found (some tests may be limited)"
  log_to_report "⚠ No AI API keys found"
fi

# Check if content pipeline is enabled
if [ "$FEATURE_CONTENT_PIPELINE" = "true" ]; then
  echo -e "${GREEN}✓${NC} Content pipeline feature enabled"
  log_to_report "✓ Content pipeline feature enabled"
else
  echo -e "${YELLOW}⚠${NC} Content pipeline feature not enabled"
  log_to_report "⚠ Content pipeline feature not enabled"
fi

echo ""

################################################################################
# Test Suite 1: Dashboard Functionality
################################################################################

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}TEST SUITE 1: Dashboard Functionality${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
log_to_report ""
log_to_report "═══════════════════════════════════════════════════════════"
log_to_report "TEST SUITE 1: DASHBOARD FUNCTIONALITY"
log_to_report "═══════════════════════════════════════════════════════════"

if npm run test -- test/integration/dashboard-functionality.spec.ts 2>&1 | tee -a "$REPORT_FILE"; then
  DASHBOARD_TESTS_PASSED=true
  echo -e "${GREEN}✓ Dashboard functionality tests PASSED${NC}"
  log_to_report "✓ Dashboard functionality tests PASSED"
else
  echo -e "${RED}✗ Dashboard functionality tests FAILED${NC}"
  log_to_report "✗ Dashboard functionality tests FAILED"
fi

echo ""

################################################################################
# Test Suite 2: Dashboard-Public Connection
################################################################################

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}TEST SUITE 2: Dashboard ↔ Public Website Connection${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
log_to_report ""
log_to_report "═══════════════════════════════════════════════════════════"
log_to_report "TEST SUITE 2: DASHBOARD ↔ PUBLIC WEBSITE CONNECTION"
log_to_report "═══════════════════════════════════════════════════════════"

if npm run test -- test/integration/dashboard-public-connection.spec.ts 2>&1 | tee -a "$REPORT_FILE"; then
  CONNECTION_TESTS_PASSED=true
  echo -e "${GREEN}✓ Dashboard-public connection tests PASSED${NC}"
  log_to_report "✓ Dashboard-public connection tests PASSED"
else
  echo -e "${RED}✗ Dashboard-public connection tests FAILED${NC}"
  log_to_report "✗ Dashboard-public connection tests FAILED"
fi

echo ""

################################################################################
# Test Suite 3: AI Content Generation
################################################################################

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}TEST SUITE 3: AI Content Generation${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
log_to_report ""
log_to_report "═══════════════════════════════════════════════════════════"
log_to_report "TEST SUITE 3: AI CONTENT GENERATION"
log_to_report "═══════════════════════════════════════════════════════════"

if npm run test -- test/integration/ai-content-generation.spec.ts 2>&1 | tee -a "$REPORT_FILE"; then
  AI_TESTS_PASSED=true
  echo -e "${GREEN}✓ AI content generation tests PASSED${NC}"
  log_to_report "✓ AI content generation tests PASSED"
else
  echo -e "${RED}✗ AI content generation tests FAILED${NC}"
  log_to_report "✗ AI content generation tests FAILED"
fi

echo ""

################################################################################
# Test Suite 4: End-to-End Tests
################################################################################

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}TEST SUITE 4: End-to-End User Workflows${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
log_to_report ""
log_to_report "═══════════════════════════════════════════════════════════"
log_to_report "TEST SUITE 4: END-TO-END USER WORKFLOWS"
log_to_report "═══════════════════════════════════════════════════════════"

if npm run test:e2e -- e2e/comprehensive-dashboard.spec.ts 2>&1 | tee -a "$REPORT_FILE"; then
  E2E_TESTS_PASSED=true
  echo -e "${GREEN}✓ End-to-end tests PASSED${NC}"
  log_to_report "✓ End-to-end tests PASSED"
else
  echo -e "${RED}✗ End-to-end tests FAILED${NC}"
  log_to_report "✗ End-to-end tests FAILED"
fi

echo ""

################################################################################
# Final Summary
################################################################################

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    TEST SUMMARY                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"

log_to_report ""
log_to_report "═══════════════════════════════════════════════════════════"
log_to_report "FINAL TEST SUMMARY"
log_to_report "═══════════════════════════════════════════════════════════"

# Count passed tests
PASSED_COUNT=0
TOTAL_COUNT=4

if [ "$DASHBOARD_TESTS_PASSED" = true ]; then
  echo -e "${GREEN}✓${NC} Dashboard Functionality: PASSED"
  log_to_report "✓ Dashboard Functionality: PASSED"
  ((PASSED_COUNT++))
else
  echo -e "${RED}✗${NC} Dashboard Functionality: FAILED"
  log_to_report "✗ Dashboard Functionality: FAILED"
fi

if [ "$CONNECTION_TESTS_PASSED" = true ]; then
  echo -e "${GREEN}✓${NC} Dashboard-Public Connection: PASSED"
  log_to_report "✓ Dashboard-Public Connection: PASSED"
  ((PASSED_COUNT++))
else
  echo -e "${RED}✗${NC} Dashboard-Public Connection: FAILED"
  log_to_report "✗ Dashboard-Public Connection: FAILED"
fi

if [ "$AI_TESTS_PASSED" = true ]; then
  echo -e "${GREEN}✓${NC} AI Content Generation: PASSED"
  log_to_report "✓ AI Content Generation: PASSED"
  ((PASSED_COUNT++))
else
  echo -e "${RED}✗${NC} AI Content Generation: FAILED"
  log_to_report "✗ AI Content Generation: FAILED"
fi

if [ "$E2E_TESTS_PASSED" = true ]; then
  echo -e "${GREEN}✓${NC} End-to-End Workflows: PASSED"
  log_to_report "✓ End-to-End Workflows: PASSED"
  ((PASSED_COUNT++))
else
  echo -e "${RED}✗${NC} End-to-End Workflows: FAILED"
  log_to_report "✗ End-to-End Workflows: FAILED"
fi

echo ""
echo -e "Total: ${GREEN}$PASSED_COUNT${NC}/${TOTAL_COUNT} test suites passed"
log_to_report ""
log_to_report "Total: $PASSED_COUNT/$TOTAL_COUNT test suites passed"

echo ""
echo -e "${BLUE}📊 Detailed report saved to: ${REPORT_FILE}${NC}"
log_to_report ""
log_to_report "═══════════════════════════════════════════════════════════"
log_to_report "Report completed at: $(date)"
log_to_report "═══════════════════════════════════════════════════════════"

# Exit with error if any tests failed
if [ "$PASSED_COUNT" -eq "$TOTAL_COUNT" ]; then
  echo -e "${GREEN}🎉 All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}❌ Some tests failed. Please review the report.${NC}"
  exit 1
fi
