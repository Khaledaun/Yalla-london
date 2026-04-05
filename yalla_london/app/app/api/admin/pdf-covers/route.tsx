/**
 * PDF Cover Generator — creates branded cover images for PDF guides.
 *
 * Uses the actual Yalla London brand identity:
 * - Boarding pass motif (YALLA + LDN badge + GATE Y · 1st CLASS)
 * - Tricolor bar: Red (#C8322B) | Gold (#C49A2A) | Blue (#3B7EA1)
 * - Stamp seal with double circle and LDN center
 * - Brand colors from destination-themes.ts
 *
 * GET  /api/admin/pdf-covers?siteId=yalla-london
 *      Returns list of available cover templates with preview URLs
 *
 * GET  /api/admin/pdf-covers?generate=true&template=boarding-pass&title=London+Eye&siteId=yalla-london
 *      Generates a 1200x1600 PNG cover image (PDF A4 ratio)
 *
 * POST /api/admin/pdf-covers  { template, title, subtitle, siteId }
 *      Generates cover + saves to MediaAsset DB for reuse
 */

import { ImageResponse } from "next/og";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";
import {
  getDefaultSiteId,
  getSiteConfig,
} from "@/config/sites";

export const runtime = "edge";

// ── Brand Constants ─────────────────────────────────────────────────────────

const BRAND = {
  red: "#C8322B",
  redDark: "#8b1f1c",
  gold: "#C49A2A",
  goldLight: "#d9b938",
  blue: "#3B7EA1",
  charcoal: "#1C1917",
  cream: "#FAF8F4",
  sand: "#D6D0C4",
  stone: "#78716C",
  white: "#FFFFFF",
} as const;

// ── Brand Elements (JSX recreations of SVG brand kit) ───────────────────────

/** Tricolor bar — Red | Gold | Blue (from yalla-color-bar.svg) */
function TricolorBar({ width = 240, height = 6 }: { width?: number; height?: number }) {
  const seg = Math.floor(width / 3.2);
  const gap = Math.floor(width * 0.02);
  return (
    <div style={{ display: "flex", gap: `${gap}px` }}>
      <div style={{ width: `${seg}px`, height: `${height}px`, borderRadius: `${height / 2}px`, background: BRAND.red, display: "flex" }} />
      <div style={{ width: `${seg}px`, height: `${height}px`, borderRadius: `${height / 2}px`, background: BRAND.gold, display: "flex" }} />
      <div style={{ width: `${seg}px`, height: `${height}px`, borderRadius: `${height / 2}px`, background: BRAND.blue, display: "flex" }} />
    </div>
  );
}

