/**
 * Design Asset Library API
 *
 * GET:  Browse folder tree, filter by site/platform/type/occasion, list assets
 * POST: Bulk operations — move, tag, create folder, delete
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";
import { getDefaultSiteId } from "@/config/sites";
import {
  buildFolderPath,
  generateFolderTags,
  buildFolderTree,
  PLATFORMS,
  DESIGN_TYPES,
  OCCASIONS,
  getCurrentOccasions,
} from "@/lib/design/asset-folders";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { prisma } = await import("@/lib/db");
  const params = request.nextUrl.searchParams;
  const siteId = params.get("siteId") || getDefaultSiteId();
  const platform = params.get("platform") || undefined;
  const designType = params.get("designType") || undefined;
  const occasion = params.get("occasion") || undefined;
  const view = params.get("view") || "tree"; // "tree" | "assets" | "stats"

  if (view === "tree") {
    // Build folder tree with counts
    const folderCounts = await prisma.mediaAsset.groupBy({
      by: ["folder"],
      where: { site_id: siteId, folder: { not: null } },
      _count: { id: true },
    });

    const counts = folderCounts
      .filter((c) => c.folder)
      .map((c) => ({ folder: c.folder!, count: c._count.id }));

    const tree = buildFolderTree(counts, [siteId]);
    const currentOccasions = getCurrentOccasions();

    return NextResponse.json({
      tree,
      currentOccasions,
      platforms: PLATFORMS,
      designTypes: DESIGN_TYPES,
      occasions: OCCASIONS,
      siteId,
    });
  }

  if (view === "stats") {
    const [totalAssets, byCategory, byFolder, recentUploads] = await Promise.all([
      prisma.mediaAsset.count({ where: { site_id: siteId } }),
      prisma.mediaAsset.groupBy({
        by: ["category"],
        where: { site_id: siteId },
        _count: { id: true },
      }),
      prisma.mediaAsset.groupBy({
        by: ["folder"],
        where: { site_id: siteId, folder: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }),
      prisma.mediaAsset.count({
        where: {
          site_id: siteId,
          created_at: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    return NextResponse.json({
      totalAssets,
      recentUploads,
      byCategory: byCategory.map((c) => ({ category: c.category, count: c._count.id })),
      topFolders: byFolder.map((f) => ({ folder: f.folder, count: f._count.id })),
      siteId,
    });
  }

  // view === "assets" — list assets in a folder
  const folderPath = buildFolderPath(siteId, platform, designType, occasion);
  const page = parseInt(params.get("page") || "1");
  const limit = parseInt(params.get("limit") || "50");
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { site_id: siteId };
  if (platform || designType || occasion) {
    where.folder = { startsWith: folderPath };
  }
  const search = params.get("search");
  if (search) {
    where.OR = [
      { filename: { contains: search, mode: "insensitive" } },
      { alt_text: { contains: search, mode: "insensitive" } },
    ];
  }

  const [assets, total] = await Promise.all([
    prisma.mediaAsset.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        filename: true,
        url: true,
        mime_type: true,
        file_size: true,
        width: true,
        height: true,
        alt_text: true,
        folder: true,
        category: true,
        tags: true,
        created_at: true,
      },
    }),
    prisma.mediaAsset.count({ where }),
  ]);

  return NextResponse.json({
    assets,
    total,
    page,
    pages: Math.ceil(total / limit),
    folderPath,
    siteId,
  });
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { prisma } = await import("@/lib/db");
  const body = await request.json();
  const { action } = body;

  switch (action) {
    case "move": {
      const { assetIds, targetFolder, siteId } = body;
      if (!assetIds?.length || !targetFolder) {
        return NextResponse.json({ success: false, error: "Missing assetIds or targetFolder" }, { status: 400 });
      }
      const tags = generateFolderTags(
        siteId || getDefaultSiteId(),
        ...targetFolder.split("/").slice(1),
      );
      const result = await prisma.mediaAsset.updateMany({
        where: { id: { in: assetIds } },
        data: { folder: targetFolder, tags },
      });
      return NextResponse.json({ success: true, moved: result.count });
    }

    case "tag": {
      const { assetIds, addTags, removeTags } = body;
      if (!assetIds?.length) {
        return NextResponse.json({ success: false, error: "Missing assetIds" }, { status: 400 });
      }
      let updated = 0;
      for (const id of assetIds) {
        const asset = await prisma.mediaAsset.findUnique({ where: { id }, select: { tags: true } });
        if (!asset) continue;
        let tags = (asset.tags || []) as string[];
        if (addTags?.length) tags = [...new Set<string>([...tags, ...addTags])];
        if (removeTags?.length) tags = tags.filter((t: string) => !removeTags.includes(t));
        await prisma.mediaAsset.update({ where: { id }, data: { tags } });
        updated++;
      }
      return NextResponse.json({ success: true, updated });
    }

    case "organize": {
      // Auto-organize unfoldered assets into the folder structure
      const siteId = body.siteId || getDefaultSiteId();
      const unfoldered = await prisma.mediaAsset.findMany({
        where: { site_id: siteId, folder: null },
        select: { id: true, category: true, tags: true },
        take: 100,
      });

      let organized = 0;
      for (const asset of unfoldered) {
        const tags = (asset.tags || []) as string[];
        const platform = tags.find((t: string) => t.startsWith("platform:"))?.split(":")[1];
        const type = tags.find((t: string) => t.startsWith("type:"))?.split(":")[1];
        if (platform || type) {
          const folder = buildFolderPath(siteId, platform, type);
          await prisma.mediaAsset.update({ where: { id: asset.id }, data: { folder } });
          organized++;
        }
      }
      return NextResponse.json({ success: true, organized });
    }

    case "delete": {
      const { assetIds } = body;
      if (!assetIds?.length) {
        return NextResponse.json({ success: false, error: "Missing assetIds" }, { status: 400 });
      }
      const result = await prisma.mediaAsset.deleteMany({
        where: { id: { in: assetIds } },
      });
      return NextResponse.json({ success: true, deleted: result.count });
    }

    default:
      return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
  }
}
