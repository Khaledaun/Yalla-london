/**
 * Admin Media Bulk Enrichment API
 * Handles bulk enrichment of media files with AI-powered metadata
 */

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-middleware';
import { getSupabaseClient } from '@/lib/supabase';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { z } from 'zod';

// Validation schema for bulk enrichment request
const BulkEnrichSchema = z.object({
  mediaIds: z.array(z.string()).min(1, 'At least one media ID is required').max(50, 'Maximum 50 media files can be processed at once'),
  options: z.object({
    generateAltText: z.boolean().default(true),
    generateDescription: z.boolean().default(true),
    extractTags: z.boolean().default(true),
    generateCaption: z.boolean().default(false),
    detectObjects: z.boolean().default(false)
  }).default({})
});

/**
 * POST /api/admin/media/bulk-enrich
 * Bulk enrich media files with AI-powered metadata
 */
export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    // Check if bulk enrichment feature is enabled
    if (!isFeatureEnabled('FEATURE_BULK_ENRICH')) {
      return NextResponse.json(
        { 
          error: 'Bulk enrichment feature is not enabled',
          code: 'FEATURE_DISABLED'
        },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = BulkEnrichSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validation.error.issues
        },
        { status: 400 }
      );
    }

    const { mediaIds, options } = validation.data;
    const supabase = getSupabaseClient();

    // Fetch media files from database
    const { data: mediaFiles, error: fetchError } = await supabase
      .from('Media')
      .select('id, filename, url, mime_type, alt_text, description, tags')
      .in('id', mediaIds);

    if (fetchError) {
      console.error('Failed to fetch media files:', fetchError);
      return NextResponse.json(
        { 
          error: 'Failed to fetch media files for enrichment',
          details: fetchError.message
        },
        { status: 500 }
      );
    }

    if (!mediaFiles || mediaFiles.length === 0) {
      return NextResponse.json(
        { 
          error: 'No media files found for the provided IDs',
          code: 'MEDIA_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // Filter for image files only (for AI enrichment)
    const imageFiles = mediaFiles.filter(file => 
      file.mime_type && file.mime_type.startsWith('image/')
    );

    const enrichmentResults = [];
    const errors = [];

    // Process each image file
    for (const file of imageFiles) {
      try {
        const enrichmentData: any = {
          id: file.id,
          original: {
            alt_text: file.alt_text,
            description: file.description,
            tags: file.tags || []
          },
          enriched: {}
        };

        // Simulate AI enrichment (replace with actual AI service calls)
        if (options.generateAltText && !file.alt_text) {
          enrichmentData.enriched.alt_text = await generateAltText(file.url, file.filename);
        }

        if (options.generateDescription && !file.description) {
          enrichmentData.enriched.description = await generateDescription(file.url, file.filename);
        }

        if (options.extractTags) {
          const newTags = await extractTags(file.url, file.filename);
          enrichmentData.enriched.tags = [...(file.tags || []), ...newTags];
        }

        // Update media file in database if we have enriched data
        if (Object.keys(enrichmentData.enriched).length > 0) {
          const updateData: any = {};
          
          if (enrichmentData.enriched.alt_text) {
            updateData.alt_text = enrichmentData.enriched.alt_text;
          }
          
          if (enrichmentData.enriched.description) {
            updateData.description = enrichmentData.enriched.description;
          }
          
          if (enrichmentData.enriched.tags) {
            updateData.tags = enrichmentData.enriched.tags;
          }

          updateData.updated_at = new Date().toISOString();

          const { error: updateError } = await supabase
            .from('Media')
            .update(updateData)
            .eq('id', file.id);

          if (updateError) {
            console.error(`Failed to update media file ${file.id}:`, updateError);
            errors.push({
              mediaId: file.id,
              filename: file.filename,
              error: updateError.message
            });
          } else {
            enrichmentResults.push(enrichmentData);
          }
        } else {
          // No enrichment needed
          enrichmentResults.push({
            id: file.id,
            message: 'No enrichment needed - file already has complete metadata'
          });
        }

      } catch (error) {
        console.error(`Error enriching media file ${file.id}:`, error);
        errors.push({
          mediaId: file.id,
          filename: file.filename,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Include non-image files in the response
    const nonImageFiles = mediaFiles.filter(file => 
      !file.mime_type || !file.mime_type.startsWith('image/')
    );

    nonImageFiles.forEach(file => {
      enrichmentResults.push({
        id: file.id,
        message: 'Skipped - only image files can be enriched'
      });
    });

    const response = {
      success: true,
      message: `Bulk enrichment completed for ${mediaIds.length} media files`,
      summary: {
        total_requested: mediaIds.length,
        images_processed: imageFiles.length,
        successful_enrichments: enrichmentResults.filter(r => r.enriched).length,
        skipped: nonImageFiles.length + enrichmentResults.filter(r => r.message).length,
        errors: errors.length
      },
      results: enrichmentResults,
      errors: errors.length > 0 ? errors : undefined
    };

    return NextResponse.json(response, { 
      status: errors.length > 0 ? 207 : 200 // 207 Multi-Status if some failed
    });

  } catch (error) {
    console.error('Bulk enrichment failed:', error);
    return NextResponse.json(
      { 
        error: 'Bulk enrichment process failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});

/**
 * Mock AI functions for generating metadata
 * In production, these would call actual AI services like OpenAI Vision, Google Vision API, etc.
 */
async function generateAltText(imageUrl: string, filename: string): Promise<string> {
  // Mock implementation - replace with actual AI service
  const baseAlt = filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
  return `Image showing ${baseAlt}`;
}

async function generateDescription(imageUrl: string, filename: string): Promise<string> {
  // Mock implementation - replace with actual AI service
  const baseDesc = filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
  return `A detailed image featuring ${baseDesc} with rich visual elements.`;
}

async function extractTags(imageUrl: string, filename: string): Promise<string[]> {
  // Mock implementation - replace with actual AI service
  const baseTags = filename.toLowerCase().split(/[-_]/);
  return baseTags.slice(0, 3).map(tag => tag.trim()).filter(tag => tag.length > 2);
}

/**
 * GET /api/admin/media/bulk-enrich
 * Get enrichment status or available enrichment options
 */
export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    // Check if bulk enrichment feature is enabled
    if (!isFeatureEnabled('FEATURE_BULK_ENRICH')) {
      return NextResponse.json(
        { 
          error: 'Bulk enrichment feature is not enabled',
          code: 'FEATURE_DISABLED'
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const mediaId = searchParams.get('mediaId');

    if (mediaId) {
      // Get enrichment status for specific media file
      const supabase = getSupabaseClient();
      
      const { data: mediaFile, error } = await supabase
        .from('Media')
        .select('id, filename, alt_text, description, tags, mime_type')
        .eq('id', mediaId)
        .single();

      if (error) {
        return NextResponse.json(
          { error: 'Media file not found' },
          { status: 404 }
        );
      }

      const enrichmentStatus = {
        id: mediaFile.id,
        filename: mediaFile.filename,
        isImage: mediaFile.mime_type?.startsWith('image/') || false,
        completeness: {
          hasAltText: !!mediaFile.alt_text,
          hasDescription: !!mediaFile.description,
          hasTags: Array.isArray(mediaFile.tags) && mediaFile.tags.length > 0
        }
      };

      return NextResponse.json({
        success: true,
        data: enrichmentStatus
      });
    }

    // Return available enrichment options
    return NextResponse.json({
      success: true,
      data: {
        available_options: [
          {
            key: 'generateAltText',
            name: 'Generate Alt Text',
            description: 'AI-generated alternative text for accessibility'
          },
          {
            key: 'generateDescription',
            name: 'Generate Description', 
            description: 'AI-generated detailed description of the image content'
          },
          {
            key: 'extractTags',
            name: 'Extract Tags',
            description: 'AI-extracted relevant tags and keywords'
          },
          {
            key: 'generateCaption',
            name: 'Generate Caption',
            description: 'AI-generated social media style caption'
          },
          {
            key: 'detectObjects',
            name: 'Detect Objects',
            description: 'AI-powered object detection and labeling'
          }
        ],
        limits: {
          max_files_per_request: 50,
          supported_formats: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
        }
      }
    });

  } catch (error) {
    console.error('Failed to get enrichment options:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get enrichment options',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});