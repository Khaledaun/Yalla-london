/**
 * Commerce CSV Import API — Upload Etsy CSV exports
 *
 * POST: Upload and parse Etsy orders or stats CSV
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";
import { getDefaultSiteId, getActiveSiteIds } from "@/config/sites";

export const POST = withAdminAuth(async (req: NextRequest) => {
  try {
    const contentType = req.headers.get("content-type") ?? "";

    let csvContent: string;
    let csvType: string;
    let siteId: string;

    if (contentType.includes("multipart/form-data")) {
      // Form data upload
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      csvType = (formData.get("type") as string) ?? "orders";
      siteId = (formData.get("siteId") as string) ?? getDefaultSiteId();

      if (!file) {
        return NextResponse.json(
          { error: "No file provided. Upload a CSV file." },
          { status: 400 },
        );
      }

      csvContent = await file.text();
    } else {
      // JSON body with csvContent
      const body = await req.json();
      csvContent = body.csvContent;
      csvType = body.type ?? "orders";
      siteId = body.siteId ?? getDefaultSiteId();

      if (!csvContent) {
        return NextResponse.json(
          { error: "csvContent is required" },
          { status: 400 },
        );
      }
    }

    // Validate siteId
    const activeSiteIds = getActiveSiteIds();
    if (!activeSiteIds.includes(siteId)) {
      siteId = getDefaultSiteId();
    }

    // Import based on type
    if (csvType === "orders") {
      const { importEtsyOrdersCsv } = await import(
        "@/lib/commerce/etsy-csv-import"
      );
      const result = await importEtsyOrdersCsv(siteId, csvContent);

      return NextResponse.json({
        success: true,
        message: `Imported ${result.imported} orders (${result.skipped} skipped, ${result.errors.length} errors)`,
        data: result,
      });
    }

    if (csvType === "stats") {
      const { importEtsyStatsCsv } = await import(
        "@/lib/commerce/etsy-csv-import"
      );
      const result = await importEtsyStatsCsv(siteId, csvContent);

      return NextResponse.json({
        success: true,
        message: `Imported ${result.imported} stat rows (${result.skipped} skipped)`,
        data: result,
      });
    }

    return NextResponse.json(
      { error: `Unknown CSV type: ${csvType}. Supported: orders, stats` },
      { status: 400 },
    );
  } catch (err) {
    console.warn(
      "[csv-import] POST error:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json({ error: "CSV import failed" }, { status: 500 });
  }
});
