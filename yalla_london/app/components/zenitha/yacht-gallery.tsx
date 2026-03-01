"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";

interface YachtGalleryProps {
  images: string[];
  yachtName: string;
}

/**
 * Yacht image gallery with lightbox overlay.
 * Shows a main hero image + 4 thumbnail grid on desktop.
 * Clicking any image opens a full-screen lightbox with navigation.
 */
export function YachtGallery({ images, yachtName }: YachtGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
  }, []);

  const goNext = useCallback(() => {
    setLightboxIndex((i) => (i + 1) % images.length);
  }, [images.length]);

  const goPrev = useCallback(() => {
    setLightboxIndex((i) => (i - 1 + images.length) % images.length);
  }, [images.length]);

  // Refs for focus management
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Keyboard navigation + focus trap
  useEffect(() => {
    if (!lightboxOpen) return undefined;

    // Save the element that opened the lightbox so we can restore focus
    triggerRef.current = document.activeElement as HTMLElement;

    // Lock scroll
    document.body.style.overflow = "hidden";

    // Move initial focus to the close button
    requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { closeLightbox(); return; }
      if (e.key === "ArrowRight") { goNext(); return; }
      if (e.key === "ArrowLeft") { goPrev(); return; }

      // Focus trap: cycle Tab within the lightbox
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
      // Restore focus to the element that opened the lightbox
      triggerRef.current?.focus();
    };
  }, [lightboxOpen, closeLightbox, goNext, goPrev]);

  // If fewer than 5, pad the thumbnail grid
  const thumbImages = images.slice(1, 5);
  const extraCount = images.length > 5 ? images.length - 5 : 0;

  return (
    <>
      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        {/* Main Image */}
        <button
          type="button"
          className="lg:col-span-3 relative overflow-hidden rounded-xl cursor-pointer group"
          style={{ aspectRatio: "16/10" }}
          onClick={() => openLightbox(0)}
          aria-label={`View ${yachtName} photo 1 of ${images.length}`}
        >
          <Image
            src={images[0]}
            alt={`${yachtName} - Main photo`}
            width={0}
            height={0}
            sizes="(min-width: 1024px) 60vw, 100vw"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            style={{ width: '100%', height: '100%' }}
            priority
            unoptimized
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
          <div
            className="absolute bottom-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{
              background: "rgba(255,255,255,0.9)",
              color: "var(--z-navy)",
            }}
          >
            <ZoomIn size={16} />
            <span className="text-xs font-heading font-semibold">
              View gallery
            </span>
          </div>
        </button>

        {/* Thumbnail Grid */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-3">
          {thumbImages.map((img, i) => (
            <button
              type="button"
              key={i}
              className="relative overflow-hidden rounded-lg cursor-pointer group"
              style={{ aspectRatio: "4/3" }}
              onClick={() => openLightbox(i + 1)}
              aria-label={`View ${yachtName} photo ${i + 2} of ${images.length}`}
            >
              <Image
                src={img}
                alt={`${yachtName} - Photo ${i + 2}`}
                width={0}
                height={0}
                sizes="(min-width: 1024px) 20vw, 50vw"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                style={{ width: '100%', height: '100%' }}
                unoptimized
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
              {/* Show "+N more" on last thumbnail */}
              {i === thumbImages.length - 1 && extraCount > 0 && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <span className="text-white font-display text-xl font-bold">
                    +{extraCount} more
                  </span>
                </div>
              )}
            </button>
          ))}
          {/* Fill empty slots with placeholders */}
          {thumbImages.length < 4 &&
            Array.from({ length: 4 - thumbImages.length }).map((_, i) => (
              <div
                key={`placeholder-${i}`}
                className="rounded-lg overflow-hidden"
                style={{
                  aspectRatio: "4/3",
                  background: `linear-gradient(135deg, var(--z-midnight) ${(thumbImages.length + i) * 15}%, var(--z-aegean) 100%)`,
                }}
              >
                <div className="w-full h-full flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ color: "var(--z-champagne)", opacity: 0.4 }}
                  >
                    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                    <circle cx="9" cy="9" r="2" />
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                  </svg>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Lightbox Overlay */}
      {lightboxOpen && (
        <div
          ref={dialogRef}
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.95)" }}
          role="dialog"
          aria-modal="true"
          aria-label="Image gallery"
        >
          {/* Close button */}
          <button
            ref={closeButtonRef}
            type="button"
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-10 p-2 rounded-full transition-colors hover:bg-white/10"
            aria-label="Close gallery"
          >
            <X size={28} className="text-white" />
          </button>

          {/* Counter */}
          <div className="absolute top-5 left-1/2 -translate-x-1/2 text-white/80 text-sm font-heading font-medium">
            {lightboxIndex + 1} / {images.length}
          </div>

          {/* Previous button */}
          {images.length > 1 && (
            <button
              type="button"
              onClick={goPrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full transition-colors hover:bg-white/10"
              aria-label="Previous image"
            >
              <ChevronLeft size={32} className="text-white" />
            </button>
          )}

          {/* Image */}
          <Image
            src={images[lightboxIndex]}
            alt={`${yachtName} - Photo ${lightboxIndex + 1}`}
            width={0}
            height={0}
            sizes="90vw"
            className="max-w-[90vw] max-h-[85vh] object-contain select-none"
            style={{ width: 'auto', height: 'auto', maxWidth: '90vw', maxHeight: '85vh' }}
            draggable={false}
            unoptimized
          />

          {/* Next button */}
          {images.length > 1 && (
            <button
              type="button"
              onClick={goNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full transition-colors hover:bg-white/10"
              aria-label="Next image"
            >
              <ChevronRight size={32} className="text-white" />
            </button>
          )}

          {/* Thumbnail strip */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 overflow-x-auto max-w-[90vw] px-4 py-2">
              {images.map((img, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => setLightboxIndex(i)}
                  className="flex-shrink-0 w-16 h-12 rounded overflow-hidden transition-all"
                  style={{
                    opacity: i === lightboxIndex ? 1 : 0.5,
                    border:
                      i === lightboxIndex
                        ? "2px solid var(--z-gold)"
                        : "2px solid transparent",
                  }}
                  aria-label={`Go to photo ${i + 1}`}
                >
                  <Image
                    src={img}
                    alt=""
                    width={64}
                    height={48}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
