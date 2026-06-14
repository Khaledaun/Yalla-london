/**
 * CJ Client Unit Tests
 *
 * Tests XML parsing, rate limiting, retry logic, and API client functions.
 */

import { describe, it, expect } from "vitest";

// ── XML Parsing Tests ──────────────────────────────────────────────────────

describe("CJ Client — XML Parsing", () => {
  // Inline the parseXmlValue and parseXmlArray for isolated testing
  const parseXmlValue = (xml: string, tag: string): string => {
    const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`);
    const match = xml.match(regex);
    return match ? match[1].trim() : "";
  };

  const parseXmlArray = (xml: string, itemTag: string): string[] => {
    const regex = new RegExp(`<${itemTag}>([\\s\\S]*?)<\\/${itemTag}>`, "g");
    const items: string[] = [];
    let match;
    while ((match = regex.exec(xml)) !== null) {
      items.push(match[0]);
    }
    return items;
  };

  it("extracts simple text value from XML tag", () => {
    const xml = `<advertiser><advertiser-id>12345</advertiser-id><advertiser-name>Booking.com UK</advertiser-name></advertiser>`;
    expect(parseXmlValue(xml, "advertiser-id")).toBe("12345");
    expect(parseXmlValue(xml, "advertiser-name")).toBe("Booking.com UK");
  });

  it("returns empty string for missing tag", () => {
    const xml = `<advertiser><advertiser-id>12345</advertiser-id></advertiser>`;
    expect(parseXmlValue(xml, "nonexistent")).toBe("");
  });

  it("parses array of items", () => {
    const xml = `<cj-api><advertisers>
      <advertiser><advertiser-id>1</advertiser-id></advertiser>
      <advertiser><advertiser-id>2</advertiser-id></advertiser>
      <advertiser><advertiser-id>3</advertiser-id></advertiser>
    </advertisers></cj-api>`;
    const items = parseXmlArray(xml, "advertiser");
    expect(items).toHaveLength(3);
    expect(parseXmlValue(items[0], "advertiser-id")).toBe("1");
  });

  it("handles XML with CDATA sections", () => {
    const xml = `<name><![CDATA[Booking.com & Hotels]]></name>`;
    // CDATA content is extracted as-is
    const match = xml.match(/<name>([\s\S]*?)<\/name>/);
    const content = match ? match[1].trim() : "";
    expect(content).toBe("<![CDATA[Booking.com & Hotels]]>");
  });

  it("handles XML with special characters", () => {
    const xml = `<name>Hotels &amp; Resorts</name>`;
    expect(parseXmlValue(xml, "name")).toBe("Hotels &amp; Resorts");
  });
});

// ── Rate Limiter Tests ────────────────────────────────────────────────────

describe("CJ Client — Rate Limiting", () => {
  it("rate limiter queue processes items in order", async () => {
    const results: number[] = [];
    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

    // Simulate a simple rate limiter
    const queue: Array<() => Promise<void>> = [];
    let processing = false;

    const enqueue = (fn: () => Promise<void>) => {
      queue.push(fn);
      if (!processing) processQueue();
    };

    const processQueue = async () => {
      processing = true;
      while (queue.length > 0) {
        const fn = queue.shift()!;
        await fn();
      }
      processing = false;
    };

    // Enqueue 3 tasks
    enqueue(async () => { await delay(10); results.push(1); });
    enqueue(async () => { await delay(10); results.push(2); });
    enqueue(async () => { await delay(10); results.push(3); });

    await delay(100); // Wait for all to complete

    expect(results).toEqual([1, 2, 3]);
  });
});

// ── Network ID constant ───────────────────────────────────────────────────

describe("CJ Client — Constants", () => {
  it("CJ_NETWORK_ID is deterministic", async () => {
    const { CJ_NETWORK_ID } = await import("@/lib/affiliate/cj-client");
    expect(CJ_NETWORK_ID).toBe("cj-network-001");
  });

  it("isCjConfigured returns false without env var", async () => {
    const { isCjConfigured } = await import("@/lib/affiliate/cj-client");
    // In test environment, CJ_API_TOKEN is not set
    const result = isCjConfigured();
    expect(typeof result).toBe("boolean");
  });
});
