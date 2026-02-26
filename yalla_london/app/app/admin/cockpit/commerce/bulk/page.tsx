"use client";

/**
 * Bulk Create — Generate multiple Etsy listings from a single theme
 *
 * Features:
 * - Template gallery: pre-defined themes (London Neighborhoods, Seasonal Travel, etc.)
 * - Custom theme input: free-text theme with count selector
 * - "Generate Ideas" → AI returns product ideas for review
 * - Preview cards with edit capability (remove individual ideas)
 * - "Create All" → listings created sequentially with live progress
 * - Results summary: created/failed counts, total time, links to listings
 * - Recent runs history
 *
 * Mobile-first (375px), iPhone-optimized for Khaled.
 */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

// ─── Types ──────────────────────────────────────────────

interface BulkTemplate {
  id: string;
  name: string;
  description: string;
  count: number;
  defaultCategory: string;
  defaultTier: number;
}

interface BulkIdea {
  idea: string;
  suggestedCategory: string;
  suggestedPrice: number;
  rationale: string;
}

interface CreatedListing {
  briefId: string;
  draftId: string;
  title: string;
  price: number;
  suggestedCategory: string;
  complianceValid: boolean;
  complianceIssues: { field: string; message: string }[];
}

interface FailedListing {
  idea: string;
  error: string;
}

interface RecentRun {
  id: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  itemsProcessed: number | null;
  errorMessage: string | null;
  result: {
    createdCount?: number;
    failedCount?: number;
    totalMs?: number;
  } | null;
}

// ─── Step State Machine ─────────────────────────────────

type Step = "choose" | "generating" | "review" | "creating" | "results";

// ─── Component ──────────────────────────────────────────

