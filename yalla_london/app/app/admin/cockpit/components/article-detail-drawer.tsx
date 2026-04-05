"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ArticleDetail {
  id: string;
  type: "published" | "draft";
  title: string;
  titleAr: string | null;
  slug: string | null;
  url: string | null;
  locale: string;
  siteId: string;
  status: string;
  generatedAt: string;
  publishedAt: string | null;
  qualityScore: number | null;
  seoScore: number | null;
  wordCount: number;
  internalLinksCount: number;
  indexingStatus: string | null;
  coverageState: string | null;
  lastSubmittedAt: string | null;
  lastCrawledAt: string | null;
  gscClicks: number | null;
  gscImpressions: number | null;
  rejectionReason: string | null;
  lastError: string | null;
  plainError: string | null;
  phase: string | null;
  phaseProgress: number;
  hoursInPhase: number;
  pairedDraftId: string | null;
  metaTitleEn: string | null;
  metaDescriptionEn: string | null;
  tags: string[];
  topicTitle: string | null;
  sourcePipeline?: string | null;
  traceId?: string | null;
}

interface Props {
  article: ArticleDetail;
  onClose: () => void;
  onAction: (action: string, id: string, label: string) => Promise<void>;
  onRefresh: () => void;
  siteId: string;
}

// ─── Helper ─────────────────────────────────────────────────────────────────

