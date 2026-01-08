export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { Suspense } from 'react';
import { MediaUploadManager } from '@/components/admin/media-upload-manager';

export default function MediaUploadPage() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Media Upload</h1>
          <p className="text-sm text-gray-500 mt-1">Upload and manage your media files</p>
        </div>
        <div className="flex items-center space-x-2">
          <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
            View Library
          </button>
        </div>
      </div>
      <Suspense fallback={
        <div className="animate-pulse space-y-4">
          <div className="h-64 bg-gray-200 rounded-lg"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-40 bg-gray-200 rounded-lg"></div>
            <div className="h-40 bg-gray-200 rounded-lg"></div>
            <div className="h-40 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      }>
        <MediaUploadManager />
      </Suspense>
    </div>
  );
}
