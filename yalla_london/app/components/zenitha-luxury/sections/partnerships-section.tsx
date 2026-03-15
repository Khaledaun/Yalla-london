import { ScrollReveal } from '../scroll-reveal';
import { PARTNERSHIP_CARDS } from '../site-data';

/**
 * PartnershipsSection — "Partnerships, not projects."
 *
 * Intent: Position Zenitha as a partner-first venture studio.
 * 4 partnership model cards (Co-build, White-label, Distribution, Insight)
 * with a CTA to the contact form.
 *
 * Section label: 02 — Partnerships
 */
export function PartnershipsSection() {
  return (
    <section
      id="partnerships"
      className="px-6 sm:px-10 lg:px-20 py-16 lg:py-24"
      style={{ background: 'var(--zl-obsidian)' }}
    >
      <div className="max-w-[1360px] mx-auto">
        {/* Section header */}
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
            02 — Partnerships
          </div>
          <h2
            style={{
              fontFamily: 'var(--zl-font-display)',
              fontSize: 'clamp(1.8rem, 3vw, 2.8rem)',
              fontWeight: 400,
              color: 'var(--zl-ivory)',
              margin: '0 0 0.8rem 0',
            }}
          >
            Partnerships, not projects.
          </h2>
          <div
            style={{
              fontFamily: 'var(--zl-font-body)',
              fontSize: '1rem',
              fontWeight: 300,
              color: 'var(--zl-mist)',
              maxWidth: '560px',
              lineHeight: 1.9,
            }}
          >
            We work with hotel groups, tourism boards, charter operators, and
            travel brands who want to reach high&#8209;value audiences through
            products — not just ads. Here&rsquo;s how we collaborate.
          </div>
        </ScrollReveal>

        {/* Partnership cards — 4 column grid on desktop, 2 on tablet, 1 on mobile */}
        <ScrollReveal delay={100}>
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-10"
          >
            {PARTNERSHIP_CARDS.map((card) => (
              <div
                key={card.title}
                className="transition-colors duration-300"
                style={{
                  padding: '1.5rem 1.4rem',
                  border: '1px solid rgba(196, 169, 108, 0.08)',
                  background: 'rgba(255, 255, 255, 0.015)',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor =
                    'rgba(196, 169, 108, 0.22)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor =
                    'rgba(196, 169, 108, 0.08)';
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--zl-font-label)',
                    fontSize: '0.6875rem',
                    letterSpacing: '0.09em',
                    textTransform: 'uppercase' as const,
                    color: 'var(--zl-gold)',
                    marginBottom: '0.6rem',
                  }}
                >
                  {card.title}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--zl-font-body)',
                    fontSize: '0.78rem',
                    color: 'var(--zl-smoke)',
                    lineHeight: 1.7,
                  }}
                >
                  {card.description}
                </div>
              </div>
            ))}
          </div>
        </ScrollReveal>

        {/* CTA */}
        <ScrollReveal delay={200}>
          <div style={{ marginTop: '2.5rem' }}>
            <a
              href="#contact"
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
                document
                  .getElementById('contact')
                  ?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Start a Conversation
            </a>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
