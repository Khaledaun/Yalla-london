"use client";

/**
 * Canonicalize Clusters — Manual override for cannibalization-resolver
 *
 * Surfaces ALL groups of articles targeting the same keywords so Khaled can
 * canonicalize them in one tap instead of waiting 2+ days for the seo-agent's
 * rate-limited 3-groups-per-run to drain.
 *
 * Each cluster shows the proposed winner + losers with title overlap %.
 * Losers get `published: false` + `canonical_slug = winner.slug` and a 301
 * SeoRedirect is created — never hard-deleted (preserves SEO equity).
 *
 * iPhone-first per CLAUDE.md mobile-first rules. Confirm modal via useConfirm.
 */

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useConfirm } from "@/components/admin/admin-ui";

interface Duplicate {
  id: string;
  slug: string;
  title: string;
  score: number;
  overlapPct: number;
}

interface ClusterGroup {
  canonicalId: string;
  canonicalSlug: string;
  canonicalTitle: string;
  canonicalScore: number;
  duplicates: Duplicate[];
}

interface ClustersResponse {
  siteId: string;
  totalGroups: number;
  totalDuplicates: number;
  groups: ClusterGroup[];
  generatedAt: string;
}

export default function CanonicalizeClustersPage() {
  const [siteId, setSiteId] = useState("yalla-london");
  const [data, setData] = useState<ClustersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { confirm, ConfirmDialog } = useConfirm();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/canonicalize-clusters?siteId=${encodeURIComponent(siteId)}`);
      if (!res.ok) {
        setError(`HTTP ${res.status}`);
        setLoading(false);
        return;
      }
      const json = (await res.json()) as ClustersResponse;
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

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  async function canonicalizeOne(group: ClusterGroup) {
    const maxOverlap = group.duplicates.reduce((m, d) => Math.max(m, d.overlapPct), 0);
    const ok = await confirm({
      title: "Canonicalize cluster",
      message: `Keep "${group.canonicalTitle}" as winner and 301-redirect ${group.duplicates.length} duplicate(s) (max ${maxOverlap}% overlap). The duplicates will be unpublished but kept in the DB for audit. Continue?`,
      confirmLabel: "Yes, canonicalize",
      variant: "danger",
    });
    if (!ok) return;

    setBusyId(group.canonicalId);
    try {
      const res = await fetch("/api/admin/canonicalize-clusters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "canonicalize", siteId, canonicalId: group.canonicalId }),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        setToast({ text: `Failed: HTTP ${res.status} ${detail.slice(0, 80)}`, ok: false });
        return;
      }
      const j = await res.json().catch(() => ({}));
      const r = j.result || {};
      setToast({
        text: `✅ Redirected ${r.articlesRedirected || 0} article(s) → ${group.canonicalSlug}`,
        ok: true,
      });
      setTimeout(() => load(), 1200);
    } catch (err) {
      setToast({ text: `Failed: ${err instanceof Error ? err.message : String(err)}`, ok: false });
    } finally {
      setBusyId(null);
    }
  }

  async function canonicalizeAll() {
    if (!data || data.groups.length === 0) return;
    const eligible = data.groups.filter((g) => g.duplicates.some((d) => d.overlapPct >= 70));
    if (eligible.length === 0) {
      setToast({ text: "No groups meet the 70% overlap threshold", ok: false });
      return;
    }
    const ok = await confirm({
      title: `Canonicalize ${eligible.length} cluster(s)?`,
      message: `This will 301-redirect ${eligible.reduce((n, g) => n + g.duplicates.length, 0)} duplicate article(s) to their cluster winner. Only clusters with ≥70% title overlap are included. Continue?`,
      confirmLabel: "Yes, canonicalize all",
      variant: "danger",
    });
    if (!ok) return;

    setBulkBusy(true);
    try {
      const res = await fetch("/api/admin/canonicalize-clusters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "canonicalize_all", siteId, minOverlap: 70 }),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        setToast({ text: `Failed: HTTP ${res.status} ${detail.slice(0, 80)}`, ok: false });
        return;
      }
      const j = await res.json().catch(() => ({}));
      const r = j.result || {};
      setToast({
        text: `✅ Processed ${j.processedGroups || 0} cluster(s) — ${r.articlesRedirected || 0} redirect(s)`,
        ok: true,
      });
      setTimeout(() => load(), 1500);
    } catch (err) {
      setToast({ text: `Failed: ${err instanceof Error ? err.message : String(err)}`, ok: false });
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--admin-bg)] text-[var(--admin-text)] pb-32">
      <div className="sticky top-0 z-10 bg-[var(--admin-bg)]/95 backdrop-blur border-b border-[rgba(214,208,196,0.5)]">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link href="/admin/cockpit" className="text-sm text-[var(--admin-muted)] hover:text-[var(--admin-text)]">
            ← Cockpit
          </Link>
          <h1 className="text-base font-semibold">Canonicalize Clusters</h1>
          <button
            onClick={load}
            disabled={loading}
            className="text-xs px-3 py-1 rounded border border-[rgba(214,208,196,0.5)] disabled:opacity-50"
          >
            {loading ? "…" : "Refresh"}
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pt-4 space-y-4">
        {/* Site selector */}
        <div className="flex items-center gap-2 text-sm">
          <label className="text-[var(--admin-muted)]">Site:</label>
          <select
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            className="bg-white border border-[rgba(214,208,196,0.5)] rounded px-2 py-1"
          >
            <option value="yalla-london">yalla-london</option>
            <option value="arabaldives">arabaldives</option>
            <option value="zenitha-yachts-med">zenitha-yachts-med</option>
          </select>
        </div>

        {/* Summary card */}
        {data && (
          <div className="bg-white border border-[rgba(214,208,196,0.5)] rounded-lg p-4">
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-xs uppercase tracking-wide text-[var(--admin-muted)]">Total</span>
              <span className="text-xs text-[var(--admin-muted)]">{new Date(data.generatedAt).toLocaleString()}</span>
            </div>
            <div className="flex items-baseline gap-4">
              <div>
                <div className="text-2xl font-semibold">{data.totalGroups}</div>
                <div className="text-xs text-[var(--admin-muted)]">clusters</div>
              </div>
              <div>
                <div className="text-2xl font-semibold">{data.totalDuplicates}</div>
                <div className="text-xs text-[var(--admin-muted)]">duplicates</div>
              </div>
            </div>
            {data.totalGroups > 0 && (
              <button
                onClick={canonicalizeAll}
                disabled={bulkBusy}
                className="mt-3 w-full bg-[#C8322B] text-white rounded px-3 py-2 text-sm font-medium disabled:opacity-50"
              >
                {bulkBusy ? "Processing…" : `Canonicalize all (≥70% overlap)`}
              </button>
            )}
          </div>
        )}

        {error && <div className="bg-red-50 border border-red-200 text-red-800 rounded p-3 text-sm">{error}</div>}

        {loading && <div className="text-center text-sm text-[var(--admin-muted)] py-8">Scanning…</div>}

        {!loading && data && data.groups.length === 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded p-4 text-sm text-emerald-900">
            🎉 No cannibalization clusters detected. All published articles have distinct titles.
          </div>
        )}

        {/* Cluster cards */}
        {data?.groups.map((group) => {
          const maxOverlap = group.duplicates.reduce((m, d) => Math.max(m, d.overlapPct), 0);
          const isExpanded = expanded === group.canonicalId;
          const isBusy = busyId === group.canonicalId;
          return (
            <div
              key={group.canonicalId}
              className="bg-white border border-[rgba(214,208,196,0.5)] rounded-lg overflow-hidden"
            >
              <button
                onClick={() => setExpanded(isExpanded ? null : group.canonicalId)}
                className="w-full text-left px-4 py-3 flex items-start justify-between gap-3"
                aria-expanded={isExpanded}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-medium">
                      {group.duplicates.length + 1} articles
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-900 font-medium">
                      {maxOverlap}% overlap
                    </span>
                    <span className="text-xs text-[var(--admin-muted)]">score {group.canonicalScore}</span>
                  </div>
                  <div className="text-sm font-medium truncate">{group.canonicalTitle}</div>
                  <div className="text-xs text-[var(--admin-muted)] truncate">/{group.canonicalSlug}</div>
                </div>
                <span className="text-[var(--admin-muted)] text-lg">{isExpanded ? "−" : "+"}</span>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-[rgba(214,208,196,0.5)] space-y-2">
                  <div className="pt-3">
                    <div className="text-xs uppercase tracking-wide text-emerald-700 mb-1">Winner (keep published)</div>
                    <a
                      href={`/blog/${group.canonicalSlug}`}
                      target="_blank"
                      rel="noopener"
                      className="text-sm text-[#3B7EA1] underline truncate block"
                    >
                      /{group.canonicalSlug}
                    </a>
                  </div>

                  <div className="pt-2">
                    <div className="text-xs uppercase tracking-wide text-red-700 mb-1">
                      Will be redirected ({group.duplicates.length})
                    </div>
                    <ul className="space-y-1">
                      {group.duplicates.map((d) => (
                        <li key={d.id} className="text-xs">
                          <div className="flex justify-between gap-2 items-baseline">
                            <a
                              href={`/blog/${d.slug}`}
                              target="_blank"
                              rel="noopener"
                              className="text-[#3B7EA1] underline truncate flex-1"
                            >
                              /{d.slug}
                            </a>
                            <span className="text-[var(--admin-muted)] whitespace-nowrap">
                              {d.overlapPct}% • score {d.score}
                            </span>
                          </div>
                          <div className="text-[var(--admin-muted)] truncate">{d.title}</div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    onClick={() => canonicalizeOne(group)}
                    disabled={isBusy || bulkBusy}
                    className="w-full mt-2 bg-[#C8322B] text-white rounded px-3 py-2 text-sm font-medium disabled:opacity-50"
                  >
                    {isBusy ? "Canonicalizing…" : "Canonicalize this cluster"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-20 left-4 right-4 max-w-3xl mx-auto z-50 px-4 py-3 rounded shadow-lg text-sm ${
            toast.ok ? "bg-emerald-700 text-white" : "bg-red-700 text-white"
          }`}
        >
          {toast.text}
        </div>
      )}

      <ConfirmDialog />
    </div>
  );
}
