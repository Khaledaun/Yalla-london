/**
 * Title & Meta Description Sanitizer
 *
 * Strips AI-generated artifacts from titles and meta descriptions before
 * they reach the database or public pages. Catches patterns like:
 *   - "(under 60 chars)" / "(53 chars)" / "(120-160 characters)"
 *   - "SEO-optimized" / "including keyword" instruction echoes
 *   - Trailing years that cause staleness ("Best Hotels 2026")
 *   - "- Under XX Chars" suffixes
 *
 * Called by: select-runner.ts (before BlogPost.create),
 *           content-auto-fix-lite (DB cleanup, step 6),
 *           daily-content-generate (before BlogPost.create),
 *           bulk-generate (before BlogPost.create),
 *           simple-write (before BlogPost.create),
 *           editor/save (before BlogPost.update)
 */

// Patterns that AI echoes from prompt templates
// NOTE: Use /i only (not /gi) for patterns used with .test() — the /g flag
// makes .test() stateful (remembers lastIndex), causing alternating true/false
// results when called in a loop. Only use /g on patterns passed to .replace().
const CHAR_COUNT_PATTERN = /\s*\((?:under\s+)?\d+(?:\s*[-–]\s*\d+)?\s*(?:chars?|characters?)\)/i;
const CHAR_COUNT_PATTERN_G = /\s*\((?:under\s+)?\d+(?:\s*[-–]\s*\d+)?\s*(?:chars?|characters?)\)/gi;
const CHAR_SUFFIX_PATTERN = /\s*[-–]\s*(?:under\s+)?\d+\s*chars?$/i;
const INSTRUCTION_ECHOES = [
  /\bSEO[- ]optimized\b/i,
  /\bincluding keyword\b/i,
  /\bwith keyword and CTA\b/i,
  /\bMeta description\s+\d+[-–]\d+\s*chars?\b/i,
  /\bSEO title\b/i,
  /^Top Alternatives:\s*/i,
  /\s*[—–-]\s*Complete Comparison Guide$/i,
];
const INSTRUCTION_ECHOES_G = [
  /\bSEO[- ]optimized\b/gi,
  /\bincluding keyword\b/gi,
  /\bwith keyword and CTA\b/gi,
  /\bMeta description\s+\d+[-–]\d+\s*chars?\b/gi,
  /\bSEO title\b/gi,
  /^Top Alternatives:\s*/gi,
  /\s*[—–-]\s*Complete Comparison Guide$/gi,
];

// Trailing year at end of title: " 2024", " 2025", " 2026", etc.
// Only strips if year is the LAST word (preserves "Ramadan Timetable 2026 London")
const TRAILING_YEAR = /\s+20[2-3]\d$/;

/**
 * Sanitize an article title — strip AI artifacts, enforce max length.
 *
 * Does NOT strip years from mid-title positions (e.g., "Ramadan 2026 Timetable"
 * is preserved). Only strips trailing years that signal evergreen-intent but
 * accidentally include the generation year.
 */
export function sanitizeTitle(title: string): string {
  if (!title) return title;

  let cleaned = title;

  // Strip character count patterns: "(under 60 chars)", "(53 chars)", etc.
  cleaned = cleaned.replace(CHAR_COUNT_PATTERN_G, "");

  // Strip suffix patterns: "- Under 60 Chars"
  cleaned = cleaned.replace(CHAR_SUFFIX_PATTERN, "");

  // Strip AI instruction echoes (use /g versions for .replace())
  for (const pattern of INSTRUCTION_ECHOES_G) {
    cleaned = cleaned.replace(pattern, "");
  }

  // Strip trailing year (only at end of title)
  cleaned = cleaned.replace(TRAILING_YEAR, "");

  // Collapse double spaces, trim
  cleaned = cleaned.replace(/\s{2,}/g, " ").trim();

  // Strip trailing punctuation artifacts (e.g., " -" or " |" left after stripping)
  cleaned = cleaned.replace(/\s*[|–-]\s*$/, "").trim();

  // Enforce max 60 chars (truncate at word boundary)
  if (cleaned.length > 60) {
    const truncated = cleaned.substring(0, 57);
    const lastSpace = truncated.lastIndexOf(" ");
    cleaned = lastSpace > 20 ? truncated.substring(0, lastSpace) : truncated;
  }

  return cleaned;
}

