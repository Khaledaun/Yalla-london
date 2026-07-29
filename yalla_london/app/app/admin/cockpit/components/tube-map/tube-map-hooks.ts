/**
 * Tube Map Data Hooks
 *
 * Fetches data from content-matrix + cockpit + operations-feed APIs
 * and maps articles to stations for the Tube Map visualization.
 */

"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { ContentItem } from "../../types";
import {
  ALL_STATIONS,
  PHASE_TO_STATION,
  type TubeTrain,
} from "./tube-map-data";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface StationData {
  stationId: string;
  articles: ContentItem[];
  count: number;
  stuckCount: number; // articles > 6h at this station
  errorCount: number;
}

export interface OperationEntry {
  timestamp: string;
  agent: string;
  agentIcon: string;
  action: string;
  details: string[];
  articleIds: string[];
  cost: number | null;
  status: "success" | "warning" | "error";
  phaseChanges: Array<{ articleId: string; from: string; to: string }>;
}

export interface TubeMapState {
  stationData: Map<string, StationData>;
  trains: TubeTrain[];
  operations: OperationEntry[];
  summary: {
    totalArticles: number;
    published: number;
    inPipeline: number;
    reservoir: number;
    stuck: number;
    indexed: number;
    affiliateClicks7d: number;
    aiCostToday: number;
  };
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

// ─── Map articles to stations ───────────────────────────────────────────────

function mapArticlesToStations(articles: ContentItem[]): Map<string, StationData> {
  const stationMap = new Map<string, StationData>();

  // Initialize all stations with empty data
  for (const station of ALL_STATIONS) {
    stationMap.set(station.id, {
      stationId: station.id,
      articles: [],
      count: 0,
      stuckCount: 0,
      errorCount: 0,
    });
  }

  for (const article of articles) {
    let stationId: string | undefined;

    if (article.type === "published") {
      stationId = "published";
    } else if (article.phase) {
      stationId = PHASE_TO_STATION[article.phase];
    } else if (article.status === "rejected") {
      continue; // Don't show rejected on the map
    }

    if (!stationId) continue;

    const station = stationMap.get(stationId);
    if (!station) continue;

    station.articles.push(article);
    station.count++;

    // Check if stuck (>6h at this station)
    if (article.hoursInPhase && article.hoursInPhase > 6) {
      station.stuckCount++;
    }

    // Check for errors
    if (article.lastError) {
      station.errorCount++;
    }
  }

  return stationMap;
}

// ─── Build train objects from articles ──────────────────────────────────────

function buildTrains(articles: ContentItem[], maxTrains: number = 80): TubeTrain[] {
  // Only show trains for recently-active articles (last 7 days)
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  return articles
    .filter((a) => {
      const ts = a.generatedAt ?? a.publishedAt;
      if (!ts) return false;
      return new Date(ts).getTime() > sevenDaysAgo;
    })
    .slice(0, maxTrains)
    .map((a) => {
      const stationId =
        a.type === "published"
          ? "published"
          : (a.phase ? PHASE_TO_STATION[a.phase] : null) ?? "c-topics";

      const lineId = stationId.startsWith("c-") || stationId === "published"
        ? "content"
        : stationId.startsWith("s-")
          ? "seo"
          : stationId.startsWith("a-")
            ? "affiliate"
            : "quality";

      const dwellMs = a.hoursInPhase ? a.hoursInPhase * 60 * 60 * 1000 : 0;

      return {
        articleId: a.id,
        title: a.title ?? "Untitled",
        currentStation: stationId,
        lineId,
        dwellTimeMs: dwellMs,
        status: a.lastError
          ? ("error" as const)
          : a.hoursInPhase && a.hoursInPhase > 6
            ? ("stuck" as const)
            : ("stopped" as const),
        localeEn: (a.wordCount ?? 0) > 100,
        localeAr: (a.wordCountAr ?? 0) > 100,
        seoScore: a.seoScore ?? null,
        wordCount: a.wordCount ?? null,
      };
    });
}

// ─── Main hook ──────────────────────────────────────────────────────────────

export function useTubeMapData(
  siteId: string,
  liveMode: boolean = true,
  refreshIntervalMs: number = 60_000
): TubeMapState & { refresh: () => void } {
  const [state, setState] = useState<TubeMapState>({
    stationData: new Map(),
    trains: [],
    operations: [],
    summary: {
      totalArticles: 0,
      published: 0,
      inPipeline: 0,
      reservoir: 0,
      stuck: 0,
      indexed: 0,
      affiliateClicks7d: 0,
      aiCostToday: 0,
    },
    loading: true,
    error: null,
    lastUpdated: null,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    // Cancel previous fetch
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    try {
      const encodedSiteId = encodeURIComponent(siteId);

      // Fetch content-matrix + cockpit + operations-feed in parallel
      const [matrixRes, cockpitRes, feedRes] = await Promise.all([
        fetch(`/api/admin/content-matrix?siteId=${encodedSiteId}&limit=500&status=all`, { signal }),
        fetch(`/api/admin/cockpit?siteId=${encodedSiteId}`, { signal }),
        fetch(`/api/admin/operations-feed?siteId=${encodedSiteId}&limit=30`, { signal }),
      ]);

      if (signal.aborted) return;

      // Parse responses safely
      const matrixData = matrixRes.ok ? await matrixRes.json().catch(() => null) : null;
      const cockpitData = cockpitRes.ok ? await cockpitRes.json().catch(() => null) : null;
      const feedData = feedRes.ok ? await feedRes.json().catch(() => null) : null;

      if (signal.aborted) return;

      const articles: ContentItem[] = matrixData?.articles ?? [];
      const stationData = mapArticlesToStations(articles);
      const trains = buildTrains(articles);
      const operations: OperationEntry[] = feedData?.entries ?? [];

      // Build summary from cockpit data
      const pipeline = cockpitData?.pipeline;
      const indexing = cockpitData?.indexing;
      const revenue = cockpitData?.revenue;

      const summary = {
        totalArticles: articles.length,
        published: articles.filter((a) => a.type === "published").length,
        inPipeline: articles.filter((a) => a.type === "draft" && a.phase !== "reservoir").length,
        reservoir: articles.filter((a) => a.phase === "reservoir").length,
        stuck: pipeline?.stuckDrafts?.length ?? 0,
        indexed: indexing?.indexed ?? 0,
        affiliateClicks7d: revenue?.affiliateClicks7d ?? 0,
        aiCostToday: feedData?.summary?.aiCostUsd ?? 0,
      };

      setState({
        stationData,
        trains,
        operations,
        summary,
        loading: false,
        error: null,
        lastUpdated: new Date().toISOString(),
      });
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      console.warn("[tube-map-hooks] Fetch error:", (err as Error).message);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: (err as Error).message,
      }));
    }
  }, [siteId]);

  // Initial fetch + refresh on siteId change
  useEffect(() => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    fetchData();

    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [fetchData]);

  // Live polling
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (liveMode) {
      intervalRef.current = setInterval(fetchData, refreshIntervalMs);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [liveMode, refreshIntervalMs, fetchData]);

  return useMemo(
    () => ({ ...state, refresh: fetchData }),
    [state, fetchData]
  );
}

// ─── Operations feed hook (lighter, 30s polling) ────────────────────────────

export function useOperationsFeed(
  siteId: string,
  liveMode: boolean,
  intervalMs: number = 30_000
): { entries: OperationEntry[]; loading: boolean } {
  const [entries, setEntries] = useState<OperationEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeed = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/admin/operations-feed?siteId=${encodeURIComponent(siteId)}&limit=20&hours=12`
      );
      if (!res.ok) return;
      const data = await res.json();
      setEntries(data.entries ?? []);
      setLoading(false);
    } catch (err) {
      console.warn("[operations-feed] Fetch error:", err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  useEffect(() => {
    if (!liveMode) return undefined;
    const timer = setInterval(fetchFeed, intervalMs);
    return () => clearInterval(timer);
  }, [liveMode, intervalMs, fetchFeed]);

  return { entries, loading };
}
