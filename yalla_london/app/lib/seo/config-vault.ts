/**
 * SEO Config Vault — fetches per-site SEO credentials from database.
 *
 * Separated from config/sites.ts to avoid pulling @/lib/db (and transitively
 * next/headers) into client-side pages that import site configuration.
 *
 * Uses DB credentials table with decryption for sensitive values like
 * GSC, GA4, and IndexNow keys. Falls back to env vars if DB unavailable.
 */
import { getSiteSeoConfig } from "@/config/sites";

/**
 * Fetch SEO configuration with database credential vault support.
 *
 * Checks the Credential table (encrypted) first, then falls back to env vars.
 * This allows per-site overrides without redeploying.
 *
 * Lookup order: DB Credential → per-site env var → global env var → default
 */
export async function getSiteSeoConfigFromVault(siteId: string): Promise<{
  gscSiteUrl: string;
  ga4PropertyId: string;
  ga4MeasurementId: string;
  siteUrl: string;
  indexNowKey: string;
}> {
  // Start with env-based config
  const envConfig = getSiteSeoConfig(siteId);

  try {
    const { prisma } = await import("@/lib/db");
    const { decrypt } = await import("@/lib/encryption");

    // Fetch all credentials for this site in one query
    const credentials = await prisma.credential.findMany({
      where: { site_id: siteId, status: "active" },
      select: { name: true, encrypted_value: true },
    });

    if (credentials.length === 0) return envConfig;

    const credMap = new Map<string, string>();
    for (const cred of credentials) {
      try {
        credMap.set(cred.name, decrypt(cred.encrypted_value));
      } catch {
        // Skip credentials that fail to decrypt
      }
    }

    // DB values override env-based config
    return {
      gscSiteUrl: credMap.get("GSC_SITE_URL") || envConfig.gscSiteUrl,
      ga4PropertyId: credMap.get("GA4_PROPERTY_ID") || envConfig.ga4PropertyId,
      ga4MeasurementId: credMap.get("GA4_MEASUREMENT_ID") || envConfig.ga4MeasurementId,
      siteUrl: credMap.get("SITE_URL") || envConfig.siteUrl,
      indexNowKey: credMap.get("INDEXNOW_KEY") || envConfig.indexNowKey,
    };
  } catch {
    // DB unavailable — fall back to env config
    return envConfig;
  }
}
