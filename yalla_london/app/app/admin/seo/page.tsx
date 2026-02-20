"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Search, AlertTriangle, CheckCircle, XCircle, Clock, Globe, Zap,
  RefreshCw, ExternalLink, FileText, ChevronDown, ChevronRight,
  Loader2, Send, Activity, Eye, Shield, Play, Filter, BarChart3,
  Radio, Database, ArrowUpRight, Info, Settings, AlertCircle,
  History, TrendingUp, CheckSquare, Hash,
} from "lucide-react";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────

interface IndexingArticle {
  id: string; title: string; slug: string; url: string;
  publishedAt: string | null; seoScore: number; wordCount: number;
  indexingStatus: "indexed" | "submitted" | "not_indexed" | "error" | "never_submitted";
  submittedAt: string | null; lastCrawledAt: string | null;
  lastInspectedAt: string | null; coverageState: string | null;
  submittedIndexnow: boolean; submittedSitemap: boolean;
  submissionAttempts: number; notIndexedReasons: string[];
  fixAction: string | null;
}

interface IndexingData {
  success: boolean; siteId: string; baseUrl: string;
  config: { hasIndexNowKey: boolean; hasGscCredentials: boolean; gscSiteUrl: string };
  summary: { total: number; indexed: number; submitted: number; notIndexed: number; neverSubmitted: number; errors: number };
  healthDiagnosis: { status: "healthy"|"warning"|"critical"|"not_started"; message: string; detail: string; indexingRate: number };
  recentActivity: Array<{ jobName: string; status: string; startedAt: string; durationMs: number; itemsProcessed: number; itemsSucceeded: number; errorMessage: string|null }>;
  articles: IndexingArticle[];
  systemIssues: Array<{ severity: "critical"|"warning"|"info"; category: string; message: string; detail: string; fixAction?: string }>;
}

interface IndexingStats {
  totalReports: number; totalSubmissions: number; totalAudits: number;
  totalGoogleSubmitted: number; totalIndexNowSubmitted: number;
  lastSubmission: string | null; lastSuccessfulSubmission: string | null;
  latestSnapshot: { totalPages: number; inspected: number; indexed: number; notIndexed: number; date: string } | null;
  latestSubmissionResult: { indexNow: { submitted: number; status: string }; googleApi: { submitted: number; failed: number; errors: string[]; status: string } } | null;
  timeline: Array<{ date: string; mode: string; totalPages: number; googleSubmitted: number; googleStatus: string; indexNowSubmitted: number; indexNowStatus: string }>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime();
  if (diff < 60_000) return `${Math.floor(diff/1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff/60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff/3_600_000)}h ago`;
  return `${Math.floor(diff/86_400_000)}d ago`;
}

const STATUS_CONFIG = {
  indexed:         { label:"Indexed",          color:"#2D5A3D", bg:"rgba(45,90,61,0.1)",   border:"rgba(45,90,61,0.25)" },
  submitted:       { label:"Submitted",         color:"#C49A2A", bg:"rgba(196,154,42,0.1)", border:"rgba(196,154,42,0.25)" },
  not_indexed:     { label:"Not Indexed",       color:"#C8322B", bg:"rgba(200,50,43,0.1)",  border:"rgba(200,50,43,0.25)" },
  error:           { label:"Error",             color:"#C8322B", bg:"rgba(200,50,43,0.1)",  border:"rgba(200,50,43,0.25)" },
  never_submitted: { label:"Never Submitted",   color:"#78716C", bg:"rgba(120,113,108,0.1)",border:"rgba(120,113,108,0.2)" },
};

