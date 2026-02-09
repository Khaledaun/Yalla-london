"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  TrendingUp,
  Link,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  Globe,
  BarChart3,
  Zap,
  Download,
  RefreshCw,
  ExternalLink,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

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

interface IndexingReport {
  id: string;
  type: string;
  date: string;
  data: {
    mode: string;
    totalPages: number;
    inspected: number;
    indexed: number;
    notIndexed: number;
    indexedPages?: string[];
    notIndexedPages?: { url: string; label: string; reason: string }[];
    submission?: {
      indexNow: { submitted: number; status: string };
      googleApi: { submitted: number; failed: number; errors: string[]; status: string };
    };
    errors?: string[];
    elapsed: string;
  };
}

export default function SEOCommandCenter() {
  const [isLoading, setIsLoading] = useState(true);
  const [seoHealth, setSeoHealth] = useState<SEOHealth>({
    overallScore: 0,
    autoPublishRate: 0,
    reviewQueue: 0,
    criticalIssues: 0,
    lastChecked: new Date().toISOString(),
  });

  const [articleSEO, setArticleSEO] = useState<ArticleSEO[]>([]);
  const [crawlResults, setCrawlResults] = useState<CrawlResult[]>([]);
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlProgress, setCrawlProgress] = useState(0);
  const [indexingStats, setIndexingStats] = useState<IndexingStats | null>(null);
  const [indexingHistory, setIndexingHistory] = useState<IndexingReport[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadSEOData();
  }, []);

  const loadSEOData = async () => {
    setIsLoading(true);
    try {
      // Fetch SEO overview from real API
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
    } catch (error) {
      console.error("Failed to load SEO overview:", error);
    }

    try {
      // Fetch article SEO data from real content API
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
              id: p.id,
              title: p.title_en || p.title_ar || "Untitled",
              url: `/blog/${p.slug}`,
              seoScore: p.seo_score || 0,
              keywords: p.tags || [],
              issues,
              lastAudit: p.updated_at
                ? new Date(p.updated_at).toLocaleDateString()
                : "Never",
            };
          }),
        );
      }
    } catch (error) {
      console.error("Failed to load article SEO data:", error);
    }

    // Fetch indexing stats and history
    try {
      const [statsRes, historyRes] = await Promise.all([
        fetch("/api/admin/seo/indexing?type=stats"),
        fetch("/api/admin/seo/indexing?type=history&limit=10"),
      ]);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setIndexingStats(statsData.stats || null);
      }
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setIndexingHistory(historyData.reports || []);
      }
    } catch (error) {
      console.error("Failed to load indexing data:", error);
    }

    setIsLoading(false);
  };

  const submitAllForIndexing = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/seo/check-and-index?submit_all=true");
      if (res.ok) {
        const data = await res.json();
        toast.success(
          `Submitted ${data.submission?.googleApi?.submitted || 0} pages to Google Indexing API`,
        );
        // Reload data to show new submission in history
        loadSEOData();
      } else {
        toast.error("Indexing submission failed");
      }
    } catch (error) {
      toast.error("Failed to submit for indexing");
    } finally {
      setIsSubmitting(false);
    }
  };

  const runIndexingAudit = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/seo/check-and-index?limit=8");
      if (res.ok) {
        const data = await res.json();
        toast.success(
          `Inspected ${data.summary?.inspected || 0} pages: ${data.summary?.indexed || 0} indexed, ${data.summary?.notIndexed || 0} not indexed`,
        );
        loadSEOData();
      } else {
        toast.error("Indexing audit failed");
      }
    } catch (error) {
      toast.error("Failed to run indexing audit");
    } finally {
      setIsSubmitting(false);
    }
  };

  const startCrawl = async () => {
    setIsCrawling(true);
    setCrawlProgress(0);

    try {
      // Call real SEO crawler API
      const res = await fetch("/api/admin/seo/crawler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "crawl" }),
      });

      if (res.ok) {
        const data = await res.json();
        setCrawlProgress(100);
        if (data.results) {
          setCrawlResults(
            data.results.map((r: any) => ({
              url: r.url,
              status:
                r.score >= 80 ? "success" : r.score >= 50 ? "warning" : "error",
              issues: r.issues || [],
              score: r.score || 0,
              lastCrawled: new Date().toISOString(),
            })),
          );
        }
        toast.success("SEO crawl completed!");
      } else {
        // Fallback: generate crawl results from quick-fixes
        const qfRes = await fetch("/api/admin/seo?type=quick-fixes");
        if (qfRes.ok) {
          const qfData = await qfRes.json();
          const fixes = qfData.quickFixes || [];
          setCrawlResults(
            fixes.map((f: any) => ({
              url: `/blog/${f.slug}`,
              status: f.fixes.length > 0 ? "warning" : "success",
              issues: f.fixes.map((fix: string) => fix.replace(/_/g, " ")),
              score: Math.max(0, 100 - f.fixes.length * 15),
              lastCrawled: new Date().toISOString(),
            })),
          );
        }
        setCrawlProgress(100);
        toast.success("SEO analysis completed!");
      }
    } catch (error) {
      toast.error("SEO crawl failed");
    } finally {
      setIsCrawling(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return <Badge className="bg-green-500">Excellent</Badge>;
    if (score >= 70) return <Badge className="bg-yellow-500">Good</Badge>;
    return <Badge className="bg-red-500">Needs Work</Badge>;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "error":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900">
            Loading SEO Data...
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Search className="h-8 w-8 text-yellow-500" />
                SEO Command Center
              </h1>
              <p className="text-gray-600 mt-1">
                Monitor SEO health, article scores, and optimization
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={startCrawl}
                disabled={isCrawling}
                className="bg-yellow-500 hover:bg-yellow-600"
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${isCrawling ? "animate-spin" : ""}`}
                />
                {isCrawling ? "Analyzing..." : "Run SEO Analysis"}
              </Button>
              <Button variant="outline" onClick={loadSEOData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* SEO Health Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100 text-sm">Avg SEO Score</p>
                  <p className="text-3xl font-bold">
                    {seoHealth.overallScore}/100
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-yellow-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Auto-Publish Rate</p>
                  <p className="text-3xl font-bold">
                    {seoHealth.autoPublishRate}%
                  </p>
                </div>
                <Zap className="h-8 w-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Review Queue</p>
                  <p className="text-3xl font-bold">{seoHealth.reviewQueue}</p>
                </div>
                <Globe className="h-8 w-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Critical Issues</p>
                  <p className="text-3xl font-bold">
                    {seoHealth.criticalIssues}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="indexing">Indexing Monitor</TabsTrigger>
            <TabsTrigger value="articles">Article SEO</TabsTrigger>
            <TabsTrigger value="crawl">Analysis Results</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-yellow-500" />
                    SEO Health Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Average SEO Score</span>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={seoHealth.overallScore}
                        className="w-20"
                      />
                      <span className={getScoreColor(seoHealth.overallScore)}>
                        {seoHealth.overallScore}/100
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Auto-Publish Rate</span>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={seoHealth.autoPublishRate}
                        className="w-20"
                      />
                      <span
                        className={getScoreColor(seoHealth.autoPublishRate)}
                      >
                        {seoHealth.autoPublishRate}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Articles in Review Queue</span>
                    <span className="font-bold">{seoHealth.reviewQueue}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Critical Issues</span>
                    <span
                      className={`font-bold ${seoHealth.criticalIssues > 0 ? "text-red-600" : "text-green-600"}`}
                    >
                      {seoHealth.criticalIssues}
                    </span>
                  </div>
                  <div className="pt-4 border-t">
                    <p className="text-sm text-gray-600">
                      Last checked:{" "}
                      {new Date(seoHealth.lastChecked).toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-yellow-500" />
                    Article Score Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Total Articles</span>
                      <span className="font-bold text-2xl">
                        {articleSEO.length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Score 90+</span>
                      <span className="font-bold text-green-600">
                        {articleSEO.filter((a) => a.seoScore >= 90).length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Score 70-89</span>
                      <span className="font-bold text-yellow-600">
                        {
                          articleSEO.filter(
                            (a) => a.seoScore >= 70 && a.seoScore < 90,
                          ).length
                        }
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Score &lt; 70</span>
                      <span className="font-bold text-red-600">
                        {articleSEO.filter((a) => a.seoScore < 70).length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>With Issues</span>
                      <span className="font-bold text-orange-600">
                        {articleSEO.filter((a) => a.issues.length > 0).length}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Indexing Monitor Tab */}
          <TabsContent value="indexing" className="space-y-6">
            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={submitAllForIndexing}
                disabled={isSubmitting}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                Submit All Pages
              </Button>
              <Button
                onClick={runIndexingAudit}
                disabled={isSubmitting}
                variant="outline"
              >
                {isSubmitting ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Check Index Status
              </Button>
            </div>

            {/* Current Status Cards */}
            {indexingStats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-gray-500">Total Pages</div>
                    <div className="text-2xl font-bold">
                      {indexingStats.latestSnapshot?.totalPages || "—"}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-gray-500">Confirmed Indexed</div>
                    <div className="text-2xl font-bold text-green-600">
                      {indexingStats.latestSnapshot?.indexed ?? "—"}
                    </div>
                    {indexingStats.latestSnapshot && (
                      <div className="text-xs text-gray-400">
                        of {indexingStats.latestSnapshot.inspected} inspected
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-gray-500">Not Indexed</div>
                    <div className="text-2xl font-bold text-red-600">
                      {indexingStats.latestSnapshot?.notIndexed ?? "—"}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-gray-500">Total Submitted</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {indexingStats.totalGoogleSubmitted}
                    </div>
                    <div className="text-xs text-gray-400">
                      via Google Indexing API
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Latest Submission Result */}
            {indexingStats?.latestSubmissionResult && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Zap className="h-5 w-5 text-yellow-500" />
                    Latest Submission
                    {indexingStats.lastSubmission && (
                      <span className="text-sm font-normal text-gray-500 ml-2">
                        {new Date(indexingStats.lastSubmission).toLocaleString()}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Google Indexing API</span>
                        <Badge
                          className={
                            indexingStats.latestSubmissionResult.googleApi.status === "success"
                              ? "bg-green-500"
                              : "bg-red-500"
                          }
                        >
                          {indexingStats.latestSubmissionResult.googleApi.status}
                        </Badge>
                      </div>
                      <div className="text-2xl font-bold">
                        {indexingStats.latestSubmissionResult.googleApi.submitted} submitted
                      </div>
                      {indexingStats.latestSubmissionResult.googleApi.failed > 0 && (
                        <div className="text-sm text-red-600">
                          {indexingStats.latestSubmissionResult.googleApi.failed} failed
                        </div>
                      )}
                    </div>
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">IndexNow (Bing/Yandex)</span>
                        <Badge
                          className={
                            indexingStats.latestSubmissionResult.indexNow.status === "success"
                              ? "bg-green-500"
                              : "bg-yellow-500"
                          }
                        >
                          {indexingStats.latestSubmissionResult.indexNow.status}
                        </Badge>
                      </div>
                      <div className="text-2xl font-bold">
                        {indexingStats.latestSubmissionResult.indexNow.submitted} submitted
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Submission Timeline */}
            {indexingStats?.timeline && indexingStats.timeline.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Clock className="h-5 w-5 text-yellow-500" />
                    Submission History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {indexingStats.timeline.map((entry, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between border-b pb-3 last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          {entry.googleStatus === "success" ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          )}
                          <div>
                            <div className="font-medium text-sm">
                              {entry.mode === "submit-all"
                                ? "Bulk Submit All"
                                : "Submit Unindexed"}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(entry.date).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="text-right">
                            <span className="font-medium">{entry.googleSubmitted}</span>
                            <span className="text-gray-500 ml-1">Google</span>
                          </div>
                          <div className="text-right">
                            <span className="font-medium">{entry.indexNowSubmitted}</span>
                            <span className="text-gray-500 ml-1">IndexNow</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {entry.totalPages} pages
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Detailed Reports */}
            {indexingHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5 text-yellow-500" />
                    Detailed Reports
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {indexingHistory.map((report) => (
                      <div key={report.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Badge
                              className={
                                report.type === "indexing_submission"
                                  ? "bg-blue-500"
                                  : "bg-gray-500"
                              }
                            >
                              {report.type === "indexing_submission"
                                ? "Submission"
                                : "Audit"}
                            </Badge>
                            <span className="text-sm text-gray-600">
                              {new Date(report.date).toLocaleString()}
                            </span>
                          </div>
                          <span className="text-sm text-gray-400">
                            {report.data.elapsed}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <span className="text-gray-500">Total Pages:</span>{" "}
                            <span className="font-medium">{report.data.totalPages}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Inspected:</span>{" "}
                            <span className="font-medium">{report.data.inspected}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Indexed:</span>{" "}
                            <span className="font-medium text-green-600">
                              {report.data.indexed}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Not Indexed:</span>{" "}
                            <span className="font-medium text-red-600">
                              {report.data.notIndexed}
                            </span>
                          </div>
                        </div>

                        {report.data.submission && (
                          <div className="mt-3 pt-3 border-t flex gap-4 text-sm">
                            <div>
                              Google:{" "}
                              <span className="font-medium">
                                {report.data.submission.googleApi.submitted} submitted
                              </span>
                              {report.data.submission.googleApi.status !== "success" &&
                                report.data.submission.googleApi.status !== "skipped" && (
                                  <Badge variant="destructive" className="ml-2 text-xs">
                                    {report.data.submission.googleApi.status}
                                  </Badge>
                                )}
                            </div>
                            <div>
                              IndexNow:{" "}
                              <span className="font-medium">
                                {report.data.submission.indexNow.submitted} submitted
                              </span>
                            </div>
                          </div>
                        )}

                        {report.data.notIndexedPages &&
                          report.data.notIndexedPages.length > 0 && (
                            <div className="mt-3 pt-3 border-t">
                              <div className="text-sm text-red-600 mb-2">
                                Not indexed URLs:
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {report.data.notIndexedPages.map((p: any, i: number) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {p.label || p.url}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                        {report.data.errors && report.data.errors.length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="text-sm text-yellow-600 mb-1">
                              Errors:
                            </div>
                            {report.data.errors.slice(0, 3).map((err: string, i: number) => (
                              <div key={i} className="text-xs text-gray-500">
                                {err}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Empty State */}
            {!indexingStats && indexingHistory.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No Indexing Data Yet
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Run an indexing audit or submit your pages to start tracking.
                  </p>
                  <div className="flex justify-center gap-3">
                    <Button
                      onClick={runIndexingAudit}
                      disabled={isSubmitting}
                      variant="outline"
                    >
                      <Search className="h-4 w-4 mr-2" />
                      Check Index Status
                    </Button>
                    <Button
                      onClick={submitAllForIndexing}
                      disabled={isSubmitting}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Submit All Pages
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Article SEO Tab */}
          <TabsContent value="articles" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-yellow-500" />
                  Article SEO Scores
                </CardTitle>
              </CardHeader>
              <CardContent>
                {articleSEO.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No Articles Yet
                    </h3>
                    <p className="text-gray-600">
                      Create articles to see their SEO scores here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {articleSEO.map((article) => (
                      <div key={article.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-2">
                              {article.title}
                            </h3>
                            <div className="text-sm text-gray-600 mb-2">
                              URL: {article.url}
                            </div>
                            {article.keywords.length > 0 && (
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <span className="text-sm">Tags:</span>
                                {article.keywords.slice(0, 5).map((keyword) => (
                                  <Badge
                                    key={keyword}
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {keyword}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            {article.issues.length > 0 && (
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm text-red-600">
                                  Issues:
                                </span>
                                {article.issues.map((issue) => (
                                  <Badge
                                    key={issue}
                                    variant="destructive"
                                    className="text-xs"
                                  >
                                    {issue}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <div className="text-right">
                              <div
                                className={`text-2xl font-bold ${getScoreColor(article.seoScore)}`}
                              >
                                {article.seoScore}/100
                              </div>
                              {getScoreBadge(article.seoScore)}
                            </div>
                            <div className="text-xs text-gray-500">
                              Updated: {article.lastAudit}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Crawl Results Tab */}
          <TabsContent value="crawl" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-yellow-500" />
                  SEO Analysis Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isCrawling ? (
                  <div className="space-y-4">
                    <div className="text-center">
                      <RefreshCw className="h-8 w-8 animate-spin text-yellow-500 mx-auto mb-4" />
                      <p className="text-gray-600">Analyzing your website...</p>
                      <Progress value={crawlProgress} className="mt-4" />
                      <p className="text-sm text-gray-500 mt-2">
                        {crawlProgress}% complete
                      </p>
                    </div>
                  </div>
                ) : crawlResults.length > 0 ? (
                  <div className="space-y-4">
                    {crawlResults.map((result, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(result.status)}
                            <div>
                              <div className="font-medium">{result.url}</div>
                              <div className="text-sm text-gray-600">
                                Analyzed:{" "}
                                {new Date(result.lastCrawled).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-lg font-bold ${getScoreColor(result.score)}`}
                            >
                              {result.score}/100
                            </span>
                            {getScoreBadge(result.score)}
                          </div>
                        </div>
                        {result.issues.length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="text-sm text-red-600 mb-2">
                              Issues found:
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {result.issues.map((issue, issueIndex) => (
                                <Badge
                                  key={issueIndex}
                                  variant="destructive"
                                  className="text-xs"
                                >
                                  {issue}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No Analysis Results
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Run an SEO analysis to check your website
                    </p>
                    <Button
                      onClick={startCrawl}
                      className="bg-yellow-500 hover:bg-yellow-600"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Run SEO Analysis
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
