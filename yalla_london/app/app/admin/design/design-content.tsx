"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import NextImage from "next/image";
import {
  Palette,
  FileImage,
  Mail,
  Video,
  PenTool,
  Layout,
  Plus,
  Clock,
  Image as ImageIcon,
  FileText,
  Film,
  Send,
  ArrowRight,
  RefreshCw,
  Layers,
  Clapperboard,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { SITES as SITE_CONFIG, getDefaultSiteId } from "@/config/sites";

// ─── Types ───────────────────────────────────────────────────────

interface Design {
  id: string;
  title: string;
  type: string;
  siteId: string;
  siteName: string;
  thumbnail: string | null;
  updatedAt: string;
}

interface BrandStatus {
  siteId: string;
  siteName: string;
  primaryColor: string;
  secondaryColor: string;
  assetCount: number;
}

interface AssetStats {
  totalDesigns: number;
  pdfsGenerated: number;
  videosRendered: number;
  emailsSent: number;
}

// ─── Site config (derived from central config/sites.ts) ──────────

const SITE_LIST = Object.values(SITE_CONFIG).map((s) => ({
  id: s.id,
  name: s.name,
  primaryColor: s.primaryColor,
  secondaryColor: s.secondaryColor,
}));

// ─── Quick Create items ──────────────────────────────────────────

const QUICK_CREATE_ITEMS = [
  { title: "Social Post", icon: ImageIcon, href: "/admin/design-studio?type=social", description: "Create a social media graphic" },
  { title: "Email Template", icon: Mail, href: "/admin/email-campaigns", description: "Create & edit email templates" },
  { title: "PDF Guide", icon: FileText, href: "/admin/pdf-generator", description: "Generate a travel guide PDF" },
  { title: "Video", icon: Film, href: "/admin/video-studio", description: "Produce a short video" },
  { title: "Blog Header", icon: Layout, href: "/admin/design-studio?type=blog-header", description: "Design a blog header image" },
  { title: "Logo", icon: PenTool, href: "/admin/design-studio?type=logo", description: "Create or refine a logo" },
];

// ─── Helpers ─────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function getTypeBadgeColor(type: string): string {
  switch (type.toLowerCase()) {
    case "social": return "bg-pink-100 text-pink-700";
    case "email": return "bg-blue-100 text-blue-700";
    case "pdf": return "bg-amber-100 text-amber-700";
    case "video": return "bg-purple-100 text-purple-700";
    case "blog-header": return "bg-green-100 text-green-700";
    case "logo": return "bg-indigo-100 text-indigo-700";
    default: return "bg-gray-100 text-gray-700";
  }
}

// ─── Main Component ──────────────────────────────────────────────

