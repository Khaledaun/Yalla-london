"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  AdminCard,
  AdminPageHeader,
  AdminKPICard,
  AdminStatusBadge,
  AdminLoadingState,
  AdminEmptyState,
  AdminAlertBanner,
} from "@/components/admin/admin-ui";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface RouteRow {
  id: string;
  slug: string;
  titleEn: string;
  titleAr: string;
  metaTitleEn: string;
  metaDescriptionEn: string;
  seoScore: number | null;
  wordCount: number;
  hasArabic: boolean;
  published: boolean;
  indexingStatus: string;
  createdAt: string | null;
  updatedAt: string | null;
}

interface Summary {
  totalPages: number;
  publishedPages: number;
  draftPages: number;
  withMeta: number;
  withoutMeta: number;
  avgSeoScore: number | null;
  indexedCount: number;
  latestAuditScore: number | null;
}

interface DashboardData {
  success: boolean;
  siteId: string;
  summary: Summary;
  routes: RouteRow[];
  indexingStats: Record<string, number>;
  latestAudit: {
    score: number | null;
    issueCount: number;
    created_at: string;
  } | null;
}

type SortKey =
  | "titleEn"
  | "seoScore"
  | "wordCount"
  | "indexingStatus"
  | "published";
type FilterKey = "all" | "published" | "draft" | "indexed" | "no-meta" | "low-score";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function scoreBadge(score: number | null) {
  if (score === null) return <span className="text-xs text-gray-400">--</span>;
  const color =
    score >= 70 ? "text-green-700 bg-green-50" :
    score >= 40 ? "text-amber-700 bg-amber-50" :
    "text-red-700 bg-red-50";
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>
      {score}
    </span>
  );
}

