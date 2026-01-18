'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Plus, Search, ExternalLink, Copy, Check, Trash2, Edit,
  Hotel, Ticket, MapPin, Utensils, ShoppingBag, Activity,
  Plane, Car, Globe, TrendingUp, DollarSign, Link2, Eye,
  MoreHorizontal, Filter, Download
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// Affiliate partner types
const PARTNER_TYPES = [
  { id: 'hotel', label: 'Hotels & Accommodation', icon: Hotel, color: 'bg-blue-500' },
  { id: 'ticket', label: 'Events & Tickets', icon: Ticket, color: 'bg-orange-500' },
  { id: 'restaurant', label: 'Restaurants & Dining', icon: Utensils, color: 'bg-green-500' },
  { id: 'attraction', label: 'Attractions & Tours', icon: MapPin, color: 'bg-purple-500' },
  { id: 'experience', label: 'Experiences', icon: Activity, color: 'bg-pink-500' },
  { id: 'shopping', label: 'Shopping', icon: ShoppingBag, color: 'bg-yellow-500' },
  { id: 'transport', label: 'Transport & Flights', icon: Plane, color: 'bg-sky-500' },
  { id: 'car', label: 'Car Rental', icon: Car, color: 'bg-red-500' },
]

interface AffiliateLink {
  id: string
  name: string
  partner_type: string
  partner_name: string
  affiliate_url: string
  tracking_id?: string
  commission_rate?: number
  description?: string
  tags: string[]
  is_active: boolean
  clicks: number
  conversions: number
  revenue: number
  created_at: string
  last_clicked_at?: string
}

interface PartnerStats {
  partner_type: string
  count: number
  total_clicks: number
  total_conversions: number
  total_revenue: number
}

