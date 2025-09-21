import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface TopicProposal {
  id: string
  title: string
  keywords: string[]
  longtails: string[]
  authorityLinks: string[]
  publishDate: string
  status: 'generated' | 'pending' | 'approved' | 'auto-draft' | 'human-review' | 'seo-audit' | 'ready' | 'scheduled-publish'
  priority: 'low' | 'medium' | 'high'
  contentType: string
  createdAt: string
  updatedAt: string
}

// GET - List all topic proposals
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const search = searchParams.get('search')
    
    const skip = (page - 1) * limit

    // Build where clause
    const whereClause: any = {}
    if (status && status !== 'all') {
      whereClause.status = status
    }
    if (priority && priority !== 'all') {
      whereClause.priority = priority
    }
    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Get topics from database
    const topics = await prisma.topicProposal.findMany({
      where: whereClause,
      orderBy: { created_at: 'desc' },
      skip,
      take: limit
    })

    // Format the topics for frontend
    const formattedTopics = topics.map(topic => ({
      id: topic.id,
      title: topic.title,
      keywords: topic.keywords || [],
      longtails: topic.longtail_keywords || [],
      authorityLinks: topic.authority_links || [],
      publishDate: topic.target_publish_date || new Date().toISOString(),
      status: mapTopicStatus(topic.status),
      priority: topic.priority || 'medium',
      contentType: topic.content_type || 'guide',
      createdAt: topic.created_at.toISOString(),
      updatedAt: topic.updated_at.toISOString()
    }))

    // Get total count
    const total = await prisma.topicProposal.count({
      where: whereClause
    })

    return NextResponse.json({
      success: true,
      data: formattedTopics,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    })
  } catch (error) {
    console.error('Error fetching topics:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch topics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST - Create new topic proposal
export async function POST(request: NextRequest) {
  try {
    const topicData = await request.json()
    
    // Validate required fields
    if (!topicData.title) {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 }
      )
    }

    // Create the topic proposal
    const newTopic = await prisma.topicProposal.create({
      data: {
        title: topicData.title,
        description: topicData.description || '',
        keywords: topicData.keywords || [],
        longtail_keywords: topicData.longtails || [],
        authority_links: topicData.authorityLinks || [],
        target_publish_date: topicData.publishDate ? new Date(topicData.publishDate) : new Date(),
        status: 'pending',
        priority: topicData.priority || 'medium',
        content_type: topicData.contentType || 'guide',
        research_phase: 'topic_research',
        created_at: new Date(),
        updated_at: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        id: newTopic.id,
        title: newTopic.title,
        keywords: newTopic.keywords || [],
        longtails: newTopic.longtail_keywords || [],
        authorityLinks: newTopic.authority_links || [],
        publishDate: newTopic.target_publish_date?.toISOString() || new Date().toISOString(),
        status: mapTopicStatus(newTopic.status),
        priority: newTopic.priority || 'medium',
        contentType: newTopic.content_type || 'guide',
        createdAt: newTopic.created_at.toISOString(),
        updatedAt: newTopic.updated_at.toISOString()
      },
      message: 'Topic proposal created successfully'
    })
  } catch (error) {
    console.error('Error creating topic:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create topic proposal',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Helper function to map database status to frontend status
function mapTopicStatus(dbStatus: string): string {
  const statusMap: { [key: string]: string } = {
    'pending': 'pending',
    'approved': 'approved',
    'rejected': 'rejected',
    'in_progress': 'auto-draft',
    'review': 'human-review',
    'ready': 'ready',
    'published': 'scheduled-publish'
  }
  return statusMap[dbStatus] || 'pending'
}