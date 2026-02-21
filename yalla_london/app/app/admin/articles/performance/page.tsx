"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  TrendingUp,
  Eye,
  Search,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  XCircle,
  MousePointerClick,
  Globe,
  FileText,
  ArrowUpRight,
  Loader2,
  Clock,
  Target,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Zap,
} from "lucide-react";

interface ArticlePerformance {
  id: string;
  title: string;
  slug: string;
  url: string;
  path: string;
  publishedAt: string;
  updatedAt: string;
  seoScore: number;
  pageType: string | null;
  hasMetaTitle: boolean;
  hasMetaDescription: boolean;
  hasFeaturedImage: boolean;
  contentType?: string;
  siteId: string | null;
  gsc: {
    impressions: number;
    clicks: number;
    ctr: number;
    avgPosition: number;
  } | null;
  ga4: {
    pageViews: number;
    sessions: number;
    avgEngagementTime: number;
  } | null;
  indexing: {
    indexed: boolean;
    lastCrawl: string | null;
    verdict: string | null;
  } | null;
}

interface PerformanceData {
  success: boolean;
  dateRange: { startDate: string; endDate: string; days: number };
  siteId: string;
  sources: { gsc: boolean; ga4: boolean; indexingChecked: boolean };
  summary: {
    totalArticles: number;
    articlesWithGSCData: number;
    articlesWithGA4Data: number;
    indexed?: number;
    notIndexed?: number;
    totalImpressions: number;
    totalClicks: number;
    avgCTR: number | null;
    avgPosition: number | null;
    totalPageViews: number;
    siteMetrics?: {
      sessions: number;
      users: number;
      bounceRate: number;
      engagementRate: number;
    };
  };
  articles: ArticlePerformance[];
  durationMs: number;
}

type SortField =
  | "title"
  | "publishedAt"
  | "seoScore"
  | "impressions"
  | "clicks"
  | "ctr"
  | "position"
  | "pageViews";

