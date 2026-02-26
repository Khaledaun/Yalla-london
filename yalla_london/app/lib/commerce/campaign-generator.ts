/**
 * Campaign Generator — AI-powered 30-day product launch calendars
 *
 * Takes a ProductBrief and generates a marketing playbook with daily tasks
 * across channels (social, email, blog, Etsy promo, Pinterest).
 *
 * Uses generateJSON() for AI task generation and UTM engine for tracking links.
 */

import type { CampaignTask } from "./types";
import { generateCampaignSlug, generateCouponCode, generateUtmParams, buildUtmUrl } from "./utm-engine";

// ─── Generate Campaign from Brief ────────────────────────

/**
 * Generate a 30-day launch campaign for a product brief.
 * Creates CommerceCampaign record with AI-generated daily tasks.
 */
export async function generateCampaignFromBrief(
  briefId: string,
  options: { calledFrom?: string } = {},
): Promise<{
  campaignId: string;
  name: string;
  tasksCount: number;
  couponCode: string;
}> {
  const { prisma } = await import("@/lib/db");
  const { generateJSON } = await import("@/lib/ai/provider");

  // Load the brief
  const brief = await prisma.productBrief.findUnique({
    where: { id: briefId },
  });

  if (!brief) {
    throw new Error(`ProductBrief not found: ${briefId}`);
  }

  if (brief.status !== "approved" && brief.status !== "in_production") {
    throw new Error(`Brief must be approved or in_production to generate campaign (current: ${brief.status})`);
  }

  // Generate campaign name and UTM slug
  const campaignName = `Launch: ${brief.title}`;
  const campaignSlug = generateCampaignSlug(brief.title);
  const couponCode = generateCouponCode(brief.siteId);

  // Generate UTM params for each channel
  const utmByChannel = {
    social: generateUtmParams(campaignSlug, "social"),
    email: generateUtmParams(campaignSlug, "email"),
    blog: generateUtmParams(campaignSlug, "blog"),
    etsy: generateUtmParams(campaignSlug, "etsy"),
    pinterest: generateUtmParams(campaignSlug, "pinterest"),
  };

  // AI: Generate 30-day task plan
  const keywords = Array.isArray(brief.keywordsJson)
    ? (brief.keywordsJson as string[]).join(", ")
    : "";

  const tasks = await generateJSON<CampaignTask[]>(
    buildCampaignPrompt(brief.title, brief.description ?? "", keywords, brief.productType, couponCode),
    {
      systemPrompt: "You are a digital product launch strategist for a luxury travel content brand. Generate a 30-day marketing campaign calendar as a JSON array.",
      maxTokens: 4000,
      temperature: 0.7,
      siteId: brief.siteId,
      taskType: "commerce_listing_copy",
      calledFrom: options.calledFrom ?? "campaign-generator",
    },
  );

  // Validate and normalize tasks
  const normalizedTasks = normalizeTasks(tasks);

  // Calculate campaign dates (start tomorrow)
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 1);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 29);

  // Create CommerceCampaign record
  const campaign = await prisma.commerceCampaign.create({
    data: {
      siteId: brief.siteId,
      briefId: brief.id,
      name: campaignName,
      description: `30-day launch campaign for "${brief.title}". Coupon: ${couponCode}`,
      startDate,
      endDate,
      utmSource: utmByChannel.social.source,
      utmMedium: utmByChannel.social.medium,
      utmCampaign: campaignSlug,
      couponCode,
      discountPercent: 15, // Default 15% launch discount
      tasksJson: normalizedTasks,
      resultsJson: { views: 0, clicks: 0, conversions: 0, revenue: 0 },
      status: "planned",
    },
  });

  return {
    campaignId: campaign.id,
    name: campaign.name,
    tasksCount: normalizedTasks.length,
    couponCode,
  };
}

// ─── Update Campaign Task Status ─────────────────────────

/**
 * Toggle a task's completion status within a campaign.
 */
