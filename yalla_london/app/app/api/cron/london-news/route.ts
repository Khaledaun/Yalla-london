export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { logCronExecution } from "@/lib/cron-logger";
import { blogPosts } from "@/data/blog-content";
import { extendedBlogPosts } from "@/data/blog-content-extended";
import {
  informationArticles as baseInfoArticles,
} from "@/data/information-hub-content";
import { extendedInformationArticles } from "@/data/information-hub-articles-extended";

// ---------------------------------------------------------------------------
// Static content pools for cross-referencing
// ---------------------------------------------------------------------------

const allBlogPosts = [...blogPosts, ...extendedBlogPosts];
const allInfoArticles = [...baseInfoArticles, ...extendedInformationArticles];

// ---------------------------------------------------------------------------
// Trusted London news sources
// ---------------------------------------------------------------------------

const TRUSTED_SOURCES = [
  { name: "Transport for London", domain: "tfl.gov.uk", categories: ["transport", "strikes"] },
  { name: "Visit London", domain: "visitlondon.com", categories: ["events", "festivals", "popup"] },
  { name: "BBC London", domain: "bbc.co.uk/news/england/london", categories: ["general", "weather", "health"] },
  { name: "Evening Standard", domain: "standard.co.uk", categories: ["events", "sales", "general"] },
  { name: "Time Out London", domain: "timeout.com/london", categories: ["events", "festivals", "popup", "sales"] },
  { name: "GOV.UK", domain: "gov.uk", categories: ["holidays", "health", "regulation"] },
  { name: "Met Office London", domain: "metoffice.gov.uk", categories: ["weather"] },
  { name: "London Theatre", domain: "londontheatre.co.uk", categories: ["events"] },
] as const;

type TrustedSource = (typeof TRUSTED_SOURCES)[number];

// ---------------------------------------------------------------------------
// News category type
// ---------------------------------------------------------------------------

type NewsCategory =
  | "events"
  | "transport"
  | "weather"
  | "health"
  | "festivals"
  | "sales"
  | "holidays"
  | "strikes"
  | "popup"
  | "general";

// ---------------------------------------------------------------------------
// NEWS_TEMPLATES — seasonal/recurring London news templates
// ---------------------------------------------------------------------------

interface NewsTemplate {
  headline_en: string;
  headline_ar: string;
  summary_en: string;
  summary_ar: string;
  announcement_en: string;
  announcement_ar: string;
  news_category: NewsCategory;
  source: TrustedSource;
  source_url: string;
  relevance_score: number;
  urgency: "breaking" | "urgent" | "normal" | "low";
  is_major: boolean;
  tags: string[];
  keywords: string[];
  /** Months during which this template is active (1-12) */
  active_months: number[];
  /** How many days from publish date until auto-archive */
  ttl_days: number;
}

