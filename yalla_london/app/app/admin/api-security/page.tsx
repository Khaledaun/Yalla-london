'use client'

import { useState, useEffect } from 'react'
import { 
  Key, 
  Shield, 
  Eye, 
  EyeOff, 
  Plus, 
  Edit, 
  Trash2, 
  Copy, 
  Check, 
  AlertTriangle,
  Settings,
  Activity,
  Lock,
  Unlock,
  RefreshCw,
  ExternalLink,
  Database,
  Zap
} from 'lucide-react'

interface ApiKey {
  id: string
  name: string
  provider: string
  keyType: 'api_key' | 'oauth_token' | 'webhook_secret'
  encryptedKey: string
  isActive: boolean
  lastUsed?: string
  usageCount: number
  createdAt: string
  updatedAt: string
  // For display purposes
  maskedKey?: string
  isRevealed?: boolean
}

interface UsageLog {
  id: string
  provider: string
  model: string
  promptType: string
  tokensIn: number
  tokensOut: number
  costEst: number
  timestamp: string
  success: boolean
}

interface ProviderConfig {
  name: string
  displayName: string
  keyTypes: string[]
  endpoints: string[]
  rateLimits: {
    requestsPerMinute: number
    tokensPerMinute: number
  }
  models: string[]
  status: 'active' | 'inactive' | 'error'
}

export default function ApiKeysSafe() {
  const [activeTab, setActiveTab] = useState<'keys' | 'usage' | 'providers' | 'settings'>('keys')
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([])
  const [providers, setProviders] = useState<ProviderConfig[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddKey, setShowAddKey] = useState(false)
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadApiData()
  }, [])

  const loadApiData = async () => {
    setIsLoading(true)
    try {
      // Mock data - will be replaced with real API calls
      const mockKeys: ApiKey[] = [
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

      const mockUsageLogs: UsageLog[] = [
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
        }
      ]

      const mockProviders: ProviderConfig[] = [
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
          status: 'active'
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
          status: 'active'
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
          status: 'inactive'
        }
      ]

      setApiKeys(mockKeys)
      setUsageLogs(mockUsageLogs)
      setProviders(mockProviders)
    } catch (error) {
      console.error('Failed to load API data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRevealKey = (keyId: string) => {
    setRevealedKeys(prev => {
      const newSet = new Set(prev)
      if (newSet.has(keyId)) {
        newSet.delete(keyId)
      } else {
        newSet.add(keyId)
      }
      return newSet
    })
  }

  const handleCopyKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key)
      // Show success feedback
    } catch (error) {
      console.error('Failed to copy key:', error)
    }
  }

  const handleToggleKeyStatus = async (keyId: string) => {
    setApiKeys(prev => prev.map(key => 
      key.id === keyId ? { ...key, isActive: !key.isActive } : key
    ))
  }

  const handleDeleteKey = async (keyId: string) => {
    if (confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      setApiKeys(prev => prev.filter(key => key.id !== keyId))
    }
  }

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'openai': return '🤖'
      case 'anthropic': return '🧠'
      case 'google': return '🔍'
      default: return '🔑'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50'
      case 'inactive': return 'text-gray-600 bg-gray-50'
      case 'error': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="text-center">
          <Shield className="h-12 w-12 animate-pulse text-purple-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">Loading API & Keys Safe...</h2>
          <p className="text-gray-600">Securing your API credentials</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Shield className="h-8 w-8 text-purple-500" />
            API & Keys Safe
          </h1>
          <p className="text-gray-600 mt-1">Securely manage your API keys and monitor usage</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddKey(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <Plus className="h-4 w-4" />
            Add API Key
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
            <Settings className="h-4 w-4" />
            Settings
          </button>
        </div>
      </div>

      {/* Security Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Lock className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-blue-900">Security Notice</h3>
            <p className="text-sm text-blue-700 mt-1">
              All API keys are encrypted using AES-256-GCM encryption and stored securely. 
              Keys are only revealed when explicitly requested and are automatically masked in logs.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'keys', label: 'API Keys', icon: Key },
            { id: 'usage', label: 'Usage Logs', icon: Activity },
            { id: 'providers', label: 'Providers', icon: Database },
            { id: 'settings', label: 'Security Settings', icon: Settings }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'keys' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {apiKeys.map((key) => (
              <div key={key.id} className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getProviderIcon(key.provider)}</span>
                    <div>
                      <h3 className="font-medium text-gray-900">{key.name}</h3>
                      <p className="text-sm text-gray-600 capitalize">{key.provider}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleKeyStatus(key.id)}
                      className={`p-1 rounded ${
                        key.isActive ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'
                      }`}
                    >
                      {key.isActive ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => handleDeleteKey(key.id)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">API Key</label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm font-mono">
                        {revealedKeys.has(key.id) ? key.maskedKey : '••••••••••••••••'}
                      </code>
                      <button
                        onClick={() => handleRevealKey(key.id)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                      >
                        {revealedKeys.has(key.id) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => handleCopyKey(key.maskedKey || '')}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Usage Count:</span>
                      <span className="ml-1 font-medium">{key.usageCount.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Status:</span>
                      <span className={`ml-1 px-2 py-1 rounded-full text-xs font-medium ${
                        key.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {key.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  {key.lastUsed && (
                    <div className="text-sm text-gray-600">
                      Last used: {new Date(key.lastUsed).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add Key Form */}
          {showAddKey && (
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New API Key</h3>
              <form className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                    <input
                      type="text"
                      placeholder="e.g., OpenAI Production"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Provider</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                      <option value="">Select Provider</option>
                      <option value="openai">OpenAI</option>
                      <option value="anthropic">Anthropic</option>
                      <option value="google">Google AI</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
                  <input
                    type="password"
                    placeholder="Enter your API key"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    Add Key
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddKey(false)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {activeTab === 'usage' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Usage Logs</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Provider</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tokens</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {usageLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getProviderIcon(log.provider)}</span>
                          <span className="text-sm font-medium text-gray-900 capitalize">{log.provider}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.model}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{log.promptType}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.tokensIn} → {log.tokensOut}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${log.costEst.toFixed(4)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          log.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {log.success ? 'Success' : 'Failed'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'providers' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {providers.map((provider) => (
              <div key={provider.name} className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getProviderIcon(provider.name)}</span>
                    <div>
                      <h3 className="font-medium text-gray-900">{provider.displayName}</h3>
                      <p className="text-sm text-gray-600">{provider.name}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(provider.status)}`}>
                    {provider.status}
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Rate Limits</h4>
                    <div className="text-sm text-gray-600">
                      <div>{provider.rateLimits.requestsPerMinute} requests/min</div>
                      <div>{provider.rateLimits.tokensPerMinute.toLocaleString()} tokens/min</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Available Models</h4>
                    <div className="flex flex-wrap gap-1">
                      {provider.models.map((model) => (
                        <span key={model} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                          {model}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button className="flex-1 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm hover:bg-purple-200">
                      Configure
                    </button>
                    <button className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Encryption Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Encryption Algorithm</label>
                  <input
                    type="text"
                    value="AES-256-GCM"
                    disabled
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Key Rotation</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                    <option value="30">Every 30 days</option>
                    <option value="90">Every 90 days</option>
                    <option value="180">Every 180 days</option>
                    <option value="365">Every year</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Access Control</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Audit Logging</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-700">Enable detailed audit logs</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">IP Restrictions</label>
                  <textarea
                    rows={3}
                    placeholder="Enter allowed IP addresses (one per line)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}