"use client";

/**
 * Unified Analytics Dashboard
 *
 * Central analytics for all sites using a single GA4 and Search Console account.
 * Overview of traffic, rankings, and performance across the entire network.
 */

import { useState, useEffect } from "react";
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
  Filter,
  Download,
  ChevronDown,
  ArrowUpRight,
  MapPin,
} from "lucide-react";

interface SiteAnalytics {
  siteId: string;
  siteName: string;
  domain: string;
  locale: "ar" | "en";
  metrics: {
    users: number;
    pageviews: number;
    sessions: number;
    bounceRate: number;
    avgDuration: number;
    newUsers: number;
  };
  change: {
    users: number;
    pageviews: number;
    sessions: number;
  };
  topPages: { path: string; views: number }[];
  topKeywords: {
    keyword: string;
    clicks: number;
    impressions: number;
    position: number;
  }[];
  topCountries: { country: string; users: number }[];
}

interface DateRange {
  label: string;
  value: string;
  days: number;
}

const DATE_RANGES: DateRange[] = [
  { label: "Last 7 days", value: "7d", days: 7 },
  { label: "Last 30 days", value: "30d", days: 30 },
  { label: "Last 90 days", value: "90d", days: 90 },
  { label: "This month", value: "month", days: 30 },
  { label: "This year", value: "year", days: 365 },
];

