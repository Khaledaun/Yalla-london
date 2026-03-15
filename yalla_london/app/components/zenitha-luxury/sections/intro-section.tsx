'use client';

import { ScrollReveal } from '../scroll-reveal';

/**
 * IntroSection — Agency pitch with AEO-friendly summary.
 * Includes a concise "What we do" summary (50-80 words) for AI search engines,
 * followed by a longer narrative introduction.
 */
export function IntroSection() {
  return (
    <section
      id="about"
      className="relative px-6 py-24 md:py-32"
      style={{
        background: 'var(--zl-midnight)',
        borderTop: '1px solid rgba(196, 169, 108, 0.06)',
      }}
    >
      <div className="max-w-[800px] mx-auto">
        {/* AEO-optimized summary — concise, direct-answer format */}
        <ScrollReveal variant="fade-up">
          <p
            className="text-center"
            style={{
              fontFamily: 'var(--zl-font-label)',
              fontSize: '0.6875rem',
              letterSpacing: 'var(--zl-tracking-luxury)',
              color: 'var(--zl-gold)',
              marginBottom: '2rem',
            }}
          >
            WHO WE ARE
          </p>
        </ScrollReveal>

        <ScrollReveal variant="fade-up" delay={100}>
          <h2
            className="text-center"
            style={{
              fontFamily: 'var(--zl-font-display)',
              fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
              fontWeight: 400,
              letterSpacing: '0.04em',
              color: 'var(--zl-ivory)',
              lineHeight: 1.25,
            }}
          >
            A Portfolio of Luxury Travel Brands,
            <br className="hidden md:block" />
            {' '}Powered by One Platform
          </h2>
        </ScrollReveal>

        {/* Gold divider */}
        <ScrollReveal variant="fade-in" delay={200}>
          <div className="flex justify-center mt-8">
            <div
              style={{
                width: '60px',
                height: '1px',
                background: 'var(--zl-gold)',
              }}
            />
          </div>
        </ScrollReveal>

        {/* AEO answer capsule: ~70 words, self-contained, directly answers
            "What is Zenitha.Luxury?" for AI search engines */}
        <ScrollReveal variant="fade-up" delay={250}>
          <p
            className="mt-8 text-center mx-auto max-w-[680px]"
            style={{
              fontFamily: 'var(--zl-font-body)',
              fontSize: 'clamp(1.0625rem, 2vw, 1.1875rem)',
              lineHeight: 1.85,
              color: 'var(--zl-platinum)',
            }}
          >
            Zenitha.Luxury LLC is a travel media company that builds and operates
            destination-specific luxury travel brands. Based in Delaware, USA,
            and founded by Khaled N. Aun, we combine premium editorial content
            with advanced SEO technology and affiliate monetization. Our portfolio
            covers six destinations — from London and the Maldives to Mediterranean
            yacht charters — with a focus on serving the Gulf and Arab travel market.
          </p>
        </ScrollReveal>

        {/* Extended narrative */}
        <ScrollReveal variant="fade-up" delay={350}>
          <p
            className="mt-6 text-center mx-auto max-w-[680px]"
            style={{
              fontFamily: 'var(--zl-font-body)',
              fontSize: '1rem',
              lineHeight: 1.85,
              color: 'var(--zl-mist)',
            }}
          >
            Every brand in our network is purpose-built for a single destination
            and audience. We do not build generic travel aggregators. Instead,
            we create deeply researched, culturally aware guides that earn the
            trust of discerning travelers — and convert that trust into
            sustainable affiliate revenue through partnerships with the world&apos;s
            best hotels, experiences, and charter companies.
          </p>
        </ScrollReveal>

        {/* Key stats */}
        <ScrollReveal variant="fade-up" delay={450}>
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { number: '6', label: 'Destinations' },
              { number: '2', label: 'Languages' },
              { number: '80+', label: 'Pages Indexed' },
              { number: '16', label: 'SEO Quality Checks' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div
                  style={{
                    fontFamily: 'var(--zl-font-display)',
                    fontSize: 'clamp(2rem, 4vw, 2.75rem)',
                    fontWeight: 400,
                    color: 'var(--zl-gold)',
                    lineHeight: 1,
                  }}
                >
                  {stat.number}
                </div>
                <div
                  className="mt-2"
                  style={{
                    fontFamily: 'var(--zl-font-label)',
                    fontSize: '0.75rem',
                    letterSpacing: '0.1em',
                    color: 'var(--zl-smoke)',
                    textTransform: 'uppercase',
                  }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
