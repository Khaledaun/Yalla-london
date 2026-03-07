'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Activity, AlertTriangle, CheckCircle, ChevronDown, ChevronLeft,
  Clock, Filter, Loader2, RefreshCw, Server, Timer, XCircle,
  Zap, TrendingUp, TrendingDown, Minus, BarChart3, Shield,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────

interface WindowStats {
  total: number; completed: number; failed: number; timedOut: number;
  partial: number; running: number; successRate: number;
  avgDurationMs: number | null; avgDurationFormatted: string;
  totalItemsProcessed: number; totalItemsFailed: number;
}

interface RunDetail {
  id: string; status: string; startedAt: string; completedAt: string | null;
  durationMs: number | null; durationFormatted: string;
  itemsProcessed: number; itemsSucceeded: number; itemsFailed: number;
  errorMessage: string | null; errorPlain: string | null;
  errorFix: string | null; errorSeverity: string | null;
  timedOut: boolean; siteId: string | null; sitesProcessed: string[];
}

interface JobReport {
  jobName: string; label: string; category: string; critical: boolean;
  schedule: string; humanSchedule: string;
  windows: { h24: WindowStats; h48: WindowStats; h72: WindowStats };
  runs: RunDetail[];
  health: 'healthy' | 'warning' | 'failing' | 'idle';
  healthReason: string;
}

interface GlobalSummary {
  totalJobs: number; healthy: number; warning: number; failing: number; idle: number;
  totalRuns24h: number; totalRuns48h: number; totalRuns72h: number;
  overallSuccessRate24h: number; overallSuccessRate72h: number;
  criticalFailures: number;
}

