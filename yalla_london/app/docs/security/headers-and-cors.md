# Security Headers and CORS Documentation

## Overview
This document outlines the security headers and CORS (Cross-Origin Resource Sharing) configuration for the Yalla London platform, ensuring protection against common web vulnerabilities and proper access control.

## Security Headers

### 1. Content Security Policy (CSP)
**Purpose**: Prevents XSS attacks by controlling which resources can be loaded

**Configuration**:
```
default-src 'self'; 
script-src 'self' 'unsafe-inline' 'unsafe-eval'; 
style-src 'self' 'unsafe-inline'; 
img-src 'self' data: https:; 
font-src 'self' data:; 
connect-src 'self' https:; 
frame-ancestors 'none';
```

**Environment Variable**: `CSP_POLICY`

**Testing**:
```bash
# Check CSP header
curl -I https://yalla-london.vercel.app/api/health | grep -i content-security-policy
```

### 2. HTTP Strict Transport Security (HSTS)
**Purpose**: Forces HTTPS connections and prevents protocol downgrade attacks

**Configuration**:
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

**Environment Variable**: `HSTS_MAX_AGE`

**Testing**:
```bash
# Check HSTS header (only in production)
curl -I https://yalla-london.vercel.app/api/health | grep -i strict-transport-security
```

### 3. X-Frame-Options
**Purpose**: Prevents clickjacking attacks by controlling iframe embedding

**Configuration**:
```
X-Frame-Options: DENY
```

**Environment Variable**: `X_FRAME_OPTIONS`

**Options**:
- `DENY`: Never allow framing
- `SAMEORIGIN`: Allow framing from same origin
- `ALLOW-FROM uri`: Allow framing from specific URI

### 4. X-Content-Type-Options
**Purpose**: Prevents MIME type sniffing attacks

**Configuration**:
```
X-Content-Type-Options: nosniff
```

**Environment Variable**: `X_CONTENT_TYPE_OPTIONS`

### 5. X-XSS-Protection
**Purpose**: Enables browser XSS filtering

**Configuration**:
```
X-XSS-Protection: 1; mode=block
```

**Environment Variable**: `X_XSS_PROTECTION`

### 6. Referrer Policy
**Purpose**: Controls referrer information sent with requests

**Configuration**:
```
Referrer-Policy: strict-origin-when-cross-origin
```

**Environment Variable**: `REFERRER_POLICY`

**Options**:
- `no-referrer`: Never send referrer
- `no-referrer-when-downgrade`: Send referrer for same-origin requests
- `origin`: Send only origin
- `origin-when-cross-origin`: Send origin for cross-origin requests
- `strict-origin`: Send origin for same-origin requests
- `strict-origin-when-cross-origin`: Send origin for cross-origin requests

### 7. Permissions Policy
**Purpose**: Controls browser features and APIs

**Configuration**:
```
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
```

**Environment Variable**: `PERMISSIONS_POLICY`

### 8. Additional Security Headers
```
X-DNS-Prefetch-Control: off
X-Download-Options: noopen
X-Permitted-Cross-Domain-Policies: none
```

## CORS Configuration

### 1. Allowed Origins
**Purpose**: Controls which domains can make cross-origin requests

**Configuration**:
```javascript
allowedOrigins: [
  'http://localhost:3000',
  'https://yalla-london.vercel.app',
  'https://yalla-london-git-main-khaledauns-projects.vercel.app'
]
```

**Environment Variable**: `ALLOWED_ORIGINS` (comma-separated)

### 2. Allowed Methods
**Purpose**: Controls which HTTP methods are allowed

**Configuration**:
```javascript
allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
```

### 3. Allowed Headers
**Purpose**: Controls which headers can be sent with requests

**Configuration**:
```javascript
allowedHeaders: [
  'Content-Type',
  'Authorization',
  'X-Requested-With',
  'X-Session-ID',
  'X-API-Key'
]
```

### 4. Credentials
**Purpose**: Controls whether credentials can be sent with requests

**Configuration**:
```javascript
allowCredentials: true
```

### 5. Max Age
**Purpose**: Controls how long preflight requests can be cached

**Configuration**:
```javascript
maxAge: 86400 // 24 hours
```

## Implementation

### 1. Middleware Usage
```typescript
import { withSecurityHeaders, withAdminSecurityHeaders } from '@/src/middleware/security-headers';

// For general API routes
export const GET = withSecurityHeaders(async (request: NextRequest) => {
  // Handler implementation
});

// For admin routes (stricter security)
export const POST = withAdminSecurityHeaders(async (request: NextRequest) => {
  // Handler implementation
});
```

