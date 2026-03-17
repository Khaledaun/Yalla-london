/**
 * Email Merge-Tag Personalization
 *
 * Replaces merge tags like {{first_name}}, {{email}}, {{unsubscribe_url}}
 * in rendered email HTML and plain text before sending.
 *
 * Usage:
 *   const html = applyMergeTags(renderedHtml, {
 *     first_name: "Khaled",
 *     last_name: "Aun",
 *     email: "khaled@example.com",
 *     site_name: "Yalla London",
 *   });
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MergeTagContext {
  /** Subscriber first name */
  first_name?: string | null;
  /** Subscriber last name */
  last_name?: string | null;
  /** Subscriber email address */
  email?: string;
  /** Full name (first + last) — auto-computed if not provided */
  full_name?: string | null;
  /** Site brand name */
  site_name?: string;
  /** Site domain */
  site_domain?: string;
  /** Unsubscribe URL */
  unsubscribe_url?: string;
  /** Current year */
  current_year?: string;
  /** Any additional custom tags */
  [key: string]: string | null | undefined;
}

// ---------------------------------------------------------------------------
// Default fallbacks for missing values
// ---------------------------------------------------------------------------

const DEFAULT_FALLBACKS: Record<string, string> = {
  first_name: "there",           // "Hi there" when no name
  last_name: "",
  full_name: "Valued Reader",
  email: "",
  site_name: "Zenitha",
  site_domain: "",
  unsubscribe_url: "#",
  current_year: new Date().getFullYear().toString(),
};

// ---------------------------------------------------------------------------
// Core Function
// ---------------------------------------------------------------------------

/**
 * Replace all `{{tag_name}}` patterns in the given text with values from context.
 * Handles whitespace variations: `{{ first_name }}`, `{{first_name}}`, etc.
 * Falls back to sensible defaults when values are missing/null.
 */
export function applyMergeTags(
  text: string,
  context: MergeTagContext,
): string {
  if (!text) return text;

  // Auto-compute full_name if not provided
  const resolvedContext: MergeTagContext = {
    ...context,
    current_year: context.current_year || new Date().getFullYear().toString(),
  };

  if (!resolvedContext.full_name) {
    const first = resolvedContext.first_name?.trim() || "";
    const last = resolvedContext.last_name?.trim() || "";
    const combined = [first, last].filter(Boolean).join(" ");
    resolvedContext.full_name = combined || null;
  }

  // Replace all {{tag}} patterns
  return text.replace(
    /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g,
    (_match, tagName: string) => {
      const key = tagName.toLowerCase();
      const value = resolvedContext[key];

      // Use the value if it's a non-empty string
      if (value !== null && value !== undefined && value !== "") {
        return value;
      }

      // Fall back to defaults
      return DEFAULT_FALLBACKS[key] ?? "";
    },
  );
}

// ---------------------------------------------------------------------------
// Helper: Build context from a Subscriber record
// ---------------------------------------------------------------------------

/**
 * Build a MergeTagContext from a subscriber DB record and site config.
 */
export function buildMergeTagContext(
  subscriber: {
    email: string;
    first_name?: string | null;
    last_name?: string | null;
  },
  options?: {
    siteName?: string;
    siteDomain?: string;
    unsubscribeUrl?: string;
  },
): MergeTagContext {
  return {
    first_name: subscriber.first_name || null,
    last_name: subscriber.last_name || null,
    email: subscriber.email,
    site_name: options?.siteName,
    site_domain: options?.siteDomain,
    unsubscribe_url: options?.unsubscribeUrl,
  };
}

// ---------------------------------------------------------------------------
// Helper: Preview merge tags (for test sends)
// ---------------------------------------------------------------------------

/**
 * Build a preview context with sample data for test sends.
 * Shows what the email will look like with real merge tags filled in.
 */
export function buildPreviewContext(
  recipientEmail: string,
  siteName?: string,
): MergeTagContext {
  return {
    first_name: "Preview",
    last_name: "User",
    email: recipientEmail,
    full_name: "Preview User",
    site_name: siteName || "Yalla London",
    site_domain: "",
    unsubscribe_url: "#preview-unsubscribe",
    current_year: new Date().getFullYear().toString(),
  };
}

// ---------------------------------------------------------------------------
// Available tags list (for UI display)
// ---------------------------------------------------------------------------

export const AVAILABLE_MERGE_TAGS = [
  { tag: "{{first_name}}", description: "Subscriber's first name", fallback: "there" },
  { tag: "{{last_name}}", description: "Subscriber's last name", fallback: "" },
  { tag: "{{full_name}}", description: "Full name (first + last)", fallback: "Valued Reader" },
  { tag: "{{email}}", description: "Subscriber's email address", fallback: "" },
  { tag: "{{site_name}}", description: "Site brand name", fallback: "Zenitha" },
  { tag: "{{site_domain}}", description: "Site domain", fallback: "" },
  { tag: "{{unsubscribe_url}}", description: "Unsubscribe link URL", fallback: "#" },
  { tag: "{{current_year}}", description: "Current year", fallback: new Date().getFullYear().toString() },
] as const;
