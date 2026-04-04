'use client'

import React, { useState, useEffect } from 'react'
import { Cloud, Sun, CloudRain, CloudSnow, CloudLightning, CloudDrizzle, Wind } from 'lucide-react'

interface WeatherDay {
  date: string
  dayName: string
  tempMax: number
  tempMin: number
  condition: string
  icon: string
}

const WEATHER_ICONS: Record<string, React.ElementType> = {
  sun: Sun,
  cloud: Cloud,
  rain: CloudRain,
  drizzle: CloudDrizzle,
  snow: CloudSnow,
  thunder: CloudLightning,
  wind: Wind,
}

function mapConditionToIcon(code: number): string {
  if (code === 0 || code === 1) return 'sun'
  if (code >= 2 && code <= 3) return 'cloud'
  if (code >= 45 && code <= 48) return 'cloud' // fog
  if (code >= 51 && code <= 57) return 'drizzle'
  if (code >= 61 && code <= 67) return 'rain'
  if (code >= 71 && code <= 77) return 'snow'
  if (code >= 80 && code <= 82) return 'rain'
  if (code >= 85 && code <= 86) return 'snow'
  if (code >= 95 && code <= 99) return 'thunder'
  return 'cloud'
}

function mapConditionToText(code: number, lang: 'en' | 'ar'): string {
  const conditions: Record<string, [string, string]> = {
    sun: ['Sunny', 'مشمس'],
    cloud: ['Cloudy', 'غائم'],
    drizzle: ['Drizzle', 'رذاذ'],
    rain: ['Rainy', 'ممطر'],
    snow: ['Snow', 'ثلج'],
    thunder: ['Storms', 'عواصف'],
  }
  const icon = mapConditionToIcon(code)
  const pair = conditions[icon] || conditions.cloud
  return lang === 'ar' ? pair[1] : pair[0]
}

export function WeatherStrip({ locale = 'en' }: { locale?: 'en' | 'ar' }) {
  const [forecast, setForecast] = useState<WeatherDay[]>([])
  const isRTL = locale === 'ar'

  useEffect(() => {
    (async () => {
      try {
        // Open-Meteo free API — no key needed, London coordinates
        const res = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=51.5074&longitude=-0.1278&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=Europe/London&forecast_days=7',
          { next: { revalidate: 3600 } } as RequestInit // cache 1h
        )
        if (!res.ok) return
        const data = await res.json()
        const days: WeatherDay[] = data.daily.time.map((date: string, i: number) => {
          const d = new Date(date)
          return {
            date,
            dayName: d.toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { weekday: 'short' }),
            tempMax: Math.round(data.daily.temperature_2m_max[i]),
            tempMin: Math.round(data.daily.temperature_2m_min[i]),
            condition: mapConditionToText(data.daily.weathercode[i], locale),
            icon: mapConditionToIcon(data.daily.weathercode[i]),
          }
        })
        setForecast(days)
      } catch { /* silently fail — weather is nice-to-have */ }
    })()
  }, [locale])

  if (forecast.length === 0) return null

  return (
    <div className="bg-gradient-to-r from-[#1a2a3a] to-[#0f1e2e] border-y border-white/10" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-7 py-3">
        <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide">
          {/* Label */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Cloud className="w-4 h-4 text-[#87CEEB]" />
            <span className="font-mono text-xs font-bold text-white/70 uppercase tracking-[2px] whitespace-nowrap">
              {isRTL ? 'طقس لندن' : 'London Weather'}
            </span>
          </div>
          <div className="w-px h-6 bg-white/15 flex-shrink-0" />

          {/* 7-day forecast */}
          <div className="flex gap-3">
            {forecast.map((day, i) => {
              const IconComp = WEATHER_ICONS[day.icon] || Cloud
              return (
                <div
                  key={day.date}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg flex-shrink-0 ${
                    i === 0 ? 'bg-white/10' : ''
                  }`}
                >
                  <div className="text-center min-w-[28px]">
                    <div className="font-mono text-xs font-semibold text-white/60 uppercase">
                      {i === 0 ? (isRTL ? 'اليوم' : 'Today') : day.dayName}
                    </div>
                  </div>
                  <IconComp className="w-4 h-4 text-[#87CEEB]" />
                  <div className="font-mono text-xs text-white whitespace-nowrap">
                    <span className="font-bold">{day.tempMax}°</span>
                    <span className="text-white/50 mx-0.5">/</span>
                    <span className="text-white/50">{day.tempMin}°</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
