'use client';

/**
 * AI API Keys Management
 *
 * Manage API keys for Grok (xAI), Claude, GPT, and Gemini.
 * Shows real configuration status from environment variables.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Key,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Copy,
  RefreshCw,
  Trash2,
  Plus,
  Sparkles,
  Zap,
  Brain,
  Save,
  TestTube,
  Loader2,
  Info,
  ExternalLink,
  Database,
  Shield,
  TrendingUp,
} from 'lucide-react';

interface ApiKeyConfig {
  id: string;
  provider: 'grok' | 'claude' | 'openai' | 'gemini' | 'serpapi';
  name: string;
  key: string;
  status: 'active' | 'invalid' | 'expired' | 'unconfigured';
  lastUsed: string | null;
  usageThisMonth: number;
  usageLimit: number | null;
  models: string[];
  envVar: string;
  source: 'env' | 'database' | 'none';
}

interface Integrations {
  database: { configured: boolean; envVar: string };
  supabase: { configured: boolean; envVars: string[] };
  serpApi: { configured: boolean; envVar: string; status: string };
  googleSearchConsole: { configured: boolean; envVars: string[] };
  googleAnalytics: { configured: boolean; envVar: string };
  pageSpeed: { configured: boolean; envVar: string };
  indexNow: { configured: boolean; envVar: string };
}

const PROVIDERS = [
  {
    id: 'grok',
    name: 'Grok (xAI)',
    icon: TrendingUp,
    color: 'from-gray-900 to-gray-700',
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-800',
    description: 'Priority #1 — EN content, trending topics (X), live news search',
    models: ['grok-4-1-fast', 'grok-4-latest'],
    docsUrl: 'https://console.x.ai/',
    features: ['Content generation', 'Web search', 'X/Twitter search', 'Trending topics', 'Live news'],
  },
  {
    id: 'claude',
    name: 'Claude (Anthropic)',
    icon: Brain,
    color: 'from-orange-500 to-amber-500',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-600',
    description: 'Priority #2 — content generation fallback',
    models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
    docsUrl: 'https://console.anthropic.com/',
  },
  {
    id: 'openai',
    name: 'OpenAI (GPT)',
    icon: Sparkles,
    color: 'from-green-500 to-emerald-500',
    bgColor: 'bg-green-50',
    textColor: 'text-green-600',
    description: 'Priority #3 — additional AI fallback',
    models: ['gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
    docsUrl: 'https://platform.openai.com/',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    icon: Zap,
    color: 'from-blue-500 to-indigo-500',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-600',
    description: 'Priority #4 — alternative AI for specific use cases',
    models: ['gemini-pro', 'gemini-pro-vision'],
    docsUrl: 'https://makersuite.google.com/',
  },
];

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyConfig[]>([]);
  const [integrations, setIntegrations] = useState<Integrations | null>(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [summary, setSummary] = useState<{ configured: number; total: number; status: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [newKeyValue, setNewKeyValue] = useState('');
  const [testingKey, setTestingKey] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/command-center/settings/api-keys');
      if (response.ok) {
        const data = await response.json();
        setKeys(data.keys || []);
        setIntegrations(data.integrations || null);
        setRecommendations(data.recommendations || []);
        setSummary(data.summary || null);
      } else {
        setKeys([]);
        setRecommendations(['Failed to load API configuration status']);
      }
    } catch (error) {
      setKeys([]);
      setRecommendations(['Failed to connect to API']);
    }
    setIsLoading(false);
  };

  const toggleShowKey = (id: string) => {
    setShowKey((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyKey = async (key: string) => {
    await navigator.clipboard.writeText(key);
    // Show toast notification
  };

  const testApiKey = async (id: string) => {
    setTestingKey(id);
    try {
      const response = await fetch('/api/admin/command-center/settings/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyId: id, action: 'test' }),
      });

      const result = await response.json();
      setTestResults((prev) => ({ ...prev, [id]: result }));

      // Update key status based on test result
      if (result.success) {
        setKeys((prev) =>
          prev.map((k) =>
            k.id === id ? { ...k, status: 'active' as const } : k
          )
        );
      }
    } catch (error) {
      setTestResults((prev) => ({
        ...prev,
        [id]: { success: false, message: 'Failed to test key' },
      }));
    }
    setTestingKey(null);
  };

  const saveApiKey = async (id: string, value: string) => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/command-center/settings/api-keys', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyId: id, key: value }),
      });

      // Update local state
      setKeys((prev) =>
        prev.map((k) =>
          k.id === id ? { ...k, key: value, status: 'active' as const } : k
        )
      );

      setEditingKey(null);
      setNewKeyValue('');
    } catch (error) {
      console.error('Failed to save key:', error);
    }
    setIsSaving(false);
  };

  const getStatusBadge = (status: ApiKeyConfig['status']) => {
    switch (status) {
      case 'active':
        return (
          <span className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-full text-sm">
            <CheckCircle className="h-3 w-3" />
            Active
          </span>
        );
      case 'invalid':
        return (
          <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-full text-sm">
            <AlertCircle className="h-3 w-3" />
            Invalid
          </span>
        );
      case 'expired':
        return (
          <span className="flex items-center gap-1 text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full text-sm">
            <AlertCircle className="h-3 w-3" />
            Expired
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-gray-600 bg-gray-100 px-2 py-1 rounded-full text-sm">
            <Key className="h-3 w-3" />
            Not Configured
          </span>
        );
    }
  };

  const maskKey = (key: string) => {
    if (!key) return '••••••••••••••••';
    return key.slice(0, 8) + '••••••••••••' + key.slice(-4);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/command-center"
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="font-semibold text-lg">AI API Keys</h1>
              <p className="text-sm text-gray-500">Manage your AI provider credentials</p>
            </div>
          </div>

          <button
            onClick={loadApiKeys}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Status Summary */}
        {summary && (
          <div className={`rounded-xl p-6 mb-6 ${
            summary.status === 'ready' ? 'bg-green-50 border border-green-200' :
            summary.status === 'partial' ? 'bg-yellow-50 border border-yellow-200' :
            'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center gap-4">
              {summary.status === 'ready' ? (
                <CheckCircle className="h-8 w-8 text-green-600" />
              ) : summary.status === 'partial' ? (
                <AlertCircle className="h-8 w-8 text-yellow-600" />
              ) : (
                <AlertCircle className="h-8 w-8 text-red-600" />
              )}
              <div>
                <h2 className={`font-bold text-lg ${
                  summary.status === 'ready' ? 'text-green-800' :
                  summary.status === 'partial' ? 'text-yellow-800' :
                  'text-red-800'
                }`}>
                  {summary.status === 'ready' ? 'System Ready' :
                   summary.status === 'partial' ? 'Partial Configuration' :
                   'Configuration Required'}
                </h2>
                <p className={`text-sm ${
                  summary.status === 'ready' ? 'text-green-700' :
                  summary.status === 'partial' ? 'text-yellow-700' :
                  'text-red-700'
                }`}>
                  {summary.configured} of {summary.total} AI providers configured
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-500" />
              Setup Recommendations
            </h3>
            <ul className="space-y-2">
              {recommendations.map((rec, index) => (
                <li key={index} className={`text-sm flex items-start gap-2 ${
                  rec.includes('CRITICAL') ? 'text-red-700 font-medium' :
                  rec.includes('✅') ? 'text-green-700' : 'text-gray-700'
                }`}>
                  <span className="mt-1">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Info Banner */}
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl p-6 mb-8 text-white">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Key className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-bold text-lg mb-1">AI-Powered Automation</h2>
              <p className="text-purple-100 text-sm mb-3">
                Configure your AI provider API keys via environment variables (.env file).
                Keys are read from your server environment for security.
              </p>
              <div className="flex flex-wrap gap-2">
                {PROVIDERS.map((provider) => (
                  <a
                    key={provider.id}
                    href={provider.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full text-sm transition-colors"
                  >
                    <provider.icon className="h-3 w-3" />
                    Get {provider.name} Key
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* API Keys List */}
        <div className="space-y-4">
          {PROVIDERS.map((provider) => {
            const keyConfig = keys.find((k) => k.provider === provider.id);
            const isEditing = editingKey === provider.id;
            const isTesting = testingKey === provider.id;

            return (
              <div
                key={provider.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-12 h-12 bg-gradient-to-br ${provider.color} rounded-xl flex items-center justify-center`}
                      >
                        <provider.icon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{provider.name}</h3>
                        <p className="text-sm text-gray-500">{provider.description}</p>
                      </div>
                    </div>
                    {keyConfig && getStatusBadge(keyConfig.status)}
                  </div>

                  {/* Key Input */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      API Key
                    </label>
                    {isEditing ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newKeyValue}
                          onChange={(e) => setNewKeyValue(e.target.value)}
                          placeholder={`Enter your ${provider.name} API key`}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                        />
                        <button
                          onClick={() => saveApiKey(provider.id, newKeyValue)}
                          disabled={isSaving || !newKeyValue}
                          className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                          {isSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingKey(null);
                            setNewKeyValue('');
                          }}
                          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-50 px-4 py-2 rounded-lg font-mono text-sm flex items-center justify-between">
                          <span>
                            {showKey[provider.id]
                              ? keyConfig?.key || 'Not configured'
                              : maskKey(keyConfig?.key || '')}
                          </span>
                          <div className="flex items-center gap-1">
                            {keyConfig?.key && (
                              <>
                                <button
                                  onClick={() => toggleShowKey(provider.id)}
                                  className="p-1 hover:bg-gray-200 rounded"
                                  title={showKey[provider.id] ? 'Hide key' : 'Show key'}
                                >
                                  {showKey[provider.id] ? (
                                    <EyeOff className="h-4 w-4 text-gray-500" />
                                  ) : (
                                    <Eye className="h-4 w-4 text-gray-500" />
                                  )}
                                </button>
                                <button
                                  onClick={() => copyKey(keyConfig.key)}
                                  className="p-1 hover:bg-gray-200 rounded"
                                  title="Copy key"
                                >
                                  <Copy className="h-4 w-4 text-gray-500" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setEditingKey(provider.id);
                            setNewKeyValue(keyConfig?.key || '');
                          }}
                          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                        >
                          {keyConfig?.key ? 'Update' : 'Add Key'}
                        </button>
                        {keyConfig?.key && (
                          <button
                            onClick={() => testApiKey(provider.id)}
                            disabled={isTesting}
                            className="inline-flex items-center gap-2 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                          >
                            {isTesting ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <TestTube className="h-4 w-4" />
                            )}
                            Test
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Test Result */}
                  {testResults[keyConfig?.id || provider.id] && (
                    <div className={`rounded-lg p-3 mb-4 ${
                      testResults[keyConfig?.id || provider.id].success
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-red-50 border border-red-200'
                    }`}>
                      <div className="flex items-center gap-2 text-sm">
                        {testResults[keyConfig?.id || provider.id].success ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        )}
                        <span className={
                          testResults[keyConfig?.id || provider.id].success
                            ? 'text-green-700'
                            : 'text-red-700'
                        }>
                          {testResults[keyConfig?.id || provider.id].message}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Environment Variable Info */}
                  {keyConfig?.status === 'unconfigured' && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                      <p className="text-sm text-amber-800">
                        <strong>To configure:</strong> Add <code className="bg-amber-100 px-1 rounded">{keyConfig.envVar}</code> to your <code className="bg-amber-100 px-1 rounded">.env</code> file
                      </p>
                    </div>
                  )}

                  {/* Available Models */}
                  <div className="mt-4">
                    <span className="text-sm text-gray-500">Available models:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {provider.models.map((model) => (
                        <span
                          key={model}
                          className={`px-2 py-1 ${provider.bgColor} ${provider.textColor} rounded text-xs`}
                        >
                          {model}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Grok-specific features list */}
                  {'features' in provider && (provider as any).features && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Enabled Features</span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {((provider as any).features as string[]).map((feature: string) => (
                          <span
                            key={feature}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded-full text-xs text-gray-700"
                          >
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            {feature}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Used by: daily-content-generate, weekly-topics, trends-monitor, london-news
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Other Integrations Status */}
        {integrations && (
          <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Database className="h-5 w-5 text-gray-500" />
              Other Integrations
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                {integrations.database.configured ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
                <div>
                  <span className="font-medium text-sm">Database</span>
                  <p className="text-xs text-gray-500">{integrations.database.envVar}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                {integrations.supabase.configured ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                )}
                <div>
                  <span className="font-medium text-sm">Supabase Auth</span>
                  <p className="text-xs text-gray-500">Authentication</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                {integrations.serpApi.configured ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                )}
                <div>
                  <span className="font-medium text-sm">Google Trends</span>
                  <p className="text-xs text-gray-500">{integrations.serpApi.envVar}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                {integrations.googleSearchConsole.configured ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                )}
                <div>
                  <span className="font-medium text-sm">Search Console</span>
                  <p className="text-xs text-gray-500">SEO indexing</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                {integrations.googleAnalytics.configured ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                )}
                <div>
                  <span className="font-medium text-sm">Google Analytics</span>
                  <p className="text-xs text-gray-500">{integrations.googleAnalytics.envVar}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                {integrations.indexNow.configured ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                )}
                <div>
                  <span className="font-medium text-sm">IndexNow</span>
                  <p className="text-xs text-gray-500">Instant indexing</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Priority Settings */}
        <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold mb-4">AI Provider Priority</h3>
          <p className="text-sm text-gray-500 mb-4">
            Providers are tried in priority order. Grok is preferred for EN content due to
            cost efficiency ($0.20/$0.50 per 1M tokens) and real-time web + X search.
          </p>
          <div className="space-y-2">
            {['grok', 'claude', 'openai', 'gemini'].map((providerId, index) => {
              const provider = PROVIDERS.find((p) => p.id === providerId);
              if (!provider) return null;

              return (
                <div
                  key={providerId}
                  className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
                >
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center font-medium ${
                    index === 0 ? 'bg-black text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {index + 1}
                  </span>
                  <div
                    className={`w-8 h-8 bg-gradient-to-br ${provider.color} rounded-lg flex items-center justify-center`}
                  >
                    <provider.icon className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <span className="font-medium">{provider.name}</span>
                    {providerId === 'grok' && (
                      <span className="ml-2 text-xs bg-black text-white px-2 py-0.5 rounded-full">
                        Preferred
                      </span>
                    )}
                  </div>
                  <span
                    className={`ml-auto text-sm ${
                      keys.find((k) => k.provider === providerId)?.status === 'active'
                        ? 'text-green-600'
                        : 'text-gray-400'
                    }`}
                  >
                    {keys.find((k) => k.provider === providerId)?.status === 'active'
                      ? 'Ready'
                      : 'Not configured'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}

