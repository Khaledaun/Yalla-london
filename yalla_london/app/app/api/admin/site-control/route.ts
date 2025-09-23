import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/admin-middleware'

// GET - Fetch site configuration and homepage blocks
export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'homepage'
    
    switch (type) {
      case 'homepage':
        return NextResponse.json({
          blocks: [
            {
              id: '1',
              type: 'hero',
              title_en: 'Welcome to London',
              title_ar: 'مرحباً بك في لندن',
              content_en: 'Discover the best of London with our comprehensive guides and recommendations',
              content_ar: 'اكتشف أفضل ما في لندن من خلال أدلتنا الشاملة والتوصيات',
              position: 1,
              enabled: true,
              version: 'draft',
              language: 'both',
              config: {
                backgroundType: 'video',
                overlay: true,
                overlayOpacity: 0.4
              },
              heroVideoId: 'video_1',
              heroVideoPoster: '/images/hero-poster.jpg',
              heroVideoAutoplay: true,
              heroVideoMuted: true,
              heroVideoLoop: true
            },
            {
              id: '2',
              type: 'featured',
              title_en: 'Featured Experiences',
              title_ar: 'التجارب المميزة',
              content_en: 'Handpicked experiences for your London adventure',
              content_ar: 'تجارب مختارة بعناية لمغامرتك في لندن',
              position: 2,
              enabled: true,
              version: 'draft',
              language: 'both',
              config: {
                layout: 'grid',
                itemsPerRow: 3,
                showRatings: true
              }
            },
            {
              id: '3',
              type: 'events',
              title_en: 'Upcoming Events',
              title_ar: 'الأحداث القادمة',
              content_en: 'Don\'t miss out on London\'s exciting events',
              content_ar: 'لا تفوت الأحداث المثيرة في لندن',
              position: 3,
              enabled: true,
              version: 'draft',
              language: 'both',
              config: {
                limit: 6,
                showDates: true,
                showLocations: true
              }
            }
          ]
        })
        
      case 'media':
        return NextResponse.json({
          assets: [
            {
              id: 'video_1',
              filename: 'london-hero-video.mp4',
              url: '/videos/london-hero-video.mp4',
              file_type: 'video',
              width: 1920,
              height: 1080,
              isVideo: true,
              isHeroVideo: true,
              duration: 30,
              createdAt: new Date().toISOString()
            },
            {
              id: 'image_1',
              filename: 'hero-poster.jpg',
              url: '/images/hero-poster.jpg',
              file_type: 'image',
              width: 1920,
              height: 1080,
              isVideo: false,
              isHeroVideo: false,
              createdAt: new Date().toISOString()
            },
            {
              id: 'video_2',
              filename: 'london-mobile-hero.mp4',
              url: '/videos/london-mobile-hero.mp4',
              file_type: 'video',
              width: 1080,
              height: 1920,
              isVideo: true,
              isHeroVideo: true,
              duration: 25,
              createdAt: new Date().toISOString()
            },
            {
              id: 'image_2',
              filename: 'london-skyline.jpg',
              url: '/images/london-skyline.jpg',
              file_type: 'image',
              width: 1920,
              height: 1080,
              isVideo: false,
              isHeroVideo: false,
              createdAt: new Date().toISOString()
            }
          ]
        })
        
      case 'config':
        return NextResponse.json({
          siteConfig: {
            id: '1',
            homepage_json: {},
            hero_video_url: '/videos/london-hero-video.mp4',
            hero_mobile_video_url: '/videos/london-mobile-hero.mp4',
            hero_poster_url: '/images/hero-poster.jpg',
            hero_autoplay: true,
            hero_muted: true,
            hero_loop: true,
            hero_cta_label: 'Explore London',
            hero_cta_href: '/recommendations',
            hero_headline: 'Welcome to London',
            hero_subheadline: 'Discover the best of London with our comprehensive guides',
            theme_config: {
              primaryColor: '#8B5CF6',
              secondaryColor: '#F59E0B',
              fontFamily: 'Inter',
              logoUrl: '/images/logo.png',
              faviconUrl: '/images/favicon.ico'
            },
            seo_config: {
              defaultMetaDescription: 'Discover the best of London with our comprehensive guides and recommendations',
              defaultKeywords: 'London, travel, attractions, restaurants, events',
              ogImage: '/images/og-default.jpg'
            }
          }
        })
        
      case 'pages':
        return NextResponse.json({
          pages: [
            {
              id: 'privacy',
              title: 'Privacy Policy',
              slug: '/privacy',
              content_en: 'Privacy policy content...',
              content_ar: 'محتوى سياسة الخصوصية...',
              meta_title_en: 'Privacy Policy - Yalla London',
              meta_title_ar: 'سياسة الخصوصية - يلا لندن',
              meta_description_en: 'Our privacy policy...',
              meta_description_ar: 'سياسة الخصوصية الخاصة بنا...',
              status: 'published',
              updatedAt: new Date().toISOString()
            },
            {
              id: 'terms',
              title: 'Terms of Service',
              slug: '/terms',
              content_en: 'Terms of service content...',
              content_ar: 'محتوى شروط الخدمة...',
              meta_title_en: 'Terms of Service - Yalla London',
              meta_title_ar: 'شروط الخدمة - يلا لندن',
              meta_description_en: 'Our terms of service...',
              meta_description_ar: 'شروط الخدمة الخاصة بنا...',
              status: 'published',
              updatedAt: new Date().toISOString()
            },
            {
              id: 'contact',
              title: 'Contact Us',
              slug: '/contact',
              content_en: 'Contact us content...',
              content_ar: 'محتوى اتصل بنا...',
              meta_title_en: 'Contact Us - Yalla London',
              meta_title_ar: 'اتصل بنا - يلا لندن',
              meta_description_en: 'Get in touch with us...',
              meta_description_ar: 'تواصل معنا...',
              status: 'published',
              updatedAt: new Date().toISOString()
            },
            {
              id: 'about',
              title: 'About Us',
              slug: '/about',
              content_en: 'About us content...',
              content_ar: 'محتوى من نحن...',
              meta_title_en: 'About Us - Yalla London',
              meta_title_ar: 'من نحن - يلا لندن',
              meta_description_en: 'Learn more about us...',
              meta_description_ar: 'تعرف على المزيد عنا...',
              status: 'published',
              updatedAt: new Date().toISOString()
            }
          ]
        })
        
      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
    }
  } catch (error) {
    console.error('Site Control API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch site data' },
      { status: 500 }
    )
  }
})

