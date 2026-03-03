"use client";

/**
 * /admin/cockpit/write — Simple Writer
 *
 * Clean, Medium-style article editor designed for iPhone.
 * - Big title field
 * - Rich text body (contentEditable with formatting toolbar)
 * - SEO fields (meta title, description) with live character counts
 * - Category picker
 * - Save Draft / Publish buttons
 * - Article list for quick editing
 *
 * Feeds directly into the content pipeline:
 * → BlogPost table → SEO gate → Affiliate injection → IndexNow
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ArticleListItem {
  id: string;
  type: "blogpost" | "draft";
  title: string;
  slug: string;
  published: boolean;
  seoScore: number | null;
  category?: string | null;
  phase?: string | null;
  updatedAt: string;
}

interface ArticleData {
  id: string;
  type: string;
  titleEn: string;
  titleAr: string | null;
  slug: string;
  contentEn: string | null;
  contentAr: string | null;
  metaTitleEn: string | null;
  metaDescriptionEn: string | null;
  metaTitleAr: string | null;
  metaDescriptionAr: string | null;
  seoScore: number | null;
  published: boolean;
  category: string | null;
  categoryId: string | null;
  tags: string[];
}

interface CategoryOption {
  id: string;
  name_en: string;
  slug: string;
}

// ─── Formatting Toolbar ─────────────────────────────────────────────────────

function FormatBar() {
  const exec = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
  };

  return (
    <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-zinc-800 bg-zinc-900/50 sticky top-0 z-10">
      <FmtBtn onClick={() => exec("bold")} title="Bold">B</FmtBtn>
      <FmtBtn onClick={() => exec("italic")} title="Italic"><em>I</em></FmtBtn>
      <FmtBtn onClick={() => exec("underline")} title="Underline"><u>U</u></FmtBtn>
      <span className="w-px bg-zinc-700 mx-1" />
      <FmtBtn onClick={() => exec("formatBlock", "<h2>")} title="Heading 2">H2</FmtBtn>
      <FmtBtn onClick={() => exec("formatBlock", "<h3>")} title="Heading 3">H3</FmtBtn>
      <FmtBtn onClick={() => exec("formatBlock", "<p>")} title="Paragraph">P</FmtBtn>
      <span className="w-px bg-zinc-700 mx-1" />
      <FmtBtn onClick={() => exec("insertUnorderedList")} title="Bullet list">•</FmtBtn>
      <FmtBtn onClick={() => exec("insertOrderedList")} title="Numbered list">1.</FmtBtn>
      <FmtBtn onClick={() => exec("formatBlock", "<blockquote>")} title="Quote">&ldquo;</FmtBtn>
      <span className="w-px bg-zinc-700 mx-1" />
      <FmtBtn onClick={() => {
        const url = prompt("Enter link URL:");
        if (url) exec("createLink", url);
      }} title="Add link">🔗</FmtBtn>
      <FmtBtn onClick={() => exec("removeFormat")} title="Clear formatting">✕</FmtBtn>
    </div>
  );
}

function FmtBtn({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className="px-2 py-1 rounded text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 min-w-[28px] text-center"
    >
      {children}
    </button>
  );
}

// ─── Character Count Badge ──────────────────────────────────────────────────

function CharCount({ value, min, max, label }: { value: string; min: number; max: number; label: string }) {
  const len = value.length;
  const color = len === 0 ? "text-zinc-500" : len < min ? "text-red-400" : len > max ? "text-red-400" : "text-emerald-400";
  return (
    <span className={`text-xs ${color}`}>
      {label}: {len}/{min}-{max}
    </span>
  );
}

// ─── Word Count ─────────────────────────────────────────────────────────────

function wordCount(html: string): number {
  return html.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function SimpleWriterPage() {
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");

  const [view, setView] = useState<"list" | "editor">(editId ? "editor" : "list");
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [drafts, setDrafts] = useState<ArticleListItem[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<string | null>(null);

  // Editor state
  const [articleId, setArticleId] = useState<string | null>(editId || null);
  const [titleEn, setTitleEn] = useState("");
  const [metaTitleEn, setMetaTitleEn] = useState("");
  const [metaDescriptionEn, setMetaDescriptionEn] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [tags, setTags] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  // AI Generate state
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiKeyword, setAiKeyword] = useState("");
  const [showAiPanel, setShowAiPanel] = useState(false);

  // ─── AI Generate ──────────────────────────────────────────────────────

  const aiGenerate = useCallback(async (mode: "pick" | "generate") => {
    setAiGenerating(true);
    setSaveResult(null);
    try {
      if (mode === "pick") {
        const res = await fetch("/api/admin/ai-generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "pick_topic" }),
        });
        if (!res.ok) { setSaveResult(`Error: Server returned ${res.status}`); return; }
        const json = await res.json();
        if (json.success && json.topic?.keyword) {
          setAiKeyword(json.topic.keyword);
          setSaveResult(`Topic picked: "${json.topic.keyword}"`);
        } else {
          setSaveResult("No topics available. Type a keyword manually.");
        }
        return;
      }

      // Generate full article
      const keyword = aiKeyword.trim();
      if (!keyword) {
        setSaveResult("Error: Enter a keyword or pick a topic first");
        return;
      }

      const res = await fetch("/api/admin/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          keyword,
          language: "en",
        }),
      });
      if (!res.ok) { setSaveResult(`Error: Server returned ${res.status}. Try again.`); return; }
      const json = await res.json();
      if (json.success && json.content) {
        const c = json.content;
        setTitleEn(c.titleEn || keyword);
        setMetaTitleEn(c.metaTitleEn || "");
        setMetaDescriptionEn(c.metaDescriptionEn || "");
        setTags((c.tags || []).join(", "));
        if (editorRef.current) {
          editorRef.current.innerHTML = c.bodyEn || "";
        }
        setShowAiPanel(false);
        setSaveResult(`AI generated ${json.wordCount || 0} words. Review and publish when ready.`);
      } else {
        setSaveResult(`Error: ${json.error || "Generation failed"}`);
      }
    } catch (e) {
      setSaveResult(`Error: ${e instanceof Error ? e.message : "Network error"}`);
    } finally {
      setAiGenerating(false);
    }
  }, [aiKeyword]);

  // ─── Data Loading ───────────────────────────────────────────────────────

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/simple-write");
      const json = await res.json();
      if (json.success) {
        setArticles(json.articles || []);
        setDrafts(json.drafts || []);
        setCategories(json.categories || []);
      }
    } catch (e) {
      console.warn("[writer] Fetch failed:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadArticle = useCallback(async (id: string) => {
    setLoading(true);
    setSaveResult(null);
    try {
      const res = await fetch(`/api/admin/simple-write?id=${id}`);
      const json = await res.json();
      if (json.success && json.article) {
        const a: ArticleData = json.article;
        setArticleId(a.id);
        setTitleEn(a.titleEn || "");
        setMetaTitleEn(a.metaTitleEn || "");
        setMetaDescriptionEn(a.metaDescriptionEn || "");
        setCategoryId(a.categoryId || "");
        setTags((a.tags || []).join(", "));
        setIsPublished(a.published);
        if (editorRef.current) {
          editorRef.current.innerHTML = a.contentEn || "";
        }
        setView("editor");
      }
    } catch (e) {
      console.warn("[writer] Load article failed:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
    if (editId) loadArticle(editId);
  }, [fetchList, editId, loadArticle]);

  // ─── New Article ────────────────────────────────────────────────────────

  const newArticle = () => {
    setArticleId(null);
    setTitleEn("");
    setMetaTitleEn("");
    setMetaDescriptionEn("");
    setCategoryId("");
    setTags("");
    setIsPublished(false);
    setSaveResult(null);
    if (editorRef.current) editorRef.current.innerHTML = "";
    setView("editor");
  };

  // ─── Save / Publish ─────────────────────────────────────────────────────

  const save = async (publish: boolean) => {
    setSaving(true);
    setSaveResult(null);
    try {
      const contentEn = editorRef.current?.innerHTML || "";
      const res = await fetch("/api/admin/simple-write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: publish ? "publish" : "save",
          id: articleId || undefined,
          titleEn,
          contentEn,
          metaTitleEn: metaTitleEn || titleEn.substring(0, 60),
          metaDescriptionEn,
          categoryId: categoryId || undefined,
          tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setArticleId(json.id);
        setIsPublished(json.published);
        setSaveResult(json.message);
        fetchList(); // refresh sidebar
      } else {
        setSaveResult(`Error: ${json.error || "Save failed"}`);
      }
    } catch (e) {
      setSaveResult(`Error: ${e instanceof Error ? e.message : "Network error"}`);
    } finally {
      setSaving(false);
    }
  };

  // ─── Editor View ────────────────────────────────────────────────────────

  if (view === "editor") {
    const wc = wordCount(editorRef.current?.innerHTML || "");
    const wcColor = wc < 300 ? "text-red-400" : wc < 1000 ? "text-amber-400" : "text-emerald-400";

    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-zinc-950/95 backdrop-blur border-b border-zinc-800">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
            <button
              onClick={() => { setView("list"); fetchList(); }}
              className="text-sm text-zinc-400 hover:text-zinc-200"
            >
              ← Back
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAiPanel(!showAiPanel)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-900/50 hover:bg-violet-800/50 text-violet-300 border border-violet-700"
              >
                AI
              </button>
              <button
                onClick={() => save(false)}
                disabled={saving || !titleEn.trim()}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save Draft"}
              </button>
              <button
                onClick={() => save(true)}
                disabled={saving || !titleEn.trim()}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-700 hover:bg-emerald-600 text-white border border-emerald-600 disabled:opacity-50"
              >
                {saving ? "Publishing…" : isPublished ? "Update" : "Publish"}
              </button>
            </div>
          </div>
        </div>

        {/* AI Generate Panel */}
        {showAiPanel && (
          <div className="max-w-2xl mx-auto px-4 mt-2">
            <div className="rounded-lg border border-violet-800/50 bg-violet-950/30 px-4 py-3 space-y-2">
              <p className="text-xs font-medium text-violet-300">AI Article Generator</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiKeyword}
                  onChange={(e) => setAiKeyword(e.target.value)}
                  placeholder="Keyword (e.g. halal restaurants London)"
                  className="flex-1 text-sm px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200 placeholder:text-zinc-600 outline-none"
                />
                <button
                  onClick={() => aiGenerate("pick")}
                  disabled={aiGenerating}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 disabled:opacity-50 shrink-0"
                >
                  Pick Topic
                </button>
              </div>
              <button
                onClick={() => aiGenerate("generate")}
                disabled={aiGenerating || !aiKeyword.trim()}
                className="w-full py-2 rounded-lg text-sm font-medium bg-violet-700 hover:bg-violet-600 text-white border border-violet-600 disabled:opacity-50"
              >
                {aiGenerating ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating article…
                  </span>
                ) : (
                  "Generate Full Article"
                )}
              </button>
              <p className="text-xs text-zinc-500">Writes ~1,500 words with SEO, internal links, and affiliate links. Review before publishing.</p>
            </div>
          </div>
        )}

        {/* Save result toast */}
        {saveResult && (
          <div className={`max-w-2xl mx-auto px-4 mt-2`}>
            <div className={`text-xs rounded-lg px-3 py-2 ${
              saveResult.startsWith("Error") ? "bg-red-950/40 text-red-300 border border-red-800" : "bg-emerald-950/40 text-emerald-300 border border-emerald-800"
            }`}>
              {saveResult}
            </div>
          </div>
        )}

        {/* Editor */}
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          {/* Title */}
          <input
            type="text"
            value={titleEn}
            onChange={(e) => setTitleEn(e.target.value)}
            placeholder="Article title…"
            className="w-full text-2xl font-bold bg-transparent border-none outline-none text-white placeholder:text-zinc-600"
            autoFocus
          />

          {/* Status badges */}
          <div className="flex flex-wrap gap-2 text-xs">
            {isPublished && <span className="px-2 py-0.5 rounded-full bg-emerald-900/50 text-emerald-300 border border-emerald-700">Published</span>}
            {articleId && <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">ID: {articleId.substring(0, 8)}</span>}
            <span className={`px-2 py-0.5 rounded-full border ${wcColor} ${wc < 300 ? "bg-red-900/30 border-red-800" : wc < 1000 ? "bg-amber-900/30 border-amber-800" : "bg-emerald-900/30 border-emerald-800"}`}>
              {wc} words
            </span>
          </div>

          {/* Rich text editor */}
          <div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900/30">
            <FormatBar />
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              className="min-h-[300px] px-4 py-3 text-sm text-zinc-200 leading-relaxed outline-none prose prose-invert prose-sm max-w-none [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-white [&_h2]:mt-6 [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-zinc-200 [&_h3]:mt-4 [&_h3]:mb-1 [&_a]:text-blue-400 [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-zinc-600 [&_blockquote]:pl-3 [&_blockquote]:text-zinc-400 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
              onInput={() => {
                // Force re-render to update word count
                setTitleEn((prev) => prev);
              }}
              data-placeholder="Start writing your article…"
            />
          </div>

          {/* SEO fields */}
          <details className="border border-zinc-800 rounded-lg overflow-hidden">
            <summary className="px-4 py-3 bg-zinc-900/50 text-sm font-medium text-zinc-300 cursor-pointer hover:bg-zinc-800/50">
              SEO Settings
            </summary>
            <div className="px-4 py-3 space-y-3 bg-zinc-950/50">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-medium text-zinc-400">Meta Title</label>
                  <CharCount value={metaTitleEn} min={30} max={60} label="chars" />
                </div>
                <input
                  type="text"
                  value={metaTitleEn}
                  onChange={(e) => setMetaTitleEn(e.target.value)}
                  placeholder={titleEn || "SEO title…"}
                  className="w-full text-sm px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-zinc-500"
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-medium text-zinc-400">Meta Description</label>
                  <CharCount value={metaDescriptionEn} min={120} max={160} label="chars" />
                </div>
                <textarea
                  value={metaDescriptionEn}
                  onChange={(e) => setMetaDescriptionEn(e.target.value)}
                  placeholder="Brief description for search results…"
                  rows={3}
                  className="w-full text-sm px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-zinc-500 resize-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400 block mb-1">Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200 outline-none focus:border-zinc-500"
                >
                  <option value="">Auto (General)</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name_en}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400 block mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="london, halal, luxury"
                  className="w-full text-sm px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-zinc-500"
                />
              </div>
            </div>
          </details>
        </div>
      </div>
    );
  }

  // ─── List View ──────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-zinc-950/95 backdrop-blur border-b border-zinc-800">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/cockpit" className="text-sm text-zinc-400 hover:text-zinc-200">← Cockpit</Link>
            <h1 className="text-base font-bold text-white">Write</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/cockpit/bulk-generate"
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-900/50 hover:bg-violet-800/50 text-violet-300 border border-violet-700"
            >
              Bulk AI
            </Link>
            <button
              onClick={newArticle}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-700 hover:bg-emerald-600 text-white"
            >
              + New
            </button>
          </div>
        </div>
      </div>

      {/* Article List */}
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-2">
        {loading ? (
          <div className="text-center py-8 text-zinc-500 text-sm">Loading articles…</div>
        ) : (
          <>
            {/* Published articles */}
            {articles.length > 0 && (
              <div>
                <p className="text-xs font-medium text-zinc-500 mb-2 uppercase tracking-wider">Articles ({articles.length})</p>
                {articles.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => loadArticle(a.id)}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-zinc-900/50 border border-transparent hover:border-zinc-800 transition-colors mb-1 group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-zinc-200 group-hover:text-white truncate">{a.title || "Untitled"}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${
                        a.published ? "bg-emerald-900/40 text-emerald-300" : "bg-zinc-800 text-zinc-500"
                      }`}>
                        {a.published ? "Published" : "Draft"}
                      </span>
                    </div>
                    <div className="flex gap-3 mt-0.5 text-xs text-zinc-500">
                      {a.category && <span>{a.category}</span>}
                      {a.seoScore != null && <span>SEO: {a.seoScore}</span>}
                      <span>{timeAgo(a.updatedAt)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Pipeline drafts */}
            {drafts.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-zinc-500 mb-2 uppercase tracking-wider">Pipeline Drafts ({drafts.length})</p>
                {drafts.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => loadArticle(d.id)}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-zinc-900/50 border border-transparent hover:border-zinc-800 transition-colors mb-1 group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-zinc-300 group-hover:text-white truncate">{d.title || "Untitled"}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-900/40 text-blue-300 shrink-0">
                        {d.phase || "draft"}
                      </span>
                    </div>
                    <div className="flex gap-3 mt-0.5 text-xs text-zinc-500">
                      {d.seoScore != null && <span>Quality: {d.seoScore}</span>}
                      <span>{timeAgo(d.updatedAt)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {articles.length === 0 && drafts.length === 0 && (
              <div className="text-center py-12">
                <p className="text-zinc-500 text-sm mb-4">No articles yet. Start writing!</p>
                <button
                  onClick={newArticle}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-700 hover:bg-emerald-600 text-white"
                >
                  + New Article
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
