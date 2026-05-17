"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SITES as SITE_CONFIG } from "@/config/sites";
import {
  AdminCard,
  AdminPageHeader,
  AdminAlertBanner,
  AdminLoadingState,
} from "@/components/admin/admin-ui";

interface SiteInfo {
  id: string;
  name: string;
  domain: string;
  destination: string;
  primaryColor: string;
}

const SITE_LIST: SiteInfo[] = Object.values(SITE_CONFIG).map((s) => ({
  id: s.id,
  name: s.name,
  domain: s.domain,
  destination: s.destination,
  primaryColor: s.secondaryColor,
}));

interface VaultSummary {
  siteId: string;
  totalVariables: number;
  configuredCount: number;
  vercelConfigured: boolean;
}

export default function VariableVaultHub() {
  const router = useRouter();
  const [summaries, setSummaries] = useState<Record<string, VaultSummary>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      const results: Record<string, VaultSummary> = {};

      await Promise.allSettled(
        SITE_LIST.map(async (site) => {
          try {
            const res = await fetch(`/api/admin/sites/${site.id}/variables`);
            if (res.ok) {
              const data = await res.json();
              results[site.id] = {
                siteId: data.siteId,
                totalVariables: data.totalVariables,
                configuredCount: data.configuredCount,
                vercelConfigured: data.vercelConfigured,
              };
            }
          } catch {
            // ignore per-site errors
          }
        })
      );

      setSummaries(results);
      setLoading(false);
    }
    fetchAll();
  }, []);

  return (
    <div className="min-h-screen bg-[var(--admin-bg)] p-4 md:p-6">
      <AdminPageHeader
        title="Variable Vault"
        subtitle="Manage API keys, credentials, and integrations for each site. Values are encrypted (AES-256-GCM) and synced to Vercel env vars."
        backHref="/admin/command-center"
      />

      {/* Site cards */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {SITE_LIST.map((site) => {
          const summary = summaries[site.id];
          const progress = summary
            ? Math.round((summary.configuredCount / summary.totalVariables) * 100)
            : 0;

          const progressColor =
            progress === 100
              ? "#2D5A3D"
              : progress > 50
              ? "#3B7EA1"
              : "#C49A2A";

          const progressTextColor =
            progress === 100
              ? "text-[#2D5A3D]"
              : progress > 50
              ? "text-[#3B7EA1]"
              : progress > 0
              ? "text-[#C49A2A]"
              : "text-stone-400";

          return (
            <button
              key={site.id}
              onClick={() => router.push(`/admin/sites/${site.id}/settings`)}
              className="block w-full text-left transition-transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#3B7EA1]/40 rounded-xl"
            >
              <AdminCard className="h-full hover:border-stone-300 transition-colors">
                {/* Site header */}
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold"
                    style={{
                      backgroundColor: site.primaryColor + "18",
                      color: site.primaryColor,
                    }}
                  >
                    {site.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-base font-semibold text-stone-800 truncate">
                      {site.name}
                    </div>
                    <div className="text-xs text-stone-400 truncate">
                      {site.domain}
                    </div>
                  </div>
                  <span className="ml-auto shrink-0 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-stone-100 text-stone-500">
                    {site.destination}
                  </span>
                </div>

                {/* Progress bar */}
                {loading ? (
                  <div className="h-6 bg-stone-100 rounded animate-pulse" />
                ) : summary ? (
                  <>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-xs text-stone-500">
                        {summary.configuredCount} / {summary.totalVariables} variables
                      </span>
                      <span className={`text-xs font-semibold ${progressTextColor}`}>
                        {progress}%
                      </span>
                    </div>
                    <div className="bg-stone-100 rounded h-1.5 overflow-hidden">
                      <div
                        className="h-full rounded transition-all duration-300"
                        style={{
                          width: `${progress}%`,
                          backgroundColor: progressColor,
                        }}
                      />
                    </div>
                    <div className={`mt-2 text-[11px] ${summary.vercelConfigured ? "text-[#2D5A3D]" : "text-stone-400"}`}>
                      {summary.vercelConfigured ? "Vercel sync enabled" : "Vercel sync not configured"}
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-stone-400">Click to configure</div>
                )}
              </AdminCard>
            </button>
          );
        })}
      </div>

      {/* Info box */}
      <div className="mt-6">
        <AdminCard>
          <AdminAlertBanner
            severity="info"
            message="How it works"
            detail="Click a site card to open its Variable Vault, fill in API keys and credentials, then save to encrypt and sync."
          />
          <ol className="mt-4 ml-5 list-decimal text-sm text-stone-600 leading-relaxed space-y-1">
            <li>Click a site card to open its Variable Vault</li>
            <li>Fill in API keys, analytics IDs, affiliate IDs, and other credentials</li>
            <li>
              Click <strong className="text-[#3B7EA1]">Save All Changes</strong> to:
              <ul className="mt-1 ml-4 list-disc text-stone-500">
                <li>Encrypt and store values in the database (Credential table)</li>
                <li>Sync to Vercel project as per-site environment variables</li>
                <li>Update runtime config (analytics_settings / seo_settings)</li>
              </ul>
            </li>
            <li>Changes take effect on next deployment or cron run</li>
          </ol>
          <p className="mt-3 text-xs text-stone-400">
            To enable Vercel sync, set{" "}
            <code className="bg-stone-100 px-1.5 py-0.5 rounded text-stone-600">VERCEL_TOKEN</code>{" "}
            and{" "}
            <code className="bg-stone-100 px-1.5 py-0.5 rounded text-stone-600">VERCEL_PROJECT_ID</code>{" "}
            in your environment.
          </p>
        </AdminCard>
      </div>
    </div>
  );
}
