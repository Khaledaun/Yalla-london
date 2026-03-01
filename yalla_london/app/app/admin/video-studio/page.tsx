"use client";

import React, { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  { ssr: false, loading: () => <div className="h-[500px] bg-muted rounded-lg animate-pulse flex items-center justify-center text-muted-foreground">Loading video player...</div> },
);

const SITES = Object.values(SITE_CONFIG).map((s) => ({
  id: s.id,
  name: s.name,
  destination: s.destination,
}));

const CATEGORIES: Array<{ value: VideoCategory; label: string; icon: React.ReactNode; description: string }> = [
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

const FORMATS: Array<{ value: VideoFormat; label: string; icon: React.ReactNode; ratio: string }> = [
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
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Video className="w-6 h-6" />
            Video Studio
          </h1>
          <p className="text-muted-foreground mt-1">
            Create brand-aware social media videos powered by Remotion
          </p>
        </div>
        <Badge variant="secondary" className="text-xs">
          Powered by Remotion
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="create">
            <Wand2 className="w-4 h-4 mr-2" />
            Create
          </TabsTrigger>
          <TabsTrigger value="preview" disabled={!generatedTemplate}>
            <Play className="w-4 h-4 mr-2" />
            Preview
          </TabsTrigger>
          <TabsTrigger value="templates">
            <Film className="w-4 h-4 mr-2" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings2 className="w-4 h-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* ── Create Tab ────────────────────────────────── */}
        <TabsContent value="create" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Config */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Video Configuration</CardTitle>
                  <CardDescription>Set up your brand video</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Site */}
                  <div className="space-y-2">
                    <Label>Brand / Site</Label>
                    <Select value={selectedSite} onValueChange={setSelectedSite}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SITES.map(s => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name} — {s.destination}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Category */}
                  <div className="space-y-2">
                    <Label>Video Type</Label>
                    <Select value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as VideoCategory)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(c => (
                          <SelectItem key={c.value} value={c.value}>
                            <span className="flex items-center gap-2">
                              {c.icon} {c.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {CATEGORIES.find(c => c.value === selectedCategory)?.description}
                    </p>
                  </div>

                  {/* Format */}
                  <div className="space-y-2">
                    <Label>Format / Platform</Label>
                    <Select value={selectedFormat} onValueChange={(v) => setSelectedFormat(v as VideoFormat)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FORMATS.map(f => (
                          <SelectItem key={f.value} value={f.value}>
                            <span className="flex items-center gap-2">
                              {f.icon} {f.label}
                              <Badge variant="outline" className="text-[10px] ml-1">{f.ratio}</Badge>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Locale */}
                  <div className="space-y-2">
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
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Content</CardTitle>
                  <CardDescription>Customize the video text and media</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      placeholder="e.g. Discover London's Hidden Gems"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Subtitle</Label>
                    <Input
                      placeholder="e.g. Your luxury guide to London"
                      value={subtitle}
                      onChange={(e) => setSubtitle(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Image URLs (comma-separated)</Label>
                    <Input
                      placeholder="https://example.com/image1.jpg, https://..."
                      value={imageUrls}
                      onChange={(e) => setImageUrls(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Add background images for each scene (3-5 recommended)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Duration (seconds)</Label>
                    <Input
                      type="number"
                      placeholder="Auto (based on type)"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      min={5}
                      max={60}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right: Preview card */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Preview</CardTitle>
                  <CardDescription>
                    {generatedTemplate
                      ? `${generatedTemplate.name} — ${generatedTemplate.width}x${generatedTemplate.height}`
                      : "Configure and generate to see a preview"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {generatedTemplate ? (
                    <VideoPlayer template={generatedTemplate} showControls autoPlay={false} />
                  ) : (
                    <div className="h-[400px] bg-muted rounded-lg flex flex-col items-center justify-center gap-4 text-muted-foreground">
                      <Video className="w-12 h-12" />
                      <p>Click &quot;Generate Video&quot; to create a preview</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Generate Button */}
              <Button
                className="w-full h-12 text-lg"
                onClick={generateVideo}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5 mr-2" />
                    Generate Video
                  </>
                )}
              </Button>

              {error && (
                <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                  {error}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── Preview Tab ───────────────────────────────── */}
        <TabsContent value="preview" className="space-y-6">
          {generatedTemplate ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Player */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Play className="w-5 h-5" />
                      {generatedTemplate.name}
                    </CardTitle>
                    <CardDescription>
                      {generatedTemplate.width}x{generatedTemplate.height} | {generatedTemplate.fps}fps |{" "}
                      {(generatedTemplate.durationFrames / generatedTemplate.fps).toFixed(1)}s |{" "}
                      {generatedTemplate.format}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <VideoPlayer
                      template={generatedTemplate}
                      showControls
                      autoPlay
                      loop
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar info */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Video Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Site</span>
                      <span className="font-medium">{generatedTemplate.brand?.siteName}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Category</span>
                      <Badge variant="outline">{generatedTemplate.category}</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Format</span>
                      <span className="font-medium">{generatedTemplate.format}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Resolution</span>
                      <span className="font-medium">{generatedTemplate.width}x{generatedTemplate.height}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Duration</span>
                      <span className="font-medium">{(generatedTemplate.durationFrames / generatedTemplate.fps).toFixed(1)}s</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Scenes</span>
                      <span className="font-medium">{generatedTemplate.scenes.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">FPS</span>
                      <span className="font-medium">{generatedTemplate.fps}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Scenes</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {generatedTemplate.scenes.map((scene, idx) => (
                      <div
                        key={scene.id}
                        className="flex items-center justify-between p-2 rounded bg-muted/50"
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs w-6 h-6 flex items-center justify-center p-0">
                            {idx + 1}
                          </Badge>
                          <span className="text-sm font-medium">{scene.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{scene.elements.length} elements</span>
                          <span>{(scene.durationFrames / generatedTemplate.fps).toFixed(1)}s</span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button variant="outline" className="w-full" onClick={copyTemplateJSON}>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Template JSON
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setActiveTab("create");
                      }}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Generate New
                    </Button>
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      Server-side MP4 rendering requires Remotion Lambda or Cloud Run setup.
                      Use the browser player for preview.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Generate a video first to see the preview.
            </div>
          )}
        </TabsContent>

        {/* ── Templates Tab ─────────────────────────────── */}
        <TabsContent value="templates" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {CATEGORIES.map((cat) => (
              <Card
                key={cat.value}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => {
                  setSelectedCategory(cat.value);
                  setActiveTab("create");
                }}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="w-full h-32 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg flex items-center justify-center">
                    <div className="text-4xl">{cat.icon}</div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{cat.label}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{cat.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {["instagram-reel", "youtube-short", "square"].map(f => (
                      <Badge key={f} variant="outline" className="text-[10px]">
                        {f.split("-").pop()}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Supported Platforms</CardTitle>
              <CardDescription>Each template can be rendered in any of these formats</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {FORMATS.map(f => (
                  <div key={f.value} className="flex items-center gap-2 p-2 rounded bg-muted/50">
                    {f.icon}
                    <div>
                      <div className="text-sm font-medium">{f.label}</div>
                      <div className="text-xs text-muted-foreground">{f.ratio}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Settings Tab ──────────────────────────────── */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Video Studio Settings</CardTitle>
              <CardDescription>Configure rendering and export options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold">Rendering</h3>
                  <div className="space-y-2">
                    <Label>Default FPS</Label>
                    <Select defaultValue="30">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="24">24 fps (Film)</SelectItem>
                        <SelectItem value="30">30 fps (Standard)</SelectItem>
                        <SelectItem value="60">60 fps (Smooth)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Output Codec</Label>
                    <Select defaultValue="h264">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="h264">H.264 (MP4)</SelectItem>
                        <SelectItem value="h265">H.265 (HEVC)</SelectItem>
                        <SelectItem value="vp9">VP9 (WebM)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold">Export</h3>
                  <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                    <p className="text-sm font-medium">Server-Side Rendering</p>
                    <p className="text-xs text-muted-foreground">
                      For production MP4 export, set up Remotion Lambda (AWS) or Cloud Run (GCP).
                      The browser player provides real-time preview without server rendering.
                    </p>
                    <div className="flex gap-2 mt-3">
                      <Badge variant="outline">Browser Preview</Badge>
                      <Badge variant="secondary">Active</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline">Lambda Rendering</Badge>
                      <Badge variant="outline" className="text-muted-foreground">Not Configured</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Architecture</CardTitle>
              <CardDescription>How the Video Studio works</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { step: "1", title: "Template Engine", desc: "Brand-aware video templates generated per site with colors, fonts, and destination themes" },
                  { step: "2", title: "Remotion Composition", desc: "React components render each scene with animations, transitions, and effects" },
                  { step: "3", title: "Browser Preview", desc: "@remotion/player provides real-time interactive preview in the admin panel" },
                  { step: "4", title: "MP4 Export", desc: "Server-side rendering via Remotion Lambda/Cloud Run for production video files" },
                ].map(s => (
                  <div key={s.step} className="p-4 bg-muted/50 rounded-lg">
                    <Badge className="mb-2">{s.step}</Badge>
                    <h4 className="font-semibold text-sm">{s.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
