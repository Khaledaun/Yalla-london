"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";

/* ─── Brand Constants ──────────────────────────────────── */
const B = {
  red: "#C8322B",
  redDark: "#8b1f1c",
  gold: "#C49A2A",
  goldLight: "#d9b938",
  blue: "#3B7EA1",
  charcoal: "#1C1917",
  cream: "#FAF8F4",
  sand: "#D6D0C4",
  stone: "#78716C",
  white: "#FFFFFF",
  forest: "#2D5A3D",
};

/* ─── Verified Unsplash image URLs (full paths, not IDs) ── */
const IMG = {
  heroLondon: "https://images.unsplash.com/photo-1486299267070-83823f5448dd?w=900&q=80&auto=format",
  tubeStation: "https://images.unsplash.com/photo-1536514498073-50e69d39c6cf?w=900&q=80&auto=format",
  oxfordStreet: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=900&q=80&auto=format",
  towerOfLondon: "https://images.unsplash.com/photo-1520986606214-8b456183c5a0?w=600&q=80&auto=format",
  britishMuseum: "https://images.unsplash.com/photo-1614028674026-a65e31bfd27c?w=600&q=80&auto=format",
  buckinghamPalace: "https://images.unsplash.com/photo-1587027066597-88c8tried7f0a?w=600&q=80&auto=format",
  boroughMarket: "https://images.unsplash.com/photo-1506368249639-73a05d6f6488?w=600&q=80&auto=format",
  skyGarden: "https://images.unsplash.com/photo-1488747279002-c8523379faaa?w=600&q=80&auto=format",
  southBank: "https://images.unsplash.com/photo-1526129318478-62ed807ebdf9?w=600&q=80&auto=format",
  boroughMarketWide: "https://images.unsplash.com/photo-1506368249639-73a05d6f6488?w=900&q=80&auto=format",
};

/* ─── Shared Components ─────────────────────────────────── */

function TriBar() {
  return (
    <div style={{ display: "flex", gap: 4, margin: "1.5rem 0" }}>
      <div style={{ flex: 1, height: 4, background: B.red, borderRadius: 2 }} />
      <div style={{ flex: 1, height: 4, background: B.gold, borderRadius: 2 }} />
      <div style={{ flex: 1, height: 4, background: B.blue, borderRadius: 2 }} />
    </div>
  );
}

function SectionHeader({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
        <span style={{ fontSize: "1.8rem" }}>{icon}</span>
        <h2
          style={{
            fontSize: "1.75rem",
            fontWeight: 700,
            color: B.charcoal,
            letterSpacing: "-0.5px",
            margin: 0,
          }}
        >
          {title}
        </h2>
      </div>
      {subtitle && (
        <p style={{ color: B.stone, fontSize: "0.95rem", margin: "4px 0 0 0" }}>{subtitle}</p>
      )}
      <TriBar />
    </div>
  );
}

function InfoCard({
  title,
  children,
  accent = B.gold,
}: {
  title: string;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <div
      style={{
        background: B.white,
        border: `1px solid ${B.sand}`,
        borderLeft: `4px solid ${accent}`,
        borderRadius: 12,
        padding: "1.25rem 1.5rem",
        marginBottom: "1rem",
      }}
    >
      <h3 style={{ fontWeight: 600, color: B.charcoal, fontSize: "1.05rem", marginBottom: 8 }}>
        {title}
      </h3>
      <div style={{ color: B.stone, fontSize: "0.92rem", lineHeight: 1.7 }}>{children}</div>
    </div>
  );
}

