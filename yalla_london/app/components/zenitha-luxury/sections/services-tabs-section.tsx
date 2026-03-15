'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ScrollReveal } from '../scroll-reveal';
import { SERVICE_TABS } from '../site-data';
import { GallerySection } from './gallery-section';

/**
 * ServicesTabsSection — Accessible tabbed interface for Yalla London / Zenitha Yachts.
 * ARIA: role="tablist", role="tab" with aria-selected/aria-controls, role="tabpanel" with aria-labelledby.
 * Keyboard: Left/Right arrows switch tabs.
 * Gallery strip rendered below the panels.
 */
export function ServicesTabsSection() {
  const [activeTab, setActiveTab] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      let next = activeTab;
      if (e.key === 'ArrowRight') {
        next = (activeTab + 1) % SERVICE_TABS.length;
      } else if (e.key === 'ArrowLeft') {
        next = (activeTab - 1 + SERVICE_TABS.length) % SERVICE_TABS.length;
      } else {
        return;
      }
      e.preventDefault();
      setActiveTab(next);
    },
    [activeTab],
  );

  useEffect(() => {
    tabRefs.current[activeTab]?.focus();
  }, [activeTab]);

  const activePanel = SERVICE_TABS[activeTab];

  return (
    <section
      id="products"
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
            {/* Intent: Renumbered to 03; reframed as "Products" not "Services" */}
            03 — Products
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
            Live Products
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
            Two products live today — Yalla London and Zenitha Yachts — with
            additional brands in the pipeline. Each product combines
            AI&#8209;assisted discovery with human&#8209;curated editorial.
          </div>
        </ScrollReveal>

        {/* Tab bar */}
        <ScrollReveal>
          <div
            role="tablist"
            aria-label="Service platforms"
            className="flex overflow-hidden"
            style={{
              marginTop: '2.5rem',
              marginBottom: '2.5rem',
              border: '1px solid rgba(196, 169, 108, 0.08)',
            }}
            onKeyDown={handleKeyDown}
          >
            {SERVICE_TABS.map((tab, i) => (
              <button
                key={tab.id}
                ref={(el) => { tabRefs.current[i] = el; }}
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={i === activeTab}
                aria-controls={`panel-${tab.id}`}
                tabIndex={i === activeTab ? 0 : -1}
                className="flex-1 text-center transition-colors duration-300"
                style={{
                  padding: '0.75rem 0.8rem',
                  fontFamily: 'var(--zl-font-label)',
                  fontSize: '0.625rem',
                  letterSpacing: '0.09em',
                  textTransform: 'uppercase' as const,
                  background:
                    i === activeTab
                      ? 'rgba(196, 169, 108, 0.05)'
                      : 'transparent',
                  border: 'none',
                  borderRight:
                    i < SERVICE_TABS.length - 1
                      ? '1px solid rgba(196, 169, 108, 0.06)'
                      : 'none',
                  color:
                    i === activeTab
                      ? 'var(--zl-gold)'
                      : 'rgba(245, 240, 232, 0.3)',
                  cursor: 'pointer',
                }}
                onClick={() => setActiveTab(i)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </ScrollReveal>

        {/* Active panel */}
        <div
          key={activePanel.id}
          role="tabpanel"
          id={`panel-${activePanel.id}`}
          aria-labelledby={`tab-${activePanel.id}`}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-start"
        >
          {/* Image */}
          <ScrollReveal>
            <img
              src={activePanel.image}
              alt={activePanel.imageAlt}
              className="w-full object-cover"
              style={{ height: '350px' }}
              loading="lazy"
              width={680}
              height={350}
            />
          </ScrollReveal>

          {/* Content */}
          <ScrollReveal delay={100}>
            <h3
              style={{
                fontFamily: 'var(--zl-font-display)',
                fontSize: '1.75rem',
                fontWeight: 400,
                color: 'var(--zl-ivory)',
                marginBottom: '0.65rem',
              }}
            >
              {activePanel.title}
            </h3>
            <p
              style={{
                fontFamily: 'var(--zl-font-body)',
                fontSize: '0.98rem',
                fontWeight: 300,
                color: 'var(--zl-mist)',
                lineHeight: 1.9,
                marginBottom: '1.4rem',
              }}
            >
              {activePanel.description}
            </p>

            {/* Feature list */}
            <div
              className="flex flex-col"
              style={{ gap: '0.55rem', marginBottom: '1.6rem' }}
            >
              {activePanel.items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start"
                  style={{
                    gap: '0.7rem',
                    fontFamily: 'var(--zl-font-body)',
                    fontSize: '0.72rem',
                    fontWeight: 300,
                    color: 'var(--zl-mist)',
                    lineHeight: 1.6,
                  }}
                >
                  <span
                    style={{
                      color: 'var(--zl-gold)',
                      flexShrink: 0,
                    }}
                  >
                    —
                  </span>
                  {item}
                </div>
              ))}
            </div>

            <a
              href={activePanel.ctaHref}
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
                  .getElementById(activePanel.ctaHref.replace('#', ''))
                  ?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              {activePanel.ctaLabel}
            </a>
          </ScrollReveal>
        </div>

        {/* Gallery strip */}
        <GallerySection />
      </div>
    </section>
  );
}
