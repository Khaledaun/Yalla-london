"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

interface ReviewData {
  id: string;
  site_id: string;
  status: string;
  priority: string;
  dueDate: string | null;
  assigned_at: string;
  instructions: string | null;
  edits: {
    title: string | null;
    content: string | null;
    meta_title: string | null;
    meta_description: string | null;
    experience_notes: string | null;
  };
  facts_verified: boolean;
  insider_tips_added: number;
  submitted_at: string | null;
  reviewer_notes: string | null;
  admin_feedback: string | null;
  approval_status: string | null;
  photos: Photo[];
}

interface OriginalContent {
  type: "draft" | "published";
  id: string;
  title?: string;
  title_en?: string;
  title_ar?: string;
  content?: string;
  content_en?: string;
  content_ar?: string;
  locale?: string;
  slug?: string;
  seo_score?: number;
  word_count?: number;
  meta_title?: string;
  meta_title_en?: string;
  meta_description?: string;
  meta_description_en?: string;
}

interface Photo {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  altText: string | null;
  caption: string | null;
  licenseType: string;
  ownershipDeclared: boolean;
  isVerified: boolean;
}

type TabType = "content" | "meta" | "experience" | "photos";

const STATUS_BADGES: Record<string, { bg: string; text: string }> = {
  assigned: { bg: "bg-blue-500/20", text: "text-blue-400" },
  in_progress: { bg: "bg-amber-500/20", text: "text-amber-400" },
  submitted: { bg: "bg-purple-500/20", text: "text-purple-400" },
  approved: { bg: "bg-green-500/20", text: "text-green-400" },
  rejected: { bg: "bg-red-500/20", text: "text-red-400" },
  revision_requested: { bg: "bg-orange-500/20", text: "text-orange-400" },
};

