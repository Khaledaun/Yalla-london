import { ScrollReveal } from '../scroll-reveal';
import { ZENITHA_YACHTS_DETAIL } from '../site-data';

/**
 * ZenithaYachtsSection — 2-column detail: bullet list left, image right (reversed layout).
 */
export function ZenithaYachtsSection() {
  const d = ZENITHA_YACHTS_DETAIL;

  return (
    <section
      id="zenitha-yachts"
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
              {d.title}
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
              {d.description}
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-center">
            {/* Bullets + footnote (LEFT — reversed from Yalla London) */}
            <div>
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: '0 0 1.8rem 0',
                  fontFamily: 'var(--zl-font-body)',
                }}
              >
                {d.bullets.map((bullet, i) => (
                  <li
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      fontSize: '0.82rem',
                      color: 'rgba(245, 240, 232, 0.6)',
                      lineHeight: 1.7,
                      padding: '0.4rem 0',
                      borderBottom: '1px solid rgba(196, 169, 108, 0.04)',
                    }}
                  >
                    <span style={{ color: 'var(--zl-gold-deep)', flexShrink: 0, marginTop: '0.1rem' }}>&mdash;</span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
              <p
                style={{
                  fontFamily: 'var(--zl-font-body)',
                  fontSize: '0.78rem',
                  color: 'rgba(245, 240, 232, 0.45)',
                  lineHeight: 1.85,
                }}
              >
                {d.footnote}
              </p>
            </div>

            {/* Image (RIGHT) */}
            <img
              src={d.image}
              alt={d.imageAlt}
              className="w-full object-cover"
              style={{ height: '420px' }}
              loading="lazy"
              width={680}
              height={420}
            />
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