/**
 * Sanitize a meta description — strip AI artifacts, enforce 120-160 chars.
 */
export function sanitizeMetaDescription(desc: string): string {
  if (!desc) return desc;

  let cleaned = desc;

  // Strip character count patterns (use /g version for .replace())
  cleaned = cleaned.replace(CHAR_COUNT_PATTERN_G, "");

  // Strip AI instruction echoes (use /g versions for .replace())
  for (const pattern of INSTRUCTION_ECHOES_G) {
    cleaned = cleaned.replace(pattern, "");
  }

  // Collapse double spaces, trim
  cleaned = cleaned.replace(/\s{2,}/g, " ").trim();

  // If over 160 chars, trim at word boundary to ~155
  if (cleaned.length > 160) {
    const truncated = cleaned.substring(0, 155);
    const lastSpace = truncated.lastIndexOf(" ");
    cleaned = lastSpace > 80 ? truncated.substring(0, lastSpace) : truncated;
    // Add ellipsis if we truncated mid-content
    if (!cleaned.endsWith(".") && !cleaned.endsWith("!") && !cleaned.endsWith("?")) {
      cleaned += "...";
    }
  }

  return cleaned;
}

// ─── Content Body Sanitizer ──────────────────────────────────────────────────

// AI models echo word counts from prompt instructions into content body.
// Patterns: "(248 words)", "(212 words)", "(1,200 words)", standalone or end-of-paragraph.
const WORD_COUNT_INLINE = /\s*\(\d[\d,]*\s*words?\)/gi;
// Also catches: "(Word count: 248)", "(Total: 1,200 words)"
const WORD_COUNT_LABELED = /\s*\((?:word count|total|approx(?:imately)?)[:\s]*\d[\d,]*\s*words?\)/gi;
// Standalone paragraph containing only a word count: <p>(248 words)</p>
const WORD_COUNT_PARAGRAPH = /<p[^>]*>\s*\(\d[\d,]*\s*words?\)\s*<\/p>/gi;
// Section word counts at end: "... content here. (248 words)"
const WORD_COUNT_TRAILING = /\.\s*\(\d[\d,]*\s*words?\)\s*(?=<\/p>|<\/div>|<\/li>|$)/gi;

/**
 * Strip AI-generated word count artifacts from article HTML content.
 *
 * Called by: select-runner.ts (before BlogPost.create),
 *           daily-content-generate (before BlogPost.create),
 *           content-auto-fix (DB cleanup),
 *           phases.ts (after section drafting)
 */
export function sanitizeContentBody(html: string): string {
  if (!html) return html;

  let cleaned = html;

  // Remove standalone word count paragraphs first (most visible to readers)
  cleaned = cleaned.replace(WORD_COUNT_PARAGRAPH, "");

  // Remove trailing word counts before closing tags: "... text. (248 words)</p>"
  cleaned = cleaned.replace(WORD_COUNT_TRAILING, ".");

  // Remove inline word counts: "... text (248 words) more text..."
  cleaned = cleaned.replace(WORD_COUNT_INLINE, "");

  // Remove labeled word counts: "(Word count: 248)"
  cleaned = cleaned.replace(WORD_COUNT_LABELED, "");

  // Clean up any resulting empty paragraphs
  cleaned = cleaned.replace(/<p[^>]*>\s*<\/p>/gi, "");

  // Collapse double spaces
  cleaned = cleaned.replace(/\s{2,}/g, " ");

  return cleaned;
}

/**
 * Check if content contains word count artifacts.
 * Useful for DB audit queries.
 */
export function hasWordCountArtifacts(html: string): boolean {
  if (!html) return false;
  return WORD_COUNT_INLINE.test(html) || WORD_COUNT_PARAGRAPH.test(html) || WORD_COUNT_LABELED.test(html);
}

/**
 * Check if a title contains artifacts that should be cleaned.
 * Useful for DB audit queries.
 */
export function hasTitleArtifacts(title: string): boolean {
  if (!title) return false;
  return (
    CHAR_COUNT_PATTERN.test(title) ||
    CHAR_SUFFIX_PATTERN.test(title) ||
    INSTRUCTION_ECHOES.some((p) => p.test(title))
  );
}
