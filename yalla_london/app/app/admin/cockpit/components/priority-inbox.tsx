"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AdminButton } from "@/components/admin/admin-ui";
import { runCronAction } from "../lib/article-actions";
import type { ContentItem, ContentMatrixData } from "../types";

interface PriorityInboxProps {
  siteId: string;
  contentData: ContentMatrixData | null;
}

interface PriorityItem {
  id: string;
  severity: "critical" | "warning" | "info";
  message: string;
  actionLabel: string;
  action: () => Promise<void>;
}

export function PriorityInbox({ siteId, contentData }: PriorityInboxProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [queueHealth, setQueueHealth] = useState<Record<string, unknown> | null>(null);

  // Fetch queue health for pipeline stall detection
  const fetchQueueHealth = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/queue-monitor?siteId=${encodeURIComponent(siteId)}`);
      if (res.ok) {
        const data = await res.json();
        setQueueHealth(data);
      }
    } catch {
      // silent — priority inbox is a best-effort feature
    }
  }, [siteId]);

  useEffect(() => { fetchQueueHealth(); }, [fetchQueueHealth]);

  // Auto-refresh every 60s
  useEffect(() => {
    const interval = setInterval(fetchQueueHealth, 60_000);
    return () => clearInterval(interval);
  }, [fetchQueueHealth]);

  const runPriorityAction = async (id: string, label: string, fn: () => Promise<void>) => {
    setLoading(id);
    setFeedback((prev) => ({ ...prev, [id]: "" }));
    try {
      await fn();
      setFeedback((prev) => ({ ...prev, [id]: "Done" }));
    } catch (e) {
      setFeedback((prev) => ({ ...prev, [id]: `Failed: ${e instanceof Error ? e.message : "Error"}` }));
    } finally {
      setLoading(null);
    }
  };

  // Build priority items from content data
  const items: PriorityItem[] = [];

  if (contentData) {
    const { summary, articles } = contentData;

    // 1. Pipeline stalled — check overallHealth from queue monitor
    const isStalled = queueHealth && (queueHealth as Record<string, unknown>).overallHealth === "stalled";
    if (isStalled || (summary.reservoir > 10 && summary.published === 0)) {
      items.push({
        id: "pipeline-stalled",
        severity: "critical",
        message: `Pipeline may be stalled — ${summary.reservoir} in reservoir, ${summary.published} published`,
        actionLabel: "Fix Pipeline",
        action: () => runCronAction("/api/cron/diagnostic-sweep", siteId).then(() => {}),
      });
    }

    // 2. Ready but not published (reservoir buildup)
    if (summary.reservoir > 5) {
      items.push({
        id: "reservoir-buildup",
        severity: "warning",
        message: `${summary.reservoir} articles ready but not published`,
        actionLabel: "Publish Best 2",
        action: () => runCronAction("/api/cron/content-selector", siteId).then(() => {}),
      });
    }

    // 3. Thin articles
    const thinArticles = articles.filter(
      (a: ContentItem) => a.type === "published" && a.wordCount < 500 && a.wordCount > 0
    );
    if (thinArticles.length > 0) {
      items.push({
        id: "thin-articles",
        severity: "warning",
        message: `${thinArticles.length} published article${thinArticles.length > 1 ? "s" : ""} under 500 words`,
        actionLabel: "Expand Now",
        action: () => runCronAction("/api/cron/seo-deep-review", siteId).then(() => {}),
      });
    }

    // 4. Never-submitted pages
    const neverSubmitted = articles.filter(
      (a: ContentItem) => a.type === "published" && a.indexingStatus === null
    );
    if (neverSubmitted.length > 3) {
      items.push({
        id: "never-submitted",
        severity: "info",
        message: `${neverSubmitted.length} published pages never submitted to Google`,
        actionLabel: "Submit to Google",
        action: () => runCronAction("/api/cron/process-indexing-queue", siteId).then(() => {}),
      });
    }

    // 5. High impressions, low CTR
    const lowCtr = articles.filter(
      (a: ContentItem) => a.type === "published" && (a.gscImpressions ?? 0) > 50 && (a.gscClicks ?? 0) < 3
    );
    if (lowCtr.length > 0) {
      items.push({
        id: "low-ctr",
        severity: "info",
        message: `${lowCtr.length} page${lowCtr.length > 1 ? "s" : ""} with high impressions but low clicks`,
        actionLabel: "Improve Titles",
        action: () => runCronAction("/api/cron/seo-deep-review", siteId).then(() => {}),
      });
    }

    // 6. Stuck drafts
    const stuckDrafts = articles.filter(
      (a: ContentItem) => a.type === "draft" && a.hoursInPhase > 6
    );
    if (stuckDrafts.length > 3) {
      items.push({
        id: "stuck-drafts",
        severity: "warning",
        message: `${stuckDrafts.length} drafts stuck for 6+ hours`,
        actionLabel: "Run Diagnostics",
        action: () => runCronAction("/api/cron/diagnostic-sweep", siteId).then(() => {}),
      });
    }
  }

  // Limit to top 5 by severity
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  const sorted = items.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]).slice(0, 5);

  if (sorted.length === 0) return null;

  const severityColors = {
    critical: "border-l-[#C8322B] bg-[rgba(200,50,43,0.04)]",
    warning: "border-l-[#C49A2A] bg-[rgba(196,154,42,0.04)]",
    info: "border-l-[#3B7EA1] bg-[rgba(59,126,161,0.04)]",
  };
  const dotColors = {
    critical: "bg-[#C8322B]",
    warning: "bg-[#C49A2A]",
    info: "bg-[#3B7EA1]",
  };

  return (
    <div className="mb-4">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-2 text-xs font-semibold text-stone-700 mb-2 hover:text-stone-900"
      >
        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[rgba(200,50,43,0.1)] text-[#C8322B] text-[10px] font-bold">
          {sorted.length}
        </span>
        Attention Needed
        <svg className={`w-3 h-3 transition-transform ${collapsed ? "" : "rotate-180"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {!collapsed && (
        <div className="space-y-1.5">
          {sorted.map((item) => (
            <div
              key={item.id}
              className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg border-l-3 ${severityColors[item.severity]}`}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className={`flex-shrink-0 w-2 h-2 rounded-full ${dotColors[item.severity]}`} />
                <span className="text-[12px] text-stone-700 truncate">{item.message}</span>
                {feedback[item.id] && (
                  <span className="text-[10px] text-stone-500 flex-shrink-0">{feedback[item.id]}</span>
                )}
              </div>
              <AdminButton
                onClick={() => runPriorityAction(item.id, item.actionLabel, item.action)}
                loading={loading === item.id}
                size="sm"
                variant="secondary"
                className="flex-shrink-0 text-[11px] whitespace-nowrap"
              >
                {item.actionLabel}
              </AdminButton>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
