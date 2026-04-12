"use client";

import React, { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  AdminCard,
  AdminPageHeader,
  AdminSectionLabel,
  AdminStatusBadge,
  AdminButton,
  AdminLoadingState,
  AdminEmptyState,
  AdminAlertBanner,
  AdminTabs,
} from "@/components/admin/admin-ui";
import {
  Video,
  Play,
  Wand2,
  Download,
  Copy,
  RefreshCw,
  Settings2,
  Image as ImageIcon,
  Film,
  Sparkles,
  Clock,
  Monitor,
  Smartphone,
  Square,
} from "lucide-react";
import type {
  VideoTemplateConfig,
  VideoCategory,
  VideoFormat,
} from "@/lib/video/brand-video-engine";
import { SITES as SITE_CONFIG, getDefaultSiteId } from "@/config/sites";

// Dynamic import for Remotion player (SSR incompatible)
const VideoPlayer = dynamic(
  () => import("@/components/video-studio/video-player"),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-[500px] rounded-lg animate-pulse flex items-center justify-center"
        style={{ backgroundColor: "#FAF8F4", color: "#78716C" }}
      >
        Loading video player...
      </div>
    ),
  }
);

const SITES = Object.values(SITE_CONFIG).map((s) => ({
  id: s.id,
  name: s.name,
  destination: s.destination,
}));

const CATEGORIES: Array<{
  value: VideoCategory;
  label: string;
  icon: React.ReactNode;
  description: string;
}> = [
  { value: "destination-highlight", label: "Destination Highlight", icon: <Sparkles className="w-4 h-4" />, description: "Scenic showcase of the destination" },
  { value: "blog-promo", label: "Blog Promotion", icon: <Film className="w-4 h-4" />, description: "Promote a blog post or article" },
  { value: "hotel-showcase", label: "Hotel Showcase", icon: <Monitor className="w-4 h-4" />, description: "Feature a hotel or property" },
  { value: "restaurant-feature", label: "Restaurant Feature", icon: <Sparkles className="w-4 h-4" />, description: "Spotlight a restaurant or dining experience" },
  { value: "experience-promo", label: "Experience Promo", icon: <Play className="w-4 h-4" />, description: "Promote an activity or experience" },
  { value: "seasonal-campaign", label: "Seasonal Campaign", icon: <Clock className="w-4 h-4" />, description: "Ramadan, Eid, or seasonal offers" },
  { value: "listicle-countdown", label: "Listicle Countdown", icon: <Film className="w-4 h-4" />, description: "Top 5 countdown format" },
  { value: "travel-tip", label: "Travel Tip", icon: <Wand2 className="w-4 h-4" />, description: "Quick travel advice" },
  { value: "before-after", label: "Before & After", icon: <ImageIcon className="w-4 h-4" />, description: "Comparison or reveal" },
  { value: "testimonial", label: "Testimonial", icon: <Sparkles className="w-4 h-4" />, description: "Customer review or quote" },
];

const FORMATS: Array<{
  value: VideoFormat;
  label: string;
  icon: React.ReactNode;
  ratio: string;
}> = [
  { value: "instagram-reel", label: "Instagram Reel", icon: <Smartphone className="w-4 h-4" />, ratio: "9:16" },
  { value: "instagram-post", label: "Instagram Post", icon: <Square className="w-4 h-4" />, ratio: "1:1" },
  { value: "instagram-story", label: "Instagram Story", icon: <Smartphone className="w-4 h-4" />, ratio: "9:16" },
  { value: "youtube-short", label: "YouTube Short", icon: <Smartphone className="w-4 h-4" />, ratio: "9:16" },
  { value: "youtube-video", label: "YouTube Video", icon: <Monitor className="w-4 h-4" />, ratio: "16:9" },
  { value: "tiktok", label: "TikTok", icon: <Smartphone className="w-4 h-4" />, ratio: "9:16" },
  { value: "facebook-post", label: "Facebook Post", icon: <Monitor className="w-4 h-4" />, ratio: "~1.9:1" },
  { value: "twitter-post", label: "Twitter/X Post", icon: <Monitor className="w-4 h-4" />, ratio: "16:9" },
  { value: "landscape-wide", label: "Landscape Wide", icon: <Monitor className="w-4 h-4" />, ratio: "16:9" },
  { value: "square", label: "Square", icon: <Square className="w-4 h-4" />, ratio: "1:1" },
];

