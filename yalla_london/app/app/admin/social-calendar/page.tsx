"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
  twitter: { label: "X (Twitter)", icon: "\uD835\uDD4F", color: "text-gray-900 dark:text-white", bgColor: "bg-gray-200 dark:bg-gray-700" },
  instagram: { label: "Instagram", icon: "\uD83D\uDCF8", color: "text-pink-700 dark:text-pink-300", bgColor: "bg-pink-100 dark:bg-pink-900" },
  linkedin: { label: "LinkedIn", icon: "\uD83D\uDCBC", color: "text-blue-700 dark:text-blue-300", bgColor: "bg-blue-100 dark:bg-blue-900" },
  tiktok: { label: "TikTok", icon: "\uD83C\uDFB5", color: "text-gray-900 dark:text-white", bgColor: "bg-gray-200 dark:bg-gray-700" },
  facebook: { label: "Facebook", icon: "\uD83D\uDCD8", color: "text-blue-700 dark:text-blue-300", bgColor: "bg-blue-100 dark:bg-blue-900" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; dotColor: string }> = {
  drafted: { label: "Drafted", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300", dotColor: "bg-gray-400" },
  scheduled: { label: "Scheduled", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300", dotColor: "bg-blue-500" },
  published: { label: "Published", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300", dotColor: "bg-green-500" },
  failed: { label: "Failed", color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300", dotColor: "bg-red-500" },
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

  // New post form
  const [newPlatform, setNewPlatform] = useState("twitter");
  const [newContent, setNewContent] = useState("");
  const [newDate, setNewDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [newTime, setNewTime] = useState("09:00");

  const loadPosts = useCallback(async () => {
    try {
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
          site: "yalla-london",
          scheduledFor,
          status: "scheduled",
        }),
      });
      if (res.ok) {
        toast.success("Post scheduled");
        setShowNewPost(false);
        setNewContent("");
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

  // ─── Render ──────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Calendar className="h-7 w-7 text-pink-600" />
              Social Calendar
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Schedule and manage social media posts across platforms
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setShowNewPost(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Post
            </Button>
          </div>
        </div>

        {/* View Toggle + Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "week" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("week")}
            >
              Week
            </Button>
            <Button
              variant={viewMode === "month" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("month")}
            >
              Month
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={navigateBack}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[160px] text-center">
              {viewMode === "week"
                ? `${format(calendarDays[0], "d MMM")} - ${format(calendarDays[calendarDays.length - 1], "d MMM yyyy")}`
                : format(currentDate, "MMMM yyyy")}
            </span>
            <Button variant="outline" size="sm" onClick={navigateForward}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Calendar Grid */}
        {isLoading ? (
          <Skeleton className="h-96 rounded-xl" />
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
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Publish Assistant
          </h2>
          {upcomingPosts.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle className="h-10 w-10 text-green-400 mx-auto mb-3" />
                <h3 className="font-medium text-gray-900 dark:text-white mb-1">All caught up</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No posts due today or tomorrow.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {upcomingPosts.map((post) => {
                const postDate = getPostDate(post);
                const statusConf = STATUS_CONFIG[post.status] || STATUS_CONFIG.drafted;

                return (
                  <Card key={post.id} className="hover:shadow-md transition-all">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row gap-3">
                        {/* Platform icons + time */}
                        <div className="flex items-center gap-2 shrink-0">
                          {post.platforms.map((p) => {
                            const pConf = PLATFORM_CONFIG[p];
                            return pConf ? (
                              <span
                                key={p}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${pConf.bgColor}`}
                                title={pConf.label}
                              >
                                {pConf.icon}
                              </span>
                            ) : null;
                          })}
                          <div className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                            {postDate ? format(postDate, "HH:mm") : "--:--"}
                            <div className={`text-xs ${isToday(postDate!) ? "text-amber-600 font-medium" : "text-gray-400"}`}>
                              {postDate && isToday(postDate) ? "Today" : "Tomorrow"}
                            </div>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 dark:text-white line-clamp-2">
                            {post.content}
                          </p>
                          {post.media.length > 0 && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                              <ImageIcon className="h-3 w-3" />
                              {post.media.length} image{post.media.length !== 1 ? "s" : ""}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
                          <Badge className={`text-xs border-0 ${statusConf.color}`}>
                            {statusConf.label}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(post.content)}
                            title="Copy text"
                          >
                            <Copy className="h-3.5 w-3.5 mr-1" />
                            Copy
                          </Button>
                          {post.media.length > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              title="Download media"
                              onClick={() => {
                                // Open the first media URL in a new tab for download
                                const url = post.media[0];
                                if (url) window.open(url, "_blank");
                              }}
                            >
                              <Download className="h-3.5 w-3.5 mr-1" />
                              Media
                            </Button>
                          )}
                          {post.status !== "published" && (
                            <Button
                              size="sm"
                              onClick={() => handleMarkPublished(post.id)}
                            >
                              <CheckCircle className="h-3.5 w-3.5 mr-1" />
                              Published
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Post Detail Dialog */}
      <Dialog open={!!selectedPost} onOpenChange={(open) => { if (!open) setSelectedPost(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Post Details</DialogTitle>
            <DialogDescription>
              {selectedPost?.scheduledFor
                ? `Scheduled for ${format(parseISO(selectedPost.scheduledFor), "d MMM yyyy 'at' HH:mm")}`
                : "No schedule set"}
            </DialogDescription>
          </DialogHeader>
          {selectedPost && (
            <div className="space-y-4 py-2">
              {/* Platforms */}
              <div className="flex items-center gap-2">
                {selectedPost.platforms.map((p) => {
                  const pConf = PLATFORM_CONFIG[p];
                  return pConf ? (
                    <span
                      key={p}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium ${pConf.bgColor} ${pConf.color}`}
                    >
                      {pConf.icon} {pConf.label}
                    </span>
                  ) : (
                    <Badge key={p} variant="secondary">{p}</Badge>
                  );
                })}
              </div>

              {/* Status */}
              <div>
                <Badge className={`text-xs border-0 ${(STATUS_CONFIG[selectedPost.status] || STATUS_CONFIG.drafted).color}`}>
                  {(STATUS_CONFIG[selectedPost.status] || STATUS_CONFIG.drafted).label}
                </Badge>
              </div>

              {/* Content */}
              <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-4">
                <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                  {selectedPost.content}
                </p>
              </div>

              {/* Media preview */}
              {selectedPost.media.length > 0 && (
                <div>
                  <Label className="text-xs text-gray-500 mb-2 block">Media</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedPost.media.map((url, i) => (
                      <div key={i} className="aspect-video rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden">
                        <img
                          src={url}
                          alt={`Media ${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => selectedPost && copyToClipboard(selectedPost.content)}
            >
              <Copy className="h-3.5 w-3.5 mr-1" />
              Copy Text
            </Button>
            {selectedPost && selectedPost.status !== "published" && (
              <Button
                size="sm"
                onClick={() => selectedPost && handleMarkPublished(selectedPost.id)}
              >
                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                Mark Published
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Post Dialog */}
      <Dialog open={showNewPost} onOpenChange={setShowNewPost}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Social Post</DialogTitle>
            <DialogDescription>
              Create and schedule a social media post.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="post-platform">Platform</Label>
              <Select value={newPlatform} onValueChange={setNewPlatform}>
                <SelectTrigger id="post-platform">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PLATFORM_CONFIG).map(([key, conf]) => (
                    <SelectItem key={key} value={key}>
                      {conf.icon} {conf.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="post-content">Content</Label>
              <textarea
                id="post-content"
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[100px] resize-y"
                placeholder="Write your post content..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {newContent.length} characters
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="post-date">Date</Label>
                <Input
                  id="post-date"
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="post-time">Time</Label>
                <Input
                  id="post-time"
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                />
              </div>
            </div>
            <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-4 text-center">
              <ImageIcon className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Image upload coming soon
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewPost(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePost} disabled={isCreating || !newContent.trim()}>
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Scheduling...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Schedule Post
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-800">
            {days.map((day) => (
              <div
                key={day.toISOString()}
                className={`p-3 text-center border-r last:border-r-0 border-gray-200 dark:border-gray-800 ${
                  isToday(day) ? "bg-blue-50 dark:bg-blue-950" : ""
                }`}
              >
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                  {format(day, "EEE")}
                </div>
                <div
                  className={`text-lg font-semibold mt-0.5 ${
                    isToday(day)
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-gray-900 dark:text-white"
                  }`}
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
              className="grid grid-cols-7 border-b last:border-b-0 border-gray-100 dark:border-gray-800/50 min-h-[48px]"
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
                    className={`relative border-r last:border-r-0 border-gray-100 dark:border-gray-800/50 p-0.5 ${
                      isToday(day) ? "bg-blue-50/30 dark:bg-blue-950/20" : ""
                    }`}
                  >
                    {/* Show hour label only in first column */}
                    {days[0] === day && (
                      <span className="absolute -left-0 top-0 text-[10px] text-gray-400 dark:text-gray-600 px-1">
                        {String(hour).padStart(2, "0")}:00
                      </span>
                    )}
                    {hourPosts.map((post) => (
                      <button
                        key={post.id}
                        className={`w-full text-left text-xs px-1.5 py-1 rounded mb-0.5 truncate cursor-pointer transition-opacity hover:opacity-80 ${
                          post.platforms[0]
                            ? (PLATFORM_CONFIG[post.platforms[0]]?.bgColor || "bg-gray-200 dark:bg-gray-700")
                            : "bg-gray-200 dark:bg-gray-700"
                        }`}
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
    </Card>
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
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          {/* Day of week headers */}
          <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-800">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div
                key={d}
                className="p-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase border-r last:border-r-0 border-gray-200 dark:border-gray-800"
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
                  className={`min-h-[100px] p-1.5 border-r border-b last:border-r-0 border-gray-100 dark:border-gray-800/50 ${
                    !inMonth ? "bg-gray-50 dark:bg-gray-900/50 opacity-50" : ""
                  } ${isToday(day) ? "bg-blue-50/50 dark:bg-blue-950/30" : ""}`}
                >
                  <div
                    className={`text-xs font-medium mb-1 ${
                      isToday(day)
                        ? "text-blue-600 dark:text-blue-400 font-bold"
                        : "text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {format(day, "d")}
                  </div>
                  <div className="space-y-0.5">
                    {dayPosts.slice(0, 3).map((post) => (
                      <button
                        key={post.id}
                        className={`w-full text-left text-[10px] leading-tight px-1.5 py-0.5 rounded truncate cursor-pointer transition-opacity hover:opacity-80 ${
                          post.platforms[0]
                            ? (PLATFORM_CONFIG[post.platforms[0]]?.bgColor || "bg-gray-200 dark:bg-gray-700")
                            : "bg-gray-200 dark:bg-gray-700"
                        }`}
                        onClick={() => onSelectPost(post)}
                        title={post.content}
                      >
                        {PLATFORM_CONFIG[post.platforms[0]]?.icon || ""}{" "}
                        {post.content.slice(0, 20)}
                      </button>
                    ))}
                    {dayPosts.length > 3 && (
                      <div className="text-[10px] text-gray-400 dark:text-gray-500 pl-1">
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
    </Card>
  );
}
