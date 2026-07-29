import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// We need to reset module state between tests since kapso-client uses a module-scoped singleton.
// We also mock the @kapso/whatsapp-cloud-api module to avoid requiring the real SDK.
vi.mock("@kapso/whatsapp-cloud-api", () => ({
  WhatsAppClient: vi.fn().mockImplementation((config: unknown) => ({
    _config: config,
    sendMessage: vi.fn(),
  })),
}));

describe("kapso-client", () => {
  // Save original env and restore after each test
  const originalEnv = { ...process.env };

  beforeEach(async () => {
    // Reset env vars
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    delete process.env.KAPSO_API_KEY;
    delete process.env.KAPSO_PROXY_ENABLED;

    // Reset module cache so singleton is cleared
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("isKapsoConfigured()", () => {
    it("returns false when env vars not set", async () => {
      const { isKapsoConfigured } = await import(
        "../../lib/integrations/kapso-client"
      );
      expect(isKapsoConfigured()).toBe(false);
    });

    it("returns false when only WHATSAPP_ACCESS_TOKEN is set", async () => {
      process.env.WHATSAPP_ACCESS_TOKEN = "test-token";
      const { isKapsoConfigured } = await import(
        "../../lib/integrations/kapso-client"
      );
      expect(isKapsoConfigured()).toBe(false);
    });

    it("returns false when only WHATSAPP_PHONE_NUMBER_ID is set", async () => {
      process.env.WHATSAPP_PHONE_NUMBER_ID = "123456";
      const { isKapsoConfigured } = await import(
        "../../lib/integrations/kapso-client"
      );
      expect(isKapsoConfigured()).toBe(false);
    });

    it("returns true when WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_NUMBER_ID are set", async () => {
      process.env.WHATSAPP_ACCESS_TOKEN = "test-token";
      process.env.WHATSAPP_PHONE_NUMBER_ID = "123456";
      const { isKapsoConfigured } = await import(
        "../../lib/integrations/kapso-client"
      );
      expect(isKapsoConfigured()).toBe(true);
    });
  });

  describe("isKapsoProxyEnabled()", () => {
    it("returns false when KAPSO_API_KEY not set", async () => {
      const { isKapsoProxyEnabled } = await import(
        "../../lib/integrations/kapso-client"
      );
      expect(isKapsoProxyEnabled()).toBe(false);
    });

    it("returns false when KAPSO_API_KEY set but KAPSO_PROXY_ENABLED is not true", async () => {
      process.env.KAPSO_API_KEY = "kapso-key-123";
      process.env.KAPSO_PROXY_ENABLED = "false";
      const { isKapsoProxyEnabled } = await import(
        "../../lib/integrations/kapso-client"
      );
      expect(isKapsoProxyEnabled()).toBe(false);
    });

    it("returns false when KAPSO_PROXY_ENABLED is true but KAPSO_API_KEY missing", async () => {
      process.env.KAPSO_PROXY_ENABLED = "true";
      const { isKapsoProxyEnabled } = await import(
        "../../lib/integrations/kapso-client"
      );
      expect(isKapsoProxyEnabled()).toBe(false);
    });

    it('returns true when KAPSO_API_KEY set and KAPSO_PROXY_ENABLED is "true"', async () => {
      process.env.KAPSO_API_KEY = "kapso-key-123";
      process.env.KAPSO_PROXY_ENABLED = "true";
      const { isKapsoProxyEnabled } = await import(
        "../../lib/integrations/kapso-client"
      );
      expect(isKapsoProxyEnabled()).toBe(true);
    });
  });

  describe("getPhoneNumberId()", () => {
    it("returns empty string when env var not set", async () => {
      const { getPhoneNumberId } = await import(
        "../../lib/integrations/kapso-client"
      );
      expect(getPhoneNumberId()).toBe("");
    });

    it("returns the env var value when set", async () => {
      process.env.WHATSAPP_PHONE_NUMBER_ID = "987654321";
      const { getPhoneNumberId } = await import(
        "../../lib/integrations/kapso-client"
      );
      expect(getPhoneNumberId()).toBe("987654321");
    });
  });

  describe("resetKapsoClient()", () => {
    it("clears the singleton so next getKapsoClient creates a new instance", async () => {
      process.env.WHATSAPP_ACCESS_TOKEN = "test-token";
      process.env.WHATSAPP_PHONE_NUMBER_ID = "123456";

      const { getKapsoClient, resetKapsoClient } = await import(
        "../../lib/integrations/kapso-client"
      );

      const client1 = getKapsoClient();
      resetKapsoClient();
      const client2 = getKapsoClient();

      // After reset, a new instance should be created (not the same reference)
      expect(client1).not.toBe(client2);
    });
  });

  describe("getKapsoClient()", () => {
    it("throws when neither WHATSAPP_ACCESS_TOKEN nor KAPSO_API_KEY is configured", async () => {
      const { getKapsoClient } = await import(
        "../../lib/integrations/kapso-client"
      );
      expect(() => getKapsoClient()).toThrow(
        "Neither WHATSAPP_ACCESS_TOKEN nor KAPSO_API_KEY is configured"
      );
    });

    it("returns a WhatsAppClient instance in direct mode when access token is set", async () => {
      process.env.WHATSAPP_ACCESS_TOKEN = "test-token";
      process.env.WHATSAPP_PHONE_NUMBER_ID = "123456";

      const { getKapsoClient } = await import(
        "../../lib/integrations/kapso-client"
      );
      const client = getKapsoClient();
      expect(client).toBeDefined();
      expect(client).not.toBeNull();
    });

    it("returns the same singleton on second call", async () => {
      process.env.WHATSAPP_ACCESS_TOKEN = "test-token";
      process.env.WHATSAPP_PHONE_NUMBER_ID = "123456";

      const { getKapsoClient } = await import(
        "../../lib/integrations/kapso-client"
      );
      const client1 = getKapsoClient();
      const client2 = getKapsoClient();
      expect(client1).toBe(client2);
    });

    it("creates proxy-mode client when KAPSO_API_KEY and KAPSO_PROXY_ENABLED are set", async () => {
      process.env.KAPSO_API_KEY = "kapso-key-123";
      process.env.KAPSO_PROXY_ENABLED = "true";

      const { WhatsAppClient } = await import("@kapso/whatsapp-cloud-api");
      const { getKapsoClient } = await import(
        "../../lib/integrations/kapso-client"
      );

      getKapsoClient();

      // Check that WhatsAppClient was called with kapso proxy config
      expect(WhatsAppClient).toHaveBeenCalledWith(
        expect.objectContaining({
          kapsoApiKey: "kapso-key-123",
          baseUrl: "https://api.kapso.ai",
        })
      );
    });
  });
});
