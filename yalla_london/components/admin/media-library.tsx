
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { 
  Upload, 
  Search, 
  Filter, 
  Grid3X3, 
  List, 
  Trash2, 
  Edit, 
  Eye, 
  Download, 
  Copy, 
  CheckCircle,
  Image as ImageIcon,
  Video,
  FileText,
  Star,
  MapPin
} from 'lucide-react'
import Image from 'next/image'
import { useToast } from '@/components/ui/use-toast'
import { useDropzone } from 'react-dropzone'

interface MediaAsset {
  id: string
  filename: string
  originalName: string
  cloudStoragePath: string
  url: string
  fileType: string
  mimeType: string
  fileSize: number
  width?: number
  height?: number
  altText?: string
  title?: string
  description?: string
  tags: string[]
  licenseInfo?: string
  responsiveUrls?: any
  usageMap?: any
  createdAt: string
  updatedAt: string
}

export function MediaLibrary() {
  const [assets, setAssets] = useState<MediaAsset[]>([])
  const [filteredAssets, setFilteredAssets] = useState<MediaAsset[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [fileTypeFilter, setFileTypeFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const { toast } = useToast()

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setIsUploading(true)
    
    for (const file of acceptedFiles) {
      try {
        const formData = new FormData()
        formData.append('file', file)
        
        const response = await fetch('/api/media/upload', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          throw new Error('Upload failed')
        }

        const newAsset = await response.json()
        setAssets(prev => [newAsset, ...prev])
        
        toast({
          title: "Success",
          description: `${file.name} uploaded successfully`
        })
      } catch (error) {
        console.error('Upload failed:', error)
        toast({
          title: "Error",
          description: `Failed to upload ${file.name}`,
          variant: "destructive"
        })
      }
    }
    
    setIsUploading(false)
  }, [toast])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp', '.avif'],
      'video/*': ['.mp4', '.webm', '.mov'],
      'application/pdf': ['.pdf']
    },
    multiple: true
  })

  useEffect(() => {
    loadAssets()
  }, [])

  useEffect(() => {
    filterAssets()
  }, [assets, searchTerm, fileTypeFilter])

  const loadAssets = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/media')
      if (response.ok) {
        const data = await response.json()
        setAssets(data)
      }
    } catch (error) {
      console.error('Failed to load assets:', error)
      toast({
        title: "Error",
        description: "Failed to load media assets",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const filterAssets = () => {
    let filtered = assets

    if (searchTerm) {
      filtered = filtered.filter(asset => 
        asset.originalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.altText?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    if (fileTypeFilter !== 'all') {
      filtered = filtered.filter(asset => asset.fileType === fileTypeFilter)
    }

    setFilteredAssets(filtered)
  }

  const handleDeleteAsset = async (id: string) => {
    try {
      const response = await fetch(`/api/media/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Delete failed')
      }

      setAssets(prev => prev.filter(asset => asset.id !== id))
      toast({
        title: "Success",
        description: "Asset deleted successfully"
      })
    } catch (error) {
      console.error('Delete failed:', error)
      toast({
        title: "Error",
        description: "Failed to delete asset",
        variant: "destructive"
      })
    }
  }

  const copyAssetUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      toast({
        title: "Copied",
        description: "Asset URL copied to clipboard"
      })
    } catch (error) {
      console.error('Copy failed:', error)
    }
  }

  const setAssetRole = async (assetId: string, role: string) => {
    try {
      const response = await fetch(`/api/media/${assetId}/set-role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      })

      if (!response.ok) {
        throw new Error('Failed to set role')
      }

      toast({
        title: "Success",
        description: `Asset set as ${role}`
      })
    } catch (error) {
      console.error('Failed to set role:', error)
      toast({
        title: "Error",
        description: "Failed to set asset role",
        variant: "destructive"
      })
    }
  }

  const formatFileSize = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB']
    let size = bytes
    let unitIndex = 0
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`
  }

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'image':
        return <ImageIcon className="w-5 h-5" />
      case 'video':
        return <Video className="w-5 h-5" />
      default:
        return <FileText className="w-5 h-5" />
    }
  }

  const getFileTypeBadgeColor = (fileType: string) => {
    const colors = {
      image: 'bg-green-500',
      video: 'bg-blue-500',
      document: 'bg-purple-500'
    }
    return colors[fileType as keyof typeof colors] || 'bg-gray-500'
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📸 Media Library
            <Badge variant="outline" className="ml-auto">
              Phase 3.3
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Upload Area */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
              ${isUploading ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:border-primary'}
            `}
          >
            <input {...getInputProps()} />
            <Upload className="w-10 h-10 mx-auto mb-4 text-muted-foreground" />
            {isDragActive ? (
              <p>Drop the files here...</p>
            ) : (
              <div>
                <p className="text-lg mb-2">Drop files here or click to upload</p>
                <p className="text-sm text-muted-foreground">
                  Supports images (JPEG, PNG, WebP, AVIF), videos (MP4, WebM), and PDFs
                </p>
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="flex gap-4 items-center my-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search assets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={fileTypeFilter} onValueChange={setFileTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="image">Images</SelectItem>
                <SelectItem value="video">Videos</SelectItem>
                <SelectItem value="document">Documents</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex border rounded-md">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Assets Display */}
          {filteredAssets.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg mb-2">No assets found</p>
              <p className="text-sm">Upload some files to get started</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredAssets.map((asset) => (
                <Card key={asset.id} className="group cursor-pointer hover:shadow-lg transition-all">
                  <CardContent className="p-0">
                    <div className="relative aspect-square bg-muted rounded-t-lg overflow-hidden">
                      {asset.fileType === 'image' ? (
                        <Image
                          src={asset.url}
                          alt={asset.altText || asset.originalName}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          {getFileIcon(asset.fileType)}
                        </div>
                      )}
                      
                      {/* Overlay */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute inset-0 flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setSelectedAsset(asset)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => copyAssetUrl(asset.url)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteAsset(asset.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <Badge 
                        className={`absolute top-2 left-2 ${getFileTypeBadgeColor(asset.fileType)} text-white`}
                      >
                        {asset.fileType}
                      </Badge>
                    </div>
                    
                    <div className="p-3">
                      <p className="font-medium truncate mb-1">
                        {asset.title || asset.originalName}
                      </p>
                      <div className="flex justify-between items-center text-sm text-muted-foreground">
                        <span>{formatFileSize(asset.fileSize)}</span>
                        {asset.width && asset.height && (
                          <span>{asset.width}×{asset.height}</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            // List View
            <div className="space-y-2">
              {filteredAssets.map((asset) => (
                <Card key={asset.id} className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      {getFileIcon(asset.fileType)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{asset.title || asset.originalName}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(asset.fileSize)} • {asset.mimeType}
                        {asset.width && asset.height && ` • ${asset.width}×${asset.height}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`${getFileTypeBadgeColor(asset.fileType)} text-white`}>
                        {asset.fileType}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedAsset(asset)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyAssetUrl(asset.url)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Asset Details Modal */}
      <Dialog open={!!selectedAsset} onOpenChange={() => setSelectedAsset(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Asset Details</DialogTitle>
          </DialogHeader>
          
          {selectedAsset && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                {selectedAsset.fileType === 'image' ? (
                  <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                    <Image
                      src={selectedAsset.url}
                      alt={selectedAsset.altText || selectedAsset.originalName}
                      fill
                      className="object-contain"
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                    {getFileIcon(selectedAsset.fileType)}
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label>Quick Actions</Label>
                  <div className="flex gap-2 mt-1">
                    <Button 
                      size="sm" 
                      onClick={() => setAssetRole(selectedAsset.id, 'hero')}
                    >
                      <Star className="w-4 h-4 mr-2" />
                      Set as Hero
                    </Button>
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={() => setAssetRole(selectedAsset.id, 'thumbnail')}
                    >
                      Set as Thumbnail
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <Label>Filename</Label>
                    <p className="text-sm">{selectedAsset.originalName}</p>
                  </div>
                  
                  <div>
                    <Label>File Size</Label>
                    <p className="text-sm">{formatFileSize(selectedAsset.fileSize)}</p>
                  </div>
                  
                  {selectedAsset.width && selectedAsset.height && (
                    <div>
                      <Label>Dimensions</Label>
                      <p className="text-sm">{selectedAsset.width} × {selectedAsset.height} px</p>
                    </div>
                  )}
                  
                  <div>
                    <Label>URL</Label>
                    <div className="flex gap-2">
                      <Input 
                        value={selectedAsset.url} 
                        readOnly 
                        className="text-sm"
                      />
                      <Button 
                        size="sm" 
                        onClick={() => copyAssetUrl(selectedAsset.url)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
