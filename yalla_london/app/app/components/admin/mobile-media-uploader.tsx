'use client';

/**
 * Mobile-Friendly Media Uploader
 *
 * Optimized for iPhone and mobile uploads with:
 * - Camera and photo library access
 * - Drag & drop on desktop
 * - Progress tracking
 * - Auto-optimization of images
 * - Quick share from other apps
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import NextImage from 'next/image';
import {
  Camera,
  Image as ImageIcon,
  Upload,
  X,
  Check,
  Loader2,
  FileText,
  Video,
  File,
  Smartphone,
  Wifi,
  WifiOff,
  CloudUpload,
  Trash2,
  Link as LinkIcon,
  Copy,
  ExternalLink,
  FolderOpen,
  Plus,
} from 'lucide-react';

interface UploadedFile {
  id: string;
  file: File;
  preview?: string;
  progress: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  url?: string;
  error?: string;
}

interface MobileMediaUploaderProps {
  onUploadComplete?: (files: { url: string; type: string; name: string }[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  allowedTypes?: string[];
  siteId?: string;
}

export function MobileMediaUploader({
  onUploadComplete,
  maxFiles = 20,
  maxSizeMB = 50,
  allowedTypes = ['image/*', 'video/*', 'application/pdf'],
  siteId,
}: MobileMediaUploaderProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [uploadMode, setUploadMode] = useState<'camera' | 'library' | 'files' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Check online status
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
    return undefined;
  }, []);

  // Upload single file
  const uploadSingleFile = useCallback(async (uploadFile: UploadedFile) => {
    setFiles(prev => prev.map(f =>
      f.id === uploadFile.id ? { ...f, status: 'uploading' } : f
    ));

    try {
      const formData = new FormData();
      formData.append('file', uploadFile.file);
      if (siteId) {
        formData.append('siteId', siteId);
      }

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setFiles(prev => prev.map(f =>
            f.id === uploadFile.id ? { ...f, progress } : f
          ));
        }
      });

      const uploadPromise = new Promise<string>((resolve, reject) => {
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response.url || response.data?.url);
            } catch {
              reject(new Error('Invalid response'));
            }
          } else {
            reject(new Error(`Upload failed: ${xhr.status}`));
          }
        });
        xhr.addEventListener('error', () => reject(new Error('Network error')));
        xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));
      });

      xhr.open('POST', '/api/admin/media/upload');
      xhr.send(formData);

      const url = await uploadPromise;

      setFiles(prev => prev.map(f =>
        f.id === uploadFile.id ? { ...f, status: 'complete', url, progress: 100 } : f
      ));

    } catch (error) {
      setFiles(prev => prev.map(f =>
        f.id === uploadFile.id ? {
          ...f,
          status: 'error',
          error: error instanceof Error ? error.message : 'Upload failed'
        } : f
      ));
    }
  }, [siteId]);

  // Handle file selection
  const handleFileSelect = useCallback(async (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const newFiles: UploadedFile[] = [];

    for (let i = 0; i < Math.min(selectedFiles.length, maxFiles - files.length); i++) {
      const file = selectedFiles[i];

      // Check file size
      if (file.size > maxSizeMB * 1024 * 1024) {
        alert(`File "${file.name}" is too large. Maximum size is ${maxSizeMB}MB.`);
        continue;
      }

      // Create preview for images
      let preview: string | undefined;
      if (file.type.startsWith('image/')) {
        preview = URL.createObjectURL(file);
      }

      newFiles.push({
        id: `${Date.now()}-${i}`,
        file,
        preview,
        progress: 0,
        status: 'pending',
      });
    }

    setFiles(prev => [...prev, ...newFiles]);
    setUploadMode(null);

    // Start uploading
    for (const uploadFile of newFiles) {
      await uploadSingleFile(uploadFile);
    }
  }, [files.length, maxFiles, maxSizeMB, uploadSingleFile]);

  // Remove file
  const removeFile = (id: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === id);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter(f => f.id !== id);
    });
  };

  // Copy URL to clipboard
  const copyUrl = async (url: string) => {
    await navigator.clipboard.writeText(url);
    // Could show a toast here
  };

  // Handle drag events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  // Get completed files for callback
  const completedFiles = files.filter(f => f.status === 'complete' && f.url);

  // Notify parent of completed uploads
  const handleDone = () => {
    if (onUploadComplete) {
      onUploadComplete(completedFiles.map(f => ({
        url: f.url!,
        type: f.file.type,
        name: f.file.name,
      })));
    }
  };

  // Get file icon
  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return ImageIcon;
    if (type.startsWith('video/')) return Video;
    if (type === 'application/pdf') return FileText;
    return File;
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-lg">Upload Media</h2>
            <p className="text-sm text-gray-500">Photos, videos, and documents</p>
          </div>
          <div className="flex items-center gap-2">
            {isOnline ? (
              <span className="flex items-center gap-1 text-xs text-green-600">
                <Wifi className="h-3 w-3" />
                Online
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-red-600">
                <WifiOff className="h-3 w-3" />
                Offline
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Upload Options - Mobile Optimized */}
      <div className="p-4">
        {/* Mobile-specific options */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="flex flex-col items-center gap-2 p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
          >
            <Camera className="h-8 w-8 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Camera</span>
          </button>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
          />

          <button
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.accept = 'image/*,video/*';
                fileInputRef.current.click();
              }
            }}
            className="flex flex-col items-center gap-2 p-4 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors"
          >
            <ImageIcon className="h-8 w-8 text-purple-600" />
            <span className="text-sm font-medium text-purple-900">Photos</span>
          </button>

          <button
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.accept = '*/*';
                fileInputRef.current.click();
              }
            }}
            className="flex flex-col items-center gap-2 p-4 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors"
          >
            <FolderOpen className="h-8 w-8 text-amber-600" />
            <span className="text-sm font-medium text-amber-900">Files</span>
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
        />

        {/* Drop Zone - Desktop */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`hidden md:flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <CloudUpload className={`h-12 w-12 mb-3 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
          <p className="text-gray-600 text-center mb-2">
            Drag and drop files here, or{' '}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-blue-600 hover:underline"
            >
              browse
            </button>
          </p>
          <p className="text-xs text-gray-400">
            Max {maxSizeMB}MB per file. Supports images, videos, and PDFs.
          </p>
        </div>

        {/* Mobile Tip */}
        <div className="md:hidden flex items-center gap-2 p-3 bg-gray-50 rounded-lg mt-4">
          <Smartphone className="h-5 w-5 text-gray-400 flex-shrink-0" />
          <p className="text-xs text-gray-500">
            Tip: Use the Share button in your Photos app to upload directly to your media library
          </p>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="border-t border-gray-200">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">
                {files.length} file{files.length > 1 ? 's' : ''}
              </h3>
              {completedFiles.length > 0 && (
                <span className="text-sm text-green-600">
                  {completedFiles.length} uploaded
                </span>
              )}
            </div>

            <div className="space-y-3">
              {files.map((file) => {
                const FileIcon = getFileIcon(file.file.type);

                return (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    {/* Preview/Icon */}
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200 flex items-center justify-center flex-shrink-0">
                      {file.preview ? (
                        <NextImage
                          src={file.preview}
                          alt=""
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <FileIcon className="h-6 w-6 text-gray-400" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.file.name}</p>
                      <p className="text-xs text-gray-500">
                        {(file.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>

                      {/* Progress Bar */}
                      {file.status === 'uploading' && (
                        <div className="mt-1">
                          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 transition-all duration-300"
                              style={{ width: `${file.progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {file.status === 'error' && (
                        <p className="text-xs text-red-500 mt-1">{file.error}</p>
                      )}
                    </div>

                    {/* Status/Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {file.status === 'pending' && (
                        <span className="text-xs text-gray-400">Waiting...</span>
                      )}
                      {file.status === 'uploading' && (
                        <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                      )}
                      {file.status === 'complete' && (
                        <>
                          <Check className="h-5 w-5 text-green-500" />
                          <button
                            onClick={() => copyUrl(file.url!)}
                            className="p-1 hover:bg-gray-200 rounded"
                            title="Copy URL"
                          >
                            <Copy className="h-4 w-4 text-gray-500" />
                          </button>
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 hover:bg-gray-200 rounded"
                            title="View"
                          >
                            <ExternalLink className="h-4 w-4 text-gray-500" />
                          </a>
                        </>
                      )}
                      {file.status === 'error' && (
                        <button
                          onClick={() => uploadSingleFile(file)}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Retry
                        </button>
                      )}
                      <button
                        onClick={() => removeFile(file.id)}
                        className="p-1 hover:bg-red-100 rounded"
                      >
                        <X className="h-4 w-4 text-gray-400 hover:text-red-500" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions Footer */}
          <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <button
              onClick={() => setFiles([])}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Clear all
            </button>
            <button
              onClick={handleDone}
              disabled={completedFiles.length === 0}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="h-4 w-4" />
              Done ({completedFiles.length})
            </button>
          </div>
        </div>
      )}

      {/* Quick Add Another Button */}
      {files.length > 0 && files.length < maxFiles && (
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-900 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add more files
          </button>
        </div>
      )}
    </div>
  );
}

export default MobileMediaUploader;
