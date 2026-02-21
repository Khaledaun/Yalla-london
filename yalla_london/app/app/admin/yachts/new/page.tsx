'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSiteId } from '@/components/site-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Ship,
  Save,
  ArrowLeft,
  ImagePlus,
  X,
  Anchor,
  Users,
  Ruler,
  DollarSign,
  MapPin,
  Star,
  ChefHat,
  Baby,
  Waves,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Destination {
  id: string
  name: string
  slug: string
  region: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const YACHT_TYPES = [
  { value: 'SAILBOAT', label: 'Sailboat' },
  { value: 'CATAMARAN', label: 'Catamaran' },
  { value: 'MOTOR_YACHT', label: 'Motor Yacht' },
  { value: 'GULET', label: 'Gulet' },
  { value: 'SUPERYACHT', label: 'Superyacht' },
  { value: 'POWER_CATAMARAN', label: 'Power Catamaran' },
]

const CURRENCIES = ['EUR', 'USD', 'GBP']

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AddYachtPage() {
  const siteId = useSiteId()
  const router = useRouter()

  // Destinations for the dropdown
  const [destinations, setDestinations] = useState<Destination[]>([])

  // Form state
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [type, setType] = useState('SAILBOAT')
  const [description_en, setDescriptionEn] = useState('')
  const [description_ar, setDescriptionAr] = useState('')

  // Specs
  const [length, setLength] = useState('')
  const [beam, setBeam] = useState('')
  const [draft, setDraft] = useState('')
  const [yearBuilt, setYearBuilt] = useState('')
  const [builder, setBuilder] = useState('')
  const [model, setModel] = useState('')

  // Capacity
  const [cabins, setCabins] = useState('')
  const [berths, setBerths] = useState('')
  const [bathrooms, setBathrooms] = useState('')
  const [crewSize, setCrewSize] = useState('')

  // Pricing
  const [pricePerWeekLow, setPriceLow] = useState('')
  const [pricePerWeekHigh, setPriceHigh] = useState('')
  const [currency, setCurrency] = useState('EUR')

  // Location
  const [homePort, setHomePort] = useState('')
  const [cruisingArea, setCruisingArea] = useState('')
  const [destinationId, setDestinationId] = useState('')

  // GCC Features
  const [halalCatering, setHalalCatering] = useState(false)
  const [familyFriendly, setFamilyFriendly] = useState(false)
  const [crewIncluded, setCrewIncluded] = useState(false)

  // Status
  const [status, setStatus] = useState('draft')
  const [featured, setFeatured] = useState(false)

  // Images
  const [images, setImages] = useState<string[]>([])
  const [newImageUrl, setNewImageUrl] = useState('')

  // UI
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // -----------------------------------------------------------------------
  // Auto-generate slug from name
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (name && !slug) {
      setSlug(
        name
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim()
      )
    }
  }, [name, slug])

  // -----------------------------------------------------------------------
  // Fetch destinations for dropdown
  // -----------------------------------------------------------------------

  const fetchDestinations = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/yachts/destinations?siteId=${siteId}&limit=100`)
      if (res.ok) {
        const data = await res.json()
        setDestinations(data.destinations ?? [])
      }
    } catch {
      console.warn('[add-yacht] Failed to fetch destinations')
    }
  }, [siteId])

  useEffect(() => { fetchDestinations() }, [fetchDestinations])

  // -----------------------------------------------------------------------
  // Save
  // -----------------------------------------------------------------------

  const handleSave = async () => {
    if (!name.trim()) { setError('Yacht name is required'); return }
    if (!slug.trim()) { setError('Slug is required'); return }

    setSaving(true)
    setError(null)

    try {
      const body = {
        name: name.trim(),
        slug: slug.trim(),
        type,
        siteId,
        description_en: description_en || null,
        description_ar: description_ar || null,
        length: length ? parseFloat(length) : null,
        beam: beam ? parseFloat(beam) : null,
        draft: draft ? parseFloat(draft) : null,
        yearBuilt: yearBuilt ? parseInt(yearBuilt) : null,
        builder: builder || null,
        model: model || null,
        cabins: cabins ? parseInt(cabins) : 0,
        berths: berths ? parseInt(berths) : 0,
        bathrooms: bathrooms ? parseInt(bathrooms) : 0,
        crewSize: crewSize ? parseInt(crewSize) : 0,
        pricePerWeekLow: pricePerWeekLow ? parseFloat(pricePerWeekLow) : null,
        pricePerWeekHigh: pricePerWeekHigh ? parseFloat(pricePerWeekHigh) : null,
        currency,
        homePort: homePort || null,
        cruisingArea: cruisingArea || null,
        destinationId: destinationId || null,
        halalCateringAvailable: halalCatering,
        familyFriendly,
        crewIncluded,
        status,
        featured,
        images: images.length > 0 ? images : null,
      }

      const res = await fetch('/api/admin/yachts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to create yacht')
      }

      router.push('/admin/yachts')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create yacht')
    } finally {
      setSaving(false)
    }
  }

  // -----------------------------------------------------------------------
  // Image management
  // -----------------------------------------------------------------------

  const addImage = () => {
    if (newImageUrl.trim() && !images.includes(newImageUrl.trim())) {
      setImages([...images, newImageUrl.trim()])
      setNewImageUrl('')
    }
  }

  const removeImage = (url: string) => {
    setImages(images.filter(i => i !== url))
  }

  // -----------------------------------------------------------------------
  // JSX
  // -----------------------------------------------------------------------

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push('/admin/yachts')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add New Yacht</h1>
          <p className="text-sm text-gray-500 mt-1">Fill in the details below to add a yacht to your fleet</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ship className="h-5 w-5" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Yacht Name *</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Azure Dreams" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Slug *</label>
              <Input value={slug} onChange={e => setSlug(e.target.value)} placeholder="azure-dreams" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Type *</label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {YACHT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Description (English)</label>
            <textarea
              className="w-full mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={description_en}
              onChange={e => setDescriptionEn(e.target.value)}
              placeholder="Describe the yacht, its features, and unique selling points..."
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Description (Arabic)</label>
            <textarea
              className="w-full mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              dir="rtl"
              value={description_ar}
              onChange={e => setDescriptionAr(e.target.value)}
              placeholder="وصف اليخت..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Specifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ruler className="h-5 w-5" />
            Specifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Length (m)</label>
              <Input type="number" value={length} onChange={e => setLength(e.target.value)} placeholder="15.5" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Beam (m)</label>
              <Input type="number" value={beam} onChange={e => setBeam(e.target.value)} placeholder="4.5" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Draft (m)</label>
              <Input type="number" value={draft} onChange={e => setDraft(e.target.value)} placeholder="2.1" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Year Built</label>
              <Input type="number" value={yearBuilt} onChange={e => setYearBuilt(e.target.value)} placeholder="2022" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Builder</label>
              <Input value={builder} onChange={e => setBuilder(e.target.value)} placeholder="e.g. Beneteau" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Model</label>
              <Input value={model} onChange={e => setModel(e.target.value)} placeholder="e.g. Oceanis 46.1" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Capacity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Capacity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Cabins</label>
              <Input type="number" value={cabins} onChange={e => setCabins(e.target.value)} placeholder="4" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Berths</label>
              <Input type="number" value={berths} onChange={e => setBerths(e.target.value)} placeholder="8" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Bathrooms</label>
              <Input type="number" value={bathrooms} onChange={e => setBathrooms(e.target.value)} placeholder="2" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Crew Size</label>
              <Input type="number" value={crewSize} onChange={e => setCrewSize(e.target.value)} placeholder="3" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Pricing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Price/Week (Low)</label>
              <Input type="number" value={pricePerWeekLow} onChange={e => setPriceLow(e.target.value)} placeholder="5000" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Price/Week (High)</label>
              <Input type="number" value={pricePerWeekHigh} onChange={e => setPriceHigh(e.target.value)} placeholder="12000" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Currency</label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Home Port</label>
              <Input value={homePort} onChange={e => setHomePort(e.target.value)} placeholder="e.g. Split, Croatia" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Cruising Area</label>
              <Input value={cruisingArea} onChange={e => setCruisingArea(e.target.value)} placeholder="e.g. Adriatic Sea" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Primary Destination</label>
              <Select value={destinationId} onValueChange={setDestinationId}>
                <SelectTrigger><SelectValue placeholder="Select destination" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {destinations.map(d => <SelectItem key={d.id} value={d.id}>{d.name} ({d.region})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* GCC Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            GCC Features & Highlights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input type="checkbox" checked={halalCatering} onChange={e => setHalalCatering(e.target.checked)} className="h-4 w-4 rounded" />
              <ChefHat className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium">Halal Catering Available</span>
            </label>
            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input type="checkbox" checked={familyFriendly} onChange={e => setFamilyFriendly(e.target.checked)} className="h-4 w-4 rounded" />
              <Baby className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium">Family Friendly</span>
            </label>
            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input type="checkbox" checked={crewIncluded} onChange={e => setCrewIncluded(e.target.checked)} className="h-4 w-4 rounded" />
              <Anchor className="h-5 w-5 text-indigo-600" />
              <span className="text-sm font-medium">Crew Included</span>
            </label>
          </div>
          <div className="mt-4">
            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 w-fit">
              <input type="checkbox" checked={featured} onChange={e => setFeatured(e.target.checked)} className="h-4 w-4 rounded" />
              <Star className="h-5 w-5 text-amber-500" />
              <span className="text-sm font-medium">Featured Yacht</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Images */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImagePlus className="h-5 w-5" />
            Images
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newImageUrl}
              onChange={e => setNewImageUrl(e.target.value)}
              placeholder="Paste image URL..."
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addImage() } }}
            />
            <Button variant="outline" onClick={addImage}>Add</Button>
          </div>
          {images.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {images.map((url, i) => (
                <div key={i} className="relative group border rounded-lg overflow-hidden">
                  <div className="aspect-[4/3] bg-gray-100 flex items-center justify-center">
                    <Waves className="h-8 w-8 text-gray-300" />
                  </div>
                  <div className="p-2">
                    <p className="text-xs text-gray-500 truncate">{url}</p>
                    {i === 0 && <Badge className="mt-1 text-xs">Hero Image</Badge>}
                  </div>
                  <button
                    onClick={() => removeImage(url)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-500">First image will be used as the hero image. Add yacht photo URLs from your media library.</p>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end gap-3 pb-8">
        <Button variant="outline" onClick={() => router.push('/admin/yachts')}>Cancel</Button>
        <Button
          className="bg-blue-600 hover:bg-blue-700"
          onClick={handleSave}
          disabled={saving || !name.trim()}
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Create Yacht'}
        </Button>
      </div>
    </div>
  )
}
