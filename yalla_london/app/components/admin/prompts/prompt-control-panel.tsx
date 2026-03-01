'use client'

/**
 * Prompt Control Panel Component
 * Provides prompt template management with versioning, locale support, and usage tracking
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { toast } from 'sonner'
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Copy, 
  Eye, 
  Settings,
  RefreshCw,
  Code,
  Languages,
  TrendingUp,
  FileText,
  Sparkles
} from 'lucide-react'
import { isPremiumFeatureEnabled } from '@/lib/feature-flags'

interface PromptTemplate {
  id: string
  name: string
  category: 'content_generation' | 'seo_audit' | 'topic_research' | 'media_description'
  template_en: string
  template_ar?: string
  variables: Record<string, any>
  version: string
  locale_overrides?: Record<string, any>
  is_active: boolean
  created_by?: string
  usage_count: number
  last_used_at?: string
  created_at: string
  updated_at: string
}

const categoryConfig = {
  content_generation: { 
    label: 'Content Generation', 
    color: 'bg-blue-100 text-blue-800',
    icon: FileText,
    description: 'Templates for generating blog posts, articles, and content'
  },
  seo_audit: { 
    label: 'SEO Audit', 
    color: 'bg-green-100 text-green-800',
    icon: TrendingUp,
    description: 'Templates for SEO analysis and optimization'
  },
  topic_research: { 
    label: 'Topic Research', 
    color: 'bg-purple-100 text-purple-800',
    icon: Search,
    description: 'Templates for topic discovery and keyword research'
  },
  media_description: { 
    label: 'Media Description', 
    color: 'bg-orange-100 text-orange-800',
    icon: Eye,
    description: 'Templates for generating media alt text and descriptions'
  }
}

export default function PromptControlPanel() {
  const [prompts, setPrompts] = useState<PromptTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    category: '',
    version: '',
    is_active: '',
    search: ''
  })
  const [selectedPrompt, setSelectedPrompt] = useState<PromptTemplate | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState<PromptTemplate | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  })

  // Check feature availability
  const isFeatureEnabled = isPremiumFeatureEnabled('FEATURE_PROMPT_CONTROL')

  const fetchPrompts = useCallback(async () => {
    if (!isFeatureEnabled) return

    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
      })

      const response = await fetch(`/api/admin/prompts?${params}`)
      const result = await response.json()

      if (response.ok) {
        setPrompts(result.data)
        setPagination(prev => ({ ...prev, ...result.pagination }))
      } else {
        toast.error(result.error || 'Failed to fetch prompts')
      }
    } catch (error) {
      console.error('Error fetching prompts:', error)
      toast.error('Failed to fetch prompts')
    } finally {
      setLoading(false)
    }
  }, [isFeatureEnabled, pagination.page, pagination.limit, filters])

  useEffect(() => {
    if (isFeatureEnabled) {
      fetchPrompts()
    }
  }, [fetchPrompts, isFeatureEnabled])

  const createPrompt = async (formData: Partial<PromptTemplate>) => {
    if (!isFeatureEnabled) return

    try {
      const response = await fetch('/api/admin/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (response.ok) {
        toast.success('Prompt template created successfully')
        fetchPrompts()
        setShowCreateDialog(false)
      } else {
        toast.error(result.error || 'Failed to create prompt template')
      }
    } catch (error) {
      console.error('Error creating prompt:', error)
      toast.error('Failed to create prompt template')
    }
  }

  const updatePrompt = async (promptId: string, updates: Partial<PromptTemplate>) => {
    if (!isFeatureEnabled) return

    try {
      const response = await fetch(`/api/admin/prompts/${promptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      const result = await response.json()

      if (response.ok) {
        toast.success('Prompt template updated successfully')
        fetchPrompts()
        setEditingPrompt(null)
      } else {
        toast.error(result.error || 'Failed to update prompt template')
      }
    } catch (error) {
      console.error('Error updating prompt:', error)
      toast.error('Failed to update prompt template')
    }
  }

  const deletePrompt = async (promptId: string) => {
    if (!isFeatureEnabled) return

    if (!confirm('Are you sure you want to delete this prompt template?')) return

    try {
      const response = await fetch(`/api/admin/prompts/${promptId}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (response.ok) {
        toast.success('Prompt template deleted successfully')
        fetchPrompts()
      } else {
        toast.error(result.error || 'Failed to delete prompt template')
      }
    } catch (error) {
      console.error('Error deleting prompt:', error)
      toast.error('Failed to delete prompt template')
    }
  }

  const duplicatePrompt = async (prompt: PromptTemplate) => {
    const duplicatedPrompt: any = {
      ...prompt,
      name: `${prompt.name} (Copy)`,
      version: '1.0',
      is_active: false
    }
    delete duplicatedPrompt.id
    delete duplicatedPrompt.created_at
    delete duplicatedPrompt.updated_at
    delete duplicatedPrompt.usage_count
    delete duplicatedPrompt.last_used_at

    await createPrompt(duplicatedPrompt)
  }

  if (!isFeatureEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Prompt Control Panel
          </CardTitle>
          <CardDescription>
            Manage AI prompt templates with versioning and locale support
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-gray-500 mb-4">
              Prompt control feature is not enabled
            </div>
            <p className="text-sm text-gray-400">
              Enable FEATURE_PROMPT_CONTROL in your environment to access this feature
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Prompt Control Panel</h1>
          <p className="text-gray-600">Manage AI prompt templates with versioning and localization</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchPrompts} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Create Prompt Template</DialogTitle>
                <DialogDescription>
                  Create a new AI prompt template with versioning and locale support
                </DialogDescription>
              </DialogHeader>
              <CreatePromptForm onSubmit={createPrompt} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Category Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(categoryConfig).map(([key, config]) => {
          const categoryPrompts = prompts.filter(p => p.category === key)
          const Icon = config.icon
          
          return (
            <Card key={key} className="cursor-pointer hover:shadow-md transition-shadow" 
                  onClick={() => setFilters(prev => ({ ...prev, category: key }))}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="h-4 w-4" />
                      <span className="font-medium">{config.label}</span>
                    </div>
                    <div className="text-2xl font-bold">{categoryPrompts.length}</div>
                    <div className="text-xs text-gray-500">
                      {categoryPrompts.filter(p => p.is_active).length} active
                    </div>
                  </div>
                  <Badge className={config.color}>
                    {key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search templates..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={filters.category} onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All categories</SelectItem>
                  {Object.entries(categoryConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="is_active">Status</Label>
              <Select value={filters.is_active} onValueChange={(value) => setFilters(prev => ({ ...prev, is_active: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="version">Version</Label>
              <Input
                id="version"
                placeholder="Filter by version..."
                value={filters.version}
                onChange={(e) => setFilters(prev => ({ ...prev, version: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Prompts Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Locales</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex items-center justify-center">
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        Loading prompts...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : prompts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      No prompt templates found
                    </TableCell>
                  </TableRow>
                ) : (
                  prompts.map((prompt) => (
                    <TableRow key={prompt.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{prompt.name}</div>
                          <div className="text-sm text-gray-500 max-w-md truncate">
                            {prompt.template_en.substring(0, 60)}...
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={categoryConfig[prompt.category]?.color}>
                          {categoryConfig[prompt.category]?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{prompt.version}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={prompt.is_active ? "default" : "secondary"}>
                          {prompt.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-gray-400" />
                          <span>{prompt.usage_count}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-xs">EN</Badge>
                          {prompt.template_ar && (
                            <Badge variant="outline" className="text-xs">AR</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {prompt.last_used_at 
                          ? new Date(prompt.last_used_at).toLocaleDateString()
                          : 'Never'
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedPrompt(prompt)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingPrompt(prompt)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => duplicatePrompt(prompt)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deletePrompt(prompt.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} templates
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === 1}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === pagination.pages}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Prompt Detail Dialog */}
      {selectedPrompt && (
        <PromptDetailDialog
          prompt={selectedPrompt}
          open={!!selectedPrompt}
          onClose={() => setSelectedPrompt(null)}
        />
      )}

      {/* Edit Prompt Dialog */}
      {editingPrompt && (
        <Dialog open={!!editingPrompt} onOpenChange={() => setEditingPrompt(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Edit Prompt Template</DialogTitle>
              <DialogDescription>
                Update the prompt template configuration
              </DialogDescription>
            </DialogHeader>
            <EditPromptForm 
              prompt={editingPrompt} 
              onSubmit={(updates) => updatePrompt(editingPrompt.id, updates)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

// Create Prompt Form Component
function CreatePromptForm({ onSubmit }: {
  onSubmit: (data: Partial<PromptTemplate>) => void
}) {
  const [formData, setFormData] = useState({
    name: '',
    category: 'content_generation' as const,
    template_en: '',
    template_ar: '',
    variables: {},
    version: '1.0',
    is_active: true
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.template_en) {
      toast.error('Name and English template are required')
      return
    }
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., Blog Post Generator"
          />
        </div>
        <div>
          <Label htmlFor="category">Category</Label>
          <Select 
            value={formData.category} 
            onValueChange={(value: any) => setFormData(prev => ({ ...prev, category: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(categoryConfig).map(([key, config]) => (
                <SelectItem key={key} value={key}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="template_en">English Template *</Label>
        <Textarea
          id="template_en"
          value={formData.template_en}
          onChange={(e) => setFormData(prev => ({ ...prev, template_en: e.target.value }))}
          placeholder="Enter your prompt template with variables like {{keyword}}, {{category}}, etc."
          rows={8}
        />
      </div>

      <div>
        <Label htmlFor="template_ar">Arabic Template (Optional)</Label>
        <Textarea
          id="template_ar"
          value={formData.template_ar}
          onChange={(e) => setFormData(prev => ({ ...prev, template_ar: e.target.value }))}
          placeholder="Arabic version of the prompt template"
          rows={8}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="version">Version</Label>
          <Input
            id="version"
            value={formData.version}
            onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
          />
        </div>
        <div className="flex items-center space-x-2 pt-6">
          <Switch
            id="is_active"
            checked={formData.is_active}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
          />
          <Label htmlFor="is_active">Active</Label>
        </div>
      </div>

      <Button type="submit" className="w-full">
        Create Template
      </Button>
    </form>
  )
}

// Edit Prompt Form Component
function EditPromptForm({ 
  prompt, 
  onSubmit 
}: {
  prompt: PromptTemplate
  onSubmit: (data: Partial<PromptTemplate>) => void
}) {
  const [formData, setFormData] = useState({
    name: prompt.name,
    category: prompt.category,
    template_en: prompt.template_en,
    template_ar: prompt.template_ar || '',
    version: prompt.version,
    is_active: prompt.is_active
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="category">Category</Label>
          <Select 
            value={formData.category} 
            onValueChange={(value: any) => setFormData(prev => ({ ...prev, category: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(categoryConfig).map(([key, config]) => (
                <SelectItem key={key} value={key}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="english" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="english">English Template</TabsTrigger>
          <TabsTrigger value="arabic">Arabic Template</TabsTrigger>
        </TabsList>
        <TabsContent value="english">
          <Textarea
            value={formData.template_en}
            onChange={(e) => setFormData(prev => ({ ...prev, template_en: e.target.value }))}
            rows={12}
          />
        </TabsContent>
        <TabsContent value="arabic">
          <Textarea
            value={formData.template_ar}
            onChange={(e) => setFormData(prev => ({ ...prev, template_ar: e.target.value }))}
            rows={12}
            placeholder="Arabic version of the prompt template"
          />
        </TabsContent>
      </Tabs>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="version">Version</Label>
          <Input
            id="version"
            value={formData.version}
            onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
          />
        </div>
        <div className="flex items-center space-x-2 pt-6">
          <Switch
            id="is_active"
            checked={formData.is_active}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
          />
          <Label htmlFor="is_active">Active</Label>
        </div>
      </div>

      <Button type="submit" className="w-full">
        Update Template
      </Button>
    </form>
  )
}

// Prompt Detail Dialog Component
function PromptDetailDialog({ 
  prompt, 
  open, 
  onClose 
}: {
  prompt: PromptTemplate
  open: boolean
  onClose: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            {prompt.name}
          </DialogTitle>
          <DialogDescription>
            Version {prompt.version} • {categoryConfig[prompt.category]?.label}
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="templates" className="mt-4">
          <TabsList>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="variables">Variables</TabsTrigger>
            <TabsTrigger value="usage">Usage Stats</TabsTrigger>
          </TabsList>
          
          <TabsContent value="templates" className="space-y-4">
            <Accordion type="single" collapsible defaultValue="english">
              <AccordionItem value="english">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <Languages className="h-4 w-4" />
                    English Template
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <pre className="text-sm whitespace-pre-wrap">{prompt.template_en}</pre>
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              {prompt.template_ar && (
                <AccordionItem value="arabic">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <Languages className="h-4 w-4" />
                      Arabic Template
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="bg-gray-50 p-4 rounded-lg" dir="rtl">
                      <pre className="text-sm whitespace-pre-wrap">{prompt.template_ar}</pre>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          </TabsContent>
          
          <TabsContent value="variables" className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <pre className="text-sm">{JSON.stringify(prompt.variables, null, 2)}</pre>
            </div>
          </TabsContent>
          
          <TabsContent value="usage" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{prompt.usage_count}</div>
                  <div className="text-sm text-gray-500">Total Uses</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">
                    {prompt.is_active ? 'Active' : 'Inactive'}
                  </div>
                  <div className="text-sm text-gray-500">Status</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">
                    {prompt.last_used_at 
                      ? new Date(prompt.last_used_at).toLocaleDateString()
                      : 'Never'
                    }
                  </div>
                  <div className="text-sm text-gray-500">Last Used</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}