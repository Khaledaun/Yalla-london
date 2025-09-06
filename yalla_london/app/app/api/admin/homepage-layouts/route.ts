
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Mock data - in real implementation, this would use database
const mockLayouts = [
  {
    id: 'layout-1',
    name: 'Default English Layout',
    language: 'en',
    isActive: true,
    blocks: [
      {
        id: 'hero-1',
        type: 'hero',
        title: 'Hero Section',
        isEnabled: true,
        order: 0,
        settings: {
          headline: 'Welcome to Yalla London',
          subheadline: 'Discover luxury experiences in the heart of London',
          backgroundImage: '/hero-bg.jpg',
          ctaText: 'Explore Now',
          ctaLink: '/experiences',
          overlay: 0.4
        }
      },
      {
        id: 'featured-1',
        type: 'featured-experiences',
        title: 'Featured Experiences',
        isEnabled: true,
        order: 1,
        settings: {
          title: 'Featured Experiences',
          subtitle: 'Hand-picked luxury experiences in London',
          maxItems: 6,
          layout: 'grid',
          showPrices: true,
          categoryFilter: 'all'
        }
      },
      {
        id: 'blog-1',
        type: 'blog-grid',
        title: 'Latest Guides',
        isEnabled: true,
        order: 2,
        settings: {
          title: 'Latest Guides',
          subtitle: 'Insider tips and recommendations',
          maxItems: 6,
          layout: 'grid',
          categoryFilter: 'all',
          showExcerpts: true
        }
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Get homepage layouts
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      layouts: mockLayouts
    });
  } catch (error) {
    console.error('Failed to fetch homepage layouts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch layouts' },
      { status: 500 }
    );
  }
}

// Save homepage layout
export async function POST(request: NextRequest) {
  try {
    const layoutData = await request.json();
    
    // In real implementation, save to database
    const existingIndex = mockLayouts.findIndex(l => l.id === layoutData.id);
    
    if (existingIndex >= 0) {
      mockLayouts[existingIndex] = {
        ...layoutData,
        updatedAt: new Date().toISOString()
      };
    } else {
      mockLayouts.push({
        ...layoutData,
        id: `layout-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Layout saved successfully'
    });

  } catch (error) {
    console.error('Failed to save homepage layout:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save layout' },
      { status: 500 }
    );
  }
}
