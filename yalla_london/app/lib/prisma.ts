/**
 * Prisma Client Export
 * Provides the database client with mock fallback for development/testing
 */

import { mockPrismaClient } from './prisma-stub';

// Extended mock with Command Center models
const extendedMock = {
  ...mockPrismaClient,

  // ModelProvider for AI keys
  modelProvider: {
    findFirst: async () => null,
    findMany: async () => [],
    create: async (params: any) => ({ id: 'mp-1', ...params.data }),
    update: async (params: any) => params.data,
    upsert: async (params: any) => params.create,
    count: async () => 0,
  },

  // ApiSettings for legacy keys
  apiSettings: {
    findUnique: async () => null,
    findMany: async () => [],
    create: async (params: any) => ({ id: 'api-1', ...params.data }),
    update: async (params: any) => params.data,
    upsert: async (params: any) => params.create,
  },

  // Background jobs for autopilot
  backgroundJob: {
    findMany: async () => [],
    findFirst: async () => null,
    create: async (params: any) => ({ id: 'job-1', status: 'pending', ...params.data }),
    update: async (params: any) => params.data,
    count: async () => 0,
    delete: async () => ({}),
  },

  // Scheduled content
  scheduledContent: {
    findMany: async () => [],
    findFirst: async () => null,
    create: async (params: any) => ({ id: 'sc-1', status: 'pending', ...params.data }),
    update: async (params: any) => params.data,
    count: async () => 0,
    delete: async () => ({}),
  },

  // Leads for CRM
  lead: {
    findMany: async () => [],
    findFirst: async () => null,
    create: async (params: any) => ({ id: 'lead-1', status: 'NEW', ...params.data }),
    update: async (params: any) => params.data,
    count: async () => 0,
    delete: async () => ({}),
    groupBy: async () => [],
  },

  // Analytics snapshots
  analyticsSnapshot: {
    findMany: async () => [],
    findFirst: async () => ({ id: 'snap-1', created_at: new Date() }),
    create: async (params: any) => ({ id: 'snap-1', ...params.data, created_at: new Date() }),
    count: async () => 0,
  },

  // Sites for multi-tenant
  site: {
    findMany: async () => [{
      id: 'site-1',
      name: 'Demo Site',
      slug: 'demo',
      domain: 'demo.yallalondon.com',
      is_active: true,
      default_locale: 'en',
      created_at: new Date(),
      domains: [{ hostname: 'demo.yallalondon.com', is_primary: true }],
    }],
    findFirst: async () => ({
      id: 'site-1',
      name: 'Demo Site',
      slug: 'demo',
      domain: 'demo.yallalondon.com',
      is_active: true,
      default_locale: 'en',
      domains: [{ hostname: 'demo.yallalondon.com', is_primary: true }],
    }),
    findUnique: async () => ({
      id: 'site-1',
      name: 'Demo Site',
      slug: 'demo',
      domain: 'demo.yallalondon.com',
      domains: [],
    }),
    create: async (params: any) => ({ id: 'site-new', ...params.data }),
    update: async (params: any) => params.data,
    count: async () => 1,
  },

  // Autopilot tasks
  autopilotTask: {
    findMany: async () => [],
    findFirst: async () => null,
    create: async (params: any) => ({ id: 'task-1', isActive: true, ...params.data }),
    update: async (params: any) => params.data,
    count: async () => 0,
    delete: async () => ({}),
  },

  // Social accounts
  socialAccount: {
    findMany: async () => [],
    findFirst: async () => null,
    create: async (params: any) => ({ id: 'social-1', ...params.data }),
    update: async (params: any) => params.data,
    delete: async () => ({}),
  },

  // Social posts
  socialPost: {
    findMany: async () => [],
    findFirst: async () => null,
    create: async (params: any) => ({ id: 'post-1', status: 'scheduled', ...params.data }),
    update: async (params: any) => params.data,
    count: async () => 0,
    delete: async () => ({}),
  },

  // PDF guides
  pdfGuide: {
    findMany: async () => [],
    findFirst: async () => null,
    findUnique: async () => null,
    create: async (params: any) => ({ id: 'pdf-1', ...params.data }),
    update: async (params: any) => params.data,
    count: async () => 0,
  },

  // Affiliate partners (legacy)
  affiliatePartner: {
    findMany: async () => [],
    findFirst: async () => null,
    findUnique: async () => null,
    create: async (params: any) => ({ id: 'aff-1', ...params.data }),
    update: async (params: any) => params.data,
    count: async () => 0,
  },

  // Tracking partners (renamed from duplicate AffiliatePartner)
  trackingPartner: {
    findMany: async (params?: any) => [],
    findFirst: async (params?: any) => null,
    findUnique: async (params?: any) => null,
    create: async (params: any) => ({ id: 'tp-1', ...params.data }),
    update: async (params: any) => params.data,
    count: async (params?: any) => 0,
  },

  // Affiliate clicks
  affiliateClick: {
    findMany: async () => [],
    create: async (params: any) => ({ id: 'click-1', ...params.data }),
    count: async () => 0,
    aggregate: async () => ({ _sum: { revenue: 0 } }),
  },

  // Email campaigns
  emailCampaign: {
    findMany: async () => [],
    findFirst: async () => null,
    create: async (params: any) => ({ id: 'camp-1', ...params.data }),
    update: async (params: any) => params.data,
    count: async () => 0,
  },

  // Audit logs
  auditLog: {
    findMany: async () => [],
    create: async (params: any) => ({ id: 'audit-1', ...params.data }),
    count: async () => 0,
  },

  // Content schedule rules for autopilot
  contentScheduleRule: {
    findMany: async () => [],
    findFirst: async () => null,
    findUnique: async () => null,
    create: async (params: any) => ({ id: 'rule-1', is_active: true, ...params.data }),
    update: async (params: any) => params.data,
    delete: async () => ({}),
    count: async () => 0,
  },

  // Page views for analytics
  pageView: {
    findMany: async () => [],
    create: async (params: any) => ({ id: 'pv-1', ...params.data }),
    groupBy: async () => [],
    count: async () => 0,
  },

  // Domains for sites
  domain: {
    findMany: async () => [],
    findFirst: async () => null,
    create: async (params: any) => ({ id: 'domain-1', ...params.data }),
    update: async (params: any) => params.data,
  },

  // Conversions for revenue tracking
  conversion: {
    findMany: async () => [],
    findFirst: async () => null,
    create: async (params: any) => ({ id: 'conv-1', status: 'PENDING', ...params.data }),
    update: async (params: any) => params.data,
    aggregate: async () => ({ _sum: { commission: 0 } }),
    count: async () => 0,
  },

  // Content/Article
  article: {
    findMany: async () => mockPrismaClient.blogPost.findMany(),
    findFirst: async () => mockPrismaClient.blogPost.findFirst?.(),
    findUnique: async (p: any) => mockPrismaClient.blogPost.findUnique(p),
    create: async (p: any) => mockPrismaClient.blogPost.create(p),
    update: async (p: any) => mockPrismaClient.blogPost.update(p),
    count: async () => mockPrismaClient.blogPost.count(),
    delete: async (p: any) => mockPrismaClient.blogPost.delete(p),
  },
};

// Re-export the extended mock client as prisma
export const prisma = extendedMock;

// Named exports for compatibility
export { prisma as db };
export default prisma;
