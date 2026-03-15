'use client';

import { ScrollReveal } from '../scroll-reveal';
import { PILLARS } from '../site-data';

/**
 * AboutSection — 2-column grid: image with badge overlay (left),
 * section label + title + description + 4 pillar cards (right).
 */
export function AboutSection() {
  return (
    <section
      id="about"
      className="px-6 sm:px-10 lg:px-20 py-16 lg:py-24"
      style={{ background: 'var(--zl-obsidian)' }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-center max-w-[1360px] mx-auto">
        {/* Left: Image with badge */}
        <ScrollReveal>
          <div className="relative">
            {/* Decorative border frame */}
            <div
              className="absolute hidden lg:block"
              style={{
                top: '-1rem',
                left: '-1rem',
                right: '1rem',
                bottom: '1rem',
                border: '1px solid rgba(196, 169, 108, 0.1)',
                zIndex: 0,
              }}
            />
            {/* TODO: Replace with a Mayfair / brand image from your own assets. */}
            <img
              src="/branding/zenitha-luxury/images/banner.png"
              alt="Mayfair London"
              className="relative z-10 w-full object-cover"
              style={{ height: '480px' }}
            />
            {/* Badge overlay */}
            <div
              className="absolute z-20 hidden lg:block"
              style={{
                bottom: '2rem',
                right: '-2rem',
                background: 'var(--zl-midnight)',
                border: '1px solid rgba(196, 169, 108, 0.12)',
                padding: '1.2rem 1.5rem',
                width: '180px',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--zl-font-display)',
                  fontSize: '1.9rem',
                  color: 'var(--zl-gold)',
                }}
              >
                2026
              </div>
              <div
                style={{
                  fontFamily: 'var(--zl-font-label)',
                  fontSize: '0.625rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase' as const,
                  color: 'var(--zl-smoke)',
                  marginTop: '0.15rem',
                }}
              >
                Scaling Year
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Right: Content */}
        <div>
          <ScrollReveal>
            <div
              style={{
                fontFamily: 'var(--zl-font-label)',
                fontSize: '0.625rem',
                letterSpacing: 'var(--zl-tracking-luxury)',
                textTransform: 'uppercase' as const,
                color: 'var(--zl-gold-deep)',
                marginBottom: '0.65rem',
              }}
            >
              01 — About
            </div>
            <div
              style={{
                fontFamily: 'var(--zl-font-display)',
                fontSize: 'clamp(1.8rem, 3vw, 2.8rem)',
                fontWeight: 400,
                color: 'var(--zl-ivory)',
                marginBottom: '0.8rem',
              }}
            >
              One Standard of Excellence
            </div>
            <div
              style={{
                fontFamily: 'var(--zl-font-body)',
                fontSize: '1rem',
                fontWeight: 300,
                color: 'var(--zl-mist)',
                maxWidth: '540px',
                lineHeight: 1.9,
              }}
            >
              Zenitha Luxury builds and operates digital experiences for luxury
              travellers, with a specific focus on bilingual (EN/AR) audiences
              and high&#8209;touch journeys across London and yachting
              destinations.
            </div>
          </ScrollReveal>

          {/* Pillars grid */}
          <ScrollReveal delay={100}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8">
              {PILLARS.map((pillar) => (
                <div
                  key={pillar.title}
                  className="transition-colors duration-300"
                  style={{
                    padding: '1rem 1.2rem',
                    border: '1px solid rgba(196, 169, 108, 0.06)',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor =
                      'rgba(196, 169, 108, 0.18)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor =
                      'rgba(196, 169, 108, 0.06)';
                  }}
                >
                  <div
                    style={{
                      fontFamily: 'var(--zl-font-label)',
                      fontSize: '0.6875rem',
                      letterSpacing: '0.07em',
                      textTransform: 'uppercase' as const,
                      color: 'var(--zl-gold)',
                      marginBottom: '0.25rem',
                    }}
                  >
                    {pillar.title}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--zl-font-body)',
                      fontSize: '0.75rem',
                      color: 'var(--zl-smoke)',
                      lineHeight: 1.65,
                    }}
                  >
                    {pillar.description}
                  </div>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
