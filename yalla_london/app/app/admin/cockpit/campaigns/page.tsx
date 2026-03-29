"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Campaign {
  id: string;
  siteId: string;
  name: string;
  type: string;
  status: string;
  config: {
    operations: string[];
    filters?: Record<string, unknown>;
    dryRun?: boolean;
  };
  priority: number;
  totalItems: number;
  completedItems: number;
  failedItems: number;
  skippedItems: number;
  runCount: number;
  currentCostUsd: number;
  maxAiCostUsd: number | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  lastRunAt: string | null;
  lastError: string | null;
  progressPercent?: number;
  totalChanges?: {
    totalWordsAdded: number;
    totalH2sAdded: number;
    totalInternalLinksAdded: number;
    totalAffiliateLinksAdded: number;
    totalAuthenticitySignalsAdded: number;
    metaDescsRewritten: number;
    arabicExpanded: number;
  };
  items?: CampaignItem[];
}

interface CampaignItem {
  id: string;
  blogPostId: string | null;
  targetTitle: string | null;
  targetUrl: string | null;
  status: string;
  attempts: number;
  operationsApplied: string[] | null;
  changes: Record<string, unknown> | null;
  beforeSnapshot: Record<string, unknown> | null;
  afterSnapshot: Record<string, unknown> | null;
  error: string | null;
  aiCostUsd: number;
  processedAt: string | null;
}

interface PreviewItem {
  id: string;
  slug: string;
  title: string;
  wordCount: number;
  h2Count: number;
  affiliateCount: number;
  internalLinkCount: number;
  authenticitySignals: number;
  metaDescLen: number;
  seoScore: number | null;
  operationsNeeded: string[];
  wouldProcess: boolean;
}

// ─── Campaign Type Presets ───────────────────────────────────────────────────

