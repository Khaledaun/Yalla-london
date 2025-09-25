/**
 * Authentication smoke tests
 */

import { describe, it, expect } from 'vitest';
import { createMocks } from 'node-mocks-http';
import { POST as savePOST } from '@/app/api/admin/editor/save/route';
import { POST as uploadPOST } from '@/app/api/admin/media/upload/route';

describe('Authentication Guards', () => {
  it('anonymous POST to admin save should return 401', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      url: '/api/admin/editor/save',
      body: {
        title: 'Test Article',
        content: 'Test content'
      }
    });

    const response = await savePOST(req as any);
    
    expect(response.status).toBe(401);
  });

  it('anonymous POST to media upload should return 401', async () => {
    const formData = new FormData();
    formData.append('file', new Blob(['test'], { type: 'image/png' }), 'test.png');
    formData.append('type', 'logo');

    const { req, res } = createMocks({
      method: 'POST',
      url: '/api/admin/media/upload',
      body: formData
    });

    const response = await uploadPOST(req as any);
    
    expect(response.status).toBe(401);
  });

  it('authenticated admin POST to save should work', async () => {
    // Mock admin session
    const mockSession = {
      user: {
        email: 'admin@test.com',
        name: 'Test Admin'
      }
    };

    // Mock getServerSession to return admin session
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
    
    // Should not be 401 (authentication error)
    expect(response.status).not.toBe(401);
    
    // Restore original function
    require('next-auth').getServerSession.mockRestore();
  });
});
