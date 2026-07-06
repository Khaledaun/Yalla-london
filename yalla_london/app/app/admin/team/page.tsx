'use client'

import { useState, useEffect } from 'react'
import {
  AdminPageHeader,
  AdminCard,
  AdminKPICard,
  AdminButton,
  AdminStatusBadge,
  AdminLoadingState,
  AdminEmptyState,
  AdminSectionLabel,
  AdminTabs,
} from '@/components/admin/admin-ui'
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Search,
  Star,
  CheckCircle,
  XCircle,
  Sparkles,
  Linkedin,
  Twitter,
  Instagram,
  Globe,
  Mail,
  RefreshCw,
  UserPlus,
  Award,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface TeamMember {
  id: string
  site_id: string | null
  user_id: string | null
  name_en: string
  name_ar: string | null
  slug: string
  title_en: string
  title_ar: string | null
  bio_en: string
  bio_ar: string | null
  avatar_url: string | null
  cover_image_url: string | null
  email_public: string | null
  linkedin_url: string | null
  twitter_url: string | null
  instagram_url: string | null
  website_url: string | null
  is_active: boolean
  is_featured: boolean
  display_order: number
  created_at: string
  updated_at: string
  expertise?: {
    id: string
    skill: {
      id: string
      name_en: string
      name_ar: string | null
      category: string
      icon: string | null
    }
    proficiency: string
    is_primary: boolean
  }[]
}

interface Skill {
  id: string
  slug: string
  name_en: string
  name_ar: string | null
  category: string
  icon: string | null
}

const PROFICIENCY_LEVELS = [
  { value: 'LEARNING', label: 'Learning', status: 'warning' },
  { value: 'PROFICIENT', label: 'Proficient', status: 'pending' },
  { value: 'EXPERT', label: 'Expert', status: 'success' },
  { value: 'THOUGHT_LEADER', label: 'Thought Leader', status: 'running' },
]

