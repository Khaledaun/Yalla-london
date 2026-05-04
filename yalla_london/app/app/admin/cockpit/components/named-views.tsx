"use client";

import React, { useEffect, useState } from "react";
import type { ContentItem } from "../types";

export interface NamedView {
  id: string;
  label: string;
  emoji: string;
  filter: (item: ContentItem) => boolean;
}

const VIEWS: NamedView[] = [
  { id: "all", label: "All", emoji: "📋", filter: () => true },
  {
    id: "needs-expansion",
    label: "Needs Expansion",
    emoji: "📏",
    filter: (i) => i.type === "published" && i.wordCount > 0 && i.wordCount < 800,
  },
  {
    id: "not-indexed",
    label: "Not Indexed",
    emoji: "🔍",
    filter: (i) => i.type === "published" && i.indexingStatus !== "indexed",
  },
  {
    id: "arabic-missing",
    label: "Arabic Missing",
    emoji: "🌍",
    filter: (i) => (i.wordCountAr ?? 0) < 100 && i.wordCount > 500,
  },
  {
    id: "low-ctr",
    label: "High Imp / Low CTR",
    emoji: "📉",
    filter: (i) => i.type === "published" && (i.gscImpressions ?? 0) > 50 && (i.gscClicks ?? 0) < 3,
  },
  {
    id: "stuck",
    label: "Stuck > 6h",
    emoji: "⏳",
    filter: (i) => i.type === "draft" && i.hoursInPhase > 6,
  },
  {
    id: "revenue",
    label: "Revenue",
    emoji: "💰",
    filter: (i) => (i.affiliateClicks7d ?? 0) > 0,
  },
];

interface NamedViewsProps {
  articles: ContentItem[];
  activeView: string;
  onViewChange: (viewId: string) => void;
  siteId: string; // for localStorage key namespacing
}

export function NamedViews({ articles, activeView, onViewChange, siteId }: NamedViewsProps) {
  // Persist active view per site
  useEffect(() => {
    const stored = localStorage.getItem(`cockpit_view_${siteId}`);
    if (stored && VIEWS.some((v) => v.id === stored)) {
      onViewChange(stored);
    }
  }, [siteId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (viewId: string) => {
    onViewChange(viewId);
    localStorage.setItem(`cockpit_view_${siteId}`, viewId);
  };

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide snap-x snap-mandatory -mx-1 px-1">
      {VIEWS.map((view) => {
        const count = articles.filter(view.filter).length;
        const isActive = activeView === view.id;
        return (
          <button
            key={view.id}
            onClick={() => handleChange(view.id)}
            className={`snap-start flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all border ${
              isActive
                ? "bg-[rgba(59,126,161,0.1)] text-[#1e5a7a] border-[rgba(59,126,161,0.3)]"
                : "bg-white text-stone-600 border-stone-200 hover:border-stone-300"
            }`}
          >
            <span>{view.emoji}</span>
            {view.label}
            {count > 0 && view.id !== "all" && (
              <span className={`ml-0.5 px-1.5 py-0 rounded-full text-[10px] ${
                isActive ? "bg-[rgba(59,126,161,0.15)] text-[#1e5a7a]" : "bg-stone-100 text-stone-500"
              }`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Get the filter function for a given view ID */
export function getViewFilter(viewId: string): (item: ContentItem) => boolean {
  return VIEWS.find((v) => v.id === viewId)?.filter ?? (() => true);
}
