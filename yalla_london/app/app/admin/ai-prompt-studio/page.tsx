'use client'

import { useState } from 'react'
import {
  AdminCard,
  AdminPageHeader,
  AdminSectionLabel,
  AdminStatusBadge,
  AdminKPICard,
  AdminButton,
  AdminLoadingState,
  AdminEmptyState,
  AdminTabs,
} from '@/components/admin/admin-ui'
import {
  Bot,
  Play,
  Save,
  Copy,
  Eye,
  Zap,
  Brain,
  FileText,
  Search,
  BookOpen,
  Target,
  TestTube,
  Plus,
  Edit,
} from 'lucide-react'
import { toast } from 'sonner'
import { getSiteConfig, getDefaultSiteId } from '@/config/sites'

interface AIPrompt {
  id: string
  name: string
  type: 'topic_generation' | 'article_writing' | 'seo_audit' | 'article_reader'
  prompt: string
  model: string
  temperature: number
  maxTokens: number
  isActive: boolean
  lastUsed: string
  successRate: number
}

interface PromptTest {
  id: string
  prompt: string
  input: string
  output: string
  timestamp: string
  success: boolean
}

export default function AIPromptStudio() {
  // Detect site from cookie for multi-site support
  const _siteCfg = (() => {
    let sId = getDefaultSiteId()
    if (typeof document !== 'undefined') {
      const match = document.cookie.match(/(?:^|;\s*)siteId=([^;]*)/)
      if (match?.[1]) sId = match[1]
    }
    return getSiteConfig(sId)
  })()

  const [prompts, setPrompts] = useState<AIPrompt[]>([
    {
      id: '1',
      name: 'Topic Generation - London Focus',
      type: 'topic_generation',
      prompt: 'Generate 5 trending London topics for a travel blog. Focus on: 1) Current events and seasonal activities, 2) Hidden gems and local experiences, 3) Food and dining trends, 4) Cultural events and attractions, 5) Practical travel tips. Each topic should be engaging, SEO-friendly, and appeal to both tourists and locals. Format as JSON with title, description, keywords, and target audience.',
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 1000,
      isActive: true,
      lastUsed: '2024-01-15 14:30:00',
      successRate: 95,
    },
    {
      id: '2',
      name: 'Article Writing - Professional',
      type: 'article_writing',
      prompt: `Write a comprehensive, engaging article about {topic} for ${_siteCfg?.name || 'our site'}. Requirements: 1) 1500-2000 words, 2) SEO-optimized with natural keyword integration, 3) Include practical tips and actionable advice, 4) Use a friendly, professional tone, 5) Include relevant subheadings (H2, H3), 6) End with a compelling call-to-action, 7) Include local ${_siteCfg?.destination || ''} references and insights. Structure: Introduction, Main content with subheadings, Conclusion with CTA.`,
      model: 'claude-3',
      temperature: 0.6,
      maxTokens: 2000,
      isActive: true,
      lastUsed: '2024-01-15 13:45:00',
      successRate: 92,
    },
    {
      id: '3',
      name: 'SEO Audit - Comprehensive',
      type: 'seo_audit',
      prompt: 'Analyze the following content for SEO optimization: {content}. Provide a detailed audit covering: 1) Title tag optimization (length, keywords, appeal), 2) Meta description (length, keywords, call-to-action), 3) Header structure (H1, H2, H3 hierarchy), 4) Keyword density and placement, 5) Internal linking opportunities, 6) Image optimization suggestions, 7) Content length and quality, 8) Readability score. Rate each aspect 1-10 and provide specific improvement recommendations.',
      model: 'gpt-4',
      temperature: 0.3,
      maxTokens: 1500,
      isActive: true,
      lastUsed: '2024-01-15 12:20:00',
      successRate: 89,
    },
    {
      id: '4',
      name: 'Article Reader - Insight Extraction',
      type: 'article_reader',
      prompt: 'Analyze the following article and extract key insights: {content}. Provide: 1) Main topic and key themes, 2) Primary keywords and phrases, 3) Target audience analysis, 4) Content quality score (1-10), 5) SEO potential assessment, 6) Suggested tags and categories, 7) Related topic suggestions, 8) Social media sharing potential. Format as structured JSON for easy integration.',
      model: 'gpt-4',
      temperature: 0.4,
      maxTokens: 800,
      isActive: true,
      lastUsed: '2024-01-15 11:15:00',
      successRate: 94,
    },
  ])

  const [selectedPrompt, setSelectedPrompt] = useState<AIPrompt | null>(null)
  const [testResults, setTestResults] = useState<PromptTest[]>([])
  const [isTesting, setIsTesting] = useState(false)
  const [testInput, setTestInput] = useState('')
  const [testOutput, setTestOutput] = useState('')
  const [activeTab, setActiveTab] = useState('prompts')

  const availableModels = [
    { value: 'gpt-4', label: 'GPT-4 (OpenAI)', description: 'Most capable, best for complex tasks' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (OpenAI)', description: 'Fast and cost-effective' },
    { value: 'claude-3', label: 'Claude-3 (Anthropic)', description: 'Excellent for writing and analysis' },
    { value: 'claude-3-sonnet', label: 'Claude-3 Sonnet (Anthropic)', description: 'Balanced performance and speed' },
    { value: 'gemini-pro', label: 'Gemini Pro (Google)', description: 'Good for diverse content types' },
  ]

  const promptTypes = [
    { value: 'topic_generation', label: 'Topic Generation', icon: Target },
    { value: 'article_writing', label: 'Article Writing', icon: FileText },
    { value: 'seo_audit', label: 'SEO Audit', icon: Search },
    { value: 'article_reader', label: 'Article Reader', icon: BookOpen },
  ]

  const savePrompt = async (prompt: AIPrompt) => {
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500))

      setPrompts((prev) => prev.map((p) => (p.id === prompt.id ? prompt : p)))
      toast.success('Prompt saved successfully!')
    } catch (error) {
      toast.error('Failed to save prompt')
    }
  }

  const testPrompt = async (prompt: AIPrompt, input: string) => {
    if (!input.trim()) {
      toast.error('Please provide test input')
      return
    }

    setIsTesting(true)
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Simulate different outputs based on prompt type
      let output = ''
      switch (prompt.type) {
        case 'topic_generation':
          output = JSON.stringify(
            [
              {
                title: 'Best Rooftop Bars in London',
                description: "Discover London's most stunning rooftop bars with panoramic city views",
                keywords: ['rooftop bars', 'london', 'city views', 'drinks'],
                audience: 'adults, tourists',
              },
              {
                title: 'Hidden Food Markets in London',
                description: "Explore London's secret food markets loved by locals",
                keywords: ['food markets', 'london', 'local food', 'hidden gems'],
                audience: 'food lovers, locals',
              },
            ],
            null,
            2
          )
          break
        case 'article_writing':
          output = `# ${input}\n\nLondon is a city that never fails to amaze visitors and locals alike. In this comprehensive guide, we'll explore everything you need to know about ${input.toLowerCase()}.\n\n## Why This Matters\n\nUnderstanding ${input.toLowerCase()} is crucial for anyone looking to make the most of their time in London...\n\n## Key Points to Consider\n\n1. **Location and Accessibility**\n2. **Best Times to Visit**\n3. **What to Expect**\n4. **Tips for Success**\n\n## Conclusion\n\n${input} offers an incredible experience that shouldn't be missed. Whether you're a first-time visitor or a seasoned Londoner, there's always something new to discover.\n\nReady to explore? Check out our other London guides for more amazing experiences!`
          break
        case 'seo_audit':
          output = `## SEO Audit Results for: ${input}\n\n**Overall Score: 8.5/10**\n\n### Title Tag: 9/10\n- Length: Optimal (45 characters)\n- Keywords: Well integrated\n- Appeal: Strong call-to-action\n\n### Meta Description: 8/10\n- Length: Good (145 characters)\n- Keywords: Present\n- Call-to-action: Could be stronger\n\n### Header Structure: 9/10\n- H1: Present and optimized\n- H2/H3: Well organized hierarchy\n- Keywords: Naturally integrated\n\n### Recommendations:\n1. Add more internal links\n2. Include more local keywords\n3. Optimize image alt tags`
          break
        case 'article_reader':
          output = JSON.stringify(
            {
              mainTopic: input,
              keyThemes: ['london', 'travel', 'experience'],
              primaryKeywords: ['london', 'guide', 'travel'],
              targetAudience: 'tourists, travel enthusiasts',
              contentQuality: 8,
              seoPotential: 'high',
              suggestedTags: ['london', 'travel', 'guide'],
              relatedTopics: ['london attractions', 'london food', 'london culture'],
              socialMediaPotential: 'high',
            },
            null,
            2
          )
          break
      }

      const testResult: PromptTest = {
        id: Date.now().toString(),
        prompt: prompt.prompt,
        input,
        output,
        timestamp: new Date().toISOString(),
        success: true,
      }

      setTestResults((prev) => [testResult, ...prev])
      setTestOutput(output)
      toast.success('Prompt test completed!')
    } catch (error) {
      toast.error('Prompt test failed')
    } finally {
      setIsTesting(false)
    }
  }

  const getPromptTypeIcon = (type: string) => {
    const promptType = promptTypes.find((pt) => pt.value === type)
    if (promptType) {
      const Icon = promptType.icon
      return <Icon size={14} />
    }
    return <Bot size={14} />
  }

  const getPromptTypeLabel = (type: string) => {
    const promptType = promptTypes.find((pt) => pt.value === type)
    return promptType?.label || type
  }

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 90) return '#2D5A3D'
    if (rate >= 80) return '#C49A2A'
    return '#C8322B'
  }

  return (
    <div className="admin-page p-4 md:p-6">
      <AdminPageHeader
        title="AI Prompt Studio"
        subtitle="Control AI prompts, models, and automation"
        action={
          <AdminButton variant="primary" size="sm">
            <Plus size={14} />
            New Prompt
          </AdminButton>
        }
      />

      {/* Tabs */}
      <AdminTabs
        tabs={[
          { id: 'prompts', label: 'AI Prompts' },
          { id: 'test', label: 'Test & Preview' },
          { id: 'analytics', label: 'Analytics' },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className="mt-5">
        {/* AI Prompts Tab */}
        {activeTab === 'prompts' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Prompts List */}
            <div className="space-y-3">
              <AdminSectionLabel>Active Prompts</AdminSectionLabel>
              {prompts.map((prompt) => (
                <AdminCard
                  key={prompt.id}
                  className={`cursor-pointer transition-all ${
                    selectedPrompt?.id === prompt.id
                      ? 'ring-2 ring-[#C8322B]'
                      : 'hover:shadow-md'
                  }`}
                >
                  <div onClick={() => setSelectedPrompt(prompt)} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span style={{ color: '#78716C' }}>{getPromptTypeIcon(prompt.type)}</span>
                          <span
                            style={{
                              fontFamily: 'var(--font-system)',
                              fontSize: 10,
                              color: '#78716C',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                            }}
                          >
                            {getPromptTypeLabel(prompt.type)}
                          </span>
                          {prompt.isActive && <AdminStatusBadge status="active" />}
                        </div>
                        <h4
                          style={{
                            fontFamily: 'var(--font-display)',
                            fontWeight: 700,
                            fontSize: 14,
                            color: '#1C1917',
                            marginBottom: 6,
                          }}
                        >
                          {prompt.name}
                        </h4>
                        <p
                          style={{
                            fontFamily: 'var(--font-system)',
                            fontSize: 11,
                            color: '#78716C',
                            lineHeight: 1.5,
                          }}
                          className="line-clamp-2"
                        >
                          {prompt.prompt.substring(0, 100)}...
                        </p>
                        <div
                          className="flex items-center gap-4 mt-3"
                          style={{
                            fontFamily: 'var(--font-system)',
                            fontSize: 10,
                            color: '#A8A29E',
                          }}
                        >
                          <span>Model: {prompt.model}</span>
                          <span>Temp: {prompt.temperature}</span>
                          <span style={{ color: getSuccessRateColor(prompt.successRate), fontWeight: 600 }}>
                            Success: {prompt.successRate}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </AdminCard>
              ))}
            </div>

            {/* Prompt Editor */}
            <div>
              {selectedPrompt ? (
                <AdminCard accent accentColor="red">
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Edit size={16} color="#1C1917" />
                      <AdminSectionLabel>Edit Prompt</AdminSectionLabel>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label
                          className="admin-label"
                          style={{
                            fontFamily: 'var(--font-system)',
                            fontSize: 10,
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            color: '#78716C',
                            display: 'block',
                            marginBottom: 4,
                          }}
                        >
                          Prompt Name
                        </label>
                        <input
                          className="admin-input"
                          value={selectedPrompt.name}
                          onChange={(e) =>
                            setSelectedPrompt({
                              ...selectedPrompt,
                              name: e.target.value,
                            })
                          }
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: 8,
                            border: '1px solid rgba(214,208,196,0.8)',
                            fontFamily: 'var(--font-system)',
                            fontSize: 12,
                            backgroundColor: '#FFFFFF',
                            outline: 'none',
                          }}
                        />
                      </div>

                      <div>
                        <label
                          style={{
                            fontFamily: 'var(--font-system)',
                            fontSize: 10,
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            color: '#78716C',
                            display: 'block',
                            marginBottom: 4,
                          }}
                        >
                          Type
                        </label>
                        <select
                          className="admin-select"
                          value={selectedPrompt.type}
                          onChange={(e) =>
                            setSelectedPrompt({
                              ...selectedPrompt,
                              type: e.target.value as AIPrompt['type'],
                            })
                          }
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: 8,
                            border: '1px solid rgba(214,208,196,0.8)',
                            fontFamily: 'var(--font-system)',
                            fontSize: 12,
                            backgroundColor: '#FFFFFF',
                            outline: 'none',
                          }}
                        >
                          {promptTypes.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          style={{
                            fontFamily: 'var(--font-system)',
                            fontSize: 10,
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            color: '#78716C',
                            display: 'block',
                            marginBottom: 4,
                          }}
                        >
                          AI Model
                        </label>
                        <select
                          className="admin-select"
                          value={selectedPrompt.model}
                          onChange={(e) =>
                            setSelectedPrompt({
                              ...selectedPrompt,
                              model: e.target.value,
                            })
                          }
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: 8,
                            border: '1px solid rgba(214,208,196,0.8)',
                            fontFamily: 'var(--font-system)',
                            fontSize: 12,
                            backgroundColor: '#FFFFFF',
                            outline: 'none',
                          }}
                        >
                          {availableModels.map((model) => (
                            <option key={model.value} value={model.value}>
                              {model.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label
                            style={{
                              fontFamily: 'var(--font-system)',
                              fontSize: 10,
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              letterSpacing: '1px',
                              color: '#78716C',
                              display: 'block',
                              marginBottom: 4,
                            }}
                          >
                            Temperature
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="1"
                            step="0.1"
                            value={selectedPrompt.temperature}
                            onChange={(e) =>
                              setSelectedPrompt({
                                ...selectedPrompt,
                                temperature: parseFloat(e.target.value),
                              })
                            }
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              borderRadius: 8,
                              border: '1px solid rgba(214,208,196,0.8)',
                              fontFamily: 'var(--font-system)',
                              fontSize: 12,
                              backgroundColor: '#FFFFFF',
                              outline: 'none',
                            }}
                          />
                        </div>
                        <div>
                          <label
                            style={{
                              fontFamily: 'var(--font-system)',
                              fontSize: 10,
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              letterSpacing: '1px',
                              color: '#78716C',
                              display: 'block',
                              marginBottom: 4,
                            }}
                          >
                            Max Tokens
                          </label>
                          <input
                            type="number"
                            value={selectedPrompt.maxTokens}
                            onChange={(e) =>
                              setSelectedPrompt({
                                ...selectedPrompt,
                                maxTokens: parseInt(e.target.value),
                              })
                            }
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              borderRadius: 8,
                              border: '1px solid rgba(214,208,196,0.8)',
                              fontFamily: 'var(--font-system)',
                              fontSize: 12,
                              backgroundColor: '#FFFFFF',
                              outline: 'none',
                            }}
                          />
                        </div>
                      </div>

                      <div>
                        <label
                          style={{
                            fontFamily: 'var(--font-system)',
                            fontSize: 10,
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            color: '#78716C',
                            display: 'block',
                            marginBottom: 4,
                          }}
                        >
                          Prompt Text
                        </label>
                        <textarea
                          rows={8}
                          value={selectedPrompt.prompt}
                          onChange={(e) =>
                            setSelectedPrompt({
                              ...selectedPrompt,
                              prompt: e.target.value,
                            })
                          }
                          placeholder="Enter your AI prompt here..."
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: 8,
                            border: '1px solid rgba(214,208,196,0.8)',
                            fontFamily: 'var(--font-system)',
                            fontSize: 12,
                            backgroundColor: '#FFFFFF',
                            outline: 'none',
                            resize: 'vertical',
                          }}
                        />
                      </div>

                      <div className="flex gap-2">
                        <AdminButton variant="primary" onClick={() => savePrompt(selectedPrompt)}>
                          <Save size={12} />
                          Save Prompt
                        </AdminButton>
                        <AdminButton
                          variant="secondary"
                          onClick={() => testPrompt(selectedPrompt, testInput)}
                          loading={isTesting}
                        >
                          <TestTube size={12} />
                          Test Prompt
                        </AdminButton>
                      </div>
                    </div>
                  </div>
                </AdminCard>
              ) : (
                <AdminEmptyState
                  icon={Bot}
                  title="Select a Prompt"
                  description="Choose a prompt from the list to edit and configure"
                />
              )}
            </div>
          </div>
        )}

        {/* Test & Preview Tab */}
        {activeTab === 'test' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <AdminCard accent accentColor="blue">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TestTube size={16} color="#3B7EA1" />
                    <AdminSectionLabel>Test Input</AdminSectionLabel>
                  </div>
                  <textarea
                    rows={6}
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    placeholder="Enter test input for your prompt..."
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid rgba(214,208,196,0.8)',
                      fontFamily: 'var(--font-system)',
                      fontSize: 12,
                      backgroundColor: '#FFFFFF',
                      outline: 'none',
                      resize: 'vertical',
                      marginBottom: 12,
                    }}
                  />
                  <AdminButton
                    variant="primary"
                    className="w-full"
                    onClick={() => selectedPrompt && testPrompt(selectedPrompt, testInput)}
                    disabled={!selectedPrompt || !testInput.trim()}
                    loading={isTesting}
                  >
                    <Play size={12} />
                    Run Test
                  </AdminButton>
                </div>
              </AdminCard>

              <AdminCard accent accentColor="green">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Eye size={16} color="#2D5A3D" />
                    <AdminSectionLabel>Test Output</AdminSectionLabel>
                  </div>
                  {testOutput ? (
                    <div className="space-y-3">
                      <pre
                        style={{
                          backgroundColor: '#FAF8F4',
                          padding: 12,
                          borderRadius: 8,
                          fontFamily: 'var(--font-system)',
                          fontSize: 11,
                          overflow: 'auto',
                          maxHeight: 384,
                          border: '1px solid rgba(214,208,196,0.4)',
                          color: '#44403C',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                        }}
                      >
                        {testOutput}
                      </pre>
                      <AdminButton
                        variant="secondary"
                        size="sm"
                        onClick={() => navigator.clipboard.writeText(testOutput)}
                      >
                        <Copy size={12} />
                        Copy Output
                      </AdminButton>
                    </div>
                  ) : (
                    <AdminEmptyState
                      icon={TestTube}
                      title="No Output Yet"
                      description="Run a test to see the output here"
                    />
                  )}
                </div>
              </AdminCard>
            </div>

            {/* Test History */}
            {testResults.length > 0 && (
              <>
                <AdminSectionLabel>Test History</AdminSectionLabel>
                <AdminCard>
                  <div className="p-4 space-y-3">
                    {testResults.slice(0, 5).map((result) => (
                      <div
                        key={result.id}
                        style={{
                          border: '1px solid rgba(214,208,196,0.6)',
                          borderRadius: 10,
                          padding: 12,
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <AdminStatusBadge status={result.success ? 'success' : 'failed'} />
                            <span
                              style={{
                                fontFamily: 'var(--font-system)',
                                fontSize: 10,
                                color: '#A8A29E',
                              }}
                            >
                              {new Date(result.timestamp).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <p
                          style={{
                            fontFamily: 'var(--font-system)',
                            fontSize: 11,
                            color: '#78716C',
                            marginBottom: 4,
                          }}
                        >
                          <strong style={{ color: '#44403C' }}>Input:</strong>{' '}
                          {result.input.substring(0, 100)}...
                        </p>
                        <p
                          style={{
                            fontFamily: 'var(--font-system)',
                            fontSize: 11,
                            color: '#78716C',
                          }}
                        >
                          <strong style={{ color: '#44403C' }}>Output:</strong>{' '}
                          {result.output.substring(0, 200)}...
                        </p>
                      </div>
                    ))}
                  </div>
                </AdminCard>
              </>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <AdminKPICard
                value={prompts.length}
                label="Active Prompts"
                color="#3B7EA1"
              />
              <AdminKPICard
                value={`${Math.round(
                  prompts.reduce((sum, p) => sum + p.successRate, 0) / prompts.length
                )}%`}
                label="Avg Success Rate"
                color="#C49A2A"
              />
              <AdminKPICard
                value={testResults.length}
                label="Tests Run"
                color="#2D5A3D"
              />
            </div>

            <AdminSectionLabel>Prompt Performance</AdminSectionLabel>
            <AdminCard>
              <div className="p-4 space-y-3">
                {prompts.map((prompt) => (
                  <div
                    key={prompt.id}
                    className="flex items-center justify-between"
                    style={{
                      padding: 12,
                      border: '1px solid rgba(214,208,196,0.6)',
                      borderRadius: 10,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span style={{ color: '#78716C' }}>{getPromptTypeIcon(prompt.type)}</span>
                      <div>
                        <div
                          style={{
                            fontFamily: 'var(--font-display)',
                            fontWeight: 700,
                            fontSize: 13,
                            color: '#1C1917',
                          }}
                        >
                          {prompt.name}
                        </div>
                        <div
                          style={{
                            fontFamily: 'var(--font-system)',
                            fontSize: 10,
                            color: '#A8A29E',
                            marginTop: 2,
                          }}
                        >
                          {prompt.model} -- Last used: {prompt.lastUsed}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div
                          style={{
                            fontFamily: 'var(--font-display)',
                            fontWeight: 800,
                            fontSize: 18,
                            color: getSuccessRateColor(prompt.successRate),
                          }}
                        >
                          {prompt.successRate}%
                        </div>
                        <div
                          style={{
                            fontFamily: 'var(--font-system)',
                            fontSize: 9,
                            color: '#A8A29E',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                          }}
                        >
                          Success Rate
                        </div>
                      </div>
                      <AdminStatusBadge status={prompt.isActive ? 'active' : 'inactive'} />
                    </div>
                  </div>
                ))}
              </div>
            </AdminCard>
          </div>
        )}
      </div>
    </div>
  )
}
