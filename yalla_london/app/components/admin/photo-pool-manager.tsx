'use client'

import { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  Upload, Image as ImageIcon, Search, Grid3X3, List, Trash2,
  Plus, Tag, FolderOpen, Copy, Check, X, Filter, Download,
  Hotel, Ticket, MapPin, Utensils, ShoppingBag, Star, Building2
} from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { useSite } from '@/components/site-provider'

// Photo categories for the pool
const PHOTO_CATEGORIES = [
  { id: 'events', label: 'Events & Matches', icon: Ticket, color: 'bg-orange-500' },
  { id: 'hotels', label: 'Hotels', icon: Hotel, color: 'bg-blue-500' },
  { id: 'restaurants', label: 'Restaurants', icon: Utensils, color: 'bg-green-500' },
  { id: 'attractions', label: 'Attractions', icon: MapPin, color: 'bg-purple-500' },
  { id: 'shopping', label: 'Shopping', icon: ShoppingBag, color: 'bg-pink-500' },
  { id: 'experiences', label: 'Experiences', icon: Star, color: 'bg-yellow-500' },
  { id: 'guides', label: 'Guides & PDFs', icon: FolderOpen, color: 'bg-teal-500' },
  { id: 'blog', label: 'Blog Posts', icon: Building2, color: 'bg-indigo-500' },
]

interface PhotoAsset {
  id: string
  url: string
  filename: string
  alt_text: string
  title: string
  category: string
  tags: string[]
  width: number
  height: number
  file_size: number
  created_at: string
  usage_count: number
}

interface UploadingFile {
  id: string
  file: File
  progress: number
  status: 'uploading' | 'complete' | 'error'
  previewUrl: string
}

