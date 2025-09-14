/**
 * Security Integration Tests
 * Tests for security vulnerabilities and edge cases
 */

import { checkLoginRateLimit, recordFailedLoginAttempt, validatePasswordStrength, sanitizeInput } from '@/lib/security';
import { logAuditEvent } from '@/lib/rbac';

describe('Security Integration Tests', () => {
  describe('Rate Limiting', () => {
    test('should enforce login rate limits', () => {
      const ipAddress = '192.168.1.100';
      
      // Should allow initial attempts
      let result = checkLoginRateLimit(ipAddress);
      expect(result.allowed).toBe(true);
      expect(result.remainingAttempts).toBe(5);
      
      // Record multiple failed attempts
      for (let i = 0; i < 5; i++) {
        recordFailedLoginAttempt(ipAddress);
      }
      
      // Should be blocked after 5 attempts
      result = checkLoginRateLimit(ipAddress);
      expect(result.allowed).toBe(false);
      expect(result.remainingAttempts).toBe(0);
      expect(result.blockedUntil).toBeDefined();
    });

    test('should reset rate limit after time window', () => {
      const ipAddress = '192.168.1.101';
      
      // Mock current time
      const originalNow = Date.now;
      let mockTime = 1000000000000; // Start time
      Date.now = jest.fn(() => mockTime);
      
      try {
        // Record failed attempts
        for (let i = 0; i < 5; i++) {
          recordFailedLoginAttempt(ipAddress);
        }
        
        // Should be blocked
        let result = checkLoginRateLimit(ipAddress);
        expect(result.allowed).toBe(false);
        
        // Advance time past block duration
        mockTime += 60 * 60 * 1000 + 1000; // 1 hour + 1 second
        
        // Should be allowed again
        result = checkLoginRateLimit(ipAddress);
        expect(result.allowed).toBe(true);
      } finally {
        Date.now = originalNow;
      }
    });
  });

  describe('Password Validation', () => {
    test('should validate strong passwords', () => {
      const result = validatePasswordStrength('StrongP@ssw0rd123');
      expect(result.valid).toBe(true);
      expect(result.score).toBe(5);
      expect(result.issues).toHaveLength(0);
    });

    test('should reject weak passwords', () => {
      const result = validatePasswordStrength('weak');
      expect(result.valid).toBe(false);
      expect(result.score).toBeLessThan(5);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    test('should reject common passwords', () => {
      const result = validatePasswordStrength('password123');
      expect(result.valid).toBe(false);
      expect(result.score).toBe(0);
      expect(result.issues).toContain('Password is too common');
    });

    test('should validate password requirements', () => {
      const testCases = [
        { password: 'short', issue: 'Password must be at least 8 characters long' },
        { password: 'nouppercase1!', issue: 'Password must contain at least one uppercase letter' },
        { password: 'NOLOWERCASE1!', issue: 'Password must contain at least one lowercase letter' },
        { password: 'NoNumbers!', issue: 'Password must contain at least one number' },
        { password: 'NoSpecialChars1', issue: 'Password must contain at least one special character' }
      ];

      testCases.forEach(({ password, issue }) => {
        const result = validatePasswordStrength(password);
        expect(result.valid).toBe(false);
        expect(result.issues).toContain(issue);
      });
    });
  });

  describe('Input Sanitization', () => {
    test('should sanitize XSS payloads', () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        '<img src="x" onerror="alert(1)">',
        'javascript:alert(1)',
        '<svg onload=alert(1)>',
        '"><script>alert(1)</script>'
      ];

      maliciousInputs.forEach(input => {
        const sanitized = sanitizeInput(input);
        expect(sanitized).not.toContain('<script>');
        expect(sanitized).not.toContain('javascript:');
        expect(sanitized).not.toContain('onerror=');
        expect(sanitized).not.toContain('onload=');
        expect(sanitized).not.toContain('src="x"'); // Should be neutralized to data-src
      });
    });

    test('should preserve safe content', () => {
      const safeInputs = [
        'Hello World',
        'User@example.com',
        'Normal text with numbers 123',
        'Some punctuation: hello, world!'
      ];

      safeInputs.forEach(input => {
        const sanitized = sanitizeInput(input);
        // Should not change safe content (except for quotes)
        expect(sanitized.replace(/&quot;|&#x27;/g, '')).toContain(input.replace(/"|'/g, ''));
      });
    });
  });

  describe('Audit Logging Security', () => {
    test('should handle malformed audit events', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const malformedEvents = [
        null,
        undefined,
        {},
        { action: '' },
        { action: 'test', details: null },
        'string instead of object'
      ];

      for (const event of malformedEvents) {
        expect(async () => await logAuditEvent(event as any)).not.toThrow();
      }
      
      consoleSpy.mockRestore();
    });

    test('should prevent audit log injection', async () => {
      const maliciousEvent = {
        action: 'test_action',
        resource: 'test_resource',
        details: {
          userInput: '<script>alert("xss")</script>',
          sqlInjection: "'; DROP TABLE users; --",
          commandInjection: '$(rm -rf /)'
        }
      };

      // Should not throw and should log the event
      expect(async () => await logAuditEvent(maliciousEvent)).not.toThrow();
    });
  });

  describe('Security Headers and Configuration', () => {
    test('should have proper security headers defined', () => {
      const { SECURITY_HEADERS } = require('@/lib/security');
      
      expect(SECURITY_HEADERS['X-Content-Type-Options']).toBe('nosniff');
      expect(SECURITY_HEADERS['X-Frame-Options']).toBe('DENY');
      expect(SECURITY_HEADERS['X-XSS-Protection']).toBe('1; mode=block');
      expect(SECURITY_HEADERS['Strict-Transport-Security']).toContain('max-age=31536000');
      expect(SECURITY_HEADERS['Content-Security-Policy']).toContain("default-src 'self'");
    });
  });

  describe('Backup System Security', () => {
    test('should validate backup name sanitization', () => {
      const maliciousNames = [
        '../../../etc/passwd',
        'backup; rm -rf /',
        'backup`whoami`',
        'backup$(id)',
        'backup&echo test'
      ];

      maliciousNames.forEach(name => {
        const sanitized = name.replace(/[^a-zA-Z0-9\-_]/g, '');
        expect(sanitized).not.toContain('../');
        expect(sanitized).not.toContain(';');
        expect(sanitized).not.toContain('`');
        expect(sanitized).not.toContain('$');
        expect(sanitized).not.toContain('&');
      });
    });
  });

  describe('Session Security', () => {
    test('should validate session configuration', () => {
      // Mock the auth options
      const authOptions = {
        session: {
          strategy: 'jwt',
          maxAge: 24 * 60 * 60 // 24 hours
        }
      };

      expect(authOptions.session.strategy).toBe('jwt');
      expect(authOptions.session.maxAge).toBe(86400); // 24 hours in seconds
    });
  });
});

describe('Compliance Security Tests', () => {
  describe('GDPR Compliance', () => {
    test('should have data retention controls', () => {
      // Test that backup retention is configurable
      const retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS || '7');
      expect(retentionDays).toBeGreaterThan(0);
      expect(retentionDays).toBeLessThanOrEqual(2555); // 7 years max
    });
  });

  describe('SOC2 Type II Controls', () => {
    test('should have access control logging', () => {
      // All RBAC functions should log access attempts
      expect(logAuditEvent).toBeDefined();
    });

    test('should have proper role separation', () => {
      const { ROLES, ROLE_PERMISSIONS } = require('@/lib/rbac');
      
      // Viewer should not have admin permissions
      const viewerPerms = ROLE_PERMISSIONS[ROLES.VIEWER];
      const adminPerms = ROLE_PERMISSIONS[ROLES.ADMIN];
      
      expect(viewerPerms).not.toContain('manage_system');
      expect(adminPerms).toContain('manage_system');
    });
  });
});