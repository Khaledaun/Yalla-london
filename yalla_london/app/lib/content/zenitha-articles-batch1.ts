/**
 * Zenitha Yachts Articles — Batch 1: Destination Guides (Articles 1-5)
 * Greek Islands, Croatian Coast, Turkish Riviera, Amalfi Coast, French Riviera
 */

export interface ZenithaArticle {
  slug: string;
  title_en: string;
  title_ar: string;
  meta_title_en: string;
  meta_title_ar: string;
  meta_description_en: string;
  meta_description_ar: string;
  category_slug: string;
  category_name: string;
  seo_score: number;
  content_en: string;
  content_ar: string;
}

// ─── Article 1: Greek Islands Yacht Charter Guide ────────────────────────────

const ARTICLE_1: ZenithaArticle = {
  slug: "greek-islands-yacht-charter-guide",
  title_en: "Greek Islands Yacht Charter Guide: Sailing the Cyclades, Dodecanese & Ionian",
  title_ar: "دليل استئجار اليخوت في الجزر اليونانية: الإبحار في سيكلاديز ودوديكانيز وأيونيان",
  meta_title_en: "Greek Islands Yacht Charter Guide | Cyclades, Dodecanese & Ionian",
  meta_title_ar: "دليل استئجار اليخوت في الجزر اليونانية | سيكلاديز ودوديكانيز",
  meta_description_en: "Plan your Greek Islands yacht charter with our insider guide covering the Cyclades, Dodecanese and Ionian islands. Routes, costs, marinas and halal dining tips.",
  meta_description_ar: "خطط لرحلة استئجار يختك في الجزر اليونانية مع دليلنا الشامل الذي يغطي سيكلاديز ودوديكانيز وأيونيان.",
  category_slug: "destination-guides",
  category_name: "Destination Guides",
  seo_score: 82,

  content_en: `<article>

<h2>Why Charter a Yacht in the Greek Islands?</h2>

<p>Greece remains the undisputed crown jewel of Mediterranean yacht chartering, and for good reason. With over 6,000 islands scattered across the Aegean and Ionian seas, the country offers an unmatched diversity of sailing experiences — from the whitewashed cliff villages of Santorini to the pine-forested coves of Corfu, from the cosmopolitan nightlife of Mykonos to the untouched tranquillity of Amorgos.</p>

<p>What makes Greece particularly special for yacht charters is the island-hopping format. Unlike coastal cruising along a single shoreline, Greek sailing involves daily discoveries — each morning you wake to a new island, a new harbour, a new character. The distances between islands are manageable (typically 15-40 nautical miles), meaning you spend more time swimming, exploring, and dining than motoring.</p>

<div style="background:#0a1628;border-left:4px solid #c49a2a;padding:16px 20px;margin:20px 0;border-radius:0 8px 8px 0;color:#e8e0d0">
<strong>Insider tip:</strong> The meltemi wind in the Cyclades blows strongest in July and August (Force 5-7 from the north). If you're chartering a sailing yacht, plan your route to work with the wind — sail north-to-south through the Cyclades and you'll have exhilarating downwind sailing rather than punishing upwind beats.
</div>

<h2>The Three Great Sailing Regions</h2>

<h3>The Cyclades — Iconic Beauty, Challenging Winds</h3>

<p>The Cyclades are what most people picture when they think of Greek island sailing: sugar-cube houses tumbling down volcanic cliffs, sapphire-domed churches, and crystalline waters so clear you can read a book through three metres of sea. The chain stretches from Kea (closest to Athens) south to Santorini, with Mykonos, Paros, Naxos, and Milos forming the core cruising circuit.</p>

<p>A classic 7-day Cyclades route starts from Lavrion Marina (40 minutes south of Athens airport) and might run: Kea → Syros → Mykonos → Paros → Naxos → Ios → Santorini. This covers approximately 130 nautical miles and gives you a perfect mix of cosmopolitan ports and quiet anchorages.</p>

<p>For families, we recommend including Naxos — the island has the best sandy beaches in the Cyclades (Agios Prokopios and Plaka stretch for kilometres), excellent shallow swimming for children, and a charming old town with family-friendly tavernas. Paros offers similar family appeal with the added bonus of Parikia's Venetian castle and the traditional pottery village of Lefkes.</p>

<h3>The Dodecanese — Warm Waters, Rich History</h3>

<p>Lying close to the Turkish coast, the Dodecanese enjoy warmer waters and gentler winds than the Cyclades. Rhodes, Kos, Symi, and Kalymnos form the main cruising ground, and the proximity to Turkey makes cross-border excursions possible (you can day-trip to Bodrum from Kos).</p>

<p>The standout anchorage here is Symi — the harbour is arguably the most photogenic in all of Greece, with neoclassical mansions climbing steeply from the waterfront in shades of terracotta, ochre, and cream. Arrive by yacht in the late afternoon when the setting sun paints the facades gold, and you'll understand why Symi appears on the cover of virtually every Greek sailing guide ever published.</p>

<p>Rhodes town deserves at least a full day. The medieval Old Town is a UNESCO World Heritage Site with 4 kilometres of intact fortification walls, and the Palace of the Grand Master is genuinely impressive. For provisioning, Rhodes has the best-stocked supermarkets in the Dodecanese and several halal-friendly restaurants near the old port.</p>

<h3>The Ionian Islands — Green, Calm, Family-Perfect</h3>

<p>If the Cyclades are Greece's glamorous supermodel, the Ionian islands are the well-read, quietly beautiful professor. Corfu, Lefkada, Kefalonia, Ithaca, and Zakynthos form a lush, green archipelago along Greece's western coast, sheltered from the meltemi and blessed with reliable thermal winds that rarely exceed Force 4.</p>

<p>The Ionian is the best region for first-time charterers and families. The calm conditions, short distances between islands (often just 5-10 nautical miles), and abundance of sheltered anchorages make it genuinely relaxing rather than adventurous. Nydri on Lefkada is the most popular charter base, with several major flotilla and bareboat operators established there.</p>

<div style="background:#0a1628;border-left:4px solid #c49a2a;padding:16px 20px;margin:20px 0;border-radius:0 8px 8px 0;color:#e8e0d0">
<strong>Insider tip:</strong> Don't miss Fiskardo on Kefalonia — it's the only village on the island that survived the 1953 earthquake intact. The Venetian-era harbour with its pastel buildings and waterfront restaurants feels like a miniature Portofino. Book a table at Tassia for the best seafood on the island (the lobster pasta is extraordinary).
</div>

<h2>What Does a Greek Islands Yacht Charter Cost?</h2>

<p>Charter costs vary enormously depending on the boat type, season, and whether you opt for bareboat or crewed:</p>

<ul>
<li><strong>Bareboat sailing catamaran (38-42ft):</strong> €3,500-7,000/week in peak season (July-August), €2,000-4,000 in shoulder (May-June, September-October)</li>
<li><strong>Crewed sailing yacht (50-60ft):</strong> €8,000-15,000/week all-inclusive with captain and cook</li>
<li><strong>Crewed motor yacht (60-80ft):</strong> €15,000-35,000/week plus expenses (fuel, marina fees, provisioning typically add 30-40%)</li>
<li><strong>Luxury superyacht (80ft+):</strong> €35,000-100,000+/week plus expenses</li>
</ul>

<p>The Advance Provisioning Allowance (APA) for crewed charters is typically 25-35% of the charter fee, covering fuel, food, drinks, marina fees, and other running costs. Any unused APA is refunded at the end of the charter.</p>

<h2>Best Marinas and Charter Bases</h2>

<p><strong>Athens/Lavrion:</strong> The main gateway for Cyclades charters. Lavrion Marina is modern, well-equipped, and far less chaotic than Athens' Alimos Marina. It's 40 minutes from Athens International Airport — you can be aboard your yacht within 90 minutes of landing.</p>

<p><strong>Lefkada/Nydri:</strong> The Ionian gateway. Multiple charter companies operate from here. The D-Marin Lefkada is the premium option with full services including a swimming pool and restaurant.</p>

<p><strong>Rhodes/Kos:</strong> Dodecanese charter bases. Rhodes Marina is in the centre of town — step off your yacht and into the medieval Old Town. Kos Marina is smaller but well-positioned for Turkey crossings.</p>

<p><strong>Mykonos New Port:</strong> If you're joining a charter mid-trip, Mykonos has excellent flight connections from major European cities and several Gulf states. The new port at Tourlos handles larger yachts and has improved facilities.</p>

<h2>Halal Dining and Prayer Facilities</h2>

<p>Greece's halal dining scene has improved significantly in recent years, particularly in Athens and the tourist islands. While dedicated halal restaurants remain limited outside Athens, the Greek diet naturally accommodates many halal requirements — fresh seafood, grilled meats (ask for lamb or chicken), salads, and the iconic moussaka can often be prepared halal on request.</p>

<p>In Athens, the Al Sham restaurant in Monastiraki serves excellent Syrian-Lebanese cuisine with halal meat. On Mykonos, several upscale restaurants now offer halal options — ask your charter crew to call ahead. Rhodes has a functioning mosque (the Ibrahim Pasha Mosque, though it's primarily a historical monument) and halal meat is available in the old town's Turkish quarter.</p>

<div style="background:#0a1628;border-left:4px solid #c49a2a;padding:16px 20px;margin:20px 0;border-radius:0 8px 8px 0;color:#e8e0d0">
<strong>Insider tip:</strong> If halal provisioning is important to your group, arrange it through your charter company before arrival. Athens has several halal butchers, and a good charter crew will pre-stock the yacht with halal meat, poultry, and any specific dietary requirements. We've found that communicating dietary needs at least two weeks in advance results in a much better provisioning experience than last-minute requests.
</div>

<h2>When to Charter in Greece</h2>

<p>The Greek charter season runs from late April to early November, with distinct characteristics in each period:</p>

<ul>
<li><strong>April-May:</strong> Quiet anchorages, wildflowers, water still cool (18-20°C). Best for couples seeking solitude.</li>
<li><strong>June:</strong> The sweet spot — warm weather, manageable winds, tourist season hasn't peaked. Water reaches 22-24°C.</li>
<li><strong>July-August:</strong> Peak season, hottest weather (35°C+), strongest meltemi winds, busiest ports. Book 6-12 months ahead.</li>
<li><strong>September-October:</strong> Many experienced sailors' favourite — warm seas (25-26°C), lighter winds, fewer crowds, lower prices.</li>
</ul>

<h2>Key Takeaways</h2>

<ul>
<li>Greece offers three distinct sailing regions: Cyclades (dramatic, windy), Dodecanese (warm, historical), and Ionian (calm, green, family-friendly)</li>
<li>Costs range from €2,000/week for a bareboat catamaran in shoulder season to €100,000+/week for a luxury superyacht in peak summer</li>
<li>The meltemi wind dictates Cyclades routing from July-August — always plan north-to-south</li>
<li>Halal provisioning is readily available with advance planning through your charter company</li>
<li>September offers the best value: warm seas, light winds, fewer crowds, lower prices</li>
</ul>

<p>Ready to explore the Greek Islands by yacht? <a href="/charter-planner" rel="noopener">Use our charter planner</a> to build your perfect itinerary, or <a href="/inquiry" rel="noopener">submit a charter inquiry</a> and our team will craft a bespoke route based on your preferences. Browse our <a href="/yachts" rel="noopener">available fleet</a> for Greece-based yachts ready for your next adventure.</p>

</article>`,

  content_ar: `<article>

<h2>لماذا استئجار يخت في الجزر اليونانية؟</h2>

<p>تبقى اليونان الجوهرة التي لا منازع لها في عالم استئجار اليخوت في البحر المتوسط. مع أكثر من 6,000 جزيرة منتشرة عبر بحري إيجة وأيونيان، تقدم البلاد تنوعاً لا مثيل له في تجارب الإبحار — من القرى البيضاء المعلقة على المنحدرات في سانتوريني إلى الخلجان المحاطة بأشجار الصنوبر في كورفو.</p>

<p>ما يجعل اليونان مميزة بشكل خاص هو نظام التنقل بين الجزر. على عكس الإبحار الساحلي على طول شاطئ واحد، يتضمن الإبحار اليوناني اكتشافات يومية — كل صباح تستيقظ على جزيرة جديدة وميناء جديد وطابع مختلف.</p>

<div style="background:#0a1628;border-left:4px solid #c49a2a;padding:16px 20px;margin:20px 0;border-radius:0 8px 8px 0;color:#e8e0d0">
<strong>نصيحة من الداخل:</strong> رياح الميلتيمي في سيكلاديز تهب بقوة في يوليو وأغسطس. خطط مسارك من الشمال إلى الجنوب للاستمتاع بإبحار مع الريح بدلاً من مواجهتها.
</div>

<h2>المناطق الثلاث الكبرى للإبحار</h2>

<h3>سيكلاديز — جمال أيقوني ورياح قوية</h3>

<p>سيكلاديز هي ما يتخيله معظم الناس عند التفكير في الإبحار اليوناني: منازل بيضاء كالسكر تتساقط على منحدرات بركانية وقباب زرقاء ساطعة ومياه صافية بشكل لا يصدق. تمتد السلسلة من كيا جنوباً إلى سانتوريني، مع ميكونوس وباروس وناكسوس وميلوس كمحور الإبحار الرئيسي.</p>

<p>مسار كلاسيكي لمدة 7 أيام يبدأ من مرسى لافريون: كيا ← سيروس ← ميكونوس ← باروس ← ناكسوس ← إيوس ← سانتوريني. يغطي حوالي 130 ميلاً بحرياً ويمنحك مزيجاً مثالياً بين الموانئ العالمية والمراسي الهادئة.</p>

<h3>دوديكانيز — مياه دافئة وتاريخ غني</h3>

<p>تقع بالقرب من الساحل التركي وتتمتع بمياه أدفأ ورياح ألطف من سيكلاديز. رودس وكوس وسيمي وكاليمنوس تشكل منطقة الإبحار الرئيسية. المرسى المميز هنا هو سيمي — يُعد الميناء الأكثر تصويراً في كل اليونان.</p>

<h3>الجزر الأيونية — خضراء وهادئة ومثالية للعائلات</h3>

<p>كورفو وليفكادا وكيفالونيا وإيثاكا وزاكينثوس تشكل أرخبيلاً أخضر خصباً محمياً من الميلتيمي. هذه المنطقة هي الأفضل لمستأجري اليخوت لأول مرة والعائلات بفضل الظروف الهادئة والمسافات القصيرة بين الجزر.</p>

<h2>تكاليف استئجار اليخوت في اليونان</h2>

<ul>
<li><strong>قارب شراعي بدون طاقم (38-42 قدم):</strong> 3,500-7,000 يورو/أسبوع في الموسم الذروة</li>
<li><strong>يخت شراعي مع طاقم (50-60 قدم):</strong> 8,000-15,000 يورو/أسبوع شامل</li>
<li><strong>يخت محرك مع طاقم (60-80 قدم):</strong> 15,000-35,000 يورو/أسبوع</li>
<li><strong>سوبر يخت فاخر (80+ قدم):</strong> 35,000-100,000+ يورو/أسبوع</li>
</ul>

<h2>الطعام الحلال ومرافق الصلاة</h2>

<p>تحسن مشهد الطعام الحلال في اليونان بشكل ملحوظ في السنوات الأخيرة. النظام الغذائي اليوناني يستوعب بشكل طبيعي العديد من متطلبات الحلال — المأكولات البحرية الطازجة واللحوم المشوية والسلطات. في أثينا، مطعم الشام في موناستيراكي يقدم مأكولات سورية-لبنانية حلال ممتازة.</p>

<div style="background:#0a1628;border-left:4px solid #c49a2a;padding:16px 20px;margin:20px 0;border-radius:0 8px 8px 0;color:#e8e0d0">
<strong>نصيحة من الداخل:</strong> رتّب التموين الحلال من خلال شركة التأجير قبل الوصول بأسبوعين على الأقل. أثينا لديها عدة جزارين حلال وطاقم اليخت الجيد سيجهز اليخت مسبقاً.
</div>

<h2>النقاط الرئيسية</h2>

<ul>
<li>اليونان تقدم ثلاث مناطق إبحار مميزة: سيكلاديز ودوديكانيز وأيونيان</li>
<li>التكاليف تتراوح من 2,000 يورو/أسبوع إلى أكثر من 100,000 يورو/أسبوع</li>
<li>سبتمبر يقدم أفضل قيمة: بحار دافئة ورياح خفيفة وأسعار أقل</li>
<li>التموين الحلال متاح بسهولة مع التخطيط المسبق</li>
</ul>

<p>هل أنت مستعد لاستكشاف الجزر اليونانية بالیخت؟ <a href="/charter-planner" rel="noopener">استخدم مخطط الرحلات</a> لبناء مسارك المثالي، أو <a href="/inquiry" rel="noopener">أرسل استفساراً</a> وسيقوم فريقنا بتصميم مسار مخصص لك.</p>

</article>`,
};

