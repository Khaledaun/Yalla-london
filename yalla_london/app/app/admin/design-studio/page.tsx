"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import NextImage from "next/image";
import { sanitizeHtml } from "@/lib/html-sanitizer";
import {
  AdminCard,
  AdminPageHeader,
  AdminSectionLabel,
  AdminButton,
  AdminStatusBadge,
  AdminLoadingState,
  AdminEmptyState,
  AdminAlertBanner,
  AdminTabs,
  AdminKPICard,
  useConfirm,
} from "@/components/admin/admin-ui";
import {
  Palette,
  Upload,
  Image as ImageIcon,
  Wand2,
  Layout,
  FolderOpen,
  RefreshCw,
  Download,
  Eye,
  Trash2,
  Sparkles,
  Grid3X3,
  List,
  Search,
  Filter,
  PenTool,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import type { DesignTemplate, DesignElement } from "@/lib/pdf/brand-design-system";
import type { CanvasActions, CanvasState } from "@/components/design-studio/design-canvas";
import { SITES as SITE_CONFIG, getDefaultSiteId } from "@/config/sites";

// Dynamic imports for canvas components (SSR incompatible)
const DesignCanvas = dynamic(
  () => import("@/components/design-studio/design-canvas"),
  { ssr: false },
);
const EditorToolbar = dynamic(
  () => import("@/components/design-studio/editor-toolbar"),
  { ssr: false },
);
const LayersPanel = dynamic(
  () => import("@/components/design-studio/layers-panel"),
  { ssr: false },
);
const PropertiesPanel = dynamic(
  () => import("@/components/design-studio/properties-panel"),
  { ssr: false },
);

// ─── Types ───────────────────────────────────────────────────────

interface TemplateSummary {
  id: string;
  name: string;
  nameAr: string;
  category: string;
  format: string;
  siteId: string;
  pageCount: number;
  elementCount: number;
}

interface BrandInfo {
  siteId: string;
  siteName: string;
  colors: Record<string, string>;
  fonts: Record<string, string>;
}

interface DesignAnalysis {
  layout: { type: string; headerPosition: string; textDensity: string; imageRatio: number };
  colors: Record<string, string>;
  typography: { headingStyle: string; headingSize: string; bodySize: string; alignment: string };
  elements: Record<string, boolean | number>;
  mood: string;
  format: string;
}

interface MediaAsset {
  id: string;
  filename: string;
  original_name: string;
  url: string;
  file_type: string;
  mime_type: string;
  file_size: number;
  width?: number;
  height?: number;
  alt_text?: string;
  title?: string;
  tags: string[];
  site_id?: string;
  category?: string;
  folder?: string;
  created_at: string;
}

interface PoolStats {
  total: number;
  byCategory: Record<string, number>;
  byType: Record<string, number>;
  enriched: number;
  pending: number;
  totalSize: number;
}

// ─── Constants ───────────────────────────────────────────────────

const SITES = Object.values(SITE_CONFIG).map((s) => ({ id: s.id, name: s.name }));

const CATEGORIES = [
  "travel-guide", "social-post", "flyer", "menu",
  "itinerary", "infographic", "poster", "brochure",
];

const ASSET_CATEGORIES = [
  "hero", "blog", "gallery", "social",
  "background", "logo", "icon", "product",
];

const TAB_DEFS = [
  { id: "templates", label: "Templates" },
  { id: "editor", label: "Editor" },
  { id: "similar-design", label: "Similar Design" },
  { id: "media-pool", label: "Media Pool" },
  { id: "preview", label: "Preview" },
];

// ─── Main Component ──────────────────────────────────────────────

export default function DesignStudioPage() {
  const [activeSite, setActiveSite] = useState(getDefaultSiteId());
  const [activeTab, setActiveTab] = useState("templates");

  // Shared editor state
  const [editorTemplate, setEditorTemplate] = useState<DesignTemplate | null>(null);
  const [canvasState, setCanvasState] = useState<CanvasState | null>(null);
  const [selectedElement, setSelectedElement] = useState<DesignElement | null>(null);
  const actionsRef = useRef<CanvasActions | null>(null);

  const openInEditor = (template: DesignTemplate) => {
    setEditorTemplate(template);
    setActiveTab("editor");
  };

  // Mobile detection — canvas editor needs a desktop screen
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (isMobile) {
    return (
      <div className="admin-page p-4">
        <AdminPageHeader
          title="Design Studio"
          subtitle="Visual canvas editor"
        />
        <AdminCard className="p-6">
          <div className="text-center space-y-4">
            <div
              className="mx-auto w-16 h-16 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "rgba(59,126,161,0.08)" }}
            >
              <PenTool size={28} color="#3B7EA1" />
            </div>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: 18,
                color: "#1C1917",
              }}
            >
              Desktop Required
            </h2>
            <p
              style={{
                fontFamily: "var(--font-system)",
                fontSize: 13,
                color: "#78716C",
                maxWidth: 320,
                margin: "0 auto",
                lineHeight: 1.5,
              }}
            >
              The Design Studio uses a visual canvas that needs a larger screen.
              Open this page on a laptop or desktop to design graphics.
            </p>
            <div className="pt-2 space-y-2">
              <AdminButton
                variant="primary"
                size="sm"
                className="w-full"
                onClick={() => window.location.href = "/admin/email-campaigns"}
              >
                <Mail size={13} />
                Email Templates (works on mobile)
              </AdminButton>
              <AdminButton
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => window.location.href = "/admin/design"}
              >
                <FolderOpen size={13} />
                Back to Design Hub
              </AdminButton>
            </div>
          </div>
        </AdminCard>
      </div>
    );
  }

  return (
    <div className="admin-page p-4 md:p-6">
      <AdminPageHeader
        title="Design Studio"
        subtitle="Brand-aware templates, AI design analysis, and visual editor"
        action={
          <select
            className="admin-select"
            value={activeSite}
            onChange={(e) => setActiveSite(e.target.value)}
          >
            {SITES.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>
        }
      />

      <div className="space-y-5">
        <AdminTabs
          tabs={TAB_DEFS}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {activeTab === "templates" && (
          <TemplatesTab siteId={activeSite} onOpenInEditor={openInEditor} />
        )}

        {activeTab === "editor" && (
          <VisualEditorTab
            template={editorTemplate}
            siteId={activeSite}
            canvasState={canvasState}
            selectedElement={selectedElement}
            actionsRef={actionsRef}
            onCanvasStateChange={setCanvasState}
            onElementSelect={setSelectedElement}
            onSetTemplate={setEditorTemplate}
          />
        )}

        {activeTab === "similar-design" && (
          <SimilarDesignTab siteId={activeSite} onOpenInEditor={openInEditor} />
        )}

        {activeTab === "media-pool" && (
          <MediaPoolTab siteId={activeSite} />
        )}

        {activeTab === "preview" && (
          <PreviewTab canvasState={canvasState} actions={actionsRef.current} />
        )}
      </div>
    </div>
  );
}

