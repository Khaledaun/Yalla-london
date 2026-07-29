"use client";

/**
 * Rescue Plan — Per-article action queue ranked by projected click leverage.
 *
 * Renders /api/admin/rescue-plan output with one-tap action buttons.
 * Built for iPhone (375px) per CLAUDE.md mobile-first rules.
 *
 * Filter chips: All / Near-Miss / Cannibalization / Thin / Stale / Dead CJ.
 * Each row shows projected clicks/month gain + diagnosis + executable action.
 *
 * Near-miss items open the article editor (manual title/meta rewrite).
 * Cannibalization losers offer "Canonicalize → winner" with confirm modal.
 * Thin / stale / dead-CJ items trigger the corresponding auto-fix endpoint.
 */

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useConfirm } from "@/components/admin/admin-ui";

type FailureMode = "near_miss" | "cannibalization" | "thin_content" | "stale_indexing" | "dead_cj_link";

interface RescueItem {
  slug: string;
  url: string;
  title: string;
  failureMode: FailureMode;
  leverage: number;
  diagnosis: string;
  recommendation: string;
  action: {
    label: string;
    endpoint: string | null;
    payload: Record<string, unknown> | null;
    executable: boolean;
    estimatedTimeMins: number;
  };
  metrics?: Record<string, unknown>;
}

interface ByMode {
  count: number;
  totalLeverage: number;
  name: string;
}

interface RescuePlanResponse {
  success: boolean;
  siteId: string;
  summary: string[];
  totalItems: number;
  projectedClicksPerMonth: number;
  byMode: Record<string, ByMode>;
  items: RescueItem[];
  notes?: Record<string, unknown>;
}

const MODE_META: Record<FailureMode, { label: string; emoji: string; color: string }> = {
  near_miss: { label: "Near-Miss", emoji: "🎯", color: "bg-emerald-900/40 text-emerald-300 border-emerald-800/50" },
  cannibalization: { label: "Cannibal", emoji: "♻️", color: "bg-purple-900/40 text-purple-300 border-purple-800/50" },
  thin_content: { label: "Thin", emoji: "📉", color: "bg-amber-900/40 text-amber-300 border-amber-800/50" },
  stale_indexing: { label: "Stale", emoji: "💤", color: "bg-blue-900/40 text-blue-300 border-blue-800/50" },
  dead_cj_link: { label: "Dead CJ", emoji: "💀", color: "bg-red-900/40 text-red-300 border-red-800/50" },
};

type FilterKey = "all" | FailureMode;

