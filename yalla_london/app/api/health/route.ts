
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1 as test`;
    
    // Check environment variables
    const requiredEnvVars = [
      'DATABASE_URL',
      'NEXTAUTH_SECRET',
      'NEXT_PUBLIC_BRAND_TYPE'
    ];
    
    const missingEnvVars = requiredEnvVars.filter(
      envVar => !process.env[envVar]
    );
    
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      environment: missingEnvVars.length === 0 ? 'complete' : 'incomplete',
      missingEnvVars: missingEnvVars,
      brand: process.env.NEXT_PUBLIC_BRAND_TYPE || 'not-set',
      version: process.env.npm_package_version || 'unknown'
    };
    
    const statusCode = missingEnvVars.length === 0 ? 200 : 500;
    
    return NextResponse.json(healthStatus, { status: statusCode });
    
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
