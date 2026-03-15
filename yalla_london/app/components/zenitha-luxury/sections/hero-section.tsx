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
      style={{ background: 'var(--zl-obsidian)', padding: 0 }}
    >
      {/* Left: Text Content */}
      <div className="flex flex-col justify-center px-6 sm:px-10 lg:px-16 xl:px-20 pt-28 pb-16 lg:pt-36 lg:pb-28 relative z-10">
        {/* Eyebrow */}
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
          Zenitha Luxury — Luxury Travel Technology
        </div>

        {/* Title */}
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
          Where <em style={{ fontStyle: 'italic', color: 'var(--zl-gold)' }}>Luxury</em>
          <br />
          Meets Precision
          <br />
          Technology
        </h1>

        {/* Description */}
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
          A curated luxury travel technology brand — serving global
          high&#8209;net&#8209;worth travellers with bilingual digital experiences,
          London city discovery, and yacht charter journeys.
        </p>

        {/* CTAs */}
        <div
          className="flex gap-4 flex-wrap transition-all duration-700"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(24px)',
            transitionDelay: '900ms',
          }}
        >
          <a
            href="#services"
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
              document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            Explore Services
          </a>
          <a
            href="#contact"
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
              document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            Private Enquiry
          </a>
        </div>

        {/* Stats Row */}
        <div
          className="flex gap-10 mt-12 pt-8 transition-all duration-700"
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

      {/* Right: Image */}
      <div className="relative overflow-hidden hidden lg:block">
        {/* TODO: Replace with branded hero image from the Zenitha branding kit. */}
        <img
          src="/branding/zenitha-luxury/images/hero-bg.png"
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
