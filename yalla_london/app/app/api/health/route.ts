/**
 * Health Check Endpoint
 *
 * GET /api/health - Comprehensive system health check
 *
 * Used by:
 * - Vercel health checks
 * - External monitoring (Uptime Robot, Better Stack)
 * - Load balancers
 *
 * Returns:
 * - 200 OK when healthy
 * - 503 Service Unavailable when unhealthy
 */

import { NextRequest, NextResponse } from 'next/server';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  environment: string;
  checks: {
    name: string;
    status: 'pass' | 'fail' | 'warn';
    latency?: number;
    message?: string;
  }[];
}

// Track server start time for uptime
const startTime = Date.now();

export async function GET(request: NextRequest) {
  const checks: HealthCheckResult['checks'] = [];
  let overallStatus: HealthCheckResult['status'] = 'healthy';

  // Check 1: Database connectivity
  const dbCheck = await checkDatabase();
  checks.push(dbCheck);
  if (dbCheck.status === 'fail') {
    overallStatus = 'unhealthy';
  } else if (dbCheck.status === 'warn') {
    overallStatus = overallStatus === 'healthy' ? 'degraded' : overallStatus;
  }

  // Check 2: Memory usage
  const memoryCheck = checkMemory();
  checks.push(memoryCheck);
  if (memoryCheck.status === 'fail') {
    overallStatus = 'unhealthy';
  } else if (memoryCheck.status === 'warn') {
    overallStatus = overallStatus === 'healthy' ? 'degraded' : overallStatus;
  }

  // Check 3: Required environment variables
  const envCheck = checkEnvironment();
  checks.push(envCheck);
  if (envCheck.status === 'fail') {
    overallStatus = overallStatus === 'healthy' ? 'degraded' : overallStatus;
  }

  const result: HealthCheckResult = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'unknown',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    environment: process.env.NODE_ENV || 'development',
    checks,
  };

  const statusCode = overallStatus === 'unhealthy' ? 503 : 200;

  return NextResponse.json(result, {
    status: statusCode,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}

/**
 * Check database connectivity
 *
 * IMPORTANT: Always uses the Prisma singleton from @/lib/db.
 * Never create a new PrismaClient here — doing so leaks connections
 * and exhausts the Supabase PgBouncer pool (MaxClientsInSessionMode).
 */
async function checkDatabase(): Promise<HealthCheckResult['checks'][0]> {
  const start = Date.now();

  try {
    const { prisma } = await import('@/lib/db');
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - start;

    return {
      name: 'database',
      status: latency > 1000 ? 'warn' : 'pass',
      latency,
      message: latency > 1000 ? 'Slow response' : 'Connected',
    };
  } catch (error) {
    return {
      name: 'database',
      status: 'fail',
      latency: Date.now() - start,
      message: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}

/**
 * Check memory usage
 */
function checkMemory(): HealthCheckResult['checks'][0] {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const usage = process.memoryUsage();
    const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);
    const usagePercent = Math.round((usage.heapUsed / usage.heapTotal) * 100);

    let status: 'pass' | 'warn' | 'fail' = 'pass';
    if (usagePercent > 90) status = 'fail';
    else if (usagePercent > 75) status = 'warn';

    return {
      name: 'memory',
      status,
      message: `${heapUsedMB}MB / ${heapTotalMB}MB (${usagePercent}%)`,
    };
  }

  return { name: 'memory', status: 'pass', message: 'Edge runtime' };
}

/**
 * Check required environment variables
 */
function checkEnvironment(): HealthCheckResult['checks'][0] {
  const required = ['DATABASE_URL', 'NEXTAUTH_SECRET'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    return {
      name: 'environment',
      status: 'fail',
      message: `Missing: ${missing.join(', ')}`,
    };
  }

  return { name: 'environment', status: 'pass', message: 'OK' };
}

// HEAD request for simple uptime monitoring
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}