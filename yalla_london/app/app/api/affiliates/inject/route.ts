export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";

/**
 * Affiliate Link Injection API (Admin-only)
 *
 * GET: Returns affiliate links matched to content keywords
 * POST: Injects affiliate links into specified content or across all content
 *
 * Used by:
 * - SEO agent to auto-inject affiliate links into new articles
 * - Admin dashboard to manage and preview affiliate placements
 * - Content generation pipeline to embed affiliates in new articles
 */

// Keyword-to-affiliate mapping for auto-injection
const AFFILIATE_RULES: AffiliateRule[] = [
  // Hotels
  {
    keywords: [
      "hotel",
      "hotels",
      "accommodation",
      "stay",
      "booking",
      "resort",
      "فندق",
      "فنادق",
      "إقامة",
      "حجز",
    ],
    affiliates: [
      {
        name: "Booking.com",
        url: "https://www.booking.com/city/gb/london.html",
        param: `?aid=${process.env.BOOKING_AFFILIATE_ID || ""}`,
        category: "hotel",
      },
      {
        name: "Agoda",
        url: "https://www.agoda.com/london",
        param: `?cid=${process.env.AGODA_AFFILIATE_ID || ""}`,
        category: "hotel",
      },
    ],
  },
  // Restaurants & Food
  {
    keywords: [
      "restaurant",
      "dining",
      "food",
      "halal",
      "cuisine",
      "eat",
      "مطعم",
      "طعام",
      "حلال",
      "مطاعم",
    ],
    affiliates: [
      {
        name: "TheFork",
        url: "https://www.thefork.co.uk/london",
        param: `?ref=${process.env.THEFORK_AFFILIATE_ID || ""}`,
        category: "restaurant",
      },
      {
        name: "OpenTable",
        url: "https://www.opentable.co.uk/london",
        param: `?ref=${process.env.OPENTABLE_AFFILIATE_ID || ""}`,
        category: "restaurant",
      },
    ],
  },
  // Tours & Activities
  {
    keywords: [
      "tour",
      "tours",
      "experience",
      "activity",
      "visit",
      "attraction",
      "جولة",
      "تجربة",
      "نشاط",
      "زيارة",
    ],
    affiliates: [
      {
        name: "GetYourGuide",
        url: "https://www.getyourguide.com/london-l57/",
        param: `?partner_id=${process.env.GETYOURGUIDE_AFFILIATE_ID || ""}`,
        category: "activity",
      },
      {
        name: "Viator",
        url: "https://www.viator.com/London/d737",
        param: `?pid=${process.env.VIATOR_AFFILIATE_ID || ""}`,
        category: "activity",
      },
    ],
  },
  // Events & Tickets
  {
    keywords: [
      "ticket",
      "event",
      "match",
      "concert",
      "show",
      "theatre",
      "football",
      "تذكرة",
      "فعالية",
      "مباراة",
      "حفلة",
    ],
    affiliates: [
      {
        name: "StubHub",
        url: "https://www.stubhub.co.uk",
        param: `?gcid=${process.env.STUBHUB_AFFILIATE_ID || ""}`,
        category: "tickets",
      },
      {
        name: "Ticketmaster",
        url: "https://www.ticketmaster.co.uk",
        param: `?tm_link=${process.env.TICKETMASTER_AFFILIATE_ID || ""}`,
        category: "tickets",
      },
    ],
  },
  // Shopping
  {
    keywords: [
      "shopping",
      "shop",
      "buy",
      "luxury",
      "brand",
      "fashion",
      "Harrods",
      "تسوق",
      "شراء",
      "فاخر",
      "ماركة",
    ],
    affiliates: [
      {
        name: "Harrods",
        url: "https://www.harrods.com",
        param: "?utm_source=yallalondon",
        category: "shopping",
      },
      {
        name: "Selfridges",
        url: "https://www.selfridges.com",
        param: "?utm_source=yallalondon",
        category: "shopping",
      },
    ],
  },
  // Transport
  {
    keywords: [
      "transfer",
      "airport",
      "taxi",
      "car",
      "transport",
      "Heathrow",
      "نقل",
      "مطار",
      "تاكسي",
      "سيارة",
    ],
    affiliates: [
      {
        name: "Blacklane",
        url: "https://www.blacklane.com/en/london",
        param: `?aff=${process.env.BLACKLANE_AFFILIATE_ID || ""}`,
        category: "transport",
      },
    ],
  },
  // Travel Insurance
  {
    keywords: [
      "insurance",
      "travel insurance",
      "safety",
      "protection",
      "تأمين",
      "تأمين سفر",
      "حماية",
    ],
    affiliates: [
      {
        name: "Allianz Travel",
        url: "https://www.allianztravelinsurance.com",
        param: "?utm_source=yallalondon",
        category: "insurance",
      },
    ],
  },
];