function indexBadge(status: string) {
  const map: Record<string, { label: string; color: string }> = {
    indexed: { label: "Indexed", color: "text-green-700 bg-green-50" },
    submitted: { label: "Submitted", color: "text-blue-700 bg-blue-50" },
    discovered: { label: "Discovered", color: "text-purple-700 bg-purple-50" },
    error: { label: "Error", color: "text-red-700 bg-red-50" },
    not_submitted: { label: "Not Submitted", color: "text-gray-500 bg-gray-100" },
  };
  const m = map[status] || { label: status, color: "text-gray-500 bg-gray-100" };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${m.color}`}>
      {m.label}
    </span>
  );
}

function hreflangBadge(hasArabic: boolean) {
  return hasArabic ? (
    <span className="text-xs font-medium px-2 py-0.5 rounded-full text-green-700 bg-green-50">Both</span>
  ) : (
    <span className="text-xs font-medium px-2 py-0.5 rounded-full text-amber-700 bg-amber-50">EN Only</span>
  );
}

function truncate(s: string, max: number) {
  return s.length > max ? s.slice(0, max) + "..." : s;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function SeoDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("seoScore");
  const [sortAsc, setSortAsc] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [tab, setTab] = useState<"routes" | "quickfixes" | "hreflang">("routes");

  useEffect(() => {
    fetch("/api/admin/seo-dashboard")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then((d) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  /* ---------- Filtered + Sorted rows ---------- */
  const rows = useMemo(() => {
    if (!data) return [];
    let list = [...data.routes];

    // filter
    if (filter === "published") list = list.filter((r) => r.published);
    else if (filter === "draft") list = list.filter((r) => !r.published);
    else if (filter === "indexed") list = list.filter((r) => r.indexingStatus === "indexed");
    else if (filter === "no-meta") list = list.filter((r) => !r.metaDescriptionEn);
    else if (filter === "low-score") list = list.filter((r) => (r.seoScore ?? 0) < 40);

    // sort
    list.sort((a, b) => {
      let av: number | string = 0;
      let bv: number | string = 0;
      switch (sortKey) {
        case "titleEn": av = a.titleEn.toLowerCase(); bv = b.titleEn.toLowerCase(); break;
        case "seoScore": av = a.seoScore ?? -1; bv = b.seoScore ?? -1; break;
        case "wordCount": av = a.wordCount; bv = b.wordCount; break;
        case "indexingStatus": av = a.indexingStatus; bv = b.indexingStatus; break;
        case "published": av = a.published ? 1 : 0; bv = b.published ? 1 : 0; break;
      }
      if (av < bv) return sortAsc ? -1 : 1;
      if (av > bv) return sortAsc ? 1 : -1;
      return 0;
    });

    return list;
  }, [data, filter, sortKey, sortAsc]);

  /* ---------- Quick fixes ---------- */
  const quickFixes = useMemo(() => {
    if (!data) return [];
    const fixes: { severity: string; label: string; count: number }[] = [];
    const noMeta = data.routes.filter((r) => r.published && !r.metaDescriptionEn).length;
    const lowScore = data.routes.filter((r) => r.published && (r.seoScore ?? 0) < 40).length;
    const thinContent = data.routes.filter((r) => r.published && r.wordCount < 500).length;
    const notIndexed = data.routes.filter((r) => r.published && r.indexingStatus !== "indexed").length;
    if (noMeta) fixes.push({ severity: "high", label: "Pages without meta description", count: noMeta });
    if (lowScore) fixes.push({ severity: "high", label: "Pages with SEO score < 40", count: lowScore });
    if (thinContent) fixes.push({ severity: "medium", label: "Pages with < 500 words", count: thinContent });
    if (notIndexed) fixes.push({ severity: "medium", label: "Published pages not indexed", count: notIndexed });
    return fixes;
  }, [data]);

  if (loading) return <AdminLoadingState label="Loading SEO Dashboard..." />;
  if (error) return <AdminAlertBanner severity="critical" message={error} />;
  if (!data) return <AdminEmptyState icon={() => <span>📊</span>} title="No SEO data available" />;

  const { summary } = data;
  const domain = data.siteId === "yalla-london" ? "www.yalla-london.com" : `www.${data.siteId}.com`;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const sortArrow = (key: SortKey) =>
    sortKey === key ? (sortAsc ? " \u2191" : " \u2193") : "";

  return (
    <div className="min-h-screen bg-[var(--admin-bg)] p-4 md:p-6 space-y-6">
      <AdminPageHeader title="SEO Dashboard" />

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <AdminKPICard label="Total Pages" value={summary.totalPages} />
        <AdminKPICard label="Published" value={summary.publishedPages} />
        <AdminKPICard label="With Meta" value={summary.withMeta} />
        <AdminKPICard label="Indexed" value={summary.indexedCount} />
        <AdminKPICard
          label="Avg SEO Score"
          value={summary.avgSeoScore ?? "--"}
        />
      </div>

      {/* ── Latest Audit ── */}
      {data.latestAudit && (
        <AdminCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Latest SEO Audit</p>
              <p className="text-xs text-gray-500">
                {new Date(data.latestAudit.created_at).toLocaleDateString()} &middot;{" "}
                {data.latestAudit.issueCount} issues
              </p>
            </div>
            <div className="text-2xl font-bold">
              {data.latestAudit.score !== null ? (
                <span className={data.latestAudit.score >= 70 ? "text-green-600" : data.latestAudit.score >= 40 ? "text-amber-600" : "text-red-600"}>
                  {data.latestAudit.score}/100
                </span>
              ) : (
                <span className="text-gray-400">--</span>
              )}
            </div>
          </div>
        </AdminCard>
      )}

      {/* ── Tab buttons ── */}
      <div className="flex gap-2" role="tablist" aria-label="SEO Dashboard sections">
        {(["routes", "quickfixes", "hreflang"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-600 border border-[var(--admin-border)] hover:bg-gray-50"
            }`}
          >
            {t === "routes" ? "Routes" : t === "quickfixes" ? "Quick Fixes" : "Hreflang"}
          </button>
        ))}
      </div>

      {/* ── Tab: Routes ── */}
      {tab === "routes" && (
        <AdminCard className="overflow-hidden">
          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-4">
            {(["all", "published", "draft", "indexed", "no-meta", "low-score"] as FilterKey[]).map(
              (f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    filter === f
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {f === "all" ? "All" : f === "no-meta" ? "No Meta" : f === "low-score" ? "Low Score" : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              )
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs text-gray-500 uppercase tracking-wider">
                  <th className="py-2 pr-3 cursor-pointer hover:text-gray-900" onClick={() => handleSort("titleEn")}>
                    Title{sortArrow("titleEn")}
                  </th>
                  <th className="py-2 pr-3">Meta Description</th>
                  <th className="py-2 pr-3 cursor-pointer hover:text-gray-900" onClick={() => handleSort("seoScore")}>
                    SEO{sortArrow("seoScore")}
                  </th>
                  <th className="py-2 pr-3 cursor-pointer hover:text-gray-900" onClick={() => handleSort("wordCount")}>
                    Words{sortArrow("wordCount")}
                  </th>
                  <th className="py-2 pr-3 cursor-pointer hover:text-gray-900" onClick={() => handleSort("indexingStatus")}>
                    Status{sortArrow("indexingStatus")}
                  </th>
                  <th className="py-2 pr-3">Links</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const pageUrl = `https://${domain}/blog/${r.slug}`;
                  return (
                    <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="py-2 pr-3">
                        <div className="font-medium text-gray-900">
                          {truncate(r.titleEn || r.slug, 50)}
                        </div>
                        <div className="text-xs text-gray-400">/blog/{r.slug}</div>
                      </td>
                      <td className="py-2 pr-3">
                        {r.metaDescriptionEn ? (
                          <span className="text-xs text-gray-600">
                            {truncate(r.metaDescriptionEn, 60)}
                          </span>
                        ) : (
                          <span className="text-xs text-red-500">Missing</span>
                        )}
                      </td>
                      <td className="py-2 pr-3">{scoreBadge(r.seoScore)}</td>
                      <td className="py-2 pr-3">
                        <span className={`text-xs ${r.wordCount < 500 ? "text-red-600 font-medium" : "text-gray-600"}`}>
                          {r.wordCount.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-2 pr-3">
                        {indexBadge(r.indexingStatus)}
                        {!r.published && (
                          <span className="ml-1 text-xs text-gray-400">(Draft)</span>
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        <div className="flex gap-1">
                          <a
                            href={`https://pagespeed.web.dev/analysis?url=${encodeURIComponent(pageUrl)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline"
                            title="PageSpeed Insights"
                          >
                            PSI
                          </a>
                          <span className="text-gray-300">|</span>
                          <a
                            href={`https://search.google.com/test/rich-results?url=${encodeURIComponent(pageUrl)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline"
                            title="Rich Results Test"
                          >
                            Rich
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {rows.slice(0, 50).map((r) => (
              <div
                key={r.id}
                className="bg-white border border-gray-200 rounded-lg p-3 space-y-2"
              >
                <div className="font-medium text-sm text-gray-900">
                  {truncate(r.titleEn || r.slug, 40)}
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  {scoreBadge(r.seoScore)}
                  {indexBadge(r.indexingStatus)}
                  {hreflangBadge(r.hasArabic)}
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{r.wordCount.toLocaleString()} words</span>
                  <span>{r.published ? "Published" : "Draft"}</span>
                </div>
              </div>
            ))}
            {rows.length > 50 && (
              <p className="text-xs text-gray-400 text-center">
                + {rows.length - 50} more pages
              </p>
            )}
          </div>

          {rows.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-8">
              No pages match the current filter.
            </p>
          )}
        </AdminCard>
      )}

      {/* ── Tab: Quick Fixes ── */}
      {tab === "quickfixes" && (
        <AdminCard>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Highest-Impact Quick Fixes
          </h3>
          {quickFixes.length === 0 ? (
            <p className="text-sm text-green-600">
              No critical SEO issues found.
            </p>
          ) : (
            <div className="space-y-3">
              {quickFixes.map((fix, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    fix.severity === "high"
                      ? "border-red-200 bg-red-50"
                      : "border-amber-200 bg-amber-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        fix.severity === "high" ? "bg-red-500" : "bg-amber-500"
                      }`}
                    />
                    <span className="text-sm text-gray-800">{fix.label}</span>
                  </div>
                  <span
                    className={`text-sm font-bold ${
                      fix.severity === "high" ? "text-red-700" : "text-amber-700"
                    }`}
                  >
                    {fix.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </AdminCard>
      )}

      {/* ── Tab: Hreflang ── */}
      {tab === "hreflang" && (
        <AdminCard>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Hreflang Coverage Matrix
          </h3>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-700">
                {data.routes.filter((r) => r.hasArabic).length}
              </p>
              <p className="text-xs text-green-600">Both EN + AR</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-amber-700">
                {data.routes.filter((r) => !r.hasArabic).length}
              </p>
              <p className="text-xs text-amber-600">EN Only</p>
            </div>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {data.routes
              .filter((r) => r.published)
              .map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between py-1.5 border-b border-gray-100"
                >
                  <span className="text-xs text-gray-700 truncate max-w-[60%]">
                    /blog/{r.slug}
                  </span>
                  {hreflangBadge(r.hasArabic)}
                </div>
              ))}
          </div>
        </AdminCard>
      )}

      {/* ── Indexing Stats ── */}
      <AdminCard>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Indexing Status Breakdown
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(data.indexingStats).map(([status, count]) => (
            <div
              key={status}
              className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center"
            >
              <p className="text-lg font-bold text-gray-900">{count}</p>
              <p className="text-xs text-gray-500 capitalize">{status.replace(/_/g, " ")}</p>
            </div>
          ))}
        </div>
      </AdminCard>
    </div>
  );
}
