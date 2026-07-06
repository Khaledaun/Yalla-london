"use client";

import Link from "next/link";

/**
 * /admin/help — Quick Reference & Navigation
 *
 * Links to key admin areas + cron schedule reference.
 */
export default function HelpPage() {
  const quickLinks = [
    { label: "Mission Control", href: "/admin/cockpit", desc: "Full dashboard with 7 tabs" },
    { label: "Departures Board", href: "/admin/departures", desc: "Live cron timers + Do Now buttons" },
    { label: "Content Hub", href: "/admin/content", desc: "Articles, pipeline, indexing" },
    { label: "SEO Audit", href: "/admin/cockpit?tab=sites", desc: "Run SEO audit from Sites tab" },
    { label: "AI Costs", href: "/admin/ai-costs", desc: "Token usage and cost tracking" },
    { label: "Cron Logs", href: "/admin/cron-logs", desc: "Full cron job history" },
  ];

  const cronSchedule = [
    { time: "03:00", job: "Analytics sync" },
    { time: "04:00 Mon", job: "Weekly topic research" },
    { time: "05:00", job: "Daily content generation" },
    { time: "06:00", job: "Trends monitor + London news" },
    { time: "07:00", job: "SEO agent run 1" },
    { time: "08:30", job: "Content builder (every 15 min) + Content selector" },
    { time: "09:00", job: "Affiliate injection + Morning publish" },
    { time: "11:00", job: "Content auto-fix" },
    { time: "13:00", job: "SEO agent run 2" },
    { time: "16:00", job: "Afternoon publish" },
    { time: "18:00", job: "Content auto-fix" },
    { time: "20:00", job: "SEO agent run 3" },
    { time: "22:00", job: "Site health check + Diagnostic sweep" },
  ];

  return (
    <div className="max-w-xl mx-auto space-y-6 py-6">
      <div>
        <h1 style={{ fontFamily: "'Anybody',sans-serif", fontWeight: 800, fontSize: 24, color: "#1C1917", letterSpacing: -0.5 }}>
          Help
        </h1>
        <p className="text-sm text-gray-500 mt-1">Quick reference for the admin dashboard</p>
      </div>

      {/* Quick Links */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border p-4 space-y-2">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Quick Links</h2>
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex justify-between items-center p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <span className="text-sm font-medium text-blue-600">{link.label}</span>
            <span className="text-xs text-gray-400">{link.desc}</span>
          </Link>
        ))}
      </div>

      {/* Cron Schedule */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Cron Schedule (UTC)</h2>
        <div className="space-y-1">
          {cronSchedule.map((item) => (
            <div key={item.time} className="flex items-center text-xs gap-3">
              <span className="font-mono text-gray-500 w-20 shrink-0">{item.time}</span>
              <span className="text-gray-700 dark:text-gray-300">{item.job}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Support */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Need Help?</h2>
        <p className="text-xs text-gray-500">
          For technical issues, check the{" "}
          <Link href="/admin/cockpit?tab=crons" className="text-blue-500 underline">
            Cron Health tab
          </Link>{" "}
          in Mission Control. All cron failures are logged with plain-language error descriptions and suggested fixes.
        </p>
      </div>
    </div>
  );
}
