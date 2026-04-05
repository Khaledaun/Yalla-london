"use client";

import React, { useState, useRef, useEffect } from "react";
import type { ContentItem } from "../types";
import { statusBadge } from "../types";
import {
  publishArticle,
  unpublishArticle,
  reQueueDraft,
  deleteDraft,
  deletePost,
  submitToGoogle,
  reviewFix,
} from "../lib/article-actions";

interface StatusDropdownProps {
  item: ContentItem;
  siteId: string;
  onAction: () => void; // called after any action to refresh data
  onViewDetails?: (item: ContentItem) => void;
}

interface DropdownAction {
  label: string;
  icon: string;
  variant: "default" | "danger" | "success";
  handler: () => Promise<void>;
}

export function StatusDropdown({ item, siteId, onAction, onViewDetails }: StatusDropdownProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setFeedback(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); setFeedback(null); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const runAction = async (label: string, fn: () => Promise<{ success: boolean; message: string }>) => {
    setLoading(label);
    setFeedback(null);
    try {
      const result = await fn();
      setFeedback(result.success ? `✅ ${result.message}` : `❌ ${result.message}`);
      if (result.success) {
        setTimeout(() => { setOpen(false); setFeedback(null); onAction(); }, 600);
      }
    } catch (e) {
      setFeedback(`❌ ${e instanceof Error ? e.message : "Error"}`);
    } finally {
      setLoading(null);
    }
  };

  // Build contextual actions based on item status
  const actions: DropdownAction[] = [];

  if (item.status === "published") {
    actions.push({
      label: "Submit to Google",
      icon: "🔍",
      variant: "default",
      handler: () => runAction("Submit to Google", () => submitToGoogle(item.slug ?? "", siteId)),
    });
    actions.push({
      label: "Run SEO Review",
      icon: "📊",
      variant: "default",
      handler: () => runAction("Run SEO Review", () => reviewFix(item.id, siteId)),
    });
    actions.push({
      label: "Unpublish",
      icon: "⏸",
      variant: "danger",
      handler: () => runAction("Unpublish", () => unpublishArticle(item.id, siteId)),
    });
  } else if (item.status === "reservoir") {
    actions.push({
      label: "Publish Now",
      icon: "🚀",
      variant: "success",
      handler: () => runAction("Publish Now", () => publishArticle(item.id, item.locale, siteId)),
    });
    actions.push({
      label: "Re-queue",
      icon: "🔄",
      variant: "default",
      handler: () => runAction("Re-queue", () => reQueueDraft(item.id, siteId)),
    });
    actions.push({
      label: "Delete",
      icon: "🗑",
      variant: "danger",
      handler: () => runAction("Delete", () => deleteDraft(item.id, siteId)),
    });
  } else if (item.status === "rejected") {
    actions.push({
      label: "Retry",
      icon: "🔄",
      variant: "default",
      handler: () => runAction("Retry", () => reQueueDraft(item.id, siteId)),
    });
    actions.push({
      label: "Delete",
      icon: "🗑",
      variant: "danger",
      handler: () => runAction("Delete", () => deleteDraft(item.id, siteId)),
    });
  } else {
    // Active pipeline phases: research, outline, drafting, assembly, images, seo, scoring, stuck
    if (onViewDetails) {
      actions.push({
        label: "View Details",
        icon: "📋",
        variant: "default",
        handler: async () => { onViewDetails(item); setOpen(false); },
      });
    }
    if (item.status === "stuck" || item.hoursInPhase > 6) {
      actions.push({
        label: "Re-queue",
        icon: "🔄",
        variant: "default",
        handler: () => runAction("Re-queue", () => reQueueDraft(item.id, siteId)),
      });
    }
  }

  const badge = statusBadge(item.status);

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Tappable badge */}
      <button
        onClick={() => { setOpen(!open); setFeedback(null); }}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border cursor-pointer transition-all ${badge.color} ${open ? "ring-2 ring-[#3B7EA1]/30" : "hover:ring-1 hover:ring-stone-300"}`}
        aria-haspopup="true"
        aria-expanded={open}
      >
        {badge.label}
        <svg className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && actions.length > 0 && (
        <div className="absolute z-50 mt-1 left-0 min-w-[160px] bg-white rounded-lg shadow-lg border border-stone-200/80 py-1 animate-in fade-in slide-in-from-top-1 duration-150">
          {feedback && (
            <div className="px-3 py-1.5 text-[11px] border-b border-stone-100 text-stone-600">
              {feedback}
            </div>
          )}
          {actions.map((action) => {
            const isLoading = loading === action.label;
            const variantColors = {
              default: "text-stone-700 hover:bg-stone-50",
              danger: "text-[#C8322B] hover:bg-red-50",
              success: "text-[#2D5A3D] hover:bg-green-50",
            };
            return (
              <button
                key={action.label}
                onClick={action.handler}
                disabled={!!loading}
                className={`w-full text-left px-3 py-2 text-[12px] flex items-center gap-2 transition-colors ${variantColors[action.variant]} ${isLoading ? "opacity-50" : ""} ${loading && !isLoading ? "opacity-30" : ""}`}
              >
                {isLoading ? (
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className="text-sm">{action.icon}</span>
                )}
                {action.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
