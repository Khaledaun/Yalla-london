/**
 * Test setup for Vitest
 */

import { vi, beforeAll, afterAll } from "vitest";

// Create shared mock Prisma client for consistent behavior
const mockPrismaClient = {
  blogPost: {
    create: vi.fn().mockResolvedValue({
      id: 'test-post-id',
      title: 'Test Article',
      title_en: 'Test Article',
      title_ar: 'Test Article',
      slug: 'test-article',
      content: 'Test content',
      content_en: 'Test content',
      content_ar: 'Test content',
      siteId: 'yalla-london',
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
    deleteMany: vi.fn(),
    updateMany: vi.fn(),
  },
  mediaAsset: {
    create: vi.fn().mockResolvedValue({
      id: 'test-asset-id',
      filename: 'test-file.png',
      originalName: 'test-file.png',
      fileType: 'logo',
      mimeType: 'image/png',
      assetType: 'image',
      siteId: 'yalla-london',
      createdAt: new Date(),
    }),
    findFirst: vi.fn(),
    findMany: vi.fn().mockResolvedValue([]),
    deleteMany: vi.fn(),
  },
  user: {
    findFirst: vi.fn().mockResolvedValue({ id: 'system-user-id', role: 'admin', isActive: true }),
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  category: {
    findFirst: vi.fn().mockResolvedValue({ id: 'default-category-id', name: 'General' }),
    create: vi.fn(),
  },
  featureFlag: {
    findMany: vi.fn().mockResolvedValue([]),
  },
  $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
  $disconnect: vi.fn(),
};

// Mock NextAuth
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

// Mock next-auth/jwt for cookie-based admin auth (used by withAdminAuth)
vi.mock("next-auth/jwt", () => ({
  decode: vi.fn(),
}));

// Mock @/lib/database (legacy import path)
vi.mock("@/lib/database", () => ({
  getPrismaClient: vi.fn(() => mockPrismaClient),
  checkDatabaseHealth: vi.fn(() =>
    Promise.resolve({
      connected: true,
      migrateStatus: "Valid",
    }),
  ),
}));

// Mock @/lib/db (canonical import path used by most routes)
vi.mock("@/lib/db", () => ({
  prisma: mockPrismaClient,
  db: mockPrismaClient,
  getPrismaClient: vi.fn(() => mockPrismaClient),
  checkDatabaseHealth: vi.fn(() =>
    Promise.resolve({
      connected: true,
      migrateStatus: "Valid",
    }),
  ),
  getTenantPrisma: vi.fn(() => mockPrismaClient),
  getTenantPrismaFromContext: vi.fn(() => mockPrismaClient),
  withTenantDb: vi.fn(),
  tenantTransaction: vi.fn(),
  disconnectDatabase: vi.fn(),
  // Assertion helpers (no-ops for testing)
  TenantMismatchError: class extends Error {},
  assertTenantOwnership: vi.fn(),
  assertExists: vi.fn((val: any) => val),
  assertPermission: vi.fn(),
  assertOneOf: vi.fn(),
  assertFutureDate: vi.fn(),
  assertValidSlug: vi.fn(),
  assertValidEmail: vi.fn(),
  assertNotEmpty: vi.fn(),
  assertInRange: vi.fn(),
  ResourceNotFoundError: class extends Error {},
  UnauthorizedError: class extends Error {},
  ValidationError: class extends Error {},
  DuplicateError: class extends Error {},
  InvalidStateError: class extends Error {},
  safeJsonParse: vi.fn((str: string) => JSON.parse(str)),
  mapDatabaseError: vi.fn(),
  isApiError: vi.fn(() => false),
}));

// Mock @/lib/prisma (underlying singleton)
vi.mock("@/lib/prisma", () => ({
  prisma: mockPrismaClient,
}));

beforeAll(async () => {
  // Setup test environment
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
  process.env.DIRECT_URL = "postgresql://test:test@localhost:5432/test";
  process.env.NEXTAUTH_SECRET = "test-secret";
  process.env.NEXTAUTH_URL = "http://localhost:3000";
});

afterAll(async () => {
  // Cleanup
});
