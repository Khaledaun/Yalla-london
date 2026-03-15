'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  AdminCard,
  AdminPageHeader,
  AdminSectionLabel,
  AdminStatusBadge,
  AdminKPICard,
  AdminButton,
  AdminLoadingState,
  AdminEmptyState,
  AdminTabs,
  AdminAlertBanner,
} from '@/components/admin/admin-ui'
import {
  Sparkles,
  Plus,
  Edit,
  Trash2,
  Search,
  Code,
  Brain,
  Palette,
  BarChart3,
  PenTool,
  Megaphone,
  Heart,
  Briefcase,
  Plane,
  Users,
  RefreshCw,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

interface Skill {
  id: string
  slug: string
  name_en: string
  name_ar: string | null
  category: SkillCategory
  description_en: string | null
  description_ar: string | null
  icon: string | null
  color: string | null
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
  _count?: {
    expertise: number
  }
}

type SkillCategory =
  | 'ENGINEERING'
  | 'AI_ML'
  | 'DESIGN'
  | 'DATA'
  | 'CONTENT'
  | 'MARKETING'
  | 'PSYCHOLOGY'
  | 'BUSINESS'
  | 'TRAVEL'

const SKILL_CATEGORIES: { value: SkillCategory; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'ENGINEERING', label: 'Engineering', icon: <Code size={14} />, color: '#3B7EA1' },
  { value: 'AI_ML', label: 'AI & ML', icon: <Brain size={14} />, color: '#7C3AED' },
  { value: 'DESIGN', label: 'Design', icon: <Palette size={14} />, color: '#C8322B' },
  { value: 'DATA', label: 'Data', icon: <BarChart3 size={14} />, color: '#2D5A3D' },
  { value: 'CONTENT', label: 'Content', icon: <PenTool size={14} />, color: '#C49A2A' },
  { value: 'MARKETING', label: 'Marketing', icon: <Megaphone size={14} />, color: '#C49A2A' },
  { value: 'PSYCHOLOGY', label: 'Psychology', icon: <Heart size={14} />, color: '#C8322B' },
  { value: 'BUSINESS', label: 'Business', icon: <Briefcase size={14} />, color: '#44403C' },
  { value: 'TRAVEL', label: 'Travel', icon: <Plane size={14} />, color: '#3B7EA1' },
]

const getCategoryInfo = (category: SkillCategory) => {
  return SKILL_CATEGORIES.find((c) => c.value === category) || SKILL_CATEGORIES[0]
}

// ─── Reusable form label ───
function FormLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
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
      {children}
    </label>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid rgba(214,208,196,0.8)',
  fontFamily: 'var(--font-system)',
  fontSize: 12,
  backgroundColor: '#FFFFFF',
  outline: 'none',
}

const selectStyle: React.CSSProperties = { ...inputStyle }

