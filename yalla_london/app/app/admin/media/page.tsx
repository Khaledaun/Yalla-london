'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { PremiumAdminLayout } from '@/src/components/admin/premium-admin-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useDropzone } from 'react-dropzone'
import { 
  Upload, 
  Image as ImageIcon, 
  Video, 
  FileText, 
  Download, 
  Trash2,
  Edit,
  Search,
  Filter,
  Grid3X3,
  List,
  Play,
  Pause,
  X,
  Eye,
  Copy,
  Share,
  Tag,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'

interface MediaFile {
  id: string
  name: string
  originalName: string
  type: 'image' | 'video' | 'document' | 'audio'
  mimeType: string
  size: number
  url: string
  thumbnailUrl?: string
  altText?: string
  caption?: string
  tags: string[]
  dimensions?: {
    width: number
    height: number
  }
  duration?: number
  uploadedAt: string
  lastModified: string
  usageCount: number
  relatedContent: string[]
  metadata: {
    camera?: string
    location?: string
    author?: string
    copyright?: string
  }
}

interface UploadProgress {
  id: string
  file: File
  progress: number
  status: 'uploading' | 'processing' | 'completed' | 'error'
  error?: string
  result?: MediaFile
  eta?: number
}

const mockMediaFiles: MediaFile[] = [
  {
    id: '1',
    name: 'london-bridge-sunset.jpg',
    originalName: 'IMG_20240112_180045.jpg',
    type: 'image',
    mimeType: 'image/jpeg',
    size: 2845760,
    url: '/images/london-bridge-sunset.jpg',
    thumbnailUrl: '/images/thumbs/london-bridge-sunset.jpg',
    altText: 'London Bridge at sunset with golden light reflecting on the Thames',
    caption: 'Beautiful sunset view of London Bridge from the South Bank',
    tags: ['london', 'bridge', 'sunset', 'thames', 'architecture'],
    dimensions: { width: 1920, height: 1080 },
    uploadedAt: '2024-01-12T18:30:00Z',
    lastModified: '2024-01-12T18:30:00Z',
    usageCount: 3,
    relatedContent: ['london-bridge-guide', 'south-bank-walk'],
    metadata: {
      camera: 'iPhone 14 Pro',
      location: 'London Bridge, London',
      author: 'Yalla London Team'
    }
  },
  {
    id: '2',
    name: 'halal-restaurant-interior.jpg',
    originalName: 'restaurant_001.jpg',
    type: 'image',
    mimeType: 'image/jpeg',
    size: 1834560,
    url: '/images/halal-restaurant-interior.jpg',
    thumbnailUrl: '/images/thumbs/halal-restaurant-interior.jpg',
    altText: 'Interior of modern halal restaurant with contemporary decor',
    caption: 'Stylish interior of Maroush restaurant in Edgware Road',
    tags: ['restaurant', 'halal', 'interior', 'dining', 'maroush'],
    dimensions: { width: 1600, height: 1200 },
    uploadedAt: '2024-01-11T14:20:00Z',
    lastModified: '2024-01-11T14:20:00Z',
    usageCount: 5,
    relatedContent: ['maroush-review', 'halal-dining-guide'],
    metadata: {
      location: 'Edgware Road, London',
      author: 'Food Review Team'
    }
  },
  {
    id: '3',
    name: 'london-events-video.mp4',
    originalName: 'VID_20240110_150000.mp4',
    type: 'video',
    mimeType: 'video/mp4',
    size: 45678900,
    url: '/videos/london-events-video.mp4',
    thumbnailUrl: '/images/thumbs/london-events-video.jpg',
    altText: 'Video showcasing various London cultural events and festivals',
    caption: 'Highlights from London cultural events throughout the year',
    tags: ['events', 'culture', 'festivals', 'london', 'highlights'],
    dimensions: { width: 1920, height: 1080 },
    duration: 125,
    uploadedAt: '2024-01-10T16:45:00Z',
    lastModified: '2024-01-10T16:45:00Z',
    usageCount: 2,
    relatedContent: ['london-events-guide'],
    metadata: {
      author: 'Video Production Team',
      copyright: 'Yalla London 2024'
    }
  }
]

export default function MediaPage() {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>(mockMediaFiles)
  const [uploads, setUploads] = useState<UploadProgress[]>([])
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedTag, setSelectedTag] = useState<string>('all')
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newUploads: UploadProgress[] = acceptedFiles.map(file => ({
      id: Date.now().toString() + Math.random().toString(36).substr(2),
      file,
      progress: 0,
      status: 'uploading',
      eta: Math.floor(Math.random() * 30) + 10 // Random ETA for demo
    }))

    setUploads(prev => [...prev, ...newUploads])

    // Simulate upload progress
    newUploads.forEach(upload => {
      simulateUpload(upload.id)
    })
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
      'video/*': ['.mp4', '.mov', '.avi', '.mkv'],
      'application/pdf': ['.pdf'],
      'audio/*': ['.mp3', '.wav', '.ogg']
    },
    multiple: true
  })

  const simulateUpload = (uploadId: string) => {
    const interval = setInterval(() => {
      setUploads(prev => prev.map(upload => {
        if (upload.id === uploadId) {
          const newProgress = Math.min(upload.progress + Math.random() * 15, 100)
          const newEta = newProgress < 100 ? Math.max(upload.eta! - 1, 1) : 0

          if (newProgress >= 100) {
            clearInterval(interval)
            
            // Simulate processing phase
            setTimeout(() => {
              setUploads(prev2 => prev2.map(u => 
                u.id === uploadId ? { ...u, status: 'processing' } : u
              ))
              
              // Complete upload
              setTimeout(() => {
                const mockFile: MediaFile = {
                  id: uploadId,
                  name: upload.file.name.toLowerCase().replace(/\s+/g, '-'),
                  originalName: upload.file.name,
                  type: upload.file.type.startsWith('image/') ? 'image' : 
                        upload.file.type.startsWith('video/') ? 'video' : 
                        upload.file.type.startsWith('audio/') ? 'audio' : 'document',
                  mimeType: upload.file.type,
                  size: upload.file.size,
                  url: URL.createObjectURL(upload.file),
                  thumbnailUrl: upload.file.type.startsWith('image/') ? URL.createObjectURL(upload.file) : undefined,
                  tags: [],
                  uploadedAt: new Date().toISOString(),
                  lastModified: new Date().toISOString(),
                  usageCount: 0,
                  relatedContent: [],
                  metadata: {}
                }

                setMediaFiles(prev => [mockFile, ...prev])
                setUploads(prev2 => prev2.map(u => 
                  u.id === uploadId ? { ...u, status: 'completed', result: mockFile } : u
                ))

                // Remove completed upload after delay
                setTimeout(() => {
                  setUploads(prev3 => prev3.filter(u => u.id !== uploadId))
                }, 3000)
              }, 2000)
            }, 1000)

            return { ...upload, progress: 100, eta: 0 }
          }

          return { ...upload, progress: newProgress, eta: newEta }
        }
        return upload
      }))
    }, 500)
  }

  const filteredFiles = mediaFiles.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         file.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
                         (file.altText && file.altText.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesType = selectedType === 'all' || file.type === selectedType
    const matchesTag = selectedTag === 'all' || file.tags.includes(selectedTag)
    
    return matchesSearch && matchesType && matchesTag
  })

  const allTags = Array.from(new Set(mediaFiles.flatMap(file => file.tags)))

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Byte'
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)).toString())
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleDeleteFile = (fileId: string) => {
    setMediaFiles(prev => prev.filter(file => file.id !== fileId))
    setSelectedFiles(prev => {
      const newSet = new Set(prev)
      newSet.delete(fileId)
      return newSet
    })
  }

  const handleToggleSelect = (fileId: string) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev)
      if (newSet.has(fileId)) {
        newSet.delete(fileId)
      } else {
        newSet.add(fileId)
      }
      return newSet
    })
  }

  const handleCancelUpload = (uploadId: string) => {
    setUploads(prev => prev.filter(upload => upload.id !== uploadId))
  }

  const handleRetryUpload = (uploadId: string) => {
    setUploads(prev => prev.map(upload => 
      upload.id === uploadId ? { ...upload, status: 'uploading', progress: 0, error: undefined } : upload
    ))
    simulateUpload(uploadId)
  }

  return (
    <PremiumAdminLayout 
      title="Media Library"
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Media' }
      ]}
      actions={
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
          </Button>
          <Button 
            onClick={() => setShowUploadModal(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Media
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Upload Progress */}
        {uploads.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {uploads.map((upload) => (
                  <div key={upload.id} className="flex items-center gap-4 p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{upload.file.name}</span>
                        <div className="flex items-center gap-2">
                          {upload.status === 'uploading' && (
                            <span className="text-xs text-gray-500">
                              ETA: {upload.eta}s
                            </span>
                          )}
                          {upload.status === 'completed' && (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          )}
                          {upload.status === 'error' && (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => upload.status === 'error' ? 
                              handleRetryUpload(upload.id) : 
                              handleCancelUpload(upload.id)}
                          >
                            {upload.status === 'error' ? 'Retry' : <X className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={upload.progress} className="flex-1" />
                        <span className="text-xs text-gray-500 min-w-[3rem]">
                          {Math.round(upload.progress)}%
                        </span>
                      </div>
                      {upload.status === 'processing' && (
                        <p className="text-xs text-blue-600 mt-1">Processing...</p>
                      )}
                      {upload.error && (
                        <p className="text-xs text-red-600 mt-1">{upload.error}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-64">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search media files..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <select 
                value={selectedType} 
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Types</option>
                <option value="image">Images</option>
                <option value="video">Videos</option>
                <option value="document">Documents</option>
                <option value="audio">Audio</option>
              </select>
              
              <select 
                value={selectedTag} 
                onChange={(e) => setSelectedTag(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Tags</option>
                {allTags.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
              
              {selectedFiles.size > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {selectedFiles.size} selected
                  </Badge>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      Array.from(selectedFiles).forEach(handleDeleteFile)
                      setSelectedFiles(new Set())
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Media Grid/List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Media Files ({filteredFiles.length})</span>
              <div className="text-sm text-gray-500">
                Total: {formatFileSize(mediaFiles.reduce((acc, file) => acc + file.size, 0))}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredFiles.map((file) => (
                  <div 
                    key={file.id} 
                    className={`border rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer ${
                      selectedFiles.has(file.id) ? 'ring-2 ring-blue-500' : ''
                    }`}
                  >
                    <div className="relative aspect-video bg-gray-100">
                      {file.type === 'image' && file.thumbnailUrl && (
                        <img 
                          src={file.thumbnailUrl} 
                          alt={file.altText}
                          className="w-full h-full object-cover"
                        />
                      )}
                      {file.type === 'video' && (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200">
                          <Video className="h-12 w-12 text-gray-400" />
                          {file.duration && (
                            <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                              {formatDuration(file.duration)}
                            </div>
                          )}
                        </div>
                      )}
                      {file.type === 'document' && (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200">
                          <FileText className="h-12 w-12 text-gray-400" />
                        </div>
                      )}
                      
                      <div className="absolute top-2 left-2">
                        <input
                          type="checkbox"
                          checked={selectedFiles.has(file.id)}
                          onChange={() => handleToggleSelect(file.id)}
                          className="w-4 h-4"
                        />
                      </div>
                      
                      <div className="absolute top-2 right-2 flex gap-1">
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={() => setSelectedFile(file)}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="p-3">
                      <h3 className="font-medium text-sm truncate" title={file.name}>
                        {file.name}
                      </h3>
                      <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                        <span>{formatFileSize(file.size)}</span>
                        {file.dimensions && (
                          <span>{file.dimensions.width}×{file.dimensions.height}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {file.type}
                        </Badge>
                        {file.usageCount > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            Used {file.usageCount}×
                          </Badge>
                        )}
                      </div>
                      {file.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {file.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="text-xs bg-gray-100 px-2 py-1 rounded">
                              {tag}
                            </span>
                          ))}
                          {file.tags.length > 3 && (
                            <span className="text-xs text-gray-500">+{file.tags.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredFiles.map((file) => (
                  <div 
                    key={file.id}
                    className={`flex items-center gap-4 p-3 border rounded-lg hover:bg-gray-50 ${
                      selectedFiles.has(file.id) ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedFiles.has(file.id)}
                      onChange={() => handleToggleSelect(file.id)}
                      className="w-4 h-4"
                    />
                    
                    <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                      {file.type === 'image' && file.thumbnailUrl ? (
                        <img 
                          src={file.thumbnailUrl} 
                          alt={file.altText}
                          className="w-full h-full object-cover rounded"
                        />
                      ) : file.type === 'video' ? (
                        <Video className="h-6 w-6 text-gray-400" />
                      ) : file.type === 'document' ? (
                        <FileText className="h-6 w-6 text-gray-400" />
                      ) : (
                        <ImageIcon className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="font-medium text-sm">{file.name}</h3>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{formatFileSize(file.size)}</span>
                        {file.dimensions && (
                          <span>{file.dimensions.width}×{file.dimensions.height}</span>
                        )}
                        <span>Uploaded {new Date(file.uploadedAt).toLocaleDateString()}</span>
                        <span>Used {file.usageCount} times</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {file.type}
                      </Badge>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setSelectedFile(file)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDeleteFile(file.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload Media Files
                </CardTitle>
                <Button 
                  variant="outline" 
                  onClick={() => setShowUploadModal(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div 
                {...getRootProps()} 
                className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                  isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                {isDragActive ? (
                  <p className="text-blue-600">Drop the files here...</p>
                ) : (
                  <>
                    <p className="text-gray-600 mb-2">
                      Drag & drop files here, or click to select
                    </p>
                    <p className="text-sm text-gray-500">
                      Supports images, videos, documents, and audio files
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* File Details Modal */}
      {selectedFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  {selectedFile.name}
                </CardTitle>
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedFile(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                    {selectedFile.type === 'image' && selectedFile.url && (
                      <img 
                        src={selectedFile.url} 
                        alt={selectedFile.altText}
                        className="w-full h-full object-contain"
                      />
                    )}
                    {selectedFile.type === 'video' && (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video className="h-24 w-24 text-gray-400" />
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Alt Text</label>
                    <Input value={selectedFile.altText || ''} />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Caption</label>
                    <Input value={selectedFile.caption || ''} />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Tags</label>
                    <div className="flex flex-wrap gap-1">
                      {selectedFile.tags.map(tag => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">File Size:</span>
                      <p>{formatFileSize(selectedFile.size)}</p>
                    </div>
                    {selectedFile.dimensions && (
                      <div>
                        <span className="font-medium text-gray-600">Dimensions:</span>
                        <p>{selectedFile.dimensions.width}×{selectedFile.dimensions.height}</p>
                      </div>
                    )}
                    <div>
                      <span className="font-medium text-gray-600">Type:</span>
                      <p>{selectedFile.mimeType}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Usage:</span>
                      <p>{selectedFile.usageCount} times</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button size="sm">
                      <Copy className="h-4 w-4 mr-2" />
                      Copy URL
                    </Button>
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button size="sm" variant="outline">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PremiumAdminLayout>
  )
}