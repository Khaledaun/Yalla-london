'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Play, RefreshCw, CheckCircle, XCircle, AlertTriangle, Clock, Loader2,
  ChevronDown, ChevronRight, Zap, Activity, Timer, Calendar,
} from 'lucide-react';

interface CronJobEntry {
  key: string;
  label: string;
  humanSchedule: string;
  category: string;
  critical: boolean;
  lastRunAt: string | null;
  lastStatus: string;
  lastDurationMs: number | null;
  lastError: string | null;
  lastItemsProcessed: number;
  lastItemsFailed: number;
  timedOut: boolean;
  runs7d: number;
  failures7d: number;
  avgDurationMs: number | null;
  health: 'green' | 'yellow' | 'red' | 'gray';
  recentLogs: Array<{
    id: string;
    status: string;
    startedAt: string;
    durationMs: number | null;
    itemsProcessed: number;
    itemsFailed: number;
    error: string | null;
    timedOut: boolean;
  }>;
}

interface ScheduleData {
  jobs: CronJobEntry[];
  summary: { total: number; healthy: number; warning: number; failing: number; neverRun: number };
}

const HEALTH_CONFIG = {
  green:  { color: '#2D5A3D', bg: 'rgba(45,90,61,0.1)',   label: 'Healthy',   icon: CheckCircle },
  yellow: { color: '#C49A2A', bg: 'rgba(196,154,42,0.1)', label: 'Warning',   icon: AlertTriangle },
  red:    { color: '#C8322B', bg: 'rgba(200,50,43,0.1)',  label: 'Failing',   icon: XCircle },
  gray:   { color: '#78716C', bg: 'rgba(120,113,108,0.1)', label: 'Never Run', icon: Clock },
};

const CATEGORY_COLORS: Record<string, string> = {
  content:     '#C8322B',
  seo:         '#4A7BA8',
  indexing:    '#2D5A3D',
  analytics:   '#7C3AED',
  maintenance: '#78716C',
};

