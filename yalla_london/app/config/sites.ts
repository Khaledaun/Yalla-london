/**
 * Multi-Destination Site Configuration
 *
 * Central config for all branded sites under Zenitha.Luxury LLC.
 * Used by cron jobs, content gen, SEO agent, affiliate inject, and middleware.
 *
 * Each site defines:
 * - Identity (id, name, domain, locale)
 * - Lifecycle status (active, planned, paused, development)
 * - Content strategy (topic templates EN/AR, categories)
 * - Affiliate partners relevant to the destination
 * - SEO config (primary keywords, geo-targeting)
 *
 * Parent entity config lives in ./entity.ts
 */

/**
 * Site lifecycle status:
 * - active:      Live website, cron jobs run, content generated, indexed
 * - development: Being built, accessible but not indexed, no cron spend
 * - planned:     Configured but not launched. Domain reserved, no deployment
 * - paused:      Was active, temporarily halted. Content preserved, crons stopped
 */
export type SiteStatus = "active" | "development" | "planned" | "paused";

export interface SiteConfig {
  id: string;
  name: string;
  slug: string;
  domain: string;
  locale: "en" | "ar";
  direction: "ltr" | "rtl";
  /** Lifecycle status — controls cron execution and resource spend */
  status: SiteStatus;
  destination: string;
  country: string;
  currency: string;
  primaryColor: string;
  secondaryColor: string;
  systemPromptEN: string;
  systemPromptAR: string;
  topicsEN: TopicTemplate[];
  topicsAR: TopicTemplate[];
  affiliateCategories: string[];
  primaryKeywordsEN: string[];
  primaryKeywordsAR: string[];
  categoryName: { en: string; ar: string };
  // WordPress integration (optional — set type: "wordpress" to enable WP REST API management)
  type?: "native" | "wordpress";
  wpApiUrl?: string; // e.g. "https://example.com/wp-json/wp/v2"
  wpSiteProfile?: Record<string, unknown>; // SiteProfile from audit — used for AI content alignment
}

export interface TopicTemplate {
  keyword: string;
  longtails: string[];
  questions: string[];
  pageType: string;
}

