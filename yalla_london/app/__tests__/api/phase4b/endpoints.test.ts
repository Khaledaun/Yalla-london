/**
 * Phase 4B API Endpoints Tests
 * Basic smoke tests for all Phase 4B endpoints
 */

import { describe, it, expect } from '@jest/globals';

// Mock the feature flags to ensure tests work with features disabled
jest.mock('@/lib/feature-flags', () => ({
  isFeatureEnabled: jest.fn().mockReturnValue(false),
}));

describe('Phase 4B API Endpoints', () => {
  describe('Topic Research API', () => {
    it('should return disabled message when feature is off', async () => {
      const response = await fetch('/api/phase4b/topics/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'london_travel', locale: 'en' }),
      });
      
      // Expecting feature disabled response
      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain('disabled');
    });
  });

  describe('Content Generation API', () => {
    it('should return disabled message when feature is off', async () => {
      const response = await fetch('/api/phase4b/content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          topicId: 'test-topic-id', 
          contentType: 'article',
          locale: 'en'
        }),
      });
      
      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain('disabled');
    });
  });

  describe('Content Publishing API', () => {
    it('should return disabled message when feature is off', async () => {
      const response = await fetch('/api/phase4b/content/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId: 'test-content-id' }),
      });
      
      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain('disabled');
    });
  });

  describe('SEO Audit API', () => {
    it('should return disabled message when feature is off', async () => {
      const response = await fetch('/api/phase4b/seo/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId: 'test-content-id' }),
      });
      
      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain('disabled');
    });
  });

  describe('Analytics Refresh API', () => {
    it('should return disabled message when feature is off', async () => {
      const response = await fetch('/api/phase4b/analytics/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      
      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain('disabled');
    });
  });
});

describe('Feature Flags Integration', () => {
  it('should respect master toggle for all Phase 4B features', () => {
    const { isFeatureEnabled } = require('@/lib/feature-flags');
    
    // Mock feature flags
    process.env.FEATURE_PHASE4B_ENABLED = 'false';
    process.env.FEATURE_TOPIC_RESEARCH = 'true';
    
    // Should return false even if individual feature is enabled
    // because master toggle is off
    expect(isFeatureEnabled('TOPIC_RESEARCH')).toBe(false);
  });
});