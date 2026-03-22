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
      className="min-h-screen grid grid-cols-1 lg:grid-cols-2 relative overflow-hidden"
      style={{ background: 'var(--zl-gradient-hero)', padding: 0 }}
    >
      {/* Left: Text Content */}
      <div className="flex flex-col justify-center px-6 sm:px-10 lg:px-16 xl:px-20 pt-24 pb-12 lg:pt-36 lg:pb-28 relative z-10">
        {/* Eyebrow — Intent: Venture studio identity, not "technology brand" */}
        <div
          className="transition-all duration-700"
          style={{
            fontFamily: 'var(--zl-font-label)',
            fontSize: '0.625rem',
            letterSpacing: 'var(--zl-tracking-luxury)',
            textTransform: 'uppercase' as const,
            color: 'var(--zl-gold)',
            marginBottom: '1.25rem',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(24px)',
            transitionDelay: '300ms',
          }}
        >
          Zenitha Luxury — Travel Venture Studio
        </div>

        {/* Title — Intent: New H1 per repositioning brief */}
        <h1
          className="transition-all duration-700"
          style={{
            fontFamily: 'var(--zl-font-display)',
            fontSize: 'clamp(2.4rem, 4.2vw, 4rem)',
            fontWeight: 400,
            lineHeight: 1.06,
            marginBottom: '1.5rem',
            color: 'var(--zl-ivory)',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(24px)',
            transitionDelay: '500ms',
          }}
        >
          An AI venture studio
          <br />
          for next&#8209;generation
          <br />
          <em style={{ fontStyle: 'italic', color: 'var(--zl-gold)' }}>travel brands.</em>
        </h1>

        {/* Description — Intent: Supporting line emphasising partnership
            value and human-curated quality, de-emphasising raw tech. */}
        <p
          className="transition-all duration-700"
          style={{
            fontFamily: 'var(--zl-font-body)',
            fontSize: '1rem',
            fontWeight: 300,
            color: 'var(--zl-mist)',
            lineHeight: 1.9,
            maxWidth: '460px',
            marginBottom: '2.5rem',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(24px)',
            transitionDelay: '700ms',
          }}
        >
          We build and operate AI&#8209;powered travel products for
          high&#8209;value travellers, then partner with brands who want
          to move faster.
        </p>

        {/* CTAs — Intent: "Explore Partnership Models" (primary) +
            "See Live Products" (secondary) per brief. */}
        <div
          className="flex gap-4 flex-wrap transition-all duration-700"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(24px)',
            transitionDelay: '900ms',
          }}
        >
          <a
            href="#partnerships"
            className="inline-flex items-center gap-2 no-underline transition-all duration-300 hover:shadow-lg"
            style={{
              padding: '0.85rem 2rem',
              fontFamily: 'var(--zl-font-label)',
              fontSize: '0.6875rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase' as const,
              background: 'var(--zl-gold)',
              color: 'var(--zl-obsidian)',
              fontWeight: 600,
              border: 'none',
            }}
            onClick={(e) => {
              e.preventDefault();
              document.getElementById('partnerships')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            Explore Partnership Models
          </a>
          <a
            href="#platforms"
            className="inline-flex items-center gap-2 no-underline transition-all duration-300"
            style={{
              padding: '0.85rem 2rem',
              fontFamily: 'var(--zl-font-label)',
              fontSize: '0.6875rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase' as const,
              background: 'transparent',
              color: 'var(--zl-gold)',
              border: '1px solid rgba(196, 169, 108, 0.35)',
            }}
            onClick={(e) => {
              e.preventDefault();
              document.getElementById('platforms')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            See Live Products
          </a>
        </div>

        {/* Stats Row */}
        <div
          className="flex flex-wrap gap-6 sm:gap-10 mt-10 sm:mt-12 pt-6 sm:pt-8 transition-all duration-700"
          style={{
            borderTop: '1px solid rgba(196, 169, 108, 0.08)',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(24px)',
            transitionDelay: '1100ms',
          }}
        >
          {HERO_STATS.map((stat) => (
            <div key={stat.label}>
              <div
                style={{
                  fontFamily: 'var(--zl-font-display)',
                  fontSize: '1.75rem',
                  fontWeight: 400,
                  color: 'var(--zl-gold)',
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  fontFamily: 'var(--zl-font-label)',
                  fontSize: '0.625rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase' as const,
                  color: 'var(--zl-smoke)',
                  marginTop: '0.15rem',
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile background image — visible only below lg breakpoint */}
      <div
        className="absolute inset-0 lg:hidden"
        style={{ zIndex: 0 }}
      >
        <img
          src="https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1920&q=80&auto=format"
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover"
          style={{ filter: 'brightness(0.25)' }}
        />
      </div>

      {/* Right: Image (desktop only) */}
      <div className="relative overflow-hidden hidden lg:block">
        <img
          src="https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1920&q=80&auto=format"
          alt="Luxury London Rooftop"
          className="w-full h-full object-cover"
          style={{ filter: 'brightness(0.65)' }}
        />
        {/* Left edge gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, var(--zl-obsidian) 0%, transparent 35%)',
          }}
        />
      </div>
    </section>
  );
}
