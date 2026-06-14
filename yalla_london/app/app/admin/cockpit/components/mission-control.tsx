"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { RefreshCw, AlertTriangle, ExternalLink } from "lucide-react";
import { AdminCard, AdminAlertBanner, AdminButton, AdminSectionLabel, AdminStatusBadge, AdminLoadingState } from "@/components/admin/admin-ui";
import { HeroBar } from "./hero-bar";
import { ServicePills } from "./service-pills";
import { PipelineTrackBar } from "./pipeline-track";
import { CronTable } from "./cron-table";
import { PortfolioStrip } from "./portfolio-strip";

// ─── Types (matching cockpit API response) ───────────────────────────────────

interface Alert {
  severity: "critical" | "warning" | "info";
  message: string;
  detail: string;
  fix: string;
}

interface CockpitData {
  pipeline: {
    publishedToday: number;
    publishedTotal: number;
    reservoir: number;
    draftsActive: number;
    byPhase: Record<string, number>;
  };
  indexing: {
    indexed: number;
    total: number;
    rate: number;
    gscTotalClicks7d: number;
    gscTotalImpressions7d: number;
  };
  cronHealth: {
    failedLast24h: number;
    recentJobs: Array<{
      name: string;
      status: string;
      durationMs: number | null;
      startedAt: string;
      error: string | null;
      plainError: string | null;
      itemsProcessed: number;
    }>;
  };
  traffic: {
    sessions7d: number;
    pageViews7d: number;
  };
  revenue: {
    affiliateClicksWeek: number;
    revenueWeekUsd: number;
    aiCostWeekUsd: number;
  };
  alerts: Alert[];
  sites: Array<{
    id: string;
    name: string;
    domain: string;
    isActive: boolean;
    articlesTotal: number;
    articlesPublished: number;
    avgSeoScore: number;
    indexRate: number;
    lastPublishedAt: string | null;
  }>;
}