interface AffiliateRule {
  keywords: string[];
  affiliates: AffiliateLink[];
}

interface AffiliateLink {
  name: string;
  url: string;
  param: string;
  category: string;
}

interface AffiliateMatch {
  keyword: string;
  affiliate: AffiliateLink;
  relevanceScore: number;
}

/**
 * GET: Find affiliate links relevant to given content/keywords
 */
export const GET = withAdminAuth(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const content = searchParams.get("content") || "";
  const keywords = searchParams.get("keywords")?.split(",") || [];
  const category = searchParams.get("category");
  const limitStr = searchParams.get("limit") || "4";
  const limit = Math.min(Math.max(parseInt(limitStr) || 4, 1), 20);

  const matches = findAffiliateMatches(content, keywords, category, limit);

  return NextResponse.json({
    success: true,
    matches,
    totalRules: AFFILIATE_RULES.length,
  });
});

/**
 * POST: Inject affiliate links into content
 * Body: { contentId?, content?, mode: 'preview' | 'apply' | 'bulk' }
 */
export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { contentId, content, mode = "preview", category } = body;

    if (mode === "bulk") {
      return await bulkInjectAffiliates();
    }

    if (contentId) {
      return await injectIntoPost(contentId, mode);
    }

    if (content) {
      const result = injectAffiliateLinks(content, category);
      return NextResponse.json({ success: true, ...result });
    }

    return NextResponse.json(
      { error: "Provide contentId or content" },
      { status: 400 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Injection failed" },
      { status: 500 },
    );
  }
});

/**
 * Find matching affiliate links for given content
 */
function findAffiliateMatches(
  content: string,
  extraKeywords: string[],
  categoryFilter: string | null,
  limit: number,
): AffiliateMatch[] {
  const contentLower = content.toLowerCase();
  const matches: AffiliateMatch[] = [];

  for (const rule of AFFILIATE_RULES) {
    for (const keyword of rule.keywords) {
      const keywordLower = keyword.toLowerCase();
      const inContent = contentLower.includes(keywordLower);
      const inKeywords = extraKeywords.some((k) =>
        k.toLowerCase().includes(keywordLower),
      );

      if (inContent || inKeywords) {
        for (const affiliate of rule.affiliates) {
          if (categoryFilter && affiliate.category !== categoryFilter) continue;

          // Calculate relevance score
          let score = 0;
          if (inContent) {
            const occurrences = (
              contentLower.match(new RegExp(keywordLower, "g")) || []
            ).length;
            score += Math.min(occurrences * 10, 50);
          }
          if (inKeywords) score += 30;

          // Avoid duplicates
          if (!matches.some((m) => m.affiliate.name === affiliate.name)) {
            matches.push({ keyword, affiliate, relevanceScore: score });
          }
        }
      }
    }
  }

  return matches
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit);
}

/** Escape HTML special characters to prevent XSS */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Inject affiliate links into HTML content
 */
