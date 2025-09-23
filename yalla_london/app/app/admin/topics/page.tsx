'use client'

import { useState } from 'react'
import { 
  Lightbulb, 
  Plus, 
  Filter, 
  Search, 
  Calendar,
  Zap,
  Clock,
  CheckCircle,
  AlertCircle,
  Edit,
  Trash2,
  ArrowUp,
  ArrowDown,
  GripVertical
} from 'lucide-react'

export default function TopicsPipeline() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterLocale, setFilterLocale] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  const topics = [
    {
      id: 1,
      title: 'Best Luxury Hotels in Mayfair',
      locale: 'en',
      pageType: 'guide',
      primaryKeyword: 'luxury hotels mayfair',
      longTail1: 'best luxury hotels mayfair london',
      longTail2: '5 star hotels mayfair london',
      authorityLink1: 'https://www.timeout.com/london/hotels/best-luxury-hotels-mayfair',
      authorityLink2: 'https://www.cntraveler.com/gallery/best-hotels-mayfair-london',
      authorityLink3: 'https://www.telegraph.co.uk/travel/destinations/europe/united-kingdom/england/london/hotels/mayfair/',
      authorityLink4: 'https://www.condenasttraveler.com/gallery/best-hotels-mayfair-london',
      priority: 0, // P0
      isEvergreen: true,
      isSeasonal: false,
      plannedGenerationTime: '2024-01-15T10:00:00Z',
      status: 'scheduled'
    },
    {
      id: 2,
      title: 'أفضل المطاعم العربية في لندن',
      locale: 'ar',
      pageType: 'guide',
      primaryKeyword: 'مطاعم عربية لندن',
      longTail1: 'أفضل المطاعم العربية في لندن 2024',
      longTail2: 'مطاعم عربية حلال في لندن',
      authorityLink1: 'https://www.timeout.com/london/restaurants/best-arabic-restaurants',
      authorityLink2: 'https://www.cntraveler.com/gallery/best-middle-eastern-restaurants-london',
      authorityLink3: 'https://www.telegraph.co.uk/travel/destinations/europe/united-kingdom/england/london/restaurants/arabic/',
      authorityLink4: null,
      priority: 1, // P1
      isEvergreen: true,
      isSeasonal: false,
      plannedGenerationTime: '2024-01-15T14:00:00Z',
      status: 'scheduled'
    },
    {
      id: 3,
      title: 'Chelsea FC Stadium Tour Guide',
      locale: 'en',
      pageType: 'event',
      primaryKeyword: 'chelsea stadium tour',
      longTail1: 'chelsea fc stadium tour london',
      longTail2: 'stamford bridge tour tickets',
      authorityLink1: 'https://www.chelseafc.com/en/stadium-tours',
      authorityLink2: 'https://www.timeout.com/london/attractions/chelsea-fc-stadium-tour',
      authorityLink3: 'https://www.visitlondon.com/things-to-do/place/281311-stamford-bridge',
      authorityLink4: 'https://www.londonpass.com/london-attractions/stamford-bridge-tour.html',
      priority: 2, // P2
      isEvergreen: false,
      isSeasonal: true,
      plannedGenerationTime: '2024-01-16T09:00:00Z',
      status: 'pending'
    },
    {
      id: 4,
      title: 'London Shopping Guide 2024',
      locale: 'en',
      pageType: 'guide',
      primaryKeyword: 'london shopping guide',
      longTail1: 'best shopping areas london 2024',
      longTail2: 'london shopping districts guide',
      authorityLink1: 'https://www.timeout.com/london/shopping/best-shopping-areas',
      authorityLink2: 'https://www.cntraveler.com/gallery/best-shopping-london',
      authorityLink3: 'https://www.telegraph.co.uk/travel/destinations/europe/united-kingdom/england/london/shopping/',
      authorityLink4: 'https://www.visitlondon.com/things-to-do/shopping',
      priority: 3, // P3
      isEvergreen: true,
      isSeasonal: false,
      plannedGenerationTime: null,
      status: 'pending'
    }
  ]

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 0: return 'bg-red-100 text-red-800'
      case 1: return 'bg-orange-100 text-orange-800'
      case 2: return 'bg-yellow-100 text-yellow-800'
      case 3: return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityLabel = (priority: number) => {
    return `P${priority}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800'
      case 'pending': return 'bg-gray-100 text-gray-800'
      case 'generating': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredTopics = topics.filter(topic => {
    const matchesSearch = topic.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         topic.primaryKeyword.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesLocale = filterLocale === 'all' || topic.locale === filterLocale
    const matchesPriority = filterPriority === 'all' || topic.priority.toString() === filterPriority
    const matchesStatus = filterStatus === 'all' || topic.status === filterStatus
    
    return matchesSearch && matchesLocale && matchesPriority && matchesStatus
  })

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Lightbulb className="h-8 w-8 text-yellow-500" />
              Topics & Pipeline
            </h1>
            <p className="text-gray-600 mt-1">Priority, queue, Generate Now</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors">
              <Zap className="h-4 w-4" />
              Generate More Topics
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors">
              <Plus className="h-4 w-4" />
              Add Topic
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search topics..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent w-full"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Locale</label>
            <select
              value={filterLocale}
              onChange={(e) => setFilterLocale(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            >
              <option value="all">All Locales</option>
              <option value="en">English</option>
              <option value="ar">Arabic</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            >
              <option value="all">All Priorities</option>
              <option value="0">P0 - Critical</option>
              <option value="1">P1 - High</option>
              <option value="2">P2 - Medium</option>
              <option value="3">P3 - Low</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="scheduled">Scheduled</option>
              <option value="generating">Generating</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Topics Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Topics ({filteredTopics.length})</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Topic
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Locale
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Scheduled Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTopics.map((topic) => (
                <tr key={topic.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <GripVertical className="h-4 w-4 text-gray-400 mr-2 cursor-move" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{topic.title}</div>
                        <div className="text-sm text-gray-500 mb-1">
                          <span className="font-medium">Primary:</span> {topic.primaryKeyword}
                        </div>
                        <div className="text-xs text-gray-600 mb-1">
                          <span className="font-medium">Longtails:</span> {topic.longTail1}, {topic.longTail2}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">{topic.pageType}</span>
                          {topic.isEvergreen && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                              Evergreen
                            </span>
                          )}
                          {topic.isSeasonal && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                              Seasonal
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      topic.locale === 'en' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {topic.locale.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(topic.priority)}`}>
                      {getPriorityLabel(topic.priority)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(topic.status)}`}>
                      {topic.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {topic.plannedGenerationTime ? (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {new Date(topic.plannedGenerationTime).toLocaleDateString()}
                        <br />
                        <span className="text-xs text-gray-500">
                          {new Date(topic.plannedGenerationTime).toLocaleTimeString()}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400">Not scheduled</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button className="text-yellow-600 hover:text-yellow-900" title="Generate Now">
                        <Zap className="h-4 w-4" />
                      </button>
                      <button className="text-blue-600 hover:text-blue-900" title="Edit">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button className="text-gray-600 hover:text-gray-900" title="Change Priority">
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button className="text-red-600 hover:text-red-900" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Backlog Counters */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Backlog Counters</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">English Topics</span>
              <span className="text-sm font-medium text-gray-900">
                {topics.filter(t => t.locale === 'en').length} topics
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Arabic Topics</span>
              <span className="text-sm font-medium text-gray-900">
                {topics.filter(t => t.locale === 'ar').length} topics
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Scheduled for Generation</span>
              <span className="text-sm font-medium text-gray-900">
                {topics.filter(t => t.status === 'scheduled').length} topics
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Pending Topics</span>
              <span className="text-sm font-medium text-gray-900">
                {topics.filter(t => t.status === 'pending').length} topics
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Priority Distribution</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">P0 - Critical</span>
              <span className="text-sm font-medium text-red-600">
                {topics.filter(t => t.priority === 0).length} topics
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">P1 - High</span>
              <span className="text-sm font-medium text-orange-600">
                {topics.filter(t => t.priority === 1).length} topics
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">P2 - Medium</span>
              <span className="text-sm font-medium text-yellow-600">
                {topics.filter(t => t.priority === 2).length} topics
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">P3 - Low</span>
              <span className="text-sm font-medium text-gray-600">
                {topics.filter(t => t.priority === 3).length} topics
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}