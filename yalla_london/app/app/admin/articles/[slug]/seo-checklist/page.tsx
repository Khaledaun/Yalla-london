"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

// ── Types ──────────────────────────────────────────────────────────

interface GateCheck {
  name: string;
  passed: boolean;
  message: string;
  severity: "blocker" | "warning" | "info";
}

interface ComplianceData {
  article: {
    id: string;
    title: string;
    slug: string;
    url: string;
    seoScore: number | null;
    wordCount: number;
    published: boolean;
    createdAt: string | null;
    updatedAt: string | null;
    hasFeaturedImage: boolean;
    hasArabicContent: boolean;
  };
  compliance: {
    percent: number;
    totalChecks: number;
    passedChecks: number;
    blockerCount: number;
    warningCount: number;
    allowed: boolean;
    checks: GateCheck[];
    blockers: string[];
    warnings: string[];
  };
  standards: {
    version: string;
    qualityGateScore: number;
    minWords: number;
    targetWords: number;
    authenticityUpdateActive: boolean;
    experienceIsDominant: boolean;
  };
  gsc: {
    impressions: number;
    clicks: number;
    ctr: number;
    position: number;
    topQueries: Array<{
      query: string;
      impressions: number;
      clicks: number;
      ctr: number;
      position: number;
    }>;
  } | null;
  indexing: {
    state: string;
    lastCrawled: string | null;
    coverageState: string | null;
    verdict: string | null;
    issues: string[];
  };
  lastAudit: {
    score: number;
    auditedAt: string;
  } | null;
}

// ── Component ──────────────────────────────────────────────────────

