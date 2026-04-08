import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";

export const maxDuration = 300;

/**
 * POST /api/admin/asset-library/vision-retag
 *
 * Re-runs Google Cloud Vision AI on all Drive-imported photos that have
 * vague filenames (IMG_XXXX.HEIC) and updates their tags + alt_text
 * with what the AI actually sees in the image.
 *
 * Body: { siteId?: string, limit?: number }
 */
export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const body = await request.json().catch(() => ({}));
  const limit = Math.min(body.limit || 50, 87);
  const siteId = body.siteId || "yalla-london";

  const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ success: false, error: "No Google API key configured" }, { status: 500 });
  }

  const { prisma } = await import("@/lib/db");
  const startTime = Date.now();
  const BUDGET_MS = 280_000;
  const results = { tagged: 0, skipped: 0, errors: 0, samples: [] as string[] };

  // Fetch Drive-imported photos that still have generic IMG_ names
  const assets = await prisma.mediaAsset.findMany({
    where: {
      cloud_storage_path: { startsWith: "google-drive/" },
      site_id: siteId,
      deletedAt: null,
    },
    select: { id: true, filename: true, url: true, tags: true, alt_text: true },
    take: limit,
    orderBy: { created_at: "desc" },
  });

  for (const asset of assets) {
    if (Date.now() - startTime > BUDGET_MS) break;

    // Skip if already has good Vision tags (not just filename fragments)
    const hasVisionTags = asset.tags.some(
      (t: string) =>
        !t.startsWith("google-drive:") &&
        !t.startsWith("site:") &&
        t !== "owner-photo" &&
        !/^[a-f0-9]{4,}$/i.test(t) && // skip hex fragments from UUID filenames
        !/^\d+$/.test(t) && // skip pure numbers
        !/^img$/i.test(t), // skip "img"
    );
    if (hasVisionTags && asset.alt_text && !asset.alt_text.startsWith("IMG_") && !asset.alt_text.startsWith("E9")) {
      results.skipped++;
      continue;
    }

    try {
      const visionRes = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [
            {
              image: { source: { imageUri: asset.url } },
              features: [
                { type: "LABEL_DETECTION", maxResults: 15 },
                { type: "LANDMARK_DETECTION", maxResults: 5 },
                { type: "WEB_DETECTION", maxResults: 5 },
              ],
            },
          ],
        }),
        signal: AbortSignal.timeout(12000),
      });

      if (!visionRes.ok) {
        results.errors++;
        continue;
      }

      const visionData = await visionRes.json();
      const response = visionData.responses?.[0];

      const visionLabels = (response?.labelAnnotations || [])
        .filter((l: { score: number }) => l.score > 0.65)
        .map((l: { description: string }) => l.description.toLowerCase());

      const visionLandmarks = (response?.landmarkAnnotations || []).map((l: { description: string }) => l.description);

      const webEntities = (response?.webDetection?.webEntities || [])
        .filter((e: { score: number; description?: string }) => e.score > 0.4 && e.description)
        .map((e: { description: string }) => e.description);

      // Build new alt text from Vision results
      const altText = visionLandmarks[0] || webEntities[0] || visionLabels.slice(0, 3).join(", ") || asset.alt_text;

      // Build category from labels
      const allLabels = [...visionLabels, ...visionLandmarks.map((l: string) => l.toLowerCase())].join(" ");
      let category = "london-landmarks";
      if (/hotel|lobby|suite|bedroom|accommodation/i.test(allLabels)) category = "hotels-luxury";
      else if (/restaurant|food|cuisine|dish|meal|dining|plate/i.test(allLabels)) category = "restaurants-food";
      else if (/shop|store|retail|market|mall|window display/i.test(allLabels)) category = "shopping";
      else if (/park|garden|tree|nature|flower|grass/i.test(allLabels)) category = "parks-nature";
      else if (/train|bus|tube|underground|station|taxi/i.test(allLabels)) category = "transport";
      else if (/mosque|church|temple|minaret|prayer/i.test(allLabels)) category = "events-celebrations";
      else if (/bridge|tower|parliament|palace|monument|gate/i.test(allLabels)) category = "london-landmarks";
      else if (/street|road|city|urban|building|architecture|facade/i.test(allLabels)) category = "architecture";

      // Merge new Vision tags with existing (keep google-drive:, site:, owner-photo)
      const keepTags = asset.tags.filter(
        (t: string) => t.startsWith("google-drive:") || t.startsWith("site:") || t === "owner-photo",
      );
      const newTags = [
        ...keepTags,
        ...visionLabels.slice(0, 10),
        ...visionLandmarks.map((l: string) => l.toLowerCase()),
        ...webEntities.slice(0, 3).map((e: string) => e.toLowerCase()),
      ];

      await prisma.mediaAsset.update({
        where: { id: asset.id },
        data: {
          alt_text: altText,
          tags: [...new Set(newTags)],
          category,
          description: `Vision: ${visionLabels.slice(0, 5).join(", ")}${visionLandmarks.length > 0 ? ` | Landmarks: ${visionLandmarks.join(", ")}` : ""}`,
        },
      });

      results.tagged++;
      results.samples.push(`${asset.filename} → [${category}] ${altText}`);
    } catch (err) {
      results.errors++;
      console.warn(`[vision-retag] Failed for ${asset.filename}:`, err instanceof Error ? err.message : err);
    }
  }

  return NextResponse.json({
    success: true,
    message: `Tagged ${results.tagged}, skipped ${results.skipped} (already tagged), ${results.errors} errors`,
    totalProcessed: assets.length,
    ...results,
    durationMs: Date.now() - startTime,
  });
}
