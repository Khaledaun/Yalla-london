/**
 * Pre-Publication Gate
 *
 * A safety gate that runs BEFORE content is published to verify the
 * target URL will actually work. This prevents the system from publishing
 * content to 404 routes (like Arabic content to /ar/* when no routes exist).
 *
 * This directly addresses DISCOVERY.md Gap #8: "No pre-publication gate —
 * content publishes without verifying routes work."
 */

export interface GateResult {
  allowed: boolean;
  checks: GateCheck[];
  blockers: string[];
  warnings: string[];
}

export interface GateCheck {
  name: string;
  passed: boolean;
  message: string;
  severity: "blocker" | "warning" | "info";
}

/**
 * Run all pre-publication checks for a piece of content.
 *
 * @param targetUrl - The URL where this content will be published (e.g. /blog/my-post)
 * @param content - The content being published
 * @param siteUrl - The base site URL (e.g. https://www.yalla-london.com)
 */
export async function runPrePublicationGate(
  targetUrl: string,
  content: {
    title_en?: string;
    title_ar?: string;
    meta_title_en?: string;
    meta_description_en?: string;
    content_en?: string;
    content_ar?: string;
    locale?: string;
    tags?: string[];
    seo_score?: number;
    author_id?: string;
    keywords_json?: unknown;
  },
  siteUrl?: string,
  options?: {
    /** Skip HTTP route-existence checks (checks 1 & 2) for faster bulk audits */
    skipRouteCheck?: boolean;
  },
): Promise<GateResult> {
  const checks: GateCheck[] = [];
  const blockers: string[] = [];
  const warnings: string[] = [];

  // ── Import SEO standards dynamically — single source of truth ──
  // When standards.ts is updated (e.g., after algorithm changes),
  // all enforcement thresholds in this gate update automatically.
  const { CONTENT_QUALITY, EEAT_REQUIREMENTS } = await import("@/lib/seo/standards");
  const {
    metaTitleMin,
    metaTitleOptimal,
    metaDescriptionMin,
    metaDescriptionOptimal,
    qualityGateScore,
    minWords,
    targetWords,
    thinContentThreshold,
    readabilityMax,
    minInternalLinks,
    maxH1Count,
    minH2Count,
  } = CONTENT_QUALITY;

  let baseUrl = siteUrl || process.env.NEXT_PUBLIC_SITE_URL;
  if (!baseUrl) {
    try {
      const { getSiteDomain, getDefaultSiteId } = await import("@/config/sites");
      baseUrl = getSiteDomain(getDefaultSiteId());
    } catch {
      baseUrl = "https://www.yalla-london.com";
    }
  }

  // ── 1. Route existence check ────────────────────────────────────────
  // Verify the target URL will actually resolve (not return 404)
  // Skipped during bulk audits (skipRouteCheck) to avoid slow HTTP calls
  if (!options?.skipRouteCheck) try {
    const fullUrl = targetUrl.startsWith("http")
      ? targetUrl
      : `${baseUrl}${targetUrl}`;

    // For new content, we can't check the exact URL (it doesn't exist yet).
    // Instead, check the parent route pattern.
    const parentPath = getParentRoute(targetUrl);
    if (parentPath) {
      const parentUrl = `${baseUrl}${parentPath}`;
      const res = await fetch(parentUrl, {
        method: "HEAD",
        headers: { "User-Agent": "YallaLondon-PrePubGate/1.0" },
        redirect: "manual",
        signal: AbortSignal.timeout(5000),
      });

      if (res.status === 404) {
        const check: GateCheck = {
          name: "Route Existence",
          passed: false,
          message: `Parent route ${parentPath} returns 404 — content at ${targetUrl} will be unreachable`,
          severity: "blocker",
        };
        checks.push(check);
        blockers.push(check.message);
      } else {
        checks.push({
          name: "Route Existence",
          passed: true,
          message: `Parent route ${parentPath} returns ${res.status}`,
          severity: "info",
        });
      }
    }
  } catch (e) {
    warnings.push(
      `Could not verify route existence: ${(e as Error).message}`
    );
  }

  // ── 2. Arabic route check ───────────────────────────────────────────
  // If publishing Arabic content, verify /ar/ routes work
  // Skipped during bulk audits (skipRouteCheck)
  if (!options?.skipRouteCheck && (content.locale === "ar" || targetUrl.startsWith("/ar/"))) {
    try {
      const arTestUrl = `${baseUrl}/ar`;
      const res = await fetch(arTestUrl, {
        method: "HEAD",
        headers: { "User-Agent": "YallaLondon-PrePubGate/1.0" },
        redirect: "manual",
        signal: AbortSignal.timeout(5000),
      });

      if (res.status === 404) {
        const check: GateCheck = {
          name: "Arabic Routes",
          passed: false,
          message:
            "Arabic routes (/ar/) return 404 — Arabic content will be unreachable. Fix i18n routing first.",
          severity: "blocker",
        };
        checks.push(check);
        blockers.push(check.message);
      } else {
        checks.push({
          name: "Arabic Routes",
          passed: true,
          message: "Arabic routes are accessible",
          severity: "info",
        });
      }
    } catch {
      warnings.push("Could not verify Arabic route status");
    }
  }

  // ── 3. SEO minimum requirements ────────────────────────────────────
  if (!content.title_en || content.title_en.length < 10) {
    checks.push({
      name: "Title (EN)",
      passed: false,
      message: `English title missing or too short (${content.title_en?.length || 0} chars, min 10)`,
      severity: "blocker",
    });
    blockers.push("English title is missing or too short");
  } else {
    checks.push({
      name: "Title (EN)",
      passed: true,
      message: `English title: ${content.title_en.length} chars`,
      severity: "info",
    });
  }

  // Meta title: Google displays ~60 chars. Thresholds from standards.ts.
  if (!content.meta_title_en || content.meta_title_en.length < metaTitleMin) {
    checks.push({
      name: "Meta Title",
      passed: false,
      message: `Meta title missing or too short (${content.meta_title_en?.length || 0} chars, min ${metaTitleMin}, optimal ${metaTitleOptimal.min}-${metaTitleOptimal.max})`,
      severity: "warning",
    });
    warnings.push(`Meta title should be ${metaTitleMin}-${metaTitleOptimal.max} characters for optimal SERP display`);
  } else if (content.meta_title_en.length > 160) {
    checks.push({
      name: "Meta Title (Max Length)",
      passed: false,
      message: `Meta title too long (${content.meta_title_en.length} chars, max 160). Google truncates titles beyond ~${metaTitleOptimal.max} chars in SERPs.`,
      severity: "warning",
    });
    warnings.push(`Meta title is ${content.meta_title_en.length} chars — will be truncated in search results`);
  }

  // Meta description: Google displays 120-160 chars. Thresholds from standards.ts.
  if (
    !content.meta_description_en ||
    content.meta_description_en.length < metaDescriptionMin
  ) {
    checks.push({
      name: "Meta Description",
      passed: false,
      message: `Meta description missing or too short (${content.meta_description_en?.length || 0} chars, min ${metaDescriptionMin}, optimal ${metaDescriptionOptimal.min}-${metaDescriptionOptimal.max})`,
      severity: "warning",
    });
    warnings.push(`Meta description should be ${metaDescriptionMin}-${metaDescriptionOptimal.max} characters for optimal SERP display`);
  } else if (content.meta_description_en.length > metaDescriptionOptimal.max) {
    checks.push({
      name: "Meta Description (Max Length)",
      passed: false,
      message: `Meta description too long (${content.meta_description_en.length} chars, max ${metaDescriptionOptimal.max}). Google truncates descriptions beyond ${metaDescriptionOptimal.max} chars in SERPs.`,
      severity: "warning",
    });
    warnings.push(`Meta description is ${content.meta_description_en.length} chars — will be truncated in search results`);
  }

  if (!content.content_en || content.content_en.length < thinContentThreshold) {
    checks.push({
      name: "Content Length",
      passed: false,
      message: `English content too short (${content.content_en?.length || 0} chars, min ${thinContentThreshold})`,
      severity: "blocker",
    });
    blockers.push("Content is too short for indexing");
  }

  // ── 4. SEO score check — threshold from standards.ts ───
  if (content.seo_score !== undefined && content.seo_score < qualityGateScore) {
    const seoCheck: GateCheck = {
      name: "SEO Score",
      passed: false,
      message: `SEO score ${content.seo_score} is below minimum threshold (${qualityGateScore})`,
      severity: content.seo_score < 50 ? "blocker" : "warning",
    };
    checks.push(seoCheck);
    if (content.seo_score < 50) {
      blockers.push(`SEO score critically low: ${content.seo_score}/100`);
    } else {
      warnings.push(`Low SEO score: ${content.seo_score}/100 (target: ${qualityGateScore}+)`);
    }
  }

  // ── 5. Heading hierarchy check — thresholds from standards.ts ─────
  if (content.content_en && content.content_en.length > 300) {
    const headingResult = validateHeadingHierarchy(content.content_en, maxH1Count, minH2Count);
    checks.push(headingResult.check);
    if (!headingResult.check.passed) {
      if (headingResult.check.severity === "blocker") {
        blockers.push(headingResult.check.message);
      } else {
        warnings.push(headingResult.check.message);
      }
    }
  }

  // ── 6. Word count check — thresholds from standards.ts ──
  if (content.content_en) {
    const wordCount = countWords(content.content_en);
    if (wordCount < targetWords) {
      const check: GateCheck = {
        name: "Word Count",
        passed: false,
        message: `Content has ${wordCount} words (target ${targetWords.toLocaleString()}+ for indexing quality, ${wordCount < minWords ? `below ${minWords.toLocaleString()} minimum — blocked` : "close to target"})`,
        severity: wordCount < minWords ? "blocker" : "warning",
      };
      checks.push(check);
      if (wordCount < minWords) {
        blockers.push(check.message);
      } else {
        warnings.push(check.message);
      }
    } else {
      checks.push({
        name: "Word Count",
        passed: true,
        message: `Content has ${wordCount} words (meets ${targetWords.toLocaleString()} target)`,
        severity: "info",
      });
    }
  }

  // ── 7. Internal links check — threshold from standards.ts ─────────
  if (content.content_en) {
    const internalLinkCount = await countInternalLinks(content.content_en);
    if (internalLinkCount < minInternalLinks) {
      checks.push({
        name: "Internal Links",
        passed: false,
        message: `Content has ${internalLinkCount} internal links (minimum ${minInternalLinks} required)`,
        severity: "warning",
      });
      warnings.push(`Only ${internalLinkCount} internal links (need at least ${minInternalLinks})`);
    } else {
      checks.push({
        name: "Internal Links",
        passed: true,
        message: `Content has ${internalLinkCount} internal links`,
        severity: "info",
      });
    }
  }

  // ── 8. Readability check — threshold from standards.ts ────────────
  if (content.content_en && content.content_en.length > 500) {
    const readability = estimateReadability(content.content_en);
    if (readability.gradeLevel > readabilityMax) {
      checks.push({
        name: "Readability",
        passed: false,
        message: `Reading level too high (grade ${readability.gradeLevel.toFixed(1)}, target ≤${readabilityMax}). Simplify sentences for better AI extraction.`,
        severity: "warning",
      });
      warnings.push(`High reading level: grade ${readability.gradeLevel.toFixed(1)}`);
    } else {
      checks.push({
        name: "Readability",
        passed: true,
        message: `Reading level: grade ${readability.gradeLevel.toFixed(1)} (good for AI + human readability)`,
        severity: "info",
      });
    }
  }

  // ── 9. Image alt text check ───────────────────────────────────────
  if (content.content_en) {
    const imgResult = checkImageAltText(content.content_en);
    if (imgResult.totalImages > 0 && imgResult.missingAlt > 0) {
      checks.push({
        name: "Image Alt Text",
        passed: false,
        message: `${imgResult.missingAlt}/${imgResult.totalImages} images missing alt text (accessibility + SEO)`,
        severity: "warning",
      });
      warnings.push(`${imgResult.missingAlt} images missing alt text`);
    } else if (imgResult.totalImages > 0) {
      checks.push({
        name: "Image Alt Text",
        passed: true,
        message: `All ${imgResult.totalImages} images have alt text`,
        severity: "info",
      });
    }
  }

  // ── 10. E-E-A-T: Author attribution check ────────────────────────
  // Google's 2025 Quality Rater Guidelines emphasize: author credentials,
  // first-hand experience, and trustworthiness are increasingly weighted.
  if (content.author_id) {
    checks.push({
      name: "Author Attribution",
      passed: true,
      message: "Article has author attribution (E-E-A-T signal)",
      severity: "info",
    });
  } else {
    checks.push({
      name: "Author Attribution",
      passed: false,
      message: "No author attributed — E-E-A-T requires identifiable authorship for quality content",
      severity: "warning",
    });
    warnings.push("Missing author attribution (E-E-A-T signal)");
  }

  // ── 11. Structured data presence check ──────────────────────────
  // Note: JSON-LD structured data is auto-injected at render time by the EnhancedSchemaInjector.
  // It is NOT stored in BlogPost DB records, so this check uses keywords_json as a proxy signal.
  if (content.keywords_json) {
    checks.push({
      name: "Structured Data",
      passed: true,
      message: "Article has keyword data; structured data will be auto-injected at render time",
      severity: "info",
    });
  } else {
    checks.push({
      name: "Structured Data",
      passed: false,
      message: "No structured data (JSON-LD) — reduces rich snippet and AI Overview citation eligibility",
      severity: "warning",
    });
    warnings.push("Missing structured data/keywords");
  }

  // ── 12. First-Hand Experience signals (Jan 2026 Authenticity Update) ──
  // Google's Jan 2026 Core Update heavily rewards content with first-hand experience
  // signals and demotes "second-hand knowledge" (repackaged summaries).
  if (content.content_en && content.content_en.length > 500) {
    const authenticityResult = checkAuthenticitySignals(content.content_en);
    checks.push(authenticityResult.check);
    if (!authenticityResult.check.passed) {
      warnings.push(authenticityResult.check.message);
    }
  }

  // ── 13. Affiliate/booking links check (revenue requirement) ──────
  if (content.content_en) {
    const affiliateCount = countAffiliateLinks(content.content_en);
    if (affiliateCount === 0) {
      checks.push({
        name: "Affiliate Links",
        passed: false,
        message: "No affiliate/booking links found — articles must contain monetization links for revenue generation",
        severity: "warning",
      });
      warnings.push("No affiliate/booking links found (revenue requirement)");
    } else {
      checks.push({
        name: "Affiliate Links",
        passed: true,
        message: `Found ${affiliateCount} affiliate/booking link(s)`,
        severity: "info",
      });
    }
  }

  return {
    allowed: blockers.length === 0,
    checks,
    blockers,
    warnings,
  };
}

