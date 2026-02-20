'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { ImageIcon, ArrowRight } from 'lucide-react'

export interface ImageGalleryModulePreviewProps {
  module?: {
    content?: {
      title?: string
      images?: { src: string; title: string }[]
    }
  }
}

const defaultImages = [
  { src: '', title: 'Luxury Hotel Suite' },
  { src: '', title: 'Rooftop Dining' },
  { src: '', title: 'City Skyline' },
  { src: '', title: 'Hidden Garden' },
]

export function ImageGalleryModulePreview({ module }: ImageGalleryModulePreviewProps) {
  const title = module?.content?.title || 'Photo Gallery'
  const images = module?.content?.images?.length
    ? module.content.images.slice(0, 4)
    : defaultImages

  return (
    <section className="py-16 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {title}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            A visual journey through our curated collection
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {images.map((image, index) => (
            <div
              key={index}
              className="group relative overflow-hidden rounded-xl aspect-[4/3] cursor-pointer"
            >
              {image.src ? (
                <img
                  src={image.src}
                  alt={image.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                  <ImageIcon className="h-12 w-12 text-gray-400" />
                </div>
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex items-end">
                <div className="p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                  <h3 className="text-white font-semibold text-lg">
                    {image.title}
                  </h3>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Button size="lg" variant="outline">
            View Gallery
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </section>
  )
}
