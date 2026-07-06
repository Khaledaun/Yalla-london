export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";

/**
 * POST /api/admin/seed-topics
 *
 * Creates a batch of bilingual TopicProposals for Yalla London.
 * The content-builder (every 15 min) picks these up and generates
 * full articles in both EN + AR automatically.
 *
 * Each topic is designed for high affiliate revenue potential.
 */

interface TopicSeed {
  title: string;
  primary_keyword: string;
  longtails: string[];
  featured_longtails: string[];
  questions: string[];
  page_type: string;
  intent: string;
  evergreen: boolean;
  authority_links: Array<{ url: string; title: string; sourceDomain: string }>;
}

const TOPICS: TopicSeed[] = [
  {
    title: "Best Halal Restaurants in London 2026: A Complete Guide for Arab Visitors",
    primary_keyword: "halal restaurants london",
    longtails: [
      "best halal restaurants in london for families",
      "luxury halal dining london",
      "halal fine dining mayfair",
      "halal steak restaurants london",
      "halal brunch spots london",
      "late night halal food london",
    ],
    featured_longtails: ["luxury halal dining london", "halal fine dining mayfair"],
    questions: [
      "What are the best halal restaurants in Central London?",
      "Where can I find luxury halal dining in Mayfair?",
      "Are there halal options at famous London restaurants?",
      "What halal restaurants are near London tourist attractions?",
    ],
    page_type: "guide",
    intent: "transactional",
    evergreen: true,
    authority_links: [
      { url: "https://www.thefork.co.uk", title: "TheFork London Restaurants", sourceDomain: "thefork.co.uk" },
      { url: "https://www.visitlondon.com/things-to-do/food-and-drink", title: "Visit London Food Guide", sourceDomain: "visitlondon.com" },
      { url: "https://www.halalgems.com", title: "Halal Gems Directory", sourceDomain: "halalgems.com" },
    ],
  },
  {
    title: "Top 10 Luxury Hotels in London for Arab Families (2026)",
    primary_keyword: "luxury hotels london arab families",
    longtails: [
      "best 5 star hotels london for arab guests",
      "london hotels with arabic speaking staff",
      "halal friendly hotels london",
      "family suites luxury hotels london",
      "hotels near harrods london",
      "london hotels with prayer facilities",
    ],
    featured_longtails: ["best 5 star hotels london for arab guests", "halal friendly hotels london"],
    questions: [
      "Which London hotels cater to Arab families?",
      "Do luxury hotels in London offer halal room service?",
      "What are the best family suites in 5-star London hotels?",
      "Which London hotels have Arabic-speaking concierge?",
    ],
    page_type: "list",
    intent: "transactional",
    evergreen: true,
    authority_links: [
      { url: "https://www.booking.com/city/gb/london.html", title: "Booking.com London Hotels", sourceDomain: "booking.com" },
      { url: "https://www.thetimes.co.uk/travel", title: "The Times Travel", sourceDomain: "thetimes.co.uk" },
      { url: "https://www.cntraveller.com", title: "Condé Nast Traveller", sourceDomain: "cntraveller.com" },
    ],
  },
  {
    title: "London Shopping Guide: Harrods, Selfridges & Oxford Street for Arab Visitors",
    primary_keyword: "london shopping guide arab visitors",
    longtails: [
      "harrods shopping guide for arab tourists",
      "best luxury brands oxford street",
      "tax free shopping london",
      "selfridges personal shopping arabic",
      "london outlet shopping guide",
      "where to buy gold jewellery london",
    ],
    featured_longtails: ["harrods shopping guide for arab tourists", "tax free shopping london"],
    questions: [
      "How does tax-free shopping work in London?",
      "Does Harrods have Arabic-speaking personal shoppers?",
      "What are the best times to shop in London for sales?",
      "Where can Arab visitors find modest fashion in London?",
    ],
    page_type: "guide",
    intent: "transactional",
    evergreen: true,
    authority_links: [
      { url: "https://www.harrods.com", title: "Harrods Official", sourceDomain: "harrods.com" },
      { url: "https://www.selfridges.com", title: "Selfridges Official", sourceDomain: "selfridges.com" },
      { url: "https://www.visitlondon.com/things-to-do/shopping", title: "Visit London Shopping", sourceDomain: "visitlondon.com" },
    ],
  },
  {
    title: "Complete Guide to London Airport Transfers: Heathrow, Gatwick & Beyond",
    primary_keyword: "london airport transfer guide",
    longtails: [
      "heathrow to central london best route",
      "private airport transfer london arabic driver",
      "gatwick express vs taxi london",
      "heathrow terminal 5 to mayfair",
      "london city airport to canary wharf",
      "cheapest airport transfer heathrow",
    ],
    featured_longtails: ["heathrow to central london best route", "private airport transfer london arabic driver"],
    questions: [
      "What is the fastest way from Heathrow to Central London?",
      "How much does a private transfer from Heathrow cost?",
      "Can I book an Arabic-speaking driver from the airport?",
      "Is the Heathrow Express worth the price?",
    ],
    page_type: "guide",
    intent: "transactional",
    evergreen: true,
    authority_links: [
      { url: "https://www.heathrow.com", title: "Heathrow Airport Official", sourceDomain: "heathrow.com" },
      { url: "https://www.blacklane.com/en/london", title: "Blacklane London Transfers", sourceDomain: "blacklane.com" },
      { url: "https://tfl.gov.uk", title: "Transport for London", sourceDomain: "tfl.gov.uk" },
    ],
  },
  {
    title: "Premier League Match Day Guide: How to Watch Football in London",
    primary_keyword: "premier league match day guide london",
    longtails: [
      "how to buy premier league tickets london",
      "arsenal emirates stadium guide",
      "chelsea stamford bridge visitor guide",
      "tottenham stadium tour tickets",
      "best football pubs london halal",
      "premier league hospitality packages",
    ],
    featured_longtails: ["how to buy premier league tickets london", "arsenal emirates stadium guide"],
    questions: [
      "How can tourists buy Premier League tickets in London?",
      "Which London football stadium is best to visit?",
      "Are there halal food options at Premier League grounds?",
      "How much do Premier League hospitality packages cost?",
    ],
    page_type: "guide",
    intent: "transactional",
    evergreen: true,
    authority_links: [
      { url: "https://www.premierleague.com", title: "Premier League Official", sourceDomain: "premierleague.com" },
      { url: "https://www.stubhub.co.uk", title: "StubHub UK", sourceDomain: "stubhub.co.uk" },
      { url: "https://www.visitlondon.com/things-to-do/whats-on/sport", title: "Visit London Sport", sourceDomain: "visitlondon.com" },
    ],
  },
  {
    title: "London's Best Cultural Experiences for Arab Visitors: Museums, Galleries & Tours",
    primary_keyword: "london cultural experiences arab visitors",
    longtails: [
      "british museum islamic collection",
      "victoria and albert museum arabic art",
      "best walking tours london arabic",
      "london theatre shows for tourists",
      "islamic art gallery london",
      "free museums london guide",
    ],
    featured_longtails: ["british museum islamic collection", "best walking tours london arabic"],
    questions: [
      "What are the best free museums in London?",
      "Are there guided tours in Arabic in London museums?",
      "Which London galleries have Islamic art collections?",
      "What cultural experiences are best for Arab families?",
    ],
    page_type: "guide",
    intent: "info",
    evergreen: true,
    authority_links: [
      { url: "https://www.britishmuseum.org", title: "British Museum", sourceDomain: "britishmuseum.org" },
      { url: "https://www.vam.ac.uk", title: "V&A Museum", sourceDomain: "vam.ac.uk" },
      { url: "https://www.getyourguide.com/london-l57/", title: "GetYourGuide London", sourceDomain: "getyourguide.com" },
    ],
  },
  {
    title: "Ramadan in London 2026: Iftars, Prayer Spaces & What to Know",
    primary_keyword: "ramadan london guide",
    longtails: [
      "best iftar restaurants london 2026",
      "london mosques near tourist attractions",
      "ramadan friendly hotels london",
      "iftar buffet london mayfair",
      "prayer rooms central london",
      "suhoor restaurants london",
    ],
    featured_longtails: ["best iftar restaurants london 2026", "ramadan friendly hotels london"],
    questions: [
      "What are the best iftar restaurants in London?",
      "Where are the main mosques near Central London?",
      "Do London hotels accommodate Ramadan schedules?",
      "What time is iftar in London during Ramadan?",
    ],
    page_type: "guide",
    intent: "info",
    evergreen: false,
    authority_links: [
      { url: "https://www.visitlondon.com", title: "Visit London", sourceDomain: "visitlondon.com" },
      { url: "https://www.eastlondonmosque.org.uk", title: "East London Mosque", sourceDomain: "eastlondonmosque.org.uk" },
      { url: "https://www.thefork.co.uk", title: "TheFork", sourceDomain: "thefork.co.uk" },
    ],
  },
  {
    title: "London Travel Insurance: What Arab Visitors Need to Know Before Their Trip",
    primary_keyword: "travel insurance london visitors",
    longtails: [
      "best travel insurance for uk visit",
      "travel insurance for arab tourists london",
      "uk visa travel insurance requirements",
      "medical insurance london visitors",
      "travel insurance comparison uk",
      "does travel insurance cover lost luggage heathrow",
    ],
    featured_longtails: ["best travel insurance for uk visit", "uk visa travel insurance requirements"],
    questions: [
      "Is travel insurance mandatory for UK visitors?",
      "What does travel insurance cover for London trips?",
      "How much does travel insurance cost for a UK visit?",
      "Can I buy travel insurance after arriving in London?",
    ],
    page_type: "guide",
    intent: "transactional",
    evergreen: true,
    authority_links: [
      { url: "https://www.gov.uk/foreign-travel-advice", title: "UK Government Travel Advice", sourceDomain: "gov.uk" },
      { url: "https://www.allianztravelinsurance.com", title: "Allianz Travel Insurance", sourceDomain: "allianztravelinsurance.com" },
      { url: "https://www.moneysavingexpert.com/insurance/cheap-travel-insurance/", title: "MoneySavingExpert Travel Insurance", sourceDomain: "moneysavingexpert.com" },
    ],
  },
  {
    title: "Best Day Trips from London: Easy Escapes to Oxford, Bath, Stonehenge & More",
    primary_keyword: "best day trips from london",
    longtails: [
      "day trip london to stonehenge",
      "oxford day trip from london by train",
      "bath spa day trip from london",
      "windsor castle day trip london",
      "cotswolds day trip from london",
      "harry potter studio tour from london",
    ],
    featured_longtails: ["day trip london to stonehenge", "oxford day trip from london by train"],
    questions: [
      "What are the best day trips from London by train?",
      "How long does it take to get from London to Stonehenge?",
      "Is the Harry Potter Studio Tour worth a day trip?",
      "Can I visit Oxford and return to London in one day?",
    ],
    page_type: "list",
    intent: "transactional",
    evergreen: true,
    authority_links: [
      { url: "https://www.getyourguide.com/london-l57/", title: "GetYourGuide London Tours", sourceDomain: "getyourguide.com" },
      { url: "https://www.nationalrail.co.uk", title: "National Rail", sourceDomain: "nationalrail.co.uk" },
      { url: "https://www.viator.com/London/d737", title: "Viator London", sourceDomain: "viator.com" },
    ],
  },
  {
    title: "Family-Friendly London: Best Activities & Attractions for Kids",
    primary_keyword: "family activities london kids",
    longtails: [
      "best things to do with kids in london",
      "london zoo tickets and guide",
      "natural history museum london kids",
      "london eye family tickets",
      "indoor activities london rainy day kids",
      "london aquarium sea life family",
    ],
    featured_longtails: ["best things to do with kids in london", "london eye family tickets"],
    questions: [
      "What are the best free activities for kids in London?",
      "Is the London Eye worth it for families?",
      "What are the best rainy-day activities for children in London?",
      "Which London museums are most fun for kids?",
    ],
    page_type: "list",
    intent: "info",
    evergreen: true,
    authority_links: [
      { url: "https://www.visitlondon.com/things-to-do/family-activities", title: "Visit London Family Activities", sourceDomain: "visitlondon.com" },
      { url: "https://www.timeout.com/london/kids", title: "Time Out London Kids", sourceDomain: "timeout.com" },
      { url: "https://www.getyourguide.com/london-l57/", title: "GetYourGuide London", sourceDomain: "getyourguide.com" },
    ],
  },
];

