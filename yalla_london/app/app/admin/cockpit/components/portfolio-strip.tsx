"use client";

import Link from "next/link";
import { AdminStatusBadge } from "@/components/admin/admin-ui";

interface SiteSummary {
  id: string;
  name: string;
  domain: string;
  isActive: boolean;
  articlesTotal: number;
  articlesPublished: number;
  avgSeoScore: number;
  indexRate: number;
  lastPublishedAt: string | null;
}

interface PortfolioStripProps {
  sites: SiteSummary[];
}

// Brand colors per site for the accent strip
const SITE_COLORS: Record<string, string> = {
  "yalla-london": "#C8322B",
  "arabaldives": "#0891B2",
  "french-riviera": "#1E3A5F",
  "istanbul": "#DC2626",
  "thailand": "#059669",
  "zenitha-yachts-med": "#C9A96E",
  "zenitha-luxury": "#C4A96C",
};

export function PortfolioStrip({ sites }: PortfolioStripProps) {
  return (
    <div className="bg-white border border-[rgba(214,208,196,0.6)] rounded-lg p-4 shadow-[0_1px_3px_rgba(28,25,23,0.04),0_4px_12px_rgba(28,25,23,0.04)]">
      <p style={{ fontFamily: "var(--font-system)", fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#78716C' }} className="mb-3">
        Portfolio
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {sites.map((site) => {
          const color = SITE_COLORS[site.id] || "#C9A84C";
          return (
            <Link
              key={site.id}
              href={`/admin/cockpit?site=${site.id}`}
              className="group block bg-white border border-[rgba(214,208,196,0.6)] rounded-lg overflow-hidden hover:border-[#C49A2A] transition-colors shadow-[0_1px_3px_rgba(28,25,23,0.04)]"
            >
              {/* Accent bar */}
              <div className="h-[3px]" style={{ backgroundColor: color }} />
              <div className="p-3">
                {/* Name + status */}
                <div className="flex items-center justify-between mb-2">
                  <span className="font-[var(--font-system)] font-semibold text-xs text-stone-900">{site.name}</span>
                  <AdminStatusBadge
                    status={site.isActive ? "success" : "info"}
                    label={site.isActive ? "Active" : "Planned"}
                  />
                </div>
                {/* Metrics */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <div style={{ fontFamily: "var(--font-system)", fontSize: 10, textTransform: 'uppercase', color: '#78716C' }}>Articles</div>
                    <span style={{ fontFamily: "var(--font-system,'IBM Plex Mono',monospace)" }} className="tabular-nums text-sm text-stone-900">{site.articlesPublished}</span>
                  </div>
                  <div>
                    <div style={{ fontFamily: "var(--font-system)", fontSize: 10, textTransform: 'uppercase', color: '#78716C' }}>Index %</div>
                    <span style={{ fontFamily: "var(--font-system,'IBM Plex Mono',monospace)" }} className="tabular-nums text-sm text-stone-900">{site.indexRate}%</span>
                  </div>
                  <div>
                    <div style={{ fontFamily: "var(--font-system)", fontSize: 10, textTransform: 'uppercase', color: '#78716C' }}>SEO</div>
                    <span style={{ fontFamily: "var(--font-system,'IBM Plex Mono',monospace)" }} className="tabular-nums text-sm text-stone-900">{site.avgSeoScore}</span>
                  </div>
                </div>
                {/* Domain */}
                <div style={{ fontFamily: "var(--font-system,'IBM Plex Mono',monospace)" }} className="mt-2 text-[10px] text-stone-400 truncate tabular-nums">{site.domain}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
