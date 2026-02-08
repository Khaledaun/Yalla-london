"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Eye,
  Clock,
  Globe,
  Search,
  ExternalLink,
  RefreshCw,
  Calendar,
  ChevronDown,
  MapPin,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Zap,
  MousePointerClick,
  Smartphone,
  Monitor,
  Tablet,
  FileText,
  Target,
  ArrowUpRight,
  Shield,
  Layers,
  Pencil,
  CalendarClock,
  Lightbulb,
  Link2,
  Send,
  RotateCw,
  Check,
  Loader2,
} from "lucide-react";

// Types
interface GA4Metrics {
  sessions: number;
  totalUsers: number;
  newUsers: number;
  pageViews: number;
  bounceRate: number;
  avgSessionDuration: number;
  engagementRate: number;
}

interface TopPage {
  path: string;
  pageViews: number;
  sessions: number;
  avgEngagementTime: number;
}

interface TopSource {
  source: string;
  sessions: number;
}

interface GSCQuery {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface GSCPage {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface Country {
  country: string;
  clicks: number;
  impressions: number;
}

interface Device {
  device: string;
  clicks: number;
  impressions: number;
  ctr: number;
}

interface IndexingResult {
  url: string;
  coverageState?: string;
  lastCrawlTime?: string;
  indexingState?: string;
}

interface Issue {
  severity: "high" | "medium" | "low";
  category: string;
  title: string;
  description: string;
  autoFixable: boolean;
}

interface Recommendation {
  priority: "high" | "medium" | "low";
  category: string;
  title: string;
  description: string;
  autoFixable: boolean;
  items?: any[];
}

interface ContentArticle {
  id: string;
  title: string;
  slug: string;
  url: string;
  seoScore: number;
  pageType: string;
  category: string;
  tags: string[];
  hasMetaTitle: boolean;
  hasMetaDescription: boolean;
  hasFeaturedImage: boolean;
  publishedAt: string;
  updatedAt: string;
  indexingStatus: string;
  lastCrawled?: string;
  searchClicks: number;
  searchImpressions: number;
  searchCTR: number;
  searchPosition: number;
  issues: string[];
  recommendations: string[];
}

interface ScheduledItem {
  id: string;
  title: string;
  type: string;
  language: string;
  status: string;
  scheduledFor: string;
  seoScore: number;
  category: string;
  platform: string;
}

interface PipelineTopic {
  id: string;
  title: string;
  keyword: string;
  status: string;
  intent: string;
  pageType: string;
  confidence: number;
  evergreen: boolean;
  locale: string;
  targetDate?: string;
  createdAt: string;
}

interface ContentReport {
  published: ContentArticle[];
  scheduled: ScheduledItem[];
  pipeline: PipelineTopic[];
  contentSEO: ContentArticle[];
  summary: {
    totalPublished: number;
    totalScheduled: number;
    totalInPipeline: number;
    indexedOfSampled: string;
    articlesWithIssues: number;
    avgSEOScore: number;
  };
  durationMs: number;
}

interface SEOReport {
  generated_at: string;
  range: string;
  durationMs: number;
  ga4: {
    status: string;
    metrics?: GA4Metrics;
    topPages?: TopPage[];
    topSources?: TopSource[];
  } | null;
  gsc: {
    status: string;
    summary?: {
      totalClicks: number;
      totalImpressions: number;
      avgCTR: number;
      avgPosition: number;
    };
    topQueries?: GSCQuery[];
    topPages?: GSCPage[];
    countries?: Country[];
    devices?: Device[];
  } | null;
  indexing: {
    status: string;
    totalUrls?: number;
    sampled?: number;
    indexedCount?: number;
    notIndexedCount?: number;
    results?: IndexingResult[];
  } | null;
  issues: Issue[];
  recommendations: Recommendation[];
}

const DATE_RANGES = [
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 90 days", value: "90d" },
];

const COUNTRY_NAMES: Record<string, string> = {
  usa: "United States",
  gbr: "United Kingdom",
  are: "UAE",
  sau: "Saudi Arabia",
  kwt: "Kuwait",
  qat: "Qatar",
  bhr: "Bahrain",
  omn: "Oman",
  ind: "India",
  deu: "Germany",
  fra: "France",
  can: "Canada",
  aus: "Australia",
  egy: "Egypt",
  jor: "Jordan",
  lbn: "Lebanon",
  mar: "Morocco",
  tur: "Turkey",
  pak: "Pakistan",
  bgd: "Bangladesh",
  lka: "Sri Lanka",
  mdv: "Maldives",
  idn: "Indonesia",
  mys: "Malaysia",
  sgp: "Singapore",
  phl: "Philippines",
  tha: "Thailand",
  bra: "Brazil",
  nld: "Netherlands",
  ita: "Italy",
  esp: "Spain",
};

function getCountryName(code: string): string {
  return COUNTRY_NAMES[code.toLowerCase()] || code.toUpperCase();
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return Math.round(num).toString();
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
}

function severityColor(s: string) {
  if (s === "high") return "text-red-600 bg-red-50 border-red-200";
  if (s === "medium") return "text-amber-600 bg-amber-50 border-amber-200";
  return "text-blue-600 bg-blue-50 border-blue-200";
}

function severityIcon(s: string) {
  if (s === "high") return <XCircle className="h-5 w-5 text-red-500" />;
  if (s === "medium")
    return <AlertTriangle className="h-5 w-5 text-amber-500" />;
  return <CheckCircle className="h-5 w-5 text-blue-500" />;
}

function deviceIcon(d: string) {
  if (d === "MOBILE") return <Smartphone className="h-4 w-4" />;
  if (d === "TABLET") return <Tablet className="h-4 w-4" />;
  return <Monitor className="h-4 w-4" />;
}

// Stat Card Component
function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: any;
  color: string;
}) {
  const colors: Record<string, string> = {
    blue: "from-blue-500 to-blue-600",
    green: "from-emerald-500 to-emerald-600",
    purple: "from-purple-500 to-purple-600",
    amber: "from-amber-500 to-amber-600",
    rose: "from-rose-500 to-rose-600",
    cyan: "from-cyan-500 to-cyan-600",
    indigo: "from-indigo-500 to-indigo-600",
    teal: "from-teal-500 to-teal-600",
  };

  return (
    <div
      className={`bg-gradient-to-r ${colors[color] || colors.blue} rounded-xl p-4 text-white shadow-sm`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-white/80">{title}</span>
        <Icon className="h-5 w-5 text-white/60" />
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {subtitle && <div className="text-xs text-white/70 mt-1">{subtitle}</div>}
    </div>
  );
}

// Section Header
function SectionHeader({
  title,
  icon: Icon,
  badge,
}: {
  title: string;
  icon: any;
  badge?: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="p-2 bg-gray-100 rounded-lg">
        <Icon className="h-5 w-5 text-gray-600" />
      </div>
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      {badge && (
        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
          {badge}
        </span>
      )}
    </div>
  );
}

export default function SEOReportPage() {
  const [report, setReport] = useState<SEOReport | null>(null);
  const [contentReport, setContentReport] = useState<ContentReport | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState("30d");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeTab, setActiveTab] = useState<
    | "overview"
    | "keywords"
    | "pages"
    | "indexing"
    | "content"
    | "pipeline"
    | "plan"
    | "submit"
  >("overview");

  // Index & Submit tab state
  const [indexableUrls, setIndexableUrls] = useState<{
    counts?: { total: number; new: number; updated: number };
    urls?: { all: string[]; new: string[]; updated: string[] };
  } | null>(null);
  const [submitResult, setSubmitResult] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusChecks, setStatusChecks] = useState<
    Record<string, { loading: boolean; data?: any; error?: string }>
  >({});
  const [customUrls, setCustomUrls] = useState("");

  const loadIndexableUrls = useCallback(async () => {
    try {
      const res = await fetch("/api/seo/index-urls");
      if (res.ok) {
        const data = await res.json();
        setIndexableUrls(data);
      }
    } catch {
      // silently fail
    }
  }, []);

  const submitUrlsForIndexing = async (urls: string[], mode?: string) => {
    setIsSubmitting(true);
    setSubmitResult(null);
    try {
      const body = urls.length > 0 ? { urls } : { mode: mode || "new" };
      const res = await fetch("/api/seo/index-urls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setSubmitResult(data);
    } catch (err) {
      setSubmitResult({
        success: false,
        error: err instanceof Error ? err.message : "Submission failed",
      });
    }
    setIsSubmitting(false);
  };

  const checkUrlStatus = async (url: string) => {
    setStatusChecks((prev) => ({
      ...prev,
      [url]: { loading: true },
    }));
    try {
      const res = await fetch(
        `/api/seo/index-urls?action=status&url=${encodeURIComponent(url)}`,
      );
      const data = await res.json();
      setStatusChecks((prev) => ({
        ...prev,
        [url]: { loading: false, data: data.data },
      }));
    } catch (err) {
      setStatusChecks((prev) => ({
        ...prev,
        [url]: {
          loading: false,
          error: err instanceof Error ? err.message : "Check failed",
        },
      }));
    }
  };

  const loadReport = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/seo/report?range=${range}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load report");
    }
    setIsLoading(false);
  }, [range]);

  const loadContent = useCallback(async () => {
    setContentLoading(true);
    try {
      const response = await fetch("/api/admin/seo/content?limit=50");
      if (response.ok) {
        const data = await response.json();
        setContentReport(data);
      }
    } catch {
      // Content data is supplementary
    }
    setContentLoading(false);
  }, []);

  useEffect(() => {
    loadReport();
    loadContent();
  }, [loadReport, loadContent]);

  const ga4 = report?.ga4;
  const gsc = report?.gsc;
  const m = ga4?.metrics;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/admin/seo"
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="font-semibold text-lg">Full SEO Report</h1>
                <p className="text-sm text-gray-500">
                  {report
                    ? `Generated in ${report.durationMs}ms`
                    : "Loading..."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Date Range */}
              <div className="relative">
                <button
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                >
                  <Calendar className="h-4 w-4" />
                  {DATE_RANGES.find((r) => r.value === range)?.label}
                  <ChevronDown className="h-4 w-4" />
                </button>
                {showDatePicker && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                    {DATE_RANGES.map((r) => (
                      <button
                        key={r.value}
                        onClick={() => {
                          setRange(r.value);
                          setShowDatePicker(false);
                        }}
                        className={`w-full text-left px-4 py-2 hover:bg-gray-50 text-sm ${range === r.value ? "bg-blue-50 text-blue-600" : ""}`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={loadReport}
                className="p-2 hover:bg-gray-100 rounded-lg"
                title="Refresh"
              >
                <RefreshCw
                  className={`h-5 w-5 ${isLoading ? "animate-spin" : ""}`}
                />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 -mb-4 overflow-x-auto">
            {[
              { id: "overview", label: "Overview", icon: BarChart3 },
              { id: "content", label: "Content", icon: Pencil },
              { id: "pipeline", label: "Pipeline", icon: Layers },
              { id: "keywords", label: "Keywords", icon: Search },
              { id: "pages", label: "Pages", icon: FileText },
              { id: "indexing", label: "Indexing", icon: Globe },
              { id: "plan", label: "Fix Plan", icon: Zap },
              { id: "submit", label: "Index & Submit", icon: Send },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-3">
              <XCircle className="h-6 w-6 text-red-500" />
              <div>
                <h3 className="font-semibold text-red-800">
                  Failed to load report
                </h3>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
            <button
              onClick={loadReport}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <RefreshCw className="h-10 w-10 text-blue-500 animate-spin mb-4" />
            <p className="text-gray-500">
              Fetching live data from GA4 & Search Console...
            </p>
            <p className="text-xs text-gray-400 mt-1">
              This may take 10-15 seconds
            </p>
          </div>
        )}

        {report && !isLoading && (
          <>
            {/* Data Source Status */}
            <div className="flex flex-wrap gap-3 mb-6">
              {[
                { label: "GA4", status: ga4?.status },
                { label: "Search Console", status: gsc?.status },
                { label: "Indexing", status: report.indexing?.status },
              ].map((s) => (
                <div
                  key={s.label}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
                    s.status === "live" || s.status === "checked"
                      ? "bg-green-100 text-green-700"
                      : s.status === "error"
                        ? "bg-red-100 text-red-700"
                        : "bg-gray-100 text-gray-600"
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      s.status === "live" || s.status === "checked"
                        ? "bg-green-500"
                        : s.status === "error"
                          ? "bg-red-500"
                          : "bg-gray-400"
                    }`}
                  />
                  {s.label}:{" "}
                  {s.status === "live" || s.status === "checked"
                    ? "Connected"
                    : s.status || "N/A"}
                </div>
              ))}
            </div>

            {/* === OVERVIEW TAB === */}
            {activeTab === "overview" && (
              <>
                {/* Stats Grid */}
                {m && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <StatCard
                      title="Sessions"
                      value={formatNumber(m.sessions)}
                      icon={BarChart3}
                      color="blue"
                    />
                    <StatCard
                      title="Users"
                      value={formatNumber(m.totalUsers)}
                      subtitle={`${formatNumber(m.newUsers)} new`}
                      icon={Users}
                      color="purple"
                    />
                    <StatCard
                      title="Page Views"
                      value={formatNumber(m.pageViews)}
                      icon={Eye}
                      color="green"
                    />
                    <StatCard
                      title="Avg. Duration"
                      value={formatDuration(m.avgSessionDuration)}
                      icon={Clock}
                      color="amber"
                    />
                  </div>
                )}

                {/* Second Row Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  {m && (
                    <>
                      <StatCard
                        title="Bounce Rate"
                        value={`${m.bounceRate}%`}
                        icon={TrendingDown}
                        color="rose"
                      />
                      <StatCard
                        title="Engagement"
                        value={`${m.engagementRate}%`}
                        icon={TrendingUp}
                        color="teal"
                      />
                    </>
                  )}
                  {gsc?.summary && (
                    <>
                      <StatCard
                        title="Search Clicks"
                        value={formatNumber(gsc.summary.totalClicks)}
                        icon={MousePointerClick}
                        color="indigo"
                      />
                      <StatCard
                        title="Avg. Position"
                        value={gsc.summary.avgPosition.toFixed(1)}
                        icon={Target}
                        color="cyan"
                      />
                    </>
                  )}
                </div>

                {/* Two-column layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  {/* Top Traffic Sources */}
                  {ga4?.topSources && ga4.topSources.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <div className="p-4 border-b border-gray-100">
                        <SectionHeader
                          title="Traffic Sources"
                          icon={Globe}
                          badge="GA4"
                        />
                      </div>
                      <div className="divide-y divide-gray-50">
                        {ga4.topSources.map((s, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium text-gray-500 w-6">
                                {i + 1}
                              </span>
                              <span className="text-sm font-medium">
                                {s.source || "(direct)"}
                              </span>
                            </div>
                            <span className="text-sm text-gray-600">
                              {formatNumber(s.sessions)} sessions
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Top Countries */}
                  {gsc?.countries && gsc.countries.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <div className="p-4 border-b border-gray-100">
                        <SectionHeader
                          title="Top Countries"
                          icon={MapPin}
                          badge="GSC"
                        />
                      </div>
                      <div className="divide-y divide-gray-50">
                        {gsc.countries.slice(0, 10).map((c, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium text-gray-500 w-6">
                                {i + 1}
                              </span>
                              <span className="text-sm font-medium">
                                {getCountryName(c.country)}
                              </span>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium">
                                {formatNumber(c.clicks)} clicks
                              </div>
                              <div className="text-xs text-gray-500">
                                {formatNumber(c.impressions)} imp.
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Devices */}
                {gsc?.devices && gsc.devices.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 p-4 mb-8">
                    <SectionHeader
                      title="Devices"
                      icon={Smartphone}
                      badge="GSC"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {gsc.devices.map((d, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                        >
                          {deviceIcon(d.device)}
                          <div>
                            <div className="text-sm font-medium capitalize">
                              {d.device.toLowerCase()}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatNumber(d.clicks)} clicks / {d.ctr}% CTR
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Issues Summary */}
                {report.issues.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 p-4 mb-8">
                    <SectionHeader
                      title={`${report.issues.length} Issues Found`}
                      icon={AlertTriangle}
                    />
                    <div className="space-y-3">
                      {report.issues.map((issue, i) => (
                        <div
                          key={i}
                          className={`flex items-start gap-3 p-3 rounded-lg border ${severityColor(issue.severity)}`}
                        >
                          {severityIcon(issue.severity)}
                          <div>
                            <div className="font-medium text-sm">
                              {issue.title}
                            </div>
                            <div className="text-xs mt-0.5 opacity-80">
                              {issue.description}
                            </div>
                            {issue.autoFixable && (
                              <span className="inline-flex items-center gap-1 mt-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                                <Zap className="h-3 w-3" /> Auto-fixable
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* === CONTENT TAB === */}
            {activeTab === "content" && (
              <>
                {contentLoading ? (
                  <div className="flex flex-col items-center py-16">
                    <RefreshCw className="h-8 w-8 text-blue-500 animate-spin mb-3" />
                    <p className="text-gray-500 text-sm">
                      Loading content data...
                    </p>
                  </div>
                ) : contentReport?.contentSEO &&
                  contentReport.contentSEO.length > 0 ? (
                  <>
                    {/* Content Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <StatCard
                        title="Published"
                        value={String(contentReport.summary.totalPublished)}
                        icon={FileText}
                        color="blue"
                      />
                      <StatCard
                        title="Avg SEO Score"
                        value={`${contentReport.summary.avgSEOScore}/100`}
                        icon={Target}
                        color={
                          contentReport.summary.avgSEOScore >= 70
                            ? "green"
                            : contentReport.summary.avgSEOScore >= 40
                              ? "amber"
                              : "rose"
                        }
                      />
                      <StatCard
                        title="Indexed"
                        value={contentReport.summary.indexedOfSampled}
                        icon={CheckCircle}
                        color="green"
                      />
                      <StatCard
                        title="With Issues"
                        value={String(contentReport.summary.articlesWithIssues)}
                        icon={AlertTriangle}
                        color={
                          contentReport.summary.articlesWithIssues > 0
                            ? "amber"
                            : "green"
                        }
                      />
                    </div>

                    {/* Articles with SEO Status */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <div className="p-4 border-b border-gray-100">
                        <SectionHeader
                          title="Published Articles - SEO & Indexing Status"
                          icon={Pencil}
                          badge="Live Data"
                        />
                      </div>
                      <div className="divide-y divide-gray-50">
                        {contentReport.contentSEO.map((article, i) => {
                          const isIndexed =
                            article.indexingStatus === "Submitted and indexed";
                          const scoreColor =
                            article.seoScore >= 70
                              ? "text-green-600 bg-green-100"
                              : article.seoScore >= 40
                                ? "text-amber-600 bg-amber-100"
                                : "text-red-600 bg-red-100";
                          return (
                            <div
                              key={article.id}
                              className="px-4 py-4 hover:bg-gray-50"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="text-sm font-semibold truncate">
                                      {article.title}
                                    </h4>
                                    <span
                                      className={`px-2 py-0.5 text-xs rounded-full font-medium ${scoreColor}`}
                                    >
                                      SEO {article.seoScore}
                                    </span>
                                    {isIndexed ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">
                                        <CheckCircle className="h-3 w-3" />{" "}
                                        Indexed
                                      </span>
                                    ) : article.indexingStatus !== "unknown" ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700">
                                        <XCircle className="h-3 w-3" /> Not
                                        indexed
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-500">
                                        Checking...
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1 flex items-center gap-3 flex-wrap">
                                    <span>/blog/{article.slug}</span>
                                    <span>{article.category}</span>
                                    <span>
                                      {new Date(
                                        article.publishedAt,
                                      ).toLocaleDateString()}
                                    </span>
                                  </div>
                                  {/* Search Performance */}
                                  {(article.searchClicks > 0 ||
                                    article.searchImpressions > 0) && (
                                    <div className="flex items-center gap-4 mt-2 text-xs">
                                      <span className="text-blue-600 font-medium">
                                        {article.searchClicks} clicks
                                      </span>
                                      <span className="text-purple-600">
                                        {article.searchImpressions} impressions
                                      </span>
                                      <span
                                        className={
                                          article.searchCTR > 3
                                            ? "text-green-600"
                                            : "text-amber-600"
                                        }
                                      >
                                        {article.searchCTR}% CTR
                                      </span>
                                      <span
                                        className={
                                          article.searchPosition <= 10
                                            ? "text-green-600"
                                            : "text-amber-600"
                                        }
                                      >
                                        pos {article.searchPosition}
                                      </span>
                                    </div>
                                  )}
                                  {/* Issues */}
                                  {article.issues.length > 0 && (
                                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                                      {article.issues.map((issue, j) => (
                                        <span
                                          key={j}
                                          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-amber-50 text-amber-700 border border-amber-200"
                                        >
                                          <AlertTriangle className="h-3 w-3" />{" "}
                                          {issue}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  {/* Recommendations */}
                                  {article.recommendations.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                      {article.recommendations
                                        .slice(0, 2)
                                        .map((rec, j) => (
                                          <div
                                            key={j}
                                            className="flex items-center gap-2 text-xs text-gray-600"
                                          >
                                            <Lightbulb className="h-3 w-3 text-amber-500 shrink-0" />
                                            <span>{rec}</span>
                                          </div>
                                        ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* All Published (condensed list) */}
                    {contentReport.published.length >
                      contentReport.contentSEO.length && (
                      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mt-6">
                        <div className="p-4 border-b border-gray-100">
                          <SectionHeader
                            title={`All Published Articles (${contentReport.published.length})`}
                            icon={FileText}
                          />
                        </div>
                        <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
                          {contentReport.published.map((post, i) => {
                            const scoreColor =
                              post.seoScore >= 70
                                ? "bg-green-100 text-green-700"
                                : post.seoScore >= 40
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-red-100 text-red-700";
                            return (
                              <div
                                key={post.id}
                                className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <span className="text-xs text-gray-400 w-5 shrink-0">
                                    {i + 1}
                                  </span>
                                  <span className="text-sm truncate">
                                    {post.title}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                  <span
                                    className={`px-1.5 py-0.5 text-xs rounded font-medium ${scoreColor}`}
                                  >
                                    {post.seoScore}
                                  </span>
                                  <span className="text-xs text-gray-400">
                                    {new Date(
                                      post.publishedAt,
                                    ).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <Pencil className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="font-semibold text-gray-700">
                      No published content found
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Publish blog posts to see their SEO status and search
                      performance here
                    </p>
                  </div>
                )}
              </>
            )}

            {/* === PIPELINE TAB === */}
            {activeTab === "pipeline" && (
              <>
                {contentLoading ? (
                  <div className="flex flex-col items-center py-16">
                    <RefreshCw className="h-8 w-8 text-blue-500 animate-spin mb-3" />
                    <p className="text-gray-500 text-sm">
                      Loading pipeline data...
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Pipeline Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                      <StatCard
                        title="Scheduled"
                        value={String(
                          contentReport?.summary?.totalScheduled || 0,
                        )}
                        icon={CalendarClock}
                        color="blue"
                      />
                      <StatCard
                        title="In Pipeline"
                        value={String(
                          contentReport?.summary?.totalInPipeline || 0,
                        )}
                        icon={Layers}
                        color="purple"
                      />
                      <StatCard
                        title="Published"
                        value={String(
                          contentReport?.summary?.totalPublished || 0,
                        )}
                        icon={CheckCircle}
                        color="green"
                      />
                    </div>

                    {/* Scheduled Content */}
                    {contentReport?.scheduled &&
                    contentReport.scheduled.length > 0 ? (
                      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
                        <div className="p-4 border-b border-gray-100">
                          <SectionHeader
                            title="Scheduled Content"
                            icon={CalendarClock}
                            badge={`${contentReport.scheduled.length} items`}
                          />
                        </div>
                        <div className="divide-y divide-gray-50">
                          {contentReport.scheduled.map((item, i) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <CalendarClock className="h-4 w-4 text-blue-500 shrink-0" />
                                <div className="min-w-0">
                                  <div className="text-sm font-medium truncate">
                                    {item.title}
                                  </div>
                                  <div className="text-xs text-gray-500 flex items-center gap-2">
                                    <span className="capitalize">
                                      {item.type.replace("_", " ")}
                                    </span>
                                    <span>{item.language.toUpperCase()}</span>
                                    {item.category && (
                                      <span>{item.category}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right shrink-0 ml-2">
                                <div
                                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                    item.status === "scheduled"
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-gray-100 text-gray-600"
                                  }`}
                                >
                                  {item.status}
                                </div>
                                {item.scheduledFor && (
                                  <div className="text-xs text-gray-400 mt-0.5">
                                    {new Date(
                                      item.scheduledFor,
                                    ).toLocaleDateString()}{" "}
                                    {new Date(
                                      item.scheduledFor,
                                    ).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center mb-6">
                        <CalendarClock className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                        <h3 className="font-medium text-gray-600 text-sm">
                          No scheduled content
                        </h3>
                        <p className="text-xs text-gray-400 mt-1">
                          Schedule content from the content pipeline to see it
                          here
                        </p>
                      </div>
                    )}

                    {/* Topic Proposals Pipeline */}
                    {contentReport?.pipeline &&
                    contentReport.pipeline.length > 0 ? (
                      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-100">
                          <SectionHeader
                            title="Topic Pipeline"
                            icon={Lightbulb}
                            badge={`${contentReport.pipeline.length} topics`}
                          />
                        </div>
                        <div className="divide-y divide-gray-50">
                          {contentReport.pipeline.map((topic, i) => {
                            const statusColors: Record<string, string> = {
                              planned: "bg-gray-100 text-gray-600",
                              queued: "bg-blue-100 text-blue-700",
                              generated: "bg-purple-100 text-purple-700",
                              drafted: "bg-amber-100 text-amber-700",
                              ready: "bg-green-100 text-green-700",
                            };
                            return (
                              <div
                                key={topic.id}
                                className="px-4 py-3 hover:bg-gray-50"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h4 className="text-sm font-medium">
                                        {topic.title}
                                      </h4>
                                      <span
                                        className={`px-2 py-0.5 text-xs rounded-full font-medium ${statusColors[topic.status] || "bg-gray-100 text-gray-600"}`}
                                      >
                                        {topic.status}
                                      </span>
                                      {topic.evergreen && (
                                        <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-50 text-emerald-600">
                                          evergreen
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-3 flex-wrap">
                                      {topic.keyword && (
                                        <span className="flex items-center gap-1">
                                          <Search className="h-3 w-3" />{" "}
                                          {topic.keyword}
                                        </span>
                                      )}
                                      {topic.pageType && (
                                        <span className="capitalize">
                                          {topic.pageType}
                                        </span>
                                      )}
                                      {topic.intent && (
                                        <span>{topic.intent}</span>
                                      )}
                                      <span>{topic.locale?.toUpperCase()}</span>
                                      {topic.confidence != null && (
                                        <span
                                          className={
                                            topic.confidence >= 0.7
                                              ? "text-green-600"
                                              : "text-amber-600"
                                          }
                                        >
                                          {Math.round(topic.confidence * 100)}%
                                          confidence
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  {topic.targetDate && (
                                    <div className="text-xs text-gray-400 shrink-0">
                                      Target:{" "}
                                      {new Date(
                                        topic.targetDate,
                                      ).toLocaleDateString()}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                        <Lightbulb className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                        <h3 className="font-medium text-gray-600 text-sm">
                          No topics in pipeline
                        </h3>
                        <p className="text-xs text-gray-400 mt-1">
                          Create topic proposals to build your content pipeline
                        </p>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* === KEYWORDS TAB === */}
            {activeTab === "keywords" && (
              <>
                {gsc?.summary && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <StatCard
                      title="Total Clicks"
                      value={formatNumber(gsc.summary.totalClicks)}
                      icon={MousePointerClick}
                      color="blue"
                    />
                    <StatCard
                      title="Impressions"
                      value={formatNumber(gsc.summary.totalImpressions)}
                      icon={Eye}
                      color="purple"
                    />
                    <StatCard
                      title="Avg CTR"
                      value={`${gsc.summary.avgCTR}%`}
                      icon={Target}
                      color="green"
                    />
                    <StatCard
                      title="Avg Position"
                      value={gsc.summary.avgPosition.toFixed(1)}
                      icon={TrendingUp}
                      color="amber"
                    />
                  </div>
                )}

                {gsc?.topQueries && gsc.topQueries.length > 0 ? (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-100">
                      <SectionHeader
                        title="Top Search Queries"
                        icon={Search}
                        badge="Live GSC Data"
                      />
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                              #
                            </th>
                            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                              Query
                            </th>
                            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">
                              Clicks
                            </th>
                            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">
                              Impressions
                            </th>
                            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">
                              CTR
                            </th>
                            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">
                              Position
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {gsc.topQueries.map((q, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-400">
                                {i + 1}
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-sm font-medium">
                                  {q.query}
                                </div>
                              </td>
                              <td className="text-right px-4 py-3 text-sm font-medium">
                                {formatNumber(q.clicks)}
                              </td>
                              <td className="text-right px-4 py-3 text-sm text-gray-600">
                                {formatNumber(q.impressions)}
                              </td>
                              <td className="text-right px-4 py-3">
                                <span
                                  className={`text-sm font-medium ${q.ctr > 5 ? "text-green-600" : q.ctr > 2 ? "text-amber-600" : "text-red-600"}`}
                                >
                                  {q.ctr}%
                                </span>
                              </td>
                              <td className="text-right px-4 py-3">
                                <span
                                  className={`text-sm font-medium ${q.position <= 3 ? "text-green-600" : q.position <= 10 ? "text-amber-600" : "text-red-600"}`}
                                >
                                  {q.position}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <Search className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="font-semibold text-gray-700">
                      No keyword data available
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Connect Google Search Console to see your search queries
                    </p>
                  </div>
                )}
              </>
            )}

            {/* === PAGES TAB === */}
            {activeTab === "pages" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Pages from GA4 */}
                {ga4?.topPages && ga4.topPages.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-100">
                      <SectionHeader
                        title="Top Pages (GA4)"
                        icon={Eye}
                        badge="Traffic"
                      />
                    </div>
                    <div className="divide-y divide-gray-50">
                      {ga4.topPages.slice(0, 15).map((p, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-sm text-gray-400 w-6 shrink-0">
                              {i + 1}
                            </span>
                            <span className="text-sm font-medium truncate">
                              {p.path}
                            </span>
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <div className="text-sm font-medium">
                              {formatNumber(p.pageViews)} views
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatDuration(p.avgEngagementTime)} avg
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Top Pages from GSC */}
                {gsc?.topPages && gsc.topPages.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-100">
                      <SectionHeader
                        title="Top Pages (Search)"
                        icon={Search}
                        badge="GSC"
                      />
                    </div>
                    <div className="divide-y divide-gray-50">
                      {gsc.topPages.slice(0, 15).map((p, i) => {
                        const path = p.page.replace(/^https?:\/\/[^/]+/, "");
                        return (
                          <div
                            key={i}
                            className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="text-sm text-gray-400 w-6 shrink-0">
                                {i + 1}
                              </span>
                              <span className="text-sm font-medium truncate">
                                {path || "/"}
                              </span>
                            </div>
                            <div className="text-right shrink-0 ml-2">
                              <div className="text-sm font-medium">
                                {formatNumber(p.clicks)} clicks
                              </div>
                              <div className="text-xs text-gray-500">
                                pos {p.position} / {p.ctr}% CTR
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {!ga4?.topPages?.length && !gsc?.topPages?.length && (
                  <div className="bg-white rounded-xl border border-gray-200 p-12 text-center col-span-2">
                    <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="font-semibold text-gray-700">
                      No page data available
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Connect GA4 and GSC to see page performance
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* === INDEXING TAB === */}
            {activeTab === "indexing" && (
              <>
                {report.indexing && report.indexing.status === "checked" ? (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <StatCard
                        title="Total URLs"
                        value={formatNumber(report.indexing.totalUrls || 0)}
                        icon={Globe}
                        color="blue"
                      />
                      <StatCard
                        title="Sampled"
                        value={String(report.indexing.sampled || 0)}
                        icon={Search}
                        color="purple"
                      />
                      <StatCard
                        title="Indexed"
                        value={String(report.indexing.indexedCount || 0)}
                        icon={CheckCircle}
                        color="green"
                      />
                      <StatCard
                        title="Not Indexed"
                        value={String(report.indexing.notIndexedCount || 0)}
                        icon={XCircle}
                        color="rose"
                      />
                    </div>

                    {report.indexing.results &&
                      report.indexing.results.length > 0 && (
                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                          <div className="p-4 border-b border-gray-100">
                            <SectionHeader
                              title="Indexing Status (Sample)"
                              icon={Shield}
                            />
                          </div>
                          <div className="divide-y divide-gray-50">
                            {report.indexing.results.map((r, i) => {
                              const isIndexed =
                                r.coverageState === "Submitted and indexed";
                              return (
                                <div
                                  key={i}
                                  className="flex items-center justify-between px-4 py-3"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    {isIndexed ? (
                                      <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                                    ) : (
                                      <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                                    )}
                                    <div className="min-w-0">
                                      <div className="text-sm font-medium truncate">
                                        {r.url.replace(/^https?:\/\/[^/]+/, "")}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {r.coverageState || "Unknown"}
                                      </div>
                                    </div>
                                  </div>
                                  {r.lastCrawlTime && (
                                    <div className="text-xs text-gray-400 shrink-0 ml-2">
                                      Crawled:{" "}
                                      {new Date(
                                        r.lastCrawlTime,
                                      ).toLocaleDateString()}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                  </>
                ) : (
                  <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <Globe className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="font-semibold text-gray-700">
                      Indexing check unavailable
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {report.indexing?.status === "skipped"
                        ? "GSC credentials not configured"
                        : "Could not check indexing status"}
                    </p>
                  </div>
                )}
              </>
            )}

            {/* === FIX & IMPROVE PLAN TAB === */}
            {activeTab === "plan" && (
              <>
                {/* Issues */}
                {report.issues.length > 0 && (
                  <div className="mb-8">
                    <SectionHeader
                      title={`${report.issues.length} Issues to Fix`}
                      icon={AlertTriangle}
                    />
                    <div className="space-y-3">
                      {report.issues.map((issue, i) => (
                        <div
                          key={i}
                          className={`bg-white rounded-xl border p-4 ${severityColor(issue.severity)}`}
                        >
                          <div className="flex items-start gap-3">
                            {severityIcon(issue.severity)}
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm">
                                  {issue.title}
                                </span>
                                <span
                                  className={`px-2 py-0.5 text-xs rounded-full font-medium uppercase ${
                                    issue.severity === "high"
                                      ? "bg-red-200 text-red-800"
                                      : issue.severity === "medium"
                                        ? "bg-amber-200 text-amber-800"
                                        : "bg-blue-200 text-blue-800"
                                  }`}
                                >
                                  {issue.severity}
                                </span>
                              </div>
                              <p className="text-sm mt-1 opacity-80">
                                {issue.description}
                              </p>
                              {issue.autoFixable && (
                                <span className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                                  <Zap className="h-3 w-3" /> Agents can
                                  auto-fix this
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                <SectionHeader
                  title={`${report.recommendations.length} Improvement Recommendations`}
                  icon={TrendingUp}
                />
                <div className="space-y-4">
                  {report.recommendations.map((rec, i) => (
                    <div
                      key={i}
                      className="bg-white rounded-xl border border-gray-200 p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`p-2 rounded-lg shrink-0 ${
                            rec.priority === "high"
                              ? "bg-red-100"
                              : rec.priority === "medium"
                                ? "bg-amber-100"
                                : "bg-blue-100"
                          }`}
                        >
                          <ArrowUpRight
                            className={`h-4 w-4 ${
                              rec.priority === "high"
                                ? "text-red-600"
                                : rec.priority === "medium"
                                  ? "text-amber-600"
                                  : "text-blue-600"
                            }`}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">
                              {rec.title}
                            </span>
                            <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                              {rec.category}
                            </span>
                            {rec.autoFixable && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                                <Zap className="h-3 w-3" /> Auto-fixable
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {rec.description}
                          </p>

                          {/* Detailed items */}
                          {rec.items && rec.items.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {rec.items
                                .slice(0, 5)
                                .map((item: any, j: number) => (
                                  <div
                                    key={j}
                                    className="flex items-center gap-2 text-xs bg-gray-50 p-2 rounded-lg"
                                  >
                                    <Target className="h-3 w-3 text-gray-400 shrink-0" />
                                    <span className="text-gray-700">
                                      {item.action || item.query || item.page}
                                    </span>
                                  </div>
                                ))}
                              {rec.items.length > 5 && (
                                <div className="text-xs text-gray-400 pl-5">
                                  +{rec.items.length - 5} more items
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {report.recommendations.length === 0 &&
                  report.issues.length === 0 && (
                    <div className="bg-green-50 rounded-xl border border-green-200 p-12 text-center">
                      <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                      <h3 className="font-semibold text-green-800">
                        Everything looks great!
                      </h3>
                      <p className="text-sm text-green-600 mt-1">
                        No issues or recommendations at this time
                      </p>
                    </div>
                  )}
              </>
            )}

            {/* ========== INDEX & SUBMIT TAB ========== */}
            {activeTab === "submit" && (
              <>
                {/* Quick Submit: New Articles */}
                <div className="mb-6">
                  <SectionHeader
                    title="Submit New Articles to Google & Bing"
                    icon={Send}
                  />
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <p className="text-sm text-gray-600 mb-4">
                      Submit your latest articles to Google (IndexNow) and Bing
                      for faster indexing. New content typically takes 2-7 days
                      to appear in search results after submission.
                    </p>

                    {/* Quick action buttons */}
                    <div className="flex flex-wrap gap-3 mb-6">
                      <button
                        onClick={() => {
                          loadIndexableUrls();
                          submitUrlsForIndexing([], "new");
                        }}
                        disabled={isSubmitting}
                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                      >
                        {isSubmitting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        Submit New URLs
                      </button>
                      <button
                        onClick={() => submitUrlsForIndexing([], "all")}
                        disabled={isSubmitting}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 text-sm font-medium"
                      >
                        {isSubmitting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RotateCw className="h-4 w-4" />
                        )}
                        Re-submit All URLs
                      </button>
                      <button
                        onClick={() => submitUrlsForIndexing([], "updated")}
                        disabled={isSubmitting}
                        className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 text-sm font-medium"
                      >
                        {isSubmitting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                        Submit Updated Only
                      </button>
                    </div>

                    {/* Custom URLs */}
                    <div className="border-t pt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Or submit specific URLs (one per line):
                      </label>
                      <textarea
                        value={customUrls}
                        onChange={(e) => setCustomUrls(e.target.value)}
                        placeholder={`https://www.yalla-london.com/blog/spring-london-2026-best-things-to-do-arab-visitors\nhttps://www.yalla-london.com/blog/best-luxury-spas-london-2026-women-friendly-halal`}
                        rows={4}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        onClick={() => {
                          const urls = customUrls
                            .split("\n")
                            .map((u) => u.trim())
                            .filter((u) => u.startsWith("http"));
                          if (urls.length > 0) {
                            submitUrlsForIndexing(urls);
                          }
                        }}
                        disabled={isSubmitting || !customUrls.trim()}
                        className="mt-2 flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
                      >
                        <Send className="h-4 w-4" />
                        Submit Custom URLs
                      </button>
                    </div>

                    {/* Submit Result */}
                    {submitResult && (
                      <div
                        className={`mt-4 p-4 rounded-lg border ${submitResult.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {submitResult.success ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                          <span
                            className={`font-semibold text-sm ${submitResult.success ? "text-green-800" : "text-red-800"}`}
                          >
                            {submitResult.success
                              ? "Submission Successful"
                              : "Submission Failed"}
                          </span>
                        </div>
                        {submitResult.urlsProcessed && (
                          <p className="text-sm text-gray-700">
                            {submitResult.urlsProcessed} URLs submitted to
                            IndexNow (Google & Bing)
                          </p>
                        )}
                        {submitResult.report && (
                          <div className="text-sm text-gray-700 mt-1">
                            <p>
                              Submitted:{" "}
                              {submitResult.report.submitted?.length || 0} URLs
                            </p>
                            {submitResult.report.errors?.length > 0 && (
                              <p className="text-red-600">
                                Errors: {submitResult.report.errors.length}
                              </p>
                            )}
                          </div>
                        )}
                        {submitResult.error && (
                          <p className="text-sm text-red-600">
                            {submitResult.error}
                          </p>
                        )}
                        {submitResult.timestamp && (
                          <p className="text-xs text-gray-400 mt-2">
                            {new Date(submitResult.timestamp).toLocaleString()}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Check Indexing Status */}
                <div className="mb-6">
                  <SectionHeader title="Check Indexing Status" icon={Globe} />
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <p className="text-sm text-gray-600 mb-4">
                      Check whether Google has indexed your pages. Uses the
                      Google Search Console URL Inspection API.
                    </p>

                    {/* New articles quick check */}
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">
                        New Articles (click to check):
                      </h4>
                      <div className="space-y-2">
                        {[
                          "spring-london-2026-best-things-to-do-arab-visitors",
                          "best-luxury-spas-london-2026-women-friendly-halal",
                          "kensington-chelsea-arab-guide-2026-hotels-restaurants-shopping",
                          "london-with-kids-2026-activities-arab-families",
                        ].map((slug) => {
                          const url = `https://www.yalla-london.com/blog/${slug}`;
                          const status = statusChecks[url];
                          return (
                            <div
                              key={slug}
                              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                            >
                              <button
                                onClick={() => checkUrlStatus(url)}
                                disabled={status?.loading}
                                className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50 text-xs font-medium shrink-0"
                              >
                                {status?.loading ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Search className="h-3 w-3" />
                                )}
                                Check
                              </button>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-700 truncate">
                                  /blog/{slug}
                                </p>
                                {status?.data && (
                                  <div className="flex items-center gap-2 mt-1">
                                    {status.data.verdict === "PASS" ||
                                    status.data.coverageState?.includes(
                                      "Submitted and indexed",
                                    ) ? (
                                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                                        <Check className="h-3 w-3" /> Indexed
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                                        <Clock className="h-3 w-3" />{" "}
                                        {status.data.coverageState ||
                                          status.data.indexingState ||
                                          "Not indexed yet"}
                                      </span>
                                    )}
                                    {status.data.lastCrawlTime && (
                                      <span className="text-xs text-gray-400">
                                        Last crawl:{" "}
                                        {new Date(
                                          status.data.lastCrawlTime,
                                        ).toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                )}
                                {status?.error && (
                                  <p className="text-xs text-red-500 mt-1">
                                    {status.error}
                                  </p>
                                )}
                                {status &&
                                  !status.loading &&
                                  !status.data &&
                                  !status.error && (
                                    <p className="text-xs text-gray-400 mt-1">
                                      GSC API not configured or URL not found
                                    </p>
                                  )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Check all button */}
                    <button
                      onClick={() => {
                        [
                          "spring-london-2026-best-things-to-do-arab-visitors",
                          "best-luxury-spas-london-2026-women-friendly-halal",
                          "kensington-chelsea-arab-guide-2026-hotels-restaurants-shopping",
                          "london-with-kids-2026-activities-arab-families",
                        ].forEach((slug) => {
                          checkUrlStatus(
                            `https://www.yalla-london.com/blog/${slug}`,
                          );
                        });
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
                    >
                      <Search className="h-4 w-4" />
                      Check All New Articles
                    </button>
                  </div>
                </div>

                {/* Indexable URLs Overview */}
                <div>
                  <SectionHeader
                    title="Indexable URLs Overview"
                    icon={FileText}
                  />
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    {!indexableUrls ? (
                      <button
                        onClick={loadIndexableUrls}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Load URL Inventory
                      </button>
                    ) : (
                      <>
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div className="bg-blue-50 rounded-lg p-4 text-center">
                            <div className="text-2xl font-bold text-blue-700">
                              {indexableUrls.counts?.total || 0}
                            </div>
                            <div className="text-xs text-blue-600">
                              Total URLs
                            </div>
                          </div>
                          <div className="bg-green-50 rounded-lg p-4 text-center">
                            <div className="text-2xl font-bold text-green-700">
                              {indexableUrls.counts?.new || 0}
                            </div>
                            <div className="text-xs text-green-600">
                              New URLs
                            </div>
                          </div>
                          <div className="bg-amber-50 rounded-lg p-4 text-center">
                            <div className="text-2xl font-bold text-amber-700">
                              {indexableUrls.counts?.updated || 0}
                            </div>
                            <div className="text-xs text-amber-600">
                              Updated URLs
                            </div>
                          </div>
                        </div>
                        {indexableUrls.urls?.all && (
                          <div className="max-h-64 overflow-y-auto">
                            <table className="w-full text-xs">
                              <thead className="sticky top-0 bg-white">
                                <tr className="border-b">
                                  <th className="text-left py-2 px-2 text-gray-500">
                                    URL
                                  </th>
                                  <th className="text-right py-2 px-2 text-gray-500">
                                    Action
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {indexableUrls.urls.all.map(
                                  (url: string, i: number) => (
                                    <tr
                                      key={i}
                                      className="border-b border-gray-100"
                                    >
                                      <td className="py-2 px-2 text-gray-700 truncate max-w-[300px]">
                                        {url.replace(
                                          "https://www.yalla-london.com",
                                          "",
                                        )}
                                      </td>
                                      <td className="py-2 px-2 text-right">
                                        <button
                                          onClick={() => checkUrlStatus(url)}
                                          className="text-blue-600 hover:text-blue-800"
                                        >
                                          {statusChecks[url]?.loading ? (
                                            <Loader2 className="h-3 w-3 animate-spin inline" />
                                          ) : (
                                            "Check"
                                          )}
                                        </button>
                                      </td>
                                    </tr>
                                  ),
                                )}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
