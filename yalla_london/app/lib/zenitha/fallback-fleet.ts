/**
 * Zenitha Yachts — Static Fallback Fleet Dataset
 * ================================================
 * Single source of truth for a rich, believable charter catalogue that renders
 * when the `Yacht`, `YachtDestination`, and `CharterItinerary` tables are empty
 * (e.g. pre-launch, fresh DB, or a transient DB outage).
 *
 * Rationale: the Zenitha Yachts site was fully designed but its catalogue,
 * itineraries, and destination-detail pages are DB-driven. With an unseeded DB
 * the homepage looked polished but every deep page was empty or 404'd — making
 * the site read as a "skeleton". This module guarantees the site always looks
 * finished. When real DB records exist, they take precedence (fallbacks only
 * fire when a query returns zero rows for a yacht site).
 *
 * All photos are Unsplash (free commercial license). All copy is bilingual EN/AR.
 */

// ─── Enums (mirror prisma/schema.prisma) ────────────────────────────────
export type YachtTypeEnum =
  | 'SAILBOAT'
  | 'CATAMARAN'
  | 'MOTOR_YACHT'
  | 'GULET'
  | 'SUPERYACHT'
  | 'POWER_CATAMARAN';

export type DestRegion = 'MEDITERRANEAN' | 'ARABIAN_GULF' | 'RED_SEA';
export type Difficulty = 'EASY' | 'MODERATE' | 'ADVANCED';

// ─── Image helper ───────────────────────────────────────────────────────
const U = (id: string, w = 1200) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;

const PHOTO = {
  superyacht: '1567899378494-47b22a2ae96a',
  motorYacht: '1569263979104-865ab7cd8d13',
  catamaran: '1540946485063-a40da27545f8',
  sailing: '1473116763249-2faaef81ccda',
  deck: '1544551763-46a013bb70d5',
  interior: '1520250497591-112f2f40a3f4',
  dining: '1544124499-58912cbddaad',
  sunset: '1504472478235-9bc48ba4d60f',
  aerial: '1605281317010-fe5ffe798166',
  coast: '1528154291023-a6525fabe5b4',
  greek: '1533105079780-92b9be482077',
  croatia: '1555990538-1d0f55016bfc',
  turkey: '1569263979104-865ab7cd8d13',
  amalfi: '1515859005217-8a1f08870f59',
  riviera: '1491166617655-0723a0999cfc',
  balearic: '1507525428034-b723cf961d3e',
  gulf: '1512453979798-5ea266f8880c',
  redsea: '1580541631950-7282082b53ce',
} as const;

// ─── Canonical Destination type (superset of every consumer shape) ──────
export interface FallbackDestination {
  id: string;
  name: string;
  name_ar: string;
  slug: string;
  region: DestRegion;
  country: string;
  description_en: string;
  description_ar: string;
  seasonStart: string;
  seasonEnd: string;
  bestMonths: string[];
  heroImage: string;
  galleryImages: string[];
  averagePricePerWeek: number;
  currency: string;
  highlights: { title: string; description: string; icon?: string }[];
  weatherInfo: {
    summerTemp?: string;
    winterTemp?: string;
    waterTemp?: string;
    windConditions?: string;
  };
  marinas: { name: string; description?: string; location?: string; facilities?: string[] }[];
  featured: boolean;
  priceFrom: string;
  season_en: string;
  season_ar: string;
}

// ─── Canonical Yacht type (superset of every consumer shape) ─────────────
export interface FallbackYacht {
  id: string;
  name: string;
  slug: string;
  type: YachtTypeEnum;
  length: number;
  beam: number;
  draft: number;
  yearBuilt: number;
  builder: string;
  model: string;
  cabins: number;
  berths: number;
  bathrooms: number;
  crewSize: number;
  pricePerWeekLow: number;
  pricePerWeekHigh: number;
  currency: string;
  description_en: string;
  description_ar: string;
  features: string[];
  images: string[];
  waterSports: string[];
  halalCateringAvailable: boolean;
  familyFriendly: boolean;
  crewIncluded: boolean;
  homePort: string;
  cruisingArea: string;
  rating: number;
  reviewCount: number;
  featured: boolean;
  destinationSlug: string;
}

// ─── Canonical Itinerary type ────────────────────────────────────────────
export interface FallbackItinerary {
  id: string;
  title_en: string;
  title_ar: string;
  slug: string;
  duration: number;
  difficulty: Difficulty;
  description_en: string;
  description_ar: string;
  stops: { day: number; port: string; lat?: number; lng?: number; activities?: string[]; notes?: string }[];
  recommendedYachtTypes: YachtTypeEnum[];
  estimatedCost: number;
  currency: string;
  bestSeason: string;
  heroImage: string;
  destinationSlug: string;
}

