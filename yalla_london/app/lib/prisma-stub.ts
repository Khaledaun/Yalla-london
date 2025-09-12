// Prisma client stub for build-time compatibility
// This file provides a mock implementation when the actual Prisma client cannot be generated

export interface MockPrismaClient {
  $connect(): Promise<void>;
  $disconnect(): Promise<void>;
  $executeRaw(...args: any[]): Promise<any>;
  $queryRaw(...args: any[]): Promise<any>;
  [key: string]: any;
}

const createMockClient = (): MockPrismaClient => {
  const mockMethod = () => {
    throw new Error('Prisma client not available - database operations disabled');
  };

  return new Proxy({
    $connect: () => Promise.resolve(),
    $disconnect: () => Promise.resolve(),
    $executeRaw: mockMethod,
    $queryRaw: mockMethod,
  } as any, {
    get(target, prop) {
      if (prop in target) {
        return target[prop];
      }
      return mockMethod;
    }
  });
};

export const mockPrismaClient = createMockClient();