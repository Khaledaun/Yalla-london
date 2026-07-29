export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDefaultSiteId, getSiteDomain } from "@/config/sites";

const walks = [
  {
    slug: "royal-london-walking-guide",
    title_en: "The Royal London Walk — Buckingham Palace to Big Ben Self-Guided Tour",
    title_ar: "جولة لندن الملكية سيرًا على الأقدام — من قصر باكنغهام إلى بيغ بن",
    excerpt_en: "Walk through the ceremonial heart of London — from the gates of Buckingham Palace, through St James's Park, past Horse Guards Parade, and finishing at the iconic Houses of Parliament and Big Ben.",
    excerpt_ar: "امشِ عبر قلب لندن الاحتفالي — من بوابات قصر باكنغهام عبر حديقة سانت جيمس ومرورًا بموكب حراس الخيول وانتهاءً بمبنى البرلمان الأيقوني وبيغ بن.",
    featured_image: "https://images.unsplash.com/photo-1529655683826-aba9b3e77383?w=1200&q=80",
    meta_title_en: "Royal London Walking Tour — Buckingham Palace to Big Ben | Yalla London",
    meta_title_ar: "جولة لندن الملكية سيرًا — من قصر باكنغهام إلى بيغ بن | يلّا لندن",
    meta_description_en: "Free self-guided walking tour from Buckingham Palace to Big Ben. 3.2 km, 5 stops, insider tips for the Changing of the Guard, and a downloadable PDF guide.",
    meta_description_ar: "جولة مشي ذاتية مجانية من قصر باكنغهام إلى بيغ بن. 3.2 كم، 5 محطات، ونصائح لتغيير الحراسة.",
    tags: ["walking-tour", "royal-london", "buckingham-palace", "big-ben", "westminster", "self-guided"],
    keywords: ["royal london walk", "buckingham palace walking tour", "london self guided walk", "changing of the guard walk"],
  },
  {
    slug: "south-bank-cultural-mile-walking-guide",
    title_en: "The South Bank Cultural Mile — Tate Modern to Tower Bridge Walking Tour",
    title_ar: "الميل الثقافي على الضفة الجنوبية — من تيت مودرن إلى جسر البرج",
    excerpt_en: "A riverside walk connecting London's greatest free gallery, Shakespeare's Globe, Borough Market, and Tower Bridge — all linked by a Thames-side promenade with stunning City views.",
    excerpt_ar: "جولة على ضفاف النهر تربط أعظم معرض مجاني في لندن، مسرح شكسبير غلوب، سوق بورو، وجسر البرج — مرتبطة بممشى على ضفاف التايمز.",
    featured_image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1200&q=80",
    meta_title_en: "South Bank Walking Tour — Tate Modern to Tower Bridge | Yalla London",
    meta_title_ar: "جولة الضفة الجنوبية — من تيت مودرن إلى جسر البرج | يلّا لندن",
    meta_description_en: "Walk London's South Bank from Tate Modern to Tower Bridge. 4 km, 5 stops including Borough Market. Free guide with insider tips and photography spots.",
    meta_description_ar: "امشِ على الضفة الجنوبية من تيت مودرن إلى جسر البرج. 4 كم، 5 محطات بما فيها سوق بورو.",
    tags: ["walking-tour", "south-bank", "tate-modern", "tower-bridge", "borough-market", "thames"],
    keywords: ["south bank walk london", "tate modern to tower bridge walk", "borough market walking tour", "thames walk"],
  },
  {
    slug: "historic-city-of-london-walking-guide",
    title_en: "The Historic City of London Walk — Tower of London to St Paul's Cathedral",
    title_ar: "جولة مدينة لندن التاريخية — من برج لندن إلى كاتدرائية القديس بولس",
    excerpt_en: "Explore 2,000 years of history in the Square Mile — Roman walls, Norman castles, medieval markets, and Christopher Wren's masterpiece, all connected by hidden alleys most visitors never find.",
    excerpt_ar: "استكشف 2000 عام من التاريخ في الميل المربع — جدران رومانية، قلاع نورمان، أسواق قروسطية، وتحفة كريستوفر رن.",
    featured_image: "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1200&q=80",
    meta_title_en: "Historic City of London Walk — Tower to St Paul's | Yalla London",
    meta_title_ar: "جولة مدينة لندن التاريخية — من البرج إلى القديس بولس | يلّا لندن",
    meta_description_en: "Self-guided walk through the historic City of London. Tower of London, Leadenhall Market, Bank of England, St Paul's. 3.5 km with 5 stops and insider tips.",
    meta_description_ar: "جولة مشي ذاتية عبر مدينة لندن التاريخية. برج لندن، سوق ليدنهال، بنك إنجلترا، القديس بولس.",
    tags: ["walking-tour", "city-of-london", "tower-of-london", "st-pauls", "leadenhall-market", "history"],
    keywords: ["city of london walk", "tower of london walking tour", "st pauls cathedral walk", "historic london walk"],
  },
  {
    slug: "notting-hill-kensington-walking-guide",
    title_en: "Notting Hill to Kensington Walk — Portobello Road to the Royal Museums",
    title_ar: "من نوتينغ هيل إلى كنسينغتون — من بورتوبيلو رود إلى المتاحف الملكية",
    excerpt_en: "From the colourful antique stalls of Portobello Road to the grand museums of South Kensington — through pastel-coloured houses, hidden garden squares, and Kensington Palace.",
    excerpt_ar: "من أكشاك التحف الملونة في بورتوبيلو رود إلى متاحف جنوب كنسينغتون الكبرى — عبر منازل ملونة وحدائق مخفية وقصر كنسينغتون.",
    featured_image: "https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=1200&q=80",
    meta_title_en: "Notting Hill to Kensington Walk — Portobello to V&A | Yalla London",
    meta_title_ar: "من نوتينغ هيل إلى كنسينغتون — بورتوبيلو إلى V&A | يلّا لندن",
    meta_description_en: "Walk from Portobello Road to the V&A Museum. 4.5 km through Notting Hill's colourful streets, Kensington Palace, and London's best free museums.",
    meta_description_ar: "امشِ من بورتوبيلو رود إلى متحف V&A. 4.5 كم عبر شوارع نوتينغ هيل الملونة وقصر كنسينغتون.",
    tags: ["walking-tour", "notting-hill", "kensington", "portobello-road", "museums", "kensington-palace"],
    keywords: ["notting hill walk", "portobello road walking tour", "kensington walking guide", "notting hill to south kensington"],
  },
  {
    slug: "east-london-creative-quarter-walking-guide",
    title_en: "East London Creative Quarter — Shoreditch to Brick Lane Street Art Walk",
    title_ar: "الحي الإبداعي في شرق لندن — جولة فن الشارع من شورديتش إلى بريك لين",
    excerpt_en: "Discover London's creative pulse — world-class street art, Brick Lane's curry houses, vintage markets, and the independent coffee shops that made Shoreditch Britain's coolest neighbourhood.",
    excerpt_ar: "اكتشف نبض لندن الإبداعي — فن الشارع العالمي، مطاعم الكاري في بريك لين، أسواق عتيقة، والمقاهي المستقلة.",
    featured_image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1200&q=80",
    meta_title_en: "East London Walking Tour — Shoreditch Street Art & Brick Lane | Yalla London",
    meta_title_ar: "جولة شرق لندن — فن الشارع في شورديتش وبريك لين | يلّا لندن",
    meta_description_en: "Self-guided walk through Shoreditch and Brick Lane. Street art trail, Borough Market, vintage shopping, and London's coolest cafés. 3.8 km, 5 stops.",
    meta_description_ar: "جولة مشي ذاتية عبر شورديتش وبريك لين. مسار فن الشارع، التسوق العتيق، وأروع مقاهي لندن.",
    tags: ["walking-tour", "east-london", "shoreditch", "brick-lane", "street-art", "markets"],
    keywords: ["shoreditch walk", "brick lane walking tour", "east london street art walk", "shoreditch to brick lane"],
  },
];

