import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from "@/lib/admin-middleware";

interface ThemeConfig {
  primaryColor: string
  secondaryColor: string
  accentColor: string
  fontFamily: string
  layout: 'full-width' | 'contained' | 'split'
  borderRadius: 'none' | 'small' | 'medium' | 'large'
  spacing: 'compact' | 'normal' | 'spacious'
}

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    // Get theme settings from database
    const themeSettings = await prisma.apiSettings.findFirst({
      where: {
        key_name: 'theme_config',
        is_active: true
      }
    })

    if (themeSettings) {
      return NextResponse.json({
        success: true,
        theme: themeSettings.value
      })
    }

    // Return default theme if none found
    const defaultTheme: ThemeConfig = {
      primaryColor: '#3B82F6',
      secondaryColor: '#1E40AF',
      accentColor: '#F59E0B',
      fontFamily: 'Inter',
      layout: 'contained',
      borderRadius: 'medium',
      spacing: 'normal'
    }

    return NextResponse.json({
      success: true,
      theme: defaultTheme
    })
  } catch (error) {
    console.error('Error fetching theme settings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch theme settings' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const themeConfig: ThemeConfig = await request.json()

    // Validate theme config
    if (!themeConfig.primaryColor || !themeConfig.secondaryColor || !themeConfig.fontFamily) {
      return NextResponse.json(
        { success: false, error: 'Invalid theme configuration' },
        { status: 400 }
      )
    }

    // Save theme settings to database
    await prisma.apiSettings.upsert({
      where: {
        key_name: 'theme_config'
      },
      update: {
        value: themeConfig,
        is_active: true,
        updated_at: new Date()
      },
      create: {
        key_name: 'theme_config',
        value: themeConfig,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    })

    // Invalidate cache to apply theme changes
    try {
      await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/revalidate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paths: ['/', '/admin', '/admin/settings/theme']
        })
      })
    } catch (cacheError) {
      console.warn('Cache invalidation failed:', cacheError)
    }

    return NextResponse.json({
      success: true,
      message: 'Theme settings saved successfully'
    })
  } catch (error) {
    console.error('Error saving theme settings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save theme settings' },
      { status: 500 }
    )
  }
}
