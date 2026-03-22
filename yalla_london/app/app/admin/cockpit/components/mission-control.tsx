"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { RefreshCw, AlertTriangle, ExternalLink } from "lucide-react";
import { ZHCard, ZHAlertBanner, ZHActionBtn, ZHSectionLabel, ZHBadge, ZHMonoVal } from "@/components/zh";
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

export function MissionControl() {
  const [data, setData] = useState<CockpitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/cockpit");
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
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-zh-gold border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="font-zh-mono text-[10px] text-zh-cream-muted uppercase tracking-[2px]">Loading Mission Control…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ZHAlertBanner severity="error">
        <div className="flex items-center justify-between">
          <span>Failed to load dashboard: {error}</span>
          <ZHActionBtn variant="secondary" size="sm" onClick={fetchData}>Retry</ZHActionBtn>
        </div>
      </ZHAlertBanner>
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
          <h1 className="font-zh-ui font-bold text-lg text-zh-cream">Mission Control</h1>
          <p className="font-zh-mono text-[10px] text-zh-cream-muted uppercase tracking-[2px]">
            {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-zh-mono text-[9px] text-zh-cream-dim">
            {lastRefresh.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
          </span>
          <ZHActionBtn variant="ghost" size="sm" onClick={fetchData}>
            <RefreshCw size={13} />
          </ZHActionBtn>
        </div>
      </div>

      {/* Alerts */}
      {data.alerts.length > 0 && (
        <div className="space-y-2">
          {data.alerts.slice(0, 3).map((alert, i) => (
            <ZHAlertBanner
              key={i}
              severity={alert.severity === "critical" ? "error" : alert.severity === "warning" ? "warn" : "info"}
            >
              <div className="font-zh-ui text-sm font-medium">{alert.message}</div>
              {alert.detail && <div className="font-zh-mono text-xs mt-1 opacity-80">{alert.detail}</div>}
            </ZHAlertBanner>
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
        <ZHCard>
          <ZHSectionLabel>Revenue</ZHSectionLabel>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-zh-mono text-[10px] text-zh-cream-muted uppercase">Clicks (7d)</span>
              <ZHMonoVal className="text-zh-cream">{r.affiliateClicksWeek}</ZHMonoVal>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-zh-mono text-[10px] text-zh-cream-muted uppercase">Revenue (7d)</span>
              <ZHMonoVal className="text-zh-gold">${r.revenueWeekUsd.toFixed(2)}</ZHMonoVal>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-zh-mono text-[10px] text-zh-cream-muted uppercase">AI Cost (7d)</span>
              <ZHMonoVal className="text-zh-error-text">${r.aiCostWeekUsd.toFixed(2)}</ZHMonoVal>
            </div>
            <div className="pt-2 border-t border-zh-navy-border flex items-center justify-between">
              <span className="font-zh-mono text-[10px] text-zh-cream-muted uppercase">Indexing</span>
              <div className="flex items-center gap-2">
                <ZHMonoVal className="text-zh-cream">{ix.indexed}/{ix.total}</ZHMonoVal>
                <ZHBadge variant={ix.rate > 80 ? "success" : ix.rate > 50 ? "warn" : "error"}>
                  {ix.rate}%
                </ZHBadge>
              </div>
            </div>
          </div>
        </ZHCard>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <ZHActionBtn variant="primary" onClick={() => triggerCron("/api/cron/content-builder")}>
          Run Pipeline
        </ZHActionBtn>
        <ZHActionBtn variant="secondary" onClick={() => triggerCron("/api/cron/content-selector")}>
          Publish Ready
        </ZHActionBtn>
        <ZHActionBtn variant="secondary" onClick={() => triggerCron("/api/cron/seo-agent")}>
          SEO Agent
        </ZHActionBtn>
        <Link href="/admin/cockpit/write">
          <ZHActionBtn variant="ghost">+ Write Article</ZHActionBtn>
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
