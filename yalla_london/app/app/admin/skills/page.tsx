'use client'

import { useState, useEffect } from 'react'
import { PremiumAdminLayout } from '@/components/admin/premium-admin-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Sparkles,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
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
  CheckCircle,
  XCircle,
  MoreVertical,
  RefreshCw,
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
  { value: 'ENGINEERING', label: 'Engineering', icon: <Code className="h-4 w-4" />, color: 'bg-blue-500' },
  { value: 'AI_ML', label: 'AI & ML', icon: <Brain className="h-4 w-4" />, color: 'bg-purple-500' },
  { value: 'DESIGN', label: 'Design', icon: <Palette className="h-4 w-4" />, color: 'bg-pink-500' },
  { value: 'DATA', label: 'Data', icon: <BarChart3 className="h-4 w-4" />, color: 'bg-green-500' },
  { value: 'CONTENT', label: 'Content', icon: <PenTool className="h-4 w-4" />, color: 'bg-orange-500' },
  { value: 'MARKETING', label: 'Marketing', icon: <Megaphone className="h-4 w-4" />, color: 'bg-yellow-500' },
  { value: 'PSYCHOLOGY', label: 'Psychology', icon: <Heart className="h-4 w-4" />, color: 'bg-red-500' },
  { value: 'BUSINESS', label: 'Business', icon: <Briefcase className="h-4 w-4" />, color: 'bg-slate-500' },
  { value: 'TRAVEL', label: 'Travel', icon: <Plane className="h-4 w-4" />, color: 'bg-cyan-500' },
]

const getCategoryInfo = (category: SkillCategory) => {
  return SKILL_CATEGORIES.find(c => c.value === category) || SKILL_CATEGORIES[0]
}

