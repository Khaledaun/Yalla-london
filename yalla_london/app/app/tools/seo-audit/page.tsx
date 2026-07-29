"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";

/* ------------------------------------------------------------------ */
/*  Public SEO Audit Tool — Lead Generation Asset                      */
/*  No auth required. Calls /api/tools/seo-audit                       */
/* ------------------------------------------------------------------ */

// ── Types ───────────────────────────────────────────────────────────

interface AuditIssue {
  severity: "critical" | "warning" | "info";
  category: "technical" | "content" | "performance" | "links";
  title: string;
  description: string;
  recommendation: string;
}

interface AuditResult {
  url: string;
  scores: {
    overall: number;
    technical: number;
    content: number;
    performance: number;
    links: number;
  };
  grade: string;
  issues: AuditIssue[];
  meta: {
    title: string | null;
    description: string | null;
    canonical: string | null;
    ogTitle: string | null;
    ogDescription: string | null;
    ogImage: string | null;
    robots: string | null;
    viewport: string | null;
    charset: string | null;
    language: string | null;
  };
  stats: {
    wordCount: number;
    headingCount: { h1: number; h2: number; h3: number };
    imageCount: number;
    imagesWithoutAlt: number;
    internalLinks: number;
    externalLinks: number;
    schemaTypes: string[];
    loadTimeMs: number;
    htmlSizeKb: number;
  };
  timestamp: string;
}

// ── Grade colors ────────────────────────────────────────────────────

const GRADE_COLORS: Record<string, string> = {
  A: "#2D5A3D",
  B: "#3B7EA1",
  C: "#C49A2A",
  D: "#d97706",
  F: "#C8322B",
};

function getGradeColor(grade: string): string {
  return GRADE_COLORS[grade] || GRADE_COLORS.F;
}

function getScoreGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

// ── Animated circular score ring ────────────────────────────────────

function ScoreRing({
  score,
  grade,
  size = 200,
  strokeWidth = 12,
}: {
  score: number;
  grade: string;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const [offset, setOffset] = useState(circumference);
  const color = getGradeColor(grade);

  useEffect(() => {
    // Animate after mount
    const timer = setTimeout(() => {
      setOffset(circumference - (score / 100) * circumference);
    }, 100);
    return () => clearTimeout(timer);
  }, [score, circumference]);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e1d8"
          strokeWidth={strokeWidth}
        />
        {/* Score arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.2s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-bold" style={{ color }}>
          {score}
        </span>
        <span
          className="text-lg font-semibold tracking-wider mt-1"
          style={{ color }}
        >
          Grade {grade}
        </span>
      </div>
    </div>
  );
}

// ── Sub-score progress bar ──────────────────────────────────────────

function SubScoreBar({
  label,
  score,
  icon,
}: {
  label: string;
  score: number;
  icon: string;
}) {
  const grade = getScoreGrade(score);
  const color = getGradeColor(grade);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setWidth(score), 200);
    return () => clearTimeout(timer);
  }, [score]);

  return (
    <div className="flex items-center gap-4">
      <span className="text-xl w-7 text-center flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-medium text-[#3d3929]">{label}</span>
          <span className="text-sm font-bold" style={{ color }}>
            {score}/100
          </span>
        </div>
        <div className="h-2.5 rounded-full bg-[#e5e1d8] overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${width}%`,
              backgroundColor: color,
              transition: "width 1s ease-out",
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Severity badge ──────────────────────────────────────────────────

const SEVERITY_STYLES: Record<
  string,
  { bg: string; text: string; border: string; label: string }
> = {
  critical: {
    bg: "bg-red-50",
    text: "text-[#C8322B]",
    border: "border-[#C8322B]/20",
    label: "Critical",
  },
  warning: {
    bg: "bg-amber-50",
    text: "text-[#d97706]",
    border: "border-[#d97706]/20",
    label: "Warning",
  },
  info: {
    bg: "bg-blue-50",
    text: "text-[#3B7EA1]",
    border: "border-[#3B7EA1]/20",
    label: "Info",
  },
};

function SeverityBadge({ severity }: { severity: string }) {
  const s = SEVERITY_STYLES[severity] || SEVERITY_STYLES.info;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${s.bg} ${s.text} border ${s.border}`}
    >
      {s.label}
    </span>
  );
}

// ── Issue card ──────────────────────────────────────────────────────

function IssueCard({ issue }: { issue: AuditIssue }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="border border-[rgba(214,208,196,0.5)] rounded-lg bg-white overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#FAF8F4]/60 transition-colors"
      >
        <SeverityBadge severity={issue.severity} />
        <span className="flex-1 text-sm font-medium text-[#3d3929]">
          {issue.title}
        </span>
        <svg
          className={`w-4 h-4 text-[#9c9580] transition-transform duration-200 flex-shrink-0 ${
            open ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-0 border-t border-[rgba(214,208,196,0.3)]">
          <p className="text-sm text-[#6b6352] mt-3">{issue.description}</p>
          <div className="mt-2 flex items-start gap-2">
            <span className="text-[#2D5A3D] mt-0.5 flex-shrink-0">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
            <p className="text-sm text-[#2D5A3D] font-medium">
              {issue.recommendation}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Stats grid ──────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-[rgba(214,208,196,0.5)] p-4 text-center">
      <div className="text-2xl font-bold text-[#3d3929]">{value}</div>
      <div className="text-xs text-[#9c9580] mt-1 font-medium">{label}</div>
      {sub && <div className="text-[10px] text-[#b0a890] mt-0.5">{sub}</div>}
    </div>
  );
}

// ── Loading animation ───────────────────────────────────────────────

function LoadingState() {
  const steps = [
    "Fetching page...",
    "Analyzing meta tags...",
    "Checking content quality...",
    "Evaluating performance...",
    "Analyzing link structure...",
    "Detecting structured data...",
    "Calculating scores...",
  ];
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((s) => (s + 1) % steps.length);
    }, 1200);
    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div className="flex flex-col items-center justify-center py-20">
      {/* Spinner */}
      <div className="relative w-20 h-20 mb-8">
        <div
          className="absolute inset-0 rounded-full border-4 border-[#e5e1d8]"
        />
        <div
          className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#C8322B] animate-spin"
        />
      </div>
      <p className="text-[#3d3929] font-medium text-lg mb-2">
        Running SEO Audit
      </p>
      <p className="text-[#9c9580] text-sm transition-opacity duration-300">
        {steps[step]}
      </p>
    </div>
  );
}

