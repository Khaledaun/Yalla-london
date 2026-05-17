import { ScrollReveal } from '../scroll-reveal';
import { AMBASSADOR_BULLETS } from '../site-data';

/**
 * AmbassadorsSection — "Real people, real journeys."
 *
 * Intent: Counter the "just AI content" perception by spotlighting
 * genuine, on-the-ground travel ambassadors. Positioned between
 * Partnerships and Products to establish credibility before
 * showing the live portfolio.
 */
export function AmbassadorsSection() {
  return (
    <section
      id="ambassadors"
      className="px-6 sm:px-10 lg:px-20 py-16 lg:py-24"
      style={{ background: 'var(--zl-midnight, #141414)' }}
    >
      <div className="max-w-[1360px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-center">
        {/* Left: Image */}
        <ScrollReveal>
          <div className="relative">
            <div
              className="absolute hidden lg:block"
              style={{
                top: '-1rem',
                left: '-1rem',
                right: '1rem',
                bottom: '1rem',
                border: '1px solid rgba(196, 169, 108, 0.08)',
                zIndex: 0,
              }}
            />
            <img
              src="https://images.unsplash.com/photo-1500051638674-ff996a0ec29e?w=1280&q=80&auto=format"
              alt="Travel ambassador with camera at sunset"
              className="relative z-10 w-full object-cover"
              style={{ height: '420px' }}
              loading="lazy"
              width={680}
              height={420}
            />
          </div>
        </ScrollReveal>

        {/* Right: Copy */}
        <ScrollReveal delay={100}>
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
            Our People
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
            Real people, real journeys.
          </h2>
          <p
            style={{
              fontFamily: 'var(--zl-font-body)',
              fontSize: '1rem',
              fontWeight: 300,
              color: 'var(--zl-mist)',
              lineHeight: 1.9,
              marginBottom: '1.8rem',
            }}
          >
            Behind our products is a network of travel ambassadors —
            photographers, writers and locals around the world who contribute
            genuine content, footage and feedback. AI helps us scale; people
            keep it honest.
          </p>

          {/* Bullet list
              TODO: Replace static bullets with ambassador profiles from CMS.
              TODO: Add a world map or location pins showing ambassador presence. */}
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              fontFamily: 'var(--zl-font-body)',
            }}
          >
            {AMBASSADOR_BULLETS.map((bullet, i) => (
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
                <span
                  style={{
                    color: 'var(--zl-gold-deep)',
                    flexShrink: 0,
                    marginTop: '0.1rem',
                  }}
                >
                  &mdash;
                </span>
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        </ScrollReveal>
      </div>
    </section>
  );
}
