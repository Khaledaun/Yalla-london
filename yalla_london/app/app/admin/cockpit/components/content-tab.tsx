"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  AdminCard,
  AdminButton,
  AdminSectionLabel,
  AdminLoadingState,
  useConfirm,
} from "@/components/admin/admin-ui";
import { ArticleDetailDrawer } from "./article-detail-drawer";
import { StatusDropdown } from "./status-dropdown";
import { PriorityInbox } from "./priority-inbox";
import { LocaleDots } from "./locale-dots";
import { NamedViews, getViewFilter } from "./named-views";
import { ContentCalendar } from "./content-calendar";
import type {
  ContentItem,
  ContentMatrixData,
  GateCheck,
  ResearchedTopic,
  BulkQueueResult,
} from "../types";
import {
  timeAgo,
  shortDate,
  scoreColor,
  statusBadge,
} from "../types";

// ─── Local UI wrappers (matching page.tsx pattern) ───────────────────────────

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <AdminCard className={className}>{children}</AdminCard>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <AdminSectionLabel>{children}</AdminSectionLabel>;
}

function ActionButton({
  onClick,
  loading,
  disabled,
  variant = "default",
  children,
  className = "",
}: {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "default" | "danger" | "success" | "amber";
  children: React.ReactNode;
  className?: string;
}) {
  const variantMap: Record<string, "secondary" | "danger" | "success" | "primary"> = {
    default: "secondary",
    danger: "danger",
    success: "success",
    amber: "primary",
  };
  return (
    <AdminButton
      onClick={onClick}
      loading={loading}
      disabled={disabled}
      variant={variantMap[variant] ?? "secondary"}
      size="sm"
      className={className}
    >
      {children}
    </AdminButton>
  );
}

