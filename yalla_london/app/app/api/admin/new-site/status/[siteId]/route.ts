export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";

// ---------------------------------------------------------------------------
// GET — Check if a site exists in the database and return its setup status
//
// Path param: siteId
//
// Returns:
//   {
//     exists: boolean,
//     siteId: string,
//     topicsCount: number,      // TopicProposal count for this siteId
//     articlesCount: number,    // ArticleDraft count
//     publishedCount: number,   // BlogPost count
//     ready: boolean,           // topicsCount > 0
//   }
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> },
) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { prisma } = await import("@/lib/db");
  const { siteId } = await params;

  if (!siteId) {
    return NextResponse.json(
      { success: false, error: "siteId path parameter is required" },
      { status: 400 },
    );
  }

  // -------------------------------------------------------------------------
  // Check whether the site exists in the Site DB table
  // -------------------------------------------------------------------------
  let exists = false;
  try {
    const site = await prisma.site.findUnique({
      where: { slug: siteId },
      select: { id: true },
    });
    exists = site !== null;
  } catch (err: unknown) {
    // P2021 = table doesn't exist — treat as "not found"
    const code =
      err && typeof err === "object" && "code" in err
        ? (err as { code: string }).code
        : null;
    if (code !== "P2021") {
      console.warn(
        `[new-site/status] Could not query Site table for '${siteId}':`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  // -------------------------------------------------------------------------
  // Count TopicProposals for this siteId
  // -------------------------------------------------------------------------
  let topicsCount = 0;
  try {
    topicsCount = await prisma.topicProposal.count({
      where: { site_id: siteId },
    });
  } catch (err: unknown) {
    const code =
      err && typeof err === "object" && "code" in err
        ? (err as { code: string }).code
        : null;
    if (code !== "P2021") {
      console.warn(
        `[new-site/status] Could not count TopicProposals for '${siteId}':`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  // -------------------------------------------------------------------------
  // Count ArticleDrafts for this siteId
  // -------------------------------------------------------------------------
  let articlesCount = 0;
  try {
    articlesCount = await prisma.articleDraft.count({
      where: { site_id: siteId },
    });
  } catch (err: unknown) {
    const code =
      err && typeof err === "object" && "code" in err
        ? (err as { code: string }).code
        : null;
    if (code !== "P2021") {
      console.warn(
        `[new-site/status] Could not count ArticleDrafts for '${siteId}':`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  // -------------------------------------------------------------------------
  // Count published BlogPosts for this siteId
  // BlogPost uses camelCase siteId field (not snake_case)
  // -------------------------------------------------------------------------
  let publishedCount = 0;
  try {
    publishedCount = await prisma.blogPost.count({
      where: { siteId, published: true },
    });
  } catch (err: unknown) {
    const code =
      err && typeof err === "object" && "code" in err
        ? (err as { code: string }).code
        : null;
    if (code !== "P2021") {
      console.warn(
        `[new-site/status] Could not count BlogPosts for '${siteId}':`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  return NextResponse.json({
    exists,
    siteId,
    topicsCount,
    articlesCount,
    publishedCount,
    ready: topicsCount > 0,
  });
}
