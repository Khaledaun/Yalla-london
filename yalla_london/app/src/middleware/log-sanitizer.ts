/**
 * Log Sanitizer Middleware
 * Redacts sensitive information from logs
 */

import { NextRequest, NextResponse } from 'next/server';

interface SanitizationRule {
  pattern: RegExp;
  replacement: string;
  description: string;
}

class LogSanitizer {
  private rules: SanitizationRule[] = [];

  constructor() {
    this.initializeRules();
  }

  private initializeRules() {
    // Email addresses
    this.rules.push({
      pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      replacement: '[REDACTED_EMAIL]',
      description: 'Email addresses'
    });

    // JWT tokens
    this.rules.push({
      pattern: /eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/g,
      replacement: '[REDACTED_JWT]',
      description: 'JWT tokens'
    });

    // API keys (common patterns)
    this.rules.push({
      pattern: /(api[_-]?key|apikey|access[_-]?token|secret[_-]?key)\s*[:=]\s*['"]?[A-Za-z0-9_-]{20,}['"]?/gi,
      replacement: '$1=[REDACTED_API_KEY]',
      description: 'API keys'
    });

    // Database URLs
    this.rules.push({
      pattern: /(postgresql|mysql|mongodb):\/\/[^:\s]+:[^@\s]+@[^\s]+/g,
      replacement: '[REDACTED_DB_URL]',
      description: 'Database connection strings'
    });

    // Credit card numbers
    this.rules.push({
      pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
      replacement: '[REDACTED_CARD]',
      description: 'Credit card numbers'
    });

    // Social Security Numbers
    this.rules.push({
      pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
      replacement: '[REDACTED_SSN]',
      description: 'Social Security Numbers'
    });

    // Phone numbers
    this.rules.push({
      pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
      replacement: '[REDACTED_PHONE]',
      description: 'Phone numbers'
    });

    // Passwords in request bodies
    this.rules.push({
      pattern: /(password|passwd|pwd)\s*[:=]\s*['"]?[^'",\s]+['"]?/gi,
      replacement: '$1=[REDACTED_PASSWORD]',
      description: 'Passwords'
    });

    // Authorization headers
    this.rules.push({
      pattern: /(authorization|auth)\s*[:=]\s*['"]?[^'",\s]+['"]?/gi,
      replacement: '$1=[REDACTED_AUTH]',
      description: 'Authorization headers'
    });

    // Session IDs
    this.rules.push({
      pattern: /(session[_-]?id|sessionid|sid)\s*[:=]\s*['"]?[A-Za-z0-9_-]{20,}['"]?/gi,
      replacement: '$1=[REDACTED_SESSION]',
      description: 'Session IDs'
    });

    // IP addresses (optional - can be enabled for stricter privacy)
    if (process.env.REDACT_IP_ADDRESSES === 'true') {
      this.rules.push({
        pattern: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
        replacement: '[REDACTED_IP]',
        description: 'IP addresses'
      });
    }
  }

  sanitize(text: string): string {
    let sanitized = text;
    
    for (const rule of this.rules) {
      sanitized = sanitized.replace(rule.pattern, rule.replacement);
    }
    
    return sanitized;
  }

  sanitizeObject(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.sanitize(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        // Skip sanitization for certain keys that should remain readable
        if (this.shouldSkipSanitization(key)) {
          sanitized[key] = value;
        } else {
          sanitized[key] = this.sanitizeObject(value);
        }
      }
      return sanitized;
    }

    return obj;
  }

  private shouldSkipSanitization(key: string): boolean {
    const skipKeys = [
      'timestamp',
      'level',
      'message',
      'method',
      'url',
      'status',
      'duration',
      'userAgent',
      'contentType'
    ];
    
    return skipKeys.includes(key.toLowerCase());
  }

  getRules(): SanitizationRule[] {
    return this.rules.map(rule => ({
      pattern: rule.pattern,
      replacement: rule.replacement,
      description: rule.description
    }));
  }
}

// Global sanitizer instance
const logSanitizer = new LogSanitizer();

// Middleware wrapper for request/response logging
export function withLogSanitization(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();
    
    // Log request (sanitized)
    const requestLog = {
      method: request.method,
      url: request.url,
      headers: logSanitizer.sanitizeObject(Object.fromEntries(request.headers.entries())),
      timestamp: new Date().toISOString()
    };
    
    console.log('Request:', logSanitizer.sanitize(JSON.stringify(requestLog)));
    
    try {
      const response = await handler(request);
      
      // Log response (sanitized)
      const responseLog = {
        status: response.status,
        headers: logSanitizer.sanitizeObject(Object.fromEntries(response.headers.entries())),
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
      
      console.log('Response:', logSanitizer.sanitize(JSON.stringify(responseLog)));
      
      return response;
    } catch (error) {
      // Log error (sanitized)
      const errorLog = {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
      
      console.error('Error:', logSanitizer.sanitize(JSON.stringify(errorLog)));
      throw error;
    }
  };
}

// Utility functions
export const sanitizeLog = (text: string): string => logSanitizer.sanitize(text);
export const sanitizeLogObject = (obj: any): any => logSanitizer.sanitizeObject(obj);
export const getSanitizationRules = () => logSanitizer.getRules();

// Custom logger with built-in sanitization
export class SanitizedLogger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  info(message: string, data?: any) {
    const logData = {
      level: 'info',
      context: this.context,
      message: logSanitizer.sanitize(message),
      data: data ? logSanitizer.sanitizeObject(data) : undefined,
      timestamp: new Date().toISOString()
    };
    
    console.log(JSON.stringify(logData));
  }

  error(message: string, error?: any) {
    const logData = {
      level: 'error',
      context: this.context,
      message: logSanitizer.sanitize(message),
      error: error ? logSanitizer.sanitizeObject(error) : undefined,
      timestamp: new Date().toISOString()
    };
    
    console.error(JSON.stringify(logData));
  }

  warn(message: string, data?: any) {
    const logData = {
      level: 'warn',
      context: this.context,
      message: logSanitizer.sanitize(message),
      data: data ? logSanitizer.sanitizeObject(data) : undefined,
      timestamp: new Date().toISOString()
    };
    
    console.warn(JSON.stringify(logData));
  }

  debug(message: string, data?: any) {
    if (process.env.NODE_ENV === 'development') {
      const logData = {
        level: 'debug',
        context: this.context,
        message: logSanitizer.sanitize(message),
        data: data ? logSanitizer.sanitizeObject(data) : undefined,
        timestamp: new Date().toISOString()
      };
      
      console.debug(JSON.stringify(logData));
    }
  }
}
