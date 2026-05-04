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
 * - Expand/Fix button for thin articles
 * - Bulk AI generation (multiple articles on demand)
 * - Auto-save to reservoir when not publishing
 * - Article list for quick editing
 *
 * Feeds into the content pipeline:
 * → ArticleDraft (reservoir) → Quality gate → BlogPost → SEO → Affiliate injection → IndexNow
 * → OR direct BlogPost (publish) → SEO gate → Affiliate injection → IndexNow
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

interface BulkItem {
  keyword: string;
  status: "pending" | "generating" | "done" | "error";
  result?: string;
  wordCount?: number;
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
      <FmtBtn onClick={() => exec("insertUnorderedList")} title="Bullet list">&#8226;</FmtBtn>
      <FmtBtn onClick={() => exec("insertOrderedList")} title="Numbered list">1.</FmtBtn>
      <FmtBtn onClick={() => exec("formatBlock", "<blockquote>")} title="Quote">&ldquo;</FmtBtn>
      <span className="w-px bg-zinc-700 mx-1" />
      <FmtBtn onClick={() => {
        const url = prompt("Enter link URL:");
        if (url) exec("createLink", url);
      }} title="Add link">&#128279;</FmtBtn>
      <FmtBtn onClick={() => exec("removeFormat")} title="Clear formatting">&#10005;</FmtBtn>
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

function countWords(html: string): number {
  return html.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function SimpleWriterPage() {
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");

  const [view, setView] = useState<"list" | "editor" | "bulk">(editId ? "editor" : "list");
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
  const [aiPhase, setAiPhase] = useState(0); // 0=idle, 1=outline, 2=writing-part1, 3=writing-part2, 4=polishing
  const [aiKeyword, setAiKeyword] = useState("");
  const [showAiPanel, setShowAiPanel] = useState(false);

  // Expand state
  const [expanding, setExpanding] = useState(false);

  // Bulk generation state
  const [bulkKeywords, setBulkKeywords] = useState("");
  const [bulkItems, setBulkItems] = useState<BulkItem[]>([]);
  const [bulkRunning, setBulkRunning] = useState(false);

  // ─── Expand / Fix ─────────────────────────────────────────────────────

  const expandArticle = useCallback(async () => {
    const body = editorRef.current?.innerHTML || "";
    const wc = countWords(body);
    if (wc < 50) {
      setSaveResult("Error: Article too short to expand. Write at least 50 words first, or use AI Generate.");
      return;
    }

    setExpanding(true);
    setSaveResult("Expanding article — adding sections, stats, and affiliate links...");

    try {
      const res = await fetch("/api/admin/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "expand",
          body,
          keyword: titleEn || aiKeyword || "",
          targetWords: Math.max(1500, wc + 500),
          language: "en",
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setSaveResult(`Expand failed: ${err.error || `Server ${res.status}`}`);
        return;
      }

      const json = await res.json();
      if (json.success && json.body) {
        if (editorRef.current) {
          editorRef.current.innerHTML = json.body;
        }
        const improvements = json.improvements?.length ? `: ${json.improvements.join(", ")}` : "";
        setSaveResult(`Expanded from ${json.previousWordCount} to ${json.wordCount} words${improvements}`);
      } else {
        setSaveResult(`Expand failed: ${json.error || "No expanded content returned"}`);
      }
    } catch (e) {
      setSaveResult(`Error: ${e instanceof Error ? e.message : "Network error"}`);
    } finally {
      setExpanding(false);
    }
  }, [titleEn, aiKeyword]);

  // ─── AI Generate ──────────────────────────────────────────────────────

  const aiGenerate = useCallback(async (mode: "pick" | "generate") => {
    setAiGenerating(true);
    setSaveResult(null);
    setAiPhase(0);
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

      // ─── 4-Phase Article Generation ──────────────────────────────────
      const keyword = aiKeyword.trim();
      if (!keyword) {
        setSaveResult("Error: Enter a keyword or pick a topic first");
        return;
      }

      // Phase 1: Research & Outline
      setAiPhase(1);
      setSaveResult("Step 1/4: Planning outline and keywords...");

      const res1 = await fetch("/api/admin/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "phase1_outline",
          keyword,
          language: "en",
        }),
      });
      if (!res1.ok) {
        const err1 = await res1.json().catch(() => ({}));
        setSaveResult(`Error in Step 1: ${err1.error || `Server returned ${res1.status}`}`);
        return;
      }
      const json1 = await res1.json();
      if (!json1.success || !json1.outline) {
        setSaveResult(`Error in Step 1: ${json1.error || "No outline returned"}`);
        return;
      }

      // Show title immediately after Phase 1
      const outline = json1.outline;
      setTitleEn(outline.title || keyword);
      setMetaTitleEn(outline.metaTitle || "");
      setMetaDescriptionEn(outline.metaDescription || "");

      // Phase 2a: Write First Half
      setAiPhase(2);
      const headingCount = (outline.headings || []).length;
      setSaveResult(`Step 2/4: Writing first half (${Math.ceil(headingCount / 2)} of ${headingCount} sections)...`);

      const res2a = await fetch("/api/admin/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "phase2a_write",
          keyword,
          outline,
          language: "en",
        }),
      });
      if (!res2a.ok) {
        const err2a = await res2a.json().catch(() => ({}));
        setSaveResult(`Error in Step 2: ${err2a.error || `Server returned ${res2a.status}`}`);
        return;
      }
      const json2a = await res2a.json();
      if (!json2a.success || !json2a.body) {
        setSaveResult(`Error in Step 2: ${json2a.error || "No body returned"}`);
        return;
      }

      // Show first half immediately
      if (editorRef.current) {
        editorRef.current.innerHTML = json2a.body;
      }

      // Phase 2b: Write Second Half
      setAiPhase(3);
      setSaveResult(`Step 3/4: Writing second half (${json2a.wordCount || 0} words so far)...`);

      const res2b = await fetch("/api/admin/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "phase2b_write",
          keyword,
          outline,
          previousBody: json2a.body,
          language: "en",
        }),
      });
      if (!res2b.ok) {
        const err2b = await res2b.json().catch(() => ({}));
        setSaveResult(`First half written (${json2a.wordCount || 0} words) but second half failed: ${err2b.error || res2b.status}. You can still edit and publish.`);
        setTags((outline.keywords || []).join(", "));
        setShowAiPanel(false);
        return;
      }
      const json2b = await res2b.json();
      if (!json2b.success || !json2b.body) {
        setSaveResult(`First half written (${json2a.wordCount || 0} words) but second half failed: ${json2b.error || "No body returned"}. You can still edit and publish.`);
        setTags((outline.keywords || []).join(", "));
        setShowAiPanel(false);
        return;
      }

      // Show full article
      const fullBody = json2b.body;
      if (editorRef.current) {
        editorRef.current.innerHTML = fullBody;
      }

      // Phase 3: Polish SEO
      setAiPhase(4);
      setSaveResult(`Step 4/4: Polishing SEO (${json2b.wordCount || 0} words written)...`);

      const res3 = await fetch("/api/admin/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "phase3_polish",
          keyword,
          outline,
          body: fullBody,
          language: "en",
        }),
      });
      if (!res3.ok) {
        const err3 = await res3.json().catch(() => ({}));
        setSaveResult(`Article written (${json2b.wordCount || 0} words) but SEO polish failed: ${err3.error || res3.status}. You can still publish.`);
        setTags((outline.keywords || []).join(", "));
        setShowAiPanel(false);
        return;
      }
      const json3 = await res3.json();

      // Apply Phase 3 refinements
      if (json3.success && json3.content) {
        const c = json3.content;
        if (c.metaTitleEn) setMetaTitleEn(c.metaTitleEn);
        if (c.metaDescriptionEn) setMetaDescriptionEn(c.metaDescriptionEn);
        setTags((c.tags || outline.keywords || []).join(", "));
      }

      setShowAiPanel(false);
      const finalWc = json3.wordCount || json2b.wordCount || 0;
      const improvements = json3.improvements?.length ? ` Improvements: ${json3.improvements.join(", ")}` : "";
      setSaveResult(`AI generated ${finalWc} words in 4 steps. Review and publish when ready.${improvements}`);
    } catch (e) {
      setSaveResult(`Error: ${e instanceof Error ? e.message : "Network error"}`);
    } finally {
      setAiGenerating(false);
      setAiPhase(0);
    }
  }, [aiKeyword]);

  // ─── Bulk AI Generation ──────────────────────────────────────────────

  const startBulkGeneration = useCallback(async () => {
    const keywords = bulkKeywords.split("\n").map(k => k.trim()).filter(Boolean);
    if (keywords.length === 0) {
      setSaveResult("Error: Enter at least one keyword (one per line)");
      return;
    }
    if (keywords.length > 10) {
      setSaveResult("Error: Maximum 10 articles at a time to avoid timeouts");
      return;
    }

    const items: BulkItem[] = keywords.map(k => ({ keyword: k, status: "pending" as const }));
    setBulkItems(items);
    setBulkRunning(true);
    setSaveResult(null);

    // Process sequentially (one at a time to avoid provider overload)
    for (let i = 0; i < items.length; i++) {
      // Update status to generating
      setBulkItems(prev => prev.map((item, idx) => idx === i ? { ...item, status: "generating" } : item));

      try {
        // Phase 1: Outline
        const res1 = await fetch("/api/admin/ai-generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "phase1_outline", keyword: items[i].keyword, language: "en" }),
        });
        if (!res1.ok) throw new Error(`Outline failed (${res1.status})`);
        const json1 = await res1.json();
        if (!json1.success) throw new Error(json1.error || "Outline failed");

        // Phase 2a: Write first half
        const res2a = await fetch("/api/admin/ai-generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "phase2a_write", keyword: items[i].keyword, outline: json1.outline, language: "en" }),
        });
        if (!res2a.ok) throw new Error(`Write part 1 failed (${res2a.status})`);
        const json2a = await res2a.json();
        if (!json2a.success) throw new Error(json2a.error || "Write part 1 failed");

        // Phase 2b: Write second half
        const res2b = await fetch("/api/admin/ai-generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "phase2b_write", keyword: items[i].keyword, outline: json1.outline, previousBody: json2a.body, language: "en" }),
        });
        if (!res2b.ok) throw new Error(`Write part 2 failed (${res2b.status})`);
        const json2b = await res2b.json();
        if (!json2b.success) throw new Error(json2b.error || "Write part 2 failed");

        // Phase 3: Polish
        const res3 = await fetch("/api/admin/ai-generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "phase3_polish", keyword: items[i].keyword, outline: json1.outline, body: json2b.body, language: "en" }),
        });
        const json3 = res3.ok ? await res3.json().catch(() => null) : null;

        // Auto-save to reservoir
        const content = json3?.content || {};
        const saveRes = await fetch("/api/admin/simple-write", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "reservoir",
            titleEn: json1.outline.title || items[i].keyword,
            contentEn: json2b.body,
            keyword: items[i].keyword,
            metaTitleEn: content.metaTitleEn || json1.outline.metaTitle || "",
            metaDescriptionEn: content.metaDescriptionEn || json1.outline.metaDescription || "",
            tags: content.tags || json1.outline.keywords || [],
            keywords: json1.outline.keywords || [items[i].keyword],
            seoScore: content.seoScore || 70,
          }),
        });
        const saveJson = saveRes.ok ? await saveRes.json().catch(() => null) : null;

        const wc = json2b.wordCount || countWords(json2b.body || "");
        setBulkItems(prev => prev.map((item, idx) => idx === i ? {
          ...item,
          status: "done",
          wordCount: wc,
          result: saveJson?.success ? `Saved to reservoir (${wc} words)` : `Generated ${wc} words but save failed`,
        } : item));
      } catch (e) {
        setBulkItems(prev => prev.map((item, idx) => idx === i ? {
          ...item,
          status: "error",
          result: e instanceof Error ? e.message : "Unknown error",
        } : item));
      }
    }

    setBulkRunning(false);
    setSaveResult(`Bulk generation complete: ${items.length} articles processed. Check the reservoir.`);
  }, [bulkKeywords]);

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

  // ─── Save / Publish / Reservoir ───────────────────────────────────────

  const save = async (action: "save" | "publish" | "reservoir") => {
    setSaving(true);
    setSaveResult(null);
    try {
      const contentEn = editorRef.current?.innerHTML || "";
      const payload: Record<string, unknown> = {
        action,
        id: articleId || undefined,
        titleEn,
        contentEn,
        metaTitleEn: metaTitleEn || titleEn.substring(0, 60),
        metaDescriptionEn,
        categoryId: categoryId || undefined,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      };

      // Reservoir needs keyword
      if (action === "reservoir") {
        payload.keyword = aiKeyword || titleEn;
      }

      const res = await fetch("/api/admin/simple-write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // Handle non-OK responses before trying to parse JSON
      if (!res.ok) {
        let errorMsg = `Server error (${res.status})`;
        try {
          const errJson = await res.json();
          errorMsg = errJson.error || errorMsg;
        } catch {
          errorMsg = res.status === 504
            ? "Request timed out -- please try again"
            : `Server error (${res.status}). Please try again.`;
        }
        setSaveResult(`Error: ${errorMsg}`);
        return;
      }

      let json;
      try {
        json = await res.json();
      } catch {
        setSaveResult("Error: Invalid response from server -- please try again");
        return;
      }

      if (json.success) {
        if (action !== "reservoir") {
          setArticleId(json.id);
          setIsPublished(json.published);
        }
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

  // ─── Bulk View ────────────────────────────────────────────────────────

  if (view === "bulk") {
    const doneCount = bulkItems.filter(i => i.status === "done").length;
    const errorCount = bulkItems.filter(i => i.status === "error").length;

    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        <div className="sticky top-0 z-20 bg-zinc-950/95 backdrop-blur border-b border-zinc-800">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
            <button onClick={() => { setView("list"); fetchList(); }} className="text-sm text-zinc-400 hover:text-zinc-200">
              &larr; Back
            </button>
            <h1 className="text-base font-bold text-white">Bulk AI Generate</h1>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          <div className="rounded-lg border border-violet-800/50 bg-violet-950/30 px-4 py-3 space-y-3">
            <p className="text-xs font-medium text-violet-300">
              Enter keywords (one per line, max 10). Each will be generated as a full article and saved to the reservoir automatically.
            </p>
            <textarea
              value={bulkKeywords}
              onChange={(e) => setBulkKeywords(e.target.value)}
              placeholder={"luxury hotels mayfair london\nbest afternoon tea london\nhalal restaurants soho london"}
              rows={6}
              disabled={bulkRunning}
              className="w-full text-sm px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200 placeholder:text-zinc-600 outline-none resize-none disabled:opacity-50"
            />
            <button
              onClick={startBulkGeneration}
              disabled={bulkRunning || !bulkKeywords.trim()}
              className="w-full py-2.5 rounded-lg text-sm font-medium bg-violet-700 hover:bg-violet-600 text-white border border-violet-600 disabled:opacity-50"
            >
              {bulkRunning ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating {doneCount + errorCount}/{bulkItems.length}...
                </span>
              ) : (
                `Generate ${bulkKeywords.split("\n").filter(k => k.trim()).length || 0} Articles`
              )}
            </button>
          </div>

          {/* Bulk progress */}
          {bulkItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium">
                Progress: {doneCount} done, {errorCount} errors, {bulkItems.length - doneCount - errorCount} remaining
              </p>
              {bulkItems.map((item, i) => (
                <div key={i} className={`px-3 py-2.5 rounded-lg border ${
                  item.status === "done" ? "border-emerald-800 bg-emerald-950/20" :
                  item.status === "error" ? "border-red-800 bg-red-950/20" :
                  item.status === "generating" ? "border-violet-800 bg-violet-950/20" :
                  "border-zinc-800 bg-zinc-900/30"
                }`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-zinc-200 truncate">{item.keyword}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${
                      item.status === "done" ? "bg-emerald-900/50 text-emerald-300" :
                      item.status === "error" ? "bg-red-900/50 text-red-300" :
                      item.status === "generating" ? "bg-violet-900/50 text-violet-300" :
                      "bg-zinc-800 text-zinc-500"
                    }`}>
                      {item.status === "generating" ? (
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 border border-violet-400 border-t-transparent rounded-full animate-spin" />
                          writing
                        </span>
                      ) : item.status}
                    </span>
                  </div>
                  {item.result && (
                    <p className={`text-xs mt-1 ${item.status === "error" ? "text-red-400" : "text-zinc-500"}`}>{item.result}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {saveResult && (
            <div className={`text-xs rounded-lg px-3 py-2 ${
              saveResult.startsWith("Error") ? "bg-red-950/40 text-red-300 border border-red-800" : "bg-emerald-950/40 text-emerald-300 border border-emerald-800"
            }`}>
              {saveResult}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Editor View ────────────────────────────────────────────────────────

  if (view === "editor") {
    const wc = countWords(editorRef.current?.innerHTML || "");
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
              &larr; Back
            </button>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowAiPanel(!showAiPanel)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-violet-900/50 hover:bg-violet-800/50 text-violet-300 border border-violet-700"
              >
                AI
              </button>
              <button
                onClick={expandArticle}
                disabled={expanding || aiGenerating}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-amber-900/50 hover:bg-amber-800/50 text-amber-300 border border-amber-700 disabled:opacity-50"
                title="Expand thin article: adds sections, stats, affiliate links"
              >
                {expanding ? (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 border border-amber-400 border-t-transparent rounded-full animate-spin" />
                    Expanding
                  </span>
                ) : "Expand"}
              </button>
              <button
                onClick={() => save("reservoir")}
                disabled={saving || !titleEn.trim()}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-blue-900/50 hover:bg-blue-800/50 text-blue-300 border border-blue-700 disabled:opacity-50"
                title="Save to pipeline reservoir (auto-publishes after quality gate)"
              >
                {saving ? "..." : "Queue"}
              </button>
              <button
                onClick={() => save("save")}
                disabled={saving || !titleEn.trim()}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 disabled:opacity-50"
              >
                {saving ? "..." : "Draft"}
              </button>
              <button
                onClick={() => save("publish")}
                disabled={saving || !titleEn.trim()}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-700 hover:bg-emerald-600 text-white border border-emerald-600 disabled:opacity-50"
              >
                {saving ? "..." : isPublished ? "Update" : "Publish"}
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
                  placeholder="Keyword (e.g. luxury hotels mayfair)"
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
                    {aiPhase === 1 ? "Step 1/4: Planning outline..." :
                     aiPhase === 2 ? "Step 2/4: Writing first half..." :
                     aiPhase === 3 ? "Step 3/4: Writing second half..." :
                     aiPhase === 4 ? "Step 4/4: Polishing SEO..." :
                     "Generating..."}
                  </span>
                ) : (
                  "Generate Full Article"
                )}
              </button>
              {/* Phase progress bar */}
              {aiGenerating && aiPhase > 0 && (
                <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-violet-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.round((aiPhase / 4) * 100)}%` }}
                  />
                </div>
              )}
              <p className="text-xs text-zinc-500">4-step generation: Outline &rarr; Write (2 parts) &rarr; Polish. ~1,500 words with SEO, stats, and affiliate links.</p>
            </div>
          </div>
        )}

        {/* Save result toast */}
        {saveResult && (
          <div className="max-w-2xl mx-auto px-4 mt-2">
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
            placeholder="Article title..."
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
              data-placeholder="Start writing your article..."
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
                  placeholder={titleEn || "SEO title..."}
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
                  placeholder="Brief description for search results..."
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
            <Link href="/admin/cockpit" className="text-sm text-zinc-400 hover:text-zinc-200">&larr; Cockpit</Link>
            <h1 className="text-base font-bold text-white">Write</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView("bulk")}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-900/50 hover:bg-violet-800/50 text-violet-300 border border-violet-700"
            >
              Bulk AI
            </button>
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
          <div className="text-center py-8 text-zinc-500 text-sm">Loading articles...</div>
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
