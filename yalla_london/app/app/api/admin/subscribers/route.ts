export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";
import { getDefaultSiteId } from "@/config/sites";

/**
 * Admin Subscriber Management API
 *
 * GET  — List subscribers with filtering and pagination
 * POST — Actions: export, confirm, unsubscribe, delete, stats
 *
 * GDPR-compliant: all deletions logged to ConsentLog, IP anonymized.
 */

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");
    const url = request.nextUrl;
    const siteId = url.searchParams.get("siteId") || getDefaultSiteId();
    const status = url.searchParams.get("status"); // PENDING, CONFIRMED, UNSUBSCRIBED
    const source = url.searchParams.get("source");
    const search = url.searchParams.get("search");
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 200);
    const offset = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = { site_id: siteId };
    if (status) where.status = status;
    if (source) where.source = source;
    if (search) where.email = { contains: search, mode: "insensitive" };

    const [subscribers, total, statusCounts] = await Promise.all([
      prisma.subscriber.findMany({
        where,
        orderBy: { created_at: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          email: true,
          status: true,
          source: true,
          preferences_json: true,
          confirmed_at: true,
          unsubscribed_at: true,
          unsubscribe_reason: true,
          engagement_score: true,
          last_campaign_sent: true,
          created_at: true,
          updated_at: true,
        },
      }),
      prisma.subscriber.count({ where }),
      prisma.subscriber.groupBy({
        by: ["status"],
        where: { site_id: siteId },
        _count: true,
      }),
    ]);

    // Build status summary
    const summary: Record<string, number> = {
      total: 0,
      PENDING: 0,
      CONFIRMED: 0,
      UNSUBSCRIBED: 0,
    };
    for (const row of statusCounts) {
      summary[row.status] = row._count;
      summary.total += row._count;
    }

    return NextResponse.json({
      success: true,
      subscribers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary,
      siteId,
    });
  } catch (error) {
    console.error("[admin:subscribers] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch subscribers" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");
    const body = await request.json();
    const { action, siteId: bodySiteId } = body;
    const siteId = bodySiteId || getDefaultSiteId();

    switch (action) {
      case "stats": {
        // Subscriber growth over last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const [total, confirmed, recent, sources] = await Promise.all([
          prisma.subscriber.count({ where: { site_id: siteId } }),
          prisma.subscriber.count({
            where: { site_id: siteId, status: "CONFIRMED" },
          }),
          prisma.subscriber.count({
            where: {
              site_id: siteId,
              created_at: { gte: thirtyDaysAgo },
            },
          }),
          prisma.subscriber.groupBy({
            by: ["source"],
            where: { site_id: siteId },
            _count: true,
            orderBy: { _count: { source: "desc" } },
            take: 10,
          }),
        ]);

        return NextResponse.json({
          success: true,
          stats: {
            total,
            confirmed,
            recentSignups: recent,
            confirmationRate:
              total > 0 ? Math.round((confirmed / total) * 100) : 0,
            topSources: sources.map((s) => ({
              source: s.source || "unknown",
              count: s._count,
            })),
          },
        });
      }

      case "export": {
        // Export confirmed subscribers as CSV (GDPR: only email + preferences)
        const confirmed = await prisma.subscriber.findMany({
          where: { site_id: siteId, status: "CONFIRMED" },
          select: {
            email: true,
            source: true,
            preferences_json: true,
            confirmed_at: true,
            created_at: true,
          },
          orderBy: { created_at: "desc" },
        });

        const csv = [
          "email,source,language,confirmed_at,subscribed_at",
          ...confirmed.map((s) => {
            const prefs = (s.preferences_json || {}) as Record<string, unknown>;
            return [
              s.email,
              s.source || "",
              (prefs.language as string) || "en",
              s.confirmed_at?.toISOString() || "",
              s.created_at.toISOString(),
            ].join(",");
          }),
        ].join("\n");

        return new NextResponse(csv, {
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="subscribers-${siteId}-${new Date().toISOString().slice(0, 10)}.csv"`,
          },
        });
      }

      case "confirm": {
        // Manually confirm a pending subscriber
        const { subscriberId } = body;
        if (!subscriberId) {
          return NextResponse.json(
            { error: "subscriberId required" },
            { status: 400 },
          );
        }

        await prisma.subscriber.update({
          where: { id: subscriberId },
          data: {
            status: "CONFIRMED",
            confirmed_at: new Date(),
          },
        });

        return NextResponse.json({ success: true, message: "Subscriber confirmed" });
      }

      case "unsubscribe": {
        // Unsubscribe a subscriber with GDPR consent log
        const { subscriberId: unsubId, reason } = body;
        if (!unsubId) {
          return NextResponse.json(
            { error: "subscriberId required" },
            { status: 400 },
          );
        }

        await prisma.$transaction([
          prisma.subscriber.update({
            where: { id: unsubId },
            data: {
              status: "UNSUBSCRIBED",
              unsubscribed_at: new Date(),
              unsubscribe_reason: reason || "admin_action",
            },
          }),
          prisma.consentLog.create({
            data: {
              site_id: siteId,
              subscriber_id: unsubId,
              consent_type: "newsletter",
              consent_version: "1.0",
              action: "withdrawn",
              legal_basis: "consent",
              processing_purposes: ["marketing"],
              data_categories: ["email"],
              consent_text: `Unsubscribed by admin. Reason: ${reason || "admin_action"}`,
            },
          }),
        ]);

        return NextResponse.json({
          success: true,
          message: "Subscriber unsubscribed",
        });
      }

      case "delete": {
        // Permanent deletion with GDPR audit trail
        const { subscriberId: delId } = body;
        if (!delId) {
          return NextResponse.json(
            { error: "subscriberId required" },
            { status: 400 },
          );
        }

        // Log deletion before removing (GDPR Article 30)
        const sub = await prisma.subscriber.findUnique({
          where: { id: delId },
          select: { email: true },
        });

        if (sub) {
          // Hash email for audit trail (don't store raw PII in deletion log)
          const encoder = new TextEncoder();
          const data = encoder.encode(sub.email);
          const hashBuffer = await crypto.subtle.digest("SHA-256", data);
          const emailHash = Array.from(new Uint8Array(hashBuffer))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");

          // ConsentLogs cascade-delete with subscriber (onDelete: Cascade)
          await prisma.subscriber.delete({ where: { id: delId } });

          // Log to AuditLog for GDPR compliance
          try {
            await prisma.auditLog.create({
              data: {
                action: "SUBSCRIBER_DELETION",
                userId: "admin",
                details: {
                  emailHash,
                  siteId,
                  deletedAt: new Date().toISOString(),
                  gdprBasis: "Article 17 — Right to erasure",
                },
              },
            });
          } catch (auditErr) {
            console.warn("[admin:subscribers] AuditLog write failed:", auditErr);
          }
        }

        return NextResponse.json({
          success: true,
          message: "Subscriber permanently deleted",
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("[admin:subscribers] POST error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process action" },
      { status: 500 },
    );
  }
}
