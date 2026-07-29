'use client';

import { useEffect, useState } from 'react';
import { HERO_STATS } from '../site-data';

/**
 * HeroSection — Split 2-column hero with text left, image right.
 * Eyebrow + H1 with italic gold "Luxury" + description + 2 CTAs + stats row.
 * Mobile: single column, image hidden.
 */
export function HeroSection() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Trigger entrance animations after mount
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section
      id="top"
      className="relative min-h-screen overflow-hidden"
      style={{ background: 'var(--zl-obsidian)', padding: 0 }}
    >
      {/* Full-bleed hero image — BMW showroom style */}
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=1920&q=90&auto=format"
          alt="Luxury yacht on Mediterranean"
          className="w-full h-full object-cover"
          style={{ filter: 'brightness(0.4)' }}
        />
        {/* Cinematic gradient: dark left for text readability */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to right, rgba(10,10,10,0.85) 0%, rgba(10,10,10,0.4) 50%, transparent 100%)' }}
        />
      </div>

      {/* Content — bottom-left aligned, BMW weight-300 approach */}
      <div className="relative z-10 min-h-screen flex flex-col justify-end px-6 sm:px-10 lg:px-16 xl:px-20 pb-16 lg:pb-24 pt-32">
        {/* Gold accent line */}
        <div
          className="transition-all duration-700"
          style={{
            width: 80,
            height: 1,
            background: 'var(--zl-gold)',
            opacity: mounted ? 1 : 0,
            transitionDelay: '300ms',
          }}
        />

        {/* Eyebrow */}
        <div
          className="transition-all duration-700 mt-6"
          style={{
            fontFamily: 'var(--zl-font-label)',
            fontSize: '0.625rem',
            letterSpacing: 'var(--zl-tracking-luxury)',
            textTransform: 'uppercase' as const,
            color: 'var(--zl-gold)',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(24px)',
            transitionDelay: '400ms',
          }}
        >
          Zenitha.Luxury &mdash; Travel Venture Studio
        </div>

        {/* Title — weight-300 uppercase, angular prestige */}
        <h1
          className="transition-all duration-700 mt-5"
          style={{
            fontFamily: 'var(--zl-font-display)',
            fontSize: 'clamp(2.8rem, 5vw, 4.5rem)',
            fontWeight: 300,
            lineHeight: 1.08,
            color: 'var(--zl-ivory)',
            textTransform: 'uppercase' as const,
            letterSpacing: '-0.02em',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(24px)',
            transitionDelay: '600ms',
          }}
        >
          Curated Luxury<br />
          Across the <em style={{ fontStyle: 'italic', fontWeight: 300, color: 'var(--zl-gold)' }}>World</em>
        </h1>

        {/* Description */}
        <p
          className="transition-all duration-700 mt-5"
          style={{
            fontFamily: 'var(--zl-font-body)',
            fontSize: '1rem',
            fontWeight: 300,
            color: 'var(--zl-mist)',
            lineHeight: 1.8,
            maxWidth: '460px',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(24px)',
            transitionDelay: '800ms',
          }}
        >
          Six destinations. One standard. We build and operate AI-powered
          travel products for high-value travellers, then partner with brands
          who want to move faster.
        </p>

        {/* CTAs — zero radius, angular */}
        <div
          className="flex gap-4 flex-wrap mt-8 transition-all duration-700"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(24px)',
            transitionDelay: '1000ms',
          }}
        >
          <a
            href="#partnerships"
            className="inline-flex items-center gap-2 no-underline transition-all duration-300 hover:shadow-lg"
            style={{
              padding: '0.85rem 2.2rem',
              fontFamily: 'var(--zl-font-label)',
              fontSize: '0.6875rem',
              letterSpacing: '0.18em',
              textTransform: 'uppercase' as const,
              background: 'var(--zl-gold)',
              color: 'var(--zl-obsidian)',
              fontWeight: 600,
              border: 'none',
            }}
            onClick={(e) => { e.preventDefault(); document.getElementById('partnerships')?.scrollIntoView({ behavior: 'smooth' }); }}
          >
            Explore Portfolio
          </a>
          <a
            href="#platforms"
            className="inline-flex items-center gap-2 no-underline transition-all duration-300"
            style={{
              padding: '0.85rem 2.2rem',
              fontFamily: 'var(--zl-font-label)',
              fontSize: '0.6875rem',
              letterSpacing: '0.18em',
              textTransform: 'uppercase' as const,
              background: 'transparent',
              color: 'var(--zl-gold)',
              border: '1px solid rgba(196, 169, 108, 0.3)',
            }}
            onClick={(e) => { e.preventDefault(); document.getElementById('platforms')?.scrollIntoView({ behavior: 'smooth' }); }}
          >
            See Live Products
          </a>
        </div>

        {/* Stats Row */}
        <div
          className="flex flex-wrap gap-8 sm:gap-12 mt-12 pt-8 transition-all duration-700"
          style={{
            borderTop: '1px solid rgba(196, 169, 108, 0.08)',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(24px)',
            transitionDelay: '1200ms',
          }}
        >
          {HERO_STATS.map((stat) => (
            <div key={stat.label}>
              <div style={{ fontFamily: 'var(--zl-font-display)', fontSize: '1.75rem', fontWeight: 300, color: 'var(--zl-gold)' }}>{stat.value}</div>
              <div style={{ fontFamily: 'var(--zl-font-label)', fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'var(--zl-smoke)', marginTop: '0.15rem' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
