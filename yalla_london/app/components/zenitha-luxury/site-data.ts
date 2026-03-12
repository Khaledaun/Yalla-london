/**
 * Zenitha.Luxury — Site Content Data
 *
 * All content arrays for the homepage sections.
 * Edit these arrays to update content without touching layout code.
 * Items marked with [PLACEHOLDER] should be replaced with real content.
 */

// ─── Process Steps ──────────────────────────────────────────────────

export interface ProcessStep {
  number: string;
  title: string;
  description: string;
  icon: 'discover' | 'design' | 'build' | 'grow';
}

export const PROCESS_STEPS: ProcessStep[] = [
  {
    number: '01',
    title: 'Discover',
    description:
      'We begin by understanding the destination, the audience, and the opportunity. Deep market research, competitor analysis, and cultural nuance inform every decision before a single line of code is written.',
    icon: 'discover',
  },
  {
    number: '02',
    title: 'Design',
    description:
      'Each brand receives a bespoke visual identity — typography, color palette, photography direction, and user experience tailored to its specific audience and market position.',
    icon: 'design',
  },
  {
    number: '03',
    title: 'Build',
    description:
      'Our shared technology platform powers every brand with enterprise-grade SEO, automated content pipelines, affiliate monetization, and analytics — built once, deployed everywhere.',
    icon: 'build',
  },
  {
    number: '04',
    title: 'Grow',
    description:
      'Continuous optimization through AI-driven content, search performance monitoring, conversion rate testing, and strategic partnerships that compound over time.',
    icon: 'grow',
  },
];

// ─── Values ─────────────────────────────────────────────────────────

export interface Value {
  title: string;
  description: string;
}

export const VALUES: Value[] = [
  {
    title: 'Quality Over Quantity',
    description:
      'Every article, every recommendation, every partnership meets the same uncompromising standard. We would rather publish one exceptional guide than ten mediocre ones.',
  },
  {
    title: 'Authentic Expertise',
    description:
      'First-hand experience drives everything we create. Our content reflects genuine knowledge of each destination — the hidden restaurants, the overlooked neighborhoods, the details only locals know.',
  },
  {
    title: 'Technology as Leverage',
    description:
      'A single powerful platform multiplies the impact of every brand. Shared infrastructure means better SEO, faster content, and more reliable monetization across the entire portfolio.',
  },
  {
    title: 'Long-Term Thinking',
    description:
      'We build brands designed to last decades, not chase trends. Compounding traffic, deepening authority, and expanding partnerships create sustainable value over time.',
  },
  {
    title: 'Cultural Sensitivity',
    description:
      'Serving travelers from the Gulf and beyond requires genuine understanding — of halal needs, family travel preferences, and the luxury standards of our audience.',
  },
  {
    title: 'Radical Transparency',
    description:
      'Every recommendation includes clear affiliate disclosure. Our readers trust us because we never compromise editorial integrity for commission.',
  },
];

// ─── Services ───────────────────────────────────────────────────────

export interface Service {
  title: string;
  description: string;
  icon: 'brand' | 'web' | 'content' | 'seo' | 'affiliate' | 'analytics' | 'automation' | 'consulting' | 'media';
}

export const SERVICES: Service[] = [
  {
    title: 'Brand Creation',
    description:
      'Complete destination brand development — from naming and visual identity to positioning and launch strategy.',
    icon: 'brand',
  },
  {
    title: 'Web Design & Development',
    description:
      'High-performance Next.js websites optimized for speed, SEO, and conversion. Mobile-first, accessible, multilingual.',
    icon: 'web',
  },
  {
    title: 'Content Strategy',
    description:
      'AI-augmented editorial pipelines that produce authentic, SEO-optimized travel content at scale — in English and Arabic.',
    icon: 'content',
  },
  {
    title: 'Search Optimization',
    description:
      'Technical SEO, on-page optimization, schema markup, and indexing automation across Google, Bing, and AI search engines.',
    icon: 'seo',
  },
  {
    title: 'Affiliate Monetization',
    description:
      'Revenue infrastructure with tracked affiliate links, commission attribution, and strategic partner selection per destination.',
    icon: 'affiliate',
  },
  {
    title: 'Analytics & Intelligence',
    description:
      'GA4 integration, Google Search Console monitoring, traffic analysis, and data-driven decision-making dashboards.',
    icon: 'analytics',
  },
  {
    title: 'Marketing Automation',
    description:
      'Automated publishing, social media scheduling, email campaigns, and content distribution across multiple channels.',
    icon: 'automation',
  },
  {
    title: 'Yacht Charter Platform',
    description:
      'Purpose-built charter search, AI-powered yacht matching, inquiry CRM, and broker partnership management.',
    icon: 'consulting',
  },
  {
    title: 'Digital Media',
    description:
      'Design systems, brand kits, video production templates, email builders, and social media content generation.',
    icon: 'media',
  },
];