// ─── DESTINATIONS (8) ────────────────────────────────────────────────────
export const FALLBACK_DESTINATIONS: FallbackDestination[] = [
  {
    id: 'fb-dest-greek-islands',
    name: 'Greek Islands',
    name_ar: 'الجزر اليونانية',
    slug: 'greek-islands',
    region: 'MEDITERRANEAN',
    country: 'Greece',
    description_en:
      'From the wind-swept beauty of the Cyclades to the emerald bays of the Ionian, the Greek Islands are the Mediterranean’s most beloved sailing ground. Whitewashed villages, hidden coves, and crystalline anchorages await — all within a short sail of one another.',
    description_ar:
      'من جمال جزر سيكلاديز الذي تعانقه الرياح إلى الخلجان الزمردية في البحر الأيوني، تُعد الجزر اليونانية أحبّ وجهات الإبحار في البحر المتوسط. قرى بيضاء وخلجان مخفية ومراسٍ صافية تنتظرك — جميعها على مسافة إبحار قصيرة من بعضها.',
    seasonStart: 'May',
    seasonEnd: 'October',
    bestMonths: ['June', 'July', 'August', 'September'],
    heroImage: U(PHOTO.greek, 1920),
    galleryImages: [U(PHOTO.greek), U(PHOTO.sunset), U(PHOTO.sailing)],
    averagePricePerWeek: 18500,
    currency: 'EUR',
    highlights: [
      { title: 'Santorini Caldera', description: 'Anchor beneath the world’s most photographed volcanic cliffs.', icon: 'sunset' },
      { title: 'Mykonos & the Cyclades', description: 'Cosmopolitan nights and secluded turquoise bays in equal measure.', icon: 'anchor' },
      { title: 'Ancient Delos', description: 'Step ashore on the sacred island birthplace of Apollo.', icon: 'compass' },
    ],
    weatherInfo: { summerTemp: '28–32°C', waterTemp: '24–26°C', windConditions: 'Meltemi breeze, N/NW 10–25 kn' },
    marinas: [
      { name: 'Mykonos Marina', location: 'Mykonos', facilities: ['Fuel', 'Provisioning', 'Concierge'] },
      { name: 'Athens (Alimos)', location: 'Athens', facilities: ['Charter base', 'Fuel', 'Repairs'] },
    ],
    featured: true,
    priceFrom: '€8,500',
    season_en: 'May – October',
    season_ar: 'مايو – أكتوبر',
  },
  {
    id: 'fb-dest-croatian-coast',
    name: 'Croatian Coast',
    name_ar: 'ساحل كرواتيا',
    slug: 'croatian-coast',
    region: 'MEDITERRANEAN',
    country: 'Croatia',
    description_en:
      'Over a thousand islands scatter along the Dalmatian coast, threaded by calm channels and crowned by the walled cities of Dubrovnik, Split, and Hvar. Croatia offers the Mediterranean’s most sheltered, island-dense cruising.',
    description_ar:
      'أكثر من ألف جزيرة تتناثر على طول ساحل دالماسيا، تربطها قنوات هادئة وتتوّجها مدن دوبروفنيك وسبليت وهفار المُسوّرة. تقدّم كرواتيا أكثر وجهات المتوسط حمايةً وكثافةً بالجزر.',
    seasonStart: 'June',
    seasonEnd: 'September',
    bestMonths: ['June', 'July', 'August'],
    heroImage: U(PHOTO.croatia, 1920),
    galleryImages: [U(PHOTO.croatia), U(PHOTO.aerial), U(PHOTO.deck)],
    averagePricePerWeek: 21000,
    currency: 'EUR',
    highlights: [
      { title: 'Dubrovnik Old Town', description: 'Sail beneath the honey-stone ramparts of the "Pearl of the Adriatic".', icon: 'compass' },
      { title: 'Hvar & the Pakleni Islands', description: 'Lavender-scented hills above a chain of glittering swim stops.', icon: 'anchor' },
      { title: 'Kornati National Park', description: 'A moonscape archipelago of 89 uninhabited islands.', icon: 'ship' },
    ],
    weatherInfo: { summerTemp: '27–31°C', waterTemp: '23–25°C', windConditions: 'Maestral SW 8–18 kn afternoons' },
    marinas: [
      { name: 'ACI Marina Split', location: 'Split', facilities: ['Charter base', 'Fuel', 'Provisioning'] },
      { name: 'ACI Marina Dubrovnik', location: 'Dubrovnik', facilities: ['Fuel', 'Concierge', 'Repairs'] },
    ],
    featured: true,
    priceFrom: '€9,000',
    season_en: 'June – September',
    season_ar: 'يونيو – سبتمبر',
  },
  {
    id: 'fb-dest-turkish-riviera',
    name: 'Turkish Riviera',
    name_ar: 'الريفيرا التركية',
    slug: 'turkish-riviera',
    region: 'MEDITERRANEAN',
    country: 'Turkey',
    description_en:
      'The Turquoise Coast between Bodrum and Göcek is the spiritual home of the gulet — the handcrafted wooden yacht. Pine forests tumble to warm, sheltered bays dotted with Lycian ruins and beach clubs.',
    description_ar:
      'الساحل الفيروزي بين بودروم وغوجك هو الموطن الروحي للـ"غوليت" — اليخت الخشبي المصنوع يدوياً. غابات الصنوبر تنحدر نحو خلجان دافئة محمية تتناثر فيها آثار ليقيا ونوادي الشاطئ.',
    seasonStart: 'May',
    seasonEnd: 'October',
    bestMonths: ['June', 'July', 'August', 'September'],
    heroImage: U(PHOTO.turkey, 1920),
    galleryImages: [U(PHOTO.turkey), U(PHOTO.coast), U(PHOTO.dining)],
    averagePricePerWeek: 15500,
    currency: 'EUR',
    highlights: [
      { title: 'Göcek’s 12 Islands', description: 'A protected labyrinth of coves made for lazy anchor-downs.', icon: 'anchor' },
      { title: 'Butterfly Valley', description: 'A hidden canyon beach reachable only from the sea.', icon: 'compass' },
      { title: 'Kekova’s Sunken City', description: 'Snorkel above the submerged ruins of ancient Simena.', icon: 'ship' },
    ],
    weatherInfo: { summerTemp: '30–35°C', waterTemp: '25–28°C', windConditions: 'Light thermal SW, calm mornings' },
    marinas: [
      { name: 'D-Marin Göcek', location: 'Göcek', facilities: ['Charter base', 'Fuel', 'Provisioning'] },
      { name: 'Bodrum Marina', location: 'Bodrum', facilities: ['Fuel', 'Concierge', 'Repairs'] },
    ],
    featured: true,
    priceFrom: '€6,500',
    season_en: 'May – October',
    season_ar: 'مايو – أكتوبر',
  },
  {
    id: 'fb-dest-amalfi-coast',
    name: 'Amalfi Coast',
    name_ar: 'ساحل أمالفي',
    slug: 'amalfi-coast',
    region: 'MEDITERRANEAN',
    country: 'Italy',
    description_en:
      'Vertiginous cliffs, lemon groves, and pastel villages spilling to the sea — the Amalfi Coast pairs La Dolce Vita glamour with Capri’s legendary Blue Grotto and Positano’s golden light.',
    description_ar:
      'منحدرات شاهقة وبساتين ليمون وقرى بألوان الباستيل تنساب نحو البحر — يجمع ساحل أمالفي بين بريق "الحياة الحلوة" ومغارة كابري الزرقاء الأسطورية وضوء بوزيتانو الذهبي.',
    seasonStart: 'May',
    seasonEnd: 'September',
    bestMonths: ['May', 'June', 'July', 'September'],
    heroImage: U(PHOTO.amalfi, 1920),
    galleryImages: [U(PHOTO.amalfi), U(PHOTO.superyacht), U(PHOTO.dining)],
    averagePricePerWeek: 34000,
    currency: 'EUR',
    highlights: [
      { title: 'Capri & the Blue Grotto', description: 'Tender into a sea cave lit by an unearthly cobalt glow.', icon: 'compass' },
      { title: 'Positano at Golden Hour', description: 'Aperitivo on deck beneath the coast’s most iconic cascade of houses.', icon: 'sunset' },
      { title: 'Li Galli Islands', description: 'The private archipelago of the mythical Sirens.', icon: 'anchor' },
    ],
    weatherInfo: { summerTemp: '28–32°C', waterTemp: '24–26°C', windConditions: 'Gentle sea breeze, calm mornings' },
    marinas: [
      { name: 'Marina di Stabia', location: 'Naples', facilities: ['Charter base', 'Fuel', 'Concierge'] },
      { name: 'Marina Grande, Capri', location: 'Capri', facilities: ['Tender dock', 'Provisioning'] },
    ],
    featured: false,
    priceFrom: '€14,000',
    season_en: 'May – September',
    season_ar: 'مايو – سبتمبر',
  },
  {
    id: 'fb-dest-french-riviera',
    name: 'French Riviera',
    name_ar: 'الريفيرا الفرنسية',
    slug: 'french-riviera',
    region: 'MEDITERRANEAN',
    country: 'France',
    description_en:
      'From St-Tropez to Monaco, the Côte d’Azur is the glittering heart of superyachting. Michelin harbours, the Îles de Lérins, and Cannes’ red-carpet glamour define the world’s most storied charter coast.',
    description_ar:
      'من سان تروبيه إلى موناكو، تُعد كوت دازور القلب المتلألئ لعالم اليخوت الفاخرة. موانئ ميشلان وجزر ليرين وبريق السجادة الحمراء في كان تحدّد أعرق سواحل التأجير في العالم.',
    seasonStart: 'June',
    seasonEnd: 'September',
    bestMonths: ['June', 'July', 'August', 'September'],
    heroImage: U(PHOTO.riviera, 1920),
    galleryImages: [U(PHOTO.riviera), U(PHOTO.superyacht), U(PHOTO.interior)],
    averagePricePerWeek: 48000,
    currency: 'EUR',
    highlights: [
      { title: 'Monaco & the Grand Prix', description: 'Berth in the world’s most exclusive harbour.', icon: 'ship' },
      { title: 'St-Tropez & Pampelonne', description: 'Beach-club lunches and Provencal markets.', icon: 'anchor' },
      { title: 'Îles de Lérins', description: 'Pine-clad island anchorages minutes from Cannes.', icon: 'compass' },
    ],
    weatherInfo: { summerTemp: '26–30°C', waterTemp: '22–25°C', windConditions: 'Mistral possible, otherwise light' },
    marinas: [
      { name: 'Port Hercule, Monaco', location: 'Monaco', facilities: ['Superyacht berths', 'Concierge', 'Fuel'] },
      { name: 'Port Vauban, Antibes', location: 'Antibes', facilities: ['Charter base', 'Fuel', 'Repairs'] },
    ],
    featured: true,
    priceFrom: '€18,000',
    season_en: 'June – September',
    season_ar: 'يونيو – سبتمبر',
  },
  {
    id: 'fb-dest-balearic-islands',
    name: 'Balearic Islands',
    name_ar: 'جزر البليار',
    slug: 'balearic-islands',
    region: 'MEDITERRANEAN',
    country: 'Spain',
    description_en:
      'Ibiza’s legendary energy, Formentera’s Caribbean-clear water, and Mallorca’s dramatic Tramuntana cliffs — the Balearics blend party and paradise across four sun-drenched islands.',
    description_ar:
      'طاقة إيبيزا الأسطورية ومياه فورمينتيرا الصافية كالكاريبي ومنحدرات ترامونتانا الخلابة في مايوركا — تمزج جزر البليار بين السهر والفردوس عبر أربع جزر تغمرها الشمس.',
    seasonStart: 'May',
    seasonEnd: 'October',
    bestMonths: ['June', 'July', 'August', 'September'],
    heroImage: U(PHOTO.balearic, 1920),
    galleryImages: [U(PHOTO.balearic), U(PHOTO.catamaran), U(PHOTO.sunset)],
    averagePricePerWeek: 26000,
    currency: 'EUR',
    highlights: [
      { title: 'Formentera Sandbanks', description: 'Anchor over white sand in turquoise so clear it looks lit from below.', icon: 'anchor' },
      { title: 'Ibiza Sunset Sail', description: 'Off Es Vedrà as the sky turns to fire.', icon: 'sunset' },
      { title: 'Mallorca’s Cala Coves', description: 'Hidden limestone inlets on the wild north coast.', icon: 'compass' },
    ],
    weatherInfo: { summerTemp: '28–32°C', waterTemp: '24–26°C', windConditions: 'Thermal breeze 10–18 kn' },
    marinas: [
      { name: 'Marina Ibiza', location: 'Ibiza', facilities: ['Superyacht berths', 'Concierge', 'Fuel'] },
      { name: 'Port de Palma', location: 'Mallorca', facilities: ['Charter base', 'Fuel', 'Repairs'] },
    ],
    featured: false,
    priceFrom: '€11,000',
    season_en: 'May – October',
    season_ar: 'مايو – أكتوبر',
  },
  {
    id: 'fb-dest-arabian-gulf',
    name: 'Arabian Gulf',
    name_ar: 'الخليج العربي',
    slug: 'arabian-gulf',
    region: 'ARABIAN_GULF',
    country: 'United Arab Emirates',
    description_en:
      'Charter year-round warmth between Dubai’s skyline, Abu Dhabi’s islands, and the untouched sandbars of the lower Gulf. Arabic-speaking crews, halal provisioning, and absolute privacy come as standard.',
    description_ar:
      'استأجر في دفء الخليج على مدار العام بين أفق دبي وجزر أبوظبي والكثبان الرملية البِكر في الخليج الأسفل. طواقم ناطقة بالعربية وتموين حلال وخصوصية مطلقة كمعيار أساسي.',
    seasonStart: 'October',
    seasonEnd: 'April',
    bestMonths: ['November', 'December', 'January', 'February', 'March'],
    heroImage: U(PHOTO.gulf, 1920),
    galleryImages: [U(PHOTO.gulf), U(PHOTO.superyacht), U(PHOTO.deck)],
    averagePricePerWeek: 42000,
    currency: 'USD',
    highlights: [
      { title: 'Dubai Marina & The Palm', description: 'Cruise the world’s most futuristic skyline at dusk.', icon: 'ship' },
      { title: 'The World Islands', description: 'Anchor off private man-made archipelagos.', icon: 'anchor' },
      { title: 'Sir Bani Yas', description: 'A wildlife-rich nature reserve island off Abu Dhabi.', icon: 'compass' },
    ],
    weatherInfo: { winterTemp: '24–28°C', waterTemp: '22–26°C', windConditions: 'Calm winter seas, light shamal' },
    marinas: [
      { name: 'Dubai Harbour Marina', location: 'Dubai', facilities: ['Superyacht berths', 'Concierge', 'Fuel'] },
      { name: 'Yas Marina', location: 'Abu Dhabi', facilities: ['Charter base', 'Fuel', 'Provisioning'] },
    ],
    featured: true,
    priceFrom: '$12,000',
    season_en: 'October – April',
    season_ar: 'أكتوبر – أبريل',
  },
  {
    id: 'fb-dest-red-sea',
    name: 'Red Sea',
    name_ar: 'البحر الأحمر',
    slug: 'red-sea',
    region: 'RED_SEA',
    country: 'Egypt',
    description_en:
      'The Red Sea offers the Mediterranean’s off-season answer: warm winter water, world-class coral, and dolphin-rich reefs between Hurghada and the Brothers Islands. A diver’s and family’s paradise.',
    description_ar:
      'يقدّم البحر الأحمر البديل المثالي خارج موسم المتوسط: مياه دافئة شتاءً وشعاب مرجانية عالمية وشعاب غنية بالدلافين بين الغردقة وجزر الأخوين. جنة للغواصين والعائلات.',
    seasonStart: 'October',
    seasonEnd: 'May',
    bestMonths: ['November', 'December', 'January', 'February', 'March', 'April'],
    heroImage: U(PHOTO.redsea, 1920),
    galleryImages: [U(PHOTO.redsea), U(PHOTO.motorYacht), U(PHOTO.sunset)],
    averagePricePerWeek: 19000,
    currency: 'USD',
    highlights: [
      { title: 'Ras Mohammed Reefs', description: 'Some of the planet’s most vivid coral walls.', icon: 'anchor' },
      { title: 'Dolphin House (Sha’ab Samadai)', description: 'Swim alongside resident spinner dolphins.', icon: 'compass' },
      { title: 'Giftun Islands', description: 'Powder-white sandbars off Hurghada.', icon: 'sunset' },
    ],
    weatherInfo: { winterTemp: '24–27°C', waterTemp: '22–25°C', windConditions: 'Steady N breeze, calm bays' },
    marinas: [
      { name: 'Hurghada Marina', location: 'Hurghada', facilities: ['Charter base', 'Fuel', 'Provisioning'] },
      { name: 'Port Ghalib', location: 'Marsa Alam', facilities: ['Fuel', 'Concierge', 'Dive support'] },
    ],
    featured: false,
    priceFrom: '$7,500',
    season_en: 'October – May',
    season_ar: 'أكتوبر – مايو',
  },
];

