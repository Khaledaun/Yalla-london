export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

/**
 * Translation API — Translates title and excerpt from English to Arabic
 *
 * POST /api/admin/translate
 * Body: { title: string, excerpt?: string }
 * Returns: { title_ar: string, excerpt_ar: string }
 */
export async function POST(request: NextRequest) {
  const { requireAdmin } = await import("@/lib/admin-middleware");
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { title, excerpt } = body;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const { generateCompletion } = await import("@/lib/ai/provider");

    const prompt = `Translate the following from English to Arabic. Return ONLY a JSON object with "title_ar" and "excerpt_ar" fields. No explanation, no markdown.

Title: ${title}
${excerpt ? `Excerpt: ${excerpt}` : ""}

Return format: {"title_ar": "...", "excerpt_ar": "..."}`;

    const result = await generateCompletion(prompt, {
      maxTokens: 500,
      temperature: 0.3,
      taskType: "arabic_translation",
      calledFrom: "admin-translate-api",
    });

    // Parse the AI response
    const text = result.text || result.content || "";
    const jsonMatch = text.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return NextResponse.json({
        title_ar: parsed.title_ar || title,
        excerpt_ar: parsed.excerpt_ar || excerpt || "",
      });
    }

    // Fallback if no JSON found
    return NextResponse.json({ title_ar: title, excerpt_ar: excerpt || "" });
  } catch (error) {
    console.warn("[translate] Translation failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Translation failed" }, { status: 500 });
  }
}