function fmt(ms: number | null) {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function ago(iso: string | null) {
  if (!iso) return 'never';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

export function CronSchedulePanel() {
  const [data, setData] = useState<ScheduleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [triggering, setTriggering] = useState<string | null>(null);
  const [triggerResult, setTriggerResult] = useState<Record<string, { success: boolean; error?: string }>>({});
  const [categoryFilter, setCategoryFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/cron-schedule');
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const triggerJob = async (jobKey: string) => {
    setTriggering(jobKey);
    try {
      const res = await fetch('/api/admin/cron-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobKey }),
      });
      const result = await res.json();
      setTriggerResult((prev) => ({ ...prev, [jobKey]: result }));
      setTimeout(() => load(), 2000);
    } finally {
      setTriggering(null);
    }
  };

  const toggleExpanded = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  if (loading && !data) {
    return (
      <div className="text-center py-16">
        <Loader2 size={28} className="mx-auto animate-spin mb-3" style={{ color: '#78716C' }} />
        <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#78716C' }}>Loading cron schedule...</p>
      </div>
    );
  }

  const s = data?.summary;
  const categories = ['all', 'content', 'seo', 'indexing', 'analytics', 'maintenance'];
  const filteredJobs = data?.jobs.filter((j) => categoryFilter === 'all' || j.category === categoryFilter) ?? [];

  return (
    <div className="space-y-4">
      {/* Summary */}
      {s && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Total Jobs',  val: s.total,    color: '#1C1917' },
            { label: 'Healthy',     val: s.healthy,  color: '#2D5A3D' },
            { label: 'Warning',     val: s.warning,  color: '#C49A2A' },
            { label: 'Failing',     val: s.failing,  color: '#C8322B' },
            { label: 'Never Run',   val: s.neverRun, color: '#78716C' },
          ].map(({ label, val, color }) => (
            <div key={label} className="text-center py-4 px-3 rounded-xl"
                 style={{ backgroundColor: 'var(--neu-bg,#EDE9E1)', boxShadow: 'var(--neu-flat,1px 1px 3px #CAC5BC, -1px -1px 3px #FDFAF5)' }}>
              <div style={{ fontFamily: "'Anybody',sans-serif", fontWeight: 800, fontSize: 24, color }}>{val}</div>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: '#78716C', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters + Refresh */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1 flex-wrap">
          {categories.map((cat) => (
            <button key={cat} onClick={() => setCategoryFilter(cat)}
                    className="px-3 py-1.5 rounded-lg text-xs transition-all"
                    style={{
                      fontFamily: "'IBM Plex Mono',monospace",
                      fontSize: 9,
                      textTransform: 'uppercase',
                      letterSpacing: 0.8,
                      backgroundColor: categoryFilter === cat ? (CATEGORY_COLORS[cat] || '#1C1917') : 'var(--neu-bg)',
                      color: categoryFilter === cat ? '#FAF8F4' : '#78716C',
                      boxShadow: categoryFilter === cat ? 'none' : 'var(--neu-flat,1px 1px 3px #CAC5BC, -1px -1px 3px #FDFAF5)',
                    }}>
              {cat}
            </button>
          ))}
        </div>
        <button onClick={load}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
                style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.8, backgroundColor: 'var(--neu-bg)', boxShadow: 'var(--neu-flat)', color: '#78716C' }}>
          <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Job List */}
      <div className="space-y-2">
        {filteredJobs.map((job) => {
          const h = HEALTH_CONFIG[job.health];
          const HealthIcon = h.icon;
          const isExpanded = expanded.has(job.key);
          const isTrig = triggering === job.key;
          const tr = triggerResult[job.key];
          const budgetPct = job.lastDurationMs ? Math.min(100, (job.lastDurationMs / 53000) * 100) : 0;

          return (
            <div key={job.key} className="rounded-xl overflow-hidden"
                 style={{ backgroundColor: 'var(--neu-bg,#EDE9E1)', boxShadow: 'var(--neu-flat,1px 1px 3px #CAC5BC, -1px -1px 3px #FDFAF5)' }}>
              {/* Main row */}
              <div className="flex items-center gap-3 p-4">
                {/* Health dot */}
                <div className="flex-shrink-0">
                  <HealthIcon size={15} style={{ color: h.color }} />
                </div>

                {/* Job info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span style={{ fontFamily: "'Anybody',sans-serif", fontWeight: 700, fontSize: 13, color: '#1C1917' }}>
                      {job.label}
                    </span>
                    {job.critical && (
                      <span className="text-xs px-1.5 py-0.5 rounded"
                            style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 8, backgroundColor: 'rgba(200,50,43,0.1)', color: '#C8322B', fontWeight: 600 }}>
                        CRITICAL
                      </span>
                    )}
                    <span className="text-xs px-1.5 py-0.5 rounded"
                          style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 8, backgroundColor: `${CATEGORY_COLORS[job.category]}15`, color: CATEGORY_COLORS[job.category] || '#78716C' }}>
                      {job.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: '#78716C' }}>
                      <Calendar size={9} className="inline mr-1" />
                      {job.humanSchedule}
                    </span>
                    <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: '#78716C' }}>
                      <Timer size={9} className="inline mr-1" />
                      {ago(job.lastRunAt)}
                    </span>
                    {job.avgDurationMs && (
                      <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: '#78716C' }}>
                        <Activity size={9} className="inline mr-1" />
                        avg {fmt(job.avgDurationMs)}
                      </span>
                    )}
                    {job.runs7d > 0 && (
                      <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: '#78716C' }}>
                        {job.runs7d} runs/7d • {job.failures7d} fails
                      </span>
                    )}
                  </div>

                  {/* Budget bar */}
                  {job.lastDurationMs && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1 rounded-full overflow-hidden"
                           style={{ backgroundColor: 'rgba(120,113,108,0.1)' }}>
                        <div className="h-full rounded-full transition-all"
                             style={{ width: `${budgetPct}%`, backgroundColor: budgetPct > 90 ? '#C8322B' : budgetPct > 70 ? '#C49A2A' : '#2D5A3D' }} />
                      </div>
                      <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: '#78716C' }}>
                        {fmt(job.lastDurationMs)} / 53s budget
                      </span>
                    </div>
                  )}

                  {/* Last error */}
                  {job.lastError && (
                    <div className="mt-1.5 text-xs px-2 py-1 rounded"
                         style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, backgroundColor: 'rgba(200,50,43,0.08)', color: '#C8322B' }}>
                      ✗ {job.lastError.slice(0, 100)}
                    </div>
                  )}

                  {/* Trigger result */}
                  {tr && (
                    <div className={`mt-1.5 text-xs px-2 py-1 rounded ${tr.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}
                         style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10 }}>
                      {tr.success ? '✓ Job triggered successfully' : `✗ ${tr.error}`}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button onClick={() => triggerJob(job.key)}
                          disabled={isTrig}
                          title="Run now"
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-all"
                          style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5, backgroundColor: '#C8322B', color: '#FAF8F4', opacity: isTrig ? 0.7 : 1 }}>
                    {isTrig ? <Loader2 size={10} className="animate-spin" /> : <Play size={10} />}
                    Run
                  </button>
                  <button onClick={() => toggleExpanded(job.key)}
                          className="p-1.5 rounded-lg transition-all"
                          style={{ backgroundColor: 'var(--neu-bg)', boxShadow: 'var(--neu-flat)', color: '#78716C' }}>
                    {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  </button>
                </div>
              </div>

              {/* Expanded: recent runs */}
              {isExpanded && (
                <div className="border-t px-4 pb-4 pt-3"
                     style={{ borderColor: 'rgba(120,113,108,0.1)' }}>
                  <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: '#A8A29E', textTransform: 'uppercase', letterSpacing: 1 }} className="mb-2">
                    Recent Runs
                  </div>
                  {job.recentLogs.length === 0 && (
                    <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: '#A8A29E' }}>No run history</p>
                  )}
                  <div className="space-y-1.5">
                    {job.recentLogs.map((log) => {
                      const logH = HEALTH_CONFIG[log.status === 'completed' ? 'green' : log.status === 'failed' || log.timedOut ? 'red' : 'yellow'];
                      const LogIcon = logH.icon;
                      return (
                        <div key={log.id} className="flex items-center gap-3 py-1.5 px-3 rounded-lg"
                             style={{ backgroundColor: logH.bg }}>
                          <LogIcon size={11} style={{ color: logH.color, flexShrink: 0 }} />
                          <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: '#57534E', flex: 1 }}>
                            {ago(log.startedAt)}
                          </span>
                          <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: '#78716C' }}>
                            {fmt(log.durationMs)}
                          </span>
                          <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: '#78716C' }}>
                            {log.itemsProcessed} items
                          </span>
                          {log.error && (
                            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: '#C8322B', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {log.error}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
