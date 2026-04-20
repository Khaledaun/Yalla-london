/**
 * GET /api/admin/chrome-bridge/capabilities
 *
 * Full capabilities manifest. Claude Chrome calls this at session start to
 * discover endpoints, schemas, feature flags, and version tags. Update when
 * adding new endpoints — the manifest is the source of truth.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireBridgeToken } from "@/lib/agents/bridge-auth";
import {
  ENDPOINTS,
  BRIDGE_VERSION,
  PLAYBOOK_VERSION,
  buildHints,
} from "@/lib/chrome-bridge/manifest";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authError = await requireBridgeToken(request);
  if (authError) return authError;

  const featureFlags = {
    ceoInboxAlerts: true,
    adminViewer: true,
    perSitePlaybooks: false,
    screenshotEndpoint: false, // explicitly skipped (Claude Chrome browses pages directly)
    competitorSerp: !!(process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD),
    keywordResearch: !!(process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD),
    abTestRegistration: true, // Phase 7.2
    impactMeasurement: true, // Phase 7.3
    expandedGsc: true, // Phase 7.4
    expandedGa4: true, // Phase 7.5
    affiliateResearch: false, // Phase 7.6
  };

  const envAvailability = {
    bridgeTokenSet: !!process.env.CLAUDE_BRIDGE_TOKEN,
    pageSpeedApiSet: !!(
      process.env.GOOGLE_PAGESPEED_API_KEY ||
      process.env.PAGESPEED_API_KEY ||
      process.env.PSI_API_KEY
    ),
    gscConfigured: !!(
      (process.env.GOOGLE_ANALYTICS_CLIENT_EMAIL ||
        process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL ||
        process.env.GOOGLE_SERVICE_ACCOUNT_KEY) &&
      process.env.GSC_SITE_URL !== undefined
    ),
    ga4Configured: !!(
      process.env.GA4_PROPERTY_ID &&
      (process.env.GOOGLE_ANALYTICS_CLIENT_EMAIL ||
        process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL ||
        process.env.GOOGLE_SERVICE_ACCOUNT_KEY)
    ),
    dataforseoConfigured: !!(
      process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD
    ),
  };

  return NextResponse.json({
    bridge: "claude-chrome-bridge",
    bridgeVersion: BRIDGE_VERSION,
    playbookVersion: PLAYBOOK_VERSION,
    generatedAt: new Date().toISOString(),
    endpoints: ENDPOINTS,
    endpointCount: ENDPOINTS.length,
    featureFlags,
    envAvailability,
    auditPillars: ["on_page", "technical", "aio", "ux", "offsite", "affiliate", "accessibility"],
    auditTypes: ["per_page", "sitewide", "action_log_triage", "offsite"],
    severityLevels: ["info", "warning", "critical"],
    priorityLevels: ["low", "medium", "high", "critical"],
    instructions: {
      sessionStart:
        "1. Call this endpoint at session start to learn capabilities. 2. Call GET /overview to snapshot platform state. 3. Call GET /sites for brand context. 4. Pick targets via GET /pages or /action-logs. 5. For each audit, visit live URL in browser + apply 5-pillar methodology. 6. POST /report or /triage with findings.",
      tokenRotation: "Bridge token is rotatable. Check envAvailability.bridgeTokenSet. If false, request token from admin.",
      changelog: "docs/chrome-audits/CHANGELOG.md",
    },
    _hints: buildHints({ justCalled: "capabilities" }),
  });
}