/**
 * Validate HTML heading hierarchy for SEO and AI readability.
 * Rules (thresholds from standards.ts):
 * - Must have at most maxH1 H1 tags (default 1)
 * - Headings must not skip levels (h2 → h4 without h3)
 * - Should have at least minH2 H2s for structured content (default 2)
 */
function validateHeadingHierarchy(
  html: string,
  maxH1: number = 1,
  minH2: number = 2,
): { check: GateCheck } {
  const headingRegex = /<h([1-6])[^>]*>/gi;
  const headings: number[] = [];
  let match;
  while ((match = headingRegex.exec(html)) !== null) {
    headings.push(parseInt(match[1]));
  }

  if (headings.length === 0) {
    return {
      check: {
        name: "Heading Hierarchy",
        passed: false,
        message: "No headings found in content. Add H2/H3 headings for SEO structure and AI readability.",
        severity: "warning",
      },
    };
  }

  const h1Count = headings.filter((h) => h === 1).length;
  const h2Count = headings.filter((h) => h === 2).length;

  if (h1Count > maxH1) {
    return {
      check: {
        name: "Heading Hierarchy",
        passed: false,
        message: `Multiple H1 tags found (${h1Count}, max ${maxH1}). Only one H1 per page for SEO.`,
        severity: "warning",
      },
    };
  }

  // Check for skipped levels (e.g., h2 → h4 without h3)
  const skippedLevels: string[] = [];
  for (let i = 1; i < headings.length; i++) {
    if (headings[i] > headings[i - 1] + 1) {
      skippedLevels.push(`H${headings[i - 1]} → H${headings[i]}`);
    }
  }

  if (skippedLevels.length > 0) {
    return {
      check: {
        name: "Heading Hierarchy",
        passed: false,
        message: `Heading levels skipped: ${skippedLevels.join(", ")}. This hurts AI content extraction.`,
        severity: "warning",
      },
    };
  }

  if (h2Count < minH2) {
    return {
      check: {
        name: "Heading Hierarchy",
        passed: false,
        message: `Only ${h2Count} H2 heading(s) (need ${minH2}+). Add more H2 sections for better structure.`,
        severity: "warning",
      },
    };
  }

  return {
    check: {
      name: "Heading Hierarchy",
      passed: true,
      message: `Good heading structure: ${h2Count} H2s, ${headings.length} total headings`,
      severity: "info",
    },
  };
}