export default function BulkCreatePage() {
  // Template + theme selection
  const [templates, setTemplates] = useState<BulkTemplate[]>([]);
  const [recentRuns, setRecentRuns] = useState<RecentRun[]>([]);
  const [stats, setStats] = useState<{ totalBriefs: number; totalDrafts: number }>({
    totalBriefs: 0,
    totalDrafts: 0,
  });

  // User inputs
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [customTheme, setCustomTheme] = useState("");
  const [count, setCount] = useState(5);

  // AI-generated ideas
  const [ideas, setIdeas] = useState<BulkIdea[]>([]);

  // Progress + results
  const [step, setStep] = useState<Step>("choose");
  const [createdListings, setCreatedListings] = useState<CreatedListing[]>([]);
  const [failedListings, setFailedListings] = useState<FailedListing[]>([]);
  const [totalMs, setTotalMs] = useState(0);

  // UI state
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  // ─── Load Templates + Recent Runs ─────────────────────

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/commerce/bulk-create");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      if (data.success) {
        setTemplates(data.templates ?? []);
        setRecentRuns(data.recentRuns ?? []);
        setStats(data.stats ?? { totalBriefs: 0, totalDrafts: 0 });
      }
    } catch (err) {
      console.warn("[bulk-create-page] Load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── Generate Ideas ───────────────────────────────────

  const handleGenerateIdeas = async () => {
    setError(null);
    setStep("generating");

    try {
      const payload: Record<string, unknown> = {
        action: "generate_ideas",
      };

      if (selectedTemplate) {
        payload.templateId = selectedTemplate;
      } else {
        payload.theme = customTheme;
        payload.count = count;
      }

      const res = await fetch("/api/admin/commerce/bulk-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Failed to generate ideas");
      }

      setIdeas(data.ideas ?? []);
      setStep("review");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Generation failed";
      setError(message);
      setStep("choose");
    }
  };

  // ─── Remove Idea from Review ──────────────────────────

  const removeIdea = (index: number) => {
    setIdeas((prev) => prev.filter((_, i) => i !== index));
  };

  // ─── Execute Bulk Create ──────────────────────────────

  const handleCreateAll = async () => {
    if (ideas.length === 0) return;

    setError(null);
    setStep("creating");
    setCreatedListings([]);
    setFailedListings([]);

    try {
      const res = await fetch("/api/admin/commerce/bulk-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "execute_bulk",
          ideas,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Bulk creation failed");
      }

      setCreatedListings(data.created ?? []);
      setFailedListings(data.failed ?? []);
      setTotalMs(data.summary?.totalMs ?? 0);
      setStep("results");

      // Refresh data to show new run in history
      loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Creation failed";
      setError(message);
      setStep("review");
    }
  };

  // ─── Reset to Start ───────────────────────────────────

  const resetFlow = () => {
    setStep("choose");
    setSelectedTemplate(null);
    setCustomTheme("");
    setCount(5);
    setIdeas([]);
    setCreatedListings([]);
    setFailedListings([]);
    setTotalMs(0);
    setError(null);
  };

  // ─── Render ───────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm max-w-xs">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Bulk Create</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Theme to listings in minutes
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">
              {stats.totalBriefs} briefs / {stats.totalDrafts} drafts
            </span>
            {step !== "choose" && (
              <button
                onClick={resetFlow}
                className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Start Over
              </button>
            )}
          </div>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-1 mt-3">
          {(["choose", "review", "results"] as const).map((s, i) => (
            <div key={s} className="flex items-center">
              {i > 0 && (
                <div
                  className={`w-6 h-px mx-1 ${
                    step === "results" || (step === "review" && i <= 1)
                      ? "bg-blue-400"
                      : "bg-gray-200"
                  }`}
                />
              )}
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  (() => {
                    const isActive =
                      step === s ||
                      (step === "generating" && s === "choose") ||
                      (step === "creating" && s === "review");
                    if (isActive) return "bg-blue-600 text-white";
                    const stepIdx = (["choose", "review", "results"] as const).indexOf(step === "generating" ? "choose" : step === "creating" ? "review" : step);
                    const sIdx = (["choose", "review", "results"] as const).indexOf(s);
                    if (stepIdx > sIdx) return "bg-blue-100 text-blue-700";
                    return "bg-gray-100 text-gray-400";
                  })()
                }`}
              >
                {i + 1}
              </div>
              <span
                className={`text-xs ml-1 ${
                  step === s ||
                  (step === "generating" && s === "choose") ||
                  (step === "creating" && s === "review")
                    ? "text-gray-900 font-medium"
                    : "text-gray-400"
                }`}
              >
                {s === "choose" ? "Theme" : s === "review" ? "Review" : "Done"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mx-4 mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="p-4 max-w-2xl mx-auto space-y-4">
        {/* ─── Step 1: Choose Theme ─────────────────────── */}
        {(step === "choose" || step === "generating") && (
          <>
            {/* Template Gallery */}
            <div>
              <h2 className="text-sm font-semibold text-gray-900 mb-2">
                Quick Templates
              </h2>
              <div className="grid grid-cols-1 gap-2">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setSelectedTemplate(
                        selectedTemplate === t.id ? null : t.id,
                      );
                      setCustomTheme("");
                    }}
                    disabled={step === "generating"}
                    className={`text-left p-3 rounded-lg border transition-all ${
                      selectedTemplate === t.id
                        ? "border-blue-500 bg-blue-50 ring-1 ring-blue-200"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    } disabled:opacity-50`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">
                        {t.name}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        {t.count} items
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {t.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium">OR</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Custom Theme */}
            <div className="bg-white rounded-lg border p-4">
              <label className="text-sm font-medium text-gray-900 block mb-1.5">
                Custom Theme
              </label>
              <textarea
                value={customTheme}
                onChange={(e) => {
                  setCustomTheme(e.target.value);
                  setSelectedTemplate(null);
                }}
                disabled={step === "generating"}
                rows={3}
                className="w-full border rounded-lg px-3 py-2 text-sm resize-y disabled:opacity-50"
                placeholder='e.g., "Luxury hotel guides for top London hotels" or "Arabic calligraphy wall art with Islamic geometric patterns"'
              />
              <div className="flex items-center justify-between mt-2">
                <label className="text-xs text-gray-600">
                  How many listings?
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={1}
                    max={20}
                    value={count}
                    onChange={(e) => setCount(parseInt(e.target.value))}
                    disabled={step === "generating" || !!selectedTemplate}
                    className="w-24"
                  />
                  <span className="text-sm font-medium text-gray-900 w-6 text-right">
                    {selectedTemplate
                      ? templates.find((t) => t.id === selectedTemplate)
                          ?.count ?? count
                      : count}
                  </span>
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerateIdeas}
              disabled={
                step === "generating" ||
                (!selectedTemplate && customTheme.trim().length < 10)
              }
              className="w-full py-3 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {step === "generating" ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Generating ideas...
                </span>
              ) : (
                "Generate Ideas"
              )}
            </button>
          </>
        )}

        {/* ─── Step 2: Review Ideas ─────────────────────── */}
        {(step === "review" || step === "creating") && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">
                Review Ideas ({ideas.length})
              </h2>
              {step === "review" && (
                <button
                  onClick={() => setStep("choose")}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  Back to themes
                </button>
              )}
            </div>

            {ideas.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800">
                  No ideas generated. Try a different theme or template.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {ideas.map((idea, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-lg border p-3 relative"
                  >
                    {step === "review" && (
                      <button
                        onClick={() => removeIdea(i)}
                        className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full text-xs"
                        title="Remove this idea"
                      >
                        X
                      </button>
                    )}

                    <div className="pr-8">
                      <p className="text-sm text-gray-900 leading-relaxed">
                        {idea.idea}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                          {idea.suggestedCategory.replace(/_/g, " ")}
                        </span>
                        <span className="text-xs font-medium text-green-700">
                          ${(idea.suggestedPrice / 100).toFixed(2)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1.5 italic">
                        {idea.rationale}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Create All Button */}
            {ideas.length > 0 && (
              <button
                onClick={handleCreateAll}
                disabled={step === "creating"}
                className="w-full py-3 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {step === "creating" ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Creating {ideas.length} listings...
                  </span>
                ) : (
                  `Create All ${ideas.length} Listings`
                )}
              </button>
            )}

            {step === "creating" && (
              <p className="text-xs text-center text-gray-500">
                Each listing takes 3-8 seconds. Total estimated:{" "}
                {Math.round(ideas.length * 5.5)}s. Budget limit: 53s.
              </p>
            )}
          </>
        )}

        {/* ─── Step 3: Results ──────────────────────────── */}
        {step === "results" && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold text-green-600">
                  {createdListings.length}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Created</p>
              </div>
              <div className="bg-white rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold text-red-500">
                  {failedListings.length}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Failed</p>
              </div>
              <div className="bg-white rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold text-gray-700">
                  {(totalMs / 1000).toFixed(1)}s
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Total Time</p>
              </div>
            </div>

            {/* Created Listings */}
            {createdListings.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-green-700 mb-2">
                  Created Listings
                </h2>
                <div className="space-y-2">
                  {createdListings.map((listing) => (
                    <div
                      key={listing.draftId}
                      className="bg-white rounded-lg border p-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 font-medium truncate">
                            {listing.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                              {listing.suggestedCategory.replace(/_/g, " ")}
                            </span>
                            <span className="text-xs font-medium text-green-700">
                              ${(listing.price / 100).toFixed(2)}
                            </span>
                            {listing.complianceValid ? (
                              <span className="text-xs text-green-600">
                                Compliant
                              </span>
                            ) : (
                              <span className="text-xs text-amber-600">
                                {listing.complianceIssues.length} issue
                                {listing.complianceIssues.length !== 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                        </div>
                        <Link
                          href={`/admin/cockpit/commerce/listing?id=${listing.draftId}`}
                          className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 whitespace-nowrap ml-2"
                        >
                          Edit
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Failed Listings */}
            {failedListings.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-red-700 mb-2">
                  Failed
                </h2>
                <div className="space-y-2">
                  {failedListings.map((f, i) => (
                    <div
                      key={i}
                      className="bg-red-50 border border-red-200 rounded-lg p-3"
                    >
                      <p className="text-sm text-gray-900">{f.idea}</p>
                      <p className="text-xs text-red-600 mt-1">{f.error}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={resetFlow}
                className="py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create More
              </button>
              <Link
                href="/admin/cockpit/commerce?tab=briefs"
                className="py-2.5 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-center"
              >
                View All Briefs
              </Link>
            </div>
          </>
        )}

        {/* ─── Recent Runs ──────────────────────────────── */}
        {step === "choose" && recentRuns.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-900 mb-2">
              Recent Bulk Runs
            </h2>
            <div className="space-y-2">
              {recentRuns.map((run) => (
                <div
                  key={run.id}
                  className="bg-white rounded-lg border p-3 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-block w-2 h-2 rounded-full ${
                          run.status === "success"
                            ? "bg-green-500"
                            : run.status === "partial"
                              ? "bg-amber-500"
                              : "bg-red-500"
                        }`}
                      />
                      <span className="text-sm text-gray-900">
                        {run.itemsProcessed ?? 0} created
                        {run.result?.failedCount
                          ? `, ${run.result.failedCount} failed`
                          : ""}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(run.startedAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {run.result?.totalMs
                        ? ` — ${(run.result.totalMs / 1000).toFixed(1)}s`
                        : ""}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      run.status === "success"
                        ? "bg-green-50 text-green-700"
                        : run.status === "partial"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-red-50 text-red-700"
                    }`}
                  >
                    {run.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
