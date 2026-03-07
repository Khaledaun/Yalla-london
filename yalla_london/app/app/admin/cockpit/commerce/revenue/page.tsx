"use client";

/**
 * /admin/cockpit/commerce/revenue — Revenue Analytics Dashboard
 *
 * Comprehensive revenue view for the commerce engine across website + Etsy channels.
 * Mobile-first (375px iPhone), auto-refresh every 60s, all real DB data.
 *
 * Sections:
 *  - Period selector tabs
 *  - Summary cards (Revenue, Orders, AOV, Refund Rate)
 *  - Channel comparison (Website vs Etsy)
 *  - Revenue over time (CSS bar chart)
 *  - Top Products table
 *  - Customer insights
 *  - Etsy overview
 *  - Trends (WoW, MoM, best day, best product)
 */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types (mirror API response shape)
// ---------------------------------------------------------------------------

interface ChannelData {
  revenue: number;
  orders: number;
}

interface ProductRow {
  productId: string;
  name: string;
  type: string;
  tier: number | null;
  totalRevenue: number;
  orderCount: number;
  avgPrice: number;
  websiteRevenue: number;
  websiteOrders: number;
  etsyRevenue: number;
  etsyOrders: number;
}

interface DayData {
  date: string;
  revenue: number;
  orders: number;
}

interface WeekData {
  weekStart: string;
  label: string;
  revenue: number;
  orders: number;
}

interface TopCustomer {
  email: string;
  name: string | null;
  totalSpent: number;
  orderCount: number;
}

