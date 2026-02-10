export const dynamic = 'force-dynamic';
export const revalidate = 0;


import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from "@/lib/admin-middleware";


// Get all entities
export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const search = searchParams.get('search');

    const whereClause: any = {};
    if (type && type !== 'all') whereClause.type = type;
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    // For now, return mock data since we don't have entities table yet
    const mockEntities = [
      {
        id: '1',
        name: 'Yalla London',
        type: 'Organization',
        description: 'Luxury London travel guide and experience curator',
        url: 'https://yallalondon.com',
        identifier: '#organization-yalla-london',
        sameAs: [
          'https://www.instagram.com/yallalondon',
          'https://twitter.com/yallalondon'
        ],
        properties: {
          logo: 'https://i.pinimg.com/736x/fc/41/c5/fc41c56045c5b08eb352453e0b891d97.jpg',
          contactEmail: 'hello@yallalondon.com'
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        usageCount: 25
      },
      {
        id: '2',
        name: 'London',
        type: 'Place',
        description: 'Capital city of England and the United Kingdom',
        url: 'https://www.london.gov.uk',
        identifier: '#place-london',
        sameAs: [
          'https://en.wikipedia.org/wiki/London',
          'https://www.visitlondon.com'
        ],
        properties: {
          latitude: 51.5074,
          longitude: -0.1278,
          timezone: 'Europe/London'
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        usageCount: 156
      }
    ];

    // Apply filters to mock data
    let filteredEntities = mockEntities;
    
    if (type && type !== 'all') {
      filteredEntities = filteredEntities.filter(entity => entity.type === type);
    }
    
    if (search) {
      filteredEntities = filteredEntities.filter(entity =>
        entity.name.toLowerCase().includes(search.toLowerCase()) ||
        entity.description.toLowerCase().includes(search.toLowerCase())
      );
    }

    return NextResponse.json({
      success: true,
      entities: filteredEntities
    });

  } catch (error) {
    console.error('Failed to fetch entities:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch entities' },
      { status: 500 }
    );
  }
}

// Create new entity
export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const entityData = await request.json();
    
    // Validate required fields
    if (!entityData.name || !entityData.type) {
      return NextResponse.json(
        { error: 'Name and type are required' },
        { status: 400 }
      );
    }

    // Mock creation - in real implementation, save to database
    const newEntity = {
      id: Date.now().toString(),
      ...entityData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0
    };

    return NextResponse.json({
      success: true,
      message: 'Entity created successfully',
      entity: newEntity
    });

  } catch (error) {
    console.error('Failed to create entity:', error);
    return NextResponse.json(
      { error: 'Failed to create entity' },
      { status: 500 }
    );
  }
}
