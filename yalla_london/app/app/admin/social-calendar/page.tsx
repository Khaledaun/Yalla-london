"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import NextImage from "next/image";
import {
  AdminCard,
  AdminPageHeader,
  AdminButton,
  AdminStatusBadge,
  AdminLoadingState,
  AdminEmptyState,
  AdminAlertBanner,
  AdminSectionLabel,
  AdminKPICard,
} from "@/components/admin/admin-ui";
import {
  Calendar,
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Copy,
  Download,
  RefreshCw,
  Loader2,
  X,
  Send,
  Eye,
  Image as ImageIcon,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  isSameDay,
  isSameMonth,
  isToday,
  isTomorrow,
  parseISO,
  setHours,
  setMinutes,
} from "date-fns";
import { getDefaultSiteId } from "@/config/sites";
import { MediaPicker } from "@/components/shared/media-picker";

// ─── Types ───────────────────────────────────────────────────────

interface SocialPost {
  id: string;
  content: string;
  platforms: string[];
  site: string;
  status: "drafted" | "scheduled" | "published" | "failed";
  scheduledFor: string | null;
  publishedAt: string | null;
  media: string[];
  link: string | null;
}

// ─── Constants ───────────────────────────────────────────────────

const PLATFORM_CONFIG: Record<string, { label: string; icon: string; color: string; bgColor: string }> = {
  twitter: { label: "X (Twitter)", icon: "\uD835\uDD4F", color: "#1C1917", bgColor: "rgba(120,113,108,0.10)" },
  instagram: { label: "Instagram", icon: "\uD83D\uDCF8", color: "#C8322B", bgColor: "rgba(200,50,43,0.08)" },
  linkedin: { label: "LinkedIn", icon: "\uD83D\uDCBC", color: "#3B7EA1", bgColor: "rgba(59,126,161,0.08)" },
  tiktok: { label: "TikTok", icon: "\uD83C\uDFB5", color: "#1C1917", bgColor: "rgba(120,113,108,0.10)" },
  facebook: { label: "Facebook", icon: "\uD83D\uDCD8", color: "#3B7EA1", bgColor: "rgba(59,126,161,0.08)" },
};

const STATUS_MAP: Record<string, string> = {
  drafted: "draft",
  scheduled: "pending",
  published: "published",
  failed: "failed",
};

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6am to 10pm

// ─── Helpers ─────────────────────────────────────────────────────

function getPostDate(post: SocialPost): Date | null {
  const dateStr = post.scheduledFor || post.publishedAt;
  if (!dateStr) return null;
  try {
    return parseISO(dateStr);
  } catch {
    return null;
  }
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).then(
    () => toast.success("Copied to clipboard"),
    () => toast.error("Failed to copy")
  );
}

// ─── Main Component ──────────────────────────────────────────────