// ─── Article 2: Croatian Coast Yacht Charter Guide ──────────────────────────

const ARTICLE_2: ZenithaArticle = {
  slug: "croatian-coast-yacht-charter-guide",
  title_en: "Croatian Coast Yacht Charter: Dubrovnik to Split and the Dalmatian Islands",
  title_ar: "استئجار اليخوت على الساحل الكرواتي: من دوبروفنيك إلى سبليت وجزر دالماتيا",
  meta_title_en: "Croatian Coast Yacht Charter | Dubrovnik to Split Sailing Guide",
  meta_title_ar: "استئجار يخوت الساحل الكرواتي | دليل الإبحار من دوبروفنيك إلى سبليت",
  meta_description_en: "Explore Croatia by yacht from Dubrovnik to Split. Island-hopping guide covering Hvar, Korčula, Vis and the best anchorages along the Dalmatian coast.",
  meta_description_ar: "استكشف كرواتيا بالیخت من دوبروفنيك إلى سبليت. دليل التنقل بين الجزر يغطي هفار وكورتشولا وفيس.",
  category_slug: "destination-guides",
  category_name: "Destination Guides",
  seo_score: 84,

  content_en: `<article>

<h2>Why Croatia Is the Mediterranean's Fastest-Growing Charter Destination</h2>

<p>Croatia's Dalmatian coast has transformed from a hidden gem into one of the world's most sought-after yacht charter destinations. The numbers tell the story: Croatia now hosts over 4,000 charter yachts, making it the largest charter fleet in the Mediterranean. The combination of 1,244 islands (only 48 permanently inhabited), crystal-clear Adriatic waters, UNESCO World Heritage cities, and a coastline that rivals the best of Greece and Italy has created a sailing paradise that genuinely delivers on its promise.</p>

<p>What sets Croatia apart from Greece or Turkey is the quality of its coastal towns. While many Greek islands have a single harbour village, Croatian islands like Hvar, Korčula, and Vis boast sophisticated towns with excellent restaurants, wine bars, and cultural attractions. The country's EU membership since 2013 and euro adoption in 2023 have simplified logistics enormously — no currency exchange, standard EU roaming, and streamlined marina check-in procedures.</p>

<div style="background:#0a1628;border-left:4px solid #c49a2a;padding:16px 20px;margin:20px 0;border-radius:0 8px 8px 0;color:#e8e0d0">
<strong>Insider tip:</strong> Croatia's ACI (Adriatic Croatia International) marina network is exceptionally well-maintained, with 22 marinas along the coast all operating to a consistent standard. Download the ACI app for real-time berth availability — during peak season, securing a berth in Hvar or Dubrovnik without a reservation is nearly impossible.
</div>

<h2>The Classic Dubrovnik to Split Route</h2>

<p>The most popular Croatian charter route runs from Dubrovnik north to Split (or vice versa), covering approximately 100 nautical miles over 7 days with island stops. This one-way routing means you see maximum coastline without backtracking — most charter companies offer one-way fees of €300-500 for the boat repositioning.</p>

<h3>Day 1-2: Dubrovnik and the Elaphiti Islands</h3>

<p>Start in Dubrovnik's ACI Marina, just north of the old town. Spend your first morning exploring the city walls — the 2km circuit offers extraordinary views over terracotta rooftops and the shimmering Adriatic. By afternoon, motor 8 nautical miles northwest to the Elaphiti Islands, a cluster of three inhabited islands (Koločep, Lopud, and Šipan) that feel decades removed from Dubrovnik's tourist intensity.</p>

<p>Lopud is our favourite overnight stop: anchor in Šunj Bay on the island's south side, where a perfect crescent of sand meets warm, shallow water. There are no cars on Lopud — just olive groves, abandoned villas from the Dubrovnik Republic era, and a single excellent restaurant (Obala) right on the beach.</p>

<h3>Day 3-4: Korčula — The Mini Dubrovnik</h3>

<p>Korčula town is often called "Mini Dubrovnik" for its fortified old town jutting into the sea on a small peninsula. The comparison is fair — Korčula has the same Venetian architecture, limestone streets, and cathedral-dominated skyline, but without the cruise ship crowds. Marco Polo was reputedly born here, and the Marco Polo Museum in the old town is a charming 15-minute diversion.</p>

<p>The island's south coast hides some of the best swimming spots in the Adriatic. Pupnatska Luka is a deep bay backed by dense forest, reachable only by yacht or a 30-minute hike — the water is so clear it appears illuminated from below.</p>

<h3>Day 5: Vis — Croatia's Secret Island</h3>

<p>Vis was a Yugoslav military base until 1989 and closed to foreign visitors for nearly 50 years. This enforced isolation preserved something remarkable: an island almost entirely free of modern tourist development, with fishing villages, vineyards, and a pace of life unchanged since the 1960s.</p>

<p>The town of Komiža on the western side is the most atmospheric harbour in Croatia — colourful fishing boats, a 16th-century Venetian tower, and some of the freshest seafood you'll eat anywhere in the Mediterranean. Try the local speciality, viška pogača (an anchovy and tomato bread that predates pizza by centuries).</p>

<div style="background:#0a1628;border-left:4px solid #c49a2a;padding:16px 20px;margin:20px 0;border-radius:0 8px 8px 0;color:#e8e0d0">
<strong>Insider tip:</strong> From Komiža, take a speedboat excursion to the Blue Cave on the tiny island of Biševo (15 minutes away). The cave fills with an ethereal blue light between 11am and noon when sunlight refracts through an underwater entrance. Go early — by midday the tourist boats create a 45-minute queue.
</div>

<h3>Day 6: Hvar — The Glamour Stop</h3>

<p>Hvar is Croatia's most famous island and the social hub of the Adriatic charter scene. The town harbour fills with superyachts from June through September, and the waterfront bars and restaurants have a decidedly Saint-Tropez energy. Carpe Diem Beach on Marinkovac island (a 5-minute water taxi from Hvar harbour) is the daytime party spot.</p>

<p>But Hvar has depth beyond the glamour. The interior is covered in lavender fields (blooming in June-July), ancient stone villages, and some of Croatia's best vineyards. Stari Grad Plain, on the island's north side, is a UNESCO World Heritage agricultural landscape that has been continuously cultivated since Greek colonists arrived in 384 BC.</p>

<h3>Day 7: Brač and Split</h3>

<p>Your final day takes you past the island of Brač, where you can stop at Zlatni Rat (Golden Horn), one of Europe's most photographed beaches — a triangular spit of white pebbles that shifts shape with the wind and current. Then it's a 10-nautical-mile crossing to Split's ACI Marina, right beneath Diocletian's Palace.</p>

<h2>Charter Costs and Practicalities</h2>

<p>Croatian charter prices have risen steadily but still offer better value than equivalent itineraries in the French Riviera or Amalfi Coast:</p>

<ul>
<li><strong>Bareboat catamaran (40-45ft):</strong> €4,000-9,000/week peak season, €2,500-5,000 shoulder</li>
<li><strong>Crewed motor yacht (60-80ft):</strong> €18,000-40,000/week plus APA</li>
<li><strong>Superyacht (80ft+):</strong> €40,000-120,000/week plus APA</li>
</ul>

<p>Marina fees in Croatia are €50-200/night depending on yacht size and location (Hvar and Dubrovnik are the most expensive). Water and electricity are usually included. Croatian marinas accept euros directly since January 2023.</p>

<h2>Halal Dining Along the Coast</h2>

<p>Croatia's halal dining options are more limited than Greece or Turkey, reflecting the country's predominantly Catholic culture. However, the coastal cuisine is naturally seafood-heavy, which simplifies halal requirements. Fresh grilled fish, octopus salad, and shellfish are available at virtually every waterfront restaurant.</p>

<p>For halal meat, Split has the best options: Konoba Varoš in the old town can prepare lamb dishes on request, and there are halal butchers in the Lora neighbourhood. In Dubrovnik, the Taj Mahal restaurant (yes, really) in the old town serves excellent Bosnian cuisine with halal meat.</p>

<h2>Key Takeaways</h2>

<ul>
<li>The Dubrovnik-to-Split route covers Croatia's highlights in 7 days with no backtracking</li>
<li>Croatia offers exceptional value compared to the French Riviera or Amalfi Coast</li>
<li>Vis and the Elaphiti Islands provide the best escape from crowds</li>
<li>ACI marinas are well-maintained but Hvar and Dubrovnik require advance booking in summer</li>
<li>Halal dining is seafood-focused with limited meat options outside Split and Dubrovnik</li>
</ul>

<p>Ready to sail the Dalmatian coast? <a href="/charter-planner" rel="noopener">Plan your Croatian charter</a> with our interactive tool, or <a href="/destinations/croatian-coast" rel="noopener">explore our Croatia destination page</a> for available yachts and itineraries.</p>

</article>`,

  content_ar: `<article>

<h2>لماذا كرواتيا هي الوجهة الأسرع نمواً في المتوسط؟</h2>

<p>تحول الساحل الدلماسي في كرواتيا من جوهرة مخفية إلى واحدة من أكثر وجهات استئجار اليخوت طلباً في العالم. تستضيف كرواتيا الآن أكثر من 4,000 يخت مستأجر. يجعل الجمع بين 1,244 جزيرة ومياه الأدرياتيكي الصافية ومدن التراث العالمي لليونسكو وساحل ينافس أفضل ما في اليونان وإيطاليا جنة إبحار حقيقية.</p>

<p>ما يميز كرواتيا هو جودة مدنها الساحلية. جزر مثل هفار وكورتشولا وفيس تتميز بمدن متطورة بمطاعم ممتازة وبارات نبيذ ومعالم ثقافية. انضمام البلاد للاتحاد الأوروبي واعتماد اليورو في 2023 بسّط الأمور بشكل كبير.</p>

<div style="background:#0a1628;border-left:4px solid #c49a2a;padding:16px 20px;margin:20px 0;border-radius:0 8px 8px 0;color:#e8e0d0">
<strong>نصيحة من الداخل:</strong> شبكة مراسي ACI الكرواتية ممتازة مع 22 مرسى على طول الساحل. حمّل تطبيق ACI لتوفر الأرصفة في الوقت الحقيقي — في موسم الذروة تأمين رصيف في هفار بدون حجز شبه مستحيل.
</div>

<h2>المسار الكلاسيكي من دوبروفنيك إلى سبليت</h2>

<p>المسار الأكثر شعبية يمتد من دوبروفنيك شمالاً إلى سبليت على مدى 7 أيام مع توقفات في الجزر، ويغطي حوالي 100 ميل بحري. يتضمن المسار: جزر إلافيتي ← كورتشولا ← فيس ← هفار ← براتش ← سبليت.</p>

<h3>كورتشولا — دوبروفنيك المصغرة</h3>

<p>غالباً ما تُسمى "دوبروفنيك المصغرة" بسبب بلدتها القديمة المحصنة. تتمتع بنفس العمارة البندقية والشوارع الحجرية ولكن بدون حشود السفن السياحية.</p>

<h3>فيس — جزيرة كرواتيا السرية</h3>

<p>كانت قاعدة عسكرية يوغوسلافية حتى 1989 ومغلقة أمام الزوار لنحو 50 عاماً. هذه العزلة حفظت جزيرة خالية تقريباً من التطوير السياحي الحديث.</p>

<h3>هفار — محطة الرفاهية</h3>

<p>أشهر جزيرة في كرواتيا والمركز الاجتماعي لمشهد اليخوت الأدرياتيكي. يمتلئ الميناء بالسوبر يخوت من يونيو حتى سبتمبر.</p>

<h2>تكاليف التأجير</h2>

<ul>
<li><strong>قارب بدون طاقم (40-45 قدم):</strong> 4,000-9,000 يورو/أسبوع موسم الذروة</li>
<li><strong>يخت محرك مع طاقم (60-80 قدم):</strong> 18,000-40,000 يورو/أسبوع</li>
<li><strong>سوبر يخت (80+ قدم):</strong> 40,000-120,000 يورو/أسبوع</li>
</ul>

<h2>الطعام الحلال</h2>

<p>خيارات الطعام الحلال محدودة أكثر من اليونان أو تركيا، لكن المأكولات الساحلية تعتمد بشكل طبيعي على المأكولات البحرية. في سبليت مطعم كونوبا فاروش يمكنه تحضير أطباق لحم الضأن عند الطلب. في دوبروفنيك مطعم تاج محل يقدم مأكولات بوسنية حلال ممتازة.</p>

<h2>النقاط الرئيسية</h2>

<ul>
<li>مسار دوبروفنيك-سبليت يغطي أبرز معالم كرواتيا في 7 أيام</li>
<li>كرواتيا تقدم قيمة استثنائية مقارنة بالريفييرا الفرنسية</li>
<li>فيس وجزر إلافيتي توفران أفضل هروب من الزحام</li>
<li>الطعام الحلال يركز على المأكولات البحرية مع خيارات لحوم محدودة</li>
</ul>

<p>هل أنت مستعد للإبحار على الساحل الدلماسي؟ <a href="/charter-planner" rel="noopener">خطط لرحلتك الكرواتية</a> أو <a href="/destinations/croatian-coast" rel="noopener">استكشف صفحة وجهة كرواتيا</a>.</p>

</article>`,
};

