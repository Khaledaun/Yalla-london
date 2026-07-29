/**
 * GET/PUT /api/reviewer/profile
 * Get or update reviewer profile
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentReviewer } from '@/lib/reviewer/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const reviewer = await getCurrentReviewer();
    
    if (!reviewer) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get full profile with stats
    const fullProfile = await prisma.reviewer.findUnique({
      where: { id: reviewer.id },
      include: {
        _count: {
          select: {
            reviews: true,
            photos: true,
          },
        },
      },
    });
    
    if (!fullProfile) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      );
    }
    
    // Get review stats
    const reviewStats = await prisma.contentReview.groupBy({
      by: ['status'],
      where: { reviewer_id: reviewer.id },
      _count: true,
    });
    
    const stats = {
      totalReviews: fullProfile._count.reviews,
      totalPhotos: fullProfile._count.photos,
      approvedReviews: reviewStats.find(s => s.status === 'approved')?._count || 0,
      pendingReviews: reviewStats.find(s => s.status === 'assigned')?._count || 0,
      inProgressReviews: reviewStats.find(s => s.status === 'in_progress')?._count || 0,
    };
    
    return NextResponse.json({
      success: true,
      profile: {
        id: fullProfile.id,
        email: fullProfile.email,
        name: fullProfile.name,
        slug: fullProfile.slug,
        bio: fullProfile.bio,
        avatar_url: fullProfile.avatar_url,
        location: fullProfile.location,
        years_in_location: fullProfile.years_in_location,
        expertise_areas: fullProfile.expertise_areas,
        languages: fullProfile.languages,
        linkedin_url: fullProfile.linkedin_url,
        instagram_url: fullProfile.instagram_url,
        twitter_url: fullProfile.twitter_url,
        website_url: fullProfile.website_url,
        status: fullProfile.status,
        is_verified: fullProfile.is_verified,
        site_ids: fullProfile.site_ids,
        accepted_terms_at: fullProfile.accepted_terms_at,
        photo_ownership_agreed: fullProfile.photo_ownership_agreed,
        created_at: fullProfile.created_at,
        last_active_at: fullProfile.last_active_at,
      },
      stats,
    });
    
  } catch (error) {
    console.error('[profile GET] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const reviewer = await getCurrentReviewer();
    
    if (!reviewer) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const {
      name,
      bio,
      avatar_url,
      location,
      years_in_location,
      expertise_areas,
      languages,
      linkedin_url,
      instagram_url,
      twitter_url,
      website_url,
      accept_terms,
      photo_ownership_agreed,
    } = body;
    
    // Build update data - only include fields that were provided
    const updateData: Record<string, unknown> = {};
    
    if (name !== undefined) {
      if (typeof name !== 'string' || name.length < 2) {
        return NextResponse.json(
          { success: false, error: 'Name must be at least 2 characters' },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
      
      // Generate slug from name if not already set
      const existingReviewer = await prisma.reviewer.findUnique({
        where: { id: reviewer.id },
        select: { slug: true },
      });
      
      if (!existingReviewer?.slug) {
        const baseSlug = name
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
        
        // Check for slug conflicts
        let slug = baseSlug;
        let counter = 1;
        while (await prisma.reviewer.findUnique({ where: { slug } })) {
          slug = `${baseSlug}-${counter}`;
          counter++;
        }
        updateData.slug = slug;
      }
    }
    
    if (bio !== undefined) {
      updateData.bio = bio?.trim() || null;
    }
    
    if (avatar_url !== undefined) {
      updateData.avatar_url = avatar_url?.trim() || null;
    }
    
    if (location !== undefined) {
      updateData.location = location?.trim() || null;
    }
    
    if (years_in_location !== undefined) {
      if (years_in_location !== null && (typeof years_in_location !== 'number' || years_in_location < 0)) {
        return NextResponse.json(
          { success: false, error: 'Years in location must be a positive number' },
          { status: 400 }
        );
      }
      updateData.years_in_location = years_in_location;
    }
    
    if (expertise_areas !== undefined) {
      if (!Array.isArray(expertise_areas)) {
        return NextResponse.json(
          { success: false, error: 'Expertise areas must be an array' },
          { status: 400 }
        );
      }
      updateData.expertise_areas = expertise_areas.filter(
        (area): area is string => typeof area === 'string' && area.trim().length > 0
      );
    }
    
    if (languages !== undefined) {
      if (!Array.isArray(languages)) {
        return NextResponse.json(
          { success: false, error: 'Languages must be an array' },
          { status: 400 }
        );
      }
      updateData.languages = languages.filter(
        (lang): lang is string => typeof lang === 'string' && lang.trim().length > 0
      );
    }
    
    // Validate URLs
    const urlFields = [
      { key: 'linkedin_url', value: linkedin_url },
      { key: 'instagram_url', value: instagram_url },
      { key: 'twitter_url', value: twitter_url },
      { key: 'website_url', value: website_url },
    ];
    
    for (const { key, value } of urlFields) {
      if (value !== undefined) {
        if (value && typeof value === 'string' && value.trim()) {
          try {
            new URL(value);
            updateData[key] = value.trim();
          } catch {
            return NextResponse.json(
              { success: false, error: `Invalid URL for ${key.replace('_url', '')}` },
              { status: 400 }
            );
          }
        } else {
          updateData[key] = null;
        }
      }
    }
    
    // Handle terms acceptance
    if (accept_terms === true && !reviewer.status.includes('active')) {
      updateData.accepted_terms_at = new Date();
    }
    
    if (photo_ownership_agreed !== undefined) {
      updateData.photo_ownership_agreed = !!photo_ownership_agreed;
    }
    
    // Check if this completes onboarding
    const currentProfile = await prisma.reviewer.findUnique({
      where: { id: reviewer.id },
    });
    
    const willHaveName = updateData.name || currentProfile?.name;
    const willHaveTerms = updateData.accepted_terms_at || currentProfile?.accepted_terms_at;
    
    if (currentProfile?.status === 'pending_onboard' && willHaveName && willHaveTerms) {
      updateData.status = 'active';
    }
    
    // Update profile
    const updated = await prisma.reviewer.update({
      where: { id: reviewer.id },
      data: updateData,
    });
    
    return NextResponse.json({
      success: true,
      profile: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        slug: updated.slug,
        bio: updated.bio,
        avatar_url: updated.avatar_url,
        location: updated.location,
        years_in_location: updated.years_in_location,
        expertise_areas: updated.expertise_areas,
        languages: updated.languages,
        linkedin_url: updated.linkedin_url,
        instagram_url: updated.instagram_url,
        twitter_url: updated.twitter_url,
        website_url: updated.website_url,
        status: updated.status,
        is_verified: updated.is_verified,
      },
    });
    
  } catch (error) {
    console.error('[profile PUT] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
