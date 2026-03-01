"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import NextImage from "next/image";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import {
  FileText,
  Plus,
  Search,
  Upload,
  Eye,
  Edit,
  Share,
  Download,
  Image,
  Video,
  Globe,
  Calendar,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle,
  Activity,
  SearchCheck,
  Layers,
  Link2,
  BarChart2,
  XCircle,
  RefreshCw,
  Zap,
  Loader2,
} from "lucide-react";

// ── Force Publish button — enhances + publishes best 2 EN + 2 AR articles ──
function ForcePublishButton() {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<{ published: number; skipped: number; articles: string[] } | null>(null);

  const handleForcePublish = async () => {
    setState("loading");
    setResult(null);
    try {
      const res = await fetch("/api/admin/force-publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: "both", count: 2 }),
      });
      const data = await res.json();
      if (data.success) {
        const articles = (data.published || []).map((p: { keyword: string; locale: string }) => `${p.keyword} (${p.locale.toUpperCase()})`);
        setResult({ published: data.published?.length || 0, skipped: data.skipped?.length || 0, articles });
        setState("done");
      } else {
        setResult({ published: 0, skipped: 0, articles: [data.error || "Unknown error"] });
        setState("error");
      }
    } catch (e) {
      setResult({ published: 0, skipped: 0, articles: [e instanceof Error ? e.message : "Network error"] });
      setState("error");
    }
    // Auto-reset after 8s
    setTimeout(() => { setState("idle"); setResult(null); }, 8000);
  };

  if (state === "loading") {
    return (
      <button disabled className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-md opacity-80 cursor-wait">
        <Loader2 className="h-4 w-4 animate-spin" />
        Publishing... (up to 2 min)
      </button>
    );
  }

  if (state === "done" && result) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-md text-sm font-medium">
        <CheckCircle className="h-4 w-4" />
        {result.published > 0 ? `Published ${result.published}: ${result.articles.join(", ")}` : "Nothing new to publish"}
      </div>
    );
  }

  if (state === "error" && result) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-800 rounded-md text-sm font-medium">
        <XCircle className="h-4 w-4" />
        {result.articles[0]}
      </div>
    );
  }

  return (
    <button
      onClick={handleForcePublish}
      className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600 transition-colors"
      title="Find and publish the best reservoir articles now (enhances short articles first)"
    >
      <Zap className="h-4 w-4" />
      Force Publish
    </button>
  );
}

const ContentGenerationMonitor = dynamic(
  () => import("@/components/admin/ContentGenerationMonitor"),
  { ssr: false },
);

const ContentIndexingTab = dynamic(
  () => import("@/components/admin/ContentIndexingTab"),
  { ssr: false },
);

interface Article {
  id: string;
  type: "published" | "draft";
  title: string;
  titleAr: string | null;
  slug: string | null;
  status: string;
  phase?: string;
  phaseLabel?: string;
  phaseIndex?: number;
  phaseProgress?: number;
  seoScore: number | null;
  qualityScore: number | null;
  wordCountEn: number;
  wordCountAr: number;
  indexingStatus: string;
  lastSubmittedAt: string | null;
  isBilingual: boolean;
  hasAffiliate: boolean;
  hasError?: boolean;
  error?: string | null;
  author: string;
  updatedAt: string;
  publicUrl: string | null;
  locale?: string;
}

interface Summary {
  published: number;
  inProgress: number;
  reservoir: number;
  total: number;
}

interface IndexingStats {
  indexed: number;
  submitted: number;
  notSubmitted: number;
  error: number;
}

