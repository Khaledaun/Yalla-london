/**
 * Media upload smoke tests
 *
 * NOTE: Admin routes use withAdminAuth which decodes JWT from cookies
 * via next-auth/jwt, NOT getServerSession.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as uploadPOST } from '@/app/api/admin/media/upload/route';
import { getPrismaClient } from '@/lib/database';

/** Helper: mock JWT decode to return an admin session */
async function mockAdminSession(email = 'admin@test.com') {
  process.env.ADMIN_EMAILS = email;
  const { decode } = await import('next-auth/jwt');
  vi.mocked(decode).mockResolvedValue({
    email,
    name: 'Test Admin',
    sub: 'admin-1',
    role: 'admin',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  });
}

/** Helper: create a NextRequest with FormData and cookie */
function makeUploadRequest(file: File, type: string = 'logo') {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', type);

  return new NextRequest(new URL('/api/admin/media/upload', 'http://localhost:3000'), {
    method: 'POST',
    headers: {
      'cookie': 'next-auth.session-token=test-token-value',
    },
    body: formData,
  });
}

describe('Media Upload', () => {
  let prisma: any;

  beforeEach(async () => {
    prisma = getPrismaClient();
    await prisma.mediaAsset.deleteMany({
      where: {
        originalName: {
          contains: 'test'
        }
      }
    });
  });

  afterEach(async () => {
    await prisma.mediaAsset.deleteMany({
      where: {
        originalName: {
          contains: 'test'
        }
      }
    });
    delete process.env.ADMIN_EMAILS;
    const { decode } = await import('next-auth/jwt');
    vi.mocked(decode).mockReset();
  });

  it('should reject unauthenticated upload with 401', async () => {
    const file = new File(['fake-image-data'], 'test-logo.png', { type: 'image/png' });
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'logo');

    const request = new NextRequest(new URL('/api/admin/media/upload', 'http://localhost:3000'), {
      method: 'POST',
      body: formData,
    });

    const response = await uploadPOST(request);
    expect(response.status).toBe(401);
  });

  it('should reject non-image files', async () => {
    await mockAdminSession();

    const textFile = new File(['fake-text-data'], 'test.txt', { type: 'text/plain' });
    const request = makeUploadRequest(textFile, 'logo');
    const response = await uploadPOST(request);

    expect(response.status).toBe(400);

    const responseData = await response.json();
    expect(responseData.error).toContain('Only image files are allowed');
  });

  it('should reject oversized files', async () => {
    await mockAdminSession();

    // Create oversized test file (6MB)
    const largeBuffer = new Uint8Array(6 * 1024 * 1024);
    const testFile = new File([largeBuffer], 'large-test.png', { type: 'image/png' });
    const request = makeUploadRequest(testFile, 'logo');
    const response = await uploadPOST(request);

    expect(response.status).toBe(400);

    const responseData = await response.json();
    expect(responseData.error).toContain('File size must be less than');
  });
});
