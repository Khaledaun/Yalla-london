"use client";

import React from "react";
import Image from "next/image";

/**
 * Zenitha Yachts — Stripe-Inspired Mock Homepage
 * Navy + aegean blue + gold, blue-tinted shadows, maritime depth, weight-300 elegance
 */

const C = {
  navy: "#0A1628",
  midnight: "#1B2A4A",
  aegean: "#2E5A88",
  ocean: "#4A90B8",
  shallow: "#7CB8D4",
  gold: "#C9A96E",
  goldDark: "#8B6914",
  champagne: "#E8D5B5",
  sand: "#F5EDE0",
  pearl: "#FAFAF7",
  white: "#FFFFFF",
  storm: "#DC2626",
};

const shadow = "0 13px 27px -5px rgba(30,50,93,0.20), 0 8px 16px -8px rgba(0,0,0,0.15)";

export function ZenithaYachtsMock() {
  return (
    <div style={{ background: C.pearl, color: C.navy, fontFamily: "'DM Sans', 'Source Sans 3', 'Segoe UI', sans-serif" }}>

      {/* ═══ NAV — clean, aegean accent ═══ */}
      <nav style={{ background: C.white, borderBottom: `1px solid ${C.sand}`, position: "sticky" as const, top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 20, fontWeight: 600, color: C.navy, letterSpacing: "-0.02em" }}>Zenitha</span>
            <span style={{ fontSize: 20, fontWeight: 300, color: C.aegean }}>Yachts</span>
          </div>
          <div style={{ display: "flex", gap: 28, alignItems: "center" }}>
            {["Fleet", "Destinations", "Itineraries", "Charter"].map(item => (
              <span key={item} style={{ fontSize: 14, color: C.midnight, cursor: "pointer" }}>{item}</span>
            ))}
            <button style={{ padding: "8px 20px", background: C.aegean, color: C.white, fontSize: 13, fontWeight: 500, borderRadius: 6, border: "none", cursor: "pointer" }}>Enquire</button>
          </div>
        </div>
      </nav>

      {/* ═══ HERO — split: text left with blue-tinted depth, image right ═══ */}
      <section style={{ background: `linear-gradient(135deg, ${C.navy} 0%, ${C.midnight} 100%)` }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "64px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ width: 40, height: 2, background: C.gold }} />
              <span style={{ fontSize: 12, letterSpacing: "0.2em", color: C.gold, textTransform: "uppercase" as const, fontWeight: 500 }}>Mediterranean Charters</span>
            </div>
            <h1 style={{ fontSize: 52, fontWeight: 300, lineHeight: 1.12, color: C.white, marginBottom: 20 }}>
              Your Voyage,<br /><span style={{ color: C.shallow }}>Our Expertise</span>
            </h1>
            <p style={{ fontSize: 17, color: C.ocean, lineHeight: 1.7, fontWeight: 300, maxWidth: 440, marginBottom: 32 }}>
              Hand-selected superyachts and motor sailors across the Greek Islands, Turkish Riviera, and Cote d&apos;Azur. White-glove service from first enquiry to final sunset.
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <button style={{ padding: "14px 32px", background: C.gold, color: C.navy, fontSize: 14, fontWeight: 600, borderRadius: 6, border: "none", cursor: "pointer" }}>Browse Fleet</button>
              <button style={{ padding: "14px 32px", background: "transparent", color: C.white, fontSize: 14, fontWeight: 400, borderRadius: 6, border: `1px solid rgba(255,255,255,0.2)`, cursor: "pointer" }}>Plan Itinerary</button>
            </div>
          </div>
          <div style={{ position: "relative", aspectRatio: "4/3", borderRadius: 8, overflow: "hidden", boxShadow: "0 25px 50px -12px rgba(10,22,40,0.5)" }}>
            <Image src="https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=800&q=90" alt="Luxury yacht" fill style={{ objectFit: "cover" }} priority />
          </div>
        </div>
      </section>

      {/* ═══ FLEET — cards with blue-tinted shadows ═══ */}
      <section style={{ padding: "72px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 40 }}>
            <div style={{ width: 40, height: 2, background: C.gold }} />
            <h2 style={{ fontSize: 28, fontWeight: 400, color: C.navy }}>Featured Fleet</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            {[
              { name: "Odyssey", type: "Motor Yacht", length: "42m", guests: 10, price: "From \u20AC35,000/week", img: "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=500&q=80" },
              { name: "Aegean Wind", type: "Sailing Yacht", length: "28m", guests: 8, price: "From \u20AC18,000/week", img: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=500&q=80" },
              { name: "Poseidon", type: "Superyacht", length: "56m", guests: 12, price: "From \u20AC85,000/week", img: "https://images.unsplash.com/photo-1605281317010-fe5ffe798166?w=500&q=80" },
            ].map((yacht) => (
              <div key={yacht.name} style={{ background: C.white, borderRadius: 8, overflow: "hidden", boxShadow: shadow, cursor: "pointer" }}>
                <div style={{ position: "relative", height: 220, overflow: "hidden" }}>
                  <Image src={yacht.img} alt={yacht.name} fill style={{ objectFit: "cover" }} />
                  <div style={{ position: "absolute", top: 12, left: 12, padding: "4px 10px", background: C.navy, borderRadius: 4 }}>
                    <span style={{ fontSize: 10, color: C.gold, letterSpacing: "0.1em", textTransform: "uppercase" as const, fontWeight: 600 }}>{yacht.type}</span>
                  </div>
                </div>
                <div style={{ padding: 20 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 600, color: C.navy }}>{yacht.name}</h3>
                  <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 13, color: C.aegean }}>
                    <span>{yacht.length}</span>
                    <span>&middot;</span>
                    <span>{yacht.guests} guests</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.sand}` }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: C.navy }}>{yacht.price}</span>
                    <span style={{ fontSize: 12, color: C.aegean, fontWeight: 500, cursor: "pointer" }}>View Details &rarr;</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ DESTINATIONS — horizontal scroll cards ═══ */}
      <section style={{ background: C.navy, padding: "72px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 40 }}>
            <div style={{ width: 40, height: 2, background: C.gold }} />
            <h2 style={{ fontSize: 28, fontWeight: 400, color: C.white }}>Destinations</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
            {[
              { name: "Greek Islands", yachts: 24, img: "https://images.unsplash.com/photo-1533105079780-92b9be482077?w=400&q=80" },
              { name: "Turkish Riviera", yachts: 12, img: "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=400&q=80" },
              { name: "Cote d'Azur", yachts: 18, img: "https://images.unsplash.com/photo-1534258936925-c58bed479fcb?w=400&q=80" },
              { name: "Amalfi Coast", yachts: 8, img: "https://images.unsplash.com/photo-1534113414509-0eec2bfb493f?w=400&q=80" },
            ].map((dest) => (
              <div key={dest.name} style={{ position: "relative", aspectRatio: "3/4", borderRadius: 6, overflow: "hidden", cursor: "pointer" }}>
                <Image src={dest.img} alt={dest.name} fill style={{ objectFit: "cover" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(10,22,40,0.7) 0%, transparent 50%)" }} />
                <div style={{ position: "absolute", bottom: 0, left: 0, padding: 20 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: C.white }}>{dest.name}</h3>
                  <p style={{ fontSize: 12, color: C.shallow, marginTop: 4 }}>{dest.yachts} yachts available</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA — gold accent ═══ */}
      <section style={{ padding: "72px 24px", textAlign: "center" as const }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div style={{ width: 48, height: 2, background: C.gold, margin: "0 auto 24px" }} />
          <h2 style={{ fontSize: 32, fontWeight: 300, color: C.navy, lineHeight: 1.3 }}>Ready to Set Sail?</h2>
          <p style={{ fontSize: 15, color: C.aegean, lineHeight: 1.7, marginTop: 12, fontWeight: 300 }}>Our charter specialists will design your perfect Mediterranean voyage — from vessel selection to daily itinerary.</p>
          <button style={{ marginTop: 28, padding: "14px 36px", background: C.gold, color: C.navy, fontSize: 14, fontWeight: 600, borderRadius: 6, border: "none", cursor: "pointer" }}>Start Your Charter Enquiry</button>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ background: C.navy, borderTop: `1px solid ${C.midnight}`, padding: "32px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: C.white }}>Zenitha</span>
            <span style={{ fontSize: 16, fontWeight: 300, color: C.shallow }}>Yachts</span>
          </div>
          <span style={{ fontSize: 11, color: C.aegean }}>zenithayachts.com &middot; Zenitha.Luxury LLC</span>
        </div>
      </footer>
    </div>
  );
}
