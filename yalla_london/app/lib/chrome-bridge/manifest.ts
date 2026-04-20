/**
 * Claude Chrome Bridge — Capabilities Manifest
 *
 * Single source of truth for what the bridge exposes. Claude Chrome calls this
 * first to discover endpoints, schemas, and new capabilities without re-reading
 * the playbook. Update on every expansion.
 */

import type { NextResponse as _NR } from "next/server";

export const BRIDGE_VERSION = "2026-04-20.3";
export const PLAYBOOK_VERSION = "2026-04-20";

export type EndpointKind = "read" | "write" | "interpret" | "meta";

export interface EndpointManifest {
  method: "GET" | "POST";
  path: string;
  kind: EndpointKind;
  summary: string;
  inputs?: Record<string, string>; // param -> description
  outputs?: string; // one-line shape description
  addedIn?: string; // version tag, e.g. "2026-04-20"
  since?: string; // ISO date
  status?: "stable" | "beta";
}

export const ENDPOINTS: EndpointManifest[] = [
  {
    method: "GET",
    path: "/api/admin/chrome-bridge",
    kind: "meta",
    summary: "Self-documenting index with quick endpoint list",
    addedIn: "2026-04-20.1",
    status: "stable",
  },
  {
    method: "GET",
    path: "/api/admin/chrome-bridge/capabilities",
    kind: "meta",
    summary: "Full capabilities manifest with endpoint schemas, versions, feature flags",
    addedIn: "2026-04-20.2",
    status: "stable",
  },
  {
    method: "GET",
    path: "/api/admin/chrome-bridge/sites",
    kind: "read",
    summary: "All active sites with brand colors, locale, keywords",
    outputs: "{ sites: SiteInfo[], count: number }",
    addedIn: "2026-04-20.1",
    status: "stable",
  },
  {
    method: "GET",
    path: "/api/admin/chrome-bridge/overview",
    kind: "read",
    summary: "Cross-site snapshot: published posts, cron failures, pipeline phases, recent audits",
    addedIn: "2026-04-20.1",
    status: "stable",
  },
  {
    method: "GET",
    path: "/api/admin/chrome-bridge/pages",
    kind: "read",
    summary: "Published pages with GSC 7d metrics, ranked by recency",
    inputs: { siteId: "required site ID", limit: "max 200, default 50", offset: "pagination" },
    addedIn: "2026-04-20.1",
    status: "stable",
  },
  {
    method: "GET",
    path: "/api/admin/chrome-bridge/page/[id]",
    kind: "read",
    summary: "Single page deep dive: BlogPost + GSC 30d + indexing + enhancement log + audit history",
    addedIn: "2026-04-20.1",
    status: "stable",
  },
  {
    method: "GET",
    path: "/api/admin/chrome-bridge/action-logs",
    kind: "read",
    summary: "Unified cron/audit/autofix/AI log view for triage",
    inputs: { hours: "window (max 168)", siteId: "optional filter" },
    addedIn: "2026-04-20.1",
    status: "stable",
  },
  {
    method: "GET",
    path: "/api/admin/chrome-bridge/cycle-health",
    kind: "read",
    summary: "Lightweight pipeline signals (phase distribution, stuck drafts, recent publishes)",
    addedIn: "2026-04-20.1",
    status: "stable",
  },
  {
    method: "GET",
    path: "/api/admin/chrome-bridge/aggregated-report",
    kind: "read",
    summary: "Latest persisted SeoAuditReport rows for a site",
    addedIn: "2026-04-20.1",
    status: "stable",
  },
  {
    method: "GET",
    path: "/api/admin/chrome-bridge/gsc",
    kind: "read",
    summary: "Google Search Console: top pages, top keywords, sitemaps",
    inputs: { siteId: "required", days: "max 90", limit: "max 200" },
    addedIn: "2026-04-20.1",
    status: "stable",
  },
  {
    method: "GET",
    path: "/api/admin/chrome-bridge/ga4",
    kind: "read",
    summary: "GA4 metrics: sessions, pageviews, bounce rate, top sources",
    inputs: { siteId: "required", days: "max 90" },
    addedIn: "2026-04-20.1",
    status: "stable",
  },
  {
    method: "GET",
    path: "/api/admin/chrome-bridge/revenue",
    kind: "read",
    summary: "Per-page revenue attribution: affiliate clicks, commissions, EPC, classification (earner | dead_weight | unmonetized | fresh | cold)",
    inputs: { siteId: "required", days: "max 90, default 30", limit: "max 200" },
    outputs: "{ totals, classificationCounts, topEarners, deadWeight, unmonetized, pages }",
    addedIn: "2026-04-20.3",
    status: "stable",
  },
  {
    method: "POST",
    path: "/api/admin/chrome-bridge/report",
    kind: "write",
    summary: "Upload per-page, sitewide, or offsite audit report",
    outputs: "{ reportId, agentTaskId, reportPath, severity, findingsCount, viewerUrl }",
    addedIn: "2026-04-20.1",
    status: "stable",
  },
  {
    method: "POST",
    path: "/api/admin/chrome-bridge/triage",
    kind: "write",
    summary: "Upload action-log triage report (cross-cron failure clustering)",
    addedIn: "2026-04-20.1",
    status: "stable",
  },
];