export default function SkillsManagementPage() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<SkillCategory | 'all'>('all')
  const [activeTab, setActiveTab] = useState<SkillCategory | 'all'>('all')

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

  const fetchSkills = async () => {
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
  }

  useEffect(() => {
    fetchSkills()
  }, [categoryFilter])

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
  const filteredSkills = skills.filter(skill => {
    const matchesSearch =
      skill.name_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (skill.name_ar && skill.name_ar.includes(searchQuery))

    const matchesCategory = activeTab === 'all' || skill.category === activeTab

    return matchesSearch && matchesCategory
  })

  // Group skills by category for stats
  const categoryStats = SKILL_CATEGORIES.map(cat => ({
    ...cat,
    count: skills.filter(s => s.category === cat.value).length,
    activeCount: skills.filter(s => s.category === cat.value && s.is_active).length,
  }))

  return (
    <PremiumAdminLayout
      title="Skills Management"
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Team', href: '/admin/team' },
        { label: 'Skills' },
      ]}
      actions={
        <Button onClick={() => setIsCreateOpen(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Skill
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Total Skills</p>
                  <p className="text-2xl font-bold">{skills.length}</p>
                </div>
                <Sparkles className="h-8 w-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Active</p>
                  <p className="text-2xl font-bold">{skills.filter(s => s.is_active).length}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Categories</p>
                  <p className="text-2xl font-bold">9</p>
                </div>
                <Filter className="h-8 w-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm">Team Using</p>
                  <p className="text-2xl font-bold">
                    {skills.reduce((acc, s) => acc + (s._count?.expertise || 0), 0)}
                  </p>
                </div>
                <Users className="h-8 w-8 text-orange-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-sm">Inactive</p>
                  <p className="text-2xl font-bold">{skills.filter(s => !s.is_active).length}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search skills..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button variant="outline" onClick={fetchSkills}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Category Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SkillCategory | 'all')}>
          <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent">
            <TabsTrigger
              value="all"
              className="data-[state=active]:bg-gray-900 data-[state=active]:text-white"
            >
              All ({skills.length})
            </TabsTrigger>
            {categoryStats.map((cat) => (
              <TabsTrigger
                key={cat.value}
                value={cat.value}
                className="data-[state=active]:bg-gray-900 data-[state=active]:text-white flex items-center gap-2"
              >
                {cat.icon}
                {cat.label} ({cat.count})
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>
                    {activeTab === 'all' ? 'All Skills' : getCategoryInfo(activeTab as SkillCategory).label}
                  </span>
                  <Badge variant="outline">{filteredSkills.length} skills</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : filteredSkills.length === 0 ? (
                  <div className="text-center py-12">
                    <Sparkles className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">No skills found</h3>
                    <p className="mt-2 text-gray-500">
                      {searchQuery ? 'Try adjusting your search.' : 'Get started by adding your first skill.'}
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Skill</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Arabic Name</TableHead>
                        <TableHead className="text-center">Team Members</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSkills.map((skill) => {
                        const catInfo = getCategoryInfo(skill.category)
                        return (
                          <TableRow key={skill.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {skill.icon && (
                                  <span className="text-xl">{skill.icon}</span>
                                )}
                                <div>
                                  <div className="font-medium">{skill.name_en}</div>
                                  <div className="text-sm text-gray-500">{skill.slug}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={`${catInfo.color} text-white`}>
                                <span className="mr-1">{catInfo.icon}</span>
                                {catInfo.label}
                              </Badge>
                            </TableCell>
                            <TableCell dir="rtl" className="font-arabic">
                              {skill.name_ar || '-'}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline">
                                {skill._count?.expertise || 0}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleActive(skill)}
                              >
                                {skill.is_active ? (
                                  <Badge className="bg-green-500 text-white">Active</Badge>
                                ) : (
                                  <Badge variant="secondary">Inactive</Badge>
                                )}
                              </Button>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditDialog(skill)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-500 hover:text-red-700"
                                  onClick={() => {
                                    setSelectedSkill(skill)
                                    setIsDeleteOpen(true)
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Category Overview Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {categoryStats.map((cat) => (
            <Card key={cat.value} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg ${cat.color} text-white`}>
                    {cat.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{cat.label}</h4>
                    <p className="text-sm text-gray-500">
                      {cat.activeCount} active / {cat.count} total
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab(cat.value)}
                  >
                    View
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Create Skill Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Skill</DialogTitle>
            <DialogDescription>
              Add a new skill to the system. Skills can be assigned to team members.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name_en">Name (English) *</Label>
                <Input
                  id="name_en"
                  value={formData.name_en}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      name_en: e.target.value,
                      slug: generateSlug(e.target.value),
                    })
                  }}
                  placeholder="e.g., Full-Stack Development"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name_ar">Name (Arabic)</Label>
                <Input
                  id="name_ar"
                  dir="rtl"
                  value={formData.name_ar}
                  onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                  placeholder="e.g., التطوير المتكامل"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="full-stack-development"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData({ ...formData, category: v as SkillCategory })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SKILL_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        <div className="flex items-center gap-2">
                          {cat.icon}
                          {cat.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="icon">Icon (Emoji)</Label>
                <Input
                  id="icon"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="e.g., 💻"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="color"
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-16 h-10 p-1"
                  />
                  <Input
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="flex-1"
                    placeholder="#3B82F6"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description_en">Description (English)</Label>
              <Textarea
                id="description_en"
                value={formData.description_en}
                onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                placeholder="Brief description of this skill..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description_ar">Description (Arabic)</Label>
              <Textarea
                id="description_ar"
                dir="rtl"
                value={formData.description_ar}
                onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
                placeholder="وصف مختصر لهذه المهارة..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="display_order">Display Order</Label>
                <Input
                  id="display_order"
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSkill} disabled={!formData.name_en || !formData.slug}>
              Create Skill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Skill Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Skill</DialogTitle>
            <DialogDescription>
              Update the skill details.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_name_en">Name (English) *</Label>
                <Input
                  id="edit_name_en"
                  value={formData.name_en}
                  onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_name_ar">Name (Arabic)</Label>
                <Input
                  id="edit_name_ar"
                  dir="rtl"
                  value={formData.name_ar}
                  onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_slug">Slug *</Label>
                <Input
                  id="edit_slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData({ ...formData, category: v as SkillCategory })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SKILL_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        <div className="flex items-center gap-2">
                          {cat.icon}
                          {cat.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_icon">Icon (Emoji)</Label>
                <Input
                  id="edit_icon"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_color">Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="edit_color"
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-16 h-10 p-1"
                  />
                  <Input
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_description_en">Description (English)</Label>
              <Textarea
                id="edit_description_en"
                value={formData.description_en}
                onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_description_ar">Description (Arabic)</Label>
              <Textarea
                id="edit_description_ar"
                dir="rtl"
                value={formData.description_ar}
                onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_display_order">Display Order</Label>
                <Input
                  id="edit_display_order"
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="edit_is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="edit_is_active">Active</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateSkill} disabled={!formData.name_en || !formData.slug}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Skill</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedSkill?.name_en}"? This action cannot be undone.
              {selectedSkill?._count?.expertise && selectedSkill._count.expertise > 0 && (
                <span className="block mt-2 text-red-500">
                  Warning: This skill is assigned to {selectedSkill._count.expertise} team member(s).
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteSkill}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PremiumAdminLayout>
  )
}
