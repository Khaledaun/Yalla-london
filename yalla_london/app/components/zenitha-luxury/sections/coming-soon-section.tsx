import { ScrollReveal } from '../scroll-reveal';
import { COMING_SOON_CARDS } from '../site-data';

/**
 * ComingSoonSection — Dark surface with 3-column grid of placeholder cards.
 * Faded cards rendered with reduced opacity and dashed border.
 */
export function ComingSoonSection() {
  return (
    <section
      id="coming-soon"
      className="px-6 sm:px-10 lg:px-20 py-16 lg:py-24"
      style={{
        background: 'var(--zl-midnight)',
        borderTop: '1px solid rgba(196, 169, 108, 0.08)',
        borderBottom: '1px solid rgba(196, 169, 108, 0.08)',
      }}
    >
      <div className="max-w-[1360px] mx-auto">
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
            03 — Future
          </div>
          <h2
            style={{
              fontFamily: 'var(--zl-font-display)',
              fontSize: 'clamp(1.8rem, 3vw, 2.8rem)',
              fontWeight: 400,
              color: 'var(--zl-ivory)',
              marginBottom: '0.8rem',
              margin: '0 0 0.8rem 0',
            }}
          >
            Coming Soon
          </h2>
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
            A monochrome snapshot of ideas in the Zenitha pipeline. Names and
            descriptions below are placeholders and must be updated once
            strategy and branding are final.
          </div>
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-10">
            {COMING_SOON_CARDS.map((card) => (
              <div
                key={card.name}
                aria-disabled="true"
                style={{
                  border: card.faded
                    ? '1px dashed rgba(245, 240, 232, 0.06)'
                    : '1px solid rgba(245, 240, 232, 0.1)',
                  padding: '1.8rem 1.6rem',
                  background: card.faded
                    ? 'rgba(10, 10, 10, 0.3)'
                    : 'rgba(10, 10, 10, 0.6)',
                  opacity: card.faded ? 0.45 : 0.85,
                  cursor: 'default',
                  userSelect: 'none' as const,
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--zl-font-display)',
                    fontSize: '1.1rem',
                    color: card.faded ? 'var(--zl-smoke)' : 'var(--zl-cream)',
                    marginBottom: '0.35rem',
                  }}
                >
                  {card.name}
                </div>
                {card.tag && (
                  <div
                    style={{
                      fontFamily: 'var(--zl-font-label)',
                      fontSize: '0.625rem',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase' as const,
                      color: 'rgba(245, 240, 232, 0.35)',
                      marginBottom: '0.4rem',
                    }}
                  >
                    {card.tag}
                  </div>
                )}
                <div
                  style={{
                    fontFamily: 'var(--zl-font-body)',
                    fontSize: '0.7rem',
                    color: 'rgba(245, 240, 232, 0.4)',
                    lineHeight: 1.7,
                  }}
                >
                  {card.description}
                </div>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
