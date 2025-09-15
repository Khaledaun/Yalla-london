import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin permissions
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { siteId, config } = await request.json();

    // Validate required fields
    if (!siteId || !config) {
      return NextResponse.json(
        { error: 'Site ID and config are required' },
        { status: 400 }
      );
    }

    // Find the site
    const site = await prisma.site.findUnique({
      where: { id: siteId }
    });

    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    // Validate homepage configuration
    const validationResult = validateHomepageConfig(config);
    if (!validationResult.valid) {
      return NextResponse.json(
        { error: 'Invalid configuration', details: validationResult.errors },
        { status: 400 }
      );
    }

    // Publish configuration (mark as published)
    const publishedConfig = {
      ...config,
      meta: {
        ...config.meta,
        draft: false,
        publishedAt: new Date(),
        lastModified: new Date()
      }
    };

    const updatedSite = await prisma.site.update({
      where: { id: siteId },
      data: {
        homepage_json: publishedConfig,
        updated_at: new Date()
      }
    });

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'homepage_publish',
        details: {
          siteId,
          modulesCount: config.modules?.length || 0,
          hasPopup: !!config.popup?.enabled,
          theme: config.theme
        },
        ipAddress: getClientIP(request),
        userAgent: request.headers.get('user-agent') || 'Unknown'
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Homepage published successfully',
      site: updatedSite
    });

  } catch (error) {
    console.error('Publish error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Configuration validation
function validateHomepageConfig(config: any): { valid: boolean; errors?: string[] } {
  const errors: string[] = [];

  // Check required structure
  if (!config.modules || !Array.isArray(config.modules)) {
    errors.push('Modules array is required');
  }

  if (!config.theme) {
    errors.push('Theme configuration is required');
  }

  if (!config.meta) {
    errors.push('Meta information is required');
  }

  // Validate modules
  if (config.modules) {
    config.modules.forEach((module: any, index: number) => {
      if (!module.id || !module.type || !module.title) {
        errors.push(`Module ${index + 1} is missing required fields (id, type, title)`);
      }
    });
  }

  // Validate theme
  if (config.theme) {
    if (!config.theme.primaryColor || !config.theme.secondaryColor) {
      errors.push('Theme must include primary and secondary colors');
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

// Get client IP address
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return 'Unknown';
}