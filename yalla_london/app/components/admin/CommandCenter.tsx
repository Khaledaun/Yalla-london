"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  RefreshCw, AlertTriangle, CheckCircle, XCircle, Clock, Globe, Zap,
  Play, Send, Loader2, Activity, ArrowRight, Search, FileText,
  Lightbulb, Database, ExternalLink, Eye, BarChart3, MapPin,
  TrendingUp, Radio, Shield, Cpu, Bell, ChevronRight, ChevronDown,
  Anchor, Ship, MessageSquare,
} from "lucide-react";

type Health = "green" | "yellow" | "red" | "gray";

interface PipelineStage {
  total: number; health: Health;
  byStatus?: Record<string, number>; byPhase?: Record<string, number>;
  phases?: string[]; today?: number; submitted?: number;
  discovered?: number; errors?: number; indexRate?: number;
}
interface Alert {
  id: string; severity: "critical" | "warning" | "info";
  jobName: string; error: string; errorStack: string | null;
  timestamp: string; duration: number | null;
  itemsProcessed: number; itemsFailed: number; sites: string[];
}
interface CronJob {
  name: string; lastRun: string; lastStatus: string;
  lastDuration: number | null; schedule: string;
  runs24h: number; failures24h: number; health: Health; lastError: string | null;
}
interface SiteData {
  siteId: string; name: string; domain: string; locale: string;
  articles: number; topics: number; drafts: number; indexed: number;
  active: boolean; health: Health;
}
interface IndexEntry {
  url: string; status: string; siteId: string;
  indexingState: string | null; coverageState: string | null;
  submittedAt: string | null; crawledAt: string | null; error: string | null;
}
interface LogEntry {
  id: string; jobName: string; status: string; startedAt: string;
  duration: number | null; items: number; succeeded: number;
  failed: number; error: string | null; timedOut: boolean;
}
interface OverviewData {
  pipeline: Record<string, PipelineStage>; alerts: Alert[];
  crons: CronJob[]; sites: SiteData[];
  indexing: { totalUrls: number; indexed: number; submitted: number;
    discovered: number; errors: number; indexRate: number;
    recentSubmissions: IndexEntry[]; };
  recentLogs: LogEntry[]; generatedAt: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

const HC: Record<Health, { dot: string; text: string; bg: string }> = {
  green:  { dot: "#2D5A3D", text: "#2D5A3D", bg: "rgba(45,90,61,0.08)" },
  yellow: { dot: "#C49A2A", text: "#C49A2A", bg: "rgba(196,154,42,0.08)" },
  red:    { dot: "#C8322B", text: "#C8322B", bg: "rgba(200,50,43,0.08)" },
  gray:   { dot: "#78716C", text: "#78716C", bg: "rgba(120,113,108,0.08)" },
};

function HDot({ h }: { h: Health }) {
  return (
    <span style={{ display:"inline-block", width:8, height:8, borderRadius:"50%",
      backgroundColor: HC[h].dot, flexShrink:0,
      boxShadow: h==="green" ? `0 0 0 3px ${HC[h].bg}` : undefined }} />
  );
}

function KPICard({ label, labelAr, value, sub, variant, icon: Icon }: {
  label: string; labelAr: string; value: number | string;
  sub?: string; variant: "red"|"gold"|"stamp"|"forest"; icon: React.ElementType;
}) {
  const col = { red:"#C8322B", gold:"#C49A2A", stamp:"#4A7BA8", forest:"#2D5A3D" }[variant];
  return (
    <div className="neu-card" style={{ transition:"box-shadow 200ms" }}>
      <div className="flex items-start justify-between mb-4">
        <div style={{ width:50, height:50, borderRadius:"50%", backgroundColor:"var(--neu-bg,#EDE9E1)",
          boxShadow:"var(--neu-inset)", display:"flex", alignItems:"center",
          justifyContent:"center", color: col, flexShrink:0 }}>
          <Icon size={20} />
        </div>
      </div>
      <div className="neu-kpi-number">{typeof value==="number" ? value.toLocaleString() : value}</div>
      <div className="neu-section-label mt-1">{label}</div>
      <div style={{ fontFamily:"'IBM Plex Sans Arabic',sans-serif", fontSize:11, color:"#78716C", letterSpacing:0 }}>{labelAr}</div>
      {sub && <div className="neu-section-label mt-2" style={{ opacity:0.7 }}>{sub}</div>}
    </div>
  );
}

function PipelineFlow({ pipeline }: { pipeline: Record<string, PipelineStage> }) {
  const stages = [
    { key:"topics",    label:"Topics",    icon:Lightbulb, href:"/admin/topics" },
    { key:"drafts",    label:"Drafts",    icon:FileText,  href:"/admin/pipeline" },
    { key:"published", label:"Published", icon:Globe,     href:"/admin/articles" },
    { key:"indexed",   label:"Indexed",   icon:Search,    href:"/admin/seo" },
  ];
  return (
    <div className="neu-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div style={{ fontFamily:"'Anybody',sans-serif", fontWeight:700, fontSize:16, color:"#1C1917" }}>Content Pipeline</div>
          <div style={{ fontFamily:"'IBM Plex Sans Arabic',sans-serif", fontSize:11, color:"#78716C", letterSpacing:0 }}>مسار إنتاج المحتوى</div>
        </div>
        <Link href="/admin/content?tab=generation" className="flex items-center gap-1 px-3 py-1.5 rounded-lg"
              style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, fontWeight:600, textTransform:"uppercase",
                letterSpacing:1, color:"#4A7BA8", backgroundColor:"rgba(74,123,168,0.08)" }}>
          <Eye size={11} /> Monitor
        </Link>
      </div>
      <div className="flex items-center gap-2">
        {stages.map((s, i) => {
          const d = pipeline[s.key]; const Icon = s.icon; const h = d?.health ?? "gray";
          return (
            <div key={s.key} className="flex items-center gap-2 flex-1 min-w-0">
              <Link href={s.href} className="flex-1 min-w-0">
                <div className="rounded-xl p-3 text-center transition-all"
                     style={{ backgroundColor:"var(--neu-bg)", boxShadow:"var(--neu-flat)", cursor:"pointer" }}>
                  <div className="flex items-center justify-center mb-1.5"><Icon size={14} style={{ color: HC[h].dot }} /></div>
                  <div style={{ fontFamily:"'Anybody',sans-serif", fontWeight:800, fontSize:18, color:"#1C1917" }}>{d?.total ?? 0}</div>
                  <div className="neu-section-label mt-0.5 truncate">{s.label}</div>
                  <div className="flex justify-center mt-1"><HDot h={h} /></div>
                </div>
              </Link>
              {i < stages.length - 1 && <ChevronRight size={14} style={{ color:"#D6D0C4", flexShrink:0 }} />}
            </div>
          );
        })}
      </div>
      {pipeline.drafts?.byPhase && Object.keys(pipeline.drafts.byPhase).length > 0 && (
        <div className="mt-4 pt-3" style={{ borderTop:"1px solid rgba(120,113,108,0.12)" }}>
          <div className="neu-section-label mb-2">Draft Phases</div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(pipeline.drafts.byPhase).map(([p, c]) => (
              <span key={p} className="neu-badge neu-badge-stamp">{p}: {c}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const ACTIONS = [
  { label:"Generate",    url:"/api/admin/full-pipeline-run",  icon:Zap,       col:"#C49A2A", sh:"rgba(196,154,42,0.25)" },
  { label:"Publish",     url:"/api/admin/publish-all-ready",  icon:Send,      col:"#2D5A3D", sh:"rgba(45,90,61,0.25)" },
  { label:"Run Crons",   url:"/api/admin/run-all-crons",      icon:Play,      col:"#4A7BA8", sh:"rgba(74,123,168,0.25)" },
  { label:"Seed Topics", url:"/api/admin/seed-topics",        icon:Lightbulb, col:"#C8322B", sh:"rgba(200,50,43,0.25)" },
  { label:"Seed Walks",  url:"/api/admin/seed-walks",         icon:MapPin,    col:"#4A7BA8", sh:"rgba(74,123,168,0.25)" },
];

function QuickActions({ onAction, running }: { onAction:(l:string,u:string)=>void; running:string|null }) {
  return (
    <div className="neu-card">
      <div style={{ fontFamily:"'Anybody',sans-serif", fontWeight:700, fontSize:16, color:"#1C1917" }} className="mb-1">Quick Actions</div>
      <div style={{ fontFamily:"'IBM Plex Sans Arabic',sans-serif", fontSize:11, color:"#78716C", letterSpacing:0 }} className="mb-4">إجراءات سريعة</div>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {ACTIONS.map((a) => {
          const Icon = a.icon; const isRun = running === a.label;
          return (
            <button key={a.label} onClick={() => onAction(a.label, a.url)} disabled={!!running}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all"
                    style={{ backgroundColor:"var(--neu-bg)", boxShadow: isRun ? "var(--neu-inset)" : "var(--neu-raised)",
                      opacity: running && !isRun ? 0.5 : 1, cursor: running ? "not-allowed" : "pointer" }}>
              <div style={{ width:36, height:36, borderRadius:"50%", backgroundColor: a.col,
                boxShadow:`2px 2px 6px ${a.sh}`, display:"flex", alignItems:"center",
                justifyContent:"center", color:"#FAF8F4" }}>
                {isRun ? <Loader2 size={16} className="animate-spin" /> : <Icon size={16} />}
              </div>
              <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:8, fontWeight:600,
                textTransform:"uppercase", letterSpacing:1, color:"#1C1917", textAlign:"center" }}>
                {isRun ? "Running" : a.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SiteHealthGrid({ sites }: { sites: SiteData[] }) {
  return (
    <div className="neu-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div style={{ fontFamily:"'Anybody',sans-serif", fontWeight:700, fontSize:16, color:"#1C1917" }}>Sites Overview</div>
          <div style={{ fontFamily:"'IBM Plex Sans Arabic',sans-serif", fontSize:11, color:"#78716C", letterSpacing:0 }}>نظرة عامة على المواقع</div>
        </div>
        <Link href="/admin/command-center/sites" className="flex items-center gap-1 px-3 py-1.5 rounded-lg"
              style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, fontWeight:600, textTransform:"uppercase",
                letterSpacing:1, color:"#4A7BA8", backgroundColor:"rgba(74,123,168,0.08)" }}>
          All Sites <ChevronRight size={11} />
        </Link>
      </div>
      <div className="space-y-2">
        {sites.length === 0 && (
          <div className="text-center py-8" style={{ color:"#78716C" }}>
            <Globe size={24} className="mx-auto mb-2 opacity-30" />
            <p style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, textTransform:"uppercase", letterSpacing:1 }}>No sites configured</p>
          </div>
        )}
        {sites.map((site) => (
          <div key={site.siteId} className="flex items-center gap-3 px-3 py-3 rounded-xl"
               style={{ backgroundColor:"var(--neu-bg)", boxShadow:"var(--neu-flat)" }}>
            <HDot h={site.health} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span style={{ fontFamily:"'Anybody',sans-serif", fontWeight:700, fontSize:12, color:"#1C1917" }}>{site.name}</span>
                <span className="neu-badge" style={{ backgroundColor: site.active?"rgba(45,90,61,0.1)":"rgba(120,113,108,0.1)",
                  color: site.active?"#2D5A3D":"#78716C", border:"none", fontSize:7 }}>
                  {site.active ? "LIVE" : "OFF"}
                </span>
              </div>
              <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:"#78716C" }}>{site.domain}</div>
            </div>
            <div className="flex items-center gap-4 flex-shrink-0">
              {[["Articles",site.articles],["Topics",site.topics],["Drafts",site.drafts],["Indexed",site.indexed]].map(([l,v]) => (
                <div key={String(l)} className="text-center hidden sm:block">
                  <div style={{ fontFamily:"'Anybody',sans-serif", fontWeight:700, fontSize:14, color:"#1C1917" }}>{v}</div>
                  <div className="neu-section-label" style={{ fontSize:7 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AlertsPanel({ alerts }: { alerts: Alert[] }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? alerts : alerts.slice(0, 3);
  const criticals = alerts.filter(a => a.severity==="critical").length;
  const sev = { critical:{ badge:"neu-badge-red", dot:"#C8322B" }, warning:{ badge:"neu-badge-gold", dot:"#C49A2A" }, info:{ badge:"neu-badge-stamp", dot:"#4A7BA8" } };
  return (
    <div className="neu-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div>
            <div style={{ fontFamily:"'Anybody',sans-serif", fontWeight:700, fontSize:16, color:"#1C1917" }}>Alerts</div>
            <div style={{ fontFamily:"'IBM Plex Sans Arabic',sans-serif", fontSize:11, color:"#78716C", letterSpacing:0 }}>التنبيهات</div>
          </div>
          {criticals>0 && <span className="neu-badge neu-badge-red">{criticals} critical</span>}
        </div>
        <Link href="/admin/cron-logs" className="flex items-center gap-1 px-3 py-1.5 rounded-lg"
              style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, fontWeight:600, textTransform:"uppercase",
                letterSpacing:1, color:"#4A7BA8", backgroundColor:"rgba(74,123,168,0.08)" }}>
          All Logs <ChevronRight size={11} />
        </Link>
      </div>
      {alerts.length===0 ? (
        <div className="flex items-center gap-3 px-3 py-4 rounded-xl" style={{ backgroundColor:"rgba(45,90,61,0.06)" }}>
          <CheckCircle size={18} style={{ color:"#2D5A3D", flexShrink:0 }} />
          <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:"#2D5A3D", textTransform:"uppercase", letterSpacing:1 }}>All systems healthy</span>
        </div>
      ) : (
        <div className="space-y-2">
          {shown.map((a) => (
            <div key={a.id} className="flex items-start gap-3 px-3 py-3 rounded-xl"
                 style={{ backgroundColor:"var(--neu-bg)", boxShadow:"var(--neu-flat)" }}>
              <div style={{ width:6, height:6, borderRadius:"50%", backgroundColor: sev[a.severity].dot, marginTop:5, flexShrink:0 }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, fontWeight:600, color:"#1C1917" }}>{a.jobName}</span>
                  <span className={`neu-badge ${sev[a.severity].badge}`}>{a.severity}</span>
                </div>
                <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:"#78716C", marginTop:2 }} className="truncate">{a.error}</div>
                <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:8, color:"#78716C", marginTop:1 }}>
                  {timeAgo(a.timestamp)}{a.itemsFailed>0 && ` · ${a.itemsFailed} failed`}
                </div>
              </div>
            </div>
          ))}
          {alerts.length>3 && (
            <button onClick={() => setExpanded(!expanded)} className="w-full py-2 rounded-xl flex items-center justify-center gap-1"
                    style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, textTransform:"uppercase", letterSpacing:1,
                      color:"#78716C", boxShadow:"var(--neu-flat)", backgroundColor:"var(--neu-bg)" }}>
              <ChevronDown size={12} style={{ transform: expanded?"rotate(180deg)":undefined, transition:"transform 200ms" }} />
              {expanded ? "Collapse" : `Show ${alerts.length-3} more`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function IndexingSummary({ data }: { data: OverviewData["indexing"] }) {
  const pct = data.totalUrls>0 ? Math.round((data.indexed/data.totalUrls)*100) : 0;
  const barColor = pct>=70 ? "#2D5A3D" : pct>=30 ? "#C49A2A" : "#C8322B";
  return (
    <div className="neu-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div style={{ fontFamily:"'Anybody',sans-serif", fontWeight:700, fontSize:16, color:"#1C1917" }}>Indexing Status</div>
          <div style={{ fontFamily:"'IBM Plex Sans Arabic',sans-serif", fontSize:11, color:"#78716C", letterSpacing:0 }}>حالة الفهرسة</div>
        </div>
        <Link href="/admin/seo" className="flex items-center gap-1 px-3 py-1.5 rounded-lg"
              style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, fontWeight:600, textTransform:"uppercase",
                letterSpacing:1, color:"#4A7BA8", backgroundColor:"rgba(74,123,168,0.08)" }}>
          Full Center <ChevronRight size={11} />
        </Link>
      </div>
      <div className="relative rounded-full overflow-hidden mb-4"
           style={{ height:10, backgroundColor:"var(--neu-bg)", boxShadow:"var(--neu-inset)" }}>
        <div className="h-full rounded-full transition-all duration-500"
             style={{ width:`${pct}%`, backgroundColor: barColor }} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[["Total",data.totalUrls,"#1C1917"],["Indexed",data.indexed,"#2D5A3D"],["Submitted",data.submitted,"#C49A2A"],["Errors",data.errors,"#C8322B"]].map(([l,v,c]) => (
          <div key={String(l)} className="text-center p-3 rounded-xl"
               style={{ backgroundColor:"var(--neu-bg)", boxShadow:"var(--neu-flat)" }}>
            <div style={{ fontFamily:"'Anybody',sans-serif", fontWeight:800, fontSize:20, color: String(c) }}>{v}</div>
            <div className="neu-section-label mt-0.5">{l}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between px-1">
        <span className="neu-section-label">Index rate</span>
        <span style={{ fontFamily:"'Anybody',sans-serif", fontWeight:700, fontSize:14, color: barColor }}>{pct}%</span>
      </div>
    </div>
  );
}

function CronHealth({ crons }: { crons: CronJob[] }) {
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? crons : crons.slice(0, 5);
  const failing = crons.filter(c => c.health==="red").length;
  return (
    <div className="neu-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div>
            <div style={{ fontFamily:"'Anybody',sans-serif", fontWeight:700, fontSize:16, color:"#1C1917" }}>Cron Health</div>
            <div style={{ fontFamily:"'IBM Plex Sans Arabic',sans-serif", fontSize:11, color:"#78716C", letterSpacing:0 }}>صحة المهام المجدولة</div>
          </div>
          {failing>0 && <span className="neu-badge neu-badge-red">{failing} failing</span>}
        </div>
        <Link href="/admin/cron-logs" className="flex items-center gap-1 px-3 py-1.5 rounded-lg"
              style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, fontWeight:600, textTransform:"uppercase",
                letterSpacing:1, color:"#4A7BA8", backgroundColor:"rgba(74,123,168,0.08)" }}>
          Logs <ChevronRight size={11} />
        </Link>
      </div>
      <div className="space-y-1.5">
        {shown.map((c) => (
          <div key={c.name} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
               style={{ backgroundColor:"var(--neu-bg)", boxShadow:"var(--neu-flat)" }}>
            <HDot h={c.health} />
            <div className="flex-1 min-w-0">
              <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, fontWeight:600, color:"#1C1917", textTransform:"uppercase", letterSpacing:0.5 }} className="truncate">
                {c.name}
              </div>
              {c.lastError && <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:8, color:"#C8322B", marginTop:1 }} className="truncate">{c.lastError}</div>}
            </div>
            <div className="text-right flex-shrink-0">
              <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:8, color:"#78716C" }}>{c.runs24h}r / {c.failures24h}f</div>
              <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:8, color:"#78716C" }}>{c.lastRun ? timeAgo(c.lastRun) : "never"}</div>
            </div>
          </div>
        ))}
        {crons.length>5 && (
          <button onClick={() => setShowAll(!showAll)} className="w-full py-2 rounded-xl flex items-center justify-center gap-1"
                  style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, textTransform:"uppercase", letterSpacing:1,
                    color:"#78716C", boxShadow:"var(--neu-flat)", backgroundColor:"var(--neu-bg)" }}>
            <ChevronDown size={12} style={{ transform: showAll?"rotate(180deg)":undefined, transition:"transform 200ms" }} />
            {showAll ? "Collapse" : `${crons.length-5} more`}
          </button>
        )}
      </div>
    </div>
  );
}

