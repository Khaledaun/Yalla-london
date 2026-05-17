import { headers } from 'next/headers';
import { Metadata } from 'next';
import { getDefaultSiteId, getSiteConfig, isYachtSite as checkIsYachtSite } from '@/config/sites';
import { getBaseUrlForSite, getLocaleAlternates } from '@/lib/url-utils';
import { GlossaryClientPage } from './glossary-client';

// ─── Glossary Data ─────────────────────────────────────────
interface GlossaryTerm {
  term: { en: string; ar: string };
  definition: { en: string; ar: string };
}

interface GlossaryCategory {
  title: { en: string; ar: string };
  icon: string;
  terms: GlossaryTerm[];
}

const GLOSSARY_CATEGORIES: GlossaryCategory[] = [
  {
    title: { en: 'Yacht Types', ar: 'أنواع اليخوت' },
    icon: 'ship',
    terms: [
      {
        term: { en: 'Motor Yacht', ar: 'يخت بمحرك' },
        definition: {
          en: 'A power-driven yacht designed for speed and comfort. Motor yachts range from 15 to 100+ metres and offer spacious interiors, multiple decks, and amenities such as Jacuzzis, cinemas, and water toy garages. Ideal for guests who prefer covering longer distances quickly between destinations.',
          ar: 'يخت يعمل بالمحرك مصمم للسرعة والراحة. تتراوح أحجام اليخوت ذات المحرك من 15 إلى أكثر من 100 متر وتوفر مساحات داخلية واسعة وطوابق متعددة ومرافق مثل الجاكوزي والسينما ومرآب ألعاب مائية.',
        },
      },
      {
        term: { en: 'Sailing Yacht', ar: 'يخت شراعي' },
        definition: {
          en: 'A yacht propelled primarily by sails, offering an authentic seafaring experience. Sailing yachts range from classic wooden vessels to modern performance cruisers. They provide a quieter, more eco-friendly way to explore coastlines, though travel times between stops are generally longer than motor yachts.',
          ar: 'يخت يُدفع بالأشرعة بشكل رئيسي، يقدم تجربة بحرية أصيلة. تتراوح اليخوت الشراعية من السفن الخشبية الكلاسيكية إلى القوارب الحديثة عالية الأداء. توفر طريقة أكثر هدوءاً وصديقة للبيئة لاستكشاف السواحل.',
        },
      },
      {
        term: { en: 'Catamaran', ar: 'كاتاماران' },
        definition: {
          en: 'A twin-hulled vessel offering exceptional stability and spacious living areas. Catamarans are ideal for families and groups who prefer minimal rocking, generous deck space, and shallow draft access to secluded bays that larger yachts cannot reach.',
          ar: 'سفينة ذات هيكلين توفر ثباتاً استثنائياً ومساحات معيشة واسعة. الكاتاماران مثالي للعائلات والمجموعات التي تفضل الحد الأدنى من التأرجح ومساحة سطح واسعة والوصول إلى الخلجان المنعزلة.',
        },
      },
      {
        term: { en: 'Gulet', ar: 'جوليت' },
        definition: {
          en: 'A traditional Turkish wooden sailing vessel, typically 20-35 metres, with a broad beam and spacious aft deck. Gulets are popular for charter in Turkey and the Greek Islands, combining classic aesthetics with modern comforts. They are usually crewed and include full catering.',
          ar: 'سفينة شراعية خشبية تركية تقليدية، عادة 20-35 متراً، ذات عارضة واسعة وسطح خلفي فسيح. الجوليت شائعة للتأجير في تركيا والجزر اليونانية، تجمع بين الجماليات الكلاسيكية والراحة الحديثة.',
        },
      },
      {
        term: { en: 'Superyacht', ar: 'سوبر يخت' },
        definition: {
          en: 'A professionally crewed luxury yacht typically exceeding 24 metres (80 feet). Superyachts feature premium amenities, dedicated crew quarters, and bespoke services. Charter rates for superyachts start from approximately EUR 50,000 per week.',
          ar: 'يخت فاخر بطاقم محترف يتجاوز عادة 24 متراً (80 قدماً). تتميز السوبر يخوت بمرافق فاخرة وأجنحة مخصصة للطاقم وخدمات حسب الطلب. تبدأ أسعار تأجير السوبر يخوت من حوالي 50,000 يورو أسبوعياً.',
        },
      },
      {
        term: { en: 'Mega Yacht', ar: 'ميجا يخت' },
        definition: {
          en: 'An ultra-luxury vessel exceeding 50 metres, often featuring helicopter pads, submarine docks, multiple pools, and a crew of 20+. Mega yachts represent the pinnacle of maritime luxury and are available for charter at premium rates.',
          ar: 'سفينة فائقة الفخامة تتجاوز 50 متراً، غالباً ما تتميز بمنصات هليكوبتر وأرصفة غواصات وحمامات سباحة متعددة وطاقم يزيد عن 20 فرداً. تمثل الميجا يخوت قمة الفخامة البحرية.',
        },
      },
    ],
  },
  {
    title: { en: 'Charter Terms', ar: 'مصطلحات التأجير' },
    icon: 'file-text',
    terms: [
      {
        term: { en: 'Bareboat Charter', ar: 'تأجير بدون طاقم' },
        definition: {
          en: 'Renting a yacht without crew or provisions. The charterer must hold a valid sailing licence and is responsible for navigation, safety, and all onboard operations. Most common for experienced sailors chartering smaller sailing yachts or catamarans.',
          ar: 'استئجار يخت بدون طاقم أو تموين. يجب أن يحمل المستأجر رخصة إبحار سارية وهو مسؤول عن الملاحة والسلامة وجميع العمليات على متن اليخت. الأكثر شيوعاً للبحارة ذوي الخبرة.',
        },
      },
      {
        term: { en: 'Crewed Charter', ar: 'تأجير مع طاقم' },
        definition: {
          en: 'A full-service charter where the yacht comes with a professional crew including captain, chef, and steward(ess). The crew handles navigation, cooking, cleaning, and activity planning, making this the most popular option for luxury charters. Zenitha Yachts specialises in crewed charters.',
          ar: 'تأجير بخدمة كاملة حيث يأتي اليخت مع طاقم محترف يشمل القبطان والشيف والمضيف(ة). يتولى الطاقم الملاحة والطبخ والتنظيف وتخطيط الأنشطة. زينيثا يخوت متخصصة في التأجير مع طاقم.',
        },
      },
      {
        term: { en: 'APA (Advance Provisioning Allowance)', ar: 'بدل التموين المسبق' },
        definition: {
          en: 'A fund paid before the charter (typically 25-35% of the base charter fee) to cover running expenses such as food, beverages, fuel, marina fees, and shore excursions. The captain manages this fund and provides a detailed accounting at the end. Any surplus is refunded; any shortfall is settled.',
          ar: 'صندوق يُدفع قبل التأجير (عادة 25-35% من رسوم التأجير الأساسية) لتغطية النفقات التشغيلية مثل الطعام والمشروبات والوقود ورسوم المرسى والرحلات البرية. يدير القبطان هذا الصندوق ويقدم حساباً مفصلاً في النهاية.',
        },
      },
      {
        term: { en: 'MYBA Terms', ar: 'شروط MYBA' },
        definition: {
          en: 'The Mediterranean Yacht Brokers Association standard charter agreement, widely used for luxury yacht charters in the Mediterranean. MYBA terms define the contractual framework for charter parties, including payment schedules, cancellation policies, insurance requirements, and crew gratuity guidelines.',
          ar: 'اتفاقية التأجير القياسية لجمعية وسطاء اليخوت المتوسطية، تُستخدم على نطاق واسع لتأجير اليخوت الفاخرة في البحر المتوسط. تحدد شروط MYBA الإطار التعاقدي بما في ذلك جداول الدفع وسياسات الإلغاء ومتطلبات التأمين.',
        },
      },
      {
        term: { en: 'Charter Party', ar: 'عقد التأجير' },
        definition: {
          en: 'The formal contract between the yacht owner (or management company) and the charterer. It specifies the charter period, itinerary, payment terms, cancellation policy, insurance coverage, and the responsibilities of both parties.',
          ar: 'العقد الرسمي بين مالك اليخت (أو شركة الإدارة) والمستأجر. يحدد فترة التأجير والمسار وشروط الدفع وسياسة الإلغاء والتغطية التأمينية ومسؤوليات الطرفين.',
        },
      },
      {
        term: { en: 'Base Port', ar: 'ميناء الأساس' },
        definition: {
          en: 'The designated marina where the charter begins and ends. Guests board and disembark at the base port. Common base ports in the Mediterranean include Athens, Dubrovnik, Palma de Mallorca, Nice, and Bodrum.',
          ar: 'المرسى المحدد حيث يبدأ وينتهي التأجير. يصعد الضيوف ويغادرون في ميناء الأساس. تشمل موانئ الأساس الشائعة في المتوسط أثينا ودوبروفنيك وبالما دي مايوركا ونيس وبودروم.',
        },
      },
      {
        term: { en: 'One-Way Charter', ar: 'تأجير باتجاه واحد' },
        definition: {
          en: 'A charter where embarkation and disembarkation occur at different ports. This allows covering more ground but often incurs a relocation fee to return the yacht to its base port. Popular for island-hopping itineraries.',
          ar: 'تأجير حيث يكون الصعود والنزول في موانئ مختلفة. يسمح هذا بتغطية مسافة أكبر لكنه غالباً ما يتحمل رسوم إعادة تموضع لإعادة اليخت إلى ميناء أساسه.',
        },
      },
    ],
  },
  {
    title: { en: 'Pricing & Finance', ar: 'التسعير والتمويل' },
    icon: 'banknote',
    terms: [
      {
        term: { en: 'Charter Fee', ar: 'رسوم التأجير' },
        definition: {
          en: 'The base cost of renting the yacht for a specified period, typically quoted per week. This covers the yacht itself and crew wages. It does not include APA, fuel surcharges, or VAT (which varies by country — typically 0-13% in the Mediterranean).',
          ar: 'التكلفة الأساسية لاستئجار اليخت لفترة محددة، عادةً تُعرض أسبوعياً. تغطي اليخت نفسه وأجور الطاقم. لا تشمل بدل التموين أو رسوم الوقود الإضافية أو ضريبة القيمة المضافة.',
        },
      },
      {
        term: { en: 'Crew Gratuity', ar: 'إكرامية الطاقم' },
        definition: {
          en: 'A customary tip for the yacht crew, typically 10-20% of the base charter fee. While not mandatory, it is standard practice in the yachting industry and reflects the quality of service received. The gratuity is usually given to the captain who distributes it among the crew.',
          ar: 'إكرامية عرفية لطاقم اليخت، عادة 10-20% من رسوم التأجير الأساسية. رغم أنها ليست إلزامية، إلا أنها ممارسة معتادة في صناعة اليخوت وتعكس جودة الخدمة المقدمة.',
        },
      },
      {
        term: { en: 'Delivery Fee', ar: 'رسوم التسليم' },
        definition: {
          en: 'An additional charge when the yacht must be repositioned from its current location to the charterer\'s desired base port. Covers fuel, crew wages, and time during the delivery voyage. Can be avoided by choosing a yacht already based in your desired region.',
          ar: 'رسوم إضافية عندما يجب إعادة تموضع اليخت من موقعه الحالي إلى ميناء الأساس المطلوب. تغطي الوقود وأجور الطاقم والوقت خلال رحلة التسليم. يمكن تجنبها باختيار يخت متمركز أصلاً في منطقتك.',
        },
      },
      {
        term: { en: 'Security Deposit', ar: 'تأمين الضمان' },
        definition: {
          en: 'A refundable deposit held during the charter to cover potential damages, typically EUR 2,000-10,000 depending on yacht size. Returned in full after the charter if no damage occurs. Can often be replaced by purchasing damage waiver insurance.',
          ar: 'تأمين قابل للاسترداد يُحتفظ به أثناء التأجير لتغطية الأضرار المحتملة، عادةً 2,000-10,000 يورو حسب حجم اليخت. يُعاد بالكامل بعد التأجير إذا لم تحدث أضرار.',
        },
      },
    ],
  },
  {
    title: { en: 'Navigation & Routes', ar: 'الملاحة والمسارات' },
    icon: 'compass',
    terms: [
      {
        term: { en: 'Itinerary', ar: 'مسار الرحلة' },
        definition: {
          en: 'The planned route and schedule for your charter, including ports of call, anchorages, and activities at each stop. Itineraries are flexible and can be adjusted by the captain based on weather, sea conditions, and guest preferences.',
          ar: 'المسار المخطط والجدول الزمني لرحلتك، بما في ذلك موانئ التوقف والمراسي والأنشطة في كل محطة. المسارات مرنة ويمكن للقبطان تعديلها بناءً على الطقس وظروف البحر وتفضيلات الضيوف.',
        },
      },
      {
        term: { en: 'Anchorage', ar: 'مرسى' },
        definition: {
          en: 'A sheltered area where the yacht drops anchor, typically in a bay or cove. Anchorages provide calm waters for swimming, water sports, and dining al fresco. The captain selects anchorages based on weather protection, seabed quality, and proximity to shore attractions.',
          ar: 'منطقة محمية حيث يُلقي اليخت مرساته، عادةً في خليج أو خور. توفر المراسي مياهاً هادئة للسباحة والرياضات المائية وتناول الطعام في الهواء الطلق.',
        },
      },
      {
        term: { en: 'Nautical Mile', ar: 'ميل بحري' },
        definition: {
          en: 'The standard unit of distance at sea, equal to 1.852 kilometres (1.151 statute miles). A yacht cruising at 10 knots covers 10 nautical miles per hour. Understanding nautical miles helps gauge travel times between destinations on your itinerary.',
          ar: 'وحدة المسافة القياسية في البحر، تساوي 1.852 كيلومتراً. يخت يبحر بسرعة 10 عقد يقطع 10 أميال بحرية في الساعة. فهم الأميال البحرية يساعد في تقدير أوقات السفر بين الوجهات.',
        },
      },
      {
        term: { en: 'Knot', ar: 'عقدة' },
        definition: {
          en: 'A unit of speed equal to one nautical mile per hour (1.852 km/h). Motor yachts typically cruise at 10-20 knots, while sailing yachts average 6-10 knots. A yacht at 12 knots covers roughly 22 km per hour.',
          ar: 'وحدة سرعة تساوي ميلاً بحرياً واحداً في الساعة (1.852 كم/ساعة). تبحر اليخوت ذات المحرك عادةً بسرعة 10-20 عقدة، بينما يبلغ متوسط اليخوت الشراعية 6-10 عقد.',
        },
      },
      {
        term: { en: 'Draft / Draught', ar: 'غاطس' },
        definition: {
          en: 'The depth of water a yacht needs to float safely, measured from the waterline to the lowest point of the hull. Shallow-draft vessels (under 2m) can access secluded bays and beach anchorages that deep-draft yachts cannot reach.',
          ar: 'عمق المياه الذي يحتاجه اليخت للطفو بأمان، يُقاس من خط المياه إلى أدنى نقطة في الهيكل. السفن ذات الغاطس الضحل (أقل من 2م) يمكنها الوصول إلى الخلجان المنعزلة.',
        },
      },
      {
        term: { en: 'Cabotage', ar: 'كابوتاج' },
        definition: {
          en: 'Maritime regulations governing navigation within a country\'s territorial waters. Some countries (notably Greece and Turkey) restrict foreign-flagged yachts from certain domestic routes. Your captain and charter company manage cabotage compliance.',
          ar: 'لوائح بحرية تحكم الملاحة داخل المياه الإقليمية لبلد ما. بعض البلدان (خاصة اليونان وتركيا) تقيد اليخوت ذات الأعلام الأجنبية من بعض المسارات المحلية. يتولى قبطانك وشركة التأجير الامتثال.',
        },
      },
    ],
  },
  {
    title: { en: 'Crew & Service', ar: 'الطاقم والخدمة' },
    icon: 'users',
    terms: [
      {
        term: { en: 'Captain', ar: 'القبطان' },
        definition: {
          en: 'The licensed professional responsible for the safe operation of the yacht, navigation, and overall guest experience. The captain plans daily routes, selects anchorages, monitors weather, and coordinates crew duties. On charter yachts, the captain also acts as a local guide with extensive knowledge of the cruising area.',
          ar: 'المحترف المرخص المسؤول عن التشغيل الآمن لليخت والملاحة وتجربة الضيوف الشاملة. يخطط القبطان المسارات اليومية ويختار المراسي ويراقب الطقس وينسق مهام الطاقم. في اليخوت المؤجرة، يعمل القبطان أيضاً كمرشد محلي.',
        },
      },
      {
        term: { en: 'Chef', ar: 'الشيف' },
        definition: {
          en: 'The onboard chef prepares all meals tailored to guest preferences, dietary requirements, and cultural needs. For Zenitha Yachts charters, chefs are experienced in halal cuisine and Mediterranean cooking. Guests complete a preference form before boarding covering allergies, dislikes, and favourite cuisines.',
          ar: 'يُعد الشيف على متن اليخت جميع الوجبات حسب تفضيلات الضيوف ومتطلباتهم الغذائية واحتياجاتهم الثقافية. في رحلات زينيثا يخوت، الشيف ذو خبرة في المطبخ الحلال والمتوسطي.',
        },
      },
      {
        term: { en: 'Steward / Stewardess', ar: 'المضيف / المضيفة' },
        definition: {
          en: 'Crew members responsible for interior service: cabin maintenance, table service, bar duties, and guest comfort. On larger yachts, the chief stewardess manages a team and coordinates with the chef on dining presentation and event planning.',
          ar: 'أفراد الطاقم المسؤولون عن الخدمة الداخلية: صيانة الكبائن وخدمة الطاولة وواجبات البار وراحة الضيوف. في اليخوت الأكبر، تدير رئيسة المضيفات فريقاً وتنسق مع الشيف.',
        },
      },
      {
        term: { en: 'Provisioning', ar: 'التموين' },
        definition: {
          en: 'The process of stocking the yacht with food, beverages, and supplies before the charter. Guests complete a provisioning list specifying their preferences. For halal charters, provisioning includes sourcing certified halal meat and ingredients from approved suppliers.',
          ar: 'عملية تزويد اليخت بالطعام والمشروبات والإمدادات قبل التأجير. يملأ الضيوف قائمة تموين تحدد تفضيلاتهم. للرحلات الحلال، يشمل التموين توفير لحوم ومكونات حلال معتمدة.',
        },
      },
      {
        term: { en: 'Water Toys', ar: 'ألعاب مائية' },
        definition: {
          en: 'Recreational equipment carried on the yacht for guest use, including jet skis, paddleboards, kayaks, snorkelling gear, water skis, wakeboards, inflatable slides, and seabobs. Larger yachts may carry diving compressors, sailboats, or even mini-submarines.',
          ar: 'معدات ترفيهية محمولة على اليخت لاستخدام الضيوف، تشمل الجت سكي ولوح التجديف والكاياك ومعدات الغطس والتزلج المائي والألواح والزحاليق القابلة للنفخ.',
        },
      },
    ],
  },
];

