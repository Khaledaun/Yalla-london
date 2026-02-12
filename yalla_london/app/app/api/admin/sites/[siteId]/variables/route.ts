/**
 * Per-Site Variable Vault API
 *
 * GET  — List all variables for a site (values masked)
 * PUT  — Save variables → encrypt to DB + sync to Vercel + update runtime
 *
 * Variables are stored in the Credential model (AES-256-GCM encrypted)
 * and optionally synced to Vercel as per-site env vars.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";
import { prisma } from "@/lib/db";
import { encrypt, decrypt, maskApiKey } from "@/lib/encryption";
import { syncToVercel, isVercelConfigured } from "@/lib/vercel-env-sync";

// ── Variable Definitions ────────────────────────────────────────────
// Each category defines the variables a site can have.
// "sensitive" values are encrypted; "plain" are stored as-is.

export interface VariableDefinition {
  key: string;
  label: string;
  category: string;
  description: string;
  sensitive: boolean;
  placeholder?: string;
  required?: boolean;
  syncToVercel?: boolean; // Whether to push to Vercel env vars
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
    description: "Full production URL including https:// (e.g., https://www.yalladubai.com)",
    sensitive: false,
    placeholder: "https://www.example.com",
    syncToVercel: true,
  },
  {
    key: "CUSTOM_DOMAIN",
    label: "Custom Domain",
    category: "Domain",
    description: "Custom domain (without protocol, e.g., www.yalladubai.com)",
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

// ── GET: List variables for a site ──────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { siteId } = await params;

  try {
    // Fetch all credentials for this site from DB
    const credentials = await prisma.credential.findMany({
      where: { site_id: siteId },
    });

    const credMap = new Map(credentials.map((c: any) => [c.name, c]));

    // Build response: definitions + current values (masked for sensitive)
    const variables = VARIABLE_DEFINITIONS.map((def) => {
      const cred = credMap.get(def.key) as any;
      let value = "";
      let maskedValue = "";
      let hasValue = false;

      if (cred && cred.encrypted_value) {
        hasValue = true;
        try {
          const decrypted = decrypt(cred.encrypted_value);
          maskedValue = def.sensitive ? maskApiKey(decrypted) : decrypted;
          // Only return actual value for non-sensitive fields
          value = def.sensitive ? "" : decrypted;
        } catch {
          maskedValue = "(decryption error)";
        }
      }

      return {
        ...def,
        value,
        maskedValue,
        hasValue,
        lastUpdated: cred?.updated_at || null,
      };
    });

    // Group by category
    const categories = [...new Set(VARIABLE_DEFINITIONS.map((d) => d.category))];
    const grouped = categories.map((cat) => ({
      category: cat,
      variables: variables.filter((v) => v.category === cat),
    }));

    return NextResponse.json({
      siteId,
      categories: grouped,
      vercelConfigured: isVercelConfigured(),
      totalVariables: VARIABLE_DEFINITIONS.length,
      configuredCount: variables.filter((v) => v.hasValue).length,
    });
  } catch (error) {
    console.error(`[variable-vault] GET error for ${siteId}:`, error);
    return NextResponse.json(
      { error: "Failed to load variables" },
      { status: 500 }
    );
  }
}

// ── PUT: Save variables → DB + Vercel + runtime ─────────────────────

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { siteId } = await params;

  try {
    const body = await request.json();
    const { variables } = body as {
      variables: { key: string; value: string }[];
    };

    if (!Array.isArray(variables)) {
      return NextResponse.json(
        { error: "variables must be an array of { key, value }" },
        { status: 400 }
      );
    }

    // Validate keys against definitions
    const validKeys = new Set(VARIABLE_DEFINITIONS.map((d) => d.key));
    const invalid = variables.filter((v) => !validKeys.has(v.key));
    if (invalid.length > 0) {
      return NextResponse.json(
        {
          error: `Unknown variable keys: ${invalid.map((v) => v.key).join(", ")}`,
        },
        { status: 400 }
      );
    }

    // ── 1. Save to Database (encrypted) ─────────────────────────────
    const dbResults: { key: string; status: string }[] = [];

    for (const { key, value } of variables) {
      if (!value && value !== "") continue; // Skip undefined

      const def = VARIABLE_DEFINITIONS.find((d) => d.key === key);
      if (!def) continue;

      try {
        if (value === "" || value === null) {
          // Delete credential if value is empty
          await prisma.credential.deleteMany({
            where: { site_id: siteId, name: key },
          });
          dbResults.push({ key, status: "deleted" });
        } else {
          // Upsert encrypted credential
          const encryptedValue = encrypt(value);

          const existing = await prisma.credential.findFirst({
            where: { site_id: siteId, name: key },
          });

          if (existing) {
            await prisma.credential.update({
              where: { id: existing.id },
              data: {
                encrypted_value: encryptedValue,
                type: def.sensitive ? "api_key" : "config",
                status: "active",
                last_used_at: new Date(),
              },
            });
          } else {
            await prisma.credential.create({
              data: {
                site_id: siteId,
                name: key,
                type: def.sensitive ? "api_key" : "config",
                encrypted_value: encryptedValue,
                status: "active",
              },
            });
          }

          dbResults.push({ key, status: "saved" });
        }
      } catch (dbErr) {
        console.error(`[variable-vault] DB error for ${key}:`, dbErr);
        dbResults.push({ key, status: "db_error" });
      }
    }

    // ── 2. Sync to Vercel ───────────────────────────────────────────
    const vercelVars = variables.filter((v) => {
      const def = VARIABLE_DEFINITIONS.find((d) => d.key === v.key);
      return def?.syncToVercel && v.value && v.value.trim();
    });

    const vercelResult = await syncToVercel(siteId, vercelVars);

    // ── 3. Update runtime config in SitePremium ─────────────────────
    // Store non-sensitive values in analytics_settings / seo_settings
    // so runtime code can read them without decrypting credentials
    try {
      const analyticsVars = variables.filter((v) =>
        ["GA4_PROPERTY_ID", "GA4_MEASUREMENT_ID", "GSC_SITE_URL"].includes(
          v.key
        )
      );
      const seoVars = variables.filter((v) =>
        ["INDEXNOW_KEY", "GOOGLE_SITE_VERIFICATION", "BING_SITE_VERIFICATION"].includes(
          v.key
        )
      );

      if (analyticsVars.length > 0 || seoVars.length > 0) {
        const existingSite = await prisma.sitePremium.findUnique({
          where: { siteId },
        });

        if (existingSite) {
          const updates: Record<string, any> = {};

          if (analyticsVars.length > 0) {
            const current = (existingSite.analytics_settings as any) || {};
            for (const v of analyticsVars) {
              current[v.key] = v.value || undefined;
            }
            updates.analytics_settings = current;
          }

          if (seoVars.length > 0) {
            const current = (existingSite.seo_settings as any) || {};
            for (const v of seoVars) {
              current[v.key] = v.value || undefined;
            }
            updates.seo_settings = current;
          }

          await prisma.sitePremium.update({
            where: { siteId },
            data: updates,
          });
        }
      }
    } catch (runtimeErr) {
      console.warn("[variable-vault] Runtime config update failed:", runtimeErr);
    }

    return NextResponse.json({
      success: true,
      siteId,
      database: {
        saved: dbResults.filter((r) => r.status === "saved").length,
        deleted: dbResults.filter((r) => r.status === "deleted").length,
        errors: dbResults.filter((r) => r.status === "db_error").length,
        details: dbResults,
      },
      vercel: vercelResult,
    });
  } catch (error) {
    console.error(`[variable-vault] PUT error for ${siteId}:`, error);
    return NextResponse.json(
      { error: "Failed to save variables" },
      { status: 500 }
    );
  }
}
