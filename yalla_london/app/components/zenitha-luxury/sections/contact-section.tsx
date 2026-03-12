'use client';

import { useState, type FormEvent } from 'react';
import { ScrollReveal } from '../scroll-reveal';

/**
 * ContactSection — CTA area with contact form + company details.
 * Form fields: name, email, message, optional budget dropdown.
 */
export function ContactSection() {
  const [formState, setFormState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormState('sending');
    // TODO: Wire to API endpoint /api/contact or email service
    setTimeout(() => setFormState('sent'), 1200);
  }

  return (
    <section
      id="contact"
      className="relative px-6 py-24 md:py-32"
      style={{
        background: 'var(--zl-obsidian)',
        borderTop: '1px solid rgba(196, 169, 108, 0.06)',
      }}
    >
      <div className="max-w-[1100px] mx-auto">
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
            GET IN TOUCH
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
            Start a Conversation
          </h2>
        </ScrollReveal>

        <ScrollReveal variant="fade-in" delay={200}>
          <p
            className="text-center mx-auto max-w-[560px] mt-4 mb-16"
            style={{
              fontFamily: 'var(--zl-font-body)',
              fontSize: '1rem',
              lineHeight: 1.7,
              color: 'var(--zl-mist)',
            }}
          >
            Whether you&apos;re exploring a partnership, want to advertise across our
            network, or simply have a question — we&apos;d love to hear from you.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16">
          {/* Form — 3 columns */}
          <ScrollReveal variant="fade-up" delay={300} className="lg:col-span-3">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <FormField label="Name" name="name" type="text" required />
                <FormField label="Email" name="email" type="email" required />
              </div>

              {/* Budget dropdown */}
              <div>
                <label
                  htmlFor="budget"
                  style={{
                    fontFamily: 'var(--zl-font-label)',
                    fontSize: '0.6875rem',
                    letterSpacing: '0.12em',
                    color: 'var(--zl-smoke)',
                    display: 'block',
                    marginBottom: '8px',
                  }}
                >
                  BUDGET RANGE (OPTIONAL)
                </label>
                <select
                  id="budget"
                  name="budget"
                  className="w-full transition-colors duration-300 focus:outline-none"
                  style={{
                    fontFamily: 'var(--zl-font-body)',
                    fontSize: '0.9375rem',
                    color: 'var(--zl-platinum)',
                    background: 'rgba(42, 42, 42, 0.4)',
                    border: '1px solid rgba(196, 169, 108, 0.12)',
                    padding: '14px 16px',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%234A4A4A' stroke-width='1.5'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 16px center',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(196, 169, 108, 0.4)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(196, 169, 108, 0.12)')}
                >
                  <option value="">Select a range</option>
                  <option value="under-10k">Under $10,000</option>
                  <option value="10k-25k">$10,000 – $25,000</option>
                  <option value="25k-50k">$25,000 – $50,000</option>
                  <option value="50k-100k">$50,000 – $100,000</option>
                  <option value="100k-plus">$100,000+</option>
                </select>
              </div>

              {/* Message */}
              <div>
                <label
                  htmlFor="message"
                  style={{
                    fontFamily: 'var(--zl-font-label)',
                    fontSize: '0.6875rem',
                    letterSpacing: '0.12em',
                    color: 'var(--zl-smoke)',
                    display: 'block',
                    marginBottom: '8px',
                  }}
                >
                  MESSAGE
                </label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={5}
                  className="w-full resize-none transition-colors duration-300 focus:outline-none"
                  style={{
                    fontFamily: 'var(--zl-font-body)',
                    fontSize: '0.9375rem',
                    color: 'var(--zl-platinum)',
                    background: 'rgba(42, 42, 42, 0.4)',
                    border: '1px solid rgba(196, 169, 108, 0.12)',
                    padding: '14px 16px',
                    lineHeight: 1.6,
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(196, 169, 108, 0.4)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(196, 169, 108, 0.12)')}
                  placeholder="Tell us about your project or partnership idea..."
                />
              </div>

              <button
                type="submit"
                disabled={formState === 'sending' || formState === 'sent'}
                className="w-full sm:w-auto transition-all duration-300"
                style={{
                  fontFamily: 'var(--zl-font-label)',
                  fontSize: '0.8125rem',
                  letterSpacing: '0.2em',
                  color: formState === 'sent' ? 'var(--zl-obsidian)' : 'var(--zl-gold)',
                  background: formState === 'sent' ? 'var(--zl-gold)' : 'transparent',
                  border: '1px solid rgba(196, 169, 108, 0.4)',
                  padding: '16px 48px',
                  cursor: formState === 'sending' ? 'wait' : 'pointer',
                  opacity: formState === 'sending' ? 0.7 : 1,
                }}
                onMouseEnter={(e) => {
                  if (formState === 'idle') {
                    e.currentTarget.style.background = 'rgba(196, 169, 108, 0.1)';
                    e.currentTarget.style.borderColor = 'var(--zl-gold)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (formState === 'idle') {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = 'rgba(196, 169, 108, 0.4)';
                  }
                }}
              >
                {formState === 'idle' && 'SEND MESSAGE'}
                {formState === 'sending' && 'SENDING...'}
                {formState === 'sent' && 'MESSAGE SENT ✓'}
                {formState === 'error' && 'TRY AGAIN'}
              </button>
            </form>
          </ScrollReveal>

          {/* Company details — 2 columns */}
          <ScrollReveal variant="fade-up" delay={400} className="lg:col-span-2">
            <div className="space-y-10">
              {/* Email */}
              <ContactDetail
                label="EMAIL"
                value="hello@zenitha.luxury"
                href="mailto:hello@zenitha.luxury"
              />

              {/* Location */}
              <ContactDetail
                label="HEADQUARTERS"
                value="Delaware, United States"
              />

              {/* Availability */}
              <ContactDetail
                label="RESPONSE TIME"
                value="Within 24 hours"
              />

              {/* Book a call CTA */}
              <div>
                <a
                  href="mailto:hello@zenitha.luxury?subject=Partnership%20Call%20Request"
                  className="inline-flex items-center gap-3 no-underline group transition-colors duration-300"
                  style={{
                    fontFamily: 'var(--zl-font-label)',
                    fontSize: '0.8125rem',
                    letterSpacing: '0.15em',
                    color: 'var(--zl-gold)',
                  }}
                >
                  <span
                    className="flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                    style={{
                      width: '40px',
                      height: '40px',
                      border: '1px solid rgba(196, 169, 108, 0.3)',
                      borderRadius: '50%',
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path
                        d="M5 3L11 8L5 13"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                    </svg>
                  </span>
                  BOOK A CALL
                </a>
              </div>

              {/* Social links */}
              <div className="pt-6" style={{ borderTop: '1px solid rgba(196, 169, 108, 0.08)' }}>
                <p
                  className="mb-4"
                  style={{
                    fontFamily: 'var(--zl-font-label)',
                    fontSize: '0.6875rem',
                    letterSpacing: '0.12em',
                    color: 'var(--zl-smoke)',
                  }}
                >
                  FOLLOW US
                </p>
                <div className="flex gap-4">
                  {/* [PLACEHOLDER] — Replace with actual social URLs */}
                  {['LinkedIn', 'Instagram', 'X'].map((platform) => (
                    <a
                      key={platform}
                      href="#"
                      className="no-underline transition-colors duration-300"
                      style={{
                        fontFamily: 'var(--zl-font-label)',
                        fontSize: '0.75rem',
                        letterSpacing: '0.08em',
                        color: 'var(--zl-mist)',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--zl-gold)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--zl-mist)')}
                    >
                      {platform}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}

/* ─── Sub-components ─── */

function FormField({
  label,
  name,
  type,
  required,
}: {
  label: string;
  name: string;
  type: string;
  required?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={name}
        style={{
          fontFamily: 'var(--zl-font-label)',
          fontSize: '0.6875rem',
          letterSpacing: '0.12em',
          color: 'var(--zl-smoke)',
          display: 'block',
          marginBottom: '8px',
        }}
      >
        {label.toUpperCase()}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        className="w-full transition-colors duration-300 focus:outline-none"
        style={{
          fontFamily: 'var(--zl-font-body)',
          fontSize: '0.9375rem',
          color: 'var(--zl-platinum)',
          background: 'rgba(42, 42, 42, 0.4)',
          border: '1px solid rgba(196, 169, 108, 0.12)',
          padding: '14px 16px',
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(196, 169, 108, 0.4)')}
        onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(196, 169, 108, 0.12)')}
      />
    </div>
  );
}

function ContactDetail({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div>
      <p
        className="mb-2"
        style={{
          fontFamily: 'var(--zl-font-label)',
          fontSize: '0.6875rem',
          letterSpacing: '0.12em',
          color: 'var(--zl-smoke)',
        }}
      >
        {label}
      </p>
      {href ? (
        <a
          href={href}
          className="no-underline transition-colors duration-300"
          style={{
            fontFamily: 'var(--zl-font-body)',
            fontSize: '1rem',
            color: 'var(--zl-platinum)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--zl-gold)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--zl-platinum)')}
        >
          {value}
        </a>
      ) : (
        <p
          style={{
            fontFamily: 'var(--zl-font-body)',
            fontSize: '1rem',
            color: 'var(--zl-platinum)',
          }}
        >
          {value}
        </p>
      )}
    </div>
  );
}
