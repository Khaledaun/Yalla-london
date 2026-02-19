'use client'

import { useState } from 'react'
import { 
  Brain, 
  Plus, 
  Settings, 
  BarChart3, 
  Zap, 
  Eye, 
  Copy,
  Play,
  Pause,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react'

export default function AIStudio() {
  const [activeTab, setActiveTab] = useState('prompts')
  const [isLoading, setIsLoading] = useState(false)
  const [prompts, setPrompts] = useState([
    { id: 1, name: 'Event Guide Generator', version: '2.1', locale: 'en', category: 'generation', pageType: 'event', isActive: true, usageCount: 45, lastUsed: '2024-01-14T10:30:00Z' },
    { id: 2, name: 'Shopping Guide Generator', version: '1.8', locale: 'ar', category: 'generation', pageType: 'shopping', isActive: true, usageCount: 32, lastUsed: '2024-01-14T09:15:00Z' },
    { id: 3, name: 'SEO Audit Prompt', version: '1.5', locale: 'en', category: 'seo_audit', pageType: null as string | null, isActive: false, usageCount: 18, lastUsed: '2024-01-13T16:45:00Z' }
  ])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  const tabs = [
    { id: 'prompts', name: 'Prompts', icon: Brain },
    { id: 'models', name: 'Models & Providers', icon: Settings },
    { id: 'routing', name: 'Routing & Automation', icon: Zap },
    { id: 'usage', name: 'Token Usage & Cost', icon: BarChart3 }
  ]

  const providers = [
    {
      id: 1,
      name: 'OpenAI',
      displayName: 'OpenAI GPT-4',
      providerType: 'llm',
      isActive: true,
      lastTested: '2024-01-14T08:00:00Z',
      testStatus: 'success',
      usageCount: 156,
      costEst: 45.67
    },
    {
      id: 2,
      name: 'Anthropic',
      displayName: 'Claude 3.5 Sonnet',
      providerType: 'llm',
      isActive: true,
      lastTested: '2024-01-14T08:00:00Z',
      testStatus: 'success',
      usageCount: 89,
      costEst: 23.45
    },
    {
      id: 3,
      name: 'Google',
      displayName: 'Gemini Pro',
      providerType: 'llm',
      isActive: false,
      lastTested: '2024-01-13T10:00:00Z',
      testStatus: 'failed',
      usageCount: 12,
      costEst: 3.21
    }
  ]

  const routingRules = [
    {
      id: 1,
      routeName: 'topic_research',
      primaryProvider: 'OpenAI GPT-4',
      fallbackProvider: 'Claude 3.5 Sonnet',
      isActive: true,
      successRate: 98.5,
      avgResponseTime: 2.3
    },
    {
      id: 2,
      routeName: 'content_generation',
      primaryProvider: 'Claude 3.5 Sonnet',
      fallbackProvider: 'OpenAI GPT-4',
      isActive: true,
      successRate: 96.2,
      avgResponseTime: 4.1
    },
    {
      id: 3,
      routeName: 'seo_audit',
      primaryProvider: 'OpenAI GPT-4',
      fallbackProvider: null,
      isActive: true,
      successRate: 99.1,
      avgResponseTime: 1.8
    }
  ]

  const usageStats = {
    totalTokens: 125430,
    totalCost: 72.33,
    dailyBudget: 100,
    weeklyBudget: 500,
    monthlyBudget: 2000
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Brain className="h-8 w-8 text-purple-500" />
              AI Tools & Prompt Studio
            </h1>
            <p className="text-gray-600 mt-1">Your control tower for all AI operations</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-gray-500">Total Cost Today</div>
              <div className="text-lg font-semibold text-gray-900">
                ${usageStats.totalCost.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'prompts' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Prompt Templates</h2>
            <button className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors">
              <Plus className="h-4 w-4" />
              Add Prompt
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {prompts.map((prompt) => (
              <div key={prompt.id} className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">{prompt.name}</h3>
                      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                        v{prompt.version}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        prompt.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {prompt.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${prompt.locale === 'en' ? 'bg-blue-500' : 'bg-green-500'}`}></span>
                        {prompt.locale.toUpperCase()}
                      </span>
                      <span>{prompt.category}</span>
                      {prompt.pageType && <span>{prompt.pageType}</span>}
                      <span>Used {prompt.usageCount} times</span>
                      <span>Last used: {new Date(prompt.lastUsed).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button title="View prompt" onClick={() => { window.location.href = '/admin/prompts'; }} className="p-2 text-gray-400 hover:text-gray-600">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button title="Edit prompt" onClick={() => { window.location.href = '/admin/prompts'; }} className="p-2 text-gray-400 hover:text-gray-600">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button title="Copy name" onClick={() => copyToClipboard(prompt.name)} className="p-2 text-gray-400 hover:text-gray-600">
                      <Copy className="h-4 w-4" />
                    </button>
                    <button title="Use in content generation" onClick={() => { window.location.href = '/admin/content?tab=generation'; }} className="p-2 text-gray-400 hover:text-gray-600">
                      <Play className="h-4 w-4" />
                    </button>
                    <button title="Delete prompt" onClick={() => setPrompts(prev => prev.filter(p => p.id !== prompt.id))} className="p-2 text-red-400 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'models' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Models & Providers</h2>
            <button className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors">
              <Plus className="h-4 w-4" />
              Add Provider
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {providers.map((provider) => (
              <div key={provider.id} className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">{provider.displayName}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        provider.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {provider.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        provider.testStatus === 'success'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {provider.testStatus === 'success' ? (
                          <><CheckCircle className="h-3 w-3 inline mr-1" />Connected</>
                        ) : (
                          <><AlertCircle className="h-3 w-3 inline mr-1" />Failed</>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>{provider.providerType}</span>
                      <span>Used {provider.usageCount} times</span>
                      <span>Cost: ${provider.costEst.toFixed(2)}</span>
                      <span>Last tested: {new Date(provider.lastTested).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button title="API Key Settings" onClick={() => { window.location.href = '/admin/command-center/settings/api-keys'; }} className="p-2 text-gray-400 hover:text-gray-600">
                      <Settings className="h-4 w-4" />
                    </button>
                    <button title="Test Connection" onClick={() => { window.location.href = '/admin/command-center/settings/api-keys'; }} className="p-2 text-gray-400 hover:text-gray-600">
                      <Play className="h-4 w-4" />
                    </button>
                    <button title="Edit Provider" onClick={() => { window.location.href = '/admin/command-center/settings/api-keys'; }} className="p-2 text-gray-400 hover:text-gray-600">
                      <Edit className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'routing' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Routing & Automation</h2>
            <button className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors">
              <Plus className="h-4 w-4" />
              Add Route
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {routingRules.map((rule) => (
              <div key={rule.id} className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">{rule.routeName}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        rule.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {rule.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-gray-600">Primary Provider</div>
                        <div className="font-medium text-gray-900">{rule.primaryProvider}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Fallback Provider</div>
                        <div className="font-medium text-gray-900">{rule.fallbackProvider || 'None'}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Success Rate</div>
                        <div className="font-medium text-gray-900">{rule.successRate}%</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button title="Route Settings" onClick={() => { window.location.href = '/admin/workflow'; }} className="p-2 text-gray-400 hover:text-gray-600">
                      <Settings className="h-4 w-4" />
                    </button>
                    <button title="Edit Route" onClick={() => { window.location.href = '/admin/workflow'; }} className="p-2 text-gray-400 hover:text-gray-600">
                      <Edit className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'usage' && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Token Usage & Cost</h2>
          
          {/* Usage Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Tokens</p>
                  <p className="text-2xl font-bold text-gray-900">{usageStats.totalTokens.toLocaleString()}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-blue-500" />
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Cost</p>
                  <p className="text-2xl font-bold text-gray-900">${usageStats.totalCost.toFixed(2)}</p>
                </div>
                <Zap className="h-8 w-8 text-green-500" />
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Daily Budget</p>
                  <p className="text-2xl font-bold text-gray-900">${usageStats.dailyBudget}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Monthly Budget</p>
                  <p className="text-2xl font-bold text-gray-900">${usageStats.monthlyBudget}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-purple-500" />
              </div>
            </div>
          </div>

          {/* Usage Charts Placeholder */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage Trends</h3>
            <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
              <p className="text-gray-500">Usage charts will be implemented here</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
