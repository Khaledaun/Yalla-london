"use client";

/**
 * /admin/cockpit/bulk-generate — Bulk Article Generator
 *
 * Pipeline: Language → Topics → Count → Generate → Audit → Fix → Queue → Publish → Submit
 *
 * - Pick language (EN/AR)
 * - Choose topic source (auto from DB or manual keywords)
 * - Set number of articles (1-10)
 * - One-tap pipeline execution with per-article progress
 * - Auto-publishes and submits to IndexNow
 */

import { useState, useCallback } from "react";
import Link from "next/link";

interface ArticleResult {
  index: number;
  keyword: string;
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
  articles: ArticleResult[];
  elapsed?: string;
}

export default function BulkGeneratePage() {
  // Config state
  const [language, setLanguage] = useState<"en" | "ar">("en");
  const [topicSource, setTopicSource] = useState<"auto" | "manual">("auto");
  const [count, setCount] = useState(3);
  const [manualKeywords, setManualKeywords] = useState("");
  const [pageType, setPageType] = useState("guide");
  const [autoPublish, setAutoPublish] = useState(true);

  // Run state
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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
          language,
          count: topicSource === "manual" ? keywords.length : count,
          topicSource,
          keywords,
          pageType,
          autoPublish,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setResult(json);
      } else {
        setError(json.error || "Pipeline failed");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setRunning(false);
    }
  }, [language, topicSource, count, manualKeywords, pageType, autoPublish]);

  // ─── Publish All Ready ─────────────────────────────────────────────────

  const [publishing, setPublishing] = useState(false);

  const publishAll = useCallback(async () => {
    if (!result?.runId) return;
    setPublishing(true);
    try {
      const res = await fetch("/api/admin/bulk-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish_all", runId: result.runId }),
      });
      const json = await res.json();
      if (json.success) {
        // Refresh status
        const statusRes = await fetch("/api/admin/bulk-generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "status", runId: result.runId }),
        });
        const statusJson = await statusRes.json();
        if (statusJson.success) {
          setResult(prev => prev ? { ...prev, articles: statusJson.articles, published: (prev.published || 0) + json.published } : prev);
        }
      } else {
        setError(json.error);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setPublishing(false);
    }
  }, [result?.runId]);

  // ─── Status helpers ────────────────────────────────────────────────────

  const statusColor = (s: string) => {
    switch (s) {
      case "published": return "bg-emerald-900/40 text-emerald-300 border-emerald-700";
      case "ready": return "bg-blue-900/40 text-blue-300 border-blue-700";
      case "generating": case "auditing": case "fixing": case "publishing":
        return "bg-amber-900/40 text-amber-300 border-amber-700";
      case "failed": return "bg-red-900/40 text-red-300 border-red-700";
      default: return "bg-zinc-800 text-zinc-400 border-zinc-700";
    }
  };

  const readyCount = result?.articles.filter(a => a.status === "ready").length || 0;

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
                  {manualKeywords.split("\n").filter(k => k.trim()).length} keywords entered (max 10)
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
                    max={10}
                    value={count}
                    onChange={(e) => setCount(parseInt(e.target.value))}
                    className="flex-1 accent-emerald-500"
                  />
                  <span className="text-lg font-bold text-white w-8 text-center">{count}</span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  Each article takes ~15-30s to generate. {count} articles ≈ {Math.ceil(count * 22.5)}s
                </p>
              </div>
            )}

            {/* Page Type */}
            <div>
              <label className="text-xs font-medium text-zinc-400 block mb-1.5">Page Type</label>
              <select
                value={pageType}
                onChange={(e) => setPageType(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200 outline-none focus:border-zinc-500"
              >
                <option value="guide">Guide</option>
                <option value="listicle">Listicle</option>
                <option value="review">Review</option>
                <option value="comparison">Comparison</option>
                <option value="deep-dive">Deep Dive</option>
                <option value="seasonal">Seasonal</option>
                <option value="answer">Answer</option>
              </select>
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
          disabled={running}
          className="w-full py-3.5 rounded-xl text-base font-bold bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-600 hover:to-emerald-500 text-white border border-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-900/20"
        >
          {running ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generating {topicSource === "manual" ? manualKeywords.split("\n").filter(k => k.trim()).length : count} articles…
            </span>
          ) : (
            `Generate ${topicSource === "manual" ? manualKeywords.split("\n").filter(k => k.trim()).length || "?" : count} Articles`
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
                <p className="text-sm font-medium text-white">Run Results</p>
                {result.elapsed && (
                  <span className="text-xs text-zinc-500">{result.elapsed}</span>
                )}
              </div>
              <div className="flex gap-4 mt-2">
                <StatBadge label="Total" value={result.total} color="text-zinc-300" />
                <StatBadge label="Generated" value={result.generated} color="text-blue-300" />
                <StatBadge label="Published" value={result.published} color="text-emerald-300" />
                <StatBadge label="Failed" value={result.failed} color="text-red-300" />
              </div>
            </div>

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
            <p>2. AI generates full bilingual article (EN + AR)</p>
            <p>3. Auto-audit: word count, meta length, SEO score</p>
            <p>4. Auto-fix: trim long metas, flag thin content</p>
            <p>5. Publish to BlogPost table + submit to IndexNow</p>
            <p className="mt-2 text-zinc-400">Vercel Pro limit: ~2-3 articles per run (60s timeout). For more, run multiple batches.</p>
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