function RecentLog({ logs }: { logs: LogEntry[] }) {
  return (
    <div className="neu-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div style={{ fontFamily:"'Anybody',sans-serif", fontWeight:700, fontSize:16, color:"#1C1917" }}>Recent Activity</div>
          <div style={{ fontFamily:"'IBM Plex Sans Arabic',sans-serif", fontSize:11, color:"#78716C", letterSpacing:0 }}>النشاط الأخير</div>
        </div>
        <Link href="/admin/cron-logs" className="flex items-center gap-1 px-3 py-1.5 rounded-lg"
              style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, fontWeight:600, textTransform:"uppercase",
                letterSpacing:1, color:"#4A7BA8", backgroundColor:"rgba(74,123,168,0.08)" }}>
          Full Log <ChevronRight size={11} />
        </Link>
      </div>
      <div className="space-y-1.5">
        {logs.slice(0,8).map((l) => {
          const ok = l.status==="success";
          return (
            <div key={l.id} className="flex items-center gap-3 px-3 py-2 rounded-xl"
                 style={{ backgroundColor:"var(--neu-bg)", boxShadow:"var(--neu-flat)" }}>
              <div style={{ width:6, height:6, borderRadius:"50%", backgroundColor: ok?"#2D5A3D":"#C8322B", flexShrink:0 }} />
              <div className="flex-1 min-w-0">
                <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, fontWeight:600, color:"#1C1917", textTransform:"uppercase", letterSpacing:0.5 }} className="truncate block">
                  {l.jobName}
                </span>
              </div>
              <div className="text-right flex-shrink-0">
                <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:8, color: ok?"#2D5A3D":"#C8322B" }}>{l.succeeded}/{l.items}</div>
                <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:8, color:"#78716C" }}>{timeAgo(l.startedAt)}</div>
              </div>
            </div>
          );
        })}
        {logs.length===0 && (
          <div className="text-center py-4" style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:"#78716C", textTransform:"uppercase", letterSpacing:1 }}>
            No logs yet
          </div>
        )}
      </div>
    </div>
  );
}

