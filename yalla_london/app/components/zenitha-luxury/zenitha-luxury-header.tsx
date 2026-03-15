'use client';

import { useState, useEffect, useCallback } from 'react';
import { NAV_ITEMS } from './site-data';

/**
 * ZenithaLuxuryHeader — Sticky header matching skeleton nav.
 * Logo as text "Zenitha .Luxury", nav links, gold "Enquire" CTA.
 * Scrolled state: darker background with blur + border.
 * Mobile: hide nav links except CTA, show hamburger.
 */
export function ZenithaLuxuryHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('');

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 50);

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

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const scrollTo = useCallback((href: string) => {
    setMobileOpen(false);
    const id = href.replace('#', '');
    if (id === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
      style={{
        padding: scrolled ? '0.75rem 3rem' : '1.2rem 3rem',
        background: scrolled
          ? 'rgba(10, 10, 10, 0.95)'
          : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled
          ? '1px solid rgba(196, 169, 108, 0.08)'
          : '1px solid transparent',
      }}
    >
      <div className="flex items-center justify-between max-w-[1360px] mx-auto">
        {/* Logo */}
        <a
          href="#top"
          onClick={(e) => { e.preventDefault(); scrollTo('#top'); }}
          className="flex items-center no-underline"
          style={{ gap: '0.4rem' }}
        >
          <span
            style={{
              fontFamily: 'var(--zl-font-display)',
              fontSize: '1.25rem',
              letterSpacing: '0.06em',
              color: 'var(--zl-gold)',
            }}
          >
            Zenitha
          </span>
          <em
            style={{
              fontFamily: 'var(--zl-font-body)',
              fontStyle: 'italic',
              fontSize: '0.9rem',
              color: 'var(--zl-gold-deep)',
            }}
          >
            .Luxury
          </em>
        </a>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center" style={{ gap: '2rem' }} aria-label="Main navigation">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={(e) => { e.preventDefault(); scrollTo(item.href); }}
              className="no-underline transition-colors duration-300"
              style={{
                fontFamily: 'var(--zl-font-label)',
                fontSize: '0.625rem',
                letterSpacing: '0.14em',
                textTransform: 'uppercase' as const,
                color:
                  activeSection === item.href.replace('#', '')
                    ? 'var(--zl-gold)'
                    : 'rgba(245, 240, 232, 0.4)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = 'var(--zl-gold)';
              }}
              onMouseLeave={(e) => {
                if (activeSection !== item.href.replace('#', '')) {
                  (e.currentTarget as HTMLElement).style.color =
                    'rgba(245, 240, 232, 0.4)';
                }
              }}
            >
              {item.label}
            </a>
          ))}

          {/* Enquire CTA */}
          <a
            href="#contact"
            onClick={(e) => { e.preventDefault(); scrollTo('#contact'); }}
            className="no-underline transition-colors duration-300"
            style={{
              fontFamily: 'var(--zl-font-label)',
              fontSize: '0.625rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase' as const,
              background: 'var(--zl-gold)',
              color: 'var(--zl-obsidian)',
              padding: '0.45rem 1.25rem',
              fontWeight: 600,
            }}
          >
            Enquire
          </a>
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

      {/* Mobile menu */}
      <div
        className="lg:hidden fixed inset-0 transition-all duration-500"
        style={{
          top: '60px',
          background: 'rgba(10, 10, 10, 0.98)',
          backdropFilter: 'blur(20px)',
          opacity: mobileOpen ? 1 : 0,
          pointerEvents: mobileOpen ? 'auto' : 'none',
        }}
      >
        <nav className="flex flex-col items-center justify-center h-full gap-1 -mt-[60px]" aria-label="Mobile navigation">
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
                color:
                  activeSection === item.href.replace('#', '')
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

          <a
            href="#contact"
            onClick={(e) => { e.preventDefault(); scrollTo('#contact'); }}
            className="mt-8 no-underline transition-all duration-300"
            style={{
              fontFamily: 'var(--zl-font-label)',
              fontSize: '0.8125rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase' as const,
              color: 'var(--zl-gold)',
              border: '1px solid rgba(196, 169, 108, 0.4)',
              padding: '14px 40px',
              opacity: mobileOpen ? 1 : 0,
              transitionDelay: mobileOpen ? `${NAV_ITEMS.length * 50}ms` : '0ms',
            }}
          >
            ENQUIRE
          </a>
        </nav>
      </div>
    </header>
  );
}