// ─── YACHTS (14) ─────────────────────────────────────────────────────────
const FEAT_LUXE = ['Air conditioning', 'Wi-Fi', 'Jacuzzi', 'Alfresco dining', 'Sun deck', 'Stabilisers', 'Tender & toys'];
const FEAT_MID = ['Air conditioning', 'Wi-Fi', 'Bimini shade', 'Alfresco dining', 'Snorkel gear', 'Paddleboards'];
const WS_FULL = ['Seabob', 'Jet ski', 'Water skis', 'Paddleboards', 'Snorkelling', 'Kayaks', 'Towable toys'];
const WS_MID = ['Paddleboards', 'Snorkelling', 'Kayaks', 'Towable toys'];

export const FALLBACK_YACHTS: FallbackYacht[] = [
  {
    id: 'fb-yacht-serenity', name: 'Serenity', slug: 'serenity', type: 'SUPERYACHT',
    length: 42, beam: 8.2, draft: 2.4, yearBuilt: 2021, builder: 'Benetti', model: 'Oasis 40M',
    cabins: 5, berths: 10, bathrooms: 5, crewSize: 8, pricePerWeekLow: 185000, pricePerWeekHigh: 245000, currency: 'EUR',
    description_en: 'A 42-metre Benetti superyacht defined by her infinity-edge pool and beach club. Serenity blends contemporary Italian design with white-glove service for the Riviera’s most discerning charter guests.',
    description_ar: 'يخت فاخر من بينيتي بطول 42 متراً يتميّز بمسبحه اللامتناهي ونادي الشاطئ. يجمع "سيرينيتي" بين التصميم الإيطالي المعاصر والخدمة الاستثنائية لأكثر ضيوف الريفيرا تميّزاً.',
    features: [...FEAT_LUXE, 'Infinity pool', 'Beach club', 'Gym', 'Cinema'], images: [U(PHOTO.superyacht), U(PHOTO.interior), U(PHOTO.deck), U(PHOTO.aerial)],
    waterSports: WS_FULL, halalCateringAvailable: true, familyFriendly: true, crewIncluded: true,
    homePort: 'Antibes', cruisingArea: 'French Riviera & Ligurian Sea', rating: 4.9, reviewCount: 37, featured: true, destinationSlug: 'french-riviera',
  },
  {
    id: 'fb-yacht-aegean-pearl', name: 'Aegean Pearl', slug: 'aegean-pearl', type: 'SAILBOAT',
    length: 24, beam: 5.9, draft: 3.1, yearBuilt: 2019, builder: 'Perini Navi', model: 'Cruiser 24',
    cabins: 4, berths: 8, bathrooms: 4, crewSize: 4, pricePerWeekLow: 42000, pricePerWeekHigh: 58000, currency: 'EUR',
    description_en: 'A graceful performance sailing yacht built for the Cyclades. Aegean Pearl reaches anchorages the crowds never see, with a crew of four and an open galley that turns the day’s catch into a feast.',
    description_ar: 'يخت شراعي أنيق عالي الأداء صُمّم لجزر سيكلاديز. تصل "لؤلؤة إيجه" إلى مراسٍ لا تراها الحشود، بطاقم من أربعة أفراد ومطبخ مفتوح يحوّل صيد اليوم إلى وليمة.',
    features: FEAT_MID, images: [U(PHOTO.sailing), U(PHOTO.greek), U(PHOTO.deck)],
    waterSports: WS_MID, halalCateringAvailable: true, familyFriendly: true, crewIncluded: true,
    homePort: 'Athens (Alimos)', cruisingArea: 'Cyclades & Saronic Gulf', rating: 4.8, reviewCount: 24, featured: true, destinationSlug: 'greek-islands',
  },
  {
    id: 'fb-yacht-blue-horizon', name: 'Blue Horizon', slug: 'blue-horizon', type: 'CATAMARAN',
    length: 23, beam: 11, draft: 1.4, yearBuilt: 2022, builder: 'Lagoon', model: 'Seventy 7',
    cabins: 5, berths: 10, bathrooms: 5, crewSize: 4, pricePerWeekLow: 46000, pricePerWeekHigh: 62000, currency: 'EUR',
    description_en: 'A flagship Lagoon catamaran — wide, stable, and shallow-draft, so she anchors close to the beach in bays a monohull can’t reach. The multi-generational family favourite for the Aegean.',
    description_ar: 'كاتاماران رائد من لاغون — واسع وثابت وغاطس ضحل، لذا يرسو قرب الشاطئ في خلجان يصعب على القوارب أحادية البدن الوصول إليها. الخيار المفضّل للعائلات متعددة الأجيال في بحر إيجه.',
    features: [...FEAT_MID, 'Flybridge', 'Trampoline nets', 'Hydraulic swim platform'], images: [U(PHOTO.catamaran), U(PHOTO.greek), U(PHOTO.sunset)],
    waterSports: WS_FULL, halalCateringAvailable: true, familyFriendly: true, crewIncluded: true,
    homePort: 'Mykonos', cruisingArea: 'Cyclades', rating: 4.9, reviewCount: 31, featured: true, destinationSlug: 'greek-islands',
  },
  {
    id: 'fb-yacht-adriatic-star', name: 'Adriatic Star', slug: 'adriatic-star', type: 'MOTOR_YACHT',
    length: 30, beam: 6.8, draft: 1.8, yearBuilt: 2020, builder: 'Sunseeker', model: '95 Yacht',
    cabins: 5, berths: 9, bathrooms: 5, crewSize: 5, pricePerWeekLow: 68000, pricePerWeekHigh: 89000, currency: 'EUR',
    description_en: 'A 30-metre Sunseeker with the pace to island-hop Dalmatia in a morning and the space to lounge all afternoon. Perfect for guests who want Dubrovnik dinners and Hvar swim-stops in the same day.',
    description_ar: 'يخت صنسيكر بطول 30 متراً يتمتّع بالسرعة للتنقّل بين جزر دالماسيا في صباح واحد والمساحة للاسترخاء طوال الظهيرة. مثالي لمن يريد عشاءً في دوبروفنيك وسباحة في هفار في اليوم ذاته.',
    features: [...FEAT_LUXE, 'Flybridge', 'Swim platform'], images: [U(PHOTO.motorYacht), U(PHOTO.croatia), U(PHOTO.interior)],
    waterSports: WS_FULL, halalCateringAvailable: true, familyFriendly: true, crewIncluded: true,
    homePort: 'Split', cruisingArea: 'Dalmatian Coast', rating: 4.8, reviewCount: 19, featured: false, destinationSlug: 'croatian-coast',
  },
  {
    id: 'fb-yacht-dalmatian-breeze', name: 'Dalmatian Breeze', slug: 'dalmatian-breeze', type: 'SAILBOAT',
    length: 21, beam: 5.4, draft: 2.9, yearBuilt: 2018, builder: 'Jeanneau', model: 'Yacht 64',
    cabins: 4, berths: 8, bathrooms: 3, crewSize: 3, pricePerWeekLow: 28000, pricePerWeekHigh: 38000, currency: 'EUR',
    description_en: 'A relaxed, characterful sailing yacht for exploring the Kornati archipelago under canvas. Quiet, agile, and priced for those who value the passage as much as the destination.',
    description_ar: 'يخت شراعي هادئ مليء بالطابع لاستكشاف أرخبيل كورناتي تحت الأشرعة. صامت ورشيق وبسعر يناسب من يقدّرون الرحلة بقدر ما يقدّرون الوجهة.',
    features: FEAT_MID, images: [U(PHOTO.sailing), U(PHOTO.croatia), U(PHOTO.deck)],
    waterSports: WS_MID, halalCateringAvailable: false, familyFriendly: true, crewIncluded: true,
    homePort: 'Zadar', cruisingArea: 'Kornati & North Dalmatia', rating: 4.7, reviewCount: 15, featured: false, destinationSlug: 'croatian-coast',
  },
  {
    id: 'fb-yacht-anatolia', name: 'Anatolia', slug: 'anatolia', type: 'GULET',
    length: 32, beam: 7.5, draft: 2.6, yearBuilt: 2017, builder: 'Bodrum Shipyard', model: 'Custom Gulet',
    cabins: 6, berths: 12, bathrooms: 6, crewSize: 5, pricePerWeekLow: 24000, pricePerWeekHigh: 34000, currency: 'EUR',
    description_en: 'A hand-built 32-metre gulet with six ensuite cabins and acres of shaded deck. Anatolia is the archetypal Blue Voyage yacht — slow days, long lunches, and a chef who makes the mezze from scratch.',
    description_ar: 'غوليت مصنوع يدوياً بطول 32 متراً بست مقصورات مستقلة ومساحات واسعة من السطح المظلّل. "أناتوليا" هو اليخت النموذجي للرحلة الزرقاء — أيام هادئة وغداء طويل وطاهٍ يعدّ المزّة من الصفر.',
    features: [...FEAT_MID, 'Shaded aft lounge', 'Deck cushions', 'BBQ'], images: [U(PHOTO.turkey), U(PHOTO.coast), U(PHOTO.dining)],
    waterSports: WS_MID, halalCateringAvailable: true, familyFriendly: true, crewIncluded: true,
    homePort: 'Göcek', cruisingArea: 'Turkish Riviera', rating: 4.9, reviewCount: 42, featured: true, destinationSlug: 'turkish-riviera',
  },
  {
    id: 'fb-yacht-bodrum-sun', name: 'Bodrum Sun', slug: 'bodrum-sun', type: 'GULET',
    length: 28, beam: 7, draft: 2.4, yearBuilt: 2015, builder: 'Bodrum Shipyard', model: 'Traditional Gulet',
    cabins: 5, berths: 10, bathrooms: 5, crewSize: 4, pricePerWeekLow: 18000, pricePerWeekHigh: 26000, currency: 'EUR',
    description_en: 'A warm, traditional gulet for families and friends who want the Turquoise Coast at an easy pace. Ensuite cabins, Arabic-speaking crew on request, and a galley that leans into local flavours.',
    description_ar: 'غوليت تقليدي دافئ للعائلات والأصدقاء الذين يريدون الساحل الفيروزي بإيقاع مريح. مقصورات مستقلة وطاقم ناطق بالعربية عند الطلب ومطبخ يميل إلى النكهات المحلية.',
    features: FEAT_MID, images: [U(PHOTO.turkey), U(PHOTO.deck), U(PHOTO.sunset)],
    waterSports: WS_MID, halalCateringAvailable: true, familyFriendly: true, crewIncluded: true,
    homePort: 'Bodrum', cruisingArea: 'Gulf of Gökova', rating: 4.7, reviewCount: 28, featured: false, destinationSlug: 'turkish-riviera',
  },
  {
    id: 'fb-yacht-amalfi-muse', name: 'Amalfi Muse', slug: 'amalfi-muse', type: 'MOTOR_YACHT',
    length: 27, beam: 6.4, draft: 1.7, yearBuilt: 2021, builder: 'Ferretti', model: '850',
    cabins: 4, berths: 8, bathrooms: 4, crewSize: 5, pricePerWeekLow: 74000, pricePerWeekHigh: 98000, currency: 'EUR',
    description_en: 'A sleek Ferretti built for the Amalfi Coast’s short, glamorous hops — Capri for lunch, Positano for sunset. Understated Italian luxury with a tender fast enough for a Blue Grotto dash.',
    description_ar: 'يخت فيريتي أنيق صُمّم للتنقّلات القصيرة الفاخرة على ساحل أمالفي — كابري للغداء وبوزيتانو للغروب. فخامة إيطالية هادئة بقارب مساعد سريع بما يكفي للوصول إلى المغارة الزرقاء.',
    features: [...FEAT_LUXE, 'Hardtop', 'Swim platform'], images: [U(PHOTO.motorYacht), U(PHOTO.amalfi), U(PHOTO.interior)],
    waterSports: WS_FULL, halalCateringAvailable: true, familyFriendly: false, crewIncluded: true,
    homePort: 'Naples', cruisingArea: 'Amalfi Coast & Capri', rating: 4.9, reviewCount: 22, featured: false, destinationSlug: 'amalfi-coast',
  },
  {
    id: 'fb-yacht-riviera-queen', name: 'Riviera Queen', slug: 'riviera-queen', type: 'SUPERYACHT',
    length: 50, beam: 9, draft: 2.7, yearBuilt: 2022, builder: 'Feadship', model: 'Custom 50M',
    cabins: 6, berths: 12, bathrooms: 6, crewSize: 11, pricePerWeekLow: 320000, pricePerWeekHigh: 420000, currency: 'EUR',
    description_en: 'A 50-metre Feadship at the very top of the fleet — a master deck, a spa, and a beach club that unfolds into the sea. Reserved for guests who want Monaco’s harbour to turn and look.',
    description_ar: 'يخت فيدشيب بطول 50 متراً في قمة الأسطول — سطح رئيسي ومنتجع صحي ونادي شاطئ ينفتح على البحر. مخصّص لضيوف يريدون أن يلتفت ميناء موناكو لرؤيتهم.',
    features: [...FEAT_LUXE, 'Spa', 'Beach club', 'Gym', 'Cinema', 'Helipad'], images: [U(PHOTO.superyacht), U(PHOTO.aerial), U(PHOTO.interior), U(PHOTO.riviera)],
    waterSports: WS_FULL, halalCateringAvailable: true, familyFriendly: true, crewIncluded: true,
    homePort: 'Monaco', cruisingArea: 'French & Italian Riviera', rating: 5.0, reviewCount: 14, featured: true, destinationSlug: 'french-riviera',
  },
  {
    id: 'fb-yacht-cote-dazur', name: "Côte d'Azur", slug: 'cote-dazur', type: 'MOTOR_YACHT',
    length: 33, beam: 7, draft: 1.9, yearBuilt: 2020, builder: 'Princess', model: 'Y95',
    cabins: 5, berths: 10, bathrooms: 5, crewSize: 6, pricePerWeekLow: 88000, pricePerWeekHigh: 118000, currency: 'EUR',
    description_en: 'A Princess Y95 with a vast flybridge for Riviera cocktail evenings and a full beam owner’s suite. Fast, elegant, and equally at home in St-Tropez or the Îles de Lérins.',
    description_ar: 'يخت برينسيس Y95 بسطح علوي واسع لأمسيات كوكتيل الريفيرا وجناح رئيسي بعرض كامل. سريع وأنيق ومناسب تماماً في سان تروبيه أو جزر ليرين.',
    features: [...FEAT_LUXE, 'Flybridge', 'Beach club'], images: [U(PHOTO.motorYacht), U(PHOTO.riviera), U(PHOTO.deck)],
    waterSports: WS_FULL, halalCateringAvailable: true, familyFriendly: true, crewIncluded: true,
    homePort: 'Cannes', cruisingArea: 'French Riviera', rating: 4.8, reviewCount: 26, featured: false, destinationSlug: 'french-riviera',
  },
  {
    id: 'fb-yacht-balearic-wind', name: 'Balearic Wind', slug: 'balearic-wind', type: 'CATAMARAN',
    length: 24, beam: 12, draft: 1.5, yearBuilt: 2021, builder: 'Sunreef', model: '80',
    cabins: 5, berths: 10, bathrooms: 5, crewSize: 5, pricePerWeekLow: 72000, pricePerWeekHigh: 96000, currency: 'EUR',
    description_en: 'A Sunreef 80 luxury catamaran — an enormous flybridge, a forward lounge, and shallow draft to nose onto Formentera’s sandbanks. The definitive Ibiza charter for those who want space and glamour.',
    description_ar: 'كاتاماران فاخر سنريف 80 — سطح علوي ضخم وصالة أمامية وغاطس ضحل للاقتراب من كثبان فورمينتيرا. الخيار المثالي لتأجير إيبيزا لمن يريد المساحة والبريق.',
    features: [...FEAT_LUXE, 'Flybridge', 'Forward lounge', 'Solar deck'], images: [U(PHOTO.catamaran), U(PHOTO.balearic), U(PHOTO.interior)],
    waterSports: WS_FULL, halalCateringAvailable: true, familyFriendly: true, crewIncluded: true,
    homePort: 'Ibiza', cruisingArea: 'Balearic Islands', rating: 4.9, reviewCount: 20, featured: true, destinationSlug: 'balearic-islands',
  },
  {
    id: 'fb-yacht-ibiza-spirit', name: 'Ibiza Spirit', slug: 'ibiza-spirit', type: 'POWER_CATAMARAN',
    length: 20, beam: 8.6, draft: 1.2, yearBuilt: 2022, builder: 'Fountaine Pajot', model: 'MY6',
    cabins: 4, berths: 8, bathrooms: 4, crewSize: 3, pricePerWeekLow: 38000, pricePerWeekHigh: 52000, currency: 'EUR',
    description_en: 'A nimble power catamaran that gets you from Ibiza’s marina to Formentera’s beach clubs in twenty flat, fuel-efficient minutes. Wide decks, low draft, and an easy day-charter feel.',
    description_ar: 'كاتاماران آلي رشيق ينقلك من مرسى إيبيزا إلى نوادي شاطئ فورمينتيرا في عشرين دقيقة سلسة وموفّرة للوقود. أسطح واسعة وغاطس منخفض وإحساس رحلة نهارية مريحة.',
    features: FEAT_MID, images: [U(PHOTO.catamaran), U(PHOTO.balearic), U(PHOTO.sunset)],
    waterSports: WS_MID, halalCateringAvailable: true, familyFriendly: true, crewIncluded: true,
    homePort: 'Ibiza', cruisingArea: 'Ibiza & Formentera', rating: 4.7, reviewCount: 17, featured: false, destinationSlug: 'balearic-islands',
  },
  {
    id: 'fb-yacht-gulf-majesty', name: 'Gulf Majesty', slug: 'gulf-majesty', type: 'SUPERYACHT',
    length: 45, beam: 8.6, draft: 2.5, yearBuilt: 2023, builder: 'Majesty Yachts', model: '140',
    cabins: 5, berths: 10, bathrooms: 5, crewSize: 9, pricePerWeekLow: 210000, pricePerWeekHigh: 280000, currency: 'USD',
    description_en: 'A brand-new 45-metre Majesty built in the UAE for Gulf waters — a shaded sky lounge, a beach club, and a crew fluent in Arabic. Halal provisioning and total privacy come as standard.',
    description_ar: 'يخت ماجستي جديد بطول 45 متراً صُنع في الإمارات لمياه الخليج — صالة علوية مظلّلة ونادي شاطئ وطاقم يجيد العربية. تموين حلال وخصوصية تامة كمعيار أساسي.',
    features: [...FEAT_LUXE, 'Sky lounge', 'Beach club', 'Majlis seating', 'Gym'], images: [U(PHOTO.superyacht), U(PHOTO.gulf), U(PHOTO.interior), U(PHOTO.deck)],
    waterSports: WS_FULL, halalCateringAvailable: true, familyFriendly: true, crewIncluded: true,
    homePort: 'Dubai Harbour', cruisingArea: 'Arabian Gulf', rating: 5.0, reviewCount: 11, featured: true, destinationSlug: 'arabian-gulf',
  },
  {
    id: 'fb-yacht-red-sea-voyager', name: 'Red Sea Voyager', slug: 'red-sea-voyager', type: 'MOTOR_YACHT',
    length: 29, beam: 6.6, draft: 1.8, yearBuilt: 2019, builder: 'Azimut', model: 'Grande 27',
    cabins: 4, berths: 8, bathrooms: 4, crewSize: 5, pricePerWeekLow: 62000, pricePerWeekHigh: 84000, currency: 'USD',
    description_en: 'An Azimut Grande equipped for the Red Sea’s reefs — a dive platform, a shaded aft deck, and a chef who caters to families. Warm winter water and world-class snorkelling on your doorstep.',
    description_ar: 'يخت أزيموت غراندي مجهّز لشعاب البحر الأحمر — منصة غوص وسطح خلفي مظلّل وطاهٍ يراعي العائلات. مياه دافئة شتاءً وغطس عالمي المستوى على عتبة بابك.',
    features: [...FEAT_LUXE, 'Dive platform', 'Shaded aft deck'], images: [U(PHOTO.motorYacht), U(PHOTO.redsea), U(PHOTO.sunset)],
    waterSports: WS_FULL, halalCateringAvailable: true, familyFriendly: true, crewIncluded: true,
    homePort: 'Hurghada', cruisingArea: 'Red Sea', rating: 4.8, reviewCount: 18, featured: false, destinationSlug: 'red-sea',
  },
];

