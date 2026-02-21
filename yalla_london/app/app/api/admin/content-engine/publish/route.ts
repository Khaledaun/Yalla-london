export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";

/**
 * Content Engine — Publish Pipeline
 *
 * POST — Create actual DB records from scripter output
 * Body: {
 *   pipelineId,
 *   items: { socialPosts?: boolean, article?: boolean, email?: boolean, videos?: boolean }
 * }
 */

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");
    const { getDefaultSiteId } = await import("@/config/sites");

    const body = await request.json();
    const { pipelineId, items } = body as {
      pipelineId: string;
      items?: {
        socialPosts?: boolean;
        article?: boolean;
        email?: boolean;
        videos?: boolean;
      };
    };

    if (!pipelineId) {
      return NextResponse.json(
        { error: "pipelineId is required" },
        { status: 400 },
      );
    }

    const pipeline = await prisma.contentPipeline.findUnique({
      where: { id: pipelineId },
    });

    if (!pipeline) {
      return NextResponse.json(
        { error: "Pipeline not found" },
        { status: 404 },
      );
    }

    if (!pipeline.scripts) {
      return NextResponse.json(
        { error: "Pipeline has no scripts. Run the scripter first." },
        { status: 400 },
      );
    }

    const siteId = pipeline.site || getDefaultSiteId();
    const created: {
      socialPostIds: string[];
      articleId: string | null;
      emailId: string | null;
      videoIds: string[];
    } = {
      socialPostIds: [],
      articleId: null,
      emailId: null,
      videoIds: [],
    };

    const scriptsData = pipeline.scripts as Record<string, unknown>;

    // ── Article ──
    if (items?.article && scriptsData.article) {
      try {
        const articleScript = scriptsData.article as Record<string, string>;

        // Find or create a default category
        let categoryId: string;
        const existingCategory = await prisma.category.findFirst({
          where: { slug: "general" },
        });
        if (existingCategory) {
          categoryId = existingCategory.id;
        } else {
          const newCat = await prisma.category.create({
            data: {
              name_en: "General",
              name_ar: "عام",
              slug: "general",
            },
          });
          categoryId = newCat.id;
        }

        // Find or create a system author
        let authorId: string;
        const systemUser = await prisma.user.findFirst({
          where: { email: "system@zenitha.luxury" },
        });
        if (systemUser) {
          authorId = systemUser.id;
        } else {
          const newUser = await prisma.user.create({
            data: {
              email: "system@zenitha.luxury",
              name: "Content Engine",
              role: "admin",
            },
          });
          authorId = newUser.id;
        }

        const slug =
          (articleScript.slug ||
            (articleScript.title || pipeline.topic || "untitled")
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/(^-|-$)/g, "")) +
          `-${Date.now().toString(36)}`;

        const blogPost = await prisma.blogPost.create({
          data: {
            title_en: articleScript.title || pipeline.topic || "Untitled",
            title_ar: articleScript.title_ar || "",
            slug,
            content_en: articleScript.content || articleScript.body || "",
            content_ar: articleScript.content_ar || "",
            excerpt_en: articleScript.excerpt || "",
            excerpt_ar: articleScript.excerpt_ar || "",
            meta_title_en: articleScript.metaTitle || articleScript.title || "",
            meta_description_en: articleScript.metaDescription || "",
            siteId,
            category_id: categoryId,
            author_id: authorId,
            published: false, // Draft — requires manual review before publishing
          },
        });

        created.articleId = blogPost.id;
      } catch (err) {
        console.warn("[content-engine/publish] Article creation failed:", err);
      }
    }

    // ── Social Posts ──
    if (items?.socialPosts && scriptsData.socialPosts) {
      try {
        const posts = Array.isArray(scriptsData.socialPosts)
          ? (scriptsData.socialPosts as Array<Record<string, string>>)
          : [];

        for (const post of posts) {
          const sc = await prisma.scheduledContent.create({
            data: {
              title: post.title || post.platform || "Social Post",
              content_type: "social_post",
              content: post.body || post.text || post.content || "",
              language: "en",
              scheduled_time: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
              status: "draft",
              platform: post.platform || "twitter",
              category: post.platform || "social",
              tags: post.hashtags ? [post.hashtags] : [],
              site_id: siteId,
            },
          });
          created.socialPostIds.push(sc.id);
        }
      } catch (err) {
        console.warn("[content-engine/publish] Social post creation failed:", err);
      }
    }

    // ── Email ──
    if (items?.email && scriptsData.email) {
      try {
        const emailScript = scriptsData.email as Record<string, string>;
        const sc = await prisma.scheduledContent.create({
          data: {
            title: emailScript.subject || "Newsletter",
            content_type: "email",
            content: emailScript.body || emailScript.content || "",
            language: "en",
            scheduled_time: new Date(Date.now() + 24 * 60 * 60 * 1000),
            status: "draft",
            category: "email",
            tags: [],
            site_id: siteId,
          },
        });
        created.emailId = sc.id;
      } catch (err) {
        console.warn("[content-engine/publish] Email creation failed:", err);
      }
    }

    // ── Videos (metadata only) ──
    if (items?.videos && scriptsData.videos) {
      try {
        const videos = Array.isArray(scriptsData.videos)
          ? (scriptsData.videos as Array<Record<string, string>>)
          : [];

        for (const video of videos) {
          const sc = await prisma.scheduledContent.create({
            data: {
              title: video.title || "Video",
              content_type: "video",
              content: JSON.stringify({
                script: video.script || video.body || "",
                platform: video.platform || "youtube",
                duration: video.duration || "",
              }),
              language: "en",
              scheduled_time: new Date(Date.now() + 48 * 60 * 60 * 1000),
              status: "draft",
              platform: video.platform || "youtube",
              category: "video",
              tags: [],
              site_id: siteId,
            },
          });
          created.videoIds.push(sc.id);
        }
      } catch (err) {
        console.warn("[content-engine/publish] Video creation failed:", err);
      }
    }

    // Update pipeline with generated IDs
    await prisma.contentPipeline.update({
      where: { id: pipelineId },
      data: {
        generatedArticleId: created.articleId,
        generatedEmailId: created.emailId,
        generatedPosts: created.socialPostIds.length > 0
          ? (created.socialPostIds.map((id) => ({ scheduledContentId: id })) as any)
          : undefined,
        generatedVideoIds: created.videoIds.length > 0
          ? (created.videoIds as any)
          : undefined,
        status: "complete",
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        pipelineId,
        created,
        summary: {
          articles: created.articleId ? 1 : 0,
          socialPosts: created.socialPostIds.length,
          emails: created.emailId ? 1 : 0,
          videos: created.videoIds.length,
        },
      },
    });
  } catch (error) {
    console.error("[content-engine/publish] POST error:", error);
    return NextResponse.json(
      { error: "Publish pipeline failed" },
      { status: 500 },
    );
  }
}
