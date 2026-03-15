'use client';

import { useState, useEffect, useCallback } from 'react';
import { NAV_ITEMS } from './site-data';

/**
 * ZenithaLuxuryHeader — Sticky header with anchor-link navigation for single-page scrolling.
 * Highlights active section based on scroll position. Full-height mobile menu with hamburger.
 */
export function ZenithaLuxuryHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('');

  // Track scroll for header background + active section
  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 60);

      // Find active section
      const sections = NAV_ITEMS.map((item) => item.href.replace('#', ''));
      let current = '';
      for (const id of sections) {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 120) current = id;
        }
      }
      setActiveSection(current);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Lock body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const scrollTo = useCallback((href: string) => {
    setMobileOpen(false);
    const id = href.replace('#', '');
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
      style={{
        background: scrolled ? 'rgba(10, 10, 10, 0.97)' : 'rgba(10, 10, 10, 0.4)',
        backdropFilter: 'blur(12px)',
        borderBottom: scrolled
          ? '1px solid rgba(196, 169, 108, 0.12)'
          : '1px solid transparent',
      }}
    >
      <div className="max-w-[1360px] mx-auto px-6 h-[72px] flex items-center justify-between">
        {/* Logo */}
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          className="flex items-center gap-3 no-underline"
        >
          <DiamondIcon size={28} />
          <span
            style={{
              fontFamily: 'var(--zl-font-display)',
              fontSize: '1.25rem',
              fontWeight: 600,
              letterSpacing: '0.08em',
              color: 'var(--zl-ivory)',
            }}
          >
            ZENITHA
          </span>
          <span
            style={{
              fontFamily: 'var(--zl-font-label)',
              fontSize: '0.5rem',
              fontWeight: 300,
              letterSpacing: '0.55em',
              color: 'var(--zl-gold)',
              marginLeft: '-4px',
            }}
          >
            LUXURY
          </span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-6 xl:gap-8" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.href.replace('#', '');
            return (
              <a
                key={item.href}
                href={item.href}
                onClick={(e) => { e.preventDefault(); scrollTo(item.href); }}
                className="no-underline transition-colors duration-300 relative"
                style={{
                  fontFamily: 'var(--zl-font-label)',
                  fontSize: '0.75rem',
                  fontWeight: 400,
                  letterSpacing: '0.12em',
                  color: isActive ? 'var(--zl-gold)' : 'var(--zl-platinum)',
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = 'var(--zl-gold-light)'; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = 'var(--zl-platinum)'; }}
              >
                {item.label.toUpperCase()}
                {/* Active indicator */}
                {isActive && (
                  <span
                    className="absolute left-0 right-0 -bottom-1"
                    style={{
                      height: '1px',
                      background: 'var(--zl-gold)',
                      opacity: 0.6,
                    }}
                  />
                )}
              </a>
            );
          })}
        </nav>

        {/* Mobile hamburger */}
        <button
          className="lg:hidden relative w-10 h-10 flex items-center justify-center"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
        >
          <div className="relative w-5 h-4">
            <span
              className="absolute left-0 right-0 h-[1.5px] transition-all duration-300"
              style={{
                background: 'var(--zl-ivory)',
                top: mobileOpen ? '7px' : '0',
                transform: mobileOpen ? 'rotate(45deg)' : 'rotate(0)',
              }}
            />
            <span
              className="absolute left-0 right-0 h-[1.5px] top-[7px] transition-all duration-300"
              style={{
                background: 'var(--zl-ivory)',
                opacity: mobileOpen ? 0 : 1,
              }}
            />
            <span
              className="absolute left-0 right-0 h-[1.5px] transition-all duration-300"
              style={{
                background: 'var(--zl-ivory)',
                top: mobileOpen ? '7px' : '14px',
                transform: mobileOpen ? 'rotate(-45deg)' : 'rotate(0)',
              }}
            />
          </div>
        </button>
      </div>

      {/* Mobile full-screen menu */}
      <div
        className="lg:hidden fixed inset-0 transition-all duration-500"
        style={{
          top: '72px',
          background: 'rgba(10, 10, 10, 0.98)',
          backdropFilter: 'blur(20px)',
          opacity: mobileOpen ? 1 : 0,
          pointerEvents: mobileOpen ? 'auto' : 'none',
          transform: mobileOpen ? 'translateY(0)' : 'translateY(-8px)',
        }}
      >
        <nav className="flex flex-col items-center justify-center h-full gap-1 -mt-[72px]" aria-label="Mobile navigation">
          {NAV_ITEMS.map((item, i) => (
            <a
              key={item.href}
              href={item.href}
              onClick={(e) => { e.preventDefault(); scrollTo(item.href); }}
              className="no-underline py-4 transition-all duration-300"
              style={{
                fontFamily: 'var(--zl-font-display)',
                fontSize: '1.5rem',
                fontWeight: 400,
                letterSpacing: '0.08em',
                color: activeSection === item.href.replace('#', '')
                  ? 'var(--zl-gold)'
                  : 'var(--zl-platinum)',
                transitionDelay: mobileOpen ? `${i * 50}ms` : '0ms',
                opacity: mobileOpen ? 1 : 0,
                transform: mobileOpen ? 'translateY(0)' : 'translateY(10px)',
              }}
            >
              {item.label}
            </a>
          ))}

          {/* Mobile contact CTA */}
          <a
            href="#contact"
            onClick={(e) => { e.preventDefault(); scrollTo('#contact'); }}
            className="mt-8 no-underline transition-all duration-300"
            style={{
              fontFamily: 'var(--zl-font-label)',
              fontSize: '0.8125rem',
              letterSpacing: '0.2em',
              color: 'var(--zl-gold)',
              border: '1px solid rgba(196, 169, 108, 0.4)',
              padding: '14px 40px',
              opacity: mobileOpen ? 1 : 0,
              transitionDelay: mobileOpen ? `${NAV_ITEMS.length * 50}ms` : '0ms',
            }}
          >
            GET IN TOUCH
          </a>
        </nav>
      </div>
    </header>
  );
}

function DiamondIcon({ size = 28 }: { size?: number }) {
  const h = size / 2;
  const inner = h * 0.6;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <polygon
        points={`${h},0 ${size},${h} ${h},${size} 0,${h}`}
        fill="none"
        stroke="#C4A96C"
        strokeWidth={size * 0.02}
      />
      <polygon
        points={`${h},${h - inner} ${h + inner},${h} ${h},${h + inner} ${h - inner},${h}`}
        fill="none"
        stroke="#C4A96C"
        strokeWidth={size * 0.015}
        opacity={0.4}
      />
      <circle cx={h} cy={h} r={size * 0.05} fill="#C4A96C" />
    </svg>
  );
}
