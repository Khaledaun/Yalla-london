/**
 * Seed 5 Canva design records into the MediaAsset table.
 *
 * Usage:
 *   cd /home/user/Yalla-london/yalla_london/app
 *   npx tsx scripts/seed-canva-designs.ts
 *
 * Prerequisites:
 *   - .env.local (or .env) with DATABASE_URL set
 *   - Prisma client generated (`npx prisma generate`)
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface CanvaDesign {
  filename: string;
  original_name: string;
  url: string;
  mime_type: string;
  file_type: string;
  file_size: number;
  width: number;
  height: number;
  title: string;
  alt_text: string;
  tags: string[];
  site_id: string;
  category: string;
  folder: string;
  cloud_storage_path: string;
  description: string;
  responsive_urls: Record<string, unknown>;
}

const designs: CanvaDesign[] = [
  {
    filename: "yalla-london-og-social-card.png",
    original_name: "Yalla London Social Card",
    url: "https://www.canva.com/d/hCJU1o7oAWD5mrF",
    mime_type: "image/png",
    file_type: "image",
    file_size: 0,
    width: 940,
    height: 788,
    title: "Yalla London Social Card",
    alt_text: "Yalla London branded OG social card for link sharing",
    tags: ["canva", "generated", "brand-kit", "og-image"],
    site_id: "yalla-london",
    category: "marketing",
    folder: "canva/og-images",
    cloud_storage_path: "canva/DAHEtUZnUC0/yalla-london-og-social-card.png",
    description: "OG image for social media link previews",
    responsive_urls: {
      canvaDesignId: "DAHEtUZnUC0",
      editUrl: "https://www.canva.com/d/xIQnw1sDkwb0SWJ",
      viewUrl: "https://www.canva.com/d/hCJU1o7oAWD5mrF",
      downloadUrl:
        "https://export-download.canva.com/ZnUC0/DAHEtUZnUC0/-1/0/0001-5648011693531556308.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAQYCGKMUH5AO7UJ26%2F20260322%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20260322T161415Z&X-Amz-Expires=26440&X-Amz-Signature=fc711ff48b40c50d6ffd6953a8a0b16dcaacddbc0150f13bde601d05952e5efb&X-Amz-SignedHeaders=host%3Bx-amz-expected-bucket-owner&response-expires=Sun%2C%2022%20Mar%202026%2023%3A34%3A55%20GMT",
      designType: "og-image",
    },
  },
  {
    filename: "mayfairs-finest-hotels-instagram.png",
    original_name: "Mayfair's Finest Hotels",
    url: "https://www.canva.com/d/0A9l5o6GM9amLmH",
    mime_type: "image/png",
    file_type: "image",
    file_size: 0,
    width: 1080,
    height: 1080,
    title: "Mayfair's Finest Hotels",
    alt_text: "Instagram post showcasing luxury hotels in Mayfair, London",
    tags: ["canva", "generated", "brand-kit", "instagram"],
    site_id: "yalla-london",
    category: "social-media",
    folder: "canva/instagram",
    cloud_storage_path: "canva/DAHEtaQR13o/mayfairs-finest-hotels-instagram.png",
    description: "Instagram post about Mayfair luxury hotels",
    responsive_urls: {
      canvaDesignId: "DAHEtaQR13o",
      editUrl: "https://www.canva.com/d/3TScbcogyBFMKUT",
      viewUrl: "https://www.canva.com/d/0A9l5o6GM9amLmH",
      designType: "instagram-post",
    },
  },
  {
    filename: "halal-dining-delights-instagram.png",
    original_name: "Halal Dining Delights",
    url: "https://www.canva.com/d/5KhTRBJID3K_Lwg",
    mime_type: "image/png",
    file_type: "image",
    file_size: 0,
    width: 1080,
    height: 1080,
    title: "Halal Dining Delights",
    alt_text: "Instagram post featuring halal dining experiences in London",
    tags: ["canva", "generated", "brand-kit", "instagram"],
    site_id: "yalla-london",
    category: "social-media",
    folder: "canva/instagram",
    cloud_storage_path: "canva/DAHEtYt_maY/halal-dining-delights-instagram.png",
    description: "Instagram post about halal dining in London",
    responsive_urls: {
      canvaDesignId: "DAHEtYt_maY",
      editUrl: "https://www.canva.com/d/Uiq2GRWi-SZp82Y",
      viewUrl: "https://www.canva.com/d/5KhTRBJID3K_Lwg",
      designType: "instagram-post",
    },
  },
  {
    filename: "london-luxury-guide-pdf-cover.png",
    original_name: "London Luxury Guide",
    url: "https://www.canva.com/d/fPVeIbPfjltFUrf",
    mime_type: "image/png",
    file_type: "image",
    file_size: 0,
    width: 595,
    height: 842,
    title: "London Luxury Guide",
    alt_text: "PDF cover design for London Luxury Guide",
    tags: ["canva", "generated", "brand-kit", "pdf-cover"],
    site_id: "yalla-london",
    category: "marketing",
    folder: "canva/pdf-covers",
    cloud_storage_path: "canva/DAHEtd_SJwo/london-luxury-guide-pdf-cover.png",
    description: "PDF cover for the London Luxury Guide",
    responsive_urls: {
      canvaDesignId: "DAHEtd_SJwo",
      editUrl: "https://www.canva.com/d/55d9vwH_UlKu3Ic",
      viewUrl: "https://www.canva.com/d/fPVeIbPfjltFUrf",
      designType: "pdf-cover",
    },
  },
  {
    filename: "london-eye-vip-experience-instagram.png",
    original_name: "London Eye VIP Experience",
    url: "https://www.canva.com/d/HK2j9wd9sdjtUoc",
    mime_type: "image/png",
    file_type: "image",
    file_size: 0,
    width: 1080,
    height: 1080,
    title: "London Eye VIP Experience",
    alt_text: "Instagram post about London Eye VIP experience",
    tags: ["canva", "generated", "brand-kit", "instagram"],
    site_id: "yalla-london",
    category: "social-media",
    folder: "canva/instagram",
    cloud_storage_path: "canva/DAHEtYTQm9I/london-eye-vip-experience-instagram.png",
    description: "Instagram post about the London Eye VIP experience",
    responsive_urls: {
      canvaDesignId: "DAHEtYTQm9I",
      editUrl: "https://www.canva.com/d/NIBlN3xx_qhtlYv",
      viewUrl: "https://www.canva.com/d/HK2j9wd9sdjtUoc",
      designType: "instagram-post",
    },
  },
];

async function main() {
  console.log("Seeding 5 Canva design records into MediaAsset...\n");

  for (const design of designs) {
    // Dedup: skip if a record with the same canvaDesignId already exists
    const existing = await prisma.mediaAsset.findFirst({
      where: {
        tags: { has: "canva" },
        cloud_storage_path: design.cloud_storage_path,
      },
    });

    if (existing) {
      console.log(`SKIP (already exists): ${design.title} [${existing.id}]`);
      continue;
    }

    const record = await prisma.mediaAsset.create({
      data: {
        filename: design.filename,
        original_name: design.original_name,
        cloud_storage_path: design.cloud_storage_path,
        url: design.url,
        file_type: design.file_type,
        mime_type: design.mime_type,
        file_size: design.file_size,
        width: design.width,
        height: design.height,
        alt_text: design.alt_text,
        title: design.title,
        description: design.description,
        tags: design.tags,
        site_id: design.site_id,
        category: design.category,
        folder: design.folder,
        responsive_urls: design.responsive_urls,
      },
    });

    console.log(`CREATED: ${design.title} [${record.id}]`);
  }

  console.log("\nDone. All 5 Canva designs seeded.");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
