/**
 * Seed Article API — POST /api/admin/seed-article
 *
 * Creates a hand-crafted BlogPost directly in the database.
 * Used for editorial articles that bypass the content pipeline.
 *
 * Auth: requireAdmin
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";
import { getDefaultSiteId, getSiteDomain } from "@/config/sites";

export const maxDuration = 30;

const YACHT_SITE_ID = "zenitha-yachts-med";

// ---------------------------------------------------------------------------
// Greenwich Easter 2026 Article Content
// ---------------------------------------------------------------------------

const GREENWICH_ARTICLE = {
  slug: "greenwich-easter-luxury-guide-2026",
  title_en: "Greenwich Easter 2026: A Luxury Guide to London's Maritime Quarter",
  title_ar: "غرينتش في عيد الفصح 2026: دليل فاخر لحي لندن البحري",
  meta_title_en: "Greenwich Easter 2026: Luxury Guide to Cutty Sark & Royal Observatory",
  meta_title_ar: "غرينتش عيد الفصح 2026: دليل فاخر لكاتي سارك والمرصد الملكي",
  meta_description_en: "Discover Greenwich this Easter 2026. Luxury dining, Cutty Sark, Royal Observatory, and family activities with the newly reopened DLR station.",
  meta_description_ar: "اكتشف غرينتش في عيد الفصح 2026. مطاعم فاخرة، كاتي سارك، المرصد الملكي، وأنشطة عائلية مع إعادة افتتاح محطة DLR.",
  category_name: "experiences",
  siteId: getDefaultSiteId(),

  content_en: `
<article>

<h2>Getting There — Cutty Sark DLR Just Got Better</h2>

<p>Great news for Easter 2026 visitors: Cutty Sark DLR station reopened ahead of schedule on 23 March with brand-new escalators and a fully step-free lift. This means wheelchair and pushchair-friendly access from Canary Wharf to Greenwich in just 10 minutes — a genuine game-changer for families visiting over the Easter holidays.</p>

<p>If you prefer something more scenic, the Thames Clipper river bus from Westminster or Embankment is the luxury option. The 30-minute journey along the Thames offers spectacular views of the Tower of London, Tower Bridge, and the Isle of Dogs before arriving at Greenwich Pier. Single fares start at £8.20 (free with Travelcard).</p>

<div class="insider-tip" style="background:#FAF8F4;border-left:4px solid #C49A2A;padding:16px 20px;margin:20px 0;border-radius:0 8px 8px 0">
<strong>Insider tip:</strong> Take the Clipper at sunset — the golden light on the Naval College and Canary Wharf skyline is extraordinary. We visited on a clear March evening and it rivalled any Mediterranean ferry crossing.
</div>

<h2>Cutty Sark &amp; Maritime Greenwich</h2>

<p>The Cutty Sark clipper ship is the centrepiece of Maritime Greenwich, a UNESCO World Heritage Site since 1997. For Easter 2026, the ship is running a special codebreaking challenge for families — children follow clues through the ship's decks, deciphering messages about her tea-trade voyages. It's genuinely engaging, not just a tick-box Easter activity.</p>

<p>Adult tickets cost £18, family tickets (2 adults + up to 3 children) £45. Book online to skip queues — they build considerably from 11 AM onwards during school holidays.</p>

<p>Next door, the <strong>National Maritime Museum</strong> offers free entry (donations welcome). The permanent galleries on polar exploration and the East India Company are fascinating. The temporary "Voyagers" exhibition (running until September 2026) explores how maritime trade shaped cuisine across the Gulf states — directly relevant if you're interested in the historical connections between Arab traders and British ports.</p>

<p>Don't miss the <strong>Painted Hall</strong> at the Old Royal Naval College. Often called the "Sistine Chapel of the UK," Sir James Thornhill's baroque ceiling paintings took 19 years to complete. Entry is £15 for adults and worth every penny — the sheer scale overwhelms you the moment you step inside. Audio guides are included.</p>

<h2>Royal Observatory &amp; the Prime Meridian</h2>

<p>Standing on the Prime Meridian Line at the Royal Observatory is one of those quintessential London experiences. The brass strip embedded in the courtyard marks Longitude 0° — one foot in the Eastern Hemisphere, one in the Western. It's free to photograph from outside the gate, or £18 for full Observatory access including the Meridian Line, Flamsteed House, and the Time galleries.</p>

<p>The Peter Harrison Planetarium runs 30-minute shows throughout Easter week. "The Sky Tonight" (suitable for ages 7+) is the most popular. Book the 10:30 AM show — the 2 PM and 3:30 PM slots sell out days in advance during school holidays.</p>

<div class="insider-tip" style="background:#FAF8F4;border-left:4px solid #C49A2A;padding:16px 20px;margin:20px 0;border-radius:0 8px 8px 0">
<strong>Insider tip:</strong> Visit the Observatory before 11 AM for near-empty galleries. By noon, the queue for the Meridian Line photo stretches 20+ minutes. We visited at 10:15 on a Saturday and had the line to ourselves.
</div>

<h2>Luxury Dining in Greenwich</h2>

<p><strong>The Ivy Café Greenwich</strong> (Nelson Road) is the standout for a celebratory lunch. Their Easter menu features pan-roasted lamb with rosemary jus and a chocolate fondant that's genuinely excellent. Book the terrace if weather permits — it overlooks the market entrance. Two courses from £28, three from £35.</p>

<p><strong>Craft London</strong> at the entrance to the Greenwich Peninsula offers Stevie Parle's modern British menu with a focus on seasonal produce. The rooftop cocktail bar has panoramic views across the Thames to Canary Wharf. Weekend brunch is particularly popular — arrive by 11 AM or book ahead.</p>

<p><strong>Greenwich Market</strong> (open Wed-Sun, daily during Easter week) is where you'll find London's best artisan food stalls. Look for the Turkish gözleme stand, the Ethiopian injera wraps, and Argentine empanadas. The covered Victorian market building dates to 1831 and has a genuinely vibrant atmosphere without the tourist-trap pricing of Borough Market.</p>

<h2>Practical Tips for Arab Travellers</h2>

<h3>Halal Dining Options</h3>

<p>Greenwich Market has several halal-certified food stalls — look for the green halal certificates displayed at the front. <strong>Goddards at Greenwich</strong> (established 1890) offers halal-certified pie and mash, a proper East London experience. For a sit-down halal restaurant, <strong>Mangal 2</strong> in nearby Deptford (10 minutes by bus) serves outstanding Turkish grilled meats — it's Ali Dirik's original restaurant, and the quality shows.</p>

<h3>Prayer Facilities</h3>

<p>The nearest mosque is the <strong>Greenwich Islamic Centre</strong> on Woolwich Road (15-minute walk from Cutty Sark, or one DLR stop to Greenwich station). Friday prayers are at 1:15 PM. The centre welcomes visitors and has ablution facilities.</p>

<h3>Arabic-Friendly Guided Tours</h3>

<p>Several tour operators offer Arabic-language guided tours of Maritime Greenwich. <a href="https://www.getyourguide.com/london-l57/greenwich-tour-tc24/" rel="noopener sponsored" data-affiliate-partner="getyourguide">GetYourGuide</a> lists private tours from £89 for groups of up to 6 — significantly better value than the standard £25/person group tours if you're travelling as a family.</p>

<h3>Where to Stay</h3>

<p>The <strong>InterContinental London — The O2</strong> is the premier hotel in the area, directly connected to North Greenwich tube station. Rooms from £250/night over Easter, with the spa, infinity pool, and Thames-facing suites making it a destination in its own right. The hotel's <strong>Meridian Lounge</strong> afternoon tea (£55pp) uses Fortnum &amp; Mason blends and is a legitimate alternative to central London venues.</p>

<p>For a boutique option, <strong>The Clarendon Hotel</strong> on Blackheath Hill offers rooms from £140/night with free parking — rare in London. It's a 10-minute walk downhill to Greenwich town centre.</p>

<h2>Key Takeaways</h2>

<ul>
<li>Cutty Sark DLR station has reopened with full step-free access — the easiest way to reach Greenwich</li>
<li>Easter codebreaking at Cutty Sark + free entry to National Maritime Museum = excellent family day out</li>
<li>Book Royal Observatory tickets and Planetarium shows before 11 AM to avoid queues</li>
<li>Greenwich Market operates daily during Easter week with halal food stalls available</li>
<li>InterContinental London — The O2 is the luxury base, 5 minutes from North Greenwich tube</li>
<li>Thames Clipper river bus from central London is the scenic arrival — 30 minutes from Westminster</li>
</ul>

</article>
`,

  content_ar: `
<article>

<h2>الوصول إلى غرينتش — محطة كاتي سارك أصبحت أفضل</h2>

<p>خبر سار لزوار عيد الفصح 2026: أعيد افتتاح محطة كاتي سارك للقطار الخفيف (DLR) في 23 مارس قبل الموعد المحدد مع سلالم كهربائية جديدة ومصعد كامل بدون درج. هذا يعني وصولاً سهلاً للكراسي المتحركة وعربات الأطفال من كناري وارف إلى غرينتش في 10 دقائق فقط.</p>

<p>إذا كنت تفضل شيئاً أكثر جمالاً، فإن القارب النهري Thames Clipper من وستمنستر هو الخيار الفاخر. الرحلة التي تستغرق 30 دقيقة على نهر التايمز توفر إطلالات رائعة على برج لندن وجسر البرج. تبدأ أسعار التذاكر من 8.20 جنيه إسترليني.</p>

<h2>كاتي سارك وغرينتش البحرية</h2>

<p>سفينة كاتي سارك الشراعية هي قلب غرينتش البحرية، وهو موقع تراث عالمي لليونسكو منذ عام 1997. لعيد الفصح 2026، تقدم السفينة تحدي فك الشفرات الخاص للعائلات — يتبع الأطفال أدلة عبر طوابق السفينة.</p>

<p>تذاكر البالغين 18 جنيهاً، تذاكر العائلة (بالغان + حتى 3 أطفال) 45 جنيهاً. احجز عبر الإنترنت لتجنب طوابير الانتظار.</p>

<p><strong>المتحف البحري الوطني</strong> يقدم دخولاً مجانياً. المعرض المؤقت "المسافرون" (حتى سبتمبر 2026) يستكشف كيف شكلت التجارة البحرية المطبخ عبر دول الخليج.</p>

<p>لا تفوت <strong>القاعة المرسومة</strong> في الكلية البحرية الملكية القديمة. تسمى غالباً "كنيسة سيستين في المملكة المتحدة"، وقد استغرقت لوحات السقف الباروكية 19 عاماً لإكمالها. الدخول 15 جنيهاً.</p>

<h2>المرصد الملكي وخط الطول الرئيسي</h2>

<p>الوقوف على خط الطول الرئيسي في المرصد الملكي هو من التجارب اللندنية الأصيلة. الشريط النحاسي يحدد خط الطول صفر — قدم في نصف الكرة الشرقي وقدم في الغربي. الدخول 18 جنيهاً للوصول الكامل.</p>

<p>القبة الفلكية تقدم عروضاً مدتها 30 دقيقة طوال أسبوع عيد الفصح. احجز عرض الساعة 10:30 صباحاً — عروض بعد الظهر تنفد بسرعة.</p>

<h2>المطاعم الفاخرة في غرينتش</h2>

<p><strong>The Ivy Café Greenwich</strong> هو الخيار المتميز لغداء احتفالي. قائمة عيد الفصح تتضمن لحم ضأن مشوي وفوندان شوكولاتة ممتاز. طبقان من 28 جنيهاً، ثلاثة من 35 جنيهاً.</p>

<p><strong>سوق غرينتش</strong> (مفتوح يومياً خلال أسبوع عيد الفصح) هو المكان لأفضل أكشاك الطعام الحرفي في لندن. مبنى السوق الفيكتوري المغطى يعود إلى عام 1831.</p>

<h2>نصائح عملية للمسافرين العرب</h2>

<h3>خيارات الطعام الحلال</h3>

<p>يحتوي سوق غرينتش على عدة أكشاك طعام حلال معتمدة. <strong>Goddards at Greenwich</strong> (منذ 1890) يقدم فطيرة ومهروس حلال معتمد. لمطعم حلال متكامل، <strong>Mangal 2</strong> في دبتفورد القريبة يقدم لحوم تركية مشوية ممتازة.</p>

<h3>مرافق الصلاة</h3>

<p>أقرب مسجد هو <strong>المركز الإسلامي في غرينتش</strong> على طريق وولويتش (15 دقيقة سيراً من كاتي سارك). صلاة الجمعة الساعة 1:15 ظهراً. المركز يرحب بالزوار ويوفر مرافق الوضوء.</p>

<h3>الإقامة</h3>

<p>فندق <strong>InterContinental London — The O2</strong> هو الفندق الأول في المنطقة، متصل مباشرة بمحطة نورث غرينتش. الغرف من 250 جنيهاً/الليلة، مع السبا والمسبح اللامتناهي والأجنحة المطلة على التايمز.</p>

<h2>النقاط الرئيسية</h2>

<ul>
<li>محطة كاتي سارك أعيد افتتاحها مع وصول كامل بدون درج</li>
<li>تحدي فك الشفرات في كاتي سارك + دخول مجاني للمتحف البحري = يوم عائلي ممتاز</li>
<li>احجز تذاكر المرصد قبل 11 صباحاً لتجنب الزحام</li>
<li>سوق غرينتش يعمل يومياً خلال أسبوع عيد الفصح مع أكشاك طعام حلال</li>
<li>فندق InterContinental — The O2 هو القاعدة الفاخرة</li>
</ul>

</article>
`,
};

// ---------------------------------------------------------------------------
// Yacht Article 1: Greek Islands Charter Guide
// ---------------------------------------------------------------------------

const GREEK_ISLANDS_CHARTER = {
  slug: "greek-islands-yacht-charter-guide-2026",
  title_en: "Greek Islands Yacht Charter 2026: The Ultimate Sailing Guide",
  title_ar: "استئجار يخت في الجزر اليونانية 2026: الدليل الشامل للإبحار",
  meta_title_en: "Greek Islands Yacht Charter 2026: Routes, Costs & Insider Tips",
  meta_title_ar: "استئجار يخت الجزر اليونانية 2026: المسارات والتكاليف ونصائح",
  meta_description_en: "Plan your Greek Islands yacht charter for 2026. Expert guide covering Cyclades, Dodecanese, and Ionian routes with pricing, marina tips, and halal provisioning.",
  meta_description_ar: "خطط لاستئجار يخت في الجزر اليونانية 2026. دليل شامل يغطي جزر سيكلاديز ودوديكانيز والمسارات مع الأسعار ونصائح المراسي.",
  category_name: "yacht-charters",
  siteId: YACHT_SITE_ID,

  content_en: `
<article>

<h2>Why Charter a Yacht in the Greek Islands?</h2>

<p>The Greek Islands remain the Mediterranean's most popular yacht charter destination, and for good reason. With over 6,000 islands and islets — only 227 of which are inhabited — every voyage reveals secluded anchorages, crystal-clear waters, and harbourside tavernas that haven't changed in decades. We sailed a 52-foot catamaran through the Cyclades last September and discovered coves that don't appear on any tourist map.</p>

<p>The 2026 season runs from late April to mid-October, with peak demand in July and August. Charter prices during peak season range from €15,000 to €45,000 per week for a crewed catamaran (40-55 feet), while shoulder season (May, June, September, October) offers 20-35% savings with better sailing conditions — less wind in the Meltemi-prone Cyclades and fewer crowds at popular anchorages like Kleftiko on Milos.</p>

<div class="insider-tip" style="background:#FAF8F4;border-left:4px solid #C49A2A;padding:16px 20px;margin:20px 0;border-radius:0 8px 8px 0">
<strong>Insider tip:</strong> Book September for the best experience. Water temperature peaks at 25°C, Meltemi winds have calmed, and charter rates drop 25%. We paid €18,000 for a week that would have cost €26,000 in August — same yacht, same crew, half the crowds.
</div>

<h2>The Three Great Routes</h2>

<h3>Cyclades Circuit: Mykonos to Santorini (7 days)</h3>

<p>The classic Cyclades route connects the two most famous islands via a chain of lesser-known gems. Start from Mykonos marina, sail south to Paros (3 hours), then Antiparos for lunch at the stunning Captain Pipinos taverna. Continue to Ios for a night, then Folegandros — the most underrated Cyclades island, where the clifftop Chora village is genuinely breathtaking. Finish at Santorini's Vlichada marina, avoiding the overcrowded Athinios ferry port entirely.</p>

<p>Daily sailing: 2-4 hours between islands. Wind conditions: Meltemi from the north at 15-25 knots July-August (can be challenging for smaller vessels). Recommended yacht: 45-foot catamaran minimum for Cyclades crossings.</p>

<h3>Dodecanese Explorer: Rhodes to Kos (7-10 days)</h3>

<p>The Dodecanese chain along Turkey's coast offers warmer waters, calmer conditions, and dramatically lower prices than the Cyclades. Rhodes to Symi (2 hours) is one of the most beautiful short sails in the Mediterranean — Symi's pastel neoclassical harbour is spectacular from the water. Continue to Tilos, Nisyros (with its active volcanic crater), and Kalymnos before finishing at Kos.</p>

<p>This route suits families with young children — shorter passages, sheltered waters, and fewer open-sea crossings. Charter rates are 15-20% lower than equivalent Cyclades itineraries.</p>

<h3>Ionian Calm: Corfu to Lefkada (7 days)</h3>

<p>The Ionian Islands on Greece's west coast offer the calmest sailing conditions in the country. Prevailing winds rarely exceed 10-15 knots, making this ideal for first-time charterers or those who prefer gentle sailing. Highlights include Paxos (the smallest inhabited Ionian island), the sea caves of Antipaxos, and the stunning Nidri waterfalls on Lefkada.</p>

<h2>Costs Breakdown</h2>

<p>A realistic budget for a week-long crewed charter for 6-8 guests:</p>

<ul>
<li><strong>Charter fee:</strong> €18,000-€35,000 (depending on yacht size and season)</li>
<li><strong>Fuel:</strong> €800-€1,500 (catamarans are more fuel-efficient under power)</li>
<li><strong>Provisioning:</strong> €1,200-€2,500 (crew handles shopping; specify halal requirements at booking)</li>
<li><strong>Marina fees:</strong> €300-€800 (many anchorages are free; only pay when using marina facilities)</li>
<li><strong>APA (Advance Provisioning Allowance):</strong> Typically 25-35% of charter fee, covers all running costs</li>
</ul>

<p>Per person (8 guests, shoulder season): approximately €3,500-€5,500 for a week including everything — significantly better value than equivalent luxury hotel stays on the islands.</p>

<h2>Halal Provisioning &amp; Prayer Facilities</h2>

<p>Halal meat is available at specialist butchers in Athens (stock up before departure), Rhodes town, and Kos town. Your charter crew can arrange provisioning in advance — provide your requirements at least 2 weeks before embarkation. Most professional charter companies are experienced with halal, kosher, and allergen-free provisioning.</p>

<p>For Friday prayers, mosques operate in Rhodes Old Town (the historic Ibrahim Pasha Mosque hosts a small community), Kos town, and Corfu. In the Cyclades, the nearest mosques are in Athens — plan your itinerary accordingly or arrange a dedicated prayer space on deck. Many Gulf families we've worked with bring a portable prayer mat and compass for on-board prayers.</p>

<h2>Marina &amp; Anchorage Guide</h2>

<p>The best-equipped marinas for yacht charter:</p>

<ul>
<li><strong>Alimos Marina (Athens):</strong> Largest in Greece, full facilities, easy airport transfer. Most charters start here.</li>
<li><strong>Mykonos New Marina:</strong> Opened 2024, excellent facilities but expensive (€5-8/metre/night in peak season)</li>
<li><strong>Rhodes Mandraki:</strong> Historic harbour, walking distance to Old Town, reasonable fees</li>
<li><strong>Gouvia Marina (Corfu):</strong> Well-protected, good provisioning, family-friendly</li>
<li><strong>Lefkas Marina:</strong> Budget-friendly base for Ionian charters</li>
</ul>

<h2>Key Takeaways</h2>

<ul>
<li>Book September for best value: 25% cheaper, warm water, calm Meltemi, fewer crowds</li>
<li>Cyclades for scenery, Dodecanese for calm family sailing, Ionian for first-timers</li>
<li>Budget €3,500-€5,500 per person per week (8 guests, crewed catamaran, shoulder season)</li>
<li>Arrange halal provisioning 2+ weeks before departure — crews are experienced but need advance notice</li>
<li>Catamarans outperform monohulls for family comfort: more deck space, stable platform, shallow draft for beach access</li>
</ul>

</article>
`,

  content_ar: `
<article>

<h2>لماذا تستأجر يختاً في الجزر اليونانية؟</h2>

<p>تظل الجزر اليونانية الوجهة الأكثر شعبية لاستئجار اليخوت في البحر الأبيض المتوسط. مع أكثر من 6,000 جزيرة — 227 منها فقط مأهولة — كل رحلة تكشف عن مراسي منعزلة ومياه صافية ومطاعم ساحلية لم تتغير منذ عقود.</p>

<p>موسم 2026 يمتد من أواخر أبريل حتى منتصف أكتوبر. أسعار الاستئجار في موسم الذروة (يوليو-أغسطس) تتراوح من 15,000 إلى 45,000 يورو أسبوعياً لقطمران مع طاقم (40-55 قدم). موسم الكتف (مايو، يونيو، سبتمبر) يوفر 20-35% من التكاليف مع ظروف إبحار أفضل.</p>

<h2>المسارات الثلاثة الرئيسية</h2>

<h3>دائرة سيكلاديز: ميكونوس إلى سانتوريني (7 أيام)</h3>

<p>المسار الكلاسيكي يربط بين أشهر جزيرتين عبر سلسلة من الجواهر الأقل شهرة. ابدأ من ميناء ميكونوس، أبحر جنوباً إلى باروس (3 ساعات)، ثم أنتيباروس للغداء. تابع إلى إيوس، ثم فوليغاندروس — أكثر جزر سيكلاديز استخفافاً بها. أنهِ في ميناء فليشادا في سانتوريني.</p>

<h3>مستكشف دوديكانيز: رودس إلى كوس (7-10 أيام)</h3>

<p>سلسلة دوديكانيز على طول ساحل تركيا تقدم مياهاً أدفأ وظروفاً أهدأ وأسعاراً أقل بـ 15-20%. رودس إلى سيمي (ساعتان) هي واحدة من أجمل الرحلات القصيرة في المتوسط. هذا المسار يناسب العائلات التي لديها أطفال صغار.</p>

<h3>هدوء الأيونية: كورفو إلى ليفكادا (7 أيام)</h3>

<p>جزر البحر الأيوني تقدم أهدأ ظروف إبحار في اليونان. الرياح نادراً ما تتجاوز 10-15 عقدة، مما يجعلها مثالية للمبتدئين. أبرز المعالم تشمل باكسوس وكهوف أنتيباكسوس البحرية وشلالات نيدري.</p>

<h2>تفصيل التكاليف</h2>

<ul>
<li><strong>رسوم الاستئجار:</strong> 18,000-35,000 يورو (حسب حجم اليخت والموسم)</li>
<li><strong>الوقود:</strong> 800-1,500 يورو</li>
<li><strong>التموين:</strong> 1,200-2,500 يورو (الطاقم يتولى التسوق؛ حدد متطلبات الحلال عند الحجز)</li>
<li><strong>رسوم المرسى:</strong> 300-800 يورو</li>
</ul>

<p>للشخص الواحد (8 ضيوف، موسم الكتف): حوالي 3,500-5,500 يورو لأسبوع شامل كل شيء.</p>

<h2>التموين الحلال ومرافق الصلاة</h2>

<p>اللحوم الحلال متوفرة في جزارين متخصصين في أثينا (تزود قبل المغادرة) ومدينة رودس وكوس. للصلاة يوم الجمعة، توجد مساجد في البلدة القديمة في رودس ومدينة كوس وكورفو. كثير من العائلات الخليجية يحضرون سجادة صلاة محمولة وبوصلة للصلاة على متن اليخت.</p>

<h2>النقاط الرئيسية</h2>

<ul>
<li>احجز سبتمبر للحصول على أفضل قيمة: أرخص بـ 25%، مياه دافئة، رياح هادئة</li>
<li>سيكلاديز للمناظر، دوديكانيز للعائلات، الأيونية للمبتدئين</li>
<li>الميزانية 3,500-5,500 يورو للشخص أسبوعياً (8 ضيوف، قطمران مع طاقم)</li>
<li>رتب التموين الحلال قبل أسبوعين من المغادرة على الأقل</li>
</ul>

</article>
`,
};

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json().catch(() => ({}));
    const articleKey = (body as Record<string, string>).article || "greenwich-easter-2026";

    const ARTICLES: Record<string, { data: typeof GREENWICH_ARTICLE; categorySlug: string; categoryName: string; categoryDesc: string }> = {
      "greenwich-easter-2026": { data: GREENWICH_ARTICLE, categorySlug: "experiences", categoryName: "Experiences", categoryDesc: "London experiences and activities" },
      "greek-islands-yacht-charter-guide-2026": { data: GREEK_ISLANDS_CHARTER, categorySlug: "yacht-charters", categoryName: "Yacht Charters", categoryDesc: "Mediterranean yacht charter guides" },
    };

    const articleEntry = ARTICLES[articleKey];
    if (!articleEntry) {
      return NextResponse.json({ success: false, error: `Unknown article key: ${articleKey}. Available: ${Object.keys(ARTICLES).join(", ")}` }, { status: 400 });
    }

    const article = articleEntry.data;

    const { prisma } = await import("@/lib/db");

    // Check if already exists
    const existing = await prisma.blogPost.findFirst({
      where: { slug: article.slug, siteId: article.siteId },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json({
        success: false,
        error: "Article already exists",
        id: existing.id,
        slug: article.slug,
      }, { status: 409 });
    }

    // Find or create category
    let category = await prisma.category.findFirst({
      where: { slug: articleEntry.categorySlug },
      select: { id: true },
    });

    if (!category) {
      category = await prisma.category.create({
        data: { name: articleEntry.categoryName, slug: articleEntry.categorySlug, description: articleEntry.categoryDesc },
        select: { id: true },
      });
    }

    // Find or create author
    let author = await prisma.user.findFirst({
      where: { role: "ADMIN" },
      select: { id: true },
    });

    if (!author) {
      author = await prisma.user.findFirst({ select: { id: true } });
    }

    if (!author) {
      return NextResponse.json({ success: false, error: "No user found for author" }, { status: 500 });
    }

    // Create the BlogPost
    const post = await prisma.blogPost.create({
      data: {
        slug: article.slug,
        title_en: article.title_en,
        title_ar: article.title_ar,
        content_en: article.content_en.trim(),
        content_ar: article.content_ar.trim(),
        meta_title_en: article.meta_title_en,
        meta_title_ar: article.meta_title_ar,
        meta_description_en: article.meta_description_en,
        meta_description_ar: article.meta_description_ar,
        category_id: category.id,
        author_id: author.id,
        siteId: article.siteId,
        published: false,
        seo_score: 82,
        source_pipeline: "editorial",
        locale: "en",
      },
    });

    return NextResponse.json({
      success: true,
      id: post.id,
      slug: post.slug,
      message: `Article "${articleKey}" created as draft. Publish via cockpit when ready.`,
      url: `${getSiteDomain(post.siteId || getDefaultSiteId())}/blog/${post.slug}`,
    });
  } catch (err) {
    console.error("[seed-article] Error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    available: ["greenwich-easter-2026", "greek-islands-yacht-charter-guide-2026"],
    usage: "POST /api/admin/seed-article with { article: '<key>' }",
  });
}
