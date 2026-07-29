'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';

/**
 * Lightweight scroll-reveal hook using IntersectionObserver.
 * Returns a ref and an `isVisible` boolean that flips to true once
 * the element enters the viewport. Uses `once: true` by default so
 * the animation only plays on the first appearance.
 *
 * Usage:
 *   const { ref, isVisible } = useScrollReveal();
 *   <div ref={ref} className={isVisible ? 'z-animate-fadeUp' : 'opacity-0'}>
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options?: { threshold?: number; rootMargin?: string; once?: boolean },
): { ref: RefObject<T | null>; isVisible: boolean } {
  const ref = useRef<T | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const { threshold = 0.15, rootMargin = '0px 0px -60px 0px', once = true } = options ?? {};

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    // Skip observer if user prefers reduced motion — show immediately
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setIsVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) observer.unobserve(node);
        } else if (!once) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return { ref, isVisible };
}

/**
 * Convenience wrapper: attaches IntersectionObserver to a container
 * and adds the `.z-revealed` class to trigger CSS-only animations.
 * Useful for sections where you don't need React state, just CSS class toggling.
 */
export function useScrollRevealClass<T extends HTMLElement = HTMLDivElement>(
  options?: { threshold?: number; rootMargin?: string },
): RefObject<T | null> {
  const ref = useRef<T | null>(null);
  const { threshold = 0.15, rootMargin = '0px 0px -60px 0px' } = options ?? {};

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      node.classList.add('z-revealed');
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          node.classList.add('z-revealed');
          observer.unobserve(node);
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return ref;
}
