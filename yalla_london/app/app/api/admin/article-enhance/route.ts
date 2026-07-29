/**
 * Article Enhancement API
 *
 * Inline content enhancement for the Tube Map train detail panel.
 * Supports: add_photo, add_link, add_video, add_social_embed
 *
 * All actions require admin auth + siteId validation.
 * All modifications are logged to enhancement_log.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";

export const maxDuration = 60;

// ─── Types ──────────────────────────────────────────────────────────────────

interface EnhanceRequest {
  action: "add_photo" | "add_link" | "add_video" | "add_social_embed";
  articleId: string;
  articleType: "published" | "draft";
  siteId: string;
  // add_photo
  query?: string;
  photoId?: string;
  position?: string;
  // add_link
  url?: string;
  anchorText?: string;
  rel?: string;
  // add_video / add_social_embed
  embedUrl?: string;
  platform?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] ?? c));
}

function validateUrl(raw: string): string {
  const u = new URL(raw); // throws on invalid
  if (!["http:", "https:"].includes(u.protocol)) throw new Error("Only http/https URLs allowed");
  return u.href;
}

function buildLinkHtml(url: string, anchorText: string, rel: string): string {
  const safeUrl = validateUrl(url);
  const relAttr = rel && /^[a-z\s-]+$/i.test(rel) ? ` rel="${escapeHtml(rel)}"` : "";
  return `<p><a href="${safeUrl}"${relAttr} target="_blank">${escapeHtml(anchorText)}</a></p>`;
}

function buildVideoEmbed(embedUrl: string): string {
  validateUrl(embedUrl); // throws on invalid/non-http
  // YouTube
  const ytMatch = embedUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (ytMatch) {
    return `<div class="video-embed" style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;max-width:100%;margin:1.5em 0;"><iframe src="https://www.youtube.com/embed/${ytMatch[1]}" style="position:absolute;top:0;left:0;width:100%;height:100%;" frameborder="0" allowfullscreen loading="lazy"></iframe></div>`;
  }
  // Vimeo
  const vimeoMatch = embedUrl.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return `<div class="video-embed" style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;max-width:100%;margin:1.5em 0;"><iframe src="https://player.vimeo.com/video/${vimeoMatch[1]}" style="position:absolute;top:0;left:0;width:100%;height:100%;" frameborder="0" allowfullscreen loading="lazy"></iframe></div>`;
  }
  const safeUrl = validateUrl(embedUrl);
  return `<div class="video-embed"><a href="${safeUrl}" target="_blank" rel="noopener">Watch Video</a></div>`;
}

const VALID_PLATFORMS = new Set(["twitter", "instagram", "tiktok", "facebook"]);

function buildSocialEmbed(platform: string, postUrl: string): string {
  if (!VALID_PLATFORMS.has(platform)) {
    throw new Error(`Invalid platform: ${platform}. Allowed: ${[...VALID_PLATFORMS].join(", ")}`);
  }
  const safeUrl = validateUrl(postUrl);
  switch (platform) {
    case "twitter":
      return `<blockquote class="twitter-tweet"><a href="${safeUrl}">View on Twitter/X</a></blockquote>`;
    case "instagram":
      return `<blockquote class="instagram-media" data-instgrm-permalink="${safeUrl}"><a href="${safeUrl}">View on Instagram</a></blockquote>`;
    case "tiktok":
      return `<blockquote class="tiktok-embed" cite="${safeUrl}"><a href="${safeUrl}">View on TikTok</a></blockquote>`;
    default:
      return `<div class="social-embed"><a href="${safeUrl}" target="_blank" rel="noopener">View on ${escapeHtml(platform)}</a></div>`;
  }
}

function insertAtPosition(html: string, insert: string, position: string): string {
  switch (position) {
    case "after_intro": {
      // After first </p>
      const idx = html.indexOf("</p>");
      if (idx !== -1) return html.slice(0, idx + 4) + "\n" + insert + "\n" + html.slice(idx + 4);
      return html + "\n" + insert;
    }
    case "after_first_h2": {
      // After first closing </h2> tag + next </p>
      const h2Idx = html.indexOf("</h2>");
      if (h2Idx !== -1) {
        const afterH2 = html.indexOf("</p>", h2Idx);
        if (afterH2 !== -1) return html.slice(0, afterH2 + 4) + "\n" + insert + "\n" + html.slice(afterH2 + 4);
      }
      return html + "\n" + insert;
    }
    case "before_conclusion": {
      // Before last <h2>
      const lastH2 = html.lastIndexOf("<h2");
      if (lastH2 > 0) return html.slice(0, lastH2) + insert + "\n" + html.slice(lastH2);
      return html + "\n" + insert;
    }
    case "end":
    default:
      return html + "\n" + insert;
  }
}

// ─── Enhancement log entry ─────────────────────────────────────────────────

interface EnhancementEntry {
  type: string;
  cron: string;
  timestamp: string;
  summary: string;
}

function buildLogEntry(action: string, summary: string): EnhancementEntry {
  return {
    type: action,
    cron: "manual-enhance",
    timestamp: new Date().toISOString(),
    summary,
  };
}

// ─── POST handler ──────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  let body: EnhanceRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid JSON" }, { status: 400 });
  }

  const { action, articleId, articleType, siteId } = body;

  if (!action || !articleId || !articleType || !siteId) {
    return NextResponse.json(
      { success: false, message: "Missing required fields: action, articleId, articleType, siteId" },
      { status: 400 }
    );
  }

  try {
    const { prisma } = await import("@/lib/db");

    // ─── Fetch the article content ─────────────────────────────────
    let contentEn: string | null = null;
    let existingLog: EnhancementEntry[] = [];

    if (articleType === "published") {
      const post = await prisma.blogPost.findFirst({
        where: { id: articleId, siteId },
        select: { id: true, content_en: true, enhancement_log: true, siteId: true },
      });
      if (!post) return NextResponse.json({ success: false, message: "Article not found or wrong site" }, { status: 404 });
      contentEn = post.content_en;
      existingLog = Array.isArray(post.enhancement_log) ? (post.enhancement_log as EnhancementEntry[]) : [];
    } else {
      const draft = await prisma.articleDraft.findFirst({
        where: { id: articleId, site_id: siteId },
        select: { id: true, content: true, site_id: true },
      });
      if (!draft) return NextResponse.json({ success: false, message: "Draft not found or wrong site" }, { status: 404 });
      contentEn = draft.content ?? null;
    }

    if (!contentEn) {
      return NextResponse.json({ success: false, message: "Article has no content to enhance" }, { status: 400 });
    }

    // ─── Process the enhancement action ────────────────────────────
    let updatedContent = contentEn;
    let summary = "";
    let previewHtml = "";

    switch (action) {
      case "add_photo": {
        if (!body.query && !body.photoId) {
          return NextResponse.json({ success: false, message: "Provide query or photoId for add_photo" }, { status: 400 });
        }

        // Search Unsplash
        let photoHtml = "";
        try {
          const unsplash = await import("@/lib/apis/unsplash");
          const results = await unsplash.searchPhotos(body.query || "travel", { perPage: 1 });
          if (results.length > 0) {
            const photo = results[0];
            const imgUrl = unsplash.buildImageUrl(photo.urls.raw, { width: 800, quality: 80 });
            const attribution = unsplash.buildAttribution(photo);
            const altText = photo.altDescription || body.query || "Photo";
            photoHtml = `<figure class="article-photo"><img src="${imgUrl}" alt="${altText}" loading="lazy" width="800" /><figcaption>${attribution}</figcaption></figure>`;
            await unsplash.trackDownload(photo.downloadUrl).catch(() => {});
          }
        } catch (err) {
          console.warn("[article-enhance] Unsplash error:", (err as Error).message);
          return NextResponse.json({ success: false, message: "Failed to fetch photo from Unsplash" }, { status: 502 });
        }

        if (!photoHtml) {
          return NextResponse.json({ success: false, message: "No photo found for query" }, { status: 404 });
        }

        updatedContent = insertAtPosition(contentEn, photoHtml, body.position || "after_first_h2");
        summary = `Added Unsplash photo: "${body.query}"`;
        previewHtml = photoHtml;
        break;
      }

      case "add_link": {
        if (!body.url || !body.anchorText) {
          return NextResponse.json({ success: false, message: "Provide url and anchorText for add_link" }, { status: 400 });
        }
        const linkHtml = buildLinkHtml(body.url, body.anchorText, body.rel ?? "");
        updatedContent = insertAtPosition(contentEn, linkHtml, body.position || "end");
        summary = `Added link: "${body.anchorText}" → ${body.url}`;
        previewHtml = linkHtml;
        break;
      }

      case "add_video": {
        if (!body.embedUrl) {
          return NextResponse.json({ success: false, message: "Provide embedUrl for add_video" }, { status: 400 });
        }
        const videoHtml = buildVideoEmbed(body.embedUrl);
        updatedContent = insertAtPosition(contentEn, videoHtml, body.position || "after_intro");
        summary = `Added video embed: ${body.embedUrl}`;
        previewHtml = videoHtml;
        break;
      }

      case "add_social_embed": {
        if (!body.embedUrl || !body.platform) {
          return NextResponse.json({ success: false, message: "Provide platform and embedUrl for add_social_embed" }, { status: 400 });
        }
        const socialHtml = buildSocialEmbed(body.platform, body.embedUrl);
        updatedContent = insertAtPosition(contentEn, socialHtml, body.position || "end");
        summary = `Added ${body.platform} embed`;
        previewHtml = socialHtml;
        break;
      }

      default:
        return NextResponse.json({ success: false, message: `Unknown action: ${action}` }, { status: 400 });
    }

    // ─── Save the updated content ──────────────────────────────────
    const logEntry = buildLogEntry(action, summary);

    if (articleType === "published") {
      const updatedLog = [...existingLog, logEntry].slice(-50); // cap at 50
      await prisma.blogPost.update({
        where: { id: articleId },
        data: {
          content_en: updatedContent,
          enhancement_log: updatedLog,
        },
      });
    } else {
      await prisma.articleDraft.update({
        where: { id: articleId },
        data: { content: updatedContent },
      });
    }

    return NextResponse.json({
      success: true,
      message: summary,
      previewHtml,
    });
  } catch (err) {
    console.error("[article-enhance] Error:", (err as Error).message);
    return NextResponse.json(
      { success: false, message: "Enhancement failed: " + (err as Error).message },
      { status: 500 }
    );
  }
}