const CAMPAIGN_PRESETS = {
  enhance_all: {
    name: "Full Content Enhancement",
    type: "enhance_content",
    description: "Expand content, add authenticity signals, fix headings, add affiliate & internal links, optimize meta",
    operations: [
      "expand_content", "add_authenticity", "fix_heading_hierarchy",
      "add_internal_links", "add_affiliate_links", "fix_meta_description",
    ],
  },
  fix_seo: {
    name: "SEO Quick Fix",
    type: "seo_optimize",
    description: "Fix meta descriptions, meta titles, add internal links",
    operations: ["fix_meta_description", "fix_meta_title", "add_internal_links"],
  },
  add_revenue: {
    name: "Revenue Injection",
    type: "inject_affiliates",
    description: "Add affiliate links and booking CTAs to articles missing them",
    operations: ["add_affiliate_links"],
  },
  fix_arabic: {
    name: "Arabic Content Expansion",
    type: "fix_arabic",
    description: "Expand thin Arabic content to match English article quality",
    operations: ["expand_arabic"],
  },
  authenticity: {
    name: "Authenticity Boost",
    type: "enhance_content",
    description: "Add first-hand experience signals to pass Google's Jan 2026 Authenticity Update",
    operations: ["add_authenticity", "expand_content"],
  },
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [preview, setPreview] = useState<PreviewItem[] | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>("enhance_all");
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");

  const SITES = [
    { id: "yalla-london", name: "Yalla London" },
    { id: "arabaldives", name: "Arabaldives" },
    { id: "french-riviera", name: "Yalla Riviera" },
    { id: "istanbul", name: "Yalla Istanbul" },
    { id: "thailand", name: "Yalla Thailand" },
    { id: "zenitha-yachts-med", name: "Zenitha Yachts" },
  ];

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // ── Load campaigns ──────────────────────────────────────────────
  const loadCampaigns = useCallback(async () => {
    try {
      const params = selectedSiteId ? `?siteId=${selectedSiteId}` : "";
      const res = await fetch(`/api/admin/campaigns${params}`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setCampaigns(data.campaigns || []);
    } catch (err) {
      console.warn("Failed to load campaigns:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedSiteId]);

  useEffect(() => { loadCampaigns(); }, [loadCampaigns]);

  // Auto-refresh active campaigns
  useEffect(() => {
    const hasActive = campaigns.some(c => c.status === "running" || c.status === "queued");
    if (!hasActive) return undefined;
    const interval = setInterval(loadCampaigns, 15_000);
    return () => clearInterval(interval);
  }, [campaigns, loadCampaigns]);

  // ── Load campaign detail ────────────────────────────────────────
  const loadDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/campaigns?id=${id}`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setSelectedCampaign(data);
    } catch (err) {
      showToast("Failed to load campaign detail", "error");
      console.warn(err);
    }
  };

  // ── Campaign actions ────────────────────────────────────────────
  const campaignAction = async (action: string, campaignId: string) => {
    setActionLoading(`${action}-${campaignId}`);
    try {
      const res = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, campaignId }),
      });
      if (!res.ok) throw new Error("Action failed");
      const data = await res.json();
      showToast(data.message || `${action} completed`);
      loadCampaigns();
      if (selectedCampaign?.id === campaignId) loadDetail(campaignId);
    } catch (err) {
      showToast(`${action} failed`, "error");
      console.warn(err);
    } finally {
      setActionLoading(null);
    }
  };

  // ── Preview ─────────────────────────────────────────────────────
  const runPreview = async () => {
    setPreviewLoading(true);
    const preset = CAMPAIGN_PRESETS[selectedPreset as keyof typeof CAMPAIGN_PRESETS];
    try {
      const res = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "preview",
          siteId: selectedSiteId || undefined,
          config: { operations: preset.operations },
        }),
      });
      if (!res.ok) throw new Error("Preview failed");
      const data = await res.json();
      setPreview(data.preview || []);
    } catch (err) {
      showToast("Preview failed", "error");
      console.warn(err);
    } finally {
      setPreviewLoading(false);
    }
  };

  // ── Create campaign ─────────────────────────────────────────────
  const createCampaign = async () => {
    const preset = CAMPAIGN_PRESETS[selectedPreset as keyof typeof CAMPAIGN_PRESETS];
    setActionLoading("create");
    try {
      const res = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          siteId: selectedSiteId || undefined,
          name: preset.name,
          type: preset.type,
          config: { operations: preset.operations },
        }),
      });
      if (!res.ok) throw new Error("Creation failed");
      const data = await res.json();
      showToast(`Campaign created: ${data.totalItems} articles queued`);
      setShowCreate(false);
      setPreview(null);
      loadCampaigns();
    } catch (err) {
      showToast("Failed to create campaign", "error");
      console.warn(err);
    } finally {
      setActionLoading(null);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  const statusColor = (s: string) => {
    const colors: Record<string, string> = {
      draft: "#6B7280", queued: "#3B82F6", running: "#10B981",
      paused: "#F59E0B", completed: "#8B5CF6", failed: "#EF4444", cancelled: "#9CA3AF",
    };
    return colors[s] || "#6B7280";
  };

  const statusIcon = (s: string) => {
    const icons: Record<string, string> = {
      draft: "📝", queued: "⏳", running: "🔄", paused: "⏸️",
      completed: "✅", failed: "❌", cancelled: "🚫",
      pending: "⏳", processing: "🔄", skipped: "⏭️",
    };
    return icons[s] || "•";
  };

  const opLabel = (op: string) => {
    const labels: Record<string, string> = {
      expand_content: "Expand Content", add_authenticity: "Add Authenticity",
      fix_heading_hierarchy: "Fix Headings", add_internal_links: "Add Internal Links",
      add_affiliate_links: "Add Affiliates", fix_meta_description: "Fix Meta Desc",
      fix_meta_title: "Fix Meta Title", expand_arabic: "Expand Arabic",
      fix_slug_artifacts: "Fix Slugs", add_structured_data: "Add Schema",
    };
    return labels[op] || op;
  };

  // ── Kickstart (one-tap) ─────────────────────────────────────
  const [kickstartLoading, setKickstartLoading] = useState<string | null>(null);
  const [kickstartResult, setKickstartResult] = useState<{
    campaignId: string; totalItems: number; firstBatch: { succeeded: number; failed: number; costUsd: number }; message: string;
  } | null>(null);

  const kickstart = async (preset: string) => {
    setKickstartLoading(preset);
    setKickstartResult(null);
    try {
      const res = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "kickstart",
          preset,
          siteId: selectedSiteId || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setKickstartResult(data);
      showToast(data.message || "Campaign started!", "success");
      loadCampaigns();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Kickstart failed", "error");
    } finally {
      setKickstartLoading(null);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 20, fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <p>Loading campaigns...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "16px", fontFamily: "system-ui, -apple-system, sans-serif", maxWidth: 900, margin: "0 auto" }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)",
          background: toast.type === "error" ? "#FEE2E2" : "#D1FAE5",
          color: toast.type === "error" ? "#991B1B" : "#065F46",
          padding: "10px 20px", borderRadius: 8, fontWeight: 600, zIndex: 1000,
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)", fontSize: 14,
        }}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <Link href="/admin/cockpit" style={{ color: "#6B7280", textDecoration: "none", fontSize: 13 }}>
            ← Back to Cockpit
          </Link>
          <h1 style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 700 }}>Campaign Agent</h1>
          <p style={{ color: "#6B7280", fontSize: 13, margin: "2px 0 0" }}>
            Bulk page operations — enhance, optimize, inject affiliates
          </p>
          {/* Site selector */}
          <select
            value={selectedSiteId}
            onChange={e => { setSelectedSiteId(e.target.value); setLoading(true); }}
            style={{
              marginTop: 6, padding: "4px 8px", borderRadius: 6, border: "1px solid #D1D5DB",
              fontSize: 13, background: "#F9FAFB",
            }}
          >
            <option value="">All Sites (default)</option>
            {SITES.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => { setShowCreate(!showCreate); setPreview(null); }}
          style={{
            padding: "10px 18px", background: "#2563EB", color: "#fff",
            border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 14,
          }}
        >
          + New Campaign
        </button>
      </div>

      {/* ── Quick Start (one-tap) ────────────────────────────────── */}
      {campaigns.length === 0 && !showCreate && (
        <div style={{
          background: "linear-gradient(135deg, #1E3A5F 0%, #0D4A6B 100%)",
          borderRadius: 16, padding: 20, marginBottom: 20, color: "#fff",
        }}>
          <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700 }}>Quick Start</h2>
          <p style={{ margin: "0 0 16px", fontSize: 13, opacity: 0.85 }}>
            One tap — creates campaign, scans all articles, and starts enhancing immediately
          </p>

          <div style={{ display: "grid", gap: 8 }}>
            {[
              { key: "enhance_all", label: "Full Enhancement", emoji: "🚀", desc: "Content + SEO + Affiliates + Authenticity", color: "#059669" },
              { key: "fix_seo", label: "SEO Quick Fix", emoji: "🔍", desc: "Meta tags + internal links", color: "#2563EB" },
              { key: "add_revenue", label: "Revenue Injection", emoji: "💰", desc: "Add affiliate links everywhere", color: "#D97706" },
              { key: "authenticity", label: "Authenticity Boost", emoji: "✨", desc: "Pass Google Jan 2026 update", color: "#7C3AED" },
              { key: "fix_arabic", label: "Arabic Expansion", emoji: "🌍", desc: "Expand thin Arabic content", color: "#0891B2" },
            ].map(item => (
              <button
                key={item.key}
                onClick={() => kickstart(item.key)}
                disabled={!!kickstartLoading}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "14px 16px", background: kickstartLoading === item.key ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.2)", borderRadius: 10,
                  color: "#fff", cursor: kickstartLoading ? "wait" : "pointer",
                  textAlign: "left", width: "100%",
                  transition: "background 0.2s",
                }}
              >
                <span style={{ fontSize: 28, lineHeight: 1 }}>{item.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{item.label}</div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>{item.desc}</div>
                </div>
                {kickstartLoading === item.key ? (
                  <span style={{ fontSize: 12, opacity: 0.8 }}>Starting...</span>
                ) : (
                  <span style={{
                    background: item.color, padding: "4px 10px",
                    borderRadius: 6, fontSize: 12, fontWeight: 700,
                  }}>
                    GO
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Kickstart result */}
          {kickstartResult && (
            <div style={{
              marginTop: 12, background: "rgba(255,255,255,0.15)",
              borderRadius: 8, padding: 12, fontSize: 13,
            }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Campaign Started</div>
              <div>{kickstartResult.totalItems} articles queued</div>
              <div>{kickstartResult.firstBatch.succeeded} enhanced in first batch</div>
              {kickstartResult.firstBatch.failed > 0 && (
                <div style={{ color: "#FCA5A5" }}>{kickstartResult.firstBatch.failed} failed</div>
              )}
              <div style={{ opacity: 0.8, marginTop: 4 }}>
                Cron processes 3 more every 30 min automatically
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Create Campaign Panel ────────────────────────────────── */}
      {showCreate && (
        <div style={{
          background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 12,
          padding: 20, marginBottom: 20,
        }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 16 }}>Create New Campaign</h3>

          {/* Preset selector */}
          <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
            {Object.entries(CAMPAIGN_PRESETS).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => { setSelectedPreset(key); setPreview(null); }}
                style={{
                  padding: "12px 16px", textAlign: "left",
                  border: `2px solid ${selectedPreset === key ? "#2563EB" : "#E5E7EB"}`,
                  borderRadius: 8, background: selectedPreset === key ? "#EFF6FF" : "#fff",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 14 }}>{preset.name}</div>
                <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{preset.description}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                  {preset.operations.map(op => (
                    <span key={op} style={{
                      background: "#E0E7FF", color: "#3730A3", padding: "2px 6px",
                      borderRadius: 4, fontSize: 11,
                    }}>
                      {opLabel(op)}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>

          {/* Preview + Create buttons */}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={runPreview}
              disabled={previewLoading}
              style={{
                padding: "10px 16px", background: "#F3F4F6", border: "1px solid #D1D5DB",
                borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 14,
              }}
            >
              {previewLoading ? "Scanning..." : "Preview Articles"}
            </button>
            <button
              onClick={createCampaign}
              disabled={actionLoading === "create"}
              style={{
                padding: "10px 16px", background: "#059669", color: "#fff",
                border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 14,
              }}
            >
              {actionLoading === "create" ? "Creating..." : "Create Campaign"}
            </button>
          </div>

          {/* Preview results */}
          {preview && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                Preview: {preview.filter(p => p.wouldProcess).length} articles will be processed,{" "}
                {preview.filter(p => !p.wouldProcess).length} will be skipped
              </div>
              <div style={{ maxHeight: 300, overflowY: "auto" }}>
                {preview.map(item => (
                  <div key={item.id} style={{
                    padding: "8px 12px", background: item.wouldProcess ? "#FEF3C7" : "#F3F4F6",
                    borderRadius: 6, marginBottom: 4, fontSize: 13,
                  }}>
                    <div style={{ fontWeight: 600 }}>{item.title}</div>
                    <div style={{ color: "#6B7280", display: "flex", gap: 12, flexWrap: "wrap", marginTop: 2 }}>
                      <span>{item.wordCount}w</span>
                      <span>{item.h2Count} H2s</span>
                      <span>{item.affiliateCount} affiliates</span>
                      <span>{item.internalLinkCount} links</span>
                      <span>{item.authenticitySignals} auth signals</span>
                      <span>meta: {item.metaDescLen}ch</span>
                    </div>
                    {item.wouldProcess && (
                      <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
                        {item.operationsNeeded.map(op => (
                          <span key={op} style={{
                            background: "#FDE68A", color: "#92400E", padding: "1px 5px",
                            borderRadius: 3, fontSize: 11,
                          }}>
                            {opLabel(op)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Campaign List ────────────────────────────────────────── */}
      {campaigns.length === 0 && !showCreate ? (
        <div style={{
          textAlign: "center", padding: 40, background: "#F9FAFB",
          borderRadius: 12, border: "1px solid #E5E7EB",
        }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🎯</div>
          <h3 style={{ margin: "0 0 4px" }}>No campaigns yet</h3>
          <p style={{ color: "#6B7280", fontSize: 14, margin: 0 }}>
            Create a campaign to enhance your published articles in bulk
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {campaigns.map(campaign => (
            <div
              key={campaign.id}
              style={{
                background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12,
                padding: 16, cursor: "pointer",
              }}
              onClick={() => loadDetail(campaign.id)}
            >
              {/* Header row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{
                      background: `${statusColor(campaign.status)}22`,
                      color: statusColor(campaign.status),
                      padding: "2px 8px", borderRadius: 4, fontSize: 12, fontWeight: 600,
                    }}>
                      {statusIcon(campaign.status)} {campaign.status.toUpperCase()}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{campaign.name}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>
                    {campaign.type} · {campaign.totalItems} articles · ${campaign.currentCostUsd.toFixed(3)} spent
                    {campaign.runCount > 0 && ` · ${campaign.runCount} runs`}
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{ display: "flex", gap: 4 }} onClick={e => e.stopPropagation()}>
                  {(campaign.status === "draft" || campaign.status === "paused") && (
                    <button
                      onClick={() => campaignAction(campaign.status === "draft" ? "run" : "resume", campaign.id)}
                      disabled={actionLoading === `run-${campaign.id}` || actionLoading === `resume-${campaign.id}`}
                      style={{
                        padding: "6px 12px", background: "#059669", color: "#fff",
                        border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
                      }}
                    >
                      {campaign.status === "draft" ? "Start" : "Resume"}
                    </button>
                  )}
                  {(campaign.status === "running" || campaign.status === "queued") && (
                    <>
                      <button
                        onClick={() => campaignAction("run_single", campaign.id)}
                        disabled={!!actionLoading}
                        style={{
                          padding: "6px 12px", background: "#2563EB", color: "#fff",
                          border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
                        }}
                      >
                        {actionLoading === `run_single-${campaign.id}` ? "Running..." : "Run 1 Now"}
                      </button>
                      <button
                        onClick={() => campaignAction("pause", campaign.id)}
                        disabled={!!actionLoading}
                        style={{
                          padding: "6px 12px", background: "#F59E0B", color: "#fff",
                          border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
                        }}
                      >
                        Pause
                      </button>
                    </>
                  )}
                  {campaign.status !== "completed" && campaign.status !== "cancelled" && (
                    <button
                      onClick={() => campaignAction("cancel", campaign.id)}
                      disabled={!!actionLoading}
                      style={{
                        padding: "6px 12px", background: "#FEE2E2", color: "#991B1B",
                        border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              {campaign.totalItems > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div style={{
                    background: "#F3F4F6", borderRadius: 6, height: 8, overflow: "hidden",
                  }}>
                    <div style={{
                      width: `${Math.round(((campaign.completedItems + campaign.failedItems + campaign.skippedItems) / campaign.totalItems) * 100)}%`,
                      height: "100%",
                      background: campaign.failedItems > 0 ? "linear-gradient(90deg, #10B981, #EF4444)" : "#10B981",
                      borderRadius: 6,
                      transition: "width 0.5s ease",
                    }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginTop: 2 }}>
                    <span>{campaign.completedItems} done · {campaign.failedItems} failed · {campaign.skippedItems} skipped</span>
                    <span>{Math.round(((campaign.completedItems + campaign.failedItems + campaign.skippedItems) / campaign.totalItems) * 100)}%</span>
                  </div>
                </div>
              )}

              {/* Operations badges */}
              <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
                {(campaign.config?.operations || []).map((op: string) => (
                  <span key={op} style={{
                    background: "#E0E7FF", color: "#3730A3", padding: "2px 6px",
                    borderRadius: 4, fontSize: 10,
                  }}>
                    {opLabel(op)}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Campaign Detail Overlay ──────────────────────────────── */}
      {selectedCampaign && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          zIndex: 100, display: "flex", justifyContent: "center", alignItems: "flex-start",
          padding: "40px 16px", overflowY: "auto",
        }}>
          <div style={{
            background: "#fff", borderRadius: 16, padding: 20, maxWidth: 800,
            width: "100%", maxHeight: "85vh", overflowY: "auto",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>{selectedCampaign.name}</h2>
              <button
                onClick={() => setSelectedCampaign(null)}
                style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            {/* Stats cards */}
            {selectedCampaign.totalChanges && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 8, marginBottom: 16 }}>
                {[
                  { label: "Words Added", value: selectedCampaign.totalChanges.totalWordsAdded.toLocaleString() },
                  { label: "H2s Added", value: selectedCampaign.totalChanges.totalH2sAdded },
                  { label: "Internal Links", value: selectedCampaign.totalChanges.totalInternalLinksAdded },
                  { label: "Affiliate Links", value: selectedCampaign.totalChanges.totalAffiliateLinksAdded },
                  { label: "Auth Signals", value: selectedCampaign.totalChanges.totalAuthenticitySignalsAdded },
                  { label: "Meta Fixed", value: selectedCampaign.totalChanges.metaDescsRewritten },
                  { label: "AI Cost", value: `$${selectedCampaign.currentCostUsd.toFixed(3)}` },
                ].map(stat => (
                  <div key={stat.label} style={{
                    background: "#F9FAFB", borderRadius: 8, padding: "8px 10px", textAlign: "center",
                  }}>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{stat.value}</div>
                    <div style={{ fontSize: 11, color: "#6B7280" }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Items list */}
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Articles ({selectedCampaign.items?.length || 0})</h3>
            <div style={{ maxHeight: 400, overflowY: "auto" }}>
              {(selectedCampaign.items || []).map(item => (
                <div key={item.id} style={{
                  padding: "8px 12px", borderBottom: "1px solid #F3F4F6", fontSize: 13,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontWeight: 600, flex: 1, minWidth: 0 }}>
                      <span style={{ marginRight: 6 }}>{statusIcon(item.status)}</span>
                      {item.targetTitle || item.targetUrl || "Unknown"}
                    </div>
                    <span style={{
                      fontSize: 11, padding: "1px 6px", borderRadius: 3,
                      background: `${statusColor(item.status)}22`,
                      color: statusColor(item.status), fontWeight: 600,
                    }}>
                      {item.status}
                    </span>
                  </div>

                  {/* Changes summary */}
                  {item.changes && item.status === "completed" && (
                    <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap", color: "#059669", fontSize: 11 }}>
                      {(item.changes as Record<string, unknown>).wordsAdded && (
                        <span>+{String((item.changes as Record<string, unknown>).wordsAdded)}w</span>
                      )}
                      {(item.changes as Record<string, unknown>).h2sAdded && (
                        <span>+{String((item.changes as Record<string, unknown>).h2sAdded)} H2s</span>
                      )}
                      {(item.changes as Record<string, unknown>).internalLinksAdded && (
                        <span>+{String((item.changes as Record<string, unknown>).internalLinksAdded)} links</span>
                      )}
                      {(item.changes as Record<string, unknown>).affiliateLinksAdded && (
                        <span>+{String((item.changes as Record<string, unknown>).affiliateLinksAdded)} affiliates</span>
                      )}
                      {(item.changes as Record<string, unknown>).metaDescRewritten && (
                        <span>meta fixed</span>
                      )}
                    </div>
                  )}

                  {/* Error */}
                  {item.error && item.status === "failed" && (
                    <div style={{ color: "#EF4444", fontSize: 11, marginTop: 2 }}>
                      {item.error.substring(0, 100)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
