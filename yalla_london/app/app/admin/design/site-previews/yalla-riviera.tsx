"use client";

import React from "react";
import Image from "next/image";

/**
 * Yalla Riviera — Superhuman-Inspired Mock Homepage
 * Navy + lavender + champagne gold, luxury envelope, French Mediterranean elegance
 */

const C = {
  navy: "#1E3A5F",
  deepNavy: "#0F2340",
  lavender: "#B8A5D4",
  lavenderLight: "#E8E0F4",
  lavenderGlow: "#cbb7fb",
  champagne: "#D4AF37",
  champagneSoft: "#E9DCC0",
  cream: "#FAF8F5",
  warmWhite: "#F7F4EF",
  white: "#FFFFFF",
  text: "#1A1A2E",
  muted: "#6B6B80",
  border: "#E8E4DE",
};

export function YallaRivieraMock() {
  return (
    <div style={{ background: C.cream, color: C.text, fontFamily: "'Source Serif 4', 'Georgia', serif" }}>

      {/* ═══ NAV — champagne elegance, centered logo ═══ */}
      <nav style={{ background: C.white, borderBottom: `1px solid ${C.border}` }}>
        {/* Tri-color bar — navy, champagne, lavender */}
        <div style={{ display: "flex", height: 3 }}>
          <div style={{ flex: 1, background: C.navy }} />
          <div style={{ flex: 1, background: C.champagne }} />
          <div style={{ flex: 1, background: C.lavender }} />
        </div>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: C.text, letterSpacing: "-0.02em" }}>Yalla</span>
            <span style={{ fontSize: 22, fontWeight: 400, color: C.champagne }}>Riviera</span>
          </div>
          <div style={{ display: "flex", gap: 28 }}>
            {["Explore", "Hotels", "Dining", "Yachts", "Events"].map(item => (
              <span key={item} style={{ fontSize: 14, fontFamily: "'DM Sans', sans-serif", color: C.muted, cursor: "pointer" }}>{item}</span>
            ))}
          </div>
        </div>
      </nav>

      {/* ═══ HERO — luxury envelope: dramatic navy gradient fading to white ═══ */}
      <section style={{ background: `linear-gradient(180deg, ${C.deepNavy} 0%, ${C.deepNavy} 50%, ${C.cream} 100%)`, padding: "80px 24px 60px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center" }}>
          <div>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 500, letterSpacing: "0.2em", color: C.champagne, textTransform: "uppercase" as const }}>
              French Riviera &middot; Cote d&apos;Azur
            </span>
            <h1 style={{ fontSize: 52, fontWeight: 700, lineHeight: 1.12, color: C.white, marginTop: 16, letterSpacing: "-0.02em" }}>
              Mediterranean<br />Elegance,<br /><span style={{ color: C.lavenderGlow }}>Redefined</span>
            </h1>
            <div style={{ width: 48, height: 2, background: C.champagne, marginTop: 24 }} />
            <p style={{ fontSize: 17, color: "rgba(255,255,255,0.55)", lineHeight: 1.7, marginTop: 20, maxWidth: 420, fontWeight: 400 }}>
              Saint-Tropez sunsets, Michelin-starred terraces, and yacht-filled harbours. Your curated guide to the world&apos;s most glamorous coastline.
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
              <button style={{ padding: "14px 32px", background: C.champagne, color: C.deepNavy, fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", borderRadius: 8, border: "none", cursor: "pointer" }}>
                Start Exploring
              </button>
              <button style={{ padding: "14px 32px", background: "transparent", color: C.white, fontSize: 13, fontWeight: 400, fontFamily: "'DM Sans', sans-serif", borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", cursor: "pointer" }}>
                View Hotels
              </button>
            </div>
          </div>
          <div style={{ position: "relative", aspectRatio: "4/5", borderRadius: 16, overflow: "hidden", boxShadow: "0 25px 50px -12px rgba(15,35,64,0.4)" }}>
            <Image src="https://images.unsplash.com/photo-1534258936925-c58bed479fcb?w=800&q=90" alt="French Riviera coastline" fill style={{ objectFit: "cover" }} priority />
          </div>
        </div>
      </section>

      {/* ═══ DESTINATIONS — immaculate white cards, lavender hover ═══ */}
      <section style={{ padding: "72px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 40 }}>
            <div style={{ width: 40, height: 2, background: C.champagne }} />
            <h2 style={{ fontSize: 28, fontWeight: 600, color: C.text }}>Destinations</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {[
              { name: "Saint-Tropez", desc: "Glamour capital of the Riviera", img: "https://images.unsplash.com/photo-1534258936925-c58bed479fcb?w=500&q=80" },
              { name: "Nice", desc: "Art, culture, and Promenade des Anglais", img: "https://images.unsplash.com/photo-1491166617655-0723a0999cfc?w=500&q=80" },
              { name: "Monaco", desc: "Superyachts, casinos, and Formula 1", img: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&q=80" },
            ].map((dest) => (
              <div key={dest.name} style={{ background: C.white, borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 8px rgba(30,58,95,0.06)", border: `1px solid ${C.border}`, cursor: "pointer" }}>
                <div style={{ position: "relative", height: 220, overflow: "hidden" }}>
                  <Image src={dest.img} alt={dest.name} fill style={{ objectFit: "cover" }} />
                </div>
                <div style={{ padding: 20 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 600, color: C.text }}>{dest.name}</h3>
                  <p style={{ fontSize: 14, color: C.muted, marginTop: 4, fontFamily: "'DM Sans', sans-serif" }}>{dest.desc}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16 }}>
                    <span style={{ fontSize: 12, color: C.champagne, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>Explore &rarr;</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ EXPERIENCES — lavender gradient accent ═══ */}
      <section style={{ background: C.warmWhite, padding: "72px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 40 }}>
            <div style={{ width: 40, height: 2, background: C.lavender }} />
            <h2 style={{ fontSize: 28, fontWeight: 600, color: C.text }}>Curated Experiences</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
            {[
              { name: "Yacht Day Charter", price: "From \u20AC2,500", img: "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=400&q=80" },
              { name: "Michelin Dining", price: "From \u20AC250/pp", img: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&q=80" },
              { name: "Vineyard Tours", price: "From \u20AC180", img: "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=400&q=80" },
              { name: "Helicopter Transfer", price: "From \u20AC1,200", img: "https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=400&q=80" },
            ].map((exp) => (
              <div key={exp.name} style={{ position: "relative", aspectRatio: "3/4", borderRadius: 12, overflow: "hidden", cursor: "pointer" }}>
                <Image src={exp.img} alt={exp.name} fill style={{ objectFit: "cover" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(15,35,64,0.7) 0%, transparent 50%)" }} />
                <div style={{ position: "absolute", bottom: 0, left: 0, padding: 16 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: C.white }}>{exp.name}</h3>
                  <p style={{ fontSize: 12, color: C.champagneSoft, marginTop: 4, fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>{exp.price}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ NEWSLETTER — deep navy with lavender glow ═══ */}
      <section style={{ background: C.deepNavy, padding: "72px 24px" }}>
        <div style={{ maxWidth: 560, margin: "0 auto", textAlign: "center" as const }}>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, letterSpacing: "0.2em", color: C.champagne, textTransform: "uppercase" as const }}>La Lettre Riviera</span>
          <h2 style={{ fontSize: 28, fontWeight: 600, color: C.white, marginTop: 12, lineHeight: 1.3 }}>Weekly Riviera Intelligence</h2>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", marginTop: 8, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6 }}>
            The finest hotel openings, restaurant reservations, and yacht charter deals — every Friday.
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 24, maxWidth: 400, margin: "24px auto 0" }}>
            <input
              type="email"
              placeholder="Enter your email"
              style={{ flex: 1, padding: "12px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", color: C.white, fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: "none" }}
            />
            <button style={{ padding: "12px 24px", background: C.champagne, color: C.deepNavy, fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", borderRadius: 8, border: "none", cursor: "pointer", whiteSpace: "nowrap" as const }}>
              Subscribe
            </button>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ background: C.white, borderTop: `1px solid ${C.border}`, padding: "32px 24px" }}>
        <div style={{ display: "flex", height: 3, marginBottom: 24 }}>
          <div style={{ flex: 1, background: C.navy }} />
          <div style={{ flex: 1, background: C.champagne }} />
          <div style={{ flex: 1, background: C.lavender }} />
        </div>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Yalla</span>
            <span style={{ fontSize: 16, fontWeight: 400, color: C.champagne }}>Riviera</span>
          </div>
          <span style={{ fontSize: 11, color: C.muted, fontFamily: "'DM Sans', sans-serif" }}>yallariviera.com &middot; Zenitha.Luxury LLC</span>
        </div>
      </footer>
    </div>
  );
}
