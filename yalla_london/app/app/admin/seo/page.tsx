"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Search,
  AlertTriangle,
  CheckCircle,
  Clock,
  Globe,
  Zap,
  RefreshCw,
  ExternalLink,
  FileText,
  ChevronDown,
  XCircle,
  Loader2,
  Send,
  Activity,
  AlertCircle,
  Shield,
  Eye,
  Info,
  History,
  Settings,
  Play,
  Filter,
  BarChart3,
  ArrowUpRight,
  Radio,
  Database,
} from "lucide-react";
import { toast } from "sonner";

// ── Types ──

interface IndexingArticle {
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

interface IndexingData {
  success: boolean;
  siteId: string;
  baseUrl: string;
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
  healthDiagnosis: {
    status: "healthy" | "warning" | "critical" | "not_started";
    message: string;
    detail: string;
    indexingRate: number;
  };
  recentActivity: Array<{
    jobName: string;
    status: string;
    startedAt: string;
    durationMs: number;
    itemsProcessed: number;
    itemsSucceeded: number;
    errorMessage: string | null;
  }>;
  articles: IndexingArticle[];
  systemIssues: Array<{
    severity: "critical" | "warning" | "info";
    category: string;
    message: string;
    detail: string;
    fixAction?: string;
  }>;
}

interface IndexingStats {
  totalReports: number;
  totalSubmissions: number;
  totalAudits: number;
  totalGoogleSubmitted: number;
  totalIndexNowSubmitted: number;
  lastSubmission: string | null;
  lastSuccessfulSubmission: string | null;
  latestSnapshot: {
    totalPages: number;
    inspected: number;
    indexed: number;
    notIndexed: number;
    date: string;
  } | null;
  latestSubmissionResult: {
    indexNow: { submitted: number; status: string };
    googleApi: { submitted: number; failed: number; errors: string[]; status: string };
  } | null;
  timeline: {
    date: string;
    mode: string;
    totalPages: number;
    googleSubmitted: number;
    googleStatus: string;
    indexNowSubmitted: number;
    indexNowStatus: string;
  }[];
}

interface IndexingReport {
  id: string;
  type: string;
  date: string;
  data: {
    mode: string;
    siteId?: string;
    totalPages: number;
    inspected?: number;
    indexed?: number;
    notIndexed?: number;
    indexedPages?: string[];
    notIndexedPages?: { url: string; label: string; reason: string }[];
    submission?: {
      indexNow: { submitted: number; status: string };
      googleApi: { submitted: number; failed: number; errors: string[]; status: string };
    };
    errors?: string[];
    elapsed?: string;
  };
}

interface AuditResult {
  totalPosts: number;
  passing: number;
  failing: number;
  averageScore: number;
  totalAutoFixes: number;
  posts: Array<{
    slug: string;
    score: number;
    issues: string[];
    fixes: string[];
  }>;
}

interface InspectionResult {
  success: boolean;
  mode: string;
  summary: {
    totalPages: number;
    inspected: number;
    indexed: number;
    notIndexed: number;
    gscApiAvailable: boolean;
  };
  indexedPages: string[];
  notIndexedPages: { url: string; label: string; reason: string }[];
  submission: any;
  elapsed: string;
}

// ── Helpers ──

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

const getScoreColor = (s: number) =>
  s >= 90 ? "text-emerald-600" : s >= 70 ? "text-yellow-600" : "text-red-600";

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  indexed: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Indexed" },
  submitted: { bg: "bg-blue-100", text: "text-blue-700", label: "Submitted" },
  not_indexed: { bg: "bg-red-100", text: "text-red-700", label: "Not Indexed" },
  error: { bg: "bg-red-100", text: "text-red-700", label: "Error" },
  never_submitted: { bg: "bg-gray-100", text: "text-gray-600", label: "Never Submitted" },
  discovered: { bg: "bg-purple-100", text: "text-purple-700", label: "Discovered" },
  pending: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Pending" },
};

const HEALTH_STYLES: Record<string, { bg: string; border: string; icon: string; text: string }> = {
  healthy: { bg: "bg-emerald-50", border: "border-emerald-300", icon: "text-emerald-500", text: "text-emerald-800" },
  warning: { bg: "bg-amber-50", border: "border-amber-300", icon: "text-amber-500", text: "text-amber-800" },
  critical: { bg: "bg-red-50", border: "border-red-300", icon: "text-red-500", text: "text-red-800" },
  not_started: { bg: "bg-gray-50", border: "border-gray-300", icon: "text-gray-400", text: "text-gray-700" },
};

// ══════════════════════════════════════════════════════════════════
// INDEXING COMMAND CENTER — Everything in one page
// ══════════════════════════════════════════════════════════════════

