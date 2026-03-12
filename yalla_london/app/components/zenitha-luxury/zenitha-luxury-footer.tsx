'use client';

import Link from 'next/link';

export function ZenithaLuxuryFooter() {
  const year = new Date().getFullYear();

  return (
    <footer
      style={{
        background: '#0A0A0A',
        borderTop: '1px solid rgba(196, 169, 108, 0.12)',
        color: '#8A8A8A',
        fontFamily: "'DM Sans', 'Helvetica Neue', Arial, sans-serif",
      }}
    >
      <div className="max-w-[1360px] mx-auto px-6 py-16">
        {/* Top: logo + tagline */}
        <div className="flex flex-col items-center text-center mb-12">
          <span
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: '1.5rem',
              fontWeight: 600,
              letterSpacing: '0.1em',
              color: '#FDFCF9',
            }}
          >
            ZENITHA
          </span>
          <span
            style={{
              fontSize: '0.5625rem',
              letterSpacing: '0.55em',
              color: '#C4A96C',
              marginTop: '2px',
            }}
          >
            THE ART OF EXCEPTIONAL TRAVEL
          </span>
          <div
            className="mt-4"
            style={{
              width: '120px',
              height: '1px',
              background: 'linear-gradient(90deg, transparent, #C4A96C, transparent)',
            }}
          />
        </div>

        {/* Links row */}
        <div className="flex flex-wrap justify-center gap-8 mb-12">
          {[
            { label: 'Our Brands', href: '/brands' },
            { label: 'About', href: '/about' },
            { label: 'Contact', href: '/contact' },
            { label: 'Privacy Policy', href: '/privacy' },
            { label: 'Terms of Service', href: '/terms' },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="no-underline transition-colors duration-300"
              style={{ fontSize: '0.8125rem', color: '#8A8A8A', letterSpacing: '0.05em' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#C4A96C')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#8A8A8A')}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Bottom: legal */}
        <div className="text-center" style={{ fontSize: '0.75rem', lineHeight: '1.75', color: '#4A4A4A' }}>
          <p>&copy; 2025&ndash;{year} Zenitha.Luxury LLC. All rights reserved.</p>
          <p>Zenitha.Luxury LLC is a Delaware limited liability company.</p>
        </div>
      </div>
    </footer>
  );
}
