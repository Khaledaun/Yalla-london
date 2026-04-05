/**
 * Video-to-Article Matching Engine
 *
 * Matches VideoAsset records to BlogPost articles based on tag overlap.
 * Used by:
 * 1. Social media scheduler — picks videos for article promotion posts
 * 2. Admin cockpit — shows "suggested videos" per article
 * 3. Content pipeline — auto-attaches videos when articles are published
 */

import { TAG_TAXONOMY, LOCATION_TO_SITE, type SiteAffinityTag } from "./asset-registry";

// ============================================================
// MATCHING ALGORITHM
// ============================================================

interface ArticleSignals {
  id: string;
  titleEn: string;
  categoryId?: string | null;
  siteId: string;
  tags: string[];
  contentSnippet?: string; // First 500 chars of content_en
}

interface VideoSignals {
  id: string;
  assetCode: string;
  locationTags: string[];
  sceneTags: string[];
  moodTags: string[];
  seasonTags: string[];
  siteId: string | null;
  authenticity: string;
  usageCount: number;
  status: string;
}

interface MatchResult {
  videoId: string;
  assetCode: string;
  score: number;
  reasons: string[];
}

/**
 * Scores how well a video matches an article.
 * Returns 0-100 score + human-readable reasons.
 */
export function scoreVideoArticleMatch(
  video: VideoSignals,
  article: ArticleSignals
): MatchResult {
  let score = 0;
  const reasons: string[] = [];
  const titleLower = article.titleEn.toLowerCase();
  const contentLower = (article.contentSnippet || "").toLowerCase();
  const combinedText = `${titleLower} ${contentLower} ${article.tags.join(" ").toLowerCase()}`;

  // ---- SITE AFFINITY (0-25 points) ----
  if (video.siteId === null || video.siteId === article.siteId) {
    score += 15;
    reasons.push("Site compatible");
  } else {
    // Wrong site — heavy penalty
    return { videoId: video.id, assetCode: video.assetCode, score: 0, reasons: ["Wrong site"] };
  }

  // Bonus for site-specific video (not generic)
  if (video.siteId === article.siteId) {
    score += 10;
    reasons.push("Site-specific match");
  }

  // ---- LOCATION OVERLAP (0-25 points) ----
  for (const loc of video.locationTags) {
    if (combinedText.includes(loc.replace("-", " "))) {
      score += 15;
      reasons.push(`Location: ${loc}`);
      break; // Max one location bonus
    }
    // Check if location maps to the article's site
    const sitesForLoc = LOCATION_TO_SITE[loc] || [];
    if (sitesForLoc.includes(article.siteId as SiteAffinityTag)) {
      score += 10;
      reasons.push(`Location→site: ${loc}`);
      break;
    }
  }

  // ---- SCENE OVERLAP (0-20 points) ----
  let sceneMatches = 0;
  for (const scene of video.sceneTags) {
    if (combinedText.includes(scene.replace("-", " "))) {
      sceneMatches++;
    }
  }
  if (sceneMatches >= 2) {
    score += 20;
    reasons.push(`${sceneMatches} scene matches`);
  } else if (sceneMatches === 1) {
    score += 10;
    reasons.push("1 scene match");
  }

  // ---- MOOD OVERLAP (0-10 points) ----
  for (const mood of video.moodTags) {
    if (combinedText.includes(mood)) {
      score += 10;
      reasons.push(`Mood: ${mood}`);
      break;
    }
  }

  // ---- AUTHENTICITY BONUS (0-15 points) ----
  if (video.authenticity === "self-captured") {
    score += 15;
    reasons.push("Self-captured (E-E-A-T boost)");
  } else if (video.authenticity === "branded") {
    score += 5;
    reasons.push("Branded content");
  }

  // ---- FRESHNESS PENALTY (0 to -10 points) ----
  if (video.usageCount > 5) {
    score -= 10;
    reasons.push(`Overused (${video.usageCount}x)`);
  } else if (video.usageCount > 2) {
    score -= 5;
    reasons.push(`Used ${video.usageCount}x`);
  }

  // Cap at 100
  score = Math.min(100, Math.max(0, score));

  return {
    videoId: video.id,
    assetCode: video.assetCode,
    score,
    reasons,
  };
}

/**
 * Finds the best N videos for a given article.
 */
export function findBestVideosForArticle(
  videos: VideoSignals[],
  article: ArticleSignals,
  limit = 5
): MatchResult[] {
  const results = videos
    .filter(v => v.status !== "retired")
    .map(v => scoreVideoArticleMatch(v, article))
    .filter(r => r.score >= 20) // Minimum relevance threshold
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return results;
}

/**
 * Finds articles that match a given video (reverse lookup).
 * Useful for "Where should I use this video?" in admin.
 */
export function findArticlesForVideo(
  video: VideoSignals,
  articles: ArticleSignals[],
  limit = 10
): Array<{ articleId: string; title: string; score: number; reasons: string[] }> {
  return articles
    .map(article => {
      const match = scoreVideoArticleMatch(video, article);
      return {
        articleId: article.id,
        title: article.titleEn,
        score: match.score,
        reasons: match.reasons,
      };
    })
    .filter(r => r.score >= 20)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// ============================================================
// KEYWORD EXTRACTION (from article content for tag matching)
// ============================================================

/** Extracts location keywords from article text for tag matching */
export function extractLocationKeywords(text: string): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];

  for (const location of TAG_TAXONOMY.location) {
    const searchTerm = location.replace("-", " ");
    if (lower.includes(searchTerm)) {
      found.push(location);
    }
  }

  return found;
}

/** Extracts scene keywords from article text */
export function extractSceneKeywords(text: string): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];

  for (const scene of TAG_TAXONOMY.scene) {
    const searchTerm = scene.replace("-", " ");
    if (lower.includes(searchTerm)) {
      found.push(scene);
    }
  }

  return found;
}
