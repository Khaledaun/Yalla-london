'use client';

// ═══════════════════════════════════════════════════════════════════
// ZENITHA · LUXURY — Complete Brand Kit
// The parent company. A holding for extraordinary travel experiences.
// Tone: Authoritative · Refined · Timeless · Corporate-luxury
// ═══════════════════════════════════════════════════════════════════

export const C = {
  obsidian:    '#0A0A0A',
  midnight:    '#141414',
  charcoal:    '#2A2A2A',
  smoke:       '#4A4A4A',
  mist:        '#8A8A8A',
  platinum:    '#D6D0C4',
  cream:       '#F5F0E8',
  ivory:       '#FDFCF9',
  white:       '#FFFFFF',
  gold:        '#C4A96C',
  goldLight:   '#E2CBА0',
  goldDeep:    '#9A7A42',
  champagne:   '#EAD9BB',
  brass:       '#B8934A',
};

export const FONT = {
  display: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
  heading: "'DM Sans', 'Helvetica Neue', Arial, sans-serif",
  body:    "'Source Serif 4', Georgia, serif",
  arabic:  "'IBM Plex Sans Arabic', 'Noto Sans Arabic', Tahoma, sans-serif",
};

// ─── DECORATIVE ELEMENTS ────────────────────────────────────────────

/**
 * The Diamond Mark — the Zenitha.Luxury symbol.
 * A precise four-pointed star enclosed in concentric diamonds.
 * Represents the meeting point of all Zenitha experiences.
 */
const DiamondMark = ({
  size, color = C.gold, opacity = 1,
}: { size: number; color?: string; opacity?: number }) => {
  const h = size / 2;
  const inner = h * 0.6;
  return (
    <g opacity={opacity}>
      {/* Outer diamond */}
      <polygon
        points={`${h},0 ${size},${h} ${h},${size} 0,${h}`}
        fill="none"
        stroke={color}
        strokeWidth={size * 0.02}
      />
      {/* Inner diamond */}
      <polygon
        points={`${h},${h - inner} ${h + inner},${h} ${h},${h + inner} ${h - inner},${h}`}
        fill="none"
        stroke={color}
        strokeWidth={size * 0.015}
        opacity={0.4}
      />
      {/* Four-pointed star */}
      <polygon
        points={`${h},${h * 0.18} ${h + h * 0.12},${h - h * 0.12} ${h},${h * 0.58} ${h - h * 0.12},${h - h * 0.12}`}
        fill={color}
      />
      <polygon
        points={`${h + h * 0.82},${h} ${h + h * 0.12},${h + h * 0.12} ${h + h * 0.42},${h} ${h + h * 0.12},${h - h * 0.12}`}
        fill={color}
        opacity={0.6}
      />
      <polygon
        points={`${h},${h * 1.82} ${h - h * 0.12},${h + h * 0.12} ${h},${h * 1.42} ${h + h * 0.12},${h + h * 0.12}`}
        fill={color}
        opacity={0.6}
      />
      <polygon
        points={`${h * 0.18},${h} ${h - h * 0.12},${h - h * 0.12} ${h * 0.58},${h} ${h - h * 0.12},${h + h * 0.12}`}
        fill={color}
        opacity={0.6}
      />
      {/* Center dot */}
      <circle cx={h} cy={h} r={size * 0.035} fill={color} />
    </g>
  );
};

const ThinRule = ({ x, y, width, color = C.gold }: { x: number; y: number; width: number; color?: string }) => (
  <g>
    <rect x={x} y={y} width={width * 0.4} height="0.8" fill={color} opacity={0.8} rx="0.4" />
    <rect x={x + width * 0.43} y={y} width={width * 0.17} height="0.8" fill={color} opacity={0.4} rx="0.4" />
    <rect x={x + width * 0.63} y={y} width={width * 0.37} height="0.8" fill={color} opacity={0.2} rx="0.4" />
  </g>
);

// ─── LOGO VARIANTS ──────────────────────────────────────────────────

