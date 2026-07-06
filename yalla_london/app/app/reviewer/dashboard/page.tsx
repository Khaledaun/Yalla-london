"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface ReviewerProfile {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  location: string | null;
  expertiseAreas: string[];
  status: string;
}

interface Review {
  id: string;
  siteId: string;
  status: string;
  priority: string;
  dueDate: string | null;
  assignedAt: string;
  instructions: string | null;
  contentType: "draft" | "published";
  contentTitle: string;
  contentId: string;
}

interface Stats {
  totalReviews: number;
  approvedReviews: number;
  pendingReviews: number;
  inProgressReviews: number;
}

type TabType = "assigned" | "in_progress" | "submitted" | "completed";

const STATUS_COLORS: Record<string, string> = {
  assigned: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  in_progress: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  submitted: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  approved: "bg-green-500/20 text-green-400 border-green-500/30",
  rejected: "bg-red-500/20 text-red-400 border-red-500/30",
  revision_requested: "bg-orange-500/20 text-orange-400 border-orange-500/30",
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "text-red-400",
  high: "text-orange-400",
  normal: "text-slate-400",
  low: "text-slate-500",
};

export default function ReviewerDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ReviewerProfile | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("assigned");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        // Load profile and stats
        const profileRes = await fetch("/api/reviewer/profile");
        if (profileRes.status === 401) {
          router.push("/reviewer/login");
          return;
        }
        
        const profileData = await profileRes.json();
        if (!profileData.success) {
          throw new Error(profileData.error || "Failed to load profile");
        }

        // If not fully onboarded, redirect
        if (profileData.reviewer?.status === "pending_onboard") {
          router.push("/reviewer/onboard");
          return;
        }

        setProfile(profileData.reviewer);
        setStats(profileData.stats);
        
        // Load initial reviews
        await loadReviews("assigned");
      } catch (err) {
        console.error("Failed to load data:", err);
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [router]);

  const loadReviews = async (status: string) => {
    try {
      const statusParam = status === "completed" ? "approved" : status;
      const res = await fetch(`/api/reviewer/reviews?status=${statusParam}&limit=20`);
      const data = await res.json();
      
      if (data.success) {
        setReviews(data.reviews || []);
      }
    } catch (err) {
      console.error("Failed to load reviews:", err);
    }
  };

  const handleTabChange = async (tab: TabType) => {
    setActiveTab(tab);
    await loadReviews(tab);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/reviewer/auth/logout", { method: "POST" });
      router.push("/reviewer/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "No deadline";
    const date = new Date(dateStr);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    if (days < 0) return `${Math.abs(days)} days overdue`;
    if (days === 0) return "Due today";
    if (days === 1) return "Due tomorrow";
    return `Due in ${days} days`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-red-400 mb-4">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 border-b border-slate-700/50 sticky top-0 z-50 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-bold">
              {profile?.name?.[0]?.toUpperCase() || "R"}
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">
                {profile?.name || "Reviewer"}
              </h1>
              <p className="text-sm text-slate-400">{profile?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/reviewer/profile"
              className="px-3 py-2 text-slate-300 hover:text-white text-sm transition-colors"
            >
              Profile
            </Link>
            <button
              onClick={handleLogout}
              className="px-3 py-2 text-slate-400 hover:text-red-400 text-sm transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
              <div className="text-3xl font-bold text-white">{stats.totalReviews}</div>
              <div className="text-sm text-slate-400">Total Reviews</div>
            </div>
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
              <div className="text-3xl font-bold text-blue-400">{stats.pendingReviews}</div>
              <div className="text-sm text-slate-400">Pending</div>
            </div>
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
              <div className="text-3xl font-bold text-amber-400">{stats.inProgressReviews}</div>
              <div className="text-sm text-slate-400">In Progress</div>
            </div>
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
              <div className="text-3xl font-bold text-green-400">{stats.approvedReviews}</div>
              <div className="text-sm text-slate-400">Approved</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {(["assigned", "in_progress", "submitted", "completed"] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab
                  ? "bg-amber-500 text-white"
                  : "bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700/50"
              }`}
            >
              {tab === "assigned" && "Assigned"}
              {tab === "in_progress" && "In Progress"}
              {tab === "submitted" && "Submitted"}
              {tab === "completed" && "Completed"}
            </button>
          ))}
        </div>

        {/* Reviews List */}
        <div className="space-y-4">
          {reviews.length === 0 ? (
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-8 text-center">
              <svg className="w-12 h-12 mx-auto text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-slate-400">No reviews in this category</p>
            </div>
          ) : (
            reviews.map((review) => (
              <Link
                key={review.id}
                href={`/reviewer/review/${review.id}`}
                className="block bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 hover:bg-slate-700/30 transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 text-xs rounded-full border ${STATUS_COLORS[review.status] || STATUS_COLORS.assigned}`}>
                        {review.status.replace(/_/g, " ")}
                      </span>
                      {review.priority !== "normal" && (
                        <span className={`text-xs ${PRIORITY_COLORS[review.priority]}`}>
                          {review.priority.toUpperCase()}
                        </span>
                      )}
                      <span className="text-xs text-slate-500">
                        {review.contentType === "draft" ? "Draft Review" : "Published Update"}
                      </span>
                    </div>
                    <h3 className="text-white font-medium mb-1 truncate group-hover:text-amber-400 transition-colors">
                      {review.contentTitle}
                    </h3>
                    {review.instructions && (
                      <p className="text-sm text-slate-400 line-clamp-2">{review.instructions}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm text-slate-400">
                      {formatDate(review.dueDate)}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Assigned {new Date(review.assignedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
