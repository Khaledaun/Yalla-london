"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SITES as SITE_CONFIG } from "@/config/sites";

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
    <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#e5e5e5" }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid #222", padding: "20px 32px" }}>
        <button
          onClick={() => router.push("/admin/command-center")}
          style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 14, padding: 0, marginBottom: 8 }}
        >
          &larr; Command Center
        </button>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: "#fff" }}>
          Variable Vault
        </h1>
        <p style={{ margin: "6px 0 0", color: "#888", fontSize: 15 }}>
          Manage API keys, credentials, and integrations for each site.
          Values are encrypted (AES-256-GCM) and synced to Vercel env vars.
        </p>
      </div>

      {/* Site cards */}
      <div style={{ padding: "32px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 20 }}>
        {SITE_LIST.map((site) => {
          const summary = summaries[site.id];
          const progress = summary
            ? Math.round((summary.configuredCount / summary.totalVariables) * 100)
            : 0;

          return (
            <button
              key={site.id}
              onClick={() => router.push(`/admin/sites/${site.id}/settings`)}
              style={{
                display: "block",
                width: "100%",
                padding: "24px",
                background: "#111",
                border: "1px solid #222",
                borderRadius: 12,
                cursor: "pointer",
                textAlign: "left",
                color: "#e5e5e5",
                transition: "border-color 0.2s, transform 0.1s",
              }}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = site.primaryColor;
                (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "#222";
                (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
              }}
            >
              {/* Site header */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: site.primaryColor + "22",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, fontWeight: 700, color: site.primaryColor,
                }}>
                  {site.name.charAt(0)}
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: "#fff" }}>{site.name}</div>
                  <div style={{ fontSize: 12, color: "#666" }}>{site.domain}</div>
                </div>
                <div style={{
                  marginLeft: "auto",
                  padding: "4px 10px",
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  background: "#1a1a1a",
                  color: "#888",
                }}>
                  {site.destination}
                </div>
              </div>

              {/* Progress bar */}
              {loading ? (
                <div style={{ height: 24, background: "#1a1a1a", borderRadius: 4, animation: "pulse 1.5s infinite" }} />
              ) : summary ? (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: "#888" }}>
                      {summary.configuredCount} / {summary.totalVariables} variables
                    </span>
                    <span style={{
                      fontSize: 12, fontWeight: 600,
                      color: progress === 100 ? "#22c55e" : progress > 50 ? "#3b82f6" : progress > 0 ? "#f59e0b" : "#666",
                    }}>
                      {progress}%
                    </span>
                  </div>
                  <div style={{ background: "#1a1a1a", borderRadius: 4, height: 6, overflow: "hidden" }}>
                    <div style={{
                      width: `${progress}%`,
                      height: "100%",
                      borderRadius: 4,
                      background: progress === 100 ? "#22c55e" : progress > 50 ? "#3b82f6" : "#f59e0b",
                      transition: "width 0.3s",
                    }} />
                  </div>
                  <div style={{ marginTop: 8, fontSize: 11, color: summary.vercelConfigured ? "#4ade80" : "#888" }}>
                    {summary.vercelConfigured ? "Vercel sync enabled" : "Vercel sync not configured"}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 12, color: "#666" }}>Click to configure</div>
              )}
            </button>
          );
        })}
      </div>

      {/* Info box */}
      <div style={{ padding: "0 32px 32px" }}>
        <div style={{
          padding: "16px 20px",
          background: "#111",
          border: "1px solid #222",
          borderRadius: 12,
          fontSize: 13,
          color: "#888",
          lineHeight: 1.6,
        }}>
          <strong style={{ color: "#aaa" }}>How it works:</strong>
          <ol style={{ margin: "8px 0 0", paddingLeft: 20 }}>
            <li>Click a site card to open its Variable Vault</li>
            <li>Fill in API keys, analytics IDs, affiliate IDs, and other credentials</li>
            <li>Click <strong style={{ color: "#60a5fa" }}>Save All Changes</strong> to:
              <ul style={{ marginTop: 4 }}>
                <li>Encrypt and store values in the database (Credential table)</li>
                <li>Sync to Vercel project as per-site environment variables</li>
                <li>Update runtime config (analytics_settings / seo_settings)</li>
              </ul>
            </li>
            <li>Changes take effect on next deployment or cron run</li>
          </ol>
          <p style={{ margin: "12px 0 0", color: "#666" }}>
            To enable Vercel sync, set <code style={{ background: "#1a1a1a", padding: "2px 6px", borderRadius: 4 }}>VERCEL_TOKEN</code> and{" "}
            <code style={{ background: "#1a1a1a", padding: "2px 6px", borderRadius: 4 }}>VERCEL_PROJECT_ID</code> in your environment.
          </p>
        </div>
      </div>
    </div>
  );
}