export default function SEOChecklistPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [data, setData] = useState<ComplianceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fixing, setFixing] = useState(false);

  const runAudit = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/seo/article-compliance?slug=${encodeURIComponent(slug)}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to fetch" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    runAudit();
  }, [runAudit]);

  const handleAutoFix = async () => {
    if (!data?.article.id) return;
    setFixing(true);
    try {
      const res = await fetch("/api/admin/seo/article-compliance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "auto_fix", articleId: data.article.id }),
      });
      const result = await res.json();
      if (result.success) {
        // Re-run audit to see updated results
        await runAudit();
      }
    } finally {
      setFixing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3" />
            <div className="h-4 bg-gray-200 rounded w-2/3" />
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-gray-200 rounded-lg" />
              ))}
            </div>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-gray-200 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-800 text-lg font-medium">Audit Failed</p>
            <p className="text-red-600 mt-2">{error}</p>
            <button
              onClick={runAudit}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { article, compliance, standards, gsc, indexing, lastAudit } = data;

  const complianceColor =
    compliance.percent >= 90
      ? "text-green-600"
      : compliance.percent >= 70
        ? "text-yellow-600"
        : "text-red-600";

  const complianceBg =
    compliance.percent >= 90
      ? "bg-green-50 border-green-200"
      : compliance.percent >= 70
        ? "bg-yellow-50 border-yellow-200"
        : "bg-red-50 border-red-200";

  const indexingColor: Record<string, string> = {
    INDEXED: "bg-green-100 text-green-800",
    submitted: "bg-blue-100 text-blue-800",
    discovered: "bg-blue-100 text-blue-800",
    NOT_INDEXED: "bg-red-100 text-red-800",
    unknown: "bg-gray-100 text-gray-800",
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <button
              onClick={() => router.back()}
              className="text-sm text-gray-500 hover:text-gray-700 mb-2 flex items-center gap-1"
            >
              &larr; Back to Articles
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              SEO Compliance Checklist
            </h1>
            <p className="text-gray-600 mt-1 text-sm break-all">
              {article.title}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Standards v{standards.version} &middot; {compliance.totalChecks} checks
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={runAudit}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
            >
              Re-audit
            </button>
            <button
              onClick={handleAutoFix}
              disabled={fixing}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50"
            >
              {fixing ? "Fixing..." : "Auto-Fix"}
            </button>
            <Link
              href={article.url}
              target="_blank"
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
            >
              View Page
            </Link>
          </div>
        </div>

        {/* Compliance Score Banner */}
        <div className={`rounded-xl border p-6 ${complianceBg}`}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className={`text-4xl font-bold ${complianceColor}`}>
                {compliance.percent}%
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {compliance.passedChecks}/{compliance.totalChecks} checks passed
              </p>
            </div>
            <div className="flex gap-6 text-center">
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {compliance.blockerCount}
                </p>
                <p className="text-xs text-gray-500">Blockers</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">
                  {compliance.warningCount}
                </p>
                <p className="text-xs text-gray-500">Warnings</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-700">
                  {article.seoScore ?? "N/A"}
                </p>
                <p className="text-xs text-gray-500">SEO Score</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-700">
                  {article.wordCount.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">Words</p>
              </div>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-4 h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                compliance.percent >= 90
                  ? "bg-green-500"
                  : compliance.percent >= 70
                    ? "bg-yellow-500"
                    : "bg-red-500"
              }`}
              style={{ width: `${compliance.percent}%` }}
            />
          </div>
        </div>

        {/* KPI Cards Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* GSC Impressions */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              Impressions
            </p>
            <p className="text-2xl font-bold mt-1">
              {gsc ? gsc.impressions.toLocaleString() : "N/A"}
            </p>
            <p className="text-xs text-gray-400">Last 28 days (GSC)</p>
          </div>
          {/* GSC Clicks */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              Clicks
            </p>
            <p className="text-2xl font-bold mt-1">
              {gsc ? gsc.clicks.toLocaleString() : "N/A"}
            </p>
            <p className="text-xs text-gray-400">Last 28 days (GSC)</p>
          </div>
          {/* GSC CTR */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              CTR
            </p>
            <p className="text-2xl font-bold mt-1">
              {gsc ? `${gsc.ctr}%` : "N/A"}
            </p>
            <p className="text-xs text-gray-400">Click-through rate</p>
          </div>
          {/* GSC Position */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              Avg Position
            </p>
            <p className="text-2xl font-bold mt-1">
              {gsc ? gsc.position.toFixed(1) : "N/A"}
            </p>
            <p className="text-xs text-gray-400">Search position</p>
          </div>
        </div>

        {/* Indexing Status */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Indexing Status
          </h2>
          <div className="flex items-center gap-3 flex-wrap">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                indexingColor[indexing.state] || indexingColor.unknown
              }`}
            >
              {indexing.state}
            </span>
            {indexing.lastCrawled && (
              <span className="text-sm text-gray-500">
                Last crawled: {new Date(indexing.lastCrawled).toLocaleDateString()}
              </span>
            )}
            {indexing.coverageState && (
              <span className="text-sm text-gray-500">
                Coverage: {indexing.coverageState}
              </span>
            )}
          </div>
          {indexing.issues.length > 0 && (
            <div className="mt-3 space-y-1">
              {indexing.issues.map((issue, i) => (
                <p key={i} className="text-sm text-red-600">
                  {issue}
                </p>
              ))}
            </div>
          )}
          {!gsc && (
            <p className="mt-3 text-sm text-amber-600">
              GSC credentials not configured &mdash; connect Google Search Console
              to see real-time indexing data and search performance.
            </p>
          )}
        </div>

        {/* The 13-Check Compliance Checklist */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Compliance Checks ({compliance.passedChecks}/{compliance.totalChecks})
          </h2>
          <div className="space-y-2">
            {compliance.checks.map((check, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 p-3 rounded-lg border ${
                  check.passed
                    ? "bg-green-50 border-green-100"
                    : check.severity === "blocker"
                      ? "bg-red-50 border-red-200"
                      : "bg-yellow-50 border-yellow-100"
                }`}
              >
                <span className="text-lg mt-0.5 flex-shrink-0">
                  {check.passed ? (
                    <span className="text-green-600">&#10003;</span>
                  ) : check.severity === "blocker" ? (
                    <span className="text-red-600">&#10007;</span>
                  ) : (
                    <span className="text-yellow-600">&#9888;</span>
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-gray-900 text-sm">
                      {check.name}
                    </p>
                    {!check.passed && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          check.severity === "blocker"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {check.severity}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5">
                    {check.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Search Queries */}
        {gsc && gsc.topQueries.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Top Search Queries (GSC)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 font-medium">Query</th>
                    <th className="pb-2 font-medium text-right">Impressions</th>
                    <th className="pb-2 font-medium text-right">Clicks</th>
                    <th className="pb-2 font-medium text-right">CTR</th>
                    <th className="pb-2 font-medium text-right">Position</th>
                  </tr>
                </thead>
                <tbody>
                  {gsc.topQueries.map((q, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-2 text-gray-900">{q.query}</td>
                      <td className="py-2 text-right text-gray-600">
                        {q.impressions.toLocaleString()}
                      </td>
                      <td className="py-2 text-right text-gray-600">
                        {q.clicks.toLocaleString()}
                      </td>
                      <td className="py-2 text-right text-gray-600">
                        {q.ctr}%
                      </td>
                      <td className="py-2 text-right text-gray-600">
                        {q.position.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Standards Info */}
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 text-sm text-gray-600">
          <p>
            <strong>Standards:</strong> v{standards.version} &middot;
            Quality gate: {standards.qualityGateScore}/100 &middot;
            Min words: {standards.minWords.toLocaleString()} &middot;
            Target: {standards.targetWords.toLocaleString()} &middot;
            {standards.authenticityUpdateActive && " Jan 2026 Authenticity Update active "}
            {standards.experienceIsDominant && " (Experience is #1 E-E-A-T signal)"}
          </p>
          {lastAudit && (
            <p className="mt-1">
              <strong>Last audit:</strong>{" "}
              {new Date(lastAudit.auditedAt).toLocaleString()} &mdash; Score:{" "}
              {lastAudit.score}%
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
