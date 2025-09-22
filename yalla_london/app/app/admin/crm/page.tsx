'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Users,
  Mail,
  Plus,
  Edit,
  Trash2,
  Send,
  Eye,
  Calendar,
  TrendingUp,
  BarChart3,
  Filter,
  Search,
  Download,
  Upload,
  Target,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Globe,
  User,
  Phone,
  MapPin
} from 'lucide-react'
import { toast } from 'sonner'

interface Subscriber {
  id: string
  email: string
  name?: string
  status: 'active' | 'unsubscribed' | 'bounced'
  subscribedAt: string
  lastActivity: string
  source: 'website' | 'social' | 'referral' | 'manual'
  tags: string[]
  location?: string
  interests: string[]
  engagement: {
    opens: number
    clicks: number
    lastOpen: string
  }
}

interface Campaign {
  id: string
  name: string
  subject: string
  content: string
  status: 'draft' | 'scheduled' | 'sent' | 'paused'
  scheduledAt?: string
  sentAt?: string
  recipients: number
  opens: number
  clicks: number
  unsubscribes: number
  createdAt: string
  tags: string[]
}

interface Analytics {
  totalSubscribers: number
  newThisWeek: number
  unsubscribed: number
  engagementRate: number
  openRate: number
  clickRate: number
  topCountries: { country: string; count: number }[]
  topInterests: { interest: string; count: number }[]
  monthlyGrowth: number[]
}