// POST - Update site configuration, blocks, or pages
export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { action, data } = body
    
    switch (action) {
      case 'update-blocks':
        const { blocks } = data
        
        // Simulate updating homepage blocks
        return NextResponse.json({
          success: true,
          message: 'Homepage blocks updated successfully',
          blocks,
          timestamp: new Date().toISOString()
        })
        
      case 'publish-homepage':
        const { blocksToPublish } = data
        
        // Simulate publishing homepage
        return NextResponse.json({
          success: true,
          message: 'Homepage published successfully',
          publishedBlocks: blocksToPublish,
          timestamp: new Date().toISOString()
        })
        
      case 'update-config':
        const { config } = data
        
        // Simulate updating site configuration
        return NextResponse.json({
          success: true,
          message: 'Site configuration updated successfully',
          config,
          timestamp: new Date().toISOString()
        })
        
      case 'update-page':
        const { pageId, pageData } = data
        
        // Simulate updating static page
        return NextResponse.json({
          success: true,
          message: `Page ${pageId} updated successfully`,
          page: pageData,
          timestamp: new Date().toISOString()
        })
        
      case 'upload-media':
        const { mediaData } = data
        
        // Simulate media upload
        return NextResponse.json({
          success: true,
          message: 'Media uploaded successfully',
          media: {
            id: `media_${Date.now()}`,
            ...mediaData,
            createdAt: new Date().toISOString()
          }
        })
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Site Control POST error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
})
