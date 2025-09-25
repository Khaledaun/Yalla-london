/**
 * Test setup for Vitest
 */

import { beforeAll, afterAll } from 'vitest';

// Mock NextAuth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

// Mock Prisma client
jest.mock('@/lib/database', () => ({
  getPrismaClient: jest.fn(() => ({
    blogPost: {
      create: jest.fn(),
      findUnique: jest.fn(),
      deleteMany: jest.fn(),
    },
    mediaAsset: {
      create: jest.fn(),
      findFirst: jest.fn(),
      deleteMany: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $disconnect: jest.fn(),
  })),
  checkDatabaseHealth: jest.fn(() => Promise.resolve({
    connected: true,
    migrateStatus: 'Valid',
  })),
}));

beforeAll(async () => {
  // Setup test environment
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
  process.env.DIRECT_URL = 'postgresql://test:test@localhost:5432/test';
  process.env.NEXTAUTH_SECRET = 'test-secret';
  process.env.NEXTAUTH_URL = 'http://localhost:3000';
});

afterAll(async () => {
  // Cleanup
});