export async function updateCampaignTask(
  campaignId: string,
  day: number,
  taskIndex: number,
  completed: boolean,
): Promise<void> {
  const { prisma } = await import("@/lib/db");

  const campaign = await prisma.commerceCampaign.findUnique({
    where: { id: campaignId },
  });

  if (!campaign) {
    throw new Error(`Campaign not found: ${campaignId}`);
  }

  const tasks = (campaign.tasksJson as CampaignTask[]) ?? [];

  // Find matching task by day
  const dayTasks = tasks.filter((t) => t.day === day);
  if (taskIndex < 0 || taskIndex >= dayTasks.length) {
    throw new Error(`Task index ${taskIndex} out of range for day ${day}`);
  }

  // Find the actual index in the full array
  let matchCount = 0;
  for (let i = 0; i < tasks.length; i++) {
    if (tasks[i].day === day) {
      if (matchCount === taskIndex) {
        tasks[i].status = completed ? "completed" : "pending";
        tasks[i].completedAt = completed ? new Date().toISOString() : undefined;
        break;
      }
      matchCount++;
    }
  }

  await prisma.commerceCampaign.update({
    where: { id: campaignId },
    data: { tasksJson: tasks },
  });
}

// ─── Update Campaign Results ─────────────────────────────

/**
 * Update campaign performance metrics.
 */
export async function updateCampaignResults(
  campaignId: string,
  results: { views?: number; clicks?: number; conversions?: number; revenue?: number },
): Promise<void> {
  const { prisma } = await import("@/lib/db");

  const campaign = await prisma.commerceCampaign.findUnique({
    where: { id: campaignId },
  });

  if (!campaign) {
    throw new Error(`Campaign not found: ${campaignId}`);
  }

  const existing = (campaign.resultsJson as Record<string, number>) ?? {};
  const updated = {
    views: results.views ?? existing.views ?? 0,
    clicks: results.clicks ?? existing.clicks ?? 0,
    conversions: results.conversions ?? existing.conversions ?? 0,
    revenue: results.revenue ?? existing.revenue ?? 0,
  };

  await prisma.commerceCampaign.update({
    where: { id: campaignId },
    data: { resultsJson: updated },
  });
}

// ─── Get Campaign with UTM Links ─────────────────────────

/**
 * Load a campaign with pre-built UTM tracking URLs for each channel.
 */
export async function getCampaignWithLinks(
  campaignId: string,
  productUrl: string,
): Promise<{
  campaign: Record<string, unknown>;
  trackingLinks: Record<string, string>;
  progress: { total: number; completed: number; percent: number };
}> {
  const { prisma } = await import("@/lib/db");

  const campaign = await prisma.commerceCampaign.findUnique({
    where: { id: campaignId },
  });

  if (!campaign) {
    throw new Error(`Campaign not found: ${campaignId}`);
  }

  const slug = campaign.utmCampaign ?? "campaign";

  // Build tracking links for each channel
  const trackingLinks: Record<string, string> = {};
  const channels = ["social", "email", "blog", "etsy", "pinterest"] as const;

  for (const channel of channels) {
    const params = generateUtmParams(slug, channel);
    trackingLinks[channel] = buildUtmUrl(productUrl, params);
  }

  // Calculate progress
  const tasks = (campaign.tasksJson as CampaignTask[]) ?? [];
  const completed = tasks.filter((t) => t.status === "completed").length;

  return {
    campaign: campaign as unknown as Record<string, unknown>,
    trackingLinks,
    progress: {
      total: tasks.length,
      completed,
      percent: tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0,
    },
  };
}

// ─── Internal: Build AI Prompt ───────────────────────────

function buildCampaignPrompt(
  title: string,
  description: string,
  keywords: string,
  productType: string,
  couponCode: string,
): string {
  return `Generate a 30-day marketing launch calendar for this digital product:

PRODUCT: ${title}
TYPE: ${productType}
DESCRIPTION: ${description}
KEYWORDS: ${keywords}
COUPON CODE: ${couponCode}

Create a JSON array of daily tasks. Each task object must have:
- "day": number (1-30)
- "task": string (specific actionable task description, 1-2 sentences)
- "channel": one of "social", "email", "blog", "etsy", "pinterest"
- "status": "pending"

CAMPAIGN STRATEGY:
- Days 1-3: Pre-launch teaser (social, email list warming)
- Days 4-7: Launch week (all channels, coupon announcement)
- Days 8-14: Momentum (social proof, blog features, Pinterest pins)
- Days 15-21: Mid-campaign push (email reminder, Etsy promo, new angles)
- Days 22-28: Final push (urgency, last chance coupon, testimonials)
- Days 29-30: Wrap-up (results review, next product teaser)

REQUIREMENTS:
- Generate 45-60 tasks total (1-3 per day)
- Mix channels across the 30 days
- Include specific post ideas, not generic "post on social media"
- Reference the coupon code ${couponCode} in email and social tasks
- Include Etsy listing optimization tasks (renew, update tags, seasonal updates)
- Include Pinterest pin creation tasks (at least 5 pins over 30 days)
- Include at least 2 blog post tasks (product feature, how-to guide)
- Include at least 3 email tasks (launch, reminder, last chance)

Return ONLY a JSON array. No wrapper object. No markdown.`;
}

