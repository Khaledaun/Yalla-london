'use client';

import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  className?: string;
  fill?: boolean;
  sizes?: string;
  quality?: number;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  onLoad?: () => void;
  aspectRatio?: '16:9' | '4:3' | '1:1' | '3:4' | '21:9';
}

// Low-quality placeholder generator
const shimmer = (w: number, h: number) => `
<svg width="${w}" height="${h}" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="g">
      <stop stop-color="#f3f4f6" offset="20%" />
      <stop stop-color="#e5e7eb" offset="50%" />
      <stop stop-color="#f3f4f6" offset="70%" />
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="#f3f4f6" />
  <rect id="r" width="${w}" height="${h}" fill="url(#g)" />
  <animate xlink:href="#r" attributeName="x" from="-${w}" to="${w}" dur="1s" repeatCount="indefinite"  />
</svg>`;

const toBase64 = (str: string) =>
  typeof window === 'undefined'
    ? Buffer.from(str).toString('base64')
    : window.btoa(str);

// Aspect ratio to dimensions mapping
const aspectRatioMap = {
  '16:9': { width: 1920, height: 1080 },
  '4:3': { width: 1200, height: 900 },
  '1:1': { width: 1200, height: 1200 },
  '3:4': { width: 900, height: 1200 },
  '21:9': { width: 2100, height: 900 },
};

/**
 * OptimizedImage Component
 *
 * A performance-optimized image component that:
 * - Uses Next.js Image for automatic optimization
 * - Provides loading shimmer effect
 * - Supports priority loading for LCP images
 * - Handles aspect ratios automatically
 * - Falls back gracefully on errors
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  priority = false,
  className,
  fill = false,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  quality = 85,
  placeholder = 'blur',
  blurDataURL,
  onLoad,
  aspectRatio,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Calculate dimensions from aspect ratio if provided
  const dimensions = aspectRatio ? aspectRatioMap[aspectRatio] : { width, height };
  const finalWidth = dimensions.width || 1200;
  const finalHeight = dimensions.height || 800;

  // Generate placeholder if not provided
  const placeholderDataURL =
    blurDataURL || `data:image/svg+xml;base64,${toBase64(shimmer(finalWidth, finalHeight))}`;

  // Fallback image for errors
  const fallbackSrc = '/images/placeholder.jpg';

  if (hasError) {
    return (
      <div
        className={cn(
          'bg-gray-200 flex items-center justify-center text-gray-400',
          className
        )}
        style={{ width: fill ? '100%' : finalWidth, height: fill ? '100%' : finalHeight }}
      >
        <svg
          className="w-12 h-12"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden', fill && 'w-full h-full')}>
      <Image
        src={src}
        alt={alt}
        width={fill ? undefined : finalWidth}
        height={fill ? undefined : finalHeight}
        fill={fill}
        sizes={sizes}
        quality={quality}
        priority={priority}
        placeholder={placeholder}
        blurDataURL={placeholderDataURL}
        className={cn(
          'duration-700 ease-in-out',
          isLoading ? 'scale-105 blur-sm' : 'scale-100 blur-0',
          className
        )}
        onLoad={() => {
          setIsLoading(false);
          onLoad?.();
        }}
        onError={() => {
          setHasError(true);
          setIsLoading(false);
        }}
      />
    </div>
  );
}

/**
 * HeroImage Component
 *
 * Specifically optimized for hero/banner images that are LCP elements.
 * Always uses priority loading and optimal sizes.
 */
export function HeroImage({
  src,
  alt,
  className,
  overlay = true,
  overlayOpacity = 0.4,
}: {
  src: string;
  alt: string;
  className?: string;
  overlay?: boolean;
  overlayOpacity?: number;
}) {
  return (
    <div className={cn('relative w-full h-full', className)}>
      <OptimizedImage
        src={src}
        alt={alt}
        fill
        priority // Critical for LCP
        quality={90}
        sizes="100vw"
        className="object-cover"
      />
      {overlay && (
        <div
          className="absolute inset-0 bg-black"
          style={{ opacity: overlayOpacity }}
        />
      )}
    </div>
  );
}

/**
 * CardImage Component
 *
 * Optimized for card/thumbnail images in lists.
 */
export function CardImage({
  src,
  alt,
  aspectRatio = '16:9',
  className,
}: {
  src: string;
  alt: string;
  aspectRatio?: '16:9' | '4:3' | '1:1' | '3:4';
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg',
        aspectRatio === '16:9' && 'aspect-video',
        aspectRatio === '4:3' && 'aspect-[4/3]',
        aspectRatio === '1:1' && 'aspect-square',
        aspectRatio === '3:4' && 'aspect-[3/4]',
        className
      )}
    >
      <OptimizedImage
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        className="object-cover transition-transform hover:scale-105"
      />
    </div>
  );
}

export default OptimizedImage;
