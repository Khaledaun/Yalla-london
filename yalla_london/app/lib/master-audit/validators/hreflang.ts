/**
 * Master Audit Engine — Hreflang Validator
 *
 * Validates hreflang tags:
 * - All expected languages present
 * - Valid hreflang values
 * - Reciprocity: if page A → page B, page B must → page A
 * - Self-referencing hreflang present
 */

import type { AuditIssue, ExtractedSignals, AuditConfig } from '../types';

/**
 * Normalize URL for comparison (lowercase, strip trailing slash).
 */
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hostname = parsed.hostname.toLowerCase();
    if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }
    // Remove fragment
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return url.toLowerCase().replace(/\/$/, '');
  }
}

/**
 * Valid BCP 47 language tags commonly used in hreflang.
 * Not exhaustive but covers the project's expected values.
 */
const VALID_HREFLANG_PATTERN = /^[a-z]{2}(-[A-Z]{2})?$|^x-default$/;

export function validateHreflang(
  signals: ExtractedSignals,
  pageUrl: string,
  allSignals: Map<string, ExtractedSignals>,
  config: AuditConfig
): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const expectedLangs = config.validators.expectedHreflangLangs;

  // Skip for noindexed pages
  if (
    signals.robotsMeta &&
    signals.robotsMeta.toLowerCase().includes('noindex')
  ) {
    return issues;
  }

  const alternates = signals.hreflangAlternates;

  // ---- No hreflang tags at all ----
  if (alternates.length === 0) {
    // Only flag this if the site expects hreflang (has expectedHreflangLangs configured)
    if (expectedLangs.length > 0) {
      issues.push({
        severity: 'P1',
        category: 'hreflang',
        url: pageUrl,
        message: `Missing hreflang tags. Expected languages: ${expectedLangs.join(', ')}`,
        suggestedFix: {
          scope: 'systemic',
          target: 'Page template / generateMetadata()',
          notes:
            'Add <link rel="alternate" hreflang="..."> tags for each language variant. ' +
            'Include x-default pointing to the primary language version.',
        },
      });
    }
    return issues;
  }

  // ---- Invalid hreflang values ----
  for (const alt of alternates) {
    if (!VALID_HREFLANG_PATTERN.test(alt.hreflang)) {
      issues.push({
        severity: 'P1',
        category: 'hreflang',
        url: pageUrl,
        message: `Invalid hreflang value: "${alt.hreflang}"`,
        evidence: { snippet: `hreflang="${alt.hreflang}" href="${alt.href}"` },
        suggestedFix: {
          scope: 'systemic',
          target: 'Hreflang generation',
          notes: `Use valid BCP 47 language tags (e.g., en-GB, ar-SA, x-default). "${alt.hreflang}" is not valid.`,
        },
      });
    }
  }

  // ---- Missing expected languages ----
  const presentLangs = new Set(alternates.map((a) => a.hreflang));
  for (const expectedLang of expectedLangs) {
    if (!presentLangs.has(expectedLang)) {
      issues.push({
        severity: 'P1',
        category: 'hreflang',
        url: pageUrl,
        message: `Missing expected hreflang for "${expectedLang}"`,
        evidence: {
          snippet: `Present: ${Array.from(presentLangs).join(', ')}\nExpected: ${expectedLangs.join(', ')}`,
        },
        suggestedFix: {
          scope: 'systemic',
          target: 'Hreflang generation',
          notes: `Add hreflang="${expectedLang}" alternate for this page.`,
        },
      });
    }
  }

  // ---- Self-referencing hreflang ----
  const normalizedPageUrl = normalizeUrl(pageUrl);
  const hasSelfReference = alternates.some(
    (alt) => normalizeUrl(alt.href) === normalizedPageUrl
  );

  if (!hasSelfReference) {
    issues.push({
      severity: 'P1',
      category: 'hreflang',
      url: pageUrl,
      message: 'Missing self-referencing hreflang tag',
      suggestedFix: {
        scope: 'systemic',
        target: 'Hreflang generation',
        notes:
          'Each page must include a hreflang tag pointing to itself. ' +
          'Google requires self-referencing hreflang for proper language/region targeting.',
      },
    });
  }

  // ---- x-default present ----
  if (!presentLangs.has('x-default') && expectedLangs.includes('x-default')) {
    issues.push({
      severity: 'P2',
      category: 'hreflang',
      url: pageUrl,
      message: 'Missing x-default hreflang tag',
      suggestedFix: {
        scope: 'systemic',
        target: 'Hreflang generation',
        notes:
          'Add x-default hreflang pointing to the primary language version (usually English). ' +
          'This helps search engines serve the right version to users whose language is not explicitly targeted.',
      },
    });
  }

  // ---- Reciprocity check ----
  for (const alt of alternates) {
    const targetUrl = normalizeUrl(alt.href);
    const targetSignals = allSignals.get(targetUrl);

    if (!targetSignals) {
      // Target page was not crawled — cannot verify reciprocity
      // Only flag if target is within our crawl scope
      continue;
    }

    const targetAlternates = targetSignals.hreflangAlternates;
    const hasReciprocal = targetAlternates.some(
      (ta) => normalizeUrl(ta.href) === normalizedPageUrl
    );

    if (!hasReciprocal) {
      issues.push({
        severity: 'P1',
        category: 'hreflang',
        url: pageUrl,
        message: `Hreflang reciprocity broken: ${pageUrl} links to ${alt.href} (${alt.hreflang}), but ${alt.href} does not link back`,
        evidence: {
          snippet: `Source: ${pageUrl}\nTarget: ${alt.href} (${alt.hreflang})\nTarget's alternates: ${targetAlternates.map((t) => `${t.hreflang}=${t.href}`).join(', ') || 'none'}`,
        },
        suggestedFix: {
          scope: 'systemic',
          target: 'Hreflang generation',
          notes: `Add a reciprocal hreflang on ${alt.href} pointing back to ${pageUrl}.`,
        },
      });
    }
  }

  // ---- Duplicate hreflang values ----
  const langCounts = new Map<string, number>();
  for (const alt of alternates) {
    langCounts.set(alt.hreflang, (langCounts.get(alt.hreflang) ?? 0) + 1);
  }
  for (const [lang, count] of langCounts) {
    if (count > 1) {
      issues.push({
        severity: 'P1',
        category: 'hreflang',
        url: pageUrl,
        message: `Duplicate hreflang value "${lang}" appears ${count} times`,
        suggestedFix: {
          scope: 'systemic',
          target: 'Hreflang generation',
          notes: `Each hreflang value should appear only once per page. Remove duplicate "${lang}" entries.`,
        },
      });
    }
  }

  return issues;
}