/**
 * Primary Logo — Horizontal lockup
 * Use: Headers, footers, business materials
 * Size: 540 × 90 viewBox
 */
export const LogoPrimary = ({
  bg = C.ivory,
  textColor = C.obsidian,
  scale = 1,
  showBg = true,
}: {
  bg?: string;
  textColor?: string;
  scale?: number;
  showBg?: boolean;
}) => (
  <svg
    viewBox="0 0 540 90"
    style={{ width: 540 * scale, height: 90 * scale }}
    aria-label="Zenitha · Luxury"
    role="img"
  >
    {showBg && <rect width="540" height="90" fill={bg} />}
    {/* Diamond mark */}
    <DiamondMark size={52} color={C.gold} />
    {/* Vertical divider */}
    <line x1={66} y1={18} x2={66} y2={72} stroke={C.gold} strokeWidth="0.7" opacity={0.35} />
    {/* Wordmark */}
    <text x="80" y="42" fontFamily={FONT.display} fontWeight="600" fontSize="30"
      fill={textColor} letterSpacing="0.08em">ZENITHA</text>
    <text x="81" y="62" fontFamily={FONT.heading} fontWeight="300" fontSize="9"
      fill={C.gold} letterSpacing="0.55em">· LUXURY ·</text>
    <ThinRule x={80} y={72} width={200} />
  </svg>
);

/**
 * Dark variant — for dark backgrounds (navy, obsidian)
 */
export const LogoPrimaryDark = ({ scale = 1 }: { scale?: number }) => (
  <LogoPrimary bg={C.obsidian} textColor={C.ivory} scale={scale} showBg={true} />
);

/**
 * Transparent variant — overlay on images, navbars
 */
export const LogoLight = ({ scale = 1 }: { scale?: number }) => (
  <LogoPrimary bg="transparent" textColor={C.ivory} scale={scale} showBg={false} />
);

export const LogoDark = ({ scale = 1 }: { scale?: number }) => (
  <LogoPrimary bg="transparent" textColor={C.obsidian} scale={scale} showBg={false} />
);

/**
 * Stacked / Vertical Logo
 * Use: Square placements, hero sections
 * Size: 240 × 280 viewBox
 */
export const LogoStacked = ({
  bg = C.ivory,
  textColor = C.obsidian,
  scale = 1,
  showBg = true,
}: {
  bg?: string;
  textColor?: string;
  scale?: number;
  showBg?: boolean;
}) => (
  <svg
    viewBox="0 0 240 280"
    style={{ width: 240 * scale, height: 280 * scale }}
    aria-label="Zenitha · Luxury"
    role="img"
  >
    {showBg && <rect width="240" height="280" fill={bg} />}
    <g transform="translate(94, 24)">
      <DiamondMark size={52} color={C.gold} />
    </g>
    <text x="120" y="130" fontFamily={FONT.display} fontWeight="600" fontSize="28"
      fill={textColor} letterSpacing="0.1em" textAnchor="middle">ZENITHA</text>
    <text x="120" y="152" fontFamily={FONT.heading} fontWeight="300" fontSize="9"
      fill={C.gold} letterSpacing="0.5em" textAnchor="middle">· LUXURY ·</text>
    <line x1="60" y1="164" x2="180" y2="164" stroke={C.gold} strokeWidth="0.7" opacity={0.3} />
    <text x="120" y="186" fontFamily={FONT.heading} fontWeight="300" fontSize="8"
      fill={textColor} opacity={0.35} letterSpacing="0.12em" textAnchor="middle">ZENITHA.LUXURY LLC</text>
    <text x="120" y="200" fontFamily={FONT.arabic} fontWeight="400" fontSize="14"
      fill={textColor} opacity={0.5} textAnchor="middle">زينيثا · لوكشري</text>
  </svg>
);

/**
 * Symbol only — the Diamond Mark
 * Use: Favicon, app icon, social profile picture
 * Size: 80 × 80 viewBox
 */
