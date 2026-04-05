export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";

/**
 * POST /api/admin/seed-yacht-topics
 *
 * Creates bilingual TopicProposals for Zenitha Yachts (zenitha-yachts-med).
 * Topics cover Mediterranean yacht charter content in both EN and AR.
 * The content-builder picks these up and generates full articles automatically.
 *
 * Targets: Gulf/Arab HNWI charter clients, SEO for yacht charter keywords,
 * halal/family-friendly angle as differentiator.
 */

interface TopicSeed {
  title_en: string;
  title_ar: string;
  primary_keyword: string;
  longtails: string[];
  featured_longtails: string[];
  questions: string[];
  page_type: string;
  intent: string;
  evergreen: boolean;
  authority_links: Array<{ url: string; title: string; sourceDomain: string }>;
}

const YACHT_TOPICS: TopicSeed[] = [
  {
    title_en: "Best Mediterranean Yacht Charter Destinations for 2026",
    title_ar: "أفضل وجهات تأجير اليخوت في البحر المتوسط لعام 2026",
    primary_keyword: "mediterranean yacht charter destinations",
    longtails: [
      "best places to charter a yacht in the mediterranean",
      "top yacht charter destinations europe",
      "greek islands yacht charter itinerary",
      "turkish riviera yacht rental",
      "croatia yacht charter destinations",
      "sardinia yacht charter guide",
    ],
    featured_longtails: [
      "best places to charter a yacht in the mediterranean",
      "greek islands yacht charter itinerary",
    ],
    questions: [
      "What are the best Mediterranean destinations for a yacht charter?",
      "When is the best time to charter a yacht in the Mediterranean?",
      "How much does a week-long Mediterranean yacht charter cost?",
      "Which Greek islands are best for yacht charters?",
    ],
    page_type: "guide",
    intent: "transactional",
    evergreen: true,
    authority_links: [
      { url: "https://www.burgessyachts.com", title: "Burgess Yachts", sourceDomain: "burgessyachts.com" },
      { url: "https://www.charterworld.com", title: "CharterWorld", sourceDomain: "charterworld.com" },
      { url: "https://www.yachtcharterfleet.com", title: "Yacht Charter Fleet", sourceDomain: "yachtcharterfleet.com" },
    ],
  },
  {
    title_en: "Halal Yacht Charter Guide: Family-Friendly Cruising in the Mediterranean",
    title_ar: "دليل تأجير اليخوت الحلال: رحلات بحرية مناسبة للعائلات في المتوسط",
    primary_keyword: "halal yacht charter",
    longtails: [
      "halal catering yacht charter mediterranean",
      "family friendly yacht charter with prayer facilities",
      "alcohol free yacht charter options",
      "arabic speaking crew yacht rental",
      "muslim friendly yacht charter turkey",
      "private yacht charter for arab families",
    ],
    featured_longtails: [
      "halal catering yacht charter mediterranean",
      "private yacht charter for arab families",
    ],
    questions: [
      "Can I get halal catering on a yacht charter?",
      "Which yacht charter companies offer alcohol-free options?",
      "Are there yacht charters with Arabic-speaking crew?",
      "What are the best halal-friendly yacht charter destinations?",
    ],
    page_type: "guide",
    intent: "transactional",
    evergreen: true,
    authority_links: [
      { url: "https://www.halalbooking.com", title: "HalalBooking", sourceDomain: "halalbooking.com" },
      { url: "https://www.boatbookings.com", title: "Boatbookings", sourceDomain: "boatbookings.com" },
      { url: "https://www.yachtcharterfleet.com", title: "Yacht Charter Fleet", sourceDomain: "yachtcharterfleet.com" },
    ],
  },
  {
    title_en: "Motor Yacht vs Sailing Yacht: Which Charter Is Right for You?",
    title_ar: "اليخوت ذات المحركات مقابل اليخوت الشراعية: أيهما يناسبك؟",
    primary_keyword: "motor yacht vs sailing yacht charter",
    longtails: [
      "motor yacht charter pros and cons",
      "sailing yacht charter for beginners",
      "catamaran charter vs monohull",
      "gulet charter mediterranean",
      "luxury motor yacht rental weekly cost",
      "sailing yacht charter with crew",
    ],
    featured_longtails: [
      "motor yacht charter pros and cons",
      "catamaran charter vs monohull",
    ],
    questions: [
      "Is a motor yacht or sailing yacht better for families?",
      "How much more expensive is a motor yacht charter?",
      "What is a gulet and why choose one?",
      "Do I need sailing experience to charter a sailing yacht?",
    ],
    page_type: "guide",
    intent: "info",
    evergreen: true,
    authority_links: [
      { url: "https://www.yachtworld.com", title: "YachtWorld", sourceDomain: "yachtworld.com" },
      { url: "https://www.boatinternational.com", title: "Boat International", sourceDomain: "boatinternational.com" },
      { url: "https://www.charterworld.com", title: "CharterWorld", sourceDomain: "charterworld.com" },
    ],
  },
  {
    title_en: "7-Day Turkish Riviera Yacht Itinerary: Bodrum to Fethiye",
    title_ar: "رحلة يخت 7 أيام على الريفييرا التركية: من بودروم إلى فتحية",
    primary_keyword: "turkish riviera yacht itinerary",
    longtails: [
      "bodrum to fethiye yacht route",
      "blue cruise turkey 7 days",
      "turkey yacht charter itinerary",
      "best stops turkish riviera by yacht",
      "göcek yacht anchorage guide",
      "dalaman to bodrum sailing route",
    ],
    featured_longtails: [
      "bodrum to fethiye yacht route",
      "blue cruise turkey 7 days",
    ],
    questions: [
      "What is the best yacht route along the Turkish Riviera?",
      "How many days do you need for a Turkish blue cruise?",
      "What are the must-visit stops between Bodrum and Fethiye?",
      "Is the Turkish Riviera good for yacht charters in September?",
    ],
    page_type: "itinerary",
    intent: "transactional",
    evergreen: true,
    authority_links: [
      { url: "https://www.turkishculture.org", title: "Turkish Culture Foundation", sourceDomain: "turkishculture.org" },
      { url: "https://www.boatbookings.com", title: "Boatbookings", sourceDomain: "boatbookings.com" },
      { url: "https://www.noonsite.com", title: "Noonsite Sailing Info", sourceDomain: "noonsite.com" },
    ],
  },
  {
    title_en: "How Much Does a Yacht Charter Cost? Complete Pricing Guide 2026",
    title_ar: "كم تكلفة تأجير يخت؟ دليل الأسعار الشامل 2026",
    primary_keyword: "yacht charter cost",
    longtails: [
      "how much to charter a yacht per week",
      "yacht charter cost per day mediterranean",
      "luxury yacht charter price breakdown",
      "all inclusive yacht charter pricing",
      "charter yacht fuel costs",
      "advance provisioning allowance yacht",
    ],
    featured_longtails: [
      "how much to charter a yacht per week",
      "luxury yacht charter price breakdown",
    ],
    questions: [
      "How much does it cost to charter a yacht for a week?",
      "What is included in a yacht charter price?",
      "What is the APA (Advance Provisioning Allowance)?",
      "Are there hidden costs in yacht chartering?",
    ],
    page_type: "guide",
    intent: "info",
    evergreen: false,
    authority_links: [
      { url: "https://www.yachtcharterfleet.com", title: "Yacht Charter Fleet", sourceDomain: "yachtcharterfleet.com" },
      { url: "https://www.burgessyachts.com", title: "Burgess Yachts", sourceDomain: "burgessyachts.com" },
      { url: "https://www.boatinternational.com", title: "Boat International", sourceDomain: "boatinternational.com" },
    ],
  },
  {
    title_en: "Greek Islands Yacht Charter: Cyclades vs Dodecanese vs Ionian",
    title_ar: "تأجير يخت في الجزر اليونانية: كيكلاديس أم دوديكانيز أم أيونية؟",
    primary_keyword: "greek islands yacht charter",
    longtails: [
      "cyclades yacht charter itinerary",
      "dodecanese islands sailing route",
      "ionian islands yacht charter family",
      "best greek islands for yachting",
      "mykonos to santorini yacht route",
      "corfu to zakynthos sailing",
    ],
    featured_longtails: [
      "cyclades yacht charter itinerary",
      "best greek islands for yachting",
    ],
    questions: [
      "Which Greek islands are best for yacht charters?",
      "Is the Cyclades or Ionian better for family yacht charters?",
      "What is the best time of year for a Greek islands yacht charter?",
      "Can you sail from Mykonos to Santorini in one day?",
    ],
    page_type: "guide",
    intent: "transactional",
    evergreen: true,
    authority_links: [
      { url: "https://www.visitgreece.gr", title: "Visit Greece", sourceDomain: "visitgreece.gr" },
      { url: "https://www.yachtcharterfleet.com", title: "Yacht Charter Fleet", sourceDomain: "yachtcharterfleet.com" },
      { url: "https://www.charterworld.com", title: "CharterWorld", sourceDomain: "charterworld.com" },
    ],
  },
  {
    title_en: "First-Time Yacht Charter Checklist: Everything You Need to Know",
    title_ar: "قائمة تأجير اليخت لأول مرة: كل ما تحتاج معرفته",
    primary_keyword: "first time yacht charter guide",
    longtails: [
      "what to pack for a yacht charter",
      "yacht charter etiquette tips",
      "tipping yacht crew how much",
      "yacht charter booking process explained",
      "what to expect on a crewed yacht charter",
      "yacht charter embarkation day checklist",
    ],
    featured_longtails: [
      "what to pack for a yacht charter",
      "yacht charter booking process explained",
    ],
    questions: [
      "What should I pack for a week-long yacht charter?",
      "How much should I tip the yacht crew?",
      "What happens on embarkation day?",
      "Can I bring children on a crewed yacht charter?",
    ],
    page_type: "guide",
    intent: "info",
    evergreen: true,
    authority_links: [
      { url: "https://www.boatinternational.com", title: "Boat International", sourceDomain: "boatinternational.com" },
      { url: "https://www.yachtcharterfleet.com", title: "Yacht Charter Fleet", sourceDomain: "yachtcharterfleet.com" },
      { url: "https://www.superyachttimes.com", title: "SuperYacht Times", sourceDomain: "superyachttimes.com" },
    ],
  },
  {
    title_en: "Croatian Coast Yacht Charter: Dubrovnik to Split Route Guide",
    title_ar: "تأجير يخت على ساحل كرواتيا: دليل الطريق من دوبروفنيك إلى سبليت",
    primary_keyword: "croatia yacht charter",
    longtails: [
      "dubrovnik to split yacht itinerary",
      "best croatian islands for yacht charter",
      "hvar island yacht anchorage",
      "vis island yacht charter hidden gem",
      "kornati islands sailing guide",
      "croatia yacht charter regulations",
    ],
    featured_longtails: [
      "dubrovnik to split yacht itinerary",
      "best croatian islands for yacht charter",
    ],
    questions: [
      "What is the best yacht route along the Croatian coast?",
      "How long does it take to sail from Dubrovnik to Split?",
      "Which Croatian islands are best visited by yacht?",
      "Do I need a permit to charter a yacht in Croatia?",
    ],
    page_type: "itinerary",
    intent: "transactional",
    evergreen: true,
    authority_links: [
      { url: "https://croatia.hr/en-GB", title: "Croatia Tourism", sourceDomain: "croatia.hr" },
      { url: "https://www.noonsite.com", title: "Noonsite Sailing Info", sourceDomain: "noonsite.com" },
      { url: "https://www.boatbookings.com", title: "Boatbookings", sourceDomain: "boatbookings.com" },
    ],
  },
  {
    title_en: "Luxury Yacht Charter for Ramadan and Eid: A Complete Planning Guide",
    title_ar: "تأجير يخت فاخر لرمضان والعيد: دليل التخطيط الشامل",
    primary_keyword: "yacht charter ramadan eid",
    longtails: [
      "ramadan yacht charter itinerary",
      "eid holiday yacht rental mediterranean",
      "iftar on a yacht charter",
      "prayer times yacht charter sailing",
      "muslim friendly yacht charter eid",
      "halal yacht charter during ramadan",
    ],
    featured_longtails: [
      "ramadan yacht charter itinerary",
      "eid holiday yacht rental mediterranean",
    ],
    questions: [
      "Can you observe Ramadan properly on a yacht charter?",
      "What are the best Eid yacht charter destinations?",
      "How do you manage prayer times while sailing?",
      "Do charter crews accommodate Ramadan fasting schedules?",
    ],
    page_type: "guide",
    intent: "transactional",
    evergreen: false,
    authority_links: [
      { url: "https://www.halalbooking.com", title: "HalalBooking", sourceDomain: "halalbooking.com" },
      { url: "https://www.islamicfinder.org", title: "Islamic Finder Prayer Times", sourceDomain: "islamicfinder.org" },
      { url: "https://www.boatbookings.com", title: "Boatbookings", sourceDomain: "boatbookings.com" },
    ],
  },
  {
    title_en: "Superyacht vs Yacht Charter: What's the Difference and Which to Choose?",
    title_ar: "سوبر يخت أم يخت عادي: ما الفرق وأيهما تختار؟",
    primary_keyword: "superyacht vs yacht charter",
    longtails: [
      "superyacht charter cost per week",
      "difference between yacht and superyacht",
      "50 metre yacht charter price",
      "superyacht amenities and features",
      "mega yacht charter with helicopter",
      "superyacht charter crew size",
    ],
    featured_longtails: [
      "superyacht charter cost per week",
      "difference between yacht and superyacht",
    ],
    questions: [
      "What is the difference between a yacht and a superyacht?",
      "How much does it cost to charter a superyacht for a week?",
      "What amenities come with a superyacht charter?",
      "How many crew members are on a superyacht?",
    ],
    page_type: "guide",
    intent: "info",
    evergreen: true,
    authority_links: [
      { url: "https://www.superyachttimes.com", title: "SuperYacht Times", sourceDomain: "superyachttimes.com" },
      { url: "https://www.boatinternational.com", title: "Boat International", sourceDomain: "boatinternational.com" },
      { url: "https://www.burgessyachts.com", title: "Burgess Yachts", sourceDomain: "burgessyachts.com" },
    ],
  },
];

