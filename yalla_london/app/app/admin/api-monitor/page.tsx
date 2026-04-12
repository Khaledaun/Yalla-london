"use client";

import { useState, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════════════════
// API Connectivity Monitor — Tests every API integration in real-time
// ═══════════════════════════════════════════════════════════════════════════

interface ApiTest {
  id: string;
  name: string;
  category: string;
  description: string;
  endpoint: string;
  method: "GET" | "POST";
  envVars?: string[];
  docsUrl?: string;
  testAction: string;
}

interface TestResult {
  id: string;
  status: "pass" | "fail" | "warn" | "pending" | "running";
  responseTimeMs?: number;
  message: string;
  data?: unknown;
}

const API_TESTS: ApiTest[] = [
  // ═══ Foundation APIs (Free, No Auth) ═══
  {
    id: "frankfurter",
    name: "Frankfurter — Currency Exchange",
    category: "Foundation APIs",
    description: "ECB exchange rates for GBP→AED/SAR price display. Free, no auth, no rate limits.",
    endpoint: "/api/integrations/currency?amount=100&from=GBP",
    method: "GET",
    docsUrl: "https://api.frankfurter.app",
    testAction: "Converts £100 to visitor's currency",
  },
  {
    id: "weather",
    name: "Open-Meteo — Weather Forecast",
    category: "Foundation APIs",
    description: "7-day weather forecast for destination cities. Free, no auth.",
    endpoint: "/api/integrations/weather?siteId=yalla-london&days=3",
    method: "GET",
    docsUrl: "https://api.open-meteo.com/v1/forecast",
    testAction: "Fetches 3-day London weather",
  },
  {
    id: "countries",
    name: "REST Countries — Destination Info",
    category: "Foundation APIs",
    description: "Country data: flag, currency, timezone, languages. Free, no auth.",
    endpoint: "/api/integrations/countries?siteId=yalla-london",
    method: "GET",
    docsUrl: "https://restcountries.com/v3.1",
    testAction: "Fetches UK country info",
  },
  // ═══ Revenue APIs (Requires API Key) ═══
  {
    id: "ticketmaster",
    name: "Ticketmaster — Live Events",
    category: "Revenue APIs",
    description: "Real upcoming London events with ticket URLs. 5,000 calls/day free.",
    endpoint: "/api/integrations/events?siteId=yalla-london&limit=3",
    method: "GET",
    envVars: ["TICKETMASTER_API_KEY"],
    docsUrl: "https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/",
    testAction: "Fetches 3 upcoming London events",
  },
  {
    id: "unsplash",
    name: "Unsplash — Legal Photography",
    category: "Revenue APIs",
    description: "Legal travel photos with attribution. 50 req/hour free tier.",
    endpoint: "/api/integrations/unsplash?query=london+hotel&limit=2",
    method: "GET",
    envVars: ["UNSPLASH_ACCESS_KEY"],
    docsUrl: "https://unsplash.com/documentation",
    testAction: "Searches for London hotel photos",
  },
  // ═══ Monetization Scripts ═══
  {
    id: "stay22",
    name: "Stay22 LetMeAllez — Hotel Auto-Links",
    category: "Monetization",
    description: "Auto-scans articles, converts hotel mentions to affiliate links. 30%+ rev share.",
    endpoint: "script-check",
    method: "GET",
    envVars: ["NEXT_PUBLIC_STAY22_AID"],
    docsUrl: "https://hub.stay22.com",
    testAction: "Checks if Stay22 script tag is present in page",
  },
  {
    id: "tp-drive",
    name: "Travelpayouts Drive — AI Monetization",
    category: "Monetization",
    description: "AI finds missed monetization (flights, tours, insurance) in content.",
    endpoint: "script-check",
    method: "GET",
    envVars: ["NEXT_PUBLIC_TRAVELPAYOUTS_MARKER"],
    docsUrl: "https://app.travelpayouts.com",
    testAction: "Checks if Travelpayouts marker is configured",
  },
  {
    id: "tp-linkswitcher",
    name: "Travelpayouts LinkSwitcher — URL Converter",
    category: "Monetization",
    description: "Converts raw brand URLs (booking.com, viator.com) to tracked affiliate links.",
    endpoint: "script-check",
    method: "GET",
    envVars: ["NEXT_PUBLIC_TRAVELPAYOUTS_MARKER"],
    testAction: "Checks if LinkSwitcher marker is configured",
  },
  // ═══ Affiliate Networks ═══
  {
    id: "cj-affiliate",
    name: "CJ Affiliate — Commission Junction",
    category: "Affiliate Networks",
    description: "Vrbo approved. CJ syncs advertisers, injects tracking links, attributes revenue.",
    endpoint: "/api/admin/cj-health",
    method: "GET",
    envVars: ["CJ_API_TOKEN", "CJ_WEBSITE_ID", "CJ_PUBLISHER_CID"],
    testAction: "Checks CJ API connectivity and sync status",
  },
  // ═══ Analytics & Tracking ═══
  {
    id: "ga4",
    name: "Google Analytics 4 — Traffic Data",
    category: "Analytics",
    description: "Website traffic, page views, sessions, bounce rate.",
    endpoint: "/api/admin/analytics?section=overview",
    method: "GET",
    envVars: ["GA4_MEASUREMENT_ID", "GA4_API_SECRET", "GA4_PROPERTY_ID"],
    testAction: "Fetches GA4 overview metrics",
  },
  {
    id: "gsc",
    name: "Google Search Console — SEO Performance",
    category: "Analytics",
    description: "Search queries, clicks, impressions, CTR, position.",
    endpoint: "/api/admin/aggregated-report",
    method: "GET",
    envVars: ["GA4_PROPERTY_ID"],
    testAction: "Fetches aggregated SEO report",
  },
  // ═══ Content Pipeline ═══
  {
    id: "grok",
    name: "Grok (xAI) — Content Generation",
    category: "AI Providers",
    description: "Primary AI for article generation, trending topics, news.",
    endpoint: "/api/admin/ai-config",
    method: "GET",
    envVars: ["XAI_API_KEY"],
    testAction: "Checks Grok API configuration",
  },
  {
    id: "openai",
    name: "OpenAI — Fallback AI Provider",
    category: "AI Providers",
    description: "Secondary AI provider for content generation.",
    endpoint: "/api/admin/ai-config",
    method: "GET",
    envVars: ["OPENAI_API_KEY"],
    testAction: "Checks OpenAI configuration",
  },
  // ═══ Cron Jobs ═══
  {
    id: "data-refresh",
    name: "Data Refresh Cron — Daily Cache Warm",
    category: "Cron Jobs",
    description: "Refreshes currency, weather, holidays, countries caches. Daily 6:30 UTC.",
    endpoint: "/api/cron/data-refresh",
    method: "GET",
    testAction: "Triggers data refresh (all free APIs)",
  },
  {
    id: "events-sync",
    name: "Events Sync Cron — Ticketmaster → DB",
    category: "Cron Jobs",
    description: "Fetches Ticketmaster events and writes to Event table. Weekly Monday 6:45 UTC.",
    endpoint: "/api/cron/events-sync",
    method: "GET",
    envVars: ["TICKETMASTER_API_KEY"],
    testAction: "Syncs Ticketmaster events to database",
  },
  {
    id: "image-pipeline",
    name: "Image Pipeline Cron — Unsplash Backfill",
    category: "Cron Jobs",
    description: "Fetches Unsplash images for articles without featured images. 3x/day.",
    endpoint: "/api/cron/image-pipeline",
    method: "GET",
    envVars: ["UNSPLASH_ACCESS_KEY"],
    testAction: "Backfills article images from Unsplash",
  },
];

const CATEGORIES = [...new Set(API_TESTS.map((t) => t.category))];

export default function ApiMonitorPage() {
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [running, setRunning] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const runTest = useCallback(async (test: ApiTest) => {
    setResults((prev) => ({
      ...prev,
      [test.id]: { id: test.id, status: "running", message: "Testing..." },
    }));

    const start = Date.now();

    // Script checks — just verify env var exists
    if (test.endpoint === "script-check") {
      const envKey = test.envVars?.[0] || "";
      // We can't check env vars client-side for NEXT_PUBLIC_ vars directly,
      // but we can check if the script tag is in the DOM
      const hasScript = test.id === "stay22"
        ? !!document.querySelector('script[src*="stay22.com"]')
        : !!document.querySelector('script[id*="tp-"]');
      setResults((prev) => ({
        ...prev,
        [test.id]: {
          id: test.id,
          status: hasScript ? "pass" : "warn",
          responseTimeMs: Date.now() - start,
          message: hasScript
            ? `Script loaded in page (${envKey} configured)`
            : `Script not found — set ${envKey} in Vercel env vars`,
        },
      }));
      return;
    }

    try {
      const res = await fetch(test.endpoint, {
        method: test.method,
        signal: AbortSignal.timeout(15000),
      });

      const responseTimeMs = Date.now() - start;
      let data: unknown;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (res.ok) {
        setResults((prev) => ({
          ...prev,
          [test.id]: {
            id: test.id,
            status: "pass",
            responseTimeMs,
            message: `${res.status} OK (${responseTimeMs}ms)`,
            data,
          },
        }));
      } else {
        setResults((prev) => ({
          ...prev,
          [test.id]: {
            id: test.id,
            status: res.status === 401 || res.status === 403 ? "warn" : "fail",
            responseTimeMs,
            message: `HTTP ${res.status} (${responseTimeMs}ms)`,
            data,
          },
        }));
      }
    } catch (err) {
      setResults((prev) => ({
        ...prev,
        [test.id]: {
          id: test.id,
          status: "fail",
          responseTimeMs: Date.now() - start,
          message: err instanceof Error ? err.message : "Connection failed",
        },
      }));
    }
  }, []);

  const runAllTests = useCallback(async () => {
    setRunning(true);
    for (const test of API_TESTS) {
      await runTest(test);
    }
    setRunning(false);
  }, [runTest]);

  const passCount = Object.values(results).filter((r) => r.status === "pass").length;
  const failCount = Object.values(results).filter((r) => r.status === "fail").length;
  const warnCount = Object.values(results).filter((r) => r.status === "warn").length;
  const totalTested = Object.keys(results).length;

  return (
    <div className="min-h-screen bg-[var(--admin-bg)] p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">API Connectivity Monitor</h1>
          <p className="text-sm text-gray-500 mt-1">
            Tests every API integration, monetization script, and cron job in real-time.
          </p>
        </div>

        {/* Summary Bar */}
        {totalTested > 0 && (
          <div className="grid grid-cols-4 gap-3 mb-6">
            <SummaryCard label="Tested" value={totalTested} color="text-gray-700" />
            <SummaryCard label="Pass" value={passCount} color="text-green-600" />
            <SummaryCard label="Warn" value={warnCount} color="text-amber-500" />
            <SummaryCard label="Fail" value={failCount} color="text-red-500" />
          </div>
        )}

        {/* Run All Button */}
        <button
          onClick={runAllTests}
          disabled={running}
          className="w-full mb-6 py-3 px-6 bg-[#C8322B] text-white font-semibold rounded-xl hover:bg-[#a82924] disabled:bg-gray-300 disabled:text-gray-500 transition-all"
        >
          {running ? "Testing..." : `Test All ${API_TESTS.length} Connections`}
        </button>

        {/* Test Categories */}
        {CATEGORIES.map((category) => (
          <div key={category} className="mb-6">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
              {category}
            </h2>
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              {API_TESTS.filter((t) => t.category === category).map((test) => {
                const result = results[test.id];
                const isExpanded = expandedId === test.id;
                return (
                  <div key={test.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <StatusDot status={result?.status} />
                          <span className="font-semibold text-sm text-gray-900 truncate">
                            {test.name}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {test.description}
                        </p>
                        {test.envVars && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {test.envVars.map((v) => (
                              <span key={v} className="text-[10px] font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                                {v}
                              </span>
                            ))}
                          </div>
                        )}
                        {result && (
                          <div className={`text-xs mt-1.5 font-medium ${
                            result.status === "pass" ? "text-green-600" :
                            result.status === "warn" ? "text-amber-500" :
                            result.status === "fail" ? "text-red-500" :
                            result.status === "running" ? "text-blue-500" :
                            "text-gray-400"
                          }`}>
                            {result.message}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => runTest(test)}
                          disabled={running}
                          className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium transition-colors"
                        >
                          Test
                        </button>
                        {result?.data && (
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : test.id)}
                            className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-500 font-medium transition-colors"
                          >
                            {isExpanded ? "Hide" : "JSON"}
                          </button>
                        )}
                      </div>
                    </div>
                    {isExpanded && result?.data && (
                      <pre className="mt-3 p-3 bg-gray-50 rounded-lg text-[11px] font-mono text-gray-600 overflow-x-auto max-h-60 overflow-y-auto border border-gray-200">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Env Var Reference */}
        <div className="mt-8 bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
            Environment Variables Reference
          </h2>
          <div className="space-y-2 text-sm">
            <EnvRow name="NEXT_PUBLIC_STAY22_AID" desc="Stay22 hotel monetization" status="Set in Vercel" />
            <EnvRow name="NEXT_PUBLIC_TRAVELPAYOUTS_MARKER" desc="Travelpayouts affiliate marker" status="Set in Vercel" />
            <EnvRow name="TICKETMASTER_API_KEY" desc="Real events data" status="Set in Vercel" />
            <EnvRow name="UNSPLASH_ACCESS_KEY" desc="Legal travel photography" status="Pending" />
            <EnvRow name="CJ_API_TOKEN" desc="CJ Affiliate network" status="Set in Vercel" />
            <EnvRow name="GA4_MEASUREMENT_ID" desc="Google Analytics tracking" status="Set in Vercel" />
            <EnvRow name="GA4_API_SECRET" desc="GA4 Measurement Protocol" status="Set in Vercel" />
            <EnvRow name="XAI_API_KEY" desc="Grok AI content generation" status="Set in Vercel" />
            <EnvRow name="OPENAI_API_KEY" desc="OpenAI fallback provider" status="Set in Vercel" />
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</div>
    </div>
  );
}

function StatusDot({ status }: { status?: string }) {
  const colors: Record<string, string> = {
    pass: "bg-green-500",
    fail: "bg-red-500",
    warn: "bg-amber-400",
    running: "bg-blue-400 animate-pulse",
    pending: "bg-gray-300",
  };
  return <div className={`w-2.5 h-2.5 rounded-full ${colors[status || "pending"]} flex-shrink-0`} />;
}

function EnvRow({ name, desc, status }: { name: string; desc: string; status: string }) {
  const isPending = status === "Pending";
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
      <div>
        <code className="text-xs font-mono text-gray-700">{name}</code>
        <span className="text-xs text-gray-400 ml-2">{desc}</span>
      </div>
      <span className={`text-xs font-medium ${isPending ? "text-amber-500" : "text-green-600"}`}>
        {status}
      </span>
    </div>
  );
}
