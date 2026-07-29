"use client";

/**
 * Affiliate Clicks — historical click feed viewer.
 *
 * Surfaces /api/admin/affiliate-monitor (clickFeed + summary) as a usable
 * iPhone-first page so Khaled can finally SEE individual click rows
 * (timestamp, partner, article, device, country) — not just aggregate counts.
 *
 * Backs his "do we have a way to see older affiliate clicks? did we have
 * any?" question. The clicks live in two DB tables (CjClickEvent for CJ
 * deep links, AuditLog action=AFFILIATE_CLICK_DIRECT for Travelpayouts /
 * Stay22 / static partner URLs); getRecentClickFeed() in
 * lib/affiliate/click-aggregator merges them. This page renders that feed.
 */

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type ClickRow = {
  id: string;
  partner: string;
  article: string | null;
  pageUrl?: string | null;
  device: string | null;
  country: string | null;
  timestamp: string;
  source: "cj" | "direct" | string;
};

type Summary = {
  totalClicks7d: number;
  totalClicks30d: number;
  cjClicks30d?: number;
  directClicks30d?: number;
};

type PartnerRow = { partner: string; clicks: number };
type ArticleRow = { slug: string; clicks: number };

type MonitorResponse = {
  summary?: Summary;
  clickFeed: ClickRow[];
  topArticles?: ArticleRow[];
  partnerBreakdown?: PartnerRow[];
  diagnostics?: Array<{ issue: string; severity: string; fix: string }>;
};

