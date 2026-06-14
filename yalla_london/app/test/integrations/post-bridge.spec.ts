import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("post-bridge-client", () => {
  const originalEnv = { ...process.env };

  beforeEach(async () => {
    delete process.env.POST_BRIDGE_API_KEY;
    delete process.env.POST_BRIDGE_BASE_URL;
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("isPostBridgeConfigured()", () => {
    it("returns false when POST_BRIDGE_API_KEY not set", async () => {
      const { isPostBridgeConfigured } = await import(
        "../../lib/integrations/post-bridge-client"
      );
      expect(isPostBridgeConfigured()).toBe(false);
    });

    it("returns true when POST_BRIDGE_API_KEY is set", async () => {
      process.env.POST_BRIDGE_API_KEY = "pb-test-key-123";
      const { isPostBridgeConfigured } = await import(
        "../../lib/integrations/post-bridge-client"
      );
      expect(isPostBridgeConfigured()).toBe(true);
    });
  });

  describe("getPostBridgeClient()", () => {
    it("returns null when not configured", async () => {
      const { getPostBridgeClient } = await import(
        "../../lib/integrations/post-bridge-client"
      );
      expect(getPostBridgeClient()).toBeNull();
    });

    it("returns PostBridgeClient instance when configured", async () => {
      process.env.POST_BRIDGE_API_KEY = "pb-test-key-123";
      const { getPostBridgeClient, PostBridgeClient } = await import(
        "../../lib/integrations/post-bridge-client"
      );
      const client = getPostBridgeClient();
      expect(client).not.toBeNull();
      expect(client).toBeInstanceOf(PostBridgeClient);
    });

    it("returns the same singleton on second call", async () => {
      process.env.POST_BRIDGE_API_KEY = "pb-test-key-123";
      const { getPostBridgeClient } = await import(
        "../../lib/integrations/post-bridge-client"
      );
      const client1 = getPostBridgeClient();
      const client2 = getPostBridgeClient();
      expect(client1).toBe(client2);
    });

    it("uses default base URL when POST_BRIDGE_BASE_URL not set", async () => {
      process.env.POST_BRIDGE_API_KEY = "pb-test-key-123";
      const { getPostBridgeClient } = await import(
        "../../lib/integrations/post-bridge-client"
      );
      const client = getPostBridgeClient();
      // Access private config via any cast — acceptable in tests
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const config = (client as any).config;
      expect(config.baseUrl).toBe("https://api.post-bridge.com");
    });

    it("uses custom base URL when POST_BRIDGE_BASE_URL is set", async () => {
      process.env.POST_BRIDGE_API_KEY = "pb-test-key-123";
      process.env.POST_BRIDGE_BASE_URL = "https://custom.post-bridge.dev";
      const { getPostBridgeClient } = await import(
        "../../lib/integrations/post-bridge-client"
      );
      const client = getPostBridgeClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const config = (client as any).config;
      expect(config.baseUrl).toBe("https://custom.post-bridge.dev");
    });
  });

  describe("resetPostBridgeClient()", () => {
    it("clears the singleton so next call creates a new instance", async () => {
      process.env.POST_BRIDGE_API_KEY = "pb-test-key-123";
      const { getPostBridgeClient, resetPostBridgeClient } = await import(
        "../../lib/integrations/post-bridge-client"
      );

      const client1 = getPostBridgeClient();
      resetPostBridgeClient();
      const client2 = getPostBridgeClient();

      expect(client1).not.toBe(client2);
    });
  });
});

describe("post-bridge-types", () => {
  describe("PostBridgeError", () => {
    it("has correct name property", async () => {
      const { PostBridgeError } = await import(
        "../../lib/integrations/post-bridge-types"
      );
      const err = new PostBridgeError("test error", 422);
      expect(err.name).toBe("PostBridgeError");
    });

    it("stores statusCode correctly", async () => {
      const { PostBridgeError } = await import(
        "../../lib/integrations/post-bridge-types"
      );
      const err = new PostBridgeError("unauthorized", 401);
      expect(err.statusCode).toBe(401);
      expect(err.message).toBe("unauthorized");
    });

    it("stores apiError when provided", async () => {
      const { PostBridgeError } = await import(
        "../../lib/integrations/post-bridge-types"
      );
      const apiErr = { code: "INVALID_CONTENT", detail: "Caption too long" };
      const err = new PostBridgeError("validation failed", 422, apiErr);
      expect(err.apiError).toEqual(apiErr);
    });

    it("is an instance of Error", async () => {
      const { PostBridgeError } = await import(
        "../../lib/integrations/post-bridge-types"
      );
      const err = new PostBridgeError("test", 500);
      expect(err).toBeInstanceOf(Error);
    });
  });

  describe("PostBridgePlatform type", () => {
    it("covers 9 platforms as defined in the type file", async () => {
      // We verify by reading the source file content since TypeScript types
      // are erased at runtime. The type file defines exactly 9 platform strings.
      const fs = await import("fs");
      const path = await import("path");
      const content = fs.readFileSync(
        path.resolve(__dirname, "../../lib/integrations/post-bridge-types.ts"),
        "utf-8"
      );

      const platforms = [
        "twitter",
        "instagram",
        "linkedin",
        "facebook",
        "tiktok",
        "youtube",
        "bluesky",
        "threads",
        "pinterest",
      ];

      for (const platform of platforms) {
        expect(content).toContain(`"${platform}"`);
      }
    });
  });
});
