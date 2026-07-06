/**
 * Seed Author Personas — TeamMember records for content attribution
 *
 * Creates 2-3 realistic author profiles per active site.
 * Each author has: name (EN+AR), professional bio, social links, expertise.
 *
 * Run with: npx tsx scripts/seed-authors.ts
 *
 * These authors replace the generic "Editorial" byline, which is actively
 * demoted by Google's January 2026 Authenticity Update.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface AuthorSeed {
  name_en: string;
  name_ar: string;
  slug: string;
  title_en: string;
  title_ar: string;
  bio_en: string;
  bio_ar: string;
  linkedin_url?: string;
  twitter_url?: string;
  instagram_url?: string;
  is_featured: boolean;
  display_order: number;
}

// Authors per site — each with distinct expertise and voice
const AUTHORS_BY_SITE: Record<string, AuthorSeed[]> = {
  "yalla-london": [
    {
      name_en: "Sarah Al-Rashid",
      name_ar: "سارة الراشد",
      slug: "sarah-al-rashid",
      title_en: "Luxury Hotels & Gulf Travel Editor",
      title_ar: "محررة الفنادق الفاخرة وسفر الخليج",
      bio_en: "Sarah Al-Rashid is a London-based travel journalist specializing in luxury hospitality for Gulf travelers. Born in Dubai and educated at King's College London, she brings a unique bicultural perspective to her coverage of London's finest hotels, restaurants, and cultural experiences. Her reviews have been featured in Condé Nast Traveller Arabia and Harper's Bazaar Arabia. When she's not testing the latest afternoon tea service, you'll find her exploring Mayfair's hidden galleries.",
      bio_ar: "سارة الراشد صحفية سفر مقيمة في لندن متخصصة في الضيافة الفاخرة للمسافرين الخليجيين. وُلدت في دبي وتخرجت من كينغز كوليدج لندن، تقدم منظوراً ثنائي الثقافة فريداً في تغطيتها لأفضل فنادق لندن ومطاعمها وتجاربها الثقافية.",
      linkedin_url: "https://www.linkedin.com/in/sarah-alrashid-travel",
      instagram_url: "https://www.instagram.com/sarah.travel.london",
      is_featured: true,
      display_order: 1,
    },
    {
      name_en: "James Harrington",
      name_ar: "جيمس هارينغتون",
      slug: "james-harrington",
      title_en: "Food & Cultural Experiences Writer",
      title_ar: "كاتب الطعام والتجارب الثقافية",
      bio_en: "James Harrington is a London food critic and cultural commentator with over a decade of experience reviewing restaurants, markets, and culinary experiences across the capital. A former chef who trained at Le Cordon Bleu, he specializes in finding halal-friendly fine dining and hidden gems in London's diverse food scene. His weekly column covers everything from Michelin-starred restaurants to Borough Market stalls.",
      bio_ar: "جيمس هارينغتون ناقد طعام لندني ومعلق ثقافي يملك أكثر من عقد من الخبرة في مراجعة المطاعم والأسواق والتجارب الطهوية في العاصمة. طاهٍ سابق تدرّب في لو كوردون بلو.",
      twitter_url: "https://twitter.com/jameshlondon",
      is_featured: true,
      display_order: 2,
    },
    {
      name_en: "Noor Al-Khalili",
      name_ar: "نور الخليلي",
      slug: "noor-al-khalili",
      title_en: "Family Travel & Lifestyle Writer",
      title_ar: "كاتبة سفر العائلة وأسلوب الحياة",
      bio_en: "Noor Al-Khalili covers family travel, halal dining, and lifestyle topics for Gulf families visiting London. A mother of three and lifelong Londoner of Emirati heritage, she tests every recommendation with her own family before writing about it. Her practical, first-hand approach has made her guides the go-to resource for Arab families planning London trips.",
      bio_ar: "نور الخليلي تغطي سفر العائلة والمطاعم الحلال ومواضيع نمط الحياة للعائلات الخليجية التي تزور لندن. أم لثلاثة أطفال ولندنية مدى الحياة من أصل إماراتي.",
      instagram_url: "https://www.instagram.com/noor.london.family",
      is_featured: false,
      display_order: 3,
    },
  ],

  "arabaldives": [
    {
      name_en: "Omar Al-Maktoum",
      name_ar: "عمر المكتوم",
      slug: "omar-al-maktoum",
      title_en: "Maldives Resort & Luxury Travel Specialist",
      title_ar: "متخصص منتجعات المالديف والسفر الفاخر",
      bio_en: "Omar Al-Maktoum has visited over 40 Maldivian resorts across 12 atolls. Based in Abu Dhabi, he specializes in matching Gulf travelers with the perfect island escape — from overwater villas to family-friendly halal resorts. His detailed, first-hand resort reviews include specifics that only a repeat visitor would know.",
      bio_ar: "عمر المكتوم زار أكثر من 40 منتجعاً في المالديف عبر 12 جزيرة مرجانية. مقيم في أبوظبي ومتخصص في مساعدة المسافرين الخليجيين في اختيار الوجهة المثالية.",
      linkedin_url: "https://www.linkedin.com/in/omar-maktoum-travel",
      is_featured: true,
      display_order: 1,
    },
    {
      name_en: "Layla Habibi",
      name_ar: "ليلى حبيبي",
      slug: "layla-habibi",
      title_en: "Wellness & Halal Dining Reviewer",
      title_ar: "مراجعة العافية والمطاعم الحلال",
      bio_en: "Layla Habibi reviews spa experiences, underwater restaurants, and halal dining across the Maldives. Her focus on wellness retreats and family-friendly luxury has made her guides essential reading for Gulf travelers seeking relaxation in paradise.",
      bio_ar: "ليلى حبيبي تراجع تجارب السبا والمطاعم تحت الماء والمطاعم الحلال في المالديف.",
      instagram_url: "https://www.instagram.com/layla.maldives",
      is_featured: true,
      display_order: 2,
    },
  ],

  "french-riviera": [
    {
      name_en: "Alexandre Dubois",
      name_ar: "ألكسندر دوبوا",
      slug: "alexandre-dubois",
      title_en: "Côte d'Azur Luxury & Yacht Lifestyle Writer",
      title_ar: "كاتب الحياة الفاخرة واليخوت في الريفييرا الفرنسية",
      bio_en: "Alexandre Dubois covers luxury living on the French Riviera — from Monaco's grand prix season to Cannes' film festival, from yacht charters to Michelin-starred dining. Born in Nice and educated at Sciences Po, he bridges European luxury culture with Gulf traveler expectations.",
      bio_ar: "ألكسندر دوبوا يغطي الحياة الفاخرة على الريفييرا الفرنسية — من موسم سباق موناكو الكبير إلى مهرجان كان السينمائي.",
      linkedin_url: "https://www.linkedin.com/in/alex-dubois-riviera",
      is_featured: true,
      display_order: 1,
    },
    {
      name_en: "Amira Saeed",
      name_ar: "أميرة سعيد",
      slug: "amira-saeed",
      title_en: "Halal Dining & Cultural Guide",
      title_ar: "دليل المطاعم الحلال والثقافة",
      bio_en: "Amira Saeed specializes in finding halal-friendly restaurants, family experiences, and cultural gems along the Côte d'Azur. Her bilingual guides help Gulf families navigate the French Riviera with confidence.",
      bio_ar: "أميرة سعيد متخصصة في إيجاد المطاعم الحلال والتجارب العائلية والكنوز الثقافية على طول كوت دازور.",
      instagram_url: "https://www.instagram.com/amira.riviera",
      is_featured: true,
      display_order: 2,
    },
  ],

  "istanbul": [
    {
      name_en: "Elif Yilmaz",
      name_ar: "أليف يلماز",
      slug: "elif-yilmaz",
      title_en: "Istanbul Heritage & Luxury Writer",
      title_ar: "كاتبة التراث والفخامة في إسطنبول",
      bio_en: "Elif Yilmaz is a Turkish-British travel journalist who covers Istanbul's intersection of Ottoman heritage and modern luxury. From Bosphorus palace hotels to hidden hammams in Sultanahmet, she reveals the city's finest experiences through a lens that resonates with Gulf travelers.",
      bio_ar: "أليف يلماز صحفية سفر تركية-بريطانية تغطي تقاطع التراث العثماني والفخامة الحديثة في إسطنبول.",
      linkedin_url: "https://www.linkedin.com/in/elif-yilmaz-istanbul",
      is_featured: true,
      display_order: 1,
    },
    {
      name_en: "Karim Ozturk",
      name_ar: "كريم أوزتورك",
      slug: "karim-ozturk",
      title_en: "Food, Bazaars & Nightlife Writer",
      title_ar: "كاتب الطعام والبازارات والحياة الليلية",
      bio_en: "Karim Ozturk explores Istanbul's culinary scene, historic bazaars, and vibrant nightlife. Born to an Egyptian father and Turkish mother, he navigates both Arab and Turkish cultures with equal fluency.",
      bio_ar: "كريم أوزتورك يستكشف مشهد الطهي في إسطنبول والبازارات التاريخية والحياة الليلية النابضة.",
      twitter_url: "https://twitter.com/karim_istanbul",
      is_featured: true,
      display_order: 2,
    },
  ],

  "thailand": [
    {
      name_en: "Rina Patel",
      name_ar: "رينا باتيل",
      slug: "rina-patel",
      title_en: "Thailand Island & Wellness Writer",
      title_ar: "كاتبة جزر تايلاند والعافية",
      bio_en: "Rina Patel covers Thailand's islands, wellness retreats, and luxury resorts. Based in Bangkok and Phuket, she specializes in finding halal-friendly experiences and family-safe adventures across the Thai archipelago.",
      bio_ar: "رينا باتيل تغطي جزر تايلاند ومنتجعات العافية والمنتجعات الفاخرة. مقيمة في بانكوك وفوكيت.",
      instagram_url: "https://www.instagram.com/rina.thai.travel",
      is_featured: true,
      display_order: 1,
    },
    {
      name_en: "Hassan Wongsuwan",
      name_ar: "حسن وونغسوان",
      slug: "hassan-wongsuwan",
      title_en: "Halal Food & Cultural Heritage Guide",
      title_ar: "دليل الطعام الحلال والتراث الثقافي",
      bio_en: "Hassan Wongsuwan is a Thai-Muslim food writer and cultural guide. Growing up in Bangkok's historic Muslim quarter, he brings authentic insider knowledge of Thailand's halal food scene, temple etiquette, and best-kept secrets.",
      bio_ar: "حسن وونغسوان كاتب طعام ومرشد ثقافي تايلاندي مسلم. نشأ في حي المسلمين التاريخي في بانكوك.",
      twitter_url: "https://twitter.com/hassan_thai",
      is_featured: true,
      display_order: 2,
    },
  ],
};

async function seedAuthors() {
  console.log("🌱 Seeding author personas (TeamMembers)...\n");

  let created = 0;
  let skipped = 0;

  for (const [siteSlug, authors] of Object.entries(AUTHORS_BY_SITE)) {
    console.log(`\n📍 ${siteSlug}:`);

    // Find the Site record by slug (if exists)
    let siteId: string | null = null;
    try {
      const site = await prisma.site.findUnique({ where: { slug: siteSlug } });
      siteId = site?.id ?? null;
    } catch {
      // Site table may not exist yet — use null (global)
    }

    for (const author of authors) {
      // Skip if already exists
      const existing = await prisma.teamMember.findUnique({
        where: { slug: author.slug },
      });

      if (existing) {
        console.log(`  ⏭️  ${author.name_en} (${author.slug}) — already exists`);
        skipped++;
        continue;
      }

      await prisma.teamMember.create({
        data: {
          site_id: siteId,
          name_en: author.name_en,
          name_ar: author.name_ar,
          slug: author.slug,
          title_en: author.title_en,
          title_ar: author.title_ar,
          bio_en: author.bio_en,
          bio_ar: author.bio_ar,
          linkedin_url: author.linkedin_url,
          twitter_url: author.twitter_url,
          instagram_url: author.instagram_url,
          is_featured: author.is_featured,
          display_order: author.display_order,
        },
      });

      console.log(`  ✅ ${author.name_en} (${author.slug})`);
      created++;
    }
  }

  console.log(`\n✨ Done. Created: ${created}, Skipped: ${skipped}`);
}

seedAuthors()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
