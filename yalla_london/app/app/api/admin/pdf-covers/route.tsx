/**
 * PDF Cover Generator — creates branded cover images for PDF guides.
 *
 * GET  /api/admin/pdf-covers?siteId=yalla-london
 *      Returns list of available cover templates with preview URLs
 *
 * GET  /api/admin/pdf-covers?generate=true&template=luxury-gold&title=London+Eye&siteId=yalla-london
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

// ── Cover Templates ─────────────────────────────────────────────────────────

interface CoverTemplate {
  id: string;
  name: string;
  description: string;
  /** Build the JSX for this cover design */
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

function darken(hex: string, pct: number): string {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - pct);
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - pct);
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - pct);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

const TEMPLATES: CoverTemplate[] = [
  // ── 1. Luxury Gold ────────────────────────────────────────────────
  {
    id: "luxury-gold",
    name: "Luxury Gold",
    description: "Dark background with gold accent lines and elegant typography",
    render: (o) => (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "80px 60px", background: `linear-gradient(160deg, #0a0a0a 0%, ${darken(o.primary, 40)} 100%)`, color: "white", position: "relative", overflow: "hidden" }}>
        {/* Gold accent lines */}
        <div style={{ position: "absolute", top: "0", left: "0", right: "0", height: "8px", background: "#C49A2A", display: "flex" }} />
        <div style={{ position: "absolute", bottom: "0", left: "0", right: "0", height: "8px", background: "#C49A2A", display: "flex" }} />
        <div style={{ position: "absolute", top: "60px", left: "60px", right: "60px", bottom: "60px", border: "1px solid rgba(196,154,42,0.3)", display: "flex" }} />
        {/* Content */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0px" }}>
          <div style={{ fontSize: "22px", letterSpacing: "6px", color: "#C49A2A", textTransform: "uppercase" as const, marginBottom: "20px", display: "flex" }}>TRAVEL GUIDE</div>
          <div style={{ fontSize: "72px", fontWeight: 700, lineHeight: 1.1, marginBottom: "16px", display: "flex", flexDirection: "column" }}>{o.title}</div>
          <div style={{ fontSize: "28px", fontWeight: 300, opacity: 0.8, marginBottom: "40px", display: "flex" }}>{o.subtitle}</div>
          <div style={{ width: "80px", height: "2px", background: "#C49A2A", marginBottom: "20px", display: "flex" }} />
          <div style={{ fontSize: "20px", letterSpacing: "2px", color: "#C49A2A", display: "flex" }}>{o.siteName}</div>
        </div>
      </div>
    ),
  },

  // ── 2. Minimal White ──────────────────────────────────────────────
  {
    id: "minimal-white",
    name: "Minimal White",
    description: "Clean white background with bold typography and colored accent",
    render: (o) => (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "80px 60px", background: "#FAFAF8", color: "#1a1a1a", position: "relative", overflow: "hidden" }}>
        {/* Colored bar on left */}
        <div style={{ position: "absolute", top: "0", left: "0", bottom: "0", width: "12px", background: o.primary, display: "flex" }} />
        {/* Content */}
        <div style={{ display: "flex", flexDirection: "column", paddingLeft: "40px" }}>
          <div style={{ fontSize: "20px", letterSpacing: "4px", color: o.primary, textTransform: "uppercase" as const, marginBottom: "24px", display: "flex" }}>{o.destination} GUIDE</div>
          <div style={{ fontSize: "76px", fontWeight: 700, lineHeight: 1.08, marginBottom: "20px", color: "#1a1a1a", display: "flex", flexDirection: "column" }}>{o.title}</div>
          <div style={{ fontSize: "26px", fontWeight: 300, color: "#666", marginBottom: "60px", display: "flex" }}>{o.subtitle}</div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ width: "50px", height: "3px", background: o.primary, display: "flex" }} />
            <div style={{ fontSize: "18px", letterSpacing: "3px", color: o.primary, display: "flex" }}>{o.siteName}</div>
          </div>
        </div>
      </div>
    ),
  },

  // ── 3. Gradient Bold ──────────────────────────────────────────────
  {
    id: "gradient-bold",
    name: "Gradient Bold",
    description: "Full gradient background with centered large title",
    render: (o) => (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center" as const, padding: "80px 60px", background: `linear-gradient(135deg, ${o.primary} 0%, ${o.secondary} 100%)`, color: "white", position: "relative", overflow: "hidden" }}>
        {/* Decorative circles */}
        <div style={{ position: "absolute", top: "-100px", right: "-100px", width: "400px", height: "400px", borderRadius: "50%", border: "1px solid rgba(255,255,255,0.1)", display: "flex" }} />
        <div style={{ position: "absolute", bottom: "-150px", left: "-150px", width: "500px", height: "500px", borderRadius: "50%", border: "1px solid rgba(255,255,255,0.08)", display: "flex" }} />
        {/* Content */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ fontSize: "18px", letterSpacing: "8px", textTransform: "uppercase" as const, opacity: 0.7, marginBottom: "30px", display: "flex" }}>TRAVEL GUIDE</div>
          <div style={{ fontSize: "80px", fontWeight: 700, lineHeight: 1.05, marginBottom: "24px", textAlign: "center" as const, display: "flex", flexDirection: "column", alignItems: "center" }}>{o.title}</div>
          <div style={{ fontSize: "24px", fontWeight: 300, opacity: 0.85, marginBottom: "50px", display: "flex" }}>{o.subtitle}</div>
          <div style={{ width: "60px", height: "2px", background: "rgba(255,255,255,0.5)", marginBottom: "20px", display: "flex" }} />
          <div style={{ fontSize: "18px", letterSpacing: "4px", opacity: 0.7, display: "flex" }}>{o.siteName.toUpperCase()}</div>
        </div>
      </div>
    ),
  },

  // ── 4. Magazine Split ─────────────────────────────────────────────
  {
    id: "magazine-split",
    name: "Magazine Split",
    description: "Split layout — dark left panel with content, light right panel with accent",
    render: (o) => (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", overflow: "hidden" }}>
        {/* Left panel — dark */}
        <div style={{ width: "65%", height: "100%", background: `linear-gradient(180deg, #0a0a0a 0%, ${darken(o.primary, 60)} 100%)`, padding: "80px 50px", display: "flex", flexDirection: "column", justifyContent: "flex-end", color: "white" }}>
          <div style={{ fontSize: "18px", letterSpacing: "5px", color: o.secondary, textTransform: "uppercase" as const, marginBottom: "20px", display: "flex" }}>{o.destination}</div>
          <div style={{ fontSize: "64px", fontWeight: 700, lineHeight: 1.1, marginBottom: "16px", display: "flex", flexDirection: "column" }}>{o.title}</div>
          <div style={{ fontSize: "22px", fontWeight: 300, opacity: 0.7, marginBottom: "40px", display: "flex" }}>{o.subtitle}</div>
          <div style={{ fontSize: "16px", letterSpacing: "3px", color: o.secondary, display: "flex" }}>{o.siteName}</div>
        </div>
        {/* Right panel — accent */}
        <div style={{ width: "35%", height: "100%", background: `linear-gradient(180deg, ${o.primary} 0%, ${o.secondary} 100%)`, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
          <div style={{ fontSize: "140px", fontWeight: 700, color: "rgba(255,255,255,0.08)", display: "flex" }}>✦</div>
        </div>
      </div>
    ),
  },

  // ── 5. Stamp Classic ──────────────────────────────────────────────
  {
    id: "stamp-classic",
    name: "Stamp Classic",
    description: "Vintage travel stamp aesthetic with border and seal",
    render: (o) => (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "80px", background: "#F5F0E8", color: "#2a2218", position: "relative", overflow: "hidden" }}>
        {/* Double border */}
        <div style={{ position: "absolute", top: "30px", left: "30px", right: "30px", bottom: "30px", border: `3px solid ${o.primary}`, display: "flex" }} />
        <div style={{ position: "absolute", top: "38px", left: "38px", right: "38px", bottom: "38px", border: `1px solid ${o.primary}40`, display: "flex" }} />
        {/* Content */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" as const }}>
          <div style={{ fontSize: "16px", letterSpacing: "10px", color: o.primary, textTransform: "uppercase" as const, marginBottom: "30px", display: "flex" }}>— {o.destination} —</div>
          <div style={{ fontSize: "68px", fontWeight: 700, lineHeight: 1.1, marginBottom: "20px", color: "#2a2218", display: "flex", flexDirection: "column", alignItems: "center" }}>{o.title}</div>
          <div style={{ width: "120px", height: "2px", background: o.primary, marginBottom: "20px", display: "flex" }} />
          <div style={{ fontSize: "22px", fontWeight: 300, color: "#666", marginBottom: "50px", display: "flex" }}>{o.subtitle}</div>
          {/* Stamp seal */}
          <div style={{ width: "100px", height: "100px", borderRadius: "50%", border: `3px solid ${o.primary}`, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
            <div style={{ fontSize: "11px", letterSpacing: "2px", color: o.primary, display: "flex" }}>CURATED BY</div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: o.primary, display: "flex" }}>{o.siteName}</div>
          </div>
        </div>
      </div>
    ),
  },

  // ── 6. Destination Moody ──────────────────────────────────────────
  {
    id: "destination-moody",
    name: "Destination Moody",
    description: "Dark moody atmosphere with large destination name in background",
    render: (o) => (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "80px 60px", background: `linear-gradient(180deg, #0d0d0d 0%, ${darken(o.primary, 50)} 50%, #0d0d0d 100%)`, color: "white", position: "relative", overflow: "hidden" }}>
        {/* Large watermark destination */}
        <div style={{ position: "absolute", top: "15%", left: "-5%", fontSize: "200px", fontWeight: 700, color: "rgba(255,255,255,0.03)", textTransform: "uppercase" as const, letterSpacing: "20px", display: "flex" }}>{o.destination}</div>
        {/* Content */}
        <div style={{ display: "flex", flexDirection: "column", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
            <div style={{ width: "40px", height: "2px", background: o.secondary, display: "flex" }} />
            <div style={{ fontSize: "16px", letterSpacing: "6px", color: o.secondary, textTransform: "uppercase" as const, display: "flex" }}>EXCLUSIVE GUIDE</div>
          </div>
          <div style={{ fontSize: "72px", fontWeight: 700, lineHeight: 1.1, marginBottom: "16px", display: "flex", flexDirection: "column" }}>{o.title}</div>
          <div style={{ fontSize: "24px", fontWeight: 300, opacity: 0.7, marginBottom: "40px", display: "flex" }}>{o.subtitle}</div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "50%", border: `1px solid ${o.secondary}`, display: "flex", justifyContent: "center", alignItems: "center" }}>
              <div style={{ fontSize: "14px", color: o.secondary, display: "flex" }}>✦</div>
            </div>
            <div style={{ fontSize: "16px", letterSpacing: "3px", color: o.secondary, display: "flex" }}>{o.siteName}</div>
          </div>
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
      previewUrl: `${baseUrl}/api/admin/pdf-covers?generate=true&template=${t.id}&siteId=${siteId}&title=${encodeURIComponent("London Eye Guide")}&subtitle=${encodeURIComponent("Your Complete Guide")}`,
    }));
    return NextResponse.json({ templates, siteId });
  }

  // Generate mode — return image
  const templateId = searchParams.get("template") || "luxury-gold";
  const title = searchParams.get("title") || config?.name || "Travel Guide";
  const subtitle = searchParams.get("subtitle") || "Your Complete Guide";
  const destination = searchParams.get("destination") || config?.destination || "London";

  const template = TEMPLATES.find((t) => t.id === templateId) || TEMPLATES[0];
  const primary = config?.primaryColor || "#1C1917";
  const secondary = config?.secondaryColor || "#C8322B";

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
    const { template: templateId = "luxury-gold", title, subtitle, siteId: rawSiteId, destination } = body;
    const siteId = rawSiteId || getDefaultSiteId();
    const config = getSiteConfig(siteId);

    // Generate image via internal fetch
    const params = new URLSearchParams({
      generate: "true",
      template: templateId,
      title: title || config?.name || "Travel Guide",
      subtitle: subtitle || "Your Complete Guide",
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
        originalFilename: `${title || "cover"} - ${templateId}.png`,
        mimeType: "image/png",
        fileSize: buffer.length,
        width: 1200,
        height: 1600,
        fileType: "image",
        category: "pdf-cover",
        tags: [`pdf-cover`, templateId, siteId],
        siteId,
        url: `data:image/png;base64,${base64}`,
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
