import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/admin-middleware'

// GET - Fetch API keys, usage logs, and provider configurations
export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'keys'
    
    switch (type) {
      case 'keys':
        return NextResponse.json({
          keys: [
            {
              id: '1',
              name: 'OpenAI Production',
              provider: 'openai',
              keyType: 'api_key',
              encryptedKey: 'encrypted_key_data',
              isActive: true,
              lastUsed: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
              usageCount: 1250,
              createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
              updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
              maskedKey: 'sk-...abc123'
            },
            {
              id: '2',
              name: 'Anthropic Claude',
              provider: 'anthropic',
              keyType: 'api_key',
              encryptedKey: 'encrypted_key_data',
              isActive: true,
              lastUsed: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
              usageCount: 890,
              createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
              updatedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
              maskedKey: 'sk-ant-...def456'
            },
            {
              id: '3',
              name: 'Google AI',
              provider: 'google',
              keyType: 'api_key',
              encryptedKey: 'encrypted_key_data',
              isActive: false,
              lastUsed: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
              usageCount: 340,
              createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
              updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
              maskedKey: 'AIza...ghi789'
            }
          ]
        })
        
      case 'usage':
        return NextResponse.json({
          logs: [
            {
              id: '1',
              provider: 'openai',
              model: 'gpt-4',
              promptType: 'content_generation',
              tokensIn: 150,
              tokensOut: 800,
              costEst: 0.024,
              timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
              success: true
            },
            {
              id: '2',
              provider: 'anthropic',
              model: 'claude-3-sonnet',
              promptType: 'seo_audit',
              tokensIn: 200,
              tokensOut: 600,
              costEst: 0.018,
              timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
              success: true
            },
            {
              id: '3',
              provider: 'openai',
              model: 'gpt-3.5-turbo',
              promptType: 'topic_research',
              tokensIn: 100,
              tokensOut: 400,
              costEst: 0.008,
              timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
              success: false
            },
            {
              id: '4',
              provider: 'anthropic',
              model: 'claude-3-haiku',
              promptType: 'content_optimization',
              tokensIn: 80,
              tokensOut: 300,
              costEst: 0.006,
              timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
              success: true
            },
            {
              id: '5',
              provider: 'openai',
              model: 'gpt-4-turbo',
              promptType: 'meta_generation',
              tokensIn: 120,
              tokensOut: 150,
              costEst: 0.012,
              timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
              success: true
            }
          ],
          summary: {
            totalRequests: 1250,
            totalTokens: 125000,
            totalCost: 24.50,
            successRate: 96.8,
            topProvider: 'openai',
            topModel: 'gpt-4'
          }
        })
        
      case 'providers':
        return NextResponse.json({
          providers: [
            {
              name: 'openai',
              displayName: 'OpenAI',
              keyTypes: ['api_key'],
              endpoints: ['https://api.openai.com/v1'],
              rateLimits: {
                requestsPerMinute: 60,
                tokensPerMinute: 150000
              },
              models: ['gpt-4', 'gpt-3.5-turbo', 'gpt-4-turbo'],
              status: 'active',
              lastHealthCheck: new Date().toISOString()
            },
            {
              name: 'anthropic',
              displayName: 'Anthropic',
              keyTypes: ['api_key'],
              endpoints: ['https://api.anthropic.com'],
              rateLimits: {
                requestsPerMinute: 30,
                tokensPerMinute: 100000
              },
              models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
              status: 'active',
              lastHealthCheck: new Date().toISOString()
            },
            {
              name: 'google',
              displayName: 'Google AI',
              keyTypes: ['api_key'],
              endpoints: ['https://generativelanguage.googleapis.com'],
              rateLimits: {
                requestsPerMinute: 15,
                tokensPerMinute: 32000
              },
              models: ['gemini-pro', 'gemini-pro-vision'],
              status: 'inactive',
              lastHealthCheck: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
            }
          ]
        })
        
      case 'settings':
        return NextResponse.json({
          settings: {
            encryption: {
              algorithm: 'AES-256-GCM',
              keyRotation: 90,
              lastRotation: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
            },
            accessControl: {
              auditLogging: true,
              ipRestrictions: [],
              sessionTimeout: 3600
            },
            monitoring: {
              alertThreshold: 1000,
              dailyLimit: 10000,
              monthlyLimit: 300000
            }
          }
        })
        
      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
    }
  } catch (error) {
    console.error('API Security API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch API security data' },
      { status: 500 }
    )
  }
})

// POST - Add, update, or manage API keys
export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { action, data } = body
    
    switch (action) {
      case 'add-key':
        const { name, provider, keyType, apiKey } = data
        
        // Simulate adding a new API key
        const newKey = {
          id: `key_${Date.now()}`,
          name,
          provider,
          keyType,
          encryptedKey: 'encrypted_key_data', // In real implementation, encrypt the key
          isActive: true,
          usageCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          maskedKey: `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 6)}`
        }
        
        return NextResponse.json({
          success: true,
          message: 'API key added successfully',
          key: newKey
        })
        
      case 'update-key':
        const { keyId, updates } = data
        
        // Simulate updating an API key
        return NextResponse.json({
          success: true,
          message: 'API key updated successfully',
          keyId,
          updates
        })
        
      case 'delete-key':
        const { keyId: deleteKeyId } = data
        
        // Simulate deleting an API key
        return NextResponse.json({
          success: true,
          message: 'API key deleted successfully',
          keyId: deleteKeyId
        })
        
      case 'toggle-key-status':
        const { keyId: toggleKeyId, isActive } = data
        
        // Simulate toggling key status
        return NextResponse.json({
          success: true,
          message: `API key ${isActive ? 'activated' : 'deactivated'} successfully`,
          keyId: toggleKeyId,
          isActive
        })
        
      case 'reveal-key':
        const { keyId: revealKeyId } = data
        
        // In real implementation, decrypt and return the key
        return NextResponse.json({
          success: true,
          key: 'sk-1234567890abcdef...', // Decrypted key
          expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
        })
        
      case 'test-key':
        const { keyId: testKeyId } = data
        
        // Simulate testing an API key
        return NextResponse.json({
          success: true,
          message: 'API key test successful',
          keyId: testKeyId,
          testResult: {
            status: 'success',
            responseTime: 245,
            model: 'gpt-3.5-turbo',
            tokensUsed: 10
          }
        })
        
      case 'update-settings':
        const { settings } = data
        
        // Simulate updating security settings
        return NextResponse.json({
          success: true,
          message: 'Security settings updated successfully',
          settings
        })
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('API Security POST error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
})
