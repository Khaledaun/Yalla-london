'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Star, MapPin, Phone, Globe, Search, ChevronDown, ChevronUp, Utensils, Users, CalendarCheck, ShoppingBag, Banknote, Train } from 'lucide-react'
import { useLanguage } from '@/components/language-provider'
import { getPageAffiliateLink, type AffiliateCategory } from '@/lib/affiliate/page-affiliate-links'
import { TriBar, BrandButton, BrandTag, BrandCardLight, SectionLabel, WatermarkStamp, Breadcrumbs } from '@/components/brand-kit'

const recommendations = [
  {
    id: '1',
    name_en: 'The Dorchester',
    name_ar: 'دورتشستر',
    type: 'hotel',
    description_en: 'Overlooking Hyde Park since 1931, The Dorchester is London\'s crown jewel of hospitality. Home to Alain Ducasse\'s three-Michelin-starred restaurant serving exquisite French haute cuisine, a world-class spa with nine treatment rooms, and the legendary Promenade afternoon tea beneath marble columns. The Penthouse Suite offers a private terrace overlooking the park, while the rooftop bar provides panoramic views across Mayfair. The hotel\'s legendary concierge team arranges everything from private shopping appointments at Harrods to helicopter transfers.',
    description_ar: 'يطل على هايد بارك منذ 1931، دورتشستر هو جوهرة تاج لندن في الضيافة. يضم مطعم آلان دوكاس الحائز على ثلاث نجوم ميشلان الذي يقدم أرقى المأكولات الفرنسية، وسبا عالمي بتسع غرف علاج، وشاي بعد الظهر الأسطوري تحت أعمدة الرخام في البروميناد. جناح البنتهاوس يوفر شرفة خاصة تطل على الحديقة، بينما بار السطح يقدم إطلالات بانورامية على مايفير. فريق الكونسيرج الأسطوري يرتب كل شيء من مواعيد تسوق خاصة في هارودز إلى نقل بطائرة هليكوبتر.',
    address_en: 'Park Lane, Mayfair, London W1K 1QA',
    address_ar: 'بارك لين، مايفير، لندن W1K 1QA',
    rating: 4.9,
    price_range: '£650-3,500',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80',
    features_en: ['Michelin-Starred Dining', 'Hyde Park Views', 'World-Class Spa', 'Butler Service'],
    features_ar: ['مطعم بنجمة ميشلان', 'إطلالة هايد بارك', 'سبا عالمي', 'خدمة الخادم الشخصي'],
    phone: '+44 20 7629 8888',
    website: 'https://www.dorchestercollection.com/london/the-dorchester',
    insiderTip: 'Request a Park Suite on the 7th floor for the best unobstructed Hyde Park views. The Promenade afternoon tea is less crowded on weekday mornings — book the 11am slot for a quieter experience.',
    gccFeatures: ['Arabic-speaking concierge available 24/7', 'Halal room service menu on request', 'Prayer mats provided in-room', 'Family suites with interconnecting doors', 'Walking distance to Edgware Road halal restaurants'],
    bestFor: ['Gulf families seeking five-star luxury', 'Couples celebrating special occasions', 'Business travellers in Mayfair'],
  },
  {
    id: '2',
    name_en: 'Sketch — The Lecture Room & Library',
    name_ar: 'سكيتش — قاعة المحاضرات والمكتبة',
    type: 'restaurant',
    description_en: 'A Michelin-starred culinary journey inside a surreal Mayfair townhouse designed by artist Martin Creed. The Lecture Room & Library on the first floor serves dazzling modern French cuisine with foie gras, Wagyu beef, and intricate tasting menus that change with the seasons. Downstairs, the Gallery — David Shrigley\'s candy-pink dining room with 239 original artworks on the walls — has become London\'s most photographed restaurant interior. The egg-shaped pods in the bathroom are an experience unto themselves. Sketch also houses the Parlour for patisserie, the Glade for afternoon tea, and the East Bar for late-night cocktails — each room a completely different artistic universe.',
    description_ar: 'رحلة طهوية حائزة على نجمة ميشلان داخل منزل مايفير السريالي الذي صممه الفنان مارتن كريد. تقدم قاعة المحاضرات والمكتبة في الطابق الأول مأكولات فرنسية حديثة مبهرة تشمل فوا غرا ولحم واغيو وقوائم تذوق معقدة تتغير مع المواسم. في الأسفل، المعرض — غرفة الطعام الوردية لديفيد شريغلي بـ239 عملًا فنيًا أصليًا — أصبح أكثر مطاعم لندن تصويرًا. كبسولات البيض في الحمام تجربة بحد ذاتها. يضم سكيتش أيضًا البارلور للحلويات والغليد لشاي بعد الظهر وبار الشرق للكوكتيلات المسائية — كل غرفة عالم فني مختلف تمامًا.',
    address_en: '9 Conduit Street, Mayfair, London W1S 2XG',
    address_ar: '9 شارع كوندويت، مايفير، لندن W1S 2XG',
    rating: 4.7,
    price_range: '£120-300',
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80',
    features_en: ['Michelin Star', 'Art Installation', 'Afternoon Tea', 'Cocktail Bar'],
    features_ar: ['نجمة ميشلان', 'معرض فني', 'شاي بعد الظهر', 'بار كوكتيل'],
    phone: '+44 20 7659 4500',
    website: 'https://sketch.london',
    insiderTip: 'Book the Gallery for lunch rather than dinner — same iconic pink room at roughly half the price. For the Lecture Room, request the corner table by the window for the most intimate setting. The Parlour downstairs does walk-ins and serves the best pastries in Mayfair.',
    gccFeatures: ['Seafood and vegetarian tasting menus available (no pork)', 'Non-alcoholic cocktail programme in all bars', 'Private dining rooms for family groups up to 12', 'Arabic-speaking staff available on request', 'Walking distance from Bond Street luxury shopping'],
    bestFor: ['Couples seeking a unique dining experience', 'Instagram-savvy travellers', 'Fashion-conscious diners in Mayfair'],
  },
  {
    id: '3',
    name_en: 'Harrods',
    name_ar: 'هارودز',
    type: 'attraction',
    description_en: 'The world\'s most famous luxury department store in Knightsbridge, spanning over one million square feet across 330 departments on seven floors. The Food Halls are a destination unto themselves — hand-decorated cakes, aged Wagyu, artisanal cheeses, and a dedicated halal butcher counter that sources high-quality British lamb and chicken. The Shoe Heaven on the fifth floor is the largest shoe salon in Europe, and the Fine Jewellery Room showcases Cartier, Bulgari, and Van Cleef & Arpels under a gilded ceiling. The by-appointment Personal Shopping Suite on the fifth floor provides private stylists, refreshments, and direct access to pieces not on the shop floor.',
    description_ar: 'أشهر متجر فاخر في العالم في نايتسبريدج، يمتد على أكثر من مليون قدم مربع عبر 330 قسمًا في سبعة طوابق. قاعات الطعام وجهة بحد ذاتها — كعك مزخرف يدويًا ولحم واغيو معتق وأجبان حرفية وكاونتر جزار حلال مخصص يوفر لحم ضأن ودجاج بريطاني عالي الجودة. جنة الأحذية في الطابق الخامس هي أكبر صالون أحذية في أوروبا، وغرفة المجوهرات الفاخرة تعرض كارتييه وبولغاري وفان كليف أند آربلز تحت سقف مذهب. جناح التسوق الشخصي في الطابق الخامس بموعد مسبق يوفر مصممين خاصين ومرطبات ووصولًا مباشرًا لقطع غير معروضة.',
    address_en: '87-135 Brompton Road, Knightsbridge, London SW1X 7XL',
    address_ar: '87-135 طريق برومبتون، نايتسبريدج، لندن SW1X 7XL',
    rating: 4.6,
    price_range: '£50-50,000+',
    image: 'https://images.unsplash.com/photo-1513467535987-fd81bc7d62f8?w=600&q=80',
    features_en: ['Personal Shopping', 'Food Halls', 'Luxury Brands', 'Beauty Concierge'],
    features_ar: ['تسوق شخصي', 'قاعات الطعام', 'علامات فاخرة', 'كونسيرج الجمال'],
    phone: '+44 20 7730 1234',
    website: 'https://www.harrods.com',
    insiderTip: 'Visit on a weekday morning before 11am for the calmest experience — weekends and school holidays are extremely crowded. The Harrods Rewards card gives you 10% back as points and is free to sign up. Ask at the Ground Floor concierge for the Tax Refund desk location to reclaim 16.5% VAT on purchases over £30.',
    gccFeatures: ['Dedicated halal butcher in the Food Halls', 'Arabic-speaking personal shoppers available', 'Prayer room on the lower ground floor', 'Tax-free shopping desk for GCC passport holders', 'Abaya-friendly fitting rooms in womenswear departments'],
    bestFor: ['Luxury shoppers and fashion lovers', 'Families looking for a full-day destination', 'Foodies exploring the Food Halls'],
  },
  {
    id: '4',
    name_en: "Claridge's",
    name_ar: 'كلاريدجز',
    type: 'hotel',
    description_en: 'Art Deco elegance meets modern luxury in this Mayfair institution, favoured by royalty and heads of state since the 1850s. The lobby\'s black-and-white chequered marble floor and Dale Chihuly chandelier set the tone for an experience that is both theatrical and deeply refined. Gordon Ramsay at Claridge\'s delivers impeccable modern British cuisine, while the Foyer & Reading Room hosts one of London\'s most sought-after afternoon teas — finger sandwiches, freshly baked scones, and a rolling trolley of patisserie. The suites preserve original 1930s Deco details including chevron mirrors and lacquered panelling, yet come with every modern comfort: Bose sound systems, marble rain showers, and a dedicated butler who unpacks your luggage and presses your clothes upon arrival.',
    description_ar: 'أناقة آرت ديكو تلتقي بالفخامة الحديثة في هذه المؤسسة العريقة في مايفير، المفضلة لدى الملوك ورؤساء الدول منذ 1850. أرضية الرخام بالأبيض والأسود في اللوبي وثريا ديل تشيهولي تحدد أجواء تجربة مسرحية وراقية في آن واحد. مطعم غوردون رامزي في كلاريدجز يقدم مأكولات بريطانية حديثة لا تشوبها شائبة، بينما البهو وغرفة القراءة يستضيفان أحد أكثر حفلات الشاي طلبًا في لندن — سندويشات صغيرة وسكونز طازجة وعربة حلويات متنقلة. الأجنحة تحافظ على تفاصيل ديكو الأصلية من الثلاثينيات مع مرايا متعرجة وألواح مطلية، لكنها مجهزة بكل وسائل الراحة الحديثة: أنظمة صوت بوز ودش رخامي وخادم شخصي يفرغ حقائبك ويكوي ملابسك عند الوصول.',
    address_en: 'Brook Street, Mayfair, London W1K 4HR',
    address_ar: 'شارع بروك، مايفير، لندن W1K 4HR',
    rating: 4.9,
    price_range: '£580-4,000',
    image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600&q=80',
    features_en: ['Art Deco Design', 'Gordon Ramsay', 'Afternoon Tea', 'Butler Service'],
    features_ar: ['تصميم آرت ديكو', 'غوردون رامزي', 'شاي بعد الظهر', 'خادم شخصي'],
    phone: '+44 20 7629 8860',
    website: 'https://www.claridges.co.uk',
    insiderTip: 'The afternoon tea books out weeks in advance — reserve the moment you confirm your trip. Ask for a table in the Foyer rather than the Reading Room for the full Deco ambience. The Davies & Brook restaurant by Daniel Humm is also superb and often easier to book than Gordon Ramsay\'s.',
    gccFeatures: ['Halal breakfast options available on request', 'Arabic-speaking front desk and concierge', 'Family interconnecting suites on upper floors', 'Steps from Bond Street and Selfridges shopping', 'Discreet VIP entrance on Davies Street for privacy'],
    bestFor: ['Royalty-level travellers who value heritage', 'Couples on a luxury London getaway', 'Fashion enthusiasts near Bond Street'],
  },
  {
    id: '5',
    name_en: 'Dinner by Heston Blumenthal',
    name_ar: 'دينر باي هيستون بلومنثال',
    type: 'restaurant',
    description_en: 'A two-Michelin-starred celebration of British culinary history inside the Mandarin Oriental, Hyde Park. Chef Heston Blumenthal has researched recipes dating back to the 14th century and reinterprets them with cutting-edge molecular techniques. The signature Meat Fruit starter — a mandarin-shaped chicken liver parfait encased in a glistening citrus jelly — has become one of London\'s most iconic dishes. The Tipsy Cake, a brioche soaked in spit-roasted pineapple juices, closes every meal perfectly. Floor-to-ceiling windows frame Hyde Park views while an open kitchen lets you watch the brigade at work. The fixed lunch menu at £50 is exceptional value for cooking of this calibre.',
    description_ar: 'احتفال بنجمتي ميشلان بتاريخ الطهي البريطاني داخل ماندارين أورينتال، هايد بارك. بحث الشيف هيستون بلومنثال في وصفات تعود للقرن الرابع عشر وأعاد تفسيرها بتقنيات جزيئية متطورة. مقبلة فاكهة اللحم المميزة — بارفيه كبد دجاج على شكل يوسفي مغلف بهلام حمضيات لامع — أصبحت من أكثر أطباق لندن شهرة. كعكة تيبسي، بريوش مشبع بعصائر الأناناس المشوي، تختتم كل وجبة بشكل مثالي. نوافذ ممتدة من الأرض للسقف تؤطر مناظر هايد بارك بينما المطبخ المفتوح يتيح لك مشاهدة الفريق وهو يعمل. قائمة الغداء الثابتة بـ50 جنيهًا قيمة استثنائية لطهي بهذا المستوى.',
    address_en: 'Mandarin Oriental, 66 Knightsbridge, London SW1X 7LA',
    address_ar: 'ماندارين أورينتال، 66 نايتسبريدج، لندن SW1X 7LA',
    rating: 4.8,
    price_range: '£80-200',
    image: 'https://images.unsplash.com/photo-1550966871-3ed3cdb51f3a?w=600&q=80',
    features_en: ['Two Michelin Stars', 'Historic Recipes', 'Park Views', 'Tasting Menu'],
    features_ar: ['نجمتا ميشلان', 'وصفات تاريخية', 'إطلالة الحديقة', 'قائمة تذوق'],
    phone: '+44 20 7201 3833',
    website: 'https://www.dinnerbyheston.co.uk',
    insiderTip: 'The set lunch menu is one of London\'s best-kept secrets — two Michelin stars for £50. Book a window table on the park side for the best views. Ask the sommelier about the English wine pairing — the sparkling options rival Champagne and make a great conversation piece.',
    gccFeatures: ['Extensive seafood and vegetarian dishes (no pork on the main menu)', 'Non-alcoholic pairing menu available on request', 'Located inside Mandarin Oriental with direct hotel access', 'Private dining room seats up to 12 guests', 'Concierge can arrange halal meat alternatives with 48h notice'],
    bestFor: ['Serious food lovers and culinary adventurers', 'Couples celebrating anniversaries', 'Business dining in a Knightsbridge setting'],
  },
  {
    id: '6',
    name_en: 'The View from The Shard',
    name_ar: 'المنظر من ذا شارد',
    type: 'attraction',
    description_en: 'Western Europe\'s highest viewing platform at 244 metres above street level, occupying floors 68 to 72 of Renzo Piano\'s iconic glass spire. On a clear day the panorama stretches 40 miles in every direction — Tower Bridge, St Paul\'s Cathedral, Wembley Stadium, and the rolling Surrey hills are all visible from the open-air Sky Deck. Digital interactive telescopes overlay historical views and identify landmarks in real time. Level 69 houses a bar serving cocktails and mocktails alongside sharing platters. The experience takes roughly 90 minutes, and the golden-hour sunset slot is the most spectacular — you watch the city transition from daylight to a glittering carpet of lights below.',
    description_ar: 'أعلى منصة مشاهدة في أوروبا الغربية على ارتفاع 244 مترًا فوق مستوى الشارع، تحتل الطوابق 68 إلى 72 من برج رينزو بيانو الزجاجي الأيقوني. في يوم صاف تمتد البانوراما 64 كم في كل اتجاه — جسر البرج وكاتدرائية سانت بول وملعب ويمبلي وتلال سَري الخضراء كلها مرئية من سطح السماء المفتوح. تلسكوبات تفاعلية رقمية تعرض مناظر تاريخية وتحدد المعالم في الوقت الحقيقي. الطابق 69 يضم بارًا يقدم كوكتيلات وعصائر غير كحولية مع أطباق للمشاركة. التجربة تستغرق نحو 90 دقيقة، وموعد غروب الشمس الذهبي هو الأكثر روعة — تشاهد المدينة تتحول من النهار إلى سجادة متلألئة من الأضواء.',
    address_en: '32 London Bridge Street, London SE1 9SG',
    address_ar: '32 شارع جسر لندن، لندن SE1 9SG',
    rating: 4.5,
    price_range: '£28-40',
    image: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=600&q=80',
    features_en: ['360° Views', 'Open-Air Sky Deck', 'Champagne Bar', 'Interactive Telescopes'],
    features_ar: ['إطلالات 360°', 'سطح سماء مفتوح', 'بار شامبانيا', 'تلسكوبات تفاعلية'],
    phone: '+44 844 499 7111',
    website: 'https://www.the-shard.com/viewing-gallery',
    insiderTip: 'Book the sunset time slot — you pay the same price but see London in daylight AND lit up at night. Buy tickets online at least a week ahead for up to 20% off walk-up prices. If staying at Shangri-La The Shard, hotel guests receive complimentary access.',
    gccFeatures: ['Non-alcoholic beverages and mocktails at the bar', 'Family-friendly with no age restrictions', 'Lift access to all viewing levels (fully accessible)', 'Quieter early-morning slots ideal for families with young children', 'Borough Market halal street food options a 2-minute walk away'],
    bestFor: ['Families with children who love heights', 'First-time London visitors for orientation', 'Photography enthusiasts and sunset chasers'],
  },
  {
    id: '7',
    name_en: 'The Connaught',
    name_ar: 'كونوت',
    type: 'hotel',
    description_en: 'Understated perfection on a quiet Mayfair square, where centuries of English hospitality tradition meet contemporary design by India Mahdavi. The Connaught Bar — wrapped in platinum-silver leaf walls and Cuban mahogany — has been named World\'s Best Bar multiple years running and serves cocktails sculpted by master mixologist Agostino Perrone. Hélène Darroze\'s two-Michelin-starred restaurant brings the bold flavours of southwest France to Mayfair with seasonal tasting menus that change weekly. The Aman Spa, the only one inside a hotel outside Asia, offers holistic treatments in a serene subterranean space. Rooms blend Georgian architecture with mid-century furniture, Connolly leather headboards, and rain showers lined in Italian marble.',
    description_ar: 'كمال هادئ في ميدان مايفير الهادئ، حيث تلتقي قرون من تقاليد الضيافة الإنجليزية بالتصميم المعاصر لإنديا مهدوي. بار كونوت — المغلف بجدران من أوراق البلاتين الفضي وخشب الماهوغاني الكوبي — سُمي أفضل بار في العالم لسنوات متتالية ويقدم كوكتيلات ينحتها خبير المشروبات أغوستينو بيروني. مطعم هيلين داروز بنجمتي ميشلان يجلب نكهات جنوب غرب فرنسا الجريئة إلى مايفير مع قوائم تذوق موسمية تتغير أسبوعيًا. سبا آمان، الوحيد داخل فندق خارج آسيا، يقدم علاجات شاملة في مساحة هادئة تحت الأرض. الغرف تمزج العمارة الجورجية مع أثاث منتصف القرن ورؤوس أسِرَّة من جلد كونولي ودش مطري بالرخام الإيطالي.',
    address_en: 'Carlos Place, Mayfair, London W1K 2AL',
    address_ar: 'كارلوس بلايس، مايفير، لندن W1K 2AL',
    rating: 4.9,
    price_range: '£690-5,000',
    image: 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=600&q=80',
    features_en: ['World\'s Best Bar', 'Aman Spa', 'Michelin Dining', 'Butler Service'],
    features_ar: ['أفضل بار في العالم', 'سبا آمان', 'مطعم ميشلان', 'خادم شخصي'],
    phone: '+44 20 7499 7070',
    website: 'https://www.the-connaught.co.uk',
    insiderTip: 'The Connaught Bar takes reservations only 2 weeks in advance — set a reminder. For a more relaxed drink, the Coburg Bar next door is equally elegant and easier to walk into. Request a Mount Street-facing room for the loveliest neighbourhood views in Mayfair.',
    gccFeatures: ['Aman Spa single-sex treatment sessions on request', 'Halal dining options arranged through concierge with advance notice', 'Extremely private and discreet — no paparazzi culture', 'Butler service in all suites unpacks and presses garments', 'Two minutes walk from Mount Street luxury boutiques (Balenciaga, Christian Louboutin)'],
    bestFor: ['Discerning travellers who prefer quiet luxury over flash', 'Spa lovers seeking the Aman experience', 'Repeat London visitors who have outgrown the big-name hotels'],
  },
  {
    id: '8',
    name_en: 'NOBU London',
    name_ar: 'نوبو لندن',
    type: 'restaurant',
    description_en: 'The original London outpost of Nobu Matsuhisa\'s globally celebrated Japanese-Peruvian fusion concept, nestled inside the Metropolitan Hotel on Old Park Lane overlooking Hyde Park Corner. The Black Cod with Miso — sweet, buttery, and caramelised to perfection — remains one of the most ordered dishes in London fine dining over two decades after it was first served here. The yellowtail sashimi with jalapeño, rock shrimp tempura, and the Wagyu tataki are equally essential. The Omakase experience lets the chef curate seven to nine courses that showcase the freshest fish from Tsukiji and Peru. The dining room hums with a glamorous Mayfair energy — this is where celebrities, fashion editors, and Gulf royalty dine side by side. Late-night the lounge transforms into a cocktail destination with sake-based creations.',
    description_ar: 'الفرع الأصلي في لندن لمفهوم نوبو ماتسوهيسا الياباني-البيروفي المشهور عالميًا، داخل فندق متروبوليتان على أولد بارك لين المطل على هايد بارك كورنر. سمك القد الأسود بالميسو — حلو وزبدي ومكرمل بإتقان — يظل أحد أكثر الأطباق طلبًا في المطاعم الراقية بلندن منذ أكثر من عقدين. ساشيمي الهمور مع الهالابينو وتمبورا الروبيان الصخري وتاتاكي الواغيو بنفس الأهمية. تجربة الأوماكاسي تتيح للشيف تصميم سبع إلى تسع أطباق تعرض أطزج الأسماك من تسوكيجي وبيرو. غرفة الطعام تنبض بطاقة مايفير الساحرة — هنا يتناول المشاهير ومحررو الأزياء والملوك الخليجيون الطعام جنبًا إلى جنب.',
    address_en: 'Metropolitan Hotel, 19 Old Park Lane, London W1K 1LB',
    address_ar: 'فندق متروبوليتان، 19 أولد بارك لين، لندن W1K 1LB',
    rating: 4.6,
    price_range: '£80-200',
    image: 'https://images.unsplash.com/photo-1579027989536-b7b1f875659b?w=600&q=80',
    features_en: ['Japanese-Peruvian Cuisine', 'Celebrity Scene', 'Omakase Menu', 'Cocktail Bar'],
    features_ar: ['مطبخ ياباني-بيروفي', 'أجواء المشاهير', 'قائمة أوماكاسي', 'بار كوكتيل'],
    phone: '+44 20 7447 4747',
    website: 'https://www.noburestaurants.com/london',
    insiderTip: 'The Omakase at the bar counter is the best seat in the house — you watch the chefs work and often receive bonus dishes. Friday and Saturday evenings book out two weeks ahead; Thursday is the sweet spot for atmosphere without the wait. Skip dessert and walk to Sketch for pastries instead.',
    gccFeatures: ['Entirely seafood-focused menu — naturally halal-friendly', 'Non-alcoholic sake and mocktail programme', 'Private tatami-style dining room for up to 8 guests', 'Popular with Gulf royalty and GCC business community', 'Valet parking available through the Metropolitan Hotel'],
    bestFor: ['Sushi and seafood aficionados', 'Social diners who enjoy a buzzy atmosphere', 'Business entertaining in a see-and-be-seen setting'],
  },
  {
    id: '9',
    name_en: 'Kensington Palace',
    name_ar: 'قصر كنسينغتون',
    type: 'attraction',
    description_en: 'The official London residence of the Prince and Princess of Wales, set within the tree-lined avenues of Kensington Gardens. The King\'s State Apartments showcase Georgian splendour with ceiling murals by William Kent, while the Queen\'s Apartments trace the life of Queen Victoria from her childhood bedroom where she learned she would become queen. Rotating fashion exhibitions — including pieces from Princess Diana\'s personal wardrobe — draw visitors from around the world. Outside, the Sunken Garden was redesigned as a memorial to Princess Diana with over 12,000 flowers surrounding a tranquil reflecting pool. The Orangery and adjacent Pavilion café serve afternoon tea with views across the palace\'s formal gardens. A walk through Kensington Gardens to the Round Pond and the Peter Pan statue completes the experience.',
    description_ar: 'المقر الرسمي في لندن لأمير وأميرة ويلز، داخل أجواء حدائق كنسينغتون المظللة بالأشجار. شقق الملك الرسمية تعرض روعة العمارة الجورجية مع لوحات سقف لوليام كينت، بينما شقق الملكة تروي حياة الملكة فيكتوريا من غرفة نومها في الطفولة حيث علمت أنها ستصبح ملكة. معارض أزياء متنقلة — بما فيها قطع من خزانة الأميرة ديانا الشخصية — تستقطب الزوار من حول العالم. في الخارج، أُعيد تصميم الحديقة الغارقة كنصب تذكاري للأميرة ديانا بأكثر من 12,000 زهرة تحيط ببركة عاكسة هادئة. الأورانجري ومقهى الجناح المجاور يقدمان شاي بعد الظهر مع إطلالات على حدائق القصر الرسمية.',
    address_en: 'Kensington Gardens, London W8 4PX',
    address_ar: 'حدائق كنسينغتون، لندن W8 4PX',
    rating: 4.5,
    price_range: '£21-25',
    image: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=600&q=80',
    features_en: ['Royal Residence', 'State Apartments', 'Fashion Exhibitions', 'Sunken Garden'],
    features_ar: ['مقر ملكي', 'شقق رسمية', 'معارض أزياء', 'الحديقة الغارقة'],
    phone: '+44 33 3320 6000',
    website: 'https://www.hrp.org.uk/kensington-palace',
    insiderTip: 'Buy tickets online in advance to skip the queue — the walk-up line stretches 30+ minutes on summer weekends. Visit the Sunken Garden first thing in the morning when it is empty and the light is best for photos. Combine with a stroll through Kensington Gardens to the Diana Memorial Playground — free and brilliant for children.',
    gccFeatures: ['Modest-dress-friendly — no dress code restrictions', 'Flat accessible paths throughout the gardens for pushchairs and wheelchairs', 'Halal cafés and restaurants on nearby Kensington High Street', 'Under-5s enter free; family tickets available', 'Adjacent to Kensington luxury shopping (Whole Foods, Design Museum)'],
    bestFor: ['Families with children interested in royalty', 'History and fashion enthusiasts', 'Visitors combining culture with Kensington shopping'],
  },
  {
    id: '10',
    name_en: 'Shangri-La The Shard',
    name_ar: 'شانغريلا ذا شارد',
    type: 'hotel',
    description_en: 'London\'s highest hotel occupying floors 34-52 of The Shard, with every room offering floor-to-ceiling views across the entire city skyline. The 52nd-floor infinity pool — the highest in Western Europe — is a glass-walled marvel where you swim above the clouds at dawn. TĪNG restaurant on the 35th floor serves refined Asian-British fusion with a Cantonese roast duck that rivals anything in Hong Kong, plus a weekend dim sum brunch with live piano. GŎNG bar on the 52nd floor mixes cocktails beside vertiginous views of Tower Bridge, St Paul\'s, and the Thames curving east toward Canary Wharf. The hotel\'s CHI Spa draws on traditional Chinese medicine, and the 24-hour gym sits at a height most cities reserve for observation decks.',
    description_ar: 'أعلى فندق في لندن يحتل الطوابق 34-52 من ذا شارد، حيث توفر كل غرفة إطلالات بانورامية من الأرض للسقف على أفق المدينة بالكامل. مسبح الإنفينيتي في الطابق 52 — الأعلى في أوروبا الغربية — تحفة زجاجية تسبح فيها فوق الغيوم عند الفجر. مطعم تينغ في الطابق 35 يقدم مأكولات آسيوية-بريطانية راقية مع بط كانتوني مشوي ينافس أفضل ما في هونغ كونغ، بالإضافة إلى برانش ديم سم في عطلة نهاية الأسبوع مع بيانو حي. بار غونغ في الطابق 52 يقدم كوكتيلات بجانب مناظر مذهلة لجسر البرج وكاتدرائية سانت بول ونهر التيمز المنحني شرقًا نحو كناري وارف. سبا تشي يستند إلى الطب الصيني التقليدي، والجيم يعمل على مدار الساعة على ارتفاع تخصصه معظم المدن لمنصات المراقبة.',
    address_en: '31 St Thomas Street, London SE1 9QU',
    address_ar: '31 شارع سانت توماس، لندن SE1 9QU',
    rating: 4.7,
    price_range: '£450-2,500',
    image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=600&q=80',
    features_en: ['Infinity Pool', 'Panoramic Views', 'TING Restaurant', 'Sky Bar'],
    features_ar: ['مسبح إنفينيتي', 'إطلالات بانورامية', 'مطعم TING', 'بار السماء'],
    phone: '+44 20 7234 8000',
    website: 'https://www.shangri-la.com/london/shangrila',
    insiderTip: 'Book a Shard Premier City View room on floors 40-45 for the best Tower Bridge framing — higher floors look down too steeply. The infinity pool is quietest between 6-8am, and guests get complimentary access to The View from The Shard observation deck on floors 68-72. Sunday dim sum brunch at TĪNG is a local secret — book for 11:30am.',
    gccFeatures: ['Halal room service menu available 24/7', 'Female-only pool and spa sessions on request', 'Prayer mats and qibla direction in all rooms', 'Walking distance to Borough Market halal food stalls', 'Family suites with separate living areas and rollaway beds'],
    bestFor: ['Families wanting a sky-high experience', 'Couples seeking dramatic skyline views', 'Business travellers near London Bridge'],
  },
]

