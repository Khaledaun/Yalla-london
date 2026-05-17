export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-middleware';
import { prisma } from '@/lib/db';

interface ABTestVariant {
  variant_id: string;
  variant_name: string;
  description: string;
  configuration: {
    layout_type: 'hero_banner' | 'grid_layout' | 'carousel' | 'minimal' | 'magazine';
    components: ComponentConfig[];
    styles: {
      theme: string;
      colors: Record<string, string>;
      fonts: Record<string, string>;
      spacing: Record<string, number>;
    };
  };
  traffic_allocation: number; // percentage
  status: 'draft' | 'active' | 'paused' | 'completed';
  performance_metrics: PerformanceMetrics;
}

interface ComponentConfig {
  component_id: string;
  component_type: 'hero' | 'featured_content' | 'search_bar' | 'categories' | 'testimonials' | 'cta';
  position: number;
  configuration: any;
  visible: boolean;
}

interface PerformanceMetrics {
  impressions: number;
  unique_visitors: number;
  conversions: number;
  conversion_rate: number;
  bounce_rate: number;
  avg_time_on_page: number;
  click_through_rate: number;
  revenue?: number;
}

interface ABTest {
  test_id: string;
  test_name: string;
  description: string;
  status: 'draft' | 'running' | 'paused' | 'completed' | 'analyzing';
  start_date: string;
  end_date?: string;
  target_metric: 'conversion_rate' | 'bounce_rate' | 'time_on_page' | 'click_through_rate' | 'revenue';
  min_sample_size: number;
  confidence_level: number;
  variants: ABTestVariant[];
  results?: ABTestResults;
  created_by: string;
}

interface ABTestResults {
  winner?: string;
  confidence: number;
  statistical_significance: boolean;
  uplift_percentage: number;
  recommendation: string;
  detailed_analysis: {
    variant_performance: Record<string, PerformanceMetrics>;
    conversion_funnel: any;
    user_segmentation: any;
  };
}

let abTests: Map<string, ABTest> = new Map();
let userVariantAssignments: Map<string, { test_id: string; variant_id: string }> = new Map();

// Default homepage variants for A/B testing
const DEFAULT_HOMEPAGE_VARIANTS: ABTestVariant[] = [
  {
    variant_id: 'control',
    variant_name: 'Control (Current)',
    description: 'Current homepage design with hero banner and grid layout',
    configuration: {
      layout_type: 'hero_banner',
      components: [
        {
          component_id: 'hero_section',
          component_type: 'hero',
          position: 1,
          configuration: {
            title: 'Discover Luxury Experiences in Dubai',
            subtitle: 'Curated experiences for the discerning traveler',
            background_image: '/images/dubai-skyline.jpg',
            cta_text: 'Explore Now'
          },
          visible: true
        },
        {
          component_id: 'featured_grid',
          component_type: 'featured_content',
          position: 2,
          configuration: {
            layout: 'grid',
            items_per_row: 3,
            show_categories: true
          },
          visible: true
        },
        {
          component_id: 'search_widget',
          component_type: 'search_bar',
          position: 3,
          configuration: {
            placeholder: 'Search experiences...',
            show_filters: true
          },
          visible: true
        }
      ],
      styles: {
        theme: 'luxury',
        colors: {
          primary: '#DAA520',
          secondary: '#2C3E50',
          accent: '#E74C3C'
        },
        fonts: {
          heading: 'Anybody',
          body: 'Source Sans Pro'
        },
        spacing: {
          section_padding: 64,
          component_margin: 32
        }
      }
    },
    traffic_allocation: 50,
    status: 'active',
    performance_metrics: {
      impressions: 5000,
      unique_visitors: 2500,
      conversions: 125,
      conversion_rate: 5.0,
      bounce_rate: 45.2,
      avg_time_on_page: 180,
      click_through_rate: 8.5
    }
  },
  {
    variant_id: 'minimal_v1',
    variant_name: 'Minimal Design',
    description: 'Clean, minimal design with focus on search and categories',
    configuration: {
      layout_type: 'minimal',
      components: [
        {
          component_id: 'minimal_hero',
          component_type: 'hero',
          position: 1,
          configuration: {
            title: 'Dubai. Curated.',
            subtitle: 'Premium experiences, simplified',
            background_type: 'gradient',
            cta_text: 'Start Exploring'
          },
          visible: true
        },
        {
          component_id: 'prominent_search',
          component_type: 'search_bar',
          position: 2,
          configuration: {
            placeholder: 'What would you like to experience?',
            size: 'large',
            show_filters: false
          },
          visible: true
        },
        {
          component_id: 'category_cards',
          component_type: 'categories',
          position: 3,
          configuration: {
            layout: 'horizontal_cards',
            show_icons: true,
            max_categories: 6
          },
          visible: true
        }
      ],
      styles: {
        theme: 'minimal',
        colors: {
          primary: '#2C3E50',
          secondary: '#95A5A6',
          accent: '#3498DB'
        },
        fonts: {
          heading: 'Inter',
          body: 'Inter'
        },
        spacing: {
          section_padding: 48,
          component_margin: 24
        }
      }
    },
    traffic_allocation: 50,
    status: 'active',
    performance_metrics: {
      impressions: 4800,
      unique_visitors: 2400,
      conversions: 144,
      conversion_rate: 6.0,
      bounce_rate: 38.7,
      avg_time_on_page: 195,
      click_through_rate: 12.3
    }
  }
];

