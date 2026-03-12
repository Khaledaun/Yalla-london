'use client';

import { ScrollReveal } from '../scroll-reveal';
import { BRANDS, type Brand } from '../site-data';

/**
 * PortfolioSection — Brand portfolio grid showing all 6 destination brands.
 * Each card shows brand identity, destination, status, and live link.
 */
export function PortfolioSection() {
  return (
    <section
      id="portfolio"
      className="relative px-6 py-24 md:py-32"
      style={{
        background: 'var(--zl-midnight)',
        borderTop: '1px solid rgba(196, 169, 108, 0.06)',
      }}
    >
      <div className="max-w-[1200px] mx-auto">
        <ScrollReveal variant="fade-up">
          <p
            className="text-center"
            style={{
              fontFamily: 'var(--zl-font-label)',
              fontSize: '0.6875rem',
              letterSpacing: 'var(--zl-tracking-luxury)',
              color: 'var(--zl-gold)',
              marginBottom: '1.5rem',
            }}
          >
            OUR BRANDS
          </p>
        </ScrollReveal>

        <ScrollReveal variant="fade-up" delay={100}>
          <h2
            className="text-center"
            style={{
              fontFamily: 'var(--zl-font-display)',
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              fontWeight: 400,
              letterSpacing: '0.04em',
              color: 'var(--zl-ivory)',
              lineHeight: 1.25,
            }}
          >
            The Portfolio
          </h2>
        </ScrollReveal>

        <ScrollReveal variant="fade-in" delay={200}>
          <p
            className="text-center mx-auto max-w-[600px] mt-4 mb-16"
            style={{
              fontFamily: 'var(--zl-font-body)',
              fontSize: '1rem',
              lineHeight: 1.7,
              color: 'var(--zl-mist)',
            }}
          >
            Six destinations. Six brands. One platform. Each tailored to its market,
            powered by the same technology engine.
          </p>
        </ScrollReveal>

        {/* Brand grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {BRANDS.map((brand, i) => (
            <ScrollReveal key={brand.name} variant="fade-up" delay={250 + i * 80}>
              <BrandCard brand={brand} />
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function BrandCard({ brand }: { brand: Brand }) {
  const isLive = brand.status === 'live';

  return (
    <div
      className="group relative overflow-hidden p-8 transition-all duration-500 hover:translate-y-[-4px]"
      style={{
        background: 'rgba(10, 10, 10, 0.6)',
        border: '1px solid rgba(196, 169, 108, 0.08)',
      }}
    >
      {/* Brand color accent */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: brand.color, opacity: 0.5 }}
      />

      {/* Status badge */}
      <div
        style={{
          fontFamily: 'var(--zl-font-label)',
          fontSize: '0.625rem',
          letterSpacing: '0.2em',
          color: isLive ? 'var(--zl-gold)' : 'var(--zl-smoke)',
          marginBottom: '12px',
        }}
      >
        {isLive ? '● LIVE' : 'COMING SOON'}
      </div>

      {/* Brand name */}
      <h3
        style={{
          fontFamily: 'var(--zl-font-display)',
          fontSize: '1.5rem',
          fontWeight: 500,
          letterSpacing: '0.04em',
          color: 'var(--zl-ivory)',
          margin: 0,
        }}
      >
        {brand.name}
      </h3>

      {/* Tagline */}
      <p
        className="mt-2"
        style={{
          fontFamily: 'var(--zl-font-body)',
          fontSize: '0.9375rem',
          color: 'var(--zl-mist)',
          lineHeight: 1.6,
        }}
      >
        {brand.tagline}
      </p>

      {/* Destination */}
      <p
        className="mt-3"
        style={{
          fontFamily: 'var(--zl-font-label)',
          fontSize: '0.75rem',
          letterSpacing: '0.08em',
          color: 'var(--zl-smoke)',
        }}
      >
        {brand.destination}
      </p>

      {/* Link */}
      {isLive ? (
        <a
          href={brand.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-6 no-underline transition-colors duration-300 hover:text-[var(--zl-gold-light)]"
          style={{
            fontFamily: 'var(--zl-font-label)',
            fontSize: '0.75rem',
            letterSpacing: '0.15em',
            color: 'var(--zl-gold)',
          }}
        >
          VISIT {brand.domain.toUpperCase()} &rarr;
        </a>
      ) : (
        <div
          className="mt-6"
          style={{
            fontFamily: 'var(--zl-font-label)',
            fontSize: '0.75rem',
            letterSpacing: '0.1em',
            color: 'var(--zl-charcoal)',
          }}
        >
          {brand.domain}
        </div>
      )}
    </div>
  );
}
