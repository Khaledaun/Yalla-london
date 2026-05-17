"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  AdminCard,
  AdminPageHeader,
  AdminTabs,
  AdminKPICard,
  AdminStatusBadge,
  AdminButton,
  AdminLoadingState,
  AdminAlertBanner,
  AdminSectionLabel,
} from "@/components/admin/admin-ui";

// ─── Types ───────────────────────────────────────────────────────────

interface RouteData {
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
  routes: RouteData[];
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
type SortDir = "asc" | "desc";
type FilterPublished = "all" | "published" | "draft";
type FilterIndexed = "all" | "indexed" | "not_indexed";
type FilterMeta = "all" | "has_meta" | "no_meta";

// ─── Helpers ─────────────────────────────────────────────────────────

function truncate(s: string, len: number) {
  if (!s) return "";
  return s.length > len ? s.slice(0, len) + "\u2026" : s;
}

function scoreColor(score: number | null): string {
  if (score === null) return "text-stone-400";
  if (score >= 70) return "text-[var(--admin-green)]";
  if (score >= 40) return "text-[var(--admin-gold)]";
  return "text-[var(--admin-red)]";
}

function wordCountColor(wc: number): string {
  if (wc >= 1000) return "text-[var(--admin-green)]";
  if (wc >= 500) return "text-[var(--admin-gold)]";
  return "text-[var(--admin-red)]";
}

function buildGscUrl(domain: string, slug: string): string {
  const fullUrl = `${domain}/blog/${slug}`;
  return `https://search.google.com/search-console/inspect?resource_id=sc-domain:${domain.replace(
    /^https?:\/\//,
    ""
  )}&id=${encodeURIComponent(fullUrl)}`;
}

function buildPsiUrl(domain: string, slug: string): string {
  return `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(
    `${domain}/blog/${slug}`
  )}`;
}

function buildRichResultsUrl(domain: string, slug: string): string {
  return `https://search.google.com/test/rich-results?url=${encodeURIComponent(
    `${domain}/blog/${slug}`
  )}`;
}

// ─── Main Component ──────────────────────────────────────────────────

export default function SeoDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterPublished, setFilterPublished] =
    useState<FilterPublished>("all");
  const [filterIndexed, setFilterIndexed] = useState<FilterIndexed>("all");
  const [filterMeta, setFilterMeta] = useState<FilterMeta>("all");

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>("seoScore");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Tab
  const [activeTab, setActiveTab] = useState("overview");

  // Expanded route for external links (mobile)
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/seo-dashboard");
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Unknown error");
      setData(json);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load dashboard"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Derive domain from siteId for external links
  const domain = data?.siteId
    ? `https://www.${data.siteId.replace(/^yalla-/, "yalla-")}.com`
    : "https://www.yalla-london.com";

  // ─── Filtered + sorted routes ────────────────────────────────────

  const filteredRoutes = useMemo(() => {
    if (!data) return [];
    let routes = [...data.routes];

    if (filterPublished === "published")
      routes = routes.filter((r) => r.published);
    else if (filterPublished === "draft")
      routes = routes.filter((r) => !r.published);

    if (filterIndexed === "indexed")
      routes = routes.filter((r) => r.indexingStatus === "indexed");
    else if (filterIndexed === "not_indexed")
      routes = routes.filter((r) => r.indexingStatus !== "indexed");

    if (filterMeta === "has_meta")
      routes = routes.filter(
        (r) => r.metaDescriptionEn && r.metaDescriptionEn.trim().length > 0
      );
    else if (filterMeta === "no_meta")
      routes = routes.filter(
        (r) => !r.metaDescriptionEn || r.metaDescriptionEn.trim().length === 0
      );

    routes.sort((a, b) => {
      let av: string | number = 0;
      let bv: string | number = 0;

      switch (sortKey) {
        case "titleEn":
          av = (a.titleEn || "").toLowerCase();
          bv = (b.titleEn || "").toLowerCase();
          break;
        case "seoScore":
          av = a.seoScore ?? -1;
          bv = b.seoScore ?? -1;
          break;
        case "wordCount":
          av = a.wordCount;
          bv = b.wordCount;
          break;
        case "indexingStatus":
          av = a.indexingStatus;
          bv = b.indexingStatus;
          break;
        case "published":
          av = a.published ? 1 : 0;
          bv = b.published ? 1 : 0;
          break;
      }

      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return routes;
  }, [data, filterPublished, filterIndexed, filterMeta, sortKey, sortDir]);

  // ─── Quick fixes ─────────────────────────────────────────────────

  const quickFixes = useMemo(() => {
    if (!data) return [];
    const fixes: { label: string; count: number; severity: string }[] = [];

    const noMeta = data.routes.filter(
      (r) =>
        r.published &&
        (!r.metaDescriptionEn || r.metaDescriptionEn.trim().length === 0)
    );
    if (noMeta.length > 0)
      fixes.push({
        label: "Published pages without meta descriptions",
        count: noMeta.length,
        severity: "critical",
      });

    const lowSeo = data.routes.filter(
      (r) => r.published && r.seoScore !== null && r.seoScore < 40
    );
    if (lowSeo.length > 0)
      fixes.push({
        label: "Published pages with SEO score below 40",
        count: lowSeo.length,
        severity: "critical",
      });

    const thinContent = data.routes.filter(
      (r) => r.published && r.wordCount < 500
    );
    if (thinContent.length > 0)
      fixes.push({
        label: "Published pages with fewer than 500 words",
        count: thinContent.length,
        severity: "warning",
      });

    const notIndexed = data.routes.filter(
      (r) => r.published && r.indexingStatus !== "indexed"
    );
    if (notIndexed.length > 0)
      fixes.push({
        label: "Published pages not yet indexed",
        count: notIndexed.length,
        severity: "warning",
      });

    return fixes;
  }, [data]);

  // ─── Sort handler ────────────────────────────────────────────────

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function sortIndicator(key: SortKey) {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? " \u2191" : " \u2193";
  }

  // ─── Render ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--admin-bg)] p-4 md:p-6">
        <AdminPageHeader title="SEO Dashboard" subtitle="Search engine optimization" />
        <AdminLoadingState label="Loading SEO data..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[var(--admin-bg)] p-4 md:p-6">
        <AdminPageHeader
          title="SEO Dashboard"
          subtitle="Search engine optimization"
          action={
            <AdminButton onClick={fetchData} variant="secondary" size="sm">
              Retry
            </AdminButton>
          }
        />
        <AdminAlertBanner
          severity="critical"
          message="Failed to load SEO dashboard"
          detail={error || "Unknown error"}
        />
      </div>
    );
  }

  const { summary } = data;

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "routes", label: "Routes", count: filteredRoutes.length },
    { id: "fixes", label: "Quick Fixes", count: quickFixes.length },
    { id: "hreflang", label: "Hreflang" },
  ];

  return (
    <div className="min-h-screen bg-[var(--admin-bg)] p-4 md:p-6 max-w-[1400px] mx-auto">
      <AdminPageHeader
        title="SEO Dashboard"
        subtitle={`Site: ${data.siteId}`}
        action={
          <AdminButton onClick={fetchData} variant="secondary" size="sm">
            Refresh
          </AdminButton>
        }
      />

      <AdminTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="mt-5">
        {/* ══════════ TAB: Overview ══════════ */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* KPI Row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <AdminKPICard
                value={summary.publishedPages}
                label="Published"
                color="var(--admin-green)"
              />
              <AdminKPICard
                value={summary.withMeta}
                label="With Meta"
                color={
                  summary.withMeta >= summary.publishedPages * 0.8
                    ? "var(--admin-green)"
                    : "var(--admin-gold)"
                }
              />
              <AdminKPICard
                value={summary.indexedCount}
                label="Indexed"
                color="var(--admin-blue)"
              />
              <AdminKPICard
                value={summary.avgSeoScore ?? "N/A"}
                label="Avg SEO Score"
                color={
                  summary.avgSeoScore !== null && summary.avgSeoScore >= 60
                    ? "var(--admin-green)"
                    : "var(--admin-gold)"
                }
              />
              <AdminKPICard
                value={summary.latestAuditScore ?? "N/A"}
                label="Audit Score"
                color={
                  summary.latestAuditScore !== null &&
                  summary.latestAuditScore >= 70
                    ? "var(--admin-green)"
                    : "var(--admin-gold)"
                }
              />
            </div>

            {/* Indexing Breakdown */}
            <AdminCard>
              <AdminSectionLabel>Indexing Breakdown</AdminSectionLabel>
              <div className="flex flex-wrap gap-2">
                {Object.entries(data.indexingStats).map(([status, count]) => (
                  <div
                    key={status}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--admin-bg)] border border-[var(--admin-border)]"
                  >
                    <AdminStatusBadge
                      status={
                        status === "indexed"
                          ? "indexed"
                          : status === "submitted"
                          ? "pending"
                          : status === "error"
                          ? "error"
                          : "inactive"
                      }
                      label={status}
                    />
                    <span className="font-[var(--font-display)] font-bold text-sm text-[var(--admin-text)]">
                      {count}
                    </span>
                  </div>
                ))}
                {Object.keys(data.indexingStats).length === 0 && (
                  <p className="text-[var(--admin-text-muted)] text-xs">
                    No indexing data available
                  </p>
                )}
              </div>
            </AdminCard>

            {/* Latest Audit */}
            {data.latestAudit && (
              <AdminCard>
                <AdminSectionLabel>Latest SEO Audit</AdminSectionLabel>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div
                      className={`font-[var(--font-display)] font-extrabold text-3xl ${scoreColor(
                        data.latestAudit.score
                      )}`}
                    >
                      {data.latestAudit.score ?? "N/A"}
                    </div>
                    <p className="text-[var(--admin-text-muted)] text-[11px] mt-1">
                      Score
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="font-[var(--font-display)] font-extrabold text-3xl text-[var(--admin-text)]">
                      {data.latestAudit.issueCount}
                    </div>
                    <p className="text-[var(--admin-text-muted)] text-[11px] mt-1">
                      Issues
                    </p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-[var(--admin-text-muted)] text-[11px]">
                      {new Date(data.latestAudit.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </AdminCard>
            )}

            {/* Quick Fixes Preview */}
            {quickFixes.length > 0 && (
              <AdminCard accent accentColor="gold">
                <AdminSectionLabel>Priority Fixes</AdminSectionLabel>
                <div className="space-y-2">
                  {quickFixes.slice(0, 3).map((fix, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-2 border-b border-[var(--admin-border)] last:border-0"
                    >
                      <div className="flex items-center gap-2">
                        <AdminStatusBadge
                          status={
                            fix.severity === "critical" ? "error" : "warning"
                          }
                          label={fix.severity}
                        />
                        <span className="text-sm text-[var(--admin-text)]">
                          {fix.label}
                        </span>
                      </div>
                      <span className="font-[var(--font-display)] font-bold text-sm text-[var(--admin-text)]">
                        {fix.count}
                      </span>
                    </div>
                  ))}
                </div>
                {quickFixes.length > 3 && (
                  <AdminButton
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={() => setActiveTab("fixes")}
                  >
                    View all {quickFixes.length} fixes
                  </AdminButton>
                )}
              </AdminCard>
            )}
          </div>
        )}

        {/* ══════════ TAB: Routes ══════════ */}
        {activeTab === "routes" && (
          <div className="space-y-4">
            {/* Filters */}
            <AdminCard>
              <div className="flex flex-wrap gap-3 items-center">
                <div>
                  <label className="text-[11px] text-[var(--admin-text-muted)] uppercase tracking-wide font-semibold mr-2">
                    Status
                  </label>
                  <select
                    className="text-xs border border-[var(--admin-border)] rounded-lg px-2 py-1.5 bg-white text-[var(--admin-text)]"
                    value={filterPublished}
                    onChange={(e) =>
                      setFilterPublished(e.target.value as FilterPublished)
                    }
                  >
                    <option value="all">All</option>
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-[var(--admin-text-muted)] uppercase tracking-wide font-semibold mr-2">
                    Indexed
                  </label>
                  <select
                    className="text-xs border border-[var(--admin-border)] rounded-lg px-2 py-1.5 bg-white text-[var(--admin-text)]"
                    value={filterIndexed}
                    onChange={(e) =>
                      setFilterIndexed(e.target.value as FilterIndexed)
                    }
                  >
                    <option value="all">All</option>
                    <option value="indexed">Indexed</option>
                    <option value="not_indexed">Not Indexed</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-[var(--admin-text-muted)] uppercase tracking-wide font-semibold mr-2">
                    Meta
                  </label>
                  <select
                    className="text-xs border border-[var(--admin-border)] rounded-lg px-2 py-1.5 bg-white text-[var(--admin-text)]"
                    value={filterMeta}
                    onChange={(e) =>
                      setFilterMeta(e.target.value as FilterMeta)
                    }
                  >
                    <option value="all">All</option>
                    <option value="has_meta">Has Meta</option>
                    <option value="no_meta">No Meta</option>
                  </select>
                </div>
                <div className="ml-auto text-[11px] text-[var(--admin-text-muted)]">
                  {filteredRoutes.length} of {data.routes.length} routes
                </div>
              </div>
            </AdminCard>

            {/* Desktop Table */}
            <div className="hidden md:block">
              <AdminCard className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[var(--admin-border)]">
                      {[
                        { key: "titleEn" as SortKey, label: "Title" },
                        { key: "seoScore" as SortKey, label: "SEO" },
                        { key: "wordCount" as SortKey, label: "Words" },
                        { key: "indexingStatus" as SortKey, label: "Index" },
                        { key: "published" as SortKey, label: "Status" },
                      ].map((col) => (
                        <th
                          key={col.key}
                          className="font-[var(--font-system)] text-[11px] text-[var(--admin-text-muted)] uppercase tracking-wide font-semibold py-3 px-3 cursor-pointer hover:text-[var(--admin-text)] select-none"
                          onClick={() => handleSort(col.key)}
                        >
                          {col.label}
                          {sortIndicator(col.key)}
                        </th>
                      ))}
                      <th className="font-[var(--font-system)] text-[11px] text-[var(--admin-text-muted)] uppercase tracking-wide font-semibold py-3 px-3">
                        Meta Desc
                      </th>
                      <th className="font-[var(--font-system)] text-[11px] text-[var(--admin-text-muted)] uppercase tracking-wide font-semibold py-3 px-3">
                        Links
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRoutes.map((r) => (
                      <tr
                        key={r.id}
                        className="border-b border-[var(--admin-border)] last:border-0 hover:bg-[var(--admin-bg)] transition-colors"
                      >
                        <td className="py-3 px-3 max-w-[200px]">
                          <div className="text-sm font-medium text-[var(--admin-text)] truncate">
                            {truncate(r.titleEn, 50)}
                          </div>
                          <div className="text-[11px] text-[var(--admin-text-muted)] truncate">
                            /blog/{r.slug}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`font-[var(--font-display)] font-bold text-sm ${scoreColor(
                              r.seoScore
                            )}`}
                          >
                            {r.seoScore ?? "---"}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`font-[var(--font-display)] font-bold text-sm ${wordCountColor(
                              r.wordCount
                            )}`}
                          >
                            {r.wordCount.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <AdminStatusBadge
                            status={
                              r.indexingStatus === "indexed"
                                ? "indexed"
                                : r.indexingStatus === "submitted"
                                ? "pending"
                                : r.indexingStatus === "error"
                                ? "error"
                                : "inactive"
                            }
                            label={r.indexingStatus}
                          />
                        </td>
                        <td className="py-3 px-3">
                          <AdminStatusBadge
                            status={r.published ? "published" : "draft"}
                          />
                        </td>
                        <td className="py-3 px-3 max-w-[180px]">
                          <span
                            className={`text-[11px] truncate block ${
                              r.metaDescriptionEn
                                ? "text-[var(--admin-text)]"
                                : "text-[var(--admin-red)] italic"
                            }`}
                          >
                            {r.metaDescriptionEn
                              ? truncate(r.metaDescriptionEn, 60)
                              : "Missing"}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex gap-1.5">
                            <a
                              href={buildGscUrl(domain, r.slug)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] px-2 py-1 rounded bg-[var(--admin-bg)] border border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:border-[var(--admin-border-hover)] transition-colors"
                              title="Google Search Console"
                            >
                              GSC
                            </a>
                            <a
                              href={buildPsiUrl(domain, r.slug)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] px-2 py-1 rounded bg-[var(--admin-bg)] border border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:border-[var(--admin-border-hover)] transition-colors"
                              title="PageSpeed Insights"
                            >
                              PSI
                            </a>
                            <a
                              href={buildRichResultsUrl(domain, r.slug)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] px-2 py-1 rounded bg-[var(--admin-bg)] border border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:border-[var(--admin-border-hover)] transition-colors"
                              title="Rich Results Test"
                            >
                              Rich
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredRoutes.length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          className="text-center py-8 text-[var(--admin-text-muted)] text-sm"
                        >
                          No routes match the current filters
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </AdminCard>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {filteredRoutes.map((r) => (
                <AdminCard key={r.id} className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--admin-text)] truncate">
                        {truncate(r.titleEn, 40)}
                      </p>
                      <p className="text-[11px] text-[var(--admin-text-muted)] truncate">
                        /blog/{r.slug}
                      </p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <AdminStatusBadge
                        status={r.published ? "published" : "draft"}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div
                        className={`font-[var(--font-display)] font-bold text-base ${scoreColor(
                          r.seoScore
                        )}`}
                      >
                        {r.seoScore ?? "---"}
                      </div>
                      <div className="text-[10px] text-[var(--admin-text-muted)] uppercase">
                        SEO
                      </div>
                    </div>
                    <div>
                      <div
                        className={`font-[var(--font-display)] font-bold text-base ${wordCountColor(
                          r.wordCount
                        )}`}
                      >
                        {r.wordCount.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-[var(--admin-text-muted)] uppercase">
                        Words
                      </div>
                    </div>
                    <div>
                      <AdminStatusBadge
                        status={
                          r.indexingStatus === "indexed"
                            ? "indexed"
                            : r.indexingStatus === "submitted"
                            ? "pending"
                            : "inactive"
                        }
                        label={r.indexingStatus}
                      />
                    </div>
                  </div>

                  {r.metaDescriptionEn ? (
                    <p className="text-[11px] text-[var(--admin-text-muted)] line-clamp-2">
                      {r.metaDescriptionEn}
                    </p>
                  ) : (
                    <p className="text-[11px] text-[var(--admin-red)] italic">
                      Missing meta description
                    </p>
                  )}

                  <button
                    onClick={() =>
                      setExpandedSlug(
                        expandedSlug === r.slug ? null : r.slug
                      )
                    }
                    className="text-[11px] text-[var(--admin-blue)] font-semibold"
                  >
                    {expandedSlug === r.slug
                      ? "Hide external links"
                      : "External links"}
                  </button>

                  {expandedSlug === r.slug && (
                    <div className="flex gap-2 pt-1">
                      <a
                        href={buildGscUrl(domain, r.slug)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] px-3 py-1.5 rounded-lg bg-[var(--admin-bg)] border border-[var(--admin-border)] text-[var(--admin-text-muted)]"
                      >
                        GSC
                      </a>
                      <a
                        href={buildPsiUrl(domain, r.slug)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] px-3 py-1.5 rounded-lg bg-[var(--admin-bg)] border border-[var(--admin-border)] text-[var(--admin-text-muted)]"
                      >
                        PageSpeed
                      </a>
                      <a
                        href={buildRichResultsUrl(domain, r.slug)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] px-3 py-1.5 rounded-lg bg-[var(--admin-bg)] border border-[var(--admin-border)] text-[var(--admin-text-muted)]"
                      >
                        Rich Results
                      </a>
                    </div>
                  )}
                </AdminCard>
              ))}
              {filteredRoutes.length === 0 && (
                <AdminCard>
                  <p className="text-center py-4 text-[var(--admin-text-muted)] text-sm">
                    No routes match the current filters
                  </p>
                </AdminCard>
              )}
            </div>
          </div>
        )}

        {/* ══════════ TAB: Quick Fixes ══════════ */}
        {activeTab === "fixes" && (
          <div className="space-y-4">
            {quickFixes.length === 0 ? (
              <AdminCard>
                <div className="text-center py-8">
                  <div className="text-3xl mb-2">&#10003;</div>
                  <p className="text-sm text-[var(--admin-text)]">
                    No critical SEO issues found
                  </p>
                  <p className="text-[11px] text-[var(--admin-text-muted)] mt-1">
                    All published pages pass basic SEO checks
                  </p>
                </div>
              </AdminCard>
            ) : (
              quickFixes.map((fix, i) => (
                <AdminCard
                  key={i}
                  accent
                  accentColor={fix.severity === "critical" ? "red" : "gold"}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AdminStatusBadge
                        status={
                          fix.severity === "critical" ? "error" : "warning"
                        }
                        label={fix.severity}
                      />
                      <span className="text-sm text-[var(--admin-text)]">
                        {fix.label}
                      </span>
                    </div>
                    <span className="font-[var(--font-display)] font-extrabold text-xl text-[var(--admin-text)]">
                      {fix.count}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1">
                    {data.routes
                      .filter((r) => {
                        if (!r.published) return false;
                        if (
                          fix.label.includes("meta descriptions") &&
                          (!r.metaDescriptionEn ||
                            !r.metaDescriptionEn.trim())
                        )
                          return true;
                        if (
                          fix.label.includes("SEO score below") &&
                          r.seoScore !== null &&
                          r.seoScore < 40
                        )
                          return true;
                        if (
                          fix.label.includes("fewer than 500") &&
                          r.wordCount < 500
                        )
                          return true;
                        if (
                          fix.label.includes("not yet indexed") &&
                          r.indexingStatus !== "indexed"
                        )
                          return true;
                        return false;
                      })
                      .slice(0, 5)
                      .map((r) => (
                        <div
                          key={r.id}
                          className="flex items-center justify-between py-1.5 px-2 rounded-md bg-[var(--admin-bg)]"
                        >
                          <span className="text-[11px] text-[var(--admin-text)] truncate max-w-[250px]">
                            {r.titleEn || r.slug}
                          </span>
                          <span className="text-[10px] text-[var(--admin-text-muted)]">
                            {r.seoScore !== null
                              ? `SEO: ${r.seoScore}`
                              : `${r.wordCount}w`}
                          </span>
                        </div>
                      ))}
                    {fix.count > 5 && (
                      <p className="text-[10px] text-[var(--admin-text-muted)] pl-2">
                        +{fix.count - 5} more
                      </p>
                    )}
                  </div>
                </AdminCard>
              ))
            )}
          </div>
        )}

        {/* ══════════ TAB: Hreflang ══════════ */}
        {activeTab === "hreflang" && (
          <div className="space-y-4">
            <AdminCard>
              <AdminSectionLabel>
                Hreflang Coverage (EN + AR)
              </AdminSectionLabel>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-3 rounded-lg bg-[var(--admin-bg)]">
                  <div className="font-[var(--font-display)] font-bold text-lg text-[var(--admin-green)]">
                    {data.routes.filter((r) => r.hasArabic).length}
                  </div>
                  <div className="text-[10px] text-[var(--admin-text-muted)] uppercase">
                    Both EN+AR
                  </div>
                </div>
                <div className="text-center p-3 rounded-lg bg-[var(--admin-bg)]">
                  <div className="font-[var(--font-display)] font-bold text-lg text-[var(--admin-gold)]">
                    {data.routes.filter((r) => !r.hasArabic).length}
                  </div>
                  <div className="text-[10px] text-[var(--admin-text-muted)] uppercase">
                    EN Only
                  </div>
                </div>
                <div className="text-center p-3 rounded-lg bg-[var(--admin-bg)]">
                  <div className="font-[var(--font-display)] font-bold text-lg text-[var(--admin-text)]">
                    {data.routes.length}
                  </div>
                  <div className="text-[10px] text-[var(--admin-text-muted)] uppercase">
                    Total
                  </div>
                </div>
              </div>
            </AdminCard>

            <AdminCard>
              <div className="space-y-1">
                {data.routes.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between py-2 px-2 border-b border-[var(--admin-border)] last:border-0"
                  >
                    <div className="min-w-0 mr-3">
                      <p className="text-xs text-[var(--admin-text)] truncate">
                        {truncate(r.titleEn, 45)}
                      </p>
                      <p className="text-[10px] text-[var(--admin-text-muted)]">
                        /blog/{r.slug}
                      </p>
                    </div>
                    <AdminStatusBadge
                      status={r.hasArabic ? "success" : "warning"}
                      label={r.hasArabic ? "Both" : "EN Only"}
                    />
                  </div>
                ))}
                {data.routes.length === 0 && (
                  <p className="text-center py-4 text-[var(--admin-text-muted)] text-sm">
                    No pages found
                  </p>
                )}
              </div>
            </AdminCard>
          </div>
        )}
      </div>
    </div>
  );
}
