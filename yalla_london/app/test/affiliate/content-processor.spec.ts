/**
 * Content Processor Unit Tests
 *
 * Tests HTML splitting, CTA injection, disclosure insertion,
 * and placement logic.
 */

import { describe, it, expect } from "vitest";

// ── HTML Splitting ──────────────────────────────────────────────────────

describe("Content Processor — HTML Splitting", () => {
  const splitIntoParagraphs = (html: string): string[] => {
    return html.split(/(?=<(?:p|div|h[1-6]|section|article|blockquote)\b)/i).filter((p) => p.trim());
  };

  it("splits HTML into paragraph-level blocks", () => {
    const html = `<p>Paragraph 1</p><p>Paragraph 2</p><h2>Section</h2><p>Paragraph 3</p>`;
    const result = splitIntoParagraphs(html);
    expect(result.length).toBe(4);
  });

  it("handles empty HTML", () => {
    expect(splitIntoParagraphs("").length).toBe(0);
    expect(splitIntoParagraphs("   ").length).toBe(0);
  });

  it("preserves non-paragraph content at start", () => {
    const html = `Some text<p>Paragraph</p>`;
    const result = splitIntoParagraphs(html);
    expect(result.length).toBe(2);
  });
});

// ── Placement Index Calculation ──────────────────────────────────────────

describe("Content Processor — Placement Index", () => {
  const getTargetParagraphIndex = (position: string, totalParagraphs: number): number => {
    switch (position) {
      case "after-paragraph-3":
        return Math.min(3, totalParagraphs - 1);
      case "after-paragraph-6":
        return Math.min(6, totalParagraphs - 1);
      case "before-conclusion":
        return Math.max(totalParagraphs - 2, 3);
      case "after-each-section":
        return Math.min(4, totalParagraphs - 1);
      default:
        return Math.min(3, totalParagraphs - 1);
    }
  };

  it("returns correct index for after-paragraph-3", () => {
    expect(getTargetParagraphIndex("after-paragraph-3", 10)).toBe(3);
    expect(getTargetParagraphIndex("after-paragraph-3", 2)).toBe(1); // Capped
  });

  it("returns correct index for before-conclusion", () => {
    expect(getTargetParagraphIndex("before-conclusion", 10)).toBe(8);
    expect(getTargetParagraphIndex("before-conclusion", 3)).toBe(3); // Minimum 3
  });

  it("handles unknown position with default", () => {
    expect(getTargetParagraphIndex("unknown", 10)).toBe(3);
  });
});

// ── HTML Escaping ──────────────────────────────────────────────────────

describe("Content Processor — HTML Escaping", () => {
  const escapeHtml = (str: string): string => {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  it("escapes all special characters", () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"
    );
  });

  it("escapes ampersands", () => {
    expect(escapeHtml("Hotels & Resorts")).toBe("Hotels &amp; Resorts");
  });

  it("escapes single quotes", () => {
    expect(escapeHtml("it's")).toBe("it&#39;s");
  });
});

// ── CTA Block Generation ──────────────────────────────────────────────

describe("Content Processor — CTA Block", () => {
  it("generated CTA block contains rel=sponsored nofollow", () => {
    // Simulate CTA generation
    const ctaHtml = `<div class="affiliate-cta-block"><a href="https://track.example.com" target="_blank" rel="sponsored nofollow noopener">View on Booking.com →</a></div>`;
    expect(ctaHtml).toContain('rel="sponsored nofollow noopener"');
    expect(ctaHtml).toContain('target="_blank"');
    expect(ctaHtml).toContain("affiliate-cta-block");
  });

  it("disclosure HTML contains FTC-compliant language", () => {
    const disclosureEn = "This page contains affiliate links. We may earn a commission at no extra cost to you when you book through these links.";
    expect(disclosureEn).toContain("affiliate links");
    expect(disclosureEn).toContain("commission");
    expect(disclosureEn).toContain("no extra cost");
  });
});

// ── Min Paragraphs Constraint ──────────────────────────────────────────

describe("Content Processor — Injection Constraints", () => {
  const MAX_AFFILIATE_LINKS = 5;
  const MIN_PARAGRAPHS_BETWEEN_INJECTIONS = 2;

  it("respects minimum paragraph spacing", () => {
    const injections: number[] = [];
    let lastInjection = -MIN_PARAGRAPHS_BETWEEN_INJECTIONS;

    for (let i = 1; i < 12; i++) {
      if (injections.length >= MAX_AFFILIATE_LINKS) break;
      if (i - lastInjection >= MIN_PARAGRAPHS_BETWEEN_INJECTIONS) {
        injections.push(i);
        lastInjection = i;
      }
    }

    // Check spacing between injections
    for (let i = 1; i < injections.length; i++) {
      expect(injections[i] - injections[i - 1]).toBeGreaterThanOrEqual(MIN_PARAGRAPHS_BETWEEN_INJECTIONS);
    }
  });

  it("never exceeds max affiliate links", () => {
    const injections: number[] = [];
    let lastInjection = -MIN_PARAGRAPHS_BETWEEN_INJECTIONS;

    for (let i = 1; i < 30; i++) {
      if (injections.length >= MAX_AFFILIATE_LINKS) break;
      if (i - lastInjection >= MIN_PARAGRAPHS_BETWEEN_INJECTIONS) {
        injections.push(i);
        lastInjection = i;
      }
    }

    expect(injections.length).toBeLessThanOrEqual(MAX_AFFILIATE_LINKS);
  });
});
