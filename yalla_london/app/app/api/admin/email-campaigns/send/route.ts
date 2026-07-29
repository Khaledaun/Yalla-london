/**
 * Email Campaign Send API
 *
 * POST — Send an email campaign to subscribers, or send a test email
 *
 * Actions:
 *   { campaignId }                — Send campaign to all confirmed subscribers for the site
 *   { campaignId, testEmail }     — Send a test email to a single address
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-middleware";
import { sendEmail } from "@/lib/email/sender";

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { campaignId, testEmail } = body;

    if (!campaignId || typeof campaignId !== "string") {
      return NextResponse.json(
        { error: "campaignId is required" },
        { status: 400 }
      );
    }

    // Load the campaign
    const campaign = await prisma.emailCampaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    // -----------------------------------------------------------------------
    // Test send — send to a single address without updating campaign status
    // -----------------------------------------------------------------------
    if (testEmail && typeof testEmail === "string") {
      const result = await sendEmail({
        to: testEmail.trim(),
        subject: `[TEST] ${campaign.subject}`,
        html: campaign.htmlContent,
      });

      return NextResponse.json({
        test: true,
        sentTo: testEmail.trim(),
        success: result.success,
        messageId: result.messageId || null,
        error: result.error || null,
      });
    }

    // -----------------------------------------------------------------------
    // Full send — send to all confirmed subscribers for the campaign's site
    // -----------------------------------------------------------------------

    // Prevent re-sending a campaign that is already sending or sent
    if (campaign.status === "sending") {
      return NextResponse.json(
        { error: "Campaign is already being sent" },
        { status: 409 }
      );
    }
    if (campaign.status === "sent") {
      return NextResponse.json(
        { error: "Campaign has already been sent" },
        { status: 409 }
      );
    }

    // Fetch confirmed subscribers for this site
    const subscribers = await prisma.subscriber.findMany({
      where: {
        site_id: campaign.site,
        status: "CONFIRMED",
      },
      select: { id: true, email: true },
    });

    if (subscribers.length === 0) {
      return NextResponse.json(
        { error: "No confirmed subscribers found for this site" },
        { status: 422 }
      );
    }

    // Mark campaign as sending and set recipientCount
    await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: {
        status: "sending",
        recipientCount: subscribers.length,
      },
    });

    // Send emails one by one, collecting results
    let sentCount = 0;
    const errors: Array<{ email: string; error: string }> = [];

    for (const subscriber of subscribers) {
      const result = await sendEmail({
        to: subscriber.email,
        subject: campaign.subject,
        html: campaign.htmlContent,
      });

      if (result.success) {
        sentCount++;
      } else {
        errors.push({
          email: subscriber.email,
          error: result.error || "Unknown error",
        });
        console.warn(
          `[email-campaigns-send] Failed to send to ${subscriber.email}: ${result.error}`
        );
      }
    }

    // Update campaign with final counts and status
    const finalStatus = errors.length === subscribers.length ? "failed" : "sent";

    await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: {
        sentCount,
        status: finalStatus,
        sentAt: new Date(),
      },
    });

    // Update last_campaign_sent on subscribers that received the email
    if (sentCount > 0) {
      const sentEmails = subscribers
        .filter((s) => !errors.find((e) => e.email === s.email))
        .map((s) => s.id);

      if (sentEmails.length > 0) {
        await prisma.subscriber.updateMany({
          where: { id: { in: sentEmails } },
          data: { last_campaign_sent: new Date() },
        });
      }
    }

    return NextResponse.json({
      success: true,
      campaignId,
      status: finalStatus,
      recipientCount: subscribers.length,
      sentCount,
      errorCount: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("[email-campaigns-send] Send failed:", error);

    // Attempt to mark campaign as failed if we have the ID
    try {
      const { campaignId } = await request.clone().json().catch(() => ({}));
      if (campaignId) {
        await prisma.emailCampaign.update({
          where: { id: campaignId },
          data: { status: "failed" },
        });
      }
    } catch {
      console.warn("[email-campaigns-send] Could not mark campaign as failed after error");
    }

    return NextResponse.json(
      { error: "Failed to send email campaign" },
      { status: 500 }
    );
  }
}
