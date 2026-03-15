/**
 * Zenitha.Luxury — Site Content Data
 *
 * All content arrays for the homepage sections.
 * Edit these arrays to update content without touching layout code.
 * Items marked with TODO should be replaced with real content.
 *
 * Identity: "An AI venture studio for next-generation travel brands."
 */

// ─── Navigation ─────────────────────────────────────────────────────

export interface NavItem {
  label: string;
  href: string;
}

/* Intent: Add Partnerships as a primary nav destination; keep Ambassadors as
   an in-page block within About rather than a top-level nav item. */
export const NAV_ITEMS: NavItem[] = [
  { label: 'About', href: '#about' },
  { label: 'Partnerships', href: '#partnerships' },
  { label: 'Products', href: '#products' },
  { label: 'Portfolio', href: '#portfolio' },
  { label: 'Coming Soon', href: '#coming-soon' },
];

// ─── Hero Stats ─────────────────────────────────────────────────────

export interface HeroStat {
  value: string;
  label: string;
}

/* Intent: Reinforce venture-studio positioning — live products, markets,
   bilingual reach, not technology metrics. */
export const HERO_STATS: HeroStat[] = [
  { value: '2', label: 'Live Products' },
  { value: 'EN/AR', label: 'Bilingual Reach' },
  { value: '6+', label: 'Markets in Pipeline' },
  { value: '2026', label: 'Scaling Year' },
];

// ─── Pillars (About section) ────────────────────────────────────────

export interface Pillar {
  title: string;
  description: string;
}

/* Intent: Reframe pillars around the venture-studio mindset —
   AI-assisted but human-led, not "technology first". */
export const PILLARS: Pillar[] = [
  {
    title: 'Venture Studio Mindset',
    description:
      'We build, launch, and scale travel brands from zero — handling product, content, distribution, and monetisation under one roof.',
  },
  {
    title: 'AI\u2011Assisted, Human\u2011Led',
    description:
      'Proprietary AI accelerates research, personalisation, and discovery. Every recommendation is validated by real travellers and local experts.',
  },
  {
    title: 'Bilingual & Cross\u2011Market',
    description:
      'English and Arabic built into every product from day one — reaching Gulf, European, and global luxury audiences simultaneously.',
  },
  {
    title: 'Discreet Luxury Focus',
    description:
      'Our products serve high-value travellers who prioritise substance over spectacle — curated quality, not mass-market volume.',
  },
];

// ─── Partnership Cards ──────────────────────────────────────────────

export interface PartnershipCard {
  title: string;
  description: string;
}

/* Intent: Position Zenitha as a partner-first venture studio,
   not a service provider. These are collaboration models. */
export const PARTNERSHIP_CARDS: PartnershipCard[] = [
  {
    title: 'Co\u2011build',
    description:
      'We co-create new travel products with strategic partners — you bring the audience or inventory, we bring the technology and editorial engine.',
  },
  {
    title: 'White\u2011label',
    description:
      'License our AI-powered travel platform under your own brand. Full editorial control, bilingual out of the box, ready for your market.',
  },
  {
    title: 'Distribution',
    description:
      'Reach high-value travellers across the Zenitha network. Our products surface curated partner content to qualified audiences in real time.',
  },
  {
    title: 'Insight',
    description:
      'Access our proprietary travel-intelligence layer — trend data, audience signals, and destination analytics — to sharpen your own strategy.',
  },
];

// ─── Ambassador Bullets ─────────────────────────────────────────────

/* Intent: Counter the "just AI content" perception by spotlighting
   real people creating genuine, on-the-ground travel content. */
export const AMBASSADOR_BULLETS: string[] = [
  'Global network of travel ambassadors producing genuine, first-hand content — not AI-generated summaries.',
  'On-the-ground photography, video, and editorial from the destinations we cover.',
  'Every recommendation meets our editorial standards: visited, verified, and updated regularly.',
];

// ─── Service Tabs (now "Products") ──────────────────────────────────

export interface ServiceTab {
  id: string;
  label: string;
  title: string;
  description: string;
  /** Path to image in public/branding/zenitha-luxury/ */
  image: string;
  imageAlt: string;
  items: string[];
  ctaLabel: string;
  ctaHref: string;
}

/* Intent: Reframe as "portfolio products" built by the venture studio,
   not "services" or AI showcases. Emphasis on the traveller value. */