export function MissionControl({ siteId }: { siteId?: string }) {
  const [data, setData] = useState<CockpitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    try {
      const url = siteId && siteId !== "all"
        ? `/api/admin/cockpit?siteId=${encodeURIComponent(siteId)}`
        : "/api/admin/cockpit";
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return <AdminLoadingState label="Loading Mission Control…" />;
  }

  if (error) {
    return (
      <AdminAlertBanner
        severity="critical"
        message={`Failed to load dashboard: ${error}`}
        action={<AdminButton variant="secondary" size="sm" onClick={fetchData}>Retry</AdminButton>}
      />
    );
  }

  if (!data) return null;

  const p = data.pipeline;
  const ix = data.indexing;
  const t = data.traffic || { sessions7d: 0, pageViews7d: 0 };
  const r = data.revenue || { affiliateClicksWeek: 0, revenueWeekUsd: 0, aiCostWeekUsd: 0 };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[var(--font-display)] font-extrabold text-xl text-stone-900 tracking-tight">Mission Control</h1>
          <p className="font-[var(--font-system)] text-[11px] text-stone-500 uppercase tracking-[0.8px]">
            {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span style={{ fontFamily: "var(--font-system,'IBM Plex Mono',monospace)" }} className="tabular-nums text-[11px] text-stone-400">
            {lastRefresh.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
          </span>
          <AdminButton variant="ghost" size="sm" onClick={fetchData}>
            <RefreshCw size={13} />
          </AdminButton>
        </div>
      </div>

      {/* Alerts */}
      {data.alerts.length > 0 && (
        <div className="space-y-2">
          {data.alerts.slice(0, 3).map((alert, i) => (
            <AdminAlertBanner
              key={i}
              severity={alert.severity === "critical" ? "critical" : alert.severity === "warning" ? "warning" : "info"}
              message={alert.message}
              detail={alert.detail || undefined}
            />
          ))}
        </div>
      )}

      {/* Service Pills */}
      <ServicePills />

      {/* Hero KPIs */}
      <HeroBar
        publishedToday={p.publishedToday}
        indexed={ix.indexed}
        sessions7d={t.sessions7d}
        clicks7d={ix.gscTotalClicks7d}
      />

      {/* Pipeline + Revenue Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pipeline Track — 2 cols */}
        <div className="lg:col-span-2">
          <PipelineTrackBar byPhase={p.byPhase} />
        </div>

        {/* Revenue Card */}
        <AdminCard>
          <AdminSectionLabel>Revenue</AdminSectionLabel>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-[var(--font-system)] text-[11px] text-stone-500 uppercase tracking-[0.8px]">Clicks (7d)</span>
              <span style={{ fontFamily: "var(--font-system,'IBM Plex Mono',monospace)" }} className="tabular-nums text-stone-900">{r.affiliateClicksWeek}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-[var(--font-system)] text-[11px] text-stone-500 uppercase tracking-[0.8px]">Revenue (7d)</span>
              <span style={{ fontFamily: "var(--font-system,'IBM Plex Mono',monospace)" }} className="tabular-nums text-[#C49A2A]">${r.revenueWeekUsd.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-[var(--font-system)] text-[11px] text-stone-500 uppercase tracking-[0.8px]">AI Cost (7d)</span>
              <span style={{ fontFamily: "var(--font-system,'IBM Plex Mono',monospace)" }} className="tabular-nums text-[#C8322B]">${r.aiCostWeekUsd.toFixed(2)}</span>
            </div>
            <div className="pt-2 border-t border-[rgba(214,208,196,0.5)] flex items-center justify-between">
              <span className="font-[var(--font-system)] text-[11px] text-stone-500 uppercase tracking-[0.8px]">Indexing</span>
              <div className="flex items-center gap-2">
                <span style={{ fontFamily: "var(--font-system,'IBM Plex Mono',monospace)" }} className="tabular-nums text-stone-900">{ix.indexed}/{ix.total}</span>
                <AdminStatusBadge
                  status={ix.rate > 80 ? "success" : ix.rate > 50 ? "warning" : "error"}
                  label={`${ix.rate}%`}
                />
              </div>
            </div>
          </div>
        </AdminCard>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <AdminButton variant="primary" onClick={() => triggerCron("/api/cron/content-builder")}>
          Run Pipeline
        </AdminButton>
        <AdminButton variant="secondary" onClick={() => triggerCron("/api/cron/content-selector")}>
          Publish Ready
        </AdminButton>
        <AdminButton variant="secondary" onClick={() => triggerCron("/api/cron/seo-agent")}>
          SEO Agent
        </AdminButton>
        <AdminButton variant="secondary" onClick={() => runContentCleanup()}>
          Content Cleanup
        </AdminButton>
        <Link href="/admin/cockpit/write">
          <AdminButton variant="ghost">+ Write Article</AdminButton>
        </Link>
      </div>

      {/* Cron Table */}
      <CronTable
        jobs={data.cronHealth.recentJobs}
        failedLast24h={data.cronHealth.failedLast24h}
      />

      {/* Portfolio Strip */}
      <PortfolioStrip sites={data.sites} />
    </div>
  );
}

async function runContentCleanup() {
  try {
    const res = await fetch("/api/admin/content-cleanup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "full_cleanup" }),
    });
    if (res.ok) {
      const data = await res.json();
      const msg = [
        data.artifactsFixed && `${data.artifactsFixed} artifacts fixed`,
        data.duplicatesUnpublished && `${data.duplicatesUnpublished} duplicates removed`,
        data.seoResults?.newlyTracked && `${data.seoResults.newlyTracked} URLs tracked`,
      ].filter(Boolean).join(", ");
      alert(msg || "Cleanup complete — nothing needed");
    } else {
      console.warn("Content cleanup failed:", res.status);
    }
  } catch (err) {
    console.warn("Content cleanup error:", err instanceof Error ? err.message : err);
  }
}

async function triggerCron(path: string) {
  try {
    const res = await fetch("/api/admin/departures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    });
    if (!res.ok) {
      console.warn(`Cron trigger failed: ${res.status}`);
    }
  } catch (err) {
    console.warn("Cron trigger error:", err instanceof Error ? err.message : err);
  }
}
