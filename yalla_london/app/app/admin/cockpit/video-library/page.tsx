"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";

// ============================================================
// Types
// ============================================================

interface VideoAsset {
  id: string;
  assetCode: string;
  siteId: string | null;
  source: string;
  collectionName: string | null;
  canvaDesignId: string | null;
  canvaPageIndex: number | null;
  thumbnailUrl: string | null;
  exportedUrl: string | null;
  format: string;
  contentFormat: string;
  locationTags: string[];
  sceneTags: string[];
  moodTags: string[];
  seasonTags: string[];
  customTags: string[];
  textOverlay: string | null;
  matchedArticles: string[];
  usageCount: number;
  status: string;
  authenticity: string;
  priority: number;
  notes: string | null;
  createdAt: string;
}

interface Stats {
  total: number;
  untagged: number;
  tagged: number;
  matched: number;
  used: number;
  retired: number;
  selfCaptured: number;
  byCollection: Array<{ collection: string | null; count: number }>;
  collections: Array<{ id: string; name: string; slug: string; pageCount: number; contentType: string }>;
}

// ============================================================
// Component
// ============================================================

export default function VideoLibraryPage() {
  const [tab, setTab] = useState<"library" | "import" | "strategy" | "upload">("library");
  const [stats, setStats] = useState<Stats | null>(null);
  const [assets, setAssets] = useState<VideoAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<string | null>(null);
  const [filter, setFilter] = useState({ status: "", collection: "", search: "" });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Self-captured upload form
  const [scForm, setScForm] = useState(() => {
    const cookieSiteId = typeof document !== "undefined"
      ? document.cookie.match(/(?:^|;\s*)siteId=([^;]*)/)?.[1] || "yalla-london"
      : "yalla-london";
    return {
      title: "", locationTags: "", sceneTags: "", moodTags: "",
      siteId: cookieSiteId, notes: "", exportedUrl: "",
    };
  });

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/video-library?action=stats");
      if (res.ok) setStats(await res.json());
    } catch (e) {
      console.warn("[video-library] stats fetch failed:", e);
    }
  }, []);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "30" });
      if (filter.status) params.set("status", filter.status);
      if (filter.collection) params.set("collection", filter.collection);
      if (filter.search) params.set("search", filter.search);

      const res = await fetch(`/api/admin/video-library?${params}`);
      if (res.ok) {
        const data = await res.json();
        setAssets(data.assets);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (e) {
      console.warn("[video-library] asset fetch failed:", e);
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  const handleImportAll = async () => {
    setImporting(true);
    setImportResults(null);
    try {
      const res = await fetch("/api/admin/video-library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import-all" }),
      });
      const data = await res.json();
      setImportResults(data.message || "Import complete");
      fetchStats();
      fetchAssets();
    } catch (e) {
      setImportResults("Import failed — check console");
    } finally {
      setImporting(false);
    }
  };

  const handleImportCollection = async (slug: string) => {
    setImporting(true);
    try {
      const res = await fetch("/api/admin/video-library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import-canva", collectionSlug: slug }),
      });
      const data = await res.json();
      setImportResults(data.message || "Done");
      fetchStats();
    } catch {
      setImportResults("Import failed");
    } finally {
      setImporting(false);
    }
  };

  const handleAddSelfCaptured = async () => {
    try {
      const res = await fetch("/api/admin/video-library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add-self-captured",
          title: scForm.title,
          locationTags: scForm.locationTags.split(",").map(t => t.trim()).filter(Boolean),
          sceneTags: scForm.sceneTags.split(",").map(t => t.trim()).filter(Boolean),
          moodTags: scForm.moodTags.split(",").map(t => t.trim()).filter(Boolean),
          siteId: scForm.siteId,
          notes: scForm.notes,
          exportedUrl: scForm.exportedUrl,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setImportResults(`Added: ${data.asset?.assetCode}`);
        setScForm({ title: "", locationTags: "", sceneTags: "", moodTags: "", siteId: "yalla-london", notes: "", exportedUrl: "" });
        fetchStats();
        fetchAssets();
      }
    } catch {
      setImportResults("Failed to add video");
    }
  };

  // Status badge colors
  const statusColor = (s: string) => {
    const colors: Record<string, string> = {
      untagged: "#E5A100", tagged: "#3B7EA1", matched: "#6B46C1",
      used: "#2D5A3D", retired: "#9CA3AF",
    };
    return colors[s] || "#6B7280";
  };

  const sourceIcon = (s: string) => {
    if (s === "self-captured") return "📱";
    if (s === "canva-purchased") return "🎨";
    if (s === "ai-generated") return "🤖";
    return "📦";
  };

  return (
    <div style={{ padding: "16px", maxWidth: 1200, margin: "0 auto", fontFamily: "var(--font-system, system-ui)" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <Link href="/admin/cockpit" style={{ color: "#3B7EA1", fontSize: 13, textDecoration: "none" }}>
            ← Back to Cockpit
          </Link>
          <h1 style={{ margin: "4px 0 0", fontSize: 24, fontWeight: 700, color: "#1a1a1a" }}>
            Video Library
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "#666" }}>
            {stats ? `${stats.total} clips · ${stats.selfCaptured} self-captured · ${stats.untagged} need tagging` : "Loading..."}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Total", value: stats.total, color: "#1a1a1a" },
            { label: "Untagged", value: stats.untagged, color: "#E5A100" },
            { label: "Tagged", value: stats.tagged, color: "#3B7EA1" },
            { label: "Matched", value: stats.matched, color: "#6B46C1" },
            { label: "Used", value: stats.used, color: "#2D5A3D" },
            { label: "Self-Captured", value: stats.selfCaptured, color: "#C8322B" },
          ].map(card => (
            <div key={card.label} style={{
              background: "#fff", border: "1px solid rgba(214,208,196,0.5)", borderRadius: 12,
              padding: "12px 16px", textAlign: "center",
            }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: card.color }}>{card.value}</div>
              <div style={{ fontSize: 12, color: "#666" }}>{card.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tab Navigation */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, overflowX: "auto" }}>
        {(["library", "import", "upload", "strategy"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "8px 16px", borderRadius: 8, border: "1px solid",
            borderColor: tab === t ? "#3B7EA1" : "rgba(214,208,196,0.5)",
            background: tab === t ? "#3B7EA1" : "#fff",
            color: tab === t ? "#fff" : "#333",
            fontWeight: 600, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap",
          }}>
            {t === "library" ? "📚 Library" : t === "import" ? "📥 Import Canva" : t === "upload" ? "📱 Self-Captured" : "📊 Strategy"}
          </button>
        ))}
      </div>

      {/* ============ TAB: LIBRARY ============ */}
      {tab === "library" && (
        <div>
          {/* Filters */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            <select
              value={filter.status}
              onChange={e => { setFilter(f => ({ ...f, status: e.target.value })); setPage(1); }}
              style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #ddd", fontSize: 13 }}
            >
              <option value="">All Status</option>
              <option value="untagged">Untagged</option>
              <option value="tagged">Tagged</option>
              <option value="matched">Matched</option>
              <option value="used">Used</option>
              <option value="retired">Retired</option>
            </select>
            {/* Collection filter tabs */}
            <div style={{ display: "flex", gap: 4, overflowX: "auto", flexShrink: 0 }}>
              {[
                { value: "", label: "All", count: stats?.total ?? 0 },
                ...(stats?.byCollection?.filter(c => c.collection).map(c => ({
                  value: c.collection!, label: c.collection!, count: c.count,
                })) ?? []),
                ...(stats?.collections?.filter(c => !stats?.byCollection?.some(b => b.collection === c.slug)).map(col => ({
                  value: col.slug, label: col.name, count: col.pageCount,
                })) ?? []),
              ].map(tab => (
                <button
                  key={tab.value}
                  onClick={() => { setFilter(f => ({ ...f, collection: tab.value })); setPage(1); }}
                  style={{
                    padding: "5px 10px", borderRadius: 6, border: "1px solid",
                    borderColor: filter.collection === tab.value ? "#3B7EA1" : "#ddd",
                    background: filter.collection === tab.value ? "#3B7EA1" : "#fff",
                    color: filter.collection === tab.value ? "#fff" : "#333",
                    fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
                  }}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>
            <input
              placeholder="Search tags, text..."
              value={filter.search}
              onChange={e => { setFilter(f => ({ ...f, search: e.target.value })); setPage(1); }}
              style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #ddd", fontSize: 13, flex: 1, minWidth: 150 }}
            />
            <div style={{ display: "flex", gap: 2, background: "#f5f5f5", borderRadius: 6, padding: 2 }}>
              <button
                onClick={() => setViewMode("grid")}
                title="Grid view"
                style={{
                  padding: "6px 10px", borderRadius: 4, border: "none", cursor: "pointer",
                  background: viewMode === "grid" ? "#3B7EA1" : "transparent",
                  color: viewMode === "grid" ? "#fff" : "#666", fontSize: 14, lineHeight: 1,
                }}
              >▦</button>
              <button
                onClick={() => setViewMode("list")}
                title="List view"
                style={{
                  padding: "6px 10px", borderRadius: 4, border: "none", cursor: "pointer",
                  background: viewMode === "list" ? "#3B7EA1" : "transparent",
                  color: viewMode === "list" ? "#fff" : "#666", fontSize: 14, lineHeight: 1,
                }}
              >☰</button>
            </div>
          </div>

          {/* Asset Grid */}
          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: "#999" }}>Loading...</div>
          ) : assets.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "#999" }}>
              <p style={{ fontSize: 18 }}>No videos yet</p>
              <p style={{ fontSize: 14 }}>Go to the <strong>Import Canva</strong> tab to import your collections</p>
            </div>
          ) : viewMode === "grid" ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
              {assets.map(asset => (
                <div key={asset.id} style={{
                  background: "#fff", border: "1px solid rgba(214,208,196,0.5)", borderRadius: 12,
                  overflow: "hidden",
                }}>
                  {/* Thumbnail — real image or gradient fallback */}
                  <div style={{
                    height: 120, position: "relative", overflow: "hidden",
                    background: asset.thumbnailUrl ? "#000" : "linear-gradient(135deg, #1a365d 0%, #3B7EA1 100%)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", fontSize: 24,
                  }}>
                    {asset.thumbnailUrl ? (
                      <img src={asset.thumbnailUrl} alt={asset.assetCode} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      sourceIcon(asset.source)
                    )}
                    <span style={{
                      position: "absolute", top: 6, right: 6,
                      background: statusColor(asset.status), color: "#fff",
                      fontSize: 10, padding: "2px 6px", borderRadius: 4, fontWeight: 600,
                    }}>
                      {asset.status.toUpperCase()}
                    </span>
                    <span style={{
                      position: "absolute", bottom: 6, left: 6,
                      background: "rgba(0,0,0,0.6)", color: "#fff",
                      fontSize: 10, padding: "2px 6px", borderRadius: 4,
                    }}>
                      {asset.assetCode}
                    </span>
                  </div>
                  {/* Details */}
                  <div style={{ padding: "8px 10px" }}>
                    {asset.textOverlay && (
                      <p style={{ fontSize: 11, color: "#333", margin: "0 0 6px", lineHeight: 1.3, maxHeight: 30, overflow: "hidden" }}>
                        {asset.textOverlay.slice(0, 60)}{asset.textOverlay.length > 60 ? "..." : ""}
                      </p>
                    )}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                      {asset.locationTags.slice(0, 3).map(t => (
                        <span key={t} style={{ fontSize: 9, background: "#EBF5FB", color: "#2471A3", padding: "1px 5px", borderRadius: 3 }}>{t}</span>
                      ))}
                      {asset.sceneTags.slice(0, 2).map(t => (
                        <span key={t} style={{ fontSize: 9, background: "#F9EBEA", color: "#C0392B", padding: "1px 5px", borderRadius: 3 }}>{t}</span>
                      ))}
                      {asset.moodTags.slice(0, 1).map(t => (
                        <span key={t} style={{ fontSize: 9, background: "#F4ECF7", color: "#7D3C98", padding: "1px 5px", borderRadius: 3 }}>{t}</span>
                      ))}
                    </div>
                    <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 10, color: "#999" }}>
                        {asset.collectionName} · Used {asset.usageCount}x
                      </span>
                      {asset.canvaDesignId && (
                        <a
                          href={`https://www.canva.com/design/${asset.canvaDesignId}/edit`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: 10, color: "#3B7EA1", textDecoration: "none", fontWeight: 600,
                            padding: "2px 6px", border: "1px solid #3B7EA1", borderRadius: 4,
                          }}
                        >
                          Open in Canva
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* List view */
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {assets.map(asset => (
                <div key={asset.id} style={{
                  background: "#fff", border: "1px solid rgba(214,208,196,0.5)", borderRadius: 10,
                  padding: "10px 14px", display: "flex", gap: 12, alignItems: "center",
                }}>
                  {/* Thumbnail */}
                  <div style={{
                    width: 64, height: 48, borderRadius: 6, overflow: "hidden", flexShrink: 0,
                    background: asset.thumbnailUrl ? "#000" : "linear-gradient(135deg, #1a365d, #3B7EA1)",
                    display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 16,
                  }}>
                    {asset.thumbnailUrl ? (
                      <img src={asset.thumbnailUrl} alt={asset.assetCode} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : sourceIcon(asset.source)}
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#333" }}>{asset.assetCode}</span>
                      <span style={{
                        fontSize: 9, padding: "1px 5px", borderRadius: 3, fontWeight: 600,
                        background: statusColor(asset.status), color: "#fff",
                      }}>{asset.status.toUpperCase()}</span>
                    </div>
                    {asset.textOverlay && (
                      <p style={{ fontSize: 11, color: "#555", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {asset.textOverlay}
                      </p>
                    )}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 3 }}>
                      {[...asset.locationTags.slice(0, 2), ...asset.sceneTags.slice(0, 2), ...asset.moodTags.slice(0, 1)].map(t => (
                        <span key={t} style={{ fontSize: 9, background: "#f0f0f0", color: "#555", padding: "1px 5px", borderRadius: 3 }}>{t}</span>
                      ))}
                    </div>
                  </div>
                  {/* Meta + Canva link */}
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 10, color: "#999", marginBottom: 4 }}>{asset.collectionName}</div>
                    <div style={{ fontSize: 10, color: "#999", marginBottom: 6 }}>Used {asset.usageCount}x</div>
                    {asset.canvaDesignId && (
                      <a
                        href={`https://www.canva.com/design/${asset.canvaDesignId}/edit`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: 10, color: "#3B7EA1", textDecoration: "none", fontWeight: 600,
                          padding: "2px 8px", border: "1px solid #3B7EA1", borderRadius: 4,
                        }}
                      >
                        Open in Canva
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #ddd", cursor: "pointer" }}>Prev</button>
              <span style={{ padding: "6px 12px", fontSize: 13 }}>Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #ddd", cursor: "pointer" }}>Next</button>
            </div>
          )}
        </div>
      )}

      {/* ============ TAB: IMPORT ============ */}
      {tab === "import" && (
        <div>
          <div style={{
            background: "#FFF9E6", border: "1px solid #E5A100", borderRadius: 12,
            padding: 16, marginBottom: 20,
          }}>
            <strong>How it works:</strong> Import reads your Canva collections, creates a VideoAsset record
            for each clip with auto-generated tags based on text content analysis. Each clip gets a unique
            VID-XXX code. You can refine tags later in the Library tab.
          </div>

          <button
            onClick={handleImportAll}
            disabled={importing}
            style={{
              padding: "12px 24px", borderRadius: 8, border: "none",
              background: importing ? "#999" : "#3B7EA1", color: "#fff",
              fontWeight: 700, fontSize: 15, cursor: importing ? "wait" : "pointer",
              marginBottom: 20,
            }}
          >
            {importing ? "Importing..." : "Import All Collections (477 clips)"}
          </button>

          {importResults && (
            <div style={{
              background: "#E8F6EF", border: "1px solid #2D5A3D", borderRadius: 8,
              padding: 12, marginBottom: 16, fontSize: 14,
            }}>
              {importResults}
            </div>
          )}

          <h3 style={{ fontSize: 16, marginBottom: 12 }}>Or import individually:</h3>
          <div style={{ display: "grid", gap: 12 }}>
            {stats?.collections?.map(col => (
              <div key={col.slug} style={{
                background: "#fff", border: "1px solid rgba(214,208,196,0.5)", borderRadius: 12,
                padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <div>
                  <strong>{col.name}</strong>
                  <span style={{ marginLeft: 8, fontSize: 12, color: "#999" }}>{col.pageCount} clips · {col.contentType}</span>
                </div>
                <button
                  onClick={() => handleImportCollection(col.slug)}
                  disabled={importing}
                  style={{
                    padding: "6px 16px", borderRadius: 6, border: "1px solid #3B7EA1",
                    background: "#fff", color: "#3B7EA1", fontWeight: 600, fontSize: 13, cursor: "pointer",
                  }}
                >
                  Import
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============ TAB: SELF-CAPTURED UPLOAD ============ */}
      {tab === "upload" && (
        <div style={{ maxWidth: 500 }}>
          <div style={{
            background: "#FEF2F2", border: "1px solid #C8322B", borderRadius: 12,
            padding: 16, marginBottom: 20,
          }}>
            <strong>Self-captured videos get priority</strong> — they score +15 points in article matching
            and are preferred by the social scheduler. Google&apos;s Jan 2026 Authenticity Update rewards
            first-hand content over stock footage.
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>Title / Description</label>
              <input
                value={scForm.title}
                onChange={e => setScForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g., Walking through Mayfair on a sunny morning"
                style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #ddd", fontSize: 14 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>Location Tags (comma-separated)</label>
              <input
                value={scForm.locationTags}
                onChange={e => setScForm(f => ({ ...f, locationTags: e.target.value }))}
                placeholder="london, mayfair"
                style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #ddd", fontSize: 14 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>Scene Tags (comma-separated)</label>
              <input
                value={scForm.sceneTags}
                onChange={e => setScForm(f => ({ ...f, sceneTags: e.target.value }))}
                placeholder="street-scene, shopping, garden"
                style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #ddd", fontSize: 14 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>Mood Tags (comma-separated)</label>
              <input
                value={scForm.moodTags}
                onChange={e => setScForm(f => ({ ...f, moodTags: e.target.value }))}
                placeholder="luxury, peaceful, vibrant"
                style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #ddd", fontSize: 14 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>Video URL (optional — Canva, YouTube, or direct link)</label>
              <input
                value={scForm.exportedUrl}
                onChange={e => setScForm(f => ({ ...f, exportedUrl: e.target.value }))}
                placeholder="https://..."
                style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #ddd", fontSize: 14 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>Site</label>
              <select
                value={scForm.siteId}
                onChange={e => setScForm(f => ({ ...f, siteId: e.target.value }))}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #ddd", fontSize: 14 }}
              >
                <option value="yalla-london">Yalla London</option>
                <option value="zenitha-yachts-med">Zenitha Yachts</option>
                <option value="arabaldives">Arabaldives</option>
                <option value="french-riviera">Yalla Riviera</option>
                <option value="istanbul">Yalla Istanbul</option>
                <option value="thailand">Yalla Thailand</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>Notes</label>
              <textarea
                value={scForm.notes}
                onChange={e => setScForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Any context about the footage..."
                rows={3}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #ddd", fontSize: 14 }}
              />
            </div>
            <button
              onClick={handleAddSelfCaptured}
              style={{
                padding: "10px 20px", borderRadius: 8, border: "none",
                background: "#C8322B", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
              }}
            >
              Add Self-Captured Video
            </button>
          </div>

          {importResults && (
            <div style={{ background: "#E8F6EF", border: "1px solid #2D5A3D", borderRadius: 8, padding: 12, marginTop: 16, fontSize: 14 }}>
              {importResults}
            </div>
          )}

          <h3 style={{ fontSize: 16, marginTop: 24, marginBottom: 12 }}>Suggested Captures</h3>
          <ul style={{ fontSize: 13, color: "#555", lineHeight: 1.8, paddingLeft: 20 }}>
            <li>Walking through London neighborhoods (Mayfair, Kensington, Notting Hill)</li>
            <li>Hotel room tours and lobby walkthroughs</li>
            <li>Restaurant ambiance and food close-ups</li>
            <li>London landmarks from unique angles</li>
            <li>Afternoon tea setup and pouring</li>
            <li>Street markets (Borough, Camden, Portobello)</li>
            <li>Day trips (Stonehenge, Bath, Oxford)</li>
          </ul>
          <div style={{ background: "#F0F4FF", borderRadius: 8, padding: 12, marginTop: 12, fontSize: 12, color: "#444" }}>
            <strong>Tips:</strong> Shoot vertical (9:16). 60fps if possible. Natural light. 10-30 second clips. Capture ambient sound.
          </div>
        </div>
      )}

      {/* ============ TAB: STRATEGY ============ */}
      {tab === "strategy" && (
        <div>
          <h3 style={{ fontSize: 18, marginBottom: 16 }}>Social Media Posting Strategy</h3>

          {/* Content Mix */}
          <div style={{ background: "#fff", border: "1px solid rgba(214,208,196,0.5)", borderRadius: 12, padding: 16, marginBottom: 20 }}>
            <h4 style={{ margin: "0 0 12px", fontSize: 14 }}>Content Mix (Standard)</h4>
            <div style={{ display: "grid", gap: 8 }}>
              {[
                { label: "Inspirational", pct: 40, color: "#3B7EA1", desc: "Destination showcases, beach vibes, mood clips" },
                { label: "Educational", pct: 25, color: "#2D5A3D", desc: "Tips, how-tos, lists, travel hacks" },
                { label: "Promotional", pct: 20, color: "#C49A2A", desc: "Article promotion, affiliate CTAs, booking links" },
                { label: "Engagement", pct: 10, color: "#6B46C1", desc: "Polls, questions, UGC reposts" },
                { label: "Self-Captured", pct: 5, color: "#C8322B", desc: "Your own footage — highest authenticity" },
              ].map(item => (
                <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 80, fontSize: 11, fontWeight: 600, color: "#555" }}>{item.label}</div>
                  <div style={{ flex: 1, height: 20, background: "#f5f5f5", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: `${item.pct}%`, height: "100%", background: item.color, borderRadius: 4 }} />
                  </div>
                  <div style={{ width: 35, fontSize: 12, fontWeight: 700, color: item.color }}>{item.pct}%</div>
                  <div style={{ fontSize: 11, color: "#888", flex: 1.5 }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Weekly Calendar */}
          <div style={{ background: "#fff", border: "1px solid rgba(214,208,196,0.5)", borderRadius: 12, padding: 16, marginBottom: 20 }}>
            <h4 style={{ margin: "0 0 12px", fontSize: 14 }}>Weekly Calendar (22 posts/week)</h4>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #eee" }}>
                    <th style={{ textAlign: "left", padding: "6px 8px", color: "#555" }}>Day</th>
                    <th style={{ textAlign: "left", padding: "6px 8px", color: "#555" }}>Time (UTC)</th>
                    <th style={{ textAlign: "left", padding: "6px 8px", color: "#555" }}>Platform</th>
                    <th style={{ textAlign: "left", padding: "6px 8px", color: "#555" }}>Type</th>
                    <th style={{ textAlign: "left", padding: "6px 8px", color: "#555" }}>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { day: "Mon", time: "07:00", platform: "IG Stories", type: "Aesthetic", source: "50-aesthetic" },
                    { day: "Mon", time: "17:00", platform: "IG Reels", type: "Destination", source: "60-luxury" },
                    { day: "Mon", time: "17:30", platform: "TikTok", type: "Tips", source: "60-luxury" },
                    { day: "Tue", time: "07:00", platform: "IG Stories", type: "Poll/Q&A", source: "50-aesthetic" },
                    { day: "Tue", time: "17:00", platform: "IG Reels", type: "Article Promo", source: "60-luxury" },
                    { day: "Tue", time: "17:00", platform: "Twitter/X", type: "Article Link", source: "300-beach" },
                    { day: "Wed", time: "07:00", platform: "IG Stories", type: "Beach Vibes", source: "300-beach" },
                    { day: "Wed", time: "17:00", platform: "IG Reels", type: "UGC/POV", source: "50-aesthetic" },
                    { day: "Wed", time: "17:30", platform: "TikTok", type: "Destination", source: "60-luxury" },
                    { day: "Thu", time: "07:00", platform: "IG Stories", type: "Aesthetic", source: "50-aesthetic" },
                    { day: "Thu", time: "16:00", platform: "IG Reels", type: "Tips List", source: "IG-templates" },
                    { day: "Thu", time: "16:30", platform: "TikTok", type: "Educational", source: "60-luxury" },
                    { day: "Thu", time: "17:00", platform: "YT Shorts", type: "Destination", source: "60-luxury" },
                    { day: "Fri", time: "10:00", platform: "IG Stories", type: "Beach Vibes", source: "300-beach" },
                    { day: "Fri", time: "17:00", platform: "IG Reels", type: "Destination", source: "60-luxury" },
                    { day: "Fri", time: "17:00", platform: "Twitter/X", type: "Weekend Mood", source: "300-beach" },
                    { day: "Sat", time: "10:00", platform: "IG Stories", type: "Self-Captured", source: "Your footage" },
                    { day: "Sat", time: "17:00", platform: "IG Reels", type: "Article Promo", source: "60-luxury" },
                    { day: "Sat", time: "17:30", platform: "TikTok", type: "UGC Style", source: "50-aesthetic" },
                    { day: "Sun", time: "07:00", platform: "IG Stories", type: "Week Recap", source: "50-aesthetic" },
                    { day: "Sun", time: "17:00", platform: "IG Reels", type: "Beach/Relax", source: "300-beach" },
                    { day: "Sun", time: "17:00", platform: "YT Shorts", type: "Tips", source: "60-luxury" },
                  ].map((row, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f0f0f0" }}>
                      <td style={{ padding: "6px 8px", fontWeight: row.time === "07:00" ? 600 : 400 }}>{row.day}</td>
                      <td style={{ padding: "6px 8px" }}>{row.time}</td>
                      <td style={{ padding: "6px 8px" }}>{row.platform}</td>
                      <td style={{ padding: "6px 8px" }}>{row.type}</td>
                      <td style={{ padding: "6px 8px", color: "#888" }}>{row.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Collection Usage Guide */}
          <div style={{ background: "#fff", border: "1px solid rgba(214,208,196,0.5)", borderRadius: 12, padding: 16 }}>
            <h4 style={{ margin: "0 0 12px", fontSize: 14 }}>How to Use Each Collection</h4>
            {[
              { name: "60 Luxury Travel", use: "Hero content. Destination showcases, travel tips, article promotion backgrounds. Use 3-4x/week on IG Reels + TikTok. Already have text overlays — rebrand with your logo.", color: "#C49A2A" },
              { name: "50 Aesthetic Reels", use: "Daily fillers. POV reels, morning routines, aesthetic vibes. Template text boxes — swap with your branded copy. Perfect for IG Stories + engagement posts.", color: "#3B7EA1" },
              { name: "300+ Beach Clips", use: "B-roll powerhouse. Use as backgrounds behind article quotes, story backgrounds, transition clips. 314 unique clips = 6 months of daily content without repeats. Best for Arabaldives + Zenitha Yachts.", color: "#2D5A3D" },
              { name: "IG Templates", use: "Tips & lists. '5 things to know before visiting...', insider tips, branded travel quotes. Rebrand with site colors. Use 2x/week.", color: "#6B46C1" },
              { name: "Self-Captured", use: "YOUR SECRET WEAPON. Google rewards first-hand content. Audiences trust real footage. Always gets +15 matching priority. Aim for 2-3 new clips/week.", color: "#C8322B" },
            ].map(col => (
              <div key={col.name} style={{ marginBottom: 12, paddingLeft: 12, borderLeft: `3px solid ${col.color}` }}>
                <strong style={{ fontSize: 13 }}>{col.name}</strong>
                <p style={{ fontSize: 12, color: "#555", margin: "4px 0 0", lineHeight: 1.4 }}>{col.use}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
