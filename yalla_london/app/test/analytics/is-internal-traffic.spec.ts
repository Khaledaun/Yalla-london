/**
 * Unit tests for isInternalTraffic() — blocks GA4 from loading on admin,
 * preview, and marked-internal browsers so real-user metrics stay clean.
 *
 * Covers all 4 positive conditions from Chrome Audit cmo8u1qrk0000l804mrlppv9k
 * plus negative cases to confirm production traffic still tracks.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("isInternalTraffic", () => {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;

  beforeEach(() => {
    // @ts-expect-error — intentional stub
    globalThis.window = {
      location: { pathname: "/blog/hello-world", hostname: "www.yalla-london.com" },
    };
    // @ts-expect-error — intentional stub
    globalThis.document = { cookie: "" };
    vi.resetModules();
  });

  afterEach(() => {
    // @ts-expect-error — intentional restore
    globalThis.window = originalWindow;
    // @ts-expect-error — intentional restore
    globalThis.document = originalDocument;
  });

  it("returns true when pathname starts with /admin/", async () => {
    // @ts-expect-error — stub
    globalThis.window.location.pathname = "/admin/cockpit";
    const { isInternalTraffic } = await import("@/lib/analytics/is-internal-traffic");
    expect(isInternalTraffic()).toBe(true);
  });

  it("returns true for the bare /admin path", async () => {
    // @ts-expect-error — stub
    globalThis.window.location.pathname = "/admin";
    const { isInternalTraffic } = await import("@/lib/analytics/is-internal-traffic");
    expect(isInternalTraffic()).toBe(true);
  });

  it("returns true when pathname matches /^\\/hassan/", async () => {
    // @ts-expect-error — stub
    globalThis.window.location.pathname = "/hassan-test";
    const { isInternalTraffic } = await import("@/lib/analytics/is-internal-traffic");
    expect(isInternalTraffic()).toBe(true);
  });

  it("returns true when hostname ends with .vercel.app", async () => {
    // @ts-expect-error — stub
    globalThis.window.location.hostname = "yalla-london-git-abc123.vercel.app";
    const { isInternalTraffic } = await import("@/lib/analytics/is-internal-traffic");
    expect(isInternalTraffic()).toBe(true);
  });

  it("returns true on localhost", async () => {
    // @ts-expect-error — stub
    globalThis.window.location.hostname = "localhost";
    const { isInternalTraffic } = await import("@/lib/analytics/is-internal-traffic");
    expect(isInternalTraffic()).toBe(true);
  });

  it("returns true on 127.0.0.1", async () => {
    // @ts-expect-error — stub
    globalThis.window.location.hostname = "127.0.0.1";
    const { isInternalTraffic } = await import("@/lib/analytics/is-internal-traffic");
    expect(isInternalTraffic()).toBe(true);
  });

  it("returns true when internal=true cookie present", async () => {
    // @ts-expect-error — stub
    globalThis.document.cookie = "foo=bar; internal=true; other=baz";
    const { isInternalTraffic } = await import("@/lib/analytics/is-internal-traffic");
    expect(isInternalTraffic()).toBe(true);
  });

  it("returns FALSE on real blog path + production hostname + no cookie", async () => {
    const { isInternalTraffic } = await import("@/lib/analytics/is-internal-traffic");
    expect(isInternalTraffic()).toBe(false);
  });

  it("returns FALSE for paths that merely contain 'hassan' mid-string (not at start)", async () => {
    // @ts-expect-error — stub
    globalThis.window.location.pathname = "/blog/hassan-and-the-pyramid";
    const { isInternalTraffic } = await import("@/lib/analytics/is-internal-traffic");
    expect(isInternalTraffic()).toBe(false);
  });

  it("returns FALSE when a cookie other than internal=true is set", async () => {
    // @ts-expect-error — stub
    globalThis.document.cookie = "foo=bar; theme=dark; session=abc123";
    const { isInternalTraffic } = await import("@/lib/analytics/is-internal-traffic");
    expect(isInternalTraffic()).toBe(false);
  });

  it("returns FALSE in SSR (no window)", async () => {
    // @ts-expect-error — stub
    delete globalThis.window;
    const { isInternalTraffic } = await import("@/lib/analytics/is-internal-traffic");
    expect(isInternalTraffic()).toBe(false);
  });

  it("does NOT treat 'internalSomething=true' as internal (word boundary)", async () => {
    // @ts-expect-error — stub
    globalThis.document.cookie = "internalUser=true";
    const { isInternalTraffic } = await import("@/lib/analytics/is-internal-traffic");
    expect(isInternalTraffic()).toBe(false);
  });
});
