"use client";

import React, { useState, useMemo, useRef } from "react";
import type { ContentItem } from "../types";
import { scoreColor, statusBadge } from "../types";

interface ContentCalendarProps {
  articles: ContentItem[];
  siteId: string;
  onArticleClick: (item: ContentItem) => void;
}

function getDateKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function formatDayLabel(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (getDateKey(date.toISOString()) === getDateKey(today.toISOString())) return "Today";
  if (getDateKey(date.toISOString()) === getDateKey(yesterday.toISOString())) return "Yesterday";
  return date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });
}

function getDayName(date: Date): string {
  return date.toLocaleDateString("en-GB", { weekday: "short" });
}

function getDayNum(date: Date): number {
  return date.getDate();
}

export function ContentCalendar({ articles, siteId, onArticleClick }: ContentCalendarProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<string>(getDateKey(new Date().toISOString()));
  const listRef = useRef<HTMLDivElement>(null);

  // Build 7-day strip based on offset
  const days = useMemo(() => {
    const result: Date[] = [];
    const today = new Date();
    today.setDate(today.getDate() + weekOffset * 7);
    // Start from Monday of that week
    const startOfWeek = new Date(today);
    const dayOfWeek = startOfWeek.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startOfWeek.setDate(startOfWeek.getDate() + diff);

    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(d.getDate() + i);
      result.push(d);
    }
    return result;
  }, [weekOffset]);

  // Group published articles by day
  const byDay = useMemo(() => {
    const map: Record<string, ContentItem[]> = {};
    const published = articles.filter((a) => a.type === "published" && a.publishedAt);
    for (const art of published) {
      const key = getDateKey(art.publishedAt!);
      if (!map[key]) map[key] = [];
      map[key].push(art);
    }
    // Sort each day by time
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => new Date(a.publishedAt!).getTime() - new Date(b.publishedAt!).getTime());
    }
    return map;
  }, [articles]);

  const todayKey = getDateKey(new Date().toISOString());

  return (
    <div>
      {/* Week strip */}
      <div className="flex items-center gap-1 mb-3">
        <button
          onClick={() => setWeekOffset(weekOffset - 1)}
          className="flex-shrink-0 p-1 rounded hover:bg-stone-100 text-stone-500"
          aria-label="Previous week"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex gap-1 flex-1 justify-between overflow-x-auto scrollbar-hide">
          {days.map((day) => {
            const key = getDateKey(day.toISOString());
            const count = byDay[key]?.length ?? 0;
            const isToday = key === todayKey;
            const isSelected = key === selectedDay;
            return (
              <button
                key={key}
                onClick={() => setSelectedDay(key)}
                className={`flex flex-col items-center py-1.5 px-2 rounded-lg min-w-[42px] transition-all ${
                  isSelected
                    ? "bg-[rgba(59,126,161,0.1)] border border-[rgba(59,126,161,0.3)]"
                    : "border border-transparent hover:bg-stone-50"
                }`}
              >
                <span className="text-[10px] text-stone-500 uppercase">{getDayName(day)}</span>
                <span className={`text-sm font-semibold ${isToday ? "text-[#3B7EA1]" : "text-stone-800"}`}>
                  {getDayNum(day)}
                  {isToday && <span className="text-[#C49A2A] ml-0.5">★</span>}
                </span>
                {count > 0 && (
                  <span className="mt-0.5 w-4 h-4 flex items-center justify-center rounded-full bg-[rgba(45,90,61,0.1)] text-[9px] text-[#2D5A3D] font-bold">
                    {count}
                  </span>
                )}
                {count === 0 && <span className="mt-0.5 w-4 h-4" />}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setWeekOffset(weekOffset + 1)}
          className="flex-shrink-0 p-1 rounded hover:bg-stone-100 text-stone-500"
          aria-label="Next week"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {weekOffset !== 0 && (
        <button
          onClick={() => { setWeekOffset(0); setSelectedDay(todayKey); }}
          className="text-[11px] text-[#3B7EA1] mb-2 hover:underline"
        >
          ← Back to today
        </button>
      )}

      {/* Article list grouped by selected day and nearby days */}
      <div ref={listRef} className="space-y-3">
        {days.map((day) => {
          const key = getDateKey(day.toISOString());
          const dayArticles = byDay[key] ?? [];
          const isSelected = key === selectedDay;

          if (!isSelected && dayArticles.length === 0) return null;

          return (
            <div key={key} className={isSelected ? "" : "opacity-60"}>
              <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide mb-1.5 px-1 border-b border-stone-100 pb-1">
                {formatDayLabel(day)}
              </div>

              {dayArticles.length === 0 ? (
                <p className="text-[11px] text-stone-400 px-1 italic">No articles published</p>
              ) : (
                <div className="space-y-1">
                  {dayArticles.map((art) => {
                    const badge = statusBadge(art.status);
                    return (
                      <button
                        key={art.id}
                        onClick={() => onArticleClick(art)}
                        className="w-full text-left flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-stone-50 transition-colors"
                      >
                        <span className="text-[10px] text-stone-400 w-10 flex-shrink-0 text-right">
                          {formatTime(art.publishedAt!)}
                        </span>
                        <span className="text-[12px] text-stone-800 truncate flex-1 font-medium">
                          {art.title}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${badge.color}`}>
                          {badge.label}
                        </span>
                        <span className="text-[10px] text-stone-500 w-10 text-right flex-shrink-0">
                          {art.wordCount.toLocaleString()}w
                        </span>
                        {art.seoScore !== null && (
                          <span className={`text-[10px] w-6 text-right flex-shrink-0 ${scoreColor(art.seoScore)}`}>
                            {art.seoScore}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
