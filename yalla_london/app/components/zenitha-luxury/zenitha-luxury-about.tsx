'use client';

export function ZenithaLuxuryAbout() {
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
          About Zenitha
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
        <div
          className="max-w-[760px] mx-auto"
          style={{
            fontFamily: "'Source Serif 4', Georgia, serif",
            fontSize: '1.0625rem',
            lineHeight: 1.9,
            color: '#D6D0C4',
          }}
        >
          <h2
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: '1.75rem',
              fontWeight: 400,
              letterSpacing: '0.04em',
              color: '#FDFCF9',
              marginBottom: '1.5rem',
            }}
          >
            The Art of Exceptional Travel
          </h2>

          <p>
            Zenitha.Luxury LLC is the parent company behind a growing portfolio
            of luxury travel brands. Founded by Khaled Aun in 2025, the
            company is registered as a Delaware limited liability company with a
            single mission: to build the most trusted network of destination-specific
            travel resources in the world.
          </p>

          <p className="mt-6">
            Each brand in the Zenitha portfolio is purpose-built for a specific
            destination and audience. From London&apos;s cultural riches to
            Mediterranean yacht charters, from Maldives overwater villas to the
            bazaars of Istanbul — every Zenitha experience meets the same
            uncompromising standard of editorial quality and insider expertise.
          </p>

          <div
            className="my-12"
            style={{
              width: '60px',
              height: '1px',
              background: '#C4A96C',
              margin: '3rem auto',
            }}
          />

          <h2
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: '1.75rem',
              fontWeight: 400,
              letterSpacing: '0.04em',
              color: '#FDFCF9',
              marginBottom: '1.5rem',
            }}
          >
            Our Approach
          </h2>

          <p>
            We believe that the best travel content comes from genuine experience.
            Every guide we publish is built on first-hand knowledge, verified
            information, and a deep respect for the destinations we cover. We do
            not repackage press releases or aggregate third-party content.
          </p>

          <p className="mt-6">
            Our technology platform powers all Zenitha brands, ensuring consistent
            quality, multilingual support, and rigorous SEO and editorial standards
            across every published page. This shared infrastructure means that
            launching a new destination brand takes weeks, not years.
          </p>

          <div
            className="my-12"
            style={{
              width: '60px',
              height: '1px',
              background: '#C4A96C',
              margin: '3rem auto',
            }}
          />

          <h2
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: '1.75rem',
              fontWeight: 400,
              letterSpacing: '0.04em',
              color: '#FDFCF9',
              marginBottom: '1.5rem',
            }}
          >
            Leadership
          </h2>

          <div
            className="p-6"
            style={{
              background: '#141414',
              border: '1px solid rgba(196, 169, 108, 0.1)',
            }}
          >
            <h3
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '1rem',
                fontWeight: 500,
                letterSpacing: '0.05em',
                color: '#FDFCF9',
                margin: 0,
              }}
            >
              Khaled Aun
            </h3>
            <div
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '0.75rem',
                letterSpacing: '0.15em',
                color: '#C4A96C',
                marginTop: '4px',
              }}
            >
              FOUNDER &amp; CEO
            </div>
            <p
              className="mt-4"
              style={{
                fontSize: '0.9375rem',
                color: '#8A8A8A',
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              An entrepreneur with a passion for luxury travel and technology.
              Khaled founded Zenitha.Luxury to bridge the gap between
              discerning travellers and the world&apos;s finest destinations,
              starting with the Arab and international luxury travel markets.
            </p>
          </div>

          <div
            className="my-12"
            style={{
              width: '60px',
              height: '1px',
              background: '#C4A96C',
              margin: '3rem auto',
            }}
          />

          <h2
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: '1.75rem',
              fontWeight: 400,
              letterSpacing: '0.04em',
              color: '#FDFCF9',
              marginBottom: '1.5rem',
            }}
          >
            Corporate Information
          </h2>

          <div style={{ fontSize: '0.9375rem', color: '#8A8A8A' }}>
            <p><strong style={{ color: '#D6D0C4' }}>Legal Name:</strong> Zenitha.Luxury LLC</p>
            <p className="mt-2"><strong style={{ color: '#D6D0C4' }}>Jurisdiction:</strong> State of Delaware, USA</p>
            <p className="mt-2"><strong style={{ color: '#D6D0C4' }}>Entity Type:</strong> Limited Liability Company</p>
            <p className="mt-2"><strong style={{ color: '#D6D0C4' }}>Founded:</strong> 2025</p>
            <p className="mt-2"><strong style={{ color: '#D6D0C4' }}>Website:</strong> zenitha.luxury</p>
            <p className="mt-2"><strong style={{ color: '#D6D0C4' }}>Contact:</strong> info@zenitha.luxury</p>
          </div>
        </div>
      </section>
    </div>
  );
}