/** Stamp seal — double circle with LDN center (from yalla-stamp-seal.svg) */
function StampSeal({ size = 140, color = BRAND.blue }: { size?: number; color?: string }) {
  return (
    <div style={{ width: `${size}px`, height: `${size}px`, borderRadius: "50%", border: `3px solid ${color}`, display: "flex", justifyContent: "center", alignItems: "center", position: "relative" }}>
      <div style={{ width: `${size - 16}px`, height: `${size - 16}px`, borderRadius: "50%", border: `1px solid ${color}40`, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
        <div style={{ fontSize: `${size * 0.1}px`, letterSpacing: "3px", color, fontWeight: 700, display: "flex" }}>YALLA LONDON</div>
        <div style={{ fontSize: `${size * 0.22}px`, fontWeight: 600, letterSpacing: "5px", color, display: "flex" }}>LDN</div>
        <div style={{ fontSize: `${size * 0.07}px`, letterSpacing: "2px", color, display: "flex" }}>GATE Y · 1st CLASS</div>
      </div>
      {/* Accent dots at cardinal points */}
      <div style={{ position: "absolute", left: "-5px", top: "50%", transform: "translateY(-50%)", width: "8px", height: "8px", borderRadius: "50%", background: BRAND.red, display: "flex" }} />
      <div style={{ position: "absolute", right: "-5px", top: "50%", transform: "translateY(-50%)", width: "8px", height: "8px", borderRadius: "50%", background: BRAND.blue, display: "flex" }} />
      <div style={{ position: "absolute", top: "-5px", left: "50%", transform: "translateX(-50%)", width: "8px", height: "8px", borderRadius: "50%", background: BRAND.gold, display: "flex" }} />
    </div>
  );
}

/** The "YALLA" wordmark with LDN badge (simplified from yalla-primary-light.svg) */
function YallaWordmark({ dark = false }: { dark?: boolean }) {
  const fg = dark ? BRAND.white : BRAND.charcoal;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
      <div style={{ fontSize: "48px", fontWeight: 800, letterSpacing: "-1px", color: fg, display: "flex" }}>YALLA</div>
      <div style={{ display: "flex", padding: "6px 14px", border: `2.5px solid ${BRAND.blue}`, borderRadius: "4px", transform: "rotate(-5deg)" }}>
        <div style={{ fontSize: "20px", fontWeight: 600, letterSpacing: "4px", color: BRAND.blue, display: "flex" }}>LDN</div>
      </div>
    </div>
  );
}

/** Boarding pass metadata row — GATE Y · CLASS 1st · TO LONDON */
function BoardingPassMeta({ destination, dark = false }: { destination: string; dark?: boolean }) {
  const label = dark ? BRAND.stone : "rgba(255,255,255,0.5)";
  const value = dark ? BRAND.charcoal : BRAND.white;
  return (
    <div style={{ display: "flex", gap: "50px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <div style={{ fontSize: "11px", letterSpacing: "3px", color: label, display: "flex" }}>GATE</div>
        <div style={{ fontSize: "24px", fontWeight: 700, color: value, display: "flex" }}>Y</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <div style={{ fontSize: "11px", letterSpacing: "3px", color: label, display: "flex" }}>CLASS</div>
        <div style={{ fontSize: "24px", fontWeight: 700, color: value, display: "flex" }}>1st</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <div style={{ fontSize: "11px", letterSpacing: "3px", color: label, display: "flex" }}>TO</div>
        <div style={{ fontSize: "20px", fontWeight: 300, letterSpacing: "6px", color: label, display: "flex" }}>{destination.toUpperCase()}</div>
      </div>
    </div>
  );
}

// ── Cover Templates ─────────────────────────────────────────────────────────

interface CoverTemplate {
  id: string;
  name: string;
  description: string;
  render: (opts: RenderOpts) => React.ReactElement;
}

interface RenderOpts {
  title: string;
  subtitle: string;
  siteName: string;
  primary: string;
  secondary: string;
  accent: string;
  destination: string;
}

const TEMPLATES: CoverTemplate[] = [
  // ── 1. Boarding Pass ──────────────────────────────────────────────
  {
    id: "boarding-pass",
    name: "Boarding Pass",
    description: "Signature Yalla London boarding pass layout with LDN badge",
    render: (o) => (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: BRAND.cream, position: "relative", overflow: "hidden" }}>
        {/* Outer boarding pass border with perforated edge */}
        <div style={{ position: "absolute", top: "30px", left: "30px", right: "30px", bottom: "30px", border: `1.5px solid ${BRAND.charcoal}`, borderRadius: "8px", display: "flex" }} />
        {/* Perforated vertical line (tear line) */}
        <div style={{ position: "absolute", top: "30px", right: "320px", bottom: "30px", borderRight: `2px dashed ${BRAND.sand}`, display: "flex" }} />
        {/* Notch circles at tear line */}
        <div style={{ position: "absolute", top: "22px", right: "312px", width: "16px", height: "16px", borderRadius: "50%", background: BRAND.cream, border: `1.5px solid ${BRAND.charcoal}`, display: "flex" }} />
        <div style={{ position: "absolute", bottom: "22px", right: "312px", width: "16px", height: "16px", borderRadius: "50%", background: BRAND.cream, border: `1.5px solid ${BRAND.charcoal}`, display: "flex" }} />

        {/* Main content area */}
        <div style={{ display: "flex", flexDirection: "column", padding: "80px 60px 60px 60px", flex: 1 }}>
          {/* Logo */}
          <YallaWordmark />
          {/* Tricolor bar */}
          <div style={{ marginTop: "16px", marginBottom: "50px", display: "flex" }}>
            <TricolorBar width={200} height={4} />
          </div>
          {/* Boarding pass meta */}
          <BoardingPassMeta destination={o.destination} dark />
          {/* Divider */}
          <div style={{ width: "100%", height: "1px", background: BRAND.sand, marginTop: "30px", marginBottom: "40px", display: "flex" }} />
          {/* Title section */}
          <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
            <div style={{ fontSize: "16px", letterSpacing: "6px", color: BRAND.red, fontWeight: 600, marginBottom: "20px", display: "flex" }}>LUXURY TRAVEL GUIDE</div>
            <div style={{ fontSize: "72px", fontWeight: 700, lineHeight: 1.08, color: BRAND.charcoal, marginBottom: "20px", display: "flex", flexDirection: "column" }}>{o.title}</div>
            <div style={{ fontSize: "24px", fontWeight: 300, color: BRAND.stone, display: "flex" }}>{o.subtitle}</div>
          </div>
          {/* Bottom — tricolor + stamp */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <TricolorBar width={180} height={4} />
              <div style={{ fontSize: "12px", letterSpacing: "2px", color: BRAND.stone, display: "flex" }}>yalla-london.com</div>
            </div>
          </div>
        </div>

        {/* Right stub — stamp area */}
        <div style={{ position: "absolute", top: "30px", right: "30px", bottom: "30px", width: "280px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
          <StampSeal size={160} />
        </div>
      </div>
    ),
  },

  // ── 2. Red & Gold Editorial ───────────────────────────────────────
  {
    id: "red-gold",
    name: "Red & Gold Editorial",
    description: "Hero gradient with gold accents — signature Yalla London colors",
    render: (o) => (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "80px 70px", background: `linear-gradient(160deg, ${BRAND.red} 0%, ${BRAND.redDark} 50%, #1a0a08 100%)`, color: BRAND.white, position: "relative", overflow: "hidden" }}>
        {/* Gold accent lines */}
        <div style={{ position: "absolute", top: "0", left: "0", right: "0", height: "6px", display: "flex" }}>
          <TricolorBar width={1200} height={6} />
        </div>
        {/* Large watermark Y */}
        <div style={{ position: "absolute", top: "10%", right: "-5%", fontSize: "600px", fontWeight: 800, color: "rgba(196,154,42,0.04)", display: "flex" }}>Y</div>
        {/* Stamp in top-right */}
        <div style={{ position: "absolute", top: "80px", right: "80px", display: "flex", opacity: 0.6 }}>
          <StampSeal size={120} color="rgba(196,154,42,0.5)" />
        </div>
        {/* Logo */}
        <div style={{ display: "flex", marginBottom: "60px" }}>
          <YallaWordmark dark />
        </div>
        {/* Content */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: "14px", letterSpacing: "6px", color: BRAND.gold, fontWeight: 600, marginBottom: "20px", display: "flex" }}>LUXURY TRAVEL GUIDE</div>
          <div style={{ fontSize: "76px", fontWeight: 700, lineHeight: 1.06, marginBottom: "20px", display: "flex", flexDirection: "column" }}>{o.title}</div>
          <div style={{ fontSize: "26px", fontWeight: 300, color: "rgba(255,255,255,0.7)", marginBottom: "50px", display: "flex" }}>{o.subtitle}</div>
          <TricolorBar width={200} height={5} />
          <div style={{ marginTop: "16px", display: "flex" }}>
            <BoardingPassMeta destination={o.destination} />
          </div>
        </div>
      </div>
    ),
  },

  // ── 3. Cream Stamp ────────────────────────────────────────────────
  {
    id: "cream-stamp",
    name: "Cream Stamp",
    description: "Light editorial with passport stamp seal and tricolor accents",
    render: (o) => (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "100px 80px", background: BRAND.cream, color: BRAND.charcoal, position: "relative", overflow: "hidden" }}>
        {/* Double border */}
        <div style={{ position: "absolute", top: "30px", left: "30px", right: "30px", bottom: "30px", border: `2px solid ${BRAND.charcoal}`, display: "flex" }} />
        <div style={{ position: "absolute", top: "36px", left: "36px", right: "36px", bottom: "36px", border: `0.5px solid ${BRAND.sand}`, display: "flex" }} />
        {/* Top tricolor */}
        <div style={{ position: "absolute", top: "50px", left: "50%", transform: "translateX(-50%)", display: "flex" }}>
          <TricolorBar width={300} height={4} />
        </div>
        {/* Content */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" as const }}>
          {/* Logo */}
          <div style={{ marginBottom: "40px", display: "flex" }}>
            <YallaWordmark />
          </div>
          <div style={{ fontSize: "14px", letterSpacing: "8px", color: BRAND.red, fontWeight: 600, marginBottom: "30px", display: "flex" }}>— {o.destination.toUpperCase()} —</div>
          <div style={{ fontSize: "68px", fontWeight: 700, lineHeight: 1.08, marginBottom: "20px", display: "flex", flexDirection: "column", alignItems: "center" }}>{o.title}</div>
          <div style={{ fontSize: "22px", fontWeight: 300, color: BRAND.stone, marginBottom: "50px", display: "flex" }}>{o.subtitle}</div>
          {/* Stamp */}
          <StampSeal size={150} />
        </div>
        {/* Bottom tricolor */}
        <div style={{ position: "absolute", bottom: "50px", left: "50%", transform: "translateX(-50%)", display: "flex" }}>
          <TricolorBar width={300} height={4} />
        </div>
      </div>
    ),
  },

  // ── 4. Thames Blue ────────────────────────────────────────────────
  {
    id: "thames-blue",
    name: "Thames Blue",
    description: "Deep blue Thames-inspired with gold typography",
    render: (o) => (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "80px 70px", background: `linear-gradient(160deg, #0a1628 0%, ${BRAND.blue} 40%, #0a1628 100%)`, color: BRAND.white, position: "relative", overflow: "hidden" }}>
        {/* Tricolor top bar */}
        <div style={{ position: "absolute", top: "0", left: "0", right: "0", height: "6px", display: "flex" }}>
          <TricolorBar width={1200} height={6} />
        </div>
        {/* Faded LONDON watermark */}
        <div style={{ position: "absolute", top: "15%", left: "-3%", fontSize: "180px", fontWeight: 700, color: "rgba(255,255,255,0.03)", letterSpacing: "20px", display: "flex" }}>{o.destination.toUpperCase()}</div>
        {/* Stamp top-right */}
        <div style={{ position: "absolute", top: "70px", right: "70px", display: "flex", opacity: 0.4 }}>
          <StampSeal size={130} color="rgba(196,154,42,0.5)" />
        </div>
        {/* Content */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", marginBottom: "40px" }}>
            <YallaWordmark dark />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "20px" }}>
            <div style={{ width: "40px", height: "2px", background: BRAND.gold, display: "flex" }} />
            <div style={{ fontSize: "14px", letterSpacing: "6px", color: BRAND.gold, fontWeight: 600, display: "flex" }}>LUXURY TRAVEL GUIDE</div>
          </div>
          <div style={{ fontSize: "74px", fontWeight: 700, lineHeight: 1.06, marginBottom: "18px", display: "flex", flexDirection: "column" }}>{o.title}</div>
          <div style={{ fontSize: "24px", fontWeight: 300, color: "rgba(255,255,255,0.6)", marginBottom: "50px", display: "flex" }}>{o.subtitle}</div>
          <TricolorBar width={200} height={4} />
          <div style={{ marginTop: "20px", display: "flex" }}>
            <BoardingPassMeta destination={o.destination} />
          </div>
        </div>
      </div>
    ),
  },

  // ── 5. Magazine Split ─────────────────────────────────────────────
  {
    id: "magazine-split",
    name: "Magazine Split",
    description: "Split panel — dark editorial left, branded accent right with seal",
    render: (o) => (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", overflow: "hidden" }}>
        {/* Left panel — dark */}
        <div style={{ width: "62%", height: "100%", background: `linear-gradient(180deg, ${BRAND.charcoal} 0%, #0a0a0a 100%)`, padding: "80px 50px", display: "flex", flexDirection: "column", color: BRAND.white }}>
          {/* Logo top */}
          <div style={{ display: "flex", marginBottom: "20px" }}>
            <YallaWordmark dark />
          </div>
          <div style={{ display: "flex", marginBottom: "auto" }}>
            <TricolorBar width={180} height={4} />
          </div>
          {/* Title at bottom */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: "14px", letterSpacing: "6px", color: BRAND.gold, fontWeight: 600, marginBottom: "20px", display: "flex" }}>LUXURY TRAVEL GUIDE</div>
            <div style={{ fontSize: "62px", fontWeight: 700, lineHeight: 1.08, marginBottom: "16px", display: "flex", flexDirection: "column" }}>{o.title}</div>
            <div style={{ fontSize: "22px", fontWeight: 300, color: "rgba(255,255,255,0.6)", marginBottom: "30px", display: "flex" }}>{o.subtitle}</div>
            <BoardingPassMeta destination={o.destination} />
          </div>
        </div>
        {/* Right panel — brand gradient */}
        <div style={{ width: "38%", height: "100%", background: `linear-gradient(180deg, ${BRAND.red} 0%, ${BRAND.redDark} 40%, ${BRAND.gold} 100%)`, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
          <StampSeal size={180} color="rgba(255,255,255,0.5)" />
          <div style={{ marginTop: "30px", display: "flex" }}>
            <TricolorBar width={120} height={4} />
          </div>
        </div>
      </div>
    ),
  },

  // ── 6. Charcoal Luxury ────────────────────────────────────────────
  {
    id: "charcoal-luxury",
    name: "Charcoal Luxury",
    description: "Dark charcoal with gold accents and centered stamp",
    render: (o) => (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "80px 70px", background: BRAND.charcoal, color: BRAND.white, position: "relative", overflow: "hidden" }}>
        {/* Gold border frame */}
        <div style={{ position: "absolute", top: "40px", left: "40px", right: "40px", bottom: "40px", border: `1px solid rgba(196,154,42,0.25)`, display: "flex" }} />
        {/* Top section */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", marginBottom: "20px" }}>
            <YallaWordmark dark />
          </div>
          <TricolorBar width={200} height={4} />
        </div>
        {/* Center — stamp + title */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" as const }}>
          <div style={{ marginBottom: "40px", display: "flex" }}>
            <StampSeal size={140} color={BRAND.gold} />
          </div>
          <div style={{ fontSize: "14px", letterSpacing: "6px", color: BRAND.gold, fontWeight: 600, marginBottom: "20px", display: "flex" }}>LUXURY TRAVEL GUIDE</div>
          <div style={{ fontSize: "66px", fontWeight: 700, lineHeight: 1.08, marginBottom: "16px", display: "flex", flexDirection: "column", alignItems: "center" }}>{o.title}</div>
          <div style={{ fontSize: "22px", fontWeight: 300, color: "rgba(255,255,255,0.6)", display: "flex" }}>{o.subtitle}</div>
        </div>
        {/* Bottom */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
          <BoardingPassMeta destination={o.destination} />
          <TricolorBar width={200} height={4} />
        </div>
      </div>
    ),
  },
];

// ── GET handler ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const generate = searchParams.get("generate") === "true";
  const siteId = searchParams.get("siteId") || getDefaultSiteId();
  const config = getSiteConfig(siteId);

  // List mode — return available templates with preview URLs
  if (!generate) {
    const baseUrl = request.nextUrl.origin;
    const templates = TEMPLATES.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      previewUrl: `${baseUrl}/api/admin/pdf-covers?generate=true&template=${t.id}&siteId=${siteId}&title=${encodeURIComponent("Nightlife & Entertainment Guide")}&subtitle=${encodeURIComponent("Your Luxury London Experience")}`,
    }));
    return NextResponse.json({ templates, siteId });
  }

  // Generate mode — return image
  const templateId = searchParams.get("template") || "boarding-pass";
  const title = searchParams.get("title") || config?.name || "Travel Guide";
  const subtitle = searchParams.get("subtitle") || "Your Luxury London Experience";
  const destination = searchParams.get("destination") || config?.destination || "London";

  const template = TEMPLATES.find((t) => t.id === templateId) || TEMPLATES[0];
  const primary = config?.primaryColor || BRAND.charcoal;
  const secondary = config?.secondaryColor || BRAND.red;

  const jsx = template.render({
    title,
    subtitle,
    siteName: config?.name || "Yalla London",
    primary,
    secondary,
    accent: secondary,
    destination,
  });

  return new ImageResponse(jsx, {
    width: 1200,
    height: 1600,
  });
}