export default function ContentHub() {
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabFromUrl || "articles");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterIndexing, setFilterIndexing] = useState("all");
  const [articles, setArticles] = useState<Article[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [indexingStats, setIndexingStats] = useState<IndexingStats | null>(null);
  const [mediaAssets, setMediaAssets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (tabFromUrl) setActiveTab(tabFromUrl);
  }, [tabFromUrl]);

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/articles?limit=100");
      if (res.ok) {
        const data = await res.json();
        const raw = data.articles || [];
        setArticles(raw.map((a: any) => ({
          id: a.id,
          type: a.type || "published",
          title: a.title || "(Untitled)",
          titleAr: a.titleAr || null,
          slug: a.slug || null,
          status: a.status || "draft",
          phase: a.phase,
          phaseLabel: a.phaseLabel,
          phaseIndex: a.phaseIndex ?? -1,
          phaseProgress: a.phaseProgress ?? 0,
          seoScore: a.seoScore ?? null,
          qualityScore: a.qualityScore ?? null,
          wordCountEn: a.wordCountEn || 0,
          wordCountAr: a.wordCountAr || 0,
          indexingStatus: a.indexingStatus || "not_submitted",
          lastSubmittedAt: a.lastSubmittedAt || null,
          isBilingual: !!a.isBilingual,
          hasAffiliate: !!a.hasAffiliate,
          hasError: !!a.hasError,
          error: a.error || null,
          author: a.author || "Editorial",
          updatedAt: a.updatedAt,
          publicUrl: a.publicUrl || null,
          locale: a.locale || "en",
        })));
        if (data.summary) setSummary(data.summary);
        if (data.indexing) setIndexingStats(data.indexing);
      }
    } catch (error) {
      console.error("Failed to load articles:", error);
    }

    try {
      const mediaRes = await fetch("/api/admin/media?limit=50");
      if (mediaRes.ok) {
        const mediaData = await mediaRes.json();
        const assets = mediaData.data || mediaData.assets || [];
        setMediaAssets(
          assets.map((a: any) => ({
            id: a.id,
            filename: a.filename,
            originalName: a.original_name || a.title || a.filename,
            url: a.url,
            fileType: a.file_type || "image",
            mimeType: a.mime_type || "",
            fileSize: a.file_size || 0,
            width: a.width,
            height: a.height,
            altText: a.alt_text,
            tags: a.tags || [],
            createdAt: a.created_at,
          })),
        );
      }
    } catch {
      // Media API may not exist yet
    }

    setIsLoading(false);
  };

  const tabs = [
    { id: "articles", name: "Articles", icon: FileText },
    { id: "indexing", name: "Indexing", icon: SearchCheck },
    { id: "generation", name: "Generation Monitor", icon: Activity },
    { id: "media", name: "Media", icon: Image },
    { id: "preview", name: "Social Preview", icon: Share },
    { id: "upload", name: "Upload Content", icon: Upload },
  ];

  const PHASE_ORDER = ["research", "outline", "drafting", "assembly", "images", "seo", "scoring", "reservoir"];

  const getStatusBadge = (article: Article) => {
    if (article.status === "published") return { color: "bg-green-100 text-green-800", icon: <CheckCircle className="h-3 w-3" />, label: "Published" };
    if (article.status === "reservoir") return { color: "bg-blue-100 text-blue-800", icon: <Layers className="h-3 w-3" />, label: "Reservoir" };
    if (article.hasError) return { color: "bg-red-100 text-red-800", icon: <AlertCircle className="h-3 w-3" />, label: "Error" };
    return { color: "bg-gray-100 text-gray-700", icon: <Clock className="h-3 w-3" />, label: article.phaseLabel || "Draft" };
  };

  const getIndexingBadge = (status: string) => {
    switch (status) {
      case "indexed": return { color: "bg-green-100 text-green-700", label: "Indexed" };
      case "submitted": return { color: "bg-blue-100 text-blue-700", label: "Submitted" };
      case "error": return { color: "bg-red-100 text-red-700", label: "Error" };
      case "not_applicable": return null;
      default: return { color: "bg-yellow-100 text-yellow-700", label: "Not Indexed" };
    }
  };

  const getWordCountColor = (count: number) => {
    if (count === 0) return "text-gray-400";
    if (count < 1000) return "text-red-600";
    if (count < 1200) return "text-yellow-600";
    return "text-green-600";
  };

  const getScoreColor = (score: number | null) => {
    if (!score) return "text-gray-400";
    if (score < 50) return "text-red-600";
    if (score < 70) return "text-yellow-600";
    return "text-green-600";
  };

  const filteredArticles = articles.filter((article) => {
    const matchesSearch =
      article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (article.titleAr || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      filterStatus === "all" ||
      article.status === filterStatus ||
      (filterStatus === "in-progress" && article.type === "draft" && article.status !== "reservoir");
    const matchesIndexing =
      filterIndexing === "all" ||
      article.indexingStatus === filterIndexing ||
      (filterIndexing === "not_submitted" && (article.indexingStatus === "not_submitted" || article.indexingStatus === "not_applicable"));
    return matchesSearch && matchesStatus && matchesIndexing;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900">
            Loading Content...
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <FileText className="h-8 w-8 text-blue-500" />
              Content Hub
            </h1>
            <p className="text-gray-600 mt-1">
              Articles, Media, Social Preview, Upload Content
            </p>
          </div>
          <div className="flex items-center gap-4">
            <ForcePublishButton />
            <Link
              href="/admin/editor"
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Article
            </Link>
            <button
              onClick={() => { window.location.href = '/admin/media'; }}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors">
              <Upload className="h-4 w-4" />
              Upload Media
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "articles" && (
        <div>
          {/* Summary Stats */}
          {(summary || indexingStats) && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {summary && (
                <>
                  <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-green-600">{summary.published}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Published</div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-blue-600">{summary.reservoir}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Reservoir</div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-gray-600">{summary.inProgress}</div>
                    <div className="text-xs text-gray-500 mt-0.5">In Pipeline</div>
                  </div>
                </>
              )}
              {indexingStats && (
                <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-green-600">{indexingStats.indexed}</div>
                  <div className="text-xs text-gray-500 mt-0.5">Indexed by Google</div>
                </div>
              )}
            </div>
          )}

          {/* Filters */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search articles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full text-sm"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="all">All Statuses</option>
                <option value="published">Published</option>
                <option value="reservoir">Reservoir (Ready to Publish)</option>
                <option value="in-progress">In Pipeline</option>
              </select>
              <select
                value={filterIndexing}
                onChange={(e) => setFilterIndexing(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="all">All Indexing States</option>
                <option value="indexed">Indexed by Google</option>
                <option value="submitted">Submitted (Pending)</option>
                <option value="not_submitted">Not Yet Indexed</option>
                <option value="error">Indexing Error</option>
              </select>
            </div>
          </div>

          {/* Articles List */}
          {filteredArticles.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Articles Found</h3>
              <p className="text-gray-600">Create your first article or adjust the filters.</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              {/* Column headers — desktop only */}
              <div className="hidden sm:grid grid-cols-12 gap-2 px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wide">
                <div className="col-span-5">Article</div>
                <div className="col-span-2">Pipeline / Status</div>
                <div className="col-span-1 text-center">Words</div>
                <div className="col-span-1 text-center">SEO</div>
                <div className="col-span-1 text-center">Quality</div>
                <div className="col-span-1 text-center">Index</div>
                <div className="col-span-1 text-right">Actions</div>
              </div>

              <div className="divide-y divide-gray-100">
                {filteredArticles.map((article) => {
                  const statusBadge = getStatusBadge(article);
                  const indexingBadge = getIndexingBadge(article.indexingStatus);

                  return (
                    <div key={article.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                      {/* Desktop layout */}
                      <div className="hidden sm:grid grid-cols-12 gap-2 items-center">
                        {/* Title column */}
                        <div className="col-span-5 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate leading-tight">{article.title}</p>
                          {article.titleAr && (
                            <p className="text-xs text-gray-400 truncate mt-0.5" dir="rtl">{article.titleAr}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {article.isBilingual && (
                              <span className="inline-flex items-center gap-0.5 text-xs text-purple-600">
                                <Globe className="h-2.5 w-2.5" /> EN+AR
                              </span>
                            )}
                            {article.hasAffiliate && (
                              <span className="inline-flex items-center gap-0.5 text-xs text-teal-600">
                                <Link2 className="h-2.5 w-2.5" /> Affiliate
                              </span>
                            )}
                            {article.hasError && (
                              <span className="inline-flex items-center gap-0.5 text-xs text-red-600" title={article.error || "Error"}>
                                <XCircle className="h-2.5 w-2.5" /> Error
                              </span>
                            )}
                            <span className="text-xs text-gray-400">
                              {article.updatedAt ? new Date(article.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—"}
                            </span>
                          </div>
                        </div>

                        {/* Phase/Status column */}
                        <div className="col-span-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge.color}`}>
                            {statusBadge.icon}
                            {statusBadge.label}
                          </span>
                          {article.type === "draft" && article.phaseIndex !== undefined && article.phaseIndex >= 0 && (
                            <div className="mt-1.5 flex items-center gap-1">
                              <div className="flex-1 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-blue-500 h-1.5 rounded-full transition-all"
                                  style={{ width: `${article.phaseProgress ?? 0}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-400 whitespace-nowrap">
                                {article.phaseIndex + 1}/{PHASE_ORDER.length}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Word count */}
                        <div className={`col-span-1 text-center text-xs font-medium ${getWordCountColor(article.wordCountEn)}`}>
                          {article.wordCountEn > 0 ? `${(article.wordCountEn / 1000).toFixed(1)}k` : "—"}
                        </div>

                        {/* SEO score */}
                        <div className={`col-span-1 text-center text-xs font-medium ${getScoreColor(article.seoScore)}`}>
                          {article.seoScore !== null ? `${article.seoScore}` : "—"}
                        </div>

                        {/* Quality score */}
                        <div className={`col-span-1 text-center text-xs font-medium ${getScoreColor(article.qualityScore)}`}>
                          {article.qualityScore !== null ? `${article.qualityScore}` : "—"}
                        </div>

                        {/* Indexing status */}
                        <div className="col-span-1 text-center">
                          {indexingBadge ? (
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${indexingBadge.color}`}>
                              {indexingBadge.label}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="col-span-1 flex items-center justify-end gap-1">
                          {article.publicUrl && (
                            <a
                              href={article.publicUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                              title="View Live"
                            >
                              <Globe className="h-3.5 w-3.5" />
                            </a>
                          )}
                          {article.slug && (
                            <Link
                              href={`/admin/editor?slug=${article.slug}`}
                              className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors"
                              title="Edit"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Link>
                          )}
                        </div>
                      </div>

                      {/* Mobile layout */}
                      <div className="sm:hidden">
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <p className="text-sm font-medium text-gray-900 leading-tight">{article.title}</p>
                          <span className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge.color}`}>
                            {statusBadge.icon}
                            {statusBadge.label}
                          </span>
                        </div>

                        {/* Phase progress for drafts */}
                        {article.type === "draft" && article.phaseIndex !== undefined && article.phaseIndex >= 0 && (
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-blue-500 h-2 rounded-full"
                                style={{ width: `${article.phaseProgress ?? 0}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 whitespace-nowrap">Phase {article.phaseIndex + 1}/8</span>
                          </div>
                        )}

                        {/* Metrics */}
                        <div className="flex items-center gap-3 text-xs flex-wrap mt-1">
                          {article.wordCountEn > 0 && (
                            <span className={`font-medium ${getWordCountColor(article.wordCountEn)}`}>
                              {(article.wordCountEn / 1000).toFixed(1)}k words
                            </span>
                          )}
                          {article.seoScore !== null && (
                            <span className={`flex items-center gap-0.5 ${getScoreColor(article.seoScore)}`}>
                              <TrendingUp className="h-3 w-3" /> SEO {article.seoScore}
                            </span>
                          )}
                          {article.qualityScore !== null && (
                            <span className={`flex items-center gap-0.5 ${getScoreColor(article.qualityScore)}`}>
                              <BarChart2 className="h-3 w-3" /> Q {article.qualityScore}
                            </span>
                          )}
                          {indexingBadge && (
                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${indexingBadge.color}`}>
                              {indexingBadge.label}
                            </span>
                          )}
                          {article.isBilingual && <span className="text-purple-600">EN+AR</span>}
                          {article.hasAffiliate && <span className="text-teal-600">Affiliate</span>}
                          {article.hasError && <span className="text-red-600">⚠ Error</span>}
                        </div>

                        {/* Date + actions */}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-400">
                            {article.updatedAt ? new Date(article.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" }) : ""}
                          </span>
                          <div className="flex items-center gap-2">
                            {article.publicUrl && (
                              <a href={article.publicUrl} target="_blank" rel="noopener noreferrer" className="p-1 text-gray-400 hover:text-blue-600">
                                <Globe className="h-4 w-4" />
                              </a>
                            )}
                            {article.slug && (
                              <Link href={`/admin/editor?slug=${article.slug}`} className="p-1 text-gray-400 hover:text-gray-700">
                                <Edit className="h-4 w-4" />
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer count + refresh */}
              <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 flex items-center justify-between">
                <span>Showing {filteredArticles.length} of {articles.length} articles</span>
                <button onClick={loadContent} className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700">
                  <RefreshCw className="h-3 w-3" /> Refresh
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "indexing" && <ContentIndexingTab />}

      {activeTab === "generation" && <ContentGenerationMonitor />}

      {activeTab === "media" && (
        <div>
          {mediaAssets.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <Image className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Media Assets
              </h3>
              <p className="text-gray-600">
                Upload images and videos to your media library.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {mediaAssets.map((asset: any) => (
                <div
                  key={asset.id}
                  className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="aspect-square bg-gray-200 relative">
                    {asset.fileType === "image" ? (
                      <NextImage
                        src={asset.url}
                        alt={asset.altText || asset.originalName}
                        width={0}
                        height={0}
                        sizes="100vw"
                        className="w-full h-full object-cover"
                        style={{ width: '100%', height: '100%' }}
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video className="h-12 w-12 text-gray-400" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <span className="px-2 py-1 bg-black bg-opacity-50 text-white text-xs rounded">
                        {asset.fileType}
                      </span>
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="text-sm font-medium text-gray-900 mb-2 line-clamp-2">
                      {asset.originalName}
                    </h3>

                    <div className="text-xs text-gray-600 mb-3">
                      {asset.width && asset.height && (
                        <div>
                          {asset.width} x {asset.height}
                        </div>
                      )}
                      {asset.fileSize > 0 && (
                        <div>
                          {(asset.fileSize / 1024 / 1024).toFixed(1)} MB
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-500">
                        {asset.createdAt
                          ? new Date(asset.createdAt).toLocaleDateString()
                          : ""}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="View"
                          onClick={() => window.open(asset.url, '_blank')}
                        >
                          <Eye className="h-3 w-3" />
                        </button>
                        <button
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="Download"
                          onClick={() => {
                            const a = document.createElement('a');
                            a.href = asset.url;
                            a.download = asset.originalName || asset.name || 'media';
                            a.click();
                          }}
                        >
                          <Download className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "preview" && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Social Media Preview
          </h2>
          <p className="text-gray-600">
            Social media preview functionality will be implemented here.
          </p>
        </div>
      )}

      {activeTab === "upload" && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Upload Content
          </h2>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Upload Files
            </h3>
            <p className="text-gray-600 mb-4">
              Drag and drop files here, or click to select files
            </p>
            <button className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors">
              Choose Files
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
