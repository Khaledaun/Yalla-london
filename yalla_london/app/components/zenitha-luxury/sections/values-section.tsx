'use client';

import { ScrollReveal } from '../scroll-reveal';
import { VALUES } from '../site-data';

/**
 * ValuesSection — 6 value cards with subtle background blocks.
 * Alternating light/dark sections create visual rhythm.
 */
export function ValuesSection() {
  return (
    <section
      id="values"
      className="relative px-6 py-24 md:py-32"
      style={{
        background: 'var(--zl-midnight)',
        borderTop: '1px solid rgba(196, 169, 108, 0.06)',
        borderBottom: '1px solid rgba(196, 169, 108, 0.06)',
      }}
    >
      <div className="max-w-[1100px] mx-auto">
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
            WHAT WE BELIEVE
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
            Our Values &amp; Principles
          </h2>
        </ScrollReveal>

        <ScrollReveal variant="fade-in" delay={200}>
          <div className="flex justify-center mt-6 mb-16">
            <div style={{ width: '60px', height: '1px', background: 'var(--zl-gold)' }} />
          </div>
        </ScrollReveal>

        {/* Values grid — 2 columns on desktop, 1 on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {VALUES.map((value, i) => (
            <ScrollReveal key={value.title} variant="fade-up" delay={250 + i * 80}>
              <div
                className="group p-8 transition-all duration-500 hover:translate-y-[-2px]"
                style={{
                  background: 'rgba(20, 20, 20, 0.5)',
                  border: '1px solid rgba(196, 169, 108, 0.06)',
                }}
              >
                {/* Title with gold accent */}
                <div className="flex items-start gap-4">
                  <div
                    className="mt-1.5 shrink-0"
                    style={{
                      width: '8px',
                      height: '8px',
                      background: 'var(--zl-gold)',
                      opacity: 0.6,
                      transform: 'rotate(45deg)',
                    }}
                  />
                  <div>
                    <h3
                      style={{
                        fontFamily: 'var(--zl-font-display)',
                        fontSize: '1.25rem',
                        fontWeight: 500,
                        letterSpacing: '0.03em',
                        color: 'var(--zl-ivory)',
                        margin: 0,
                      }}
                    >
                      {value.title}
                    </h3>
                    <p
                      className="mt-3"
                      style={{
                        fontFamily: 'var(--zl-font-body)',
                        fontSize: '0.9375rem',
                        lineHeight: 1.75,
                        color: 'var(--zl-mist)',
                      }}
                    >
                      {value.description}
                    </p>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
