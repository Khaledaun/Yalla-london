'use client';

import { BRANDS } from './site-data';

/**
 * ZenithaLuxuryFooter — Expanded footer with brand links, company info, legal, and social.
 */
export function ZenithaLuxuryFooter() {
  const year = new Date().getFullYear();

  return (
    <footer
      style={{
        background: 'var(--zl-obsidian)',
        borderTop: '1px solid rgba(196, 169, 108, 0.12)',
        color: 'var(--zl-mist)',
        fontFamily: 'var(--zl-font-body)',
      }}
    >
      <div className="max-w-[1200px] mx-auto px-6 py-16 md:py-20">
        {/* Top: 4-column grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
          {/* Column 1: Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span
                style={{
                  fontFamily: 'var(--zl-font-display)',
                  fontSize: '1.375rem',
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  color: 'var(--zl-ivory)',
                }}
              >
                ZENITHA
              </span>
            </div>
            <span
              className="block mb-5"
              style={{
                fontFamily: 'var(--zl-font-label)',
                fontSize: '0.5rem',
                letterSpacing: '0.55em',
                color: 'var(--zl-gold)',
              }}
            >
              THE ART OF EXCEPTIONAL TRAVEL
            </span>
            <p
              style={{
                fontSize: '0.875rem',
                lineHeight: 1.7,
                color: 'var(--zl-smoke)',
              }}
            >
              A portfolio of luxury travel brands, each crafted for the
              world&apos;s most discerning travellers.
            </p>
          </div>

          {/* Column 2: Our Brands */}
          <div>
            <h3
              className="mb-5"
              style={{
                fontFamily: 'var(--zl-font-label)',
                fontSize: '0.6875rem',
                letterSpacing: '0.15em',
                color: 'var(--zl-gold)',
              }}
            >
              OUR BRANDS
            </h3>
            <ul className="space-y-3" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {BRANDS.map((brand) => (
                <li key={brand.name}>
                  {brand.status === 'live' ? (
                    <a
                      href={brand.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="no-underline transition-colors duration-300"
                      style={{ fontSize: '0.875rem', color: 'var(--zl-mist)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--zl-gold)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--zl-mist)')}
                    >
                      {brand.name}
                    </a>
                  ) : (
                    <span style={{ fontSize: '0.875rem', color: 'var(--zl-charcoal)' }}>
                      {brand.name}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Company */}
          <div>
            <h3
              className="mb-5"
              style={{
                fontFamily: 'var(--zl-font-label)',
                fontSize: '0.6875rem',
                letterSpacing: '0.15em',
                color: 'var(--zl-gold)',
              }}
            >
              COMPANY
            </h3>
            <ul className="space-y-3" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {[
                { label: 'About', href: '#about' },
                { label: 'Our Process', href: '#process' },
                { label: 'Services', href: '#services' },
                { label: 'Privacy Policy', href: '/privacy' },
                { label: 'Terms of Service', href: '/terms' },
                { label: 'Affiliate Disclosure', href: '/affiliate-disclosure' },
              ].map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="no-underline transition-colors duration-300"
                    style={{ fontSize: '0.875rem', color: 'var(--zl-mist)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--zl-gold)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--zl-mist)')}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Contact */}
          <div>
            <h3
              className="mb-5"
              style={{
                fontFamily: 'var(--zl-font-label)',
                fontSize: '0.6875rem',
                letterSpacing: '0.15em',
                color: 'var(--zl-gold)',
              }}
            >
              CONTACT
            </h3>
            <div className="space-y-4">
              <div>
                <p
                  className="mb-1"
                  style={{
                    fontFamily: 'var(--zl-font-label)',
                    fontSize: '0.625rem',
                    letterSpacing: '0.12em',
                    color: 'var(--zl-smoke)',
                  }}
                >
                  EMAIL
                </p>
                <a
                  href="mailto:hello@zenitha.luxury"
                  className="no-underline transition-colors duration-300"
                  style={{ fontSize: '0.875rem', color: 'var(--zl-platinum)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--zl-gold)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--zl-platinum)')}
                >
                  hello@zenitha.luxury
                </a>
              </div>
              <div>
                <p
                  className="mb-1"
                  style={{
                    fontFamily: 'var(--zl-font-label)',
                    fontSize: '0.625rem',
                    letterSpacing: '0.12em',
                    color: 'var(--zl-smoke)',
                  }}
                >
                  HEADQUARTERS
                </p>
                <p style={{ fontSize: '0.875rem', color: 'var(--zl-platinum)' }}>
                  Delaware, United States
                </p>
              </div>

              {/* Social links */}
              <div className="pt-4 flex gap-5">
                {/* [PLACEHOLDER] — Replace with actual social URLs */}
                {['LinkedIn', 'Instagram', 'X'].map((platform) => (
                  <a
                    key={platform}
                    href="#"
                    className="no-underline transition-colors duration-300"
                    style={{
                      fontFamily: 'var(--zl-font-label)',
                      fontSize: '0.6875rem',
                      letterSpacing: '0.08em',
                      color: 'var(--zl-smoke)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--zl-gold)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--zl-smoke)')}
                  >
                    {platform}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div
          className="my-12"
          style={{
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(196, 169, 108, 0.2), transparent)',
          }}
        />

        {/* Bottom: legal */}
        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left"
          style={{ fontSize: '0.75rem', lineHeight: 1.75, color: 'var(--zl-charcoal)' }}
        >
          <p>&copy; 2025&ndash;{year} Zenitha.Luxury LLC. All rights reserved.</p>
          <p>Zenitha.Luxury LLC is a Delaware limited liability company.</p>
        </div>
      </div>
    </footer>
  );
}
