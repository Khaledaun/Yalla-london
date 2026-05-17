/**
 * Tube Map Data Definitions
 *
 * Defines all lines (pipelines), stations (phases), and their positions
 * for the London Underground Agent Observatory.
 *
 * Positions are percentages of the map container (1400x800 internal grid).
 * Lines connect stations with SVG paths.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TubeStation {
  id: string;
  label: string;
  /** Position as percentage of map container */
  x: number;
  y: number;
  /** Maps to ArticleDraft.current_phase or computed status */
  phase?: string;
  /** Which lines pass through this station */
  lineIds: string[];
  /** Is this an interchange where multiple lines meet? */
  isInterchange?: boolean;
  /** Status query for content-matrix API */
  statusQuery?: string;
}

export interface TubeLine {
  id: string;
  name: string;
  /** Default color (overridden by brand profile) */
  color: string;
  /** Ordered station IDs along this line */
  stations: string[];
  /** Data source for populating station counts */
  dataSource: "pipeline" | "seo" | "affiliate" | "quality";
  /** Short description for tooltips */
  description: string;
}

export interface TubeTrain {
  articleId: string;
  title: string;
  currentStation: string;
  lineId: string;
  dwellTimeMs: number;
  status: "moving" | "stopped" | "stuck" | "error";
  localeEn: boolean;
  localeAr: boolean;
  seoScore: number | null;
  wordCount: number | null;
}

// ─── Content Line (Blue) ────────────────────────────────────────────────────
// The main content pipeline: Topics → Published

const CONTENT_STATIONS: TubeStation[] = [
  { id: "c-topics", label: "Topics", x: 3, y: 15, phase: "topics", lineIds: ["content"], statusQuery: "topics" },
  { id: "c-research", label: "Research", x: 13, y: 15, phase: "research", lineIds: ["content"] },
  { id: "c-outline", label: "Outline", x: 23, y: 15, phase: "outline", lineIds: ["content"] },
  { id: "c-drafting", label: "Drafting", x: 33, y: 15, phase: "drafting", lineIds: ["content"] },
  { id: "c-assembly", label: "Assembly", x: 43, y: 15, phase: "assembly", lineIds: ["content"] },
  { id: "c-images", label: "Images", x: 53, y: 15, phase: "images", lineIds: ["content"] },
  { id: "c-seo", label: "SEO", x: 63, y: 15, phase: "seo", lineIds: ["content"] },
  { id: "c-scoring", label: "Scoring", x: 73, y: 15, phase: "scoring", lineIds: ["content"] },
  { id: "c-reservoir", label: "Reservoir", x: 83, y: 15, phase: "reservoir", lineIds: ["content"] },
  {
    id: "published",
    label: "Published",
    x: 93,
    y: 35,
    phase: "published",
    lineIds: ["content", "seo", "affiliate", "quality"],
    isInterchange: true,
  },
];

// ─── SEO Line (Green) ───────────────────────────────────────────────────────
// Post-publish SEO pipeline: Published → Performing

const SEO_STATIONS: TubeStation[] = [
  // Published is shared (defined in content stations)
  { id: "s-meta", label: "Meta Check", x: 83, y: 40, lineIds: ["seo"] },
  { id: "s-links", label: "Link Injection", x: 73, y: 40, lineIds: ["seo"] },
  { id: "s-schema", label: "Schema", x: 63, y: 40, lineIds: ["seo"] },
  { id: "s-indexnow", label: "IndexNow", x: 53, y: 40, lineIds: ["seo"] },
  { id: "s-indexed", label: "Indexed", x: 43, y: 40, lineIds: ["seo"] },
  { id: "s-performing", label: "Performing", x: 33, y: 40, lineIds: ["seo"] },
];

// ─── Affiliate Line (Gold) ──────────────────────────────────────────────────
// Monetization pipeline: Published → Converted

const AFFILIATE_STATIONS: TubeStation[] = [
  // Published is shared
  { id: "a-discovery", label: "Link Discovery", x: 83, y: 60, lineIds: ["affiliate"] },
  { id: "a-injection", label: "Injection", x: 73, y: 60, lineIds: ["affiliate"] },
  { id: "a-tracked", label: "Tracked", x: 63, y: 60, lineIds: ["affiliate"] },
  { id: "a-clicked", label: "Clicked", x: 53, y: 60, lineIds: ["affiliate"] },
  { id: "a-converted", label: "Converted", x: 43, y: 60, lineIds: ["affiliate"] },
];

