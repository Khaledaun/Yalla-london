"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function AffiliateSettingsPage() {
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [envStatus, setEnvStatus] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/feature-flags").then((r) => r.ok ? r.json() : { flags: [] }),
    ])
      .then(([flagsData]) => {
        const flagMap: Record<string, boolean> = {};
        for (const f of (flagsData.flags || [])) {
          if (typeof f.name === "string" && f.name.startsWith("FEATURE_AFFILIATE")) {
            flagMap[f.name] = f.enabled;
          }
        }
        setFlags(flagMap);

        // Check environment variables (server-side can't be fully checked from client,
        // but we can infer from API responses)
        setEnvStatus({
          CJ_API_TOKEN: Object.keys(flagMap).length > 0, // If flags loaded, API is working
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const affiliateFlags = [
    { key: "FEATURE_AFFILIATE_ENABLED", label: "Master Kill Switch", description: "Enables/disables entire CJ affiliate system" },
    { key: "FEATURE_AFFILIATE_AUTO_INJECT", label: "Auto-Inject in Content", description: "Automatically inject affiliate links when articles are published" },
    { key: "FEATURE_AFFILIATE_TRACKING", label: "Click Tracking", description: "Track affiliate link clicks and impressions" },
    { key: "FEATURE_AFFILIATE_DEAL_DISCOVERY", label: "Deal Discovery", description: "Automated deal finding across joined advertisers" },
    { key: "FEATURE_AFFILIATE_COMMISSIONS", label: "Commission Sync", description: "Sync commission data from CJ API" },
  ];

  const cronJobs = [
    { name: "affiliate-sync-advertisers", schedule: "Every 6 hours", description: "Sync advertiser data from CJ" },
    { name: "affiliate-sync-commissions", schedule: "Daily 4:00 AM UTC", description: "Sync last 7 days of commissions" },
    { name: "affiliate-discover-deals", schedule: "Daily 5:30 AM UTC", description: "Search for new deals across advertisers" },
    { name: "affiliate-refresh-links", schedule: "Sunday 3:00 AM UTC", description: "Refresh all affiliate link data" },
  ];

  const envVars = [
    { name: "CJ_API_TOKEN", required: true, description: "CJ Affiliate API personal access token" },
    { name: "AFFILIATE_DISCLOSURE_EN", required: false, description: "Custom FTC disclosure text (English)" },
    { name: "AFFILIATE_DISCLOSURE_AR", required: false, description: "Custom FTC disclosure text (Arabic)" },
  ];

  return (
    <div style={{ padding: "1.5rem", maxWidth: "900px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.3rem", fontWeight: 700 }}>Affiliate Settings</h1>
        <Link href="/admin/affiliate" style={{ fontSize: "0.8rem", color: "#4A7BA8" }}>← Dashboard</Link>
      </div>

      {loading ? (
        <p style={{ color: "#666" }}>Loading settings...</p>
      ) : (
        <>
          {/* Feature Flags */}
          <section style={{ marginBottom: "2rem" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.75rem" }}>Feature Flags</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {affiliateFlags.map((flag) => (
                <div
                  key={flag.key}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.75rem 1rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    background: "#fff",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>{flag.label}</div>
                    <div style={{ fontSize: "0.7rem", color: "#666" }}>{flag.description}</div>
                    <code style={{ fontSize: "0.65rem", color: "#999" }}>{flag.key}</code>
                  </div>
                  <span
                    style={{
                      padding: "3px 10px",
                      borderRadius: "12px",
                      background: flags[flag.key] ? "#dcfce7" : "#fef2f2",
                      color: flags[flag.key] ? "#166534" : "#991b1b",
                      fontSize: "0.7rem",
                      fontWeight: 600,
                    }}
                  >
                    {flags[flag.key] ? "ON" : "OFF"}
                  </span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: "0.7rem", color: "#999", marginTop: "0.5rem" }}>
              Toggle flags via the Feature Flags admin page or by setting environment variables.
            </p>
          </section>

          {/* Cron Jobs */}
          <section style={{ marginBottom: "2rem" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.75rem" }}>Cron Jobs</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {cronJobs.map((cron) => (
                <div
                  key={cron.name}
                  style={{
                    padding: "0.75rem 1rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    background: "#fff",
                    fontSize: "0.8rem",
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{cron.name}</div>
                  <div style={{ fontSize: "0.7rem", color: "#666" }}>
                    {cron.schedule} · {cron.description}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Environment Variables */}
          <section>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.75rem" }}>Environment Variables</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {envVars.map((env) => (
                <div
                  key={env.name}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.75rem 1rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    background: "#fff",
                  }}
                >
                  <div>
                    <code style={{ fontSize: "0.8rem", fontWeight: 600 }}>{env.name}</code>
                    <span style={{ fontSize: "0.65rem", marginLeft: "0.5rem", color: env.required ? "#C8322B" : "#666" }}>
                      {env.required ? "Required" : "Optional"}
                    </span>
                    <div style={{ fontSize: "0.7rem", color: "#666", marginTop: "2px" }}>{env.description}</div>
                  </div>
                </div>
              ))}
            </div>
            <p style={{ fontSize: "0.7rem", color: "#999", marginTop: "0.5rem" }}>
              Set environment variables in Vercel dashboard → Settings → Environment Variables.
            </p>
          </section>

          {/* Publisher Info */}
          <section style={{ marginTop: "2rem", padding: "1rem", background: "#f8f9fa", borderRadius: "10px" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" }}>Publisher Info</h2>
            <div style={{ fontSize: "0.8rem", color: "#666" }}>
              <p>Publisher CID: <strong>7895467</strong></p>
              <p>Account: <strong>Zenitha.luxury LLC</strong></p>
              <p>Network: <strong>CJ Affiliate (Commission Junction)</strong></p>
              <p>API Docs: <a href="https://developers.cj.com" target="_blank" rel="noopener" style={{ color: "#4A7BA8" }}>developers.cj.com</a></p>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
