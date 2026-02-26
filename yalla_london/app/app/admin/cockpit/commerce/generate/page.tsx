"use client";
/**
 * Product File Generator — /admin/cockpit/commerce/generate
 *
 * Admin page for generating actual PDF/digital product files from:
 * 1. ProductBriefs (AI-generated content -> branded PDF)
 * 2. Existing BlogPosts (repurpose published content into sellable products)
 *
 * Mobile-first design (375px). All data from /api/admin/commerce/generate-product.
 */

import { useState, useEffect, useCallback } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Brief {
  id: string;
  title: string;
  description: string;
  productType: string;
  ontologyCategory: string;
  tier: number;
  status: string;
  digitalProductId: string | null;
  targetPrice: number | null;
  designNotes: Record<string, unknown> | null;
  createdAt: string;
}

interface BlogPostItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  pageType: string | null;
  seoScore: number | null;
  createdAt: string;
}

interface Summary {
  briefsNeedingFiles: number;
  availableBlogPosts: number;
  siteId: string;
}

interface GenerationResult {
  success: boolean;
  action: string;
  fileName?: string;
  fileSize?: number;
  pageCount?: number;
  base64?: string;
  mimeType?: string;
  html?: string;
  error?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PRODUCT_TYPES = [
  { value: "PDF_GUIDE", label: "Travel Guide" },
  { value: "TEMPLATE", label: "Itinerary Template" },
  { value: "PLANNER", label: "Trip Planner" },
  { value: "WORKSHEET", label: "Travel Worksheet" },
  { value: "BUNDLE", label: "Bundle" },
  { value: "WALL_ART", label: "Wall Art" },
  { value: "PRESET", label: "Photo Preset" },
  { value: "STICKER", label: "Digital Sticker" },
  { value: "EVENT_GUIDE", label: "Event Guide" },
];

const GENERATION_ACTIONS: Record<
  string,
  { action: string; label: string; description: string }
> = {
  PDF_GUIDE: {
    action: "generate_guide",
    label: "Generate Guide",
    description: "AI-generated comprehensive travel guide with branded layout",
  },
  TEMPLATE: {
    action: "generate_itinerary",
    label: "Generate Itinerary",
    description: "Day-by-day itinerary with insider tips and budget estimates",
  },
  PLANNER: {
    action: "generate_guide",
    label: "Generate Planner",
    description: "Checklist-based trip planner with budget tracker",
  },
  WORKSHEET: {
    action: "generate_guide",
    label: "Generate Worksheet",
    description: "Fillable travel worksheet with activity planner",
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function tierLabel(tier: number): string {
  switch (tier) {
    case 1:
      return "High Priority";
    case 2:
      return "Medium";
    case 3:
      return "Low";
    default:
      return `Tier ${tier}`;
  }
}

function tierColor(tier: number): string {
  switch (tier) {
    case 1:
      return "#059669";
    case 2:
      return "#D97706";
    case 3:
      return "#6B7280";
    default:
      return "#6B7280";
  }
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = {
  page: {
    minHeight: "100vh",
    background: "#F8FAFC",
    padding: "16px",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  } as React.CSSProperties,
  header: {
    marginBottom: "20px",
  } as React.CSSProperties,
  title: {
    fontSize: "20px",
    fontWeight: 700,
    color: "#0F172A",
    marginBottom: "4px",
  } as React.CSSProperties,
  subtitle: {
    fontSize: "13px",
    color: "#64748B",
  } as React.CSSProperties,
  statsRow: {
    display: "flex",
    gap: "10px",
    marginBottom: "20px",
    overflowX: "auto" as const,
  } as React.CSSProperties,
  statCard: {
    flex: "1",
    minWidth: "140px",
    background: "#FFFFFF",
    borderRadius: "10px",
    padding: "14px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  } as React.CSSProperties,
  statValue: {
    fontSize: "24px",
    fontWeight: 700,
    color: "#0F172A",
  } as React.CSSProperties,
  statLabel: {
    fontSize: "11px",
    color: "#94A3B8",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
    marginTop: "2px",
  } as React.CSSProperties,
  tabs: {
    display: "flex",
    gap: "0",
    marginBottom: "16px",
    background: "#E2E8F0",
    borderRadius: "8px",
    padding: "3px",
  } as React.CSSProperties,
  tab: (active: boolean) =>
    ({
      flex: 1,
      padding: "10px 12px",
      border: "none",
      borderRadius: "6px",
      fontSize: "13px",
      fontWeight: active ? 600 : 400,
      color: active ? "#0F172A" : "#64748B",
      background: active ? "#FFFFFF" : "transparent",
      cursor: "pointer",
      transition: "all 0.15s ease",
      boxShadow: active ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
    }) as React.CSSProperties,
  section: {
    background: "#FFFFFF",
    borderRadius: "12px",
    padding: "16px",
    marginBottom: "16px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  } as React.CSSProperties,
  sectionTitle: {
    fontSize: "15px",
    fontWeight: 600,
    color: "#0F172A",
    marginBottom: "12px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  } as React.CSSProperties,
  briefCard: {
    border: "1px solid #E2E8F0",
    borderRadius: "10px",
    padding: "14px",
    marginBottom: "10px",
  } as React.CSSProperties,
  briefTitle: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#0F172A",
    marginBottom: "4px",
  } as React.CSSProperties,
  briefDesc: {
    fontSize: "12px",
    color: "#64748B",
    marginBottom: "8px",
    lineHeight: 1.4,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical" as const,
    overflow: "hidden",
  } as React.CSSProperties,
  briefMeta: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "6px",
    marginBottom: "10px",
  } as React.CSSProperties,
  badge: (bg: string, color: string) =>
    ({
      display: "inline-block",
      padding: "3px 8px",
      borderRadius: "4px",
      fontSize: "11px",
      fontWeight: 500,
      background: bg,
      color: color,
    }) as React.CSSProperties,
  actionRow: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap" as const,
  } as React.CSSProperties,
  btn: (variant: "primary" | "secondary" | "ghost") => {
    const base: React.CSSProperties = {
      padding: "8px 14px",
      borderRadius: "6px",
      fontSize: "12px",
      fontWeight: 600,
      cursor: "pointer",
      border: "none",
      transition: "all 0.15s ease",
    };
    switch (variant) {
      case "primary":
        return {
          ...base,
          background: "#1E3A5F",
          color: "#FFFFFF",
        } as React.CSSProperties;
      case "secondary":
        return {
          ...base,
          background: "#F1F5F9",
          color: "#334155",
          border: "1px solid #E2E8F0",
        } as React.CSSProperties;
      case "ghost":
        return {
          ...base,
          background: "transparent",
          color: "#64748B",
        } as React.CSSProperties;
    }
  },
  btnDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  } as React.CSSProperties,
  select: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #E2E8F0",
    fontSize: "13px",
    color: "#0F172A",
    background: "#FFFFFF",
    marginBottom: "10px",
    appearance: "none" as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
    backgroundPosition: "right 10px center",
    backgroundRepeat: "no-repeat",
    backgroundSize: "20px",
  } as React.CSSProperties,
  resultBox: {
    background: "#F0FDF4",
    border: "1px solid #BBF7D0",
    borderRadius: "8px",
    padding: "12px",
    marginTop: "10px",
    fontSize: "13px",
    color: "#166534",
  } as React.CSSProperties,
  errorBox: {
    background: "#FEF2F2",
    border: "1px solid #FECACA",
    borderRadius: "8px",
    padding: "12px",
    marginTop: "10px",
    fontSize: "13px",
    color: "#991B1B",
  } as React.CSSProperties,
  spinner: {
    display: "inline-block",
    width: "14px",
    height: "14px",
    border: "2px solid #E2E8F0",
    borderTopColor: "#1E3A5F",
    borderRadius: "50%",
    animation: "spin 0.6s linear infinite",
    marginRight: "6px",
    verticalAlign: "middle",
  } as React.CSSProperties,
  previewOverlay: {
    position: "fixed" as const,
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    zIndex: 1000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
  } as React.CSSProperties,
  previewModal: {
    background: "#FFFFFF",
    borderRadius: "12px",
    width: "100%",
    maxWidth: "800px",
    maxHeight: "90vh",
    overflow: "auto",
    boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
  } as React.CSSProperties,
  previewHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 16px",
    borderBottom: "1px solid #E2E8F0",
    position: "sticky" as const,
    top: 0,
    background: "#FFFFFF",
    zIndex: 10,
  } as React.CSSProperties,
  emptyState: {
    textAlign: "center" as const,
    padding: "32px 16px",
    color: "#94A3B8",
  } as React.CSSProperties,
  emptyIcon: {
    fontSize: "32px",
    marginBottom: "8px",
  } as React.CSSProperties,
  progressBar: {
    width: "100%",
    height: "6px",
    background: "#E2E8F0",
    borderRadius: "3px",
    overflow: "hidden",
    marginTop: "8px",
  } as React.CSSProperties,
  progressFill: {
    height: "100%",
    background: "linear-gradient(90deg, #1E3A5F, #D4A853)",
    borderRadius: "3px",
    animation: "progress 2s ease-in-out infinite",
  } as React.CSSProperties,
} as const;

// ─── Component ───────────────────────────────────────────────────────────────

export default function ProductFileGeneratorPage() {
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPostItem[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"briefs" | "blog" | "templates">(
    "briefs",
  );

  // Generation state
  const [generating, setGenerating] = useState<string | null>(null); // briefId or postId being generated
  const [generationResults, setGenerationResults] = useState<
    Record<string, GenerationResult>
  >({});

  // Blog post generation
  const [selectedPostId, setSelectedPostId] = useState("");
  const [selectedProductType, setSelectedProductType] = useState("PDF_GUIDE");

  // Template preview
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);

  // ── Data Loading ─────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/commerce/generate-product");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setBriefs(data.briefs || []);
      setBlogPosts(data.blogPosts || []);
      setSummary(data.summary || null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load data",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Generation Handlers ──────────────────────────────────────

  async function handleGenerateBrief(briefId: string, action: string) {
    setGenerating(briefId);
    setGenerationResults((prev) => ({
      ...prev,
      [briefId]: undefined as unknown as GenerationResult,
    }));

    try {
      const res = await fetch("/api/admin/commerce/generate-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, briefId }),
      });

      const data = await res.json();
      setGenerationResults((prev) => ({ ...prev, [briefId]: data }));

      // If the PDF was generated, trigger download
      if (data.success && data.base64 && data.mimeType) {
        triggerDownload(data.base64, data.fileName, data.mimeType);
      }
    } catch (err) {
      setGenerationResults((prev) => ({
        ...prev,
        [briefId]: {
          success: false,
          action,
          error: err instanceof Error ? err.message : "Generation failed",
        },
      }));
    } finally {
      setGenerating(null);
    }
  }

  async function handleGenerateFromPost() {
    if (!selectedPostId) return;

    const genKey = `post-${selectedPostId}`;
    setGenerating(genKey);

    try {
      const res = await fetch("/api/admin/commerce/generate-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_from_post",
          postId: selectedPostId,
          productType: selectedProductType,
        }),
      });