const NEWS_TEMPLATES: NewsTemplate[] = [
  // Transport disruptions
  {
    headline_en: "Planned Tube Closures This Weekend: Lines Affected",
    headline_ar: "إغلاقات مخططة لمترو الأنفاق هذا الأسبوع: الخطوط المتأثرة",
    summary_en:
      "Transport for London has announced planned engineering works affecting several Underground lines this weekend. Travellers should check the TfL website for alternative routes and allow extra journey time. Bus replacement services will operate on affected sections.",
    summary_ar:
      "أعلنت هيئة النقل في لندن عن أعمال هندسية مخططة تؤثر على عدة خطوط مترو أنفاق هذا الأسبوع. يجب على المسافرين التحقق من موقع TfL للمسارات البديلة والسماح بوقت إضافي للرحلة.",
    announcement_en: "Tube closures this weekend",
    announcement_ar: "إغلاقات المترو هذا الأسبوع",
    news_category: "transport",
    source: TRUSTED_SOURCES[0], // TfL
    source_url: "https://tfl.gov.uk/status-updates/major-works-and-events",
    relevance_score: 85,
    urgency: "urgent",
    is_major: false,
    tags: ["tube", "underground", "transport", "closures", "engineering-works"],
    keywords: ["london tube closures", "underground weekend works", "tfl engineering"],
    active_months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    ttl_days: 3,
  },
  {
    headline_en: "Tube Strike Announced: Dates and What You Need to Know",
    headline_ar: "إضراب عمال المترو: التواريخ وما تحتاج معرفته",
    summary_en:
      "London Underground workers have announced planned industrial action. Most tube lines will be severely affected with limited or no service. Visitors should plan alternative transport including buses, Overground, DLR, and river services. Walking routes between key tourist areas are recommended.",
    summary_ar:
      "أعلن عمال مترو أنفاق لندن عن إضراب صناعي مخطط. ستتأثر معظم خطوط المترو بشكل كبير مع خدمة محدودة أو معدومة. يجب على الزوار التخطيط لوسائل نقل بديلة بما في ذلك الحافلات وخدمات النهر.",
    announcement_en: "Tube strike announced",
    announcement_ar: "إعلان إضراب المترو",
    news_category: "strikes",
    source: TRUSTED_SOURCES[0], // TfL
    source_url: "https://tfl.gov.uk/campaign/tube-strike",
    relevance_score: 95,
    urgency: "breaking",
    is_major: true,
    tags: ["tube-strike", "industrial-action", "transport", "disruption"],
    keywords: ["london tube strike", "underground strike dates", "tfl industrial action"],
    active_months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    ttl_days: 5,
  },
  // Seasonal events — Christmas
  {
    headline_en: "London Christmas Markets 2025: Best Markets for Shopping and Festive Fun",
    headline_ar: "أسواق عيد الميلاد في لندن 2025: أفضل الأسواق للتسوق والمرح الاحتفالي",
    summary_en:
      "London's beloved Christmas markets are opening across the city, from Winter Wonderland in Hyde Park to the Southbank Centre Market. Discover unique gifts, mulled wine, and festive food stalls. Most markets run from mid-November through early January.",
    summary_ar:
      "تفتح أسواق عيد الميلاد المحبوبة في لندن أبوابها في جميع أنحاء المدينة، من وينتر وندرلاند في هايد بارك إلى سوق مركز ساوث بانك. اكتشف الهدايا الفريدة والمأكولات الاحتفالية.",
    announcement_en: "Christmas markets now open",
    announcement_ar: "أسواق عيد الميلاد مفتوحة الآن",
    news_category: "festivals",
    source: TRUSTED_SOURCES[1], // Visit London
    source_url: "https://www.visitlondon.com/things-to-do/whats-on/christmas",
    relevance_score: 90,
    urgency: "normal",
    is_major: true,
    tags: ["christmas", "markets", "winter-wonderland", "hyde-park", "shopping", "festive"],
    keywords: ["london christmas markets", "winter wonderland", "festive shopping london"],
    active_months: [11, 12, 1],
    ttl_days: 60,
  },
  // Seasonal events — New Year's Eve
  {
    headline_en: "London New Year's Eve 2025: Fireworks, Events, and Transport Guide",
    headline_ar: "ليلة رأس السنة في لندن 2025: الألعاب النارية والفعاليات ودليل النقل",
    summary_en:
      "London's iconic New Year's Eve fireworks display returns along the Thames. Tickets are required for the official viewing areas near the London Eye and Westminster. Free viewing spots are available further along the river. The last Tube runs until approximately 2am, with night buses available throughout.",
    summary_ar:
      "تعود عروض الألعاب النارية الشهيرة في لندن لليلة رأس السنة على طول نهر التيمز. يُطلب تذاكر لمناطق المشاهدة الرسمية. يعمل المترو حتى الساعة 2 صباحاً تقريباً.",
    announcement_en: "NYE fireworks and events",
    announcement_ar: "ألعاب نارية وفعاليات رأس السنة",
    news_category: "events",
    source: TRUSTED_SOURCES[1], // Visit London
    source_url: "https://www.visitlondon.com/things-to-do/whats-on/new-years-eve",
    relevance_score: 92,
    urgency: "normal",
    is_major: true,
    tags: ["new-years-eve", "fireworks", "thames", "london-eye", "nye"],
    keywords: ["london new years eve", "nye fireworks london", "london eye fireworks"],
    active_months: [12, 1],
    ttl_days: 15,
  },
  // Bonfire Night
  {
    headline_en: "Bonfire Night in London: Best Fireworks Displays and Events",
    headline_ar: "ليلة الألعاب النارية في لندن: أفضل عروض الألعاب النارية والفعاليات",
    summary_en:
      "Guy Fawkes Night celebrations take place across London with spectacular fireworks displays. Top locations include Alexandra Palace, Battersea Park, and Victoria Park. Many events include food stalls and funfairs. Book tickets in advance as popular events sell out quickly.",
    summary_ar:
      "تقام احتفالات ليلة جاي فوكس في جميع أنحاء لندن مع عروض ألعاب نارية مذهلة. تشمل المواقع الرئيسية قصر ألكسندرا وحديقة باترسي وحديقة فيكتوريا.",
    announcement_en: "Bonfire Night events guide",
    announcement_ar: "دليل فعاليات ليلة الألعاب النارية",
    news_category: "events",
    source: TRUSTED_SOURCES[4], // Time Out
    source_url: "https://www.timeout.com/london/things-to-do/bonfire-night-in-london",
    relevance_score: 80,
    urgency: "normal",
    is_major: false,
    tags: ["bonfire-night", "fireworks", "guy-fawkes", "november-5th"],
    keywords: ["bonfire night london", "fireworks november london", "guy fawkes london"],
    active_months: [10, 11],
    ttl_days: 14,
  },
  // Summer festivals
  {
    headline_en: "London Summer Festivals 2025: Music, Food, and Culture Guide",
    headline_ar: "مهرجانات لندن الصيفية 2025: دليل الموسيقى والطعام والثقافة",
    summary_en:
      "London's summer festival season is in full swing with events including BST Hyde Park, Wireless Festival, and Notting Hill Carnival. From open-air concerts to food festivals and cultural celebrations, there is something for every visitor. Check opening times and book tickets early.",
    summary_ar:
      "موسم المهرجانات الصيفية في لندن في أوج نشاطه مع فعاليات تشمل BST هايد بارك ومهرجان وايرلس وكرنفال نوتينغ هيل. من الحفلات في الهواء الطلق إلى مهرجانات الطعام.",
    announcement_en: "Summer festivals are here",
    announcement_ar: "مهرجانات الصيف هنا",
    news_category: "festivals",
    source: TRUSTED_SOURCES[4], // Time Out
    source_url: "https://www.timeout.com/london/things-to-do/london-festivals",
    relevance_score: 88,
    urgency: "normal",
    is_major: true,
    tags: ["summer", "festivals", "music", "food", "notting-hill-carnival", "hyde-park"],
    keywords: ["london summer festivals", "notting hill carnival", "bst hyde park"],
    active_months: [6, 7, 8],
    ttl_days: 90,
  },
  // Weather warning
  {
    headline_en: "London Weather Warning: What Visitors Need to Know",
    headline_ar: "تحذير طقس لندن: ما يحتاج الزوار معرفته",
    summary_en:
      "The Met Office has issued a weather warning for the London area. Travellers should prepare for potential disruption to outdoor activities and transport services. Check TfL for any service updates and carry appropriate clothing. Indoor attractions such as museums and galleries remain open.",
    summary_ar:
      "أصدر مكتب الأرصاد الجوية تحذيراً بشأن الطقس في منطقة لندن. يجب على المسافرين الاستعداد لاحتمال تعطل الأنشطة الخارجية وخدمات النقل. تظل المعالم الداخلية مفتوحة.",
    announcement_en: "Weather warning issued",
    announcement_ar: "صدور تحذير طقس",
    news_category: "weather",
    source: TRUSTED_SOURCES[6], // Met Office
    source_url: "https://www.metoffice.gov.uk/weather/warnings-and-advice/uk-warnings",
    relevance_score: 80,
    urgency: "urgent",
    is_major: false,
    tags: ["weather", "warning", "rain", "storm", "cold"],
    keywords: ["london weather warning", "london weather today", "met office london"],
    active_months: [1, 2, 3, 10, 11, 12],
    ttl_days: 3,
  },
  // Sales — Boxing Day / January Sales
  {
    headline_en: "London January Sales 2025: Best Deals at Top Shopping Destinations",
    headline_ar: "تخفيضات يناير في لندن 2025: أفضل العروض في أبرز وجهات التسوق",
    summary_en:
      "London's famous January sales offer massive discounts at Harrods, Selfridges, Oxford Street, and Westfield. Many stores start sales on Boxing Day with reductions of up to 70%. Luxury brands at Bicester Village also participate. Plan your shopping trip to make the most of the best deals.",
    summary_ar:
      "تقدم تخفيضات يناير الشهيرة في لندن خصومات ضخمة في هارودز وسيلفريدجز وشارع أكسفورد وويستفيلد. تبدأ العديد من المتاجر التخفيضات يوم البوكسينغ داي بتخفيضات تصل إلى 70%.",
    announcement_en: "January sales now on",
    announcement_ar: "تخفيضات يناير متاحة الآن",
    news_category: "sales",
    source: TRUSTED_SOURCES[3], // Evening Standard
    source_url: "https://www.standard.co.uk/shopping/best-boxing-day-sales",
    relevance_score: 88,
    urgency: "normal",
    is_major: true,
    tags: ["sales", "boxing-day", "january-sales", "harrods", "selfridges", "shopping"],
    keywords: ["london january sales", "boxing day sales london", "harrods sale"],
    active_months: [12, 1],
    ttl_days: 30,
  },
  // Sales — Summer sales
  {
    headline_en: "London Summer Sales 2025: Shop the Best Discounts Across the City",
    headline_ar: "تخفيضات صيف لندن 2025: تسوق أفضل الخصومات في جميع أنحاء المدينة",
    summary_en:
      "London's summer sales are offering discounts across major department stores and designer outlets. Harrods, Selfridges, Harvey Nichols, and Oxford Street shops have significant reductions on fashion, beauty, and homewares. Bicester Village outlet also runs summer promotions.",
    summary_ar:
      "تقدم تخفيضات الصيف في لندن خصومات عبر المتاجر الكبرى ومنافذ المصممين. تقدم هارودز وسيلفريدجز وهارفي نيكولز ومحلات شارع أكسفورد تخفيضات كبيرة على الأزياء والجمال.",
    announcement_en: "Summer sales now on",
    announcement_ar: "تخفيضات الصيف متاحة الآن",
    news_category: "sales",
    source: TRUSTED_SOURCES[3], // Evening Standard
    source_url: "https://www.standard.co.uk/shopping/summer-sales",
    relevance_score: 82,
    urgency: "normal",
    is_major: false,
    tags: ["sales", "summer-sales", "shopping", "harrods", "selfridges", "designer"],
    keywords: ["london summer sales", "summer sales harrods", "london shopping discounts"],
    active_months: [6, 7],
    ttl_days: 45,
  },
  // Sales — Black Friday
  {
    headline_en: "Black Friday in London 2025: Best Deals and Shopping Guide",
    headline_ar: "بلاك فرايداي في لندن 2025: أفضل العروض ودليل التسوق",
    summary_en:
      "Black Friday deals are live across London's major shopping destinations. From Harrods and Selfridges to Oxford Street and Westfield, find massive discounts on luxury goods, electronics, fashion, and beauty. Many deals are available both in-store and online. Arrive early for the best selections.",
    summary_ar:
      "عروض بلاك فرايداي متاحة في وجهات التسوق الرئيسية في لندن. من هارودز وسيلفريدجز إلى شارع أكسفورد وويستفيلد، اعثر على خصومات ضخمة على السلع الفاخرة والإلكترونيات والأزياء.",
    announcement_en: "Black Friday deals live",
    announcement_ar: "عروض بلاك فرايداي متاحة",
    news_category: "sales",
    source: TRUSTED_SOURCES[3], // Evening Standard
    source_url: "https://www.standard.co.uk/shopping/black-friday",
    relevance_score: 85,
    urgency: "normal",
    is_major: true,
    tags: ["black-friday", "sales", "shopping", "deals", "discounts"],
    keywords: ["black friday london", "black friday harrods", "london black friday deals"],
    active_months: [11],
    ttl_days: 10,
  },
  // Public holidays
  {
    headline_en: "UK Bank Holiday: What's Open and Closed in London",
    headline_ar: "عطلة بنكية بريطانية: ما هو مفتوح ومغلق في لندن",
    summary_en:
      "The upcoming UK bank holiday means some changes to London services. Most major tourist attractions, restaurants, and shops remain open, though some may have reduced hours. Public transport runs on a Sunday schedule. Museums and galleries usually keep normal hours. Plan ahead for any specific visits.",
    summary_ar:
      "تعني العطلة البنكية البريطانية القادمة بعض التغييرات في خدمات لندن. تظل معظم المعالم السياحية الرئيسية والمطاعم والمحلات مفتوحة، وإن كان بعضها بساعات مخفضة. يعمل النقل العام بجدول يوم الأحد.",
    announcement_en: "Bank holiday this Monday",
    announcement_ar: "عطلة بنكية يوم الإثنين",
    news_category: "holidays",
    source: TRUSTED_SOURCES[5], // GOV.UK
    source_url: "https://www.gov.uk/bank-holidays",
    relevance_score: 75,
    urgency: "normal",
    is_major: false,
    tags: ["bank-holiday", "public-holiday", "opening-hours", "transport"],
    keywords: ["london bank holiday", "whats open bank holiday london", "bank holiday transport"],
    active_months: [1, 3, 4, 5, 8, 12],
    ttl_days: 5,
  },
  // Pop-up events
  {
    headline_en: "New Pop-Up Experience Opens in London: Limited Time Only",
    headline_ar: "تجربة مؤقتة جديدة تفتح في لندن: لفترة محدودة فقط",
    summary_en:
      "A new immersive pop-up experience has opened in central London, offering visitors a unique limited-time attraction. From interactive art installations to themed dining experiences, London's pop-up scene continues to innovate. Book tickets in advance as these experiences often sell out quickly.",
    summary_ar:
      "افتتحت تجربة غامرة مؤقتة جديدة في وسط لندن، تقدم للزوار معلماً فريداً لفترة محدودة. من المنشآت الفنية التفاعلية إلى تجارب تناول الطعام ذات الطابع المميز. احجز تذاكرك مسبقاً.",
    announcement_en: "New pop-up experience",
    announcement_ar: "تجربة مؤقتة جديدة",
    news_category: "popup",
    source: TRUSTED_SOURCES[4], // Time Out
    source_url: "https://www.timeout.com/london/things-to-do/pop-ups",
    relevance_score: 70,
    urgency: "normal",
    is_major: false,
    tags: ["popup", "immersive", "experience", "limited-time", "attraction"],
    keywords: ["london pop up", "immersive experience london", "new popup london"],
    active_months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    ttl_days: 30,
  },
  // Health advisory
  {
    headline_en: "London Health Advisory for Visitors: Stay Safe and Prepared",
    headline_ar: "نصائح صحية للزوار في لندن: ابقَ آمناً ومستعداً",
    summary_en:
      "UK health authorities have issued advice relevant to London visitors. Pharmacies across the city can help with minor ailments without needing a GP appointment. The NHS 111 service provides free health advice by phone. For emergencies, dial 999 or visit A&E at the nearest hospital.",
    summary_ar:
      "أصدرت السلطات الصحية البريطانية نصائح ذات صلة بزوار لندن. يمكن للصيدليات في جميع أنحاء المدينة المساعدة في الأمراض البسيطة. للطوارئ، اتصل بـ 999 أو قم بزيارة قسم الطوارئ.",
    announcement_en: "Health advice for visitors",
    announcement_ar: "نصائح صحية للزوار",
    news_category: "health",
    source: TRUSTED_SOURCES[5], // GOV.UK
    source_url: "https://www.gov.uk/guidance/nhs-visitors",
    relevance_score: 65,
    urgency: "low",
    is_major: false,
    tags: ["health", "nhs", "pharmacy", "emergency", "safety"],
    keywords: ["london health advice", "nhs visitors london", "pharmacy london"],
    active_months: [1, 2, 3, 10, 11, 12],
    ttl_days: 30,
  },
  // Theatre / West End
  {
    headline_en: "London West End: Top Shows and How to Get Cheap Tickets",
    headline_ar: "ويست إند لندن: أفضل العروض وكيفية الحصول على تذاكر رخيصة",
    summary_en:
      "London's West End theatre district is home to world-class shows. Current hits include long-running musicals and new productions. Save money with TKTS booth in Leicester Square for same-day discounted tickets, or book matinee performances for lower prices. Many shows offer student and under-25 discounts.",
    summary_ar:
      "تستضيف منطقة ويست إند المسرحية في لندن عروضاً عالمية المستوى. وفّر المال مع كشك TKTS في ليستر سكوير للحصول على تذاكر مخفضة لنفس اليوم. تقدم العديد من العروض خصومات للطلاب.",
    announcement_en: "West End shows guide",
    announcement_ar: "دليل عروض ويست إند",
    news_category: "events",
    source: TRUSTED_SOURCES[7], // London Theatre
    source_url: "https://www.londontheatre.co.uk/whats-on",
    relevance_score: 78,
    urgency: "low",
    is_major: false,
    tags: ["theatre", "west-end", "musicals", "shows", "tkts", "tickets"],
    keywords: ["london west end shows", "cheap theatre tickets london", "west end musicals"],
    active_months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    ttl_days: 60,
  },
];