// ─── Article 3: Turkish Riviera Yacht Charter Guide ─────────────────────────

const ARTICLE_3: ZenithaArticle = {
  slug: "turkish-riviera-yacht-charter-guide",
  title_en: "Turkish Riviera Yacht Charter Guide: Bodrum to Göcek on a Gulet",
  title_ar: "دليل استئجار اليخوت في الريفييرا التركية: من بودروم إلى غوجيك على متن قولت",
  meta_title_en: "Turkish Riviera Yacht Charter Guide | Bodrum to Göcek by Gulet",
  meta_title_ar: "دليل استئجار اليخوت في الريفييرا التركية | بودروم إلى غوجيك",
  meta_description_en: "Discover the Turkish Riviera by gulet or yacht. Our insider guide covers Bodrum, Marmaris, Fethiye and Göcek with routes, costs, halal dining and marina tips.",
  meta_description_ar: "اكتشف الريفييرا التركية على متن يخت أو قولت. دليلنا يغطي بودروم ومرمريس وفتحية وغوجيك مع المسارات والتكاليف.",
  category_slug: "destination-guides",
  category_name: "Destination Guides",
  seo_score: 82,
  content_en: `<article>

<h1>Turkish Riviera Yacht Charter Guide: Bodrum to Göcek on a Gulet</h1>

<p>The Turkish Riviera — known locally as the <strong>Turquoise Coast</strong> — offers arguably the best value yacht charter experience in the entire Mediterranean. Where else can you anchor in a pristine bay surrounded by Lycian ruins, dine on freshly caught sea bass prepared by your private chef, and wake to the scent of wild pine forests — all for a fraction of what you would pay in Greece or Croatia? Having sailed this coast extensively, we can say with confidence that Turkey delivers the most authentic and affordable luxury charter experience available today.</p>

<p>This guide covers everything you need to plan a Turkish Riviera yacht charter, from the legendary gulet experience to specific route recommendations, costs, and the best halal-friendly dining along the coast.</p>

<h2>Why Choose the Turkish Riviera for Your Charter?</h2>

<p>The Turkish coastline between Bodrum and Antalya stretches over 600 kilometres of sheltered bays, ancient cities, and forested peninsulas. Unlike the Cyclades where open-water crossings can turn rough, the Turkish coast is remarkably protected — the Lycian shore faces south with mountain ranges blocking northerly winds, creating calm conditions even when the Aegean is churning.</p>

<div style="background:#0a1628; border-left:4px solid #c49a2a; padding:16px 20px; margin:20px 0; border-radius:0 8px 8px 0; color:#e8e0d0">
<strong style="color:#c49a2a">Insider Tip:</strong> The Turkish Riviera sees 300+ days of sunshine annually. Water temperatures reach 28°C by July and remain swimmable through late October — a full month longer than Greece or Croatia.
</div>

<p>Turkey is also the spiritual home of the <strong>gulet</strong> — the traditional wooden sailing vessel that has been built along this coast for centuries. A gulet charter is a uniquely Turkish experience: think wide teak decks, cushioned sunbathing areas, and a professional crew of 4-6 including a dedicated chef who prepares three meals daily from local market produce.</p>

<h2>Best Turkish Riviera Charter Routes</h2>

<h3>Route 1: The Classic Bodrum to Göcek (7 Days)</h3>

<p>This is the most popular route and for good reason — it covers the coast's greatest hits while maintaining a relaxed pace of 15-25 nautical miles per day.</p>

<p><strong>Day 1: Bodrum.</strong> Depart from Bodrum's Milta Marina in the afternoon. Explore Bodrum Castle (the Museum of Underwater Archaeology) before boarding. Anchor in Orak Island for your first swim stop — the water here is an impossible shade of turquoise.</p>

<p><strong>Day 2: Knidos.</strong> Sail to the ancient city of Knidos at the tip of the Datça Peninsula. The ruins include a 4th-century BC amphitheatre and the foundation of the famous Temple of Aphrodite. Anchor in the twin harbours where ancient Greek merchants once moored their triremes.</p>

<p><strong>Day 3: Bozburun & Selimiye.</strong> Cruise into the Gulf of Hisarönü, stopping at Bozburun — a quiet boatbuilding village — before continuing to Selimiye Bay. The fish restaurants lining Selimiye's waterfront are some of the best on the coast. Order the <em>levrek</em> (sea bass) grilled whole with herbs.</p>

<p><strong>Day 4: Marmaris & Ekincik.</strong> A brief stop in Marmaris if you need provisions, then continue to Ekincik Bay — the gateway to the ancient city of Kaunos and the remarkable Dalyan River delta. Take a tender up the river past Lycian rock tombs carved into 400-foot cliffs.</p>

<p><strong>Day 5: Skopea Limani.</strong> Enter the Skopea Limani — a vast natural harbour system of interconnected bays hidden behind Tersane Island. This is Turkey's most spectacular anchorage: dozens of bays surrounded by forest, with barely another vessel in sight. Swim from bay to bay through water so clear you can count fish five metres below.</p>

<div style="background:#0a1628; border-left:4px solid #c49a2a; padding:16px 20px; margin:20px 0; border-radius:0 8px 8px 0; color:#e8e0d0">
<strong style="color:#c49a2a">Insider Tip:</strong> Skopea Limani's Hamam Bay has a natural hot spring that feeds into the sea. The temperature contrast — warm spring meeting cool Aegean — is surreal. Arrive early morning before other boats.
</div>

<p><strong>Day 6: Fethiye & Ölüdeniz.</strong> Explore Fethiye's atmospheric old town and the Lycian rock tombs of Amyntas visible from the harbour. Take a shore excursion to Ölüdeniz, whose Blue Lagoon is consistently rated among the world's most beautiful beaches.</p>

<p><strong>Day 7: Göcek.</strong> Arrive in Göcek, a charming marina town surrounded by the Twelve Islands. Göcek has six marinas and some of the coast's finest restaurants. Disembark or extend for another week.</p>

<h3>Route 2: The Lycian Coast — Kaş to Kekova (5 Days)</h3>

<p>For those seeking ruins, underwater archaeology, and dramatic coastal scenery, the Lycian stretch between Kaş and Kekova is unmatched. Highlights include the <strong>Sunken City of Kekova</strong> — an ancient Lycian city half-submerged by a 2nd-century earthquake, visible through glass-bottom tender boats — and the island of Kastellorizo, a quick crossing into Greek waters that feels like stepping into a film set.</p>

<h2>Understanding the Turkish Gulet Experience</h2>

<p>A gulet is not just a boat — it is a floating boutique hotel. Traditional gulets range from 20 to 40 metres and carry 8-16 guests in 4-8 air-conditioned cabins, each with en-suite bathrooms. The crew typically includes a captain, first mate, chef, and one or two deckhands.</p>

<p>The daily rhythm on a gulet is beautifully unhurried: wake to a full Turkish breakfast laid out on the aft deck (cheeses, olives, fresh bread, eggs, honey from local hives). The captain raises anchor and motors to the first bay of the day. Swim, snorkel, explore by tender. Your chef prepares lunch — usually four courses of Turkish-Mediterranean cuisine using ingredients purchased that morning from the nearest village market. Afternoon brings another bay, perhaps a shore walk to ruins, then sundowners as the light turns golden. Dinner is the centrepiece: grilled fish, slow-cooked lamb, stuffed aubergines, meze platters, followed by Turkish tea under the stars.</p>

<h2>Charter Costs: What to Expect in 2026</h2>

<p>Turkey offers exceptional value compared to other Mediterranean destinations:</p>

<ul>
<li><strong>Standard gulet (8-10 guests, 4-5 cabins):</strong> €8,000-€15,000/week all-inclusive (crew, fuel, meals, harbour fees)</li>
<li><strong>Luxury gulet (10-12 guests, 5-6 cabins):</strong> €15,000-€35,000/week all-inclusive</li>
<li><strong>Motor yacht (modern, 8-12 guests):</strong> €12,000-€50,000/week plus expenses (APA 25-30%)</li>
<li><strong>Ultra-luxury motor yacht (60m+):</strong> €80,000-€200,000/week plus APA</li>
</ul>

<p>Most gulet charters include all meals prepared by the onboard chef, fuel, harbour fees, and water toys. This all-inclusive model means far fewer surprise costs compared to bareboat or crewed motor yacht charters in Greece where provisions, fuel, and marina fees add 30-40% to the headline price.</p>

<h2>Halal Dining on the Turkish Riviera</h2>

<p>Turkey is overwhelmingly a Muslim-majority country, which means halal food is the default across the coast. Your gulet chef will prepare halal meals as standard — no special arrangements needed. Markets in Bodrum, Marmaris, Fethiye, and Göcek stock exclusively halal meat. Restaurants along the coast serve halal food unless they specifically cater to alcohol-focused nightlife (rare outside Bodrum's bar street).</p>

<p>Standout restaurants for shore dining:</p>
<ul>
<li><strong>Göcek:</strong> Upper Deck Restaurant for seafood with harbour views; Can Restaurant for authentic Turkish home cooking</li>
<li><strong>Fethiye:</strong> Mozaik Bahçe in the old town for Ottoman-era recipes; the fish market where you select your catch and surrounding restaurants cook it</li>
<li><strong>Bodrum:</strong> Orfoz Restaurant in Yalıkavak for premium seafood; Bitez Dondurma for Turkish ice cream made with <em>salep</em> and mastic</li>
<li><strong>Selimiye:</strong> Any waterfront restaurant — the <em>ahtapot ızgara</em> (grilled octopus) and <em>karides güveç</em> (shrimp casserole) are exceptional everywhere</li>
</ul>

<div style="background:#0a1628; border-left:4px solid #c49a2a; padding:16px 20px; margin:20px 0; border-radius:0 8px 8px 0; color:#e8e0d0">
<strong style="color:#c49a2a">Insider Tip:</strong> Ask your gulet captain to stop at village markets in Bozburun or Selimiye — the chef will buy that morning's catch and seasonal produce directly from fishermen and farmers. The grilled <em>çipura</em> (sea bream) and village salad with local olive oil is unforgettable.
</div>

<h2>Best Time to Charter the Turkish Riviera</h2>

<p>The season runs from late April through October, with distinct advantages per period:</p>

<ul>
<li><strong>Late April - May:</strong> Wildflowers, cool swimming, zero crowds. Best for history-focused itineraries</li>
<li><strong>June:</strong> Perfect balance — warm water (24°C), green hillsides, moderate prices, most bays deserted</li>
<li><strong>July - August:</strong> Peak season, warmest water (28°C), busiest anchorages. Book 6+ months ahead. The Meltemi wind is weaker here than in the Aegean, but Bodrum can get breezy</li>
<li><strong>September:</strong> Our top pick — warm sea, thinner crowds, softer light, lower prices than peak. The water retains summer heat while air temperatures ease to comfortable 28-30°C</li>
<li><strong>October:</strong> Shoulder season value. Swimming still viable. Some gulets begin winter haul-out mid-month</li>
</ul>

<h2>Marinas and Embarkation Points</h2>

<p>The Turkish Riviera has excellent marina infrastructure:</p>

<ul>
<li><strong>Bodrum — Milta Marina & Yalıkavak Marina:</strong> Bodrum is the most common embarkation point. Yalıkavak Marina is a superyacht-grade facility with restaurants, boutiques, and a beach club. Direct international flights to Bodrum-Milas Airport (BJV)</li>
<li><strong>Marmaris — Netsel Marina:</strong> Large, well-equipped marina with full provisioning. Good starting point for Datça Peninsula routes</li>
<li><strong>Göcek — D-Marin & Club Marina:</strong> Quieter, more upmarket. Six marinas in a small town — Göcek is Turkey's yachting capital. Transfer from Dalaman Airport (DLM), 25 minutes</li>
<li><strong>Fethiye — Ece Saray Marina:</strong> Excellent base for Lycian Coast itineraries. 45 minutes from Dalaman Airport</li>
</ul>

<h2>Key Takeaways</h2>

<ul>
<li>The Turkish Riviera offers the Mediterranean's best value charter — gulet all-inclusive rates start at €8,000/week for 8 guests</li>
<li>The gulet experience is uniquely Turkish: private chef, full crew, wooden vessel heritage</li>
<li>Bodrum-to-Göcek is the classic 7-day route covering castles, Lycian ruins, and Skopea Limani's hidden bays</li>
<li>Halal food is the default — no special arrangements needed on a Turkish gulet</li>
<li>September offers the ideal balance of warm water, thin crowds, and reasonable prices</li>
<li>The coast is sheltered by mountains, making it calmer than the open Aegean</li>
</ul>

<p>Ready to explore the Turquoise Coast? <a href="/charter-planner" rel="noopener">Start planning your Turkish Riviera charter</a> or <a href="/destinations/turkish-riviera" rel="noopener">explore our Turkey destination page</a>.</p>

</article>`,
  content_ar: `<article>

<h1>دليل استئجار اليخوت في الريفييرا التركية: من بودروم إلى غوجيك على متن قولت</h1>

<p>تُعرف الريفييرا التركية محلياً بـ<strong>الساحل الفيروزي</strong>، وتقدم أفضل تجربة استئجار يخوت من حيث القيمة في البحر الأبيض المتوسط بأكمله. يمتد الساحل بين بودروم وأنطاليا على مسافة تزيد عن 600 كيلومتر من الخلجان المحمية والمدن القديمة وأشباه الجزر المشجرة بالصنوبر.</p>

<h2>لماذا الريفييرا التركية لاستئجار اليخوت؟</h2>

<p>تركيا هي الموطن الروحي لـ<strong>القولت</strong> — سفينة الإبحار الخشبية التقليدية التي بُنيت على هذا الساحل لقرون. استئجار القولت تجربة تركية فريدة: أسطح خشبية واسعة ومناطق استرخاء مبطنة وطاقم محترف من 4-6 أشخاص يشمل طاهياً مخصصاً يحضر ثلاث وجبات يومياً من منتجات السوق المحلي.</p>

<div style="background:#0a1628; border-left:4px solid #c49a2a; padding:16px 20px; margin:20px 0; border-radius:0 8px 8px 0; color:#e8e0d0">
<strong style="color:#c49a2a">نصيحة من الداخل:</strong> تشهد الريفييرا التركية أكثر من 300 يوم مشمس سنوياً. تصل درجة حرارة الماء إلى 28 درجة مئوية بحلول يوليو وتبقى مناسبة للسباحة حتى أواخر أكتوبر.
</div>

<h2>مسار بودروم إلى غوجيك الكلاسيكي (7 أيام)</h2>

<p><strong>اليوم الأول: بودروم.</strong> انطلق من مرسى ميلتا في بودروم بعد الظهر. استكشف قلعة بودروم ورسو في جزيرة أوراك للسباحة الأولى.</p>

<p><strong>اليوم الثاني: كنيدوس.</strong> أبحر إلى المدينة القديمة عند طرف شبه جزيرة داتشا. تشمل الآثار مسرحاً يعود للقرن الرابع قبل الميلاد وأساسات معبد أفروديت الشهير.</p>

<p><strong>اليوم الثالث: بوزبورون وسليمية.</strong> قرية بناء القوارب الهادئة ثم خليج سليمية بمطاعمه البحرية الرائعة.</p>

<p><strong>اليوم الرابع: مرمريس وإكينجيك.</strong> التوقف في مرمريس ثم متابعة إلى خليج إكينجيك — بوابة مدينة كاونوس القديمة ودلتا نهر داليان مع المقابر الليقية المنحوتة في المنحدرات.</p>

<p><strong>اليوم الخامس: سكوبيا ليماني.</strong> نظام مرفأ طبيعي ضخم من الخلجان المترابطة خلف جزيرة ترسانة — أروع مرسى في تركيا.</p>

<p><strong>اليوم السادس: فتحية وأولودنيز.</strong> البلدة القديمة ومقابر أمينتاس الليقية والبحيرة الزرقاء في أولودنيز.</p>

<p><strong>اليوم السابع: غوجيك.</strong> الوصول إلى غوجيك — عاصمة اليخوت في تركيا مع ستة مراسٍ ومطاعم فاخرة.</p>

<h2>تكاليف الاستئجار في 2026</h2>

<ul>
<li><strong>قولت قياسي (8-10 ضيوف):</strong> 8,000-15,000 يورو/أسبوع شامل كلياً</li>
<li><strong>قولت فاخر (10-12 ضيوف):</strong> 15,000-35,000 يورو/أسبوع شامل كلياً</li>
<li><strong>يخت محرك حديث:</strong> 12,000-50,000 يورو/أسبوع بالإضافة لنفقات APA</li>
</ul>

<p>تشمل معظم استئجارات القولت جميع الوجبات والوقود ورسوم الموانئ وألعاب الماء — مما يعني تكاليف مفاجئة أقل بكثير مقارنة باليونان أو كرواتيا.</p>

<h2>الطعام الحلال على الريفييرا التركية</h2>

<p>تركيا دولة ذات أغلبية مسلمة، مما يعني أن الطعام الحلال هو المعيار عبر الساحل. سيحضر طاهي القولت وجبات حلال كإعداد افتراضي. الأسواق في بودروم ومرمريس وفتحية وغوجيك توفر لحوماً حلال حصرياً.</p>

<div style="background:#0a1628; border-left:4px solid #c49a2a; padding:16px 20px; margin:20px 0; border-radius:0 8px 8px 0; color:#e8e0d0">
<strong style="color:#c49a2a">نصيحة من الداخل:</strong> اطلب من قبطان القولت التوقف في أسواق القرى في بوزبورون أو سليمية — سيشتري الطاهي صيد الصباح والمنتجات الموسمية مباشرة من الصيادين والمزارعين.
</div>

<h2>أفضل وقت للإبحار</h2>

<ul>
<li><strong>أبريل-مايو:</strong> أزهار برية وسباحة منعشة وبدون ازدحام</li>
<li><strong>يونيو:</strong> التوازن المثالي — ماء دافئ وتلال خضراء وأسعار معتدلة</li>
<li><strong>يوليو-أغسطس:</strong> الموسم الذروة والماء الأدفأ</li>
<li><strong>سبتمبر:</strong> اختيارنا الأفضل — بحر دافئ وحشود أقل وضوء ناعم وأسعار أقل</li>
<li><strong>أكتوبر:</strong> قيمة موسم الكتف مع إمكانية السباحة</li>
</ul>

<h2>النقاط الرئيسية</h2>

<ul>
<li>الريفييرا التركية تقدم أفضل قيمة استئجار في المتوسط — القولت الشامل يبدأ من 8,000 يورو/أسبوع</li>
<li>تجربة القولت فريدة تركياً: طاهٍ خاص وطاقم كامل وتراث السفن الخشبية</li>
<li>الطعام الحلال هو المعيار — لا حاجة لترتيبات خاصة</li>
<li>سبتمبر يقدم التوازن المثالي بين الماء الدافئ والحشود القليلة</li>
</ul>

<p>هل أنت مستعد لاستكشاف الساحل الفيروزي؟ <a href="/charter-planner" rel="noopener">ابدأ تخطيط رحلتك التركية</a> أو <a href="/destinations/turkish-riviera" rel="noopener">استكشف صفحة وجهة تركيا</a>.</p>

</article>`,
};

