/**
 * Retention Executor — Processes Due Retention Emails
 *
 * Schedule: Every 4 hours (0:30, 4:30, 8:30, 12:30, 16:30, 20:30 UTC)
 * Budget: 280s (300s maxDuration - 20s buffer)
 *
 * Three responsibilities:
 *   1. Send due retention emails (welcome series, post-booking follow-ups)
 *   2. Trigger re-engagement for inactive subscribers (30d+)
 *   3. Auto-seed default sequences on first run
 */

import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const BUDGET_MS = 280_000;

async function handler(request: NextRequest) {
  const startTime = Date.now();

  // Feature flag guard
  const { checkCronEnabled } = await import("@/lib/cron-feature-guard");
  const blocked = await checkCronEnabled("retention-executor");
  if (blocked) return blocked;

  // CRON_SECRET auth
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const { getActiveSiteIds } = await import("@/config/sites");
  const siteIds = getActiveSiteIds();

  let totalSent = 0;
  let totalAdvanced = 0;
  let totalReEngaged = 0;
  let totalSeeded = 0;
  let overallStatus: "completed" | "failed" | "timed_out" = "completed";
  const errors: string[] = [];

  try {
    // Eagerly connect DB — prevents cold-start "Engine is not yet connected" crashes
    const { prisma } = await import("@/lib/db");
    try { await prisma.$connect(); } catch { /* already connected */ }

    // Import all dependencies in one block — if retention module is broken, fail fast
    let seedDefaultSequences: (siteId: string) => Promise<number>;
    let getDueEmails: (limit: number) => Promise<Array<{ subscriberId: string; sequenceId: string; siteId: string; progressId: string; step: { subject: string; templateId: string } }>>;
    let advanceStep: (progressId: string) => Promise<{ advanced: boolean }>;
    let startSequence: (siteId: string, subscriberId: string, trigger: string) => Promise<{ started: boolean }>;
    let findInactiveSubscribers: (siteId: string, daysInactive: number, limit: number) => Promise<string[]>;
    let pauseSequence: (sequenceId: string, subscriberId: string, reason?: "paused" | "unsubscribed") => Promise<boolean>;

    try {
      const mod = await import("@/lib/agents/crm/retention");
      seedDefaultSequences = mod.seedDefaultSequences;
      getDueEmails = mod.getDueEmails;
      advanceStep = mod.advanceStep;
      startSequence = mod.startSequence;
      findInactiveSubscribers = mod.findInactiveSubscribers;
      pauseSequence = mod.pauseSequence;
    } catch (importErr) {
      const msg = `Retention module import failed: ${importErr instanceof Error ? importErr.message : String(importErr)}`;
      console.warn(`[retention-executor] ${msg} — nothing to do, returning success`);
      try {
        const { logCronExecution } = await import("@/lib/cron-logger");
        await logCronExecution("retention-executor", "failed", {
          durationMs: Date.now() - startTime,
          itemsProcessed: 0,
          resultSummary: { message: msg, emailsSent: 0 },
        });
      } catch { /* best effort */ }
      return NextResponse.json({ success: false, durationMs: Date.now() - startTime, emailsSent: 0, note: msg });
    }

    // -----------------------------------------------------------------------
    // Step 1: Seed default sequences for any site that doesn't have them
    // -----------------------------------------------------------------------
    for (const siteId of siteIds) {
      if (siteId === "zenitha-yachts-med") continue;
      if (Date.now() - startTime > BUDGET_MS - 60_000) break;

      try {
        const seeded = await seedDefaultSequences(siteId);
        if (seeded > 0) totalSeeded += seeded;
      } catch (err) {
        console.warn(`[retention-executor] Seed failed for ${siteId}:`, err instanceof Error ? err.message : String(err));
      }
    }

    // -----------------------------------------------------------------------
    // Step 2: Process due retention emails
    // -----------------------------------------------------------------------
    // Import email service and config ONCE outside the loop (not per-email)
    const { sendEmail } = await import("@/lib/email/sender");
    const { getSiteConfig: getSiteConf } = await import("@/config/sites");

    let dueEmails: Awaited<ReturnType<typeof getDueEmails>>;
    try {
      dueEmails = await getDueEmails(50);
    } catch (schemaErr: unknown) {
      const msg = schemaErr instanceof Error ? schemaErr.message : String(schemaErr);
      // Detect missing table (relation does not exist) — migration not yet applied
      if (msg.includes("does not exist") || msg.includes("P2010") || msg.includes("P2021")) {
        console.warn("[retention-executor] retention_progress table missing — run Fix Database in admin. Skipping.");
        try {
          const { logCronExecution } = await import("@/lib/cron-logger");
          await logCronExecution("retention-executor", "completed", {
            durationMs: Date.now() - startTime,
            itemsProcessed: 0,
            resultSummary: { message: "SCHEMA_MIGRATION_REQUIRED: retention_progress table missing" },
          });
        } catch (_logErr) { /* ignore */ }
        return NextResponse.json({
          success: true,
          durationMs: Date.now() - startTime,
          emailsSent: 0,
          note: "SCHEMA_MIGRATION_REQUIRED",
        });
      }
      throw schemaErr; // Re-throw unexpected errors
    }

    for (const due of dueEmails) {
      if (Date.now() - startTime > BUDGET_MS - 30_000) break;

      try {
        // Look up the subscriber to get their email
        const subscriber = await prisma.subscriber.findUnique({
          where: { id: due.subscriberId },
          select: { id: true, email: true, name: true, status: true, locale: true },
        });

        if (!subscriber || subscriber.status === "UNSUBSCRIBED" || subscriber.status === "BOUNCED") {
          // Skip unsubscribed/bounced — mark progress as paused
          await pauseSequence(due.sequenceId, due.subscriberId, "unsubscribed");
          continue;
        }

        // Determine which email to send based on step templateId
        const siteConfig = getSiteConf(due.siteId);
        const siteName = siteConfig?.name || "Yalla London";
        const locale = (subscriber.locale as string) || "en";

        // Build subject with variable replacement
        const subject = due.step.subject
          .replace("{{siteName}}", siteName)
          .replace("{{name}}", subscriber.name || "there");

        // Build simple HTML email based on templateId
        const html = buildRetentionEmail(due.step.templateId, {
          name: subscriber.name || "there",
          siteName,
          siteId: due.siteId,
          locale,
        });

        await sendEmail({
          to: subscriber.email,
          subject,
          html,
        });

        // Advance to next step (or complete the sequence)
        const result = await advanceStep(due.progressId);
        totalSent++;
        if (result.advanced) totalAdvanced++;
      } catch (err) {
        const msg = `Email failed for subscriber ${due.subscriberId}: ${err instanceof Error ? err.message : String(err)}`;
        console.warn(`[retention-executor] ${msg}`);
        errors.push(msg);
      }
    }

    // -----------------------------------------------------------------------
    // Step 3: Trigger re-engagement for inactive subscribers
    // -----------------------------------------------------------------------
    for (const siteId of siteIds) {
      if (siteId === "zenitha-yachts-med") continue;
      if (Date.now() - startTime > BUDGET_MS - 15_000) break;

      try {
        const inactiveIds = await findInactiveSubscribers(siteId, 30, 20);

        for (const subscriberId of inactiveIds) {
          if (Date.now() - startTime > BUDGET_MS - 10_000) break;

          try {
            const result = await startSequence(siteId, subscriberId, "30d_inactive");
            if (result.started) totalReEngaged++;
          } catch (err) {
            console.warn(`[retention-executor] Re-engage failed for ${subscriberId}:`, err instanceof Error ? err.message : String(err));
          }
        }
      } catch (err) {
        console.warn(`[retention-executor] Inactive scan failed for ${siteId}:`, err instanceof Error ? err.message : String(err));
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[retention-executor] Fatal error:", msg);
    errors.push(msg);
    overallStatus = "failed";
  }

  if (errors.length > 0 && totalSent === 0) {
    overallStatus = "failed";
  }

  // Log to CronJobLog
  try {
    const { logCronExecution } = await import("@/lib/cron-logger");
    await logCronExecution("retention-executor", overallStatus, {
      durationMs: Date.now() - startTime,
      itemsProcessed: totalSent,
      errorMessage: errors.length > 0 ? errors.join("; ") : undefined,
      resultSummary: {
        emailsSent: totalSent,
        stepsAdvanced: totalAdvanced,
        reEngaged: totalReEngaged,
        sequencesSeeded: totalSeeded,
        errors: errors.length,
      },
    });
  } catch (err) {
    console.warn("[retention-executor] Log failed:", err instanceof Error ? err.message : String(err));
  }

  return NextResponse.json({
    success: overallStatus === "completed",
    durationMs: Date.now() - startTime,
    emailsSent: totalSent,
    stepsAdvanced: totalAdvanced,
    reEngaged: totalReEngaged,
    sequencesSeeded: totalSeeded,
    errors: errors.length,
  });
}

// ---------------------------------------------------------------------------
// Simple HTML email builder for retention templates
// ---------------------------------------------------------------------------

function buildRetentionEmail(
  templateId: string,
  ctx: { name: string; siteName: string; siteId: string; locale: string },
): string {
  const greeting = ctx.locale === "ar" ? `مرحباً ${ctx.name}` : `Hi ${ctx.name}`;

  const templates: Record<string, string> = {
    welcome: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h1 style="color:#1a1a2e;font-size:24px;">${greeting}!</h1>
        <p style="color:#333;font-size:16px;line-height:1.6;">
          Welcome to ${ctx.siteName}! We're thrilled to have you as part of our community.
        </p>
        <p style="color:#333;font-size:16px;line-height:1.6;">
          We curate the finest luxury travel guides, insider tips, and exclusive recommendations — all designed to make your trips unforgettable.
        </p>
        <p style="color:#333;font-size:16px;line-height:1.6;">
          Stay tuned for our handpicked guides and hidden gems.
        </p>
        <p style="color:#888;font-size:14px;margin-top:32px;">— The ${ctx.siteName} Team</p>
      </div>`,
    top_articles: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h1 style="color:#1a1a2e;font-size:24px;">${greeting},</h1>
        <p style="color:#333;font-size:16px;line-height:1.6;">
          Here are some of our most popular guides that our readers love:
        </p>
        <p style="color:#333;font-size:16px;line-height:1.6;">
          Visit ${ctx.siteName} to explore our latest articles and discover new travel inspiration.
        </p>
        <p style="color:#888;font-size:14px;margin-top:32px;">— The ${ctx.siteName} Team</p>
      </div>`,
    newsletter_invite: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h1 style="color:#1a1a2e;font-size:24px;">${greeting},</h1>
        <p style="color:#333;font-size:16px;line-height:1.6;">
          Did you know we send a weekly digest with our best new content? You're already subscribed — you'll receive it every week automatically.
        </p>
        <p style="color:#333;font-size:16px;line-height:1.6;">
          Each digest includes our top articles, travel tips, and exclusive deals.
        </p>
        <p style="color:#888;font-size:14px;margin-top:32px;">— The ${ctx.siteName} Team</p>
      </div>`,
    miss_you: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h1 style="color:#1a1a2e;font-size:24px;">${greeting},</h1>
        <p style="color:#333;font-size:16px;line-height:1.6;">
          We noticed you haven't visited ${ctx.siteName} in a while. We've been busy creating amazing new content!
        </p>
        <p style="color:#333;font-size:16px;line-height:1.6;">
          Come check out what's new — we've added fresh guides, insider tips, and exclusive recommendations.
        </p>
        <p style="color:#888;font-size:14px;margin-top:32px;">— The ${ctx.siteName} Team</p>
      </div>`,
    booking_followup: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h1 style="color:#1a1a2e;font-size:24px;">${greeting},</h1>
        <p style="color:#333;font-size:16px;line-height:1.6;">
          Thank you for your recent booking! We hope you're looking forward to your trip.
        </p>
        <p style="color:#333;font-size:16px;line-height:1.6;">
          Need travel tips for your destination? Visit ${ctx.siteName} for our curated guides covering restaurants, experiences, and insider recommendations.
        </p>
        <p style="color:#888;font-size:14px;margin-top:32px;">— The ${ctx.siteName} Team</p>
      </div>`,

    // ── Charter Inquiry Drip Sequence (5 emails) ──────────────────
    charter_thankyou: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h1 style="color:#0a1628;font-size:24px;">${greeting},</h1>
        <p style="color:#333;font-size:16px;line-height:1.6;">
          Thank you for your charter inquiry with ${ctx.siteName}. We've received your request and our charter specialists are reviewing it now.
        </p>
        <h2 style="color:#0a1628;font-size:18px;margin-top:24px;">What happens next:</h2>
        <ol style="color:#333;font-size:16px;line-height:1.8;">
          <li><strong>Within 24 hours</strong> — A dedicated charter advisor will reach out to discuss your preferences.</li>
          <li><strong>Yacht shortlist</strong> — We'll prepare a curated selection of yachts matching your requirements.</li>
          <li><strong>Tailored proposal</strong> — You'll receive a detailed itinerary and pricing for your chosen yacht.</li>
        </ol>
        <p style="color:#333;font-size:16px;line-height:1.6;">
          In the meantime, feel free to browse our <a href="https://zenithayachts.com/destinations" style="color:#c49a2a;">destination guides</a> for inspiration.
        </p>
        <p style="color:#888;font-size:14px;margin-top:32px;">— The ${ctx.siteName} Charter Team</p>
      </div>`,

    charter_destination_inspiration: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h1 style="color:#0a1628;font-size:24px;">${greeting},</h1>
        <p style="color:#333;font-size:16px;line-height:1.6;">
          While we prepare your personalised yacht selection, here's some inspiration for your Mediterranean charter:
        </p>
        <div style="margin:20px 0;padding:16px;background:#f8f6f2;border-radius:8px;">
          <h3 style="color:#0a1628;margin:0 0 8px;">🇬🇷 Greek Islands</h3>
          <p style="color:#555;font-size:14px;margin:0;">Crystal-clear waters, ancient ruins, and world-class cuisine. The Cyclades and Ionian islands offer something for everyone.</p>
        </div>
        <div style="margin:20px 0;padding:16px;background:#f8f6f2;border-radius:8px;">
          <h3 style="color:#0a1628;margin:0 0 8px;">🇭🇷 Croatian Coast</h3>
          <p style="color:#555;font-size:14px;margin:0;">Historic Dubrovnik, stunning Hvar, and over 1,000 islands to explore at your own pace.</p>
        </div>
        <div style="margin:20px 0;padding:16px;background:#f8f6f2;border-radius:8px;">
          <h3 style="color:#0a1628;margin:0 0 8px;">🇹🇷 Turkish Riviera</h3>
          <p style="color:#555;font-size:14px;margin:0;">Where East meets West — turquoise bays, gulet sailing, and halal-friendly hospitality throughout.</p>
        </div>
        <p style="color:#333;font-size:16px;line-height:1.6;">
          Explore all destinations at <a href="https://zenithayachts.com/destinations" style="color:#c49a2a;">zenithayachts.com/destinations</a>.
        </p>
        <p style="color:#888;font-size:14px;margin-top:32px;">— The ${ctx.siteName} Charter Team</p>
      </div>`,

    charter_planning_guide: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h1 style="color:#0a1628;font-size:24px;">${greeting},</h1>
        <p style="color:#333;font-size:16px;line-height:1.6;">
          Planning your first (or next) yacht charter? Here's everything you need to know:
        </p>
        <h2 style="color:#0a1628;font-size:18px;margin-top:24px;">Charter Essentials</h2>
        <ul style="color:#333;font-size:16px;line-height:1.8;">
          <li><strong>Best time to book:</strong> 3–6 months ahead for peak season (June–September). Last-minute deals available in shoulder season.</li>
          <li><strong>What's included:</strong> Professional crew, fuel, water toys, and gourmet meals prepared by an onboard chef.</li>
          <li><strong>Halal catering:</strong> Available on most yachts — just let your advisor know your dietary preferences.</li>
          <li><strong>Family-friendly:</strong> Many yachts carry water toys, snorkelling gear, and have child-safe layouts.</li>
          <li><strong>Typical charter:</strong> 7 days, but we arrange 3-day weekend getaways to 14-day grand voyages.</li>
        </ul>
        <p style="color:#333;font-size:16px;line-height:1.6;">
          Have questions? Reply to this email or use our <a href="https://zenithayachts.com/charter-planner" style="color:#c49a2a;">Charter Planner</a> to refine your preferences.
        </p>
        <p style="color:#888;font-size:14px;margin-top:32px;">— The ${ctx.siteName} Charter Team</p>
      </div>`,

    charter_featured_yachts: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h1 style="color:#0a1628;font-size:24px;">${greeting},</h1>
        <p style="color:#333;font-size:16px;line-height:1.6;">
          Based on your inquiry, we've handpicked some exceptional yachts that could be perfect for your charter:
        </p>
        <div style="margin:20px 0;padding:16px;border:1px solid #e8e4dd;border-radius:8px;">
          <h3 style="color:#0a1628;margin:0 0 4px;">Motor Yachts from €15,000/week</h3>
          <p style="color:#555;font-size:14px;margin:0;">Speed, luxury, and spacious decks. Ideal for island-hopping with style.</p>
        </div>
        <div style="margin:20px 0;padding:16px;border:1px solid #e8e4dd;border-radius:8px;">
          <h3 style="color:#0a1628;margin:0 0 4px;">Gulets from €8,000/week</h3>
          <p style="color:#555;font-size:14px;margin:0;">Traditional wooden sailing yachts with modern comforts. The authentic Mediterranean experience.</p>
        </div>
        <div style="margin:20px 0;padding:16px;border:1px solid #e8e4dd;border-radius:8px;">
          <h3 style="color:#0a1628;margin:0 0 4px;">Catamarans from €10,000/week</h3>
          <p style="color:#555;font-size:14px;margin:0;">Stability, space, and shallow draft — perfect for families and first-time charterers.</p>
        </div>
        <p style="color:#333;font-size:16px;line-height:1.6;">
          Browse our full fleet at <a href="https://zenithayachts.com/yachts" style="color:#c49a2a;">zenithayachts.com/yachts</a> or reply to discuss availability.
        </p>
        <p style="color:#888;font-size:14px;margin-top:32px;">— The ${ctx.siteName} Charter Team</p>
      </div>`,

    charter_limited_availability: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h1 style="color:#0a1628;font-size:24px;">${greeting},</h1>
        <p style="color:#333;font-size:16px;line-height:1.6;">
          Just a quick update — peak Mediterranean charter season fills up fast, and availability for the most sought-after yachts is limited.
        </p>
        <div style="margin:20px 0;padding:16px;background:#fdf6e3;border-left:4px solid #c49a2a;border-radius:4px;">
          <p style="color:#333;font-size:16px;line-height:1.6;margin:0;">
            <strong>Did you know?</strong> Over 60% of premium charter yachts are booked 4+ months in advance for July and August. Early booking also means better pricing and first pick of itineraries.
          </p>
        </div>
        <p style="color:#333;font-size:16px;line-height:1.6;">
          If you're still considering your charter, now's the ideal time to lock in your dates. We can hold a yacht for 48 hours while you decide — no commitment.
        </p>
        <p style="color:#333;font-size:16px;line-height:1.6;">
          <a href="https://zenithayachts.com/charter-planner" style="color:#c49a2a;font-weight:bold;">Start planning your charter →</a>
        </p>
        <p style="color:#888;font-size:14px;margin-top:32px;">— The ${ctx.siteName} Charter Team</p>
      </div>`,
  };

  return templates[templateId] || templates.welcome;
}

export async function GET(request: NextRequest) {
  return handler(request);
}

export async function POST(request: NextRequest) {
  return handler(request);
}
