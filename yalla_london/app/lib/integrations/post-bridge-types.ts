/**
 * Post Bridge API — TypeScript types
 *
 * Derived from Post Bridge REST API documentation (https://api.post-bridge.com).
 * Used by post-bridge-client.ts and scheduler.ts.
 */

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface PostBridgeConfig {
  apiKey: string;
  baseUrl: string; // default: https://api.post-bridge.com
}

// ---------------------------------------------------------------------------
// Platform
// ---------------------------------------------------------------------------

export type PostBridgePlatform =
  | "twitter"
  | "instagram"
  | "linkedin"
  | "facebook"
  | "tiktok"
  | "youtube"
  | "bluesky"
  | "threads"
  | "pinterest";

// ---------------------------------------------------------------------------
// Social Accounts
// ---------------------------------------------------------------------------

export interface SocialAccount {
  id: string;
  platform: PostBridgePlatform;
  username: string;
  profile_image_url?: string;
  connected: boolean;
}

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------

export interface CreatePostRequest {
  caption: string;
  social_account_ids: string[];
  media_ids?: string[];
  media_urls?: string[];
  scheduled_at?: string; // ISO 8601 — omit for instant publish
  platform_config?: Record<string, unknown>;
  is_draft?: boolean;
}

export interface CreatePostResponse {
  id: string;
  status: "scheduled" | "published" | "draft" | "failed";
  published_url?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------

export interface MediaUploadUrlResponse {
  upload_url: string;
  media_id: string;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class PostBridgeError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public apiError?: unknown,
  ) {
    super(message);
    this.name = "PostBridgeError";
  }
}
