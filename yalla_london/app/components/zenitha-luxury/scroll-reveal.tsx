'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

interface ScrollRevealProps {
  children: ReactNode;
  /** Animation variant */
  variant?: 'fade-up' | 'fade-in' | 'fade-left' | 'fade-right' | 'scale';
  /** Delay in ms */
  delay?: number;
  /** Duration in ms */
  duration?: number;
  /** IntersectionObserver threshold (0-1) */
  threshold?: number;
  /** Extra className */
  className?: string;
  /** Run animation only once */
  once?: boolean;
}

/**
 * ScrollReveal — Lightweight scroll-triggered animation wrapper.
 * Uses IntersectionObserver (no external library). Respects prefers-reduced-motion.
 */
export function ScrollReveal({
  children,
  variant = 'fade-up',
  delay = 0,
  duration = 600,
  threshold = 0.15,
  className = '',
  once = true,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect prefers-reduced-motion
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) observer.unobserve(el);
        } else if (!once) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin: '0px 0px -40px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, once]);

  const baseStyles: React.CSSProperties = {
    transitionProperty: 'opacity, transform',
    transitionDuration: `${duration}ms`,
    transitionTimingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    transitionDelay: `${delay}ms`,
  };

  const hiddenStyles: Record<string, React.CSSProperties> = {
    'fade-up': { opacity: 0, transform: 'translateY(30px)' },
    'fade-in': { opacity: 0 },
    'fade-left': { opacity: 0, transform: 'translateX(-30px)' },
    'fade-right': { opacity: 0, transform: 'translateX(30px)' },
    'scale': { opacity: 0, transform: 'scale(0.95)' },
  };

  const visibleStyles: React.CSSProperties = {
    opacity: 1,
    transform: 'translate(0) scale(1)',
  };

  return (
    <div
      ref={ref}
      className={className}
      style={{
        ...baseStyles,
        ...(isVisible ? visibleStyles : hiddenStyles[variant]),
      }}
    >
      {children}
    </div>
  );
}
