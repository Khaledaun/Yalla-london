
'use client'

import { useState, useEffect } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import {
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import {
  Plus,
  Eye,
  Save,
  RotateCcw,
  GripVertical,
  Settings,
  Trash2,
  Copy,
  Monitor,
  Smartphone,
  Languages,
  Star,
  Calendar,
  MessageCircle,
  Grid3X3,
  Zap
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { useLanguage } from '@/components/language-provider'

interface HomepageBlock {
  id: string
  type: string
  titleEn: string
  titleAr: string
  contentEn: string
  contentAr: string
  config: any
  mediaId?: string
  position: number
  enabled: boolean
  version: string
  language: string
}

interface BlockConfig {
  backgroundColor?: string
  textColor?: string
  buttonColor?: string
  layout?: string
  showSocial?: boolean
  maxItems?: number
  autoSlide?: boolean
  slideInterval?: number
}

const blockTypes = [
  { 
    type: 'hero', 
    name: 'Hero Section', 
    icon: Star, 
    description: 'Large banner with title, subtitle, and CTA' 
  },
  { 
    type: 'featured-experiences', 
    name: 'Featured Experiences', 
    icon: Grid3X3, 
    description: 'Showcase top recommendations' 
  },
  { 
    type: 'events', 
    name: 'Upcoming Events', 
    icon: Calendar, 
    description: 'Display scheduled events' 
  },
  { 
    type: 'testimonials', 
    name: 'Testimonials', 
    icon: MessageCircle, 
    description: 'Customer reviews and feedback' 
  },
  { 
    type: 'blog-grid', 
    name: 'Blog Grid', 
    icon: Grid3X3, 
    description: 'Latest blog posts grid' 
  },
  { 
    type: 'cta', 
    name: 'Call to Action', 
    icon: Zap, 
    description: 'Newsletter signup or contact form' 
  }
]

function SortableBlock({ 
  block, 
  isActive, 
  onEdit, 
  onDelete, 
  onToggle 
}: { 
  block: HomepageBlock
  isActive: boolean
  onEdit: (block: HomepageBlock) => void
  onDelete: (id: string) => void
  onToggle: (id: string, enabled: boolean) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: block.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  const BlockIcon = blockTypes.find(t => t.type === block.type)?.icon || Grid3X3

  return (
    <Card 
      ref={setNodeRef} 
      style={style}
      className={`${isActive ? 'ring-2 ring-primary' : ''} ${!block.enabled ? 'opacity-60' : ''}`}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
          >
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </div>
          
          <div className="flex items-center gap-2 flex-1">
            <BlockIcon className="w-5 h-5" />
            <div>
              <p className="font-medium">{block.titleEn || blockTypes.find(t => t.type === block.type)?.name}</p>
              <p className="text-sm text-muted-foreground">Position {block.position + 1}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={block.language === 'both' ? 'default' : 'secondary'}>
              {block.language}
            </Badge>
            
            <Switch
              checked={block.enabled}
              onCheckedChange={(enabled) => onToggle(block.id, enabled)}
            />
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(block)}
            >
              <Settings className="w-4 h-4" />
            </Button>
            
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onDelete(block.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function HomepageBuilder() {
  const [blocks, setBlocks] = useState<HomepageBlock[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [editingBlock, setEditingBlock] = useState<HomepageBlock | null>(null)
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop')
  const [currentVersion, setCurrentVersion] = useState('draft')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()
  const { language } = useLanguage()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  useEffect(() => {
    loadBlocks()
  }, [])

  const loadBlocks = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/homepage-blocks?version=${currentVersion}`)
      if (response.ok) {
        const data = await response.json()
        setBlocks(data)
      }
    } catch (error) {
      console.error('Failed to load blocks:', error)
      toast({
        title: "Error",
        description: "Failed to load homepage blocks",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      setBlocks((blocks) => {
        const oldIndex = blocks.findIndex((block) => block.id === active.id)
        const newIndex = blocks.findIndex((block) => block.id === over?.id)
        
        const newBlocks = arrayMove(blocks, oldIndex, newIndex)
        
        // Update positions
        const updatedBlocks = newBlocks.map((block, index) => ({
          ...block,
          position: index
        }))
        
        // Save the new order
        saveBlockOrder(updatedBlocks)
        
        return updatedBlocks
      })
    }

    setActiveId(null)
  }

  const saveBlockOrder = async (blocks: HomepageBlock[]) => {
    try {
      await fetch('/api/homepage-blocks/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blocks: blocks.map(b => ({ id: b.id, position: b.position }))
        })
      })
    } catch (error) {
      console.error('Failed to save block order:', error)
    }
  }

  const handleAddBlock = async (blockType: string) => {
    try {
      const newBlock = {
        type: blockType,
        titleEn: blockTypes.find(t => t.type === blockType)?.name || 'New Block',
        titleAr: '',
        contentEn: '',
        contentAr: '',
        config: getDefaultConfig(blockType),
        position: blocks.length,
        enabled: true,
        version: 'draft',
        language: 'both'
      }

      const response = await fetch('/api/homepage-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBlock)
      })

      if (!response.ok) {
        throw new Error('Failed to create block')
      }

      const createdBlock = await response.json()
      setBlocks(prev => [...prev, createdBlock])
      
      toast({
        title: "Success",
        description: "Block added successfully"
      })
    } catch (error) {
      console.error('Failed to add block:', error)
      toast({
        title: "Error",
        description: "Failed to add block",
        variant: "destructive"
      })
    }
  }

  const handleUpdateBlock = async (updatedBlock: HomepageBlock) => {
    try {
      const response = await fetch(`/api/homepage-blocks/${updatedBlock.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedBlock)
      })

      if (!response.ok) {
        throw new Error('Failed to update block')
      }

      const updated = await response.json()
      setBlocks(prev => prev.map(b => b.id === updated.id ? updated : b))
      setEditingBlock(null)
      
      toast({
        title: "Success",
        description: "Block updated successfully"
      })
    } catch (error) {
      console.error('Failed to update block:', error)
      toast({
        title: "Error",
        description: "Failed to update block",
        variant: "destructive"
      })
    }
  }

  const handleDeleteBlock = async (id: string) => {
    try {
      const response = await fetch(`/api/homepage-blocks/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete block')
      }

      setBlocks(prev => prev.filter(b => b.id !== id))
      
      toast({
        title: "Success",
        description: "Block deleted successfully"
      })
    } catch (error) {
      console.error('Failed to delete block:', error)
      toast({
        title: "Error",
        description: "Failed to delete block",
        variant: "destructive"
      })
    }
  }

  const handleToggleBlock = async (id: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/homepage-blocks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      })

      if (!response.ok) {
        throw new Error('Failed to toggle block')
      }

      const updated = await response.json()
      setBlocks(prev => prev.map(b => b.id === updated.id ? updated : b))
    } catch (error) {
      console.error('Failed to toggle block:', error)
      toast({
        title: "Error",
        description: "Failed to toggle block",
        variant: "destructive"
      })
    }
  }

  const handlePublish = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/homepage-blocks/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks })
      })

      if (!response.ok) {
        throw new Error('Failed to publish')
      }

      setCurrentVersion('published')
      toast({
        title: "Success",
        description: "Homepage published successfully"
      })
    } catch (error) {
      console.error('Failed to publish:', error)
      toast({
        title: "Error",
        description: "Failed to publish homepage",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  const getDefaultConfig = (blockType: string): BlockConfig => {
    switch (blockType) {
      case 'hero':
        return {
          backgroundColor: '#ffffff',
          textColor: '#000000',
          buttonColor: '#007bff',
          layout: 'center'
        }
      case 'featured-experiences':
        return {
          maxItems: 6,
          layout: 'grid'
        }
      case 'events':
        return {
          maxItems: 4,
          showSocial: true
        }
      case 'testimonials':
        return {
          autoSlide: true,
          slideInterval: 5000
        }
      case 'blog-grid':
        return {
          maxItems: 6,
          layout: 'grid'
        }
      case 'cta':
        return {
          backgroundColor: '#f8f9fa',
          buttonColor: '#28a745'
        }
      default:
        return {}
    }
  }

  const activeBlock = activeId ? blocks.find(b => b.id === activeId) : null
  const ActiveBlockIcon = activeBlock ? blockTypes.find(t => t.type === activeBlock.type)?.icon || Grid3X3 : null

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🏗️ Homepage Builder
            <Badge variant="outline" className="ml-auto">
              Phase 3.4
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Toolbar */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <Button
                variant={currentVersion === 'draft' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentVersion('draft')}
              >
                Draft
              </Button>
              <Button
                variant={currentVersion === 'published' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentVersion('published')}
              >
                Published
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex border rounded-md">
                <Button
                  variant={previewMode === 'desktop' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setPreviewMode('desktop')}
                >
                  <Monitor className="w-4 h-4" />
                </Button>
                <Button
                  variant={previewMode === 'mobile' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setPreviewMode('mobile')}
                >
                  <Smartphone className="w-4 h-4" />
                </Button>
              </div>
              
              <Button variant="outline">
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
              
              <Button 
                onClick={handlePublish}
                disabled={isSaving}
                className="bg-green-600 hover:bg-green-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Publishing...' : 'Publish'}
              </Button>
            </div>
          </div>

          {/* Add Block Section */}
          <div className="mb-6">
            <Label className="text-base font-medium mb-3 block">Add New Block</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {blockTypes.map((blockType) => {
                const Icon = blockType.icon
                return (
                  <Button
                    key={blockType.type}
                    variant="outline"
                    className="h-auto p-4 flex flex-col gap-2"
                    onClick={() => handleAddBlock(blockType.type)}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-xs text-center">{blockType.name}</span>
                  </Button>
                )
              })}
            </div>
          </div>

          {/* Blocks List */}
          <div className="space-y-4">
            {blocks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-lg mb-2">No blocks yet</p>
                <p className="text-sm">Add your first block to get started</p>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <SortableContext 
                  items={blocks.map(b => b.id)} 
                  strategy={verticalListSortingStrategy}
                >
                  {blocks.map((block) => (
                    <SortableBlock
                      key={block.id}
                      block={block}
                      isActive={block.id === activeId}
                      onEdit={setEditingBlock}
                      onDelete={handleDeleteBlock}
                      onToggle={handleToggleBlock}
                    />
                  ))}
                </SortableContext>
                
                <DragOverlay>
                  {activeBlock && ActiveBlockIcon && (
                    <Card className="opacity-90">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <ActiveBlockIcon className="w-5 h-5" />
                          <span className="font-medium">
                            {activeBlock.titleEn}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </DragOverlay>
              </DndContext>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Block Editor Modal */}
      <Dialog open={!!editingBlock} onOpenChange={() => setEditingBlock(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Block</DialogTitle>
          </DialogHeader>
          
          {editingBlock && (
            <BlockEditor
              block={editingBlock}
              onSave={handleUpdateBlock}
              onCancel={() => setEditingBlock(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function BlockEditor({ 
  block, 
  onSave, 
  onCancel 
}: {
  block: HomepageBlock
  onSave: (block: HomepageBlock) => void
  onCancel: () => void
}) {
  const [editedBlock, setEditedBlock] = useState(block)

  const handleSave = () => {
    onSave(editedBlock)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Title (English)</Label>
          <Input
            value={editedBlock.titleEn}
            onChange={(e) => setEditedBlock(prev => ({
              ...prev,
              titleEn: e.target.value
            }))}
          />
        </div>
        <div>
          <Label>Title (Arabic)</Label>
          <Input
            value={editedBlock.titleAr}
            onChange={(e) => setEditedBlock(prev => ({
              ...prev,
              titleAr: e.target.value
            }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Content (English)</Label>
          <Textarea
            value={editedBlock.contentEn}
            onChange={(e) => setEditedBlock(prev => ({
              ...prev,
              contentEn: e.target.value
            }))}
            rows={4}
          />
        </div>
        <div>
          <Label>Content (Arabic)</Label>
          <Textarea
            value={editedBlock.contentAr}
            onChange={(e) => setEditedBlock(prev => ({
              ...prev,
              contentAr: e.target.value
            }))}
            rows={4}
          />
        </div>
      </div>

      <div>
        <Label>Language</Label>
        <Select 
          value={editedBlock.language} 
          onValueChange={(value) => setEditedBlock(prev => ({
            ...prev,
            language: value
          }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="both">Both Languages</SelectItem>
            <SelectItem value="en">English Only</SelectItem>
            <SelectItem value="ar">Arabic Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          Save Changes
        </Button>
      </div>
    </div>
  )
}
