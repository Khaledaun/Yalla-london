export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Affiliate Injection Cron Job
 *
 * Runs daily at 09:00 UTC (30 min after content-selector).
 * Finds published BlogPosts with unfilled affiliate-placeholder divs
 * and replaces them with actual affiliate CTAs.
 *
 * Also catches articles from daily-content-generate that bypass
 * the content-selector pipeline.
 */

import { NextRequest, NextResponse } from "next/server";
import { logCronExecution } from "@/lib/cron-logger";

const BUDGET_MS = 53_000;

// Keyword-to-affiliate mapping (mirrors /api/affiliates/inject)
const AFFILIATE_RULES = [
  {
    keywords: ["hotel", "hotels", "accommodation", "stay", "booking", "resort", "فندق", "فنادق"],
    affiliates: [
      { name: "Booking.com", url: "https://www.booking.com/city/gb/london.html", param: `?aid=${process.env.BOOKING_AFFILIATE_ID || ""}`, category: "hotel" },
      { name: "Agoda", url: "https://www.agoda.com/london", param: `?cid=${process.env.AGODA_AFFILIATE_ID || ""}`, category: "hotel" },
    ],
  },
  {
    keywords: ["restaurant", "dining", "food", "halal", "cuisine", "eat", "مطعم", "طعام", "حلال"],
    affiliates: [
      { name: "TheFork", url: "https://www.thefork.co.uk/london", param: `?ref=${process.env.THEFORK_AFFILIATE_ID || ""}`, category: "restaurant" },
      { name: "OpenTable", url: "https://www.opentable.co.uk/london", param: `?ref=${process.env.OPENTABLE_AFFILIATE_ID || ""}`, category: "restaurant" },
    ],
  },
  {
    keywords: ["tour", "tours", "experience", "activity", "visit", "attraction", "جولة", "تجربة"],
    affiliates: [
      { name: "GetYourGuide", url: "https://www.getyourguide.com/london-l57/", param: `?partner_id=${process.env.GETYOURGUIDE_AFFILIATE_ID || ""}`, category: "activity" },
      { name: "Viator", url: "https://www.viator.com/London/d737", param: `?pid=${process.env.VIATOR_AFFILIATE_ID || ""}`, category: "activity" },
    ],
  },
  {
    keywords: ["ticket", "event", "match", "concert", "show", "theatre", "football", "تذكرة", "فعالية"],
    affiliates: [
      { name: "StubHub", url: "https://www.stubhub.co.uk", param: `?gcid=${process.env.STUBHUB_AFFILIATE_ID || ""}`, category: "tickets" },
      { name: "Ticketmaster", url: "https://www.ticketmaster.co.uk", param: `?tm_link=${process.env.TICKETMASTER_AFFILIATE_ID || ""}`, category: "tickets" },
    ],
  },
  {
    keywords: ["shopping", "shop", "buy", "luxury", "brand", "fashion", "Harrods", "تسوق"],
    affiliates: [
      { name: "Harrods", url: "https://www.harrods.com", param: "?utm_source=yallalondon", category: "shopping" },
      { name: "Selfridges", url: "https://www.selfridges.com", param: "?utm_source=yallalondon", category: "shopping" },
    ],
  },
  {
    keywords: ["transfer", "airport", "taxi", "car", "transport", "Heathrow", "نقل", "مطار"],
    affiliates: [
      { name: "Blacklane", url: "https://www.blacklane.com/en/london", param: `?aff=${process.env.BLACKLANE_AFFILIATE_ID || ""}`, category: "transport" },
    ],
  },
  {
    keywords: ["insurance", "travel insurance", "safety", "protection", "تأمين"],
    affiliates: [
      { name: "Allianz Travel", url: "https://www.allianztravelinsurance.com", param: "?utm_source=yallalondon", category: "insurance" },
    ],
  },
];

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function findMatches(content: string, limit = 4) {
  const lower = content.toLowerCase();
  const matches: Array<{ keyword: string; name: string; url: string; param: string; category: string; score: number }> = [];

  for (const rule of AFFILIATE_RULES) {
    for (const keyword of rule.keywords) {
      if (lower.includes(keyword.toLowerCase())) {
        for (const aff of rule.affiliates) {
          if (!matches.some((m) => m.name === aff.name)) {
            const occurrences = (lower.match(new RegExp(keyword.toLowerCase(), "g")) || []).length;
            matches.push({ keyword, ...aff, score: Math.min(occurrences * 10, 50) });
          }
        }
      }
    }
  }

  return matches.sort((a, b) => b.score - a.score).slice(0, limit);
}

