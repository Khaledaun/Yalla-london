export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/admin-middleware'
import { prisma } from '@/lib/db'



export const GET = withAdminAuth(async (_request: NextRequest) => {
  try {
    // Get site configuration
    const siteConfig = await prisma.siteConfig.findFirst({
      where: { site_id: 'default' } // For single-site setup
    })

    // Get homepage blocks
    const homepageBlocks = await prisma.homepageBlock.findMany({
      include: {
        media: true
      },
      orderBy: {
        position: 'asc'
      }
    })

    // Get media assets for picker
    const mediaAssets = await prisma.mediaAsset.findMany({
      where: {
        file_type: {
          in: ['image', 'video']
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    })

    // Get homepage versions
    const homepageVersions = await prisma.homepageVersion.findMany({
      orderBy: {
        created_at: 'desc'
      },
      take: 10
    })

    return NextResponse.json({
      siteConfig,
      homepageBlocks,
      mediaAssets,
      homepageVersions
    })

  } catch (error) {
    console.error('Error fetching site data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { action, data } = body

    switch (action) {
      case 'update_hero_config':
        return await handleUpdateHeroConfig(data)

      case 'update_homepage_layout':
        return await handleUpdateHomepageLayout(data)

      case 'create_homepage_version':
        return await handleCreateHomepageVersion(data)

      case 'publish_homepage':
        return await handlePublishHomepage(data)

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error processing site request:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

async function handleUpdateHeroConfig(data: any) {
  const {
    hero_video_url,
    hero_mobile_video_url,
    hero_poster_url,
    hero_autoplay,
    hero_muted,
    hero_loop,
    hero_cta_label,
    hero_cta_href,
    hero_headline,
    hero_subheadline
  } = data

  // Upsert site config
  const siteConfig = await prisma.siteConfig.upsert({
    where: { site_id: 'default' },
    update: {
      hero_video_url,
      hero_mobile_video_url,
      hero_poster_url,
      hero_autoplay: hero_autoplay !== undefined ? hero_autoplay : true,
      hero_muted: hero_muted !== undefined ? hero_muted : true,
      hero_loop: hero_loop !== undefined ? hero_loop : true,
      hero_cta_label,
      hero_cta_href,
      hero_headline,
      hero_subheadline,
      updated_at: new Date()
    },
    create: {
      site_id: 'default',
      hero_video_url,
      hero_mobile_video_url,
      hero_poster_url,
      hero_autoplay: hero_autoplay !== undefined ? hero_autoplay : true,
      hero_muted: hero_muted !== undefined ? hero_muted : true,
      hero_loop: hero_loop !== undefined ? hero_loop : true,
      hero_cta_label,
      hero_cta_href,
      hero_headline,
      hero_subheadline
    }
  })

  return NextResponse.json({ success: true, siteConfig })
}

async function handleUpdateHomepageLayout(data: any) {
  const { blocks } = data

  // Delete existing blocks
  await prisma.homepageBlock.deleteMany({})

  // Create new blocks
  const newBlocks = await Promise.all(
    blocks.map((block: any, index: number) =>
      prisma.homepageBlock.create({
        data: {
          type: block.type,
          title_en: block.title_en,
          title_ar: block.title_ar,
          content_en: block.content_en,
          content_ar: block.content_ar,
          config: block.config,
          media_id: block.media_id,
          position: index,
          enabled: block.enabled !== undefined ? block.enabled : true,
          version: 'draft',
          language: block.language || 'both'
        }
      })
    )
  )

  return NextResponse.json({ success: true, blocks: newBlocks })
}

async function handleCreateHomepageVersion(data: any) {
  const { title, blocks_data } = data

  const version = await prisma.homepageVersion.create({
    data: {
      version_id: `v${Date.now()}`,
      title,
      blocks_data,
      published: false
    }
  })

  return NextResponse.json({ success: true, version })
}

async function handlePublishHomepage(data: any) {
  const { version_id } = data

  // Update all blocks to published version
  await prisma.homepageBlock.updateMany({
    data: {
      version: 'published'
    }
  })

  // Mark version as published
  const version = await prisma.homepageVersion.update({
    where: { version_id },
    data: {
      published: true
    }
  })

  // Update site config with published layout
  await prisma.siteConfig.upsert({
    where: { site_id: 'default' },
    update: {
      homepage_json: data.blocks_data,
      updated_at: new Date()
    },
    create: {
      site_id: 'default',
      homepage_json: data.blocks_data
    }
  })

  return NextResponse.json({ success: true, version })
}
