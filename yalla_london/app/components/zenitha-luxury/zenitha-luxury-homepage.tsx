'use client';

import Link from 'next/link';

// ─── Brand Portfolio Data ─────────────────────────────────────────
const BRANDS = [
  {
    name: 'Yalla London',
    tagline: 'The Definitive London Travel Guide',
    domain: 'yalla-london.com',
    href: 'https://www.yalla-london.com',
    color: '#C8322B',
    destination: 'London, United Kingdom',
    status: 'live' as const,
  },
  {
    name: 'Zenitha Yachts',
    tagline: 'Luxury Mediterranean Yacht Charters',
    domain: 'zenithayachts.com',
    href: 'https://www.zenithayachts.com',
    color: '#0A1628',
    destination: 'Mediterranean & Arabian Gulf',
    status: 'coming' as const,
  },
  {
    name: 'Arabaldives',
    tagline: 'Luxury Maldives Resort Guide',
    domain: 'arabaldives.com',
    href: 'https://www.arabaldives.com',
    color: '#0891B2',
    destination: 'Maldives',
    status: 'coming' as const,
  },
  {
    name: 'Yalla Riviera',
    tagline: 'Luxury French Riviera Guide',
    domain: 'yallariviera.com',
    href: 'https://www.yallariviera.com',
    color: '#1E3A5F',
    destination: 'Côte d\'Azur, France',
    status: 'coming' as const,
  },
  {
    name: 'Yalla Istanbul',
    tagline: 'Luxury Istanbul Travel Guide',
    domain: 'yallaistanbul.com',
    href: 'https://www.yallaistanbul.com',
    color: '#7C2D12',
    destination: 'Istanbul, Turkey',
    status: 'coming' as const,
  },
  {
    name: 'Yalla Thailand',
    tagline: 'Luxury Thailand Travel Guide',
    domain: 'yallathailand.com',
    href: 'https://www.yallathailand.com',
    color: '#059669',
    destination: 'Thailand',
    status: 'coming' as const,
  },
];

export function ZenithaLuxuryHomepage() {
  return (
    <div style={{ background: '#0A0A0A', color: '#FDFCF9' }}>
      {/* ─── HERO ─── */}
      <section
        className="relative flex flex-col items-center justify-center text-center px-6"
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(160deg, #0A0A0A 0%, #1A1208 50%, #0A0A0A 100%)',
        }}
      >
        {/* Decorative diamond */}
        <div className="mb-8 opacity-60">
          <DiamondDecoration size={80} />
        </div>

        <h1
          style={{
            fontFamily: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
            fontSize: 'clamp(2.5rem, 6vw, 5rem)',
            fontWeight: 300,
            letterSpacing: '0.08em',
            lineHeight: 1.1,
            margin: 0,
          }}
        >
          ZENITHA
        </h1>
        <div
          className="mt-3"
          style={{
            fontFamily: "'DM Sans', 'Helvetica Neue', Arial, sans-serif",
            fontSize: 'clamp(0.625rem, 1.5vw, 0.75rem)',
            fontWeight: 300,
            letterSpacing: '0.55em',
            color: '#C4A96C',
          }}
        >
          THE ART OF EXCEPTIONAL TRAVEL
        </div>

        {/* Gold rule */}
        <div
          className="mt-8"
          style={{
            width: '200px',
            height: '1px',
            background: 'linear-gradient(90deg, transparent, #C4A96C, transparent)',
          }}
        />

        <p
          className="mt-8 max-w-xl"
          style={{
            fontFamily: "'Source Serif 4', Georgia, serif",
            fontSize: 'clamp(1rem, 2vw, 1.125rem)',
            lineHeight: 1.8,
            color: '#D6D0C4',
            fontWeight: 400,
          }}
        >
          A portfolio of luxury travel brands, each crafted for the world&apos;s
          most discerning travellers. From London&apos;s finest hotels to
          Mediterranean yacht charters — every experience meets the same
          uncompromising standard.
        </p>

        <Link
          href="/brands"
          className="mt-10 inline-block no-underline transition-all duration-300"
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '0.8125rem',
            fontWeight: 400,
            letterSpacing: '0.2em',
            color: '#C4A96C',
            border: '1px solid rgba(196, 169, 108, 0.4)',
            padding: '14px 40px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(196, 169, 108, 0.1)';
            e.currentTarget.style.borderColor = '#C4A96C';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = 'rgba(196, 169, 108, 0.4)';
          }}
        >
          EXPLORE OUR BRANDS
        </Link>

        {/* Scroll indicator */}
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          style={{ color: '#4A4A4A', fontSize: '0.6875rem', letterSpacing: '0.2em' }}
        >
          <div className="animate-bounce">&#9660;</div>
        </div>
      </section>

      {/* ─── PORTFOLIO GRID ─── */}
      <section className="px-6 py-24" style={{ background: '#0A0A0A' }}>
        <div className="max-w-[1360px] mx-auto">
          <div className="text-center mb-16">
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: 'clamp(1.5rem, 3vw, 2.25rem)',
                fontWeight: 400,
                letterSpacing: '0.06em',
                color: '#FDFCF9',
              }}
            >
              Our Portfolio
            </h2>
            <div
              className="mx-auto mt-4"
              style={{
                width: '60px',
                height: '1px',
                background: '#C4A96C',
              }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {BRANDS.map((brand) => (
              <BrandCard key={brand.name} brand={brand} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── ABOUT STRIP ─── */}
      <section
        className="px-6 py-24"
        style={{
          background: '#141414',
          borderTop: '1px solid rgba(196, 169, 108, 0.08)',
          borderBottom: '1px solid rgba(196, 169, 108, 0.08)',
        }}
      >
        <div className="max-w-[760px] mx-auto text-center">
          <DiamondDecoration size={40} />
          <h2
            className="mt-6"
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 'clamp(1.5rem, 3vw, 2rem)',
              fontWeight: 400,
              letterSpacing: '0.06em',
              color: '#FDFCF9',
            }}
          >
            Built for the Long Term
          </h2>
          <p
            className="mt-6"
            style={{
              fontFamily: "'Source Serif 4', Georgia, serif",
              fontSize: '1.0625rem',
              lineHeight: 1.8,
              color: '#8A8A8A',
            }}
          >
            Zenitha.Luxury LLC is a Delaware holding company founded by Khaled N. Aun.
            Each brand in the portfolio is purpose-built for a specific destination and
            audience, powered by a shared technology platform that ensures consistent
            quality across every experience we curate.
          </p>
          <Link
            href="/about"
            className="inline-block mt-8 no-underline"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '0.8125rem',
              letterSpacing: '0.15em',
              color: '#C4A96C',
            }}
          >
            LEARN MORE &rarr;
          </Link>
        </div>
      </section>

      {/* ─── CONTACT CTA ─── */}
      <section className="px-6 py-24" style={{ background: '#0A0A0A' }}>
        <div className="max-w-[560px] mx-auto text-center">
          <h2
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 'clamp(1.25rem, 2.5vw, 1.75rem)',
              fontWeight: 400,
              letterSpacing: '0.06em',
              color: '#D6D0C4',
            }}
          >
            Partnerships &amp; Inquiries
          </h2>
          <p
            className="mt-4"
            style={{
              fontFamily: "'Source Serif 4', Georgia, serif",
              fontSize: '1rem',
              lineHeight: 1.8,
              color: '#8A8A8A',
            }}
          >
            For business development, brand partnerships, advertising,
            or press inquiries.
          </p>
          <a
            href="mailto:hello@zenitha.luxury"
            className="inline-block mt-6 no-underline"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '0.875rem',
              letterSpacing: '0.1em',
              color: '#C4A96C',
              borderBottom: '1px solid rgba(196, 169, 108, 0.3)',
              paddingBottom: '2px',
            }}
          >
            hello@zenitha.luxury
          </a>
        </div>
      </section>
    </div>
  );
}

