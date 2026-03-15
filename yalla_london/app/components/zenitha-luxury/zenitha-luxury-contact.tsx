'use client';

export function ZenithaLuxuryContact() {
  return (
    <div style={{ background: '#0A0A0A', color: '#FDFCF9' }}>
      {/* Hero */}
      <section
        className="flex flex-col items-center justify-center text-center px-6 pt-32 pb-20"
        style={{
          background: 'linear-gradient(160deg, #0A0A0A 0%, #1A1208 50%, #0A0A0A 100%)',
        }}
      >
        <h1
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: 'clamp(2rem, 5vw, 3rem)',
            fontWeight: 300,
            letterSpacing: '0.08em',
          }}
        >
          Contact
        </h1>
        <div
          className="mt-4"
          style={{
            width: '80px',
            height: '1px',
            background: 'linear-gradient(90deg, transparent, #C4A96C, transparent)',
          }}
        />
      </section>

      {/* Content */}
      <section className="px-6 py-20">
        <div className="max-w-[760px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* General */}
            <ContactCard
              title="General Inquiries"
              email="hello@zenitha.luxury"
              description="For questions about Zenitha.Luxury, our brands, or partnership opportunities."
            />

            {/* Press */}
            <ContactCard
              title="Press & Media"
              email="hello@zenitha.luxury"
              description="For press inquiries, interview requests, or media kits."
            />

            {/* Legal */}
            <ContactCard
              title="Legal"
              email="legal@zenitha.luxury"
              description="For legal matters, GDPR data requests, or regulatory inquiries."
            />

            {/* Advertising */}
            <ContactCard
              title="Advertising & Affiliates"
              email="hello@zenitha.luxury"
              description="For advertising, affiliate partnerships, or sponsored content across our brands."
            />
          </div>

          <div
            className="mt-16 text-center"
            style={{
              fontFamily: "'Source Serif 4', Georgia, serif",
              fontSize: '0.9375rem',
              color: '#4A4A4A',
              lineHeight: 1.8,
            }}
          >
            <p>Zenitha.Luxury LLC</p>
            <p>Wilmington, Delaware, United States</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function ContactCard({
  title,
  email,
  description,
}: {
  title: string;
  email: string;
  description: string;
}) {
  return (
    <div
      className="p-6"
      style={{
        background: '#141414',
        border: '1px solid rgba(196, 169, 108, 0.08)',
      }}
    >
      <h2
        style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: '1.25rem',
          fontWeight: 500,
          letterSpacing: '0.04em',
          color: '#FDFCF9',
          margin: 0,
        }}
      >
        {title}
      </h2>
      <p
        className="mt-3"
        style={{
          fontFamily: "'Source Serif 4', Georgia, serif",
          fontSize: '0.875rem',
          lineHeight: 1.7,
          color: '#8A8A8A',
        }}
      >
        {description}
      </p>
      <a
        href={`mailto:${email}`}
        className="inline-block mt-4 no-underline"
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: '0.8125rem',
          letterSpacing: '0.05em',
          color: '#C4A96C',
        }}
      >
        {email}
      </a>
    </div>
  );
}