export const SERVICE_TABS: ServiceTab[] = [
  {
    id: 'yalla-london',
    label: 'Yalla London',
    title: 'Yalla London — Luxury City Discovery',
    description:
      'A bilingual (EN/AR) city guide for high-value travellers visiting London. AI-assisted discovery surfaces the best hotels, dining, and experiences — every recommendation verified by local experts and travel ambassadors.',
    // TODO: Replace with real Yalla London hero asset.
    image: '/branding/zenitha-luxury/images/gallery-1.png',
    imageAlt: 'London Luxury Travel',
    items: [
      'Neighbourhood guides (Mayfair, Knightsbridge, Chelsea) with bilingual editorial content.',
      'Curated hotel and dining collections ranked by first-hand visits.',
      'Seasonal guides for events, shopping, and cultural moments.',
      'AI-powered personalisation matching travellers to experiences.',
      'Concierge-style enquiry flows for bespoke trip planning.',
    ],
    ctaLabel: 'Explore Yalla London',
    ctaHref: '#portfolio',
  },
  {
    id: 'zenitha-yachts',
    label: 'Zenitha Yachts',
    title: 'Zenitha Yachts — Charter Journeys',
    description:
      'A curated marketplace for yacht charter discovery — connecting travellers with vetted itineraries across the Mediterranean, Arabian Gulf, and Caribbean.',
    // TODO: Replace with real Zenitha Yachts hero asset.
    image: '/branding/zenitha-luxury/images/gallery-4.png',
    imageAlt: 'Yacht Charter Sunset',
    items: [
      'Region-based discovery (Mediterranean, Arabian Gulf, Caribbean).',
      'Curated itinerary inspiration — sample 7\u2011day and 10\u2011day routes.',
      'Yacht category browsing (motor, sailing, superyachts).',
      'AI-assisted matching based on preferences, group size, and budget.',
      'Direct enquiry capture integrated with charter partners.',
    ],
    ctaLabel: 'Explore Zenitha Yachts',
    ctaHref: '#zenitha-yachts',
  },
];

// ─── Gallery Items ──────────────────────────────────────────────────

export interface GalleryItem {
  /** Path to image in public/branding/zenitha-luxury/ */
  image: string;
  alt: string;
  title: string;
  subtitle: string;
}

// TODO: Replace all gallery images with licensed Zenitha assets.
export const GALLERY_ITEMS: GalleryItem[] = [
  {
    image: '/branding/zenitha-luxury/images/gallery-1.png',
    alt: 'Tower Bridge London',
    title: 'Tower Bridge',
    subtitle: 'London',
  },
  {
    image: '/branding/zenitha-luxury/images/gallery-2.png',
    alt: 'Mediterranean Yacht',
    title: 'Mediterranean',
    subtitle: 'Yacht Region',
  },
  {
    image: '/branding/zenitha-luxury/images/gallery-3.png',
    alt: 'Private Members Club',
    title: 'Private Members',
    subtitle: 'London',
  },
  {
    image: '/branding/zenitha-luxury/images/gallery-4.png',
    alt: 'Luxury Yacht Charter',
    title: 'Superyacht',
    subtitle: 'At Sea',
  },
  {
    image: '/branding/zenitha-luxury/images/gallery-5.png',
    alt: 'White Glove Service',
    title: 'White Glove',
    subtitle: 'Hospitality',
  },
];

// ─── Coming Soon Cards ──────────────────────────────────────────────

export interface ComingSoonCard {
  name: string;
  tag: string;
  description: string;
  /** If true, rendered with reduced opacity and dashed border */
  faded: boolean;
}

export const COMING_SOON_CARDS: ComingSoonCard[] = [
  {
    name: 'Worldtme',
    tag: 'Concept — Time & Travel',
    // TODO: Define actual domain, product scope, and brand story for Worldtme.
    description:
      'Placeholder for a future Zenitha experience potentially related to global time, travel planning or similar. This is structural only.',
    faded: false,
  },
  {
    name: '[Future Site #2]',
    tag: '',
    // TODO: Replace with a real project name or remove this card when the roadmap is confirmed.
    description: 'Generic placeholder card for another Zenitha website in concept stage.',
    faded: true,
  },
  {
    name: '[Future Site #3]',
    tag: '',
    // TODO: Replace with a real project name or remove this card when the roadmap is confirmed.
    description: 'Generic placeholder card for another Zenitha website in concept stage.',
    faded: true,
  },
];

// ─── Detail Sections (Yalla London + Zenitha Yachts) ────────────────

export interface DetailSection {
  sectionNumber: string;
  sectionLabel: string;
  title: string;
  description: string;
  /** Path to image in public/branding/zenitha-luxury/ */
  image: string;
  imageAlt: string;
  bullets: string[];
  footnote: string;
}

/* Intent: Reframe detail sections as "portfolio products" — real businesses
   built and operated by the venture studio, not tech demos. */
