"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  TrendingUp,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  Globe,
  BarChart3,
  Zap,
  RefreshCw,
  ExternalLink,
  FileText,
  ChevronDown,
  ChevronRight,
  XCircle,
  Loader2,
  Send,
  Activity,
  AlertCircle,
  Shield,
  Eye,
  Info,
} from "lucide-react";
import { toast } from "sonner";

// ── Types ──

interface SEOHealth {
  overallScore: number;
  autoPublishRate: number;
  reviewQueue: number;
  criticalIssues: number;
  lastChecked: string;
}

interface ArticleSEO {
  id: string;
  title: string;
  url: string;
  seoScore: number;
  keywords: string[];
  issues: string[];
  lastAudit: string;
}

interface CrawlResult {
  url: string;
  status: "success" | "error" | "warning";
  issues: string[];
  score: number;
  lastCrawled: string;
}

// Indexing types
interface IndexingArticle {
  id: string;
  title: string;
  slug: string;
  url: string;
  publishedAt: string | null;
  seoScore: number;
  wordCount: number;
  indexingStatus: "indexed" | "submitted" | "not_indexed" | "error" | "never_submitted";
  submittedAt: string | null;
  lastCrawledAt: string | null;
  lastInspectedAt: string | null;
  coverageState: string | null;
  submittedIndexnow: boolean;
  submittedSitemap: boolean;
  submissionAttempts: number;
  notIndexedReasons: string[];
  fixAction: string | null;
}

interface IndexingData {
  success: boolean;
  siteId: string;
  baseUrl: string;
  config: {
    hasIndexNowKey: boolean;
    hasGscCredentials: boolean;
    gscSiteUrl: string;
  };
  summary: {
    total: number;
    indexed: number;
    submitted: number;
    notIndexed: number;
    neverSubmitted: number;
    errors: number;
  };
  healthDiagnosis: {
    status: "healthy" | "warning" | "critical" | "not_started";
    message: string;
    detail: string;
    indexingRate: number;
  };
  recentActivity: Array<{
    jobName: string;
    status: string;
    startedAt: string;
    durationMs: number;
    itemsProcessed: number;
    itemsSucceeded: number;
    errorMessage: string | null;
  }>;
  articles: IndexingArticle[];
  systemIssues: Array<{
    severity: "critical" | "warning" | "info";
    category: string;
    message: string;
    detail: string;
    fixAction?: string;
  }>;
}

interface IndexingStats {
  totalReports: number;
  totalSubmissions: number;
  totalAudits: number;
  totalGoogleSubmitted: number;
  totalIndexNowSubmitted: number;
  lastSubmission: string | null;
  lastSuccessfulSubmission: string | null;
  latestSnapshot: {
    totalPages: number;
    inspected: number;
    indexed: number;
    notIndexed: number;
    date: string;
  } | null;
  latestSubmissionResult: {
    indexNow: { submitted: number; status: string };
    googleApi: { submitted: number; failed: number; errors: string[]; status: string };
  } | null;
  timeline: {
    date: string;
    mode: string;
    totalPages: number;
    googleSubmitted: number;
    googleStatus: string;
    indexNowSubmitted: number;
    indexNowStatus: string;
  }[];
}

interface AuditResult {
  totalPosts: number;
  passing: number;
  failing: number;
  averageScore: number;
  totalAutoFixes: number;
  posts: Array<{
    slug: string;
    score: number;
    issues: string[];
    fixes: string[];
  }>;
}

// ── Helpers ──

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  indexed: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Indexed" },
  submitted: { bg: "bg-blue-100", text: "text-blue-700", label: "Submitted" },
  not_indexed: { bg: "bg-red-100", text: "text-red-700", label: "Not Indexed" },
  error: { bg: "bg-red-100", text: "text-red-700", label: "Error" },
  never_submitted: { bg: "bg-gray-100", text: "text-gray-600", label: "Never Submitted" },
};

const HEALTH_STYLES: Record<string, { bg: string; border: string; icon: string; text: string }> = {
  healthy: { bg: "bg-emerald-50", border: "border-emerald-200", icon: "text-emerald-500", text: "text-emerald-800" },
  warning: { bg: "bg-amber-50", border: "border-amber-200", icon: "text-amber-500", text: "text-amber-800" },
  critical: { bg: "bg-red-50", border: "border-red-200", icon: "text-red-500", text: "text-red-800" },
  not_started: { bg: "bg-gray-50", border: "border-gray-200", icon: "text-gray-400", text: "text-gray-700" },
};

// ══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════

