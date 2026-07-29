'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

export interface CtaBannerModulePreviewProps {
  module?: {
    content?: {
      heading?: string
      subheading?: string
      buttonText?: string
      buttonUrl?: string
    }
  }
  primaryColor?: string
  secondaryColor?: string
}

export function CtaBannerModulePreview({
  module,
  primaryColor = '#1e3a5f',
  secondaryColor = '#c9a84c',
}: CtaBannerModulePreviewProps) {
  const heading = module?.content?.heading || 'Ready to Plan Your Trip?'
  const subheading =
    module?.content?.subheading ||
    'Let us help you create the perfect luxury travel experience tailored to your preferences.'
  const buttonText = module?.content?.buttonText || 'Get Started'

  return (
    <section
      className="relative py-20 px-4 overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 50%, ${secondaryColor} 100%)`,
      }}
    >
      {/* Decorative circles */}
      <div
        className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-10"
        style={{ backgroundColor: secondaryColor }}
      />
      <div
        className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full opacity-10"
        style={{ backgroundColor: secondaryColor }}
      />

      <div className="relative z-10 max-w-4xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
          {heading}
        </h2>
        <p className="text-lg text-white/80 max-w-2xl mx-auto mb-8 leading-relaxed">
          {subheading}
        </p>
        <Button
          size="lg"
          className="text-lg px-8 py-4 font-semibold"
          style={{
            backgroundColor: secondaryColor,
            color: primaryColor,
          }}
        >
          {buttonText}
          <ArrowRight className="h-5 w-5 ml-2" />
        </Button>
      </div>
    </section>
  )
}
