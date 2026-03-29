'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSiteId } from '@/components/site-provider'
import {
  AdminCard,
  AdminPageHeader,
  AdminButton,
  AdminStatusBadge,
  AdminAlertBanner,
  AdminSectionLabel,
} from '@/components/admin/admin-ui'
import {
  Ship,
  Save,
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

const REGION_LABELS: Record<string, string> = {
  MEDITERRANEAN: 'Mediterranean',
  ARABIAN_GULF: 'Arabian Gulf',
  RED_SEA: 'Red Sea',
  INDIAN_OCEAN: 'Indian Ocean',
  CARIBBEAN: 'Caribbean',
  SOUTHEAST_ASIA: 'Southeast Asia',
}

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
// Styles
// ---------------------------------------------------------------------------

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-system)',
  fontSize: 11,
  fontWeight: 600,
  color: '#44403C',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: 4,
  display: 'block',
}

const inputStyle: React.CSSProperties = {
  fontFamily: 'var(--font-system)',
  fontSize: 13,
  color: '#1C1917',
  width: '100%',
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid rgba(214,208,196,0.8)',
  backgroundColor: '#FFFFFF',
  outline: 'none',
  transition: 'border-color 0.15s',
}

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: 'none' as const,
  backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%2378716C'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
  paddingRight: 32,
}

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: 100,
  resize: 'vertical' as const,
}

const sectionTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: 14,
  color: '#1C1917',
}

const checkboxContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '10px 14px',
  borderRadius: 10,
  border: '1px solid rgba(214,208,196,0.6)',
  cursor: 'pointer',
  transition: 'background-color 0.15s',
  backgroundColor: '#FFFFFF',
}

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
    <div className="admin-page p-4 md:p-6" style={{ maxWidth: 900 }}>
      <AdminPageHeader
        title="Add New Yacht"
        subtitle="Fill in the details below to add a yacht to your fleet"
        backHref="/admin/yachts"
      />

      {error && (
        <AdminAlertBanner
          severity="critical"
          message={error}
          onDismiss={() => setError(null)}
        />
      )}

      {/* Basic Info */}
      <AdminCard accent accentColor="blue" className="mb-5">
        <div className="flex items-center gap-2 mb-4">
          <Ship size={15} color="#3B7EA1" />
          <p style={sectionTitleStyle}>Basic Information</p>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>Yacht Name *</label>
              <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Azure Dreams" />
            </div>
            <div>
              <label style={labelStyle}>Slug *</label>
              <input style={inputStyle} value={slug} onChange={e => setSlug(e.target.value)} placeholder="azure-dreams" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>Type *</label>
              <select style={selectStyle} value={type} onChange={e => setType(e.target.value)}>
                {YACHT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select style={selectStyle} value={status} onChange={e => setStatus(e.target.value)}>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Description (English)</label>
            <textarea
              style={textareaStyle}
              value={description_en}
              onChange={e => setDescriptionEn(e.target.value)}
              placeholder="Describe the yacht, its features, and unique selling points..."
            />
          </div>
          <div>
            <label style={labelStyle}>Description (Arabic)</label>
            <textarea
              style={textareaStyle}
              dir="rtl"
              value={description_ar}
              onChange={e => setDescriptionAr(e.target.value)}
              placeholder="وصف اليخت..."
            />
          </div>
        </div>
      </AdminCard>

      {/* Specifications */}
      <AdminCard className="mb-5">
        <div className="flex items-center gap-2 mb-4">
          <Ruler size={15} color="#C49A2A" />
          <p style={sectionTitleStyle}>Specifications</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label style={labelStyle}>Length (m)</label>
            <input style={inputStyle} type="number" value={length} onChange={e => setLength(e.target.value)} placeholder="15.5" />
          </div>
          <div>
            <label style={labelStyle}>Beam (m)</label>
            <input style={inputStyle} type="number" value={beam} onChange={e => setBeam(e.target.value)} placeholder="4.5" />
          </div>
          <div>
            <label style={labelStyle}>Draft (m)</label>
            <input style={inputStyle} type="number" value={draft} onChange={e => setDraft(e.target.value)} placeholder="2.1" />
          </div>
          <div>
            <label style={labelStyle}>Year Built</label>
            <input style={inputStyle} type="number" value={yearBuilt} onChange={e => setYearBuilt(e.target.value)} placeholder="2022" />
          </div>
          <div>
            <label style={labelStyle}>Builder</label>
            <input style={inputStyle} value={builder} onChange={e => setBuilder(e.target.value)} placeholder="e.g. Beneteau" />
          </div>
          <div>
            <label style={labelStyle}>Model</label>
            <input style={inputStyle} value={model} onChange={e => setModel(e.target.value)} placeholder="e.g. Oceanis 46.1" />
          </div>
        </div>
      </AdminCard>

      {/* Capacity */}
      <AdminCard className="mb-5">
        <div className="flex items-center gap-2 mb-4">
          <Users size={15} color="#3B7EA1" />
          <p style={sectionTitleStyle}>Capacity</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label style={labelStyle}>Cabins</label>
            <input style={inputStyle} type="number" value={cabins} onChange={e => setCabins(e.target.value)} placeholder="4" />
          </div>
          <div>
            <label style={labelStyle}>Berths</label>
            <input style={inputStyle} type="number" value={berths} onChange={e => setBerths(e.target.value)} placeholder="8" />
          </div>
          <div>
            <label style={labelStyle}>Bathrooms</label>
            <input style={inputStyle} type="number" value={bathrooms} onChange={e => setBathrooms(e.target.value)} placeholder="2" />
          </div>
          <div>
            <label style={labelStyle}>Crew Size</label>
            <input style={inputStyle} type="number" value={crewSize} onChange={e => setCrewSize(e.target.value)} placeholder="3" />
          </div>
        </div>
      </AdminCard>

      {/* Pricing */}
      <AdminCard className="mb-5">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign size={15} color="#2D5A3D" />
          <p style={sectionTitleStyle}>Pricing</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label style={labelStyle}>Price/Week (Low)</label>
            <input style={inputStyle} type="number" value={pricePerWeekLow} onChange={e => setPriceLow(e.target.value)} placeholder="5000" />
          </div>
          <div>
            <label style={labelStyle}>Price/Week (High)</label>
            <input style={inputStyle} type="number" value={pricePerWeekHigh} onChange={e => setPriceHigh(e.target.value)} placeholder="12000" />
          </div>
          <div>
            <label style={labelStyle}>Currency</label>
            <select style={selectStyle} value={currency} onChange={e => setCurrency(e.target.value)}>
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </AdminCard>

      {/* Location */}
      <AdminCard className="mb-5">
        <div className="flex items-center gap-2 mb-4">
          <MapPin size={15} color="#C8322B" />
          <p style={sectionTitleStyle}>Location</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label style={labelStyle}>Home Port</label>
            <input style={inputStyle} value={homePort} onChange={e => setHomePort(e.target.value)} placeholder="e.g. Split, Croatia" />
          </div>
          <div>
            <label style={labelStyle}>Cruising Area</label>
            <input style={inputStyle} value={cruisingArea} onChange={e => setCruisingArea(e.target.value)} placeholder="e.g. Adriatic Sea" />
          </div>
          <div>
            <label style={labelStyle}>Primary Destination</label>
            <select style={selectStyle} value={destinationId} onChange={e => setDestinationId(e.target.value)}>
              <option value="">None</option>
              {destinations.map(d => <option key={d.id} value={d.id}>{d.name} ({REGION_LABELS[d.region] ?? d.region})</option>)}
            </select>
          </div>
        </div>
      </AdminCard>

      {/* GCC Features */}
      <AdminCard className="mb-5">
        <div className="flex items-center gap-2 mb-4">
          <Star size={15} color="#C49A2A" />
          <p style={sectionTitleStyle}>GCC Features & Highlights</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label
            style={{
              ...checkboxContainerStyle,
              backgroundColor: halalCatering ? 'rgba(45,90,61,0.04)' : '#FFFFFF',
              borderColor: halalCatering ? 'rgba(45,90,61,0.3)' : 'rgba(214,208,196,0.6)',
            }}
          >
            <input type="checkbox" checked={halalCatering} onChange={e => setHalalCatering(e.target.checked)} style={{ accentColor: '#2D5A3D' }} />
            <ChefHat size={16} color="#2D5A3D" />
            <span style={{ fontFamily: 'var(--font-system)', fontSize: 11, fontWeight: 600, color: '#44403C' }}>
              Halal Catering
            </span>
          </label>
          <label
            style={{
              ...checkboxContainerStyle,
              backgroundColor: familyFriendly ? 'rgba(59,126,161,0.04)' : '#FFFFFF',
              borderColor: familyFriendly ? 'rgba(59,126,161,0.3)' : 'rgba(214,208,196,0.6)',
            }}
          >
            <input type="checkbox" checked={familyFriendly} onChange={e => setFamilyFriendly(e.target.checked)} style={{ accentColor: '#3B7EA1' }} />
            <Baby size={16} color="#3B7EA1" />
            <span style={{ fontFamily: 'var(--font-system)', fontSize: 11, fontWeight: 600, color: '#44403C' }}>
              Family Friendly
            </span>
          </label>
          <label
            style={{
              ...checkboxContainerStyle,
              backgroundColor: crewIncluded ? 'rgba(196,154,42,0.04)' : '#FFFFFF',
              borderColor: crewIncluded ? 'rgba(196,154,42,0.3)' : 'rgba(214,208,196,0.6)',
            }}
          >
            <input type="checkbox" checked={crewIncluded} onChange={e => setCrewIncluded(e.target.checked)} style={{ accentColor: '#C49A2A' }} />
            <Anchor size={16} color="#C49A2A" />
            <span style={{ fontFamily: 'var(--font-system)', fontSize: 11, fontWeight: 600, color: '#44403C' }}>
              Crew Included
            </span>
          </label>
        </div>
        <div className="mt-3">
          <label
            style={{
              ...checkboxContainerStyle,
              width: 'fit-content',
              backgroundColor: featured ? 'rgba(196,154,42,0.06)' : '#FFFFFF',
              borderColor: featured ? 'rgba(196,154,42,0.4)' : 'rgba(214,208,196,0.6)',
            }}
          >
            <input type="checkbox" checked={featured} onChange={e => setFeatured(e.target.checked)} style={{ accentColor: '#C49A2A' }} />
            <Star size={16} color="#C49A2A" />
            <span style={{ fontFamily: 'var(--font-system)', fontSize: 11, fontWeight: 600, color: '#44403C' }}>
              Featured Yacht
            </span>
          </label>
        </div>
      </AdminCard>

      {/* Images */}
      <AdminCard className="mb-5">
        <div className="flex items-center gap-2 mb-4">
          <ImagePlus size={15} color="#3B7EA1" />
          <p style={sectionTitleStyle}>Images</p>
        </div>
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              style={inputStyle}
              value={newImageUrl}
              onChange={e => setNewImageUrl(e.target.value)}
              placeholder="Paste image URL..."
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addImage() } }}
            />
            <AdminButton variant="secondary" onClick={addImage}>Add</AdminButton>
          </div>
          {images.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {images.map((url, i) => (
                <div
                  key={i}
                  className="relative group"
                  style={{
                    borderRadius: 10,
                    border: '1px solid rgba(214,208,196,0.6)',
                    overflow: 'hidden',
                    backgroundColor: '#FAF8F4',
                  }}
                >
                  <div className="flex items-center justify-center" style={{ aspectRatio: '4/3' }}>
                    <Waves size={24} color="#D6D0C4" />
                  </div>
                  <div style={{ padding: '8px 10px' }}>
                    <p style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#78716C', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {url}
                    </p>
                    {i === 0 && (
                      <div className="mt-1">
                        <AdminStatusBadge status="active" label="Hero Image" />
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => removeImage(url)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{
                      backgroundColor: '#C8322B',
                      color: '#FFFFFF',
                      borderRadius: '50%',
                      width: 22,
                      height: 22,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <p style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#A8A29E' }}>
            First image will be used as the hero image. Add yacht photo URLs from your media library.
          </p>
        </div>
      </AdminCard>

      {/* Save */}
      <div className="flex justify-end gap-3 pb-8">
        <AdminButton variant="secondary" onClick={() => router.push('/admin/yachts')}>Cancel</AdminButton>
        <AdminButton
          variant="primary"
          onClick={handleSave}
          loading={saving}
          disabled={saving || !name.trim()}
        >
          <Save size={13} />
          {saving ? 'Saving...' : 'Create Yacht'}
        </AdminButton>
      </div>
    </div>
  )
}
