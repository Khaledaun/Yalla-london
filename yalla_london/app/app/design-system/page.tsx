/**
 * Design System — Living Style Guide
 * Dev-only route: /design-system
 *
 * Visualizes all design tokens, components, and brand elements
 * defined in DESIGN.md for quick reference and validation.
 */

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Design System — Yalla London",
  robots: { index: false, follow: false },
};

/* ── Color Swatches ── */

const YL_COLORS = [
  { name: "London Red", var: "--yl-red", hex: "#C8322B", tw: "yl-red / london-600" },
  { name: "Gold", var: "--yl-gold", hex: "#C49A2A", tw: "yl-gold / yalla-gold-500" },
  { name: "Stamp Blue", var: "--yl-blue", hex: "#4A7BA8", tw: "yl-blue / stamp" },
  { name: "Charcoal", var: "--yl-charcoal", hex: "#1C1917", tw: "yl-charcoal / charcoal" },
  { name: "Parchment", var: "--yl-parchment", hex: "#EDE9E1", tw: "yl-parchment" },
  { name: "Cream", var: "--yl-cream", hex: "#F5F0E8", tw: "yl-cream" },
  { name: "Navy", var: "--yl-navy", hex: "#1A2332", tw: "yl-navy" },
  { name: "Dark Navy", var: "--yl-dark-navy", hex: "#0F1621", tw: "yl-dark-navy" },
];

const LONDON_SCALE = [
  { shade: "50", hex: "#fef2f2" },
  { shade: "100", hex: "#fde3e3" },
  { shade: "200", hex: "#fccbcb" },
  { shade: "300", hex: "#f9a3a3" },
  { shade: "400", hex: "#f06b6b" },
  { shade: "500", hex: "#e34040" },
  { shade: "600", hex: "#C8322B" },
  { shade: "700", hex: "#a82520" },
  { shade: "800", hex: "#8b1f1c" },
  { shade: "900", hex: "#751d1b" },
  { shade: "950", hex: "#400b0a" },
];

const GOLD_SCALE = [
  { shade: "50", hex: "#fbf8eb" },
  { shade: "100", hex: "#f5eecb" },
  { shade: "200", hex: "#ede09a" },
  { shade: "300", hex: "#e2cc60" },
  { shade: "400", hex: "#d9b938" },
  { shade: "500", hex: "#C49A2A" },
  { shade: "600", hex: "#a87a22" },
  { shade: "700", hex: "#8a5c1e" },
  { shade: "800", hex: "#724a20" },
  { shade: "900", hex: "#5f3e20" },
  { shade: "950", hex: "#371f0e" },
];

const ADMIN_COLORS = [
  { name: "Admin BG", var: "--admin-bg", hex: "#FAF8F4" },
  { name: "Card BG", var: "--admin-card-bg", hex: "#FFFFFF" },
  { name: "Border", var: "--admin-border", hex: "rgba(214,208,196,0.5)" },
  { name: "Text", var: "--admin-text", hex: "#1C1917" },
  { name: "Muted", var: "--admin-muted", hex: "#78716C" },
  { name: "Red", var: "--admin-red", hex: "#C8322B" },
  { name: "Gold", var: "--admin-gold", hex: "#C49A2A" },
  { name: "Blue", var: "--admin-blue", hex: "#3B7EA1" },
  { name: "Green", var: "--admin-green", hex: "#2D5A3D" },
];

const GRAYS = [
  { name: "Gray 100", hex: "#F7F5F2", tw: "yl-gray-100" },
  { name: "Gray 200", hex: "#E8E3DB", tw: "yl-gray-200" },
  { name: "Gray 300", hex: "#D4CFC5", tw: "yl-gray-300" },
  { name: "Gray 400", hex: "#A09A8E", tw: "yl-gray-400" },
  { name: "Gray 500", hex: "#7A746A", tw: "yl-gray-500" },
  { name: "Gray 600", hex: "#5A5449", tw: "yl-gray-600" },
];

