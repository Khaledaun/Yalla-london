export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";
import { sendEmail } from "@/lib/email/sender";
import { getDefaultSiteId, getActiveSiteIds } from "@/config/sites";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProviderStatus {
  active: boolean;
  activeProvider: "resend" | "sendgrid" | "smtp" | null;
  providers: {
    resend: { configured: boolean; envKey: string };
    sendgrid: { configured: boolean; envKey: string };
    smtp: { configured: boolean; envVars: string[] };
  };
  setupInstructions: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildProviderStatus(): ProviderStatus {
  const resendConfigured = Boolean(process.env.RESEND_API_KEY);
  const sendgridConfigured = Boolean(process.env.SENDGRID_API_KEY);
  const smtpConfigured = Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS,
  );

  let activeProvider: "resend" | "sendgrid" | "smtp" | null = null;
  if (resendConfigured) activeProvider = "resend";
  else if (sendgridConfigured) activeProvider = "sendgrid";
  else if (smtpConfigured) activeProvider = "smtp";

  const active = activeProvider !== null;

  let setupInstructions =
    "Email is configured and ready to send. No action needed.";
  if (!active) {
    setupInstructions =
      "No email provider is configured. " +
      "Add one of the following to your Vercel environment variables: " +
      "RESEND_API_KEY (recommended — get it at resend.com), " +
      "SENDGRID_API_KEY (sendgrid.com), " +
      "or all three of SMTP_HOST + SMTP_USER + SMTP_PASS for a custom SMTP server. " +
      "Redeploy after adding the variable.";
  }

  return {
    active,
    activeProvider,
    providers: {
      resend: { configured: resendConfigured, envKey: "RESEND_API_KEY" },
      sendgrid: { configured: sendgridConfigured, envKey: "SENDGRID_API_KEY" },
      smtp: {
        configured: smtpConfigured,
        envVars: ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"],
      },
    },
    setupInstructions,
  };
}

// ---------------------------------------------------------------------------
// GET — Email center dashboard data
// ---------------------------------------------------------------------------

