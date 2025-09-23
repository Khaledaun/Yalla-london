'use client'

import { useState, useEffect } from 'react'
import { 
  DollarSign, 
  Plus, 
  Edit, 
  Trash2, 
  Copy, 
  Check, 
  ExternalLink,
  Search,
  Filter,
  Tag,
  Link,
  Eye,
  TrendingUp,
  Calendar,
  Target
} from 'lucide-react'

interface AffiliateCode {
  id: string
  name: string
  description: string
  code: string
  url: string
  category: string
  commission: number
  status: 'active' | 'inactive' | 'pending'
  createdAt: string
  lastUsed?: string
  usageCount: number
  revenue: number
}

interface AffiliateCategory {
  id: string
  name: string
  description: string
  color: string
}

export default function AffiliateMarketing() {
  const [activeTab, setActiveTab] = useState<'codes' | 'categories' | 'analytics'>('codes')
  const [affiliateCodes, setAffiliateCodes] = useState<AffiliateCode[]>([])
  const [categories, setCategories] = useState<AffiliateCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddCode, setShowAddCode] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')

  useEffect(() => {
    loadAffiliateData()
  }, [])

  const loadAffiliateData = async () => {
    setIsLoading(true)
    try {
      // Mock data - will be replaced with real API calls
      const mockCodes: AffiliateCode[] = [
        {
          id: '1',
          name: 'Booking.com Hotels',
          description: 'Hotel bookings in London and worldwide',
          code: 'YALLA2024',
          url: 'https://www.booking.com/special-offers.html?aid=123456&label=yalla-london',
          category: 'accommodation',
          commission: 4.5,
          status: 'active',
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          lastUsed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          usageCount: 45,
          revenue: 1250.50
        },
        {
          id: '2',
          name: 'GetYourGuide Tours',
          description: 'London tours and attractions tickets',
          code: 'YALLA-TOURS',
          url: 'https://www.getyourguide.com/london-l57/?partner_id=789012&utm_source=yalla-london',
          category: 'tours',
          commission: 6.0,
          status: 'active',
          createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
          lastUsed: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          usageCount: 32,
          revenue: 890.25
        },
        {
          id: '3',
          name: 'Uber Eats',
          description: 'Food delivery in London',
          code: 'YALLAEATS',
          url: 'https://ubereats.com/gb/london?promo=YALLAEATS',
          category: 'food',
          commission: 2.0,
          status: 'active',
          createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
          lastUsed: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          usageCount: 18,
          revenue: 156.80
        },
        {
          id: '4',
          name: 'Amazon UK',
          description: 'General shopping and travel accessories',
          code: 'YALLA-AMAZON',
          url: 'https://amazon.co.uk/?tag=yallalondon-21',
          category: 'shopping',
          commission: 3.5,
          status: 'inactive',
          createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          lastUsed: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          usageCount: 12,
          revenue: 78.90
        }
      ]

      const mockCategories: AffiliateCategory[] = [
        { id: '1', name: 'Accommodation', description: 'Hotels, hostels, and accommodation', color: 'blue' },
        { id: '2', name: 'Tours', description: 'Tours, attractions, and experiences', color: 'green' },
        { id: '3', name: 'Food', description: 'Restaurants and food delivery', color: 'orange' },
        { id: '4', name: 'Shopping', description: 'Retail and general shopping', color: 'purple' },
        { id: '5', name: 'Transport', description: 'Transportation and travel', color: 'red' }
      ]

      setAffiliateCodes(mockCodes)
      setCategories(mockCategories)
    } catch (error) {
      console.error('Failed to load affiliate data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch (error) {
      console.error('Failed to copy code:', error)
    }
  }

  const handleToggleStatus = (codeId: string) => {
    setAffiliateCodes(prev => prev.map(code => 
      code.id === codeId 
        ? { ...code, status: code.status === 'active' ? 'inactive' : 'active' }
        : code
    ))
  }

  const handleDeleteCode = (codeId: string) => {
    if (confirm('Are you sure you want to delete this affiliate code?')) {
      setAffiliateCodes(prev => prev.filter(code => code.id !== codeId))
    }
  }

  const getCategoryColor = (category: string) => {
    const cat = categories.find(c => c.id === category)
    switch (cat?.color) {
      case 'blue': return 'bg-blue-100 text-blue-800'
      case 'green': return 'bg-green-100 text-green-800'
      case 'orange': return 'bg-orange-100 text-orange-800'
      case 'purple': return 'bg-purple-100 text-purple-800'
      case 'red': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredCodes = affiliateCodes.filter(code => {
    const matchesSearch = code.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         code.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         code.code.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = filterCategory === 'all' || code.category === filterCategory
    return matchesSearch && matchesCategory
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="text-center">
          <DollarSign className="h-12 w-12 animate-pulse text-purple-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">Loading Affiliate Marketing...</h2>
          <p className="text-gray-600">Setting up your affiliate management tools</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-purple-500" />
            Affiliate Marketing
          </h1>
          <p className="text-gray-600 mt-1">Manage affiliate codes and track performance</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddCode(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <Plus className="h-4 w-4" />
            Add Affiliate Code
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">£2,376.45</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Codes</p>
              <p className="text-2xl font-bold text-gray-900">{affiliateCodes.filter(c => c.status === 'active').length}</p>
            </div>
            <Target className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Clicks</p>
              <p className="text-2xl font-bold text-gray-900">{affiliateCodes.reduce((sum, code) => sum + code.usageCount, 0)}</p>
            </div>
            <ExternalLink className="h-8 w-8 text-purple-500" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg. Commission</p>
              <p className="text-2xl font-bold text-gray-900">{affiliateCodes.reduce((sum, code) => sum + code.commission, 0) / affiliateCodes.length}%</p>
            </div>
            <DollarSign className="h-8 w-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'codes', label: 'Affiliate Codes', icon: Tag },
            { id: 'categories', label: 'Categories', icon: Filter },
            { id: 'analytics', label: 'Analytics', icon: TrendingUp }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'codes' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search affiliate codes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="all">All Categories</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Affiliate Codes List */}
          <div className="space-y-4">
            {filteredCodes.map((code) => (
              <div key={code.id} className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{code.name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(code.status)}`}>
                        {code.status}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(code.category)}`}>
                        {categories.find(c => c.id === code.category)?.name}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-3">{code.description}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Affiliate Code</label>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm font-mono">
                            {code.code}
                          </code>
                          <button
                            onClick={() => handleCopyCode(code.code)}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                          >
                            {copiedCode === code.code ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Commission Rate</label>
                        <div className="text-lg font-semibold text-gray-900">{code.commission}%</div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Revenue Generated</label>
                        <div className="text-lg font-semibold text-green-600">£{code.revenue.toFixed(2)}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-sm text-gray-600">
                      <span>Usage: {code.usageCount} clicks</span>
                      {code.lastUsed && (
                        <span>Last used: {new Date(code.lastUsed).toLocaleDateString()}</span>
                      )}
                      <span>Created: {new Date(code.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleToggleStatus(code.id)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium ${
                        code.status === 'active'
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {code.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                    <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCode(code.id)}
                      className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add Code Form */}
          {showAddCode && (
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Affiliate Code</h3>
              <form className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                    <input
                      type="text"
                      placeholder="e.g., Booking.com Hotels"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                      <option value="">Select Category</option>
                      {categories.map(category => (
                        <option key={category.id} value={category.id}>{category.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    rows={3}
                    placeholder="Describe this affiliate partnership..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Affiliate Code</label>
                    <input
                      type="text"
                      placeholder="e.g., YALLA2024"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Commission Rate (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="4.5"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Affiliate URL</label>
                  <input
                    type="url"
                    placeholder="https://example.com/affiliate-link"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    Add Affiliate Code
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddCode(false)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => (
              <div key={category.id} className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-4 h-4 rounded-full bg-${category.color}-500`}></div>
                  <h3 className="font-medium text-gray-900">{category.name}</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">{category.description}</p>
                <div className="text-sm text-gray-500">
                  {affiliateCodes.filter(code => code.category === category.id).length} affiliate codes
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Category</h3>
              <div className="space-y-3">
                {categories.map((category) => {
                  const categoryRevenue = affiliateCodes
                    .filter(code => code.category === category.id)
                    .reduce((sum, code) => sum + code.revenue, 0)
                  const percentage = (categoryRevenue / affiliateCodes.reduce((sum, code) => sum + code.revenue, 0)) * 100
                  
                  return (
                    <div key={category.id} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{category.name}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full bg-${category.color}-500`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900">£{categoryRevenue.toFixed(2)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Codes</h3>
              <div className="space-y-3">
                {affiliateCodes
                  .sort((a, b) => b.revenue - a.revenue)
                  .slice(0, 5)
                  .map((code) => (
                    <div key={code.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{code.name}</p>
                        <p className="text-sm text-gray-600">{code.usageCount} clicks</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">£{code.revenue.toFixed(2)}</p>
                        <p className="text-sm text-gray-600">{code.commission}%</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
