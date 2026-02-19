'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Activity, AlertTriangle, CheckCircle, ChevronDown, ChevronLeft,
  ChevronRight, Clock, Filter, Loader2, RefreshCw, Server, Timer, XCircle,
} from 'lucide-react';

interface CronLog {
  id: string; jobName: string; jobType: string; status: string;
  startedAt: string; completedAt: string | null; durationMs: number | null;
  itemsProcessed: number; itemsSucceeded: number; itemsFailed: number;
  errorMessage: string | null; sitesProcessed: string[]; sitesSkipped: string[];
  timedOut: boolean; resultSummary: Record<string, unknown> | null; siteId: string | null;
}

interface CronLogsResponse {
  logs: CronLog[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  filters: { availableJobs: string[]; timeRange: string; since: string };
  summary: { total: number; completed: number; failed: number; timedOut: number; running: number; partial: number };
  error?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof CheckCircle }> = {
  completed: { label: 'Completed', color: '#2D5A3D', bg: 'rgba(45,90,61,0.1)',   icon: CheckCircle },
  failed:    { label: 'Failed',    color: '#C8322B', bg: 'rgba(200,50,43,0.1)',  icon: XCircle },
  timed_out: { label: 'Timed Out', color: '#C49A2A', bg: 'rgba(196,154,42,0.1)', icon: Timer },
  running:   { label: 'Running',   color: '#4A7BA8', bg: 'rgba(74,123,168,0.1)', icon: Loader2 },
  partial:   { label: 'Partial',   color: '#C49A2A', bg: 'rgba(196,154,42,0.1)', icon: AlertTriangle },
};

const TIME_RANGES = [
  { label: '24h', hours: 24 },
  { label: '3d',  hours: 72 },
  { label: '7d',  hours: 168 },
  { label: '30d', hours: 720 },
];

export default function CronLogsPage() {
  const [data, setData] = useState<CronLogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [jobFilter, setJobFilter] = useState('');
  const [hours, setHours] = useState(168);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '50', hours: String(hours) });
      if (statusFilter) params.set('status', statusFilter);
      if (jobFilter) params.set('job', jobFilter);
      const res = await fetch(`/api/admin/cron-logs?${params}`);
      setData(res.ok ? await res.json() : null);
    } catch { setData(null); }
    finally { setLoading(false); }
  }, [page, statusFilter, jobFilter, hours]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useEffect(() => { setPage(1); }, [statusFilter, jobFilter, hours]);

  const fmt = (ms: number | null) => {
    if (ms === null) return '—';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };
  const ago = (iso: string) => {
    const d = new Date(iso); const now = Date.now();
    const m = Math.floor((now - d.getTime()) / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return d.toLocaleDateString('en-GB', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });
  };

  const summary = data?.summary;
  const SUMCARDS = summary ? [
    { label:'Total',      val: summary.total,     color:'#1C1917' },
    { label:'Completed',  val: summary.completed, color:'#2D5A3D' },
    { label:'Failed',     val: summary.failed,    color:'#C8322B' },
    { label:'Timed Out',  val: summary.timedOut,  color:'#C49A2A' },
    { label:'Running',    val: summary.running,   color:'#4A7BA8' },
    { label:'Rate', val: summary.total > 0 ? `${Math.round((summary.completed/summary.total)*100)}%` : '—',
      color: summary.total > 0 && summary.completed/summary.total >= 0.9 ? '#2D5A3D' : '#C49A2A' },
  ] : [];

  return (
    <div className="max-w-7xl mx-auto space-y-4">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/health-monitoring"
                className="p-2 rounded-xl transition-all"
                style={{ backgroundColor:'var(--neu-bg)', boxShadow:'var(--neu-flat)', color:'#78716C' }}>
            <ChevronLeft size={16} />
          </Link>
          <div>
            <h1 style={{ fontFamily:"'Anybody',sans-serif", fontWeight:800, fontSize:24, color:'#1C1917', letterSpacing:-0.5 }}>
              Cron Logs
            </h1>
            <div style={{ fontFamily:"'IBM Plex Sans Arabic',sans-serif", fontSize:12, color:'#78716C', letterSpacing:0, marginTop:2 }}>
              سجلات المهام المجدولة
            </div>
          </div>
        </div>
        <button onClick={fetchLogs} disabled={loading}
                className="p-2.5 rounded-xl transition-all"
                style={{ backgroundColor:'var(--neu-bg)', boxShadow: loading?'var(--neu-inset)':'var(--neu-flat)', color:'#78716C' }}>
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* ── KPI Summary ─────────────────────────────────────────────── */}
      {summary && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {SUMCARDS.map(({ label, val, color }) => (
            <div key={label} className="text-center p-3 rounded-xl"
                 style={{ backgroundColor:'var(--neu-bg)', boxShadow:'var(--neu-flat)' }}>
              <div style={{ fontFamily:"'Anybody',sans-serif", fontWeight:800, fontSize:20, color }}>
                {typeof val === 'number' ? val.toLocaleString() : val}
              </div>
              <div className="neu-section-label mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Filters ─────────────────────────────────────────────────── */}
      <div className="neu-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Filter size={13} style={{ color:'#78716C', flexShrink:0 }} />

          {/* Time range */}
          <div className="flex gap-1">
            {TIME_RANGES.map((r) => (
              <button key={r.hours} onClick={() => setHours(r.hours)}
                      className="px-3 py-1.5 rounded-lg transition-all"
                      style={{ backgroundColor:'var(--neu-bg)', boxShadow: hours===r.hours?'var(--neu-inset)':'var(--neu-flat)',
                        fontFamily:"'IBM Plex Mono',monospace", fontSize:9, fontWeight: hours===r.hours?600:400,
                        textTransform:'uppercase', letterSpacing:0.8, color: hours===r.hours?'#C8322B':'#78716C' }}>
                {r.label}
              </button>
            ))}
          </div>

          {/* Status select */}
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                  className="neu-input"
                  style={{ fontSize:10, paddingTop:6, paddingBottom:6, width:'auto' }}>
            <option value="">All statuses</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="timed_out">Timed Out</option>
            <option value="running">Running</option>
          </select>

          {/* Job select */}
          <select value={jobFilter} onChange={e => setJobFilter(e.target.value)}
                  className="neu-input"
                  style={{ fontSize:10, paddingTop:6, paddingBottom:6, width:'auto' }}>
            <option value="">All jobs</option>
            {data?.filters?.availableJobs?.map(j => <option key={j} value={j}>{j}</option>)}
          </select>

          {(statusFilter || jobFilter) && (
            <button onClick={() => { setStatusFilter(''); setJobFilter(''); }}
                    style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:'#C8322B', textTransform:'uppercase', letterSpacing:1 }}>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Logs List ───────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center"
                 style={{ backgroundColor:'var(--neu-bg)', boxShadow:'var(--neu-raised)' }}>
              <RefreshCw size={20} className="animate-spin" style={{ color:'#C8322B' }} />
            </div>
            <p className="neu-section-label">Loading logs…</p>
          </div>
        </div>
      ) : !data || data.logs.length === 0 ? (
        <div className="neu-card text-center py-16">
          <Server size={28} className="mx-auto mb-3 opacity-20" style={{ color:'#78716C' }} />
          <p className="neu-section-label">No cron logs for this period</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.logs.map((log) => {
            const cfg = STATUS_CONFIG[log.status] ?? STATUS_CONFIG.failed;
            const Icon = cfg.icon;
            const isExp = expandedLog === log.id;

            return (
              <div key={log.id} className="neu-card" style={{ padding:'0' }}>
                <button onClick={() => setExpandedLog(isExp ? null : log.id)}
                        className="w-full text-left px-4 py-3 rounded-xl transition-all">

                  {/* Mobile */}
                  <div className="sm:hidden space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Icon size={14} style={{ color: cfg.color, flexShrink:0 }}
                              className={log.status==='running'?'animate-spin':''} />
                        <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, fontWeight:600, color:'#1C1917', textTransform:'uppercase', letterSpacing:0.5 }}>
                          {log.jobName}
                        </span>
                      </div>
                      <span className="neu-badge" style={{ backgroundColor: cfg.bg, color: cfg.color, fontSize:8 }}>
                        {cfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:8, color:'#78716C' }}>{ago(log.startedAt)}</span>
                      <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:8, color:'#78716C' }}>{fmt(log.durationMs)}</span>
                      {log.itemsProcessed > 0 && <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:8, color:'#78716C' }}>{log.itemsSucceeded}/{log.itemsProcessed}</span>}
                    </div>
                  </div>

                  {/* Desktop */}
                  <div className="hidden sm:grid sm:grid-cols-[1fr_100px_80px_80px_120px_20px] gap-3 items-center">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon size={14} style={{ color: cfg.color, flexShrink:0 }}
                            className={log.status==='running'?'animate-spin':''} />
                      <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, fontWeight:600, color:'#1C1917', textTransform:'uppercase', letterSpacing:0.5 }} className="truncate">
                        {log.jobName}
                      </span>
                      {log.sitesProcessed.length > 0 && (
                        <span className="neu-badge neu-badge-stamp" style={{ fontSize:8 }}>
                          {log.sitesProcessed.length}s
                        </span>
                      )}
                    </div>
                    <span className="neu-badge" style={{ backgroundColor: cfg.bg, color: cfg.color, fontSize:8, width:'fit-content' }}>
                      {cfg.label}
                    </span>
                    <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:'#78716C' }}>{fmt(log.durationMs)}</span>
                    <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9 }}>
                      {log.itemsProcessed > 0 ? (
                        <span>
                          <span style={{ color:'#2D5A3D' }}>{log.itemsSucceeded}</span>
                          {log.itemsFailed > 0 && <span style={{ color:'#C8322B' }}>/{log.itemsFailed}</span>}
                          <span style={{ color:'#78716C' }}>/{log.itemsProcessed}</span>
                        </span>
                      ) : <span style={{ color:'#78716C' }}>—</span>}
                    </span>
                    <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:'#78716C' }}>{ago(log.startedAt)}</span>
                    <ChevronDown size={12} style={{ color:'#78716C', transform: isExp?'rotate(180deg)':undefined, transition:'transform 200ms', flexShrink:0 }} />
                  </div>
                </button>

                {/* Expanded */}
                {isExp && (
                  <div className="px-4 pb-4 pt-2" style={{ borderTop:'1px solid rgba(120,113,108,0.12)' }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        {[
                          ['Job Type', log.jobType],
                          ['Started', new Date(log.startedAt).toLocaleString('en-GB')],
                          log.completedAt ? ['Completed', new Date(log.completedAt).toLocaleString('en-GB')] : null,
                          ['Duration', fmt(log.durationMs)],
                          log.siteId ? ['Site ID', log.siteId] : null,
                        ].filter(Boolean).map(([l, v]) => (
                          <div key={String(l)} className="flex items-start gap-2">
                            <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:8, color:'#78716C', minWidth:90, flexShrink:0 }}>{l}:</span>
                            <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:8, color:'#1C1917' }}>{v}</span>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-1.5">
                        {[
                          ['Processed', String(log.itemsProcessed)],
                          ['Succeeded', String(log.itemsSucceeded)],
                          ['Failed', String(log.itemsFailed)],
                          log.sitesProcessed.length > 0 ? ['Sites', log.sitesProcessed.join(', ')] : null,
                          log.timedOut ? ['Timed Out', 'Yes'] : null,
                        ].filter(Boolean).map(([l, v]) => (
                          <div key={String(l)} className="flex items-start gap-2">
                            <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:8, color:'#78716C', minWidth:90, flexShrink:0 }}>{l}:</span>
                            <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:8,
                              color: l==='Failed' && Number(v)>0 ? '#C8322B' : l==='Timed Out'?'#C49A2A' : '#1C1917' }}>
                              {v}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {log.errorMessage && (
                      <div className="mt-3 p-3 rounded-xl" style={{ backgroundColor:'rgba(200,50,43,0.05)', border:'1px solid rgba(200,50,43,0.15)' }}>
                        <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:8, fontWeight:600, color:'#C8322B', textTransform:'uppercase', letterSpacing:1, marginBottom:4 }}>
                          Error
                        </div>
                        <pre style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:'#C8322B', whiteSpace:'pre-wrap', wordBreak:'break-all' }}>
                          {log.errorMessage}
                        </pre>
                      </div>
                    )}
                    {log.resultSummary && Object.keys(log.resultSummary).length > 0 && (
                      <div className="mt-2 p-3 rounded-xl" style={{ backgroundColor:'rgba(120,113,108,0.06)', border:'1px solid rgba(120,113,108,0.12)' }}>
                        <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:8, fontWeight:600, color:'#78716C', textTransform:'uppercase', letterSpacing:1, marginBottom:4 }}>
                          Result Summary
                        </div>
                        <pre style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:'#78716C', whiteSpace:'pre-wrap', wordBreak:'break-all', maxHeight:120, overflow:'auto' }}>
                          {JSON.stringify(log.resultSummary, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pagination ──────────────────────────────────────────────── */}
      {data && data.pagination.totalPages > 1 && (
        <div className="neu-card flex items-center justify-between p-3">
          <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:'#78716C' }}>
            Page {data.pagination.page} of {data.pagination.totalPages} · {data.pagination.total} total
          </span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(Math.max(1, page-1))} disabled={page<=1}
                    className="p-2 rounded-lg transition-all"
                    style={{ backgroundColor:'var(--neu-bg)', boxShadow: page<=1?'var(--neu-inset)':'var(--neu-flat)', color:'#78716C', opacity: page<=1?0.4:1 }}>
              <ChevronLeft size={14} />
            </button>
            <button onClick={() => setPage(Math.min(data.pagination.totalPages, page+1))} disabled={page>=data.pagination.totalPages}
                    className="p-2 rounded-lg transition-all"
                    style={{ backgroundColor:'var(--neu-bg)', boxShadow: page>=data.pagination.totalPages?'var(--neu-inset)':'var(--neu-flat)', color:'#78716C', opacity: page>=data.pagination.totalPages?0.4:1 }}>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
