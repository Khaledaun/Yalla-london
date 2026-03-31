/**
 * Yacht Seed Data API
 * POST: Seed yacht data in batches
 *   action: "destinations" | "yachts" | "itineraries" | "all"
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
      return NextResponse.json({ error: 'Yacht seeding not yet implemented — coming in Batch 2' }, { status: 400 })
    }

    if (action === 'itineraries') {
      return NextResponse.json({ error: 'Itinerary seeding not yet implemented — coming in Batch 3' }, { status: 400 })
    }

    if (action === 'all') {
      const destResult = await seedDestinations()
      const destData = await destResult.json()
      return NextResponse.json({
        destinations: destData,
        yachts: { message: 'Not yet implemented' },
        itineraries: { message: 'Not yet implemented' },
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
