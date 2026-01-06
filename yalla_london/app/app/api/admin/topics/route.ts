import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { prisma } from '@/lib/prisma'



export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const locale = searchParams.get('locale')
    const status = searchParams.get('status')

    // Build where clause
    const where: any = {}
    if (locale) where.locale = locale
    if (status) where.status = status

    // Get topics with real data
    const topics = await prisma.topicProposal.findMany({
      where,
      include: {
        scheduled_content: {
          include: {
            topic_proposal: true
          }
        }
      },
      orderBy: [
        { planned_at: 'asc' },
        { created_at: 'desc' }
      ]
    })

    // Get pipeline stats
    const stats = await getPipelineStats()

    // Get next 7 days schedule
    const nextWeek = new Date()
    nextWeek.setDate(nextWeek.getDate() + 7)
    
    const upcomingSchedule = await prisma.topicProposal.findMany({
      where: {
        planned_at: {
          gte: new Date(),
          lte: nextWeek
        },
        status: {
          in: ['planned', 'queued', 'generated']
        }
      },
      orderBy: {
        planned_at: 'asc'
      }
    })

    return NextResponse.json({
      topics,
      stats,
      upcomingSchedule
    })

  } catch (error) {
    console.error('Error fetching topics data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, data } = body

    switch (action) {
      case 'create_topic':
        return await handleCreateTopic(data)
      
      case 'update_topic':
        return await handleUpdateTopic(data)
      
      case 'queue_for_generation':
        return await handleQueueForGeneration(data)
      
      case 'reschedule_topic':
        return await handleRescheduleTopic(data)
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error processing topics request:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function handleCreateTopic(data: any) {
  // Validate required fields
  if (!data.title || !data.primary_keyword || !data.locale) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Validate featured long-tails (exactly 2 required)
  if (!data.featured_longtails || data.featured_longtails.length !== 2) {
    return NextResponse.json({ error: 'Exactly 2 featured long-tails are required' }, { status: 400 })
  }

  // Validate authority links (3-4 required)
  if (!data.authority_links_json || 
      !Array.isArray(data.authority_links_json) || 
      data.authority_links_json.length < 3 || 
      data.authority_links_json.length > 4) {
    return NextResponse.json({ error: '3-4 authority links are required' }, { status: 400 })
  }

  const topic = await prisma.topicProposal.create({
    data: {
      title: data.title,
      locale: data.locale,
      primary_keyword: data.primary_keyword,
      longtails: data.longtails || [],
      featured_longtails: data.featured_longtails,
      questions: data.questions || [],
      authority_links_json: data.authority_links_json,
      intent: data.intent || 'info',
      suggested_page_type: data.suggested_page_type || 'guide',
      evergreen: data.evergreen !== undefined ? data.evergreen : true,
      season: data.season,
      planned_at: data.planned_at,
      confidence_score: data.confidence_score
    }
  })

  return NextResponse.json({ success: true, topic })
}

async function handleUpdateTopic(data: any) {
  const topic = await prisma.topicProposal.update({
    where: { id: data.id },
    data: {
      title: data.title,
      primary_keyword: data.primary_keyword,
      longtails: data.longtails,
      featured_longtails: data.featured_longtails,
      questions: data.questions,
      authority_links_json: data.authority_links_json,
      intent: data.intent,
      suggested_page_type: data.suggested_page_type,
      evergreen: data.evergreen,
      season: data.season,
      planned_at: data.planned_at,
      confidence_score: data.confidence_score,
      updated_at: new Date()
    }
  })

  return NextResponse.json({ success: true, topic })
}

async function handleQueueForGeneration(data: any) {
  const { topicId, scheduledTime } = data

  if (!scheduledTime) {
    return NextResponse.json({ error: 'Scheduled time is required' }, { status: 400 })
  }

  // Update topic status to queued
  const topic = await prisma.topicProposal.update({
    where: { id: topicId },
    data: {
      status: 'queued',
      planned_at: new Date(scheduledTime)
    }
  })

  // Create scheduled content record
  const scheduledContent = await prisma.scheduledContent.create({
    data: {
      title: topic.title,
      content: '', // Will be generated
      content_type: 'blog_post',
      language: topic.locale,
      scheduled_time: new Date(scheduledTime),
      status: 'pending',
      topic_proposal_id: topicId,
      page_type: topic.suggested_page_type,
      generation_source: 'topic_proposal'
    }
  })

  return NextResponse.json({ 
    success: true, 
    topic, 
    scheduledContent 
  })
}

async function handleRescheduleTopic(data: any) {
  const { topicId, newScheduledTime } = data

  const topic = await prisma.topicProposal.update({
    where: { id: topicId },
    data: {
      planned_at: new Date(newScheduledTime)
    }
  })

  // Update related scheduled content
  await prisma.scheduledContent.updateMany({
    where: { topic_proposal_id: topicId },
    data: {
      scheduled_time: new Date(newScheduledTime)
    }
  })

  return NextResponse.json({ success: true, topic })
}

async function getPipelineStats() {
  const [
    plannedCount,
    queuedCount,
    generatedCount,
    draftedCount,
    readyCount,
    publishedCount,
    enCount,
    arCount
  ] = await Promise.all([
    prisma.topicProposal.count({ where: { status: 'planned' } }),
    prisma.topicProposal.count({ where: { status: 'queued' } }),
    prisma.topicProposal.count({ where: { status: 'generated' } }),
    prisma.topicProposal.count({ where: { status: 'drafted' } }),
    prisma.topicProposal.count({ where: { status: 'ready' } }),
    prisma.topicProposal.count({ where: { status: 'published' } }),
    prisma.topicProposal.count({ where: { locale: 'en' } }),
    prisma.topicProposal.count({ where: { locale: 'ar' } })
  ])

  return {
    planned: plannedCount,
    queued: queuedCount,
    generated: generatedCount,
    drafted: draftedCount,
    ready: readyCount,
    published: publishedCount,
    enBacklog: enCount,
    arBacklog: arCount,
    totalBacklog: enCount + arCount
  }
}