export default function ArticlePerformancePage() {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  const [checkIndex, setCheckIndex] = useState(false);
  const [sortField, setSortField] = useState<SortField>("impressions");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        days: days.toString(),
        limit: "100",
        ...(checkIndex ? { checkIndex: "true" } : {}),
      });
      const res = await fetch(`/api/admin/articles/performance?${params}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [days, checkIndex]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const sorted = data?.articles
    ? [...data.articles]
        .filter(
          (a) =>
            !searchQuery ||
            a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.slug.includes(searchQuery.toLowerCase())
        )
        .sort((a, b) => {
          const dir = sortDir === "desc" ? -1 : 1;
          switch (sortField) {
            case "title":
              return a.title.localeCompare(b.title) * dir;
            case "publishedAt":
              return (
                (new Date(a.publishedAt).getTime() -
                  new Date(b.publishedAt).getTime()) *
                dir
              );
            case "seoScore":
              return (a.seoScore - b.seoScore) * dir;
            case "impressions":
              return (
                ((a.gsc?.impressions || 0) - (b.gsc?.impressions || 0)) * dir
              );
            case "clicks":
              return ((a.gsc?.clicks || 0) - (b.gsc?.clicks || 0)) * dir;
            case "ctr":
              return ((a.gsc?.ctr || 0) - (b.gsc?.ctr || 0)) * dir;
            case "position":
              return (
                ((a.gsc?.avgPosition || 999) - (b.gsc?.avgPosition || 999)) *
                dir
              );
            case "pageViews":
              return (
                ((a.ga4?.pageViews || 0) - (b.ga4?.pageViews || 0)) * dir
              );
            default:
              return 0;
          }
        })
    : [];

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) =>
    sortField === field ? (
      sortDir === "desc" ? (
        <ChevronDown className="inline w-3 h-3 ml-0.5" />
      ) : (
        <ChevronUp className="inline w-3 h-3 ml-0.5" />
      )
    ) : null;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/articles"
            className="text-gray-400 hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-violet-400" />
              Article Performance
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Real data from Google Search Console &amp; Google Analytics 4
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-gray-400">
            <input
              type="checkbox"
              checked={checkIndex}
              onChange={(e) => setCheckIndex(e.target.checked)}
              className="rounded border-gray-600"
            />
            Check indexing
          </label>
          <button
            onClick={fetchData}
            disabled={loading}
            className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Refresh
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-red-300">Failed to load data</p>
            <p className="text-sm text-red-400 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !data && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-gray-900 rounded-xl p-5 animate-pulse"
              >
                <div className="h-4 bg-gray-800 rounded w-24 mb-3" />
                <div className="h-8 bg-gray-800 rounded w-16" />
              </div>
            ))}
          </div>
          <div className="bg-gray-900 rounded-xl p-6 animate-pulse">
            <div className="h-6 bg-gray-800 rounded w-48 mb-4" />
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-gray-800 rounded mb-2" />
            ))}
          </div>
        </div>
      )}

      {data && (
        <>
          {/* Data sources status */}
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-500">Data sources:</span>
            <span
              className={`flex items-center gap-1.5 ${data.sources.gsc ? "text-green-400" : "text-gray-600"}`}
            >
              {data.sources.gsc ? (
                <CheckCircle className="w-3.5 h-3.5" />
              ) : (
                <XCircle className="w-3.5 h-3.5" />
              )}
              GSC
            </span>
            <span
              className={`flex items-center gap-1.5 ${data.sources.ga4 ? "text-green-400" : "text-gray-600"}`}
            >
              {data.sources.ga4 ? (
                <CheckCircle className="w-3.5 h-3.5" />
              ) : (
                <XCircle className="w-3.5 h-3.5" />
              )}
              GA4
            </span>
            {data.sources.indexingChecked && (
              <span className="flex items-center gap-1.5 text-green-400">
                <CheckCircle className="w-3.5 h-3.5" />
                Indexing
              </span>
            )}
            <span className="text-gray-600 ml-auto">
              {data.dateRange.startDate} — {data.dateRange.endDate} &middot;{" "}
              {data.durationMs}ms
            </span>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4">
            <SummaryCard
              icon={<FileText className="w-5 h-5 text-violet-400" />}
              label="Articles"
              value={data.summary.totalArticles}
            />
            <SummaryCard
              icon={<Eye className="w-5 h-5 text-blue-400" />}
              label="Impressions"
              value={formatNumber(data.summary.totalImpressions)}
              sub={`${data.summary.articlesWithGSCData} with data`}
            />
            <SummaryCard
              icon={<MousePointerClick className="w-5 h-5 text-green-400" />}
              label="Clicks"
              value={formatNumber(data.summary.totalClicks)}
              sub={
                data.summary.avgCTR !== null
                  ? `${data.summary.avgCTR}% CTR`
                  : undefined
              }
            />
            <SummaryCard
              icon={<Target className="w-5 h-5 text-amber-400" />}
              label="Avg Position"
              value={
                data.summary.avgPosition !== null
                  ? data.summary.avgPosition.toString()
                  : "—"
              }
              sub={data.summary.avgPosition && data.summary.avgPosition <= 10 ? "Page 1" : undefined}
            />
            <SummaryCard
              icon={<TrendingUp className="w-5 h-5 text-cyan-400" />}
              label="Page Views"
              value={formatNumber(data.summary.totalPageViews)}
              sub={`${data.summary.articlesWithGA4Data} with data`}
            />
            {data.sources.indexingChecked &&
              data.summary.indexed !== undefined && (
                <SummaryCard
                  icon={<Globe className="w-5 h-5 text-emerald-400" />}
                  label="Indexed"
                  value={`${data.summary.indexed}/${data.summary.totalArticles}`}
                  sub={
                    data.summary.notIndexed
                      ? `${data.summary.notIndexed} not indexed`
                      : "All indexed"
                  }
                  highlight={
                    data.summary.indexed === data.summary.totalArticles
                      ? "green"
                      : "amber"
                  }
                />
              )}
          </div>

          {/* Site-wide metrics from GA4 */}
          {data.summary.siteMetrics && (
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 flex flex-wrap gap-6 text-sm">
              <span className="text-gray-500 font-medium flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-400" />
                Site-wide GA4 ({days}d)
              </span>
              <span>
                <span className="text-gray-400">Sessions:</span>{" "}
                <span className="text-white font-medium">
                  {formatNumber(data.summary.siteMetrics.sessions)}
                </span>
              </span>
              <span>
                <span className="text-gray-400">Users:</span>{" "}
                <span className="text-white font-medium">
                  {formatNumber(data.summary.siteMetrics.users)}
                </span>
              </span>
              <span>
                <span className="text-gray-400">Bounce Rate:</span>{" "}
                <span className="text-white font-medium">
                  {data.summary.siteMetrics.bounceRate.toFixed(1)}%
                </span>
              </span>
              <span>
                <span className="text-gray-400">Engagement:</span>{" "}
                <span className="text-white font-medium">
                  {data.summary.siteMetrics.engagementRate.toFixed(1)}%
                </span>
              </span>
            </div>
          )}

          {/* Search & Filter */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-violet-500"
              />
            </div>
            <span className="text-sm text-gray-500">
              {sorted.length} article{sorted.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Articles Table */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400">
                    <th className="text-left p-3 font-medium">
                      <button
                        onClick={() => toggleSort("title")}
                        className="hover:text-white transition"
                      >
                        Article
                        <SortIcon field="title" />
                      </button>
                    </th>
                    <th className="text-center p-3 font-medium w-20">
                      <button
                        onClick={() => toggleSort("seoScore")}
                        className="hover:text-white transition"
                      >
                        SEO
                        <SortIcon field="seoScore" />
                      </button>
                    </th>
                    {data.sources.indexingChecked && (
                      <th className="text-center p-3 font-medium w-20">
                        Index
                      </th>
                    )}
                    <th className="text-right p-3 font-medium">
                      <button
                        onClick={() => toggleSort("impressions")}
                        className="hover:text-white transition"
                      >
                        Impressions
                        <SortIcon field="impressions" />
                      </button>
                    </th>
                    <th className="text-right p-3 font-medium">
                      <button
                        onClick={() => toggleSort("clicks")}
                        className="hover:text-white transition"
                      >
                        Clicks
                        <SortIcon field="clicks" />
                      </button>
                    </th>
                    <th className="text-right p-3 font-medium">
                      <button
                        onClick={() => toggleSort("ctr")}
                        className="hover:text-white transition"
                      >
                        CTR
                        <SortIcon field="ctr" />
                      </button>
                    </th>
                    <th className="text-right p-3 font-medium">
                      <button
                        onClick={() => toggleSort("position")}
                        className="hover:text-white transition"
                      >
                        Avg Pos
                        <SortIcon field="position" />
                      </button>
                    </th>
                    <th className="text-right p-3 font-medium">
                      <button
                        onClick={() => toggleSort("pageViews")}
                        className="hover:text-white transition"
                      >
                        Views
                        <SortIcon field="pageViews" />
                      </button>
                    </th>
                    <th className="text-right p-3 font-medium">
                      <button
                        onClick={() => toggleSort("publishedAt")}
                        className="hover:text-white transition"
                      >
                        Published
                        <SortIcon field="publishedAt" />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="text-center py-12 text-gray-500"
                      >
                        {loading
                          ? "Loading..."
                          : searchQuery
                            ? "No articles match your search"
                            : "No published articles found"}
                      </td>
                    </tr>
                  ) : (
                    sorted.map((article) => (
                      <tr
                        key={article.id}
                        className="border-b border-gray-800/50 hover:bg-gray-800/30 transition"
                      >
                        {/* Title + URL */}
                        <td className="p-3 max-w-xs">
                          <div className="font-medium text-gray-200 truncate">
                            {article.title}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-xs text-gray-500 truncate">
                              {article.path}
                            </span>
                            <a
                              href={article.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-600 hover:text-violet-400 transition flex-shrink-0"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {article.contentType && article.contentType !== "blog" && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                article.contentType === "info-section"
                                  ? "bg-blue-900/30 text-blue-400"
                                  : article.contentType === "info-article"
                                    ? "bg-cyan-900/30 text-cyan-400"
                                    : "bg-gray-800 text-gray-400"
                              }`}>
                                {article.contentType === "info-section" ? "Info Hub" : article.contentType === "info-article" ? "Info Article" : article.contentType}
                              </span>
                            )}
                            {article.pageType && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">
                                {article.pageType}
                              </span>
                            )}
                            {!article.hasMetaTitle && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-amber-900/30 rounded text-amber-400">
                                No meta title
                              </span>
                            )}
                            {!article.hasMetaDescription && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-amber-900/30 rounded text-amber-400">
                                No meta desc
                              </span>
                            )}
                          </div>
                        </td>

                        {/* SEO Score */}
                        <td className="p-3 text-center">
                          <span
                            className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold ${
                              article.seoScore >= 80
                                ? "bg-emerald-900/30 text-emerald-400 ring-1 ring-emerald-700"
                                : article.seoScore >= 50
                                  ? "bg-amber-900/30 text-amber-400 ring-1 ring-amber-700"
                                  : "bg-red-900/30 text-red-400 ring-1 ring-red-700"
                            }`}
                          >
                            {article.seoScore}
                          </span>
                        </td>

                        {/* Indexing Status */}
                        {data.sources.indexingChecked && (
                          <td className="p-3 text-center">
                            {article.indexing ? (
                              article.indexing.indexed ? (
                                <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                                  <CheckCircle className="w-4 h-4" />
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center gap-1 text-xs text-red-400"
                                  title={
                                    article.indexing.verdict || "Not indexed"
                                  }
                                >
                                  <XCircle className="w-4 h-4" />
                                </span>
                              )
                            ) : (
                              <span className="text-gray-600">—</span>
                            )}
                          </td>
                        )}

                        {/* GSC: Impressions */}
                        <td className="p-3 text-right tabular-nums">
                          {article.gsc ? (
                            <span className="text-gray-200">
                              {formatNumber(article.gsc.impressions)}
                            </span>
                          ) : (
                            <span className="text-gray-600">—</span>
                          )}
                        </td>

                        {/* GSC: Clicks */}
                        <td className="p-3 text-right tabular-nums">
                          {article.gsc ? (
                            <span className="text-gray-200">
                              {formatNumber(article.gsc.clicks)}
                            </span>
                          ) : (
                            <span className="text-gray-600">—</span>
                          )}
                        </td>

                        {/* GSC: CTR */}
                        <td className="p-3 text-right tabular-nums">
                          {article.gsc ? (
                            <span
                              className={
                                article.gsc.ctr >= 5
                                  ? "text-emerald-400"
                                  : article.gsc.ctr >= 2
                                    ? "text-amber-400"
                                    : "text-gray-400"
                              }
                            >
                              {article.gsc.ctr.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-gray-600">—</span>
                          )}
                        </td>

                        {/* GSC: Average Position */}
                        <td className="p-3 text-right tabular-nums">
                          {article.gsc ? (
                            <span
                              className={
                                article.gsc.avgPosition <= 10
                                  ? "text-emerald-400 font-medium"
                                  : article.gsc.avgPosition <= 20
                                    ? "text-amber-400"
                                    : "text-gray-400"
                              }
                            >
                              {article.gsc.avgPosition.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-gray-600">—</span>
                          )}
                        </td>

                        {/* GA4: Page Views */}
                        <td className="p-3 text-right tabular-nums">
                          {article.ga4 ? (
                            <div>
                              <span className="text-gray-200">
                                {formatNumber(article.ga4.pageViews)}
                              </span>
                              {article.ga4.avgEngagementTime > 0 && (
                                <div className="text-[10px] text-gray-500 flex items-center justify-end gap-0.5">
                                  <Clock className="w-2.5 h-2.5" />
                                  {formatSeconds(
                                    article.ga4.avgEngagementTime
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-600">—</span>
                          )}
                        </td>

                        {/* Published date */}
                        <td className="p-3 text-right text-xs text-gray-500 whitespace-nowrap">
                          {formatDate(article.publishedAt)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-6 text-xs text-gray-500 px-2">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              SEO 80+ / CTR 5%+ / Pos 1-10
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              SEO 50-79 / CTR 2-5% / Pos 11-20
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              SEO &lt;50 / CTR &lt;2% / Pos 20+
            </span>
            <span className="ml-auto">
              "—" means no data from that source for this article
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  highlight?: "green" | "amber" | "red";
}) {
  const borderColor =
    highlight === "green"
      ? "border-emerald-700/50"
      : highlight === "amber"
        ? "border-amber-700/50"
        : "border-gray-800";
  return (
    <div
      className={`bg-gray-900 rounded-xl p-4 border ${borderColor} space-y-1`}
    >
      <div className="flex items-center gap-2 text-xs text-gray-400">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-gray-500">{sub}</div>}
    </div>
  );
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatSeconds(s: number): string {
  if (s < 60) return `${s}s`;
  const min = Math.floor(s / 60);
  const sec = s % 60;
  return `${min}m${sec > 0 ? ` ${sec}s` : ""}`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}