function assignUserToVariant(userId: string, testId: string): string {
  // Check if user already has assignment
  const existingAssignment = userVariantAssignments.get(userId);
  if (existingAssignment && existingAssignment.test_id === testId) {
    return existingAssignment.variant_id;
  }
  
  const test = abTests.get(testId);
  if (!test || test.status !== 'running') {
    return 'control';
  }
  
  // Simple hash-based assignment for consistent user experience
  const hash = hashString(userId + testId);
  const totalTraffic = test.variants.reduce((sum, v) => sum + v.traffic_allocation, 0);
  const normalizedHash = hash * totalTraffic / 100;
  
  let currentThreshold = 0;
  for (const variant of test.variants) {
    currentThreshold += variant.traffic_allocation;
    if (normalizedHash <= currentThreshold) {
      userVariantAssignments.set(userId, { test_id: testId, variant_id: variant.variant_id });
      return variant.variant_id;
    }
  }
  
  return 'control';
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash) / Math.pow(2, 31);
}

function calculateStatisticalSignificance(variantA: PerformanceMetrics, variantB: PerformanceMetrics): {
  significant: boolean;
  confidence: number;
  uplift: number;
} {
  // Simplified statistical calculation (in production, use proper statistical libraries)
  const conversionA = variantA.conversion_rate / 100;
  const conversionB = variantB.conversion_rate / 100;
  
  const sampleA = variantA.unique_visitors;
  const sampleB = variantB.unique_visitors;
  
  const uplift = ((conversionB - conversionA) / conversionA) * 100;
  
  // Mock confidence calculation (simplified)
  const minSampleSize = 1000;
  const hasMinSample = sampleA >= minSampleSize && sampleB >= minSampleSize;
  const effectSize = Math.abs(uplift);
  
  const confidence = hasMinSample && effectSize > 5 ? 95 : hasMinSample && effectSize > 2 ? 85 : 60;
  
  return {
    significant: confidence >= 95,
    confidence,
    uplift
  };
}

function analyzeTestResults(test: ABTest): ABTestResults {
  if (test.variants.length < 2) {
    return {
      confidence: 0,
      statistical_significance: false,
      uplift_percentage: 0,
      recommendation: 'Need at least 2 variants to analyze results',
      detailed_analysis: {
        variant_performance: {},
        conversion_funnel: {},
        user_segmentation: {}
      }
    };
  }
  
  const [control, variant] = test.variants;
  const analysis = calculateStatisticalSignificance(control.performance_metrics, variant.performance_metrics);
  
  const winner = analysis.uplift > 0 ? variant.variant_id : control.variant_id;
  const winnerVariant = test.variants.find(v => v.variant_id === winner);
  
  return {
    winner,
    confidence: analysis.confidence,
    statistical_significance: analysis.significant,
    uplift_percentage: Math.abs(analysis.uplift),
    recommendation: analysis.significant 
      ? `Implement ${winnerVariant?.variant_name} as the new default homepage`
      : 'Continue test - insufficient data for conclusive results',
    detailed_analysis: {
      variant_performance: test.variants.reduce((acc, v) => {
        acc[v.variant_id] = v.performance_metrics;
        return acc;
      }, {} as Record<string, PerformanceMetrics>),
      conversion_funnel: {
        impressions_to_clicks: test.variants.map(v => ({
          variant: v.variant_id,
          rate: v.performance_metrics.click_through_rate
        })),
        clicks_to_conversions: test.variants.map(v => ({
          variant: v.variant_id,
          rate: v.performance_metrics.conversion_rate
        }))
      },
      user_segmentation: {
        new_vs_returning: 'Mock segmentation data',
        device_breakdown: 'Mock device data',
        geographic_distribution: 'Mock geo data'
      }
    }
  };
}

/**
 * GET /api/admin/homepage-builder/ab-test
 * Get A/B tests and user variant assignment
 */
