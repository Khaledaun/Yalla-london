"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import NextImage from "next/image";
import { sanitizeHtml } from "@/lib/html-sanitizer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Design Studio</h1>
          <p className="text-muted-foreground">
            Brand-aware templates, AI design analysis, and visual editor
          </p>
        </div>
        <Select value={activeSite} onValueChange={setActiveSite}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select site" />
          </SelectTrigger>
          <SelectContent>
            {SITES.map((site) => (
              <SelectItem key={site.id} value={site.id}>
                {site.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="templates">
            <Layout className="w-4 h-4 mr-2" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="editor">
            <PenTool className="w-4 h-4 mr-2" />
            Editor
          </TabsTrigger>
          <TabsTrigger value="similar-design">
            <Wand2 className="w-4 h-4 mr-2" />
            Similar Design
          </TabsTrigger>
          <TabsTrigger value="media-pool">
            <FolderOpen className="w-4 h-4 mr-2" />
            Media Pool
          </TabsTrigger>
          <TabsTrigger value="preview">
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates">
          <TemplatesTab siteId={activeSite} onOpenInEditor={openInEditor} />
        </TabsContent>

        <TabsContent value="editor">
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
        </TabsContent>

        <TabsContent value="similar-design">
          <SimilarDesignTab siteId={activeSite} onOpenInEditor={openInEditor} />
        </TabsContent>

        <TabsContent value="media-pool">
          <MediaPoolTab siteId={activeSite} />
        </TabsContent>

        <TabsContent value="preview">
          <PreviewTab canvasState={canvasState} actions={actionsRef.current} />
        </TabsContent>
      </Tabs>
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
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">{brand.siteName} Brand:</span>
              {Object.entries(brand.colors).map(([name, hex]) => (
                <div key={name} className="flex items-center gap-1">
                  <div
                    className="w-6 h-6 rounded border"
                    style={{ backgroundColor: hex }}
                  />
                  <span className="text-xs text-muted-foreground">{name}</span>
                </div>
              ))}
              <span className="text-xs text-muted-foreground ml-4">
                Fonts: {brand.fonts.heading} / {brand.fonts.body}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={selectedCategory === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedCategory("all")}
        >
          All
        </Button>
        {CATEGORIES.map((cat) => (
          <Button
            key={cat}
            variant={selectedCategory === cat ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(cat)}
          >
            {cat.replace("-", " ")}
          </Button>
        ))}
      </div>

      {/* Template Grid */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
          Loading templates...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {templates.map((template) => (
            <Card
              key={template.id}
              className="cursor-pointer hover:border-primary transition-colors"
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs">
                    {template.category.replace("-", " ")}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {template.format}
                  </Badge>
                </div>
                <CardTitle className="text-sm mt-2">{template.name}</CardTitle>
                <p className="text-xs text-muted-foreground">{template.nameAr}</p>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                  <span>{template.pageCount} page{template.pageCount > 1 ? "s" : ""}</span>
                  <span>{template.elementCount} elements</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    size="sm"
                    variant="outline"
                    onClick={() => generateTemplate(template.category)}
                    disabled={generating}
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    Preview
                  </Button>
                  <Button
                    className="flex-1"
                    size="sm"
                    onClick={() => generateTemplate(template.category, true)}
                    disabled={generating}
                  >
                    {generating ? (
                      <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                    ) : (
                      <PenTool className="w-3 h-3 mr-1" />
                    )}
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Generated HTML Preview */}
      {generatedHtml && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Template Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="border rounded-lg overflow-auto max-h-[600px] bg-white"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(generatedHtml || '') }}
            />
          </CardContent>
        </Card>
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5" />
            Give Me Similar Design
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Upload a reference design. AI will analyze it and generate a brand-adapted
            editable template for {SITES.find((s) => s.id === siteId)?.name}.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label>Language</Label>
              <Select value={locale} onValueChange={(v) => setLocale(v as "en" | "ar")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English (LTR)</SelectItem>
                  <SelectItem value="ar">Arabic (RTL)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Drop Zone */}
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
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
                <p className="text-sm text-muted-foreground">{file?.name}</p>
              </div>
            ) : (
              <>
                <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                <p className="font-medium">Drop a reference design here</p>
                <p className="text-sm text-muted-foreground">
                  PNG, JPG, or WebP up to 10MB
                </p>
              </>
            )}
          </div>

          <Button
            className="w-full"
            onClick={analyzeDesign}
            disabled={!file || analyzing}
          >
            {analyzing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                Analyzing with AI Vision...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Analyze & Generate Similar Design
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {analysis && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Design Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Layout:</span>{" "}
                  <Badge variant="outline">{analysis.layout.type}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Mood:</span>{" "}
                  <Badge variant="secondary">{analysis.mood}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Format:</span>{" "}
                  <Badge variant="outline">{analysis.format}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Text density:</span>{" "}
                  <Badge variant="outline">{analysis.layout.textDensity}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Heading:</span>{" "}
                  {analysis.typography.headingStyle} / {analysis.typography.headingSize}
                </div>
                <div>
                  <span className="text-muted-foreground">Image ratio:</span>{" "}
                  {analysis.layout.imageRatio}%
                </div>
              </div>

              {/* Detected Colors */}
              <div>
                <span className="text-sm text-muted-foreground">Detected Colors:</span>
                <div className="flex gap-2 mt-1">
                  {Object.entries(analysis.colors).map(([name, hex]) => (
                    <div key={name} className="text-center">
                      <div
                        className="w-8 h-8 rounded border"
                        style={{ backgroundColor: hex }}
                      />
                      <span className="text-[10px] text-muted-foreground">{name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Detected Elements */}
              <div>
                <span className="text-sm text-muted-foreground">Elements:</span>
                <div className="flex gap-1 flex-wrap mt-1">
                  {Object.entries(analysis.elements)
                    .filter(([, v]) => v === true)
                    .map(([key]) => (
                      <Badge key={key} variant="secondary" className="text-xs">
                        {key.replace("has", "")}
                      </Badge>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Generated Preview */}
          {resultHtml && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Brand-Adapted Design
                  </CardTitle>
                  {resultTemplate && onOpenInEditor && (
                    <Button
                      size="sm"
                      onClick={() => onOpenInEditor(resultTemplate)}
                    >
                      <PenTool className="w-3 h-3 mr-1" />
                      Edit in Studio
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div
                  className="border rounded-lg overflow-auto max-h-[500px] bg-white"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(resultHtml || '') }}
                />
              </CardContent>
            </Card>
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
    if (!confirm("Delete this asset?")) return;
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
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Total Assets</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-2xl font-bold">{stats.enriched}</div>
              <div className="text-xs text-muted-foreground">AI Enriched</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-2xl font-bold">{stats.pending}</div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-2xl font-bold">{formatSize(stats.totalSize)}</div>
              <div className="text-xs text-muted-foreground">Total Size</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-2xl font-bold">
                {Object.keys(stats.byCategory).length}
              </div>
              <div className="text-xs text-muted-foreground">Categories</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Actions Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          {uploading ? (
            <RefreshCw className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Upload className="w-4 h-4 mr-2" />
          )}
          Upload Media
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={handleUpload}
        />

        <Button variant="outline" onClick={handleBulkEnrich} disabled={enriching}>
          {enriching ? (
            <RefreshCw className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Sparkles className="w-4 h-4 mr-2" />
          )}
          AI Enrich Pending
        </Button>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-8 w-48"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-36">
              <Filter className="w-3 h-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {ASSET_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
          >
            {viewMode === "grid" ? <List className="w-4 h-4" /> : <Grid3X3 className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Asset Grid/List */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
          Loading assets...
        </div>
      ) : assets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FolderOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">
              No media assets yet. Upload files to get started.
            </p>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {assets.map((asset) => (
            <Card key={asset.id} className="group overflow-hidden">
              <div className="aspect-square bg-muted relative">
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
                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-white"
                    onClick={() => handleDelete(asset.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                {asset.category && (
                  <Badge
                    className="absolute top-1 left-1 text-[10px]"
                    variant="secondary"
                  >
                    {asset.category}
                  </Badge>
                )}
              </div>
              <CardContent className="p-2">
                <p className="text-xs truncate">{asset.original_name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {formatSize(asset.file_size)}
                  {asset.width && ` - ${asset.width}x${asset.height}`}
                </p>
                {asset.tags.length > 0 && (
                  <div className="flex gap-0.5 flex-wrap mt-1">
                    {asset.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-[9px] px-1 py-0">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="flex items-center gap-3 p-2 rounded hover:bg-muted"
            >
              <div className="w-12 h-12 rounded bg-muted overflow-hidden flex-shrink-0">
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
                    <ImageIcon className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{asset.original_name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatSize(asset.file_size)}
                  {asset.width && ` - ${asset.width}x${asset.height}`}
                  {asset.category && ` - ${asset.category}`}
                </p>
              </div>
              <div className="flex gap-1">
                {asset.tags.slice(0, 2).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleDelete(asset.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > 24 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {Math.ceil(total / 24)}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={(page + 1) * 24 >= total}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
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
      <Card>
        <CardContent className="py-12 text-center">
          <PenTool className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-lg font-medium">Visual Design Editor</p>
          <p className="text-sm text-muted-foreground mt-2 mb-6">
            Select a template from the Templates tab, or generate one now to start editing.
          </p>
          <div className="flex gap-2 flex-wrap justify-center">
            {CATEGORIES.slice(0, 4).map((cat) => (
              <Button
                key={cat}
                variant="outline"
                size="sm"
                onClick={() => quickGenerate(cat)}
                disabled={generating}
              >
                {generating ? (
                  <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                ) : (
                  <Palette className="w-3 h-3 mr-1" />
                )}
                {cat.replace("-", " ")}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
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
      <div className="flex gap-0 border rounded-b-lg overflow-hidden" style={{ minHeight: 600 }}>
        {/* Left: Layers */}
        <div className="w-48 border-r bg-gray-50 overflow-y-auto" style={{ maxHeight: 700 }}>
          <div className="px-2 py-2 text-xs font-medium text-muted-foreground border-b bg-white">
            Layers
          </div>
          <LayersPanel state={canvasState} actions={actionsRef.current} />
        </div>

        {/* Center: Canvas */}
        <div className="flex-1 bg-gray-100 overflow-auto flex items-start justify-center p-4">
          <DesignCanvas
            template={template}
            locale="en"
            onStateChange={onCanvasStateChange}
            onElementSelect={onElementSelect}
            actionsRef={actionsRef}
          />
        </div>

        {/* Right: Properties */}
        <div className="w-56 border-l bg-gray-50 overflow-y-auto" style={{ maxHeight: 700 }}>
          <div className="px-2 py-2 text-xs font-medium text-muted-foreground border-b bg-white">
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
      <Card>
        <CardContent className="py-12 text-center">
          <Eye className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-lg font-medium">Design Preview</p>
          <p className="text-sm text-muted-foreground mt-1">
            Open a template in the Editor tab first. The live preview and export
            options will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Current Design</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleExport} disabled={exporting}>
                {exporting ? (
                  <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                ) : (
                  <Download className="w-3 h-3 mr-1" />
                )}
                Export PNG
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Template:</span>{" "}
              {canvasState.template.name}
            </div>
            <div>
              <span className="text-muted-foreground">Format:</span>{" "}
              {canvasState.template.format}
            </div>
            <div>
              <span className="text-muted-foreground">Pages:</span>{" "}
              {canvasState.template.pages.length}
            </div>
            <div>
              <span className="text-muted-foreground">Elements:</span>{" "}
              {canvasState.template.pages[canvasState.activePage]?.elements.length || 0}
            </div>
            <div>
              <span className="text-muted-foreground">Zoom:</span>{" "}
              {Math.round(canvasState.zoom * 100)}%
            </div>
            <div>
              <span className="text-muted-foreground">History:</span>{" "}
              {canvasState.historyIndex + 1} / {canvasState.history.length}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Template JSON (for debugging/export) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Template JSON</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-muted p-3 rounded max-h-96 overflow-auto">
            {JSON.stringify(canvasState.template, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