interface YachtAnalytics {
  fleet: { total: number; active: number; featured: number; avgPricePerWeek: number | null };
  inquiries: { total: number; thisMonth: number; byStatus: Record<string, number>; conversionRate: number };
  destinations: { total: number };
}

function YachtPlatformCard({ sites }: { sites: SiteData[] }) {
  const [yachtData, setYachtData] = useState<YachtAnalytics | null>(null);
  const [yachtLoading, setYachtLoading] = useState(true);
  const [yachtError, setYachtError] = useState(false);

  const hasYachtSite = sites.some(s => s.siteId === "zenitha-yachts-med");

  useEffect(() => {
    let cancelled = false;
    if (!hasYachtSite) {
      setYachtLoading(false);
    } else {
      (async () => {
        try {
          const res = await fetch("/api/admin/yachts/analytics?siteId=zenitha-yachts-med");
          if (!res.ok) throw new Error("HTTP " + res.status);
          const json = await res.json();
          if (!cancelled) setYachtData(json);
        } catch {
          if (!cancelled) setYachtError(true);
        } finally {
          if (!cancelled) setYachtLoading(false);
        }
      })();
    }
    return () => { cancelled = true; };
  }, [hasYachtSite]);

  if (!hasYachtSite) return null;

  const activeInquiries = yachtData
    ? (yachtData.inquiries.byStatus["NEW"] ?? 0) + (yachtData.inquiries.byStatus["CONTACTED"] ?? 0)
    : 0;

  const YACHT_LINKS = [
    { label: "Fleet Inventory", href: "/admin/yachts", icon: Ship },
    { label: "Inquiries",       href: "/admin/yachts/inquiries", icon: MessageSquare },
    { label: "Destinations",    href: "/admin/yachts/destinations", icon: MapPin },
    { label: "Analytics",       href: "/admin/yachts/analytics", icon: BarChart3 },
  ];

  return (
    <div className="neu-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div style={{ width:36, height:36, borderRadius:"50%", backgroundColor:"rgba(74,123,168,0.12)",
            display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Anchor size={18} style={{ color:"#4A7BA8" }} />
          </div>
          <div>
            <div style={{ fontFamily:"'Anybody',sans-serif", fontWeight:700, fontSize:16, color:"#1C1917" }}>Yacht Platform</div>
            <div style={{ fontFamily:"'IBM Plex Sans Arabic',sans-serif", fontSize:11, color:"#78716C", letterSpacing:0 }}>منصة اليخوت</div>
          </div>
        </div>
        <span className="neu-badge" style={{ backgroundColor:"rgba(74,123,168,0.1)", color:"#4A7BA8", border:"none", fontSize:7 }}>
          ZENITHA YACHTS
        </span>
      </div>

      {yachtLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 size={18} className="animate-spin" style={{ color:"#78716C" }} />
        </div>
      ) : yachtError ? (
        <div className="flex items-center gap-3 px-3 py-4 rounded-xl" style={{ backgroundColor:"rgba(200,50,43,0.06)" }}>
          <XCircle size={16} style={{ color:"#C8322B", flexShrink:0 }} />
          <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:"#C8322B", textTransform:"uppercase", letterSpacing:1 }}>
            Could not load yacht data — tables may not be migrated yet
          </span>
        </div>
      ) : (
        <>
          {/* KPI Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {[
              ["Fleet Size", yachtData?.fleet.total ?? 0, "#4A7BA8"],
              ["Active Inquiries", activeInquiries, activeInquiries > 0 ? "#C49A2A" : "#78716C"],
              ["This Month", yachtData?.inquiries.thisMonth ?? 0, "#2D5A3D"],
              ["Conversion", (yachtData?.inquiries.conversionRate ?? 0) + "%", "#C8322B"],
            ].map(([label, value, color]) => (
              <div key={String(label)} className="text-center p-3 rounded-xl"
                   style={{ backgroundColor:"var(--neu-bg)", boxShadow:"var(--neu-flat)" }}>
                <div style={{ fontFamily:"'Anybody',sans-serif", fontWeight:800, fontSize:20, color: String(color) }}>{value}</div>
                <div className="neu-section-label mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {YACHT_LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <Link key={link.href} href={link.href} className="flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all"
                      style={{ backgroundColor:"var(--neu-bg)", boxShadow:"var(--neu-flat)" }}>
                  <Icon size={14} style={{ color:"#4A7BA8", flexShrink:0 }} />
                  <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:8, fontWeight:600, textTransform:"uppercase",
                    letterSpacing:0.5, color:"#1C1917" }}>
                    {link.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default function CommandCenter() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [runningAction, setRunningAction] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/command-center/overview");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    const t = setInterval(fetchData, 30_000);
    return () => clearInterval(t);
  }, [fetchData]);

  const runAction = async (label: string, url: string) => {
    setRunningAction(label); setActionMsg(null);
    try {
      const res = await fetch(url, { method:"POST" });
      const json = await res.json();
      setActionMsg({ ok: res.ok, text: json.message || json.error || (res.ok?"Done":"Failed") });
      await fetchData();
    } catch {
      setActionMsg({ ok: false, text:`${label}: Network error` });
    } finally {
      setRunningAction(null);
    }
  };

  if (loading && !data) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
             style={{ backgroundColor:"var(--neu-bg,#EDE9E1)", boxShadow:"var(--neu-raised)" }}>
          <Loader2 size={24} className="animate-spin" style={{ color:"#C8322B" }} />
        </div>
        <p style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:"#78716C", textTransform:"uppercase", letterSpacing:2 }}>
          Loading HQ Dashboard
        </p>
      </div>
    </div>
  );

  if (error && !data) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="neu-card text-center max-w-sm mx-auto">
        <XCircle size={28} className="mx-auto mb-3" style={{ color:"#C8322B" }} />
        <p style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:11, color:"#C8322B", textTransform:"uppercase", letterSpacing:1 }}>{error}</p>
        <button onClick={fetchData} className="mt-4 neu-btn-secondary px-4 py-2 text-xs">Retry</button>
      </div>
    </div>
  );

  if (!data) return null;

  const criticalCount = data.alerts.filter(a => a.severity==="critical").length;

  return (
    <div className="space-y-4 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontFamily:"'Anybody',sans-serif", fontWeight:800, fontSize:24, color:"#1C1917", letterSpacing:-0.5 }}>
            HQ Dashboard
          </h1>
          <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:"#78716C", textTransform:"uppercase", letterSpacing:2, marginTop:2 }}>
            Updated {timeAgo(data.generatedAt)} · Auto-refresh 30s
          </div>
        </div>
        <button onClick={fetchData} className="p-2.5 rounded-xl transition-all"
                style={{ backgroundColor:"var(--neu-bg)", boxShadow: loading?"var(--neu-inset)":"var(--neu-flat)" }}>
          <RefreshCw size={16} className={loading?"animate-spin":""} style={{ color:"#78716C" }} />
        </button>
      </div>

      {/* Critical alert banner */}
      {criticalCount>0 && (
        <Link href="/admin/cron-logs" className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
              style={{ backgroundColor:"rgba(200,50,43,0.06)", border:"1px solid rgba(200,50,43,0.2)" }}>
          <AlertTriangle size={18} style={{ color:"#C8322B", flexShrink:0 }} />
          <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, fontWeight:600, color:"#C8322B", textTransform:"uppercase", letterSpacing:1 }}>
            {criticalCount} critical alert{criticalCount!==1?"s":""} in the last 24h
          </span>
          <ArrowRight size={14} style={{ color:"#C8322B", marginLeft:"auto", flexShrink:0 }} />
        </Link>
      )}

      {/* Action feedback */}
      {actionMsg && (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl"
             style={{ backgroundColor: actionMsg.ok?"rgba(45,90,61,0.06)":"rgba(200,50,43,0.06)",
               border:`1px solid ${actionMsg.ok?"rgba(45,90,61,0.2)":"rgba(200,50,43,0.2)"}` }}>
          <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color: actionMsg.ok?"#2D5A3D":"#C8322B", textTransform:"uppercase", letterSpacing:1 }}>
            {actionMsg.text}
          </span>
          <button onClick={() => setActionMsg(null)} style={{ color:"#78716C", fontSize:16, lineHeight:1, cursor:"pointer" }}>×</button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard label="Topics"    labelAr="موضوعات" value={data.pipeline.topics?.total ?? 0}    icon={Lightbulb} variant="gold"   sub="in pipeline" />
        <KPICard label="Drafts"    labelAr="مسودات"  value={data.pipeline.drafts?.total ?? 0}    icon={FileText}  variant="stamp"  sub="in build" />
        <KPICard label="Published" labelAr="منشورات" value={data.pipeline.published?.total ?? 0} icon={Globe}     variant="forest" sub="live articles" />
        <KPICard label="Indexed"   labelAr="مفهرسة"  value={data.indexing?.indexed ?? 0}         icon={Search}    variant="red"    sub={`${data.indexing?.indexRate ?? 0}% rate`} />
      </div>

      {/* Quick Actions */}
      <QuickActions onAction={runAction} running={runningAction} />

      {/* Pipeline Flow */}
      <PipelineFlow pipeline={data.pipeline} />

      {/* 2-col: Indexing + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <IndexingSummary data={data.indexing} />
        <AlertsPanel alerts={data.alerts} />
      </div>

      {/* 2-col: Sites + Cron Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SiteHealthGrid sites={data.sites} />
        <CronHealth crons={data.crons} />
      </div>

      {/* Yacht Platform — shows only when zenitha-yachts-med is configured */}
      <YachtPlatformCard sites={data.sites} />

      {/* Recent Log */}
      <RecentLog logs={data.recentLogs} />
    </div>
  );
}
