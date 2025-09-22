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
  DollarSign,
  Plus,
  Edit,
  Trash2,
  Copy,
  ExternalLink,
  TrendingUp,
  Users,
  Eye,
  Calendar,
  Star,
  Building,
  Gift,
  MapPin,
  Phone,
  Globe,
  Save,
  Search,
  Filter
} from 'lucide-react'
import { toast } from 'sonner'

interface AffiliateHotel {
  id: string
  name: string
  code: string
  description: string
  location: string
  website: string
  phone: string
  commission: number
  status: 'active' | 'inactive'
  category: 'luxury' | 'boutique' | 'budget' | 'business'
  rating: number
  imageUrl: string
  amenities: string[]
  lastUpdated: string
}

interface AffiliateOffer {
  id: string
  title: string
  code: string
  description: string
  category: 'restaurant' | 'tour' | 'shopping' | 'entertainment' | 'transport'
  discount: string
  validUntil: string
  status: 'active' | 'expired' | 'inactive'
  clicks: number
  conversions: number
  revenue: number
  lastUpdated: string
}

interface AffiliateAnalytics {
  totalClicks: number
  totalConversions: number
  totalRevenue: number
  conversionRate: number
  topPerformingHotels: string[]
  topPerformingOffers: string[]
  monthlyRevenue: number[]
}