// ---------------------------------------------------------------------------
// Mapping from news categories to info-article tag families
// ---------------------------------------------------------------------------

const CATEGORY_TO_ARTICLE_TAGS: Record<NewsCategory, string[]> = {
  transport: ["transport", "tube", "underground", "oyster", "tfl", "bus", "train", "getting-around"],
  strikes: ["transport", "tube", "underground", "tfl", "getting-around", "disruption"],
  events: ["events", "things-to-do", "attractions", "entertainment", "activities"],
  festivals: ["events", "festivals", "culture", "things-to-do", "celebrations"],
  weather: ["weather", "packing", "preparation", "plan-your-trip", "best-time-to-visit"],
  health: ["health", "safety", "nhs", "pharmacy", "emergency", "plan-your-trip"],
  sales: ["shopping", "sales", "harrods", "selfridges", "oxford-street", "luxury"],
  holidays: ["holidays", "bank-holiday", "opening-hours", "plan-your-trip"],
  popup: ["popup", "events", "things-to-do", "attractions", "immersive"],
  general: ["london", "travel", "tourism", "visitor"],
};

// ---------------------------------------------------------------------------
// Helper: slugify
// ---------------------------------------------------------------------------

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 120);
}

// ---------------------------------------------------------------------------
// Helper: compute related article slugs
// ---------------------------------------------------------------------------

