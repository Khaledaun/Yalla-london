import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface ThemeSettings {
  siteName: string
  siteTagline: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
  backgroundColor: string
  textColor: string
  linkColor: string
  fontFamily: string
  fontSize: 'small' | 'medium' | 'large'
  logoUrl: string
  faviconUrl: string
  headerLayout: 'classic' | 'minimal' | 'centered'
  footerStyle: 'simple' | 'detailed' | 'social'
  darkModeEnabled: boolean
  customCSS: string
  brandColors: {
    primary: string
    secondary: string
    success: string
    warning: string
    error: string
  }
  typography: {
    headingFont: string
    bodyFont: string
    monoFont: string
  }
  layout: {
    containerWidth: 'narrow' | 'normal' | 'wide' | 'full'
    borderRadius: 'none' | 'small' | 'medium' | 'large'
    shadows: boolean
  }
}

// GET - Retrieve current theme settings
export async function GET(request: NextRequest) {
  try {
    // For now, we'll store theme settings in a simple key-value format
    // This could be enhanced to use a dedicated theme_settings table
    let themeSettings = null
    
    try {
      // Try to get theme settings from database using ApiSettings model
      const settingsRecord = await prisma.apiSettings.findFirst({
        where: { key_name: 'theme_settings' }
      })
      
      if (settingsRecord?.key_value) {
        themeSettings = JSON.parse(settingsRecord.key_value)
      }
    } catch (error) {
      console.log('Theme settings not found in database, using defaults')
    }

    return NextResponse.json({
      success: true,
      data: themeSettings || null,
      message: 'Theme settings retrieved successfully'
    })
  } catch (error) {
    console.error('Error retrieving theme settings:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to retrieve theme settings',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST - Save theme settings
export async function POST(request: NextRequest) {
  try {
    const themeSettings: ThemeSettings = await request.json()
    
    // Validate required fields
    if (!themeSettings.siteName || !themeSettings.primaryColor) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: siteName and primaryColor are required' 
        },
        { status: 400 }
      )
    }

    // Prepare the settings data
    const settingsData = {
      ...themeSettings,
      updatedAt: new Date().toISOString()
    }

    // Save to database using upsert
    await prisma.apiSettings.upsert({
      where: { key_name: 'theme_settings' },
      update: {
        key_value: JSON.stringify(settingsData),
        updated_at: new Date()
      },
      create: {
        key_name: 'theme_settings',
        key_value: JSON.stringify(settingsData),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      data: settingsData,
      message: 'Theme settings saved successfully'
    })
  } catch (error) {
    console.error('Error saving theme settings:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to save theme settings',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// PUT - Update specific theme setting
export async function PUT(request: NextRequest) {
  try {
    const { key, value } = await request.json()
    
    if (!key) {
      return NextResponse.json(
        { success: false, error: 'Setting key is required' },
        { status: 400 }
      )
    }

    // Get current theme settings
    const settingsRecord = await prisma.apiSettings.findFirst({
      where: { key_name: 'theme_settings' }
    })
    
    let currentSettings = {}
    if (settingsRecord?.key_value) {
      currentSettings = JSON.parse(settingsRecord.key_value)
    }

    // Update the specific setting
    const updatedSettings = {
      ...currentSettings,
      [key]: value,
      updatedAt: new Date().toISOString()
    }

    // Save back to database
    await prisma.apiSettings.upsert({
      where: { key_name: 'theme_settings' },
      update: {
        key_value: JSON.stringify(updatedSettings),
        updated_at: new Date()
      },
      create: {
        key_name: 'theme_settings',
        key_value: JSON.stringify(updatedSettings),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedSettings,
      message: `Theme setting '${key}' updated successfully`
    })
  } catch (error) {
    console.error('Error updating theme setting:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update theme setting',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// DELETE - Reset theme settings to default
export async function DELETE(request: NextRequest) {
  try {
    // Delete the theme settings record to reset to defaults
    await prisma.apiSettings.deleteMany({
      where: { key_name: 'theme_settings' }
    })

    return NextResponse.json({
      success: true,
      message: 'Theme settings reset to default'
    })
  } catch (error) {
    console.error('Error resetting theme settings:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to reset theme settings',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}