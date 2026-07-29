/**
 * Master Audit Engine — Schema (JSON-LD) Validator
 *
 * Validates JSON-LD structured data:
 * - Valid JSON parse
 * - Has @context and @type
 * - Required types present per route pattern (from config)
 * - No deprecated types
 */

import type { AuditIssue, ExtractedSignals, AuditConfig } from '../types';

/**
 * Extract @type values from a JSON-LD object, handling @graph arrays.
 */
function extractTypes(jsonLdItem: unknown): string[] {
  const types: string[] = [];

  if (!jsonLdItem || typeof jsonLdItem !== 'object') return types;

  const obj = jsonLdItem as Record<string, unknown>;

  // Direct @type
  if (obj['@type']) {
    if (Array.isArray(obj['@type'])) {
      types.push(
        ...(obj['@type'] as unknown[]).filter(
          (t): t is string => typeof t === 'string'
        )
      );
    } else if (typeof obj['@type'] === 'string') {
      types.push(obj['@type']);
    }
  }

  // @graph array
  if (Array.isArray(obj['@graph'])) {
    for (const item of obj['@graph']) {
      types.push(...extractTypes(item));
    }
  }

  return types;
}

/**
 * Check if a page URL matches a route pattern.
 * Patterns use simple glob: * matches within path segment, ** matches across segments.
 */
function matchesRoutePattern(
  pageUrl: string,
  pattern: string
): boolean {
  try {
    const urlObj = new URL(pageUrl);
    const pathname = urlObj.pathname;

    const regex = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*\*/g, '{{DOUBLESTAR}}')
      .replace(/\*/g, '[^/]*')
      .replace(/\{\{DOUBLESTAR\}\}/g, '.*');

    return new RegExp(`^${regex}$`).test(pathname);
  } catch {
    return false;
  }
}

export function validateSchema(
  signals: ExtractedSignals,
  pageUrl: string,
  config: AuditConfig
): AuditIssue[] {
  const issues: AuditIssue[] = [];

  // ---- No JSON-LD at all ----
  if (signals.jsonLd.length === 0) {
    // Check if this page has required schema types
    for (const [pattern, requiredTypes] of Object.entries(
      config.validators.requiredSchemaByRoute
    )) {
      if (matchesRoutePattern(pageUrl, pattern)) {
        issues.push({
          severity: 'P1',
          category: 'schema',
          url: pageUrl,
          message: `Missing JSON-LD structured data. Required types for "${pattern}": ${requiredTypes.join(', ')}`,
          suggestedFix: {
            scope: 'systemic',
            target: `Route template matching "${pattern}"`,
            notes: `Add <script type="application/ld+json"> with ${requiredTypes.join(' + ')} schema.`,
          },
        });
      }
    }
    return issues;
  }

  // Collect all types across all JSON-LD blocks
  const allTypes = new Set<string>();

  for (let i = 0; i < signals.jsonLd.length; i++) {
    const item = signals.jsonLd[i];

    // ---- Parse error ----
    if (
      item &&
      typeof item === 'object' &&
      '_parseError' in (item as Record<string, unknown>)
    ) {
      const raw = (item as Record<string, unknown>)['_raw'] ?? '';
      issues.push({
        severity: 'P0',
        category: 'schema',
        url: pageUrl,
        message: `Invalid JSON in JSON-LD block #${i + 1}`,
        evidence: {
          snippet: String(raw).slice(0, 300),
          jsonPath: `jsonLd[${i}]`,
        },
        suggestedFix: {
          scope: 'page-level',
          target: pageUrl,
          notes: 'Fix JSON syntax in the structured data block.',
        },
      });
      continue;
    }

    if (!item || typeof item !== 'object') continue;
    const obj = item as Record<string, unknown>;

    // ---- Missing @context ----
    if (!obj['@context']) {
      issues.push({
        severity: 'P1',
        category: 'schema',
        url: pageUrl,
        message: `JSON-LD block #${i + 1} missing @context`,
        evidence: { jsonPath: `jsonLd[${i}]` },
        suggestedFix: {
          scope: 'systemic',
          target: 'Schema generator',
          notes: 'Add "@context": "https://schema.org" to the JSON-LD block.',
        },
      });
    } else {
      // Validate @context value
      const context = String(obj['@context']);
      if (
        !context.includes('schema.org')
      ) {
        issues.push({
          severity: 'P2',
          category: 'schema',
          url: pageUrl,
          message: `JSON-LD block #${i + 1} has non-standard @context: "${context}"`,
          evidence: {
            jsonPath: `jsonLd[${i}].@context`,
            snippet: context,
          },
          suggestedFix: {
            scope: 'systemic',
            target: 'Schema generator',
            notes: 'Use "https://schema.org" as the @context value.',
          },
        });
      }
    }

    // ---- Missing @type ----
    const types = extractTypes(item);
    if (types.length === 0 && !obj['@graph']) {
      issues.push({
        severity: 'P1',
        category: 'schema',
        url: pageUrl,
        message: `JSON-LD block #${i + 1} missing @type`,
        evidence: { jsonPath: `jsonLd[${i}]` },
        suggestedFix: {
          scope: 'systemic',
          target: 'Schema generator',
          notes: 'Add appropriate @type to the JSON-LD block.',
        },
      });
    }

    for (const t of types) {
      allTypes.add(t);
    }

    // ---- Deprecated types ----
    for (const t of types) {
      if (config.validators.deprecatedSchemaTypes.includes(t)) {
        issues.push({
          severity: 'P1',
          category: 'schema',
          url: pageUrl,
          message: `Deprecated JSON-LD type "${t}" found in block #${i + 1}`,
          evidence: {
            jsonPath: `jsonLd[${i}].@type`,
            snippet: t,
          },
          suggestedFix: {
            scope: 'systemic',
            target: 'Schema generator',
            notes: `Replace deprecated "${t}" with a supported type (e.g., "Article" for content pages).`,
          },
        });
      }
    }
  }

  // ---- Required types per route pattern ----
  for (const [pattern, requiredTypes] of Object.entries(
    config.validators.requiredSchemaByRoute
  )) {
    if (!matchesRoutePattern(pageUrl, pattern)) continue;

    for (const requiredType of requiredTypes) {
      if (!allTypes.has(requiredType)) {
        issues.push({
          severity: 'P1',
          category: 'schema',
          url: pageUrl,
          message: `Missing required JSON-LD type "${requiredType}" for route pattern "${pattern}"`,
          suggestedFix: {
            scope: 'systemic',
            target: `Route template matching "${pattern}"`,
            notes: `Add "${requiredType}" structured data to pages matching this pattern.`,
          },
        });
      }
    }
  }

  return issues;
}
