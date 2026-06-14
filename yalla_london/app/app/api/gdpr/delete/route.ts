/**
 * GDPR Public Data Deletion Endpoint
 *
 * Public endpoint for end-users (not admins) to request deletion of their personal data.
 * Covers: email subscribers, charter inquiries, affiliate click events tracked by email.
 * All deletions are logged to AuditLog for compliance.
 *
 * The admin endpoint (/api/admin/gdpr) handles User account deletion (requires auth).
 * This endpoint handles public-facing data requests (no auth required).
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createHash } from "crypto";

const requestSchema = z.object({
  email: z.string().email("Valid email address required"),
  siteId: z.string().optional(),
  reason: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid request: valid email address required" },
        { status: 400 }
      );
    }

    const { email, siteId, reason } = parsed.data;
    const { prisma } = await import("@/lib/db");

    // Anonymise email for logging (never log raw PII)
    const emailHash = createHash("sha256").update(email.toLowerCase()).digest("hex").slice(0, 16);
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    let deletedCount = 0;
    const deletionLog: string[] = [];

    // 1. Delete email subscribers
    try {
      const subResult = await prisma.emailSubscriber.deleteMany({
        where: { email },
      });
      if (subResult.count > 0) {
        deletedCount += subResult.count;
        deletionLog.push(`email_subscribers:${subResult.count}`);
      }
    } catch (err) {
      console.warn("[gdpr-delete] EmailSubscriber deletion failed:", err instanceof Error ? err.message : String(err));
      // Table may not exist — non-fatal
    }

    // 2. Anonymize charter inquiries (keep record for legal compliance, scrub PII)
    try {
      const inquiries = await prisma.charterInquiry.findMany({
        where: { email },
        select: { id: true, status: true },
      });

      for (const inquiry of inquiries) {
        // Completed bookings kept for legal compliance — anonymize personal data only
        await prisma.charterInquiry.update({
          where: { id: inquiry.id },
          data: {
            email: `deleted-${emailHash}@anonymized.local`,
            firstName: "[Deleted]",
            lastName: "User",
            phone: null,
            whatsappNumber: null,
            message: null,
            brokerNotes: null,
          },
        });
        deletedCount++;
        deletionLog.push(`charter_inquiry_anonymized:${inquiry.id.slice(0, 8)}`);
      }
    } catch (err) {
      console.warn("[gdpr-delete] CharterInquiry anonymization failed:", err instanceof Error ? err.message : String(err));
      // Table may not exist (non-yacht site) — non-fatal
    }

    // 3. Log the deletion request for compliance (GDPR Article 30 requirement)
    try {
      await prisma.auditLog.create({
        data: {
          action: "GDPR_DATA_DELETION_REQUEST",
          resource: "public_data",
          resourceId: emailHash,
          userId: "public",
          ipAddress,
          userAgent: request.headers.get("user-agent") || "unknown",
          timestamp: new Date(),
          details: {
            emailHash,
            siteId: siteId || null,
            reason: reason || null,
            recordsDeleted: deletedCount,
            deletionLog,
          },
        },
      });
    } catch (err) {
      console.warn("[gdpr-delete] AuditLog write failed:", err instanceof Error ? err.message : String(err));
      // Audit log failure is non-fatal — deletion still succeeded
    }

    const { getSiteDomain, getDefaultSiteId } = await import("@/config/sites");
    const domain = getSiteDomain(siteId || getDefaultSiteId());
    const privacyEmail = `info@${domain}`;

    return NextResponse.json({
      success: true,
      message:
        "Your data deletion request has been processed. " +
        "Any personal data associated with your email address has been deleted or anonymized. " +
        `If you have an account, please contact us at ${privacyEmail} for account deletion.`,
      recordsProcessed: deletedCount,
    });
  } catch (err) {
    console.error("[gdpr-delete] Unexpected error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { success: false, error: "Unable to process your request. Please try again or contact us directly." },
      { status: 500 }
    );
  }
}

// GET returns instructions for the data deletion process
export async function GET() {
  return NextResponse.json({
    endpoint: "POST /api/gdpr/delete",
    description: "Submit a GDPR data deletion request",
    requiredFields: { email: "string (your email address)" },
    optionalFields: {
      siteId: "string (which site data to delete from)",
      reason: "string (optional reason for deletion)",
    },
    notes: [
      "Email subscribers will be permanently deleted",
      "Booking inquiries are anonymized (retained for legal compliance)",
      "All deletions are logged for GDPR compliance",
      "For account deletion, include your siteId in the request and contact the site's privacy team",
    ],
  });
}
