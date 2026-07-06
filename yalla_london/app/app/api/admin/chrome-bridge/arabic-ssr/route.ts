/**
 * GET /api/admin/chrome-bridge/arabic-ssr?siteId=X&limit=N
 * GET /api/admin/chrome-bridge/arabic-ssr?url=X (single-URL mode)
 *
 * Checks that `/ar/` routes actually serve Arabic content server-side, not
 * English HTML hydrated to Arabic client-side (the classic KG-032 issue).
 *
 * For each target URL, fetches the HTML and inspects:
 *   - `<html lang="ar">` present
 *   - `<html dir="rtl">` or `<body dir="rtl">` present
 *   - Arabic character frequency in the first 3000 chars of body
 *     (Arabic block U+0600..U+06FF) — must exceed threshold
 *   - Title tag contains Arabic characters
 *   - At least one H1/H2 contains Arabic characters
 *
 * If the HTML renders English despite being at an /ar/ route, the page fails
 * and a finding is generated for the audit report.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireBridgeToken } from "@/lib/agents/bridge-auth";
import { buildHints } from "@/lib/chrome-bridge/manifest";
import type { Finding, InterpretedAction } from "@/lib/chrome-bridge/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ARABIC_CHAR_RE = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
const ARABIC_CHAR_RE_GLOBAL = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/g;
const MIN_ARABIC_CHAR_RATIO = 0.2; // 20% of first 3000 chars must be Arabic

interface PageSSRResult {
  url: string;
  httpStatus: number;
  htmlLangAr: boolean;
  dirRtl: boolean;
  arabicCharRatio: number;
  titleHasArabic: boolean;
  hasArabicHeading: boolean;
  passes: boolean;
  issues: string[];
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authError = await requireBridgeToken(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");
    const { getDefaultSiteId, getSiteDomain } = await import("@/config/sites");

    const explicitUrl = request.nextUrl.searchParams.get("url") ?? undefined;
    const siteId = request.nextUrl.searchParams.get("siteId") || getDefaultSiteId();
    const limit = Math.min(
      parseInt(request.nextUrl.searchParams.get("limit") || "10", 10),
      30,
    );
    const domain = getSiteDomain(siteId).replace(/\/$/, "");

    const urlsToCheck: string[] = [];
    if (explicitUrl) {
      try {
        new URL(explicitUrl);
      } catch {
        return NextResponse.json({ error: "Invalid url" }, { status: 400 });
      }
      urlsToCheck.push(explicitUrl);
    } else {
      // Default set: homepage, about, contact, blog index + N recent posts — all at /ar/
      const staticPaths = ["/ar/", "/ar/about", "/ar/contact", "/ar/blog"];
      for (const p of staticPaths) urlsToCheck.push(`${domain}${p}`);

      const posts = await prisma.blogPost.findMany({
        where: { published: true, siteId },
        select: { slug: true },
        orderBy: { created_at: "desc" },
        take: limit,
      });
      for (const p of posts) urlsToCheck.push(`${domain}/ar/blog/${p.slug}`);
    }

    // Parallel fetch with 10s timeout each, max 6 in flight
    const results: PageSSRResult[] = [];
    const concurrency = 6;
    for (let i = 0; i < urlsToCheck.length; i += concurrency) {
      const batch = urlsToCheck.slice(i, i + concurrency);
      const batchResults = await Promise.all(batch.map(checkArabicSSR));
      results.push(...batchResults);
    }

    const passes = results.filter((r) => r.passes);
    const fails = results.filter((r) => !r.passes && r.httpStatus >= 200 && r.httpStatus < 400);
    const fetchErrors = results.filter((r) => r.httpStatus === 0 || r.httpStatus >= 500);

    const findings: Finding[] = [];
    const actions: InterpretedAction[] = [];

    if (fails.length > 0) {
      findings.push({
        pillar: "technical",
        issue: `${fails.length}/${results.length} /ar/ URLs render English server-side (KG-032)`,
        severity: "critical",
        evidence: fails.slice(0, 5).map((f) => `${f.url}: ${f.issues.join(", ")}`).join(" | "),
      });
      actions.push({
        action: "Fix Arabic SSR: blog/[slug] must pass serverLocale='ar' prop to client component so initial HTML contains Arabic content. Check other /ar/ routes similarly.",
        priority: "high",
        autoFixable: false,
        estimatedEffort: "medium",
        relatedKG: "KG-032",
      });
    }

    return NextResponse.json({
      success: true,
      siteId,
      summary: {
        pagesChecked: results.length,
        passed: passes.length,
        failed: fails.length,
        fetchErrors: fetchErrors.length,
        complianceRate:
          results.length > 0
            ? Number((passes.length / results.length).toFixed(3))
            : 0,
      },
      results,
      findings,
      interpretedActions: actions,
      _hints: buildHints({ justCalled: "arabic-ssr" }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[chrome-bridge/arabic-ssr]", message);
    return NextResponse.json(
      { error: "Failed to run Arabic SSR check", details: message },
      { status: 500 },
    );
  }
}

async function checkArabicSSR(url: string): Promise<PageSSRResult> {
  const result: PageSSRResult = {
    url,
    httpStatus: 0,
    htmlLangAr: false,
    dirRtl: false,
    arabicCharRatio: 0,
    titleHasArabic: false,
    hasArabicHeading: false,
    passes: false,
    issues: [],
  };

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "ClaudeChromeBridge/1.0 (+https://zenitha.luxury)",
        Accept: "text/html",
        "Accept-Language": "ar,en;q=0.5",
      },
      signal: AbortSignal.timeout(10_000),
      redirect: "follow",
    });
    result.httpStatus = response.status;
    if (!response.ok) {
      result.issues.push(`HTTP ${response.status}`);
      return result;
    }

    const html = await response.text();

    // Check <html lang="ar">
    result.htmlLangAr = /<html[^>]+lang=["']ar(?:[-_][A-Z]{2})?["']/i.test(html);
    if (!result.htmlLangAr) result.issues.push("missing <html lang=\"ar\">");

    // Check dir="rtl" (on html or body)
    result.dirRtl = /<(?:html|body)[^>]+dir=["']rtl["']/i.test(html);
    if (!result.dirRtl) result.issues.push("missing dir=\"rtl\"");

    // Extract body content
    const bodyMatch = html.match(/<body[^>]*>([\s\S]{0,5000})/i);
    const bodySample = bodyMatch ? bodyMatch[1] : html.slice(0, 5000);
    // Strip script/style blocks and tags
    const textSample = bodySample
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&[a-z]+;|&#\d+;/gi, "")
      .slice(0, 3000);

    if (textSample.length > 0) {
      const arabicMatches = textSample.match(ARABIC_CHAR_RE_GLOBAL);
      const ratio = arabicMatches ? arabicMatches.length / textSample.length : 0;
      result.arabicCharRatio = Number(ratio.toFixed(3));
      if (ratio < MIN_ARABIC_CHAR_RATIO) {
        result.issues.push(
          `body text is ${(ratio * 100).toFixed(1)}% Arabic (min ${MIN_ARABIC_CHAR_RATIO * 100}%)`,
        );
      }
    } else {
      result.issues.push("empty body");
    }

    // Title check
    const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
    if (titleMatch) {
      result.titleHasArabic = ARABIC_CHAR_RE.test(titleMatch[1]);
      if (!result.titleHasArabic) result.issues.push("title has no Arabic chars");
    } else {
      result.issues.push("no <title> tag");
    }

    // Heading check
    const headingMatches = html.match(/<h[12][^>]*>[^<]{0,500}<\/h[12]>/gi) ?? [];
    result.hasArabicHeading = headingMatches.some((h) => ARABIC_CHAR_RE.test(h));
    if (!result.hasArabicHeading) result.issues.push("no H1/H2 with Arabic content");

    // Pass requires all 5 conditions
    result.passes =
      result.htmlLangAr &&
      result.dirRtl &&
      result.arabicCharRatio >= MIN_ARABIC_CHAR_RATIO &&
      result.titleHasArabic &&
      result.hasArabicHeading;

    return result;
  } catch (err) {
    result.issues.push(
      `fetch error: ${err instanceof Error ? err.message : String(err)}`,
    );
    return result;
  }
}