/**
 * Count words in HTML content (strips tags first).
 */
function countWords(html: string): number {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}

/**
 * Count internal links in HTML content.
 * Dynamically builds regex from configured sites — no hardcoded domains.
 */
async function countInternalLinks(html: string): Promise<number> {
  let domainPattern = "yalla-london|arabaldives|yallariviera|yallaistanbul|yallathailand";
  try {
    const { SITES } = await import("@/config/sites");
    const domains = Object.values(SITES)
      .map((s: any) => s.domain?.replace(/\./g, "\\."))
      .filter(Boolean);
    if (domains.length > 0) {
      // Match domain slugs (e.g. yalla-london) and full domains (yalla-london.com)
      const slugs = Object.keys(SITES);
      domainPattern = [...new Set([...slugs, ...domains])].join("|");
    }
  } catch {
    // Fall back to static list if config import fails
  }
  const linkRegex = new RegExp(
    `<a[^>]+href=["'](?:\\/|https?:\\/\\/(?:www\\.)?(?:${domainPattern}))[^"']*["'][^>]*>`,
    "gi"
  );
  const matches = html.match(linkRegex);
  return matches ? matches.length : 0;
}

/**
 * Simplified Flesch-Kincaid Grade Level estimation.
 * Lower grade = easier to read. Target: 8-12 for travel content.
 */