export const GET = withAdminAuth(async (request: NextRequest) => {
  const { prisma } = await import("@/lib/db");

  const providerStatus = buildProviderStatus();
  const activeSiteIds = getActiveSiteIds();

  // -------------------------------------------------------------------------
  // Campaigns — P2021 = table does not exist; return [] gracefully
  // -------------------------------------------------------------------------
  let campaigns: Array<{
    id: string;
    name: string;
    status: string;
    sentAt: string | null;
    recipientCount: number;
    createdAt: string;
  }> = [];

  try {
    const rows = await prisma.emailCampaign.findMany({
      where: { site: { in: activeSiteIds } },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        name: true,
        status: true,
        sentAt: true,
        recipientCount: true,
        createdAt: true,
      },
    });
    campaigns = rows.map((r) => ({
      id: r.id,
      name: r.name,
      status: r.status,
      sentAt: r.sentAt ? r.sentAt.toISOString() : null,
      recipientCount: r.recipientCount,
      createdAt: r.createdAt.toISOString(),
    }));
  } catch (err: unknown) {
    const code =
      err && typeof err === "object" && "code" in err
        ? (err as { code: string }).code
        : null;
    if (code !== "P2021") {
      console.warn("[email-center] Failed to query EmailCampaign:", err instanceof Error ? err.message : err);
    }
    // else: table doesn't exist yet — return empty array silently
  }

  // -------------------------------------------------------------------------
  // Templates
  // -------------------------------------------------------------------------
  let templates: Array<{
    id: string;
    name: string;
    subject: string;
    type: string;
    updatedAt: string;
  }> = [];

  try {
    const rows = await prisma.emailTemplate.findMany({
      where: { site: { in: activeSiteIds } },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        name: true,
        subject: true,
        type: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    templates = rows.map((r) => ({
      id: r.id,
      name: r.name,
      subject: r.subject ?? "",
      type: r.type ?? "campaign",
      updatedAt: (r.updatedAt ?? r.createdAt).toISOString(),
    }));
  } catch (err: unknown) {
    const code =
      err && typeof err === "object" && "code" in err
        ? (err as { code: string }).code
        : null;
    if (code !== "P2021") {
      console.warn("[email-center] Failed to query EmailTemplate:", err instanceof Error ? err.message : err);
    }
  }

  // -------------------------------------------------------------------------
  // Subscribers — count total + per site
  // -------------------------------------------------------------------------
  let subscriberTotal = 0;
  const subscribersBySite: Record<string, number> = {};

  try {
    const grouped = await prisma.subscriber.groupBy({
      by: ["site_id"],
      _count: { id: true },
    });
    for (const row of grouped) {
      const siteKey = row.site_id ?? "unknown";
      subscribersBySite[siteKey] = row._count.id;
      subscriberTotal += row._count.id;
    }
  } catch (err: unknown) {
    const code =
      err && typeof err === "object" && "code" in err
        ? (err as { code: string }).code
        : null;
    if (code !== "P2021") {
      console.warn("[email-center] Failed to query Subscriber:", err instanceof Error ? err.message : err);
    }
  }

  // -------------------------------------------------------------------------
  // Recent Activity — derive from latest campaigns
  // -------------------------------------------------------------------------
  const recentActivity = campaigns
    .filter(
      (c) =>
        c.status === "sent" ||
        c.status === "failed" ||
        c.status === "scheduled",
    )
    .slice(0, 10)
    .map((c) => ({
      type: c.status as "sent" | "failed" | "scheduled",
      campaignName: c.name,
      timestamp: c.sentAt ?? c.createdAt,
      recipients: c.recipientCount,
    }));

  // Flatten providerStatus into the shape the Email Center page expects:
  // { resend: boolean, sendgrid: boolean, smtp: boolean, active: boolean, activeProvider: string | null }
  const flatProviderStatus = {
    active: providerStatus.active,
    activeProvider: providerStatus.activeProvider,
    resend: providerStatus.providers.resend.configured,
    sendgrid: providerStatus.providers.sendgrid.configured,
    smtp: providerStatus.providers.smtp.configured,
  };

  return NextResponse.json({
    providerStatus: flatProviderStatus,
    campaigns,
    templates,
    subscriberCount: subscriberTotal,
    subscribers: {
      total: subscriberTotal,
      bySite: subscribersBySite,
    },
    recentActivity,
  });
});

// ---------------------------------------------------------------------------
// POST — Actions
// ---------------------------------------------------------------------------

export const POST = withAdminAuth(async (request: NextRequest) => {
  const { prisma } = await import("@/lib/db");

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const action = body.action as string | undefined;
  if (!action) {
    return NextResponse.json(
      { success: false, error: "Missing required field: action" },
      { status: 400 },
    );
  }

  // -------------------------------------------------------------------------
  // Action: test_send
  // -------------------------------------------------------------------------
  if (action === "test_send") {
    const to = body.to as string | undefined;
    if (!to || typeof to !== "string" || !to.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Invalid or missing 'to' email address" },
        { status: 400 },
      );
    }

    const result = await sendEmail({
      to,
      subject: "Cockpit Test Email",
      html: "<p>This is a test email from your Cockpit dashboard.</p>",
      plainText: "This is a test email from your Cockpit dashboard.",
    });

    const providerStatus = buildProviderStatus();

    return NextResponse.json({
      success: result.success,
      error: result.success ? undefined : result.error,
      provider: providerStatus.activeProvider,
    });
  }

  // -------------------------------------------------------------------------
  // Action: create_template
  // -------------------------------------------------------------------------
  if (action === "create_template") {
    const name = body.name as string | undefined;
    const subject = body.subject as string | undefined;
    const htmlBody = body.htmlBody as string | undefined;
    const siteId = (body.siteId as string | undefined) ?? getDefaultSiteId();

    if (!name || !subject || !htmlBody) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: name, subject, htmlBody",
        },
        { status: 400 },
      );
    }

    try {
      const template = await prisma.emailTemplate.create({
        data: {
          name,
          subject,
          htmlContent: htmlBody,
          site: siteId,
          type: "campaign",
        },
        select: { id: true },
      });

      return NextResponse.json({ success: true, id: template.id });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create template";
      console.warn("[email-center] create_template failed:", message);
      return NextResponse.json(
        { success: false, error: "Could not save template — database error" },
        { status: 500 },
      );
    }
  }

  // -------------------------------------------------------------------------
  // Action: send_campaign
  // -------------------------------------------------------------------------
  if (action === "send_campaign") {
    const campaignId = body.campaignId as string | undefined;
    if (!campaignId) {
      return NextResponse.json(
        { success: false, error: "Missing required field: campaignId" },
        { status: 400 },
      );
    }

    try {
      const campaign = await prisma.emailCampaign.findUnique({
        where: { id: campaignId },
      });

      if (!campaign) {
        return NextResponse.json(
          { success: false, error: "Campaign not found" },
          { status: 404 },
        );
      }

      if (campaign.status === "sent") {
        return NextResponse.json(
          { success: false, error: "Campaign has already been sent" },
          { status: 400 },
        );
      }

      // Mark as sending — the actual send logic would be handled by a
      // dedicated background process or cron job once the subscriber list
      // and batch-send infrastructure is wired up.
      await prisma.emailCampaign.update({
        where: { id: campaignId },
        data: { status: "sending" },
      });

      return NextResponse.json({ success: true });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update campaign";
      console.warn("[email-center] send_campaign failed:", message);
      return NextResponse.json(
        {
          success: false,
          error: "Could not start campaign — database error",
        },
        { status: 500 },
      );
    }
  }

  // -------------------------------------------------------------------------
  // Unknown action
  // -------------------------------------------------------------------------
  return NextResponse.json(
    {
      success: false,
      error: `Unknown action: ${action}. Valid actions: test_send, create_template, send_campaign`,
    },
    { status: 400 },
  );
});
