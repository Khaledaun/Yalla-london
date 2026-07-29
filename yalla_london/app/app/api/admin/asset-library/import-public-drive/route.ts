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

        // ── AI Vision auto-tagging ──────────────────────────────────────
        // Use Google Cloud Vision API to identify what's in the photo.
        // This handles unnamed iPhone photos (IMG_0500.HEIC) by analyzing
        // the actual image content instead of relying on filenames.
        let visionLabels: string[] = [];
        let visionLandmarks: string[] = [];
        let visionDescription = "";
        try {
          const visionRes = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              requests: [
                {
                  image: { source: { imageUri: publicUrl } },
                  features: [
                    { type: "LABEL_DETECTION", maxResults: 15 },
                    { type: "LANDMARK_DETECTION", maxResults: 5 },
                    { type: "WEB_DETECTION", maxResults: 5 },
                  ],
                },
              ],
            }),
            signal: AbortSignal.timeout(10000),
          });
          if (visionRes.ok) {
            const visionData = await visionRes.json();
            const response = visionData.responses?.[0];
            // Labels: "restaurant", "food", "building", "park", etc.
            visionLabels = (response?.labelAnnotations || [])
              .filter((l: { score: number }) => l.score > 0.7)
              .map((l: { description: string }) => l.description.toLowerCase());
            // Landmarks: "Big Ben", "Tower Bridge", "Hyde Park", etc.
            visionLandmarks = (response?.landmarkAnnotations || []).map((l: { description: string }) => l.description);
            // Web entities for best description
            const webEntities = (response?.webDetection?.webEntities || [])
              .filter((e: { score: number; description?: string }) => e.score > 0.5 && e.description)
              .map((e: { description: string }) => e.description);
            visionDescription = webEntities[0] || visionLandmarks[0] || visionLabels.slice(0, 3).join(", ");
          }
        } catch (visionErr) {
          console.warn(
            `[import-drive] Vision API failed for ${file.name}:`,
            visionErr instanceof Error ? visionErr.message : visionErr,
          );
          // Continue without vision — use filename fallback
        }

        // Build tags from Vision AI results + filename
        const nameParts = file.name
          .replace(/\.[^.]+$/, "")
          .replace(/[_-]/g, " ")
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length > 2 && !/^img$/i.test(w) && !/^\d+$/.test(w));

        const tags = [
          `google-drive:${file.id}`,
          `site:${siteId}`,
          "owner-photo",
          ...visionLabels.slice(0, 10),
          ...visionLandmarks.map((l) => l.toLowerCase()),
          ...nameParts,
          ...extraTags,
        ];

        // Determine category from Vision labels + landmarks
        const allLabels = [...visionLabels, ...visionLandmarks.map((l) => l.toLowerCase())].join(" ");
        let category = "london-landmarks";
        if (/hotel|lobby|suite|bedroom|accommodation/i.test(allLabels)) category = "hotels-luxury";
        else if (/restaurant|food|cuisine|dish|meal|dining|plate/i.test(allLabels)) category = "restaurants-food";
        else if (/shop|store|retail|market|mall/i.test(allLabels)) category = "shopping";
        else if (/park|garden|tree|nature|flower|grass/i.test(allLabels)) category = "parks-nature";
        else if (/train|bus|tube|underground|station|taxi|transport/i.test(allLabels)) category = "transport";
        else if (/mosque|church|temple|minaret|prayer/i.test(allLabels)) category = "events-celebrations";
        else if (/stadium|football|sport|arena/i.test(allLabels)) category = "football-stadiums";
        else if (/bridge|tower|parliament|palace|monument|landmark/i.test(allLabels)) category = "london-landmarks";
        else if (/street|road|city|urban|building|architecture/i.test(allLabels)) category = "architecture";
        else if (/bar|pub|nightlife|cocktail/i.test(allLabels)) category = "nightlife";

        // Build alt text from Vision results
        const altText =
          visionDescription ||
          visionLandmarks[0] ||
          visionLabels.slice(0, 3).join(", ") ||
          file.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ");

        await prisma.mediaAsset.create({
          data: {
            filename: file.name,
            original_name: file.name,
            cloud_storage_path: `google-drive/${siteId}/${file.id}/${file.name}`,
            url: publicUrl,
            file_type: file.mimeType.startsWith("image/") ? "image" : "document",
            mime_type: file.mimeType,
            file_size: file.size ? parseInt(file.size) : 0,
            width: file.imageMediaMetadata?.width || null,
            height: file.imageMediaMetadata?.height || null,
            alt_text: altText,
            category,
            tags,
            site_id: siteId,
            folder: `google-drive/${siteId}`,
          },
        });

        results.imported++;
        results.files.push(`${file.name} → [${category}] ${altText}`);
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