// ─── ITINERARIES (8) ─────────────────────────────────────────────────────
export const FALLBACK_ITINERARIES: FallbackItinerary[] = [
  {
    id: 'fb-itin-cyclades-7', title_en: 'Cyclades Island Hopping', title_ar: 'التنقّل بين جزر سيكلاديز', slug: 'cyclades-island-hopping',
    duration: 7, difficulty: 'MODERATE',
    description_en: 'A classic seven-day loop through the heart of the Cyclades — cosmopolitan Mykonos, volcanic Santorini, and the quieter charms of Paros and Naxos in between.',
    description_ar: 'حلقة كلاسيكية من سبعة أيام عبر قلب جزر سيكلاديز — ميكونوس العالمية وسانتوريني البركانية وسحر باروس وناكسوس الأهدأ بينهما.',
    stops: [
      { day: 1, port: 'Mykonos', activities: ['Board & provision', 'Sunset at Little Venice'] },
      { day: 2, port: 'Delos & Rhenia', activities: ['Ancient ruins', 'Swim stop'] },
      { day: 3, port: 'Paros', activities: ['Naoussa old port', 'Kolymbithres beach'] },
      { day: 4, port: 'Naxos', activities: ['Portara sunset', 'Village tavernas'] },
      { day: 5, port: 'Ios', activities: ['Manganari Bay', 'Snorkelling'] },
      { day: 6, port: 'Santorini', activities: ['Caldera anchorage', 'Oia sunset'] },
      { day: 7, port: 'Santorini', activities: ['Disembark'] },
    ],
    recommendedYachtTypes: ['SAILBOAT', 'CATAMARAN'], estimatedCost: 52000, currency: 'EUR', bestSeason: 'June – September',
    heroImage: U(PHOTO.greek, 1600), destinationSlug: 'greek-islands',
  },
  {
    id: 'fb-itin-saronic-5', title_en: 'Saronic Gulf Weekend Escape', title_ar: 'عطلة الخليج الساروني', slug: 'saronic-gulf-escape',
    duration: 5, difficulty: 'EASY',
    description_en: 'A relaxed short charter from Athens through the Saronic islands — elegant Hydra, pine-clad Poros, and Aegina’s pistachio groves. Ideal for a first-time crewed sail.',
    description_ar: 'رحلة قصيرة مريحة من أثينا عبر جزر الخليج الساروني — هيدرا الأنيقة وبوروس المكسوّة بالصنوبر وبساتين الفستق في إيجينا. مثالية لأول رحلة إبحار بطاقم.',
    stops: [
      { day: 1, port: 'Athens (Alimos)', activities: ['Board & provision'] },
      { day: 2, port: 'Aegina', activities: ['Temple of Aphaia', 'Pistachio market'] },
      { day: 3, port: 'Poros', activities: ['Love Bay swim', 'Waterfront dinner'] },
      { day: 4, port: 'Hydra', activities: ['Car-free harbour town', 'Donkey trails'] },
      { day: 5, port: 'Athens (Alimos)', activities: ['Disembark'] },
    ],
    recommendedYachtTypes: ['SAILBOAT', 'CATAMARAN', 'MOTOR_YACHT'], estimatedCost: 32000, currency: 'EUR', bestSeason: 'May – October',
    heroImage: U(PHOTO.sailing, 1600), destinationSlug: 'greek-islands',
  },
  {
    id: 'fb-itin-dalmatia-7', title_en: 'Dalmatian Coast Discovery', title_ar: 'اكتشاف ساحل دالماسيا', slug: 'dalmatian-coast-discovery',
    duration: 7, difficulty: 'MODERATE',
    description_en: 'Split to Dubrovnik through the best of Dalmatia — the lavender island of Hvar, the wine cellars of Korčula, and the fortress harbours of the Adriatic.',
    description_ar: 'من سبليت إلى دوبروفنيك عبر أجمل ما في دالماسيا — جزيرة الخزامى هفار وأقبية النبيذ في كورتشولا وموانئ القلاع في الأدرياتيكي.',
    stops: [
      { day: 1, port: 'Split', activities: ['Board & provision', 'Diocletian’s Palace'] },
      { day: 2, port: 'Brač (Bol)', activities: ['Zlatni Rat beach', 'Windsurfing'] },
      { day: 3, port: 'Hvar', activities: ['Pakleni Islands', 'Old town evening'] },
      { day: 4, port: 'Vis', activities: ['Blue Cave (Biševo)', 'Stiniva cove'] },
      { day: 5, port: 'Korčula', activities: ['Wine tasting', 'Marco Polo’s town'] },
      { day: 6, port: 'Mljet', activities: ['National park lakes'] },
      { day: 7, port: 'Dubrovnik', activities: ['Disembark', 'City walls'] },
    ],
    recommendedYachtTypes: ['MOTOR_YACHT', 'SAILBOAT', 'CATAMARAN'], estimatedCost: 74000, currency: 'EUR', bestSeason: 'June – September',
    heroImage: U(PHOTO.croatia, 1600), destinationSlug: 'croatian-coast',
  },
  {
    id: 'fb-itin-blue-voyage-8', title_en: 'Turkish Blue Voyage', title_ar: 'الرحلة الزرقاء التركية', slug: 'turkish-blue-voyage',
    duration: 8, difficulty: 'EASY',
    description_en: 'The original Blue Voyage — eight unhurried days aboard a gulet between Göcek and Fethiye, dropping anchor in a new pine-fringed bay each afternoon.',
    description_ar: 'الرحلة الزرقاء الأصلية — ثمانية أيام هادئة على متن غوليت بين غوجك وفتحية، مع إلقاء المرساة في خليج جديد محاط بالصنوبر كل بعد ظهر.',
    stops: [
      { day: 1, port: 'Göcek', activities: ['Board & provision'] },
      { day: 2, port: 'Twelve Islands', activities: ['Cove hopping', 'Swimming'] },
      { day: 3, port: 'Wall Bay', activities: ['Lycian ruins', 'Snorkelling'] },
      { day: 4, port: 'Butterfly Valley', activities: ['Canyon beach', 'Waterfall walk'] },
      { day: 5, port: 'Ölüdeniz', activities: ['Blue Lagoon', 'Paragliders overhead'] },
      { day: 6, port: 'Kas', activities: ['Kekova sunken city', 'Harbour dinner'] },
      { day: 7, port: 'Fethiye', activities: ['Fish market', 'Local mezze'] },
      { day: 8, port: 'Göcek', activities: ['Disembark'] },
    ],
    recommendedYachtTypes: ['GULET', 'SAILBOAT'], estimatedCost: 30000, currency: 'EUR', bestSeason: 'May – October',
    heroImage: U(PHOTO.turkey, 1600), destinationSlug: 'turkish-riviera',
  },
  {
    id: 'fb-itin-amalfi-5', title_en: 'Amalfi & Capri Escape', title_ar: 'رحلة أمالفي وكابري', slug: 'amalfi-capri-escape',
    duration: 5, difficulty: 'EASY',
    description_en: 'Five glamorous days along the Amalfi Coast — Capri’s Blue Grotto, Positano’s cliffside dinners, and the Li Galli islands, all at superyacht pace.',
    description_ar: 'خمسة أيام ساحرة على ساحل أمالفي — المغارة الزرقاء في كابري وعشاء المنحدرات في بوزيتانو وجزر لي غالي، جميعها بإيقاع اليخوت الفاخرة.',
    stops: [
      { day: 1, port: 'Naples', activities: ['Board & provision'] },
      { day: 2, port: 'Capri', activities: ['Blue Grotto', 'Faraglioni swim'] },
      { day: 3, port: 'Positano', activities: ['Beach club lunch', 'Sunset aperitivo'] },
      { day: 4, port: 'Amalfi & Li Galli', activities: ['Cathedral town', 'Sirens’ islands'] },
      { day: 5, port: 'Naples', activities: ['Disembark'] },
    ],
    recommendedYachtTypes: ['MOTOR_YACHT', 'SUPERYACHT'], estimatedCost: 92000, currency: 'EUR', bestSeason: 'May – September',
    heroImage: U(PHOTO.amalfi, 1600), destinationSlug: 'amalfi-coast',
  },
  {
    id: 'fb-itin-riviera-6', title_en: 'French Riviera Glamour', title_ar: 'بريق الريفيرا الفرنسية', slug: 'french-riviera-glamour',
    duration: 6, difficulty: 'EASY',
    description_en: 'Six days of Côte d’Azur icons — Monaco’s harbour, St-Tropez’s beach clubs, the Îles de Lérins, and Cannes at golden hour.',
    description_ar: 'ستة أيام من أيقونات كوت دازور — ميناء موناكو ونوادي شاطئ سان تروبيه وجزر ليرين وكان في ساعة الغروب.',
    stops: [
      { day: 1, port: 'Nice', activities: ['Board & provision'] },
      { day: 2, port: 'Monaco', activities: ['Port Hercule', 'Casino Square'] },
      { day: 3, port: 'Îles de Lérins', activities: ['Anchor & swim', 'Monastery walk'] },
      { day: 4, port: 'Cannes', activities: ['La Croisette', 'Sunset drinks'] },
      { day: 5, port: 'St-Tropez', activities: ['Pampelonne beach club', 'Old port'] },
      { day: 6, port: 'Nice', activities: ['Disembark'] },
    ],
    recommendedYachtTypes: ['MOTOR_YACHT', 'SUPERYACHT'], estimatedCost: 130000, currency: 'EUR', bestSeason: 'June – September',
    heroImage: U(PHOTO.riviera, 1600), destinationSlug: 'french-riviera',
  },
  {
    id: 'fb-itin-balearic-7', title_en: 'Balearic Trio', title_ar: 'ثلاثية البليار', slug: 'balearic-trio',
    duration: 7, difficulty: 'MODERATE',
    description_en: 'A week across Ibiza, Formentera, and Mallorca — turquoise sandbanks, hidden calas, and as much or as little nightlife as you like.',
    description_ar: 'أسبوع عبر إيبيزا وفورمينتيرا ومايوركا — كثبان رملية فيروزية وخلجان مخفية وحياة ليلية بالقدر الذي تريده.',
    stops: [
      { day: 1, port: 'Ibiza', activities: ['Board & provision', 'Marina Ibiza'] },
      { day: 2, port: 'Formentera', activities: ['Illetes sandbank', 'Beach lunch'] },
      { day: 3, port: 'Es Vedrà', activities: ['Sunset sail', 'Snorkelling'] },
      { day: 4, port: 'Espalmador', activities: ['Natural lagoon', 'Swim stop'] },
      { day: 5, port: 'Mallorca (Andratx)', activities: ['Cala coves', 'Coastal towns'] },
      { day: 6, port: 'Palma', activities: ['Cathedral', 'Old town dinner'] },
      { day: 7, port: 'Palma', activities: ['Disembark'] },
    ],
    recommendedYachtTypes: ['CATAMARAN', 'MOTOR_YACHT'], estimatedCost: 78000, currency: 'EUR', bestSeason: 'May – October',
    heroImage: U(PHOTO.balearic, 1600), destinationSlug: 'balearic-islands',
  },
  {
    id: 'fb-itin-gulf-4', title_en: 'Arabian Gulf Luxury Weekend', title_ar: 'عطلة الخليج العربي الفاخرة', slug: 'arabian-gulf-luxury-weekend',
    duration: 4, difficulty: 'EASY',
    description_en: 'A four-day winter escape across the lower Gulf — Dubai’s skyline, the World Islands, and the untouched sandbars beyond Abu Dhabi, with Arabic-speaking crew and halal dining throughout.',
    description_ar: 'رحلة شتوية من أربعة أيام عبر الخليج الأسفل — أفق دبي وجزر العالم والكثبان البِكر وراء أبوظبي، مع طاقم ناطق بالعربية وطعام حلال طوال الرحلة.',
    stops: [
      { day: 1, port: 'Dubai Harbour', activities: ['Board & provision', 'Skyline cruise'] },
      { day: 2, port: 'The World Islands', activities: ['Private anchorage', 'Water toys'] },
      { day: 3, port: 'Sir Bani Yas', activities: ['Wildlife reserve', 'Beach BBQ'] },
      { day: 4, port: 'Abu Dhabi (Yas)', activities: ['Disembark'] },
    ],
    recommendedYachtTypes: ['SUPERYACHT', 'MOTOR_YACHT'], estimatedCost: 96000, currency: 'USD', bestSeason: 'November – April',
    heroImage: U(PHOTO.gulf, 1600), destinationSlug: 'arabian-gulf',
  },
  {
    id: 'fb-itin-redsea-6', title_en: 'Red Sea Reef Voyage', title_ar: 'رحلة شعاب البحر الأحمر', slug: 'red-sea-reef-voyage',
    duration: 6, difficulty: 'EASY',
    description_en: 'Six warm winter days between Hurghada’s islands and the legendary reefs of the Red Sea — snorkelling with dolphins, powder-white sandbars, and a chef who caters to families throughout.',
    description_ar: 'ستة أيام شتوية دافئة بين جزر الغردقة وشعاب البحر الأحمر الأسطورية — غطس مع الدلافين وكثبان رملية بيضاء وطاهٍ يراعي العائلات طوال الرحلة.',
    stops: [
      { day: 1, port: 'Hurghada', activities: ['Board & provision'] },
      { day: 2, port: 'Giftun Islands', activities: ['Sandbank swim', 'Snorkelling'] },
      { day: 3, port: 'Abu Nuhas Reefs', activities: ['Coral gardens', 'Wreck snorkel'] },
      { day: 4, port: 'Dolphin House', activities: ['Swim with spinner dolphins'] },
      { day: 5, port: 'Ras Mohammed', activities: ['Coral walls', 'Beach BBQ'] },
      { day: 6, port: 'Hurghada', activities: ['Disembark'] },
    ],
    recommendedYachtTypes: ['MOTOR_YACHT', 'SUPERYACHT'], estimatedCost: 42000, currency: 'USD', bestSeason: 'October – May',
    heroImage: U(PHOTO.redsea, 1600), destinationSlug: 'red-sea',
  },
];

