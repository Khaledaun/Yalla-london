/**
 * Phase 4C CRM Subscriber Manager Component
 * Admin interface for managing subscribers and consent
 */
'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/components/language-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  Users, 
  Loader2, 
  Mail,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Search,
  Download,
  Filter,
  Shield,
  TrendingUp
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useToast } from '@/components/ui/use-toast'

interface Subscriber {
  id: string
  email: string
  status: 'PENDING' | 'CONFIRMED' | 'UNSUBSCRIBED' | 'BOUNCED' | 'COMPLAINED'
  source: string
  preferences_json?: any
  metadata_json?: any
  double_optin_sent_at?: string
  confirmed_at?: string
  unsubscribed_at?: string
  unsubscribe_reason?: string
  last_campaign_sent?: string
  engagement_score?: number
  created_at: string
  updated_at: string
}

interface ConsentLog {
  id: string
  consent_type: string
  consent_version: string
  action: string
  legal_basis: string
  processing_purposes: string[]
  data_categories: string[]
  consent_text?: string
  timestamp: string
}

export function CRMSubscriberManager() {
  const { language } = useLanguage()
  const { toast } = useToast()
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [selectedSubscriber, setSelectedSubscriber] = useState<Subscriber | null>(null)
  const [consentLogs, setConsentLogs] = useState<ConsentLog[]>([])

  // Mock data for now - in real implementation, fetch from API
  useEffect(() => {
    const mockSubscribers: Subscriber[] = [
      {
        id: '1',
        email: 'john.doe@example.com',
        status: 'CONFIRMED',
        source: 'newsletter_signup',
        preferences_json: {
          topics: ['london-travel', 'london-events'],
          frequency: 'weekly',
          language: 'en'
        },
        metadata_json: {
          utm_source: 'google',
          utm_medium: 'organic'
        },
        confirmed_at: '2024-01-15T10:00:00Z',
        engagement_score: 0.85,
        created_at: '2024-01-10T14:30:00Z',
        updated_at: '2024-01-15T10:00:00Z'
      },
      {
        id: '2',
        email: 'jane.smith@example.com',
        status: 'PENDING',
        source: 'exit_intent',
        preferences_json: {
          topics: ['london-food', 'london-culture'],
          frequency: 'weekly',
          language: 'en'
        },
        double_optin_sent_at: '2024-01-20T15:45:00Z',
        created_at: '2024-01-20T15:45:00Z',
        updated_at: '2024-01-20T15:45:00Z'
      },
      {
        id: '3',
        email: 'ahmed.hassan@example.com',
        status: 'CONFIRMED',
        source: 'content_gate',
        preferences_json: {
          topics: ['london-travel', 'london-nightlife'],
          frequency: 'monthly',
          language: 'ar'
        },
        confirmed_at: '2024-01-18T12:15:00Z',
        engagement_score: 0.92,
        created_at: '2024-01-18T11:00:00Z',
        updated_at: '2024-01-18T12:15:00Z'
      }
    ]

    setSubscribers(mockSubscribers)
    setLoading(false)
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'PENDING':
        return <Clock className="w-4 h-4 text-yellow-500" />
      case 'UNSUBSCRIBED':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'BOUNCED':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />
      case 'COMPLAINED':
        return <AlertTriangle className="w-4 h-4 text-red-600" />
      default:
        return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      'CONFIRMED': 'default',
      'PENDING': 'secondary',
      'UNSUBSCRIBED': 'destructive',
      'BOUNCED': 'outline',
      'COMPLAINED': 'destructive'
    }
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>
  }

  const filteredSubscribers = subscribers.filter(subscriber => {
    const matchesSearch = subscriber.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || subscriber.status === statusFilter
    const matchesSource = sourceFilter === 'all' || subscriber.source === sourceFilter
    return matchesSearch && matchesStatus && matchesSource
  })

  const stats = {
    total: subscribers.length,
    confirmed: subscribers.filter(s => s.status === 'CONFIRMED').length,
    pending: subscribers.filter(s => s.status === 'PENDING').length,
    unsubscribed: subscribers.filter(s => s.status === 'UNSUBSCRIBED').length,
    avgEngagement: subscribers
      .filter(s => s.engagement_score)
      .reduce((acc, s) => acc + (s.engagement_score || 0), 0) / 
      subscribers.filter(s => s.engagement_score).length || 0
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading subscribers...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">CRM Subscriber Manager</h2>
          <p className="text-muted-foreground">
            Manage newsletter subscribers with GDPR compliance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Shield className="w-4 h-4 mr-2" />
            Consent Audit
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />
              <div className="text-sm font-medium">Total Subscribers</div>
            </div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <div className="text-sm font-medium">Confirmed</div>
            </div>
            <div className="text-2xl font-bold">{stats.confirmed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-500" />
              <div className="text-sm font-medium">Pending</div>
            </div>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-500" />
              <div className="text-sm font-medium">Unsubscribed</div>
            </div>
            <div className="text-2xl font-bold">{stats.unsubscribed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-500" />
              <div className="text-sm font-medium">Avg Engagement</div>
            </div>
            <div className="text-2xl font-bold">{Math.round(stats.avgEngagement * 100)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search subscribers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="UNSUBSCRIBED">Unsubscribed</SelectItem>
                <SelectItem value="BOUNCED">Bounced</SelectItem>
                <SelectItem value="COMPLAINED">Complained</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="newsletter_signup">Newsletter</SelectItem>
                <SelectItem value="exit_intent">Exit Intent</SelectItem>
                <SelectItem value="content_gate">Content Gate</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Subscribers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Subscribers ({filteredSubscribers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Language</TableHead>
                <TableHead>Engagement</TableHead>
                <TableHead>Subscribed</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubscribers.map((subscriber) => (
                <TableRow key={subscriber.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      {subscriber.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(subscriber.status)}
                      {getStatusBadge(subscriber.status)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {subscriber.source.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {subscriber.preferences_json?.language?.toUpperCase() || 'EN'}
                  </TableCell>
                  <TableCell>
                    {subscriber.engagement_score ? (
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all"
                            style={{ width: `${subscriber.engagement_score * 100}%` }}
                          />
                        </div>
                        <span className="text-sm">{Math.round(subscriber.engagement_score * 100)}%</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">N/A</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(subscriber.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setSelectedSubscriber(subscriber)}
                    >
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredSubscribers.length === 0 && (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No subscribers found</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all' || sourceFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'No subscribers have signed up yet'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subscriber Details Modal/Sidebar would go here */}
      {selectedSubscriber && (
        <Card>
          <CardHeader>
            <CardTitle>Subscriber Details: {selectedSubscriber.email}</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="details" className="w-full">
              <TabsList>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="preferences">Preferences</TabsTrigger>
                <TabsTrigger value="consent">Consent History</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusIcon(selectedSubscriber.status)}
                      {getStatusBadge(selectedSubscriber.status)}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Source</Label>
                    <div className="mt-1">
                      <Badge variant="outline">
                        {selectedSubscriber.source.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Subscribed</Label>
                    <div className="mt-1">{new Date(selectedSubscriber.created_at).toLocaleString()}</div>
                  </div>
                  {selectedSubscriber.confirmed_at && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Confirmed</Label>
                      <div className="mt-1">{new Date(selectedSubscriber.confirmed_at).toLocaleString()}</div>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="preferences" className="space-y-4">
                {selectedSubscriber.preferences_json ? (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Topics</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedSubscriber.preferences_json.topics?.map((topic: string) => (
                          <Badge key={topic} variant="secondary">{topic}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Frequency</Label>
                      <div className="mt-1">{selectedSubscriber.preferences_json.frequency}</div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Language</Label>
                      <div className="mt-1">{selectedSubscriber.preferences_json.language?.toUpperCase()}</div>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No preferences set</p>
                )}
              </TabsContent>
              
              <TabsContent value="consent" className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium">Newsletter Consent - Granted</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Version 2024.1 - {new Date(selectedSubscriber.created_at).toLocaleString()}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            
            <div className="flex items-center gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setSelectedSubscriber(null)}>
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}