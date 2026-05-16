/**
 * Title + meta clickability scoring.
 *
 * The optimizeCtr fix in fix-engine.ts was previously a blind AI rewrite
 * (no signal whether the new title was actually more clickable). This
 * scorer enforces a minimum clickability bar so we never replace a
 * decent existing title with a worse AI-generated one.
 *
 * Scoring is empirical, not academic — based on CTR-impact studies
 * (Backlinko 2024, Moz, Ahrefs) for English-language listicle/guide
 * articles. Returns 0-100. ≥60 is "shippable", ≥80 is "strong".
 */

const POWER_WORDS = new Set([
  "ultimate",
  "essential",
  "complete",
  "definitive",
  "best",
  "top",
  "secret",
  "insider",
  "hidden",
  "exclusive",
  "luxury",
  "premium",
  "guide",
  "how",
  "why",
  "what",
  "ways",
  "tips",
  "tricks",
  "hacks",
  "new",
  "free",
  "instant",
  "proven",
  "easy",
  "quick",
  "fast",
  "must",
  "actually",
  "really",
  "literally",
  "stunning",
  "incredible",
]);

const CTA_WORDS = new Set([
  "book",
  "discover",
  "find",
  "see",
  "learn",
  "try",
  "save",
  "get",
  "visit",
  "explore",
  "compare",
  "choose",
  "avoid",
  "love",
]);

export interface ClickabilityScore {
  score: number; // 0-100
  signals: string[]; // human-readable list of detected signals
  missing: string[]; // suggestions for improvement
  shippable: boolean; // score >= 60
}

/**
 * Score a candidate META TITLE for clickability. Single source of truth so
 * both human-written and AI-generated titles pass the same gate.
 */
export function scoreTitleClickability(title: string): ClickabilityScore {
  const signals: string[] = [];
  const missing: string[] = [];
  let score = 0;

  if (!title || !title.trim()) {
    return { score: 0, signals: [], missing: ["empty title"], shippable: false };
  }

  const t = title.trim();
  const lower = t.toLowerCase();
  const length = t.length;

  // 1. Length (sweet spot 50-60 chars per Google guidelines, max 60)
  if (length >= 50 && length <= 60) {
    score += 20;
    signals.push("optimal-length");
  } else if (length >= 40 && length <= 65) {
    score += 12;
    signals.push("acceptable-length");
  } else if (length < 30) {
    missing.push("too-short (<30 chars)");
  } else if (length > 70) {
    missing.push("too-long (>70 chars — will truncate in SERP)");
  }

  // 2. Number presence (lists, years, dollar amounts boost CTR ~36% per
  //    Backlinko 2024 analysis of 2M titles)
  const numberMatch = t.match(/\d+/);
  if (numberMatch) {
    score += 18;
    // Year specifically signals freshness
    if (/\b20(2[5-9]|3\d)\b/.test(t)) {
      score += 7;
      signals.push("year");
    } else {
      signals.push("number");
    }
  } else {
    missing.push("no-number");
  }

  // 3. Bracket / parenthetical (qualifies the title — "(2026 Guide)",
  //    "[Updated]". Brackets boost CTR ~38% on listicles per Backlinko.)
  if (/[\[\(].{2,15}[\]\)]/.test(t)) {
    score += 10;
    signals.push("bracket");
  }

  // 4. Power word — proven CTR drivers
  const words = lower.split(/[\s\-:]+/);
  const matchedPowerWords = words.filter((w) => POWER_WORDS.has(w));
  if (matchedPowerWords.length > 0) {
    score += 15;
    signals.push(`power-word:${matchedPowerWords[0]}`);
  } else {
    missing.push("no-power-word");
  }

  // 5. Question mark — questions trigger 23% higher CTR (Hubspot 2024)
  if (t.includes("?")) {
    score += 8;
    signals.push("question");
  }

  // 6. CTA verb — direct action verbs in titles
  const matchedCta = words.filter((w) => CTA_WORDS.has(w));
  if (matchedCta.length > 0) {
    score += 8;
    signals.push(`cta:${matchedCta[0]}`);
  }

  // 7. Emoji — boosts mobile SERP CTR ~10-15% but only if relevant
  if (/[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}]/u.test(t)) {
    score += 5;
    signals.push("emoji");
  }

  // 8. Specificity bonus — multiple specific signals = "this is a real guide"
  if (numberMatch && matchedPowerWords.length > 0 && length >= 40) {
    score += 9;
    signals.push("specificity-combo");
  }

  // Cap at 100
  score = Math.min(100, score);

  return {
    score,
    signals,
    missing,
    shippable: score >= 60,
  };
}

/**
 * Score a candidate META DESCRIPTION. Lower bar than title — descriptions
 * mostly need to be the right length, mention the focus keyword, and
 * have a clear value statement.
 */
export function scoreMetaDescriptionClickability(description: string, focusKeyword?: string | null): ClickabilityScore {
  const signals: string[] = [];
  const missing: string[] = [];
  let score = 0;

  if (!description || !description.trim()) {
    return { score: 0, signals: [], missing: ["empty description"], shippable: false };
  }

  const d = description.trim();
  const lower = d.toLowerCase();
  const length = d.length;

  // 1. Length (120-160 sweet spot per Google)
  if (length >= 120 && length <= 160) {
    score += 30;
    signals.push("optimal-length");
  } else if (length >= 100 && length <= 170) {
    score += 18;
    signals.push("acceptable-length");
  } else if (length < 70) {
    missing.push("too-short (<70 chars)");
  } else if (length > 180) {
    missing.push("too-long (>180 chars — will truncate)");
  }

  // 2. Focus keyword present
  if (focusKeyword && lower.includes(focusKeyword.toLowerCase())) {
    score += 25;
    signals.push("focus-keyword");
  } else if (focusKeyword) {
    missing.push(`focus-keyword-missing (${focusKeyword})`);
  }

  // 3. CTA word
  const matchedCta = lower.split(/[\s\-:.]+/).filter((w) => CTA_WORDS.has(w));
  if (matchedCta.length > 0) {
    score += 15;
    signals.push(`cta:${matchedCta[0]}`);
  } else {
    missing.push("no-cta-verb");
  }

  // 4. Number / year specificity (less weighted than in title)
  if (/\d+/.test(d)) {
    score += 12;
    signals.push("number");
  }

  // 5. Sentence structure — at least one period or sentence break
  if (/[.!?]/.test(d)) {
    score += 10;
    signals.push("sentence");
  } else {
    missing.push("no-sentence-break");
  }

  // 6. Power word
  const matchedPower = lower.split(/[\s\-:.]+/).filter((w) => POWER_WORDS.has(w));
  if (matchedPower.length > 0) {
    score += 8;
    signals.push(`power-word:${matchedPower[0]}`);
  }

  score = Math.min(100, score);

  return {
    score,
    signals,
    missing,
    shippable: score >= 55,
  };
}
