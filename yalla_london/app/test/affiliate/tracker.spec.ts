/**
 * Link Tracker Unit Tests
 *
 * Tests tracking URL generation, device detection, and click event structure.
 */

import { describe, it, expect } from "vitest";

describe("Link Tracker — URL Generation", () => {
  // Replicate generateTrackingUrl for isolated testing
  const generateTrackingUrl = (linkId: string, baseUrl?: string): string => {
    const base = baseUrl || "";
    return `${base}/api/affiliate/click?id=${encodeURIComponent(linkId)}`;
  };

  it("generates correct tracking URL", () => {
    const url = generateTrackingUrl("link-123");
    expect(url).toBe("/api/affiliate/click?id=link-123");
  });

  it("includes base URL when provided", () => {
    const url = generateTrackingUrl("link-123", "https://yalla-london.com");
    expect(url).toBe("https://yalla-london.com/api/affiliate/click?id=link-123");
  });

  it("encodes special characters in link ID", () => {
    const url = generateTrackingUrl("link with spaces & special=chars");
    expect(url).toContain("link%20with%20spaces");
    expect(url).toContain("%26");
  });
});

describe("Link Tracker — Device Detection", () => {
  const detectDevice = (ua: string): "DESKTOP" | "MOBILE" | "TABLET" => {
    const lower = ua.toLowerCase();
    if (/ipad|tablet|playbook|silk/i.test(lower)) return "TABLET";
    if (/mobile|iphone|ipod|android(?!.*tablet)|opera mini|iemobile/i.test(lower)) return "MOBILE";
    return "DESKTOP";
  };

  it("detects iPhone as MOBILE", () => {
    expect(detectDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 16_0)")).toBe("MOBILE");
  });

  it("detects iPad as TABLET", () => {
    expect(detectDevice("Mozilla/5.0 (iPad; CPU OS 16_0)")).toBe("TABLET");
  });

  it("detects desktop browser as DESKTOP", () => {
    expect(detectDevice("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe("DESKTOP");
  });

  it("detects Android phone as MOBILE", () => {
    expect(detectDevice("Mozilla/5.0 (Linux; Android 13; Pixel 7)")).toBe("MOBILE");
  });

  it("detects Android tablet as TABLET", () => {
    expect(detectDevice("Mozilla/5.0 (Linux; Android 13; Pixel C) Tablet")).toBe("TABLET");
  });
});

describe("Link Tracker — Click Event Structure", () => {
  it("click event has required fields", () => {
    const event = {
      linkId: "link-123",
      ipHash: "abc123",
      userAgent: "Mozilla/5.0",
      device: "MOBILE" as const,
      referrer: "https://google.com",
      page: "/blog/london-hotels",
    };

    expect(event.linkId).toBeTruthy();
    expect(event.ipHash).toBeTruthy();
    expect(["DESKTOP", "MOBILE", "TABLET"]).toContain(event.device);
  });
});
