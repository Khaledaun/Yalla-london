"use client";

import { useState } from "react";

// ═══════════════════════════════════════════════════════════
// ZENITHA YACHTS — COMPLETE BRAND KIT
// Maritime Luxury · Refined · Confident · Worldly
// ═══════════════════════════════════════════════════════════

export const C = {
  navy: "#0A1628", midnight: "#1B2A4A", aegean: "#2E5A88",
  ocean: "#4A90B8", shallow: "#7CB8D4", gold: "#C9A96E",
  champagne: "#E8D5B5", sand: "#F5EDE0", pearl: "#FAFAF7",
  white: "#FFFFFF", mediterranean: "#0EA5A2", coral: "#E07A5F",
  storm: "#DC2626",
};

export const FONT = {
  display: "'Playfair Display', Georgia, serif",
  heading: "'DM Sans', 'Helvetica Neue', sans-serif",
  body: "'Source Sans 3', 'Segoe UI', sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', monospace",
  arabic: "'IBM Plex Sans Arabic', Tahoma, sans-serif",
};

// ═══════════════════════════════════════════════════════════
// SVG LOGO COMPONENTS
// ═══════════════════════════════════════════════════════════

const WavePattern = ({ color = C.gold, opacity = 0.15, y = 0 }: { color?: string; opacity?: number; y?: number }) => (
  <g opacity={opacity} transform={`translate(0,${y})`}>
    <path d={`M0,8 Q15,0 30,8 T60,8 T90,8 T120,8 T150,8 T180,8 T210,8 T240,8 T270,8 T300,8`}
      fill="none" stroke={color} strokeWidth="1.2" />
  </g>
);

export const CompassRose = ({ cx, cy, size, color = C.gold, opacity = 1 }: { cx: number; cy: number; size: number; color?: string; opacity?: number }) => {
  const s = size;
  return (
    <g transform={`translate(${cx},${cy})`} opacity={opacity}>
      <polygon points={`0,${-s} ${s*0.15},${-s*0.15} 0,0 ${-s*0.15},${-s*0.15}`} fill={color} />
      <polygon points={`${s},0 ${s*0.15},${-s*0.15} 0,0 ${s*0.15},${s*0.15}`} fill={color} />
      <polygon points={`0,${s} ${s*0.15},${s*0.15} 0,0 ${-s*0.15},${s*0.15}`} fill={color} opacity={0.6} />
      <polygon points={`${-s},0 ${-s*0.15},${-s*0.15} 0,0 ${-s*0.15},${s*0.15}`} fill={color} opacity={0.6} />
      <circle cx={0} cy={0} r={s*0.08} fill={color} />
    </g>
  );
};

const GoldBar = ({ x, y, width, height = 2 }: { x: number; y: number; width: number; height?: number }) => (
  <g>
    <rect x={x} y={y} width={width * 0.6} height={height} fill={C.gold} rx={1} />
    <rect x={x + width * 0.64} y={y} width={width * 0.22} height={height} fill={C.champagne} rx={1} />
    <rect x={x + width * 0.9} y={y} width={width * 0.1} height={height} fill={C.ocean} rx={1} />
  </g>
);

// Primary Logo — Full version
export const LogoPrimary = ({ bg = C.pearl, textColor = C.navy, scale = 1, showBg = true }: { bg?: string; textColor?: string; scale?: number; showBg?: boolean }) => (
  <svg viewBox="0 0 400 160" style={{ width: 400 * scale, height: 160 * scale }}>
    {showBg && <rect width="400" height="160" fill={bg} rx="0" />}
    <CompassRose cx={56} cy={62} size={22} color={C.gold} />
    <circle cx={56} cy={62} r={28} fill="none" stroke={C.gold} strokeWidth="1" opacity={0.4} />
    <text x="96" y="58" fontFamily={FONT.display} fontWeight="700" fontSize="38"
      fill={textColor} letterSpacing="-0.02em">ZENITHA</text>
    <text x="96" y="82" fontFamily={FONT.heading} fontWeight="300" fontSize="13"
      fill={C.gold} letterSpacing="0.22em">YACHT CHARTER</text>
    <GoldBar x={96} y={96} width={180} height={2} />
    <text x="96" y="120" fontFamily={FONT.heading} fontWeight="400" fontSize="9"
      fill={textColor} opacity={0.4} letterSpacing="0.08em">MEDITERRANEAN · GULF · BEYOND</text>
  </svg>
);

