/**
 * Health Check Endpoint
 * Basic health status for monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkDatabaseHealth } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Check database health
    const dbHealth = await checkDatabaseHealth();
    
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: {
        connected: dbHealth.connected,
        status: dbHealth.migrateStatus
      },
      environment: process.env.NODE_ENV || 'development'
    };

    return NextResponse.json(health, { status: 200 });
    
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}