'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Bot,
  Settings,
  Play,
  Save,
  RefreshCw,
  Copy,
  Eye,
  Zap,
  Brain,
  FileText,
  Search,
  BookOpen,
  Target,
  Sliders,
  TestTube,
  Plus,
  Edit
} from 'lucide-react'
import { toast } from 'sonner'

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
      successRate: 95
    },
    {
      id: '2',
      name: 'Article Writing - Professional',
      type: 'article_writing',
      prompt: 'Write a comprehensive, engaging article about {topic} for Yalla London. Requirements: 1) 1500-2000 words, 2) SEO-optimized with natural keyword integration, 3) Include practical tips and actionable advice, 4) Use a friendly, professional tone, 5) Include relevant subheadings (H2, H3), 6) End with a compelling call-to-action, 7) Include local London references and insights. Structure: Introduction, Main content with subheadings, Conclusion with CTA.',
      model: 'claude-3',
      temperature: 0.6,
      maxTokens: 2000,
      isActive: true,
      lastUsed: '2024-01-15 13:45:00',
      successRate: 92
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
      successRate: 89
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
      successRate: 94
    }
  ])

  const [selectedPrompt, setSelectedPrompt] = useState<AIPrompt | null>(null)
  const [testResults, setTestResults] = useState<PromptTest[]>([])
  const [isTesting, setIsTesting] = useState(false)
  const [testInput, setTestInput] = useState('')
  const [testOutput, setTestOutput] = useState('')

  const availableModels = [
    { value: 'gpt-4', label: 'GPT-4 (OpenAI)', description: 'Most capable, best for complex tasks' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (OpenAI)', description: 'Fast and cost-effective' },
    { value: 'claude-3', label: 'Claude-3 (Anthropic)', description: 'Excellent for writing and analysis' },
    { value: 'claude-3-sonnet', label: 'Claude-3 Sonnet (Anthropic)', description: 'Balanced performance and speed' },
    { value: 'gemini-pro', label: 'Gemini Pro (Google)', description: 'Good for diverse content types' }
  ]

  const promptTypes = [
    { value: 'topic_generation', label: 'Topic Generation', icon: Target },
    { value: 'article_writing', label: 'Article Writing', icon: FileText },
    { value: 'seo_audit', label: 'SEO Audit', icon: Search },
    { value: 'article_reader', label: 'Article Reader', icon: BookOpen }
  ]

  const savePrompt = async (prompt: AIPrompt) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setPrompts(prev => prev.map(p => p.id === prompt.id ? prompt : p))
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
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Simulate different outputs based on prompt type
      let output = ''
      switch (prompt.type) {
        case 'topic_generation':
          output = JSON.stringify([
            { title: 'Best Rooftop Bars in London', description: 'Discover London\'s most stunning rooftop bars with panoramic city views', keywords: ['rooftop bars', 'london', 'city views', 'drinks'], audience: 'adults, tourists' },
            { title: 'Hidden Food Markets in London', description: 'Explore London\'s secret food markets loved by locals', keywords: ['food markets', 'london', 'local food', 'hidden gems'], audience: 'food lovers, locals' }
          ], null, 2)
          break
        case 'article_writing':
          output = `# ${input}\n\nLondon is a city that never fails to amaze visitors and locals alike. In this comprehensive guide, we'll explore everything you need to know about ${input.toLowerCase()}.\n\n## Why This Matters\n\nUnderstanding ${input.toLowerCase()} is crucial for anyone looking to make the most of their time in London...\n\n## Key Points to Consider\n\n1. **Location and Accessibility**\n2. **Best Times to Visit**\n3. **What to Expect**\n4. **Tips for Success**\n\n## Conclusion\n\n${input} offers an incredible experience that shouldn't be missed. Whether you're a first-time visitor or a seasoned Londoner, there's always something new to discover.\n\nReady to explore? Check out our other London guides for more amazing experiences!`
          break
        case 'seo_audit':
          output = `## SEO Audit Results for: ${input}\n\n**Overall Score: 8.5/10**\n\n### Title Tag: 9/10\n- Length: Optimal (45 characters)\n- Keywords: Well integrated\n- Appeal: Strong call-to-action\n\n### Meta Description: 8/10\n- Length: Good (145 characters)\n- Keywords: Present\n- Call-to-action: Could be stronger\n\n### Header Structure: 9/10\n- H1: Present and optimized\n- H2/H3: Well organized hierarchy\n- Keywords: Naturally integrated\n\n### Recommendations:\n1. Add more internal links\n2. Include more local keywords\n3. Optimize image alt tags`
          break
        case 'article_reader':
          output = JSON.stringify({
            mainTopic: input,
            keyThemes: ['london', 'travel', 'experience'],
            primaryKeywords: ['london', 'guide', 'travel'],
            targetAudience: 'tourists, travel enthusiasts',
            contentQuality: 8,
            seoPotential: 'high',
            suggestedTags: ['london', 'travel', 'guide'],
            relatedTopics: ['london attractions', 'london food', 'london culture'],
            socialMediaPotential: 'high'
          }, null, 2)
          break
      }

      const testResult: PromptTest = {
        id: Date.now().toString(),
        prompt: prompt.prompt,
        input,
        output,
        timestamp: new Date().toISOString(),
        success: true
      }

      setTestResults(prev => [testResult, ...prev])
      setTestOutput(output)
      toast.success('Prompt test completed!')
    } catch (error) {
      toast.error('Prompt test failed')
    } finally {
      setIsTesting(false)
    }
  }

  const getPromptTypeIcon = (type: string) => {
    const promptType = promptTypes.find(pt => pt.value === type)
    if (promptType) {
      const Icon = promptType.icon
      return <Icon className="h-4 w-4" />
    }
    return <Bot className="h-4 w-4" />
  }

  const getPromptTypeLabel = (type: string) => {
    const promptType = promptTypes.find(pt => pt.value === type)
    return promptType?.label || type
  }

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600'
    if (rate >= 80) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Bot className="h-8 w-8 text-purple-500" />
                AI Prompt Studio
              </h1>
              <p className="text-gray-600 mt-1">Control AI prompts, models, and automation</p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button className="bg-purple-500 hover:bg-purple-600">
                <Plus className="h-4 w-4 mr-2" />
                New Prompt
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <Tabs defaultValue="prompts" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="prompts">AI Prompts</TabsTrigger>
            <TabsTrigger value="test">Test & Preview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* AI Prompts Tab */}
          <TabsContent value="prompts" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Prompts List */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Active Prompts</h3>
                {prompts.map((prompt) => (
                  <Card 
                    key={prompt.id} 
                    className={`cursor-pointer transition-all ${
                      selectedPrompt?.id === prompt.id ? 'ring-2 ring-purple-500' : 'hover:shadow-md'
                    }`}
                    onClick={() => setSelectedPrompt(prompt)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getPromptTypeIcon(prompt.type)}
                            <span className="text-sm text-gray-600">
                              {getPromptTypeLabel(prompt.type)}
                            </span>
                            {prompt.isActive && (
                              <Badge className="bg-green-500 text-xs">Active</Badge>
                            )}
                          </div>
                          <h4 className="font-medium text-gray-900 mb-2">{prompt.name}</h4>
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                            {prompt.prompt.substring(0, 100)}...
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>Model: {prompt.model}</span>
                            <span>Temp: {prompt.temperature}</span>
                            <span className={getSuccessRateColor(prompt.successRate)}>
                              Success: {prompt.successRate}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Prompt Editor */}
              <div>
                {selectedPrompt ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Edit className="h-5 w-5" />
                        Edit Prompt
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="prompt-name">Prompt Name</Label>
                        <Input
                          id="prompt-name"
                          value={selectedPrompt.name}
                          onChange={(e) => setSelectedPrompt({
                            ...selectedPrompt,
                            name: e.target.value
                          })}
                        />
                      </div>

                      <div>
                        <Label htmlFor="prompt-type">Type</Label>
                        <Select
                          value={selectedPrompt.type}
                          onValueChange={(value: any) => setSelectedPrompt({
                            ...selectedPrompt,
                            type: value
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {promptTypes.map((type) => {
                              const Icon = type.icon
                              return (
                                <SelectItem key={type.value} value={type.value}>
                                  <div className="flex items-center gap-2">
                                    <Icon className="h-4 w-4" />
                                    {type.label}
                                  </div>
                                </SelectItem>
                              )
                            })}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="prompt-model">AI Model</Label>
                        <Select
                          value={selectedPrompt.model}
                          onValueChange={(value) => setSelectedPrompt({
                            ...selectedPrompt,
                            model: value
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {availableModels.map((model) => (
                              <SelectItem key={model.value} value={model.value}>
                                <div>
                                  <div className="font-medium">{model.label}</div>
                                  <div className="text-xs text-gray-500">{model.description}</div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="temperature">Temperature</Label>
                          <Input
                            id="temperature"
                            type="number"
                            min="0"
                            max="1"
                            step="0.1"
                            value={selectedPrompt.temperature}
                            onChange={(e) => setSelectedPrompt({
                              ...selectedPrompt,
                              temperature: parseFloat(e.target.value)
                            })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="max-tokens">Max Tokens</Label>
                          <Input
                            id="max-tokens"
                            type="number"
                            value={selectedPrompt.maxTokens}
                            onChange={(e) => setSelectedPrompt({
                              ...selectedPrompt,
                              maxTokens: parseInt(e.target.value)
                            })}
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="prompt-text">Prompt Text</Label>
                        <Textarea
                          id="prompt-text"
                          rows={8}
                          value={selectedPrompt.prompt}
                          onChange={(e) => setSelectedPrompt({
                            ...selectedPrompt,
                            prompt: e.target.value
                          })}
                          placeholder="Enter your AI prompt here..."
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => savePrompt(selectedPrompt)}
                          className="bg-purple-500 hover:bg-purple-600"
                        >
                          <Save className="h-4 w-4 mr-2" />
                          Save Prompt
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => testPrompt(selectedPrompt, testInput)}
                          disabled={isTesting}
                        >
                          <TestTube className="h-4 w-4 mr-2" />
                          {isTesting ? 'Testing...' : 'Test Prompt'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Prompt</h3>
                      <p className="text-gray-600">Choose a prompt from the list to edit and configure</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Test & Preview Tab */}
          <TabsContent value="test" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TestTube className="h-5 w-5" />
                    Test Input
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="test-input">Test Input</Label>
                    <Textarea
                      id="test-input"
                      rows={6}
                      value={testInput}
                      onChange={(e) => setTestInput(e.target.value)}
                      placeholder="Enter test input for your prompt..."
                    />
                  </div>
                  <Button
                    onClick={() => selectedPrompt && testPrompt(selectedPrompt, testInput)}
                    disabled={!selectedPrompt || isTesting || !testInput.trim()}
                    className="w-full bg-purple-500 hover:bg-purple-600"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {isTesting ? 'Testing...' : 'Run Test'}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Test Output
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {testOutput ? (
                    <div className="space-y-4">
                      <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-auto max-h-96">
                        {testOutput}
                      </pre>
                      <Button
                        variant="outline"
                        onClick={() => navigator.clipboard.writeText(testOutput)}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Output
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <TestTube className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600">Run a test to see the output here</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Test History */}
            {testResults.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Test History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {testResults.slice(0, 5).map((result) => (
                      <div key={result.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge className={result.success ? 'bg-green-500' : 'bg-red-500'}>
                              {result.success ? 'Success' : 'Failed'}
                            </Badge>
                            <span className="text-sm text-gray-600">
                              {new Date(result.timestamp).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          <strong>Input:</strong> {result.input.substring(0, 100)}...
                        </div>
                        <div className="text-sm text-gray-600">
                          <strong>Output:</strong> {result.output.substring(0, 200)}...
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <Zap className="h-8 w-8 text-purple-500" />
                    <div>
                      <div className="text-2xl font-bold">{prompts.length}</div>
                      <div className="text-sm text-gray-600">Active Prompts</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <Brain className="h-8 w-8 text-yellow-500" />
                    <div>
                      <div className="text-2xl font-bold">
                        {Math.round(prompts.reduce((sum, p) => sum + p.successRate, 0) / prompts.length)}%
                      </div>
                      <div className="text-sm text-gray-600">Average Success Rate</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <TestTube className="h-8 w-8 text-green-500" />
                    <div>
                      <div className="text-2xl font-bold">{testResults.length}</div>
                      <div className="text-sm text-gray-600">Tests Run</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Prompt Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {prompts.map((prompt) => (
                    <div key={prompt.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getPromptTypeIcon(prompt.type)}
                        <div>
                          <div className="font-medium">{prompt.name}</div>
                          <div className="text-sm text-gray-600">
                            {prompt.model} • Last used: {prompt.lastUsed}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className={`text-lg font-bold ${getSuccessRateColor(prompt.successRate)}`}>
                            {prompt.successRate}%
                          </div>
                          <div className="text-xs text-gray-500">Success Rate</div>
                        </div>
                        <Badge className={prompt.isActive ? 'bg-green-500' : 'bg-gray-500'}>
                          {prompt.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
