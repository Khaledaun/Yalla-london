'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Our Brands', href: '/brands' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

export function ZenithaLuxuryHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        background: 'rgba(10, 10, 10, 0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(196, 169, 108, 0.12)',
      }}
    >
      <div className="max-w-[1360px] mx-auto px-6 h-[72px] flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 no-underline">
          <DiamondIcon size={28} />
          <span
            style={{
              fontFamily: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
              fontSize: '1.25rem',
              fontWeight: 600,
              letterSpacing: '0.08em',
              color: '#FDFCF9',
            }}
          >
            ZENITHA
          </span>
          <span
            style={{
              fontFamily: "'DM Sans', 'Helvetica Neue', Arial, sans-serif",
              fontSize: '0.5rem',
              fontWeight: 300,
              letterSpacing: '0.55em',
              color: '#C4A96C',
              marginLeft: '-4px',
            }}
          >
            LUXURY
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="no-underline transition-colors duration-300"
              style={{
                fontFamily: "'DM Sans', 'Helvetica Neue', Arial, sans-serif",
                fontSize: '0.8125rem',
                fontWeight: 400,
                letterSpacing: '0.12em',
                color: '#D6D0C4',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#C4A96C')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#D6D0C4')}
            >
              {link.label.toUpperCase()}
            </Link>
          ))}
        </nav>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileOpen ? (
            <X size={24} color="#FDFCF9" />
          ) : (
            <Menu size={24} color="#FDFCF9" />
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className="md:hidden"
          style={{
            background: '#0A0A0A',
            borderTop: '1px solid rgba(196, 169, 108, 0.12)',
          }}
        >
          <nav className="flex flex-col px-6 py-6 gap-4">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="no-underline py-2"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '0.9375rem',
                  letterSpacing: '0.1em',
                  color: '#D6D0C4',
                }}
                onClick={() => setMobileOpen(false)}
              >
                {link.label.toUpperCase()}
              </Link>
            ))}
          </nav>
        </div>
      )}
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
