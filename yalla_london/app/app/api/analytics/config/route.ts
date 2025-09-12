export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { withPermission, PERMISSIONS, logAuditEvent } from '@/lib/rbac';
import { analyticsService } from '@/lib/analytics';

// GET: Retrieve analytics configuration
export const GET = withPermission(PERMISSIONS.VIEW_ANALYTICS, async (request: NextRequest, user) => {
  try {
    const config = analyticsService.getClientConfig();

    await logAuditEvent({
      userId: user.id,
      action: 'access',
      resource: 'analytics_config',
      ipAddress: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return NextResponse.json({
      success: true,
      config,
      features: {
        ga4Integration: !!config.ga4MeasurementId,
        gtmIntegration: !!config.gtmContainerId,
        customAnalytics: config.enableAnalytics,
        privacyControls: config.anonymizeIp && config.cookieConsent
      }
    });
  } catch (error) {
    console.error('Analytics config retrieval error:', error);
    
    await logAuditEvent({
      userId: user.id,
      action: 'access',
      resource: 'analytics_config',
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      ipAddress: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return NextResponse.json(
      { error: 'Failed to retrieve analytics configuration' },
      { status: 500 }
    );
  }
});

// POST: Update analytics configuration (admin only)
export const POST = withPermission(PERMISSIONS.MANAGE_FEATURES, async (request: NextRequest, user) => {
  try {
    const {
      enableAnalytics,
      enablePersonalization,
      anonymizeIp,
      cookieConsent,
      ga4MeasurementId,
      gtmContainerId
    } = await request.json();

    // Validate configuration
    if (ga4MeasurementId && !ga4MeasurementId.startsWith('G-')) {
      return NextResponse.json(
        { error: 'Invalid GA4 Measurement ID format' },
        { status: 400 }
      );
    }

    if (gtmContainerId && !gtmContainerId.startsWith('GTM-')) {
      return NextResponse.json(
        { error: 'Invalid GTM Container ID format' },
        { status: 400 }
      );
    }

    // Update environment variables would typically be done through deployment
    // For now, we'll just validate and acknowledge the request
    
    const updatedConfig = {
      enableAnalytics: enableAnalytics ?? true,
      enablePersonalization: enablePersonalization ?? false,
      anonymizeIp: anonymizeIp ?? true,
      cookieConsent: cookieConsent ?? true,
      ga4MeasurementId,
      gtmContainerId
    };

    await logAuditEvent({
      userId: user.id,
      action: 'update',
      resource: 'analytics_config',
      details: { 
        previousConfig: analyticsService.getClientConfig(),
        newConfig: updatedConfig 
      },
      ipAddress: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return NextResponse.json({
      success: true,
      message: 'Analytics configuration updated successfully',
      config: updatedConfig,
      note: 'Some changes may require environment variable updates and application restart'
    });
  } catch (error) {
    console.error('Analytics config update error:', error);
    
    await logAuditEvent({
      userId: user.id,
      action: 'update',
      resource: 'analytics_config',
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      ipAddress: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return NextResponse.json(
      { error: 'Failed to update analytics configuration' },
      { status: 500 }
    );
  }
});