// ─── Templates Tab ───────────────────────────────────────────────

function TemplatesTab({
  siteId,
  onOpenInEditor,
}: {
  siteId: string;
  onOpenInEditor?: (template: DesignTemplate) => void;
}) {
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [brand, setBrand] = useState<BrandInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ siteId });
      if (selectedCategory !== "all") params.set("category", selectedCategory);

      const res = await fetch(`/api/admin/design-studio?${params}`);
      const data = await res.json();
      if (data.success) {
        setTemplates(data.templates);
        setBrand(data.brand);
      } else {
        toast.error(data.error || "Failed to load templates");
      }
    } catch {
      toast.error("Network error loading templates");
    } finally {
      setLoading(false);
    }
  }, [siteId, selectedCategory]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const generateTemplate = async (category: string, openEditor = false) => {
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/design-studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, category }),
      });
      const data = await res.json();
      if (data.success) {
        setGeneratedHtml(data.html);
        if (openEditor && onOpenInEditor) {
          onOpenInEditor(data.template);
          toast.success(`Opened ${category} template in editor`);
        } else {
          toast.success(`Generated ${category} template`);
        }
      } else {
        toast.error(data.error || "Generation failed");
      }
    } catch {
      toast.error("Failed to generate template");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Brand Colors Bar */}
      {brand && (
        <AdminCard>
          <div className="flex items-center gap-4 flex-wrap">
            <span
              style={{
                fontFamily: 'var(--font-system)',
                fontSize: 11,
                fontWeight: 600,
                color: '#44403C',
                textTransform: 'uppercase' as const,
                letterSpacing: '0.5px',
              }}
            >
              {brand.siteName} Brand:
            </span>
            {Object.entries(brand.colors).map(([name, hex]) => (
              <div key={name} className="flex items-center gap-1.5">
                <div
                  className="w-6 h-6 rounded"
                  style={{ backgroundColor: hex, border: '1px solid rgba(214,208,196,0.6)' }}
                />
                <span
                  style={{
                    fontFamily: 'var(--font-system)',
                    fontSize: 10,
                    color: '#78716C',
                  }}
                >
                  {name}
                </span>
              </div>
            ))}
            <span
              style={{
                fontFamily: 'var(--font-system)',
                fontSize: 10,
                color: '#78716C',
                marginLeft: 8,
              }}
            >
              Fonts: {brand.fonts.heading} / {brand.fonts.body}
            </span>
          </div>
        </AdminCard>
      )}

      {/* Category Filter */}
      <div className="flex gap-1.5 flex-wrap">
        <button
          className={`admin-filter-pill ${selectedCategory === "all" ? "active" : ""}`}
          onClick={() => setSelectedCategory("all")}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`admin-filter-pill ${selectedCategory === cat ? "active" : ""}`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat.replace("-", " ")}
          </button>
        ))}
      </div>

      {/* Template Grid */}
      {loading ? (
        <AdminLoadingState label="Loading templates..." />
      ) : templates.length === 0 ? (
        <AdminEmptyState
          icon={Layout}
          title="No templates found"
          description="Try selecting a different category or generating a new template."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {templates.map((template) => (
            <AdminCard key={template.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <AdminStatusBadge status="active" label={template.category.replace("-", " ")} />
                <AdminStatusBadge status="inactive" label={template.format} />
              </div>
              <p
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: 14,
                  color: '#1C1917',
                  marginTop: 8,
                }}
              >
                {template.name}
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-system)',
                  fontSize: 11,
                  color: '#78716C',
                  marginTop: 2,
                }}
              >
                {template.nameAr}
              </p>
              <div
                className="flex items-center justify-between mt-3 mb-3"
                style={{
                  fontFamily: 'var(--font-system)',
                  fontSize: 10,
                  color: '#A8A29E',
                }}
              >
                <span>{template.pageCount} page{template.pageCount > 1 ? "s" : ""}</span>
                <span>{template.elementCount} elements</span>
              </div>
              <div className="flex gap-2">
                <AdminButton
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={() => generateTemplate(template.category)}
                  disabled={generating}
                >
                  <Eye className="w-3 h-3" />
                  Preview
                </AdminButton>
                <AdminButton
                  variant="primary"
                  size="sm"
                  className="flex-1"
                  onClick={() => generateTemplate(template.category, true)}
                  loading={generating}
                  disabled={generating}
                >
                  <PenTool className="w-3 h-3" />
                  Edit
                </AdminButton>
              </div>
            </AdminCard>
          ))}
        </div>
      )}

      {/* Generated HTML Preview */}
      {generatedHtml && (
        <AdminCard>
          <AdminSectionLabel>Template Preview</AdminSectionLabel>
          <div
            className="rounded-lg overflow-auto max-h-[600px] bg-white"
            style={{ border: '1px solid rgba(214,208,196,0.6)' }}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(generatedHtml || '') }}
          />
        </AdminCard>
      )}
    </div>
  );
}

