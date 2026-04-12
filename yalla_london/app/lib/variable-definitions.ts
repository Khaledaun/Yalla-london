/**
 * Per-Site Variable Definitions
 *
 * Defines all configurable variables for the Variable Vault.
 * Each category groups related credentials/settings a site can have.
 */

export interface VariableDefinition {
  key: string;
  label: string;
  category: string;
  description: string;
  sensitive: boolean;
  placeholder?: string;
  required?: boolean;
  syncToVercel?: boolean;
}

export const VARIABLE_DEFINITIONS: VariableDefinition[] = [
  // ── Analytics ─────────────────────────────────────────────────────
  {
    key: "GA4_PROPERTY_ID",
    label: "GA4 Property ID",
    category: "Analytics",
    description: "Google Analytics 4 property ID (e.g., 123456789)",
    sensitive: false,
    placeholder: "123456789",
    syncToVercel: true,
  },
  {
    key: "GA4_MEASUREMENT_ID",
    label: "GA4 Measurement ID",
    category: "Analytics",
    description: "GA4 measurement ID for client-side tracking (e.g., G-XXXXXXXXXX)",
    sensitive: false,
    placeholder: "G-XXXXXXXXXX",
    syncToVercel: true,
  },
  {
    key: "GSC_SITE_URL",
    label: "GSC Site URL",
    category: "Analytics",
    description: "Google Search Console property URL (e.g., sc-domain:example.com)",
    sensitive: false,
    placeholder: "sc-domain:example.com",
    syncToVercel: true,
  },
  {
    key: "GSC_CLIENT_EMAIL",
    label: "GSC Service Account Email",
    category: "Analytics",
    description: "Google service account email for GSC API access",
    sensitive: false,
    placeholder: "name@project.iam.gserviceaccount.com",
    syncToVercel: true,
  },
  {
    key: "GSC_PRIVATE_KEY",
    label: "GSC Private Key",
    category: "Analytics",
    description: "Google service account private key (PEM format)",
    sensitive: true,
    placeholder: "-----BEGIN PRIVATE KEY-----\\n...",
    syncToVercel: true,
  },

  // ── SEO & Indexing ────────────────────────────────────────────────
  {
    key: "INDEXNOW_KEY",
    label: "IndexNow API Key",
    category: "SEO",
    description: "IndexNow key for instant search engine indexing",
    sensitive: false,
    placeholder: "your-indexnow-key",
    syncToVercel: true,
  },
  {
    key: "GOOGLE_SITE_VERIFICATION",
    label: "Google Site Verification",
    category: "SEO",
    description: "Google Search Console verification meta tag content",
    sensitive: false,
    placeholder: "verification-code",
    syncToVercel: true,
  },
  {
    key: "BING_SITE_VERIFICATION",
    label: "Bing Site Verification",
    category: "SEO",
    description: "Bing Webmaster Tools verification code",
    sensitive: false,
    placeholder: "verification-code",
    syncToVercel: true,
  },

  // ── AI Providers ──────────────────────────────────────────────────
  {
    key: "OPENAI_API_KEY",
    label: "OpenAI API Key",
    category: "AI Providers",
    description: "OpenAI API key for GPT content generation",
    sensitive: true,
    placeholder: "sk-...",
    syncToVercel: true,
  },
  {
    key: "ANTHROPIC_API_KEY",
    label: "Claude API Key",
    category: "AI Providers",
    description: "Anthropic API key for Claude content generation",
    sensitive: true,
    placeholder: "sk-ant-...",
    syncToVercel: true,
  },
  {
    key: "GEMINI_API_KEY",
    label: "Google Gemini API Key",
    category: "AI Providers",
    description: "Google Gemini API key",
    sensitive: true,
    placeholder: "AI...",
    syncToVercel: true,
  },

  // ── Affiliate IDs ─────────────────────────────────────────────────
  {
    key: "BOOKING_AFFILIATE_ID",
    label: "Booking.com Affiliate ID",
    category: "Affiliates",
    description: "Booking.com affiliate partner ID for hotel links",
    sensitive: false,
    placeholder: "1234567",
    syncToVercel: true,
  },
  {
    key: "AGODA_AFFILIATE_ID",
    label: "Agoda Affiliate ID",
    category: "Affiliates",
    description: "Agoda affiliate CID for hotel links",
    sensitive: false,
    placeholder: "1234567",
    syncToVercel: true,
  },
  {
    key: "GETYOURGUIDE_AFFILIATE_ID",
    label: "GetYourGuide Partner ID",
    category: "Affiliates",
    description: "GetYourGuide affiliate partner ID for activity links",
    sensitive: false,
    placeholder: "ABC123",
    syncToVercel: true,
  },
  {
    key: "VIATOR_AFFILIATE_ID",
    label: "Viator Affiliate ID",
    category: "Affiliates",
    description: "Viator affiliate partner ID for tours and activities",
    sensitive: false,
    placeholder: "12345",
    syncToVercel: true,
  },
  {
    key: "THEFORK_AFFILIATE_ID",
    label: "TheFork Affiliate ID",
    category: "Affiliates",
    description: "TheFork/TripAdvisor restaurant affiliate ID",
    sensitive: false,
    placeholder: "ABC123",
    syncToVercel: true,
  },
  {
    key: "OPENTABLE_AFFILIATE_ID",
    label: "OpenTable Affiliate ID",
    category: "Affiliates",
    description: "OpenTable restaurant affiliate ID",
    sensitive: false,
    placeholder: "12345",
    syncToVercel: true,
  },

  // ── Domain & Branding ─────────────────────────────────────────────
  {
    key: "SITE_URL",
    label: "Production URL",
    category: "Domain",
    description: "Full production URL including https:// (e.g., https://www.yalla-london.com)",
    sensitive: false,
    placeholder: "https://www.example.com",
    syncToVercel: true,
  },
  {
    key: "CUSTOM_DOMAIN",
    label: "Custom Domain",
    category: "Domain",
    description: "Custom domain (without protocol, e.g., www.yalla-london.com)",
    sensitive: false,
    placeholder: "www.example.com",
    syncToVercel: false,
  },

  // ── Social Media ──────────────────────────────────────────────────
  {
    key: "INSTAGRAM_ACCESS_TOKEN",
    label: "Instagram Access Token",
    category: "Social",
    description: "Instagram Graph API long-lived access token",
    sensitive: true,
    placeholder: "IGQ...",
    syncToVercel: true,
  },
  {
    key: "TIKTOK_ACCESS_TOKEN",
    label: "TikTok Access Token",
    category: "Social",
    description: "TikTok API access token for content publishing",
    sensitive: true,
    placeholder: "act...",
    syncToVercel: true,
  },
  {
    key: "TWITTER_API_KEY",
    label: "Twitter/X API Key",
    category: "Social",
    description: "Twitter/X API key for social posting",
    sensitive: true,
    placeholder: "...",
    syncToVercel: true,
  },
];
