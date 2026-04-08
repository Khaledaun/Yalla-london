import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";
import { getDefaultSiteId } from "@/config/sites";

export const maxDuration = 300;

/**
 * POST /api/admin/asset-library/import-public-drive
 *
 * Import photos from a PUBLIC Google Drive folder into the MediaAsset library.
 * No OAuth needed — uses Google Drive API v3 with API key for publicly shared folders.
 *
 * Body: { folderId: string, siteId?: string, tags?: string[] }
 *
 * The folderId is extracted from the shared Drive link:
 * https://drive.google.com/drive/folders/1izWxhvqe2okRU09HtZnjZkHk2hDOrB9f
 * → folderId = "1izWxhvqe2okRU09HtZnjZkHk2hDOrB9f"
 */
export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const body = await request.json();
  const folderId = body.folderId || "1izWxhvqe2okRU09HtZnjZkHk2hDOrB9f"; // Default: Khaled's photo folder
  const siteId = body.siteId || getDefaultSiteId();
  const extraTags: string[] = body.tags || [];

  // Use any available Google API key
  const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: "No Google API key configured. Set GOOGLE_PAGESPEED_API_KEY or GOOGLE_API_KEY." },
      { status: 500 },
    );
  }

  const { prisma } = await import("@/lib/db");
  const startTime = Date.now();
  const BUDGET_MS = 280_000;
  const results = { imported: 0, skipped: 0, errors: [] as string[], files: [] as string[] };

  try {
    // List all image files in the public Drive folder
    const listUrl = new URL("https://www.googleapis.com/drive/v3/files");
    listUrl.searchParams.set("q", `'${folderId}' in parents and trashed = false and (mimeType contains 'image/')`);
    listUrl.searchParams.set("fields", "files(id,name,mimeType,size,imageMediaMetadata,thumbnailLink,webContentLink)");
    listUrl.searchParams.set("pageSize", "100");
    listUrl.searchParams.set("orderBy", "name");
    listUrl.searchParams.set("key", apiKey);

    const listRes = await fetch(listUrl.toString(), { signal: AbortSignal.timeout(15000) });
    if (!listRes.ok) {
      const errText = await listRes.text();
      return NextResponse.json(
        { success: false, error: `Drive API error: ${listRes.status} — ${errText}` },
        { status: 502 },
      );
    }

    const listData = await listRes.json();
    const files = (listData.files || []) as Array<{
      id: string;
      name: string;
      mimeType: string;
      size?: string;
      imageMediaMetadata?: { width?: number; height?: number };
      thumbnailLink?: string;
      webContentLink?: string;
    }>;

    if (files.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No image files found in the Drive folder. Make sure the folder is shared as 'Anyone with the link'.",
        ...results,
      });
    }

    // Import each image into MediaAsset
    for (const file of files) {
      if (Date.now() - startTime > BUDGET_MS) break;

      // Check if already imported (dedup by google-drive:{fileId} tag)
      const existing = await prisma.mediaAsset.findFirst({
        where: { tags: { has: `google-drive:${file.id}` } },
      });
      if (existing) {
        results.skipped++;
        continue;
      }

      try {
        // The publicly accessible URL for a Drive file
        const publicUrl = `https://drive.google.com/uc?export=view&id=${file.id}`;
        const thumbnailUrl = file.thumbnailLink || `https://drive.google.com/thumbnail?id=${file.id}&sz=w400`;

        // Infer tags from filename (e.g., "hyde-park-sunset.jpg" → ["hyde", "park", "sunset"])
        const nameParts = file.name
          .replace(/\.[^.]+$/, "") // strip extension
          .replace(/[_-]/g, " ")
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length > 2);

        const tags = [
          `google-drive:${file.id}`,
          `site:${siteId}`,
          "owner-photo", // Marks as Khaled's own photo (highest quality for E-E-A-T)
          ...nameParts,
          ...extraTags,
        ];

        // Determine category from filename keywords
        let category = "london-landmarks";
        const nameLC = file.name.toLowerCase();
        if (/hotel|dorchester|ritz|claridge|savoy|langham|connaught/i.test(nameLC)) category = "hotels-luxury";
        else if (/restaurant|food|halal|dining|meal/i.test(nameLC)) category = "restaurants-food";
        else if (/shop|harrods|oxford|market/i.test(nameLC)) category = "shopping";
        else if (/park|garden|hyde|regents/i.test(nameLC)) category = "parks-nature";
        else if (/tube|bus|taxi|transport|station/i.test(nameLC)) category = "transport";
        else if (/mosque|eid|ramadan|event/i.test(nameLC)) category = "events-celebrations";
        else if (/bridge|shard|eye|parliament|buckingham/i.test(nameLC)) category = "london-landmarks";

        await prisma.mediaAsset.create({
          data: {
            filename: file.name,
            mimeType: file.mimeType,
            fileSize: file.size ? parseInt(file.size) : null,
            width: file.imageMediaMetadata?.width || null,
            height: file.imageMediaMetadata?.height || null,
            url: publicUrl,
            thumbnailUrl,
            altText: file.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " "),
            category,
            tags,
            siteId,
            source: "google-drive",
            uploadedBy: "admin",
          },
        });

        results.imported++;
        results.files.push(file.name);
      } catch (importErr) {
        results.errors.push(`${file.name}: ${importErr instanceof Error ? importErr.message : String(importErr)}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Imported ${results.imported} photos, skipped ${results.skipped} (already imported), ${results.errors.length} errors`,
      totalInFolder: files.length,
      ...results,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
