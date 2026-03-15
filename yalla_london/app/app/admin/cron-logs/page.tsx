'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Activity, AlertTriangle, CheckCircle, ChevronDown, ChevronLeft,
  ChevronRight, Clock, Filter, Loader2, RefreshCw, Server, Timer, XCircle,
  Calendar,
} from 'lucide-react';
import {
  AdminCard,
  AdminPageHeader,
  AdminButton,
  AdminKPICard,
  AdminLoadingState,
  AdminEmptyState,
  AdminStatusBadge,
  AdminTabs,
} from '@/components/admin/admin-ui';
import { CronSchedulePanel } from './cron-schedule-panel';

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
  running:   { label: 'Running',   color: '#3B7EA1', bg: 'rgba(59,126,161,0.1)', icon: Loader2 },
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
    } catch (e) { console.warn('[cron-logs] Failed to fetch logs:', e); setData(null); }
    finally { setLoading(false); }
  }, [page, statusFilter, jobFilter, hours]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useEffect(() => { setPage(1); }, [statusFilter, jobFilter, hours]);

  const fmt = (ms: number | null) => {
    if (ms === null) return '\u2014';
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
    { label:'Running',    val: summary.running,   color:'#3B7EA1' },
    { label:'Rate', val: summary.total > 0 ? `${Math.round((summary.completed/summary.total)*100)}%` : '\u2014',
      color: summary.total > 0 && summary.completed/summary.total >= 0.9 ? '#2D5A3D' : '#C49A2A' },
  ] : [];

  const [cronTab, setCronTab] = useState<'schedule' | 'logs'>('schedule');

  return (
    <div className="admin-page p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">

        {/* Header */}
        <AdminPageHeader
          title="Cron Monitor"
          subtitle="Scheduled task monitoring"
          backHref="/admin/health-monitoring"
          action={
            <AdminButton onClick={fetchLogs} loading={loading} variant="secondary" size="sm">
              <RefreshCw size={14} />
            </AdminButton>
          }
        />

        {/* Tab switcher */}
        <AdminTabs
          tabs={[
            { id: 'schedule', label: 'Schedule & Triggers' },
            { id: 'logs', label: 'Raw Log History' },
          ]}
          activeTab={cronTab}
          onTabChange={(id) => setCronTab(id as 'schedule' | 'logs')}
        />

        {/* Schedule Panel */}
        {cronTab === 'schedule' && <CronSchedulePanel />}

        {/* Raw Logs */}
        {cronTab === 'logs' && (<>
        {summary && (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {SUMCARDS.map(({ label, val, color }) => (
              <AdminKPICard
                key={label}
                value={typeof val === 'number' ? val.toLocaleString() : val}
                label={label}
                color={color}
              />
            ))}
          </div>
        )}

        {/* Filters */}
        <AdminCard>
          <div className="flex flex-wrap items-center gap-2">
            <Filter size={13} style={{ color:'#78716C', flexShrink:0 }} />

            {/* Time range */}
            <div className="flex gap-1">
              {TIME_RANGES.map((r) => (
                <button key={r.hours} onClick={() => setHours(r.hours)}
                        className={`admin-filter-pill ${hours === r.hours ? 'active' : ''}`}>
                  {r.label}
                </button>
              ))}
            </div>

            {/* Status select */}
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                    className="admin-select"
                    style={{ fontSize:10, paddingTop:6, paddingBottom:6, width:'auto' }}>
              <option value="">All statuses</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="timed_out">Timed Out</option>
              <option value="running">Running</option>
            </select>

            {/* Job select */}
            <select value={jobFilter} onChange={e => setJobFilter(e.target.value)}
                    className="admin-select"
                    style={{ fontSize:10, paddingTop:6, paddingBottom:6, width:'auto' }}>
              <option value="">All jobs</option>
              {data?.filters?.availableJobs?.map(j => <option key={j} value={j}>{j}</option>)}
            </select>

            {(statusFilter || jobFilter) && (
              <button onClick={() => { setStatusFilter(''); setJobFilter(''); }}
                      style={{ fontFamily:'var(--font-system)', fontSize:9, color:'#C8322B', textTransform:'uppercase', letterSpacing:'1px', fontWeight:600 }}>
                Clear
              </button>
            )}
          </div>
        </AdminCard>

        {/* Logs List */}
        {loading ? (
          <AdminLoadingState label="Loading logs..." />
        ) : !data || data.logs.length === 0 ? (
          <AdminEmptyState
            icon={Server}
            title="No cron logs"
            description="No cron logs found for this period"
          />
        ) : (
          <div className="space-y-2">
            {data.logs.map((log) => {
              const cfg = STATUS_CONFIG[log.status] ?? STATUS_CONFIG.failed;
              const Icon = cfg.icon;
              const isExp = expandedLog === log.id;

              return (
                <AdminCard key={log.id} className="!p-0">
                  <button onClick={() => setExpandedLog(isExp ? null : log.id)}
                          className="w-full text-left px-4 py-3 rounded-xl transition-all">

                    {/* Mobile */}
                    <div className="sm:hidden space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Icon size={14} style={{ color: cfg.color, flexShrink:0 }}
                                className={log.status==='running'?'animate-spin':''} />
                          <span style={{ fontFamily:'var(--font-system)', fontSize:10, fontWeight:600, color:'#1C1917', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                            {log.jobName}
                          </span>
                        </div>
                        <AdminStatusBadge status={log.status} label={cfg.label} />
                      </div>
                      <div className="flex items-center gap-3">
                        <span style={{ fontFamily:'var(--font-system)', fontSize:8, color:'#78716C' }}>{ago(log.startedAt)}</span>
                        <span style={{ fontFamily:'var(--font-system)', fontSize:8, color:'#78716C' }}>{fmt(log.durationMs)}</span>
                        {log.itemsProcessed > 0 && <span style={{ fontFamily:'var(--font-system)', fontSize:8, color:'#78716C' }}>{log.itemsSucceeded}/{log.itemsProcessed}</span>}
                      </div>
                    </div>

                    {/* Desktop */}
                    <div className="hidden sm:grid sm:grid-cols-[1fr_100px_80px_80px_120px_20px] gap-3 items-center">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon size={14} style={{ color: cfg.color, flexShrink:0 }}
                              className={log.status==='running'?'animate-spin':''} />
                        <span style={{ fontFamily:'var(--font-system)', fontSize:10, fontWeight:600, color:'#1C1917', textTransform:'uppercase', letterSpacing:'0.5px' }} className="truncate">
                          {log.jobName}
                        </span>
                        {log.sitesProcessed.length > 0 && (
                          <AdminStatusBadge status="active" label={`${log.sitesProcessed.length}s`} />
                        )}
                      </div>
                      <AdminStatusBadge status={log.status} label={cfg.label} />
                      <span style={{ fontFamily:'var(--font-system)', fontSize:9, color:'#78716C' }}>{fmt(log.durationMs)}</span>
                      <span style={{ fontFamily:'var(--font-system)', fontSize:9 }}>
                        {log.itemsProcessed > 0 ? (
                          <span>
                            <span style={{ color:'#2D5A3D' }}>{log.itemsSucceeded}</span>
                            {log.itemsFailed > 0 && <span style={{ color:'#C8322B' }}>/{log.itemsFailed}</span>}
                            <span style={{ color:'#78716C' }}>/{log.itemsProcessed}</span>
                          </span>
                        ) : <span style={{ color:'#78716C' }}>{'\u2014'}</span>}
                      </span>
                      <span style={{ fontFamily:'var(--font-system)', fontSize:9, color:'#78716C' }}>{ago(log.startedAt)}</span>
                      <ChevronDown size={12} style={{ color:'#78716C', transform: isExp?'rotate(180deg)':undefined, transition:'transform 200ms', flexShrink:0 }} />
                    </div>
                  </button>

                  {/* Expanded */}
                  {isExp && (
                    <div className="px-4 pb-4 pt-2" style={{ borderTop:'1px solid rgba(214,208,196,0.4)' }}>
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
                              <span style={{ fontFamily:'var(--font-system)', fontSize:8, color:'#78716C', minWidth:90, flexShrink:0 }}>{l}:</span>
                              <span style={{ fontFamily:'var(--font-system)', fontSize:8, color:'#1C1917' }}>{v}</span>
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
                              <span style={{ fontFamily:'var(--font-system)', fontSize:8, color:'#78716C', minWidth:90, flexShrink:0 }}>{l}:</span>
                              <span style={{ fontFamily:'var(--font-system)', fontSize:8,
                                color: l==='Failed' && Number(v)>0 ? '#C8322B' : l==='Timed Out'?'#C49A2A' : '#1C1917' }}>
                                {v}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      {log.errorMessage && (
                        <div className="mt-3 p-3 rounded-xl" style={{ backgroundColor:'rgba(200,50,43,0.05)', border:'1px solid rgba(200,50,43,0.15)' }}>
                          <div style={{ fontFamily:'var(--font-system)', fontSize:8, fontWeight:600, color:'#C8322B', textTransform:'uppercase', letterSpacing:'1px', marginBottom:4 }}>
                            Error
                          </div>
                          <pre style={{ fontFamily:'var(--font-system)', fontSize:9, color:'#C8322B', whiteSpace:'pre-wrap', wordBreak:'break-all' }}>
                            {log.errorMessage}
                          </pre>
                        </div>
                      )}
                      {log.resultSummary && Object.keys(log.resultSummary).length > 0 && (
                        <div className="mt-2 p-3 rounded-xl" style={{ backgroundColor:'rgba(120,113,108,0.06)', border:'1px solid rgba(120,113,108,0.12)' }}>
                          <div style={{ fontFamily:'var(--font-system)', fontSize:8, fontWeight:600, color:'#78716C', textTransform:'uppercase', letterSpacing:'1px', marginBottom:4 }}>
                            Result Summary
                          </div>
                          <pre style={{ fontFamily:'var(--font-system)', fontSize:9, color:'#78716C', whiteSpace:'pre-wrap', wordBreak:'break-all', maxHeight:120, overflow:'auto' }}>
                            {JSON.stringify(log.resultSummary, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </AdminCard>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {data && data.pagination.totalPages > 1 && (
          <AdminCard className="flex items-center justify-between">
            <span style={{ fontFamily:'var(--font-system)', fontSize:9, color:'#78716C' }}>
              Page {data.pagination.page} of {data.pagination.totalPages} · {data.pagination.total} total
            </span>
            <div className="flex items-center gap-2">
              <AdminButton onClick={() => setPage(Math.max(1, page-1))} disabled={page<=1} variant="secondary" size="sm">
                <ChevronLeft size={14} />
              </AdminButton>
              <AdminButton onClick={() => setPage(Math.min(data.pagination.totalPages, page+1))} disabled={page>=data.pagination.totalPages} variant="secondary" size="sm">
                <ChevronRight size={14} />
              </AdminButton>
            </div>
          </AdminCard>
        )}
        </>)}
      </div>
    </div>
  );
}