export default function DesignContent() {
  const [designs, setDesigns] = useState<Design[]>([]);
  const [brandStatuses, setBrandStatuses] = useState<BrandStatus[]>([]);
  const [stats, setStats] = useState<AssetStats>({ totalDesigns: 0, pdfsGenerated: 0, videosRendered: 0, emailsSent: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSeedingVideos, setIsSeedingVideos] = useState(false);
  const [seedResult, setSeedResult] = useState<{ success: boolean; seeded: number; skipped: number; total: number } | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isSeedingTemplates, setIsSeedingTemplates] = useState(false);
  const [templateSeedResult, setTemplateSeedResult] = useState<{ seeded: number; skipped: number } | null>(null);
  const [canvaTemplates, setCanvaTemplates] = useState<Array<{ id: string; name: string; source: string; previewUrl?: string; cdnUrl?: string; canvaAssetId?: string; width?: number; height?: number }>>([]);
  const [selectedBrand, setSelectedBrand] = useState<string>("yalla-london");
  const [videoSetupRunning, setVideoSetupRunning] = useState(false);
  const [videoSetupStatus, setVideoSetupStatus] = useState<{
    ready: boolean;
    nodeModulesExists: boolean;
    allAssetsReady: boolean;
    videoProjectExists: boolean;
  } | null>(null);
  const [videoSetupResult, setVideoSetupResult] = useState<{ success: boolean; results?: Array<{ step: string; success: boolean; detail: string }> } | null>(null);

  useEffect(() => {
    loadData();
    loadVideoStatus();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [designsRes, brandRes] = await Promise.allSettled([
        fetch("/api/admin/designs?limit=10"),
        fetch("/api/admin/brand-assets"),
      ]);

      // Recent designs
      if (designsRes.status === "fulfilled" && designsRes.value.ok) {
        const data = await designsRes.value.json();
        const items = data.designs || data.data || [];
        setDesigns(
          items.map((d: Record<string, unknown>) => ({
            id: String(d.id || ""),
            title: String(d.title || d.name || "Untitled"),
            type: String(d.type || d.category || "design"),
            siteId: String(d.siteId || d.site_id || ""),
            siteName: String(d.siteName || d.site_name || ""),
            thumbnail: (d.thumbnail || d.thumbnailUrl || d.preview_url || null) as string | null,
            updatedAt: String(d.updatedAt || d.updated_at || d.createdAt || d.created_at || ""),
          }))
        );
      } else {
        setDesigns([]);
      }

      // Brand assets per site + stats (stats come from brand-assets API, not designs API)
      if (brandRes.status === "fulfilled" && brandRes.value.ok) {
        const data = await brandRes.value.json();

        // Read aggregate stats from brand-assets response
        if (data.stats) {
          setStats({
            totalDesigns: data.stats.totalDesigns || 0,
            pdfsGenerated: data.stats.pdfsGenerated || 0,
            videosRendered: data.stats.videosRendered || 0,
            emailsSent: data.stats.emailsSent || 0,
          });
        }

        // Build brand status from per-site design counts
        const siteCounts = data.siteCounts || [];
        const siteAssetCounts: Record<string, number> = {};
        if (Array.isArray(siteCounts)) {
          for (const item of siteCounts) {
            const sid = String(item.site || item.siteId || "");
            const count = Number(item._count?.id || item.count || 1);
            if (sid) siteAssetCounts[sid] = (siteAssetCounts[sid] || 0) + count;
          }
        }
        setBrandStatuses(
          SITE_LIST.map((s) => ({
            siteId: s.id,
            siteName: s.name,
            primaryColor: s.primaryColor,
            secondaryColor: s.secondaryColor,
            assetCount: siteAssetCounts[s.id] || 0,
          }))
        );
      } else {
        setBrandStatuses(
          SITE_LIST.map((s) => ({
            siteId: s.id,
            siteName: s.name,
            primaryColor: s.primaryColor,
            secondaryColor: s.secondaryColor,
            assetCount: 0,
          }))
        );
      }
    } catch (err) {
      console.warn("[design-hub] Failed to load data:", err);
      setDesigns([]);
      setBrandStatuses(
        SITE_LIST.map((s) => ({
          siteId: s.id,
          siteName: s.name,
          primaryColor: s.primaryColor,
          secondaryColor: s.secondaryColor,
          assetCount: 0,
        }))
      );
    }
    setIsLoading(false);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
    toast.success("Design Hub refreshed");
  };

  const handleSeedCanvaVideos = async () => {
    setIsSeedingVideos(true);
    setSeedResult(null);
    try {
      const res = await fetch("/api/admin/seed-canva-videos", { method: "POST" });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setSeedResult(data);
      if (data.seeded > 0) {
        toast.success(`Seeded ${data.seeded} Canva video collection${data.seeded !== 1 ? "s" : ""}`);
        loadData(); // Refresh stats
      } else if (data.failed > 0) {
        toast.error(`Failed to seed ${data.failed} collection${data.failed !== 1 ? "s" : ""}: ${data.errors?.[0] || "unknown error"}`);
      } else {
        toast.info("All Canva video collections already seeded");
      }
    } catch (err) {
      console.warn("[design-hub] Seed Canva videos failed:", err);
      toast.error("Failed to seed Canva videos");
    }
    setIsSeedingVideos(false);
  };

  const loadCanvaTemplates = async (brand: string) => {
    try {
      const res = await fetch(`/api/admin/canva-templates?brand=${brand}`);
      if (!res.ok) return;
      const data = await res.json();
      setCanvaTemplates(data.templates || []);
    } catch (err) {
      console.warn("[design-hub] Failed to load Canva templates:", err);
    }
  };

  const handleSeedCanvaTemplates = async () => {
    setIsSeedingTemplates(true);
    setTemplateSeedResult(null);
    try {
      const res = await fetch("/api/admin/canva-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "seed" }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTemplateSeedResult({ seeded: data.seeded, skipped: data.skipped });
      if (data.seeded > 0) {
        toast.success(`Seeded ${data.seeded} Canva template${data.seeded !== 1 ? "s" : ""} to media library`);
        loadData();
      } else {
        toast.info("All Canva templates already seeded");
      }
    } catch (err) {
      console.warn("[design-hub] Seed Canva templates failed:", err);
      toast.error("Failed to seed Canva templates");
    }
    setIsSeedingTemplates(false);
  };

  useEffect(() => {
    loadCanvaTemplates(selectedBrand);
  }, [selectedBrand]);

  const loadVideoStatus = async () => {
    try {
      const res = await fetch("/api/admin/video-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "status" }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setVideoSetupStatus({
        ready: data.ready,
        nodeModulesExists: data.nodeModulesExists,
        allAssetsReady: data.allAssetsReady,
        videoProjectExists: data.videoProjectExists,
      });
    } catch (err) {
      console.warn("[design-hub] Video status check failed:", err);
    }
  };

  const handleVideoSetup = async (action: "setup-all" | "copy-brand-assets" | "install-deps") => {
    setVideoSetupRunning(true);
    setVideoSetupResult(null);
    try {
      const res = await fetch("/api/admin/video-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setVideoSetupResult(data);
      if (data.success) {
        toast.success(
          action === "setup-all"
            ? "Video studio setup complete"
            : action === "copy-brand-assets"
              ? "Brand assets copied to video project"
              : "Remotion dependencies installed"
        );
        loadVideoStatus();
      } else {
        toast.error("Setup had issues — check details below");
      }
    } catch (err) {
      console.warn("[design-hub] Video setup failed:", err);
      toast.error(`Setup failed: ${err instanceof Error ? err.message : "unknown error"}`);
    }
    setVideoSetupRunning(false);
  };

  const [quickCreateTitle, setQuickCreateTitle] = useState("");
  const [quickCreateAction, setQuickCreateAction] = useState<string | null>(null);
  const [quickCreating, setQuickCreating] = useState(false);
  const [quickCreateResult, setQuickCreateResult] = useState<{ url: string; width: number; height: number; action: string } | null>(null);

  const handleQuickCreate = async (action: string, format?: string) => {
    if (!quickCreateTitle.trim()) {
      toast.error("Enter a title first");
      return;
    }
    setQuickCreating(true);
    setQuickCreateAction(action);
    setQuickCreateResult(null);
    try {
      const siteId = document.cookie.match(/(?:^|;\s*)siteId=([^;]*)/)?.[1] || getDefaultSiteId();
      const res = await fetch("/api/admin/design-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, title: quickCreateTitle, siteId, format }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setQuickCreateResult({ url: data.image.url, width: data.image.width, height: data.image.height, action });
      toast.success(`${action} created and saved to media library`);
      loadData();
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : "unknown"}`);
    }
    setQuickCreating(false);
    setQuickCreateAction(null);
  };

  // ─── Render ──────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Palette className="h-7 w-7 text-indigo-600" />
              Design Hub
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Create, manage, and organize visual assets across all sites
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="admin-btn admin-btn-secondary text-sm px-3 py-1.5 inline-flex items-center gap-1"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <Link href="/admin/design-studio">
              <button className="admin-btn admin-btn-primary text-sm px-3 py-1.5 inline-flex items-center gap-1">
                <Plus className="h-4 w-4 mr-2" />
                Open Studio
              </button>
            </Link>
          </div>
        </div>

        {/* Quick Start — shown when no designs exist */}
        {!isLoading && stats.totalDesigns === 0 && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <div className="p-6 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center bg-indigo-50 dark:bg-indigo-950">
                <Palette className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Get Started with Design
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                Seed 10 branded starter templates (social posts, blog headers, email banners, logo, OG images) with your site&apos;s brand colors.
              </p>
              <button
                className="admin-btn admin-btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold"
                disabled={isSeeding}
                onClick={async () => {
                  setIsSeeding(true);
                  try {
                    const siteId = document.cookie.match(/(?:^|;\s*)siteId=([^;]*)/)?.[1] || getDefaultSiteId();
                    const res = await fetch("/api/admin/designs", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "seed_designs", site: siteId }),
                    });
                    if (!res.ok) throw new Error("Seed failed");
                    const data = await res.json();
                    toast.success(`Created ${data.created} designs (${data.skipped} already existed)`);
                    await loadData();
                  } catch {
                    toast.error("Failed to seed starter designs");
                  } finally {
                    setIsSeeding(false);
                  }
                }}
              >
                {isSeeding ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {isSeeding ? "Seeding..." : "Seed 10 Starter Designs"}
              </button>
            </div>
          </div>
        )}

        {/* Asset Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
            ))
          ) : (
            <>
              <StatCard icon={Layers} label="Total Designs" value={stats.totalDesigns} color="bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400" />
              <StatCard icon={FileText} label="PDFs Generated" value={stats.pdfsGenerated} color="bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400" />
              <StatCard icon={Video} label="Videos Rendered" value={stats.videosRendered} color="bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400" />
              <StatCard icon={Send} label="Emails Sent" value={stats.emailsSent} color="bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400" />
            </>
          )}
        </div>

        {/* Import / Seed Tools */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Import Assets</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 shrink-0">
                  <Film className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Canva Video Assets</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    Video clips across 4 collections (luxury travel, beach, aesthetic, brand)
                  </p>
                  <button
                    className="admin-btn admin-btn-primary text-sm px-3 py-1.5 mt-3 inline-flex items-center gap-1"
                    onClick={handleSeedCanvaVideos}
                    disabled={isSeedingVideos}
                  >
                    {isSeedingVideos ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Seeding...
                      </>
                    ) : (
                      <>
                        <Video className="h-4 w-4" />
                        Seed Canva Videos
                      </>
                    )}
                  </button>
                  {seedResult && (
                    <p className={`text-xs mt-2 ${seedResult.success ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                      {seedResult.success
                        ? `Done: ${seedResult.seeded} seeded, ${seedResult.skipped} already existed`
                        : "Seed failed"}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Canva Templates seed card */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 shrink-0">
                  <FileImage className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Canva Brand Templates</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    30 templates across 3 brands — PDF covers, social, Etsy, email headers
                  </p>
                  <button
                    className="admin-btn admin-btn-primary text-sm px-3 py-1.5 mt-3 inline-flex items-center gap-1"
                    onClick={handleSeedCanvaTemplates}
                    disabled={isSeedingTemplates}
                  >
                    {isSeedingTemplates ? (
                      <><RefreshCw className="h-4 w-4 animate-spin" /> Seeding...</>
                    ) : (
                      <><FileImage className="h-4 w-4" /> Seed Templates</>
                    )}
                  </button>
                  {templateSeedResult && (
                    <p className="text-xs mt-2 text-green-600 dark:text-green-400">
                      Done: {templateSeedResult.seeded} seeded, {templateSeedResult.skipped} existed
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Remotion Video Studio Setup card */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 shrink-0">
                  <Clapperboard className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Remotion Video Studio</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    8 branded video compositions — intros, content posts, promos, events
                  </p>

                  {/* Status indicators */}
                  {videoSetupStatus && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full ${videoSetupStatus.videoProjectExists ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"}`}>
                        {videoSetupStatus.videoProjectExists ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                        Project
                      </span>
                      <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full ${videoSetupStatus.allAssetsReady ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"}`}>
                        {videoSetupStatus.allAssetsReady ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                        Assets
                      </span>
                      <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full ${videoSetupStatus.nodeModulesExists ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"}`}>
                        {videoSetupStatus.nodeModulesExists ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                        Dependencies
                      </span>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {videoSetupStatus?.ready ? (
                      <span className="inline-flex items-center gap-1 text-sm text-green-600 dark:text-green-400 font-medium">
                        <CheckCircle className="h-4 w-4" />
                        Ready to render
                      </span>
                    ) : (
                      <>
                        <button
                          className="admin-btn admin-btn-primary text-sm px-3 py-1.5 inline-flex items-center gap-1"
                          onClick={() => handleVideoSetup("setup-all")}
                          disabled={videoSetupRunning}
                        >
                          {videoSetupRunning ? (
                            <><RefreshCw className="h-4 w-4 animate-spin" /> Setting up...</>
                          ) : (
                            <><Clapperboard className="h-4 w-4" /> Setup Everything</>
                          )}
                        </button>
                        <button
                          className="admin-btn admin-btn-secondary text-sm px-3 py-1.5 inline-flex items-center gap-1"
                          onClick={() => handleVideoSetup("copy-brand-assets")}
                          disabled={videoSetupRunning}
                        >
                          Copy Assets Only
                        </button>
                        <button
                          className="admin-btn admin-btn-secondary text-sm px-3 py-1.5 inline-flex items-center gap-1"
                          onClick={() => handleVideoSetup("install-deps")}
                          disabled={videoSetupRunning}
                        >
                          Install Deps Only
                        </button>
                      </>
                    )}
                  </div>

                  {/* Result feedback */}
                  {videoSetupResult && (
                    <div className={`text-xs mt-2 space-y-0.5 ${videoSetupResult.success ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                      {videoSetupResult.results?.map((r, i) => (
                        <div key={i} className="flex items-center gap-1">
                          {r.success ? <CheckCircle className="h-3 w-3 shrink-0" /> : <AlertCircle className="h-3 w-3 shrink-0" />}
                          <span>{r.step}: {r.detail}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Canva Brand Templates */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Canva Brand Templates</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">30 pre-designed templates across 3 brands — PDF covers, social posts, Etsy listings, email headers</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="yalla-london">Yalla London</option>
                <option value="zenitha-luxury">Zenitha.Luxury</option>
                <option value="zenitha-yachts">Zenitha Yachts</option>
              </select>
              <button
                className="admin-btn admin-btn-secondary text-sm px-3 py-1.5 inline-flex items-center gap-1"
                onClick={handleSeedCanvaTemplates}
                disabled={isSeedingTemplates}
              >
                {isSeedingTemplates ? (
                  <><RefreshCw className="h-4 w-4 animate-spin" /> Seeding...</>
                ) : (
                  <><Plus className="h-4 w-4" /> Seed All to Library</>
                )}
              </button>
            </div>
          </div>
          {templateSeedResult && (
            <p className="text-xs text-green-600 dark:text-green-400 mb-3">
              Done: {templateSeedResult.seeded} seeded, {templateSeedResult.skipped} already existed
            </p>
          )}
          {canvaTemplates.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {canvaTemplates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="group rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="aspect-[3/4] bg-gray-100 dark:bg-gray-800 relative overflow-hidden">
                    {(tpl.cdnUrl || tpl.previewUrl) ? (
                      <NextImage
                        src={tpl.cdnUrl || tpl.previewUrl || ""}
                        alt={tpl.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FileImage className="h-8 w-8 text-gray-300 dark:text-gray-600" />
                      </div>
                    )}
                    {tpl.canvaAssetId && (
                      <span className="absolute top-2 right-2 text-[10px] bg-black/50 text-white px-1.5 py-0.5 rounded">
                        Canva
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{tpl.name}</p>
                    {tpl.width && tpl.height && (
                      <p className="text-xs text-gray-400 dark:text-gray-500">{tpl.width}×{tpl.height}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-8 text-center">
              <FileImage className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading templates...</p>
            </div>
          )}
        </section>

        {/* One-Tap Branded Asset Generator */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">One-Tap Create</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Type a title, tap a format — branded image saved to your media library instantly.
          </p>

          {/* Title input */}
          <div className="flex gap-3 mb-4">
            <input
              type="text"
              value={quickCreateTitle}
              onChange={(e) => setQuickCreateTitle(e.target.value)}
              placeholder="Enter title (e.g., Top 5 Halal Restaurants in Mayfair)"
              className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400"
            />
          </div>

          {/* Format buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { action: "social-post", format: "square", label: "Instagram Post", sub: "1080×1080", icon: "📸" },
              { action: "social-post", format: "story", label: "Story / Reel", sub: "1080×1920", icon: "📱" },
              { action: "etsy-listing", label: "Etsy Listing", sub: "1200×800", icon: "🏷️" },
              { action: "email-header", label: "Email Header", sub: "600×200", icon: "✉️" },
              { action: "pdf-cover", label: "PDF Cover", sub: "1200×1600", icon: "📄" },
              { action: "blog-og", label: "Blog OG Image", sub: "1080×1080", icon: "🔗" },
            ].map((item) => (
              <button
                key={`${item.action}-${item.format || ""}`}
                onClick={() => handleQuickCreate(item.action, item.format)}
                disabled={quickCreating || !quickCreateTitle.trim()}
                className={`rounded-xl border p-4 text-left transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
                  quickCreating && quickCreateAction === item.action
                    ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-950"
                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-indigo-300"
                }`}
              >
                <div className="text-2xl mb-2">{item.icon}</div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {quickCreating && quickCreateAction === item.action ? (
                    <span className="inline-flex items-center gap-1">
                      <RefreshCw className="h-3 w-3 animate-spin" /> Creating...
                    </span>
                  ) : (
                    item.label
                  )}
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{item.sub}</div>
              </button>
            ))}
          </div>

          {/* Result preview */}
          {quickCreateResult && (
            <div className="mt-4 rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950 p-4 flex items-start gap-4">
              <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0">
                <NextImage
                  src={quickCreateResult.url}
                  alt="Generated asset"
                  width={quickCreateResult.width}
                  height={quickCreateResult.height}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </div>
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  <CheckCircle className="h-4 w-4 inline mr-1" />
                  {quickCreateResult.action} created and saved to media library
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  {quickCreateResult.width}×{quickCreateResult.height} — ready to use in articles, emails, and social posts
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Quick Create */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Create</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {QUICK_CREATE_ITEMS.map((item) => (
              <Link key={item.title} href={item.href}>
                <div className="cursor-pointer transition-all hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-600 group h-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                  <div className="p-5 flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900 transition-colors shrink-0">
                      <item.icon className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        {item.description}
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-300 dark:text-gray-600 group-hover:text-indigo-400 transition-colors ml-auto shrink-0 mt-1" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Brand Status per Site */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Brand Status</h2>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-28 rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {brandStatuses.map((brand) => (
                <Link key={brand.siteId} href={`/admin/brand-assets?site=${brand.siteId}`}>
                  <div className="cursor-pointer transition-all hover:shadow-md h-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                    <div className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className="w-8 h-8 rounded-lg shrink-0"
                          style={{ background: `linear-gradient(135deg, ${brand.primaryColor}, ${brand.secondaryColor})` }}
                        />
                        <span className="font-medium text-gray-900 dark:text-white text-sm truncate">
                          {brand.siteName}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span
                          className={`admin-status-badge text-xs px-2 py-0.5 rounded-full ${brand.assetCount > 0 ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"}`}
                        >
                          {brand.assetCount} asset{brand.assetCount !== 1 ? "s" : ""}
                        </span>
                        <span
                          className={`admin-status-badge text-xs px-2 py-0.5 rounded-full border ${brand.assetCount >= 5 ? "border-green-300 text-green-700 dark:border-green-700 dark:text-green-400" : "border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400"}`}
                        >
                          {brand.assetCount >= 5 ? "Complete" : "Setup needed"}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Recent Designs */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Designs</h2>
            <Link href="/admin/design-studio">
              <button className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 inline-flex items-center gap-1 px-2 py-1">
                View all <ArrowRight className="h-4 w-4 ml-1" />
              </button>
            </Link>
          </div>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-48 rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
              ))}
            </div>
          ) : designs.length === 0 ? (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
              <div className="p-12 text-center">
                <FileImage className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No designs yet</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Create your first design using the Quick Create cards above or open the Design Studio.
                </p>
                <Link href="/admin/design-studio">
                  <button className="admin-btn admin-btn-primary inline-flex items-center gap-1 px-4 py-2">
                    <Plus className="h-4 w-4 mr-2" />
                    Open Design Studio
                  </button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {designs.map((design) => (
                <Link key={design.id} href={`/admin/design-studio?id=${design.id}`}>
                  <div className="cursor-pointer transition-all hover:shadow-md group overflow-hidden h-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                    {/* Thumbnail */}
                    <div className="aspect-video bg-gray-100 dark:bg-gray-800 relative overflow-hidden">
                      {design.thumbnail ? (
                        <NextImage
                          src={design.thumbnail}
                          alt={design.title}
                          width={0}
                          height={0}
                          sizes="100vw"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          style={{ width: '100%', height: '100%' }}
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FileImage className="h-10 w-10 text-gray-300 dark:text-gray-600" />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="font-medium text-sm text-gray-900 dark:text-white truncate mb-2">
                        {design.title}
                      </h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getTypeBadgeColor(design.type)}`}>
                          {design.type}
                        </span>
                        {design.siteName && (
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {design.siteName}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 mt-2">
                        <Clock className="h-3 w-3" />
                        {formatDate(design.updatedAt)}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <div className="p-4 flex items-center gap-3">
        <div className={`p-2.5 rounded-xl ${color} shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{label}</p>
        </div>
      </div>
    </div>
  );
}
