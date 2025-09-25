/**
 * Log Redaction Security Tests
 * Tests that sensitive information is properly redacted from logs
 */

import { describe, it, expect } from 'vitest';
import { sanitizeLog, sanitizeLogObject, getSanitizationRules } from '@/src/middleware/log-sanitizer';

describe('Log Redaction Tests', () => {
  it('should redact email addresses', () => {
    const input = 'User john.doe@example.com logged in successfully';
    const result = sanitizeLog(input);
    
    expect(result).toBe('User [REDACTED_EMAIL] logged in successfully');
    expect(result).not.toContain('john.doe@example.com');
  });

  it('should redact JWT tokens', () => {
    const input = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    const result = sanitizeLog(input);
    
    expect(result).toBe('Authorization: Bearer [REDACTED_JWT]');
    expect(result).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
  });

  it('should redact API keys', () => {
    const input = 'API key: sk-1234567890abcdef1234567890abcdef';
    const result = sanitizeLog(input);
    
    expect(result).toBe('API key: [REDACTED_API_KEY]');
    expect(result).not.toContain('sk-1234567890abcdef1234567890abcdef');
  });

  it('should redact database URLs', () => {
    const input = 'Connecting to postgresql://user:password@localhost:5432/database';
    const result = sanitizeLog(input);
    
    expect(result).toBe('Connecting to [REDACTED_DB_URL]');
    expect(result).not.toContain('postgresql://user:password@localhost:5432/database');
  });

  it('should redact credit card numbers', () => {
    const input = 'Payment with card 4111-1111-1111-1111 processed';
    const result = sanitizeLog(input);
    
    expect(result).toBe('Payment with card [REDACTED_CARD] processed');
    expect(result).not.toContain('4111-1111-1111-1111');
  });

  it('should redact Social Security Numbers', () => {
    const input = 'SSN: 123-45-6789';
    const result = sanitizeLog(input);
    
    expect(result).toBe('SSN: [REDACTED_SSN]');
    expect(result).not.toContain('123-45-6789');
  });

  it('should redact phone numbers', () => {
    const input = 'Contact: 555-123-4567';
    const result = sanitizeLog(input);
    
    expect(result).toBe('Contact: [REDACTED_PHONE]');
    expect(result).not.toContain('555-123-4567');
  });

  it('should redact passwords', () => {
    const input = 'password: mySecretPassword123';
    const result = sanitizeLog(input);
    
    expect(result).toBe('password=[REDACTED_PASSWORD]');
    expect(result).not.toContain('mySecretPassword123');
  });

  it('should redact authorization headers', () => {
    const input = 'authorization: Bearer abc123def456';
    const result = sanitizeLog(input);
    
    expect(result).toBe('authorization=[REDACTED_AUTH]');
    expect(result).not.toContain('abc123def456');
  });

  it('should redact session IDs', () => {
    const input = 'session-id: sess_1234567890abcdef1234567890abcdef';
    const result = sanitizeLog(input);
    
    expect(result).toBe('session-id=[REDACTED_SESSION]');
    expect(result).not.toContain('sess_1234567890abcdef1234567890abcdef');
  });

  it('should redact multiple sensitive data types', () => {
    const input = 'User john.doe@example.com with password: secret123 and API key: sk-abc123 logged in from 192.168.1.1';
    const result = sanitizeLog(input);
    
    expect(result).toContain('[REDACTED_EMAIL]');
    expect(result).toContain('[REDACTED_PASSWORD]');
    expect(result).toContain('[REDACTED_API_KEY]');
    expect(result).not.toContain('john.doe@example.com');
    expect(result).not.toContain('secret123');
    expect(result).not.toContain('sk-abc123');
  });

  it('should sanitize objects with sensitive data', () => {
    const input = {
      user: {
        email: 'test@example.com',
        password: 'secret123',
        apiKey: 'sk-abc123'
      },
      request: {
        headers: {
          authorization: 'Bearer token123',
          'x-session-id': 'sess_456'
        }
      },
      timestamp: '2023-01-01T00:00:00Z'
    };
    
    const result = sanitizeLogObject(input);
    
    expect(result.user.email).toBe('[REDACTED_EMAIL]');
    expect(result.user.password).toBe('[REDACTED_PASSWORD]');
    expect(result.user.apiKey).toBe('[REDACTED_API_KEY]');
    expect(result.request.headers.authorization).toBe('[REDACTED_AUTH]');
    expect(result.request.headers['x-session-id']).toBe('[REDACTED_SESSION]');
    expect(result.timestamp).toBe('2023-01-01T00:00:00Z'); // Should not be redacted
  });

  it('should preserve non-sensitive data', () => {
    const input = 'User logged in successfully at 2023-01-01T00:00:00Z';
    const result = sanitizeLog(input);
    
    expect(result).toBe(input); // Should remain unchanged
  });

  it('should handle arrays with sensitive data', () => {
    const input = [
      'User john@example.com logged in',
      'API key: sk-1234567890',
      'Normal log message'
    ];
    
    const result = sanitizeLogObject(input);
    
    expect(result[0]).toBe('User [REDACTED_EMAIL] logged in');
    expect(result[1]).toBe('API key: [REDACTED_API_KEY]');
    expect(result[2]).toBe('Normal log message');
  });

  it('should handle nested objects with sensitive data', () => {
    const input = {
      level: 'info',
      message: 'Request processed',
      data: {
        user: {
          email: 'user@example.com',
          profile: {
            phone: '555-123-4567'
          }
        },
        request: {
          headers: {
            authorization: 'Bearer token123'
          }
        }
      }
    };
    
    const result = sanitizeLogObject(input);
    
    expect(result.level).toBe('info'); // Should not be redacted
    expect(result.message).toBe('Request processed'); // Should not be redacted
    expect(result.data.user.email).toBe('[REDACTED_EMAIL]');
    expect(result.data.user.profile.phone).toBe('[REDACTED_PHONE]');
    expect(result.data.request.headers.authorization).toBe('[REDACTED_AUTH]');
  });

  it('should return sanitization rules', () => {
    const rules = getSanitizationRules();
    
    expect(rules).toBeInstanceOf(Array);
    expect(rules.length).toBeGreaterThan(0);
    
    // Check that rules have required properties
    rules.forEach(rule => {
      expect(rule).toHaveProperty('pattern');
      expect(rule).toHaveProperty('replacement');
      expect(rule).toHaveProperty('description');
      expect(rule.pattern).toBeInstanceOf(RegExp);
      expect(typeof rule.replacement).toBe('string');
      expect(typeof rule.description).toBe('string');
    });
  });

  it('should handle edge cases', () => {
    // Empty string
    expect(sanitizeLog('')).toBe('');
    
    // Null/undefined
    expect(sanitizeLogObject(null)).toBe(null);
    expect(sanitizeLogObject(undefined)).toBe(undefined);
    
    // Numbers
    expect(sanitizeLogObject(123)).toBe(123);
    
    // Booleans
    expect(sanitizeLogObject(true)).toBe(true);
    expect(sanitizeLogObject(false)).toBe(false);
  });

  it('should handle malformed email addresses', () => {
    const input = 'Invalid email: not-an-email';
    const result = sanitizeLog(input);
    
    expect(result).toBe(input); // Should not be redacted as it's not a valid email
  });

  it('should handle partial matches', () => {
    const input = 'API key: sk-123 (partial)';
    const result = sanitizeLog(input);
    
    // Should not redact short strings that look like API keys
    expect(result).toBe(input);
  });

  it('should handle case-insensitive patterns', () => {
    const input = 'PASSWORD: secret123';
    const result = sanitizeLog(input);
    
    expect(result).toBe('PASSWORD=[REDACTED_PASSWORD]');
    expect(result).not.toContain('secret123');
  });
});