// ─── Dialog overlay ───
function DialogOverlay({
  open,
  onClose,
  title,
  subtitle,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(28,25,23,0.5)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 14,
          boxShadow: '0 20px 60px rgba(28,25,23,0.25)',
        }}
      >
        <div className="flex items-start justify-between p-5 border-b" style={{ borderColor: 'rgba(214,208,196,0.6)' }}>
          <div>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: 18,
                color: '#1C1917',
              }}
            >
              {title}
            </h2>
            {subtitle && (
              <p style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#78716C', marginTop: 2 }}>
                {subtitle}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors text-stone-400 hover:text-stone-700">
            <X size={16} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export default function SkillsManagementPage() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<SkillCategory | 'all'>('all')
  const [activeTab, setActiveTab] = useState<string>('all')

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    slug: '',
    name_en: '',
    name_ar: '',
    category: 'ENGINEERING' as SkillCategory,
    description_en: '',
    description_ar: '',
    icon: '',
    color: '#3B82F6',
    is_active: true,
    display_order: 0,
  })

  const fetchSkills = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (categoryFilter !== 'all') {
        params.set('category', categoryFilter)
      }
      params.set('include_inactive', 'true')

      const response = await fetch(`/api/admin/skills?${params}`)
      const data = await response.json()

      if (data.success) {
        setSkills(data.data)
      } else {
        toast.error('Failed to load skills')
      }
    } catch (error) {
      console.error('Error fetching skills:', error)
      toast.error('Failed to load skills')
    } finally {
      setLoading(false)
    }
  }, [categoryFilter])

  useEffect(() => {
    fetchSkills()
  }, [fetchSkills])

  const handleCreateSkill = async () => {
    try {
      const response = await fetch('/api/admin/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Skill created successfully')
        setIsCreateOpen(false)
        resetForm()
        fetchSkills()
      } else {
        toast.error(data.error || 'Failed to create skill')
      }
    } catch (error) {
      console.error('Error creating skill:', error)
      toast.error('Failed to create skill')
    }
  }

  const handleUpdateSkill = async () => {
    if (!selectedSkill) return

    try {
      const response = await fetch(`/api/admin/skills/${selectedSkill.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Skill updated successfully')
        setIsEditOpen(false)
        setSelectedSkill(null)
        resetForm()
        fetchSkills()
      } else {
        toast.error(data.error || 'Failed to update skill')
      }
    } catch (error) {
      console.error('Error updating skill:', error)
      toast.error('Failed to update skill')
    }
  }

  const handleDeleteSkill = async () => {
    if (!selectedSkill) return

    try {
      const response = await fetch(`/api/admin/skills/${selectedSkill.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Skill deleted successfully')
        setIsDeleteOpen(false)
        setSelectedSkill(null)
        fetchSkills()
      } else {
        toast.error(data.error || 'Failed to delete skill')
      }
    } catch (error) {
      console.error('Error deleting skill:', error)
      toast.error('Failed to delete skill')
    }
  }

  const handleToggleActive = async (skill: Skill) => {
    try {
      const response = await fetch(`/api/admin/skills/${skill.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !skill.is_active }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success(`Skill ${skill.is_active ? 'deactivated' : 'activated'}`)
        fetchSkills()
      } else {
        toast.error(data.error || 'Failed to update skill')
      }
    } catch (error) {
      console.error('Error toggling skill:', error)
      toast.error('Failed to update skill')
    }
  }

  const resetForm = () => {
    setFormData({
      slug: '',
      name_en: '',
      name_ar: '',
      category: 'ENGINEERING',
      description_en: '',
      description_ar: '',
      icon: '',
      color: '#3B82F6',
      is_active: true,
      display_order: 0,
    })
  }

  const openEditDialog = (skill: Skill) => {
    setSelectedSkill(skill)
    setFormData({
      slug: skill.slug,
      name_en: skill.name_en,
      name_ar: skill.name_ar || '',
      category: skill.category,
      description_en: skill.description_en || '',
      description_ar: skill.description_ar || '',
      icon: skill.icon || '',
      color: skill.color || '#3B82F6',
      is_active: skill.is_active,
      display_order: skill.display_order,
    })
    setIsEditOpen(true)
  }

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }

  // Filter skills based on search and category
  const filteredSkills = skills.filter((skill) => {
    const matchesSearch =
      skill.name_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (skill.name_ar && skill.name_ar.includes(searchQuery))

    const matchesCategory = activeTab === 'all' || skill.category === activeTab

    return matchesSearch && matchesCategory
  })

  // Group skills by category for stats
  const categoryStats = SKILL_CATEGORIES.map((cat) => ({
    ...cat,
    count: skills.filter((s) => s.category === cat.value).length,
    activeCount: skills.filter((s) => s.category === cat.value && s.is_active).length,
  }))

  // ─── Skill Form (shared between create/edit) ───
  const renderSkillForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <FormLabel>Name (English) *</FormLabel>
          <input
            style={inputStyle}
            value={formData.name_en}
            onChange={(e) => {
              setFormData({
                ...formData,
                name_en: e.target.value,
                slug: isCreateOpen ? generateSlug(e.target.value) : formData.slug,
              })
            }}
            placeholder="e.g., Full-Stack Development"
          />
        </div>
        <div>
          <FormLabel>Name (Arabic)</FormLabel>
          <input
            style={inputStyle}
            dir="rtl"
            value={formData.name_ar}
            onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
            placeholder="e.g., التطوير المتكامل"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <FormLabel>Slug *</FormLabel>
          <input
            style={inputStyle}
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            placeholder="full-stack-development"
          />
        </div>
        <div>
          <FormLabel>Category *</FormLabel>
          <select
            style={selectStyle}
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value as SkillCategory })}
          >
            {SKILL_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <FormLabel>Icon (Emoji)</FormLabel>
          <input
            style={inputStyle}
            value={formData.icon}
            onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
            placeholder="e.g., &#x1F4BB;"
          />
        </div>
        <div>
          <FormLabel>Color</FormLabel>
          <div className="flex gap-2">
            <input
              type="color"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              style={{ ...inputStyle, width: 48, height: 36, padding: 2 }}
            />
            <input
              style={{ ...inputStyle, flex: 1 }}
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              placeholder="#3B82F6"
            />
          </div>
        </div>
      </div>

      <div>
        <FormLabel>Description (English)</FormLabel>
        <textarea
          style={{ ...inputStyle, resize: 'vertical' }}
          value={formData.description_en}
          onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
          placeholder="Brief description of this skill..."
          rows={3}
        />
      </div>

      <div>
        <FormLabel>Description (Arabic)</FormLabel>
        <textarea
          style={{ ...inputStyle, resize: 'vertical' }}
          dir="rtl"
          value={formData.description_ar}
          onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
          placeholder="...وصف مختصر لهذه المهارة"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <FormLabel>Display Order</FormLabel>
          <input
            style={inputStyle}
            type="number"
            value={formData.display_order}
            onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div className="flex items-center gap-2 pt-6">
          <input
            type="checkbox"
            id={isCreateOpen ? 'is_active' : 'edit_is_active'}
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            style={{ width: 16, height: 16 }}
          />
          <label
            htmlFor={isCreateOpen ? 'is_active' : 'edit_is_active'}
            style={{ fontFamily: 'var(--font-system)', fontSize: 12, color: '#44403C' }}
          >
            Active
          </label>
        </div>
      </div>
    </div>
  )

  return (
    <div className="admin-page p-4 md:p-6">
      <AdminPageHeader
        title="Skills Management"
        subtitle="Manage skills and expertise categories"
        action={
          <AdminButton variant="primary" size="sm" onClick={() => setIsCreateOpen(true)}>
            <Plus size={14} />
            Add Skill
          </AdminButton>
        }
      />

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        <AdminKPICard value={skills.length} label="Total Skills" color="#3B7EA1" />
        <AdminKPICard value={skills.filter((s) => s.is_active).length} label="Active" color="#2D5A3D" />
        <AdminKPICard value="9" label="Categories" color="#7C3AED" />
        <AdminKPICard
          value={skills.reduce((acc, s) => acc + (s._count?.expertise || 0), 0)}
          label="Team Using"
          color="#C49A2A"
        />
        <AdminKPICard value={skills.filter((s) => !s.is_active).length} label="Inactive" color="#C8322B" />
      </div>

      {/* Search */}
      <AdminCard className="mb-5">
        <div className="p-3 flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: '#A8A29E' }}
            />
            <input
              placeholder="Search skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                ...inputStyle,
                paddingLeft: 32,
              }}
            />
          </div>
          <AdminButton variant="secondary" size="sm" onClick={fetchSkills}>
            <RefreshCw size={12} />
            Refresh
          </AdminButton>
        </div>
      </AdminCard>

      {/* Category Tabs */}
      <div className="mb-5">
        <AdminTabs
          tabs={[
            { id: 'all', label: 'All', count: skills.length },
            ...categoryStats.map((cat) => ({
              id: cat.value,
              label: cat.label,
              count: cat.count,
            })),
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>

      {/* Skills Table */}
      <AdminCard className="mb-5">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <AdminSectionLabel>
              {activeTab === 'all' ? 'All Skills' : getCategoryInfo(activeTab as SkillCategory).label}
            </AdminSectionLabel>
            <AdminStatusBadge status="active" label={`${filteredSkills.length} skills`} />
          </div>

          {loading ? (
            <AdminLoadingState label="Loading skills..." />
          ) : filteredSkills.length === 0 ? (
            <AdminEmptyState
              icon={Sparkles}
              title="No skills found"
              description={searchQuery ? 'Try adjusting your search.' : 'Get started by adding your first skill.'}
              action={
                !searchQuery ? (
                  <AdminButton variant="primary" size="sm" onClick={() => setIsCreateOpen(true)}>
                    <Plus size={12} />
                    Add Skill
                  </AdminButton>
                ) : undefined
              }
            />
          ) : (
            <div className="space-y-2">
              {/* Mobile-friendly rows */}
              {filteredSkills.map((skill) => {
                const catInfo = getCategoryInfo(skill.category)
                return (
                  <div
                    key={skill.id}
                    className="flex items-center justify-between"
                    style={{
                      padding: '10px 12px',
                      border: '1px solid rgba(214,208,196,0.6)',
                      borderRadius: 10,
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {skill.icon && <span style={{ fontSize: 18 }}>{skill.icon}</span>}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            style={{
                              fontFamily: 'var(--font-display)',
                              fontWeight: 700,
                              fontSize: 13,
                              color: '#1C1917',
                            }}
                          >
                            {skill.name_en}
                          </span>
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full"
                            style={{
                              backgroundColor: `${catInfo.color}12`,
                              fontFamily: 'var(--font-system)',
                              fontSize: 9,
                              fontWeight: 600,
                              color: catInfo.color,
                              letterSpacing: '0.5px',
                            }}
                          >
                            {catInfo.icon}
                            {catInfo.label}
                          </span>
                        </div>
                        <div
                          className="flex items-center gap-3 mt-1"
                          style={{
                            fontFamily: 'var(--font-system)',
                            fontSize: 10,
                            color: '#A8A29E',
                          }}
                        >
                          <span>{skill.slug}</span>
                          {skill.name_ar && <span dir="rtl">{skill.name_ar}</span>}
                          <span>{skill._count?.expertise || 0} members</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => handleToggleActive(skill)}>
                        <AdminStatusBadge status={skill.is_active ? 'active' : 'inactive'} />
                      </button>
                      <AdminButton variant="ghost" size="sm" onClick={() => openEditDialog(skill)}>
                        <Edit size={14} />
                      </AdminButton>
                      <AdminButton
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedSkill(skill)
                          setIsDeleteOpen(true)
                        }}
                      >
                        <Trash2 size={14} color="#C8322B" />
                      </AdminButton>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </AdminCard>

      {/* Category Overview Grid */}
      <AdminSectionLabel>Categories Overview</AdminSectionLabel>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {categoryStats.map((cat) => (
          <AdminCard key={cat.value} className="cursor-pointer hover:shadow-md transition-shadow">
            <div className="p-3 flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${cat.color}15`, color: cat.color }}
              >
                {cat.icon}
              </div>
              <div className="flex-1">
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: 13,
                    color: '#1C1917',
                  }}
                >
                  {cat.label}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-system)',
                    fontSize: 10,
                    color: '#A8A29E',
                  }}
                >
                  {cat.activeCount} active / {cat.count} total
                </div>
              </div>
              <AdminButton variant="ghost" size="sm" onClick={() => setActiveTab(cat.value)}>
                View
              </AdminButton>
            </div>
          </AdminCard>
        ))}
      </div>

      {/* Create Skill Dialog */}
      <DialogOverlay
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Skill"
        subtitle="Add a new skill to the system. Skills can be assigned to team members."
      >
        {renderSkillForm()}
        <div className="flex justify-end gap-2 mt-5 pt-4" style={{ borderTop: '1px solid rgba(214,208,196,0.6)' }}>
          <AdminButton variant="secondary" onClick={() => setIsCreateOpen(false)}>
            Cancel
          </AdminButton>
          <AdminButton
            variant="primary"
            onClick={handleCreateSkill}
            disabled={!formData.name_en || !formData.slug}
          >
            Create Skill
          </AdminButton>
        </div>
      </DialogOverlay>

      {/* Edit Skill Dialog */}
      <DialogOverlay
        open={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Skill"
        subtitle="Update the skill details."
      >
        {renderSkillForm()}
        <div className="flex justify-end gap-2 mt-5 pt-4" style={{ borderTop: '1px solid rgba(214,208,196,0.6)' }}>
          <AdminButton variant="secondary" onClick={() => setIsEditOpen(false)}>
            Cancel
          </AdminButton>
          <AdminButton
            variant="primary"
            onClick={handleUpdateSkill}
            disabled={!formData.name_en || !formData.slug}
          >
            Save Changes
          </AdminButton>
        </div>
      </DialogOverlay>

      {/* Delete Confirmation Dialog */}
      <DialogOverlay
        open={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Delete Skill"
      >
        <p style={{ fontFamily: 'var(--font-system)', fontSize: 12, color: '#44403C', marginBottom: 12 }}>
          Are you sure you want to delete &quot;{selectedSkill?.name_en}&quot;? This action cannot be undone.
        </p>
        {selectedSkill?._count?.expertise && selectedSkill._count.expertise > 0 && (
          <AdminAlertBanner
            severity="warning"
            message={`This skill is assigned to ${selectedSkill._count.expertise} team member(s).`}
          />
        )}
        <div className="flex justify-end gap-2 mt-4 pt-4" style={{ borderTop: '1px solid rgba(214,208,196,0.6)' }}>
          <AdminButton variant="secondary" onClick={() => setIsDeleteOpen(false)}>
            Cancel
          </AdminButton>
          <AdminButton variant="danger" onClick={handleDeleteSkill}>
            Delete
          </AdminButton>
        </div>
      </DialogOverlay>
    </div>
  )
}
