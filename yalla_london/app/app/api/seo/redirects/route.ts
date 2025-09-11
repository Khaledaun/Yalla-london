export const dynamic = 'force-dynamic';
export const revalidate = 0;



import { NextRequest, NextResponse } from 'next/server';
import { isFeatureEnabled } from '@/lib/feature-flags';

interface Redirect {
  id: string;
  fromPath: string;
  toPath: string;
  statusCode: 301 | 302 | 307 | 308;
  reason: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  hitCount: number;
  lastHit?: string;
  expiresAt?: string;
}

interface RedirectRule {
  pattern: string;
  replacement: string;
  statusCode: 301 | 302;
  description: string;
}

export async function GET(request: NextRequest) {
  if (!isFeatureEnabled('SEO')) {
    return NextResponse.json(
      { error: 'SEO features disabled' }, 
      { status: 403 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action') || 'list';
  const fromPath = searchParams.get('fromPath');

  try {
    switch (action) {
      case 'list':
        return await getRedirects();
      case 'check':
        if (!fromPath) {
          return NextResponse.json(
            { error: 'fromPath parameter required' },
            { status: 400 }
          );
        }
        return await checkRedirect(fromPath);
      case 'stats':
        return await getRedirectStats();
      case 'validate':
        return await validateRedirects();
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Redirects API error:', error);
    return NextResponse.json(
      { error: 'Request failed' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!isFeatureEnabled('SEO')) {
    return NextResponse.json(
      { error: 'SEO features disabled' }, 
      { status: 403 }
    );
  }

  try {
    const { action, data } = await request.json();

    switch (action) {
      case 'create':
        return await createRedirect(data);
      case 'bulk-create':
        return await createBulkRedirects(data.redirects);
      case 'auto-generate':
        return await generateAutoRedirects(data);
      case 'import-csv':
        return await importRedirectsCsv(data.csvContent);
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Redirects POST error:', error);
    return NextResponse.json(
      { error: 'Action failed' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  if (!isFeatureEnabled('SEO')) {
    return NextResponse.json(
      { error: 'SEO features disabled' }, 
      { status: 403 }
    );
  }

  try {
    const { id, data } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Redirect ID required' },
        { status: 400 }
      );
    }

    return await updateRedirect(id, data);
  } catch (error) {
    console.error('Redirects PUT error:', error);
    return NextResponse.json(
      { error: 'Update failed' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (!isFeatureEnabled('SEO')) {
    return NextResponse.json(
      { error: 'SEO features disabled' }, 
      { status: 403 }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Redirect ID required' },
        { status: 400 }
      );
    }

    return await deleteRedirect(id);
  } catch (error) {
    console.error('Redirects DELETE error:', error);
    return NextResponse.json(
      { error: 'Delete failed' },
      { status: 500 }
    );
  }
}

async function getRedirects(): Promise<NextResponse> {
  // In production, fetch from database
  const mockRedirects: Redirect[] = [
    {
      id: '1',
      fromPath: '/old-blog-post',
      toPath: '/blog/luxury-london-guide',
      statusCode: 301,
      reason: 'URL structure change - blog reorganization',
      createdAt: '2024-08-01T10:00:00Z',
      updatedAt: '2024-08-01T10:00:00Z',
      isActive: true,
      hitCount: 145,
      lastHit: '2024-09-05T15:30:00Z'
    },
    {
      id: '2',
      fromPath: '/events/old-event',
      toPath: '/events/london-art-week-2024',
      statusCode: 301,
      reason: 'Event URL updated with year',
      createdAt: '2024-08-15T14:30:00Z',
      updatedAt: '2024-08-15T14:30:00Z',
      isActive: true,
      hitCount: 67,
      lastHit: '2024-09-04T12:15:00Z'
    },
    {
      id: '3',
      fromPath: '/temp-page',
      toPath: '/recommendations',
      statusCode: 302,
      reason: 'Temporary redirect during maintenance',
      createdAt: '2024-09-01T09:00:00Z',
      updatedAt: '2024-09-01T09:00:00Z',
      isActive: true,
      hitCount: 23,
      lastHit: '2024-09-05T08:45:00Z',
      expiresAt: '2024-09-15T00:00:00Z'
    }
  ];

  return NextResponse.json({
    success: true,
    data: {
      redirects: mockRedirects,
      total: mockRedirects.length,
      active: mockRedirects.filter(r => r.isActive).length,
      permanent: mockRedirects.filter(r => r.statusCode === 301).length,
      temporary: mockRedirects.filter(r => r.statusCode !== 301).length
    },
    timestamp: new Date().toISOString()
  });
}

async function checkRedirect(fromPath: string): Promise<NextResponse> {
  // In production, check database for matching redirect
  const mockRedirect: Redirect | null = fromPath === '/old-blog-post' ? {
    id: '1',
    fromPath: '/old-blog-post',
    toPath: '/blog/luxury-london-guide',
    statusCode: 301,
    reason: 'URL structure change - blog reorganization',
    createdAt: '2024-08-01T10:00:00Z',
    updatedAt: '2024-08-01T10:00:00Z',
    isActive: true,
    hitCount: 145,
    lastHit: '2024-09-05T15:30:00Z'
  } : null;

  return NextResponse.json({
    success: true,
    data: {
      fromPath,
      hasRedirect: !!mockRedirect,
      redirect: mockRedirect,
      recommendations: mockRedirect ? [] : [
        'No redirect found for this path',
        'Consider creating a 301 redirect if this was a valid URL',
        'Check for similar paths that might need redirects'
      ]
    },
    timestamp: new Date().toISOString()
  });
}

async function getRedirectStats(): Promise<NextResponse> {
  const stats = {
    totalRedirects: 15,
    activeRedirects: 12,
    totalHits: 1847,
    hitsLastWeek: 234,
    hitsLastMonth: 892,
    topRedirects: [
      { fromPath: '/old-blog-post', toPath: '/blog/luxury-london-guide', hits: 145 },
      { fromPath: '/old-events', toPath: '/events', hits: 128 },
      { fromPath: '/dining-old', toPath: '/recommendations', hits: 97 }
    ],
    redirectsByStatusCode: {
      301: 11,
      302: 4,
      307: 0,
      308: 0
    },
    recentActivity: [
      { date: '2024-09-05', hits: 45 },
      { date: '2024-09-04', hits: 38 },
      { date: '2024-09-03', hits: 52 },
      { date: '2024-09-02', hits: 41 },
      { date: '2024-09-01', hits: 58 }
    ],
    errors: [
      { fromPath: '/broken-redirect', issue: 'Target path returns 404', severity: 'high' },
      { fromPath: '/circular-redirect', issue: 'Potential redirect loop', severity: 'medium' }
    ]
  };

  return NextResponse.json({
    success: true,
    data: stats,
    timestamp: new Date().toISOString()
  });
}

async function validateRedirects(): Promise<NextResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://yalla-london.com';
  
  // In production, test each redirect to ensure target URLs are valid
  const validationResults = [
    {
      id: '1',
      fromPath: '/old-blog-post',
      toPath: '/blog/luxury-london-guide',
      valid: true,
      targetStatus: 200,
      redirectChain: 0,
      issues: []
    },
    {
      id: '2',
      fromPath: '/broken-redirect',
      toPath: '/non-existent-page',
      valid: false,
      targetStatus: 404,
      redirectChain: 0,
      issues: ['Target URL returns 404 Not Found']
    },
    {
      id: '3',
      fromPath: '/circular-redirect',
      toPath: '/another-redirect',
      valid: false,
      targetStatus: 200,
      redirectChain: 3,
      issues: ['Redirect chain too long (3 hops)', 'Potential performance impact']
    }
  ];

  const summary = {
    total: validationResults.length,
    valid: validationResults.filter(r => r.valid).length,
    invalid: validationResults.filter(r => !r.valid).length,
    warnings: validationResults.filter(r => r.redirectChain > 1).length
  };

  return NextResponse.json({
    success: true,
    data: {
      summary,
      results: validationResults,
      recommendations: [
        'Fix broken target URLs',
        'Minimize redirect chains',
        'Remove or update circular redirects',
        'Regular validation prevents SEO issues'
      ]
    },
    timestamp: new Date().toISOString()
  });
}

async function createRedirect(redirectData: Partial<Redirect>): Promise<NextResponse> {
  // Validate input
  if (!redirectData.fromPath || !redirectData.toPath) {
    return NextResponse.json(
      { success: false, error: 'fromPath and toPath are required' },
      { status: 400 }
    );
  }

  // Check for conflicts
  const existingRedirect = await checkExistingRedirect(redirectData.fromPath);
  if (existingRedirect) {
    return NextResponse.json(
      { success: false, error: 'Redirect already exists for this path' },
      { status: 409 }
    );
  }

  // Create redirect (in production, save to database)
  const newRedirect: Redirect = {
    id: Date.now().toString(),
    fromPath: redirectData.fromPath,
    toPath: redirectData.toPath,
    statusCode: redirectData.statusCode || 301,
    reason: redirectData.reason || 'Manual redirect creation',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isActive: true,
    hitCount: 0
  };

  console.log('Created redirect:', newRedirect);

  return NextResponse.json({
    success: true,
    data: newRedirect,
    message: 'Redirect created successfully'
  });
}

async function createBulkRedirects(redirects: Partial<Redirect>[]): Promise<NextResponse> {
  const results = {
    created: 0,
    skipped: 0,
    errors: [] as string[]
  };

  for (const redirectData of redirects) {
    try {
      if (!redirectData.fromPath || !redirectData.toPath) {
        results.errors.push(`Invalid data for redirect: ${JSON.stringify(redirectData)}`);
        results.skipped++;
        continue;
      }

      const existingRedirect = await checkExistingRedirect(redirectData.fromPath);
      if (existingRedirect) {
        results.skipped++;
        continue;
      }

      // Create redirect (in production, batch insert to database)
      console.log('Creating bulk redirect:', redirectData);
      results.created++;
    } catch (error) {
      results.errors.push(`Failed to create redirect for ${redirectData.fromPath}: ${error}`);
      results.skipped++;
    }
  }

  return NextResponse.json({
    success: true,
    data: results,
    message: `Bulk redirect creation completed: ${results.created} created, ${results.skipped} skipped`
  });
}

async function generateAutoRedirects(data: { oldUrl: string; newUrl: string; reason?: string }): Promise<NextResponse> {
  const { oldUrl, newUrl, reason } = data;

  // Auto-generate redirects for common URL structure changes
  const autoRedirects = [];

  // Extract path components
  const oldPath = new URL(oldUrl).pathname;
  const newPath = new URL(newUrl).pathname;

  // Basic redirect
  autoRedirects.push({
    fromPath: oldPath,
    toPath: newPath,
    statusCode: 301,
    reason: reason || 'Auto-generated redirect for URL change'
  });

  // Generate variations (with/without trailing slash)
  if (!oldPath.endsWith('/')) {
    autoRedirects.push({
      fromPath: oldPath + '/',
      toPath: newPath,
      statusCode: 301,
      reason: 'Auto-generated redirect for trailing slash variation'
    });
  }

  if (oldPath.endsWith('/') && oldPath !== '/') {
    autoRedirects.push({
      fromPath: oldPath.slice(0, -1),
      toPath: newPath,
      statusCode: 301,
      reason: 'Auto-generated redirect for non-trailing slash variation'
    });
  }

  // Generate case variations if URL contains uppercase
  if (oldPath !== oldPath.toLowerCase()) {
    autoRedirects.push({
      fromPath: oldPath.toLowerCase(),
      toPath: newPath,
      statusCode: 301,
      reason: 'Auto-generated redirect for lowercase variation'
    });
  }

  return NextResponse.json({
    success: true,
    data: {
      generated: autoRedirects,
      count: autoRedirects.length,
      message: `Generated ${autoRedirects.length} automatic redirects`
    }
  });
}

async function importRedirectsCsv(csvContent: string): Promise<NextResponse> {
  // Parse CSV content
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',');
  
  if (!headers.includes('fromPath') || !headers.includes('toPath')) {
    return NextResponse.json(
      { success: false, error: 'CSV must contain fromPath and toPath columns' },
      { status: 400 }
    );
  }

  const redirects = [];
  const errors = [];

  for (let i = 1; i < lines.length; i++) {
    try {
      const values = lines[i].split(',');
      const redirect: { [key: string]: string } = {};
      
      headers.forEach((header, index) => {
        redirect[header.trim()] = values[index]?.trim() || '';
      });

      if (redirect['fromPath'] && redirect['toPath']) {
        redirects.push({
          fromPath: redirect['fromPath'],
          toPath: redirect['toPath'],
          statusCode: parseInt(redirect['statusCode']) || 301,
          reason: redirect['reason'] || 'Imported from CSV'
        });
      } else {
        errors.push(`Line ${i + 1}: Missing required fields`);
      }
    } catch (error) {
      errors.push(`Line ${i + 1}: Parse error - ${error}`);
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      parsed: redirects.length,
      errors: errors.length,
      redirects,
      errorMessages: errors
    },
    message: `Parsed ${redirects.length} redirects from CSV`
  });
}

async function updateRedirect(id: string, updateData: Partial<Redirect>): Promise<NextResponse> {
  // In production, update database record
  console.log('Updating redirect:', id, updateData);

  return NextResponse.json({
    success: true,
    data: {
      id,
      updated: updateData,
      timestamp: new Date().toISOString()
    },
    message: 'Redirect updated successfully'
  });
}

async function deleteRedirect(id: string): Promise<NextResponse> {
  // In production, delete from database
  console.log('Deleting redirect:', id);

  return NextResponse.json({
    success: true,
    data: { id },
    message: 'Redirect deleted successfully'
  });
}

async function checkExistingRedirect(fromPath: string): Promise<Redirect | null> {
  // In production, check database
  // For now, return null (no existing redirect)
  return null;
}
