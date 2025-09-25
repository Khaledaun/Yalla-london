/**
 * SSL Security Tests
 * Ensures no rejectUnauthorized:false in codebase
 */

import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

describe('SSL Security Checks', () => {
  it('should not contain rejectUnauthorized:false in codebase', () => {
    const searchPattern = 'rejectUnauthorized\\s*:\\s*false';
    const excludePatterns = [
      'node_modules',
      '.git',
      'dist',
      'build',
      '.next',
      'coverage',
      'test-results',
      'playwright-report'
    ];

    const searchInDirectory = (dir: string): string[] => {
      const results: string[] = [];
      
      try {
        const items = readdirSync(dir);
        
        for (const item of items) {
          const fullPath = join(dir, item);
          const stat = statSync(fullPath);
          
          // Skip excluded directories
          if (stat.isDirectory() && !excludePatterns.some(pattern => item.includes(pattern))) {
            results.push(...searchInDirectory(fullPath));
          } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.js') || item.endsWith('.tsx') || item.endsWith('.jsx'))) {
            try {
              const content = readFileSync(fullPath, 'utf8');
              const regex = new RegExp(searchPattern, 'gi');
              const matches = content.match(regex);
              
              if (matches) {
                matches.forEach(() => {
                  results.push(`${fullPath}: Contains rejectUnauthorized:false`);
                });
              }
            } catch (error) {
              // Skip files that can't be read
            }
          }
        }
      } catch (error) {
        // Skip directories that can't be read
      }
      
      return results;
    };

    const violations = searchInDirectory(process.cwd());
    
    if (violations.length > 0) {
      console.error('SSL Security Violations Found:');
      violations.forEach(violation => console.error(`  - ${violation}`));
    }
    
    expect(violations.length).toBe(0);
  });

  it('should use sslmode=require in database URLs', () => {
    const databaseUrl = process.env.DATABASE_URL;
    const directUrl = process.env.DIRECT_URL;
    
    if (process.env.NODE_ENV === 'production') {
      if (databaseUrl) {
        expect(databaseUrl).toContain('sslmode=require');
      }
      if (directUrl) {
        expect(directUrl).toContain('sslmode=require');
      }
    }
  });

  it('should not use insecure SSL configurations', () => {
    const insecurePatterns = [
      'rejectUnauthorized: false',
      'rejectUnauthorized:false',
      'rejectUnauthorized:false,',
      'ssl: { rejectUnauthorized: false }',
      'ssl: { rejectUnauthorized: false,',
      'ssl: false',
      'ssl: false,'
    ];

    const searchInDirectory = (dir: string): string[] => {
      const results: string[] = [];
      
      try {
        const items = readdirSync(dir);
        
        for (const item of items) {
          const fullPath = join(dir, item);
          const stat = statSync(fullPath);
          
          if (stat.isDirectory() && !item.includes('node_modules') && !item.includes('.git')) {
            results.push(...searchInDirectory(fullPath));
          } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.js'))) {
            try {
              const content = readFileSync(fullPath, 'utf8');
              
              insecurePatterns.forEach(pattern => {
                if (content.includes(pattern)) {
                  results.push(`${fullPath}: Contains insecure SSL pattern "${pattern}"`);
                }
              });
            } catch (error) {
              // Skip files that can't be read
            }
          }
        }
      } catch (error) {
        // Skip directories that can't be read
      }
      
      return results;
    };

    const violations = searchInDirectory(process.cwd());
    
    if (violations.length > 0) {
      console.error('Insecure SSL Configurations Found:');
      violations.forEach(violation => console.error(`  - ${violation}`));
    }
    
    expect(violations.length).toBe(0);
  });

  it('should validate environment variable security', () => {
    // Check that sensitive environment variables are not exposed
    const sensitiveVars = [
      'DATABASE_URL',
      'DIRECT_URL',
      'NEXTAUTH_SECRET',
      'SUPABASE_SERVICE_ROLE_KEY'
    ];

    sensitiveVars.forEach(varName => {
      const value = process.env[varName];
      if (value) {
        // Should not contain obvious test values in production
        if (process.env.NODE_ENV === 'production') {
          expect(value).not.toContain('test');
          expect(value).not.toContain('localhost');
          expect(value).not.toContain('127.0.0.1');
        }
      }
    });
  });

  it('should check for hardcoded secrets in code', () => {
    const secretPatterns = [
      'password\\s*=\\s*["\'][^"\']+["\']',
      'secret\\s*=\\s*["\'][^"\']+["\']',
      'key\\s*=\\s*["\'][^"\']+["\']',
      'token\\s*=\\s*["\'][^"\']+["\']'
    ];

    const searchInDirectory = (dir: string): string[] => {
      const results: string[] = [];
      
      try {
        const items = readdirSync(dir);
        
        for (const item of items) {
          const fullPath = join(dir, item);
          const stat = statSync(fullPath);
          
          if (stat.isDirectory() && !item.includes('node_modules') && !item.includes('.git')) {
            results.push(...searchInDirectory(fullPath));
          } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.js'))) {
            try {
              const content = readFileSync(fullPath, 'utf8');
              
              secretPatterns.forEach(pattern => {
                const regex = new RegExp(pattern, 'gi');
                const matches = content.match(regex);
                
                if (matches) {
                  matches.forEach(match => {
                    // Skip obvious test values
                    if (!match.toLowerCase().includes('test') && 
                        !match.toLowerCase().includes('example') &&
                        !match.toLowerCase().includes('dummy')) {
                      results.push(`${fullPath}: Potential hardcoded secret "${match}"`);
                    }
                  });
                }
              });
            } catch (error) {
              // Skip files that can't be read
            }
          }
        }
      } catch (error) {
        // Skip directories that can't be read
      }
      
      return results;
    };

    const violations = searchInDirectory(process.cwd());
    
    if (violations.length > 0) {
      console.error('Potential Hardcoded Secrets Found:');
      violations.forEach(violation => console.error(`  - ${violation}`));
    }
    
    // Allow some violations for test files
    const nonTestViolations = violations.filter(v => !v.includes('.spec.') && !v.includes('.test.'));
    expect(nonTestViolations.length).toBe(0);
  });
});
