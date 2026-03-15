'use client';

import Link from 'next/link';

const FONT = {
  heading: "'Cormorant Garamond', Georgia, serif",
  body: "'Source Serif 4', Georgia, serif",
  ui: "'DM Sans', sans-serif",
};

const C = {
  bg: '#0A0A0A',
  surface: '#141414',
  ivory: '#FDFCF9',
  gold: '#C4A96C',
  text: '#D6D0C4',
  muted: '#8A8A8A',
  dim: '#4A4A4A',
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontFamily: FONT.heading,
        fontSize: '1.5rem',
        fontWeight: 400,
        letterSpacing: '0.04em',
        color: C.ivory,
        marginTop: '3rem',
        marginBottom: '1rem',
      }}
    >
      {children}
    </h2>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ marginTop: '0.75rem', lineHeight: 1.85 }}>
      {children}
    </p>
  );
}

export function ZenithaLuxuryAffiliateDisclosure() {
  return (
    <div style={{ background: C.bg, color: C.text }}>
      {/* Hero */}
      <section
        className="flex flex-col items-center justify-center text-center px-6 pt-32 pb-20"
        style={{
          background: 'linear-gradient(160deg, #0A0A0A 0%, #1A1208 50%, #0A0A0A 100%)',
        }}
      >
        <h1
          style={{
            fontFamily: FONT.heading,
            fontSize: 'clamp(2rem, 5vw, 3rem)',
            fontWeight: 300,
            letterSpacing: '0.08em',
            color: C.ivory,
          }}
        >
          Affiliate Disclosure
        </h1>
        <div
          className="mt-4"
          style={{
            width: '80px',
            height: '1px',
            background: `linear-gradient(90deg, transparent, ${C.gold}, transparent)`,
          }}
        />
        <p className="mt-4" style={{ fontFamily: FONT.ui, fontSize: '0.8125rem', color: C.dim, letterSpacing: '0.1em' }}>
          FTC &amp; ASA COMPLIANCE DISCLOSURE
        </p>
      </section>

      {/* Content */}
      <section className="px-6 py-20">
        <div
          className="max-w-[760px] mx-auto"
          style={{
            fontFamily: FONT.body,
            fontSize: '1rem',
            lineHeight: 1.85,
            color: C.text,
          }}
        >
          {/* Summary box */}
          <div
            className="p-6"
            style={{
              background: C.surface,
              border: `1px solid rgba(196, 169, 108, 0.15)`,
              borderLeft: `3px solid ${C.gold}`,
            }}
          >
            <p style={{ fontFamily: FONT.ui, fontSize: '0.875rem', fontWeight: 500, color: C.ivory, margin: 0 }}>
              In Plain Language
            </p>
            <p style={{ color: C.muted, marginTop: '0.5rem', fontSize: '0.9375rem', lineHeight: 1.8 }}>
              Some links on our websites earn us a commission when you make a purchase.
              You pay the same price regardless. We only recommend services we genuinely
              believe in. This revenue allows us to keep our content free.
            </p>
          </div>

          <SectionTitle>How We Earn Revenue</SectionTitle>
          <P>
            Zenitha.Luxury LLC operates a network of luxury travel websites. These websites
            are free to use. We sustain our editorial operations primarily through affiliate
            partnerships — when you click a link on our site and complete a booking or purchase,
            we may receive a commission from the service provider.
          </P>
          <P>
            This commission is paid by the partner company, not by you. The price you pay is
            identical whether you arrived via our link or went directly to the provider&apos;s
            website.
          </P>

          <SectionTitle>Our Affiliate Partners</SectionTitle>
          <P>We maintain partnerships with the following categories of travel service providers:</P>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { category: 'Hotel Booking', partners: 'Booking.com, HalalBooking, Agoda, Hotels.com' },
              { category: 'Experiences', partners: 'GetYourGuide, Viator, Klook' },
              { category: 'Yacht Charters', partners: 'Boatbookings, direct broker partners' },
              { category: 'Vacation Rentals', partners: 'Vrbo (via CJ Affiliate)' },
              { category: 'Travel Insurance', partners: 'Various providers via affiliate networks' },
              { category: 'Affiliate Networks', partners: 'CJ Affiliate (Commission Junction)' },
            ].map((item) => (
              <div
                key={item.category}
                className="p-4"
                style={{ background: C.surface, border: `1px solid rgba(196, 169, 108, 0.08)` }}
              >
                <p style={{ fontFamily: FONT.ui, fontSize: '0.8125rem', fontWeight: 500, color: C.gold, margin: 0 }}>
                  {item.category}
                </p>
                <p style={{ fontSize: '0.875rem', color: C.muted, marginTop: '0.25rem' }}>
                  {item.partners}
                </p>
              </div>
            ))}
          </div>

          <SectionTitle>Editorial Independence</SectionTitle>
          <P>
            Our editorial recommendations are made independently of our commercial relationships.
            The presence or absence of an affiliate partnership does not influence our coverage
            decisions, ratings, or editorial positioning.
          </P>
          <P>
            Specifically, we commit to the following principles:
          </P>
          <ul style={{ paddingLeft: '1.25rem', marginTop: '0.5rem' }}>
            <li>
              We <strong style={{ color: C.ivory }}>never</strong> recommend a service solely
              because it offers a higher commission
            </li>
            <li>
              We include services that do not have affiliate programs when they merit recommendation
            </li>
            <li>
              Negative reviews and honest assessments are published even when affiliate relationships exist
            </li>
            <li>
              Affiliate links are identified in our content
            </li>
            <li>
              Our editorial team operates independently of our revenue team
            </li>
          </ul>

          <SectionTitle>How Affiliate Links Work</SectionTitle>
          <P>
            When you click an affiliate link, a small tracking parameter (called a SID) is appended
            to the URL. This allows the partner to attribute the referral to our website. If you
            complete a purchase within the partner&apos;s attribution window (typically 24 hours to
            30 days, depending on the partner), we receive a commission.
          </P>
          <P>
            This tracking is anonymised — we do not receive your name, payment details, or any
            personal information from the partner. We only receive confirmation that a transaction
            occurred and the commission amount.
          </P>

          <SectionTitle>Identifying Affiliate Links</SectionTitle>
          <P>
            Affiliate links on our websites may be identified by:
          </P>
          <ul style={{ paddingLeft: '1.25rem', marginTop: '0.5rem' }}>
            <li>A &ldquo;Book Now&rdquo; or &ldquo;Check Prices&rdquo; call-to-action button</li>
            <li>Links directing to booking platforms (booking.com, getyourguide.com, etc.)</li>
            <li>A <code style={{ color: C.gold, fontSize: '0.875rem' }}>rel=&quot;sponsored&quot;</code> attribute in the link HTML</li>
            <li>Sections labelled &ldquo;Where to Book&rdquo; or &ldquo;Recommended Partners&rdquo;</li>
          </ul>

          <SectionTitle>Regulatory Compliance</SectionTitle>
          <P>
            This disclosure is made in compliance with:
          </P>
          <ul style={{ paddingLeft: '1.25rem', marginTop: '0.5rem' }}>
            <li>
              <strong style={{ color: C.ivory }}>United States:</strong> Federal Trade Commission
              (FTC) Endorsement Guides (16 CFR Part 255)
            </li>
            <li>
              <strong style={{ color: C.ivory }}>United Kingdom:</strong> Advertising Standards
              Authority (ASA) and Competition and Markets Authority (CMA) guidelines on affiliate marketing
            </li>
            <li>
              <strong style={{ color: C.ivory }}>European Union:</strong> Unfair Commercial
              Practices Directive (2005/29/EC)
            </li>
          </ul>

          <SectionTitle>Questions</SectionTitle>
          <P>
            If you have questions about our affiliate relationships or this disclosure, contact us
            at{' '}
            <a href="mailto:hello@zenitha.luxury" style={{ color: C.gold }}>hello@zenitha.luxury</a>.
          </P>

          {/* Back link */}
          <div className="mt-12 text-center">
            <Link
              href="/"
              className="no-underline"
              style={{ fontFamily: FONT.ui, fontSize: '0.8125rem', letterSpacing: '0.15em', color: C.gold }}
            >
              &larr; RETURN HOME
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
