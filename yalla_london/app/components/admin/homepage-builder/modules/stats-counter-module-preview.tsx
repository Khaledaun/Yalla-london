'use client'

import React, { useEffect, useRef, useState } from 'react'
import { MapPin, Users, Star, BookOpen } from 'lucide-react'

export interface StatsCounterModulePreviewProps {
  module?: {
    content?: {
      stats?: { value: string; label: string }[]
    }
  }
  primaryColor?: string
}

const defaultStats = [
  { value: '150+', label: 'Destinations Covered', icon: MapPin },
  { value: '50K+', label: 'Happy Travelers', icon: Users },
  { value: '4.9', label: 'Average Rating', icon: Star },
  { value: '1,200+', label: 'Articles Published', icon: BookOpen },
]

const icons = [MapPin, Users, Star, BookOpen]

export function StatsCounterModulePreview({
  module,
  primaryColor = '#1e3a5f',
}: StatsCounterModulePreviewProps) {
  const stats = module?.content?.stats?.length
    ? module.content.stats.map((s, i) => ({ ...s, icon: icons[i % icons.length] }))
    : defaultStats

  const sectionRef = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return undefined
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.2 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <section ref={sectionRef} className="py-16 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.slice(0, 4).map((stat, index) => {
            const Icon = stat.icon
            return (
              <div
                key={index}
                className="text-center"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(20px)',
                  transition: `opacity 0.6s ease ${index * 0.15}s, transform 0.6s ease ${index * 0.15}s`,
                }}
              >
                <div
                  className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-4"
                  style={{ backgroundColor: `${primaryColor}15` }}
                >
                  <Icon className="h-6 w-6" style={{ color: primaryColor }} />
                </div>
                <div
                  className="text-3xl md:text-4xl font-bold mb-2"
                  style={{ color: primaryColor }}
                >
                  {stat.value}
                </div>
                <div className="text-sm text-gray-600 font-medium">
                  {stat.label}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
