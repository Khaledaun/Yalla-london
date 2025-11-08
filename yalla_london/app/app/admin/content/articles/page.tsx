import { PremiumAdminLayout } from '@/components/admin/premium-admin-layout'
import { FileText, Plus, Search, Filter, Eye, Edit3, Trash2 } from 'lucide-react'
import { isPremiumFeatureEnabled } from '@/lib/feature-flags'

export default function ArticlesPage() {
  const contentManagementEnabled = isPremiumFeatureEnabled('CONTENT_MANAGEMENT')
  
  if (!contentManagementEnabled) {
    return (
      <PremiumAdminLayout title="Articles">
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h2 className="mt-4 text-lg font-medium text-gray-900">Content Management Not Available</h2>
          <p className="mt-2 text-gray-500">
            Content management features are not currently enabled.
          </p>
        </div>
      </PremiumAdminLayout>
    )
  }

  // Mock articles data
  const articles = [
    {
      id: '1',
      title: 'Complete Guide to London Museums',
      status: 'published',
      author: 'John Doe',
      views: 1247,
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    },
    {
      id: '2',
      title: 'Best London Markets 2024',
      status: 'review',
      author: 'Jane Smith',
      views: 0,
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 4),
    },
    {
      id: '3',
      title: 'London Food Festival Preview',
      status: 'scheduled',
      author: 'Mike Johnson',
      views: 0,
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 6),
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800'
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'review': return 'bg-yellow-100 text-yellow-800'
      case 'scheduled': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <PremiumAdminLayout 
      title="Articles"
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Content', href: '/admin/content' },
        { label: 'Articles' }
      ]}
      actions={
        <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          <Plus size={16} />
          <span>New Article</span>
        </button>
      }
    >
      <div className="space-y-6">
        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">All Articles</h3>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search articles..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <button className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                <Filter size={16} />
                <span>Filters</span>
              </button>
            </div>
          </div>

          {/* Articles Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Author
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Views
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Updated
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {articles.map((article) => (
                  <tr key={article.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {article.title}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(article.status)}`}>
                        {article.status.charAt(0).toUpperCase() + article.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {article.author}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Eye size={14} className="mr-1" />
                        {article.views.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {article.updatedAt.toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button className="text-blue-600 hover:text-blue-900">
                          <Edit3 size={16} />
                        </button>
                        <button className="text-red-600 hover:text-red-900">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">186</div>
                <div className="text-sm text-gray-500">Total Articles</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Eye className="h-8 w-8 text-green-500" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">24.8K</div>
                <div className="text-sm text-gray-500">Total Views</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-8 w-8 text-yellow-500" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">12</div>
                <div className="text-sm text-gray-500">In Review</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-8 w-8 text-purple-500" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">8</div>
                <div className="text-sm text-gray-500">Drafts</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PremiumAdminLayout>
  )
}