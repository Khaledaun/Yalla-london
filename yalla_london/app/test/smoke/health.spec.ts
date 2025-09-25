/**
 * Health endpoint smoke tests
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createMocks } from 'node-mocks-http';
import { GET as healthGET } from '@/app/api/health/route';
import { GET as statusGET } from '@/app/api/phase4/status/route';

describe('Health Endpoints', () => {
  it('GET /api/health should return 200', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      url: '/api/health',
    });

    const response = await healthGET(req as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('status', 'ok');
  });

  it('GET /api/phase4/status (unauthenticated) should return 401', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      url: '/api/phase4/status',
    });

    const response = await statusGET(req as any);
    
    expect(response.status).toBe(401);
  });

  it('GET /api/phase4/status (admin session) should return 200 with flags', async () => {
    // Mock admin session
    const mockSession = {
      user: {
        email: 'admin@test.com',
        name: 'Test Admin'
      }
    };

    // Mock getServerSession to return admin session
    const originalGetServerSession = require('next-auth').getServerSession;
    jest.spyOn(require('next-auth'), 'getServerSession').mockResolvedValue(mockSession);

    const { req, res } = createMocks({
      method: 'GET',
      url: '/api/phase4/status',
    });

    const response = await statusGET(req as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('db');
    expect(data).toHaveProperty('featureFlags');
    expect(data).toHaveProperty('version');
    expect(data).toHaveProperty('storage');
    
    // All feature flags should be OFF by default
    expect(data.featureFlags.FEATURE_AI_SEO_AUDIT).toBe(0);
    expect(data.featureFlags.FEATURE_CONTENT_PIPELINE).toBe(0);
    expect(data.featureFlags.FEATURE_WP_CONNECTOR).toBe(0);
    expect(data.featureFlags.FEATURE_WHITE_LABEL).toBe(0);
    expect(data.featureFlags.FEATURE_BACKLINK_OFFERS).toBe(0);

    // Restore original function
    require('next-auth').getServerSession.mockRestore();
  });
});