// ─── Article 4: Amalfi Coast Yacht Charter Guide ────────────────────────────

const ARTICLE_4: ZenithaArticle = {
  slug: "amalfi-coast-yacht-charter-guide",
  title_en: "Amalfi Coast Yacht Charter Guide: Positano, Capri & the Bay of Naples",
  title_ar: "دليل استئجار اليخوت في ساحل أمالفي: بوسيتانو وكابري وخليج نابولي",
  meta_title_en: "Amalfi Coast Yacht Charter Guide | Positano, Capri & Naples Bay",
  meta_title_ar: "دليل استئجار اليخوت في ساحل أمالفي | بوسيتانو وكابري",
  meta_description_en: "Charter a yacht along the Amalfi Coast with our complete guide to Positano, Capri, Ischia and the Bay of Naples. Routes, costs, anchorages and halal dining.",
  meta_description_ar: "استأجر يختاً على طول ساحل أمالفي مع دليلنا الشامل لبوسيتانو وكابري وإيسكيا وخليج نابولي.",
  category_slug: "destination-guides",
  category_name: "Destination Guides",
  seo_score: 81,
  content_en: `<article>

<h1>Amalfi Coast Yacht Charter Guide: Positano, Capri & the Bay of Naples</h1>

<p>The Amalfi Coast is the Mediterranean's most photographed shoreline — and approaching it from the sea reveals why no photograph ever does it justice. Pastel villages cascade down vertical cliffs into water that shifts between sapphire and emerald. Lemon groves perfume the salt air. Church bells echo across the bay as your captain navigates between sea stacks and hidden grottoes. Having chartered this coast multiple times, we believe the Amalfi is the one destination where a yacht is not a luxury but a necessity — the coastal road is famously congested, parking is nonexistent, and the best beaches are only accessible by water.</p>

<p>This guide covers everything you need to plan an Amalfi Coast yacht charter, from route recommendations and anchorage tips to costs and halal dining options in this overwhelmingly Catholic region.</p>

<h2>Why Charter the Amalfi Coast by Yacht?</h2>

<p>The Amalfi Coast stretches just 50 kilometres between Positano and Vietri sul Mare, but its vertical geography makes land travel painfully slow. A drive from Positano to Amalfi town — 16 kilometres — takes 40-60 minutes on the single-lane cliff road during summer. By yacht, the same journey is a 20-minute cruise along one of the world's most spectacular coastlines.</p>

<p>More importantly, the Amalfi's greatest experiences are maritime. The Blue Grotto of Capri, the hidden cove of Fiordo di Furore, the swimming beaches of Li Galli islands, the thermal springs of Ischia — none of these are conveniently reached by car. A yacht turns a frustrating traffic-jam holiday into a seamless coastal exploration.</p>

<div style="background:#0a1628; border-left:4px solid #c49a2a; padding:16px 20px; margin:20px 0; border-radius:0 8px 8px 0; color:#e8e0d0">
<strong style="color:#c49a2a">Insider Tip:</strong> The Amalfi Coast has almost no marinas — anchoring is the standard. Most towns have mooring buoys managed by local cooperatives. Your captain will radio ahead to secure a buoy near Positano or Amalfi town. Always confirm buoy availability in July-August as they fill by midday.
</div>

<h2>The Classic Amalfi Coast Route (7 Days)</h2>

<h3>Day 1: Naples Departure & Procida</h3>

<p>Board your yacht at Marina di Stabia or the Mergellina harbour in Naples. Cruise 20 nautical miles to <strong>Procida</strong> — the smallest and most authentic of the Bay of Naples islands. The pastel-coloured fishing village of Marina Corricella (the backdrop for the film <em>Il Postino</em>) is best appreciated from the water. Anchor in the harbour and dine at a waterfront <em>trattoria</em> on spaghetti alle vongole.</p>

<h3>Day 2: Ischia</h3>

<p>A short crossing brings you to <strong>Ischia</strong>, a volcanic island famous for its thermal springs. The Poseidon Thermal Gardens offer pools ranging from 28°C to 40°C, terraced down to a private beach. For a more exclusive experience, anchor off the Negombo thermal park on Ischia's west coast — a botanical garden with natural hot springs flowing directly into the sea.</p>

<h3>Day 3: Capri</h3>

<p>No Amalfi charter is complete without <strong>Capri</strong>. Circumnavigate the island first to appreciate the Faraglioni rock formations and the sheer scale of the cliffs. Enter the <strong>Blue Grotto</strong> early morning (before 9am) to avoid the 2-hour queue that builds by midday. The grotto's bioluminescent blue light is one of nature's most remarkable optical illusions — sunlight enters through an underwater cavity and illuminates the cave from below.</p>

<p>After the grotto, anchor in Marina Piccola on Capri's south side. Take the funicular up to Capri town for lunch at a piazzetta café, then walk to Villa San Michele in Anacapri for panoramic views stretching to Vesuvius.</p>

<div style="background:#0a1628; border-left:4px solid #c49a2a; padding:16px 20px; margin:20px 0; border-radius:0 8px 8px 0; color:#e8e0d0">
<strong style="color:#c49a2a">Insider Tip:</strong> Skip the crowded Blue Grotto queue by hiring a private tender with a local boatman from Marina Grande. They know exactly when the tidal conditions allow entry and can get you in within minutes. Cost is around €100-150 for a 2-hour private tour of all the island's sea caves, including the lesser-known Green Grotto and White Grotto.
</div>

<h3>Day 4: Positano</h3>

<p>Cross from Capri to <strong>Positano</strong> — 10 nautical miles of stunning views with the Amalfi Coast gradually revealing itself like a curtain being drawn. Anchor off Spiaggia Grande (the main beach) or pick up a mooring buoy from the local cooperative. Positano is best explored on foot: climb the stepped lanes lined with boutiques selling handmade sandals and linen, visit the Chiesa di Santa Maria Assunta with its iconic majolica dome.</p>

<p>For dinner ashore, Da Vincenzo offers excellent Italian cuisine with a terrace overlooking the bay — book for sunset. The <em>scialatielli ai frutti di mare</em> (fresh pasta with mixed seafood) is Positano's signature dish.</p>

<h3>Day 5: Li Galli Islands & Praiano</h3>

<p>Sail to the <strong>Li Galli archipelago</strong> — three small islands once owned by Rudolf Nureyev, now a marine reserve. The water here is the clearest on the coast — perfect for snorkelling. Swimming is permitted but landing is not (the islands are privately owned). Continue to <strong>Praiano</strong>, a quieter village with none of Positano's crowds but equal beauty. Anchor below the village and swim in Cala della Gavitella, accessible only by sea.</p>

<h3>Day 6: Amalfi & Ravello</h3>

<p>Cruise to <strong>Amalfi town</strong>, once a maritime republic rivalling Venice. The 9th-century cathedral dominates the waterfront with its Arab-Norman architecture — a reminder of Amalfi's centuries of trade with the Islamic world. Take a shore excursion uphill to <strong>Ravello</strong>, where the gardens of Villa Rufolo and Villa Cimbrone offer arguably the most beautiful views in all of Italy — Richard Wagner composed parts of <em>Parsifal</em> here after being inspired by the panorama.</p>

<h3>Day 7: Return to Naples</h3>

<p>A final morning swim in the <strong>Fiordo di Furore</strong> — a narrow fjord cut into the cliffs between Amalfi and Positano, with a tiny beach accessible only by boat or a very steep staircase. Then cruise back to Naples, passing Vesuvius and the ruins of Herculaneum visible from the water.</p>

<h2>Charter Costs: Amalfi Coast 2026</h2>

<p>The Amalfi Coast is a premium charter destination — expect higher prices than Turkey or Croatia:</p>

<ul>
<li><strong>Motor yacht 18-22m (6-8 guests):</strong> €15,000-€30,000/week plus APA (30%)</li>
<li><strong>Motor yacht 24-30m (8-10 guests):</strong> €30,000-€70,000/week plus APA</li>
<li><strong>Sailing yacht 15-20m (4-8 guests):</strong> €8,000-€18,000/week plus APA</li>
<li><strong>Superyacht 40m+ (10-12 guests):</strong> €70,000-€200,000+/week plus APA</li>
</ul>

<p>APA (Advance Provisioning Allowance) covers fuel, food, mooring fees, and port charges. In practice, expect APA costs of €3,000-€8,000/week for a mid-range motor yacht. Italian mooring buoy fees range from €50-€200/night depending on location and vessel size — Capri and Positano are the most expensive.</p>

<h2>Halal Dining on the Amalfi Coast</h2>

<p>Italy is not a Muslim-majority country, so halal options require more planning than Turkey or the eastern Mediterranean. However, the Amalfi Coast's seafood-dominated cuisine makes halal dining very practical:</p>

<ul>
<li><strong>Seafood is your best friend:</strong> The Amalfi Coast's cuisine revolves around fresh fish, shellfish, and crustaceans — all halal. Grilled whole fish (<em>pesce alla griglia</em>), seafood pasta, and raw seafood platters (<em>crudo</em>) are available at every restaurant</li>
<li><strong>Vegetarian Italian is exceptional:</strong> Caprese salad, eggplant parmigiana, pasta with lemon and basil, wood-fired margherita pizza — Italy's vegetarian options are world-class</li>
<li><strong>Naples has halal butchers:</strong> If your charter provisions from Naples (most do), the Piazza Garibaldi area has several halal butchers and Middle Eastern grocery stores</li>
<li><strong>Brief your onboard chef:</strong> Italian yacht chefs may not be familiar with halal requirements. Brief them before departure — most are highly adaptable and will create stunning menus around seafood and vegetarian Italian cuisine</li>
</ul>

<div style="background:#0a1628; border-left:4px solid #c49a2a; padding:16px 20px; margin:20px 0; border-radius:0 8px 8px 0; color:#e8e0d0">
<strong style="color:#c49a2a">Insider Tip:</strong> For halal provisions in Naples, visit Macelleria Islamica on Via Bologna (near the central station) or the shops along Via Ferraris. Stock up before departing — there are no halal butchers along the Amalfi Coast itself.
</div>

<h2>Best Time for an Amalfi Coast Charter</h2>

<ul>
<li><strong>May-June:</strong> Our top recommendation — warm weather, fewer boats, reasonable mooring availability. Lemon harvest season fills the air with citrus fragrance</li>
<li><strong>July-August:</strong> Peak season. Temperatures 30-35°C, crowded anchorages, premium pricing. Book 6-9 months ahead</li>
<li><strong>September:</strong> Excellent — summer heat eases, tourists thin out, water temperature at its warmest (26°C). The light turns golden for photography</li>
<li><strong>October:</strong> Shoulder season bargains. Some restaurants close but the coast is peaceful. Water still swimmable at 22-23°C</li>
</ul>

<h2>Key Takeaways</h2>

<ul>
<li>The Amalfi Coast is best experienced by yacht — the coastal road is congested and the best beaches are boat-access only</li>
<li>The classic 7-day route covers Naples, Procida, Ischia, Capri, Positano, Praiano, and Amalfi</li>
<li>Capri's Blue Grotto is best visited early morning with a private boatman to skip the queue</li>
<li>Halal dining works well through seafood and vegetarian Italian — stock up on halal meat in Naples before departure</li>
<li>May-June and September offer the best balance of weather, availability, and value</li>
<li>Expect premium pricing: mid-range motor yachts start around €15,000-€30,000/week plus expenses</li>
</ul>

<p>Ready to cruise the Amalfi Coast? <a href="/charter-planner" rel="noopener">Start planning your Italian charter</a> or <a href="/destinations/amalfi-coast" rel="noopener">explore our Amalfi Coast destination page</a>.</p>

</article>`,
  content_ar: `<article>

<h1>دليل استئجار اليخوت في ساحل أمالفي: بوسيتانو وكابري وخليج نابولي</h1>

<p>ساحل أمالفي هو الشاطئ الأكثر تصويراً في البحر الأبيض المتوسط — والاقتراب منه من البحر يكشف لماذا لا تنصفه أي صورة فوتوغرافية. قرى بألوان الباستيل تتدرج على منحدرات عمودية في مياه تتراوح بين الياقوتي والزمردي. بساتين الليمون تعطر الهواء المالح. أجراس الكنائس تتردد عبر الخليج بينما يبحر قبطانك بين الصخور والكهوف المخفية.</p>

<h2>لماذا استئجار يخت في ساحل أمالفي؟</h2>

<p>يمتد ساحل أمالفي 50 كيلومتراً فقط لكن جغرافيته العمودية تجعل السفر البري بطيئاً. القيادة من بوسيتانو إلى أمالفي — 16 كيلومتراً — تستغرق 40-60 دقيقة على طريق الجرف ذي الحارة الواحدة. باليخت نفس الرحلة تستغرق 20 دقيقة على طول أحد أروع السواحل في العالم.</p>

<div style="background:#0a1628; border-left:4px solid #c49a2a; padding:16px 20px; margin:20px 0; border-radius:0 8px 8px 0; color:#e8e0d0">
<strong style="color:#c49a2a">نصيحة من الداخل:</strong> ساحل أمالفي ليس لديه تقريباً مراسٍ — الرسو بالعوامات هو المعيار. سيتصل قبطانك مسبقاً لتأمين عوامة قرب بوسيتانو أو أمالفي.
</div>

<h2>المسار الكلاسيكي لساحل أمالفي (7 أيام)</h2>

<p><strong>اليوم الأول: نابولي وبروتشيدا.</strong> انطلق من مرسى ستابيا وأبحر إلى بروتشيدا — أصغر جزر خليج نابولي وأكثرها أصالة مع قرية الصيد الملونة مارينا كوريتشيلا.</p>

<p><strong>اليوم الثاني: إيسكيا.</strong> جزيرة بركانية شهيرة بينابيعها الحرارية. حدائق بوسيدون الحرارية تقدم أحواضاً تتراوح من 28 إلى 40 درجة مئوية.</p>

<p><strong>اليوم الثالث: كابري.</strong> أبحر حول الجزيرة لتقدير تكوينات فاراليوني الصخرية. ادخل <strong>الكهف الأزرق</strong> صباحاً باكراً قبل التاسعة لتجنب الطابور. الضوء الأزرق المتوهج داخل الكهف هو أحد أروع الظواهر البصرية في الطبيعة.</p>

<p><strong>اليوم الرابع: بوسيتانو.</strong> عبور من كابري مع مناظر مذهلة. استكشف الممرات المتدرجة المليئة بمتاجر الصنادل المصنوعة يدوياً والكتان. زيارة كنيسة سانتا ماريا أسونتا بقبتها الأيقونية.</p>

<p><strong>اليوم الخامس: جزر لي غالي وبرايانو.</strong> أرخبيل لي غالي المحمي بمياه أنقى ما على الساحل. ثم برايانو — قرية أهدأ بنفس جمال بوسيتانو بدون حشودها.</p>

<p><strong>اليوم السادس: أمالفي ورافيلو.</strong> المدينة التي كانت جمهورية بحرية منافسة للبندقية. رحلة برية إلى رافيلو حيث حدائق فيلا روفولو تقدم أجمل المناظر في إيطاليا.</p>

<p><strong>اليوم السابع: العودة إلى نابولي.</strong> سباحة صباحية أخيرة في مضيق فوروري ثم العودة مروراً بفيزوف.</p>

<h2>تكاليف الاستئجار 2026</h2>

<ul>
<li><strong>يخت محرك 18-22م:</strong> 15,000-30,000 يورو/أسبوع + APA</li>
<li><strong>يخت محرك 24-30م:</strong> 30,000-70,000 يورو/أسبوع + APA</li>
<li><strong>يخت شراعي 15-20م:</strong> 8,000-18,000 يورو/أسبوع + APA</li>
</ul>

<h2>الطعام الحلال في ساحل أمالفي</h2>

<p>إيطاليا ليست دولة ذات أغلبية مسلمة لذا يتطلب الطعام الحلال تخطيطاً أكثر. لكن مطبخ أمالفي المبني على المأكولات البحرية يجعل الأمر عملياً:</p>

<ul>
<li><strong>المأكولات البحرية حليفك:</strong> السمك المشوي والمعكرونة بالمأكولات البحرية والأطباق النيئة متاحة في كل مطعم</li>
<li><strong>الطعام النباتي الإيطالي استثنائي:</strong> سلطة كابريزي وباذنجان بارميجيانا والبيتزا مارغريتا</li>
<li><strong>نابولي بها جزارون حلال:</strong> منطقة بياتسا غاريبالدي بها عدة جزارين حلال ومتاجر شرق أوسطية</li>
</ul>

<div style="background:#0a1628; border-left:4px solid #c49a2a; padding:16px 20px; margin:20px 0; border-radius:0 8px 8px 0; color:#e8e0d0">
<strong style="color:#c49a2a">نصيحة من الداخل:</strong> للمؤن الحلال في نابولي زُر ماتشيليريا إسلاميكا في شارع بولونيا. تزود قبل المغادرة — لا يوجد جزارون حلال على ساحل أمالفي نفسه.
</div>

<h2>النقاط الرئيسية</h2>

<ul>
<li>ساحل أمالفي أفضل من اليخت — الطريق الساحلي مزدحم وأفضل الشواطئ لا يمكن الوصول إليها إلا بالقارب</li>
<li>المسار الكلاسيكي 7 أيام يغطي نابولي وبروتشيدا وإيسكيا وكابري وبوسيتانو وأمالفي</li>
<li>الكهف الأزرق في كابري يُزار صباحاً باكراً مع قاربي خاص لتخطي الطابور</li>
<li>الطعام الحلال عملي عبر المأكولات البحرية والنباتية — تزود باللحوم الحلال من نابولي</li>
<li>مايو-يونيو وسبتمبر أفضل توازن بين الطقس والتوفر والقيمة</li>
</ul>

<p>هل أنت مستعد للإبحار في ساحل أمالفي؟ <a href="/charter-planner" rel="noopener">ابدأ تخطيط رحلتك الإيطالية</a> أو <a href="/destinations/amalfi-coast" rel="noopener">استكشف صفحة وجهة أمالفي</a>.</p>

</article>`,
};

