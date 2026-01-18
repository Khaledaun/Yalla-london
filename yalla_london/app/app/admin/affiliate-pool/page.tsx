'use client'

import { MophyAdminLayout } from '@/components/admin/mophy/mophy-admin-layout'
import { AffiliatePoolManager } from '@/components/admin/affiliate-pool-manager'

export default function AffiliatePoolPage() {
  return (
    <MophyAdminLayout pageTitle="Affiliate Pool">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Affiliate Pool</h1>
            <p className="text-gray-500 dark:text-gray-400">
              Manage affiliate links for hotels, tickets, activities, and more
            </p>
          </div>
        </div>
        <AffiliatePoolManager />
      </div>
    </MophyAdminLayout>
  )
}
