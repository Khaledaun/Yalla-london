
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const categoryImages = {
  'food-drink': 'https://www.thecityofldn.com/wp-content/uploads/2023/04/FM_Helen-Lowe_Resize.jpg',
  'style-shopping': 'https://images.squarespace-cdn.com/content/v1/5411b34ee4b0aa818cc870ab/1466172908075-A6FV4TX6XWUGBVAK7O8R/image-asset.jpeg',
  'culture-art': 'https://media.cntraveler.com/photos/6362cedae53ecbfee10ea662/16:9/w_3200,h_1800,c_limit/museums.jpg',
  'football': 'https://i.ytimg.com/vi/3GI_ICZY56k/maxresdefault.jpg',
  'uk-travel': 'https://media.houseandgarden.co.uk/photos/64de03217863f90371b7b1bf/16:9/w_2752,h_1548,c_limit/Shot-05-254.jpg'
}

async function main() {
  console.log('Starting database seeding...')

  // Create test user (admin)
  const hashedPassword = await bcrypt.hash('johndoe123', 12)
  const testUser = await prisma.user.upsert({
    where: { email: 'john@doe.com' },
    update: {},
    create: {
      email: 'john@doe.com',
      name: 'John Doe',
    }
  })

  console.log('Created test user')

  // Create categories
  const categories = [
    {
      name_en: 'Food & Drink',
      name_ar: 'الطعام والشراب',
      slug: 'food-drink',
      description_en: 'Discover London finest restaurants, bars, and culinary experiences',
      description_ar: 'اكتشف أفضل المطاعم والبارات والتجارب الطهوية في لندن',
      image_url: categoryImages['food-drink']
    },
    {
      name_en: 'Style & Shopping',
      name_ar: 'الأناقة والتسوق',
      slug: 'style-shopping',
      description_en: 'Explore luxury boutiques, designer stores, and shopping districts',
      description_ar: 'استكشف البوتيكات الفاخرة ومتاجر المصممين وأحياء التسوق',
      image_url: categoryImages['style-shopping']
    },
    {
      name_en: 'Culture & Art',
      name_ar: 'الثقافة والفن',
      slug: 'culture-art',
      description_en: 'Immerse yourself in London rich cultural and artistic heritage',
      description_ar: 'انغمس في التراث الثقافي والفني الغني في لندن',
      image_url: categoryImages['culture-art']
    },
    {
      name_en: 'Football',
      name_ar: 'كرة القدم',
      slug: 'football',
      description_en: 'Experience the passion of London football clubs and Premier League',
      description_ar: 'اختبر شغف أندية كرة القدم في لندن والدوري الإنجليزي الممتاز',
      image_url: categoryImages['football']
    },
    {
      name_en: 'UK Travel',
      name_ar: 'السفر في بريطانيا',
      slug: 'uk-travel',
      description_en: 'Venture beyond London to discover Britain luxury destinations',
      description_ar: 'تجول خارج لندن لاكتشاف وجهات بريطانيا الفاخرة',
      image_url: categoryImages['uk-travel']
    }
  ]

  const createdCategories = []
  for (const category of categories) {
    const created = await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: category
    })
    createdCategories.push(created)
    console.log(`Created category: ${category.name_en}`)
  }

  // Create sample blog posts
  const blogPosts = [
    {
      title_en: 'The Ultimate Guide to Michelin-Starred Dining in London',
      title_ar: 'الدليل الشامل لتناول الطعام في مطاعم لندن الحاصلة على نجمة ميشلان',
      slug: 'michelin-starred-dining-london',
      excerpt_en: 'Discover London finest restaurants that have earned the prestigious Michelin stars, from innovative tasting menus to classic fine dining.',
      excerpt_ar: 'اكتشف أفضل مطاعم لندن التي حصلت على نجوم ميشلان المرموقة، من قوائم التذوق المبتكرة إلى المأكولات الراقية الكلاسيكية.',
      content_en: 'London culinary landscape has evolved into one of the world most sophisticated dining scenes, with numerous restaurants earning the coveted Michelin stars. From intimate chef tables to grand dining rooms, these establishments represent the pinnacle of culinary excellence.',
      content_ar: 'تطورت المناظر الطبيعية الطهوية في لندن لتصبح واحدة من أكثر مشاهد الطعام تطوراً في العالم، مع العديد من المطاعم التي تحصل على نجوم ميشلان المرغوبة.',
      featured_image: categoryImages['food-drink'],
      published: true,
      category_id: createdCategories[0].id,
      author_id: testUser.id,
      tags: ['michelin', 'fine-dining', 'restaurants', 'luxury']
    },
    {
      title_en: 'Shopping Like Royalty: London Most Exclusive Boutiques',
      title_ar: 'التسوق كالملوك: أكثر البوتيكات حصرية في لندن',
      slug: 'exclusive-boutiques-london',
      excerpt_en: 'From Savile Row to Harrods, explore the luxury shopping destinations where London elite find their perfect pieces.',
      excerpt_ar: 'من شارع سافيل رو إلى هارودز، استكشف وجهات التسوق الفاخرة حيث تجد نخبة لندن قطعها المثالية.',
      content_en: 'London stands as one of the world premier shopping destinations, offering an unparalleled selection of luxury boutiques and designer stores.',
      content_ar: 'تقف لندن كواحدة من أهم وجهات التسوق في العالم، حيث تقدم مجموعة لا مثيل لها من البوتيكات الفاخرة ومتاجر المصممين.',
      featured_image: categoryImages['style-shopping'],
      published: true,
      category_id: createdCategories[1].id,
      author_id: testUser.id,
      tags: ['shopping', 'luxury', 'boutiques', 'fashion']
    }
  ]

  for (const post of blogPosts) {
    await prisma.blogPost.upsert({
      where: { slug: post.slug },
      update: {},
      create: post
    })
    console.log(`Created blog post: ${post.title_en}`)
  }

  // Create sample recommendations
  const recommendations = [
    {
      name_en: 'The Savoy Hotel',
      name_ar: 'فندق السافوي',
      type: 'hotel',
      category: 'luxury',
      description_en: 'An iconic luxury hotel on the Strand, offering legendary service and elegant accommodations with Thames views.',
      description_ar: 'فندق فاخر أيقوني على الستراند، يقدم خدمة أسطورية وإقامة أنيقة مع إطلالات على نهر التايمز.',
      address_en: 'Strand, Covent Garden, London WC2R 0EU',
      address_ar: 'ستراند، كوفنت غاردن، لندن WC2R 0EU',
      phone: '+44 20 7836 4343',
      website: 'https://www.thesavoylondon.com',
      rating: 4.9,
      price_range: '£800-2000',
      images: ['https://media.houseandgarden.co.uk/photos/62136a961d28f04fde7897ff/16:9/w_6992,h_3933,c_limit/PRINT%20-%20The%20London%20EDITION%20-%20Lobby%203%20-%20Please%20credit%20Nikolas%20Koenig.jpg'],
      features_en: ['River Thames Views', 'Michelin-starred Dining', 'American Bar', '24/7 Butler Service', 'Spa & Fitness'],
      features_ar: ['إطلالات نهر التايمز', 'مطعم حاصل على نجمة ميشلان', 'البار الأمريكي', 'خدمة الخادم الشخصي ٢٤/٧', 'سبا وصالة رياضية'],
      published: true
    },
    {
      name_en: 'Sketch Restaurant',
      name_ar: 'مطعم سكيتش',
      type: 'restaurant',
      category: 'luxury',
      description_en: 'A surreal dining experience in Mayfair with innovative cuisine and artistic pink pod restrooms.',
      description_ar: 'تجربة طعام سريالية في مايفير مع مأكولات مبتكرة وحمامات فنية وردية.',
      address_en: '9 Conduit St, Mayfair, London W1S 2XG',
      address_ar: '٩ شارع كوندويت، مايفير، لندن W1S 2XG',
      phone: '+44 20 7659 4500',
      website: 'https://sketch.london',
      rating: 4.7,
      price_range: '£150-300',
      images: ["https://s3.amazonaws.com/a.storyblok.com/f/116532/1600x900/99055d6381/park-chinois-london-restaurant.webp"],
      features_en: ['Michelin Star', 'Unique Art Installation', 'Afternoon Tea', 'Private Dining Rooms', 'Cocktail Bar'],
      features_ar: ['نجمة ميشلان', 'معرض فني فريد', 'شاي بعد الظهر', 'غرف طعام خاصة', 'بار كوكتيل'],
      published: true
    }
  ]

  for (const recommendation of recommendations) {
    await prisma.recommendation.create({
      data: recommendation
    })
    console.log(`Created recommendation: ${recommendation.name_en}`)
  }

  // Create content schedule rules for automated content generation
  const scheduleRules = [
    {
      name: 'Daily English Blog Posts',
      content_type: 'blog_post',
      language: 'en',
      frequency_hours: 24,
      auto_publish: false,
      min_hours_between: 8,
      max_posts_per_day: 2,
      preferred_times: ['09:00', '15:00'],
      categories: ['food-drink', 'style-shopping', 'culture-art', 'uk-travel'],
      is_active: true,
    },
    {
      name: 'Daily Arabic Blog Posts',
      content_type: 'blog_post',
      language: 'ar',
      frequency_hours: 24,
      auto_publish: false,
      min_hours_between: 8,
      max_posts_per_day: 2,
      preferred_times: ['10:00', '16:00'],
      categories: ['food-drink', 'style-shopping', 'culture-art', 'uk-travel'],
      is_active: true,
    },
    {
      name: 'Bilingual Weekend Features',
      content_type: 'blog_post',
      language: 'both',
      frequency_hours: 168, // Weekly
      auto_publish: false,
      min_hours_between: 12,
      max_posts_per_day: 1,
      preferred_times: ['11:00'],
      categories: ['food-drink', 'culture-art', 'uk-travel'],
      is_active: true,
    },
  ]

  for (const rule of scheduleRules) {
    const existing = await prisma.contentScheduleRule.findFirst({
      where: { name: rule.name },
    })
    if (!existing) {
      await prisma.contentScheduleRule.create({ data: rule })
      console.log(`Created schedule rule: ${rule.name}`)
    } else {
      console.log(`Schedule rule already exists: ${rule.name}`)
    }
  }

  console.log('Database seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
