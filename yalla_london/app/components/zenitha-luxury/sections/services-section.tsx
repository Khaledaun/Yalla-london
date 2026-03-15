'use client';

import { ScrollReveal } from '../scroll-reveal';
import { SERVICES, type Service } from '../site-data';

/**
 * ServicesSection — Grid of service cards with icons and hover states.
 * 3 columns on desktop, 2 on tablet, 1 on mobile.
 */
export function ServicesSection() {
  return (
    <section
      id="services"
      className="relative px-6 py-24 md:py-32"
      style={{ background: 'var(--zl-obsidian)' }}
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
            WHAT WE BUILD
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
            Our Capabilities
          </h2>
        </ScrollReveal>

        <ScrollReveal variant="fade-in" delay={200}>
          <div className="flex justify-center mt-6 mb-16">
            <div style={{ width: '60px', height: '1px', background: 'var(--zl-gold)' }} />
          </div>
        </ScrollReveal>

        {/* Services grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {SERVICES.map((service, i) => (
            <ScrollReveal key={service.title} variant="fade-up" delay={200 + i * 60}>
              <ServiceCard service={service} />
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function ServiceCard({ service }: { service: Service }) {
  return (
    <div
      className="group relative p-7 transition-all duration-500 hover:translate-y-[-4px]"
      style={{
        background: 'var(--zl-midnight)',
        border: '1px solid rgba(196, 169, 108, 0.06)',
      }}
    >
      {/* Hover glow effect */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at top left, rgba(196, 169, 108, 0.04) 0%, transparent 70%)',
        }}
      />

      <div className="relative">
        {/* Icon */}
        <div className="mb-4">
          <ServiceIcon icon={service.icon} />
        </div>

        {/* Title */}
        <h3
          style={{
            fontFamily: 'var(--zl-font-display)',
            fontSize: '1.1875rem',
            fontWeight: 500,
            letterSpacing: '0.03em',
            color: 'var(--zl-ivory)',
            margin: 0,
          }}
        >
          {service.title}
        </h3>

        {/* Description */}
        <p
          className="mt-3"
          style={{
            fontFamily: 'var(--zl-font-body)',
            fontSize: '0.875rem',
            lineHeight: 1.7,
            color: 'var(--zl-mist)',
          }}
        >
          {service.description}
        </p>
      </div>
    </div>
  );
}

function ServiceIcon({ icon }: { icon: Service['icon'] }) {
  const color = 'var(--zl-gold)';
  const size = 28;

  const paths: Record<string, JSX.Element> = {
    brand: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" aria-hidden="true">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
    web: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" aria-hidden="true">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    ),
    content: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" aria-hidden="true">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    seo: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" aria-hidden="true">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    affiliate: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" aria-hidden="true">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
      </svg>
    ),
    analytics: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" aria-hidden="true">
        <path d="M18 20V10M12 20V4M6 20v-6" />
      </svg>
    ),
    automation: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" aria-hidden="true">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
    ),
    consulting: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" aria-hidden="true">
        <path d="M2 20l2-4h4l4-8 4 8h4l2 4" />
        <circle cx="12" cy="5" r="3" />
      </svg>
    ),
    media: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    ),
  };

  return paths[icon] || null;
}
