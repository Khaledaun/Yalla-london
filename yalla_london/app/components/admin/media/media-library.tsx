'use client'

import React, { useState, useEffect, useCallback } from 'react'
import NextImage from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Image as ImageIcon, 
  Search, 
  Filter, 
  Grid3X3, 
  List, 
  Edit, 
  Trash2, 
  Download,
  Eye,
  Tag,
  Palette,
  FileImage,
  RefreshCw
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface MediaItem {
  id: string
  filename: string
  url: string
  type: string
  size: number
  upload_date: string
  alt_text?: string
  description?: string
  tags?: string[]
  color_palette?: string[]
  enrichment_status: 'pending' | 'processing' | 'completed' | 'failed'
  usage_count: number
}

interface MediaLibraryProps {
  onMediaSelect?: (media: MediaItem) => void
  selectionMode?: boolean
  enableEditing?: boolean
}

export default function MediaLibrary({
  onMediaSelect,
  selectionMode = false,
  enableEditing = true
}: MediaLibraryProps) {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedTag, setSelectedTag] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const { toast } = useToast()

  const fetchMediaItems = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        search: searchTerm,
        type: selectedType === 'all' ? '' : selectedType,
        tag: selectedTag === 'all' ? '' : selectedTag
      })

      const response = await fetch(`/api/admin/media?${params}`)
      if (!response.ok) throw new Error('Failed to fetch media')

      const data = await response.json()
      setMediaItems(data.data || [])
      setTotalPages(data.pagination?.pages || 1)
    } catch (error) {
      console.error('Error fetching media:', error)
      toast({
        title: "Error",
        description: "Failed to load media library",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [page, selectedType, selectedTag, searchTerm, toast])

  useEffect(() => {
    fetchMediaItems()
  }, [fetchMediaItems])

  const handleEnrichMedia = async (mediaId: string) => {
    try {
      const response = await fetch('/api/admin/media/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ media_id: mediaId })
      })

      if (!response.ok) throw new Error('Enrichment failed')

      toast({
        title: "Enrichment started",
        description: "Media enrichment is being processed"
      })

      // Refresh media items
      fetchMediaItems()
    } catch (error) {
      console.error('Enrichment error:', error)
      toast({
        title: "Enrichment failed",
        description: "Failed to start media enrichment",
        variant: "destructive"
      })
    }
  }

  const handleUpdateMedia = async (mediaId: string, updates: Partial<MediaItem>) => {
    try {
      const response = await fetch(`/api/admin/media/${mediaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (!response.ok) throw new Error('Update failed')

      toast({
        title: "Media updated",
        description: "Media information has been updated successfully"
      })

      setEditingItem(null)
      fetchMediaItems()
    } catch (error) {
      console.error('Update error:', error)
      toast({
        title: "Update failed",
        description: "Failed to update media information",
        variant: "destructive"
      })
    }
  }

  const handleDeleteMedia = async (mediaId: string) => {
    if (!confirm('Are you sure you want to delete this media item?')) return

    try {
      const response = await fetch(`/api/admin/media/${mediaId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Delete failed')

      toast({
        title: "Media deleted",
        description: "Media item has been deleted successfully"
      })

      fetchMediaItems()
    } catch (error) {
      console.error('Delete error:', error)
      toast({
        title: "Delete failed",
        description: "Failed to delete media item",
        variant: "destructive"
      })
    }
  }

  const handleItemSelect = (item: MediaItem) => {
    if (selectionMode && onMediaSelect) {
      onMediaSelect(item)
    } else {
      setSelectedItems(prev => {
        const newSelected = new Set(prev)
        if (newSelected.has(item.id)) {
          newSelected.delete(item.id)
        } else {
          newSelected.add(item.id)
        }
        return newSelected
      })
    }
  }

  const filteredItems = mediaItems.filter(item => {
    const matchesSearch = item.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.alt_text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesSearch
  })

  const uniqueTags = Array.from(new Set(mediaItems.flatMap(item => item.tags || [])))
  const fileTypes = Array.from(new Set(mediaItems.map(item => item.type.split('/')[0])))

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Media Library
          </CardTitle>
          <CardDescription>
            Manage your media files with AI-powered enrichment and tagging
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search media files..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {fileTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedTag} onValueChange={setSelectedTag}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tags</SelectItem>
                {uniqueTags.map(tag => (
                  <SelectItem key={tag} value={tag}>
                    {tag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-1">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Media Grid/List */}
      <Card>
        <CardContent className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading media...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No media files found</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {filteredItems.map((item) => (
                <MediaGridItem
                  key={item.id}
                  item={item}
                  selected={selectedItems.has(item.id)}
                  onSelect={() => handleItemSelect(item)}
                  onEdit={() => setEditingItem(item)}
                  onEnrich={() => handleEnrichMedia(item.id)}
                  onDelete={() => handleDeleteMedia(item.id)}
                  enableEditing={enableEditing}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredItems.map((item) => (
                <MediaListItem
                  key={item.id}
                  item={item}
                  selected={selectedItems.has(item.id)}
                  onSelect={() => handleItemSelect(item)}
                  onEdit={() => setEditingItem(item)}
                  onEnrich={() => handleEnrichMedia(item.id)}
                  onDelete={() => handleDeleteMedia(item.id)}
                  enableEditing={enableEditing}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="flex items-center px-4">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <MediaEditModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={(updates) => handleUpdateMedia(editingItem.id, updates)}
        />
      )}
    </div>
  )
}

interface MediaGridItemProps {
  item: MediaItem
  selected: boolean
  onSelect: () => void
  onEdit: () => void
  onEnrich: () => void
  onDelete: () => void
  enableEditing: boolean
}

function MediaGridItem({ item, selected, onSelect, onEdit, onEnrich, onDelete, enableEditing }: MediaGridItemProps) {
  const isImage = item.type.startsWith('image/')
  
  return (
    <div 
      className={`
        relative group cursor-pointer border-2 rounded-lg overflow-hidden transition-all
        ${selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'}
      `}
      onClick={onSelect}
    >
      <div className="aspect-square bg-gray-100 flex items-center justify-center">
        {isImage ? (
          <NextImage
            src={item.url}
            alt={item.alt_text || item.filename}
            width={0}
            height={0}
            sizes="100vw"
            className="w-full h-full object-cover"
            style={{ width: '100%', height: '100%' }}
            unoptimized
          />
        ) : (
          <FileImage className="h-8 w-8 text-gray-400" />
        )}
      </div>
      
      <div className="p-2">
        <p className="text-xs font-medium truncate">{item.filename}</p>
        <div className="flex items-center justify-between mt-1">
          <Badge 
            variant="outline" 
            className={`text-xs ${
              item.enrichment_status === 'completed' ? 'bg-green-100 text-green-800' :
              item.enrichment_status === 'processing' ? 'bg-blue-100 text-blue-800' :
              item.enrichment_status === 'failed' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}
          >
            {item.enrichment_status}
          </Badge>
        </div>
      </div>

      {enableEditing && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex gap-1">
            <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); onEdit() }}>
              <Edit className="h-3 w-3" />
            </Button>
            {isImage && item.enrichment_status !== 'completed' && (
              <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); onEnrich() }}>
                <RefreshCw className="h-3 w-3" />
              </Button>
            )}
            <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); onDelete() }}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

interface MediaListItemProps {
  item: MediaItem
  selected: boolean
  onSelect: () => void
  onEdit: () => void
  onEnrich: () => void
  onDelete: () => void
  enableEditing: boolean
}

function MediaListItem({ item, selected, onSelect, onEdit, onEnrich, onDelete, enableEditing }: MediaListItemProps) {
  const isImage = item.type.startsWith('image/')
  
  return (
    <div 
      className={`
        flex items-center p-3 border rounded-lg cursor-pointer transition-all
        ${selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}
      `}
      onClick={onSelect}
    >
      <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center mr-3">
        {isImage ? (
          <NextImage
            src={item.url}
            alt={item.alt_text || item.filename}
            width={48}
            height={48}
            className="w-full h-full object-cover rounded"
            unoptimized
          />
        ) : (
          <FileImage className="h-6 w-6 text-gray-400" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{item.filename}</p>
        <p className="text-sm text-gray-500">
          {(item.size / 1024 / 1024).toFixed(2)} MB • {new Date(item.upload_date).toLocaleDateString()}
        </p>
        {item.alt_text && (
          <p className="text-xs text-gray-600 truncate mt-1">{item.alt_text}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Badge 
          variant="outline"
          className={`${
            item.enrichment_status === 'completed' ? 'bg-green-100 text-green-800' :
            item.enrichment_status === 'processing' ? 'bg-blue-100 text-blue-800' :
            item.enrichment_status === 'failed' ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-800'
          }`}
        >
          {item.enrichment_status}
        </Badge>

        {item.tags && item.tags.length > 0 && (
          <div className="flex gap-1">
            {item.tags.slice(0, 2).map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {item.tags.length > 2 && (
              <Badge variant="secondary" className="text-xs">
                +{item.tags.length - 2}
              </Badge>
            )}
          </div>
        )}

        {enableEditing && (
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onEdit() }}>
              <Edit className="h-4 w-4" />
            </Button>
            {isImage && item.enrichment_status !== 'completed' && (
              <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onEnrich() }}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onDelete() }}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

interface MediaEditModalProps {
  item: MediaItem
  onClose: () => void
  onSave: (updates: Partial<MediaItem>) => void
}

function MediaEditModal({ item, onClose, onSave }: MediaEditModalProps) {
  const [altText, setAltText] = useState(item.alt_text || '')
  const [description, setDescription] = useState(item.description || '')
  const [tags, setTags] = useState(item.tags?.join(', ') || '')

  const handleSave = () => {
    onSave({
      alt_text: altText,
      description: description,
      tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-semibold mb-4">Edit Media</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Alt Text</label>
            <Input
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="Descriptive alt text for accessibility"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of the media"
              rows={3}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Tags</label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Comma-separated tags"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <Button onClick={handleSave} className="flex-1">
            Save Changes
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}