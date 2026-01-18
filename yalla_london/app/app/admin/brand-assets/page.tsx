'use client'

import { MophyAdminLayout } from '@/components/admin/mophy/mophy-admin-layout'
import { BrandAssetsLibrary } from '@/components/admin/brand-assets-library'

export default function BrandAssetsPage() {
  return (
    <MophyAdminLayout pageTitle="Brand Assets">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Brand Assets Library</h1>
            <p className="text-gray-500 dark:text-gray-400">
              Logos, colors, typography, and design elements for Canva and other tools
            </p>
          </div>
        </div>
        <BrandAssetsLibrary />
      </div>
    </MophyAdminLayout>
  )
}
