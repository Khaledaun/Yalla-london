"use client";

import { ZHTable, ZHBadge, ZHMonoVal } from "@/components/zh";

interface CronJob {
  name: string;
  status: string;
  durationMs: number | null;
  startedAt: string;
  error: string | null;
  plainError: string | null;
  itemsProcessed: number;
}

interface CronTableProps {
  jobs: CronJob[];
  failedLast24h: number;
}

export function CronTable({ jobs, failedLast24h }: CronTableProps) {
  const recentJobs = jobs.slice(0, 8);

  return (
    <div className="bg-zh-navy-mid border border-zh-navy-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="font-zh-mono text-[10px] uppercase tracking-[2px] text-zh-cream-muted">
          Recent Cron Runs
        </span>
        {failedLast24h > 0 && (
          <ZHBadge variant="error">{failedLast24h} failed (24h)</ZHBadge>
        )}
      </div>
      <ZHTable headers={["Job", "Status", "Duration", "Items", "Time"]}>
        {recentJobs.map((job, i) => {
          const statusVariant =
            job.status === "completed" ? "success" :
            job.status === "failed" ? "error" :
            job.status === "running" ? "warn" : "muted";
          const ago = getTimeAgo(job.startedAt);

          return (
            <tr key={i} className="hover:bg-zh-navy-light transition-colors">
              <td className="py-1.5 px-3">
                <ZHMonoVal size="sm">{job.name}</ZHMonoVal>
              </td>
              <td className="py-1.5 px-3">
                <ZHBadge variant={statusVariant}>{job.status}</ZHBadge>
              </td>
              <td className="py-1.5 px-3">
                <ZHMonoVal size="sm" className="text-zh-cream-muted">
                  {job.durationMs ? `${(job.durationMs / 1000).toFixed(1)}s` : "—"}
                </ZHMonoVal>
              </td>
              <td className="py-1.5 px-3">
                <ZHMonoVal size="sm">{job.itemsProcessed}</ZHMonoVal>
              </td>
              <td className="py-1.5 px-3">
                <ZHMonoVal size="sm" className="text-zh-cream-muted">{ago}</ZHMonoVal>
              </td>
            </tr>
          );
        })}
      </ZHTable>
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