// ─── Internal: Normalize Tasks ───────────────────────────

const VALID_CHANNELS = new Set(["social", "email", "blog", "etsy", "pinterest"]);

function normalizeTasks(raw: unknown): CampaignTask[] {
  if (!Array.isArray(raw)) {
    console.warn("[campaign-generator] AI returned non-array, using fallback tasks");
    return generateFallbackTasks();
  }

  const tasks: CampaignTask[] = [];

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;

    const t = item as Record<string, unknown>;
    const day = typeof t.day === "number" ? Math.max(1, Math.min(30, Math.round(t.day))) : null;
    const task = typeof t.task === "string" ? t.task.slice(0, 500) : null;
    const channel = typeof t.channel === "string" && VALID_CHANNELS.has(t.channel) ? t.channel : null;

    if (day && task && channel) {
      tasks.push({
        day,
        task,
        channel: channel as CampaignTask["channel"],
        status: "pending",
      });
    }
  }

  if (tasks.length < 10) {
    console.warn(`[campaign-generator] AI returned only ${tasks.length} valid tasks, supplementing with fallbacks`);
    return [...tasks, ...generateFallbackTasks()];
  }

  return tasks;
}

// ─── Internal: Fallback Tasks ────────────────────────────

function generateFallbackTasks(): CampaignTask[] {
  return [
    { day: 1, task: "Create teaser post for Instagram/social — hint at upcoming product", channel: "social", status: "pending" },
    { day: 2, task: "Draft launch announcement email for subscriber list", channel: "email", status: "pending" },
    { day: 3, task: "Create 3 Pinterest pins with product preview images", channel: "pinterest", status: "pending" },
    { day: 4, task: "LAUNCH DAY: Publish announcement on all social channels with coupon code", channel: "social", status: "pending" },
    { day: 4, task: "Send launch email to full list with coupon code and direct link", channel: "email", status: "pending" },
    { day: 5, task: "Optimize Etsy listing tags based on first-day search data", channel: "etsy", status: "pending" },
    { day: 6, task: "Share customer-facing blog post featuring the product", channel: "blog", status: "pending" },
    { day: 7, task: "Post Instagram Story/Reel showcasing product features", channel: "social", status: "pending" },
    { day: 8, task: "Renew Etsy listing for fresh visibility boost", channel: "etsy", status: "pending" },
    { day: 10, task: "Create additional Pinterest pin variations with different keywords", channel: "pinterest", status: "pending" },
    { day: 12, task: "Post social proof / early feedback from customers", channel: "social", status: "pending" },
    { day: 14, task: "Write how-to guide blog post showing product in use", channel: "blog", status: "pending" },
    { day: 15, task: "Send mid-campaign email reminder with coupon code", channel: "email", status: "pending" },
    { day: 17, task: "Update Etsy listing photos with lifestyle/in-use images", channel: "etsy", status: "pending" },
    { day: 19, task: "Share behind-the-scenes creation story on social", channel: "social", status: "pending" },
    { day: 21, task: "Create Pinterest pin linking to blog how-to guide", channel: "pinterest", status: "pending" },
    { day: 23, task: "Post testimonial/review on social with product link", channel: "social", status: "pending" },
    { day: 25, task: "Send 'last chance' email — coupon expiring soon", channel: "email", status: "pending" },
    { day: 26, task: "Final Etsy listing renewal before campaign end", channel: "etsy", status: "pending" },
    { day: 28, task: "Create final Pinterest pin push with urgency messaging", channel: "pinterest", status: "pending" },
    { day: 29, task: "Post campaign results and thank-you on social", channel: "social", status: "pending" },
    { day: 30, task: "Review campaign metrics and plan next product launch", channel: "social", status: "pending" },
  ];
}
