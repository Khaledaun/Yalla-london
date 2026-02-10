export const dynamic = 'force-dynamic';
export const revalidate = 0;


import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from "@/lib/admin-middleware";


// Get all API settings
export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const settings = await prisma.apiSettings.findMany({
      select: {
        id: true,
        key_name: true,
        key_value: true,
        is_active: true,
        last_tested: true,
        test_status: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: { key_name: 'asc' }
    });

    // Transform to camelCase for frontend
    const transformedSettings = settings.map((setting: any) => ({
      id: setting.id,
      keyName: setting.key_name,
      keyValue: setting.key_value,
      isActive: setting.is_active,
      lastTested: setting.last_tested?.toISOString(),
      testStatus: setting.test_status,
      createdAt: setting.created_at.toISOString(),
      updatedAt: setting.updated_at.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      settings: transformedSettings
    });

  } catch (error) {
    console.error('Failed to fetch API settings:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch API settings',
        settings: [] // Return empty array as fallback
      },
      { status: 500 }
    );
  }
}

// Create or update API setting
export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { keyName, keyValue, isActive = true } = await request.json();

    if (!keyName || !keyValue) {
      return NextResponse.json(
        { error: 'keyName and keyValue are required' },
        { status: 400 }
      );
    }

    // Encrypt sensitive values (optional enhancement)
    const processedValue = keyValue.trim();

    // Upsert the setting
    const setting = await prisma.apiSettings.upsert({
      where: { key_name: keyName },
      update: {
        key_value: processedValue,
        is_active: isActive,
        test_status: 'not_tested', // Reset test status on update
      },
      create: {
        key_name: keyName,
        key_value: processedValue,
        is_active: isActive,
        test_status: 'not_tested',
      }
    });

    return NextResponse.json({
      success: true,
      message: 'API setting saved successfully',
      setting: {
        id: setting.id,
        keyName: setting.key_name,
        keyValue: setting.key_value,
        isActive: setting.is_active,
        testStatus: setting.test_status,
      }
    });

  } catch (error) {
    console.error('Failed to save API setting:', error);
    return NextResponse.json(
      { error: 'Failed to save API setting' },
      { status: 500 }
    );
  }
}

// Delete API setting
export async function DELETE(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const keyName = searchParams.get('keyName');

    if (!keyName) {
      return NextResponse.json(
        { error: 'keyName is required' },
        { status: 400 }
      );
    }

    await prisma.apiSettings.delete({
      where: { key_name: keyName }
    });

    return NextResponse.json({
      success: true,
      message: 'API setting deleted successfully'
    });

  } catch (error) {
    console.error('Failed to delete API setting:', error);
    return NextResponse.json(
      { error: 'Failed to delete API setting' },
      { status: 500 }
    );
  }
}
