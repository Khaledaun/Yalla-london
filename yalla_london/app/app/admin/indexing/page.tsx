"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Globe,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Send,
  Loader2,
  Search,
  ExternalLink,
  Zap,
  Activity,
  Radio,
  CircleDot,
  ChevronDown,
  Filter,
} from "lucide-react";

interface UrlStatus {
  url: string;
  path: string;
  type: string;
  storedStatus: string;
  lastChecked: string | null;
  lastSubmitted: string | null;
  hasGSCData: boolean;
  gscImpressions: number;
  gscClicks: number;
  liveStatus: string | null;
  liveVerdict: string | null;
  liveCrawlTime: string | null;
  liveRobots: string | null;
  liveIssues: string[];
  checking: boolean;
}

interface StatusData {
  success: boolean;
  gscConfigured: boolean;
  totalUrls: number;
  summary: {
    indexed: number;
    submitted: number;
    notIndexed: number;
    withGSCData: number;
    neverChecked: number;
  };
  urls: Array<{
    url: string;
    path: string;
    type: string;
    storedStatus: string;
    lastChecked: string | null;
    lastSubmitted: string | null;
    hasGSCData: boolean;
    gscImpressions: number;
    gscClicks: number;
    liveStatus: string | null;
  }>;
  totalBatches: number;
}

type FilterType = "all" | "indexed" | "not_indexed" | "submitted" | "unknown";

