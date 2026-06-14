/**
 * Social Media Accounts API
 *
 * Manage connected social media accounts.
 */
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { encrypt, decrypt } from '@/lib/encryption';
import { requireAdmin } from "@/lib/admin-middleware";

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    // Get all model providers that are social platforms
    const socialProviders = await prisma.modelProvider.findMany({
      where: {
        provider_type: 'social',
      },
    });

    // Also check credentials table
    const socialCredentials = await prisma.credential.findMany({
      where: {
        type: 'oauth_token',
        name: {
          contains: 'social',
        },
      },
    });

    // Map to response format
    const accounts = [
      ...socialProviders.map((provider) => ({
        id: provider.id,
        platform: provider.name,
        name: provider.display_name,
        handle: (provider.model_config_json as any)?.handle || 'unknown',
        followers: (provider.model_config_json as any)?.followers || 0,
        connected: provider.is_active && !!provider.api_key_encrypted,
        site: (provider.model_config_json as any)?.site || 'All Sites',
      })),
    ];

    // Add default platforms if none connected
    const connectedPlatforms = accounts.map((a) => a.platform);
    const defaultPlatforms = [
      { id: 'twitter', platform: 'twitter', name: 'X (Twitter)' },
      { id: 'instagram', platform: 'instagram', name: 'Instagram' },
      { id: 'facebook', platform: 'facebook', name: 'Facebook' },
      { id: 'linkedin', platform: 'linkedin', name: 'LinkedIn' },
      { id: 'tiktok', platform: 'tiktok', name: 'TikTok' },
    ];

    for (const platform of defaultPlatforms) {
      if (!connectedPlatforms.includes(platform.platform)) {
        accounts.push({
          id: platform.id,
          platform: platform.platform,
          name: platform.name,
          handle: '',
          followers: 0,
          connected: false,
          site: '',
        });
      }
    }

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error('Failed to get social accounts:', error);
    return NextResponse.json(
      { error: 'Failed to get accounts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { platform, accessToken, handle, site } = await request.json();

    // Store the access token securely
    const encryptedToken = encrypt(accessToken);

    await prisma.modelProvider.upsert({
      where: { id: `social-${platform}` },
      create: {
        id: `social-${platform}`,
        name: platform,
        display_name: getPlatformDisplayName(platform),
        provider_type: 'social',
        api_key_encrypted: encryptedToken,
        is_active: true,
        model_config_json: {
          handle,
          site,
          followers: 0,
          connected_at: new Date().toISOString(),
        },
      },
      update: {
        api_key_encrypted: encryptedToken,
        is_active: true,
        model_config_json: {
          handle,
          site,
          connected_at: new Date().toISOString(),
        },
        updated_at: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: `${getPlatformDisplayName(platform)} account connected`,
    });
  } catch (error) {
    console.error('Failed to connect social account:', error);
    return NextResponse.json(
      { error: 'Failed to connect account' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform');

    if (!platform) {
      return NextResponse.json(
        { error: 'Platform is required' },
        { status: 400 }
      );
    }

    await prisma.modelProvider.update({
      where: { id: `social-${platform}` },
      data: {
        is_active: false,
        api_key_encrypted: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to disconnect social account:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect account' },
      { status: 500 }
    );
  }
}

function getPlatformDisplayName(platform: string): string {
  const names: Record<string, string> = {
    twitter: 'X (Twitter)',
    instagram: 'Instagram',
    facebook: 'Facebook',
    linkedin: 'LinkedIn',
    tiktok: 'TikTok',
  };
  return names[platform] || platform;
}