function injectAffiliates(html: string): { content: string; count: number; partners: string[] } {
  const matches = findMatches(html, 4);
  if (matches.length === 0) return { content: html, count: 0, partners: [] };

  let result = html;
  const partners: string[] = [];

  // Replace placeholder divs with actual CTAs
  for (const match of matches.slice(0, 2)) {
    const safeName = escapeHtml(match.name);
    const safeUrl = encodeURI(match.url + match.param);
    const cta = `
<div class="affiliate-recommendation" data-affiliate="${safeName}" data-category="${escapeHtml(match.category)}" style="margin: 1.5rem 0; padding: 1rem 1.5rem; background: linear-gradient(135deg, #f8f4ff, #fff8e1); border-left: 4px solid #7c3aed; border-radius: 8px;">
  <p style="margin: 0 0 0.5rem 0; font-weight: 600; color: #4c1d95;">Recommended: ${safeName}</p>
  <p style="margin: 0 0 0.75rem 0; color: #6b7280; font-size: 0.9rem;">Book through our trusted partner for exclusive rates</p>
  <a href="${safeUrl}" target="_blank" rel="noopener sponsored" style="display: inline-block; padding: 0.5rem 1.5rem; background: #7c3aed; color: white; border-radius: 6px; text-decoration: none; font-weight: 500;">View on ${safeName} &rarr;</a>
</div>`;

    // Replace first placeholder with this CTA
    const placeholderRegex = /<div class="affiliate-placeholder"[^>]*>[\s\S]*?<\/div>/i;
    if (placeholderRegex.test(result)) {
      result = result.replace(placeholderRegex, cta);
      partners.push(match.name);
    }
  }

  // Replace any remaining placeholders with the partners section
  result = result.replace(/<div class="affiliate-placeholder"[^>]*>[\s\S]*?<\/div>/gi, "");

  // Add recommended partners section at the end
  if (matches.length > 0) {
    result += `
<div class="affiliate-partners-section" style="margin-top: 2rem; padding: 1.5rem; background: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb;">
  <h3 style="margin: 0 0 1rem 0; color: #1f2937;">Recommended Partners</h3>
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
    ${matches
      .map(
        (m) =>
          `<a href="${encodeURI(m.url + m.param)}" target="_blank" rel="noopener sponsored" style="display: block; padding: 1rem; background: white; border-radius: 8px; border: 1px solid #e5e7eb; text-decoration: none; color: inherit;">
      <strong style="color: #7c3aed;">${escapeHtml(m.name)}</strong>
      <span style="display: block; font-size: 0.85rem; color: #6b7280; margin-top: 0.25rem;">${escapeHtml(m.category)}</span>
    </a>`,
      )
      .join("")}
  </div>
</div>`;
    partners.push(...matches.filter((m) => !partners.includes(m.name)).map((m) => m.name));
  }

  return { content: result, count: partners.length, partners };
}

async function handleAffiliateInjection(request: NextRequest) {
  const startTime = Date.now();
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { prisma } = await import("@/lib/db");

    // Find published posts that still have affiliate placeholders OR no affiliate links
    const { getActiveSiteIds } = await import("@/config/sites");
    const activeSiteIds = getActiveSiteIds();
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const posts = await prisma.blogPost.findMany({
      where: {
        published: true,
        deletedAt: null,
        created_at: { gte: twoDaysAgo },
        ...(activeSiteIds.length > 0 ? { siteId: { in: activeSiteIds } } : {}),
      },
      select: {
        id: true,
        content_en: true,
        content_ar: true,
        slug: true,
        title_en: true,
      },
    });

    // Filter to posts that need injection
    const needsInjection = posts.filter(
      (p) =>
        p.content_en.includes('class="affiliate-placeholder"') ||
        !p.content_en.includes('class="affiliate-recommendation"'),
    );

    let injected = 0;
    const results: Array<{ slug: string; partners: string[] }> = [];

    for (const post of needsInjection) {
      if (Date.now() - startTime > BUDGET_MS) break;

      const enResult = injectAffiliates(post.content_en);
      const arResult = injectAffiliates(post.content_ar);

      if (enResult.count > 0 || arResult.count > 0) {
        await prisma.blogPost.update({
          where: { id: post.id },
          data: {
            content_en: enResult.content,
            content_ar: arResult.content,
          },
        });

        injected++;
        results.push({
          slug: post.slug,
          partners: [...new Set([...enResult.partners, ...arResult.partners])],
        });
      }
    }

    const duration = Date.now() - startTime;

    await logCronExecution("affiliate-injection", "completed", {
      durationMs: duration,
      itemsProcessed: injected,
      itemsSucceeded: injected,
      resultSummary: { postsChecked: posts.length, postsNeedingInjection: needsInjection.length },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      postsChecked: posts.length,
      postsNeedingInjection: needsInjection.length,
      postsInjected: injected,
      results,
      duration,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errMsg = error instanceof Error ? error.message : String(error);

    await logCronExecution("affiliate-injection", "failed", {
      durationMs: duration,
      errorMessage: errMsg,
    }).catch(() => {});

    const { onCronFailure } = await import("@/lib/ops/failure-hooks");
    onCronFailure({ jobName: "affiliate-injection", error: errMsg }).catch(() => {});

    return NextResponse.json(
      { error: errMsg },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  return handleAffiliateInjection(request);
}

export async function POST(request: NextRequest) {
  return handleAffiliateInjection(request);
}