// ─── Testimonials ───────────────────────────────────────────────────

export interface Testimonial {
  quote: string;
  name: string;
  role: string;
  company: string;
}

/* [PLACEHOLDER] Replace with real testimonials when available */
export const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      'Zenitha transformed our vision into a digital experience that truly represents luxury travel. The attention to cultural detail and SEO performance has been exceptional.',
    name: 'Sarah Al-Rashid',
    role: 'Director of Digital',
    company: 'GCC Travel Group',
  },
  {
    quote:
      'The content quality is outstanding — every article reads like it was written by someone who actually visited these places. That authenticity is what sets Zenitha apart.',
    name: 'James Whitfield',
    role: 'Head of Partnerships',
    company: 'Luxury Hotels Alliance',
  },
  {
    quote:
      'Working with Zenitha has been a masterclass in building travel brands that perform. The technology platform they have built is genuinely impressive.',
    name: 'Fatima Hassan',
    role: 'Brand Manager',
    company: 'Emirates Hospitality',
  },
  {
    quote:
      'From zero to thousands of monthly organic visitors in weeks. Zenitha understands both the technical and creative sides of travel content.',
    name: 'Marco Pellegrini',
    role: 'CEO',
    company: 'Mediterranean Charters Co.',
  },
];

// ─── FAQ ────────────────────────────────────────────────────────────

export interface FAQ {
  question: string;
  answer: string;
}

export const FAQS: FAQ[] = [
  {
    question: 'What is Zenitha.Luxury and what do you do?',
    answer:
      'Zenitha.Luxury LLC is a Delaware-based luxury travel media company. We build and operate a portfolio of destination-specific travel brands — each combining premium editorial content with affiliate monetization. Our brands currently cover London, the Mediterranean (yacht charters), the Maldives, the French Riviera, Istanbul, and Thailand.',
  },
  {
    question: 'How are your travel brands different from typical travel blogs?',
    answer:
      'Three things set us apart: First, each brand is purpose-built for a single destination with deep cultural expertise. Second, our technology platform automates SEO, content optimization, and monetization at enterprise scale. Third, we serve the Gulf and Arab travel market specifically — a $75B+ segment most English-language travel sites ignore.',
  },
  {
    question: 'Do you work with hotels, agencies, or tourism boards?',
    answer:
      'Yes. We partner with hotels, charter companies, experience providers, tourism boards, and affiliate networks. Our brands offer targeted reach to high-intent luxury travelers, particularly from the Gulf region. Contact us at hello@zenitha.luxury to discuss partnership opportunities.',
  },
  {
    question: 'What technology powers your platform?',
    answer:
      'Our platform is built on Next.js with server-side rendering, deployed on Vercel, with a PostgreSQL database. It includes automated content pipelines, 16-check SEO quality gates, AI-powered content generation, multi-engine IndexNow submission, and a full admin dashboard for monitoring performance across all brands.',
  },
  {
    question: 'Are you hiring or looking for contributors?',
    answer:
      'We are always interested in hearing from talented travel writers, photographers, and digital marketing professionals — especially those with first-hand expertise in our destination markets. Reach out at hello@zenitha.luxury with your portfolio.',
  },
];

// ─── Brand Portfolio (used in Portfolio section) ────────────────────

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
    destination: "Côte d'Azur, France",
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

// ─── Navigation ─────────────────────────────────────────────────────

export interface NavItem {
  label: string;
  href: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'About', href: '#about' },
  { label: 'Process', href: '#process' },
  { label: 'Services', href: '#services' },
  { label: 'Portfolio', href: '#portfolio' },
  { label: 'Values', href: '#values' },
  { label: 'Testimonials', href: '#testimonials' },
  { label: 'Contact', href: '#contact' },
];
