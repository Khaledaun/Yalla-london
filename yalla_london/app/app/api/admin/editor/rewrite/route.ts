/**
 * Editor AI Rewrite API
 *
 * Takes existing article content and rewrites it using AI for better quality,
 * SEO optimization, and authenticity signals.
 *
 * POST: { content, keyword, locale?, pageType? }
 * Returns: { content, seoScore, metaDescription }
 */
export const maxDuration = 60;
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";

export const POST = withAdminAuth(async (request: NextRequest) => {
  const startMs = Date.now();

  try {
    const body = await request.json();
    const { content, keyword, locale = "en", pageType = "blog" } = body;

    if (!content || typeof content !== "string" || content.trim().length < 50) {
      return NextResponse.json(
        { error: "Content must be at least 50 characters" },
        { status: 400 },
      );
    }

    const { generateJSON } = await import("@/lib/ai/provider");
    const { getDefaultSiteId, SITES } = await import("@/config/sites");

    const siteId = getDefaultSiteId();
    const site = SITES[siteId];
    const siteName = site?.name || "Yalla London";
    const destination = site?.destination || "London";

    const isArabic = locale === "ar";
    const wordCount = content.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;

    const prompt = `You are a senior luxury travel editor for "${siteName}" (${destination}).

Rewrite and improve this ${isArabic ? "Arabic" : "English"} ${pageType} article about "${keyword || "luxury travel"}".

CURRENT ARTICLE (${wordCount} words):
${content.substring(0, 8000)}

REWRITE REQUIREMENTS:
1. Maintain the same topic and structure but improve quality significantly
2. Target 1,200-1,800 words (expand if currently short)
3. Add sensory details and first-hand experience signals (what you see, smell, taste)
4. Include 2-3 insider tips that demonstrate genuine local knowledge
5. Use short paragraphs (2-4 sentences each)
6. Add internal link placeholders: <a href="/blog/TOPIC" class="internal-link">anchor text</a>
7. Ensure heading hierarchy: one H1, 4-6 H2s, H3s where needed
8. NO generic phrases: "look no further", "whether you're a", "in this comprehensive guide"
9. Add a "Key Takeaways" or "Practical Tips" section near the end
10. End with a clear call-to-action

Return JSON:
{
  "content": "Full rewritten article in ${isArabic ? "HTML with dir=rtl" : "HTML"} format",
  "wordCount": 1500,
  "seoScore": 75,
  "metaDescription": "${isArabic ? "وصف ميتا 120-160 حرف" : "Meta description 120-160 chars with keyword and CTA"}",
  "improvements": ["improvement1", "improvement2", "improvement3"]
}`;

    // Budget: allow up to 45s for the AI call (leaving 15s for overhead)
    const elapsed = Date.now() - startMs;
    if (elapsed > 45_000) {
      return NextResponse.json(
        { error: "Request took too long to prepare. Please try again." },
        { status: 504 },
      );
    }

    const result = await generateJSON<Record<string, unknown>>(prompt, {
      systemPrompt: `You are a luxury travel senior editor. Rewrite articles for quality, authenticity, and SEO. Return only valid JSON with properly escaped strings.`,
      maxTokens: 2500,
      temperature: 0.6,
    });

    return NextResponse.json({
      content: result.content || content,
      seoScore: typeof result.seoScore === "number" ? result.seoScore : 0,
      metaDescription: result.metaDescription || "",
      improvements: result.improvements || [],
      wordCount: result.wordCount || wordCount,
      durationMs: Date.now() - startMs,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "AI rewrite failed";
    console.error("[editor/rewrite]", msg);

    if (msg.includes("timeout") || msg.includes("abort") || Date.now() - startMs > 55_000) {
      return NextResponse.json(
        { error: "AI generation timed out. Try with shorter content or try again." },
        { status: 504 },
      );
    }

    return NextResponse.json(
      { error: "AI rewrite failed. Please try again." },
      { status: 500 },
    );
  }
});
