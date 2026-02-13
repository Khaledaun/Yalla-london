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
  AlertCircle,
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
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
              <Home className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500 flex-shrink-0" />
              Dashboard
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              Multi-site command center &mdash; {sites.length > 0 ? `${sites.length} sites` : "all sites"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* System status */}
            {systemStatus && (
              <span className={`flex items-center gap-1.5 text-xs sm:text-sm font-medium px-3 py-1.5 rounded-full ${
                systemStatus.aiStatus === "online"
                  ? "bg-green-50 text-green-700"
                  : systemStatus.aiStatus === "degraded"
                    ? "bg-yellow-50 text-yellow-700"
                    : "bg-red-50 text-red-700"
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  systemStatus.aiStatus === "online" ? "bg-green-500 animate-pulse" :
                  systemStatus.aiStatus === "degraded" ? "bg-yellow-500" : "bg-red-500"
                }`} />
                AI {systemStatus.aiStatus}
              </span>
            )}
            <button
              onClick={loadData}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4 text-gray-500" />
            </button>
            <div className="text-right hidden sm:block">
              <div className="text-xs text-gray-500">Last updated</div>
              <div className="text-xs font-medium text-gray-900">
                {new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-6 sm:mb-8">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          {[
            { name: "New Article", href: "/admin/editor", icon: Edit3, color: "bg-blue-500 hover:bg-blue-600", desc: "Write or paste from Word" },
            { name: "Add Topic", href: "/admin/topics", icon: Lightbulb, color: "bg-green-500 hover:bg-green-600", desc: "Add to content pipeline" },
            { name: "AI Studio", href: "/admin/ai-studio", icon: Brain, color: "bg-purple-500 hover:bg-purple-600", desc: "Manage prompts & models" },
            { name: "SEO Audit", href: "/admin/seo", icon: Search, color: "bg-yellow-500 hover:bg-yellow-600", desc: "Run SEO analysis" },
            { name: "New Site", href: "/admin/command-center/sites/new", icon: Plus, color: "bg-indigo-500 hover:bg-indigo-600", desc: "Launch a new domain" },
          ].map((action) => (
            <Link
              key={action.name}
              href={action.href}
              className={`${action.color} text-white p-3 sm:p-4 rounded-xl transition-colors active:opacity-90`}
            >
              <action.icon className="h-5 w-5 sm:h-6 sm:w-6 mb-1 sm:mb-2" />
              <div className="text-sm sm:text-base font-medium leading-tight">{action.name}</div>
              <div className="text-xs opacity-80 hidden sm:block mt-0.5">{action.desc}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* Multi-Site Overview */}
      {sites.length > 0 && (
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
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

          {/* Multi-site aggregate stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
            <div className="bg-white p-3 sm:p-4 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500">Total Traffic</p>
                  <p className="text-lg sm:text-xl font-bold text-gray-900">{formatNumber(totalTraffic)}</p>
                </div>
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Activity className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </div>
            <div className="bg-white p-3 sm:p-4 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500">Revenue (MTD)</p>
                  <p className="text-lg sm:text-xl font-bold text-green-600">${formatNumber(totalRevenue)}</p>
                </div>
                <div className="p-2 bg-green-50 rounded-lg">
                  <DollarSign className="h-4 w-4 text-green-600" />
                </div>
              </div>
            </div>
            <div className="bg-white p-3 sm:p-4 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500">Total Articles</p>
                  <p className="text-lg sm:text-xl font-bold text-gray-900">{formatNumber(stats.totalArticles)}</p>
                </div>
                <div className="p-2 bg-purple-50 rounded-lg">
                  <FileText className="h-4 w-4 text-purple-600" />
                </div>
              </div>
            </div>
            <div className="bg-white p-3 sm:p-4 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500">Leads</p>
                  <p className="text-lg sm:text-xl font-bold text-gray-900">{formatNumber(totalLeads)}</p>
                </div>
                <div className="p-2 bg-amber-50 rounded-lg">
                  <Sparkles className="h-4 w-4 text-amber-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Sites list */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="divide-y divide-gray-100">
              {sites.map((site) => (
                <div key={site.siteId} className="p-3 sm:p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center ${
                      site.locale === "ar" ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600"
                    }`}>
                      <Globe className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div>
                      <div className="font-medium text-sm sm:text-base text-gray-900">{site.siteName}</div>
                      <div className="text-xs text-gray-500">{site.domain}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 sm:gap-6">
                    <div className="text-right hidden sm:block">
                      <div className="text-sm font-medium">{formatNumber(site.traffic)}</div>
                      <div className="text-xs text-gray-500">visitors</div>
                    </div>
                    <div className="text-right hidden sm:block">
                      <div className="text-sm font-medium text-green-600">${formatNumber(site.revenue)}</div>
                      <div className="text-xs text-gray-500">revenue</div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
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

      {/* Content Pipeline Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
        <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">Ready to Publish</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.readyToPublish}</p>
            </div>
            <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 flex-shrink-0" />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">Scheduled</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.scheduledContent}</p>
            </div>
            <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 flex-shrink-0" />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">Active Topics</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.totalTopics}</p>
            </div>
            <Lightbulb className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500 flex-shrink-0" />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">SEO Score</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.seoScore}%</p>
            </div>
            <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 flex-shrink-0" />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">Automation Jobs</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.automationJobs}</p>
            </div>
            <Zap className="h-6 w-6 sm:h-8 sm:w-8 text-orange-500 flex-shrink-0" />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">Content Queue</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{systemStatus?.contentQueue ?? 0}</p>
            </div>
            <Activity className="h-6 w-6 sm:h-8 sm:w-8 text-indigo-500 flex-shrink-0" />
          </div>
        </div>
      </div>

      {/* Information Hub Stats */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-500" />
            Information Hub
          </h2>
          <Link
            href="/admin/information"
            className="text-xs sm:text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Manage &rarr;
          </Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-3 sm:p-5 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Articles</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">
                  {infoHubStats.publishedArticles}
                  <span className="text-xs sm:text-sm font-normal text-gray-500">/{infoHubStats.totalArticles}</span>
                </p>
              </div>
              <FileText className="h-5 w-5 sm:h-7 sm:w-7 text-indigo-500 flex-shrink-0" />
            </div>
          </div>

          <div className="bg-white p-3 sm:p-5 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Sections</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">
                  {infoHubStats.publishedSections}
                  <span className="text-xs sm:text-sm font-normal text-gray-500">/{infoHubStats.totalSections}</span>
                </p>
              </div>
              <Layers className="h-5 w-5 sm:h-7 sm:w-7 text-indigo-500 flex-shrink-0" />
            </div>
          </div>

          <div className="bg-white p-3 sm:p-5 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Drafts</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{infoHubStats.draftArticles}</p>
              </div>
              <Edit3 className="h-5 w-5 sm:h-7 sm:w-7 text-yellow-500 flex-shrink-0" />
            </div>
          </div>

          <div className="bg-white p-3 sm:p-5 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">SEO Score</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{infoHubStats.avgSeoScore}%</p>
              </div>
              <TrendingUp className="h-5 w-5 sm:h-7 sm:w-7 text-indigo-500 flex-shrink-0" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Panels: Ready to Publish + What's Next */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
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

      {/* System Connections */}
      <div className="mt-6 sm:mt-8 mb-6 sm:mb-8">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Monitor className="h-5 w-5 text-emerald-500" />
            System Connections
          </h2>
          <Link
            href="/admin/health-monitoring"
            className="text-xs sm:text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            Health Monitor &rarr;
          </Link>
        </div>
        <SystemConnections />
      </div>

      {/* Feature Hub - All Admin Features */}
      <div className="mb-6 sm:mb-8">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5 text-orange-500" />
          Feature Hub
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Content & AI */}
          <FeatureGroup title="Content & AI" items={[
            { name: "Articles", href: "/admin/articles", icon: FileText },
            { name: "Editor", href: "/admin/editor", icon: Edit3 },
            { name: "Topics Pipeline", href: "/admin/topics-pipeline", icon: Lightbulb },
            { name: "AI Studio", href: "/admin/ai-studio", icon: Brain },
            { name: "AI Prompts", href: "/admin/prompts", icon: Sparkles },
            { name: "Content Types", href: "/admin/content-types", icon: Layers },
            { name: "Information Hub", href: "/admin/information", icon: BookOpen },
            { name: "PDF Generator", href: "/admin/pdf-generator", icon: FileText },
          ]} />

          {/* SEO & Analytics */}
          <FeatureGroup title="SEO & Analytics" items={[
            { name: "SEO Dashboard", href: "/admin/seo", icon: Search },
            { name: "SEO Audits", href: "/admin/seo-audits", icon: Target },
            { name: "SEO Command", href: "/admin/seo-command", icon: BarChart3 },
            { name: "Analytics", href: "/admin/command-center/analytics", icon: TrendingUp },
            { name: "Sync Status", href: "/admin/sync-status", icon: RefreshCw },
          ]} />

          {/* Media & Design */}
          <FeatureGroup title="Media & Design" items={[
            { name: "Media Library", href: "/admin/media", icon: Image },
            { name: "Photo Pool", href: "/admin/photo-pool", icon: Image },
            { name: "Video Studio", href: "/admin/video-studio", icon: Video },
            { name: "Design Studio", href: "/admin/design-studio", icon: Palette },
            { name: "Brand Assets", href: "/admin/brand-assets", icon: Palette },
          ]} />

          {/* Automation & Workflows */}
          <FeatureGroup title="Automation & Workflows" items={[
            { name: "Automation Hub", href: "/admin/automation-hub", icon: Zap },
            { name: "Pipeline", href: "/admin/pipeline", icon: Activity },
            { name: "Workflow", href: "/admin/workflow", icon: Workflow },
            { name: "Autopilot", href: "/admin/command-center/autopilot", icon: Brain },
            { name: "Operations", href: "/admin/operations", icon: Settings },
          ]} />

          {/* Revenue & Affiliates */}
          <FeatureGroup title="Revenue & Affiliates" items={[
            { name: "Affiliates", href: "/admin/affiliates", icon: DollarSign },
            { name: "Affiliate Links", href: "/admin/affiliate-links", icon: Globe },
            { name: "Affiliate Pool", href: "/admin/affiliate-pool", icon: Users },
            { name: "Shop", href: "/admin/shop", icon: ShoppingBag },
            { name: "Transactions", href: "/admin/transactions", icon: DollarSign },
            { name: "Billing", href: "/admin/billing", icon: DollarSign },
          ]} />

          {/* Settings & Security */}
          <FeatureGroup title="Settings & Security" items={[
            { name: "Variable Vault", href: "/admin/variable-vault", icon: Key },
            { name: "API Keys", href: "/admin/command-center/settings/api-keys", icon: Key },
            { name: "API Security", href: "/admin/api-security", icon: Shield },
            { name: "Feature Flags", href: "/admin/feature-flags", icon: Flag },
            { name: "Site Settings", href: "/admin/site", icon: Settings },
            { name: "Audit Logs", href: "/admin/audit-logs", icon: Shield },
            { name: "Team", href: "/admin/team", icon: Users },
            { name: "CRM", href: "/admin/crm", icon: Users },
            { name: "WordPress Sync", href: "/admin/wordpress", icon: Globe },
          ]} />
        </div>
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

function FeatureGroup({ title, items }: { title: string; items: { name: string; href: string; icon: any }[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{title}</h3>
      <div className="space-y-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            <item.icon className="h-4 w-4 text-gray-400" />
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
