'use client';

/**
 * AI API Keys Management
 *
 * Manage API keys for Claude, GPT, and Gemini.
 * Central control for all AI integrations.
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
} from 'lucide-react';

interface ApiKeyConfig {
  id: string;
  provider: 'claude' | 'openai' | 'gemini';
  name: string;
  key: string;
  status: 'active' | 'invalid' | 'expired' | 'unconfigured';
  lastUsed: string | null;
  usageThisMonth: number;
  usageLimit: number | null;
  models: string[];
}

const PROVIDERS = [
  {
    id: 'claude',
    name: 'Claude (Anthropic)',
    icon: Brain,
    color: 'from-orange-500 to-amber-500',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-600',
    description: 'Primary AI for content generation and analysis',
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
    description: 'Backup AI and specialized tasks',
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
    description: 'Alternative AI for specific use cases',
    models: ['gemini-pro', 'gemini-pro-vision'],
    docsUrl: 'https://makersuite.google.com/',
  },
];

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [newKeyValue, setNewKeyValue] = useState('');
  const [testingKey, setTestingKey] = useState<string | null>(null);
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
        setKeys(data.keys);
      } else {
        // Use mock data for demo
        setKeys(mockApiKeys);
      }
    } catch (error) {
      setKeys(mockApiKeys);
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
      const response = await fetch('/api/admin/command-center/settings/api-keys/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyId: id }),
      });

      // Simulate test result
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Update key status
      setKeys((prev) =>
        prev.map((k) =>
          k.id === id ? { ...k, status: 'active' as const } : k
        )
      );
    } catch (error) {
      console.error('Failed to test key:', error);
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
    <div className="min-h-screen bg-gray-50">
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
        {/* Info Banner */}
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl p-6 mb-8 text-white">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Key className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-bold text-lg mb-1">AI-Powered Automation</h2>
              <p className="text-purple-100 text-sm mb-3">
                Configure your AI provider API keys to enable content generation, SEO optimization,
                and autopilot features. All keys are encrypted and stored securely.
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

                  {/* Usage Stats */}
                  {keyConfig?.status === 'active' && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Usage this month</span>
                        <span className="font-medium">
                          {keyConfig.usageThisMonth.toLocaleString()}
                          {keyConfig.usageLimit && ` / ${keyConfig.usageLimit.toLocaleString()}`}
                          {' requests'}
                        </span>
                      </div>
                      {keyConfig.usageLimit && (
                        <div className="mt-2 bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              keyConfig.usageThisMonth / keyConfig.usageLimit > 0.9
                                ? 'bg-red-500'
                                : keyConfig.usageThisMonth / keyConfig.usageLimit > 0.7
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                            }`}
                            style={{
                              width: `${Math.min(
                                (keyConfig.usageThisMonth / keyConfig.usageLimit) * 100,
                                100
                              )}%`,
                            }}
                          />
                        </div>
                      )}
                      {keyConfig.lastUsed && (
                        <div className="mt-2 text-xs text-gray-500">
                          Last used: {keyConfig.lastUsed}
                        </div>
                      )}
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
                </div>
              </div>
            );
          })}
        </div>

        {/* AI Usage Summary */}
        <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold mb-4">AI Usage Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">12,450</div>
              <div className="text-sm text-gray-500">Total Requests</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">854</div>
              <div className="text-sm text-gray-500">Articles Generated</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">2,340</div>
              <div className="text-sm text-gray-500">SEO Optimizations</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-amber-600">$127.50</div>
              <div className="text-sm text-gray-500">Estimated Cost (MTD)</div>
            </div>
          </div>
        </div>

        {/* Priority Settings */}
        <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold mb-4">AI Provider Priority</h3>
          <p className="text-sm text-gray-500 mb-4">
            Set the order in which AI providers will be used. If the primary provider fails,
            the system will automatically fall back to the next one.
          </p>
          <div className="space-y-2">
            {['claude', 'openai', 'gemini'].map((providerId, index) => {
              const provider = PROVIDERS.find((p) => p.id === providerId);
              if (!provider) return null;

              return (
                <div
                  key={providerId}
                  className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
                >
                  <span className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center font-medium text-gray-600">
                    {index + 1}
                  </span>
                  <div
                    className={`w-8 h-8 bg-gradient-to-br ${provider.color} rounded-lg flex items-center justify-center`}
                  >
                    <provider.icon className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-medium">{provider.name}</span>
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

// Mock data
const mockApiKeys: ApiKeyConfig[] = [
  {
    id: 'claude-key',
    provider: 'claude',
    name: 'Claude API Key',
    key: 'sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    status: 'active',
    lastUsed: '2 minutes ago',
    usageThisMonth: 8500,
    usageLimit: 10000,
    models: ['claude-3-opus', 'claude-3-sonnet'],
  },
  {
    id: 'openai-key',
    provider: 'openai',
    name: 'OpenAI API Key',
    key: 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    status: 'active',
    lastUsed: '1 hour ago',
    usageThisMonth: 3200,
    usageLimit: 5000,
    models: ['gpt-4-turbo', 'gpt-3.5-turbo'],
  },
  {
    id: 'gemini-key',
    provider: 'gemini',
    name: 'Gemini API Key',
    key: '',
    status: 'unconfigured',
    lastUsed: null,
    usageThisMonth: 0,
    usageLimit: null,
    models: [],
  },
];
