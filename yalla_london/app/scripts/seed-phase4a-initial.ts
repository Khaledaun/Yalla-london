
/**
 * Phase 4A Initial Seed Data
 * 30 London Places, Page Type Recipes, and Initial Rulebook
 * 
 * Usage: npx tsx scripts/seed-phase4a-initial.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 30 Top London Places (Tourist Attractions, Restaurants, Hotels, etc.)
const LONDON_PLACES = [
  // Landmarks & Attractions
  { name: 'London Bridge', slug: 'london-bridge', category: 'bridge', lat: 51.5078, lng: -0.0877, address: 'London Bridge, London SE1', short_desc: 'Historic bridge crossing the River Thames', tags: ['landmark', 'bridge', 'historic', 'thames'] },
  { name: 'Tower Bridge', slug: 'tower-bridge', category: 'bridge', lat: 51.5055, lng: -0.0754, address: 'Tower Bridge Rd, London SE1 2UP', official_url: 'https://www.towerbridge.org.uk', short_desc: 'Iconic Victorian bridge with glass walkways', tags: ['landmark', 'bridge', 'victorian', 'attraction'] },
  { name: 'Big Ben', slug: 'big-ben', category: 'landmark', lat: 51.4994, lng: -0.1245, address: 'Westminster, London SW1A 0AA', short_desc: 'Famous clock tower at Palace of Westminster', tags: ['landmark', 'clock', 'parliament', 'historic'] },
  { name: 'Houses of Parliament', slug: 'houses-of-parliament', category: 'government', lat: 51.4995, lng: -0.1248, address: 'Westminster, London SW1A 0AA', official_url: 'https://www.parliament.uk', short_desc: 'UK Parliament building with Gothic architecture', tags: ['government', 'parliament', 'gothic', 'historic'] },
  { name: 'Buckingham Palace', slug: 'buckingham-palace', category: 'palace', lat: 51.5014, lng: -0.1419, address: 'Westminster, London SW1A 1AA', official_url: 'https://www.rct.uk/visit/buckingham-palace', short_desc: 'Official residence of the British Royal Family', tags: ['palace', 'royal', 'residence', 'historic'] },
  { name: 'Tower of London', slug: 'tower-of-london', category: 'castle', lat: 51.5081, lng: -0.0759, address: 'St Katharine\'s & Wapping, London EC3N 4AB', official_url: 'https://www.hrp.org.uk/tower-of-london', short_desc: 'Historic castle and home to the Crown Jewels', tags: ['castle', 'historic', 'crown-jewels', 'fortress'] },
  { name: 'Westminster Abbey', slug: 'westminster-abbey', category: 'church', lat: 51.4993, lng: -0.1273, address: '20 Deans Yd, Westminster, London SW1P 3PA', official_url: 'https://www.westminster-abbey.org', short_desc: 'Gothic abbey church and coronation venue', tags: ['church', 'gothic', 'abbey', 'coronation'] },
  { name: 'St Paul\'s Cathedral', slug: 'st-pauls-cathedral', category: 'church', lat: 51.5138, lng: -0.0984, address: 'St. Paul\'s Churchyard, London EC4M 8AD', official_url: 'https://www.stpauls.co.uk', short_desc: 'Baroque cathedral with famous dome', tags: ['cathedral', 'baroque', 'dome', 'church'] },

  // Modern Attractions
  { name: 'The Shard', slug: 'the-shard', category: 'building', lat: 51.5045, lng: -0.0865, address: '32 London Bridge St, London SE1 9SG', official_url: 'https://www.the-shard.com', short_desc: 'London\'s tallest skyscraper with observation decks', tags: ['skyscraper', 'observation', 'modern', 'views'] },
  { name: 'London Eye', slug: 'london-eye', category: 'attraction', lat: 51.5033, lng: -0.1196, address: 'Riverside Building, County Hall, London SE1 7PB', official_url: 'https://www.londoneye.com', short_desc: 'Giant observation wheel on the South Bank', tags: ['attraction', 'observation', 'wheel', 'southbank'] },

  // Museums
  { name: 'British Museum', slug: 'british-museum', category: 'museum', lat: 51.5194, lng: -0.1270, address: 'Great Russell St, Bloomsbury, London WC1B 3DG', official_url: 'https://www.britishmuseum.org', short_desc: 'World-renowned museum of history and culture', tags: ['museum', 'history', 'culture', 'artifacts'] },
  { name: 'National Gallery', slug: 'national-gallery', category: 'museum', lat: 51.5089, lng: -0.1283, address: 'Trafalgar Square, London WC2N 5DN', official_url: 'https://www.nationalgallery.org.uk', short_desc: 'Art museum in Trafalgar Square', tags: ['museum', 'art', 'gallery', 'trafalgar'] },
  { name: 'Tate Modern', slug: 'tate-modern', category: 'museum', lat: 51.5076, lng: -0.0994, address: 'Bankside, London SE1 9TG', official_url: 'https://www.tate.org.uk/visit/tate-modern', short_desc: 'Modern and contemporary art gallery', tags: ['museum', 'art', 'modern', 'contemporary'] },
  { name: 'Natural History Museum', slug: 'natural-history-museum', category: 'museum', lat: 51.4967, lng: -0.1764, address: 'Exhibition Rd, South Kensington, London SW7 2DD', official_url: 'https://www.nhm.ac.uk', short_desc: 'Museum of natural specimens and exhibits', tags: ['museum', 'natural-history', 'specimens', 'science'] },
  { name: 'Science Museum', slug: 'science-museum', category: 'museum', lat: 51.4978, lng: -0.1743, address: 'Exhibition Rd, South Kensington, London SW7 2DD', official_url: 'https://www.sciencemuseum.org.uk', short_desc: 'Museum of science and technology', tags: ['museum', 'science', 'technology', 'interactive'] },
  { name: 'V&A Museum', slug: 'va-museum', category: 'museum', lat: 51.4966, lng: -0.1722, address: 'Cromwell Rd, Knightsbridge, London SW7 2RL', official_url: 'https://www.vam.ac.uk', short_desc: 'Victoria and Albert Museum of art and design', tags: ['museum', 'art', 'design', 'decorative'] },

  // Parks & Gardens
  { name: 'Hyde Park', slug: 'hyde-park', category: 'park', lat: 51.5073, lng: -0.1657, address: 'Hyde Park, London W2 2UH', short_desc: 'Large royal park in central London', tags: ['park', 'royal', 'central', 'green-space'] },
  { name: 'Regent\'s Park', slug: 'regents-park', category: 'park', lat: 51.5313, lng: -0.1563, address: 'Chester Rd, London NW1 4NR', short_desc: 'Royal park with London Zoo and gardens', tags: ['park', 'royal', 'zoo', 'gardens'] },
  { name: 'Greenwich Park', slug: 'greenwich-park', category: 'park', lat: 51.4768, lng: 0.0005, address: 'Greenwich, London SE10 8XJ', short_desc: 'Royal park with Observatory and maritime history', tags: ['park', 'royal', 'observatory', 'maritime'] },
  { name: 'Kew Gardens', slug: 'kew-gardens', category: 'garden', lat: 51.4816, lng: -0.2946, address: 'Kew, Richmond, Surrey TW9 3AE', official_url: 'https://www.kew.org', short_desc: 'Royal Botanic Gardens with diverse plant collections', tags: ['garden', 'botanic', 'royal', 'plants'] },

  // Markets & Districts
  { name: 'Borough Market', slug: 'borough-market', category: 'market', lat: 51.5055, lng: -0.0910, address: '8 Southwark St, London SE1 1TL', official_url: 'https://boroughmarket.org.uk', short_desc: 'Historic food market near London Bridge', tags: ['market', 'food', 'historic', 'gourmet'] },
  { name: 'Camden Market', slug: 'camden-market', category: 'market', lat: 51.5414, lng: -0.1460, address: 'Camden Lock Pl, London NW1 8AF', official_url: 'https://www.camdenmarket.com', short_desc: 'Alternative market with crafts and street food', tags: ['market', 'alternative', 'crafts', 'street-food'] },
  { name: 'Covent Garden', slug: 'covent-garden', category: 'district', lat: 51.5118, lng: -0.1226, address: 'Covent Garden, London WC2E', short_desc: 'Shopping and entertainment district', tags: ['district', 'shopping', 'entertainment', 'historic'] },
  { name: 'Soho', slug: 'soho', category: 'district', lat: 51.5136, lng: -0.1353, address: 'Soho, London W1D', short_desc: 'Vibrant area known for nightlife and dining', tags: ['district', 'nightlife', 'dining', 'entertainment'] },
  { name: 'South Bank', slug: 'south-bank', category: 'district', lat: 51.5045, lng: -0.1144, address: 'South Bank, London SE1', short_desc: 'Cultural district along the Thames', tags: ['district', 'cultural', 'thames', 'arts'] },

  // Iconic Locations  
  { name: 'Piccadilly Circus', slug: 'piccadilly-circus', category: 'landmark', lat: 51.5101, lng: -0.1342, address: 'Piccadilly Circus, London W1J', short_desc: 'Busy junction with iconic advertising displays', tags: ['landmark', 'junction', 'advertising', 'busy'] },
  { name: 'Canary Wharf', slug: 'canary-wharf', category: 'district', lat: 51.5054, lng: -0.0235, address: 'Canary Wharf, London E14', short_desc: 'Modern financial district with skyscrapers', tags: ['district', 'financial', 'skyscrapers', 'modern'] },

  // Sports Venues
  { name: 'Wembley Stadium', slug: 'wembley-stadium', category: 'stadium', lat: 51.5560, lng: -0.2796, address: 'Wembley Stadium, London HA9 0WS', official_url: 'https://www.wembleystadium.com', short_desc: 'National stadium for football and events', tags: ['stadium', 'football', 'national', 'events'] },
  { name: 'Emirates Stadium', slug: 'emirates-stadium', category: 'stadium', lat: 51.5549, lng: -0.1084, address: 'Hornsey Rd, London N7 7AJ', official_url: 'https://www.arsenal.com/emirates-stadium', short_desc: 'Arsenal Football Club\'s home ground', tags: ['stadium', 'football', 'arsenal', 'premier-league'] },
  { name: 'Stamford Bridge', slug: 'stamford-bridge', category: 'stadium', lat: 51.4816, lng: -0.1909, address: 'Fulham Rd, Fulham, London SW6 1HS', official_url: 'https://www.chelseafc.com/stamford-bridge', short_desc: 'Chelsea Football Club\'s home stadium', tags: ['stadium', 'football', 'chelsea', 'premier-league'] },
];

// Page Type Recipes (7 page types)
const PAGE_TYPE_RECIPES = [
  {
    type: 'guide',
    required_blocks: ['introduction', 'main-content', 'faq', 'key-facts'],
    optional_blocks: ['gallery', 'video', 'social-embed', 'travel-tips', 'nearby-places'],
    schema_plan_json: {
      required: ['Article', 'Organization'],
      optional: ['HowTo', 'BreadcrumbList'],
      properties: {
        article: {
          headline: { required: true, maxLength: 60 },
          description: { required: true, maxLength: 155 },
          author: { required: true, type: 'Person' },
          publisher: { required: true, type: 'Organization' },
          datePublished: { required: true },
          dateModified: { required: true },
        },
      },
    },
    min_word_count: 1200,
    template_prompts_json: {
      en: 'Create a comprehensive guide about {topic} in London. Include practical tips, insider knowledge, and actionable advice. Structure with clear headings and include FAQ section. Use EXACTLY 2 featured long-tails: "{featured_longtail_1}" and "{featured_longtail_2}". Include 3-4 authority links: {authority_links}.',
      ar: 'أنشئ دليلاً شاملاً حول {topic} في لندن. اشمل نصائح عملية ومعرفة من الداخل ونصائح قابلة للتطبيق. استخدم بالضبط 2 كلمات مفتاحية مميزة: "{featured_longtail_1}" و "{featured_longtail_2}". أدرج 3-4 روابط موثوقة: {authority_links}.',
    },
  },
  {
    type: 'place',
    required_blocks: ['key-facts', 'map', 'gallery', 'faq'],
    optional_blocks: ['video', 'nearby-places', 'offers', 'reviews', 'opening-hours'],
    schema_plan_json: {
      required: ['Place', 'TouristAttraction', 'Organization'],
      optional: ['Review', 'AggregateRating', 'BreadcrumbList'],
      properties: {
        place: {
          name: { required: true },
          address: { required: true, type: 'PostalAddress' },
          geo: { required: true, type: 'GeoCoordinates' },
          telephone: { recommended: true },
          openingHours: { recommended: true },
          priceRange: { optional: true },
        },
      },
    },
    min_word_count: 800,
    template_prompts_json: {
      en: 'Create a detailed place guide for {topic}. Include location details, what to expect, best times to visit, and practical information. Use EXACTLY 2 featured long-tails: "{featured_longtail_1}" and "{featured_longtail_2}". Reference authority sources: {authority_links}.',
      ar: 'أنشئ دليل مكان مفصل لـ {topic}. اشمل تفاصيل الموقع وما يمكن توقعه وأفضل أوقات الزيارة والمعلومات العملية. استخدم بالضبط 2 كلمات مفتاحية مميزة: "{featured_longtail_1}" و "{featured_longtail_2}". أشر إلى المصادر الموثوقة: {authority_links}.',
    },
  },
  {
    type: 'event',
    required_blocks: ['event-details', 'key-facts', 'map', 'offers'],
    optional_blocks: ['gallery', 'faq', 'nearby-places', 'travel-tips', 'booking'],
    schema_plan_json: {
      required: ['Event', 'Place', 'Organization'],
      optional: ['Offer', 'BreadcrumbList'],
      properties: {
        event: {
          name: { required: true },
          startDate: { required: true },
          endDate: { required: true },
          location: { required: true, type: 'Place' },
          description: { required: true },
          offers: { recommended: true, type: 'Offer' },
        },
      },
    },
    min_word_count: 900,
    template_prompts_json: {
      en: 'Create an event guide for {topic}. Include event details, dates, ticketing, what to expect, and how to get there. Feature EXACTLY 2 long-tails: "{featured_longtail_1}" and "{featured_longtail_2}". Cite authority sources: {authority_links}.',
      ar: 'أنشئ دليل فعالية لـ {topic}. اشمل تفاصيل الفعالية والتواريخ والتذاكر وما يمكن توقعه وكيفية الوصول. ركز على بالضبط 2 كلمات مفتاحية: "{featured_longtail_1}" و "{featured_longtail_2}". استشهد بالمصادر الموثوقة: {authority_links}.',
    },
  },
  {
    type: 'list',
    required_blocks: ['introduction', 'list-items', 'summary'],
    optional_blocks: ['map', 'gallery', 'faq', 'offers', 'comparison-table'],
    schema_plan_json: {
      required: ['Article', 'ItemList', 'Organization'],
      optional: ['BreadcrumbList'],
      properties: {
        itemList: {
          numberOfItems: { required: true },
          itemListElement: { required: true },
        },
        article: {
          headline: { required: true },
          description: { required: true },
        },
      },
    },
    min_word_count: 1000,
    template_prompts_json: {
      en: 'Create a curated list about {topic} in London. Rank items with clear criteria and provide details for each. Emphasize EXACTLY 2 featured terms: "{featured_longtail_1}" and "{featured_longtail_2}". Support with authority links: {authority_links}.',
      ar: 'أنشئ قائمة منتقاة حول {topic} في لندن. رتب العناصر بمعايير واضحة وقدم تفاصيل لكل عنصر. اركز على بالضبط 2 مصطلحات مميزة: "{featured_longtail_1}" و "{featured_longtail_2}". ادعم بروابط موثوقة: {authority_links}.',
    },
  },
  {
    type: 'faq',
    required_blocks: ['introduction', 'faq-items', 'key-facts'],
    optional_blocks: ['gallery', 'related-content', 'expert-tips'],
    schema_plan_json: {
      required: ['FAQPage', 'Organization'],
      optional: ['BreadcrumbList'],
      properties: {
        faqPage: {
          mainEntity: { required: true, type: 'Question' },
        },
      },
    },
    min_word_count: 800,
    template_prompts_json: {
      en: 'Create a comprehensive FAQ about {topic}. Address common questions with detailed, helpful answers. Include EXACTLY 2 featured long-tails: "{featured_longtail_1}" and "{featured_longtail_2}". Reference authoritative sources: {authority_links}.',
      ar: 'أنشئ أسئلة شائعة شاملة حول {topic}. أجب على الأسئلة الشائعة بإجابات مفصلة ومفيدة. اشمل بالضبط 2 كلمات مفتاحية مميزة: "{featured_longtail_1}" و "{featured_longtail_2}". أشر للمصادر الموثوقة: {authority_links}.',
    },
  },
  {
    type: 'news',
    required_blocks: ['news-content', 'key-facts', 'social-share'],
    optional_blocks: ['gallery', 'related-news', 'expert-quotes', 'timeline'],
    schema_plan_json: {
      required: ['NewsArticle', 'Organization', 'Person'],
      optional: ['BreadcrumbList'],
      properties: {
        newsArticle: {
          headline: { required: true },
          datePublished: { required: true },
          author: { required: true, type: 'Person' },
          publisher: { required: true, type: 'Organization' },
        },
      },
    },
    min_word_count: 600,
    template_prompts_json: {
      en: 'Create a news article about {topic}. Include latest updates, quotes, and relevant context. Feature EXACTLY 2 key terms: "{featured_longtail_1}" and "{featured_longtail_2}". Support with credible sources: {authority_links}.',
      ar: 'أنشئ مقال إخباري حول {topic}. اشمل آخر التحديثات والاقتباسات والسياق ذي الصلة. ركز على بالضبط 2 مصطلحات رئيسية: "{featured_longtail_1}" و "{featured_longtail_2}". ادعم بمصادر موثقة: {authority_links}.',
    },
  },
  {
    type: 'itinerary',
    required_blocks: ['itinerary-days', 'map', 'key-facts', 'travel-tips'],
    optional_blocks: ['gallery', 'offers', 'nearby-places', 'faq', 'budget-breakdown'],
    schema_plan_json: {
      required: ['Article', 'ItemList', 'Organization'],
      optional: ['Place', 'BreadcrumbList'],
      properties: {
        article: {
          headline: { required: true },
          description: { required: true },
        },
        itemList: {
          numberOfItems: { required: true },
          itemListElement: { required: true },
        },
      },
    },
    min_word_count: 1500,
    template_prompts_json: {
      en: 'Create a detailed itinerary for {topic}. Include day-by-day plans, timing, and practical tips. Emphasize EXACTLY 2 featured elements: "{featured_longtail_1}" and "{featured_longtail_2}". Reference travel authorities: {authority_links}.',
      ar: 'أنشئ خطة سفر مفصلة لـ {topic}. اشمل خطط يومية والتوقيت والنصائح العملية. ركز على بالضبط 2 عناصر مميزة: "{featured_longtail_1}" و "{featured_longtail_2}". أشر لسلطات السفر: {authority_links}.',
    },
  },
];

// Initial Rulebook Version
const INITIAL_RULEBOOK = {
  version: '2024.09.1',
  changelog: `Initial Phase 4+ rulebook with comprehensive SEO, AEO, and E-E-A-T guidelines.
  
Key features:
- Topic research must include 3-4 authority links
- EXACTLY 2 featured long-tail keywords per article  
- Internal backlink offers trigger when indexed pages ≥ 40
- Multi-page type support with enforced schemas
- Enhanced content quality scoring`,
  weights_json: {
    titleOptimization: 0.25,
    contentQuality: 0.20,
    technicalSEO: 0.15,
    userExperience: 0.15,
    eeatSignals: 0.10,
    internalLinking: 0.08,
    schemaMarkup: 0.07,
    // Phase 4+ specific weights
    authorityLinkUsage: 0.05,      // Must use ≥2 of provided authority links
    featuredLongtailUsage: 0.10,   // Must use both featured long-tails prominently
    pageTypeCompliance: 0.05,      // Must meet page type requirements
  },
  schema_requirements_json: {
    article: {
      required: ['Article', 'Organization', 'Person'],
      properties: {
        headline: { required: true, maxLength: 60 },
        description: { required: true, maxLength: 155 },
        author: { required: true, type: 'Person' },
        publisher: { required: true, type: 'Organization' },
        datePublished: { required: true },
        dateModified: { required: true },
        keywords: { recommended: true }, // Include featured long-tails
        citation: { recommended: true }, // Authority link references
      },
    },
    place: {
      required: ['Place', 'TouristAttraction', 'Organization'],
      properties: {
        name: { required: true },
        address: { required: true, type: 'PostalAddress' },
        geo: { required: true, type: 'GeoCoordinates' },
        telephone: { recommended: true },
        openingHours: { recommended: true },
        priceRange: { optional: true },
        review: { optional: true, type: 'Review' },
      },
    },
    event: {
      required: ['Event', 'Place', 'Organization'],
      properties: {
        name: { required: true },
        startDate: { required: true },
        endDate: { required: true },
        location: { required: true, type: 'Place' },
        offers: { recommended: true, type: 'Offer' },
        performer: { optional: true },
      },
    },
    faq: {
      required: ['FAQPage', 'Organization'],
      properties: {
        mainEntity: { required: true, type: 'Question' },
      },
    },
  },
  prompts_json: {
    topicGeneration: 'Generate topics focusing on luxury experiences, cultural insights, and practical visitor information. Emphasize E-E-A-T signals through expert knowledge and first-hand experience.',
    contentGeneration: 'Create comprehensive, authoritative content that demonstrates expertise and provides genuine value. Include personal insights, practical tips, and current information. CRITICAL: Use EXACTLY 2 featured long-tails prominently (as H2/H3 sections or explicit callouts) and incorporate at least 2 of the provided authority links naturally in the content.',
    seoAudit: 'Evaluate content for technical SEO, user experience, and E-E-A-T signals. Check for proper schema markup, internal linking opportunities, content depth, and compliance with brand guidelines. When GSC indexed pages ≥ 40, propose internal backlink opportunities.',
    authorityLinkUsage: 'Authority links must be naturally integrated into content, not just listed at the end. Use proper attribution and consider using rel="nofollow" for external links unless they add significant value.',
    featuredLongtailUsage: 'Featured long-tail keywords must appear as prominent headings (H2/H3) or be explicitly called out in dedicated sections. They should guide the content structure and provide clear value to readers.',
    backlinkOffers: 'When indexed pages ≥ 40, analyze content for internal linking opportunities. Suggest 3-5 relevant internal links with appropriate anchor text that enhance user experience and content authority.',
  },
  is_active: true,
};

async function seedPhase4AInitial() {
  console.log('🌱 Seeding Phase 4A initial data...');

  try {
    // Clear existing Phase 4A data in development only
    if (process.env.NODE_ENV !== 'production') {
      console.log('🧹 Cleaning existing Phase 4A data (development only)...');
      await prisma.pageTypeRecipe.deleteMany();
      await prisma.place.deleteMany();
      await prisma.rulebookVersion.updateMany({
        data: { is_active: false },
      });
    }

    // Seed Page Type Recipes
    console.log('📝 Seeding 7 page type recipes...');
    for (const recipe of PAGE_TYPE_RECIPES) {
      await prisma.pageTypeRecipe.upsert({
        where: { type: recipe.type },
        update: recipe,
        create: recipe,
      });
      console.log(`  ✅ ${recipe.type} recipe created/updated`);
    }

    // Seed London Places
    console.log(`📍 Seeding ${LONDON_PLACES.length} London places...`);
    for (const place of LONDON_PLACES) {
      await prisma.place.upsert({
        where: { slug: place.slug },
        update: place,
        create: {
          ...place,
          metadata_json: {
            seedSource: 'phase4a-initial',
            lastUpdated: new Date().toISOString(),
          },
        },
      });
      console.log(`  ✅ ${place.name} (${place.category})`);
    }

    // Seed Initial Rulebook
    console.log('📖 Seeding initial rulebook version...');
    await prisma.rulebookVersion.upsert({
      where: { version: INITIAL_RULEBOOK.version },
      update: INITIAL_RULEBOOK,
      create: INITIAL_RULEBOOK,
    });
    console.log(`  ✅ Rulebook ${INITIAL_RULEBOOK.version} created/updated`);

    // Verification
    console.log('\n📊 Verifying seed data...');
    const recipesCount = await prisma.pageTypeRecipe.count();
    const placesCount = await prisma.place.count();
    const rulebookCount = await prisma.rulebookVersion.count();
    const activeRulebooks = await prisma.rulebookVersion.count({ where: { is_active: true } });

    console.log(`✅ Phase 4A initial seed completed successfully!
    
Summary:
- Page Type Recipes: ${recipesCount}/7 ✅
- London Places: ${placesCount}/${LONDON_PLACES.length} ✅  
- Rulebook Versions: ${rulebookCount} (${activeRulebooks} active) ✅

Critical Rules Configured:
- Topic research: 3-4 authority links required ✅
- Content generation: EXACTLY 2 featured long-tails per article ✅
- SEO audit: Internal backlink offers when indexed pages ≥ 40 ✅
- Multi-page types: 7 types with enforced schemas ✅`);

    return {
      success: true,
      counts: {
        recipes: recipesCount,
        places: placesCount,
        rulebooks: rulebookCount,
        activeRulebooks,
      },
    };

  } catch (error) {
    console.error('❌ Error seeding Phase 4A data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  seedPhase4AInitial()
    .then((result) => {
      console.log(`\n🎉 Seed completed with ${result.counts.places} places and ${result.counts.recipes} recipes!`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seed failed:', error);
      process.exit(1);
    });
}

export { seedPhase4AInitial, LONDON_PLACES, PAGE_TYPE_RECIPES, INITIAL_RULEBOOK };
