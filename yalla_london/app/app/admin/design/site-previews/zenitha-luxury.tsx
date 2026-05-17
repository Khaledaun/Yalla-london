"use client";

import React from "react";
import Image from "next/image";

/**
 * Zenitha Luxury — BMW-Inspired Mock Homepage
 * Obsidian + gold, zero border-radius, weight-300 uppercase, showroom lighting
 */

const C = {
  obsidian: "#0A0A0A",
  midnight: "#141414",
  charcoal: "#2A2A2A",
  smoke: "#4A4A4A",
  mist: "#8A8A8A",
  platinum: "#D6D0C4",
  cream: "#F5F0E8",
  ivory: "#FDFCF9",
  gold: "#C4A96C",
  goldLight: "#E2CBA0",
};

function GoldLine({ width = 60 }: { width?: number }) {
  return <div style={{ width, height: 1, background: C.gold }} />;
}

export function ZenithaLuxuryMock() {
  return (
    <div style={{ background: C.ivory, color: C.obsidian, fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>

      {/* ═══ NAV — zero radius, uppercase, angular ═══ */}
      <nav style={{ background: C.obsidian, borderBottom: `1px solid ${C.charcoal}` }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontSize: 22, fontWeight: 300, letterSpacing: "0.2em", color: C.ivory, textTransform: "uppercase" as const }}>Zenitha</span>
            <span style={{ fontSize: 10, letterSpacing: "0.15em", color: C.gold, textTransform: "uppercase" as const, borderLeft: `1px solid ${C.charcoal}`, paddingLeft: 16 }}>Luxury</span>
          </div>
          <div style={{ display: "flex", gap: 32 }}>
            {["Portfolio", "Yachts", "Travel", "About"].map(item => (
              <span key={item} style={{ fontSize: 11, letterSpacing: "0.15em", color: C.mist, textTransform: "uppercase" as const, cursor: "pointer" }}>{item}</span>
            ))}
          </div>
        </div>
      </nav>

      {/* ═══ HERO — full-bleed cinematic, weight-300 title ═══ */}
      <section style={{ position: "relative", height: "85vh", minHeight: 600, overflow: "hidden", background: C.obsidian }}>
        <Image src="https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=1600&q=90" alt="Luxury yacht on Mediterranean" fill style={{ objectFit: "cover", opacity: 0.5 }} priority />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(10,10,10,0.85) 0%, rgba(10,10,10,0.3) 60%, transparent 100%)" }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, padding: "80px 60px", maxWidth: 700, zIndex: 10 }}>
          <GoldLine width={80} />
          <h1 style={{ fontSize: 64, fontWeight: 300, lineHeight: 1.1, color: C.ivory, letterSpacing: "-0.02em", marginTop: 24, textTransform: "uppercase" as const }}>
            Curated Luxury<br />Across the World
          </h1>
          <p style={{ fontSize: 16, fontWeight: 300, color: C.mist, lineHeight: 1.7, marginTop: 20, maxWidth: 480 }}>
            Six destinations. One standard. Zenitha.Luxury curates the finest travel experiences for the discerning traveller.
          </p>
          <button style={{ marginTop: 32, padding: "14px 40px", background: "transparent", border: `1px solid ${C.gold}`, color: C.gold, fontSize: 11, fontWeight: 500, letterSpacing: "0.2em", textTransform: "uppercase" as const, cursor: "pointer" }}>
            Explore Portfolio
          </button>
        </div>
      </section>

      {/* ═══ BRANDS — zero radius cards, showroom style ═══ */}
      <section style={{ background: C.ivory, padding: "80px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 48 }}>
            <GoldLine width={48} />
            <span style={{ fontSize: 11, letterSpacing: "0.25em", color: C.smoke, textTransform: "uppercase" as const, fontWeight: 500 }}>Our Portfolio</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2 }}>
            {[
              { name: "Yalla London", desc: "Luxury London travel", img: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&q=80", color: "#C8322B" },
              { name: "Zenitha Yachts", desc: "Mediterranean charters", img: "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=600&q=80", color: "#2E5A88" },
              { name: "Yalla Riviera", desc: "Cote d'Azur elegance", img: "https://images.unsplash.com/photo-1534258936925-c58bed479fcb?w=600&q=80", color: "#D4AF37" },
            ].map((brand) => (
              <div key={brand.name} style={{ position: "relative", aspectRatio: "4/5", overflow: "hidden", cursor: "pointer" }}>
                <Image src={brand.img} alt={brand.name} fill style={{ objectFit: "cover", transition: "transform 0.6s ease" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(10,10,10,0.8) 0%, transparent 50%)" }} />
                <div style={{ position: "absolute", bottom: 0, left: 0, padding: 32 }}>
                  <div style={{ width: 24, height: 2, background: brand.color, marginBottom: 12 }} />
                  <h3 style={{ fontSize: 20, fontWeight: 400, color: C.ivory, letterSpacing: "0.05em" }}>{brand.name}</h3>
                  <p style={{ fontSize: 12, color: C.mist, letterSpacing: "0.1em", textTransform: "uppercase" as const, marginTop: 4 }}>{brand.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2, marginTop: 2 }}>
            {[
              { name: "Arabaldives", desc: "Maldives paradise", img: "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=600&q=80", color: "#0891B2" },
              { name: "Yalla Istanbul", desc: "Ottoman grandeur", img: "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=600&q=80", color: "#DC2626" },
              { name: "Yalla Thailand", desc: "Tropical luxury", img: "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=600&q=80", color: "#059669" },
            ].map((brand) => (
              <div key={brand.name} style={{ position: "relative", aspectRatio: "4/5", overflow: "hidden", cursor: "pointer" }}>
                <Image src={brand.img} alt={brand.name} fill style={{ objectFit: "cover" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(10,10,10,0.8) 0%, transparent 50%)" }} />
                <div style={{ position: "absolute", bottom: 0, left: 0, padding: 32 }}>
                  <div style={{ width: 24, height: 2, background: brand.color, marginBottom: 12 }} />
                  <h3 style={{ fontSize: 20, fontWeight: 400, color: C.ivory, letterSpacing: "0.05em" }}>{brand.name}</h3>
                  <p style={{ fontSize: 12, color: C.mist, letterSpacing: "0.1em", textTransform: "uppercase" as const, marginTop: 4 }}>{brand.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ STATEMENT — centered, angular, gold accent ═══ */}
      <section style={{ background: C.obsidian, padding: "96px 24px", textAlign: "center" as const }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <GoldLine width={48} />
          <h2 style={{ fontSize: 36, fontWeight: 300, color: C.ivory, lineHeight: 1.3, marginTop: 24, letterSpacing: "-0.01em" }}>
            One Standard.<br />Six Destinations.
          </h2>
          <p style={{ fontSize: 15, color: C.mist, lineHeight: 1.8, marginTop: 20, fontWeight: 300 }}>
            Every Zenitha experience is curated to the same exacting standard — whether you are chartering a yacht on the Aegean, dining in Mayfair, or discovering a hidden beach in the Maldives.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 40 }}>
            {["Curated", "Authentic", "Effortless"].map(word => (
              <div key={word} style={{ padding: "10px 28px", border: `1px solid ${C.charcoal}`, fontSize: 11, letterSpacing: "0.2em", color: C.mist, textTransform: "uppercase" as const }}>{word}</div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FOOTER — minimal, gold accents ═══ */}
      <footer style={{ background: C.obsidian, borderTop: `1px solid ${C.charcoal}`, padding: "40px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 14, fontWeight: 300, letterSpacing: "0.15em", color: C.mist, textTransform: "uppercase" as const }}>Zenitha.Luxury</span>
          <span style={{ fontSize: 11, color: C.smoke }}>Wilmington, Delaware &middot; zenitha.luxury</span>
        </div>
      </footer>
    </div>
  );
}
