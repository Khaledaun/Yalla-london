/**
 * Affiliate Link Injection API
 * POST /api/affiliate/links/inject
 * Given content and metadata, returns optimized affiliate links.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";

export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { content, category, tags, language, maxLinks } = body;

    if (!content || !category) {
      return NextResponse.json({ error: "content and category are required" }, { status: 400 });
    }

    const { getLinksForContent } = await import("@/lib/affiliate/link-injector");
    const result = await getLinksForContent(
      content,
      language || "en",
      category,
      tags || [],
      maxLinks || 5,
    );

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.warn("[link-inject] Failed:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ success: false, error: "Injection failed" }, { status: 500 });
  }
});