// Horizontal Lockup
export const LogoHorizontal = ({ bg = C.pearl, textColor = C.navy, scale = 1, showBg = true }: { bg?: string; textColor?: string; scale?: number; showBg?: boolean }) => (
  <svg viewBox="0 0 500 80" style={{ width: 500 * scale, height: 80 * scale }}>
    {showBg && <rect width="500" height="80" fill={bg} rx="0" />}
    <CompassRose cx={40} cy={40} size={16} color={C.gold} />
    <circle cx={40} cy={40} r={22} fill="none" stroke={C.gold} strokeWidth="0.8" opacity={0.3} />
    <line x1={72} y1={18} x2={72} y2={62} stroke={C.gold} strokeWidth="1" opacity={0.3} />
    <text x="84" y="38" fontFamily={FONT.display} fontWeight="700" fontSize="26"
      fill={textColor} letterSpacing="-0.01em">ZENITHA</text>
    <text x="84" y="56" fontFamily={FONT.heading} fontWeight="300" fontSize="10"
      fill={C.gold} letterSpacing="0.2em">YACHT CHARTER</text>
    <GoldBar x={84} y={66} width={120} height={1.5} />
  </svg>
);

// Stacked / Vertical Logo
export const LogoStacked = ({ bg = C.pearl, textColor = C.navy, scale = 1, showBg = true }: { bg?: string; textColor?: string; scale?: number; showBg?: boolean }) => (
  <svg viewBox="0 0 220 220" style={{ width: 220 * scale, height: 220 * scale }}>
    {showBg && <rect width="220" height="220" fill={bg} rx="0" />}
    <CompassRose cx={110} cy={60} size={26} color={C.gold} />
    <circle cx={110} cy={60} r={34} fill="none" stroke={C.gold} strokeWidth="1" opacity={0.3} />
    <text x="110" y="124" fontFamily={FONT.display} fontWeight="700" fontSize="34"
      fill={textColor} letterSpacing="-0.02em" textAnchor="middle">ZENITHA</text>
    <text x="110" y="148" fontFamily={FONT.heading} fontWeight="300" fontSize="11"
      fill={C.gold} letterSpacing="0.2em" textAnchor="middle">YACHT CHARTER</text>
    <GoldBar x={60} y={162} width={100} height={2} />
    <text x="110" y="186" fontFamily={FONT.heading} fontWeight="400" fontSize="8"
      fill={textColor} opacity={0.4} letterSpacing="0.08em" textAnchor="middle">MEDITERRANEAN · GULF · BEYOND</text>
  </svg>
);

// Monochrome Logo
export const LogoMono = ({ color = C.navy, scale = 1 }: { color?: string; scale?: number }) => (
  <svg viewBox="0 0 400 100" style={{ width: 400 * scale, height: 100 * scale }}>
    <CompassRose cx={46} cy={42} size={18} color={color} />
    <circle cx={46} cy={42} r={24} fill="none" stroke={color} strokeWidth="0.8" opacity={0.4} />
    <text x="82" y="42" fontFamily={FONT.display} fontWeight="700" fontSize="32"
      fill={color} letterSpacing="-0.02em">ZENITHA</text>
    <text x="82" y="62" fontFamily={FONT.heading} fontWeight="300" fontSize="11"
      fill={color} opacity={0.6} letterSpacing="0.2em">YACHT CHARTER</text>
    <rect x="82" y="74" width="140" height="1.5" fill={color} opacity={0.2} rx="1" />
  </svg>
);

// Social Icon — Square
export const LogoSocialSquare = ({ bg = C.navy, accent = C.gold, scale = 1 }: { bg?: string; accent?: string; scale?: number }) => (
  <svg viewBox="0 0 128 128" style={{ width: 128 * scale, height: 128 * scale }}>
    <rect width="128" height="128" fill={bg} rx="20" />
    <CompassRose cx={64} cy={48} size={20} color={accent} />
    <circle cx={64} cy={48} r={26} fill="none" stroke={accent} strokeWidth="0.8" opacity={0.3} />
    <text x="64" y="92" fontFamily={FONT.display} fontWeight="700" fontSize="18"
      fill={C.white} letterSpacing="-0.01em" textAnchor="middle">ZENITHA</text>
    <text x="64" y="108" fontFamily={FONT.heading} fontWeight="300" fontSize="7"
      fill={accent} letterSpacing="0.18em" textAnchor="middle">YACHTS</text>
  </svg>
);