export default function SocialCalendarPage() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedPost, setSelectedPost] = useState<SocialPost | null>(null);
  const [showNewPost, setShowNewPost] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // New post form
  const [newPlatform, setNewPlatform] = useState("twitter");
  const [newSite, setNewSite] = useState(getDefaultSiteId());
  const [newContent, setNewContent] = useState("");
  const [newDate, setNewDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [newTime, setNewTime] = useState("09:00");
  const [newMedia, setNewMedia] = useState<string[]>([]);
  const [showMediaPicker, setShowMediaPicker] = useState(false);

  const loadPosts = useCallback(async () => {
    try {
      setFetchError(null);
      const res = await fetch("/api/admin/command-center/social/posts");
      if (res.ok) {
        const data = await res.json();
        const items = data.posts || data.data || [];
        setPosts(
          items.map((p: Record<string, unknown>) => ({
            id: String(p.id || ""),
            content: String(p.content || p.text || ""),
            platforms: Array.isArray(p.platforms) ? p.platforms.map(String) : [String(p.platform || "twitter")],
            site: String(p.site || p.siteId || p.site_id || ""),
            status: String(p.status || "drafted") as SocialPost["status"],
            scheduledFor: (p.scheduledFor || p.scheduled_for || null) as string | null,
            publishedAt: (p.publishedAt || p.published_at || null) as string | null,
            media: Array.isArray(p.media) ? p.media.map(String) : [],
            link: (p.link || p.url || null) as string | null,
          }))
        );
      } else {
        setPosts([]);
      }
    } catch (err) {
      console.warn("[social-calendar] Failed to load posts:", err);
      setFetchError("Failed to load social posts. Check your connection.");
      setPosts([]);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    loadPosts().finally(() => setIsLoading(false));
  }, [loadPosts]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadPosts();
    setIsRefreshing(false);
    toast.success("Calendar refreshed");
  };

  const handleCreatePost = async () => {
    setIsCreating(true);
    try {
      const scheduledFor = new Date(`${newDate}T${newTime}:00`).toISOString();
      const res = await fetch("/api/admin/command-center/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newContent,
          platforms: [newPlatform],
          site: newSite,
          scheduledFor,
          status: "scheduled",
          media: newMedia,
        }),
      });
      if (res.ok) {
        toast.success("Post scheduled");
        setShowNewPost(false);
        setNewContent("");
        setNewMedia([]);
        await loadPosts();
      } else {
        toast.error("Failed to create post");
      }
    } catch (err) {
      console.warn("[social-calendar] Failed to create post:", err);
      toast.error("Failed to create post");
    }
    setIsCreating(false);
  };

  const handleMarkPublished = async (postId: string) => {
    try {
      const res = await fetch("/api/admin/command-center/social/posts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: postId, status: "published" }),
      });
      if (res.ok) {
        toast.success("Marked as published");
        await loadPosts();
        setSelectedPost(null);
      } else {
        toast.error("Failed to update post");
      }
    } catch (err) {
      console.warn("[social-calendar] Failed to update post:", err);
      toast.error("Failed to update post");
    }
  };

  // Navigation
  const navigateBack = () => {
    setCurrentDate(viewMode === "week" ? subWeeks(currentDate, 1) : subMonths(currentDate, 1));
  };
  const navigateForward = () => {
    setCurrentDate(viewMode === "week" ? addWeeks(currentDate, 1) : addMonths(currentDate, 1));
  };
  const goToToday = () => setCurrentDate(new Date());

  // Build calendar days
  const calendarDays = useMemo(() => {
    if (viewMode === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
    } else {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const start = startOfWeek(monthStart, { weekStartsOn: 1 });
      const end = endOfWeek(monthEnd, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
    }
  }, [currentDate, viewMode]);

  // Group posts by date
  const postsByDate = useMemo(() => {
    const map = new Map<string, SocialPost[]>();
    for (const post of posts) {
      const d = getPostDate(post);
      if (d) {
        const key = format(d, "yyyy-MM-dd");
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(post);
      }
    }
    return map;
  }, [posts]);

  // Posts due today/tomorrow for Publish Assistant
  const todayPosts = posts.filter((p) => {
    const d = getPostDate(p);
    return d && isToday(d) && p.status !== "published";
  });
  const tomorrowPosts = posts.filter((p) => {
    const d = getPostDate(p);
    return d && isTomorrow(d) && p.status !== "published";
  });
  const upcomingPosts = [...todayPosts, ...tomorrowPosts];

  // KPI stats
  const totalPosts = posts.length;
  const scheduledCount = posts.filter(p => p.status === "scheduled").length;
  const publishedCount = posts.filter(p => p.status === "published").length;
  const draftCount = posts.filter(p => p.status === "drafted").length;

  // ─── Render ──────────────────────────────────────────────────

  return (
    <div className="admin-page p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <AdminPageHeader
          title="Social Calendar"
          subtitle="Schedule and manage social media posts across platforms"
          action={
            <div className="flex items-center gap-2">
              <AdminButton
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                loading={isRefreshing}
              >
                <RefreshCw size={14} />
                Refresh
              </AdminButton>
              <AdminButton
                variant="primary"
                size="sm"
                onClick={() => setShowNewPost(true)}
              >
                <Plus size={14} />
                New Post
              </AdminButton>
            </div>
          }
        />

        {/* Platform Status Banner */}
        <div
          className="flex items-center gap-3 overflow-x-auto mb-4 py-2.5 px-3 rounded-xl"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid rgba(214,208,196,0.5)",
            fontFamily: "var(--font-system)",
          }}
        >
          {Object.entries(PLATFORM_CONFIG).map(([key, conf]) => {
            const isTwitter = key === "twitter";
            const hasPostsOnPlatform = posts.some((p) => p.platforms.includes(key) && p.status === "published");
            const isConnected = isTwitter && hasPostsOnPlatform;
            return (
              <div
                key={key}
                className="flex items-center gap-1.5 shrink-0"
                style={{ fontSize: 11 }}
              >
                <span
                  className="inline-block w-2 h-2 rounded-full shrink-0"
                  style={{
                    backgroundColor: isConnected ? "#2D5A3D" : "#C49A2A",
                  }}
                />
                <span style={{ fontWeight: 600, color: "#44403C" }}>
                  {conf.icon} {conf.label}
                </span>
                <span style={{ color: "#A8A29E", fontSize: 10, whiteSpace: "nowrap" }}>
                  {isConnected ? "Connected" : "Manual Only"}
                </span>
              </div>
            );
          })}
          <span
            className="shrink-0 text-amber-600 pl-2"
            style={{
              borderLeft: "1px solid rgba(214,208,196,0.5)",
              fontSize: 10,
              whiteSpace: "nowrap",
            }}
          >
            Manual = Copy &amp; Post workflow
          </span>
        </div>

        {/* Error Banner */}
        {fetchError && (
          <AdminAlertBanner
            severity="critical"
            message={fetchError}
            onDismiss={() => setFetchError(null)}
            action={
              <AdminButton variant="ghost" size="sm" onClick={handleRefresh}>
                Retry
              </AdminButton>
            }
          />
        )}

        {/* KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <AdminKPICard value={totalPosts} label="Total Posts" color="#1C1917" />
          <AdminKPICard value={scheduledCount} label="Scheduled" color="#C49A2A" />
          <AdminKPICard value={publishedCount} label="Published" color="#2D5A3D" />
          <AdminKPICard value={draftCount} label="Drafts" color="#3B7EA1" />
        </div>

        {/* View Toggle + Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setViewMode("week")}
              className={`admin-filter-pill ${viewMode === "week" ? "active" : ""}`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode("month")}
              className={`admin-filter-pill ${viewMode === "month" ? "active" : ""}`}
            >
              Month
            </button>
          </div>
          <div className="flex items-center gap-2">
            <AdminButton variant="ghost" size="sm" onClick={navigateBack}>
              <ChevronLeft size={14} />
            </AdminButton>
            <AdminButton variant="ghost" size="sm" onClick={goToToday}>
              Today
            </AdminButton>
            <span
              style={{
                fontFamily: "var(--font-system)",
                fontSize: 12,
                fontWeight: 600,
                color: "#44403C",
                minWidth: 160,
                textAlign: "center",
                display: "inline-block",
              }}
            >
              {viewMode === "week"
                ? `${format(calendarDays[0], "d MMM")} \u2013 ${format(calendarDays[calendarDays.length - 1], "d MMM yyyy")}`
                : format(currentDate, "MMMM yyyy")}
            </span>
            <AdminButton variant="ghost" size="sm" onClick={navigateForward}>
              <ChevronRight size={14} />
            </AdminButton>
          </div>
        </div>

        {/* Calendar Grid */}
        {isLoading ? (
          <AdminLoadingState label="Loading calendar..." />
        ) : viewMode === "week" ? (
          <WeekView
            days={calendarDays}
            postsByDate={postsByDate}
            onSelectPost={setSelectedPost}
          />
        ) : (
          <MonthView
            days={calendarDays}
            currentDate={currentDate}
            postsByDate={postsByDate}
            onSelectPost={setSelectedPost}
          />
        )}

        {/* Publish Assistant */}
        <section className="mt-6">
          <AdminSectionLabel>Publish Assistant</AdminSectionLabel>
          {upcomingPosts.length === 0 ? (
            <AdminEmptyState
              icon={CheckCircle}
              title="All caught up"
              description="No posts due today or tomorrow."
            />
          ) : (
            <div className="space-y-3">
              {upcomingPosts.map((post) => {
                const postDate = getPostDate(post);

                return (
                  <AdminCard key={post.id} className="hover:shadow-md transition-all">
                    <div className="p-4">
                      <div className="flex flex-col sm:flex-row gap-3">
                        {/* Platform icons + time */}
                        <div className="flex items-center gap-2 shrink-0">
                          {post.platforms.map((p) => {
                            const pConf = PLATFORM_CONFIG[p];
                            return pConf ? (
                              <span
                                key={p}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                                style={{ backgroundColor: pConf.bgColor }}
                                title={pConf.label}
                              >
                                {pConf.icon}
                              </span>
                            ) : null;
                          })}
                          <div style={{ fontFamily: "var(--font-system)", fontSize: 11, color: "#78716C", marginLeft: 4 }}>
                            {postDate ? format(postDate, "HH:mm") : "--:--"}
                            <div style={{
                              fontSize: 10,
                              fontWeight: 600,
                              color: postDate && isToday(postDate) ? "#C49A2A" : "#A8A29E",
                            }}>
                              {postDate && isToday(postDate) ? "Today" : "Tomorrow"}
                            </div>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p style={{ fontFamily: "var(--font-system)", fontSize: 13, color: "#1C1917", lineHeight: 1.5 }} className="line-clamp-2">
                            {post.content}
                          </p>
                          {post.media.length > 0 && (
                            <div className="flex items-center gap-1 mt-1" style={{ fontFamily: "var(--font-system)", fontSize: 10, color: "#A8A29E" }}>
                              <ImageIcon size={10} />
                              {post.media.length} image{post.media.length !== 1 ? "s" : ""}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
                          <AdminStatusBadge status={STATUS_MAP[post.status] || post.status} />
                          <AdminButton
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(post.content)}
                          >
                            <Copy size={12} />
                            Copy
                          </AdminButton>
                          {post.media.length > 0 && (
                            <AdminButton
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const url = post.media[0];
                                if (url) window.open(url, "_blank");
                              }}
                            >
                              <Download size={12} />
                              Media
                            </AdminButton>
                          )}
                          {post.status !== "published" && (
                            <AdminButton
                              variant="success"
                              size="sm"
                              onClick={() => handleMarkPublished(post.id)}
                            >
                              <CheckCircle size={12} />
                              Published
                            </AdminButton>
                          )}
                        </div>
                      </div>
                    </div>
                  </AdminCard>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Post Detail Modal */}
      {selectedPost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(28,25,23,0.4)" }}
          onClick={() => setSelectedPost(null)}
        >
          <div
            className="admin-card-elevated w-full max-w-lg max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between p-5 pb-0">
              <div>
                <h2
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 800,
                    fontSize: 18,
                    color: "#1C1917",
                    lineHeight: 1.2,
                  }}
                >
                  Post Details
                </h2>
                <p style={{ fontFamily: "var(--font-system)", fontSize: 11, color: "#78716C", marginTop: 4 }}>
                  {selectedPost.scheduledFor
                    ? `Scheduled for ${format(parseISO(selectedPost.scheduledFor), "d MMM yyyy 'at' HH:mm")}`
                    : "No schedule set"}
                </p>
              </div>
              <button
                onClick={() => setSelectedPost(null)}
                className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors text-stone-400 hover:text-stone-700"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Platforms */}
              <div className="flex items-center gap-2 flex-wrap">
                {selectedPost.platforms.map((p) => {
                  const pConf = PLATFORM_CONFIG[p];
                  return pConf ? (
                    <span
                      key={p}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                      style={{
                        backgroundColor: pConf.bgColor,
                        fontFamily: "var(--font-system)",
                        fontSize: 11,
                        fontWeight: 600,
                        color: pConf.color,
                      }}
                    >
                      {pConf.icon} {pConf.label}
                    </span>
                  ) : (
                    <AdminStatusBadge key={p} status={p} label={p} />
                  );
                })}
              </div>

              {/* Status */}
              <div>
                <AdminStatusBadge status={STATUS_MAP[selectedPost.status] || selectedPost.status} />
              </div>

              {/* Content */}
              <div className="admin-card-inset rounded-lg p-4">
                <p style={{ fontFamily: "var(--font-system)", fontSize: 13, color: "#1C1917", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                  {selectedPost.content}
                </p>
              </div>

              {/* Media preview */}
              {selectedPost.media.length > 0 && (
                <div>
                  <p style={{ fontFamily: "var(--font-system)", fontSize: 10, fontWeight: 600, color: "#78716C", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>
                    Media
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedPost.media.map((url, i) => (
                      <div key={i} className="aspect-video rounded-lg overflow-hidden" style={{ backgroundColor: "#FAF8F4", border: "1px solid rgba(214,208,196,0.6)" }}>
                        <NextImage
                          src={url}
                          alt={`Media ${i + 1}`}
                          width={0}
                          height={0}
                          sizes="50vw"
                          className="w-full h-full object-cover"
                          style={{ width: '100%', height: '100%' }}
                          unoptimized
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 p-5 pt-0">
              <AdminButton
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(selectedPost.content)}
              >
                <Copy size={12} />
                Copy Text
              </AdminButton>
              {selectedPost.status !== "published" && (
                <AdminButton
                  variant="success"
                  size="sm"
                  onClick={() => handleMarkPublished(selectedPost.id)}
                >
                  <CheckCircle size={12} />
                  Mark Published
                </AdminButton>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Media Picker */}
      <MediaPicker
        isOpen={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={(url) => setNewMedia((prev) => [...prev, url])}
        accept="image"
      />

      {/* New Post Modal */}
      {showNewPost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(28,25,23,0.4)" }}
          onClick={() => setShowNewPost(false)}
        >
          <div
            className="admin-card-elevated w-full max-w-md max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between p-5 pb-0">
              <div>
                <h2
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 800,
                    fontSize: 18,
                    color: "#1C1917",
                    lineHeight: 1.2,
                  }}
                >
                  New Social Post
                </h2>
                <p style={{ fontFamily: "var(--font-system)", fontSize: 11, color: "#78716C", marginTop: 4 }}>
                  Create and schedule a social media post.
                </p>
              </div>
              <button
                onClick={() => setShowNewPost(false)}
                className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors text-stone-400 hover:text-stone-700"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Platform */}
              <div>
                <label
                  htmlFor="post-platform"
                  style={{ fontFamily: "var(--font-system)", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", color: "#78716C", display: "block", marginBottom: 6 }}
                >
                  Platform
                </label>
                <select
                  id="post-platform"
                  className="admin-select"
                  value={newPlatform}
                  onChange={(e) => setNewPlatform(e.target.value)}
                >
                  {Object.entries(PLATFORM_CONFIG).map(([key, conf]) => (
                    <option key={key} value={key}>
                      {conf.icon} {conf.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Content */}
              <div>
                <label
                  htmlFor="post-content"
                  style={{ fontFamily: "var(--font-system)", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", color: "#78716C", display: "block", marginBottom: 6 }}
                >
                  Content
                </label>
                <textarea
                  id="post-content"
                  className="admin-input"
                  style={{ minHeight: 100, resize: "vertical" }}
                  placeholder="Write your post content..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                />
                <p style={{ fontFamily: "var(--font-system)", fontSize: 10, color: "#A8A29E", marginTop: 4 }}>
                  {newContent.length} characters
                </p>
              </div>

              {/* Date + Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="post-date"
                    style={{ fontFamily: "var(--font-system)", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", color: "#78716C", display: "block", marginBottom: 6 }}
                  >
                    Date
                  </label>
                  <input
                    id="post-date"
                    type="date"
                    className="admin-input"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                  />
                </div>
                <div>
                  <label
                    htmlFor="post-time"
                    style={{ fontFamily: "var(--font-system)", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", color: "#78716C", display: "block", marginBottom: 6 }}
                  >
                    Time
                  </label>
                  <input
                    id="post-time"
                    type="time"
                    className="admin-input"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                  />
                </div>
              </div>

              {/* Media */}
              <div>
                {newMedia.length > 0 && (
                  <div className="flex gap-2 flex-wrap mb-3">
                    {newMedia.map((url, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden" style={{ border: "1px solid rgba(214,208,196,0.6)" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={`Media ${i + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setNewMedia((prev) => prev.filter((_, idx) => idx !== i))}
                          className="absolute top-0 right-0 bg-black/60 text-white rounded-bl p-0.5"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setShowMediaPicker(true)}
                  className="w-full rounded-xl p-4 text-center transition-colors"
                  style={{
                    border: "1px dashed rgba(214,208,196,0.8)",
                    backgroundColor: "#FAFAF8",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#3B7EA1";
                    e.currentTarget.style.backgroundColor = "rgba(59,126,161,0.04)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(214,208,196,0.8)";
                    e.currentTarget.style.backgroundColor = "#FAFAF8";
                  }}
                >
                  <ImageIcon size={24} color="#A8A29E" className="mx-auto mb-2" />
                  <p style={{ fontFamily: "var(--font-system)", fontSize: 11, color: "#78716C" }}>
                    {newMedia.length > 0 ? "Add another image" : "Add image"}
                  </p>
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 p-5 pt-0">
              <AdminButton variant="ghost" size="sm" onClick={() => setShowNewPost(false)}>
                Cancel
              </AdminButton>
              <AdminButton
                variant="primary"
                size="sm"
                onClick={handleCreatePost}
                loading={isCreating}
                disabled={!newContent.trim()}
              >
                <Send size={12} />
                Schedule Post
              </AdminButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Week View ───────────────────────────────────────────────────

function WeekView({
  days,
  postsByDate,
  onSelectPost,
}: {
  days: Date[];
  postsByDate: Map<string, SocialPost[]>;
  onSelectPost: (post: SocialPost) => void;
}) {
  return (
    <AdminCard>
      <div className="overflow-x-auto">
        <div style={{ minWidth: 700 }}>
          {/* Day headers */}
          <div className="grid grid-cols-7" style={{ borderBottom: "1px solid rgba(214,208,196,0.5)" }}>
            {days.map((day) => (
              <div
                key={day.toISOString()}
                className="p-3 text-center"
                style={{
                  borderRight: "1px solid rgba(214,208,196,0.3)",
                  backgroundColor: isToday(day) ? "rgba(59,126,161,0.06)" : undefined,
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-system)",
                    fontSize: 9,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "1.5px",
                    color: "#A8A29E",
                  }}
                >
                  {format(day, "EEE")}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 800,
                    fontSize: 18,
                    marginTop: 2,
                    color: isToday(day) ? "#3B7EA1" : "#1C1917",
                  }}
                >
                  {format(day, "d")}
                </div>
              </div>
            ))}
          </div>

          {/* Time slots */}
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="grid grid-cols-7"
              style={{ borderBottom: "1px solid rgba(214,208,196,0.2)", minHeight: 48 }}
            >
              {days.map((day) => {
                const dayKey = format(day, "yyyy-MM-dd");
                const dayPosts = postsByDate.get(dayKey) || [];
                const hourPosts = dayPosts.filter((p) => {
                  const d = getPostDate(p);
                  return d && d.getHours() === hour;
                });

                return (
                  <div
                    key={`${dayKey}-${hour}`}
                    className="relative p-0.5"
                    style={{
                      borderRight: "1px solid rgba(214,208,196,0.15)",
                      backgroundColor: isToday(day) ? "rgba(59,126,161,0.03)" : undefined,
                    }}
                  >
                    {/* Show hour label only in first column */}
                    {days[0] === day && (
                      <span
                        className="absolute px-1"
                        style={{
                          left: 0,
                          top: 0,
                          fontFamily: "var(--font-system)",
                          fontSize: 9,
                          color: "#A8A29E",
                        }}
                      >
                        {String(hour).padStart(2, "0")}:00
                      </span>
                    )}
                    {hourPosts.map((post) => (
                      <button
                        key={post.id}
                        className="w-full text-left px-1.5 py-1 rounded-md mb-0.5 truncate cursor-pointer transition-opacity hover:opacity-80"
                        style={{
                          fontFamily: "var(--font-system)",
                          fontSize: 10,
                          backgroundColor: PLATFORM_CONFIG[post.platforms[0]]?.bgColor || "rgba(120,113,108,0.10)",
                          color: PLATFORM_CONFIG[post.platforms[0]]?.color || "#1C1917",
                        }}
                        onClick={() => onSelectPost(post)}
                        title={post.content}
                      >
                        <span className="mr-1">
                          {PLATFORM_CONFIG[post.platforms[0]]?.icon || ""}
                        </span>
                        {post.content.slice(0, 30)}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </AdminCard>
  );
}

// ─── Month View ──────────────────────────────────────────────────

function MonthView({
  days,
  currentDate,
  postsByDate,
  onSelectPost,
}: {
  days: Date[];
  currentDate: Date;
  postsByDate: Map<string, SocialPost[]>;
  onSelectPost: (post: SocialPost) => void;
}) {
  return (
    <AdminCard>
      <div className="overflow-x-auto">
        <div style={{ minWidth: 700 }}>
          {/* Day of week headers */}
          <div className="grid grid-cols-7" style={{ borderBottom: "1px solid rgba(214,208,196,0.5)" }}>
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div
                key={d}
                className="p-2 text-center"
                style={{
                  borderRight: "1px solid rgba(214,208,196,0.3)",
                  fontFamily: "var(--font-system)",
                  fontSize: 9,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "1.5px",
                  color: "#A8A29E",
                }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar cells */}
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const dayKey = format(day, "yyyy-MM-dd");
              const dayPosts = postsByDate.get(dayKey) || [];
              const inMonth = isSameMonth(day, currentDate);

              return (
                <div
                  key={dayKey}
                  className="p-1.5"
                  style={{
                    minHeight: 100,
                    borderRight: "1px solid rgba(214,208,196,0.15)",
                    borderBottom: "1px solid rgba(214,208,196,0.15)",
                    opacity: inMonth ? 1 : 0.4,
                    backgroundColor: isToday(day)
                      ? "rgba(59,126,161,0.06)"
                      : !inMonth
                        ? "#FAFAF8"
                        : undefined,
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-system)",
                      fontSize: 11,
                      fontWeight: isToday(day) ? 800 : 600,
                      color: isToday(day) ? "#3B7EA1" : "#44403C",
                      marginBottom: 4,
                    }}
                  >
                    {format(day, "d")}
                  </div>
                  <div className="space-y-0.5">
                    {dayPosts.slice(0, 3).map((post) => (
                      <button
                        key={post.id}
                        className="w-full text-left leading-tight px-1.5 py-0.5 rounded truncate cursor-pointer transition-opacity hover:opacity-80"
                        style={{
                          fontFamily: "var(--font-system)",
                          fontSize: 9,
                          backgroundColor: PLATFORM_CONFIG[post.platforms[0]]?.bgColor || "rgba(120,113,108,0.10)",
                          color: PLATFORM_CONFIG[post.platforms[0]]?.color || "#1C1917",
                        }}
                        onClick={() => onSelectPost(post)}
                        title={post.content}
                      >
                        {PLATFORM_CONFIG[post.platforms[0]]?.icon || ""}{" "}
                        {post.content.slice(0, 20)}
                      </button>
                    ))}
                    {dayPosts.length > 3 && (
                      <div style={{ fontFamily: "var(--font-system)", fontSize: 9, color: "#A8A29E", paddingLeft: 4 }}>
                        +{dayPosts.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AdminCard>
  );
}
