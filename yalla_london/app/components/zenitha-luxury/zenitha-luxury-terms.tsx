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

export function ZenithaLuxuryTerms() {
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
          Terms of Service
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
            Welcome to Zenitha.Luxury (&ldquo;the Website&rdquo;), operated by{' '}
            <strong style={{ color: C.ivory }}>Zenitha.Luxury LLC</strong>, a Delaware limited liability
            company founded by Khaled Aun. By accessing or using this website and any of the
            websites in the Zenitha network (collectively, &ldquo;the Services&rdquo;), you agree to
            be bound by these Terms of Service.
          </P>
          <P>
            The Zenitha network includes: Yalla London (yalla-london.com), Zenitha Yachts
            (zenithayachts.com), Arabaldives (arabaldives.com), Yalla Riviera (yallariviera.com),
            Yalla Istanbul (yallaistanbul.com), and Yalla Thailand (yallathailand.com).
          </P>

          <SectionTitle>1. About Our Services</SectionTitle>
          <P>
            Zenitha.Luxury LLC operates a portfolio of luxury travel content websites. Our services
            provide editorial travel guides, destination information, hotel and restaurant
            recommendations, yacht charter information, and curated travel experiences.
          </P>
          <P>
            Our content is created for informational and inspirational purposes. We are not a
            travel agency, tour operator, or booking platform. We do not sell travel services
            directly. When you book through links on our sites, you enter into a direct relationship
            with the third-party provider.
          </P>

          <SectionTitle>2. Affiliate Relationships</SectionTitle>
          <P>
            Our websites contain affiliate links to third-party services including hotel booking
            platforms (Booking.com, HalalBooking, Agoda), experience providers (GetYourGuide,
            Viator, Klook), and yacht charter partners. When you click an affiliate link and
            complete a transaction, we may earn a commission.
          </P>
          <P>
            This commission comes from the partner, not from you — you pay the same price whether
            or not you use our affiliate link. This revenue sustains our editorial team and allows
            us to provide free, high-quality travel content.
          </P>
          <P>
            <strong style={{ color: C.ivory }}>Editorial independence:</strong> We will never
            recommend a product or service solely because it offers a higher commission. All
            recommendations reflect genuine editorial judgement. Affiliate links are identified
            in our content.
          </P>

          <SectionTitle>3. Content Accuracy</SectionTitle>
          <P>
            We make every effort to ensure our content is accurate and up to date. However, travel
            information changes frequently — venue hours, prices, availability, and policies may
            vary from what is published. We recommend verifying critical details directly with
            the provider before making travel plans.
          </P>
          <P>
            Zenitha.Luxury LLC shall not be held liable for any losses, damages, or inconvenience
            arising from reliance on information published on our websites.
          </P>

          <SectionTitle>4. User Responsibilities</SectionTitle>
          <P>By using our Services, you agree not to:</P>
          <ul style={{ paddingLeft: '1.25rem', marginTop: '0.5rem' }}>
            <li>Use our websites for any unlawful purpose</li>
            <li>Scrape, crawl, or extract content using automated tools without written permission</li>
            <li>Republish, redistribute, or resell any content without prior authorisation</li>
            <li>Attempt to interfere with or compromise the security of our systems</li>
            <li>Submit false or misleading information through any form or inquiry</li>
            <li>Use our Services to transmit spam, malware, or unsolicited communications</li>
          </ul>

          <SectionTitle>5. Intellectual Property</SectionTitle>
          <P>
            All content on our websites — including text, photographs, illustrations, design
            elements, logos, and the Zenitha brand identity — is owned by or licensed to
            Zenitha.Luxury LLC and is protected by applicable copyright and trademark laws.
          </P>
          <P>
            The Zenitha brand system, including the diamond mark, obsidian and gold colour scheme,
            and typographic identity, is proprietary to Zenitha.Luxury LLC.
          </P>
          <P>
            Bilingual content (English and Arabic) published across our network constitutes original
            creative works and is protected accordingly.
          </P>
          <P>
            You may share links to our content and quote brief excerpts (with attribution and a
            link to the original). Any other reproduction requires written permission from
            Zenitha.Luxury LLC.
          </P>

          <SectionTitle>6. Yacht Charter Inquiries</SectionTitle>
          <P>
            Zenitha Yachts (zenithayachts.com) facilitates charter inquiries by connecting prospective
            clients with broker partners. We are not a charter operator and do not own, operate, or
            crew any vessels.
          </P>
          <P>
            Charter agreements are between you and the charter operator or broker. Zenitha.Luxury LLC
            is not party to any charter contract and assumes no liability for the charter experience,
            vessel condition, or crew conduct.
          </P>

          <SectionTitle>7. Newsletter Communications</SectionTitle>
          <ul style={{ paddingLeft: '1.25rem', marginTop: '0.5rem' }}>
            <li>We send a maximum of 2 newsletters per week</li>
            <li>Every email includes an unsubscribe link</li>
            <li>Unsubscribe requests are processed within 7 days</li>
            <li>Your email address is never shared with or sold to third parties</li>
          </ul>

          <SectionTitle>8. Limitation of Liability</SectionTitle>
          <P>
            Our Services are provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without
            warranties of any kind, either express or implied, including but not limited to
            warranties of merchantability, fitness for a particular purpose, or non-infringement.
          </P>
          <P>
            To the fullest extent permitted by law, Zenitha.Luxury LLC and its officers, directors,
            employees, and agents shall not be liable for any indirect, incidental, special,
            consequential, or punitive damages arising from your use of or inability to use our
            Services.
          </P>

          <SectionTitle>9. Indemnification</SectionTitle>
          <P>
            You agree to indemnify and hold harmless Zenitha.Luxury LLC, its founder, officers,
            and employees from any claims, damages, losses, or expenses (including reasonable
            legal fees) arising from your violation of these Terms or your use of our Services.
          </P>

          <SectionTitle>10. Governing Law</SectionTitle>
          <P>
            These Terms of Service are governed by and construed in accordance with the laws of
            the State of Delaware, United States, without regard to conflict of law principles.
            Any disputes arising under these Terms shall be subject to the exclusive jurisdiction
            of the courts of Delaware.
          </P>

          <SectionTitle>11. Severability</SectionTitle>
          <P>
            If any provision of these Terms is found to be unenforceable or invalid, that provision
            shall be limited or eliminated to the minimum extent necessary, and the remaining
            provisions shall continue in full force and effect.
          </P>

          <SectionTitle>12. Changes to These Terms</SectionTitle>
          <P>
            We reserve the right to modify these Terms at any time. The &ldquo;Last Updated&rdquo;
            date at the top of this page reflects the most recent revision. Your continued use of
            our Services after any changes constitutes acceptance of the updated Terms.
          </P>

          <SectionTitle>13. Contact</SectionTitle>
          <div
            className="mt-4 p-6"
            style={{ background: C.surface, border: `1px solid rgba(196, 169, 108, 0.1)` }}
          >
            <p style={{ color: C.ivory, fontWeight: 500 }}>Zenitha.Luxury LLC</p>
            <p style={{ color: C.muted, marginTop: '0.25rem' }}>Wilmington, Delaware, United States</p>
            <p className="mt-3">
              <strong style={{ color: C.text }}>Legal:</strong>{' '}
              <a href="mailto:legal@zenitha.luxury" style={{ color: C.gold }}>legal@zenitha.luxury</a>
            </p>
            <p className="mt-1">
              <strong style={{ color: C.text }}>General:</strong>{' '}
              <a href="mailto:info@zenitha.luxury" style={{ color: C.gold }}>info@zenitha.luxury</a>
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
