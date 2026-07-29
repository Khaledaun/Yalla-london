/**
 * Seed Author Profiles (TeamMember records)
 *
 * Creates featured author profiles for each active site.
 * These are displayed on blog pages for E-E-A-T compliance.
 *
 * Run: npx tsx prisma/seed-authors.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const AUTHORS = [
  {
    // Global editorial team — fallback for all sites
    site_id: null,
    name_en: "Zenitha Editorial Team",
    name_ar: "فريق تحرير زينيثا",
    slug: "zenitha-editorial",
    title_en: "Luxury Travel Content Team",
    title_ar: "فريق محتوى السفر الفاخر",
    bio_en:
      "The Zenitha Editorial Team brings together luxury travel specialists, local insiders, and cultural experts to craft authentic, first-hand guides for discerning Arab travellers. Every recommendation is personally vetted by our team of London residents and seasoned travellers.",
    bio_ar:
      "يجمع فريق تحرير زينيثا بين متخصصي السفر الفاخر والمطلعين المحليين وخبراء الثقافة لإنشاء أدلة أصيلة ومباشرة للمسافرين العرب المميزين. يتم فحص كل توصية شخصياً من قبل فريقنا من سكان لندن والمسافرين المتمرسين.",
    is_featured: false,
    display_order: 10,
  },
  {
    // Yalla London primary author
    site_slug: "yalla-london",
    name_en: "Khaled Aun",
    name_ar: "خالد عون",
    slug: "khaled-aun",
    title_en: "Founder & Editor-in-Chief",
    title_ar: "المؤسس ورئيس التحرير",
    bio_en:
      "Khaled is the founder of Yalla London and a London resident with deep roots in the Arab travel community. With years of experience navigating London's luxury scene — from Mayfair's five-star hotels to hidden halal restaurants in Knightsbridge — he creates guides that combine insider knowledge with authentic, first-hand recommendations. His mission: help Arab travellers experience London like a local, not a tourist.",
    bio_ar:
      "خالد هو مؤسس يلا لندن ومقيم في لندن مع جذور عميقة في مجتمع السفر العربي. بفضل سنوات من الخبرة في التنقل في مشهد لندن الفاخر — من فنادق مايفير الخمس نجوم إلى المطاعم الحلال المخفية في نايتسبريدج — يقدم أدلة تجمع بين المعرفة الداخلية والتوصيات الأصيلة المباشرة.",
    is_featured: true,
    display_order: 1,
    linkedin_url: "https://www.linkedin.com/in/khaledaun",
  },
  {
    // Yalla London secondary author
    site_slug: "yalla-london",
    name_en: "Yalla London Editorial",
    name_ar: "تحرير يلا لندن",
    slug: "yalla-london-editorial",
    title_en: "London Luxury Travel Specialists",
    title_ar: "متخصصون في السفر الفاخر في لندن",
    bio_en:
      "The Yalla London editorial team consists of London-based travel writers and cultural experts who personally visit every venue, restaurant, and experience we recommend. Our guides are built on real visits, honest reviews, and a genuine love for connecting Arab travellers with the best of London.",
    bio_ar:
      "يتكون فريق تحرير يلا لندن من كتاب سفر وخبراء ثقافيين مقيمين في لندن يزورون شخصياً كل مكان ومطعم وتجربة نوصي بها.",
    is_featured: false,
    display_order: 2,
  },
  {
    // Zenitha Yachts primary author
    site_slug: "zenitha-yachts-med",
    name_en: "Zenitha Yachts Concierge",
    name_ar: "كونسيرج زينيثا يخوت",
    slug: "zenitha-yachts-concierge",
    title_en: "Mediterranean Charter Specialists",
    title_ar: "متخصصون في تأجير يخوت البحر المتوسط",
    bio_en:
      "The Zenitha Yachts concierge team brings decades of combined Mediterranean charter experience. We have personally sailed the routes we recommend, inspected the yachts in our fleet, and built relationships with the best crew, captains, and marina staff across the Greek Islands, Turkish Riviera, and French Riviera.",
    bio_ar:
      "يجمع فريق كونسيرج زينيثا يخوت عقوداً من الخبرة المشتركة في تأجير اليخوت في البحر المتوسط. لقد أبحرنا شخصياً في المسارات التي نوصي بها وفحصنا اليخوت في أسطولنا.",
    is_featured: true,
    display_order: 1,
  },
];

async function main() {
  console.log("Seeding author profiles (TeamMember)...\n");

  for (const author of AUTHORS) {
    const { site_slug, ...data } = author as typeof author & { site_slug?: string };

    // Resolve site_id from slug if provided
    let site_id: string | null = data.site_id ?? null;
    if (site_slug) {
      const site = await prisma.site.findUnique({ where: { slug: site_slug } });
      if (site) {
        site_id = site.id;
      } else {
        // Site doesn't exist in DB yet — use null (global)
        console.log(`  Site "${site_slug}" not found in DB, creating as global author`);
        site_id = null;
      }
    }

    // Upsert by slug to be idempotent
    const result = await prisma.teamMember.upsert({
      where: { slug: data.slug },
      update: {
        name_en: data.name_en,
        name_ar: data.name_ar,
        title_en: data.title_en,
        title_ar: data.title_ar,
        bio_en: data.bio_en,
        bio_ar: data.bio_ar,
        is_featured: data.is_featured,
        display_order: data.display_order,
        linkedin_url: (data as Record<string, unknown>).linkedin_url as string | undefined,
        site_id,
      },
      create: {
        name_en: data.name_en,
        name_ar: data.name_ar,
        slug: data.slug,
        title_en: data.title_en,
        title_ar: data.title_ar ?? undefined,
        bio_en: data.bio_en,
        bio_ar: data.bio_ar ?? undefined,
        is_featured: data.is_featured,
        display_order: data.display_order,
        is_active: true,
        linkedin_url: (data as Record<string, unknown>).linkedin_url as string | undefined,
        site_id,
      },
    });

    console.log(`  ${data.is_featured ? "[FEATURED]" : "          "} ${data.name_en} (${data.slug}) → id=${result.id}`);
  }

  console.log(`\nDone! ${AUTHORS.length} author profiles seeded.`);
  console.log("Featured authors will now appear on blog pages for E-E-A-T compliance.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
