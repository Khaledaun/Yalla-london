'use client'

/**
 * Content Pipeline Kanban Component
 * Manages generated articles through pipeline states with drag-drop functionality
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye, 
  Calendar,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  Image,
  Link,
  TrendingUp,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react'
import { isPremiumFeatureEnabled } from '@/lib/feature-flags'

interface ScheduledContent {
  id: string
  title: string
  content: string
  content_type: string
  language: string
  category?: string
  tags: string[]
  metadata?: any
  scheduled_time: string
  published_time?: string
  status: 'pending' | 'published' | 'failed' | 'cancelled'
  platform?: string
  published: boolean
  page_type?: string
  topic_proposal_id?: string
  seo_score?: number
  generation_source?: string
  authority_links_used?: any
  longtails_used?: any
  created_at: string
  updated_at: string
}

const pipelineStates = {
  draft: {
    label: 'Draft',
    description: 'Content generated but not reviewed',
    color: 'bg-gray-100 border-gray-300',
    textColor: 'text-gray-700',
    icon: FileText
  },
  review: {
    label: 'Review',
    description: 'Content ready for editorial review',
    color: 'bg-yellow-100 border-yellow-300',
    textColor: 'text-yellow-700',
    icon: Eye
  },
  seo_audit: {
    label: 'SEO Audit',
    description: 'Content undergoing SEO optimization',
    color: 'bg-blue-100 border-blue-300',
    textColor: 'text-blue-700',
    icon: TrendingUp
  },
  media_pending: {
    label: 'Media Pending',
    description: 'Waiting for media assets',
    color: 'bg-purple-100 border-purple-300',
    textColor: 'text-purple-700',
    icon: Image
  },
  scheduled: {
    label: 'Scheduled',
    description: 'Ready for publication',
    color: 'bg-green-100 border-green-300',
    textColor: 'text-green-700',
    icon: Calendar
  },
  published: {
    label: 'Published',
    description: 'Live on website',
    color: 'bg-emerald-100 border-emerald-300',
    textColor: 'text-emerald-700',
    icon: CheckCircle
  },
  failed: {
    label: 'Failed',
    description: 'Publication failed',
    color: 'bg-red-100 border-red-300',
    textColor: 'text-red-700',
    icon: AlertCircle
  }
}

type PipelineState = keyof typeof pipelineStates

// Derive pipeline state from content data
function derivePipelineState(content: ScheduledContent): PipelineState {
  if (content.status === 'published') return 'published'
  if (content.status === 'failed') return 'failed'
  if (content.status === 'cancelled') return 'failed'
  
  if (content.scheduled_time && new Date(content.scheduled_time) > new Date()) {
    return 'scheduled'
  }
  
  if (content.seo_score && content.seo_score < 70) {
    return 'seo_audit'
  }
  
  if (!content.metadata?.featured_image) {
    return 'media_pending'
  }
  
  if (content.status === 'pending') {
    return 'review'
  }
  
  return 'draft'
}

export default function ContentPipelineKanban() {
  const [content, setContent] = useState<ScheduledContent[]>([])
  const [loading, setLoading] = useState(true)
  const [draggedItem, setDraggedItem] = useState<ScheduledContent | null>(null)
  const [filters, setFilters] = useState({
    language: '',
    category: '',
    search: ''
  })
  const [selectedContent, setSelectedContent] = useState<ScheduledContent | null>(null)

  // Check feature availability
  const isFeatureEnabled = isPremiumFeatureEnabled('FEATURE_CONTENT_PIPELINE')

  const fetchContent = useCallback(async () => {
    if (!isFeatureEnabled) return

    setLoading(true)
    try {
      // This would call your scheduled content API
      // For now, using mock data
      const mockContent: ScheduledContent[] = [
        {
          id: '1',
          title: 'Best Areas to Stay in London 2024',
          content: 'Complete guide to London neighborhoods...',
          content_type: 'blog_post',
          language: 'en',
          category: 'london-travel',
          tags: ['london', 'travel', 'accommodation'],
          scheduled_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          status: 'pending',
          published: false,
          page_type: 'guide',
          seo_score: 85,
          generation_source: 'topic_proposal',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '2',
          title: 'London Food Markets Guide',
          content: 'Discover the best food markets in London...',
          content_type: 'blog_post',
          language: 'en',
          category: 'london-food',
          tags: ['london', 'food', 'markets'],
          scheduled_time: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          status: 'pending',
          published: false,
          page_type: 'guide',
          seo_score: 65,
          generation_source: 'topic_proposal',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]
      
      setContent(mockContent)
    } catch (error) {
      console.error('Error fetching content:', error)
      toast.error('Failed to fetch content')
    } finally {
      setLoading(false)
    }
  }, [isFeatureEnabled])

  useEffect(() => {
    if (isFeatureEnabled) {
      fetchContent()
    }
  }, [filters, isFeatureEnabled, fetchContent])

  const handleDragStart = (event: DragStartEvent) => {
    const item = content.find(c => c.id === event.active.id)
    setDraggedItem(item || null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    
    if (!over || !active) {
      setDraggedItem(null)
      return
    }

    const contentId = active.id as string
    const newState = over.id as PipelineState
    
    // Update content state logic would go here
    console.log(`Moving content ${contentId} to state ${newState}`)
    
    setDraggedItem(null)
  }

  const groupedContent = content.reduce((acc, item) => {
    const state = derivePipelineState(item)
    if (!acc[state]) acc[state] = []
    acc[state].push(item)
    return acc
  }, {} as Record<PipelineState, ScheduledContent[]>)

  if (!isFeatureEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Content Pipeline
          </CardTitle>
          <CardDescription>
            Manage generated articles through pipeline states
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-gray-500 mb-4">
              Content pipeline feature is not enabled
            </div>
            <p className="text-sm text-gray-400">
              Enable FEATURE_CONTENT_PIPELINE in your environment to access this feature
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
          <h1 className="text-3xl font-bold">Content Pipeline</h1>
          <p className="text-gray-600">Manage generated articles through review and publication states</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchContent} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Generate Content
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search content..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="language">Language</Label>
              <Select value={filters.language} onValueChange={(value) => setFilters(prev => ({ ...prev, language: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All languages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All languages</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ar">Arabic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={filters.category} onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All categories</SelectItem>
                  <SelectItem value="london-travel">London Travel</SelectItem>
                  <SelectItem value="london-food">London Food</SelectItem>
                  <SelectItem value="london-events">London Events</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pipeline Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {Object.entries(pipelineStates).map(([key, config]) => {
          const count = groupedContent[key as PipelineState]?.length || 0
          const Icon = config.icon
          
          return (
            <Card key={key}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">{count}</div>
                    <div className="text-sm text-gray-500">{config.label}</div>
                  </div>
                  <Icon className={`h-5 w-5 ${config.textColor}`} />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Kanban Board */}
      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6 overflow-x-auto">
          {Object.entries(pipelineStates).map(([stateKey, config]) => {
            const stateContent = groupedContent[stateKey as PipelineState] || []
            
            return (
              <KanbanColumn
                key={stateKey}
                state={stateKey as PipelineState}
                config={config}
                content={stateContent}
                onContentClick={setSelectedContent}
              />
            )
          })}
        </div>
        
        <DragOverlay adjustScale={false} className="" style={undefined} transition={undefined}>
          {draggedItem && (
            <ContentCard
              content={draggedItem}
              onClick={() => {}}
              isDragging
            />
          )}
        </DragOverlay>
      </DndContext>

      {/* Content Detail Dialog */}
      {selectedContent && (
        <ContentDetailDialog
          content={selectedContent}
          open={!!selectedContent}
          onClose={() => setSelectedContent(null)}
          onUpdate={fetchContent}
        />
      )}
    </div>
  )
}