export const SITES: Record<string, SiteConfig> = {
  "yalla-london": {
    id: "yalla-london",
    name: "Yalla London",
    slug: "yalla-london",
    domain: "yalla-london.com",
    locale: "en",
    direction: "ltr",
    status: "active",
    destination: "London",
    country: "UK",
    currency: "GBP",
    primaryColor: "#1C1917",
    secondaryColor: "#C8322B",
    systemPromptEN:
      "You are a luxury travel content writer for Yalla London, a premium travel platform for Arab travelers visiting London. Write SEO-optimized, engaging content. Always respond with valid JSON.",
    systemPromptAR:
      "أنت كاتب محتوى سفر فاخر لمنصة يالا لندن، منصة سفر متميزة للمسافرين العرب الذين يزورون لندن. اكتب محتوى محسّن لمحركات البحث وجذاب. أجب دائماً بـ JSON صالح.",
    topicsEN: [
      {
        keyword: "luxury boutique hotels London 2026",
        longtails: [
          "best boutique hotels Mayfair",
          "luxury hotels near Hyde Park",
          "five star hotels London Arab friendly",
        ],
        questions: [
          "Which boutique hotels in London offer Arabic-speaking staff?",
          "What are the most luxurious hotels near Harrods?",
        ],
        pageType: "guide",
      },
      {
        keyword: "best halal restaurants London fine dining",
        longtails: [
          "halal fine dining Knightsbridge",
          "luxury halal restaurants Mayfair",
          "Arabic restaurants London 2026",
        ],
        questions: [
          "Where can I find Michelin-star halal restaurants in London?",
          "What are the best Arabic restaurants in Mayfair?",
        ],
        pageType: "list",
      },
      {
        keyword: "London shopping guide for Arab visitors",
        longtails: [
          "Harrods shopping guide Arabic",
          "luxury brands Oxford Street",
          "VAT refund London tourist shopping",
        ],
        questions: [
          "How do Arab tourists get VAT refunds in London?",
          "What are the best luxury shopping areas in London?",
        ],
        pageType: "guide",
      },
      {
        keyword: "family-friendly luxury London experiences",
        longtails: [
          "London with kids luxury activities",
          "best family hotels London 2026",
          "child friendly fine dining London",
        ],
        questions: [
          "What luxury activities can families enjoy in London?",
          "Which London hotels offer the best kids clubs?",
        ],
        pageType: "guide",
      },
      {
        keyword: "London private tours and exclusive experiences",
        longtails: [
          "private guided tours London",
          "VIP London experiences 2026",
          "exclusive after-hours museum tours London",
        ],
        questions: [
          "Can you book private tours of Buckingham Palace?",
          "What exclusive experiences are available in London?",
        ],
        pageType: "guide",
      },
      {
        keyword: "best London spas and wellness retreats",
        longtails: [
          "luxury spa treatments London",
          "women-only spa London",
          "hammam London Turkish bath",
        ],
        questions: [
          "Which London spas offer women-only sessions?",
          "Where are the best hammam experiences in London?",
        ],
        pageType: "list",
      },
      {
        keyword: "London Premier League match day experience",
        longtails: [
          "VIP football tickets London",
          "Arsenal Emirates hospitality",
          "Chelsea Stamford Bridge tour",
        ],
        questions: [
          "How can I get VIP hospitality tickets for Premier League matches?",
          "Which London football stadiums offer the best tours?",
        ],
        pageType: "guide",
      },
    ],
    topicsAR: [
      {
        keyword: "دليل التسوق الفاخر في لندن 2026",
        longtails: [
          "أفضل محلات لندن الفاخرة",
          "تسوق هارودز دليل عربي",
          "استرداد ضريبة القيمة المضافة لندن",
        ],
        questions: [
          "ما هي أفضل مناطق التسوق الفاخرة في لندن؟",
          "كيف يمكن للسياح العرب استرداد ضريبة القيمة المضافة؟",
        ],
        pageType: "guide",
      },
      {
        keyword: "أفضل الفنادق الفاخرة في لندن للعائلات العربية",
        longtails: [
          "فنادق لندن حلال",
          "فنادق خمس نجوم لندن عائلية",
          "أجنحة فندقية فاخرة لندن",
        ],
        questions: [
          "ما هي أفضل الفنادق في لندن التي تقدم خدمات باللغة العربية؟",
          "أي فنادق لندن مناسبة للعائلات العربية؟",
        ],
        pageType: "guide",
      },
      {
        keyword: "المطاعم الحلال الفاخرة في لندن",
        longtails: [
          "مطاعم حلال نايتسبريدج",
          "أفضل مطاعم عربية لندن",
          "مطاعم فاخرة حلال مايفير",
        ],
        questions: [
          "أين أجد أفضل المطاعم الحلال الفاخرة في لندن؟",
          "ما هي المطاعم العربية المميزة في لندن؟",
        ],
        pageType: "list",
      },
      {
        keyword: "أنشطة عائلية في لندن للعرب",
        longtails: [
          "لندن مع الأطفال أنشطة",
          "أماكن ترفيه عائلية لندن",
          "حدائق لندن للعائلات",
        ],
        questions: [
          "ما هي أفضل الأنشطة العائلية في لندن؟",
          "أين يمكن أخذ الأطفال في لندن؟",
        ],
        pageType: "guide",
      },
      {
        keyword: "جولات خاصة وتجارب حصرية في لندن",
        longtails: [
          "جولات VIP لندن",
          "تجارب فاخرة حصرية لندن 2026",
          "زيارة قصر باكنغهام خاص",
        ],
        questions: [
          "هل يمكن حجز جولات خاصة في لندن؟",
          "ما هي التجارب الحصرية المتاحة في لندن؟",
        ],
        pageType: "guide",
      },
      {
        keyword: "السياحة العلاجية والسبا في لندن",
        longtails: [
          "أفضل سبا لندن للنساء",
          "حمام تركي لندن",
          "مراكز تجميل فاخرة لندن",
        ],
        questions: [
          "أين أجد أفضل مراكز السبا في لندن للنساء؟",
          "ما هي أفضل تجارب الحمام التركي في لندن؟",
        ],
        pageType: "list",
      },
      {
        keyword: "تجربة مباريات الدوري الإنجليزي في لندن",
        longtails: [
          "تذاكر كرة قدم لندن VIP",
          "جولة ملعب أرسنال",
          "تجربة ضيافة تشيلسي",
        ],
        questions: [
          "كيف أحصل على تذاكر VIP لمباريات الدوري الإنجليزي؟",
          "ما هي أفضل ملاعب كرة القدم للزيارة في لندن؟",
        ],
        pageType: "guide",
      },
    ],
    affiliateCategories: [
      "hotel",
      "restaurant",
      "activity",
      "tickets",
      "shopping",
      "transport",
    ],
    primaryKeywordsEN: [
      "london guide for arabs",
      "arab tourists london",
      "halal london",
      "london for arab families",
    ],
    primaryKeywordsAR: [
      "دليل لندن للعرب",
      "السياحة في لندن",
      "حلال لندن",
      "لندن للعائلات العربية",
    ],
    categoryName: { en: "London Guide", ar: "دليل لندن" },
  },

  arabaldives: {
    id: "arabaldives",
    name: "Arabaldives",
    slug: "arabaldives",
    domain: "arabaldives.com",
    locale: "ar",
    direction: "rtl",
    status: "planned",
    destination: "Maldives",
    country: "Maldives",
    currency: "USD",
    primaryColor: "#0891B2",
    secondaryColor: "#06B6D4",
    systemPromptEN:
      "You are a luxury travel content writer for Arabaldives, a premium travel platform for Arab travelers visiting the Maldives. Write SEO-optimized, engaging content about Maldives resorts, overwater villas, diving, and luxury island experiences. Always respond with valid JSON.",
    systemPromptAR:
      "أنت كاتب محتوى سفر فاخر لمنصة عربالديف، منصة سفر متميزة للمسافرين العرب الذين يزورون المالديف. اكتب محتوى محسّن لمحركات البحث عن المنتجعات والفيلات المائية والغوص والتجارب الفاخرة. أجب دائماً بـ JSON صالح.",
    topicsEN: [
      {
        keyword: "best overwater villas Maldives for Arab families 2026",
        longtails: [
          "halal-friendly resorts Maldives",
          "private pool villas Maldives",
          "family overwater bungalows Maldives",
        ],
        questions: [
          "Which Maldives resorts offer halal dining?",
          "What are the best family-friendly overwater villas?",
        ],
        pageType: "guide",
      },
      {
        keyword: "luxury all-inclusive Maldives resorts comparison",
        longtails: [
          "best all-inclusive Maldives 2026",
          "Maldives honeymoon resorts luxury",
          "adults-only resorts Maldives",
        ],
        questions: [
          "Which all-inclusive Maldives resorts offer the best value?",
          "What is the best time to visit the Maldives?",
        ],
        pageType: "list",
      },
      {
        keyword: "Maldives diving and snorkeling guide for beginners",
        longtails: [
          "best dive sites Maldives",
          "whale shark snorkeling Maldives",
          "house reef snorkeling Maldives resorts",
        ],
        questions: [
          "Can beginners dive in the Maldives?",
          "Which resorts have the best house reefs?",
        ],
        pageType: "guide",
      },
      {
        keyword: "Maldives honeymoon planning guide complete",
        longtails: [
          "romantic Maldives resorts",
          "private island honeymoon Maldives",
          "sunset cruise Maldives couples",
        ],
        questions: [
          "How to plan the perfect Maldives honeymoon?",
          "What romantic experiences are available?",
        ],
        pageType: "guide",
      },
      {
        keyword: "Maldives water sports and island activities",
        longtails: [
          "jet skiing Maldives",
          "parasailing Maldives resorts",
          "fishing trips Maldives",
        ],
        questions: [
          "What water sports are available in the Maldives?",
          "Can you do deep sea fishing in the Maldives?",
        ],
        pageType: "list",
      },
      {
        keyword: "Maldives spa and wellness retreat experiences",
        longtails: [
          "overwater spa Maldives",
          "Ayurvedic treatments Maldives",
          "couples spa Maldives luxury",
        ],
        questions: [
          "Which Maldives resorts have the best spas?",
          "What unique spa treatments are available?",
        ],
        pageType: "guide",
      },
      {
        keyword: "how to choose the right Maldives resort atoll",
        longtails: [
          "North Male Atoll resorts",
          "South Ari Atoll best resorts",
          "Baa Atoll UNESCO biosphere",
        ],
        questions: [
          "Which Maldives atoll is best for families?",
          "How do seaplane transfers work in Maldives?",
        ],
        pageType: "guide",
      },
    ],
    topicsAR: [
      {
        keyword: "أفضل فيلات فوق الماء في المالديف للعائلات العربية 2026",
        longtails: [
          "منتجعات حلال المالديف",
          "فيلات خاصة بمسبح المالديف",
          "أجنحة عائلية فوق الماء المالديف",
        ],
        questions: [
          "ما هي أفضل المنتجعات الحلال في المالديف؟",
          "أي فيلات فوق الماء مناسبة للعائلات؟",
        ],
        pageType: "guide",
      },
      {
        keyword: "مقارنة منتجعات المالديف الفاخرة الشاملة",
        longtails: [
          "أفضل منتجعات شاملة المالديف",
          "منتجعات شهر عسل المالديف",
          "منتجعات للكبار فقط المالديف",
        ],
        questions: [
          "أي منتجع شامل في المالديف يقدم أفضل قيمة؟",
          "ما هو أفضل وقت لزيارة المالديف؟",
        ],
        pageType: "list",
      },
      {
        keyword: "دليل الغوص والسنوركل في المالديف للمبتدئين",
        longtails: [
          "أفضل مواقع غوص المالديف",
          "سنوركل مع قرش الحوت المالديف",
          "شعاب مرجانية المالديف",
        ],
        questions: [
          "هل يمكن للمبتدئين الغوص في المالديف؟",
          "أي منتجعات لديها أفضل شعاب مرجانية؟",
        ],
        pageType: "guide",
      },
      {
        keyword: "دليل شامل لشهر العسل في المالديف",
        longtails: [
          "منتجعات رومانسية المالديف",
          "جزيرة خاصة شهر عسل",
          "رحلة غروب للأزواج المالديف",
        ],
        questions: [
          "كيف تخطط لشهر عسل مثالي في المالديف؟",
          "ما التجارب الرومانسية المتاحة؟",
        ],
        pageType: "guide",
      },
      {
        keyword: "الرياضات المائية والأنشطة في جزر المالديف",
        longtails: [
          "جت سكي المالديف",
          "باراسيلينغ المالديف",
          "رحلات صيد المالديف",
        ],
        questions: [
          "ما الرياضات المائية المتاحة في المالديف؟",
          "هل يمكن الصيد في أعماق البحر؟",
        ],
        pageType: "list",
      },
      {
        keyword: "تجارب السبا والاستجمام في المالديف",
        longtails: [
          "سبا فوق الماء المالديف",
          "علاجات أيورفيدا المالديف",
          "سبا للأزواج المالديف",
        ],
        questions: [
          "أي منتجعات المالديف لديها أفضل سبا؟",
          "ما العلاجات الفريدة المتاحة؟",
        ],
        pageType: "guide",
      },
      {
        keyword: "كيف تختار الجزيرة المناسبة في المالديف",
        longtails: [
          "منتجعات أتول نورث مالي",
          "أفضل منتجعات جنوب أري أتول",
          "محمية بيئية أتول با",
        ],
        questions: [
          "أي أتول في المالديف الأفضل للعائلات؟",
          "كيف تعمل رحلات الطائرة المائية؟",
        ],
        pageType: "guide",
      },
    ],
    affiliateCategories: ["hotel", "activity", "transport"],
    primaryKeywordsEN: [
      "maldives resorts for arabs",
      "halal maldives",
      "overwater villas maldives",
      "maldives family holiday",
    ],
    primaryKeywordsAR: [
      "منتجعات المالديف للعرب",
      "المالديف حلال",
      "فيلات فوق الماء",
      "عطلة عائلية المالديف",
    ],
    categoryName: { en: "Maldives Guide", ar: "دليل المالديف" },
  },

  "french-riviera": {
    id: "french-riviera",
    name: "Yalla Riviera",
    slug: "yalla-riviera",
    domain: "yallariviera.com",
    locale: "en",
    direction: "ltr",
    status: "planned",
    destination: "French Riviera",
    country: "France",
    currency: "EUR",
    primaryColor: "#1E3A5F",
    secondaryColor: "#D4AF37",
    systemPromptEN:
      "You are a luxury travel content writer for Yalla Riviera, a premium travel platform for Arab travelers exploring the French Riviera (Côte d'Azur). Write SEO-optimized, engaging content about luxury hotels, Michelin-starred restaurants, yacht charters, exclusive beach clubs, cultural experiences, and shopping along the Mediterranean coast from Saint-Tropez to Monaco. Always respond with valid JSON.",
    systemPromptAR:
      "أنت كاتب محتوى سفر فاخر لمنصة يالا ريفييرا، منصة سفر متميزة للمسافرين العرب الذين يستكشفون الريفييرا الفرنسية (كوت دازور). اكتب محتوى محسّن لمحركات البحث عن الفنادق الفاخرة والمطاعم الحائزة على نجوم ميشلان واستئجار اليخوت والنوادي الشاطئية الحصرية والتجارب الثقافية والتسوق على ساحل المتوسط من سان تروبيه إلى موناكو. أجب دائماً بـ JSON صالح.",
    topicsEN: [
      {
        keyword: "best luxury hotels French Riviera Côte d'Azur 2026",
        longtails: [
          "palace hotels Nice Promenade des Anglais",
          "luxury resorts Cap Ferrat",
          "five star hotels Cannes Croisette",
        ],
        questions: [
          "Which French Riviera hotels offer Arabic-speaking concierge?",
          "What are the most exclusive hotels in Saint-Tropez?",
        ],
        pageType: "guide",
      },
      {
        keyword: "Michelin star restaurants French Riviera dining guide",
        longtails: [
          "Michelin restaurants Monaco Monte Carlo",
          "best halal-friendly restaurants Nice",
          "fine dining Cannes waterfront",
        ],
        questions: [
          "Are there halal-friendly fine dining options on the French Riviera?",
          "What are the best Michelin-starred restaurants in Monaco?",
        ],
        pageType: "list",
      },
      {
        keyword: "yacht charter French Riviera luxury guide",
        longtails: [
          "superyacht rental Saint-Tropez",
          "day yacht charter Monaco",
          "Cannes yacht week guide",
        ],
        questions: [
          "How much does a yacht charter cost on the French Riviera?",
          "Best yacht charter companies in Monaco?",
        ],
        pageType: "guide",
      },
      {
        keyword: "exclusive beach clubs French Riviera 2026",
        longtails: [
          "best beach clubs Saint-Tropez Pampelonne",
          "private beach clubs Nice",
          "luxury beach clubs Cannes",
        ],
        questions: [
          "What are the most exclusive beach clubs in Saint-Tropez?",
          "Do I need to book beach clubs in advance?",
        ],
        pageType: "list",
      },
      {
        keyword: "Monaco Grand Prix luxury experience guide",
        longtails: [
          "Monaco F1 VIP hospitality packages",
          "best hotels Monaco Grand Prix weekend",
          "yacht viewing Monaco Grand Prix",
        ],
        questions: [
          "How to experience the Monaco Grand Prix in luxury?",
          "Best places to watch the Monaco Grand Prix?",
        ],
        pageType: "guide",
      },
      {
        keyword: "luxury shopping French Riviera designer boutiques",
        longtails: [
          "designer shopping Cannes rue d'Antibes",
          "luxury boutiques Monaco Golden Circle",
          "Nice Old Town luxury shops",
        ],
        questions: [
          "Where to find luxury shopping on the French Riviera?",
          "Is shopping tax-free for tourists in France?",
        ],
        pageType: "guide",
      },
      {
        keyword: "Cannes Film Festival luxury travel guide",
        longtails: [
          "Cannes Film Festival VIP access",
          "luxury hotels during Cannes Film Festival",
          "exclusive parties Cannes Festival",
        ],
        questions: [
          "Can tourists attend the Cannes Film Festival?",
          "Best hotels near the Palais des Festivals?",
        ],
        pageType: "guide",
      },
    ],
    topicsAR: [
      {
        keyword: "أفضل فنادق الريفييرا الفرنسية الفاخرة 2026",
        longtails: [
          "فنادق فاخرة نيس بروميناد دي زونغليه",
          "منتجعات كاب فيرا الفاخرة",
          "فنادق خمس نجوم كان كروازيت",
        ],
        questions: [
          "أي فنادق الريفييرا الفرنسية تقدم خدمة كونسيرج بالعربية؟",
          "ما أكثر الفنادق حصرية في سان تروبيه؟",
        ],
        pageType: "guide",
      },
      {
        keyword: "مطاعم ميشلان الريفييرا الفرنسية دليل المطاعم",
        longtails: [
          "مطاعم ميشلان موناكو مونت كارلو",
          "أفضل مطاعم حلال نيس",
          "مطاعم فاخرة كان على البحر",
        ],
        questions: [
          "هل توجد خيارات حلال للمطاعم الفاخرة في الريفييرا الفرنسية؟",
          "ما أفضل مطاعم ميشلان في موناكو؟",
        ],
        pageType: "list",
      },
      {
        keyword: "استئجار يخوت الريفييرا الفرنسية دليل فاخر",
        longtails: [
          "تأجير يخت فاخر سان تروبيه",
          "رحلة يخت يومية موناكو",
          "دليل أسبوع اليخوت كان",
        ],
        questions: [
          "كم تكلفة استئجار يخت في الريفييرا الفرنسية؟",
          "أفضل شركات تأجير اليخوت في موناكو؟",
        ],
        pageType: "guide",
      },
      {
        keyword: "نوادي شاطئية حصرية الريفييرا الفرنسية 2026",
        longtails: [
          "أفضل نوادي شاطئية سان تروبيه بامبلون",
          "نوادي شاطئية خاصة نيس",
          "نوادي شاطئية فاخرة كان",
        ],
        questions: [
          "ما أكثر النوادي الشاطئية حصرية في سان تروبيه؟",
          "هل يجب حجز النوادي الشاطئية مسبقاً؟",
        ],
        pageType: "list",
      },
      {
        keyword: "سباق جائزة موناكو الكبرى تجربة فاخرة",
        longtails: [
          "باقات ضيافة VIP سباق موناكو",
          "أفضل فنادق عطلة سباق موناكو",
          "مشاهدة السباق من اليخت موناكو",
        ],
        questions: [
          "كيف تعيش تجربة سباق موناكو الكبرى بفخامة؟",
          "أفضل أماكن مشاهدة سباق موناكو؟",
        ],
        pageType: "guide",
      },
      {
        keyword: "تسوق فاخر الريفييرا الفرنسية بوتيكات مصممين",
        longtails: [
          "تسوق مصممين كان شارع أنتيب",
          "بوتيكات فاخرة موناكو الدائرة الذهبية",
          "محلات فاخرة المدينة القديمة نيس",
        ],
        questions: [
          "أين تجد التسوق الفاخر في الريفييرا الفرنسية؟",
          "هل التسوق معفى من الضرائب للسياح في فرنسا؟",
        ],
        pageType: "guide",
      },
      {
        keyword: "مهرجان كان السينمائي دليل السفر الفاخر",
        longtails: [
          "دخول VIP مهرجان كان السينمائي",
          "فنادق فاخرة أثناء مهرجان كان",
          "حفلات حصرية مهرجان كان",
        ],
        questions: [
          "هل يمكن للسياح حضور مهرجان كان السينمائي؟",
          "أفضل الفنادق بالقرب من قصر المهرجانات؟",
        ],
        pageType: "guide",
      },
    ],
    affiliateCategories: [
      "hotel",
      "restaurant",
      "activity",
      "yacht",
      "shopping",
      "transport",
    ],
    primaryKeywordsEN: [
      "french riviera luxury guide",
      "best hotels cote d'azur",
      "things to do french riviera",
      "french riviera for arab travelers",
    ],
    primaryKeywordsAR: [
      "دليل الريفييرا الفرنسية الفاخر",
      "أفضل فنادق كوت دازور",
      "أنشطة الريفييرا الفرنسية",
      "الريفييرا الفرنسية للمسافرين العرب",
    ],
    categoryName: { en: "Riviera Guide", ar: "دليل الريفييرا" },
  },

  istanbul: {
    id: "istanbul",
    name: "Yalla Istanbul",
    slug: "yalla-istanbul",
    domain: "yallaistanbul.com",
    locale: "en",
    direction: "ltr",
    status: "planned",
    destination: "Istanbul",
    country: "Turkey",
    currency: "TRY",
    primaryColor: "#DC2626",
    secondaryColor: "#F97316",
    systemPromptEN:
      "You are a luxury travel content writer for Yalla Istanbul, a premium travel platform for Arab travelers visiting Istanbul and Turkey. Write SEO-optimized, engaging content about Istanbul's historical sites, bazaars, cuisine, hotels, and experiences. Always respond with valid JSON.",
    systemPromptAR:
      "أنت كاتب محتوى سفر فاخر لمنصة يالا إسطنبول، منصة سفر متميزة للمسافرين العرب الذين يزورون إسطنبول وتركيا. اكتب محتوى محسّن لمحركات البحث عن المعالم التاريخية والبازارات والمطبخ والفنادق والتجارب. أجب دائماً بـ JSON صالح.",
    topicsEN: [
      {
        keyword: "best luxury hotels Istanbul Bosphorus view 2026",
        longtails: [
          "Bosphorus view hotels Istanbul",
          "Sultanahmet luxury hotels",
          "boutique hotels Beyoglu Istanbul",
        ],
        questions: [
          "Which Istanbul hotels have the best Bosphorus views?",
          "Is Sultanahmet or Beyoglu better for tourists?",
        ],
        pageType: "guide",
      },
      {
        keyword: "Istanbul Grand Bazaar and Spice Market guide",
        longtails: [
          "Grand Bazaar shopping tips Istanbul",
          "Spice Bazaar best buys",
          "Istanbul bazaar bargaining guide",
        ],
        questions: [
          "How to navigate the Grand Bazaar?",
          "What are the best things to buy at the Spice Market?",
        ],
        pageType: "guide",
      },
      {
        keyword: "best Turkish food and restaurants Istanbul",
        longtails: [
          "best kebab restaurants Istanbul",
          "rooftop dining Istanbul Bosphorus",
          "Turkish breakfast Istanbul guide",
        ],
        questions: [
          "What are the must-try dishes in Istanbul?",
          "Best places for Turkish breakfast?",
        ],
        pageType: "list",
      },
      {
        keyword: "Istanbul historical sites and mosque guide",
        longtails: [
          "Hagia Sophia visiting guide",
          "Blue Mosque Istanbul tips",
          "Topkapi Palace tour guide",
        ],
        questions: [
          "What is the best time to visit Hagia Sophia?",
          "Can tourists visit the Blue Mosque?",
        ],
        pageType: "guide",
      },
      {
        keyword: "Bosphorus cruise Istanbul luxury options",
        longtails: [
          "private Bosphorus cruise Istanbul",
          "sunset cruise Istanbul dinner",
          "Istanbul boat tour Asian side",
        ],
        questions: [
          "What are the best Bosphorus cruise options?",
          "How long is a typical Bosphorus cruise?",
        ],
        pageType: "guide",
      },
      {
        keyword: "Istanbul spa and Turkish hammam experiences",
        longtails: [
          "best hammam Istanbul traditional",
          "luxury spa hotels Istanbul",
          "Turkish bath experience guide",
        ],
        questions: [
          "What are the best hammams in Istanbul?",
          "What to expect at a Turkish bath?",
        ],
        pageType: "list",
      },
      {
        keyword: "Istanbul shopping guide luxury brands and carpets",
        longtails: [
          "Istinye Park Istanbul luxury",
          "Nişantaşı shopping Istanbul",
          "Turkish carpet buying guide",
        ],
        questions: [
          "Where to buy luxury brands in Istanbul?",
          "How to choose an authentic Turkish carpet?",
        ],
        pageType: "guide",
      },
    ],
    topicsAR: [
      {
        keyword: "أفضل فنادق إسطنبول الفاخرة بإطلالة على البوسفور 2026",
        longtails: [
          "فنادق إطلالة البوسفور إسطنبول",
          "فنادق فاخرة السلطان أحمد",
          "فنادق بوتيك بيوغلو إسطنبول",
        ],
        questions: [
          "أي فنادق إسطنبول لديها أفضل إطلالة على البوسفور؟",
          "هل السلطان أحمد أو بيوغلو أفضل للسياح؟",
        ],
        pageType: "guide",
      },
      {
        keyword: "دليل البازار الكبير وسوق التوابل في إسطنبول",
        longtails: [
          "نصائح تسوق البازار الكبير",
          "أفضل مشتريات سوق التوابل",
          "دليل المساومة في بازارات إسطنبول",
        ],
        questions: [
          "كيف تتنقل في البازار الكبير؟",
          "ما أفضل المشتريات من سوق التوابل؟",
        ],
        pageType: "guide",
      },
      {
        keyword: "أفضل المطاعم والأكل التركي في إسطنبول",
        longtails: [
          "أفضل مطاعم كباب إسطنبول",
          "مطاعم سطح البوسفور إسطنبول",
          "دليل الفطور التركي إسطنبول",
        ],
        questions: [
          "ما الأطباق الضرورية في إسطنبول؟",
          "أفضل أماكن الفطور التركي؟",
        ],
        pageType: "list",
      },
      {
        keyword: "دليل المعالم التاريخية والمساجد في إسطنبول",
        longtails: [
          "دليل زيارة آيا صوفيا",
          "نصائح زيارة المسجد الأزرق",
          "دليل جولة قصر توبكابي",
        ],
        questions: [
          "ما أفضل وقت لزيارة آيا صوفيا؟",
          "هل يمكن للسياح زيارة المسجد الأزرق؟",
        ],
        pageType: "guide",
      },
      {
        keyword: "رحلة البوسفور في إسطنبول الخيارات الفاخرة",
        longtails: [
          "رحلة بوسفور خاصة إسطنبول",
          "رحلة غروب عشاء إسطنبول",
          "جولة بحرية الجانب الآسيوي",
        ],
        questions: [
          "ما أفضل خيارات رحلات البوسفور؟",
          "كم مدة رحلة البوسفور النموذجية؟",
        ],
        pageType: "guide",
      },
      {
        keyword: "تجارب السبا والحمام التركي في إسطنبول",
        longtails: [
          "أفضل حمام تقليدي إسطنبول",
          "فنادق سبا فاخرة إسطنبول",
          "دليل تجربة الحمام التركي",
        ],
        questions: [
          "ما أفضل الحمامات في إسطنبول؟",
          "ماذا تتوقع في الحمام التركي؟",
        ],
        pageType: "list",
      },
      {
        keyword: "دليل التسوق في إسطنبول الماركات الفاخرة والسجاد",
        longtails: [
          "إستينيا بارك إسطنبول",
          "تسوق نيشانتاشي إسطنبول",
          "دليل شراء السجاد التركي",
        ],
        questions: [
          "أين تشتري الماركات الفاخرة في إسطنبول؟",
          "كيف تختار سجادة تركية أصلية؟",
        ],
        pageType: "guide",
      },
    ],
    affiliateCategories: ["hotel", "activity", "transport", "shopping"],
    primaryKeywordsEN: [
      "istanbul guide for arabs",
      "turkey tourism arabs",
      "istanbul luxury hotels",
      "istanbul for arab travelers",
    ],
    primaryKeywordsAR: [
      "دليل إسطنبول للعرب",
      "السياحة في تركيا",
      "فنادق إسطنبول الفاخرة",
      "إسطنبول للمسافرين العرب",
    ],
    categoryName: { en: "Istanbul Guide", ar: "دليل إسطنبول" },
  },

  thailand: {
    id: "thailand",
    name: "Yalla Thailand",
    slug: "yalla-thailand",
    domain: "yallathailand.com",
    locale: "en",
    direction: "ltr",
    status: "planned",
    destination: "Thailand",
    country: "Thailand",
    currency: "THB",
    primaryColor: "#059669",
    secondaryColor: "#D97706",
    systemPromptEN:
      "You are a luxury travel content writer for Yalla Thailand, a premium travel platform for Arab travelers visiting Thailand. Write SEO-optimized, engaging content about Thailand's islands, temples, cuisine, luxury resorts, and wellness experiences. Always respond with valid JSON.",
    systemPromptAR:
      "أنت كاتب محتوى سفر فاخر لمنصة يالا تايلاند، منصة سفر متميزة للمسافرين العرب الذين يزورون تايلاند. اكتب محتوى محسّن لمحركات البحث عن الجزر والمعابد والمطبخ والمنتجعات الفاخرة وتجارب الاستجمام. أجب دائماً بـ JSON صالح.",
    topicsEN: [
      {
        keyword: "best luxury resorts Phuket for Arab families 2026",
        longtails: [
          "halal resorts Phuket Thailand",
          "family beach resorts Phuket",
          "private villa Phuket luxury",
        ],
        questions: [
          "Which Phuket resorts offer halal food?",
          "What are the best family resorts in Phuket?",
        ],
        pageType: "guide",
      },
      {
        keyword: "Bangkok luxury hotels and nightlife guide",
        longtails: [
          "Sukhumvit luxury hotels Bangkok",
          "riverside hotels Bangkok best",
          "rooftop bars Bangkok guide",
        ],
        questions: [
          "Which area is best to stay in Bangkok?",
          "What are the best rooftop bars in Bangkok?",
        ],
        pageType: "guide",
      },
      {
        keyword: "Thailand island hopping guide Phi Phi Koh Samui",
        longtails: [
          "Phi Phi Islands day trip guide",
          "Koh Samui luxury resorts",
          "Krabi islands tour Thailand",
        ],
        questions: [
          "How to plan island hopping in Thailand?",
          "Which Thai island is best for couples?",
        ],
        pageType: "guide",
      },
      {
        keyword: "halal food guide Thailand Bangkok and Phuket",
        longtails: [
          "halal street food Bangkok",
          "halal restaurants Phuket",
          "Muslim-friendly dining Thailand",
        ],
        questions: [
          "Is it easy to find halal food in Thailand?",
          "Best halal restaurants in Bangkok?",
        ],
        pageType: "list",
      },
      {
        keyword: "Thailand temple tours and cultural experiences",
        longtails: [
          "Wat Arun visiting guide Bangkok",
          "Chiang Mai temples tour",
          "Grand Palace Bangkok tips",
        ],
        questions: [
          "What are the must-visit temples in Thailand?",
          "What is the dress code for Thai temples?",
        ],
        pageType: "guide",
      },
      {
        keyword: "Thailand spa and wellness retreat luxury",
        longtails: [
          "Thai massage luxury spa Bangkok",
          "wellness retreats Koh Samui",
          "detox retreat Thailand",
        ],
        questions: [
          "What are the best luxury spas in Thailand?",
          "Are Thai massage spas safe?",
        ],
        pageType: "list",
      },
      {
        keyword: "Chiang Mai guide hill tribes and elephant sanctuaries",
        longtails: [
          "ethical elephant sanctuary Chiang Mai",
          "hill tribe trekking Chiang Mai",
          "night bazaar Chiang Mai guide",
        ],
        questions: [
          "Are elephant sanctuaries in Chiang Mai ethical?",
          "Best time to visit Chiang Mai?",
        ],
        pageType: "guide",
      },
    ],
    topicsAR: [
      {
        keyword: "أفضل منتجعات بوكيت الفاخرة للعائلات العربية 2026",
        longtails: [
          "منتجعات حلال بوكيت تايلاند",
          "منتجعات شاطئية عائلية بوكيت",
          "فيلا خاصة بوكيت فاخرة",
        ],
        questions: [
          "أي منتجعات بوكيت تقدم طعام حلال؟",
          "ما أفضل المنتجعات العائلية في بوكيت؟",
        ],
        pageType: "guide",
      },
      {
        keyword: "دليل فنادق بانكوك الفاخرة والحياة الليلية",
        longtails: [
          "فنادق فاخرة سوخومفيت بانكوك",
          "أفضل فنادق على النهر بانكوك",
          "بارات سطح بانكوك",
        ],
        questions: [
          "أي منطقة أفضل للإقامة في بانكوك؟",
          "ما أفضل بارات السطح في بانكوك؟",
        ],
        pageType: "guide",
      },
      {
        keyword: "دليل التنقل بين جزر تايلاند في في وكوه ساموي",
        longtails: [
          "رحلة يومية جزر في في",
          "منتجعات فاخرة كوه ساموي",
          "جولة جزر كرابي تايلاند",
        ],
        questions: [
          "كيف تخطط للتنقل بين الجزر في تايلاند؟",
          "أي جزيرة تايلاندية الأفضل للأزواج؟",
        ],
        pageType: "guide",
      },
      {
        keyword: "دليل الطعام الحلال في تايلاند بانكوك وبوكيت",
        longtails: [
          "طعام شارع حلال بانكوك",
          "مطاعم حلال بوكيت",
          "مطاعم صديقة للمسلمين تايلاند",
        ],
        questions: [
          "هل من السهل إيجاد طعام حلال في تايلاند؟",
          "أفضل المطاعم الحلال في بانكوك؟",
        ],
        pageType: "list",
      },
      {
        keyword: "جولات المعابد والتجارب الثقافية في تايلاند",
        longtails: [
          "دليل زيارة وات أرون بانكوك",
          "جولة معابد شيانغ ماي",
          "نصائح القصر الكبير بانكوك",
        ],
        questions: [
          "ما المعابد الضرورية في تايلاند؟",
          "ما قواعد اللباس في المعابد التايلاندية؟",
        ],
        pageType: "guide",
      },
      {
        keyword: "سبا واستجمام فاخر في تايلاند",
        longtails: [
          "مساج تايلاندي سبا فاخر بانكوك",
          "منتجعات استجمام كوه ساموي",
          "ريتريت ديتوكس تايلاند",
        ],
        questions: [
          "ما أفضل مراكز السبا الفاخرة في تايلاند؟",
          "هل مراكز المساج التايلاندي آمنة؟",
        ],
        pageType: "list",
      },
      {
        keyword: "دليل شيانغ ماي القبائل الجبلية ومحميات الأفيال",
        longtails: [
          "محمية أفيال أخلاقية شيانغ ماي",
          "رحلة قبائل جبلية شيانغ ماي",
          "بازار ليلي شيانغ ماي",
        ],
        questions: [
          "هل محميات الأفيال في شيانغ ماي أخلاقية؟",
          "أفضل وقت لزيارة شيانغ ماي؟",
        ],
        pageType: "guide",
      },
    ],
    affiliateCategories: ["hotel", "activity", "transport"],
    primaryKeywordsEN: [
      "thailand guide for arabs",
      "halal thailand",
      "luxury resorts phuket",
      "thailand for arab families",
    ],
    primaryKeywordsAR: [
      "دليل تايلاند للعرب",
      "تايلاند حلال",
      "منتجعات فاخرة بوكيت",
      "تايلاند للعائلات العربية",
    ],
    categoryName: { en: "Thailand Guide", ar: "دليل تايلاند" },
  },
};

