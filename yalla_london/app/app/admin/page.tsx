"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Home,
  FileText,
  Lightbulb,
  Edit3,
  Search,
  Brain,
  Clock,
  CheckCircle,
  TrendingUp,
  Calendar,
  Zap,
  BookOpen,
  Layers,
  Globe,
  Plus,
  Sparkles,
  DollarSign,
  Activity,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Database,
  Shield,
  Key,
  Image,
  Video,
  Palette,
  Users,
  Settings,
  BarChart3,
  Workflow,
  Monitor,
  ShoppingBag,
  Target,
  Flag,
  Play,
  Send,
  Loader2,
} from "lucide-react";

interface SiteStats {
  siteId: string;
  siteName: string;
  domain: string;
  locale: "ar" | "en";
  status: "active" | "pending" | "paused";
  traffic: number;
  revenue: number;
  articles: number;
  leads: number;
}

interface SystemStatus {
  aiStatus: "online" | "offline" | "degraded";
  contentQueue: number;
  scheduledPosts: number;
  pendingTasks: number;
  lastSync: string;
}

export default function AdminDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    readyToPublish: 0,
    scheduledContent: 0,
    totalArticles: 0,
    totalTopics: 0,
    seoScore: 0,
    automationJobs: 0,
  });

  const [infoHubStats, setInfoHubStats] = useState({
    totalArticles: 0,
    publishedArticles: 0,
    draftArticles: 0,
    totalSections: 0,
    publishedSections: 0,
    avgSeoScore: 0,
  });

  const [readyToPublishItems, setReadyToPublishItems] = useState<any[]>([]);
  const [upcomingGeneration, setUpcomingGeneration] = useState<any[]>([]);
  const [sites, setSites] = useState<SiteStats[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);

  // Cron failure banner
  const [cronFailures, setCronFailures] = useState<number>(0);

  // Pipeline counts
  const [pipelineCounts, setPipelineCounts] = useState({
    topics: 0,
    drafts: 0,
    published: 0,
  });

  // Indexing stats
  const [indexingStats, setIndexingStats] = useState({
    totalUrls: 0,
    indexed: 0,
    submitted: 0,
    discovered: 0,
    errors: 0,
    lastSubmitted: null as string | null,
    lastInspected: null as string | null,
    indexRate: 0,
  });

  // Cron job results (per-job detail)
  const [cronResults, setCronResults] = useState<Array<{
    name: string;
    ok: boolean;
    status: number;
    error?: string;
  }> | null>(null);

  // Action button loading states
  const [publishingAll, setPublishingAll] = useState(false);
  const [runningCrons, setRunningCrons] = useState(false);
  const [seedingTopics, setSeedingTopics] = useState(false);
  const [seedingContent, setSeedingContent] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Fetch dashboard stats + sites data in parallel
      const [dashRes, sitesRes, statusRes] = await Promise.all([
        fetch("/api/admin/dashboard").catch(() => null),
        fetch("/api/admin/command-center/sites").catch(() => null),
        fetch("/api/admin/command-center/status").catch(() => null),
      ]);

      // Dashboard stats (real DB data)
      if (dashRes?.ok) {
        const data = await dashRes.json().catch(() => null);
        if (data) {
          setStats({
            readyToPublish: data.readyToPublish ?? 0,
            scheduledContent: data.scheduledContent ?? 0,
            totalArticles: data.totalArticles ?? 0,
            totalTopics: data.totalTopics ?? 0,
            seoScore: data.seoScore ?? 0,
            automationJobs: data.automationJobs ?? 0,
          });
          setReadyToPublishItems(data.recentDrafts || []);
          setUpcomingGeneration(data.upcomingTopics || []);
          if (data.informationHub) {
            setInfoHubStats(data.informationHub);
          }
          // Pipeline counts from same data
          setPipelineCounts({
            topics: data.totalTopics ?? 0,
            drafts: data.readyToPublish ?? 0,
            published: data.totalArticles ?? 0,
          });
        }
      }

      // Multi-site data
      if (sitesRes?.ok) {
        const data = await sitesRes.json().catch(() => null);
        if (data?.sites) setSites(data.sites);
      }

      // System status
      if (statusRes?.ok) {
        const data = await statusRes.json().catch(() => null);
        if (data) setSystemStatus(data);
      } else {
        setSystemStatus({
          aiStatus: "degraded",
          contentQueue: 0,
          scheduledPosts: 0,
          pendingTasks: 0,
          lastSync: "Unknown",
        });
      }

      // Fetch cron failure count + indexing stats from health monitor
      try {
        const cronRes = await fetch("/api/admin/health-monitor").catch(() => null);
        if (cronRes?.ok) {
          const data = await cronRes.json().catch(() => null);
          if (data?.summary?.errorsLast24h !== undefined) {
            setCronFailures(data.summary.errorsLast24h);
          }
          if (data?.indexing) {
            setIndexingStats({
              totalUrls: data.indexing.totalUrls ?? 0,
              indexed: data.indexing.indexed ?? 0,
              submitted: data.indexing.submitted ?? 0,
              discovered: data.indexing.discovered ?? 0,
              errors: data.indexing.errors ?? 0,
              lastSubmitted: data.indexing.lastSubmitted ?? null,
              lastInspected: data.indexing.lastInspected ?? null,
              indexRate: data.indexing.indexRate ?? 0,
            });
          }
        }
      } catch {
        // Fail silently - banner just won't show
      }

    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePublishAllReady = async () => {
    setPublishingAll(true);
    setActionMessage(null);
    try {
      const res = await fetch("/api/admin/publish-all-ready", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setActionMessage({ type: "success", text: data.message });
        loadData(); // Refresh dashboard
      } else {
        setActionMessage({ type: "error", text: data.error || "Failed to publish" });
      }
    } catch {
      setActionMessage({ type: "error", text: "Network error - could not publish" });
    } finally {
      setPublishingAll(false);
    }
  };

  const handleSeedTopics = async () => {
    setSeedingTopics(true);
    setActionMessage(null);
    try {
      const res = await fetch("/api/admin/seed-topics", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setActionMessage({ type: "success", text: `${data.created} topics queued! ${data.nextStep}` });
        loadData();
      } else {
        setActionMessage({ type: "error", text: data.error || "Failed to seed topics" });
      }
    } catch {
      setActionMessage({ type: "error", text: "Network error - could not seed topics" });
    } finally {
      setSeedingTopics(false);
    }
  };

  const handleRunAllCrons = async () => {
    setRunningCrons(true);
    setActionMessage(null);
    setCronResults(null);
    try {
      const res = await fetch("/api/admin/run-all-crons", { method: "POST" });
      const data = await res.json();
      if (data.results) {
        setCronResults(data.results);
      }
      if (data.success) {
        setActionMessage({ type: "success", text: data.message });
        loadData(); // Refresh dashboard
      } else {
        const failedJobs = (data.results || [])
          .filter((r: any) => !r.ok)
          .map((r: any) => `${r.name}: ${r.error || `HTTP ${r.status}`}`)
          .join(", ");
        setActionMessage({
          type: "error",
          text: failedJobs
            ? `Failed: ${failedJobs}`
            : data.message || data.error || "Some crons failed",
        });
      }
    } catch {
      setActionMessage({ type: "error", text: "Network error - could not run crons" });
    } finally {
      setRunningCrons(false);
    }
  };

  const handleSeedContent = async () => {
    setSeedingContent(true);
    setActionMessage(null);
    try {
      const res = await fetch("/api/admin/seed-content", { method: "POST" });
      const data = await res.json();
      if (data.success || res.ok) {
        setActionMessage({
          type: "success",
          text: `Seeded ${data.seeded ?? data.created ?? 0} articles successfully`,
        });
        loadData();
      } else {
        setActionMessage({ type: "error", text: data.error || "Failed to seed content" });
      }
    } catch {
      setActionMessage({ type: "error", text: "Network error - could not seed content" });
    } finally {
      setSeedingContent(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900">
            Loading Dashboard...
          </h2>
          <p className="text-gray-600">
            Fetching data from all sites.
          </p>
        </div>
      </div>
    );
  }

  // Multi-site totals
  const totalTraffic = sites.reduce((sum, s) => sum + s.traffic, 0);
  const totalRevenue = sites.reduce((sum, s) => sum + s.revenue, 0);
  const totalLeads = sites.reduce((sum, s) => sum + s.leads, 0);

  return (
    <div>
      {/* Cron Failure Banner */}
      {cronFailures > 0 && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 sm:p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <span className="text-sm sm:text-base font-medium text-red-800">
              {cronFailures} cron job{cronFailures === 1 ? "" : "s"} failed in the last 24 hours
            </span>
          </div>
          <Link
            href="/admin/health-monitoring"
            className="text-sm font-medium text-red-600 hover:text-red-700 whitespace-nowrap flex items-center gap-1"
          >
            View details <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* Action Message Toast */}
      {actionMessage && (
        <div className={`mb-4 rounded-xl p-3 sm:p-4 flex items-center justify-between ${
          actionMessage.type === "success"
            ? "bg-green-50 border border-green-200"
            : "bg-red-50 border border-red-200"
        }`}>
          <div className="flex items-center gap-3">
            {actionMessage.type === "success" ? (
              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            )}
            <span className={`text-sm font-medium ${
              actionMessage.type === "success" ? "text-green-800" : "text-red-800"
            }`}>
              {actionMessage.text}
            </span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none px-2"
          >
            &times;
          </button>
        </div>
      )}

      {/* Header */}
      <div className="mb-4 sm:mb-8">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
              <Home className="h-5 w-5 sm:h-8 sm:w-8 text-purple-500 flex-shrink-0" />
              Dashboard
            </h1>
            <p className="text-xs sm:text-base text-gray-600 mt-0.5 sm:mt-1 truncate">
              {sites.length > 0 ? `${sites.length} sites` : "Command center"}
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {systemStatus && (
              <span className={`flex items-center gap-1 text-[10px] sm:text-sm font-medium px-2 sm:px-3 py-1 sm:py-1.5 rounded-full ${
                systemStatus.aiStatus === "online"
                  ? "bg-green-50 text-green-700"
                  : systemStatus.aiStatus === "degraded"
                    ? "bg-yellow-50 text-yellow-700"
                    : "bg-red-50 text-red-700"
              }`}>
                <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                  systemStatus.aiStatus === "online" ? "bg-green-500 animate-pulse" :
                  systemStatus.aiStatus === "degraded" ? "bg-yellow-500" : "bg-red-500"
                }`} />
                <span className="hidden sm:inline">AI </span>{systemStatus.aiStatus}
              </span>
            )}
            <button
              onClick={loadData}
              className="p-1.5 sm:p-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions — horizontal scroll on mobile, grid on desktop */}
      <div className="mb-5 sm:mb-8">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2.5 sm:mb-4">
          Quick Actions
        </h2>
        <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-2 -mx-3 px-3 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-5 lg:grid-cols-9 sm:gap-3 sm:overflow-visible sm:pb-0 snap-x snap-mandatory sm:snap-none">
          {[
            { name: "New Article", href: "/admin/editor", icon: Edit3, color: "bg-blue-500 active:bg-blue-600" },
            { name: "Add Topic", href: "/admin/topics", icon: Lightbulb, color: "bg-green-500 active:bg-green-600" },
            { name: "AI Studio", href: "/admin/ai-studio", icon: Brain, color: "bg-purple-500 active:bg-purple-600" },
            { name: "SEO Audit", href: "/admin/seo", icon: Search, color: "bg-yellow-500 active:bg-yellow-600" },
            { name: "New Site", href: "/admin/command-center/sites/new", icon: Plus, color: "bg-indigo-500 active:bg-indigo-600" },
          ].map((action) => (
            <Link
              key={action.name}
              href={action.href}
              className={`${action.color} text-white rounded-xl transition-colors flex-shrink-0 snap-start flex flex-col items-center justify-center text-center w-[4.5rem] h-[4.5rem] sm:w-auto sm:h-auto sm:p-3 sm:items-start sm:text-left`}
            >
              <action.icon className="h-5 w-5 sm:mb-1.5" />
              <div className="text-[10px] sm:text-sm font-medium leading-tight mt-1 sm:mt-0">{action.name}</div>
            </Link>
          ))}
          <button
            onClick={handlePublishAllReady}
            disabled={publishingAll}
            className="bg-emerald-500 active:bg-emerald-600 disabled:opacity-60 text-white rounded-xl transition-colors flex-shrink-0 snap-start flex flex-col items-center justify-center text-center w-[4.5rem] h-[4.5rem] sm:w-auto sm:h-auto sm:p-3 sm:items-start sm:text-left"
          >
            {publishingAll ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 sm:mb-1.5" />}
            <div className="text-[10px] sm:text-sm font-medium leading-tight mt-1 sm:mt-0">
              {publishingAll ? "Publishing" : "Publish All"}
            </div>
          </button>
          <button
            onClick={handleSeedTopics}
            disabled={seedingTopics}
            className="bg-cyan-500 active:bg-cyan-600 disabled:opacity-60 text-white rounded-xl transition-colors flex-shrink-0 snap-start flex flex-col items-center justify-center text-center w-[4.5rem] h-[4.5rem] sm:w-auto sm:h-auto sm:p-3 sm:items-start sm:text-left"
          >
            {seedingTopics ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5 sm:mb-1.5" />}
            <div className="text-[10px] sm:text-sm font-medium leading-tight mt-1 sm:mt-0">
              {seedingTopics ? "Seeding" : "Gen Topics"}
            </div>
          </button>
          <button
            onClick={handleSeedContent}
            disabled={seedingContent}
            className="bg-rose-500 active:bg-rose-600 disabled:opacity-60 text-white rounded-xl transition-colors flex-shrink-0 snap-start flex flex-col items-center justify-center text-center w-[4.5rem] h-[4.5rem] sm:w-auto sm:h-auto sm:p-3 sm:items-start sm:text-left"
          >
            {seedingContent ? <Loader2 className="h-5 w-5 animate-spin" /> : <Database className="h-5 w-5 sm:mb-1.5" />}
            <div className="text-[10px] sm:text-sm font-medium leading-tight mt-1 sm:mt-0">
              {seedingContent ? "Seeding" : "Seed Content"}
            </div>
          </button>
          <button
            onClick={handleRunAllCrons}
            disabled={runningCrons}
            className="bg-orange-500 active:bg-orange-600 disabled:opacity-60 text-white rounded-xl transition-colors flex-shrink-0 snap-start flex flex-col items-center justify-center text-center w-[4.5rem] h-[4.5rem] sm:w-auto sm:h-auto sm:p-3 sm:items-start sm:text-left"
          >
            {runningCrons ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5 sm:mb-1.5" />}
            <div className="text-[10px] sm:text-sm font-medium leading-tight mt-1 sm:mt-0">
              {runningCrons ? "Running" : "Run Crons"}
            </div>
          </button>
        </div>
      </div>

      {/* Pipeline Status Flow */}
      <div className="mb-5 sm:mb-8">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2.5 sm:mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-purple-500" />
          Content Pipeline
        </h2>
        <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-6">
          <div className="grid grid-cols-4 gap-1 sm:flex sm:items-center sm:justify-center sm:gap-4">
            <div className="text-center">
              <div className="text-xl sm:text-3xl font-bold text-yellow-600">{pipelineCounts.topics}</div>
              <div className="text-[10px] sm:text-sm font-medium text-gray-600 mt-0.5 sm:mt-1">Topics</div>
            </div>
            <div className="text-center">
              <div className="text-xl sm:text-3xl font-bold text-blue-600">{pipelineCounts.drafts}</div>
              <div className="text-[10px] sm:text-sm font-medium text-gray-600 mt-0.5 sm:mt-1">Drafts</div>
            </div>
            <div className="text-center">
              <div className="text-xl sm:text-3xl font-bold text-green-600">{pipelineCounts.published}</div>
              <div className="text-[10px] sm:text-sm font-medium text-gray-600 mt-0.5 sm:mt-1">Published</div>
            </div>
            <Link href="/admin/indexing" className="text-center group">
              <div className={`text-xl sm:text-3xl font-bold ${
                indexingStats.indexed > 0 ? "text-emerald-600" : "text-gray-400"
              }`}>
                {indexingStats.indexed}
              </div>
              <div className="text-[10px] sm:text-sm font-medium text-gray-600 mt-0.5 sm:mt-1 group-hover:text-emerald-600 transition-colors">
                Indexed
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Indexing Status — compact inline on mobile */}
      <div className="mb-5 sm:mb-8">
        <div className="flex items-center justify-between mb-2.5 sm:mb-4">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Globe className="h-5 w-5 text-emerald-500" />
            Google Indexing
          </h2>
          <Link
            href="/admin/indexing"
            className="text-xs sm:text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            Details &rarr;
          </Link>
        </div>
        {/* Mobile: compact row of stats inside one card */}
        <div className="bg-white rounded-xl border border-gray-200 p-3 sm:hidden">
          <div className="grid grid-cols-5 gap-1 text-center">
            <div>
              <p className="text-lg font-bold text-emerald-600">{indexingStats.indexed}</p>
              <p className="text-[9px] font-medium text-gray-500">Indexed</p>
            </div>
            <div>
              <p className="text-lg font-bold text-blue-600">{indexingStats.submitted}</p>
              <p className="text-[9px] font-medium text-gray-500">Submitted</p>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-600">{indexingStats.discovered}</p>
              <p className="text-[9px] font-medium text-gray-500">Found</p>
            </div>
            <div>
              <p className={`text-lg font-bold ${indexingStats.errors > 0 ? "text-red-600" : "text-gray-400"}`}>{indexingStats.errors}</p>
              <p className="text-[9px] font-medium text-gray-500">Errors</p>
            </div>
            <div>
              <p className={`text-lg font-bold ${
                indexingStats.indexRate >= 70 ? "text-emerald-600" :
                indexingStats.indexRate >= 40 ? "text-yellow-600" : "text-red-600"
              }`}>{indexingStats.indexRate}%</p>
              <p className="text-[9px] font-medium text-gray-500">Rate</p>
            </div>
          </div>
        </div>
        {/* Desktop: full cards */}
        <div className="hidden sm:grid sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">Indexed</p>
                <p className="text-xl font-bold text-emerald-600">{indexingStats.indexed}</p>
              </div>
              <div className="p-2 bg-emerald-50 rounded-lg">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">Submitted</p>
                <p className="text-xl font-bold text-blue-600">{indexingStats.submitted}</p>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg">
                <Send className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">Discovered</p>
                <p className="text-xl font-bold text-gray-600">{indexingStats.discovered}</p>
              </div>
              <div className="p-2 bg-gray-50 rounded-lg">
                <Search className="h-4 w-4 text-gray-500" />
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">Errors</p>
                <p className={`text-xl font-bold ${indexingStats.errors > 0 ? "text-red-600" : "text-gray-400"}`}>
                  {indexingStats.errors}
                </p>
              </div>
              <div className={`p-2 rounded-lg ${indexingStats.errors > 0 ? "bg-red-50" : "bg-gray-50"}`}>
                <AlertCircle className={`h-4 w-4 ${indexingStats.errors > 0 ? "text-red-500" : "text-gray-400"}`} />
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">Index Rate</p>
                <p className={`text-xl font-bold ${
                  indexingStats.indexRate >= 70 ? "text-emerald-600" :
                  indexingStats.indexRate >= 40 ? "text-yellow-600" : "text-red-600"
                }`}>
                  {indexingStats.indexRate}%
                </p>
              </div>
              <div className="p-2 bg-purple-50 rounded-lg">
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
        {indexingStats.lastSubmitted && (
          <div className="mt-1.5 sm:mt-2 text-[10px] sm:text-xs text-gray-500 text-right">
            Last: {new Date(indexingStats.lastSubmitted).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* Cron Job Results (shown after Run All Crons) */}
      {cronResults && (
        <div className="mb-6 sm:mb-8">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-orange-500" />
            Last Cron Run Results
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {cronResults.map((job) => (
              <div key={job.name} className="p-3 sm:p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    job.ok ? "bg-green-500" : "bg-red-500"
                  }`} />
                  <span className="text-sm font-medium text-gray-900">{job.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {!job.ok && job.error && (
                    <span className="text-xs text-red-600 max-w-[200px] truncate hidden sm:block">
                      {job.error}
                    </span>
                  )}
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    job.ok
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}>
                    {job.ok ? "OK" : `Failed (${job.status || "timeout"})`}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => setCronResults(null)}
            className="mt-2 text-xs text-gray-500 hover:text-gray-700"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Multi-Site Overview */}
      {sites.length > 0 && (
        <div className="mb-5 sm:mb-8">
          <div className="flex items-center justify-between mb-2.5 sm:mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-500" />
              Your Sites
            </h2>
            <Link
              href="/admin/command-center/sites"
              className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Manage &rarr;
            </Link>
          </div>

          {/* Aggregate stats — compact 4-col on mobile */}
          <div className="grid grid-cols-4 gap-2 sm:gap-4 mb-3 sm:mb-4">
            {[
              { label: "Traffic", value: formatNumber(totalTraffic), color: "text-gray-900" },
              { label: "Revenue", value: `$${formatNumber(totalRevenue)}`, color: "text-green-600" },
              { label: "Articles", value: formatNumber(stats.totalArticles), color: "text-gray-900" },
              { label: "Leads", value: formatNumber(totalLeads), color: "text-gray-900" },
            ].map((stat) => (
              <div key={stat.label} className="bg-white p-2.5 sm:p-4 rounded-xl border border-gray-200">
                <p className="text-[10px] sm:text-xs font-medium text-gray-500">{stat.label}</p>
                <p className={`text-base sm:text-xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Sites list — tighter on mobile */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="divide-y divide-gray-100">
              {sites.map((site) => (
                <div key={site.siteId} className="px-3 py-2.5 sm:p-4 flex items-center justify-between active:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      site.locale === "ar" ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600"
                    }`}>
                      <Globe className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-sm text-gray-900 truncate">{site.siteName}</div>
                      <div className="text-[10px] sm:text-xs text-gray-500 truncate">{site.domain}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-6 flex-shrink-0">
                    <div className="text-right hidden sm:block">
                      <div className="text-sm font-medium">{formatNumber(site.traffic)}</div>
                      <div className="text-xs text-gray-500">visitors</div>
                    </div>
                    <div className="text-right hidden sm:block">
                      <div className="text-sm font-medium text-green-600">${formatNumber(site.revenue)}</div>
                      <div className="text-xs text-gray-500">revenue</div>
                    </div>
                    <span className={`px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium ${
                      site.status === "active" ? "bg-green-100 text-green-700" :
                      site.status === "paused" ? "bg-yellow-100 text-yellow-700" :
                      "bg-gray-100 text-gray-700"
                    }`}>
                      {site.status}
                    </span>
                    <ChevronRight className="h-4 w-4 text-gray-400 hidden sm:block" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Content Pipeline Stats — compact on mobile */}
      <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4 mb-5 sm:mb-8">
        {[
          { label: "Ready", value: stats.readyToPublish, icon: CheckCircle, color: "text-green-500" },
          { label: "Scheduled", value: stats.scheduledContent, icon: Calendar, color: "text-blue-500" },
          { label: "Topics", value: stats.totalTopics, icon: Lightbulb, color: "text-yellow-500" },
          { label: "SEO", value: `${stats.seoScore}%`, icon: TrendingUp, color: "text-green-500" },
          { label: "Automation", value: stats.automationJobs, icon: Zap, color: "text-orange-500" },
          { label: "Queue", value: systemStatus?.contentQueue ?? 0, icon: Activity, color: "text-indigo-500" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white p-2.5 sm:p-4 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs font-medium text-gray-500">{stat.label}</p>
                <p className="text-base sm:text-xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <stat.icon className={`h-4 w-4 sm:h-6 sm:w-6 ${stat.color} flex-shrink-0`} />
            </div>
          </div>
        ))}
      </div>

      {/* Information Hub Stats */}
      <div className="mb-5 sm:mb-8">
        <div className="flex items-center justify-between mb-2.5 sm:mb-4">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-500" />
            Info Hub
          </h2>
          <Link
            href="/admin/information"
            className="text-xs sm:text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Manage &rarr;
          </Link>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-4 gap-2 sm:gap-4">
          <div className="bg-white p-2.5 sm:p-4 rounded-xl border border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] sm:text-xs font-medium text-gray-500">Articles</p>
                <p className="text-base sm:text-xl font-bold text-gray-900">
                  {infoHubStats.publishedArticles}
                  <span className="text-[10px] sm:text-sm font-normal text-gray-400">/{infoHubStats.totalArticles}</span>
                </p>
              </div>
              <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-500 hidden sm:block flex-shrink-0" />
            </div>
          </div>
          <div className="bg-white p-2.5 sm:p-4 rounded-xl border border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] sm:text-xs font-medium text-gray-500">Sections</p>
                <p className="text-base sm:text-xl font-bold text-gray-900">
                  {infoHubStats.publishedSections}
                  <span className="text-[10px] sm:text-sm font-normal text-gray-400">/{infoHubStats.totalSections}</span>
                </p>
              </div>
              <Layers className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-500 hidden sm:block flex-shrink-0" />
            </div>
          </div>
          <div className="bg-white p-2.5 sm:p-4 rounded-xl border border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] sm:text-xs font-medium text-gray-500">Drafts</p>
                <p className="text-base sm:text-xl font-bold text-gray-900">{infoHubStats.draftArticles}</p>
              </div>
              <Edit3 className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 hidden sm:block flex-shrink-0" />
            </div>
          </div>
          <div className="bg-white p-2.5 sm:p-4 rounded-xl border border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] sm:text-xs font-medium text-gray-500">SEO</p>
                <p className="text-base sm:text-xl font-bold text-gray-900">{infoHubStats.avgSeoScore}%</p>
              </div>
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-500 hidden sm:block flex-shrink-0" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Panels: Ready to Publish + What's Next */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
        {/* Ready to Publish */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Ready to Publish
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              Articles ready for immediate publishing
            </p>
          </div>
          <div className="p-4 sm:p-6">
            <div className="space-y-3 sm:space-y-4">
              {readyToPublishItems.length === 0 ? (
                <p className="text-gray-500 text-center py-4 text-sm">
                  No draft articles yet
                </p>
              ) : (
                readyToPublishItems.map((item: any) => (
                  <div key={item.id} className="p-3 sm:p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-start sm:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 text-sm sm:text-base truncate">
                          {item.title}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-1 text-xs sm:text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <span className={`w-2 h-2 rounded-full ${item.locale === "en" ? "bg-blue-500" : "bg-green-500"}`}></span>
                            {item.locale.toUpperCase()}
                          </span>
                          {item.seoScore > 0 && (
                            <span className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              {item.seoScore}%
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(item.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <Link
                        href={`/admin/editor?slug=${item.slug}`}
                        className="px-3 py-1.5 sm:px-4 sm:py-2 bg-green-500 text-white text-xs sm:text-sm rounded-md hover:bg-green-600 transition-colors whitespace-nowrap flex-shrink-0"
                      >
                        Edit
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* What's Next */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              What&apos;s Next
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              Upcoming content generation events
            </p>
          </div>
          <div className="p-4 sm:p-6">
            <div className="space-y-3 sm:space-y-4">
              {upcomingGeneration.length === 0 ? (
                <p className="text-gray-500 text-center py-4 text-sm">
                  No upcoming topics in pipeline
                </p>
              ) : (
                upcomingGeneration.map((item: any) => (
                  <div key={item.id} className="p-3 sm:p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-start sm:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 text-sm sm:text-base truncate">
                          {item.title}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-1 text-xs sm:text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <span className={`w-2 h-2 rounded-full ${item.locale === "en" ? "bg-blue-500" : "bg-green-500"}`}></span>
                            {item.locale.toUpperCase()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Brain className="h-3 w-3" />
                            {item.pageType || "guide"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Zap className="h-3 w-3" />
                            {item.status}
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-xs sm:text-sm font-medium text-gray-900">
                          {new Date(item.plannedAt).toLocaleDateString()}
                        </div>
                        <div className="text-[10px] sm:text-xs text-gray-500 truncate max-w-[80px]">
                          {item.keyword}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* System Connections — collapsible on mobile */}
      <CollapsibleSystemConnections />

      {/* Feature Hub - Collapsible on mobile */}
      <FeatureHubSection />
    </div>
  );
}

function CollapsibleSystemConnections() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-5 sm:mt-8 mb-5 sm:mb-8">
      <div className="flex items-center justify-between mb-2.5 sm:mb-4">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 sm:pointer-events-none"
        >
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Monitor className="h-5 w-5 text-emerald-500" />
            System Connections
          </h2>
          <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform sm:hidden ${open ? "rotate-180" : ""}`} />
        </button>
        <Link
          href="/admin/health-monitoring"
          className="text-xs sm:text-sm text-emerald-600 hover:text-emerald-700 font-medium"
        >
          Health Monitor &rarr;
        </Link>
      </div>
      <div className={`${open ? "block" : "hidden"} sm:block`}>
        <SystemConnections />
      </div>
    </div>
  );
}

function SystemConnections() {
  const [checks, setChecks] = useState<Record<string, "pass" | "fail" | "warn" | "checking">>({});
  const [details, setDetails] = useState<Record<string, string>>({});
  const [passCount, setPassCount] = useState(0);
  const [warnCount, setWarnCount] = useState(0);
  const [failCount, setFailCount] = useState(0);

  useEffect(() => {
    runChecks();
  }, []);

  const runChecks = async () => {
    const allKeys = [
      "database", "ga4", "ai", "seo", "pages", "assets",
      "contentPipeline", "scheduledPublish", "weeklyTopics",
      "trendsMonitor", "analyticsCron", "seoAgent",
    ];
    const initial: Record<string, "checking"> = {};
    allKeys.forEach((k) => (initial[k] = "checking"));
    setChecks(initial);

    // Run all checks in parallel
    const [healthRes, homeRes, aiRes, sitemapRes, contentRes, publishRes, topicsRes, trendsRes, analyticsRes, seoAgentRes] = await Promise.all([
      fetch("/api/health").catch(() => null),
      fetch("/").catch(() => null),
      fetch("/api/ai/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(() => null),
      fetch("/sitemap.xml").catch(() => null),
      fetch("/api/cron/daily-content-generate?healthcheck=true").catch(() => null),
      fetch("/api/cron/scheduled-publish").catch(() => null),
      fetch("/api/cron/weekly-topics").catch(() => null),
      fetch("/api/cron/trends-monitor?healthcheck=true").catch(() => null),
      fetch("/api/cron/analytics").catch(() => null),
      fetch("/api/cron/seo-agent?healthcheck=true").catch(() => null),
    ]);

    const results: Record<string, "pass" | "fail" | "warn"> = {};
    const info: Record<string, string> = {};

    // Database - use /api/health endpoint
    if (healthRes) {
      try {
        const health = await healthRes.json();
        const dbCheck = health.checks?.find((c: any) => c.name === "database");
        results.database = dbCheck?.status === "pass" ? "pass" : "fail";
      } catch {
        results.database = "fail";
      }
    } else {
      results.database = "fail";
    }

    // GA4 + Pages + Assets from homepage
    if (homeRes?.ok) {
      const html = await homeRes.text().catch(() => "");
      const gaMatch = html.match(/G-[A-Z0-9]{8,12}/);
      results.ga4 = gaMatch ? "pass" : "fail";
      if (gaMatch) info.ga4 = gaMatch[0];
      results.pages = "pass";
      results.assets = html.includes("<link") ? "pass" : "fail";
    } else {
      results.ga4 = "fail";
      results.pages = "fail";
      results.assets = "fail";
    }

    // AI - any response (401/403/400/200) means endpoint exists
    results.ai = aiRes && (aiRes.status === 401 || aiRes.status === 403 || aiRes.status === 400 || aiRes.ok) ? "pass" : "fail";
    if (results.ai === "pass") info.ai = "Auth-protected";

    // SEO - check if sitemap exists
    results.seo = sitemapRes?.ok ? "pass" : "fail";

    // Content Pipeline
    if (contentRes) {
      try {
        const data = await contentRes.json();
        if (data.status === "healthy") {
          results.contentPipeline = "pass";
          info.contentPipeline = `${data.sites || 0} sites · Last: ${data.lastRun?.status || "n/a"}`;
        } else {
          results.contentPipeline = contentRes.ok ? "pass" : "warn";
        }
      } catch {
        results.contentPipeline = contentRes.ok || contentRes.status === 401 ? "warn" : "fail";
        if (contentRes.status === 401) info.contentPipeline = "Auth required";
      }
    } else {
      results.contentPipeline = "fail";
    }

    // Scheduled Publish
    if (publishRes) {
      try {
        const data = await publishRes.json();
        results.scheduledPublish = data.success || publishRes.ok ? "pass" : "warn";
        if (data.published_count !== undefined) info.scheduledPublish = `${data.published_count} published`;
      } catch {
        results.scheduledPublish = publishRes.ok || publishRes.status === 401 ? "warn" : "fail";
        if (publishRes.status === 401) info.scheduledPublish = "Auth required";
      }
    } else {
      results.scheduledPublish = "fail";
    }

    // Weekly Topics
    if (topicsRes) {
      try {
        const data = await topicsRes.json();
        results.weeklyTopics = data.status === "healthy" || topicsRes.ok ? "pass" : "warn";
        if (data.pendingTopics !== undefined) info.weeklyTopics = `${data.pendingTopics} pending`;
      } catch {
        results.weeklyTopics = topicsRes.ok || topicsRes.status === 401 ? "warn" : "fail";
        if (topicsRes.status === 401) info.weeklyTopics = "Auth required";
      }
    } else {
      results.weeklyTopics = "fail";
    }

    // Trends Monitor
    if (trendsRes) {
      try {
        const data = await trendsRes.json();
        results.trendsMonitor = data.status === "healthy" || trendsRes.ok ? "pass" : "warn";
        if (data.monitoredKeywords) info.trendsMonitor = `${data.monitoredKeywords} keywords`;
      } catch {
        results.trendsMonitor = trendsRes.ok || trendsRes.status === 401 ? "warn" : "fail";
        if (trendsRes.status === 401) info.trendsMonitor = "Auth required";
      }
    } else {
      results.trendsMonitor = "fail";
    }

    // Analytics Cron
    if (analyticsRes) {
      try {
        const data = await analyticsRes.json();
        results.analyticsCron = data.success || analyticsRes.ok ? "pass" : "warn";
        if (data.results?.ga4?.pageViews) info.analyticsCron = `${data.results.ga4.pageViews.toLocaleString()} views`;
      } catch {
        results.analyticsCron = analyticsRes.ok || analyticsRes.status === 401 ? "warn" : "fail";
        if (analyticsRes.status === 401) info.analyticsCron = "Auth required";
      }
    } else {
      results.analyticsCron = "fail";
    }

    // SEO Agent
    if (seoAgentRes) {
      try {
        const data = await seoAgentRes.json();
        results.seoAgent = data.status === "healthy" || seoAgentRes.ok ? "pass" : "warn";
        if (data.lastRun?.status) info.seoAgent = `Last: ${data.lastRun.status}`;
      } catch {
        results.seoAgent = seoAgentRes.ok || seoAgentRes.status === 401 ? "warn" : "fail";
        if (seoAgentRes.status === 401) info.seoAgent = "Auth required";
      }
    } else {
      results.seoAgent = "fail";
    }

    // Count totals
    const vals = Object.values(results);
    setPassCount(vals.filter((v) => v === "pass").length);
    setWarnCount(vals.filter((v) => v === "warn").length);
    setFailCount(vals.filter((v) => v === "fail").length);
    setDetails(info);
    setChecks(results);
  };

  const coreConnections = [
    { key: "database", label: "Database", icon: Database },
    { key: "ga4", label: "GA4 Analytics", icon: BarChart3 },
    { key: "ai", label: "AI Provider", icon: Brain },
    { key: "seo", label: "SEO / Sitemap", icon: Search },
    { key: "pages", label: "Core Pages", icon: Globe },
    { key: "assets", label: "Static Assets", icon: Image },
  ];

  const pipelineConnections = [
    { key: "contentPipeline", label: "Content Pipeline", icon: Edit3 },
    { key: "scheduledPublish", label: "Scheduled Publish", icon: Clock },
    { key: "weeklyTopics", label: "Weekly Topics", icon: Lightbulb },
    { key: "trendsMonitor", label: "Trends Monitor", icon: TrendingUp },
    { key: "analyticsCron", label: "Analytics Sync", icon: Activity },
    { key: "seoAgent", label: "SEO Agent", icon: Target },
  ];

  const isRunning = Object.values(checks).some((v) => v === "checking");
  const totalChecks = passCount + warnCount + failCount;

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      {totalChecks > 0 && (
        <div className="flex items-center gap-4 text-sm">
          <span className="text-green-600 font-semibold">{passCount} passed</span>
          {warnCount > 0 && <span className="text-yellow-600 font-semibold">{warnCount} warnings</span>}
          {failCount > 0 && <span className="text-red-500 font-semibold">{failCount} failed</span>}
          <span className="text-gray-400">of {totalChecks} checks</span>
          <button
            onClick={() => runChecks()}
            className="ml-auto text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <RefreshCw className={`h-3 w-3 ${isRunning ? "animate-spin" : ""}`} /> Re-run
          </button>
        </div>
      )}

      {/* Core Infrastructure */}
      <div>
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Core Infrastructure</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {coreConnections.map(({ key, label, icon: Icon }) => {
            const status = checks[key] || "checking";
            return (
              <div key={key} className="bg-white p-3 rounded-xl border border-gray-200 text-center">
                <Icon className={`h-5 w-5 mx-auto mb-1.5 ${
                  status === "pass" ? "text-green-500" :
                  status === "fail" ? "text-red-400" :
                  status === "warn" ? "text-yellow-500" : "text-gray-300"
                }`} />
                <div className="text-xs font-medium text-gray-700">{label}</div>
                {details[key] && <div className="text-[9px] text-gray-400 mt-0.5 truncate">{details[key]}</div>}
                <div className={`text-[10px] font-semibold mt-1 ${
                  status === "pass" ? "text-green-600" :
                  status === "fail" ? "text-red-500" :
                  status === "warn" ? "text-yellow-600" : "text-gray-400"
                }`}>
                  {status === "checking" ? "Checking..." : status === "pass" ? "Connected" : status === "warn" ? "Warning" : "Offline"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Content Pipeline & Crons */}
      <div>
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Content Pipeline &amp; Crons</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {pipelineConnections.map(({ key, label, icon: Icon }) => {
            const status = checks[key] || "checking";
            return (
              <div key={key} className="bg-white p-3 rounded-xl border border-gray-200 text-center">
                <Icon className={`h-5 w-5 mx-auto mb-1.5 ${
                  status === "pass" ? "text-green-500" :
                  status === "fail" ? "text-red-400" :
                  status === "warn" ? "text-yellow-500" : "text-gray-300"
                }`} />
                <div className="text-xs font-medium text-gray-700">{label}</div>
                {details[key] && <div className="text-[9px] text-gray-400 mt-0.5 truncate">{details[key]}</div>}
                <div className={`text-[10px] font-semibold mt-1 ${
                  status === "pass" ? "text-green-600" :
                  status === "fail" ? "text-red-500" :
                  status === "warn" ? "text-yellow-600" : "text-gray-400"
                }`}>
                  {status === "checking" ? "Checking..." : status === "pass" ? "Healthy" : status === "warn" ? "Warning" : "Offline"}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function FeatureHubSection() {
  const [featureHubOpen, setFeatureHubOpen] = useState(false);

  const featureGroups = [
    { title: "Content & AI", items: [
      { name: "Articles", href: "/admin/articles", icon: FileText },
      { name: "Editor", href: "/admin/editor", icon: Edit3 },
      { name: "Topics Pipeline", href: "/admin/topics-pipeline", icon: Lightbulb },
      { name: "AI Studio", href: "/admin/ai-studio", icon: Brain },
      { name: "AI Prompts", href: "/admin/prompts", icon: Sparkles },
      { name: "Content Types", href: "/admin/content-types", icon: Layers },
      { name: "Information Hub", href: "/admin/information", icon: BookOpen },
      { name: "PDF Generator", href: "/admin/pdf-generator", icon: FileText },
    ]},
    { title: "SEO & Analytics", items: [
      { name: "SEO Dashboard", href: "/admin/seo", icon: Search },
      { name: "SEO Audits", href: "/admin/seo-audits", icon: Target },
      { name: "SEO Command", href: "/admin/seo-command", icon: BarChart3 },
      { name: "Analytics", href: "/admin/command-center/analytics", icon: TrendingUp },
      { name: "Sync Status", href: "/admin/sync-status", icon: RefreshCw },
    ]},
    { title: "Media & Design", items: [
      { name: "Media Library", href: "/admin/media", icon: Image },
      { name: "Photo Pool", href: "/admin/photo-pool", icon: Image },
      { name: "Video Studio", href: "/admin/video-studio", icon: Video },
      { name: "Design Studio", href: "/admin/design-studio", icon: Palette },
      { name: "Brand Assets", href: "/admin/brand-assets", icon: Palette },
    ]},
    { title: "Automation & Workflows", items: [
      { name: "Automation Hub", href: "/admin/automation-hub", icon: Zap },
      { name: "Pipeline", href: "/admin/pipeline", icon: Activity },
      { name: "Workflow", href: "/admin/workflow", icon: Workflow },
      { name: "Autopilot", href: "/admin/command-center/autopilot", icon: Brain },
      { name: "Operations", href: "/admin/operations", icon: Settings },
    ]},
    { title: "Revenue & Affiliates", items: [
      { name: "Affiliates", href: "/admin/affiliates", icon: DollarSign },
      { name: "Affiliate Links", href: "/admin/affiliate-links", icon: Globe },
      { name: "Affiliate Pool", href: "/admin/affiliate-pool", icon: Users },
      { name: "Shop", href: "/admin/shop", icon: ShoppingBag },
      { name: "Transactions", href: "/admin/transactions", icon: DollarSign },
      { name: "Billing", href: "/admin/billing", icon: DollarSign },
    ]},
    { title: "Settings & Security", items: [
      { name: "Variable Vault", href: "/admin/variable-vault", icon: Key },
      { name: "API Keys", href: "/admin/command-center/settings/api-keys", icon: Key },
      { name: "API Security", href: "/admin/api-security", icon: Shield },
      { name: "Feature Flags", href: "/admin/feature-flags", icon: Flag },
      { name: "Site Settings", href: "/admin/site", icon: Settings },
      { name: "Audit Logs", href: "/admin/audit-logs", icon: Shield },
      { name: "Team", href: "/admin/team", icon: Users },
      { name: "CRM", href: "/admin/crm", icon: Users },
      { name: "WordPress Sync", href: "/admin/wordpress", icon: Globe },
    ]},
  ];

  return (
    <div className="mb-5 sm:mb-8">
      {/* Mobile: collapsible toggle */}
      <button
        onClick={() => setFeatureHubOpen(!featureHubOpen)}
        className="w-full flex items-center justify-between mb-2.5 sm:mb-4 sm:pointer-events-none"
      >
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Zap className="h-5 w-5 text-orange-500" />
          Feature Hub
        </h2>
        <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform sm:hidden ${featureHubOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Always visible on sm+, toggle on mobile */}
      <div className={`${featureHubOpen ? "block" : "hidden"} sm:block`}>
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {featureGroups.map((group) => (
            <FeatureGroup key={group.title} title={group.title} items={group.items} />
          ))}
        </div>
      </div>
    </div>
  );
}

function FeatureGroup({ title, items }: { title: string; items: { name: string; href: string; icon: any }[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4">
      <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 sm:mb-3">{title}</h3>
      <div className="space-y-0.5 sm:space-y-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs sm:text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <item.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
            {item.name}
          </Link>
        ))}
      </div>
    </div>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
}
