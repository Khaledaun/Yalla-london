export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Bulk Article Generator API
 *
 * POST — Generates multiple articles in a pipeline:
 *         generate → audit → fix → queue → publish → submit
 *
 * Actions:
 *   - start       — Kicks off a bulk generation run (returns runId)
 *   - status      — Returns current progress for a runId
 *   - publish_all — Publishes all generated articles from a run
 */

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";

interface BulkArticle {
  index: number;
  keyword: string;
  topicId: string | null;
  status: "pending" | "generating" | "generated" | "auditing" | "fixing" | "ready" | "publishing" | "published" | "failed";
  error?: string;
  content?: Record<string, unknown>;
  wordCount?: number;
  seoScore?: number;
  slug?: string;
  blogPostId?: string;
}

// In-memory run state (survives within a single serverless invocation)
// For cross-request persistence, we write to CronJobLog
const activeRuns = new Map<string, {
  siteId: string;
  language: string;
  total: number;
  articles: BulkArticle[];
  startedAt: number;
  completedAt?: number;
}>();

async function handlePost(request: NextRequest) {
  const body = await request.json();
  const action = body.action || "start";
  const { getDefaultSiteId, getSiteConfig, getSiteDomain } = await import("@/config/sites");

  const siteId = body.siteId || getDefaultSiteId();
  const site = getSiteConfig(siteId);
  if (!site) {
    return NextResponse.json({ success: false, error: `Unknown site: ${siteId}` }, { status: 400 });
  }

  // ─── STATUS ──────────────────────────────────────────────────────────────
  if (action === "status") {
    const runId = body.runId;
    if (!runId) {
      return NextResponse.json({ success: false, error: "runId required" }, { status: 400 });
    }

    // Check in-memory first
    const run = activeRuns.get(runId);
    if (run) {
      return NextResponse.json({
        success: true,
        runId,
        siteId: run.siteId,
        total: run.total,
        completed: run.articles.filter(a => ["published", "ready", "failed"].includes(a.status)).length,
        articles: run.articles,
        done: run.completedAt != null,
      });
    }

    // Check DB log — search by job_name and match runId in result_summary JSON
    const { prisma } = await import("@/lib/db");
    const recentLogs = await prisma.cronJobLog.findMany({
      where: { job_name: "bulk-generate" },
      orderBy: { completed_at: "desc" },
      take: 20,
    });

    const log = recentLogs.find(l => {
      const summary = l.result_summary as Record<string, unknown> | null;
      return summary?.runId === runId;
    });

    if (log) {
      const summary = log.result_summary as Record<string, unknown> | null;
      const logArticles = (summary?.articles as BulkArticle[]) || [];
      return NextResponse.json({
        success: true,
        runId,
        siteId: (summary?.siteId as string) || siteId,
        total: (summary?.total as number) || 0,
        completed: (summary?.completed as number) || 0,
        articles: logArticles,
        done: true,
      });
    }

    return NextResponse.json({ success: false, error: "Run not found" }, { status: 404 });
  }

  // ─── START ───────────────────────────────────────────────────────────────
  if (action === "start") {
    const language: "en" | "ar" = body.language || "en";
    const count = Math.min(Math.max(body.count || 1, 1), 10); // 1-10 articles
    const topicSource: "auto" | "manual" = body.topicSource || "auto";
    const manualKeywords: string[] = body.keywords || [];
    const pageType = body.pageType || "guide";
    const autoPublish = body.autoPublish !== false;

    const runId = `bulk-${siteId}-${Date.now()}`;
    const BUDGET_MS = 53_000;
    const startTime = Date.now();

    // Build topic list
    const articles: BulkArticle[] = [];

    if (topicSource === "manual" && manualKeywords.length > 0) {
      // Manual keywords
      for (let i = 0; i < Math.min(manualKeywords.length, count); i++) {
        articles.push({
          index: i,
          keyword: manualKeywords[i].trim(),
          topicId: null,
          status: "pending",
        });
      }
    } else {
      // Auto-pick topics from DB
      const { prisma } = await import("@/lib/db");
      const candidates = await prisma.topicProposal.findMany({
        where: {
          status: { in: ["ready", "queued", "planned", "proposed"] },
          locale: language,
          site_id: siteId,
        },
        orderBy: [{ confidence_score: "desc" }, { created_at: "asc" }],
        take: count,
      });

      if (candidates.length === 0) {
        return NextResponse.json({
          success: false,
          error: "No topics available. Generate topics first (Sites tab → Gen Topics), or use manual keywords.",
        }, { status: 404 });
      }

      // Claim topics atomically
      for (let i = 0; i < candidates.length; i++) {
        const c = candidates[i];
        const claimed = await prisma.topicProposal.updateMany({
          where: { id: c.id, status: { in: ["ready", "queued", "planned", "proposed"] } },
          data: { status: "generating", updated_at: new Date() },
        });

        if (claimed.count > 0) {
          articles.push({
            index: i,
            keyword: c.primary_keyword,
            topicId: c.id,
            status: "pending",
          });
        }
      }

      if (articles.length === 0) {
        return NextResponse.json({
          success: false,
          error: "All available topics are already being processed.",
        }, { status: 409 });
      }
    }

    // Store run
    activeRuns.set(runId, {
      siteId,
      language,
      total: articles.length,
      articles,
      startedAt: startTime,
    });

    // Process articles sequentially with budget guard
    const { generateJSON } = await import("@/lib/ai/provider");

    const baseSystemPrompt = language === "en" ? site.systemPromptEN : site.systemPromptAR;
    const systemPrompt = `${baseSystemPrompt}

CONTENT QUALITY REQUIREMENTS:
- First-hand experience is the #1 ranking signal (Google Jan 2026 Authenticity Update)
- Include sensory details: what you see, hear, smell, taste at specific locations
- Add 2-3 "insider tips" per article — real advice a tourist guide would share
- Include at least one honest limitation or "what most guides won't tell you" moment
- NEVER use these AI-generic phrases: "nestled in the heart of", "whether you're a", "look no further", "in conclusion", "it's worth noting"
- Vary sentence length: mix short punchy sentences with longer descriptive ones`;

    let generated = 0;
    let published = 0;
    let failed = 0;

    for (const article of articles) {
      // Budget check
      if (Date.now() - startTime > BUDGET_MS) {
        article.status = "failed";
        article.error = "Budget exceeded — try generating fewer articles";
        failed++;
        continue;
      }

      // ── GENERATE ──
      article.status = "generating";

      try {
        const prompt = buildPrompt(article.keyword, pageType, language, site, []);

        const result = await generateJSON<Record<string, unknown>>(prompt, {
          systemPrompt,
          maxTokens: 6000,
          temperature: 0.7,
        });

        const body_html = (result.body as string) || (result.bodyTranslation as string) || "";
        article.wordCount = countWords(body_html);
        article.seoScore = (result.seoScore as number) || 80;
        article.content = result;
        article.status = "generated";
        generated++;

      } catch (err) {
        article.status = "failed";
        article.error = err instanceof Error ? err.message : "Generation failed";
        failed++;

        // Revert topic
        if (article.topicId) {
          const { prisma } = await import("@/lib/db");
          await prisma.topicProposal.updateMany({
            where: { id: article.topicId, status: "generating" },
            data: { status: "ready" },
          }).catch(() => {});
        }
        continue;
      }

      // ── AUDIT & FIX (inline checks) ──
      article.status = "auditing";
      const content = article.content!;
      const bodyHtml = (content.body as string) || "";

      // Check word count
      if (article.wordCount && article.wordCount < 300) {
        article.status = "failed";
        article.error = `Only ${article.wordCount} words — minimum is 300`;
        failed++;
        generated--;
        continue;
      }

      // Auto-fix: trim meta description if too long
      article.status = "fixing";
      const metaDesc = (content.metaDescription as string) || "";
      if (metaDesc.length > 160) {
        content.metaDescription = metaDesc.substring(0, 155).replace(/\s+\S*$/, "") + "…";
      }
      const metaTitle = (content.metaTitle as string) || "";
      if (metaTitle.length > 60) {
        content.metaTitle = metaTitle.substring(0, 57).replace(/\s+\S*$/, "") + "…";
      }

      article.status = "ready";

      // ── PUBLISH ──
      if (autoPublish && Date.now() - startTime < BUDGET_MS) {
        article.status = "publishing";

        try {
          const { prisma } = await import("@/lib/db");

          const titleEn = (content.title as string) || article.keyword;
          const slug = titleEn
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")
            .substring(0, 80);

          // Check duplicate slug
          const existing = await prisma.blogPost.findFirst({
            where: { slug, siteId, deletedAt: null },
          });
          if (existing) {
            article.slug = slug;
            article.status = "ready";
            article.error = `Slug "${slug}" already exists — saved as ready, not published`;
            continue;
          }

          // Get category + author
          let categoryId: string | undefined;
          const cat = await prisma.category.findFirst({ where: { slug: "general" } });
          categoryId = cat?.id;
          if (!categoryId) {
            const newCat = await prisma.category.create({
              data: { name_en: "General", name_ar: "عام", slug: "general" },
            });
            categoryId = newCat.id;
          }

          const adminUser = await prisma.user.findFirst({ where: { role: "admin" }, select: { id: true } });
          const authorId = adminUser?.id || (await prisma.user.upsert({
            where: { email: "system@zenitha.luxury" },
            update: {},
            create: { email: "system@zenitha.luxury", name: "Editorial Team", role: "admin" },
          })).id;

          const blogPost = await prisma.blogPost.create({
            data: {
              title_en: titleEn,
              title_ar: (content.titleTranslation as string) || null,
              excerpt_en: (content.excerpt as string) || null,
              excerpt_ar: (content.excerptTranslation as string) || null,
              content_en: bodyHtml,
              content_ar: (content.bodyTranslation as string) || null,
              meta_title_en: (content.metaTitle as string) || titleEn.substring(0, 60),
              meta_description_en: (content.metaDescription as string) || "",
              meta_title_ar: (content.metaTitleTranslation as string) || null,
              meta_description_ar: (content.metaDescriptionTranslation as string) || null,
              slug,
              tags: [...((content.tags as string[]) || []), "ai-generated", "bulk-generated", `site-${siteId}`],
              published: true,
              siteId,
              category_id: categoryId,
              author_id: authorId,
              page_type: (content.pageType as string) || pageType,
              seo_score: (content.seoScore as number) || 80,
              keywords_json: (content.keywords as string[]) || [],
              questions_json: (content.questions as string[]) || [],
            },
          });

          article.blogPostId = blogPost.id;
          article.slug = slug;
          article.status = "published";
          published++;

          // Mark topic as published
          if (article.topicId) {
            await prisma.topicProposal.updateMany({
              where: { id: article.topicId },
              data: { status: "published" },
            }).catch(() => {});
          }

          // Submit to IndexNow
          try {
            const domain = getSiteDomain(siteId);
            const articleUrl = `https://${domain}/blog/${slug}`;
            const { submitToIndexNow } = await import("@/lib/seo/indexing-service");
            submitToIndexNow([articleUrl]).catch((e: Error) =>
              console.warn("[bulk-generate] IndexNow failed:", e.message)
            );
          } catch {
            console.warn("[bulk-generate] IndexNow setup failed");
          }

        } catch (err) {
          article.status = "failed";
          article.error = `Publish failed: ${err instanceof Error ? err.message : "Unknown"}`;
          failed++;
          published--;
        }
      }
    }

    // Mark run as complete
    const run = activeRuns.get(runId)!;
    run.completedAt = Date.now();

    // Log to CronJobLog for persistence
    try {
      const { prisma } = await import("@/lib/db");
      const endTime = new Date();
      await prisma.cronJobLog.create({
        data: {
          job_name: "bulk-generate",
          job_type: "manual",
          status: failed === articles.length ? "failed" : "completed",
          site_id: siteId,
          started_at: new Date(startTime),
          completed_at: endTime,
          duration_ms: Date.now() - startTime,
          items_processed: articles.length,
          items_succeeded: generated,
          items_failed: failed,
          result_summary: {
            runId,
            siteId,
            language,
            total: articles.length,
            generated,
            published,
            failed,
            completed: generated + failed,
            articles: articles.map(a => ({
              keyword: a.keyword,
              status: a.status,
              wordCount: a.wordCount,
              seoScore: a.seoScore,
              slug: a.slug,
              blogPostId: a.blogPostId,
              error: a.error,
            })),
          },
        },
      });
    } catch (e) {
      console.warn("[bulk-generate] CronJobLog write failed:", e);
    }

    return NextResponse.json({
      success: true,
      runId,
      total: articles.length,
      generated,
      published,
      failed,
      articles: articles.map(a => ({
        index: a.index,
        keyword: a.keyword,
        status: a.status,
        wordCount: a.wordCount,
        seoScore: a.seoScore,
        slug: a.slug,
        blogPostId: a.blogPostId,
        error: a.error,
      })),
      elapsed: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
    });
  }

  // ─── PUBLISH_ALL ─────────────────────────────────────────────────────────
  if (action === "publish_all") {
    const runId = body.runId;
    const run = activeRuns.get(runId);
    if (!run) {
      return NextResponse.json({ success: false, error: "Run not found or expired" }, { status: 404 });
    }

    const readyArticles = run.articles.filter(a => a.status === "ready" && a.content);
    if (readyArticles.length === 0) {
      return NextResponse.json({ success: false, error: "No ready articles to publish" }, { status: 400 });
    }

    let pubCount = 0;
    for (const article of readyArticles) {
      try {
        const publishRes = await fetch(new URL("/api/admin/ai-generate", request.url), {
          method: "POST",
          headers: { "Content-Type": "application/json", cookie: request.headers.get("cookie") || "" },
          body: JSON.stringify({
            action: "publish",
            siteId: run.siteId,
            topicId: article.topicId,
            titleEn: (article.content!.title as string) || article.keyword,
            titleAr: (article.content!.titleTranslation as string) || null,
            bodyEn: (article.content!.body as string) || "",
            bodyAr: (article.content!.bodyTranslation as string) || null,
            excerptEn: (article.content!.excerpt as string) || null,
            excerptAr: (article.content!.excerptTranslation as string) || null,
            metaTitleEn: (article.content!.metaTitle as string) || null,
            metaTitleAr: (article.content!.metaTitleTranslation as string) || null,
            metaDescriptionEn: (article.content!.metaDescription as string) || null,
            metaDescriptionAr: (article.content!.metaDescriptionTranslation as string) || null,
            tags: (article.content!.tags as string[]) || [],
            keywords: (article.content!.keywords as string[]) || [],
            questions: (article.content!.questions as string[]) || [],
            pageType: (article.content!.pageType as string) || "guide",
            seoScore: (article.content!.seoScore as number) || 80,
          }),
        });
        const pubJson = await publishRes.json();
        if (pubJson.success) {
          article.status = "published";
          article.slug = pubJson.slug;
          article.blogPostId = pubJson.id;
          pubCount++;
        } else {
          article.error = pubJson.error;
        }
      } catch (e) {
        article.error = e instanceof Error ? e.message : "Publish failed";
      }
    }

    return NextResponse.json({
      success: true,
      published: pubCount,
      total: readyArticles.length,
    });
  }

  return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildPrompt(
  keyword: string,
  pageType: string,
  language: "en" | "ar",
  site: { name: string; destination: string },
  longtails: string[],
): string {
  if (language === "en") {
    return `Write a comprehensive, SEO-optimized blog article about "${keyword}" for ${site.name}, targeting Arab travelers visiting ${site.destination}.

Content Requirements (mandatory):
- 1,500–2,000 words minimum
- Include practical tips, insider advice, luxury recommendations
- Focus keyword "${keyword}" in title, first paragraph, one H2
- Secondary keywords: ${longtails.join(", ") || "none"}

Structure:
- 4–6 H2 headings, H3 subheadings where appropriate
- 3+ internal links to /blog/*, /hotels, /experiences, /restaurants
- 2+ affiliate/booking links (HalalBooking, Booking.com, GetYourGuide, Viator)
- "Key Takeaways" section + clear CTA at the end

Return JSON:
{
  "title": "Title with keyword (50-60 chars)",
  "titleTranslation": "Arabic title",
  "body": "Full HTML (h2,h3,p,ul/ol,a). MINIMUM 1,500 words.",
  "bodyTranslation": "Full Arabic HTML translation (1,000+ words)",
  "excerpt": "Excerpt (120-160 chars)",
  "excerptTranslation": "Arabic excerpt",
  "metaTitle": "SEO title (50-60 chars)",
  "metaTitleTranslation": "Arabic meta title",
  "metaDescription": "SEO description (120-160 chars)",
  "metaDescriptionTranslation": "Arabic meta description",
  "tags": ["tag1","tag2","tag3","tag4","tag5"],
  "keywords": ["primary","secondary1","secondary2"],
  "questions": ["Q1?","Q2?","Q3?"],
  "pageType": "${pageType}",
  "seoScore": 90
}`;
  }

  return `اكتب مقالة شاملة عن "${keyword}" لمنصة ${site.name}، تستهدف المسافرين العرب.

المتطلبات: 1,500+ كلمة، نصائح عملية، روابط داخلية 3+، روابط حجز 2+.

أرجع JSON:
{
  "title": "عنوان (50-60 حرف)",
  "titleTranslation": "English title",
  "body": "HTML كامل (1,500+ كلمة)",
  "bodyTranslation": "Full English translation (1,000+ words)",
  "excerpt": "مقتطف (120-160 حرف)",
  "excerptTranslation": "English excerpt",
  "metaTitle": "عنوان SEO (50-60 حرف)",
  "metaTitleTranslation": "English meta title",
  "metaDescription": "وصف SEO (120-160 حرف)",
  "metaDescriptionTranslation": "English meta description",
  "tags": ["وسم1","وسم2","وسم3"],
  "keywords": ["رئيسية","ثانوية"],
  "questions": ["سؤال1؟","سؤال2؟"],
  "pageType": "${pageType}",
  "seoScore": 90
}`;
}

function countWords(html: string): number {
  return html.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;
}

export const POST = withAdminAuth(handlePost);
