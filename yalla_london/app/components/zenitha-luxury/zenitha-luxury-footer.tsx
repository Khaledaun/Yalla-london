'use client';

/**
 * ZenithaLuxuryFooter — Matches skeleton footer exactly.
 * 4-column: brand info, Platforms (3 links), Company (4 links), Legal (3 links).
 * Bottom row: copyright + metadata + socials (IG, LI, X).
 */
export function ZenithaLuxuryFooter() {
  return (
    <footer
      aria-label="Site footer"
      style={{
        padding: '3.5rem 5rem 1.5rem',
        borderTop: '1px solid rgba(196, 169, 108, 0.06)',
        background: 'var(--zl-obsidian)',
      }}
    >
      {/* Top grid */}
      <div
        className="grid gap-12 mb-10"
        style={{
          gridTemplateColumns: '1.5fr 1fr 1fr 1fr',
        }}
      >
        {/* Brand column */}
        <div>
          <img
            src="/branding/zenitha-luxury/logo/zenitha-logo-light.png"
            alt="Zenitha Luxury"
            style={{ height: '28px', width: 'auto', marginBottom: '0.25rem' }}
          />
          <div
            style={{
              fontFamily: 'var(--zl-font-label)',
              fontSize: '0.52rem',
              letterSpacing: '0.18em',
              textTransform: 'uppercase' as const,
              color: 'rgba(245, 240, 232, 0.28)',
              marginBottom: '0.9rem',
            }}
          >
            Travel Venture Studio
          </div>
          <div
            style={{
              fontFamily: 'var(--zl-font-body)',
              fontSize: '0.7rem',
              fontWeight: 300,
              color: 'rgba(245, 240, 232, 0.32)',
              lineHeight: 1.75,
            }}
          >
            Building AI&#8209;powered travel products for high&#8209;value
            travellers. Proprietary technology meets genuine,
            human&#8209;curated editorial.
          </div>
        </div>

        {/* Platforms */}
        <FooterColumn title="Platforms">
          <FooterLink href="https://www.yalla-london.com">Yalla London</FooterLink>
          <FooterLink href="https://www.zenithayachts.com">Zenitha Yachts</FooterLink>
          <FooterLink href="https://www.worldtme.com">Worldtme</FooterLink>
        </FooterColumn>

        {/* Company */}
        <FooterColumn title="Company">
          <FooterLink href="#about">About</FooterLink>
          <FooterLink href="#partnerships">Partnerships</FooterLink>
          <FooterLink href="#platforms">Platforms</FooterLink>
          <FooterLink href="#contact">Contact</FooterLink>
        </FooterColumn>

        {/* Legal */}
        <FooterColumn title="Legal">
          {/* TODO: Link to actual policy pages in your app. */}
          <FooterLink href="#">Privacy Policy</FooterLink>
          <FooterLink href="#">Terms of Use</FooterLink>
          <FooterLink href="#">Cookie Policy</FooterLink>
        </FooterColumn>
      </div>

      {/* Bottom row */}
      <div
        className="flex justify-between items-center flex-wrap gap-4"
        style={{
          paddingTop: '1.4rem',
          borderTop: '1px solid rgba(196, 169, 108, 0.04)',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--zl-font-label)',
            fontSize: '0.57rem',
            letterSpacing: '0.05em',
            color: 'rgba(245, 240, 232, 0.22)',
          }}
        >
          &copy; 2026 Zenitha.Luxury LLC — Delaware, USA. All rights
          reserved.
        </div>
        <div
          style={{
            fontFamily: 'var(--zl-font-label)',
            fontSize: '0.55rem',
            letterSpacing: '0.09em',
            textTransform: 'uppercase' as const,
            color: 'rgba(245, 240, 232, 0.18)',
          }}
        >
          Delaware, USA &middot; London &middot; Dubai
        </div>
        <div className="flex" style={{ gap: '0.5rem' }}>
          {/* TODO: Replace with real social profiles or remove if not used. */}
          {['IG', 'LI', 'X'].map((label) => (
            <a
              key={label}
              href="#"
              className="flex items-center justify-center no-underline transition-colors duration-300"
              style={{
                width: '28px',
                height: '28px',
                border: '1px solid rgba(196, 169, 108, 0.1)',
                color: 'rgba(245, 240, 232, 0.3)',
                fontFamily: 'var(--zl-font-label)',
                fontSize: '0.56rem',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--zl-gold)';
                (e.currentTarget as HTMLElement).style.color = 'var(--zl-gold)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor =
                  'rgba(196, 169, 108, 0.1)';
                (e.currentTarget as HTMLElement).style.color =
                  'rgba(245, 240, 232, 0.3)';
              }}
            >
              {label}
            </a>
          ))}
        </div>
      </div>

      {/* Responsive override for mobile */}
      <style>{`
        @media (max-width: 960px) {
          footer {
            padding: 2.5rem 1.5rem 1rem !important;
          }
          footer > div:first-child {
            grid-template-columns: 1fr 1fr !important;
            gap: 2rem !important;
          }
        }
      `}</style>
    </footer>
  );
}

/* ─── Sub-components ─── */

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h5
        style={{
          fontFamily: 'var(--zl-font-label)',
          fontSize: '0.57rem',
          letterSpacing: '0.18em',
          textTransform: 'uppercase' as const,
          color: 'var(--zl-gold-deep)',
          marginBottom: '0.9rem',
        }}
      >
        {title}
      </h5>
      {children}
    </div>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const isExternal = href.startsWith('http');
  return (
    <a
      href={href}
      className="block no-underline transition-colors duration-300"
      style={{
        fontFamily: 'var(--zl-font-body)',
        fontSize: '0.7rem',
        fontWeight: 300,
        color: 'rgba(245, 240, 232, 0.32)',
        marginBottom: '0.45rem',
      }}
      {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.color = 'var(--zl-gold)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.color =
          'rgba(245, 240, 232, 0.32)';
      }}
      onClick={(e) => {
        if (href.startsWith('#')) {
          e.preventDefault();
          const el = document.getElementById(href.replace('#', ''));
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }
      }}
    >
      {children}
    </a>
  );
}
