export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { Suspense } from 'react';
import { PremiumAdminLayout } from '@/src/components/admin/premium-admin-layout';
import { PrivacyPageEditor } from '@/src/components/admin/privacy-page-editor';

export default function PrivacyPageEditorPage() {
  return (
    <PremiumAdminLayout 
      title="Privacy Page Editor"
      breadcrumbs={[
        { label: 'Content', href: '/admin/content' },
        { label: 'Pages', href: '/admin/content/pages' },
        { label: 'Privacy Policy' }
      ]}
      actions={
        <div className="flex items-center space-x-2">
          <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
            Preview Live
          </button>
          <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700">
            Publish Changes
          </button>
        </div>
      }
    >
      <Suspense fallback={
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="space-y-4">
              <div className="h-40 bg-gray-200 rounded-lg"></div>
              <div className="h-60 bg-gray-200 rounded-lg"></div>
            </div>
            <div className="lg:col-span-3 space-y-4">
              <div className="h-12 bg-gray-200 rounded-lg"></div>
              <div className="h-96 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        </div>
      }>
        <PrivacyPageEditor />
      </Suspense>
    </PremiumAdminLayout>
  );
}