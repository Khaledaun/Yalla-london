/**
 * Retention Engine — manages automated email sequences.
 *
 * Handles:
 * - Starting sequences for new subscribers (welcome_series)
 * - Checking for re-engagement triggers (30d_inactive)
 * - Advancing subscribers through sequence steps
 * - Pausing/unsubscribing from sequences
 * - Email list health checks
 */

import { prisma } from "@/lib/db";
import type { RetentionStep } from "../types";

// ---------------------------------------------------------------------------
// Default Sequences (seeded on first use)
// ---------------------------------------------------------------------------

const DEFAULT_SEQUENCES = [
  {
    name: "welcome_series",
    triggerEvent: "subscriber_created",
    steps: [
      {
        delayHours: 0,
        templateId: "welcome",
        subject: "Welcome to {{siteName}}!",
      },
      {
        delayHours: 48,
        templateId: "top_articles",
        subject: "Our most popular guides",
      },
      {
        delayHours: 168, // 7 days
        templateId: "newsletter_invite",
        subject: "Stay updated with our weekly digest",
      },
    ] satisfies RetentionStep[],
  },
  {
    name: "re_engagement",
    triggerEvent: "30d_inactive",
    steps: [
      {
        delayHours: 0,
        templateId: "miss_you",
        subject: "We miss you! Here's what's new",
      },
    ] satisfies RetentionStep[],
  },
  {
    name: "post_booking",
    triggerEvent: "opportunity_won",
    steps: [
      {
        delayHours: 24,
        templateId: "booking_followup",
        subject: "Thank you for your booking!",
      },
    ] satisfies RetentionStep[],
  },
  {
    name: "charter_inquiry_followup",
    triggerEvent: "charter_inquiry_created",
    steps: [
      {
        delayHours: 0,
        templateId: "charter_thankyou",
        subject: "Your Charter Inquiry — What Happens Next",
      },
      {
        delayHours: 24,
        templateId: "charter_destination_inspiration",
        subject: "Mediterranean Destinations You'll Love",
      },
      {
        delayHours: 72,
        templateId: "charter_planning_guide",
        subject: "Your Complete Charter Planning Guide",
      },
      {
        delayHours: 240, // 10 days
        templateId: "charter_featured_yachts",
        subject: "Handpicked Yachts for Your Trip",
      },
      {
        delayHours: 432, // 18 days
        templateId: "charter_limited_availability",
        subject: "Peak Season Availability Alert",
      },
    ] satisfies RetentionStep[],
  },
];

// ---------------------------------------------------------------------------
// Sequence Management
// ---------------------------------------------------------------------------

/**
 * Ensure default sequences exist for a site.
 * Safe to call multiple times — uses upsert.
 */
export async function seedDefaultSequences(siteId: string): Promise<number> {
  let created = 0;
  for (const seq of DEFAULT_SEQUENCES) {
    try {
      await prisma.retentionSequence.upsert({
        where: {
          siteId_name: { siteId, name: seq.name },
        },
        update: {},
        create: {
          siteId,
          name: seq.name,
          triggerEvent: seq.triggerEvent,
          steps: seq.steps,
          active: true,
        },
      });
      created++;
    } catch (err) {
      console.warn(`[retention] Failed to seed ${seq.name}:`, err);
    }
  }
  return created;
}

/**
 * Start a retention sequence for a subscriber.
 * Calculates first step's nextSendAt based on delayHours.
 */
export async function startSequence(
  siteId: string,
  subscriberId: string,
  triggerEvent: string,
): Promise<{ started: boolean; sequenceId?: string; error?: string }> {
  // Find active sequence matching this trigger
  const sequence = await prisma.retentionSequence.findFirst({
    where: { siteId, triggerEvent, active: true },
  });

  if (!sequence) {
    return { started: false, error: `No active sequence for trigger: ${triggerEvent}` };
  }

  const steps = sequence.steps as RetentionStep[];
  if (!steps || steps.length === 0) {
    return { started: false, error: "Sequence has no steps" };
  }

  // Check if already enrolled
  const existing = await prisma.retentionProgress.findUnique({
    where: {
      sequenceId_subscriberId: {
        sequenceId: sequence.id,
        subscriberId,
      },
    },
  });

  if (existing && existing.status === "active") {
    return { started: false, error: "Already enrolled in sequence" };
  }

  // Calculate first step send time
  const firstStep = steps[0];
  const nextSendAt = new Date(
    Date.now() + (firstStep.delayHours || 0) * 60 * 60 * 1000,
  );

  await prisma.retentionProgress.upsert({
    where: {
      sequenceId_subscriberId: {
        sequenceId: sequence.id,
        subscriberId,
      },
    },
    update: {
      currentStep: 0,
      status: "active",
      nextSendAt,
      lastSentAt: null,
    },
    create: {
      sequenceId: sequence.id,
      subscriberId,
      currentStep: 0,
      status: "active",
      nextSendAt,
    },
  });

  return { started: true, sequenceId: sequence.id };
}

/**
 * Advance a subscriber to the next step in their sequence.
 * Called after an email is successfully sent.
 */