function injectAffiliateLinks(htmlContent: string, categoryFilter?: string) {
  const matches = findAffiliateMatches(
    htmlContent,
    [],
    categoryFilter || null,
    4,
  );

  if (matches.length === 0) {
    return { content: htmlContent, affiliatesInjected: 0, matches: [] };
  }

  let modifiedContent = htmlContent;
  const injected: string[] = [];

  // Strategy 1: Add affiliate CTA boxes after relevant paragraphs
  for (const match of matches.slice(0, 3)) {
    const { affiliate } = match;
    const safeName = escapeHtml(affiliate.name);
    const safeCategory = escapeHtml(affiliate.category);
    const safeUrl = encodeURI(affiliate.url + affiliate.param);
    const affiliateBox = `
<div class="affiliate-recommendation" data-affiliate="${safeName}" data-category="${safeCategory}" style="margin: 1.5rem 0; padding: 1rem 1.5rem; background: linear-gradient(135deg, #f8f4ff, #fff8e1); border-left: 4px solid #7c3aed; border-radius: 8px;">
  <p style="margin: 0 0 0.5rem 0; font-weight: 600; color: #4c1d95;">Recommended: ${safeName}</p>
  <p style="margin: 0 0 0.75rem 0; color: #6b7280; font-size: 0.9rem;">Book through our trusted partner for exclusive rates</p>
  <a href="${safeUrl}" target="_blank" rel="noopener sponsored" style="display: inline-block; padding: 0.5rem 1.5rem; background: #7c3aed; color: white; border-radius: 6px; text-decoration: none; font-weight: 500;">View on ${safeName} &rarr;</a>
</div>`;

    // Find a good insertion point - after a paragraph that mentions the keyword
    const keywordRegex = new RegExp(
      `(</p>)(?=[\\s\\S]*${match.keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
      "i",
    );
    const insertMatch = modifiedContent.match(keywordRegex);

    if (insertMatch && insertMatch.index !== undefined) {
      modifiedContent =
        modifiedContent.slice(0, insertMatch.index + insertMatch[0].length) +
        affiliateBox +
        modifiedContent.slice(insertMatch.index + insertMatch[0].length);
      injected.push(affiliate.name);
    }
  }

  // Strategy 2: Add a "Recommended Partners" section at the end if we have matches
  if (matches.length > 0) {
    const partnersSection = `
<div class="affiliate-partners-section" style="margin-top: 2rem; padding: 1.5rem; background: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb;">
  <h3 style="margin: 0 0 1rem 0; color: #1f2937;">Recommended Partners</h3>
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
    ${matches
      .map(
        (m) => `
    <a href="${encodeURI(m.affiliate.url + m.affiliate.param)}" target="_blank" rel="noopener sponsored" style="display: block; padding: 1rem; background: white; border-radius: 8px; border: 1px solid #e5e7eb; text-decoration: none; color: inherit; transition: box-shadow 0.2s;">
      <strong style="color: #7c3aed;">${escapeHtml(m.affiliate.name)}</strong>
      <span style="display: block; font-size: 0.85rem; color: #6b7280; margin-top: 0.25rem;">${escapeHtml(m.affiliate.category)}</span>
    </a>
    `,
      )
      .join("")}
  </div>
</div>`;

    modifiedContent += partnersSection;
  }

  return {
    content: modifiedContent,
    affiliatesInjected: injected.length + (matches.length > 0 ? 1 : 0),
    matches: matches.map((m) => ({
      name: m.affiliate.name,
      category: m.affiliate.category,
      keyword: m.keyword,
    })),
  };
}

/**
 * Inject affiliate links into a specific blog post
 */
async function injectIntoPost(postId: string, mode: string) {
  const { prisma } = await import("@/lib/db");

  const post = await prisma.blogPost.findUnique({
    where: { id: postId },
    select: {
      id: true,
      content_en: true,
      content_ar: true,
      title_en: true,
      slug: true,
    },
  });

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const enResult = injectAffiliateLinks(post.content_en || "");
  const arResult = injectAffiliateLinks(post.content_ar || "");

  if (mode === "apply") {
    await prisma.blogPost.update({
      where: { id: postId },
      data: {
        content_en: enResult.content,
        content_ar: arResult.content,
      },
    });

    return NextResponse.json({
      success: true,
      mode: "applied",
      post: post.slug,
      enAffiliates: enResult.affiliatesInjected,
      arAffiliates: arResult.affiliatesInjected,
    });
  }

  return NextResponse.json({
    success: true,
    mode: "preview",
    post: post.slug,
    enPreview: {
      affiliatesInjected: enResult.affiliatesInjected,
      matches: enResult.matches,
    },
    arPreview: {
      affiliatesInjected: arResult.affiliatesInjected,
      matches: arResult.matches,
    },
  });
}

/**
 * Bulk inject affiliates into all published posts
 */
async function bulkInjectAffiliates() {
  const { prisma } = await import("@/lib/db");

  const posts = await prisma.blogPost.findMany({
    where: {
      published: true,
      deletedAt: null,
      content_en: { not: "" },
    },
    select: { id: true, content_en: true, content_ar: true, slug: true },
  });

  let injectedCount = 0;
  const results: any[] = [];

  for (const post of posts) {
    // Skip posts that already have affiliate links
    if (post.content_en?.includes("affiliate-recommendation")) continue;

    const enResult = injectAffiliateLinks(post.content_en || "");
    const arResult = injectAffiliateLinks(post.content_ar || "");

    if (enResult.affiliatesInjected > 0 || arResult.affiliatesInjected > 0) {
      await prisma.blogPost.update({
        where: { id: post.id },
        data: {
          content_en: enResult.content,
          content_ar: arResult.content,
        },
      });
      injectedCount++;
      results.push({
        slug: post.slug,
        en: enResult.affiliatesInjected,
        ar: arResult.affiliatesInjected,
      });
    }
  }

  console.log(
    `[Affiliate Bulk Inject] Updated ${injectedCount}/${posts.length} posts at ${new Date().toISOString()}`,
  );

  return NextResponse.json({
    success: true,
    mode: "bulk",
    totalPosts: posts.length,
    postsUpdated: injectedCount,
    results,
  });
}