// ─── Similar Design Tab ──────────────────────────────────────────

function SimilarDesignTab({
  siteId,
  onOpenInEditor,
}: {
  siteId: string;
  onOpenInEditor?: (template: DesignTemplate) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<DesignAnalysis | null>(null);
  const [resultHtml, setResultHtml] = useState<string | null>(null);
  const [resultTemplate, setResultTemplate] = useState<DesignTemplate | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [locale, setLocale] = useState<"en" | "ar">("en");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setAnalysis(null);
    setResultHtml(null);

    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith("image/")) {
      setFile(droppedFile);
      setAnalysis(null);
      setResultHtml(null);

      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(droppedFile);
    }
  };

  const analyzeDesign = async () => {
    if (!file) return;
    setAnalyzing(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("siteId", siteId);
      formData.append("locale", locale);

      const res = await fetch("/api/admin/design-studio/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setAnalysis(data.analysis);
        setResultHtml(data.html);
        setResultTemplate(data.template);
        toast.success("Design analyzed and adapted!");
      } else {
        toast.error(data.error || "Analysis failed");
      }
    } catch {
      toast.error("Failed to analyze design");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-4">
      <AdminCard accent accentColor="gold">
        <div className="flex items-center gap-2 mb-1">
          <Wand2 className="w-5 h-5" style={{ color: '#C49A2A' }} />
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 16,
              color: '#1C1917',
            }}
          >
            Give Me Similar Design
          </span>
        </div>
        <p
          style={{
            fontFamily: 'var(--font-system)',
            fontSize: 12,
            color: '#78716C',
            marginBottom: 16,
          }}
        >
          Upload a reference design. AI will analyze it and generate a brand-adapted
          editable template for {SITES.find((s) => s.id === siteId)?.name}.
        </p>

        <div className="space-y-4">
          <div>
            <label
              style={{
                fontFamily: 'var(--font-system)',
                fontSize: 10,
                fontWeight: 600,
                textTransform: 'uppercase' as const,
                letterSpacing: '1.5px',
                color: '#78716C',
                display: 'block',
                marginBottom: 6,
              }}
            >
              Language
            </label>
            <select
              className="admin-select"
              value={locale}
              onChange={(e) => setLocale(e.target.value as "en" | "ar")}
            >
              <option value="en">English (LTR)</option>
              <option value="ar">Arabic (RTL)</option>
            </select>
          </div>

          {/* Drop Zone */}
          <div
            className="rounded-xl p-8 text-center cursor-pointer transition-colors"
            style={{
              border: '2px dashed rgba(214,208,196,0.8)',
              backgroundColor: '#FAF8F4',
            }}
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
            {preview ? (
              <div className="space-y-2">
                <NextImage
                  src={preview}
                  alt="Reference design"
                  width={0}
                  height={0}
                  sizes="100vw"
                  className="max-h-64 mx-auto rounded-lg shadow"
                  style={{ width: 'auto', height: 'auto', maxHeight: '16rem' }}
                  unoptimized
                />
                <p
                  style={{
                    fontFamily: 'var(--font-system)',
                    fontSize: 11,
                    color: '#78716C',
                  }}
                >
                  {file?.name}
                </p>
              </div>
            ) : (
              <>
                <Upload className="w-10 h-10 mx-auto mb-3" style={{ color: '#A8A29E' }} />
                <p
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 600,
                    fontSize: 14,
                    color: '#44403C',
                  }}
                >
                  Drop a reference design here
                </p>
                <p
                  style={{
                    fontFamily: 'var(--font-system)',
                    fontSize: 11,
                    color: '#78716C',
                    marginTop: 4,
                  }}
                >
                  PNG, JPG, or WebP up to 10MB
                </p>
              </>
            )}
          </div>

          <AdminButton
            variant="primary"
            className="w-full justify-center"
            onClick={analyzeDesign}
            disabled={!file || analyzing}
            loading={analyzing}
          >
            {analyzing ? (
              "Analyzing with AI Vision..."
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Analyze & Generate Similar Design
              </>
            )}
          </AdminButton>
        </div>
      </AdminCard>

      {/* Analysis Results */}
      {analysis && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <AdminCard>
            <AdminSectionLabel>Design Analysis</AdminSectionLabel>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div style={{ fontFamily: 'var(--font-system)', fontSize: 12 }}>
                  <span style={{ color: '#78716C' }}>Layout:</span>{" "}
                  <AdminStatusBadge status="inactive" label={analysis.layout.type} />
                </div>
                <div style={{ fontFamily: 'var(--font-system)', fontSize: 12 }}>
                  <span style={{ color: '#78716C' }}>Mood:</span>{" "}
                  <AdminStatusBadge status="active" label={analysis.mood} />
                </div>
                <div style={{ fontFamily: 'var(--font-system)', fontSize: 12 }}>
                  <span style={{ color: '#78716C' }}>Format:</span>{" "}
                  <AdminStatusBadge status="inactive" label={analysis.format} />
                </div>
                <div style={{ fontFamily: 'var(--font-system)', fontSize: 12 }}>
                  <span style={{ color: '#78716C' }}>Text density:</span>{" "}
                  <AdminStatusBadge status="inactive" label={analysis.layout.textDensity} />
                </div>
                <div style={{ fontFamily: 'var(--font-system)', fontSize: 12, color: '#44403C' }}>
                  <span style={{ color: '#78716C' }}>Heading:</span>{" "}
                  {analysis.typography.headingStyle} / {analysis.typography.headingSize}
                </div>
                <div style={{ fontFamily: 'var(--font-system)', fontSize: 12, color: '#44403C' }}>
                  <span style={{ color: '#78716C' }}>Image ratio:</span>{" "}
                  {analysis.layout.imageRatio}%
                </div>
              </div>

              {/* Detected Colors */}
              <div>
                <span
                  style={{
                    fontFamily: 'var(--font-system)',
                    fontSize: 10,
                    fontWeight: 600,
                    textTransform: 'uppercase' as const,
                    letterSpacing: '1.5px',
                    color: '#78716C',
                  }}
                >
                  Detected Colors
                </span>
                <div className="flex gap-2 mt-2">
                  {Object.entries(analysis.colors).map(([name, hex]) => (
                    <div key={name} className="text-center">
                      <div
                        className="w-8 h-8 rounded"
                        style={{ backgroundColor: hex, border: '1px solid rgba(214,208,196,0.6)' }}
                      />
                      <span
                        style={{
                          fontFamily: 'var(--font-system)',
                          fontSize: 9,
                          color: '#78716C',
                        }}
                      >
                        {name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Detected Elements */}
              <div>
                <span
                  style={{
                    fontFamily: 'var(--font-system)',
                    fontSize: 10,
                    fontWeight: 600,
                    textTransform: 'uppercase' as const,
                    letterSpacing: '1.5px',
                    color: '#78716C',
                  }}
                >
                  Elements
                </span>
                <div className="flex gap-1 flex-wrap mt-2">
                  {Object.entries(analysis.elements)
                    .filter(([, v]) => v === true)
                    .map(([key]) => (
                      <AdminStatusBadge key={key} status="active" label={key.replace("has", "")} />
                    ))}
                </div>
              </div>
            </div>
          </AdminCard>

          {/* Generated Preview */}
          {resultHtml && (
            <AdminCard>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4" style={{ color: '#3B7EA1' }} />
                  <AdminSectionLabel>Brand-Adapted Design</AdminSectionLabel>
                </div>
                {resultTemplate && onOpenInEditor && (
                  <AdminButton
                    size="sm"
                    variant="primary"
                    onClick={() => onOpenInEditor(resultTemplate)}
                  >
                    <PenTool className="w-3 h-3" />
                    Edit in Studio
                  </AdminButton>
                )}
              </div>
              <div
                className="rounded-lg overflow-auto max-h-[500px] bg-white"
                style={{ border: '1px solid rgba(214,208,196,0.6)' }}
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(resultHtml || '') }}
              />
            </AdminCard>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Media Pool Tab ──────────────────────────────────────────────

function MediaPoolTab({ siteId }: { siteId: string }) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [stats, setStats] = useState<PoolStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { confirm, ConfirmDialog } = useConfirm();

  const loadAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ siteId, limit: "24", offset: String(page * 24) });
      if (filterCategory !== "all") params.set("category", filterCategory);
      if (searchQuery) params.set("search", searchQuery);

      const res = await fetch(`/api/admin/design-studio/media-pool?${params}`);
      const data = await res.json();
      if (data.success) {
        setAssets(data.assets);
        setTotal(data.total);
      }
    } catch {
      toast.error("Failed to load media pool");
    } finally {
      setLoading(false);
    }
  }, [siteId, filterCategory, searchQuery, page]);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/admin/design-studio/media-pool?siteId=${siteId}&stats=true`,
      );
      const data = await res.json();
      if (data.success) setStats(data.stats);
    } catch { /* ignore */ }
  }, [siteId]);

  useEffect(() => {
    loadAssets();
    loadStats();
  }, [loadAssets, loadStats]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);

    let uploaded = 0;
    for (const file of Array.from(files)) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("siteId", siteId);
        formData.append("enrichWithAI", "true");

        const res = await fetch("/api/admin/design-studio/media-pool", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (data.success) uploaded++;
      } catch { /* continue with next file */ }
    }

    toast.success(`Uploaded ${uploaded} of ${files.length} files with AI analysis`);
    setUploading(false);
    loadAssets();
    loadStats();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleBulkEnrich = async () => {
    setEnriching(true);
    try {
      const res = await fetch("/api/admin/design-studio/media-pool", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, limit: 10 }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          `Enriched: ${data.succeeded} succeeded, ${data.failed} failed out of ${data.processed}`,
        );
        loadAssets();
        loadStats();
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error("Bulk enrichment failed");
    } finally {
      setEnriching(false);
    }
  };

  const handleDelete = async (assetId: string) => {
    const ok = await confirm({ title: "Delete Asset", message: "Delete this asset?", variant: "danger" });
    if (!ok) return;
    try {
      const res = await fetch("/api/admin/design-studio/media-pool", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Asset deleted");
        loadAssets();
        loadStats();
      }
    } catch {
      toast.error("Delete failed");
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <AdminKPICard value={stats.total} label="Total Assets" color="#1C1917" />
          <AdminKPICard value={stats.enriched} label="AI Enriched" color="#2D5A3D" />
          <AdminKPICard value={stats.pending} label="Pending" color="#C49A2A" />
          <AdminKPICard value={formatSize(stats.totalSize)} label="Total Size" color="#3B7EA1" />
          <AdminKPICard value={Object.keys(stats.byCategory).length} label="Categories" color="#1C1917" />
        </div>
      )}

      {/* Actions Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <AdminButton
          variant="primary"
          onClick={() => fileInputRef.current?.click()}
          loading={uploading}
          disabled={uploading}
        >
          <Upload className="w-4 h-4" />
          Upload Media
        </AdminButton>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={handleUpload}
        />

        <AdminButton
          variant="secondary"
          onClick={handleBulkEnrich}
          loading={enriching}
          disabled={enriching}
        >
          <Sparkles className="w-4 h-4" />
          AI Enrich Pending
        </AdminButton>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2" style={{ color: '#A8A29E' }} />
            <input
              className="admin-input pl-8 w-48"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            className="admin-select"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            {ASSET_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <AdminButton
            variant="ghost"
            size="sm"
            onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
          >
            {viewMode === "grid" ? <List className="w-4 h-4" /> : <Grid3X3 className="w-4 h-4" />}
          </AdminButton>
        </div>
      </div>

      {/* Asset Grid/List */}
      {loading ? (
        <AdminLoadingState label="Loading assets..." />
      ) : assets.length === 0 ? (
        <AdminEmptyState
          icon={FolderOpen}
          title="No media assets yet"
          description="Upload files to get started."
          action={
            <AdminButton variant="primary" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-4 h-4" />
              Upload Files
            </AdminButton>
          }
        />
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {assets.map((asset) => (
            <AdminCard key={asset.id} className="group overflow-hidden !p-0">
              <div className="aspect-square relative" style={{ backgroundColor: '#FAF8F4' }}>
                {asset.file_type === "image" ? (
                  <NextImage
                    src={asset.url}
                    alt={asset.alt_text || asset.original_name}
                    width={0}
                    height={0}
                    sizes="100vw"
                    className="w-full h-full object-cover"
                    style={{ width: '100%', height: '100%' }}
                    unoptimized
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <ImageIcon className="w-8 h-8" style={{ color: '#A8A29E' }} />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <AdminButton
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(asset.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </AdminButton>
                </div>
                {asset.category && (
                  <span className="absolute top-1 left-1">
                    <AdminStatusBadge status="active" label={asset.category} />
                  </span>
                )}
              </div>
              <div className="p-2">
                <p
                  className="truncate"
                  style={{
                    fontFamily: 'var(--font-system)',
                    fontSize: 11,
                    color: '#1C1917',
                  }}
                >
                  {asset.original_name}
                </p>
                <p
                  style={{
                    fontFamily: 'var(--font-system)',
                    fontSize: 10,
                    color: '#A8A29E',
                  }}
                >
                  {formatSize(asset.file_size)}
                  {asset.width && ` - ${asset.width}x${asset.height}`}
                </p>
                {asset.tags.length > 0 && (
                  <div className="flex gap-0.5 flex-wrap mt-1">
                    {asset.tags.slice(0, 3).map((tag) => (
                      <AdminStatusBadge key={tag} status="inactive" label={tag} />
                    ))}
                  </div>
                )}
              </div>
            </AdminCard>
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-stone-50 transition-colors"
            >
              <div
                className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0"
                style={{ backgroundColor: '#FAF8F4' }}
              >
                {asset.file_type === "image" ? (
                  <NextImage
                    src={asset.url}
                    alt={asset.alt_text || ""}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <ImageIcon className="w-5 h-5" style={{ color: '#A8A29E' }} />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="truncate"
                  style={{
                    fontFamily: 'var(--font-system)',
                    fontSize: 12,
                    color: '#1C1917',
                  }}
                >
                  {asset.original_name}
                </p>
                <p
                  style={{
                    fontFamily: 'var(--font-system)',
                    fontSize: 10,
                    color: '#A8A29E',
                  }}
                >
                  {formatSize(asset.file_size)}
                  {asset.width && ` - ${asset.width}x${asset.height}`}
                  {asset.category && ` - ${asset.category}`}
                </p>
              </div>
              <div className="flex gap-1">
                {asset.tags.slice(0, 2).map((tag) => (
                  <AdminStatusBadge key={tag} status="inactive" label={tag} />
                ))}
              </div>
              <AdminButton
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(asset.id)}
              >
                <Trash2 className="w-4 h-4" />
              </AdminButton>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > 24 && (
        <div className="flex items-center justify-center gap-2">
          <AdminButton
            variant="secondary"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </AdminButton>
          <span
            style={{
              fontFamily: 'var(--font-system)',
              fontSize: 11,
              color: '#78716C',
            }}
          >
            Page {page + 1} of {Math.ceil(total / 24)}
          </span>
          <AdminButton
            variant="secondary"
            size="sm"
            disabled={(page + 1) * 24 >= total}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </AdminButton>
        </div>
      )}
      <ConfirmDialog />
    </div>
  );
}

// ─── Visual Editor Tab ───────────────────────────────────────────

function VisualEditorTab({
  template,
  siteId,
  canvasState,
  selectedElement,
  actionsRef,
  onCanvasStateChange,
  onElementSelect,
  onSetTemplate,
}: {
  template: DesignTemplate | null;
  siteId: string;
  canvasState: CanvasState | null;
  selectedElement: DesignElement | null;
  actionsRef: React.MutableRefObject<CanvasActions | null>;
  onCanvasStateChange: (state: CanvasState) => void;
  onElementSelect: (element: DesignElement | null) => void;
  onSetTemplate: (template: DesignTemplate) => void;
}) {
  const [generating, setGenerating] = useState(false);

  const quickGenerate = async (category: string) => {
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/design-studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, category }),
      });
      const data = await res.json();
      if (data.success) {
        onSetTemplate(data.template);
        toast.success(`Loaded ${category} template`);
      }
    } catch {
      toast.error("Failed to generate template");
    } finally {
      setGenerating(false);
    }
  };

  if (!template) {
    return (
      <AdminEmptyState
        icon={PenTool}
        title="Visual Design Editor"
        description="Select a template from the Templates tab, or generate one now to start editing."
        action={
          <div className="flex gap-2 flex-wrap justify-center">
            {CATEGORIES.slice(0, 4).map((cat) => (
              <AdminButton
                key={cat}
                variant="secondary"
                size="sm"
                onClick={() => quickGenerate(cat)}
                loading={generating}
                disabled={generating}
              >
                <Palette className="w-3 h-3" />
                {cat.replace("-", " ")}
              </AdminButton>
            ))}
          </div>
        }
      />
    );
  }

  return (
    <div className="space-y-0">
      {/* Toolbar */}
      <EditorToolbar
        state={canvasState}
        actions={actionsRef.current}
        selectedElement={selectedElement}
      />

      {/* Main editor area: layers | canvas | properties */}
      <div
        className="flex gap-0 rounded-b-xl overflow-hidden"
        style={{ minHeight: 600, border: '1px solid rgba(214,208,196,0.6)', borderTop: 'none' }}
      >
        {/* Left: Layers */}
        <div className="w-48 overflow-y-auto" style={{ maxHeight: 700, borderRight: '1px solid rgba(214,208,196,0.6)', backgroundColor: '#FAF8F4' }}>
          <div
            className="px-2 py-2"
            style={{
              fontFamily: 'var(--font-system)',
              fontSize: 10,
              fontWeight: 600,
              textTransform: 'uppercase' as const,
              letterSpacing: '1.5px',
              color: '#78716C',
              borderBottom: '1px solid rgba(214,208,196,0.6)',
              backgroundColor: '#FFFFFF',
            }}
          >
            Layers
          </div>
          <LayersPanel state={canvasState} actions={actionsRef.current} />
        </div>

        {/* Center: Canvas */}
        <div className="flex-1 overflow-auto flex items-start justify-center p-4" style={{ backgroundColor: '#F5F3EF' }}>
          <DesignCanvas
            template={template}
            locale="en"
            onStateChange={onCanvasStateChange}
            onElementSelect={onElementSelect}
            actionsRef={actionsRef}
          />
        </div>

        {/* Right: Properties */}
        <div className="w-56 overflow-y-auto" style={{ maxHeight: 700, borderLeft: '1px solid rgba(214,208,196,0.6)', backgroundColor: '#FAF8F4' }}>
          <div
            className="px-2 py-2"
            style={{
              fontFamily: 'var(--font-system)',
              fontSize: 10,
              fontWeight: 600,
              textTransform: 'uppercase' as const,
              letterSpacing: '1.5px',
              color: '#78716C',
              borderBottom: '1px solid rgba(214,208,196,0.6)',
              backgroundColor: '#FFFFFF',
            }}
          >
            Properties
          </div>
          <PropertiesPanel
            element={selectedElement}
            actions={actionsRef.current}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Preview Tab ─────────────────────────────────────────────────

function PreviewTab({
  canvasState,
  actions,
}: {
  canvasState?: CanvasState | null;
  actions?: CanvasActions | null;
}) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!actions) return;
    setExporting(true);
    try {
      const dataUrl = await actions.exportToPng();
      if (dataUrl) {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `design-${Date.now()}.png`;
        a.click();
        toast.success("Design exported as PNG");
      }
    } finally {
      setExporting(false);
    }
  };

  if (!canvasState?.template) {
    return (
      <AdminEmptyState
        icon={Eye}
        title="Design Preview"
        description="Open a template in the Editor tab first. The live preview and export options will appear here."
      />
    );
  }

  return (
    <div className="space-y-4">
      <AdminCard>
        <div className="flex items-center justify-between mb-4">
          <AdminSectionLabel>Current Design</AdminSectionLabel>
          <AdminButton
            size="sm"
            variant="primary"
            onClick={handleExport}
            loading={exporting}
            disabled={exporting}
          >
            <Download className="w-3 h-3" />
            Export PNG
          </AdminButton>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: "Template", value: canvasState.template.name },
            { label: "Format", value: canvasState.template.format },
            { label: "Pages", value: String(canvasState.template.pages.length) },
            { label: "Elements", value: String(canvasState.template.pages[canvasState.activePage]?.elements.length || 0) },
            { label: "Zoom", value: `${Math.round(canvasState.zoom * 100)}%` },
            { label: "History", value: `${canvasState.historyIndex + 1} / ${canvasState.history.length}` },
          ].map((item) => (
            <div key={item.label}>
              <span
                style={{
                  fontFamily: 'var(--font-system)',
                  fontSize: 10,
                  color: '#78716C',
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.5px',
                }}
              >
                {item.label}
              </span>
              <p
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#1C1917',
                  marginTop: 2,
                }}
              >
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </AdminCard>

      {/* Template JSON (for debugging/export) */}
      <AdminCard>
        <AdminSectionLabel>Template JSON</AdminSectionLabel>
        <pre
          className="text-xs rounded-lg max-h-96 overflow-auto p-3"
          style={{
            backgroundColor: '#FAF8F4',
            border: '1px solid rgba(214,208,196,0.6)',
            fontFamily: 'var(--font-system)',
            fontSize: 10,
            color: '#44403C',
          }}
        >
          {JSON.stringify(canvasState.template, null, 2)}
        </pre>
      </AdminCard>
    </div>
  );
}
