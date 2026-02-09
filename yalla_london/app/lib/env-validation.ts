/**
 * Environment variable validation
 * Import this in layout.tsx or instrumentation.ts to validate at startup
 */

const REQUIRED_ENV_VARS = [
  "DATABASE_URL",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
] as const;

const RECOMMENDED_ENV_VARS = [
  "ADMIN_EMAILS",
  "OPENAI_API_KEY",
  "INDEXNOW_KEY",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
] as const;

const AFFILIATE_ENV_VARS = [
  "BOOKING_AFFILIATE_ID",
  "AGODA_AFFILIATE_ID",
  "THEFORK_AFFILIATE_ID",
  "OPENTABLE_AFFILIATE_ID",
  "GETYOURGUIDE_AFFILIATE_ID",
  "VIATOR_AFFILIATE_ID",
  "STUBHUB_AFFILIATE_ID",
  "TICKETMASTER_AFFILIATE_ID",
  "BLACKLANE_AFFILIATE_ID",
] as const;

export function validateEnv() {
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const key of REQUIRED_ENV_VARS) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  for (const key of RECOMMENDED_ENV_VARS) {
    if (!process.env[key]) {
      warnings.push(key);
    }
  }

  const missingAffiliates = AFFILIATE_ENV_VARS.filter(
    (key) => !process.env[key],
  );

  if (missing.length > 0) {
    console.error(
      `[ENV] CRITICAL: Missing required environment variables: ${missing.join(", ")}`,
    );
  }

  if (warnings.length > 0) {
    console.warn(
      `[ENV] Warning: Missing recommended environment variables: ${warnings.join(", ")}`,
    );
  }

  if (missingAffiliates.length > 0) {
    console.warn(
      `[ENV] Warning: Missing affiliate IDs (revenue impact): ${missingAffiliates.join(", ")}`,
    );
  }

  return { missing, warnings, missingAffiliates };
}
