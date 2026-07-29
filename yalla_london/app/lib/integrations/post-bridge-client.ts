/**
 * Post Bridge API Client
 *
 * Typed HTTP client for the Post Bridge social media scheduling REST API.
 * Singleton factory with env-var driven config.
 *
 * Env vars:
 *   POST_BRIDGE_API_KEY   — API key from Post Bridge dashboard (required)
 *   POST_BRIDGE_BASE_URL  — Override base URL (optional, default: https://api.post-bridge.com)
 */

import type {
  PostBridgeConfig,
  SocialAccount,
  CreatePostRequest,
  CreatePostResponse,
  MediaUploadUrlResponse,
} from "./post-bridge-types";
import { PostBridgeError } from "./post-bridge-types";

// ---------------------------------------------------------------------------
// Client class
// ---------------------------------------------------------------------------

export class PostBridgeClient {
  private readonly config: PostBridgeConfig;

  constructor(config: PostBridgeConfig) {
    this.config = config;
  }

  // ── Accounts ────────────────────────────────────────────────────

  /** List all connected social accounts. */
  async getAccounts(): Promise<SocialAccount[]> {
    return this.fetch<SocialAccount[]>("GET", "/v1/social-accounts");
  }

  // ── Media ───────────────────────────────────────────────────────

  /** Request a signed upload URL for a media file. */
  async createMediaUploadUrl(
    fileName: string,
    contentType: string,
  ): Promise<MediaUploadUrlResponse> {
    return this.fetch<MediaUploadUrlResponse>("POST", "/v1/media/create-upload-url", {
      file_name: fileName,
      content_type: contentType,
    });
  }

  /** Upload a file buffer to the signed upload URL. */
  async uploadMedia(
    uploadUrl: string,
    fileBuffer: Buffer,
    contentType: string,
  ): Promise<void> {
    const res = await globalThis.fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: fileBuffer,
    });
    if (!res.ok) {
      throw new PostBridgeError(
        `Media upload failed: ${res.status}`,
        res.status,
      );
    }
  }

  // ── Posts ────────────────────────────────────────────────────────

  /** Create (publish or schedule) a post. */
  async createPost(request: CreatePostRequest): Promise<CreatePostResponse> {
    return this.fetch<CreatePostResponse>("POST", "/v1/posts", request);
  }

  // ── Internal HTTP helper ────────────────────────────────────────

  private async fetch<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.config.baseUrl}${path}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.config.apiKey}`,
      "Content-Type": "application/json",
    };

    const init: RequestInit = { method, headers };
    if (body) {
      init.body = JSON.stringify(body);
    }

    const res = await globalThis.fetch(url, init);

    if (!res.ok) {
      let apiError: unknown;
      try {
        apiError = await res.json();
      } catch {
        apiError = await res.text().catch(() => undefined);
      }

      const message = mapErrorMessage(res.status, apiError);
      throw new PostBridgeError(message, res.status, apiError);
    }

    return (await res.json()) as T;
  }
}

// ---------------------------------------------------------------------------
// Error mapping
// ---------------------------------------------------------------------------

function mapErrorMessage(status: number, apiError: unknown): string {
  switch (status) {
    case 401:
      return "Post Bridge API key invalid or expired";
    case 403:
      return "Platform not connected or insufficient permissions";
    case 404:
      return "Social account not found in Post Bridge";
    case 422:
      return "Invalid post content (check platform requirements)";
    case 429: {
      const retryAfter =
        typeof apiError === "object" && apiError !== null
          ? (apiError as Record<string, unknown>).retry_after
          : undefined;
      return retryAfter
        ? `Rate limited — retry after ${retryAfter}s`
        : "Rate limited by Post Bridge";
    }
    default:
      return `Post Bridge API error ${status}`;
  }
}

// ---------------------------------------------------------------------------
// Singleton factory
// ---------------------------------------------------------------------------

let _client: PostBridgeClient | null = null;

/**
 * Returns true if POST_BRIDGE_API_KEY is set.
 */
export function isPostBridgeConfigured(): boolean {
  return !!process.env.POST_BRIDGE_API_KEY;
}

/**
 * Get or create the singleton PostBridgeClient.
 * Returns null if POST_BRIDGE_API_KEY is not configured.
 */
export function getPostBridgeClient(): PostBridgeClient | null {
  if (!isPostBridgeConfigured()) return null;

  if (_client) return _client;

  _client = new PostBridgeClient({
    apiKey: process.env.POST_BRIDGE_API_KEY!,
    baseUrl: process.env.POST_BRIDGE_BASE_URL || "https://api.post-bridge.com",
  });

  return _client;
}

/**
 * Reset the singleton (useful for tests or config changes).
 */
export function resetPostBridgeClient(): void {
  _client = null;
}
