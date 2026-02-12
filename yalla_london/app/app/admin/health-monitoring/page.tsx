'use client';

/**
 * Health Monitoring Dashboard
 *
 * Real-time connection health, cron job status, and error alerting
 * for every website in the multi-tenant platform.
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Bell,
  CheckCircle,
  Clock,
  Database,
  Globe,
  RefreshCw,
  Server,
  Shield,
  XCircle,
  Zap,
  ChevronDown,
  ChevronRight,
  Send,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────

interface DbStatus {
  connected: boolean;
  latencyMs: number | null;
  error: string | null;
}

interface SiteHealth {
  siteId: string;
  siteName: string;
  domain: string;
  healthScore: number | null;
  lastChecked: string | null;
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
}

interface CronJobStatus {
  jobName: string;
  lastRun: string | null;
  status: string;
  durationMs: number | null;
  error: string | null;
  itemsProcessed: number;
  itemsFailed: number;
}

interface RecentError {
  id: string;
  jobName: string;
  siteId: string | null;
  error: string;
  timestamp: string;
  durationMs: number | null;
}

interface HealthData {
  timestamp: string;
  database: DbStatus;
  sites: SiteHealth[];
  cronJobs: CronJobStatus[];
  recentErrors: RecentError[];
  summary: {
    totalSites: number;
    healthySites: number;
    degradedSites: number;
    downSites: number;
    totalCronJobs: number;
    failedCronJobs: number;
    errorsLast24h: number;
  };
}

interface Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  jobName: string;
  siteId: string | null;
  error: string;
  timestamp: string;
  timedOut: boolean;
}

interface AlertData {
  alerts: Alert[];
  summary: {
    total: number;
    critical: number;
    warning: number;
    info: number;
  };
}

// ─── Component ──────────────────────────────────────────────────────

export default function HealthMonitoringPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [alerts, setAlerts] = useState<AlertData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedCron, setExpandedCron] = useState<string | null>(null);
  const [expandedError, setExpandedError] = useState<string | null>(null);
  const [sendingAlert, setSendingAlert] = useState(false);
  const [alertSent, setAlertSent] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [healthRes, alertsRes] = await Promise.all([
        fetch('/api/admin/health-monitor'),
        fetch('/api/admin/health-monitor/alerts?hours=24'),
      ]);

      if (healthRes.ok) {
        setHealth(await healthRes.json());
      } else {
        setError(`Health API returned ${healthRes.status}`);
      }

      if (alertsRes.ok) {
        setAlerts(await alertsRes.json());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch health data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 30s
  useEffect(() => {
    if (!autoRefresh) return undefined;
    const interval = setInterval(() => fetchData(true), 30_000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  const triggerAlertCheck = async () => {
    setSendingAlert(true);
    setAlertSent(null);
    try {
      const res = await fetch('/api/admin/health-monitor/alerts', { method: 'POST' });
      const data = await res.json();
      if (data.emailSent) {
        setAlertSent(`Alert email sent! ${data.issueCount} issue(s) found.`);
      } else if (data.issueCount === 0) {
        setAlertSent('All systems healthy - no alert needed.');
      } else {
        setAlertSent(`${data.issueCount} issue(s) found. No email provider configured.`);
      }
      // Refresh data after check
      fetchData(true);
    } catch {
      setAlertSent('Failed to run health check.');
    } finally {
      setSendingAlert(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 text-cyan-400 animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Loading health data...</p>
        </div>
      </div>
    );
  }

  const db = health?.database;
  const summary = health?.summary;
  const overallStatus = !db?.connected
    ? 'down'
    : (summary?.downSites ?? 0) > 0
      ? 'degraded'
      : (summary?.failedCronJobs ?? 0) > 0
        ? 'degraded'
        : 'healthy';

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/command-center"
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-400" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg">Health Monitoring</h1>
                <p className="text-xs text-gray-500">
                  Last updated: {health?.timestamp ? timeAgo(health.timestamp) : 'never'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Auto-refresh toggle */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                autoRefresh
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                  : 'bg-gray-800 text-gray-500 border border-gray-700'
              }`}
            >
              <Activity className="h-3.5 w-3.5" />
              {autoRefresh ? 'Live' : 'Paused'}
            </button>

            {/* Manual refresh */}
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <RefreshCw className={`h-5 w-5 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            {/* Trigger alert */}
            <button
              onClick={triggerAlertCheck}
              disabled={sendingAlert}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {sendingAlert ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Run Alert Check
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Alert sent feedback */}
        {alertSent && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-blue-400" />
              <span className="text-sm text-blue-300">{alertSent}</span>
            </div>
            <button onClick={() => setAlertSent(null)} className="text-blue-500 hover:text-blue-400">
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
            <span className="text-sm text-red-300">{error}</span>
            <button
              onClick={() => fetchData(true)}
              className="ml-auto text-sm text-red-400 hover:text-red-300 font-medium"
            >
              Retry
            </button>
          </div>
        )}

        {/* Status banner */}
        <div
          className={`rounded-2xl p-6 ${
            overallStatus === 'healthy'
              ? 'bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20'
              : overallStatus === 'degraded'
                ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20'
                : 'bg-gradient-to-r from-red-500/10 to-pink-500/10 border border-red-500/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                  overallStatus === 'healthy'
                    ? 'bg-emerald-500/20'
                    : overallStatus === 'degraded'
                      ? 'bg-amber-500/20'
                      : 'bg-red-500/20'
                }`}
              >
                {overallStatus === 'healthy' ? (
                  <CheckCircle className="h-7 w-7 text-emerald-400" />
                ) : overallStatus === 'degraded' ? (
                  <AlertTriangle className="h-7 w-7 text-amber-400" />
                ) : (
                  <XCircle className="h-7 w-7 text-red-400" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold">
                  {overallStatus === 'healthy'
                    ? 'All Systems Operational'
                    : overallStatus === 'degraded'
                      ? 'Degraded Performance'
                      : 'System Down'}
                </h2>
                <p className="text-sm text-gray-400 mt-0.5">
                  {summary?.totalSites ?? 0} sites monitored &middot;{' '}
                  {summary?.errorsLast24h ?? 0} errors in last 24h
                </p>
              </div>
            </div>
            <div className="flex gap-6 text-center">
              <div>
                <div className="text-2xl font-bold text-emerald-400">{summary?.healthySites ?? 0}</div>
                <div className="text-xs text-gray-500">Healthy</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-400">{summary?.degradedSites ?? 0}</div>
                <div className="text-xs text-gray-500">Degraded</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-400">{summary?.downSites ?? 0}</div>
                <div className="text-xs text-gray-500">Down</div>
              </div>
            </div>
          </div>
        </div>

        {/* Top row: DB + Alert Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Database Connection */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <Database className="h-5 w-5 text-cyan-400" />
              <h3 className="font-semibold">Database</h3>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  db?.connected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
                }`}
              />
              <span className={db?.connected ? 'text-emerald-400' : 'text-red-400'}>
                {db?.connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            {db?.connected && db.latencyMs !== null && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Latency</span>
                <span
                  className={
                    db.latencyMs < 100
                      ? 'text-emerald-400'
                      : db.latencyMs < 500
                        ? 'text-amber-400'
                        : 'text-red-400'
                  }
                >
                  {db.latencyMs}ms
                </span>
              </div>
            )}
            {db?.error && (
              <p className="text-xs text-red-400 mt-2 break-all">{db.error.slice(0, 200)}</p>
            )}
          </div>

          {/* Alert Summary */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <Bell className="h-5 w-5 text-amber-400" />
              <h3 className="font-semibold">Alerts (24h)</h3>
            </div>
            {alerts ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Critical</span>
                  <span
                    className={`text-sm font-mono font-bold ${
                      alerts.summary.critical > 0 ? 'text-red-400' : 'text-gray-600'
                    }`}
                  >
                    {alerts.summary.critical}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Warning</span>
                  <span
                    className={`text-sm font-mono font-bold ${
                      alerts.summary.warning > 0 ? 'text-amber-400' : 'text-gray-600'
                    }`}
                  >
                    {alerts.summary.warning}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Total</span>
                  <span className="text-sm font-mono font-bold text-gray-300">
                    {alerts.summary.total}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No alert data</p>
            )}
          </div>

          {/* Cron Jobs Summary */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <Zap className="h-5 w-5 text-purple-400" />
              <h3 className="font-semibold">Cron Jobs</h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Monitored</span>
                <span className="text-sm font-mono font-bold text-gray-300">
                  {summary?.totalCronJobs ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Failed</span>
                <span
                  className={`text-sm font-mono font-bold ${
                    (summary?.failedCronJobs ?? 0) > 0 ? 'text-red-400' : 'text-gray-600'
                  }`}
                >
                  {summary?.failedCronJobs ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Passing</span>
                <span className="text-sm font-mono font-bold text-emerald-400">
                  {(summary?.totalCronJobs ?? 0) - (summary?.failedCronJobs ?? 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Sites Grid */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-400" />
            Site Health
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(health?.sites ?? []).map((site) => (
              <SiteCard key={site.siteId} site={site} />
            ))}
          </div>
        </div>

        {/* Cron Jobs Table */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Server className="h-5 w-5 text-purple-400" />
            Cron Job Status
          </h2>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="divide-y divide-gray-800">
              {(health?.cronJobs ?? []).map((cron) => (
                <div key={cron.jobName}>
                  <button
                    onClick={() =>
                      setExpandedCron(expandedCron === cron.jobName ? null : cron.jobName)
                    }
                    className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-gray-800/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <StatusDot status={cron.status} />
                      <div>
                        <span className="font-medium text-sm">{cron.jobName}</span>
                        <span className="ml-3 text-xs text-gray-500">
                          {cron.lastRun ? timeAgo(cron.lastRun) : 'Never run'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {cron.durationMs !== null && (
                        <span className="text-xs text-gray-500 font-mono">
                          {cron.durationMs < 1000
                            ? `${cron.durationMs}ms`
                            : `${(cron.durationMs / 1000).toFixed(1)}s`}
                        </span>
                      )}
                      <StatusBadge status={cron.status} />
                      {expandedCron === cron.jobName ? (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-500" />
                      )}
                    </div>
                  </button>
                  {expandedCron === cron.jobName && (
                    <div className="px-5 pb-4 space-y-2 border-t border-gray-800/50">
                      <div className="grid grid-cols-2 gap-4 pt-3 text-sm">
                        <div>
                          <span className="text-gray-500">Items Processed</span>
                          <span className="ml-2 font-mono">{cron.itemsProcessed}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Items Failed</span>
                          <span
                            className={`ml-2 font-mono ${cron.itemsFailed > 0 ? 'text-red-400' : ''}`}
                          >
                            {cron.itemsFailed}
                          </span>
                        </div>
                      </div>
                      {cron.error && (
                        <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-3 text-xs text-red-300 font-mono break-all">
                          {cron.error.slice(0, 500)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Errors */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            Recent Errors (24h)
            {(health?.recentErrors?.length ?? 0) > 0 && (
              <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-mono">
                {health?.recentErrors.length}
              </span>
            )}
          </h2>
          {(health?.recentErrors?.length ?? 0) === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
              <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No errors in the last 24 hours</p>
            </div>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              <div className="divide-y divide-gray-800">
                {(health?.recentErrors ?? []).slice(0, 20).map((err) => (
                  <div key={err.id}>
                    <button
                      onClick={() =>
                        setExpandedError(expandedError === err.id ? null : err.id)
                      }
                      className="w-full px-5 py-3 flex items-center justify-between hover:bg-gray-800/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <XCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <span className="font-medium text-sm">{err.jobName}</span>
                          {err.siteId && (
                            <span className="ml-2 text-xs bg-gray-800 px-2 py-0.5 rounded text-gray-400">
                              {err.siteId}
                            </span>
                          )}
                          <p className="text-xs text-gray-500 truncate max-w-md">
                            {err.error.slice(0, 100)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-xs text-gray-500">{timeAgo(err.timestamp)}</span>
                        {expandedError === err.id ? (
                          <ChevronDown className="h-4 w-4 text-gray-500" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-500" />
                        )}
                      </div>
                    </button>
                    {expandedError === err.id && (
                      <div className="px-5 pb-4 border-t border-gray-800/50">
                        <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-3 mt-3 text-xs text-red-300 font-mono break-all whitespace-pre-wrap">
                          {err.error}
                        </div>
                        {err.durationMs !== null && (
                          <p className="text-xs text-gray-500 mt-2">
                            Duration: {err.durationMs}ms
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────

function SiteCard({ site }: { site: SiteHealth }) {
  const statusColors = {
    healthy: 'border-emerald-500/30 bg-emerald-500/5',
    degraded: 'border-amber-500/30 bg-amber-500/5',
    down: 'border-red-500/30 bg-red-500/5',
    unknown: 'border-gray-700 bg-gray-900',
  };

  const statusTextColors = {
    healthy: 'text-emerald-400',
    degraded: 'text-amber-400',
    down: 'text-red-400',
    unknown: 'text-gray-500',
  };

  const dotColors = {
    healthy: 'bg-emerald-500',
    degraded: 'bg-amber-500',
    down: 'bg-red-500',
    unknown: 'bg-gray-600',
  };

  return (
    <div className={`border rounded-2xl p-5 ${statusColors[site.status]}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${dotColors[site.status]} ${site.status === 'healthy' ? 'animate-pulse' : ''}`} />
          <h4 className="font-semibold text-sm">{site.siteName}</h4>
        </div>
        <span className={`text-xs font-medium uppercase ${statusTextColors[site.status]}`}>
          {site.status}
        </span>
      </div>
      <p className="text-xs text-gray-500 mb-3">{site.domain}</p>
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs text-gray-500">Health Score</span>
          <div className={`text-xl font-bold font-mono ${statusTextColors[site.status]}`}>
            {site.healthScore !== null ? site.healthScore : '--'}
          </div>
        </div>
        {site.lastChecked && (
          <div className="text-right">
            <span className="text-xs text-gray-500">Last Check</span>
            <div className="text-xs text-gray-400">{timeAgo(site.lastChecked)}</div>
          </div>
        )}
      </div>
      {/* Score bar */}
      {site.healthScore !== null && (
        <div className="mt-3 h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              site.healthScore >= 70
                ? 'bg-emerald-500'
                : site.healthScore >= 40
                  ? 'bg-amber-500'
                  : 'bg-red-500'
            }`}
            style={{ width: `${site.healthScore}%` }}
          />
        </div>
      )}
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === 'completed'
      ? 'bg-emerald-500'
      : status === 'running'
        ? 'bg-blue-500 animate-pulse'
        : status === 'failed' || status === 'timed_out'
          ? 'bg-red-500'
          : 'bg-gray-600';
  return <div className={`w-2.5 h-2.5 rounded-full ${color}`} />;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    running: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    failed: 'bg-red-500/10 text-red-400 border-red-500/20',
    timed_out: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    never_run: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  };
  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded-full border ${colors[status] ?? colors.never_run}`}
    >
      {status.replace('_', ' ')}
    </span>
  );
}

// ─── Utilities ──────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