// Kanban Column Component
function KanbanColumn({ 
  state, 
  config, 
  content, 
  onContentClick 
}: {
  state: PipelineState
  config: typeof pipelineStates[PipelineState]
  content: ScheduledContent[]
  onContentClick: (content: ScheduledContent) => void
}) {
  const Icon = config.icon

  return (
    <SortableContext items={content.map(c => c.id)} strategy={verticalListSortingStrategy}>
      <Card className={`${config.color} border-2 border-dashed min-h-[500px]`}>
        <CardHeader className="pb-3">
          <CardTitle className={`text-lg flex items-center gap-2 ${config.textColor}`}>
            <Icon className="h-5 w-5" />
            {config.label}
            <Badge variant="secondary" className="ml-auto">
              {content.length}
            </Badge>
          </CardTitle>
          <CardDescription className={config.textColor}>
            {config.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {content.map((item) => (
            <ContentCard
              key={item.id}
              content={item}
              onClick={() => onContentClick(item)}
            />
          ))}
          {content.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No content in this stage
            </div>
          )}
        </CardContent>
      </Card>
    </SortableContext>
  )
}

// Draggable Content Card Component
function ContentCard({ 
  content, 
  onClick, 
  isDragging = false 
}: {
  content: ScheduledContent
  onClick: () => void
  isDragging?: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isDraggingThis
  } = useSortable({ id: content.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging || isDraggingThis ? 0.5 : 1
  }

  const getSeoScoreColor = (score?: number) => {
    if (!score) return 'bg-gray-200'
    if (score >= 80) return 'bg-green-500'
    if (score >= 60) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="space-y-3">
        <div>
          <h4 className="font-medium text-sm leading-5 line-clamp-2">
            {content.title}
          </h4>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs">
              {content.language.toUpperCase()}
            </Badge>
            {content.page_type && (
              <Badge variant="secondary" className="text-xs">
                {content.page_type}
              </Badge>
            )}
          </div>
        </div>

        {content.seo_score && (
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-gray-400" />
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${getSeoScoreColor(content.seo_score)}`}
                style={{ width: `${content.seo_score}%` }}
              />
            </div>
            <span className="text-xs text-gray-500">{content.seo_score}%</span>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {new Date(content.scheduled_time).toLocaleDateString()}
          </div>
          <div className="flex items-center gap-1">
            {content.tags.slice(0, 2).map(tag => (
              <Badge key={tag} variant="outline" className="text-xs px-1">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Content Detail Dialog Component
function ContentDetailDialog({ 
  content, 
  open, 
  onClose, 
  onUpdate 
}: {
  content: ScheduledContent
  open: boolean
  onClose: () => void
  onUpdate: () => void
}) {
  const [editing, setEditing] = useState(false)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {content.title}
          </DialogTitle>
          <DialogDescription>
            {content.category} • {content.language.toUpperCase()} • Created {new Date(content.created_at).toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 mt-6">
          {/* Content Preview */}
          <div>
            <Label className="text-base font-medium">Content Preview</Label>
            <div className="mt-2 p-4 bg-gray-50 rounded-lg max-h-40 overflow-y-auto">
              <p className="text-sm text-gray-700">{content.content.substring(0, 500)}...</p>
            </div>
          </div>

          {/* SEO Score */}
          {content.seo_score && (
            <div>
              <Label className="text-base font-medium">SEO Score</Label>
              <div className="mt-2">
                <Progress value={content.seo_score} className="w-full" />
                <div className="flex justify-between text-sm text-gray-500 mt-1">
                  <span>Score: {content.seo_score}%</span>
                  <span>{content.seo_score >= 80 ? 'Excellent' : content.seo_score >= 60 ? 'Good' : 'Needs Improvement'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-base font-medium">Scheduled Time</Label>
              <div className="mt-1 text-sm">
                {new Date(content.scheduled_time).toLocaleString()}
              </div>
            </div>
            <div>
              <Label className="text-base font-medium">Generation Source</Label>
              <div className="mt-1 text-sm capitalize">
                {content.generation_source || 'Manual'}
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <Label className="text-base font-medium">Tags</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {content.tags.map(tag => (
                <Badge key={tag} variant="secondary">{tag}</Badge>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button variant="outline">
              <TrendingUp className="h-4 w-4 mr-2" />
              Run SEO Audit
            </Button>
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Reschedule
            </Button>
            <Button variant="destructive" className="ml-auto">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}