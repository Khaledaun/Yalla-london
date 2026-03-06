export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { logManualAction } from "@/lib/action-logger";

/**
 * SEO Audit API — Comprehensive technical SEO audit from real data
 *
 * Runs a full audit using data already in the database (GSC, URLIndexingStatus,
 * BlogPost, ArticleDraft) plus live checks against published pages.
 *
 * Returns plain-language findings with severity, impact, and specific fix instructions.
 * Designed to be called from the cockpit and readable on an iPhone.
 *
 * GET /api/admin/seo-audit?siteId=yalla-london
 * POST /api/admin/seo-audit — triggers a live page crawl audit (slower, more thorough)
 */

interface AuditFinding {
  id: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  category: string;
  title: string;
  description: string;
  impact: string;
  fix: string;
  affected: string[];
  count: number;
}

interface AuditSection {
  name: string;
  icon: string;
  score: number;
  maxScore: number;
  findings: AuditFinding[];
}

async function runAudit(siteId: string) {
  const auditStart = Date.now();
  const BUDGET_MS = 53_000;

  const { prisma } = await import("@/lib/db");
  const { getSiteDomain, getSiteConfig } = await import("@/config/sites");
  const { CONTENT_QUALITY, CORE_WEB_VITALS, EEAT_REQUIREMENTS, INDEXING_CONFIG, TECHNICAL_SEO } =
    await import("@/lib/seo/standards");

  const siteConfig = getSiteConfig(siteId);
  const siteDomain = getSiteDomain(siteId);
  const findings: AuditFinding[] = [];

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1: INDEXING HEALTH
  // ═══════════════════════════════════════════════════════════════════════════

  const [
    totalTracked,
    indexedCount,
    submittedCount,
    discoveredCount,
    errorCount,
    chronicFailures,
    neverSubmitted,
  ] = await Promise.all([
    prisma.uRLIndexingStatus.count({ where: { site_id: siteId } }),
    prisma.uRLIndexingStatus.count({ where: { site_id: siteId, status: "indexed" } }),
    prisma.uRLIndexingStatus.count({ where: { site_id: siteId, status: "submitted" } }),
    prisma.uRLIndexingStatus.count({ where: { site_id: siteId, status: "discovered" } }),
    prisma.uRLIndexingStatus.count({ where: { site_id: siteId, status: "error" } }),
    prisma.uRLIndexingStatus.count({ where: { site_id: siteId, status: "chronic_failure" } }),
    prisma.uRLIndexingStatus.count({
      where: { site_id: siteId, submitted_indexnow: false, submitted_sitemap: false, submitted_google_api: false },
    }),
  ]);

  const indexRate = totalTracked > 0 ? Math.round((indexedCount / totalTracked) * 100) : 0;

  if (indexRate < 30) {
    findings.push({
      id: "idx-rate-critical",
      severity: "critical",
      category: "Indexing",
      title: `Only ${indexRate}% of your pages are indexed by Google`,
      description: `${indexedCount} out of ${totalTracked} tracked pages are indexed. Google can't rank what it hasn't indexed.`,
      impact: "Pages not indexed = zero organic traffic from those pages",
      fix: "Check the Indexing tab in Content Hub. Submit missing pages via IndexNow. Ensure sitemap.xml includes all published URLs.",
      affected: [],
      count: totalTracked - indexedCount,
    });
  } else if (indexRate < 60) {
    findings.push({
      id: "idx-rate-high",
      severity: "high",
      category: "Indexing",
      title: `${indexRate}% indexing rate — ${totalTracked - indexedCount} pages not indexed`,
      description: `${discoveredCount} pages discovered but not indexed, ${submittedCount} submitted awaiting crawl.`,
      impact: "Every unindexed page is lost potential traffic and revenue",
      fix: "Run the google-indexing cron from Crons tab to resubmit. Check if thin content is causing Google to skip pages.",
      affected: [],
      count: totalTracked - indexedCount,
    });
  }

  if (neverSubmitted > 5) {
    findings.push({
      id: "idx-never-submitted",
      severity: "high",
      category: "Indexing",
      title: `${neverSubmitted} pages never submitted to any search engine`,
      description: "These pages exist but were never submitted via IndexNow, sitemap, or Google Indexing API.",
      impact: "Google may never discover these pages without a submission signal",
      fix: "The process-indexing-queue cron will now pick these up automatically. You can also trigger it manually from the Crons tab.",
      affected: [],
      count: neverSubmitted,
    });
  }

  if (chronicFailures > 0) {
    const cfPages = await prisma.uRLIndexingStatus.findMany({
      where: { site_id: siteId, status: "chronic_failure" },
      select: { url: true, last_error: true, submission_attempts: true },
      take: 10,
    });
    findings.push({
      id: "idx-chronic-failures",
      severity: "critical",
      category: "Indexing",
      title: `${chronicFailures} pages failed to index after 5+ attempts`,
      description: "Google has repeatedly refused to index these pages. This usually means quality issues, thin content, or duplicate content.",
      impact: "These pages will never rank until the underlying issue is fixed",
      fix: "Review each page for: thin content (<300 words), duplicate titles, missing meta descriptions, or content that adds no unique value. Consider consolidating or improving these pages.",
      affected: cfPages.map((p) => p.url),
      count: chronicFailures,
    });
  }

  if (errorCount > 3) {
    findings.push({
      id: "idx-errors",
      severity: "medium",
      category: "Indexing",
      title: `${errorCount} pages have indexing errors`,
      description: "Google Search Console reported errors when trying to index these pages.",
      impact: "Error pages won't appear in search results",
      fix: "Check the Indexing tab for specific error messages. Common causes: server errors (5xx), blocked by robots.txt, or redirect loops.",
      affected: [],
      count: errorCount,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2: CONTENT QUALITY
  // ═══════════════════════════════════════════════════════════════════════════

  if (Date.now() - auditStart < BUDGET_MS - 10_000) {
    const publishedPosts = await prisma.blogPost.findMany({
      where: { siteId, published: true },
      select: {
        id: true,
        slug: true,
        title_en: true,
        meta_title_en: true,
        meta_description_en: true,
        content_en: true,
        seo_score: true,
        featured_image: true,
      },
      take: 200,
    });

    // Meta title issues
    const missingMetaTitle = publishedPosts.filter((p) => !p.meta_title_en || p.meta_title_en.trim().length < 10);
    const longMetaTitle = publishedPosts.filter((p) => p.meta_title_en && p.meta_title_en.length > 60);
    const shortMetaTitle = publishedPosts.filter(
      (p) => p.meta_title_en && p.meta_title_en.length >= 10 && p.meta_title_en.length < 30,
    );

    if (missingMetaTitle.length > 0) {
      findings.push({
        id: "content-no-meta-title",
        severity: "critical",
        category: "Content Quality",
        title: `${missingMetaTitle.length} published articles have no meta title`,
        description: "Meta titles are the clickable headline in Google search results. Without one, Google guesses — and usually guesses badly.",
        impact: "Lower click-through rate = fewer visitors from search",
        fix: "The SEO agent auto-fix cron generates missing meta titles. Run 'seo-agent' from Crons tab to trigger it now.",
        affected: missingMetaTitle.map((p) => `/blog/${p.slug}`),
        count: missingMetaTitle.length,
      });
    }

    if (longMetaTitle.length > 0) {
      findings.push({
        id: "content-long-meta-title",
        severity: "medium",
        category: "Content Quality",
        title: `${longMetaTitle.length} articles have meta titles over 60 characters`,
        description: "Google truncates titles longer than ~60 characters with '...' — your key message gets cut off.",
        impact: "Truncated titles look unprofessional and lose keyword visibility",
        fix: "The content-auto-fix cron trims long meta titles automatically. Run it from Crons tab.",
        affected: longMetaTitle.map((p) => `/blog/${p.slug} (${p.meta_title_en?.length}ch)`),
        count: longMetaTitle.length,
      });
    }

    if (shortMetaTitle.length > 0) {
      findings.push({
        id: "content-short-meta-title",
        severity: "low",
        category: "Content Quality",
        title: `${shortMetaTitle.length} articles have very short meta titles (<30 chars)`,
        description: "Short titles waste valuable SERP real estate. You could be showing more keywords.",
        impact: "Missed opportunity for keyword visibility and click-through",
        fix: "Edit these articles and expand their meta titles to 50-60 characters with target keywords.",
        affected: shortMetaTitle.map((p) => `/blog/${p.slug}`),
        count: shortMetaTitle.length,
      });
    }

    // Meta description issues
    const missingMetaDesc = publishedPosts.filter((p) => !p.meta_description_en || p.meta_description_en.trim().length < 20);
    const longMetaDesc = publishedPosts.filter((p) => p.meta_description_en && p.meta_description_en.length > 160);
    const shortMetaDesc = publishedPosts.filter(
      (p) => p.meta_description_en && p.meta_description_en.length >= 20 && p.meta_description_en.length < 120,
    );

    if (missingMetaDesc.length > 0) {
      findings.push({
        id: "content-no-meta-desc",
        severity: "high",
        category: "Content Quality",
        title: `${missingMetaDesc.length} articles have no meta description`,
        description: "Meta descriptions are the preview text under your title in search results. Without one, Google picks a random snippet — often badly.",
        impact: "Lower click-through rate. Google may also use this to judge page relevance.",
        fix: "Run 'seo-agent' from Crons tab — it generates missing meta descriptions automatically.",
        affected: missingMetaDesc.map((p) => `/blog/${p.slug}`),
        count: missingMetaDesc.length,
      });
    }

    if (longMetaDesc.length > 0) {
      findings.push({
        id: "content-long-meta-desc",
        severity: "medium",
        category: "Content Quality",
        title: `${longMetaDesc.length} articles have meta descriptions over 160 characters`,
        description: "Google truncates descriptions over ~160 characters. Your call-to-action or key benefit gets cut off.",
        impact: "Truncated descriptions reduce click appeal",
        fix: "The content-auto-fix cron trims these automatically. Run it from Crons tab.",
        affected: longMetaDesc.map((p) => `/blog/${p.slug} (${p.meta_description_en?.length}ch)`),
        count: longMetaDesc.length,
      });
    }

    // Thin content
    const thinPosts = publishedPosts.filter((p) => {
      if (!p.content_en) return true;
      const wordCount = p.content_en.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;
      return wordCount < CONTENT_QUALITY.minWords;
    });

    if (thinPosts.length > 0) {
      findings.push({
        id: "content-thin",
        severity: "high",
        category: "Content Quality",
        title: `${thinPosts.length} published articles have fewer than ${CONTENT_QUALITY.minWords} words`,
        description: `Google's 2026 Authenticity Update heavily penalizes thin content. Articles need depth to demonstrate first-hand experience and topical authority.`,
        impact: "Thin content is actively demoted in search rankings. May trigger 'unhelpful content' signals for entire site.",
        fix: "Run 'content-auto-fix' from Crons tab — it expands articles under 1,000 words automatically. For manual edits, use the Article Writer in cockpit.",
        affected: thinPosts.map((p) => `/blog/${p.slug}`),
        count: thinPosts.length,
      });
    }

    // Low SEO scores (BlogPost has seo_score, not quality_score)
    // Split into two mutually exclusive groups to avoid double-counting health deductions
    const lowSeo = publishedPosts.filter((p) => (p.seo_score || 0) < 50 && (p.seo_score || 0) > 0);
    const lowQuality = publishedPosts.filter((p) => (p.seo_score || 0) >= 50 && (p.seo_score || 0) < CONTENT_QUALITY.qualityGateScore);

    if (lowSeo.length > 0) {
      findings.push({
        id: "content-low-seo",
        severity: "high",
        category: "Content Quality",
        title: `${lowSeo.length} articles have SEO scores below 50`,
        description: "These articles have significant SEO deficiencies — missing internal links, no structured data, poor heading hierarchy, or missing keywords.",
        impact: "Low SEO score = lower chance of ranking for target keywords",
        fix: "Open each article in the editor and check: heading structure, internal links, keyword placement, and meta tags.",
        affected: lowSeo.map((p) => `/blog/${p.slug} (SEO: ${p.seo_score})`),
        count: lowSeo.length,
      });
    }

    if (lowQuality.length > 0) {
      findings.push({
        id: "content-low-quality",
        severity: "high",
        category: "Content Quality",
        title: `${lowQuality.length} articles have SEO scores between 50-${CONTENT_QUALITY.qualityGateScore - 1}`,
        description: "These articles passed the quality gate at a time when the threshold was lower. They don't meet current standards.",
        impact: "Below-threshold articles dilute your site's topical authority",
        fix: "Re-run quality scoring and consider expanding or rewriting these articles.",
        affected: lowQuality.map((p) => `/blog/${p.slug} (score: ${p.seo_score})`),
        count: lowQuality.length,
      });
    }

    // Missing featured images
    const noImage = publishedPosts.filter((p) => !p.featured_image);
    if (noImage.length > 3) {
      findings.push({
        id: "content-no-image",
        severity: "medium",
        category: "Content Quality",
        title: `${noImage.length} articles have no featured image`,
        description: "Articles without images look incomplete in social shares and Google Discover. Google's 2026 update rewards original media.",
        impact: "Lower engagement in Google Discover and social media shares",
        fix: "Add relevant featured images to these articles through the editor.",
        affected: noImage.map((p) => `/blog/${p.slug}`),
        count: noImage.length,
      });
    }

    // Stale content (not updated in 90+ days)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000);
    const stalePosts = publishedPosts.length > 0 ? await prisma.blogPost.findMany({
      where: { siteId, published: true, updated_at: { lt: ninetyDaysAgo } },
      select: { slug: true, updated_at: true },
      take: 20,
    }) : [];
    if (stalePosts.length > 5) {
      findings.push({
        id: "content-stale",
        severity: "medium",
        category: "Content Quality",
        title: `${stalePosts.length} articles haven't been updated in 90+ days`,
        description: "Google's 2026 Authenticity Update rewards freshness. Stale content signals neglect and loses ranking authority over time.",
        impact: "Competitors publishing fresher content on the same topics will outrank stale pages",
        fix: "Prioritize updating your highest-traffic stale articles: add new information, update dates, refresh affiliate links, and expand thin sections.",
        affected: stalePosts.slice(0, 15).map((p) => `/blog/${p.slug} (last updated: ${p.updated_at.toISOString().split("T")[0]})`),
        count: stalePosts.length,
      });
    }

    // Duplicate titles
    const titleCounts = new Map<string, string[]>();
    for (const p of publishedPosts) {
      const title = (p.meta_title_en || p.title_en || "").toLowerCase().trim();
      if (title.length > 5) {
        if (!titleCounts.has(title)) titleCounts.set(title, []);
        titleCounts.get(title)!.push(`/blog/${p.slug}`);
      }
    }
    const duplicateTitles = Array.from(titleCounts.entries()).filter(([, slugs]) => slugs.length > 1);
    if (duplicateTitles.length > 0) {
      const totalDupes = duplicateTitles.reduce((sum, [, slugs]) => sum + slugs.length, 0);
      findings.push({
        id: "content-duplicate-titles",
        severity: "critical",
        category: "Content Quality",
        title: `${totalDupes} articles share duplicate titles (${duplicateTitles.length} groups)`,
        description: "Duplicate titles cause keyword cannibalization — your pages compete against each other instead of against competitors.",
        impact: "Google picks one page and suppresses the rest. You lose traffic on ALL duplicate pages.",
        fix: "Give each article a unique, descriptive title with its specific target keyword.",
        affected: duplicateTitles.flatMap(([title, slugs]) => [`"${title}":`, ...slugs]),
        count: totalDupes,
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 3: GSC PERFORMANCE (click drop analysis)
  // ═══════════════════════════════════════════════════════════════════════════

  if (Date.now() - auditStart < BUDGET_MS - 8_000) {
    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000);
      const twentyEightDaysAgo = new Date(now.getTime() - 28 * 86400000);

      // Get recent and previous period GSC data
      const [recentPerf, previousPerf] = await Promise.all([
        prisma.gscPagePerformance.findMany({
          where: { site_id: siteId, date: { gte: sevenDaysAgo } },
          select: { url: true, clicks: true, impressions: true, ctr: true, position: true },
        }),
        prisma.gscPagePerformance.findMany({
          where: { site_id: siteId, date: { gte: fourteenDaysAgo, lt: sevenDaysAgo } },
          select: { url: true, clicks: true, impressions: true, ctr: true, position: true },
        }),
      ]);

      // Aggregate by URL
      const aggregate = (rows: typeof recentPerf) => {
        const byUrl = new Map<string, { clicks: number; impressions: number; ctr: number; position: number; count: number }>();
        for (const r of rows) {
          const existing = byUrl.get(r.url) || { clicks: 0, impressions: 0, ctr: 0, position: 0, count: 0 };
          existing.clicks += r.clicks || 0;
          existing.impressions += r.impressions || 0;
          existing.ctr += r.ctr || 0;
          existing.position += r.position || 0;
          existing.count += 1;
          byUrl.set(r.url, existing);
        }
        // Compute averages for ctr and position
        for (const [, v] of byUrl) {
          if (v.count > 0) {
            v.ctr = v.ctr / v.count;
            v.position = v.position / v.count;
          }
        }
        return byUrl;
      };

      const recentByUrl = aggregate(recentPerf);
      const previousByUrl = aggregate(previousPerf);

      // Site-level totals
      let recentTotalClicks = 0;
      let recentTotalImpressions = 0;
      for (const v of recentByUrl.values()) {
        recentTotalClicks += v.clicks;
        recentTotalImpressions += v.impressions;
      }
      let previousTotalClicks = 0;
      let previousTotalImpressions = 0;
      for (const v of previousByUrl.values()) {
        previousTotalClicks += v.clicks;
        previousTotalImpressions += v.impressions;
      }

      const clickChange = previousTotalClicks > 0
        ? Math.round(((recentTotalClicks - previousTotalClicks) / previousTotalClicks) * 100)
        : 0;
      const impressionChange = previousTotalImpressions > 0
        ? Math.round(((recentTotalImpressions - previousTotalImpressions) / previousTotalImpressions) * 100)
        : 0;

      if (clickChange < -15) {
        // Find the pages that dropped the most
        const droppers: Array<{ url: string; recentClicks: number; previousClicks: number; drop: number }> = [];
        for (const [url, prev] of previousByUrl) {
          const recent = recentByUrl.get(url);
          const recentClicks = recent?.clicks || 0;
          const drop = prev.clicks - recentClicks;
          if (drop > 0 && prev.clicks >= 3) {
            droppers.push({ url, recentClicks, previousClicks: prev.clicks, drop });
          }
        }
        droppers.sort((a, b) => b.drop - a.drop);
        const topDroppers = droppers.slice(0, 10);

        findings.push({
          id: "gsc-click-drop",
          severity: clickChange < -30 ? "critical" : "high",
          category: "Search Performance",
          title: `Clicks dropped ${clickChange}% week-over-week (${previousTotalClicks} → ${recentTotalClicks})`,
          description: `Your site received ${recentTotalClicks} clicks this week vs ${previousTotalClicks} last week. Impressions changed ${impressionChange}%.${impressionChange < -10 ? " Impressions also dropped — Google may be showing your pages less often." : impressionChange > 5 ? " Impressions are stable/up — the issue is click-through rate, not visibility." : ""}`,
          impact: "Fewer clicks = fewer visitors = fewer affiliate conversions = less revenue",
          fix: impressionChange < -10
            ? "Google is showing your pages less. Check: (1) Has a competitor published similar content? (2) Were any pages deindexed? (3) Is there a Google algorithm update? Review the pages that dropped most."
            : "Your pages are showing but people aren't clicking. Check: (1) Are meta titles compelling? (2) Are meta descriptions clear? (3) Has a competitor taken over your SERP position? Improve the titles/descriptions on your top-dropping pages.",
          affected: topDroppers.map(
            (d) => `${d.url.replace(siteDomain, "")} (${d.previousClicks}→${d.recentClicks} clicks, -${d.drop})`,
          ),
          count: droppers.length,
        });
      }

      // Low CTR pages (visible but not clicked)
      const lowCtrPages: Array<{ url: string; impressions: number; ctr: number }> = [];
      for (const [url, data] of recentByUrl) {
        if (data.impressions >= 50 && data.ctr < 0.02) {
          lowCtrPages.push({ url, impressions: data.impressions, ctr: data.ctr });
        }
      }
      if (lowCtrPages.length > 0) {
        lowCtrPages.sort((a, b) => b.impressions - a.impressions);
        findings.push({
          id: "gsc-low-ctr",
          severity: "high",
          category: "Search Performance",
          title: `${lowCtrPages.length} pages have CTR below 2% despite high impressions`,
          description: "Google is showing these pages in search results, but users aren't clicking. This means the title or description doesn't match what searchers want.",
          impact: "High impressions + low CTR signals to Google that your content isn't relevant — this can cause ranking drops over time",
          fix: "Rewrite the meta titles to be more compelling and specific. Make sure the meta description answers the searcher's question directly. Consider adding numbers, brackets, or the current year to titles.",
          affected: lowCtrPages.slice(0, 10).map(
            (p) => `${p.url.replace(siteDomain, "")} (${p.impressions} impressions, ${(p.ctr * 100).toFixed(1)}% CTR)`,
          ),
          count: lowCtrPages.length,
        });
      }

      // Position drops
      const positionDrops: Array<{ url: string; recentPos: number; previousPos: number }> = [];
      for (const [url, prev] of previousByUrl) {
        const recent = recentByUrl.get(url);
        if (recent && prev.position > 0 && recent.position > 0) {
          const posDrop = recent.position - prev.position;
          if (posDrop > 3 && prev.impressions >= 5) {
            positionDrops.push({ url, recentPos: recent.position, previousPos: prev.position });
          }
        }
      }
      if (positionDrops.length > 0) {
        positionDrops.sort((a, b) => (b.recentPos - b.previousPos) - (a.recentPos - a.previousPos));
        findings.push({
          id: "gsc-position-drops",
          severity: "medium",
          category: "Search Performance",
          title: `${positionDrops.length} pages dropped 3+ positions in Google rankings`,
          description: "These pages are slipping in search rankings. Position 1-3 gets 60%+ of clicks, so even small drops matter.",
          impact: "Dropping from page 1 (positions 1-10) to page 2+ means ~90% less traffic",
          fix: "For each dropping page: (1) Check if content is still up-to-date, (2) Add more internal links pointing to it, (3) Expand the content with more depth and first-hand experience signals, (4) Check if competitors published better content on the same topic.",
          affected: positionDrops.slice(0, 10).map(
            (p) => `${p.url.replace(siteDomain, "")} (position ${p.previousPos.toFixed(1)} → ${p.recentPos.toFixed(1)})`,
          ),
          count: positionDrops.length,
        });
      }

      // Add overall performance summary
      if (recentPerf.length > 0) {
        findings.push({
          id: "gsc-summary",
          severity: "info",
          category: "Search Performance",
          title: `GSC Summary: ${recentTotalClicks} clicks, ${recentTotalImpressions} impressions this week`,
          description: `Week-over-week: clicks ${clickChange >= 0 ? "+" : ""}${clickChange}%, impressions ${impressionChange >= 0 ? "+" : ""}${impressionChange}%. Tracking ${recentByUrl.size} pages with search traffic.`,
          impact: "",
          fix: "",
          affected: [],
          count: 0,
        });
      } else {
        findings.push({
          id: "gsc-no-data",
          severity: "high",
          category: "Search Performance",
          title: "No Google Search Console data available",
          description: "GSC data is not being synced. Without this data, you can't see how Google sees your site.",
          impact: "Flying blind — you won't know about click drops, ranking changes, or indexing issues until it's too late",
          fix: "Ensure GSC credentials are configured (GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL, GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY). Then run 'gsc-sync' from Crons tab.",
          affected: [],
          count: 0,
        });
      }
    } catch (gscErr) {
      console.warn("[seo-audit] GSC performance check failed:", gscErr instanceof Error ? gscErr.message : gscErr);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 4: PIPELINE HEALTH
  // ═══════════════════════════════════════════════════════════════════════════

  if (Date.now() - auditStart < BUDGET_MS - 5_000) {
    const [stuckDrafts, rejectedDrafts, reservoirDrafts] = await Promise.all([
      prisma.articleDraft.findMany({
        where: {
          site_id: siteId,
          current_phase: { in: ["research", "outline", "drafting", "assembly", "images", "seo", "scoring"] },
          updated_at: { lt: new Date(Date.now() - 2 * 60 * 60 * 1000) },
        },
        select: { id: true, keyword: true, current_phase: true, last_error: true, updated_at: true },
        take: 20,
      }),
      prisma.articleDraft.count({
        where: { site_id: siteId, current_phase: "rejected" },
      }),
      prisma.articleDraft.count({
        where: { site_id: siteId, current_phase: "reservoir" },
      }),
    ]);

    if (stuckDrafts.length > 0) {
      findings.push({
        id: "pipeline-stuck",
        severity: "high",
        category: "Content Pipeline",
        title: `${stuckDrafts.length} articles stuck in pipeline for 2+ hours`,
        description: "These drafts haven't progressed through the pipeline. They may be blocked by errors, budget exhaustion, or AI failures.",
        impact: "Stuck drafts = no new articles = no new traffic = no new revenue",
        fix: "Check each draft's error message. Common fixes: run 'content-builder' cron to retry, or use 'pipeline-sweeper' to recover stuck drafts.",
        affected: stuckDrafts.map(
          (d) => `"${d.keyword}" — stuck in ${d.current_phase}${d.last_error ? ` (${d.last_error.substring(0, 80)})` : ""}`,
        ),
        count: stuckDrafts.length,
      });
    }

    if (rejectedDrafts > 5) {
      findings.push({
        id: "pipeline-rejected",
        severity: "medium",
        category: "Content Pipeline",
        title: `${rejectedDrafts} drafts rejected by quality gate`,
        description: "These articles failed quality checks and were not published. High rejection rates waste AI budget.",
        impact: "Each rejected draft costs AI tokens without producing revenue",
        fix: "Review rejection reasons. If patterns emerge (e.g., Arabic JSON parse failures), address the root cause in the pipeline.",
        affected: [],
        count: rejectedDrafts,
      });
    }

    if (reservoirDrafts === 0) {
      findings.push({
        id: "pipeline-empty-reservoir",
        severity: "high",
        category: "Content Pipeline",
        title: "Content reservoir is empty — no articles ready to publish",
        description: "The reservoir holds articles that passed quality checks and are waiting to be published. When it's empty, the scheduled publish cron has nothing to work with.",
        impact: "No new articles will be published until the pipeline produces more content",
        fix: "Run 'content-builder' from Crons tab to start generating new drafts. Check if topic proposals are available.",
        affected: [],
        count: 0,
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 5: CRON HEALTH
  // ═══════════════════════════════════════════════════════════════════════════

  if (Date.now() - auditStart < BUDGET_MS - 3_000) {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Include cron failures for this site OR multi-site runs (site_id: null)
      const siteOrGlobal = { OR: [{ site_id: siteId }, { site_id: null }] };
      const [recentFailures, recentTimeouts] = await Promise.all([
        prisma.cronJobLog.findMany({
          where: { status: "failed", started_at: { gte: twentyFourHoursAgo }, ...siteOrGlobal },
          select: { job_name: true, error_message: true, started_at: true },
          orderBy: { started_at: "desc" },
          take: 10,
        }),
        prisma.cronJobLog.count({
          where: {
            started_at: { gte: twentyFourHoursAgo },
            duration_ms: { gte: 50000 },
            ...siteOrGlobal,
          },
        }),
      ]);

      if (recentFailures.length > 0) {
        findings.push({
          id: "cron-failures",
          severity: recentFailures.length > 3 ? "critical" : "high",
          category: "System Health",
          title: `${recentFailures.length} cron job failures in the last 24 hours`,
          description: "Failed cron jobs mean parts of the system aren't running: content isn't being generated, articles aren't being published, or indexing isn't happening.",
          impact: "The pipeline is partially broken. Revenue-generating activities may be halted.",
          fix: "Check each failure in the Crons tab. Common fixes: retry the job, check API credentials, or review error messages.",
          affected: recentFailures.map(
            (f) => `${f.job_name}: ${(f.error_message || "no error details").substring(0, 100)}`,
          ),
          count: recentFailures.length,
        });
      }

      if (recentTimeouts > 10) {
        findings.push({
          id: "cron-timeouts",
          severity: "medium",
          category: "System Health",
          title: `${recentTimeouts} cron runs exceeded 50 seconds in the last 24 hours`,
          description: "Vercel has a 60-second limit. Runs over 50 seconds risk being killed before completing their work.",
          impact: "Incomplete processing — articles half-generated, URLs partially submitted, data partially synced",
          fix: "This is usually caused by processing too many items per run. The recent optimization reduced per-site limits. Monitor whether this improves.",
          affected: [],
          count: recentTimeouts,
        });
      }
    } catch (cronErr) {
      console.warn("[seo-audit] Cron health check failed:", cronErr instanceof Error ? cronErr.message : cronErr);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 6: LIVE PAGE SAMPLING (spot-check 5 random published pages)
  // ═══════════════════════════════════════════════════════════════════════════

  if (Date.now() - auditStart < BUDGET_MS - 12_000) {
    try {
      // Sample a mix: 2 most recent + 3 random older posts for broader coverage
      const totalPublishedCount = await prisma.blogPost.count({ where: { siteId, published: true } });
      const recentSample = await prisma.blogPost.findMany({
        where: { siteId, published: true },
        select: { slug: true, title_en: true },
        take: 2,
        orderBy: { updated_at: "desc" },
      });
      let randomSample: typeof recentSample = [];
      if (totalPublishedCount > 2) {
        const randomSkip = Math.max(0, Math.floor((crypto.getRandomValues(new Uint32Array(1))[0] / 0xFFFFFFFF) * (totalPublishedCount - 3)));
        randomSample = await prisma.blogPost.findMany({
          where: { siteId, published: true },
          select: { slug: true, title_en: true },
          take: 3,
          skip: randomSkip,
          orderBy: { created_at: "asc" },
        });
      }
      // Deduplicate by slug
      const seenSlugs = new Set(recentSample.map((p) => p.slug));
      const samplePosts = [...recentSample];
      for (const p of randomSample) {
        if (!seenSlugs.has(p.slug) && samplePosts.length < 5) {
          samplePosts.push(p);
          seenSlugs.add(p.slug);
        }
      }

      const pageIssues: Array<{ slug: string; issues: string[] }> = [];
      for (const post of samplePosts) {
        if (Date.now() - auditStart > BUDGET_MS - 8_000) break;
        const pageUrl = `${siteDomain}/blog/${post.slug}`;
        try {
          const resp = await fetch(pageUrl, {
            signal: AbortSignal.timeout(5_000),
            headers: { "User-Agent": "YallaLondon-SEOAudit/1.0" },
          });
          const issues: string[] = [];
          if (resp.status !== 200) issues.push(`HTTP ${resp.status} (should be 200)`);
          if (!resp.headers.get("x-robots-tag")?.includes("noindex")) {
            // Good — page is indexable
          }
          const html = await resp.text();
          if (!html.includes("<title>")) issues.push("Missing <title> tag");
          if (!html.includes('rel="canonical"')) issues.push("Missing canonical tag");
          if (!html.includes("application/ld+json")) issues.push("No JSON-LD structured data");
          if (!html.includes('hreflang')) issues.push("Missing hreflang tags (bilingual site needs these)");
          if (!html.includes('meta name="description"') && !html.includes('name="description"')) issues.push("Missing meta description in HTML");

          // Check heading hierarchy
          const h1Matches = html.match(/<h1[\s>]/gi);
          if (!h1Matches || h1Matches.length === 0) issues.push("No H1 heading found");
          if (h1Matches && h1Matches.length > 1) issues.push(`Multiple H1 headings (${h1Matches.length} found — should be 1)`);

          const h2Matches = html.match(/<h2[\s>]/gi);
          if (!h2Matches || h2Matches.length < 2) issues.push("Fewer than 2 H2 headings (content lacks structure)");

          // Check for internal links
          const auditDomain = siteConfig?.domain || siteDomain.replace(/^https?:\/\/(www\.)?/, "");
          const internalLinkRegex = new RegExp(`href=["'](?:https?://(?:www\\.)?${auditDomain})?/[^"']*["']`, "gi");
          const internalLinks = html.match(internalLinkRegex);
          if (!internalLinks || internalLinks.length < 3) {
            issues.push(`Only ${internalLinks?.length || 0} internal links (minimum 3 recommended)`);
          }

          if (issues.length > 0) {
            pageIssues.push({ slug: post.slug, issues });
          }
        } catch (fetchErr) {
          pageIssues.push({
            slug: post.slug,
            issues: [`Page unreachable: ${fetchErr instanceof Error ? fetchErr.message : "timeout"}`],
          });
        }
      }

      if (pageIssues.length > 0) {
        const totalIssues = pageIssues.reduce((sum, p) => sum + p.issues.length, 0);
        findings.push({
          id: "live-page-issues",
          severity: totalIssues > 8 ? "high" : "medium",
          category: "Technical SEO",
          title: `${totalIssues} technical issues found on ${pageIssues.length} sampled pages`,
          description: `Spot-checked ${samplePosts.length} recently updated pages for essential SEO elements.`,
          impact: "Missing technical elements (canonical, hreflang, structured data) reduce Google's ability to understand and rank your pages",
          fix: "Fix missing elements through the content pipeline or manual editing. Most issues can be resolved by the SEO agent cron.",
          affected: pageIssues.flatMap((p) => [`/blog/${p.slug}:`, ...p.issues.map((i) => `  → ${i}`)]),
          count: totalIssues,
        });
      } else if (samplePosts.length > 0) {
        findings.push({
          id: "live-pages-clean",
          severity: "info",
          category: "Technical SEO",
          title: `All ${samplePosts.length} sampled pages pass technical checks`,
          description: "Title tags, canonical URLs, hreflang, structured data, heading hierarchy, and internal links all present.",
          impact: "",
          fix: "",
          affected: [],
          count: 0,
        });
      }
    } catch (liveErr) {
      console.warn("[seo-audit] Live page sampling failed:", liveErr instanceof Error ? liveErr.message : liveErr);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 7: HREFLANG & BILINGUAL COVERAGE
  // ═══════════════════════════════════════════════════════════════════════════

  if (Date.now() - auditStart < BUDGET_MS - 8_000) {
    try {
      // Check how many published posts have Arabic content
      const [totalPublished, withArabic, withoutArabic] = await Promise.all([
        prisma.blogPost.count({ where: { siteId, published: true } }),
        prisma.blogPost.count({ where: { siteId, published: true, content_ar: { not: "" } } }),
        prisma.blogPost.findMany({
          where: { siteId, published: true, content_ar: "" },
          select: { slug: true, title_en: true },
          take: 15,
        }),
      ]);

      const arCoverage = totalPublished > 0 ? Math.round((withArabic / totalPublished) * 100) : 0;

      if (withoutArabic.length > 0) {
        findings.push({
          id: "hreflang-missing-arabic",
          severity: arCoverage < 50 ? "high" : "medium",
          category: "Bilingual & Hreflang",
          title: `${withoutArabic.length} articles missing Arabic translation (${arCoverage}% coverage)`,
          description: `Your site targets Arabic-speaking travelers but ${withoutArabic.length} published articles have no Arabic version. Google shows hreflang warnings for pages without both language versions.`,
          impact: "Missing translations = missed Arabic search traffic. Hreflang mismatches can confuse Google about which version to show.",
          fix: "Run 'content-builder' to generate Arabic versions, or manually translate priority articles. Focus on highest-traffic articles first.",
          affected: withoutArabic.map((p) => `/blog/${p.slug}`),
          count: withoutArabic.length,
        });
      }

      // Check hreflang reciprocity in URLIndexingStatus
      const hreflangIssues = await prisma.uRLIndexingStatus.count({
        where: {
          site_id: siteId,
          status: "indexed",
          url: { contains: "/ar/" },
        },
      });
      const enIndexed = await prisma.uRLIndexingStatus.count({
        where: {
          site_id: siteId,
          status: "indexed",
          NOT: { url: { contains: "/ar/" } },
        },
      });

      if (enIndexed > 0 && hreflangIssues === 0) {
        findings.push({
          id: "hreflang-no-ar-indexed",
          severity: "high",
          category: "Bilingual & Hreflang",
          title: `${enIndexed} English pages indexed but 0 Arabic pages indexed`,
          description: "None of your Arabic (/ar/) pages are indexed by Google. This means half your potential audience can't find your content.",
          impact: "Arabic-speaking searchers won't find your site. Gulf travelers (your primary audience) search in Arabic.",
          fix: "Check if /ar/ routes return proper content (not 404s). Verify hreflang tags point to correct URLs. Submit Arabic URLs via IndexNow.",
          affected: [],
          count: enIndexed,
        });
      }
    } catch (bilingualErr) {
      console.warn("[seo-audit] Bilingual check failed:", bilingualErr instanceof Error ? bilingualErr.message : bilingualErr);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 8: INTERNAL LINKING ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════════

  if (Date.now() - auditStart < BUDGET_MS - 6_000) {
    try {
      const postsForLinks = await prisma.blogPost.findMany({
        where: { siteId, published: true },
        select: { slug: true, content_en: true },
        take: 100,
      });

      const domain = siteConfig?.domain || siteDomain.replace(/^https?:\/\/(www\.)?/, "");
      let orphanPages = 0;
      const orphanSlugs: string[] = [];

      // Build internal link graph
      const inboundLinks = new Map<string, number>();
      for (const post of postsForLinks) {
        if (!post.content_en) continue;
        const linkRegex = new RegExp(`href=["'](?:https?://(?:www\\.)?${domain})?/blog/([^"'#?]+)`, "gi");
        let match;
        while ((match = linkRegex.exec(post.content_en)) !== null) {
          const targetSlug = match[1];
          inboundLinks.set(targetSlug, (inboundLinks.get(targetSlug) || 0) + 1);
        }
      }

      for (const post of postsForLinks) {
        const inbound = inboundLinks.get(post.slug) || 0;
        if (inbound === 0) {
          orphanPages++;
          if (orphanSlugs.length < 15) orphanSlugs.push(post.slug);
        }
      }

      if (orphanPages > 3) {
        findings.push({
          id: "links-orphan-pages",
          severity: "high",
          category: "Internal Linking",
          title: `${orphanPages} published articles have zero inbound internal links`,
          description: "Orphan pages have no other page linking to them. Google discovers content through links — orphan pages may never be crawled or may lose ranking authority.",
          impact: "Orphan pages get less crawl budget, less PageRank, and rank lower than linked pages",
          fix: "Add internal links from related articles. The SEO agent can inject related-article links automatically — run 'seo-agent' from Crons tab.",
          affected: orphanSlugs.map((s) => `/blog/${s}`),
          count: orphanPages,
        });
      }

      // Check for articles with very few outbound internal links
      let fewOutbound = 0;
      const fewOutboundSlugs: string[] = [];
      for (const post of postsForLinks) {
        if (!post.content_en) continue;
        const outboundRegex = new RegExp(`href=["'](?:https?://(?:www\\.)?${domain})?/(?:blog|news|information|guides)`, "gi");
        const outbound = (post.content_en.match(outboundRegex) || []).length;
        if (outbound < 2) {
          fewOutbound++;
          if (fewOutboundSlugs.length < 10) fewOutboundSlugs.push(`${post.slug} (${outbound} links)`);
        }
      }

      if (fewOutbound > 5) {
        findings.push({
          id: "links-few-outbound",
          severity: "medium",
          category: "Internal Linking",
          title: `${fewOutbound} articles have fewer than 2 internal links`,
          description: "Articles should link to at least 3 other articles on your site. This helps Google discover content and distributes ranking authority.",
          impact: "Poor internal linking weakens your site's topical authority clusters",
          fix: "The SEO agent auto-injects related article links. Run 'seo-agent' from Crons tab.",
          affected: fewOutboundSlugs.map((s) => `/blog/${s}`),
          count: fewOutbound,
        });
      }
    } catch (linkErr) {
      console.warn("[seo-audit] Internal link analysis failed:", linkErr instanceof Error ? linkErr.message : linkErr);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 9: SITEMAP & ROBOTS.TXT
  // ═══════════════════════════════════════════════════════════════════════════

  if (Date.now() - auditStart < BUDGET_MS - 5_000) {
    try {
      // Check sitemap
      const sitemapUrl = `${siteDomain}/sitemap.xml`;
      try {
        const sitemapResp = await fetch(sitemapUrl, { signal: AbortSignal.timeout(5_000) });
        if (sitemapResp.status !== 200) {
          findings.push({
            id: "sitemap-missing",
            severity: "critical",
            category: "Technical SEO",
            title: `Sitemap.xml returns HTTP ${sitemapResp.status}`,
            description: "Your sitemap is not accessible. Google uses the sitemap to discover and prioritize pages for crawling.",
            impact: "Without a sitemap, Google relies only on following links — slower discovery and potential missed pages",
            fix: "Check if sitemap.ts is properly configured in the app directory. The sitemap should be auto-generated by Next.js.",
            affected: [sitemapUrl],
            count: 1,
          });
        } else {
          const sitemapText = await sitemapResp.text();
          const urlCount = (sitemapText.match(/<url>/gi) || []).length;
          const publishedCount = await prisma.blogPost.count({ where: { siteId, published: true } });

          if (urlCount < publishedCount * 0.5) {
            findings.push({
              id: "sitemap-incomplete",
              severity: "high",
              category: "Technical SEO",
              title: `Sitemap has ${urlCount} URLs but ${publishedCount} articles are published`,
              description: `Only ${Math.round((urlCount / Math.max(publishedCount, 1)) * 100)}% of your published articles appear in the sitemap. Missing articles won't be discovered by Google via sitemap.`,
              impact: "Articles not in the sitemap take longer to be discovered and indexed",
              fix: "Check sitemap.ts to ensure it queries all published BlogPosts. Static data and DB articles should both be included.",
              affected: [],
              count: publishedCount - urlCount,
            });
          } else {
            findings.push({
              id: "sitemap-ok",
              severity: "info",
              category: "Technical SEO",
              title: `Sitemap healthy: ${urlCount} URLs (${publishedCount} published articles)`,
              description: "Your sitemap includes all published articles and is accessible at /sitemap.xml.",
              impact: "",
              fix: "",
              affected: [],
              count: 0,
            });
          }
        }
      } catch (smErr) {
        findings.push({
          id: "sitemap-unreachable",
          severity: "high",
          category: "Technical SEO",
          title: "Sitemap.xml is unreachable",
          description: `Failed to fetch ${sitemapUrl}: ${smErr instanceof Error ? smErr.message : "timeout"}`,
          impact: "If you can't reach it, neither can Google",
          fix: "Check if the site is deployed and accessible. Verify the sitemap.ts route exists.",
          affected: [sitemapUrl],
          count: 1,
        });
      }

      // Check robots.txt
      if (Date.now() - auditStart < BUDGET_MS - 4_000) {
        try {
          const robotsResp = await fetch(`${siteDomain}/robots.txt`, { signal: AbortSignal.timeout(3_000) });
          if (robotsResp.status === 200) {
            const robotsTxt = await robotsResp.text();
            if (robotsTxt.includes("Disallow: /")) {
              // Check if it blocks important paths
              if (robotsTxt.includes("Disallow: /blog")) {
                findings.push({
                  id: "robots-blocks-blog",
                  severity: "critical",
                  category: "Technical SEO",
                  title: "robots.txt is blocking /blog from being crawled!",
                  description: "Your robots.txt contains 'Disallow: /blog' — this tells Google NOT to crawl your blog content.",
                  impact: "ALL blog articles will be deindexed. This is the most likely cause of any click/traffic drop.",
                  fix: "Remove the 'Disallow: /blog' line from robots.txt immediately.",
                  affected: [`${siteDomain}/robots.txt`],
                  count: 1,
                });
              }
              // Match "Disallow: /" that is NOT followed by more path chars (e.g. /blog, /api)
              if (/Disallow:\s*\/\s*$/m.test(robotsTxt)) {
                findings.push({
                  id: "robots-blocks-all",
                  severity: "critical",
                  category: "Technical SEO",
                  title: "robots.txt is blocking ALL pages from being crawled!",
                  description: "Your robots.txt contains 'Disallow: /' — this tells Google not to crawl ANY page on your site.",
                  impact: "Your entire site will be deindexed. This is an emergency.",
                  fix: "Remove the 'Disallow: /' line from robots.txt immediately. Replace with specific disallows for admin/api paths only.",
                  affected: [`${siteDomain}/robots.txt`],
                  count: 1,
                });
              }
            }
            if (!robotsTxt.toLowerCase().includes("sitemap:")) {
              findings.push({
                id: "robots-no-sitemap",
                severity: "medium",
                category: "Technical SEO",
                title: "robots.txt doesn't reference your sitemap",
                description: "Best practice is to include 'Sitemap: https://yoursite.com/sitemap.xml' in robots.txt so crawlers discover it automatically.",
                impact: "Minor — Google usually finds sitemaps via GSC, but this helps other search engines",
                fix: "Add 'Sitemap: " + siteDomain + "/sitemap.xml' to your robots.txt",
                affected: [],
                count: 1,
              });
            }
          }
        } catch {
          // robots.txt check is non-critical
        }
      }
    } catch (techErr) {
      console.warn("[seo-audit] Technical SEO checks failed:", techErr instanceof Error ? techErr.message : techErr);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 10: SEO TRENDS (week-over-week, month-over-month)
  // ═══════════════════════════════════════════════════════════════════════════

  const trends: {
    weeklyClicks: { current: number; previous: number; change: number };
    weeklyImpressions: { current: number; previous: number; change: number };
    indexingVelocity: { thisWeek: number; lastWeek: number; change: number };
    contentVelocity: { thisWeek: number; lastWeek: number };
    topGrowing: Array<{ url: string; clickGain: number }>;
    topDeclining: Array<{ url: string; clickLoss: number }>;
  } = {
    weeklyClicks: { current: 0, previous: 0, change: 0 },
    weeklyImpressions: { current: 0, previous: 0, change: 0 },
    indexingVelocity: { thisWeek: 0, lastWeek: 0, change: 0 },
    contentVelocity: { thisWeek: 0, lastWeek: 0 },
    topGrowing: [],
    topDeclining: [],
  };

  if (Date.now() - auditStart < BUDGET_MS - 3_000) {
    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000);

      // Indexing velocity: how many pages got indexed this week vs last week
      const [indexedThisWeek, indexedLastWeek] = await Promise.all([
        prisma.uRLIndexingStatus.count({
          where: { site_id: siteId, status: "indexed", updated_at: { gte: sevenDaysAgo } },
        }),
        prisma.uRLIndexingStatus.count({
          where: { site_id: siteId, status: "indexed", updated_at: { gte: fourteenDaysAgo, lt: sevenDaysAgo } },
        }),
      ]);
      trends.indexingVelocity = {
        thisWeek: indexedThisWeek,
        lastWeek: indexedLastWeek,
        change: indexedLastWeek > 0 ? Math.round(((indexedThisWeek - indexedLastWeek) / indexedLastWeek) * 100) : 0,
      };

      // Content velocity: articles published this week vs last week
      const [publishedThisWeek, publishedLastWeek] = await Promise.all([
        prisma.blogPost.count({
          where: { siteId, published: true, created_at: { gte: sevenDaysAgo } },
        }),
        prisma.blogPost.count({
          where: { siteId, published: true, created_at: { gte: fourteenDaysAgo, lt: sevenDaysAgo } },
        }),
      ]);
      trends.contentVelocity = { thisWeek: publishedThisWeek, lastWeek: publishedLastWeek };

      // GSC click/impression trends from gsc_page_performance
      const [recentGsc, prevGsc] = await Promise.all([
        prisma.gscPagePerformance.findMany({
          where: { site_id: siteId, date: { gte: sevenDaysAgo } },
          select: { url: true, clicks: true, impressions: true },
        }),
        prisma.gscPagePerformance.findMany({
          where: { site_id: siteId, date: { gte: fourteenDaysAgo, lt: sevenDaysAgo } },
          select: { url: true, clicks: true, impressions: true },
        }),
      ]);

      // Aggregate
      let rClicks = 0, rImps = 0, pClicks = 0, pImps = 0;
      const recentByUrl = new Map<string, number>();
      const prevByUrl = new Map<string, number>();
      for (const r of recentGsc) { rClicks += r.clicks || 0; rImps += r.impressions || 0; recentByUrl.set(r.url, (recentByUrl.get(r.url) || 0) + (r.clicks || 0)); }
      for (const r of prevGsc) { pClicks += r.clicks || 0; pImps += r.impressions || 0; prevByUrl.set(r.url, (prevByUrl.get(r.url) || 0) + (r.clicks || 0)); }

      trends.weeklyClicks = { current: rClicks, previous: pClicks, change: pClicks > 0 ? Math.round(((rClicks - pClicks) / pClicks) * 100) : 0 };
      trends.weeklyImpressions = { current: rImps, previous: pImps, change: pImps > 0 ? Math.round(((rImps - pImps) / pImps) * 100) : 0 };

      // Top growing and declining pages
      const allUrls = new Set([...recentByUrl.keys(), ...prevByUrl.keys()]);
      const changes: Array<{ url: string; gain: number }> = [];
      for (const url of allUrls) {
        const recent = recentByUrl.get(url) || 0;
        const prev = prevByUrl.get(url) || 0;
        if (prev >= 2 || recent >= 2) changes.push({ url, gain: recent - prev });
      }
      changes.sort((a, b) => b.gain - a.gain);
      trends.topGrowing = changes.filter((c) => c.gain > 0).slice(0, 5).map((c) => ({ url: c.url, clickGain: c.gain }));
      trends.topDeclining = changes.filter((c) => c.gain < 0).slice(0, 5).map((c) => ({ url: c.url, clickLoss: -c.gain }));
    } catch (trendErr) {
      console.warn("[seo-audit] Trends calculation failed:", trendErr instanceof Error ? trendErr.message : trendErr);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AVAILABLE ACTIONS (safe to execute, with timeout protection)
  // ═══════════════════════════════════════════════════════════════════════════

  const availableActions = [
    { id: "submit-indexnow", label: "Submit unindexed URLs to IndexNow", cron: "google-indexing", description: "Submits all discovered URLs to Bing/Yandex via IndexNow for faster crawling", safe: true },
    { id: "run-seo-agent", label: "Run SEO auto-fixes", cron: "seo-agent", description: "Generates missing meta titles/descriptions, trims long ones, injects internal links", safe: true },
    { id: "run-content-builder", label: "Generate new content", cron: "content-builder", description: "Picks up the next topic and advances it through the content pipeline", safe: true },
    { id: "run-content-auto-fix", label: "Fix content quality issues", cron: "content-auto-fix", description: "Expands thin articles, trims long meta descriptions", safe: true },
    { id: "run-gsc-sync", label: "Sync GSC performance data", cron: "gsc-sync", description: "Pulls latest click/impression data from Google Search Console", safe: true },
    { id: "run-verify-indexing", label: "Verify indexing status", cron: "verify-indexing", description: "Checks which pages are actually indexed via GSC URL Inspection API", safe: true },
    { id: "run-content-selector", label: "Publish ready articles", cron: "content-selector", description: "Promotes reservoir articles that pass quality gates to published BlogPosts", safe: true },
    { id: "run-sweeper", label: "Recover stuck drafts", cron: "sweeper", description: "Finds and recovers drafts stuck in the pipeline due to errors or timeouts", safe: true },
    { id: "auto-fix-all", label: "Auto-fix all issues", cron: "auto_fix_all", description: "Runs audit, then chains the right crons to fix all auto-fixable issues in one tap", safe: true },
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPILE RESULTS
  // ═══════════════════════════════════════════════════════════════════════════

  // Sort by severity
  const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  findings.sort((a, b) => (severityOrder[a.severity] || 4) - (severityOrder[b.severity] || 4));

  // Compute overall health score (0-100) using logarithmic scaling.
  // Linear deductions cause any real site to score 0 (5 critical findings = -100).
  // Logarithmic scaling: 1 critical ≈ 85, 3 critical ≈ 66, 10 critical ≈ 43, many findings ≈ 20-30.
  let healthDeductions = 0;
  for (const f of findings) {
    if (f.severity === "info") continue;
    const weight = f.severity === "critical" ? 20 : f.severity === "high" ? 12 : f.severity === "medium" ? 5 : 2;
    healthDeductions += weight;
  }
  const healthScore = Math.max(15, Math.min(100, Math.round(100 - 50 * Math.log10(1 + healthDeductions / 20))));

  // Group by category
  const sections: AuditSection[] = [];
  const categories = [...new Set(findings.map((f) => f.category))];
  const categoryIcons: Record<string, string> = {
    "Indexing": "🔍",
    "Content Quality": "📝",
    "Search Performance": "📊",
    "Content Pipeline": "⚙️",
    "System Health": "🏥",
  };
  for (const cat of categories) {
    const catFindings = findings.filter((f) => f.category === cat);
    const criticals = catFindings.filter((f) => f.severity === "critical").length;
    const highs = catFindings.filter((f) => f.severity === "high").length;
    const maxScore = 100;
    const score = Math.max(0, maxScore - criticals * 25 - highs * 15 - catFindings.filter((f) => f.severity === "medium").length * 5);
    sections.push({
      name: cat,
      icon: categoryIcons[cat] || "📋",
      score,
      maxScore,
      findings: catFindings,
    });
  }

  // Generate executive summary
  const criticalCount = findings.filter((f) => f.severity === "critical").length;
  const highCount = findings.filter((f) => f.severity === "high").length;
  const summaryParts: string[] = [];
  if (criticalCount > 0) summaryParts.push(`${criticalCount} critical issues need immediate attention`);
  if (highCount > 0) summaryParts.push(`${highCount} high-priority fixes recommended`);
  if (trends.weeklyClicks.change !== 0) {
    summaryParts.push(`Clicks ${trends.weeklyClicks.change >= 0 ? "up" : "down"} ${Math.abs(trends.weeklyClicks.change)}% week-over-week`);
  }
  summaryParts.push(`${indexRate}% indexing rate (${indexedCount}/${totalTracked} pages)`);
  const summary = summaryParts.join(". ") + ".";

  return {
    healthScore,
    siteId,
    siteDomain,
    siteName: siteConfig?.name || siteId,
    summary,
    totalFindings: findings.length,
    criticalCount,
    highCount,
    mediumCount: findings.filter((f) => f.severity === "medium").length,
    lowCount: findings.filter((f) => f.severity === "low").length,
    sections,
    findings,
    trends,
    availableActions,
    indexingSummary: {
      totalTracked,
      indexed: indexedCount,
      submitted: submittedCount,
      discovered: discoveredCount,
      errors: errorCount,
      chronicFailures,
      neverSubmitted,
      indexRate,
    },
    durationMs: Date.now() - auditStart,
    timestamp: new Date().toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const { requireAdmin } = await import("@/lib/admin-middleware");
    const authError = await requireAdmin(request);
    if (authError) return authError;

    const { getDefaultSiteId } = await import("@/config/sites");
    const siteId = request.nextUrl.searchParams.get("siteId") || getDefaultSiteId();

    // Check if listing previous reports
    if (request.nextUrl.searchParams.get("history") === "true") {
      const { prisma } = await import("@/lib/db");
      try {
        const reports = await prisma.seoAuditReport.findMany({
          where: { siteId },
          select: {
            id: true,
            healthScore: true,
            totalFindings: true,
            criticalCount: true,
            highCount: true,
            summary: true,
            triggeredBy: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        });
        return NextResponse.json({ success: true, reports });
      } catch {
        // Table might not exist yet — return empty
        return NextResponse.json({ success: true, reports: [] });
      }
    }

    // Check if loading a specific report
    const reportId = request.nextUrl.searchParams.get("reportId");
    if (reportId) {
      const { prisma } = await import("@/lib/db");
      try {
        const report = await prisma.seoAuditReport.findUnique({ where: { id: reportId } });
        if (!report) return NextResponse.json({ success: false, error: "Report not found" }, { status: 404 });
        return NextResponse.json({ success: true, ...report.report as object, savedAt: report.createdAt });
      } catch {
        return NextResponse.json({ success: false, error: "Report not found" }, { status: 404 });
      }
    }

    const result = await runAudit(siteId);

    // Auto-persist every audit for trend tracking (fire-and-forget)
    try {
      const { prisma: db } = await import("@/lib/db");
      await db.seoAuditReport.create({
        data: {
          siteId,
          healthScore: result.healthScore,
          totalFindings: result.totalFindings,
          criticalCount: result.criticalCount,
          highCount: result.highCount,
          mediumCount: result.mediumCount,
          lowCount: result.lowCount,
          report: result as unknown as Record<string, unknown>,
          summary: result.summary,
          triggeredBy: request.nextUrl.searchParams.get("triggeredBy") || "manual",
        },
      });
    } catch (saveErr) {
      console.warn("[seo-audit] Auto-save failed (table may not exist):", saveErr instanceof Error ? saveErr.message : saveErr);
    }

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[seo-audit] Failed:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { requireAdmin } = await import("@/lib/admin-middleware");
    const authError = await requireAdmin(request);
    if (authError) return authError;

    const body = await request.json().catch(() => ({}));
    const action = body.action as string;

    // ── ACTION: Run a cron job safely ──
    if (action === "run_cron") {
      const cronName = body.cron as string;
      const allowedCrons = [
        "google-indexing", "seo-agent", "content-builder", "content-auto-fix",
        "gsc-sync", "verify-indexing", "content-selector", "sweeper",
      ];
      if (!allowedCrons.includes(cronName)) {
        return NextResponse.json({ success: false, error: `Unknown cron: ${cronName}` }, { status: 400 });
      }

      const cronSecret = process.env.CRON_SECRET;
      const headers: Record<string, string> = {};
      if (cronSecret) headers["Authorization"] = `Bearer ${cronSecret}`;

      // Use request origin (same as departures board) — avoids ternary precedence bug
      const baseUrl = request.nextUrl.origin;

      try {
        const resp = await fetch(`${baseUrl}/api/cron/${cronName}`, {
          method: "POST",
          headers,
          signal: AbortSignal.timeout(55_000), // 55s timeout — leave 5s for response
        });
        const result = await resp.json().catch(() => ({ status: resp.status }));
        logManualAction(request, { action: `run-cron-${cronName}`, resource: "cron", resourceId: cronName, success: resp.ok, summary: resp.ok ? `Triggered ${cronName} successfully (${resp.status})` : `Trigger ${cronName} failed (${resp.status})`, error: !resp.ok ? `HTTP ${resp.status}` : undefined, fix: !resp.ok ? "Check cron endpoint logs." : undefined }).catch(() => {});
        return NextResponse.json({
          success: resp.ok,
          cron: cronName,
          status: resp.status,
          result: typeof result === "object" ? result : { message: String(result) },
        });
      } catch (cronErr) {
        logManualAction(request, { action: `run-cron-${cronName}`, resource: "cron", resourceId: cronName, success: false, summary: `Cron ${cronName} execution failed`, error: cronErr instanceof Error ? cronErr.message : "Cron execution failed", fix: "Check cron endpoint and network." }).catch(() => {});
        return NextResponse.json({
          success: false,
          cron: cronName,
          error: cronErr instanceof Error ? cronErr.message : "Cron execution failed",
        }, { status: 500 });
      }
    }

    // ── ACTION: Auto-fix all — chains relevant crons based on audit findings ──
    if (action === "auto_fix_all") {
      const { getDefaultSiteId } = await import("@/config/sites");
      const fixSiteId = body.siteId || getDefaultSiteId();

      // Run audit first to determine which crons to fire
      const auditResult = await runAudit(fixSiteId);
      const findingIds = new Set(auditResult.findings.map((f: AuditFinding) => f.id));

      // Map findings to cron jobs — most impactful first
      const cronQueue: Array<{ cron: string; reason: string }> = [];

      if (findingIds.has("content-no-meta-title") || findingIds.has("content-no-meta-desc") || findingIds.has("content-long-meta-title") || findingIds.has("content-long-meta-desc") || findingIds.has("links-orphan-pages") || findingIds.has("links-few-outbound")) {
        cronQueue.push({ cron: "seo-agent", reason: "Fix missing/long meta tags + inject internal links" });
      }
      if (findingIds.has("content-thin")) {
        cronQueue.push({ cron: "content-auto-fix", reason: "Expand thin articles under 1,000 words" });
      }
      if (findingIds.has("idx-never-submitted") || findingIds.has("idx-rate-high") || findingIds.has("idx-rate-critical")) {
        cronQueue.push({ cron: "google-indexing", reason: "Submit unindexed URLs to IndexNow" });
      }
      if (findingIds.has("pipeline-stuck")) {
        cronQueue.push({ cron: "sweeper", reason: "Recover stuck pipeline drafts" });
      }
      if (findingIds.has("pipeline-empty-reservoir")) {
        cronQueue.push({ cron: "content-builder", reason: "Generate new content for empty reservoir" });
      }
      if (findingIds.has("gsc-no-data")) {
        cronQueue.push({ cron: "gsc-sync", reason: "Pull missing GSC performance data" });
      }

      if (cronQueue.length === 0) {
        return NextResponse.json({ success: true, message: "No auto-fixable issues found", auditScore: auditResult.healthScore, fixesRun: 0 });
      }

      const baseUrl = request.nextUrl.origin;
      const cronSecret = process.env.CRON_SECRET;
      const headers: Record<string, string> = {};
      if (cronSecret) headers["Authorization"] = `Bearer ${cronSecret}`;

      const results: Array<{ cron: string; reason: string; success: boolean; status?: number; error?: string }> = [];
      const FIX_BUDGET_MS = 50_000;
      const fixStart = Date.now();

      // Run sequentially to stay within budget
      for (const item of cronQueue) {
        if (Date.now() - fixStart > FIX_BUDGET_MS) {
          results.push({ ...item, success: false, error: "Skipped — budget exhausted" });
          continue;
        }
        try {
          const resp = await fetch(`${baseUrl}/api/cron/${item.cron}`, {
            method: "POST",
            headers,
            signal: AbortSignal.timeout(Math.min(15_000, FIX_BUDGET_MS - (Date.now() - fixStart))),
          });
          results.push({ ...item, success: resp.ok, status: resp.status });
        } catch (err) {
          results.push({ ...item, success: false, error: err instanceof Error ? err.message : "Failed" });
        }
      }

      const fixesRun = results.filter((r) => r.success).length;
      logManualAction(request, { action: "auto-fix-all", resource: "seo-audit", siteId: fixSiteId, success: fixesRun > 0, summary: `Auto-fix: ran ${fixesRun}/${cronQueue.length} crons (audit score: ${auditResult.healthScore}, ${auditResult.totalFindings} findings)`, details: { auditScore: auditResult.healthScore, findings: auditResult.totalFindings, fixesRun, fixesTotal: cronQueue.length, results: results.map(r => ({ cron: r.cron, success: r.success, reason: r.reason })) } }).catch(() => {});
      return NextResponse.json({
        success: true,
        action: "auto_fix_all",
        auditScore: auditResult.healthScore,
        findingsCount: auditResult.totalFindings,
        fixesRun,
        fixesTotal: cronQueue.length,
        results,
      });
    }

    // ── ACTION: Save audit report ──
    if (action === "save_report") {
      const { prisma } = await import("@/lib/db");
      const { getDefaultSiteId } = await import("@/config/sites");
      const siteId = body.siteId || getDefaultSiteId();

      // Run audit and save
      const result = await runAudit(siteId);

      try {
        const saved = await prisma.seoAuditReport.create({
          data: {
            siteId,
            healthScore: result.healthScore,
            totalFindings: result.totalFindings,
            criticalCount: result.criticalCount,
            highCount: result.highCount,
            mediumCount: result.mediumCount,
            lowCount: result.lowCount,
            report: result as unknown as Record<string, unknown>,
            summary: result.summary,
            triggeredBy: body.triggeredBy || "manual",
          },
        });

        return NextResponse.json({
          success: true,
          reportId: saved.id,
          ...result,
        });
      } catch (saveErr) {
        // If table doesn't exist, still return the audit results
        console.warn("[seo-audit] Failed to save report:", saveErr instanceof Error ? saveErr.message : saveErr);
        return NextResponse.json({ success: true, saveError: "Report ran but could not be saved — run the migration first", ...result });
      }
    }

    // Default: run audit (same as GET)
    const { getDefaultSiteId } = await import("@/config/sites");
    const siteId = body.siteId || getDefaultSiteId();
    const result = await runAudit(siteId);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[seo-audit] POST failed:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