// ═══════════════════════════════════════════════════════════════════════
//  Consumer-shaped accessors
// ═══════════════════════════════════════════════════════════════════════

const destBySlug = (slug: string) => FALLBACK_DESTINATIONS.find((d) => d.slug === slug);

// ── /yachts search catalogue: YachtCard[] ──────────────────────────────
export interface FallbackYachtCard {
  id: string;
  name: string;
  slug: string;
  type: string;
  cabins: number;
  berths: number;
  length: number | null;
  pricePerWeekLow: number | null;
  currency: string;
  rating: number | null;
  reviewCount: number;
  halalCateringAvailable: boolean;
  familyFriendly: boolean;
  crewIncluded: boolean;
  images: string[] | null;
  featured: boolean;
  destinationName: string | null;
}

function toCard(y: FallbackYacht): FallbackYachtCard {
  return {
    id: y.id, name: y.name, slug: y.slug, type: y.type,
    cabins: y.cabins, berths: y.berths, length: y.length,
    pricePerWeekLow: y.pricePerWeekLow, currency: y.currency,
    rating: y.rating, reviewCount: y.reviewCount,
    halalCateringAvailable: y.halalCateringAvailable, familyFriendly: y.familyFriendly, crewIncluded: y.crewIncluded,
    images: y.images, featured: y.featured,
    destinationName: destBySlug(y.destinationSlug)?.name ?? null,
  };
}

