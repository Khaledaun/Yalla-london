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
  { label: 'Platforms', href: '#platforms' },
  { label: 'Portfolio', href: '#portfolio' },
  { label: 'Future', href: '#coming-soon' },
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
      'We build, launch and operate our own travel products, then invite partners in where there is strategic fit.',
  },
  {
    title: 'AI\u2011Assisted, Human\u2011Led',
    description:
      'AI accelerates research, personalisation and operations; travel ambassadors and editors decide what actually goes live.',
  },
  {
    title: 'Bilingual & Cross\u2011Market',
    description:
      'We design with English/Arabic and cross\u2011market travellers in mind from day one.',
  },
  {
    title: 'Discreet Luxury Focus',
    description:
      'We specialise in experiences for high\u2011value travellers who expect subtlety, privacy and consistency.',
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
    title: 'Co\u2011build Products',
    description:
      'We co-develop travel products \u2014 from luxury city guides to charter platforms \u2014 with partners who bring distribution, inventory or capital.',
  },
  {
    title: 'White\u2011label & Licensing',
    description:
      'We adapt our AI-assisted discovery and concierge flows to your brand, preserving your voice and guest standards.',
  },
  {
    title: 'Audience & Marketing Access',
    description:
      'We give partners access to targeted audiences via our own vertical brands like Yalla London and Zenitha Yachts.',
  },
  {
    title: 'Insight & Experimentation',
    description:
      'We test new ideas in our portfolio first, then share what works \u2014 from content formats to campaign concepts.',
  },
];

// ─── Ambassador Bullets ─────────────────────────────────────────────

/* Intent: Counter the "just AI content" perception by spotlighting
   real people creating genuine, on-the-ground travel content. */
export const AMBASSADOR_BULLETS: string[] = [
  'On\u2011the\u2011ground footage from real trips and neighbourhood walks.',
  'Local perspectives from ambassadors in key cities and yacht destinations.',
  'Editorial standards that favour lived experience over scraped content.',
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
      'A bilingual (EN/AR) luxury city guide operated by Zenitha Luxury. AI\u2011assisted discovery surfaces the best hotels, dining, and experiences \u2014 every recommendation verified by local experts and travel ambassadors.',
    image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1280&q=80&auto=format',
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
      'A charter discovery and enquiry product within the Zenitha portfolio \u2014 connecting travellers with vetted itineraries across the Mediterranean, Arabian Gulf, and Caribbean.',
    image: 'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=1280&q=80&auto=format',
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

export const GALLERY_ITEMS: GalleryItem[] = [
  {
    image: 'https://images.unsplash.com/photo-1526495124232-a04e1849168c?w=960&q=80&auto=format',
    alt: 'Tower Bridge London at sunset',
    title: 'Tower Bridge',
    subtitle: 'London',
  },
  {
    image: 'https://images.unsplash.com/photo-1530870110042-98b2cb110834?w=960&q=80&auto=format',
    alt: 'Aerial view of yacht sailing the Mediterranean',
    title: 'Mediterranean',
    subtitle: 'Yacht Region',
  },
  {
    image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=960&q=80&auto=format',
    alt: 'Luxury hotel lobby interior',
    title: 'Grand Hotel',
    subtitle: 'London',
  },
  {
    image: 'https://images.unsplash.com/photo-1569263979104-865ab7cd8d13?w=960&q=80&auto=format',
    alt: 'Superyacht at sea',
    title: 'Superyacht',
    subtitle: 'At Sea',
  },
  {
    image: 'https://images.unsplash.com/photo-1631857093457-d2f20e6e6500?w=960&q=80&auto=format',
    alt: 'Champagne service — luxury hospitality',
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
    tag: 'Concept \u2014 Time & Travel',
    // TODO: Define actual domain, product scope, and brand story for Worldtme.
    description:
      'A future Zenitha product exploring the intersection of global time zones and travel planning. Details to be confirmed.',
    faded: false,
  },
  {
    name: '[Future Product]',
    tag: '',
    // TODO: Replace with a real project name or remove this card when the roadmap is confirmed.
    description: 'Placeholder for a future Zenitha product. Details to be confirmed.',
    faded: true,
  },
  {
    name: '[Future Product]',
    tag: '',
    // TODO: Replace with a real project name or remove this card when the roadmap is confirmed.
    description: 'Placeholder for a future Zenitha product. Details to be confirmed.',
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
  sectionLabel: 'Portfolio \u2014 Yalla London',
  title: 'London, Curated',
  description:
    'Yalla London \u2014 a bilingual luxury city guide operated by Zenitha Luxury. It reaches Gulf and international travellers visiting London, giving hotels, restaurants, and experience providers a direct channel to high\u2011value guests.',
  image: 'https://images.unsplash.com/photo-1549294413-26f195200c16?w=1280&q=80&auto=format',
  imageAlt: 'Luxury Mayfair London streetscape',
  bullets: [
    'Neighbourhood guides written and verified by London\u2011based travel ambassadors.',
    'Hotel and dining collections curated from first\u2011hand visits, not aggregated listings.',
    'Seasonal editorial covering events, openings, and cultural moments.',
    'AI\u2011assisted personalisation matching travellers to experiences.',
    'Bilingual (EN/AR) content serving Gulf, European, and global travellers.',
    'Hotels, DMCs, and experience providers can plug into discovery and enquiry flows.',
  ],
  footnote:
    'Yalla London is live at yalla-london.com \u2014 the first product in the Zenitha portfolio.',
};

export const ZENITHA_YACHTS_DETAIL: DetailSection = {
  sectionNumber: '06',
  sectionLabel: 'Portfolio \u2014 Zenitha Yachts',
  title: 'Journeys at Sea',
  description:
    'Zenitha Yachts \u2014 a charter discovery and enquiry product within the Zenitha portfolio. It serves GCC and international travellers looking for yacht routes across the Mediterranean, Arabian Gulf, and Caribbean, connecting yacht brokers directly with qualified enquiries.',
  image: 'https://images.unsplash.com/photo-1605281317010-fe5ffe798166?w=1280&q=80&auto=format',
  imageAlt: 'Luxury yacht at sunset',
  bullets: [
    'Region\u2011based discovery with curated itinerary inspiration.',
    'AI\u2011assisted matching by preferences, group size, and budget.',
    'Vetted charter partners and yacht categories (motor, sailing, superyachts).',
    'Direct enquiry capture with broker integration.',
    'Yacht brokers and charter operators can plug into discovery and enquiry flows.',
  ],
  footnote:
    'Zenitha Yachts is the second product in the portfolio \u2014 extending the studio model into luxury maritime experiences.',
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
  'Audience / Marketing Collaboration',
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
