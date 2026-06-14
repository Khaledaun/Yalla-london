/**
 * Master Audit Engine — Metadata Validator
 *
 * Validates page metadata quality:
 * - Title present and within length bounds
 * - Description present and within length bounds
 * - Unique titles across all pages
 * - Unique descriptions across all pages
 */

import type { AuditIssue, ExtractedSignals, AuditConfig } from '../types';

export function validateMetadata(
  signals: ExtractedSignals,
  pageUrl: string,
  allSignals: Map<string, ExtractedSignals>,
  config: AuditConfig
): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const { titleLength, descriptionLength } = config.validators;

  // Skip for noindexed pages (metadata is less critical)
  if (
    signals.robotsMeta &&
    signals.robotsMeta.toLowerCase().includes('noindex')
  ) {
    return issues;
  }

  // ============================================================
  // Title validation
  // ============================================================

  if (!signals.title) {
    issues.push({
      severity: 'P0',
      category: 'metadata',
      url: pageUrl,
      message: 'Missing <title> tag',
      suggestedFix: {
        scope: 'systemic',
        target: 'Page template / generateMetadata()',
        notes: 'Add a unique, descriptive <title> tag between 30-60 characters.',
      },
    });
  } else {
    const titleLen = signals.title.length;

    if (titleLen < titleLength.min) {
      issues.push({
        severity: 'P1',
        category: 'metadata',
        url: pageUrl,
        message: `Title too short: ${titleLen} chars (min: ${titleLength.min})`,
        evidence: { snippet: signals.title },
        suggestedFix: {
          scope: 'page-level',
          target: pageUrl,
          notes: `Expand title to at least ${titleLength.min} characters. Current: "${signals.title}"`,
        },
      });
    }

    if (titleLen > titleLength.max) {
      issues.push({
        severity: 'P2',
        category: 'metadata',
        url: pageUrl,
        message: `Title too long: ${titleLen} chars (max: ${titleLength.max}). May be truncated in SERPs.`,
        evidence: { snippet: signals.title },
        suggestedFix: {
          scope: 'page-level',
          target: pageUrl,
          notes: `Shorten title to ${titleLength.max} characters or less.`,
        },
      });
    }

    // Check for duplicate titles
    for (const [otherUrl, otherSignals] of allSignals) {
      if (otherUrl === pageUrl) continue;
      if (
        otherSignals.title &&
        otherSignals.title.toLowerCase() === signals.title.toLowerCase()
      ) {
        // Only report once (from the page with the higher URL to avoid double-reporting)
        if (pageUrl < otherUrl) {
          issues.push({
            severity: 'P1',
            category: 'metadata',
            url: pageUrl,
            message: `Duplicate title with ${otherUrl}: "${signals.title}"`,
            evidence: {
              snippet: `Page 1: ${pageUrl}\nPage 2: ${otherUrl}\nTitle: "${signals.title}"`,
            },
            suggestedFix: {
              scope: 'page-level',
              target: pageUrl,
              notes: 'Each page should have a unique title. Update one of the duplicate titles.',
            },
          });
        }
        break; // Only flag the first duplicate
      }
    }
  }

  // ============================================================
  // Meta description validation
  // ============================================================

  if (!signals.metaDescription) {
    issues.push({
      severity: 'P1',
      category: 'metadata',
      url: pageUrl,
      message: 'Missing meta description',
      suggestedFix: {
        scope: 'systemic',
        target: 'Page template / generateMetadata()',
        notes: `Add a meta description between ${descriptionLength.min}-${descriptionLength.max} characters.`,
      },
    });
  } else {
    const descLen = signals.metaDescription.length;

    if (descLen < descriptionLength.min) {
      issues.push({
        severity: 'P2',
        category: 'metadata',
        url: pageUrl,
        message: `Meta description too short: ${descLen} chars (min: ${descriptionLength.min})`,
        evidence: { snippet: signals.metaDescription },
        suggestedFix: {
          scope: 'page-level',
          target: pageUrl,
          notes: `Expand meta description to at least ${descriptionLength.min} characters.`,
        },
      });
    }

    if (descLen > descriptionLength.max) {
      issues.push({
        severity: 'P2',
        category: 'metadata',
        url: pageUrl,
        message: `Meta description too long: ${descLen} chars (max: ${descriptionLength.max}). May be truncated in SERPs.`,
        evidence: { snippet: signals.metaDescription },
        suggestedFix: {
          scope: 'page-level',
          target: pageUrl,
          notes: `Shorten meta description to ${descriptionLength.max} characters or less.`,
        },
      });
    }

    // Check for duplicate descriptions
    for (const [otherUrl, otherSignals] of allSignals) {
      if (otherUrl === pageUrl) continue;
      if (
        otherSignals.metaDescription &&
        otherSignals.metaDescription.toLowerCase() ===
          signals.metaDescription.toLowerCase()
      ) {
        if (pageUrl < otherUrl) {
          issues.push({
            severity: 'P2',
            category: 'metadata',
            url: pageUrl,
            message: `Duplicate meta description with ${otherUrl}`,
            evidence: {
              snippet: `Description: "${signals.metaDescription.slice(0, 100)}..."`,
            },
            suggestedFix: {
              scope: 'page-level',
              target: pageUrl,
              notes: 'Each page should have a unique meta description.',
            },
          });
        }
        break;
      }
    }
  }

  // ============================================================
  // Additional metadata checks
  // ============================================================

  // Missing lang attribute
  if (!signals.langAttr) {
    issues.push({
      severity: 'P2',
      category: 'metadata',
      url: pageUrl,
      message: 'Missing lang attribute on <html> tag',
      suggestedFix: {
        scope: 'systemic',
        target: 'Root layout',
        notes: 'Add lang attribute to <html> tag (e.g., lang="en-GB" or lang="ar").',
      },
    });
  }

  // Arabic page without RTL direction
  if (signals.langAttr && signals.langAttr.startsWith('ar') && signals.dirAttr !== 'rtl') {
    issues.push({
      severity: 'P1',
      category: 'metadata',
      url: pageUrl,
      message: `Arabic page missing dir="rtl" attribute (lang="${signals.langAttr}", dir="${signals.dirAttr ?? 'not set'}")`,
      suggestedFix: {
        scope: 'systemic',
        target: 'Arabic layout',
        notes: 'Arabic pages must have dir="rtl" on <html> or <body> for proper text rendering.',
      },
    });
  }

  return issues;
}