      const data = await res.json();
      setGenerationResults((prev) => ({ ...prev, [genKey]: data }));

      if (data.success && data.base64 && data.mimeType) {
        triggerDownload(data.base64, data.fileName, data.mimeType);
      }
    } catch (err) {
      setGenerationResults((prev) => ({
        ...prev,
        [genKey]: {
          success: false,
          action: "generate_from_post",
          error: err instanceof Error ? err.message : "Generation failed",
        },
      }));
    } finally {
      setGenerating(null);
    }
  }

  async function handlePreviewTemplate(productType: string) {
    setPreviewLoading(true);
    setPreviewType(productType);

    try {
      const res = await fetch("/api/admin/commerce/generate-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "preview_template",
          productType,
        }),
      });

      const data = await res.json();
      if (data.success && data.html) {
        setPreviewHtml(data.html);
      }
    } catch (err) {
      console.warn("[generate-page] Template preview failed:", err);
    } finally {
      setPreviewLoading(false);
    }
  }

  function triggerDownload(base64: string, fileName: string, mimeType: string) {
    const byteChars = atob(base64);
    const byteNumbers = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteNumbers[i] = byteChars.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ── Determine generation action for a brief ──────────────────

  function getActionForBrief(brief: Brief): {
    action: string;
    label: string;
    description: string;
  } {
    const cat = brief.ontologyCategory?.toLowerCase() || "";
    if (
      cat.includes("itinerary") ||
      brief.productType === "TEMPLATE"
    ) {
      return GENERATION_ACTIONS["TEMPLATE"];
    }
    return (
      GENERATION_ACTIONS[brief.productType] ||
      GENERATION_ACTIONS["PDF_GUIDE"]
    );
  }

  // ── Render ───────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.header}>
          <div style={styles.title}>Product File Generator</div>
          <div style={styles.subtitle}>Loading...</div>
        </div>
        <div style={{ ...styles.section, textAlign: "center", padding: "40px" }}>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <div style={{ ...styles.spinner, width: "28px", height: "28px", margin: "0 auto 12px" }} />
          <div style={{ color: "#64748B", fontSize: "13px" }}>
            Loading product briefs and blog posts...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Keyframes */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes progress { 0% { width: 5%; } 50% { width: 80%; } 100% { width: 95%; } }
      `}</style>

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.title}>Product File Generator</div>
        <div style={styles.subtitle}>
          Create PDF products from briefs and blog posts
          {summary ? ` | ${summary.siteId}` : ""}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div style={styles.errorBox}>
          {error}
          <button
            onClick={fetchData}
            style={{
              ...styles.btn("secondary"),
              marginLeft: "10px",
              padding: "4px 10px",
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Stats */}
      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{summary?.briefsNeedingFiles ?? 0}</div>
          <div style={styles.statLabel}>Briefs Need Files</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{summary?.availableBlogPosts ?? 0}</div>
          <div style={styles.statLabel}>Posts Available</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>
            {Object.values(generationResults).filter((r) => r?.success).length}
          </div>
          <div style={styles.statLabel}>Generated</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          style={styles.tab(activeTab === "briefs")}
          onClick={() => setActiveTab("briefs")}
        >
          Briefs ({briefs.length})
        </button>
        <button
          style={styles.tab(activeTab === "blog")}
          onClick={() => setActiveTab("blog")}
        >
          From Blog
        </button>
        <button
          style={styles.tab(activeTab === "templates")}
          onClick={() => setActiveTab("templates")}
        >
          Templates
        </button>
      </div>

      {/* ── Tab: Briefs Needing Files ──────────────────────────── */}
      {activeTab === "briefs" && (
        <div>
          {briefs.length === 0 ? (
            <div style={styles.section}>
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>&#128230;</div>
                <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: "4px" }}>
                  No briefs need files
                </div>
                <div style={{ fontSize: "12px" }}>
                  All product briefs already have generated files, or no briefs exist yet.
                </div>
              </div>
            </div>
          ) : (
            briefs.map((brief) => {
              const genAction = getActionForBrief(brief);
              const result = generationResults[brief.id];
              const isGenerating = generating === brief.id;

              return (
                <div key={brief.id} style={styles.briefCard}>
                  <div style={styles.briefTitle}>{brief.title}</div>
                  <div style={styles.briefDesc}>{brief.description}</div>

                  <div style={styles.briefMeta}>
                    <span
                      style={styles.badge(
                        `${tierColor(brief.tier)}15`,
                        tierColor(brief.tier),
                      )}
                    >
                      {tierLabel(brief.tier)}
                    </span>
                    <span style={styles.badge("#EEF2FF", "#4338CA")}>
                      {brief.productType}
                    </span>
                    <span style={styles.badge("#F1F5F9", "#475569")}>
                      {brief.ontologyCategory}
                    </span>
                    {brief.targetPrice && (
                      <span style={styles.badge("#ECFDF5", "#047857")}>
                        ${(brief.targetPrice / 100).toFixed(2)}
                      </span>
                    )}
                    <span style={styles.badge("#FFF7ED", "#C2410C")}>
                      {brief.status}
                    </span>
                  </div>

                  <div style={{ fontSize: "11px", color: "#94A3B8", marginBottom: "8px" }}>
                    Created {timeAgo(brief.createdAt)}
                    {brief.digitalProductId
                      ? " | Linked to product (no file)"
                      : " | No product linked"}
                  </div>

                  <div style={styles.actionRow}>
                    <button
                      style={{
                        ...styles.btn("primary"),
                        ...(isGenerating ? styles.btnDisabled : {}),
                      }}
                      disabled={isGenerating}
                      onClick={() =>
                        handleGenerateBrief(brief.id, genAction.action)
                      }
                    >
                      {isGenerating && <span style={styles.spinner} />}
                      {genAction.label}
                    </button>
                    <button
                      style={styles.btn("secondary")}
                      onClick={() =>
                        handlePreviewTemplate(brief.productType)
                      }
                      disabled={previewLoading}
                    >
                      Preview Template
                    </button>
                  </div>

                  <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "6px" }}>
                    {genAction.description}
                  </div>

                  {/* Generation progress */}
                  {isGenerating && (
                    <div style={{ marginTop: "10px" }}>
                      <div style={{ fontSize: "12px", color: "#1E3A5F", fontWeight: 500 }}>
                        Generating PDF... (AI content + branded template + PDF render)
                      </div>
                      <div style={styles.progressBar}>
                        <div style={styles.progressFill} />
                      </div>
                    </div>
                  )}

                  {/* Result */}
                  {result && result.success && (
                    <div style={styles.resultBox}>
                      Generated: <strong>{result.fileName}</strong>
                      {result.fileSize
                        ? ` (${formatBytes(result.fileSize)})`
                        : ""}
                      {result.pageCount
                        ? ` | ${result.pageCount} pages`
                        : ""}
                      <br />
                      <span style={{ fontSize: "11px" }}>
                        File downloaded automatically. Upload to your product listing.
                      </span>
                    </div>
                  )}
                  {result && !result.success && (
                    <div style={styles.errorBox}>{result.error || "Generation failed"}</div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Tab: From Blog Post ────────────────────────────────── */}
      {activeTab === "blog" && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>
            Repurpose Blog Post into Product
          </div>

          <div style={{ fontSize: "12px", color: "#64748B", marginBottom: "12px" }}>
            Select a published blog post and convert it into a sellable digital product.
            The content will be reformatted with professional branding and layout.
          </div>

          {/* Post selector */}
          <label
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: "#475569",
              marginBottom: "4px",
              display: "block",
            }}
          >
            Select Blog Post
          </label>
          <select
            style={styles.select}
            value={selectedPostId}
            onChange={(e) => setSelectedPostId(e.target.value)}
          >
            <option value="">-- Choose a blog post --</option>
            {blogPosts.map((post) => (
              <option key={post.id} value={post.id}>
                {post.title}
                {post.seoScore ? ` (SEO: ${post.seoScore})` : ""}
                {post.pageType ? ` [${post.pageType}]` : ""}
              </option>
            ))}
          </select>

          {/* Product type selector */}
          <label
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: "#475569",
              marginBottom: "4px",
              display: "block",
            }}
          >
            Output Product Type
          </label>
          <select
            style={styles.select}
            value={selectedProductType}
            onChange={(e) => setSelectedProductType(e.target.value)}
          >
            {PRODUCT_TYPES.filter((t) =>
              ["PDF_GUIDE", "TEMPLATE", "PLANNER", "WORKSHEET"].includes(
                t.value,
              ),
            ).map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          {/* Selected post preview */}
          {selectedPostId && (
            <div
              style={{
                border: "1px solid #E2E8F0",
                borderRadius: "8px",
                padding: "12px",
                marginBottom: "12px",
                background: "#F8FAFC",
              }}
            >
              {(() => {
                const post = blogPosts.find((p) => p.id === selectedPostId);
                if (!post) return null;
                return (
                  <>
                    <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: "4px" }}>
                      {post.title}
                    </div>
                    {post.excerpt && (
                      <div style={{ fontSize: "12px", color: "#64748B", marginBottom: "6px" }}>
                        {post.excerpt}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {post.pageType && (
                        <span style={styles.badge("#EEF2FF", "#4338CA")}>
                          {post.pageType}
                        </span>
                      )}
                      {post.seoScore != null && (
                        <span
                          style={styles.badge(
                            post.seoScore >= 70 ? "#ECFDF5" : "#FEF3C7",
                            post.seoScore >= 70 ? "#047857" : "#92400E",
                          )}
                        >
                          SEO: {post.seoScore}
                        </span>
                      )}
                      <span style={styles.badge("#F1F5F9", "#475569")}>
                        {timeAgo(post.createdAt)}
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* Generate button */}
          <button
            style={{
              ...styles.btn("primary"),
              width: "100%",
              padding: "12px",
              fontSize: "14px",
              ...((!selectedPostId || generating === `post-${selectedPostId}`)
                ? styles.btnDisabled
                : {}),
            }}
            disabled={!selectedPostId || generating === `post-${selectedPostId}`}
            onClick={handleGenerateFromPost}
          >
            {generating === `post-${selectedPostId}` && (
              <span style={styles.spinner} />
            )}
            {generating === `post-${selectedPostId}`
              ? "Generating..."
              : `Generate ${PRODUCT_TYPES.find((t) => t.value === selectedProductType)?.label || "Product"}`}
          </button>

          {/* Progress */}
          {generating === `post-${selectedPostId}` && selectedPostId && (
            <div style={{ marginTop: "10px" }}>
              <div style={{ fontSize: "12px", color: "#1E3A5F", fontWeight: 500 }}>
                Converting blog post to {selectedProductType} PDF...
              </div>
              <div style={styles.progressBar}>
                <div style={styles.progressFill} />
              </div>
            </div>
          )}

          {/* Result */}
          {(() => {
            const genKey = `post-${selectedPostId}`;
            const result = generationResults[genKey];
            if (!result) return null;
            if (result.success) {
              return (
                <div style={styles.resultBox}>
                  Generated: <strong>{result.fileName}</strong>
                  {result.fileSize ? ` (${formatBytes(result.fileSize)})` : ""}
                  {result.pageCount ? ` | ${result.pageCount} pages` : ""}
                  <br />
                  <span style={{ fontSize: "11px" }}>
                    File downloaded automatically.
                  </span>
                </div>
              );
            }
            return (
              <div style={styles.errorBox}>
                {result.error || "Generation failed"}
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Tab: Template Preview ──────────────────────────────── */}
      {activeTab === "templates" && (
        <div>
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Template Gallery</div>
            <div style={{ fontSize: "12px", color: "#64748B", marginBottom: "14px" }}>
              Preview the branded PDF templates for each product type.
              Templates use your site colours, fonts, and branding automatically.
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
              }}
            >
              {[
                {
                  type: "TEMPLATE",
                  label: "Itinerary",
                  icon: "\uD83D\uDDFA\uFE0F",
                  desc: "Day-by-day timeline layout",
                },
                {
                  type: "PDF_GUIDE",
                  label: "Travel Guide",
                  icon: "\uD83D\uDCD6",
                  desc: "Magazine-style layout",
                },
                {
                  type: "PLANNER",
                  label: "Planner",
                  icon: "\uD83D\uDCCB",
                  desc: "Checklist layout",
                },
                {
                  type: "WORKSHEET",
                  label: "Worksheet",
                  icon: "\uD83D\uDCDD",
                  desc: "Fillable form layout",
                },
              ].map((tpl) => (
                <button
                  key={tpl.type}
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    borderRadius: "10px",
                    padding: "16px 12px",
                    cursor: "pointer",
                    textAlign: "center" as const,
                    transition: "all 0.15s ease",
                  }}
                  onClick={() => handlePreviewTemplate(tpl.type)}
                  disabled={previewLoading}
                >
                  <div style={{ fontSize: "28px", marginBottom: "6px" }}>
                    {tpl.icon}
                  </div>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#0F172A",
                      marginBottom: "2px",
                    }}
                  >
                    {tpl.label}
                  </div>
                  <div style={{ fontSize: "11px", color: "#94A3B8" }}>
                    {tpl.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Template Preview Modal ─────────────────────────────── */}
      {previewHtml && (
        <div
          style={styles.previewOverlay}
          onClick={() => setPreviewHtml(null)}
        >
          <div
            style={styles.previewModal}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.previewHeader}>
              <div>
                <div style={{ fontSize: "15px", fontWeight: 600 }}>
                  Template Preview
                </div>
                <div style={{ fontSize: "11px", color: "#94A3B8" }}>
                  {PRODUCT_TYPES.find((t) => t.value === previewType)?.label ||
                    previewType}
                </div>
              </div>
              <button
                style={{
                  ...styles.btn("ghost"),
                  fontSize: "18px",
                  padding: "4px 10px",
                }}
                onClick={() => setPreviewHtml(null)}
              >
                x
              </button>
            </div>
            <div style={{ padding: "0" }}>
              <iframe
                srcDoc={previewHtml}
                style={{
                  width: "100%",
                  height: "70vh",
                  border: "none",
                  display: "block",
                }}
                title="Template Preview"
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
