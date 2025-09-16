'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'
import { 
  FileText,
  Eye,
  Save,
  Monitor,
  Smartphone,
  Tablet,
  Palette,
  Type,
  Layout,
  Plus,
  Trash2,
  Edit,
  Move,
  Copy,
  Settings,
  Grid,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
  List,
  Link,
  Image as ImageIcon,
  Video,
  Quote,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Paragraph,
  Separator,
  Table,
  Calendar,
  MapPin,
  Star,
  Users,
  Mail,
  Phone,
  Globe,
  Shield,
  Lock,
  Database,
  Cookie,
  UserCheck,
  Scale,
  Clock,
  CheckCircle
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface PageBlock {
  id: string
  type: 'heading' | 'paragraph' | 'list' | 'table' | 'divider' | 'contact' | 'legal-section' | 'custom-html'
  content: any
  style?: {
    fontSize?: string
    fontWeight?: string
    textAlign?: 'left' | 'center' | 'right'
    color?: string
    backgroundColor?: string
    padding?: string
    margin?: string
  }
}

interface PrivacyPage {
  id: string
  title: string
  slug: string
  lastModified: Date
  publishedAt?: Date
  status: 'draft' | 'published'
  metaTitle: string
  metaDescription: string
  blocks: PageBlock[]
  customCSS: string
  schema: any // JSON-LD schema
}

const SortableBlock = ({ 
  block, 
  onEdit, 
  onDelete, 
  isSelected, 
  onSelect 
}: { 
  block: PageBlock
  onEdit: (block: PageBlock) => void
  onDelete: (blockId: string) => void
  isSelected: boolean
  onSelect: (blockId: string) => void
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: block.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const getBlockIcon = (type: string) => {
    switch (type) {
      case 'heading': return <Heading1 className="h-4 w-4" />
      case 'paragraph': return <Paragraph className="h-4 w-4" />
      case 'list': return <List className="h-4 w-4" />
      case 'table': return <Table className="h-4 w-4" />
      case 'divider': return <Separator className="h-4 w-4" />
      case 'contact': return <Mail className="h-4 w-4" />
      case 'legal-section': return <Scale className="h-4 w-4" />
      case 'custom-html': return <Code className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const renderBlockPreview = (block: PageBlock) => {
    switch (block.type) {
      case 'heading':
        const HeadingTag = block.content.level === 1 ? 'h1' : block.content.level === 2 ? 'h2' : 'h3'
        return React.createElement(HeadingTag, {
          className: `font-bold ${block.content.level === 1 ? 'text-2xl' : block.content.level === 2 ? 'text-xl' : 'text-lg'}`,
          style: block.style
        }, block.content.text || 'Heading')
      
      case 'paragraph':
        return (
          <p className="text-gray-700" style={block.style}>
            {block.content.text || 'Paragraph text...'}
          </p>
        )
      
      case 'list':
        return (
          <ul className="list-disc pl-6" style={block.style}>
            {(block.content.items || ['List item 1', 'List item 2']).map((item: string, index: number) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        )
      
      case 'divider':
        return <hr className="border-gray-300" style={block.style} />
      
      case 'contact':
        return (
          <div className="border border-gray-200 rounded-lg p-4" style={block.style}>
            <h3 className="font-medium mb-2">Contact Information</h3>
            <div className="space-y-1 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4" />
                <span>{block.content.email || 'contact@example.com'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4" />
                <span>{block.content.phone || '+44 20 1234 5678'}</span>
              </div>
            </div>
          </div>
        )
      
      case 'legal-section':
        return (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4" style={block.style}>
            <h3 className="font-medium mb-2 flex items-center space-x-2">
              <Scale className="h-4 w-4" />
              <span>{block.content.title || 'Legal Section'}</span>
            </h3>
            <p className="text-sm text-gray-600">{block.content.content || 'Legal content...'}</p>
          </div>
        )
      
      default:
        return <div className="text-gray-500">Unknown block type</div>
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        border rounded-lg p-4 cursor-pointer transition-all
        ${isSelected ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-200 hover:border-gray-300'}
      `}
      onClick={() => onSelect(block.id)}
    >
      {/* Block Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab hover:cursor-grabbing p-1 hover:bg-gray-100 rounded"
          >
            <Move className="h-4 w-4 text-gray-400" />
          </button>
          {getBlockIcon(block.type)}
          <Badge variant="outline" className="text-xs">
            {block.type.replace('-', ' ')}
          </Badge>
        </div>
        
        <div className="flex items-center space-x-1">
          <Button variant="ghost" size="sm" onClick={() => onEdit(block)}>
            <Edit className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(block.id)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Block Preview */}
      <div className="pointer-events-none">
        {renderBlockPreview(block)}
      </div>
    </div>
  )
}

export function PrivacyPageEditor() {
  const { toast } = useToast()
  const [page, setPage] = useState<PrivacyPage>({
    id: 'privacy-page',
    title: 'Privacy Policy',
    slug: 'privacy',
    lastModified: new Date(),
    status: 'published',
    metaTitle: 'Privacy Policy - Yalla London',
    metaDescription: 'Learn about how we collect, use, and protect your personal information.',
    customCSS: '',
    schema: {},
    blocks: [
      {
        id: '1',
        type: 'heading',
        content: { text: 'Privacy Policy', level: 1 },
        style: { textAlign: 'center', fontSize: '2.5rem', fontWeight: 'bold' }
      },
      {
        id: '2',
        type: 'paragraph',
        content: { text: 'Last updated: ' + new Date().toLocaleDateString() }
      },
      {
        id: '3',
        type: 'legal-section',
        content: {
          title: 'Information We Collect',
          content: 'We collect information you provide directly to us, such as when you create an account, make a purchase, or contact us for support.'
        }
      },
      {
        id: '4',
        type: 'legal-section',
        content: {
          title: 'How We Use Your Information',
          content: 'We use the information we collect to provide, maintain, and improve our services, process transactions, and communicate with you.'
        }
      },
      {
        id: '5',
        type: 'contact',
        content: {
          email: 'privacy@yallalondon.com',
          phone: '+44 20 1234 5678'
        }
      }
    ]
  })

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [editingBlock, setEditingBlock] = useState<PageBlock | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [showBlockLibrary, setShowBlockLibrary] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: any) => {
    const { active, over } = event

    if (active.id !== over.id) {
      setPage(prev => ({
        ...prev,
        blocks: arrayMove(
          prev.blocks,
          prev.blocks.findIndex(block => block.id === active.id),
          prev.blocks.findIndex(block => block.id === over.id)
        )
      }))
    }
  }

  const addBlock = (type: PageBlock['type']) => {
    const newBlock: PageBlock = {
      id: Date.now().toString(),
      type,
      content: getDefaultContent(type)
    }

    setPage(prev => ({
      ...prev,
      blocks: [...prev.blocks, newBlock]
    }))

    setShowBlockLibrary(false)
    setSelectedBlockId(newBlock.id)
  }

  const getDefaultContent = (type: PageBlock['type']) => {
    switch (type) {
      case 'heading':
        return { text: 'New Heading', level: 2 }
      case 'paragraph':
        return { text: 'New paragraph content...' }
      case 'list':
        return { items: ['List item 1', 'List item 2'] }
      case 'contact':
        return { email: 'contact@example.com', phone: '+44 20 1234 5678' }
      case 'legal-section':
        return { title: 'Legal Section Title', content: 'Legal section content...' }
      case 'custom-html':
        return { html: '<div>Custom HTML content</div>' }
      default:
        return {}
    }
  }

  const editBlock = (block: PageBlock) => {
    setEditingBlock({ ...block })
    setIsEditDialogOpen(true)
  }

  const saveBlockEdit = () => {
    if (!editingBlock) return

    setPage(prev => ({
      ...prev,
      blocks: prev.blocks.map(block => 
        block.id === editingBlock.id ? editingBlock : block
      )
    }))

    setIsEditDialogOpen(false)
    setEditingBlock(null)
    
    toast({
      title: "Block Updated",
      description: "Your changes have been saved.",
    })
  }

  const deleteBlock = (blockId: string) => {
    setPage(prev => ({
      ...prev,
      blocks: prev.blocks.filter(block => block.id !== blockId)
    }))
    
    if (selectedBlockId === blockId) {
      setSelectedBlockId(null)
    }
    
    toast({
      title: "Block Deleted",
      description: "The block has been removed from the page.",
    })
  }

  const savePage = async () => {
    setPage(prev => ({ ...prev, lastModified: new Date() }))
    
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    toast({
      title: "Page Saved",
      description: "Your privacy page has been updated successfully.",
    })
  }

  const publishPage = async () => {
    setPage(prev => ({ 
      ...prev, 
      status: 'published',
      publishedAt: new Date(),
      lastModified: new Date()
    }))
    
    // Simulate publish
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    toast({
      title: "Page Published",
      description: "Your privacy page is now live on the website.",
    })
  }

  const blockLibraryItems = [
    { type: 'heading' as const, icon: Heading1, label: 'Heading', description: 'Add a section heading' },
    { type: 'paragraph' as const, icon: Paragraph, label: 'Paragraph', description: 'Add text content' },
    { type: 'list' as const, icon: List, label: 'List', description: 'Add bulleted or numbered list' },
    { type: 'divider' as const, icon: Separator, label: 'Divider', description: 'Add a horizontal line' },
    { type: 'legal-section' as const, icon: Scale, label: 'Legal Section', description: 'Add structured legal content' },
    { type: 'contact' as const, icon: Mail, label: 'Contact Info', description: 'Add contact information block' },
    { type: 'custom-html' as const, icon: Code, label: 'Custom HTML', description: 'Add custom HTML content' },
  ]

  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Page Settings & Block Library */}
        <div className="space-y-6">
          {/* Page Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Page Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Page Title</Label>
                <Input
                  id="title"
                  value={page.title}
                  onChange={(e) => setPage(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="slug">URL Slug</Label>
                <Input
                  id="slug"
                  value={page.slug}
                  onChange={(e) => setPage(prev => ({ ...prev, slug: e.target.value }))}
                />
              </div>
              
              <div>
                <Label>Status</Label>
                <Badge variant={page.status === 'published' ? 'default' : 'secondary'}>
                  {page.status}
                </Badge>
              </div>
              
              <div className="flex space-x-2">
                <Button variant="outline" className="flex-1" onClick={savePage}>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
                <Button className="flex-1" onClick={publishPage}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Publish
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Block Library */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Plus className="h-5 w-5" />
                <span>Add Blocks</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-2">
                {blockLibraryItems.map(item => (
                  <Button
                    key={item.type}
                    variant="outline"
                    className="justify-start h-auto p-3"
                    onClick={() => addBlock(item.type)}
                  >
                    <div className="flex items-start space-x-3">
                      <item.icon className="h-5 w-5 mt-0.5 text-gray-500" />
                      <div className="text-left">
                        <div className="font-medium text-sm">{item.label}</div>
                        <div className="text-xs text-gray-500">{item.description}</div>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* SEO Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Globe className="h-5 w-5" />
                <span>SEO</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="meta-title">Meta Title</Label>
                <Input
                  id="meta-title"
                  value={page.metaTitle}
                  onChange={(e) => setPage(prev => ({ ...prev, metaTitle: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="meta-description">Meta Description</Label>
                <Textarea
                  id="meta-description"
                  value={page.metaDescription}
                  onChange={(e) => setPage(prev => ({ ...prev, metaDescription: e.target.value }))}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Editor */}
        <div className="lg:col-span-3 space-y-6">
          {/* Preview Controls */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">Preview:</span>
                  <div className="flex border rounded-md">
                    <Button
                      variant={previewMode === 'desktop' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setPreviewMode('desktop')}
                    >
                      <Monitor className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={previewMode === 'tablet' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setPreviewMode('tablet')}
                    >
                      <Tablet className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={previewMode === 'mobile' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setPreviewMode('mobile')}
                    >
                      <Smartphone className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    Preview Live
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Page Editor */}
          <Card>
            <CardContent className="p-6">
              <div className={`
                mx-auto transition-all duration-300
                ${previewMode === 'desktop' ? 'max-w-none' : 
                  previewMode === 'tablet' ? 'max-w-2xl' : 'max-w-sm'}
              `}>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={page.blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-4">
                      {page.blocks.map(block => (
                        <SortableBlock
                          key={block.id}
                          block={block}
                          onEdit={editBlock}
                          onDelete={deleteBlock}
                          isSelected={selectedBlockId === block.id}
                          onSelect={setSelectedBlockId}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>

                {page.blocks.length === 0 && (
                  <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                    <FileText className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No content blocks</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Start building your privacy page by adding content blocks.
                    </p>
                    <Button 
                      className="mt-4"
                      onClick={() => setShowBlockLibrary(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Block
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Block Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Block</DialogTitle>
          </DialogHeader>
          
          {editingBlock && (
            <div className="space-y-4">
              {editingBlock.type === 'heading' && (
                <>
                  <div>
                    <Label htmlFor="heading-text">Heading Text</Label>
                    <Input
                      id="heading-text"
                      value={editingBlock.content.text || ''}
                      onChange={(e) => setEditingBlock(prev => prev ? {
                        ...prev,
                        content: { ...prev.content, text: e.target.value }
                      } : null)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="heading-level">Heading Level</Label>
                    <Select
                      value={editingBlock.content.level?.toString() || '2'}
                      onValueChange={(value) => setEditingBlock(prev => prev ? {
                        ...prev,
                        content: { ...prev.content, level: parseInt(value) }
                      } : null)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">H1 - Main Title</SelectItem>
                        <SelectItem value="2">H2 - Section Title</SelectItem>
                        <SelectItem value="3">H3 - Subsection</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {editingBlock.type === 'paragraph' && (
                <div>
                  <Label htmlFor="paragraph-text">Text Content</Label>
                  <Textarea
                    id="paragraph-text"
                    value={editingBlock.content.text || ''}
                    onChange={(e) => setEditingBlock(prev => prev ? {
                      ...prev,
                      content: { ...prev.content, text: e.target.value }
                    } : null)}
                    rows={4}
                  />
                </div>
              )}

              {editingBlock.type === 'legal-section' && (
                <>
                  <div>
                    <Label htmlFor="legal-title">Section Title</Label>
                    <Input
                      id="legal-title"
                      value={editingBlock.content.title || ''}
                      onChange={(e) => setEditingBlock(prev => prev ? {
                        ...prev,
                        content: { ...prev.content, title: e.target.value }
                      } : null)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="legal-content">Content</Label>
                    <Textarea
                      id="legal-content"
                      value={editingBlock.content.content || ''}
                      onChange={(e) => setEditingBlock(prev => prev ? {
                        ...prev,
                        content: { ...prev.content, content: e.target.value }
                      } : null)}
                      rows={6}
                    />
                  </div>
                </>
              )}

              {editingBlock.type === 'contact' && (
                <>
                  <div>
                    <Label htmlFor="contact-email">Email</Label>
                    <Input
                      id="contact-email"
                      type="email"
                      value={editingBlock.content.email || ''}
                      onChange={(e) => setEditingBlock(prev => prev ? {
                        ...prev,
                        content: { ...prev.content, email: e.target.value }
                      } : null)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact-phone">Phone</Label>
                    <Input
                      id="contact-phone"
                      value={editingBlock.content.phone || ''}
                      onChange={(e) => setEditingBlock(prev => prev ? {
                        ...prev,
                        content: { ...prev.content, phone: e.target.value }
                      } : null)}
                    />
                  </div>
                </>
              )}

              {/* Style Options */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Style Options</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="text-align">Text Alignment</Label>
                    <Select
                      value={editingBlock.style?.textAlign || 'left'}
                      onValueChange={(value: 'left' | 'center' | 'right') => setEditingBlock(prev => prev ? {
                        ...prev,
                        style: { ...prev.style, textAlign: value }
                      } : null)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">Left</SelectItem>
                        <SelectItem value="center">Center</SelectItem>
                        <SelectItem value="right">Right</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="font-weight">Font Weight</Label>
                    <Select
                      value={editingBlock.style?.fontWeight || 'normal'}
                      onValueChange={(value) => setEditingBlock(prev => prev ? {
                        ...prev,
                        style: { ...prev.style, fontWeight: value }
                      } : null)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="semibold">Semibold</SelectItem>
                        <SelectItem value="bold">Bold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={saveBlockEdit}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}