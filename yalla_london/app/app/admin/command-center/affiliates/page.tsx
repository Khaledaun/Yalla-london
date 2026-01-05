'use client';

/**
 * Affiliate Marketing Dashboard
 *
 * Track affiliate revenue, manage partner links, and optimize earnings
 * across all sites.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  Copy,
  RefreshCw,
  Calendar,
  ChevronDown,
  Filter,
  Download,
  Globe,
  MousePointer,
  ShoppingCart,
  BarChart3,
  PieChart,
  Settings,
  Plus,
  CheckCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';

interface AffiliatePartner {
  id: string;
  name: string;
  logo: string;
  category: 'hotels' | 'activities' | 'insurance' | 'flights' | 'other';
  status: 'active' | 'pending' | 'inactive';
  commission: string;
  clicks: number;
  conversions: number;
  revenue: number;
  conversionRate: number;
  pendingEarnings: number;
  lastPayout: string | null;
}

interface RevenueByPeriod {
  period: string;
  revenue: number;
  clicks: number;
  conversions: number;
}

interface RevenueBySite {
  siteId: string;
  siteName: string;
  revenue: number;
  clicks: number;
  conversions: number;
  topPartner: string;
}

const AFFILIATE_CATEGORIES = [
  { id: 'all', name: 'All Partners' },
  { id: 'hotels', name: 'Hotels & Resorts' },
  { id: 'activities', name: 'Activities & Tours' },
  { id: 'insurance', name: 'Travel Insurance' },
  { id: 'flights', name: 'Flights' },
  { id: 'other', name: 'Other' },
];

export default function AffiliatesPage() {
  const [partners, setPartners] = useState<AffiliatePartner[]>([]);
  const [revenueByPeriod, setRevenueByPeriod] = useState<RevenueByPeriod[]>([]);
  const [revenueBySite, setRevenueBySite] = useState<RevenueBySite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [dateRange, setDateRange] = useState('30d');

  useEffect(() => {
    loadAffiliateData();
  }, [selectedCategory, dateRange]);

  const loadAffiliateData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/admin/command-center/affiliates?category=${selectedCategory}&range=${dateRange}`
      );
      if (response.ok) {
        const data = await response.json();
        setPartners(data.partners);
        setRevenueByPeriod(data.revenueByPeriod);
        setRevenueBySite(data.revenueBySite);
      } else {
        setPartners(mockPartners);
        setRevenueByPeriod(mockRevenueByPeriod);
        setRevenueBySite(mockRevenueBySite);
      }
    } catch (error) {
      setPartners(mockPartners);
      setRevenueByPeriod(mockRevenueByPeriod);
      setRevenueBySite(mockRevenueBySite);
    }
    setIsLoading(false);
  };

  // Calculate totals
  const totalRevenue = partners.reduce((sum, p) => sum + p.revenue, 0);
  const totalClicks = partners.reduce((sum, p) => sum + p.clicks, 0);
  const totalConversions = partners.reduce((sum, p) => sum + p.conversions, 0);
  const avgConversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
  const totalPending = partners.reduce((sum, p) => sum + p.pendingEarnings, 0);

  const filteredPartners = selectedCategory === 'all'
    ? partners
    : partners.filter((p) => p.category === selectedCategory);

  const copyAffiliateLink = async (partnerId: string) => {
    const link = `https://partner.link/${partnerId}`;
    await navigator.clipboard.writeText(link);
    // Show toast
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/admin/command-center"
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="font-semibold text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  Affiliate Dashboard
                </h1>
                <p className="text-sm text-gray-500">
                  Track revenue and manage partner links
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="year">This year</option>
              </select>

              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Download className="h-4 w-4" />
                Export
              </button>

              <button className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                <Plus className="h-4 w-4" />
                Add Partner
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Revenue Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-4 text-white">
            <div className="text-green-100 text-sm mb-1">Total Revenue (MTD)</div>
            <div className="text-3xl font-bold">${totalRevenue.toLocaleString()}</div>
            <div className="flex items-center gap-1 mt-2 text-green-100">
              <TrendingUp className="h-4 w-4" />
              +18% vs last month
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-gray-500 text-sm mb-1">Total Clicks</div>
            <div className="text-2xl font-bold">{totalClicks.toLocaleString()}</div>
            <div className="flex items-center gap-1 mt-2 text-green-600 text-sm">
              <TrendingUp className="h-4 w-4" />
              +12%
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-gray-500 text-sm mb-1">Conversions</div>
            <div className="text-2xl font-bold">{totalConversions.toLocaleString()}</div>
            <div className="flex items-center gap-1 mt-2 text-green-600 text-sm">
              <TrendingUp className="h-4 w-4" />
              +8%
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-gray-500 text-sm mb-1">Conversion Rate</div>
            <div className="text-2xl font-bold">{avgConversionRate.toFixed(2)}%</div>
            <div className="flex items-center gap-1 mt-2 text-gray-500 text-sm">
              <BarChart3 className="h-4 w-4" />
              Average
            </div>
          </div>

          <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
            <div className="text-amber-700 text-sm mb-1">Pending Earnings</div>
            <div className="text-2xl font-bold text-amber-700">
              ${totalPending.toLocaleString()}
            </div>
            <div className="flex items-center gap-1 mt-2 text-amber-600 text-sm">
              <Clock className="h-4 w-4" />
              Processing
            </div>
          </div>
        </div>

        {/* Revenue by Site */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-semibold">Revenue by Site</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {revenueBySite.map((site) => (
                <div key={site.siteId} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Globe className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium">{site.siteName}</div>
                      <div className="text-sm text-gray-500">
                        Top: {site.topPartner}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <div className="font-medium">{site.clicks.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">clicks</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{site.conversions}</div>
                      <div className="text-xs text-gray-500">conversions</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-green-600">
                        ${site.revenue.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">revenue</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Partners Mini Chart */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-semibold">Top Performers</h2>
            </div>
            <div className="p-4 space-y-4">
              {partners.slice(0, 5).map((partner, index) => (
                <div key={partner.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{partner.name}</div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{
                          width: `${(partner.revenue / partners[0].revenue) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-green-600">
                      ${partner.revenue.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Partner Category Tabs */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto">
          {AFFILIATE_CATEGORIES.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap ${
                selectedCategory === category.id
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Partners Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                    Partner
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                    Category
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                    Commission
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">
                    Clicks
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">
                    Conversions
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">
                    Conv. Rate
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">
                    Revenue
                  </th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">
                    Status
                  </th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPartners.map((partner) => (
                  <tr key={partner.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-lg">
                          {partner.logo}
                        </div>
                        <div className="font-medium">{partner.name}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 capitalize text-sm text-gray-600">
                      {partner.category}
                    </td>
                    <td className="px-4 py-3 text-sm">{partner.commission}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      {partner.clicks.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {partner.conversions.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`font-medium ${
                          partner.conversionRate >= 3
                            ? 'text-green-600'
                            : partner.conversionRate >= 1.5
                            ? 'text-amber-600'
                            : 'text-red-600'
                        }`}
                      >
                        {partner.conversionRate.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-green-600">
                      ${partner.revenue.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          partner.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : partner.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {partner.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => copyAffiliateLink(partner.id)}
                          className="p-1 hover:bg-gray-100 rounded"
                          title="Copy Link"
                        >
                          <Copy className="h-4 w-4 text-gray-500" />
                        </button>
                        <a
                          href="#"
                          className="p-1 hover:bg-gray-100 rounded"
                          title="Open Dashboard"
                        >
                          <ExternalLink className="h-4 w-4 text-gray-500" />
                        </a>
                        <button className="p-1 hover:bg-gray-100 rounded" title="Settings">
                          <Settings className="h-4 w-4 text-gray-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payout Info */}
        <div className="mt-8 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
          <h3 className="font-semibold text-green-900 mb-3">Payout Information</h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-green-700">Next Payout:</span>
              <span className="ml-2 font-medium text-green-900">Feb 1, 2024</span>
            </div>
            <div>
              <span className="text-green-700">Minimum Threshold:</span>
              <span className="ml-2 font-medium text-green-900">$100</span>
            </div>
            <div>
              <span className="text-green-700">Payment Method:</span>
              <span className="ml-2 font-medium text-green-900">Bank Transfer (Emirates NBD)</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Mock data
const mockPartners: AffiliatePartner[] = [
  {
    id: 'booking',
    name: 'Booking.com',
    logo: '🏨',
    category: 'hotels',
    status: 'active',
    commission: '4-6%',
    clicks: 12500,
    conversions: 425,
    revenue: 8500,
    conversionRate: 3.4,
    pendingEarnings: 1250,
    lastPayout: '2024-01-01',
  },
  {
    id: 'agoda',
    name: 'Agoda',
    logo: '🌴',
    category: 'hotels',
    status: 'active',
    commission: '5-7%',
    clicks: 8200,
    conversions: 285,
    revenue: 5800,
    conversionRate: 3.47,
    pendingEarnings: 850,
    lastPayout: '2024-01-01',
  },
  {
    id: 'getyourguide',
    name: 'GetYourGuide',
    logo: '🎯',
    category: 'activities',
    status: 'active',
    commission: '8%',
    clicks: 4500,
    conversions: 180,
    revenue: 2400,
    conversionRate: 4.0,
    pendingEarnings: 320,
    lastPayout: '2024-01-01',
  },
  {
    id: 'viator',
    name: 'Viator',
    logo: '🎒',
    category: 'activities',
    status: 'active',
    commission: '8%',
    clicks: 3200,
    conversions: 95,
    revenue: 1800,
    conversionRate: 2.97,
    pendingEarnings: 240,
    lastPayout: '2024-01-01',
  },
  {
    id: 'allianz',
    name: 'Allianz Travel',
    logo: '🛡️',
    category: 'insurance',
    status: 'active',
    commission: '15-20%',
    clicks: 1800,
    conversions: 45,
    revenue: 1200,
    conversionRate: 2.5,
    pendingEarnings: 180,
    lastPayout: '2024-01-01',
  },
  {
    id: 'skyscanner',
    name: 'Skyscanner',
    logo: '✈️',
    category: 'flights',
    status: 'pending',
    commission: 'CPA',
    clicks: 2100,
    conversions: 28,
    revenue: 560,
    conversionRate: 1.33,
    pendingEarnings: 120,
    lastPayout: null,
  },
];

const mockRevenueByPeriod: RevenueByPeriod[] = [
  { period: 'Week 1', revenue: 4500, clicks: 8200, conversions: 185 },
  { period: 'Week 2', revenue: 5200, clicks: 9100, conversions: 210 },
  { period: 'Week 3', revenue: 4800, clicks: 8500, conversions: 195 },
  { period: 'Week 4', revenue: 5760, clicks: 9800, conversions: 235 },
];

const mockRevenueBySite: RevenueBySite[] = [
  {
    siteId: 'arabaldives',
    siteName: 'Arabaldives',
    revenue: 12500,
    clicks: 18500,
    conversions: 520,
    topPartner: 'Booking.com',
  },
  {
    siteId: 'yalla-london',
    siteName: 'Yalla London',
    revenue: 4800,
    clicks: 12000,
    conversions: 180,
    topPartner: 'GetYourGuide',
  },
  {
    siteId: 'gulf-maldives',
    siteName: 'Gulf Maldives',
    revenue: 2960,
    clicks: 5100,
    conversions: 95,
    topPartner: 'Agoda',
  },
];
