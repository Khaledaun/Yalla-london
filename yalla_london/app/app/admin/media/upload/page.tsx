export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { Suspense } from 'react';
import { PremiumAdminLayout } from '@/components/admin/premium-admin-layout';
import { MediaUploader } from '@/components/admin/media-uploader';

export default function MediaUploadPage() {
  return (
    <PremiumAdminLayout 
      title="Upload Media"
      breadcrumbs={[
        { label: 'Media', href: '/admin/media' },
        { label: 'Upload' }
      ]}
      actions={
        <div className="flex items-center space-x-2">
          <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
            View Library
          </button>
          <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700">
            Bulk Upload
          </button>
        </div>
      }
    >
      <Suspense fallback={
        <div className="animate-pulse space-y-4">
          <div className="h-64 bg-gray-200 rounded-lg"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-48 bg-gray-200 rounded-lg"></div>
            <div className="h-48 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      }>
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Files</h2>
            <MediaUploader />
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Progress</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>No uploads in progress</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Uploads</h2>
            <div className="text-sm text-gray-500">
              Recent media uploads will appear here
            </div>
          </div>
        </div>
      </Suspense>
    </PremiumAdminLayout>
  );
}