/** Get all configured site IDs (all sites, any status) */
export function getAllSiteIds(): string[] {
  return Object.keys(SITES);
}

/**
 * Get site IDs by status.
 * Use this in cron jobs, content generation, and indexing to control spend.
 * Only "active" sites consume AI tokens and cron time.
 */
export function getSiteIdsByStatus(...statuses: SiteStatus[]): string[] {
  return Object.values(SITES)
    .filter((site) => statuses.includes(site.status))
    .map((site) => site.id);
}

/**
 * Get only active site IDs (live websites).
 * Drop-in replacement for the old LIVE_SITES array.
 */
export function getActiveSiteIds(): string[] {
  return getSiteIdsByStatus("active");
}

/** Check if a site has a live website */
export function isSiteLive(siteId: string): boolean {
  const site = SITES[siteId];
  return site?.status === "active";
}

/**
 * Get the default site ID (first active site, or first configured site).
 * Used as a safe fallback instead of hardcoding "yalla-london".
 */
export function getDefaultSiteId(): string {
  const active = getActiveSiteIds();
  if (active.length > 0) return active[0];
  // Fallback to first configured site if none active
  const allIds = Object.keys(SITES);
  return allIds[0] || "yalla-london";
}

/**
 * Get the default site name (matches getDefaultSiteId).
 */
