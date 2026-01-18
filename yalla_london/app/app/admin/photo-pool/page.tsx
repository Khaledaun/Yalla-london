'use client'

import { MophyAdminLayout } from '@/components/admin/mophy/mophy-admin-layout'
import { PhotoPoolManager } from '@/components/admin/photo-pool-manager'

export default function PhotoPoolPage() {
  return (
    <MophyAdminLayout pageTitle="Photo Pool">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Photo Pool</h1>
            <p className="text-gray-500 dark:text-gray-400">
              Manage categorized photos for events, hotels, restaurants, and more
            </p>
          </div>
        </div>
        <PhotoPoolManager />
      </div>
    </MophyAdminLayout>
  )
}