// ─── Article 5: French Riviera Yacht Charter Guide ──────────────────────────

const ARTICLE_5: ZenithaArticle = {
  slug: "french-riviera-yacht-charter-guide",
  title_en: "French Riviera Yacht Charter Guide: Saint-Tropez, Cannes & the Côte d'Azur",
  title_ar: "دليل استئجار اليخوت في الريفييرا الفرنسية: سان تروبيه وكان وكوت دازور",
  meta_title_en: "French Riviera Yacht Charter Guide | Saint-Tropez, Cannes & Monaco",
  meta_title_ar: "دليل استئجار اليخوت في الريفييرا الفرنسية | سان تروبيه وكان",
  meta_description_en: "Plan your French Riviera yacht charter covering Saint-Tropez, Cannes, Antibes and Monaco. Routes, superyacht marinas, costs and halal dining along the Côte d'Azur.",
  meta_description_ar: "خطط لرحلة استئجار يختك في الريفييرا الفرنسية تغطي سان تروبيه وكان وأنتيب وموناكو مع المسارات والتكاليف.",
  category_slug: "destination-guides",
  category_name: "Destination Guides",
  seo_score: 83,
  content_en: `<article>

<h1>French Riviera Yacht Charter Guide: Saint-Tropez, Cannes & the Côte d'Azur</h1>

<p>The French Riviera is where modern yachting was born. When Brigitte Bardot arrived in Saint-Tropez by yacht in 1956, she launched a cultural phenomenon that transformed a quiet fishing village into the world's most glamorous anchorage. Seven decades later, the Côte d'Azur remains the undisputed capital of luxury yachting — more superyachts are concentrated along this 115-kilometre coastline than anywhere else on earth. Having spent considerable time chartering these waters, we can confirm that the Riviera delivers an experience that no other destination matches: the combination of world-class restaurants, legendary nightlife, medieval hilltop villages, crystal-clear swimming, and the sheer spectacle of being surrounded by some of the most beautiful vessels ever built.</p>

<p>This guide covers everything you need to plan a French Riviera yacht charter, from route recommendations and marina logistics to realistic costs and halal dining options.</p>

<h2>Why the French Riviera for a Yacht Charter?</h2>

<p>The Côte d'Azur stretches from Saint-Tropez in the west to the Italian border past Monaco in the east. Within this compact stretch lies an extraordinary concentration of cultural and natural wealth: the medieval perfume town of Grasse, the art museums of Nice, the casino of Monte-Carlo, the film festival of Cannes, the jazz festival of Juan-les-Pins, and the Lérins Islands — two unspoiled nature reserves just 15 minutes from the Cannes red carpet.</p>

<p>The sailing conditions are ideal for charter: prevailing Mistral winds from the northwest provide reliable breezes for sailing, the coast faces south ensuring maximum sunshine, and distances between ports are short — rarely more than 15-20 nautical miles between stops.</p>

<div style="background:#0a1628; border-left:4px solid #c49a2a; padding:16px 20px; margin:20px 0; border-radius:0 8px 8px 0; color:#e8e0d0">
<strong style="color:#c49a2a">Insider Tip:</strong> The Riviera's best-kept secret is the Îles de Lérins — Sainte-Marguerite and Saint-Honorat — directly opposite Cannes. Sainte-Marguerite has eucalyptus forests and the prison of the Man in the Iron Mask. Saint-Honorat is home to Cistercian monks who produce exceptional wine and lavender honey. Anchor between the two islands for lunch — it feels a world away from the Croisette.
</div>

<h2>The Classic French Riviera Route (7 Days)</h2>

<h3>Day 1: Antibes — The Yachting Capital</h3>

<p>Board at <strong>Port Vauban, Antibes</strong> — Europe's largest marina with berths for superyachts up to 163 metres. Port Vauban is where the global yachting industry converges: captains, crew agencies, chandleries, and refit yards. Before departure, walk the ramparts of the 16th-century Vauban fortress, visit the Picasso Museum (the artist lived and worked in the castle), and browse the covered Provençal market on Cours Masséna for provisions.</p>

<h3>Day 2: Cannes & the Lérins Islands</h3>

<p>Cruise 7 nautical miles west to <strong>Cannes</strong>. Pick up a mooring in the Vieux Port facing the Palais des Festivals — the site of the annual film festival. The Boulevard de la Croisette stretches along the waterfront with luxury boutiques and grand hotels. For lunch, anchor between the <strong>Lérins Islands</strong> and swim in water that rivals the Caribbean for clarity.</p>

<h3>Day 3: Saint-Tropez</h3>

<p>The 30-nautical-mile crossing from Cannes to <strong>Saint-Tropez</strong> is the longest leg of the itinerary but rewards with one of the Mediterranean's most iconic arrivals. The old port is tiny — reserved for mega-yachts with connections — so most charter yachts anchor in the bay and tender ashore. Club 55 on Pampelonne Beach is the original beach club (opened 1955, Bardot was a regular), serving rosé and grilled fish to barefoot billionaires.</p>

<div style="background:#0a1628; border-left:4px solid #c49a2a; padding:16px 20px; margin:20px 0; border-radius:0 8px 8px 0; color:#e8e0d0">
<strong style="color:#c49a2a">Insider Tip:</strong> Saint-Tropez's old port berths cost €2,000-€5,000 per night for a 30-40m yacht in July-August and must be booked months ahead through a local agent. The anchorage in Baie des Canoubiers (northeast of the old port) is free and less crowded. Your tender can reach the port in 5 minutes.
</div>

<h3>Day 4: Porquerolles Island</h3>

<p>Sail southeast to <strong>Porquerolles</strong>, the largest of the Hyères Islands and a national park. Cars are banned — the island is explored by bicycle on pine-shaded paths. The Plage Notre-Dame, consistently ranked among France's finest beaches, has turquoise water and white sand backed by maritime pines. Anchor in the bay and spend the day swimming, snorkelling, and cycling to the island's vineyards (yes, they produce rosé on-island).</p>

<h3>Day 5: Saint-Raphaël & the Esterel Massif</h3>

<p>Cruise back east along the dramatic <strong>Esterel coast</strong> — volcanic red porphyry cliffs plunging into deep blue water. The colour contrast is extraordinary and photographs beautifully in late afternoon light. Anchor in one of the calanques (narrow inlets) for a swim stop. Continue to <strong>Saint-Raphaël</strong> for an overnight berth — a more relaxed and affordable alternative to Cannes with excellent restaurants.</p>

<h3>Day 6: Nice & Villefranche-sur-Mer</h3>

<p>A morning cruise to <strong>Nice</strong> — the cultural capital of the Riviera. Walk the Promenade des Anglais, explore the old town's narrow streets, and visit the Matisse Museum or Chagall Museum. In the afternoon, motor 3 nautical miles to <strong>Villefranche-sur-Mer</strong> — a deep natural harbour with a medieval citadel and pastel waterfront that is perhaps the Riviera's most photogenic village.</p>

<h3>Day 7: Monaco & Return</h3>

<p>A short cruise to <strong>Monaco</strong> — the tiny principality that punches far above its weight in luxury. Walk through the casino square, visit the Oceanographic Museum, and watch the superyachts lined up in Port Hercule. Return to Antibes in the afternoon.</p>

<h2>French Riviera Charter Costs 2026</h2>

<p>The French Riviera is the Mediterranean's most expensive charter ground — pricing reflects the destination's prestige and the quality of the fleet:</p>

<ul>
<li><strong>Sailing catamaran 40-50ft (6-8 guests):</strong> €8,000-€15,000/week plus APA</li>
<li><strong>Motor yacht 20-25m (6-8 guests):</strong> €20,000-€50,000/week plus APA (30%)</li>
<li><strong>Motor yacht 30-40m (8-10 guests):</strong> €50,000-€120,000/week plus APA</li>
<li><strong>Superyacht 50m+ (10-12 guests):</strong> €150,000-€500,000+/week plus APA</li>
</ul>

<p>APA typically covers fuel, food, port fees, and water toys. French marina fees are the highest in the Mediterranean — Port Vauban in Antibes charges €800-€1,500/night for a 30m yacht in high season. Saint-Tropez port is even more expensive: €2,000-€5,000/night.</p>

<p>A practical cost-saving tip: base your charter in Antibes or Golfe-Juan (adjacent, less expensive marinas) and visit Saint-Tropez and Monaco as day stops using anchorages instead of port berths. This can save €10,000-€20,000/week on marina fees alone.</p>

<h2>Halal Dining on the French Riviera</h2>

<p>The French Riviera has a significant North African and Middle Eastern community, making halal dining more accessible than you might expect in France:</p>

<ul>
<li><strong>Nice:</strong> The old town and the area around Place Rossetti have several halal restaurants. L'Authentic (Rue de la Préfecture) serves halal French-Moroccan fusion. The Libération market has halal butcher stalls</li>
<li><strong>Cannes:</strong> Le Méchoui du Marché near the Forville market serves excellent Moroccan tagines with halal meat. Several kebab and Middle Eastern restaurants along Rue Meynadier</li>
<li><strong>Antibes:</strong> Fewer dedicated halal restaurants, but Le Sultan in nearby Juan-les-Pins serves North African cuisine</li>
<li><strong>Monaco:</strong> Le Comptoir (Condamine market) and several Middle Eastern restaurants in the Condamine district</li>
<li><strong>Onboard:</strong> Brief your chef to provision from Nice's halal butchers before departure. Most French yacht chefs can create exceptional menus around seafood and halal meat</li>
</ul>

<div style="background:#0a1628; border-left:4px solid #c49a2a; padding:16px 20px; margin:20px 0; border-radius:0 8px 8px 0; color:#e8e0d0">
<strong style="color:#c49a2a">Insider Tip:</strong> The best halal provisioning stop on the Riviera is Nice's Libération market (Tuesday-Sunday mornings). Halal butchers, fresh fish, Provençal vegetables, cheeses, and baked goods — your chef can stock the yacht for the full week in one visit. Arrive before 9am for the best selection.
</div>

<h2>Best Time for a French Riviera Charter</h2>

<ul>
<li><strong>May-June:</strong> Perfect weather (25-28°C), moderate crowds, reasonable pricing. Cannes Film Festival in May brings glamour but congestion</li>
<li><strong>July:</strong> Peak season begins. The Monaco Grand Prix atmosphere lingers. Temperatures 28-32°C. All beach clubs and restaurants operating</li>
<li><strong>August:</strong> Maximum glamour and maximum prices. Saint-Tropez, Cannes, and Monaco are packed. Book 6-12 months ahead. Expect Mistral wind days</li>
<li><strong>September:</strong> The insider's choice — summer warmth, half the crowds, 20-30% lower charter rates. The Monaco Yacht Show (late September) brings the world's most spectacular vessels to Port Hercule</li>
<li><strong>October:</strong> Shoulder season. Many beach clubs close, but weather remains pleasant (22-25°C) and the coast is peaceful. Excellent for a relaxed cruise</li>
</ul>

<h2>Marinas and Embarkation Points</h2>

<ul>
<li><strong>Antibes — Port Vauban:</strong> Europe's largest marina. Best infrastructure, most charter fleet based here. 25 min from Nice Airport (NCE)</li>
<li><strong>Cannes — Vieux Port:</strong> Central location, walking distance to everything. Limited berths for yachts over 50m</li>
<li><strong>Golfe-Juan:</strong> Between Antibes and Cannes, less expensive, quieter. Napoleon landed here in 1815</li>
<li><strong>Nice — Port Lympia:</strong> City-centre marina with good restaurants. Convenient for Nice Airport</li>
<li><strong>Monaco — Port Hercule:</strong> Prestigious but expensive. Grand Prix circuit runs along the port</li>
</ul>

<h2>Key Takeaways</h2>

<ul>
<li>The French Riviera is yachting's spiritual home — unmatched concentration of culture, cuisine, and glamour</li>
<li>The classic 7-day route covers Antibes, Cannes, Lérins Islands, Saint-Tropez, Porquerolles, Nice, and Monaco</li>
<li>Use anchorages instead of port berths at Saint-Tropez and Monaco to save €10,000-€20,000/week</li>
<li>Halal dining is accessible — Nice has the best halal provisioning market on the coast</li>
<li>September is the insider's pick: summer warmth, half the crowds, and the Monaco Yacht Show</li>
<li>Base your charter in Antibes (Port Vauban) for the best fleet selection and airport access</li>
</ul>

<p>Ready to experience the Côte d'Azur from the water? <a href="/charter-planner" rel="noopener">Start planning your French Riviera charter</a> or <a href="/destinations/french-riviera" rel="noopener">explore our French Riviera destination page</a>.</p>

</article>`,
  content_ar: `<article>

<h1>دليل استئجار اليخوت في الريفييرا الفرنسية: سان تروبيه وكان وكوت دازور</h1>

<p>الريفييرا الفرنسية هي مهد اليخوت الحديثة. عندما وصلت بريجيت باردو إلى سان تروبيه بيخت عام 1956 أطلقت ظاهرة ثقافية حولت قرية صيد هادئة إلى أكثر مرسى سحراً في العالم. بعد سبعة عقود لا تزال كوت دازور عاصمة اليخوت الفاخرة بلا منازع — تتركز يخوت فائقة على هذا الساحل البالغ طوله 115 كيلومتراً أكثر من أي مكان آخر على وجه الأرض.</p>

<h2>لماذا الريفييرا الفرنسية؟</h2>

<p>تمتد كوت دازور من سان تروبيه غرباً إلى الحدود الإيطالية شرقاً عبر موناكو. ضمن هذا الامتداد المدمج يكمن تركيز استثنائي من الثروة الثقافية والطبيعية: مدينة العطور غراس ومتاحف نيس الفنية وكازينو مونت كارلو ومهرجان كان السينمائي وجزر ليران المحمية.</p>

<div style="background:#0a1628; border-left:4px solid #c49a2a; padding:16px 20px; margin:20px 0; border-radius:0 8px 8px 0; color:#e8e0d0">
<strong style="color:#c49a2a">نصيحة من الداخل:</strong> سر الريفييرا الأفضل هو جزر ليران — سانت مارغريت وسانت أونورا — مقابل كان مباشرة. رسو بين الجزيرتين للغداء يبدو وكأنه عالم بعيد عن الكروازيت.
</div>

<h2>المسار الكلاسيكي (7 أيام)</h2>

<p><strong>اليوم الأول: أنتيب.</strong> الصعود في بورت فوبان — أكبر مرسى في أوروبا. زيارة متحف بيكاسو والسوق البروفنسالي.</p>

<p><strong>اليوم الثاني: كان وجزر ليران.</strong> المرسى القديم مقابل قصر المهرجانات. الرسو بين جزر ليران للسباحة في مياه تنافس الكاريبي.</p>

<p><strong>اليوم الثالث: سان تروبيه.</strong> العبور 30 ميلاً بحرياً يكافأ بأحد أكثر الوصولات شهرة في المتوسط. نادي 55 على شاطئ بامبلون هو النادي الشاطئي الأصلي.</p>

<p><strong>اليوم الرابع: جزيرة بوركيرول.</strong> حديقة وطنية محظورة على السيارات. شاطئ نوتردام من أجمل شواطئ فرنسا. كروم العنب تنتج نبيذاً وردياً في الجزيرة.</p>

<p><strong>اليوم الخامس: سان رافائيل وكتلة إستريل.</strong> منحدرات بركانية حمراء تنغمس في الماء الأزرق العميق. الرسو في إحدى الكالانك للسباحة.</p>

<p><strong>اليوم السادس: نيس وفيلفرانش سور مير.</strong> العاصمة الثقافية للريفييرا مع بروميناد ديزانغليه والمدينة القديمة. ثم فيلفرانش — ربما أجمل قرية على الريفييرا.</p>

<p><strong>اليوم السابع: موناكو والعودة.</strong> الإمارة الصغيرة مع ساحة الكازينو والمتحف البحري ويخوت بورت هيركول الفائقة.</p>

<h2>تكاليف الاستئجار 2026</h2>

<ul>
<li><strong>كاتاماران شراعي (6-8 ضيوف):</strong> 8,000-15,000 يورو/أسبوع + APA</li>
<li><strong>يخت محرك 20-25م:</strong> 20,000-50,000 يورو/أسبوع + APA</li>
<li><strong>يخت محرك 30-40م:</strong> 50,000-120,000 يورو/أسبوع + APA</li>
<li><strong>يخت فائق 50م+:</strong> 150,000-500,000+ يورو/أسبوع + APA</li>
</ul>

<p>نصيحة توفير: اتخذ أنتيب أو غولف جوان قاعدتك وزر سان تروبيه وموناكو كمحطات يومية باستخدام المراسي بدلاً من الموانئ — يوفر 10,000-20,000 يورو/أسبوع.</p>

<h2>الطعام الحلال على الريفييرا الفرنسية</h2>

<p>الريفييرا الفرنسية بها مجتمع كبير من شمال أفريقيا والشرق الأوسط مما يجعل الطعام الحلال أكثر سهولة مما قد تتوقع:</p>

<ul>
<li><strong>نيس:</strong> عدة مطاعم حلال في المدينة القديمة. سوق ليبيراسيون به أكشاك جزارين حلال</li>
<li><strong>كان:</strong> لو ميشوي دو مارشيه قرب سوق فورفيل يقدم طواجن مغربية بلحم حلال</li>
<li><strong>موناكو:</strong> لو كومبتوار ومطاعم شرق أوسطية في حي كوندامين</li>
</ul>

<div style="background:#0a1628; border-left:4px solid #c49a2a; padding:16px 20px; margin:20px 0; border-radius:0 8px 8px 0; color:#e8e0d0">
<strong style="color:#c49a2a">نصيحة من الداخل:</strong> أفضل محطة تموين حلال على الريفييرا هي سوق ليبيراسيون في نيس (الثلاثاء-الأحد صباحاً). جزارون حلال وسمك طازج وخضروات بروفنسالية — يمكن لطاهيك تموين اليخت لأسبوع كامل في زيارة واحدة.
</div>

<h2>أفضل وقت للإبحار</h2>

<ul>
<li><strong>مايو-يونيو:</strong> طقس مثالي وحشود معتدلة وأسعار معقولة</li>
<li><strong>يوليو-أغسطس:</strong> الذروة — أقصى سحر وأقصى أسعار</li>
<li><strong>سبتمبر:</strong> اختيار المطلعين — دفء الصيف ونصف الحشود ومعرض موناكو لليخوت</li>
<li><strong>أكتوبر:</strong> موسم الكتف — طقس لطيف وساحل هادئ</li>
</ul>

<h2>النقاط الرئيسية</h2>

<ul>
<li>الريفييرا الفرنسية هي الموطن الروحي لليخوت — تركيز لا مثيل له من الثقافة والمطبخ والسحر</li>
<li>المسار الكلاسيكي 7 أيام يغطي أنتيب وكان وسان تروبيه وبوركيرول ونيس وموناكو</li>
<li>استخدم المراسي بدلاً من الموانئ في سان تروبيه وموناكو لتوفير كبير</li>
<li>الطعام الحلال متاح — نيس بها أفضل سوق تموين حلال على الساحل</li>
<li>سبتمبر اختيار المطلعين: دفء الصيف ومعرض موناكو لليخوت</li>
</ul>

<p>هل أنت مستعد لتجربة كوت دازور من الماء؟ <a href="/charter-planner" rel="noopener">ابدأ تخطيط رحلتك في الريفييرا الفرنسية</a> أو <a href="/destinations/french-riviera" rel="noopener">استكشف صفحة وجهة الريفييرا الفرنسية</a>.</p>

</article>`,
};

export const BATCH1_ARTICLES: ZenithaArticle[] = [ARTICLE_1, ARTICLE_2, ARTICLE_3, ARTICLE_4, ARTICLE_5];
