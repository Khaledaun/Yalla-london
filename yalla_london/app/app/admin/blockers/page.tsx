"use client";

import React, { useState, useEffect, useCallback } from "react";
import { RefreshCw, AlertTriangle, Zap, CheckCircle, Clock, Bug, Link2, Eye } from "lucide-react";
import {
  AdminCard, AdminAlertBanner, AdminButton, AdminSectionLabel,
  AdminStatusBadge, AdminPageHeader, AdminLoadingState,
} from "@/components/admin/admin-ui";

interface BlockerBreakdown {
  failedCrons24h: number;
  zombieCrons: number;
  stuckDrafts: number;
  indexingErrors: number;
}

interface EnvVar {
  key: string;
  category: string;
  status: "SET" | "MISSING";
}

export default function BlockersPage() {
  const [blockers, setBlockers] = useState<BlockerBreakdown | null>(null);
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [blockerRes, envRes] = await Promise.all([
        fetch("/api/admin/system/blocker-count"),
        fetch("/api/admin/system/env-health"),
      ]);

      if (blockerRes.ok) {
        const data = await blockerRes.json();
        setBlockers(data.breakdown);
      }
      if (envRes.ok) {
        const data = await envRes.json();
        setEnvVars(data.vars || []);
      }
    } catch (err) {
      console.warn("[blockers-page] fetch failed:", err instanceof Error ? err.message : err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const runAction = async (actionId: string, endpoint: string, method: string = "POST", body?: Record<string, unknown>) => {
    setActionLoading(actionId);
    setActionResult(null);
    try {
      const res = await fetch(endpoint, {
        method,
        ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
      });
      if (res.ok) {
        const data = await res.json();
        setActionResult({ type: "success", message: data.message || `${actionId} completed` });
        fetchData(); // refresh counts
      } else {
        setActionResult({ type: "error", message: `Failed: HTTP ${res.status}` });
      }
    } catch (err) {
      setActionResult({ type: "error", message: err instanceof Error ? err.message : "Failed" });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--admin-bg)] p-4 md:p-6">
        <AdminLoadingState />
      </div>
    );
  }

  const b = blockers || { failedCrons24h: 0, zombieCrons: 0, stuckDrafts: 0, indexingErrors: 0 };
  const totalBlockers = b.failedCrons24h + b.zombieCrons + b.stuckDrafts + b.indexingErrors;
  const missingEnvVars = envVars.filter((v) => v.status === "MISSING");

  const blockerItems = [
    {
      id: "failed-crons",
      icon: AlertTriangle,
      label: "Failed Crons (24h)",
      count: b.failedCrons24h,
      severity: b.failedCrons24h > 5 ? "error" as const : b.failedCrons24h > 0 ? "warn" as const : "success" as const,
      action: { label: "View Logs", href: "/admin/automation" },
    },
    {
      id: "zombie-crons",
      icon: Clock,
      label: "Zombie Crons (running >15min)",
      count: b.zombieCrons,
      severity: b.zombieCrons > 0 ? "error" as const : "success" as const,
      action: { label: "Clear Zombies", onClick: () => runAction("zombie-crons", "/api/admin/departures", "POST", { path: "/api/cron/diagnostic-sweep" }) },
    },
    {
      id: "stuck-drafts",
      icon: Bug,
      label: "Stuck Drafts (>4h without progress)",
      count: b.stuckDrafts,
      severity: b.stuckDrafts > 10 ? "error" as const : b.stuckDrafts > 0 ? "warn" as const : "success" as const,
      action: { label: "Run Diagnostic", onClick: () => runAction("stuck-drafts", "/api/admin/departures", "POST", { path: "/api/cron/diagnostic-sweep" }) },
    },
    {
      id: "indexing-errors",
      icon: Link2,
      label: "Indexing Errors (404s + deindexed)",
      count: b.indexingErrors,
      severity: b.indexingErrors > 20 ? "error" as const : b.indexingErrors > 0 ? "warn" as const : "success" as const,
      action: { label: "Run 404 Fix", onClick: () => runAction("indexing-errors", "/api/admin/seo/fix-404s", "POST") },
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--admin-bg)] p-4 md:p-6">
      <div className="space-y-5 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <AdminPageHeader title="Blockers" />
          <AdminButton variant="ghost" size="sm" onClick={fetchData}>
            <RefreshCw size={13} />
          </AdminButton>
        </div>
        <p className="text-xs text-stone-500 uppercase tracking-[2px] -mt-3">
          {totalBlockers === 0 ? "All clear" : `${totalBlockers} issues need attention`}
        </p>

        {/* Action result toast */}
        {actionResult && (
          <AdminAlertBanner
            severity={actionResult.type === "success" ? "info" : "critical"}
            message={actionResult.message}
            onDismiss={() => setActionResult(null)}
          />
        )}

        {/* Overall status */}
        <AdminCard>
          <div className="flex items-center gap-3">
            <AdminStatusBadge
              status={totalBlockers === 0 ? "healthy" : totalBlockers > 10 ? "critical" : "degraded"}
              label={totalBlockers === 0 ? "Healthy" : totalBlockers > 10 ? "Critical" : "Degraded"}
            />
            <span className="font-mono text-lg font-bold text-stone-800">{totalBlockers}</span>
            <span className="font-mono text-[10px] text-stone-400 uppercase">total blockers</span>
          </div>
        </AdminCard>

        {/* Blocker rows */}
        <div className="space-y-2">
          {blockerItems.map((item) => {
            const Icon = item.icon;
            const severityBorder =
              item.severity === "error" ? "border-l-red-500" :
              item.severity === "warn" ? "border-l-amber-500" :
              "border-l-emerald-500";
            return (
              <div
                key={item.id}
                className={`bg-white border border-stone-200 rounded-lg p-4 border-l-4 ${severityBorder}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon size={16} className={
                      item.severity === "error" ? "text-red-500" :
                      item.severity === "warn" ? "text-amber-500" :
                      "text-emerald-500"
                    } />
                    <div>
                      <div className="text-sm font-medium text-stone-800">{item.label}</div>
                      <span className={`font-mono text-xs ${
                        item.count > 0 ? "text-red-600" : "text-emerald-600"
                      }`}>
                        {item.count}
                      </span>
                    </div>
                  </div>
                  {item.count > 0 && item.action && (
                    "onClick" in item.action ? (
                      <AdminButton
                        variant="secondary"
                        size="sm"
                        loading={actionLoading === item.id}
                        onClick={item.action.onClick}
                      >
                        {item.action.label}
                      </AdminButton>
                    ) : null
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Env Var Health */}
        <AdminCard>
          <AdminSectionLabel>Environment Variables</AdminSectionLabel>
          {missingEnvVars.length === 0 ? (
            <div className="flex items-center gap-2 text-emerald-600 font-mono text-xs mt-2">
              <CheckCircle size={14} />
              All {envVars.length} required variables configured
            </div>
          ) : (
            <div className="space-y-2 mt-2">
              <AdminAlertBanner
                severity="warning"
                message={`${missingEnvVars.length} of ${envVars.length} required variables missing`}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {missingEnvVars.map((v) => (
                  <div key={v.key} className="flex items-center justify-between px-3 py-1.5 rounded bg-stone-50 border border-stone-100">
                    <span className="font-mono text-xs text-stone-600">{v.key}</span>
                    <AdminStatusBadge status="critical" label="MISSING" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </AdminCard>
      </div>
    </div>
  );
}
