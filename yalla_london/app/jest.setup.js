// Jest setup for Next.js and security testing
import '@testing-library/jest-dom';

// Mock global Request and Response for Next.js server components
global.Request = global.Request || class Request {};
global.Response = global.Response || class Response {};

// Mock NextAuth for testing
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

// Mock Prisma client
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  })),
}));

// Mock environment variables for testing
process.env.NEXTAUTH_SECRET = 'test-secret-for-jwt-signing-minimum-32-chars';
process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.ADMIN_EMAILS = 'admin@test.com,admin2@test.com';

// Suppress console logs during testing unless in verbose mode
if (!process.env.JEST_VERBOSE) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  };
}