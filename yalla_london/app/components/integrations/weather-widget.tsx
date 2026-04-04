"use client";

import { useEffect, useState } from "react";
import type { DailyForecast } from "@/lib/apis/weather";

interface WeatherWidgetProps {
  siteId: string;
  days?: number;
  compact?: boolean;
  className?: string;
}

/**
 * Live weather forecast widget — powered by Open-Meteo (free, no auth).
 * Shows 3-day or 7-day forecast for the site's destination.
 */
export function WeatherWidget({ siteId, days = 3, compact = false, className = "" }: WeatherWidgetProps) {
  const [forecasts, setForecasts] = useState<DailyForecast[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/integrations/weather?siteId=${siteId}&days=${days}`)
      .then((res) => res.ok ? res.json() : Promise.reject(res.status))
      .then((data) => setForecasts(data.forecasts || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [siteId, days]);

  if (loading || forecasts.length === 0) return null;

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  if (compact) {
    const today = forecasts[0];
    return (
      <div className={`inline-flex items-center gap-2 text-sm ${className}`}>
        <span className="text-lg">{today.weatherIcon}</span>
        <span className="font-semibold">{today.tempMax}°C</span>
        <span className="text-gray-500">{today.weatherLabel}</span>
      </div>
    );
  }

  return (
    <div className={`bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 p-4 ${className}`}>
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
        Weather Forecast
      </h4>
      <div className="flex gap-3 overflow-x-auto">
        {forecasts.slice(0, days).map((f, i) => {
          const d = new Date(f.date + "T00:00:00");
          return (
            <div key={f.date} className="flex-shrink-0 text-center min-w-[60px]">
              <div className="text-xs font-medium text-gray-500">
                {i === 0 ? "Today" : dayNames[d.getDay()]}
              </div>
              <div className="text-2xl my-1">{f.weatherIcon}</div>
              <div className="text-sm font-bold text-gray-900">{f.tempMax}°</div>
              <div className="text-xs text-gray-400">{f.tempMin}°</div>
              {f.rainProbability > 30 && (
                <div className="text-xs text-blue-500 mt-0.5">
                  {f.rainProbability}% rain
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
