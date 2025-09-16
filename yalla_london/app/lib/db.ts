
import { mockPrismaClient } from './prisma-stub';

declare global {
  // eslint-disable-next-line no-var
  var prisma: any
}

// Try to import the real Prisma client, fall back to mock if not available
let PrismaClient: any;
let prismaInstance: any;

try {
  // Try to import the real PrismaClient
  const prismaModule = require('@prisma/client');
  PrismaClient = prismaModule.PrismaClient;
  
  // Check if we have a valid database URL
  if (process.env.DATABASE_URL && process.env.DATABASE_URL !== 'postgresql://demo:demo@localhost:5432/demo') {
    prismaInstance = globalThis.prisma ?? new PrismaClient({
      log: ['query'],
    });
    
    if (process.env.NODE_ENV !== 'production') {
      globalThis.prisma = prismaInstance;
    }
  } else {
    console.log('Using enhanced mock client for demo/development mode');
    prismaInstance = mockPrismaClient;
  }
} catch (error) {
  console.warn('Prisma client not available, using mock client for build compatibility');
  prismaInstance = mockPrismaClient;
}

export const prisma = prismaInstance;
