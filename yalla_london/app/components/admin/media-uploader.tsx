'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, Image, X, CheckCircle, AlertCircle } from 'lucide-react';

interface UploadFile {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  url?: string;
}

export function MediaUploader({ onUploadComplete }: { onUploadComplete?: (files: { url: string; name: string }[]) => void }) {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadFile[] = acceptedFiles.map(file => ({
      file,
      id: crypto.randomUUID(),
      progress: 0,
      status: 'pending'
    }));

    setUploadFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
      'video/*': ['.mp4', '.mov', '.avi'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc', '.docx']
    },
    multiple: true
  });

  const removeFile = (id: string) => {
    setUploadFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleUploadFiles = async () => {
    setIsUploading(true);
    const uploadedFiles: { url: string; name: string }[] = [];

    for (const uploadFile of uploadFiles.filter(f => f.status === 'pending')) {
      try {
        // Update status to uploading
        setUploadFiles(prev => prev.map(f =>
          f.id === uploadFile.id ? { ...f, status: 'uploading', progress: 10 } : f
        ));

        // Build FormData and call real upload API
        const formData = new FormData();
        formData.append('file', uploadFile.file);

        setUploadFiles(prev => prev.map(f =>
          f.id === uploadFile.id ? { ...f, progress: 30 } : f
        ));

        const res = await fetch('/api/media/upload', {
          method: 'POST',
          body: formData,
        });

        setUploadFiles(prev => prev.map(f =>
          f.id === uploadFile.id ? { ...f, progress: 80 } : f
        ));

        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: 'Upload failed' }));
          throw new Error(errData.error || `Upload failed (${res.status})`);
        }

        const data = await res.json();

        // Mark as success
        setUploadFiles(prev => prev.map(f =>
          f.id === uploadFile.id ? { ...f, status: 'success', progress: 100, url: data.url } : f
        ));
        uploadedFiles.push({ url: data.url, name: uploadFile.file.name });

      } catch (error) {
        setUploadFiles(prev => prev.map(f =>
          f.id === uploadFile.id ? {
            ...f,
            status: 'error',
            error: error instanceof Error ? error.message : 'Upload failed'
          } : f
        ));
      }
    }

    setIsUploading(false);
    if (uploadedFiles.length > 0 && onUploadComplete) {
      onUploadComplete(uploadedFiles);
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image className="h-8 w-8 text-blue-500" aria-label="Image file" />;
    }
    return <File className="h-8 w-8 text-gray-500" aria-label="Document file" />;
  };

  const getStatusColor = (status: UploadFile['status']) => {
    switch (status) {
      case 'pending': return 'text-gray-500';
      case 'uploading': return 'text-blue-500';
      case 'success': return 'text-green-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input {...getInputProps()} />
        <div className="space-y-4">
          <Upload className="h-12 w-12 mx-auto text-gray-400" />
          <div>
            <p className="text-lg font-medium text-gray-900">
              {isDragActive
                ? 'Drop files here'
                : 'Drag and drop files here, or click to select'
              }
            </p>
            <p className="text-sm text-gray-500">
              Supports images, videos, PDFs, and documents up to 50MB
            </p>
          </div>
        </div>
      </div>

      {/* File List */}
      {uploadFiles.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Files to Upload ({uploadFiles.length})
            </h3>
            <div className="space-x-2">
              <button
                onClick={() => setUploadFiles([])}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
                disabled={isUploading}
              >
                Clear All
              </button>
              <button
                onClick={handleUploadFiles}
                disabled={isUploading || uploadFiles.every(f => f.status !== 'pending')}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? 'Uploading...' : 'Upload Files'}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {uploadFiles.map((uploadFile) => (
              <div
                key={uploadFile.id}
                className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
              >
                {getFileIcon(uploadFile.file)}

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {uploadFile.file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(uploadFile.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  {uploadFile.status === 'error' && uploadFile.error && (
                    <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3" />
                      {uploadFile.error}
                    </p>
                  )}
                  {uploadFile.status === 'success' && uploadFile.url && (
                    <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                      <CheckCircle className="h-3 w-3" />
                      Uploaded
                    </p>
                  )}
                </div>

                {uploadFile.status === 'uploading' && (
                  <div className="w-24">
                    <div className="bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadFile.progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {uploadFile.progress}%
                    </p>
                  </div>
                )}

                <div className={`text-sm font-medium ${getStatusColor(uploadFile.status)}`}>
                  {uploadFile.status === 'pending' && 'Ready'}
                  {uploadFile.status === 'uploading' && 'Uploading...'}
                  {uploadFile.status === 'success' && 'Complete'}
                  {uploadFile.status === 'error' && 'Failed'}
                </div>

                <button
                  onClick={() => removeFile(uploadFile.id)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                  disabled={uploadFile.status === 'uploading'}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Guidelines */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Upload Guidelines</h4>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• Maximum file size: 50MB</li>
          <li>• Supported formats: JPEG, PNG, GIF, WebP, MP4, MOV, PDF, DOC, DOCX</li>
          <li>• Images are automatically optimized (WebP + AVIF variants generated)</li>
          <li>• All uploads are stored in cloud storage</li>
        </ul>
      </div>
    </div>
  );
}
