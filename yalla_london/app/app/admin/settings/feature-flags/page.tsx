import { PremiumAdminLayout } from '@/src/components/admin/premium-admin-layout'
import { Flag, ToggleLeft, ToggleRight, Info, ExternalLink, RefreshCw } from 'lucide-react'
import { isPremiumFeatureEnabled, getPremiumFeatureFlagsByCategory } from '@/src/lib/feature-flags'

export default function FeatureFlagsPage() {
  const settingsManagementEnabled = isPremiumFeatureEnabled('SETTINGS_MANAGEMENT')
  
  if (!settingsManagementEnabled) {
    return (
      <PremiumAdminLayout title="Feature Flags">
        <div className="text-center py-12">
          <Flag className="mx-auto h-12 w-12 text-gray-400" />
          <h2 className="mt-4 text-lg font-medium text-gray-900">Settings Management Not Available</h2>
          <p className="mt-2 text-gray-500">
            Settings management features are not currently enabled.
          </p>
        </div>
      </PremiumAdminLayout>
    )
  }

  // Get all feature flags by category
  const flagsByCategory = getPremiumFeatureFlagsByCategory()

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      core: 'bg-blue-100 text-blue-800',
      navigation: 'bg-purple-100 text-purple-800',
      dashboard: 'bg-green-100 text-green-800',
      content: 'bg-yellow-100 text-yellow-800',
      design: 'bg-pink-100 text-pink-800',
      people: 'bg-indigo-100 text-indigo-800',
      integrations: 'bg-orange-100 text-orange-800',
      automations: 'bg-red-100 text-red-800',
      affiliates: 'bg-teal-100 text-teal-800',
      settings: 'bg-gray-100 text-gray-800',
      ux: 'bg-cyan-100 text-cyan-800',
      security: 'bg-red-100 text-red-800',
      observability: 'bg-green-100 text-green-800',
      performance: 'bg-blue-100 text-blue-800',
      i18n: 'bg-purple-100 text-purple-800',
      accessibility: 'bg-indigo-100 text-indigo-800'
    }
    return colors[category] || 'bg-gray-100 text-gray-800'
  }

  return (
    <PremiumAdminLayout 
      title="Feature Flags"
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Settings', href: '/admin/settings' },
        { label: 'Feature Flags' }
      ]}
      actions={
        <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          <RefreshCw size={16} />
          <span>Refresh Flags</span>
        </button>
      }
    >
      <div className="space-y-6">
        {/* Overview */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Feature Flags Overview</h3>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                Total: {Object.values(flagsByCategory).reduce((acc, flags) => acc + flags.length, 0)} flags
              </div>
              <div className="text-sm text-gray-500">
                Enabled: {Object.values(flagsByCategory).reduce((acc, flags) => acc + flags.filter(f => f.enabled).length, 0)}
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex">
              <Info className="h-5 w-5 text-blue-400 mt-0.5" />
              <div className="ml-3">
                <h4 className="text-sm font-medium text-blue-800">About Feature Flags</h4>
                <p className="mt-1 text-sm text-blue-700">
                  Feature flags allow you to enable or disable specific functionality without code changes. 
                  Flags are controlled by environment variables and can be toggled per site.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Flags by Category */}
        {Object.entries(flagsByCategory).map(([category, flags]) => (
          <div key={category} className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <h3 className="text-lg font-medium text-gray-900 capitalize">{category}</h3>
                  <span className={`ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(category)}`}>
                    {flags.length} flags
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  {flags.filter(f => f.enabled).length} enabled
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {flags.map((flag) => (
                  <div key={flag.key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <h4 className="text-sm font-medium text-gray-900">{flag.key}</h4>
                        {flag.scope && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            {flag.scope}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-gray-500">{flag.description}</p>
                      {!flag.enabled && flag.disabledReason && (
                        <p className="mt-1 text-xs text-red-600">
                          Disabled: {flag.disabledReason}
                        </p>
                      )}
                      {flag.enableLink && !flag.enabled && (
                        <div className="mt-2">
                          <a 
                            href={flag.enableLink}
                            className="inline-flex items-center text-xs text-blue-600 hover:text-blue-500"
                          >
                            <ExternalLink size={12} className="mr-1" />
                            Enable this feature
                          </a>
                        </div>
                      )}
                    </div>
                    <div className="ml-4 flex items-center">
                      <div className="flex items-center">
                        {flag.enabled ? (
                          <div className="flex items-center text-green-600">
                            <ToggleRight size={24} />
                            <span className="ml-2 text-sm font-medium">Enabled</span>
                          </div>
                        ) : (
                          <div className="flex items-center text-gray-400">
                            <ToggleLeft size={24} />
                            <span className="ml-2 text-sm font-medium">Disabled</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* Environment Variables Guide */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Environment Variables</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">To enable features, set these environment variables:</h4>
            <div className="space-y-2">
              <div className="font-mono text-sm text-gray-700">
                <code>FEATURE_PREMIUM_BACKEND=true</code> <span className="text-gray-500"># Master toggle</span>
              </div>
              <div className="font-mono text-sm text-gray-700">
                <code>FEATURE_ADMIN_DASHBOARD=true</code> <span className="text-gray-500"># Enable dashboard</span>
              </div>
              <div className="font-mono text-sm text-gray-700">
                <code>FEATURE_CONTENT_MANAGEMENT=true</code> <span className="text-gray-500"># Enable content features</span>
              </div>
              <div className="text-sm text-gray-500 mt-2">
                Set any feature flag to <code className="bg-gray-200 px-1 rounded">false</code> or remove the variable to disable it.
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <Flag className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  {Object.values(flagsByCategory).reduce((acc, flags) => acc + flags.length, 0)}
                </div>
                <div className="text-sm text-gray-500">Total Flags</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <ToggleRight className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  {Object.values(flagsByCategory).reduce((acc, flags) => acc + flags.filter(f => f.enabled).length, 0)}
                </div>
                <div className="text-sm text-gray-500">Enabled</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <ToggleLeft className="h-8 w-8 text-gray-500" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  {Object.values(flagsByCategory).reduce((acc, flags) => acc + flags.filter(f => !f.enabled).length, 0)}
                </div>
                <div className="text-sm text-gray-500">Disabled</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <Flag className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  {Object.keys(flagsByCategory).length}
                </div>
                <div className="text-sm text-gray-500">Categories</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PremiumAdminLayout>
  )
}