// ── POST handler — generate + save to MediaAsset ────────────────────────────

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { template: templateId = "boarding-pass", title, subtitle, siteId: rawSiteId, destination } = body;
    const siteId = rawSiteId || getDefaultSiteId();
    const config = getSiteConfig(siteId);

    // Generate image via internal fetch
    const params = new URLSearchParams({
      generate: "true",
      template: templateId,
      title: title || config?.name || "Travel Guide",
      subtitle: subtitle || "Your Luxury London Experience",
      siteId,
      destination: destination || config?.destination || "London",
    });

    const imgResponse = await fetch(`${request.nextUrl.origin}/api/admin/pdf-covers?${params}`, {
      headers: { cookie: request.headers.get("cookie") || "", authorization: request.headers.get("authorization") || "" },
    });

    if (!imgResponse.ok) {
      return NextResponse.json({ error: "Failed to generate cover image" }, { status: 500 });
    }

    const buffer = Buffer.from(await imgResponse.arrayBuffer());
    const base64 = buffer.toString("base64");

    // Save to MediaAsset DB
    const { prisma } = await import("@/lib/db");
    const slug = `pdf-cover-${templateId}-${Date.now()}`;

    const asset = await prisma.mediaAsset.create({
      data: {
        filename: `${slug}.png`,
        original_name: `${title || "cover"} - ${templateId}.png`,
        mime_type: "image/png",
        file_size: buffer.length,
        width: 1200,
        height: 1600,
        file_type: "image",
        category: "pdf-cover",
        tags: [`pdf-cover`, templateId, siteId],
        site_id: siteId,
        url: `data:image/png;base64,${base64}`,
        cloud_storage_path: `pdf-covers/${slug}.png`,
      },
    });

    return NextResponse.json({
      success: true,
      cover: {
        id: asset.id,
        templateId,
        title: title || config?.name,
        url: `/api/admin/media/${asset.id}`,
        dataUrl: `data:image/png;base64,${base64}`,
        width: 1200,
        height: 1600,
      },
    });
  } catch (err) {
    console.error("[pdf-covers] Generate failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Cover generation failed" },
      { status: 500 },
    );
  }
}