export async function POST(request: NextRequest) {
  // Require admin auth
  const { requireAdmin } = await import("@/lib/admin-middleware");
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");
    const siteId = getDefaultSiteId();

    // Find or create "Walking Guides" category
    let category = await prisma.category.findFirst({
      where: { slug: "walking-guides" },
    });
    if (!category) {
      category = await prisma.category.create({
        data: {
          name_en: "Walking Guides",
          name_ar: "أدلة المشي",
          slug: "walking-guides",
          description_en: "Self-guided walking tours across London",
          description_ar: "جولات مشي ذاتية عبر لندن",
        },
      });
    }

    // Find or create system author
    let author = await prisma.user.findFirst({
      where: { email: `system@${getSiteDomain(getDefaultSiteId()).replace(/^https?:\/\/(www\.)?/, '')}` },
    });
    if (!author) {
      author = await prisma.user.findFirst({
        where: { role: "ADMIN" },
      });
    }
    if (!author) {
      return NextResponse.json(
        { error: "No admin user found — create one via /admin/setup first" },
        { status: 400 }
      );
    }

    const results = [];
    for (const walk of walks) {
      // Check if already exists
      const existing = await prisma.blogPost.findFirst({
        where: { slug: walk.slug, siteId },
      });
      if (existing) {
        results.push({ slug: walk.slug, status: "already_exists", id: existing.id });
        continue;
      }

      // Build rich HTML content from the walk data
      const contentEn = `<p>${walk.excerpt_en}</p><p>Read the complete interactive guide with map, photos, and insider tips at <a href="/london-by-foot/${walk.slug.replace("-walking-guide", "")}">/london-by-foot</a>.</p>`;
      const contentAr = `<p>${walk.excerpt_ar}</p><p>اقرأ الدليل التفاعلي الكامل مع الخريطة والصور والنصائح في <a href="/london-by-foot/${walk.slug.replace("-walking-guide", "")}">/london-by-foot</a>.</p>`;

      const post = await prisma.blogPost.create({
        data: {
          title_en: walk.title_en,
          title_ar: walk.title_ar,
          slug: walk.slug,
          excerpt_en: walk.excerpt_en,
          excerpt_ar: walk.excerpt_ar,
          content_en: contentEn,
          content_ar: contentAr,
          featured_image: walk.featured_image,
          published: true,
          category_id: category.id,
          author_id: author.id,
          meta_title_en: walk.meta_title_en,
          meta_title_ar: walk.meta_title_ar,
          meta_description_en: walk.meta_description_en,
          meta_description_ar: walk.meta_description_ar,
          tags: walk.tags,
          page_type: "guide",
          siteId,
          keywords_json: { primary: walk.keywords, longtails: walk.keywords },
          seo_score: 85,
        },
      });

      results.push({ slug: walk.slug, status: "created", id: post.id });
    }

    return NextResponse.json({
      success: true,
      message: `Seeded ${results.filter(r => r.status === "created").length} walking guides, ${results.filter(r => r.status === "already_exists").length} already existed`,
      results,
    });
  } catch (error) {
    console.warn("[seed-walks] Error seeding walking guides:", error);
    return NextResponse.json(
      { error: "Failed to seed walking guides" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    endpoint: "POST /api/admin/seed-walks",
    description: "Seeds 5 London by Foot walking guide articles into BlogPost table for the content pipeline",
    walks: walks.map(w => ({ slug: w.slug, title: w.title_en })),
  });
}
