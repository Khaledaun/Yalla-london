/**
 * Lead Scoring — auto-scores leads based on activity signals.
 *
 * Score range: 0-100
 * Updated whenever new interactions are logged.
 */

import { prisma } from "@/lib/db";

interface ScoreFactors {
  /** Base score for source quality */
  sourceScore: number;
  /** Points from interactions */
  interactionScore: number;
  /** Points from engagement signals */
  engagementScore: number;
  /** Points from recency */
  recencyScore: number;
  /** Total computed score */
  total: number;
}

const SOURCE_SCORES: Record<string, number> = {
  whatsapp: 25,      // High intent — direct message
  inquiry: 20,       // Charter/booking inquiry
  web: 15,           // Contact form
  referral: 20,      // Referred by someone
  organic: 10,       // Found via search
  email: 10,         // Email subscription
  agent: 5,          // Auto-created by agent
  newsletter: 5,     // Newsletter signup
};

/**
 * Calculate and update the score for a lead.
 */
export async function scoreAndUpdateLead(
  leadId: string,
): Promise<ScoreFactors> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { activities: { orderBy: { created_at: "desc" }, take: 50 } },
  });

  if (!lead) {
    return { sourceScore: 0, interactionScore: 0, engagementScore: 0, recencyScore: 0, total: 0 };
  }

  // 1. Source score (0-25)
  const sourceScore = SOURCE_SCORES[lead.lead_source || ""] || 5;

  // 2. Interaction score (0-30) — based on interaction count and variety
  const interactionCount = await prisma.interactionLog.count({
    where: { leadId: lead.id },
  });
  const interactionScore = Math.min(30, interactionCount * 5);

  // 3. Engagement score (0-25) — has inquiry, has opportunity, has consent
  let engagementScore = 0;
  if (lead.marketing_consent) engagementScore += 5;

  const hasInquiry = await prisma.charterInquiry.count({
    where: { email: lead.email, siteId: lead.site_id },
  });
  if (hasInquiry > 0) engagementScore += 10;

  const hasOpportunity = await prisma.crmOpportunity.count({
    where: { leadId: lead.id },
  });
  if (hasOpportunity > 0) engagementScore += 10;

  engagementScore = Math.min(25, engagementScore);

  // 4. Recency score (0-20) — recent activity gets more points
  const daysSinceUpdate = Math.floor(
    (Date.now() - lead.updated_at.getTime()) / (1000 * 60 * 60 * 24),
  );
  let recencyScore = 0;
  if (daysSinceUpdate <= 1) recencyScore = 20;
  else if (daysSinceUpdate <= 7) recencyScore = 15;
  else if (daysSinceUpdate <= 14) recencyScore = 10;
  else if (daysSinceUpdate <= 30) recencyScore = 5;

  const total = Math.min(
    100,
    sourceScore + interactionScore + engagementScore + recencyScore,
  );

  // Update lead score in DB
  try {
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        score: total,
        score_factors: {
          sourceScore,
          interactionScore,
          engagementScore,
          recencyScore,
        },
      },
    });
  } catch (err) {
    console.warn("[lead-scoring] Failed to update score:", err);
  }

  return { sourceScore, interactionScore, engagementScore, recencyScore, total };
}

/**
 * Batch score all leads for a site that haven't been scored recently.
 * Used by maintenance crons.
 */
export async function batchScoreLeads(
  siteId: string,
  limit: number = 50,
): Promise<{ scored: number; errors: number }> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const leads = await prisma.lead.findMany({
    where: {
      site_id: siteId,
      updated_at: { lt: sevenDaysAgo },
    },
    select: { id: true },
    take: limit,
    orderBy: { updated_at: "asc" },
  });

  let scored = 0;
  let errors = 0;

  for (const lead of leads) {
    try {
      await scoreAndUpdateLead(lead.id);
      scored++;
    } catch (err) {
      console.warn("[lead-scoring] Failed to score lead:", lead.id, err instanceof Error ? err.message : String(err));
      errors++;
    }
  }

  return { scored, errors };
}
