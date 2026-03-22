import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";

export const dynamic = "force-dynamic";

const REQUIRED_VARS = [
  { key: "DATABASE_URL", category: "Database" },
  { key: "DIRECT_URL", category: "Database" },
  { key: "XAI_API_KEY", category: "AI", alt: "GROK_API_KEY" },
  { key: "OPENAI_API_KEY", category: "AI" },
  { key: "INDEXNOW_KEY", category: "SEO" },
  { key: "GA4_PROPERTY_ID", category: "Analytics" },
  { key: "GA4_MEASUREMENT_ID", category: "Analytics", alt: "NEXT_PUBLIC_GA_MEASUREMENT_ID" },
  { key: "GA4_API_SECRET", category: "Analytics" },
  { key: "CJ_API_TOKEN", category: "Affiliate" },
  { key: "CJ_WEBSITE_ID", category: "Affiliate" },
  { key: "CJ_PUBLISHER_CID", category: "Affiliate" },
  { key: "GOOGLE_PAGESPEED_API_KEY", category: "SEO" },
  { key: "ADMIN_EMAILS", category: "Auth" },
  { key: "NEXTAUTH_SECRET", category: "Auth" },
  { key: "NEXTAUTH_URL", category: "Auth" },
  { key: "GOOGLE_SERVICE_ACCOUNT_KEY", category: "Analytics", alt: "GOOGLE_ANALYTICS_CLIENT_EMAIL" },
  { key: "CRON_SECRET", category: "System" },
  { key: "TWITTER_API_KEY", category: "Social" },
];

export async function GET(request: Request) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const vars = REQUIRED_VARS.map(({ key, category, alt }) => {
    const primary = !!process.env[key];
    const altSet = alt ? !!process.env[alt] : false;
    const isSet = primary || altSet;

    return {
      key,
      category,
      status: isSet ? "SET" as const : "MISSING" as const,
      source: primary ? key : altSet && alt ? alt : undefined,
    };
  });

  const setCount = vars.filter((v) => v.status === "SET").length;
  const missingCount = vars.filter((v) => v.status === "MISSING").length;

  return NextResponse.json({
    vars,
    summary: { total: vars.length, set: setCount, missing: missingCount },
    checked_at: new Date().toISOString(),
  });
}
