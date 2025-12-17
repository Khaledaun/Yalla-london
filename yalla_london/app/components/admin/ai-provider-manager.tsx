'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings,
  Zap,
  Check,
  X,
  AlertCircle,
  RefreshCw,
  Play,
  ChevronDown,
  ChevronUp,
  Cpu,
  DollarSign,
  Clock,
  Globe,
  Sparkles,
  Bot,
  Brain,
  Search,
  FileText,
  BarChart3,
  GripVertical,
} from 'lucide-react';

interface AIProvider {
  id: string;
  name: string;
  displayName: string;
  configured: boolean;
  models: string[];
  defaultModel: string;
  capabilities: string[];
  costPer1kTokens: {
    input: number;
    output: number;
  };
  maxTokens: number;
  isActive: boolean;
  lastTested?: string;
  testStatus?: 'success' | 'failed' | 'pending';
}

interface ProviderSettings {
  activeProvider: string;
  fallbackEnabled: boolean;
  fallbackOrder: string[];
  routeSettings: {
    topicResearch: string;
    contentGeneration: string;
    seoAudit: string;
  };
}

interface TestResult {
  provider: string;
  success: boolean;
  response?: string;
  error?: string;
  responseTimeMs?: number;
  model?: string;
}

const PROVIDER_ICONS: Record<string, React.ReactNode> = {
  claude: <Brain className="w-5 h-5" />,
  openai: <Sparkles className="w-5 h-5" />,
  grok: <Zap className="w-5 h-5" />,
  gemini: <Globe className="w-5 h-5" />,
  perplexity: <Search className="w-5 h-5" />,
  abacus: <Cpu className="w-5 h-5" />,
};

const PROVIDER_COLORS: Record<string, string> = {
  claude: 'bg-orange-500',
  openai: 'bg-green-500',
  grok: 'bg-blue-600',
  gemini: 'bg-blue-400',
  perplexity: 'bg-purple-500',
  abacus: 'bg-gray-600',
};

