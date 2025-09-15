#!/bin/bash

# Legal Compliance Checks Script for Yalla London
# This script performs automated checks for legal and regulatory compliance

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${1:-http://localhost:3000}"
OUTPUT_DIR="./compliance-reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_FILE="$OUTPUT_DIR/legal_compliance_report_$TIMESTAMP.md"

# Create output directory
mkdir -p "$OUTPUT_DIR"

echo -e "${BLUE}🔍 Legal Compliance Check for Yalla London${NC}"
echo -e "${BLUE}Base URL: $BASE_URL${NC}"
echo -e "${BLUE}Report: $REPORT_FILE${NC}"
echo ""

# Initialize report
cat > "$REPORT_FILE" << EOF
# Legal Compliance Report
**Generated:** $(date)  
**Website:** $BASE_URL  
**Version:** $(git describe --tags --always 2>/dev/null || echo "unknown")

## Summary
EOF

# Track overall compliance score
TOTAL_CHECKS=0
PASSED_CHECKS=0

# Function to add test result to report
add_result() {
    local test_name="$1"
    local status="$2"
    local details="$3"
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✅ $test_name${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        echo "- ✅ **$test_name**: PASSED" >> "$REPORT_FILE"
    elif [ "$status" = "WARN" ]; then
        echo -e "${YELLOW}⚠️  $test_name${NC}"
        echo "- ⚠️ **$test_name**: WARNING" >> "$REPORT_FILE"
    else
        echo -e "${RED}❌ $test_name${NC}"
        echo "- ❌ **$test_name**: FAILED" >> "$REPORT_FILE"
    fi
    
    if [ -n "$details" ]; then
        echo "  $details"
        echo "  - Details: $details" >> "$REPORT_FILE"
    fi
    echo "" >> "$REPORT_FILE"
}

# Function to check if page exists and contains content
check_page_exists() {
    local path="$1"
    local expected_content="$2"
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$path" || echo "000")
    
    if [ "$response" = "200" ]; then
        if [ -n "$expected_content" ]; then
            content=$(curl -s "$BASE_URL$path" || echo "")
            if echo "$content" | grep -qi "$expected_content"; then
                echo "PASS"
            else
                echo "FAIL"
            fi
        else
            echo "PASS"
        fi
    else
        echo "FAIL"
    fi
}

# Function to check SSL/TLS configuration
check_ssl_config() {
    if [[ "$BASE_URL" =~ ^https:// ]]; then
        # Extract domain from URL
        domain=$(echo "$BASE_URL" | sed 's|https\?://||' | sed 's|/.*||')
        
        # Check SSL certificate
        ssl_info=$(echo | openssl s_client -connect "$domain:443" -servername "$domain" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null || echo "")
        
        if [ -n "$ssl_info" ]; then
            expiry=$(echo "$ssl_info" | grep "notAfter" | cut -d= -f2)
            if [ -n "$expiry" ]; then
                expiry_epoch=$(date -d "$expiry" +%s 2>/dev/null || echo "0")
                current_epoch=$(date +%s)
                days_until_expiry=$(( (expiry_epoch - current_epoch) / 86400 ))
                
                if [ "$days_until_expiry" -gt 30 ]; then
                    echo "PASS"
                elif [ "$days_until_expiry" -gt 7 ]; then
                    echo "WARN"
                else
                    echo "FAIL"
                fi
            else
                echo "FAIL"
            fi
        else
            echo "FAIL"
        fi
    else
        echo "FAIL"
    fi
}

# Function to check security headers
check_security_headers() {
    local url="$1"
    local required_headers=("strict-transport-security" "x-frame-options" "x-content-type-options")
    local missing_headers=()
    
    for header in "${required_headers[@]}"; do
        if ! curl -sI "$url" | grep -qi "$header:"; then
            missing_headers+=("$header")
        fi
    done
    
    if [ ${#missing_headers[@]} -eq 0 ]; then
        echo "PASS"
    elif [ ${#missing_headers[@]} -le 1 ]; then
        echo "WARN"
    else
        echo "FAIL"
    fi
}

echo "## GDPR Compliance Checks" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# 1. Privacy Policy Check
echo -e "${BLUE}Checking Privacy Policy...${NC}"
privacy_result=$(check_page_exists "/privacy" "privacy policy")
if [ "$privacy_result" = "PASS" ]; then
    # Check for key GDPR elements
    privacy_content=$(curl -s "$BASE_URL/privacy" || echo "")
    gdpr_elements=("data protection" "right to access" "right to erasure" "consent" "lawful basis")
    missing_elements=()
    
    for element in "${gdpr_elements[@]}"; do
        if ! echo "$privacy_content" | grep -qi "$element"; then
            missing_elements+=("$element")
        fi
    done
    
    if [ ${#missing_elements[@]} -eq 0 ]; then
        add_result "Privacy Policy - GDPR Elements" "PASS" "All key GDPR elements present"
    else
        add_result "Privacy Policy - GDPR Elements" "WARN" "Missing elements: ${missing_elements[*]}"
    fi
else
    add_result "Privacy Policy Page" "FAIL" "Privacy policy page not accessible"
fi

# 2. Terms of Use Check
echo -e "${BLUE}Checking Terms of Use...${NC}"
terms_result=$(check_page_exists "/terms" "terms")
if [ "$terms_result" = "PASS" ]; then
    add_result "Terms of Use Page" "PASS" "Terms page accessible"
else
    add_result "Terms of Use Page" "FAIL" "Terms page not accessible"
fi

# 3. Cookie Consent Check
echo -e "${BLUE}Checking Cookie Consent...${NC}"
homepage_content=$(curl -s "$BASE_URL" || echo "")
if echo "$homepage_content" | grep -qi "cookie.*consent\|consent.*cookie"; then
    add_result "Cookie Consent Banner" "PASS" "Cookie consent mechanism detected"
else
    add_result "Cookie Consent Banner" "WARN" "Cookie consent banner not detected"
fi

# 4. Data Subject Rights
echo -e "${BLUE}Checking Data Subject Rights...${NC}"
if echo "$privacy_content" | grep -qi "data.*export\|download.*data\|data.*portability"; then
    add_result "Data Portability" "PASS" "Data export/portability mentioned"
else
    add_result "Data Portability" "WARN" "Data portability not clearly mentioned"
fi

echo "## UK Data Protection Compliance" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# 5. ICO Requirements
echo -e "${BLUE}Checking ICO Compliance...${NC}"
if echo "$privacy_content" | grep -qi "ico\|information.*commissioner"; then
    add_result "ICO Reference" "PASS" "ICO mentioned in privacy policy"
else
    add_result "ICO Reference" "WARN" "ICO not referenced"
fi

# 6. Data Controller Information
echo -e "${BLUE}Checking Data Controller Info...${NC}"
if echo "$privacy_content" | grep -qi "data.*controller\|controller.*data"; then
    add_result "Data Controller Info" "PASS" "Data controller information provided"
else
    add_result "Data Controller Info" "WARN" "Data controller not clearly identified"
fi

echo "## Security Compliance" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# 7. HTTPS/SSL Check
echo -e "${BLUE}Checking SSL/TLS Configuration...${NC}"
ssl_result=$(check_ssl_config)
case "$ssl_result" in
    "PASS") add_result "SSL Certificate" "PASS" "Valid SSL certificate with >30 days until expiry" ;;
    "WARN") add_result "SSL Certificate" "WARN" "SSL certificate expires within 30 days" ;;
    "FAIL") add_result "SSL Certificate" "FAIL" "SSL certificate invalid or expires soon" ;;
esac

# 8. Security Headers Check
echo -e "${BLUE}Checking Security Headers...${NC}"
headers_result=$(check_security_headers "$BASE_URL")
case "$headers_result" in
    "PASS") add_result "Security Headers" "PASS" "All required security headers present" ;;
    "WARN") add_result "Security Headers" "WARN" "Some security headers missing" ;;
    "FAIL") add_result "Security Headers" "FAIL" "Multiple security headers missing" ;;
esac

# 9. Content Security Policy
echo -e "${BLUE}Checking Content Security Policy...${NC}"
if curl -sI "$BASE_URL" | grep -qi "content-security-policy:"; then
    add_result "Content Security Policy" "PASS" "CSP header present"
else
    add_result "Content Security Policy" "WARN" "CSP header not found"
fi

echo "## Accessibility Compliance" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# 10. Basic Accessibility Check
echo -e "${BLUE}Checking Basic Accessibility...${NC}"
homepage_content=$(curl -s "$BASE_URL" || echo "")

# Check for alt attributes on images
if echo "$homepage_content" | grep -q '<img[^>]*alt='; then
    add_result "Image Alt Text" "PASS" "Images with alt attributes found"
else
    add_result "Image Alt Text" "WARN" "No images with alt attributes found"
fi

# Check for semantic HTML
if echo "$homepage_content" | grep -q '<main\|<header\|<nav\|<footer'; then
    add_result "Semantic HTML" "PASS" "Semantic HTML elements found"
else
    add_result "Semantic HTML" "WARN" "Limited semantic HTML structure"
fi

# Check for lang attribute
if echo "$homepage_content" | grep -q 'lang='; then
    add_result "Language Declaration" "PASS" "Page language declared"
else
    add_result "Language Declaration" "FAIL" "Page language not declared"
fi

echo "## Cookie & Tracking Compliance" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# 11. Third-party Tracking Check
echo -e "${BLUE}Checking Third-party Tracking...${NC}"
tracking_scripts=("google-analytics" "gtag" "facebook" "twitter")
found_trackers=()

for tracker in "${tracking_scripts[@]}"; do
    if echo "$homepage_content" | grep -qi "$tracker"; then
        found_trackers+=("$tracker")
    fi
done

if [ ${#found_trackers[@]} -gt 0 ]; then
    add_result "Third-party Tracking" "WARN" "Tracking scripts found: ${found_trackers[*]}"
else
    add_result "Third-party Tracking" "PASS" "No obvious tracking scripts detected"
fi

# 12. Local Storage Usage
echo -e "${BLUE}Checking Local Storage Usage...${NC}"
if echo "$homepage_content" | grep -qi "localstorage\|sessionstorage"; then
    add_result "Local Storage Usage" "WARN" "Local storage usage detected - ensure consent"
else
    add_result "Local Storage Usage" "PASS" "No obvious local storage usage"
fi

echo "## Content Compliance" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# 13. Contact Information
echo -e "${BLUE}Checking Contact Information...${NC}"
contact_result=$(check_page_exists "/contact" "contact")
if [ "$contact_result" = "PASS" ]; then
    add_result "Contact Information" "PASS" "Contact page accessible"
else
    add_result "Contact Information" "WARN" "Contact page not found"
fi

# 14. Age Verification (if applicable)
echo -e "${BLUE}Checking Age-related Content...${NC}"
age_keywords=("18+" "adult" "age verification" "alcohol" "gambling")
found_age_content=()

for keyword in "${age_keywords[@]}"; do
    if echo "$homepage_content" | grep -qi "$keyword"; then
        found_age_content+=("$keyword")
    fi
done

if [ ${#found_age_content[@]} -gt 0 ]; then
    add_result "Age-sensitive Content" "WARN" "Age-sensitive content found: ${found_age_content[*]} - verify compliance"
else
    add_result "Age-sensitive Content" "PASS" "No age-sensitive content detected"
fi

# 15. Intellectual Property
echo -e "${BLUE}Checking Copyright Information...${NC}"
if echo "$homepage_content" | grep -qi "copyright\|©\|all rights reserved"; then
    add_result "Copyright Notice" "PASS" "Copyright notice found"
else
    add_result "Copyright Notice" "WARN" "Copyright notice not found"
fi

# Calculate compliance score
compliance_score=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))

# Add summary to report
cat >> "$REPORT_FILE" << EOF

## Compliance Score

**Overall Score:** $compliance_score% ($PASSED_CHECKS/$TOTAL_CHECKS checks passed)

### Score Interpretation:
- **90-100%**: Excellent compliance
- **80-89%**: Good compliance with minor issues
- **70-79%**: Adequate compliance with some concerns
- **Below 70%**: Significant compliance issues requiring attention

## Recommendations

### High Priority
- Ensure all failed checks are addressed immediately
- Review and update privacy policy regularly
- Implement proper cookie consent management
- Maintain SSL certificate renewal schedule

### Medium Priority
- Address warning items to improve compliance score
- Regular accessibility audits
- Monitor security headers and CSP policies
- Keep third-party integrations compliant

### Low Priority
- Enhance documentation for legal compliance
- Consider additional privacy-enhancing measures
- Regular compliance training for team

## Next Steps

1. **Address Failed Checks**: Priority should be given to any failed compliance checks
2. **Monitor Warnings**: Review warning items and plan improvements
3. **Regular Audits**: Schedule quarterly compliance reviews
4. **Legal Review**: Have legal counsel review privacy policy and terms annually
5. **User Testing**: Conduct user testing for accessibility compliance

---
*This report was generated automatically. For legal advice, consult with qualified legal counsel.*
EOF

# Display final summary
echo ""
echo -e "${BLUE}📊 Compliance Summary${NC}"
echo -e "Total Checks: $TOTAL_CHECKS"
echo -e "Passed: ${GREEN}$PASSED_CHECKS${NC}"
echo -e "Failed/Warned: ${RED}$((TOTAL_CHECKS - PASSED_CHECKS))${NC}"
echo -e "Compliance Score: ${GREEN}$compliance_score%${NC}"
echo ""
echo -e "${BLUE}📄 Full report saved to: $REPORT_FILE${NC}"

# Exit with appropriate code
if [ "$compliance_score" -ge 80 ]; then
    echo -e "${GREEN}✅ Compliance check completed successfully${NC}"
    exit 0
elif [ "$compliance_score" -ge 70 ]; then
    echo -e "${YELLOW}⚠️  Compliance check completed with warnings${NC}"
    exit 1
else
    echo -e "${RED}❌ Compliance check failed - significant issues found${NC}"
    exit 2
fi