interface ContentItem {
  slug: string;
  tags: string[];
  keywords: string[];
  published: boolean;
}

function computeRelatedArticleSlugs(
  newsCategory: NewsCategory,
  newsTags: string[],
  newsKeywords: string[],
  maxResults: number = 3,
): string[] {
  const matchTagFamilies = CATEGORY_TO_ARTICLE_TAGS[newsCategory] ?? [];

  // Normalise for case-insensitive comparison
  const newsTagsLower = new Set([
    ...newsTags.map((t) => t.toLowerCase()),
    ...matchTagFamilies.map((t) => t.toLowerCase()),
  ]);
  const newsKeywordsLower = new Set(newsKeywords.map((k) => k.toLowerCase()));

  // Build a unified pool of content items
  const pool: ContentItem[] = [
    ...allBlogPosts
      .filter((p) => p.published)
      .map((p) => ({
        slug: p.slug,
        tags: p.tags ?? [],
        keywords: p.keywords ?? [],
        published: p.published,
      })),
    ...allInfoArticles
      .filter((a) => a.published)
      .map((a) => ({
        slug: a.slug,
        tags: a.tags ?? [],
        keywords: a.keywords ?? [],
        published: a.published,
      })),
  ];

  // Score each content item
  const scored = pool.map((item) => {
    let score = 0;
    for (const tag of item.tags) {
      if (newsTagsLower.has(tag.toLowerCase())) score += 15;
    }
    for (const kw of item.keywords) {
      if (newsKeywordsLower.has(kw.toLowerCase())) score += 10;
    }
    return { slug: item.slug, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map((s) => s.slug);
}

// ---------------------------------------------------------------------------
// Helper: generate a research prompt (for future AI integration)
// ---------------------------------------------------------------------------

function generateNewsResearchPrompt(runType: string, currentMonth: number): string {
  const activeTemplateCategories = NEWS_TEMPLATES.filter((t) =>
    t.active_months.includes(currentMonth),
  ).map((t) => t.news_category);

  const uniqueCategories = [...new Set(activeTemplateCategories)];
  const sourceList = TRUSTED_SOURCES.map((s) => `- ${s.name} (${s.domain}): ${s.categories.join(", ")}`).join("\n");

  return `
## London News Research Task — ${runType}

**Date:** ${new Date().toISOString().slice(0, 10)}
**Month:** ${currentMonth}

### Objective
Research and curate 2-3 news items relevant to people planning travel to London.
Focus on actionable information that affects trip planning, budgeting, or day-to-day activities.

### Active categories for this month
${uniqueCategories.map((c) => `- ${c}`).join("\n")}

### Trusted Sources
${sourceList}

### Priority order
1. Transport disruptions (strikes, closures) — immediate impact on visitors
2. Major events and festivals — trip planning opportunities
3. Weather warnings — safety and packing advice
4. Sales and shopping events — budget-relevant for shoppers
5. Public holidays — opening hours and service changes
6. Health advisories — safety information
7. Pop-up experiences — unique limited-time opportunities

### Output format
For each news item, provide:
- headline_en / headline_ar
- summary (max 200 words)
- source attribution
- relevance_score (0-100)
- news_category
- related article slugs from our content library
${runType === "weekly_deep" ? "\n### Weekly Deep: Cross-reference all news against information hub articles for fact-checking.\nFlag any articles where facts (prices, schedules, regulations) may need updating." : ""}
  `.trim();
}

// ---------------------------------------------------------------------------
// Helper: find info articles affected by a news category (for weekly_deep)
// ---------------------------------------------------------------------------

function findAffectedInfoArticles(
  newsCategory: NewsCategory,
  newsTags: string[],
): { slug: string; title_en: string; reason: string }[] {
  const relevantTags = new Set([
    ...newsTags.map((t) => t.toLowerCase()),
    ...(CATEGORY_TO_ARTICLE_TAGS[newsCategory] ?? []).map((t) => t.toLowerCase()),
  ]);

  const affected: { slug: string; title_en: string; reason: string }[] = [];

  for (const article of allInfoArticles) {
    if (!article.published) continue;

    const articleTags = (article.tags ?? []).map((t) => t.toLowerCase());
    const overlap = articleTags.filter((t) => relevantTags.has(t));

    if (overlap.length > 0) {
      affected.push({
        slug: article.slug,
        title_en: article.title_en,
        reason: `Matching tags: ${overlap.join(", ")}`,
      });
    }
  }

  return affected;
}

// ---------------------------------------------------------------------------
// Main GET handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  // 1. Authenticate via CRON_SECRET
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("[london-news] CRON_SECRET not configured");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { prisma, disconnectDatabase } = await import("@/lib/db");

  // Healthcheck mode
  if (request.nextUrl.searchParams.get("healthcheck") === "true") {
    try {
      const lastRun = await prisma.newsResearchLog.findFirst({
        orderBy: { created_at: "desc" },
        select: { run_type: true, status: true, created_at: true, items_published: true },
      });
      const activeNewsCount = await prisma.newsItem.count({
        where: { status: "published" },
      });
      return NextResponse.json({
        status: "healthy",
        endpoint: "london-news",
        lastRun: lastRun ?? null,
        activeNewsItems: activeNewsCount,
        templateCount: NEWS_TEMPLATES.length,
        trustedSources: TRUSTED_SOURCES.length,
        timestamp: new Date().toISOString(),
      });
    } catch {
      return NextResponse.json(
        { status: "unhealthy", endpoint: "london-news" },
        { status: 503 },
      );
    }
  }

  const startTime = Date.now();

  // 2. Determine run type
  const runType = (request.nextUrl.searchParams.get("type") as "daily" | "weekly_deep") ?? "daily";
  const currentMonth = new Date().getMonth() + 1; // 1-12
  const today = new Date();

  // Track metrics
  let itemsFound = 0;
  let itemsPublished = 0;
  let itemsSkipped = 0;
  let factsFlagged = 0;
  let itemsArchived = 0;
  const sourcesChecked: string[] = [];
  const errors: string[] = [];

  // Create research log
  let researchLogId: string | null = null;

  try {
    // 3. Create research log entry
    const researchLog = await prisma.newsResearchLog.create({
      data: {
        run_type: runType,
        status: "running",
        sources_checked: TRUSTED_SOURCES.map((s) => s.name),
      },
    });
    researchLogId = researchLog.id;

    // Store the research prompt for transparency
    const _researchPrompt = generateNewsResearchPrompt(runType, currentMonth);

    // 4. Auto-archive expired news items
    const expiredItems = await prisma.newsItem.updateMany({
      where: {
        status: "published",
        expires_at: { lte: today },
      },
      data: {
        status: "archived",
      },
    });
    itemsArchived = expiredItems.count;
    if (itemsArchived > 0) {
      console.log(`[london-news] Auto-archived ${itemsArchived} expired news items`);
    }

    // 5. Select templates active for the current month
    const activeTemplates = NEWS_TEMPLATES.filter((t) =>
      t.active_months.includes(currentMonth),
    );

    // Determine how many items to publish
    const targetCount = runType === "weekly_deep" ? 3 : 2;

    // Check what news categories already have recent (non-archived) items (within last 3 days)
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const recentItems = await prisma.newsItem.findMany({
      where: {
        status: { in: ["published", "draft"] },
        created_at: { gte: threeDaysAgo },
      },
      select: { news_category: true, slug: true },
    });
    const recentCategories = new Set(recentItems.map((r) => r.news_category));

    // Prioritise templates for categories we don't already have recent coverage on
    const sortedTemplates = [...activeTemplates].sort((a, b) => {
      const aRecent = recentCategories.has(a.news_category) ? 1 : 0;
      const bRecent = recentCategories.has(b.news_category) ? 1 : 0;
      if (aRecent !== bRecent) return aRecent - bRecent; // Prefer categories without recent items
      return b.relevance_score - a.relevance_score; // Then by relevance
    });

    const selectedTemplates = sortedTemplates.slice(0, targetCount);
    itemsFound = selectedTemplates.length;

    // 5b. Supplement templates with LIVE news from Grok (if XAI_API_KEY is configured)
    const liveNewsItems = await fetchLiveNewsViaGrok(runType);
    if (liveNewsItems.length > 0) {
      console.log(`[london-news] Grok returned ${liveNewsItems.length} live news items`);
      // Mark Grok as a checked source immediately (don't wait for save loop)
      if (!sourcesChecked.includes("Grok Live Search")) {
        sourcesChecked.push("Grok Live Search");
      }
    }

    // 6. Create news items from selected templates + live news
    const createdItems: { id: string; slug: string; headline: string; category: string }[] = [];

    for (const template of selectedTemplates) {
      try {
        const baseSlug = slugify(template.headline_en);
        const datePrefix = today.toISOString().slice(0, 10);
        const slug = `${baseSlug}-${datePrefix}`;

        // Check for duplicate slugs
        const existingSlug = await prisma.newsItem.findUnique({
          where: { slug },
          select: { id: true },
        });

        if (existingSlug) {
          console.log(`[london-news] Skipping duplicate slug: ${slug}`);
          itemsSkipped++;
          continue;
        }

        // Compute related article slugs
        const relatedArticleSlugs = computeRelatedArticleSlugs(
          template.news_category,
          template.tags,
          template.keywords,
        );

        // Compute expiry date
        const expiresAt = new Date(today.getTime() + template.ttl_days * 24 * 60 * 60 * 1000);

        // Find affected info articles for cross-referencing
        const affectedInfo = findAffectedInfoArticles(template.news_category, template.tags);
        const affectedInfoSlugs = affectedInfo.map((a) => a.slug);
        const updatesInfoArticle = affectedInfoSlugs.length > 0;

        // Track which sources we actually used
        if (!sourcesChecked.includes(template.source.name)) {
          sourcesChecked.push(template.source.name);
        }

        // Create the news item
        const newsItem = await prisma.newsItem.create({
          data: {
            slug,
            status: "published",
            headline_en: template.headline_en,
            headline_ar: template.headline_ar,
            summary_en: template.summary_en,
            summary_ar: template.summary_ar,
            announcement_en: template.announcement_en,
            announcement_ar: template.announcement_ar,
            source_name: template.source.name,
            source_url: template.source_url,
            news_category: template.news_category,
            relevance_score: template.relevance_score,
            is_major: template.is_major,
            urgency: template.urgency,
            expires_at: expiresAt,
            meta_title_en: template.headline_en.slice(0, 60),
            meta_title_ar: template.headline_ar.slice(0, 60),
            meta_description_en: template.summary_en.slice(0, 155),
            meta_description_ar: template.summary_ar.slice(0, 155),
            tags: template.tags,
            keywords: template.keywords,
            related_article_slugs: relatedArticleSlugs,
            related_shop_slugs: [],
            affiliate_link_ids: [],
            agent_source: `template:${template.news_category}`,
            agent_notes: `Auto-generated from NEWS_TEMPLATES for month ${currentMonth}. Run type: ${runType}.`,
            research_log: [
              {
                source: template.source.name,
                domain: template.source.domain,
                query: `${template.news_category} news London`,
                found_at: today.toISOString(),
                relevance: template.relevance_score,
                template_used: true,
              },
            ],
            updates_info_article: updatesInfoArticle,
            affected_info_slugs: affectedInfoSlugs,
            published_at: today,
          },
        });

        createdItems.push({
          id: newsItem.id,
          slug: newsItem.slug,
          headline: newsItem.headline_en,
          category: newsItem.news_category,
        });
        itemsPublished++;

        console.log(
          `[london-news] Published: "${template.headline_en}" (${template.news_category}) [${slug}]`,
        );

        // 7. Weekly deep: Cross-reference against information articles and create FactEntry records
        if (runType === "weekly_deep" && affectedInfo.length > 0) {
          for (const affected of affectedInfo) {
            try {
              // Check if a pending FactEntry already exists for this article + category
              const existingFact = await prisma.factEntry.findFirst({
                where: {
                  article_slug: affected.slug,
                  category: template.news_category,
                  status: { in: ["pending", "disputed"] },
                },
              });

              if (!existingFact) {
                await prisma.factEntry.create({
                  data: {
                    article_type: "information",
                    article_slug: affected.slug,
                    fact_text_en: `News update (${template.news_category}): "${template.headline_en}" may affect information in "${affected.title_en}".`,
                    fact_text_ar: `تحديث إخباري (${template.news_category}): "${template.headline_ar}" قد يؤثر على المعلومات في "${affected.title_en}".`,
                    category: template.news_category,
                    status: "pending",
                    confidence_score: 0,
                    next_check_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Check within 7 days
                    source_url: template.source_url,
                    source_name: template.source.name,
                    source_type: getSourceType(template.source),
                    agent_notes: `Flagged by london-news cron (${runType}). ${affected.reason}. News slug: ${slug}.`,
                    verification_log: [
                      {
                        date: today.toISOString(),
                        source: "london-news-cron",
                        result: "flagged_for_review",
                        notes: `News item "${template.headline_en}" may require updates to article "${affected.slug}".`,
                      },
                    ],
                  },
                });
                factsFlagged++;
                console.log(
                  `[london-news] Flagged fact for review: ${affected.slug} (${template.news_category})`,
                );
              }
            } catch (factError) {
              console.warn(
                `[london-news] Failed to create FactEntry for ${affected.slug}:`,
                factError instanceof Error ? factError.message : factError,
              );
            }
          }
        }
      } catch (itemError) {
        const errMsg = itemError instanceof Error ? itemError.message : String(itemError);
        console.error(`[london-news] Failed to create news item: ${errMsg}`);
        errors.push(errMsg);
        itemsSkipped++;
      }
    }

    // 7b. Create news items from Grok live news (supplement templates with real-time data)
    for (const liveItem of liveNewsItems) {
      try {
        const baseSlug = slugify(liveItem.headline_en || "london-news");
        const datePrefix = today.toISOString().slice(0, 10);
        const slug = `${baseSlug}-${datePrefix}`;

        // Deduplicate
        const existingSlug = await prisma.newsItem.findUnique({
          where: { slug },
          select: { id: true },
        });
        if (existingSlug) {
          itemsSkipped++;
          continue;
        }

        // Skip categories we already covered with templates
        const liveCategory = (liveItem.category || "general") as NewsCategory;
        if (recentCategories.has(liveCategory)) {
          itemsSkipped++;
          continue;
        }

        const ttlDays = liveItem.ttl_days || 3;
        const expiresAt = new Date(today.getTime() + ttlDays * 24 * 60 * 60 * 1000);
        const relatedArticleSlugs = computeRelatedArticleSlugs(
          liveCategory,
          [],
          [],
        );

        const newsItem = await prisma.newsItem.create({
          data: {
            slug,
            status: "published",
            headline_en: (liveItem.headline_en || "").slice(0, 200),
            headline_ar: (liveItem.headline_ar || "").slice(0, 200),
            summary_en: (liveItem.summary_en || "").slice(0, 1000),
            summary_ar: (liveItem.summary_ar || "").slice(0, 1000),
            announcement_en: (liveItem.headline_en || "").slice(0, 100),
            announcement_ar: (liveItem.headline_ar || "").slice(0, 100),
            source_name: liveItem.source || "Grok Live Search",
            source_url: "",
            news_category: liveCategory,
            relevance_score: 75,
            is_major: liveItem.urgency === "high" || liveItem.urgency === "urgent",
            urgency: liveItem.urgency === "urgent" ? "urgent" : liveItem.urgency === "high" ? "urgent" : "normal",
            expires_at: expiresAt,
            meta_title_en: (liveItem.headline_en || "").slice(0, 60),
            meta_title_ar: (liveItem.headline_ar || "").slice(0, 60),
            meta_description_en: (liveItem.summary_en || "").slice(0, 155),
            meta_description_ar: (liveItem.summary_ar || "").slice(0, 155),
            tags: [liveCategory, "grok-live", "auto-generated"],
            keywords: [],
            related_article_slugs: relatedArticleSlugs,
            related_shop_slugs: [],
            affiliate_link_ids: [],
            agent_source: "grok-live-search",
            agent_notes: `Real-time news from Grok web_search. Run type: ${runType}.`,
            research_log: [{
              source: "grok-live-search",
              domain: liveItem.source || "api.x.ai",
              query: "London news",
              found_at: today.toISOString(),
              relevance: 75,
              template_used: false,
            }],
            updates_info_article: false,
            affected_info_slugs: [],
            published_at: today,
          },
        });

        createdItems.push({
          id: newsItem.id,
          slug: newsItem.slug,
          headline: newsItem.headline_en,
          category: newsItem.news_category,
        });
        itemsPublished++;
        if (!sourcesChecked.includes("Grok Live Search")) {
          sourcesChecked.push("Grok Live Search");
        }

        console.log(`[london-news] Published (Grok live): "${liveItem.headline_en}" (${liveCategory}) [${slug}]`);
      } catch (liveErr) {
        const errMsg = liveErr instanceof Error ? liveErr.message : String(liveErr);
        console.warn(`[london-news] Failed to create Grok live news item: ${errMsg}`);
        errors.push(errMsg);
        itemsSkipped++;
      }
    }

    // 8. Update research log with results
    const durationMs = Date.now() - startTime;

    if (researchLogId) {
      await prisma.newsResearchLog.update({
        where: { id: researchLogId },
        data: {
          status: "completed",
          sources_checked: sourcesChecked,
          items_found: itemsFound,
          items_published: itemsPublished,
          items_skipped: itemsSkipped,
          facts_flagged: factsFlagged,
          duration_ms: durationMs,
          result_summary: {
            run_type: runType,
            month: currentMonth,
            templates_active: activeTemplates.length,
            templates_selected: selectedTemplates.length,
            items_archived: itemsArchived,
            created_items: createdItems,
            recent_categories_skipped: [...recentCategories],
            errors: errors.length > 0 ? errors : undefined,
          },
        },
      });
    }

    // 9. Log cron execution
    await logCronExecution("london-news", "completed", {
      durationMs,
      itemsProcessed: itemsFound,
      itemsSucceeded: itemsPublished,
      itemsFailed: itemsSkipped,
      resultSummary: {
        runType,
        month: currentMonth,
        published: itemsPublished,
        skipped: itemsSkipped,
        archived: itemsArchived,
        factsFlagged,
      },
    });

    // 10. Return response with metrics
    return NextResponse.json({
      success: true,
      agent: "london-news-carousel",
      runType,
      timestamp: today.toISOString(),
      durationMs,
      metrics: {
        templatesActive: activeTemplates.length,
        itemsFound,
        itemsPublished,
        itemsSkipped,
        itemsArchived,
        factsFlagged,
        sourcesChecked,
      },
      createdItems,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error("[london-news] Cron job failed:", error);

    const { onCronFailure } = await import("@/lib/ops/failure-hooks");
    onCronFailure({ jobName: "london-news", error: errorMessage }).catch(() => {});

    // Update research log with failure
    if (researchLogId) {
      try {
        await prisma.newsResearchLog.update({
          where: { id: researchLogId },
          data: {
            status: "failed",
            duration_ms: durationMs,
            error_message: errorMessage,
            items_found: itemsFound,
            items_published: itemsPublished,
            items_skipped: itemsSkipped,
            facts_flagged: factsFlagged,
          },
        });
      } catch {
        // Best-effort log update
      }
    }

    // Log cron execution
    await logCronExecution("london-news", "failed", {
      durationMs,
      itemsProcessed: itemsFound,
      itemsSucceeded: itemsPublished,
      itemsFailed: itemsSkipped,
      errorMessage,
    });

    return NextResponse.json(
      {
        success: false,
        agent: "london-news-carousel",
        runType,
        error: errorMessage,
        errorStack: process.env.NODE_ENV === "development" ? errorStack : undefined,
        durationMs,
        metrics: {
          itemsPublished,
          itemsSkipped,
          itemsArchived,
          factsFlagged,
        },
      },
      { status: 500 },
    );
  } finally {
    // Release PgBouncer session connection — critical for Supabase session mode
    await disconnectDatabase().catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// Helper: map source to FactEntry source_type
// ---------------------------------------------------------------------------

function getSourceType(
  source: TrustedSource,
): "official_gov" | "transport_authority" | "tourism_board" | "news" | "review_site" {
  if (source.domain.includes("gov.uk")) return "official_gov";
  if (source.domain.includes("tfl.gov.uk")) return "transport_authority";
  if (source.domain.includes("visitlondon")) return "tourism_board";
  if (source.domain.includes("metoffice")) return "official_gov";
  if (source.domain.includes("timeout") || source.domain.includes("londontheatre"))
    return "review_site";
  return "news";
}

// ---------------------------------------------------------------------------
// Grok Live News — real-time news from trusted sources via web_search
// ---------------------------------------------------------------------------

interface GrokLiveNewsItem {
  headline_en: string;
  headline_ar: string;
  summary_en: string;
  summary_ar: string;
  category: string;
  urgency: string;
  source: string;
  ttl_days: number;
}

/**
 * Fetch real-time London news via Grok's web_search tool.
 * Uses domain filtering to restrict results to TRUSTED_SOURCES.
 * Returns empty array if XAI_API_KEY is not configured (graceful degradation).
 */
async function fetchLiveNewsViaGrok(
  runType: string,
): Promise<GrokLiveNewsItem[]> {
  try {
    const { isGrokSearchAvailable, searchCityNews } = await import(
      "@/lib/ai/grok-live-search"
    );
    if (!isGrokSearchAvailable()) {
      return [];
    }

    // Use the first 5 trusted domains for Grok web_search filtering
    const trustedDomains = TRUSTED_SOURCES.map((s) => s.domain).slice(0, 5);

    const result = await searchCityNews("London", trustedDomains);

    // Parse JSON response
    let jsonStr = result.content.trim();
    if (jsonStr.startsWith("```json")) jsonStr = jsonStr.slice(7);
    if (jsonStr.startsWith("```")) jsonStr = jsonStr.slice(3);
    if (jsonStr.endsWith("```")) jsonStr = jsonStr.slice(0, -3);
    jsonStr = jsonStr.trim();

    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) return [];

    // Limit to 3 items max for daily, 5 for weekly_deep
    const maxItems = runType === "weekly_deep" ? 5 : 3;

    console.log(
      `[london-news] Grok live search returned ${parsed.length} news items (using ${result.usage.totalTokens} tokens)`,
    );

    return parsed.slice(0, maxItems) as GrokLiveNewsItem[];
  } catch (error) {
    console.warn(
      "[london-news] Grok live news fetch failed (non-fatal):",
      error instanceof Error ? error.message : error,
    );
    return [];
  }
}
