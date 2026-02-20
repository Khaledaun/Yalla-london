export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Per-Article SEO Compliance API
 *
 * GET  ?slug=<slug>&siteId=<id>  — Run the 13-check pre-publication gate on a
 *      specific article + pull GSC performance data and indexing status.
 *
 * POST action=audit_all          — Run compliance checks on ALL published articles.
 * POST action=auto_fix           — Apply auto-fixes (meta title, meta description).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const slug = request.nextUrl.searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "slug parameter required" }, { status: 400 });
  }

  const { getDefaultSiteId, getSiteDomain } = await import("@/config/sites");
  const siteId =
    request.nextUrl.searchParams.get("siteId") ||
    request.headers.get("x-site-id") ||
    getDefaultSiteId();

  try {
    const { prisma } = await import("@/lib/db");
    const { runPrePublicationGate } = await import(
      "@/lib/seo/orchestrator/pre-publication-gate"
    );
    const { CONTENT_QUALITY, STANDARDS_VERSION, ALGORITHM_CONTEXT, EEAT_REQUIREMENTS } =
      await import("@/lib/seo/standards");

    // 1. Fetch the article
    const article = await prisma.blogPost.findFirst({
      where: { slug, siteId, deletedAt: null },
      select: {
        id: true,
        title_en: true,
        title_ar: true,
        slug: true,
        meta_title_en: true,
        meta_description_en: true,
        content_en: true,
        content_ar: true,
        featured_image: true,
        seo_score: true,
        tags: true,
        keywords_json: true,
        author_id: true,
        page_type: true,
        created_at: true,
        updated_at: true,
        published: true,
      },
    });

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    // 2. Run the 13-check pre-publication gate
    const siteUrl = getSiteDomain(siteId);
    const targetUrl = `/blog/${article.slug}`;
    const gateResult = await runPrePublicationGate(
      targetUrl,
      {
        title_en: article.title_en || undefined,
        title_ar: article.title_ar || undefined,
        meta_title_en: article.meta_title_en || undefined,
        meta_description_en: article.meta_description_en || undefined,
        content_en: article.content_en || undefined,
        content_ar: article.content_ar || undefined,
        seo_score: article.seo_score || undefined,
        author_id: article.author_id || undefined,
        keywords_json: article.keywords_json || undefined,
        tags: Array.isArray(article.tags) ? article.tags as string[] : undefined,
      },
      siteUrl,
    );

    // 3. Calculate compliance percentage
    const totalChecks = gateResult.checks.length;
    const passedChecks = gateResult.checks.filter((c) => c.passed).length;
    const compliancePercent = totalChecks > 0
      ? Math.round((passedChecks / totalChecks) * 100)
      : 0;

    // 4. Word count
    const wordCount = article.content_en
      ? article.content_en
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .split(/\s+/)
          .filter((w: string) => w.length > 0).length
      : 0;

    // 5. Pull GSC data for this article (last 28 days)
    let gscData: {
      impressions: number;
      clicks: number;
      ctr: number;
      position: number;
      topQueries: Array<{ query: string; impressions: number; clicks: number; ctr: number; position: number }>;
    } | null = null;

    let indexingStatus: {
      state: string;
      lastCrawled: string | null;
      coverageState: string | null;
      verdict: string | null;
      issues: string[];
    } | null = null;

    try {
      const { searchConsole } = await import(
        "@/lib/integrations/google-search-console"
      );

      if (searchConsole.isConfigured()) {
        const articleUrl = `${siteUrl}/blog/${article.slug}`;

        // GSC Search Analytics for this specific page
        const endDate = new Date().toISOString().slice(0, 10);
        const startDate = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10);

        const pageAnalytics = await searchConsole.getSearchAnalytics(
          startDate,
          endDate,
          ["page"],
        );

        if (pageAnalytics?.rows) {
          const pageRow = pageAnalytics.rows.find(
            (r: { keys: string[] }) =>
              r.keys[0]?.includes(article.slug),
          );
          if (pageRow) {
            gscData = {
              impressions: pageRow.impressions || 0,
              clicks: pageRow.clicks || 0,
              ctr: Math.round((pageRow.ctr || 0) * 10000) / 100,
              position: Math.round((pageRow.position || 0) * 10) / 10,
              topQueries: [],
            };
          }
        }

        // Get top queries for this page
        if (!gscData) {
          gscData = { impressions: 0, clicks: 0, ctr: 0, position: 0, topQueries: [] };
        }

        const queryAnalytics = await searchConsole.getSearchAnalytics(
          startDate,
          endDate,
          ["query", "page"],
        );
        if (queryAnalytics?.rows) {
          gscData.topQueries = queryAnalytics.rows
            .filter((r: { keys: string[] }) => r.keys[1]?.includes(article.slug))
            .slice(0, 10)
            .map((r: { keys: string[]; impressions: number; clicks: number; ctr: number; position: number }) => ({
              query: r.keys[0],
              impressions: r.impressions,
              clicks: r.clicks,
              ctr: Math.round((r.ctr || 0) * 10000) / 100,
              position: Math.round((r.position || 0) * 10) / 10,
            }));
        }

        // URL Inspection for indexing status
        const inspection = await searchConsole.getIndexingStatus(articleUrl);
        if (inspection) {
          indexingStatus = {
            state: inspection.indexingState,
            lastCrawled: inspection.lastCrawlTime || null,
            coverageState: inspection.coverageState || null,
            verdict: inspection.verdict || null,
            issues: inspection.issues || [],
          };
        }
      }
    } catch (gscErr) {
      console.warn(
        "[article-compliance] GSC data fetch failed (non-fatal):",
        gscErr instanceof Error ? gscErr.message : gscErr,
      );
    }

    // 6. Check DB indexing status as fallback
    let dbIndexingStatus: string | null = null;
    try {
      const urlRecord = await prisma.uRLIndexingStatus.findFirst({
        where: { slug: article.slug, site_id: siteId },
        select: { status: true, last_submitted_at: true, last_inspected_at: true },
      });
      if (urlRecord) {
        dbIndexingStatus = urlRecord.status;
      }
    } catch { /* table may not exist */ }

    // 7. Last audit record
    let lastAudit: { score: number; auditedAt: string } | null = null;
    try {
      const auditRecord = await prisma.seoAuditResult.findFirst({
        where: { content_id: article.id },
        orderBy: { created_at: "desc" },
        select: { score: true, created_at: true },
      });
      if (auditRecord) {
        lastAudit = {
          score: auditRecord.score,
          auditedAt: auditRecord.created_at.toISOString(),
        };
      }
    } catch { /* table may not exist */ }

    // 8. Save this audit result
    try {
      await prisma.seoAuditResult.create({
        data: {
          content_id: article.id,
          score: compliancePercent,
          breakdown_json: {
            checks: gateResult.checks,
            blockers: gateResult.blockers,
            warnings: gateResult.warnings,
            compliancePercent,
            standardsVersion: STANDARDS_VERSION,
          },
          suggestions: gateResult.warnings,
        },
      });
    } catch (saveErr) {
      console.warn("[article-compliance] Failed to save audit result:", saveErr instanceof Error ? saveErr.message : saveErr);
    }

    return NextResponse.json({
      article: {
        id: article.id,
        title: article.title_en || article.title_ar || "(Untitled)",
        slug: article.slug,
        url: `${siteUrl}/blog/${article.slug}`,
        seoScore: article.seo_score,
        wordCount,
        published: article.published,
        createdAt: article.created_at?.toISOString(),
        updatedAt: article.updated_at?.toISOString(),
        hasFeaturedImage: !!article.featured_image,
        hasArabicContent: !!article.content_ar,
      },
      compliance: {
        percent: compliancePercent,
        totalChecks,
        passedChecks,
        blockerCount: gateResult.blockers.length,
        warningCount: gateResult.warnings.length,
        allowed: gateResult.allowed,
        checks: gateResult.checks,
        blockers: gateResult.blockers,
        warnings: gateResult.warnings,
      },
      standards: {
        version: STANDARDS_VERSION,
        qualityGateScore: CONTENT_QUALITY.qualityGateScore,
        minWords: CONTENT_QUALITY.minWords,
        targetWords: CONTENT_QUALITY.targetWords,
        authenticityUpdateActive: ALGORITHM_CONTEXT.authenticityUpdateActive,
        experienceIsDominant: EEAT_REQUIREMENTS.experienceIsDominant,
      },
      gsc: gscData,
      indexing: indexingStatus || { state: dbIndexingStatus || "unknown", lastCrawled: null, coverageState: null, verdict: null, issues: [] },
      lastAudit,
    });
  } catch (error) {
    console.error("[article-compliance] Error:", error);
    return NextResponse.json(
      { error: "Failed to run compliance check" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const body = await request.json();
  const { action } = body;
  const { getDefaultSiteId, getSiteDomain } = await import("@/config/sites");
  const siteId =
    request.headers.get("x-site-id") || getDefaultSiteId();

  if (action === "audit_all") {
    // Batched auditing: accepts offset & limit for pagination.
    // Frontend calls in batches (e.g., 10 articles per request) to avoid
    // Vercel 60s timeout on large article sets.
    const offset = typeof body.offset === "number" ? Math.max(0, body.offset) : 0;
    const limit = typeof body.limit === "number" ? Math.min(Math.max(1, body.limit), 50) : 50;

    try {
      const { prisma } = await import("@/lib/db");
      const { runPrePublicationGate } = await import(
        "@/lib/seo/orchestrator/pre-publication-gate"
      );
      const { STANDARDS_VERSION } = await import("@/lib/seo/standards");

      // Count total articles for pagination metadata
      const totalArticles = await prisma.blogPost.count({
        where: { published: true, siteId, deletedAt: null },
      });

      const articles = await prisma.blogPost.findMany({
        where: { published: true, siteId, deletedAt: null },
        select: {
          id: true,
          title_en: true,
          title_ar: true,
          slug: true,
          meta_title_en: true,
          meta_description_en: true,
          content_en: true,
          content_ar: true,
          seo_score: true,
          author_id: true,
          keywords_json: true,
          tags: true,
        },
        orderBy: { created_at: "asc" },
        skip: offset,
        take: limit,
      });

      const siteUrl = getSiteDomain(siteId);
      const results: Array<{
        slug: string;
        title: string;
        compliancePercent: number;
        passed: number;
        total: number;
        blockers: number;
        warnings: number;
      }> = [];

      const budgetStart = Date.now();
      for (const article of articles) {
        if (Date.now() - budgetStart > 50_000) break; // 50s budget

        // Skip HTTP route-existence checks during bulk audits to save ~5s per article
        const gate = await runPrePublicationGate(
          `/blog/${article.slug}`,
          {
            title_en: article.title_en || undefined,
            title_ar: article.title_ar || undefined,
            meta_title_en: article.meta_title_en || undefined,
            meta_description_en: article.meta_description_en || undefined,
            content_en: article.content_en || undefined,
            content_ar: article.content_ar || undefined,
            seo_score: article.seo_score || undefined,
            author_id: article.author_id || undefined,
            keywords_json: article.keywords_json || undefined,
            tags: Array.isArray(article.tags) ? article.tags as string[] : undefined,
          },
          siteUrl,
          { skipRouteCheck: true },
        );

        const total = gate.checks.length;
        const passed = gate.checks.filter((c) => c.passed).length;
        const pct = total > 0 ? Math.round((passed / total) * 100) : 0;

        results.push({
          slug: article.slug,
          title: article.title_en || article.title_ar || "(Untitled)",
          compliancePercent: pct,
          passed,
          total,
          blockers: gate.blockers.length,
          warnings: gate.warnings.length,
        });

        // Save audit
        try {
          await prisma.seoAuditResult.create({
            data: {
              content_id: article.id,
              score: pct,
              breakdown_json: {
                checks: gate.checks,
                standardsVersion: STANDARDS_VERSION,
              },
              suggestions: gate.warnings,
            },
          });
        } catch (auditSaveErr) {
          console.warn("[article-compliance] Failed to save audit:", auditSaveErr instanceof Error ? auditSaveErr.message : auditSaveErr);
        }
      }

      const avgCompliance = results.length > 0
        ? Math.round(results.reduce((s, r) => s + r.compliancePercent, 0) / results.length)
        : 0;

      const fullCompliance = results.filter((r) => r.compliancePercent === 100).length;
      const hasMore = offset + articles.length < totalArticles;

      return NextResponse.json({
        success: true,
        // Pagination metadata
        totalArticles,
        offset,
        limit,
        hasMore,
        nextOffset: hasMore ? offset + articles.length : null,
        // Batch results
        articlesAudited: results.length,
        averageCompliance: avgCompliance,
        fullComplianceCount: fullCompliance,
        standardsVersion: STANDARDS_VERSION,
        results: results.sort((a, b) => a.compliancePercent - b.compliancePercent),
      });
    } catch (error) {
      console.error("[article-compliance] audit_all error:", error);
      return NextResponse.json({ error: "Bulk audit failed" }, { status: 500 });
    }
  }

  if (action === "auto_fix") {
    const { articleId } = body;
    if (!articleId) {
      return NextResponse.json({ error: "articleId required" }, { status: 400 });
    }

    try {
      const { prisma } = await import("@/lib/db");
      const { CONTENT_QUALITY } = await import("@/lib/seo/standards");

      const article = await prisma.blogPost.findUnique({
        where: { id: articleId },
        select: {
          title_en: true,
          slug: true,
          content_en: true,
          meta_title_en: true,
          meta_description_en: true,
          author_id: true,
          seo_score: true,
          siteId: true,
        },
      });

      if (!article) {
        return NextResponse.json({ error: "Article not found" }, { status: 404 });
      }

      const fixes: string[] = [];
      const updateData: Record<string, unknown> = {};
      const siteName = (() => {
        try {
          const { getSiteConfig } = require("@/config/sites");
          const cfg = getSiteConfig(article.siteId || siteId);
          return cfg?.siteName || "Yalla London";
        } catch { return "Yalla London"; }
      })();

      // ── Fix 1: Missing or short meta title ──
      if (!article.meta_title_en && article.title_en) {
        let metaTitle = article.title_en;
        // Ensure within 30-60 char range
        if (metaTitle.length < CONTENT_QUALITY.metaTitleMin && siteName) {
          metaTitle = `${metaTitle} | ${siteName}`;
        }
        if (metaTitle.length > CONTENT_QUALITY.metaTitleOptimal.max) {
          metaTitle = metaTitle.slice(0, CONTENT_QUALITY.metaTitleOptimal.max - 3) + "...";
        }
        updateData.meta_title_en = metaTitle;
        fixes.push(`Generated meta title (${metaTitle.length} chars): "${metaTitle}"`);
      } else if (article.meta_title_en) {
        // Fix: title too long
        if (article.meta_title_en.length > CONTENT_QUALITY.metaTitleOptimal.max) {
          const trimmed = article.meta_title_en.slice(0, CONTENT_QUALITY.metaTitleOptimal.max - 3) + "...";
          updateData.meta_title_en = trimmed;
          fixes.push(`Trimmed meta title from ${article.meta_title_en.length} to ${trimmed.length} chars`);
        }
        // Fix: title too short
        if (article.meta_title_en.length < CONTENT_QUALITY.metaTitleMin && !article.meta_title_en.includes("|")) {
          const padded = `${article.meta_title_en} | ${siteName}`;
          if (padded.length <= CONTENT_QUALITY.metaTitleOptimal.max) {
            updateData.meta_title_en = padded;
            fixes.push(`Padded meta title with site name (${padded.length} chars)`);
          }
        }
      }

      // ── Fix 2: Missing or short meta description ──
      if (!article.meta_description_en && article.content_en) {
        const text = article.content_en.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        // Try to grab first full sentence(s) within 120-160 chars
        let metaDesc = "";
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
        for (const sentence of sentences) {
          if ((metaDesc + sentence.trim()).length <= 160) {
            metaDesc += (metaDesc ? " " : "") + sentence.trim();
          } else break;
        }
        if (metaDesc.length < 120) {
          metaDesc = text.length > 157 ? text.slice(0, 157) + "..." : text.slice(0, 160);
        }
        updateData.meta_description_en = metaDesc;
        fixes.push(`Generated meta description (${metaDesc.length} chars)`);
      } else if (article.meta_description_en) {
        // Fix: description too long
        if (article.meta_description_en.length > CONTENT_QUALITY.metaDescriptionOptimal.max) {
          const trimmed = article.meta_description_en.slice(0, CONTENT_QUALITY.metaDescriptionOptimal.max - 3) + "...";
          updateData.meta_description_en = trimmed;
          fixes.push(`Trimmed meta description from ${article.meta_description_en.length} to ${trimmed.length} chars`);
        }
      }

      // ── Fix 3: Missing author (E-E-A-T requirement) ──
      if (!article.author_id) {
        try {
          const defaultAuthor = await prisma.user.findFirst({
            where: { role: "admin" },
            select: { id: true },
            orderBy: { createdAt: "asc" },
          });
          if (defaultAuthor) {
            updateData.author_id = defaultAuthor.id;
            fixes.push("Assigned default admin author (E-E-A-T compliance)");
          }
        } catch { /* author table may differ */ }
      }

      // ── Fix 4: Inject internal links if content has fewer than 3 ──
      if (article.content_en) {
        const siteUrl = getSiteDomain(article.siteId || siteId);
        const internalLinkRegex = new RegExp(
          `href=["']((?:${siteUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})?/(?:blog|hotels|experiences|recommendations|information|news|london-by-foot)[^"']*)["']`,
          "gi"
        );
        const internalLinkCount = (article.content_en.match(internalLinkRegex) || []).length;

        if (internalLinkCount < CONTENT_QUALITY.minInternalLinks) {
          // Fetch 3 recent published articles from same site to link to
          const relatedArticles = await prisma.blogPost.findMany({
            where: {
              published: true,
              siteId: article.siteId || siteId,
              deletedAt: null,
              slug: { not: article.slug },
            },
            select: { title_en: true, slug: true },
            orderBy: { created_at: "desc" },
            take: 3,
          });

          if (relatedArticles.length > 0) {
            const linksHtml = relatedArticles.map(
              (a) => `<li><a href="/blog/${a.slug}">${a.title_en || a.slug}</a></li>`
            ).join("\n");
            const relatedSection = `\n<h2>Related Articles</h2>\n<ul>\n${linksHtml}\n</ul>`;
            updateData.content_en = article.content_en + relatedSection;
            fixes.push(`Injected ${relatedArticles.length} internal links (Related Articles section)`);
          }
        }
      }

      // ── Fix 5: Inject affiliate links if none present ──
      const contentToCheck = (updateData.content_en as string) || article.content_en || "";
      if (contentToCheck) {
        const affiliatePatterns = [
          /booking\.com/gi, /halalbooking\.com/gi, /agoda\.com/gi,
          /getyourguide\.com/gi, /viator\.com/gi, /klook\.com/gi,
          /boatbookings\.com/gi, /tripadvisor\.com/gi,
        ];
        const hasAffiliate = affiliatePatterns.some((p) => p.test(contentToCheck));
        if (!hasAffiliate) {
          // Add a tasteful booking CTA at the end of content
          const bookingCta = `\n<div class="booking-cta">\n<h3>Book Your Experience</h3>\n<p>Ready to explore? Find the best deals on accommodation and experiences:</p>\n<ul>\n<li><a href="https://www.booking.com" target="_blank" rel="noopener sponsored">Search hotels on Booking.com</a></li>\n<li><a href="https://www.halalbooking.com" target="_blank" rel="noopener sponsored">Find halal-friendly stays on HalalBooking</a></li>\n<li><a href="https://www.getyourguide.com" target="_blank" rel="noopener sponsored">Browse tours on GetYourGuide</a></li>\n</ul>\n</div>`;
          updateData.content_en = contentToCheck + bookingCta;
          fixes.push("Injected affiliate booking CTA section (3 links)");
        }
      }

      // ── Fix 6: Initialize SEO score if missing ──
      if (article.seo_score === null || article.seo_score === undefined) {
        // Set a baseline score based on content completeness
        let baseScore = 50;
        if (article.meta_title_en || updateData.meta_title_en) baseScore += 10;
        if (article.meta_description_en || updateData.meta_description_en) baseScore += 10;
        if (article.content_en && article.content_en.length > 5000) baseScore += 10;
        updateData.seo_score = Math.min(baseScore, 80); // Cap at 80 — full score requires manual review
        fixes.push(`Initialized SEO score to ${updateData.seo_score}`);
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.blogPost.update({
          where: { id: articleId },
          data: updateData,
        });
      }

      return NextResponse.json({
        success: true,
        fixesApplied: fixes.length,
        fixes,
      });
    } catch (error) {
      console.error("[article-compliance] auto_fix error:", error);
      return NextResponse.json({ error: "Auto-fix failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
