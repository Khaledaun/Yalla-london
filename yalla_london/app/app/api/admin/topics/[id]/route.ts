/**
 * Phase 4 Topics Management API
 * Individual topic CRUD operations with Supabase integration
 */
import { NextRequest, NextResponse } from 'next/server';
import { isPremiumFeatureEnabled } from '@/src/lib/feature-flags';
import { requirePermission } from '@/lib/rbac';
import { getSupabaseClient } from "@/lib/supabase";
import { z } from 'zod';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Zod schemas for validation
const UpdateTopicSchema = z.object({
  status: z.enum(['proposed', 'approved', 'snoozed', 'rejected']).optional(),
  primary_keyword: z.string().min(1).max(200).optional(),
  longtails: z.array(z.string()).optional(),
  featured_longtails: z.array(z.string()).length(2).optional(),
  questions: z.array(z.string()).optional(),
  authority_links_json: z.array(z.object({
    url: z.string().url(),
    title: z.string(),
    sourceDomain: z.string()
  })).optional(),
  intent: z.enum(['info', 'transactional', 'event']).optional(),
  suggested_page_type: z.enum(['guide', 'place', 'event', 'list', 'faq', 'news', 'itinerary']).optional(),
  confidence_score: z.number().min(0).max(1).optional(),
});

// GET - Get specific topic
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Feature flag check for Phase 4
    if (!isPremiumFeatureEnabled('FEATURE_TOPICS_RESEARCH')) {
      return NextResponse.json(
        { error: 'Topics research feature is not enabled' },
        { status: 403 }
      );
    }

    // Permission check
    const permissionCheck = await requirePermission(request, 'view_analytics');
    if (permissionCheck instanceof NextResponse) {
      return permissionCheck;
    }

    // Fetch from Supabase
    const { data: topic, error } = await supabase
      .from('topic_proposal')
      .select(`
        *,
        scheduled_content:scheduled_content(id, title, status, published, published_time)
      `)
      .eq('id', params.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Topic not found' },
          { status: 404 }
        );
      }
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch topic' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: topic
    });

  } catch (error) {
    console.error('Topic fetch error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch topic',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PATCH - Update specific topic
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Feature flag check for Phase 4
    if (!isPremiumFeatureEnabled('FEATURE_TOPICS_RESEARCH')) {
      return NextResponse.json(
        { error: 'Topics research feature is not enabled' },
        { status: 403 }
      );
    }

    // Permission check
    const permissionCheck = await requirePermission(request, 'edit_content');
    if (permissionCheck instanceof NextResponse) {
      return permissionCheck;
    }

    const body = await request.json();
    
    // Validate input
    const validation = UpdateTopicSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validation.error.issues
        },
        { status: 400 }
      );
    }

    const updateData = validation.data;

    // Check if topic exists
    const { data: existingTopic, error: fetchError } = await supabase
      .from('topic_proposal')
      .select('*')
      .eq('id', params.id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Topic not found' },
          { status: 404 }
        );
      }
      console.error('Supabase fetch error:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch topic' },
        { status: 500 }
      );
    }

    // Update topic in Supabase
    const { data: updatedTopic, error: updateError } = await supabase
      .from('topic_proposal')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select(`
        *,
        scheduled_content:scheduled_content(id, title, status)
      `)
      .single();

    if (updateError) {
      console.error('Supabase update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update topic' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedTopic
    });

  } catch (error) {
    console.error('Topic update error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update topic',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete specific topic
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Feature flag check for Phase 4
    if (!isPremiumFeatureEnabled('FEATURE_TOPICS_RESEARCH')) {
      return NextResponse.json(
        { error: 'Topics research feature is not enabled' },
        { status: 403 }
      );
    }

    // Permission check
    const permissionCheck = await requirePermission(request, 'delete_content');
    if (permissionCheck instanceof NextResponse) {
      return permissionCheck;
    }

    // Check if topic exists and has no associated content
    const { data: topic, error: fetchError } = await supabase
      .from('topic_proposal')
      .select(`
        *,
        scheduled_content:scheduled_content(id)
      `)
      .eq('id', params.id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Topic not found' },
          { status: 404 }
        );
      }
      console.error('Supabase fetch error:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch topic' },
        { status: 500 }
      );
    }

    // Prevent deletion if topic has associated content
    if (topic.scheduled_content && topic.scheduled_content.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete topic with associated content',
          associated_content_count: topic.scheduled_content.length
        },
        { status: 409 }
      );
    }

    // Delete topic from Supabase
    const { error: deleteError } = await supabase
      .from('topic_proposal')
      .delete()
      .eq('id', params.id);

    if (deleteError) {
      console.error('Supabase delete error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete topic' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Topic deleted successfully'
    });

  } catch (error) {
    console.error('Topic deletion error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete topic',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}