type SourceFilter = "all" | "cj" | "direct";

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s ago`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

function deviceIcon(device: string | null): string {
  if (!device) return "❓";
  const d = device.toUpperCase();
  if (d === "MOBILE") return "📱";
  if (d === "TABLET") return "📲";
  if (d === "DESKTOP") return "🖥️";
  return "❓";
}

export default function AffiliateClicksPage() {
  const searchParams = useSearchParams();
  const [siteId, setSiteId] = useState(searchParams.get("siteId") || "yalla-london");
  const [feedLimit, setFeedLimit] = useState(100);
  const [data, setData] = useState<MonitorResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [partnerFilter, setPartnerFilter] = useState<string>("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/admin/affiliate-monitor?siteId=${encodeURIComponent(siteId)}&feedLimit=${feedLimit}`,
      );
      if (!res.ok) {
        setError(`HTTP ${res.status}`);
        setLoading(false);
        return;
      }
      const json = (await res.json()) as MonitorResponse;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [siteId, feedLimit]);

  useEffect(() => {
    load();
  }, [load]);

  const feed = data?.clickFeed || [];
  const filtered = feed.filter(
    (c) =>
      (sourceFilter === "all" || c.source === sourceFilter) && (partnerFilter === "all" || c.partner === partnerFilter),
  );
  // Unique partners present in this feed (for filter chips)
  const partnerOptions = [...new Set(feed.map((c) => c.partner))];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Link href="/admin/cockpit" className="text-zinc-500 hover:text-zinc-300 text-sm">
              ← Cockpit
            </Link>
            <h1 className="text-lg font-bold">Affiliate Clicks</h1>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-medium rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 disabled:opacity-50"
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs"
          >
            <option value="yalla-london">Yalla London</option>
            <option value="zenitha-yachts-med">Zenitha Yachts</option>
            <option value="arabaldives">Arabaldives</option>
            <option value="french-riviera">Yalla Riviera</option>
            <option value="istanbul">Yalla Istanbul</option>
            <option value="thailand">Yalla Thailand</option>
          </select>
          <select
            value={feedLimit}
            onChange={(e) => setFeedLimit(parseInt(e.target.value, 10))}
            className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs"
          >
            <option value={20}>Last 20</option>
            <option value={50}>Last 50</option>
            <option value={100}>Last 100</option>
            <option value={250}>Last 250</option>
            <option value={500}>Last 500</option>
          </select>
        </div>

        {/* Source filter chips */}
        {feed.length > 0 && (
          <div className="flex gap-1 mt-2 overflow-x-auto">
            {[
              { key: "all" as const, label: "All", count: feed.length },
              {
                key: "cj" as const,
                label: "CJ",
                count: feed.filter((c) => c.source === "cj").length,
              },
              {
                key: "direct" as const,
                label: "Direct",
                count: feed.filter((c) => c.source === "direct").length,
              },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setSourceFilter(t.key)}
                className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                  sourceFilter === t.key
                    ? "bg-blue-900/50 text-blue-300 border border-blue-700/50"
                    : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-zinc-800"
                }`}
              >
                {t.label} ({t.count})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="px-4 py-4 space-y-3 pb-24">
        {error && (
          <div className="rounded-lg border border-red-800/50 bg-red-950/40 text-red-300 p-3 text-sm">{error}</div>
        )}

        {loading && !data && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 text-zinc-400 text-sm">
            Loading click history…
          </div>
        )}

        {data && (
          <>
            {/* Summary card */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-2xl font-bold text-emerald-400">{data.summary?.totalClicks7d ?? 0}</div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wide">Clicks 7d</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-emerald-300">{data.summary?.totalClicks30d ?? 0}</div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wide">Clicks 30d</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-zinc-100">{feed.length}</div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wide">In feed</div>
                </div>
              </div>
              {data.summary && (
                <div className="mt-2 text-[10px] text-zinc-500 text-center">
                  30d split: CJ {data.summary.cjClicks30d ?? 0} · Direct {data.summary.directClicks30d ?? 0}
                </div>
              )}
              {(data.summary?.totalClicks30d ?? 0) === 0 && feed.length === 0 && (
                <div className="mt-3 rounded border border-amber-800/50 bg-amber-950/30 p-2 text-[11px] text-amber-300 leading-relaxed">
                  No clicks recorded in the last 30 days. This is normal if traffic is still small (you have ~571 GSC
                  clicks/28d) and affiliate-injection only recently hit deep coverage. Use the Rescue Plan + Weekly
                  Rescue Campaign to keep pushing density and CTR up.
                </div>
              )}
            </div>

            {/* Top partners breakdown */}
            {data.partnerBreakdown && data.partnerBreakdown.length > 0 && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                <div className="text-[10px] uppercase text-zinc-500 mb-2">By Partner (last 30d)</div>
                <div className="flex flex-wrap gap-1.5">
                  {data.partnerBreakdown.slice(0, 8).map((p) => (
                    <button
                      key={p.partner}
                      onClick={() => setPartnerFilter(partnerFilter === p.partner ? "all" : p.partner)}
                      className={`text-[11px] px-2 py-1 rounded border ${
                        partnerFilter === p.partner
                          ? "bg-violet-900/50 text-violet-200 border-violet-700/50"
                          : "bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700"
                      }`}
                    >
                      {p.partner} <span className="text-zinc-500">({p.clicks})</span>
                    </button>
                  ))}
                </div>
                {partnerFilter !== "all" && (
                  <button
                    onClick={() => setPartnerFilter("all")}
                    className="mt-2 text-[10px] text-zinc-500 hover:text-zinc-300"
                  >
                    × clear partner filter
                  </button>
                )}
              </div>
            )}

            {/* Top articles by clicks */}
            {data.topArticles && data.topArticles.length > 0 && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                <div className="text-[10px] uppercase text-zinc-500 mb-2">Top Articles (last 30d)</div>
                <div className="space-y-1">
                  {data.topArticles.slice(0, 5).map((a) => (
                    <div key={a.slug} className="flex items-center justify-between text-[11px]">
                      <a
                        href={`/blog/${a.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-zinc-300 hover:text-emerald-400 truncate flex-1 mr-2"
                      >
                        {a.slug}
                      </a>
                      <span className="text-emerald-400 font-bold flex-shrink-0">{a.clicks}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Click feed */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden">
              <div className="px-3 py-2 border-b border-zinc-800 text-[10px] uppercase text-zinc-500 flex items-center justify-between">
                <span>
                  Recent clicks
                  {(sourceFilter !== "all" || partnerFilter !== "all") && ` · ${filtered.length} of ${feed.length}`}
                </span>
                <span>{partnerFilter !== "all" ? partnerFilter : ""}</span>
              </div>
              {filtered.length === 0 ? (
                <div className="p-6 text-center text-zinc-500 text-sm">
                  {feed.length === 0 ? "No clicks recorded in this window yet." : "No clicks match the active filter."}
                </div>
              ) : (
                <ul className="divide-y divide-zinc-800">
                  {filtered.map((c) => (
                    <li key={c.id} className="px-3 py-2.5 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded border ${
                                c.source === "cj"
                                  ? "bg-purple-900/40 text-purple-300 border-purple-800/50"
                                  : "bg-blue-900/40 text-blue-300 border-blue-800/50"
                              }`}
                            >
                              {c.source.toUpperCase()}
                            </span>
                            <span className="font-medium text-zinc-100">{c.partner}</span>
                            <span className="text-[10px] text-zinc-500">
                              {deviceIcon(c.device)} {c.country || "??"}
                            </span>
                          </div>
                          {c.article && (
                            <a
                              href={`/blog/${c.article}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-[11px] text-zinc-400 truncate hover:text-emerald-400"
                            >
                              /blog/{c.article}
                            </a>
                          )}
                        </div>
                        <span className="text-[10px] text-zinc-500 whitespace-nowrap flex-shrink-0">
                          {timeAgo(c.timestamp)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Diagnostics (only render if zero-click context — they're already shown elsewhere) */}
            {(data.summary?.totalClicks30d ?? 0) === 0 && data.diagnostics && data.diagnostics.length > 0 && (
              <div className="rounded-lg border border-amber-800/50 bg-amber-950/20 p-3">
                <div className="text-[10px] uppercase text-amber-400 mb-2">Why might clicks be zero?</div>
                <ul className="space-y-1.5 text-xs text-amber-200">
                  {data.diagnostics.slice(0, 5).map((d, i) => (
                    <li key={i} className="leading-relaxed">
                      <span className="font-semibold">{d.issue}</span>
                      <span className="block text-[10px] text-amber-200/70 mt-0.5">→ {d.fix}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
