import { ScrollReveal } from '../scroll-reveal';
import { YALLA_LONDON_DETAIL } from '../site-data';

/**
 * YallaLondonSection — 2-column detail: image left, bullet list right.
 */
export function YallaLondonSection() {
  const d = YALLA_LONDON_DETAIL;

  return (
    <section
      id="yalla-london"
      className="px-6 sm:px-10 lg:px-20 py-16 lg:py-24"
      style={{ background: 'var(--zl-obsidian)' }}
    >
      <div className="max-w-[1360px] mx-auto">
        <ScrollReveal>
          <div style={{ marginBottom: '3rem' }}>
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
              {d.sectionNumber} — {d.sectionLabel}
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
              {d.title}
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
              {d.description}
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-center">
            {/* Image */}
            {/* TODO: Replace with Yalla London brand image. */}
            <img
              src={d.image}
              alt={d.imageAlt}
              className="w-full object-cover"
              style={{ height: '420px' }}
            />

            {/* Bullets + footnote */}
            <div>
              <div
                className="flex flex-col"
                style={{
                  gap: '0.6rem',
                  marginBottom: '1.8rem',
                  fontSize: '0.75rem',
                  color: 'rgba(245, 240, 232, 0.5)',
                  fontFamily: 'var(--zl-font-body)',
                }}
              >
                {d.bullets.map((bullet, i) => (
                  <div key={i}>&bull; {bullet}</div>
                ))}
              </div>
              <p
                style={{
                  fontFamily: 'var(--zl-font-body)',
                  fontSize: '0.75rem',
                  color: 'rgba(245, 240, 232, 0.45)',
                  lineHeight: 1.85,
                }}
              >
                {d.footnote}
              </p>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
