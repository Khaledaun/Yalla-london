'use client'

import React, { useState } from 'react'
import { sanitizeHtml } from '@/lib/html-sanitizer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay
} from '@dnd-kit/core'
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { 
  Plus,
  Grip,
  Edit,
  Trash2,
  Image,
  Video,
  Type,
  Link,
  MapPin,
  Share2,
  Code,
  Quote,
  List,
  Grid3X3,
  Layout,
  Eye,
  Save,
  Settings
} from 'lucide-react'

export interface ContentBlock {
  id: string
  type: 'text' | 'image' | 'video' | 'link' | 'map' | 'social' | 'code' | 'quote' | 'list' | 'gallery' | 'spacer' | 'divider'
  content: {
    [key: string]: any
  }
  settings?: {
    className?: string
    alignment?: 'left' | 'center' | 'right'
    spacing?: 'sm' | 'md' | 'lg'
    background?: string
    [key: string]: any
  }
  metadata?: {
    title?: string
    description?: string
    tags?: string[]
    seo?: {
      alt?: string
      title?: string
      description?: string
    }
  }
}

export interface ContentBuilderProps {
  blocks: ContentBlock[]
  onBlocksChange: (blocks: ContentBlock[]) => void
  availableBlockTypes?: BlockType[]
  title?: string
  showHeader?: boolean
  readonly?: boolean
  onSave?: () => void
  onPreview?: () => void
}

export interface BlockType {
  type: ContentBlock['type']
  name: string
  description: string
  icon: React.ComponentType<any>
  category: 'basic' | 'media' | 'interactive' | 'layout'
  defaultContent: any
  defaultSettings?: any
}

// Default block types available
const defaultBlockTypes: BlockType[] = [
  {
    type: 'text',
    name: 'Text',
    description: 'Rich text content with formatting',
    icon: Type,
    category: 'basic',
    defaultContent: {
      html: '<p>Start typing your content here...</p>'
    }
  },
  {
    type: 'image',
    name: 'Image',
    description: 'Single image with caption',
    icon: Image,
    category: 'media',
    defaultContent: {
      src: '',
      alt: '',
      caption: ''
    }
  },
  {
    type: 'video',
    name: 'Video',
    description: 'Embedded video content',
    icon: Video,
    category: 'media',
    defaultContent: {
      src: '',
      type: 'youtube', // youtube, vimeo, upload
      title: ''
    }
  },
  {
    type: 'gallery',
    name: 'Gallery',
    description: 'Image gallery with multiple photos',
    icon: Grid3X3,
    category: 'media',
    defaultContent: {
      images: [],
      layout: 'grid', // grid, carousel, masonry
      columns: 3
    }
  },
  {
    type: 'link',
    name: 'Link Card',
    description: 'Rich link preview card',
    icon: Link,
    category: 'interactive',
    defaultContent: {
      url: '',
      title: '',
      description: '',
      thumbnail: '',
      type: 'internal' // internal, external, affiliate
    }
  },
  {
    type: 'map',
    name: 'Google Map',
    description: 'Interactive Google Maps embed',
    icon: MapPin,
    category: 'interactive',
    defaultContent: {
      location: '',
      zoom: 15,
      type: 'roadmap', // roadmap, satellite, terrain
      markers: []
    }
  },
  {
    type: 'social',
    name: 'Social Embed',
    description: 'Social media post embed',
    icon: Share2,
    category: 'interactive',
    defaultContent: {
      platform: 'twitter', // twitter, instagram, facebook, tiktok
      url: '',
      embedCode: ''
    }
  },
  {
    type: 'quote',
    name: 'Quote',
    description: 'Highlighted quote or testimonial',
    icon: Quote,
    category: 'basic',
    defaultContent: {
      text: 'Your quote text here...',
      author: '',
      source: ''
    }
  },
  {
    type: 'list',
    name: 'List',
    description: 'Bulleted or numbered list',
    icon: List,
    category: 'basic',
    defaultContent: {
      type: 'bullet', // bullet, number, checklist
      items: ['Item 1', 'Item 2', 'Item 3']
    }
  },
  {
    type: 'code',
    name: 'Code Block',
    description: 'Syntax highlighted code',
    icon: Code,
    category: 'basic',
    defaultContent: {
      code: '',
      language: 'javascript'
    }
  },
  {
    type: 'divider',
    name: 'Divider',
    description: 'Section divider or spacer',
    icon: Layout,
    category: 'layout',
    defaultContent: {
      style: 'line', // line, space, dots
      size: 'md'
    }
  }
]