interface RevenueData {
  siteId: string;
  period: string;
  since: string;
  summary: {
    totalRevenue: number;
    completedOrders: number;
    totalOrders: number;
    averageOrderValue: number;
    refundRate: number;
    refundedCount: number;
    revenueByChannel: {
      website: ChannelData;
      etsy: ChannelData;
    };
    revenueByProduct: ProductRow[];
    revenueByDay: DayData[];
    revenueByWeek: WeekData[];
  };
  products: ProductRow[];
  customers: {
    uniqueCustomers: number;
    repeatCustomers: number;
    topCustomers: TopCustomer[];
  };
  etsy: {
    totalListings: number;
    activeListings: number;
    avgPrice: number;
    listingsByState: Record<string, number>;
    recentSync: string | null;
  };
  trends: {
    weekOverWeek: number;
    monthOverMonth: number;
    bestSellingDay: string | null;
    bestSellingProduct: { name: string; revenue: number } | null;
  };
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

/** Format cents to dollar string */
function formatCents(cents: number): string {
  if (cents === 0) return "$0.00";
  return `$${(cents / 100).toFixed(2)}`;
}

/** Compact format for large amounts */
function formatCentsCompact(cents: number): string {
  const dollars = cents / 100;
  if (dollars >= 10000) return `$${(dollars / 1000).toFixed(1)}k`;
  if (dollars >= 1000) return `$${(dollars / 1000).toFixed(2)}k`;
  return `$${dollars.toFixed(2)}`;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function trendArrow(pct: number): string {
  if (pct > 0) return "+";
  return "";
}

function trendColor(pct: number): string {
  if (pct > 5) return "text-emerald-400";
  if (pct > 0) return "text-emerald-300";
  if (pct === 0) return "text-zinc-400";
  if (pct > -5) return "text-amber-400";
  return "text-red-400";
}

function productTypeLabel(type: string): string {
  const map: Record<string, string> = {
    PDF_GUIDE: "PDF Guide",
    SPREADSHEET: "Spreadsheet",
    TEMPLATE: "Template",
    BUNDLE: "Bundle",
    MEMBERSHIP: "Membership",
    WALL_ART: "Wall Art",
    PRESET: "Preset",
    PLANNER: "Planner",
    STICKER: "Sticker",
    WORKSHEET: "Worksheet",
    EVENT_GUIDE: "Event Guide",
  };
  return map[type] ?? type;
}

// ---------------------------------------------------------------------------
// Shared UI components (matching cockpit design system)
// ---------------------------------------------------------------------------

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-zinc-900 border border-zinc-800 rounded-xl p-4 ${className}`}>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">{children}</h3>;
}

// ---------------------------------------------------------------------------
// Summary card component
// ---------------------------------------------------------------------------

function SummaryCard({
  label,
  value,
  subtitle,
  trend,
}: {
  label: string;
  value: string;
  subtitle?: string;
  trend?: { value: number; label: string } | null;
}) {
  return (
    <Card className="flex flex-col gap-1 min-w-0">
      <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider truncate">{label}</span>
      <span className="text-xl font-bold text-zinc-100 tabular-nums">{value}</span>
      {subtitle && <span className="text-[11px] text-zinc-500">{subtitle}</span>}
      {trend && trend.value !== 0 && (
        <span className={`text-[11px] font-medium ${trendColor(trend.value)}`}>
          {trendArrow(trend.value)}{trend.value}% {trend.label}
        </span>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Channel bar component
// ---------------------------------------------------------------------------

function ChannelBar({
  website,
  etsy,
}: {
  website: ChannelData;
  etsy: ChannelData;
}) {
  const total = website.revenue + etsy.revenue;
  const websitePct = total > 0 ? Math.round((website.revenue / total) * 100) : 0;
  const etsyPct = total > 0 ? 100 - websitePct : 0;

  return (
    <Card>
      <SectionTitle>Revenue by Channel</SectionTitle>
      {total === 0 ? (
        <p className="text-sm text-zinc-500 text-center py-4">No completed orders yet</p>
      ) : (
        <>
          {/* Stacked bar */}
          <div className="flex h-8 rounded-lg overflow-hidden mb-3">
            {websitePct > 0 && (
              <div
                className="bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white transition-all"
                style={{ width: `${websitePct}%` }}
              >
                {websitePct > 15 ? `${websitePct}%` : ""}
              </div>
            )}
            {etsyPct > 0 && (
              <div
                className="bg-orange-500 flex items-center justify-center text-[10px] font-bold text-white transition-all"
                style={{ width: `${etsyPct}%` }}
              >
                {etsyPct > 15 ? `${etsyPct}%` : ""}
              </div>
            )}
          </div>

          {/* Channel details row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-start gap-2">
              <span className="w-3 h-3 rounded-sm bg-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-xs font-semibold text-zinc-200">Website</div>
                <div className="text-sm font-bold text-zinc-100 tabular-nums">{formatCents(website.revenue)}</div>
                <div className="text-[10px] text-zinc-500">{website.orders} orders</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-3 h-3 rounded-sm bg-orange-500 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-xs font-semibold text-zinc-200">Etsy</div>
                <div className="text-sm font-bold text-zinc-100 tabular-nums">{formatCents(etsy.revenue)}</div>
                <div className="text-[10px] text-zinc-500">{etsy.orders} orders</div>
              </div>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Revenue bar chart (CSS-only, no charting lib)
// ---------------------------------------------------------------------------

function RevenueChart({
  daily,
  weekly,
}: {
  daily: DayData[];
  weekly: WeekData[];
}) {
  const [view, setView] = useState<"daily" | "weekly">("daily");
  const data = view === "daily" ? daily : weekly;

  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <SectionTitle>Revenue Over Time</SectionTitle>
        <div className="flex gap-1">
          <button
            onClick={() => setView("daily")}
            className={`px-2 py-0.5 text-[10px] rounded-md font-medium transition-colors ${
              view === "daily"
                ? "bg-zinc-700 text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            30 Days
          </button>
          <button
            onClick={() => setView("weekly")}
            className={`px-2 py-0.5 text-[10px] rounded-md font-medium transition-colors ${
              view === "weekly"
                ? "bg-zinc-700 text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            12 Weeks
          </button>
        </div>
      </div>

      {data.every((d) => d.revenue === 0) ? (
        <p className="text-sm text-zinc-500 text-center py-6">No revenue data in this period</p>
      ) : (
        <div className="flex items-end gap-[2px] h-32 overflow-x-auto">
          {data.map((d, i) => {
            const height = maxRevenue > 0 ? Math.max((d.revenue / maxRevenue) * 100, d.revenue > 0 ? 4 : 0) : 0;
            const label = view === "daily"
              ? (d as DayData).date.slice(5) // MM-DD
              : (d as WeekData).label;
            const isToday = view === "daily" && (d as DayData).date === new Date().toISOString().slice(0, 10);

            return (
              <div key={i} className="flex flex-col items-center flex-1 min-w-[8px] group relative">
                {/* Tooltip on hover */}
                <div className="hidden group-hover:block absolute bottom-full mb-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-[10px] text-zinc-200 whitespace-nowrap z-10 shadow-lg">
                  <div className="font-medium">{label}</div>
                  <div className="tabular-nums">{formatCents(d.revenue)}</div>
                  <div className="text-zinc-400">{d.orders} orders</div>
                </div>
                {/* Bar */}
                <div
                  className={`w-full rounded-t-sm transition-all ${
                    isToday ? "bg-blue-500" : d.revenue > 0 ? "bg-emerald-600" : "bg-zinc-800"
                  } group-hover:opacity-80`}
                  style={{ height: `${height}%` }}
                />
                {/* X-axis label — only show every Nth label on daily to avoid clutter */}
                {view === "weekly" ? (
                  <span className="text-[8px] text-zinc-600 mt-1 truncate max-w-full">{label}</span>
                ) : (
                  i % 5 === 0 && (
                    <span className="text-[8px] text-zinc-600 mt-1">{label}</span>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Top Products table
// ---------------------------------------------------------------------------

function TopProductsTable({ products }: { products: ProductRow[] }) {
  return (
    <Card>
      <SectionTitle>Top Products</SectionTitle>
      {products.length === 0 ? (
        <p className="text-sm text-zinc-500 text-center py-4">No product sales yet</p>
      ) : (
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-zinc-500 text-left border-b border-zinc-800">
                <th className="pb-2 font-medium">#</th>
                <th className="pb-2 font-medium">Product</th>
                <th className="pb-2 font-medium text-right">Revenue</th>
                <th className="pb-2 font-medium text-right">Orders</th>
                <th className="pb-2 font-medium text-right hidden sm:table-cell">Avg</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => (
                <tr key={p.productId} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                  <td className="py-2 text-zinc-500 tabular-nums">{i + 1}</td>
                  <td className="py-2">
                    <div className="text-zinc-200 font-medium truncate max-w-[180px]">{p.name}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                        {productTypeLabel(p.type)}
                      </span>
                      {p.tier && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                          T{p.tier}
                        </span>
                      )}
                      {p.etsyOrders > 0 && p.websiteOrders > 0 && (
                        <span className="text-[10px] text-zinc-500">
                          W:{p.websiteOrders} E:{p.etsyOrders}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 text-right text-zinc-100 font-semibold tabular-nums">
                    {formatCents(p.totalRevenue)}
                  </td>
                  <td className="py-2 text-right text-zinc-300 tabular-nums">{p.orderCount}</td>
                  <td className="py-2 text-right text-zinc-400 tabular-nums hidden sm:table-cell">
                    {formatCents(p.avgPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Customer insights
// ---------------------------------------------------------------------------

function CustomerInsights({
  customers,
}: {
  customers: RevenueData["customers"];
}) {
  return (
    <Card>
      <SectionTitle>Customer Insights</SectionTitle>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-zinc-100 tabular-nums">{customers.uniqueCustomers}</div>
          <div className="text-[10px] text-zinc-500 uppercase">Unique Buyers</div>
        </div>
        <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-zinc-100 tabular-nums">{customers.repeatCustomers}</div>
          <div className="text-[10px] text-zinc-500 uppercase">Repeat Buyers</div>
        </div>
      </div>

      {customers.topCustomers.length > 0 && (
        <>
          <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Top Spenders</div>
          <div className="space-y-2">
            {customers.topCustomers.map((c, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-zinc-500 tabular-nums w-4">{i + 1}.</span>
                  <div className="min-w-0">
                    <div className="text-zinc-200 truncate">{c.name ?? c.email}</div>
                    {c.name && <div className="text-[10px] text-zinc-500 truncate">{c.email}</div>}
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <div className="text-zinc-100 font-semibold tabular-nums">{formatCents(c.totalSpent)}</div>
                  <div className="text-[10px] text-zinc-500">{c.orderCount} orders</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {customers.uniqueCustomers === 0 && (
        <p className="text-sm text-zinc-500 text-center py-2">No customers yet</p>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Etsy section
// ---------------------------------------------------------------------------

function EtsySection({ etsy }: { etsy: RevenueData["etsy"] }) {
  const states = Object.entries(etsy.listingsByState).sort(([, a], [, b]) => b - a);

  return (
    <Card>
      <SectionTitle>Etsy Channel</SectionTitle>
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-zinc-800/50 rounded-lg p-2 text-center">
          <div className="text-base font-bold text-zinc-100 tabular-nums">{etsy.totalListings}</div>
          <div className="text-[10px] text-zinc-500">Total</div>
        </div>
        <div className="bg-zinc-800/50 rounded-lg p-2 text-center">
          <div className="text-base font-bold text-orange-400 tabular-nums">{etsy.activeListings}</div>
          <div className="text-[10px] text-zinc-500">Active</div>
        </div>
        <div className="bg-zinc-800/50 rounded-lg p-2 text-center">
          <div className="text-base font-bold text-zinc-100 tabular-nums">{formatCents(etsy.avgPrice)}</div>
          <div className="text-[10px] text-zinc-500">Avg Price</div>
        </div>
      </div>

      {/* Listing state breakdown */}
      {states.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">By State</div>
          <div className="flex flex-wrap gap-1.5">
            {states.map(([state, count]) => {
              const stateColors: Record<string, string> = {
                active: "bg-emerald-900/50 text-emerald-300 border-emerald-700",
                draft: "bg-zinc-800 text-zinc-300 border-zinc-700",
                published: "bg-blue-900/50 text-blue-300 border-blue-700",
                approved: "bg-blue-900/50 text-blue-300 border-blue-700",
                inactive: "bg-amber-900/50 text-amber-300 border-amber-700",
                removed: "bg-red-900/50 text-red-300 border-red-700",
                failed: "bg-red-900/50 text-red-300 border-red-700",
                archived: "bg-zinc-800 text-zinc-400 border-zinc-700",
              };
              const colorClass = stateColors[state] ?? "bg-zinc-800 text-zinc-300 border-zinc-700";
              return (
                <span key={state} className={`px-2 py-0.5 rounded-full border text-[10px] font-medium ${colorClass}`}>
                  {state}: {count}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Sync status */}
      <div className="text-[10px] text-zinc-500 flex items-center gap-1">
        Last sync: {etsy.recentSync ? timeAgo(etsy.recentSync) : "never"}
        {etsy.recentSync && (
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
        )}
      </div>

      {etsy.totalListings === 0 && (
        <p className="text-sm text-zinc-500 text-center py-2">No Etsy listings configured</p>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Trends section
// ---------------------------------------------------------------------------

function TrendsSection({ trends }: { trends: RevenueData["trends"] }) {
  return (
    <Card>
      <SectionTitle>Trends</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-zinc-800/50 rounded-lg p-3">
          <div className="text-[10px] text-zinc-500 uppercase mb-1">Week / Week</div>
          <div className={`text-lg font-bold tabular-nums ${trendColor(trends.weekOverWeek)}`}>
            {trendArrow(trends.weekOverWeek)}{trends.weekOverWeek}%
          </div>
        </div>
        <div className="bg-zinc-800/50 rounded-lg p-3">
          <div className="text-[10px] text-zinc-500 uppercase mb-1">Month / Month</div>
          <div className={`text-lg font-bold tabular-nums ${trendColor(trends.monthOverMonth)}`}>
            {trendArrow(trends.monthOverMonth)}{trends.monthOverMonth}%
          </div>
        </div>
        <div className="bg-zinc-800/50 rounded-lg p-3">
          <div className="text-[10px] text-zinc-500 uppercase mb-1">Best Day</div>
          <div className="text-sm font-semibold text-zinc-200">
            {trends.bestSellingDay ?? "N/A"}
          </div>
        </div>
        <div className="bg-zinc-800/50 rounded-lg p-3">
          <div className="text-[10px] text-zinc-500 uppercase mb-1">Top Product</div>
          <div className="text-sm font-semibold text-zinc-200 truncate">
            {trends.bestSellingProduct?.name ?? "N/A"}
          </div>
          {trends.bestSellingProduct && (
            <div className="text-[10px] text-zinc-500 tabular-nums">
              {formatCents(trends.bestSellingProduct.revenue)}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const PERIODS = [
  { key: "today", label: "Today" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "quarter", label: "Quarter" },
  { key: "year", label: "Year" },
  { key: "all", label: "All" },
] as const;

type PeriodKey = (typeof PERIODS)[number]["key"];

export default function RevenueAnalyticsPage() {
  const [period, setPeriod] = useState<PeriodKey>("month");
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/commerce/revenue?period=${period}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json = await res.json();
      setData(json);
      setLastRefresh(new Date());
    } catch (err) {
      console.warn("[revenue-page] Fetch failed:", err);
      setError("Failed to load revenue data. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, [period]);

  // Initial fetch + period change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 60s
  useEffect(() => {
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <div className="min-h-screen bg-black text-zinc-100 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-black/95 backdrop-blur border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Link
              href="/admin/cockpit/commerce"
              className="text-zinc-500 hover:text-zinc-300 text-sm"
            >
              Commerce
            </Link>
            <span className="text-zinc-700">/</span>
            <h1 className="text-base font-bold text-zinc-100">Revenue</h1>
          </div>
          <div className="flex items-center gap-2">
            {lastRefresh && (
              <span className="text-[10px] text-zinc-600">{timeAgo(lastRefresh.toISOString())}</span>
            )}
            <button
              onClick={fetchData}
              disabled={loading}
              className="text-[10px] px-2 py-1 rounded-md bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700 disabled:opacity-50"
            >
              {loading ? "..." : "Refresh"}
            </button>
          </div>
        </div>

        {/* Period tabs */}
        <div className="flex gap-1 overflow-x-auto no-scrollbar">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-1 text-[11px] font-medium rounded-lg whitespace-nowrap transition-colors ${
                period === p.key
                  ? "bg-zinc-700 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-900/30 border border-red-800 rounded-xl text-sm text-red-300">
          {error}
          <button onClick={fetchData} className="ml-2 underline text-red-200">
            Retry
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !data && (
        <div className="px-4 pt-4 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-zinc-900 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Main content */}
      {data && (
        <div className="px-4 pt-4 space-y-4 max-w-4xl mx-auto">
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryCard
              label="Total Revenue"
              value={formatCentsCompact(data.summary.totalRevenue)}
              subtitle={`${data.summary.completedOrders} completed`}
              trend={{ value: data.trends.monthOverMonth, label: "MoM" }}
            />
            <SummaryCard
              label="Orders"
              value={data.summary.totalOrders.toString()}
              subtitle={`${data.summary.completedOrders} completed`}
            />
            <SummaryCard
              label="Avg Order"
              value={formatCents(data.summary.averageOrderValue)}
              subtitle="per completed order"
            />
            <SummaryCard
              label="Refund Rate"
              value={`${data.summary.refundRate}%`}
              subtitle={`${data.summary.refundedCount} refunded`}
            />
          </div>

          {/* Channel split */}
          <ChannelBar
            website={data.summary.revenueByChannel.website}
            etsy={data.summary.revenueByChannel.etsy}
          />

          {/* Revenue chart */}
          <RevenueChart
            daily={data.summary.revenueByDay}
            weekly={data.summary.revenueByWeek}
          />

          {/* Two-column on desktop: Products + Customers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TopProductsTable products={data.products} />
            <CustomerInsights customers={data.customers} />
          </div>

          {/* Two-column on desktop: Etsy + Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <EtsySection etsy={data.etsy} />
            <TrendsSection trends={data.trends} />
          </div>

          {/* Footer metadata */}
          <div className="text-[10px] text-zinc-600 text-center pt-2 pb-4 space-y-0.5">
            <div>Site: {data.siteId} | Period: {data.period} | Since: {new Date(data.since).toLocaleDateString()}</div>
            <div>Last updated: {new Date(data.timestamp).toLocaleTimeString()} | Auto-refreshes every 60s</div>
          </div>
        </div>
      )}
    </div>
  );
}
