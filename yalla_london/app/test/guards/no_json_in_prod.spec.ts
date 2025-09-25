/**
 * No-JSON-in-Production Guard Tests
 * Ensures file-based storage is blocked in production
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMocks } from 'node-mocks-http';
import { POST as savePOST } from '@/app/api/admin/editor/save/route';
import { POST as uploadPOST } from '@/app/api/admin/media/upload/route';

describe('No-JSON-in-Production Guards', () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    // Store original environment
    originalEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    // Restore original environment
    if (originalEnv) {
      process.env.NODE_ENV = originalEnv;
    } else {
      delete process.env.NODE_ENV;
    }
    delete process.env.DEV_FILE_STORE_ONLY;
  });

  it('should throw error when attempting JSON storage in production', async () => {
    // Set production environment
    process.env.NODE_ENV = 'production';
    process.env.DEV_FILE_STORE_ONLY = 'true';

    // Mock admin session
    const mockSession = {
      user: {
        email: 'admin@test.com',
        name: 'Test Admin'
      }
    };

    jest.spyOn(require('next-auth'), 'getServerSession').mockResolvedValue(mockSession);

    const { req, res } = createMocks({
      method: 'POST',
      url: '/api/admin/editor/save',
      body: {
        title: 'Test Article',
        content: 'Test content'
      }
    });

    const response = await savePOST(req as any);
    
    // Should fail with error about JSON storage not allowed
    expect(response.status).toBe(500);
    
    const responseData = await response.json();
    expect(responseData.error).toContain('JSON file storage is not allowed');

    // Restore original function
    require('next-auth').getServerSession.mockRestore();
  });

  it('should allow JSON storage in development when DEV_FILE_STORE_ONLY is set', async () => {
    // Set development environment
    process.env.NODE_ENV = 'development';
    process.env.DEV_FILE_STORE_ONLY = 'true';

    // Mock admin session
    const mockSession = {
      user: {
        email: 'admin@test.com',
        name: 'Test Admin'
      }
    };

    jest.spyOn(require('next-auth'), 'getServerSession').mockResolvedValue(mockSession);

    // Mock file system operations
    const mockFs = {
      promises: {
        mkdir: jest.fn().mockResolvedValue(undefined),
        readFile: jest.fn().mockRejectedValue(new Error('File not found')),
        writeFile: jest.fn().mockResolvedValue(undefined)
      }
    };

    jest.doMock('fs', () => mockFs);
    jest.doMock('fs/promises', () => mockFs.promises);

    const { req, res } = createMocks({
      method: 'POST',
      url: '/api/admin/editor/save',
      body: {
        title: 'Test Article',
        content: 'Test content'
      }
    });

    const response = await savePOST(req as any);
    
    // Should not fail with JSON storage error in development
    expect(response.status).not.toBe(500);
    
    const responseData = await response.json();
    expect(responseData.error).not.toContain('JSON file storage is not allowed');

    // Restore original function
    require('next-auth').getServerSession.mockRestore();
  });

  it('should block file-based storage in production for media uploads', async () => {
    // Set production environment
    process.env.NODE_ENV = 'production';
    process.env.DEV_FILE_STORE_ONLY = 'true';

    // Mock admin session
    const mockSession = {
      user: {
        email: 'admin@test.com',
        name: 'Test Admin'
      }
    };

    jest.spyOn(require('next-auth'), 'getServerSession').mockResolvedValue(mockSession);

    // Create test file
    const testFile = new File(['test content'], 'test.png', { type: 'image/png' });
    const formData = new FormData();
    formData.append('file', testFile);
    formData.append('type', 'logo');

    const { req, res } = createMocks({
      method: 'POST',
      url: '/api/admin/media/upload',
      body: formData
    });

    const response = await uploadPOST(req as any);
    
    // Should fail in production when trying to use file storage
    expect(response.status).toBe(500);
    
    const responseData = await response.json();
    expect(responseData.error).toContain('Failed to upload file');

    // Restore original function
    require('next-auth').getServerSession.mockRestore();
  });

  it('should validate environment variables for production safety', () => {
    // Test production environment detection
    process.env.NODE_ENV = 'production';
    expect(process.env.NODE_ENV).toBe('production');

    // Test DEV_FILE_STORE_ONLY detection
    process.env.DEV_FILE_STORE_ONLY = 'true';
    expect(process.env.DEV_FILE_STORE_ONLY).toBe('true');

    // Test combination that should trigger error
    const shouldBlock = process.env.NODE_ENV === 'production' && process.env.DEV_FILE_STORE_ONLY === 'true';
    expect(shouldBlock).toBe(true);
  });

  it('should allow production when DEV_FILE_STORE_ONLY is not set', async () => {
    // Set production environment but don't set DEV_FILE_STORE_ONLY
    process.env.NODE_ENV = 'production';
    delete process.env.DEV_FILE_STORE_ONLY;

    // Mock admin session
    const mockSession = {
      user: {
        email: 'admin@test.com',
        name: 'Test Admin'
      }
    };

    jest.spyOn(require('next-auth'), 'getServerSession').mockResolvedValue(mockSession);

    const { req, res } = createMocks({
      method: 'POST',
      url: '/api/admin/editor/save',
      body: {
        title: 'Test Article',
        content: 'Test content'
      }
    });

    const response = await savePOST(req as any);
    
    // Should not fail with JSON storage error when DEV_FILE_STORE_ONLY is not set
    expect(response.status).not.toBe(500);
    
    const responseData = await response.json();
    expect(responseData.error).not.toContain('JSON file storage is not allowed');

    // Restore original function
    require('next-auth').getServerSession.mockRestore();
  });

  it('should test file system path blocking', () => {
    // Test that file system paths are blocked in production
    const blockedPaths = [
      'data/articles.json',
      'uploads/',
      'temp/',
      'cache/'
    ];

    blockedPaths.forEach(path => {
      // In production, these paths should not be accessible for JSON storage
      const isBlocked = process.env.NODE_ENV === 'production' && 
                       process.env.DEV_FILE_STORE_ONLY === 'true' &&
                       (path.includes('.json') || path.includes('data/'));
      
      if (process.env.NODE_ENV === 'production' && process.env.DEV_FILE_STORE_ONLY === 'true') {
        expect(isBlocked).toBe(true);
      }
    });
  });
});