export default function IndexingCommandCenter() {
  // Data
  const [data, setData] = useState<IndexingData | null>(null);
  const [stats, setStats] = useState<IndexingStats | null>(null);
  const [reports, setReports] = useState<IndexingReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Action states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingSlug, setSubmittingSlug] = useState<string | null>(null);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [auditRunning, setAuditRunning] = useState(false);
  const [inspectionResult, setInspectionResult] = useState<InspectionResult | null>(null);
  const [inspectionRunning, setInspectionRunning] = useState(false);
  const [triggeringCron, setTriggeringCron] = useState<string | null>(null);

  // UI state
  const [expandedArticle, setExpandedArticle] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [showAllIssues, setShowAllIssues] = useState(false);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [showAllTimeline, setShowAllTimeline] = useState(false);
  const [showAllReports, setShowAllReports] = useState(false);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const autoRefreshRef = useRef<NodeJS.Timeout | null>(null);

  // ── Data Loading ──

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [indexRes, statsRes, historyRes] = await Promise.allSettled([
        fetch("/api/admin/content-indexing"),
        fetch("/api/admin/seo/indexing?type=stats"),
        fetch("/api/admin/seo/indexing?type=history&limit=20"),
      ]);

      if (indexRes.status === "fulfilled" && indexRes.value.ok) {
        setData(await indexRes.value.json());
      }
      if (statsRes.status === "fulfilled" && statsRes.value.ok) {
        const s = await statsRes.value.json();
        setStats(s.stats || null);
      }
      if (historyRes.status === "fulfilled" && historyRes.value.ok) {
        const h = await historyRes.value.json();
        setReports(h.reports || []);
      }
    } catch {
      toast.error("Failed to load indexing data");
    }
    setLastRefreshed(new Date());
    setIsLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      autoRefreshRef.current = setInterval(loadAll, 15000);
    } else if (autoRefreshRef.current) {
      clearInterval(autoRefreshRef.current);
      autoRefreshRef.current = null;
    }
    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    };
  }, [autoRefresh, loadAll]);

  // ── Actions ──

  const submitAll = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/content-indexing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit_all" }),
      });
      const result = await res.json();
      if (res.ok) {
        toast.success(`Submitted ${result.submitted} pages to search engines`);
        await loadAll();
      } else {
        toast.error(result.error || "Submission failed");
      }
    } catch { toast.error("Network error"); }
    finally { setIsSubmitting(false); }
  };

  const submitSingle = async (slug: string) => {
    setSubmittingSlug(slug);
    try {
      const res = await fetch("/api/admin/content-indexing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit", slugs: [slug] }),
      });
      const result = await res.json();
      if (res.ok) {
        toast.success(`Submitted /blog/${slug}`);
        await loadAll();
      } else {
        toast.error(result.error || "Failed");
      }
    } catch { toast.error("Network error"); }
    finally { setSubmittingSlug(null); }
  };

  const runInspection = async (submit: boolean = false) => {
    setInspectionRunning(true);
    setInspectionResult(null);
    try {
      const url = submit
        ? "/api/seo/check-and-index?limit=50&submit=true"
        : "/api/seo/check-and-index?limit=50";
      const res = await fetch(url);
      if (res.ok) {
        const result = await res.json();
        setInspectionResult(result);
        toast.success(
          `Inspected ${result.summary?.inspected || 0} pages: ${result.summary?.indexed || 0} indexed, ${result.summary?.notIndexed || 0} not indexed`
        );
        await loadAll();
      } else { toast.error("Inspection failed"); }
    } catch { toast.error("Network error"); }
    finally { setInspectionRunning(false); }
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
      const result = await res.json();
      if (res.ok && result.summary) {
        setAuditResult({ ...result.summary, posts: result.posts });
        toast.success(`Audit complete: ${result.summary.passing} passing, ${result.summary.failing} failing`);
      } else { toast.error(result.error || "Audit failed"); }
    } catch { toast.error("Network error"); }
    finally { setAuditRunning(false); }
  };

  const triggerCron = async (cronName: string, label: string) => {
    setTriggeringCron(cronName);
    try {
      const res = await fetch(`/api/cron/${cronName}`, { method: "POST" });
      if (res.ok) {
        toast.success(`${label} triggered successfully`);
        setTimeout(loadAll, 3000);
      } else {
        toast.error(`${label} failed`);
      }
    } catch { toast.error("Network error"); }
    finally { setTriggeringCron(null); }
  };

  // ── Filtered & searched articles ──

  const filteredArticles = (data?.articles || []).filter(a => {
    const matchesStatus = statusFilter === "all" || a.indexingStatus === statusFilter;
    const matchesSearch = !searchQuery ||
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.slug.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // ── Loading state ──

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">Loading Indexing Data...</h2>
          <p className="text-sm text-gray-500 mt-2">Checking all published pages and their indexing status</p>
        </div>
      </div>
    );
  }

  const summary = data?.summary || { total: 0, indexed: 0, submitted: 0, notIndexed: 0, neverSubmitted: 0, errors: 0 };
  const healthDiagnosis = data?.healthDiagnosis || { status: "not_started" as const, message: "No data", detail: "", indexingRate: 0 };
  const config = data?.config || { hasIndexNowKey: false, hasGscCredentials: false, gscSiteUrl: "" };
  const systemIssues = data?.systemIssues || [];
  const recentActivity = data?.recentActivity || [];
  const hs = HEALTH_STYLES[healthDiagnosis.status] || HEALTH_STYLES.not_started;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ═══ HEADER ═══ */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Globe className="h-6 w-6 text-blue-500" />
                Indexing Command Center
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Last updated: {lastRefreshed.toLocaleTimeString()}
                {data?.siteId && <span className="ml-2 text-blue-600">Site: {data.siteId}</span>}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  autoRefresh
                    ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                    : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
                }`}
              >
                <Radio className={`h-3 w-3 ${autoRefresh ? "animate-pulse" : ""}`} />
                {autoRefresh ? "Live" : "Auto-refresh"}
              </button>
              <Button onClick={loadAll} disabled={isLoading} variant="outline" size="sm">
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-5">

        {/* ═══ 1. HEALTH DIAGNOSIS ═══ */}
        <div className={`rounded-xl border-2 ${hs.border} ${hs.bg} p-4`}>
          <div className="flex items-start gap-3">
            <div className="pt-0.5">
              {healthDiagnosis.status === "healthy" ? <CheckCircle className={`h-6 w-6 ${hs.icon}`} /> :
               healthDiagnosis.status === "critical" ? <XCircle className={`h-6 w-6 ${hs.icon}`} /> :
               healthDiagnosis.status === "warning" ? <AlertTriangle className={`h-6 w-6 ${hs.icon}`} /> :
               <Info className={`h-6 w-6 ${hs.icon}`} />}
            </div>
            <div className="flex-1">
              <div className={`font-semibold text-lg ${hs.text}`}>{healthDiagnosis.message}</div>
              <div className="text-sm text-gray-600 mt-1">{healthDiagnosis.detail}</div>
              {summary.total > 0 && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Indexing Rate</span>
                    <span className="font-bold">{healthDiagnosis.indexingRate}%</span>
                  </div>
                  <Progress value={healthDiagnosis.indexingRate} className="h-2" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══ 2. SUMMARY CARDS ═══ */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[
            { label: "Total Pages", value: summary.total, color: "text-gray-900", bg: "bg-white", onClick: () => setStatusFilter("all") },
            { label: "Indexed", value: summary.indexed, color: "text-emerald-600", bg: "bg-emerald-50", onClick: () => setStatusFilter("indexed") },
            { label: "Submitted", value: summary.submitted, color: "text-blue-600", bg: "bg-blue-50", onClick: () => setStatusFilter("submitted") },
            { label: "Not Indexed", value: summary.notIndexed, color: "text-red-600", bg: "bg-red-50", onClick: () => setStatusFilter("not_indexed") },
            { label: "Never Sent", value: summary.neverSubmitted, color: "text-gray-600", bg: "bg-gray-100", onClick: () => setStatusFilter("never_submitted") },
            { label: "Errors", value: summary.errors, color: summary.errors > 0 ? "text-red-600" : "text-gray-400", bg: summary.errors > 0 ? "bg-red-50" : "bg-gray-50", onClick: () => setStatusFilter("error") },
          ].map(c => (
            <button
              key={c.label}
              onClick={c.onClick}
              className={`${c.bg} rounded-xl p-3 text-center border hover:shadow-md transition-shadow cursor-pointer`}
            >
              <div className={`text-xl font-bold ${c.color}`}>{c.value}</div>
              <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">{c.label}</div>
            </button>
          ))}
        </div>

        {/* ═══ 3. CONFIGURATION STATUS ═══ */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings className="h-5 w-5 text-gray-500" />
              Configuration Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className={`rounded-lg border p-3 ${config.hasIndexNowKey ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
                <div className="flex items-center gap-2 mb-1">
                  {config.hasIndexNowKey ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                  <span className="text-sm font-medium">IndexNow Key</span>
                </div>
                <p className="text-xs text-gray-600">
                  {config.hasIndexNowKey
                    ? "Configured — Bing, Yandex, and other IndexNow engines will be notified of new content"
                    : "Not set — Cannot notify Bing/Yandex about new content. Set INDEXNOW_KEY in Vercel env vars"}
                </p>
              </div>
              <div className={`rounded-lg border p-3 ${config.hasGscCredentials ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
                <div className="flex items-center gap-2 mb-1">
                  {config.hasGscCredentials ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                  <span className="text-sm font-medium">Google Search Console</span>
                </div>
                <p className="text-xs text-gray-600">
                  {config.hasGscCredentials
                    ? "Configured — Can submit sitemaps and check indexing status via Google API"
                    : "Not set — Cannot check Google indexing status. Set GSC credentials in Vercel env vars"}
                </p>
              </div>
              <div className={`rounded-lg border p-3 ${config.gscSiteUrl && config.gscSiteUrl !== "(fallback)" ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
                <div className="flex items-center gap-2 mb-1">
                  {config.gscSiteUrl && config.gscSiteUrl !== "(fallback)" ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <AlertTriangle className="h-4 w-4 text-amber-500" />}
                  <span className="text-sm font-medium">GSC Site URL</span>
                </div>
                <p className="text-xs text-gray-600">
                  {config.gscSiteUrl && config.gscSiteUrl !== "(fallback)"
                    ? `Property: ${config.gscSiteUrl}`
                    : "Using fallback URL — Set GSC_SITE_URL to match your Search Console property exactly"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ═══ 4. QUICK ACTIONS ═══ */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-5 w-5 text-yellow-500" />
              Quick Actions
              <span className="text-xs font-normal text-gray-400 ml-auto">Tap any button to trigger the action</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Submit All */}
              <button
                onClick={submitAll}
                disabled={isSubmitting}
                className="text-left rounded-lg border-2 border-emerald-200 bg-emerald-50 p-3 hover:bg-emerald-100 transition-colors disabled:opacity-50"
              >
                <div className="flex items-center gap-2 mb-1">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin text-emerald-600" /> : <Send className="h-4 w-4 text-emerald-600" />}
                  <span className="text-sm font-semibold text-emerald-800">Submit All Pages</span>
                </div>
                <p className="text-xs text-emerald-700">
                  Submit all published pages to IndexNow (Bing/Yandex) and Google via sitemap. This is the fastest way to get content discovered.
                </p>
              </button>

              {/* Check Index Status */}
              <button
                onClick={() => runInspection(false)}
                disabled={inspectionRunning}
                className="text-left rounded-lg border-2 border-blue-200 bg-blue-50 p-3 hover:bg-blue-100 transition-colors disabled:opacity-50"
              >
                <div className="flex items-center gap-2 mb-1">
                  {inspectionRunning ? <Loader2 className="h-4 w-4 animate-spin text-blue-600" /> : <Eye className="h-4 w-4 text-blue-600" />}
                  <span className="text-sm font-semibold text-blue-800">Check Index Status</span>
                </div>
                <p className="text-xs text-blue-700">
                  Inspect all pages via Google Search Console API to see which are indexed, which are not, and why. Dry-run — does not submit.
                </p>
              </button>

              {/* Inspect & Submit */}
              <button
                onClick={() => runInspection(true)}
                disabled={inspectionRunning}
                className="text-left rounded-lg border-2 border-purple-200 bg-purple-50 p-3 hover:bg-purple-100 transition-colors disabled:opacity-50"
              >
                <div className="flex items-center gap-2 mb-1">
                  {inspectionRunning ? <Loader2 className="h-4 w-4 animate-spin text-purple-600" /> : <ArrowUpRight className="h-4 w-4 text-purple-600" />}
                  <span className="text-sm font-semibold text-purple-800">Inspect & Submit</span>
                </div>
                <p className="text-xs text-purple-700">
                  Check indexing status of all pages AND submit any unindexed pages to IndexNow and Google. Combines inspection with submission.
                </p>
              </button>

              {/* Run SEO Compliance Audit */}
              <button
                onClick={runComplianceAudit}
                disabled={auditRunning}
                className="text-left rounded-lg border-2 border-amber-200 bg-amber-50 p-3 hover:bg-amber-100 transition-colors disabled:opacity-50"
              >
                <div className="flex items-center gap-2 mb-1">
                  {auditRunning ? <Loader2 className="h-4 w-4 animate-spin text-amber-600" /> : <Shield className="h-4 w-4 text-amber-600" />}
                  <span className="text-sm font-semibold text-amber-800">Run Indexing Audit</span>
                </div>
                <p className="text-xs text-amber-700">
                  Full SEO compliance audit of all published pages. Checks meta tags, word count, headings, Arabic content, and auto-fixes issues where possible.
                </p>
              </button>

              {/* Trigger SEO Agent */}
              <button
                onClick={() => triggerCron("seo-agent", "SEO Agent")}
                disabled={!!triggeringCron}
                className="text-left rounded-lg border-2 border-gray-200 bg-gray-50 p-3 hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                <div className="flex items-center gap-2 mb-1">
                  {triggeringCron === "seo-agent" ? <Loader2 className="h-4 w-4 animate-spin text-gray-600" /> : <Play className="h-4 w-4 text-gray-600" />}
                  <span className="text-sm font-semibold text-gray-800">Trigger SEO Agent</span>
                </div>
                <p className="text-xs text-gray-600">
                  Runs the SEO agent cron job now. Discovers new URLs, checks schema markup, and queues pages for indexing submission.
                </p>
              </button>

              {/* Trigger Verify Indexing */}
              <button
                onClick={() => triggerCron("verify-indexing", "Verify Indexing")}
                disabled={!!triggeringCron}
                className="text-left rounded-lg border-2 border-gray-200 bg-gray-50 p-3 hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                <div className="flex items-center gap-2 mb-1">
                  {triggeringCron === "verify-indexing" ? <Loader2 className="h-4 w-4 animate-spin text-gray-600" /> : <Search className="h-4 w-4 text-gray-600" />}
                  <span className="text-sm font-semibold text-gray-800">Verify Indexing</span>
                </div>
                <p className="text-xs text-gray-600">
                  Re-checks submitted/discovered URLs via GSC to update their indexing status. Confirms whether Google has actually indexed your pages.
                </p>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* ═══ 5. INSPECTION RESULTS (shown after running inspection) ═══ */}
        {inspectionResult && (
          <Card className="border-2 border-blue-200">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-blue-500" />
                  Inspection Results
                  <Badge className={inspectionResult.mode === "dry-run" ? "bg-gray-500" : "bg-blue-500"}>
                    {inspectionResult.mode}
                  </Badge>
                </span>
                <button onClick={() => setInspectionResult(null)} className="text-xs text-gray-400 hover:text-gray-600">
                  Dismiss
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold">{inspectionResult.summary.totalPages}</div>
                  <div className="text-[10px] text-gray-500">Total Pages</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-blue-600">{inspectionResult.summary.inspected}</div>
                  <div className="text-[10px] text-gray-500">Inspected</div>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-emerald-600">{inspectionResult.summary.indexed}</div>
                  <div className="text-[10px] text-gray-500">Indexed</div>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-red-600">{inspectionResult.summary.notIndexed}</div>
                  <div className="text-[10px] text-gray-500">Not Indexed</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-sm font-bold text-gray-600">{inspectionResult.elapsed}</div>
                  <div className="text-[10px] text-gray-500">Duration</div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Database className="h-3 w-3" />
                GSC API: {inspectionResult.summary.gscApiAvailable ? "Available" : "Not available"}
              </div>

              {/* Not indexed pages with reasons */}
              {inspectionResult.notIndexedPages && inspectionResult.notIndexedPages.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-red-700">Not Indexed Pages ({inspectionResult.notIndexedPages.length})</h4>
                  {inspectionResult.notIndexedPages.map((p, i) => (
                    <div key={i} className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="text-sm font-medium text-gray-900 truncate">{p.label || p.url}</div>
                      <div className="text-xs text-gray-500 font-mono truncate mt-0.5">{p.url}</div>
                      <div className="text-xs text-red-600 mt-1 flex items-start gap-1.5">
                        <AlertCircle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                        {p.reason}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Indexed pages */}
              {inspectionResult.indexedPages && inspectionResult.indexedPages.length > 0 && (
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-emerald-700">Indexed Pages ({inspectionResult.indexedPages.length})</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {inspectionResult.indexedPages.map((url, i) => (
                      <div key={i} className="text-xs text-emerald-700 flex items-center gap-1.5 bg-emerald-50 rounded px-2 py-1">
                        <CheckCircle className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{url.replace(/^https?:\/\/[^/]+/, "")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Submission results */}
              {inspectionResult.submission && typeof inspectionResult.submission !== "string" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">IndexNow</span>
                      <Badge className={inspectionResult.submission.indexNow?.status === "success" ? "bg-emerald-500" : "bg-amber-500"}>
                        {inspectionResult.submission.indexNow?.status || "N/A"}
                      </Badge>
                    </div>
                    <div className="text-lg font-bold">{inspectionResult.submission.indexNow?.submitted || 0} submitted</div>
                  </div>
                  <div className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">Google (Sitemap)</span>
                      <Badge className={inspectionResult.submission.googleApi?.status === "success" ? "bg-emerald-500" : "bg-amber-500"}>
                        {inspectionResult.submission.googleApi?.status || "N/A"}
                      </Badge>
                    </div>
                    <div className="text-lg font-bold">{inspectionResult.submission.googleApi?.submitted || 0} submitted</div>
                    {(inspectionResult.submission.googleApi?.failed || 0) > 0 && (
                      <div className="text-xs text-red-600">{inspectionResult.submission.googleApi.failed} failed</div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ═══ 6. COMPLIANCE AUDIT RESULTS (shown after running audit) ═══ */}
        {auditResult && (
          <Card className="border-2 border-amber-200">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-amber-500" />
                  SEO Compliance Audit Report
                </span>
                <button onClick={() => setAuditResult(null)} className="text-xs text-gray-400 hover:text-gray-600">
                  Dismiss
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold">{auditResult.totalPosts}</div>
                  <div className="text-[10px] text-gray-500">Total Pages</div>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-emerald-600">{auditResult.passing}</div>
                  <div className="text-[10px] text-gray-500">Passing</div>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-red-600">{auditResult.failing}</div>
                  <div className="text-[10px] text-gray-500">Failing</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <div className={`text-xl font-bold ${getScoreColor(auditResult.averageScore)}`}>{auditResult.averageScore}</div>
                  <div className="text-[10px] text-gray-500">Avg Score</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-purple-600">{auditResult.totalAutoFixes}</div>
                  <div className="text-[10px] text-gray-500">Auto-Fixed</div>
                </div>
              </div>

              {/* Per-page results */}
              {auditResult.posts && auditResult.posts.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-gray-700">Per-Page Results</h4>
                  {auditResult.posts.map((p, i) => (
                    <div key={i} className={`rounded-lg border p-3 ${p.score >= 60 ? "bg-white" : "bg-red-50 border-red-200"}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          {p.score >= 60 ? <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" /> : <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />}
                          <span className="text-sm font-medium truncate">/blog/{p.slug}</span>
                        </div>
                        <span className={`text-sm font-bold flex-shrink-0 ${getScoreColor(p.score)}`}>{p.score}/100</span>
                      </div>
                      {p.issues.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {p.issues.map((issue, j) => (
                            <div key={j} className="text-xs text-gray-600 flex items-start gap-1.5">
                              <AlertCircle className="h-3 w-3 text-amber-500 flex-shrink-0 mt-0.5" />
                              {issue}
                            </div>
                          ))}
                        </div>
                      )}
                      {p.fixes.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {p.fixes.map((fix, j) => (
                            <div key={j} className="text-xs text-emerald-600 flex items-start gap-1.5">
                              <CheckCircle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                              {fix}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ═══ 7. SYSTEM ISSUES & DIAGNOSTICS ═══ */}
        {systemIssues.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Issues & Diagnostics ({systemIssues.length})
                </span>
                {systemIssues.length > 3 && (
                  <button onClick={() => setShowAllIssues(!showAllIssues)} className="text-xs text-blue-600 hover:underline">
                    {showAllIssues ? "Show less" : "Show all"}
                  </button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(showAllIssues ? systemIssues : systemIssues.slice(0, 3)).map((issue, i) => {
                const sevColors = {
                  critical: { bg: "bg-red-50", border: "border-red-200", badge: "bg-red-500" },
                  warning: { bg: "bg-amber-50", border: "border-amber-200", badge: "bg-amber-500" },
                  info: { bg: "bg-blue-50", border: "border-blue-200", badge: "bg-blue-500" },
                };
                const sc = sevColors[issue.severity];
                return (
                  <div key={i} className={`rounded-lg border ${sc.border} ${sc.bg} p-3`}>
                    <div className="flex items-start gap-2">
                      <Badge className={`${sc.badge} text-[10px] flex-shrink-0`}>{issue.severity}</Badge>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900">{issue.message}</div>
                        <div className="text-xs text-gray-600 mt-0.5">{issue.detail}</div>
                        {issue.fixAction && (
                          <div className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                            <Zap className="h-3 w-3" /> Fix: {issue.fixAction}
                          </div>
                        )}
                      </div>
                      <Badge variant="outline" className="text-[10px] flex-shrink-0">{issue.category}</Badge>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* ═══ 8. PER-PAGE INDEXING STATUS ═══ */}
        <Card>
          <CardHeader className="pb-3">
            <div className="space-y-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-5 w-5 text-blue-500" />
                Per-Page Indexing Status ({filteredArticles.length} of {data?.articles?.length || 0})
              </CardTitle>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by title or slug..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Status filter pills */}
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {[
                  { key: "all", label: "All", count: data?.articles?.length || 0 },
                  { key: "indexed", label: "Indexed", count: summary.indexed },
                  { key: "submitted", label: "Submitted", count: summary.submitted },
                  { key: "not_indexed", label: "Not Indexed", count: summary.notIndexed },
                  { key: "never_submitted", label: "Never Sent", count: summary.neverSubmitted },
                  { key: "error", label: "Errors", count: summary.errors },
                ].map(f => (
                  <button
                    key={f.key}
                    onClick={() => setStatusFilter(f.key)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors flex-shrink-0 flex items-center gap-1 ${
                      statusFilter === f.key
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    <Filter className="h-3 w-3" />
                    {f.label}
                    <span className={`ml-0.5 ${statusFilter === f.key ? "text-gray-300" : "text-gray-400"}`}>
                      {f.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {filteredArticles.length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-400">
                {searchQuery ? `No articles matching "${searchQuery}"` :
                 statusFilter === "all" ? "No published articles found" :
                 `No articles with status "${statusFilter}"`}
              </div>
            ) : (
              filteredArticles.map(article => {
                const isExpanded = expandedArticle === article.id;
                const st = STATUS_STYLES[article.indexingStatus] || STATUS_STYLES.never_submitted;
                return (
                  <div key={article.id} className="border rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedArticle(isExpanded ? null : article.id)}
                      className="w-full text-left p-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                    >
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${st.bg} ${st.text} flex-shrink-0`}>
                        {st.label}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{article.title}</div>
                        <div className="text-[10px] text-gray-500 font-mono truncate">/blog/{article.slug}</div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right hidden sm:block">
                          <div className={`text-xs font-bold ${getScoreColor(article.seoScore)}`}>{article.seoScore}</div>
                          <div className="text-[10px] text-gray-400">{article.wordCount}w</div>
                        </div>
                        {article.indexingStatus !== "indexed" && (
                          <Button
                            size="sm" variant="outline"
                            className="text-xs h-7 px-2"
                            disabled={submittingSlug === article.slug}
                            onClick={(e) => { e.stopPropagation(); submitSingle(article.slug); }}
                          >
                            {submittingSlug === article.slug ? <Loader2 className="h-3 w-3 animate-spin" /> : "Submit"}
                          </Button>
                        )}
                        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </div>
                    </button>

                    {/* Expanded Detail */}
                    {isExpanded && (
                      <div className="border-t bg-gray-50 p-4 space-y-3">
                        {/* Quick Facts */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div><span className="text-gray-500">SEO Score:</span> <span className={`font-bold ${getScoreColor(article.seoScore)}`}>{article.seoScore}/100</span></div>
                          <div><span className="text-gray-500">Words:</span> <span className="font-medium">{article.wordCount}</span></div>
                          <div><span className="text-gray-500">Published:</span> <span className="font-medium">{article.publishedAt ? timeAgo(article.publishedAt) : "—"}</span></div>
                          <div><span className="text-gray-500">Attempts:</span> <span className="font-medium">{article.submissionAttempts}</span></div>
                        </div>

                        {/* Submission Timeline */}
                        <div className="bg-white rounded-lg border p-3">
                          <h5 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                            <Clock className="h-3 w-3" /> Indexing Timeline
                          </h5>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                            <div>
                              <span className="text-gray-500 block">Submitted</span>
                              <span className="font-medium">{article.submittedAt ? formatDate(article.submittedAt) : "Never"}</span>
                              {article.submittedAt && <span className="text-gray-400 block">{timeAgo(article.submittedAt)}</span>}
                            </div>
                            <div>
                              <span className="text-gray-500 block">Last Crawled</span>
                              <span className="font-medium">{article.lastCrawledAt ? formatDate(article.lastCrawledAt) : "Never"}</span>
                              {article.lastCrawledAt && <span className="text-gray-400 block">{timeAgo(article.lastCrawledAt)}</span>}
                            </div>
                            <div>
                              <span className="text-gray-500 block">Last Inspected</span>
                              <span className="font-medium">{article.lastInspectedAt ? formatDate(article.lastInspectedAt) : "Never"}</span>
                              {article.lastInspectedAt && <span className="text-gray-400 block">{timeAgo(article.lastInspectedAt)}</span>}
                            </div>
                            <div>
                              <span className="text-gray-500 block">Coverage State</span>
                              <span className="font-medium">{article.coverageState || "Unknown"}</span>
                            </div>
                          </div>
                        </div>

                        {/* Channels */}
                        <div className="flex items-center gap-3 text-xs flex-wrap">
                          <span className="text-gray-500">Submission Channels:</span>
                          <Badge variant={article.submittedIndexnow ? "default" : "outline"} className="text-[10px]">
                            {article.submittedIndexnow ? "IndexNow sent" : "IndexNow pending"}
                          </Badge>
                          <Badge variant={article.submittedSitemap ? "default" : "outline"} className="text-[10px]">
                            {article.submittedSitemap ? "Sitemap submitted" : "Sitemap pending"}
                          </Badge>
                        </div>

                        {/* Reasons / Diagnostics */}
                        {article.notIndexedReasons.length > 0 && (
                          <div className="bg-white rounded-lg border p-3 space-y-2">
                            <div className="text-xs font-semibold text-gray-700">
                              {article.indexingStatus === "indexed" ? "Notes" : "Why not indexed yet?"}
                            </div>
                            {article.notIndexedReasons.map((reason, i) => (
                              <div key={i} className="text-xs text-gray-600 flex items-start gap-2">
                                <AlertCircle className="h-3 w-3 text-amber-500 flex-shrink-0 mt-0.5" />
                                {reason}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            size="sm" variant="outline" className="text-xs h-7"
                            disabled={submittingSlug === article.slug}
                            onClick={() => submitSingle(article.slug)}
                          >
                            {submittingSlug === article.slug ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                            {article.submissionAttempts > 0 ? "Resubmit to Search Engines" : "Submit to Search Engines"}
                          </Button>
                          {data?.baseUrl && (
                            <a
                              href={`${data.baseUrl}/blog/${article.slug}`}
                              target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline px-2 py-1"
                            >
                              <ExternalLink className="h-3 w-3" /> View live page
                            </a>
                          )}
                          <a
                            href={`https://search.google.com/search-console/inspect?resource_id=${encodeURIComponent(config.gscSiteUrl || "")}&id=${encodeURIComponent(`${data?.baseUrl || ""}/blog/${article.slug}`)}`}
                            target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-gray-500 hover:underline px-2 py-1"
                          >
                            <Globe className="h-3 w-3" /> View in GSC
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* ═══ 9. RECENT INDEXING ACTIVITY ═══ */}
        {recentActivity.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-500" />
                  Recent Indexing Activity ({recentActivity.length} runs)
                </span>
                {recentActivity.length > 5 && (
                  <button onClick={() => setShowAllActivity(!showAllActivity)} className="text-xs text-blue-600 hover:underline">
                    {showAllActivity ? "Show less" : "Show all"}
                  </button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-gray-500 mb-3">
                Cron jobs related to indexing: seo-agent (discovers URLs), google-indexing (submits to search engines), verify-indexing (checks status), content-selector (publishes articles)
              </div>
              <div className="space-y-1.5">
                {(showAllActivity ? recentActivity : recentActivity.slice(0, 5)).map((log, i) => {
                  const isOk = log.status === "completed";
                  return (
                    <div key={i} className="flex items-center gap-2.5 py-2 border-b last:border-0">
                      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isOk ? "bg-emerald-500" : "bg-red-500"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-gray-900">{log.jobName}</div>
                        {log.errorMessage && <div className="text-[10px] text-red-500 truncate">{log.errorMessage}</div>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 text-[10px] text-gray-500">
                        {log.itemsProcessed > 0 && (
                          <span className="bg-gray-100 px-1.5 py-0.5 rounded">{log.itemsSucceeded}/{log.itemsProcessed} items</span>
                        )}
                        {log.durationMs > 0 && <span>{(log.durationMs / 1000).toFixed(1)}s</span>}
                        <span>{timeAgo(log.startedAt)}</span>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${
                        isOk ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                      }`}>
                        {log.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══ 10. LATEST SUBMISSION RESULT ═══ */}
        {stats?.latestSubmissionResult && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="h-5 w-5 text-yellow-500" />
                Latest Submission Result
                {stats.lastSubmission && (
                  <span className="text-xs font-normal text-gray-500 ml-2">
                    {timeAgo(stats.lastSubmission)}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">Google (Sitemap)</span>
                    <Badge className={stats.latestSubmissionResult.googleApi.status === "success" ? "bg-emerald-500" : "bg-amber-500"}>
                      {stats.latestSubmissionResult.googleApi.status}
                    </Badge>
                  </div>
                  <div className="text-xl font-bold">{stats.latestSubmissionResult.googleApi.submitted} submitted</div>
                  {stats.latestSubmissionResult.googleApi.failed > 0 && (
                    <div className="text-xs text-red-600 mt-1">{stats.latestSubmissionResult.googleApi.failed} failed</div>
                  )}
                  {stats.latestSubmissionResult.googleApi.errors.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {stats.latestSubmissionResult.googleApi.errors.map((err, i) => (
                        <div key={i} className="text-[10px] text-red-500">{err}</div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">IndexNow (Bing/Yandex)</span>
                    <Badge className={stats.latestSubmissionResult.indexNow.status === "success" ? "bg-emerald-500" : "bg-amber-500"}>
                      {stats.latestSubmissionResult.indexNow.status}
                    </Badge>
                  </div>
                  <div className="text-xl font-bold">{stats.latestSubmissionResult.indexNow.submitted} submitted</div>
                </div>
              </div>

              {/* Lifetime stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 pt-3 border-t">
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">{stats.totalSubmissions}</div>
                  <div className="text-[10px] text-gray-500">Total Submissions</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">{stats.totalAudits}</div>
                  <div className="text-[10px] text-gray-500">Total Audits</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">{stats.totalGoogleSubmitted}</div>
                  <div className="text-[10px] text-gray-500">Google Submitted</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">{stats.totalIndexNowSubmitted}</div>
                  <div className="text-[10px] text-gray-500">IndexNow Submitted</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══ 11. SUBMISSION HISTORY TIMELINE ═══ */}
        {stats?.timeline && stats.timeline.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-gray-500" />
                  Submission History ({stats.timeline.length} events)
                </span>
                {stats.timeline.length > 5 && (
                  <button onClick={() => setShowAllTimeline(!showAllTimeline)} className="text-xs text-blue-600 hover:underline">
                    {showAllTimeline ? "Show less" : "Show all"}
                  </button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(showAllTimeline ? stats.timeline : stats.timeline.slice(0, 5)).map((entry, i) => (
                  <div key={i} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div className="flex items-center gap-2.5">
                      {entry.googleStatus === "success" || entry.indexNowStatus === "success" ? (
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      )}
                      <div>
                        <div className="text-sm font-medium">
                          {entry.mode === "submit-all" ? "Bulk Submit All" :
                           entry.mode === "new" ? "Submit New Pages" :
                           entry.mode === "updated" ? "Submit Updated" :
                           entry.mode || "Submission"}
                        </div>
                        <div className="text-[10px] text-gray-500">{formatDate(entry.date)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <div className="text-right">
                        <span className="font-medium">{entry.googleSubmitted}</span>
                        <span className="text-gray-500 ml-1">Google</span>
                      </div>
                      <div className="text-right">
                        <span className="font-medium">{entry.indexNowSubmitted}</span>
                        <span className="text-gray-500 ml-1">IndexNow</span>
                      </div>
                      <Badge variant="outline" className="text-[10px]">{entry.totalPages} pages</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══ 12. INDEXING REPORTS HISTORY ═══ */}
        {reports.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <History className="h-5 w-5 text-gray-500" />
                  Indexing Reports ({reports.length})
                </span>
                {reports.length > 5 && (
                  <button onClick={() => setShowAllReports(!showAllReports)} className="text-xs text-blue-600 hover:underline">
                    {showAllReports ? "Show less" : "Show all"}
                  </button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-gray-500 mb-3">
                Historical indexing audit and submission reports saved by the SEO agent and check-and-index cron jobs.
              </div>
              <div className="space-y-2">
                {(showAllReports ? reports : reports.slice(0, 5)).map((report) => {
                  const isExpanded = expandedReport === report.id;
                  const d = report.data;
                  const isSubmission = report.type === "indexing_submission";
                  return (
                    <div key={report.id} className="border rounded-lg overflow-hidden">
                      <button
                        onClick={() => setExpandedReport(isExpanded ? null : report.id)}
                        className="w-full text-left p-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                      >
                        <Badge className={isSubmission ? "bg-emerald-500" : "bg-blue-500"} >
                          {isSubmission ? "Submit" : "Audit"}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900">
                            {d.mode === "submit-all" ? "Bulk Submit" :
                             d.mode === "new" ? "New Pages" :
                             d.mode === "updated" ? "Updated Pages" :
                             d.mode || "Indexing Run"}
                          </div>
                          <div className="text-[10px] text-gray-500">{formatDate(report.date)}</div>
                        </div>
                        <div className="flex items-center gap-2 text-xs flex-shrink-0">
                          <span className="bg-gray-100 px-1.5 py-0.5 rounded">{d.totalPages} pages</span>
                          {d.indexed !== undefined && (
                            <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">{d.indexed} indexed</span>
                          )}
                          {d.elapsed && <span className="text-gray-400">{d.elapsed}</span>}
                        </div>
                        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </button>

                      {isExpanded && (
                        <div className="border-t bg-gray-50 p-4 space-y-3">
                          {/* Stats */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                            <div><span className="text-gray-500">Total Pages:</span> <span className="font-medium">{d.totalPages}</span></div>
                            {d.inspected !== undefined && <div><span className="text-gray-500">Inspected:</span> <span className="font-medium">{d.inspected}</span></div>}
                            {d.indexed !== undefined && <div><span className="text-gray-500">Indexed:</span> <span className="font-medium text-emerald-600">{d.indexed}</span></div>}
                            {d.notIndexed !== undefined && <div><span className="text-gray-500">Not Indexed:</span> <span className="font-medium text-red-600">{d.notIndexed}</span></div>}
                          </div>

                          {/* Submission details */}
                          {d.submission && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div className="bg-white border rounded p-2 text-xs">
                                <span className="font-medium">IndexNow:</span> {d.submission.indexNow.submitted} submitted — {d.submission.indexNow.status}
                              </div>
                              <div className="bg-white border rounded p-2 text-xs">
                                <span className="font-medium">Google:</span> {d.submission.googleApi.submitted} submitted, {d.submission.googleApi.failed} failed — {d.submission.googleApi.status}
                              </div>
                            </div>
                          )}

                          {/* Not indexed pages */}
                          {d.notIndexedPages && d.notIndexedPages.length > 0 && (
                            <div className="space-y-1">
                              <h5 className="text-xs font-semibold text-red-700">Not Indexed ({d.notIndexedPages.length})</h5>
                              {d.notIndexedPages.slice(0, 10).map((p, i) => (
                                <div key={i} className="text-[10px] text-gray-600 flex items-start gap-1.5">
                                  <XCircle className="h-3 w-3 text-red-400 flex-shrink-0 mt-0.5" />
                                  <span className="font-mono">{p.url.replace(/^https?:\/\/[^/]+/, "")}</span>
                                  {p.reason && <span className="text-gray-400">— {p.reason}</span>}
                                </div>
                              ))}
                              {d.notIndexedPages.length > 10 && (
                                <div className="text-[10px] text-gray-400">...and {d.notIndexedPages.length - 10} more</div>
                              )}
                            </div>
                          )}

                          {/* Indexed pages */}
                          {d.indexedPages && d.indexedPages.length > 0 && (
                            <div className="space-y-1">
                              <h5 className="text-xs font-semibold text-emerald-700">Indexed ({d.indexedPages.length})</h5>
                              <div className="flex flex-wrap gap-1">
                                {d.indexedPages.slice(0, 10).map((url, i) => (
                                  <span key={i} className="text-[10px] bg-emerald-50 text-emerald-700 rounded px-1.5 py-0.5 font-mono">
                                    {url.replace(/^https?:\/\/[^/]+/, "")}
                                  </span>
                                ))}
                                {d.indexedPages.length > 10 && (
                                  <span className="text-[10px] text-gray-400">+{d.indexedPages.length - 10} more</span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Errors */}
                          {d.errors && d.errors.length > 0 && (
                            <div className="space-y-1">
                              <h5 className="text-xs font-semibold text-red-700">Errors</h5>
                              {d.errors.map((err, i) => (
                                <div key={i} className="text-[10px] text-red-600">{err}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══ 13. EMPTY STATE ═══ */}
        {summary.total === 0 && !auditResult && !inspectionResult && recentActivity.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Published Articles Yet</h3>
              <p className="text-gray-600 mb-4 max-w-md mx-auto">
                The content pipeline needs to produce and publish articles before they can be indexed by search engines.
                Once articles are published, you can submit them to Google and Bing from this page.
              </p>
              <div className="flex justify-center gap-3 flex-wrap">
                <Button onClick={() => runInspection(false)} disabled={inspectionRunning} variant="outline">
                  <Search className="h-4 w-4 mr-2" /> Check Index Status
                </Button>
                <Button onClick={submitAll} disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700">
                  <Zap className="h-4 w-4 mr-2" /> Submit All Pages
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══ FOOTER INFO ═══ */}
        <div className="text-center text-xs text-gray-400 py-4 space-y-1">
          <p>Data from: /api/admin/content-indexing, /api/admin/seo/indexing, /api/seo/check-and-index</p>
          <p>Indexing status is tracked per-URL in the URLIndexingStatus table. Cron activity is logged in CronJobLog.</p>
          <p>
            Google typically takes 2-14 days to index new URLs. IndexNow notifies Bing/Yandex instantly.
          </p>
        </div>
      </div>
    </div>
  );
}
