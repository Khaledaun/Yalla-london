import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const DESIGNS = [
  {
    filename: "yalla-london-og-social-card.png",
    original_name: "Yalla London Social Card",
    url: "https://www.canva.com/d/hCJU1o7oAWD5mrF",
    mime_type: "image/png",
    file_type: "image",
    file_size: 0,
    width: 940,
    height: 788,
    title: "Yalla London Social Card — OG Image",
    alt_text: "Yalla London branded OG social card for link sharing",
    tags: ["canva", "generated", "brand-kit", "og-image"],
    site_id: "yalla-london",
    category: "marketing",
    folder: "canva-generated",
    cloud_storage_path: "canva/DAHEtUZnUC0",
    description: "OG image for social media link previews. Edit in Canva.",
    responsive_urls: {
      canvaDesignId: "DAHEtUZnUC0",
      editUrl: "https://www.canva.com/d/xIQnw1sDkwb0SWJ",
      viewUrl: "https://www.canva.com/d/hCJU1o7oAWD5mrF",
      designType: "og-image",
    },
  },
  {
    filename: "mayfairs-finest-hotels-instagram.png",
    original_name: "Mayfair's Finest Hotels — Instagram",
    url: "https://www.canva.com/d/0A9l5o6GM9amLmH",
    mime_type: "image/png",
    file_type: "image",
    file_size: 0,
    width: 1080,
    height: 1080,
    title: "Mayfair's Finest Hotels — Instagram Post",
    alt_text: "Instagram post showcasing luxury hotels in Mayfair London",
    tags: ["canva", "generated", "brand-kit", "instagram", "hotels"],
    site_id: "yalla-london",
    category: "social-media",
    folder: "canva-generated",
    cloud_storage_path: "canva/DAHEtaQR13o",
    description: "Instagram post for Top 5 Luxury Hotels in Mayfair article. Edit in Canva.",
    responsive_urls: {
      canvaDesignId: "DAHEtaQR13o",
      editUrl: "https://www.canva.com/d/3TScbcogyBFMKUT",
      viewUrl: "https://www.canva.com/d/0A9l5o6GM9amLmH",
      designType: "instagram-post",
    },
  },
  {
    filename: "halal-dining-delights-instagram.png",
    original_name: "Halal Dining Delights — Instagram",
    url: "https://www.canva.com/d/5KhTRBJID3K_Lwg",
    mime_type: "image/png",
    file_type: "image",
    file_size: 0,
    width: 1080,
    height: 1080,
    title: "Halal Dining Delights — Instagram Post",
    alt_text: "Instagram post about best halal restaurants in London 2026",
    tags: ["canva", "generated", "brand-kit", "instagram", "halal", "restaurants"],
    site_id: "yalla-london",
    category: "social-media",
    folder: "canva-generated",
    cloud_storage_path: "canva/DAHEtYt_maY",
    description: "Instagram post for Best Halal Restaurants article. Edit in Canva.",
    responsive_urls: {
      canvaDesignId: "DAHEtYt_maY",
      editUrl: "https://www.canva.com/d/Uiq2GRWi-SZp82Y",
      viewUrl: "https://www.canva.com/d/5KhTRBJID3K_Lwg",
      designType: "instagram-post",
    },
  },
  {
    filename: "london-luxury-guide-pdf-cover.png",
    original_name: "London Luxury Guide — PDF Cover",
    url: "https://www.canva.com/d/fPVeIbPfjltFUrf",
    mime_type: "image/png",
    file_type: "image",
    file_size: 0,
    width: 595,
    height: 842,
    title: "London Luxury Guide — PDF Cover",
    alt_text: "PDF guide cover for The Ultimate London Luxury Travel Guide 2026",
    tags: ["canva", "generated", "brand-kit", "pdf-cover", "guide"],
    site_id: "yalla-london",
    category: "marketing",
    folder: "canva-generated",
    cloud_storage_path: "canva/DAHEtd_SJwo",
    description: "Cover page for downloadable PDF travel guide. Edit in Canva.",
    responsive_urls: {
      canvaDesignId: "DAHEtd_SJwo",
      editUrl: "https://www.canva.com/d/55d9vwH_UlKu3Ic",
      viewUrl: "https://www.canva.com/d/fPVeIbPfjltFUrf",
      designType: "pdf-cover",
    },
  },
  {
    filename: "london-eye-vip-instagram.png",
    original_name: "London Eye VIP Experience — Instagram",
    url: "https://www.canva.com/d/HK2j9wd9sdjtUoc",
    mime_type: "image/png",
    file_type: "image",
    file_size: 0,
    width: 1080,
    height: 1080,
    title: "London Eye VIP Experience — Instagram Post",
    alt_text: "Instagram post promoting London Eye skip-the-queue VIP experience",
    tags: ["canva", "generated", "brand-kit", "instagram", "london-eye"],
    site_id: "yalla-london",
    category: "social-media",
    folder: "canva-generated",
    cloud_storage_path: "canva/DAHEtYTQm9I",
    description: "Instagram post for London Eye VIP article. Edit in Canva.",
    responsive_urls: {
      canvaDesignId: "DAHEtYTQm9I",
      editUrl: "https://www.canva.com/d/NIBlN3xx_qhtlYv",
      viewUrl: "https://www.canva.com/d/HK2j9wd9sdjtUoc",
      designType: "instagram-post",
    },
  },
];

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { prisma } = await import("@/lib/db");

  const results: { title: string; status: string; id?: string }[] = [];

  for (const design of DESIGNS) {
    // Dedup: skip if already seeded
    const existing = await prisma.mediaAsset.findFirst({
      where: { cloud_storage_path: design.cloud_storage_path },
    });
    if (existing) {
      results.push({ title: design.title, status: "already_exists", id: existing.id });
      continue;
    }

    const record = await prisma.mediaAsset.create({
      data: {
        filename: design.filename,
        original_name: design.original_name,
        url: design.url,
        mime_type: design.mime_type,
        file_type: design.file_type,
        file_size: design.file_size,
        width: design.width,
        height: design.height,
        title: design.title,
        alt_text: design.alt_text,
        tags: design.tags,
        site_id: design.site_id,
        category: design.category,
        folder: design.folder,
        cloud_storage_path: design.cloud_storage_path,
        description: design.description,
        responsive_urls: design.responsive_urls,
      },
    });
    results.push({ title: design.title, status: "created", id: record.id });
  }

  return NextResponse.json({
    success: true,
    message: `${results.filter(r => r.status === "created").length} designs saved, ${results.filter(r => r.status === "already_exists").length} already existed`,
    results,
  });
}

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  return NextResponse.json({
    message: "POST to this endpoint to seed 5 Canva-generated designs into your media library",
    designs: DESIGNS.map(d => ({ title: d.title, canvaDesignId: (d.responsive_urls as Record<string, string>).canvaDesignId, editUrl: (d.responsive_urls as Record<string, string>).editUrl })),
  });
}
