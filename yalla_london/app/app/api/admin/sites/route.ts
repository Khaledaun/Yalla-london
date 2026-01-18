/**
 * Sites API for Site Selector
 *
 * Returns full site data for the admin dashboard site selector.
 * This is a simplified version that returns Site objects matching the schema.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering to avoid build-time database access
export const dynamic = 'force-dynamic'

// Mock sites for development when database is not available
const MOCK_SITES = [
  {
    id: 'yalla-london-main',
    name: 'Yalla London',
    slug: 'yalla-london',
    domain: 'yallalondon.com',
    theme_id: null,
    settings_json: {},
    homepage_json: null,
    logo_url: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    default_locale: 'en',
    direction: 'ltr',
    favicon_url: null,
    primary_color: '#1A1F36',
    secondary_color: '#E8634B',
    features_json: null,
  },
  {
    id: 'arab-maldives',
    name: 'Arab Maldives',
    slug: 'arab-maldives',
    domain: 'arabmaldives.com',
    theme_id: null,
    settings_json: {},
    homepage_json: null,
    logo_url: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    default_locale: 'ar',
    direction: 'rtl',
    favicon_url: null,
    primary_color: '#0C4A6E',
    secondary_color: '#0EA5E9',
    features_json: null,
  },
  {
    id: 'dubai-travel-guide',
    name: 'Dubai Travel Guide',
    slug: 'dubai-travel-guide',
    domain: 'dubaitravelguide.com',
    theme_id: null,
    settings_json: {},
    homepage_json: null,
    logo_url: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    default_locale: 'en',
    direction: 'ltr',
    favicon_url: null,
    primary_color: '#B45309',
    secondary_color: '#F59E0B',
    features_json: null,
  },
]

export async function GET(request: NextRequest) {
  try {
    // Try to fetch from database
    const sites = await prisma.site.findMany({
      where: { is_active: true },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        domain: true,
        theme_id: true,
        settings_json: true,
        homepage_json: true,
        logo_url: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        default_locale: true,
        direction: true,
        favicon_url: true,
        primary_color: true,
        secondary_color: true,
        features_json: true,
      },
    })

    // Return sites if found
    if (sites && sites.length > 0) {
      return NextResponse.json({ sites, source: 'database' })
    }

    // Return mock sites if database is empty or unavailable
    return NextResponse.json({ sites: MOCK_SITES, source: 'mock' })
  } catch (error) {
    console.error('Failed to fetch sites:', error)

    // Return mock sites on error (e.g., database not available)
    return NextResponse.json({
      sites: MOCK_SITES,
      source: 'mock',
      error: 'Database unavailable, using mock data',
    })
  }
}

// Get a single site by ID
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { siteId } = body

    if (!siteId) {
      return NextResponse.json(
        { error: 'siteId is required' },
        { status: 400 }
      )
    }

    // Try to fetch from database
    const site = await prisma.site.findUnique({
      where: { id: siteId },
      select: {
        id: true,
        name: true,
        slug: true,
        domain: true,
        theme_id: true,
        settings_json: true,
        homepage_json: true,
        logo_url: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        default_locale: true,
        direction: true,
        favicon_url: true,
        primary_color: true,
        secondary_color: true,
        features_json: true,
      },
    })

    if (site) {
      return NextResponse.json({ site, source: 'database' })
    }

    // Check mock sites
    const mockSite = MOCK_SITES.find(s => s.id === siteId)
    if (mockSite) {
      return NextResponse.json({ site: mockSite, source: 'mock' })
    }

    return NextResponse.json(
      { error: 'Site not found' },
      { status: 404 }
    )
  } catch (error) {
    console.error('Failed to fetch site:', error)

    // Try mock sites on error
    const body = await request.json().catch(() => ({}))
    const mockSite = MOCK_SITES.find(s => s.id === body?.siteId)

    if (mockSite) {
      return NextResponse.json({
        site: mockSite,
        source: 'mock',
        error: 'Database unavailable',
      })
    }

    return NextResponse.json(
      { error: 'Failed to fetch site' },
      { status: 500 }
    )
  }
}