### 2. Environment Configuration
```bash
# Security Headers
CSP_POLICY="default-src 'self'; script-src 'self' 'unsafe-inline'"
HSTS_MAX_AGE="31536000; includeSubDomains; preload"
X_FRAME_OPTIONS="DENY"
X_CONTENT_TYPE_OPTIONS="nosniff"
X_XSS_PROTECTION="1; mode=block"
REFERRER_POLICY="strict-origin-when-cross-origin"
PERMISSIONS_POLICY="camera=(), microphone=(), geolocation=()"

# CORS
ALLOWED_ORIGINS="http://localhost:3000,https://yalla-london.vercel.app"
```

## Testing

### 1. Security Headers Test
```bash
# Test all security headers
curl -I https://yalla-london.vercel.app/api/health

# Expected headers:
# Content-Security-Policy: default-src 'self'; ...
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# X-XSS-Protection: 1; mode=block
# Referrer-Policy: strict-origin-when-cross-origin
# Permissions-Policy: camera=(), microphone=(), ...
```

### 2. CORS Test
```bash
# Test preflight request
curl -X OPTIONS \
  -H "Origin: https://yalla-london.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  https://yalla-london.vercel.app/api/admin/editor/save

# Expected headers:
# Access-Control-Allow-Origin: https://yalla-london.vercel.app
# Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
# Access-Control-Allow-Headers: Content-Type, Authorization, ...
# Access-Control-Allow-Credentials: true
```

### 3. Automated Testing
```typescript
// Test security headers
it('should include security headers', async () => {
  const response = await fetch('/api/health');
  const headers = response.headers;
  
  expect(headers.get('X-Frame-Options')).toBe('DENY');
  expect(headers.get('X-Content-Type-Options')).toBe('nosniff');
  expect(headers.get('X-XSS-Protection')).toBe('1; mode=block');
});

// Test CORS
it('should allow requests from allowed origins', async () => {
  const response = await fetch('/api/health', {
    headers: {
      'Origin': 'https://yalla-london.vercel.app'
    }
  });
  
  expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://yalla-london.vercel.app');
});
```

## Security Considerations

### 1. CSP Violations
- Monitor CSP violation reports
- Adjust policy as needed for legitimate resources
- Block malicious resource loading

### 2. CORS Misconfiguration
- Never use wildcard (*) for credentials
- Validate origin headers
- Implement proper preflight handling

### 3. Header Bypass
- Some headers can be bypassed by older browsers
- Implement server-side validation as backup
- Use multiple layers of protection

### 4. Development vs Production
- Different configurations for different environments
- Stricter security in production
- Allow necessary resources in development

## Monitoring and Alerting

### 1. Security Header Monitoring
- Monitor for missing headers
- Alert on CSP violations
- Track header effectiveness

### 2. CORS Monitoring
- Monitor for CORS violations
- Track cross-origin request patterns
- Alert on suspicious activity

### 3. Alert Thresholds
- Missing security headers: Immediate alert
- CSP violations: Alert if > 10 per hour
- CORS violations: Alert if > 5 per hour

## Troubleshooting

### 1. Common Issues

#### CSP Blocking Resources
**Symptoms**: Resources not loading, CSP violations in console
**Solution**: Update CSP policy to allow necessary resources
```bash
# Check CSP violations
curl -H "Content-Security-Policy-Report-Only: default-src 'self'" \
  https://yalla-london.vercel.app/api/health
```

#### CORS Errors
**Symptoms**: Cross-origin requests failing
**Solution**: Check origin configuration and preflight handling
```bash
# Test CORS configuration
curl -H "Origin: https://example.com" \
  https://yalla-london.vercel.app/api/health
```

#### HSTS Issues
**Symptoms**: HTTPS redirects not working
**Solution**: Check HSTS configuration and certificate
```bash
# Check HSTS header
curl -I https://yalla-london.vercel.app/api/health | grep -i strict-transport-security
```

### 2. Debugging Tools
- Browser Developer Tools
- Security Headers Scanner
- CSP Evaluator
- CORS Tester

### 3. Common Fixes
- Update CSP policy for new resources
- Add missing origins to CORS configuration
- Adjust header values for compatibility
- Test in different browsers

## Best Practices

### 1. Security Headers
- Use strict CSP policies
- Enable HSTS in production
- Set appropriate frame options
- Implement content type protection

### 2. CORS
- Use specific origins, not wildcards
- Implement proper preflight handling
- Validate origin headers
- Use credentials carefully

### 3. Monitoring
- Monitor security header effectiveness
- Track CORS violations
- Alert on security issues
- Regular security audits

### 4. Updates
- Keep security configurations up to date
- Test changes in staging first
- Document configuration changes
- Review security policies regularly
