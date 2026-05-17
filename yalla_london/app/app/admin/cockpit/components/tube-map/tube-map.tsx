"use client";

import React, { useState, useCallback, useMemo } from "react";
import { TUBE_LINES, STATION_MAP, ALL_STATIONS, getLineColors, type TubeTrain as TubeTrainDef } from "./tube-map-data";
import { useTubeMapData, useOperationsFeed } from "./tube-map-hooks";
import { TubeLine } from "./tube-line";
import { TubeStation } from "./tube-station";
import { TubeTrain } from "./tube-train";
import { StationDetailPanel } from "./station-detail-panel";
import { ActivityOverlay } from "./activity-overlay";
import { AllSitesMap } from "./all-sites-map";
import { MapControls, LineLegend } from "./map-controls";
import type { ContentItem } from "../../types";
// @ts-ignore — Next.js handles CSS imports at build time
import "./tube-map.css";

// ─── Props ──────────────────────────────────────────────────────────────────

interface TubeMapProps {
  siteId: string;
  siteName: string;
  onArticleClick: (article: ContentItem) => void;
  brandColors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    highlight?: string;
  };
}

// ─── KPI Bar ────────────────────────────────────────────────────────────────

function KpiBar({ summary }: {
  summary: {
    published: number;
    indexed: number;
    affiliateClicks7d: number;
    aiCostToday: number;
    totalArticles: number;
  };
}) {
  const kpis = [
    {
      label: `${summary.published} Published`,
      level: summary.published > 50 ? "green" : summary.published > 20 ? "amber" : "red",
    },
    {
      label: `${summary.indexed} Indexed`,
      level: summary.indexed > 0.8 * summary.published ? "green"
        : summary.indexed > 0.5 * summary.published ? "amber" : "red",
    },
    {
      label: `${summary.affiliateClicks7d} Clicks/7d`,
      level: summary.affiliateClicks7d > 30 ? "green"
        : summary.affiliateClicks7d > 5 ? "amber" : "gray",
    },
    {
      label: `$${summary.aiCostToday.toFixed(2)} AI`,
      level: "gray" as const,
    },
  ];

  return (
    <div className="kpi-bar">
      {kpis.map((kpi, i) => (
        <div key={i} className={`kpi-segment kpi-${kpi.level}`}>
          {kpi.label}
        </div>
      ))}
    </div>
  );
}

// ─── Stats Panel ────────────────────────────────────────────────────────────

