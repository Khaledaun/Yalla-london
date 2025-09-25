/**
 * Media upload smoke tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMocks } from 'node-mocks-http';
import { POST as uploadPOST } from '@/app/api/admin/media/upload/route';
import { getPrismaClient } from '@/lib/database';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

describe('Media Upload', () => {
  let prisma: any;

  beforeEach(async () => {
    prisma = getPrismaClient();
    // Clean up any existing test media assets
    await prisma.mediaAsset.deleteMany({
      where: {
        originalName: {
          contains: 'test'
        }
      }
    });
  });

  afterEach(async () => {
    // Clean up test media assets
    await prisma.mediaAsset.deleteMany({
      where: {
        originalName: {
          contains: 'test'
        }
      }
    });
  });

  it('should upload logo and persist to database', async () => {
    // Mock admin session
    const mockSession = {
      user: {
        email: 'admin@test.com',
        name: 'Test Admin'
      }
    };

    jest.spyOn(require('next-auth'), 'getServerSession').mockResolvedValue(mockSession);

    // Create test file
    const testImageBuffer = Buffer.from('fake-image-data');
    const testFile = new File([testImageBuffer], 'test-logo.png', { type: 'image/png' });

    const formData = new FormData();
    formData.append('file', testFile);
    formData.append('type', 'logo');

    const { req, res } = createMocks({
      method: 'POST',
      url: '/api/admin/media/upload',
      body: formData
    });

    const response = await uploadPOST(req as any);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.success).toBe(true);
    expect(responseData.data).toHaveProperty('filename');
    expect(responseData.data.originalName).toBe('test-logo.png');

    // Verify media asset exists in database
    const savedAsset = await prisma.mediaAsset.findFirst({
      where: {
        originalName: 'test-logo.png'
      }
    });

    expect(savedAsset).toBeTruthy();
    expect(savedAsset.fileType).toBe('logo');
    expect(savedAsset.mimeType).toBe('image/png');
    expect(savedAsset.assetType).toBe('image');

    // Restore original function
    require('next-auth').getServerSession.mockRestore();
  });

  it('should reject non-image files', async () => {
    // Mock admin session
    const mockSession = {
      user: {
        email: 'admin@test.com',
        name: 'Test Admin'
      }
    };

    jest.spyOn(require('next-auth'), 'getServerSession').mockResolvedValue(mockSession);

    // Create test non-image file
    const testFile = new File(['fake-text-data'], 'test.txt', { type: 'text/plain' });

    const formData = new FormData();
    formData.append('file', testFile);
    formData.append('type', 'logo');

    const { req, res } = createMocks({
      method: 'POST',
      url: '/api/admin/media/upload',
      body: formData
    });

    const response = await uploadPOST(req as any);
    
    expect(response.status).toBe(400);
    
    const responseData = await response.json();
    expect(responseData.error).toContain('Only image files are allowed');

    // Restore original function
    require('next-auth').getServerSession.mockRestore();
  });

  it('should reject oversized files', async () => {
    // Mock admin session
    const mockSession = {
      user: {
        email: 'admin@test.com',
        name: 'Test Admin'
      }
    };

    jest.spyOn(require('next-auth'), 'getServerSession').mockResolvedValue(mockSession);

    // Create oversized test file (6MB)
    const largeBuffer = Buffer.alloc(6 * 1024 * 1024);
    const testFile = new File([largeBuffer], 'large-test.png', { type: 'image/png' });

    const formData = new FormData();
    formData.append('file', testFile);
    formData.append('type', 'logo');

    const { req, res } = createMocks({
      method: 'POST',
      url: '/api/admin/media/upload',
      body: formData
    });

    const response = await uploadPOST(req as any);
    
    expect(response.status).toBe(400);
    
    const responseData = await response.json();
    expect(responseData.error).toContain('File size must be less than');

    // Restore original function
    require('next-auth').getServerSession.mockRestore();
  });
});
