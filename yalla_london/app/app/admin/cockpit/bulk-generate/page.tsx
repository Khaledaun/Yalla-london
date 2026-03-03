"use client";

/**
 * /admin/cockpit/bulk-generate — Bulk Article Generator
 *
 * Multi-phase pipeline with timeout protection:
 * Phase 1: Generate as many articles as 60s allows
 * Phase 2+: "Continue" button generates remaining articles
 * Final: Publish All + Submit to IndexNow
 *
 * Features:
 * - Site selector (multi-website)
 * - 12 content types with SEO-specific prompts
 * - Language selection (EN/AR)
 * - Auto or manual topic selection
 * - Per-article progress tracking
 * - Auto-publish toggle
 */

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";

interface ContentTypeInfo {
  id: string;
  label: string;
  labelAr: string;
  description: string;
  minWords: number;
  targetWords: number;
  requireAffiliateLinks: boolean;
}

interface ArticleResult {
  index: number;
  keyword: string;
  pageType?: string;
  status: string;
  wordCount?: number;
  seoScore?: number;
  slug?: string;
  blogPostId?: string;
  error?: string;
}

interface RunResult {
  runId: string;
  total: number;
  generated: number;
  published: number;
  failed: number;
  pending?: number;
  needsContinuation?: boolean;
  phasesCompleted?: number;
  articles: ArticleResult[];
  elapsed?: string;
  message?: string;
}

