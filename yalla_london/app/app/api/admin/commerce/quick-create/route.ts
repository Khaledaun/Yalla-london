/**
 * Quick Create API — One-tap product creation
 *
 * POST: Create a product from a plain-language idea
 *   body: { idea: string, ontologyCategory?: string, price?: number, siteId?: string }
 *   returns: { success, briefId, draftId, title, tags, price, complianceValid }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";
import { getDefaultSiteId } from "@/config/sites";

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  let body: {
    idea: string;
    ontologyCategory?: string;
    price?: number;
    siteId?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.idea || body.idea.trim().length < 5) {
    return NextResponse.json(
      { error: "Product idea must be at least 5 characters" },
      { status: 400 },
    );
  }

  const siteId = body.siteId ?? getDefaultSiteId();

  try {
    const { quickCreate } = await import("@/lib/commerce/quick-create");

    const result = await quickCreate({
      idea: body.idea.trim(),
      ontologyCategory: body.ontologyCategory,
      price: body.price,
      siteId,
    });

    return NextResponse.json({
      success: true,
      briefId: result.briefId,
      draftId: result.draftId,
      title: result.title,
      description: result.description.slice(0, 200) + "...",
      tags: result.tags,
      price: result.price,
      suggestedCategory: result.suggestedCategory,
      complianceValid: result.complianceValid,
      complianceIssues: result.complianceIssues,
    });
  } catch (err) {
    console.warn("[quick-create]", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { success: false, error: "Quick create failed" },
      { status: 500 },
    );
  }
}