export default function VideoStudioPage() {
  const [activeTab, setActiveTab] = useState("create");
  const [selectedSite, setSelectedSite] = useState(getDefaultSiteId());
  const [selectedCategory, setSelectedCategory] = useState<VideoCategory>("destination-highlight");
  const [selectedFormat, setSelectedFormat] = useState<VideoFormat>("instagram-reel");
  const [locale, setLocale] = useState<"en" | "ar">("en");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [imageUrls, setImageUrls] = useState("");
  const [duration, setDuration] = useState("");
  const [generatedTemplate, setGeneratedTemplate] = useState<VideoTemplateConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Canva render state
  const [canvaLoading, setCanvaLoading] = useState(false);
  const [canvaResult, setCanvaResult] = useState<{
    status: "idle" | "queued" | "rendered" | "failed";
    query?: string;
    designType?: string;
    exportFormat?: string;
    instructions?: string;
    exportUrl?: string;
    canvaDesignId?: string;
    error?: string;
  }>({ status: "idle" });

  const generateVideo = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        action: "generate",
        siteId: selectedSite,
        category: selectedCategory,
        format: selectedFormat,
        locale,
      });
      if (title) params.set("title", title);
      if (subtitle) params.set("subtitle", subtitle);
      if (imageUrls) params.set("images", imageUrls);
      if (duration) params.set("duration", duration);

      const res = await fetch(`/api/admin/video-studio?${params}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Generation failed");
      }

      setGeneratedTemplate(data.template);
      setActiveTab("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [selectedSite, selectedCategory, selectedFormat, locale, title, subtitle, imageUrls, duration]);

  const copyTemplateJSON = useCallback(() => {
    if (generatedTemplate) {
      navigator.clipboard.writeText(JSON.stringify(generatedTemplate, null, 2));
    }
  }, [generatedTemplate]);

  /**
   * Save the current template as a VideoProject in DB, then prepare it
   * for Canva rendering. Returns the Canva query and instructions.
   */
  const saveAndRenderCanva = useCallback(async () => {
    setCanvaLoading(true);
    setCanvaResult({ status: "idle" });
    setError(null);
    try {
      // Step 1: Generate the template if not already generated
      let template = generatedTemplate;
      if (!template) {
        const params = new URLSearchParams({
          action: "generate",
          siteId: selectedSite,
          category: selectedCategory,
          format: selectedFormat,
          locale,
        });
        if (title) params.set("title", title);
        if (subtitle) params.set("subtitle", subtitle);
        if (imageUrls) params.set("images", imageUrls);
        if (duration) params.set("duration", duration);

        const genRes = await fetch(`/api/admin/video-studio?${params}`);
        if (!genRes.ok) throw new Error("Failed to generate template");
        const genData = await genRes.json();
        template = genData.template;
        setGeneratedTemplate(template);
      }

      if (!template) throw new Error("No template available");

      // Step 2: Create a VideoProject record in DB
      const createRes = await fetch("/api/admin/video-studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          siteId: selectedSite,
          title: title || template.name,
          category: selectedCategory,
          format: selectedFormat,
          locale,
          width: template.width,
          height: template.height,
          duration: Math.ceil(template.durationFrames / template.fps),
          fps: template.fps,
          scenes: template.scenes,
        }),
      });
      if (!createRes.ok) {
        const errData = await createRes.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to create video project");
      }
      const createData = await createRes.json();
      const projectId = createData.project?.id;
      if (!projectId) throw new Error("No project ID returned");

      // Step 3: Prepare for Canva render
      const renderRes = await fetch("/api/admin/video-studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "render-canva",
          videoProjectId: projectId,
        }),
      });
      if (!renderRes.ok) {
        const errData = await renderRes.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to prepare Canva render");
      }
      const renderData = await renderRes.json();

      setCanvaResult({
        status: "queued",
        query: renderData.query,
        designType: renderData.designType,
        exportFormat: renderData.exportFormat,
        instructions: renderData.instructions,
      });
      setActiveTab("preview");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
      setCanvaResult({ status: "failed", error: msg });
    } finally {
      setCanvaLoading(false);
    }
  }, [generatedTemplate, selectedSite, selectedCategory, selectedFormat, locale, title, subtitle, imageUrls, duration]);

  return (
    <div className="admin-page p-4 md:p-6">
      <AdminPageHeader
        title="Video Studio"
        subtitle="Create brand-aware social media designs — rendered via Canva"
        action={
          <div className="flex gap-2">
            <AdminStatusBadge status="active" label="Canva MCP" />
            <AdminStatusBadge status="inactive" label="Remotion" />
          </div>
        }
      />

      <AdminTabs
        tabs={[
          { id: "create", label: "Create" },
          { id: "preview", label: "Preview" },
          { id: "templates", label: "Templates" },
          { id: "settings", label: "Settings" },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className="mt-4">
        {/* ── Create Tab ────────────────────────────────── */}
        {activeTab === "create" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left: Config */}
            <div className="space-y-4">
              <AdminCard>
                <AdminSectionLabel>Video Configuration</AdminSectionLabel>
                <p style={{ fontFamily: "var(--font-system)", fontSize: 11, color: "#78716C", marginBottom: 16 }}>
                  Set up your brand video
                </p>
                <div className="space-y-4">
                  {/* Site */}
                  <div className="space-y-1.5">
                    <label style={{ fontFamily: "var(--font-system)", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", color: "#78716C" }}>
                      Brand / Site
                    </label>
                    <select
                      className="admin-select"
                      value={selectedSite}
                      onChange={(e) => setSelectedSite(e.target.value)}
                    >
                      {SITES.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} — {s.destination}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Category */}
                  <div className="space-y-1.5">
                    <label style={{ fontFamily: "var(--font-system)", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", color: "#78716C" }}>
                      Video Type
                    </label>
                    <select
                      className="admin-select"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value as VideoCategory)}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <p style={{ fontFamily: "var(--font-system)", fontSize: 11, color: "#A8A29E", marginTop: 4 }}>
                      {CATEGORIES.find((c) => c.value === selectedCategory)?.description}
                    </p>
                  </div>

                  {/* Format */}
                  <div className="space-y-1.5">
                    <label style={{ fontFamily: "var(--font-system)", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", color: "#78716C" }}>
                      Format / Platform
                    </label>
                    <select
                      className="admin-select"
                      value={selectedFormat}
                      onChange={(e) => setSelectedFormat(e.target.value as VideoFormat)}
                    >
                      {FORMATS.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label} ({f.ratio})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Locale */}
                  <div className="space-y-1.5">
                    <label style={{ fontFamily: "var(--font-system)", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", color: "#78716C" }}>
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
                </div>
              </AdminCard>

              <AdminCard>
                <AdminSectionLabel>Content</AdminSectionLabel>
                <p style={{ fontFamily: "var(--font-system)", fontSize: 11, color: "#78716C", marginBottom: 16 }}>
                  Customize the video text and media
                </p>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label style={{ fontFamily: "var(--font-system)", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", color: "#78716C" }}>
                      Title
                    </label>
                    <input
                      className="admin-input"
                      placeholder="e.g. Discover London's Hidden Gems"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label style={{ fontFamily: "var(--font-system)", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", color: "#78716C" }}>
                      Subtitle
                    </label>
                    <input
                      className="admin-input"
                      placeholder="e.g. Your luxury guide to London"
                      value={subtitle}
                      onChange={(e) => setSubtitle(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label style={{ fontFamily: "var(--font-system)", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", color: "#78716C" }}>
                      Image URLs (comma-separated)
                    </label>
                    <input
                      className="admin-input"
                      placeholder="https://example.com/image1.jpg, https://..."
                      value={imageUrls}
                      onChange={(e) => setImageUrls(e.target.value)}
                    />
                    <p style={{ fontFamily: "var(--font-system)", fontSize: 11, color: "#A8A29E", marginTop: 4 }}>
                      Add background images for each scene (3-5 recommended)
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label style={{ fontFamily: "var(--font-system)", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", color: "#78716C" }}>
                      Duration (seconds)
                    </label>
                    <input
                      className="admin-input"
                      type="number"
                      placeholder="Auto (based on type)"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      min={5}
                      max={60}
                    />
                  </div>
                </div>
              </AdminCard>
            </div>

            {/* Right: Preview card */}
            <div className="space-y-4">
              <AdminCard>
                <AdminSectionLabel>Quick Preview</AdminSectionLabel>
                <p style={{ fontFamily: "var(--font-system)", fontSize: 11, color: "#78716C", marginBottom: 16 }}>
                  {generatedTemplate
                    ? `${generatedTemplate.name} — ${generatedTemplate.width}x${generatedTemplate.height}`
                    : "Configure and generate to see a preview"}
                </p>
                {generatedTemplate ? (
                  <VideoPlayer template={generatedTemplate} showControls autoPlay={false} />
                ) : (
                  <AdminEmptyState
                    icon={Video}
                    title="No Video Yet"
                    description='Click "Generate Video" to create a preview'
                  />
                )}
              </AdminCard>

              {/* Action Buttons */}
              <div className="space-y-2">
                <AdminButton
                  variant="primary"
                  size="lg"
                  onClick={generateVideo}
                  loading={loading}
                  className="w-full justify-center"
                >
                  <Wand2 className="w-4 h-4" />
                  Generate Preview
                </AdminButton>
                <AdminButton
                  variant="secondary"
                  size="lg"
                  onClick={saveAndRenderCanva}
                  loading={canvaLoading}
                  className="w-full justify-center"
                >
                  <Download className="w-4 h-4" />
                  Render with Canva
                </AdminButton>
                <p style={{ fontFamily: "var(--font-system)", fontSize: 10, color: "#A8A29E", textAlign: "center" }}>
                  &ldquo;Generate Preview&rdquo; shows a local preview. &ldquo;Render with Canva&rdquo; creates + exports the design via Canva.
                </p>
              </div>

              {error && (
                <AdminAlertBanner
                  severity="critical"
                  message="Generation Failed"
                  detail={error}
                  onDismiss={() => setError(null)}
                />
              )}
            </div>
          </div>
        )}

        {/* ── Preview Tab ───────────────────────────────── */}
        {activeTab === "preview" && (
          <>
            {generatedTemplate ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Player */}
                <div className="lg:col-span-2">
                  <AdminCard>
                    <div className="flex items-center gap-2 mb-2">
                      <Play className="w-4 h-4" style={{ color: "#C8322B" }} />
                      <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: "#1C1917" }}>
                        {generatedTemplate.name}
                      </span>
                    </div>
                    <p style={{ fontFamily: "var(--font-system)", fontSize: 11, color: "#78716C", marginBottom: 12 }}>
                      {generatedTemplate.width}x{generatedTemplate.height} | {generatedTemplate.fps}fps |{" "}
                      {(generatedTemplate.durationFrames / generatedTemplate.fps).toFixed(1)}s |{" "}
                      {generatedTemplate.format}
                    </p>
                    <VideoPlayer
                      template={generatedTemplate}
                      showControls
                      autoPlay
                      loop
                    />
                  </AdminCard>
                </div>

                {/* Sidebar info */}
                <div className="space-y-4">
                  <AdminCard>
                    <AdminSectionLabel>Video Info</AdminSectionLabel>
                    <div className="space-y-3 mt-3">
                      {[
                        { label: "Site", value: generatedTemplate.brand?.siteName },
                        { label: "Category", value: generatedTemplate.category },
                        { label: "Format", value: generatedTemplate.format },
                        { label: "Resolution", value: `${generatedTemplate.width}x${generatedTemplate.height}` },
                        { label: "Duration", value: `${(generatedTemplate.durationFrames / generatedTemplate.fps).toFixed(1)}s` },
                        { label: "Scenes", value: generatedTemplate.scenes.length },
                        { label: "FPS", value: generatedTemplate.fps },
                      ].map((item) => (
                        <div key={item.label} className="flex justify-between items-center">
                          <span style={{ fontFamily: "var(--font-system)", fontSize: 11, color: "#78716C" }}>
                            {item.label}
                          </span>
                          <span style={{ fontFamily: "var(--font-system)", fontSize: 11, fontWeight: 600, color: "#1C1917" }}>
                            {String(item.value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </AdminCard>

                  <AdminCard>
                    <AdminSectionLabel>Scenes</AdminSectionLabel>
                    <div className="space-y-2 mt-3">
                      {generatedTemplate.scenes.map((scene, idx) => (
                        <div
                          key={scene.id}
                          className="flex items-center justify-between p-2 rounded-lg"
                          style={{ backgroundColor: "#FAF8F4" }}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="w-5 h-5 rounded-full flex items-center justify-center"
                              style={{
                                backgroundColor: "rgba(200,50,43,0.1)",
                                fontFamily: "var(--font-system)",
                                fontSize: 9,
                                fontWeight: 700,
                                color: "#C8322B",
                              }}
                            >
                              {idx + 1}
                            </span>
                            <span style={{ fontFamily: "var(--font-system)", fontSize: 11, fontWeight: 600, color: "#1C1917" }}>
                              {scene.name}
                            </span>
                          </div>
                          <span style={{ fontFamily: "var(--font-system)", fontSize: 10, color: "#A8A29E" }}>
                            {scene.elements.length} el | {(scene.durationFrames / generatedTemplate.fps).toFixed(1)}s
                          </span>
                        </div>
                      ))}
                    </div>
                  </AdminCard>

                  <AdminCard>
                    <AdminSectionLabel>Actions</AdminSectionLabel>
                    <div className="space-y-2 mt-3">
                      <AdminButton
                        variant="primary"
                        onClick={saveAndRenderCanva}
                        loading={canvaLoading}
                        className="w-full justify-center"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Render with Canva
                      </AdminButton>
                      <AdminButton variant="secondary" onClick={copyTemplateJSON} className="w-full justify-center">
                        <Copy className="w-3.5 h-3.5" />
                        Copy Template JSON
                      </AdminButton>
                      <AdminButton
                        variant="secondary"
                        onClick={() => setActiveTab("create")}
                        className="w-full justify-center"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Generate New
                      </AdminButton>
                    </div>
                  </AdminCard>

                  {/* Canva Render Status */}
                  {canvaResult.status !== "idle" && (
                    <AdminCard>
                      <AdminSectionLabel>Canva Render</AdminSectionLabel>
                      <div className="space-y-3 mt-3">
                        <div className="flex items-center gap-2">
                          <AdminStatusBadge
                            status={
                              canvaResult.status === "rendered" ? "active" :
                              canvaResult.status === "failed" ? "error" :
                              "warning"
                            }
                            label={canvaResult.status === "queued" ? "Ready for Canva" : canvaResult.status}
                          />
                        </div>

                        {canvaResult.status === "queued" && canvaResult.query && (
                          <div className="space-y-2">
                            <p style={{ fontFamily: "var(--font-system)", fontSize: 11, color: "#78716C" }}>
                              Canva design query prepared. Use the Canva MCP tools to generate and export:
                            </p>
                            <div
                              className="p-3 rounded-lg overflow-auto max-h-48"
                              style={{ backgroundColor: "#FAF8F4", border: "1px solid rgba(214,208,196,0.5)" }}
                            >
                              <p style={{ fontFamily: "var(--font-system)", fontSize: 10, color: "#1C1917", whiteSpace: "pre-wrap" }}>
                                <strong>Design Type:</strong> {canvaResult.designType}{"\n"}
                                <strong>Export:</strong> {canvaResult.exportFormat}{"\n"}
                                <strong>Query:</strong> {canvaResult.query}
                              </p>
                            </div>
                            <AdminButton
                              variant="secondary"
                              onClick={() => {
                                if (canvaResult.query) {
                                  navigator.clipboard.writeText(canvaResult.query);
                                }
                              }}
                              className="w-full justify-center"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              Copy Canva Query
                            </AdminButton>
                          </div>
                        )}

                        {canvaResult.status === "rendered" && canvaResult.exportUrl && (
                          <div className="space-y-2">
                            <p style={{ fontFamily: "var(--font-system)", fontSize: 11, color: "#2D5A3D", fontWeight: 600 }}>
                              Design exported successfully
                            </p>
                            <a
                              href={canvaResult.exportUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                              style={{ backgroundColor: "rgba(45,90,61,0.08)", color: "#2D5A3D", fontFamily: "var(--font-system)", fontSize: 11, fontWeight: 600 }}
                            >
                              <Download className="w-3.5 h-3.5" />
                              Download {canvaResult.exportFormat?.toUpperCase()}
                            </a>
                          </div>
                        )}

                        {canvaResult.status === "failed" && (
                          <p style={{ fontFamily: "var(--font-system)", fontSize: 11, color: "#C8322B" }}>
                            {canvaResult.error || "Canva render failed"}
                          </p>
                        )}
                      </div>
                    </AdminCard>
                  )}
                </div>
              </div>
            ) : (
              <AdminEmptyState
                icon={Video}
                title="No Preview Available"
                description="Generate a video first to see the preview."
                action={
                  <AdminButton variant="primary" onClick={() => setActiveTab("create")}>
                    Go to Create
                  </AdminButton>
                }
              />
            )}
          </>
        )}

        {/* ── Templates Tab ─────────────────────────────── */}
        {activeTab === "templates" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {CATEGORIES.map((cat) => (
                <AdminCard
                  key={cat.value}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div
                    onClick={() => {
                      setSelectedCategory(cat.value);
                      setActiveTab("create");
                    }}
                  >
                    <div
                      className="w-full h-28 rounded-lg flex items-center justify-center mb-3"
                      style={{
                        background: "linear-gradient(135deg, rgba(200,50,43,0.08) 0%, rgba(196,154,42,0.08) 100%)",
                      }}
                    >
                      <span style={{ color: "#C8322B" }}>{cat.icon}</span>
                    </div>
                    <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: "#1C1917" }}>
                      {cat.label}
                    </p>
                    <p style={{ fontFamily: "var(--font-system)", fontSize: 11, color: "#78716C", marginTop: 4 }}>
                      {cat.description}
                    </p>
                    <div className="flex items-center gap-1.5 mt-3">
                      {["reel", "short", "square"].map((f) => (
                        <span
                          key={f}
                          className="px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: "rgba(59,126,161,0.08)",
                            fontFamily: "var(--font-system)",
                            fontSize: 9,
                            fontWeight: 600,
                            color: "#3B7EA1",
                          }}
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                </AdminCard>
              ))}
            </div>

            <AdminCard>
              <AdminSectionLabel>Supported Platforms</AdminSectionLabel>
              <p style={{ fontFamily: "var(--font-system)", fontSize: 11, color: "#78716C", marginBottom: 12 }}>
                Each template can be rendered in any of these formats
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {FORMATS.map((f) => (
                  <div
                    key={f.value}
                    className="flex items-center gap-2 p-2.5 rounded-lg"
                    style={{ backgroundColor: "#FAF8F4" }}
                  >
                    <span style={{ color: "#3B7EA1" }}>{f.icon}</span>
                    <div>
                      <div style={{ fontFamily: "var(--font-system)", fontSize: 11, fontWeight: 600, color: "#1C1917" }}>
                        {f.label}
                      </div>
                      <div style={{ fontFamily: "var(--font-system)", fontSize: 10, color: "#A8A29E" }}>
                        {f.ratio}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </AdminCard>
          </div>
        )}

        {/* ── Settings Tab ──────────────────────────────── */}
        {activeTab === "settings" && (
          <div className="space-y-4">
            <AdminCard>
              <AdminSectionLabel>Video Studio Settings</AdminSectionLabel>
              <p style={{ fontFamily: "var(--font-system)", fontSize: 11, color: "#78716C", marginBottom: 16 }}>
                Configure rendering and export options
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, color: "#1C1917" }}>
                    Rendering
                  </p>
                  <div className="space-y-1.5">
                    <label style={{ fontFamily: "var(--font-system)", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", color: "#78716C" }}>
                      Default FPS
                    </label>
                    <select className="admin-select" defaultValue="30">
                      <option value="24">24 fps (Film)</option>
                      <option value="30">30 fps (Standard)</option>
                      <option value="60">60 fps (Smooth)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label style={{ fontFamily: "var(--font-system)", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", color: "#78716C" }}>
                      Output Codec
                    </label>
                    <select className="admin-select" defaultValue="h264">
                      <option value="h264">H.264 (MP4)</option>
                      <option value="h265">H.265 (HEVC)</option>
                      <option value="vp9">VP9 (WebM)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, color: "#1C1917" }}>
                    Export
                  </p>
                  <div className="p-4 rounded-lg" style={{ backgroundColor: "#FAF8F4", border: "1px solid rgba(214,208,196,0.6)" }}>
                    <p style={{ fontFamily: "var(--font-system)", fontSize: 12, fontWeight: 600, color: "#1C1917" }}>
                      Render Engines
                    </p>
                    <p style={{ fontFamily: "var(--font-system)", fontSize: 11, color: "#78716C", marginTop: 4 }}>
                      <strong>Canva MCP</strong> is the primary render engine — generates branded designs
                      and exports as PNG/MP4 via Canva&apos;s AI. No server-side Chromium needed.
                    </p>
                    <p style={{ fontFamily: "var(--font-system)", fontSize: 11, color: "#A8A29E", marginTop: 4 }}>
                      Remotion is available for local preview only (cannot render on Vercel serverless).
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <AdminStatusBadge status="active" label="Canva MCP" />
                      <AdminStatusBadge status="active" label="Browser Preview" />
                      <AdminStatusBadge status="inactive" label="Remotion Lambda" />
                    </div>
                  </div>
                </div>
              </div>
            </AdminCard>

            <AdminCard>
              <AdminSectionLabel>Architecture</AdminSectionLabel>
              <p style={{ fontFamily: "var(--font-system)", fontSize: 11, color: "#78716C", marginBottom: 16 }}>
                How the Video Studio works
              </p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { step: "1", title: "Template Engine", desc: "Brand-aware video templates generated per site with colors, fonts, and destination themes" },
                  { step: "2", title: "Remotion Composition", desc: "React components render each scene with animations, transitions, and effects" },
                  { step: "3", title: "Browser Preview", desc: "@remotion/player provides real-time interactive preview in the admin panel" },
                  { step: "4", title: "Canva Export", desc: "Canva MCP generates branded designs and exports as PNG or MP4 — no Chromium needed" },
                ].map((s) => (
                  <div key={s.step} className="p-4 rounded-lg" style={{ backgroundColor: "#FAF8F4", border: "1px solid rgba(214,208,196,0.6)" }}>
                    <span
                      className="inline-flex items-center justify-center w-6 h-6 rounded-full mb-2"
                      style={{
                        backgroundColor: "#C8322B",
                        fontFamily: "var(--font-display)",
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#FAF8F4",
                      }}
                    >
                      {s.step}
                    </span>
                    <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: "#1C1917" }}>
                      {s.title}
                    </p>
                    <p style={{ fontFamily: "var(--font-system)", fontSize: 11, color: "#78716C", marginTop: 4 }}>
                      {s.desc}
                    </p>
                  </div>
                ))}
              </div>
            </AdminCard>
          </div>
        )}
      </div>
    </div>
  );
}
