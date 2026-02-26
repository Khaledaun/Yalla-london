"use client";

/**
 * Campaign Calendar — 30-day launch timeline view
 *
 * Features:
 * - 30-day timeline with color-coded tasks by channel
 * - Completion toggles per task
 * - UTM tracking links display
 * - Coupon code display
 * - Campaign status controls
 * - Progress bar
 *
 * Accessed at: /admin/cockpit/commerce/campaign?id=<campaignId>
 */

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";

interface CampaignTask {
  day: number;
  task: string;
  channel: "social" | "email" | "blog" | "etsy" | "pinterest";
  status: "pending" | "completed" | "skipped";
  completedAt?: string;
}

interface Campaign {
  id: string;
  siteId: string;
  briefId: string | null;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  utmCampaign: string | null;
  couponCode: string | null;
  discountPercent: number | null;
  tasksJson: CampaignTask[];
  resultsJson: { views: number; clicks: number; conversions: number; revenue: number } | null;
  status: string;
  createdAt: string;
}

const CHANNEL_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  social: { bg: "bg-pink-50", text: "text-pink-700", dot: "bg-pink-500" },
  email: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  blog: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
  etsy: { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500" },
  pinterest: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
};

export default function CampaignCalendarPage() {
  const searchParams = useSearchParams();
  const campaignId = searchParams.get("id");

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  // ─── Load Campaign ────────────────────────────────────────

  const loadCampaign = useCallback(async () => {
    if (!campaignId) return;
    try {
      const res = await fetch("/api/admin/commerce/campaigns?limit=200");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      const found = (data.data as Campaign[])?.find((c) => c.id === campaignId);
      if (found) {
        setCampaign(found);
      }
    } catch (err) {
      console.warn("[campaign-calendar] Load error:", err);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    loadCampaign();
  }, [loadCampaign]);

  // ─── Toggle Task ──────────────────────────────────────────

  const toggleTask = async (day: number, taskIndex: number, currentStatus: string) => {
    if (!campaignId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/commerce/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_task",
          campaignId,
          day,
          taskIndex,
          completed: currentStatus !== "completed",
        }),
      });
      const data = await res.json();
      if (data.success) {
        await loadCampaign();
      } else {
        showToast(`Error: ${data.error}`);
      }
    } catch {
      showToast("Failed to update task");
    } finally {
      setSaving(false);
    }
  };

  // ─── Update Status ────────────────────────────────────────

  const updateStatus = async (newStatus: string) => {
    if (!campaignId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/commerce/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_status",
          campaignId,
          status: newStatus,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Status updated to ${newStatus}`);
        await loadCampaign();
      } else {
        showToast(`Error: ${data.error}`);
      }
    } catch {
      showToast("Status update failed");
    } finally {
      setSaving(false);
    }
  };

  // ─── Compute Progress ─────────────────────────────────────

  const tasks = campaign?.tasksJson ?? [];
  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  // Group tasks by day
  const tasksByDay: Record<number, { task: CampaignTask; index: number }[]> = {};
  tasks.forEach((t, originalIndex) => {
    if (!tasksByDay[t.day]) tasksByDay[t.day] = [];
    const dayIndex = tasksByDay[t.day].length;
    tasksByDay[t.day].push({ task: t, index: dayIndex });
    // We also need to track the original ordering for the toggle API
    void originalIndex;
  });

  // ─── Current Day ──────────────────────────────────────────

  const getCurrentDay = (): number => {
    if (!campaign) return 0;
    const start = new Date(campaign.startDate).getTime();
    const now = Date.now();
    const diff = Math.floor((now - start) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(0, Math.min(30, diff));
  };

  const currentDay = getCurrentDay();

  // ─── Render ───────────────────────────────────────────────

  if (!campaignId) {
    return (
      <div className="p-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-amber-800 text-sm">
            No campaign ID specified. Go to{" "}
            <a href="/admin/cockpit/commerce?tab=briefs" className="underline">
              Briefs
            </a>{" "}
            to generate a campaign.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 text-sm">Campaign not found. It may have been deleted.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm max-w-xs">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">
              {campaign.name}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {new Date(campaign.startDate).toLocaleDateString()} –{" "}
              {new Date(campaign.endDate).toLocaleDateString()}
            </p>
          </div>
          <span
            className={`px-2 py-0.5 text-xs font-medium rounded-full ${
              campaign.status === "active"
                ? "bg-green-100 text-green-700"
                : campaign.status === "completed"
                  ? "bg-blue-100 text-blue-700"
                  : campaign.status === "paused"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-gray-100 text-gray-700"
            }`}
          >
            {campaign.status}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="mb-2">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{completedCount}/{tasks.length} tasks</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Status Controls */}
        <div className="flex gap-2 flex-wrap">
          {campaign.status === "planned" && (
            <button
              onClick={() => updateStatus("active")}
              disabled={saving}
              className="px-3 py-1 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              Start Campaign
            </button>
          )}
          {campaign.status === "active" && (
            <>
              <button
                onClick={() => updateStatus("paused")}
                disabled={saving}
                className="px-3 py-1 text-xs bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
              >
                Pause
              </button>
              <button
                onClick={() => updateStatus("completed")}
                disabled={saving}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Complete
              </button>
            </>
          )}
          {campaign.status === "paused" && (
            <button
              onClick={() => updateStatus("active")}
              disabled={saving}
              className="px-3 py-1 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              Resume
            </button>
          )}
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-3">
        {/* Coupon Code & UTM */}
        {(campaign.couponCode || campaign.utmCampaign) && (
          <div className="bg-white rounded-lg border p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Tracking</h3>
            <div className="space-y-2">
              {campaign.couponCode && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Coupon Code</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(campaign.couponCode!);
                      showToast("Coupon copied");
                    }}
                    className="font-mono text-sm font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded hover:bg-purple-100"
                  >
                    {campaign.couponCode}
                  </button>
                </div>
              )}
              {campaign.discountPercent && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Discount</span>
                  <span className="text-sm text-gray-900">{campaign.discountPercent}% off</span>
                </div>
              )}
              {campaign.utmCampaign && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">UTM Campaign</span>
                  <span className="text-xs font-mono text-gray-700">{campaign.utmCampaign}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Results */}
        {campaign.resultsJson && (
          <div className="bg-white rounded-lg border p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Results</h3>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Views", value: campaign.resultsJson.views },
                { label: "Clicks", value: campaign.resultsJson.clicks },
                { label: "Sales", value: campaign.resultsJson.conversions },
                { label: "Revenue", value: `$${(campaign.resultsJson.revenue / 100).toFixed(2)}` },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Channel Legend */}
        <div className="bg-white rounded-lg border p-3">
          <div className="flex flex-wrap gap-3">
            {Object.entries(CHANNEL_COLORS).map(([channel, colors]) => (
              <div key={channel} className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
                <span className="text-xs text-gray-600 capitalize">{channel}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 30-Day Timeline */}
        <div className="space-y-1">
          {Array.from({ length: 30 }, (_, i) => i + 1).map((day) => {
            const dayTasks = tasksByDay[day] ?? [];
            const isToday = day === currentDay;
            const isPast = day < currentDay;
            const isExpanded = expandedDay === day;
            const allDone = dayTasks.length > 0 && dayTasks.every((dt) => dt.task.status === "completed");
            const hasTasks = dayTasks.length > 0;

            return (
              <div
                key={day}
                className={`bg-white rounded-lg border transition-all ${
                  isToday ? "border-blue-400 ring-1 ring-blue-200" : ""
                } ${!hasTasks ? "opacity-50" : ""}`}
              >
                {/* Day Header */}
                <button
                  onClick={() => hasTasks && setExpandedDay(isExpanded ? null : day)}
                  className="w-full px-3 py-2 flex items-center justify-between text-left"
                  disabled={!hasTasks}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold w-8 text-center ${
                        isToday
                          ? "text-blue-600"
                          : isPast
                            ? "text-gray-400"
                            : "text-gray-700"
                      }`}
                    >
                      D{day}
                    </span>
                    {isToday && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                        TODAY
                      </span>
                    )}
                    {allDone && hasTasks && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
                        DONE
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {dayTasks.map((dt, i) => {
                      const colors = CHANNEL_COLORS[dt.task.channel] ?? CHANNEL_COLORS.social;
                      return (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-full ${colors.dot} ${
                            dt.task.status === "completed" ? "opacity-30" : ""
                          }`}
                        />
                      );
                    })}
                    {hasTasks && (
                      <span className="text-xs text-gray-400 ml-1">
                        {isExpanded ? "−" : "+"}
                      </span>
                    )}
                  </div>
                </button>

                {/* Expanded Tasks */}
                {isExpanded && hasTasks && (
                  <div className="px-3 pb-3 space-y-2">
                    {dayTasks.map((dt, i) => {
                      const colors = CHANNEL_COLORS[dt.task.channel] ?? CHANNEL_COLORS.social;
                      return (
                        <div
                          key={i}
                          className={`flex items-start gap-2 p-2 rounded-lg ${colors.bg}`}
                        >
                          <button
                            onClick={() => toggleTask(day, dt.index, dt.task.status)}
                            disabled={saving}
                            className={`mt-0.5 w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                              dt.task.status === "completed"
                                ? "bg-green-500 border-green-500 text-white"
                                : "border-gray-300 hover:border-blue-400"
                            }`}
                          >
                            {dt.task.status === "completed" && (
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-xs leading-relaxed ${colors.text} ${
                                dt.task.status === "completed" ? "line-through opacity-60" : ""
                              }`}
                            >
                              {dt.task.task}
                            </p>
                            <span
                              className={`text-[10px] font-medium capitalize ${colors.text} opacity-70`}
                            >
                              {dt.task.channel}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
