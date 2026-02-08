"use client";

import { useState, useEffect } from "react";
import {
  DollarSign,
  Plus,
  Edit,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  Search,
  Filter,
  Tag,
  TrendingUp,
  Target,
} from "lucide-react";

interface AffiliateCode {
  id: string;
  name: string;
  description: string;
  code: string;
  url: string;
  category: string;
  commission: number;
  status: "active" | "inactive" | "pending";
  createdAt: string;
  lastUsed?: string;
  usageCount: number;
  revenue: number;
}

const PARTNER_TYPES = [
  { id: "hotel", name: "Accommodation", color: "blue" },
  { id: "ticket", name: "Tickets", color: "indigo" },
  { id: "restaurant", name: "Restaurants", color: "orange" },
  { id: "attraction", name: "Attractions", color: "green" },
  { id: "experience", name: "Experiences", color: "teal" },
  { id: "shopping", name: "Shopping", color: "purple" },
  { id: "transport", name: "Transport", color: "red" },
  { id: "car", name: "Car Rental", color: "amber" },
];

export default function AffiliateMarketing() {
  const [activeTab, setActiveTab] = useState<
    "codes" | "categories" | "analytics"
  >("codes");
  const [affiliateCodes, setAffiliateCodes] = useState<AffiliateCode[]>([]);
  const [typeStats, setTypeStats] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showAddCode, setShowAddCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");

  useEffect(() => {
    loadAffiliateData();
  }, []);

  const loadAffiliateData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/affiliate-pool");
      if (res.ok) {
        const data = await res.json();
        const affiliates = data.affiliates || [];
        setTypeStats(data.stats || {});
        setAffiliateCodes(
          affiliates.map((a: any) => ({
            id: a.id,
            name: a.name,
            description: a.description || "",
            code: a.tracking_id || a.name,
            url: a.affiliate_url || "",
            category: a.partner_type || "hotel",
            commission: a.commission_rate || 0,
            status: a.is_active ? "active" : "inactive",
            createdAt: a.created_at,
            lastUsed: a.last_clicked_at,
            usageCount: a.clicks || 0,
            revenue: a.revenue || 0,
          })),
        );
      }
    } catch (error) {
      console.error("Failed to load affiliate data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      console.error("Failed to copy code:", error);
    }
  };

  const handleToggleStatus = async (codeId: string) => {
    const code = affiliateCodes.find((c) => c.id === codeId);
    if (!code) return;

    try {
      const res = await fetch("/api/admin/affiliate-pool", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: codeId,
          is_active: code.status !== "active",
        }),
      });
      if (res.ok) {
        setAffiliateCodes((prev) =>
          prev.map((c) =>
            c.id === codeId
              ? { ...c, status: c.status === "active" ? "inactive" : "active" }
              : c,
          ),
        );
      }
    } catch (error) {
      console.error("Failed to toggle status:", error);
    }
  };

  const handleDeleteCode = async (codeId: string) => {
    if (!confirm("Are you sure you want to delete this affiliate code?"))
      return;

    try {
      const res = await fetch("/api/admin/affiliate-pool", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [codeId] }),
      });
      if (res.ok) {
        setAffiliateCodes((prev) => prev.filter((code) => code.id !== codeId));
      }
    } catch (error) {
      console.error("Failed to delete affiliate:", error);
    }
  };

  const getTypeColor = (type: string) => {
    const pt = PARTNER_TYPES.find((t) => t.id === type);
    switch (pt?.color) {
      case "blue":
        return "bg-blue-100 text-blue-800";
      case "green":
        return "bg-green-100 text-green-800";
      case "orange":
        return "bg-orange-100 text-orange-800";
      case "purple":
        return "bg-purple-100 text-purple-800";
      case "red":
        return "bg-red-100 text-red-800";
      case "indigo":
        return "bg-indigo-100 text-indigo-800";
      case "teal":
        return "bg-teal-100 text-teal-800";
      case "amber":
        return "bg-amber-100 text-amber-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-gray-100 text-gray-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filteredCodes = affiliateCodes.filter((code) => {
    const matchesSearch =
      code.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      code.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      code.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      filterCategory === "all" || code.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const totalRevenue = affiliateCodes.reduce(
    (sum, code) => sum + code.revenue,
    0,
  );
  const totalClicks = affiliateCodes.reduce(
    (sum, code) => sum + code.usageCount,
    0,
  );
  const avgCommission =
    affiliateCodes.length > 0
      ? (
          affiliateCodes.reduce((sum, code) => sum + code.commission, 0) /
          affiliateCodes.length
        ).toFixed(1)
      : "0";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900">
            Loading Affiliates...
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-purple-500" />
            Affiliate Marketing
          </h1>
          <p className="text-gray-600 mt-1">
            Manage affiliate partners and track performance
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddCode(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <Plus className="h-4 w-4" />
            Add Affiliate
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                {totalRevenue > 0 ? `$${totalRevenue.toFixed(2)}` : "$0.00"}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Active Partners
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {affiliateCodes.filter((c) => c.status === "active").length}
              </p>
            </div>
            <Target className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Clicks</p>
              <p className="text-2xl font-bold text-gray-900">{totalClicks}</p>
            </div>
            <ExternalLink className="h-8 w-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Avg. Commission
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {avgCommission}%
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: "codes", label: "Affiliate Partners", icon: Tag },
            { id: "categories", label: "By Type", icon: Filter },
            { id: "analytics", label: "Analytics", icon: TrendingUp },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? "border-purple-500 text-purple-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "codes" && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search affiliates..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="all">All Types</option>
                  {PARTNER_TYPES.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Affiliate Codes List */}
          {filteredCodes.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Affiliate Partners
              </h3>
              <p className="text-gray-600">
                Add your first affiliate partner to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCodes.map((code) => (
                <div
                  key={code.id}
                  className="bg-white p-6 rounded-lg border border-gray-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {code.name}
                        </h3>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(code.status)}`}
                        >
                          {code.status}
                        </span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(code.category)}`}
                        >
                          {PARTNER_TYPES.find((t) => t.id === code.category)
                            ?.name || code.category}
                        </span>
                      </div>
                      {code.description && (
                        <p className="text-gray-600 mb-3">{code.description}</p>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tracking ID
                          </label>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm font-mono">
                              {code.code}
                            </code>
                            <button
                              onClick={() => handleCopyCode(code.code)}
                              className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                            >
                              {copiedCode === code.code ? (
                                <Check className="h-4 w-4 text-green-600" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Commission Rate
                          </label>
                          <div className="text-lg font-semibold text-gray-900">
                            {code.commission}%
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Revenue
                          </label>
                          <div className="text-lg font-semibold text-green-600">
                            {code.revenue > 0
                              ? `$${code.revenue.toFixed(2)}`
                              : "$0.00"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 text-sm text-gray-600">
                        <span>Clicks: {code.usageCount}</span>
                        {code.lastUsed && (
                          <span>
                            Last synced:{" "}
                            {new Date(code.lastUsed).toLocaleDateString()}
                          </span>
                        )}
                        <span>
                          Created:{" "}
                          {new Date(code.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleToggleStatus(code.id)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium ${
                          code.status === "active"
                            ? "bg-red-100 text-red-700 hover:bg-red-200"
                            : "bg-green-100 text-green-700 hover:bg-green-200"
                        }`}
                      >
                        {code.status === "active" ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() => handleDeleteCode(code.id)}
                        className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "categories" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PARTNER_TYPES.map((type) => {
              const count = typeStats[type.id] || 0;
              return (
                <div
                  key={type.id}
                  className="bg-white p-6 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(type.id)}`}
                    >
                      {type.name}
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {count}
                  </div>
                  <div className="text-sm text-gray-500">
                    affiliate partners
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "analytics" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Revenue by Type
              </h3>
              {affiliateCodes.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No affiliate data yet
                </p>
              ) : (
                <div className="space-y-3">
                  {PARTNER_TYPES.map((type) => {
                    const typeRevenue = affiliateCodes
                      .filter((code) => code.category === type.id)
                      .reduce((sum, code) => sum + code.revenue, 0);
                    const percentage =
                      totalRevenue > 0 ? (typeRevenue / totalRevenue) * 100 : 0;

                    if (typeRevenue === 0) return null;

                    return (
                      <div
                        key={type.id}
                        className="flex items-center justify-between"
                      >
                        <span className="text-sm text-gray-600">
                          {type.name}
                        </span>
                        <div className="flex items-center gap-3">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div
                              className="h-2 rounded-full bg-purple-500"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            ${typeRevenue.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  }).filter(Boolean)}
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Top Performing Partners
              </h3>
              {affiliateCodes.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No affiliate data yet
                </p>
              ) : (
                <div className="space-y-3">
                  {affiliateCodes
                    .sort((a, b) => b.revenue - a.revenue)
                    .slice(0, 5)
                    .map((code) => (
                      <div
                        key={code.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-900">
                            {code.name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {code.usageCount} clicks
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">
                            {code.revenue > 0
                              ? `$${code.revenue.toFixed(2)}`
                              : "$0.00"}
                          </p>
                          <p className="text-sm text-gray-600">
                            {code.commission}%
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