/* ── Spacing Scale ── */

const SPACING = [
  { name: "xs", value: "4px", var: "--yl-space-xs" },
  { name: "sm", value: "8px", var: "--yl-space-sm" },
  { name: "md", value: "16px", var: "--yl-space-md" },
  { name: "lg", value: "24px", var: "--yl-space-lg" },
  { name: "xl", value: "32px", var: "--yl-space-xl" },
  { name: "2xl", value: "48px", var: "--yl-space-2xl" },
  { name: "3xl", value: "64px", var: "--yl-space-3xl" },
];

/* ── Shadow Scale ── */

const SHADOWS = [
  { name: "sm", css: "0 1px 3px rgba(28,25,23,0.06)", usage: "Default card rest" },
  { name: "md", css: "0 4px 12px rgba(28,25,23,0.08)", usage: "Card hover" },
  { name: "luxury", css: "0 4px 20px rgba(28,25,23,0.08)", usage: "Featured card" },
  { name: "elegant", css: "0 8px 40px rgba(28,25,23,0.12)", usage: "Modal" },
  { name: "xl", css: "0 20px 60px rgba(28,25,23,0.16)", usage: "Hero overlay" },
];

/* ── Typography Scale ── */

const TYPE_SCALE = [
  { name: "Caption", size: "12px", weight: "400", font: "body", sample: "Caption text" },
  { name: "Small", size: "14px", weight: "400", font: "body", sample: "Small body text" },
  { name: "Body", size: "16px", weight: "400", font: "body", sample: "Default body text for paragraphs" },
  { name: "Large", size: "18px", weight: "400", font: "body", sample: "Large body text" },
  { name: "H6", size: "20px", weight: "600", font: "display", sample: "Heading Six" },
  { name: "H5", size: "24px", weight: "600", font: "display", sample: "Heading Five" },
  { name: "H4", size: "30px", weight: "700", font: "display", sample: "Heading Four" },
  { name: "H3", size: "36px", weight: "700", font: "display", sample: "Heading Three" },
  { name: "H2", size: "48px", weight: "700", font: "display", sample: "Heading Two" },
  { name: "H1", size: "60px", weight: "800", font: "display", sample: "Heading One" },
];

/* ── Status Badges ── */

const STATUSES = [
  { name: "active", bg: "#dcfce7", text: "#166534" },
  { name: "pending", bg: "#fef9c3", text: "#854d0e" },
  { name: "error", bg: "#fecaca", text: "#991b1b" },
  { name: "warning", bg: "#ffedd5", text: "#9a3412" },
  { name: "info", bg: "#dbeafe", text: "#1e40af" },
  { name: "success", bg: "#dcfce7", text: "#166534" },
  { name: "draft", bg: "#e5e7eb", text: "#374151" },
  { name: "published", bg: "#dcfce7", text: "#166534" },
  { name: "scheduled", bg: "#e0e7ff", text: "#3730a3" },
  { name: "rejected", bg: "#fecaca", text: "#991b1b" },
  { name: "processing", bg: "#dbeafe", text: "#1e40af" },
  { name: "completed", bg: "#dcfce7", text: "#166534" },
  { name: "failed", bg: "#fecaca", text: "#991b1b" },
  { name: "paused", bg: "#e5e7eb", text: "#374151" },
  { name: "archived", bg: "#f3f4f6", text: "#6b7280" },
];

/* ── Radii ── */

const RADII = [
  { name: "sm", value: "6px", var: "--yl-radius-sm" },
  { name: "md", value: "10px", var: "--yl-radius-md" },
  { name: "lg", value: "14px", var: "--yl-radius-lg" },
  { name: "xl", value: "20px", var: "--yl-radius-xl" },
  { name: "full", value: "9999px", var: "--yl-radius-full" },
];

/* ── Page Component ── */