export default function ReviewEditPage() {
  const router = useRouter();
  const params = useParams();
  const reviewId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [review, setReview] = useState<ReviewData | null>(null);
  const [originalContent, setOriginalContent] = useState<OriginalContent | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("content");

  // Editable fields
  const [titleEdit, setTitleEdit] = useState("");
  const [contentEdit, setContentEdit] = useState("");
  const [metaTitleEdit, setMetaTitleEdit] = useState("");
  const [metaDescriptionEdit, setMetaDescriptionEdit] = useState("");
  const [experienceNotes, setExperienceNotes] = useState("");
  const [factsVerified, setFactsVerified] = useState(false);
  const [insiderTipsAdded, setInsiderTipsAdded] = useState(0);
  const [reviewerNotes, setReviewerNotes] = useState("");

  // Photo upload state
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hidden activity tracking
  const activityIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // Track activity silently
  const trackActivity = useCallback(async () => {
    if (!reviewId) return;
    
    const now = Date.now();
    const activeSeconds = Math.floor((now - lastActivityRef.current) / 1000);
    lastActivityRef.current = now;

    try {
      await fetch(`/api/reviewer/reviews/${reviewId}/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          activeSeconds: Math.min(activeSeconds, 60),
          isActive: document.hasFocus() 
        }),
      });
    } catch {
      // Silent fail - tracking shouldn't interrupt user experience
    }
  }, [reviewId]);

  // Start tracking on mount, stop on unmount
  useEffect(() => {
    // Send initial heartbeat
    trackActivity();
    
    // Set up interval for periodic tracking (every 30 seconds)
    activityIntervalRef.current = setInterval(trackActivity, 30000);

    // Track on visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        trackActivity();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (activityIntervalRef.current) {
        clearInterval(activityIntervalRef.current);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      // Final tracking on unmount
      trackActivity();
    };
  }, [trackActivity]);

  // Load review data
  useEffect(() => {
    async function loadReview() {
      try {
        const res = await fetch(`/api/reviewer/reviews/${reviewId}`);
        if (res.status === 401) {
          router.push("/reviewer/login");
          return;
        }
        if (res.status === 404) {
          setError("Review not found");
          return;
        }

        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error || "Failed to load review");
        }

        setReview(data.review);
        setOriginalContent(data.originalContent);
        setPhotos(data.review.photos || []);

        // Pre-fill edits if they exist
        const edits = data.review.edits;
        if (edits.title) setTitleEdit(edits.title);
        if (edits.content) setContentEdit(edits.content);
        if (edits.meta_title) setMetaTitleEdit(edits.meta_title);
        if (edits.meta_description) setMetaDescriptionEdit(edits.meta_description);
        if (edits.experience_notes) setExperienceNotes(edits.experience_notes);
        
        setFactsVerified(data.review.facts_verified || false);
        setInsiderTipsAdded(data.review.insider_tips_added || 0);
        if (data.review.reviewer_notes) setReviewerNotes(data.review.reviewer_notes);
      } catch (err) {
        console.error("Failed to load review:", err);
        setError(err instanceof Error ? err.message : "Failed to load review");
      } finally {
        setLoading(false);
      }
    }

    if (reviewId) {
      loadReview();
    }
  }, [reviewId, router]);

  const getOriginalTitle = () => {
    if (!originalContent) return "";
    if (originalContent.type === "draft") {
      return originalContent.title || "";
    }
    return originalContent.title_en || originalContent.title_ar || "";
  };

  const getOriginalContent = () => {
    if (!originalContent) return "";
    if (originalContent.type === "draft") {
      return originalContent.content || "";
    }
    return originalContent.content_en || originalContent.content_ar || "";
  };

  const getOriginalMetaTitle = () => {
    if (!originalContent) return "";
    if (originalContent.type === "draft") {
      return originalContent.meta_title || "";
    }
    return originalContent.meta_title_en || "";
  };

  const getOriginalMetaDescription = () => {
    if (!originalContent) return "";
    if (originalContent.type === "draft") {
      return originalContent.meta_description || "";
    }
    return originalContent.meta_description_en || "";
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      const res = await fetch(`/api/reviewer/reviews/${reviewId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title_edit: titleEdit || null,
          content_edit: contentEdit || null,
          meta_title_edit: metaTitleEdit || null,
          meta_description_edit: metaDescriptionEdit || null,
          experience_notes: experienceNotes || null,
          facts_verified: factsVerified,
          insider_tips_added: insiderTipsAdded,
          reviewer_notes: reviewerNotes || null,
          action: "save",
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to save");
      }

      setSuccessMessage("Changes saved");
      if (review) {
        setReview({ ...review, status: data.review.status });
      }
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!contentEdit && !getOriginalContent()) {
      setError("Please add your edits before submitting");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/reviewer/reviews/${reviewId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title_edit: titleEdit || null,
          content_edit: contentEdit || null,
          meta_title_edit: metaTitleEdit || null,
          meta_description_edit: metaDescriptionEdit || null,
          experience_notes: experienceNotes || null,
          facts_verified: factsVerified,
          insider_tips_added: insiderTipsAdded,
          reviewer_notes: reviewerNotes || null,
          action: "submit",
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to submit");
      }

      router.push("/reviewer/dashboard?submitted=true");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("contentReviewId", reviewId);
      formData.append("ownershipDeclared", "true");
      formData.append("declarationText", `I took this photo and have the right to use it for this review.`);

      const res = await fetch("/api/reviewer/photos/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to upload photo");
      }

      setPhotos([...photos, {
        id: data.photo.id,
        url: data.photo.url,
        thumbnailUrl: data.photo.thumbnailUrl,
        altText: data.photo.altText,
        caption: data.photo.caption,
        licenseType: data.photo.licenseType,
        ownershipDeclared: data.photo.ownershipDeclared,
        isVerified: false,
      }]);

      setSuccessMessage("Photo uploaded successfully");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const isReadOnly = review?.approval_status === "approved" || review?.status === "submitted";

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error && !review) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-red-400 mb-4">{error}</div>
          <Link href="/reviewer/dashboard" className="text-amber-400 hover:text-amber-300">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 border-b border-slate-700/50 sticky top-0 z-50 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/reviewer/dashboard"
                className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-white truncate max-w-md">
                  {getOriginalTitle() || "Untitled Review"}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  {review && (
                    <span className={`px-2 py-0.5 text-xs rounded-full ${STATUS_BADGES[review.status]?.bg || "bg-slate-700"} ${STATUS_BADGES[review.status]?.text || "text-slate-400"}`}>
                      {review.status.replace(/_/g, " ")}
                    </span>
                  )}
                  {review?.priority && review.priority !== "normal" && (
                    <span className="text-xs text-orange-400">
                      {review.priority.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isReadOnly && (
                <>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Draft"}
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {submitting ? "Submitting..." : "Submit for Review"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Messages */}
      {(error || successMessage) && (
        <div className="max-w-6xl mx-auto px-4 pt-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
              {successMessage}
            </div>
          )}
        </div>
      )}

      {/* Instructions Banner */}
      {review?.instructions && (
        <div className="max-w-6xl mx-auto px-4 pt-4">
          <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <h3 className="text-sm font-medium text-blue-400 mb-1">Review Instructions</h3>
            <p className="text-slate-300 text-sm">{review.instructions}</p>
          </div>
        </div>
      )}

      {/* Admin Feedback */}
      {review?.admin_feedback && (
        <div className="max-w-6xl mx-auto px-4 pt-4">
          <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <h3 className="text-sm font-medium text-orange-400 mb-1">Admin Feedback</h3>
            <p className="text-slate-300 text-sm">{review.admin_feedback}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-4 pt-6">
        <div className="flex gap-1 bg-slate-800/50 rounded-lg p-1">
          {(["content", "meta", "experience", "photos"] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === tab
                  ? "bg-slate-700 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {tab === "content" && "Content"}
              {tab === "meta" && "SEO"}
              {tab === "experience" && "Experience"}
              {tab === "photos" && `Photos (${photos.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Content Tab */}
        {activeTab === "content" && (
          <div className="space-y-6">
            {/* Title Edit */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Title
              </label>
              <div className="text-xs text-slate-500 mb-2">
                Original: {getOriginalTitle()}
              </div>
              <input
                type="text"
                value={titleEdit}
                onChange={(e) => setTitleEdit(e.target.value)}
                placeholder="Enter your edited title (or leave blank to keep original)"
                disabled={isReadOnly}
                className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:opacity-50"
              />
            </div>

            {/* Content Edit */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Content
              </label>
              <div className="grid md:grid-cols-2 gap-4">
                {/* Original Content (read-only) */}
                <div>
                  <div className="text-xs text-slate-500 mb-2">Original Content</div>
                  <div 
                    className="h-[500px] overflow-y-auto p-4 rounded-lg bg-slate-900/30 border border-slate-700 text-slate-400 text-sm prose prose-invert prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: getOriginalContent() }}
                  />
                </div>
                {/* Editable Content */}
                <div>
                  <div className="text-xs text-slate-500 mb-2">Your Edits</div>
                  <textarea
                    value={contentEdit || getOriginalContent()}
                    onChange={(e) => setContentEdit(e.target.value)}
                    placeholder="Edit the content here..."
                    disabled={isReadOnly}
                    className="w-full h-[500px] px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none font-mono text-sm disabled:opacity-50"
                  />
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                You can edit the HTML directly. Add your personal experience, update facts, improve readability.
              </p>
            </div>
          </div>
        )}

        {/* Meta Tab */}
        {activeTab === "meta" && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Meta Title (for search engines)
              </label>
              <div className="text-xs text-slate-500 mb-2">
                Original: {getOriginalMetaTitle()}
              </div>
              <input
                type="text"
                value={metaTitleEdit}
                onChange={(e) => setMetaTitleEdit(e.target.value)}
                placeholder="Enter meta title (50-60 characters ideal)"
                disabled={isReadOnly}
                maxLength={70}
                className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:opacity-50"
              />
              <div className="text-xs text-slate-500 mt-1">
                {metaTitleEdit.length}/70 characters
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Meta Description
              </label>
              <div className="text-xs text-slate-500 mb-2">
                Original: {getOriginalMetaDescription()}
              </div>
              <textarea
                value={metaDescriptionEdit}
                onChange={(e) => setMetaDescriptionEdit(e.target.value)}
                placeholder="Enter meta description (120-160 characters ideal)"
                disabled={isReadOnly}
                maxLength={200}
                rows={3}
                className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none disabled:opacity-50"
              />
              <div className="text-xs text-slate-500 mt-1">
                {metaDescriptionEdit.length}/200 characters
              </div>
            </div>
          </div>
        )}

        {/* Experience Tab */}
        {activeTab === "experience" && (
          <div className="space-y-6">
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <h3 className="text-sm font-medium text-amber-400 mb-2">Why This Matters</h3>
              <p className="text-slate-300 text-sm">
                Google values first-hand experience. Share your personal insights, tips you&apos;ve learned, 
                and details that only someone who&apos;s actually been there would know.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Your Personal Experience & Insider Tips
              </label>
              <textarea
                value={experienceNotes}
                onChange={(e) => setExperienceNotes(e.target.value)}
                placeholder="Share your first-hand experience... What did you notice? What tips would you give? What do locals know that tourists don't?"
                disabled={isReadOnly}
                rows={6}
                className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none disabled:opacity-50"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={factsVerified}
                    onChange={(e) => setFactsVerified(e.target.checked)}
                    disabled={isReadOnly}
                    className="w-5 h-5 rounded border-slate-600 bg-slate-900 text-amber-500 focus:ring-amber-500"
                  />
                  <span className="text-slate-300">
                    I have verified the facts in this article
                  </span>
                </label>
                <p className="text-xs text-slate-500 mt-2 ml-8">
                  Prices, opening hours, contact details, etc.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Insider Tips Added
                </label>
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={insiderTipsAdded}
                  onChange={(e) => setInsiderTipsAdded(parseInt(e.target.value) || 0)}
                  disabled={isReadOnly}
                  className="w-24 px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:opacity-50"
                />
                <p className="text-xs text-slate-500 mt-2">
                  How many personal tips/recommendations did you add?
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Notes for the Editor (optional)
              </label>
              <textarea
                value={reviewerNotes}
                onChange={(e) => setReviewerNotes(e.target.value)}
                placeholder="Any comments or questions for the editor..."
                disabled={isReadOnly}
                rows={3}
                className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none disabled:opacity-50"
              />
            </div>
          </div>
        )}

        {/* Photos Tab */}
        {activeTab === "photos" && (
          <div className="space-y-6">
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <h3 className="text-sm font-medium text-amber-400 mb-2">Photo Guidelines</h3>
              <ul className="text-slate-300 text-sm space-y-1">
                <li>• Only upload photos you took yourself or have rights to use</li>
                <li>• High quality, well-lit photos work best</li>
                <li>• Photos should be relevant to the article content</li>
                <li>• Max file size: 10MB per photo</li>
              </ul>
            </div>

            {/* Upload Button */}
            {!isReadOnly && (
              <div className="flex gap-4">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoUpload}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="flex items-center gap-2 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {uploadingPhoto ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Upload My Photo
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Photo Grid */}
            {photos.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="relative aspect-square rounded-lg overflow-hidden bg-slate-800 border border-slate-700"
                  >
                    <img
                      src={photo.thumbnailUrl || photo.url}
                      alt={photo.altText || "Uploaded photo"}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                      <div className="flex items-center gap-1">
                        <span className={`px-1.5 py-0.5 text-xs rounded ${
                          photo.licenseType === "owned" 
                            ? "bg-green-500/20 text-green-400"
                            : "bg-blue-500/20 text-blue-400"
                        }`}>
                          {photo.licenseType === "owned" ? "Owned" : photo.licenseType}
                        </span>
                        {photo.isVerified && (
                          <span className="px-1.5 py-0.5 text-xs rounded bg-green-500/20 text-green-400">
                            ✓ Verified
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-slate-800/30 rounded-lg border border-slate-700/50">
                <svg className="w-12 h-12 mx-auto text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-slate-400">No photos uploaded yet</p>
                <p className="text-slate-500 text-sm mt-1">
                  Add your own photos to make this content more authentic
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
