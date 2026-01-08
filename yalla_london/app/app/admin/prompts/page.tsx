'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
      } catch (error) {
        console.error('Failed to fetch prompts:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPrompts()
  }, [])

  const categoryColors = {
    'content': 'bg-blue-100 text-blue-800',
    'seo': 'bg-green-100 text-green-800',
    'social': 'bg-purple-100 text-purple-800',
    'email': 'bg-orange-100 text-orange-800',
    'translation': 'bg-pink-100 text-pink-800'
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

      const data = await response.json()

      if (data.success) {
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
          createdAt: data.template.createdAt,
          updatedAt: data.template.createdAt,
          usageCount: 0
        }

        setPrompts(prev => [newPrompt, ...prev])
      }
    } catch (error) {
      console.error('Failed to create prompt:', error)
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
    } catch (error) {
      console.error('Failed to delete prompt:', error)
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

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prompts Editor</h1>
          <p className="text-sm text-gray-500 mt-1">Manage AI prompt templates for content generation</p>
        </div>
        <Button
          onClick={() => setIsCreating(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Prompt
        </Button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Prompts List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Prompt Templates
              </CardTitle>
              <div className="mt-2">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="content">Content</SelectItem>
                    <SelectItem value="seo">SEO</SelectItem>
                    <SelectItem value="social">Social Media</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="translation">Translation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-2">
                {filteredPrompts.map((prompt) => (
                  <div 
                    key={prompt.id}
                    className={`p-3 cursor-pointer border-l-4 hover:bg-gray-50 ${
                      selectedPrompt?.id === prompt.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-transparent'
                    }`}
                    onClick={() => setSelectedPrompt(prompt)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-sm text-gray-900">{prompt.name}</h3>
                        <p className="text-xs text-gray-500 mt-1">{prompt.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className={categoryColors[prompt.category]}>
                            {prompt.category}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {languageLabels[prompt.language]}
                          </Badge>
                          <span className="text-xs text-gray-400">v{prompt.version}</span>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                          <span>Used {prompt.usageCount} times</span>
                          {prompt.lastUsed && (
                            <span>Last: {new Date(prompt.lastUsed).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditPrompt(prompt)
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeletePrompt(prompt.id)
                          }}
                        >
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Prompt Editor/Viewer */}
        <div className="lg:col-span-2">
          {selectedPrompt ? (
            <div className="space-y-6">
              {/* Prompt Details */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      {selectedPrompt.name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowVersionHistory(true)}
                      >
                        <History className="h-4 w-4 mr-2" />
                        History
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleCopyPrompt}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditPrompt(selectedPrompt)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">{selectedPrompt.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-600">Category:</span>
                        <Badge className={`ml-2 ${categoryColors[selectedPrompt.category]}`}>
                          {selectedPrompt.category}
                        </Badge>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Language:</span>
                        <span className="ml-2">{languageLabels[selectedPrompt.language]}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Version:</span>
                        <span className="ml-2">v{selectedPrompt.version}</span>
                      </div>
                    </div>
                    
                    <div>
                      <span className="font-medium text-gray-600 text-sm">Content Types:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedPrompt.contentType.map((type, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {type}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    {selectedPrompt.variables.length > 0 && (
                      <div>
                        <span className="font-medium text-gray-600 text-sm">Variables:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedPrompt.variables.map((variable, index) => (
                            <code key={index} className="bg-gray-100 px-2 py-1 rounded text-xs">
                              {`{{${variable}}}`}
                            </code>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <span className="font-medium text-gray-600 text-sm">Prompt:</span>
                      <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                        <pre className="whitespace-pre-wrap text-sm text-gray-800">
                          {selectedPrompt.prompt}
                        </pre>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Test Prompt */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Play className="h-5 w-5" />
                    Test Prompt
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedPrompt.variables.length > 0 && (
                      <div className="grid grid-cols-2 gap-4">
                        {selectedPrompt.variables.map((variable) => (
                          <div key={variable}>
                            <label className="block text-sm font-medium mb-1">
                              {variable}
                            </label>
                            <Input
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
                    
                    <Button 
                      onClick={handleTestPrompt}
                      disabled={isTesting}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isTesting ? (
                        <>
                          <Clock className="h-4 w-4 mr-2 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Test Prompt
                        </>
                      )}
                    </Button>
                    
                    {testResult && (
                      <div>
                        <label className="block text-sm font-medium mb-2">Result:</label>
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                          <pre className="whitespace-pre-wrap text-sm text-gray-800">
                            {testResult}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Select a Prompt Template
                </h3>
                <p className="text-gray-500">
                  Choose a prompt from the list to view, edit, or test it.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Edit/Create Modal */}
      {(isEditing || isCreating) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {isCreating ? <Plus className="h-5 w-5" /> : <Edit className="h-5 w-5" />}
                {isCreating ? 'Create New Prompt' : 'Edit Prompt'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Name</label>
                  <Input
                    value={editedPrompt.name || ''}
                    onChange={(e) => setEditedPrompt(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter prompt name..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Category</label>
                  <Select 
                    value={editedPrompt.category || 'content'} 
                    onValueChange={(value) => setEditedPrompt(prev => ({ ...prev, category: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="content">Content</SelectItem>
                      <SelectItem value="seo">SEO</SelectItem>
                      <SelectItem value="social">Social Media</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="translation">Translation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <Input
                  value={editedPrompt.description || ''}
                  onChange={(e) => setEditedPrompt(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of what this prompt does..."
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Language</label>
                  <Select 
                    value={editedPrompt.language || 'en'} 
                    onValueChange={(value) => setEditedPrompt(prev => ({ ...prev, language: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ar">Arabic</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Content Types (comma-separated)</label>
                  <Input
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
                <label className="block text-sm font-medium mb-2">Prompt Template</label>
                <Textarea
                  value={editedPrompt.prompt || ''}
                  onChange={(e) => setEditedPrompt(prev => ({ ...prev, prompt: e.target.value }))}
                  placeholder="Write your prompt template here. Use {{variableName}} for variables..."
                  rows={12}
                  className="font-mono"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use double curly braces for variables: {`{{variableName}}`}
                </p>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsEditing(false)
                    setIsCreating(false)
                    setEditedPrompt({})
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={isCreating ? handleCreatePrompt : handleSavePrompt}
                  disabled={!editedPrompt.name || !editedPrompt.prompt}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isCreating ? 'Create' : 'Save'} Prompt
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Version History Modal */}
      {showVersionHistory && selectedPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Version History: {selectedPrompt.name}
                </CardTitle>
                <Button 
                  variant="outline" 
                  onClick={() => setShowVersionHistory(false)}
                >
                  Close
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockVersions[selectedPrompt.id]?.map((version) => (
                  <div key={version.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">v{version.version}</Badge>
                        <span className="text-sm text-gray-600">
                          by {version.createdBy} on {new Date(version.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleRevertVersion(version)}
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Revert
                      </Button>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{version.changeNote}</p>
                    <div className="bg-gray-50 p-3 rounded text-sm">
                      <pre className="whitespace-pre-wrap text-gray-800">
                        {version.prompt.substring(0, 200)}
                        {version.prompt.length > 200 && '...'}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}