export default function IndexingMonitorPage() {
  const [urls, setUrls] = useState<UrlStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gscConfigured, setGscConfigured] = useState(false);
  const [totalBatches, setTotalBatches] = useState(0);

  // Live check state
  const [checking, setChecking] = useState(false);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [checkedCount, setCheckedCount] = useState(0);
  const [liveIndexed, setLiveIndexed] = useState(0);
  const [liveNotIndexed, setLiveNotIndexed] = useState(0);
  const abortRef = useRef(false);

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<string | null>(null);

  // Filters
  const [filter, setFilter] = useState<FilterType>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // ── Load initial status ──────────────────────────────────────────
  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/indexing?action=status");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: StatusData = await res.json();
      setGscConfigured(data.gscConfigured);
      setTotalBatches(data.totalBatches);
      setUrls(
        data.urls.map((u) => ({
          ...u,
          liveStatus: null,
          liveVerdict: null,
          liveCrawlTime: null,
          liveRobots: null,
          liveIssues: [],
          checking: false,
        }))
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // ── Live check: run batch by batch ───────────────────────────────
  const runLiveCheck = useCallback(async () => {
    if (!gscConfigured) return;
    setChecking(true);
    setCheckedCount(0);
    setLiveIndexed(0);
    setLiveNotIndexed(0);
    abortRef.current = false;

    // Mark all as "checking"
    setUrls((prev) => prev.map((u) => ({ ...u, checking: true })));

    let indexed = 0;
    let notIndexed = 0;

    for (let batch = 0; batch < totalBatches; batch++) {
      if (abortRef.current) break;
      setCurrentBatch(batch);

      try {
        const res = await fetch(
          `/api/admin/indexing?action=check&batch=${batch}`
        );
        if (!res.ok) throw new Error(`Batch ${batch} failed: HTTP ${res.status}`);
        const data = await res.json();

        if (!data.success) {
          console.warn("Batch check failed:", data.error);
          continue;
        }

        // Update URLs with live results
        setUrls((prev) => {
          const updated = [...prev];
          for (const result of data.results) {
            const idx = updated.findIndex((u) => u.url === result.url);
            if (idx !== -1) {
              updated[idx] = {
                ...updated[idx],
                liveStatus: result.indexingState,
                liveVerdict: result.verdict,
                liveCrawlTime: result.lastCrawlTime,
                liveRobots: result.robotsTxtState,
                liveIssues: result.issues || [],
                storedStatus:
                  result.indexingState === "INDEXED" ? "indexed" : "not_indexed",
                lastChecked: new Date().toISOString(),
                checking: false,
              };
            }
          }
          return updated;
        });

        indexed += data.summary.indexed;
        notIndexed += data.summary.notIndexed;
        setCheckedCount((prev) => prev + data.checked);
        setLiveIndexed(indexed);
        setLiveNotIndexed(notIndexed);

        if (data.done) break;

        // Delay between batches to respect rate limits
        await new Promise((r) => setTimeout(r, 1000));
      } catch (e) {
        console.error("Batch check error:", e);
      }
    }

    // Mark remaining as done checking
    setUrls((prev) => prev.map((u) => ({ ...u, checking: false })));
    setChecking(false);
  }, [gscConfigured, totalBatches]);

  const stopCheck = () => {
    abortRef.current = true;
  };

  // ── Submit unindexed URLs ────────────────────────────────────────
  const submitUnindexed = async () => {
    const unindexed = urls.filter(
      (u) =>
        u.storedStatus !== "indexed" &&
        !u.hasGSCData &&
        u.liveStatus !== "INDEXED"
    );
    if (unindexed.length === 0) {
      setSubmitResult("All URLs are already indexed!");
      return;
    }

    setSubmitting(true);
    setSubmitResult(null);
    try {
      const res = await fetch("/api/admin/indexing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          urls: unindexed.map((u) => u.url),
          method: "both",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitResult(
          `Submitted ${data.submitted} URLs to IndexNow + Google Indexing API`
        );
        // Update status
        setUrls((prev) =>
          prev.map((u) => {
            if (unindexed.some((un) => un.url === u.url)) {
              return {
                ...u,
                storedStatus: "submitted",
                lastSubmitted: new Date().toISOString(),
              };
            }
            return u;
          })
        );
      } else {
        setSubmitResult(`Error: ${data.error}`);
      }
    } catch (e) {
      setSubmitResult(`Failed: ${(e as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Filtering ────────────────────────────────────────────────────
  const filtered = urls.filter((u) => {
    if (searchQuery && !u.path.toLowerCase().includes(searchQuery.toLowerCase()))
      return false;
    if (typeFilter !== "all" && u.type !== typeFilter) return false;
    if (filter === "indexed")
      return (
        u.storedStatus === "indexed" ||
        u.hasGSCData ||
        u.liveStatus === "INDEXED"
      );
    if (filter === "not_indexed")
      return (
        u.storedStatus !== "indexed" &&
        !u.hasGSCData &&
        u.liveStatus !== "INDEXED" &&
        u.storedStatus !== "submitted"
      );
    if (filter === "submitted") return u.storedStatus === "submitted";
    if (filter === "unknown")
      return !u.lastChecked && !u.hasGSCData && u.liveStatus === null;
    return true;
  });

  // ── Summary ──────────────────────────────────────────────────────
  const summary = {
    total: urls.length,
    indexed: urls.filter(
      (u) =>
        u.storedStatus === "indexed" ||
        u.hasGSCData ||
        u.liveStatus === "INDEXED"
    ).length,
    submitted: urls.filter((u) => u.storedStatus === "submitted").length,
    notIndexed: urls.filter(
      (u) =>
        (u.storedStatus === "not_indexed" || u.liveStatus === "NOT_INDEXED") &&
        !u.hasGSCData
    ).length,
    unknown: urls.filter(
      (u) => !u.lastChecked && !u.hasGSCData && u.liveStatus === null
    ).length,
    withImpressions: urls.filter((u) => u.gscImpressions > 0).length,
  };

  const types = [...new Set(urls.map((u) => u.type))];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/seo"
            className="text-gray-400 hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Globe className="w-6 h-6 text-emerald-400" />
              Live Indexing Monitor
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Real-time Google Search Console URL Inspection
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {checking ? (
            <button
              onClick={stopCheck}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition"
            >
              <XCircle className="w-4 h-4" />
              Stop
            </button>
          ) : (
            <button
              onClick={runLiveCheck}
              disabled={loading || !gscConfigured}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition"
            >
              <Radio className="w-4 h-4" />
              Run Live Check
            </button>
          )}
          <button
            onClick={submitUnindexed}
            disabled={submitting || checking}
            className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Submit Unindexed
          </button>
          <button
            onClick={loadStatus}
            disabled={loading}
            className="bg-gray-800 hover:bg-gray-700 disabled:opacity-50 px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* GSC Config Warning */}
      {!loading && !gscConfigured && (
        <div className="bg-amber-900/20 border border-amber-700 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-amber-300">
              Google Search Console not configured
            </p>
            <p className="text-sm text-amber-400 mt-1">
              Set GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL and
              GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY environment variables to enable
              live URL inspection. GSC_SITE_URL should match your verified
              property.
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Submit Result */}
      {submitResult && (
        <div
          className={`border rounded-lg p-4 flex items-start gap-3 ${
            submitResult.startsWith("Error") || submitResult.startsWith("Failed")
              ? "bg-red-900/20 border-red-700"
              : "bg-emerald-900/20 border-emerald-700"
          }`}
        >
          {submitResult.startsWith("Error") ||
          submitResult.startsWith("Failed") ? (
            <XCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
          ) : (
            <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
          )}
          <p className="text-sm">{submitResult}</p>
          <button
            onClick={() => setSubmitResult(null)}
            className="ml-auto text-gray-500 hover:text-white"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Live Check Progress */}
      {checking && (
        <div className="bg-gray-900 border border-emerald-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Activity className="w-5 h-5 text-emerald-400" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
              </div>
              <span className="font-medium text-emerald-300">
                Live checking URLs via GSC URL Inspection API...
              </span>
            </div>
            <span className="text-sm text-gray-400">
              Batch {currentBatch + 1}/{totalBatches}
            </span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
              style={{
                width: `${totalBatches > 0 ? ((currentBatch + 1) / totalBatches) * 100 : 0}%`,
              }}
            />
          </div>
          <div className="flex items-center gap-6 text-sm">
            <span className="text-gray-400">
              Checked: <span className="text-white font-medium">{checkedCount}</span>/{urls.length}
            </span>
            <span className="text-emerald-400">
              Indexed: <span className="font-medium">{liveIndexed}</span>
            </span>
            <span className="text-red-400">
              Not indexed: <span className="font-medium">{liveNotIndexed}</span>
            </span>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <SummaryCard
            label="Total URLs"
            value={summary.total}
            icon={<Globe className="w-4 h-4 text-gray-400" />}
            onClick={() => setFilter("all")}
            active={filter === "all"}
          />
          <SummaryCard
            label="Indexed"
            value={summary.indexed}
            icon={<CheckCircle className="w-4 h-4 text-emerald-400" />}
            color="emerald"
            onClick={() => setFilter("indexed")}
            active={filter === "indexed"}
          />
          <SummaryCard
            label="Submitted"
            value={summary.submitted}
            icon={<Send className="w-4 h-4 text-blue-400" />}
            color="blue"
            onClick={() => setFilter("submitted")}
            active={filter === "submitted"}
          />
          <SummaryCard
            label="Not Indexed"
            value={summary.notIndexed}
            icon={<XCircle className="w-4 h-4 text-red-400" />}
            color="red"
            onClick={() => setFilter("not_indexed")}
            active={filter === "not_indexed"}
          />
          <SummaryCard
            label="Unknown"
            value={summary.unknown}
            icon={<CircleDot className="w-4 h-4 text-gray-400" />}
            onClick={() => setFilter("unknown")}
            active={filter === "unknown"}
          />
          <SummaryCard
            label="With Impressions"
            value={summary.withImpressions}
            icon={<Zap className="w-4 h-4 text-amber-400" />}
            color="amber"
          />
        </div>
      )}

      {/* Filters */}
      {!loading && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search URLs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All types</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <span className="text-sm text-gray-500 ml-auto">
            {filtered.length} URL{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* URL List */}
      {!loading && (
        <div className="space-y-2">
          {filtered.map((u) => (
            <UrlRow key={u.url} url={u} />
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              {searchQuery || filter !== "all" || typeFilter !== "all"
                ? "No URLs match your filters"
                : "No URLs found"}
            </div>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        </div>
      )}
    </div>
  );
}

function UrlRow({ url }: { url: UrlStatus }) {
  const [expanded, setExpanded] = useState(false);

  const statusIcon =
    url.liveStatus === "INDEXED" || url.storedStatus === "indexed" || url.hasGSCData ? (
      <CheckCircle className="w-4 h-4 text-emerald-400" />
    ) : url.liveStatus === "NOT_INDEXED" || url.storedStatus === "not_indexed" ? (
      <XCircle className="w-4 h-4 text-red-400" />
    ) : url.storedStatus === "submitted" ? (
      <Send className="w-4 h-4 text-blue-400" />
    ) : url.checking ? (
      <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
    ) : (
      <CircleDot className="w-4 h-4 text-gray-600" />
    );

  const statusText =
    url.liveStatus === "INDEXED" || url.storedStatus === "indexed" || url.hasGSCData
      ? "Indexed"
      : url.liveStatus === "NOT_INDEXED" || url.storedStatus === "not_indexed"
        ? "Not Indexed"
        : url.storedStatus === "submitted"
          ? "Submitted"
          : url.checking
            ? "Checking..."
            : "Unknown";

  const statusColor =
    statusText === "Indexed"
      ? "text-emerald-400"
      : statusText === "Not Indexed"
        ? "text-red-400"
        : statusText === "Submitted"
          ? "text-blue-400"
          : statusText === "Checking..."
            ? "text-emerald-400"
            : "text-gray-500";

  const typeBadge: Record<string, { bg: string; text: string; label: string }> = {
    blog: { bg: "bg-violet-900/30", text: "text-violet-400", label: "Blog" },
    "blog-category": { bg: "bg-purple-900/30", text: "text-purple-400", label: "Category" },
    "info-section": { bg: "bg-blue-900/30", text: "text-blue-400", label: "Info Hub" },
    "info-article": { bg: "bg-cyan-900/30", text: "text-cyan-400", label: "Info Article" },
    news: { bg: "bg-orange-900/30", text: "text-orange-400", label: "News" },
    static: { bg: "bg-gray-800", text: "text-gray-400", label: "Static" },
  };
  const badge = typeBadge[url.type] || typeBadge.static;

  return (
    <div
      className={`bg-gray-900 border rounded-lg transition ${
        url.checking
          ? "border-emerald-800/50 bg-emerald-950/10"
          : url.liveStatus === "INDEXED" || url.storedStatus === "indexed" || url.hasGSCData
            ? "border-gray-800"
            : url.liveStatus === "NOT_INDEXED"
              ? "border-red-900/30"
              : "border-gray-800"
      }`}
    >
      <div
        className="flex items-center gap-3 p-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {statusIcon}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-200 truncate">
              {url.path || "/"}
            </span>
            <a
              href={url.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-gray-600 hover:text-violet-400 transition flex-shrink-0"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded ${badge.bg} ${badge.text}`}
        >
          {badge.label}
        </span>
        <span className={`text-xs font-medium ${statusColor} w-24 text-right`}>
          {statusText}
        </span>
        {url.hasGSCData && (
          <span className="text-[10px] text-amber-400 w-20 text-right">
            {url.gscImpressions > 0 && `${url.gscImpressions} imp`}
          </span>
        )}
        <ChevronDown
          className={`w-4 h-4 text-gray-600 transition ${expanded ? "rotate-180" : ""}`}
        />
      </div>

      {expanded && (
        <div className="border-t border-gray-800 px-3 py-2 text-xs space-y-1">
          <div className="flex flex-wrap gap-4 text-gray-400">
            <span>
              URL:{" "}
              <span className="text-gray-300 font-mono">{url.url}</span>
            </span>
          </div>
          <div className="flex flex-wrap gap-4 text-gray-400">
            {url.lastChecked && (
              <span>
                Last checked:{" "}
                <span className="text-gray-300">
                  {new Date(url.lastChecked).toLocaleString()}
                </span>
              </span>
            )}
            {url.lastSubmitted && (
              <span>
                Last submitted:{" "}
                <span className="text-gray-300">
                  {new Date(url.lastSubmitted).toLocaleString()}
                </span>
              </span>
            )}
            {url.liveCrawlTime && (
              <span>
                Last crawl:{" "}
                <span className="text-gray-300">
                  {new Date(url.liveCrawlTime).toLocaleString()}
                </span>
              </span>
            )}
          </div>
          {url.liveVerdict && (
            <div className="text-gray-400">
              Verdict:{" "}
              <span
                className={
                  url.liveVerdict.includes("PASS")
                    ? "text-emerald-400"
                    : "text-red-400"
                }
              >
                {url.liveVerdict}
              </span>
            </div>
          )}
          {url.liveRobots && (
            <div className="text-gray-400">
              Robots.txt: <span className="text-gray-300">{url.liveRobots}</span>
            </div>
          )}
          {url.liveIssues.length > 0 && (
            <div className="text-red-400">
              Issues: {url.liveIssues.join(", ")}
            </div>
          )}
          {url.hasGSCData && (
            <div className="text-gray-400">
              GSC data: {url.gscImpressions} impressions, {url.gscClicks} clicks
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  color,
  onClick,
  active,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color?: string;
  onClick?: () => void;
  active?: boolean;
}) {
  const borderColor = active
    ? color === "emerald"
      ? "border-emerald-600"
      : color === "blue"
        ? "border-blue-600"
        : color === "red"
          ? "border-red-600"
          : color === "amber"
            ? "border-amber-600"
            : "border-gray-600"
    : "border-gray-800";

  return (
    <button
      onClick={onClick}
      className={`bg-gray-900 rounded-xl p-3 border ${borderColor} text-left transition hover:border-gray-600 ${
        onClick ? "cursor-pointer" : "cursor-default"
      }`}
    >
      <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
        {icon}
        {label}
      </div>
      <div className="text-xl font-bold text-white mt-1">{value}</div>
    </button>
  );
}