export async function advanceStep(
  progressId: string,
): Promise<{ advanced: boolean; completed: boolean; error?: string }> {
  const progress = await prisma.retentionProgress.findUnique({
    where: { id: progressId },
  });

  if (!progress || progress.status !== "active") {
    return { advanced: false, completed: false, error: "Not active" };
  }

  const sequence = await prisma.retentionSequence.findUnique({
    where: { id: progress.sequenceId },
  });

  if (!sequence) {
    return { advanced: false, completed: false, error: "Sequence not found" };
  }

  const steps = sequence.steps as RetentionStep[];
  const nextStepIndex = progress.currentStep + 1;

  if (nextStepIndex >= steps.length) {
    // Sequence complete
    await prisma.retentionProgress.update({
      where: { id: progressId },
      data: {
        status: "completed",
        lastSentAt: new Date(),
        nextSendAt: null,
      },
    });
    return { advanced: true, completed: true };
  }

  // Calculate next step send time
  const nextStep = steps[nextStepIndex];
  const nextSendAt = new Date(
    Date.now() + (nextStep.delayHours || 0) * 60 * 60 * 1000,
  );

  await prisma.retentionProgress.update({
    where: { id: progressId },
    data: {
      currentStep: nextStepIndex,
      lastSentAt: new Date(),
      nextSendAt,
    },
  });

  return { advanced: true, completed: false };
}

/**
 * Pause or unsubscribe from a sequence.
 */
export async function pauseSequence(
  sequenceId: string,
  subscriberId: string,
  reason: "paused" | "unsubscribed" = "paused",
): Promise<boolean> {
  try {
    await prisma.retentionProgress.updateMany({
      where: { sequenceId, subscriberId, status: "active" },
      data: { status: reason, nextSendAt: null },
    });
    return true;
  } catch (err) {
    console.warn("[retention] Failed to pause sequence:", err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Cron-callable: Get due emails
// ---------------------------------------------------------------------------

/**
 * Find all retention progress entries that are due to send.
 * Used by the retention-executor cron.
 */
export async function getDueEmails(
  limit: number = 50,
): Promise<
  Array<{
    progressId: string;
    sequenceId: string;
    subscriberId: string;
    currentStep: number;
    step: RetentionStep;
    siteId: string;
    sequenceName: string;
  }>
> {
  const now = new Date();

  const dueProgress = await prisma.retentionProgress.findMany({
    where: {
      status: "active",
      nextSendAt: { lte: now },
    },
    take: limit,
    orderBy: { nextSendAt: "asc" },
  });

  const results: Array<{
    progressId: string;
    sequenceId: string;
    subscriberId: string;
    currentStep: number;
    step: RetentionStep;
    siteId: string;
    sequenceName: string;
  }> = [];

  for (const progress of dueProgress) {
    const sequence = await prisma.retentionSequence.findUnique({
      where: { id: progress.sequenceId },
    });

    if (!sequence || !sequence.active) continue;

    const steps = sequence.steps as RetentionStep[];
    const step = steps[progress.currentStep];
    if (!step) continue;

    results.push({
      progressId: progress.id,
      sequenceId: sequence.id,
      subscriberId: progress.subscriberId,
      currentStep: progress.currentStep,
      step,
      siteId: sequence.siteId,
      sequenceName: sequence.name,
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Email List Health
// ---------------------------------------------------------------------------

export interface ListHealthReport {
  siteId: string;
  totalSubscribers: number;
  confirmedSubscribers: number;
  pendingSubscribers: number;
  unsubscribedCount: number;
  bouncedCount: number;
  complainedCount: number;
  /** Subscribers with no activity in 30+ days */
  inactiveCount: number;
  /** Health percentage (confirmed / total * 100) */
  healthPercent: number;
  /** Subscribers eligible for re-engagement */
  reEngagementEligible: number;
}

/**
 * Compute email list health metrics for a site.
 */
export async function getListHealth(
  siteId: string,
): Promise<ListHealthReport> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    total,
    confirmed,
    pending,
    unsubscribed,
    bounced,
    complained,
    inactive,
  ] = await Promise.all([
    prisma.subscriber.count({
      where: { OR: [{ site_id: siteId }, { site_id: null }] },
    }),
    prisma.subscriber.count({
      where: {
        OR: [{ site_id: siteId }, { site_id: null }],
        status: "CONFIRMED",
      },
    }),
    prisma.subscriber.count({
      where: {
        OR: [{ site_id: siteId }, { site_id: null }],
        status: "PENDING",
      },
    }),
    prisma.subscriber.count({
      where: {
        OR: [{ site_id: siteId }, { site_id: null }],
        status: "UNSUBSCRIBED",
      },
    }),
    prisma.subscriber.count({
      where: {
        OR: [{ site_id: siteId }, { site_id: null }],
        status: "BOUNCED",
      },
    }),
    prisma.subscriber.count({
      where: {
        OR: [{ site_id: siteId }, { site_id: null }],
        status: "COMPLAINED",
      },
    }),
    prisma.subscriber.count({
      where: {
        OR: [{ site_id: siteId }, { site_id: null }],
        status: "CONFIRMED",
        updated_at: { lt: thirtyDaysAgo },
      },
    }),
  ]);

  const healthPercent =
    total > 0 ? Math.round((confirmed / total) * 100) : 0;

  return {
    siteId,
    totalSubscribers: total,
    confirmedSubscribers: confirmed,
    pendingSubscribers: pending,
    unsubscribedCount: unsubscribed,
    bouncedCount: bounced,
    complainedCount: complained,
    inactiveCount: inactive,
    healthPercent,
    reEngagementEligible: inactive,
  };
}

/**
 * Find inactive confirmed subscribers eligible for re-engagement.
 * Returns subscriber IDs for the retention engine to target.
 */
export async function findInactiveSubscribers(
  siteId: string,
  daysSinceActive: number = 30,
  limit: number = 50,
): Promise<string[]> {
  const cutoff = new Date(
    Date.now() - daysSinceActive * 24 * 60 * 60 * 1000,
  );

  const subscribers = await prisma.subscriber.findMany({
    where: {
      OR: [{ site_id: siteId }, { site_id: null }],
      status: "CONFIRMED",
      updated_at: { lt: cutoff },
    },
    select: { id: true },
    take: limit,
    orderBy: { updated_at: "asc" },
  });

  return subscribers.map((s) => s.id);
}
