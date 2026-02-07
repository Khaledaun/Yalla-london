/**
 * SEO Environment Variable Validation
 *
 * Validates all required and optional env vars for SEO services.
 * Called at startup / health check to catch misconfigurations early.
 */

interface EnvVarCheck {
  name: string;
  required: boolean;
  description: string;
  present: boolean;
  value?: string; // Only for non-sensitive vars
}

interface SEOEnvValidationResult {
  valid: boolean;
  critical: EnvVarCheck[];
  recommended: EnvVarCheck[];
  warnings: string[];
}

export function validateSEOEnvironment(): SEOEnvValidationResult {
  const warnings: string[] = [];

  // Critical env vars - required for core SEO functionality
  const critical: EnvVarCheck[] = [
    {
      name: "INDEXNOW_KEY",
      required: true,
      description: "IndexNow API key for Bing/Yandex instant indexing",
      present: !!process.env.INDEXNOW_KEY,
    },
    {
      name: "CRON_SECRET",
      required: process.env.NODE_ENV === "production",
      description: "Secret for authenticating cron job requests",
      present: !!process.env.CRON_SECRET,
    },
    {
      name: "NEXT_PUBLIC_SITE_URL",
      required: true,
      description: "Public site URL for sitemap and canonical URLs",
      present: !!process.env.NEXT_PUBLIC_SITE_URL,
      value: process.env.NEXT_PUBLIC_SITE_URL,
    },
  ];

  // Recommended env vars - needed for full autonomous operation
  const recommended: EnvVarCheck[] = [
    {
      name: "GA4_PROPERTY_ID",
      required: false,
      description: "GA4 property ID for analytics data fetching",
      present: !!process.env.GA4_PROPERTY_ID,
    },
    {
      name: "GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL",
      required: false,
      description: "GSC service account email for indexing API",
      present: !!(
        process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL ||
        process.env.GSC_CLIENT_EMAIL
      ),
    },
    {
      name: "GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY",
      required: false,
      description: "GSC service account private key",
      present: !!(
        process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY ||
        process.env.GSC_PRIVATE_KEY
      ),
    },
    {
      name: "GSC_SITE_URL",
      required: false,
      description: "Google Search Console property URL",
      present: !!process.env.GSC_SITE_URL,
      value: process.env.GSC_SITE_URL,
    },
    {
      name: "NEXT_PUBLIC_GA_MEASUREMENT_ID",
      required: false,
      description: "Google Analytics 4 measurement ID",
      present: !!(
        process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ||
        process.env.GA4_MEASUREMENT_ID
      ),
    },
    {
      name: "NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION",
      required: false,
      description: "Google Search Console verification code",
      present: !!process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    },
  ];

  // Generate warnings
  const missingCritical = critical.filter((v) => v.required && !v.present);
  const missingRecommended = recommended.filter((v) => !v.present);

  if (missingCritical.length > 0) {
    warnings.push(
      `Missing critical SEO env vars: ${missingCritical.map((v) => v.name).join(", ")}`,
    );
  }

  if (missingRecommended.length > 0) {
    warnings.push(
      `Missing recommended SEO env vars: ${missingRecommended.map((v) => v.name).join(", ")}`,
    );
  }

  // Check for GSC credentials completeness
  const hasGSCEmail = !!(
    process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL ||
    process.env.GSC_CLIENT_EMAIL
  );
  const hasGSCKey = !!(
    process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY || process.env.GSC_PRIVATE_KEY
  );
  if (hasGSCEmail !== hasGSCKey) {
    warnings.push(
      "GSC credentials incomplete: both CLIENT_EMAIL and PRIVATE_KEY must be set together",
    );
  }

  const valid = missingCritical.length === 0;

  return { valid, critical, recommended, warnings };
}

/**
 * Log SEO environment validation results at startup
 */
export function logSEOEnvironmentStatus(): void {
  const result = validateSEOEnvironment();

  if (result.valid) {
    console.log("[SEO] Environment validation passed");
  } else {
    console.error("[SEO] Environment validation FAILED:");
    result.warnings.forEach((w) => console.error(`  - ${w}`));
  }

  const presentCritical = result.critical.filter((v) => v.present).length;
  const presentRecommended = result.recommended.filter((v) => v.present).length;
  console.log(
    `[SEO] Env vars: ${presentCritical}/${result.critical.length} critical, ${presentRecommended}/${result.recommended.length} recommended`,
  );
}