export default function AnalyticsPage() {
  const [sites, setSites] = useState<SiteAnalytics[]>([]);
  const [selectedSite, setSelectedSite] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("30d");
  const [isLoading, setIsLoading] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, [selectedSite, dateRange]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/admin/command-center/analytics?site=${selectedSite}&range=${dateRange}`,
      );
      if (response.ok) {
        const data = await response.json();
        setSites(data.sites || []);
      } else {
        setSites([]);
      }
    } catch (error) {
      setSites([]);
    }
    setIsLoading(false);
  };

  // Calculate totals
  const totals = sites.reduce(
    (acc, site) => ({
      users: acc.users + site.metrics.users,
      pageviews: acc.pageviews + site.metrics.pageviews,
      sessions: acc.sessions + site.metrics.sessions,
      usersChange: acc.usersChange + site.change.users,
      pageviewsChange: acc.pageviewsChange + site.change.pageviews,
    }),
    { users: 0, pageviews: 0, sessions: 0, usersChange: 0, pageviewsChange: 0 },
  );

  // Combine all top keywords
  const allKeywords = sites
    .flatMap((s) => s.topKeywords.map((k) => ({ ...k, site: s.siteName })))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 10);

  // Combine all top countries
  const allCountries = sites
    .flatMap((s) => s.topCountries)
    .reduce(
      (acc, country) => {
        const existing = acc.find((c) => c.country === country.country);
        if (existing) {
          existing.users += country.users;
        } else {
          acc.push({ ...country });
        }
        return acc;
      },
      [] as { country: string; users: number }[],
    )
    .sort((a, b) => b.users - a.users)
    .slice(0, 10);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Link
                href="/admin/command-center"
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="font-semibold text-lg">Unified Analytics</h1>
                <p className="text-sm text-gray-500">
                  All sites performance in one dashboard
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Date Range Selector */}
              <div className="relative">
                <button
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <Calendar className="h-4 w-4" />
                  {DATE_RANGES.find((r) => r.value === dateRange)?.label}
                  <ChevronDown className="h-4 w-4" />
                </button>
                {showDatePicker && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                    {DATE_RANGES.map((range) => (
                      <button
                        key={range.value}
                        onClick={() => {
                          setDateRange(range.value);
                          setShowDatePicker(false);
                        }}
                        className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${
                          dateRange === range.value
                            ? "bg-blue-50 text-blue-600"
                            : ""
                        }`}
                      >
                        {range.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Site Filter */}
              <select
                value={selectedSite}
                onChange={(e) => setSelectedSite(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
              >
                <option value="all">All Sites</option>
                {sites.map((site) => (
                  <option key={site.siteId} value={site.siteId}>
                    {site.siteName}
                  </option>
                ))}
              </select>

              <button
                onClick={loadAnalytics}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <RefreshCw
                  className={`h-5 w-5 ${isLoading ? "animate-spin" : ""}`}
                />
              </button>

              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Total Users"
            value={formatNumber(totals.users)}
            change={totals.usersChange}
            icon={Users}
            color="blue"
          />
          <StatCard
            title="Page Views"
            value={formatNumber(totals.pageviews)}
            change={totals.pageviewsChange}
            icon={Eye}
            color="green"
          />
          <StatCard
            title="Sessions"
            value={formatNumber(totals.sessions)}
            change={8}
            icon={BarChart3}
            color="purple"
          />
          <StatCard
            title="Avg. Duration"
            value={formatDuration(185)}
            change={12}
            icon={Clock}
            color="amber"
          />
        </div>

        {/* Sites Performance Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-8">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold">Sites Performance</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                    Site
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">
                    Users
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">
                    Page Views
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">
                    Sessions
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">
                    Bounce Rate
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">
                    Avg. Duration
                  </th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">
                    Trend
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sites.map((site) => (
                  <tr key={site.siteId} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            site.locale === "ar"
                              ? "bg-emerald-100 text-emerald-600"
                              : "bg-blue-100 text-blue-600"
                          }`}
                        >
                          <Globe className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-medium">{site.siteName}</div>
                          <div className="text-sm text-gray-500">
                            {site.domain}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="text-right px-4 py-3">
                      <div className="font-medium">
                        {formatNumber(site.metrics.users)}
                      </div>
                      <div
                        className={`text-xs ${
                          site.change.users >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {site.change.users >= 0 ? "+" : ""}
                        {site.change.users}%
                      </div>
                    </td>
                    <td className="text-right px-4 py-3 font-medium">
                      {formatNumber(site.metrics.pageviews)}
                    </td>
                    <td className="text-right px-4 py-3 font-medium">
                      {formatNumber(site.metrics.sessions)}
                    </td>
                    <td className="text-right px-4 py-3">
                      {site.metrics.bounceRate}%
                    </td>
                    <td className="text-right px-4 py-3">
                      {formatDuration(site.metrics.avgDuration)}
                    </td>
                    <td className="text-center px-4 py-3">
                      {site.change.users >= 0 ? (
                        <TrendingUp className="h-5 w-5 text-green-500 mx-auto" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-red-500 mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Search Console & Geography */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Keywords */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                <Search className="h-5 w-5 text-blue-500" />
                Top Search Keywords
              </h2>
              <span className="text-sm text-gray-500">
                Google Search Console
              </span>
            </div>
            <div className="divide-y divide-gray-100">
              {allKeywords.map((keyword, index) => (
                <div
                  key={index}
                  className="p-4 flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium">{keyword.keyword}</div>
                    <div className="text-sm text-gray-500">{keyword.site}</div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-right">
                      <div className="font-medium">
                        {formatNumber(keyword.clicks)}
                      </div>
                      <div className="text-gray-500">clicks</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {formatNumber(keyword.impressions)}
                      </div>
                      <div className="text-gray-500">impressions</div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`font-medium ${
                          keyword.position <= 10
                            ? "text-green-600"
                            : "text-gray-600"
                        }`}
                      >
                        #{keyword.position.toFixed(1)}
                      </div>
                      <div className="text-gray-500">position</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Countries */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                <MapPin className="h-5 w-5 text-green-500" />
                Top Countries
              </h2>
              <span className="text-sm text-gray-500">All Sites</span>
            </div>
            <div className="divide-y divide-gray-100">
              {allCountries.map((country, index) => (
                <div
                  key={country.country}
                  className="p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">
                      {getCountryFlag(country.country)}
                    </span>
                    <span className="font-medium">{country.country}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-32 bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-green-500 h-full rounded-full"
                        style={{
                          width: `${(country.users / allCountries[0].users) * 100}%`,
                        }}
                      />
                    </div>
                    <div className="text-right font-medium w-20">
                      {formatNumber(country.users)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Setup Instructions */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
          <h3 className="font-semibold text-blue-900 mb-3">
            Connect Google Analytics & Search Console
          </h3>
          <p className="text-blue-700 text-sm mb-4">
            To see real data, connect your Google Analytics 4 and Search Console
            accounts. All sites can share a single GA4 property with
            site-specific data streams.
          </p>
          <div className="flex gap-3">
            <Link
              href="/admin/command-center/settings/analytics"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Configure Analytics
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <a
              href="https://analytics.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-blue-300 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-100"
            >
              Open GA4
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({
  title,
  value,
  change,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  change: number;
  icon: any;
  color: string;
}) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
    amber: "bg-amber-50 text-amber-600",
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500">{title}</span>
        <div
          className={`p-2 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="text-2xl font-bold mb-1">{value}</div>
      <div
        className={`flex items-center gap-1 text-sm ${
          change >= 0 ? "text-green-600" : "text-red-600"
        }`}
      >
        {change >= 0 ? (
          <TrendingUp className="h-4 w-4" />
        ) : (
          <TrendingDown className="h-4 w-4" />
        )}
        {change >= 0 ? "+" : ""}
        {change}% vs previous period
      </div>
    </div>
  );
}

function getCountryFlag(country: string): string {
  const flags: Record<string, string> = {
    "Saudi Arabia": "🇸🇦",
    UAE: "🇦🇪",
    Kuwait: "🇰🇼",
    Qatar: "🇶🇦",
    Bahrain: "🇧🇭",
    Oman: "🇴🇲",
    Egypt: "🇪🇬",
    "United Kingdom": "🇬🇧",
    "United States": "🇺🇸",
    Germany: "🇩🇪",
  };
  return flags[country] || "🌍";
}
