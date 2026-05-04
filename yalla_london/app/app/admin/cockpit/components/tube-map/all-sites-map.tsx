"use client";

import React, { useState, useEffect } from "react";

interface SiteSummary {
  siteId: string;
  name: string;
  articles: number;
  published: number;
  reservoir: number;
  pipeline: number;
  avgSeoScore: number | null;
  lastActivity: string | null;
}

interface AllSitesMapProps {
  onSelectSite: (siteId: string) => void;
  activeSiteId: string;
}

const SITE_COLORS: Record<string, { primary: string; accent: string; bg: string }> = {
  "yalla-london": { primary: "#C8322B", accent: "#C49A2A", bg: "#0F1621" },
  "zenitha-yachts-med": { primary: "#2E5A88", accent: "#C9A96E", bg: "#0A1628" },
  "arabaldives": { primary: "#0891B2", accent: "#06B6D4", bg: "#0D1B2A" },
  "french-riviera": { primary: "#1E3A5F", accent: "#D4AF37", bg: "#1A1A2E" },
  "istanbul": { primary: "#DC2626", accent: "#F97316", bg: "#1A0F0F" },
  "thailand": { primary: "#059669", accent: "#D97706", bg: "#0F1A0F" },
};

function healthPercent(s: SiteSummary): number {
  if (s.articles === 0) return 0;
  const pubRate = s.published / Math.max(s.articles, 1);
  const seoBonus = (s.avgSeoScore ?? 0) / 100;
  return Math.round((pubRate * 70 + seoBonus * 30));
}

function healthColor(pct: number): string {
  if (pct >= 70) return "#2D5A3D";
  if (pct >= 40) return "#C49A2A";
  if (pct > 0) return "#C8322B";
  return "#3B3B3B";
}

function timeAgo(iso: string | null): string {
  if (!iso) return "No activity";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function AllSitesMap({ onSelectSite, activeSiteId }: AllSitesMapProps) {
  const [sites, setSites] = useState<SiteSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/cockpit");
        if (!res.ok) return;
        const data = await res.json();
        const sitesData: SiteSummary[] = (data.sites ?? []).map((s: Record<string, unknown>) => ({
          siteId: String(s.siteId ?? s.id ?? ""),
          name: String(s.name ?? s.siteName ?? s.siteId ?? ""),
          articles: Number(s.totalArticles ?? s.articles ?? 0),
          published: Number(s.published ?? s.publishedCount ?? 0),
          reservoir: Number(s.reservoir ?? s.reservoirCount ?? 0),
          pipeline: Number(s.pipeline ?? s.inPipeline ?? 0),
          avgSeoScore: s.avgSeoScore != null ? Number(s.avgSeoScore) : null,
          lastActivity: s.lastActivity ? String(s.lastActivity) : null,
        }));
        setSites(sitesData.length > 0 ? sitesData : [
          { siteId: "yalla-london", name: "Yalla London", articles: 0, published: 0, reservoir: 0, pipeline: 0, avgSeoScore: null, lastActivity: null },
        ]);
      } catch {
        console.warn("[all-sites-map] Failed to fetch sites");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-white/30 text-sm">
        Loading sites...
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-[2px] bg-[#C49A2A]" />
        <h2 className="text-xs font-bold uppercase tracking-[0.25em] text-white/50">
          All Sites Overview
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {sites.map((site) => {
          const colors = SITE_COLORS[site.siteId] ?? { primary: "#3B7EA1", accent: "#C49A2A", bg: "#0F1419" };
          const hp = healthPercent(site);
          const hc = healthColor(hp);
          const isActive = site.siteId === activeSiteId;

          return (
            <button
              key={site.siteId}
              onClick={() => onSelectSite(site.siteId)}
              className={`text-left rounded-xl p-4 border transition-all duration-200 ${
                isActive
                  ? "border-[var(--admin-gold,#C49A2A)] bg-white/[0.06]"
                  : "border-white/[0.06] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]"
              }`}
            >
              {/* Site name + color dot */}
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: colors.primary }}
                />
                <span className="text-sm font-bold text-white truncate">{site.name}</span>
                {isActive && (
                  <span className="ml-auto text-[9px] font-mono text-[#C49A2A] uppercase tracking-wider">Active</span>
                )}
              </div>

              {/* Metrics row */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="text-center">
                  <div className="text-lg font-bold text-white">{site.published}</div>
                  <div className="text-[9px] text-white/30 uppercase tracking-wider">Published</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-white/70">{site.reservoir}</div>
                  <div className="text-[9px] text-white/30 uppercase tracking-wider">Reservoir</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-white/50">{site.pipeline}</div>
                  <div className="text-[9px] text-white/30 uppercase tracking-wider">Pipeline</div>
                </div>
              </div>

              {/* Health bar */}
              <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden mb-2">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${hp}%`, backgroundColor: hc }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-white/25 font-mono">{hp}% health</span>
                <span className="text-[9px] text-white/25 font-mono">{timeAgo(site.lastActivity)}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