export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const url = new URL(request.url);
    const testId = url.searchParams.get('test_id');
    const userId = url.searchParams.get('user_id');
    const includeResults = url.searchParams.get('include_results') === 'true';
    
    if (testId && userId) {
      // Get user's assigned variant for a specific test
      const variantId = assignUserToVariant(userId, testId);
      const test = abTests.get(testId);
      const variant = test?.variants.find(v => v.variant_id === variantId);
      
      return NextResponse.json({
        status: 'success',
        test_id: testId,
        user_id: userId,
        assigned_variant: variantId,
        variant_configuration: variant?.configuration,
        test_status: test?.status || 'not_found'
      });
    }
    
    if (testId) {
      // Get specific test details
      const test = abTests.get(testId);
      if (!test) {
        return NextResponse.json(
          { status: 'error', message: 'A/B test not found' },
          { status: 404 }
        );
      }
      
      const response: any = {
        status: 'success',
        ab_test: test
      };
      
      if (includeResults && test.status !== 'draft') {
        response.results = analyzeTestResults(test);
      }
      
      return NextResponse.json(response);
    }
    
    // Get all A/B tests
    const allTests = Array.from(abTests.values());
    
    return NextResponse.json({
      status: 'success',
      ab_tests: allTests.map(test => ({
        test_id: test.test_id,
        test_name: test.test_name,
        status: test.status,
        start_date: test.start_date,
        end_date: test.end_date,
        target_metric: test.target_metric,
        variants_count: test.variants.length,
        total_traffic: test.variants.reduce((sum, v) => sum + v.traffic_allocation, 0)
      })),
      summary: {
        total_tests: allTests.length,
        active_tests: allTests.filter(t => t.status === 'running').length,
        completed_tests: allTests.filter(t => t.status === 'completed').length,
        draft_tests: allTests.filter(t => t.status === 'draft').length
      },
      default_variants: DEFAULT_HOMEPAGE_VARIANTS
    });
    
  } catch (error) {
    console.error('A/B test retrieval error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to retrieve A/B test data',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});

/**
 * POST /api/admin/homepage-builder/ab-test
 * Create new A/B test
 */
export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const {
      test_name,
      description,
      variants,
      target_metric = 'conversion_rate',
      min_sample_size = 1000,
      confidence_level = 95,
      duration_days = 14
    } = body;
    
    if (!test_name || !variants || variants.length < 2) {
      return NextResponse.json(
        { status: 'error', message: 'Test name and at least 2 variants are required' },
        { status: 400 }
      );
    }
    
    const testId = `ab_test_${Date.now()}_${crypto.randomUUID().slice(0, 9)}`;
    
    const newTest: ABTest = {
      test_id: testId,
      test_name,
      description: description || '',
      status: 'draft',
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + duration_days * 24 * 60 * 60 * 1000).toISOString(),
      target_metric,
      min_sample_size,
      confidence_level,
      variants: variants.map((v: any, index: number) => ({
        ...v,
        variant_id: v.variant_id || `variant_${index}`,
        status: 'draft',
        performance_metrics: {
          impressions: 0,
          unique_visitors: 0,
          conversions: 0,
          conversion_rate: 0,
          bounce_rate: 0,
          avg_time_on_page: 0,
          click_through_rate: 0
        }
      })),
      created_by: 'admin'
    };
    
    abTests.set(testId, newTest);
    
    // Log test creation
    try {
      await prisma.auditLog.create({
        data: {
          action: 'AB_TEST_CREATED',
          entity_type: 'AB_TEST',
          entity_id: testId,
          details: {
            test_name,
            variants_count: variants.length,
            target_metric,
            duration_days
          },
          user_id: 'admin',
          ip_address: request.ip || 'unknown',
          user_agent: request.headers.get('user-agent') || 'unknown'
        }
      });
    } catch (dbError) {
      console.warn('Failed to log A/B test creation:', dbError);
    }
    
    return NextResponse.json({
      status: 'success',
      message: 'A/B test created successfully',
      ab_test: newTest,
      next_steps: [
        'Review test configuration',
        'Start the test when ready',
        'Monitor test performance',
        'Analyze results after sufficient data collection'
      ]
    });
    
  } catch (error) {
    console.error('A/B test creation error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to create A/B test',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});

/**
 * PUT /api/admin/homepage-builder/ab-test
 * Update A/B test status or configuration
 */
export const PUT = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { test_id, action, configuration } = body;
    
    const test = abTests.get(test_id);
    if (!test) {
      return NextResponse.json(
        { status: 'error', message: 'A/B test not found' },
        { status: 404 }
      );
    }
    
    let actionDescription = '';
    
    switch (action) {
      case 'start':
        if (test.status === 'draft') {
          test.status = 'running';
          test.start_date = new Date().toISOString();
          actionDescription = 'A/B test started successfully';
        } else {
          return NextResponse.json(
            { status: 'error', message: 'Can only start tests in draft status' },
            { status: 400 }
          );
        }
        break;
      case 'pause':
        if (test.status === 'running') {
          test.status = 'paused';
          actionDescription = 'A/B test paused';
        }
        break;
      case 'resume':
        if (test.status === 'paused') {
          test.status = 'running';
          actionDescription = 'A/B test resumed';
        }
        break;
      case 'complete':
        test.status = 'completed';
        test.end_date = new Date().toISOString();
        test.results = analyzeTestResults(test);
        actionDescription = 'A/B test completed and analyzed';
        break;
      case 'update_configuration':
        if (configuration) {
          Object.assign(test, configuration);
          actionDescription = 'A/B test configuration updated';
        }
        break;
      default:
        return NextResponse.json(
          { status: 'error', message: 'Invalid action' },
          { status: 400 }
        );
    }
    
    abTests.set(test_id, test);
    
    return NextResponse.json({
      status: 'success',
      message: actionDescription,
      ab_test: test,
      results: test.results
    });
    
  } catch (error) {
    console.error('A/B test update error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to update A/B test',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});