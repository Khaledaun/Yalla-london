'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  Loader2,
  RefreshCw,
  Server,
  Timer,
  XCircle,
} from 'lucide-react';

interface CronLog {
  id: string;
  jobName: string;
  jobType: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  itemsProcessed: number;
  itemsSucceeded: number;
  itemsFailed: number;
  errorMessage: string | null;
  sitesProcessed: string[];
  sitesSkipped: string[];
  timedOut: boolean;
  resultSummary: Record<string, unknown> | null;
  siteId: string | null;
}

interface CronLogsResponse {
  logs: CronLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: {
    availableJobs: string[];
    timeRange: string;
    since: string;
  };
  summary: {
    total: number;
    completed: number;
    failed: number;
    timedOut: number;
    running: number;
    partial: number;
  };
  error?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: typeof CheckCircle }> = {
  completed: { label: 'Completed', color: 'text-green-400', bgColor: 'bg-green-500/10 border-green-500/20', icon: CheckCircle },
  failed: { label: 'Failed', color: 'text-red-400', bgColor: 'bg-red-500/10 border-red-500/20', icon: XCircle },
  timed_out: { label: 'Timed Out', color: 'text-amber-400', bgColor: 'bg-amber-500/10 border-amber-500/20', icon: Timer },
  running: { label: 'Running', color: 'text-blue-400', bgColor: 'bg-blue-500/10 border-blue-500/20', icon: Loader2 },
  partial: { label: 'Partial', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10 border-yellow-500/20', icon: AlertTriangle },
};

const TIME_RANGES = [
  { label: '24h', hours: 24 },
  { label: '3 days', hours: 72 },
  { label: '7 days', hours: 168 },
  { label: '30 days', hours: 720 },
];

export default function CronLogsPage() {
  const [data, setData] = useState<CronLogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [jobFilter, setJobFilter] = useState<string>('');
  const [hours, setHours] = useState(168);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '50',
        hours: String(hours),
      });
      if (statusFilter) params.set('status', statusFilter);
      if (jobFilter) params.set('job', jobFilter);

      const res = await fetch(`/api/admin/cron-logs?${params}`);
      if (res.ok) {
        setData(await res.json());
      } else {
        setData(null);
      }
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, jobFilter, hours]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, jobFilter, hours]);

  const formatDuration = (ms: number | null) => {
    if (ms === null) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;

    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const summary = data?.summary;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/health-monitoring" className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
              <ArrowLeft className="h-5 w-5 text-gray-400" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                <Server className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold">Cron Job Logs</h1>
                <p className="text-xs text-gray-400">Execution history and error tracking</p>
              </div>
            </div>
          </div>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <SummaryCard label="Total Runs" value={summary.total} color="text-white" />
            <SummaryCard label="Completed" value={summary.completed} color="text-green-400" />
            <SummaryCard label="Failed" value={summary.failed} color="text-red-400" />
            <SummaryCard label="Timed Out" value={summary.timedOut} color="text-amber-400" />
            <SummaryCard label="Running" value={summary.running} color="text-blue-400" />
            <SummaryCard
              label="Success Rate"
              value={summary.total > 0 ? `${Math.round((summary.completed / summary.total) * 100)}%` : '-'}
              color={summary.total > 0 && summary.completed / summary.total >= 0.9 ? 'text-green-400' : 'text-amber-400'}
            />
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 bg-gray-900 border border-gray-800 rounded-xl p-3 sm:p-4">
          <Filter className="h-4 w-4 text-gray-400 flex-shrink-0" />

          {/* Time Range */}
          <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-0.5">
            {TIME_RANGES.map((range) => (
              <button
                key={range.hours}
                onClick={() => setHours(range.hours)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  hours === range.hours
                    ? 'bg-cyan-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 pr-8 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="">All statuses</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="timed_out">Timed Out</option>
              <option value="running">Running</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500 pointer-events-none" />
          </div>

          {/* Job Filter */}
          <div className="relative">
            <select
              value={jobFilter}
              onChange={(e) => setJobFilter(e.target.value)}
              className="appearance-none bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 pr-8 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="">All jobs</option>
              {data?.filters?.availableJobs?.map((job) => (
                <option key={job} value={job}>{job}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500 pointer-events-none" />
          </div>

          {(statusFilter || jobFilter) && (
            <button
              onClick={() => { setStatusFilter(''); setJobFilter(''); }}
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Logs Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="h-6 w-6 text-cyan-400 animate-spin" />
          </div>
        ) : !data || data.logs.length === 0 ? (
          <div className="text-center py-20">
            <Server className="h-10 w-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No cron job logs found for this period</p>
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            {/* Table Header */}
            <div className="hidden sm:grid sm:grid-cols-[1fr_100px_80px_80px_120px] gap-3 px-4 py-3 border-b border-gray-800 text-xs font-medium text-gray-500 uppercase tracking-wider">
              <div>Job</div>
              <div>Status</div>
              <div>Duration</div>
              <div>Items</div>
              <div>Time</div>
            </div>

            {/* Log Entries */}
            <div className="divide-y divide-gray-800/50">
              {data.logs.map((log) => {
                const cfg = STATUS_CONFIG[log.status] ?? STATUS_CONFIG.failed;
                const Icon = cfg.icon;
                const isExpanded = expandedLog === log.id;

                return (
                  <div key={log.id}>
                    <button
                      onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-800/50 transition-colors"
                    >
                      {/* Mobile Layout */}
                      <div className="sm:hidden space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${cfg.color} flex-shrink-0 ${log.status === 'running' ? 'animate-spin' : ''}`} />
                            <span className="text-sm font-medium text-white">{log.jobName}</span>
                          </div>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${cfg.bgColor} ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-gray-500">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatTime(log.startedAt)}</span>
                          <span className="flex items-center gap-1"><Timer className="h-3 w-3" />{formatDuration(log.durationMs)}</span>
                          {log.itemsProcessed > 0 && (
                            <span className="flex items-center gap-1">
                              <Activity className="h-3 w-3" />
                              {log.itemsSucceeded}/{log.itemsProcessed}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Desktop Layout */}
                      <div className="hidden sm:grid sm:grid-cols-[1fr_100px_80px_80px_120px] gap-3 items-center">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon className={`h-4 w-4 ${cfg.color} flex-shrink-0 ${log.status === 'running' ? 'animate-spin' : ''}`} />
                          <span className="text-sm font-medium text-white truncate">{log.jobName}</span>
                          {log.sitesProcessed.length > 0 && (
                            <span className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded flex-shrink-0">
                              {log.sitesProcessed.length} site{log.sitesProcessed.length > 1 ? 's' : ''}
                            </span>
                          )}
                          {log.errorMessage && (
                            <ChevronRight className={`h-3.5 w-3.5 text-gray-600 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`} />
                          )}
                        </div>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border inline-flex items-center w-fit ${cfg.bgColor} ${cfg.color}`}>
                          {cfg.label}
                        </span>
                        <span className="text-xs text-gray-400">{formatDuration(log.durationMs)}</span>
                        <span className="text-xs text-gray-400">
                          {log.itemsProcessed > 0 ? (
                            <span>
                              <span className="text-green-400">{log.itemsSucceeded}</span>
                              {log.itemsFailed > 0 && <span className="text-red-400">/{log.itemsFailed}</span>}
                              <span className="text-gray-600">/{log.itemsProcessed}</span>
                            </span>
                          ) : '-'}
                        </span>
                        <span className="text-xs text-gray-500">{formatTime(log.startedAt)}</span>
                      </div>
                    </button>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 bg-gray-800/30 border-t border-gray-800/50">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                          <div className="space-y-2">
                            <DetailRow label="Job Type" value={log.jobType} />
                            <DetailRow label="Started" value={new Date(log.startedAt).toLocaleString('en-GB')} />
                            {log.completedAt && (
                              <DetailRow label="Completed" value={new Date(log.completedAt).toLocaleString('en-GB')} />
                            )}
                            <DetailRow label="Duration" value={formatDuration(log.durationMs)} />
                            {log.siteId && <DetailRow label="Site ID" value={log.siteId} />}
                          </div>
                          <div className="space-y-2">
                            <DetailRow label="Items Processed" value={String(log.itemsProcessed)} />
                            <DetailRow label="Items Succeeded" value={String(log.itemsSucceeded)} />
                            <DetailRow label="Items Failed" value={String(log.itemsFailed)} highlight={log.itemsFailed > 0} />
                            {log.sitesProcessed.length > 0 && (
                              <DetailRow label="Sites Processed" value={log.sitesProcessed.join(', ')} />
                            )}
                            {log.sitesSkipped.length > 0 && (
                              <DetailRow label="Sites Skipped" value={log.sitesSkipped.join(', ')} highlight />
                            )}
                            {log.timedOut && <DetailRow label="Timed Out" value="Yes" highlight />}
                          </div>
                        </div>
                        {log.errorMessage && (
                          <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                            <p className="text-[11px] font-medium text-red-400 mb-1">Error Message:</p>
                            <p className="text-[11px] text-red-300/80 font-mono whitespace-pre-wrap break-all">
                              {log.errorMessage}
                            </p>
                          </div>
                        )}
                        {log.resultSummary && Object.keys(log.resultSummary).length > 0 && (
                          <div className="mt-3 p-3 bg-gray-800/50 border border-gray-700 rounded-lg">
                            <p className="text-[11px] font-medium text-gray-400 mb-1">Result Summary:</p>
                            <pre className="text-[11px] text-gray-300 font-mono whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
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

            {/* Pagination */}
            {data.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
                <span className="text-xs text-gray-500">
                  Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total} total)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page <= 1}
                    className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4 text-gray-400" />
                  </button>
                  <button
                    onClick={() => setPage(Math.min(data.pagination.totalPages, page + 1))}
                    disabled={page >= data.pagination.totalPages}
                    className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
      <p className="text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={`text-lg sm:text-2xl font-bold mt-0.5 ${color}`}>{value}</p>
    </div>
  );
}

function DetailRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-gray-500 min-w-[100px] sm:min-w-[120px] flex-shrink-0">{label}:</span>
      <span className={highlight ? 'text-red-400 font-medium' : 'text-gray-300'}>{value}</span>
    </div>
  );
}