/* ─── Modal Shell ─────────────────────────────────────────────────── */
function Modal({ open, onClose, title, description, children, footer }: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative z-10 w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid rgba(214,208,196,0.6)',
          boxShadow: '0 20px 60px rgba(28,25,23,0.15)',
        }}
      >
        <div className="px-6 pt-5 pb-3 flex items-start justify-between" style={{ borderBottom: '1px solid rgba(214,208,196,0.4)' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: '#1C1917' }}>{title}</h2>
            {description && (
              <p style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#78716C', marginTop: 4 }}>{description}</p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors text-stone-400 hover:text-stone-700">
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-4">{children}</div>
        {footer && (
          <div className="px-6 py-4 flex items-center justify-end gap-2" style={{ borderTop: '1px solid rgba(214,208,196,0.4)' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Form Label ─────────────────────────────────────────────────── */
function FormLabel({ children, htmlFor, required }: { children: React.ReactNode; htmlFor?: string; required?: boolean }) {
  return (
    <label
      htmlFor={htmlFor}
      style={{
        fontFamily: 'var(--font-system)',
        fontSize: 10,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '1px',
        color: '#78716C',
        display: 'block',
        marginBottom: 4,
      }}
    >
      {children}{required && <span style={{ color: '#C8322B' }}> *</span>}
    </label>
  )
}

export default function TeamManagementPage() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all')

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isExpertiseOpen, setIsExpertiseOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name_en: '',
    name_ar: '',
    slug: '',
    title_en: '',
    title_ar: '',
    bio_en: '',
    bio_ar: '',
    avatar_url: '',
    cover_image_url: '',
    email_public: '',
    linkedin_url: '',
    twitter_url: '',
    instagram_url: '',
    website_url: '',
    is_active: true,
    is_featured: false,
    display_order: 0,
  })

  // Expertise form state
  const [expertiseForm, setExpertiseForm] = useState({
    skill_id: '',
    proficiency: 'EXPERT',
    is_primary: false,
  })

  const fetchMembers = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/team?include_inactive=true')
      const data = await response.json()

      if (data.success) {
        setMembers(data.data)
      } else {
        toast.error('Failed to load team members')
      }
    } catch (error) {
      console.error('Error fetching team members:', error)
      toast.error('Failed to load team members')
    } finally {
      setLoading(false)
    }
  }

  const fetchSkills = async () => {
    try {
      const response = await fetch('/api/admin/skills?limit=100')
      const data = await response.json()

      if (data.success) {
        setSkills(data.data)
      }
    } catch (error) {
      console.error('Error fetching skills:', error)
    }
  }

  useEffect(() => {
    fetchMembers()
    fetchSkills()
  }, [])

  const handleCreateMember = async () => {
    try {
      const response = await fetch('/api/admin/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Team member created successfully')
        setIsCreateOpen(false)
        resetForm()
        fetchMembers()
      } else {
        toast.error(data.error || 'Failed to create team member')
      }
    } catch (error) {
      console.error('Error creating team member:', error)
      toast.error('Failed to create team member')
    }
  }

  const handleUpdateMember = async () => {
    if (!selectedMember) return

    try {
      const response = await fetch(`/api/admin/team/${selectedMember.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Team member updated successfully')
        setIsEditOpen(false)
        setSelectedMember(null)
        resetForm()
        fetchMembers()
      } else {
        toast.error(data.error || 'Failed to update team member')
      }
    } catch (error) {
      console.error('Error updating team member:', error)
      toast.error('Failed to update team member')
    }
  }

  const handleDeleteMember = async () => {
    if (!selectedMember) return

    try {
      const response = await fetch(`/api/admin/team/${selectedMember.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Team member deleted successfully')
        setIsDeleteOpen(false)
        setSelectedMember(null)
        fetchMembers()
      } else {
        toast.error(data.error || 'Failed to delete team member')
      }
    } catch (error) {
      console.error('Error deleting team member:', error)
      toast.error('Failed to delete team member')
    }
  }

  const handleToggleFeatured = async (member: TeamMember) => {
    try {
      const response = await fetch(`/api/admin/team/${member.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_featured: !member.is_featured }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success(`Team member ${member.is_featured ? 'unfeatured' : 'featured'}`)
        fetchMembers()
      } else {
        toast.error(data.error || 'Failed to update team member')
      }
    } catch (error) {
      console.error('Error toggling featured:', error)
      toast.error('Failed to update team member')
    }
  }

  const handleToggleActive = async (member: TeamMember) => {
    try {
      const response = await fetch(`/api/admin/team/${member.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !member.is_active }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success(`Team member ${member.is_active ? 'deactivated' : 'activated'}`)
        fetchMembers()
      } else {
        toast.error(data.error || 'Failed to update team member')
      }
    } catch (error) {
      console.error('Error toggling active:', error)
      toast.error('Failed to update team member')
    }
  }

  const handleAddExpertise = async () => {
    if (!selectedMember || !expertiseForm.skill_id) return

    try {
      const response = await fetch(`/api/admin/team/${selectedMember.id}/expertise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expertiseForm),
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Skill added successfully')
        setExpertiseForm({ skill_id: '', proficiency: 'EXPERT', is_primary: false })
        fetchMembers()
        const updatedMember = members.find(m => m.id === selectedMember.id)
        if (updatedMember) {
          setSelectedMember({ ...updatedMember, ...data.data })
        }
      } else {
        toast.error(data.error || 'Failed to add skill')
      }
    } catch (error) {
      console.error('Error adding expertise:', error)
      toast.error('Failed to add skill')
    }
  }

  const handleRemoveExpertise = async (skillId: string) => {
    if (!selectedMember) return

    try {
      const response = await fetch(
        `/api/admin/team/${selectedMember.id}/expertise?skill_id=${skillId}`,
        { method: 'DELETE' }
      )

      const data = await response.json()

      if (data.success) {
        toast.success('Skill removed successfully')
        fetchMembers()
      } else {
        toast.error(data.error || 'Failed to remove skill')
      }
    } catch (error) {
      console.error('Error removing expertise:', error)
      toast.error('Failed to remove skill')
    }
  }

  const resetForm = () => {
    setFormData({
      name_en: '', name_ar: '', slug: '', title_en: '', title_ar: '',
      bio_en: '', bio_ar: '', avatar_url: '', cover_image_url: '',
      email_public: '', linkedin_url: '', twitter_url: '', instagram_url: '',
      website_url: '', is_active: true, is_featured: false, display_order: 0,
    })
  }

  const openEditDialog = (member: TeamMember) => {
    setSelectedMember(member)
    setFormData({
      name_en: member.name_en,
      name_ar: member.name_ar || '',
      slug: member.slug,
      title_en: member.title_en,
      title_ar: member.title_ar || '',
      bio_en: member.bio_en,
      bio_ar: member.bio_ar || '',
      avatar_url: member.avatar_url || '',
      cover_image_url: member.cover_image_url || '',
      email_public: member.email_public || '',
      linkedin_url: member.linkedin_url || '',
      twitter_url: member.twitter_url || '',
      instagram_url: member.instagram_url || '',
      website_url: member.website_url || '',
      is_active: member.is_active,
      is_featured: member.is_featured,
      display_order: member.display_order,
    })
    setIsEditOpen(true)
  }

  const openExpertiseDialog = (member: TeamMember) => {
    setSelectedMember(member)
    setIsExpertiseOpen(true)
  }

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  }

  const getInitials = (name: string) => {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
  }

  // Filter members
  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      member.name_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.title_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (member.name_ar && member.name_ar.includes(searchQuery))

    const matchesTab =
      activeTab === 'all' ||
      (activeTab === 'featured' && member.is_featured) ||
      (activeTab === 'active' && member.is_active) ||
      (activeTab === 'inactive' && !member.is_active)

    return matchesSearch && matchesTab
  })

  /* ─── Member Form (shared between create / edit) ────────────────── */
  const MemberForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <FormLabel htmlFor="name_en" required>Name (English)</FormLabel>
          <input
            id="name_en"
            className="admin-input w-full"
            value={formData.name_en}
            onChange={(e) => setFormData({ ...formData, name_en: e.target.value, slug: generateSlug(e.target.value) })}
            placeholder="John Doe"
          />
        </div>
        <div>
          <FormLabel htmlFor="name_ar">Name (Arabic)</FormLabel>
          <input
            id="name_ar" dir="rtl" className="admin-input w-full"
            value={formData.name_ar}
            onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
            placeholder="\u062C\u0648\u0646 \u062F\u0648"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <FormLabel htmlFor="title_en" required>Title (English)</FormLabel>
          <input id="title_en" className="admin-input w-full" value={formData.title_en}
            onChange={(e) => setFormData({ ...formData, title_en: e.target.value })} placeholder="Senior Developer" />
        </div>
        <div>
          <FormLabel htmlFor="title_ar">Title (Arabic)</FormLabel>
          <input id="title_ar" dir="rtl" className="admin-input w-full" value={formData.title_ar}
            onChange={(e) => setFormData({ ...formData, title_ar: e.target.value })} placeholder="\u0645\u0637\u0648\u0631 \u0623\u0648\u0644" />
        </div>
      </div>
      <div>
        <FormLabel htmlFor="slug" required>Slug</FormLabel>
        <input id="slug" className="admin-input w-full" value={formData.slug}
          onChange={(e) => setFormData({ ...formData, slug: e.target.value })} placeholder="john-doe" />
      </div>
      <div>
        <FormLabel htmlFor="bio_en" required>Bio (English)</FormLabel>
        <textarea id="bio_en" className="admin-input w-full" rows={3} value={formData.bio_en}
          onChange={(e) => setFormData({ ...formData, bio_en: e.target.value })} placeholder="Write a brief bio..." />
      </div>
      <div>
        <FormLabel htmlFor="bio_ar">Bio (Arabic)</FormLabel>
        <textarea id="bio_ar" dir="rtl" className="admin-input w-full" rows={3} value={formData.bio_ar}
          onChange={(e) => setFormData({ ...formData, bio_ar: e.target.value })} placeholder="\u0627\u0643\u062A\u0628 \u0646\u0628\u0630\u0629 \u0645\u062E\u062A\u0635\u0631\u0629..." />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <FormLabel htmlFor="avatar_url">Avatar URL</FormLabel>
          <input id="avatar_url" className="admin-input w-full" value={formData.avatar_url}
            onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })} placeholder="https://..." />
        </div>
        <div>
          <FormLabel htmlFor="cover_image_url">Cover Image URL</FormLabel>
          <input id="cover_image_url" className="admin-input w-full" value={formData.cover_image_url}
            onChange={(e) => setFormData({ ...formData, cover_image_url: e.target.value })} placeholder="https://..." />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <FormLabel htmlFor="email_public">Public Email</FormLabel>
          <input id="email_public" type="email" className="admin-input w-full" value={formData.email_public}
            onChange={(e) => setFormData({ ...formData, email_public: e.target.value })} placeholder="john@example.com" />
        </div>
        <div>
          <FormLabel htmlFor="website_url">Website</FormLabel>
          <input id="website_url" className="admin-input w-full" value={formData.website_url}
            onChange={(e) => setFormData({ ...formData, website_url: e.target.value })} placeholder="https://..." />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <FormLabel htmlFor="linkedin_url">LinkedIn</FormLabel>
          <input id="linkedin_url" className="admin-input w-full" value={formData.linkedin_url}
            onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })} placeholder="https://linkedin.com/in/..." />
        </div>
        <div>
          <FormLabel htmlFor="twitter_url">Twitter</FormLabel>
          <input id="twitter_url" className="admin-input w-full" value={formData.twitter_url}
            onChange={(e) => setFormData({ ...formData, twitter_url: e.target.value })} placeholder="https://twitter.com/..." />
        </div>
        <div>
          <FormLabel htmlFor="instagram_url">Instagram</FormLabel>
          <input id="instagram_url" className="admin-input w-full" value={formData.instagram_url}
            onChange={(e) => setFormData({ ...formData, instagram_url: e.target.value })} placeholder="https://instagram.com/..." />
        </div>
      </div>
      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 cursor-pointer" style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#44403C' }}>
          <input type="checkbox" checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="h-4 w-4 rounded" /> Active
        </label>
        <label className="flex items-center gap-2 cursor-pointer" style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#44403C' }}>
          <input type="checkbox" checked={formData.is_featured}
            onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })} className="h-4 w-4 rounded" /> Featured
        </label>
        <div className="flex items-center gap-2">
          <FormLabel>Order</FormLabel>
          <input type="number" className="admin-input w-20" value={formData.display_order}
            onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })} />
        </div>
      </div>
    </div>
  )

  return (
    <div className="admin-page p-4 md:p-6">
      <AdminPageHeader
        title="Team Management"
        subtitle="Manage your team members and their profiles"
        action={
          <div className="flex gap-2">
            <Link href="/admin/skills">
              <AdminButton variant="secondary"><Sparkles size={14} /> Manage Skills</AdminButton>
            </Link>
            <AdminButton variant="primary" onClick={() => setIsCreateOpen(true)}>
              <UserPlus size={14} /> Add Member
            </AdminButton>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <AdminKPICard value={members.length} label="Total Members" color="#3B7EA1" />
        <AdminKPICard value={members.filter(m => m.is_active).length} label="Active" color="#2D5A3D" />
        <AdminKPICard value={members.filter(m => m.is_featured).length} label="Featured" color="#C49A2A" />
        <AdminKPICard
          value={members.reduce((acc, m) => acc + (m.expertise?.length || 0), 0)}
          label="Total Skills"
          color="#1C1917"
        />
      </div>

      {/* Search */}
      <AdminCard className="mb-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#A8A29E' }} />
            <input
              placeholder="Search team members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="admin-input pl-10 w-full"
            />
          </div>
          <AdminButton variant="secondary" onClick={fetchMembers}>
            <RefreshCw size={14} /> Refresh
          </AdminButton>
        </div>
      </AdminCard>

      {/* Tabs + Table */}
      <div className="mb-4">
        <AdminTabs
          tabs={[
            { id: 'all', label: 'All', count: members.length },
            { id: 'active', label: 'Active', count: members.filter(m => m.is_active).length },
            { id: 'featured', label: 'Featured', count: members.filter(m => m.is_featured).length },
            { id: 'inactive', label: 'Inactive', count: members.filter(m => !m.is_active).length },
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>

      <AdminCard className="mb-6">
        {loading ? (
          <AdminLoadingState label="Loading team..." />
        ) : filteredMembers.length === 0 ? (
          <AdminEmptyState
            icon={Users}
            title="No team members found"
            description={searchQuery ? 'Try adjusting your search.' : 'Get started by adding your first team member.'}
            action={
              <AdminButton variant="primary" onClick={() => setIsCreateOpen(true)}>
                <UserPlus size={14} /> Add Member
              </AdminButton>
            }
          />
        ) : (
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <table className="w-full" style={{ fontFamily: 'var(--font-system)', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(214,208,196,0.5)' }}>
                  {['Member', 'Title', 'Skills', 'Status', 'Featured', ''].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left" style={{
                      fontFamily: 'var(--font-system)', fontSize: 9, fontWeight: 600,
                      textTransform: 'uppercase', letterSpacing: '1.5px', color: '#78716C',
                      ...(h === 'Status' || h === 'Featured' ? { textAlign: 'center' } : {}),
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((member) => (
                  <tr key={member.id} className="transition-colors hover:bg-stone-50/50"
                    style={{ borderBottom: '1px solid rgba(214,208,196,0.3)' }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{
                            backgroundColor: member.avatar_url ? 'transparent' : '#3B7EA1',
                            backgroundImage: member.avatar_url ? `url(${member.avatar_url})` : undefined,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, color: '#FAF8F4',
                          }}
                        >
                          {!member.avatar_url && getInitials(member.name_en)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#1C1917', fontSize: 12 }}>{member.name_en}</div>
                          {member.name_ar && (
                            <div dir="rtl" style={{ fontSize: 11, color: '#78716C' }}>{member.name_ar}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div style={{ fontSize: 12, color: '#44403C' }}>{member.title_en}</div>
                      {member.title_ar && (
                        <div dir="rtl" style={{ fontSize: 11, color: '#78716C' }}>{member.title_ar}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {member.expertise?.slice(0, 3).map((exp) => (
                          <AdminStatusBadge key={exp.id} status={exp.is_primary ? 'active' : 'pending'}
                            label={`${exp.skill.icon || ''} ${exp.skill.name_en}`} />
                        ))}
                        {member.expertise && member.expertise.length > 3 && (
                          <AdminStatusBadge status="inactive" label={`+${member.expertise.length - 3}`} />
                        )}
                        {(!member.expertise || member.expertise.length === 0) && (
                          <span style={{ color: '#A8A29E', fontFamily: 'var(--font-system)', fontSize: 11 }}>No skills</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleToggleActive(member)} className="cursor-pointer">
                        <AdminStatusBadge status={member.is_active ? 'active' : 'inactive'} />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleToggleFeatured(member)} className="cursor-pointer p-1 rounded-lg hover:bg-stone-100 transition-colors">
                        <Star size={16} className={member.is_featured ? 'fill-[#C49A2A]' : ''} style={{ color: member.is_featured ? '#C49A2A' : '#D6D0C4' }} />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <AdminButton variant="ghost" size="sm" onClick={() => openExpertiseDialog(member)}>
                          <Sparkles size={13} />
                        </AdminButton>
                        <AdminButton variant="ghost" size="sm" onClick={() => openEditDialog(member)}>
                          <Edit size={13} />
                        </AdminButton>
                        <AdminButton variant="ghost" size="sm" onClick={() => { setSelectedMember(member); setIsDeleteOpen(true) }}>
                          <Trash2 size={13} style={{ color: '#C8322B' }} />
                        </AdminButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>

      {/* Team Grid View */}
      {filteredMembers.length > 0 && (
        <>
          <AdminSectionLabel>Team Cards</AdminSectionLabel>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredMembers.slice(0, 6).map((member) => (
              <AdminCard key={member.id} elevated className="hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: member.avatar_url ? 'transparent' : '#3B7EA1',
                      backgroundImage: member.avatar_url ? `url(${member.avatar_url})` : undefined,
                      backgroundSize: 'cover', backgroundPosition: 'center',
                      fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: '#FAF8F4',
                    }}
                  >
                    {!member.avatar_url && getInitials(member.name_en)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: '#1C1917' }}>
                        {member.name_en}
                      </span>
                      {member.is_featured && <Star size={13} className="fill-[#C49A2A] flex-shrink-0" style={{ color: '#C49A2A' }} />}
                    </div>
                    <p className="truncate" style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#78716C', marginTop: 2 }}>{member.title_en}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {member.expertise?.slice(0, 2).map((exp) => (
                        <AdminStatusBadge key={exp.id} status="pending" label={`${exp.skill.icon || ''} ${exp.skill.name_en}`} />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Social Links */}
                <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: '1px solid rgba(214,208,196,0.4)' }}>
                  {member.linkedin_url && (
                    <a href={member.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-stone-400 hover:text-[#3B7EA1] transition-colors">
                      <Linkedin size={14} />
                    </a>
                  )}
                  {member.twitter_url && (
                    <a href={member.twitter_url} target="_blank" rel="noopener noreferrer" className="text-stone-400 hover:text-[#3B7EA1] transition-colors">
                      <Twitter size={14} />
                    </a>
                  )}
                  {member.instagram_url && (
                    <a href={member.instagram_url} target="_blank" rel="noopener noreferrer" className="text-stone-400 hover:text-[#C8322B] transition-colors">
                      <Instagram size={14} />
                    </a>
                  )}
                  {member.website_url && (
                    <a href={member.website_url} target="_blank" rel="noopener noreferrer" className="text-stone-400 hover:text-stone-600 transition-colors">
                      <Globe size={14} />
                    </a>
                  )}
                  {member.email_public && (
                    <a href={`mailto:${member.email_public}`} className="text-stone-400 hover:text-stone-600 transition-colors">
                      <Mail size={14} />
                    </a>
                  )}
                  <div className="flex-1" />
                  <AdminButton variant="secondary" size="sm" onClick={() => openEditDialog(member)}>
                    <Edit size={12} /> Edit
                  </AdminButton>
                </div>
              </AdminCard>
            ))}
          </div>
        </>
      )}

      {/* Create Member Modal */}
      <Modal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add Team Member"
        description="Add a new member to your team."
        footer={
          <>
            <AdminButton variant="secondary" onClick={() => setIsCreateOpen(false)}>Cancel</AdminButton>
            <AdminButton variant="primary" onClick={handleCreateMember}
              disabled={!formData.name_en || !formData.title_en || !formData.bio_en}>
              Create Member
            </AdminButton>
          </>
        }
      >
        <MemberForm />
      </Modal>

      {/* Edit Member Modal */}
      <Modal
        open={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Team Member"
        description="Update the team member's details."
        footer={
          <>
            <AdminButton variant="secondary" onClick={() => setIsEditOpen(false)}>Cancel</AdminButton>
            <AdminButton variant="primary" onClick={handleUpdateMember}>Save Changes</AdminButton>
          </>
        }
      >
        <MemberForm />
      </Modal>

      {/* Expertise Management Modal */}
      <Modal
        open={isExpertiseOpen}
        onClose={() => setIsExpertiseOpen(false)}
        title={`Manage Skills - ${selectedMember?.name_en || ''}`}
        description="Add or remove skills for this team member."
        footer={
          <AdminButton variant="secondary" onClick={() => setIsExpertiseOpen(false)}>Done</AdminButton>
        }
      >
        <div className="space-y-4">
          <AdminSectionLabel>Current Skills</AdminSectionLabel>
          <div className="space-y-2">
            {selectedMember?.expertise && selectedMember.expertise.length > 0 ? (
              selectedMember.expertise.map((exp) => (
                <div key={exp.id} className="flex items-center justify-between p-3 rounded-xl"
                  style={{ backgroundColor: '#FAF8F4', border: '1px solid rgba(214,208,196,0.4)' }}>
                  <div className="flex items-center gap-3">
                    {exp.skill.icon && <span className="text-lg">{exp.skill.icon}</span>}
                    <div>
                      <div style={{ fontFamily: 'var(--font-system)', fontWeight: 600, fontSize: 12, color: '#1C1917' }}>{exp.skill.name_en}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <AdminStatusBadge
                          status={PROFICIENCY_LEVELS.find(p => p.value === exp.proficiency)?.status || 'pending'}
                          label={PROFICIENCY_LEVELS.find(p => p.value === exp.proficiency)?.label || exp.proficiency}
                        />
                        {exp.is_primary && (
                          <AdminStatusBadge status="warning" label="Primary" />
                        )}
                      </div>
                    </div>
                  </div>
                  <AdminButton variant="ghost" size="sm" onClick={() => handleRemoveExpertise(exp.skill.id)}>
                    <Trash2 size={13} style={{ color: '#C8322B' }} />
                  </AdminButton>
                </div>
              ))
            ) : (
              <p style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#78716C' }}>No skills assigned yet.</p>
            )}
          </div>

          <div style={{ borderTop: '1px solid rgba(214,208,196,0.4)', paddingTop: 16 }}>
            <AdminSectionLabel>Add New Skill</AdminSectionLabel>
            <div className="grid grid-cols-3 gap-3">
              <select
                className="admin-select"
                value={expertiseForm.skill_id}
                onChange={(e) => setExpertiseForm({ ...expertiseForm, skill_id: e.target.value })}
              >
                <option value="">Select skill</option>
                {skills
                  .filter(s => !selectedMember?.expertise?.some(e => e.skill.id === s.id))
                  .map(skill => (
                    <option key={skill.id} value={skill.id}>{skill.icon} {skill.name_en}</option>
                  ))}
              </select>
              <select
                className="admin-select"
                value={expertiseForm.proficiency}
                onChange={(e) => setExpertiseForm({ ...expertiseForm, proficiency: e.target.value })}
              >
                {PROFICIENCY_LEVELS.map(level => (
                  <option key={level.value} value={level.value}>{level.label}</option>
                ))}
              </select>
              <label className="flex items-center gap-2 cursor-pointer" style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#44403C' }}>
                <input type="checkbox" checked={expertiseForm.is_primary}
                  onChange={(e) => setExpertiseForm({ ...expertiseForm, is_primary: e.target.checked })} className="h-4 w-4 rounded" />
                Primary
              </label>
            </div>
            <div className="mt-3">
              <AdminButton variant="secondary" onClick={handleAddExpertise} disabled={!expertiseForm.skill_id}>
                <Plus size={14} /> Add Skill
              </AdminButton>
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Delete Team Member"
        description={`Are you sure you want to delete "${selectedMember?.name_en}"? This action cannot be undone.`}
        footer={
          <>
            <AdminButton variant="secondary" onClick={() => setIsDeleteOpen(false)}>Cancel</AdminButton>
            <AdminButton variant="danger" onClick={handleDeleteMember}>Delete</AdminButton>
          </>
        }
      >
        <div />
      </Modal>
    </div>
  )
}
