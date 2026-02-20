'use client'

import React from 'react'
import { Play, Film } from 'lucide-react'

export interface VideoHeroModulePreviewProps {
  module?: {
    content?: {
      title?: string
      subtitle?: string
      videoUrl?: string
      overlayOpacity?: number
    }
  }
}

export function VideoHeroModulePreview({ module }: VideoHeroModulePreviewProps) {
  const title = module?.content?.title || 'Discover Your Next Adventure'
  const subtitle = module?.content?.subtitle || 'Immerse yourself in luxury travel experiences'
  const videoUrl = module?.content?.videoUrl || ''
  const overlayOpacity = module?.content?.overlayOpacity ?? 0.5

  return (
    <section className="relative w-full min-h-[420px] bg-gray-900 overflow-hidden">
      {/* Video or placeholder background */}
      {videoUrl ? (
        <video
          className="absolute inset-0 w-full h-full object-cover"
          src={videoUrl}
          aria-label="Hero background video"
          autoPlay
          muted
          loop
          playsInline
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-950 flex items-center justify-center">
          <Film className="h-24 w-24 text-gray-700" />
        </div>
      )}

      {/* Dark overlay */}
      <div
        className="absolute inset-0 bg-black"
        style={{ opacity: overlayOpacity }}
      />

      {/* Bottom gradient */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 to-transparent" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[420px] px-4 text-center">
        {/* Play button */}
        <button
          type="button"
          aria-label="Play video"
          className="mb-8 h-20 w-20 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/40 flex items-center justify-center hover:bg-white/30 transition-colors"
        >
          <Play className="h-8 w-8 text-white ml-1" />
        </button>

        <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 max-w-3xl leading-tight">
          {title}
        </h2>
        <p className="text-lg md:text-xl text-gray-200 max-w-2xl leading-relaxed">
          {subtitle}
        </p>
      </div>
    </section>
  )
}