export interface FallbackYachtFilters {
  destination?: string | null;
  type?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  guests?: number | null;
  halal?: boolean;
  family?: boolean;
  crew?: boolean;
  featured?: boolean;
  q?: string | null;
  sort?: string | null;
}

function applyYachtFilters(list: FallbackYacht[], f: FallbackYachtFilters): FallbackYacht[] {
  let out = list.slice();
  if (f.destination) out = out.filter((y) => y.destinationSlug === f.destination);
  if (f.type) out = out.filter((y) => y.type === f.type);
  if (f.minPrice != null) out = out.filter((y) => y.pricePerWeekLow >= f.minPrice!);
  if (f.maxPrice != null) out = out.filter((y) => y.pricePerWeekHigh <= f.maxPrice!);
  if (f.guests != null) out = out.filter((y) => y.berths >= f.guests!);
  if (f.halal) out = out.filter((y) => y.halalCateringAvailable);
  if (f.family) out = out.filter((y) => y.familyFriendly);
  if (f.crew) out = out.filter((y) => y.crewIncluded);
  if (f.featured) out = out.filter((y) => y.featured);
  if (f.q && f.q.trim()) {
    const q = f.q.trim().toLowerCase();
    out = out.filter((y) =>
      [y.name, y.description_en, y.homePort, y.cruisingArea, y.builder, y.model].some((s) => s.toLowerCase().includes(q))
    );
  }
  switch (f.sort) {
    case 'price_asc': out.sort((a, b) => a.pricePerWeekLow - b.pricePerWeekLow); break;
    case 'price_desc': out.sort((a, b) => b.pricePerWeekHigh - a.pricePerWeekHigh); break;
    case 'rating': out.sort((a, b) => b.rating - a.rating); break;
    case 'popular': out.sort((a, b) => b.reviewCount - a.reviewCount); break;
    default: out.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0)); break;
  }
  return out;
}

