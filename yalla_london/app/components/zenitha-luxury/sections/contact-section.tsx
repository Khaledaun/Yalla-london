'use client';

import { useState, type FormEvent } from 'react';
import { ScrollReveal } from '../scroll-reveal';
import { CONTACT_WAYS, ENQUIRY_TYPES } from '../site-data';

/**
 * ContactSection — 2-column: contact ways left (email, Yalla London, Zenitha Yachts links)
 * + form right (first name, last name, email, organisation, enquiry type, message).
 * Matches skeleton section #contact exactly.
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
      className="px-6 sm:px-10 lg:px-20 py-16 lg:py-24"
      style={{ background: 'var(--zl-obsidian)' }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-start max-w-[1360px] mx-auto">
        {/* Left: Header + contact ways */}
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
            {/* Intent: Renumbered to 07; partnership-inviting intro */}
            07 — Contact
          </div>
          <h2
            style={{
              fontFamily: 'var(--zl-font-display)',
              fontSize: 'clamp(1.8rem, 3vw, 2.8rem)',
              fontWeight: 400,
              color: 'var(--zl-ivory)',
              marginBottom: '0.5rem',
              margin: '0 0 0.5rem 0',
            }}
          >
            Let&rsquo;s Build Together
          </h2>
          <p
            style={{
              fontFamily: 'var(--zl-font-body)',
              fontSize: '1rem',
              fontWeight: 300,
              color: 'var(--zl-mist)',
              lineHeight: 1.9,
            }}
          >
            Whether you&rsquo;re a hotel group, tourism board, charter operator,
            or travel brand — we&rsquo;d love to explore how Zenitha can work
            with you. Tell us what you have in mind.
          </p>

          {/* Contact ways */}
          <div className="flex flex-col" style={{ gap: '0.9rem', marginTop: '1.8rem' }}>
            {/* TODO: Replace placeholder email and URLs with production details. */}
            {CONTACT_WAYS.map((way) => (
              <a
                key={way.label}
                href={way.href}
                className="flex items-center no-underline transition-colors duration-300"
                style={{
                  gap: '1rem',
                  padding: '0.9rem 1.2rem',
                  border: '1px solid rgba(196, 169, 108, 0.06)',
                  color: 'inherit',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor =
                    'rgba(196, 169, 108, 0.18)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor =
                    'rgba(196, 169, 108, 0.06)';
                }}
              >
                <div
                  className="flex items-center justify-center shrink-0"
                  style={{
                    width: '34px',
                    height: '34px',
                    border: '1px solid rgba(196, 169, 108, 0.12)',
                    fontSize: '0.85rem',
                    color: 'var(--zl-gold)',
                  }}
                >
                  {way.icon}
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: 'var(--zl-font-label)',
                      fontSize: '0.625rem',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase' as const,
                      color: 'var(--zl-gold-deep)',
                      marginBottom: '0.12rem',
                    }}
                  >
                    {way.label}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--zl-font-body)',
                      fontSize: '0.75rem',
                      color: 'rgba(245, 240, 232, 0.55)',
                    }}
                  >
                    {way.value}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </ScrollReveal>

        {/* Right: Form */}
        <ScrollReveal delay={100}>
          {/* TODO: Wire to API endpoint /api/contact or email service */}
          <form onSubmit={handleSubmit} noValidate>
            {/* Name row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <FieldGroup label="First Name" htmlFor="contact-first-name">
                <input
                  id="contact-first-name"
                  name="firstName"
                  className="w-full focus:outline-none transition-colors duration-300"
                  style={inputStyle}
                  type="text"
                  placeholder="First name"
                  required
                  aria-required="true"
                  autoComplete="given-name"
                  onFocus={focusHandler}
                  onBlur={blurHandler}
                />
              </FieldGroup>
              <FieldGroup label="Last Name" htmlFor="contact-last-name">
                <input
                  id="contact-last-name"
                  name="lastName"
                  className="w-full focus:outline-none transition-colors duration-300"
                  style={inputStyle}
                  type="text"
                  placeholder="Last name"
                  required
                  aria-required="true"
                  autoComplete="family-name"
                  onFocus={focusHandler}
                  onBlur={blurHandler}
                />
              </FieldGroup>
            </div>

            {/* Email */}
            <div className="mb-4">
              <FieldGroup label="Email Address" htmlFor="contact-email">
                <input
                  id="contact-email"
                  name="email"
                  className="w-full focus:outline-none transition-colors duration-300"
                  style={inputStyle}
                  type="email"
                  placeholder="you@example.com"
                  required
                  aria-required="true"
                  autoComplete="email"
                  onFocus={focusHandler}
                  onBlur={blurHandler}
                />
              </FieldGroup>
            </div>

            {/* Organisation + Enquiry Type row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <FieldGroup label="Organisation" htmlFor="contact-organisation">
                <input
                  id="contact-organisation"
                  name="organisation"
                  className="w-full focus:outline-none transition-colors duration-300"
                  style={inputStyle}
                  type="text"
                  placeholder="Your company"
                  autoComplete="organization"
                  onFocus={focusHandler}
                  onBlur={blurHandler}
                />
              </FieldGroup>
              <FieldGroup label="Enquiry Type" htmlFor="contact-enquiry-type">
                <select
                  id="contact-enquiry-type"
                  name="enquiryType"
                  className="w-full focus:outline-none transition-colors duration-300"
                  style={{ ...inputStyle, cursor: 'pointer' }}
                  required
                  aria-required="true"
                  onFocus={focusHandler}
                  onBlur={blurHandler}
                >
                  <option value="">Select...</option>
                  {ENQUIRY_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </FieldGroup>
            </div>

            {/* Message */}
            <div className="mb-4">
              <FieldGroup label="Message" htmlFor="contact-message">
                <textarea
                  id="contact-message"
                  name="message"
                  className="w-full focus:outline-none transition-colors duration-300"
                  style={{ ...inputStyle, resize: 'vertical' as const, minHeight: '110px' }}
                  placeholder="Tell us how we can help..."
                  required
                  aria-required="true"
                  onFocus={focusHandler}
                  onBlur={blurHandler}
                />
              </FieldGroup>
            </div>

            <button
              type="submit"
              disabled={formState === 'sending' || formState === 'sent'}
              className="w-full inline-flex items-center justify-center gap-2 no-underline transition-all duration-300 hover:shadow-lg"
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
                cursor: formState === 'sending' ? 'wait' : 'pointer',
                opacity: formState === 'sending' ? 0.7 : 1,
              }}
            >
              {formState === 'idle' && 'Send Enquiry'}
              {formState === 'sending' && 'Sending...'}
              {formState === 'sent' && 'Enquiry Sent'}
              {formState === 'error' && 'Try Again'}
            </button>
          </form>
        </ScrollReveal>
      </div>
    </section>
  );
}

/* ─── Helpers ─── */

const inputStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.025)',
  border: '1px solid rgba(196, 169, 108, 0.1)',
  padding: '0.82rem 1rem',
  fontFamily: 'var(--zl-font-body)',
  fontSize: '0.78rem',
  color: 'var(--zl-cream)',
};

function focusHandler(e: React.FocusEvent<HTMLElement>) {
  (e.currentTarget as HTMLElement).style.borderColor = 'var(--zl-gold)';
  (e.currentTarget as HTMLElement).style.boxShadow =
    '0 0 0 3px rgba(196, 169, 108, 0.06)';
}

function blurHandler(e: React.FocusEvent<HTMLElement>) {
  (e.currentTarget as HTMLElement).style.borderColor =
    'rgba(196, 169, 108, 0.1)';
  (e.currentTarget as HTMLElement).style.boxShadow = 'none';
}

function FieldGroup({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col" style={{ gap: '0.4rem' }}>
      <label
        htmlFor={htmlFor}
        style={{
          fontFamily: 'var(--zl-font-label)',
          fontSize: '0.625rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase' as const,
          color: 'var(--zl-gold-deep)',
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}
