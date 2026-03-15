'use client';

import { ScrollReveal } from '../scroll-reveal';
import { GALLERY_ITEMS } from '../site-data';

/**
 * GallerySection — 5 expandable image panels with hover-to-expand CSS flex transitions.
 * Each panel flex:1, on hover flex:3.5, transition 0.7s.
 * Rendered inside ServicesTabsSection.
 */
export function GallerySection() {
  return (
    <ScrollReveal>
      {/* TODO: Replace all gallery images with licensed Zenitha assets. */}
      <div
        className="flex overflow-hidden"
        style={{ gap: '4px', height: '280px', marginTop: '3.5rem' }}
      >
        {GALLERY_ITEMS.map((item) => (
          <div
            key={item.title}
            className="group relative overflow-hidden"
            style={{
              flex: 1,
              minWidth: '40px',
              cursor: 'pointer',
              transition: 'flex 0.7s var(--zl-ease-luxury)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.flex = '3.5';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.flex = '1';
            }}
          >
            <img
              src={item.image}
              alt={item.alt}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700"
              style={{
                transitionTimingFunction: 'var(--zl-ease-luxury)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(1.07)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
              }}
            />
            {/* Gradient overlay */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(180deg, transparent 25%, rgba(10, 10, 10, 0.8) 100%)',
              }}
            />
            {/* Info — visible on hover */}
            <div
              className="absolute opacity-0 group-hover:opacity-100 transition-all duration-500"
              style={{
                bottom: '0.9rem',
                left: '0.9rem',
                transform: 'translateY(5px)',
                transitionTimingFunction: 'var(--zl-ease-luxury)',
                transitionDelay: '0.1s',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--zl-font-display)',
                  fontSize: '0.9rem',
                  color: 'var(--zl-ivory)',
                  marginBottom: '0.12rem',
                }}
              >
                {item.title}
              </div>
              <div
                style={{
                  fontFamily: 'var(--zl-font-label)',
                  fontSize: '0.625rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase' as const,
                  color: 'var(--zl-gold)',
                }}
              >
                {item.subtitle}
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollReveal>
  );
}