/** Server-component initial data for /yachts (first page). */
export function getFallbackYachtCatalogue(filters: FallbackYachtFilters = {}) {
  const filtered = applyYachtFilters(FALLBACK_YACHTS, filters);
  return {
    yachts: filtered.slice(0, 24).map(toCard),
    total: filtered.length,
    destinations: FALLBACK_DESTINATIONS.map((d) => ({ id: d.id, name: d.name, slug: d.slug })),
  };
}

/** /api/yachts response (filter + paginate). Matches the API's JSON shape. */
export function getFallbackYachtApiResponse(filters: FallbackYachtFilters, page: number, limit: number) {
  const filtered = applyYachtFilters(FALLBACK_YACHTS, filters);
  const offset = (page - 1) * limit;
  const slice = filtered.slice(offset, offset + limit);
  const prices = FALLBACK_YACHTS.map((y) => y.pricePerWeekLow);
  return {
    yachts: slice.map((y) => ({
      id: y.id, name: y.name, slug: y.slug, type: y.type,
      length: y.length, yearBuilt: y.yearBuilt, builder: y.builder, model: y.model,
      cabins: y.cabins, berths: y.berths, bathrooms: y.bathrooms, crewSize: y.crewSize,
      pricePerWeekLow: y.pricePerWeekLow, pricePerWeekHigh: y.pricePerWeekHigh, currency: y.currency,
      description_en: y.description_en, description_ar: y.description_ar,
      images: y.images, halalCateringAvailable: y.halalCateringAvailable,
      familyFriendly: y.familyFriendly, crewIncluded: y.crewIncluded,
      homePort: y.homePort, cruisingArea: y.cruisingArea,
      rating: y.rating, reviewCount: y.reviewCount, featured: y.featured,
      destination: (() => {
        const d = destBySlug(y.destinationSlug);
        return d ? { id: d.id, name: d.name, slug: d.slug, region: d.region } : null;
      })(),
      createdAt: null,
    })),
    total: filtered.length,
    page,
    pages: Math.max(1, Math.ceil(filtered.length / limit)),
    filters: {
      destinations: FALLBACK_DESTINATIONS.map((d) => ({ id: d.id, name: d.name, slug: d.slug, region: d.region })),
      types: Array.from(new Set(FALLBACK_YACHTS.map((y) => y.type))),
      priceRange: { min: Math.min(...prices), max: Math.max(...FALLBACK_YACHTS.map((y) => y.pricePerWeekHigh)) },
    },
  };
}

