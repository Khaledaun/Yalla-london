'use client'

import React from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause } from 'lucide-react';

export interface HeroModulePreviewProps {
  module: {
    content: {
      title: string;
      subtitle: string;
      backgroundType: 'image' | 'video' | 'gradient';
      backgroundUrl: string;
      backgroundGradient?: {
        from: string;
        to: string;
        direction: string;
      };
      ctaText: string;
      ctaUrl: string;
      secondaryCta?: {
        text: string;
        url: string;
      };
      overlay: boolean;
      overlayOpacity: number;
      textAlignment: 'left' | 'center' | 'right';
      contentPosition: 'top' | 'center' | 'bottom';
      textColor: 'white' | 'black' | 'custom';
      customTextColor?: string;
    };
  };
}

export function HeroModulePreview({ module }: HeroModulePreviewProps) {
  const { content } = module;
  const [isPlaying, setIsPlaying] = React.useState(true);

  const getBackgroundStyle = () => {
    if (content.backgroundType === 'gradient' && content.backgroundGradient) {
      return {
        background: `linear-gradient(${content.backgroundGradient.direction}, ${content.backgroundGradient.from}, ${content.backgroundGradient.to})`
      };
    }
    
    if (content.backgroundType === 'image' && content.backgroundUrl) {
      return {
        backgroundImage: `url(${content.backgroundUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      };
    }

    return {
      backgroundColor: '#f3f4f6'
    };
  };

  const getTextColor = () => {
    if (content.textColor === 'custom' && content.customTextColor) {
      return content.customTextColor;
    }
    return content.textColor === 'white' ? '#ffffff' : '#000000';
  };

  const getAlignmentClass = () => {
    const alignments = {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right'
    };
    return alignments[content.textAlignment];
  };

  const getPositionClass = () => {
    const positions = {
      top: 'items-start pt-16',
      center: 'items-center',
      bottom: 'items-end pb-16'
    };
    return positions[content.contentPosition];
  };

  return (
    <div 
      className={`relative min-h-[500px] flex ${getPositionClass()}`}
      style={getBackgroundStyle()}
    >
      {/* Overlay */}
      {content.overlay && (
        <div 
          className="absolute inset-0 bg-black"
          style={{ opacity: content.overlayOpacity }}
        />
      )}

      {/* Background Video */}
      {content.backgroundType === 'video' && content.backgroundUrl && (
        <div className="absolute inset-0">
          <video
            className="w-full h-full object-cover"
            src={content.backgroundUrl}
            autoPlay={isPlaying}
            muted
            loop
            playsInline
          />
          <Button
            variant="secondary"
            size="sm"
            className="absolute top-4 right-4 z-10"
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-4">
        <div className={`max-w-4xl ${content.textAlignment === 'center' ? 'mx-auto' : ''} ${getAlignmentClass()}`}>
          <h1 
            className="text-4xl md:text-6xl font-bold mb-6 leading-tight"
            style={{ color: getTextColor() }}
          >
            {content.title || 'Welcome to Your Site'}
          </h1>
          
          {content.subtitle && (
            <p 
              className="text-xl md:text-2xl mb-8 opacity-90 leading-relaxed"
              style={{ color: getTextColor() }}
            >
              {content.subtitle}
            </p>
          )}

          {/* CTA Buttons */}
          <div className={`flex gap-4 ${content.textAlignment === 'center' ? 'justify-center' : content.textAlignment === 'right' ? 'justify-end' : 'justify-start'}`}>
            {content.ctaText && (
              <Button
                size="lg"
                className="text-lg px-8 py-4"
                style={{
                  backgroundColor: 'var(--primary-color)',
                  borderColor: 'var(--primary-color)'
                }}
              >
                {content.ctaText}
              </Button>
            )}
            
            {content.secondaryCta && (
              <Button
                variant="outline"
                size="lg"
                className="text-lg px-8 py-4"
                style={{
                  borderColor: getTextColor(),
                  color: getTextColor()
                }}
              >
                {content.secondaryCta.text}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}