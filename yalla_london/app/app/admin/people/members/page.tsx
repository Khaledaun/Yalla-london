import { Users, Plus, Search, Filter, Shield, Mail, MoreVertical, UserPlus } from 'lucide-react'
import { isPremiumFeatureEnabled } from '@/lib/feature-flags'

export default function MembersPage() {
  const peopleManagementEnabled = isPremiumFeatureEnabled('PEOPLE_MANAGEMENT')
  
  if (!peopleManagementEnabled) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h2 className="mt-4 text-lg font-medium text-gray-900">People Management Not Available</h2>
          <p className="mt-2 text-gray-500">
            People management features are not currently enabled.
          </p>
        </div>
      </div>
    )
  }

  // Mock users data
  const users = [
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'admin',
      status: 'active',
      lastLogin: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30), // 30 days ago
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      role: 'editor',
      status: 'active',
      lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15), // 15 days ago
    },
    {
      id: '3',
      name: 'Mike Johnson',
      email: 'mike@example.com',
      role: 'reviewer',
      status: 'invited',
      lastLogin: null,
      joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
    }
  ]

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800'
      case 'editor': return 'bg-blue-100 text-blue-800'
      case 'reviewer': return 'bg-yellow-100 text-yellow-800'
      case 'viewer': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'invited': return 'bg-yellow-100 text-yellow-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatTimeAgo = (date: Date | null) => {
    if (!date) return 'Never'
    
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Members & Roles</h1>
          <p className="text-sm text-gray-500 mt-1">Manage team members and their roles</p>
        </div>
        <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          <UserPlus size={16} />
          <span>Invite User</span>
        </button>
      </div>
      <div className="space-y-6">
        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Team Members</h3>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search members..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <button className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                <Filter size={16} />
                <span>Filter by Role</span>
              </button>
            </div>
          </div>

          {/* Members Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <Users className="h-5 w-5 text-gray-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                        <Shield size={12} className="mr-1" />
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(user.status)}`}>
                        {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatTimeAgo(user.lastLogin)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.joinedAt.toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        {user.status === 'invited' && (
                          <button className="text-blue-600 hover:text-blue-900 flex items-center">
                            <Mail size={16} className="mr-1" />
                            Resend
                          </button>
                        )}
                        <button className="text-gray-400 hover:text-gray-600">
                          <MoreVertical size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Role Definitions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Role Definitions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Shield className="h-5 w-5 text-red-500 mr-2" />
                <h4 className="font-medium text-gray-900">Admin</h4>
              </div>
              <p className="text-sm text-gray-500">
                Full access to all features including user management, settings, and system configuration.
              </p>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Shield className="h-5 w-5 text-blue-500 mr-2" />
                <h4 className="font-medium text-gray-900">Editor</h4>
              </div>
              <p className="text-sm text-gray-500">
                Can create, edit, and publish content. Access to content management and media library.
              </p>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Shield className="h-5 w-5 text-yellow-500 mr-2" />
                <h4 className="font-medium text-gray-900">Reviewer</h4>
              </div>
              <p className="text-sm text-gray-500">
                Can review and approve content in the review queue. Cannot publish directly.
              </p>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Shield className="h-5 w-5 text-gray-500 mr-2" />
                <h4 className="font-medium text-gray-900">Viewer</h4>
              </div>
              <p className="text-sm text-gray-500">
                Read-only access to content and analytics. Can view but cannot modify anything.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{users.length}</div>
                <div className="text-sm text-gray-500">Total Members</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  {users.filter(u => u.status === 'active').length}
                </div>
                <div className="text-sm text-gray-500">Active Users</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <Mail className="h-8 w-8 text-yellow-500" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  {users.filter(u => u.status === 'invited').length}
                </div>
                <div className="text-sm text-gray-500">Pending Invites</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-red-500" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  {users.filter(u => u.role === 'admin').length}
                </div>
                <div className="text-sm text-gray-500">Admins</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}