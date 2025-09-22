'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Upload,
  Image,
  Video,
  File,
  Search,
  Filter,
  Grid,
  List,
  Trash2,
  Download,
  Eye,
  Copy,
  Plus,
  Folder,
  FolderOpen,
  X,
  Check,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'

interface MediaFile {
  id: string
  name: string
  type: 'image' | 'video' | 'document'
  url: string
  thumbnail?: string
  size: number
  uploadedAt: string
  alt?: string
  description?: string
  tags: string[]
  folder: string
}

const mockMediaFiles: MediaFile[] = [
  {
    id: '1',
    name: 'london-bridge-sunset.jpg',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800',
    thumbnail: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=200',
    size: 2048000,
    uploadedAt: '2024-07-20T10:00:00Z',
    alt: 'London Bridge at sunset',
    description: 'Beautiful sunset view of London Bridge',
    tags: ['london', 'bridge', 'sunset', 'landmark'],
    folder: 'hero-images'
  },
  {
    id: '2',
    name: 'london-food-market.mp4',
    type: 'video',
    url: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200',
    size: 10240000,
    uploadedAt: '2024-07-19T15:30:00Z',
    alt: 'London food market video',
    description: 'Vibrant food market in London',
    tags: ['london', 'food', 'market', 'video'],
    folder: 'videos'
  },
  {
    id: '3',
    name: 'big-ben-closeup.jpg',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800',
    thumbnail: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=200',
    size: 1536000,
    uploadedAt: '2024-07-18T09:15:00Z',
    alt: 'Big Ben clock tower',
    description: 'Close-up view of Big Ben',
    tags: ['london', 'big-ben', 'clock', 'landmark'],
    folder: 'landmarks'
  }
]

const folders = [
  { name: 'All Files', count: mockMediaFiles.length },
  { name: 'hero-images', count: mockMediaFiles.filter(f => f.folder === 'hero-images').length },
  { name: 'videos', count: mockMediaFiles.filter(f => f.folder === 'videos').length },
  { name: 'landmarks', count: mockMediaFiles.filter(f => f.folder === 'landmarks').length },
  { name: 'food', count: 0 },
  { name: 'events', count: 0 }
]