export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const { prisma } = await import("@/lib/db");

    const { getDefaultSiteId } = await import("@/config/sites");
    const siteId = getDefaultSiteId();
    let created = 0;
    let skipped = 0;

    for (const topic of TOPICS) {
      // Skip if a topic with this primary keyword already exists and isn't published
      const existing = await prisma.topicProposal.findFirst({
        where: {
          primary_keyword: topic.primary_keyword,
          status: { in: ["planned", "queued", "ready", "proposed", "generated"] },
        },
      });

      if (existing) {
        skipped++;
        continue;
      }

      await prisma.topicProposal.create({
        data: {
          site_id: siteId,
          title: topic.title,
          locale: "en", // Builder creates both EN + AR drafts from each topic
          primary_keyword: topic.primary_keyword,
          longtails: topic.longtails,
          featured_longtails: topic.featured_longtails,
          questions: topic.questions,
          authority_links_json: topic.authority_links,
          intent: topic.intent,
          suggested_page_type: topic.page_type,
          source_weights_json: { source: "admin-seed", weight: 0.9 },
          status: "ready", // Immediately available for content-builder
          confidence_score: 0.85,
          evergreen: topic.evergreen,
        },
      });

      created++;
    }

    return NextResponse.json({
      success: true,
      message: `Created ${created} topics, skipped ${skipped} duplicates. Content-builder will pick these up within 15 minutes and generate EN + AR articles automatically.`,
      created,
      skipped,
      total: TOPICS.length,
      nextStep: "Content-builder runs every 15 min. Each run processes 1 topic into 2 articles (EN + AR). All 10 topics → 20 articles within ~2.5 hours.",
    });
  } catch (error) {
    console.error("Seed topics error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
});
