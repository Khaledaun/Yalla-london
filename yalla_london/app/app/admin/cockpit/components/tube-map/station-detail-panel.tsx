"use client";

import React, { useState, useCallback } from "react";
import { AdminButton } from "@/components/admin/admin-ui";
import { runCronAction, reQueueDraft, deleteDraft, publishArticle } from "../../lib/article-actions";
import { LocaleDots } from "../locale-dots";
import { scoreColor, timeAgo } from "../../types";
import type { ContentItem } from "../../types";
import type { StationData } from "./tube-map-hooks";
import { STATION_MAP, TUBE_LINES } from "./tube-map-data";

interface StationDetailPanelProps {
  stationId: string;
  data: StationData;
  siteId: string;
  lineColor: string;
  onClose: () => void;
  onArticleClick: (article: ContentItem) => void;
  onRefresh: () => void;
}

function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
}

export function StationDetailPanel({
  stationId,
  data,
  siteId,
  lineColor,
  onClose,
  onArticleClick,
  onRefresh,
}: StationDetailPanelProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const station = STATION_MAP.get(stationId);
  if (!station) return null;

  // Find which line this station belongs to (primary)
  const line = TUBE_LINES.find((l) => l.stations.includes(stationId));
  const lineName = line?.name ?? "Unknown Line";

  const avgHours = data.articles.length > 0
    ? data.articles.reduce((sum, a) => sum + (a.hoursInPhase ?? 0), 0) / data.articles.length
    : 0;

  const handleAction = useCallback(async (action: string, articleId?: string) => {
    setActionLoading(action + (articleId ?? ""));
    try {
      if (action === "run-phase" && station.phase) {
        // Trigger the content-builder cron
        await runCronAction("/api/cron/content-builder", siteId);
      } else if (action === "re-queue" && articleId) {
        await reQueueDraft(articleId, siteId);
      } else if (action === "delete" && articleId) {
        await deleteDraft(articleId, siteId);
      } else if (action === "publish" && articleId) {
        const article = data.articles.find(a => a.id === articleId);
        await publishArticle(articleId, article?.locale ?? "en", siteId);
      }
      onRefresh();
    } catch (err) {
      console.warn("[station-detail] Action failed:", (err as Error).message);
    } finally {
      setActionLoading(null);
    }
  }, [station, siteId, data.articles, onRefresh]);

  // Sort: stuck first, then by time in phase descending
  const sortedArticles = [...data.articles].sort((a, b) => {
    if ((a.hoursInPhase ?? 0) > 6 && (b.hoursInPhase ?? 0) <= 6) return -1;
    if ((b.hoursInPhase ?? 0) > 6 && (a.hoursInPhase ?? 0) <= 6) return 1;
    return (b.hoursInPhase ?? 0) - (a.hoursInPhase ?? 0);
  });

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 bg-[#1A1F26] border-t border-white/10 rounded-t-2xl shadow-2xl max-h-[70vh] overflow-y-auto"
      role="dialog"
      aria-label={`${station.label} station details`}
    >
      {/* Drag handle */}
      <div className="flex justify-center py-2">
        <div className="w-10 h-1 rounded-full bg-white/20" />
      </div>

      {/* Header */}
      <div className="px-4 pb-3 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ background: lineColor }}
              />
              <h3 className="text-white font-bold text-base">
                {station.label}
              </h3>
            </div>
            <p className="text-white/40 text-xs mt-0.5">
              {lineName} &middot; {data.count} article{data.count !== 1 ? "s" : ""} &middot; Avg: {formatHours(avgHours)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white text-xl p-1"
            aria-label="Close"
          >
            &times;
          </button>
        </div>
      </div>

      {/* Article list */}
      <div className="px-4 py-2">
        {sortedArticles.length === 0 ? (
          <p className="text-white/30 text-sm py-6 text-center">No articles at this station</p>
        ) : (
          sortedArticles.map((article) => {
            const isStuck = (article.hoursInPhase ?? 0) > 6;
            const hasError = !!article.lastError;

            return (
              <div
                key={article.id}
                className={`py-3 border-b border-white/5 ${isStuck ? "bg-amber-900/10" : ""}`}
              >
                {/* Title row */}
                <button
                  className="w-full text-left"
                  onClick={() => onArticleClick(article)}
                >
                  <div className="flex items-center gap-2">
                    <LocaleDots
                      wordCountEn={article.wordCount ?? 0}
                      wordCountAr={article.wordCountAr ?? 0}
                    />
                    <span className="text-white/90 text-sm font-medium truncate flex-1">
                      {article.title ?? article.slug ?? "Untitled"}
                    </span>
                    <span className={`text-xs ${isStuck ? "text-amber-400" : "text-white/30"}`}>
                      {article.hoursInPhase ? formatHours(article.hoursInPhase) : ""}
                      {isStuck ? " ⚠️" : ""}
                    </span>
                  </div>

                  {/* Metrics row */}
                  <div className="flex items-center gap-3 mt-1 text-xs text-white/40">
                    {article.seoScore != null && (
                      <span className={scoreColor(article.seoScore)}>
                        SEO {article.seoScore}
                      </span>
                    )}
                    {article.wordCount != null && (
                      <span>{article.wordCount.toLocaleString()}w</span>
                    )}
                    {hasError && (
                      <span className="text-red-400 truncate max-w-[150px]">
                        {article.plainError ?? "Error"}
                      </span>
                    )}
                  </div>
                </button>

                {/* Action buttons */}
                <div className="flex gap-2 mt-2 flex-wrap">
                  {station.phase === "reservoir" && (
                    <AdminButton
                      size="sm"
                      onClick={() => handleAction("publish", article.id)}
                      disabled={actionLoading !== null}
                    >
                      {actionLoading === `publish${article.id}` ? "..." : "Publish"}
                    </AdminButton>
                  )}
                  {article.type === "draft" && (
                    <>
                      <AdminButton
                        size="sm"
                        variant="ghost"
                        onClick={() => handleAction("re-queue", article.id)}
                        disabled={actionLoading !== null}
                      >
                        Re-queue
                      </AdminButton>
                      <AdminButton
                        size="sm"
                        variant="ghost"
                        onClick={() => handleAction("delete", article.id)}
                        disabled={actionLoading !== null}
                      >
                        Delete
                      </AdminButton>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Station actions footer */}
      <div className="px-4 py-3 border-t border-white/10 flex gap-2 flex-wrap">
        {station.phase && (
          <AdminButton
            size="sm"
            onClick={() => handleAction("run-phase")}
            disabled={actionLoading !== null}
          >
            {actionLoading === "run-phase" ? "Running..." : "Run This Phase"}
          </AdminButton>
        )}
        {data.stuckCount > 0 && (
          <AdminButton
            size="sm"
            variant="ghost"
            onClick={() => {
              // Reject all stuck articles (>6h)
              const stuckIds = data.articles
                .filter((a) => (a.hoursInPhase ?? 0) > 6 && a.type === "draft")
                .map((a) => a.id);
              // Process sequentially
              (async () => {
                setActionLoading("reject-stuck");
                for (const id of stuckIds) {
                  await deleteDraft(id, siteId).catch(() => {});
                }
                setActionLoading(null);
                onRefresh();
              })();
            }}
            disabled={actionLoading !== null}
          >
            Reject Stuck ({data.stuckCount})
          </AdminButton>
        )}
      </div>
    </div>
  );
}
