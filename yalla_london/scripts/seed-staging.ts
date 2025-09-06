
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seedStaging() {
  console.log('🌱 Seeding staging database...')

  // Create sample media assets
  const heroImage = await prisma.mediaAsset.create({
    data: {
      filename: 'london-hero.jpg',
      original_name: 'london-skyline-hero.jpg',
      cloud_storage_path: 'yalla-london/uploads/london-hero.jpg',
      url: 'https://images.pexels.com/photos/29096732/pexels-photo-29096732.jpeg?cs=srgb&dl=pexels-hub-jacqu-750015482-29096732.jpg&fm=jpg',
      file_type: 'image',
      mime_type: 'image/jpeg',
      file_size: 2048000,
      width: 1920,
      height: 1080,
      alt_text: 'London skyline at sunset with Thames',
      title: 'London Hero Image',
      tags: ['london', 'skyline', 'hero', 'thames']
    }
  })

  // Create sample social embeds
  const socialEmbeds = await Promise.all([
    prisma.socialEmbed.create({
      data: {
        platform: 'instagram',
        url: 'https://www.instagram.com/p/sample123/',
        embed_id: 'sample123',
        thumbnail: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgMrg7VGOkfDcwTrZi1s6NtghPtr8CTK-C3i4qEmslkfWasjJ0LufCG6TwX1bhICOdg3fnOzEmvV_9HTxR_e7OnWLRJDzwMsUkPi4_lPo_RTCBDPGM4cjTXiXw1AdXx_35_tlnYwLb-B8l-/s1600/Claridges2.jpg',
        title: 'Luxury afternoon tea at Claridges',
        aspect_ratio: '1:1',
        metadata: { source: 'staging-seed' }
      }
    }),
    prisma.socialEmbed.create({
      data: {
        platform: 'youtube',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        embed_id: 'dQw4w9WgXcQ',
        title: 'Hidden gems of Covent Garden',
        aspect_ratio: '16:9',
        metadata: { source: 'staging-seed' }
      }
    })
  ])

  // Create homepage blocks
  const homepageBlocks = await Promise.all([
    prisma.homepageBlock.create({
      data: {
        type: 'hero',
        title_en: 'Discover Luxury London',
        title_ar: 'اكتشف لندن الفاخرة',
        content_en: 'Your curated guide to the finest experiences in London',
        content_ar: 'دليلك المنسق لأفضل التجارب في لندن',
        config: {
          backgroundColor: '#1a1a1a',
          textColor: '#ffffff',
          buttonColor: '#d4af37'
        },
        media_id: heroImage.id,
        position: 0,
        enabled: true,
        version: 'published',
        language: 'both'
      }
    }),
    prisma.homepageBlock.create({
      data: {
        type: 'featured-experiences',
        title_en: 'Featured Experiences',
        title_ar: 'التجارب المميزة',
        content_en: 'Hand-picked luxury experiences in London',
        content_ar: 'تجارب فاخرة مختارة بعناية في لندن',
        config: { maxItems: 6, layout: 'grid' },
        position: 1,
        enabled: true,
        version: 'published',
        language: 'both'
      }
    })
  ])

  // Create sample blog posts
  const blogPosts = await Promise.all([
    prisma.blogPost.create({
      data: {
        title_en: 'Top 10 Luxury Hotels in London 2024',
        title_ar: 'أفضل 10 فنادق فاخرة في لندن 2024',
        slug: 'luxury-hotels-london-2024',
        content_en: 'Discover London\'s most prestigious hotels...',
        content_ar: 'اكتشف أرقى فنادق لندن...',
        excerpt_en: 'From Claridges to The Ritz, explore luxury accommodation',
        excerpt_ar: 'من كلاريدجز إلى الريتز، استكشف الإقامة الفاخرة',
        published: true,
        featured_image: heroImage.cloud_storage_path,
        category_id: (await prisma.category.create({
          data: {
            name_en: 'Luxury Hotels',
            name_ar: 'الفنادق الفاخرة',
            slug: 'luxury-hotels'
          }
        })).id,
        author_id: (await prisma.user.create({
          data: {
            email: 'editor@yallalondon.com',
            name: 'Yalla London Editor'
          }
        })).id,
        tags: ['luxury', 'hotels', 'london', 'accommodation']
      }
    })
  ])

  // Create sample events
  const events = await prisma.recommendation.createMany({
    data: [
      {
        name_en: 'West End Theatre Show',
        name_ar: 'عرض مسرحي في ويست إند',
        type: 'attraction',
        category: 'luxury',
        description_en: 'Premium theatre experience in London\'s West End',
        description_ar: 'تجربة مسرحية راقية في ويست إند لندن',
        address_en: 'Various West End venues',
        address_ar: 'مواقع متعددة في ويست إند',
        price_range: '£50-200',
        rating: 4.8,
        features_en: ['Premium seating', 'VIP service', 'Champagne interval'],
        features_ar: ['مقاعد مميزة', 'خدمة VIP', 'استراحة مع الشمبانيا']
      },
      {
        name_en: 'Thames Luxury Dinner Cruise',
        name_ar: 'رحلة عشاء فاخرة في نهر التايمز',
        type: 'attraction',
        category: 'luxury',
        description_en: 'Elegant dining experience on the Thames',
        description_ar: 'تجربة طعام أنيقة على نهر التايمز',
        address_en: 'Westminster Pier',
        address_ar: 'رصيف وستمنستر',
        price_range: '£80-150',
        rating: 4.9,
        features_en: ['5-course meal', 'Live entertainment', 'City views'],
        features_ar: ['وجبة من 5 أطباق', 'ترفيه مباشر', 'إطلالات على المدينة']
      }
    ]
  })

  console.log(`✅ Staging seed completed:`)
  console.log(`   - Created ${socialEmbeds.length} social embeds`)
  console.log(`   - Created ${homepageBlocks.length} homepage blocks`)
  console.log(`   - Created ${blogPosts.length} blog posts`)
  console.log(`   - Created 2 events`)
  console.log(`   - Created 1 hero image`)
}

seedStaging()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