/**
 * Suggests next endpoints a Claude Chrome session should explore based on
 * what they just called. Included in responses as `_hints.suggested`.
 */
export function suggestNextEndpoints(justCalled: string): string[] {
  const suggestions: Record<string, string[]> = {
    "overview": [
      "GET /sites to get brand colors + keywords for each site",
      "GET /pages?siteId=X to pick per-page audit targets",
      "GET /action-logs if cron failures look concerning",
    ],
    "sites": [
      "GET /pages?siteId=<chosen> to see published content",
      "GET /aggregated-report?siteId=<chosen> for latest SEO audit",
    ],
    "pages": [
      "GET /page/[id] for deep dive on a specific page",
      "Then visit the live URL in browser for visual/UX evaluation",
      "POST /report with findings when audit complete",
    ],
    "page": [
      "Visit the live URL in your Chrome browser now",
      "Check mobile (375px) + desktop (1440px) renders",
      "GET /revenue?siteId=X to see if this page earns",
      "POST /report when ready with all 5 pillars",
    ],
    "revenue": [
      "Dead-weight pages (high traffic, $0): GET /page/[id] + propose affiliate injection",
      "Unmonetized pages: trigger affiliate-injection cron via /admin",
      "Top earners: protect them — audit for title/meta optimization only, no invasive rewrites",
    ],
    "action-logs": [
      "POST /triage with clustered findings + proposed fixes",
      "GET /cycle-health for a second diagnostic angle",
    ],
    "cycle-health": [
      "GET /action-logs for raw failure data",
      "POST /triage if pipeline is degraded",
    ],
    "gsc": [
      "GET /pages?siteId=X to cross-reference top pages",
      "For CTR outliers: GET /page/[id] and audit",
    ],
    "ga4": [
      "GET /gsc?siteId=X to cross-reference search data",
      "High-bounce pages: GET /page/[id] + audit first-screen UX",
    ],
  };
  const key = justCalled.split("/").filter(Boolean).pop() ?? "";
  return suggestions[key] ?? [];
}

/**
 * Build the standard `_hints` block included on every bridge response.
 * Claude Chrome reads this to stay aware of new capabilities between sessions.
 */
export function buildHints(params: {
  justCalled: string;
  viaBridgeToken?: boolean;
}): {
  version: string;
  playbookVersion: string;
  suggested: string[];
  playbook: string;
  capabilities: string;
  viewer: string;
} {
  return {
    version: BRIDGE_VERSION,
    playbookVersion: PLAYBOOK_VERSION,
    suggested: suggestNextEndpoints(params.justCalled),
    playbook: "docs/chrome-audits/PLAYBOOK.md",
    capabilities: "/api/admin/chrome-bridge/capabilities",
    viewer: "/admin/chrome-audits",
  };
}
