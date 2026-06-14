import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { prisma } = await import("@/lib/db");

  // Find all 404 URLs
  const errorUrls = await prisma.uRLIndexingStatus.findMany({
    where: {
      OR: [
        { status: "error" },
        { last_error: { contains: "404" } },
      ],
    },
    take: 100,
    orderBy: { updated_at: "desc" },
  });

  if (errorUrls.length === 0) {
    return NextResponse.json({ success: true, message: "No 404 errors found", fixed: 0, redirects: 0, resubmitted: 0 });
  }

  let fixed = 0;
  let redirectsCreated = 0;
  let resubmitted = 0;
  const results: Array<{ url: string; action: string }> = [];

  for (const urlRecord of errorUrls) {
    const url = urlRecord.url;
    // Extract slug from URL
    const slugMatch = url.match(/\/blog\/([^/?#]+)/);
    if (!slugMatch) {
      results.push({ url, action: "skipped — not a blog URL" });
      continue;
    }

    const slug = slugMatch[1];

    // Check if a BlogPost exists with this slug
    const existingPost = await prisma.blogPost.findFirst({
      where: { slug, published: true },
      select: { id: true, slug: true },
    });

    if (existingPost) {
      // Post exists — mark for resubmission
      await prisma.uRLIndexingStatus.update({
        where: { id: urlRecord.id },
        data: {
          status: "pending",
          last_error: null,
          submitted_indexnow: false,
          updated_at: new Date(),
        },
      });
      resubmitted++;
      results.push({ url, action: "resubmitted — post exists" });
    } else {
      // Check if slug was changed (find by partial match)
      const similarPost = await prisma.blogPost.findFirst({
        where: {
          published: true,
          slug: { contains: slug.split("-").slice(0, 3).join("-") },
        },
        select: { id: true, slug: true },
      });

      if (similarPost && similarPost.slug !== slug) {
        // Create redirect from old slug to new slug
        try {
          await prisma.seoRedirect.create({
            data: {
              from_path: `/blog/${slug}`,
              to_path: `/blog/${similarPost.slug}`,
              status_code: 301,
              is_active: true,
            },
          });
          redirectsCreated++;
          results.push({ url, action: `redirected → /blog/${similarPost.slug}` });
        } catch {
          // Redirect may already exist
          results.push({ url, action: "redirect already exists" });
        }
      } else {
        // Mark as deindexed — post truly gone
        await prisma.uRLIndexingStatus.update({
          where: { id: urlRecord.id },
          data: { status: "deindexed", updated_at: new Date() },
        });
        results.push({ url, action: "marked deindexed — post not found" });
      }

      fixed++;
    }
  }

  return NextResponse.json({
    success: true,
    total: errorUrls.length,
    fixed,
    redirects: redirectsCreated,
    resubmitted,
    results,
  });
}