export default function BulkGeneratePage() {
  // Config state
  const [siteId, setSiteId] = useState("");
  const [sites, setSites] = useState<Array<{ id: string; name: string }>>([]);
  const [language, setLanguage] = useState<"en" | "ar">("en");
  const [topicSource, setTopicSource] = useState<"auto" | "manual">("auto");
  const [count, setCount] = useState(3);
  const [manualKeywords, setManualKeywords] = useState("");
  const [pageType, setPageType] = useState("guide");
  const [autoPublish, setAutoPublish] = useState(true);
  const [contentTypes, setContentTypes] = useState<ContentTypeInfo[]>([]);

  // Run state
  const [running, setRunning] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load sites and content types on mount
  useEffect(() => {
    // Helper: safely parse JSON response (Safari throws "The string did not match
    // the expected pattern" when calling .json() on non-JSON responses like 504 HTML)
    const safeJson = async (res: Response) => {
      if (!res.ok) return null;
      const text = await res.text();
      try { return JSON.parse(text); } catch { return null; }
    };

    // Fetch available sites
    fetch("/api/admin/cockpit")
      .then(r => safeJson(r))
      .then(data => {
        if (data?.sites) {
          const siteList = (data.sites as Array<{ siteId?: string; id?: string; name: string }>).map(s => ({
            id: s.siteId || s.id || "",
            name: s.name,
          }));
          setSites(siteList);
          if (siteList.length > 0 && !siteId) {
            setSiteId(siteList[0].id);
          }
        }
      })
      .catch((e: unknown) => console.warn("[bulk-generate] Sites fetch failed:", e));

    // Fetch content types
    fetch("/api/admin/ai-generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "content_types" }),
    })
      .then(r => safeJson(r))
      .then(data => {
        if (data?.success && data.types) {
          setContentTypes(data.types);
        }
      })
      .catch((e: unknown) => console.warn("[bulk-generate] Content types fetch failed:", e));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Execute Pipeline ──────────────────────────────────────────────────

  const startPipeline = useCallback(async () => {
    setRunning(true);
    setResult(null);
    setError(null);

    try {
      const keywords = topicSource === "manual"
        ? manualKeywords.split("\n").map(k => k.trim()).filter(Boolean)
        : [];

      if (topicSource === "manual" && keywords.length === 0) {
        setError("Enter at least one keyword (one per line)");
        setRunning(false);
        return;
      }

      const res = await fetch("/api/admin/bulk-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          siteId,
          language,
          count: topicSource === "manual" ? keywords.length : count,
          topicSource,
          keywords,
          pageType,
          autoPublish,
        }),
      });

      // Handle non-JSON responses (504 timeout, 502 gateway, etc.)
      if (!res.ok && res.status >= 500) {
        setError(`Server error (HTTP ${res.status}). The generation may have timed out. Try generating fewer articles or tap "Continue" if a run already started.`);
        setRunning(false);
        return;
      }

      const text = await res.text();
      let json: Record<string, unknown>;
      try {
        json = JSON.parse(text);
      } catch {
        setError(`Server returned invalid response (HTTP ${res.status}). Try again in a moment.`);
        setRunning(false);
        return;
      }

      if (json.success) {
        setResult(json as unknown as RunResult);
      } else {
        setError((json.error as string) || "Pipeline failed");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setRunning(false);
    }
  }, [siteId, language, topicSource, count, manualKeywords, pageType, autoPublish]);

  // ─── Continue Generation ─────────────────────────────────────────────

  const continuePipeline = useCallback(async () => {
    if (!result?.runId) return;
    setContinuing(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/bulk-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "continue",
          runId: result.runId,
          siteId,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setResult(json);
      } else {
        setError(json.error || "Continue failed");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setContinuing(false);
    }
  }, [result?.runId, siteId]);

  // ─── Publish All Ready ─────────────────────────────────────────────────

  const [publishing, setPublishing] = useState(false);

  const publishAll = useCallback(async () => {
    if (!result?.runId) return;
    setPublishing(true);
    try {
      const res = await fetch("/api/admin/bulk-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish_all", runId: result.runId, siteId }),
      });
      const json = await res.json();
      if (json.success) {
        // Refresh status
        const statusRes = await fetch("/api/admin/bulk-generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "status", runId: result.runId, siteId }),
        });
        const statusJson = await statusRes.json();
        if (statusJson.success) {
          setResult(prev => prev ? {
            ...prev,
            articles: statusJson.articles,
            published: (prev.published || 0) + json.published,
            pending: statusJson.pending,
            needsContinuation: statusJson.needsContinuation,
          } : prev);
        }
      } else {
        setError(json.error);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setPublishing(false);
    }
  }, [result?.runId, siteId]);

  // ─── Status helpers ────────────────────────────────────────────────────

  const statusColor = (s: string) => {
    switch (s) {
      case "published": return "bg-emerald-900/40 text-emerald-300 border-emerald-700";
      case "ready": return "bg-blue-900/40 text-blue-300 border-blue-700";
      case "generating": case "auditing": case "fixing": case "publishing":
        return "bg-amber-900/40 text-amber-300 border-amber-700";
      case "failed": return "bg-red-900/40 text-red-300 border-red-700";
      case "pending": return "bg-zinc-800/60 text-zinc-500 border-zinc-700";
      default: return "bg-zinc-800 text-zinc-400 border-zinc-700";
    }
  };

  const readyCount = result?.articles.filter(a => a.status === "ready").length || 0;
  const selectedType = contentTypes.find(t => t.id === pageType);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-zinc-950/95 backdrop-blur border-b border-zinc-800">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/cockpit" className="text-sm text-zinc-400 hover:text-zinc-200">
              ← Cockpit
            </Link>
            <h1 className="text-base font-bold text-white">Bulk Generator</h1>
          </div>
          <Link
            href="/admin/cockpit/write"
            className="text-xs text-zinc-400 hover:text-zinc-200"
          >
            Single Write →
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* ─── Configuration Panel ────────────────────────────────────────── */}
        <div className="border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-zinc-900/50 border-b border-zinc-800">
            <p className="text-sm font-medium text-white">Pipeline Configuration</p>
            <p className="text-xs text-zinc-500 mt-0.5">Generate → Audit → Fix → Queue → Publish → Submit to Google</p>
          </div>

          <div className="px-4 py-4 space-y-4">
            {/* Site Selector */}
            {sites.length > 1 && (
              <div>
                <label className="text-xs font-medium text-zinc-400 block mb-1.5">Website</label>
                <select
                  value={siteId}
                  onChange={(e) => setSiteId(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200 outline-none focus:border-zinc-500"
                >
                  {sites.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Language */}
            <div>
              <label className="text-xs font-medium text-zinc-400 block mb-1.5">Language</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setLanguage("en")}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    language === "en"
                      ? "bg-emerald-900/30 text-emerald-300 border-emerald-700"
                      : "bg-zinc-900 text-zinc-400 border-zinc-700 hover:bg-zinc-800"
                  }`}
                >
                  English
                </button>
                <button
                  onClick={() => setLanguage("ar")}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    language === "ar"
                      ? "bg-emerald-900/30 text-emerald-300 border-emerald-700"
                      : "bg-zinc-900 text-zinc-400 border-zinc-700 hover:bg-zinc-800"
                  }`}
                >
                  العربية
                </button>
              </div>
            </div>

            {/* Topic Source */}
            <div>
              <label className="text-xs font-medium text-zinc-400 block mb-1.5">Topic Source</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setTopicSource("auto")}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    topicSource === "auto"
                      ? "bg-blue-900/30 text-blue-300 border-blue-700"
                      : "bg-zinc-900 text-zinc-400 border-zinc-700 hover:bg-zinc-800"
                  }`}
                >
                  Auto (from research)
                </button>
                <button
                  onClick={() => setTopicSource("manual")}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    topicSource === "manual"
                      ? "bg-blue-900/30 text-blue-300 border-blue-700"
                      : "bg-zinc-900 text-zinc-400 border-zinc-700 hover:bg-zinc-800"
                  }`}
                >
                  Manual Keywords
                </button>
              </div>
            </div>

            {/* Manual Keywords (conditional) */}
            {topicSource === "manual" && (
              <div>
                <label className="text-xs font-medium text-zinc-400 block mb-1.5">
                  Keywords (one per line)
                </label>
                <textarea
                  value={manualKeywords}
                  onChange={(e) => setManualKeywords(e.target.value)}
                  placeholder={"best halal restaurants in London\nluxury hotels near Hyde Park\nLondon shopping guide for Arab travelers"}
                  rows={4}
                  className="w-full text-sm px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-zinc-500 resize-none"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  {manualKeywords.split("\n").filter(k => k.trim()).length} keywords entered (max 20)
                </p>
              </div>
            )}

            {/* Count (auto mode only) */}
            {topicSource === "auto" && (
              <div>
                <label className="text-xs font-medium text-zinc-400 block mb-1.5">
                  Number of Articles
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={1}
                    max={20}
                    value={count}
                    onChange={(e) => setCount(parseInt(e.target.value))}
                    className="flex-1 accent-emerald-500"
                  />
                  <span className="text-lg font-bold text-white w-8 text-center">{count}</span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  ~2-3 per phase (60s limit). {count > 3 ? `Will need ${Math.ceil(count / 2)} phases.` : "Should complete in 1 phase."}
                </p>
              </div>
            )}

            {/* Content Type — Grid */}
            <div>
              <label className="text-xs font-medium text-zinc-400 block mb-1.5">Content Type</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(contentTypes.length > 0 ? contentTypes : DEFAULT_TYPES).map(t => (
                  <button
                    key={t.id}
                    onClick={() => setPageType(t.id)}
                    className={`px-2 py-2 rounded-lg text-xs font-medium border transition-colors text-center ${
                      pageType === t.id
                        ? "bg-violet-900/30 text-violet-300 border-violet-700"
                        : "bg-zinc-900 text-zinc-400 border-zinc-700 hover:bg-zinc-800"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              {selectedType && (
                <p className="text-xs text-zinc-500 mt-2">
                  {selectedType.description}
                  <span className="text-zinc-600 ml-1">
                    ({selectedType.minWords}–{selectedType.targetWords}w
                    {selectedType.requireAffiliateLinks ? ", affiliate links required" : ""})
                  </span>
                </p>
              )}
            </div>

            {/* Auto-Publish Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-200">Auto-Publish</p>
                <p className="text-xs text-zinc-500">Publish immediately after generation + audit</p>
              </div>
              <button
                onClick={() => setAutoPublish(!autoPublish)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  autoPublish ? "bg-emerald-600" : "bg-zinc-700"
                }`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  autoPublish ? "left-[22px]" : "left-0.5"
                }`} />
              </button>
            </div>
          </div>
        </div>

        {/* ─── Launch Button ──────────────────────────────────────────────── */}
        <button
          onClick={startPipeline}
          disabled={running || continuing}
          className="w-full py-3.5 rounded-xl text-base font-bold bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-600 hover:to-emerald-500 text-white border border-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-900/20"
        >
          {running ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generating…
            </span>
          ) : (
            `Generate ${topicSource === "manual" ? manualKeywords.split("\n").filter(k => k.trim()).length || "?" : count} ${
              (contentTypes.find(t => t.id === pageType)?.label || pageType).toLowerCase()
            } articles`
          )}
        </button>

        {/* ─── Error Banner ───────────────────────────────────────────────── */}
        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-950/40 border border-red-800 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* ─── Results ────────────────────────────────────────────────────── */}
        {result && (
          <div className="border border-zinc-800 rounded-xl overflow-hidden">
            {/* Summary */}
            <div className="px-4 py-3 bg-zinc-900/50 border-b border-zinc-800">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-white">
                  Run Results
                  {result.phasesCompleted ? ` (Phase ${result.phasesCompleted})` : ""}
                </p>
                {result.elapsed && (
                  <span className="text-xs text-zinc-500">{result.elapsed}</span>
                )}
              </div>
              <div className="flex gap-4 mt-2">
                <StatBadge label="Total" value={result.total} color="text-zinc-300" />
                <StatBadge label="Generated" value={result.generated} color="text-blue-300" />
                <StatBadge label="Published" value={result.published} color="text-emerald-300" />
                <StatBadge label="Failed" value={result.failed} color="text-red-300" />
                {(result.pending ?? 0) > 0 && (
                  <StatBadge label="Pending" value={result.pending || 0} color="text-amber-300" />
                )}
              </div>
              {result.message && (
                <p className="text-xs text-zinc-400 mt-2">{result.message}</p>
              )}
            </div>

            {/* Continue button (multi-phase) */}
            {result.needsContinuation && (
              <div className="px-4 py-3 border-b border-zinc-800 bg-amber-950/20">
                <button
                  onClick={continuePipeline}
                  disabled={continuing}
                  className="w-full py-2.5 rounded-lg text-sm font-bold bg-amber-700 hover:bg-amber-600 text-white border border-amber-600 disabled:opacity-50"
                >
                  {continuing ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Generating remaining…
                    </span>
                  ) : (
                    `Continue — Generate ${result.pending} Remaining Articles`
                  )}
                </button>
                <p className="text-xs text-amber-400/60 text-center mt-1.5">
                  Vercel 60s limit reached. Tap to continue in next phase.
                </p>
              </div>
            )}

            {/* Publish All button (if any ready) */}
            {readyCount > 0 && (
              <div className="px-4 py-3 border-b border-zinc-800 bg-blue-950/20">
                <button
                  onClick={publishAll}
                  disabled={publishing}
                  className="w-full py-2 rounded-lg text-sm font-medium bg-blue-700 hover:bg-blue-600 text-white border border-blue-600 disabled:opacity-50"
                >
                  {publishing ? "Publishing…" : `Publish ${readyCount} Ready Article${readyCount > 1 ? "s" : ""}`}
                </button>
              </div>
            )}

            {/* Per-article rows */}
            <div className="divide-y divide-zinc-800/50">
              {result.articles.map((a) => (
                <div key={a.index} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-200 truncate">{a.keyword}</p>
                      <div className="flex flex-wrap gap-2 mt-1 text-xs text-zinc-500">
                        {a.pageType && <span className="text-violet-400">{a.pageType}</span>}
                        {a.wordCount != null && <span>{a.wordCount}w</span>}
                        {a.seoScore != null && <span>SEO: {a.seoScore}</span>}
                        {a.slug && (
                          <Link
                            href={`/blog/${a.slug}`}
                            className="text-blue-400 hover:text-blue-300"
                            target="_blank"
                          >
                            /blog/{a.slug}
                          </Link>
                        )}
                      </div>
                      {a.error && (
                        <p className="text-xs text-red-400 mt-1">{a.error}</p>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${statusColor(a.status)}`}>
                      {a.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Tips ───────────────────────────────────────────────────────── */}
        {!result && !running && (
          <div className="px-4 py-3 rounded-xl bg-zinc-900/30 border border-zinc-800 text-xs text-zinc-500 space-y-1">
            <p><strong className="text-zinc-400">How it works:</strong></p>
            <p>1. Topics picked from your research DB (or manual keywords)</p>
            <p>2. AI generates full bilingual article (EN + AR) using content-type-specific SEO guidelines</p>
            <p>3. Auto-audit: word count, meta length, SEO score (type-specific thresholds)</p>
            <p>4. Auto-fix: trim long metas, flag thin content</p>
            <p>5. Publish to BlogPost table + submit to IndexNow</p>
            <p className="mt-2 text-zinc-400">
              Multi-phase: generates ~2-3 articles per phase (60s limit).
              For larger batches, tap &quot;Continue&quot; to generate remaining articles in the next phase.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function StatBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
  );
}

// Fallback content types if API hasn't loaded yet
const DEFAULT_TYPES: ContentTypeInfo[] = [
  { id: "guide", label: "Travel Guide", labelAr: "دليل", description: "Comprehensive travel guides", minWords: 1500, targetWords: 2000, requireAffiliateLinks: true },
  { id: "comparison", label: "Comparison", labelAr: "مقارنة", description: "Side-by-side comparisons", minWords: 1200, targetWords: 1800, requireAffiliateLinks: true },
  { id: "hotel-review", label: "Hotel Review", labelAr: "مراجعة فندق", description: "In-depth hotel reviews", minWords: 1200, targetWords: 1800, requireAffiliateLinks: true },
  { id: "restaurant-review", label: "Restaurant", labelAr: "مراجعة مطعم", description: "Restaurant reviews", minWords: 800, targetWords: 1500, requireAffiliateLinks: false },
  { id: "service-review", label: "Experience", labelAr: "مراجعة خدمة", description: "Tour/experience reviews", minWords: 800, targetWords: 1500, requireAffiliateLinks: true },
  { id: "news", label: "News", labelAr: "خبر", description: "Timely news updates", minWords: 300, targetWords: 600, requireAffiliateLinks: false },
  { id: "events", label: "Event Guide", labelAr: "فعالية", description: "Event coverage and guides", minWords: 600, targetWords: 1200, requireAffiliateLinks: true },
  { id: "sales", label: "Deal / Offer", labelAr: "عرض", description: "Travel deals and offers", minWords: 500, targetWords: 1000, requireAffiliateLinks: true },
  { id: "listicle", label: "Listicle", labelAr: "قائمة", description: "Numbered lists (Top 10...)", minWords: 1200, targetWords: 1800, requireAffiliateLinks: true },
  { id: "deep-dive", label: "Deep Dive", labelAr: "تحليل", description: "In-depth analysis", minWords: 2000, targetWords: 3000, requireAffiliateLinks: true },
  { id: "seasonal", label: "Seasonal", labelAr: "موسمي", description: "Seasonal travel content", minWords: 1000, targetWords: 1500, requireAffiliateLinks: true },
  { id: "answer", label: "Q&A", labelAr: "سؤال وجواب", description: "Direct answers for PAA", minWords: 600, targetWords: 1200, requireAffiliateLinks: false },
];
