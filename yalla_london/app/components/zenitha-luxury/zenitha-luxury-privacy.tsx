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

export function ZenithaLuxuryPrivacy() {
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
          Privacy Policy
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
          LAST UPDATED: MARCH 12, 2026
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
          <P>
            Zenitha.Luxury LLC (&ldquo;Zenitha,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;)
            is the data controller for all personal information collected through this website
            (<strong style={{ color: C.ivory }}>zenitha.luxury</strong>) and the network of websites
            operated under the Zenitha brand, including Yalla London, Zenitha Yachts, Arabaldives,
            Yalla Riviera, Yalla Istanbul, and Yalla Thailand.
          </P>
          <P>
            Zenitha.Luxury LLC is a Delaware limited liability company founded by Khaled N. Aun.
            This Privacy Policy explains how we collect, use, store, and protect your personal data
            when you visit our websites or interact with our services.
          </P>

          <SectionTitle>1. Information We Collect</SectionTitle>

          <h3 style={{ fontFamily: FONT.ui, fontSize: '0.9375rem', fontWeight: 500, color: C.ivory, marginTop: '1.5rem' }}>
            Information You Provide
          </h3>
          <ul style={{ paddingLeft: '1.25rem', marginTop: '0.5rem' }}>
            <li>Contact form submissions (name, email, message)</li>
            <li>Newsletter subscriptions (email address)</li>
            <li>Charter inquiry forms (name, email, phone, travel dates, preferences)</li>
            <li>Cookie preference selections</li>
            <li>Language preference (English or Arabic)</li>
            <li>Feedback and correspondence</li>
          </ul>

          <h3 style={{ fontFamily: FONT.ui, fontSize: '0.9375rem', fontWeight: 500, color: C.ivory, marginTop: '1.5rem' }}>
            Information Collected Automatically
          </h3>
          <ul style={{ paddingLeft: '1.25rem', marginTop: '0.5rem' }}>
            <li>Device and browser information (type, version, operating system)</li>
            <li>IP address (anonymised before processing)</li>
            <li>Pages visited, time spent, and interaction patterns</li>
            <li>Referral source (how you arrived at our site)</li>
            <li>Geographic region (country/city level, not precise location)</li>
          </ul>

          <SectionTitle>2. How We Use Your Information</SectionTitle>
          <ul style={{ paddingLeft: '1.25rem', marginTop: '0.5rem' }}>
            <li>To respond to your inquiries (within 48 hours)</li>
            <li>To deliver newsletters you have subscribed to (maximum 2 per week)</li>
            <li>To personalise your experience (language, content recommendations)</li>
            <li>To improve our content and services based on usage patterns</li>
            <li>To monitor and maintain the security of our websites</li>
            <li>To process charter inquiries and connect you with yacht partners</li>
            <li>To track affiliate link interactions for revenue attribution</li>
          </ul>

          <SectionTitle>3. Cookies and Tracking</SectionTitle>
          <P>We use the following categories of cookies:</P>

          <div
            className="mt-4 p-5"
            style={{ background: C.surface, border: `1px solid rgba(196, 169, 108, 0.08)` }}
          >
            <h4 style={{ fontFamily: FONT.ui, fontSize: '0.875rem', fontWeight: 500, color: C.gold, margin: 0 }}>
              Essential Cookies
            </h4>
            <p style={{ fontSize: '0.9375rem', color: C.muted, marginTop: '0.5rem' }}>
              Language preference (stored in local storage), cookie consent choices, and session management.
              These cannot be disabled.
            </p>
          </div>
          <div
            className="mt-3 p-5"
            style={{ background: C.surface, border: `1px solid rgba(196, 169, 108, 0.08)` }}
          >
            <h4 style={{ fontFamily: FONT.ui, fontSize: '0.875rem', fontWeight: 500, color: C.gold, margin: 0 }}>
              Analytics Cookies
            </h4>
            <p style={{ fontSize: '0.9375rem', color: C.muted, marginTop: '0.5rem' }}>
              Google Analytics 4 (GA4) with anonymised IP addresses. Retained for up to 14 months.
              You may opt out via the cookie consent banner.
            </p>
          </div>
          <div
            className="mt-3 p-5"
            style={{ background: C.surface, border: `1px solid rgba(196, 169, 108, 0.08)` }}
          >
            <h4 style={{ fontFamily: FONT.ui, fontSize: '0.875rem', fontWeight: 500, color: C.gold, margin: 0 }}>
              Third-Party Cookies
            </h4>
            <p style={{ fontSize: '0.9375rem', color: C.muted, marginTop: '0.5rem' }}>
              Affiliate partner cookies (e.g., Booking.com, CJ Affiliate) are set only when you
              click through an affiliate link. These are governed by the respective partner&apos;s privacy policy.
            </p>
          </div>

          <SectionTitle>4. Affiliate Partnerships</SectionTitle>
          <P>
            Our websites contain affiliate links to travel services including hotel booking platforms,
            experience providers, and yacht charter partners. When you click an affiliate link and
            make a purchase, we may earn a commission at no additional cost to you.
          </P>
          <P>
            We use a Session ID (SID) parameter to attribute clicks and commissions to specific content.
            This tracking is anonymised and does not identify you personally.
          </P>
          <P>
            We will never recommend a service solely because it offers a higher commission. Our editorial
            standards are independent of our commercial relationships.
          </P>

          <SectionTitle>5. Third-Party Service Providers</SectionTitle>
          <P>We share data with the following processors, all of which maintain appropriate data protection standards:</P>
          <ul style={{ paddingLeft: '1.25rem', marginTop: '0.5rem' }}>
            <li><strong style={{ color: C.ivory }}>Vercel</strong> — Website hosting (SOC 2 Type 2 certified, US)</li>
            <li><strong style={{ color: C.ivory }}>Supabase</strong> — Database (PostgreSQL with row-level security, AES-256 encryption at rest)</li>
            <li><strong style={{ color: C.ivory }}>Google Analytics</strong> — Traffic analysis (anonymised IPs, EU/US Privacy Framework)</li>
            <li><strong style={{ color: C.ivory }}>CJ Affiliate</strong> — Affiliate tracking and commission management</li>
            <li><strong style={{ color: C.ivory }}>Cloudflare</strong> — DNS, CDN, and DDoS protection</li>
          </ul>

          <SectionTitle>6. Data Retention</SectionTitle>
          <ul style={{ paddingLeft: '1.25rem', marginTop: '0.5rem' }}>
            <li>Contact form submissions: 12 months</li>
            <li>Newsletter subscriptions: until you unsubscribe (removed within 7 days of request)</li>
            <li>Charter inquiries: 24 months (for follow-up and service improvement)</li>
            <li>Google Analytics data: 14 months (Google default)</li>
            <li>Cookie preferences: stored in your browser indefinitely</li>
          </ul>

          <SectionTitle>7. Your Rights</SectionTitle>
          <P>
            Depending on your jurisdiction, you may have the following rights regarding your personal data:
          </P>
          <ul style={{ paddingLeft: '1.25rem', marginTop: '0.5rem' }}>
            <li><strong style={{ color: C.ivory }}>Access</strong> — Request a copy of the personal data we hold about you</li>
            <li><strong style={{ color: C.ivory }}>Rectification</strong> — Request correction of inaccurate data</li>
            <li><strong style={{ color: C.ivory }}>Erasure</strong> — Request deletion of your personal data</li>
            <li><strong style={{ color: C.ivory }}>Restriction</strong> — Request that we limit processing of your data</li>
            <li><strong style={{ color: C.ivory }}>Portability</strong> — Request your data in a machine-readable format</li>
            <li><strong style={{ color: C.ivory }}>Objection</strong> — Object to processing based on legitimate interests</li>
            <li><strong style={{ color: C.ivory }}>Withdraw Consent</strong> — Withdraw consent at any time where processing is consent-based</li>
          </ul>
          <P>
            To exercise any of these rights, contact us at{' '}
            <a href="mailto:legal@zenitha.luxury" style={{ color: C.gold }}>legal@zenitha.luxury</a>.
            We will respond within 30 days.
          </P>
          <P>
            You may also submit a data deletion request by emailing{' '}
            <a href="mailto:legal@zenitha.luxury" style={{ color: C.gold }}>legal@zenitha.luxury</a> with
            the subject line &ldquo;Data Deletion Request.&rdquo;
          </P>

          <SectionTitle>8. Data Security</SectionTitle>
          <ul style={{ paddingLeft: '1.25rem', marginTop: '0.5rem' }}>
            <li>All data transmitted via HTTPS with TLS 1.2+ encryption</li>
            <li>Hosted on Vercel (SOC 2 Type 2 certified infrastructure)</li>
            <li>Database secured with row-level security and AES-256 encryption at rest</li>
            <li>Cloudflare DDoS protection and Web Application Firewall</li>
            <li>Access controls and regular security reviews</li>
          </ul>

          <SectionTitle>9. International Data Transfers</SectionTitle>
          <P>
            Your data may be processed in the United States (where Zenitha.Luxury LLC is incorporated)
            and other countries where our service providers operate. All transfers are protected by
            appropriate safeguards including EU-US Data Privacy Framework certification and Standard
            Contractual Clauses where applicable.
          </P>

          <SectionTitle>10. Children&apos;s Privacy</SectionTitle>
          <P>
            Our services are not directed at individuals under the age of 13. We do not knowingly
            collect personal data from children. If we become aware that we have collected data from
            a child under 13, we will delete it promptly.
          </P>

          <SectionTitle>11. Changes to This Policy</SectionTitle>
          <P>
            We may update this Privacy Policy from time to time. The &ldquo;Last Updated&rdquo; date at the
            top of this page reflects the most recent revision. Continued use of our websites after
            any changes constitutes acceptance of the updated policy.
          </P>

          <SectionTitle>12. Contact Us</SectionTitle>
          <div
            className="mt-4 p-6"
            style={{ background: C.surface, border: `1px solid rgba(196, 169, 108, 0.1)` }}
          >
            <p style={{ color: C.ivory, fontWeight: 500 }}>Zenitha.Luxury LLC</p>
            <p style={{ color: C.muted, marginTop: '0.25rem' }}>Wilmington, Delaware, United States</p>
            <p className="mt-3">
              <strong style={{ color: C.text }}>Legal inquiries:</strong>{' '}
              <a href="mailto:legal@zenitha.luxury" style={{ color: C.gold }}>legal@zenitha.luxury</a>
            </p>
            <p className="mt-1">
              <strong style={{ color: C.text }}>General inquiries:</strong>{' '}
              <a href="mailto:hello@zenitha.luxury" style={{ color: C.gold }}>hello@zenitha.luxury</a>
            </p>
          </div>

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
