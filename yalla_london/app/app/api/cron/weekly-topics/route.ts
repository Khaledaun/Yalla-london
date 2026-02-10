export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logCronExecution } from "@/lib/cron-logger";

/**
 * Weekly Topic Generation Cron Job
 * Generates 30 topics weekly + triggers on low backlog
 */
export async function POST(request: NextRequest) {
  // Verify cron secret for security
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('CRON_SECRET not configured');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    console.error('❌ Unauthorized cron request');
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const _cronStart = Date.now();

  try {
    console.log('🕐 Weekly topic generation cron triggered');

    // Check feature flags directly
    const phase4bEnabled = process.env.FEATURE_PHASE4B_ENABLED === 'true';
    const topicResearchEnabled = process.env.FEATURE_TOPIC_RESEARCH === 'true';
    
    if (!phase4bEnabled || !topicResearchEnabled) {
      console.log('⚠️ Phase 4B or topic research disabled');
      return NextResponse.json(
        { error: 'Topic research feature is disabled' },
        { status: 403 }
      );
    }

    // Check current topic backlog
    const pendingCount = await prisma.topicProposal.count({
      where: { status: 'proposed' }
    });

    console.log(`📊 Current pending topics: ${pendingCount}`);

    let shouldGenerate = false;
    let reason = '';

    // Check if it's time for weekly generation (run on Sundays)
    const today = new Date();
    const isWeeklySchedule = today.getDay() === 0; // Sunday = 0

    // Check for low backlog trigger
    const isLowBacklog = pendingCount < 10;

    if (isWeeklySchedule) {
      shouldGenerate = true;
      reason = 'weekly_scheduled';
    } else if (isLowBacklog) {
      shouldGenerate = true;
      reason = 'low_backlog_trigger';
    }

    if (!shouldGenerate) {
      console.log('⏭️ No generation needed - sufficient backlog and not weekly schedule');
      return NextResponse.json({
        success: true,
        message: 'No topic generation needed',
        pendingCount,
        reason: 'sufficient_backlog',
        timestamp: new Date().toISOString()
      });
    }

    console.log(`🎯 Generating topics - reason: ${reason}`);

    // Call the topic research API to generate weekly mixed topics
    const topicResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/phase4b/topics/research`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cronSecret}`, // Pass through auth
      },
      body: JSON.stringify({
        category: 'weekly_mixed',
        locale: 'en',
        cron: true, // Flag to indicate this is a cron job
      }),
    });

    if (!topicResponse.ok) {
      throw new Error(`Topic generation failed: ${topicResponse.status}`);
    }

    const topicData = await topicResponse.json();

    // Generate Arabic topics as well if Arabic is enabled
    const arabicResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/phase4b/topics/research`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cronSecret}`,
      },
      body: JSON.stringify({
        category: 'weekly_mixed',
        locale: 'ar',
        cron: true,
      }),
    });

    let arabicData = null;
    if (arabicResponse.ok) {
      arabicData = await arabicResponse.json();
    }

    // Log generation results
    const totalGenerated = (topicData?.count || 0) + (arabicData?.count || 0);
    console.log(`✅ Topic generation completed: ${totalGenerated} topics created`);

    await logCronExecution("weekly-topics", "completed", {
      durationMs: Date.now() - _cronStart,
      itemsProcessed: totalGenerated,
      resultSummary: {
        reason,
        english: topicData?.count || 0,
        arabic: arabicData?.count || 0,
        total: totalGenerated,
        pendingCountBefore: pendingCount,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Weekly topic generation completed',
      reason,
      generated: {
        english: topicData?.count || 0,
        arabic: arabicData?.count || 0,
        total: totalGenerated,
      },
      pendingCountBefore: pendingCount,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Weekly topic generation failed:', error);
    await logCronExecution("weekly-topics", "failed", {
      durationMs: Date.now() - _cronStart,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { 
        error: 'Weekly topic generation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET(request: NextRequest) {
  const pendingCount = await prisma.topicProposal.count({
    where: { status: 'proposed' }
  });

  return NextResponse.json({
    status: 'healthy',
    endpoint: 'weekly-topics cron',
    pendingTopics: pendingCount,
    lowBacklog: pendingCount < 10,
    nextWeeklyRun: getNextSunday(),
    timestamp: new Date().toISOString()
  });
}

function getNextSunday(): string {
  const today = new Date();
  const daysUntilSunday = (7 - today.getDay()) % 7;
  const nextSunday = new Date(today);
  nextSunday.setDate(today.getDate() + (daysUntilSunday === 0 ? 7 : daysUntilSunday));
  return nextSunday.toISOString();
}