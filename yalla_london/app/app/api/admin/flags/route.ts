export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { prisma } from '@/lib/db'



export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all feature flags
    const flags = await prisma.featureFlag.findMany({
      orderBy: {
        name: 'asc'
      }
    })

    // Get system health status
    const healthStatus = await getSystemHealthStatus()

    return NextResponse.json({
      flags,
      healthStatus
    })

  } catch (error) {
    console.error('Error fetching flags data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, data } = body

    switch (action) {
      case 'toggle_flag':
        return await handleToggleFlag(data)
      
      case 'create_flag':
        return await handleCreateFlag(data)
      
      case 'update_flag':
        return await handleUpdateFlag(data)
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error processing flags request:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function handleToggleFlag(data: any) {
  const { flagName, enabled } = data

  const flag = await prisma.featureFlag.update({
    where: { name: flagName },
    data: {
      enabled,
      updated_at: new Date()
    }
  })

  return NextResponse.json({ success: true, flag })
}

async function handleCreateFlag(data: any) {
  const { name, description, enabled = false } = data

  const flag = await prisma.featureFlag.create({
    data: {
      name,
      description,
      enabled
    }
  })

  return NextResponse.json({ success: true, flag })
}

async function handleUpdateFlag(data: any) {
  const { id, name, description, enabled } = data

  const flag = await prisma.featureFlag.update({
    where: { id },
    data: {
      name,
      description,
      enabled,
      updated_at: new Date()
    }
  })

  return NextResponse.json({ success: true, flag })
}

async function getSystemHealthStatus() {
  try {
    // Check database connectivity
    await prisma.$queryRaw`SELECT 1`
    const dbStatus = 'healthy'

    // Get indexed pages count
    const analyticsSnapshot = await prisma.analyticsSnapshot.findFirst({
      orderBy: { created_at: 'desc' }
    })
    const indexedPages = analyticsSnapshot?.indexed_pages || 0

    // Get draft backlog counts
    const [enDrafts, arDrafts] = await Promise.all([
      prisma.topicProposal.count({
        where: { locale: 'en', status: { in: ['planned', 'queued', 'generated', 'drafted'] } }
      }),
      prisma.topicProposal.count({
        where: { locale: 'ar', status: { in: ['planned', 'queued', 'generated', 'drafted'] } }
      })
    ])

    // Check cron status from actual CronJobLog — last 24h
    let cronStatus = 'unknown';
    try {
      const recentCron = await prisma.cronJobLog.findFirst({
        where: { started_at: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        orderBy: { started_at: 'desc' },
        select: { status: true, started_at: true },
      });
      if (!recentCron) {
        cronStatus = 'no_recent_runs';
      } else if (recentCron.status === 'completed' || recentCron.status === 'timed_out') {
        cronStatus = 'running';
      } else if (recentCron.status === 'failed') {
        cronStatus = 'errors';
      } else {
        cronStatus = recentCron.status || 'unknown';
      }
    } catch {
      cronStatus = 'unknown'; // CronJobLog table may not exist yet
    }

    // Get environment info
    const envInfo = {
      nodeEnv: process.env.NODE_ENV,
      databaseUrl: process.env.DATABASE_URL ? 'configured' : 'missing',
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'configured' : 'missing',
      nextAuthSecret: process.env.NEXTAUTH_SECRET ? 'configured' : 'missing'
    }

    return {
      database: dbStatus,
      indexedPages,
      draftBacklog: {
        en: enDrafts,
        ar: arDrafts,
        total: enDrafts + arDrafts
      },
      cron: cronStatus,
      environment: envInfo,
      timestamp: new Date().toISOString()
    }

  } catch (error) {
    console.error('Error checking system health:', error)
    return {
      database: 'error',
      indexedPages: 0,
      draftBacklog: { en: 0, ar: 0, total: 0 },
      cron: 'error',
      environment: {},
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
