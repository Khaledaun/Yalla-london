"use client";

/**
 * Sites Management Dashboard
 *
 * Overview of all sites with key metrics, quick actions, and management tools.
 * Designed for multi-site operators who need visibility across their portfolio.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Globe,
  Plus,
  Search,
  Filter,
  MoreVertical,
  ExternalLink,
  Settings,
  BarChart3,
  FileText,
  DollarSign,
  Users,
  TrendingUp,
  TrendingDown,
  Pause,
  Play,
  Trash2,
  Copy,
  RefreshCw,
  ArrowUpRight,
  CheckCircle,
  AlertCircle,
  Clock,
  Zap,
  Image as ImageIcon,
  Link as LinkIcon,
} from "lucide-react";

interface Site {
  id: string;
  name: string;
  domain: string;
  locale: "ar" | "en";
  status: "active" | "paused" | "pending" | "error";
  stats: {
    traffic: number;
    trafficChange: number;
    revenue: number;
    revenueChange: number;
    articles: number;
    leads: number;
    conversions: number;
  };
  seo: {
    score: number;
    indexedPages: number;
    lastCrawl: string;
  };
  affiliates: {
    active: number;
    pendingCommission: number;
  };
  lastUpdated: string;
  createdAt: string;
}

export default function SitesListPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<
    "traffic" | "revenue" | "name" | "created"
  >("traffic");
  const [selectedSites, setSelectedSites] = useState<string[]>([]);
  const [showActions, setShowActions] = useState<string | null>(null);

  useEffect(() => {
    loadSites();
  }, []);

  const loadSites = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/command-center/sites");
      if (res.ok) {
        const data = await res.json();
        // Transform API data to full site format
        const fullSites: Site[] = (data.sites || []).map((s: any) => ({
          id: s.siteId,
          name: s.siteName,
          domain: s.domain,
          locale: s.locale || "en",
          status: s.status || "active",
          stats: {
            traffic: s.traffic || 0,
            trafficChange: s.trafficChange || 0,
            revenue: s.revenue || 0,
            revenueChange: s.revenueChange || 0,
            articles: s.articles || 0,
            leads: s.leads || 0,
            conversions: s.conversions || 0,
          },
          seo: {
            score: s.seoScore || 0,
            indexedPages: s.indexedPages || 0,
            lastCrawl: s.lastCrawl || new Date().toISOString(),
          },
          affiliates: {
            active: s.activeAffiliates || 0,
            pendingCommission: s.pendingCommission || 0,
          },
          lastUpdated: s.lastUpdated || new Date().toISOString(),
          createdAt: s.createdAt || new Date().toISOString(),
        }));
        setSites(fullSites);
      } else {
        setSites([]);
      }
    } catch (error) {
      setSites([]);
    }
    setIsLoading(false);
  };

  // Filter and sort sites
  const filteredSites = sites
    .filter((site) => {
      const matchesSearch =
        site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        site.domain.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || site.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "traffic":
          return b.stats.traffic - a.stats.traffic;
        case "revenue":
          return b.stats.revenue - a.stats.revenue;
        case "name":
          return a.name.localeCompare(b.name);
        case "created":
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        default:
          return 0;
      }
    });

  // Calculate portfolio totals
  const totals = sites.reduce(
    (acc, site) => ({
      traffic: acc.traffic + site.stats.traffic,
      revenue: acc.revenue + site.stats.revenue,
      articles: acc.articles + site.stats.articles,
      leads: acc.leads + site.stats.leads,
    }),
    { traffic: 0, revenue: 0, articles: 0, leads: 0 },
  );

  const handleBulkAction = async (action: "pause" | "resume" | "delete") => {
    // Implement bulk actions
    console.log(`Bulk ${action} for sites:`, selectedSites);
    setSelectedSites([]);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">Sites Portfolio</h1>
              <p className="text-gray-500">
                Manage and monitor all your websites
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={loadSites}
                className="p-2 hover:bg-gray-100 rounded-lg"
                title="Refresh"
              >
                <RefreshCw
                  className={`h-5 w-5 text-gray-600 ${isLoading ? "animate-spin" : ""}`}
                />
              </button>
              <Link
                href="/admin/command-center/sites/new"
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Add Site
              </Link>
            </div>
          </div>

          {/* Portfolio Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-sm text-blue-600 font-medium">
                Total Traffic
              </div>
              <div className="text-xl font-bold text-blue-900">
                {formatNumber(totals.traffic)}
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-sm text-green-600 font-medium">
                Total Revenue
              </div>
              <div className="text-xl font-bold text-green-900">
                ${formatNumber(totals.revenue)}
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-3">
              <div className="text-sm text-purple-600 font-medium">
                Total Articles
              </div>
              <div className="text-xl font-bold text-purple-900">
                {formatNumber(totals.articles)}
              </div>
            </div>
            <div className="bg-amber-50 rounded-lg p-3">
              <div className="text-sm text-amber-600 font-medium">
                Total Leads
              </div>
              <div className="text-xl font-bold text-amber-900">
                {formatNumber(totals.leads)}
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search sites..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="pending">Pending</option>
              <option value="error">Error</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white"
            >
              <option value="traffic">Sort by Traffic</option>
              <option value="revenue">Sort by Revenue</option>
              <option value="name">Sort by Name</option>
              <option value="created">Sort by Created</option>
            </select>
          </div>

          {/* Bulk Actions */}
          {selectedSites.length > 0 && (
            <div className="mt-4 flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium text-blue-700">
                {selectedSites.length} site{selectedSites.length > 1 ? "s" : ""}{" "}
                selected
              </span>
              <button
                onClick={() => handleBulkAction("pause")}
                className="text-sm text-blue-600 hover:underline"
              >
                Pause All
              </button>
              <button
                onClick={() => handleBulkAction("resume")}
                className="text-sm text-blue-600 hover:underline"
              >
                Resume All
              </button>
              <button
                onClick={() => setSelectedSites([])}
                className="text-sm text-gray-500 hover:underline ml-auto"
              >
                Clear selection
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Sites Grid */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse"
              >
                <div className="h-6 bg-gray-200 rounded w-2/3 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredSites.length === 0 ? (
          <div className="text-center py-12">
            <Globe className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No sites found
            </h3>
            <p className="text-gray-500 mb-4">
              {searchQuery
                ? "Try adjusting your search or filters"
                : "Create your first site to get started"}
            </p>
            <Link
              href="/admin/command-center/sites/new"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg"
            >
              <Plus className="h-4 w-4" />
              Create Site
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSites.map((site) => (
              <SiteCard
                key={site.id}
                site={site}
                isSelected={selectedSites.includes(site.id)}
                onSelect={() => {
                  setSelectedSites((prev) =>
                    prev.includes(site.id)
                      ? prev.filter((id) => id !== site.id)
                      : [...prev, site.id],
                  );
                }}
                showActions={showActions === site.id}
                onToggleActions={() =>
                  setShowActions(showActions === site.id ? null : site.id)
                }
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function SiteCard({
  site,
  isSelected,
  onSelect,
  showActions,
  onToggleActions,
}: {
  site: Site;
  isSelected: boolean;
  onSelect: () => void;
  showActions: boolean;
  onToggleActions: () => void;
}) {
  const statusColors = {
    active: "bg-green-100 text-green-700",
    paused: "bg-yellow-100 text-yellow-700",
    pending: "bg-blue-100 text-blue-700",
    error: "bg-red-100 text-red-700",
  };

  const statusIcons = {
    active: CheckCircle,
    paused: Pause,
    pending: Clock,
    error: AlertCircle,
  };

  const StatusIcon = statusIcons[site.status];

  return (
    <div
      className={`bg-white rounded-xl border-2 transition-all ${
        isSelected
          ? "border-blue-500 shadow-lg"
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onSelect}
              className="rounded border-gray-300"
            />
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                site.locale === "ar" ? "bg-emerald-100" : "bg-blue-100"
              }`}
            >
              <Globe
                className={`h-5 w-5 ${
                  site.locale === "ar" ? "text-emerald-600" : "text-blue-600"
                }`}
              />
            </div>
            <div>
              <h3 className="font-semibold">{site.name}</h3>
              <a
                href={`https://${site.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-500 hover:text-blue-600 flex items-center gap-1"
              >
                {site.domain}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={onToggleActions}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <MoreVertical className="h-4 w-4 text-gray-400" />
            </button>

            {showActions && (
              <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-48 z-10">
                <Link
                  href={`/admin/command-center/sites/${site.id}`}
                  className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50"
                >
                  <Settings className="h-4 w-4" />
                  Site Settings
                </Link>
                <Link
                  href={`/admin/command-center/sites/${site.id}/analytics`}
                  className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50"
                >
                  <BarChart3 className="h-4 w-4" />
                  View Analytics
                </Link>
                <Link
                  href={`/admin/media?site=${site.id}`}
                  className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50"
                >
                  <ImageIcon className="h-4 w-4" />
                  Media Library
                </Link>
                <Link
                  href={`/admin/articles?site=${site.id}`}
                  className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50"
                >
                  <FileText className="h-4 w-4" />
                  Articles
                </Link>
                <hr className="my-1" />
                <button className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 w-full text-left">
                  <Copy className="h-4 w-4" />
                  Duplicate Site
                </button>
                <button className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 w-full text-left text-red-600">
                  <Trash2 className="h-4 w-4" />
                  Delete Site
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Status Badge */}
        <div className="mt-3 flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusColors[site.status]}`}
          >
            <StatusIcon className="h-3 w-3" />
            {site.status.charAt(0).toUpperCase() + site.status.slice(1)}
          </span>
          <span className="text-xs text-gray-500">
            {site.locale === "ar" ? "Arabic (RTL)" : "English"}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="p-4 grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-gray-500 mb-1">Traffic</div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">
              {formatNumber(site.stats.traffic)}
            </span>
            <span
              className={`text-xs flex items-center ${
                site.stats.trafficChange >= 0
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {site.stats.trafficChange >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {Math.abs(site.stats.trafficChange).toFixed(1)}%
            </span>
          </div>
        </div>

        <div>
          <div className="text-xs text-gray-500 mb-1">Revenue</div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-green-600">
              ${formatNumber(site.stats.revenue)}
            </span>
            <span
              className={`text-xs flex items-center ${
                site.stats.revenueChange >= 0
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {site.stats.revenueChange >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {Math.abs(site.stats.revenueChange).toFixed(1)}%
            </span>
          </div>
        </div>

        <div>
          <div className="text-xs text-gray-500 mb-1">Articles</div>
          <div className="font-semibold">{site.stats.articles}</div>
        </div>

        <div>
          <div className="text-xs text-gray-500 mb-1">Leads</div>
          <div className="font-semibold">{site.stats.leads}</div>
        </div>
      </div>

      {/* SEO & Affiliates */}
      <div className="px-4 pb-4 grid grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">SEO Score</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  site.seo.score >= 80
                    ? "bg-green-500"
                    : site.seo.score >= 60
                      ? "bg-yellow-500"
                      : "bg-red-500"
                }`}
                style={{ width: `${site.seo.score}%` }}
              />
            </div>
            <span className="text-sm font-medium">{site.seo.score}</span>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">Affiliates</div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {site.affiliates.active} active
            </span>
            <span className="text-xs text-green-600">
              ${site.affiliates.pendingCommission}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 pb-4 flex gap-2">
        <Link
          href={`/admin/command-center/sites/${site.id}`}
          className="flex-1 inline-flex items-center justify-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Settings className="h-4 w-4" />
          Manage
        </Link>
        <Link
          href={`/admin/articles/new?site=${site.id}`}
          className="flex-1 inline-flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <FileText className="h-4 w-4" />
          New Article
        </Link>
      </div>
    </div>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toLocaleString();
}
