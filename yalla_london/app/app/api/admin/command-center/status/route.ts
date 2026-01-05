/**
 * Command Center Status API
 *
 * Returns system status including AI availability, pending tasks, and sync status.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAIAvailable, getProvidersStatus } from '@/lib/ai';

export async function GET() {
  try {
    // Check AI status
    const aiAvailable = await isAIAvailable();
    const providersStatus = await getProvidersStatus();

    // Determine overall AI status
    let aiStatus: 'online' | 'offline' | 'degraded' = 'offline';
    const activeProviders = Object.values(providersStatus).filter((p) => p.active).length;

    if (activeProviders >= 2) {
      aiStatus = 'online';
    } else if (activeProviders === 1) {
      aiStatus = 'degraded';
    }

    // Get pending tasks count
    const [pendingJobs, scheduledContent, pendingLeads] = await Promise.all([
      prisma.backgroundJob.count({
        where: { status: 'pending' },
      }).catch(() => 0),
      prisma.scheduledContent.count({
        where: {
          status: 'pending',
          scheduled_time: { gte: new Date() },
        },
      }).catch(() => 0),
      prisma.lead.count({
        where: { status: 'NEW' },
      }).catch(() => 0),
    ]);

    const pendingTasks = pendingJobs + scheduledContent;

    // Get last sync time from analytics snapshot
    const lastSnapshot = await prisma.analyticsSnapshot.findFirst({
      orderBy: { created_at: 'desc' },
      select: { created_at: true },
    }).catch(() => null);

    return NextResponse.json({
      aiStatus,
      aiProviders: providersStatus,
      contentQueue: scheduledContent,
      scheduledPosts: scheduledContent,
      pendingTasks,
      pendingLeads,
      lastSync: lastSnapshot?.created_at?.toISOString() || new Date().toISOString(),
      systemHealth: {
        database: 'healthy',
        storage: 'healthy',
        api: aiAvailable ? 'healthy' : 'degraded',
      },
    });
  } catch (error) {
    console.error('Failed to get command center status:', error);
    return NextResponse.json(
      { error: 'Failed to get status' },
      { status: 500 }
    );
  }
}
