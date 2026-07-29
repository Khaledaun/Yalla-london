/**
 * Per-Site Variable Vault API
 *
 * GET  — List all variables for a site (values masked)
 * PUT  — Save variables → encrypt to DB + sync to Vercel + update runtime
 *
 * Variables are stored in the Credential model (AES-256-GCM encrypted)
 * and optionally synced to Vercel as per-site env vars.
 */
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";
import { prisma } from "@/lib/db";
import { encrypt, decrypt, maskApiKey } from "@/lib/encryption";
import { syncToVercel, isVercelConfigured } from "@/lib/vercel-env-sync";
import { VARIABLE_DEFINITIONS } from "@/lib/variable-definitions";

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