const SITE_ID = "zenitha-yachts-med";

export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const { prisma } = await import("@/lib/db");

    let created = 0;
    let skipped = 0;

    for (const topic of YACHT_TOPICS) {
      // Create EN topic
      const existingEn = await prisma.topicProposal.findFirst({
        where: {
          site_id: SITE_ID,
          primary_keyword: topic.primary_keyword,
          locale: "en",
          status: { in: ["planned", "queued", "ready", "proposed", "generated", "generating"] },
        },
      });

      if (!existingEn) {
        await prisma.topicProposal.create({
          data: {
            site_id: SITE_ID,
            title: topic.title_en,
            locale: "en",
            primary_keyword: topic.primary_keyword,
            longtails: topic.longtails,
            featured_longtails: topic.featured_longtails,
            questions: topic.questions,
            authority_links_json: topic.authority_links,
            intent: topic.intent,
            suggested_page_type: topic.page_type,
            source_weights_json: { source: "admin-seed-yacht", weight: 0.9 },
            status: "ready",
            confidence_score: 0.85,
            evergreen: topic.evergreen,
          },
        });
        created++;
      } else {
        skipped++;
      }

      // Create AR topic
      const existingAr = await prisma.topicProposal.findFirst({
        where: {
          site_id: SITE_ID,
          primary_keyword: topic.primary_keyword,
          locale: "ar",
          status: { in: ["planned", "queued", "ready", "proposed", "generated", "generating"] },
        },
      });

      if (!existingAr) {
        await prisma.topicProposal.create({
          data: {
            site_id: SITE_ID,
            title: topic.title_ar,
            locale: "ar",
            primary_keyword: topic.primary_keyword,
            longtails: topic.longtails,
            featured_longtails: topic.featured_longtails,
            questions: topic.questions,
            authority_links_json: topic.authority_links,
            intent: topic.intent,
            suggested_page_type: topic.page_type,
            source_weights_json: { source: "admin-seed-yacht", weight: 0.9 },
            status: "ready",
            confidence_score: 0.85,
            evergreen: topic.evergreen,
          },
        });
        created++;
      } else {
        skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Created ${created} yacht topics (EN+AR), skipped ${skipped} duplicates. Content-builder will pick these up within 15 minutes.`,
      created,
      skipped,
      total: YACHT_TOPICS.length * 2,
      siteId: SITE_ID,
      nextStep:
        "Content-builder runs every 15 min. Each topic generates a bilingual article. All 10 topics × 2 locales = 20 articles within ~5 hours.",
    });
  } catch (error) {
    console.error("[seed-yacht-topics] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
});