const typeLabels = {
  en: { all: 'All', hotel: 'Hotels', restaurant: 'Restaurants', attraction: 'Attractions' },
  ar: { all: 'الكل', hotel: 'فنادق', restaurant: 'مطاعم', attraction: 'معالم' },
}

export default function RecommendationsPage({ serverLocale }: { serverLocale?: 'en' | 'ar' }) {
  const { language: clientLanguage } = useLanguage()
  const locale = (serverLocale ?? clientLanguage ?? 'en') as 'en' | 'ar'
  const isRTL = locale === 'ar'

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState('all')
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)

  const labels = typeLabels[locale]

  const insiderTips = [
    {
      icon: Utensils,
      title_en: 'Halal Dining Etiquette in London',
      title_ar: 'آداب تناول الطعام الحلال في لندن',
      desc_en: 'Many high-end London restaurants do not advertise halal options but will accommodate requests when asked. Always call ahead to confirm halal meat availability, especially for Michelin-starred venues. Apps like HalalTrip and Zabihah are reliable for finding certified restaurants. During Ramadan, several luxury hotels offer dedicated Iftar and Suhoor menus — book early as these fill quickly with the local Arab community.',
      desc_ar: 'كثير من مطاعم لندن الراقية لا تعلن عن خيارات حلال لكنها تلبي الطلبات عند السؤال. اتصل دائمًا مسبقًا للتأكد من توفر اللحوم الحلال، خاصة في مطاعم ميشلان. تطبيقات مثل HalalTrip وZabihah موثوقة لإيجاد المطاعم المعتمدة. خلال رمضان، تقدم عدة فنادق فاخرة قوائم إفطار وسحور خاصة — احجز مبكرًا لأنها تمتلئ بسرعة.',
    },
    {
      icon: Users,
      title_en: 'Best Neighbourhoods for Arab Families',
      title_ar: 'أفضل الأحياء للعائلات العربية',
      desc_en: 'Knightsbridge and Mayfair remain the top choices for Gulf families, with easy walking access to Harrods, Hyde Park, and halal restaurants on Edgware Road. Kensington offers a quieter alternative with excellent family suites at The Milestone and Royal Garden hotels. Bayswater and Marble Arch feature the highest concentration of Arabic-speaking shops, cafes, and grocery stores — ideal for longer stays where a sense of home matters.',
      desc_ar: 'تبقى نايتسبريدج ومايفير الخيارين الأفضل للعائلات الخليجية، مع سهولة الوصول سيرًا إلى هارودز وهايد بارك ومطاعم حلال في إدجوير رود. كنسينغتون تقدم بديلًا أهدأ مع أجنحة عائلية ممتازة. بايزواتر وماربل آرتش تضم أعلى تركيز للمحلات والمقاهي والبقالات الناطقة بالعربية — مثالية للإقامات الطويلة.',
    },
    {
      icon: CalendarCheck,
      title_en: 'Booking Restaurants During Peak Season',
      title_ar: 'حجز المطاعم في موسم الذروة',
      desc_en: 'London\'s top restaurants book out 4-6 weeks in advance during summer (June-August) when Gulf visitors peak. For Michelin-starred venues like Sketch or Dinner by Heston, book the moment your travel dates are confirmed. Many restaurants release cancellation slots at midnight — check OpenTable or Resy at 00:01 for last-minute availability. Hotel concierges at five-star properties can often secure tables at short notice through their direct relationships.',
      desc_ar: 'تُحجز أفضل مطاعم لندن قبل 4-6 أسابيع خلال الصيف (يونيو-أغسطس) عندما يبلغ زوار الخليج ذروتهم. لمطاعم ميشلان مثل سكيتش أو دينر باي هيستون، احجز فور تأكيد تواريخ سفرك. تطلق كثير من المطاعم مواعيد الإلغاء منتصف الليل — تحقق من OpenTable أو Resy عند 00:01. كونسيرج الفنادق الخمس نجوم يمكنهم تأمين طاولات بإشعار قصير.',
    },
    {
      icon: ShoppingBag,
      title_en: 'Shopping Tax-Free with VAT Refund',
      title_ar: 'التسوق المعفى من الضرائب مع استرداد ضريبة القيمة المضافة',
      desc_en: 'As a non-UK resident, you may be eligible for VAT refund on purchases over a certain threshold. Major stores like Harrods, Selfridges, and Harvey Nichols have dedicated VAT refund desks. Ask for a VAT 407 form at the point of sale, get it stamped at the airport customs desk before departure, and submit it at the refund counter. Digital solutions like Wevat allow you to claim refunds via your phone, often with better rates than traditional paper forms.',
      desc_ar: 'كمقيم خارج المملكة المتحدة، قد تكون مؤهلًا لاسترداد ضريبة القيمة المضافة على المشتريات فوق حد معين. المتاجر الكبرى مثل هارودز وسيلفريدجز وهارفي نيكولز لديها مكاتب مخصصة لاسترداد الضريبة. اطلب نموذج VAT 407 عند الشراء، واحصل على ختمه في مكتب الجمارك بالمطار قبل المغادرة. حلول رقمية مثل Wevat تتيح لك المطالبة عبر هاتفك بأسعار أفضل غالبًا.',
    },
    {
      icon: Banknote,
      title_en: 'Currency Exchange Tips',
      title_ar: 'نصائح تحويل العملات',
      desc_en: 'Avoid exchanging money at Heathrow Airport — rates are consistently 5-8% worse than in central London. The best rates are found at specialist bureaux on Edgware Road and Queensway, where competition keeps margins tight. Contactless payment is accepted virtually everywhere in London including the Tube, buses, and black cabs. Gulf bank cards (Visa/Mastercard) work seamlessly. For larger purchases, TransferWise (Wise) or Revolut offer near-interbank rates with zero markup.',
      desc_ar: 'تجنب تحويل العملات في مطار هيثرو — الأسعار أسوأ بنسبة 5-8% من وسط لندن. أفضل الأسعار في مكاتب الصرافة المتخصصة في إدجوير رود وكوينزواي حيث المنافسة تحافظ على هوامش منخفضة. الدفع بدون تلامس مقبول في كل مكان في لندن بما في ذلك المترو والحافلات وسيارات الأجرة السوداء. بطاقات البنوك الخليجية (فيزا/ماستركارد) تعمل بسلاسة. للمشتريات الكبيرة، Wise أو Revolut تقدم أسعارًا قريبة من سعر البنك المركزي.',
    },
    {
      icon: Train,
      title_en: 'Getting Around London Efficiently',
      title_ar: 'التنقل في لندن بكفاءة',
      desc_en: 'The Elizabeth Line (opened 2022) transformed London travel — it connects Heathrow to Bond Street in 28 minutes and Paddington to Canary Wharf in 17 minutes, all without changing trains. Use a contactless bank card instead of buying an Oyster card; daily and weekly caps are identical and you avoid the £7 deposit. For short trips in central London, black cabs are easiest with families (they fit 5 passengers plus luggage). Uber works well but surge pricing applies during theatre hours (6-8pm).',
      desc_ar: 'خط إليزابيث (افتُتح 2022) غيّر التنقل في لندن — يربط هيثرو ببوند ستريت في 28 دقيقة وبادينغتون بكناري وارف في 17 دقيقة بدون تغيير القطارات. استخدم بطاقة بنكية بدون تلامس بدلًا من شراء بطاقة أويستر؛ الحدود اليومية والأسبوعية متطابقة وتتجنب وديعة 7 جنيهات. للرحلات القصيرة وسط لندن، سيارات الأجرة السوداء الأسهل مع العائلات (تتسع لـ5 ركاب مع أمتعة). أوبر يعمل جيدًا لكن التسعير المرتفع ينطبق خلال ساعات المسرح (6-8 مساءً).',
    },
  ]

  const faqItems = [
    {
      q_en: 'How are these recommendations selected?',
      q_ar: 'كيف يتم اختيار هذه التوصيات؟',
      a_en: 'Our editorial team personally visits and evaluates every venue on this page. We assess quality of service, cultural sensitivity, halal availability, family-friendliness, location convenience, and value for money. Venues must meet our standards across at least four of these six criteria to earn a recommendation. We also incorporate feedback from our community of Arab travellers who share their real experiences with us. No venue can pay for placement — every recommendation is earned through consistent excellence.',
      a_ar: 'يزور فريقنا التحريري شخصيًا ويقيّم كل مكان في هذه الصفحة. نقيّم جودة الخدمة والحساسية الثقافية وتوفر الحلال وملاءمة العائلات وملاءمة الموقع والقيمة مقابل المال. يجب أن تستوفي الأماكن معاييرنا في أربعة على الأقل من هذه المعايير الستة لتحصل على توصية. لا يمكن لأي مكان الدفع للظهور — كل توصية مكتسبة من خلال التميز المستمر.',
    },
    {
      q_en: 'Are all the listed restaurants halal?',
      q_ar: 'هل جميع المطاعم المدرجة حلال؟',
      a_en: 'Not all restaurants on our list are fully halal-certified, but each one either offers halal menu options or can accommodate halal dietary requirements when requested in advance. We clearly note halal availability in each restaurant\'s description and features. For fully halal-certified restaurants, we recommend checking our dedicated halal dining guide which focuses exclusively on certified venues. When in doubt, always call ahead — London\'s top restaurants are experienced in accommodating diverse dietary needs.',
      a_ar: 'ليست جميع المطاعم في قائمتنا معتمدة حلال بالكامل، لكن كل منها إما يقدم خيارات حلال في القائمة أو يمكنه تلبية متطلبات الطعام الحلال عند الطلب مسبقًا. نوضح توفر الحلال في وصف كل مطعم. للمطاعم المعتمدة حلال بالكامل، ننصح بمراجعة دليلنا المخصص للمطاعم الحلال. عند الشك، اتصل دائمًا مسبقًا — أفضل مطاعم لندن لديها خبرة في تلبية الاحتياجات الغذائية المتنوعة.',
    },
    {
      q_en: 'Which areas of London are best for families with children?',
      q_ar: 'ما هي أفضل مناطق لندن للعائلات مع أطفال؟',
      a_en: 'Kensington is our top pick for families — it offers the Natural History Museum, Science Museum, and Victoria & Albert Museum (all free), plus Kensington Gardens and Diana Memorial Playground. South Kensington has excellent family-friendly restaurants and is well-connected by Tube. Knightsbridge combines shopping (Harrods) with Hyde Park activities including boating, cycling, and the Serpentine Gallery. For older children, the South Bank area offers the London Eye, SEA LIFE Aquarium, and Shrek\'s Adventure, all within walking distance of each other.',
      a_ar: 'كنسينغتون هي خيارنا الأول للعائلات — توفر متحف التاريخ الطبيعي ومتحف العلوم ومتحف فيكتوريا وألبرت (جميعها مجانية)، بالإضافة إلى حدائق كنسينغتون وملعب ديانا التذكاري. ساوث كنسينغتون بها مطاعم عائلية ممتازة ومتصلة جيدًا بالمترو. نايتسبريدج تجمع بين التسوق (هارودز) وأنشطة هايد بارك. للأطفال الأكبر، منطقة ساوث بانك توفر عين لندن وأكواريوم SEA LIFE ومغامرة شريك، كلها على مسافة مشي.',
    },
    {
      q_en: 'Can I book directly through Yalla London?',
      q_ar: 'هل يمكنني الحجز مباشرة عبر يلا لندن؟',
      a_en: 'We provide direct links to each venue\'s official website and booking platforms where available. For hotels, we partner with trusted booking services like Booking.com and HalalBooking that offer competitive rates and flexible cancellation policies. Restaurant reservations should be made directly with the venue or through platforms like OpenTable. While we do not handle bookings ourselves, our affiliate partnerships ensure you get the best available rates, and a portion of the booking supports our work in keeping this guide free and up-to-date.',
      a_ar: 'نوفر روابط مباشرة لموقع كل مكان ومنصات الحجز المتاحة. للفنادق، نتشارك مع خدمات حجز موثوقة مثل Booking.com وHalalBooking التي تقدم أسعارًا تنافسية وسياسات إلغاء مرنة. حجوزات المطاعم يجب أن تتم مباشرة مع المكان أو عبر منصات مثل OpenTable. بينما لا نتعامل مع الحجوزات بأنفسنا، شراكاتنا تضمن لك أفضل الأسعار المتاحة، وجزء من الحجز يدعم عملنا في إبقاء هذا الدليل مجانيًا ومحدثًا.',
    },
    {
      q_en: 'How often are recommendations updated?',
      q_ar: 'كم مرة يتم تحديث التوصيات؟',
      a_en: 'We conduct a full review of all recommendations every quarter (January, April, July, and October). During each review, our team revisits venues, checks for changes in service quality, menu updates, and pricing adjustments. Between quarterly reviews, we make immediate updates if a venue closes, changes ownership, or receives significant negative feedback from our community. Seasonal additions — such as Ramadan-specific restaurants, Eid celebration venues, and summer pop-ups — are added as they become available and removed when they end.',
      a_ar: 'نجري مراجعة شاملة لجميع التوصيات كل ربع سنة (يناير، أبريل، يوليو، وأكتوبر). خلال كل مراجعة، يعيد فريقنا زيارة الأماكن ويتحقق من التغييرات في جودة الخدمة وتحديثات القائمة وتعديلات الأسعار. بين المراجعات الفصلية، نجري تحديثات فورية إذا أغلق مكان أو تغيرت ملكيته أو تلقى ملاحظات سلبية كبيرة. الإضافات الموسمية — مثل مطاعم رمضان وأماكن احتفال العيد — تُضاف عند توفرها وتُزال عند انتهائها.',
    },
  ]

  const filtered = recommendations.filter(item => {
    const name = locale === 'en' ? item.name_en : item.name_ar
    const desc = locale === 'en' ? item.description_en : item.description_ar
    const matchesSearch = !searchTerm || name.toLowerCase().includes(searchTerm.toLowerCase()) || desc.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = selectedType === 'all' || item.type === selectedType
    return matchesSearch && matchesType
  })

  return (
    <div className={`bg-yl-cream min-h-screen ${isRTL ? 'font-arabic' : 'font-body'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Hero */}
      <section className="relative bg-yl-dark-navy pb-12 pt-28 overflow-hidden">
        <WatermarkStamp />
        <div className="relative z-10 max-w-7xl mx-auto px-7 text-center">
          <Breadcrumbs items={[
            { label: locale === 'en' ? 'Home' : 'الرئيسية', href: '/' },
            { label: locale === 'en' ? 'Recommendations' : 'توصياتنا' },
          ]} />
          <SectionLabel>{locale === 'en' ? 'Curated for You' : 'مختارة لك'}</SectionLabel>
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-white mb-4">
            {locale === 'en' ? 'Our Recommendations' : 'توصياتنا'}
          </h1>
          <p className="text-xl text-yl-gray-400 mb-8 max-w-2xl mx-auto font-body">
            {locale === 'en'
              ? 'Handpicked luxury hotels, restaurants, and experiences across London — curated for discerning travellers'
              : 'فنادق ومطاعم وتجارب فاخرة مختارة بعناية في جميع أنحاء لندن — مختارة للمسافرين المميزين'}
          </p>
          <div className="max-w-xl mx-auto relative">
            <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 text-yl-gray-500`} />
            <input
              type="text"
              placeholder={locale === 'en' ? 'Search recommendations...' : 'ابحث في التوصيات...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-4 rounded-[14px] text-lg font-body focus:outline-none focus:ring-2 focus:ring-yl-gold/30 focus:border-yl-gold`}
            />
          </div>
        </div>
      </section>

      <TriBar />

      {/* FTC Affiliate Disclosure */}
      <div className="bg-yl-cream/60 border-b border-yl-gray-200">
        <p className="max-w-7xl mx-auto px-7 py-2.5 text-[11px] text-yl-gray-500 leading-relaxed">
          {locale === 'en'
            ? 'This page contains affiliate links. We may earn a commission when you book through our links, at no extra cost to you.'
            : 'تحتوي هذه الصفحة على روابط تابعة. قد نحصل على عمولة عند الحجز من خلال روابطنا، دون أي تكلفة إضافية عليك.'}
        </p>
      </div>

      {/* Editorial Intro */}
      <section className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-7">
          <h2 className="text-3xl font-heading font-bold text-yl-charcoal mb-6 text-center">
            {locale === 'en' ? 'Our Curated London Picks' : 'اختياراتنا المنتقاة في لندن'}
          </h2>
          <div className="space-y-4 text-base text-yl-gray-500 font-body leading-relaxed">
            {locale === 'en' ? (
              <>
                <p>
                  Every recommendation on this page has been personally vetted by our editorial team, drawing on years of experience guiding Arab and Gulf travellers through the best of London. We do not simply list popular venues — we select places that consistently deliver exceptional experiences with genuine cultural sensitivity, halal dining options, Arabic-speaking staff, and prayer-friendly arrangements. Whether you are visiting London for the first time with your family or returning for a seasonal getaway, these are the establishments that earn our trust.
                </p>
                <p>
                  Our hotel selections prioritise privacy, generous suite configurations for families, proximity to major attractions, and a track record of welcoming Gulf guests. For restaurants, we focus on Michelin-quality dining that either offers fully halal menus or clearly labelled halal choices alongside outstanding service. Our attraction picks balance iconic London landmarks with lesser-known gems that reward curiosity — from royal palaces to panoramic viewpoints that transform your understanding of the city.
                </p>
                <p>
                  We update these recommendations quarterly, revisiting each venue to confirm standards have been maintained. Seasonal promotions, Ramadan packages, and Eid offers are highlighted as they become available. If you have visited any of these places and have feedback, we would love to hear from you — your insights help us keep this guide honest and useful for every traveller in our community.
                </p>
              </>
            ) : (
              <>
                <p>
                  كل توصية في هذه الصفحة تم تقييمها شخصيًا من قبل فريقنا التحريري، بالاعتماد على سنوات من الخبرة في إرشاد المسافرين العرب والخليجيين إلى أفضل ما تقدمه لندن. نحن لا نكتفي بسرد الأماكن الشائعة — بل نختار المنشآت التي تقدم تجارب استثنائية باستمرار مع حساسية ثقافية حقيقية وخيارات طعام حلال وموظفين يتحدثون العربية وترتيبات ملائمة للصلاة. سواء كنت تزور لندن لأول مرة مع عائلتك أو تعود لقضاء إجازة موسمية، فهذه هي المنشآت التي تحظى بثقتنا.
                </p>
                <p>
                  تعطي اختياراتنا للفنادق الأولوية للخصوصية وتوفر أجنحة عائلية واسعة وقربها من المعالم الرئيسية وسجل حافل في استقبال ضيوف الخليج. أما المطاعم فنركز على مطاعم بمستوى ميشلان تقدم قوائم حلال بالكامل أو خيارات حلال واضحة إلى جانب خدمة متميزة. واختياراتنا للمعالم توازن بين معالم لندن الأيقونية والجواهر الأقل شهرة التي تكافئ الفضول — من القصور الملكية إلى نقاط المشاهدة البانورامية التي تغير فهمك للمدينة.
                </p>
                <p>
                  نقوم بتحديث هذه التوصيات كل ثلاثة أشهر، ونعيد زيارة كل مكان للتأكد من الحفاظ على المعايير. يتم إبراز العروض الموسمية وباقات رمضان وعروض العيد فور توفرها. إذا زرت أيًا من هذه الأماكن ولديك ملاحظات، يسعدنا أن نسمع منك — رؤيتك تساعدنا في الحفاظ على هذا الدليل صادقًا ومفيدًا لكل مسافر في مجتمعنا.
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Type Filter */}
      <div className="bg-white border-b border-yl-gray-200 py-4 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-7">
          <div className="flex items-center gap-3 overflow-x-auto pb-2">
            {(['all', 'hotel', 'restaurant', 'attraction'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-4 py-2 rounded-full font-mono text-[11px] tracking-wider uppercase whitespace-nowrap transition-colors ${
                  selectedType === type
                    ? 'bg-yl-dark-navy text-yl-parchment'
                    : 'bg-yl-gray-100 text-yl-gray-500 hover:bg-yl-gray-200'
                }`}
              >
                {labels[type]}
              </button>
            ))}
            <span className="font-mono text-[11px] tracking-wider uppercase text-yl-gray-500 ml-auto">
              {filtered.length} {locale === 'en' ? 'results' : 'نتيجة'}
            </span>
          </div>
        </div>
      </div>

      {/* Recommendations Grid */}
      <section className="max-w-7xl mx-auto px-7 py-12">
        <div className="grid md:grid-cols-2 gap-8">
          {filtered.map((item) => (
            <BrandCardLight key={item.id} className="overflow-hidden group">
              <div className="relative aspect-video">
                <Image
                  src={item.image}
                  alt={locale === 'en' ? item.name_en : item.name_ar}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className={`absolute top-4 ${isRTL ? 'right-4' : 'left-4'}`}>
                  <BrandTag color="neutral">
                    {labels[item.type as keyof typeof labels]}
                  </BrandTag>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-xl font-heading font-semibold text-yl-charcoal mb-2">
                      {locale === 'en' ? item.name_en : item.name_ar}
                    </h3>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${i < Math.floor(item.rating) ? 'fill-yl-gold text-yl-gold' : 'text-yl-gray-300'}`}
                          />
                        ))}
                      </div>
                      <span className="font-mono text-[11px] tracking-wider text-yl-gray-500">{item.rating}</span>
                    </div>
                  </div>
                  <div className={`${isRTL ? 'text-left' : 'text-right'}`}>
                    <div className="text-lg font-heading font-semibold text-yl-red">{item.price_range}</div>
                  </div>
                </div>

                <p className="text-sm text-yl-gray-500 font-body leading-relaxed mb-4">
                  {locale === 'en' ? item.description_en : item.description_ar}
                </p>

                <div className="flex items-center gap-2 text-sm text-yl-gray-500 mb-4">
                  <MapPin className="h-4 w-4 shrink-0 text-yl-gold" />
                  <span className="font-body">{locale === 'en' ? item.address_en : item.address_ar}</span>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {(locale === 'en' ? item.features_en : item.features_ar).map((feature) => (
                    <span key={feature} className="px-2 py-1 bg-yl-cream font-mono text-[11px] tracking-wider uppercase text-yl-gray-500 rounded-full border border-yl-gray-200/50">
                      {feature}
                    </span>
                  ))}
                </div>

                {/* GCC Features */}
                {'gccFeatures' in item && (item as Record<string, unknown>).gccFeatures && (
                  <div className="mb-4 p-3 bg-yl-cream/60 rounded-xl border border-yl-gold/20">
                    <p className="font-mono text-[11px] tracking-wider uppercase text-yl-gold mb-2 font-semibold">
                      {locale === 'en' ? '✦ Gulf Traveller Features' : '✦ مميزات للمسافر الخليجي'}
                    </p>
                    <ul className="space-y-1">
                      {((item as Record<string, unknown>).gccFeatures as string[]).map((f) => (
                        <li key={f} className="text-xs text-yl-gray-500 font-body flex items-start gap-1.5">
                          <span className="text-yl-gold mt-0.5 shrink-0">•</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Best For */}
                {'bestFor' in item && (item as Record<string, unknown>).bestFor && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {((item as Record<string, unknown>).bestFor as string[]).map((b) => (
                      <span key={b} className="px-2.5 py-1 bg-yl-red/5 text-yl-red font-mono text-[11px] tracking-wider rounded-full border border-yl-red/15">
                        {b}
                      </span>
                    ))}
                  </div>
                )}

                {/* Insider Tip */}
                {'insiderTip' in item && (item as Record<string, unknown>).insiderTip && (
                  <div className="mb-4 p-3 bg-gradient-to-r from-yl-gold/5 to-transparent rounded-xl border-l-2 border-yl-gold">
                    <p className="font-mono text-[11px] tracking-wider uppercase text-yl-gold mb-1 font-semibold">
                      {locale === 'en' ? 'Insider Tip' : 'نصيحة من الداخل'}
                    </p>
                    <p className="text-xs text-yl-gray-500 font-body leading-relaxed">
                      {(item as Record<string, unknown>).insiderTip as string}
                    </p>
                  </div>
                )}

                {(() => {
                  const affLink = getPageAffiliateLink(item.name_en, item.type as AffiliateCategory, 'yalla-london', 'recommendations');
                  return (
                  <div className="flex flex-col gap-2 pt-4 border-t border-yl-gray-200">
                    <div className="flex items-center gap-2">
                      {item.phone && (
                        <a
                          href={`tel:${item.phone}`}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-yl-gray-200 rounded-[14px] text-sm text-yl-gray-500 font-body hover:bg-yl-cream transition-colors"
                        >
                          <Phone className="h-4 w-4" />
                          {locale === 'en' ? 'Call' : 'اتصل'}
                        </a>
                      )}
                      <a
                        href={item.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-yl-gray-200 rounded-[14px] text-sm text-yl-gray-500 font-body hover:bg-yl-cream transition-colors"
                      >
                        <Globe className="h-4 w-4" />
                        {locale === 'en' ? 'Official Site' : 'الموقع الرسمي'}
                      </a>
                    </div>
                    {affLink && (
                      <a
                        href={affLink.url}
                        target="_blank"
                        rel="noopener sponsored"
                        className={`${affLink.trackingClass} flex items-center justify-center gap-2 px-4 py-2.5 bg-yl-red text-white text-sm font-heading font-semibold rounded-[14px] hover:bg-[#a82924] hover:-translate-y-0.5 transition-all shadow-lg`}
                        data-affiliate-partner={affLink.partner}
                      >
                        {affLink.label} →
                      </a>
                    )}
                  </div>
                  );
                })()}
              </div>
            </BrandCardLight>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-xl text-yl-gray-500 font-body">
              {locale === 'en' ? 'No recommendations found matching your search.' : 'لم يتم العثور على توصيات تطابق بحثك.'}
            </p>
          </div>
        )}
      </section>

      {/* Insider Tips for Arab Travellers */}
      <section className="py-12 bg-yl-cream">
        <div className="max-w-7xl mx-auto px-7">
          <div className="text-center mb-10">
            <SectionLabel>{locale === 'en' ? 'Practical Advice' : 'نصائح عملية'}</SectionLabel>
            <h2 className="text-3xl font-heading font-bold text-yl-charcoal">
              {locale === 'en' ? 'Insider Tips for Arab Travellers' : 'نصائح من الداخل للمسافرين العرب'}
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {insiderTips.map((tip, idx) => {
              const TipIcon = tip.icon
              return (
                <BrandCardLight key={idx} className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-yl-gold/10 flex items-center justify-center shrink-0">
                      <TipIcon className="w-5 h-5 text-yl-gold" />
                    </div>
                    <h3 className="text-lg font-heading font-semibold text-yl-charcoal">
                      {locale === 'en' ? tip.title_en : tip.title_ar}
                    </h3>
                  </div>
                  <p className="text-sm text-yl-gray-500 font-body leading-relaxed">
                    {locale === 'en' ? tip.desc_en : tip.desc_ar}
                  </p>
                </BrandCardLight>
              )
            })}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-12 bg-white">
        <div className="max-w-3xl mx-auto px-7">
          <div className="text-center mb-10">
            <SectionLabel>{locale === 'en' ? 'Common Questions' : 'أسئلة شائعة'}</SectionLabel>
            <h2 className="text-3xl font-heading font-bold text-yl-charcoal">
              {locale === 'en' ? 'Frequently Asked Questions' : 'الأسئلة الشائعة'}
            </h2>
          </div>
          <div className="space-y-3">
            {faqItems.map((faq, idx) => (
              <div key={idx} className="border border-yl-gray-200 rounded-[14px] overflow-hidden bg-yl-cream/50">
                <button
                  onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-yl-cream transition-colors"
                >
                  <span className="font-heading font-semibold text-yl-charcoal pr-4">
                    {locale === 'en' ? faq.q_en : faq.q_ar}
                  </span>
                  {openFaqIndex === idx ? (
                    <ChevronUp className="w-5 h-5 text-yl-gold shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-yl-gray-400 shrink-0" />
                  )}
                </button>
                {openFaqIndex === idx && (
                  <div className="px-6 pb-5">
                    <p className="text-sm text-yl-gray-500 font-body leading-relaxed">
                      {locale === 'en' ? faq.a_en : faq.a_ar}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <TriBar />

      {/* Cross-linking */}
      <section className="bg-yl-dark-navy py-16">
        <div className="max-w-7xl mx-auto px-7 text-center">
          <SectionLabel>{locale === 'en' ? 'Explore More' : 'استكشف المزيد'}</SectionLabel>
          <h2 className="text-3xl font-heading font-bold text-white mb-8">
            {locale === 'en' ? 'Looking for more?' : 'تبحث عن المزيد؟'}
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/hotels">
              <BrandButton variant="outline" className="border-white/30 text-white hover:bg-white/10">
                {locale === 'en' ? 'All Luxury Hotels' : 'جميع الفنادق الفاخرة'}
              </BrandButton>
            </Link>
            <Link href="/experiences">
              <BrandButton variant="outline" className="border-white/30 text-white hover:bg-white/10">
                {locale === 'en' ? 'All Experiences' : 'جميع التجارب'}
              </BrandButton>
            </Link>
            <Link href="/london-by-foot">
              <BrandButton variant="primary">
                {locale === 'en' ? 'London Walking Guides' : 'أدلة المشي في لندن'}
              </BrandButton>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
