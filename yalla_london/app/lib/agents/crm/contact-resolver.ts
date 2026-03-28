/**
 * Contact Resolver — resolves phone/email/externalId to a unified contact profile.
 *
 * Merges data from Lead, Subscriber, CharterInquiry, CrmOpportunity,
 * and InteractionLog into a single ResolvedContact for the CEO Brain.
 *
 * IMPORTANT: Never expose raw PII in AI prompts — only IDs and first name.
 */

import { prisma } from "@/lib/db";
import type {
  ResolvedContact,
  InteractionSummary,
  Channel,
} from "../types";

interface ResolveOptions {
  /** Phone number (WhatsApp) */
  phone?: string;
  /** Email address */
  email?: string;
  /** Channel-specific external ID */
  externalId?: string;
  /** Channel the lookup originated from */
  channel?: Channel;
  /** Site ID for scoping */
  siteId: string;
  /** Max recent interactions to include */
  maxInteractions?: number;
}

/**
 * Resolve a contact from any identifier.
 * Tries phone → email → externalId in order.
 * Returns null if no matching records found.
 */
export async function resolveContact(
  options: ResolveOptions,
): Promise<ResolvedContact | null> {
  const {
    phone,
    email,
    externalId,
    siteId,
    maxInteractions = 10,
  } = options;

  // Normalize phone: strip spaces, ensure +prefix
  const normalizedPhone = phone ? normalizePhone(phone) : undefined;
  const normalizedEmail = email?.toLowerCase().trim();

  // 1-3. Find Lead, Subscriber, CharterInquiry in parallel (no cross-dependencies)
  const [lead, subscriber, inquiry] = await Promise.all([
    findLead(siteId, normalizedEmail, normalizedPhone),
    normalizedEmail ? findSubscriber(siteId, normalizedEmail) : null,
    findInquiry(siteId, normalizedEmail, normalizedPhone),
  ]);

  // 4. Find CrmOpportunity (depends on lead.id and inquiry.id from above)
  const opportunity = await findOpportunity(
    siteId,
    lead?.id,
    inquiry?.id,
    normalizedEmail,
    normalizedPhone,
  );

  // 5. If nothing found at all, return null
  if (!lead && !subscriber && !inquiry && !opportunity) {
    return null;
  }

  // 6. Merge into unified profile (best data wins)
  const name =
    lead?.name ||
    (inquiry ? `${inquiry.firstName} ${inquiry.lastName}`.trim() : null) ||
    subscriber?.first_name ||
    null;

  const resolvedEmail =
    normalizedEmail ||
    lead?.email ||
    subscriber?.email ||
    inquiry?.email ||
    opportunity?.contactEmail ||
    null;

  const resolvedPhone =
    normalizedPhone ||
    lead?.phone ||
    inquiry?.phone ||
    inquiry?.whatsappNumber ||
    opportunity?.contactPhone ||
    null;

  // 7. Fetch recent interactions
  const interactions = await fetchRecentInteractions(
    siteId,
    lead?.id,
    opportunity?.id,
    maxInteractions,
  );

  // 8. Count total interactions
  const totalInteractions = await countInteractions(
    siteId,
    lead?.id,
    opportunity?.id,
  );

  // 9. Build tags from all sources
  const tags: string[] = [];
  if (lead?.lead_type) tags.push(lead.lead_type);
  if (inquiry?.destination) tags.push(`destination:${inquiry.destination}`);
  if (inquiry?.yachtTypePreference)
    tags.push(`yacht:${inquiry.yachtTypePreference}`);
  if (opportunity?.stage) tags.push(`stage:${opportunity.stage}`);

  // 10. Determine first/last seen
  const dates = [
    lead?.created_at,
    subscriber?.created_at,
    inquiry?.createdAt,
    opportunity?.createdAt,
  ].filter(Boolean) as Date[];

  const firstSeen =
    dates.length > 0
      ? new Date(Math.min(...dates.map((d) => d.getTime()))).toISOString()
      : new Date().toISOString();

  const lastDates = [
    lead?.updated_at,
    subscriber?.updated_at,
    inquiry?.updatedAt,
    opportunity?.updatedAt,
  ].filter(Boolean) as Date[];

  const lastSeen =
    lastDates.length > 0
      ? new Date(
          Math.max(...lastDates.map((d) => d.getTime())),
        ).toISOString()
      : null;

  return {
    name,
    email: resolvedEmail,
    phone: resolvedPhone,
    leadId: lead?.id || null,
    subscriberId: subscriber?.id || null,
    inquiryId: inquiry?.id || null,
    opportunityId: opportunity?.id || null,
    score: lead?.score || 0,
    status: lead?.status || inquiry?.status || "unknown",
    subscriberStatus: subscriber?.status || null,
    tags,
    recentInteractions: interactions,
    totalInteractions,
    preferredChannel: inquiry?.contactPreference as Channel | null || null,
    hasMarketingConsent: lead?.marketing_consent || false,
    firstSeen,
    lastSeen,
  };
}

/**
 * Create or update a contact from an inbound event.
 * If no Lead exists, creates one. If no Subscriber, creates one (if email present).
 * Returns the resolved contact.
 */
