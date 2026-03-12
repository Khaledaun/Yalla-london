'use client';

import { useState, useCallback } from 'react';
import { ScrollReveal } from '../scroll-reveal';
import { TESTIMONIALS, type Testimonial } from '../site-data';

/**
 * TestimonialsSection — Client testimonial carousel with navigation dots.
 * Structured for future JSON-LD TestimonialPage schema.
 */
export function TestimonialsSection() {
  const [active, setActive] = useState(0);
  const total = TESTIMONIALS.length;

  const next = useCallback(() => setActive((i) => (i + 1) % total), [total]);
  const prev = useCallback(() => setActive((i) => (i - 1 + total) % total), [total]);

  return (
    <section
      id="testimonials"
      className="relative px-6 py-24 md:py-32 overflow-hidden"
      style={{
        background: 'var(--zl-midnight)',
        borderTop: '1px solid rgba(196, 169, 108, 0.06)',
      }}
    >
      <div className="max-w-[900px] mx-auto">
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
            TESTIMONIALS
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
            What Our Partners Say
          </h2>
        </ScrollReveal>

        {/* Testimonial card */}
        <ScrollReveal variant="fade-in" delay={200}>
          <div className="mt-16 relative">
            {/* Large decorative quote mark */}
            <div
              className="text-center mb-8"
              style={{
                fontFamily: 'var(--zl-font-display)',
                fontSize: 'clamp(3rem, 8vw, 5rem)',
                lineHeight: 1,
                color: 'rgba(196, 169, 108, 0.15)',
              }}
              aria-hidden="true"
            >
              &ldquo;
            </div>

            {/* Quote */}
            <blockquote className="text-center">
              <p
                style={{
                  fontFamily: 'var(--zl-font-body)',
                  fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
                  lineHeight: 1.8,
                  color: 'var(--zl-platinum)',
                  fontStyle: 'italic',
                  maxWidth: '700px',
                  margin: '0 auto',
                }}
              >
                {TESTIMONIALS[active].quote}
              </p>

              {/* Attribution */}
              <footer className="mt-8">
                <div
                  className="mx-auto mb-4"
                  style={{
                    width: '40px',
                    height: '1px',
                    background: 'var(--zl-gold)',
                    opacity: 0.4,
                  }}
                />
                <cite
                  className="not-italic"
                  style={{
                    fontFamily: 'var(--zl-font-display)',
                    fontSize: '1.125rem',
                    fontWeight: 500,
                    letterSpacing: '0.04em',
                    color: 'var(--zl-ivory)',
                    display: 'block',
                  }}
                >
                  {TESTIMONIALS[active].name}
                </cite>
                <span
                  className="block mt-1"
                  style={{
                    fontFamily: 'var(--zl-font-label)',
                    fontSize: '0.75rem',
                    letterSpacing: '0.08em',
                    color: 'var(--zl-smoke)',
                  }}
                >
                  {TESTIMONIALS[active].role}, {TESTIMONIALS[active].company}
                </span>
              </footer>
            </blockquote>

            {/* Navigation arrows */}
            <div className="flex items-center justify-center gap-6 mt-10">
              <button
                onClick={prev}
                aria-label="Previous testimonial"
                className="p-2 transition-colors duration-300"
                style={{ color: 'var(--zl-smoke)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--zl-gold)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--zl-smoke)')}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M13 4L7 10L13 16" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </button>

              {/* Dots */}
              <div className="flex items-center gap-2">
                {TESTIMONIALS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActive(i)}
                    aria-label={`Go to testimonial ${i + 1}`}
                    className="transition-all duration-300"
                    style={{
                      width: i === active ? '24px' : '6px',
                      height: '6px',
                      borderRadius: '3px',
                      background: i === active ? 'var(--zl-gold)' : 'var(--zl-charcoal)',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </div>

              <button
                onClick={next}
                aria-label="Next testimonial"
                className="p-2 transition-colors duration-300"
                style={{ color: 'var(--zl-smoke)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--zl-gold)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--zl-smoke)')}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M7 4L13 10L7 16" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </button>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
