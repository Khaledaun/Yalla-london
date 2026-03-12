'use client';

import { useState } from 'react';
import { ScrollReveal } from '../scroll-reveal';
import { FAQS, type FAQ } from '../site-data';

/**
 * FAQSection — Accordion FAQ list structured for future FAQ JSON-LD schema.
 * Each Q&A pair uses semantic <details>-like behavior with accessible ARIA.
 */
export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  function toggle(i: number) {
    setOpenIndex((prev) => (prev === i ? null : i));
  }

  return (
    <section
      id="faq"
      className="relative px-6 py-24 md:py-32"
      style={{
        background: 'var(--zl-midnight)',
        borderTop: '1px solid rgba(196, 169, 108, 0.06)',
      }}
    >
      <div className="max-w-[800px] mx-auto">
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
            FAQ
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
              marginBottom: '3rem',
            }}
          >
            Common Questions
          </h2>
        </ScrollReveal>

        {/* FAQ items — structured for future schema markup */}
        <div
          className="space-y-0"
          itemScope
          itemType="https://schema.org/FAQPage"
        >
          {FAQS.map((faq, i) => (
            <ScrollReveal key={i} variant="fade-up" delay={200 + i * 60}>
              <FAQItem
                faq={faq}
                isOpen={openIndex === i}
                onToggle={() => toggle(i)}
              />
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQItem({
  faq,
  isOpen,
  onToggle,
}: {
  faq: FAQ;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      itemScope
      itemProp="mainEntity"
      itemType="https://schema.org/Question"
      style={{
        borderBottom: '1px solid rgba(196, 169, 108, 0.08)',
      }}
    >
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between text-left py-6 transition-colors duration-300 group"
        style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
      >
        <span
          itemProp="name"
          style={{
            fontFamily: 'var(--zl-font-display)',
            fontSize: 'clamp(1rem, 2vw, 1.1875rem)',
            fontWeight: 400,
            letterSpacing: '0.02em',
            color: isOpen ? 'var(--zl-gold)' : 'var(--zl-ivory)',
            transition: 'color 0.3s ease',
            paddingRight: '1rem',
          }}
        >
          {faq.question}
        </span>
        <span
          className="flex-shrink-0 transition-transform duration-300"
          style={{
            transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
            color: isOpen ? 'var(--zl-gold)' : 'var(--zl-smoke)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 2V14" stroke="currentColor" strokeWidth="1.5" />
            <path d="M2 8H14" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </span>
      </button>

      <div
        itemScope
        itemProp="acceptedAnswer"
        itemType="https://schema.org/Answer"
        className="overflow-hidden transition-all duration-400"
        style={{
          maxHeight: isOpen ? '400px' : '0',
          opacity: isOpen ? 1 : 0,
          transition: 'max-height 0.4s ease, opacity 0.3s ease',
        }}
      >
        <div
          itemProp="text"
          className="pb-6"
          style={{
            fontFamily: 'var(--zl-font-body)',
            fontSize: '0.9375rem',
            lineHeight: 1.8,
            color: 'var(--zl-mist)',
            paddingRight: '2rem',
          }}
        >
          {faq.answer}
        </div>
      </div>
    </div>
  );
}
