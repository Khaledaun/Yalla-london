/**
 * Open-Meteo Weather API — Free, no auth, no rate limits
 * https://api.open-meteo.com/v1/forecast
 * https://marine-api.open-meteo.com/v1/marine
 */

const CACHE_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours

export interface DailyForecast {
  date: string;
  tempMax: number;
  tempMin: number;
  rainProbability: number;
  weatherCode: number;
  weatherLabel: string;
  weatherIcon: string;
}

export interface MarineConditions {
  waveHeight: number;
  wavePeriod: number;
  waveDirection: number;
  waterTemp?: number;
  label: string;
}

export const SITE_DESTINATIONS: Record<string, { lat: number; lng: number; name: string }> = {
  "yalla-london": { lat: 51.5074, lng: -0.1278, name: "London" },
  "arabaldives": { lat: 4.1755, lng: 73.5093, name: "Malé, Maldives" },
  "yalla-riviera": { lat: 43.5528, lng: 7.0174, name: "Cannes" },
  "yalla-istanbul": { lat: 41.0082, lng: 28.9784, name: "Istanbul" },
  "yalla-thailand": { lat: 7.8804, lng: 98.3923, name: "Phuket" },
};

const WEATHER_CODES: Record<number, { label: string; icon: string }> = {
  0: { label: "Clear sky", icon: "☀️" },
  1: { label: "Mainly clear", icon: "🌤️" },
  2: { label: "Partly cloudy", icon: "⛅" },
  3: { label: "Overcast", icon: "☁️" },
  45: { label: "Foggy", icon: "🌫️" },
  48: { label: "Rime fog", icon: "🌫️" },
  51: { label: "Light drizzle", icon: "🌦️" },
  53: { label: "Moderate drizzle", icon: "🌦️" },
  55: { label: "Dense drizzle", icon: "🌧️" },
  61: { label: "Slight rain", icon: "🌧️" },
  63: { label: "Moderate rain", icon: "🌧️" },
  65: { label: "Heavy rain", icon: "🌧️" },
  71: { label: "Slight snow", icon: "🌨️" },
  73: { label: "Moderate snow", icon: "🌨️" },
  75: { label: "Heavy snow", icon: "❄️" },
  80: { label: "Slight showers", icon: "🌦️" },
  81: { label: "Moderate showers", icon: "🌧️" },
  82: { label: "Violent showers", icon: "⛈️" },
  95: { label: "Thunderstorm", icon: "⛈️" },
  96: { label: "Thunderstorm with hail", icon: "⛈️" },
  99: { label: "Thunderstorm with heavy hail", icon: "⛈️" },
};

interface WeatherCache {
  forecasts: DailyForecast[];
  fetchedAt: number;
}

const weatherCache = new Map<string, WeatherCache>();

export async function getWeatherForecast(
  siteId: string,
  days: number = 7
): Promise<DailyForecast[]> {
  const dest = SITE_DESTINATIONS[siteId];
  if (!dest) return [];

  const cacheKey = `${siteId}-${days}`;
  const cached = weatherCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.forecasts;
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${dest.lat}&longitude=${dest.lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode&timezone=auto&forecast_days=${days}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
    const data = await res.json();

    const forecasts: DailyForecast[] = (data.daily?.time || []).map(
      (date: string, i: number) => {
        const code = data.daily.weathercode[i] || 0;
        const info = WEATHER_CODES[code] || { label: "Unknown", icon: "🌡️" };
        return {
          date,
          tempMax: Math.round(data.daily.temperature_2m_max[i]),
          tempMin: Math.round(data.daily.temperature_2m_min[i]),
          rainProbability: data.daily.precipitation_probability_max[i] || 0,
          weatherCode: code,
          weatherLabel: info.label,
          weatherIcon: info.icon,
        };
      }
    );

    weatherCache.set(cacheKey, { forecasts, fetchedAt: Date.now() });
    return forecasts;
  } catch (err) {
    console.warn("[weather] Open-Meteo failed:", err instanceof Error ? err.message : String(err));
    return cached?.forecasts || [];
  }
}

export async function getMarineConditions(
  lat: number,
  lng: number
): Promise<MarineConditions | null> {
  try {
    const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lng}&current=wave_height,wave_period,wave_direction`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`Marine API ${res.status}`);
    const data = await res.json();
    const current = data.current;
    if (!current) return null;

    const wh = current.wave_height || 0;
    let label = "Perfect conditions";
    if (wh > 2.0) label = "Rough — consider postponing";
    else if (wh > 1.0) label = "Moderate — suitable for larger vessels";
    else if (wh > 0.5) label = "Good conditions";

    return {
      waveHeight: wh,
      wavePeriod: current.wave_period || 0,
      waveDirection: current.wave_direction || 0,
      label,
    };
  } catch (err) {
    console.warn("[weather] Marine API failed:", err instanceof Error ? err.message : String(err));
    return null;
  }
}
