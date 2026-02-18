"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Send,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Zap,
  Shield,
  FileWarning,
  Activity,
  Globe,
  Settings,
  BarChart3,
  Loader2,
} from "lucide-react";

interface ArticleIndexing {
  id: string;
  title: string;
  slug: string;
  url: string;
  publishedAt: string | null;
  seoScore: number;
  wordCount: number;
  indexingStatus: "indexed" | "submitted" | "not_indexed" | "error" | "never_submitted";
  submittedAt: string | null;
  lastCrawledAt: string | null;
  lastInspectedAt: string | null;
  coverageState: string | null;
  submittedIndexnow: boolean;
  submittedSitemap: boolean;
  submissionAttempts: number;
  notIndexedReasons: string[];
  fixAction: string | null;
}

interface SystemIssue {
  severity: "critical" | "warning" | "info";
  category: string;
  message: string;
  detail: string;
  fixAction?: string;
}

interface IndexingActivity {
  jobName: string;
  status: string;
  startedAt: string;
  durationMs: number;
  itemsProcessed: number;
  itemsSucceeded: number;
  errorMessage: string | null;
}

interface HealthDiagnosis {
  status: "healthy" | "warning" | "critical" | "not_started";
  message: string;
  detail: string;
  indexingRate: number;
}

interface IndexingData {
  success: boolean;
  siteId: string;
  config: {
    hasIndexNowKey: boolean;
    hasGscCredentials: boolean;
    gscSiteUrl: string;
  };
  summary: {
    total: number;
    indexed: number;
    submitted: number;
    notIndexed: number;
    neverSubmitted: number;
    errors: number;
  };
  healthDiagnosis?: HealthDiagnosis;
  recentActivity?: IndexingActivity[];
  articles: ArticleIndexing[];
  systemIssues: SystemIssue[];
}