interface MonitorResponse {
  reports: JobReport[];
  summary: GlobalSummary;
  selectedWindow: number;
  generatedAt: string;
  error?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────

const HEALTH_CONFIG = {
  healthy: { label: 'Healthy',  color: '#2D5A3D', bg: 'rgba(45,90,61,0.08)',   icon: CheckCircle },
  warning: { label: 'Warning',  color: '#C49A2A', bg: 'rgba(196,154,42,0.08)', icon: AlertTriangle },
  failing: { label: 'Failing',  color: '#C8322B', bg: 'rgba(200,50,43,0.08)',  icon: XCircle },
  idle:    { label: 'Idle',     color: '#78716C', bg: 'rgba(120,113,108,0.08)', icon: Clock },
};

const CATEGORY_COLORS: Record<string, string> = {
  content: '#C8322B', seo: '#4A7BA8', indexing: '#2D5A3D',
  analytics: '#7C3AED', maintenance: '#78716C', unknown: '#A8A29E',
};

const WINDOWS = [
  { label: '24h', hours: 24 },
  { label: '48h', hours: 48 },
  { label: '72h', hours: 72 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────

function ago(iso: string) {
  const d = new Date(iso);
  const m = Math.floor((Date.now() - d.getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function statusBadge(status: string, timedOut: boolean) {
  if (timedOut) return { label: 'TIMEOUT', color: '#C49A2A', bg: 'rgba(196,154,42,0.12)' };
  switch (status) {
    case 'completed': return { label: 'OK',      color: '#2D5A3D', bg: 'rgba(45,90,61,0.12)' };
    case 'failed':    return { label: 'FAILED',  color: '#C8322B', bg: 'rgba(200,50,43,0.12)' };
    case 'running':   return { label: 'RUNNING', color: '#4A7BA8', bg: 'rgba(74,123,168,0.12)' };
    case 'partial':   return { label: 'PARTIAL', color: '#C49A2A', bg: 'rgba(196,154,42,0.12)' };
    default:          return { label: status.toUpperCase(), color: '#78716C', bg: 'rgba(120,113,108,0.1)' };
  }
}

function rateColor(rate: number) {
  if (rate >= 90) return '#2D5A3D';
  if (rate >= 70) return '#C49A2A';
  return '#C8322B';
}

function rateTrend(h24: number, h72: number) {
  if (h24 > h72 + 5) return { icon: TrendingUp, color: '#2D5A3D', label: 'improving' };
  if (h24 < h72 - 5) return { icon: TrendingDown, color: '#C8322B', label: 'declining' };
  return { icon: Minus, color: '#78716C', label: 'stable' };
}

// ─── Component ────────────────────────────────────────────────────────────

export default function CronMonitorPage() {
  const [data, setData] = useState<MonitorResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [hours, setHours] = useState(72);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [healthFilter, setHealthFilter] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ hours: String(hours) });
      if (categoryFilter) params.set('category', categoryFilter);
      const res = await fetch(`/api/admin/cron-monitor?${params}`);
      setData(res.ok ? await res.json() : null);
    } catch { setData(null); }
    finally { setLoading(false); }
  }, [hours, categoryFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggle = (jobName: string) =>
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(jobName) ? next.delete(jobName) : next.add(jobName);
      return next;
    });

  const filtered = data?.reports.filter(r => !healthFilter || r.health === healthFilter) ?? [];
  const s = data?.summary;

  // Count categories for filter badges
  const catCounts: Record<string, number> = {};
  for (const r of data?.reports ?? []) {
    catCounts[r.category] = (catCounts[r.category] || 0) + 1;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4 pb-8">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/cockpit" className="p-2 rounded-xl transition-all"
                style={{ backgroundColor: 'var(--neu-bg)', boxShadow: 'var(--neu-flat)', color: '#78716C' }}>
            <ChevronLeft size={16} />
          </Link>
          <div>
            <h1 style={{ fontFamily: "'Anybody',sans-serif", fontWeight: 800, fontSize: 22, color: '#1C1917', letterSpacing: -0.5 }}>
              Cron Success Monitor
            </h1>
            <p style={{ fontFamily: "'IBM Plex Sans Arabic',sans-serif", fontSize: 11, color: '#78716C', marginTop: 2 }}>
              مراقبة نجاح المهام المجدولة
            </p>
          </div>
        </div>
        <button onClick={fetchData} disabled={loading}
                className="p-2.5 rounded-xl transition-all"
                style={{ backgroundColor: 'var(--neu-bg)', boxShadow: loading ? 'var(--neu-inset)' : 'var(--neu-flat)', color: '#78716C' }}>
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* ── Critical Alert Banner ──────────────────────────────────── */}
      {s && s.criticalFailures > 0 && (
        <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgba(200,50,43,0.08)', border: '1px solid rgba(200,50,43,0.2)' }}>
          <div className="flex items-center gap-2">
            <Shield size={16} style={{ color: '#C8322B' }} />
            <span style={{ fontFamily: "'Anybody',sans-serif", fontWeight: 700, fontSize: 14, color: '#C8322B' }}>
              {s.criticalFailures} critical job{s.criticalFailures > 1 ? 's' : ''} failing
            </span>
          </div>
          <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#C8322B', marginTop: 4 }}>
            Critical jobs directly affect content publishing and revenue. Check the failing jobs below.
          </p>
        </div>
      )}

      {/* ── Global Summary Cards ───────────────────────────────────── */}
      {s && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Overall Success Rate */}
          <div className="p-4 rounded-xl text-center"
               style={{ backgroundColor: 'var(--neu-bg)', boxShadow: 'var(--neu-flat)' }}>
            <div style={{ fontFamily: "'Anybody',sans-serif", fontWeight: 800, fontSize: 28, color: rateColor(s.overallSuccessRate24h) }}>
              {s.overallSuccessRate24h}%
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: '#78716C', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>
              24h Success Rate
            </div>
            {(() => {
              const t = rateTrend(s.overallSuccessRate24h, s.overallSuccessRate72h);
              const TrendIcon = t.icon;
              return (
                <div className="flex items-center justify-center gap-1 mt-1">
                  <TrendIcon size={10} style={{ color: t.color }} />
                  <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 8, color: t.color }}>{t.label}</span>
                </div>
              );
            })()}
          </div>

          {/* Total Runs */}
          <div className="p-4 rounded-xl text-center"
               style={{ backgroundColor: 'var(--neu-bg)', boxShadow: 'var(--neu-flat)' }}>
            <div style={{ fontFamily: "'Anybody',sans-serif", fontWeight: 800, fontSize: 28, color: '#1C1917' }}>
              {hours === 24 ? s.totalRuns24h : hours === 48 ? s.totalRuns48h : s.totalRuns72h}
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: '#78716C', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>
              Total Runs ({hours}h)
            </div>
          </div>

          {/* Health Distribution */}
          <div className="p-4 rounded-xl"
               style={{ backgroundColor: 'var(--neu-bg)', boxShadow: 'var(--neu-flat)' }}>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              {[
                { label: 'Healthy', val: s.healthy, color: '#2D5A3D' },
                { label: 'Warning', val: s.warning, color: '#C49A2A' },
                { label: 'Failing', val: s.failing, color: '#C8322B' },
                { label: 'Idle',    val: s.idle,    color: '#78716C' },
              ].map(({ label, val, color }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                  <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color }}>
                    {val}
                  </span>
                  <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 8, color: '#A8A29E' }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: '#78716C', textTransform: 'uppercase', letterSpacing: 1, marginTop: 6, textAlign: 'center' }}>
              Job Health
            </div>
          </div>

          {/* 72h Rate */}
          <div className="p-4 rounded-xl text-center"
               style={{ backgroundColor: 'var(--neu-bg)', boxShadow: 'var(--neu-flat)' }}>
            <div style={{ fontFamily: "'Anybody',sans-serif", fontWeight: 800, fontSize: 28, color: rateColor(s.overallSuccessRate72h) }}>
              {s.overallSuccessRate72h}%
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: '#78716C', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>
              72h Success Rate
            </div>
          </div>
        </div>
      )}

      {/* ── Filters ────────────────────────────────────────────────── */}
      <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--neu-bg)', boxShadow: 'var(--neu-flat)' }}>
        <div className="flex flex-wrap items-center gap-2">
          <Filter size={13} style={{ color: '#78716C', flexShrink: 0 }} />

          {/* Time window */}
          <div className="flex gap-1">
            {WINDOWS.map(w => (
              <button key={w.hours} onClick={() => setHours(w.hours)}
                      className="px-3 py-1.5 rounded-lg transition-all"
                      style={{
                        backgroundColor: 'var(--neu-bg)',
                        boxShadow: hours === w.hours ? 'var(--neu-inset)' : 'var(--neu-flat)',
                        fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, fontWeight: hours === w.hours ? 700 : 400,
                        textTransform: 'uppercase', letterSpacing: 0.8,
                        color: hours === w.hours ? '#C8322B' : '#78716C',
                      }}>
                {w.label}
              </button>
            ))}
          </div>

          <div style={{ width: 1, height: 16, backgroundColor: 'rgba(120,113,108,0.15)' }} />

          {/* Health filter */}
          <div className="flex gap-1">
            {(['', 'failing', 'warning', 'healthy', 'idle'] as const).map(h => (
              <button key={h || 'all'} onClick={() => setHealthFilter(h)}
                      className="px-2.5 py-1.5 rounded-lg transition-all"
                      style={{
                        backgroundColor: healthFilter === h ? (h ? HEALTH_CONFIG[h].color : '#1C1917') : 'var(--neu-bg)',
                        boxShadow: healthFilter === h ? 'none' : 'var(--neu-flat)',
                        fontFamily: "'IBM Plex Mono',monospace", fontSize: 9,
                        textTransform: 'uppercase', letterSpacing: 0.8,
                        color: healthFilter === h ? '#FAF8F4' : '#78716C',
                      }}>
                {h || 'all'}
              </button>
            ))}
          </div>

          <div style={{ width: 1, height: 16, backgroundColor: 'rgba(120,113,108,0.15)' }} />

          {/* Category filter */}
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
                  className="rounded-lg border-0 px-2.5 py-1.5"
                  style={{
                    fontFamily: "'IBM Plex Mono',monospace", fontSize: 10,
                    backgroundColor: 'var(--neu-bg)', boxShadow: 'var(--neu-flat)',
                    color: categoryFilter ? CATEGORY_COLORS[categoryFilter] || '#78716C' : '#78716C',
                  }}>
            <option value="">All categories</option>
            {Object.entries(catCounts).map(([cat, count]) => (
              <option key={cat} value={cat}>{cat} ({count})</option>
            ))}
          </select>

          {(healthFilter || categoryFilter) && (
            <button onClick={() => { setHealthFilter(''); setCategoryFilter(''); }}
                    style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: '#C8322B', textTransform: 'uppercase', letterSpacing: 1 }}>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Loading / Empty ────────────────────────────────────────── */}
      {loading && !data ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center"
                 style={{ backgroundColor: 'var(--neu-bg)', boxShadow: 'var(--neu-raised)' }}>
              <RefreshCw size={20} className="animate-spin" style={{ color: '#C8322B' }} />
            </div>
            <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#78716C' }}>Loading cron health data…</p>
          </div>
        </div>
      ) : !data ? (
        <div className="rounded-xl text-center py-16" style={{ backgroundColor: 'var(--neu-bg)', boxShadow: 'var(--neu-flat)' }}>
          <Server size={28} className="mx-auto mb-3 opacity-20" style={{ color: '#78716C' }} />
          <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#78716C' }}>Failed to load cron data</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl text-center py-16" style={{ backgroundColor: 'var(--neu-bg)', boxShadow: 'var(--neu-flat)' }}>
          <Activity size={28} className="mx-auto mb-3 opacity-20" style={{ color: '#78716C' }} />
          <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#78716C' }}>No jobs match your filters</p>
        </div>
      ) : (
        /* ── Job Report Cards ────────────────────────────────────── */
        <div className="space-y-3">
          {filtered.map(report => {
            const hc = HEALTH_CONFIG[report.health];
            const HealthIcon = hc.icon;
            const isOpen = expanded.has(report.jobName);
            const w = report.windows[`h${hours}` as keyof typeof report.windows];
            const failedRuns = report.runs.filter(r => r.status === 'failed' || r.timedOut);

            return (
              <div key={report.jobName} className="rounded-xl overflow-hidden"
                   style={{ backgroundColor: 'var(--neu-bg)', boxShadow: 'var(--neu-flat)' }}>

                {/* ── Job Header Row ───────────────────────────── */}
                <button onClick={() => toggle(report.jobName)}
                        className="w-full text-left p-4 transition-all hover:opacity-90">
                  <div className="flex items-start gap-3">
                    {/* Health dot */}
                    <div className="flex-shrink-0 mt-0.5">
                      <HealthIcon size={16} style={{ color: hc.color }} />
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span style={{ fontFamily: "'Anybody',sans-serif", fontWeight: 700, fontSize: 14, color: '#1C1917' }}>
                          {report.label}
                        </span>
                        {report.critical && (
                          <span className="px-1.5 py-0.5 rounded"
                                style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 8, backgroundColor: 'rgba(200,50,43,0.1)', color: '#C8322B', fontWeight: 600 }}>
                            CRITICAL
                          </span>
                        )}
                        <span className="px-1.5 py-0.5 rounded"
                              style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 8,
                                backgroundColor: `${CATEGORY_COLORS[report.category] || '#78716C'}15`,
                                color: CATEGORY_COLORS[report.category] || '#78716C' }}>
                          {report.category}
                        </span>
                      </div>

                      {/* Stats row */}
                      <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                        {/* Success rate */}
                        <div className="flex items-center gap-1.5">
                          <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(120,113,108,0.1)' }}>
                            <div className="h-full rounded-full transition-all"
                                 style={{ width: `${w.successRate}%`, backgroundColor: rateColor(w.successRate) }} />
                          </div>
                          <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, fontWeight: 600, color: rateColor(w.successRate) }}>
                            {w.successRate}%
                          </span>
                        </div>

                        <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: '#78716C' }}>
                          {w.completed}/{w.total} runs
                        </span>

                        {w.failed > 0 && (
                          <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: '#C8322B' }}>
                            {w.failed} failed
                          </span>
                        )}

                        {w.timedOut > 0 && (
                          <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: '#C49A2A' }}>
                            {w.timedOut} timed out
                          </span>
                        )}

                        <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: '#A8A29E' }}>
                          avg {w.avgDurationFormatted}
                        </span>
                      </div>

                      {/* Health reason */}
                      <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: hc.color, marginTop: 4 }}>
                        {report.healthReason}
                      </p>

                      {/* Inline failure preview (most recent failure, if any) */}
                      {failedRuns.length > 0 && !isOpen && (
                        <div className="mt-2 px-2.5 py-1.5 rounded-lg"
                             style={{ backgroundColor: 'rgba(200,50,43,0.05)', border: '1px solid rgba(200,50,43,0.12)' }}>
                          <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: '#C8322B' }}>
                            Last failure ({ago(failedRuns[0].startedAt)}): {failedRuns[0].errorPlain || failedRuns[0].errorMessage?.slice(0, 80) || 'Unknown error'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Expand chevron */}
                    <div className="flex-shrink-0 mt-1">
                      <ChevronDown size={14} style={{ color: '#78716C', transform: isOpen ? 'rotate(180deg)' : undefined, transition: 'transform 200ms' }} />
                    </div>
                  </div>
                </button>

                {/* ── Expanded: Run-by-run detail ──────────────── */}
                {isOpen && (
                  <div className="px-4 pb-4" style={{ borderTop: '1px solid rgba(120,113,108,0.1)' }}>

                    {/* Window comparison */}
                    <div className="grid grid-cols-3 gap-2 mt-3 mb-4">
                      {(['h24', 'h48', 'h72'] as const).map(key => {
                        const win = report.windows[key];
                        const label = key === 'h24' ? '24h' : key === 'h48' ? '48h' : '72h';
                        return (
                          <div key={key} className="text-center py-2 px-2 rounded-lg"
                               style={{ backgroundColor: 'rgba(120,113,108,0.04)', border: hours === parseInt(label) ? '1px solid rgba(200,50,43,0.3)' : '1px solid transparent' }}>
                            <div style={{ fontFamily: "'Anybody',sans-serif", fontWeight: 700, fontSize: 16, color: rateColor(win.successRate) }}>
                              {win.total > 0 ? `${win.successRate}%` : '—'}
                            </div>
                            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 8, color: '#A8A29E', textTransform: 'uppercase', letterSpacing: 1 }}>
                              {label} · {win.completed}/{win.total}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Run list header */}
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart3 size={11} style={{ color: '#78716C' }} />
                      <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: '#A8A29E', textTransform: 'uppercase', letterSpacing: 1 }}>
                        All Runs ({hours}h) — {report.runs.length} total
                      </span>
                    </div>

                    {report.runs.length === 0 ? (
                      <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: '#A8A29E', paddingLeft: 8 }}>
                        No runs in the selected window
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {report.runs.map(run => {
                          const badge = statusBadge(run.status, run.timedOut);
                          const hasError = run.status === 'failed' || run.timedOut;

                          return (
                            <div key={run.id} className="rounded-lg overflow-hidden"
                                 style={{ backgroundColor: hasError ? 'rgba(200,50,43,0.03)' : 'rgba(45,90,61,0.02)', border: `1px solid ${hasError ? 'rgba(200,50,43,0.1)' : 'rgba(120,113,108,0.08)'}` }}>

                              {/* Run summary row */}
                              <div className="flex items-center gap-3 px-3 py-2 flex-wrap">
                                {/* Status badge */}
                                <span className="px-1.5 py-0.5 rounded flex-shrink-0"
                                      style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 8, fontWeight: 600, backgroundColor: badge.bg, color: badge.color }}>
                                  {badge.label}
                                </span>

                                {/* Time */}
                                <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: '#57534E' }}>
                                  {ago(run.startedAt)}
                                </span>

                                {/* Duration */}
                                <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: '#78716C' }}>
                                  <Timer size={9} className="inline mr-0.5" />
                                  {run.durationFormatted}
                                </span>

                                {/* Items */}
                                {run.itemsProcessed > 0 && (
                                  <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: '#78716C' }}>
                                    <Zap size={9} className="inline mr-0.5" />
                                    {run.itemsSucceeded}/{run.itemsProcessed} items
                                  </span>
                                )}

                                {/* Sites */}
                                {run.sitesProcessed.length > 0 && (
                                  <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: '#A8A29E' }}>
                                    {run.sitesProcessed.join(', ')}
                                  </span>
                                )}
                              </div>

                              {/* Error block (if failed) */}
                              {hasError && (run.errorPlain || run.errorMessage) && (
                                <div className="px-3 pb-2.5 space-y-1">
                                  {/* Plain English */}
                                  {run.errorPlain && (
                                    <div className="flex items-start gap-2">
                                      <AlertTriangle size={11} style={{ color: '#C8322B', flexShrink: 0, marginTop: 1 }} />
                                      <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#C8322B', fontWeight: 600 }}>
                                        {run.errorPlain}
                                      </span>
                                    </div>
                                  )}

                                  {/* Fix suggestion */}
                                  {run.errorFix && (
                                    <div className="flex items-start gap-2 ml-5">
                                      <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: '#78716C' }}>
                                        Fix: {run.errorFix}
                                      </span>
                                    </div>
                                  )}

                                  {/* Raw error (collapsed) */}
                                  {run.errorMessage && run.errorPlain && (
                                    <details className="ml-5">
                                      <summary style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: '#A8A29E', cursor: 'pointer' }}>
                                        Raw error
                                      </summary>
                                      <pre style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: '#A8A29E', whiteSpace: 'pre-wrap', wordBreak: 'break-all', marginTop: 4, maxHeight: 80, overflow: 'auto' }}>
                                        {run.errorMessage}
                                      </pre>
                                    </details>
                                  )}

                                  {/* If no plain interpretation, show raw directly */}
                                  {run.errorMessage && !run.errorPlain && (
                                    <pre className="ml-5" style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: '#C8322B', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 80, overflow: 'auto' }}>
                                      {run.errorMessage}
                                    </pre>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Footer timestamp ───────────────────────────────────────── */}
      {data?.generatedAt && (
        <div className="text-center pt-2">
          <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: '#A8A29E' }}>
            Generated {ago(data.generatedAt)} · {data.reports.length} jobs tracked
          </span>
        </div>
      )}
    </div>
  );
}
