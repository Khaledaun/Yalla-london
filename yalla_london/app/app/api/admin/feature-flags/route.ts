import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";
import { prisma } from "@/lib/db";
import { invalidateFlagCache } from "@/lib/feature-flags";

/**
 * Feature Flags API — Backed by real database (FeatureFlag table).
 * Replaces previous mock implementation.
 */

// GET - Fetch feature flags from database
export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "flags";

    switch (type) {
      case "flags": {
        const flags = await prisma.featureFlag.findMany({
          orderBy: { updated_at: "desc" },
        });

        return NextResponse.json({
          flags: flags.map((f) => ({
            id: f.id,
            name: f.name,
            description: f.description || "",
            enabled: f.enabled,
            createdAt: f.created_at.toISOString(),
            updatedAt: f.updated_at.toISOString(),
          })),
        });
      }

      case "health": {
        // Real health data from CronJobLog
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentLogs = await prisma.cronJobLog.findMany({
          where: { started_at: { gte: oneDayAgo } },
          select: { status: true, duration_ms: true },
        });

        const total = recentLogs.length;
        const failed = recentLogs.filter((l) => l.status === "failed").length;
        const avgDuration =
          total > 0
            ? Math.round(
                recentLogs.reduce(
                  (sum, l) => sum + (l.duration_ms || 0),
                  0
                ) / total
              )
            : 0;

        return NextResponse.json({
          systemHealth: {
            overall: failed > total * 0.2 ? "degraded" : "healthy",
            cronJobsLast24h: total,
            cronFailuresLast24h: failed,
            avgCronDurationMs: avgDuration,
            errorRate: total > 0 ? ((failed / total) * 100).toFixed(1) : "0.0",
            lastChecked: new Date().toISOString(),
          },
        });
      }

      case "analytics": {
        const flags = await prisma.featureFlag.findMany();
        return NextResponse.json({
          analytics: {
            featureFlags: {
              total: flags.length,
              enabled: flags.filter((f) => f.enabled).length,
              disabled: flags.filter((f) => !f.enabled).length,
            },
          },
        });
      }

      default:
        return NextResponse.json(
          { error: "Invalid type parameter" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Feature Flags API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch feature flags data" },
      { status: 500 }
    );
  }
});

// POST - Create, update, toggle, delete feature flags in the database
export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case "add-flag": {
        const flag = await prisma.featureFlag.create({
          data: {
            name: data.name,
            description: data.description || null,
            enabled: data.enabled ?? false,
          },
        });
        invalidateFlagCache();
        return NextResponse.json({
          success: true,
          message: "Feature flag created",
          flag: {
            id: flag.id,
            name: flag.name,
            description: flag.description,
            enabled: flag.enabled,
          },
        });
      }

      case "toggle-flag": {
        const flag = await prisma.featureFlag.update({
          where: { id: data.flagId },
          data: { enabled: data.enabled },
        });
        invalidateFlagCache();
        return NextResponse.json({
          success: true,
          message: `Feature flag ${flag.enabled ? "enabled" : "disabled"}`,
          flag: { id: flag.id, name: flag.name, enabled: flag.enabled },
        });
      }

      case "update-flag": {
        const flag = await prisma.featureFlag.update({
          where: { id: data.flagId },
          data: {
            ...(data.name !== undefined && { name: data.name }),
            ...(data.description !== undefined && {
              description: data.description,
            }),
            ...(data.enabled !== undefined && { enabled: data.enabled }),
          },
        });
        invalidateFlagCache();
        return NextResponse.json({
          success: true,
          message: "Feature flag updated",
          flag: {
            id: flag.id,
            name: flag.name,
            description: flag.description,
            enabled: flag.enabled,
          },
        });
      }

      case "delete-flag": {
        await prisma.featureFlag.delete({
          where: { id: data.flagId },
        });
        invalidateFlagCache();
        return NextResponse.json({
          success: true,
          message: "Feature flag deleted",
        });
      }

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Feature Flags POST error:", error);
    return NextResponse.json(
      {
        error: "Failed to process request",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
});
