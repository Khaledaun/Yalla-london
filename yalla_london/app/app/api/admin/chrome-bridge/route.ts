/**
 * GET /api/admin/chrome-bridge
 * Index / self-documenting endpoint listing all available bridge routes.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireBridgeToken } from "@/lib/agents/bridge-auth";
import { BRIDGE_VERSION, PLAYBOOK_VERSION, buildHints } from "@/lib/chrome-bridge/manifest";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authError = await requireBridgeToken(request);
  if (authError) return authError;

  return NextResponse.json({
    bridge: "claude-chrome-bridge",
    bridgeVersion: BRIDGE_VERSION,
    playbookVersion: PLAYBOOK_VERSION,
    authenticated: true,
    quickStart:
      "Call GET /capabilities first for full manifest + feature flags + env availability.",
    endpoints: {
      meta: {
        index: "GET /api/admin/chrome-bridge",
        capabilities: "GET /api/admin/chrome-bridge/capabilities",
      },
      read: {
        overview: "GET /api/admin/chrome-bridge/overview",
        sites: "GET /api/admin/chrome-bridge/sites",
        pages: "GET /api/admin/chrome-bridge/pages?siteId=X&limit=N",
        page: "GET /api/admin/chrome-bridge/page/[id]",
        actionLogs: "GET /api/admin/chrome-bridge/action-logs?hours=24",
        cycleHealth: "GET /api/admin/chrome-bridge/cycle-health?siteId=X",
        aggregatedReport: "GET /api/admin/chrome-bridge/aggregated-report?siteId=X",
        gsc: "GET /api/admin/chrome-bridge/gsc?siteId=X&days=30",
        ga4: "GET /api/admin/chrome-bridge/ga4?siteId=X&days=30",
      },
      write: {
        report: "POST /api/admin/chrome-bridge/report",
        triage: "POST /api/admin/chrome-bridge/triage",
      },
    },
    playbook: "docs/chrome-audits/PLAYBOOK.md",
    changelog: "docs/chrome-audits/CHANGELOG.md",
    adminViewer: "/admin/chrome-audits",
    _hints: buildHints({ justCalled: "bridge" }),
  });
}