function SectionTitle({ children, id }: { children: React.ReactNode; id: string }) {
  return (
    <h2 id={id} className="text-2xl font-bold font-display mt-16 mb-6 text-[var(--yl-charcoal)] border-b border-[var(--yl-gray-300)] pb-3">
      {children}
    </h2>
  );
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-lg font-semibold font-display mt-8 mb-4 text-[var(--yl-charcoal)]">{children}</h3>;
}

function ColorSwatch({ name, hex, label }: { name: string; hex: string; label?: string }) {
  const isLight = hex.startsWith("#F") || hex.startsWith("#f") || hex.startsWith("#E") || hex.startsWith("#e") || hex.startsWith("#D") || hex.startsWith("#d") || hex === "#FFFFFF";
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="w-16 h-16 rounded-lg border border-[var(--yl-gray-300)]"
        style={{ backgroundColor: hex }}
      />
      <span className={`text-xs font-mono ${isLight ? "text-[var(--yl-gray-600)]" : "text-[var(--yl-gray-500)]"}`}>
        {label || name}
      </span>
      <span className="text-[10px] font-mono text-[var(--yl-gray-400)]">{hex}</span>
    </div>
  );
}

export default function DesignSystemPage() {
  return (
    <div className="min-h-screen bg-[var(--admin-bg,#FAF8F4)] text-[var(--yl-charcoal)]">
      {/* Tri-color bar */}
      <div className="h-[3px] w-full flex">
        <div className="flex-1 bg-[var(--yl-red,#C8322B)]" />
        <div className="flex-1 bg-[var(--yl-gold,#C49A2A)]" />
        <div className="flex-1 bg-[var(--yl-blue,#4A7BA8)]" />
      </div>

      <div className="max-w-[1200px] mx-auto px-6 py-12">
        {/* Header */}
        <header className="mb-12">
          <h1 className="text-4xl font-bold font-display mb-2">Yalla London Design System</h1>
          <p className="text-lg text-[var(--yl-gray-500)] font-body">
            Living style guide &mdash; all tokens, components, and brand elements from DESIGN.md
          </p>
          <p className="text-sm text-[var(--yl-gray-400)] mt-2 font-mono">
            Dev-only route &bull; Not indexed &bull; Reference: /DESIGN.md
          </p>
        </header>

        {/* Table of Contents */}
        <nav className="bg-white rounded-xl border border-[rgba(214,208,196,0.5)] p-6 mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--yl-gray-500)] mb-3">Contents</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            {["Colors", "Typography", "Spacing", "Shadows", "Radii", "Buttons", "Badges", "Cards"].map((s) => (
              <a key={s} href={`#${s.toLowerCase()}`} className="text-[var(--yl-blue)] hover:underline">
                {s}
              </a>
            ))}
          </div>
        </nav>

        {/* ════════ COLORS ════════ */}
        <SectionTitle id="colors">1. Colors</SectionTitle>

        <SubTitle>Yalla London Brand Palette</SubTitle>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-4 mb-8">
          {YL_COLORS.map((c) => (
            <ColorSwatch key={c.var} name={c.name} hex={c.hex} label={c.tw} />
          ))}
        </div>

        <SubTitle>London Red Scale (london-*)</SubTitle>
        <div className="grid grid-cols-6 md:grid-cols-11 gap-3 mb-8">
          {LONDON_SCALE.map((c) => (
            <ColorSwatch key={c.shade} name={c.shade} hex={c.hex} />
          ))}
        </div>

        <SubTitle>Yalla Gold Scale (yalla-gold-*)</SubTitle>
        <div className="grid grid-cols-6 md:grid-cols-11 gap-3 mb-8">
          {GOLD_SCALE.map((c) => (
            <ColorSwatch key={c.shade} name={c.shade} hex={c.hex} />
          ))}
        </div>

        <SubTitle>Neutral Grays (yl-gray-*)</SubTitle>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mb-8">
          {GRAYS.map((c) => (
            <ColorSwatch key={c.tw} name={c.name} hex={c.hex} label={c.tw} />
          ))}
        </div>

        <SubTitle>Admin Dashboard Tokens</SubTitle>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-4 mb-8">
          {ADMIN_COLORS.map((c) => (
            <div key={c.var} className="flex flex-col items-center gap-2">
              <div
                className="w-16 h-16 rounded-lg border border-[var(--yl-gray-300)]"
                style={{ backgroundColor: c.hex }}
              />
              <span className="text-xs font-mono text-[var(--yl-gray-500)]">{c.var}</span>
              <span className="text-[10px] text-[var(--yl-gray-400)]">{c.name}</span>
            </div>
          ))}
        </div>

        {/* ════════ TYPOGRAPHY ════════ */}
        <SectionTitle id="typography">2. Typography</SectionTitle>

        <SubTitle>Type Scale (EN)</SubTitle>
        <div className="space-y-4 mb-8">
          {TYPE_SCALE.map((t) => (
            <div key={t.name} className="flex items-baseline gap-4 border-b border-[var(--yl-gray-200)] pb-3">
              <span className="text-xs font-mono text-[var(--yl-gray-400)] w-16 shrink-0">{t.size}</span>
              <span className="text-xs text-[var(--yl-gray-400)] w-12 shrink-0">{t.name}</span>
              <span
                style={{
                  fontSize: t.size,
                  fontWeight: Number(t.weight),
                  fontFamily: t.font === "display" ? "var(--font-display, Anybody, sans-serif)" : "var(--font-body, 'Source Serif 4', Georgia, serif)",
                }}
              >
                {t.sample}
              </span>
            </div>
          ))}
        </div>

        <SubTitle>Arabic Type Sample</SubTitle>
        <div className="bg-[var(--yl-navy,#1A2332)] text-white rounded-xl p-8 mb-8" dir="rtl">
          <p style={{ fontFamily: "var(--font-arabic, 'Noto Sans Arabic', sans-serif)", fontSize: "24px", fontWeight: 600, lineHeight: 1.8 }}>
            يلا لندن — دليلك العربي الفاخر
          </p>
          <p style={{ fontFamily: "var(--font-arabic, 'Noto Sans Arabic', sans-serif)", fontSize: "16px", fontWeight: 400, lineHeight: 1.8 }} className="mt-2 opacity-80">
            اكتشف أفخم الفنادق والمطاعم والتجارب في لندن مع يلا لندن. دليلك الشامل للسفر الفاخر.
          </p>
        </div>

        <SubTitle>Font Stack Reference</SubTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {[
            { name: "Display / Heading", family: "Anybody", var: "--font-display", tw: "font-display" },
            { name: "Body / Serif", family: "Source Serif 4", var: "--font-body", tw: "font-body" },
            { name: "Admin / System", family: "Space Grotesk", var: "--font-system", tw: "font-[var(--font-system)]" },
            { name: "Arabic", family: "Noto Sans Arabic", var: "--yl-font-arabic", tw: "font-arabic" },
          ].map((f) => (
            <div key={f.var} className="bg-white rounded-lg border border-[rgba(214,208,196,0.5)] p-4">
              <p className="text-xs text-[var(--yl-gray-400)] font-mono mb-1">{f.tw}</p>
              <p style={{ fontFamily: `var(${f.var}, ${f.family}, sans-serif)`, fontSize: "20px" }}>
                {f.name}: The quick brown fox
              </p>
              <p className="text-xs text-[var(--yl-gray-500)] mt-1">{f.family} &bull; {f.var}</p>
            </div>
          ))}
        </div>

        {/* ════════ SPACING ════════ */}
        <SectionTitle id="spacing">3. Spacing Scale (8px grid)</SectionTitle>
        <div className="space-y-3 mb-8">
          {SPACING.map((s) => (
            <div key={s.name} className="flex items-center gap-4">
              <span className="text-xs font-mono text-[var(--yl-gray-400)] w-20 shrink-0">{s.var}</span>
              <span className="text-xs text-[var(--yl-gray-500)] w-12 shrink-0">{s.value}</span>
              <div className="bg-[var(--yl-blue,#4A7BA8)] rounded" style={{ width: s.value, height: "24px" }} />
              <span className="text-xs text-[var(--yl-gray-400)]">{s.name}</span>
            </div>
          ))}
        </div>

        {/* ════════ SHADOWS ════════ */}
        <SectionTitle id="shadows">4. Shadows & Elevation</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {SHADOWS.map((s) => (
            <div key={s.name} className="bg-white rounded-xl p-6" style={{ boxShadow: s.css }}>
              <p className="text-sm font-semibold mb-1">shadow-{s.name}</p>
              <p className="text-xs text-[var(--yl-gray-400)] font-mono mb-2">{s.css}</p>
              <p className="text-xs text-[var(--yl-gray-500)]">{s.usage}</p>
            </div>
          ))}
        </div>

        {/* ════════ RADII ════════ */}
        <SectionTitle id="radii">5. Border Radii</SectionTitle>
        <div className="flex flex-wrap gap-6 mb-8">
          {RADII.map((r) => (
            <div key={r.name} className="flex flex-col items-center gap-2">
              <div
                className="w-20 h-20 bg-[var(--yl-blue,#4A7BA8)] border-2 border-[var(--yl-blue,#4A7BA8)]"
                style={{ borderRadius: r.value }}
              />
              <span className="text-xs font-mono text-[var(--yl-gray-500)]">{r.var}</span>
              <span className="text-[10px] text-[var(--yl-gray-400)]">{r.value}</span>
            </div>
          ))}
        </div>

        {/* ════════ BUTTONS ════════ */}
        <SectionTitle id="buttons">6. Buttons</SectionTitle>
        <div className="space-y-6 mb-8">
          {/* Button variants */}
          <div className="flex flex-wrap gap-3">
            <button className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#C8322B] hover:bg-[#a82520] active:scale-[0.97] transition-all min-h-[44px]">
              Primary (Red)
            </button>
            <button className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#C49A2A] hover:bg-[#a87a22] active:scale-[0.97] transition-all min-h-[44px]">
              Secondary (Gold)
            </button>
            <button className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 active:scale-[0.97] transition-all min-h-[44px]">
              Danger
            </button>
            <button className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#2D5A3D] hover:bg-[#1e4a2d] active:scale-[0.97] transition-all min-h-[44px]">
              Success
            </button>
            <button className="px-5 py-2.5 rounded-lg text-sm font-semibold text-[var(--yl-charcoal)] bg-transparent border border-[var(--yl-gray-300)] hover:bg-[var(--yl-gray-100)] active:scale-[0.97] transition-all min-h-[44px]">
              Ghost
            </button>
          </div>

          {/* Button sizes */}
          <div className="flex flex-wrap items-end gap-3">
            <button className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-[#C8322B] min-h-[32px]">
              Small
            </button>
            <button className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#C8322B] min-h-[44px]">
              Medium (default)
            </button>
            <button className="px-7 py-3.5 rounded-lg text-base font-semibold text-white bg-[#C8322B] min-h-[52px]">
              Large
            </button>
          </div>
        </div>

        {/* ════════ BADGES ════════ */}
        <SectionTitle id="badges">7. Status Badges</SectionTitle>
        <div className="flex flex-wrap gap-2 mb-8">
          {STATUSES.map((s) => (
            <span
              key={s.name}
              className="px-2.5 py-1 rounded-full text-xs font-semibold capitalize"
              style={{ backgroundColor: s.bg, color: s.text }}
            >
              {s.name}
            </span>
          ))}
        </div>

        {/* ════════ CARDS ════════ */}
        <SectionTitle id="cards">8. Cards</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Default Card */}
          <div className="bg-white rounded-xl border border-[rgba(214,208,196,0.5)] p-6 shadow-sm hover:shadow-md transition-shadow">
            <h4 className="text-sm font-semibold mb-2">Default Card</h4>
            <p className="text-xs text-[var(--yl-gray-500)]">White background, sand border, sm shadow at rest, md on hover.</p>
            <p className="text-[10px] font-mono text-[var(--yl-gray-400)] mt-3">AdminCard / bg-white border shadow-sm</p>
          </div>

          {/* Elevated Card */}
          <div className="bg-white rounded-xl border border-[rgba(214,208,196,0.5)] p-6 shadow-md">
            <h4 className="text-sm font-semibold mb-2">Elevated Card</h4>
            <p className="text-xs text-[var(--yl-gray-500)]">More prominent shadow for important content.</p>
            <p className="text-[10px] font-mono text-[var(--yl-gray-400)] mt-3">AdminCard elevated / shadow-md</p>
          </div>

          {/* Accent Card */}
          <div className="bg-white rounded-xl border-l-4 border-l-[#C8322B] border border-[rgba(214,208,196,0.5)] p-6 shadow-sm">
            <h4 className="text-sm font-semibold mb-2">Accent Card</h4>
            <p className="text-xs text-[var(--yl-gray-500)]">Left border accent for featured items or alerts.</p>
            <p className="text-[10px] font-mono text-[var(--yl-gray-400)] mt-3">AdminCard accent / border-l-4</p>
          </div>
        </div>

        {/* Dark cards */}
        <SubTitle>Dark Theme Cards (Public Site)</SubTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-[var(--yl-charcoal,#1C1917)] rounded-xl p-6 text-white">
            <h4 className="text-sm font-semibold mb-2 text-[var(--yl-gold,#C49A2A)]">Content Card (Dark)</h4>
            <p className="text-xs text-white/70">Charcoal background, gold accents, white text.</p>
          </div>
          <div className="bg-[var(--yl-navy,#1A2332)] rounded-xl p-6 text-white">
            <h4 className="text-sm font-semibold mb-2">Stat Card (Dark)</h4>
            <p className="text-3xl font-bold text-[var(--yl-gold,#C49A2A)]">1,234</p>
            <p className="text-xs text-white/60 mt-1">Monthly visitors</p>
          </div>
        </div>

        {/* ════════ TRI-COLOR BAR ════════ */}
        <SectionTitle id="tribar">9. Tri-Color Bar</SectionTitle>
        <div className="space-y-4 mb-8">
          <div>
            <p className="text-xs text-[var(--yl-gray-400)] mb-2">3px — Standard (page top)</p>
            <div className="h-[3px] w-full flex rounded-full overflow-hidden">
              <div className="flex-1 bg-[var(--yl-red,#C8322B)]" />
              <div className="flex-1 bg-[var(--yl-gold,#C49A2A)]" />
              <div className="flex-1 bg-[var(--yl-blue,#4A7BA8)]" />
            </div>
          </div>
          <div>
            <p className="text-xs text-[var(--yl-gray-400)] mb-2">Gradient variant</p>
            <div className="h-1 w-full rounded-full bg-gradient-to-r from-[#C8322B] via-[#C49A2A] to-[#4A7BA8]" />
          </div>
        </div>

        {/* ════════ FOOTER ════════ */}
        <footer className="mt-20 pt-8 border-t border-[var(--yl-gray-300)] text-center text-sm text-[var(--yl-gray-400)]">
          <p>Yalla London Design System &bull; Generated from DESIGN.md v1.0</p>
          <p className="mt-1">Run <code className="font-mono text-xs bg-[var(--yl-gray-100)] px-2 py-0.5 rounded">npx tsx scripts/brand-check.ts</code> to validate compliance</p>
        </footer>
      </div>
    </div>
  );
}