export default function AIProviderManager() {
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [settings, setSettings] = useState<ProviderSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const fetchProviders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/admin/ai-providers');
      const data = await response.json();

      if (data.success) {
        setProviders(data.providers);
        setSettings(data.settings);
      } else {
        setError(data.error || 'Failed to fetch providers');
      }
    } catch (err) {
      setError('Failed to connect to API');
      console.error('Error fetching providers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const handleSetActiveProvider = async (providerId: string) => {
    if (!settings) return;

    setSaving(true);
    try {
      const response = await fetch('/api/admin/ai-providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          activeProvider: providerId,
          contentGenerationProvider: providerId,
          seoAuditProvider: providerId,
        }),
      });

      const data = await response.json();
      if (data.success) {
        await fetchProviders();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRouteSetting = async (route: string, providerId: string) => {
    if (!settings) return;

    setSaving(true);
    try {
      const updatedRouteSettings = {
        ...settings.routeSettings,
        [route]: providerId,
      };

      const response = await fetch('/api/admin/ai-providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          [`${route}Provider`]: providerId,
        }),
      });

      const data = await response.json();
      if (data.success) {
        await fetchProviders();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to update route settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestProvider = async (providerId: string) => {
    setTesting(providerId);
    setTestResult(null);

    try {
      const response = await fetch('/api/admin/ai-providers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: providerId,
          testPrompt: 'Write a one-sentence description of London for luxury travelers.',
        }),
      });

      const data = await response.json();
      setTestResult({
        provider: providerId,
        success: data.success,
        response: data.response,
        error: data.error,
        responseTimeMs: data.responseTimeMs,
        model: data.model,
      });

      // Refresh providers to update test status
      await fetchProviders();
    } catch (err) {
      setTestResult({
        provider: providerId,
        success: false,
        error: 'Test request failed',
      });
    } finally {
      setTesting(null);
    }
  };

  const handleToggleFallback = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const response = await fetch('/api/admin/ai-providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          fallbackEnabled: !settings.fallbackEnabled,
        }),
      });

      const data = await response.json();
      if (data.success) {
        await fetchProviders();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to update fallback setting');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="flex items-center justify-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-3 text-gray-600 dark:text-gray-300">Loading AI providers...</span>
        </div>
      </div>
    );
  }

  const configuredProviders = providers.filter((p) => p.configured);
  const unconfiguredProviders = providers.filter((p) => !p.configured);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Bot className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                AI Provider Management
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Configure and switch between AI providers for content generation
              </p>
            </div>
          </div>
          <button
            onClick={fetchProviders}
            disabled={loading}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Quick Stats */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {configuredProviders.length}
            </div>
            <div className="text-sm text-green-700 dark:text-green-300">Configured</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {settings?.activeProvider
                ? providers.find((p) => p.id === settings.activeProvider)?.displayName || 'None'
                : 'None'}
            </div>
            <div className="text-sm text-blue-700 dark:text-blue-300">Active Provider</div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {settings?.fallbackEnabled ? 'On' : 'Off'}
            </div>
            <div className="text-sm text-purple-700 dark:text-purple-300">Auto-Fallback</div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start">
          <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error</h3>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Test Result */}
      {testResult && (
        <div
          className={`${
            testResult.success
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          } border rounded-lg p-4`}
        >
          <div className="flex items-start">
            {testResult.success ? (
              <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
            ) : (
              <X className="w-5 h-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <h3
                className={`text-sm font-medium ${
                  testResult.success
                    ? 'text-green-800 dark:text-green-200'
                    : 'text-red-800 dark:text-red-200'
                }`}
              >
                {testResult.success ? 'Test Successful' : 'Test Failed'}
              </h3>
              {testResult.success ? (
                <div className="mt-2 text-sm text-green-700 dark:text-green-300">
                  <p className="font-medium">Response ({testResult.responseTimeMs}ms):</p>
                  <p className="mt-1 italic">&quot;{testResult.response}&quot;</p>
                  <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                    Model: {testResult.model}
                  </p>
                </div>
              ) : (
                <p className="mt-1 text-sm text-red-700 dark:text-red-300">{testResult.error}</p>
              )}
            </div>
            <button
              onClick={() => setTestResult(null)}
              className={`ml-3 ${
                testResult.success
                  ? 'text-green-500 hover:text-green-700'
                  : 'text-red-500 hover:text-red-700'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Configured Providers */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
            <Check className="w-5 h-5 text-green-500 mr-2" />
            Configured Providers ({configuredProviders.length})
          </h3>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {configuredProviders.map((provider) => (
            <div key={provider.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div
                    className={`p-2 rounded-lg ${PROVIDER_COLORS[provider.id]} bg-opacity-20 dark:bg-opacity-30`}
                  >
                    {PROVIDER_ICONS[provider.id]}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {provider.displayName}
                      </h4>
                      {provider.isActive && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Default: {provider.defaultModel}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleTestProvider(provider.id)}
                    disabled={testing === provider.id}
                    className="flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors disabled:opacity-50"
                  >
                    {testing === provider.id ? (
                      <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4 mr-1" />
                    )}
                    Test
                  </button>

                  {!provider.isActive && (
                    <button
                      onClick={() => handleSetActiveProvider(provider.id)}
                      disabled={saving}
                      className="flex items-center px-3 py-1.5 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                    >
                      <Zap className="w-4 h-4 mr-1" />
                      Set Active
                    </button>
                  )}

                  <button
                    onClick={() =>
                      setExpandedProvider(expandedProvider === provider.id ? null : provider.id)
                    }
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {expandedProvider === provider.id ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedProvider === provider.id && (
                <div className="mt-4 pl-14 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Available Models
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {provider.models.map((model) => (
                          <span
                            key={model}
                            className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                          >
                            {model}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Capabilities
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {provider.capabilities.map((cap) => (
                          <span
                            key={cap}
                            className="px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded"
                          >
                            {cap.replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6 text-sm">
                    <div className="flex items-center text-gray-600 dark:text-gray-400">
                      <DollarSign className="w-4 h-4 mr-1" />
                      Input: ${provider.costPer1kTokens.input}/1k tokens
                    </div>
                    <div className="flex items-center text-gray-600 dark:text-gray-400">
                      <DollarSign className="w-4 h-4 mr-1" />
                      Output: ${provider.costPer1kTokens.output}/1k tokens
                    </div>
                    <div className="flex items-center text-gray-600 dark:text-gray-400">
                      <Cpu className="w-4 h-4 mr-1" />
                      Max: {provider.maxTokens.toLocaleString()} tokens
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {configuredProviders.length === 0 && (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <AlertCircle className="w-8 h-8 mx-auto mb-2" />
              <p>No providers configured. Add API keys to your environment variables.</p>
            </div>
          )}
        </div>
      </div>

      {/* Unconfigured Providers */}
      {unconfiguredProviders.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
              <X className="w-5 h-5 text-gray-400 mr-2" />
              Available Providers ({unconfiguredProviders.length})
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Add the API key to your environment variables to enable these providers.
            </p>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {unconfiguredProviders.map((provider) => (
              <div key={provider.id} className="p-4 opacity-60">
                <div className="flex items-center space-x-4">
                  <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
                    {PROVIDER_ICONS[provider.id]}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-700 dark:text-gray-300">
                      {provider.displayName}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Set{' '}
                      <code className="px-1 bg-gray-200 dark:bg-gray-600 rounded">
                        {provider.id.toUpperCase()}_API_KEY
                      </code>{' '}
                      or{' '}
                      <code className="px-1 bg-gray-200 dark:bg-gray-600 rounded">
                        {provider.id === 'claude'
                          ? 'ANTHROPIC_API_KEY'
                          : provider.id === 'openai'
                          ? 'OPENAI_API_KEY'
                          : provider.id === 'grok'
                          ? 'GROK_API_KEY'
                          : provider.id === 'gemini'
                          ? 'GEMINI_API_KEY'
                          : provider.id === 'perplexity'
                          ? 'PERPLEXITY_API_KEY'
                          : 'ABACUSAI_API_KEY'}
                      </code>
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Route Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
              <Settings className="w-5 h-5 text-gray-400 mr-2" />
              Route Configuration
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Assign specific providers to different tasks
            </p>
          </div>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            {showAdvanced ? 'Hide' : 'Show'} Advanced
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Topic Research */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center space-x-3">
              <Search className="w-5 h-5 text-purple-500" />
              <div>
                <div className="font-medium text-gray-900 dark:text-white">Topic Research</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Discover new content topics
                </div>
              </div>
            </div>
            <select
              value={settings?.routeSettings?.topicResearch || 'perplexity'}
              onChange={(e) => handleUpdateRouteSetting('topicResearch', e.target.value)}
              disabled={saving}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {configuredProviders.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.displayName}
                </option>
              ))}
            </select>
          </div>

          {/* Content Generation */}
          <div className="flex items-center justify-between py-2 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <FileText className="w-5 h-5 text-blue-500" />
              <div>
                <div className="font-medium text-gray-900 dark:text-white">Content Generation</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Create articles and guides
                </div>
              </div>
            </div>
            <select
              value={settings?.routeSettings?.contentGeneration || settings?.activeProvider}
              onChange={(e) => handleUpdateRouteSetting('contentGeneration', e.target.value)}
              disabled={saving}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {configuredProviders.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.displayName}
                </option>
              ))}
            </select>
          </div>

          {/* SEO Audit */}
          <div className="flex items-center justify-between py-2 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <BarChart3 className="w-5 h-5 text-green-500" />
              <div>
                <div className="font-medium text-gray-900 dark:text-white">SEO Audit</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Analyze and optimize content
                </div>
              </div>
            </div>
            <select
              value={settings?.routeSettings?.seoAudit || settings?.activeProvider}
              onChange={(e) => handleUpdateRouteSetting('seoAudit', e.target.value)}
              disabled={saving}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {configuredProviders.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.displayName}
                </option>
              ))}
            </select>
          </div>

          {/* Advanced Settings */}
          {showAdvanced && (
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
              {/* Fallback Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">Auto-Fallback</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Automatically try other providers if the primary fails
                  </div>
                </div>
                <button
                  onClick={handleToggleFallback}
                  disabled={saving}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings?.fallbackEnabled ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings?.fallbackEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Fallback Order */}
              {settings?.fallbackEnabled && (
                <div>
                  <div className="font-medium text-gray-900 dark:text-white mb-2">
                    Fallback Order
                  </div>
                  <div className="space-y-2">
                    {settings.fallbackOrder
                      .filter((id) => configuredProviders.some((p) => p.id === id))
                      .map((providerId, index) => {
                        const provider = configuredProviders.find((p) => p.id === providerId);
                        if (!provider) return null;
                        return (
                          <div
                            key={providerId}
                            className="flex items-center space-x-3 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg"
                          >
                            <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400 w-6">
                              {index + 1}.
                            </span>
                            <div className={`p-1 rounded ${PROVIDER_COLORS[providerId]} bg-opacity-20`}>
                              {PROVIDER_ICONS[providerId]}
                            </div>
                            <span className="text-gray-900 dark:text-white">
                              {provider.displayName}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Environment Variables Reference */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Environment Variables Reference
        </h4>
        <div className="grid grid-cols-2 gap-2 text-sm font-mono">
          <div className="text-gray-600 dark:text-gray-400">ANTHROPIC_API_KEY</div>
          <div className="text-gray-500">Claude (Anthropic)</div>
          <div className="text-gray-600 dark:text-gray-400">OPENAI_API_KEY</div>
          <div className="text-gray-500">GPT (OpenAI)</div>
          <div className="text-gray-600 dark:text-gray-400">GROK_API_KEY</div>
          <div className="text-gray-500">Grok (xAI)</div>
          <div className="text-gray-600 dark:text-gray-400">GEMINI_API_KEY</div>
          <div className="text-gray-500">Gemini (Google)</div>
          <div className="text-gray-600 dark:text-gray-400">PERPLEXITY_API_KEY</div>
          <div className="text-gray-500">Perplexity AI</div>
          <div className="text-gray-600 dark:text-gray-400">ABACUSAI_API_KEY</div>
          <div className="text-gray-500">Abacus.AI</div>
        </div>
      </div>
    </div>
  );
}
