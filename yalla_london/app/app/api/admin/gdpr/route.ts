/**
 * Admin GDPR API - Data Export & Right to Be Forgotten
 *
 * GET  /api/admin/gdpr?email=...  → Export all user data as JSON download
 * DELETE /api/admin/gdpr           → Soft-delete user and anonymize personal data
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";
import { prisma } from "@/lib/db";
import { z } from "zod";
import crypto from "crypto";

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const ExportQuerySchema = z.object({
  email: z
    .string()
    .min(1, "Email parameter is required")
    .email("A valid email address is required"),
});

const DeleteBodySchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("A valid email address is required"),
});

// ---------------------------------------------------------------------------
// GET  /api/admin/gdpr?email=user@example.com
// Export all data associated with the given email (GDPR data portability).
// Returns a JSON file download.
// ---------------------------------------------------------------------------

export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const validation = ExportQuerySchema.safeParse(
      Object.fromEntries(searchParams.entries()),
    );

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          details: validation.error.issues,
        },
        { status: 400 },
      );
    }

    const { email } = validation.data;

    // Look up the user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        role: true,
        permissions: true,
        isActive: true,
        deletedAt: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Gather all related records in parallel
    const [blogPosts, mediaAssets, leads, auditLogs] = await Promise.all([
      // Blog posts authored by this user
      prisma.blogPost.findMany({
        where: { author_id: user.id },
        select: {
          id: true,
          title_en: true,
          title_ar: true,
          slug: true,
          excerpt_en: true,
          excerpt_ar: true,
          content_en: true,
          content_ar: true,
          featured_image: true,
          published: true,
          category_id: true,
          tags: true,
          page_type: true,
          siteId: true,
          created_at: true,
          updated_at: true,
          deletedAt: true,
        },
        orderBy: { created_at: "desc" },
      }),

      // Media assets – the schema has no direct user FK, so we pull assets
      // linked to blog posts authored by this user via featured_image URLs.
      prisma.mediaAsset.findMany({
        where: {
          url: {
            in: (
              await prisma.blogPost.findMany({
                where: { author_id: user.id, featured_image: { not: null } },
                select: { featured_image: true },
              })
            )
              .map((p) => p.featured_image)
              .filter(Boolean) as string[],
          },
        },
        select: {
          id: true,
          filename: true,
          original_name: true,
          url: true,
          file_type: true,
          mime_type: true,
          file_size: true,
          width: true,
          height: true,
          alt_text: true,
          title: true,
          description: true,
          tags: true,
          created_at: true,
          updated_at: true,
          deletedAt: true,
        },
        orderBy: { created_at: "desc" },
      }),

      // Leads matching the user's email across all sites
      prisma.lead.findMany({
        where: { email },
        select: {
          id: true,
          site_id: true,
          email: true,
          name: true,
          phone: true,
          lead_type: true,
          lead_source: true,
          interests_json: true,
          budget_range: true,
          travel_dates: true,
          party_size: true,
          score: true,
          status: true,
          marketing_consent: true,
          consent_at: true,
          created_at: true,
          updated_at: true,
        },
        orderBy: { created_at: "desc" },
      }),

      // Audit logs for this user
      prisma.auditLog.findMany({
        where: { userId: user.id },
        select: {
          id: true,
          action: true,
          resource: true,
          resourceId: true,
          details: true,
          ipAddress: true,
          userAgent: true,
          success: true,
          errorMessage: true,
          timestamp: true,
        },
        orderBy: { timestamp: "desc" },
      }),
    ]);

    // Assemble the export payload
    const exportData = {
      exportedAt: new Date().toISOString(),
      dataSubject: email,
      user,
      blogPosts,
      mediaAssets,
      leads,
      auditLogs,
      _meta: {
        blogPostCount: blogPosts.length,
        mediaAssetCount: mediaAssets.length,
        leadCount: leads.length,
        auditLogCount: auditLogs.length,
      },
    };

    // Return as a downloadable JSON file
    const filename = `gdpr-export-${email.replace(/[^a-zA-Z0-9]/g, "_")}-${Date.now()}.json`;

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("GDPR data export error:", error);
    return NextResponse.json(
      { error: "Failed to export user data" },
      { status: 500 },
    );
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/admin/gdpr
// Right to be forgotten: soft-delete the user and anonymize personal data.
// ---------------------------------------------------------------------------

export const DELETE = withAdminAuth(async (request: NextRequest) => {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Request body must be valid JSON" },
        { status: 400 },
      );
    }

    const validation = DeleteBodySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: validation.error.issues,
        },
        { status: 400 },
      );
    }

    const { email } = validation.data;

    // Verify the user exists
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, deletedAt: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.deletedAt) {
      return NextResponse.json(
        { error: "User has already been deleted" },
        { status: 409 },
      );
    }

    // Generate a deterministic but irreversible anonymized email so the
    // unique constraint is preserved without revealing the original address.
    const anonymizedHash = crypto
      .createHash("sha256")
      .update(user.email + user.id)
      .digest("hex")
      .slice(0, 16);
    const anonymizedEmail = `deleted-${anonymizedHash}@anonymized.local`;
    const now = new Date();

    // Run all mutations inside a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Soft-delete and anonymize the user record
      await tx.user.update({
        where: { id: user.id },
        data: {
          name: "Deleted User",
          email: anonymizedEmail,
          image: null,
          isActive: false,
          deletedAt: now,
        },
      });

      // 2. Remove active sessions so the user is logged out immediately
      await tx.session.deleteMany({
        where: { userId: user.id },
      });

      // 3. Remove account provider links
      await tx.account.deleteMany({
        where: { userId: user.id },
      });

      // 4. Anonymize leads that match the original email
      await tx.lead.updateMany({
        where: { email },
        data: {
          email: anonymizedEmail,
          name: "Deleted User",
          phone: null,
          marketing_consent: false,
        },
      });

      // 5. Redact IP addresses in audit logs (retain actions for compliance)
      await tx.auditLog.updateMany({
        where: { userId: user.id },
        data: {
          ipAddress: null,
          userAgent: null,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "User data has been anonymized and the account soft-deleted",
      anonymizedEmail,
      deletedAt: now.toISOString(),
    });
  } catch (error) {
    console.error("GDPR deletion error:", error);
    return NextResponse.json(
      { error: "Failed to process deletion request" },
      { status: 500 },
    );
  }
});
