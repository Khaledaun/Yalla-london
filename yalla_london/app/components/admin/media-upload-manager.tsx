'use client'

import React, { useState, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Upload, 
  Image as ImageIcon, 
  Video, 
  FileText, 
  X, 
  Check, 
  AlertCircle,
  Star,
  Eye,
  Download,
  Trash2,
  Edit,
  Grid3X3,
  List,
  Filter,
  Search,
  Plus,
  Folder,
  Tag,
  Clock,
  User,
  FileImage,
  FileVideo
} from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { useToast } from '@/components/ui/use-toast'
import Image from 'next/image'

interface UploadedFile {
  id: string
  file: File
  preview?: string
  status: 'uploading' | 'success' | 'error'
  progress: number
  type: 'image' | 'video' | 'document'
  size: number
  error?: string
}

interface MediaAsset {
  id: string
  filename: string
  originalName: string
  url: string
  thumbnailUrl?: string
  type: 'image' | 'video' | 'document'
  size: number
  uploadedAt: Date
  uploadedBy: string
  tags: string[]
  isHeroImage: boolean
  description?: string
  altText?: string
}

export function MediaUploadManager() {
  const { toast } = useToast()
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([
    // Mock existing assets
    {
      id: '1',
      filename: 'london-bridge-hero.jpg',
      originalName: 'London Bridge Hero Image.jpg',
      url: '/images/london-bridge.jpg',
      thumbnailUrl: '/images/london-bridge-thumb.jpg',
      type: 'image',
      size: 2048000,
      uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
      uploadedBy: 'John Doe',
      tags: ['hero', 'london', 'bridge'],
      isHeroImage: true,
      description: 'Iconic London Bridge view for homepage hero',
      altText: 'Beautiful view of London Bridge at sunset'
    },
    {
      id: '2',
      filename: 'london-markets.jpg',
      originalName: 'London Markets Guide.jpg',
      url: '/images/london-markets.jpg',
      thumbnailUrl: '/images/london-markets-thumb.jpg',
      type: 'image',
      size: 1536000,
      uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
      uploadedBy: 'Jane Smith',
      tags: ['markets', 'food', 'guide'],
      isHeroImage: false,
      description: 'Bustling London market scene',
      altText: 'Busy London market with fresh produce and vendors'
    }
  ])
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set())
  const [heroImageId, setHeroImageId] = useState<string>('1')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'image' | 'video' | 'document'>('all')

  const simulateUpload = useCallback(async (fileId: string) => {
    const steps = 10
    for (let i = 1; i <= steps; i++) {
      await new Promise(resolve => setTimeout(resolve, 200))
      setUploadedFiles(prev =>
        prev.map(file =>
          file.id === fileId
            ? { ...file, progress: (i / steps) * 100 }
            : file
        )
      )
    }

    // Complete upload
    setUploadedFiles(prev =>
      prev.map(file =>
        file.id === fileId
          ? { ...file, status: 'success', progress: 100 }
          : file
      )
    )

    // Add to media assets using the current file from state
    setUploadedFiles(prev => {
      const uploadedFile = prev.find(f => f.id === fileId)
      if (uploadedFile) {
        const newAsset: MediaAsset = {
          id: fileId,
          filename: uploadedFile.file.name.toLowerCase().replace(/\s+/g, '-'),
          originalName: uploadedFile.file.name,
          url: uploadedFile.preview || '/placeholder.jpg',
          thumbnailUrl: uploadedFile.preview,
          type: uploadedFile.type,
          size: uploadedFile.size,
          uploadedAt: new Date(),
          uploadedBy: 'Current User',
          tags: [],
          isHeroImage: false,
          description: '',
          altText: ''
        }

        setMediaAssets(prevAssets => [newAsset, ...prevAssets])

        toast({
          title: "Upload successful",
          description: `${uploadedFile.file.name} has been uploaded successfully.`,
        })
      }
      return prev
    })
  }, [toast])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadedFile[] = acceptedFiles.map(file => ({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      status: 'uploading',
      progress: 0,
      type: file.type.startsWith('image/') ? 'image' :
            file.type.startsWith('video/') ? 'video' : 'document',
      size: file.size
    }))

    setUploadedFiles(prev => [...prev, ...newFiles])

    // Simulate upload progress
    newFiles.forEach(uploadFile => {
      simulateUpload(uploadFile.id)
    })
  }, [simulateUpload])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'video/*': ['.mp4', '.mov', '.avi', '.webm'],
      'application/pdf': ['.pdf']
    },
    maxSize: 10 * 1024 * 1024 // 10MB
  })

  const removeUploadedFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const toggleAssetSelection = (assetId: string) => {
    const newSelected = new Set(selectedAssets)
    if (newSelected.has(assetId)) {
      newSelected.delete(assetId)
    } else {
      newSelected.add(assetId)
    }
    setSelectedAssets(newSelected)
  }

  const setAsHeroImage = (assetId: string) => {
    setMediaAssets(prev => 
      prev.map(asset => ({
        ...asset,
        isHeroImage: asset.id === assetId
      }))
    )
    setHeroImageId(assetId)
    
    toast({
      title: "Hero image updated",
      description: "The homepage hero image has been updated successfully.",
    })
  }

  const deleteSelectedAssets = () => {
    setMediaAssets(prev => prev.filter(asset => !selectedAssets.has(asset.id)))
    setSelectedAssets(new Set())
    
    toast({
      title: "Assets deleted",
      description: `${selectedAssets.size} asset(s) have been deleted.`,
    })
  }

  const filteredAssets = mediaAssets.filter(asset => {
    const matchesSearch = searchQuery === '' || 
      asset.originalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesFilter = filterType === 'all' || asset.type === filterType
    
    return matchesSearch && matchesFilter
  })

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image': return <FileImage className="h-5 w-5" />
      case 'video': return <FileVideo className="h-5 w-5" />
      default: return <FileText className="h-5 w-5" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5" />
            <span>Upload Media Files</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200 
              ${isDragActive 
                ? 'border-blue-400 bg-gradient-to-br from-blue-50 to-blue-100 scale-105 shadow-lg' 
                : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
              }
            `}
          >
            <input {...getInputProps()} />
            <div className={`transition-all duration-200 ${isDragActive ? 'scale-110' : ''}`}>
              <Upload className={`h-16 w-16 mx-auto mb-6 transition-colors ${isDragActive ? 'text-blue-500' : 'text-gray-400'}`} />
            </div>
            <p className="admin-text-lg font-semibold text-gray-900 mb-2">
              {isDragActive ? 'Drop files here!' : 'Drag & drop your media files'}
            </p>
            <p className="admin-text-base text-gray-600 mb-6">
              or <span className="text-blue-600 font-semibold hover:text-blue-700 cursor-pointer">click to browse</span> and select files
            </p>
            <div className="space-y-2">
              <p className="admin-text-sm text-gray-500">
                📸 Images: PNG, JPG, GIF, WebP • 🎥 Videos: MP4, MOV, AVI, WebM • 📄 Documents: PDF
              </p>
              <p className="admin-text-sm text-gray-500 font-medium">
                Maximum file size: 10MB per file
              </p>
            </div>
          </div>

          {/* Upload Progress */}
          {uploadedFiles.length > 0 && (
            <div className="mt-6 space-y-3">
              <h3 className="font-medium text-gray-900">Uploading Files</h3>
              {uploadedFiles.map(file => (
                <div key={file.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                  {file.preview && (
                    <Image
                      src={file.preview}
                      alt="Preview"
                      width={40}
                      height={40}
                      className="rounded object-cover"
                    />
                  )}
                  {!file.preview && getFileIcon(file.type)}
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.file.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatFileSize(file.size)}
                    </p>
                    {file.status === 'uploading' && (
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${file.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {file.status === 'success' && (
                      <Check className="h-5 w-5 text-green-500" />
                    )}
                    {file.status === 'error' && (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeUploadedFile(file.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Media Library */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Folder className="h-5 w-5" />
              <span>Media Library</span>
              <Badge variant="secondary">{filteredAssets.length} files</Badge>
            </CardTitle>
            
            <div className="flex items-center space-x-2">
              {selectedAssets.size > 0 && (
                <>
                  <Button variant="outline" size="sm" onClick={deleteSelectedAssets}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete ({selectedAssets.size})
                  </Button>
                </>
              )}
              
              <div className="flex border rounded-md">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="h-4 w-4" />
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
          
          {/* Search and Filters */}
          <div className="flex items-center space-x-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search media files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="image">Images</option>
              <option value="video">Videos</option>
              <option value="document">Documents</option>
            </select>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Hero Image Selection */}
          <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-xl shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="admin-heading text-lg text-blue-900">Current Hero Image</h3>
                <p className="admin-text-sm text-blue-700 mt-1">
                  This image is displayed as the main hero image on your homepage
                </p>
              </div>
              {heroImageId && (
                <div className="flex items-center space-x-4">
                  <div className="relative group">
                    <Image
                      src={mediaAssets.find(a => a.id === heroImageId)?.thumbnailUrl || '/placeholder.jpg'}
                      alt="Current hero image"
                      width={80}
                      height={60}
                      className="rounded-lg object-cover border-2 border-blue-300 shadow-md transition-transform group-hover:scale-105"
                    />
                    <div className="absolute -top-2 -right-2 bg-yellow-500 rounded-full p-1 shadow-lg">
                      <Star className="h-4 w-4 text-yellow-900 fill-current" />
                    </div>
                  </div>
                  <div>
                    <p className="admin-text-sm font-semibold text-blue-900">
                      {mediaAssets.find(a => a.id === heroImageId)?.originalName}
                    </p>
                    <p className="text-xs text-blue-700">Hero Image</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Media Grid/List */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {filteredAssets.map(asset => (
                <div 
                  key={asset.id}
                  className={`
                    group relative bg-white border-2 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 overflow-hidden
                    ${selectedAssets.has(asset.id) ? 'ring-2 ring-blue-500 border-blue-500 shadow-lg' : 'border-gray-200 hover:border-gray-300'}
                    ${asset.isHeroImage ? 'ring-2 ring-yellow-400 border-yellow-400 shadow-yellow-100 shadow-lg' : ''}
                  `}
                  onClick={() => toggleAssetSelection(asset.id)}
                >
                  {/* Hero Badge */}
                  {asset.isHeroImage && (
                    <div className="absolute top-3 left-3 z-10">
                      <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 px-2 py-1 rounded-full text-xs font-semibold flex items-center shadow-md">
                        <Star className="h-3 w-3 mr-1 fill-current" />
                        Hero
                      </div>
                    </div>
                  )}
                  
                  {/* Selection Checkbox */}
                  <div className="absolute top-3 right-3 z-10">
                    <div className={`
                      w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shadow-md
                      ${selectedAssets.has(asset.id) ? 'bg-blue-500 border-blue-500 scale-110' : 'bg-white border-gray-300 group-hover:border-blue-400'}
                    `}>
                      {selectedAssets.has(asset.id) && (
                        <Check className="h-3 w-3 text-white" />
                      )}
                    </div>
                  </div>

                  {/* Media Preview */}
                  <div className="aspect-square bg-gray-50">
                    {asset.type === 'image' ? (
                      <Image
                        src={asset.thumbnailUrl || asset.url}
                        alt={asset.altText || asset.originalName}
                        width={240}
                        height={240}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                        <div className="text-gray-400">
                          {getFileIcon(asset.type)}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Asset Info */}
                  <div className="p-4">
                    <p className="admin-text-sm font-semibold text-gray-900 truncate mb-1">
                      {asset.originalName}
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                      <span>{formatFileSize(asset.size)}</span>
                      <span className="capitalize font-medium">{asset.type}</span>
                    </div>
                    {asset.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {asset.tags.slice(0, 2).map(tag => (
                          <span key={tag} className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                            {tag}
                          </span>
                        ))}
                        {asset.tags.length > 2 && (
                          <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                            +{asset.tags.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Hover Actions */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-end justify-center pb-4">
                    <div className="flex space-x-2">
                      <Button size="sm" className="bg-white/90 hover:bg-white text-gray-800 shadow-lg" onClick={(e) => {
                        e.stopPropagation()
                        // Preview functionality
                      }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {asset.type === 'image' && !asset.isHeroImage && (
                        <Button size="sm" className="bg-yellow-500/90 hover:bg-yellow-500 text-yellow-900 shadow-lg" onClick={(e) => {
                          e.stopPropagation()
                          setAsHeroImage(asset.id)
                        }}>
                          <Star className="h-4 w-4" />
                        </Button>
                      )}
                      <Button size="sm" className="bg-white/90 hover:bg-white text-gray-800 shadow-lg" onClick={(e) => {
                        e.stopPropagation()
                        // Edit functionality
                      }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAssets.map(asset => (
                <div 
                  key={asset.id}
                  className={`
                    flex items-center space-x-4 p-4 border rounded-lg cursor-pointer transition-all
                    ${selectedAssets.has(asset.id) ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}
                    ${asset.isHeroImage ? 'ring-2 ring-yellow-400 bg-yellow-50' : ''}
                  `}
                  onClick={() => toggleAssetSelection(asset.id)}
                >
                  <div className={`
                    w-5 h-5 rounded-full border-2 flex items-center justify-center
                    ${selectedAssets.has(asset.id) ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-300'}
                  `}>
                    {selectedAssets.has(asset.id) && (
                      <Check className="h-3 w-3 text-white" />
                    )}
                  </div>

                  {asset.type === 'image' ? (
                    <Image
                      src={asset.thumbnailUrl || asset.url}
                      alt={asset.altText || asset.originalName}
                      width={50}
                      height={50}
                      className="rounded object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                      {getFileIcon(asset.type)}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="font-medium text-gray-900 truncate">
                        {asset.originalName}
                      </p>
                      {asset.isHeroImage && (
                        <Badge className="bg-yellow-500 text-yellow-900">
                          <Star className="h-3 w-3 mr-1" />
                          Hero
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      {formatFileSize(asset.size)} • {asset.type} • 
                      <User className="inline h-3 w-3 ml-2 mr-1" />
                      {asset.uploadedBy} • 
                      <Clock className="inline h-3 w-3 ml-2 mr-1" />
                      {asset.uploadedAt.toLocaleDateString()}
                    </p>
                    {asset.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {asset.tags.map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            <Tag className="h-3 w-3 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    {asset.type === 'image' && !asset.isHeroImage && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setAsHeroImage(asset.id)
                        }}
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredAssets.length === 0 && (
            <div className="text-center py-12">
              <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No media files</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchQuery || filterType !== 'all' 
                  ? 'No files match your search criteria.'
                  : 'Get started by uploading your first media file.'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}