export default function AffiliateProgram() {
  const [hotels, setHotels] = useState<AffiliateHotel[]>([
    {
      id: '1',
      name: 'The Ritz London',
      code: 'YALLA10',
      description: 'Luxury 5-star hotel in the heart of London with world-class service and amenities.',
      location: '150 Piccadilly, London W1J 9BR',
      website: 'https://www.theritzlondon.com',
      phone: '+44 20 7493 8181',
      commission: 15,
      status: 'active',
      category: 'luxury',
      rating: 4.8,
      imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
      amenities: ['Spa', 'Restaurant', 'Concierge', 'Room Service', 'WiFi'],
      lastUpdated: '2024-01-15'
    },
    {
      id: '2',
      name: 'The Savoy',
      code: 'YALLA15',
      description: 'Iconic luxury hotel on the Strand with stunning Thames views and exceptional dining.',
      location: 'Strand, London WC2R 0EU',
      website: 'https://www.fairmont.com/savoy-london',
      phone: '+44 20 7836 4343',
      commission: 12,
      status: 'active',
      category: 'luxury',
      rating: 4.9,
      imageUrl: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800',
      amenities: ['Spa', 'Multiple Restaurants', 'Bar', 'Concierge', 'Valet Parking'],
      lastUpdated: '2024-01-14'
    },
    {
      id: '3',
      name: 'Claridge\'s',
      code: 'YALLA20',
      description: 'Art Deco luxury hotel in Mayfair, known for its timeless elegance and impeccable service.',
      location: 'Brook Street, London W1K 4HR',
      website: 'https://www.claridges.co.uk',
      phone: '+44 20 7629 8860',
      commission: 18,
      status: 'active',
      category: 'luxury',
      rating: 4.7,
      imageUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800',
      amenities: ['Spa', 'Restaurant', 'Afternoon Tea', 'Concierge', 'WiFi'],
      lastUpdated: '2024-01-13'
    }
  ])

  const [offers, setOffers] = useState<AffiliateOffer[]>([
    {
      id: '1',
      title: 'Restaurant Deals',
      code: 'EAT20',
      description: '20% off at selected London restaurants',
      category: 'restaurant',
      discount: '20% off',
      validUntil: '2024-12-31',
      status: 'active',
      clicks: 1247,
      conversions: 89,
      revenue: 2340,
      lastUpdated: '2024-01-15'
    },
    {
      id: '2',
      title: 'Tour Discounts',
      code: 'TOUR25',
      description: '25% off London walking tours and experiences',
      category: 'tour',
      discount: '25% off',
      validUntil: '2024-06-30',
      status: 'active',
      clicks: 892,
      conversions: 67,
      revenue: 1890,
      lastUpdated: '2024-01-14'
    },
    {
      id: '3',
      title: 'Shopping Offers',
      code: 'SHOP15',
      description: '15% off at London shopping destinations',
      category: 'shopping',
      discount: '15% off',
      validUntil: '2024-03-31',
      status: 'active',
      clicks: 654,
      conversions: 45,
      revenue: 1120,
      lastUpdated: '2024-01-13'
    }
  ])

  const [analytics, setAnalytics] = useState<AffiliateAnalytics>({
    totalClicks: 2793,
    totalConversions: 201,
    totalRevenue: 5350,
    conversionRate: 7.2,
    topPerformingHotels: ['The Ritz London', 'The Savoy', 'Claridge\'s'],
    topPerformingOffers: ['Restaurant Deals', 'Tour Discounts', 'Shopping Offers'],
    monthlyRevenue: [4200, 4800, 5350, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  })

  const [selectedHotel, setSelectedHotel] = useState<AffiliateHotel | null>(null)
  const [selectedOffer, setSelectedOffer] = useState<AffiliateOffer | null>(null)
  const [isAddingHotel, setIsAddingHotel] = useState(false)
  const [isAddingOffer, setIsAddingOffer] = useState(false)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard!')
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'luxury':
        return <Star className="h-4 w-4 text-yellow-500" />
      case 'boutique':
        return <Building className="h-4 w-4 text-purple-500" />
      case 'budget':
        return <DollarSign className="h-4 w-4 text-green-500" />
      case 'business':
        return <Building className="h-4 w-4 text-blue-500" />
      default:
        return <Building className="h-4 w-4 text-gray-500" />
    }
  }

  const getOfferCategoryIcon = (category: string) => {
    switch (category) {
      case 'restaurant':
        return <Gift className="h-4 w-4 text-red-500" />
      case 'tour':
        return <MapPin className="h-4 w-4 text-blue-500" />
      case 'shopping':
        return <DollarSign className="h-4 w-4 text-green-500" />
      case 'entertainment':
        return <Star className="h-4 w-4 text-purple-500" />
      case 'transport':
        return <Globe className="h-4 w-4 text-gray-500" />
      default:
        return <Gift className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>
      case 'inactive':
        return <Badge className="bg-gray-500">Inactive</Badge>
      case 'expired':
        return <Badge className="bg-red-500">Expired</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getConversionRate = (clicks: number, conversions: number) => {
    return clicks > 0 ? ((conversions / clicks) * 100).toFixed(1) : '0.0'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <DollarSign className="h-8 w-8 text-yellow-500" />
                Affiliate Program
              </h1>
              <p className="text-gray-600 mt-1">Manage affiliate codes, hotels, and offers</p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline">
                <TrendingUp className="h-4 w-4 mr-2" />
                Analytics
              </Button>
              <Button className="bg-yellow-500 hover:bg-yellow-600">
                <Plus className="h-4 w-4 mr-2" />
                Add New
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Analytics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100 text-sm">Total Revenue</p>
                  <p className="text-3xl font-bold">£{analytics.totalRevenue.toLocaleString()}</p>
                </div>
                <DollarSign className="h-8 w-8 text-yellow-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Total Clicks</p>
                  <p className="text-3xl font-bold">{analytics.totalClicks.toLocaleString()}</p>
                </div>
                <Eye className="h-8 w-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Conversions</p>
                  <p className="text-3xl font-bold">{analytics.totalConversions}</p>
                </div>
                <Users className="h-8 w-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Conversion Rate</p>
                  <p className="text-3xl font-bold">{analytics.conversionRate}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="hotels" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="hotels">Affiliate Hotels</TabsTrigger>
            <TabsTrigger value="offers">Affiliate Offers</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Affiliate Hotels Tab */}
          <TabsContent value="hotels" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Hotels List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Affiliate Hotels</h3>
                  <Button
                    onClick={() => setIsAddingHotel(true)}
                    className="bg-yellow-500 hover:bg-yellow-600"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Hotel
                  </Button>
                </div>
                {hotels.map((hotel) => (
                  <Card 
                    key={hotel.id} 
                    className={`cursor-pointer transition-all ${
                      selectedHotel?.id === hotel.id ? 'ring-2 ring-yellow-500' : 'hover:shadow-md'
                    }`}
                    onClick={() => setSelectedHotel(hotel)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <img
                          src={hotel.imageUrl}
                          alt={hotel.name}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium text-gray-900">{hotel.name}</h4>
                            {getCategoryIcon(hotel.category)}
                            {getStatusBadge(hotel.status)}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{hotel.description}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>Code: {hotel.code}</span>
                            <span>Commission: {hotel.commission}%</span>
                            <span>Rating: {hotel.rating}/5</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Hotel Details */}
              <div>
                {selectedHotel ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building className="h-5 w-5" />
                        Hotel Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-4">
                        <img
                          src={selectedHotel.imageUrl}
                          alt={selectedHotel.name}
                          className="w-24 h-24 object-cover rounded-lg"
                        />
                        <div>
                          <h3 className="text-xl font-bold">{selectedHotel.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            {getCategoryIcon(selectedHotel.category)}
                            <span className="text-sm text-gray-600 capitalize">{selectedHotel.category}</span>
                            <span className="text-sm text-gray-600">•</span>
                            <span className="text-sm text-gray-600">{selectedHotel.rating}/5 ⭐</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Affiliate Code</Label>
                          <div className="flex items-center gap-2">
                            <Input value={selectedHotel.code} readOnly />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(selectedHotel.code)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div>
                          <Label>Commission Rate</Label>
                          <Input value={`${selectedHotel.commission}%`} readOnly />
                        </div>
                      </div>

                      <div>
                        <Label>Description</Label>
                        <Textarea value={selectedHotel.description} readOnly rows={3} />
                      </div>

                      <div>
                        <Label>Location</Label>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{selectedHotel.location}</span>
                        </div>
                      </div>

                      <div>
                        <Label>Contact Information</Label>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-gray-400" />
                            <a
                              href={selectedHotel.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-sm"
                            >
                              {selectedHotel.website}
                            </a>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">{selectedHotel.phone}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <Label>Amenities</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {selectedHotel.amenities.map((amenity) => (
                            <Badge key={amenity} variant="outline" className="text-xs">
                              {amenity}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1">
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Hotel
                        </Button>
                        <Button variant="outline" className="flex-1">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View Website
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Hotel</h3>
                      <p className="text-gray-600">Choose a hotel from the list to view details</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Affiliate Offers Tab */}
          <TabsContent value="offers" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Offers List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Affiliate Offers</h3>
                  <Button
                    onClick={() => setIsAddingOffer(true)}
                    className="bg-yellow-500 hover:bg-yellow-600"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Offer
                  </Button>
                </div>
                {offers.map((offer) => (
                  <Card 
                    key={offer.id} 
                    className={`cursor-pointer transition-all ${
                      selectedOffer?.id === offer.id ? 'ring-2 ring-yellow-500' : 'hover:shadow-md'
                    }`}
                    onClick={() => setSelectedOffer(offer)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getOfferCategoryIcon(offer.category)}
                            <h4 className="font-medium text-gray-900">{offer.title}</h4>
                            {getStatusBadge(offer.status)}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{offer.description}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>Code: {offer.code}</span>
                            <span>Discount: {offer.discount}</span>
                            <span>Valid until: {offer.validUntil}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600">£{offer.revenue}</div>
                          <div className="text-xs text-gray-500">Revenue</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Offer Details */}
              <div>
                {selectedOffer ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Gift className="h-5 w-5" />
                        Offer Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-2">
                        {getOfferCategoryIcon(selectedOffer.category)}
                        <h3 className="text-xl font-bold">{selectedOffer.title}</h3>
                        {getStatusBadge(selectedOffer.status)}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Affiliate Code</Label>
                          <div className="flex items-center gap-2">
                            <Input value={selectedOffer.code} readOnly />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(selectedOffer.code)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div>
                          <Label>Discount</Label>
                          <Input value={selectedOffer.discount} readOnly />
                        </div>
                      </div>

                      <div>
                        <Label>Description</Label>
                        <Textarea value={selectedOffer.description} readOnly rows={3} />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Valid Until</Label>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">{selectedOffer.validUntil}</span>
                          </div>
                        </div>
                        <div>
                          <Label>Category</Label>
                          <div className="flex items-center gap-2">
                            {getOfferCategoryIcon(selectedOffer.category)}
                            <span className="text-sm capitalize">{selectedOffer.category}</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">{selectedOffer.clicks}</div>
                          <div className="text-xs text-gray-600">Clicks</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">{selectedOffer.conversions}</div>
                          <div className="text-xs text-gray-600">Conversions</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-2xl font-bold text-purple-600">
                            {getConversionRate(selectedOffer.clicks, selectedOffer.conversions)}%
                          </div>
                          <div className="text-xs text-gray-600">Conversion Rate</div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1">
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Offer
                        </Button>
                        <Button variant="outline" className="flex-1">
                          <TrendingUp className="h-4 w-4 mr-2" />
                          View Analytics
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Gift className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Select an Offer</h3>
                      <p className="text-gray-600">Choose an offer from the list to view details</p>
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
                  <CardTitle>Top Performing Hotels</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.topPerformingHotels.map((hotel, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-yellow-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                            {index + 1}
                          </div>
                          <span className="font-medium">{hotel}</span>
                        </div>
                        <Badge className="bg-green-500">Top Performer</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Performing Offers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.topPerformingOffers.map((offer, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-yellow-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                            {index + 1}
                          </div>
                          <span className="font-medium">{offer}</span>
                        </div>
                        <Badge className="bg-green-500">Top Performer</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-end justify-between gap-2">
                  {analytics.monthlyRevenue.map((revenue, index) => (
                    <div key={index} className="flex flex-col items-center gap-2">
                      <div
                        className="bg-yellow-500 rounded-t w-8 transition-all duration-500"
                        style={{ height: `${(revenue / Math.max(...analytics.monthlyRevenue)) * 200}px` }}
                      />
                      <span className="text-xs text-gray-600">
                        {new Date(2024, index).toLocaleDateString('en', { month: 'short' })}
                      </span>
                      <span className="text-xs font-medium">£{revenue}</span>
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
