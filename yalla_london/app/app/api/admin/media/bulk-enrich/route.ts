import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from "@/lib/supabase"
import { z } from 'zod'
import { requireAuth } from '@/lib/rbac'
import { isPremiumFeatureEnabled } from '@/src/lib/feature-flags'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BulkEnrichSchema = z.object({
  file_ids: z.array(z.string()).min(1).max(50), // Limit to 50 files per batch
  auto_process: z.boolean().default(true),
  priority: z.enum(['high', 'normal', 'low']).default('normal'),
  notification_email: z.string().email().optional()
})

/**
 * Bulk enrich media files
 * POST /api/admin/media/bulk-enrich
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and feature flag
    const authResult = await requireAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    if (!isPremiumFeatureEnabled('FEATURE_BULK_ENRICH')) {
      return NextResponse.json(
        { error: 'Bulk enrichment feature is not enabled' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = BulkEnrichSchema.parse(body)

    // Validate that all file IDs exist and are eligible for enrichment
    const { data: mediaFiles, error: fetchError } = await supabase
      .from('media_enrichment')
      .select('id, filename, file_type, enrichment_status')
      .in('id', validatedData.file_ids)

    if (fetchError) {
      console.error('Error fetching media files:', fetchError)
      return NextResponse.json(
        { error: 'Failed to validate media files' },
        { status: 500 }
      )
    }

    if (!mediaFiles || mediaFiles.length === 0) {
      return NextResponse.json(
        { error: 'No valid media files found' },
        { status: 404 }
      )
    }

    // Filter files that can be enriched (images only, not already processed)
    const eligibleFiles = mediaFiles.filter(file => 
      file.file_type.startsWith('image/') && 
      file.enrichment_status !== 'completed'
    )

    if (eligibleFiles.length === 0) {
      return NextResponse.json(
        { error: 'No eligible files for enrichment found' },
        { status: 400 }
      )
    }

    // Create bulk enrichment job
    const jobData = {
      job_type: 'bulk_media_enrichment',
      scheduled_for: new Date().toISOString(),
      payload: {
        file_ids: eligibleFiles.map(f => f.id),
        priority: validatedData.priority,
        auto_process: validatedData.auto_process,
        notification_email: validatedData.notification_email || user.email,
        total_files: eligibleFiles.length
      },
      status: 'pending',
      created_by: user.id,
      created_at: new Date().toISOString()
    }

    const { data: bulkJob, error: jobError } = await supabase
      .from('background_job')
      .insert([jobData])
      .select()
      .single()

    if (jobError) {
      console.error('Error creating bulk enrichment job:', jobError)
      return NextResponse.json(
        { error: 'Failed to create bulk enrichment job' },
        { status: 500 }
      )
    }

    // Update media files status to 'processing'
    const { error: updateError } = await supabase
      .from('media_enrichment')
      .update({
        enrichment_status: 'processing',
        updated_at: new Date().toISOString()
      })
      .in('id', eligibleFiles.map(f => f.id))

    if (updateError) {
      console.error('Error updating media enrichment status:', updateError)
      // Don't fail the request, the job will still process
    }

    // Process files asynchronously (in a real implementation, this would be handled by a background worker)
    processFilesInBackground(eligibleFiles, bulkJob.id, user.id)

    return NextResponse.json({
      success: true,
      data: {
        job_id: bulkJob.id,
        total_files: eligibleFiles.length,
        skipped_files: mediaFiles.length - eligibleFiles.length,
        estimated_completion: new Date(Date.now() + (eligibleFiles.length * 30 * 1000)).toISOString() // 30 seconds per file estimate
      },
      message: `Bulk enrichment started for ${eligibleFiles.length} files`
    })

  } catch (error) {
    console.error('Bulk enrichment error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Get bulk enrichment job status
 * GET /api/admin/media/bulk-enrich?job_id=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult instanceof NextResponse) return authResult

    if (!isPremiumFeatureEnabled('FEATURE_BULK_ENRICH')) {
      return NextResponse.json(
        { error: 'Bulk enrichment feature is not enabled' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('job_id')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (jobId) {
      // Get specific job status
      const { data: job, error: jobError } = await supabase
        .from('background_job')
        .select('*')
        .eq('id', jobId)
        .eq('job_type', 'bulk_media_enrichment')
        .single()

      if (jobError || !job) {
        return NextResponse.json(
          { error: 'Bulk enrichment job not found' },
          { status: 404 }
        )
      }

      // Get progress details
      const fileIds = job.payload.file_ids || []
      const { data: enrichedFiles, error: progressError } = await supabase
        .from('media_enrichment')
        .select('id, enrichment_status')
        .in('id', fileIds)

      if (!progressError && enrichedFiles) {
        const completed = enrichedFiles.filter(f => f.enrichment_status === 'completed').length
        const failed = enrichedFiles.filter(f => f.enrichment_status === 'failed').length
        const processing = enrichedFiles.filter(f => f.enrichment_status === 'processing').length

        job.progress = {
          total: fileIds.length,
          completed,
          failed,
          processing,
          percentage: Math.round((completed / fileIds.length) * 100)
        }
      }

      return NextResponse.json({
        data: job
      })
    } else {
      // List all bulk enrichment jobs
      const offset = (page - 1) * limit

      const { data: jobs, error, count } = await supabase
        .from('background_job')
        .select('*', { count: 'exact' })
        .eq('job_type', 'bulk_media_enrichment')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) {
        console.error('Error fetching bulk enrichment jobs:', error)
        return NextResponse.json(
          { error: 'Failed to fetch jobs' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        data: jobs || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          pages: Math.ceil((count || 0) / limit)
        }
      })
    }

  } catch (error) {
    console.error('Error fetching bulk enrichment status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Background processing function (simulated)
async function processFilesInBackground(files: any[], jobId: string, userId: string) {
  try {
    // Update job status to running
    await supabase
      .from('background_job')
      .update({ 
        status: 'running',
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)

    let completedCount = 0
    let failedCount = 0

    for (const file of files) {
      try {
        // Simulate enrichment processing
        await new Promise(resolve => setTimeout(resolve, 2000)) // 2 seconds per file

        // Mock enrichment data
        const enrichmentData = {
          alt_text: `AI-generated description for ${file.filename}`,
          description: `Detailed AI analysis of ${file.filename} showing various visual elements and content`,
          tags: ['ai-generated', 'auto-enriched', 'processed'],
          color_palette: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'],
          confidence_score: Math.random() * 0.3 + 0.7, // 70-100% confidence
          processing_time: Math.random() * 3 + 1 // 1-4 seconds
        }

        // Update media enrichment
        const { error: updateError } = await supabase
          .from('media_enrichment')
          .update({
            enrichment_status: 'completed',
            ai_description: enrichmentData.description,
            alt_text: enrichmentData.alt_text,
            tags: enrichmentData.tags,
            color_palette: enrichmentData.color_palette,
            confidence_score: enrichmentData.confidence_score,
            processing_time: enrichmentData.processing_time,
            updated_at: new Date().toISOString()
          })
          .eq('id', file.id)

        if (updateError) {
          throw updateError
        }

        completedCount++
        console.log(`Successfully enriched file ${file.id}`)

      } catch (error) {
        console.error(`Failed to enrich file ${file.id}:`, error)
        
        // Mark as failed
        await supabase
          .from('media_enrichment')
          .update({
            enrichment_status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            updated_at: new Date().toISOString()
          })
          .eq('id', file.id)

        failedCount++
      }
    }

    // Update job completion status
    await supabase
      .from('background_job')
      .update({
        status: failedCount === 0 ? 'completed' : 'completed_with_errors',
        completed_at: new Date().toISOString(),
        result: {
          total_files: files.length,
          completed: completedCount,
          failed: failedCount,
          success_rate: Math.round((completedCount / files.length) * 100)
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)

    console.log(`Bulk enrichment job ${jobId} completed: ${completedCount} success, ${failedCount} failed`)

  } catch (error) {
    console.error(`Bulk enrichment job ${jobId} failed:`, error)
    
    // Mark job as failed
    await supabase
      .from('background_job')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)
  }
}