// Social Icon — Circle
export const LogoSocialCircle = ({ bg = C.navy, accent = C.gold, scale = 1 }: { bg?: string; accent?: string; scale?: number }) => (
  <svg viewBox="0 0 128 128" style={{ width: 128 * scale, height: 128 * scale }}>
    <circle cx="64" cy="64" r="64" fill={bg} />
    <CompassRose cx={64} cy={46} size={18} color={accent} />
    <circle cx={64} cy={46} r={24} fill="none" stroke={accent} strokeWidth="0.7" opacity={0.3} />
    <text x="64" y="88" fontFamily={FONT.display} fontWeight="700" fontSize="16"
      fill={C.white} letterSpacing="-0.01em" textAnchor="middle">ZENITHA</text>
    <text x="64" y="102" fontFamily={FONT.heading} fontWeight="300" fontSize="6.5"
      fill={accent} letterSpacing="0.18em" textAnchor="middle">YACHTS</text>
  </svg>
);

// Favicon
export const LogoFavicon = ({ bg = C.navy, accent = C.gold, scale = 1 }: { bg?: string; accent?: string; scale?: number }) => (
  <svg viewBox="0 0 64 64" style={{ width: 64 * scale, height: 64 * scale }}>
    <rect width="64" height="64" fill={bg} rx="12" />
    <CompassRose cx={32} cy={26} size={14} color={accent} />
    <text x="32" y="52" fontFamily={FONT.display} fontWeight="700" fontSize="14"
      fill={C.white} letterSpacing="-0.01em" textAnchor="middle">Z</text>
  </svg>
);

// Standalone Compass Element
export const StandaloneCompass = ({ scale = 1 }: { scale?: number }) => (
  <svg viewBox="0 0 120 120" style={{ width: 120 * scale, height: 120 * scale }}>
    <circle cx="60" cy="60" r="56" fill="none" stroke={C.gold} strokeWidth="1.5" opacity={0.3} />
    <circle cx="60" cy="60" r="46" fill="none" stroke={C.gold} strokeWidth="0.6" opacity={0.2} />
    <CompassRose cx={60} cy={60} size={32} color={C.gold} />
    {[0,45,90,135,180,225,270,315].map(deg => (
      <line key={deg} x1={60} y1={60} x2={60 + Math.cos(deg*Math.PI/180)*50} y2={60 + Math.sin(deg*Math.PI/180)*50}
        stroke={C.gold} strokeWidth="0.4" opacity={0.15} />
    ))}
  </svg>
);

// Gold Accent Bar Element
export const StandaloneBar = ({ scale = 1 }: { scale?: number }) => (
  <svg viewBox="0 0 300 16" style={{ width: 300 * scale, height: 16 * scale }}>
    <rect x="0" y="4" width="180" height="4" fill={C.gold} rx="2" />
    <rect x="188" y="4" width="66" height="4" fill={C.champagne} rx="2" />
    <rect x="262" y="4" width="38" height="4" fill={C.ocean} rx="2" />
    <rect x="0" y="11" width="300" height="1" fill={C.gold} opacity="0.15" />
  </svg>
);

// Bilingual Logo
export const LogoBilingual = ({ bg = C.pearl, textColor = C.navy, scale = 1, showBg = true }: { bg?: string; textColor?: string; scale?: number; showBg?: boolean }) => (
  <svg viewBox="0 0 400 180" style={{ width: 400 * scale, height: 180 * scale }}>
    {showBg && <rect width="400" height="180" fill={bg} rx="0" />}
    <CompassRose cx={56} cy={62} size={22} color={C.gold} />
    <circle cx={56} cy={62} r={28} fill="none" stroke={C.gold} strokeWidth="1" opacity={0.4} />
    <text x="96" y="58" fontFamily={FONT.display} fontWeight="700" fontSize="36"
      fill={textColor} letterSpacing="-0.02em">ZENITHA</text>
    <text x="96" y="80" fontFamily={FONT.heading} fontWeight="300" fontSize="12"
      fill={C.gold} letterSpacing="0.2em">YACHT CHARTER</text>
    <GoldBar x={96} y={94} width={180} height={2} />
    <text x="96" y="118" fontFamily={FONT.arabic} fontWeight="700" fontSize="28"
      fill={textColor} direction="rtl">زينيثا يخوت</text>
    <text x="96" y="140" fontFamily={FONT.arabic} fontWeight="400" fontSize="11"
      fill={C.gold}>تأجير اليخوت الفاخرة</text>
  </svg>
);

// Re-export all for use in the brand kit viewer and the actual site
export { WavePattern, GoldBar };