// ── /yachts/[slug] detail: YachtData shape ─────────────────────────────
export function getFallbackYachtDetail(slug: string) {
  const y = FALLBACK_YACHTS.find((v) => v.slug === slug);
  if (!y) return null;
  const d = destBySlug(y.destinationSlug);
  return {
    id: y.id, name: y.name, slug: y.slug, type: y.type,
    length: y.length, beam: y.beam, draft: y.draft, yearBuilt: y.yearBuilt,
    builder: y.builder, model: y.model,
    cabins: y.cabins, berths: y.berths, bathrooms: y.bathrooms, crewSize: y.crewSize,
    pricePerWeekLow: y.pricePerWeekLow, pricePerWeekHigh: y.pricePerWeekHigh, currency: y.currency,
    description_en: y.description_en, description_ar: y.description_ar,
    features: y.features, images: y.images, waterSports: y.waterSports,
    halalCateringAvailable: y.halalCateringAvailable, familyFriendly: y.familyFriendly, crewIncluded: y.crewIncluded,
    homePort: y.homePort, cruisingArea: y.cruisingArea,
    rating: y.rating, reviewCount: y.reviewCount, featured: y.featured,
    destination: d ? { name: d.name, slug: d.slug, region: d.region } : null,
    reviews: [] as {
      id: string;
      authorName: string;
      rating: number;
      title: string | null;
      review_en: string | null;
      review_ar: string | null;
      charterDate: string | null;
      createdAt: string;
    }[],
  };
}

/** Related yachts for the detail page (same destination or type). */
export function getFallbackRelatedYachts(slug: string) {
  const y = FALLBACK_YACHTS.find((v) => v.slug === slug);
  if (!y) return [];
  return FALLBACK_YACHTS.filter(
    (v) => v.slug !== slug && (v.destinationSlug === y.destinationSlug || v.type === y.type)
  )
    .slice(0, 4)
    .map((v) => ({
      name: v.name, slug: v.slug, type: v.type, length: v.length, cabins: v.cabins,
      pricePerWeekLow: v.pricePerWeekLow, currency: v.currency, rating: v.rating, reviewCount: v.reviewCount,
      halalCateringAvailable: v.halalCateringAvailable, image: v.images[0] ?? null, cruisingArea: v.cruisingArea,
    }));
}

// ── Homepage featured yacht cards ──────────────────────────────────────
export function getFallbackFeaturedYachts(limit = 3) {
  return FALLBACK_YACHTS.filter((y) => y.featured)
    .slice(0, limit)
    .map((y) => ({
      name: y.name, slug: y.slug, type: y.type, length: y.length, cabins: y.cabins, berths: y.berths,
      pricePerWeekLow: y.pricePerWeekLow, currency: y.currency, rating: y.rating,
      halalCateringAvailable: y.halalCateringAvailable, image: y.images[0],
      destinationName: destBySlug(y.destinationSlug)?.name ?? null,
    }));
}

// ── /itineraries list + [slug] detail ──────────────────────────────────
export function getFallbackItineraryList() {
  return FALLBACK_ITINERARIES.map((it) => {
    const d = destBySlug(it.destinationSlug);
    return {
      id: it.id, title_en: it.title_en, title_ar: it.title_ar, slug: it.slug,
      duration: it.duration, difficulty: it.difficulty,
      description_en: it.description_en, description_ar: it.description_ar,
      estimatedCost: it.estimatedCost, currency: it.currency,
      heroImage: it.heroImage, bestSeason: it.bestSeason,
      stops: it.stops, recommendedYachtTypes: it.recommendedYachtTypes,
      destination: d ? { id: d.id, name: d.name, slug: d.slug, region: d.region } : null,
    };
  });
}

export function getFallbackItineraryDetail(slug: string) {
  const it = FALLBACK_ITINERARIES.find((v) => v.slug === slug);
  if (!it) return null;
  const d = destBySlug(it.destinationSlug);
  return {
    id: it.id, title_en: it.title_en, title_ar: it.title_ar, slug: it.slug,
    duration: it.duration, difficulty: it.difficulty,
    description_en: it.description_en, description_ar: it.description_ar,
    stops: it.stops, recommendedYachtTypes: it.recommendedYachtTypes,
    estimatedCost: it.estimatedCost, currency: it.currency, bestSeason: it.bestSeason, heroImage: it.heroImage,
    destinationId: d?.id ?? '',
    destination: d ? { id: d.id, name: d.name, slug: d.slug, region: d.region } : null,
  };
}

/** Full data for the /itineraries/[slug] page: itinerary + recommended yachts + related. */
export function getFallbackItineraryPageData(slug: string) {
  const it = FALLBACK_ITINERARIES.find((v) => v.slug === slug);
  if (!it) return null;
  const itinerary = getFallbackItineraryDetail(slug)!;
  const recommendedYachts = FALLBACK_YACHTS.filter(
    (y) => y.destinationSlug === it.destinationSlug &&
      (it.recommendedYachtTypes.length === 0 || it.recommendedYachtTypes.includes(y.type))
  )
    .slice(0, 6)
    .map((y) => ({
      id: y.id, name: y.name, slug: y.slug, type: y.type, length: y.length,
      cabins: y.cabins, berths: y.berths, pricePerWeekLow: y.pricePerWeekLow, pricePerWeekHigh: y.pricePerWeekHigh,
      currency: y.currency, images: y.images, rating: y.rating, reviewCount: y.reviewCount,
      halalCateringAvailable: y.halalCateringAvailable, familyFriendly: y.familyFriendly, crewIncluded: y.crewIncluded,
    }));
  const relatedItineraries = FALLBACK_ITINERARIES.filter(
    (v) => v.destinationSlug === it.destinationSlug && v.slug !== slug
  )
    .slice(0, 3)
    .map((v) => ({
      id: v.id, title_en: v.title_en, slug: v.slug, duration: v.duration, difficulty: v.difficulty,
      heroImage: v.heroImage, estimatedCost: v.estimatedCost, currency: v.currency,
    }));
  return { itinerary, recommendedYachts, relatedItineraries };
}

export function getFallbackDestinationOptions() {
  return FALLBACK_DESTINATIONS.map((d) => ({ id: d.id, name: d.name, slug: d.slug }));
}

// ── /destinations/[slug] detail (DestRow + related yachts/itineraries) ──
export function getFallbackDestinationDetail(slug: string) {
  const d = destBySlug(slug);
  if (!d) return null;
  const destination = {
    id: d.id, name: d.name, slug: d.slug, region: d.region, country: d.country,
    description_en: d.description_en, description_ar: d.description_ar,
    seasonStart: d.seasonStart, seasonEnd: d.seasonEnd, bestMonths: d.bestMonths,
    heroImage: d.heroImage, galleryImages: d.galleryImages,
    averagePricePerWeek: d.averagePricePerWeek,
    highlights: d.highlights, weatherInfo: d.weatherInfo, marinas: d.marinas,
    siteId: 'zenitha-yachts-med', status: 'active',
  };
  const relatedYachts = FALLBACK_YACHTS.filter((y) => y.destinationSlug === slug)
    .slice(0, 6)
    .map((y) => ({
      id: y.id, name: y.name, slug: y.slug, type: y.type, length: y.length, cabins: y.cabins, berths: y.berths,
      pricePerWeekLow: y.pricePerWeekLow, pricePerWeekHigh: y.pricePerWeekHigh, currency: y.currency,
      images: y.images, rating: y.rating, reviewCount: y.reviewCount,
      halalCateringAvailable: y.halalCateringAvailable, familyFriendly: y.familyFriendly, crewIncluded: y.crewIncluded,
      homePort: y.homePort, cruisingArea: y.cruisingArea,
    }));
  const relatedItineraries = FALLBACK_ITINERARIES.filter((it) => it.destinationSlug === slug)
    .slice(0, 6)
    .map((it) => ({
      id: it.id, title_en: it.title_en, slug: it.slug, duration: it.duration, difficulty: it.difficulty,
      heroImage: it.heroImage, estimatedCost: it.estimatedCost, currency: it.currency,
    }));
  return { destination, relatedYachts, relatedItineraries };
}

/** Destination cards for the /destinations hub (matches STATIC_DESTINATIONS shape needs). */
export function getFallbackDestinationCards() {
  return FALLBACK_DESTINATIONS.map((d) => ({
    slug: d.slug, name_en: d.name, name_ar: d.name_ar, region: d.region,
    season_en: d.season_en, season_ar: d.season_ar, priceFrom: d.priceFrom,
    yachtCount: FALLBACK_YACHTS.filter((y) => y.destinationSlug === d.slug).length,
    description_en: d.description_en, description_ar: d.description_ar, featured: d.featured,
    heroImage: d.heroImage,
  }));
}
