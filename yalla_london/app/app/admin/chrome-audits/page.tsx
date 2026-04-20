"use client";

/**
 * /admin/chrome-audits — Admin viewer for Claude Chrome Bridge audit reports.
 * Lists reports, filters by site/type/status, expandable markdown preview,
 * one-tap "Apply Fix" / "Dismiss" / "Mark Reviewed".
 */

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FileText } from "lucide-react";
import {
  AdminPageHeader,
  AdminCard,
  AdminButton,
  AdminStatusBadge,
  AdminLoadingState,
  AdminEmptyState,
} from "@/components/admin/admin-ui";

type Severity = "info" | "warning" | "critical";
type Status = "new" | "reviewed" | "fix_queued" | "fixed" | "dismissed";
type AuditType = "per_page" | "sitewide" | "action_log_triage" | "offsite";

interface AuditReportRow {
  id: string;
  siteId: string;
  pageUrl: string;
  pageSlug: string | null;
  auditType: AuditType;
  severity: Severity;
  status: Status;
  uploadedAt: string;
  reviewedAt?: string | null;
  fixedAt?: string | null;
  agentTaskId?: string | null;
}

interface AuditReportDetail extends AuditReportRow {
  findings?: unknown[];
  interpretedActions?: unknown[];
  rawData?: Record<string, unknown>;
  reportMarkdown?: string;
  reportPath?: string;
  uploadedBy?: string;
}

const SEVERITY_ORDER: Record<Severity, number> = { critical: 3, warning: 2, info: 1 };

// Map severity/status to AdminStatusBadge's internal STATUS_CONFIG keys
function severityStatus(s: Severity): string {
  if (s === "critical") return "error";
  if (s === "warning") return "warning";
  return "active";
}

function statusStatus(s: Status): string {
  if (s === "new") return "pending";
  if (s === "reviewed") return "running";
  if (s === "fix_queued") return "generating";
  if (s === "fixed") return "success";
  return "inactive"; // dismissed
}

