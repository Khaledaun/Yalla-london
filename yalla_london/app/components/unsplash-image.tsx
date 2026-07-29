"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { decode } from "blurhash";
import { UnsplashAttributionLine } from "@/components/unsplash-attribution";
import type { UnsplashPhoto } from "@/lib/unsplash";
import { buildAttribution, buildImageUrl } from "@/lib/unsplash";

interface UnsplashImageProps {
  photo: UnsplashPhoto;
  width: number;
  height: number;
  priority?: boolean;
  showAttribution?: boolean;
  attributionPosition?: "overlay" | "below";
  locale?: "en" | "ar";
  onView?: () => void;
  className?: string;
  sizes?: string;
  quality?: number;
}

/**
 * Unsplash-compliant image component.
 *
 * - Renders via next/image with Unsplash CDN hotlinking (never re-hosts)
 * - Displays proper attribution (below or overlay)
 * - Triggers download tracking when image enters viewport (Unsplash ToS)
 * - Supports blur_hash placeholder for instant perceived loading
 */
export function UnsplashImage({
  photo,
  width,
  height,
  priority = false,
  showAttribution = true,
  attributionPosition = "below",
  locale = "en",
  onView,
  className,
  sizes,
  quality = 80,
}: UnsplashImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasTriggeredDownload, setHasTriggeredDownload] = useState(false);
  const [blurDataUrl, setBlurDataUrl] = useState<string | undefined>(undefined);

  // Generate blurhash placeholder
  useEffect(() => {
    if (!photo.blurHash) return;
    try {
      const pixels = decode(photo.blurHash, 32, 32);
      const canvas = document.createElement("canvas");
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const imageData = ctx.createImageData(32, 32);
      imageData.data.set(pixels);
      ctx.putImageData(imageData, 0, 0);
      setBlurDataUrl(canvas.toDataURL());
    } catch {
      // blurhash decode failure is non-critical
    }
  }, [photo.blurHash]);

  // Trigger download tracking when image enters viewport
  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry?.isIntersecting && !hasTriggeredDownload) {
        setHasTriggeredDownload(true);

        // Fire download tracking via our API route
        if (photo.downloadLocation || photo.links?.downloadLocation) {
          fetch("/api/unsplash/download", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              downloadLocation:
                photo.downloadLocation || photo.links.downloadLocation,
            }),
          }).catch(() => {
            /* non-critical */
          });
        }

        onView?.();
      }
    },
    [hasTriggeredDownload, photo, onView],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;

    const observer = new IntersectionObserver(handleIntersection, {
      threshold: 0.5, // 50% visible
      rootMargin: "100px", // Pre-trigger slightly before viewport
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [handleIntersection]);

  // Build optimized CDN URL with dynamic resizing
  const imageUrl = buildImageUrl(photo.urls.raw, {
    width,
    height,
    quality,
    fit: "crop",
    format: "webp",
  });

  const attribution = buildAttribution(photo);
  const alt =
    photo.altDescription ||
    photo.description ||
    `Photo by ${photo.photographer.name}`;

  return (
    <div ref={containerRef} className={className}>
      <div style={{ position: "relative", overflow: "hidden" }}>
        <Image
          src={imageUrl}
          alt={alt}
          width={width}
          height={height}
          priority={priority}
          quality={quality}
          sizes={sizes || `(max-width: 768px) 100vw, ${width}px`}
          style={{ objectFit: "cover", width: "100%", height: "auto" }}
          {...(blurDataUrl
            ? { placeholder: "blur", blurDataURL: blurDataUrl }
            : {})}
        />

        {/* Overlay attribution */}
        {showAttribution && attributionPosition === "overlay" && (
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: "8px 12px",
              background:
                "linear-gradient(transparent, rgba(0,0,0,0.6))",
            }}
          >
            <UnsplashAttributionLine
              attribution={attribution}
              locale={locale}
              className="unsplash-attribution-overlay"
            />
            <style>{`
              .unsplash-attribution-overlay,
              .unsplash-attribution-overlay a {
                color: rgba(255,255,255,0.8) !important;
              }
              .unsplash-attribution-overlay a:hover {
                color: #fff !important;
              }
            `}</style>
          </div>
        )}
      </div>

      {/* Below attribution */}
      {showAttribution && attributionPosition === "below" && (
        <div style={{ marginTop: 6 }}>
          <UnsplashAttributionLine
            attribution={attribution}
            locale={locale}
          />
        </div>
      )}
    </div>
  );
}

export default UnsplashImage;