export async function ensureContact(
  options: ResolveOptions & {
    name?: string;
    source?: string;
  },
): Promise<ResolvedContact> {
  const { siteId, email, phone, name, source } = options;
  const normalizedEmail = email?.toLowerCase().trim();
  const normalizedPhone = phone ? normalizePhone(phone) : undefined;

  // Try resolve first
  let contact = await resolveContact(options);
  if (contact) return contact;

  // No existing contact — create Lead
  if (normalizedEmail) {
    try {
      await prisma.lead.create({
        data: {
          site_id: siteId,
          email: normalizedEmail,
          name: name || null,
          phone: normalizedPhone || null,
          lead_type: "CONTACT",
          lead_source: source || "agent",
          status: "NEW",
          score: 10,
        },
      });
    } catch (err: unknown) {
      // Unique constraint — lead already exists (race condition)
      if (
        err instanceof Error &&
        err.message.includes("Unique constraint")
      ) {
        // Safe to ignore — resolveContact will find it
      } else {
        console.warn("[contact-resolver] Failed to create lead:", err);
      }
    }
  }

  // Create Subscriber if email and not already subscribed
  if (normalizedEmail) {
    try {
      await prisma.subscriber.upsert({
        where: {
          site_id_email: {
            site_id: siteId,
            email: normalizedEmail,
          },
        },
        update: {},
        create: {
          site_id: siteId,
          email: normalizedEmail,
          first_name: name || null,
          status: "PENDING",
          source: source || "agent",
        },
      });
    } catch (err) {
      console.warn("[contact-resolver] Failed to upsert subscriber:", err);
    }
  }

  // Re-resolve with new records
  contact = await resolveContact(options);
  return (
    contact || {
      name: name || null,
      email: normalizedEmail || null,
      phone: normalizedPhone || null,
      leadId: null,
      subscriberId: null,
      inquiryId: null,
      opportunityId: null,
      score: 0,
      status: "unknown",
      subscriberStatus: null,
      tags: [],
      recentInteractions: [],
      totalInteractions: 0,
      preferredChannel: null,
      hasMarketingConsent: false,
      firstSeen: new Date().toISOString(),
      lastSeen: null,
    }
  );
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-\(\)]/g, "");
  return cleaned.startsWith("+") ? cleaned : `+${cleaned}`;
}

async function findLead(
  siteId: string,
  email?: string,
  phone?: string,
) {
  if (!email && !phone) return null;
  const where: Record<string, unknown>[] = [];
  if (email) where.push({ site_id: siteId, email });
  if (phone) where.push({ site_id: siteId, phone });

  return prisma.lead.findFirst({
    where: { OR: where },
    orderBy: { created_at: "desc" },
  });
}

async function findSubscriber(siteId: string, email: string) {
  return prisma.subscriber.findFirst({
    where: {
      OR: [
        { site_id: siteId, email },
        { site_id: null, email },
      ],
    },
    orderBy: { created_at: "desc" },
  });
}

async function findInquiry(
  siteId: string,
  email?: string,
  phone?: string,
) {
  if (!email && !phone) return null;
  const where: Record<string, unknown>[] = [];
  if (email) where.push({ siteId, email });
  if (phone) where.push({ siteId, phone });
  if (phone) where.push({ siteId, whatsappNumber: phone });

  return prisma.charterInquiry.findFirst({
    where: { OR: where },
    orderBy: { createdAt: "desc" },
  });
}

async function findOpportunity(
  siteId: string,
  leadId?: string,
  inquiryId?: string,
  email?: string,
  phone?: string,
) {
  const where: Record<string, unknown>[] = [];
  if (leadId) where.push({ siteId, leadId });
  if (inquiryId) where.push({ siteId, inquiryId });
  if (email) where.push({ siteId, contactEmail: email });
  if (phone) where.push({ siteId, contactPhone: phone });

  if (where.length === 0) return null;

  return prisma.crmOpportunity.findFirst({
    where: { OR: where },
    orderBy: { createdAt: "desc" },
  });
}

async function fetchRecentInteractions(
  siteId: string,
  leadId?: string | null,
  opportunityId?: string | null,
  limit: number = 10,
): Promise<InteractionSummary[]> {
  const where: Record<string, unknown>[] = [];
  if (leadId) where.push({ siteId, leadId });
  if (opportunityId) where.push({ siteId, opportunityId });

  if (where.length === 0) return [];

  const logs = await prisma.interactionLog.findMany({
    where: { OR: where },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return logs.map((log) => ({
    id: log.id,
    channel: log.channel as Channel,
    direction: log.direction as "inbound" | "outbound",
    type: log.interactionType,
    summary: log.summary,
    sentiment: log.sentiment as "positive" | "neutral" | "negative" | undefined,
    timestamp: log.createdAt.toISOString(),
  }));
}

async function countInteractions(
  siteId: string,
  leadId?: string | null,
  opportunityId?: string | null,
): Promise<number> {
  const where: Record<string, unknown>[] = [];
  if (leadId) where.push({ siteId, leadId });
  if (opportunityId) where.push({ siteId, opportunityId });

  if (where.length === 0) return 0;

  return prisma.interactionLog.count({
    where: { OR: where },
  });
}