export default function ContentIndexingTab() {
  const [data, setData] = useState<IndexingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedArticles, setExpandedArticles] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<string | null>(null);
  const [submittingSlugs, setSubmittingSlugs] = useState<Set<string>>(new Set());
  const [showIssues, setShowIssues] = useState(true);
  const [auditRunning, setAuditRunning] = useState(false);
  const [auditResult, setAuditResult] = useState<{
    totalPosts: number; passing: number; failing: number;
    averageScore: number; totalAutoFixes: number;
    posts: Array<{ slug: string; score: number; issues: string[]; fixes: string[] }>;
  } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/content-indexing");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to load");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load indexing data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const submitArticle = async (slug: string) => {
    setSubmittingSlugs((prev) => new Set(prev).add(slug));
    try {
      const res = await fetch("/api/admin/content-indexing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit", slugs: [slug] }),
      });
      const json = await res.json();
      if (json.success) {
        setSubmitResult(`Submitted "${slug}" — IndexNow: ${json.indexNow?.message || "N/A"}`);
        await loadData();
      } else {
        setSubmitResult(`Failed: ${json.error}`);
      }
    } catch (e) {
      setSubmitResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSubmittingSlugs((prev) => {
        const next = new Set(prev);
        next.delete(slug);
        return next;
      });
    }
  };

  const submitAll = async () => {
    setSubmitting(true);
    setSubmitResult(null);
    try {
      const res = await fetch("/api/admin/content-indexing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit_all" }),
      });
      const json = await res.json();
      if (json.success) {
        setSubmitResult(
          `Submitted ${json.submitted} articles — IndexNow: ${json.indexNow?.success ? "OK" : json.indexNow?.message} | GSC: ${json.gsc?.message}`
        );
        await loadData();
      } else {
        setSubmitResult(`Failed: ${json.error}`);
      }
    } catch (e) {
      setSubmitResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSubmitting(false);
    }
  };

  const runComplianceAudit = async () => {
    setAuditRunning(true);
    setAuditResult(null);
    try {
      const res = await fetch("/api/admin/content-indexing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "compliance_audit" }),
      });
      const json = await res.json();
      if (json.success) {
        setAuditResult(json.summary);
        setSubmitResult(
          `Compliance audit complete: ${json.summary.passing} passing, ${json.summary.failing} failing (avg score: ${json.summary.averageScore}). ${json.summary.totalAutoFixes} auto-fixes applied.`
        );
        await loadData();
      } else {
        setSubmitResult(`Audit failed: ${json.error}`);
      }
    } catch (e) {
      setSubmitResult(`Audit error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setAuditRunning(false);
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedArticles((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "indexed":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "submitted":
        return <Clock className="h-5 w-5 text-blue-500" />;
      case "not_indexed":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "error":
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case "never_submitted":
        return <FileWarning className="h-5 w-5 text-gray-400" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "indexed":
        return "Indexed";
      case "submitted":
        return "Submitted";
      case "not_indexed":
        return "Not Indexed";
      case "error":
        return "Error";
      case "never_submitted":
        return "Never Submitted";
      default:
        return status;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "indexed":
        return "bg-green-100 text-green-800 border-green-200";
      case "submitted":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "not_indexed":
        return "bg-red-100 text-red-800 border-red-200";
      case "error":
        return "bg-red-100 text-red-800 border-red-200";
      case "never_submitted":
        return "bg-gray-100 text-gray-600 border-gray-200";
      default:
        return "bg-gray-100 text-gray-600 border-gray-200";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />;
      case "info":
        return <Activity className="h-5 w-5 text-blue-500 flex-shrink-0" />;
      default:
        return <Activity className="h-5 w-5 text-gray-400 flex-shrink-0" />;
    }
  };

  const getSeverityBg = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-50 border-red-200";
      case "warning":
        return "bg-amber-50 border-amber-200";
      case "info":
        return "bg-blue-50 border-blue-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const timeAgo = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
        <span className="ml-3 text-gray-600">Loading indexing data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-800 font-medium">Failed to load indexing data</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
        <button
          onClick={loadData}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const filteredArticles = data.articles.filter((a) => {
    const matchesSearch =
      a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.slug.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || a.indexingStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const criticalIssues = data.systemIssues.filter((i) => i.severity === "critical");
  const warningIssues = data.systemIssues.filter((i) => i.severity === "warning");
  const infoIssues = data.systemIssues.filter((i) => i.severity === "info");

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <SummaryCard
          label="Total Published"
          value={data.summary.total}
          icon={<Globe className="h-5 w-5 text-gray-500" />}
          onClick={() => setStatusFilter("all")}
          active={statusFilter === "all"}
        />
        <SummaryCard
          label="Indexed"
          value={data.summary.indexed}
          icon={<CheckCircle className="h-5 w-5 text-green-500" />}
          color="green"
          onClick={() => setStatusFilter("indexed")}
          active={statusFilter === "indexed"}
        />
        <SummaryCard
          label="Submitted"
          value={data.summary.submitted}
          icon={<Send className="h-5 w-5 text-blue-500" />}
          color="blue"
          onClick={() => setStatusFilter("submitted")}
          active={statusFilter === "submitted"}
        />
        <SummaryCard
          label="Not Indexed"
          value={data.summary.notIndexed}
          icon={<XCircle className="h-5 w-5 text-red-500" />}
          color="red"
          onClick={() => setStatusFilter("not_indexed")}
          active={statusFilter === "not_indexed"}
        />
        <SummaryCard
          label="Never Submitted"
          value={data.summary.neverSubmitted}
          icon={<FileWarning className="h-5 w-5 text-gray-400" />}
          color="gray"
          onClick={() => setStatusFilter("never_submitted")}
          active={statusFilter === "never_submitted"}
        />
        <SummaryCard
          label="Errors"
          value={data.summary.errors}
          icon={<AlertTriangle className="h-5 w-5 text-red-600" />}
          color="red"
          onClick={() => setStatusFilter("error")}
          active={statusFilter === "error"}
        />
      </div>

      {/* Indexing Health Diagnosis — at-a-glance status */}
      {data.healthDiagnosis && (
        <div
          className={`rounded-lg border p-5 ${
            data.healthDiagnosis.status === "healthy"
              ? "bg-green-50 border-green-200"
              : data.healthDiagnosis.status === "warning"
              ? "bg-amber-50 border-amber-200"
              : data.healthDiagnosis.status === "critical"
              ? "bg-red-50 border-red-200"
              : "bg-gray-50 border-gray-200"
          }`}
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 mt-0.5">
              {data.healthDiagnosis.status === "healthy" ? (
                <CheckCircle className="h-7 w-7 text-green-500" />
              ) : data.healthDiagnosis.status === "warning" ? (
                <AlertTriangle className="h-7 w-7 text-amber-500" />
              ) : data.healthDiagnosis.status === "critical" ? (
                <XCircle className="h-7 w-7 text-red-500" />
              ) : (
                <Clock className="h-7 w-7 text-gray-400" />
              )}
            </div>
            <div className="flex-1">
              <h3
                className={`text-lg font-bold ${
                  data.healthDiagnosis.status === "healthy"
                    ? "text-green-800"
                    : data.healthDiagnosis.status === "warning"
                    ? "text-amber-800"
                    : data.healthDiagnosis.status === "critical"
                    ? "text-red-800"
                    : "text-gray-700"
                }`}
              >
                {data.healthDiagnosis.message}
              </h3>
              <p className="text-sm text-gray-600 mt-1">{data.healthDiagnosis.detail}</p>
              {data.healthDiagnosis.indexingRate > 0 && (
                <div className="mt-3">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                    <span>Indexing Rate</span>
                    <span className="font-bold text-gray-700">{data.healthDiagnosis.indexingRate}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full transition-all ${
                        data.healthDiagnosis.indexingRate >= 80
                          ? "bg-green-500"
                          : data.healthDiagnosis.indexingRate >= 40
                          ? "bg-amber-500"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${data.healthDiagnosis.indexingRate}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recent Indexing Activity */}
      {data.recentActivity && data.recentActivity.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              Recent Indexing Activity
            </h3>
          </div>
          <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
            {data.recentActivity.slice(0, 10).map((activity, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                {/* Status dot */}
                <span
                  className={`flex-shrink-0 h-2.5 w-2.5 rounded-full ${
                    activity.status === "completed"
                      ? "bg-green-500"
                      : activity.status === "failed"
                      ? "bg-red-500"
                      : "bg-amber-500"
                  }`}
                />
                {/* Job name */}
                <span className="font-medium text-gray-800 w-32 flex-shrink-0 truncate">
                  {activity.jobName}
                </span>
                {/* Items processed */}
                <span className="text-gray-500 text-xs w-28 flex-shrink-0">
                  {activity.itemsSucceeded > 0 ? (
                    <span className="text-green-600">{activity.itemsSucceeded} submitted</span>
                  ) : activity.status === "completed" ? (
                    <span className="text-gray-400">0 items</span>
                  ) : (
                    <span className="text-red-500">Failed</span>
                  )}
                </span>
                {/* Error message if any */}
                {activity.errorMessage && (
                  <span className="text-red-500 text-xs truncate flex-1" title={activity.errorMessage}>
                    {activity.errorMessage.substring(0, 80)}
                  </span>
                )}
                {/* Time */}
                <span className="text-gray-400 text-xs flex-shrink-0 ml-auto">
                  {timeAgo(activity.startedAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Config Status Banner */}
      {(!data.config.hasIndexNowKey || !data.config.hasGscCredentials) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Settings className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-red-800">Search engine credentials missing — articles cannot be indexed</p>
              <div className="mt-2 space-y-1 text-sm text-red-700">
                {!data.config.hasIndexNowKey && (
                  <p>
                    <span className="font-medium">INDEXNOW_KEY</span> — Required for Bing/Yandex submission.
                    Set this in your Vercel project environment variables.
                  </p>
                )}
                {!data.config.hasGscCredentials && (
                  <p>
                    <span className="font-medium">GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL + PRIVATE_KEY</span> — Required for Google indexing.
                    Set these in your Vercel project environment variables.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Bar */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search articles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            <button
              onClick={runComplianceAudit}
              disabled={auditRunning || data.summary.total === 0}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium whitespace-nowrap"
            >
              {auditRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Shield className="h-4 w-4" />
              )}
              SEO Compliance Audit
            </button>
            <button
              onClick={submitAll}
              disabled={submitting || data.summary.total === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium whitespace-nowrap"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              Submit All
            </button>
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
        {submitResult && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800">
            {submitResult}
          </div>
        )}
      </div>

      {/* Compliance Audit Results */}
      {auditResult && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-amber-50">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Shield className="h-4 w-4 text-amber-600" />
              SEO Compliance Audit Results
            </h3>
          </div>
          <div className="p-4 grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-800">{auditResult.totalPosts}</div>
              <div className="text-xs text-gray-500">Total</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-700">{auditResult.passing}</div>
              <div className="text-xs text-green-600">Passing</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-700">{auditResult.failing}</div>
              <div className="text-xs text-red-600">Failing</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-700">{auditResult.averageScore}</div>
              <div className="text-xs text-blue-600">Avg Score</div>
            </div>
            <div className="text-center p-3 bg-amber-50 rounded-lg">
              <div className="text-2xl font-bold text-amber-700">{auditResult.totalAutoFixes}</div>
              <div className="text-xs text-amber-600">Auto-Fixes</div>
            </div>
          </div>
        </div>
      )}

      {/* Articles Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-700">
            Published Articles ({filteredArticles.length})
          </h3>
        </div>

        {filteredArticles.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Globe className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="font-medium">No articles match your filter</p>
            <p className="text-sm mt-1">
              {data.summary.total === 0
                ? "No published articles yet — the content pipeline needs to produce and publish articles first."
                : "Try adjusting the search or status filter."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredArticles.map((article) => {
              const isExpanded = expandedArticles.has(article.id);
              const isSubmitting = submittingSlugs.has(article.slug);
              return (
                <div key={article.id} className="hover:bg-gray-50 transition-colors">
                  {/* Main Row */}
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                    onClick={() => toggleExpanded(article.id)}
                  >
                    {/* Status icon */}
                    <div className="flex-shrink-0">{getStatusIcon(article.indexingStatus)}</div>

                    {/* Article info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {article.title}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        /blog/{article.slug}
                      </p>
                    </div>

                    {/* Status badge */}
                    <div className="flex-shrink-0 hidden sm:block">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeClass(article.indexingStatus)}`}
                      >
                        {getStatusLabel(article.indexingStatus)}
                      </span>
                    </div>

                    {/* SEO score */}
                    <div className="flex-shrink-0 hidden md:block">
                      <span
                        className={`text-xs font-medium ${
                          article.seoScore >= 70
                            ? "text-green-600"
                            : article.seoScore >= 50
                            ? "text-amber-600"
                            : "text-red-600"
                        }`}
                      >
                        SEO {article.seoScore}
                      </span>
                    </div>

                    {/* Word count */}
                    <div className="flex-shrink-0 hidden md:block">
                      <span
                        className={`text-xs ${
                          article.wordCount >= 1200
                            ? "text-green-600"
                            : article.wordCount >= 300
                            ? "text-amber-600"
                            : "text-red-600"
                        }`}
                      >
                        {article.wordCount.toLocaleString()}w
                      </span>
                    </div>

                    {/* Submitted date */}
                    <div className="flex-shrink-0 hidden lg:block text-xs text-gray-500 w-20 text-right">
                      {article.submittedAt ? timeAgo(article.submittedAt) : "—"}
                    </div>

                    {/* Fix button */}
                    <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      {article.indexingStatus !== "indexed" && (
                        <button
                          onClick={() => submitArticle(article.slug)}
                          disabled={isSubmitting}
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 text-xs font-medium disabled:opacity-50"
                          title="Submit to search engines"
                        >
                          {isSubmitting ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Send className="h-3 w-3" />
                          )}
                          <span className="hidden sm:inline">
                            {article.indexingStatus === "never_submitted" ? "Submit" : "Resubmit"}
                          </span>
                        </button>
                      )}
                    </div>

                    {/* Expand toggle */}
                    <div className="flex-shrink-0">
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 ml-8 mr-4">
                      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                        {/* Quick stats row */}
                        <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                          <span>
                            <strong>Published:</strong>{" "}
                            {article.publishedAt
                              ? new Date(article.publishedAt).toLocaleDateString()
                              : "Unknown"}
                          </span>
                          <span>
                            <strong>Words:</strong> {article.wordCount.toLocaleString()}
                          </span>
                          <span>
                            <strong>SEO Score:</strong> {article.seoScore}/100
                          </span>
                          <span>
                            <strong>Submitted:</strong>{" "}
                            {article.submittedAt
                              ? new Date(article.submittedAt).toLocaleString()
                              : "Never"}
                          </span>
                          {article.lastCrawledAt && (
                            <span>
                              <strong>Last Crawled:</strong>{" "}
                              {new Date(article.lastCrawledAt).toLocaleString()}
                            </span>
                          )}
                          <span>
                            <strong>Attempts:</strong> {article.submissionAttempts}
                          </span>
                        </div>

                        {/* Submission channels */}
                        <div className="flex gap-3 text-xs">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded ${
                              article.submittedIndexnow
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {article.submittedIndexnow ? (
                              <CheckCircle className="h-3 w-3" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                            IndexNow
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded ${
                              article.submittedSitemap
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {article.submittedSitemap ? (
                              <CheckCircle className="h-3 w-3" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                            GSC Sitemap
                          </span>
                          {article.coverageState && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-100 text-gray-600">
                              <Shield className="h-3 w-3" />
                              {article.coverageState}
                            </span>
                          )}
                        </div>

                        {/* Reasons for not being indexed */}
                        {article.notIndexedReasons.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-700 mb-1.5">
                              {article.indexingStatus === "indexed"
                                ? "Notes:"
                                : "Why not indexed:"}
                            </p>
                            <ul className="space-y-1">
                              {article.notIndexedReasons.map((reason, i) => (
                                <li
                                  key={i}
                                  className="flex items-start gap-2 text-xs text-gray-600"
                                >
                                  <span className="text-amber-500 mt-0.5">&#x2022;</span>
                                  {reason}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 pt-1">
                          <a
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-xs"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View Article
                          </a>
                          <a
                            href={`/admin/editor?slug=${article.slug}`}
                            className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-xs"
                          >
                            <BarChart3 className="h-3 w-3" />
                            Edit / Fix SEO
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* System Indexing Issues */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <button
          onClick={() => setShowIssues(!showIssues)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-gray-600" />
            <h3 className="text-sm font-semibold text-gray-700">
              Indexing Issues & Diagnostics
            </h3>
            {criticalIssues.length > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                {criticalIssues.length} critical
              </span>
            )}
            {warningIssues.length > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                {warningIssues.length} warning{warningIssues.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
          {showIssues ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </button>

        {showIssues && (
          <div className="p-4 space-y-3">
            {data.systemIssues.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
                <p className="font-medium">No indexing issues detected</p>
                <p className="text-sm mt-1">All systems are configured and running correctly.</p>
              </div>
            ) : (
              <>
                {/* Critical issues first */}
                {criticalIssues.length > 0 && (
                  <div className="space-y-2">
                    {criticalIssues.map((issue, i) => (
                      <IssueCard key={`critical-${i}`} issue={issue} />
                    ))}
                  </div>
                )}

                {/* Warnings */}
                {warningIssues.length > 0 && (
                  <div className="space-y-2">
                    {warningIssues.map((issue, i) => (
                      <IssueCard key={`warning-${i}`} issue={issue} />
                    ))}
                  </div>
                )}

                {/* Info */}
                {infoIssues.length > 0 && (
                  <div className="space-y-2">
                    {infoIssues.map((issue, i) => (
                      <IssueCard key={`info-${i}`} issue={issue} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  icon,
  color,
  onClick,
  active,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color?: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left w-full ${
        active
          ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
          : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
      }`}
    >
      {icon}
      <div>
        <p className="text-xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </button>
  );
}

function IssueCard({ issue }: { issue: SystemIssue }) {
  const getSeverityBg = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-50 border-red-200";
      case "warning":
        return "bg-amber-50 border-amber-200";
      case "info":
        return "bg-blue-50 border-blue-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />;
      case "info":
        return <Activity className="h-5 w-5 text-blue-500 flex-shrink-0" />;
      default:
        return <Activity className="h-5 w-5 text-gray-400 flex-shrink-0" />;
    }
  };

  return (
    <div className={`rounded-lg border p-3 ${getSeverityBg(issue.severity)}`}>
      <div className="flex items-start gap-3">
        {getSeverityIcon(issue.severity)}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-900">{issue.message}</p>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-white bg-opacity-60 text-gray-600">
              {issue.category}
            </span>
          </div>
          <p className="text-xs text-gray-600 mt-1">{issue.detail}</p>
          {issue.fixAction && (
            <p className="text-xs font-medium text-blue-700 mt-2">
              Fix: {issue.fixAction}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