// ─── Quality Line (Red) ─────────────────────────────────────────────────────
// Quality assurance pipeline: Published → Clean

const QUALITY_STATIONS: TubeStation[] = [
  // Published is shared
  { id: "q-scan", label: "Auto-Fix Scan", x: 83, y: 80, lineIds: ["quality"] },
  { id: "q-thin", label: "Thin Content", x: 73, y: 80, lineIds: ["quality"] },
  { id: "q-broken", label: "Broken Links", x: 63, y: 80, lineIds: ["quality"] },
  { id: "q-dupes", label: "Duplicate Check", x: 53, y: 80, lineIds: ["quality"] },
  { id: "q-clean", label: "Clean", x: 43, y: 80, lineIds: ["quality"] },
];

// ─── All stations (deduplicated) ────────────────────────────────────────────

export const ALL_STATIONS: TubeStation[] = [
  ...CONTENT_STATIONS,
  ...SEO_STATIONS,
  ...AFFILIATE_STATIONS,
  ...QUALITY_STATIONS,
];

// ─── Station lookup map ─────────────────────────────────────────────────────

export const STATION_MAP = new Map<string, TubeStation>(
  ALL_STATIONS.map((s) => [s.id, s])
);

// ─── Line definitions ───────────────────────────────────────────────────────

export const TUBE_LINES: TubeLine[] = [
  {
    id: "content",
    name: "Content Line",
    color: "#3B7EA1",
    stations: [
      "c-topics", "c-research", "c-outline", "c-drafting", "c-assembly",
      "c-images", "c-seo", "c-scoring", "c-reservoir", "published",
    ],
    dataSource: "pipeline",
    description: "Content creation pipeline: Topics through Published",
  },
  {
    id: "seo",
    name: "SEO Line",
    color: "#2D5A3D",
    stations: ["published", "s-meta", "s-links", "s-schema", "s-indexnow", "s-indexed", "s-performing"],
    dataSource: "seo",
    description: "Post-publish SEO optimization and indexing",
  },
  {
    id: "affiliate",
    name: "Affiliate Line",
    color: "#C49A2A",
    stations: ["published", "a-discovery", "a-injection", "a-tracked", "a-clicked", "a-converted"],
    dataSource: "affiliate",
    description: "Affiliate monetization pipeline",
  },
  {
    id: "quality",
    name: "Quality Line",
    color: "#C8322B",
    stations: ["published", "q-scan", "q-thin", "q-broken", "q-dupes", "q-clean"],
    dataSource: "quality",
    description: "Quality assurance and auto-fix pipeline",
  },
];

// ─── Map content-matrix phases to station IDs ───────────────────────────────

export const PHASE_TO_STATION: Record<string, string> = {
  topics: "c-topics",
  research: "c-research",
  outline: "c-outline",
  drafting: "c-drafting",
  assembly: "c-assembly",
  images: "c-images",
  seo: "c-seo",
  scoring: "c-scoring",
  reservoir: "c-reservoir",
  published: "published",
  rejected: "c-topics", // rejected drafts go back to topics conceptually
};

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Get the station after a given station on a line */
export function getNextStation(lineId: string, stationId: string): string | null {
  const line = TUBE_LINES.find((l) => l.id === lineId);
  if (!line) return null;
  const idx = line.stations.indexOf(stationId);
  if (idx < 0 || idx >= line.stations.length - 1) return null;
  return line.stations[idx + 1];
}

/** Get SVG path string between two stations using cubic bezier */
export function getLinePath(fromStation: TubeStation, toStation: TubeStation): string {
  const x1 = fromStation.x;
  const y1 = fromStation.y;
  const x2 = toStation.x;
  const y2 = toStation.y;

  // If stations are on the same horizontal level, use a straight line
  if (Math.abs(y1 - y2) < 2) {
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }

  // For the Published interchange (diagonal connection), use a curve
  const midX = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
}

/** Get line colors for a specific site (uses brand profile overrides) */
export function getLineColors(brandColors?: {
  primary?: string;
  secondary?: string;
  accent?: string;
  highlight?: string;
}): Record<string, string> {
  if (!brandColors) {
    return {
      content: "#3B7EA1",
      seo: "#2D5A3D",
      affiliate: "#C49A2A",
      quality: "#C8322B",
    };
  }
  return {
    content: brandColors.primary ?? "#3B7EA1",
    seo: brandColors.secondary ?? "#2D5A3D",
    affiliate: brandColors.accent ?? "#C49A2A",
    quality: brandColors.highlight ?? "#C8322B",
  };
}
