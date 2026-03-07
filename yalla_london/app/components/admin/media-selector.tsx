'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  Search, 
  Grid3X3, 
  List, 
  Image as ImageIcon,
  Upload,
  Check,
  X
} from 'lucide-react'
import Image from 'next/image'
import { useToast } from '@/components/ui/use-toast'
import { useDropzone } from 'react-dropzone'

interface MediaAsset {
  id: string
  filename: string
  url: string
  fileType: string
  mimeType: string
  width?: number
  height?: number
  altText?: string
  tags: string[]
  createdAt: string
}

interface MediaSelectorProps {
  onSelect: (media: MediaAsset) => void
  currentMedia?: MediaAsset | null
  acceptTypes?: string[]
  className?: string
}

export function MediaSelector({ 
  onSelect, 
  currentMedia, 
  acceptTypes = ['image/*'],
  className = ''
}: MediaSelectorProps) {
  const [assets, setAssets] = useState<MediaAsset[]>([])
  const [filteredAssets, setFilteredAssets] = useState<MediaAsset[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [fileTypeFilter, setFileTypeFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [isOpen, setIsOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const { toast } = useToast()

  const onDrop = async (acceptedFiles: File[]) => {
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
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptTypes.reduce((acc, type) => {
      acc[type] = []
      return acc
    }, {} as Record<string, string[]>),
    multiple: true
  })

  const loadAssets = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/media')
      if (response.ok) {
        const data = await response.json()
        setAssets(data.data || [])
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
  }, [toast])

  const filterAssets = useCallback(() => {
    let filtered = assets

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(asset =>
        asset.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.altText?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // Filter by file type
    if (fileTypeFilter !== 'all') {
      filtered = filtered.filter(asset => asset.mimeType.startsWith(fileTypeFilter))
    }

    setFilteredAssets(filtered)
  }, [assets, searchTerm, fileTypeFilter])

  useEffect(() => {
    loadAssets()
  }, [loadAssets])

  useEffect(() => {
    filterAssets()
  }, [filterAssets])

  const handleSelect = (asset: MediaAsset) => {
    onSelect(asset)
    setIsOpen(false)
    toast({
      title: "Media Selected",
      description: `${asset.filename} has been selected`
    })
  }

  const handleRemove = () => {
    onSelect(null as any)
    toast({
      title: "Media Removed",
      description: "Media selection has been cleared"
    })
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Current Selection Display */}
      {currentMedia ? (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 rounded-lg overflow-hidden">
                <Image
                  src={currentMedia.url}
                  alt={currentMedia.altText || currentMedia.filename}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-1">
                <h4 className="font-medium">{currentMedia.filename}</h4>
                <p className="text-sm text-muted-foreground">
                  {currentMedia.width && currentMedia.height 
                    ? `${currentMedia.width} × ${currentMedia.height}`
                    : currentMedia.mimeType
                  }
                </p>
                {currentMedia.tags.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {currentMedia.tags.slice(0, 3).map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemove}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No media selected</p>
          </CardContent>
        </Card>
      )}

      {/* Media Selector Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full">
            <ImageIcon className="h-4 w-4 mr-2" />
            {currentMedia ? 'Change Media' : 'Select Media'}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Select Media</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Search and Filters */}
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search media..."
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
                  <SelectItem value="image/">Images</SelectItem>
                  <SelectItem value="video/">Videos</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2">
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

            {/* Upload Area */}
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                isDragActive 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {isDragActive 
                  ? 'Drop files here...' 
                  : 'Drag & drop files here, or click to select'
                }
              </p>
              {isUploading && (
                <p className="text-sm text-primary mt-2">Uploading...</p>
              )}
            </div>

            {/* Media Grid/List */}
            <div className="max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Loading media...</p>
                </div>
              ) : filteredAssets.length === 0 ? (
                <div className="text-center py-8">
                  <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No media found</p>
                </div>
              ) : (
                <div className={
                  viewMode === 'grid' 
                    ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
                    : 'space-y-2'
                }>
                  {filteredAssets.map((asset) => (
                    <Card
                      key={asset.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        currentMedia?.id === asset.id ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => handleSelect(asset)}
                    >
                      <CardContent className="p-2">
                        {viewMode === 'grid' ? (
                          <div className="space-y-2">
                            <div className="relative aspect-square rounded-lg overflow-hidden">
                              <Image
                                src={asset.url}
                                alt={asset.altText || asset.filename}
                                fill
                                className="object-cover"
                              />
                              {currentMedia?.id === asset.id && (
                                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                  <Check className="h-6 w-6 text-primary" />
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-medium truncate">{asset.filename}</p>
                              <p className="text-xs text-muted-foreground">
                                {asset.width && asset.height 
                                  ? `${asset.width} × ${asset.height}`
                                  : asset.mimeType
                                }
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <div className="relative w-12 h-12 rounded-lg overflow-hidden">
                              <Image
                                src={asset.url}
                                alt={asset.altText || asset.filename}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{asset.filename}</p>
                              <p className="text-xs text-muted-foreground">
                                {asset.width && asset.height 
                                  ? `${asset.width} × ${asset.height}`
                                  : asset.mimeType
                                }
                              </p>
                            </div>
                            {currentMedia?.id === asset.id && (
                              <Check className="h-5 w-5 text-primary" />
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

