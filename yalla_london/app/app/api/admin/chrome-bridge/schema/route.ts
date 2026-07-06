/**
 * GET /api/admin/chrome-bridge/schema?url=X
 *
 * JSON-LD structured data validator. Fetches the page, extracts all
 * `<script type="application/ld+json">` blocks, parses each, and validates
 * against known schema.org types.
 *
 * Checks:
 *   - JSON parse errors
 *   - Missing @context / @type
 *   - Missing required fields for common types (Article, Organization,
 *     WebSite, BreadcrumbList, Product, FAQPage)
 *   - Deprecated types flagged per Google Search Central Jan 2026 update
 *     (FAQPage restricted, HowTo deprecated, LearningVideo, ClaimReview,
 *     EstimatedSalary, etc.)
 *
 * Returns validated blocks + findings/actions in Chrome Bridge standard
 * format (drops straight into POST /report).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireBridgeToken } from "@/lib/agents/bridge-auth";
import { buildHints } from "@/lib/chrome-bridge/manifest";
import type { Finding, InterpretedAction } from "@/lib/chrome-bridge/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Types that Google demoted or restricted per CLAUDE.md standards.ts + Jan 2026
const DEPRECATED_TYPES = new Set([
  "FAQPage", // restricted Aug 2023 (only eligible for authoritative sites)
  "HowTo", // deprecated Sept 2023
  "CourseInfo",
  "ClaimReview",
  "EstimatedSalary",
  "LearningVideo",
  "SpecialAnnouncement",
  "VehicleListing",
  "PracticeProblems",
  "SitelinksSearchBox", // deprecated Oct 2024
]);

const REQUIRED_FIELDS: Record<string, string[]> = {
  Article: ["headline", "author", "datePublished"],
  BlogPosting: ["headline", "author", "datePublished"],
  NewsArticle: ["headline", "author", "datePublished"],
  Organization: ["name", "url"],
  WebSite: ["name", "url"],
  BreadcrumbList: ["itemListElement"],
  Product: ["name", "offers"],
  FAQPage: ["mainEntity"],
  Person: ["name"],
  ImageObject: ["url"],
  VideoObject: ["name", "thumbnailUrl", "uploadDate"],
  Place: ["name"],
  Trip: ["name", "itinerary"],
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authError = await requireBridgeToken(request);
  if (authError) return authError;

  try {
    const url = request.nextUrl.searchParams.get("url");
    if (!url) {
      return NextResponse.json({ error: "Missing `url` query param" }, { status: 400 });
    }
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent": "ClaudeChromeBridge/1.0 (+https://zenitha.luxury)",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(15_000),
    }).catch((err) => {
      throw new Error(`Fetch failed: ${err instanceof Error ? err.message : String(err)}`);
    });

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        url,
        httpStatus: response.status,
        error: `Page returned ${response.status}`,
      });
    }

    const html = await response.text();
    const blocks = extractJsonLdBlocks(html);

    const findings: Finding[] = [];
    const actions: InterpretedAction[] = [];
    const validated: Array<{
      raw: string;
      parsed: unknown;
      parseError?: string;
      types: string[];
      missingFields: string[];
      deprecatedTypes: string[];
    }> = [];

    if (blocks.length === 0) {
      findings.push({
        pillar: "technical",
        issue: "No JSON-LD structured data found on page",
        severity: "warning",
        evidence: `Fetched ${html.length} bytes of HTML, 0 <script type="application/ld+json"> blocks`,
      });
      actions.push({
        action: "Add schema.org JSON-LD. Minimum: Organization + WebSite + Article (for blog posts) via lib/seo/structured-data.ts helpers.",
        priority: "high",
        autoFixable: true,
        estimatedEffort: "small",
      });
    }

    const typeOccurrences: Record<string, number> = {};

    for (const raw of blocks) {
      let parsed: unknown = null;
      let parseError: string | undefined;
      try {
        parsed = JSON.parse(raw);
      } catch (err) {
        parseError = err instanceof Error ? err.message : String(err);
      }

      if (parseError) {
        validated.push({
          raw: raw.slice(0, 200),
          parsed: null,
          parseError,
          types: [],
          missingFields: [],
          deprecatedTypes: [],
        });
        findings.push({
          pillar: "technical",
          issue: "Malformed JSON-LD block — page may lose rich results eligibility",
          severity: "critical",
          evidence: parseError.slice(0, 200),
        });
        actions.push({
          action: "Fix JSON-LD syntax. Validate in schema.org validator before deploy.",
          priority: "critical",
          autoFixable: false,
          estimatedEffort: "trivial",
        });
        continue;
      }

      const items = Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === "object" && "@graph" in parsed && Array.isArray((parsed as Record<string, unknown>)["@graph"])
          ? (parsed as Record<string, unknown>)["@graph"] as unknown[]
          : [parsed];

      const types: string[] = [];
      const missingFields: string[] = [];
      const deprecatedTypes: string[] = [];

      for (const item of items) {
        if (!item || typeof item !== "object") continue;
        const record = item as Record<string, unknown>;
        const type = record["@type"];
        const typeList = Array.isArray(type) ? type : [type];
        for (const t of typeList) {
          if (typeof t !== "string") continue;
          types.push(t);
          typeOccurrences[t] = (typeOccurrences[t] ?? 0) + 1;

          if (DEPRECATED_TYPES.has(t)) {
            deprecatedTypes.push(t);
          }

          const required = REQUIRED_FIELDS[t];
          if (required) {
            for (const field of required) {
              if (!(field in record) || record[field] === null || record[field] === "") {
                missingFields.push(`${t}.${field}`);
              }
            }
          }
        }

        if (!record["@context"]) {
          findings.push({
            pillar: "technical",
            issue: `JSON-LD block missing @context (types: ${typeList.join(", ")})`,
            severity: "warning",
            evidence: JSON.stringify(record).slice(0, 150),
          });
        }
      }

      validated.push({
        raw: raw.slice(0, 200),
        parsed,
        types,
        missingFields,
        deprecatedTypes,
      });

      for (const field of missingFields) {
        findings.push({
          pillar: "technical",
          issue: `Missing required schema field: ${field}`,
          severity: "warning",
          evidence: `Required for rich results eligibility`,
        });
      }

      for (const t of deprecatedTypes) {
        findings.push({
          pillar: "technical",
          issue: `Deprecated schema type: ${t} — no longer produces rich results (Google Search Central 2023-2025)`,
          severity: "warning",
          evidence: `Type ${t} is deprecated or restricted`,
        });
        actions.push({
          action: `Replace ${t} with Article schema, or remove entirely. See lib/seo/standards.ts isSchemaDeprecated()`,
          priority: "medium",
          autoFixable: true,
          estimatedEffort: "trivial",
        });
      }
    }

    // Check for expected types on article pages
    const isArticlePage = /\/blog\/|\/news\//.test(url);
    if (isArticlePage) {
      const hasArticleLikeType =
        typeOccurrences["Article"] ||
        typeOccurrences["BlogPosting"] ||
        typeOccurrences["NewsArticle"];
      if (!hasArticleLikeType && blocks.length > 0) {
        findings.push({
          pillar: "technical",
          issue: "Blog/news page is missing Article (or BlogPosting / NewsArticle) schema",
          severity: "warning",
        });
        actions.push({
          action: "Add Article JSON-LD via lib/seo/schema-generator.ts.",
          priority: "high",
          autoFixable: true,
          estimatedEffort: "trivial",
        });
      }
    }

    return NextResponse.json({
      success: true,
      url,
      blockCount: blocks.length,
      typeOccurrences,
      validated,
      findings,
      interpretedActions: actions,
      _hints: buildHints({ justCalled: "schema" }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[chrome-bridge/schema]", message);
    return NextResponse.json(
      { error: "Failed to validate schema", details: message },
      { status: 500 },
    );
  }
}

/**
 * Extract JSON-LD script blocks from HTML. Simple regex — does NOT decode
 * HTML entities, so data-heavy structured data may have escaped chars.
 * Sufficient for the common case of Next.js-rendered JSON-LD.
 */
function extractJsonLdBlocks(html: string): string[] {
  const matches = html.match(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  if (!matches) return [];
  return matches
    .map((m) => m.replace(/<script[^>]*>/i, "").replace(/<\/script>/i, "").trim())
    .filter((s) => s.length > 0);
}
