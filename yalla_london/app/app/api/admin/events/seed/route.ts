export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";

/**
 * POST /api/admin/events/seed
 * Seeds the Event table with real London attractions and upcoming events.
 * All booking URLs use Travelpayouts affiliate tracking via marker.
 * Idempotent — skips events that already exist (matched by title_en).
 */
export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { prisma } = await import("@/lib/db");
  const marker = process.env.TRAVELPAYOUTS_MARKER || "";
  const tp = (url: string) => marker ? `${url}${url.includes("?") ? "&" : "?"}marker=${marker}&utm_source=yalla-london` : url;

  const siteId = "yalla-london";

  // ═══ PERMANENT ATTRACTIONS (always available, date set far future) ═══
  const attractions: Array<{
    title_en: string; title_ar: string;
    description_en: string; description_ar: string;
    date: Date; time: string; venue: string; category: string;
    price: string; image: string; rating: number;
    bookingUrl: string; affiliateTag: string; ticketProvider: string;
    vipAvailable: boolean;
  }> = [
    {
      title_en: "The London Eye",
      title_ar: "عين لندن",
      description_en: "Iconic 135m observation wheel on the South Bank with stunning 360° views of London's skyline. Skip-the-line tickets available. Best visited at sunset.",
      description_ar: "عجلة مراقبة أيقونية بارتفاع 135 متراً على الضفة الجنوبية مع إطلالات بانورامية رائعة على أفق لندن.",
      date: new Date("2026-12-31"),
      time: "10:00",
      venue: "South Bank, Westminster",
      category: "Attraction",
      price: "From £34",
      image: "https://images.unsplash.com/photo-1520986606214-8b456906c813?w=800&h=600&fit=crop",
      rating: 4.7,
      bookingUrl: tp("https://www.tiqets.com/en/london-c824706/london-eye-l139702/"),
      affiliateTag: "tiqets",
      ticketProvider: "Tiqets",
      vipAvailable: true,
    },
    {
      title_en: "Tower of London",
      title_ar: "برج لندن",
      description_en: "900-year-old castle and UNESCO World Heritage Site. See the Crown Jewels, Beefeater tours, and the famous ravens. Allow 2-3 hours.",
      description_ar: "قلعة عمرها 900 عام وموقع تراث عالمي لليونسكو. شاهد جواهر التاج والجولات مع حراس البرج.",
      date: new Date("2026-12-31"),
      time: "09:00",
      venue: "Tower Hill, EC3N 4AB",
      category: "Attraction",
      price: "From £33.60",
      image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&h=600&fit=crop",
      rating: 4.8,
      bookingUrl: tp("https://www.tiqets.com/en/london-c824706/tower-of-london-l139709/"),
      affiliateTag: "tiqets",
      ticketProvider: "Tiqets",
      vipAvailable: true,
    },
    {
      title_en: "Madame Tussauds London",
      title_ar: "متحف مدام توسو لندن",
      description_en: "World-famous wax museum with lifelike figures of celebrities, royals, sports stars, and cultural icons. Interactive Marvel and Star Wars experiences.",
      description_ar: "متحف الشمع الشهير عالمياً مع تماثيل واقعية للمشاهير والملوك ونجوم الرياضة.",
      date: new Date("2026-12-31"),
      time: "09:30",
      venue: "Marylebone Road, NW1 5LR",
      category: "Attraction",
      price: "From £37",
      image: "https://images.unsplash.com/photo-1584467541268-b040f83be3fd?w=800&h=600&fit=crop",
      rating: 4.5,
      bookingUrl: tp("https://www.tiqets.com/en/london-c824706/madame-tussauds-london-l139684/"),
      affiliateTag: "tiqets",
      ticketProvider: "Tiqets",
      vipAvailable: true,
    },
    {
      title_en: "The View from The Shard",
      title_ar: "إطلالة من ذا شارد",
      description_en: "Western Europe's tallest building at 310m. Visit floors 69-72 for breathtaking views across London. Champagne experience available.",
      description_ar: "أطول مبنى في أوروبا الغربية بارتفاع 310 متر. زر الطوابق 69-72 لمناظر خلابة عبر لندن.",
      date: new Date("2026-12-31"),
      time: "10:00",
      venue: "32 London Bridge Street, SE1 9SG",
      category: "Attraction",
      price: "From £28",
      image: "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800&h=600&fit=crop",
      rating: 4.6,
      bookingUrl: tp("https://www.tiqets.com/en/london-c824706/the-view-from-the-shard-l139706/"),
      affiliateTag: "tiqets",
      ticketProvider: "Tiqets",
      vipAvailable: true,
    },
    {
      title_en: "Westminster Abbey",
      title_ar: "كنيسة وستمنستر",
      description_en: "Gothic masterpiece and coronation church of British monarchs for over 900 years. Final resting place of kings, queens, poets, and scientists.",
      description_ar: "تحفة قوطية وكنيسة تتويج الملوك البريطانيين لأكثر من 900 عام.",
      date: new Date("2026-12-31"),
      time: "09:30",
      venue: "20 Deans Yd, Westminster, SW1P 3PA",
      category: "Attraction",
      price: "From £27",
      image: "https://images.unsplash.com/photo-1579429989289-38dd5a5e8eda?w=800&h=600&fit=crop",
      rating: 4.8,
      bookingUrl: tp("https://www.tiqets.com/en/london-c824706/westminster-abbey-l139712/"),
      affiliateTag: "tiqets",
      ticketProvider: "Tiqets",
      vipAvailable: false,
    },
    {
      title_en: "SEA LIFE London Aquarium",
      title_ar: "أكواريوم سي لايف لندن",
      description_en: "Underwater adventure on the South Bank with sharks, penguins, sea turtles, and tropical fish. Touch pools and immersive ocean tunnel.",
      description_ar: "مغامرة تحت الماء على الضفة الجنوبية مع أسماك القرش والبطاريق والسلاحف البحرية.",
      date: new Date("2026-12-31"),
      time: "10:00",
      venue: "County Hall, Westminster Bridge Rd, SE1 7PB",
      category: "Attraction",
      price: "From £27",
      image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&h=600&fit=crop",
      rating: 4.4,
      bookingUrl: tp("https://www.tiqets.com/en/london-c824706/sea-life-london-aquarium-l139700/"),
      affiliateTag: "tiqets",
      ticketProvider: "Tiqets",
      vipAvailable: false,
    },
    {
      title_en: "Kew Gardens",
      title_ar: "حدائق كيو",
      description_en: "UNESCO World Heritage botanical gardens. 300 acres of stunning landscapes, Victorian glasshouses, treetop walkway, and the world's largest seed collection.",
      description_ar: "حدائق نباتية تراث عالمي لليونسكو. 300 فدان من المناظر الطبيعية والبيوت الزجاجية الفيكتورية.",
      date: new Date("2026-12-31"),
      time: "10:00",
      venue: "Richmond, TW9 3AE",
      category: "Attraction",
      price: "From £19.50",
      image: "https://images.unsplash.com/photo-1585938389612-a552a28d6914?w=800&h=600&fit=crop",
      rating: 4.7,
      bookingUrl: tp("https://www.tiqets.com/en/london-c824706/kew-gardens-l139678/"),
      affiliateTag: "tiqets",
      ticketProvider: "Tiqets",
      vipAvailable: false,
    },
    {
      title_en: "HMS Belfast",
      title_ar: "السفينة الحربية بلفاست",
      description_en: "WWII warship museum moored on the Thames. Explore 9 decks from the engine room to the bridge. Stunning views of Tower Bridge.",
      description_ar: "متحف سفينة حربية من الحرب العالمية الثانية راسية على نهر التايمز. استكشف 9 طوابق.",
      date: new Date("2026-12-31"),
      time: "10:00",
      venue: "The Queen's Walk, SE1 2JH",
      category: "Attraction",
      price: "From £26",
      image: "https://images.unsplash.com/photo-1526129318478-62ed807ebdf9?w=800&h=600&fit=crop",
      rating: 4.6,
      bookingUrl: tp("https://www.tiqets.com/en/london-c824706/hms-belfast-l139671/"),
      affiliateTag: "tiqets",
      ticketProvider: "Tiqets",
      vipAvailable: false,
    },
  ];

  // ═══ UPCOMING EVENTS (sports, theatre, experiences) ═══
  const events = [
    {
      title_en: "The Lion King — West End",
      title_ar: "الأسد الملك — ويست إند",
      description_en: "Disney's award-winning musical at the Lyceum Theatre. Over 110 million people have seen this spectacular show worldwide. Book in advance — sells out fast.",
      description_ar: "مسرحية ديزني الحائزة على جوائز في مسرح ليسيوم. شاهدها أكثر من 110 مليون شخص حول العالم.",
      date: new Date("2026-06-30"),
      time: "19:30",
      venue: "Lyceum Theatre, Wellington Street",
      category: "Theatre",
      price: "From £40",
      image: "https://images.unsplash.com/photo-1503095396549-807759245b35?w=800&h=600&fit=crop",
      rating: 4.9,
      bookingUrl: tp("https://www.ticketnetwork.com/tickets/the-lion-king-tickets"),
      affiliateTag: "ticketnetwork",
      ticketProvider: "TicketNetwork",
      vipAvailable: true,
    },
    {
      title_en: "Wicked — Apollo Victoria Theatre",
      title_ar: "ويكيد — مسرح أبولو فيكتوريا",
      description_en: "The untold story of the Witches of Oz. One of the West End's longest-running and most beloved musicals. Stunning costumes and stage effects.",
      description_ar: "القصة غير المروية لساحرات أوز. واحدة من أطول المسرحيات الموسيقية عرضاً في ويست إند.",
      date: new Date("2026-06-30"),
      time: "19:30",
      venue: "Apollo Victoria Theatre, Wilton Road",
      category: "Theatre",
      price: "From £25",
      image: "https://images.unsplash.com/photo-1507924538820-ede94a04019d?w=800&h=600&fit=crop",
      rating: 4.8,
      bookingUrl: tp("https://www.ticketnetwork.com/tickets/wicked-tickets"),
      affiliateTag: "ticketnetwork",
      ticketProvider: "TicketNetwork",
      vipAvailable: true,
    },
    {
      title_en: "Premier League: Chelsea FC Home Matches",
      title_ar: "الدوري الإنجليزي: مباريات تشيلسي على أرضه",
      description_en: "Watch Premier League football at Stamford Bridge. One of London's most famous clubs. Match day experience packages include stadium tour and hospitality.",
      description_ar: "شاهد كرة القدم في الدوري الإنجليزي في ملعب ستامفورد بريدج. واحد من أشهر الأندية في لندن.",
      date: new Date("2026-05-15"),
      time: "15:00",
      venue: "Stamford Bridge, Fulham Road",
      category: "Football",
      price: "From £60",
      image: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=800&h=600&fit=crop",
      rating: 4.8,
      bookingUrl: tp("https://www.ticketnetwork.com/tickets/chelsea-fc-tickets"),
      affiliateTag: "ticketnetwork",
      ticketProvider: "TicketNetwork",
      vipAvailable: true,
    },
    {
      title_en: "Premier League: Arsenal FC Home Matches",
      title_ar: "الدوري الإنجليزي: مباريات أرسنال على أرضه",
      description_en: "Experience the atmosphere at the Emirates Stadium. Arsenal's modern 60,000-seat home. Halal food available at the stadium.",
      description_ar: "عش الأجواء في ملعب الإمارات. ملعب أرسنال الحديث بسعة 60,000 مقعد. طعام حلال متوفر.",
      date: new Date("2026-05-15"),
      time: "15:00",
      venue: "Emirates Stadium, Holloway Road",
      category: "Football",
      price: "From £55",
      image: "https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=800&h=600&fit=crop",
      rating: 4.7,
      bookingUrl: tp("https://www.ticketnetwork.com/tickets/arsenal-fc-tickets"),
      affiliateTag: "ticketnetwork",
      ticketProvider: "TicketNetwork",
      vipAvailable: true,
    },
    {
      title_en: "Thames River Dinner Cruise",
      title_ar: "عشاء على نهر التايمز",
      description_en: "Luxury dinner cruise past London's illuminated landmarks. 3-course meal, live entertainment, and stunning views of Tower Bridge, the Shard, and Parliament.",
      description_ar: "رحلة عشاء فاخرة عبر معالم لندن المضيئة. وجبة من 3 أطباق وترفيه حي ومناظر خلابة.",
      date: new Date("2026-12-31"),
      time: "19:00",
      venue: "Westminster Pier / Tower Pier",
      category: "Experience",
      price: "From £85",
      image: "https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=800&h=600&fit=crop",
      rating: 4.6,
      bookingUrl: tp("https://www.tiqets.com/en/london-c824706/?q=thames+cruise"),
      affiliateTag: "tiqets",
      ticketProvider: "Tiqets",
      vipAvailable: true,
    },
    {
      title_en: "Warner Bros. Studio Tour — The Making of Harry Potter",
      title_ar: "جولة استوديوهات وارنر بروس — صناعة هاري بوتر",
      description_en: "Step into the real sets, costumes, and props from the Harry Potter film series. Butterbeer, Platform 9¾, Diagon Alley, and the Great Hall.",
      description_ar: "ادخل إلى الديكورات والأزياء الحقيقية من سلسلة أفلام هاري بوتر.",
      date: new Date("2026-12-31"),
      time: "09:00",
      venue: "Leavesden, WD25 7LR (shuttle from Watford)",
      category: "Attraction",
      price: "From £53.50",
      image: "https://images.unsplash.com/photo-1551269901-5c5e14c25df7?w=800&h=600&fit=crop",
      rating: 4.9,
      bookingUrl: tp("https://www.tiqets.com/en/london-c824706/?q=harry+potter"),
      affiliateTag: "tiqets",
      ticketProvider: "Tiqets",
      vipAvailable: true,
    },
    {
      title_en: "London Marathon 2026",
      title_ar: "ماراثون لندن 2026",
      description_en: "The world's most iconic marathon runs from Greenwich to The Mall. Free to watch from many vantage points along the route.",
      description_ar: "أشهر ماراثون في العالم من غرينيتش إلى ذا مول. مجاني للمشاهدة.",
      date: new Date("2026-04-26"),
      time: "09:00",
      venue: "Greenwich to The Mall",
      category: "Experience",
      price: "Free to watch",
      image: "https://images.unsplash.com/photo-1513593771513-7b58b6c4af38?w=800&h=600&fit=crop",
      rating: 4.9,
      bookingUrl: tp("https://www.tiqets.com/en/london-c824706/?q=london+marathon"),
      affiliateTag: "tiqets",
      ticketProvider: "Tiqets",
      vipAvailable: false,
    },
    {
      title_en: "Wimbledon Championships 2026",
      title_ar: "بطولة ويمبلدون 2026",
      description_en: "The world's most prestigious tennis tournament. Strawberries & cream, Henman Hill, and world-class tennis. Ballot or queue for tickets.",
      description_ar: "أعرق بطولة تنس في العالم. فراولة بالكريمة وتلة هينمان وتنس عالمي المستوى.",
      date: new Date("2026-06-29"),
      time: "11:00",
      venue: "All England Club, Church Road, SW19",
      category: "Experience",
      price: "From £80",
      image: "https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=800&h=600&fit=crop",
      rating: 4.9,
      bookingUrl: tp("https://www.ticketnetwork.com/tickets/wimbledon-tickets"),
      affiliateTag: "ticketnetwork",
      ticketProvider: "TicketNetwork",
      vipAvailable: true,
    },
  ];

  const allEvents = [...attractions, ...events];
  let created = 0;
  let skipped = 0;

  for (const evt of allEvents) {
    // Check if already exists (by title_en)
    const existing = await prisma.event.findFirst({
      where: { title_en: evt.title_en, siteId },
    });

    if (existing) {
      // Update existing with latest data (prices, URLs may change)
      await prisma.event.update({
        where: { id: existing.id },
        data: { ...evt, siteId, published: true, updated_at: new Date() },
      });
      skipped++;
    } else {
      await prisma.event.create({
        data: { ...evt, siteId, published: true, featured: evt.rating >= 4.8 },
      });
      created++;
    }
  }

  return NextResponse.json({
    success: true,
    created,
    updated: skipped,
    total: allEvents.length,
    message: `Seeded ${created} new events, updated ${skipped} existing. Total: ${allEvents.length}`,
  });
}
