'use client';

/**
 * Health Monitoring Dashboard
 *
 * Real-time connection health, cron job status, error alerting,
 * fix instructions, and action item buttons for operations.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bell,
  BookOpen,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Database,
  ExternalLink,
  FileText,
  Globe,
  HardDrive,
  Lightbulb,
  Play,
  RefreshCw,
  Search,
  Send,
  Server,
  Terminal,
  Wrench,
  XCircle,
  Zap,
} from 'lucide-react';
import {
  AdminPageHeader,
  AdminCard,
  AdminButton,
  AdminAlertBanner,
  AdminStatusBadge,
  AdminKPICard,
  AdminLoadingState,
  AdminEmptyState,
  AdminSectionLabel,
} from '@/components/admin/admin-ui';

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

interface IndexingData {
  totalUrls: number;
  indexed: number;
  submitted: number;
  discovered: number;
  errors: number;
  lastSubmitted: string | null;
  lastInspected: string | null;
  indexRate: number;
}

interface HealthData {
  timestamp: string;
  database: DbStatus;
  sites: SiteHealth[];
  cronJobs: CronJobStatus[];
  recentErrors: RecentError[];
  indexing: IndexingData;
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
  status?: string;
  error: string;
  timestamp: string;
  durationMs?: number | null;
  itemsProcessed?: number;
  itemsFailed?: number;
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

interface FixInstruction {
  title: string;
  steps: string[];
  actions: { label: string; href?: string; onClick?: string; variant: 'primary' | 'secondary' | 'danger' }[];
  severity: 'critical' | 'warning' | 'info';
}

// ─── Fix Instructions Knowledge Base ────────────────────────────────

const CRON_FIX_GUIDE: Record<string, FixInstruction> = {
  'daily-content-generate': {
    title: 'Content Generation Failed',
    severity: 'critical',
    steps: [
      'Check AI provider API keys (ANTHROPIC_API_KEY, OPENAI_API_KEY, or GEMINI_API_KEY)',
      'Verify at least one AI provider is configured in Settings > API Keys',
      'Check if topics exist in the Topic Pipeline — generation needs topics to write about',
      'Check Vercel function logs for timeout errors (120s limit)',
      'If timeout: reduce batch size or enable streaming in content settings',
    ],
    actions: [
      { label: 'Check API Keys', href: '/admin/settings', variant: 'primary' },
      { label: 'View Topics', href: '/admin/topics', variant: 'secondary' },
      { label: 'Re-trigger Job', onClick: 'retrigger:daily-content-generate', variant: 'danger' },
    ],
  },
  'seo-agent': {
    title: 'SEO Agent Failed',
    severity: 'critical',
    steps: [
      'Verify Google service account is added as OWNER (not just user) on GSC property',
      'Check GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY env vars are set',
      'Verify IndexNow key exists at /indexnow-key.txt (should return 200)',
      'Check if GSC property format matches: sc-domain:yourdomain.com',
      'Review Vercel function logs for specific API error codes',
    ],
    actions: [
      { label: 'Check Env Vars', href: '/admin/settings', variant: 'primary' },
      { label: 'View SEO Dashboard', href: '/admin/seo', variant: 'secondary' },
      { label: 'Re-trigger Job', onClick: 'retrigger:seo-agent', variant: 'danger' },
    ],
  },
  analytics: {
    title: 'Analytics Sync Failed',
    severity: 'warning',
    steps: [
      'GA4: Verify GA4_PROPERTY_ID env var (format: properties/XXXXXXXXX)',
      'GSC: Verify service account is OWNER on Search Console property',
      'Check GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY are set correctly',
      'Verify the Google Analytics Data API is enabled in GCP console',
      'Check if the service account has Viewer role on the GA4 property',
    ],
    actions: [
      { label: 'Analytics Settings', href: '/admin/analytics', variant: 'primary' },
      { label: 'Check Env Vars', href: '/admin/settings', variant: 'secondary' },
      { label: 'Re-trigger Job', onClick: 'retrigger:analytics', variant: 'danger' },
    ],
  },
  'scheduled-publish': {
    title: 'Scheduled Publishing Failed',
    severity: 'warning',
    steps: [
      'Check if there are articles with status "scheduled" and a past publish date',
      'Verify database connection is stable (check DB card above)',
      'Check for article validation errors in the logs',
      'Ensure WordPress sync credentials are valid if WP integration is enabled',
    ],
    actions: [
      { label: 'View Content', href: '/admin/content', variant: 'primary' },
      { label: 'Re-trigger Job', onClick: 'retrigger:scheduled-publish', variant: 'danger' },
    ],
  },
  'weekly-topics': {
    title: 'Weekly Topics Research Failed',
    severity: 'warning',
    steps: [
      'Check AI provider API keys — topic research requires an AI provider',
      'Verify GSC data is available (topics are generated from search analytics)',
      'Check if there are active sites configured with topic generation enabled',
      'Review logs for rate-limiting or quota errors from AI providers',
    ],
    actions: [
      { label: 'View Topics', href: '/admin/topics', variant: 'primary' },
      { label: 'Check API Keys', href: '/admin/settings', variant: 'secondary' },
      { label: 'Re-trigger Job', onClick: 'retrigger:weekly-topics', variant: 'danger' },
    ],
  },
  'trends-monitor': {
    title: 'Trends Monitor Failed',
    severity: 'info',
    steps: [
      'Check if Google Trends API is accessible (may be rate-limited)',
      'Verify the AI provider API key for trend analysis',
      'This job is non-critical — trends data enhances but does not block content generation',
    ],
    actions: [
      { label: 'View Trends', href: '/admin/topics', variant: 'primary' },
      { label: 'Re-trigger Job', onClick: 'retrigger:trends-monitor', variant: 'secondary' },
    ],
  },
  'site-health-check': {
    title: 'Site Health Check Failed',
    severity: 'warning',
    steps: [
      'This job collects health metrics per site — failure means health scores may be stale',
      'Check database connectivity (this job reads from multiple tables)',
      'Verify GSC and GA4 credentials are valid (metrics are pulled from these APIs)',
      'Check if cron_job_logs and site_health_checks tables exist (run migrations if not)',
    ],
    actions: [
      { label: 'View Health Data', href: '/admin/health-monitoring', variant: 'primary' },
      { label: 'Check DB', href: '/admin/settings', variant: 'secondary' },
      { label: 'Re-trigger Job', onClick: 'retrigger:site-health-check', variant: 'danger' },
    ],
  },
  'daily-publish': {
    title: 'Daily Publish Failed',
    severity: 'warning',
    steps: [
      'This job publishes draft content that is scheduled for today',
      'Check if there are articles in "scheduled" status with today\'s publish date',
      'Verify the database connection is stable',
      'Check WordPress sync if enabled for external publishing',
    ],
    actions: [
      { label: 'View Content', href: '/admin/content', variant: 'primary' },
      { label: 'Re-trigger Job', onClick: 'retrigger:daily-publish', variant: 'danger' },
    ],
  },
  'seo-health-report': {
    title: 'SEO Health Report Failed',
    severity: 'info',
    steps: [
      'This weekly report summarizes SEO audit results — failure is non-blocking',
      'Check if SEO audit data exists (seo-agent must have run successfully at least once)',
      'Verify database tables exist: seo_audit_results, seo_audits',
      'Check for email sending errors if report delivery failed',
    ],
    actions: [
      { label: 'View SEO', href: '/admin/seo', variant: 'primary' },
      { label: 'Re-trigger Job', onClick: 'retrigger:seo-health-report', variant: 'secondary' },
    ],
  },
};

const DB_FIX_GUIDE: FixInstruction = {
  title: 'Database Connection Failed',
  severity: 'critical',
  steps: [
    'Check DATABASE_URL in Vercel environment variables',
    'Verify Supabase project is running and not paused (check supabase.com dashboard)',
    'Check connection pooler settings — use port 6543 for pooled connections',
    'Verify IP allowlist in Supabase if configured',
    'Try restarting the Supabase project if all else fails',
    'Check if you have exceeded the Supabase free-tier connection limit',
  ],
  actions: [
    { label: 'Supabase Dashboard', href: 'https://supabase.com/dashboard', variant: 'primary' },
    { label: 'Vercel Env Vars', href: 'https://vercel.com/dashboard', variant: 'secondary' },
    { label: 'Check Settings', href: '/admin/settings', variant: 'secondary' },
  ],
};

function getErrorFixGuide(errorMsg: string, jobName: string): FixInstruction | null {
  const lower = errorMsg.toLowerCase();

  if (lower.includes('prisma') || lower.includes('database') || lower.includes('connection refused')) {
    return {
      ...DB_FIX_GUIDE,
      title: `Database Error in ${jobName}`,
    };
  }

  if (lower.includes('api key') || lower.includes('unauthorized') || lower.includes('401') || lower.includes('forbidden') || lower.includes('403')) {
    return {
      title: 'Authentication / API Key Error',
      severity: 'critical',
      steps: [
        'An API key is missing or invalid for this service',
        'Check all API keys in Settings > Environment Variables',
        'For Google services: verify service account has correct permissions',
        'For AI providers: check API key quota and billing status',
      ],
      actions: [
        { label: 'Check API Keys', href: '/admin/settings', variant: 'primary' },
      ],
    };
  }

  if (lower.includes('timeout') || lower.includes('timed out') || lower.includes('econnreset')) {
    return {
      title: 'Timeout / Network Error',
      severity: 'warning',
      steps: [
        'The operation exceeded the allowed time limit or network failed',
        'Vercel Serverless functions have a 120-second timeout on Pro plans',
        'Check if the operation can be split into smaller batches',
        'Verify external API endpoints are reachable',
        'This may be a transient issue — check if subsequent runs succeed',
      ],
      actions: [
        { label: 'Vercel Logs', href: 'https://vercel.com/dashboard', variant: 'primary' },
        { label: 'Re-trigger Job', onClick: `retrigger:${jobName}`, variant: 'danger' },
      ],
    };
  }

  if (lower.includes('rate limit') || lower.includes('429') || lower.includes('quota')) {
    return {
      title: 'Rate Limit / Quota Exceeded',
      severity: 'warning',
      steps: [
        'An external API rate limit or quota was hit',
        'Wait for the rate limit window to reset (usually 1 minute to 1 hour)',
        'Check AI provider billing for quota increases',
        'Consider reducing batch sizes in cron job settings',
      ],
      actions: [
        { label: 'Check Settings', href: '/admin/settings', variant: 'primary' },
      ],
    };
  }

  // Fallback to cron-specific guide
  return CRON_FIX_GUIDE[jobName] ?? null;
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
  const [retriggeringJob, setRetriggeringJob] = useState<string | null>(null);
  const [retriggerResult, setRetriggerResult] = useState<{ job: string; ok: boolean; msg: string } | null>(null);
  const [showDbGuide, setShowDbGuide] = useState(false);

  // Content & Indexing Audit
  const [contentAudit, setContentAudit] = useState<any>(null);
  const [auditLoading, setAuditLoading] = useState(false);

  // DB Schema Health
  const [schemaData, setSchemaData] = useState<any>(null);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [migrateResult, setMigrateResult] = useState<{ ok: boolean; msg: string } | null>(null);

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
      fetchData(true);
    } catch {
      setAlertSent('Failed to run health check.');
    } finally {
      setSendingAlert(false);
    }
  };

  const retriggerCronJob = async (jobName: string) => {
    setRetriggeringJob(jobName);
    setRetriggerResult(null);
    try {
      const res = await fetch(`/api/cron/${jobName}?healthcheck=true`);
      const text = await res.text().catch(() => '');
      let json: Record<string, unknown> | null = null;
      try { json = JSON.parse(text); } catch {}

      if (!res.ok) {
        setRetriggerResult({ job: jobName, ok: false, msg: `"${jobName}" returned ${res.status}. ${text.slice(0, 120)}` });
      } else if (json) {
        // Inspect response body for hidden failures even on HTTP 200
        const bodyStr = JSON.stringify(json);
        const hasErrors = bodyStr.includes('Invalid `prisma') || bodyStr.includes('Unknown argument') ||
          bodyStr.includes('does not exist');
        const lastRunTimedOut = (json as any).lastRun?.status === 'timed_out';
        const allFailed = typeof (json as any).failed === 'number' && (json as any).failed > 0 &&
          (json as any).completed === 0;

        if (hasErrors) {
          setRetriggerResult({ job: jobName, ok: false, msg: `"${jobName}" returned 200 but contains Prisma/DB errors. Check response.` });
        } else if (lastRunTimedOut) {
          setRetriggerResult({ job: jobName, ok: false, msg: `"${jobName}" healthcheck OK but last real run timed out.` });
        } else if (allFailed) {
          setRetriggerResult({ job: jobName, ok: false, msg: `"${jobName}" completed but all items failed.` });
        } else {
          setRetriggerResult({ job: jobName, ok: true, msg: `Health check for "${jobName}" passed.` });
        }
      } else {
        setRetriggerResult({ job: jobName, ok: true, msg: `Health check for "${jobName}" passed.` });
      }
      fetchData(true);
    } catch (err) {
      setRetriggerResult({ job: jobName, ok: false, msg: `Failed to reach "${jobName}": ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setRetriggeringJob(null);
    }
  };

  const handleAction = (action: FixInstruction['actions'][0]) => {
    if (action.onClick?.startsWith('retrigger:')) {
      const job = action.onClick.replace('retrigger:', '');
      retriggerCronJob(job);
    }
    // href actions are handled by <a> or <Link>
  };

  // ─── Content & Indexing Audit ──────────────────────────────────────
  const runContentAudit = async () => {
    setAuditLoading(true);
    try {
      const res = await fetch('/api/admin/content-audit');
      if (res.ok) {
        setContentAudit(await res.json());
      } else {
        setContentAudit({ error: `HTTP ${res.status}` });
      }
    } catch (err) {
      setContentAudit({ error: err instanceof Error ? err.message : 'Failed' });
    } finally {
      setAuditLoading(false);
    }
  };

  // ─── DB Schema Scan ────────────────────────────────────────────────
  const runSchemaCheck = async () => {
    setSchemaLoading(true);
    try {
      const res = await fetch('/api/admin/db-migrate');
      if (res.ok) {
        setSchemaData(await res.json());
      } else {
        setSchemaData({ error: `HTTP ${res.status}` });
      }
    } catch (err) {
      setSchemaData({ error: err instanceof Error ? err.message : 'Failed' });
    } finally {
      setSchemaLoading(false);
    }
  };

  const runMigration = async () => {
    setMigrating(true);
    setMigrateResult(null);
    try {
      const res = await fetch('/api/admin/db-migrate', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        const created = data.created?.length ?? 0;
        const altered = data.altered?.length ?? 0;
        const indexes = data.indexes?.length ?? 0;
        setMigrateResult({
          ok: true,
          msg: `Fixed: ${created} table(s), ${altered} column(s), ${indexes} index(es)`,
        });
        runSchemaCheck(); // refresh scan
      } else {
        setMigrateResult({ ok: false, msg: data.error || 'Migration failed' });
      }
    } catch (err) {
      setMigrateResult({ ok: false, msg: err instanceof Error ? err.message : 'Error' });
    } finally {
      setMigrating(false);
    }
  };

  // Detect critical alerts that need immediate attention
  const criticalAlerts = useMemo(() => {
    if (!alerts) return [];
    return alerts.alerts.filter((a) => a.severity === 'critical').slice(0, 5);
  }, [alerts]);

  const failedCrons = useMemo(() => {
    if (!health) return [];
    return health.cronJobs.filter((c) =>
      c.status === 'failed' ||
      c.status === 'timed_out' ||
      // "completed" but every item failed = effectively failed
      (c.itemsFailed > 0 && c.itemsFailed === c.itemsProcessed)
    );
  }, [health]);

  // ─── Render ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="admin-page p-4 md:p-6">
        <AdminLoadingState label="Loading health data…" />
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
    <div className="admin-page p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <AdminPageHeader
        title="Health Monitor"
        subtitle={health?.timestamp ? `Updated ${timeAgo(health.timestamp)}` : 'Loading…'}
        backHref="/admin/cockpit"
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/admin/cron-logs"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all"
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid rgba(214,208,196,0.8)',
                boxShadow: '0 1px 3px rgba(28,25,23,0.06)',
                fontFamily: 'var(--font-system)',
                fontSize: 9,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                color: '#3B7EA1',
              }}
            >
              <FileText size={12} />
              <span className="hidden sm:inline">Cron Logs</span>
            </Link>
            <AdminButton
              onClick={() => setAutoRefresh(!autoRefresh)}
              variant={autoRefresh ? 'success' : 'ghost'}
              size="sm"
            >
              <Activity size={12} />
              {autoRefresh ? 'Live' : 'Paused'}
            </AdminButton>
            <AdminButton
              onClick={() => fetchData(true)}
              loading={refreshing}
              variant="secondary"
              size="sm"
            >
              <RefreshCw size={14} />
            </AdminButton>
            <AdminButton
              onClick={triggerAlertCheck}
              loading={sendingAlert}
              variant="primary"
              size="sm"
            >
              <Send size={12} />
              <span className="hidden sm:inline">Alert Check</span>
            </AdminButton>
          </div>
        }
      />
      {/* ── Content ─────────────────────────────────────────────────── */}
      <div className="space-y-4">
        {/* Alert sent feedback */}
        {alertSent && (
          <AdminAlertBanner
            severity="info"
            message={alertSent}
            onDismiss={() => setAlertSent(null)}
          />
        )}

        {/* Retrigger result */}
        {retriggerResult && (
          <AdminAlertBanner
            severity={retriggerResult.ok ? 'info' : 'critical'}
            message={retriggerResult.msg}
            onDismiss={() => setRetriggerResult(null)}
          />
        )}

        {/* Error banner */}
        {error && (
          <AdminAlertBanner
            severity="critical"
            message={error}
            action={
              <AdminButton onClick={() => fetchData(true)} variant="danger" size="sm">
                Retry
              </AdminButton>
            }
          />
        )}

        {/* ── CRITICAL ALERT BANNER ── */}
        {(criticalAlerts.length > 0 || !db?.connected) && (
          <AdminCard accent accentColor="red">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: 'rgba(200,50,43,0.08)' }}
              >
                <AlertTriangle size={20} style={{ color: '#C8322B' }} />
              </div>
              <div>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: '#C8322B' }}>
                  Immediate Attention Required
                </p>
                <p style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#78716C', marginTop: 2 }}>
                  {!db?.connected ? 'Database is disconnected. ' : ''}
                  {criticalAlerts.length > 0 ? `${criticalAlerts.length} critical alert(s) in the last 24h.` : ''}
                </p>
              </div>
            </div>

            {/* DB down guide */}
            {!db?.connected && (
              <FixGuidePanel guide={DB_FIX_GUIDE} onAction={handleAction} retriggeringJob={retriggeringJob} />
            )}

            {/* Critical alert summaries */}
            {criticalAlerts.slice(0, 5).map((alert) => {
              const guide = getErrorFixGuide(alert.error, alert.jobName);
              return (
                <div key={alert.id} className="space-y-2 mt-3">
                  <div
                    className="rounded-lg p-3"
                    style={{ backgroundColor: 'rgba(200,50,43,0.04)', border: '1px solid rgba(200,50,43,0.12)' }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span style={{ fontFamily: 'var(--font-system)', fontSize: 10, fontWeight: 700, color: '#C8322B', textTransform: 'uppercase' }}>
                        {alert.jobName}
                      </span>
                      <span style={{ fontFamily: 'var(--font-system)', fontSize: 9, color: '#A8A29E' }}>
                        {new Date(alert.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p style={{ fontFamily: 'var(--font-system)', fontSize: 12, color: '#44403C' }} className="break-words">
                      {alert.error}
                    </p>
                    {alert.itemsFailed > 0 && (
                      <p style={{ fontFamily: 'var(--font-system)', fontSize: 9, color: '#78716C', marginTop: 4 }}>
                        {alert.itemsProcessed} processed, {alert.itemsFailed} failed
                      </p>
                    )}
                  </div>
                  {guide && <FixGuidePanel guide={guide} onAction={handleAction} retriggeringJob={retriggeringJob} />}
                </div>
              );
            })}
          </AdminCard>
        )}

        {/* ── FAILED CRON QUICK-FIX PANEL ── */}
        {failedCrons.length > 0 && db?.connected && criticalAlerts.length === 0 && (
          <AdminCard accent accentColor="gold">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: 'rgba(196,154,42,0.08)' }}
              >
                <Wrench size={20} style={{ color: '#C49A2A' }} />
              </div>
              <div>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: '#7a5a10' }}>
                  Failed Jobs — Fix Guide
                </p>
                <p style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#78716C', marginTop: 2 }}>
                  {failedCrons.length} cron job(s) need attention. Expand for instructions.
                </p>
              </div>
            </div>
            {failedCrons.map((cron) => {
              const guide = CRON_FIX_GUIDE[cron.jobName];
              return (
                <div key={cron.jobName} className="space-y-2 mt-3">
                  <div
                    className="rounded-lg p-3"
                    style={{ backgroundColor: 'rgba(196,154,42,0.04)', border: '1px solid rgba(196,154,42,0.12)' }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span style={{ fontFamily: 'var(--font-system)', fontSize: 10, fontWeight: 700, color: '#7a5a10', textTransform: 'uppercase' }}>
                        {cron.jobName}
                      </span>
                      <AdminStatusBadge status={cron.status === 'failed' ? 'failed' : 'warning'} />
                    </div>
                    {cron.error && (
                      <p style={{ fontFamily: 'var(--font-system)', fontSize: 12, color: '#44403C' }} className="break-words">
                        {cron.error}
                      </p>
                    )}
                  </div>
                  {guide && (
                    <FixGuidePanel
                      guide={guide}
                      errorDetail={cron.error ?? undefined}
                      onAction={handleAction}
                      retriggeringJob={retriggeringJob}
                    />
                  )}
                </div>
              );
            })}
          </AdminCard>
        )}

        {/* Status banner */}
        <AdminCard accent accentColor={overallStatus === 'healthy' ? 'green' : overallStatus === 'degraded' ? 'gold' : 'red'}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{
                  backgroundColor: overallStatus === 'healthy'
                    ? 'rgba(45,90,61,0.08)'
                    : overallStatus === 'degraded'
                      ? 'rgba(196,154,42,0.08)'
                      : 'rgba(200,50,43,0.08)',
                }}
              >
                {overallStatus === 'healthy' ? (
                  <CheckCircle size={28} style={{ color: '#2D5A3D' }} />
                ) : overallStatus === 'degraded' ? (
                  <AlertTriangle size={28} style={{ color: '#C49A2A' }} />
                ) : (
                  <XCircle size={28} style={{ color: '#C8322B' }} />
                )}
              </div>
              <div>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: '#1C1917' }}>
                  {overallStatus === 'healthy'
                    ? 'All Systems Operational'
                    : overallStatus === 'degraded'
                      ? 'Degraded Performance'
                      : 'System Down'}
                </p>
                <p style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#78716C', marginTop: 2 }}>
                  {summary?.totalSites ?? 0} sites monitored &middot;{' '}
                  {summary?.errorsLast24h ?? 0} errors in last 24h
                </p>
              </div>
            </div>
            <div className="flex gap-6 text-center">
              <AdminKPICard value={summary?.healthySites ?? 0} label="Healthy" color="#2D5A3D" />
              <AdminKPICard value={summary?.degradedSites ?? 0} label="Degraded" color="#C49A2A" />
              <AdminKPICard value={summary?.downSites ?? 0} label="Down" color="#C8322B" />
            </div>
          </div>
        </AdminCard>

        {/* Top row: DB + Alert Summary + Crons */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Database Connection */}
          <AdminCard>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Database size={18} style={{ color: '#3B7EA1' }} />
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: '#1C1917' }}>
                  Database
                </span>
              </div>
              {!db?.connected && (
                <button
                  onClick={() => setShowDbGuide(!showDbGuide)}
                  className="flex items-center gap-1"
                  style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#C8322B', fontWeight: 600 }}
                >
                  <Wrench size={12} />
                  Fix Guide
                </button>
              )}
            </div>
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`w-3 h-3 rounded-full ${db?.connected ? 'animate-pulse' : ''}`}
                style={{ backgroundColor: db?.connected ? '#2D5A3D' : '#C8322B' }}
              />
              <span style={{ fontFamily: 'var(--font-system)', fontSize: 12, color: db?.connected ? '#2D5A3D' : '#C8322B', fontWeight: 600 }}>
                {db?.connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            {db?.connected && db.latencyMs !== null && (
              <div className="flex items-center justify-between">
                <span style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#78716C' }}>Latency</span>
                <span style={{
                  fontFamily: 'var(--font-system)',
                  fontSize: 12,
                  fontWeight: 600,
                  color: db.latencyMs < 100 ? '#2D5A3D' : db.latencyMs < 500 ? '#C49A2A' : '#C8322B',
                }}>
                  {db.latencyMs}ms
                </span>
              </div>
            )}
            {db?.error && (
              <p style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#C8322B', marginTop: 8 }} className="break-all">
                {db.error.slice(0, 200)}
              </p>
            )}
            {!db?.connected && showDbGuide && (
              <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(214,208,196,0.4)' }}>
                <FixGuidePanel guide={DB_FIX_GUIDE} onAction={handleAction} retriggeringJob={retriggeringJob} compact />
              </div>
            )}
          </AdminCard>

          {/* Alert Summary */}
          <AdminCard>
            <div className="flex items-center gap-3 mb-4">
              <Bell size={18} style={{ color: '#C49A2A' }} />
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: '#1C1917' }}>
                Alerts (24h)
              </span>
            </div>
            {alerts ? (
              <div className="space-y-2">
                {[
                  { label: 'Critical', value: alerts.summary.critical, color: alerts.summary.critical > 0 ? '#C8322B' : '#A8A29E' },
                  { label: 'Warning', value: alerts.summary.warning, color: alerts.summary.warning > 0 ? '#C49A2A' : '#A8A29E' },
                  { label: 'Total', value: alerts.summary.total, color: '#1C1917' },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#78716C' }}>{row.label}</span>
                    <span style={{ fontFamily: 'var(--font-system)', fontSize: 12, fontWeight: 700, color: row.color }}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#78716C' }}>No alert data</p>
            )}
          </AdminCard>

          {/* Cron Jobs Summary */}
          <AdminCard>
            <div className="flex items-center gap-3 mb-4">
              <Zap size={18} style={{ color: '#7C3AED' }} />
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: '#1C1917' }}>
                Cron Jobs
              </span>
            </div>
            <div className="space-y-2">
              {[
                { label: 'Monitored', value: summary?.totalCronJobs ?? 0, color: '#1C1917' },
                { label: 'Failed', value: summary?.failedCronJobs ?? 0, color: (summary?.failedCronJobs ?? 0) > 0 ? '#C8322B' : '#A8A29E' },
                { label: 'Passing', value: (summary?.totalCronJobs ?? 0) - (summary?.failedCronJobs ?? 0), color: '#2D5A3D' },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <span style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#78716C' }}>{row.label}</span>
                  <span style={{ fontFamily: 'var(--font-system)', fontSize: 12, fontWeight: 700, color: row.color }}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </AdminCard>
        </div>

        {/* ── GOOGLE INDEXING STATUS ── */}
        <IndexingPanel indexing={health?.indexing ?? null} />

        {/* Quick Actions Bar */}
        <AdminCard>
          <div className="flex items-center gap-3 mb-3">
            <Terminal size={14} style={{ color: '#78716C' }} />
            <AdminSectionLabel>Quick Actions</AdminSectionLabel>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { href: '/admin/cockpit', icon: <BookOpen size={12} />, label: 'Content Manager', internal: true },
              { href: '/admin/seo', icon: <Globe size={12} />, label: 'SEO Dashboard', internal: true },
              { href: '/admin/analytics', icon: <Activity size={12} />, label: 'Analytics', internal: true },
              { href: 'https://vercel.com/dashboard', icon: <ExternalLink size={12} />, label: 'Vercel Dashboard', internal: false },
              { href: 'https://supabase.com/dashboard', icon: <Database size={12} />, label: 'Supabase Dashboard', internal: false },
            ].map((item) =>
              item.internal ? (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all hover:shadow-sm"
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid rgba(214,208,196,0.8)',
                    fontFamily: 'var(--font-system)',
                    fontSize: 10,
                    fontWeight: 600,
                    color: '#44403C',
                    textDecoration: 'none',
                  }}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ) : (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all hover:shadow-sm"
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid rgba(214,208,196,0.8)',
                    fontFamily: 'var(--font-system)',
                    fontSize: 10,
                    fontWeight: 600,
                    color: '#44403C',
                    textDecoration: 'none',
                  }}
                >
                  {item.icon}
                  {item.label}
                </a>
              )
            )}
          </div>
        </AdminCard>

        {/* Sites Grid */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Globe size={18} style={{ color: '#3B7EA1' }} />
            <AdminSectionLabel>Site Health</AdminSectionLabel>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(health?.sites ?? []).map((site) => (
              <SiteCard key={site.siteId} site={site} />
            ))}
          </div>
        </div>

        {/* Cron Jobs Table */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Server size={18} style={{ color: '#7C3AED' }} />
            <AdminSectionLabel>Cron Job Status</AdminSectionLabel>
          </div>
          <AdminCard className="overflow-hidden !p-0">
            <div className="divide-y" style={{ borderColor: 'rgba(214,208,196,0.4)' }}>
              {(health?.cronJobs ?? []).map((cron) => (
                <CronJobRow
                  key={cron.jobName}
                  cron={cron}
                  expanded={expandedCron === cron.jobName}
                  onToggle={() =>
                    setExpandedCron(expandedCron === cron.jobName ? null : cron.jobName)
                  }
                  onAction={handleAction}
                  retriggeringJob={retriggeringJob}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Recent Errors */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={18} style={{ color: '#C8322B' }} />
            <AdminSectionLabel>Recent Errors (24h)</AdminSectionLabel>
            {(health?.recentErrors?.length ?? 0) > 0 && (
              <AdminStatusBadge status="error" label={String(health?.recentErrors.length)} />
            )}
          </div>
          {(health?.recentErrors?.length ?? 0) === 0 ? (
            <AdminEmptyState
              icon={CheckCircle}
              title="No errors in the last 24 hours"
            />
          ) : (
            <AdminCard className="overflow-hidden !p-0">
              <div className="divide-y" style={{ borderColor: 'rgba(214,208,196,0.4)' }}>
                {(health?.recentErrors ?? []).slice(0, 20).map((err) => (
                  <ErrorRow
                    key={err.id}
                    err={err}
                    expanded={expandedError === err.id}
                    onToggle={() =>
                      setExpandedError(expandedError === err.id ? null : err.id)
                    }
                    onAction={handleAction}
                    retriggeringJob={retriggeringJob}
                  />
                ))}
              </div>
            </AdminCard>
          )}
        </div>

        {/* ── CONTENT & INDEXING AUDIT ── */}
        <ContentAuditPanel
          data={contentAudit}
          loading={auditLoading}
          onRun={runContentAudit}
        />

        {/* ── DATABASE SCHEMA HEALTH ── */}
        <SchemaHealthPanel
          data={schemaData}
          loading={schemaLoading}
          migrating={migrating}
          migrateResult={migrateResult}
          onScan={runSchemaCheck}
          onMigrate={runMigration}
          onDismissMigrate={() => setMigrateResult(null)}
        />
      </div>
    </div>
    </div>
  );
}

// ─── Content & Indexing Audit Panel ──────────────────────────────────

function ContentAuditPanel({
  data,
  loading,
  onRun,
}: {
  data: any;
  loading: boolean;
  onRun: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText size={18} style={{ color: '#3B7EA1' }} />
          <AdminSectionLabel>Content & Indexing Audit</AdminSectionLabel>
        </div>
        <AdminButton onClick={onRun} loading={loading} variant="primary" size="sm">
          <Search size={14} />
          {loading ? 'Scanning...' : data ? 'Re-scan' : 'Run Audit'}
        </AdminButton>
      </div>

      {!data && !loading && (
        <AdminEmptyState
          icon={FileText}
          title="Run Audit"
          description="Click &quot;Run Audit&quot; to scan content & indexing status. Checks published posts, indexing coverage, stuck pages, and untracked URLs."
        />
      )}

      {data?.error && (
        <AdminAlertBanner severity="critical" message={data.error} />
      )}

      {data?.summary && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {[
              { label: 'Total Posts', value: data.summary.totalPosts, color: '#1C1917' },
              { label: 'Published', value: data.summary.totalPublished, color: '#2D5A3D' },
              { label: 'Drafts', value: data.summary.totalDrafts, color: '#C49A2A' },
              { label: 'Tracked', value: data.summary.totalTrackedUrls, color: '#3B7EA1' },
              { label: 'Indexed', value: data.summary.totalIndexed, color: '#2D5A3D' },
              { label: 'Submitted', value: data.summary.totalSubmittedPending, color: '#3B7EA1' },
              { label: 'Errors', value: data.summary.totalErrors, color: data.summary.totalErrors > 0 ? '#C8322B' : '#A8A29E' },
              { label: 'Untracked', value: data.summary.totalUntracked, color: data.summary.totalUntracked > 0 ? '#C49A2A' : '#A8A29E' },
            ].map((stat) => (
              <AdminKPICard key={stat.label} value={stat.value} label={stat.label} color={stat.color} />
            ))}
          </div>

          {/* Index rate */}
          {data.summary.totalTrackedUrls > 0 && (
            <AdminCard>
              <div className="flex items-center justify-between mb-2">
                <span style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#78716C' }}>Content Index Rate</span>
                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 18,
                  fontWeight: 800,
                  color: data.summary.indexRate >= 70 ? '#2D5A3D' : data.summary.indexRate >= 40 ? '#C49A2A' : '#C8322B',
                }}>
                  {data.summary.indexRate}%
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(214,208,196,0.4)' }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${data.summary.indexRate}%`,
                    backgroundColor: data.summary.indexRate >= 70 ? '#2D5A3D' : data.summary.indexRate >= 40 ? '#C49A2A' : '#C8322B',
                  }}
                />
              </div>
            </AdminCard>
          )}

          {/* Per-site breakdown */}
          {data.perSite?.length > 0 && (
            <AdminCard className="overflow-hidden !p-0">
              <div className="px-5 py-3" style={{ borderBottom: '1px solid rgba(214,208,196,0.4)' }}>
                <AdminSectionLabel>Per-Site Breakdown</AdminSectionLabel>
              </div>
              <div className="divide-y" style={{ borderColor: 'rgba(214,208,196,0.4)' }}>
                {data.perSite.map((site: any) => (
                  <div key={site.siteId} className="px-5 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Globe size={14} style={{ color: '#3B7EA1' }} />
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, color: '#1C1917' }}>
                          {site.siteName || site.siteId}
                        </span>
                        {site.domain && (
                          <span style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#A8A29E' }}>{site.domain}</span>
                        )}
                      </div>
                      <AdminStatusBadge
                        status={site.indexing.indexRate >= 70 ? 'success' : site.indexing.indexRate >= 40 ? 'warning' : 'error'}
                        label={`${site.indexing.indexRate}% indexed`}
                      />
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2" style={{ fontFamily: 'var(--font-system)', fontSize: 10 }}>
                      <div><span style={{ color: '#78716C' }}>Posts:</span> <span style={{ fontWeight: 600 }}>{site.totalPosts}</span></div>
                      <div><span style={{ color: '#78716C' }}>Published:</span> <span style={{ fontWeight: 600, color: '#2D5A3D' }}>{site.published}</span></div>
                      <div><span style={{ color: '#78716C' }}>Drafts:</span> <span style={{ fontWeight: 600, color: '#C49A2A' }}>{site.drafts}</span></div>
                      <div><span style={{ color: '#78716C' }}>Tracked:</span> <span style={{ fontWeight: 600 }}>{site.indexing.total}</span></div>
                      <div><span style={{ color: '#78716C' }}>Indexed:</span> <span style={{ fontWeight: 600, color: '#2D5A3D' }}>{site.indexing.indexed}</span></div>
                      <div><span style={{ color: '#78716C' }}>Errors:</span> <span style={{ fontWeight: 600, color: site.indexing.error > 0 ? '#C8322B' : '#A8A29E' }}>{site.indexing.error}</span></div>
                    </div>
                    {site.notIndexedReasons?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {site.notIndexedReasons.slice(0, 5).map((r: any, i: number) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-full"
                            style={{ fontFamily: 'var(--font-system)', fontSize: 9, backgroundColor: 'rgba(214,208,196,0.3)', color: '#78716C' }}
                          >
                            {r.reason}: {r.count}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </AdminCard>
          )}

          {/* Stuck pages */}
          {data.stuckPages?.length > 0 && (
            <AdminCard accent accentColor="gold">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={14} style={{ color: '#C49A2A' }} />
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, color: '#7a5a10' }}>
                  {data.stuckPages.length} Stuck Page{data.stuckPages.length !== 1 ? 's' : ''} (submitted &gt;7 days, not indexed)
                </span>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {data.stuckPages.map((p: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg px-3 py-2"
                    style={{ backgroundColor: 'rgba(214,208,196,0.2)', fontFamily: 'var(--font-system)', fontSize: 10 }}
                  >
                    <span style={{ color: '#44403C' }} className="truncate max-w-xs">{p.slug || p.url}</span>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {p.coverageState && <span style={{ color: '#C49A2A' }}>{p.coverageState}</span>}
                      <span style={{ color: '#78716C' }}>{p.attempts} attempt{p.attempts !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                ))}
              </div>
            </AdminCard>
          )}

          {/* Untracked posts */}
          {data.untrackedPosts?.length > 0 && (
            <AdminCard accent accentColor="blue">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb size={14} style={{ color: '#3B7EA1' }} />
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, color: '#1e5a7a' }}>
                  {data.untrackedPosts.length} Published Post{data.untrackedPosts.length !== 1 ? 's' : ''} Not Being Tracked
                </span>
              </div>
              <p style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#78716C', marginBottom: 8 }}>
                These posts are published but have no entry in the URL indexing tracker. Run the SEO agent to pick them up.
              </p>
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {data.untrackedPosts.map((p: any, i: number) => (
                  <div key={i} className="flex items-center gap-2" style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#44403C' }}>
                    <span style={{ color: '#A8A29E', fontWeight: 600, width: 16, flexShrink: 0 }}>{i + 1}.</span>
                    <span className="truncate">{p.title || p.slug}</span>
                  </div>
                ))}
              </div>
            </AdminCard>
          )}

          {/* URL errors */}
          {data.urlErrors?.length > 0 && (
            <AdminCard accent accentColor="red">
              <div className="flex items-center gap-2 mb-3">
                <XCircle size={14} style={{ color: '#C8322B' }} />
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, color: '#C8322B' }}>
                  {data.urlErrors.length} URL Error{data.urlErrors.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {data.urlErrors.map((e: any, i: number) => (
                  <div
                    key={i}
                    className="rounded-lg px-3 py-2"
                    style={{ backgroundColor: 'rgba(200,50,43,0.04)', fontFamily: 'var(--font-system)', fontSize: 10 }}
                  >
                    <div className="flex items-center justify-between">
                      <span style={{ color: '#44403C' }} className="truncate max-w-xs">{e.slug || e.url}</span>
                      <span style={{ color: '#C8322B', marginLeft: 8, flexShrink: 0 }}>{e.coverageState}</span>
                    </div>
                    {e.error && (
                      <p style={{ color: '#C8322B', opacity: 0.7, marginTop: 4 }} className="truncate">{e.error}</p>
                    )}
                  </div>
                ))}
              </div>
            </AdminCard>
          )}

          {/* Timestamp */}
          {data.timestamp && (
            <p style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#A8A29E', textAlign: 'right' }}>
              Scanned: {timeAgo(data.timestamp)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Database Schema Health Panel ────────────────────────────────────

function SchemaHealthPanel({
  data,
  loading,
  migrating,
  migrateResult,
  onScan,
  onMigrate,
  onDismissMigrate,
}: {
  data: any;
  loading: boolean;
  migrating: boolean;
  migrateResult: { ok: boolean; msg: string } | null;
  onScan: () => void;
  onMigrate: () => void;
  onDismissMigrate: () => void;
}) {
  const hasMissing = data && !data.error && (
    (data.missingTables?.length > 0) || (data.missingColumns?.length > 0)
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <HardDrive className="h-5 w-5 text-purple-400" />
          Database Schema Health
        </h2>
        <div className="flex items-center gap-2">
          {hasMissing && (
            <button
              onClick={onMigrate}
              disabled={migrating}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {migrating ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Wrench className="h-4 w-4" />
              )}
              {migrating ? 'Fixing...' : 'Fix Missing'}
            </button>
          )}
          <button
            onClick={onScan}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Database className="h-4 w-4" />
            )}
            {loading ? 'Scanning...' : data ? 'Re-scan' : 'Scan Schema'}
          </button>
        </div>
      </div>

      {/* Migration result */}
      {migrateResult && (
        <div className={`${migrateResult.ok ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'} border rounded-xl p-4 mb-4 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            {migrateResult.ok ? (
              <CheckCircle className="h-5 w-5 text-emerald-400" />
            ) : (
              <XCircle className="h-5 w-5 text-red-400" />
            )}
            <span className={`text-sm ${migrateResult.ok ? 'text-emerald-300' : 'text-red-300'}`}>
              {migrateResult.msg}
            </span>
          </div>
          <button onClick={onDismissMigrate} className="text-gray-500 hover:text-gray-400">
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {!data && !loading && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
          <HardDrive className="h-8 w-8 text-gray-700 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Click &quot;Scan Schema&quot; to check for missing tables & columns</p>
          <p className="text-xs text-gray-600 mt-1">
            Compares your database against the Prisma schema and reports gaps
          </p>
        </div>
      )}

      {data?.error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <span className="text-sm text-red-300">{data.error}</span>
        </div>
      )}

      {data && !data.error && (
        <div className="space-y-4">
          {/* Sync status banner */}
          <div className={`rounded-2xl p-5 ${
            hasMissing
              ? 'bg-gradient-to-r from-red-500/10 to-amber-500/10 border border-red-500/20'
              : 'bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20'
          }`}>
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                hasMissing ? 'bg-red-500/20' : 'bg-emerald-500/20'
              }`}>
                {hasMissing ? (
                  <AlertTriangle className="h-6 w-6 text-red-400" />
                ) : (
                  <CheckCircle className="h-6 w-6 text-emerald-400" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold">
                  {hasMissing ? 'Schema Out of Sync' : 'Schema In Sync'}
                </h3>
                <p className="text-sm text-gray-400">
                  {data.existingTables?.length ?? 0} tables found
                  {hasMissing
                    ? ` · ${data.missingTables?.length ?? 0} missing table(s), ${data.missingColumns?.length ?? 0} missing column(s)`
                    : ' · All checked columns present'}
                </p>
              </div>
            </div>
          </div>

          {/* Missing tables */}
          {data.missingTables?.length > 0 && (
            <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <XCircle className="h-4 w-4 text-red-400" />
                <span className="font-semibold text-sm text-red-300">
                  {data.missingTables.length} Missing Table{data.missingTables.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="space-y-2">
                {data.missingTables.map((t: any, i: number) => (
                  <div key={i} className="bg-black/20 rounded-lg px-3 py-2 text-xs">
                    <div className="flex items-center justify-between">
                      <code className="text-red-300 font-mono">{t.table}</code>
                      <span className="text-gray-500">Model: {t.model}</span>
                    </div>
                    <p className="text-gray-500 mt-1">
                      Any route querying <code className="text-cyan-400">prisma.{t.model.charAt(0).toLowerCase() + t.model.slice(1)}</code> will throw P2021
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Missing columns */}
          {data.missingColumns?.length > 0 && (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <span className="font-semibold text-sm text-amber-300">
                  {data.missingColumns.length} Missing Column{data.missingColumns.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {data.missingColumns.map((c: any, i: number) => (
                  <div key={i} className="bg-black/20 rounded-lg px-3 py-2 text-xs flex items-center justify-between">
                    <div>
                      <code className="text-amber-300 font-mono">{c.table}.{c.column}</code>
                    </div>
                    <span className="text-gray-500 font-mono">{c.type}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Existing tables count */}
          {data.existingTables?.length > 0 && !hasMissing && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-sm text-gray-400">
                All <span className="text-emerald-400 font-mono">{data.existingTables.length}</span> tables
                and checked columns are in sync with the Prisma schema.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Indexing Panel ──────────────────────────────────────────────────

function IndexingPanel({ indexing }: { indexing: IndexingData | null }) {
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<string | null>(null);

  const triggerIndexing = async () => {
    setSubmitting(true);
    setSubmitResult(null);
    try {
      const res = await fetch('/api/seo/check-and-index?submit_all=true', {
        method: 'GET',
      });
      if (res.ok) {
        const data = await res.json();
        setSubmitResult(
          `Submitted ${data.summary?.totalPages ?? 0} pages. ` +
          `IndexNow: ${data.submission?.indexNow?.status ?? 'n/a'}, ` +
          `Google: ${data.submission?.googleApi?.status ?? 'n/a'}`
        );
      } else {
        setSubmitResult(`Failed: HTTP ${res.status}`);
      }
    } catch (err) {
      setSubmitResult(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSubmitting(false);
    }
  };

  const idx = indexing;
  const hasData = idx && idx.totalUrls > 0;
  const indexRate = idx?.indexRate ?? 0;

  const rateColor =
    indexRate >= 70
      ? 'text-emerald-400'
      : indexRate >= 40
        ? 'text-amber-400'
        : 'text-red-400';

  const barColor =
    indexRate >= 70
      ? 'bg-emerald-500'
      : indexRate >= 40
        ? 'bg-amber-500'
        : 'bg-red-500';

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
            <Globe className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold">Google Indexing Status</h3>
            <p className="text-xs text-gray-500">
              {idx?.lastSubmitted ? `Last submitted: ${timeAgo(idx.lastSubmitted)}` : 'No submissions yet'}
            </p>
          </div>
        </div>
        <button
          onClick={triggerIndexing}
          disabled={submitting}
          className="flex items-center gap-2 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
        >
          {submitting ? (
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          Submit All Pages
        </button>
      </div>

      {submitResult && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-4 text-xs text-blue-300">
          {submitResult}
        </div>
      )}

      {hasData ? (
        <div className="space-y-4">
          {/* Index rate bar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm text-gray-400">Index Rate</span>
              <span className={`text-lg font-bold font-mono ${rateColor}`}>
                {indexRate}%
              </span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                style={{ width: `${indexRate}%` }}
              />
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-gray-800/50 rounded-lg p-3 text-center">
              <div className="text-lg font-bold font-mono text-emerald-400">{idx.indexed}</div>
              <div className="text-xs text-gray-500">Indexed</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3 text-center">
              <div className="text-lg font-bold font-mono text-blue-400">{idx.submitted}</div>
              <div className="text-xs text-gray-500">Submitted</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3 text-center">
              <div className="text-lg font-bold font-mono text-gray-400">{idx.discovered}</div>
              <div className="text-xs text-gray-500">Discovered</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3 text-center">
              <div className={`text-lg font-bold font-mono ${idx.errors > 0 ? 'text-red-400' : 'text-gray-600'}`}>
                {idx.errors}
              </div>
              <div className="text-xs text-gray-500">Errors</div>
            </div>
          </div>

          {/* Fix instructions when index rate is low */}
          {indexRate < 50 && (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-medium text-amber-300">Low Index Rate — Action Items</span>
              </div>
              <ol className="text-xs text-gray-400 space-y-1 pl-5 list-decimal">
                <li>Click &quot;Submit All Pages&quot; above to re-submit sitemap to Google + IndexNow</li>
                <li>Verify your sitemap is accessible at <code className="text-cyan-400">/sitemap.xml</code></li>
                <li>Check GSC manually: service account must be <strong>owner</strong> on the property</li>
                <li>Run <code className="text-cyan-400">/api/seo/check-and-index?submit=true</code> to inspect + submit unindexed pages</li>
                <li>Google can take 2-14 days to index new content — be patient after submission</li>
              </ol>
              <div className="flex flex-wrap gap-2 pt-1">
                <Link
                  href="/admin/seo"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-600 hover:bg-cyan-700 text-white transition-colors"
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  SEO Dashboard
                </Link>
                <a
                  href="https://search.google.com/search-console"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Google Search Console
                </a>
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              Last inspected: {idx.lastInspected ? timeAgo(idx.lastInspected) : 'never'}
            </span>
            <span>
              Total tracked: {idx.totalUrls} URLs
            </span>
          </div>
        </div>
      ) : (
        <div className="text-center py-4">
          <Globe className="h-8 w-8 text-gray-700 mx-auto mb-2" />
          <p className="text-sm text-gray-500 mb-2">No indexing data yet</p>
          <p className="text-xs text-gray-600">
            Click &quot;Submit All Pages&quot; to start tracking, or run the SEO agent cron job.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Fix Guide Panel ─────────────────────────────────────────────────

function FixGuidePanel({
  guide,
  errorDetail,
  onAction,
  retriggeringJob,
  compact = false,
}: {
  guide: FixInstruction;
  errorDetail?: string;
  onAction: (action: FixInstruction['actions'][0]) => void;
  retriggeringJob: string | null;
  compact?: boolean;
}) {
  const [expanded, setExpanded] = useState(!compact);

  const severityColors = {
    critical: 'border-red-500/20 bg-red-500/5',
    warning: 'border-amber-500/20 bg-amber-500/5',
    info: 'border-blue-500/20 bg-blue-500/5',
  };

  const severityIcon = {
    critical: <AlertTriangle className="h-4 w-4 text-red-400" />,
    warning: <AlertTriangle className="h-4 w-4 text-amber-400" />,
    info: <Lightbulb className="h-4 w-4 text-blue-400" />,
  };

  return (
    <div className={`border rounded-xl ${severityColors[guide.severity]} overflow-hidden`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {severityIcon[guide.severity]}
          <span className="font-medium text-sm">{guide.title}</span>
        </div>
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-500" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Error detail if provided */}
          {errorDetail && (
            <div className="bg-black/30 border border-gray-800 rounded-lg p-3 text-xs text-red-300 font-mono break-all">
              {errorDetail.slice(0, 300)}
            </div>
          )}

          {/* Steps */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">How to fix</p>
            <ol className="space-y-1">
              {guide.steps.map((step, i) => (
                <li key={i} className="flex gap-2 text-xs text-gray-300">
                  <span className="text-gray-600 font-mono flex-shrink-0">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 pt-1">
            {guide.actions.map((action, i) => {
              const isRetriggering = action.onClick?.startsWith('retrigger:') &&
                retriggeringJob === action.onClick.replace('retrigger:', '');

              if (action.href && !action.onClick) {
                const isExternal = action.href.startsWith('http');
                if (isExternal) {
                  return (
                    <a
                      key={i}
                      href={action.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={actionButtonClass(action.variant)}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {action.label}
                    </a>
                  );
                }
                return (
                  <Link key={i} href={action.href} className={actionButtonClass(action.variant)}>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    {action.label}
                  </Link>
                );
              }

              return (
                <button
                  key={i}
                  onClick={() => onAction(action)}
                  disabled={isRetriggering}
                  className={actionButtonClass(action.variant)}
                >
                  {isRetriggering ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                  {isRetriggering ? 'Running...' : action.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function actionButtonClass(variant: 'primary' | 'secondary' | 'danger') {
  const base = 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50';
  switch (variant) {
    case 'primary':
      return `${base} bg-cyan-600 hover:bg-cyan-700 text-white`;
    case 'secondary':
      return `${base} bg-gray-700 hover:bg-gray-600 text-gray-200`;
    case 'danger':
      return `${base} bg-red-600/80 hover:bg-red-600 text-white`;
  }
}

// ─── Cron Job Row ────────────────────────────────────────────────────

function CronJobRow({
  cron,
  expanded,
  onToggle,
  onAction,
  retriggeringJob,
}: {
  cron: CronJobStatus;
  expanded: boolean;
  onToggle: () => void;
  onAction: (action: FixInstruction['actions'][0]) => void;
  retriggeringJob: string | null;
}) {
  const guide = CRON_FIX_GUIDE[cron.jobName];
  // Derive effective status: "completed" with all items failed is really "failed"
  const effectiveStatus =
    cron.status === 'completed' && cron.itemsFailed > 0 && cron.itemsFailed === cron.itemsProcessed
      ? 'degraded'
      : cron.status;
  const isFailed = effectiveStatus === 'failed' || effectiveStatus === 'timed_out' || effectiveStatus === 'degraded';

  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-gray-800/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <StatusDot status={effectiveStatus} />
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
          <StatusBadge status={effectiveStatus} />
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-500" />
          )}
        </div>
      </button>
      {expanded && (
        <div className="px-5 pb-4 space-y-3 border-t border-gray-800/50">
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

          {/* Fix guide for failed jobs */}
          {isFailed && guide && (
            <FixGuidePanel
              guide={cron.error ? (getErrorFixGuide(cron.error, cron.jobName) ?? guide) : guide}
              onAction={onAction}
              retriggeringJob={retriggeringJob}
            />
          )}

          {/* Quick actions for healthy jobs too */}
          {!isFailed && guide && (
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={() => onAction({ label: 'Re-trigger', onClick: `retrigger:${cron.jobName}`, variant: 'secondary' })}
                disabled={retriggeringJob === cron.jobName}
                className={actionButtonClass('secondary')}
              >
                {retriggeringJob === cron.jobName ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
                {retriggeringJob === cron.jobName ? 'Running...' : 'Health Check'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Error Row ───────────────────────────────────────────────────────

function ErrorRow({
  err,
  expanded,
  onToggle,
  onAction,
  retriggeringJob,
}: {
  err: RecentError;
  expanded: boolean;
  onToggle: () => void;
  onAction: (action: FixInstruction['actions'][0]) => void;
  retriggeringJob: string | null;
}) {
  const guide = getErrorFixGuide(err.error, err.jobName);

  return (
    <div>
      <button
        onClick={onToggle}
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
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-500" />
          )}
        </div>
      </button>
      {expanded && (
        <div className="px-5 pb-4 border-t border-gray-800/50 space-y-3">
          <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-3 mt-3 text-xs text-red-300 font-mono break-all whitespace-pre-wrap">
            {err.error}
          </div>
          {err.durationMs !== null && (
            <p className="text-xs text-gray-500">
              Duration: {err.durationMs}ms
            </p>
          )}

          {/* Fix guide for this error */}
          {guide && (
            <FixGuidePanel
              guide={guide}
              onAction={onAction}
              retriggeringJob={retriggeringJob}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Site Card ───────────────────────────────────────────────────────

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
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-500">{site.domain}</p>
        {site.domain && (
          <a
            href={`https://${site.domain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-cyan-500 hover:text-cyan-400 flex items-center gap-1"
          >
            <ExternalLink className="h-3 w-3" />
            Visit
          </a>
        )}
      </div>
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

      {/* Quick fix hint for down/degraded sites */}
      {(site.status === 'down' || site.status === 'degraded') && (
        <div className="mt-3 pt-3 border-t border-gray-800/50">
          <div className="flex items-start gap-2">
            <Lightbulb className="h-3.5 w-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-gray-400">
              {site.status === 'down'
                ? 'Check DNS settings, Vercel deployment, and database connection.'
                : 'Health score is low. Check cron jobs, SEO audits, and analytics sync.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────

function StatusDot({ status }: { status: string }) {
  const color =
    status === 'completed'
      ? 'bg-emerald-500'
      : status === 'running'
        ? 'bg-blue-500 animate-pulse'
        : status === 'degraded'
          ? 'bg-orange-500'
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
    degraded: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
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
