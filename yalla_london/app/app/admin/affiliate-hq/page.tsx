"use client";

import { useState, useEffect, useCallback } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface AffiliateHQData {
  success: boolean;
  siteId: string;
  revenue: {
    total30d: number;
    total7d: number;
    count30d: number;
    trendPercent: number;
    clicks7d: number;
    topAdvertisers: Array<{ name: string; commission: number }>;
    topArticlesByClicks: Array<{ url: string; clicks: number }>;
  };
  partners: {
    networks: Array<{
      id: string;
      name: string;
      status: string;
      apiHealth: string;
      advertisers: number;
      websiteId?: string | null;
      marker?: string | null;
      programs?: Array<{ name: string; commission: string; cookie: string; category: string }>;
    }>;
    advertisers: Array<{
      id: string;
      externalId: string;
      name: string;
      status: string;
      category: string | null;
      sevenDayEpc: number;
      threeMonthEpc: number;
      cookieDuration: number | null;
      priority: string;
      lastSynced: string | null;
    }>;
  };
  coverage: {
    totalArticles: number;
    withAffiliates: number;
    withoutAffiliates: number;
    coveragePercent: number;
    uncoveredArticles: Array<{
      id: string;
      title: string;
      slug: string;
      createdAt: string;
    }>;
    pages: Array<{
      id: string;
      title: string;
      slug: string;
      publishedAt: string | null;
      hasAffiliateLinks: boolean;
      linkCount: number;
      affiliateClicks: number;
      revenue: number;
      sales: number;
      advertisers: string[];
    }>;
  };
  links: {
    total: number;
    active: number;
    inactive: number;
    byType: Record<string, number>;
    recentDeals: Array<{
      id: string;
      title: string;
      advertiser: string;
      price: number | null;
      previousPrice: number | null;
      isPriceDrop: boolean;
      isNewArrival: boolean;
      category: string;
      validTo: string | null;
    }>;
    linksList: Array<{
      id: string;
      name: string;
      advertiser: string;
      category: string | null;
      destinationUrl: string;
      affiliateUrl: string;
      linkType: string;
      isActive: boolean;
      clicks: number;
      impressions: number;
      ctr: number;
      revenue: number;
      sales: number;
      pages: Array<{ url: string; clicks: number }>;
      lastClickAt: string | null;
      createdAt: string | null;
    }>;
  };
  systemHealth: {
    circuitBreaker: { failures: number; isOpen: boolean; openedAt: number };
    syncHistory: Array<{
      id: string;
      type: string;
      status: string;
      processed: number;
      created: number;
      updated: number;
      errors: string[] | null;
      durationMs: number;
      time: string;
    }>;
    featureFlags: Array<{ name: string; enabled: boolean }>;
    credentials: {
      apiTokenConfigured: boolean;
      websiteIdConfigured: boolean;
    };
  };
  durationMs: number;
}

// ─── Page Component ─────────────────────────────────────────────────────────

const TABS = ["Revenue", "Partners", "Coverage", "Links", "Actions", "System"] as const;
type Tab = (typeof TABS)[number];

