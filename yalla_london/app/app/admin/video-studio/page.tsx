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

  return (
    <div className="admin-page p-4 md:p-6">
      <AdminPageHeader
        title="Video Studio"
        subtitle="Create brand-aware social media videos powered by Remotion"
        action={
          <AdminStatusBadge status="active" label="Remotion" />
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

              {/* Generate Button */}
              <AdminButton
                variant="primary"
                size="lg"
                onClick={generateVideo}
                loading={loading}
                className="w-full justify-center"
              >
                <Wand2 className="w-4 h-4" />
                Generate Video
              </AdminButton>

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
                      <p style={{ fontFamily: "var(--font-system)", fontSize: 10, color: "#A8A29E", textAlign: "center", marginTop: 8 }}>
                        Server-side MP4 rendering requires Remotion Lambda or Cloud Run setup.
                        Use the browser player for preview.
                      </p>
                    </div>
                  </AdminCard>
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
                      Server-Side Rendering
                    </p>
                    <p style={{ fontFamily: "var(--font-system)", fontSize: 11, color: "#78716C", marginTop: 4 }}>
                      For production MP4 export, set up Remotion Lambda (AWS) or Cloud Run (GCP).
                      The browser player provides real-time preview without server rendering.
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <AdminStatusBadge status="active" label="Browser Preview" />
                      <AdminStatusBadge status="inactive" label="Lambda Rendering" />
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
                  { step: "4", title: "MP4 Export", desc: "Server-side rendering via Remotion Lambda/Cloud Run for production video files" },
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
