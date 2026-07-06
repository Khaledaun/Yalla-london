"use client";

import { AdminStatusBadge } from "@/components/admin/admin-ui";

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
    <div className="bg-white rounded-xl border border-[rgba(214,208,196,0.5)] p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-[0.15em] text-[#78716C] font-[var(--font-system)] font-semibold">
          Recent Cron Runs
        </span>
        {failedLast24h > 0 && (
          <AdminStatusBadge status="error" label={`${failedLast24h} failed (24h)`} />
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[rgba(214,208,196,0.5)]">
              {["Job", "Status", "Duration", "Items", "Time"].map((h) => (
                <th
                  key={h}
                  className="text-left py-2 px-3 text-[10px] uppercase tracking-[0.15em] text-[#78716C] font-[var(--font-system)] font-semibold"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(214,208,196,0.3)]">
            {recentJobs.map((job, i) => {
              const statusKey =
                job.status === "completed" ? "success" :
                job.status === "failed" ? "error" :
                job.status === "running" ? "warning" : "inactive";
              const ago = getTimeAgo(job.startedAt);

              return (
                <tr key={i} className="hover:bg-stone-50 transition-colors">
                  <td className="py-1.5 px-3">
                    <span style={{ fontFamily: "var(--font-system,'IBM Plex Mono',monospace)" }} className="tabular-nums text-xs text-stone-800">
                      {job.name}
                    </span>
                  </td>
                  <td className="py-1.5 px-3">
                    <AdminStatusBadge status={statusKey} label={job.status} />
                  </td>
                  <td className="py-1.5 px-3">
                    <span style={{ fontFamily: "var(--font-system,'IBM Plex Mono',monospace)" }} className="tabular-nums text-xs text-stone-500">
                      {job.durationMs ? `${(job.durationMs / 1000).toFixed(1)}s` : "\u2014"}
                    </span>
                  </td>
                  <td className="py-1.5 px-3">
                    <span style={{ fontFamily: "var(--font-system,'IBM Plex Mono',monospace)" }} className="tabular-nums text-xs text-stone-800">
                      {job.itemsProcessed}
                    </span>
                  </td>
                  <td className="py-1.5 px-3">
                    <span style={{ fontFamily: "var(--font-system,'IBM Plex Mono',monospace)" }} className="tabular-nums text-xs text-stone-500">
                      {ago}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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