export function AffiliatePoolManager() {
  const [affiliates, setAffiliates] = useState<AffiliateLink[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingAffiliate, setEditingAffiliate] = useState<AffiliateLink | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    partner_type: '',
    partner_name: '',
    affiliate_url: '',
    tracking_id: '',
    commission_rate: '',
    description: '',
    tags: '',
    is_active: true
  })

  useEffect(() => {
    fetchAffiliates()
  }, [selectedType])

  const fetchAffiliates = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedType !== 'all') params.set('type', selectedType)
      if (searchQuery) params.set('search', searchQuery)

      const response = await fetch(`/api/admin/affiliate-pool?${params}`)
      if (response.ok) {
        const data = await response.json()
        setAffiliates(data.affiliates || [])
      }
    } catch (error) {
      console.error('Error fetching affiliates:', error)
      setAffiliates(getMockAffiliates())
    } finally {
      setLoading(false)
    }
  }

  const handleCopyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleSubmit = async () => {
    const affiliateData = {
      ...formData,
      commission_rate: formData.commission_rate ? parseFloat(formData.commission_rate) : undefined,
      tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : []
    }

    if (editingAffiliate) {
      // Update existing
      setAffiliates(prev => prev.map(a =>
        a.id === editingAffiliate.id
          ? { ...a, ...affiliateData, id: a.id }
          : a
      ))
    } else {
      // Create new
      const newAffiliate: AffiliateLink = {
        id: Math.random().toString(36).substr(2, 9),
        ...affiliateData,
        clicks: 0,
        conversions: 0,
        revenue: 0,
        created_at: new Date().toISOString()
      }
      setAffiliates(prev => [newAffiliate, ...prev])
    }

    resetForm()
    setIsDialogOpen(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this affiliate link?')) return
    setAffiliates(prev => prev.filter(a => a.id !== id))
  }

  const handleEdit = (affiliate: AffiliateLink) => {
    setEditingAffiliate(affiliate)
    setFormData({
      name: affiliate.name,
      partner_type: affiliate.partner_type,
      partner_name: affiliate.partner_name,
      affiliate_url: affiliate.affiliate_url,
      tracking_id: affiliate.tracking_id || '',
      commission_rate: affiliate.commission_rate?.toString() || '',
      description: affiliate.description || '',
      tags: affiliate.tags.join(', '),
      is_active: affiliate.is_active
    })
    setIsDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      partner_type: '',
      partner_name: '',
      affiliate_url: '',
      tracking_id: '',
      commission_rate: '',
      description: '',
      tags: '',
      is_active: true
    })
    setEditingAffiliate(null)
  }

  const toggleActive = async (id: string) => {
    setAffiliates(prev => prev.map(a =>
      a.id === id ? { ...a, is_active: !a.is_active } : a
    ))
  }

  const filteredAffiliates = affiliates.filter(affiliate => {
    const matchesSearch = !searchQuery ||
      affiliate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      affiliate.partner_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      affiliate.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesType = selectedType === 'all' || affiliate.partner_type === selectedType

    return matchesSearch && matchesType
  })

  const getStats = (): PartnerStats[] => {
    const stats: Record<string, PartnerStats> = {}
    PARTNER_TYPES.forEach(type => {
      stats[type.id] = {
        partner_type: type.id,
        count: 0,
        total_clicks: 0,
        total_conversions: 0,
        total_revenue: 0
      }
    })

    affiliates.forEach(a => {
      if (stats[a.partner_type]) {
        stats[a.partner_type].count++
        stats[a.partner_type].total_clicks += a.clicks
        stats[a.partner_type].total_conversions += a.conversions
        stats[a.partner_type].total_revenue += a.revenue
      }
    })

    return Object.values(stats)
  }

  const stats = getStats()
  const totalStats = {
    count: affiliates.length,
    clicks: affiliates.reduce((sum, a) => sum + a.clicks, 0),
    conversions: affiliates.reduce((sum, a) => sum + a.conversions, 0),
    revenue: affiliates.reduce((sum, a) => sum + a.revenue, 0)
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Link2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{totalStats.count}</div>
                <div className="text-sm text-gray-500">Affiliate Links</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Eye className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{totalStats.clicks.toLocaleString()}</div>
                <div className="text-sm text-gray-500">Total Clicks</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{totalStats.conversions}</div>
                <div className="text-sm text-gray-500">Conversions</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">${totalStats.revenue.toFixed(2)}</div>
                <div className="text-sm text-gray-500">Revenue</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Filter Cards */}
      <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
        <Card
          className={`cursor-pointer transition-all ${selectedType === 'all' ? 'ring-2 ring-[#E8634B]' : ''}`}
          onClick={() => setSelectedType('all')}
        >
          <CardContent className="p-3 text-center">
            <Globe className="w-5 h-5 mx-auto mb-1 text-gray-500" />
            <div className="text-lg font-bold">{affiliates.length}</div>
            <div className="text-xs text-gray-500">All</div>
          </CardContent>
        </Card>
        {PARTNER_TYPES.map(type => {
          const Icon = type.icon
          const stat = stats.find(s => s.partner_type === type.id)
          return (
            <Card
              key={type.id}
              className={`cursor-pointer transition-all ${selectedType === type.id ? 'ring-2 ring-[#E8634B]' : ''}`}
              onClick={() => setSelectedType(type.id)}
            >
              <CardContent className="p-3 text-center">
                <Icon className={`w-5 h-5 mx-auto mb-1 ${type.color.replace('bg-', 'text-')}`} />
                <div className="text-lg font-bold">{stat?.count || 0}</div>
                <div className="text-xs text-gray-500 truncate">{type.label.split(' ')[0]}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Actions Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search affiliates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" /> Export
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={(open) => {
                setIsDialogOpen(open)
                if (!open) resetForm()
              }}>
                <DialogTrigger asChild>
                  <Button className="bg-[#1A1F36] hover:bg-[#2d3452]">
                    <Plus className="w-4 h-4 mr-2" /> Add Affiliate Link
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingAffiliate ? 'Edit Affiliate Link' : 'Add New Affiliate Link'}
                    </DialogTitle>
                  </DialogHeader>

                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Link Name *</Label>
                        <Input
                          placeholder="e.g., Booking.com Hotels"
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label>Partner Type *</Label>
                        <Select value={formData.partner_type} onValueChange={(v) => setFormData({...formData, partner_type: v})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type..." />
                          </SelectTrigger>
                          <SelectContent>
                            {PARTNER_TYPES.map(type => (
                              <SelectItem key={type.id} value={type.id}>{type.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Partner/Brand Name</Label>
                        <Input
                          placeholder="e.g., Booking.com"
                          value={formData.partner_name}
                          onChange={(e) => setFormData({...formData, partner_name: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label>Tracking ID</Label>
                        <Input
                          placeholder="e.g., yalla_london_123"
                          value={formData.tracking_id}
                          onChange={(e) => setFormData({...formData, tracking_id: e.target.value})}
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Affiliate URL *</Label>
                      <Input
                        placeholder="https://booking.com/?aid=123456"
                        value={formData.affiliate_url}
                        onChange={(e) => setFormData({...formData, affiliate_url: e.target.value})}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Commission Rate (%)</Label>
                        <Input
                          type="number"
                          placeholder="e.g., 5"
                          value={formData.commission_rate}
                          onChange={(e) => setFormData({...formData, commission_rate: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label>Tags (comma separated)</Label>
                        <Input
                          placeholder="luxury, 5-star, mayfair"
                          value={formData.tags}
                          onChange={(e) => setFormData({...formData, tags: e.target.value})}
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Description</Label>
                      <Textarea
                        placeholder="Brief description of this affiliate link..."
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        rows={3}
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={formData.is_active}
                        onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                      />
                      <Label>Active</Label>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} className="bg-[#E8634B] hover:bg-[#d4543d]">
                      {editingAffiliate ? 'Update' : 'Add'} Affiliate Link
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Affiliate Links Table */}
      {loading ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-pulse space-y-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-16 bg-gray-100 rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : filteredAffiliates.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Link2 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No affiliate links found</h3>
            <p className="text-gray-500 mb-4">
              {searchQuery ? 'Try a different search term' : 'Add your first affiliate link to get started'}
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Add Affiliate Link
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase">Affiliate</th>
                  <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase">Stats</th>
                  <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase">Commission</th>
                  <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredAffiliates.map(affiliate => {
                  const typeInfo = PARTNER_TYPES.find(t => t.id === affiliate.partner_type)
                  const TypeIcon = typeInfo?.icon || Globe

                  return (
                    <tr key={affiliate.id} className="hover:bg-gray-50">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${typeInfo?.color || 'bg-gray-500'}`}>
                            <TypeIcon className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{affiliate.name}</div>
                            <div className="text-sm text-gray-500">{affiliate.partner_name}</div>
                            <div className="flex gap-1 mt-1">
                              {affiliate.tags.slice(0, 3).map(tag => (
                                <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant="secondary" className="capitalize">
                          {typeInfo?.label || affiliate.partner_type}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="text-sm">
                          <div className="flex items-center gap-4">
                            <span className="text-gray-500">{affiliate.clicks} clicks</span>
                            <span className="text-green-600">{affiliate.conversions} conversions</span>
                          </div>
                          <div className="text-gray-900 font-medium">${affiliate.revenue.toFixed(2)} earned</div>
                        </div>
                      </td>
                      <td className="p-4">
                        {affiliate.commission_rate ? (
                          <span className="text-sm font-medium">{affiliate.commission_rate}%</span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        <Switch
                          checked={affiliate.is_active}
                          onCheckedChange={() => toggleActive(affiliate.id)}
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyUrl(affiliate.affiliate_url, affiliate.id)}
                          >
                            {copiedId === affiliate.id ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(affiliate.affiliate_url, '_blank')}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(affiliate)}>
                                <Edit className="w-4 h-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(affiliate.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Mock data for development
function getMockAffiliates(): AffiliateLink[] {
  return [
    {
      id: '1',
      name: 'Booking.com London Hotels',
      partner_type: 'hotel',
      partner_name: 'Booking.com',
      affiliate_url: 'https://www.booking.com/city/gb/london.html?aid=123456',
      tracking_id: 'yalla_london_booking',
      commission_rate: 4,
      description: 'General London hotels affiliate link',
      tags: ['hotels', 'london', 'booking'],
      is_active: true,
      clicks: 1250,
      conversions: 45,
      revenue: 892.50,
      created_at: new Date().toISOString(),
      last_clicked_at: new Date().toISOString()
    },
    {
      id: '2',
      name: 'StubHub Premier League Tickets',
      partner_type: 'ticket',
      partner_name: 'StubHub',
      affiliate_url: 'https://www.stubhub.com/premier-league?affid=yalla',
      tracking_id: 'yalla_stubhub_pl',
      commission_rate: 8,
      description: 'Premier League football tickets',
      tags: ['football', 'tickets', 'premier-league'],
      is_active: true,
      clicks: 3200,
      conversions: 78,
      revenue: 2340.00,
      created_at: new Date().toISOString()
    },
    {
      id: '3',
      name: 'GetYourGuide London Tours',
      partner_type: 'experience',
      partner_name: 'GetYourGuide',
      affiliate_url: 'https://www.getyourguide.com/london?partner_id=yalla',
      tracking_id: 'yalla_gyg',
      commission_rate: 8,
      description: 'London tours and activities',
      tags: ['tours', 'activities', 'sightseeing'],
      is_active: true,
      clicks: 890,
      conversions: 34,
      revenue: 612.00,
      created_at: new Date().toISOString()
    },
    {
      id: '4',
      name: 'The Dorchester Hotel',
      partner_type: 'hotel',
      partner_name: 'The Dorchester',
      affiliate_url: 'https://www.dorchestercollection.com/london/?ref=yalla',
      tracking_id: 'yalla_dorchester',
      commission_rate: 6,
      description: 'Luxury 5-star Mayfair hotel',
      tags: ['luxury', '5-star', 'mayfair'],
      is_active: true,
      clicks: 456,
      conversions: 12,
      revenue: 1560.00,
      created_at: new Date().toISOString()
    },
    {
      id: '5',
      name: 'Harrods Gift Cards',
      partner_type: 'shopping',
      partner_name: 'Harrods',
      affiliate_url: 'https://www.harrods.com/?affid=yalla',
      tracking_id: 'yalla_harrods',
      commission_rate: 3,
      description: 'Luxury department store shopping',
      tags: ['luxury', 'shopping', 'harrods'],
      is_active: true,
      clicks: 567,
      conversions: 23,
      revenue: 345.00,
      created_at: new Date().toISOString()
    },
    {
      id: '6',
      name: 'British Airways Flights',
      partner_type: 'transport',
      partner_name: 'British Airways',
      affiliate_url: 'https://www.britishairways.com/?affid=yalla',
      tracking_id: 'yalla_ba',
      commission_rate: 1.5,
      description: 'Flights to London',
      tags: ['flights', 'london', 'travel'],
      is_active: false,
      clicks: 234,
      conversions: 5,
      revenue: 125.00,
      created_at: new Date().toISOString()
    }
  ]
}