export default function SEOCommandCenter() {
  const [isLoading, setIsLoading] = useState(true);
  const [seoHealth, setSeoHealth] = useState<SEOHealth>({
    overallScore: 0, autoPublishRate: 0, reviewQueue: 0,
    criticalIssues: 0, lastChecked: new Date().toISOString(),
  });
  const [articleSEO, setArticleSEO] = useState<ArticleSEO[]>([]);
  const [crawlResults, setCrawlResults] = useState<CrawlResult[]>([]);
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlProgress, setCrawlProgress] = useState(0);

  // Indexing state
  const [indexingData, setIndexingData] = useState<IndexingData | null>(null);
  const [indexingStats, setIndexingStats] = useState<IndexingStats | null>(null);
  const [indexingLoading, setIndexingLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingSlug, setSubmittingSlug] = useState<string | null>(null);
  const [expandedArticle, setExpandedArticle] = useState<string | null>(null);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [auditRunning, setAuditRunning] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => { loadSEOData(); }, []);

  const loadSEOData = async () => {
    setIsLoading(true);
    try {
      const overviewRes = await fetch("/api/admin/seo?type=overview");
      if (overviewRes.ok) {
        const data = await overviewRes.json();
        setSeoHealth({
          overallScore: data.averageScore || 0,
          autoPublishRate: data.autoPublishRate || 0,
          reviewQueue: data.reviewQueue || 0,
          criticalIssues: data.criticalIssues || 0,
          lastChecked: new Date().toISOString(),
        });
      }
    } catch { /* non-fatal */ }

    try {
      const contentRes = await fetch("/api/admin/content?limit=20");
      if (contentRes.ok) {
        const contentData = await contentRes.json();
        const posts = contentData.data || [];
        setArticleSEO(
          posts.map((p: any) => {
            const issues: string[] = [];
            if (!p.meta_title_en) issues.push("Missing meta title");
            if (!p.meta_description_en) issues.push("Missing meta description");
            if (!p.featured_image) issues.push("Missing featured image");
            return {
              id: p.id, title: p.title_en || p.title_ar || "Untitled",
              url: `/blog/${p.slug}`, seoScore: p.seo_score || 0,
              keywords: p.tags || [], issues,
              lastAudit: p.updated_at ? new Date(p.updated_at).toLocaleDateString() : "Never",
            };
          }),
        );
      }
    } catch { /* non-fatal */ }

    await loadIndexingData();
    setIsLoading(false);
  };

  const loadIndexingData = useCallback(async () => {
    setIndexingLoading(true);
    try {
      const [indexRes, statsRes] = await Promise.all([
        fetch("/api/admin/content-indexing"),
        fetch("/api/admin/seo/indexing?type=stats"),
      ]);
      if (indexRes.ok) {
        setIndexingData(await indexRes.json());
      }
      if (statsRes.ok) {
        const s = await statsRes.json();
        setIndexingStats(s.stats || null);
      }
    } catch { /* non-fatal */ }
    setIndexingLoading(false);
  }, []);

  // ── Actions ──

  const submitAll = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/content-indexing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit_all" }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Submitted ${data.submitted} pages — IndexNow: ${data.indexNow?.message || "N/A"}`);
        await loadIndexingData();
      } else {
        toast.error(data.error || "Submission failed");
      }
    } catch { toast.error("Network error"); }
    finally { setIsSubmitting(false); }
  };

  const submitSingle = async (slug: string) => {
    setSubmittingSlug(slug);
    try {
      const res = await fetch("/api/admin/content-indexing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit", slugs: [slug] }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Submitted /blog/${slug}`);
        await loadIndexingData();
      } else {
        toast.error(data.error || "Failed");
      }
    } catch { toast.error("Network error"); }
    finally { setSubmittingSlug(null); }
  };

  const runIndexingAudit = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/seo/check-and-index?limit=30");
      if (res.ok) {
        const data = await res.json();
        toast.success(
          `Inspected ${data.summary?.inspected || 0} pages: ${data.summary?.indexed || 0} indexed, ${data.summary?.notIndexed || 0} not indexed`
        );
        await loadIndexingData();
      } else { toast.error("Audit failed"); }
    } catch { toast.error("Network error"); }
    finally { setIsSubmitting(false); }
  };

  const runComplianceAudit = async () => {
    setAuditRunning(true);
    try {
      const res = await fetch("/api/admin/content-indexing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "compliance_audit" }),
      });
      const data = await res.json();
      if (res.ok && data.summary) {
        setAuditResult(data.summary ? { ...data.summary, posts: data.posts } : null);
        toast.success(`Audit: ${data.summary.passing} passing, ${data.summary.failing} failing, ${data.summary.totalAutoFixes} auto-fixed`);
      } else { toast.error(data.error || "Audit failed"); }
    } catch { toast.error("Network error"); }
    finally { setAuditRunning(false); }
  };

  const startCrawl = async () => {
    setIsCrawling(true);
    setCrawlProgress(0);
    try {
      const res = await fetch("/api/admin/seo/crawler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "crawl" }),
      });
      if (res.ok) {
        const data = await res.json();
        setCrawlProgress(100);
        if (data.results) {
          setCrawlResults(data.results.map((r: any) => ({
            url: r.url,
            status: r.score >= 80 ? "success" : r.score >= 50 ? "warning" : "error",
            issues: r.issues || [], score: r.score || 0,
            lastCrawled: new Date().toISOString(),
          })));
        }
        toast.success("SEO crawl completed!");
      } else {
        const qfRes = await fetch("/api/admin/seo?type=quick-fixes");
        if (qfRes.ok) {
          const qfData = await qfRes.json();
          setCrawlResults((qfData.quickFixes || []).map((f: any) => ({
            url: `/blog/${f.slug}`,
            status: f.fixes.length > 0 ? "warning" : "success",
            issues: f.fixes.map((fix: string) => fix.replace(/_/g, " ")),
            score: Math.max(0, 100 - f.fixes.length * 15),
            lastCrawled: new Date().toISOString(),
          })));
        }
        setCrawlProgress(100);
        toast.success("SEO analysis completed!");
      }
    } catch { toast.error("SEO crawl failed"); }
    finally { setIsCrawling(false); }
  };

  const getScoreColor = (s: number) => s >= 90 ? "text-green-600" : s >= 70 ? "text-yellow-600" : "text-red-600";
  const getScoreBadge = (s: number) =>
    s >= 90 ? <Badge className="bg-green-500">Excellent</Badge>
    : s >= 70 ? <Badge className="bg-yellow-500">Good</Badge>
    : <Badge className="bg-red-500">Needs Work</Badge>;
  const getStatusIcon = (s: string) =>
    s === "success" ? <CheckCircle className="h-4 w-4 text-green-500" />
    : s === "warning" ? <AlertTriangle className="h-4 w-4 text-yellow-500" />
    : s === "error" ? <AlertTriangle className="h-4 w-4 text-red-500" />
    : <Clock className="h-4 w-4 text-gray-400" />;

  // ── Filtered articles ──
  const filteredArticles = indexingData?.articles?.filter(a =>
    statusFilter === "all" || a.indexingStatus === statusFilter
  ) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">Loading SEO Data...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Search className="h-7 w-7 text-yellow-500" />
                SEO Command Center
              </h1>
              <p className="text-gray-600 mt-1 text-sm">
                SEO health, indexing status, and optimization — all in one place
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={startCrawl} disabled={isCrawling} className="bg-yellow-500 hover:bg-yellow-600" size="sm">
                <RefreshCw className={`h-4 w-4 mr-2 ${isCrawling ? "animate-spin" : ""}`} />
                {isCrawling ? "Analyzing..." : "Run SEO Analysis"}
              </Button>
              <Button variant="outline" onClick={loadSEOData} size="sm">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* SEO Health Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <Card className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
            <CardContent className="p-4">
              <p className="text-yellow-100 text-xs">Avg SEO Score</p>
              <p className="text-2xl font-bold">{seoHealth.overallScore}/100</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardContent className="p-4">
              <p className="text-green-100 text-xs">Auto-Publish Rate</p>
              <p className="text-2xl font-bold">{seoHealth.autoPublishRate}%</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="p-4">
              <p className="text-blue-100 text-xs">Review Queue</p>
              <p className="text-2xl font-bold">{seoHealth.reviewQueue}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardContent className="p-4">
              <p className="text-purple-100 text-xs">Critical Issues</p>
              <p className="text-2xl font-bold">{seoHealth.criticalIssues}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="indexing" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="indexing" className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" /> Indexing Hub
            </TabsTrigger>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="articles">Article SEO</TabsTrigger>
            <TabsTrigger value="crawl">Analysis</TabsTrigger>
          </TabsList>

          {/* ══════════════════════════════════════════════════════════ */}
          {/* INDEXING HUB — Everything in one place                   */}
          {/* ══════════════════════════════════════════════════════════ */}
          <TabsContent value="indexing" className="space-y-6">
            <IndexingHub
              data={indexingData}
              stats={indexingStats}
              loading={indexingLoading}
              isSubmitting={isSubmitting}
              submittingSlug={submittingSlug}
              expandedArticle={expandedArticle}
              auditResult={auditResult}
              auditRunning={auditRunning}
              statusFilter={statusFilter}
              filteredArticles={filteredArticles}
              onRefresh={loadIndexingData}
              onSubmitAll={submitAll}
              onSubmitSingle={submitSingle}
              onRunAudit={runIndexingAudit}
              onRunComplianceAudit={runComplianceAudit}
              onExpandArticle={setExpandedArticle}
              onSetFilter={setStatusFilter}
            />
          </TabsContent>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-yellow-500" />SEO Health Status</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between"><span>Average SEO Score</span><div className="flex items-center gap-2"><Progress value={seoHealth.overallScore} className="w-20" /><span className={getScoreColor(seoHealth.overallScore)}>{seoHealth.overallScore}/100</span></div></div>
                  <div className="flex items-center justify-between"><span>Auto-Publish Rate</span><div className="flex items-center gap-2"><Progress value={seoHealth.autoPublishRate} className="w-20" /><span className={getScoreColor(seoHealth.autoPublishRate)}>{seoHealth.autoPublishRate}%</span></div></div>
                  <div className="flex items-center justify-between"><span>Articles in Review Queue</span><span className="font-bold">{seoHealth.reviewQueue}</span></div>
                  <div className="flex items-center justify-between"><span>Critical Issues</span><span className={`font-bold ${seoHealth.criticalIssues > 0 ? "text-red-600" : "text-green-600"}`}>{seoHealth.criticalIssues}</span></div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-yellow-500" />Article Score Distribution</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between"><span>Total Articles</span><span className="font-bold text-2xl">{articleSEO.length}</span></div>
                  <div className="flex items-center justify-between"><span>Score 90+</span><span className="font-bold text-green-600">{articleSEO.filter(a => a.seoScore >= 90).length}</span></div>
                  <div className="flex items-center justify-between"><span>Score 70-89</span><span className="font-bold text-yellow-600">{articleSEO.filter(a => a.seoScore >= 70 && a.seoScore < 90).length}</span></div>
                  <div className="flex items-center justify-between"><span>Score &lt; 70</span><span className="font-bold text-red-600">{articleSEO.filter(a => a.seoScore < 70).length}</span></div>
                  <div className="flex items-center justify-between"><span>With Issues</span><span className="font-bold text-orange-600">{articleSEO.filter(a => a.issues.length > 0).length}</span></div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Articles Tab */}
          <TabsContent value="articles" className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-yellow-500" />Article SEO Scores</CardTitle></CardHeader>
              <CardContent>
                {articleSEO.length === 0 ? (
                  <div className="text-center py-12"><FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" /><h3 className="text-lg font-medium text-gray-900 mb-2">No Articles Yet</h3><p className="text-gray-600">Create articles to see their SEO scores here.</p></div>
                ) : (
                  <div className="space-y-4">{articleSEO.map(article => (
                    <div key={article.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-2">{article.title}</h3>
                          <div className="text-sm text-gray-600 mb-2">URL: {article.url}</div>
                          {article.keywords.length > 0 && (<div className="flex items-center gap-2 mb-2 flex-wrap"><span className="text-sm">Tags:</span>{article.keywords.slice(0, 5).map(k => <Badge key={k} variant="outline" className="text-xs">{k}</Badge>)}</div>)}
                          {article.issues.length > 0 && (<div className="flex items-center gap-2 flex-wrap"><span className="text-sm text-red-600">Issues:</span>{article.issues.map(i => <Badge key={i} variant="destructive" className="text-xs">{i}</Badge>)}</div>)}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="text-right"><div className={`text-2xl font-bold ${getScoreColor(article.seoScore)}`}>{article.seoScore}/100</div>{getScoreBadge(article.seoScore)}</div>
                          <div className="text-xs text-gray-500">Updated: {article.lastAudit}</div>
                        </div>
                      </div>
                    </div>
                  ))}</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Crawl Results Tab */}
          <TabsContent value="crawl" className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5 text-yellow-500" />SEO Analysis Results</CardTitle></CardHeader>
              <CardContent>
                {isCrawling ? (
                  <div className="space-y-4 text-center"><RefreshCw className="h-8 w-8 animate-spin text-yellow-500 mx-auto mb-4" /><p className="text-gray-600">Analyzing your website...</p><Progress value={crawlProgress} className="mt-4" /><p className="text-sm text-gray-500 mt-2">{crawlProgress}% complete</p></div>
                ) : crawlResults.length > 0 ? (
                  <div className="space-y-4">{crawlResults.map((r, i) => (
                    <div key={i} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">{getStatusIcon(r.status)}<div><div className="font-medium">{r.url}</div><div className="text-sm text-gray-600">Analyzed: {new Date(r.lastCrawled).toLocaleString()}</div></div></div>
                        <div className="flex items-center gap-2"><span className={`text-lg font-bold ${getScoreColor(r.score)}`}>{r.score}/100</span>{getScoreBadge(r.score)}</div>
                      </div>
                      {r.issues.length > 0 && (<div className="mt-3 pt-3 border-t"><div className="text-sm text-red-600 mb-2">Issues found:</div><div className="flex flex-wrap gap-2">{r.issues.map((issue, j) => <Badge key={j} variant="destructive" className="text-xs">{issue}</Badge>)}</div></div>)}
                    </div>
                  ))}</div>
                ) : (
                  <div className="text-center py-12"><Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" /><h3 className="text-lg font-medium text-gray-900 mb-2">No Analysis Results</h3><p className="text-gray-600 mb-4">Run an SEO analysis to check your website</p><Button onClick={startCrawl} className="bg-yellow-500 hover:bg-yellow-600"><RefreshCw className="h-4 w-4 mr-2" />Run SEO Analysis</Button></div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// INDEXING HUB — The unified indexing command center
// ══════════════════════════════════════════════════════════════════

function IndexingHub({
  data, stats, loading, isSubmitting, submittingSlug,
  expandedArticle, auditResult, auditRunning, statusFilter,
  filteredArticles, onRefresh, onSubmitAll, onSubmitSingle,
  onRunAudit, onRunComplianceAudit, onExpandArticle, onSetFilter,
}: {
  data: IndexingData | null;
  stats: IndexingStats | null;
  loading: boolean;
  isSubmitting: boolean;
  submittingSlug: string | null;
  expandedArticle: string | null;
  auditResult: AuditResult | null;
  auditRunning: boolean;
  statusFilter: string;
  filteredArticles: IndexingArticle[];
  onRefresh: () => void;
  onSubmitAll: () => void;
  onSubmitSingle: (slug: string) => void;
  onRunAudit: () => void;
  onRunComplianceAudit: () => void;
  onExpandArticle: (id: string | null) => void;
  onSetFilter: (f: string) => void;
}) {
  const [showAllIssues, setShowAllIssues] = useState(false);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [showAllTimeline, setShowAllTimeline] = useState(false);

  if (!data && loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <XCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load indexing data</h3>
          <Button onClick={onRefresh} variant="outline">Retry</Button>
        </CardContent>
      </Card>
    );
  }

  const { summary, healthDiagnosis, config, systemIssues, recentActivity, articles } = data;
  const hs = HEALTH_STYLES[healthDiagnosis.status] || HEALTH_STYLES.not_started;

  return (
    <div className="space-y-5">

      {/* ── 1. Health Diagnosis Banner ── */}
      <div className={`rounded-xl border-2 ${hs.border} ${hs.bg} p-4`}>
        <div className="flex items-start gap-3">
          <div className="pt-0.5">
            {healthDiagnosis.status === "healthy" ? <CheckCircle className={`h-6 w-6 ${hs.icon}`} /> :
             healthDiagnosis.status === "critical" ? <XCircle className={`h-6 w-6 ${hs.icon}`} /> :
             healthDiagnosis.status === "warning" ? <AlertTriangle className={`h-6 w-6 ${hs.icon}`} /> :
             <Info className={`h-6 w-6 ${hs.icon}`} />}
          </div>
          <div className="flex-1">
            <div className={`font-semibold text-lg ${hs.text}`}>{healthDiagnosis.message}</div>
            <div className="text-sm text-gray-600 mt-1">{healthDiagnosis.detail}</div>
            {summary.total > 0 && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>Indexing Rate</span>
                  <span className="font-bold">{healthDiagnosis.indexingRate}%</span>
                </div>
                <Progress value={healthDiagnosis.indexingRate} className="h-2" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 2. Config Status ── */}
      {(!config.hasIndexNowKey || !config.hasGscCredentials) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-medium text-amber-800">Configuration incomplete</div>
            <div className="text-amber-700 mt-1 space-y-1">
              {!config.hasIndexNowKey && <div>INDEXNOW_KEY not set — Bing/Yandex submission disabled</div>}
              {!config.hasGscCredentials && <div>Google Search Console credentials not set — cannot verify indexing status</div>}
            </div>
          </div>
        </div>
      )}

      {/* ── 3. Action Buttons ── */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={onSubmitAll} disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700" size="sm">
          {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
          Submit All Pages
        </Button>
        <Button onClick={onRunAudit} disabled={isSubmitting} variant="outline" size="sm">
          {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Eye className="h-4 w-4 mr-2" />}
          Check Index Status
        </Button>
        <Button onClick={onRunComplianceAudit} disabled={auditRunning} variant="outline" size="sm">
          {auditRunning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Shield className="h-4 w-4 mr-2" />}
          Run Indexing Audit
        </Button>
        <Button onClick={onRefresh} disabled={loading} variant="ghost" size="sm">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* ── 4. Summary Cards ── */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {[
          { label: "Total", value: summary.total, color: "text-gray-900", bg: "bg-white" },
          { label: "Indexed", value: summary.indexed, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Submitted", value: summary.submitted, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Not Indexed", value: summary.notIndexed, color: "text-red-600", bg: "bg-red-50" },
          { label: "Never Sent", value: summary.neverSubmitted, color: "text-gray-600", bg: "bg-gray-50" },
          { label: "Errors", value: summary.errors, color: summary.errors > 0 ? "text-red-600" : "text-gray-400", bg: summary.errors > 0 ? "bg-red-50" : "bg-gray-50" },
        ].map(c => (
          <div key={c.label} className={`${c.bg} rounded-xl p-3 text-center border`}>
            <div className={`text-xl font-bold ${c.color}`}>{c.value}</div>
            <div className="text-[10px] font-medium text-gray-500 uppercase">{c.label}</div>
          </div>
        ))}
      </div>

      {/* ── 5. Per-Page Indexing Status ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5 text-blue-500" />
              Per-Page Indexing Status ({filteredArticles.length})
            </CardTitle>
            <div className="flex gap-1 overflow-x-auto">
              {[
                { key: "all", label: "All" },
                { key: "indexed", label: "Indexed" },
                { key: "submitted", label: "Submitted" },
                { key: "not_indexed", label: "Not Indexed" },
                { key: "never_submitted", label: "Never Sent" },
                { key: "error", label: "Errors" },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => onSetFilter(f.key)}
                  className={`px-2 py-1 rounded-full text-[10px] font-medium transition-colors flex-shrink-0 ${
                    statusFilter === f.key
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {filteredArticles.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-400">
              {statusFilter === "all" ? "No published articles found" : `No articles with status "${statusFilter}"`}
            </div>
          ) : (
            filteredArticles.map(article => {
              const isExpanded = expandedArticle === article.id;
              const st = STATUS_STYLES[article.indexingStatus] || STATUS_STYLES.never_submitted;
              return (
                <div key={article.id} className="border rounded-lg overflow-hidden">
                  <button
                    onClick={() => onExpandArticle(isExpanded ? null : article.id)}
                    className="w-full text-left p-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                  >
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${st.bg} ${st.text} flex-shrink-0`}>
                      {st.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{article.title}</div>
                      <div className="text-[10px] text-gray-500 font-mono truncate">/blog/{article.slug}</div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right hidden sm:block">
                        <div className={`text-xs font-bold ${getScoreColor(article.seoScore)}`}>{article.seoScore}</div>
                        <div className="text-[10px] text-gray-400">{article.wordCount}w</div>
                      </div>
                      {article.indexingStatus !== "indexed" && (
                        <Button
                          size="sm" variant="outline"
                          className="text-xs h-7 px-2"
                          disabled={submittingSlug === article.slug}
                          onClick={(e) => { e.stopPropagation(); onSubmitSingle(article.slug); }}
                        >
                          {submittingSlug === article.slug ? <Loader2 className="h-3 w-3 animate-spin" /> : "Submit"}
                        </Button>
                      )}
                      <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                    </div>
                  </button>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <div className="border-t bg-gray-50 p-4 space-y-3">
                      {/* Quick Facts */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div><span className="text-gray-500">SEO Score:</span> <span className={`font-bold ${getScoreColor(article.seoScore)}`}>{article.seoScore}/100</span></div>
                        <div><span className="text-gray-500">Words:</span> <span className="font-medium">{article.wordCount}</span></div>
                        <div><span className="text-gray-500">Published:</span> <span className="font-medium">{article.publishedAt ? timeAgo(article.publishedAt) : "—"}</span></div>
                        <div><span className="text-gray-500">Attempts:</span> <span className="font-medium">{article.submissionAttempts}</span></div>
                      </div>

                      {/* Submission Timeline */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-gray-500">Submitted:</span>{" "}
                          <span className="font-medium">{article.submittedAt ? timeAgo(article.submittedAt) : "Never"}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Crawled:</span>{" "}
                          <span className="font-medium">{article.lastCrawledAt ? timeAgo(article.lastCrawledAt) : "Never"}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Inspected:</span>{" "}
                          <span className="font-medium">{article.lastInspectedAt ? timeAgo(article.lastInspectedAt) : "Never"}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Coverage:</span>{" "}
                          <span className="font-medium">{article.coverageState || "Unknown"}</span>
                        </div>
                      </div>

                      {/* Channels */}
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-gray-500">Channels:</span>
                        <Badge variant={article.submittedIndexnow ? "default" : "outline"} className="text-[10px]">
                          {article.submittedIndexnow ? "IndexNow sent" : "IndexNow pending"}
                        </Badge>
                        <Badge variant={article.submittedSitemap ? "default" : "outline"} className="text-[10px]">
                          {article.submittedSitemap ? "Sitemap sent" : "Sitemap pending"}
                        </Badge>
                      </div>

                      {/* Reasons / Diagnostics */}
                      {article.notIndexedReasons.length > 0 && (
                        <div className="bg-white rounded-lg border p-3 space-y-2">
                          <div className="text-xs font-semibold text-gray-700">
                            {article.indexingStatus === "indexed" ? "Notes" : "Why not indexed yet?"}
                          </div>
                          {article.notIndexedReasons.map((reason, i) => (
                            <div key={i} className="text-xs text-gray-600 flex items-start gap-2">
                              <AlertCircle className="h-3 w-3 text-amber-500 flex-shrink-0 mt-0.5" />
                              {reason}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          size="sm" variant="outline" className="text-xs h-7"
                          disabled={submittingSlug === article.slug}
                          onClick={() => onSubmitSingle(article.slug)}
                        >
                          {submittingSlug === article.slug ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                          {article.submissionAttempts > 0 ? "Resubmit" : "Submit"}
                        </Button>
                        <a
                          href={`${data.baseUrl}/blog/${article.slug}`}
                          target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline px-2"
                        >
                          <ExternalLink className="h-3 w-3" /> View page
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* ── 6. Compliance Audit Report ── */}
      {auditResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-5 w-5 text-purple-500" />
              Indexing Audit Report
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold">{auditResult.totalPosts}</div>
                <div className="text-[10px] text-gray-500">Total Pages</div>
              </div>
              <div className="bg-emerald-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-emerald-600">{auditResult.passing}</div>
                <div className="text-[10px] text-gray-500">Passing</div>
              </div>
              <div className="bg-red-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-red-600">{auditResult.failing}</div>
                <div className="text-[10px] text-gray-500">Failing</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-blue-600">{auditResult.averageScore}</div>
                <div className="text-[10px] text-gray-500">Avg Score</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-purple-600">{auditResult.totalAutoFixes}</div>
                <div className="text-[10px] text-gray-500">Auto-Fixed</div>
              </div>
            </div>

            {/* Per-page results */}
            {auditResult.posts && auditResult.posts.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-700">Per-Page Results</h4>
                {auditResult.posts.map((p, i) => (
                  <div key={i} className={`rounded-lg border p-3 ${p.score >= 60 ? "bg-white" : "bg-red-50 border-red-200"}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        {p.score >= 60 ? <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" /> : <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />}
                        <span className="text-sm font-medium truncate">/blog/{p.slug}</span>
                      </div>
                      <span className={`text-sm font-bold flex-shrink-0 ${getScoreColor(p.score)}`}>{p.score}/100</span>
                    </div>
                    {p.issues.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {p.issues.map((issue, j) => (
                          <div key={j} className="text-xs text-gray-600 flex items-start gap-1.5">
                            <AlertCircle className="h-3 w-3 text-amber-500 flex-shrink-0 mt-0.5" />
                            {issue}
                          </div>
                        ))}
                      </div>
                    )}
                    {p.fixes.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {p.fixes.map((fix, j) => (
                          <div key={j} className="text-xs text-emerald-600 flex items-start gap-1.5">
                            <CheckCircle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                            {fix}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── 7. System Issues & Diagnostics ── */}
      {systemIssues.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                System Issues & Diagnostics ({systemIssues.length})
              </span>
              {systemIssues.length > 3 && (
                <button onClick={() => setShowAllIssues(!showAllIssues)} className="text-xs text-blue-600 hover:underline">
                  {showAllIssues ? "Show less" : "Show all"}
                </button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(showAllIssues ? systemIssues : systemIssues.slice(0, 3)).map((issue, i) => {
              const sevColors = {
                critical: { bg: "bg-red-50", border: "border-red-200", badge: "bg-red-500" },
                warning: { bg: "bg-amber-50", border: "border-amber-200", badge: "bg-amber-500" },
                info: { bg: "bg-blue-50", border: "border-blue-200", badge: "bg-blue-500" },
              };
              const sc = sevColors[issue.severity];
              return (
                <div key={i} className={`rounded-lg border ${sc.border} ${sc.bg} p-3`}>
                  <div className="flex items-start gap-2">
                    <Badge className={`${sc.badge} text-[10px] flex-shrink-0`}>{issue.severity}</Badge>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{issue.message}</div>
                      <div className="text-xs text-gray-600 mt-0.5">{issue.detail}</div>
                      {issue.fixAction && (
                        <div className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                          <Zap className="h-3 w-3" /> Fix: {issue.fixAction}
                        </div>
                      )}
                    </div>
                    <Badge variant="outline" className="text-[10px] flex-shrink-0 ml-auto">{issue.category}</Badge>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* ── 8. Recent Indexing Activity ── */}
      {recentActivity.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-500" />
                Recent Indexing Activity ({recentActivity.length})
              </span>
              {recentActivity.length > 5 && (
                <button onClick={() => setShowAllActivity(!showAllActivity)} className="text-xs text-blue-600 hover:underline">
                  {showAllActivity ? "Show less" : "Show all"}
                </button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {(showAllActivity ? recentActivity : recentActivity.slice(0, 5)).map((log, i) => {
                const isOk = log.status === "completed";
                return (
                  <div key={i} className="flex items-center gap-2.5 py-1.5 border-b last:border-0">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isOk ? "bg-emerald-500" : "bg-red-500"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-gray-900 truncate">{log.jobName}</div>
                      {log.errorMessage && <div className="text-[10px] text-red-500 truncate">{log.errorMessage}</div>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 text-[10px] text-gray-500">
                      {log.itemsProcessed > 0 && <span>{log.itemsSucceeded}/{log.itemsProcessed} items</span>}
                      {log.durationMs > 0 && <span>{(log.durationMs / 1000).toFixed(1)}s</span>}
                      <span>{timeAgo(log.startedAt)}</span>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${
                      isOk ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                    }`}>
                      {log.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── 9. Submission History Timeline ── */}
      {stats?.timeline && stats.timeline.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-gray-500" />
                Submission History
              </span>
              {stats.timeline.length > 5 && (
                <button onClick={() => setShowAllTimeline(!showAllTimeline)} className="text-xs text-blue-600 hover:underline">
                  {showAllTimeline ? "Show less" : "Show all"}
                </button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(showAllTimeline ? stats.timeline : stats.timeline.slice(0, 5)).map((entry, i) => (
                <div key={i} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div className="flex items-center gap-2.5">
                    {entry.googleStatus === "success" ? (
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    )}
                    <div>
                      <div className="text-sm font-medium">
                        {entry.mode === "submit-all" ? "Bulk Submit All" : entry.mode === "new" ? "Submit New" : "Submit Updated"}
                      </div>
                      <div className="text-[10px] text-gray-500">{new Date(entry.date).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <div className="text-right">
                      <span className="font-medium">{entry.googleSubmitted}</span>
                      <span className="text-gray-500 ml-1">Google</span>
                    </div>
                    <div className="text-right">
                      <span className="font-medium">{entry.indexNowSubmitted}</span>
                      <span className="text-gray-500 ml-1">IndexNow</span>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{entry.totalPages} pages</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── 10. Latest Submission Result ── */}
      {stats?.latestSubmissionResult && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-5 w-5 text-yellow-500" />
              Latest Submission Result
              {stats.lastSubmission && (
                <span className="text-xs font-normal text-gray-500 ml-2">
                  {timeAgo(stats.lastSubmission)}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Google (Sitemap)</span>
                  <Badge className={stats.latestSubmissionResult.googleApi.status === "success" ? "bg-emerald-500" : "bg-amber-500"}>
                    {stats.latestSubmissionResult.googleApi.status}
                  </Badge>
                </div>
                <div className="text-xl font-bold">{stats.latestSubmissionResult.googleApi.submitted} submitted</div>
                {stats.latestSubmissionResult.googleApi.failed > 0 && (
                  <div className="text-xs text-red-600">{stats.latestSubmissionResult.googleApi.failed} failed</div>
                )}
              </div>
              <div className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">IndexNow (Bing/Yandex)</span>
                  <Badge className={stats.latestSubmissionResult.indexNow.status === "success" ? "bg-emerald-500" : "bg-amber-500"}>
                    {stats.latestSubmissionResult.indexNow.status}
                  </Badge>
                </div>
                <div className="text-xl font-bold">{stats.latestSubmissionResult.indexNow.submitted} submitted</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Empty state ── */}
      {summary.total === 0 && !auditResult && recentActivity.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Published Articles Yet</h3>
            <p className="text-gray-600 mb-4">The content pipeline needs to produce and publish articles before they can be indexed.</p>
            <div className="flex justify-center gap-3">
              <Button onClick={onRunAudit} disabled={isSubmitting} variant="outline">
                <Search className="h-4 w-4 mr-2" /> Check Index Status
              </Button>
              <Button onClick={onSubmitAll} disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700">
                <Zap className="h-4 w-4 mr-2" /> Submit All Pages
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
