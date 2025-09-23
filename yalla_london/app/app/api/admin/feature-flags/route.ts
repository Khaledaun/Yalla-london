import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/admin-middleware'

// GET - Fetch feature flags, health metrics, and analytics
export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'flags'
    
    switch (type) {
      case 'flags':
        return NextResponse.json({
          flags: [
            {
              id: '1',
              name: 'AI Content Generation',
              description: 'Enable AI-powered content generation for blog posts',
              enabled: true,
              rolloutPercentage: 100,
              targetUsers: ['admin', 'editor'],
              conditions: {
                environment: ['production', 'staging'],
                userRoles: ['admin', 'editor']
              },
              metrics: {
                impressions: 1250,
                conversions: 89,
                conversionRate: 7.12
              },
              createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
              updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
              id: '2',
              name: 'Advanced SEO Tools',
              description: 'Enable advanced SEO analysis and optimization tools',
              enabled: true,
              rolloutPercentage: 75,
              targetUsers: ['admin', 'editor', 'analyst'],
              conditions: {
                environment: ['production'],
                userRoles: ['admin', 'editor', 'analyst']
              },
              metrics: {
                impressions: 890,
                conversions: 67,
                conversionRate: 7.53
              },
              createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
              updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
              id: '3',
              name: 'Video Hero Support',
              description: 'Enable video hero backgrounds on homepage',
              enabled: false,
              rolloutPercentage: 0,
              targetUsers: ['admin'],
              conditions: {
                environment: ['staging'],
                userRoles: ['admin']
              },
              metrics: {
                impressions: 0,
                conversions: 0,
                conversionRate: 0
              },
              createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
              updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
              id: '4',
              name: 'Real-time Analytics',
              description: 'Enable real-time analytics dashboard',
              enabled: true,
              rolloutPercentage: 50,
              targetUsers: ['admin', 'analyst'],
              conditions: {
                environment: ['production'],
                userRoles: ['admin', 'analyst'],
                dateRange: {
                  start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                  end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
                }
              },
              metrics: {
                impressions: 450,
                conversions: 23,
                conversionRate: 5.11
              },
              createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
              updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
            }
          ]
        })
        
      case 'health':
        return NextResponse.json({
          systemHealth: {
            overall: 'healthy',
            uptime: 99.9,
            responseTime: 245,
            errorRate: 0.1,
            lastIncident: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            metrics: [
              {
                id: '1',
                name: 'Database Performance',
                status: 'healthy',
                value: 95,
                threshold: 80,
                unit: '%',
                lastChecked: new Date().toISOString(),
                trend: 'up'
              },
              {
                id: '2',
                name: 'API Response Time',
                status: 'healthy',
                value: 245,
                threshold: 500,
                unit: 'ms',
                lastChecked: new Date().toISOString(),
                trend: 'stable'
              },
              {
                id: '3',
                name: 'Memory Usage',
                status: 'warning',
                value: 78,
                threshold: 85,
                unit: '%',
                lastChecked: new Date().toISOString(),
                trend: 'up'
              },
              {
                id: '4',
                name: 'CPU Usage',
                status: 'healthy',
                value: 45,
                threshold: 80,
                unit: '%',
                lastChecked: new Date().toISOString(),
                trend: 'down'
              },
              {
                id: '5',
                name: 'Disk Space',
                status: 'healthy',
                value: 62,
                threshold: 90,
                unit: '%',
                lastChecked: new Date().toISOString(),
                trend: 'stable'
              },
              {
                id: '6',
                name: 'Error Rate',
                status: 'healthy',
                value: 0.1,
                threshold: 1.0,
                unit: '%',
                lastChecked: new Date().toISOString(),
                trend: 'down'
              }
            ]
          }
        })
        
      case 'analytics':
        return NextResponse.json({
          analytics: {
            featureFlags: {
              total: 4,
              enabled: 3,
              disabled: 1,
              averageConversionRate: 6.44,
              totalImpressions: 2590,
              totalConversions: 179
            },
            systemPerformance: {
              averageResponseTime: 245,
              uptime: 99.9,
              errorRate: 0.1,
              lastIncident: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
            },
            trends: {
              responseTime: [
                { date: '2024-01-15', value: 230 },
                { date: '2024-01-16', value: 245 },
                { date: '2024-01-17', value: 240 },
                { date: '2024-01-18', value: 250 },
                { date: '2024-01-19', value: 245 }
              ],
              errorRate: [
                { date: '2024-01-15', value: 0.2 },
                { date: '2024-01-16', value: 0.1 },
                { date: '2024-01-17', value: 0.15 },
                { date: '2024-01-18', value: 0.1 },
                { date: '2024-01-19', value: 0.1 }
              ],
              featureFlagUsage: [
                { flag: 'AI Content Generation', impressions: 1250, conversions: 89 },
                { flag: 'Advanced SEO Tools', impressions: 890, conversions: 67 },
                { flag: 'Real-time Analytics', impressions: 450, conversions: 23 }
              ]
            }
          }
        })
        
      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
    }
  } catch (error) {
    console.error('Feature Flags API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch feature flags data' },
      { status: 500 }
    )
  }
})

// POST - Manage feature flags and health monitoring
export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { action, data } = body
    
    switch (action) {
      case 'add-flag':
        const { name, description, rolloutPercentage, targetUsers, conditions } = data
        
        // Simulate adding a new feature flag
        const newFlag = {
          id: `flag_${Date.now()}`,
          name,
          description,
          enabled: rolloutPercentage > 0,
          rolloutPercentage,
          targetUsers,
          conditions,
          metrics: {
            impressions: 0,
            conversions: 0,
            conversionRate: 0
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        
        return NextResponse.json({
          success: true,
          message: 'Feature flag added successfully',
          flag: newFlag
        })
        
      case 'update-flag':
        const { flagId, updates } = data
        
        // Simulate updating a feature flag
        return NextResponse.json({
          success: true,
          message: 'Feature flag updated successfully',
          flagId,
          updates
        })
        
      case 'toggle-flag':
        const { flagId: toggleFlagId, enabled } = data
        
        // Simulate toggling a feature flag
        return NextResponse.json({
          success: true,
          message: `Feature flag ${enabled ? 'enabled' : 'disabled'} successfully`,
          flagId: toggleFlagId,
          enabled
        })
        
      case 'update-rollout':
        const { flagId: rolloutFlagId, rolloutPercentage: newRolloutPercentage } = data
        
        // Simulate updating rollout percentage
        return NextResponse.json({
          success: true,
          message: 'Rollout percentage updated successfully',
          flagId: rolloutFlagId,
          rolloutPercentage: newRolloutPercentage
        })
        
      case 'delete-flag':
        const { flagId: deleteFlagId } = data
        
        // Simulate deleting a feature flag
        return NextResponse.json({
          success: true,
          message: 'Feature flag deleted successfully',
          flagId: deleteFlagId
        })
        
      case 'refresh-health':
        // Simulate refreshing health metrics
        return NextResponse.json({
          success: true,
          message: 'Health metrics refreshed successfully',
          timestamp: new Date().toISOString()
        })
        
      case 'update-health-thresholds':
        const { thresholds } = data
        
        // Simulate updating health monitoring thresholds
        return NextResponse.json({
          success: true,
          message: 'Health thresholds updated successfully',
          thresholds
        })
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Feature Flags POST error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
})
