/**
 * CJ Affiliate Content Processor
 *
 * Processes HTML content and injects affiliate links server-side.
 * - Keyword replacement with affiliate links
 * - CTA block injection after key paragraphs
 * - Disclosure text insertion
 * - All links include rel="sponsored nofollow"
 */

import { getLinksForContent, type SelectedLink } from "./link-injector";
import { generateTrackingUrl } from "./link-tracker";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_AFFILIATE_LINKS = 5;
const MIN_PARAGRAPHS_BETWEEN_INJECTIONS = 2;

const DISCLOSURE_EN =
  process.env.AFFILIATE_DISCLOSURE_EN ||
  "This page contains affiliate links. We may earn a commission at no extra cost to you when you book through these links.";

const DISCLOSURE_AR =
  process.env.AFFILIATE_DISCLOSURE_AR ||
  "تحتوي هذه الصفحة على روابط تابعة. قد نحصل على عمولة دون أي تكلفة إضافية عليك عند الحجز من خلال هذه الروابط.";

// ---------------------------------------------------------------------------
// Content Processing
// ---------------------------------------------------------------------------

export interface ProcessedContent {
  html: string;
  injectedLinks: Array<{
    linkId: string;
    advertiserName: string;
    position: string;
  }>;
  hasAffiliateContent: boolean;
}

/**
 * Process content HTML and inject affiliate links.
 */
export async function processContent(
  html: string,
  metadata: {
    category: string;
    tags: string[];
    language: "en" | "ar";
    articleId?: string;
    baseUrl?: string;
    slug?: string;
    siteId?: string;
  }
): Promise<ProcessedContent> {
  const injectedLinks: ProcessedContent["injectedLinks"] = [];

  // Check feature flag
  try {
    const { isFeatureFlagEnabled } = await import("@/lib/feature-flags");
    const enabled = await isFeatureFlagEnabled("FEATURE_AFFILIATE_AUTO_INJECT");
    if (!enabled) {
      return { html, injectedLinks: [], hasAffiliateContent: false };
    }
  } catch (err) {
    console.warn("[content-processor] Feature flag check failed, proceeding:", err instanceof Error ? err.message : String(err));
  }

  // Get matching links (per-site)
  const injection = await getLinksForContent(
    html,
    metadata.language,
    metadata.category,
    metadata.tags,
    MAX_AFFILIATE_LINKS,
    metadata.siteId
  );

  if (injection.links.length === 0) {
    return { html, injectedLinks: [], hasAffiliateContent: false };
  }

  // Split HTML into paragraphs
  const paragraphs = splitIntoParagraphs(html);

  if (paragraphs.length < 3) {
    // Too short for injection
    return { html, injectedLinks: [], hasAffiliateContent: false };
  }

  // Inject CTA blocks after key paragraphs
  let linksUsed = 0;
  let lastInjectionIndex = -MIN_PARAGRAPHS_BETWEEN_INJECTIONS; // Allow first injection

  for (const { position, link } of injection.placements) {
    if (linksUsed >= MAX_AFFILIATE_LINKS) break;

    const targetIndex = getTargetParagraphIndex(position, paragraphs.length);
    if (targetIndex <= 0) continue; // Never inject before/into first paragraph
    if (targetIndex - lastInjectionIndex < MIN_PARAGRAPHS_BETWEEN_INJECTIONS) continue;

    // Build SID for revenue attribution: siteId_articleSlug
    const sid = metadata.slug
      ? `${metadata.siteId || "default"}_${metadata.slug}`.substring(0, 100)
      : undefined;
    const trackingUrl = generateTrackingUrl(link.id, metadata.baseUrl, sid);
    const ctaHtml = generateCtaBlock(link, trackingUrl, metadata.language);

    // Insert CTA after the target paragraph
    paragraphs.splice(targetIndex + 1, 0, ctaHtml);
    lastInjectionIndex = targetIndex + 1;
    linksUsed++;

    injectedLinks.push({
      linkId: link.id,
      advertiserName: link.advertiserName,
      position,
    });
  }

  // Add disclosure at the top
  const disclosureHtml = generateDisclosure(metadata.language);
  paragraphs.unshift(disclosureHtml);

  return {
    html: paragraphs.join("\n"),
    injectedLinks,
    hasAffiliateContent: injectedLinks.length > 0,
  };
}

// ---------------------------------------------------------------------------
// HTML Generation
// ---------------------------------------------------------------------------

function generateCtaBlock(
  link: SelectedLink,
  trackingUrl: string,
  language: "en" | "ar"
): string {
  const isRtl = language === "ar";
  const safeName = escapeHtml(link.advertiserName);

  const ctaText = isRtl
    ? `عرض على ${safeName}`
    : `View on ${safeName} →`;

  const recommendedText = isRtl
    ? `موصى به: ${safeName}`
    : `Recommended: ${safeName}`;

  return `<div class="affiliate-cta-block" data-affiliate-id="${escapeHtml(link.id)}" data-advertiser="${safeName}" style="margin:1.5rem 0;padding:1rem 1.5rem;background:linear-gradient(135deg,#f8f9fa,#fff8e1);border-${isRtl ? "right" : "left"}:4px solid #C49A2A;border-radius:8px;direction:${isRtl ? "rtl" : "ltr"};">
  <p style="font-weight:600;color:#1a1a2e;margin-bottom:0.5rem;font-size:0.95rem;">${recommendedText}</p>
  <a href="${escapeHtml(trackingUrl)}" target="_blank" rel="sponsored nofollow noopener" style="display:inline-block;padding:0.5rem 1.5rem;background:#C49A2A;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:0.9rem;transition:background 0.2s;" onmouseover="this.style.background='#b08a24'" onmouseout="this.style.background='#C49A2A'">${ctaText}</a>
</div>`;
}

function generateDisclosure(language: "en" | "ar"): string {
  const isRtl = language === "ar";
  const text = isRtl ? DISCLOSURE_AR : DISCLOSURE_EN;

  return `<div class="affiliate-disclosure" style="margin-bottom:1.5rem;padding:0.75rem 1rem;background:#f8f9fa;border-radius:6px;font-size:0.8rem;color:#666;direction:${isRtl ? "rtl" : "ltr"};">
  <p style="margin:0;">${escapeHtml(text)}</p>
</div>`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function splitIntoParagraphs(html: string): string[] {
  // Split on paragraph boundaries while preserving tags
  return html.split(/(?=<(?:p|div|h[1-6]|section|article|blockquote)\b)/i).filter((p) => p.trim());
}

function getTargetParagraphIndex(position: string, totalParagraphs: number): number {
  switch (position) {
    case "after-paragraph-3":
      return Math.min(3, totalParagraphs - 1);
    case "after-paragraph-6":
      return Math.min(6, totalParagraphs - 1);
    case "before-conclusion":
      return Math.max(totalParagraphs - 2, 3);
    case "after-each-section":
      return Math.min(4, totalParagraphs - 1);
    default:
      return Math.min(3, totalParagraphs - 1);
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