function StatsPanel({ summary, onClose }: {
  summary: TubeMapProps extends never ? never : ReturnType<typeof useTubeMapData>["summary"];
  onClose: () => void;
}) {
  return (
    <div className="absolute top-16 right-4 z-30 bg-[#1A1F26] border border-white/10 rounded-xl p-4 shadow-2xl min-w-[220px]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-white/90 font-bold text-sm">Today&apos;s Stats</span>
        <button onClick={onClose} className="text-white/30 hover:text-white text-sm">&times;</button>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between text-white/60">
          <span>In Pipeline</span>
          <span className="text-white/90 font-medium">{summary.inPipeline}</span>
        </div>
        <div className="flex justify-between text-white/60">
          <span>Reservoir</span>
          <span className="text-white/90 font-medium">{summary.reservoir}</span>
        </div>
        <div className="flex justify-between text-white/60">
          <span>Published</span>
          <span className="text-white/90 font-medium">{summary.published}</span>
        </div>
        <div className="flex justify-between text-white/60">
          <span>Indexed</span>
          <span className="text-white/90 font-medium">{summary.indexed}</span>
        </div>
        <div className="flex justify-between text-white/60">
          <span>Aff. Clicks (7d)</span>
          <span className="text-white/90 font-medium">{summary.affiliateClicks7d}</span>
        </div>
        {summary.stuck > 0 && (
          <div className="flex justify-between text-amber-400">
            <span>Stuck</span>
            <span className="font-medium">{summary.stuck}</span>
          </div>
        )}
        <div className="flex justify-between text-white/60 pt-1 border-t border-white/10">
          <span>AI Cost Today</span>
          <span className="text-white/90 font-medium">${summary.aiCostToday.toFixed(3)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main TubeMap Component ─────────────────────────────────────────────────

export function TubeMap({ siteId, siteName, onArticleClick, brandColors }: TubeMapProps) {
  // State
  const [liveMode, setLiveMode] = useState(true);
  const [visibleLines, setVisibleLines] = useState<Set<string>>(
    new Set(TUBE_LINES.map((l) => l.id))
  );
  const [selectedStation, setSelectedStation] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [showAllSites, setShowAllSites] = useState(false);
  const [celebration, setCelebration] = useState<{ stationId: string; key: number } | null>(null);

  // Data
  const mapData = useTubeMapData(siteId, liveMode);
  const { entries: operations } = useOperationsFeed(siteId, liveMode);
  const lineColors = useMemo(() => getLineColors(brandColors), [brandColors]);

  // Handlers
  const handleToggleLine = useCallback((lineId: string) => {
    setVisibleLines((prev) => {
      const next = new Set(prev);
      if (next.has(lineId)) {
        next.delete(lineId);
      } else {
        next.add(lineId);
      }
      return next;
    });
  }, []);

  const handleStationClick = useCallback((stationId: string) => {
    setSelectedStation(stationId);
  }, []);

  const handleCloseStation = useCallback(() => {
    setSelectedStation(null);
  }, []);

  // Train click — find the article in station data and open drawer
  const handleTrainClick = useCallback((articleId: string) => {
    for (const [, data] of mapData.stationData) {
      const article = data.articles.find((a) => a.id === articleId);
      if (article) {
        onArticleClick(article);
        return;
      }
    }
  }, [mapData.stationData, onArticleClick]);

  // Trigger celebration animation on Published station
  const triggerCelebration = useCallback((stationId: string) => {
    setCelebration({ stationId, key: Date.now() });
    setTimeout(() => setCelebration(null), 1000);
  }, []);

  // Group trains by station for stacking
  const trainsByStation = useMemo(() => {
    const grouped: Record<string, typeof mapData.trains> = {};
    for (const train of mapData.trains) {
      if (!grouped[train.currentStation]) grouped[train.currentStation] = [];
      grouped[train.currentStation].push(train);
    }
    return grouped;
  }, [mapData.trains]);

  // Get primary line color for each station
  const stationLineColor = useCallback((stationId: string): string => {
    const station = STATION_MAP.get(stationId);
    if (!station) return "#FFFFFF";
    const primaryLineId = station.lineIds[0];
    return lineColors[primaryLineId] ?? "#FFFFFF";
  }, [lineColors]);

  if (mapData.loading && !mapData.lastUpdated) {
    return (
      <div className="tube-map-container">
        <div className="tube-map-loading">Loading Tube Map...</div>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* KPI Progress Bar */}
      <KpiBar summary={mapData.summary} />

      {/* Map Controls */}
      <MapControls
        siteId={siteId}
        siteName={siteName}
        liveMode={liveMode}
        onLiveModeToggle={() => setLiveMode(!liveMode)}
        visibleLines={visibleLines}
        onToggleLine={handleToggleLine}
        lastUpdated={mapData.lastUpdated}
      />

      {/* Line Legend */}
      <div className="bg-[#0F1419] border-b border-white/5">
        <LineLegend visibleLines={visibleLines} onToggleLine={handleToggleLine} />
      </div>

      {/* Map Container */}
      <div className="tube-map-container">
        <div className="tube-map-inner">
          {/* SVG layer for lines */}
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ pointerEvents: "none" }}
          >
            {TUBE_LINES.map((line) => (
              <TubeLine
                key={line.id}
                line={line}
                color={lineColors[line.id] ?? line.color}
                visible={visibleLines.has(line.id)}
              />
            ))}
          </svg>

          {/* Station layer */}
          {ALL_STATIONS.map((station) => {
            // Only show if at least one of its lines is visible
            const isVisible = station.lineIds.some((lid) => visibleLines.has(lid));
            if (!isVisible) return null;

            const data = mapData.stationData.get(station.id);
            return (
              <TubeStation
                key={station.id}
                station={station}
                count={data?.count ?? 0}
                stuckCount={data?.stuckCount ?? 0}
                errorCount={data?.errorCount ?? 0}
                lineColor={stationLineColor(station.id)}
                onClick={handleStationClick}
              />
            );
          })}

          {/* Train layer */}
          {(Object.entries(trainsByStation) as [string, TubeTrainDef[]][]).map(([stationId, trains]) => {
            const station = STATION_MAP.get(stationId);
            if (!station) return null;
            const isVisible = station.lineIds.some((lid) => visibleLines.has(lid));
            if (!isVisible) return null;

            return trains.slice(0, 8).map((train, idx) => (
              <TubeTrain
                key={train.articleId}
                train={train}
                lineColor={lineColors[train.lineId] ?? "#FFFFFF"}
                stackIndex={idx}
                onClick={handleTrainClick}
              />
            ));
          })}

          {/* Published celebration flash */}
          {celebration && (() => {
            const st = STATION_MAP.get(celebration.stationId);
            if (!st) return null;
            return (
              <div
                key={celebration.key}
                className="station-celebration"
                style={{ left: `${st.x}%`, top: `${st.y}%` }}
              />
            );
          })()}

          {/* Activity overlay */}
          <ActivityOverlay entries={operations} visible={liveMode} />
        </div>

        {/* Top-right buttons */}
        <div className="absolute top-3 right-3 z-25 flex gap-1.5">
          <button
            onClick={() => setShowAllSites(!showAllSites)}
            className={`bg-white/10 hover:bg-white/15 text-white/70 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${showAllSites ? "bg-white/20 text-white" : ""}`}
          >
            🌐 Sites
          </button>
          <button
            onClick={() => setShowStats(!showStats)}
            className="bg-white/10 hover:bg-white/15 text-white/70 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
          >
            📊 Stats
          </button>
        </div>

        {/* Stats overlay */}
        {showStats && (
          <StatsPanel
            summary={mapData.summary}
            onClose={() => setShowStats(false)}
          />
        )}

        {/* All Sites overlay */}
        {showAllSites && (
          <div className="absolute inset-0 z-30 bg-[#0F1419]/95 backdrop-blur-sm overflow-y-auto rounded-xl">
            <AllSitesMap
              activeSiteId={siteId}
              onSelectSite={(newSiteId) => {
                setShowAllSites(false);
                // Parent handles site switch via onArticleClick context
              }}
            />
            <button
              onClick={() => setShowAllSites(false)}
              className="absolute top-3 right-3 text-white/40 hover:text-white text-sm p-1"
              aria-label="Close"
            >
              &times;
            </button>
          </div>
        )}
      </div>

      {/* Error banner */}
      {mapData.error && (
        <div className="bg-red-900/20 border border-red-800/30 rounded-lg px-3 py-2 text-red-300 text-xs mt-2">
          Map data error: {mapData.error}
          <button onClick={mapData.refresh} className="ml-2 underline">Retry</button>
        </div>
      )}

      {/* Station Detail Panel (bottom sheet) */}
      {selectedStation && mapData.stationData.get(selectedStation) && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={handleCloseStation}
          />
          <StationDetailPanel
            stationId={selectedStation}
            data={mapData.stationData.get(selectedStation)!}
            siteId={siteId}
            lineColor={stationLineColor(selectedStation)}
            onClose={handleCloseStation}
            onArticleClick={(article) => {
              handleCloseStation();
              onArticleClick(article);
            }}
            onRefresh={mapData.refresh}
          />
        </>
      )}
    </div>
  );
}
