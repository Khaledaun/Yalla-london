// Mock Prisma client for build compatibility
export const mockPrismaClient = {
  user: { findMany: () => Promise.resolve([]), findUnique: () => Promise.resolve(null), create: () => Promise.resolve({}), update: () => Promise.resolve({}), delete: () => Promise.resolve({}) },
  blogPost: { findMany: () => Promise.resolve([]), findUnique: () => Promise.resolve(null), create: () => Promise.resolve({}), update: () => Promise.resolve({}), delete: () => Promise.resolve({}) },
  topicProposal: { findMany: () => Promise.resolve([]), findUnique: () => Promise.resolve(null), create: () => Promise.resolve({}), update: () => Promise.resolve({}), delete: () => Promise.resolve({}) },
  scheduledContent: { findMany: () => Promise.resolve([]), findUnique: () => Promise.resolve(null), create: () => Promise.resolve({}), update: () => Promise.resolve({}), delete: () => Promise.resolve({}) },
  mediaEnrichment: { findMany: () => Promise.resolve([]), findUnique: () => Promise.resolve(null), create: () => Promise.resolve({}), update: () => Promise.resolve({}), delete: () => Promise.resolve({}) },
  seoAuditResult: { findMany: () => Promise.resolve([]), findUnique: () => Promise.resolve(null), create: () => Promise.resolve({}), update: () => Promise.resolve({}), delete: () => Promise.resolve({}) },
  analyticsSnapshot: { findMany: () => Promise.resolve([]), findUnique: () => Promise.resolve(null), create: () => Promise.resolve({}), update: () => Promise.resolve({}), delete: () => Promise.resolve({}) },
  $connect: () => Promise.resolve(),
  $disconnect: () => Promise.resolve(),
  $transaction: (fn: any) => fn(mockPrismaClient),
}
export default mockPrismaClient