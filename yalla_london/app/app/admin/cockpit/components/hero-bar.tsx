"use client";

import { ZHMetricCell } from "@/components/zh";

interface HeroBarProps {
  publishedToday: number;
  indexed: number;
  sessions7d: number;
  clicks7d: number;
}

export function HeroBar({ publishedToday, indexed, sessions7d, clicks7d }: HeroBarProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div className="bg-zh-navy-mid border border-zh-navy-border rounded-lg p-3">
        <ZHMetricCell label="Published Today" value={publishedToday} />
      </div>
      <div className="bg-zh-navy-mid border border-zh-navy-border rounded-lg p-3">
        <ZHMetricCell label="Indexed" value={indexed} />
      </div>
      <div className="bg-zh-navy-mid border border-zh-navy-border rounded-lg p-3">
        <ZHMetricCell label="Sessions (7d)" value={sessions7d.toLocaleString()} />
      </div>
      <div className="bg-zh-navy-mid border border-zh-navy-border rounded-lg p-3">
        <ZHMetricCell label="GSC Clicks (7d)" value={clicks7d.toLocaleString()} />
      </div>
    </div>
  );
}
