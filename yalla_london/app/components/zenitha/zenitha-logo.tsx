'use client';

/**
 * Zenitha Yachts — Official Logo Components
 * Extracted from brand kit for use in production header/footer.
 * Source: public/branding/zenitha-yachts/brand-kit/ZenithaBrandKit.tsx
 */

const C = {
  navy: '#0A1628',
  gold: '#C9A96E',
  champagne: '#E8D5B5',
  ocean: '#4A90B8',
  white: '#FFFFFF',
  pearl: '#FAFAF7',
};

const FONT = {
  display: "'Playfair Display', Georgia, serif",
  heading: "'DM Sans', 'Helvetica Neue', sans-serif",
  arabic: "'IBM Plex Sans Arabic', Tahoma, sans-serif",
};

const CompassRose = ({
  cx, cy, size, color = C.gold, opacity = 1,
}: { cx: number; cy: number; size: number; color?: string; opacity?: number }) => (
  <g transform={`translate(${cx},${cy})`} opacity={opacity}>
    <polygon points={`0,${-size} ${size * 0.15},${-size * 0.15} 0,0 ${-size * 0.15},${-size * 0.15}`} fill={color} />
    <polygon points={`${size},0 ${size * 0.15},${-size * 0.15} 0,0 ${size * 0.15},${size * 0.15}`} fill={color} />
    <polygon points={`0,${size} ${size * 0.15},${size * 0.15} 0,0 ${-size * 0.15},${size * 0.15}`} fill={color} opacity={0.6} />
    <polygon points={`${-size},0 ${-size * 0.15},${-size * 0.15} 0,0 ${-size * 0.15},${size * 0.15}`} fill={color} opacity={0.6} />
    <circle cx={0} cy={0} r={size * 0.08} fill={color} />
  </g>
);

const GoldBar = ({ x, y, width, height = 2 }: { x: number; y: number; width: number; height?: number }) => (
  <g>
    <rect x={x} y={y} width={width * 0.6} height={height} fill={C.gold} rx={1} />
    <rect x={x + width * 0.64} y={y} width={width * 0.22} height={height} fill={C.champagne} rx={1} />
    <rect x={x + width * 0.9} y={y} width={width * 0.1} height={height} fill={C.ocean} rx={1} />
  </g>
);

/* ── Horizontal lockup — default for header ── */
export function LogoHorizontal({
  textColor = C.navy,
  showBg = false,
  bg = C.pearl,
  scale = 1,
}: {
  textColor?: string;
  showBg?: boolean;
  bg?: string;
  scale?: number;
}) {
  return (
    <svg
      viewBox="0 0 500 80"
      style={{ width: 500 * scale, height: 80 * scale }}
      aria-label="Zenitha Yacht Charter"
      role="img"
    >
      {showBg && <rect width="500" height="80" fill={bg} />}
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
}

/* ── Full primary logo — used on landing pages ── */
export function LogoPrimary({
  textColor = C.navy,
  showBg = false,
  bg = C.pearl,
  scale = 1,
}: {
  textColor?: string;
  showBg?: boolean;
  bg?: string;
  scale?: number;
}) {
  return (
    <svg
      viewBox="0 0 400 160"
      style={{ width: 400 * scale, height: 160 * scale }}
      aria-label="Zenitha Yacht Charter"
      role="img"
    >
      {showBg && <rect width="400" height="160" fill={bg} />}
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
}

/* ── Social square icon ── */
export function LogoSocialSquare({
  bg = C.navy,
  accent = C.gold,
  scale = 1,
}: {
  bg?: string;
  accent?: string;
  scale?: number;
}) {
  return (
    <svg viewBox="0 0 128 128" style={{ width: 128 * scale, height: 128 * scale }} aria-label="Zenitha" role="img">
      <rect width="128" height="128" fill={bg} rx="20" />
      <CompassRose cx={64} cy={48} size={20} color={accent} />
      <circle cx={64} cy={48} r={26} fill="none" stroke={accent} strokeWidth="0.8" opacity={0.3} />
      <text x="64" y="92" fontFamily={FONT.display} fontWeight="700" fontSize="18"
        fill={C.white} letterSpacing="-0.01em" textAnchor="middle">ZENITHA</text>
      <text x="64" y="108" fontFamily={FONT.heading} fontWeight="300" fontSize="7"
        fill={accent} letterSpacing="0.18em" textAnchor="middle">YACHTS</text>
    </svg>
  );
}

/* ── Standalone compass — decorative element ── */
export function CompassElement({ size = 120 }: { size?: number }) {
  return (
    <svg viewBox="0 0 120 120" style={{ width: size, height: size }} aria-hidden="true">
      <circle cx="60" cy="60" r="56" fill="none" stroke={C.gold} strokeWidth="1.5" opacity={0.3} />
      <circle cx="60" cy="60" r="46" fill="none" stroke={C.gold} strokeWidth="0.6" opacity={0.2} />
      <CompassRose cx={60} cy={60} size={32} color={C.gold} />
      {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => (
        <line key={deg}
          x1={60} y1={60}
          x2={60 + Math.cos(deg * Math.PI / 180) * 50}
          y2={60 + Math.sin(deg * Math.PI / 180) * 50}
          stroke={C.gold} strokeWidth="0.4" opacity={0.15} />
      ))}
    </svg>
  );
}