export const LogoSymbol = ({
  bg = C.obsidian,
  accent = C.gold,
  scale = 1,
}: {
  bg?: string;
  accent?: string;
  scale?: number;
}) => (
  <svg
    viewBox="0 0 80 80"
    style={{ width: 80 * scale, height: 80 * scale }}
    aria-label="Z"
    role="img"
  >
    <rect width="80" height="80" fill={bg} />
    <g transform="translate(14, 14)">
      <DiamondMark size={52} color={accent} />
    </g>
  </svg>
);

/**
 * Social square icon — for profile pictures, app icons
 * Size: 128 × 128 viewBox
 */
export const LogoSocialSquare = ({
  bg = C.obsidian,
  accent = C.gold,
  scale = 1,
}: {
  bg?: string;
  accent?: string;
  scale?: number;
}) => (
  <svg
    viewBox="0 0 128 128"
    style={{ width: 128 * scale, height: 128 * scale }}
    aria-label="Zenitha Luxury"
    role="img"
  >
    <rect width="128" height="128" fill={bg} rx="16" />
    <g transform="translate(38, 18)">
      <DiamondMark size={52} color={accent} />
    </g>
    <text x="64" y="94" fontFamily={FONT.display} fontWeight="600" fontSize="15"
      fill={C.ivory} letterSpacing="0.12em" textAnchor="middle">ZENITHA</text>
    <text x="64" y="110" fontFamily={FONT.heading} fontWeight="300" fontSize="6.5"
      fill={accent} letterSpacing="0.45em" textAnchor="middle">· LUXURY ·</text>
  </svg>
);

/**
 * Monochrome logo — for single-color applications (embossing, watermark)
 */
export const LogoMono = ({ color = C.obsidian, scale = 1 }: { color?: string; scale?: number }) => (
  <svg viewBox="0 0 540 90" style={{ width: 540 * scale, height: 90 * scale }} aria-label="Zenitha Luxury" role="img">
    <DiamondMark size={52} color={color} />
    <line x1={66} y1={18} x2={66} y2={72} stroke={color} strokeWidth="0.7" opacity={0.25} />
    <text x="80" y="42" fontFamily={FONT.display} fontWeight="600" fontSize="30"
      fill={color} letterSpacing="0.08em">ZENITHA</text>
    <text x="81" y="62" fontFamily={FONT.heading} fontWeight="300" fontSize="9"
      fill={color} opacity={0.6} letterSpacing="0.55em">· LUXURY ·</text>
  </svg>
);

// ─── DECORATIVE BRAND ELEMENTS ───────────────────────────────────────

/**
 * Standalone Diamond — decorative element for section dividers, backgrounds
 */
export const DiamondElement = ({ size = 60, color = C.gold }: { size?: number; color?: string }) => (
  <svg viewBox="0 0 80 80" style={{ width: size, height: size }} aria-hidden="true">
    <g transform="translate(14, 14)">
      <DiamondMark size={52} color={color} />
    </g>
  </svg>
);

/**
 * Gold rule — horizontal accent line
 */
export const GoldRule = ({ width = 200, scale = 1 }: { width?: number; scale?: number }) => (
  <svg viewBox={`0 0 ${width} 6`} style={{ width: width * scale, height: 6 * scale }} aria-hidden="true">
    <ThinRule x={0} y={2.6} width={width} />
  </svg>
);

/**
 * Brand tagline lockup
 */
export const TaglineLockup = ({ color = C.obsidian, scale = 1 }: { color?: string; scale?: number }) => (
  <svg viewBox="0 0 480 40" style={{ width: 480 * scale, height: 40 * scale }} aria-label="The Art of Exceptional Travel" role="img">
    <ThinRule x={0} y={19} width={100} color={C.gold} />
    <text x="110" y="24" fontFamily={FONT.heading} fontWeight="300" fontSize="11"
      fill={color} letterSpacing="0.3em">THE ART OF EXCEPTIONAL TRAVEL</text>
    <ThinRule x={380} y={19} width={100} color={C.gold} />
  </svg>
);

// Re-export constants for downstream use
export { DiamondMark, ThinRule };
