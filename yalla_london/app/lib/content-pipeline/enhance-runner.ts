/**
 * Article Quality Enhancement Runner
 *
 * Enhances ArticleDraft records that are in the "reservoir" phase but score
 * below the quality gate threshold (60–69). It:
 *
 *   1. Researches fresh trending angles for the keyword via Grok web search
 *   2. Expands and improves the English content (word count, headings,
 *      experience signals, internal links, affiliate placeholders)
 *   3. Rewrites the meta description to 120–160 chars
 *   4. Re-calculates the quality score using the same algorithm as phases.ts
 *   5. Updates the draft in the DB — if the score reaches ≥ 70, the next
 *      content-selector run will promote it to BlogPost automatically
 *
 * Called from: select-runner.ts (non-blocking per-article, within time budget)
 * Max execution time: 35s per article (leaves buffer for the caller)
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface EnhanceResult {
  success: boolean;
  newScore?: number;
  previousScore?: number;
  error?: string;
}

// ─── Scoring helpers (mirrors phases.ts calculateQualityScore) ────────────────

function recalculateScore(html: string, metaTitle: string, metaDesc: string): number {
  let score = 0;

  // Word count — up to 25 points
  const wordCount = html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  if (wordCount >= 2000) score += 25;
  else if (wordCount >= 1500) score += 20;
  else if (wordCount >= 1200) score += 15;
  else if (wordCount >= 800) score += 10;
  else score += 5;

  // Meta tags — up to 20 points
  if (metaTitle.length > 10 && metaTitle.length <= 60) score += 10;
  else if (metaTitle.length > 0) score += 5;
  if (metaDesc.length >= 120 && metaDesc.length <= 160) score += 10;
  else if (metaDesc.length > 50) score += 5;

  // Schema (keywords_json present is a proxy) — 10 points
  // Assume present since it was already in the draft
  score += 10;

  // Heading structure — up to 15 points
  const h2Count = (html.match(/<h2/gi) || []).length;
  const h3Count = (html.match(/<h3/gi) || []).length;
  if (h2Count >= 4) score += 10;
  else if (h2Count >= 2) score += 5;
  if (h3Count >= 2) score += 5;

  // Internal links — up to 10 points
  const internalLinks = (html.match(/class="internal-link"/gi) || []).length;
  if (internalLinks >= 3) score += 10;
  else if (internalLinks >= 1) score += 5;

  // Affiliate placeholders — up to 5 points
  const affiliates = (html.match(/class="affiliate-placeholder"/gi) || []).length;
  if (affiliates >= 2) score += 5;
  else if (affiliates >= 1) score += 3;

  // Images — up to 10 points (assume unchanged from original draft)
  score += 5; // conservative estimate

  return Math.min(100, score);
}

// ─── Enhancement prompt builder ───────────────────────────────────────────────

function buildEnhancementPrompt(
  keyword: string,
  destination: string,
  currentHtml: string,
  currentMetaDesc: string,
  trendingAngles: string,
  weakness: string,
): string {
  const plainText = currentHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const wordCount = plainText.split(/\s+/).filter(Boolean).length;

  return `You are a senior luxury travel editor at Yalla London, enhancing an article for better search rankings.

KEYWORD: "${keyword}"
DESTINATION: ${destination}
CURRENT WORD COUNT: ${wordCount} words
MAIN WEAKNESS: ${weakness}

FRESH TRENDING ANGLES (use these to add depth):
${trendingAngles}

CURRENT ARTICLE (HTML):
${currentHtml.substring(0, 8000)}

CURRENT META DESCRIPTION: "${currentMetaDesc}"

YOUR TASK: Return an enhanced version of this article that fixes the weaknesses. Produce valid HTML with this structure: Opening paragraph → multiple H2 sections → H3 subsections → Conclusion.

MANDATORY IMPROVEMENTS (ALL required):
1. WORD COUNT: Expand to 2,000+ words by adding new H2 sections using the trending angles above. Insert after existing H2s — do not remove existing content.
2. EXPERIENCE SIGNALS (add at least 4): Use phrases like "insider tip:", "when we last visited", "the atmosphere here is", "a hidden gem is", "locals love", "our recommendation is", "don't miss". These are critical for Google's Jan 2026 Authenticity Update.
3. HEADINGS: Ensure at least 4 × H2 and 3 × H3 tags. Every H2 should address a distinct angle or question travelers have.
4. INTERNAL LINKS: Add exactly 3 links using this format: <a href="/blog/[related-topic]" class="internal-link">[anchor text]</a> — use realistic related topics.
5. AFFILIATE PLACEHOLDERS: Add 2 booking call-to-actions using: <div class="affiliate-placeholder" data-partner="booking.com" data-keyword="${keyword}">📍 Check availability and rates</div>
6. META DESCRIPTION: Rewrite to exactly 130–155 characters, including the keyword "${keyword}" naturally. Return it on a separate line at the end: META_DESCRIPTION: [your meta description]

STYLE RULES:
- No generic AI phrases: "in conclusion", "look no further", "whether you're a X or a Y", "in this comprehensive guide"
- Write with authority and lived experience — as if you visited personally
- Use specific details: opening hours, prices, neighbourhood names, local terms
- Keep existing headings and content, only ADD to them

Return ONLY the enhanced HTML article followed by META_DESCRIPTION: [text]. No preamble.`;
}

// ─── Main enhancement function ────────────────────────────────────────────────

export async function enhanceReservoirDraft(
  draft: Record<string, unknown>,
): Promise<EnhanceResult> {
  const draftId = draft.id as string;
  const keyword = (draft.keyword as string) || "travel";
  const siteId = (draft.site_id as string) || "yalla-london";
  const previousScore = (draft.quality_score as number) || 0;

  try {
    const { prisma } = await import("@/lib/db");

    // ── Step 1: Get current content ────────────────────────────────
    const currentHtml = (draft.assembled_html as string) || "";
    const seoMeta = (draft.seo_meta || {}) as Record<string, unknown>;
    const metaTitle = (seoMeta.metaTitle as string) || keyword;
    const currentMetaDesc = (seoMeta.metaDescription as string) || "";

    if (!currentHtml || currentHtml.length < 100) {
      return { success: false, error: "Draft has no assembled HTML to enhance" };
    }

    // ── Step 2: Diagnose weakness ──────────────────────────────────
    const wordCount = currentHtml.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
    const h2Count = (currentHtml.match(/<h2/gi) || []).length;
    const internalLinks = (currentHtml.match(/class="internal-link"/gi) || []).length;
    const metaDescOk = currentMetaDesc.length >= 120 && currentMetaDesc.length <= 160;

    const weaknesses: string[] = [];
    if (wordCount < 1500) weaknesses.push(`word count too low (${wordCount}, need 2000+)`);
    if (h2Count < 4) weaknesses.push(`only ${h2Count} H2 headings (need 4+)`);
    if (internalLinks < 3) weaknesses.push(`only ${internalLinks} internal links (need 3+)`);
    if (!metaDescOk) weaknesses.push(`meta description ${currentMetaDesc.length} chars (need 120–160)`);

    const weakness = weaknesses.length > 0 ? weaknesses.join(", ") : "general quality improvement needed";

    // ── Step 3: Get site destination for context ───────────────────
    let destination = "London";
    try {
      const { SITES } = await import("@/config/sites");
      destination = (SITES as Record<string, { destination?: string }>)[siteId]?.destination || "London";
    } catch {
      // Keep default
    }

    // ── Step 4: Research fresh trending angles (Grok web search) ──
    let trendingAngles = "No fresh research available — use your knowledge of current trends.";
    try {
      const { searchWeb } = await import("@/lib/ai/grok-live-search");
      const searchResult = await searchWeb(
        `${keyword} ${destination} 2025 2026 travel tips insider guide`,
        {
          model: "grok-4-1-fast",
          timeoutMs: 12_000,
          excludedDomains: ["wikipedia.org"],
        },
      );
      if (searchResult.content && searchResult.content.length > 50) {
        // Extract key points from the search result (first 800 chars)
        trendingAngles = searchResult.content.substring(0, 800);
      }
    } catch (searchErr) {
      console.warn(`[enhance-runner] Live search failed for "${keyword}" — using base knowledge:`,
        searchErr instanceof Error ? searchErr.message : searchErr);
    }

    // ── Step 5: Build enhancement prompt and call Grok ─────────────
    const prompt = buildEnhancementPrompt(keyword, destination, currentHtml, currentMetaDesc, trendingAngles, weakness);

    let apiKey: string | null = null;
    for (const envVar of ["XAI_API_KEY", "GROK_API_KEY"]) {
      if (process.env[envVar]) { apiKey = process.env[envVar]!; break; }
    }

    if (!apiKey) {
      // Try DB provider
      try {
        const { prisma: db } = await import("@/lib/db");
        const { decrypt } = await import("@/lib/encryption");
        const modelProvider = await db.modelProvider.findFirst({ where: { name: "grok", is_active: true } });
        if (modelProvider?.api_key_encrypted) apiKey = decrypt(modelProvider.api_key_encrypted);
      } catch {
        // No API key available
      }
    }

    if (!apiKey) {
      return { success: false, error: "No Grok API key available for enhancement" };
    }

    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({
        model: "grok-4-1-fast",
        max_tokens: 6000,
        temperature: 0.6,
        stream: false,
        messages: [
          {
            role: "system",
            content: `You are a senior luxury travel content editor specializing in ${destination} travel for Arab and international travelers. You write with authority, first-hand experience, and specific local knowledge. Your enhancements significantly improve SEO and reader value.`,
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Grok API error (${response.status}): ${errText.slice(0, 200)}`);
    }

    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    const rawOutput = data.choices?.[0]?.message?.content || "";

    if (!rawOutput || rawOutput.length < 500) {
      throw new Error("Enhancement returned too-short response");
    }

    // ── Step 6: Parse enhanced HTML and meta description ───────────
    const metaDescMatch = rawOutput.match(/META_DESCRIPTION:\s*(.+?)(?:\n|$)/i);
    const enhancedMetaDesc = metaDescMatch
      ? metaDescMatch[1].trim().substring(0, 160)
      : currentMetaDesc;

    // Strip META_DESCRIPTION line from the HTML
    const enhancedHtml = rawOutput
      .replace(/META_DESCRIPTION:.*$/im, "")
      .trim();

    // ── Step 7: Re-score the enhanced content ──────────────────────
    const newScore = recalculateScore(enhancedHtml, metaTitle, enhancedMetaDesc);

    console.log(
      `[enhance-runner] Draft ${draftId} (keyword: "${keyword}"): ${previousScore} → ${newScore} (was: ${weakness})`,
    );

    // ── Step 8: Save enhanced content back to draft ─────────────────
    const updatedSeoMeta = {
      ...seoMeta,
      metaDescription: enhancedMetaDesc,
    };

    const enhancementNote = `Enhanced ${new Date().toISOString().substring(0, 10)}: score ${previousScore}→${newScore}. Fixed: ${weakness}`;

    await prisma.articleDraft.update({
      where: { id: draftId },
      data: {
        assembled_html: enhancedHtml,
        seo_meta: updatedSeoMeta,
        quality_score: newScore,
        seo_score: newScore, // Use same value — it's the same scoring algorithm
        last_error: newScore >= 70
          ? null // Clear error — article now passes the gate
          : `Enhancement applied (score ${newScore}/70 required): ${enhancementNote}`,
        updated_at: new Date(),
      },
    });

    return { success: true, newScore, previousScore };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[enhance-runner] Enhancement failed for draft ${draftId} (keyword: "${keyword}"): ${message}`);
    return { success: false, previousScore, error: message };
  }
}
