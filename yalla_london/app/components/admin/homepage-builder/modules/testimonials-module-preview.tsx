'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Star, Quote } from 'lucide-react'

export interface TestimonialsModulePreviewProps {
  content?: {
    testimonials?: { name: string; location: string; rating: number; quote: string }[]
  }
  primaryColor?: string
}

const defaultTestimonials = [
  {
    name: 'Sarah Al-Rashid',
    location: 'Dubai, UAE',
    rating: 5,
    quote:
      'An absolutely unforgettable experience. The attention to detail and local knowledge made our trip truly special.',
  },
  {
    name: 'James Chen',
    location: 'Singapore',
    rating: 4,
    quote:
      'The restaurant recommendations were spot-on. Every meal felt like a curated culinary journey through the city.',
  },
  {
    name: 'Fatima Al-Sayed',
    location: 'Riyadh, KSA',
    rating: 5,
    quote:
      'Finally a travel guide that understands our needs. Halal dining options and family-friendly activities perfectly curated.',
  },
]

function StarRating({ rating, color }: { rating: number; color: string }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className="h-4 w-4"
          style={{
            fill: star <= rating ? color : 'transparent',
            color: star <= rating ? color : '#d1d5db',
          }}
        />
      ))}
    </div>
  )
}

export function TestimonialsModulePreview({
  content,
  primaryColor = '#1e3a5f',
}: TestimonialsModulePreviewProps) {
  const testimonials = content?.testimonials?.length
    ? content.testimonials
    : defaultTestimonials

  return (
    <section className="py-16 px-4 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            What Our Travelers Say
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Real experiences from our community of luxury travelers
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.slice(0, 3).map((testimonial, index) => (
            <Card
              key={index}
              className="relative overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div
                className="absolute top-0 left-0 w-full h-1"
                style={{ backgroundColor: primaryColor }}
              />
              <CardContent className="p-6">
                <Quote
                  className="h-8 w-8 mb-4 opacity-20"
                  style={{ color: primaryColor }}
                />

                <p className="text-gray-700 mb-6 leading-relaxed italic">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>

                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {testimonial.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 text-sm">
                      {testimonial.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {testimonial.location}
                    </div>
                  </div>
                  <StarRating rating={testimonial.rating} color={primaryColor} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
