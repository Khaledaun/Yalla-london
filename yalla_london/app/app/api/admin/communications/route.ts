import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";
import { getDefaultSiteId } from "@/config/sites";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");

    const siteId =
      request.headers.get("x-site-id") ||
      request.nextUrl.searchParams.get("siteId") ||
      getDefaultSiteId();

    const channel = request.nextUrl.searchParams.get("channel");
    const status = request.nextUrl.searchParams.get("status");
    const search = request.nextUrl.searchParams.get("search");
    const page = Math.max(1, parseInt(request.nextUrl.searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(request.nextUrl.searchParams.get("limit") || "25", 10)));

    const where: Record<string, unknown> = { siteId };

    if (channel) {
      where.channel = channel;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { contactEmail: { contains: search, mode: "insensitive" } },
        { contactPhone: { contains: search, mode: "insensitive" } },
      ];
    }

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { lastMessageAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.conversation.count({ where }),
    ]);

    return NextResponse.json({
      conversations,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.warn("[communications] Failed to list conversations:", err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}
