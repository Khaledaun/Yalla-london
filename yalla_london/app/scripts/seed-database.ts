#!/usr/bin/env tsx

/**
 * Database Seeding Script
 * Adds real content to the Supabase database
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

async function seedDatabase() {
  console.log('🌱 Seeding Database with Real Content...\n');

  const prisma = new PrismaClient();

  try {
    // Connect to database
    await prisma.$connect();
    console.log('✅ Connected to database');

    // 1. Create Categories
    console.log('\n1. Creating Categories...');
    
    const categories = [
      {
        id: 'cat-shopping',
        name_en: 'Style & Shopping',
        name_ar: 'الأناقة والتسوق',
        slug: 'style-shopping',
        description_en: 'Luxury shopping and fashion in London',
        description_ar: 'التسوق الفاخر والموضة في لندن',
        icon: '🛍️',
        color: '#8B5CF6'
      },
      {
        id: 'cat-food',
        name_en: 'Food & Dining',
        name_ar: 'الطعام والمطاعم',
        slug: 'food-dining',
        description_en: 'Best restaurants and culinary experiences',
        description_ar: 'أفضل المطاعم والتجارب الطهوية',
        icon: '🍽️',
        color: '#F59E0B'
      },
      {
        id: 'cat-culture',
        name_en: 'Culture & Arts',
        name_ar: 'الثقافة والفنون',
        slug: 'culture-arts',
        description_en: 'Museums, galleries, and cultural events',
        description_ar: 'المتاحف والمعارض والفعاليات الثقافية',
        icon: '🎨',
        color: '#10B981'
      }
    ];

    for (const category of categories) {
      try {
        // Try to find existing category
        const existing = await prisma.category.findUnique({
          where: { id: category.id }
        });
        
        if (existing) {
          await prisma.category.update({
            where: { id: category.id },
            data: category
          });
          console.log(`   ✅ Updated category: ${category.name_en}`);
        } else {
          await prisma.category.create({
            data: category
          });
          console.log(`   ✅ Created category: ${category.name_en}`);
        }
      } catch (error) {
        console.log(`   ⚠️  Category ${category.name_en} error:`, error.message);
      }
    }

    // 2. Create Author
    console.log('\n2. Creating Author...');
    
    const author = {
      id: 'author-1',
      name: 'Yalla London Team',
      email: 'team@yallalondon.com',
      image: 'https://example.com/author-avatar.jpg',
      bio_en: 'The Yalla London editorial team',
      bio_ar: 'فريق تحرير يالا لندن'
    };

    try {
      // Try to find existing user
      const existing = await prisma.user.findUnique({
        where: { id: author.id }
      });
      
      if (existing) {
        await prisma.user.update({
          where: { id: author.id },
          data: author
        });
        console.log(`   ✅ Updated author: ${author.name}`);
      } else {
        await prisma.user.create({
          data: author
        });
        console.log(`   ✅ Created author: ${author.name}`);
      }
    } catch (error) {
      console.log(`   ⚠️  Author error:`, error.message);
    }

    // 3. Create Blog Posts
    console.log('\n3. Creating Blog Posts...');
    
    const blogPosts = [
      {
        id: 'post-1',
        title_en: 'Luxury Christmas Markets in London 2024',
        title_ar: 'أسواق عيد الميلاد الفاخرة في لندن 2024',
        slug: 'luxury-christmas-markets-london-2024',
        excerpt_en: 'Discover the most luxurious Christmas markets in London for 2024, featuring premium vendors and exclusive experiences.',
        excerpt_ar: 'اكتشف أسواق عيد الميلاد الأكثر فخامة في لندن لعام 2024، مع البائعين المتميزين والتجارب الحصرية.',
        content_en: `# Luxury Christmas Markets in London 2024

London transforms into a winter wonderland during the festive season, and nowhere is this more evident than in its luxury Christmas markets. These premium destinations offer an unparalleled shopping experience with exclusive vendors, artisanal products, and gourmet treats.

## Hyde Park Winter Wonderland

The crown jewel of London's Christmas markets, Hyde Park Winter Wonderland combines traditional charm with luxury experiences. The market features:

- **Premium Food Stalls**: Michelin-starred chefs serving exclusive dishes
- **Artisan Crafts**: Handmade luxury goods from local and international artisans
- **VIP Experiences**: Private dining areas and exclusive access passes

## Borough Market Christmas Special

Borough Market elevates its already impressive offerings during Christmas with:

- **Gourmet Food Vendors**: Premium cheeses, wines, and seasonal delicacies
- **Cooking Masterclasses**: Learn from renowned chefs
- **Exclusive Products**: Limited edition items available only during the festive season

## Covent Garden Christmas Market

Covent Garden's Christmas market offers a perfect blend of luxury and tradition:

- **Designer Pop-ups**: Exclusive collections from luxury brands
- **Artisanal Gifts**: Handcrafted items perfect for discerning shoppers
- **Gourmet Experiences**: Premium food and drink offerings

## Planning Your Visit

To make the most of London's luxury Christmas markets:

1. **Book in Advance**: Many premium experiences require reservations
2. **Dress Appropriately**: London winters can be chilly, so dress warmly
3. **Budget Accordingly**: Luxury markets come with premium prices
4. **Visit During Off-Peak Hours**: Avoid crowds for a more intimate experience

## Conclusion

London's luxury Christmas markets offer an unforgettable festive experience, combining traditional charm with modern luxury. Whether you're shopping for unique gifts or simply enjoying the atmosphere, these markets provide the perfect backdrop for your Christmas celebrations.`,
        content_ar: `# أسواق عيد الميلاد الفاخرة في لندن 2024

تتحول لندن إلى أرض عجائب شتوية خلال موسم الأعياد، ولا يوجد مكان يظهر هذا أكثر من أسواق عيد الميلاد الفاخرة. توفر هذه الوجهات المتميزة تجربة تسوق لا مثيل لها مع البائعين الحصريين والمنتجات الحرفية والعلاجات الشهية.

## حديقة هايد بارك الشتوية

جوهرة تاج أسواق عيد الميلاد في لندن، تجمع حديقة هايد بارك الشتوية بين السحر التقليدي والتجارب الفاخرة. يضم السوق:

- **أكشاك الطعام المتميزة**: طهاة حاصلون على نجمة ميشلان يقدمون أطباق حصرية
- **الحرف اليدوية**: سلع فاخرة مصنوعة يدوياً من الحرفيين المحليين والدوليين
- **تجارب VIP**: مناطق تناول طعام خاصة وتذاكر وصول حصرية

## سوق بورو الخاص بعيد الميلاد

يرفع سوق بورو عروضه المثيرة للإعجاب بالفعل خلال عيد الميلاد مع:

- **بائعي الطعام الشهي**: الجبن والنبيذ الفاخر والأطعمة الموسمية المميزة
- **فصول الطبخ الرئيسية**: تعلم من الطهاة المشهورين
- **المنتجات الحصرية**: عناصر إصدار محدود متاحة فقط خلال الموسم الاحتفالي

## سوق عيد الميلاد في كوفنت جاردن

يقدم سوق عيد الميلاد في كوفنت جاردن مزيجاً مثالياً من الفخامة والتقاليد:

- **المتاجر المؤقتة للمصممين**: مجموعات حصرية من العلامات التجارية الفاخرة
- **الهدايا الحرفية**: عناصر مصنوعة يدوياً مثالية للمتسوقين المميزين
- **تجارب الطعام الشهي**: عروض طعام وشراب متميزة

## التخطيط لزيارتك

لتحقيق أقصى استفادة من أسواق عيد الميلاد الفاخرة في لندن:

1. **احجز مقدماً**: تتطلب العديد من التجارب المتميزة حجوزات
2. **ارتدي ملابس مناسبة**: يمكن أن تكون شتاء لندن بارداً، لذا ارتدي ملابس دافئة
3. **ضع ميزانية مناسبة**: تأتي الأسواق الفاخرة بأسعار متميزة
4. **زر خلال ساعات غير الذروة**: تجنب الازدحام للحصول على تجربة أكثر حميمية

## الخلاصة

تقدم أسواق عيد الميلاد الفاخرة في لندن تجربة احتفالية لا تُنسى، تجمع بين السحر التقليدي والفخامة الحديثة. سواء كنت تتسوق لهدايا فريدة أو تستمتع بالجو ببساطة، توفر هذه الأسواق الإعداد المثالي لاحتفالات عيد الميلاد.`,
        published: true,
        page_type: 'guide',
        category_id: 'cat-shopping',
        author_id: 'author-1',
        seo_score: 85,
        tags: ['christmas', 'markets', 'luxury', 'shopping', 'london'],
        featured_image: 'https://example.com/christmas-markets.jpg',
        meta_title_en: 'Luxury Christmas Markets in London 2024 | Yalla London',
        meta_title_ar: 'أسواق عيد الميلاد الفاخرة في لندن 2024 | يالا لندن',
        meta_description_en: 'Discover the most luxurious Christmas markets in London for 2024. Premium vendors, exclusive experiences, and gourmet treats await.',
        meta_description_ar: 'اكتشف أسواق عيد الميلاد الأكثر فخامة في لندن لعام 2024. بائعون متميزون وتجارب حصرية وعلاجات شهية في انتظارك.'
      },
      {
        id: 'post-2',
        title_en: 'Luxury Shopping Guide: Harrods to Harvey Nichols',
        title_ar: 'دليل التسوق الفاخر: من هارودز إلى هارفي نيكولز',
        slug: 'luxury-shopping-guide-harrods-harvey-nichols',
        excerpt_en: 'Your complete guide to luxury shopping in London, from the iconic Harrods to the elegant Harvey Nichols.',
        excerpt_ar: 'دليلك الكامل للتسوق الفاخر في لندن، من هارودز الشهير إلى هارفي نيكولز الأنيق.',
        content_en: `# Luxury Shopping Guide: Harrods to Harvey Nichols

London is a global capital of luxury shopping, home to some of the world's most prestigious department stores and boutiques. This comprehensive guide takes you through the city's most exclusive shopping destinations.

## Harrods: The Crown Jewel

Harrods is more than a department store; it's a London institution. This iconic Knightsbridge landmark offers:

- **Seven floors of luxury**: From haute couture to fine jewelry
- **Food Hall**: World-renowned gourmet offerings
- **Personal Shopping**: Dedicated stylists for VIP experiences
- **Exclusive Brands**: Many items available only at Harrods

### Must-Visit Departments:
- **Fashion**: Designer collections from top international brands
- **Jewelry**: Exclusive pieces and custom designs
- **Beauty**: Luxury cosmetics and skincare
- **Home**: Designer furniture and home accessories

## Harvey Nichols: Modern Luxury

Harvey Nichols represents contemporary luxury with a focus on cutting-edge fashion and lifestyle:

- **Fashion Forward**: Latest collections from emerging and established designers
- **Beauty Innovation**: Exclusive beauty brands and treatments
- **Dining**: Michelin-starred restaurants and trendy bars
- **Personal Styling**: Expert fashion advice and wardrobe curation

### Signature Experiences:
- **Fifth Floor**: Premium dining and lifestyle experiences
- **Beauty Bazaar**: Interactive beauty shopping experience
- **Fashion Studio**: Personal styling and wardrobe consultations

## Bond Street: Designer Haven

Bond Street is London's answer to Rodeo Drive, featuring:

- **Flagship Stores**: World's largest stores for luxury brands
- **Exclusive Collections**: Items not available elsewhere
- **VIP Services**: Personal shopping and private appointments
- **Art Galleries**: Interspersed with luxury shopping

## Knightsbridge: Luxury Quarter

The Knightsbridge area offers a concentrated luxury shopping experience:

- **Harrods**: The world's most famous department store
- **Sloane Street**: Designer boutiques and flagship stores
- **Brompton Road**: Mix of luxury and high-street brands
- **Hyde Park Corner**: Premium shopping and dining

## Shopping Tips for Luxury Shoppers

### Planning Your Visit:
1. **Book Personal Shopping**: Many stores offer complimentary personal shopping services
2. **Check Opening Hours**: Luxury stores may have different hours
3. **Dress Appropriately**: Smart casual is usually appropriate
4. **Bring ID**: Some purchases may require identification

### VIP Services:
- **Private Shopping**: After-hours access to stores
- **Personal Stylists**: Dedicated fashion experts
- **Home Delivery**: Worldwide shipping for purchases
- **Concierge Services**: Restaurant reservations and event tickets

## Conclusion

London's luxury shopping scene offers an unparalleled experience for discerning shoppers. From the historic grandeur of Harrods to the modern sophistication of Harvey Nichols, the city provides access to the world's finest brands and most exclusive experiences.`,
        content_ar: `# دليل التسوق الفاخر: من هارودز إلى هارفي نيكولز

لندن هي عاصمة عالمية للتسوق الفاخر، موطن لبعض من أكثر المتاجر والمحلات الفاخرة شهرة في العالم. يأخذك هذا الدليل الشامل عبر أكثر وجهات التسوق الحصرية في المدينة.

## هارودز: جوهرة التاج

هارودز أكثر من متجر كبير؛ إنه مؤسسة لندنية. يقدم هذا المعلم الشهير في نايتسبريدج:

- **سبعة طوابق من الفخامة**: من الأزياء الراقية إلى المجوهرات الفاخرة
- **قاعة الطعام**: عروض طعام شهية مشهورة عالمياً
- **التسوق الشخصي**: مصممو أزياء مخصصون لتجارب VIP
- **العلامات التجارية الحصرية**: العديد من العناصر متاحة فقط في هارودز

### الأقسام التي يجب زيارتها:
- **الموضة**: مجموعات مصممة من أفضل العلامات التجارية الدولية
- **المجوهرات**: قطع حصرية وتصاميم مخصصة
- **الجمال**: مستحضرات التجميل والعناية بالبشرة الفاخرة
- **المنزل**: أثاث مصمم وإكسسوارات منزلية

## هارفي نيكولز: الفخامة الحديثة

يمثل هارفي نيكولز الفخامة المعاصرة مع التركيز على الموضة وأسلوب الحياة المبتكر:

- **الموضة المتقدمة**: أحدث المجموعات من المصممين الناشئين والمؤسسين
- **ابتكار الجمال**: علامات تجارية وعلاجات جمالية حصرية
- **تناول الطعام**: مطاعم حاصلة على نجمة ميشلان وحانات عصرية
- **التصميم الشخصي**: نصائح أزياء خبيرة وتنظيم خزانة الملابس

### التجارب المميزة:
- **الطابق الخامس**: تجارب تناول طعام وأسلوب حياة متميزة
- **سوق الجمال**: تجربة تسوق جمال تفاعلية
- **استوديو الموضة**: استشارات تصميم شخصي وتنظيم خزانة الملابس

## بوند ستريت: ملاذ المصممين

بوند ستريت هو رد لندن على روديو درايف، ويضم:

- **متاجر رئيسية**: أكبر متاجر في العالم للعلامات التجارية الفاخرة
- **مجموعات حصرية**: عناصر غير متاحة في مكان آخر
- **خدمات VIP**: تسوق شخصي ومواعيد خاصة
- **معارض الفن**: متداخلة مع التسوق الفاخر

## نايتسبريدج: الحي الفاخر

تقدم منطقة نايتسبريدج تجربة تسوق فاخر مركزة:

- **هارودز**: أشهر متجر كبير في العالم
- **شارع سلون**: محلات مصممة ومتاجر رئيسية
- **طريق برومبتون**: مزيج من العلامات التجارية الفاخرة والشارع الرئيسي
- **زاوية هايد بارك**: تسوق وتناول طعام متميز

## نصائح التسوق للمتسوقين الفاخرين

### التخطيط لزيارتك:
1. **احجز التسوق الشخصي**: تقدم العديد من المتاجر خدمات تسوق شخصي مجانية
2. **تحقق من ساعات العمل**: قد يكون للمتاجر الفاخرة ساعات مختلفة
3. **ارتدي ملابس مناسبة**: الكاجوال الأنيق مناسب عادة
4. **أحضر الهوية**: قد تتطلب بعض المشتريات هوية

### خدمات VIP:
- **التسوق الخاص**: الوصول للمتاجر بعد ساعات العمل
- **مصممو أزياء شخصيون**: خبراء أزياء مخصصون
- **التوصيل للمنزل**: شحن عالمي للمشتريات
- **خدمات الحاجب**: حجوزات المطاعم وتذاكر الأحداث

## الخلاصة

يقدم مشهد التسوق الفاخر في لندن تجربة لا مثيل لها للمتسوقين المميزين. من العظمة التاريخية لهارودز إلى التطور الحديث لهارفي نيكولز، توفر المدينة الوصول لأفضل العلامات التجارية في العالم وأكثر التجارب حصرية.`,
        published: true,
        page_type: 'guide',
        category_id: 'cat-shopping',
        author_id: 'author-1',
        seo_score: 90,
        tags: ['shopping', 'luxury', 'harrods', 'harvey-nichols', 'london'],
        featured_image: 'https://example.com/luxury-shopping.jpg',
        meta_title_en: 'Luxury Shopping Guide: Harrods to Harvey Nichols | Yalla London',
        meta_title_ar: 'دليل التسوق الفاخر: من هارودز إلى هارفي نيكولز | يالا لندن',
        meta_description_en: 'Complete guide to luxury shopping in London. From Harrods to Harvey Nichols, discover the city\'s most exclusive shopping destinations.',
        meta_description_ar: 'دليل كامل للتسوق الفاخر في لندن. من هارودز إلى هارفي نيكولز، اكتشف أكثر وجهات التسوق حصرية في المدينة.'
      },
      {
        id: 'post-3',
        title_en: 'The Ultimate London Foodie Experience',
        title_ar: 'تجربة الطعام المثالية في لندن',
        slug: 'ultimate-london-foodie-experience',
        excerpt_en: 'Discover the best culinary experiences in London, from Michelin-starred restaurants to hidden food markets.',
        excerpt_ar: 'اكتشف أفضل التجارب الطهوية في لندن، من المطاعم الحاصلة على نجمة ميشلان إلى أسواق الطعام المخفية.',
        content_en: `# The Ultimate London Foodie Experience

London has emerged as one of the world's premier culinary destinations, offering an incredible diversity of dining experiences that reflect its multicultural population and rich history.

## Michelin-Starred Excellence

London boasts over 70 Michelin-starred restaurants, offering everything from traditional British cuisine to innovative fusion dishes:

### The Ledbury
- **Two Michelin Stars**: Exceptional modern European cuisine
- **Tasting Menus**: Multi-course culinary journeys
- **Wine Pairings**: Carefully curated selections
- **Location**: Notting Hill

### Core by Clare Smyth
- **Three Michelin Stars**: The pinnacle of fine dining
- **British Ingredients**: Showcasing the best of UK produce
- **Innovative Techniques**: Modern cooking with traditional roots
- **Location**: Kensington

## Borough Market: Foodie Paradise

Borough Market is London's most famous food market, offering:

- **Artisan Producers**: Local and international vendors
- **Street Food**: Global cuisines and innovative dishes
- **Cooking Classes**: Learn from professional chefs
- **Specialty Ingredients**: Hard-to-find culinary treasures

### Must-Try Stalls:
- **Kappacasein**: Famous grilled cheese sandwiches
- **Bread Ahead**: Artisanal breads and doughnuts
- **Monmouth Coffee**: Exceptional coffee and beans
- **Neal's Yard Dairy**: Premium British cheeses

## Hidden Gems and Local Favorites

### Dishoom
- **Indian Cuisine**: Modern take on traditional dishes
- **Atmosphere**: Bombay café culture in London
- **Signature Dishes**: Black daal, biryani, and chai
- **Locations**: Multiple across London

### The River Café
- **Italian Excellence**: Authentic Italian cuisine
- **Seasonal Menus**: Fresh, locally-sourced ingredients
- **Riverside Setting**: Beautiful Thames views
- **Location**: Hammersmith

## Food Tours and Experiences

### Borough Market Food Tour
- **Guided Experience**: Expert-led market exploration
- **Tastings**: Sample the best of the market
- **History**: Learn about London's food culture
- **Duration**: 2-3 hours

### Afternoon Tea Experiences
- **Traditional**: The Ritz, Claridge's, The Savoy
- **Modern**: Sketch, The Shard, Aqua Shard
- **Themed**: Harry Potter, Alice in Wonderland
- **Custom**: Private tea experiences

## Street Food Scene

London's street food scene has exploded in recent years:

### Camden Market
- **Global Cuisines**: Food from around the world
- **Vegan Options**: Extensive plant-based choices
- **Live Music**: Entertainment while you eat
- **Weekend Vibes**: Lively atmosphere

### Boxpark Shoreditch
- **Container Dining**: Unique setting in shipping containers
- **Trendy Eateries**: Hip restaurants and bars
- **Rooftop Views**: City skyline dining
- **Nightlife**: Transforms into evening destination

## Planning Your Foodie Adventure

### Reservations:
- **Book Early**: Popular restaurants require advance booking
- **Flexible Timing**: Consider off-peak hours
- **Group Dining**: Some restaurants have minimum party requirements
- **Special Occasions**: Mention celebrations when booking

### Budget Planning:
- **Fine Dining**: £100-300+ per person
- **Mid-Range**: £30-80 per person
- **Street Food**: £5-15 per person
- **Markets**: £10-25 per person

## Conclusion

London's food scene offers something for every palate and budget. From the refined elegance of Michelin-starred restaurants to the vibrant energy of street food markets, the city provides an unparalleled culinary journey that reflects its status as a global metropolis.`,
        content_ar: `# تجربة الطعام المثالية في لندن

ظهرت لندن كواحدة من أفضل الوجهات الطهوية في العالم، حيث تقدم تنوعاً لا يصدق من تجارب تناول الطعام التي تعكس سكانها متعددي الثقافات وتاريخها الغني.

## التميز الحاصل على نجمة ميشلان

تفتخر لندن بأكثر من 70 مطعماً حاصلاً على نجمة ميشلان، تقدم كل شيء من المأكولات البريطانية التقليدية إلى أطباق الاندماج المبتكرة:

### ذا ليدبوري
- **نجمتان ميشلان**: مأكولات أوروبية حديثة استثنائية
- **قوائم التذوق**: رحلات طهوية متعددة الأطباق
- **تطابق النبيذ**: اختيارات مختارة بعناية
- **الموقع**: نوتينج هيل

### كور من كلير سميث
- **ثلاث نجوم ميشلان**: قمة الطعام الفاخر
- **مكونات بريطانية**: عرض أفضل منتجات المملكة المتحدة
- **تقنيات مبتكرة**: طبخ حديث بجذور تقليدية
- **الموقع**: كنسينغتون

## سوق بورو: جنة عشاق الطعام

سوق بورو هو أشهر سوق طعام في لندن، ويقدم:

- **منتجون حرفيون**: بائعون محليون ودوليون
- **طعام الشارع**: مأكولات عالمية وأطباق مبتكرة
- **فصول الطبخ**: تعلم من الطهاة المحترفين
- **مكونات متخصصة**: كنوز طهوية صعبة المنال

### الأكشاك التي يجب تجربتها:
- **كاباكاسين**: ساندويتشات الجبن المشهورة
- **بريد أهيد**: خبز حرفي وكعك محلى
- **مونماوث كوفي**: قهوة استثنائية وحبوب
- **نيلز يارد ديري**: جبن بريطاني متميز

## الجواهر المخفية والمفضلة المحلية

### ديشوم
- **المأكولات الهندية**: نهج حديث للأطباق التقليدية
- **الجو**: ثقافة مقهى بومباي في لندن
- **الأطباق المميزة**: دال أسود وبرياني وشاي
- **المواقع**: متعددة عبر لندن

### ذا ريفر كافيه
- **التميز الإيطالي**: مأكولات إيطالية أصيلة
- **قوائم موسمية**: مكونات طازجة من مصادر محلية
- **إعداد نهرية**: مناظر جميلة لنهر التايمز
- **الموقع**: هامرسميث

## جولات الطعام والتجارب

### جولة طعام سوق بورو
- **تجربة مرشدة**: استكشاف السوق بقيادة خبير
- **التذوق**: جرب أفضل ما في السوق
- **التاريخ**: تعلم عن ثقافة الطعام في لندن
- **المدة**: 2-3 ساعات

### تجارب الشاي بعد الظهر
- **التقليدية**: ذا ريتز، كلاريدجز، ذا سافوي
- **الحديثة**: سكيتش، ذا شارد، أكوا شارد
- **المُواضيعية**: هاري بوتر، أليس في بلاد العجائب
- **المخصصة**: تجارب شاي خاصة

## مشهد طعام الشارع

انفجر مشهد طعام الشارع في لندن في السنوات الأخيرة:

### سوق كامدن
- **مأكولات عالمية**: طعام من جميع أنحاء العالم
- **خيارات نباتية**: خيارات واسعة قائمة على النباتات
- **موسيقى حية**: ترفيه أثناء الأكل
- **أجواء نهاية الأسبوع**: جو حيوي

### بوكس بارك شورديتش
- **تناول طعام في حاويات**: إعداد فريد في حاويات الشحن
- **مطاعم عصرية**: مطاعم وحانات أنيقة
- **مناظر السطح**: تناول طعام مع أفق المدينة
- **الحياة الليلية**: يتحول إلى وجهة مسائية

## التخطيط لمغامرة عاشق الطعام

### الحجوزات:
- **احجز مبكراً**: تتطلب المطاعم الشهيرة حجز مسبق
- **توقيت مرن**: فكر في ساعات غير الذروة
- **تناول طعام جماعي**: بعض المطاعم لديها متطلبات حد أدنى للحفلات
- **مناسبات خاصة**: اذكر الاحتفالات عند الحجز

### تخطيط الميزانية:
- **طعام فاخر**: 100-300+ جنيه إسترليني للشخص
- **متوسط المدى**: 30-80 جنيه إسترليني للشخص
- **طعام الشارع**: 5-15 جنيه إسترليني للشخص
- **الأسواق**: 10-25 جنيه إسترليني للشخص

## الخلاصة

يقدم مشهد الطعام في لندن شيئاً لكل ذوق وميزانية. من الأناقة المكررة للمطاعم الحاصلة على نجمة ميشلان إلى الطاقة الحيوية لأسواق طعام الشارع، توفر المدينة رحلة طهوية لا مثيل لها تعكس مكانتها كعاصمة عالمية.`,
        published: true,
        page_type: 'guide',
        category_id: 'cat-food',
        author_id: 'author-1',
        seo_score: 88,
        tags: ['food', 'restaurants', 'culinary', 'london', 'dining'],
        featured_image: 'https://example.com/london-food.jpg',
        meta_title_en: 'The Ultimate London Foodie Experience | Yalla London',
        meta_title_ar: 'تجربة الطعام المثالية في لندن | يالا لندن',
        meta_description_en: 'Discover the best culinary experiences in London. From Michelin-starred restaurants to hidden food markets, explore the city\'s diverse food scene.',
        meta_description_ar: 'اكتشف أفضل التجارب الطهوية في لندن. من المطاعم الحاصلة على نجمة ميشلان إلى أسواق الطعام المخفية، استكشف مشهد الطعام المتنوع في المدينة.'
      }
    ];

    for (const post of blogPosts) {
      try {
        // Try to find existing blog post
        const existing = await prisma.blogPost.findUnique({
          where: { id: post.id }
        });
        
        if (existing) {
          await prisma.blogPost.update({
            where: { id: post.id },
            data: post
          });
          console.log(`   ✅ Updated blog post: ${post.title_en}`);
        } else {
          await prisma.blogPost.create({
            data: post
          });
          console.log(`   ✅ Created blog post: ${post.title_en}`);
        }
      } catch (error) {
        console.log(`   ⚠️  Blog post ${post.title_en} error:`, error.message);
      }
    }

    // 4. Create Media Assets
    console.log('\n4. Creating Media Assets...');
    
    const mediaAssets = [
      {
        id: 'media-1',
        filename: 'luxury-shopping-hero.jpg',
        original_name: 'luxury-shopping-hero.jpg',
        cloud_storage_path: 'images/luxury-shopping-hero.jpg',
        url: 'https://example.com/luxury-shopping-hero.jpg',
        file_type: 'image',
        mime_type: 'image/jpeg',
        file_size: 1024000,
        width: 1200,
        height: 800,
        alt_text: 'Luxury shopping in London',
        title: 'Luxury Shopping Hero Image',
        tags: ['shopping', 'luxury', 'hero']
      }
    ];

    for (const asset of mediaAssets) {
      try {
        // Try to find existing media asset
        const existing = await prisma.mediaAsset.findUnique({
          where: { id: asset.id }
        });
        
        if (existing) {
          await prisma.mediaAsset.update({
            where: { id: asset.id },
            data: asset
          });
          console.log(`   ✅ Updated media asset: ${asset.filename}`);
        } else {
          await prisma.mediaAsset.create({
            data: asset
          });
          console.log(`   ✅ Created media asset: ${asset.filename}`);
        }
      } catch (error) {
        console.log(`   ⚠️  Media asset ${asset.filename} error:`, error.message);
      }
    }

    // 5. Create Homepage Blocks
    console.log('\n5. Creating Homepage Blocks...');
    
    const homepageBlocks = [
      {
        id: 'block-1',
        type: 'hero',
        title_en: 'Welcome to Yalla London',
        title_ar: 'مرحباً بك في يالا لندن',
        content_en: 'Your gateway to luxury London experiences',
        content_ar: 'بوابتك لتجارب لندن الفاخرة',
        config: { style: 'dark', showButton: true },
        position: 1,
        enabled: true,
        version: 'published'
      }
    ];

    for (const block of homepageBlocks) {
      try {
        // Try to find existing homepage block
        const existing = await prisma.homepageBlock.findUnique({
          where: { id: block.id }
        });
        
        if (existing) {
          await prisma.homepageBlock.update({
            where: { id: block.id },
            data: block
          });
          console.log(`   ✅ Updated homepage block: ${block.title_en}`);
        } else {
          await prisma.homepageBlock.create({
            data: block
          });
          console.log(`   ✅ Created homepage block: ${block.title_en}`);
        }
      } catch (error) {
        console.log(`   ⚠️  Homepage block ${block.title_en} error:`, error.message);
      }
    }

    console.log('\n🎉 Database seeding completed successfully!');
    
    // Final verification
    console.log('\n📊 Final Database Status:');
    try {
      const finalStats = {
        users: await prisma.user.count(),
        blogPosts: await prisma.blogPost.count(),
        publishedPosts: await prisma.blogPost.count({ where: { published: true } })
      };
      
      console.log(`   - Users: ${finalStats.users}`);
      console.log(`   - Blog Posts: ${finalStats.blogPosts}`);
      console.log(`   - Published Posts: ${finalStats.publishedPosts}`);
    } catch (error) {
      console.log('   ⚠️  Could not get final stats:', error.message);
    }

  } catch (error) {
    console.error('❌ Database seeding failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding
seedDatabase().catch(console.error);