export default function MediaLibraryPage() {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>(mockMediaFiles)
  const [filteredFiles, setFilteredFiles] = useState<MediaFile[]>(mockMediaFiles)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFolder, setSelectedFolder] = useState('All Files')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  useEffect(() => {
    let filtered = mediaFiles

    // Filter by folder
    if (selectedFolder !== 'All Files') {
      filtered = filtered.filter(file => file.folder === selectedFolder)
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(file =>
        file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        file.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
        file.alt?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredFiles(filtered)
  }, [mediaFiles, selectedFolder, searchTerm])

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleFileSelect = (fileId: string) => {
    setSelectedFiles(prev =>
      prev.includes(fileId)
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    )
  }

  const handleSelectAll = () => {
    if (selectedFiles.length === filteredFiles.length) {
      setSelectedFiles([])
    } else {
      setSelectedFiles(filteredFiles.map(file => file.id))
    }
  }

  const handleDeleteSelected = () => {
    if (selectedFiles.length === 0) {
      toast.error('No files selected')
      return
    }

    setMediaFiles(prev => prev.filter(file => !selectedFiles.includes(file.id)))
    setSelectedFiles([])
    toast.success(`${selectedFiles.length} file(s) deleted`)
  }

  const handleFileUpload = async (files: FileList) => {
    setIsUploading(true)
    setUploadProgress(0)
    setShowUploadModal(false)

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const progress = ((i + 1) / files.length) * 100
        setUploadProgress(progress)

        // Simulate upload
        await new Promise(resolve => setTimeout(resolve, 1000))

        const newFile: MediaFile = {
          id: Date.now().toString() + i,
          name: file.name,
          type: file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'document',
          url: URL.createObjectURL(file),
          thumbnail: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
          size: file.size,
          uploadedAt: new Date().toISOString(),
          tags: [],
          folder: selectedFolder === 'All Files' ? 'uploads' : selectedFolder
        }

        setMediaFiles(prev => [newFile, ...prev])
      }

      toast.success(`${files.length} file(s) uploaded successfully`)
    } catch (error) {
      toast.error('Failed to upload files')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files)
    }
  }

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url)
    toast.success('URL copied to clipboard')
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Folder className="h-8 w-8 text-purple-500" />
              Media Library
            </h1>
            <p className="text-gray-600 mt-1">Manage your images, videos, and documents</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowUploadModal(true)}
              className="bg-purple-500 hover:bg-purple-600"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Files
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Folders */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                Folders
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {folders.map((folder) => (
                <button
                  key={folder.name}
                  onClick={() => setSelectedFolder(folder.name)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors ${
                    selectedFolder === folder.name
                      ? 'bg-purple-100 text-purple-700 border border-purple-200'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {selectedFolder === folder.name ? (
                      <FolderOpen className="h-4 w-4" />
                    ) : (
                      <Folder className="h-4 w-4" />
                    )}
                    <span className="capitalize">{folder.name}</span>
                  </div>
                  <Badge variant="secondary">{folder.count}</Badge>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {/* Search and Controls */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search media files..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="flex items-center border rounded-lg">
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                    >
                      <Grid className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {selectedFiles.length > 0 && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-blue-700">
                      {selectedFiles.length} file(s) selected
                    </span>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                      <Button variant="destructive" size="sm" onClick={handleDeleteSelected}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upload Progress */}
          {isUploading && (
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Uploading files...</span>
                      <span className="text-sm text-gray-500">{Math.round(uploadProgress)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Media Files */}
          <div
            className={`${
              viewMode === 'grid'
                ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
                : 'space-y-2'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {filteredFiles.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <Folder className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No files found</h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm ? 'Try adjusting your search terms' : 'Upload some files to get started'}
                </p>
                <Button onClick={() => setShowUploadModal(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Files
                </Button>
              </div>
            ) : (
              filteredFiles.map((file) => (
                <Card
                  key={file.id}
                  className={`cursor-pointer transition-all duration-200 ${
                    selectedFiles.includes(file.id)
                      ? 'ring-2 ring-purple-500 bg-purple-50'
                      : 'hover:shadow-md'
                  } ${viewMode === 'list' ? 'flex items-center p-4' : ''}`}
                  onClick={() => handleFileSelect(file.id)}
                >
                  {viewMode === 'grid' ? (
                    <CardContent className="p-4">
                      <div className="relative">
                        {file.type === 'image' ? (
                          <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-3">
                            <img
                              src={file.thumbnail || file.url}
                              alt={file.alt || file.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : file.type === 'video' ? (
                          <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-3 flex items-center justify-center">
                            <Video className="h-8 w-8 text-gray-400" />
                          </div>
                        ) : (
                          <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-3 flex items-center justify-center">
                            <File className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                        
                        {selectedFiles.includes(file.id) && (
                          <div className="absolute top-2 right-2 bg-purple-500 text-white rounded-full p-1">
                            <Check className="h-3 w-3" />
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-1">
                        <h4 className="font-medium text-sm truncate" title={file.name}>
                          {file.name}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(file.size)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(file.uploadedAt)}
                        </p>
                      </div>
                    </CardContent>
                  ) : (
                    <CardContent className="flex items-center gap-4 w-full">
                      <div className="flex-shrink-0">
                        {file.type === 'image' ? (
                          <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden">
                            <img
                              src={file.thumbnail || file.url}
                              alt={file.alt || file.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : file.type === 'video' ? (
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Video className="h-6 w-6 text-gray-400" />
                          </div>
                        ) : (
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                            <File className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{file.name}</h4>
                        <p className="text-sm text-gray-500">
                          {formatFileSize(file.size)} • {formatDate(file.uploadedAt)}
                        </p>
                        {file.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {file.tags.slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {file.tags.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{file.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            copyToClipboard(file.url)
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            window.open(file.url, '_blank')
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Upload Files
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowUploadModal(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive ? 'border-purple-500 bg-purple-50' : 'border-gray-300'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Drop files here or click to browse
                </h3>
                <p className="text-gray-500 mb-4">
                  Supports images, videos, and documents
                </p>
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*,.pdf,.doc,.docx"
                  onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                  className="hidden"
                  id="file-upload"
                />
                <Button asChild>
                  <label htmlFor="file-upload" className="cursor-pointer">
                    Choose Files
                  </label>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}