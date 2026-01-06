/**
 * Prisma Client Export
 *
 * Uses the real generated Prisma client for production builds.
 * The client is generated during the build process.
 */

import { PrismaClient } from '@prisma/client';

// Declare global type for PrismaClient to prevent multiple instances
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Create a singleton instance of PrismaClient
// In production, this ensures we reuse the same client
// In development, we store it on globalThis to survive hot reloads
export const prisma = globalThis.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Store on globalThis in development to prevent multiple instances
if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

// Named exports for compatibility
export { prisma as db };
export default prisma;