function formatDate(d: string | null) {
  if (!d) return "—";
  const date = new Date(d);
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(d: string | null) {
  if (!d) return "—";
  const date = new Date(d);
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function timeAgo(d: string | null) {
  if (!d) return "";
  const diff = Date.now() - new Date(d).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return `${Math.floor(diff / 60000)}m ago`;
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ArticleDetailDrawer({ article, onClose, onAction, onRefresh, siteId }: Props) {
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState(article.title);
  const [editMetaDesc, setEditMetaDesc] = useState(article.metaDescriptionEn || "");
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<string | null>(null);

  // Reset edit state when article changes
  useEffect(() => {
    setEditTitle(article.title);
    setEditMetaDesc(article.metaDescriptionEn || "");
    setEditMode(false);
    setSaveResult(null);
    setActionResult(null);
  }, [article.id, article.title, article.metaDescriptionEn]);

  const handleSave = async () => {
    setSaving(true);
    setSaveResult(null);
    try {
      const endpoint = article.type === "published"
        ? `/api/admin/blog-posts/${article.id}`
        : "/api/admin/content-matrix";
      const body = article.type === "published"
        ? { title_en: editTitle, meta_description_en: editMetaDesc }
        : { action: "update_draft", draftId: article.id, title: editTitle, metaDescription: editMetaDesc };
      const res = await fetch(endpoint, {
        method: article.type === "published" ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSaveResult("Saved!");
      setEditMode(false);
      onRefresh();
    } catch (e) {
      setSaveResult(`Error: ${e instanceof Error ? e.message : "Failed"}`);
    } finally {
      setSaving(false);
    }
  };

  const doAction = async (action: string, label: string) => {
    setActionLoading(action);
    setActionResult(null);
    try {
      if (action === "publish" && article.status === "reservoir") {
        const r = await fetch("/api/admin/force-publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ draftId: article.id, locale: article.locale, count: 1, siteId }),
        });
        const j = r.ok ? await r.json() : { success: false, error: `HTTP ${r.status}` };
        setActionResult(j.success ? "Published!" : `Error: ${j.error ?? "Failed"}`);
        if (j.success) onRefresh();
      } else if (action === "unpublish") {
        const r = await fetch("/api/admin/content-matrix", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "unpublish", blogPostId: article.id }),
        });
        const j = r.ok ? await r.json() : { success: false };
        setActionResult(j.success ? "Unpublished" : "Error");
        if (j.success) onRefresh();
      } else if (action === "reindex") {
        const r = await fetch("/api/admin/content-indexing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "submit", slugs: [article.slug] }),
        });
        const j = r.ok ? await r.json() : { success: false };
        setActionResult(j.success !== false ? "Submitted to Google" : "Failed");
      } else if (action === "re_queue") {
        await onAction("re_queue", article.id, "Re-queued");
        setActionResult("Re-queued!");
        onRefresh();
      } else if (action === "delete") {
        const actionName = article.type === "published" ? "delete_post" : "delete_draft";
        await onAction(actionName, article.id, "Deleted");
        setActionResult("Deleted");
        setTimeout(() => onClose(), 500);
      }
    } catch (e) {
      setActionResult(`Error: ${e instanceof Error ? e.message : "Failed"}`);
    } finally {
      setActionLoading(null);
    }
  };

  const isPublished = article.type === "published";
  const isReservoir = article.status === "reservoir";
  const isRejected = article.status === "rejected";
  const isStuck = article.hoursInPhase > 3;

  const scoreColor = (s: number | null) => {
    if (s === null) return "#A8A29E";
    if (s >= 70) return "#2D5A3D";
    if (s >= 50) return "#C49A2A";
    return "#C8322B";
  };

  const statusLabel = () => {
    if (isPublished) return { text: "Published", bg: "#E8F5E9", color: "#2D5A3D" };
    if (isReservoir) return { text: "Ready to Publish", bg: "#E3F2FD", color: "#1565C0" };
    if (isRejected) return { text: "Rejected", bg: "#FFEBEE", color: "#C8322B" };
    if (article.phase) return { text: article.phase.charAt(0).toUpperCase() + article.phase.slice(1), bg: "#F3E5F5", color: "#7B1FA2" };
    return { text: "Draft", bg: "#FFF3E0", color: "#E65100" };
  };

  const status = statusLabel();

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl w-full max-h-[90vh] overflow-y-auto animate-slide-up"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "slideUp 0.25s ease-out" }}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-stone-300" />
        </div>

        {/* Header */}
        <div className="px-5 pb-3 border-b border-stone-200">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {editMode ? (
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full text-lg font-bold text-stone-900 border border-stone-300 rounded-lg px-2 py-1 focus:outline-none focus:border-[#3B7EA1]"
                  style={{ fontFamily: "var(--font-display)" }}
                  autoFocus
                />
              ) : (
                <h2
                  className="text-lg font-bold text-stone-900 leading-tight"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {article.title}
                </h2>
              )}
              {article.slug && (
                <p className="text-xs text-stone-400 mt-1 truncate">/blog/{article.slug}</p>
              )}
            </div>
            <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-xl shrink-0 mt-1">✕</button>
          </div>

          {/* Status badge + date */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span
              className="px-2 py-0.5 rounded-full text-xs font-semibold"
              style={{ backgroundColor: status.bg, color: status.color }}
            >
              {status.text}
            </span>
            {article.locale && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-stone-100 text-stone-500 uppercase">
                {article.locale}
              </span>
            )}
            <span className="text-xs text-stone-400">
              {isPublished ? `Published ${formatDate(article.publishedAt || article.generatedAt)}` : `Created ${formatDate(article.generatedAt)}`}
            </span>
            {article.publishedAt && (
              <span className="text-[10px] text-stone-400">{timeAgo(article.publishedAt)}</span>
            )}
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-px bg-stone-200 border-b border-stone-200">
          {[
            { label: "Words", value: article.wordCount > 0 ? article.wordCount.toLocaleString() : "—", color: article.wordCount < 500 ? "#C8322B" : article.wordCount < 1000 ? "#C49A2A" : "#2D5A3D" },
            { label: "SEO", value: article.seoScore !== null ? `${article.seoScore}` : "—", color: scoreColor(article.seoScore) },
            { label: "Links", value: article.internalLinksCount > 0 ? `${article.internalLinksCount}` : "—", color: article.internalLinksCount < 3 ? "#C49A2A" : "#2D5A3D" },
            { label: "Clicks (7d)", value: article.gscClicks !== null ? article.gscClicks.toLocaleString() : "—", color: (article.gscClicks ?? 0) > 0 ? "#2D5A3D" : "#A8A29E" },
            { label: "Impressions", value: article.gscImpressions !== null ? article.gscImpressions.toLocaleString() : "—", color: (article.gscImpressions ?? 0) > 0 ? "#3B7EA1" : "#A8A29E" },
            { label: "Quality", value: article.qualityScore !== null ? `${article.qualityScore}` : "—", color: scoreColor(article.qualityScore) },
          ].map((m) => (
            <div key={m.label} className="bg-white px-3 py-2.5 text-center">
              <div className="text-lg font-bold" style={{ color: m.color, fontFamily: "var(--font-display)" }}>{m.value}</div>
              <div className="text-[9px] text-stone-400 font-medium uppercase tracking-wider">{m.label}</div>
            </div>
          ))}
        </div>

        {/* Details Section */}
        <div className="px-5 py-4 space-y-4">

          {/* Google Status */}
          <div>
            <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Google Status</h4>
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-stone-500">Indexing</span>
                <span className={`font-medium ${
                  article.indexingStatus === "indexed" ? "text-[#2D5A3D]" :
                  article.indexingStatus === "submitted" ? "text-[#3B7EA1]" :
                  article.indexingStatus === "error" ? "text-[#C8322B]" :
                  "text-stone-400"
                }`}>
                  {article.indexingStatus ? article.indexingStatus.charAt(0).toUpperCase() + article.indexingStatus.slice(1) : "Not tracked"}
                </span>
              </div>
              {article.lastSubmittedAt && (
                <div className="flex justify-between text-sm">
                  <span className="text-stone-500">Last submitted</span>
                  <span className="text-stone-600">{formatDateTime(article.lastSubmittedAt)}</span>
                </div>
              )}
              {article.lastCrawledAt && (
                <div className="flex justify-between text-sm">
                  <span className="text-stone-500">Last crawled</span>
                  <span className="text-stone-600">{formatDateTime(article.lastCrawledAt)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Meta Description (editable) */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Meta Description</h4>
              {!editMode && (
                <button onClick={() => setEditMode(true)} className="text-xs text-[#3B7EA1] font-medium">Edit</button>
              )}
            </div>
            {editMode ? (
              <div>
                <textarea
                  value={editMetaDesc}
                  onChange={(e) => setEditMetaDesc(e.target.value)}
                  rows={3}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#3B7EA1]"
                />
                <p className={`text-right text-[10px] mt-0.5 ${editMetaDesc.length > 160 ? "text-[#C8322B]" : editMetaDesc.length < 120 ? "text-[#C49A2A]" : "text-[#2D5A3D]"}`}>
                  {editMetaDesc.length}/160 chars
                </p>
              </div>
            ) : (
              <p className="text-sm text-stone-600 leading-relaxed">
                {article.metaDescriptionEn || <span className="text-stone-400 italic">No meta description</span>}
              </p>
            )}
          </div>

          {/* Tags */}
          {article.tags.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Tags</h4>
              <div className="flex flex-wrap gap-1">
                {article.tags.map((t) => (
                  <span key={t} className="px-2 py-0.5 bg-stone-100 rounded-full text-xs text-stone-500">{t}</span>
                ))}
              </div>
            </div>
          )}

          {/* Pipeline Info (for drafts) */}
          {article.type === "draft" && article.phase && (
            <div>
              <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Pipeline Status</h4>
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-stone-500">Current Phase</span>
                  <span className="font-medium text-stone-700">{article.phase}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-stone-500">Time in Phase</span>
                  <span className={`font-medium ${article.hoursInPhase > 6 ? "text-[#C8322B]" : article.hoursInPhase > 2 ? "text-[#C49A2A]" : "text-[#2D5A3D]"}`}>
                    {article.hoursInPhase < 1 ? `${Math.round(article.hoursInPhase * 60)}m` : `${Math.round(article.hoursInPhase)}h`}
                  </span>
                </div>
                {article.phaseProgress > 0 && (
                  <div>
                    <div className="flex justify-between text-xs text-stone-400 mb-1">
                      <span>Progress</span>
                      <span>{Math.round(article.phaseProgress)}%</span>
                    </div>
                    <div className="h-1.5 bg-stone-200 rounded-full overflow-hidden">
                      <div className="h-full bg-[#3B7EA1] rounded-full transition-all" style={{ width: `${article.phaseProgress}%` }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error */}
          {(article.plainError || article.rejectionReason) && (
            <div className="rounded-xl p-3" style={{ backgroundColor: "rgba(200,50,43,0.05)" }}>
              <h4 className="text-xs font-semibold text-[#C8322B] uppercase tracking-wider mb-1">
                {article.rejectionReason ? "Rejection Reason" : "Last Error"}
              </h4>
              <p className="text-sm text-[#C8322B]">{article.rejectionReason || article.plainError}</p>
            </div>
          )}

          {/* Trace ID */}
          {article.traceId && (
            <div className="flex justify-between text-xs text-stone-400">
              <span>Trace ID</span>
              <span className="font-mono">{article.traceId.slice(0, 12)}…</span>
            </div>
          )}

          {/* Save Result */}
          {saveResult && (
            <p className={`text-sm font-medium ${saveResult.startsWith("Saved") ? "text-[#2D5A3D]" : "text-[#C8322B]"}`}>
              {saveResult}
            </p>
          )}

          {/* Action Result */}
          {actionResult && (
            <p className={`text-sm font-medium ${actionResult.includes("Error") || actionResult.includes("Failed") ? "text-[#C8322B]" : "text-[#2D5A3D]"}`}>
              {actionResult}
            </p>
          )}
        </div>

        {/* Action Buttons — sticky at bottom */}
        <div className="sticky bottom-0 bg-white border-t border-stone-200 px-5 py-4 space-y-2">
          {/* Edit mode save */}
          {editMode && (
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all active:scale-[0.97]"
                style={{ backgroundColor: "#3B7EA1" }}
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
              <button
                onClick={() => { setEditMode(false); setEditTitle(article.title); setEditMetaDesc(article.metaDescriptionEn || ""); }}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-stone-500 border border-stone-200 transition-all active:scale-[0.97]"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Primary actions */}
          {!editMode && (
            <div className="grid grid-cols-2 gap-2">
              {/* Published article actions */}
              {isPublished && (
                <>
                  {article.url && (
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 rounded-xl text-sm font-semibold text-center transition-all active:scale-[0.97]"
                      style={{ backgroundColor: "#E8F5E9", color: "#2D5A3D" }}
                    >
                      View Live
                    </a>
                  )}
                  <button
                    onClick={() => setEditMode(true)}
                    className="py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.97]"
                    style={{ backgroundColor: "#3B7EA1" }}
                  >
                    Edit
                  </button>
                  <Link
                    href={`/admin/articles/edit/${article.id}`}
                    className="py-2.5 rounded-xl text-sm font-semibold text-center transition-all active:scale-[0.97] border border-stone-200 text-stone-600"
                  >
                    Full Editor
                  </Link>
                  <button
                    onClick={() => doAction("reindex", "Re-index")}
                    disabled={actionLoading === "reindex"}
                    className="py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.97] disabled:opacity-50"
                    style={{ backgroundColor: "#EDE7F6", color: "#5B21B6" }}
                  >
                    {actionLoading === "reindex" ? "…" : "Submit to Google"}
                  </button>
                </>
              )}

              {/* Reservoir article actions */}
              {isReservoir && (
                <>
                  <button
                    onClick={() => doAction("publish", "Publish")}
                    disabled={actionLoading === "publish"}
                    className="py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.97] disabled:opacity-50"
                    style={{ backgroundColor: "#2D5A3D" }}
                  >
                    {actionLoading === "publish" ? "Publishing…" : "Publish Now"}
                  </button>
                  <button
                    onClick={() => setEditMode(true)}
                    className="py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.97]"
                    style={{ backgroundColor: "#E3F2FD", color: "#1565C0" }}
                  >
                    Edit
                  </button>
                </>
              )}

              {/* Rejected / stuck draft actions */}
              {(isRejected || isStuck) && (
                <button
                  onClick={() => doAction("re_queue", "Re-queue")}
                  disabled={actionLoading === "re_queue"}
                  className="py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.97] disabled:opacity-50"
                  style={{ backgroundColor: "#FFF3E0", color: "#E65100" }}
                >
                  {actionLoading === "re_queue" ? "…" : "Retry"}
                </button>
              )}
            </div>
          )}

          {/* Danger zone */}
          {!editMode && (
            <div className="flex gap-2 pt-1">
              {isPublished && (
                <button
                  onClick={() => doAction("unpublish", "Unpublish")}
                  disabled={actionLoading === "unpublish"}
                  className="flex-1 py-2 rounded-xl text-xs font-medium text-stone-400 border border-stone-200 transition-all active:scale-[0.97] disabled:opacity-50"
                >
                  {actionLoading === "unpublish" ? "…" : "Unpublish"}
                </button>
              )}
              <button
                onClick={() => doAction("delete", "Delete")}
                disabled={actionLoading === "delete"}
                className="flex-1 py-2 rounded-xl text-xs font-medium text-[#C8322B] border border-[#C8322B]/20 transition-all active:scale-[0.97] disabled:opacity-50"
              >
                {actionLoading === "delete" ? "…" : "Delete"}
              </button>
            </div>
          )}
        </div>

        {/* CSS for slide-up animation */}
        <style jsx>{`
          @keyframes slideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
          .animate-slide-up {
            animation: slideUp 0.25s ease-out;
          }
        `}</style>
      </div>
    </div>
  );
}
