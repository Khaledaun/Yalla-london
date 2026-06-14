/**
 * Kaspo B2B Agent Management API
 *
 * GET  — returns agent list, KPI stats, content access settings, activity feed
 * POST — invite_agent, update_status, update_access
 *
 * Uses Lead model as proxy for Kaspo agents (lead_source = "kaspo").
 * Protected with requireAdmin.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";
import { getDefaultSiteId } from "@/config/sites";

export const dynamic = "force-dynamic";

// ─── Helpers ───────────────────────────────────────────────────────

function jsonOk(data: Record<string, unknown>, status = 200) {
  return NextResponse.json(data, { status });
}

function jsonErr(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

// ─── GET ───────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");
    const siteId =
      request.headers.get("x-site-id") ||
      request.nextUrl.searchParams.get("siteId") ||
      getDefaultSiteId();

    // ── Fetch Kaspo agents (Leads where lead_source = "kaspo") ──

    const agents = await prisma.lead.findMany({
      where: { site_id: siteId, lead_source: "kaspo" },
      orderBy: { created_at: "desc" },
      take: 200,
    });

    // ── KPI calculations ──

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const totalAgents = agents.length;
    const activeAgents = agents.filter(
      (a) => a.status === "QUALIFIED" || a.status === "ENGAGED"
    ).length;
    const pendingAgents = agents.filter((a) => a.status === "NEW").length;
    const suspendedAgents = agents.filter(
      (a) => a.status === "UNQUALIFIED" || a.status === "UNSUBSCRIBED"
    ).length;
    const newSignupsThisMonth = agents.filter(
      (a) => a.created_at >= thirtyDaysAgo
    ).length;

    // ── PDF downloads (from LeadActivity where activity_type = "guide_download") ──

    let totalDownloads = 0;
    let topGuide = "None yet";
    try {
      const agentIds = agents.map((a) => a.id);
      if (agentIds.length > 0) {
        totalDownloads = await prisma.leadActivity.count({
          where: {
            lead_id: { in: agentIds },
            activity_type: "guide_download",
          },
        });

        // Find the most downloaded guide
        const downloads = await prisma.leadActivity.findMany({
          where: {
            lead_id: { in: agentIds },
            activity_type: "guide_download",
          },
          select: { activity_data: true },
          take: 500,
        });

        const guideCount: Record<string, number> = {};
        for (const d of downloads) {
          const data = d.activity_data as Record<string, unknown> | null;
          const guide =
            (data?.guide as string) || (data?.page as string) || "Unknown";
          guideCount[guide] = (guideCount[guide] || 0) + 1;
        }

        const topEntry = Object.entries(guideCount).sort(
          ([, a], [, b]) => b - a
        )[0];
        if (topEntry) topGuide = topEntry[0];
      }
    } catch (err) {
      console.warn(
        "[kaspo] Failed to fetch download stats:",
        err instanceof Error ? err.message : String(err)
      );
    }

    // ── Activity feed (recent agent activities) ──

    let activityFeed: Array<{
      id: string;
      agentName: string;
      agentEmail: string;
      type: string;
      detail: string;
      timestamp: string;
    }> = [];

    try {
      const agentIds = agents.map((a) => a.id);
      if (agentIds.length > 0) {
        const recentActivities = await prisma.leadActivity.findMany({
          where: { lead_id: { in: agentIds } },
          orderBy: { created_at: "desc" },
          take: 30,
          include: { lead: { select: { name: true, email: true } } },
        });

        activityFeed = recentActivities.map((act) => {
          const data = act.activity_data as Record<string, unknown> | null;
          let detail = act.activity_type;
          if (act.activity_type === "guide_download") {
            detail = `Downloaded: ${(data?.guide as string) || (data?.page as string) || "guide"}`;
          } else if (act.activity_type === "page_view") {
            detail = `Viewed: ${(data?.page as string) || "page"}`;
          } else if (act.activity_type === "email_open") {
            detail = "Opened email";
          } else if (act.activity_type === "form_submit") {
            detail = "Submitted form";
          }

          return {
            id: act.id,
            agentName: act.lead.name || "Unknown Agent",
            agentEmail: act.lead.email,
            type: act.activity_type,
            detail,
            timestamp: act.created_at.toISOString(),
          };
        });
      }
    } catch (err) {
      console.warn(
        "[kaspo] Failed to fetch activity feed:",
        err instanceof Error ? err.message : String(err)
      );
    }

    // ── Content access settings (stored in SiteSettings) ──

    let contentAccessSettings = {
      guides: true,
      hotelReviews: true,
      restaurantGuides: true,
      eventCalendar: false,
      exclusiveDeals: false,
      customItineraries: false,
    };

    try {
      const settings = await prisma.siteSettings.findFirst({
        where: { siteId, category: "kaspo" },
      });
      if (settings?.value) {
        const val = settings.value as Record<string, unknown>;
        if (val.contentAccess) {
          contentAccessSettings = {
            ...contentAccessSettings,
            ...(val.contentAccess as Record<string, boolean>),
          };
        }
      }
    } catch (err) {
      console.warn(
        "[kaspo] Failed to fetch content access settings:",
        err instanceof Error ? err.message : String(err)
      );
    }

    // ── Format agents for response ──

    const formattedAgents = agents.map((agent) => ({
      id: agent.id,
      name: agent.name || "Unnamed Agent",
      email: agent.email,
      company: agent.sold_to || "Independent",
      status: mapLeadStatusToAgentStatus(agent.status),
      signupDate: agent.created_at.toISOString(),
      score: agent.score,
      phone: agent.phone,
      budgetRange: agent.budget_range,
    }));

    return jsonOk({
      success: true,
      siteId,
      agents: formattedAgents,
      kpis: {
        totalAgents,
        activeAgents,
        pendingAgents,
        suspendedAgents,
        newSignupsThisMonth,
        totalDownloads,
        topGuide,
      },
      contentAccessSettings,
      activityFeed,
    });
  } catch (err) {
    console.error(
      "[kaspo] GET error:",
      err instanceof Error ? err.message : String(err)
    );
    return jsonErr("Failed to load Kaspo data", 500);
  }
}

// ─── POST ──────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");
    const body = await request.json();
    const { action } = body;
    const siteId =
      request.headers.get("x-site-id") ||
      body.siteId ||
      getDefaultSiteId();

    // ── invite_agent ──

    if (action === "invite_agent") {
      const { email, company } = body;
      if (!email || typeof email !== "string") {
        return jsonErr("Email is required");
      }

      // Check for existing agent
      const existing = await prisma.lead.findFirst({
        where: { site_id: siteId, email, lead_source: "kaspo" },
      });
      if (existing) {
        return jsonErr("An agent with this email already exists");
      }

      const agent = await prisma.lead.create({
        data: {
          site_id: siteId,
          email: email.trim().toLowerCase(),
          name: body.name || null,
          lead_source: "kaspo",
          lead_type: "GUIDE_DOWNLOAD",
          sold_to: company || null,
          status: "NEW",
          marketing_consent: true,
          consent_at: new Date(),
        },
      });

      return jsonOk({
        success: true,
        message: `Agent invitation created for ${email}`,
        agent: {
          id: agent.id,
          email: agent.email,
          name: agent.name,
          company: agent.sold_to,
          status: "pending",
        },
      });
    }

    // ── update_status ──

    if (action === "update_status") {
      const { agentId, status } = body;
      if (!agentId || !status) {
        return jsonErr("agentId and status are required");
      }

      const prismaStatus = mapAgentStatusToLeadStatus(status);
      if (!prismaStatus) {
        return jsonErr("Invalid status. Use: active, pending, suspended");
      }

      await prisma.lead.update({
        where: { id: agentId },
        data: { status: prismaStatus },
      });

      return jsonOk({
        success: true,
        message: `Agent status updated to ${status}`,
      });
    }

    // ── update_access ──

    if (action === "update_access") {
      const { settings } = body;
      if (!settings || typeof settings !== "object") {
        return jsonErr("Settings object is required");
      }

      await prisma.siteSettings.upsert({
        where: {
          siteId_category: { siteId, category: "kaspo" },
        },
        create: {
          siteId,
          category: "kaspo",
          value: { contentAccess: settings },
        },
        update: {
          value: { contentAccess: settings },
        },
      });

      return jsonOk({
        success: true,
        message: "Content access settings updated",
      });
    }

    return jsonErr(`Unknown action: ${action}`);
  } catch (err) {
    console.error(
      "[kaspo] POST error:",
      err instanceof Error ? err.message : String(err)
    );
    return jsonErr("Failed to process request", 500);
  }
}

// ─── Status Mapping ────────────────────────────────────────────────

function mapLeadStatusToAgentStatus(
  leadStatus: string
): "active" | "pending" | "suspended" {
  switch (leadStatus) {
    case "QUALIFIED":
    case "ENGAGED":
    case "CONVERTED":
      return "active";
    case "NEW":
    case "CONTACTED":
      return "pending";
    case "UNQUALIFIED":
    case "UNSUBSCRIBED":
    case "SOLD":
    default:
      return "suspended";
  }
}

function mapAgentStatusToLeadStatus(
  agentStatus: string
): string | null {
  switch (agentStatus) {
    case "active":
      return "QUALIFIED";
    case "pending":
      return "NEW";
    case "suspended":
      return "UNQUALIFIED";
    default:
      return null;
  }
}
