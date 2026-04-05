/**
 * Yacht Seed Data API
 * POST: Seed yacht data in batches
 *   action: "destinations" | "yachts" | "itineraries" | "brokers" | "all"
 *
 * Idempotent — checks slug+siteId uniqueness before creating.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-middleware'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const SITE_ID = 'zenitha-yachts-med'

// ═══════════════════════════════════════════════════════════
// DESTINATION SEED DATA — 10 Mediterranean destinations
// ═══════════════════════════════════════════════════════════

const DESTINATIONS = [
  {
    name: 'Greek Islands',
    slug: 'greek-islands',
    region: 'MEDITERRANEAN',
    country: 'Greece',
    description_en: 'Sail the crystalline waters of the Aegean and Ionian seas, hopping between whitewashed villages, ancient ruins, and secluded coves. From the iconic sunsets of Santorini to the vibrant nightlife of Mykonos and the untouched beauty of the Cyclades, the Greek Islands offer the quintessential Mediterranean yacht charter experience.',
    description_ar: 'أبحر في مياه بحر إيجة والبحر الأيوني الصافية، متنقلاً بين القرى البيضاء والآثار القديمة والخلجان المنعزلة. من غروب الشمس الأسطوري في سانتوريني إلى الحياة الليلية النابضة في ميكونوس وجمال جزر كيكلاديس البكر، تقدم الجزر اليونانية تجربة استئجار اليخوت المتوسطية المثالية.',
    seasonStart: 'May',
    seasonEnd: 'October',
    bestMonths: ['June', 'July', 'August', 'September'],
    heroImage: '/images/destinations/greek-islands-hero.jpg',
    galleryImages: ['/images/destinations/greek-islands-1.jpg', '/images/destinations/greek-islands-2.jpg'],
    averagePricePerWeek: 15000,
    highlights: ['Santorini sunsets', 'Mykonos beaches', 'Ancient Delos ruins', 'Secluded Cyclades coves', 'Fresh seafood tavernas'],
    weatherInfo: { summerHighC: 32, summerLowC: 22, waterTempC: 25, windKnots: '10-20', rainyDays: 1 },
    marinas: [{ name: 'Alimos Marina', location: 'Athens', berths: 1000 }, { name: 'Gouvia Marina', location: 'Corfu', berths: 1460 }],
    status: 'active',
  },
  {
    name: 'Croatian Coast',
    slug: 'croatian-coast',
    region: 'MEDITERRANEAN',
    country: 'Croatia',
    description_en: 'Discover the Dalmatian Coast\'s stunning blend of medieval walled cities, pine-scented islands, and turquoise waters. Croatia offers over 1,200 islands to explore, world-class gastronomy, and the UNESCO-listed Old Town of Dubrovnik — all connected by some of the cleanest sailing waters in the Mediterranean.',
    description_ar: 'اكتشف مزيج ساحل دالماتيا المذهل من المدن القديمة المسورة والجزر المعطرة بأشجار الصنوبر والمياه الفيروزية. تقدم كرواتيا أكثر من 1200 جزيرة للاستكشاف، ومأكولات عالمية المستوى، ومدينة دوبروفنيك القديمة المدرجة في قائمة اليونسكو — وكلها متصلة بأنقى مياه الإبحار في البحر المتوسط.',
    seasonStart: 'May',
    seasonEnd: 'October',
    bestMonths: ['June', 'July', 'August', 'September'],
    heroImage: '/images/destinations/croatian-coast-hero.jpg',
    galleryImages: ['/images/destinations/croatia-1.jpg', '/images/destinations/croatia-2.jpg'],
    averagePricePerWeek: 12000,
    highlights: ['Dubrovnik Old Town', 'Hvar island nightlife', 'Kornati National Park', 'Split\'s Diocletian Palace', 'Vis island wine'],
    weatherInfo: { summerHighC: 30, summerLowC: 20, waterTempC: 24, windKnots: '8-15', rainyDays: 2 },
    marinas: [{ name: 'ACI Marina Split', location: 'Split', berths: 355 }, { name: 'ACI Marina Dubrovnik', location: 'Dubrovnik', berths: 425 }],
    status: 'active',
  },
  {
    name: 'French Riviera',
    slug: 'french-riviera',
    region: 'MEDITERRANEAN',
    country: 'France',
    description_en: 'The Côte d\'Azur is the birthplace of luxury yachting. Cruise from glamorous Saint-Tropez to the principality of Monaco, with stops at Cannes, Antibes, and the stunning Îles de Lérins. Michelin-starred dining, legendary beach clubs, and the world\'s most prestigious superyacht marinas await.',
    description_ar: 'الريفييرا الفرنسية هي مهد اليخوت الفاخرة. أبحر من سان تروبيه الساحرة إلى إمارة موناكو، مع توقفات في كان وأنتيب وجزر ليران الخلابة. مطاعم حائزة على نجوم ميشلان، ونوادي شاطئية أسطورية، وأرقى مراسي اليخوت الفائقة في العالم تنتظرك.',
    seasonStart: 'April',
    seasonEnd: 'October',
    bestMonths: ['May', 'June', 'July', 'August', 'September'],
    heroImage: '/images/destinations/french-riviera-hero.jpg',
    galleryImages: ['/images/destinations/riviera-1.jpg', '/images/destinations/riviera-2.jpg'],
    averagePricePerWeek: 25000,
    highlights: ['Saint-Tropez beach clubs', 'Monaco Grand Prix', 'Cannes Film Festival', 'Antibes old town', 'Michelin-starred dining'],
    weatherInfo: { summerHighC: 28, summerLowC: 20, waterTempC: 23, windKnots: '5-12', rainyDays: 2 },
    marinas: [{ name: 'Port Hercules', location: 'Monaco', berths: 700 }, { name: 'Port Vauban', location: 'Antibes', berths: 1642 }],
    status: 'active',
  },
  {
    name: 'Amalfi Coast',
    slug: 'amalfi-coast',
    region: 'MEDITERRANEAN',
    country: 'Italy',
    description_en: 'Navigate the dramatic cliffs and pastel villages of Italy\'s most iconic coastline. The Amalfi Coast, a UNESCO World Heritage Site, offers unparalleled beauty from Positano\'s cascading houses to Capri\'s Blue Grotto. Combine with the Bay of Naples for Pompeii excursions and authentic Neapolitan pizza.',
    description_ar: 'أبحر عبر المنحدرات الدراماتيكية والقرى الباستيلية لأشهر سواحل إيطاليا. ساحل أمالفي، المدرج في قائمة التراث العالمي لليونسكو، يقدم جمالاً لا مثيل له من منازل بوسيتانو المتدرجة إلى الكهف الأزرق في كابري. اجمعها مع خليج نابولي لزيارة بومبي وتذوق البيتزا النابولية الأصلية.',
    seasonStart: 'May',
    seasonEnd: 'October',
    bestMonths: ['June', 'July', 'August', 'September'],
    heroImage: '/images/destinations/amalfi-coast-hero.jpg',
    galleryImages: ['/images/destinations/amalfi-1.jpg', '/images/destinations/amalfi-2.jpg'],
    averagePricePerWeek: 18000,
    highlights: ['Positano village', 'Capri\'s Blue Grotto', 'Ravello gardens', 'Pompeii excursion', 'Limoncello tasting'],
    weatherInfo: { summerHighC: 30, summerLowC: 22, waterTempC: 25, windKnots: '5-10', rainyDays: 1 },
    marinas: [{ name: 'Marina Grande', location: 'Capri', berths: 300 }, { name: 'Marina di Amalfi', location: 'Amalfi', berths: 120 }],
    status: 'active',
  },
  {
    name: 'Balearic Islands',
    slug: 'balearic-islands',
    region: 'MEDITERRANEAN',
    country: 'Spain',
    description_en: 'Mallorca, Ibiza, Menorca, and Formentera form Spain\'s glamorous island archipelago. From Ibiza\'s legendary club scene and bohemian markets to Mallorca\'s dramatic Serra de Tramuntana mountains and Menorca\'s pristine biosphere reserve beaches — the Balearics offer something for every charter style.',
    description_ar: 'تشكل مايوركا وإيبيزا ومينوركا وفورمنتيرا أرخبيل الجزر الإسبانية الساحرة. من مشهد النوادي الأسطوري في إيبيزا والأسواق البوهيمية إلى جبال سيرا دي ترامونتانا الدراماتيكية في مايوركا وشواطئ محمية المحيط الحيوي البكر في مينوركا — تقدم جزر البليار شيئاً لكل نمط من أنماط الاستئجار.',
    seasonStart: 'May',
    seasonEnd: 'October',
    bestMonths: ['June', 'July', 'August', 'September'],
    heroImage: '/images/destinations/balearic-islands-hero.jpg',
    galleryImages: ['/images/destinations/balearics-1.jpg', '/images/destinations/balearics-2.jpg'],
    averagePricePerWeek: 16000,
    highlights: ['Ibiza sunset bars', 'Mallorca\'s Deià village', 'Formentera crystal waters', 'Menorca biosphere beaches', 'Palma old town'],
    weatherInfo: { summerHighC: 31, summerLowC: 21, waterTempC: 26, windKnots: '8-15', rainyDays: 1 },
    marinas: [{ name: 'Marina Port de Mallorca', location: 'Palma', berths: 556 }, { name: 'Marina Ibiza', location: 'Ibiza', berths: 850 }],
    status: 'active',
  },
  {
    name: 'Sardinia',
    slug: 'sardinia',
    region: 'MEDITERRANEAN',
    country: 'Italy',
    description_en: 'Sardinia\'s Costa Smeralda is the playground of the ultra-wealthy, with emerald waters, pink granite coastlines, and exclusive beach clubs. Beyond the glamour, discover the wild Maddalena Archipelago, ancient nuraghi towers, and some of the Mediterranean\'s most untouched marine environments.',
    description_ar: 'كوستا سميرالدا في سردينيا هي ملعب الأثرياء، بمياهها الزمردية وسواحلها الغرانيتية الوردية ونواديها الشاطئية الحصرية. وراء البريق، اكتشف أرخبيل مادالينا البري وأبراج النوراغي القديمة وبعض أكثر البيئات البحرية البكر في البحر المتوسط.',
    seasonStart: 'May',
    seasonEnd: 'October',
    bestMonths: ['June', 'July', 'August', 'September'],
    heroImage: '/images/destinations/sardinia-hero.jpg',
    galleryImages: ['/images/destinations/sardinia-1.jpg', '/images/destinations/sardinia-2.jpg'],
    averagePricePerWeek: 20000,
    highlights: ['Costa Smeralda', 'La Maddalena Archipelago', 'Porto Cervo marina', 'Nuraghi archaeological sites', 'Pecorino cheese tasting'],
    weatherInfo: { summerHighC: 31, summerLowC: 20, waterTempC: 24, windKnots: '8-18', rainyDays: 1 },
    marinas: [{ name: 'Marina di Porto Cervo', location: 'Porto Cervo', berths: 700 }, { name: 'Marina di Olbia', location: 'Olbia', berths: 320 }],
    status: 'active',
  },
  {
    name: 'Turkish Riviera',
    slug: 'turkish-riviera',
    region: 'MEDITERRANEAN',
    country: 'Turkey',
    description_en: 'The Turquoise Coast stretches from Bodrum to Antalya, offering pine-clad mountains plunging into impossibly blue waters. Charter a traditional gulet for an authentic Blue Voyage experience, explore the sunken city of Kekova, and enjoy world-class halal dining and Turkish hospitality at a fraction of Western Mediterranean prices.',
    description_ar: 'يمتد الساحل الفيروزي من بودروم إلى أنطاليا، حيث تنحدر الجبال المكسوة بأشجار الصنوبر إلى مياه زرقاء لا تصدق. استأجر قوارب جوليت التقليدية لتجربة الرحلة الزرقاء الأصلية، واستكشف مدينة كيكوفا الغارقة، واستمتع بمأكولات حلال عالمية المستوى والضيافة التركية بجزء من أسعار غرب المتوسط.',
    seasonStart: 'April',
    seasonEnd: 'November',
    bestMonths: ['May', 'June', 'July', 'August', 'September', 'October'],
    heroImage: '/images/destinations/turkish-riviera-hero.jpg',
    galleryImages: ['/images/destinations/turkey-1.jpg', '/images/destinations/turkey-2.jpg'],
    averagePricePerWeek: 8000,
    highlights: ['Bodrum castle', 'Kekova sunken city', 'Ölüdeniz Blue Lagoon', 'Traditional Blue Voyage', 'Lycian Way hiking'],
    weatherInfo: { summerHighC: 35, summerLowC: 23, waterTempC: 27, windKnots: '5-12', rainyDays: 0 },
    marinas: [{ name: 'Palmarina Bodrum', location: 'Bodrum', berths: 620 }, { name: 'Kaleici Marina', location: 'Antalya', berths: 100 }],
    status: 'active',
  },
  {
    name: 'Montenegro',
    slug: 'montenegro',
    region: 'MEDITERRANEAN',
    country: 'Montenegro',
    description_en: 'The Adriatic\'s hidden gem, Montenegro offers dramatic fjord-like coastlines, medieval fortified towns, and ultra-luxury developments like Porto Montenegro. The Bay of Kotor — Europe\'s southernmost fjord — provides a stunning natural harbour framed by towering mountains, while the coastline offers increasingly sophisticated superyacht facilities.',
    description_ar: 'جوهرة الأدرياتيك المخفية، تقدم الجبل الأسود سواحل شبيهة بالمضائق البحرية الدراماتيكية ومدن محصنة من القرون الوسطى ومشاريع فائقة الفخامة مثل بورتو مونتينيغرو. خليج كوتور — أقصى مضيق بحري جنوبي في أوروبا — يوفر ميناء طبيعي مذهل تحيط به الجبال الشاهقة، بينما يقدم الساحل مرافق يخوت فائقة متطورة بشكل متزايد.',
    seasonStart: 'May',
    seasonEnd: 'October',
    bestMonths: ['June', 'July', 'August', 'September'],
    heroImage: '/images/destinations/montenegro-hero.jpg',
    galleryImages: ['/images/destinations/montenegro-1.jpg', '/images/destinations/montenegro-2.jpg'],
    averagePricePerWeek: 10000,
    highlights: ['Bay of Kotor', 'Porto Montenegro', 'Sveti Stefan', 'Budva old town', 'Perast churches'],
    weatherInfo: { summerHighC: 30, summerLowC: 19, waterTempC: 24, windKnots: '5-10', rainyDays: 2 },
    marinas: [{ name: 'Porto Montenegro', location: 'Tivat', berths: 450 }, { name: 'Marina Kotor', location: 'Kotor', berths: 30 }],
    status: 'active',
  },
  {
    name: 'Sicily',
    slug: 'sicily',
    region: 'MEDITERRANEAN',
    country: 'Italy',
    description_en: 'The Mediterranean\'s largest island blends ancient Greek temples, active volcanoes, and some of Italy\'s finest cuisine. Sail around Mount Etna\'s dramatic coastline, explore the Aeolian Islands\' volcanic hot springs, and discover the baroque splendour of Taormina. Sicily offers authentic Italian charm far from the tourist crowds of the north.',
    description_ar: 'أكبر جزيرة في البحر المتوسط تمزج بين المعابد اليونانية القديمة والبراكين النشطة وبعض أرقى المأكولات الإيطالية. أبحر حول ساحل جبل إتنا الدراماتيكي، واستكشف الينابيع الحارة البركانية في جزر إيوليان، واكتشف روعة الباروك في تاورمينا. تقدم صقلية سحر إيطاليا الأصيل بعيداً عن حشود السياح في الشمال.',
    seasonStart: 'May',
    seasonEnd: 'October',
    bestMonths: ['June', 'July', 'August', 'September'],
    heroImage: '/images/destinations/sicily-hero.jpg',
    galleryImages: ['/images/destinations/sicily-1.jpg', '/images/destinations/sicily-2.jpg'],
    averagePricePerWeek: 14000,
    highlights: ['Mount Etna sailing', 'Aeolian Islands', 'Taormina amphitheatre', 'Arancini street food', 'Valley of the Temples'],
    weatherInfo: { summerHighC: 33, summerLowC: 22, waterTempC: 26, windKnots: '8-15', rainyDays: 1 },
    marinas: [{ name: 'Marina di Portorosa', location: 'Messina', berths: 600 }, { name: 'Marina di Ragusa', location: 'Ragusa', berths: 850 }],
    status: 'active',
  },
  {
    name: 'Malta',
    slug: 'malta',
    region: 'MEDITERRANEAN',
    country: 'Malta',
    description_en: 'This compact archipelago punches far above its weight for yachting. Malta, Gozo, and Comino offer 7,000 years of history, the famous Blue Lagoon, and a thriving culinary scene blending Sicilian and North African influences. Its central Mediterranean position makes it an ideal base for multi-destination charters covering Sicily, Tunisia, and the Italian coast.',
    description_ar: 'هذا الأرخبيل المدمج يتفوق بكثير على حجمه في عالم اليخوت. تقدم مالطا وغوزو وكومينو 7000 عام من التاريخ، والبحيرة الزرقاء الشهيرة، ومشهد طهي مزدهر يمزج بين التأثيرات الصقلية وشمال الأفريقية. موقعها المركزي في البحر المتوسط يجعلها قاعدة مثالية لرحلات الاستئجار متعددة الوجهات التي تغطي صقلية وتونس والساحل الإيطالي.',
    seasonStart: 'April',
    seasonEnd: 'November',
    bestMonths: ['May', 'June', 'July', 'August', 'September', 'October'],
    heroImage: '/images/destinations/malta-hero.jpg',
    galleryImages: ['/images/destinations/malta-1.jpg', '/images/destinations/malta-2.jpg'],
    averagePricePerWeek: 9000,
    highlights: ['Comino Blue Lagoon', 'Valletta fortifications', 'Gozo diving', 'Mdina silent city', 'Pastizzi street food'],
    weatherInfo: { summerHighC: 32, summerLowC: 22, waterTempC: 26, windKnots: '8-15', rainyDays: 0 },
    marinas: [{ name: 'Grand Harbour Marina', location: 'Valletta', berths: 300 }, { name: 'Kalkara Marina', location: 'Kalkara', berths: 230 }],
    status: 'active',
  },
]

// ═══════════════════════════════════════════════════════════
// SEED HANDLER
// ═══════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const action = body.action || 'destinations'

    if (action === 'destinations') {
      return await seedDestinations()
    }

    if (action === 'yachts') {
      return await seedYachts()
    }

    if (action === 'itineraries') {
      return await seedItineraries()
    }

    if (action === 'brokers') {
      return await seedBrokers()
    }

    if (action === 'all') {
      const destResult = await seedDestinations()
      const destData = await destResult.json()
      const yachtResult = await seedYachts()
      const yachtData = await yachtResult.json()
      const itinResult = await seedItineraries()
      const itinData = await itinResult.json()
      const brokerResult = await seedBrokers()
      const brokerData = await brokerResult.json()
      return NextResponse.json({
        destinations: destData,
        yachts: yachtData,
        itineraries: itinData,
        brokers: brokerData,
      })
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  } catch (error) {
    console.error('[yacht-seed] Error:', error)
    return NextResponse.json(
      { error: 'Seed operation failed' },
      { status: 500 }
    )
  }
}

// ─── Seed Destinations ─────────────────────────────────────

async function seedDestinations() {
  const { prisma } = await import('@/lib/db')

  let created = 0
  let skipped = 0
  const results: string[] = []

  for (const dest of DESTINATIONS) {
    // Idempotent: skip if slug+siteId already exists
    const existing = await prisma.yachtDestination.findFirst({
      where: { slug: dest.slug, siteId: SITE_ID },
    })

    if (existing) {
      skipped++
      results.push(`⏭ ${dest.name} (already exists)`)
      continue
    }

    await prisma.yachtDestination.create({
      data: {
        ...dest,
        siteId: SITE_ID,
      },
    })

    created++
    results.push(`✅ ${dest.name}`)
  }

  return NextResponse.json({
    success: true,
    action: 'destinations',
    created,
    skipped,
    total: DESTINATIONS.length,
    results,
  })
}

// ═══════════════════════════════════════════════════════════
// YACHT SEED DATA — 50 Mediterranean charter yachts
// ═══════════════════════════════════════════════════════════

// Helper: each yacht references a destination by slug
interface YachtSeed {
  name: string
  slug: string
  type: string
  length: number
  beam: number
  draft: number
  yearBuilt: number
  builder: string
  model: string
  cabins: number
  berths: number
  bathrooms: number
  crewSize: number
  pricePerWeekLow: number
  pricePerWeekHigh: number
  currency: string
  description_en: string
  description_ar: string
  features: Record<string, unknown>
  images: unknown[]
  waterSports: string[]
  halalCateringAvailable: boolean
  familyFriendly: boolean
  crewIncluded: boolean
  homePort: string
  cruisingArea: string
  rating: number
  reviewCount: number
  featured: boolean
  destinationSlug: string
}

function makeYacht(
  name: string, slug: string, type: string, length: number, cabins: number, berths: number,
  builder: string, model: string, yearBuilt: number, pricePerWeekLow: number, pricePerWeekHigh: number,
  homePort: string, cruisingArea: string, destinationSlug: string,
  opts: Partial<YachtSeed> = {}
): YachtSeed {
  return {
    name, slug, type, length,
    beam: opts.beam ?? Math.round(length * 0.22 * 10) / 10,
    draft: opts.draft ?? Math.round(length * 0.07 * 10) / 10,
    yearBuilt, builder, model,
    cabins, berths, bathrooms: opts.bathrooms ?? cabins,
    crewSize: opts.crewSize ?? Math.max(2, Math.ceil(cabins * 0.8)),
    pricePerWeekLow, pricePerWeekHigh,
    currency: 'EUR',
    description_en: opts.description_en ?? `${name} is a ${length}m ${builder} ${model} (${yearBuilt}), offering ${cabins} cabins for up to ${berths} guests. Based in ${homePort}, she cruises the ${cruisingArea} with a professional crew.`,
    description_ar: opts.description_ar ?? `${name} هو يخت ${builder} ${model} بطول ${length} متر (${yearBuilt})، يوفر ${cabins} كبائن لما يصل إلى ${berths} ضيفاً. مقره في ${homePort}، يبحر في ${cruisingArea} مع طاقم محترف.`,
    features: opts.features ?? { airConditioning: true, wifi: true, generator: true, watermaker: true, dinghy: true, bbq: true, soundSystem: true },
    images: opts.images ?? [],
    waterSports: opts.waterSports ?? ['paddleboard', 'snorkeling', 'kayak'],
    halalCateringAvailable: opts.halalCateringAvailable ?? true,
    familyFriendly: opts.familyFriendly ?? true,
    crewIncluded: opts.crewIncluded ?? true,
    homePort, cruisingArea,
    rating: opts.rating ?? 4.7,
    reviewCount: opts.reviewCount ?? Math.floor(Math.random() * 40) + 5,
    featured: opts.featured ?? false,
    destinationSlug,
  }
}

const YACHTS: YachtSeed[] = [
  // ── Greek Islands (10 yachts) ──
  makeYacht('Aegean Dream', 'aegean-dream', 'MOTOR_YACHT', 32, 5, 10, 'Azimut', 'Grande 32M', 2022, 28000, 38000, 'Athens', 'Greek Islands', 'greek-islands', { featured: true, waterSports: ['jetski', 'paddleboard', 'snorkeling', 'seabob', 'kayak'] }),
  makeYacht('Cyclades Spirit', 'cyclades-spirit', 'CATAMARAN', 18, 4, 8, 'Lagoon', '620', 2021, 14000, 20000, 'Athens', 'Cyclades', 'greek-islands', { waterSports: ['paddleboard', 'snorkeling', 'kayak', 'fishing'] }),
  makeYacht('Mykonos Blue', 'mykonos-blue', 'SAILBOAT', 22, 4, 8, 'Jeanneau', '64', 2020, 12000, 18000, 'Mykonos', 'Cyclades', 'greek-islands'),
  makeYacht('Poseidon\'s Grace', 'poseidons-grace', 'SUPERYACHT', 45, 6, 12, 'Benetti', 'Delfino 95', 2023, 65000, 85000, 'Athens', 'Greek Islands', 'greek-islands', { featured: true, crewSize: 9, waterSports: ['jetski', 'seabob', 'paddleboard', 'snorkeling', 'wakeboard', 'diving'] }),
  makeYacht('Ionian Breeze', 'ionian-breeze', 'SAILBOAT', 16, 3, 6, 'Beneteau', 'Oceanis 51.1', 2021, 8000, 12000, 'Lefkada', 'Ionian Islands', 'greek-islands'),
  makeYacht('Olympia Star', 'olympia-star', 'MOTOR_YACHT', 24, 4, 8, 'Princess', 'Y85', 2022, 22000, 30000, 'Corfu', 'Ionian Islands', 'greek-islands', { waterSports: ['jetski', 'paddleboard', 'snorkeling', 'wakeboard'] }),
  makeYacht('Athena Seas', 'athena-seas', 'CATAMARAN', 14, 4, 8, 'Fountaine Pajot', 'Elba 45', 2023, 10000, 15000, 'Lavrion', 'Saronic Gulf', 'greek-islands'),
  makeYacht('Santorini Sunset', 'santorini-sunset', 'MOTOR_YACHT', 28, 4, 8, 'Ferretti', '780', 2021, 25000, 35000, 'Santorini', 'Cyclades', 'greek-islands', { featured: true }),
  makeYacht('Dodecanese Explorer', 'dodecanese-explorer', 'GULET', 30, 6, 12, 'Turkish Custom', 'Gulet 30m', 2019, 16000, 24000, 'Rhodes', 'Dodecanese', 'greek-islands', { crewSize: 5 }),
  makeYacht('Crete Voyager', 'crete-voyager', 'POWER_CATAMARAN', 20, 4, 8, 'Sunreef', '60 Power', 2023, 18000, 26000, 'Heraklion', 'Crete & Cyclades', 'greek-islands', { waterSports: ['jetski', 'seabob', 'paddleboard', 'snorkeling'] }),

  // ── Croatian Coast (8 yachts) ──
  makeYacht('Adriatic Pearl', 'adriatic-pearl', 'MOTOR_YACHT', 26, 4, 8, 'Sunseeker', 'Predator 80', 2022, 20000, 28000, 'Split', 'Dalmatian Coast', 'croatian-coast', { featured: true, waterSports: ['jetski', 'paddleboard', 'snorkeling', 'wakeboard'] }),
  makeYacht('Dalmatia Dream', 'dalmatia-dream', 'CATAMARAN', 16, 4, 8, 'Lagoon', '52', 2022, 11000, 16000, 'Dubrovnik', 'Southern Dalmatia', 'croatian-coast'),
  makeYacht('Kornati Wind', 'kornati-wind', 'SAILBOAT', 18, 3, 6, 'Hanse', '588', 2021, 8000, 12000, 'Zadar', 'Kornati Islands', 'croatian-coast'),
  makeYacht('Split Horizon', 'split-horizon', 'MOTOR_YACHT', 22, 4, 8, 'Princess', 'V65', 2023, 18000, 24000, 'Split', 'Central Dalmatia', 'croatian-coast'),
  makeYacht('Hvar Elegance', 'hvar-elegance', 'CATAMARAN', 14, 4, 8, 'Bali', '4.6', 2023, 9000, 14000, 'Split', 'Hvar & Vis', 'croatian-coast'),
  makeYacht('Dubrovnik Star', 'dubrovnik-star', 'SUPERYACHT', 38, 5, 10, 'Riva', '110 Dolcevita', 2022, 45000, 60000, 'Dubrovnik', 'South Adriatic', 'croatian-coast', { featured: true, crewSize: 7 }),
  makeYacht('Island Hopper', 'island-hopper-croatia', 'SAILBOAT', 15, 3, 6, 'Bavaria', 'C50', 2022, 7000, 10000, 'Trogir', 'Central Islands', 'croatian-coast'),
  makeYacht('Vis Serenity', 'vis-serenity', 'GULET', 24, 5, 10, 'Croatian Custom', 'Gulet 24m', 2020, 14000, 20000, 'Split', 'Vis & Korcula', 'croatian-coast'),

  // ── French Riviera (6 yachts) ──
  makeYacht('Côte d\'Azur', 'cote-dazur', 'SUPERYACHT', 50, 6, 12, 'Lurssen', 'Custom 50m', 2021, 90000, 120000, 'Antibes', 'French Riviera', 'french-riviera', { featured: true, crewSize: 11, waterSports: ['jetski', 'seabob', 'paddleboard', 'diving', 'wakeboard', 'waterski'] }),
  makeYacht('Monaco Prestige', 'monaco-prestige', 'MOTOR_YACHT', 35, 5, 10, 'Mangusta', '108', 2023, 40000, 55000, 'Monaco', 'French Riviera', 'french-riviera', { waterSports: ['jetski', 'seabob', 'paddleboard', 'snorkeling'] }),
  makeYacht('Saint-Tropez Sun', 'saint-tropez-sun', 'MOTOR_YACHT', 28, 4, 8, 'Ferretti', '850', 2022, 30000, 42000, 'Saint-Tropez', 'French Riviera', 'french-riviera'),
  makeYacht('Riviera Bliss', 'riviera-bliss', 'CATAMARAN', 20, 4, 10, 'Sunreef', '80', 2023, 22000, 32000, 'Cannes', 'French Riviera', 'french-riviera', { waterSports: ['jetski', 'paddleboard', 'snorkeling', 'kayak', 'seabob'] }),
  makeYacht('Cannes Jewel', 'cannes-jewel', 'MOTOR_YACHT', 24, 4, 8, 'Sanlorenzo', 'SL78', 2022, 25000, 35000, 'Cannes', 'Lérins Islands', 'french-riviera'),
  makeYacht('Antibes Classic', 'antibes-classic', 'SAILBOAT', 22, 4, 8, 'Oyster', '745', 2020, 15000, 22000, 'Antibes', 'French Riviera', 'french-riviera'),

  // ── Amalfi Coast (5 yachts) ──
  makeYacht('Amalfi Goddess', 'amalfi-goddess', 'MOTOR_YACHT', 30, 4, 8, 'Azimut', 'Grande 30M', 2023, 28000, 38000, 'Naples', 'Amalfi & Capri', 'amalfi-coast', { featured: true }),
  makeYacht('Capri Breeze', 'capri-breeze', 'MOTOR_YACHT', 22, 3, 6, 'Itama', '75', 2021, 18000, 25000, 'Sorrento', 'Bay of Naples', 'amalfi-coast'),
  makeYacht('Positano Jewel', 'positano-jewel', 'SAILBOAT', 18, 3, 6, 'Grand Soleil', '58', 2022, 10000, 15000, 'Salerno', 'Amalfi Coast', 'amalfi-coast'),
  makeYacht('Vesuvio Star', 'vesuvio-star', 'CATAMARAN', 16, 4, 8, 'Lagoon', '55', 2023, 14000, 20000, 'Naples', 'Bay of Naples & Capri', 'amalfi-coast'),
  makeYacht('Sorrento Dreams', 'sorrento-dreams', 'MOTOR_YACHT', 24, 4, 8, 'Ferretti', '670', 2020, 20000, 28000, 'Sorrento', 'Amalfi & Ischia', 'amalfi-coast'),

  // ── Balearic Islands (5 yachts) ──
  makeYacht('Ibiza Sunset', 'ibiza-sunset', 'MOTOR_YACHT', 30, 5, 10, 'Sunseeker', '95', 2022, 30000, 42000, 'Ibiza', 'Balearic Islands', 'balearic-islands', { featured: true, waterSports: ['jetski', 'seabob', 'paddleboard', 'wakeboard'] }),
  makeYacht('Mallorca Spirit', 'mallorca-spirit', 'CATAMARAN', 18, 4, 8, 'Fountaine Pajot', 'Alegria 67', 2023, 14000, 20000, 'Palma', 'Mallorca & Menorca', 'balearic-islands'),
  makeYacht('Formentera Blue', 'formentera-blue', 'SAILBOAT', 16, 3, 6, 'Dufour', '530', 2022, 8000, 12000, 'Ibiza', 'Ibiza & Formentera', 'balearic-islands'),
  makeYacht('Tramuntana', 'tramuntana', 'MOTOR_YACHT', 24, 4, 8, 'Princess', 'S78', 2021, 22000, 30000, 'Palma', 'Northern Mallorca', 'balearic-islands'),
  makeYacht('Menorca Haven', 'menorca-haven', 'POWER_CATAMARAN', 15, 3, 6, 'Leopard', '53 PC', 2023, 12000, 17000, 'Mahón', 'Menorca', 'balearic-islands'),

  // ── Sardinia (4 yachts) ──
  makeYacht('Emerald Coast', 'emerald-coast', 'SUPERYACHT', 42, 5, 10, 'Codecasa', '42m', 2022, 55000, 75000, 'Porto Cervo', 'Costa Smeralda', 'sardinia', { featured: true, crewSize: 8 }),
  makeYacht('Maddalena Wind', 'maddalena-wind', 'SAILBOAT', 20, 4, 8, 'Swan', '65', 2021, 14000, 20000, 'Olbia', 'La Maddalena', 'sardinia'),
  makeYacht('Costa Paradiso', 'costa-paradiso', 'CATAMARAN', 16, 4, 8, 'Lagoon', '52', 2023, 12000, 18000, 'Alghero', 'Northwest Sardinia', 'sardinia'),
  makeYacht('Sardinia Lux', 'sardinia-lux', 'MOTOR_YACHT', 28, 4, 8, 'Pershing', '82', 2022, 26000, 36000, 'Porto Cervo', 'Costa Smeralda', 'sardinia'),

  // ── Turkish Riviera (5 yachts) ──
  makeYacht('Blue Voyage', 'blue-voyage', 'GULET', 35, 6, 12, 'Bodrum Shipyard', 'Custom Gulet 35m', 2020, 12000, 18000, 'Bodrum', 'Turquoise Coast', 'turkish-riviera', { featured: true, crewSize: 6 }),
  makeYacht('Bodrum Belle', 'bodrum-belle', 'MOTOR_YACHT', 24, 4, 8, 'Numarine', '78HT', 2023, 16000, 22000, 'Bodrum', 'Bodrum Peninsula', 'turkish-riviera'),
  makeYacht('Turquoise Dream', 'turquoise-dream', 'GULET', 28, 5, 10, 'Fethiye Shipyard', 'Custom Gulet 28m', 2019, 10000, 16000, 'Fethiye', 'Lycian Coast', 'turkish-riviera'),
  makeYacht('Antalya Sun', 'antalya-sun', 'CATAMARAN', 14, 4, 8, 'Nautitech', '46 Open', 2022, 8000, 12000, 'Antalya', 'Turkish Riviera', 'turkish-riviera'),
  makeYacht('Kekova Explorer', 'kekova-explorer', 'SAILBOAT', 18, 3, 6, 'Jeanneau', '54', 2021, 7000, 10000, 'Kaş', 'Kekova & Kaş', 'turkish-riviera'),

  // ── Montenegro (3 yachts) ──
  makeYacht('Kotor Bay', 'kotor-bay', 'MOTOR_YACHT', 26, 4, 8, 'Prestige', '680', 2023, 18000, 25000, 'Tivat', 'Bay of Kotor', 'montenegro'),
  makeYacht('Adriatic Crown', 'adriatic-crown', 'CATAMARAN', 15, 4, 8, 'Bali', '4.8', 2022, 9000, 13000, 'Tivat', 'Montenegro Coast', 'montenegro'),
  makeYacht('Sveti Stefan', 'sveti-stefan-yacht', 'SAILBOAT', 16, 3, 6, 'Elan', 'Impression 50.1', 2021, 6000, 9000, 'Budva', 'South Montenegro', 'montenegro'),

  // ── Sicily (2 yachts) ──
  makeYacht('Etna Voyager', 'etna-voyager', 'MOTOR_YACHT', 28, 4, 8, 'Custom Line', '97', 2022, 24000, 34000, 'Catania', 'Sicily & Aeolians', 'sicily', { featured: true }),
  makeYacht('Aeolian Wind', 'aeolian-wind', 'SAILBOAT', 18, 3, 6, 'X-Yachts', 'X56', 2021, 10000, 15000, 'Milazzo', 'Aeolian Islands', 'sicily'),

  // ── Malta (2 yachts) ──
  makeYacht('Valletta Star', 'valletta-star', 'MOTOR_YACHT', 22, 3, 6, 'Azimut', '72', 2023, 16000, 22000, 'Valletta', 'Malta & Gozo', 'malta'),
  makeYacht('Gozo Blue', 'gozo-blue', 'CATAMARAN', 14, 4, 8, 'Fountaine Pajot', 'Tanna 47', 2023, 8000, 12000, 'Valletta', 'Malta, Gozo & Comino', 'malta'),
]

// ─── Seed Yachts ────────────────────────────────────────────

async function seedYachts() {
  const { prisma } = await import('@/lib/db')

  // Build destination slug → id lookup
  const destinations = await prisma.yachtDestination.findMany({
    where: { siteId: SITE_ID },
    select: { id: true, slug: true },
  })
  const destMap = new Map<string, string>(destinations.map(d => [d.slug, d.id]))

  let created = 0
  let skipped = 0
  let noDestination = 0
  const results: string[] = []

  for (const yacht of YACHTS) {
    const destId = destMap.get(yacht.destinationSlug)
    if (!destId) {
      noDestination++
      results.push(`⚠️ ${yacht.name} — destination "${yacht.destinationSlug}" not found (seed destinations first)`)
      continue
    }

    // Idempotent: skip if slug+siteId already exists
    const existing = await prisma.yacht.findFirst({
      where: { slug: yacht.slug, siteId: SITE_ID },
    })

    if (existing) {
      skipped++
      results.push(`⏭ ${yacht.name} (already exists)`)
      continue
    }

    const { destinationSlug: _destSlug, ...yachtData } = yacht
    await prisma.yacht.create({
      data: {
        ...yachtData,
        siteId: SITE_ID,
        destinationId: destId,
        source: 'MANUAL',
        status: 'active',
      },
    })

    created++
    results.push(`✅ ${yacht.name} (${yacht.type}, ${yacht.length}m)`)
  }

  return NextResponse.json({
    success: true,
    action: 'yachts',
    created,
    skipped,
    noDestination,
    total: YACHTS.length,
    results,
  })
}

// ═══════════════════════════════════════════════════════════
// ITINERARY SEED DATA — 5 Mediterranean charter itineraries
// ═══════════════════════════════════════════════════════════

interface ItinerarySeed {
  title_en: string
  title_ar: string
  slug: string
  destinationSlug: string
  duration: number
  difficulty: string
  description_en: string
  description_ar: string
  stops: Array<{ day: number; port: string; lat: number; lng: number; activities: string[]; restaurants: string[]; notes: string }>
  recommendedYachtTypes: string[]
  estimatedCost: number
  currency: string
  bestSeason: string
  heroImage: string
  status: string
}

const ITINERARIES: ItinerarySeed[] = [
  {
    title_en: 'Greek Island Hopping: Athens to Santorini',
    title_ar: 'التنقل بين الجزر اليونانية: من أثينا إلى سانتوريني',
    slug: 'greek-island-hopping-athens-santorini',
    destinationSlug: 'greek-islands',
    duration: 7,
    difficulty: 'EASY',
    description_en: 'The classic Cyclades route — sail from Athens through the heart of the Greek Islands. Visit the sacred island of Delos, party in Mykonos, swim in the volcanic caldera of Milos, and finish with Santorini\'s legendary sunset. Perfect for first-time charterers and families.',
    description_ar: 'الطريق الكلاسيكي في كيكلاديس — أبحر من أثينا عبر قلب الجزر اليونانية. قم بزيارة جزيرة ديلوس المقدسة، واستمتع في ميكونوس، واسبح في فوهة ميلوس البركانية، وانتهِ مع غروب الشمس الأسطوري في سانتوريني. مثالي للمستأجرين لأول مرة والعائلات.',
    stops: [
      { day: 1, port: 'Athens (Alimos Marina)', lat: 37.9082, lng: 23.7227, activities: ['Board yacht', 'Acropolis visit', 'Welcome dinner'], restaurants: ['Varoulko Seaside', 'Spondi'], notes: 'Provisioning and crew briefing. Optional Acropolis tour.' },
      { day: 2, port: 'Kea', lat: 37.6306, lng: 24.3340, activities: ['Swim at Koundouros beach', 'Hike to Lion of Kea', 'Snorkeling'], restaurants: ['Rolando\'s', 'Magazes'], notes: 'Short 2h sail from Athens. Quiet island away from crowds.' },
      { day: 3, port: 'Mykonos', lat: 37.4467, lng: 25.3289, activities: ['Little Venice', 'Windmills', 'Beach clubs', 'Shopping'], restaurants: ['Nammos', 'Scorpios', 'Interni'], notes: 'Full day exploring. Reserve Nammos beach club in advance.' },
      { day: 4, port: 'Delos & Paros', lat: 37.0833, lng: 25.1500, activities: ['Delos archaeological site', 'Parikia old town', 'Golden Beach'], restaurants: ['Mario', 'Levantis'], notes: 'Morning at Delos (UNESCO site). Afternoon sail to Paros.' },
      { day: 5, port: 'Milos', lat: 36.7488, lng: 24.4262, activities: ['Sarakiniko lunar beach', 'Kleftiko sea caves', 'Plaka sunset'], restaurants: ['O! Hamos!', 'Medusa'], notes: 'Volcanic island with 70+ beaches. Kleftiko accessible only by sea.' },
      { day: 6, port: 'Santorini (Fira)', lat: 36.4166, lng: 25.4324, activities: ['Caldera cruise', 'Oia sunset', 'Wine tasting', 'Hot springs'], restaurants: ['Selene', 'Ambrosia'], notes: 'Anchor in caldera. Tender to Fira. Book Oia sunset restaurant early.' },
      { day: 7, port: 'Santorini (Departure)', lat: 36.3932, lng: 25.4615, activities: ['Final swim', 'Breakfast on deck', 'Disembark'], restaurants: [], notes: 'Disembark by 10am. Transfer to Santorini airport or ferry.' },
    ],
    recommendedYachtTypes: ['CATAMARAN', 'MOTOR_YACHT', 'SAILBOAT'],
    estimatedCost: 15000,
    currency: 'EUR',
    bestSeason: 'June to September',
    heroImage: '/images/itineraries/greek-island-hopping-hero.jpg',
    status: 'active',
  },
  {
    title_en: 'Croatian Coastal Discovery: Split to Dubrovnik',
    title_ar: 'اكتشاف الساحل الكرواتي: من سبليت إلى دوبروفنيك',
    slug: 'croatian-coastal-split-dubrovnik',
    destinationSlug: 'croatian-coast',
    duration: 10,
    difficulty: 'EASY',
    description_en: 'Sail the stunning Dalmatian Coast from Split to Dubrovnik, exploring medieval walled cities, crystal-clear island bays, and Croatia\'s finest vineyards. This route covers the highlights: Hvar\'s lavender fields, Vis\'s hidden beaches, Korčula\'s old town (Marco Polo\'s birthplace), and Dubrovnik\'s iconic walls.',
    description_ar: 'أبحر عبر ساحل دالماتيا المذهل من سبليت إلى دوبروفنيك، مستكشفاً المدن المسورة من القرون الوسطى وخلجان الجزر الصافية وأرقى مزارع العنب في كرواتيا. يغطي هذا الطريق أبرز المعالم: حقول اللافندر في هفار وشواطئ فيس المخفية والمدينة القديمة في كورتشولا (مسقط رأس ماركو بولو) وأسوار دوبروفنيك الأيقونية.',
    stops: [
      { day: 1, port: 'Split', lat: 43.5081, lng: 16.4402, activities: ['Board yacht', 'Diocletian\'s Palace', 'Riva promenade'], restaurants: ['Zoi', 'Dvor'], notes: 'Embark at ACI Marina. Explore the palace in the evening.' },
      { day: 2, port: 'Brač (Bol)', lat: 43.2615, lng: 16.6551, activities: ['Zlatni Rat beach', 'Windsurfing', 'Olive oil tasting'], restaurants: ['Restaurant Palute', 'Konoba Kopačina'], notes: 'Famous horn-shaped beach. Best snorkeling on the island.' },
      { day: 3, port: 'Hvar', lat: 43.1729, lng: 16.4414, activities: ['Hvar Fortress', 'Lavender shopping', 'Pakleni Islands swim'], restaurants: ['Giaxa', 'Gariful'], notes: 'Most popular island. Pakleni Islands for secluded swimming.' },
      { day: 4, port: 'Vis', lat: 43.0610, lng: 16.1831, activities: ['Blue Cave (Biševo)', 'Stiniva beach', 'Wine tasting'], restaurants: ['Konoba Roki\'s', 'Villa Kaliopa'], notes: 'Former military island. Book Blue Cave morning tour.' },
      { day: 5, port: 'Vis (Komiža)', lat: 43.0439, lng: 16.0926, activities: ['Fishing village walk', 'Monastery visit', 'Sunset swim'], restaurants: ['Konoba Bako', 'Jastozera'], notes: 'Relaxed fishing town. Famous lobster restaurant in a fort.' },
      { day: 6, port: 'Korčula', lat: 42.9597, lng: 17.1356, activities: ['Old town walk', 'Marco Polo house', 'Moreška sword dance'], restaurants: ['LD Restaurant', 'Konoba Mate'], notes: 'Mini-Dubrovnik. Check Moreška dance performance schedule.' },
      { day: 7, port: 'Lastovo', lat: 42.7702, lng: 16.8989, activities: ['Stargazing', 'Diving', 'Nature park hiking'], restaurants: ['Konoba Augusta Insula', 'Triton'], notes: 'Croatia\'s most remote inhabited island. Darkest skies in Europe.' },
      { day: 8, port: 'Mljet', lat: 42.7441, lng: 17.5444, activities: ['National Park lakes', 'Monastery island', 'Cycling'], restaurants: ['Konoba Ankora', 'Mali Raj'], notes: 'Two saltwater lakes inside the national park. Rent bikes.' },
      { day: 9, port: 'Elafiti Islands', lat: 42.6833, lng: 17.9500, activities: ['Lopud beach', 'Šipan olive groves', 'Koločep swim'], restaurants: ['Obala', 'Restaurant Šipan'], notes: 'Car-free islands. Šunj beach on Lopud is stunning.' },
      { day: 10, port: 'Dubrovnik', lat: 42.6507, lng: 18.0944, activities: ['City walls walk', 'Cable car', 'Game of Thrones tour', 'Disembark'], restaurants: ['Restaurant 360', 'Nautika'], notes: 'Arrive early. Walk the walls. Disembark by evening.' },
    ],
    recommendedYachtTypes: ['CATAMARAN', 'SAILBOAT', 'GULET'],
    estimatedCost: 12000,
    currency: 'EUR',
    bestSeason: 'June to September',
    heroImage: '/images/itineraries/croatian-coastal-hero.jpg',
    status: 'active',
  },
  {
    title_en: 'Amalfi & Capri: Bay of Naples Luxury',
    title_ar: 'أمالفي وكابري: فخامة خليج نابولي',
    slug: 'amalfi-capri-bay-of-naples',
    destinationSlug: 'amalfi-coast',
    duration: 5,
    difficulty: 'EASY',
    description_en: 'A compact luxury itinerary exploring the Bay of Naples\' greatest hits. Sail past Vesuvius to the legendary isle of Capri, cruise the dramatic Amalfi cliffside, and discover the lesser-known beauty of Ischia\'s thermal springs. Five days of Italian dolce vita at its finest.',
    description_ar: 'رحلة فاخرة مدمجة تستكشف أبرز معالم خليج نابولي. أبحر أمام فيزوف إلى جزيرة كابري الأسطورية، وتجول عبر منحدرات أمالفي الدراماتيكية، واكتشف جمال ينابيع إيسكيا الحرارية الأقل شهرة. خمسة أيام من الحياة الإيطالية الحلوة في أبهى صورها.',
    stops: [
      { day: 1, port: 'Naples', lat: 40.8518, lng: 14.2681, activities: ['Board yacht', 'Naples historic centre', 'Pizza pilgrimage'], restaurants: ['Da Michele', 'Palazzo Petrucci'], notes: 'Board at Marina di Stabia or Naples port. Pizza is mandatory.' },
      { day: 2, port: 'Capri', lat: 40.5531, lng: 14.2222, activities: ['Blue Grotto', 'Faraglioni rocks', 'Augustus Gardens', 'Shopping'], restaurants: ['Da Paolino (lemon grove)', 'Il Riccio'], notes: 'Arrive early for Blue Grotto. Afternoon in Anacapri.' },
      { day: 3, port: 'Positano', lat: 40.6280, lng: 14.4852, activities: ['Beach day', 'Boutique shopping', 'Path of the Gods info'], restaurants: ['La Sponda', 'Da Adolfo'], notes: 'Anchor off Positano. Tender to beach. La Sponda dinner with 400 candles.' },
      { day: 4, port: 'Amalfi & Ravello', lat: 40.6340, lng: 14.6027, activities: ['Amalfi Cathedral', 'Ravello gardens', 'Limoncello tasting', 'Paper museum'], restaurants: ['Rossellinis', 'La Caravella'], notes: 'Morning in Amalfi town. Taxi up to Ravello for Villa Rufolo.' },
      { day: 5, port: 'Ischia / Naples', lat: 40.7303, lng: 13.8992, activities: ['Thermal spa', 'Aragonese Castle', 'Disembark'], restaurants: ['Il Mosaico', 'Indaco'], notes: 'Optional morning at Ischia thermal gardens. Return to Naples by midday.' },
    ],
    recommendedYachtTypes: ['MOTOR_YACHT', 'CATAMARAN'],
    estimatedCost: 20000,
    currency: 'EUR',
    bestSeason: 'May to October',
    heroImage: '/images/itineraries/amalfi-capri-hero.jpg',
    status: 'active',
  },
  {
    title_en: 'French Riviera Grand Tour: Cannes to Monaco',
    title_ar: 'جولة الريفييرا الفرنسية الكبرى: من كان إلى موناكو',
    slug: 'french-riviera-cannes-monaco',
    destinationSlug: 'french-riviera',
    duration: 7,
    difficulty: 'EASY',
    description_en: 'The ultimate Côte d\'Azur experience — sail from Cannes to Monaco along the world\'s most glamorous coastline. Beach clubs in Saint-Tropez, art museums in Nice, the medieval village of Èze, and Monaco\'s legendary Casino Square. This is superyacht territory — expect champagne, Michelin stars, and spectacular sunsets.',
    description_ar: 'تجربة الكوت دازور المطلقة — أبحر من كان إلى موناكو على طول أكثر السواحل سحراً في العالم. نوادي الشاطئ في سان تروبيه، ومتاحف الفن في نيس، وقرية إيز القروسطية، وساحة كازينو موناكو الأسطورية. هذه منطقة اليخوت الفائقة — توقع الشمبانيا ونجوم ميشلان وغروب الشمس المذهل.',
    stops: [
      { day: 1, port: 'Cannes', lat: 43.5528, lng: 7.0174, activities: ['Board yacht', 'La Croisette promenade', 'Île Sainte-Marguerite'], restaurants: ['La Palme d\'Or', 'Le Park 45'], notes: 'Board at Port Pierre Canto. Evening walk along La Croisette.' },
      { day: 2, port: 'Îles de Lérins', lat: 43.5125, lng: 7.0464, activities: ['Monastery visit', 'Snorkeling', 'Eucalyptus forest walk'], restaurants: ['La Tonelle', 'Picnic on deck'], notes: 'Anchor between Sainte-Marguerite and Saint-Honorat islands.' },
      { day: 3, port: 'Saint-Tropez', lat: 43.2727, lng: 6.6407, activities: ['Beach club day', 'Old port', 'Citadel views', 'Pampelonne beach'], restaurants: ['Club 55', 'L\'Opéra'], notes: 'Reserve Club 55 or Nikki Beach in advance. Market on Tuesday/Saturday.' },
      { day: 4, port: 'Saint-Raphaël', lat: 43.4253, lng: 6.7688, activities: ['Massif de l\'Estérel hike', 'Red rock calanques', 'Diving'], restaurants: ['Les Voiles', 'L\'Épuisette'], notes: 'Dramatic red porphyry cliffs. Best diving on the Riviera.' },
      { day: 5, port: 'Antibes', lat: 43.5808, lng: 7.1239, activities: ['Picasso Museum', 'Cap d\'Antibes walk', 'Port Vauban megayachts'], restaurants: ['Le Figuier de Saint-Esprit', 'Les Pêcheurs'], notes: 'World\'s largest marina. Picasso Museum in Château Grimaldi.' },
      { day: 6, port: 'Nice & Villefranche', lat: 43.6961, lng: 7.3088, activities: ['Nice old town', 'Matisse Museum', 'Villefranche bay swim'], restaurants: ['Jan', 'Le Chantecler'], notes: 'Anchor in Villefranche — one of the deepest natural harbours in the Med.' },
      { day: 7, port: 'Monaco', lat: 43.7384, lng: 7.4246, activities: ['Casino Monte-Carlo', 'Prince\'s Palace', 'Oceanographic Museum', 'Disembark'], restaurants: ['Le Louis XV', 'Blue Bay'], notes: 'Disembark at Port Hercules. Alain Ducasse\'s Le Louis XV for final dinner.' },
    ],
    recommendedYachtTypes: ['MOTOR_YACHT', 'SUPERYACHT'],
    estimatedCost: 30000,
    currency: 'EUR',
    bestSeason: 'May to September',
    heroImage: '/images/itineraries/french-riviera-hero.jpg',
    status: 'active',
  },
  {
    title_en: 'Turkish Turquoise Coast: Bodrum to Fethiye Blue Voyage',
    title_ar: 'الساحل الفيروزي التركي: رحلة زرقاء من بودروم إلى فتحية',
    slug: 'turkish-turquoise-coast-blue-voyage',
    destinationSlug: 'turkish-riviera',
    duration: 10,
    difficulty: 'EASY',
    description_en: 'The original Blue Voyage route — Turkey\'s most celebrated sailing itinerary. Cruise from Bodrum\'s vibrant harbour to Fethiye\'s sheltered lagoon aboard a traditional gulet. Discover sunken cities, pine-scented coves, and ancient Lycian rock tombs. Exceptional value with world-class halal cuisine and legendary Turkish hospitality.',
    description_ar: 'طريق الرحلة الزرقاء الأصلي — أشهر مسار إبحار في تركيا. أبحر من ميناء بودروم النابض بالحياة إلى بحيرة فتحية المحمية على متن قارب جوليت تقليدي. اكتشف المدن الغارقة والخلجان المعطرة بالصنوبر ومقابر صخور ليسيا القديمة. قيمة استثنائية مع مأكولات حلال عالمية المستوى والضيافة التركية الأسطورية.',
    stops: [
      { day: 1, port: 'Bodrum', lat: 37.0344, lng: 27.4305, activities: ['Board gulet', 'Castle of St. Peter', 'Underwater Archaeology Museum'], restaurants: ['Ottomann', 'Avlu Bistro'], notes: 'Board at Milta Marina. Visit the castle before sunset.' },
      { day: 2, port: 'Orak Island', lat: 37.0500, lng: 27.5833, activities: ['Swimming', 'Snorkeling', 'Kayaking', 'Fishing'], restaurants: ['Lunch on board'], notes: 'Uninhabited island with crystal waters. First overnight anchorage.' },
      { day: 3, port: 'Knidos', lat: 36.6881, lng: 27.3761, activities: ['Ancient city ruins', 'Amphitheatre', 'Lighthouse swim'], restaurants: ['Lunch on board'], notes: 'Ancient Greek harbour city at the tip of Datça peninsula.' },
      { day: 4, port: 'Datça', lat: 36.7297, lng: 27.6856, activities: ['Old town walk', 'Almond orchards', 'Local market'], restaurants: ['Culinarium', 'Datça Sofrası'], notes: 'Charming town. Buy local almonds and honey.' },
      { day: 5, port: 'Hisarönü Bay', lat: 36.7500, lng: 28.0833, activities: ['Swim in hidden coves', 'Paddleboard', 'Sunset BBQ'], restaurants: ['BBQ dinner on deck'], notes: 'Sheltered bay perfect for water sports and overnight anchor.' },
      { day: 6, port: 'Dalyan', lat: 36.8375, lng: 28.6428, activities: ['Lycian rock tombs', 'Turtle beach (Iztuzu)', 'Mud baths'], restaurants: ['Riverside restaurant'], notes: 'River boat to mud baths. Loggerhead turtle nesting site.' },
      { day: 7, port: 'Göcek', lat: 36.7559, lng: 28.9375, activities: ['12 Islands cruise', 'Sheltered bay swimming', 'Town walk'], restaurants: ['Can Restaurant', 'Xtanbal'], notes: 'Gateway to the 12 Islands. Sheltered from meltemi winds.' },
      { day: 8, port: 'Butterfly Valley & Ölüdeniz', lat: 36.5317, lng: 29.1150, activities: ['Butterfly Valley hike', 'Ölüdeniz Blue Lagoon', 'Paragliding (optional)'], restaurants: ['Buzz Bar', 'Ölüdeniz Beach Club'], notes: 'Paragliding from Babadağ mountain — bucket list experience.' },
      { day: 9, port: 'Kaş', lat: 36.2027, lng: 29.6388, activities: ['Kekova sunken city', 'Sea kayaking', 'Amphitheatre sunset'], restaurants: ['Bahçe', 'Bi Lokma'], notes: 'Half-day to Kekova (sunken Lycian city visible through water).' },
      { day: 10, port: 'Fethiye', lat: 36.6570, lng: 29.1223, activities: ['Fethiye market', 'Lycian sarcophagi', 'Disembark'], restaurants: ['Mozaik Bahçe', 'Hilmi'], notes: 'Disembark at Ece Marina. Tuesday is market day.' },
    ],
    recommendedYachtTypes: ['GULET', 'CATAMARAN', 'SAILBOAT'],
    estimatedCost: 10000,
    currency: 'EUR',
    bestSeason: 'May to October',
    heroImage: '/images/itineraries/turkish-blue-voyage-hero.jpg',
    status: 'active',
  },
]

// ═══════════════════════════════════════════════════════════
// BROKER SEED DATA — 5 Mediterranean charter brokers
// ═══════════════════════════════════════════════════════════

const BROKERS = [
  {
    companyName: 'Mediterranean Yacht Brokers',
    contactName: 'Jean-Pierre Dupont',
    email: 'charters@medyachtbrokers.com',
    phone: '+33-4-93-34-5500',
    website: 'https://www.medyachtbrokers.com',
    commissionRate: 12.0,
    status: 'active',
    destinations: {
      tier: 'GOLD',
      regions: ['French Riviera', 'Italian Coast', 'Sardinia', 'Corsica'],
      specialties: ['Superyacht charters', 'Corporate events', 'Film industry charters'],
      description_en: 'Premium yacht brokerage based in Antibes, France. Specialists in French Riviera and Italian coast luxury charters with over 20 years of Mediterranean experience.',
      description_ar: 'وساطة يخوت فاخرة مقرها في أنتيب، فرنسا. متخصصون في رحلات الريفييرا الفرنسية والساحل الإيطالي الفاخرة مع أكثر من 20 عامًا من الخبرة في البحر المتوسط.',
      location: 'Antibes, France',
    },
  },
  {
    companyName: 'Aegean Charter Partners',
    contactName: 'Nikolaos Papadopoulos',
    email: 'bookings@aegeancharters.gr',
    phone: '+30-210-458-7200',
    website: 'https://www.aegeancharters.gr',
    commissionRate: 10.0,
    status: 'active',
    destinations: {
      tier: 'SILVER',
      regions: ['Greek Islands', 'Turkish Riviera', 'Cyclades', 'Dodecanese'],
      specialties: ['Gulet charters', 'Island hopping', 'Honeymoon cruises'],
      description_en: 'Athens-based charter partner specialising in Greek Islands and Turkish Riviera. Expert knowledge of the Aegean with a fleet of traditional gulets and modern catamarans.',
      description_ar: 'شريك تأجير مقره في أثينا متخصص في الجزر اليونانية والريفييرا التركية. معرفة خبيرة ببحر إيجة مع أسطول من قوارب الجوليت التقليدية والقوارب الحديثة.',
      location: 'Athens, Greece',
    },
  },
  {
    companyName: 'Adriatic Sailing Co.',
    contactName: 'Marko Kovačević',
    email: 'info@adriaticsailing.hr',
    phone: '+385-21-345-678',
    website: 'https://www.adriaticsailing.hr',
    commissionRate: 10.0,
    status: 'active',
    destinations: {
      tier: 'SILVER',
      regions: ['Croatian Coast', 'Montenegro', 'Dalmatian Islands', 'Kornati'],
      specialties: ['Bareboat charters', 'Flotilla sailing', 'Adventure cruises'],
      description_en: 'Split-based sailing company covering the Croatian coast and Montenegro. Specialists in bareboat and skippered charters through the Dalmatian islands and Kornati National Park.',
      description_ar: 'شركة إبحار مقرها سبليت تغطي الساحل الكرواتي والجبل الأسود. متخصصون في تأجير القوارب بدون طاقم وبقبطان عبر جزر دالماتيا ومنتزه كورناتي الوطني.',
      location: 'Split, Croatia',
    },
  },
  {
    companyName: 'Blue Water Charters',
    contactName: 'Carlos Martínez',
    email: 'reservations@bluewatercharters.es',
    phone: '+34-971-234-567',
    website: 'https://www.bluewatercharters.es',
    commissionRate: 11.0,
    status: 'active',
    destinations: {
      tier: 'GOLD',
      regions: ['Balearic Islands', 'Sardinia', 'Ibiza', 'Mallorca'],
      specialties: ['Party charters', 'VIP experiences', 'Multi-week voyages'],
      description_en: 'Palma de Mallorca-based luxury charter company specialising in the Balearic Islands and Sardinia. Known for VIP experiences, party charters, and bespoke multi-week Mediterranean voyages.',
      description_ar: 'شركة تأجير يخوت فاخرة مقرها بالما دي مايوركا متخصصة في جزر البليار وسردينيا. معروفة بتجارب كبار الشخصيات ورحلات الحفلات والرحلات المتوسطية المخصصة متعددة الأسابيع.',
      location: 'Palma, Mallorca',
    },
  },
  {
    companyName: 'Istanbul Maritime Group',
    contactName: 'Ahmet Yılmaz',
    email: 'charters@istanbulmaritime.com.tr',
    phone: '+90-212-555-3400',
    website: 'https://www.istanbulmaritime.com.tr',
    commissionRate: 8.0,
    status: 'active',
    destinations: {
      tier: 'BRONZE',
      regions: ['Turkish Riviera', 'Eastern Mediterranean', 'Bodrum', 'Fethiye'],
      specialties: ['Blue Voyage gulets', 'Budget-friendly charters', 'Cultural sailing tours'],
      description_en: 'Istanbul-based maritime group covering the Turkish Riviera and Eastern Mediterranean. Specialists in traditional Blue Voyage gulet charters from Bodrum to Fethiye with exceptional value and authentic Turkish hospitality.',
      description_ar: 'مجموعة بحرية مقرها إسطنبول تغطي الريفييرا التركية وشرق البحر المتوسط. متخصصون في رحلات قوارب الجوليت التقليدية للرحلة الزرقاء من بودروم إلى فتحية بقيمة استثنائية وضيافة تركية أصيلة.',
      location: 'Istanbul, Turkey',
    },
  },
]

// ─── Seed Brokers ──────────────────────────────────────────

async function seedBrokers() {
  const { prisma } = await import('@/lib/db')

  let created = 0
  let skipped = 0
  const results: string[] = []

  for (const broker of BROKERS) {
    // Idempotent: skip if companyName+siteId already exists
    const existing = await prisma.brokerPartner.findFirst({
      where: { companyName: broker.companyName, siteId: SITE_ID },
    })

    if (existing) {
      skipped++
      results.push(`⏭ ${broker.companyName} (already exists)`)
      continue
    }

    await prisma.brokerPartner.create({
      data: {
        companyName: broker.companyName,
        contactName: broker.contactName,
        email: broker.email,
        phone: broker.phone,
        website: broker.website,
        commissionRate: broker.commissionRate,
        status: broker.status,
        destinations: broker.destinations,
        siteId: SITE_ID,
      },
    })

    created++
    const tier = (broker.destinations as Record<string, unknown>).tier || 'N/A'
    results.push(`✅ ${broker.companyName} (${tier}, ${broker.commissionRate}%)`)
  }

  return NextResponse.json({
    success: true,
    action: 'brokers',
    created,
    skipped,
    total: BROKERS.length,
    results,
  })
}

// ─── Seed Itineraries ───────────────────────────────────────

async function seedItineraries() {
  const { prisma } = await import('@/lib/db')

  // Build destination slug → id lookup
  const destinations = await prisma.yachtDestination.findMany({
    where: { siteId: SITE_ID },
    select: { id: true, slug: true },
  })
  const destMap = new Map<string, string>(destinations.map(d => [d.slug, d.id]))

  let created = 0
  let skipped = 0
  let noDestination = 0
  const results: string[] = []

  for (const itin of ITINERARIES) {
    const destId = destMap.get(itin.destinationSlug)
    if (!destId) {
      noDestination++
      results.push(`⚠️ ${itin.title_en} — destination "${itin.destinationSlug}" not found`)
      continue
    }

    const existing = await prisma.charterItinerary.findFirst({
      where: { slug: itin.slug, siteId: SITE_ID },
    })

    if (existing) {
      skipped++
      results.push(`⏭ ${itin.title_en} (already exists)`)
      continue
    }

    const { destinationSlug: _destSlug2, ...itinData } = itin
    await prisma.charterItinerary.create({
      data: {
        ...itinData,
        siteId: SITE_ID,
        destinationId: destId,
      },
    })

    created++
    results.push(`✅ ${itin.title_en} (${itin.duration}d, ${itin.difficulty})`)
  }

  return NextResponse.json({
    success: true,
    action: 'itineraries',
    created,
    skipped,
    noDestination,
    total: ITINERARIES.length,
    results,
  })
}
