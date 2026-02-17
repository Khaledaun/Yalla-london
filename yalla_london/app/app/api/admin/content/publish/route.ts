export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Phase 4C Content Publishing API
 * Enhanced publishing with automatic backlink inspection trigger
 */
import { NextRequest, NextResponse } from "next/server";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { backgroundJobService } from "@/lib/background-jobs";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-middleware";

// Zod schemas for validation
const PublishContentSchema = z.object({
  content_id: z.string(),
  content_type: z.enum(["blog_post", "scheduled_content"]),
  publish_immediately: z.boolean().default(true),
  schedule_time: z.string().datetime().optional(),
  trigger_backlink_analysis: z.boolean().default(true),
  seo_audit_required: z.boolean().default(true),
  notify_subscribers: z.boolean().default(false),
});

// POST - Publish content with enhanced workflow
export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    // Permission check
    const permissionCheck = await requirePermission(request, "publish_content");
    if (permissionCheck instanceof NextResponse) {
      return permissionCheck;
    }

    const body = await request.json();

    // Validate input
    const validation = PublishContentSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.error.issues,
        },
        { status: 400 },
      );
    }

    const {
      content_id,
      content_type,
      publish_immediately,
      schedule_time,
      trigger_backlink_analysis,
      seo_audit_required,
      notify_subscribers,
    } = validation.data;

    // Get content details
    let content = null;
    let publishUrl = "";

    if (content_type === "blog_post") {
      content = await prisma.blogPost.findUnique({
        where: { id: content_id },
        include: {
          category: true,
          author: true,
          place: true,
        },
      });

      if (!content) {
        return NextResponse.json(
          { error: "Blog post not found" },
          { status: 404 },
        );
      }

      publishUrl = `${process.env.NEXTAUTH_URL || "https://yalla-london.com"}/blog/${content.slug}`;

      // PRE-PUBLISH QUALITY GATES
      const qualityIssues: string[] = [];

      // Gate 1: Minimum word count (300 words EN, 200 words AR)
      const enWordCount = (content.content_en || "")
        .split(/\s+/)
        .filter(Boolean).length;
      const arWordCount = (content.content_ar || "")
        .split(/\s+/)
        .filter(Boolean).length;
      if (enWordCount < 300) {
        qualityIssues.push(
          `English content too short: ${enWordCount} words (min 300)`,
        );
      }
      if (content.content_ar && arWordCount < 200) {
        qualityIssues.push(
          `Arabic content too short: ${arWordCount} words (min 200)`,
        );
      }

      // Gate 2: Required fields for SEO
      if (!content.meta_description_en && !content.excerpt_en) {
        qualityIssues.push("Missing meta description or excerpt (EN)");
      }
      if (!content.featured_image) {
        qualityIssues.push("Missing featured image");
      }
      if (!content.category) {
        qualityIssues.push("No category assigned");
      }

      // Gate 3: Minimum SEO score threshold
      const minSeoScore = parseInt(process.env.MIN_PUBLISH_SEO_SCORE || "40");
      if (content.seo_score !== null && content.seo_score < minSeoScore) {
        qualityIssues.push(
          `SEO score ${content.seo_score} below minimum ${minSeoScore}`,
        );
      }

      // Gate 4: Title length check
      if (content.title_en && content.title_en.length < 20) {
        qualityIssues.push(
          `Title too short: ${content.title_en.length} chars (min 20)`,
        );
      }
      if (content.title_en && content.title_en.length > 70) {
        qualityIssues.push(
          `Title too long: ${content.title_en.length} chars (max 70)`,
        );
      }

      // Block publish if quality issues found
      if (qualityIssues.length > 0) {
        return NextResponse.json(
          {
            error: "Content failed quality gates",
            quality_issues: qualityIssues,
            action: "fix_and_retry",
            content_id,
          },
          { status: 422 },
        );
      }

      // Update blog post status
      if (publish_immediately) {
        await prisma.blogPost.update({
          where: { id: content_id },
          data: {
            published: true,
            updated_at: new Date(),
          },
        });
      }
    } else if (content_type === "scheduled_content") {
      content = await prisma.scheduledContent.findUnique({
        where: { id: content_id },
      });

      if (!content) {
        return NextResponse.json(
          { error: "Scheduled content not found" },
          { status: 404 },
        );
      }

      publishUrl = `${process.env.NEXTAUTH_URL || "https://yalla-london.com"}/content/${content.id}`;

      // Update scheduled content status
      const updateData: any = {
        updated_at: new Date(),
      };

      if (publish_immediately) {
        updateData.status = "published";
        updateData.published = true;
        updateData.published_time = new Date();
      } else if (schedule_time) {
        updateData.scheduled_time = new Date(schedule_time);
        updateData.status = "pending";
      }

      await prisma.scheduledContent.update({
        where: { id: content_id },
        data: updateData,
      });
    }

    const publishResult: any = {
      content_id,
      content_type,
      published: publish_immediately,
      publish_url: publishUrl,
      scheduled_for: schedule_time || null,
      timestamp: new Date(),
    };

    // Trigger backlink analysis if enabled and feature flag is on
    if (
      trigger_backlink_analysis &&
      isFeatureEnabled("FEATURE_BACKLINK_INSPECTOR") &&
      publish_immediately
    ) {
      try {
        await backgroundJobService.executeJob("backlink_inspector", {
          content_id,
          content_type,
          url: publishUrl,
          triggered_by: "publish_workflow",
        });

        publishResult.backlink_analysis = "triggered";
      } catch (error) {
        console.error("Failed to trigger backlink analysis:", error);
        publishResult.backlink_analysis = "failed";
        publishResult.backlink_error =
          error instanceof Error ? error.message : "Unknown error";
      }
    }

    // Trigger SEO audit if required
    if (seo_audit_required && publish_immediately) {
      try {
        // Check if recent audit exists
        const recentAudit = await prisma.seoAuditResult.findFirst({
          where: {
            content_id,
            content_type,
            created_at: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
        });

        if (!recentAudit) {
          // Perform real content-based SEO audit
          const auditBreakdown = computeSeoAudit(content, content_type);
          const auditScore = Math.round(
            auditBreakdown.title_optimization * 0.15 +
            auditBreakdown.meta_description * 0.15 +
            auditBreakdown.content_quality * 0.25 +
            auditBreakdown.keyword_optimization * 0.15 +
            auditBreakdown.technical_seo * 0.15 +
            auditBreakdown.user_experience * 0.15
          );

          const suggestions: string[] = [];
          const quickFixes: string[] = [];

          if (auditBreakdown.title_optimization < 70) {
            suggestions.push("Optimize title length to 50-60 characters for best CTR");
          }
          if (auditBreakdown.meta_description < 70) {
            quickFixes.push("Add or improve meta description (120-155 characters)");
          }
          if (auditBreakdown.content_quality < 70) {
            suggestions.push("Increase content depth with more sections and detail (aim for 800+ words)");
          }
          if (auditBreakdown.keyword_optimization < 70) {
            suggestions.push("Add more relevant keywords and long-tail phrases in headings and body");
          }
          if (!content?.featured_image) {
            quickFixes.push("Add a featured image with descriptive alt text");
          }
          if (auditBreakdown.technical_seo < 80) {
            suggestions.push("Add structured data markup and internal links");
          }
          if (suggestions.length === 0) {
            suggestions.push("Content meets SEO best practices - consider adding internal links for further improvement");
          }

          await prisma.seoAuditResult.create({
            data: {
              content_id,
              content_type,
              score: auditScore,
              breakdown_json: auditBreakdown,
              suggestions,
              quick_fixes: quickFixes,
              audit_version: "4C.2",
            },
          });

          publishResult.seo_audit = "completed";
          publishResult.seo_score = auditScore;
        } else {
          publishResult.seo_audit = "recent_audit_exists";
          publishResult.seo_score = recentAudit.score;
        }
      } catch (error) {
        console.error("Failed to run SEO audit:", error);
        publishResult.seo_audit = "failed";
      }
    }

    // Notify subscribers if enabled and CRM feature is on
    if (
      notify_subscribers &&
      isFeatureEnabled("FEATURE_CRM_MINIMAL") &&
      publish_immediately
    ) {
      try {
        // Get confirmed subscribers
        const subscribers = await prisma.subscriber.findMany({
          where: {
            status: "CONFIRMED",
            preferences_json: {
              path: ["topics"],
              array_contains: content?.category?.name_en || "general",
            },
          },
          select: { id: true, email: true },
        });

        // Queue notification emails for confirmed subscribers
        if (subscribers.length > 0) {
          const contentTitle = content_type === "blog_post"
            ? (content as any)?.title_en || "New content"
            : (content as any)?.title || "New content";
          const contentUrl = publishUrl;

          // Create a background job to send notifications asynchronously
          try {
            await prisma.backgroundJob.create({
              data: {
                job_name: "subscriber_notification",
                job_type: "triggered",
                parameters_json: {
                  subscriber_ids: subscribers.map((s: any) => s.id),
                  content_title: contentTitle,
                  content_url: contentUrl,
                  content_type,
                  content_id,
                  subscriber_count: subscribers.length,
                },
                status: "pending",
                max_retries: 3,
              },
            });
          } catch (jobError) {
            console.error("Failed to create notification job:", jobError);
          }
        }

        publishResult.subscriber_notification = {
          sent: subscribers.length,
          status: subscribers.length > 0 ? "queued" : "no_subscribers",
        };
      } catch (error) {
        console.error("Failed to notify subscribers:", error);
        publishResult.subscriber_notification = "failed";
      }
    }

    // Log the publishing action
    await prisma.auditLog.create({
      data: {
        userId: permissionCheck.user.id,
        action: "publish_content",
        resource: content_type,
        resourceId: content_id,
        details: {
          url: publishUrl,
          immediate: publish_immediately,
          scheduled_for: schedule_time,
          backlink_analysis: trigger_backlink_analysis,
          seo_audit: seo_audit_required,
        },
        success: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: publish_immediately
          ? "Content published successfully"
          : "Content scheduled for publishing",
        data: publishResult,
      },
      { status: publish_immediately ? 200 : 201 },
    );
  } catch (error) {
    console.error("Content publishing error:", error);
    return NextResponse.json(
      {
        error: "Failed to publish content",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * Compute a real SEO audit score based on actual content analysis.
 * Replaces the previous random score generation (70-95) with deterministic,
 * content-based scoring across 6 dimensions.
 */
function computeSeoAudit(content: any, contentType: string) {
  let titleScore = 0;
  let metaScore = 0;
  let contentScore = 0;
  let keywordScore = 0;
  let technicalScore = 0;
  let uxScore = 0;

  if (contentType === "blog_post") {
    // Title optimization (0-100)
    const title = content?.title_en || "";
    if (title.length >= 30 && title.length <= 60) titleScore = 100;
    else if (title.length >= 20 && title.length <= 70) titleScore = 75;
    else if (title.length > 0) titleScore = 40;

    // Meta description (0-100)
    const metaDesc = content?.meta_description_en || content?.excerpt_en || "";
    if (metaDesc.length >= 120 && metaDesc.length <= 160) metaScore = 100;
    else if (metaDesc.length >= 80 && metaDesc.length <= 200) metaScore = 70;
    else if (metaDesc.length > 0) metaScore = 40;
    else metaScore = 0;

    // Content quality (0-100) - based on word count, headings, paragraphs
    const bodyContent = content?.content_en || "";
    const wordCount = bodyContent.split(/\s+/).filter(Boolean).length;
    const hasHeadings = /<h[2-4]/i.test(bodyContent) || /#{2,4}\s/.test(bodyContent);
    const paragraphCount = (bodyContent.match(/<p[\s>]/gi) || bodyContent.split(/\n\n+/)).length;

    if (wordCount >= 1200) contentScore += 40;
    else if (wordCount >= 800) contentScore += 30;
    else if (wordCount >= 300) contentScore += 20;
    else contentScore += 5;

    if (hasHeadings) contentScore += 30;
    else contentScore += 5;

    if (paragraphCount >= 5) contentScore += 30;
    else if (paragraphCount >= 3) contentScore += 20;
    else contentScore += 10;

    // Keyword optimization (0-100) - tags, keywords JSON, long-tail presence
    const tags = content?.tags || [];
    const keywordsJson = content?.keywords_json || [];
    const featuredLongtails = content?.featured_longtails_json || [];

    if (tags.length >= 5) keywordScore += 35;
    else if (tags.length >= 3) keywordScore += 25;
    else if (tags.length > 0) keywordScore += 10;

    if (keywordsJson.length >= 3) keywordScore += 35;
    else if (keywordsJson.length > 0) keywordScore += 15;

    if (featuredLongtails.length >= 2) keywordScore += 30;
    else if (featuredLongtails.length > 0) keywordScore += 15;

    // Technical SEO (0-100) - featured image, slug, category, schema
    if (content?.featured_image) technicalScore += 25;
    if (content?.slug && content.slug.length > 0) technicalScore += 25;
    if (content?.category) technicalScore += 25;
    if (content?.authority_links_json && (content.authority_links_json as any[]).length > 0) technicalScore += 25;
    else technicalScore += 10; // Base score

    // User experience (0-100) - readability, AR support, excerpt
    if (content?.excerpt_en && content.excerpt_en.length >= 50) uxScore += 25;
    if (content?.content_ar && content.content_ar.length > 50) uxScore += 25;
    if (content?.title_ar && content.title_ar.length > 0) uxScore += 25;
    if (wordCount >= 300 && wordCount <= 2500) uxScore += 25;
    else if (wordCount > 0) uxScore += 10;
  } else {
    // Scheduled content or other types - basic scoring
    titleScore = content?.title ? 60 : 0;
    metaScore = content?.metadata?.metaDescription ? 60 : 0;
    contentScore = content?.content ? 60 : 0;
    keywordScore = (content?.tags?.length || 0) >= 3 ? 60 : 30;
    technicalScore = 50;
    uxScore = 50;
  }

  return {
    title_optimization: Math.min(100, titleScore),
    meta_description: Math.min(100, metaScore),
    content_quality: Math.min(100, contentScore),
    keyword_optimization: Math.min(100, keywordScore),
    technical_seo: Math.min(100, technicalScore),
    user_experience: Math.min(100, uxScore),
  };
}