export default function CRMSystem() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([
    {
      id: '1',
      email: 'john.doe@example.com',
      name: 'John Doe',
      status: 'active',
      subscribedAt: '2024-01-10',
      lastActivity: '2024-01-15',
      source: 'website',
      tags: ['london', 'food', 'travel'],
      location: 'London, UK',
      interests: ['restaurants', 'events', 'travel'],
      engagement: {
        opens: 12,
        clicks: 8,
        lastOpen: '2024-01-15'
      }
    },
    {
      id: '2',
      email: 'sarah.smith@example.com',
      name: 'Sarah Smith',
      status: 'active',
      subscribedAt: '2024-01-12',
      lastActivity: '2024-01-14',
      source: 'social',
      tags: ['london', 'culture', 'art'],
      location: 'Manchester, UK',
      interests: ['museums', 'art', 'culture'],
      engagement: {
        opens: 8,
        clicks: 5,
        lastOpen: '2024-01-14'
      }
    },
    {
      id: '3',
      email: 'mike.wilson@example.com',
      name: 'Mike Wilson',
      status: 'active',
      subscribedAt: '2024-01-08',
      lastActivity: '2024-01-13',
      source: 'referral',
      tags: ['london', 'business', 'networking'],
      location: 'Birmingham, UK',
      interests: ['business', 'networking', 'events'],
      engagement: {
        opens: 15,
        clicks: 12,
        lastOpen: '2024-01-13'
      }
    }
  ])

  const [campaigns, setCampaigns] = useState<Campaign[]>([
    {
      id: '1',
      name: 'Weekly London Events',
      subject: 'This Week in London: Must-See Events & Hidden Gems',
      content: 'Discover the best events happening in London this week...',
      status: 'sent',
      sentAt: '2024-01-15 10:00:00',
      recipients: 2847,
      opens: 854,
      clicks: 234,
      unsubscribes: 12,
      createdAt: '2024-01-14',
      tags: ['weekly', 'events', 'london']
    },
    {
      id: '2',
      name: 'Restaurant Recommendations',
      subject: 'New Restaurant Alert: London\'s Hottest Dining Spots',
      content: 'Check out these amazing new restaurants in London...',
      status: 'scheduled',
      scheduledAt: '2024-01-20 12:00:00',
      recipients: 2847,
      opens: 0,
      clicks: 0,
      unsubscribes: 0,
      createdAt: '2024-01-16',
      tags: ['restaurants', 'food', 'dining']
    },
    {
      id: '3',
      name: 'Travel Tips & Guides',
      subject: 'Your Ultimate London Travel Guide',
      content: 'Everything you need to know for your London trip...',
      status: 'draft',
      recipients: 0,
      opens: 0,
      clicks: 0,
      unsubscribes: 0,
      createdAt: '2024-01-17',
      tags: ['travel', 'guide', 'tips']
    }
  ])

  const [analytics, setAnalytics] = useState<Analytics>({
    totalSubscribers: 2847,
    newThisWeek: 45,
    unsubscribed: 12,
    engagementRate: 23.4,
    openRate: 30.0,
    clickRate: 8.2,
    topCountries: [
      { country: 'United Kingdom', count: 1847 },
      { country: 'United States', count: 456 },
      { country: 'Canada', count: 234 },
      { country: 'Australia', count: 189 },
      { country: 'Germany', count: 121 }
    ],
    topInterests: [
      { interest: 'Restaurants', count: 1247 },
      { interest: 'Events', count: 892 },
      { interest: 'Travel', count: 654 },
      { interest: 'Culture', count: 456 },
      { interest: 'Shopping', count: 234 }
    ],
    monthlyGrowth: [2100, 2300, 2500, 2700, 2847, 0, 0, 0, 0, 0, 0, 0]
  })

  const [selectedSubscriber, setSelectedSubscriber] = useState<Subscriber | null>(null)
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'unsubscribed' | 'bounced'>('all')

  const filteredSubscribers = subscribers.filter(subscriber => {
    const matchesSearch = subscriber.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         subscriber.name?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || subscriber.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>
      case 'unsubscribed':
        return <Badge className="bg-red-500">Unsubscribed</Badge>
      case 'bounced':
        return <Badge className="bg-yellow-500">Bounced</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getCampaignStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-500">Sent</Badge>
      case 'scheduled':
        return <Badge className="bg-blue-500">Scheduled</Badge>
      case 'draft':
        return <Badge className="bg-gray-500">Draft</Badge>
      case 'paused':
        return <Badge className="bg-yellow-500">Paused</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'website':
        return <Globe className="h-4 w-4 text-blue-500" />
      case 'social':
        return <Users className="h-4 w-4 text-purple-500" />
      case 'referral':
        return <User className="h-4 w-4 text-green-500" />
      case 'manual':
        return <Plus className="h-4 w-4 text-gray-500" />
      default:
        return <Mail className="h-4 w-4 text-gray-500" />
    }
  }

  const sendCampaign = async (campaignId: string) => {
    try {
      // Simulate sending campaign
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setCampaigns(prev => prev.map(campaign => 
        campaign.id === campaignId 
          ? { ...campaign, status: 'sent' as const, sentAt: new Date().toISOString() }
          : campaign
      ))
      
      toast.success('Campaign sent successfully!')
    } catch (error) {
      toast.error('Failed to send campaign')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Users className="h-8 w-8 text-purple-500" />
                CRM & Newsletter
              </h1>
              <p className="text-gray-600 mt-1">Manage subscribers and email campaigns</p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </Button>
              <Button className="bg-purple-500 hover:bg-purple-600">
                <Plus className="h-4 w-4 mr-2" />
                New Campaign
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Analytics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Total Subscribers</p>
                  <p className="text-3xl font-bold">{analytics.totalSubscribers.toLocaleString()}</p>
                </div>
                <Users className="h-8 w-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">New This Week</p>
                  <p className="text-3xl font-bold">{analytics.newThisWeek}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Open Rate</p>
                  <p className="text-3xl font-bold">{analytics.openRate}%</p>
                </div>
                <Eye className="h-8 w-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100 text-sm">Click Rate</p>
                  <p className="text-3xl font-bold">{analytics.clickRate}%</p>
                </div>
                <Target className="h-8 w-8 text-yellow-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="subscribers" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="subscribers">Subscribers</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Subscribers Tab */}
          <TabsContent value="subscribers" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Subscribers List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Newsletter Subscribers</h3>
                  <Button className="bg-purple-500 hover:bg-purple-600">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Subscriber
                  </Button>
                </div>

                {/* Search and Filter */}
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search subscribers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="unsubscribed">Unsubscribed</option>
                    <option value="bounced">Bounced</option>
                  </select>
                </div>

                {filteredSubscribers.map((subscriber) => (
                  <Card 
                    key={subscriber.id} 
                    className={`cursor-pointer transition-all ${
                      selectedSubscriber?.id === subscriber.id ? 'ring-2 ring-purple-500' : 'hover:shadow-md'
                    }`}
                    onClick={() => setSelectedSubscriber(subscriber)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium text-gray-900">
                              {subscriber.name || subscriber.email}
                            </h4>
                            {getSourceIcon(subscriber.source)}
                            {getStatusBadge(subscriber.status)}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{subscriber.email}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>Joined: {subscriber.subscribedAt}</span>
                            <span>Last activity: {subscriber.lastActivity}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            {subscriber.tags.slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">
                            {subscriber.engagement.opens} opens
                          </div>
                          <div className="text-xs text-gray-500">
                            {subscriber.engagement.clicks} clicks
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Subscriber Details */}
              <div>
                {selectedSubscriber ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Subscriber Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-purple-500 text-white rounded-full flex items-center justify-center">
                          {selectedSubscriber.name ? selectedSubscriber.name[0].toUpperCase() : selectedSubscriber.email[0].toUpperCase()}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold">
                            {selectedSubscriber.name || 'No Name'}
                          </h3>
                          <p className="text-gray-600">{selectedSubscriber.email}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Status</Label>
                          <div className="mt-1">{getStatusBadge(selectedSubscriber.status)}</div>
                        </div>
                        <div>
                          <Label>Source</Label>
                          <div className="flex items-center gap-2 mt-1">
                            {getSourceIcon(selectedSubscriber.source)}
                            <span className="text-sm capitalize">{selectedSubscriber.source}</span>
                          </div>
                        </div>
                      </div>

                      {selectedSubscriber.location && (
                        <div>
                          <Label>Location</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">{selectedSubscriber.location}</span>
                          </div>
                        </div>
                      )}

                      <div>
                        <Label>Interests</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {selectedSubscriber.interests.map((interest) => (
                            <Badge key={interest} variant="outline" className="text-xs">
                              {interest}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div>
                        <Label>Tags</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {selectedSubscriber.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">
                            {selectedSubscriber.engagement.opens}
                          </div>
                          <div className="text-xs text-gray-600">Email Opens</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">
                            {selectedSubscriber.engagement.clicks}
                          </div>
                          <div className="text-xs text-gray-600">Link Clicks</div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1">
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Subscriber
                        </Button>
                        <Button variant="outline" className="flex-1">
                          <Mail className="h-4 w-4 mr-2" />
                          Send Email
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Subscriber</h3>
                      <p className="text-gray-600">Choose a subscriber from the list to view details</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Campaigns List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Email Campaigns</h3>
                  <Button
                    onClick={() => setIsCreatingCampaign(true)}
                    className="bg-purple-500 hover:bg-purple-600"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Campaign
                  </Button>
                </div>
                {campaigns.map((campaign) => (
                  <Card 
                    key={campaign.id} 
                    className={`cursor-pointer transition-all ${
                      selectedCampaign?.id === campaign.id ? 'ring-2 ring-purple-500' : 'hover:shadow-md'
                    }`}
                    onClick={() => setSelectedCampaign(campaign)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium text-gray-900">{campaign.name}</h4>
                            {getCampaignStatusBadge(campaign.status)}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{campaign.subject}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>Recipients: {campaign.recipients}</span>
                            <span>Opens: {campaign.opens}</span>
                            <span>Clicks: {campaign.clicks}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-500">
                            {campaign.status === 'sent' && campaign.sentAt && (
                              <span>Sent: {new Date(campaign.sentAt).toLocaleDateString()}</span>
                            )}
                            {campaign.status === 'scheduled' && campaign.scheduledAt && (
                              <span>Scheduled: {new Date(campaign.scheduledAt).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Campaign Details */}
              <div>
                {selectedCampaign ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Mail className="h-5 w-5" />
                        Campaign Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h3 className="text-xl font-bold">{selectedCampaign.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          {getCampaignStatusBadge(selectedCampaign.status)}
                        </div>
                      </div>

                      <div>
                        <Label>Subject Line</Label>
                        <Input value={selectedCampaign.subject} readOnly />
                      </div>

                      <div>
                        <Label>Content Preview</Label>
                        <Textarea 
                          value={selectedCampaign.content} 
                          readOnly 
                          rows={4}
                          className="resize-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">
                            {selectedCampaign.recipients}
                          </div>
                          <div className="text-xs text-gray-600">Recipients</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">
                            {selectedCampaign.opens}
                          </div>
                          <div className="text-xs text-gray-600">Opens</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-2xl font-bold text-purple-600">
                            {selectedCampaign.clicks}
                          </div>
                          <div className="text-xs text-gray-600">Clicks</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-2xl font-bold text-red-600">
                            {selectedCampaign.unsubscribes}
                          </div>
                          <div className="text-xs text-gray-600">Unsubscribes</div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {selectedCampaign.status === 'draft' && (
                          <Button className="flex-1 bg-purple-500 hover:bg-purple-600">
                            <Send className="h-4 w-4 mr-2" />
                            Send Now
                          </Button>
                        )}
                        {selectedCampaign.status === 'scheduled' && (
                          <Button 
                            onClick={() => sendCampaign(selectedCampaign.id)}
                            className="flex-1 bg-green-500 hover:bg-green-600"
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Send Now
                          </Button>
                        )}
                        <Button variant="outline" className="flex-1">
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Campaign
                        </Button>
                        <Button variant="outline" className="flex-1">
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Campaign</h3>
                      <p className="text-gray-600">Choose a campaign from the list to view details</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Top Countries</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.topCountries.map((country, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                            {index + 1}
                          </div>
                          <span className="font-medium">{country.country}</span>
                        </div>
                        <Badge className="bg-purple-500">{country.count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Interests</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.topInterests.map((interest, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                            {index + 1}
                          </div>
                          <span className="font-medium">{interest.interest}</span>
                        </div>
                        <Badge className="bg-purple-500">{interest.count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Subscriber Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-end justify-between gap-2">
                  {analytics.monthlyGrowth.map((count, index) => (
                    <div key={index} className="flex flex-col items-center gap-2">
                      <div
                        className="bg-purple-500 rounded-t w-8 transition-all duration-500"
                        style={{ height: `${(count / Math.max(...analytics.monthlyGrowth)) * 200}px` }}
                      />
                      <span className="text-xs text-gray-600">
                        {new Date(2024, index).toLocaleDateString('en', { month: 'short' })}
                      </span>
                      <span className="text-xs font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
