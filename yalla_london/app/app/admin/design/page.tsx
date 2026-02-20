"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "lucide-react";
import { toast } from "sonner";

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

// ─── Site config (client-side, matches server config) ────────────

const SITE_LIST: { id: string; name: string; primaryColor: string; secondaryColor: string }[] = [
  { id: "yalla-london", name: "Yalla London", primaryColor: "#1C1917", secondaryColor: "#C8322B" },
  { id: "arabaldives", name: "Arabaldives", primaryColor: "#0891B2", secondaryColor: "#06B6D4" },
  { id: "french-riviera", name: "Yalla Riviera", primaryColor: "#1E3A5F", secondaryColor: "#D4AF37" },
  { id: "istanbul", name: "Yalla Istanbul", primaryColor: "#DC2626", secondaryColor: "#DC2626" },
  { id: "thailand", name: "Yalla Thailand", primaryColor: "#059669", secondaryColor: "#059669" },
];

// ─── Quick Create items ──────────────────────────────────────────

const QUICK_CREATE_ITEMS = [
  { title: "Social Post", icon: ImageIcon, href: "/admin/design-studio?type=social", description: "Create a social media graphic" },
  { title: "Email Template", icon: Mail, href: "/admin/design-studio?type=email", description: "Design an email layout" },
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

export default function DesignHubPage() {
  const [designs, setDesigns] = useState<Design[]>([]);
  const [brandStatuses, setBrandStatuses] = useState<BrandStatus[]>([]);
  const [stats, setStats] = useState<AssetStats>({ totalDesigns: 0, pdfsGenerated: 0, videosRendered: 0, emailsSent: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadData();
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
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Link href="/admin/design-studio">
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Open Studio
              </Button>
            </Link>
          </div>
        </div>

        {/* Asset Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
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

        {/* Quick Create */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Create</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {QUICK_CREATE_ITEMS.map((item) => (
              <Link key={item.title} href={item.href}>
                <Card className="cursor-pointer transition-all hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-600 group h-full">
                  <CardContent className="p-5 flex items-start gap-4">
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
                  </CardContent>
                </Card>
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
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {brandStatuses.map((brand) => (
                <Link key={brand.siteId} href={`/admin/brand-assets?site=${brand.siteId}`}>
                  <Card className="cursor-pointer transition-all hover:shadow-md h-full">
                    <CardContent className="p-4">
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
                        <Badge
                          variant={brand.assetCount > 0 ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {brand.assetCount} asset{brand.assetCount !== 1 ? "s" : ""}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-xs ${brand.assetCount >= 5 ? "border-green-300 text-green-700 dark:border-green-700 dark:text-green-400" : "border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400"}`}
                        >
                          {brand.assetCount >= 5 ? "Complete" : "Setup needed"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
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
              <Button variant="ghost" size="sm">
                View all <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-xl" />
              ))}
            </div>
          ) : designs.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FileImage className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No designs yet</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Create your first design using the Quick Create cards above or open the Design Studio.
                </p>
                <Link href="/admin/design-studio">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Open Design Studio
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {designs.map((design) => (
                <Link key={design.id} href={`/admin/design-studio?id=${design.id}`}>
                  <Card className="cursor-pointer transition-all hover:shadow-md group overflow-hidden h-full">
                    {/* Thumbnail */}
                    <div className="aspect-video bg-gray-100 dark:bg-gray-800 relative overflow-hidden">
                      {design.thumbnail ? (
                        <img
                          src={design.thumbnail}
                          alt={design.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FileImage className="h-10 w-10 text-gray-300 dark:text-gray-600" />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-3">
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
                    </CardContent>
                  </Card>
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
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2.5 rounded-xl ${color} shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