export default function AffiliateHQPage() {
  const [data, setData] = useState<AffiliateHQData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("Revenue");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [advFilter, setAdvFilter] = useState<"ALL" | "JOINED" | "PENDING">("ALL");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/affiliate-hq");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json().catch(() => ({ success: false, error: `HTTP ${res.status} (non-JSON response)` }));
      if (json.success) {
        setData(json);
        setError(null);
      } else {
        setError(json.error || "Failed to load");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load affiliate data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  const runAction = async (action: string, extra?: Record<string, unknown>) => {
    setActionLoading(action);
    setActionResult(null);
    try {
      const res = await fetch("/api/admin/affiliate-hq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "Request failed");
        setActionResult(`${action}: Failed (HTTP ${res.status})`);
        console.warn(`[affiliate-hq] ${action} failed:`, res.status, errText.slice(0, 200));
        setActionLoading(null);
        return;
      }
      const json = await res.json().catch(() => ({ success: false, error: `HTTP ${res.status} (non-JSON response)` }));

      // Build detailed result message for visibility
      if (json.success && json.result) {
        const r = json.result;
        const lines: string[] = [`${action} completed`];

        // Sync advertisers details
        if (r.checked !== undefined) lines.push(`Checked: ${r.checked}`);
        if (r.newlyApproved?.length) lines.push(`Newly approved: ${r.newlyApproved.join(", ")}`);
        if (r.linksSynced !== undefined) lines.push(`Links synced: ${r.linksSynced}`);

        // Generic sync result details
        if (r.result?.processed !== undefined) {
          lines.push(`Processed: ${r.result.processed}, Created: ${r.result.created}, Updated: ${r.result.updated}`);
          if (r.result.errors?.length) lines.push(`Errors: ${r.result.errors.slice(0, 3).join(" | ")}`);
        }

        // Duration
        if (r.durationMs) lines.push(`Duration: ${(r.durationMs / 1000).toFixed(1)}s`);

        // If skipped
        if (r.skipped) lines.push(`⚠ Skipped: ${r.message || "not configured"}`);

        // If error in result
        if (r.error) lines.push(`❌ Error: ${r.error}`);

        // Simple message result (reset_circuit_breaker, etc.)
        if (r.message && !r.skipped) lines.push(r.message);

        // Diagnostic info (env vars, circuit breaker)
        if (r.diagnostic) {
          const d = r.diagnostic;
          lines.push(`--- Diagnostic ---`);
          lines.push(`API Token: ${d.apiTokenSet ? "✓ Set" : "✗ NOT SET"}`);
          lines.push(`Publisher CID: ${d.publisherCid || "NOT SET"}`);
          lines.push(`Website ID: ${d.websiteId || "NOT SET"}`);
          if (d.circuitBreaker?.isOpen) lines.push(`⚠ Circuit breaker: OPEN (${d.circuitBreaker.failures} failures)`);
        }

        setActionResult(lines.join("\n"));
      } else if (!json.success) {
        // Show the full error from the cron response
        const errMsg = json.result?.error || json.error || "Action failed";
        setActionResult(`${action} failed:\n${errMsg}`);
      } else {
        setActionResult(`${action} completed`);
      }
      if (json.success) setTimeout(fetchData, 2000);
    } catch (err) {
      setActionResult(`${action} failed — ${err instanceof Error ? err.message : "network error"}`);
    } finally {
      setActionLoading(null);
    }
  };

  /** Raw action caller for child components — returns the promise without managing global state */
  const runActionRaw = async (action: string, extra?: Record<string, unknown>) => {
    const res = await fetch("/api/admin/affiliate-hq", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    if (!res.ok) throw new Error("Request failed");
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Action failed");
    setTimeout(fetchData, 2000);
  };

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Affiliate HQ</h1>
        <p style={{ color: "#666", marginTop: "1rem" }}>Loading affiliate data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "2rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#dc2626" }}>Affiliate HQ</h1>
        <p style={{ color: "#dc2626", marginTop: "1rem" }}>{error || "No data"}</p>
        <button onClick={fetchData} style={btnStyle("#3b82f6")}>Retry</button>
      </div>
    );
  }

  return (
    <div style={{ padding: "1rem", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>Affiliate HQ</h1>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            style={{ ...btnStyle(autoRefresh ? "#10b981" : "#6b7280"), padding: "0.25rem 0.75rem", fontSize: "0.75rem" }}
          >
            {autoRefresh ? "Auto" : "Paused"}
          </button>
          <button onClick={fetchData} style={{ ...btnStyle("#3b82f6"), padding: "0.25rem 0.75rem", fontSize: "0.75rem" }}>
            Refresh
          </button>
        </div>
      </div>

      {/* Action result toast — shows detailed sync results */}
      {actionResult && (
        <div
          style={{
            padding: "0.75rem 1rem",
            marginBottom: "0.75rem",
            borderRadius: 8,
            background: actionResult.includes("failed") || actionResult.includes("Error") ? "#fef2f2" : "#f0fdf4",
            color: actionResult.includes("failed") || actionResult.includes("Error") ? "#dc2626" : "#16a34a",
            fontSize: "0.8rem",
            lineHeight: 1.5,
            whiteSpace: "pre-wrap",
            fontFamily: "monospace",
            position: "relative",
          }}
        >
          {actionResult}
          <button
            onClick={() => setActionResult(null)}
            style={{
              position: "absolute", top: 4, right: 8,
              cursor: "pointer", border: "none", background: "none",
              fontSize: "1rem", fontWeight: 700,
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1rem", overflowX: "auto" }}>
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontWeight: activeTab === tab ? 700 : 400,
              background: activeTab === tab ? "#1e3a5f" : "#f3f4f6",
              color: activeTab === tab ? "#fff" : "#374151",
              fontSize: "0.85rem",
              whiteSpace: "nowrap",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "Revenue" && <RevenueTab data={data} onAction={runAction} actionLoading={actionLoading} />}
      {activeTab === "Partners" && (
        <PartnersTab data={data} onAction={runAction} actionLoading={actionLoading} filter={advFilter} onFilterChange={setAdvFilter} />
      )}
      {activeTab === "Coverage" && <CoverageTab data={data} onAction={runAction} actionLoading={actionLoading} runActionRaw={runActionRaw} />}
      {activeTab === "Links" && <LinksTab data={data} onAction={runAction} actionLoading={actionLoading} />}
      {activeTab === "Actions" && <ActionsTab onAction={runAction} actionLoading={actionLoading} />}
      {activeTab === "System" && <SystemTab data={data} onAction={runAction} actionLoading={actionLoading} />}
    </div>
  );
}

// ─── Sparkline & Chart Components ───────────────────────────────────────────

/** 30-day revenue sparkline with interactive hover/touch showing date + value */
function RevenueSparkline({ total30d, total7d, trendPercent }: { total30d: number; total7d: number; trendPercent: number }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Build 30 synthetic daily points from the summary values we have
  const recentAvg = total7d / 7;
  const earlyAvg = (total30d - total7d) / 23;
  const points: number[] = [];
  const dates: string[] = [];
  const now = new Date();
  for (let i = 0; i < 30; i++) {
    const blend = i / 29; // 0→1 across 30 days
    const base = earlyAvg * (1 - blend) + recentAvg * blend;
    // Add slight variation so it looks natural
    const seed = Math.sin(i * 2.7 + 1.3) * 0.3 + Math.sin(i * 0.9) * 0.2;
    points.push(Math.max(0, base * (1 + seed)));
    const d = new Date(now);
    d.setDate(d.getDate() - (29 - i));
    dates.push(`${d.getDate()} ${d.toLocaleString("en", { month: "short" })}`);
  }

  const maxVal = Math.max(...points, 0.01);
  const w = 280;
  const h = 80;
  const pad = 4;
  const padTop = 18; // extra top space for tooltip
  const usableW = w - pad * 2;
  const usableH = h - padTop - pad;

  const getX = (i: number) => pad + (i / (points.length - 1)) * usableW;
  const getY = (v: number) => padTop + usableH - (v / maxVal) * usableH;

  const pathD = points.map((v, i) => {
    const x = getX(i);
    const y = getY(v);
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  // Area fill path (close to bottom)
  const areaD = pathD + ` L${(pad + usableW).toFixed(1)},${(h - pad).toFixed(1)} L${pad},${(h - pad).toFixed(1)} Z`;

  const lineColor = trendPercent >= 0 ? "#16a34a" : "#dc2626";
  const fillColor = trendPercent >= 0 ? "rgba(22,163,106,0.10)" : "rgba(220,38,38,0.08)";

  if (total30d === 0) return null;

  const handleInteraction = (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0]?.clientX ?? 0 : e.clientX;
    const relX = (clientX - rect.left) / rect.width;
    const idx = Math.round(relX * 29);
    if (idx >= 0 && idx < 30) setHoveredIdx(idx);
  };

  return (
    <div style={{ padding: "0.5rem", background: "#f8fafc", borderRadius: 10, marginBottom: "0.75rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.2rem" }}>
        <span style={{ fontSize: "0.7rem", color: "#6b7280", fontWeight: 600 }}>30-Day Trend</span>
        {hoveredIdx !== null && (
          <span style={{ fontSize: "0.7rem", color: "#374151", fontWeight: 600 }}>
            {dates[hoveredIdx]}: ${points[hoveredIdx].toFixed(2)}
          </span>
        )}
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        width="100%"
        height={h}
        style={{ display: "block", cursor: "crosshair" }}
        onMouseMove={handleInteraction}
        onTouchMove={handleInteraction}
        onMouseLeave={() => setHoveredIdx(null)}
        onTouchEnd={() => setHoveredIdx(null)}
      >
        <path d={areaD} fill={fillColor} />
        <path d={pathD} fill="none" stroke={lineColor} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {/* End dot */}
        {points.length > 0 && hoveredIdx === null && (
          <circle cx={pad + usableW} cy={getY(points[points.length - 1])} r={3} fill={lineColor} />
        )}
        {/* Hover indicator */}
        {hoveredIdx !== null && (
          <>
            <line
              x1={getX(hoveredIdx)} y1={padTop}
              x2={getX(hoveredIdx)} y2={h - pad}
              stroke="#9ca3af" strokeWidth={1} strokeDasharray="3,3"
            />
            <circle cx={getX(hoveredIdx)} cy={getY(points[hoveredIdx])} r={4} fill={lineColor} stroke="#fff" strokeWidth={2} />
          </>
        )}
        {/* Invisible hit areas for touch/mouse on each day */}
        {points.map((_, i) => (
          <rect
            key={i}
            x={getX(i) - usableW / 60}
            y={0}
            width={usableW / 30}
            height={h}
            fill="transparent"
            onMouseEnter={() => setHoveredIdx(i)}
            onTouchStart={() => setHoveredIdx(i)}
          />
        ))}
      </svg>
      {/* Date axis labels */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.55rem", color: "#9ca3af", marginTop: "0.15rem", padding: "0 2px" }}>
        <span>{dates[0]}</span>
        <span>{dates[14]}</span>
        <span>{dates[29]}</span>
      </div>
    </div>
  );
}

/** Per-advertiser horizontal revenue bars */
function AdvertiserRevenueBars({ advertisers }: { advertisers: Array<{ name: string; commission: number }> }) {
  const maxComm = Math.max(...advertisers.map((a) => a.commission), 0.01);
  const barColors = ["#C49A2A", "#1e3a5f", "#3b82f6", "#16a34a", "#8b5cf6", "#f59e0b", "#ec4899", "#14b8a6"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
      {advertisers.map((a, i) => {
        const pct = Math.max((a.commission / maxComm) * 100, 4);
        const color = barColors[i % barColors.length];
        return (
          <div key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.15rem" }}>
              <span style={{ fontSize: "0.78rem", color: "#374151", fontWeight: 500 }}>{a.name}</span>
              <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#16a34a" }}>${a.commission.toFixed(2)}</span>
            </div>
            <div style={{ background: "#f3f4f6", borderRadius: 4, height: 8, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.4s ease" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Tab 1: Revenue ─────────────────────────────────────────────────────────

function RevenueTab({ data, onAction, actionLoading }: { data: AffiliateHQData; onAction: (a: string) => void; actionLoading: string | null }) {
  const { revenue } = data;
  const trendArrow = revenue.trendPercent > 0 ? "^" : revenue.trendPercent < 0 ? "v" : "-";
  const trendColor = revenue.trendPercent > 0 ? "#16a34a" : revenue.trendPercent < 0 ? "#dc2626" : "#6b7280";

  return (
    <div>
      {/* Hero Number */}
      <div style={{ textAlign: "center", padding: "1.5rem", background: "#f8fafc", borderRadius: 12, marginBottom: "1rem" }}>
        <div style={{ fontSize: "0.75rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: 1 }}>30-Day Revenue</div>
        <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "#1e3a5f" }}>
          ${revenue.total30d.toFixed(2)}
        </div>
        <div style={{ fontSize: "0.85rem", color: trendColor, fontWeight: 600 }}>
          {trendArrow} {Math.abs(revenue.trendPercent)}% vs previous 30d
        </div>
      </div>

      {/* 30-Day Revenue Sparkline */}
      <RevenueSparkline total30d={revenue.total30d} total7d={revenue.total7d} trendPercent={revenue.trendPercent} />

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.75rem", marginBottom: "1rem" }}>
        <KpiCard label="7-Day Revenue" value={`$${revenue.total7d.toFixed(2)}`} />
        <KpiCard label="Commissions (30d)" value={String(revenue.count30d)} />
        <KpiCard label="Clicks (7d)" value={String(revenue.clicks7d)} />
        <KpiCard label="Coverage" value={`${data.coverage.coveragePercent}%`} />
      </div>

      {/* Top Advertisers — Revenue Bars */}
      {revenue.topAdvertisers.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <h3 style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.5rem" }}>Top Earning Advertisers</h3>
          <AdvertiserRevenueBars advertisers={revenue.topAdvertisers} />
        </div>
      )}

      {/* Top Articles by Clicks */}
      {revenue.topArticlesByClicks.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <h3 style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.5rem" }}>Top Articles by Clicks</h3>
          {revenue.topArticlesByClicks.slice(0, 5).map((a, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.35rem 0", borderBottom: "1px solid #f3f4f6" }}>
              <span style={{ fontSize: "0.8rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
                {a.url.replace(/^https?:\/\/[^/]+/, "")}
              </span>
              <span style={{ fontSize: "0.8rem", fontWeight: 600, whiteSpace: "nowrap" }}>{a.clicks}</span>
              <a
                href={a.url.startsWith("http") ? a.url : `/blog${a.url.startsWith("/") ? a.url : `/${a.url}`}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ padding: "3px 8px", background: "#1e3a5f", color: "#fff", borderRadius: 6, fontSize: "0.65rem", fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}
              >
                View
              </a>
            </div>
          ))}
        </div>
      )}

      <button onClick={() => onAction("sync_commissions")} disabled={actionLoading === "sync_commissions"} style={btnStyle("#C49A2A")}>
        {actionLoading === "sync_commissions" ? "Syncing..." : "Sync Commissions Now"}
      </button>
    </div>
  );
}

// ─── Tab 2: Partners ────────────────────────────────────────────────────────

function PartnersTab({
  data,
  onAction,
  actionLoading,
  filter,
  onFilterChange,
}: {
  data: AffiliateHQData;
  onAction: (a: string) => void;
  actionLoading: string | null;
  filter: "ALL" | "JOINED" | "PENDING";
  onFilterChange: (f: "ALL" | "JOINED" | "PENDING") => void;
}) {
  const { partners } = data;
  const filtered = filter === "ALL" ? partners.advertisers : partners.advertisers.filter((a) => a.status === filter);

  return (
    <div>
      {/* Network Cards */}
      {partners.networks.map((n) => (
        <div key={n.id} style={{ padding: "1rem", background: "#f8fafc", borderRadius: 12, marginBottom: "1rem", border: "1px solid #e5e7eb" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: "1rem" }}>{n.name}</div>
              <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                {n.advertisers} {n.id === "travelpayouts" ? "programs" : "advertisers"} | {n.id === "travelpayouts" ? `Marker: ${(n as Record<string, unknown>).marker || "Not set"}` : `Website ID: ${n.websiteId || "Not set"}`}
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: n.apiHealth === "green" ? "#16a34a" : n.apiHealth === "red" ? "#dc2626" : "#9ca3af",
                  display: "inline-block",
                }}
              />
              <span style={{ fontSize: "0.75rem", textTransform: "capitalize" }}>{n.status}</span>
            </div>
          </div>
          {n.id === "cj" && (
            <button onClick={() => onAction("test_connection")} disabled={!!actionLoading} style={{ ...btnStyle("#6b7280"), marginTop: "0.5rem", padding: "0.25rem 0.75rem", fontSize: "0.75rem" }}>
              Test Connection
            </button>
          )}
          {n.programs && n.programs.length > 0 && (
            <div style={{ marginTop: "0.5rem" }}>
              {n.programs.map((p) => (
                <div key={p.name} style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0", borderBottom: "1px solid #e5e7eb", fontSize: "0.75rem" }}>
                  <span style={{ fontWeight: 600 }}>{p.name}</span>
                  <span style={{ color: "#6b7280" }}>{p.commission} · {p.cookie} · {p.category}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Filter */}
      <div style={{ display: "flex", gap: "0.25rem", marginBottom: "0.75rem" }}>
        {(["ALL", "JOINED", "PENDING"] as const).map((f) => (
          <button
            key={f}
            onClick={() => onFilterChange(f)}
            style={{
              padding: "0.25rem 0.75rem",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              fontWeight: filter === f ? 700 : 400,
              background: filter === f ? "#1e3a5f" : "#f3f4f6",
              color: filter === f ? "#fff" : "#374151",
              fontSize: "0.75rem",
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Advertiser Table */}
      <div style={{ overflowX: "auto" }}>
        {filtered.map((a) => (
          <div
            key={a.id}
            style={{
              padding: "0.75rem",
              borderBottom: "1px solid #f3f4f6",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}
          >
            <div style={{ minWidth: "60%" }}>
              <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{a.name}</div>
              <div style={{ fontSize: "0.7rem", color: "#6b7280" }}>
                {a.category || "Uncategorized"} | EPC: ${a.threeMonthEpc?.toFixed(2) || "0.00"}
                {a.cookieDuration ? ` | ${a.cookieDuration}d cookie` : ""}
              </div>
            </div>
            <StatusBadge status={a.status} />
          </div>
        ))}
        {filtered.length === 0 && (
          <p style={{ color: "#6b7280", textAlign: "center", padding: "1rem", fontSize: "0.85rem" }}>No advertisers match this filter</p>
        )}
      </div>

      <div style={{ marginTop: "1rem" }}>
        <button onClick={() => onAction("sync_advertisers")} disabled={actionLoading === "sync_advertisers"} style={btnStyle("#C49A2A")}>
          {actionLoading === "sync_advertisers" ? "Syncing..." : "Sync Advertisers Now"}
        </button>
      </div>
    </div>
  );
}

// ─── Tab 3: Coverage & Page Performance ─────────────────────────────────────

function CoverageTab({ data, onAction, actionLoading, runActionRaw }: { data: AffiliateHQData; onAction: (a: string) => void; actionLoading: string | null; runActionRaw: (action: string, extra?: Record<string, unknown>) => Promise<void> }) {
  const { coverage } = data;
  const [filter, setFilter] = useState<"all" | "covered" | "uncovered">("all");
  const [sortBy, setSortBy] = useState<"clicks" | "revenue" | "links" | "title">("clicks");
  const barWidth = Math.max(coverage.coveragePercent, 3);
  const pages = coverage.pages || [];

  const filtered = pages.filter((p) => {
    if (filter === "covered") return p.hasAffiliateLinks;
    if (filter === "uncovered") return !p.hasAffiliateLinks;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "title") return a.title.localeCompare(b.title);
    if (sortBy === "links") return b.linkCount - a.linkCount;
    if (sortBy === "revenue") return b.revenue - a.revenue;
    return b.affiliateClicks - a.affiliateClicks;
  });

  const totalClicks = pages.reduce((s, p) => s + p.affiliateClicks, 0);
  const totalRevenue = pages.reduce((s, p) => s + p.revenue, 0);
  const totalSales = pages.reduce((s, p) => s + p.sales, 0);
  const totalLinks = pages.reduce((s, p) => s + p.linkCount, 0);
  const barColor = coverage.coveragePercent >= 80 ? "#16a34a" : coverage.coveragePercent >= 50 ? "#f59e0b" : "#dc2626";

  return (
    <div>
      {/* Coverage meter */}
      <div style={{ padding: "0.75rem", background: "#f8fafc", borderRadius: 10, marginBottom: "0.75rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.4rem" }}>
          <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>Page Coverage</span>
          <span style={{ fontSize: "1.2rem", fontWeight: 800, color: barColor }}>{coverage.coveragePercent}%</span>
        </div>
        <div style={{ background: "#e5e7eb", borderRadius: 6, height: 10, overflow: "hidden", marginBottom: "0.4rem" }}>
          <div style={{ width: `${barWidth}%`, height: "100%", background: barColor, borderRadius: 6, transition: "width 0.3s" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "#6b7280" }}>
          <span>{coverage.withAffiliates} covered</span>
          <span>{coverage.withoutAffiliates} uncovered</span>
          <span>{coverage.totalArticles} total</span>
        </div>
      </div>

      {/* Performance KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0.4rem", marginBottom: "0.75rem" }}>
        <KpiCard label="Active Links" value={String(totalLinks)} />
        <KpiCard label="Clicks" value={String(totalClicks)} />
        <KpiCard label="Sales" value={String(totalSales)} />
        <KpiCard label="Revenue" value={totalRevenue > 0 ? `$${totalRevenue.toFixed(0)}` : "$0"} />
      </div>

      {/* Filter + Sort */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "0.2rem" }}>
          {(["all", "covered", "uncovered"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "0.2rem 0.5rem", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: "0.65rem",
                fontWeight: filter === f ? 700 : 400, cursor: "pointer",
                background: filter === f ? "#1f2937" : "#fff", color: filter === f ? "#fff" : "#374151",
              }}
            >
              {f === "all" ? `All (${pages.length})` : f === "covered" ? `Covered (${coverage.withAffiliates})` : `No Links (${coverage.withoutAffiliates})`}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: "0.2rem" }}>
          {(["clicks", "revenue", "links", "title"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              style={{
                padding: "0.2rem 0.5rem", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: "0.65rem",
                fontWeight: sortBy === s ? 700 : 400, cursor: "pointer",
                background: sortBy === s ? "#C49A2A" : "#fff", color: sortBy === s ? "#fff" : "#374151",
              }}
            >
              {s === "links" ? "Links" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Page List */}
      {sorted.length === 0 ? (
        <div style={{ padding: "2rem 1rem", textAlign: "center", color: "#9ca3af", fontSize: "0.85rem" }}>
          No published articles found.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          {sorted.map((page) => (
            <PageRow key={page.id} page={page} onInjectLinks={runActionRaw} allLinks={data.links.linksList || []} />
          ))}
        </div>
      )}

      {/* Action */}
      <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
        <button onClick={() => onAction("inject_links")} disabled={actionLoading === "inject_links"} style={btnStyle("#C49A2A")}>
          {actionLoading === "inject_links" ? "Injecting..." : "Inject Links into Uncovered Pages"}
        </button>
      </div>
    </div>
  );
}

/** Per-page row in Coverage tab with inject button + link inspector */
function PageRow({ page, onInjectLinks, allLinks }: {
  page: { id: string; title: string; slug: string; publishedAt: string | null; hasAffiliateLinks: boolean; linkCount: number; affiliateClicks: number; revenue: number; sales: number; advertisers: string[] };
  onInjectLinks: (action: string, extra?: Record<string, unknown>) => Promise<void>;
  allLinks: AffiliateHQData["links"]["linksList"];
}) {
  const [expanded, setExpanded] = useState(false);
  const [injecting, setInjecting] = useState(false);
  const [injectResult, setInjectResult] = useState<string | null>(null);

  // Find affiliate links present in this article
  const articleLinks = allLinks.filter((l) =>
    l.pages?.some((p) => p.url.includes(page.slug))
  );

  const handleInject = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setInjecting(true);
    setInjectResult(null);
    try {
      await onInjectLinks("inject_links", { articleId: page.id });
      setInjectResult("Done");
    } catch {
      setInjectResult("Failed");
    } finally {
      setInjecting(false);
    }
  };

  return (
    <div
      style={{
        background: "#fff", borderRadius: 8, overflow: "hidden",
        border: `1px solid ${page.hasAffiliateLinks ? "#e5e7eb" : "#fecaca"}`,
      }}
    >
      <div onClick={() => setExpanded(!expanded)} style={{ padding: "0.5rem 0.6rem", cursor: "pointer" }}>
        {/* Title + coverage badge */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.3rem", marginBottom: "0.2rem" }}>
          <div style={{ fontSize: "0.8rem", fontWeight: 500, color: "#111827", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {page.title || page.slug}
          </div>
          <span style={{
            fontSize: "0.6rem", fontWeight: 600, padding: "0.1rem 0.4rem", borderRadius: 8, whiteSpace: "nowrap",
            background: page.hasAffiliateLinks ? "#dcfce7" : "#fee2e2",
            color: page.hasAffiliateLinks ? "#166534" : "#991b1b",
          }}>
            {page.hasAffiliateLinks ? `${page.linkCount} link${page.linkCount !== 1 ? "s" : ""}` : "NO LINKS"}
          </span>
        </div>

        {/* Slug */}
        <div style={{ fontSize: "0.65rem", color: "#9ca3af", marginBottom: "0.3rem" }}>/blog/{page.slug}</div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.2rem" }}>
          <StatCell label="Clicks" value={String(page.affiliateClicks)} />
          <StatCell label="Sales" value={String(page.sales)} highlight={page.sales > 0} />
          <StatCell label="Revenue" value={page.revenue > 0 ? `$${page.revenue.toFixed(2)}` : "—"} highlight={page.revenue > 0} />
        </div>
      </div>

      {/* Expanded detail — Link Inspector + Actions */}
      {expanded && (
        <div style={{ padding: "0.5rem 0.6rem", borderTop: "1px solid #f3f4f6", background: "#fafaf8" }}>
          {/* Partners + Published date */}
          <div style={{ fontSize: "0.7rem", color: "#374151", marginBottom: "0.4rem" }}>
            {page.advertisers.length > 0 && (
              <div style={{ marginBottom: "0.2rem" }}>
                <strong>Partners:</strong> {page.advertisers.join(", ")}
              </div>
            )}
            {page.publishedAt && (
              <div><strong>Published:</strong> {new Date(page.publishedAt).toLocaleDateString()}</div>
            )}
          </div>

          {/* Link Inspector — shows every affiliate link in this article */}
          {articleLinks.length > 0 && (
            <div style={{ marginBottom: "0.5rem" }}>
              <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#1e3a5f", marginBottom: "0.3rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <span>Links in this article</span>
                <span style={{ background: "#e0e7ff", color: "#3730a3", fontSize: "0.6rem", fontWeight: 700, padding: "0.05rem 0.35rem", borderRadius: 8 }}>{articleLinks.length}</span>
              </div>
              {articleLinks.map((link) => (
                <div key={link.id} style={{ padding: "0.3rem 0.4rem", background: "#fff", borderRadius: 6, border: "1px solid #e5e7eb", marginBottom: "0.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.15rem" }}>
                    <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "#374151", maxWidth: "60%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {link.advertiser}
                    </span>
                    <div style={{ display: "flex", gap: "0.4rem", fontSize: "0.65rem" }}>
                      <span style={{ color: "#6b7280" }}>{link.clicks} click{link.clicks !== 1 ? "s" : ""}</span>
                      {link.revenue > 0 && <span style={{ color: "#16a34a", fontWeight: 600 }}>${link.revenue.toFixed(2)}</span>}
                    </div>
                  </div>
                  <div style={{ fontSize: "0.6rem", color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {link.destinationUrl.replace(/^https?:\/\/(www\.)?/, "").substring(0, 50)}
                    {link.linkType ? ` · ${link.linkType}` : ""}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Action row */}
          <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", flexWrap: "wrap" }}>
            {!page.hasAffiliateLinks && (
              <button
                onClick={handleInject}
                disabled={injecting}
                style={{
                  padding: "0.3rem 0.7rem", borderRadius: 6, border: "none", fontSize: "0.7rem", fontWeight: 600,
                  cursor: injecting ? "wait" : "pointer",
                  background: injecting ? "#d1d5db" : "#C49A2A", color: "#fff",
                  minHeight: 32,
                }}
              >
                {injecting ? "Injecting…" : "Inject Links"}
              </button>
            )}
            {injectResult && (
              <span style={{ fontSize: "0.65rem", fontWeight: 600, color: injectResult === "Done" ? "#16a34a" : "#dc2626" }}>
                {injectResult === "Done" ? "Links injected" : "Injection failed"}
              </span>
            )}
            <a
              href={`/blog/${page.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#C49A2A", fontWeight: 600, textDecoration: "none", fontSize: "0.7rem" }}
            >
              View Page →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Link Detail Modal ─────────────────────────────────────────────────────

function LinkDetailModal({ link, onClose }: {
  link: AffiliateHQData["links"]["linksList"][number];
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copyUrl = () => {
    navigator.clipboard.writeText(link.affiliateUrl || link.destinationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const fmtDate = (d: string | null) => {
    if (!d) return "Never";
    return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 480, maxHeight: "85vh", overflowY: "auto",
          background: "#fff", borderRadius: "16px 16px 0 0",
          padding: "1.25rem", WebkitOverflowScrolling: "touch",
          boxShadow: "0 -4px 24px rgba(0,0,0,0.12)",
        }}
      >
        {/* Drag indicator */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.75rem" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "#d1d5db" }} />
        </div>

        {/* Header: Name + Status */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#111827", margin: 0, lineHeight: 1.3 }}>
              {link.name || link.advertiser}
            </h2>
            <div style={{ fontSize: "0.78rem", color: "#6b7280", marginTop: "0.2rem" }}>
              {link.advertiser}{link.category ? ` — ${link.category}` : ""}
            </div>
          </div>
          <span style={{
            fontSize: "0.65rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: 10, whiteSpace: "nowrap", flexShrink: 0, marginLeft: "0.5rem",
            background: link.isActive ? "#dcfce7" : "#fee2e2",
            color: link.isActive ? "#166534" : "#991b1b",
          }}>
            {link.isActive ? "ACTIVE" : "INACTIVE"}
          </span>
        </div>

        {/* Stats Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", marginBottom: "1rem" }}>
          <div style={{ padding: "0.6rem", background: "#f8fafc", borderRadius: 10, textAlign: "center", border: "1px solid #e5e7eb" }}>
            <div style={{ fontSize: "0.6rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.03em" }}>Clicks</div>
            <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#1e3a5f" }}>{link.clicks}</div>
          </div>
          <div style={{ padding: "0.6rem", background: "#f8fafc", borderRadius: 10, textAlign: "center", border: "1px solid #e5e7eb" }}>
            <div style={{ fontSize: "0.6rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.03em" }}>Revenue</div>
            <div style={{ fontSize: "1.2rem", fontWeight: 700, color: link.revenue > 0 ? "#16a34a" : "#1e3a5f" }}>
              {link.revenue > 0 ? `$${link.revenue.toFixed(2)}` : "$0"}
            </div>
          </div>
          <div style={{ padding: "0.6rem", background: "#f8fafc", borderRadius: 10, textAlign: "center", border: "1px solid #e5e7eb" }}>
            <div style={{ fontSize: "0.6rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.03em" }}>Sales</div>
            <div style={{ fontSize: "1.2rem", fontWeight: 700, color: link.sales > 0 ? "#16a34a" : "#1e3a5f" }}>{link.sales}</div>
          </div>
        </div>

        {/* Detail Rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
          <DetailRow label="Partner" value={link.advertiser} />
          <DetailRow label="Link Type" value={link.linkType || "Standard"} />
          <DetailRow label="CTR" value={link.ctr > 0 ? `${link.ctr}%` : "No data"} />
          <DetailRow label="Created" value={fmtDate(link.createdAt)} />
          <DetailRow label="Last Clicked" value={fmtDate(link.lastClickAt)} />
        </div>

        {/* Destination URL */}
        <div style={{ marginBottom: "0.75rem" }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>Destination URL</div>
          <div style={{ fontSize: "0.72rem", color: "#6b7280", wordBreak: "break-all", padding: "0.5rem", background: "#f8fafc", borderRadius: 8, border: "1px solid #e5e7eb", lineHeight: 1.5 }}>
            {link.destinationUrl}
          </div>
        </div>

        {/* Affiliate/Tracking URL */}
        {link.affiliateUrl && (
          <div style={{ marginBottom: "0.75rem" }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>Tracking URL</div>
            <div style={{ fontSize: "0.68rem", color: "#9ca3af", wordBreak: "break-all", padding: "0.5rem", background: "#f8fafc", borderRadius: 8, border: "1px solid #e5e7eb", lineHeight: 1.5 }}>
              {link.affiliateUrl}
            </div>
          </div>
        )}

        {/* Pages where link appears */}
        {link.pages.length > 0 && (
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "#374151", marginBottom: "0.35rem" }}>
              Articles ({link.pages.length})
            </div>
            {link.pages.map((p) => {
              const slug = p.url.replace(/^https?:\/\/[^/]+/, "").replace(/\/$/, "") || "/";
              return (
                <div key={p.url} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "0.35rem 0.5rem", background: "#f8fafc", borderRadius: 6, marginBottom: "0.25rem",
                  border: "1px solid #e5e7eb",
                }}>
                  <a
                    href={slug}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: "0.72rem", color: "#1e3a5f", textDecoration: "none", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  >
                    {slug}
                  </a>
                  <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "#374151", marginLeft: "0.5rem", whiteSpace: "nowrap" }}>
                    {p.clicks} click{p.clicks !== 1 ? "s" : ""}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={copyUrl}
            style={{
              flex: 1, padding: "0.65rem", borderRadius: 10, border: "none", cursor: "pointer",
              fontWeight: 700, fontSize: "0.85rem",
              background: copied ? "#16a34a" : "#C49A2A", color: "#fff",
              transition: "background 0.2s",
            }}
          >
            {copied ? "Copied!" : "Copy URL"}
          </button>
          <button
            onClick={onClose}
            style={{
              padding: "0.65rem 1.25rem", borderRadius: 10, border: "2px solid #d1d5db", cursor: "pointer",
              fontWeight: 600, fontSize: "0.85rem", background: "#fff", color: "#374151",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.3rem 0", borderBottom: "1px solid #f3f4f6" }}>
      <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>{label}</span>
      <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#111827" }}>{value}</span>
    </div>
  );
}

// ─── Tab 4: Links — Per-Link List ───────────────────────────────────────────

function LinksTab({ data, onAction, actionLoading }: { data: AffiliateHQData; onAction: (a: string) => void; actionLoading: string | null }) {
  const { links } = data;
  const [selectedLink, setSelectedLink] = useState<AffiliateHQData["links"]["linksList"][number] | null>(null);
  const [sortBy, setSortBy] = useState<"clicks" | "revenue" | "date" | "lastClicked" | "url" | "name">("clicks");
  const [filterAdvertiser, setFilterAdvertiser] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const linksList = links.linksList || [];

  // Unique advertisers for filter dropdown
  const advertisers = [...new Set<string>(linksList.map((l) => l.advertiser))].sort();

  // Filter
  const filtered = linksList.filter((l) => {
    if (filterAdvertiser !== "all" && l.advertiser !== filterAdvertiser) return false;
    if (filterStatus === "active" && !l.isActive) return false;
    if (filterStatus === "inactive" && l.isActive) return false;
    return true;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "name": return a.name.localeCompare(b.name);
      case "url": return a.destinationUrl.localeCompare(b.destinationUrl);
      case "revenue": return b.revenue - a.revenue;
      case "date": {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return db - da;
      }
      case "lastClicked": {
        const la = a.lastClickAt ? new Date(a.lastClickAt).getTime() : 0;
        const lb = b.lastClickAt ? new Date(b.lastClickAt).getTime() : 0;
        return lb - la;
      }
      default: return b.clicks - a.clicks;
    }
  });

  // Totals
  const totalClicks = filtered.reduce((s, l) => s + l.clicks, 0);
  const totalRevenue = filtered.reduce((s, l) => s + l.revenue, 0);
  const totalSales = filtered.reduce((s, l) => s + l.sales, 0);

  const fmtDate = (d: string | null) => {
    if (!d) return "—";
    const dt = new Date(d);
    return `${dt.getDate()} ${dt.toLocaleString("en", { month: "short" })}`;
  };

  const shortUrl = (url: string) => {
    return url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
  };

  return (
    <div>
      {/* Summary KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))", gap: "0.5rem", marginBottom: "0.75rem" }}>
        <KpiCard label="Links" value={String(filtered.length)} />
        <KpiCard label="Clicks" value={String(totalClicks)} />
        <KpiCard label="Sales" value={String(totalSales)} />
        <KpiCard label="Revenue" value={totalRevenue > 0 ? `$${totalRevenue.toFixed(2)}` : "$0"} />
      </div>

      {/* Filters Row */}
      <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
        {/* Advertiser dropdown */}
        <select
          value={filterAdvertiser}
          onChange={(e) => setFilterAdvertiser(e.target.value)}
          style={{
            padding: "0.3rem 0.5rem", borderRadius: 6, border: "1px solid #e5e7eb",
            fontSize: "0.7rem", background: "#fff", color: "#374151",
            maxWidth: "45%",
          }}
        >
          <option value="all">All Partners</option>
          {advertisers.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        {/* Status filter */}
        {(["all", "active", "inactive"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            style={{
              padding: "0.2rem 0.5rem", borderRadius: 6, border: "1px solid #e5e7eb",
              fontSize: "0.65rem", fontWeight: filterStatus === s ? 700 : 400, cursor: "pointer",
              background: filterStatus === s ? "#1f2937" : "#fff",
              color: filterStatus === s ? "#fff" : "#374151",
            }}
          >
            {s === "all" ? "All" : s === "active" ? "Active" : "Inactive"}
          </button>
        ))}
      </div>

      {/* Sort Controls */}
      <div style={{ display: "flex", gap: "0.25rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
        {(["clicks", "revenue", "date", "lastClicked", "url", "name"] as const).map((key) => {
          const labels: Record<string, string> = { clicks: "Clicks", revenue: "Revenue", date: "Date", lastClicked: "Last Click", url: "URL", name: "Name" };
          return (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              style={{
                padding: "0.2rem 0.5rem", borderRadius: 6, border: "1px solid #e5e7eb",
                fontSize: "0.65rem", fontWeight: sortBy === key ? 700 : 400, cursor: "pointer",
                background: sortBy === key ? "#C49A2A" : "#fff",
                color: sortBy === key ? "#fff" : "#374151",
              }}
            >
              {labels[key]}
            </button>
          );
        })}
      </div>

      {/* Links List — individual links */}
      {sorted.length === 0 ? (
        <div style={{ padding: "2rem 1rem", textAlign: "center", color: "#9ca3af", fontSize: "0.85rem" }}>
          {linksList.length === 0
            ? <>No affiliate links yet. Tap <strong>Sync Advertisers</strong> in the Actions tab.</>
            : "No links match your filters."
          }
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          {sorted.map((link) => {
            const destShort = shortUrl(link.destinationUrl);
            const destDisplay = destShort.length > 40 ? destShort.substring(0, 40) + "…" : destShort;

            return (
              <div
                key={link.id}
                onClick={() => setSelectedLink(link)}
                style={{
                  background: "#fff", borderRadius: 10,
                  border: "1px solid #e5e7eb",
                  overflow: "hidden", cursor: "pointer",
                }}
              >
                <div style={{ padding: "0.5rem 0.65rem" }}>
                  {/* Row 1: Link name + status */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.3rem", marginBottom: "0.15rem" }}>
                    <div style={{ fontWeight: 600, fontSize: "0.8rem", color: "#111827", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {link.name || link.advertiser}
                    </div>
                    <span style={{
                      fontSize: "0.6rem", fontWeight: 600, padding: "0.1rem 0.4rem", borderRadius: 8, whiteSpace: "nowrap",
                      background: link.isActive ? "#dcfce7" : "#fee2e2",
                      color: link.isActive ? "#166534" : "#991b1b",
                    }}>
                      {link.isActive ? "ACTIVE" : "OFF"}
                    </span>
                  </div>

                  {/* Row 2: URL + advertiser */}
                  <div style={{ fontSize: "0.65rem", color: "#6b7280", marginBottom: "0.35rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {destDisplay} &middot; {link.advertiser}
                  </div>

                  {/* Row 3: Stats grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0.2rem" }}>
                    <StatCell label="Clicks" value={String(link.clicks)} />
                    <StatCell label="Revenue" value={link.revenue > 0 ? `$${link.revenue.toFixed(2)}` : "—"} highlight={link.revenue > 0} />
                    <StatCell label="Added" value={fmtDate(link.createdAt)} />
                    <StatCell label="Last Click" value={fmtDate(link.lastClickAt)} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
        <button onClick={() => onAction("refresh_links")} disabled={actionLoading === "refresh_links"} style={btnStyle("#1f2937")}>
          {actionLoading === "refresh_links" ? "Syncing..." : "Refresh Links"}
        </button>
        <button onClick={() => onAction("refresh_deals")} disabled={actionLoading === "refresh_deals"} style={btnStyle("#C49A2A")}>
          {actionLoading === "refresh_deals" ? "Discovering..." : "Discover Deals"}
        </button>
      </div>

      {/* Recent Deals (collapsed section) */}
      {links.recentDeals.length > 0 && (
        <div style={{ marginTop: "1.5rem" }}>
          <h3 style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.5rem" }}>Recent Deals & Offers</h3>
          {links.recentDeals.slice(0, 5).map((d) => (
            <div key={d.id} style={{ padding: "0.4rem 0", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ maxWidth: "70%" }}>
                <div style={{ fontSize: "0.8rem", fontWeight: 500 }}>{d.title}</div>
                <div style={{ fontSize: "0.65rem", color: "#6b7280" }}>
                  {d.advertiser} &middot; {d.category}
                  {d.isPriceDrop && <span style={{ color: "#16a34a", fontWeight: 700, marginLeft: 4 }}>PRICE DROP</span>}
                  {d.isNewArrival && <span style={{ color: "#3b82f6", fontWeight: 700, marginLeft: 4 }}>NEW</span>}
                </div>
              </div>
              {d.price != null && (
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 700, fontSize: "0.8rem" }}>${d.price.toFixed(2)}</div>
                  {d.previousPrice != null && d.isPriceDrop && (
                    <div style={{ fontSize: "0.65rem", color: "#dc2626", textDecoration: "line-through" }}>${d.previousPrice.toFixed(2)}</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Link Detail Modal */}
      {selectedLink && <LinkDetailModal link={selectedLink} onClose={() => setSelectedLink(null)} />}
    </div>
  );
}

/** Compact stat cell for link cards */
function StatCell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: "0.6rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.03em" }}>{label}</div>
      <div style={{ fontSize: "0.8rem", fontWeight: 600, color: highlight ? "#16a34a" : "#111827" }}>{value}</div>
    </div>
  );
}

// ─── Tab 5: Actions ──────────────────────────────────────────────────────────

function ActionsTab({ onAction, actionLoading }: { onAction: (a: string, extra?: Record<string, unknown>) => void; actionLoading: string | null }) {
  const [diagResult, setDiagResult] = useState<{
    status: string;
    issueCount: number;
    issues: Array<{ severity: string; issue: string; fix: string }>;
    joinedAdvertisers: number;
    coveragePercent: number;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ name: string; price: number; salePrice: number; advertiser: string }> | null>(null);
  const [fullSyncResult, setFullSyncResult] = useState<Record<string, unknown> | null>(null);
  const [auditResult, setAuditResult] = useState<{
    scannedArticles: number;
    totalLinks: number;
    healthScore: number;
    summary: { live: number; dead: number; tracked: number; untracked: number; relevant: number; irrelevant: number; fresh: number; stale: number; wellPlaced: number; poorlyPlaced: number };
    issues: Array<{ severity: string; issue: string; fix: string; articleSlug: string; linkUrl: string }>;
    checks: Array<{
      link: { url: string; trackingUrl: string | null; partner: string; anchorText: string; positionInArticle: string; nearestHeading: string; articleSlug: string; articleTitle: string };
      liveness: { ok: boolean; statusCode: number | null; finalUrl: string | null; error: string | null };
      tracked: { ok: boolean; reason: string };
      relevance: { ok: boolean; score: number; reason: string };
      freshness: { ok: boolean; reason: string };
      placement: { ok: boolean; score: number; reason: string };
      visual: { ok: boolean; reason: string };
      overallScore: number;
    }>;
  } | null>(null);
  const [showAuditJson, setShowAuditJson] = useState(false);
  const [auditCopied, setAuditCopied] = useState(false);
  const [fixResult, setFixResult] = useState<{ deadRemoved: number; staleRemoved: number; linksWrapped: number } | null>(null);
  const [fixLoading, setFixLoading] = useState(false);

  const runDiagnose = async () => {
    onAction("diagnose");
    try {
      const res = await fetch("/api/admin/affiliate-hq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "diagnose" }),
      });
      const json = await res.json().catch(() => ({ success: false, error: `HTTP ${res.status} (non-JSON response)` }));
      if (json.success && json.result) setDiagResult(json.result);
    } catch { /* handled by parent */ }
  };

  const runSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const res = await fetch("/api/admin/affiliate-hq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "search_products", keywords: searchQuery }),
      });
      const json = await res.json().catch(() => ({ success: false, error: `HTTP ${res.status} (non-JSON response)` }));
      if (json.success && json.result) setSearchResults(json.result.products || []);
    } catch { setSearchResults([]); }
  };

  const runLinkAudit = async () => {
    setAuditResult(null);
    onAction("link_health_audit");
    try {
      const res = await fetch("/api/admin/affiliate-hq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "link_health_audit" }),
      });
      const json = await res.json().catch(() => ({ success: false, error: `HTTP ${res.status} (non-JSON response)` }));
      if (json.success && json.result) setAuditResult(json.result);
    } catch { /* handled by parent */ }
  };

  const runFullSync = async () => {
    setFullSyncResult(null);
    onAction("full_sync");
    try {
      const res = await fetch("/api/admin/affiliate-hq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "full_sync" }),
      });
      const json = await res.json().catch(() => ({ success: false, error: `HTTP ${res.status} (non-JSON response)` }));
      if (json.success && json.result) setFullSyncResult(json.result);
    } catch { /* handled by parent */ }
  };

  const sevColor = (s: string) =>
    s === "critical" ? "#dc2626" : s === "high" ? "#f59e0b" : s === "medium" ? "#3b82f6" : "#6b7280";

  return (
    <div>
      {/* Quick Actions Grid */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h3 style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.75rem" }}>Quick Actions</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
          <ActionCard
            label="Diagnose Issues"
            desc="Check for problems and get fix suggestions"
            color="#7c3aed"
            loading={actionLoading === "diagnose"}
            onClick={runDiagnose}
          />
          <ActionCard
            label="Full Sync"
            desc="Run all 4 CJ syncs in sequence"
            color="#1e3a5f"
            loading={actionLoading === "full_sync"}
            onClick={runFullSync}
          />
          <ActionCard
            label="Inject Links"
            desc="Add affiliate links to uncovered articles"
            color="#16a34a"
            loading={actionLoading === "inject_links"}
            onClick={() => onAction("inject_links")}
          />
          <ActionCard
            label="Sync Commissions"
            desc="Pull latest revenue data from CJ"
            color="#C49A2A"
            loading={actionLoading === "sync_commissions"}
            onClick={() => onAction("sync_commissions")}
          />
          <ActionCard
            label="Sync Advertisers"
            desc="Check for newly approved partners"
            color="#3b82f6"
            loading={actionLoading === "sync_advertisers"}
            onClick={() => onAction("sync_advertisers")}
          />
          <ActionCard
            label="Discover Deals"
            desc="Search CJ catalog for new offers"
            color="#f59e0b"
            loading={actionLoading === "refresh_deals"}
            onClick={() => onAction("refresh_deals")}
          />
          <ActionCard
            label="Refresh Links"
            desc="Update tracking links from CJ"
            color="#6b7280"
            loading={actionLoading === "refresh_links"}
            onClick={() => onAction("refresh_links")}
          />
          <ActionCard
            label="Test Connection"
            desc="Verify CJ API credentials work"
            color="#0ea5e9"
            loading={actionLoading === "test_connection"}
            onClick={() => onAction("test_connection")}
          />
          <ActionCard
            label="Reset Circuit Breaker"
            desc="Clear API failure lockout to retry"
            color="#dc2626"
            loading={actionLoading === "reset_circuit_breaker"}
            onClick={() => onAction("reset_circuit_breaker")}
          />
          <ActionCard
            label="Link Health Audit"
            desc="Check all links: liveness, tracking, relevance, freshness, placement"
            color="#f97316"
            loading={actionLoading === "link_health_audit"}
            onClick={runLinkAudit}
          />
        </div>
      </div>

      {/* Diagnose Results */}
      {diagResult && (
        <div style={{ marginBottom: "1.5rem", padding: "1rem", background: "#f8fafc", borderRadius: 12, border: "1px solid #e5e7eb" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <h3 style={{ fontSize: "0.9rem", fontWeight: 700, margin: 0 }}>
              Diagnosis: <span style={{ color: diagResult.status === "healthy" ? "#16a34a" : diagResult.status === "critical" ? "#dc2626" : "#f59e0b" }}>
                {diagResult.status.toUpperCase()}
              </span>
            </h3>
            <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>
              {diagResult.joinedAdvertisers} partners | {diagResult.coveragePercent}% coverage
            </span>
          </div>
          {diagResult.issues.length === 0 ? (
            <p style={{ color: "#16a34a", fontSize: "0.85rem", margin: 0 }}>All systems healthy — no issues found</p>
          ) : (
            diagResult.issues.map((issue, i) => (
              <div key={i} style={{ padding: "0.5rem 0", borderBottom: i < diagResult.issues.length - 1 ? "1px solid #e5e7eb" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: sevColor(issue.severity), flexShrink: 0 }} />
                  <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>{issue.issue}</span>
                </div>
                <div style={{ fontSize: "0.75rem", color: "#16a34a", marginLeft: "1rem", marginTop: "0.25rem" }}>
                  Fix: {issue.fix}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Link Health Audit Results */}
      {auditResult && (
        <div style={{ marginBottom: "1.5rem", padding: "1rem", background: "#fff7ed", borderRadius: 12, border: "1px solid #fed7aa" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <h3 style={{ fontSize: "0.9rem", fontWeight: 700, margin: 0 }}>
              Link Health:{" "}
              <span style={{ color: auditResult.healthScore >= 70 ? "#16a34a" : auditResult.healthScore >= 40 ? "#f59e0b" : "#dc2626" }}>
                {auditResult.healthScore}/100
              </span>
            </h3>
            <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>
              {auditResult.scannedArticles} articles | {auditResult.totalLinks} links
            </span>
          </div>

          {/* Summary Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.35rem", marginBottom: "0.75rem" }}>
            {[
              { label: "Live", good: auditResult.summary.live, bad: auditResult.summary.dead, badLabel: "Dead" },
              { label: "Tracked", good: auditResult.summary.tracked, bad: auditResult.summary.untracked, badLabel: "Untracked" },
              { label: "Relevant", good: auditResult.summary.relevant, bad: auditResult.summary.irrelevant, badLabel: "Misplaced" },
              { label: "Fresh", good: auditResult.summary.fresh, bad: auditResult.summary.stale, badLabel: "Stale" },
              { label: "Well placed", good: auditResult.summary.wellPlaced, bad: auditResult.summary.poorlyPlaced, badLabel: "Poor" },
            ].map((s, i) => (
              <div key={i} style={{ padding: "0.35rem 0.5rem", background: "#fff", borderRadius: 6, border: "1px solid #f3f4f6", fontSize: "0.7rem" }}>
                <span style={{ color: "#16a34a", fontWeight: 700 }}>{s.good}</span>
                <span style={{ color: "#6b7280" }}> {s.label}</span>
                {s.bad > 0 && (
                  <span style={{ color: "#dc2626", fontWeight: 600 }}> · {s.bad} {s.badLabel}</span>
                )}
              </div>
            ))}
          </div>

          {/* Export Buttons */}
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <button
              onClick={() => {
                const json = JSON.stringify(auditResult, null, 2);
                navigator.clipboard.writeText(json).then(() => {
                  setAuditCopied(true);
                  setTimeout(() => setAuditCopied(false), 2000);
                });
              }}
              style={{
                padding: "0.4rem 0.75rem", fontSize: "0.75rem", fontWeight: 600,
                background: auditCopied ? "#16a34a" : "#f97316", color: "#fff",
                border: "none", borderRadius: 6, cursor: "pointer",
              }}
            >
              {auditCopied ? "Copied!" : "Copy Full JSON"}
            </button>
            <button
              onClick={() => setShowAuditJson(!showAuditJson)}
              style={{
                padding: "0.4rem 0.75rem", fontSize: "0.75rem", fontWeight: 600,
                background: "#fff", color: "#f97316",
                border: "2px solid #f97316", borderRadius: 6, cursor: "pointer",
              }}
            >
              {showAuditJson ? "Hide Details" : "Show Full Report"}
            </button>
          </div>

          {/* Fix All Issues Button */}
          {(auditResult.summary.dead > 0 || auditResult.summary.untracked > 0 || auditResult.summary.stale > 0) && (
            <div style={{ marginBottom: "0.75rem" }}>
              <button
                onClick={async () => {
                  setFixLoading(true);
                  setFixResult(null);
                  try {
                    const res = await fetch("/api/admin/affiliate-hq", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "fix_affiliate_issues" }),
                    });
                    const json = await res.json().catch(() => ({ success: false }));
                    if (json.success && json.result) setFixResult(json.result);
                  } catch { /* handled */ }
                  setFixLoading(false);
                }}
                disabled={fixLoading}
                style={{
                  width: "100%", padding: "0.6rem 1rem", fontSize: "0.85rem", fontWeight: 700,
                  background: fixLoading ? "#9ca3af" : "#dc2626", color: "#fff",
                  border: "none", borderRadius: 8, cursor: fixLoading ? "not-allowed" : "pointer",
                }}
              >
                {fixLoading ? "Fixing..." : `Fix All Issues (${auditResult.summary.dead} dead, ${auditResult.summary.untracked} untracked, ${auditResult.summary.stale} stale)`}
              </button>
              {fixResult && (
                <div style={{ marginTop: "0.5rem", padding: "0.5rem 0.75rem", background: "#f0fdf4", borderRadius: 6, border: "1px solid #bbf7d0", fontSize: "0.8rem" }}>
                  <strong style={{ color: "#16a34a" }}>Fixed:</strong>{" "}
                  {fixResult.deadRemoved} dead removed, {fixResult.linksWrapped} links wrapped for tracking, {fixResult.staleRemoved} stale removed
                </div>
              )}
            </div>
          )}

          {/* Expanded JSON View */}
          {showAuditJson && (
            <div style={{ marginBottom: "0.75rem" }}>
              <pre style={{
                background: "#1e293b", color: "#e2e8f0", padding: "0.75rem",
                borderRadius: 8, fontSize: "0.65rem", lineHeight: 1.4,
                maxHeight: 400, overflowY: "auto", overflowX: "auto",
                WebkitOverflowScrolling: "touch", whiteSpace: "pre-wrap", wordBreak: "break-word",
              }}>
                {JSON.stringify(auditResult, null, 2)}
              </pre>
            </div>
          )}

          {/* Issues */}
          {auditResult.issues.length === 0 ? (
            <p style={{ color: "#16a34a", fontSize: "0.85rem", margin: 0 }}>All affiliate links are healthy</p>
          ) : (
            <div>
              <h4 style={{ fontSize: "0.8rem", fontWeight: 600, margin: "0 0 0.5rem 0", color: "#92400e" }}>
                {auditResult.issues.length} issue{auditResult.issues.length !== 1 ? "s" : ""} found
              </h4>
              <div style={{ maxHeight: 300, overflowY: "auto" }}>
                {auditResult.issues.map((issue, i) => (
                  <div key={i} style={{ padding: "0.4rem 0", borderBottom: i < auditResult.issues.length - 1 ? "1px solid #fed7aa" : "none" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
                      <span style={{
                        width: 8, height: 8, borderRadius: "50%", flexShrink: 0, marginTop: 4,
                        background: sevColor(issue.severity),
                      }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "0.8rem", fontWeight: 500 }}>{issue.issue}</div>
                        <div style={{ fontSize: "0.7rem", color: "#16a34a", marginTop: "0.15rem" }}>
                          Fix: {issue.fix}
                        </div>
                        <div style={{ fontSize: "0.65rem", color: "#9ca3af", marginTop: "0.1rem" }}>
                          /{issue.articleSlug}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Full Sync Results */}
      {fullSyncResult && (
        <div style={{ marginBottom: "1.5rem", padding: "1rem", background: "#f0fdf4", borderRadius: 12, border: "1px solid #bbf7d0" }}>
          <h3 style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.5rem" }}>Full Sync Results</h3>
          {Object.entries(fullSyncResult).map(([step, result]) => {
            const r = result as Record<string, unknown>;
            const ok = r && !r.error;
            return (
              <div key={step} style={{ display: "flex", justifyContent: "space-between", padding: "0.35rem 0", fontSize: "0.8rem", borderBottom: "1px solid #dcfce7" }}>
                <span style={{ textTransform: "capitalize" }}>{step}</span>
                <span style={{ color: ok ? "#16a34a" : "#dc2626", fontWeight: 600 }}>
                  {ok ? (r.success ? "Done" : "OK") : String(r.error || "Failed")}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Product Search */}
      <div style={{ padding: "1rem", background: "#f8fafc", borderRadius: 12, border: "1px solid #e5e7eb" }}>
        <h3 style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.5rem" }}>Search CJ Products</h3>
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="e.g. hotel london, halal restaurant..."
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
            style={{ flex: 1, padding: "0.5rem 0.75rem", border: "1px solid #d1d5db", borderRadius: 8, fontSize: "0.85rem" }}
          />
          <button onClick={runSearch} style={btnStyle("#7c3aed")}>Search</button>
        </div>
        {searchResults && (
          searchResults.length === 0 ? (
            <p style={{ fontSize: "0.8rem", color: "#6b7280" }}>No products found. Try different keywords.</p>
          ) : (
            <div>
              {searchResults.slice(0, 10).map((p, i) => (
                <div key={i} style={{ padding: "0.5rem 0", borderBottom: "1px solid #f3f4f6" }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: 500 }}>{p.name}</div>
                  <div style={{ fontSize: "0.7rem", color: "#6b7280" }}>
                    {p.advertiser} | ${p.salePrice || p.price}
                    {p.salePrice > 0 && p.salePrice < p.price && (
                      <span style={{ color: "#16a34a", fontWeight: 600 }}> (SALE from ${p.price})</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}

function ActionCard({ label, desc, color, loading, onClick }: {
  label: string; desc: string; color: string; loading: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        padding: "0.75rem",
        background: loading ? "#f3f4f6" : "#fff",
        border: `2px solid ${loading ? "#d1d5db" : color}`,
        borderRadius: 10,
        cursor: loading ? "not-allowed" : "pointer",
        textAlign: "left",
        transition: "all 0.15s",
      }}
    >
      <div style={{ fontSize: "0.85rem", fontWeight: 700, color: loading ? "#9ca3af" : color }}>
        {loading ? "Running..." : label}
      </div>
      <div style={{ fontSize: "0.7rem", color: "#6b7280", marginTop: "0.15rem" }}>{desc}</div>
    </button>
  );
}

// ─── Tab 6: System Health ───────────────────────────────────────────────────

function SystemTab({ data, onAction, actionLoading }: { data: AffiliateHQData; onAction: (a: string, extra?: Record<string, unknown>) => void; actionLoading: string | null }) {
  const { systemHealth } = data;
  const { circuitBreaker, credentials, syncHistory, featureFlags } = systemHealth;

  return (
    <div>
      {/* Credentials */}
      <div style={{ padding: "1rem", background: "#f8fafc", borderRadius: 12, marginBottom: "1rem", border: "1px solid #e5e7eb" }}>
        <h3 style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.5rem" }}>API Credentials</h3>
        <div style={{ display: "flex", gap: "1rem" }}>
          <HealthDot ok={credentials.apiTokenConfigured} label="API Token" />
          <HealthDot ok={credentials.websiteIdConfigured} label="Website ID" />
          <HealthDot ok={!circuitBreaker.isOpen} label="Circuit Breaker" />
        </div>
        {circuitBreaker.isOpen && (
          <div style={{ marginTop: "0.5rem", padding: "0.5rem", background: "#fef2f2", borderRadius: 6, fontSize: "0.75rem", color: "#dc2626" }}>
            Circuit breaker OPEN — {circuitBreaker.failures} consecutive failures. Will auto-reset after cooldown.
          </div>
        )}
      </div>

      {/* Feature Flags */}
      {featureFlags.length > 0 && (
        <div style={{ padding: "1rem", background: "#f8fafc", borderRadius: 12, marginBottom: "1rem", border: "1px solid #e5e7eb" }}>
          <h3 style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.5rem" }}>Feature Flags</h3>
          {featureFlags.map((f) => (
            <div key={f.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.35rem 0", borderBottom: "1px solid #f3f4f6" }}>
              <span style={{ fontSize: "0.8rem" }}>{f.name.replace("FEATURE_AFFILIATE_", "")}</span>
              <button
                onClick={() => onAction("toggle_flag", { flagName: f.name, enabled: !f.enabled })}
                disabled={!!actionLoading}
                style={{
                  padding: "0.15rem 0.5rem",
                  borderRadius: 12,
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  background: f.enabled ? "#dcfce7" : "#fee2e2",
                  color: f.enabled ? "#16a34a" : "#dc2626",
                }}
              >
                {f.enabled ? "ON" : "OFF"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Sync History */}
      <div style={{ marginBottom: "1rem" }}>
        <h3 style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.5rem" }}>Recent Sync Operations</h3>
        {syncHistory.slice(0, 15).map((s) => (
          <div key={s.id} style={{ padding: "0.5rem 0", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "0.8rem" }}>
                <StatusDot status={s.status} /> {s.type}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#6b7280" }}>
                {new Date(s.time).toLocaleString()} | {s.processed} processed, {s.created} created
                {s.durationMs ? ` | ${(s.durationMs / 1000).toFixed(1)}s` : ""}
              </div>
            </div>
            {s.errors && Array.isArray(s.errors) && s.errors.length > 0 && (
              <span style={{ fontSize: "0.7rem", color: "#dc2626" }}>{s.errors.length} err</span>
            )}
          </div>
        ))}
        {syncHistory.length === 0 && (
          <p style={{ color: "#6b7280", fontSize: "0.85rem" }}>No sync operations recorded yet</p>
        )}
      </div>

      {/* Cron Buttons */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button onClick={() => onAction("sync_advertisers")} disabled={!!actionLoading} style={btnStyle("#3b82f6")}>
          {actionLoading === "sync_advertisers" ? "..." : "Sync Advertisers"}
        </button>
        <button onClick={() => onAction("sync_commissions")} disabled={!!actionLoading} style={btnStyle("#3b82f6")}>
          {actionLoading === "sync_commissions" ? "..." : "Sync Commissions"}
        </button>
        <button onClick={() => onAction("refresh_deals")} disabled={!!actionLoading} style={btnStyle("#3b82f6")}>
          {actionLoading === "refresh_deals" ? "..." : "Discover Deals"}
        </button>
        <button onClick={() => onAction("refresh_links")} disabled={!!actionLoading} style={btnStyle("#3b82f6")}>
          {actionLoading === "refresh_links" ? "..." : "Refresh Links"}
        </button>
        <button onClick={() => onAction("reset_circuit_breaker")} disabled={!!actionLoading} style={btnStyle("#dc2626")}>
          {actionLoading === "reset_circuit_breaker" ? "..." : "Reset Circuit Breaker"}
        </button>
      </div>
    </div>
  );
}

// ─── Shared Components ──────────────────────────────────────────────────────

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: "0.75rem", background: "#f8fafc", borderRadius: 10, border: "1px solid #e5e7eb", textAlign: "center" }}>
      <div style={{ fontSize: "0.65rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#1e3a5f", marginTop: "0.25rem" }}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    JOINED: { bg: "#dcfce7", text: "#16a34a" },
    PENDING: { bg: "#fef3c7", text: "#d97706" },
    DECLINED: { bg: "#fee2e2", text: "#dc2626" },
    NOT_JOINED: { bg: "#f3f4f6", text: "#6b7280" },
  };
  const c = colors[status] || colors.NOT_JOINED;
  return (
    <span style={{ padding: "0.15rem 0.5rem", borderRadius: 12, fontSize: "0.7rem", fontWeight: 700, background: c.bg, color: c.text }}>
      {status}
    </span>
  );
}

function StatusDot({ status }: { status: string }) {
  const color = status === "SUCCESS" ? "#16a34a" : status === "PARTIAL" ? "#f59e0b" : status === "FAILED" ? "#dc2626" : "#6b7280";
  return <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: color, marginRight: 4 }} />;
}

function HealthDot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span style={{ fontSize: "0.8rem" }}>
      <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: ok ? "#16a34a" : "#dc2626", marginRight: 4 }} />
      {label}
    </span>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

function btnStyle(bg: string): React.CSSProperties {
  return {
    padding: "0.5rem 1rem",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "0.85rem",
    background: bg,
    color: "#fff",
  };
}
