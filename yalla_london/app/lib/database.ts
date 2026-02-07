/**
 * Database Service - Backwards Compatibility Shim
 *
 * All new code should import from `@/lib/db` instead.
 */

export {
  prisma,
  getPrismaClient,
  checkDatabaseHealth,
  disconnectDatabase,
} from "@/lib/db";
