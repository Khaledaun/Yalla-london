/**
 * Pre-Publication Gate
 *
 * A safety gate that runs BEFORE content is published to verify the
 * target URL will actually work. This prevents the system from publishing
 * content to 404 routes (like Arabic content to /ar/* when no routes exist).
 *
 * This directly addresses DISCOVERY.md Gap #8: "No pre-publication gate —
 * content publishes without verifying routes work."
 */

export interface GateResult {
  allowed: boolean;
  checks: GateCheck[];
  blockers: string[];
  warnings: string[];
}

export interface GateCheck {
  name: string;
  passed: boolean;
  message: string;
  severity: "blocker" | "warning" | "info";
}

/**
 * Run all pre-publication checks for a piece of content.
 *
 * @param targetUrl - The URL where this content will be published (e.g. /blog/my-post)
 * @param content - The content being published
 * @param siteUrl - The base site URL (e.g. https://www.yalla-london.com)
 */
export async function runPrePublicationGate(
  targetUrl: string,
  content: {
    title_en?: string;
    title_ar?: string;
    meta_title_en?: string;
    meta_description_en?: string;
    content_en?: string;
    content_ar?: string;
    locale?: string;
    tags?: string[];
    seo_score?: number;
  },
  siteUrl?: string
): Promise<GateResult> {
  const checks: GateCheck[] = [];
  const blockers: string[] = [];
  const warnings: string[] = [];
  const baseUrl =
    siteUrl ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://www.yalla-london.com";

  // ── 1. Route existence check ────────────────────────────────────────
  // Verify the target URL will actually resolve (not return 404)
  try {
    const fullUrl = targetUrl.startsWith("http")
      ? targetUrl
      : `${baseUrl}${targetUrl}`;

    // For new content, we can't check the exact URL (it doesn't exist yet).
    // Instead, check the parent route pattern.
    const parentPath = getParentRoute(targetUrl);
    if (parentPath) {
      const parentUrl = `${baseUrl}${parentPath}`;
      const res = await fetch(parentUrl, {
        method: "HEAD",
        headers: { "User-Agent": "YallaLondon-PrePubGate/1.0" },
        redirect: "manual",
        signal: AbortSignal.timeout(5000),
      });

      if (res.status === 404) {
        const check: GateCheck = {
          name: "Route Existence",
          passed: false,
          message: `Parent route ${parentPath} returns 404 — content at ${targetUrl} will be unreachable`,
          severity: "blocker",
        };
        checks.push(check);
        blockers.push(check.message);
      } else {
        checks.push({
          name: "Route Existence",
          passed: true,
          message: `Parent route ${parentPath} returns ${res.status}`,
          severity: "info",
        });
      }
    }
  } catch (e) {
    warnings.push(
      `Could not verify route existence: ${(e as Error).message}`
    );
  }

  // ── 2. Arabic route check ───────────────────────────────────────────
  // If publishing Arabic content, verify /ar/ routes work
  if (content.locale === "ar" || targetUrl.startsWith("/ar/")) {
    try {
      const arTestUrl = `${baseUrl}/ar`;
      const res = await fetch(arTestUrl, {
        method: "HEAD",
        headers: { "User-Agent": "YallaLondon-PrePubGate/1.0" },
        redirect: "manual",
        signal: AbortSignal.timeout(5000),
      });

      if (res.status === 404) {
        const check: GateCheck = {
          name: "Arabic Routes",
          passed: false,
          message:
            "Arabic routes (/ar/) return 404 — Arabic content will be unreachable. Fix i18n routing first.",
          severity: "blocker",
        };
        checks.push(check);
        blockers.push(check.message);
      } else {
        checks.push({
          name: "Arabic Routes",
          passed: true,
          message: "Arabic routes are accessible",
          severity: "info",
        });
      }
    } catch {
      warnings.push("Could not verify Arabic route status");
    }
  }

  // ── 3. SEO minimum requirements ────────────────────────────────────
  if (!content.title_en || content.title_en.length < 10) {
    checks.push({
      name: "Title (EN)",
      passed: false,
      message: `English title missing or too short (${content.title_en?.length || 0} chars, min 10)`,
      severity: "blocker",
    });
    blockers.push("English title is missing or too short");
  } else {
    checks.push({
      name: "Title (EN)",
      passed: true,
      message: `English title: ${content.title_en.length} chars`,
      severity: "info",
    });
  }

  if (!content.meta_title_en || content.meta_title_en.length < 20) {
    checks.push({
      name: "Meta Title",
      passed: false,
      message: `Meta title missing or too short (${content.meta_title_en?.length || 0} chars, min 20)`,
      severity: "warning",
    });
    warnings.push("Meta title should be at least 20 characters");
  }

  if (
    !content.meta_description_en ||
    content.meta_description_en.length < 50
  ) {
    checks.push({
      name: "Meta Description",
      passed: false,
      message: `Meta description missing or too short (${content.meta_description_en?.length || 0} chars, min 50)`,
      severity: "warning",
    });
    warnings.push("Meta description should be at least 50 characters");
  }

  if (!content.content_en || content.content_en.length < 300) {
    checks.push({
      name: "Content Length",
      passed: false,
      message: `English content too short (${content.content_en?.length || 0} chars, min 300)`,
      severity: "blocker",
    });
    blockers.push("Content is too short for indexing");
  }

  // ── 4. SEO score check ─────────────────────────────────────────────
  if (content.seo_score !== undefined && content.seo_score < 40) {
    checks.push({
      name: "SEO Score",
      passed: false,
      message: `SEO score ${content.seo_score} is below minimum threshold (40)`,
      severity: "warning",
    });
    warnings.push(`Low SEO score: ${content.seo_score}/100`);
  }

  return {
    allowed: blockers.length === 0,
    checks,
    blockers,
    warnings,
  };
}

/**
 * Extract the parent route from a target URL.
 * e.g. /blog/my-post → /blog
 * e.g. /ar/blog/my-post → /ar/blog
 * e.g. /blog/category/restaurants → /blog
 */
function getParentRoute(url: string): string | null {
  const segments = url.split("/").filter(Boolean);
  if (segments.length <= 1) return null;
  return "/" + segments.slice(0, -1).join("/");
}
