'use client'

import React, { useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Upload, 
  FileImage, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  X, 
  Plus,
  Download,
  Eye,
  Trash2,
  RefreshCw
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface UploadFile {
  id: string
  file: File
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error'
  progress: number
  url?: string
  enrichment?: {
    alt_text?: string
    description?: string
    tags?: string[]
    color_palette?: string[]
  }
  error?: string
}

interface UploadInterfaceProps {
  onFileUploaded?: (file: UploadFile) => void
  acceptedTypes?: string[]
  maxFileSize?: number
  enableBulkEnrichment?: boolean
}

export default function UploadInterface({
  onFileUploaded,
  acceptedTypes = ['image/*', 'application/pdf', '.md', '.txt'],
  maxFileSize = 10 * 1024 * 1024, // 10MB
  enableBulkEnrichment = true
}: UploadInterfaceProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [bulkEnrichmentProgress, setBulkEnrichmentProgress] = useState(0)
  const [isBulkEnriching, setIsBulkEnriching] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    handleFiles(files)
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    handleFiles(files)
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const handleFiles = useCallback((files: File[]) => {
    const validFiles = files.filter(file => {
      if (file.size > maxFileSize) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds the ${Math.round(maxFileSize / 1024 / 1024)}MB limit`,
          variant: "destructive"
        })
        return false
      }
      return true
    })

    const newFiles: UploadFile[] = validFiles.map(file => ({
      id: crypto.randomUUID(),
      file,
      status: 'pending',
      progress: 0
    }))

    setUploadedFiles(prev => [...prev, ...newFiles])

    // Start uploads
    newFiles.forEach(uploadFile => {
      uploadSingleFile(uploadFile)
    })
  }, [maxFileSize, toast])

  const uploadSingleFile = async (uploadFile: UploadFile) => {
    try {
      // Update status to uploading
      setUploadedFiles(prev =>
        prev.map(f => f.id === uploadFile.id ? { ...f, status: 'uploading' } : f)
      )

      // Simulate upload progress
      for (let progress = 0; progress <= 100; progress += 10) {
        await new Promise(resolve => setTimeout(resolve, 100))
        setUploadedFiles(prev =>
          prev.map(f => f.id === uploadFile.id ? { ...f, progress } : f)
        )
      }

      // Create FormData for upload
      const formData = new FormData()
      formData.append('file', uploadFile.file)
      formData.append('auto_enrich', 'true')

      // Upload to API
      const response = await fetch('/api/admin/media/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`)
      }

      const result = await response.json()

      // Update with upload result
      setUploadedFiles(prev =>
        prev.map(f => f.id === uploadFile.id ? {
          ...f,
          status: 'processing',
          url: result.url
        } : f)
      )

      // Check for enrichment if it's an image
      if (uploadFile.file.type.startsWith('image/') && enableBulkEnrichment) {
        await enrichSingleFile(uploadFile.id, result.id)
      } else {
        setUploadedFiles(prev =>
          prev.map(f => f.id === uploadFile.id ? { ...f, status: 'completed' } : f)
        )
      }

      if (onFileUploaded) {
        onFileUploaded(uploadFile)
      }

      toast({
        title: "Upload successful",
        description: `${uploadFile.file.name} has been uploaded successfully`
      })

    } catch (error) {
      console.error('Upload error:', error)
      setUploadedFiles(prev =>
        prev.map(f => f.id === uploadFile.id ? {
          ...f,
          status: 'error',
          error: error instanceof Error ? error.message : 'Upload failed'
        } : f)
      )

      toast({
        title: "Upload failed",
        description: `Failed to upload ${uploadFile.file.name}`,
        variant: "destructive"
      })
    }
  }

  const enrichSingleFile = async (fileId: string, mediaId: string) => {
    try {
      const response = await fetch('/api/admin/media/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ media_id: mediaId })
      })

      if (!response.ok) {
        throw new Error('Enrichment failed')
      }

      const enrichment = await response.json()

      setUploadedFiles(prev =>
        prev.map(f => f.id === fileId ? {
          ...f,
          status: 'completed',
          enrichment: enrichment.data
        } : f)
      )

    } catch (error) {
      console.error('Enrichment error:', error)
      // Don't fail the upload, just complete without enrichment
      setUploadedFiles(prev =>
        prev.map(f => f.id === fileId ? { ...f, status: 'completed' } : f)
      )
    }
  }

  const bulkEnrichFiles = async () => {
    const imageFiles = uploadedFiles.filter(f => 
      f.file.type.startsWith('image/') && 
      f.status === 'completed' && 
      !f.enrichment
    )

    if (imageFiles.length === 0) {
      toast({
        title: "No files to enrich",
        description: "All image files are already enriched or no image files found"
      })
      return
    }

    setIsBulkEnriching(true)
    setBulkEnrichmentProgress(0)

    try {
      const response = await fetch('/api/admin/media/bulk-enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_ids: imageFiles.map(f => f.url), // Assuming URL contains the media ID
          auto_process: true
        })
      })

      if (!response.ok) {
        throw new Error('Bulk enrichment failed')
      }

      const result = await response.json()

      // Simulate progress
      for (let progress = 0; progress <= 100; progress += 10) {
        await new Promise(resolve => setTimeout(resolve, 200))
        setBulkEnrichmentProgress(progress)
      }

      toast({
        title: "Bulk enrichment completed",
        description: `Successfully enriched ${imageFiles.length} image files`
      })

      // Refresh enrichment data
      // In a real implementation, you'd fetch the updated enrichment data

    } catch (error) {
      console.error('Bulk enrichment error:', error)
      toast({
        title: "Bulk enrichment failed",
        description: "Failed to enrich files. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsBulkEnriching(false)
      setBulkEnrichmentProgress(0)
    }
  }

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const retryUpload = (fileId: string) => {
    const file = uploadedFiles.find(f => f.id === fileId)
    if (file) {
      setUploadedFiles(prev =>
        prev.map(f => f.id === fileId ? { ...f, status: 'pending', progress: 0, error: undefined } : f)
      )
      uploadSingleFile(file)
    }
  }

  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'uploading':
      case 'processing':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
      default:
        return <Upload className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: UploadFile['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'error':
        return 'bg-red-100 text-red-800'
      case 'uploading':
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const completedFiles = uploadedFiles.filter(f => f.status === 'completed')
  const enrichedFiles = completedFiles.filter(f => f.enrichment)

  return (
    <div className="space-y-6">
      {/* Upload Dropzone */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            File Upload
          </CardTitle>
          <CardDescription>
            Drag and drop files or click to select. Supports images, documents, and markdown files.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`
              relative border-2 border-dashed rounded-lg p-6 text-center transition-colors
              ${isDragging 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
              }
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="space-y-4">
              <div className="mx-auto w-12 h-12 text-gray-400">
                <Upload className="w-full h-full" />
              </div>
              <div>
                <p className="text-lg font-medium">Drop files here</p>
                <p className="text-sm text-gray-500">or click to browse</p>
              </div>
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                Select Files
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={acceptedTypes.join(',')}
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>

          {enableBulkEnrichment && completedFiles.length > 0 && (
            <div className="mt-4">
              <Button
                onClick={bulkEnrichFiles}
                disabled={isBulkEnriching}
                variant="outline"
                className="w-full"
              >
                {isBulkEnriching ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Enriching... {bulkEnrichmentProgress}%
                  </>
                ) : (
                  <>
                    <FileImage className="h-4 w-4 mr-2" />
                    Bulk Enrich Images ({completedFiles.filter(f => f.file.type.startsWith('image/')).length})
                  </>
                )}
              </Button>
              {isBulkEnriching && (
                <Progress value={bulkEnrichmentProgress} className="mt-2" />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Progress and Results */}
      {uploadedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Progress</CardTitle>
            <CardDescription>
              {completedFiles.length} of {uploadedFiles.length} files completed
              {enrichedFiles.length > 0 && ` • ${enrichedFiles.length} files enriched`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">All Files ({uploadedFiles.length})</TabsTrigger>
                <TabsTrigger value="completed">Completed ({completedFiles.length})</TabsTrigger>
                <TabsTrigger value="enriched">Enriched ({enrichedFiles.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-3">
                {uploadedFiles.map((file) => (
                  <FileUploadItem
                    key={file.id}
                    file={file}
                    onRemove={removeFile}
                    onRetry={retryUpload}
                    getStatusIcon={getStatusIcon}
                    getStatusColor={getStatusColor}
                  />
                ))}
              </TabsContent>

              <TabsContent value="completed" className="space-y-3">
                {completedFiles.map((file) => (
                  <FileUploadItem
                    key={file.id}
                    file={file}
                    onRemove={removeFile}
                    onRetry={retryUpload}
                    getStatusIcon={getStatusIcon}
                    getStatusColor={getStatusColor}
                  />
                ))}
              </TabsContent>

              <TabsContent value="enriched" className="space-y-3">
                {enrichedFiles.map((file) => (
                  <FileUploadItem
                    key={file.id}
                    file={file}
                    onRemove={removeFile}
                    onRetry={retryUpload}
                    getStatusIcon={getStatusIcon}
                    getStatusColor={getStatusColor}
                    showEnrichment
                  />
                ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

interface FileUploadItemProps {
  file: UploadFile
  onRemove: (fileId: string) => void
  onRetry: (fileId: string) => void
  getStatusIcon: (status: UploadFile['status']) => React.ReactNode
  getStatusColor: (status: UploadFile['status']) => string
  showEnrichment?: boolean
}

function FileUploadItem({
  file,
  onRemove,
  onRetry,
  getStatusIcon,
  getStatusColor,
  showEnrichment = false
}: FileUploadItemProps) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex items-center space-x-3 flex-1">
        <div className="flex-shrink-0">
          {file.file.type.startsWith('image/') ? (
            <FileImage className="h-8 w-8 text-blue-500" />
          ) : (
            <FileText className="h-8 w-8 text-gray-500" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {file.file.name}
          </p>
          <p className="text-xs text-gray-500">
            {(file.file.size / 1024 / 1024).toFixed(2)} MB
          </p>
          
          {file.status === 'uploading' && (
            <Progress value={file.progress} className="mt-1" />
          )}
          
          {file.error && (
            <Alert className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                {file.error}
              </AlertDescription>
            </Alert>
          )}
          
          {showEnrichment && file.enrichment && (
            <div className="mt-2 space-y-1">
              {file.enrichment.alt_text && (
                <p className="text-xs text-gray-600">
                  <strong>Alt text:</strong> {file.enrichment.alt_text}
                </p>
              )}
              {file.enrichment.tags && file.enrichment.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {file.enrichment.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Badge variant="outline" className={getStatusColor(file.status)}>
          {getStatusIcon(file.status)}
          <span className="ml-1 capitalize">{file.status}</span>
        </Badge>
        
        <div className="flex space-x-1">
          {file.url && file.status === 'completed' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => window.open(file.url, '_blank')}
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
          
          {file.status === 'error' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onRetry(file.id)}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
          
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onRemove(file.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}