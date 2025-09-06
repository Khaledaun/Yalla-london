
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { extractEmbedInfo } from '@/lib/social-embed-utils'

export async function GET() {
  try {
    const embeds = await prisma.socialEmbed.findMany({
      orderBy: { created_at: 'desc' }
    })

    return NextResponse.json(embeds)
  } catch (error) {
    console.error('Error fetching social embeds:', error)
    return NextResponse.json(
      { error: 'Failed to fetch social embeds' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url, platform, embedId, aspectRatio, thumbnail, title, author } = body

    // Validate URL
    const embedInfo = extractEmbedInfo(url)
    if (!embedInfo) {
      return NextResponse.json(
        { error: 'Invalid social media URL' },
        { status: 400 }
      )
    }

    // Check if embed already exists
    const existing = await prisma.socialEmbed.findFirst({
      where: { embed_id: embedId }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Embed already exists' },
        { status: 409 }
      )
    }

    // Create new embed
    const embed = await prisma.socialEmbed.create({
      data: {
        platform,
        url,
        embed_id: embedId,
        thumbnail,
        title,
        author,
        aspect_ratio: aspectRatio || embedInfo.aspectRatio,
        metadata: {
          extractedAt: new Date().toISOString(),
          originalThumbnail: embedInfo.thumbnailUrl
        }
      }
    })

    return NextResponse.json(embed, { status: 201 })
  } catch (error) {
    console.error('Error creating social embed:', error)
    return NextResponse.json(
      { error: 'Failed to create social embed' },
      { status: 500 }
    )
  }
}