export default function ChromeAuditsPage() {
  const searchParams = useSearchParams();
  const focusReportId = searchParams?.get("reportId") ?? null;

  const [reports, setReports] = useState<AuditReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [filters, setFilters] = useState<{ siteId: string; auditType: string; status: string }>({
    siteId: "",
    auditType: "",
    status: "",
  });
  const [expanded, setExpanded] = useState<string | null>(focusReportId);
  const [detail, setDetail] = useState<AuditReportDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actioning, setActioning] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const params = new URLSearchParams();
      if (filters.siteId) params.set("siteId", filters.siteId);
      if (filters.auditType) params.set("auditType", filters.auditType);
      if (filters.status) params.set("status", filters.status);
      const res = await fetch(`/api/admin/chrome-audits?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setReports(data.reports ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/chrome-audits?reportId=${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setDetail(data.report ?? null);
    } catch (e) {
      console.warn("[chrome-audits] loadDetail failed:", e);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (expanded) void loadDetail(expanded);
  }, [expanded, loadDetail]);

  const applyAction = useCallback(
    async (reportId: string, action: "apply_fix" | "dismiss" | "mark_reviewed" | "mark_fixed") => {
      setActioning(reportId);
      try {
        const res = await fetch(`/api/admin/chrome-audits`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reportId, action }),
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text);
        }
        await load();
        if (expanded === reportId) await loadDetail(reportId);
      } catch (e) {
        alert(`Action failed: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setActioning(null);
      }
    },
    [load, loadDetail, expanded],
  );

  const sorted = [...reports].sort(
    (a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity],
  );

  const newCount = reports.filter((r) => r.status === "new").length;
  const criticalCount = reports.filter((r) => r.severity === "critical").length;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <AdminPageHeader
        title="Chrome Audit Reports"
        subtitle={`${newCount} new · ${criticalCount} critical · Uploaded by Claude Chrome Bridge`}
      />

      <AdminCard className="mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--admin-text-muted)]">Site</label>
            <select
              value={filters.siteId}
              onChange={(e) => setFilters((f) => ({ ...f, siteId: e.target.value }))}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="">All sites</option>
              <option value="yalla-london">Yalla London</option>
              <option value="arabaldives">Arabaldives</option>
              <option value="french-riviera">Yalla Riviera</option>
              <option value="istanbul">Yalla Istanbul</option>
              <option value="thailand">Yalla Thailand</option>
              <option value="zenitha-yachts-med">Zenitha Yachts</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--admin-text-muted)]">Audit Type</label>
            <select
              value={filters.auditType}
              onChange={(e) => setFilters((f) => ({ ...f, auditType: e.target.value }))}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="">All types</option>
              <option value="per_page">Per-page</option>
              <option value="sitewide">Sitewide</option>
              <option value="action_log_triage">Action log triage</option>
              <option value="offsite">Offsite</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--admin-text-muted)]">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="">All statuses</option>
              <option value="new">New</option>
              <option value="reviewed">Reviewed</option>
              <option value="fix_queued">Fix queued</option>
              <option value="fixed">Fixed</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>
          <AdminButton onClick={() => void load()} variant="secondary">
            Refresh
          </AdminButton>
        </div>
      </AdminCard>

      {loading && <AdminLoadingState label="Loading reports..." />}
      {err && (
        <AdminCard className="border-red-300">
          <p className="text-sm text-red-700">Error: {err}</p>
        </AdminCard>
      )}

      {!loading && !err && reports.length === 0 && (
        <AdminEmptyState
          icon={FileText}
          title="No audit reports yet"
          description="Claude Chrome has not uploaded any audit reports. See docs/chrome-audits/PLAYBOOK.md for the methodology."
        />
      )}

      <div className="flex flex-col gap-3">
        {sorted.map((r) => {
          const isExpanded = expanded === r.id;
          return (
            <AdminCard key={r.id} className={isExpanded ? "ring-2 ring-blue-400" : ""}>
              <div
                className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 cursor-pointer"
                onClick={() => setExpanded(isExpanded ? null : r.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setExpanded(isExpanded ? null : r.id);
                  }
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <AdminStatusBadge status={severityStatus(r.severity)} label={r.severity.toUpperCase()} />
                    <AdminStatusBadge status={statusStatus(r.status)} label={r.status} />
                    <span className="text-xs text-[var(--admin-text-muted)]">{r.auditType}</span>
                    <span className="text-xs text-[var(--admin-text-muted)]">{r.siteId}</span>
                  </div>
                  <div className="text-sm font-medium truncate">{r.pageSlug ?? r.pageUrl}</div>
                  <div className="text-xs text-[var(--admin-text-muted)] truncate">{r.pageUrl}</div>
                  <div className="text-xs text-[var(--admin-text-muted)] mt-1">
                    Uploaded {new Date(r.uploadedAt).toLocaleString()}
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                  {r.status === "new" && (
                    <>
                      <AdminButton
                        onClick={() => void applyAction(r.id, "apply_fix")}
                        loading={actioning === r.id}
                        variant="primary"
                      >
                        Apply Fix
                      </AdminButton>
                      <AdminButton
                        onClick={() => void applyAction(r.id, "dismiss")}
                        loading={actioning === r.id}
                        variant="secondary"
                      >
                        Dismiss
                      </AdminButton>
                    </>
                  )}
                  {r.status === "fix_queued" && (
                    <AdminButton
                      onClick={() => void applyAction(r.id, "mark_fixed")}
                      loading={actioning === r.id}
                      variant="primary"
                    >
                      Mark Fixed
                    </AdminButton>
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="mt-4 pt-4 border-t">
                  {detailLoading && <AdminLoadingState label="Loading details..." />}
                  {detail && detail.id === r.id && (
                    <div className="flex flex-col gap-3">
                      {detail.agentTaskId && (
                        <div className="text-xs text-[var(--admin-text-muted)]">
                          Agent Task: <code>{detail.agentTaskId}</code>
                        </div>
                      )}
                      {detail.reportPath && (
                        <div className="text-xs text-[var(--admin-text-muted)]">
                          Path: <code>{detail.reportPath}</code>
                        </div>
                      )}
                      {Array.isArray(detail.findings) && detail.findings.length > 0 && (
                        <div>
                          <div className="text-sm font-semibold mb-2">
                            Findings ({detail.findings.length})
                          </div>
                          <div className="flex flex-col gap-2">
                            {(detail.findings as Array<Record<string, unknown>>).map((f, i) => (
                              <div key={i} className="text-xs bg-[var(--admin-bg)] p-2 rounded">
                                <div className="font-mono">
                                  {String(f.pillar ?? "?")} · {String(f.severity ?? "info")}
                                </div>
                                <div>{String(f.issue ?? "")}</div>
                                {f.evidence ? (
                                  <div className="text-[var(--admin-text-muted)] mt-1">
                                    Evidence: {String(f.evidence)}
                                  </div>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {Array.isArray(detail.interpretedActions) &&
                        detail.interpretedActions.length > 0 && (
                          <div>
                            <div className="text-sm font-semibold mb-2">
                              Proposed Actions ({detail.interpretedActions.length})
                            </div>
                            <div className="flex flex-col gap-2">
                              {(detail.interpretedActions as Array<Record<string, unknown>>).map(
                                (a, i) => (
                                  <div key={i} className="text-xs bg-[var(--admin-bg)] p-2 rounded">
                                    <div className="font-mono">
                                      {String(a.priority ?? "?")} ·{" "}
                                      {a.autoFixable ? "auto-fixable" : "manual"}
                                    </div>
                                    <div>{String(a.action ?? "")}</div>
                                    {a.expectedImpact ? (
                                      <div className="text-[var(--admin-text-muted)] mt-1">
                                        Impact: {String(a.expectedImpact)}
                                      </div>
                                    ) : null}
                                    {a.relatedKG ? (
                                      <div className="text-[var(--admin-text-muted)]">
                                        Related: {String(a.relatedKG)}
                                      </div>
                                    ) : null}
                                  </div>
                                ),
                              )}
                            </div>
                          </div>
                        )}
                      {detail.reportMarkdown && (
                        <details>
                          <summary className="text-sm font-semibold cursor-pointer">
                            Full markdown report
                          </summary>
                          <pre className="text-xs whitespace-pre-wrap bg-[var(--admin-bg)] p-3 rounded mt-2 overflow-x-auto">
                            {detail.reportMarkdown}
                          </pre>
                        </details>
                      )}
                      <div className="flex gap-2 pt-2 border-t">
                        {r.status !== "reviewed" &&
                          r.status !== "fixed" &&
                          r.status !== "dismissed" && (
                            <AdminButton
                              onClick={() => void applyAction(r.id, "mark_reviewed")}
                              loading={actioning === r.id}
                              variant="secondary"
                            >
                              Mark Reviewed
                            </AdminButton>
                          )}
                        <Link
                          href={r.pageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 underline self-center"
                        >
                          Open page ↗
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </AdminCard>
          );
        })}
      </div>

      <div className="mt-8 text-xs text-[var(--admin-text-muted)]">
        <p>
          Playbook: <code>docs/chrome-audits/PLAYBOOK.md</code>
        </p>
        <p>
          Bridge API: <code>/api/admin/chrome-bridge</code> (token: CLAUDE_BRIDGE_TOKEN env var)
        </p>
      </div>
    </div>
  );
}
