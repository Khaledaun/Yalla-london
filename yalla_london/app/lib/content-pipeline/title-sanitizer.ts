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

// CTR-killer patterns flagged in Perplexity May 17 2026 re-audit:
//   "Best London Hotels |"             trailing pipe + whitespace
//   "Best London Hotels ||"            double trailing pipe
//   "Best London Hotels ()"            empty parentheses
//   "Best London Hotels - "            trailing dash
//   "Best London Hotels:"              trailing colon
// Google appends "| Yalla London" automatically so a trailing pipe shows as
// "Title |  | Yalla London" in the SERP and tanks CTR.
const TRAILING_PIPE = /\s*\|+\s*$/;
const EMPTY_PARENS = /\s*\(\s*\)\s*$/;
const TRAILING_COLON = /\s*:\s*$/;

// Trailing comma/semicolon (Marathon: "Training,") — May 17 2026 re-audit
const TRAILING_PUNCTUATION = /\s*[,;]+\s*$/;

// Brand suffix the AI sometimes bakes into the title. Google appends the site
// name automatically, so "Title | Yalla London" shows as "Title | Yalla London
// | Yalla London" in the SERP, AND when titles are length-capped the brand text
// gets cut to "...| Yalla" — a CTR killer. Strip any trailing Yalla[ London].
// (June 13 2026 audit: 40+ live titles ended in "| Yalla" or "| Yalla London".)
const TRAILING_BRAND = /\s*[|–-]\s*Yalla(\s+London)?\s*$/i;

// Dangling connective/stopword left at the end after a hard length truncation,
// e.g. "...Luxury Guide for", "...Authentic Rituals in", "...Need to". These
// read as broken/incomplete in the SERP and suppress CTR. Strip the trailing
// orphan word (run twice to catch "...Guide for the" → "...Guide").
// (June 13 2026 audit root cause: daily-content-generate hard-sliced at 60 chars
// mid-word; this is the safety net so the artifact never ships again.)
const TRAILING_DANGLING_WORD = /\s+(?:for|to|in|and|with|the|of|a|an|your|like|by|on|at|from|that|as|or|but|into|about)$/i;

// Versioning slugs leaked from content-strategy ("V2", "V3", "(v2)", "-v3", "Version 2")
// Lookahead keeps colon-separated subtitles intact: matches " V2" only before ":" or end-of-string.
// Examples stripped: "Best London Hotels V2: Ultimate", "Guide v3", "Title (V2)"
// NOTE: Two variants — non-/g for stateful .test(), /g for .replace() (see file header rule).
const VERSION_SUFFIX = /\s+[Vv](?:ersion)?[\s-]?\d{1,2}\b(?=[\s:]|$)/;
const VERSION_SUFFIX_G = /\s+[Vv](?:ersion)?[\s-]?\d{1,2}\b(?=[\s:]|$)/g;

// Bracket placeholders AI never filled. Enumerates known placeholder words so we
// don't strip legitimate didactic markers like [example] or citation markers [1].
// Examples: "[x]", "[X]", "[TBD]", "[insert hotel name]", "[topic]", "[destination]"
const BRACKET_PLACEHOLDER = /\[(?:x|X|\.\.\.|TBD|TODO|placeholder|insert[^\]]*|topic|destination|keyword|number|date|year|month|brand|hotel|restaurant)\]/i;
const BRACKET_PLACEHOLDER_G = /\[(?:x|X|\.\.\.|TBD|TODO|placeholder|insert[^\]]*|topic|destination|keyword|number|date|year|month|brand|hotel|restaurant)\]/gi;

// "for arabs" / "for arab travellers" stuffed at end is low-value English-SERP
// keyword — niche audience already covered by Arabic /ar/ pages with hreflang.
// Removing it earns ~0.4 percentage points of CTR per Backlinko study (shorter
// titles outperform stuffed titles for general queries).
const TRAILING_ARAB_STUFF = /\s*[-–|]?\s*for\s+arabs?(?:\s+travell?ers?)?$/i;

