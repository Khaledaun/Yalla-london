/**
 * Test setup for Vitest
 */

import { vi, beforeAll, afterAll } from "vitest";

// Mock NextAuth
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

// Mock Prisma client
vi.mock("@/lib/database", () => ({
  getPrismaClient: vi.fn(() => ({
    blogPost: {
      create: vi.fn(),
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
    },
    mediaAsset: {
      create: vi.fn(),
      findFirst: vi.fn(),
      deleteMany: vi.fn(),
    },
    $queryRaw: vi.fn(),
    $disconnect: vi.fn(),
  })),
  checkDatabaseHealth: vi.fn(() =>
    Promise.resolve({
      connected: true,
      migrateStatus: "Valid",
    }),
  ),
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