function PhotoCard({
  src,
  alt,
  caption,
  credit,
}: {
  src: string;
  alt: string;
  caption?: string;
  credit?: string;
}) {
  return (
    <figure style={{ margin: "1.5rem 0", borderRadius: 12, overflow: "hidden", position: "relative" }}>
      <Image
        src={src}
        alt={alt}
        width={900}
        height={500}
        style={{ width: "100%", height: "auto", display: "block", borderRadius: 12 }}
        unoptimized
      />
      {(caption || credit) && (
        <figcaption
          style={{
            padding: "8px 12px",
            fontSize: "0.8rem",
            color: B.stone,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          {caption && <span>{caption}</span>}
          {credit && <span>Photo: {credit} / Unsplash</span>}
        </figcaption>
      )}
    </figure>
  );
}

function AffiliateButton({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="sponsored nofollow noopener"
      style={{
        display: "inline-block",
        padding: "10px 24px",
        background: `linear-gradient(135deg, ${B.gold} 0%, ${B.goldLight} 100%)`,
        color: B.white,
        fontWeight: 600,
        fontSize: "0.9rem",
        borderRadius: 8,
        textDecoration: "none",
        marginTop: 8,
        boxShadow: `0 4px 12px rgba(196, 154, 42, 0.3)`,
      }}
    >
      {label} →
    </a>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "#FFF8E1",
        border: `1px solid ${B.goldLight}`,
        borderRadius: 10,
        padding: "12px 16px",
        fontSize: "0.88rem",
        color: B.charcoal,
        margin: "1rem 0",
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
      }}
    >
      <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>💡</span>
      <div>{children}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN GUIDE COMPONENT
   ═══════════════════════════════════════════════════════════ */

export default function LondonGuideContent() {
  return (
    <div
      style={{
        maxWidth: 820,
        margin: "0 auto",
        background: B.cream,
        fontFamily: "var(--font-editorial), Georgia, serif",
        color: B.charcoal,
        lineHeight: 1.8,
      }}
    >
      {/* ════════════ COVER ════════════ */}
      <div
        style={{
          background: `linear-gradient(135deg, ${B.charcoal} 0%, ${B.redDark} 50%, ${B.charcoal} 100%)`,
          color: B.white,
          padding: "4rem 2.5rem 3rem",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative circles */}
        <div
          style={{
            position: "absolute",
            top: -60,
            right: -60,
            width: 200,
            height: 200,
            borderRadius: "50%",
            border: `2px solid ${B.gold}33`,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -40,
            left: -40,
            width: 160,
            height: 160,
            borderRadius: "50%",
            border: `2px solid ${B.red}33`,
          }}
        />

        {/* Tricolor bar */}
        <div style={{ display: "flex", gap: 3, marginBottom: "2.5rem", justifyContent: "center" }}>
          <div style={{ width: 60, height: 3, background: B.red, borderRadius: 2 }} />
          <div style={{ width: 60, height: 3, background: B.gold, borderRadius: 2 }} />
          <div style={{ width: 60, height: 3, background: B.blue, borderRadius: 2 }} />
        </div>

        <div
          style={{
            display: "inline-block",
            border: `1.5px solid ${B.gold}`,
            borderRadius: 8,
            padding: "6px 20px",
            fontSize: "0.75rem",
            letterSpacing: 3,
            textTransform: "uppercase",
            color: B.gold,
            marginBottom: "1.5rem",
          }}
        >
          Free Guide · 2026 Edition
        </div>

        <h1
          style={{
            fontSize: "2.8rem",
            fontWeight: 700,
            letterSpacing: "-1px",
            lineHeight: 1.1,
            marginBottom: "0.75rem",
            fontFamily: "var(--font-display), sans-serif",
          }}
        >
          The Complete
          <br />
          <span style={{ color: B.gold }}>London</span> Travel Guide
        </h1>

        <p style={{ fontSize: "1.1rem", color: `${B.white}cc`, maxWidth: 500, margin: "0 auto 2rem" }}>
          Weather · Transport · Attractions · Restaurants · Markets · Insider Tips
        </p>

        {/* Official Logo */}
        <Image
          src="/images/yalla-london-logo-white.svg"
          alt="Yalla London"
          width={200}
          height={60}
          style={{ margin: "0 auto" }}
          unoptimized
        />

        <p style={{ fontSize: "0.75rem", color: `${B.white}88`, marginTop: "1.5rem" }}>
          yalla-london.com
        </p>
      </div>

      {/* ════════════ BODY ════════════ */}
      <div style={{ padding: "2.5rem 2rem" }}>
        {/* Hero photo */}
        <PhotoCard
          src={IMG.heroLondon}
          alt="London skyline with Big Ben and the Houses of Parliament"
          caption="The Houses of Parliament and Big Ben at dusk"
          credit="Eva Dang"
        />

        {/* ─── WEATHER ─── */}
        <SectionHeader
          icon="🌤️"
          title="London Weather"
          subtitle="What to expect and what to pack — month by month"
        />

        <p>
          London&apos;s weather is mild but unpredictable. Summers (June–August) average 18–25°C with
          long daylight hours until 9pm. Winters (December–February) are cold but rarely below 0°C,
          with sunset as early as 3:45pm. Rain can happen any day of the year — always carry a
          compact umbrella.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, margin: "1.5rem 0" }}>
          {[
            { season: "Spring", months: "Mar – May", temp: "10–17°C", icon: "🌸", tip: "Layers + light jacket" },
            { season: "Summer", months: "Jun – Aug", temp: "18–25°C", icon: "☀️", tip: "Light clothes + sunscreen" },
            { season: "Autumn", months: "Sep – Nov", temp: "8–16°C", icon: "🍂", tip: "Warm layers + rain jacket" },
            { season: "Winter", months: "Dec – Feb", temp: "2–8°C", icon: "❄️", tip: "Warm coat + scarf + hat" },
          ].map((s) => (
            <div
              key={s.season}
              style={{
                background: B.white,
                border: `1px solid ${B.sand}`,
                borderRadius: 12,
                padding: "1rem 1.25rem",
                textAlign: "center",
              }}
            >
              <span style={{ fontSize: "1.5rem" }}>{s.icon}</span>
              <h4 style={{ fontWeight: 600, margin: "4px 0", color: B.charcoal }}>{s.season}</h4>
              <p style={{ fontSize: "0.8rem", color: B.stone, margin: 0 }}>{s.months}</p>
              <p style={{ fontSize: "1.1rem", fontWeight: 600, color: B.red, margin: "4px 0" }}>
                {s.temp}
              </p>
              <p style={{ fontSize: "0.78rem", color: B.stone, margin: 0 }}>{s.tip}</p>
            </div>
          ))}
        </div>

        <Tip>
          <strong>Insider tip:</strong> London&apos;s weather apps are notoriously inaccurate beyond
          3 days. Check the BBC Weather forecast the morning of your outing — it&apos;s the most
          reliable for London micro-climates.
        </Tip>

        {/* ─── TRANSPORT ─── */}
        <SectionHeader
          icon="🚇"
          title="Getting Around London"
          subtitle="The Tube, buses, Oyster cards, and how to save money"
        />

        <PhotoCard
          src={IMG.tubeStation}
          alt="London Underground tube station platform"
          caption="The Tube — London's iconic Underground network"
          credit="Aron Van de Pol"
        />

        <InfoCard title="Oyster Card vs Contactless" accent={B.blue}>
          <p style={{ margin: 0 }}>
            <strong>Contactless payment</strong> (Visa/Mastercard/Apple Pay/Google Pay) works on all
            TfL services and has the same daily cap as an Oyster card — <strong>£8.10/day</strong> for
            Zones 1–2. You do NOT need an Oyster card if your bank card supports contactless.
          </p>
        </InfoCard>

        <InfoCard title="Key Transport Tips" accent={B.forest}>
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            <li>
              <strong>Tube hours:</strong> Mon–Sat 5am–midnight. Sun 7am–11:30pm. Night Tube on
              Fri/Sat on select lines (Victoria, Central, Jubilee, Northern, Piccadilly).
            </li>
            <li>
              <strong>Avoid rush hour:</strong> 7:30–9:30am and 5–7pm. Trains are packed and hot.
            </li>
            <li>
              <strong>Buses are cheaper:</strong> £1.75 per journey (max £5.25/day). Great for
              sightseeing — try the 11 or 24 for iconic routes past Westminster and Trafalgar Square.
            </li>
            <li>
              <strong>Heathrow to central London:</strong> Piccadilly line (£5.50, 50 min) or
              Elizabeth line (£12.80, 30 min). Skip the Heathrow Express (£25+) unless you&apos;re in a rush.
            </li>
            <li>
              <strong>Black cabs:</strong> Licensed and safe. Expect £15–30 for short trips in Zone 1.
              Use the Gett app for upfront pricing.
            </li>
          </ul>
        </InfoCard>

        <Tip>
          <strong>Money saver:</strong> Walk whenever possible. Central London is smaller than you
          think — Covent Garden to Buckingham Palace is only 20 minutes on foot, and you&apos;ll see
          far more than from inside a Tube train.
        </Tip>

        <AffiliateButton
          href="https://www.getyourguide.com/london-l57/?partner_id=yalla-london"
          label="Book London Transport Passes on GetYourGuide"
        />


        {/* ─── DOS AND DON'TS ─── */}
        <SectionHeader
          icon="✅"
          title="Dos and Don'ts"
          subtitle="Etiquette, customs, and things every visitor should know"
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, margin: "1rem 0" }}>
          <div>
            <h4 style={{ color: B.forest, fontWeight: 600, marginBottom: 8, fontSize: "1rem" }}>
              ✅ Do
            </h4>
            <ul style={{ paddingLeft: 18, fontSize: "0.9rem", lineHeight: 2, color: B.charcoal }}>
              <li>Stand on the <strong>right</strong> on escalators — walk on the left</li>
              <li>Queue patiently. Brits take queuing very seriously</li>
              <li>Tap in AND out on the Tube (or you&apos;ll be charged maximum fare)</li>
              <li>Tip 10–15% at sit-down restaurants if service isn&apos;t included</li>
              <li>Say &quot;please&quot; and &quot;thank you&quot; — politeness goes far</li>
              <li>Carry an umbrella — even in summer</li>
              <li>Look RIGHT first when crossing roads (traffic drives on the left)</li>
              <li>Book popular restaurants and shows in advance</li>
            </ul>
          </div>
          <div>
            <h4 style={{ color: B.red, fontWeight: 600, marginBottom: 8, fontSize: "1rem" }}>
              ❌ Don&apos;t
            </h4>
            <ul style={{ paddingLeft: 18, fontSize: "0.9rem", lineHeight: 2, color: B.charcoal }}>
              <li>Block the left side of escalators — people WILL glare</li>
              <li>Make eye contact on the Tube (unwritten rule)</li>
              <li>Tip in pubs or at the bar — it&apos;s not expected</li>
              <li>Take the Tube one stop — it&apos;s faster to walk</li>
              <li>Exchange money at the airport (worst rates in the city)</li>
              <li>Eat at chain restaurants near tourist spots (overpriced, mediocre)</li>
              <li>Forget your contactless card — cash is rarely needed</li>
              <li>Jaywalk carelessly — look both ways, traffic is reversed</li>
            </ul>
          </div>
        </div>

        <PhotoCard
          src={IMG.oxfordStreet}
          alt="London skyline with Tower Bridge"
          caption="Tower Bridge — one of London's most iconic landmarks"
          credit="Sabrina Mazzeo"
        />

        {/* ─── MUST SEE ─── */}
        <SectionHeader
          icon="⭐"
          title="Must-See London"
          subtitle="The landmarks and experiences that define the city"
        />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, margin: "1rem 0" }}>
          {[
            {
              name: "Tower of London",
              area: "Tower Hill",
              why: "1,000 years of royal history. See the Crown Jewels. Book the Yeoman Warder tour — it's free with entry and brilliantly entertaining.",
              img: IMG.towerOfLondon,
              price: "£33.60",
            },
            {
              name: "British Museum",
              area: "Bloomsbury",
              why: "World-class collection spanning 2 million years of human history. The Rosetta Stone, Parthenon sculptures, and Egyptian mummies. Free entry.",
              img: IMG.britishMuseum,
              price: "Free",
            },
            {
              name: "Buckingham Palace",
              area: "Westminster",
              why: "Watch the Changing of the Guard ceremony (Mon/Wed/Fri/Sun at 11am, 45 min). State Rooms open July–September.",
              img: "/images/hero/tower-bridge.jpg",
              price: "Free (ceremony)",
            },
            {
              name: "Borough Market",
              area: "Southwark",
              why: "London's oldest food market (1,000+ years). Over 100 stalls selling artisan food from around the world. Go hungry.",
              img: IMG.boroughMarket,
              price: "Free entry",
            },
            {
              name: "Sky Garden",
              area: "City of London",
              why: "Free panoramic views from the 35th floor of the Walkie Talkie building. Book tickets online — they're free but sell out fast.",
              img: IMG.skyGarden,
              price: "Free (book ahead)",
            },
            {
              name: "South Bank Walk",
              area: "Waterloo → Tower Bridge",
              why: "Walk along the Thames past the Tate Modern, Shakespeare's Globe, Borough Market, and HMS Belfast. The best free activity in London.",
              img: IMG.southBank,
              price: "Free",
            },
          ].map((place) => (
            <div
              key={place.name}
              style={{
                background: B.white,
                border: `1px solid ${B.sand}`,
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              <Image
                src={place.img}
                alt={place.name}
                width={600}
                height={340}
                style={{ width: "100%", height: 160, objectFit: "cover" }}
                unoptimized
              />
              <div style={{ padding: "1rem 1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <h4 style={{ fontWeight: 600, color: B.charcoal, margin: 0, fontSize: "1rem" }}>
                    {place.name}
                  </h4>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: place.price === "Free" || place.price.includes("Free") ? B.forest : B.red,
                      background: place.price === "Free" || place.price.includes("Free") ? "#E8F5E9" : `${B.red}10`,
                      padding: "2px 8px",
                      borderRadius: 6,
                    }}
                  >
                    {place.price}
                  </span>
                </div>
                <p style={{ fontSize: "0.75rem", color: B.blue, margin: "2px 0 6px" }}>📍 {place.area}</p>
                <p style={{ fontSize: "0.82rem", color: B.stone, margin: 0, lineHeight: 1.5 }}>
                  {place.why}
                </p>
              </div>
            </div>
          ))}
        </div>

        <AffiliateButton
          href="https://www.getyourguide.com/london-l57/?partner_id=yalla-london"
          label="Book Skip-the-Line Attraction Tickets"
        />


        {/* ─── RESTAURANTS ─── */}
        <SectionHeader
          icon="🍽️"
          title="Where to Eat in London"
          subtitle="7 top restaurants + 3 outstanding halal picks"
        />

        <p>
          London is one of the world&apos;s greatest food cities. From Michelin-starred fine dining to
          legendary street food, the variety is staggering. Here are 10 restaurants we genuinely
          recommend — no tourist traps, no chains.
        </p>

        {/* General restaurants */}
        <h3 style={{ color: B.charcoal, fontWeight: 600, fontSize: "1.15rem", marginTop: "1.5rem" }}>
          🥇 Top 7 Restaurants
        </h3>

        {[
          {
            name: "Dishoom",
            cuisine: "Bombay Café",
            area: "Covent Garden / King's Cross / Shoreditch",
            price: "££",
            desc: "Inspired by the Irani cafés of 1960s Bombay. The black daal is legendary — slow-cooked for 24 hours. Bacon naan roll at breakfast is iconic. Always has a queue but worth it. Walk-ins only at most locations.",
            booking: "https://www.dishoom.com/",
          },
          {
            name: "The Palomar",
            cuisine: "Modern Jerusalem",
            area: "Soho",
            price: "£££",
            desc: "Vibrant Jerusalem-inspired cuisine in a buzzy Soho setting. Sit at the counter bar and watch the chefs work. The polenta Jerusalem-style and kubaneh bread are outstanding. Book well ahead.",
            booking: "https://www.thepalomar.co.uk/",
          },
          {
            name: "Padella",
            cuisine: "Fresh Pasta",
            area: "Borough Market / Shoreditch",
            price: "££",
            desc: "Hand-rolled pasta made fresh in front of you. The pappardelle with 8-hour beef shin ragù is magnificent. No reservations at Borough — queue early (it moves fast). Shoreditch takes bookings.",
            booking: "https://www.padella.co/",
          },
          {
            name: "Bao",
            cuisine: "Taiwanese",
            area: "Soho / Fitzrovia",
            price: "££",
            desc: "Fluffy steamed bao buns with inventive fillings. The classic pork bao and fried chicken bao are essential. Small plates, order several. Soho location is walk-in only.",
            booking: "https://www.baolondon.com/",
          },
          {
            name: "The Wolseley",
            cuisine: "European Grand Café",
            area: "Piccadilly",
            price: "£££",
            desc: "Majestic European café-restaurant in a former car showroom. Perfect for a power breakfast or afternoon tea. Wiener schnitzel and eggs Benedict are standout. Dress smart casual.",
            booking: "https://www.thewolseley.com/",
          },
          {
            name: "Flat Iron",
            cuisine: "Steak",
            area: "Multiple locations",
            price: "££",
            desc: "One item on the menu: a perfectly cooked flat iron steak with a side salad and unlimited sauce, for just £12. Arguably the best value meal in central London. No bookings, short queue.",
            booking: "https://www.flatironsteak.co.uk/",
          },
          {
            name: "Sketch (The Gallery)",
            cuisine: "Fine Dining / Experience",
            area: "Mayfair",
            price: "££££",
            desc: "As much an art installation as a restaurant. The pink Gallery room is Instagram-famous. Afternoon tea is spectacular (£75pp). The egg-shaped toilets are an experience in themselves.",
            booking: "https://www.sketch.london/",
          },
        ].map((r, i) => (
          <div
            key={r.name}
            style={{
              display: "flex",
              gap: 16,
              padding: "1rem 0",
              borderBottom: i < 6 ? `1px solid ${B.sand}` : "none",
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: `${B.red}15`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                color: B.red,
                fontSize: "0.85rem",
                flexShrink: 0,
              }}
            >
              {i + 1}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 4 }}>
                <h4 style={{ fontWeight: 600, color: B.charcoal, margin: 0, fontSize: "1rem" }}>
                  {r.name}
                  <span style={{ fontWeight: 400, color: B.stone, fontSize: "0.85rem", marginLeft: 8 }}>
                    {r.cuisine}
                  </span>
                </h4>
                <span style={{ fontSize: "0.8rem", color: B.gold, fontWeight: 600 }}>{r.price}</span>
              </div>
              <p style={{ fontSize: "0.78rem", color: B.blue, margin: "2px 0 4px" }}>📍 {r.area}</p>
              <p style={{ fontSize: "0.85rem", color: B.stone, margin: 0, lineHeight: 1.5 }}>
                {r.desc}
              </p>
            </div>
          </div>
        ))}

        {/* Halal restaurants */}
        <h3
          style={{
            color: B.charcoal,
            fontWeight: 600,
            fontSize: "1.15rem",
            marginTop: "2rem",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span
            style={{
              background: B.forest,
              color: B.white,
              fontSize: "0.7rem",
              fontWeight: 600,
              padding: "3px 10px",
              borderRadius: 6,
              letterSpacing: 0.5,
            }}
          >
            HALAL
          </span>
          Top 3 Halal Restaurants
        </h3>

        {[
          {
            name: "Maroush",
            cuisine: "Lebanese",
            area: "Edgware Road / Knightsbridge",
            price: "£££",
            desc: "London's most established Lebanese restaurant group, serving since 1981. Fully halal. The mixed grill and fattoush are excellent. Edgware Road location has a lively atmosphere late into the night. Fresh juices are a must.",
            halal: "Fully Halal Certified",
          },
          {
            name: "EM Sherif",
            cuisine: "High-End Lebanese",
            area: "Knightsbridge",
            price: "££££",
            desc: "Glamorous Lebanese fine dining near Harrods. The signature kebbeh is extraordinary. Stunning interior design with Beirut-inspired décor. All meat is halal. Perfect for a special occasion.",
            halal: "Fully Halal",
          },
          {
            name: "The Great Chase",
            cuisine: "Modern British-Halal",
            area: "City of London (Aldgate)",
            price: "£££",
            desc: "Modern British cuisine using premium halal-sourced meats. Wagyu burgers, dry-aged steaks, and Sunday roasts — all halal. One of the only fine-dining halal options in the City. Excellent cocktails (alcohol-free options available).",
            halal: "100% Halal Menu",
          },
        ].map((r) => (
          <div
            key={r.name}
            style={{
              background: B.white,
              border: `1px solid ${B.sand}`,
              borderLeft: `4px solid ${B.forest}`,
              borderRadius: 12,
              padding: "1.25rem 1.5rem",
              marginBottom: "0.75rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 4 }}>
              <h4 style={{ fontWeight: 600, color: B.charcoal, margin: 0, fontSize: "1rem" }}>
                {r.name}
                <span style={{ fontWeight: 400, color: B.stone, fontSize: "0.85rem", marginLeft: 8 }}>
                  {r.cuisine}
                </span>
              </h4>
              <span
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  color: B.forest,
                  background: "#E8F5E9",
                  padding: "2px 8px",
                  borderRadius: 6,
                }}
              >
                {r.halal}
              </span>
            </div>
            <p style={{ fontSize: "0.78rem", color: B.blue, margin: "2px 0 4px" }}>📍 {r.area} · {r.price}</p>
            <p style={{ fontSize: "0.85rem", color: B.stone, margin: 0, lineHeight: 1.5 }}>
              {r.desc}
            </p>
          </div>
        ))}

        <Tip>
          <strong>Halal finder:</strong> The Edgware Road area (Marble Arch Tube) has the highest
          concentration of halal restaurants in central London — Lebanese, Turkish, Egyptian, and
          Moroccan cuisines within a 5-minute walk.
        </Tip>

        <AffiliateButton
          href="https://www.thefork.co.uk/city/london/all-restaurants?partner=yalla-london"
          label="Book London Restaurants with Discounts"
        />


        {/* ─── MARKETS & FOOD HALLS ─── */}
        <SectionHeader
          icon="🏪"
          title="Markets & Food Halls"
          subtitle="From historic street markets to luxury food courts"
        />

        <PhotoCard
          src={IMG.boroughMarketWide}
          alt="Borough Market food stalls with fresh produce"
          caption="Borough Market — London's 1,000-year-old food market"
          credit="Clem Onojeghuo"
        />

        {[
          {
            name: "Borough Market",
            area: "London Bridge",
            hours: "Mon–Sat 10am–5pm (full market Wed–Sat)",
            desc: "London's most famous food market. Over 100 stalls selling everything from British artisan cheese to Ethiopian injera. Must-try: Kappacasein raclette, Bread Ahead doughnuts, and Neal's Yard Dairy cheese. Go at 10am to beat crowds.",
            highlight: "Best for: Foodies and first-time visitors",
          },
          {
            name: "Mercato Mayfair",
            area: "Mayfair (inside St Mark's Church)",
            hours: "Mon–Sat 11am–11pm, Sun 11am–9pm",
            desc: "A stunning Italian-inspired food hall set inside a converted 19th-century church in Mayfair. Multiple vendors across two floors — excellent pasta, Neapolitan pizza, seafood, and cocktails. The architecture alone is worth the visit. Sit upstairs in the gallery for the best atmosphere.",
            highlight: "Best for: Upscale casual dining in a unique setting",
          },
          {
            name: "Camden Market",
            area: "Camden Town",
            hours: "Daily 10am–6pm",
            desc: "Sprawling market complex along Regent's Canal. The food section has incredible international street food — try the jerk chicken, dumplings, and freshly rolled ice cream. Also great for vintage clothing, art, and crafts.",
            highlight: "Best for: Street food and vintage shopping",
          },
          {
            name: "Maltby Street Market",
            area: "Bermondsey",
            hours: "Sat 10am–5pm, Sun 11am–4pm",
            desc: "Borough Market's cooler, less crowded little sibling. Set under Victorian railway arches, it attracts serious food lovers. Outstanding sourdough pizza at Zia Lucia, smoked meats at Bad Boy Pizza Society, and natural wines.",
            highlight: "Best for: Locals' favourite, weekend brunch",
          },
          {
            name: "Battersea Power Station",
            area: "Battersea",
            hours: "Daily 10am–9pm",
            desc: "London's newest shopping and dining destination inside the iconic Art Deco power station. Circus West Village has waterside restaurants. The turbine halls are architecturally spectacular. Take the Northern Line extension directly.",
            highlight: "Best for: Architecture lovers and riverside dining",
          },
        ].map((m) => (
          <InfoCard key={m.name} title={m.name} accent={B.red}>
            <p style={{ fontSize: "0.78rem", color: B.blue, margin: "0 0 4px" }}>
              📍 {m.area} · 🕐 {m.hours}
            </p>
            <p style={{ margin: "0 0 6px" }}>{m.desc}</p>
            <p style={{ margin: 0, fontWeight: 600, color: B.gold, fontSize: "0.85rem" }}>
              {m.highlight}
            </p>
          </InfoCard>
        ))}

        {/* ─── ELECTRICITY & GENERAL KNOWLEDGE ─── */}
        <SectionHeader
          icon="🔌"
          title="Electricity & General Knowledge"
          subtitle="Practical details that every visitor needs"
        />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, margin: "1rem 0" }}>
          {[
            {
              icon: "🔌",
              title: "Electricity",
              items: [
                "Voltage: 230V, 50Hz",
                "Plug type: G (3 rectangular pins)",
                "You WILL need an adapter if coming from EU/US/Middle East",
                "Buy a universal adapter at Heathrow Boots or any Argos (from £5)",
              ],
            },
            {
              icon: "💷",
              title: "Currency & Payments",
              items: [
                "Currency: British Pound Sterling (£ / GBP)",
                "Contactless payments accepted almost everywhere",
                "Minimum card spend is rare — even a £1 coffee takes card",
                "ATMs are free (avoid Euronet/independent ones that charge fees)",
                "Tipping: 10-15% at restaurants, round up for taxis, no tip at pubs",
              ],
            },
            {
              icon: "📱",
              title: "Connectivity",
              items: [
                "Free Wi-Fi in most cafés, restaurants, and Tube stations",
                "Buy a UK SIM at the airport (Three, EE, or Vodafone from £10)",
                "eSIM apps like Airalo work well (activate before landing)",
                "Calling: UK country code is +44, drop the leading 0",
              ],
            },
            {
              icon: "🏥",
              title: "Safety & Health",
              items: [
                "London is generally very safe for tourists",
                "Emergency: dial 999 (police, fire, ambulance)",
                "Non-emergency police: 111",
                "NHS Walk-in centres for minor health issues (free for emergencies)",
                "Pharmacies (Boots, Superdrug) sell over-the-counter medicines",
              ],
            },
            {
              icon: "🕐",
              title: "Time & Hours",
              items: [
                "Time zone: GMT (UTC+0), BST in summer (UTC+1)",
                "Most shops: 10am–6pm (7pm–8pm on Thu in West End)",
                "Sunday trading: large shops open 12pm–6pm only (UK law)",
                "Pubs: most close at 11pm (midnight Fri/Sat)",
                "Restaurants: last orders usually 10–10:30pm",
              ],
            },
            {
              icon: "🗣️",
              title: "Language & Culture",
              items: [
                "Language: English (but London is incredibly diverse — 300+ languages spoken)",
                "Queue culture is sacred — never jump a queue",
                "Personal space is valued — avoid standing too close",
                "Brits often say 'sorry' even when it's your fault. Mirror this.",
                "Small talk about weather is always welcome",
              ],
            },
          ].map((card) => (
            <div
              key={card.title}
              style={{
                background: B.white,
                border: `1px solid ${B.sand}`,
                borderRadius: 12,
                padding: "1.25rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: "1.3rem" }}>{card.icon}</span>
                <h4 style={{ fontWeight: 600, color: B.charcoal, margin: 0, fontSize: "0.95rem" }}>
                  {card.title}
                </h4>
              </div>
              <ul style={{ paddingLeft: 16, margin: 0, fontSize: "0.82rem", lineHeight: 1.8, color: B.stone }}>
                {card.items.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Tip>
          <strong>Money exchange tip:</strong> Never exchange currency at the airport — rates are
          terrible. Use your bank&apos;s contactless card (Revolut, Wise, and Monzo offer the best
          exchange rates), or withdraw from a Barclays/HSBC ATM in the city.
        </Tip>

        {/* ─── FOOTER / CTA ─── */}
        <div
          style={{
            background: `linear-gradient(135deg, ${B.charcoal} 0%, ${B.redDark} 100%)`,
            color: B.white,
            borderRadius: 16,
            padding: "2.5rem 2rem",
            textAlign: "center",
            marginTop: "3rem",
          }}
        >
          <div style={{ display: "flex", gap: 3, marginBottom: "1.5rem", justifyContent: "center" }}>
            <div style={{ width: 40, height: 3, background: B.red, borderRadius: 2 }} />
            <div style={{ width: 40, height: 3, background: B.gold, borderRadius: 2 }} />
            <div style={{ width: 40, height: 3, background: B.blue, borderRadius: 2 }} />
          </div>

          <h2
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              marginBottom: "0.5rem",
              fontFamily: "var(--font-display), sans-serif",
            }}
          >
            Enjoyed this guide?
          </h2>
          <p style={{ color: `${B.white}cc`, marginBottom: "1.5rem", fontSize: "0.95rem" }}>
            Explore more on Yalla London — in-depth articles, hotel reviews, and insider tips for
            your perfect London trip.
          </p>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              href="/"
              style={{
                display: "inline-block",
                padding: "12px 28px",
                background: B.gold,
                color: B.white,
                fontWeight: 600,
                borderRadius: 8,
                textDecoration: "none",
                fontSize: "0.9rem",
              }}
            >
              Visit Yalla London →
            </Link>
            <Link
              href="/blog"
              style={{
                display: "inline-block",
                padding: "12px 28px",
                border: `1.5px solid ${B.gold}`,
                color: B.gold,
                fontWeight: 600,
                borderRadius: 8,
                textDecoration: "none",
                fontSize: "0.9rem",
              }}
            >
              Read Our Blog
            </Link>
          </div>

          <p style={{ fontSize: "0.7rem", color: `${B.white}66`, marginTop: "2rem" }}>
            © {new Date().getFullYear()} Yalla London · yalla-london.com · A Zenitha.Luxury Publication
          </p>
          <p style={{ fontSize: "0.65rem", color: `${B.white}44`, marginTop: "0.5rem" }}>
            This guide contains affiliate links. If you book through our links, we earn a small
            commission at no extra cost to you. This helps us keep creating free travel content.
          </p>
        </div>
      </div>
    </div>
  );
}