export const YALLA_LONDON_DETAIL: DetailSection = {
  sectionNumber: '05',
  sectionLabel: 'Portfolio — Yalla London',
  title: 'London, Curated',
  description:
    'Our flagship city product. Yalla London is a bilingual luxury travel guide combining AI-assisted discovery with on-the-ground editorial from London-based travel ambassadors.',
  // TODO: Replace with Yalla London brand image.
  image: '/branding/zenitha-luxury/images/banner.png',
  imageAlt: 'Yalla London Mayfair',
  bullets: [
    'Neighbourhood guides written and verified by local experts.',
    'Hotel and dining collections curated from first-hand visits.',
    'Seasonal editorial covering events, openings, and cultural moments.',
    'AI-powered personalisation for tailored trip recommendations.',
    'Bilingual (EN/AR) content serving Gulf, European, and global travellers.',
    'Affiliate and concierge monetisation built in from day one.',
  ],
  footnote:
    'Yalla London is live at yalla-london.com — the first product in the Zenitha portfolio, proving our model of AI-assisted, human-curated travel content.',
};

export const ZENITHA_YACHTS_DETAIL: DetailSection = {
  sectionNumber: '06',
  sectionLabel: 'Portfolio — Zenitha Yachts',
  title: 'Journeys at Sea',
  description:
    'Our charter discovery product. Zenitha Yachts connects high-value travellers with curated yacht experiences across the Mediterranean, Arabian Gulf, and Caribbean.',
  // TODO: Replace with Zenitha Yachts brand image.
  image: '/branding/zenitha-luxury/images/hero-bg.png',
  imageAlt: 'Zenitha Yachts',
  bullets: [
    'Region-based discovery with curated itinerary inspiration.',
    'AI-assisted matching by preferences, group size, and budget.',
    'Vetted charter partners and yacht categories (motor, sailing, superyachts).',
    'Direct enquiry capture with broker integration.',
    'Content produced by yachting specialists and on-water ambassadors.',
  ],
  footnote:
    'Zenitha Yachts is the second product in the portfolio — extending the studio model into luxury maritime experiences.',
};

// ─── Contact Ways ───────────────────────────────────────────────────

export interface ContactWay {
  /** Unicode character used as icon */
  icon: string;
  label: string;
  value: string;
  href: string;
}

export const CONTACT_WAYS: ContactWay[] = [
  {
    icon: '\u2709', // ✉
    label: 'Email',
    value: 'info@zenitha.luxury',
    href: 'mailto:info@zenitha.luxury',
  },
  {
    icon: '\u25CA', // ◊
    label: 'Yalla London',
    value: 'yalla-london.com',
    href: 'https://www.yalla-london.com',
  },
  {
    icon: '\u266B', // ♫
    label: 'Zenitha Yachts',
    value: 'zenithayachts.com',
    href: 'https://www.zenithayachts.com',
  },
];

/* Intent: Lead with partnership-oriented enquiry types to attract
   co-build and licensing conversations, not just end-user queries. */
export const ENQUIRY_TYPES = [
  'Partnership / Co\u2011build',
  'White\u2011label / Licensing',
  'Investment / Strategic',
  'Yacht Charter Enquiry',
  'Travel Concierge',
  'Press / Media',
  'Other',
] as const;

// ─── Brand Portfolio (used in Footer) ───────────────────────────────

export interface Brand {
  name: string;
  tagline: string;
  domain: string;
  href: string;
  color: string;
  destination: string;
  status: 'live' | 'coming';
}

export const BRANDS: Brand[] = [
  {
    name: 'Yalla London',
    tagline: 'The Definitive London Travel Guide',
    domain: 'yalla-london.com',
    href: 'https://www.yalla-london.com',
    color: '#C8322B',
    destination: 'London, United Kingdom',
    status: 'live',
  },
  {
    name: 'Zenitha Yachts',
    tagline: 'Luxury Mediterranean Yacht Charters',
    domain: 'zenithayachts.com',
    href: 'https://www.zenithayachts.com',
    color: '#0A1628',
    destination: 'Mediterranean & Arabian Gulf',
    status: 'coming',
  },
  {
    name: 'Arabaldives',
    tagline: 'Luxury Maldives Resort Guide',
    domain: 'arabaldives.com',
    href: 'https://www.arabaldives.com',
    color: '#0891B2',
    destination: 'Maldives',
    status: 'coming',
  },
  {
    name: 'Yalla Riviera',
    tagline: 'Luxury French Riviera Guide',
    domain: 'yallariviera.com',
    href: 'https://www.yallariviera.com',
    color: '#1E3A5F',
    destination: "C\u00f4te d'Azur, France",
    status: 'coming',
  },
  {
    name: 'Yalla Istanbul',
    tagline: 'Luxury Istanbul Travel Guide',
    domain: 'yallaistanbul.com',
    href: 'https://www.yallaistanbul.com',
    color: '#7C2D12',
    destination: 'Istanbul, Turkey',
    status: 'coming',
  },
  {
    name: 'Yalla Thailand',
    tagline: 'Luxury Thailand Travel Guide',
    domain: 'yallathailand.com',
    href: 'https://www.yallathailand.com',
    color: '#059669',
    destination: 'Thailand',
    status: 'coming',
  },
];