// ── Main Page Component ─────────────────────────────────────────────

export default function SeoAuditPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const runAudit = useCallback(async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/tools/seo-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(
          data?.error || `Request failed with status ${res.status}`
        );
      }

      const data: AuditResult = await res.json();
      setResult(data);

      // Scroll to results
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
    } finally {
      setLoading(false);
    }
  }, [url]);

  const handleSubscribe = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!email.trim()) return;
      // In a production app this would POST to a subscribe endpoint.
      // For lead capture MVP, just mark as subscribed.
      setSubscribed(true);
    },
    [email]
  );

  const criticalIssues =
    result?.issues.filter((i) => i.severity === "critical") || [];
  const warningIssues =
    result?.issues.filter((i) => i.severity === "warning") || [];
  const infoIssues =
    result?.issues.filter((i) => i.severity === "info") || [];

  return (
    <div className="min-h-screen bg-[#FAF8F4]">
      {/* ── Header ────────────────────────────────────────────────── */}
      <header className="border-b border-[rgba(214,208,196,0.5)] bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-[#C8322B] font-bold text-xl tracking-tight hover:opacity-80 transition-opacity"
          >
            Yalla London
          </Link>
          <span className="text-xs text-[#9c9580] font-medium tracking-wide uppercase">
            Free SEO Tool
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        {/* ── Hero / Input Section ────────────────────────────────── */}
        <section className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#3d3929] mb-4 tracking-tight">
            Free SEO Audit Tool
          </h1>
          <p className="text-[#6b6352] text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
            Get an instant, comprehensive SEO analysis of any webpage. Check
            meta tags, content quality, performance, links, and structured data
            — all in seconds.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              runAudit();
            }}
            className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-3"
          >
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter any URL (e.g. example.com)"
              className="flex-1 px-5 py-3.5 rounded-xl border border-[rgba(214,208,196,0.6)] bg-white text-[#3d3929] placeholder:text-[#b0a890] focus:outline-none focus:ring-2 focus:ring-[#C8322B]/30 focus:border-[#C8322B]/40 text-base shadow-sm"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="px-8 py-3.5 rounded-xl bg-[#C8322B] text-white font-semibold text-base hover:bg-[#b02a24] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm whitespace-nowrap"
            >
              {loading ? "Auditing..." : "Run Audit"}
            </button>
          </form>

          {error && (
            <div className="mt-6 max-w-2xl mx-auto bg-red-50 border border-red-200 text-[#C8322B] rounded-xl px-5 py-4 text-sm">
              <strong>Error:</strong> {error}
            </div>
          )}
        </section>

        {/* ── Loading State ──────────────────────────────────────── */}
        {loading && <LoadingState />}

        {/* ── Results ────────────────────────────────────────────── */}
        {result && !loading && (
          <div ref={resultRef} className="space-y-8 animate-fadeIn">
            {/* URL badge */}
            <div className="text-center">
              <span className="inline-flex items-center gap-2 bg-white border border-[rgba(214,208,196,0.5)] rounded-full px-5 py-2 text-sm text-[#6b6352]">
                <svg
                  className="w-4 h-4 text-[#9c9580]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                  />
                </svg>
                {result.url}
              </span>
            </div>

            {/* ── Score + Sub-scores ────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-[rgba(214,208,196,0.5)] shadow-sm overflow-hidden">
              <div className="grid md:grid-cols-2 gap-0 md:divide-x divide-[rgba(214,208,196,0.3)]">
                {/* Composite score */}
                <div className="flex flex-col items-center justify-center py-10 px-6">
                  <ScoreRing
                    score={result.scores.overall}
                    grade={result.grade}
                  />
                  <p className="text-sm text-[#9c9580] mt-4">
                    Overall SEO Score
                  </p>
                </div>
                {/* Sub-scores */}
                <div className="flex flex-col justify-center gap-5 py-10 px-6 sm:px-8">
                  <SubScoreBar
                    label="Technical SEO"
                    score={result.scores.technical}
                    icon="&#9881;"
                  />
                  <SubScoreBar
                    label="Content Quality"
                    score={result.scores.content}
                    icon="&#9997;"
                  />
                  <SubScoreBar
                    label="Performance"
                    score={result.scores.performance}
                    icon="&#9889;"
                  />
                  <SubScoreBar
                    label="Links"
                    score={result.scores.links}
                    icon="&#128279;"
                  />
                </div>
              </div>
            </div>

            {/* ── Quick Stats ───────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard
                label="Word Count"
                value={result.stats.wordCount.toLocaleString()}
              />
              <StatCard
                label="Response Time"
                value={`${result.stats.loadTimeMs}ms`}
              />
              <StatCard
                label="HTML Size"
                value={`${result.stats.htmlSizeKb}KB`}
              />
              <StatCard
                label="Images"
                value={result.stats.imageCount}
                sub={
                  result.stats.imagesWithoutAlt > 0
                    ? `${result.stats.imagesWithoutAlt} missing alt`
                    : "All have alt text"
                }
              />
            </div>

            {/* ── Headings & Links stats ────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <StatCard label="H1 Tags" value={result.stats.headingCount.h1} />
              <StatCard label="H2 Tags" value={result.stats.headingCount.h2} />
              <StatCard label="H3 Tags" value={result.stats.headingCount.h3} />
              <StatCard
                label="Internal Links"
                value={result.stats.internalLinks}
              />
              <StatCard
                label="External Links"
                value={result.stats.externalLinks}
              />
            </div>

            {/* ── Schema types ──────────────────────────────────── */}
            {result.stats.schemaTypes.length > 0 && (
              <div className="bg-white rounded-xl border border-[rgba(214,208,196,0.5)] p-5">
                <h3 className="text-sm font-semibold text-[#3d3929] mb-3">
                  Structured Data Detected
                </h3>
                <div className="flex flex-wrap gap-2">
                  {result.stats.schemaTypes.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#2D5A3D]/10 text-[#2D5A3D] border border-[#2D5A3D]/15"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ── Meta Tags Preview ─────────────────────────────── */}
            <div className="bg-white rounded-xl border border-[rgba(214,208,196,0.5)] p-5">
              <h3 className="text-sm font-semibold text-[#3d3929] mb-4">
                Meta Tags Preview
              </h3>
              {/* SERP-like preview */}
              <div className="bg-[#FAF8F4] rounded-lg p-4 border border-[rgba(214,208,196,0.3)] mb-4">
                <div className="text-[#1a0dab] text-lg leading-snug font-medium truncate">
                  {result.meta.title || "No title tag found"}
                </div>
                <div className="text-[#006621] text-sm mt-1 truncate">
                  {result.url}
                </div>
                <div className="text-[#4d5156] text-sm mt-1 line-clamp-2 leading-relaxed">
                  {result.meta.description || "No meta description found."}
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                {(
                  [
                    ["Canonical", result.meta.canonical],
                    ["OG Title", result.meta.ogTitle],
                    ["OG Description", result.meta.ogDescription],
                    ["OG Image", result.meta.ogImage],
                    ["Robots", result.meta.robots],
                    ["Viewport", result.meta.viewport],
                    ["Charset", result.meta.charset],
                    ["Language", result.meta.language],
                  ] as [string, string | null][]
                ).map(([label, value]) => (
                  <div key={label} className="flex gap-2 py-1.5 border-b border-[rgba(214,208,196,0.2)]">
                    <span className="text-[#9c9580] font-medium w-28 flex-shrink-0">
                      {label}
                    </span>
                    <span
                      className={`truncate ${
                        value ? "text-[#3d3929]" : "text-[#C8322B]/70 italic"
                      }`}
                    >
                      {value || "Not set"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Issues ────────────────────────────────────────── */}
            <div>
              <h2 className="text-xl font-bold text-[#3d3929] mb-5">
                Issues Found
                <span className="ml-2 text-sm font-normal text-[#9c9580]">
                  ({result.issues.length} total)
                </span>
              </h2>

              {criticalIssues.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-[#C8322B] mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#C8322B]" />
                    Critical ({criticalIssues.length})
                  </h3>
                  <div className="space-y-2">
                    {criticalIssues.map((issue, i) => (
                      <IssueCard key={`c-${i}`} issue={issue} />
                    ))}
                  </div>
                </div>
              )}

              {warningIssues.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-[#d97706] mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#d97706]" />
                    Warnings ({warningIssues.length})
                  </h3>
                  <div className="space-y-2">
                    {warningIssues.map((issue, i) => (
                      <IssueCard key={`w-${i}`} issue={issue} />
                    ))}
                  </div>
                </div>
              )}

              {infoIssues.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-[#3B7EA1] mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#3B7EA1]" />
                    Info ({infoIssues.length})
                  </h3>
                  <div className="space-y-2">
                    {infoIssues.map((issue, i) => (
                      <IssueCard key={`i-${i}`} issue={issue} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Lead Capture ──────────────────────────────────── */}
            <div className="bg-gradient-to-br from-[#3d3929] to-[#2a2618] rounded-2xl p-8 sm:p-10 text-center">
              <h2 className="text-2xl font-bold text-white mb-3">
                Want Monthly SEO Monitoring?
              </h2>
              <p className="text-[#c8c0b0] mb-6 max-w-lg mx-auto leading-relaxed">
                Get automated monthly audits, ranking alerts, and actionable
                improvement tips delivered to your inbox — completely free.
              </p>
              {subscribed ? (
                <div className="inline-flex items-center gap-2 bg-[#2D5A3D]/80 text-white px-6 py-3 rounded-xl font-medium">
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  You&apos;re subscribed! We&apos;ll be in touch.
                </div>
              ) : (
                <form
                  onSubmit={handleSubscribe}
                  className="max-w-md mx-auto flex flex-col sm:flex-row gap-3"
                >
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="flex-1 px-5 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#C49A2A]/50 focus:border-[#C49A2A]/40 text-base"
                  />
                  <button
                    type="submit"
                    className="px-6 py-3 rounded-xl bg-[#C49A2A] text-white font-semibold hover:bg-[#b08a22] transition-colors whitespace-nowrap"
                  >
                    Subscribe Free
                  </button>
                </form>
              )}
            </div>

            {/* ── Timestamp ─────────────────────────────────────── */}
            <p className="text-center text-xs text-[#b0a890]">
              Audit completed at{" "}
              {new Date(result.timestamp).toLocaleString()}
            </p>
          </div>
        )}

        {/* ── How it works (shown before audit) ──────────────────── */}
        {!result && !loading && (
          <section className="mt-8">
            <h2 className="text-xl font-bold text-[#3d3929] text-center mb-8">
              What We Check
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                {
                  icon: "&#9881;",
                  title: "Technical SEO",
                  desc: "Title tags, meta descriptions, canonical URLs, viewport, Open Graph, schema markup, robots directives",
                },
                {
                  icon: "&#9997;",
                  title: "Content Quality",
                  desc: "Heading hierarchy, word count, image alt text, content depth analysis",
                },
                {
                  icon: "&#9889;",
                  title: "Performance",
                  desc: "Response time, HTML document size, render-blocking resource detection",
                },
                {
                  icon: "&#128279;",
                  title: "Link Analysis",
                  desc: "Internal and external link counts, link distribution, crawlability signals",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="bg-white rounded-xl border border-[rgba(214,208,196,0.5)] p-6 text-center"
                >
                  <div
                    className="text-3xl mb-3"
                    dangerouslySetInnerHTML={{ __html: item.icon }}
                  />
                  <h3 className="font-semibold text-[#3d3929] mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-[#6b6352] leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>

            {/* Trust / branding */}
            <div className="mt-12 text-center">
              <p className="text-sm text-[#9c9580]">
                Powered by{" "}
                <Link href="/" className="text-[#C8322B] hover:underline font-medium">
                  Yalla London
                </Link>{" "}
                &mdash; luxury travel content platform by Zenitha.Luxury LLC
              </p>
            </div>
          </section>
        )}
      </main>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="border-t border-[rgba(214,208,196,0.3)] py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#9c9580]">
          <span>&copy; {new Date().getFullYear()} Zenitha.Luxury LLC</span>
          <div className="flex gap-4">
            <Link href="/privacy-policy" className="hover:text-[#3d3929] transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-[#3d3929] transition-colors">
              Terms
            </Link>
            <Link href="/" className="hover:text-[#3d3929] transition-colors">
              Home
            </Link>
          </div>
        </div>
      </footer>

      {/* ── CSS animation ────────────────────────────────────────── */}
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out both;
        }
      `}</style>
    </div>
  );
}