export default function RescuePlanPage() {
  const searchParams = useSearchParams();
  const [siteId, setSiteId] = useState(searchParams.get("siteId") || "yalla-london");
  const [data, setData] = useState<RescuePlanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { confirm, ConfirmDialog } = useConfirm();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/rescue-plan?siteId=${encodeURIComponent(siteId)}&limit=100`);
      if (!res.ok) {
        const msg = `HTTP ${res.status}`;
        setError(msg);
        setLoading(false);
        return;
      }
      const json = (await res.json()) as RescuePlanResponse;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-dismiss toast after 4s
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const filtered = (data?.items || []).filter((i) => filter === "all" || i.failureMode === filter);

  async function runAction(item: RescueItem) {
    if (!item.action.endpoint) return;

    const itemKey = `${item.failureMode}:${item.slug}`;

    // Destructive actions need confirmation
    const isDestructive =
      item.failureMode === "cannibalization" ||
      (item.failureMode === "thin_content" && item.action.label.toLowerCase().includes("unpublish"));

    if (isDestructive) {
      const ok = await confirm({
        title: item.action.label,
        message:
          item.failureMode === "cannibalization"
            ? `Canonicalize "${item.title}" → winner. This unpublishes the loser and 301-redirects future traffic. Continue?`
            : `Unpublish "${item.title}". This removes it from sitemap and search results. Continue?`,
        confirmLabel: "Yes, do it",
        variant: "danger",
      });
      if (!ok) return;
    }

    setBusyKey(itemKey);
    try {
      const res = await fetch(item.action.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.action.payload || {}),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        setToast({ text: `Failed: HTTP ${res.status} ${detail.slice(0, 80)}`, ok: false });
      } else {
        // Try to parse, but don't fail on non-JSON
        let summary = "Done";
        try {
          const j = await res.json();
          if (j.summary) summary = String(j.summary).slice(0, 120);
          else if (j.message) summary = String(j.message).slice(0, 120);
          else if (j.partners) summary = `Partners: ${(j.partners || []).join(", ")}`;
        } catch {
          /* non-JSON ok */
        }
        setToast({ text: `${MODE_META[item.failureMode].emoji} ${item.title.slice(0, 40)} — ${summary}`, ok: true });
        // Reload so this item drops out of the queue
        setTimeout(() => load(), 1500);
      }
    } catch (err) {
      setToast({ text: `Failed: ${err instanceof Error ? err.message : String(err)}`, ok: false });
    } finally {
      setBusyKey(null);
    }
  }

  /**
   * Single-item AI fix — calls the discovery fix-engine via the rescue-plan
   * action endpoint. Skips the manual editor entirely. For near-miss items
   * this rewrites title + meta; for thin-content it expands the body; for
   * stale-indexing it re-fires IndexNow.
   */
  async function runAiFix(item: RescueItem) {
    if (!item.action.endpoint || !item.action.executable) return;
    // Use the same key shape as runAction so per-row `isBusy` covers both.
    const itemKey = `${item.failureMode}:${item.slug}`;
    setBusyKey(itemKey);
    try {
      const res = await fetch(item.action.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.action.payload || {}),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        setToast({ text: `AI Fix failed: HTTP ${res.status} ${detail.slice(0, 60)}`, ok: false });
      } else {
        let msg = "AI fix applied";
        try {
          const j = await res.json();
          msg = j.result?.message || j.summary || j.message || "AI fix applied";
        } catch {
          /* non-JSON ok */
        }
        setToast({ text: `✨ ${item.title.slice(0, 40)} — ${String(msg).slice(0, 100)}`, ok: true });
        setTimeout(() => load(), 1500);
      }
    } catch (err) {
      setToast({ text: `AI Fix failed: ${err instanceof Error ? err.message : String(err)}`, ok: false });
    } finally {
      setBusyKey(null);
    }
  }

  /**
   * Bulk AI fix — POST to /api/admin/rescue-plan/bulk-fix which iterates the
   * top-N items server-side and runs the AI fix for each non-destructive
   * mode (near_miss, thin_content, stale_indexing, dead_cj_link). Returns
   * an aggregated result we render as a toast + reload.
   */
  async function runBulkFix(opts: { limit: number; modeFilter?: FailureMode }) {
    const okConfirm = await confirm({
      title: "AI Fix — bulk run",
      message: opts.modeFilter
        ? `Run AI fixes on the top ${opts.limit} ${MODE_META[opts.modeFilter].label} items? Each item ~5-25s of AI work. Total budget 280s.`
        : `Run AI fixes on the top ${opts.limit} items (excluding destructive Cannibal actions)? Each item ~5-25s of AI work. Total budget 280s.`,
      confirmLabel: `Run ${opts.limit} fixes`,
    });
    if (!okConfirm) return;

    setBulkBusy(true);
    setBulkProgress({ done: 0, total: opts.limit });
    try {
      const res = await fetch("/api/admin/rescue-plan/bulk-fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId,
          limit: opts.limit,
          modes: opts.modeFilter ? [opts.modeFilter] : ["near_miss", "thin_content", "stale_indexing", "dead_cj_link"],
          onlyExecutable: true,
        }),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        setToast({ text: `Bulk AI Fix failed: HTTP ${res.status} ${detail.slice(0, 60)}`, ok: false });
      } else {
        const j = (await res.json()) as {
          summary?: string;
          succeeded?: number;
          failed?: number;
          processed?: number;
        };
        setToast({
          text: `✨ ${j.summary || `Bulk fix complete: ${j.succeeded}/${j.processed}`}`,
          ok: (j.succeeded || 0) > 0,
        });
        setTimeout(() => load(), 2000);
      }
    } catch (err) {
      setToast({ text: `Bulk AI Fix failed: ${err instanceof Error ? err.message : String(err)}`, ok: false });
    } finally {
      setBulkBusy(false);
      setBulkProgress(null);
    }
  }

  function openEditor(slug: string) {
    // Article editor opens in new tab with slug preloaded
    window.open(`/admin/cockpit/write?slug=${encodeURIComponent(slug)}`, "_blank");
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <ConfirmDialog />

      {/* Header */}
      <div className="sticky top-0 z-20 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Link href="/admin/cockpit" className="text-zinc-500 hover:text-zinc-300 text-sm">
              ← Cockpit
            </Link>
            <h1 className="text-lg font-bold">Rescue Plan</h1>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-medium rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 disabled:opacity-50"
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>

        {/* Site selector */}
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
        </div>

        {/* Filter chips */}
        {data && (
          <div className="flex gap-1 mt-2 overflow-x-auto">
            {(["all", "near_miss", "cannibalization", "thin_content", "stale_indexing", "dead_cj_link"] as const).map(
              (key) => {
                const count = key === "all" ? data.totalItems : (data.byMode[key]?.count ?? 0);
                const label = key === "all" ? "All" : MODE_META[key as FailureMode].label;
                const active = filter === key;
                return (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                      active
                        ? "bg-blue-900/50 text-blue-300 border border-blue-700/50"
                        : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-zinc-800"
                    }`}
                  >
                    {label} ({count})
                  </button>
                );
              },
            )}
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
            Running 5 detectors against the published catalog…
          </div>
        )}

        {data && (
          <>
            {/* Summary */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl font-bold text-emerald-400">+{data.projectedClicksPerMonth}</span>
                <span className="text-xs text-zinc-500">projected clicks/mo if all fixed</span>
              </div>
              <div className="text-xs text-zinc-400 leading-relaxed">
                {data.summary.map((s, i) => (
                  <div key={i} className="mb-1">
                    {s}
                  </div>
                ))}
              </div>

              {/* Bulk AI Fix bar — runs the top N items server-side */}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => runBulkFix({ limit: 10 })}
                  disabled={bulkBusy || data.totalItems === 0}
                  className="flex-1 min-w-[140px] px-3 py-2 text-xs font-semibold rounded bg-violet-700 hover:bg-violet-600 text-violet-50 border border-violet-500 disabled:opacity-60"
                >
                  {bulkBusy
                    ? bulkProgress
                      ? `Running… ${bulkProgress.done}/${bulkProgress.total}`
                      : "Running…"
                    : `✨ AI Fix Top 10`}
                </button>
                <button
                  onClick={() =>
                    runBulkFix({
                      limit: 5,
                      modeFilter:
                        filter !== "all" && filter !== "cannibalization" ? (filter as FailureMode) : "near_miss",
                    })
                  }
                  disabled={bulkBusy || data.totalItems === 0}
                  className="flex-1 min-w-[140px] px-3 py-2 text-xs font-semibold rounded bg-violet-900/60 hover:bg-violet-900 text-violet-200 border border-violet-700/60 disabled:opacity-60"
                >
                  ✨ Fix Top 5{" "}
                  {filter !== "all" && filter !== "cannibalization"
                    ? MODE_META[filter as FailureMode].label
                    : "Near-Miss"}
                </button>
              </div>
              <div className="mt-2 text-[10px] text-zinc-500 leading-snug">
                Bulk fix skips Cannibal (destructive — needs your confirm per item). Each AI fix takes 5-25s. Up to 30
                items per call; budget 280s.
              </div>

              {/* Per-mode mini bars */}
              <div className="mt-3 grid grid-cols-5 gap-1 text-[10px]">
                {(["near_miss", "cannibalization", "thin_content", "stale_indexing", "dead_cj_link"] as const).map(
                  (m) => {
                    const stats = data.byMode[m];
                    if (!stats) return null;
                    return (
                      <button
                        key={m}
                        onClick={() => setFilter(m)}
                        className={`rounded px-1 py-1.5 border text-center ${MODE_META[m].color}`}
                      >
                        <div>{MODE_META[m].emoji}</div>
                        <div className="font-bold">{stats.count}</div>
                        <div className="opacity-75">+{stats.totalLeverage}</div>
                      </button>
                    );
                  },
                )}
              </div>
            </div>

            {/* Item list */}
            {filtered.length === 0 ? (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 text-center text-zinc-500 text-sm">
                Nothing matches this filter.
              </div>
            ) : (
              filtered.map((item, idx) => {
                const itemKey = `${item.failureMode}:${item.slug}`;
                const isBusy = busyKey === itemKey;
                const isExpanded = expanded === itemKey;
                const meta = MODE_META[item.failureMode];
                return (
                  <div key={itemKey} className="rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden">
                    {/* Row header */}
                    <button
                      onClick={() => setExpanded(isExpanded ? null : itemKey)}
                      className="w-full p-3 text-left active:bg-zinc-800/50"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-zinc-600 text-xs mt-0.5 w-6 flex-shrink-0">#{idx + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${meta.color}`}>
                              {meta.emoji} {meta.label}
                            </span>
                            <span className="text-[10px] text-emerald-400 font-bold">+{item.leverage} clicks/mo</span>
                            <span className="text-[10px] text-zinc-500">~{item.action.estimatedTimeMins}m fix</span>
                          </div>
                          <div className="text-sm font-medium text-zinc-100 line-clamp-2">{item.title}</div>
                          <div className="text-[11px] text-zinc-500 truncate mt-0.5">/{item.slug}</div>
                        </div>
                        <span className={`text-zinc-500 text-sm transition-transform ${isExpanded ? "rotate-90" : ""}`}>
                          ›
                        </span>
                      </div>
                    </button>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="border-t border-zinc-800 p-3 space-y-3">
                        <div>
                          <div className="text-[10px] uppercase text-zinc-500 mb-1">Diagnosis</div>
                          <div className="text-xs text-zinc-300 leading-relaxed">{item.diagnosis}</div>
                        </div>

                        <div>
                          <div className="text-[10px] uppercase text-zinc-500 mb-1">Recommendation</div>
                          <div className="text-xs text-zinc-300 leading-relaxed">{item.recommendation}</div>
                        </div>

                        {item.metrics && Object.keys(item.metrics).length > 0 && (
                          <div>
                            <div className="text-[10px] uppercase text-zinc-500 mb-1">Metrics</div>
                            <pre className="text-[10px] text-zinc-400 bg-zinc-950 rounded p-2 overflow-x-auto leading-relaxed">
                              {JSON.stringify(item.metrics, null, 2)}
                            </pre>
                          </div>
                        )}

                        {/* Action row */}
                        {/* Three button states:                                                */}
                        {/*   1. Executable + non-destructive → primary "✨ AI Fix" (one-tap)   */}
                        {/*      Near-miss also gets a secondary "✏️ Edit" to open the editor. */}
                        {/*   2. Destructive (cannibal, thin unpublish) → existing runAction    */}
                        {/*      which goes through useConfirm before mutating.                 */}
                        {/*   3. Non-executable → italic note explaining manual action needed.  */}
                        <div className="flex flex-wrap gap-2 pt-1">
                          {item.action.executable && item.action.endpoint ? (
                            <>
                              <button
                                onClick={() => runAiFix(item)}
                                disabled={isBusy || bulkBusy}
                                className="flex-1 min-w-[140px] px-3 py-2 text-xs font-semibold rounded bg-violet-700 hover:bg-violet-600 text-violet-50 border border-violet-500 disabled:opacity-60"
                              >
                                {isBusy
                                  ? "Running…"
                                  : `✨ AI Fix${item.failureMode === "near_miss" ? " (title + meta)" : ""}`}
                              </button>
                              {item.failureMode === "near_miss" && (
                                <button
                                  onClick={() => openEditor(item.slug)}
                                  disabled={isBusy || bulkBusy}
                                  className="px-3 py-2 text-xs font-medium rounded bg-emerald-900/60 hover:bg-emerald-900 text-emerald-200 border border-emerald-700/60 disabled:opacity-60"
                                >
                                  ✏️ Edit Manually
                                </button>
                              )}
                              {item.failureMode === "cannibalization" && (
                                <button
                                  onClick={() => runAction(item)}
                                  disabled={isBusy || bulkBusy}
                                  className="px-3 py-2 text-xs font-medium rounded bg-red-900/60 hover:bg-red-900 text-red-200 border border-red-700/60 disabled:opacity-60"
                                >
                                  {isBusy ? "Running…" : "Canonicalize ↦"}
                                </button>
                              )}
                            </>
                          ) : (
                            <div className="flex-1 px-3 py-2 text-xs text-zinc-500 italic">
                              Manual action needed: {item.action.label}
                            </div>
                          )}

                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-2 text-xs rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300"
                          >
                            View →
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-4 left-4 right-4 z-50 rounded-lg p-3 text-xs font-medium shadow-xl ${
            toast.ok
              ? "bg-emerald-900 text-emerald-100 border border-emerald-700"
              : "bg-red-900 text-red-100 border border-red-700"
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}
