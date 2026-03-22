"use client";

import Link from "next/link";
import { ZHBadge, ZHMonoVal } from "@/components/zh";

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
    <div className="bg-zh-navy-mid border border-zh-navy-border rounded-lg p-4">
      <div className="font-zh-mono text-[10px] uppercase tracking-[2px] text-zh-cream-muted mb-3">
        Portfolio
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {sites.map((site) => {
          const color = SITE_COLORS[site.id] || "#C9A84C";
          return (
            <Link
              key={site.id}
              href={`/admin/cockpit?site=${site.id}`}
              className="group block bg-zh-navy border border-zh-navy-border rounded-lg overflow-hidden hover:border-zh-gold-dim transition-colors"
            >
              {/* Accent bar */}
              <div className="h-[3px]" style={{ backgroundColor: color }} />
              <div className="p-3">
                {/* Name + status */}
                <div className="flex items-center justify-between mb-2">
                  <span className="font-zh-ui font-semibold text-xs text-zh-cream">{site.name}</span>
                  <ZHBadge variant={site.isActive ? "success" : "muted"}>
                    {site.isActive ? "Active" : "Planned"}
                  </ZHBadge>
                </div>
                {/* Metrics */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <div className="font-zh-mono text-[8px] text-zh-cream-muted uppercase">Articles</div>
                    <ZHMonoVal size="sm" className="text-zh-cream">{site.articlesPublished}</ZHMonoVal>
                  </div>
                  <div>
                    <div className="font-zh-mono text-[8px] text-zh-cream-muted uppercase">Index %</div>
                    <ZHMonoVal size="sm" className="text-zh-cream">{site.indexRate}%</ZHMonoVal>
                  </div>
                  <div>
                    <div className="font-zh-mono text-[8px] text-zh-cream-muted uppercase">SEO</div>
                    <ZHMonoVal size="sm" className="text-zh-cream">{site.avgSeoScore}</ZHMonoVal>
                  </div>
                </div>
                {/* Domain */}
                <div className="mt-2 font-zh-mono text-[9px] text-zh-cream-dim truncate">{site.domain}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
