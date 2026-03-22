"use client";

import React, { useState, useEffect, useCallback } from "react";
import { RefreshCw, AlertTriangle, Zap, CheckCircle, Clock, Bug, Link2, Eye } from "lucide-react";
import {
  ZHCard, ZHAlertBanner, ZHActionBtn, ZHSectionLabel, ZHBadge, ZHMonoVal, ZHStatusPill,
} from "@/components/zh";

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
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-zh-gold border-t-transparent rounded-full animate-spin" />
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
    <div className="space-y-5 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-zh-ui font-bold text-lg text-zh-cream">Blockers</h1>
          <p className="font-zh-mono text-[10px] text-zh-cream-muted uppercase tracking-[2px]">
            {totalBlockers === 0 ? "All clear" : `${totalBlockers} issues need attention`}
          </p>
        </div>
        <ZHActionBtn variant="ghost" size="sm" onClick={fetchData}>
          <RefreshCw size={13} />
        </ZHActionBtn>
      </div>

      {/* Action result toast */}
      {actionResult && (
        <ZHAlertBanner severity={actionResult.type === "success" ? "success" : "error"} onDismiss={() => setActionResult(null)}>
          {actionResult.message}
        </ZHAlertBanner>
      )}

      {/* Overall status */}
      <ZHCard>
        <div className="flex items-center gap-3">
          <ZHStatusPill
            label={totalBlockers === 0 ? "Healthy" : totalBlockers > 10 ? "Critical" : "Degraded"}
            status={totalBlockers === 0 ? "ok" : totalBlockers > 10 ? "critical" : "degraded"}
          />
          <ZHMonoVal size="lg" className="text-zh-cream">{totalBlockers}</ZHMonoVal>
          <span className="font-zh-mono text-[10px] text-zh-cream-muted uppercase">total blockers</span>
        </div>
      </ZHCard>

      {/* Blocker rows */}
      <div className="space-y-2">
        {blockerItems.map((item) => {
          const Icon = item.icon;
          const severityColor =
            item.severity === "error" ? "border-l-zh-error-text" :
            item.severity === "warn" ? "border-l-zh-warn-text" :
            "border-l-zh-success-text";
          return (
            <div
              key={item.id}
              className={`bg-zh-navy-mid border border-zh-navy-border rounded-lg p-4 border-l-4 ${severityColor}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon size={16} className={
                    item.severity === "error" ? "text-zh-error-text" :
                    item.severity === "warn" ? "text-zh-warn-text" :
                    "text-zh-success-text"
                  } />
                  <div>
                    <div className="font-zh-ui text-sm text-zh-cream">{item.label}</div>
                    <ZHMonoVal size="sm" className={
                      item.count > 0 ? "text-zh-error-text" : "text-zh-success-text"
                    }>
                      {item.count}
                    </ZHMonoVal>
                  </div>
                </div>
                {item.count > 0 && item.action && (
                  "onClick" in item.action ? (
                    <ZHActionBtn
                      variant="secondary"
                      size="sm"
                      loading={actionLoading === item.id}
                      onClick={item.action.onClick}
                    >
                      {item.action.label}
                    </ZHActionBtn>
                  ) : null
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Env Var Health */}
      <ZHCard>
        <ZHSectionLabel>Environment Variables</ZHSectionLabel>
        {missingEnvVars.length === 0 ? (
          <div className="flex items-center gap-2 text-zh-success-text font-zh-mono text-xs">
            <CheckCircle size={14} />
            All {envVars.length} required variables configured
          </div>
        ) : (
          <div className="space-y-2">
            <ZHAlertBanner severity="warn">
              {missingEnvVars.length} of {envVars.length} required variables missing
            </ZHAlertBanner>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
              {missingEnvVars.map((v) => (
                <div key={v.key} className="flex items-center justify-between px-3 py-1.5 rounded bg-zh-navy-light">
                  <ZHMonoVal size="sm" className="text-zh-cream">{v.key}</ZHMonoVal>
                  <ZHBadge variant="error">MISSING</ZHBadge>
                </div>
              ))}
            </div>
          </div>
        )}
      </ZHCard>
    </div>
  );
}
