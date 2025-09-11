export const dynamic = 'force-dynamic';
export const revalidate = 0;


import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fileType = searchParams.get('fileType')
    const limit = parseInt(searchParams.get('limit') || '50')
    
    const where = fileType && fileType !== 'all' ? { file_type: fileType } : {}

    const assets = await prisma.mediaAsset.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: limit
    })

    return NextResponse.json(assets)
  } catch (error) {
    console.error('Error fetching media assets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch media assets' },
      { status: 500 }
    )
  }
}