export function getDefaultSiteName(): string {
  const id = getDefaultSiteId();
  return SITES[id]?.name || "Yalla London";
}

/** Get site config by ID */
export function getSiteConfig(siteId: string): SiteConfig | undefined {
  return SITES[siteId];
}

/** Get site-specific domain URL */
export function getSiteDomain(siteId: string): string {
  const site = SITES[siteId];
  if (!site) {
    // Fall back to env var, then to the first configured site's domain
    if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
    const firstSite = Object.values(SITES)[0];
    return firstSite ? `https://www.${firstSite.domain}` : "https://www.yalla-london.com";
  }
  return `https://www.${site.domain}`;
}

/**
 * Get per-site SEO integration config.
 *
 * Env var convention: `{VAR_NAME}_{SITE_ID_UPPER}` for per-site overrides.
 * Falls back to global env var if per-site is not set.
 *
 * Example: GSC_SITE_URL_ARABALDIVES → GSC_SITE_URL → sc-domain:{domain}
 */
export function getSiteSeoConfig(siteId: string): {
  gscSiteUrl: string;
  ga4PropertyId: string;
  ga4MeasurementId: string;
  siteUrl: string;
  indexNowKey: string;
} {
  const site = SITES[siteId];
  const envKey = siteId.toUpperCase().replace(/-/g, "_");

  return {
    gscSiteUrl:
      process.env[`GSC_SITE_URL_${envKey}`] ||
      process.env.GSC_SITE_URL ||
      (site ? `sc-domain:${site.domain}` : ""),
    ga4PropertyId:
      process.env[`GA4_PROPERTY_ID_${envKey}`] ||
      process.env.GA4_PROPERTY_ID ||
      "",
    ga4MeasurementId:
      process.env[`GA4_MEASUREMENT_ID_${envKey}`] ||
      process.env.GA4_MEASUREMENT_ID ||
      "",
    siteUrl: site ? `https://www.${site.domain}` : process.env.NEXT_PUBLIC_SITE_URL || "",
    indexNowKey:
      process.env[`INDEXNOW_KEY_${envKey}`] ||
      process.env.INDEXNOW_KEY ||
      "",
  };
}

