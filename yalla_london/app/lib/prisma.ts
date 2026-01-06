/**
 * Prisma Client Export
 * Provides the database client with mock fallback for development/testing
 */

import { mockPrismaClient } from './prisma-stub';

// Common mock methods that all models should have
const createMockModel = (idPrefix: string, defaultData: Record<string, any> = {}) => ({
  findMany: async (params?: any) => [],
  findFirst: async (params?: any) => null,
  findUnique: async (params?: any) => null,
  create: async (params: any) => ({ id: `${idPrefix}-1`, ...defaultData, ...params?.data }),
  createMany: async (params?: any) => ({ count: 0 }),
  update: async (params: any) => ({ id: `${idPrefix}-1`, ...defaultData, ...params?.data }),
  updateMany: async (params?: any) => ({ count: 0 }),
  upsert: async (params: any) => params?.create || params?.update || {},
  delete: async (params?: any) => ({}),
  deleteMany: async (params?: any) => ({ count: 0 }),
  count: async (params?: any) => 0,
  aggregate: async (params?: any) => ({ _sum: {}, _count: 0, _avg: {}, _min: {}, _max: {} }),
  groupBy: async (params?: any) => [],
});

// Extended mock with Command Center models
const extendedMock = {
  ...mockPrismaClient,

  // ModelProvider for AI keys
  modelProvider: createMockModel('mp'),

  // ApiSettings for legacy keys
  apiSettings: createMockModel('api'),

  // Background jobs for autopilot
  backgroundJob: createMockModel('job', { status: 'pending' }),

  // Scheduled content
  scheduledContent: createMockModel('sc', { status: 'pending' }),

  // Leads for CRM
  lead: createMockModel('lead', { status: 'NEW' }),

  // Analytics snapshots
  analyticsSnapshot: {
    ...createMockModel('snap'),
    findFirst: async (params?: any) => ({ id: 'snap-1', created_at: new Date() }),
  },

  // Sites for multi-tenant
  site: {
    ...createMockModel('site'),
    findMany: async (params?: any) => [{
      id: 'site-1',
      name: 'Demo Site',
      slug: 'demo',
      domain: 'demo.yallalondon.com',
      is_active: true,
      default_locale: 'en',
      created_at: new Date(),
      domains: [{ hostname: 'demo.yallalondon.com', is_primary: true }],
      brand_color: '#C5A572',
      secondary_color: '#1A1A2E',
      logo_url: null,
    }],
    findFirst: async (params?: any) => ({
      id: 'site-1',
      name: 'Demo Site',
      slug: 'demo',
      domain: 'demo.yallalondon.com',
      is_active: true,
      default_locale: 'en',
      domains: [{ hostname: 'demo.yallalondon.com', is_primary: true }],
      brand_color: '#C5A572',
      secondary_color: '#1A1A2E',
      logo_url: null,
    }),
    findUnique: async (params?: any) => ({
      id: 'site-1',
      name: 'Demo Site',
      slug: 'demo',
      domain: 'demo.yallalondon.com',
      domains: [],
      brand_color: '#C5A572',
      secondary_color: '#1A1A2E',
      logo_url: null,
    }),
    count: async (params?: any) => 1,
  },

  // Autopilot tasks
  autopilotTask: createMockModel('task', { isActive: true }),

  // Social accounts
  socialAccount: createMockModel('social'),

  // Social posts
  socialPost: createMockModel('post', { status: 'scheduled' }),

  // PDF guides
  pdfGuide: createMockModel('pdf'),

  // PDF downloads tracking
  pdfDownload: createMockModel('dl'),

  // Affiliate partners (legacy)
  affiliatePartner: createMockModel('aff'),

  // Tracking partners (renamed from duplicate AffiliatePartner)
  trackingPartner: createMockModel('tp'),

  // Affiliate clicks
  affiliateClick: {
    ...createMockModel('click'),
    aggregate: async (params?: any) => ({ _sum: { revenue: 0 }, _count: 0 }),
  },

  // Email campaigns
  emailCampaign: createMockModel('camp'),

  // Audit logs
  auditLog: createMockModel('audit'),

  // Content schedule rules for autopilot
  contentScheduleRule: createMockModel('rule', { is_active: true }),

  // Page views for analytics
  pageView: createMockModel('pv'),

  // Domains for sites
  domain: createMockModel('domain'),

  // Conversions for revenue tracking
  conversion: {
    ...createMockModel('conv', { status: 'PENDING' }),
    aggregate: async (params?: any) => ({ _sum: { commission: 0 }, _count: 0 }),
  },

  // Content/Article
  article: {
    findMany: async (params?: any) => mockPrismaClient.blogPost.findMany(params),
    findFirst: async (params?: any) => mockPrismaClient.blogPost.findFirst?.(params),
    findUnique: async (params?: any) => mockPrismaClient.blogPost.findUnique(params),
    create: async (params: any) => mockPrismaClient.blogPost.create(params),
    update: async (params: any) => mockPrismaClient.blogPost.update(params),
    delete: async (params?: any) => mockPrismaClient.blogPost.delete(params),
    deleteMany: async (params?: any) => ({ count: 0 }),
    count: async (params?: any) => mockPrismaClient.blogPost.count(params),
    aggregate: async (params?: any) => ({ _sum: {}, _count: 0 }),
    groupBy: async (params?: any) => [],
  },

  // Newsletter subscribers
  newsletterSubscriber: createMockModel('sub'),

  // Contact form submissions
  contactSubmission: createMockModel('contact'),

  // User sessions
  session: createMockModel('session'),

  // Notifications
  notification: createMockModel('notif'),

  // Comments
  comment: createMockModel('comment'),

  // Tags
  tag: createMockModel('tag'),

  // Categories (extend from base)
  category: {
    ...createMockModel('cat'),
    findMany: async (params?: any) => mockPrismaClient.category?.findMany?.(params) || [],
    findUnique: async (params?: any) => mockPrismaClient.category?.findUnique?.(params) || null,
  },

  // Media assets
  mediaAsset: {
    ...createMockModel('media'),
    findMany: async (params?: any) => mockPrismaClient.mediaAsset?.findMany?.(params) || [],
  },

  // Homepage blocks
  homepageBlock: {
    ...createMockModel('block'),
    findMany: async (params?: any) => mockPrismaClient.homepageBlock?.findMany?.(params) || [],
  },
};

// Re-export the extended mock client as prisma
export const prisma = extendedMock;

// Named exports for compatibility
export { prisma as db };
export default prisma;