function estimateReadability(html: string): { gradeLevel: number; readingEase: number } {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 5);
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const syllables = words.reduce((sum, word) => sum + countSyllables(word), 0);

  if (sentences.length === 0 || words.length === 0) {
    return { gradeLevel: 0, readingEase: 100 };
  }

  const avgWordsPerSentence = words.length / sentences.length;
  const avgSyllablesPerWord = syllables / words.length;

  // Flesch-Kincaid Grade Level
  const gradeLevel = 0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59;
  // Flesch Reading Ease
  const readingEase = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;

  return {
    gradeLevel: Math.max(0, gradeLevel),
    readingEase: Math.max(0, Math.min(100, readingEase)),
  };
}

/**
 * Approximate syllable count for a word.
 */
function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, "");
  if (word.length <= 3) return 1;
  const vowelGroups = word.match(/[aeiouy]+/g);
  let count = vowelGroups ? vowelGroups.length : 1;
  if (word.endsWith("e") && !word.endsWith("le")) count--;
  if (word.endsWith("ed") && !word.endsWith("ted") && !word.endsWith("ded")) count--;
  return Math.max(1, count);
}

/**
 * Check for images missing alt text.
 */
function checkImageAltText(html: string): { totalImages: number; missingAlt: number } {
  const imgRegex = /<img[^>]*>/gi;
  const images = html.match(imgRegex) || [];
  let missingAlt = 0;
  for (const img of images) {
    if (!img.includes("alt=") || /alt=["']\s*["']/.test(img)) {
      missingAlt++;
    }
  }
  return { totalImages: images.length, missingAlt };
}

/**
 * Check for first-hand experience and authenticity signals in content.
 *
 * Google's January 2026 "Authenticity Update" heavily rewards content demonstrating
 * lived experience and demotes "second-hand knowledge." This check looks for
 * experience markers that signal genuine expertise.
 */
function checkAuthenticitySignals(html: string): { check: GateCheck } {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().toLowerCase();

  // Experience signals — phrases that indicate first-hand knowledge
  const experienceSignals = [
    // Sensory/experiential language
    /\b(we (?:visited|tried|tasted|explored|walked|stayed|experienced|discovered|found))\b/,
    /\b(i (?:visited|tried|tasted|explored|walked|stayed|experienced|discovered|found|recommend))\b/,
    /\b(when (?:we|you|i) (?:arrive|visit|walk|enter|step))\b/,
    // Specific details that indicate real visits
    /\b(insider tip|local tip|pro tip|editor'?s? (?:pick|note)|our (?:pick|recommendation|favorite))\b/,
    /\b(what (?:we|most guides|many tourists) (?:don'?t|didn'?t))\b/,
    /\b(in (?:my|our) experience)\b/,
    /\b(first[- ]hand|personally)\b/,
    // Temporal/seasonal signals
    /\b(when we last visited|on our (?:last|recent) visit|during (?:my|our) (?:stay|visit|trip))\b/,
    /\b(last time (?:we|i) (?:were|was) there)\b/,
    // Specific observations
    /\b(the (?:atmosphere|ambiance|view|decor|service) (?:was|is|feels?))\b/,
    /\b(don'?t miss|make sure (?:to|you)|be sure to|ask for)\b/,
    /\b(hidden gem|best[- ]kept secret|locals? (?:know|love|recommend|secret))\b/,
  ];

  let signalCount = 0;
  for (const pattern of experienceSignals) {
    if (pattern.test(text)) {
      signalCount++;
    }
  }

  // AI-generic phrases that indicate lack of authenticity (negative signals)
  const genericPhrases = [
    /\bin today'?s (?:world|age|fast[- ]paced)\b/,
    /\bit'?s worth noting that\b/,
    /\bwhether you'?re a .+ or a\b/,
    /\bin conclusion,?\s/,
    /\blook no further\b/,
    /\bwithout further ado\b/,
    /\bin this (?:comprehensive|ultimate|definitive) (?:guide|article)\b/,
  ];

  let genericCount = 0;
  for (const pattern of genericPhrases) {
    if (pattern.test(text)) {
      genericCount++;
    }
  }

  // Scoring: need at least 3 experience signals and fewer generic phrases
  if (signalCount >= 3 && genericCount <= 1) {
    return {
      check: {
        name: "Authenticity Signals",
        passed: true,
        message: `Good authenticity: ${signalCount} experience signals found, ${genericCount} generic phrases (Jan 2026 Authenticity Update compliant)`,
        severity: "info",
      },
    };
  }

  if (signalCount < 2) {
    return {
      check: {
        name: "Authenticity Signals",
        passed: false,
        message: `Low authenticity: only ${signalCount} first-hand experience signals found (need 3+). Add sensory details, personal observations, and insider tips. Google's Jan 2026 update demotes "second-hand knowledge."`,
        severity: "warning",
      },
    };
  }

  return {
    check: {
      name: "Authenticity Signals",
      passed: false,
      message: `Moderate authenticity: ${signalCount} experience signals but ${genericCount} AI-generic phrases detected. Replace generic filler with specific, experiential language.`,
      severity: "warning",
    },
  };
}

/**
 * Count affiliate/booking links in content.
 * Checks for known affiliate domains and booking platforms.
 */
function countAffiliateLinks(html: string): number {
  const affiliatePatterns = [
    /booking\.com/gi,
    /halalbooking\.com/gi,
    /agoda\.com/gi,
    /getyourguide\.com/gi,
    /viator\.com/gi,
    /klook\.com/gi,
    /boatbookings\.com/gi,
    /thefork\.com/gi,
    /tripadvisor\.com/gi,
    /expedia\.com/gi,
    /hotels\.com/gi,
    /airbnb\.com/gi,
    /skyscanner\.com/gi,
    /kayak\.com/gi,
  ];

  let count = 0;
  for (const pattern of affiliatePatterns) {
    const matches = html.match(pattern);
    if (matches) count += matches.length;
  }
  return count;
}

/**
 * Extract the parent route from a target URL.
 * e.g. /blog/my-post → /blog
 * e.g. /ar/blog/my-post → /ar/blog
 * e.g. /blog/category/restaurants → /blog
 */
function getParentRoute(url: string): string | null {
  const segments = url.split("/").filter(Boolean);
  if (segments.length <= 1) return null;
  return "/" + segments.slice(0, -1).join("/");
}
