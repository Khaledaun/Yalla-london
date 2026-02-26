export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";
import { SITES } from "@/config/sites";

// ---------------------------------------------------------------------------
// GET — Validate a proposed siteId + domain before creation
//
// Query params: ?siteId=<id>&domain=<domain>
//
// Returns:
//   { available: boolean, errors: string[], suggestions: string[] }
// ---------------------------------------------------------------------------

export const GET = withAdminAuth(async (request: NextRequest) => {
  const { prisma } = await import("@/lib/db");
  const { searchParams } = new URL(request.url);

  const siteId = (searchParams.get("siteId") ?? "").trim();
  const domain = (searchParams.get("domain") ?? "").trim();

  const errors: string[] = [];
  const suggestions: string[] = [];

  // ------------------------------------------------------------------
  // 1. siteId format: lowercase alphanumeric + hyphens only
  // ------------------------------------------------------------------
  if (!siteId) {
    errors.push("siteId is required");
  } else {
    if (!/^[a-z0-9-]+$/.test(siteId)) {
      errors.push(
        "siteId may only contain lowercase letters, numbers, and hyphens (e.g. 'yalla-paris')",
      );
      // Suggest a sanitised version
      const sanitised = siteId
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      if (sanitised && sanitised !== siteId) {
        suggestions.push(`Try '${sanitised}' instead`);
      }
    }

    // ------------------------------------------------------------------
    // 2. siteId length: 3–50 characters
    // ------------------------------------------------------------------
    if (siteId.length < 3) {
      errors.push("siteId must be at least 3 characters long");
    } else if (siteId.length > 50) {
      errors.push("siteId must be 50 characters or fewer");
    }

    // ------------------------------------------------------------------
    // 3. siteId must not already exist in SITES config
    // ------------------------------------------------------------------
    if (siteId in SITES) {
      errors.push(
        `'${siteId}' is already a configured site — choose a different identifier`,
      );
      suggestions.push(
        `Try '${siteId}-2' or a more specific name like '${siteId}-luxury'`,
      );
    }

    // ------------------------------------------------------------------
    // 4. siteId must not already exist in the Site DB table
    // ------------------------------------------------------------------
    try {
      const existing = await prisma.site.findUnique({
        where: { slug: siteId },
        select: { id: true },
      });
      if (existing) {
        errors.push(
          `'${siteId}' is already taken in the database — choose a different identifier`,
        );
      }
    } catch (err: unknown) {
      // P2021 = table doesn't exist; treat as "not found" (no conflict)
      const code =
        err && typeof err === "object" && "code" in err
          ? (err as { code: string }).code
          : null;
      if (code !== "P2021") {
        console.warn(
          "[new-site] Could not query Site table:",
          err instanceof Error ? err.message : err,
        );
      }
    }
  }

  // ------------------------------------------------------------------
  // 5. domain must not already be used by a configured site
  // ------------------------------------------------------------------
  if (domain) {
    const configuredDomains = Object.values(SITES).map((s) => s.domain);
    if (configuredDomains.includes(domain)) {
      errors.push(
        `Domain '${domain}' is already used by an existing site — each site must have a unique domain`,
      );
    }
  }

  const available = errors.length === 0;

  return NextResponse.json({ available, errors, suggestions });
});

// ---------------------------------------------------------------------------
// POST — Create a new site
//
// Body: SiteConfig object passed to buildNewSite()
//
// Returns BuildResult from lib/new-site/builder.ts
// If the builder module does not exist yet, returns a clear error.
// ---------------------------------------------------------------------------

export const POST = withAdminAuth(async (request: NextRequest) => {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  // Validate that the builder module is available before attempting the build
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let buildNewSite: ((config: any) => Promise<unknown>) | null = null;
  try {
    const builderModule = await import("@/lib/new-site/builder");
    buildNewSite = builderModule.buildNewSite;
  } catch {
    return NextResponse.json(
      {
        success: false,
        error:
          "The new-site builder (lib/new-site/builder.ts) has not been implemented yet. " +
          "Create the module and export a buildNewSite(config) function to enable site creation.",
      },
      { status: 501 },
    );
  }

  if (typeof buildNewSite !== "function") {
    return NextResponse.json(
      {
        success: false,
        error:
          "lib/new-site/builder.ts does not export a 'buildNewSite' function",
      },
      { status: 501 },
    );
  }

  try {
    const result = await buildNewSite(body);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Site creation failed";
    console.warn("[new-site] buildNewSite error:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
});