/**
 * Async version that also checks the Variable Vault (DB Credential table)
 * for per-site overrides. DB values take priority over env vars.
 *
 * Lookup order: DB Credential → per-site env var → global env var → default
 */
export async function getSiteSeoConfigFromVault(siteId: string): Promise<{
  gscSiteUrl: string;
  ga4PropertyId: string;
  ga4MeasurementId: string;
  siteUrl: string;
  indexNowKey: string;
}> {
  // Start with env-based config
  const envConfig = getSiteSeoConfig(siteId);

  try {
    const { prisma } = await import("@/lib/db");
    const { decrypt } = await import("@/lib/encryption");

    // Fetch all credentials for this site in one query
    const credentials = await prisma.credential.findMany({
      where: { site_id: siteId, status: "active" },
      select: { name: true, encrypted_value: true },
    });

    if (credentials.length === 0) return envConfig;

    const credMap = new Map<string, string>();
    for (const cred of credentials) {
      try {
        credMap.set(cred.name, decrypt(cred.encrypted_value));
      } catch {
        // Skip credentials that fail to decrypt
      }
    }

    // DB values override env-based config
    return {
      gscSiteUrl: credMap.get("GSC_SITE_URL") || envConfig.gscSiteUrl,
      ga4PropertyId: credMap.get("GA4_PROPERTY_ID") || envConfig.ga4PropertyId,
      ga4MeasurementId: credMap.get("GA4_MEASUREMENT_ID") || envConfig.ga4MeasurementId,
      siteUrl: credMap.get("SITE_URL") || envConfig.siteUrl,
      indexNowKey: credMap.get("INDEXNOW_KEY") || envConfig.indexNowKey,
    };
  } catch {
    // DB unavailable — fall back to env config
    return envConfig;
  }
}
