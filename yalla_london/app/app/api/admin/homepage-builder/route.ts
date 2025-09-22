import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    // Get homepage configuration from database
    const homepageConfig = await prisma.apiSettings.findFirst({
      where: {
        key_name: 'homepage_config',
        is_active: true
      }
    })

    if (homepageConfig) {
      return NextResponse.json({
        success: true,
        config: homepageConfig.value
      })
    }

    // Return default configuration
    const defaultConfig = {
      modules: [
        {
          id: 'hero-1',
          type: 'hero',
          title: 'Hero Section',
          order: 1,
          isVisible: true,
          content: {
            headline: 'Welcome to Yalla London',
            subheading: 'Discover the best of London with our curated experiences',
            backgroundImage: '',
            ctaPrimary: { text: 'Explore Now', url: '/recommendations' },
            ctaSecondary: { text: 'Learn More', url: '/about' }
          }
        },
        {
          id: 'articles-1',
          type: 'articles',
          title: 'Latest Articles',
          order: 2,
          isVisible: true,
          content: {
            title: 'Latest London Stories',
            limit: 6,
            showExcerpt: true,
            showAuthor: true,
            showDate: true
          }
        }
      ],
      globalSettings: {
        showHeader: true,
        showFooter: true,
        maxWidth: 'contained'
      }
    }

    return NextResponse.json({
      success: true,
      config: defaultConfig
    })
  } catch (error) {
    console.error('Error fetching homepage config:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch homepage configuration' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const config = await request.json()

    // Validate configuration
    if (!config.modules || !Array.isArray(config.modules)) {
      return NextResponse.json(
        { success: false, error: 'Invalid homepage configuration' },
        { status: 400 }
      )
    }

    // Save homepage configuration to database
    await prisma.apiSettings.upsert({
      where: {
        key_name: 'homepage_config'
      },
      update: {
        value: config,
        is_active: true,
        updated_at: new Date()
      },
      create: {
        key_name: 'homepage_config',
        value: config,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    })

    // Invalidate cache to apply changes
    try {
      await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/revalidate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paths: ['/', '/admin/design/homepage']
        })
      })
    } catch (cacheError) {
      console.warn('Cache invalidation failed:', cacheError)
    }

    return NextResponse.json({
      success: true,
      message: 'Homepage configuration saved successfully'
    })
  } catch (error) {
    console.error('Error saving homepage config:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save homepage configuration' },
      { status: 500 }
    )
  }
}