export function ContentBuilder({
  blocks,
  onBlocksChange,
  availableBlockTypes = defaultBlockTypes,
  title = "Content Builder",
  showHeader = true,
  readonly = false,
  onSave,
  onPreview
}: ContentBuilderProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [editingBlock, setEditingBlock] = useState<ContentBlock | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const categories = [
    { id: 'all', label: 'All Blocks' },
    { id: 'basic', label: 'Basic' },
    { id: 'media', label: 'Media' },
    { id: 'interactive', label: 'Interactive' },
    { id: 'layout', label: 'Layout' }
  ]

  const filteredBlockTypes = selectedCategory === 'all' 
    ? availableBlockTypes 
    : availableBlockTypes.filter(bt => bt.category === selectedCategory)

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      const oldIndex = blocks.findIndex((block) => block.id === active.id)
      const newIndex = blocks.findIndex((block) => block.id === over?.id)
      
      const newBlocks = arrayMove(blocks, oldIndex, newIndex)
      onBlocksChange(newBlocks)
    }

    setActiveId(null)
  }

  const addBlock = (blockType: BlockType) => {
    const newBlock: ContentBlock = {
      id: `block-${Date.now()}`,
      type: blockType.type,
      content: { ...blockType.defaultContent },
      settings: { ...blockType.defaultSettings },
      metadata: {
        title: blockType.name,
        description: blockType.description
      }
    }

    onBlocksChange([...blocks, newBlock])
  }

  const updateBlock = (blockId: string, updates: Partial<ContentBlock>) => {
    const newBlocks = blocks.map(block => 
      block.id === blockId ? { ...block, ...updates } : block
    )
    onBlocksChange(newBlocks)
  }

  const deleteBlock = (blockId: string) => {
    const newBlocks = blocks.filter(block => block.id !== blockId)
    onBlocksChange(newBlocks)
  }

  const duplicateBlock = (blockId: string) => {
    const blockIndex = blocks.findIndex(block => block.id === blockId)
    if (blockIndex !== -1) {
      const originalBlock = blocks[blockIndex]
      const duplicatedBlock: ContentBlock = {
        ...originalBlock,
        id: `block-${Date.now()}`,
        metadata: {
          ...originalBlock.metadata,
          title: `${originalBlock.metadata?.title || ''} (Copy)`
        }
      }
      
      const newBlocks = [
        ...blocks.slice(0, blockIndex + 1),
        duplicatedBlock,
        ...blocks.slice(blockIndex + 1)
      ]
      onBlocksChange(newBlocks)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      {showHeader && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">{title}</CardTitle>
              <div className="flex items-center gap-2">
                {onPreview && (
                  <Button variant="outline" size="sm" onClick={onPreview}>
                    <Eye className="h-4 w-4 mr-1" />
                    Preview
                  </Button>
                )}
                {onSave && (
                  <Button size="sm" onClick={onSave}>
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Block Palette */}
        {!readonly && (
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Add Blocks</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {/* Category filter */}
              <div className="space-y-2 mb-4">
                {categories.map((category) => (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.id ? 'default' : 'ghost'}
                    size="sm"
                    className="w-full justify-start text-xs"
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    {category.label}
                  </Button>
                ))}
              </div>

              {/* Block types */}
              <div className="space-y-2">
                {filteredBlockTypes.map((blockType) => {
                  const IconComponent = blockType.icon
                  return (
                    <Button
                      key={blockType.type}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start p-3 h-auto"
                      onClick={() => addBlock(blockType)}
                    >
                      <div className="flex items-start gap-2 text-left">
                        <IconComponent className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{blockType.name}</div>
                          <div className="text-xs text-slate-500 line-clamp-2">
                            {blockType.description}
                          </div>
                        </div>
                      </div>
                    </Button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Content Canvas */}
        <Card className={readonly ? "lg:col-span-4" : "lg:col-span-3"}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">
                Content ({blocks.length} blocks)
              </CardTitle>
              {blocks.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {blocks.length} block{blocks.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {blocks.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Layout className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No content blocks yet</h3>
                <p className="text-sm mb-4">
                  Add your first block to get started building your content
                </p>
                {!readonly && (
                  <Button
                    variant="outline"
                    onClick={() => addBlock(defaultBlockTypes[0])}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Text Block
                  </Button>
                )}
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
                  <div className="space-y-4">
                    {blocks.map((block) => (
                      <SortableContentBlock
                        key={block.id}
                        block={block}
                        isActive={block.id === activeId}
                        readonly={readonly}
                        onUpdate={(updates) => updateBlock(block.id, updates)}
                        onDelete={() => deleteBlock(block.id)}
                        onDuplicate={() => duplicateBlock(block.id)}
                        onEdit={() => setEditingBlock(block)}
                      />
                    ))}
                  </div>
                </SortableContext>
                
                <DragOverlay adjustScale={false} className="" style={undefined} transition={undefined}>
                  {activeId && (
                    <div className="bg-white border border-slate-300 rounded-lg p-4 shadow-lg">
                      Dragging block...
                    </div>
                  )}
                </DragOverlay>
              </DndContext>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Sortable Content Block Component
function SortableContentBlock({
  block,
  isActive,
  readonly,
  onUpdate,
  onDelete,
  onDuplicate,
  onEdit
}: {
  block: ContentBlock
  isActive: boolean
  readonly: boolean
  onUpdate: (updates: Partial<ContentBlock>) => void
  onDelete: () => void
  onDuplicate: () => void
  onEdit: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: block.id, disabled: readonly })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  const getBlockTypeInfo = (type: ContentBlock['type']) => {
    const blockType = defaultBlockTypes.find(bt => bt.type === type)
    return blockType || { name: type, icon: Layout }
  }

  const { name, icon: IconComponent } = getBlockTypeInfo(block.type)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group relative border border-slate-200 rounded-lg p-4 bg-white hover:border-slate-300 transition-all
        ${isActive ? 'ring-2 ring-violet-500 border-violet-500' : ''}
      `}
    >
      {/* Block header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {!readonly && (
            <div 
              {...attributes} 
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-slate-100"
            >
              <Grip className="h-4 w-4 text-slate-400" />
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-violet-100 text-violet-700 flex items-center justify-center">
              <IconComponent className="h-3 w-3" />
            </div>
            <span className="text-sm font-medium text-slate-700">
              {block.metadata?.title || name}
            </span>
          </div>
        </div>

        {!readonly && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={onEdit}
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={onDuplicate}
            >
              <Plus className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
              onClick={onDelete}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Block content preview */}
      <div className="bg-slate-50 rounded p-3 text-sm text-slate-600">
        <BlockContentPreview block={block} />
      </div>
    </div>
  )
}

// Block Content Preview Component
function BlockContentPreview({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case 'text':
      return (
        <div dangerouslySetInnerHTML={{
          __html: sanitizeHtml(block.content.html || 'Empty text block')
        }} />
      )
    
    case 'image':
      return (
        <div className="text-center">
          {block.content.src ? (
            <div>
              <div className="text-xs text-slate-500 mb-1">Image</div>
              <div className="text-sm">{block.content.alt || 'Untitled image'}</div>
            </div>
          ) : (
            <div className="text-slate-400">No image selected</div>
          )}
        </div>
      )
    
    case 'video':
      return (
        <div className="text-center">
          <div className="text-xs text-slate-500 mb-1">Video</div>
          <div className="text-sm">
            {block.content.title || block.content.src || 'No video configured'}
          </div>
        </div>
      )
    
    case 'link':
      return (
        <div>
          <div className="text-xs text-slate-500 mb-1">Link Card</div>
          <div className="text-sm">
            {block.content.title || block.content.url || 'No link configured'}
          </div>
        </div>
      )
    
    case 'quote':
      return (
        <div>
          <div className="text-xs text-slate-500 mb-1">Quote</div>
          <div className="text-sm italic">
            "{block.content.text || 'Empty quote'}"
            {block.content.author && (
              <div className="text-xs text-slate-500 mt-1">
                — {block.content.author}
              </div>
            )}
          </div>
        </div>
      )
    
    default:
      return (
        <div>
          <div className="text-xs text-slate-500 mb-1">{block.type}</div>
          <div className="text-sm">Content block</div>
        </div>
      )
  }
}

export { defaultBlockTypes }