/**
 * Kapso WhatsApp Client — Singleton factory
 *
 * Wraps @kapso/whatsapp-cloud-api SDK with env-var driven configuration.
 * Two modes:
 *   - Direct: graph.facebook.com (default)
 *   - Proxy:  api.kapso.ai (when KAPSO_API_KEY + KAPSO_PROXY_ENABLED=true)
 *
 * Env vars:
 *   WHATSAPP_ACCESS_TOKEN       — Meta Business API access token (required)
 *   WHATSAPP_PHONE_NUMBER_ID    — Meta Business phone number ID (required)
 *   KAPSO_API_KEY               — Kapso proxy API key (optional)
 *   KAPSO_PROXY_ENABLED         — "true" to route via api.kapso.ai (optional)
 */

import { WhatsAppClient } from "@kapso/whatsapp-cloud-api";

// ---------------------------------------------------------------------------
// Module-scoped singleton
// ---------------------------------------------------------------------------

let _client: WhatsAppClient | null = null;

/**
 * Returns true if the minimum WhatsApp credentials are configured.
 * Same logic as the existing `isWhatsAppConfigured()` in whatsapp.ts.
 */
export function isKapsoConfigured(): boolean {
  return !!(
    process.env.WHATSAPP_ACCESS_TOKEN &&
    process.env.WHATSAPP_PHONE_NUMBER_ID
  );
}

/**
 * Returns the phone number ID from env. Used by callers that need to pass
 * it to SDK methods (every message send requires phoneNumberId).
 */
export function getPhoneNumberId(): string {
  return process.env.WHATSAPP_PHONE_NUMBER_ID || "";
}

/**
 * Returns true if Kapso proxy mode is active.
 */
export function isKapsoProxyEnabled(): boolean {
  return !!(
    process.env.KAPSO_API_KEY &&
    process.env.KAPSO_PROXY_ENABLED === "true"
  );
}

/**
 * Get or create the singleton WhatsAppClient.
 *
 * - If KAPSO_API_KEY + KAPSO_PROXY_ENABLED=true → proxy mode (api.kapso.ai)
 * - Else → direct mode (graph.facebook.com via Meta access token)
 *
 * Throws if neither access token nor Kapso API key is configured.
 */
export function getKapsoClient(): WhatsAppClient {
  if (_client) return _client;

  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const kapsoApiKey = process.env.KAPSO_API_KEY;
  const proxyEnabled = process.env.KAPSO_PROXY_ENABLED === "true";

  if (!accessToken && !kapsoApiKey) {
    throw new Error(
      "[kapso-client] Neither WHATSAPP_ACCESS_TOKEN nor KAPSO_API_KEY is configured",
    );
  }

  if (kapsoApiKey && proxyEnabled) {
    // Proxy mode — route through Kapso
    _client = new WhatsAppClient({
      kapsoApiKey,
      baseUrl: "https://api.kapso.ai",
    });
  } else {
    // Direct mode — Meta Graph API
    _client = new WhatsAppClient({
      accessToken: accessToken || "",
    });
  }

  return _client;
}

/**
 * Reset the singleton (useful for tests or config changes).
 */
export function resetKapsoClient(): void {
  _client = null;
}
