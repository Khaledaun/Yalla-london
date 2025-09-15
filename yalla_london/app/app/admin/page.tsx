export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { PremiumAdminLayout } from '@/src/components/admin/premium-admin-layout'
import { isPremiumFeatureEnabled } from '@/src/lib/feature-flags'
import { Activity, Settings, Shield } from 'lucide-react'

export default function AdminPage() {
  const premiumEnabled = isPremiumFeatureEnabled('PREMIUM_BACKEND')
  
  if (premiumEnabled) {
    // Redirect to dashboard if premium is enabled
    return (
      <PremiumAdminLayout title="Admin">
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <Activity className="mx-auto h-12 w-12 text-blue-500" />
              <h2 className="mt-4 text-xl font-bold text-gray-900">Welcome to Yalla London Admin</h2>
              <p className="mt-2 text-gray-600">
                Premium backend features are now enabled. Use the navigation to access all features.
              </p>
              <div className="mt-6">
                <a 
                  href="/admin/dashboard"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Go to Dashboard
                </a>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Activity className="h-8 w-8 text-blue-500" />
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Dashboard</h3>
                  <p className="text-sm text-gray-500">Site overview and analytics</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Settings className="h-8 w-8 text-green-500" />
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Content</h3>
                  <p className="text-sm text-gray-500">Manage articles and media</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Shield className="h-8 w-8 text-purple-500" />
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Security</h3>
                  <p className="text-sm text-gray-500">User management and permissions</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PremiumAdminLayout>
    )
  }
  
  // Fallback to enhanced admin dashboard if available
  const { EnhancedAdminDashboard } = require('@/components/admin/enhanced-admin-dashboard')
  return <EnhancedAdminDashboard />
}