export function PhotoPoolManager() {
  // Get current site context
  const { currentSite } = useSite()

  const [photos, setPhotos] = useState<PhotoAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([])
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [uploadCategory, setUploadCategory] = useState('')
  const [uploadTags, setUploadTags] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Fetch photos from API - refetch when site or category changes
  useEffect(() => {
    fetchPhotos()
  }, [selectedCategory, currentSite.id])

  const fetchPhotos = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('siteId', currentSite.id) // Include site ID
      if (selectedCategory !== 'all') params.set('category', selectedCategory)
      if (searchQuery) params.set('search', searchQuery)

      const response = await fetch(`/api/admin/photo-pool?${params}`)
      if (response.ok) {
        const data = await response.json()
        setPhotos(data.photos || [])
      }
    } catch (error) {
      console.error('Error fetching photos:', error)
      // Use mock data for demo
      setPhotos(getMockPhotos())
    } finally {
      setLoading(false)
    }
  }

  // Dropzone configuration
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadingFile[] = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      progress: 0,
      status: 'uploading' as const,
      previewUrl: URL.createObjectURL(file)
    }))

    setUploadingFiles(prev => [...prev, ...newFiles])

    // Simulate upload for each file
    newFiles.forEach(uploadFile => {
      simulateUpload(uploadFile)
    })
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    },
    maxSize: 10 * 1024 * 1024 // 10MB
  })

  const simulateUpload = async (uploadFile: UploadingFile) => {
    // Simulate progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 100))
      setUploadingFiles(prev =>
        prev.map(f => f.id === uploadFile.id ? { ...f, progress: i } : f)
      )
    }

    // Create new photo asset
    const newPhoto: PhotoAsset = {
      id: uploadFile.id,
      url: uploadFile.previewUrl,
      filename: uploadFile.file.name,
      alt_text: '',
      title: uploadFile.file.name.replace(/\.[^/.]+$/, ''),
      category: uploadCategory || 'uncategorized',
      tags: uploadTags ? uploadTags.split(',').map(t => t.trim()) : [],
      width: 1200,
      height: 800,
      file_size: uploadFile.file.size,
      created_at: new Date().toISOString(),
      usage_count: 0
    }

    setPhotos(prev => [newPhoto, ...prev])
    setUploadingFiles(prev =>
      prev.map(f => f.id === uploadFile.id ? { ...f, status: 'complete' as const } : f)
    )

    // Clear completed uploads after delay
    setTimeout(() => {
      setUploadingFiles(prev => prev.filter(f => f.id !== uploadFile.id))
    }, 2000)
  }

  const handleCopyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleDeleteSelected = async () => {
    if (selectedPhotos.length === 0) return

    // TODO: Call API to delete
    setPhotos(prev => prev.filter(p => !selectedPhotos.includes(p.id)))
    setSelectedPhotos([])
  }

  const handleBulkCategoryChange = async (category: string) => {
    // TODO: Call API to update categories
    setPhotos(prev => prev.map(p =>
      selectedPhotos.includes(p.id) ? { ...p, category } : p
    ))
    setSelectedPhotos([])
  }

  const filteredPhotos = photos.filter(photo => {
    const matchesSearch = !searchQuery ||
      photo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      photo.alt_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      photo.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesCategory = selectedCategory === 'all' || photo.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  const getCategoryStats = () => {
    const stats: Record<string, number> = { all: photos.length }
    PHOTO_CATEGORIES.forEach(cat => {
      stats[cat.id] = photos.filter(p => p.category === cat.id).length
    })
    return stats
  }

  const stats = getCategoryStats()

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <Card
          className={`cursor-pointer transition-all ${selectedCategory === 'all' ? 'ring-2 ring-primary' : ''}`}
          onClick={() => setSelectedCategory('all')}
        >
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.all}</div>
            <div className="text-xs text-gray-500">All Photos</div>
          </CardContent>
        </Card>
        {PHOTO_CATEGORIES.map(cat => {
          const Icon = cat.icon
          return (
            <Card
              key={cat.id}
              className={`cursor-pointer transition-all ${selectedCategory === cat.id ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              <CardContent className="p-4 text-center">
                <Icon className={`w-5 h-5 mx-auto mb-1 ${cat.color.replace('bg-', 'text-')}`} />
                <div className="text-xl font-bold text-gray-900">{stats[cat.id] || 0}</div>
                <div className="text-xs text-gray-500 truncate">{cat.label}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Actions Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search photos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>

              <div className="flex items-center gap-2 border rounded-lg p-1">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {selectedPhotos.length > 0 && (
                <>
                  <span className="text-sm text-gray-500">{selectedPhotos.length} selected</span>
                  <Select onValueChange={handleBulkCategoryChange}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Move to..." />
                    </SelectTrigger>
                    <SelectContent>
                      {PHOTO_CATEGORIES.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="destructive" size="sm" onClick={handleDeleteSelected}>
                    <Trash2 className="w-4 h-4 mr-1" /> Delete
                  </Button>
                </>
              )}

              <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-[#1C1917] hover:bg-[#3D3835]">
                    <Upload className="w-4 h-4 mr-2" /> Upload Photos
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Upload Photos to Pool</DialogTitle>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Category</Label>
                        <Select value={uploadCategory} onValueChange={setUploadCategory}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category..." />
                          </SelectTrigger>
                          <SelectContent>
                            {PHOTO_CATEGORIES.map(cat => (
                              <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Tags (comma separated)</Label>
                        <Input
                          placeholder="london, landmark, night..."
                          value={uploadTags}
                          onChange={(e) => setUploadTags(e.target.value)}
                        />
                      </div>
                    </div>

                    <div
                      {...getRootProps()}
                      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                        isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <input {...getInputProps()} />
                      <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-600 mb-2">
                        {isDragActive ? 'Drop files here...' : 'Drag & drop photos here, or click to select'}
                      </p>
                      <p className="text-sm text-gray-400">PNG, JPG, WebP up to 10MB each</p>
                    </div>

                    {/* Upload Progress */}
                    {uploadingFiles.length > 0 && (
                      <div className="space-y-2">
                        {uploadingFiles.map(file => (
                          <div key={file.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                            <img src={file.previewUrl} alt="" className="w-12 h-12 object-cover rounded" />
                            <div className="flex-1">
                              <div className="text-sm font-medium truncate">{file.file.name}</div>
                              <div className="h-2 bg-gray-200 rounded-full mt-1">
                                <div
                                  className="h-full bg-[#C8322B] rounded-full transition-all"
                                  style={{ width: `${file.progress}%` }}
                                />
                              </div>
                            </div>
                            {file.status === 'complete' && <Check className="w-5 h-5 text-green-500" />}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Photo Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-square bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredPhotos.map(photo => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              isSelected={selectedPhotos.includes(photo.id)}
              onSelect={() => {
                setSelectedPhotos(prev =>
                  prev.includes(photo.id)
                    ? prev.filter(id => id !== photo.id)
                    : [...prev, photo.id]
                )
              }}
              onCopyUrl={() => handleCopyUrl(photo.url, photo.id)}
              isCopied={copiedId === photo.id}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-left text-xs font-medium text-gray-500">Preview</th>
                  <th className="p-3 text-left text-xs font-medium text-gray-500">Title</th>
                  <th className="p-3 text-left text-xs font-medium text-gray-500">Category</th>
                  <th className="p-3 text-left text-xs font-medium text-gray-500">Tags</th>
                  <th className="p-3 text-left text-xs font-medium text-gray-500">Size</th>
                  <th className="p-3 text-left text-xs font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredPhotos.map(photo => (
                  <tr key={photo.id} className="hover:bg-gray-50">
                    <td className="p-3">
                      <img src={photo.url} alt={photo.alt_text} className="w-16 h-12 object-cover rounded" />
                    </td>
                    <td className="p-3 font-medium">{photo.title}</td>
                    <td className="p-3">
                      <Badge variant="secondary">{photo.category}</Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1 flex-wrap">
                        {photo.tags.slice(0, 3).map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 text-sm text-gray-500">{formatFileSize(photo.file_size)}</td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyUrl(photo.url, photo.id)}
                        >
                          {copiedId === photo.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {filteredPhotos.length === 0 && !loading && (
        <Card>
          <CardContent className="p-12 text-center">
            <ImageIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No photos found</h3>
            <p className="text-gray-500 mb-4">
              {searchQuery ? 'Try a different search term' : 'Upload some photos to get started'}
            </p>
            <Button onClick={() => setIsUploadDialogOpen(true)}>
              <Upload className="w-4 h-4 mr-2" /> Upload Photos
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Photo Card Component
function PhotoCard({
  photo,
  isSelected,
  onSelect,
  onCopyUrl,
  isCopied
}: {
  photo: PhotoAsset
  isSelected: boolean
  onSelect: () => void
  onCopyUrl: () => void
  isCopied: boolean
}) {
  const [showActions, setShowActions] = useState(false)
  const category = PHOTO_CATEGORIES.find(c => c.id === photo.category)

  return (
    <div
      className={`relative group rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
        isSelected ? 'border-[#C8322B] ring-2 ring-[#C8322B]/20' : 'border-transparent hover:border-gray-200'
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onClick={onSelect}
    >
      <div className="aspect-square">
        <img
          src={photo.url}
          alt={photo.alt_text || photo.title}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Category Badge */}
      {category && (
        <div className={`absolute top-2 left-2 ${category.color} text-white text-xs px-2 py-1 rounded`}>
          {category.label}
        </div>
      )}

      {/* Selection Checkbox */}
      <div className={`absolute top-2 right-2 w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
        isSelected ? 'bg-[#C8322B] border-[#C8322B]' : 'bg-white/80 border-gray-300'
      }`}>
        {isSelected && <Check className="w-4 h-4 text-white" />}
      </div>

      {/* Hover Actions */}
      {showActions && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onCopyUrl() }}
          >
            {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
      )}

      {/* Title */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-3">
        <p className="text-white text-sm font-medium truncate">{photo.title}</p>
        <div className="flex gap-1 mt-1">
          {photo.tags.slice(0, 2).map(tag => (
            <span key={tag} className="text-white/70 text-xs">#{tag}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

// Helper functions
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function getMockPhotos(): PhotoAsset[] {
  return [
    {
      id: '1',
      url: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=600&q=80',
      filename: 'emirates-stadium.jpg',
      alt_text: 'Emirates Stadium at night',
      title: 'Emirates Stadium',
      category: 'events',
      tags: ['football', 'arsenal', 'stadium'],
      width: 1200,
      height: 800,
      file_size: 245000,
      created_at: new Date().toISOString(),
      usage_count: 3
    },
    {
      id: '2',
      url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80',
      filename: 'luxury-hotel.jpg',
      alt_text: 'Luxury hotel lobby',
      title: 'The Dorchester Lobby',
      category: 'hotels',
      tags: ['luxury', 'mayfair', 'hotel'],
      width: 1200,
      height: 800,
      file_size: 320000,
      created_at: new Date().toISOString(),
      usage_count: 5
    },
    {
      id: '3',
      url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80',
      filename: 'halal-restaurant.jpg',
      alt_text: 'Fine dining restaurant',
      title: 'Halal Fine Dining',
      category: 'restaurants',
      tags: ['halal', 'fine-dining', 'arabic'],
      width: 1200,
      height: 800,
      file_size: 180000,
      created_at: new Date().toISOString(),
      usage_count: 8
    },
    {
      id: '4',
      url: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&q=80',
      filename: 'tower-bridge.jpg',
      alt_text: 'Tower Bridge London',
      title: 'Tower Bridge',
      category: 'attractions',
      tags: ['landmark', 'bridge', 'thames'],
      width: 1200,
      height: 800,
      file_size: 290000,
      created_at: new Date().toISOString(),
      usage_count: 12
    },
    {
      id: '5',
      url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&q=80',
      filename: 'harrods.jpg',
      alt_text: 'Harrods department store',
      title: 'Harrods Shopping',
      category: 'shopping',
      tags: ['luxury', 'harrods', 'shopping'],
      width: 1200,
      height: 800,
      file_size: 210000,
      created_at: new Date().toISOString(),
      usage_count: 6
    },
    {
      id: '6',
      url: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=600&q=80',
      filename: 'west-end-theatre.jpg',
      alt_text: 'West End theatre at night',
      title: 'West End Theatre',
      category: 'events',
      tags: ['theatre', 'west-end', 'night'],
      width: 1200,
      height: 800,
      file_size: 195000,
      created_at: new Date().toISOString(),
      usage_count: 4
    },
  ]
}