const HEALTH_CONFIG = {
  healthy:     { color:"#2D5A3D", bg:"rgba(45,90,61,0.08)",   icon: CheckCircle,    label:"Healthy" },
  warning:     { color:"#C49A2A", bg:"rgba(196,154,42,0.08)", icon: AlertTriangle,  label:"Warning" },
  critical:    { color:"#C8322B", bg:"rgba(200,50,43,0.08)",  icon: XCircle,        label:"Critical" },
  not_started: { color:"#78716C", bg:"rgba(120,113,108,0.08)",icon: Clock,          label:"Not Started" },
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function IndexingCenter() {
  const [data, setData] = useState<IndexingData | null>(null);
  const [stats, setStats] = useState<IndexingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [tab, setTab] = useState<"overview"|"articles"|"activity"|"issues"|"audit">("overview");
  const [filter, setFilter] = useState<"all"|"indexed"|"submitted"|"not_indexed"|"never_submitted"|"error">("all");
  const [search, setSearch] = useState("");
  const [expandedIssues, setExpandedIssues] = useState<string[]>([]);
  const [auditResult, setAuditResult] = useState<null|{ passed: number; failed: number; avgScore: number; autoFixed: number; issues: Array<{ url: string; issues: string[] }> }>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [complianceOpen, setComplianceOpen] = useState(false);
  // Comprehensive compliance audit state
  const [complianceResult, setComplianceResult] = useState<null|{
    averageCompliance: number;
    articlesAudited: number;
    fullComplianceCount: number;
    standardsVersion: string;
    results: Array<{ slug: string; title: string; compliancePercent: number; passed: number; total: number; blockers: number; warnings: number }>;
  }>(null);
  const [complianceAuditLoading, setComplianceAuditLoading] = useState(false);
  const [fixingAll, setFixingAll] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/content-indexing");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      toast.error("Failed to load indexing data");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/seo/indexing");
      if (!res.ok) return;
      const json = await res.json();
      setStats(json.stats ?? null);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); fetchStats(); }, [fetchData, fetchStats]);

  const doAction = async (action: string, payload?: Record<string, unknown>) => {
    setActionLoading(action);
    try {
      // refresh_stats just re-fetches without hitting the API
      if (action === "refresh_stats") {
        await fetchData();
        await fetchStats();
        toast.success("Stats refreshed");
        setActionLoading(null);
        return;
      }
      // run_seo_cron calls the cron endpoint directly
      if (action === "run_seo_cron") {
        const res = await fetch("/api/admin/run-all-crons", { method: "POST" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Cron failed");
        toast.success(json.message || "SEO Agent triggered");
        await fetchData();
        setActionLoading(null);
        return;
      }
      const res = await fetch("/api/admin/content-indexing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Action failed");
      toast.success(json.message || "Done");
      await fetchData();
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setActionLoading(null);
    }
  };

  const runAudit = async () => {
    setAuditLoading(true);
    try {
      const res = await fetch("/api/admin/content-indexing", {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ action: "compliance_audit" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setAuditResult(json.result ?? null);
      setComplianceOpen(true);
      toast.success("Audit complete");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setAuditLoading(false);
    }
  };

  // Filtered articles
  const filteredArticles = (data?.articles ?? []).filter(a => {
    if (filter !== "all" && a.indexingStatus !== filter) return false;
    if (search && !a.title.toLowerCase().includes(search.toLowerCase()) && !a.url.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const TABS = [
    { id:"overview",  label:"Overview",  icon:BarChart3 },
    { id:"articles",  label:"Articles",  icon:FileText, badge: data?.summary?.neverSubmitted ?? 0 },
    { id:"activity",  label:"Activity",  icon:Activity },
    { id:"issues",    label:"Issues",    icon:AlertTriangle, badge: data?.systemIssues?.filter(i=>i.severity==="critical").length ?? 0 },
    { id:"audit",     label:"SEO Audit", icon:CheckSquare },
  ] as const;

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
             style={{ backgroundColor:"var(--neu-bg,#EDE9E1)", boxShadow:"var(--neu-raised)" }}>
          <Loader2 size={24} className="animate-spin" style={{ color:"#C8322B" }} />
        </div>
        <p style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:"#78716C", textTransform:"uppercase", letterSpacing:2 }}>
          Loading Indexing Center
        </p>
      </div>
    </div>
  );

  const healthCfg = data ? HEALTH_CONFIG[data.healthDiagnosis.status] : HEALTH_CONFIG.not_started;
  const HealthIcon = healthCfg.icon;

  return (
    <div className="space-y-4 max-w-7xl mx-auto">

      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 style={{ fontFamily:"'Anybody',sans-serif", fontWeight:800, fontSize:24, color:"#1C1917", letterSpacing:-0.5 }}>
            Indexing Center
          </h1>
          <div style={{ fontFamily:"'IBM Plex Sans Arabic',sans-serif", fontSize:12, color:"#78716C", letterSpacing:0, marginTop:2 }}>
            مركز الفهرسة
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => { setLoading(true); fetchData(); fetchStats(); }}
                  className="p-2.5 rounded-xl transition-all"
                  style={{ backgroundColor:"var(--neu-bg)", boxShadow:"var(--neu-flat)", color:"#78716C" }}>
            <RefreshCw size={15} />
          </button>
          <button onClick={() => doAction("submit_all")} disabled={!!actionLoading}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition-all"
                  style={{ backgroundColor:"#C8322B", color:"#FAF8F4", fontFamily:"'IBM Plex Mono',monospace", fontSize:9, fontWeight:600, textTransform:"uppercase", letterSpacing:1.5, boxShadow:"4px 4px 10px rgba(200,50,43,0.3)", opacity: actionLoading?"0.7":"1" }}>
            {actionLoading==="submit_all" ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            Submit All
          </button>
        </div>
      </div>

      {/* ── Config Warnings ─────────────────────────────────────────── */}
      {data && (!data.config.hasIndexNowKey || !data.config.hasGscCredentials) && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl"
             style={{ backgroundColor:"rgba(196,154,42,0.08)", border:"1px solid rgba(196,154,42,0.25)" }}>
          <AlertTriangle size={16} style={{ color:"#C49A2A", flexShrink:0, marginTop:1 }} />
          <div>
            <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, fontWeight:600, color:"#C49A2A", textTransform:"uppercase", letterSpacing:1 }}>
              Configuration Incomplete
            </div>
            <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:"#78716C", marginTop:3, lineHeight:1.6 }}>
              {!data.config.hasIndexNowKey && "· INDEXNOW_KEY missing — IndexNow submission disabled. "}
              {!data.config.hasGscCredentials && "· GSC credentials missing — Google Search Console disabled."}
            </div>
            <Link href="/admin/command-center/settings/api-keys"
                  style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:"#4A7BA8", textDecoration:"underline", marginTop:4, display:"inline-block" }}>
              Configure API Keys →
            </Link>
          </div>
        </div>
      )}

      {/* ── Health Diagnosis Card ────────────────────────────────────── */}
      {data && (
        <div className="neu-card" style={{ borderLeft:`4px solid ${healthCfg.color}` }}>
          <div className="flex items-start gap-4">
            <div style={{ width:50, height:50, borderRadius:"50%", backgroundColor:"var(--neu-bg)", boxShadow:"var(--neu-inset)", display:"flex", alignItems:"center", justifyContent:"center", color: healthCfg.color, flexShrink:0 }}>
              <HealthIcon size={22} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <span style={{ fontFamily:"'Anybody',sans-serif", fontWeight:700, fontSize:18, color:"#1C1917" }}>
                  {data.healthDiagnosis.message}
                </span>
                <span className="neu-badge" style={{ backgroundColor: healthCfg.bg, color: healthCfg.color, border:`1px solid ${healthCfg.color}33` }}>
                  {healthCfg.label}
                </span>
              </div>
              <p style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:"#78716C", marginTop:6, lineHeight:1.6 }}>
                {data.healthDiagnosis.detail}
              </p>
              {/* Progress */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="neu-section-label">Indexing Progress</span>
                  <span style={{ fontFamily:"'Anybody',sans-serif", fontWeight:700, fontSize:14, color: healthCfg.color }}>
                    {data.healthDiagnosis.indexingRate}%
                  </span>
                </div>
                <div className="relative rounded-full overflow-hidden"
                     style={{ height:12, backgroundColor:"var(--neu-bg)", boxShadow:"var(--neu-inset)" }}>
                  <div className="h-full rounded-full transition-all duration-700"
                       style={{ width:`${data.healthDiagnosis.indexingRate}%`, backgroundColor: healthCfg.color }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Summary KPI Row ─────────────────────────────────────────── */}
      {data && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {[
            { label:"Total",          val: data.summary.total,          color:"#1C1917" },
            { label:"Indexed",        val: data.summary.indexed,        color:"#2D5A3D" },
            { label:"Submitted",      val: data.summary.submitted,      color:"#C49A2A" },
            { label:"Not Indexed",    val: data.summary.notIndexed,     color:"#C8322B" },
            { label:"Never Sent",     val: data.summary.neverSubmitted, color:"#78716C" },
            { label:"Errors",         val: data.summary.errors,         color:"#C8322B" },
          ].map(({ label, val, color }) => (
            <div key={label} className="text-center p-3 rounded-xl"
                 style={{ backgroundColor:"var(--neu-bg)", boxShadow:"var(--neu-flat)" }}>
              <div style={{ fontFamily:"'Anybody',sans-serif", fontWeight:800, fontSize:22, color }}>{val}</div>
              <div className="neu-section-label mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Tabs ────────────────────────────────────────────────────── */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          const badge = "badge" in t && (t.badge as number) > 0 ? t.badge : null;
          return (
            <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition-all flex-shrink-0"
                    style={{
                      backgroundColor:"var(--neu-bg)",
                      boxShadow: active ? "var(--neu-inset)" : "var(--neu-flat)",
                      fontFamily:"'IBM Plex Mono',monospace", fontSize:9, fontWeight: active?600:500,
                      textTransform:"uppercase", letterSpacing:1,
                      color: active ? "#C8322B" : "#78716C",
                    }}>
              <Icon size={13} />
              {t.label}
              {badge && badge > 0 && (
                <span style={{ backgroundColor:"#C8322B", color:"#FAF8F4", borderRadius:9999, padding:"1px 5px", fontSize:8, fontWeight:700 }}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ════════════════════════════════════════════════════════════════
          TAB: OVERVIEW
          ════════════════════════════════════════════════════════════════ */}
      {tab === "overview" && (
        <div className="space-y-4">
          {/* Quick Actions */}
          <div className="neu-card">
            <div style={{ fontFamily:"'Anybody',sans-serif", fontWeight:700, fontSize:16, color:"#1C1917" }} className="mb-1">
              Submission Actions
            </div>
            <div style={{ fontFamily:"'IBM Plex Sans Arabic',sans-serif", fontSize:11, color:"#78716C", letterSpacing:0 }} className="mb-4">
              إجراءات التقديم
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id:"submit_all",          label:"Submit All",           desc:"Submit every unindexed URL",     icon:Send,        color:"#C8322B" },
                { id:"run_seo_cron",        label:"Run SEO Agent",        desc:"Run indexing & discovery cron",  icon:Play,        color:"#4A7BA8" },
                { id:"compliance_audit",    label:"SEO Audit",            desc:"Audit all pages for compliance", icon:CheckSquare, color:"#C49A2A", custom: runAudit },
                { id:"refresh_stats",       label:"Refresh Stats",        desc:"Pull fresh from database",       icon:RefreshCw,   color:"#2D5A3D" },
              ].map((a) => {
                const Icon = a.icon;
                const running = actionLoading === a.id || (a.id==="compliance_audit" && auditLoading);
                return (
                  <button key={a.id}
                          onClick={() => a.custom ? a.custom() : doAction(a.id)}
                          disabled={!!actionLoading || auditLoading}
                          className="flex flex-col items-center gap-2 p-4 rounded-xl text-center transition-all"
                          style={{ backgroundColor:"var(--neu-bg)", boxShadow: running?"var(--neu-inset)":"var(--neu-raised)", cursor:(actionLoading||auditLoading)?"not-allowed":"pointer", opacity:(actionLoading||auditLoading)&&!running?0.5:1 }}>
                    <div style={{ width:40, height:40, borderRadius:"50%", backgroundColor: a.color, display:"flex", alignItems:"center", justifyContent:"center", color:"#FAF8F4", boxShadow:`2px 2px 8px ${a.color}44` }}>
                      {running ? <Loader2 size={16} className="animate-spin" /> : <Icon size={16} />}
                    </div>
                    <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, fontWeight:600, textTransform:"uppercase", letterSpacing:1, color:"#1C1917" }}>
                      {running ? "Running…" : a.label}
                    </div>
                    <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:8, color:"#78716C" }}>{a.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stats Timeline */}
          {stats && stats.timeline && stats.timeline.length > 0 && (
            <div className="neu-card">
              <div style={{ fontFamily:"'Anybody',sans-serif", fontWeight:700, fontSize:16, color:"#1C1917" }} className="mb-4">
                Submission Timeline
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {stats.timeline.slice(0, 20).map((t, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                       style={{ backgroundColor:"var(--neu-bg)", boxShadow:"var(--neu-flat)" }}>
                    <div style={{ width:6, height:6, borderRadius:"50%", backgroundColor: t.googleStatus==="success"?"#2D5A3D":"#C49A2A", flexShrink:0 }} />
                    <div className="flex-1 min-w-0">
                      <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:"#1C1917" }}>
                        {new Date(t.date).toLocaleDateString()} · {t.mode}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-center">
                        <div style={{ fontFamily:"'Anybody',sans-serif", fontWeight:700, fontSize:12, color:"#4A7BA8" }}>{t.googleSubmitted}</div>
                        <div className="neu-section-label" style={{ fontSize:7 }}>Google</div>
                      </div>
                      <div className="text-center">
                        <div style={{ fontFamily:"'Anybody',sans-serif", fontWeight:700, fontSize:12, color:"#C49A2A" }}>{t.indexNowSubmitted}</div>
                        <div className="neu-section-label" style={{ fontSize:7 }}>IndexNow</div>
                      </div>
                      <div className="text-center">
                        <div style={{ fontFamily:"'Anybody',sans-serif", fontWeight:700, fontSize:12, color:"#1C1917" }}>{t.totalPages}</div>
                        <div className="neu-section-label" style={{ fontSize:7 }}>Total</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          TAB: ARTICLES
          ════════════════════════════════════════════════════════════════ */}
      {tab === "articles" && (
        <div className="space-y-4">
          {/* Filter + Search Bar */}
          <div className="neu-card p-3">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="flex-1 relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color:"#78716C" }} />
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search articles..."
                  className="neu-input pl-9"
                  style={{ fontSize:11 }}
                />
              </div>
              {/* Status filter */}
              <div className="flex gap-1.5 flex-wrap">
                {(["all","indexed","submitted","not_indexed","never_submitted","error"] as const).map((f) => (
                  <button key={f} onClick={() => setFilter(f)}
                          className="px-3 py-2 rounded-lg transition-all"
                          style={{ backgroundColor:"var(--neu-bg)", boxShadow: filter===f?"var(--neu-inset)":"var(--neu-flat)", fontFamily:"'IBM Plex Mono',monospace", fontSize:8, fontWeight: filter===f?600:400, textTransform:"uppercase", letterSpacing:0.8, color: filter===f?"#C8322B":"#78716C" }}>
                    {f === "all" ? `All (${data?.articles?.length ?? 0})` : f === "not_indexed" ? `Not Indexed (${data?.summary?.notIndexed ?? 0})` : f === "never_submitted" ? `Never Sent (${data?.summary?.neverSubmitted ?? 0})` : f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Bulk action */}
          <div className="flex items-center gap-2">
            <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:"#78716C" }}>
              {filteredArticles.length} articles
            </span>
            {filter === "never_submitted" && filteredArticles.length > 0 && (
              <button onClick={() => doAction("submit_all")} disabled={!!actionLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                      style={{ backgroundColor:"#C8322B", color:"#FAF8F4", fontFamily:"'IBM Plex Mono',monospace", fontSize:8, fontWeight:600, textTransform:"uppercase", letterSpacing:1 }}>
                {actionLoading==="submit_all" ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                Submit All ({filteredArticles.length})
              </button>
            )}
          </div>

          {/* Article list */}
          <div className="space-y-2">
            {filteredArticles.length === 0 ? (
              <div className="neu-card text-center py-12">
                <FileText size={28} className="mx-auto mb-3 opacity-20" style={{ color:"#78716C" }} />
                <p style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:"#78716C", textTransform:"uppercase", letterSpacing:1 }}>
                  No articles match
                </p>
              </div>
            ) : (
              filteredArticles.map((article) => {
                const sc = STATUS_CONFIG[article.indexingStatus];
                const scoreColor = article.seoScore >= 70 ? "#2D5A3D" : article.seoScore >= 40 ? "#C49A2A" : "#C8322B";
                return (
                  <div key={article.id} className="neu-card" style={{ padding:"16px 20px" }}>
                    <div className="flex items-start gap-3">
                      {/* Status dot */}
                      <div style={{ width:8, height:8, borderRadius:"50%", backgroundColor: sc.color, marginTop:5, flexShrink:0 }} />

                      {/* Main content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div style={{ fontFamily:"'Anybody',sans-serif", fontWeight:700, fontSize:13, color:"#1C1917" }} className="truncate">
                              {article.title}
                            </div>
                            <a href={article.url} target="_blank" rel="noopener noreferrer"
                               style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:"#4A7BA8", textDecoration:"none" }}
                               className="flex items-center gap-1 mt-0.5 hover:underline truncate">
                              {article.url} <ExternalLink size={9} />
                            </a>
                          </div>
                          {/* Actions */}
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="neu-badge" style={{ backgroundColor: sc.bg, color: sc.color, border:`1px solid ${sc.border}`, fontSize:8 }}>
                              {sc.label}
                            </span>
                            {article.indexingStatus !== "indexed" && (
                              <button onClick={() => doAction("submit", { slugs: [article.slug] })}
                                      disabled={!!actionLoading}
                                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg"
                                      style={{ backgroundColor:"var(--neu-bg)", boxShadow:"var(--neu-raised)", fontFamily:"'IBM Plex Mono',monospace", fontSize:8, fontWeight:600, textTransform:"uppercase", letterSpacing:0.8, color:"#C8322B", cursor: actionLoading?"not-allowed":"pointer" }}>
                                {actionLoading === "submit" ? <Loader2 size={10} className="animate-spin" /> : <Send size={10} />}
                                {article.submissionAttempts > 0 ? "Resubmit" : "Submit"}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Metadata row */}
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:8, color: scoreColor }}>
                            SEO {article.seoScore}
                          </span>
                          <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:8, color:"#78716C" }}>
                            {article.wordCount.toLocaleString()} words
                          </span>
                          {article.submittedAt && (
                            <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:8, color:"#78716C" }}>
                              Sent {timeAgo(article.submittedAt)}
                            </span>
                          )}
                          {article.lastCrawledAt && (
                            <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:8, color:"#78716C" }}>
                              Crawled {timeAgo(article.lastCrawledAt)}
                            </span>
                          )}
                          {article.submissionAttempts > 0 && (
                            <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:8, color:"#78716C" }}>
                              {article.submissionAttempts} attempts
                            </span>
                          )}
                          {article.submittedIndexnow && <span className="neu-badge" style={{ backgroundColor:"rgba(74,123,168,0.1)", color:"#4A7BA8", border:"1px solid rgba(74,123,168,0.2)", fontSize:7 }}>IndexNow</span>}
                          {article.submittedSitemap && <span className="neu-badge" style={{ backgroundColor:"rgba(45,90,61,0.1)", color:"#2D5A3D", border:"1px solid rgba(45,90,61,0.2)", fontSize:7 }}>Sitemap</span>}
                        </div>

                        {/* Not indexed reasons */}
                        {article.notIndexedReasons && article.notIndexedReasons.length > 0 && (
                          <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor:"rgba(200,50,43,0.04)", border:"1px solid rgba(200,50,43,0.12)" }}>
                            <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:8, fontWeight:600, color:"#C8322B", textTransform:"uppercase", letterSpacing:1, marginBottom:4 }}>
                              Not Indexed Reasons:
                            </div>
                            {article.notIndexedReasons.map((r, i) => (
                              <div key={i} style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:"#78716C", lineHeight:1.6 }}>
                                · {r}
                              </div>
                            ))}
                            {article.fixAction && (
                              <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:"#4A7BA8", marginTop:4 }}>
                                → Fix: {article.fixAction}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          TAB: ACTIVITY
          ════════════════════════════════════════════════════════════════ */}
      {tab === "activity" && (
        <div className="space-y-3">
          <div style={{ fontFamily:"'Anybody',sans-serif", fontWeight:700, fontSize:16, color:"#1C1917" }}>Recent Indexing Activity</div>
          {!data?.recentActivity || data.recentActivity.length === 0 ? (
            <div className="neu-card text-center py-12">
              <Activity size={28} className="mx-auto mb-3 opacity-20" style={{ color:"#78716C" }} />
              <p style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:"#78716C", textTransform:"uppercase", letterSpacing:1 }}>No activity recorded yet</p>
            </div>
          ) : (
            data.recentActivity.map((a, i) => {
              const ok = a.status === "success";
              return (
                <div key={i} className="neu-card" style={{ padding:"16px 20px" }}>
                  <div className="flex items-start gap-3">
                    <div style={{ width:8, height:8, borderRadius:"50%", backgroundColor: ok?"#2D5A3D":"#C8322B", marginTop:5, flexShrink:0 }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, fontWeight:600, color:"#1C1917", textTransform:"uppercase", letterSpacing:0.5 }}>
                          {a.jobName}
                        </span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="neu-badge" style={{ backgroundColor: ok?"rgba(45,90,61,0.1)":"rgba(200,50,43,0.1)", color: ok?"#2D5A3D":"#C8322B", border:`1px solid ${ok?"rgba(45,90,61,0.25)":"rgba(200,50,43,0.25)"}` }}>
                            {a.status}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-2 flex-wrap">
                        <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:8, color:"#78716C" }}>{timeAgo(a.startedAt)}</span>
                        <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:8, color:"#78716C" }}>{a.itemsSucceeded}/{a.itemsProcessed} items</span>
                        {a.durationMs > 0 && <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:8, color:"#78716C" }}>{(a.durationMs/1000).toFixed(1)}s</span>}
                      </div>
                      {a.errorMessage && (
                        <div className="mt-2 p-2 rounded-lg" style={{ backgroundColor:"rgba(200,50,43,0.05)", border:"1px solid rgba(200,50,43,0.12)" }}>
                          <p style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:"#C8322B" }}>{a.errorMessage}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          TAB: ISSUES
          ════════════════════════════════════════════════════════════════ */}
      {tab === "issues" && (
        <div className="space-y-3">
          <div style={{ fontFamily:"'Anybody',sans-serif", fontWeight:700, fontSize:16, color:"#1C1917" }}>Indexing Issues & Diagnostics</div>
          {!data?.systemIssues || data.systemIssues.length === 0 ? (
            <div className="neu-card text-center py-12">
              <CheckCircle size={28} className="mx-auto mb-3" style={{ color:"#2D5A3D", opacity:0.5 }} />
              <p style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:"#2D5A3D", textTransform:"uppercase", letterSpacing:1 }}>
                No issues found — all clear
              </p>
            </div>
          ) : (
            data.systemIssues.map((issue, i) => {
              const key = `${i}`;
              const isOpen = expandedIssues.includes(key);
              const sev = { critical:{ c:"#C8322B", bg:"rgba(200,50,43,0.08)", b:"rgba(200,50,43,0.2)" }, warning:{ c:"#C49A2A", bg:"rgba(196,154,42,0.08)", b:"rgba(196,154,42,0.2)" }, info:{ c:"#4A7BA8", bg:"rgba(74,123,168,0.08)", b:"rgba(74,123,168,0.2)" } }[issue.severity];
              return (
                <div key={key} className="rounded-2xl overflow-hidden transition-all"
                     style={{ backgroundColor:"var(--neu-bg)", boxShadow: isOpen?"var(--neu-raised)":"var(--neu-flat)", border:`1px solid ${sev.b}` }}>
                  <button className="w-full flex items-center gap-3 p-4 text-left"
                          onClick={() => setExpandedIssues(prev => prev.includes(key) ? prev.filter(x=>x!==key) : [...prev, key])}>
                    <div style={{ width:8, height:8, borderRadius:"50%", backgroundColor: sev.c, flexShrink:0 }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="neu-badge" style={{ backgroundColor: sev.bg, color: sev.c, border:`1px solid ${sev.b}`, fontSize:7 }}>
                          {issue.severity}
                        </span>
                        <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:8, color:"#78716C", textTransform:"uppercase", letterSpacing:0.8 }}>
                          {issue.category}
                        </span>
                      </div>
                      <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, fontWeight:600, color:"#1C1917", marginTop:3 }}>
                        {issue.message}
                      </div>
                    </div>
                    <ChevronDown size={14} style={{ color:"#78716C", flexShrink:0, transform: isOpen?"rotate(180deg)":undefined, transition:"transform 200ms" }} />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 pt-0" style={{ borderTop:`1px solid ${sev.b}` }}>
                      <p style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:"#78716C", lineHeight:1.7, paddingTop:12 }}>
                        {issue.detail}
                      </p>
                      {issue.fixAction && (
                        <div className="mt-3 p-3 rounded-xl" style={{ backgroundColor:"rgba(74,123,168,0.06)", border:"1px solid rgba(74,123,168,0.15)" }}>
                          <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, fontWeight:600, color:"#4A7BA8", textTransform:"uppercase", letterSpacing:1, marginBottom:3 }}>
                            Recommended Fix:
                          </div>
                          <p style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:"#1C1917" }}>{issue.fixAction}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          TAB: SEO AUDIT — Comprehensive 13-Check Compliance
          ════════════════════════════════════════════════════════════════ */}
      {tab === "audit" && (
        <div className="space-y-4">
          <div className="neu-card">
            <div style={{ fontFamily:"'Anybody',sans-serif", fontWeight:700, fontSize:16, color:"#1C1917" }} className="mb-1">
              SEO Compliance Audit (13 Checks)
            </div>
            <div style={{ fontFamily:"'IBM Plex Sans Arabic',sans-serif", fontSize:11, color:"#78716C", letterSpacing:0 }} className="mb-4">
              تدقيق امتثال تحسين محركات البحث — ١٣ فحص
            </div>
            <p style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:"#78716C", lineHeight:1.7, marginBottom:16 }}>
              Runs all 13 pre-publication gate checks on every published article: route existence, meta title &amp; description,
              word count, heading hierarchy, internal links, readability, image alt text, author attribution (E-E-A-T),
              structured data, authenticity signals (Jan 2026 Update), and affiliate links. Reports blockers, warnings,
              and compliance percentage. Click any article to see its detailed checklist with GSC data.
            </p>
            <div className="flex gap-3 flex-wrap">
              <button onClick={async () => {
                        setComplianceAuditLoading(true);
                        try {
                          const res = await fetch("/api/admin/seo/article-compliance", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ action: "audit_all" }),
                          });
                          const json = await res.json();
                          if (json.success) {
                            setComplianceResult(json);
                            toast.success(`Audit complete: ${json.averageCompliance}% average compliance`);
                          } else {
                            toast.error(json.error || "Audit failed");
                          }
                        } catch (e: any) {
                          toast.error(e.message || "Audit failed");
                        } finally {
                          setComplianceAuditLoading(false);
                        }
                      }}
                      disabled={complianceAuditLoading}
                      className="flex items-center gap-2 px-5 py-3 rounded-xl transition-all"
                      style={{ backgroundColor:"#C49A2A", color:"#FAF8F4", fontFamily:"'IBM Plex Mono',monospace", fontSize:10, fontWeight:600, textTransform:"uppercase", letterSpacing:1.5, boxShadow:"4px 4px 10px rgba(196,154,42,0.3)", opacity: complianceAuditLoading?0.7:1, cursor: complianceAuditLoading?"not-allowed":"pointer" }}>
                {complianceAuditLoading ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
                {complianceAuditLoading ? "Auditing All Pages…" : "Run Full Compliance Audit"}
              </button>
              {complianceResult && complianceResult.results.some(r => r.compliancePercent < 100) && (
                <button onClick={async () => {
                          setFixingAll(true);
                          const failingArticles = complianceResult.results.filter(r => r.compliancePercent < 100);
                          let fixCount = 0;
                          for (const article of failingArticles.slice(0, 20)) {
                            try {
                              // Get article ID first
                              const checkRes = await fetch(`/api/admin/seo/article-compliance?slug=${encodeURIComponent(article.slug)}`);
                              if (!checkRes.ok) continue;
                              const checkData = await checkRes.json();
                              const res = await fetch("/api/admin/seo/article-compliance", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ action: "auto_fix", articleId: checkData.article.id }),
                              });
                              const result = await res.json();
                              if (result.fixesApplied > 0) fixCount += result.fixesApplied;
                            } catch { /* continue fixing others */ }
                          }
                          toast.success(`Applied ${fixCount} auto-fixes across ${failingArticles.length} articles`);
                          setFixingAll(false);
                        }}
                        disabled={fixingAll}
                        className="flex items-center gap-2 px-5 py-3 rounded-xl transition-all"
                        style={{ backgroundColor:"#C8322B", color:"#FAF8F4", fontFamily:"'IBM Plex Mono',monospace", fontSize:10, fontWeight:600, textTransform:"uppercase", letterSpacing:1.5, boxShadow:"4px 4px 10px rgba(200,50,43,0.3)", opacity: fixingAll?0.7:1, cursor: fixingAll?"not-allowed":"pointer" }}>
                  {fixingAll ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                  {fixingAll ? "Fixing Issues…" : "Fix All Issues"}
                </button>
              )}
            </div>
          </div>

          {/* Compliance Results */}
          {complianceResult && (
            <div className="space-y-3">
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label:"Articles Audited", val: complianceResult.articlesAudited, color:"#1C1917" },
                  { label:"Avg Compliance",   val: `${complianceResult.averageCompliance}%`, color: complianceResult.averageCompliance>=90?"#2D5A3D":complianceResult.averageCompliance>=70?"#C49A2A":"#C8322B" },
                  { label:"100% Compliant",   val: complianceResult.fullComplianceCount, color:"#2D5A3D" },
                  { label:"Need Fixes",       val: complianceResult.articlesAudited - complianceResult.fullComplianceCount, color:"#C8322B" },
                ].map(({ label, val, color }) => (
                  <div key={label} className="text-center p-4 rounded-xl"
                       style={{ backgroundColor:"var(--neu-bg)", boxShadow:"var(--neu-flat)" }}>
                    <div style={{ fontFamily:"'Anybody',sans-serif", fontWeight:800, fontSize:24, color }}>{val}</div>
                    <div className="neu-section-label mt-1">{label}</div>
                  </div>
                ))}
              </div>

              {/* Standards version */}
              <div className="p-3 rounded-xl" style={{ backgroundColor:"rgba(74,123,168,0.06)", border:"1px solid rgba(74,123,168,0.15)" }}>
                <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:"#4A7BA8" }}>
                  Standards v{complianceResult.standardsVersion} · 13-check gate · Jan 2026 Authenticity Update active
                </span>
              </div>

              {/* Per-article results */}
              <div className="neu-card">
                <div style={{ fontFamily:"'Anybody',sans-serif", fontWeight:700, fontSize:14, color:"#1C1917" }} className="mb-3">
                  Per-Article Compliance ({complianceResult.results.length} articles)
                </div>
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {complianceResult.results.map((article, i) => {
                    const pctColor = article.compliancePercent >= 90 ? "#2D5A3D" : article.compliancePercent >= 70 ? "#C49A2A" : "#C8322B";
                    const pctBg = article.compliancePercent >= 90 ? "rgba(45,90,61,0.08)" : article.compliancePercent >= 70 ? "rgba(196,154,42,0.08)" : "rgba(200,50,43,0.08)";
                    return (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl"
                           style={{ backgroundColor:"var(--neu-bg)", boxShadow:"var(--neu-flat)" }}>
                        {/* Compliance bar */}
                        <div style={{ width:48, textAlign:"center", flexShrink:0 }}>
                          <div style={{ fontFamily:"'Anybody',sans-serif", fontWeight:800, fontSize:16, color: pctColor }}>
                            {article.compliancePercent}%
                          </div>
                        </div>
                        {/* Article info */}
                        <div className="flex-1 min-w-0">
                          <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, fontWeight:600, color:"#1C1917" }} className="truncate">
                            {article.title}
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:8, color:"#78716C" }}>
                              {article.passed}/{article.total} checks
                            </span>
                            {article.blockers > 0 && (
                              <span className="neu-badge" style={{ backgroundColor:"rgba(200,50,43,0.1)", color:"#C8322B", border:"1px solid rgba(200,50,43,0.25)", fontSize:7 }}>
                                {article.blockers} blocker{article.blockers !== 1 ? "s" : ""}
                              </span>
                            )}
                            {article.warnings > 0 && (
                              <span className="neu-badge" style={{ backgroundColor:"rgba(196,154,42,0.1)", color:"#C49A2A", border:"1px solid rgba(196,154,42,0.25)", fontSize:7 }}>
                                {article.warnings} warning{article.warnings !== 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                          {/* Progress bar */}
                          <div className="mt-2 relative rounded-full overflow-hidden"
                               style={{ height:4, backgroundColor:"var(--neu-bg)", boxShadow:"var(--neu-inset)" }}>
                            <div className="h-full rounded-full transition-all duration-500"
                                 style={{ width:`${article.compliancePercent}%`, backgroundColor: pctColor }} />
                          </div>
                        </div>
                        {/* Checklist link */}
                        <Link href={`/admin/articles/${article.slug}/seo-checklist`}
                              className="flex items-center gap-1 px-3 py-2 rounded-lg flex-shrink-0"
                              style={{ backgroundColor: pctBg, fontFamily:"'IBM Plex Mono',monospace", fontSize:8, fontWeight:600, color: pctColor, textDecoration:"none", textTransform:"uppercase", letterSpacing:0.8 }}>
                          <Eye size={11} /> Checklist
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Legacy audit results (from content-indexing API) */}
          {auditResult && !complianceResult && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label:"Passing",    val: auditResult.passed,    color:"#2D5A3D" },
                  { label:"Failing",    val: auditResult.failed,    color:"#C8322B" },
                  { label:"Avg Score",  val: `${auditResult.avgScore}`, color: auditResult.avgScore>=70?"#2D5A3D":auditResult.avgScore>=40?"#C49A2A":"#C8322B" },
                  { label:"Auto-Fixed", val: auditResult.autoFixed, color:"#4A7BA8" },
                ].map(({ label, val, color }) => (
                  <div key={label} className="text-center p-4 rounded-xl"
                       style={{ backgroundColor:"var(--neu-bg)", boxShadow:"var(--neu-flat)" }}>
                    <div style={{ fontFamily:"'Anybody',sans-serif", fontWeight:800, fontSize:24, color }}>{val}</div>
                    <div className="neu-section-label mt-1">{label}</div>
                  </div>
                ))}
              </div>
              {auditResult.issues && auditResult.issues.length > 0 && (
                <div className="neu-card">
                  <div style={{ fontFamily:"'Anybody',sans-serif", fontWeight:700, fontSize:14, color:"#1C1917" }} className="mb-3">
                    Failing Articles ({auditResult.issues.length})
                  </div>
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {auditResult.issues.map((item, i) => (
                      <div key={i} className="p-3 rounded-xl" style={{ backgroundColor:"var(--neu-bg)", boxShadow:"var(--neu-flat)" }}>
                        <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, fontWeight:600, color:"#1C1917" }} className="truncate">
                          {item.url}
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {item.issues.map((iss, j) => (
                            <span key={j} className="neu-badge neu-badge-red" style={{ fontSize:8 }}>{iss}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
