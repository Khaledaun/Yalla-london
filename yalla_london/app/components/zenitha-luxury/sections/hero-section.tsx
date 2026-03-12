'use client';

import { useEffect, useState } from 'react';

/**
 * HeroSection — Full-viewport hero with bold headline, supporting copy, and CTA.
 * Nest-inspired: large editorial typography, subtle gradient background,
 * decorative geometric accent, and scroll indicator.
 */
export function HeroSection() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    let rafId: number | null = null;
    const onScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        setScrollY(window.scrollY);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const parallaxOffset = scrollY * 0.3;
  const heroOpacity = Math.max(0, 1 - scrollY / 600);

  const scrollToSection = () => {
    const el = document.getElementById('about');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section
      id="hero"
      className="relative flex items-center justify-center min-h-screen overflow-hidden"
      style={{ background: 'var(--zl-gradient-hero)' }}
    >
      {/* Background geometric pattern */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: 0.03,
          backgroundImage: `
            radial-gradient(circle at 20% 50%, var(--zl-gold) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, var(--zl-gold) 0%, transparent 40%),
            radial-gradient(circle at 50% 80%, var(--zl-brass) 0%, transparent 45%)
          `,
          transform: `translateY(${parallaxOffset}px)`,
        }}
      />

      {/* Decorative lines */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ opacity: 0.04 }}>
        <div className="absolute top-[20%] left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--zl-gold), transparent)' }} />
        <div className="absolute top-[80%] left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--zl-gold), transparent)' }} />
        <div className="absolute top-0 bottom-0 left-[15%] w-px" style={{ background: 'linear-gradient(180deg, transparent, var(--zl-gold), transparent)' }} />
        <div className="absolute top-0 bottom-0 right-[15%] w-px" style={{ background: 'linear-gradient(180deg, transparent, var(--zl-gold), transparent)' }} />
      </div>

      {/* Content */}
      <div
        className="relative z-10 max-w-[900px] mx-auto px-6 text-center"
        style={{ opacity: heroOpacity, transform: `translateY(${parallaxOffset * 0.2}px)` }}
      >
        {/* Diamond accent */}
        <div className="mb-8 flex justify-center">
          <DiamondAccent size={60} />
        </div>

        {/* Main headline */}
        <h1
          className="leading-none"
          style={{
            fontFamily: 'var(--zl-font-display)',
            fontSize: 'clamp(3rem, 8vw, 6rem)',
            fontWeight: 300,
            letterSpacing: '0.1em',
            color: 'var(--zl-ivory)',
          }}
        >
          ZENITHA
        </h1>

        {/* Subheadline */}
        <p
          className="mt-4"
          style={{
            fontFamily: 'var(--zl-font-heading)',
            fontSize: 'clamp(0.625rem, 1.5vw, 0.8125rem)',
            fontWeight: 300,
            letterSpacing: 'var(--zl-tracking-luxury)',
            color: 'var(--zl-gold)',
          }}
        >
          THE ART OF EXCEPTIONAL TRAVEL
        </p>

        {/* Gold divider */}
        <div className="flex justify-center mt-8">
          <div
            style={{
              width: '200px',
              height: '1px',
              background: 'linear-gradient(90deg, transparent, var(--zl-gold), transparent)',
            }}
          />
        </div>

        {/* Body copy */}
        <p
          className="mt-8 mx-auto max-w-[620px]"
          style={{
            fontFamily: 'var(--zl-font-body)',
            fontSize: 'clamp(1rem, 2vw, 1.1875rem)',
            lineHeight: 1.85,
            color: 'var(--zl-platinum)',
            fontWeight: 400,
          }}
        >
          We build luxury travel brands that inform, inspire, and monetize.
          From London&apos;s finest hotels to Mediterranean yacht charters —
          every brand in our portfolio meets the same uncompromising standard
          of editorial quality, technical excellence, and cultural authenticity.
        </p>

        {/* Differentiator chips */}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {['6 Destinations', 'Bilingual EN/AR', 'AI-Powered Content'].map((chip) => (
            <span
              key={chip}
              className="inline-block"
              style={{
                fontFamily: 'var(--zl-font-label)',
                fontSize: '0.6875rem',
                letterSpacing: '0.15em',
                color: 'var(--zl-gold)',
                border: '1px solid rgba(196, 169, 108, 0.25)',
                padding: '6px 16px',
              }}
            >
              {chip.toUpperCase()}
            </span>
          ))}
        </div>

        {/* CTA buttons */}
        <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
          <a
            href="#contact"
            className="inline-block no-underline transition-all duration-300 hover:bg-[rgba(196,169,108,0.12)] hover:border-[var(--zl-gold)]"
            style={{
              fontFamily: 'var(--zl-font-label)',
              fontSize: '0.8125rem',
              fontWeight: 500,
              letterSpacing: '0.2em',
              color: 'var(--zl-gold)',
              border: '1px solid rgba(196, 169, 108, 0.4)',
              padding: '14px 40px',
            }}
            onClick={(e) => {
              e.preventDefault();
              document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            BECOME A PARTNER
          </a>
          <a
            href="#portfolio"
            className="inline-block no-underline transition-all duration-300 hover:text-[var(--zl-gold)]"
            style={{
              fontFamily: 'var(--zl-font-label)',
              fontSize: '0.8125rem',
              fontWeight: 400,
              letterSpacing: '0.2em',
              color: 'var(--zl-platinum)',
              padding: '14px 40px',
            }}
            onClick={(e) => {
              e.preventDefault();
              document.getElementById('portfolio')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            EXPLORE BRANDS
          </a>
        </div>
      </div>

      {/* Scroll indicator */}
      <button
        onClick={scrollToSection}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 cursor-pointer bg-transparent border-0"
        aria-label="Scroll to learn more"
      >
        <span
          style={{
            fontFamily: 'var(--zl-font-label)',
            fontSize: '0.625rem',
            letterSpacing: '0.2em',
            color: 'var(--zl-smoke)',
          }}
        >
          SCROLL
        </span>
        <div className="w-px h-8 relative overflow-hidden">
          <div
            className="absolute inset-0 animate-scroll-line"
            style={{ background: 'linear-gradient(180deg, var(--zl-gold), transparent)' }}
          />
        </div>
      </button>

      {/* Scroll-line animation */}
      <style jsx>{`
        @keyframes scroll-line {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        .animate-scroll-line {
          animation: scroll-line 1.5s ease-in-out infinite;
        }
      `}</style>
    </section>
  );
}

// ─── Decorative Diamond SVG ─────────────────────────────────────────

function DiamondAccent({ size = 60 }: { size?: number }) {
  const h = size / 2;
  const inner = h * 0.55;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
      className="opacity-60"
    >
      <polygon
        points={`${h},1 ${size - 1},${h} ${h},${size - 1} 1,${h}`}
        fill="none"
        stroke="var(--zl-gold)"
        strokeWidth={0.5}
      />
      <polygon
        points={`${h},${h - inner} ${h + inner},${h} ${h},${h + inner} ${h - inner},${h}`}
        fill="none"
        stroke="var(--zl-gold)"
        strokeWidth={0.4}
        opacity={0.4}
      />
      <circle cx={h} cy={h} r={2} fill="var(--zl-gold)" />
    </svg>
  );
}
