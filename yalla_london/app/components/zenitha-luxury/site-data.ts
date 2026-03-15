/**
 * Zenitha.Luxury — Site Content Data
 *
 * All content arrays for the homepage sections.
 * Edit these arrays to update content without touching layout code.
 * Items marked with TODO should be replaced with real content.
 *
 * Content sourced from zenitha-layout-skeleton.html.
 */

// ─── Navigation ─────────────────────────────────────────────────────

export interface NavItem {
  label: string;
  href: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'About', href: '#about' },
  { label: 'Services', href: '#services' },
  { label: 'Yalla London', href: '#yalla-london' },
  { label: 'Zenitha Yachts', href: '#zenitha-yachts' },
  { label: 'Coming Soon', href: '#coming-soon' },
];

// ─── Hero Stats ─────────────────────────────────────────────────────

export interface HeroStat {
  value: string;
  label: string;
}

export const HERO_STATS: HeroStat[] = [
  { value: 'EN/AR', label: 'Bilingual Focus' },
  { value: '2', label: 'Live Platforms' },
  { value: 'Global', label: 'Travel Audience' },
  { value: '2026', label: 'Growth Year' },
];

// ─── Pillars (About section) ────────────────────────────────────────

export interface Pillar {
  title: string;
  description: string;
}

export const PILLARS: Pillar[] = [
  {
    title: 'Technology First',
    description:
      'Modern web stack (e.g. Next.js, TypeScript, Supabase) for speed, reliability, and global scalability. Actual implementation should align with your existing codebase.',
  },
  {
    title: 'Bilingual by Design',
    description:
      'English and Arabic baked into every experience — the exact language toggle and i18n system are not defined here and must be handled in your product architecture.',
  },
  {
    title: 'Curated Experiences',
    description:
      'Every hotel, itinerary, and recommendation is intentionally selected, not bulk\u2011aggregated. Data sources and partners are not specified in this skeleton.',
  },
  {
    title: 'Privacy & Discretion',
    description:
      'Journeys are designed for users who value subtlety and confidentiality. Concrete privacy guarantees and policies should be taken from your legal docs.',
  },
];

// ─── Service Tabs ───────────────────────────────────────────────────

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

export const SERVICE_TABS: ServiceTab[] = [
  {
    id: 'yalla-london',
    label: 'Yalla London',
    title: 'Yalla London — Luxury City Discovery',
    description:
      'A bilingual (EN/AR) digital guide to London for luxury travellers. This platform focuses on neighbourhood discovery, hotels, restaurants, and shopping areas that align with high\u2011end tastes.',
    // TODO: Replace with real Yalla London hero asset.
    image: '/branding/zenitha-luxury/images/gallery-1.png',
    imageAlt: 'London Luxury Travel',
    items: [
      'Home / landing with hero, sections for hotels, dining, shopping, and seasonal highlights.',
      'Neighbourhood pages (e.g. Mayfair, Knightsbridge, Chelsea) with bilingual content.',
      'Hotel collections by area or theme, using card grids and outbound links / affiliate logic defined in product.',
      'Dining & experience pages for restaurants, afternoon tea, and private tours.',
      'Seasonal pages (e.g. summer in London, winter shopping, major events).',
      'Contact / concierge enquiry flows that connect to your own CRM or email systems.',
    ],
    ctaLabel: 'View Yalla London Structure',
    ctaHref: '#yalla-london',
  },
  {
    id: 'zenitha-yachts',
    label: 'Zenitha Yachts',
    title: 'Zenitha Yachts — Charter Journeys',
    description:
      'A digital front door for yacht charter discovery — focused on itinerary inspiration and enquiry capture across the Mediterranean, Arabian Gulf and Caribbean.',
    // TODO: Replace with real Zenitha Yachts hero asset.
    image: '/branding/zenitha-luxury/images/gallery-4.png',
    imageAlt: 'Yacht Charter Sunset',
    items: [
      'Landing page with regions overview and primary charter enquiry CTA.',
      'Region pages (Mediterranean, Arabian Gulf, Caribbean) with curated content and imagery.',
      'Itinerary inspiration pages (sample 7\u2011day / 10\u2011day routes).',
      'Yacht category pages (motor yachts, sailing yachts, superyachts) using card\u2011based layouts.',
      'Dedicated enquiry forms / modals prepared for later integration with CRM or booking tools.',
    ],
    ctaLabel: 'View Yacht Pages',
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

export const YALLA_LONDON_DETAIL: DetailSection = {
  sectionNumber: '04',
  sectionLabel: 'Yalla London',
  title: 'London, Curated',
  description:
    'Section skeleton for the Yalla London site structure. The actual routing, components, and CMS bindings should follow this model inside your codebase.',
  // TODO: Replace with Yalla London brand image.
  image: '/branding/zenitha-luxury/images/banner.png',
  imageAlt: 'Yalla London Mayfair',
  bullets: [
    'Home / Landing (hero, featured neighbourhoods, hotel & dining highlights).',
    'Neighbourhood pages (e.g. Mayfair, Knightsbridge, Chelsea) with bilingual content.',
    'Hotel collection pages by area/theme with grid cards.',
    'Dining & experiences pages (restaurants, afternoon tea, private tours).',
    'Seasonal / campaign pages (sales, events, cultural moments).',
    'Contact / concierge enquiry page.',
  ],
  footnote:
    'This is a content and page\u2011type sketch only. Use it to design Next.js routes, layout components, and CMS schemas (e.g. Neighbourhood, Collection, SeasonalGuide) in your actual application.',
};

export const ZENITHA_YACHTS_DETAIL: DetailSection = {
  sectionNumber: '05',
  sectionLabel: 'Zenitha Yachts',
  title: 'Journeys at Sea',
  description:
    'Section skeleton for the Zenitha Yachts site. Actual yacht inventory, filters, booking flows, and CRMs are not defined here and must be implemented within your stack.',
  // TODO: Replace with Zenitha Yachts brand image.
  image: '/branding/zenitha-luxury/images/hero-bg.png',
  imageAlt: 'Zenitha Yachts',
  bullets: [
    'Home / Landing (hero, regions overview, key selling points, primary CTA).',
    'Region pages (Mediterranean, Arabian Gulf, Caribbean) with hero, summary, and sectioned content.',
    'Itinerary pages (e.g. "7 days in the Greek Islands") describing sample routes.',
    'Yacht category pages (motor, sailing, superyachts) using card grids.',
    'Charter enquiry page or modular form component that can be integrated with your backend.',
  ],
  footnote:
    'Use this skeleton to define your page tree and core components. Data structures for yachts, regions, pricing, and availability should live in your own models and APIs.',
};

// ─── Contact Ways ───────────────────────────────────────────────────

export interface ContactWay {
  /** Unicode character used as icon */
  icon: string;
  label: string;
  value: string;
  href: string;
}

// TODO: Replace placeholder email and URLs with production details.
export const CONTACT_WAYS: ContactWay[] = [
  {
    icon: '\u2709', // ✉
    label: 'Email',
    value: 'info@example.com',
    href: 'mailto:info@example.com',
  },
  {
    icon: '\u25CA', // ◊
    label: 'Yalla London',
    value: 'yalla-london.com (update to production URL)',
    href: '#',
  },
  {
    icon: '\u266B', // ♫
    label: 'Zenitha Yachts',
    value: 'zenithayachts.co (update to production URL)',
    href: '#',
  },
];

export const ENQUIRY_TYPES = [
  'Hotel / Venue Partnership',
  'Yacht Charter Enquiry',
  'Affiliate Partnership',
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