// ─── Metadata ──────────────────────────────────────────────
export async function generateMetadata(): Promise<Metadata> {
  const hdrs = await headers();
  const siteId = hdrs.get('x-site-id') || getDefaultSiteId();
  const baseUrl = getBaseUrlForSite(siteId);

  const config = getSiteConfig(siteId);
  const brandName = config?.name || 'Yalla London';

  return {
    title: `Yacht Charter Glossary | ${brandName}`,
    description:
      'A comprehensive bilingual glossary of yacht charter terminology. Learn about yacht types, charter terms, pricing, navigation, and crew roles in English and Arabic.',
    alternates: await getLocaleAlternates('/glossary'),
    openGraph: {
      title: `Yacht Charter Glossary | ${brandName}`,
      description: 'Master yacht charter terminology in English and Arabic.',
      url: `${baseUrl}/glossary`,
      type: 'website',
    },
  };
}

// ─── Page ──────────────────────────────────────────────────
export default async function GlossaryPage() {
  const hdrs = await headers();
  const siteId = hdrs.get('x-site-id') || getDefaultSiteId();
  const locale = (hdrs.get('x-locale') || 'en') as 'en' | 'ar';
  const config = getSiteConfig(siteId);
  const baseUrl = getBaseUrlForSite(siteId);
  const isYacht = checkIsYachtSite(siteId);

  // JSON-LD: DefinedTermSet
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTermSet',
    name: 'Yacht Charter Glossary',
    description: 'Bilingual glossary of yacht charter terminology',
    url: `${baseUrl}/glossary`,
    inLanguage: ['en', 'ar'],
    hasDefinedTerm: GLOSSARY_CATEGORIES.flatMap((cat) =>
      cat.terms.map((t) => ({
        '@type': 'DefinedTerm',
        name: t.term.en,
        description: t.definition.en,
        inDefinedTermSet: `${baseUrl}/glossary`,
      }))
    ),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <GlossaryClientPage
        categories={GLOSSARY_CATEGORIES}
        siteName={config?.name || 'Zenitha Yachts'}
        siteId={siteId}
        isYachtSite={isYacht}
        serverLocale={locale}
        baseUrl={baseUrl}
      />
    </>
  );
}