// ─── ContentTab ──────────────────────────────────────────────────────────────
// PLACEHOLDER: This file will contain the extracted ContentTab component.
// The actual extraction will be done by appending the function body from page.tsx.
export function ContentTab({ activeSiteId }: { activeSiteId: string }) {
  const { confirm, ConfirmDialog } = useConfirm();
  const [data, setData] = useState<ContentMatrixData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [gateResults, setGateResults] = useState<Record<string, GateCheck[]>>({});
  const [gateLoading, setGateLoading] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<Record<string, string>>({});

  // ─── Topic Research & Bulk Create state ──────────────────────────────────
  const [contentView, setContentView] = useState<"articles" | "research" | "calendar">("articles");
  const [namedView, setNamedView] = useState("all");
  const [researchLoading, setResearchLoading] = useState(false);
  const [researchError, setResearchError] = useState<string | null>(null);
  const [researchedTopics, setResearchedTopics] = useState<ResearchedTopic[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<Set<number>>(new Set());
  const [focusArea, setFocusArea] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkQueueResult | null>(null);

  // ─── Phase 1A: Type/Locale filters, Sort, Bulk selection ──────────────
  const [typeFilter, setTypeFilter] = useState<"all" | "blog" | "news" | "information" | "guide">("all");
  const [localeFilter, setLocaleFilter] = useState<"all" | "en" | "ar">("all");
  const [dateRange, setDateRange] = useState<"all" | "today" | "7d" | "30d">("all");
  const [sortCol, setSortCol] = useState<"title" | "date" | "words" | "seo" | "status" | "clicks">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState<string | null>(null);
  const [cronResponsePanel, setCronResponsePanel] = useState<{ label: string; data: Record<string, unknown> } | null>(null);
  const [displayLimit, setDisplayLimit] = useState(50);

  // ─── Article Detail Drawer state ────────────────────────────────────
  const [detailArticle, setDetailArticle] = useState<ContentItem | null>(null);

  // ─── Quick Edit modal state ───────────────────────────────────────────
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editMetaDesc, setEditMetaDesc] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editResult, setEditResult] = useState<string | null>(null);

  const openQuickEdit = (item: ContentItem) => {
    setEditingItem(item);
    setEditTitle(item.title || "");
    setEditMetaDesc(item.metaDescriptionEn || "");
    setEditResult(null);
  };

  const saveQuickEdit = async () => {
    if (!editingItem) return;
    setEditSaving(true);
    setEditResult(null);
    try {
      const endpoint = editingItem.type === "published"
        ? `/api/admin/blog-posts/${editingItem.id}`
        : "/api/admin/content-matrix";
      const body = editingItem.type === "published"
        ? { title_en: editTitle, meta_description_en: editMetaDesc }
        : { action: "update_draft", draftId: editingItem.id, title: editTitle, metaDescription: editMetaDesc };
      const res = await fetch(endpoint, {
        method: editingItem.type === "published" ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setEditResult("Saved!");
      fetchData();
      setTimeout(() => setEditingItem(null), 800);
    } catch (e) {
      setEditResult(`Error: ${e instanceof Error ? e.message : "Failed"}`);
    } finally {
      setEditSaving(false);
    }
  };

  // ─── Photo Order state ────────────────────────────────────────────────────
  const [photoOrderOpen, setPhotoOrderOpen] = useState<Record<string, boolean>>({});
  const [photoOrderInput, setPhotoOrderInput] = useState<Record<string, string>>({});
  const [photoOrderLoading, setPhotoOrderLoading] = useState<string | null>(null);
  const [photoOrderResult, setPhotoOrderResult] = useState<Record<string, string>>({});

  const toggleSort = (col: typeof sortCol) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("desc"); }
  };
  const sortArrow = (col: typeof sortCol) => sortCol === col ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  const toggleSelect = (id: string) => setSelectedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map(a => a.id)));
  };

  const doBulkAction = async (action: string, label: string) => {
    if (selectedIds.size === 0) return;
    setBulkActionLoading(action);
    const promises = [...selectedIds].map(async (id) => {
      const body: Record<string, string> = { action };
      const item = data?.articles.find(a => a.id === id);
      if (action === "re_queue" || action === "delete_draft") body.draftId = id;
      if (action === "delete_post" || action === "unpublish") body.blogPostId = id;
      if (action === "publish_selected" && item?.status === "reservoir") {
        const r = await fetch("/api/admin/force-publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ draftId: id, locale: item.locale, count: 1, siteId: activeSiteId }) });
        if (!r.ok) return false;
        const j = await r.json();
        return !!j.success;
      }
      const r = await fetch("/api/admin/content-matrix", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) return false;
      const j = await r.json();
      return !!j.success;
    });
    const results = await Promise.allSettled(promises);
    const ok = results.filter(r => r.status === "fulfilled" && r.value === true).length;
    const fail = results.length - ok;
    setActionResult(prev => ({ ...prev, __bulk: `✅ ${label}: ${ok} succeeded${fail > 0 ? `, ${fail} failed` : ""}` }));
    setSelectedIds(new Set());
    setBulkActionLoading(null);
    fetchData();
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/admin/content-matrix?siteId=${activeSiteId}&limit=500`);
      if (!res.ok) throw new Error(`API error: HTTP ${res.status}`);
      const json = await res.json();
      if (json.articles) {
        setData(json);
      } else if (json.error) {
        throw new Error(json.error);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      console.warn("[cockpit] Content matrix fetch failed:", msg);
      setFetchError(msg);
    } finally {
      setLoading(false);
    }
  }, [activeSiteId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Reset research state when site changes
  useEffect(() => {
    setResearchedTopics([]);
    setSelectedTopics(new Set());
    setBulkResult(null);
    setResearchError(null);
  }, [activeSiteId]);

  const runTopicResearch = async () => {
    setResearchLoading(true);
    setResearchError(null);
    setResearchedTopics([]);
    setSelectedTopics(new Set());
    setBulkResult(null);
    try {
      const res = await fetch("/api/admin/topic-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId: activeSiteId,
          count: 20,
          focusArea: focusArea.trim() || undefined,
          language: "en",
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error || json.detail || `HTTP ${res.status}`);
      setResearchedTopics(json.topics || []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Research failed";
      console.warn("[cockpit] Topic research failed:", msg);
      setResearchError(msg);
    } finally {
      setResearchLoading(false);
    }
  };

  const toggleTopicSelection = (rank: number) => {
    setSelectedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(rank)) {
        next.delete(rank);
      } else if (next.size < 5) {
        next.add(rank);
      }
      return next;
    });
  };

  const createBulkArticles = async () => {
    const selected = researchedTopics.filter((t) => selectedTopics.has(t.rank));
    if (selected.length === 0) return;

    setBulkLoading(true);
    setBulkResult(null);
    try {
      const res = await fetch("/api/admin/bulk-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "queue",
          siteId: activeSiteId,
          language: "en",
          topicSource: "researched",
          count: selected.length,
          researchedTopics: selected.map((t) => ({
            keyword: t.keyword,
            longTails: t.longTails,
            searchVolume: t.searchVolume,
            estimatedMonthlySearches: t.estimatedMonthlySearches,
            trend: t.trend,
            trendEvidence: t.trendEvidence,
            competition: t.competition,
            relevanceScore: t.relevanceScore,
            suggestedPageType: t.suggestedPageType,
            contentAngle: t.contentAngle,
            rationale: t.rationale,
            questions: t.questions,
          })),
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setBulkResult(json);
      if (json.success) {
        // Refresh article list after a short delay
        setTimeout(() => fetchData(), 2000);
      }
    } catch (e) {
      setBulkResult({ success: false, error: e instanceof Error ? e.message : "Failed to queue articles" });
    } finally {
      setBulkLoading(false);
    }
  };

  const runGateCheck = async (item: ContentItem) => {
    if (item.type !== "draft") return;
    setGateLoading(item.id);
    try {
      const res = await fetch("/api/admin/content-matrix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "gate_check", draftId: item.id }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.checks) setGateResults((prev) => ({ ...prev, [item.id]: json.checks }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Network error";
      console.warn("[cockpit] runGateCheck failed:", msg);
      setGateResults((prev) => ({
        ...prev,
        [item.id]: [{ check: "gate_api", pass: false, label: `Gate check failed: ${msg}`, detail: "Tap 'Run gate check' to retry.", isBlocker: false }],
      }));
    } finally {
      setGateLoading(null);
    }
  };

  const doAction = async (action: string, id: string, label: string) => {
    setActionLoading(`${action}-${id}`);
    try {
      const body: Record<string, string> = { action };
      if (action === "re_queue" || action === "delete_draft" || action === "enhance" || action === "rewrite") body.draftId = id;
      if (action === "delete_post" || action === "unpublish") body.blogPostId = id;
      const res = await fetch("/api/admin/content-matrix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { setActionResult((prev) => ({ ...prev, [id]: `❌ HTTP ${res.status}` })); return; }
      const json = await res.json();
      setActionResult((prev) => ({ ...prev, [id]: json.success ? `✅ ${label} done` : `❌ ${json.error}` }));
      fetchData();
    } catch (e) {
      setActionResult((prev) => ({ ...prev, [id]: `❌ ${e instanceof Error ? e.message : "Error"}` }));
    } finally {
      setActionLoading(null);
    }
  };

  const detectArticleType = (item: ContentItem): string => {
    const u = item.url || item.slug || "";
    if (u.includes("/news/")) return "news";
    if (u.includes("/information/")) return "information";
    if (u.includes("/guides/")) return "guide";
    return "blog";
  };

  const viewFilter = getViewFilter(namedView);
  const filtered = (data?.articles ?? []).filter((a) => {
    // Named view filter (applied first)
    if (namedView !== "all" && !viewFilter(a)) return false;
    if (filter === "published" && a.type !== "published") return false;
    if (filter === "draft" && a.type !== "draft") return false;
    if (filter === "reservoir" && a.status !== "reservoir") return false;
    if (filter === "rejected" && a.status !== "rejected") return false;
    if (filter === "stuck" && a.hoursInPhase < 3) return false;
    if (typeFilter !== "all" && detectArticleType(a) !== typeFilter) return false;
    if (localeFilter !== "all" && a.locale !== localeFilter) return false;
    if (search && !a.title.toLowerCase().includes(search.toLowerCase())) return false;
    // Date range filter
    if (dateRange !== "all") {
      const itemDate = new Date(a.publishedAt || a.generatedAt || "");
      const now = new Date();
      if (dateRange === "today") {
        const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
        if (itemDate < todayStart) return false;
      } else if (dateRange === "7d") {
        if (now.getTime() - itemDate.getTime() > 7 * 24 * 60 * 60 * 1000) return false;
      } else if (dateRange === "30d") {
        if (now.getTime() - itemDate.getTime() > 30 * 24 * 60 * 60 * 1000) return false;
      }
    }
    return true;
  }).sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    switch (sortCol) {
      case "title": return dir * a.title.localeCompare(b.title);
      case "date": return dir * ((a.generatedAt || "").localeCompare(b.generatedAt || ""));
      case "words": return dir * ((a.wordCount || 0) - (b.wordCount || 0));
      case "seo": return dir * ((a.seoScore ?? 0) - (b.seoScore ?? 0));
      case "clicks": return dir * ((a.gscClicks ?? 0) - (b.gscClicks ?? 0));
      case "status": return dir * (a.status.localeCompare(b.status));
      default: return 0;
    }
  });

  const indexColor = (s: string | null) => {
    if (!s) return "text-stone-500";
    if (s === "indexed") return "text-[#2D5A3D]";
    if (s === "submitted") return "text-[#3B7EA1]";
    if (s === "error") return "text-[#C8322B]";
    return "text-stone-400";
  };

  const indexLabel = (item: ContentItem) => {
    if (!item.indexingStatus) return "—";
    if (item.indexingStatus === "indexed") return "Indexed";
    if (item.indexingStatus === "submitted") return "Submitted";
    if (item.indexingStatus === "error") return "Error";
    if (item.indexingStatus === "discovered") return "Discovered";
    if (item.indexingStatus === "never_submitted") return "Not submitted";
    return item.indexingStatus;
  };

  const volumeColor = (v: string) => v === "high" ? "text-[#2D5A3D]" : v === "medium" ? "text-[#C49A2A]" : "text-stone-400";
  const trendIcon = (t: string) => t === "rising" ? "📈" : t === "declining" ? "📉" : "➡️";
  const competitionColor = (c: string) => c === "low" ? "text-[#2D5A3D]" : c === "high" ? "text-[#C8322B]" : "text-[#C49A2A]";

  return (
    <div className="space-y-4">
      {/* ─── View Toggle: Articles | Research ──────────────────────────── */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setContentView("articles")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            contentView === "articles" ? "bg-[#3B7EA1] text-white" : "bg-stone-100 text-stone-400 hover:bg-stone-200"
          }`}
        >
          Articles ({data?.summary.total ?? "…"})
        </button>
        <button
          onClick={() => setContentView("research")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            contentView === "research" ? "bg-[#5B21B6] text-white" : "bg-stone-100 text-stone-400 hover:bg-stone-200"
          }`}
        >
          Research & Create
        </button>
        <button
          onClick={() => setContentView("calendar")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            contentView === "calendar" ? "bg-[#C49A2A] text-white" : "bg-stone-100 text-stone-400 hover:bg-stone-200"
          }`}
        >
          Calendar
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
           RESEARCH & BULK CREATE VIEW
         ═══════════════════════════════════════════════════════════════════ */}
      {contentView === "research" && (
        <div className="space-y-4">
          {/* Research controls */}
          <Card>
            <SectionTitle>SEO Topic Research</SectionTitle>
            <p className="text-stone-400 text-xs mb-3">
              AI-powered keyword research finds 20 high-potential topics for your site.
              Select up to 5 and create bulk articles instantly.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Focus area (optional): e.g. Ramadan, summer, luxury hotels…"
                value={focusArea}
                onChange={(e) => setFocusArea(e.target.value)}
                className="flex-1 bg-stone-100 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-[#5B21B6]"
              />
              <ActionButton
                onClick={runTopicResearch}
                loading={researchLoading}
                variant="default"
                className="whitespace-nowrap bg-[#5B21B6] hover:bg-[#5B21B6] border-[#5B21B6] text-white"
              >
                Research Topics
              </ActionButton>
            </div>
            {researchError && (
              <p className="text-[#C8322B] text-xs mt-2">Research failed: {researchError}</p>
            )}
          </Card>

          {/* Research loading state */}
          {researchLoading && (
            <Card className="text-center py-8">
              <div className="animate-pulse space-y-2">
                <p className="text-[#5B21B6] text-sm font-medium">Researching trending topics…</p>
                <p className="text-stone-500 text-xs">This takes 20-40 seconds. AI is analyzing search trends, competition, and relevance.</p>
              </div>
            </Card>
          )}

          {/* Research results — topic picker */}
          {researchedTopics.length > 0 && (
            <>
              {/* Selection summary bar */}
              <Card className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <p className="text-stone-800 text-sm font-medium">
                    {researchedTopics.length} topics found — select up to 5
                  </p>
                  <p className="text-stone-500 text-xs">
                    {selectedTopics.size} selected{selectedTopics.size > 0 ? `: ${researchedTopics.filter((t) => selectedTopics.has(t.rank)).map((t) => t.keyword).join(", ")}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  {selectedTopics.size > 0 && (
                    <button
                      onClick={() => setSelectedTopics(new Set())}
                      className="px-3 py-1.5 rounded-lg text-xs bg-stone-100 hover:bg-stone-200 text-stone-400 border border-stone-200"
                    >
                      Clear
                    </button>
                  )}
                  <ActionButton
                    onClick={createBulkArticles}
                    loading={bulkLoading}
                    disabled={selectedTopics.size === 0}
                    variant="success"
                    className="whitespace-nowrap"
                  >
                    Create {selectedTopics.size} Article{selectedTopics.size !== 1 ? "s" : ""}
                  </ActionButton>
                </div>
              </Card>

              {/* Bulk creation result */}
              {bulkResult && (
                <Card className={bulkResult.success ? "border-[rgba(45,90,61,0.3)] bg-[rgba(45,90,61,0.04)]" : "border-[rgba(200,50,43,0.3)] bg-[rgba(200,50,43,0.04)]"}>
                  {bulkResult.success ? (
                    <div>
                      <p className="text-[#2D5A3D] text-sm font-medium">
                        {bulkResult.queued} article{(bulkResult.queued ?? 0) !== 1 ? "s" : ""} queued in pipeline
                      </p>
                      <p className="text-stone-400 text-xs mt-1">{bulkResult.message}</p>
                      {bulkResult.articles && bulkResult.articles.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {bulkResult.articles.map((a, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs">
                              <span className="text-[#2D5A3D]">✓</span>
                              <span className="text-stone-600">{a.keyword}</span>
                              <span className="text-stone-500">→ pipeline</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <button
                        onClick={() => { setContentView("articles"); fetchData(); }}
                        className="mt-3 px-3 py-1.5 rounded-lg text-xs bg-[#3B7EA1] hover:bg-[#2d6a8a] text-white"
                      >
                        View in Articles
                      </button>
                    </div>
                  ) : (
                    <p className="text-[#C8322B] text-sm">{bulkResult.error || "Failed to queue articles"}</p>
                  )}
                </Card>
              )}

              {/* Topic cards */}
              <div className="space-y-2">
                {researchedTopics.map((topic) => {
                  const isSelected = selectedTopics.has(topic.rank);
                  const atLimit = selectedTopics.size >= 5 && !isSelected;

                  return (
                    <Card
                      key={topic.rank}
                      className={`cursor-pointer transition-all ${
                        isSelected
                          ? "border-[rgba(124,58,237,0.4)] bg-[rgba(124,58,237,0.06)] ring-1 ring-[rgba(124,58,237,0.15)]"
                          : atLimit
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:border-stone-300"
                      }`}
                    >
                      <div
                        onClick={() => !atLimit && toggleTopicSelection(topic.rank)}
                        className="flex items-start gap-3"
                      >
                        {/* Checkbox */}
                        <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                          isSelected ? "bg-[#5B21B6] border-[#5B21B6]" : "border-stone-300"
                        }`}>
                          {isSelected && <span className="text-white text-xs font-bold">✓</span>}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          {/* Header row */}
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="text-stone-500 text-xs font-mono">#{topic.rank}</span>
                            <span className="text-stone-800 text-sm font-semibold">{topic.keyword}</span>
                            <span className="text-xs">{trendIcon(topic.trend)}</span>
                          </div>

                          {/* Metrics row */}
                          <div className="flex flex-wrap gap-3 text-[11px] mb-2">
                            <span>
                              Vol: <span className={`font-medium ${volumeColor(topic.searchVolume)}`}>{topic.searchVolume}</span>
                              <span className="text-stone-500 ml-1">({topic.estimatedMonthlySearches})</span>
                            </span>
                            <span>
                              Competition: <span className={`font-medium ${competitionColor(topic.competition)}`}>{topic.competition}</span>
                            </span>
                            <span>
                              Relevance: <span className={scoreColor(topic.relevanceScore)}>{topic.relevanceScore}/100</span>
                            </span>
                            <span className="text-stone-500">
                              {topic.suggestedPageType}
                            </span>
                          </div>

                          {/* Long tails */}
                          {topic.longTails.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {topic.longTails.map((lt, i) => (
                                <span key={i} className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-400 text-[10px] border border-stone-200">
                                  {lt}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Trend evidence + rationale */}
                          {topic.trendEvidence && (
                            <p className="text-stone-500 text-[11px] mb-1">
                              <span className="text-stone-400 font-medium">Trend:</span> {topic.trendEvidence}
                            </p>
                          )}
                          <p className="text-stone-500 text-[11px]">
                            <span className="text-stone-400 font-medium">Why:</span> {topic.rationale}
                          </p>

                          {/* Content angle */}
                          {topic.contentAngle && (
                            <p className="text-[#5B21B6]/70 text-[11px] mt-1">
                              Angle: {topic.contentAngle}
                            </p>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </>
          )}

          {/* Empty state */}
          {!researchLoading && researchedTopics.length === 0 && !researchError && (
            <Card className="text-center py-12">
              <p className="text-stone-500 text-sm mb-2">No research results yet</p>
              <p className="text-stone-500 text-xs">Click &quot;Research Topics&quot; to discover high-performing keywords for your site.</p>
            </Card>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
           CALENDAR VIEW
         ═══════════════════════════════════════════════════════════════════ */}
      {contentView === "calendar" && data && (
        <ContentCalendar
          articles={data.articles}
          siteId={activeSiteId}
          onArticleClick={(item) => setDetailArticle(item)}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════════
           ARTICLES VIEW (enhanced existing table)
         ═══════════════════════════════════════════════════════════════════ */}
      {contentView === "articles" && (
        <>
          {loading ? (
            <div className="flex items-center justify-center h-48"><p className="text-stone-500 text-sm">Loading content…</p></div>
          ) : fetchError ? (
            <Card className="text-center py-8 space-y-2">
              <p className="text-[#C8322B] text-sm">Failed to load articles: {fetchError}</p>
              <button onClick={fetchData} className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs">Retry</button>
            </Card>
          ) : (
            <>
              {/* Priority Inbox — attention-needed items */}
              {data && (
                <PriorityInbox siteId={activeSiteId} contentData={data} />
              )}

              {/* Summary cards */}
              {data && (
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {[
                    ["Total", data.summary.total, "text-stone-600"],
                    ["Published", data.summary.published, "text-[#2D5A3D]"],
                    ["Reservoir", data.summary.reservoir, "text-[#3B7EA1]"],
                    ["Pipeline", data.summary.inPipeline, "text-[#C49A2A]"],
                    ["Rejected", data.summary.rejected, "text-[#C8322B]"],
                    ["Stuck", data.summary.stuck, "text-[#92400E]"],
                  ].map(([label, val, color]) => (
                    <Card key={label as string} className="text-center py-3">
                      <div className={`text-xl font-bold ${color}`}>{val}</div>
                      <div className="text-xs text-stone-500 mt-0.5">{label}</div>
                    </Card>
                  ))}
                </div>
              )}

              {/* Quick actions row */}
              <Card className="flex flex-wrap gap-2 items-center">
                <ActionButton
                  onClick={() => setContentView("research")}
                  variant="default"
                  className="bg-[#5B21B6] hover:bg-[#5B21B6] border-[#5B21B6] text-white"
                >
                  Research & Create Topics
                </ActionButton>
                <ActionButton
                  onClick={async () => {
                    setActionLoading("run-builder");
                    setCronResponsePanel(null);
                    try {
                      const r = await fetch("/api/cron/content-builder", { method: "POST" });
                      if (!r.ok) throw new Error(`HTTP ${r.status}`);
                      const j = await r.json();
                      setActionResult((prev) => ({ ...prev, __builder: j.success !== false ? "✅ Builder triggered" : `❌ ${j.error ?? "Failed"}` }));
                      setCronResponsePanel({ label: "Run Pipeline", data: j });
                      setTimeout(() => fetchData(), 3000);
                    } catch (e) {
                      setActionResult((prev) => ({ ...prev, __builder: `❌ ${e instanceof Error ? e.message : "Error"}` }));
                    } finally { setActionLoading(null); }
                  }}
                  loading={actionLoading === "run-builder"}
                >
                  Run Pipeline
                </ActionButton>
                <ActionButton
                  onClick={async () => {
                    setActionLoading("run-selector");
                    setCronResponsePanel(null);
                    try {
                      const r = await fetch("/api/cron/content-selector", { method: "POST" });
                      if (!r.ok) throw new Error(`HTTP ${r.status}`);
                      const j = await r.json();
                      setActionResult((prev) => ({ ...prev, __selector: j.success !== false ? "✅ Selector ran" : `❌ ${j.error ?? "Failed"}` }));
                      setCronResponsePanel({ label: "Publish Ready", data: j });
                      setTimeout(() => fetchData(), 2000);
                    } catch (e) {
                      setActionResult((prev) => ({ ...prev, __selector: `❌ ${e instanceof Error ? e.message : "Error"}` }));
                    } finally { setActionLoading(null); }
                  }}
                  loading={actionLoading === "run-selector"}
                >
                  Publish Ready
                </ActionButton>
                <ActionButton onClick={fetchData} loading={loading}>
                  Refresh
                </ActionButton>
                {actionResult.__builder && <span className={`text-xs ${actionResult.__builder.startsWith("✅") ? "text-[#2D5A3D]" : "text-[#C8322B]"}`}>{actionResult.__builder}</span>}
                {actionResult.__selector && <span className={`text-xs ${actionResult.__selector.startsWith("✅") ? "text-[#2D5A3D]" : "text-[#C8322B]"}`}>{actionResult.__selector}</span>}
              </Card>

              {/* Named filter views */}
              {data && (
                <NamedViews
                  articles={data.articles}
                  activeView={namedView}
                  onViewChange={setNamedView}
                  siteId={activeSiteId}
                />
              )}

              {/* Filters + Search */}
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  placeholder="Search articles…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 min-w-[150px] bg-stone-100 border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-stone-300"
                />
                {["all", "published", "draft", "reservoir", "rejected", "stuck"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                      filter === f ? "bg-stone-800 text-white" : "bg-stone-100 text-stone-400 hover:bg-stone-200"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              {/* Type + Locale filters */}
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-[10px] text-stone-400 font-medium uppercase tracking-wider">Type:</span>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
                  className="bg-stone-100 border border-stone-200 rounded-lg px-2 py-1 text-xs text-stone-700 focus:outline-none"
                >
                  <option value="all">All Types</option>
                  <option value="blog">Blog</option>
                  <option value="news">News</option>
                  <option value="information">Info</option>
                  <option value="guide">Guide</option>
                </select>
                <span className="text-[10px] text-stone-400 font-medium uppercase tracking-wider ml-2">Locale:</span>
                {(["all", "en", "ar"] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLocaleFilter(l)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                      localeFilter === l ? "bg-stone-800 text-white" : "bg-stone-100 text-stone-400 hover:bg-stone-200"
                    }`}
                  >
                    {l === "all" ? "All" : l.toUpperCase()}
                  </button>
                ))}
                <span className="text-[10px] text-stone-400 font-medium uppercase tracking-wider ml-2">Date:</span>
                {(["all", "today", "7d", "30d"] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDateRange(d)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                      dateRange === d ? "bg-stone-800 text-white" : "bg-stone-100 text-stone-400 hover:bg-stone-200"
                    }`}
                  >
                    {d === "all" ? "All" : d === "today" ? "Today" : d === "7d" ? "7 Days" : "30 Days"}
                  </button>
                ))}
                {selectedIds.size > 0 && (
                  <span className="ml-auto text-xs text-[#3B7EA1] font-medium">{selectedIds.size} selected</span>
                )}
              </div>

              {/* Quick Edit Modal */}
              {editingItem && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setEditingItem(null)}>
                  <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg p-5 space-y-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: '#1C1917' }}>Quick Edit</h3>
                        <p className="text-stone-400 text-xs mt-0.5 truncate max-w-[280px]">{editingItem.slug}</p>
                      </div>
                      <button onClick={() => setEditingItem(null)} className="text-stone-400 hover:text-stone-600 text-lg">✕</button>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-stone-500 block mb-1">Title</label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#3B7EA1]"
                      />
                      <p className="text-right text-[10px] text-stone-400 mt-0.5">{editTitle.length} chars</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-stone-500 block mb-1">Meta Description</label>
                      <textarea
                        value={editMetaDesc}
                        onChange={(e) => setEditMetaDesc(e.target.value)}
                        rows={3}
                        className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#3B7EA1]"
                      />
                      <p className={`text-right text-[10px] mt-0.5 ${editMetaDesc.length > 160 ? "text-[#C8322B]" : editMetaDesc.length < 120 ? "text-[#C49A2A]" : "text-[#2D5A3D]"}`}>
                        {editMetaDesc.length}/160 chars
                      </p>
                    </div>
                    {editResult && (
                      <p className={`text-xs font-medium ${editResult.startsWith("Saved") ? "text-[#2D5A3D]" : "text-[#C8322B]"}`}>{editResult}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={saveQuickEdit}
                        disabled={editSaving}
                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.97] disabled:opacity-50"
                        style={{ backgroundColor: '#3B7EA1' }}
                      >
                        {editSaving ? "Saving…" : "Save Changes"}
                      </button>
                      {editingItem.type === "published" && (
                        <a
                          href={`/admin/articles/edit/${editingItem.id}`}
                          className="py-2.5 px-4 rounded-xl text-sm font-semibold text-[#3B7EA1] border border-[#3B7EA1] transition-all active:scale-[0.97] text-center"
                        >
                          Full Editor
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Content table */}
              {filtered.length === 0 ? (
                <Card className="text-center py-8">
                  <p className="text-stone-500 text-sm">No articles match the current filter.</p>
                </Card>
              ) : (
                <Card className="p-0 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-stone-200 text-stone-500 text-left">
                          <th className="px-2 py-2.5 w-8">
                            <input type="checkbox" checked={selectedIds.size === filtered.length && filtered.length > 0} onChange={toggleSelectAll} className="rounded border-stone-300" />
                          </th>
                          <th className="px-3 py-2.5 font-medium min-w-[200px] cursor-pointer select-none hover:text-stone-700" onClick={() => toggleSort("title")}>Page{sortArrow("title")}</th>
                          <th className="px-3 py-2.5 font-medium whitespace-nowrap cursor-pointer select-none hover:text-stone-700" onClick={() => toggleSort("status")}>Status{sortArrow("status")}</th>
                          <th className="px-3 py-2.5 font-medium whitespace-nowrap cursor-pointer select-none hover:text-stone-700" onClick={() => toggleSort("date")}>Created{sortArrow("date")}</th>
                          <th className="px-3 py-2.5 font-medium whitespace-nowrap">Google</th>
                          <th className="px-3 py-2.5 font-medium text-right whitespace-nowrap cursor-pointer select-none hover:text-stone-700" onClick={() => toggleSort("seo")}>SEO{sortArrow("seo")}</th>
                          <th className="px-3 py-2.5 font-medium text-right whitespace-nowrap cursor-pointer select-none hover:text-stone-700" onClick={() => toggleSort("words")}>Words{sortArrow("words")}</th>
                          <th className="px-3 py-2.5 font-medium text-right whitespace-nowrap cursor-pointer select-none hover:text-stone-700" onClick={() => toggleSort("clicks")}>Clicks{sortArrow("clicks")}</th>
                          <th className="px-3 py-2.5 font-medium whitespace-nowrap">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.slice(0, displayLimit).map((item) => {
                          const badge = statusBadge(item.status);
                          const isExpanded = expandedId === item.id;
                          const checks = gateResults[item.id];

                          return (
                            <tr key={item.id} className={`border-b border-stone-200/50 hover:bg-stone-100/30 transition-colors group ${selectedIds.has(item.id) ? "bg-[#3B7EA1]/5" : ""}`}>
                              {/* Checkbox */}
                              <td className="px-2 py-2.5 w-8">
                                <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} className="rounded border-stone-300" />
                              </td>
                              {/* Page name */}
                              <td className="px-3 py-2.5">
                                <div className="flex items-center gap-1">
                                  <LocaleDots wordCountEn={item.wordCount} wordCountAr={item.wordCountAr} />
                                  <button
                                    onClick={() => setDetailArticle(item)}
                                    className="text-stone-800 font-medium truncate max-w-[260px] text-left hover:text-[#3B7EA1] transition-colors cursor-pointer block"
                                    title={`${item.title} — tap for details`}
                                  >
                                    {item.title || item.slug || item.id}
                                  </button>
                                </div>
                                {item.url && (
                                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-[#3B7EA1] hover:underline truncate block max-w-[280px] text-[10px]">
                                    {item.url}
                                  </a>
                                )}
                                {item.plainError && (
                                  <p className="text-[#C8322B] mt-0.5 truncate max-w-[280px] text-[10px]" title={item.plainError}>{item.plainError}</p>
                                )}
                                {actionResult[item.id] && (
                                  <p className={`mt-0.5 text-[10px] ${actionResult[item.id].startsWith("✅") ? "text-[#2D5A3D]" : "text-[#C8322B]"}`}>
                                    {actionResult[item.id]}
                                  </p>
                                )}
                                {/* Expanded gate check panel */}
                                {isExpanded && (
                                  <div className="mt-2 border-t border-stone-200 pt-2">
                                    <p className="font-semibold text-stone-400 mb-1.5">Why Isn{"'"}t This Published?</p>
                                    {gateLoading === item.id && <p className="text-stone-500">Running gate checks…</p>}
                                    {checks && (
                                      <div className="space-y-1">
                                        {checks.map((c) => (
                                          <div key={c.check} className={`flex items-start gap-1.5 rounded p-1 ${c.pass ? "bg-stone-100/30" : c.isBlocker ? "bg-[rgba(200,50,43,0.04)]" : "bg-[rgba(196,154,42,0.04)]"}`}>
                                            <span className="shrink-0">{c.pass ? "✅" : c.isBlocker ? "❌" : "⚠️"}</span>
                                            <div>
                                              <span className={c.pass ? "text-stone-400" : c.isBlocker ? "text-[#C8322B]" : "text-[#7a5a10]"}>{c.label}</span>
                                              {!c.pass && c.detail && <p className="text-stone-500 mt-0.5">{c.detail}</p>}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    {!checks && !gateLoading && (
                                      <button onClick={() => runGateCheck(item)} className="text-[#3B7EA1] hover:underline">Run gate check</button>
                                    )}
                                  </div>
                                )}
                              </td>

                              {/* Status badge — tappable dropdown */}
                              <td className="px-3 py-2.5 whitespace-nowrap">
                                <StatusDropdown
                                  item={item}
                                  siteId={activeSiteId}
                                  onAction={fetchData}
                                  onViewDetails={(it) => setDetailArticle(it)}
                                />
                                {item.hasUnreviewedEnhancements && item.type === "published" && (
                                  <span className="inline-block mt-0.5 px-1.5 py-px rounded text-[9px] font-medium bg-[rgba(196,154,42,0.12)] text-[#7a5a10] border border-[rgba(196,154,42,0.2)]"
                                    title={item.enhancementSummary?.map(e => `${e.type} by ${e.cron ?? "system"}`).join(", ") ?? "Auto-enhanced"}
                                  >
                                    Enhanced
                                  </span>
                                )}
                                {item.phase && item.type === "draft" && (
                                  <span className={`inline-block mt-0.5 px-1.5 py-px rounded text-[9px] font-medium ${
                                    item.phase === "research" || item.phase === "outline" ? "bg-purple-100 text-purple-700" :
                                    item.phase === "drafting" ? "bg-blue-100 text-blue-700" :
                                    item.phase === "assembly" ? "bg-amber-100 text-amber-700" :
                                    item.phase === "images" || item.phase === "seo" ? "bg-teal-100 text-teal-700" :
                                    item.phase === "scoring" ? "bg-indigo-100 text-indigo-700" :
                                    item.phase === "reservoir" ? "bg-green-100 text-green-700" :
                                    "bg-stone-100 text-stone-500"
                                  }`}>{item.phase}</span>
                                )}
                              </td>

                              {/* Created */}
                              <td className="px-3 py-2.5 text-stone-400 whitespace-nowrap">
                                {shortDate(item.generatedAt)}
                                {item.publishedAt && (
                                  <p className="text-[#2D5A3D] text-[10px]">Pub {shortDate(item.publishedAt)}</p>
                                )}
                              </td>

                              {/* Google Status */}
                              <td className="px-3 py-2.5 whitespace-nowrap">
                                <span className={`font-medium ${indexColor(item.indexingStatus)}`}>
                                  {indexLabel(item)}
                                </span>
                              </td>

                              {/* SEO Score */}
                              <td className="px-3 py-2.5 text-right whitespace-nowrap">
                                {item.seoScore !== null ? (
                                  <span className={scoreColor(item.seoScore)}>{item.seoScore}</span>
                                ) : (
                                  <span className="text-stone-500">—</span>
                                )}
                              </td>

                              {/* Word Count */}
                              <td className="px-3 py-2.5 text-right whitespace-nowrap">
                                <span className={item.wordCount < 1000 ? "text-[#C8322B]" : item.wordCount < 1200 ? "text-[#C49A2A]" : "text-stone-400"}>
                                  {item.wordCount > 0 ? item.wordCount.toLocaleString() : "—"}
                                </span>
                              </td>

                              {/* Clicks */}
                              <td className="px-3 py-2.5 text-right whitespace-nowrap">
                                {item.gscClicks !== null ? (
                                  <span className={item.gscClicks > 0 ? "text-[#2D5A3D] font-medium" : "text-stone-600"}>{item.gscClicks.toLocaleString()}</span>
                                ) : (
                                  <span className="text-stone-500">—</span>
                                )}
                              </td>

                              {/* Actions */}
                              <td className="px-3 py-2.5">
                                <div className="flex flex-wrap gap-1">
                                  {item.type === "draft" && item.status !== "published" && (
                                    <>
                                      <button
                                        onClick={() => {
                                          if (isExpanded && checks) {
                                            setExpandedId(null);
                                          } else {
                                            setExpandedId(item.id);
                                            if (!checks) runGateCheck(item);
                                          }
                                        }}
                                        className="px-1.5 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-stone-600 border border-stone-200 whitespace-nowrap"
                                      >
                                        {isExpanded ? "Hide" : "Why?"}
                                      </button>
                                      {item.status === "reservoir" && (
                                        <ActionButton
                                          onClick={async () => {
                                            setActionLoading(`publish-${item.id}`);
                                            try {
                                              const r = await fetch("/api/admin/force-publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ draftId: item.id, locale: item.locale, count: 1, siteId: activeSiteId }) });
                                              if (!r.ok) { setActionResult((prev) => ({ ...prev, [item.id]: `❌ HTTP ${r.status}` })); return; }
                                              const j = await r.json();
                                              setActionResult((prev) => ({ ...prev, [item.id]: j.success ? "✅ Published!" : `❌ ${j.error ?? "Failed"}` }));
                                              fetchData();
                                            } catch (e) {
                                              setActionResult((prev) => ({ ...prev, [item.id]: `❌ ${e instanceof Error ? e.message : "Error"}` }));
                                            } finally { setActionLoading(null); }
                                          }}
                                          loading={actionLoading === `publish-${item.id}`}
                                          variant="success"
                                        >
                                          Publish
                                        </ActionButton>
                                      )}
                                      {(item.status === "rejected" || item.hoursInPhase > 3) && (
                                        <ActionButton
                                          onClick={() => doAction("re_queue", item.id, "Re-queued")}
                                          loading={actionLoading === `re_queue-${item.id}`}
                                          variant="amber"
                                        >
                                          Retry
                                        </ActionButton>
                                      )}
                                      {item.status === "reservoir" && (
                                        <button
                                          onClick={() => openQuickEdit(item)}
                                          className="px-1.5 py-0.5 rounded bg-[#3B7EA1]/10 hover:bg-[#3B7EA1]/20 text-[#3B7EA1] border border-[#3B7EA1]/30 whitespace-nowrap"
                                        >
                                          Edit
                                        </button>
                                      )}
                                    </>
                                  )}
                                  {item.type === "published" && (
                                    <>
                                      {item.url && (
                                        <a href={item.url} target="_blank" rel="noopener noreferrer"
                                          className="px-1.5 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-stone-600 border border-stone-200 whitespace-nowrap">
                                          View
                                        </a>
                                      )}
                                      <button
                                        onClick={() => openQuickEdit(item)}
                                        className="px-1.5 py-0.5 rounded bg-[#3B7EA1]/10 hover:bg-[#3B7EA1]/20 text-[#3B7EA1] border border-[#3B7EA1]/30 whitespace-nowrap"
                                      >
                                        Edit
                                      </button>
                                      <ActionButton
                                        onClick={async () => {
                                          if (!item.slug) { setActionResult((prev) => ({ ...prev, [item.id]: "❌ No slug" })); return; }
                                          setActionLoading(`index-${item.id}`);
                                          try {
                                            const r = await fetch(`/api/admin/content-indexing`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "submit", slugs: [item.slug] }) });
                                            if (!r.ok) { setActionResult((prev) => ({ ...prev, [item.id]: `❌ HTTP ${r.status}` })); return; }
                                            const j = await r.json();
                                            setActionResult((prev) => ({ ...prev, [item.id]: j.success !== false ? "✅ Submitted" : `❌ ${j.error ?? "Failed"}` }));
                                            fetchData();
                                          } catch (e) {
                                            setActionResult((prev) => ({ ...prev, [item.id]: `❌ ${e instanceof Error ? e.message : "Error"}` }));
                                          } finally { setActionLoading(null); }
                                        }}
                                        loading={actionLoading === `index-${item.id}`}
                                      >
                                        Index
                                      </ActionButton>
                                      <ActionButton
                                        onClick={async () => {
                                          setActionLoading(`fix-${item.id}`);
                                          try {
                                            const r = await fetch("/api/admin/content-matrix", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "review_fix", blogPostId: item.id }) });
                                            const j = await r.json().catch(() => ({ success: false, error: "Bad response" }));
                                            if (j.success) {
                                              const msg = j.issues?.length > 0
                                                ? `${j.message || "Fixed"}\nIssues: ${j.issues.join(", ")}`
                                                : "No issues found";
                                              setActionResult((prev) => ({ ...prev, [item.id]: `✅ ${msg}` }));
                                              fetchData();
                                            } else {
                                              setActionResult((prev) => ({ ...prev, [item.id]: `❌ ${j.error ?? "Failed"}` }));
                                            }
                                          } catch (e) {
                                            setActionResult((prev) => ({ ...prev, [item.id]: `❌ ${e instanceof Error ? e.message : "Error"}` }));
                                          } finally { setActionLoading(null); }
                                        }}
                                        loading={actionLoading === `fix-${item.id}`}
                                        variant="amber"
                                      >
                                        Review & Fix
                                      </ActionButton>

                                      {/* Photo Order */}
                                      <div className="relative">
                                        <button
                                          onClick={() => setPhotoOrderOpen((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                                          className="px-2 py-1 text-xs rounded border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors flex items-center gap-1"
                                          title={item.photoOrderStatus === "pending" ? "Photo requested — awaiting fulfillment" : item.photoOrderStatus === "fulfilled" ? "Photo fulfilled" : "Order a specific photo from Unsplash"}
                                        >
                                          {item.photoOrderStatus === "pending" ? "📸 Pending" : item.photoOrderStatus === "fulfilled" ? "✅ Photo" : "📷 Photo"}
                                        </button>
                                        {photoOrderOpen[item.id] && (
                                          <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-72">
                                            <p className="text-xs font-medium text-gray-700 mb-1">Order a specific photo</p>
                                            <p className="text-xs text-gray-500 mb-2">Describe the image (e.g. "luxury hotel london rooftop"). Auto-fix cron will fetch it.</p>
                                            <input
                                              type="text"
                                              className="w-full text-xs border border-gray-300 rounded px-2 py-1 mb-2 focus:outline-none focus:border-blue-400"
                                              placeholder="e.g. luxury hotel lobby london"
                                              value={photoOrderInput[item.id] ?? item.photoOrderQuery ?? ""}
                                              onChange={(e) => setPhotoOrderInput((prev) => ({ ...prev, [item.id]: e.target.value }))}
                                              onKeyDown={(e) => e.stopPropagation()}
                                            />
                                            {photoOrderResult[item.id] && (
                                              <p className="text-xs mb-2 text-gray-600">{photoOrderResult[item.id]}</p>
                                            )}
                                            <div className="flex gap-1">
                                              <button
                                                disabled={photoOrderLoading === `order-${item.id}` || !(photoOrderInput[item.id] ?? item.photoOrderQuery)}
                                                onClick={async () => {
                                                  const query = photoOrderInput[item.id]?.trim() || item.photoOrderQuery?.trim();
                                                  if (!query) return;
                                                  setPhotoOrderLoading(`order-${item.id}`);
                                                  try {
                                                    const r = await fetch("/api/admin/content-matrix", {
                                                      method: "POST",
                                                      headers: { "Content-Type": "application/json" },
                                                      body: JSON.stringify({ action: "order_photo", blogPostId: item.id, query }),
                                                    });
                                                    const j = r.ok ? await r.json() : {};
                                                    setPhotoOrderResult((prev) => ({ ...prev, [item.id]: j.success ? "✅ Queued — cron will fetch soon" : `❌ ${j.error ?? "Failed"}` }));
                                                    fetchData();
                                                  } catch { setPhotoOrderResult((prev) => ({ ...prev, [item.id]: "❌ Error" })); }
                                                  finally { setPhotoOrderLoading(null); }
                                                }}
                                                className="flex-1 text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                              >
                                                {photoOrderLoading === `order-${item.id}` ? "…" : "Queue Order"}
                                              </button>
                                              <button
                                                disabled={photoOrderLoading === `seed-${item.id}` || !(photoOrderInput[item.id] ?? item.photoOrderQuery)}
                                                onClick={async () => {
                                                  const query = photoOrderInput[item.id]?.trim() || item.photoOrderQuery?.trim();
                                                  if (!query) return;
                                                  // First save the query, then seed immediately
                                                  setPhotoOrderLoading(`seed-${item.id}`);
                                                  try {
                                                    await fetch("/api/admin/content-matrix", {
                                                      method: "POST",
                                                      headers: { "Content-Type": "application/json" },
                                                      body: JSON.stringify({ action: "order_photo", blogPostId: item.id, query }),
                                                    });
                                                    const r = await fetch("/api/admin/photo-orders", {
                                                      method: "PATCH",
                                                      headers: { "Content-Type": "application/json" },
                                                      body: JSON.stringify({ blogPostId: item.id }),
                                                    });
                                                    const j = r.ok ? await r.json() : {};
                                                    setPhotoOrderResult((prev) => ({ ...prev, [item.id]: j.success ? `✅ Seeded by ${j.photographer ?? "Unsplash"}` : `❌ ${j.error ?? "Failed"}` }));
                                                    fetchData();
                                                  } catch { setPhotoOrderResult((prev) => ({ ...prev, [item.id]: "❌ Error" })); }
                                                  finally { setPhotoOrderLoading(null); }
                                                }}
                                                className="flex-1 text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
                                              >
                                                {photoOrderLoading === `seed-${item.id}` ? "…" : "Seed Now"}
                                              </button>
                                              <button
                                                onClick={() => setPhotoOrderOpen((prev) => ({ ...prev, [item.id]: false }))}
                                                className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                                              >✕</button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {/* Pagination: show count + Load More */}
                  <div className="flex items-center justify-between px-3 py-2 border-t border-stone-200/50">
                    <span className="text-[10px] text-stone-400">
                      Showing {Math.min(displayLimit, filtered.length)} of {filtered.length} articles
                    </span>
                    {filtered.length > displayLimit && (
                      <button
                        onClick={() => setDisplayLimit(prev => prev + 50)}
                        className="px-3 py-1 rounded-lg text-xs font-medium bg-[#3B7EA1] text-white hover:bg-[#2D6B8E] transition-colors"
                      >
                        Load More ({filtered.length - displayLimit} remaining)
                      </button>
                    )}
                  </div>
                </Card>
              )}

              {/* Sticky bulk action bar */}
              {selectedIds.size > 0 && (
                <div className="sticky bottom-0 z-20 bg-white border-t border-stone-200 shadow-lg rounded-b-xl px-4 py-2.5 flex flex-wrap gap-2 items-center">
                  <span className="text-xs font-medium text-stone-600">{selectedIds.size} selected</span>
                  <ActionButton onClick={() => doBulkAction("publish_selected", "Publish")} loading={bulkActionLoading === "publish_selected"} variant="success">Publish Selected</ActionButton>
                  <ActionButton onClick={() => doBulkAction("unpublish", "Unpublish")} loading={bulkActionLoading === "unpublish"} variant="amber">Unpublish Selected</ActionButton>
                  <ActionButton onClick={() => doBulkAction("re_queue", "Re-queue")} loading={bulkActionLoading === "re_queue"}>Re-queue Selected</ActionButton>
                  <ActionButton onClick={async () => { const ok = await confirm({ title: 'Delete Items', message: `Delete ${selectedIds.size} items?`, variant: 'danger' }); if (ok) doBulkAction("delete_draft", "Delete"); }} loading={bulkActionLoading === "delete_draft"} variant="danger">Delete Selected</ActionButton>
                  <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-xs text-stone-400 hover:text-stone-600">Clear</button>
                </div>
              )}

              {/* Bulk action result */}
              {actionResult.__bulk && (
                <p className={`text-xs px-1 ${actionResult.__bulk.startsWith("✅") ? "text-[#2D5A3D]" : "text-[#C8322B]"}`}>{actionResult.__bulk}</p>
              )}

              {/* Phase 1B: Cron response panel */}
              {cronResponsePanel && (
                <Card className="border-l-4 border-l-[#3B7EA1]">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-xs font-semibold text-stone-700">{cronResponsePanel.label} — Response</p>
                    <button onClick={() => setCronResponsePanel(null)} className="text-stone-400 hover:text-stone-600 text-xs">✕ Close</button>
                  </div>
                  <div className="space-y-1 max-h-[300px] overflow-y-auto">
                    {Object.entries(cronResponsePanel.data).map(([key, val]) => (
                      <details key={key} className="group">
                        <summary className="flex items-center gap-2 cursor-pointer text-xs text-stone-600 hover:text-stone-800 py-0.5">
                          <span className="text-[10px] text-stone-400 group-open:rotate-90 transition-transform">▶</span>
                          <span className="font-medium">{key}</span>
                          <span className="text-stone-400 truncate max-w-[200px]">{typeof val === "object" ? `{${Object.keys(val as object).length} keys}` : String(val)}</span>
                        </summary>
                        <pre className="ml-5 mt-0.5 p-2 bg-stone-100 rounded text-[10px] text-stone-600 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(val, null, 2)}</pre>
                      </details>
                    ))}
                  </div>
                </Card>
              )}
            </>
          )}
        </>
      )}
      {/* Article Detail Drawer */}
      {detailArticle && (
        <ArticleDetailDrawer
          article={detailArticle}
          onClose={() => setDetailArticle(null)}
          onAction={doAction}
          onRefresh={fetchData}
          siteId={activeSiteId}
        />
      )}
      <ConfirmDialog />
    </div>
  );
}

