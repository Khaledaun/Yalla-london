"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Home,
  FileText,
  Lightbulb,
  Edit3,
  Search,
  Settings,
  Brain,
  Shield,
  Flag,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Users,
  Eye,
  Calendar,
  Zap,
  BookOpen,
  Layers,
} from "lucide-react";

export default function AdminCommandCenter() {
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

  const [error, setError] = useState<string | null>(null);
  const [readyToPublishItems, setReadyToPublishItems] = useState<any[]>([]);
  const [upcomingGeneration, setUpcomingGeneration] = useState<any[]>([]);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const res = await fetch("/api/admin/dashboard");
        if (!res.ok) {
          throw new Error(`Failed to fetch dashboard: ${res.status}`);
        }
        const data = await res.json();
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
      } catch (err) {
        console.error("Dashboard fetch error:", err);
        setError("Failed to load dashboard data");
      } finally {
        setIsLoading(false);
      }
    }
    fetchDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900">
            Loading Command Center...
          </h2>
          <p className="text-gray-600">
            Please wait while we fetch your dashboard data.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">
            Dashboard Error
          </h2>
          <p className="text-gray-600 mt-2">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const quickActions = [
    {
      name: "Create New Article",
      href: "/admin/editor",
      icon: Edit3,
      color: "bg-blue-500 hover:bg-blue-600",
      description: "Start writing or paste from Word",
    },
    {
      name: "Add Topic",
      href: "/admin/topics",
      icon: Lightbulb,
      color: "bg-green-500 hover:bg-green-600",
      description: "Add new topic to pipeline",
    },
    {
      name: "AI Studio",
      href: "/admin/ai-studio",
      icon: Brain,
      color: "bg-purple-500 hover:bg-purple-600",
      description: "Manage prompts and models",
    },
    {
      name: "SEO Audit",
      href: "/admin/seo",
      icon: Search,
      color: "bg-yellow-500 hover:bg-yellow-600",
      description: "Run SEO analysis",
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
              <Home className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500 flex-shrink-0" />
              Command Center
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              Complete control over your website and automation
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs sm:text-sm text-gray-500">Last updated</div>
              <div className="text-xs sm:text-sm font-medium text-gray-900">
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
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {quickActions.map((action) => (
            <a
              key={action.name}
              href={action.href}
              className={`${action.color} text-white p-3 sm:p-4 rounded-lg transition-colors duration-200 active:opacity-90`}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                <action.icon className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
                <div>
                  <div className="text-sm sm:text-base font-medium leading-tight">{action.name}</div>
                  <div className="text-xs sm:text-sm opacity-90 hidden sm:block">{action.description}</div>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
        <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">
                Ready to Publish
              </p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {stats.readyToPublish}
              </p>
            </div>
            <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 flex-shrink-0" />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">
                Scheduled
              </p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {stats.scheduledContent}
              </p>
            </div>
            <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 flex-shrink-0" />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">
                Total Articles
              </p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {stats.totalArticles}
              </p>
            </div>
            <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500 flex-shrink-0" />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">Active Topics</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {stats.totalTopics}
              </p>
            </div>
            <Lightbulb className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500 flex-shrink-0" />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">
                SEO Score
              </p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {stats.seoScore}%
              </p>
            </div>
            <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 flex-shrink-0" />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">
                Automation
              </p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {stats.automationJobs}
              </p>
            </div>
            <Zap className="h-6 w-6 sm:h-8 sm:w-8 text-orange-500 flex-shrink-0" />
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
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-3 sm:p-5 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  Articles
                </p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">
                  {infoHubStats.publishedArticles}
                  <span className="text-xs sm:text-sm font-normal text-gray-500">
                    /{infoHubStats.totalArticles}
                  </span>
                </p>
              </div>
              <FileText className="h-5 w-5 sm:h-7 sm:w-7 text-indigo-500 flex-shrink-0" />
            </div>
          </div>

          <div className="bg-white p-3 sm:p-5 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  Sections
                </p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">
                  {infoHubStats.publishedSections}
                  <span className="text-xs sm:text-sm font-normal text-gray-500">
                    /{infoHubStats.totalSections}
                  </span>
                </p>
              </div>
              <Layers className="h-5 w-5 sm:h-7 sm:w-7 text-indigo-500 flex-shrink-0" />
            </div>
          </div>

          <div className="bg-white p-3 sm:p-5 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  Drafts
                </p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">
                  {infoHubStats.draftArticles}
                </p>
              </div>
              <Edit3 className="h-5 w-5 sm:h-7 sm:w-7 text-yellow-500 flex-shrink-0" />
            </div>
          </div>

          <div className="bg-white p-3 sm:p-5 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  SEO Score
                </p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">
                  {infoHubStats.avgSeoScore}%
                </p>
              </div>
              <TrendingUp className="h-5 w-5 sm:h-7 sm:w-7 text-indigo-500 flex-shrink-0" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
        {/* Ready to Publish */}
        <div className="bg-white rounded-lg border border-gray-200">
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
                  <div
                    key={item.id}
                    className="p-3 sm:p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-start sm:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 text-sm sm:text-base truncate">
                          {item.title}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-1 text-xs sm:text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <span
                              className={`w-2 h-2 rounded-full ${item.locale === "en" ? "bg-blue-500" : "bg-green-500"}`}
                            ></span>
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
        <div className="bg-white rounded-lg border border-gray-200">
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
                  <div
                    key={item.id}
                    className="p-3 sm:p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-start sm:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 text-sm sm:text-base truncate">
                          {item.title}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-1 text-xs sm:text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <span
                              className={`w-2 h-2 rounded-full ${item.locale === "en" ? "bg-blue-500" : "bg-green-500"}`}
                            ></span>
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
    </div>
  );
}
