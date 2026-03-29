'use client'

import React, { useState, useEffect } from 'react'
import {
  AdminCard,
  AdminPageHeader,
  AdminButton,
  AdminStatusBadge,
  AdminSectionLabel,
  AdminLoadingState,
  AdminEmptyState,
  AdminAlertBanner,
  AdminTabs,
} from '@/components/admin/admin-ui'
import {
  Brain,
  Plus,
  Edit,
  Save,
  History,
  Play,
  Copy,
  Languages,
  FileText,
  Zap,
  Settings,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  RotateCcw
} from 'lucide-react'

interface PromptTemplate {
  id: string
  name: string
  description: string
  category: 'content' | 'seo' | 'social' | 'email' | 'translation'
  language: 'en' | 'ar' | 'both'
  contentType: string[]
  prompt: string
  variables: string[]
  version: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  lastUsed?: string
  usageCount: number
}

interface PromptVersion {
  id: string
  promptId: string
  version: number
  prompt: string
  createdAt: string
  createdBy: string
  changeNote: string
}

// Version history placeholder - will be fetched from API in future
const mockVersions: { [key: string]: PromptVersion[] } = {}

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<PromptTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPrompt, setSelectedPrompt] = useState<PromptTemplate | null>(null)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [editedPrompt, setEditedPrompt] = useState<Partial<PromptTemplate>>({})
  const [testVariables, setTestVariables] = useState<{ [key: string]: string }>({})
  const [testResult, setTestResult] = useState('')
  const [isTesting, setIsTesting] = useState(false)

  // Fetch prompts from API
  useEffect(() => {
    const fetchPrompts = async () => {
      try {
        const response = await fetch('/api/admin/prompts')
        if (!response.ok) {
          console.warn('[prompts] Fetch failed:', response.status);
          return;
        }
        const data = await response.json()

        if (data.success && data.templates) {
          // Transform API templates to match interface
          const transformedPrompts = data.templates.map((t: any) => ({
            id: t.id,
            name: t.name,
            description: t.description || '',
            category: t.category || 'content',
            language: t.locale || 'en',
            contentType: t.requiredBlocks || [],
            prompt: t.template || '',
            variables: t.variables || [],
            version: 1,
            isActive: t.isActive !== false,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
            usageCount: 0
          }))
          setPrompts(transformedPrompts)
        }
      } catch (err) {
        console.error('Failed to fetch prompts:', err)
        setError('Failed to load prompt templates. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchPrompts()
  }, [])

  const categoryStatusMap: Record<string, string> = {
    content: 'active',
    seo: 'indexed',
    social: 'running',
    email: 'pending',
    translation: 'promoting',
  }

  const languageLabels = {
    'en': 'English',
    'ar': 'Arabic',
    'both': 'Both'
  }

  const filteredPrompts = selectedCategory === 'all'
    ? prompts
    : prompts.filter(prompt => prompt.category === selectedCategory)

  const handleEditPrompt = (prompt: PromptTemplate) => {
    setSelectedPrompt(prompt)
    setEditedPrompt({ ...prompt })
    setIsEditing(true)
  }

  const handleSavePrompt = () => {
    if (selectedPrompt && editedPrompt) {
      const updatedPrompt = {
        ...selectedPrompt,
        ...editedPrompt,
        version: selectedPrompt.version + 1,
        updatedAt: new Date().toISOString()
      }

      setPrompts(prev => prev.map(p =>
        p.id === selectedPrompt.id ? updatedPrompt : p
      ))
      setSelectedPrompt(updatedPrompt)
      setIsEditing(false)
    }
  }

  const handleCreatePrompt = async () => {
    try {
      const response = await fetch('/api/admin/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editedPrompt.name || '',
          description: editedPrompt.description || '',
          category: editedPrompt.category || 'blog',
          locale: editedPrompt.language || 'en',
          template: editedPrompt.prompt || '',
          variables: extractVariables(editedPrompt.prompt || ''),
          targetWordCount: 1500,
          tone: 'professional',
          isActive: true
        })
      })

      if (!response.ok) {
        console.warn('[prompts] Create failed:', response.status);
        return;
      }
      const data = await response.json()

      if (data.success && data.template) {
        // Add new prompt to the list
        const newPrompt: PromptTemplate = {
          id: data.template.id,
          name: editedPrompt.name || '',
          description: editedPrompt.description || '',
          category: editedPrompt.category || 'content',
          language: editedPrompt.language || 'en',
          contentType: editedPrompt.contentType || [],
          prompt: editedPrompt.prompt || '',
          variables: extractVariables(editedPrompt.prompt || ''),
          version: 1,
          isActive: true,
          createdAt: data.template.createdAt || new Date().toISOString(),
          updatedAt: data.template.createdAt || new Date().toISOString(),
          usageCount: 0
        }

        setPrompts(prev => [newPrompt, ...prev])
      }
    } catch (err) {
      console.error('Failed to create prompt:', err)
    }

    setEditedPrompt({})
    setIsCreating(false)
  }

  const extractVariables = (prompt: string): string[] => {
    const matches = prompt.match(/\{\{(\w+)\}\}/g)
    return matches ? matches.map(match => match.slice(2, -2)) : []
  }

  const handleTestPrompt = () => {
    if (!selectedPrompt) return

    setIsTesting(true)
    let result = selectedPrompt.prompt

    // Replace variables with test values
    selectedPrompt.variables.forEach(variable => {
      const value = testVariables[variable] || `[${variable}]`
      result = result.replace(new RegExp(`\\{\\{${variable}\\}\\}`, 'g'), value)
    })

    // Simulate API delay
    setTimeout(() => {
      setTestResult(result)
      setIsTesting(false)
    }, 1000)
  }

  const handleCopyPrompt = () => {
    if (selectedPrompt) {
      navigator.clipboard.writeText(selectedPrompt.prompt)
    }
  }

  const handleDeletePrompt = async (promptId: string) => {
    try {
      const response = await fetch(`/api/admin/prompts/${promptId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        setPrompts(prev => prev.filter(p => p.id !== promptId))
        if (selectedPrompt?.id === promptId) {
          setSelectedPrompt(null)
        }
      } else if (data.error) {
        alert(data.error) // Show error for system templates
      }
    } catch (err) {
      console.error('Failed to delete prompt:', err)
    }
  }

  const handleRevertVersion = (version: PromptVersion) => {
    if (selectedPrompt) {
      const revertedPrompt = {
        ...selectedPrompt,
        prompt: version.prompt,
        version: selectedPrompt.version + 1,
        updatedAt: new Date().toISOString()
      }

      setPrompts(prev => prev.map(p =>
        p.id === selectedPrompt.id ? revertedPrompt : p
      ))
      setSelectedPrompt(revertedPrompt)
      setShowVersionHistory(false)
    }
  }

  if (loading) {
    return (
      <div className="admin-page p-4 md:p-6">
        <AdminPageHeader
          title="Prompts Editor"
          subtitle="Manage AI prompt templates for content generation"
        />
        <AdminLoadingState label="Loading prompts..." />
      </div>
    )
  }

  const categoryTabs = [
    { id: 'all', label: 'All', count: prompts.length },
    { id: 'content', label: 'Content', count: prompts.filter(p => p.category === 'content').length },
    { id: 'seo', label: 'SEO', count: prompts.filter(p => p.category === 'seo').length },
    { id: 'social', label: 'Social', count: prompts.filter(p => p.category === 'social').length },
    { id: 'email', label: 'Email', count: prompts.filter(p => p.category === 'email').length },
    { id: 'translation', label: 'Translation', count: prompts.filter(p => p.category === 'translation').length },
  ]

  return (
    <div className="admin-page p-4 md:p-6">
      <AdminPageHeader
        title="Prompts Editor"
        subtitle="Manage AI prompt templates for content generation"
        action={
          <AdminButton variant="primary" onClick={() => setIsCreating(true)}>
            <Plus size={14} />
            New Prompt
          </AdminButton>
        }
      />

      {error && (
        <AdminAlertBanner
          severity="critical"
          message={error}
          onDismiss={() => setError(null)}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Prompts List */}
        <div className="lg:col-span-1">
          <AdminCard>
            <div className="p-4 pb-3">
              <div className="flex items-center gap-2 mb-3">
                <Brain size={16} color="#3B7EA1" />
                <AdminSectionLabel>Prompt Templates</AdminSectionLabel>
              </div>
              <AdminTabs
                tabs={categoryTabs}
                activeTab={selectedCategory}
                onTabChange={setSelectedCategory}
              />
            </div>

            <div className="border-t border-stone-100">
              {filteredPrompts.length === 0 ? (
                <AdminEmptyState
                  icon={Brain}
                  title="No prompts found"
                  description="Create a new prompt template to get started."
                  action={
                    <AdminButton variant="primary" size="sm" onClick={() => setIsCreating(true)}>
                      <Plus size={12} />
                      Create Prompt
                    </AdminButton>
                  }
                />
              ) : (
                <div>
                  {filteredPrompts.map((prompt) => (
                    <div
                      key={prompt.id}
                      className="p-3 cursor-pointer transition-colors hover:bg-stone-50"
                      style={{
                        borderLeft: selectedPrompt?.id === prompt.id
                          ? '3px solid #C8322B'
                          : '3px solid transparent',
                        backgroundColor: selectedPrompt?.id === prompt.id
                          ? 'rgba(200,50,43,0.04)'
                          : undefined,
                      }}
                      onClick={() => setSelectedPrompt(prompt)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p
                            style={{
                              fontFamily: 'var(--font-display)',
                              fontWeight: 700,
                              fontSize: 13,
                              color: '#1C1917',
                            }}
                            className="truncate"
                          >
                            {prompt.name}
                          </p>
                          <p
                            style={{
                              fontFamily: 'var(--font-system)',
                              fontSize: 11,
                              color: '#78716C',
                              marginTop: 2,
                            }}
                            className="line-clamp-2"
                          >
                            {prompt.description}
                          </p>
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            <AdminStatusBadge
                              status={categoryStatusMap[prompt.category] || 'pending'}
                              label={prompt.category}
                            />
                            <AdminStatusBadge
                              status="inactive"
                              label={languageLabels[prompt.language]}
                            />
                            <span
                              style={{
                                fontFamily: 'var(--font-system)',
                                fontSize: 9,
                                color: '#A8A29E',
                                letterSpacing: '0.5px',
                              }}
                            >
                              v{prompt.version}
                            </span>
                          </div>
                          <div
                            className="flex items-center gap-3 mt-2"
                            style={{
                              fontFamily: 'var(--font-system)',
                              fontSize: 10,
                              color: '#A8A29E',
                            }}
                          >
                            <span>Used {prompt.usageCount}x</span>
                            {prompt.lastUsed && (
                              <span>Last: {new Date(prompt.lastUsed).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 ml-2 flex-shrink-0">
                          <AdminButton
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              handleEditPrompt(prompt)
                            }}
                          >
                            <Edit size={12} />
                          </AdminButton>
                          <AdminButton
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              handleDeletePrompt(prompt.id)
                            }}
                          >
                            <Trash2 size={12} color="#C8322B" />
                          </AdminButton>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </AdminCard>
        </div>

        {/* Prompt Editor/Viewer */}
        <div className="lg:col-span-2">
          {selectedPrompt ? (
            <div className="space-y-4">
              {/* Prompt Details */}
              <AdminCard>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FileText size={16} color="#C49A2A" />
                      <p
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontWeight: 800,
                          fontSize: 16,
                          color: '#1C1917',
                        }}
                      >
                        {selectedPrompt.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <AdminButton variant="ghost" size="sm" onClick={() => setShowVersionHistory(true)}>
                        <History size={12} />
                        History
                      </AdminButton>
                      <AdminButton variant="ghost" size="sm" onClick={handleCopyPrompt}>
                        <Copy size={12} />
                        Copy
                      </AdminButton>
                      <AdminButton variant="secondary" size="sm" onClick={() => handleEditPrompt(selectedPrompt)}>
                        <Edit size={12} />
                        Edit
                      </AdminButton>
                    </div>
                  </div>
                  <p
                    style={{
                      fontFamily: 'var(--font-system)',
                      fontSize: 12,
                      color: '#78716C',
                      marginBottom: 16,
                    }}
                  >
                    {selectedPrompt.description}
                  </p>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="admin-card-inset p-3 rounded-lg">
                      <p
                        style={{
                          fontFamily: 'var(--font-system)',
                          fontSize: 9,
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                          color: '#A8A29E',
                          marginBottom: 4,
                        }}
                      >
                        Category
                      </p>
                      <AdminStatusBadge
                        status={categoryStatusMap[selectedPrompt.category] || 'pending'}
                        label={selectedPrompt.category}
                      />
                    </div>
                    <div className="admin-card-inset p-3 rounded-lg">
                      <p
                        style={{
                          fontFamily: 'var(--font-system)',
                          fontSize: 9,
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                          color: '#A8A29E',
                          marginBottom: 4,
                        }}
                      >
                        Language
                      </p>
                      <span
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: 13,
                          fontWeight: 700,
                          color: '#1C1917',
                        }}
                      >
                        {languageLabels[selectedPrompt.language]}
                      </span>
                    </div>
                    <div className="admin-card-inset p-3 rounded-lg">
                      <p
                        style={{
                          fontFamily: 'var(--font-system)',
                          fontSize: 9,
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                          color: '#A8A29E',
                          marginBottom: 4,
                        }}
                      >
                        Version
                      </p>
                      <span
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: 13,
                          fontWeight: 700,
                          color: '#1C1917',
                        }}
                      >
                        v{selectedPrompt.version}
                      </span>
                    </div>
                  </div>

                  {/* Content Types */}
                  {selectedPrompt.contentType.length > 0 && (
                    <div className="mb-4">
                      <AdminSectionLabel>Content Types</AdminSectionLabel>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedPrompt.contentType.map((type, index) => (
                          <AdminStatusBadge key={index} status="inactive" label={type} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Variables */}
                  {selectedPrompt.variables.length > 0 && (
                    <div className="mb-4">
                      <AdminSectionLabel>Variables</AdminSectionLabel>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedPrompt.variables.map((variable, index) => (
                          <code
                            key={index}
                            style={{
                              fontFamily: 'var(--font-system)',
                              fontSize: 10,
                              fontWeight: 600,
                              color: '#3B7EA1',
                              backgroundColor: 'rgba(59,126,161,0.08)',
                              padding: '3px 8px',
                              borderRadius: 6,
                              letterSpacing: '0.3px',
                            }}
                          >
                            {`{{${variable}}}`}
                          </code>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Prompt Content */}
                  <div>
                    <AdminSectionLabel>Prompt Template</AdminSectionLabel>
                    <div
                      className="admin-card-inset p-4 rounded-lg"
                      style={{ maxHeight: 400, overflowY: 'auto' }}
                    >
                      <pre
                        style={{
                          fontFamily: 'var(--font-system)',
                          fontSize: 12,
                          color: '#44403C',
                          whiteSpace: 'pre-wrap',
                          lineHeight: 1.6,
                          margin: 0,
                        }}
                      >
                        {selectedPrompt.prompt}
                      </pre>
                    </div>
                  </div>
                </div>
              </AdminCard>

              {/* Test Prompt */}
              <AdminCard accent accentColor="green">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Play size={16} color="#2D5A3D" />
                    <AdminSectionLabel>Test Prompt</AdminSectionLabel>
                  </div>

                  {selectedPrompt.variables.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                      {selectedPrompt.variables.map((variable) => (
                        <div key={variable}>
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
                            {variable}
                          </label>
                          <input
                            className="admin-input"
                            value={testVariables[variable] || ''}
                            onChange={(e) => setTestVariables(prev => ({
                              ...prev,
                              [variable]: e.target.value
                            }))}
                            placeholder={`Enter ${variable}...`}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <AdminButton
                    variant="success"
                    onClick={handleTestPrompt}
                    loading={isTesting}
                    disabled={isTesting}
                  >
                    <Play size={12} />
                    {isTesting ? 'Testing...' : 'Test Prompt'}
                  </AdminButton>

                  {testResult && (
                    <div className="mt-4">
                      <AdminSectionLabel>Result</AdminSectionLabel>
                      <div
                        className="p-4 rounded-lg"
                        style={{
                          backgroundColor: 'rgba(45,90,61,0.04)',
                          border: '1px solid rgba(45,90,61,0.15)',
                        }}
                      >
                        <pre
                          style={{
                            fontFamily: 'var(--font-system)',
                            fontSize: 12,
                            color: '#44403C',
                            whiteSpace: 'pre-wrap',
                            lineHeight: 1.6,
                            margin: 0,
                          }}
                        >
                          {testResult}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </AdminCard>
            </div>
          ) : (
            <AdminCard>
              <AdminEmptyState
                icon={Brain}
                title="Select a Prompt Template"
                description="Choose a prompt from the list to view, edit, or test it."
              />
            </AdminCard>
          )}
        </div>
      </div>

      {/* Edit/Create Modal */}
      {(isEditing || isCreating) && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ backgroundColor: 'rgba(28,25,23,0.5)' }}
        >
          <AdminCard elevated className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 md:p-6">
              <div className="flex items-center gap-2 mb-4">
                {isCreating ? <Plus size={16} color="#C8322B" /> : <Edit size={16} color="#C49A2A" />}
                <p
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 800,
                    fontSize: 18,
                    color: '#1C1917',
                  }}
                >
                  {isCreating ? 'Create New Prompt' : 'Edit Prompt'}
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        marginBottom: 6,
                      }}
                    >
                      Name
                    </label>
                    <input
                      className="admin-input"
                      value={editedPrompt.name || ''}
                      onChange={(e) => setEditedPrompt(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter prompt name..."
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
                        marginBottom: 6,
                      }}
                    >
                      Category
                    </label>
                    <select
                      className="admin-select"
                      value={editedPrompt.category || 'content'}
                      onChange={(e) => setEditedPrompt(prev => ({ ...prev, category: e.target.value as any }))}
                    >
                      <option value="content">Content</option>
                      <option value="seo">SEO</option>
                      <option value="social">Social Media</option>
                      <option value="email">Email</option>
                      <option value="translation">Translation</option>
                    </select>
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
                      marginBottom: 6,
                    }}
                  >
                    Description
                  </label>
                  <input
                    className="admin-input"
                    value={editedPrompt.description || ''}
                    onChange={(e) => setEditedPrompt(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of what this prompt does..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        marginBottom: 6,
                      }}
                    >
                      Language
                    </label>
                    <select
                      className="admin-select"
                      value={editedPrompt.language || 'en'}
                      onChange={(e) => setEditedPrompt(prev => ({ ...prev, language: e.target.value as any }))}
                    >
                      <option value="en">English</option>
                      <option value="ar">Arabic</option>
                      <option value="both">Both</option>
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
                        marginBottom: 6,
                      }}
                    >
                      Content Types (comma-separated)
                    </label>
                    <input
                      className="admin-input"
                      value={editedPrompt.contentType?.join(', ') || ''}
                      onChange={(e) => setEditedPrompt(prev => ({
                        ...prev,
                        contentType: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                      }))}
                      placeholder="guide, travel, food..."
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
                      marginBottom: 6,
                    }}
                  >
                    Prompt Template
                  </label>
                  <textarea
                    className="admin-input"
                    value={editedPrompt.prompt || ''}
                    onChange={(e) => setEditedPrompt(prev => ({ ...prev, prompt: e.target.value }))}
                    placeholder="Write your prompt template here. Use {{variableName}} for variables..."
                    rows={12}
                    style={{
                      fontFamily: 'monospace',
                      resize: 'vertical',
                      minHeight: 200,
                    }}
                  />
                  <p
                    style={{
                      fontFamily: 'var(--font-system)',
                      fontSize: 10,
                      color: '#A8A29E',
                      marginTop: 4,
                    }}
                  >
                    Use double curly braces for variables: {`{{variableName}}`}
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
                  <AdminButton
                    variant="ghost"
                    onClick={() => {
                      setIsEditing(false)
                      setIsCreating(false)
                      setEditedPrompt({})
                    }}
                  >
                    Cancel
                  </AdminButton>
                  <AdminButton
                    variant="primary"
                    onClick={isCreating ? handleCreatePrompt : handleSavePrompt}
                    disabled={!editedPrompt.name || !editedPrompt.prompt}
                  >
                    <Save size={12} />
                    {isCreating ? 'Create' : 'Save'} Prompt
                  </AdminButton>
                </div>
              </div>
            </div>
          </AdminCard>
        </div>
      )}

      {/* Version History Modal */}
      {showVersionHistory && selectedPrompt && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ backgroundColor: 'rgba(28,25,23,0.5)' }}
        >
          <AdminCard elevated className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <History size={16} color="#3B7EA1" />
                  <p
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 800,
                      fontSize: 16,
                      color: '#1C1917',
                    }}
                  >
                    Version History: {selectedPrompt.name}
                  </p>
                </div>
                <AdminButton variant="ghost" size="sm" onClick={() => setShowVersionHistory(false)}>
                  Close
                </AdminButton>
              </div>

              <div className="space-y-3">
                {mockVersions[selectedPrompt.id]?.length ? (
                  mockVersions[selectedPrompt.id].map((version) => (
                    <div
                      key={version.id}
                      className="admin-card-inset p-4 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <AdminStatusBadge status="inactive" label={`v${version.version}`} />
                          <span
                            style={{
                              fontFamily: 'var(--font-system)',
                              fontSize: 11,
                              color: '#78716C',
                            }}
                          >
                            by {version.createdBy} on {new Date(version.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <AdminButton variant="ghost" size="sm" onClick={() => handleRevertVersion(version)}>
                          <RotateCcw size={12} />
                          Revert
                        </AdminButton>
                      </div>
                      <p
                        style={{
                          fontFamily: 'var(--font-system)',
                          fontSize: 11,
                          color: '#78716C',
                          marginBottom: 8,
                        }}
                      >
                        {version.changeNote}
                      </p>
                      <div
                        className="p-3 rounded-lg"
                        style={{ backgroundColor: 'rgba(250,248,244,0.8)' }}
                      >
                        <pre
                          style={{
                            fontFamily: 'var(--font-system)',
                            fontSize: 11,
                            color: '#44403C',
                            whiteSpace: 'pre-wrap',
                            margin: 0,
                          }}
                        >
                          {version.prompt.substring(0, 200)}
                          {version.prompt.length > 200 && '...'}
                        </pre>
                      </div>
                    </div>
                  ))
                ) : (
                  <AdminEmptyState
                    icon={History}
                    title="No version history"
                    description="Version history will appear here as changes are made."
                  />
                )}
              </div>
            </div>
          </AdminCard>
        </div>
      )}
    </div>
  )
}