// Duplicated subtitle pattern: "Best London Hotels - Best London Hotels Guide".
// AI confabulates this when prompt asks for both a "title" and "headline".
const DUPLICATED_SUBTITLE = /^(.+?)\s+[-–|]\s+\1(?:\s+(?:guide|review|complete|overview))?$/i;

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

  // Strip "EXPAND:" prefix from content-strategy expansion proposals
  cleaned = cleaned.replace(/^EXPAND:\s*/i, "");

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

  // Strip "for arabs" stuffing — niche keyword tank English-SERP CTR
  cleaned = cleaned.replace(TRAILING_ARAB_STUFF, "");

  // Strip empty parens "()" left after artifact removal
  cleaned = cleaned.replace(EMPTY_PARENS, "");

  // Collapse double spaces, trim
  cleaned = cleaned.replace(/\s{2,}/g, " ").trim();

  // Strip trailing pipe(s) — Google appends "| Yalla London" so "Title |"
  // becomes "Title |  | Yalla London" in the SERP (CTR killer per Backlinko).
  cleaned = cleaned.replace(TRAILING_PIPE, "").trim();

  // Strip trailing colon
  cleaned = cleaned.replace(TRAILING_COLON, "").trim();

  // Strip trailing comma/semicolon (May 17 re-audit: Marathon "Training,")
  cleaned = cleaned.replace(TRAILING_PUNCTUATION, "").trim();

  // Strip versioning slug leaks ("V2", "V3"). Must run before re-collapsing whitespace
  // so the space before "V2" is also removed by the trim() after.
  cleaned = cleaned.replace(VERSION_SUFFIX_G, "").trim();

  // Strip unfilled bracket placeholders ("[x]", "[TBD]", "[insert ...]"). Enumerated
  // list keeps legitimate markers like "[example]" or "[1]" intact.
  cleaned = cleaned.replace(BRACKET_PLACEHOLDER_G, "").trim();

  // Re-collapse whitespace after stripping (placeholders may leave double spaces)
  cleaned = cleaned.replace(/\s{2,}/g, " ").trim();

  // Strip baked-in brand suffix ("| Yalla London") — Google adds it automatically
  cleaned = cleaned.replace(TRAILING_BRAND, "").trim();

  // Strip trailing punctuation artifacts (e.g., " -" or " |" left after stripping)
  cleaned = cleaned.replace(/\s*[|–-]\s*$/, "").trim();

  // Strip a dangling connective word left by an upstream hard truncation
  // (twice, to unwind "...Guide for the" → "...Guide")
  cleaned = cleaned.replace(TRAILING_DANGLING_WORD, "").trim();
  cleaned = cleaned.replace(TRAILING_DANGLING_WORD, "").trim();
  cleaned = cleaned.replace(/\s*[|–-]\s*$/, "").trim();

  // Collapse duplicated subtitle ("Best Hotels - Best Hotels Guide" → "Best Hotels")
  const dupMatch = DUPLICATED_SUBTITLE.exec(cleaned);
  if (dupMatch) {
    cleaned = dupMatch[1].trim();
  }

  // Enforce max 60 chars (truncate at word boundary, never mid-word)
  if (cleaned.length > 60) {
    const truncated = cleaned.substring(0, 60);
    const lastSpace = truncated.lastIndexOf(" ");
    cleaned = lastSpace > 20 ? truncated.substring(0, lastSpace) : truncated;
    // A word-boundary cut can leave a dangling connective ("...Guide for") —
    // strip it so the capped title still reads as a complete phrase.
    cleaned = cleaned.replace(TRAILING_DANGLING_WORD, "").trim();
    cleaned = cleaned.replace(/\s*[|–:,-]\s*$/, "").trim();
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

  // Strip unfilled bracket placeholders from body content ("[x]", "[TBD]", "[insert ...]")
  // May 17 re-audit: "high hotel prices with [x] unexpected add-on costs"
  cleaned = cleaned.replace(BRACKET_PLACEHOLDER_G, "");

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
    INSTRUCTION_ECHOES.some((p) => p.test(title)) ||
    // CTR-killer patterns (Perplexity May 17 2026)
    TRAILING_PIPE.test(title) ||
    EMPTY_PARENS.test(title) ||
    TRAILING_COLON.test(title) ||
    TRAILING_ARAB_STUFF.test(title) ||
    TRAILING_YEAR.test(title) ||
    DUPLICATED_SUBTITLE.test(title) ||
    // May 17 2026 re-audit patterns
    TRAILING_PUNCTUATION.test(title) ||
    VERSION_SUFFIX.test(title) ||
    BRACKET_PLACEHOLDER.test(title) ||
    // June 13 2026 audit: baked-in brand suffix + truncation artifacts
    TRAILING_BRAND.test(title) ||
    TRAILING_DANGLING_WORD.test(title) ||
    // Starts with "EXPAND:" leak from content-strategy
    /^EXPAND:\s*/i.test(title)
  );
}

/**
 * Check if text contains an unfilled bracket placeholder ([x], [TBD], [insert ...]).
 * Used by pre-publication-gate to block template leaks at publish time.
 * Returns false for legitimate markers like [example] or citation markers [1].
 */
export function hasBracketPlaceholder(text: string): boolean {
  if (!text) return false;
  return BRACKET_PLACEHOLDER.test(text);
}
