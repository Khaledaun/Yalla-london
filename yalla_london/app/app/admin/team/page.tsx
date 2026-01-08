'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Search,
  Star,
  CheckCircle,
  XCircle,
  Eye,
  Sparkles,
  Linkedin,
  Twitter,
  Instagram,
  Globe,
  Mail,
  RefreshCw,
  UserPlus,
  Award,
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
  { value: 'LEARNING', label: 'Learning', color: 'bg-yellow-500' },
  { value: 'PROFICIENT', label: 'Proficient', color: 'bg-blue-500' },
  { value: 'EXPERT', label: 'Expert', color: 'bg-green-500' },
  { value: 'THOUGHT_LEADER', label: 'Thought Leader', color: 'bg-purple-500' },
]

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
        // Refresh the selected member
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
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
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

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your team members and their profiles</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/skills">
            <Button variant="outline">
              <Sparkles className="h-4 w-4 mr-2" />
              Manage Skills
            </Button>
          </Link>
          <Button onClick={() => setIsCreateOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <UserPlus className="h-4 w-4 mr-2" />
            Add Member
          </Button>
        </div>
      </div>
      <div className="space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Total Members</p>
                  <p className="text-2xl font-bold">{members.length}</p>
                </div>
                <Users className="h-8 w-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Active</p>
                  <p className="text-2xl font-bold">{members.filter((m) => m.is_active).length}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100 text-sm">Featured</p>
                  <p className="text-2xl font-bold">{members.filter((m) => m.is_featured).length}</p>
                </div>
                <Star className="h-8 w-8 text-yellow-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Total Skills</p>
                  <p className="text-2xl font-bold">
                    {members.reduce((acc, m) => acc + (m.expertise?.length || 0), 0)}
                  </p>
                </div>
                <Award className="h-8 w-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Tabs */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search team members..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button variant="outline" onClick={fetchMembers}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Team Members Table */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All ({members.length})</TabsTrigger>
            <TabsTrigger value="active">Active ({members.filter((m) => m.is_active).length})</TabsTrigger>
            <TabsTrigger value="featured">Featured ({members.filter((m) => m.is_featured).length})</TabsTrigger>
            <TabsTrigger value="inactive">Inactive ({members.filter((m) => !m.is_active).length})</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : filteredMembers.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">No team members found</h3>
                    <p className="mt-2 text-gray-500">
                      {searchQuery ? 'Try adjusting your search.' : 'Get started by adding your first team member.'}
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Skills</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-center">Featured</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMembers.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src={member.avatar_url || undefined} />
                                <AvatarFallback>{getInitials(member.name_en)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{member.name_en}</div>
                                {member.name_ar && (
                                  <div className="text-sm text-gray-500" dir="rtl">
                                    {member.name_ar}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{member.title_en}</div>
                            {member.title_ar && (
                              <div className="text-xs text-gray-500" dir="rtl">
                                {member.title_ar}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {member.expertise?.slice(0, 3).map((exp) => (
                                <Badge
                                  key={exp.id}
                                  variant={exp.is_primary ? 'default' : 'outline'}
                                  className="text-xs"
                                >
                                  {exp.skill.icon && <span className="mr-1">{exp.skill.icon}</span>}
                                  {exp.skill.name_en}
                                </Badge>
                              ))}
                              {member.expertise && member.expertise.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{member.expertise.length - 3} more
                                </Badge>
                              )}
                              {(!member.expertise || member.expertise.length === 0) && (
                                <span className="text-gray-400 text-sm">No skills</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button variant="ghost" size="sm" onClick={() => handleToggleActive(member)}>
                              {member.is_active ? (
                                <Badge className="bg-green-500">Active</Badge>
                              ) : (
                                <Badge variant="secondary">Inactive</Badge>
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button variant="ghost" size="sm" onClick={() => handleToggleFeatured(member)}>
                              <Star
                                className={`h-5 w-5 ${
                                  member.is_featured ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'
                                }`}
                              />
                            </Button>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openExpertiseDialog(member)}>
                                <Sparkles className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => openEditDialog(member)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-700"
                                onClick={() => {
                                  setSelectedMember(member)
                                  setIsDeleteOpen(true)
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Team Grid View */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.slice(0, 6).map((member) => (
            <Card key={member.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={member.avatar_url || undefined} />
                    <AvatarFallback className="text-lg">{getInitials(member.name_en)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{member.name_en}</h3>
                      {member.is_featured && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                    </div>
                    <p className="text-sm text-gray-600 truncate">{member.title_en}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {member.expertise?.slice(0, 2).map((exp) => (
                        <Badge key={exp.id} variant="outline" className="text-xs">
                          {exp.skill.icon} {exp.skill.name_en}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Social Links */}
                <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                  {member.linkedin_url && (
                    <a
                      href={member.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-blue-600"
                    >
                      <Linkedin className="h-4 w-4" />
                    </a>
                  )}
                  {member.twitter_url && (
                    <a
                      href={member.twitter_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-sky-500"
                    >
                      <Twitter className="h-4 w-4" />
                    </a>
                  )}
                  {member.instagram_url && (
                    <a
                      href={member.instagram_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-pink-500"
                    >
                      <Instagram className="h-4 w-4" />
                    </a>
                  )}
                  {member.website_url && (
                    <a
                      href={member.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <Globe className="h-4 w-4" />
                    </a>
                  )}
                  {member.email_public && (
                    <a
                      href={`mailto:${member.email_public}`}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <Mail className="h-4 w-4" />
                    </a>
                  )}
                  <div className="flex-1" />
                  <Button variant="outline" size="sm" onClick={() => openEditDialog(member)}>
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Create Member Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>Add a new member to your team.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Basic Info */}
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
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name_ar">Name (Arabic)</Label>
                <Input
                  id="name_ar"
                  dir="rtl"
                  value={formData.name_ar}
                  onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                  placeholder="جون دو"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title_en">Title (English) *</Label>
                <Input
                  id="title_en"
                  value={formData.title_en}
                  onChange={(e) => setFormData({ ...formData, title_en: e.target.value })}
                  placeholder="Senior Developer"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title_ar">Title (Arabic)</Label>
                <Input
                  id="title_ar"
                  dir="rtl"
                  value={formData.title_ar}
                  onChange={(e) => setFormData({ ...formData, title_ar: e.target.value })}
                  placeholder="مطور أول"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="john-doe"
              />
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio_en">Bio (English) *</Label>
              <Textarea
                id="bio_en"
                value={formData.bio_en}
                onChange={(e) => setFormData({ ...formData, bio_en: e.target.value })}
                placeholder="Write a brief bio..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio_ar">Bio (Arabic)</Label>
              <Textarea
                id="bio_ar"
                dir="rtl"
                value={formData.bio_ar}
                onChange={(e) => setFormData({ ...formData, bio_ar: e.target.value })}
                placeholder="اكتب نبذة مختصرة..."
                rows={3}
              />
            </div>

            {/* Images */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="avatar_url">Avatar URL</Label>
                <Input
                  id="avatar_url"
                  value={formData.avatar_url}
                  onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cover_image_url">Cover Image URL</Label>
                <Input
                  id="cover_image_url"
                  value={formData.cover_image_url}
                  onChange={(e) => setFormData({ ...formData, cover_image_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>

            {/* Contact & Social */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email_public">Public Email</Label>
                <Input
                  id="email_public"
                  type="email"
                  value={formData.email_public}
                  onChange={(e) => setFormData({ ...formData, email_public: e.target.value })}
                  placeholder="john@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website_url">Website</Label>
                <Input
                  id="website_url"
                  value={formData.website_url}
                  onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="linkedin_url">LinkedIn</Label>
                <Input
                  id="linkedin_url"
                  value={formData.linkedin_url}
                  onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                  placeholder="https://linkedin.com/in/..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="twitter_url">Twitter</Label>
                <Input
                  id="twitter_url"
                  value={formData.twitter_url}
                  onChange={(e) => setFormData({ ...formData, twitter_url: e.target.value })}
                  placeholder="https://twitter.com/..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagram_url">Instagram</Label>
                <Input
                  id="instagram_url"
                  value={formData.instagram_url}
                  onChange={(e) => setFormData({ ...formData, instagram_url: e.target.value })}
                  placeholder="https://instagram.com/..."
                />
              </div>
            </div>

            {/* Settings */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_featured"
                  checked={formData.is_featured}
                  onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="is_featured">Featured</Label>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="display_order">Order</Label>
                <Input
                  id="display_order"
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                  className="w-20"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateMember}
              disabled={!formData.name_en || !formData.title_en || !formData.bio_en}
            >
              Create Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Member Dialog - Same structure as Create */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
            <DialogDescription>Update the team member&apos;s details.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Same form fields as Create */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name (English) *</Label>
                <Input
                  value={formData.name_en}
                  onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Name (Arabic)</Label>
                <Input
                  dir="rtl"
                  value={formData.name_ar}
                  onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title (English) *</Label>
                <Input
                  value={formData.title_en}
                  onChange={(e) => setFormData({ ...formData, title_en: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Title (Arabic)</Label>
                <Input
                  dir="rtl"
                  value={formData.title_ar}
                  onChange={(e) => setFormData({ ...formData, title_ar: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Slug *</Label>
              <Input
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Bio (English) *</Label>
              <Textarea
                value={formData.bio_en}
                onChange={(e) => setFormData({ ...formData, bio_en: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Bio (Arabic)</Label>
              <Textarea
                dir="rtl"
                value={formData.bio_ar}
                onChange={(e) => setFormData({ ...formData, bio_ar: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Avatar URL</Label>
                <Input
                  value={formData.avatar_url}
                  onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Cover Image URL</Label>
                <Input
                  value={formData.cover_image_url}
                  onChange={(e) => setFormData({ ...formData, cover_image_url: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Public Email</Label>
                <Input
                  type="email"
                  value={formData.email_public}
                  onChange={(e) => setFormData({ ...formData, email_public: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Website</Label>
                <Input
                  value={formData.website_url}
                  onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>LinkedIn</Label>
                <Input
                  value={formData.linkedin_url}
                  onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Twitter</Label>
                <Input
                  value={formData.twitter_url}
                  onChange={(e) => setFormData({ ...formData, twitter_url: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Instagram</Label>
                <Input
                  value={formData.instagram_url}
                  onChange={(e) => setFormData({ ...formData, instagram_url: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit_is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="edit_is_active">Active</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit_is_featured"
                  checked={formData.is_featured}
                  onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="edit_is_featured">Featured</Label>
              </div>
              <div className="flex items-center gap-2">
                <Label>Order</Label>
                <Input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                  className="w-20"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateMember}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Expertise Management Dialog */}
      <Dialog open={isExpertiseOpen} onOpenChange={setIsExpertiseOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Skills - {selectedMember?.name_en}</DialogTitle>
            <DialogDescription>Add or remove skills for this team member.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Current Skills */}
            <div>
              <Label className="text-sm font-medium">Current Skills</Label>
              <div className="mt-2 space-y-2">
                {selectedMember?.expertise && selectedMember.expertise.length > 0 ? (
                  selectedMember.expertise.map((exp) => (
                    <div
                      key={exp.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {exp.skill.icon && <span className="text-xl">{exp.skill.icon}</span>}
                        <div>
                          <div className="font-medium">{exp.skill.name_en}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              className={
                                PROFICIENCY_LEVELS.find((p) => p.value === exp.proficiency)?.color
                              }
                            >
                              {PROFICIENCY_LEVELS.find((p) => p.value === exp.proficiency)?.label}
                            </Badge>
                            {exp.is_primary && (
                              <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                                <Star className="h-3 w-3 mr-1" />
                                Primary
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500"
                        onClick={() => handleRemoveExpertise(exp.skill.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">No skills assigned yet.</p>
                )}
              </div>
            </div>

            {/* Add New Skill */}
            <div className="border-t pt-4">
              <Label className="text-sm font-medium">Add New Skill</Label>
              <div className="grid grid-cols-3 gap-4 mt-2">
                <div className="col-span-1">
                  <Select
                    value={expertiseForm.skill_id}
                    onValueChange={(v) => setExpertiseForm({ ...expertiseForm, skill_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select skill" />
                    </SelectTrigger>
                    <SelectContent>
                      {skills
                        .filter(
                          (s) => !selectedMember?.expertise?.some((e) => e.skill.id === s.id)
                        )
                        .map((skill) => (
                          <SelectItem key={skill.id} value={skill.id}>
                            {skill.icon} {skill.name_en}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-1">
                  <Select
                    value={expertiseForm.proficiency}
                    onValueChange={(v) => setExpertiseForm({ ...expertiseForm, proficiency: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROFICIENCY_LEVELS.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_primary_skill"
                    checked={expertiseForm.is_primary}
                    onChange={(e) =>
                      setExpertiseForm({ ...expertiseForm, is_primary: e.target.checked })
                    }
                    className="h-4 w-4"
                  />
                  <Label htmlFor="is_primary_skill" className="text-sm">
                    Primary
                  </Label>
                </div>
              </div>
              <Button
                className="mt-4"
                onClick={handleAddExpertise}
                disabled={!expertiseForm.skill_id}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Skill
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExpertiseOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Team Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{selectedMember?.name_en}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteMember}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