// ─── Brand Card Component ─────────────────────────────────────────

interface Brand {
  name: string;
  tagline: string;
  domain: string;
  href: string;
  color: string;
  destination: string;
  status: 'live' | 'coming';
}

function BrandCard({ brand }: { brand: Brand }) {
  const isLive = brand.status === 'live';

  return (
    <div
      className="group relative overflow-hidden transition-all duration-500"
      style={{
        background: '#141414',
        border: '1px solid rgba(196, 169, 108, 0.08)',
        padding: '32px',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(196, 169, 108, 0.25)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(196, 169, 108, 0.08)';
      }}
    >
      {/* Color accent bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: brand.color,
          opacity: 0.6,
        }}
      />

      {/* Status badge */}
      <div
        className="mb-4"
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: '0.625rem',
          letterSpacing: '0.2em',
          color: isLive ? '#C4A96C' : '#4A4A4A',
        }}
      >
        {isLive ? 'LIVE' : 'COMING SOON'}
      </div>

      {/* Brand name */}
      <h3
        style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: '1.5rem',
          fontWeight: 500,
          letterSpacing: '0.04em',
          color: '#FDFCF9',
          margin: 0,
        }}
      >
        {brand.name}
      </h3>

      {/* Tagline */}
      <p
        className="mt-2"
        style={{
          fontFamily: "'Source Serif 4', Georgia, serif",
          fontSize: '0.9375rem',
          color: '#8A8A8A',
          lineHeight: 1.6,
        }}
      >
        {brand.tagline}
      </p>

      {/* Destination */}
      <p
        className="mt-3"
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: '0.75rem',
          letterSpacing: '0.1em',
          color: '#4A4A4A',
        }}
      >
        {brand.destination}
      </p>

      {/* Link */}
      {isLive ? (
        <a
          href={brand.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-6 no-underline"
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '0.75rem',
            letterSpacing: '0.15em',
            color: '#C4A96C',
          }}
        >
          VISIT {brand.domain.toUpperCase()} &rarr;
        </a>
      ) : (
        <div
          className="mt-6"
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '0.75rem',
            letterSpacing: '0.1em',
            color: '#2A2A2A',
          }}
        >
          {brand.domain}
        </div>
      )}
    </div>
  );
}

// ─── Decorative Diamond ───────────────────────────────────────────

function DiamondDecoration({ size = 60 }: { size?: number }) {
  const h = size / 2;
  const inner = h * 0.6;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="inline-block"
      aria-hidden="true"
    >
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
      <circle cx={h} cy={h} r={size * 0.04} fill="#C4A96C" />
    </svg>
  );
}
