'use client'

import React, { useState } from 'react'
import {
  AdminCard,
  AdminPageHeader,
  AdminSectionLabel,
  AdminStatusBadge,
  AdminButton,
  AdminEmptyState,
  AdminKPICard,
} from '@/components/admin/admin-ui'
import {
  Layers,
  Plus,
  Edit,
  Save,
  Trash2,
  FileText,
  Calendar,
  MapPin,
  Utensils,
  ShoppingBag,
  Camera,
  Music,
  Users,
  Settings,
  Eye,
  EyeOff,
  Tag,
  X,
} from 'lucide-react'
import { getDefaultSiteId, getSiteConfig } from '@/config/sites'

const _siteName = getSiteConfig(getDefaultSiteId())?.name || 'Yalla London'

interface ContentType {
  id: string
  name: string
  slug: string
  description: string
  icon: string
  color: string
  isActive: boolean
  fields: ContentField[]
  seoTemplate: {
    titleTemplate: string
    descriptionTemplate: string
    keywordsTemplate: string
  }
  contentTemplate: string
  articleCount: number
  createdAt: string
  updatedAt: string
}

interface ContentField {
  id: string
  name: string
  type: 'text' | 'textarea' | 'select' | 'number' | 'date' | 'url' | 'boolean'
  label: string
  placeholder?: string
  required: boolean
  options?: string[]
  validation?: {
    minLength?: number
    maxLength?: number
    pattern?: string
  }
}

const iconMap = {
  'FileText': FileText,
  'Calendar': Calendar,
  'MapPin': MapPin,
  'Utensils': Utensils,
  'ShoppingBag': ShoppingBag,
  'Camera': Camera,
  'Music': Music,
  'Users': Users
}

export default function ContentTypesPage() {
  const [contentTypes, setContentTypes] = useState<ContentType[]>([])
  const [selectedType, setSelectedType] = useState<ContentType | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [editedType, setEditedType] = useState<Partial<ContentType>>({})
  const [showPreview, setShowPreview] = useState(false)

  const colorOptions = [
    { value: 'blue', label: 'Blue', class: 'bg-blue-100 text-blue-800' },
    { value: 'green', label: 'Green', class: 'bg-green-100 text-green-800' },
    { value: 'purple', label: 'Purple', class: 'bg-purple-100 text-purple-800' },
    { value: 'orange', label: 'Orange', class: 'bg-orange-100 text-orange-800' },
    { value: 'red', label: 'Red', class: 'bg-red-100 text-red-800' },
    { value: 'yellow', label: 'Yellow', class: 'bg-yellow-100 text-yellow-800' },
    { value: 'pink', label: 'Pink', class: 'bg-pink-100 text-pink-800' },
    { value: 'gray', label: 'Gray', class: 'bg-gray-100 text-gray-800' }
  ]

  const fieldTypes = [
    { value: 'text', label: 'Text Input' },
    { value: 'textarea', label: 'Text Area' },
    { value: 'select', label: 'Select Dropdown' },
    { value: 'number', label: 'Number' },
    { value: 'date', label: 'Date' },
    { value: 'url', label: 'URL' },
    { value: 'boolean', label: 'Yes/No Toggle' }
  ]

  const iconOptions = Object.keys(iconMap)

  const handleCreateType = () => {
    const newType: ContentType = {
      id: Date.now().toString(),
      name: editedType.name || '',
      slug: (editedType.name || '').toLowerCase().replace(/\s+/g, '-'),
      description: editedType.description || '',
      icon: editedType.icon || 'FileText',
      color: editedType.color || 'blue',
      isActive: true,
      fields: editedType.fields || [],
      seoTemplate: editedType.seoTemplate || {
        titleTemplate: `{{title}} - ${_siteName}`,
        descriptionTemplate: '{{description}}',
        keywordsTemplate: '{{keywords}}'
      },
      contentTemplate: editedType.contentTemplate || '# {{title}}\n\n{{content}}',
      articleCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    setContentTypes(prev => [newType, ...prev])
    setEditedType({})
    setIsCreating(false)
  }

  const handleSaveType = () => {
    if (selectedType && editedType) {
      const updatedType = {
        ...selectedType,
        ...editedType,
        slug: (editedType.name || selectedType.name).toLowerCase().replace(/\s+/g, '-'),
        updatedAt: new Date().toISOString()
      }

      setContentTypes(prev => prev.map(type =>
        type.id === selectedType.id ? updatedType : type
      ))
      setSelectedType(updatedType)
      setIsEditing(false)
    }
  }

  const handleDeleteType = (typeId: string) => {
    setContentTypes(prev => prev.filter(type => type.id !== typeId))
    if (selectedType?.id === typeId) {
      setSelectedType(null)
    }
  }

  const handleToggleActive = (typeId: string) => {
    setContentTypes(prev => prev.map(type =>
      type.id === typeId ? { ...type, isActive: !type.isActive } : type
    ))
    if (selectedType?.id === typeId) {
      setSelectedType(prev => prev ? { ...prev, isActive: !prev.isActive } : null)
    }
  }

  const addField = () => {
    const newField: ContentField = {
      id: Date.now().toString(),
      name: '',
      type: 'text',
      label: '',
      required: false
    }

    setEditedType(prev => ({
      ...prev,
      fields: [...(prev.fields || []), newField]
    }))
  }

  const updateField = (fieldId: string, updates: Partial<ContentField>) => {
    setEditedType(prev => ({
      ...prev,
      fields: prev.fields?.map(field =>
        field.id === fieldId ? { ...field, ...updates } : field
      )
    }))
  }

  const removeField = (fieldId: string) => {
    setEditedType(prev => ({
      ...prev,
      fields: prev.fields?.filter(field => field.id !== fieldId)
    }))
  }

  const getColorClass = (color: string) => {
    return colorOptions.find(c => c.value === color)?.class || 'bg-gray-100 text-gray-800'
  }

  const renderIcon = (iconName: string, size = 20) => {
    const IconComponent = iconMap[iconName as keyof typeof iconMap] || FileText
    return <IconComponent size={size} />
  }

  const totalArticles = contentTypes.reduce((sum, t) => sum + t.articleCount, 0)
  const activeCount = contentTypes.filter(t => t.isActive).length

  return (
    <div className="admin-page p-4 md:p-6">
      <AdminPageHeader
        title="Content Types"
        subtitle="Define and manage content type templates"
        action={
          <AdminButton
            variant="primary"
            onClick={() => setIsCreating(true)}
          >
            <Plus size={14} />
            New Type
          </AdminButton>
        }
      />

      {contentTypes.length === 0 ? (
        <AdminEmptyState
          icon={Layers}
          title="No content types configured"
          description="Content type definitions will appear here."
        />
      ) : (
      <>
      {/* KPI Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <AdminKPICard
          value={contentTypes.length}
          label="Total Types"
          color="#3B7EA1"
        />
        <AdminKPICard
          value={activeCount}
          label="Active"
          color="#2D5A3D"
        />
        <AdminKPICard
          value={totalArticles}
          label="Total Articles"
          color="#C49A2A"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Content Types List */}
        <div className="lg:col-span-1">
          <AdminCard>
            <div className="p-4 pb-3" style={{ borderBottom: '1px solid rgba(214,208,196,0.5)' }}>
              <div className="flex items-center gap-2">
                <Layers size={16} color="#3B7EA1" />
                <AdminSectionLabel>Content Types</AdminSectionLabel>
              </div>
            </div>
            <div>
              {contentTypes.map((type) => (
                <div
                  key={type.id}
                  className="p-3 cursor-pointer transition-colors"
                  style={{
                    borderLeft: selectedType?.id === type.id
                      ? '3px solid #C8322B'
                      : '3px solid transparent',
                    backgroundColor: selectedType?.id === type.id
                      ? 'rgba(200,50,43,0.04)'
                      : 'transparent',
                  }}
                  onClick={() => setSelectedType(type)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span style={{ color: '#3B7EA1' }}>{renderIcon(type.icon, 14)}</span>
                        <span
                          style={{
                            fontFamily: 'var(--font-display)',
                            fontWeight: 700,
                            fontSize: 13,
                            color: '#1C1917',
                          }}
                        >
                          {type.name}
                        </span>
                        <span
                          className="inline-flex items-center px-1.5 py-0.5 rounded-full"
                          style={{
                            fontFamily: 'var(--font-system)',
                            fontSize: 9,
                            fontWeight: 700,
                            backgroundColor: 'rgba(196,154,42,0.1)',
                            color: '#7a5a10',
                          }}
                        >
                          {type.articleCount}
                        </span>
                      </div>
                      <p
                        style={{
                          fontFamily: 'var(--font-system)',
                          fontSize: 11,
                          color: '#78716C',
                          marginBottom: 6,
                          lineHeight: 1.4,
                        }}
                      >
                        {type.description}
                      </p>
                      <div className="flex items-center gap-2">
                        <code
                          style={{
                            fontFamily: 'var(--font-system)',
                            fontSize: 9,
                            color: '#78716C',
                            backgroundColor: 'rgba(214,208,196,0.3)',
                            padding: '2px 6px',
                            borderRadius: 4,
                            letterSpacing: '0.3px',
                          }}
                        >
                          {type.slug}
                        </code>
                        <AdminStatusBadge status={type.isActive ? 'active' : 'inactive'} />
                      </div>
                    </div>
                    <div className="flex flex-col gap-0.5 ml-2 flex-shrink-0">
                      <AdminButton
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          // stopPropagation handled by wrapping
                          handleToggleActive(type.id)
                        }}
                      >
                        {type.isActive ? <EyeOff size={12} /> : <Eye size={12} />}
                      </AdminButton>
                      <AdminButton
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedType(type)
                          setEditedType({ ...type })
                          setIsEditing(true)
                        }}
                      >
                        <Edit size={12} />
                      </AdminButton>
                      <AdminButton
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteType(type.id)}
                      >
                        <Trash2 size={12} color="#C8322B" />
                      </AdminButton>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </AdminCard>
        </div>

        {/* Content Type Details */}
        <div className="lg:col-span-2">
          {selectedType ? (
            <div className="space-y-4">
              {/* Overview */}
              <AdminCard accent accentColor="blue">
                <div className="p-4" style={{ borderBottom: '1px solid rgba(214,208,196,0.5)' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{
                          backgroundColor: 'rgba(59,126,161,0.08)',
                          color: '#3B7EA1',
                        }}
                      >
                        {renderIcon(selectedType.icon, 20)}
                      </div>
                      <div>
                        <h2
                          style={{
                            fontFamily: 'var(--font-display)',
                            fontWeight: 800,
                            fontSize: 18,
                            color: '#1C1917',
                            letterSpacing: '-0.2px',
                          }}
                        >
                          {selectedType.name}
                        </h2>
                        <p
                          style={{
                            fontFamily: 'var(--font-system)',
                            fontSize: 11,
                            color: '#78716C',
                            marginTop: 2,
                          }}
                        >
                          {selectedType.description}
                        </p>
                      </div>
                    </div>
                    <AdminButton
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setEditedType({ ...selectedType })
                        setIsEditing(true)
                      }}
                    >
                      <Edit size={12} />
                      Edit
                    </AdminButton>
                  </div>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <span
                        style={{
                          fontFamily: 'var(--font-system)',
                          fontSize: 10,
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                          color: '#A8A29E',
                        }}
                      >
                        Slug
                      </span>
                      <div className="mt-1">
                        <code
                          style={{
                            fontFamily: 'var(--font-system)',
                            fontSize: 11,
                            color: '#44403C',
                            backgroundColor: 'rgba(214,208,196,0.3)',
                            padding: '3px 8px',
                            borderRadius: 4,
                          }}
                        >
                          {selectedType.slug}
                        </code>
                      </div>
                    </div>
                    <div>
                      <span
                        style={{
                          fontFamily: 'var(--font-system)',
                          fontSize: 10,
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                          color: '#A8A29E',
                        }}
                      >
                        Articles
                      </span>
                      <div
                        className="mt-1"
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontWeight: 800,
                          fontSize: 18,
                          color: '#C49A2A',
                        }}
                      >
                        {selectedType.articleCount}
                      </div>
                    </div>
                    <div>
                      <span
                        style={{
                          fontFamily: 'var(--font-system)',
                          fontSize: 10,
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                          color: '#A8A29E',
                        }}
                      >
                        Status
                      </span>
                      <div className="mt-1">
                        <AdminStatusBadge status={selectedType.isActive ? 'active' : 'inactive'} />
                      </div>
                    </div>
                  </div>
                </div>
              </AdminCard>

              {/* Fields */}
              <AdminCard>
                <div className="p-4 pb-3" style={{ borderBottom: '1px solid rgba(214,208,196,0.5)' }}>
                  <div className="flex items-center gap-2">
                    <Tag size={14} color="#C49A2A" />
                    <AdminSectionLabel>Custom Fields</AdminSectionLabel>
                  </div>
                </div>
                <div className="p-4">
                  {selectedType.fields.length > 0 ? (
                    <div className="space-y-2">
                      {selectedType.fields.map((field) => (
                        <div
                          key={field.id}
                          className="admin-card-inset rounded-lg p-3"
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span
                                style={{
                                  fontFamily: 'var(--font-display)',
                                  fontWeight: 700,
                                  fontSize: 12,
                                  color: '#1C1917',
                                }}
                              >
                                {field.label}
                              </span>
                              <AdminStatusBadge status="pending" label={field.type} />
                              {field.required && (
                                <AdminStatusBadge status="stuck" label="Required" />
                              )}
                            </div>
                            <code
                              style={{
                                fontFamily: 'var(--font-system)',
                                fontSize: 10,
                                color: '#78716C',
                                backgroundColor: 'rgba(214,208,196,0.3)',
                                padding: '2px 6px',
                                borderRadius: 4,
                              }}
                            >
                              {`{{${field.name}}}`}
                            </code>
                          </div>
                          {field.placeholder && (
                            <p
                              style={{
                                fontFamily: 'var(--font-system)',
                                fontSize: 10,
                                color: '#A8A29E',
                                marginBottom: 2,
                              }}
                            >
                              Placeholder: {field.placeholder}
                            </p>
                          )}
                          {field.options && (
                            <p
                              style={{
                                fontFamily: 'var(--font-system)',
                                fontSize: 10,
                                color: '#A8A29E',
                              }}
                            >
                              Options: {field.options.join(', ')}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <AdminEmptyState
                      icon={Tag}
                      title="No Custom Fields"
                      description="No custom fields defined for this content type."
                    />
                  )}
                </div>
              </AdminCard>

              {/* SEO Template */}
              <AdminCard>
                <div className="p-4 pb-3" style={{ borderBottom: '1px solid rgba(214,208,196,0.5)' }}>
                  <div className="flex items-center gap-2">
                    <Settings size={14} color="#2D5A3D" />
                    <AdminSectionLabel>SEO Templates</AdminSectionLabel>
                  </div>
                </div>
                <div className="p-4 space-y-4">
                  {[
                    { label: 'Title Template', value: selectedType.seoTemplate.titleTemplate },
                    { label: 'Description Template', value: selectedType.seoTemplate.descriptionTemplate },
                    { label: 'Keywords Template', value: selectedType.seoTemplate.keywordsTemplate },
                  ].map((item) => (
                    <div key={item.label}>
                      <p
                        style={{
                          fontFamily: 'var(--font-system)',
                          fontSize: 10,
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                          color: '#A8A29E',
                          marginBottom: 6,
                        }}
                      >
                        {item.label}
                      </p>
                      <div
                        className="admin-card-inset rounded-lg p-3"
                        style={{
                          fontFamily: 'var(--font-system)',
                          fontSize: 11,
                          color: '#44403C',
                          lineHeight: 1.5,
                        }}
                      >
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>
              </AdminCard>

              {/* Content Template */}
              <AdminCard>
                <div className="p-4 pb-3" style={{ borderBottom: '1px solid rgba(214,208,196,0.5)' }}>
                  <div className="flex items-center gap-2">
                    <FileText size={14} color="#C8322B" />
                    <AdminSectionLabel>Content Template</AdminSectionLabel>
                  </div>
                </div>
                <div className="p-4">
                  <div className="admin-card-inset rounded-lg p-4">
                    <pre
                      style={{
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'var(--font-system)',
                        fontSize: 11,
                        color: '#44403C',
                        lineHeight: 1.6,
                        margin: 0,
                      }}
                    >
                      {selectedType.contentTemplate}
                    </pre>
                  </div>
                </div>
              </AdminCard>
            </div>
          ) : (
            <AdminCard>
              <AdminEmptyState
                icon={Layers}
                title="Select a Content Type"
                description="Choose a content type from the list to view and manage its configuration."
              />
            </AdminCard>
          )}
        </div>
      </div>
      </>
      )}

      {/* Edit/Create Modal */}
      {(isEditing || isCreating) && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ backgroundColor: 'rgba(28,25,23,0.4)', backdropFilter: 'blur(2px)' }}
        >
          <div
            className="w-full max-w-5xl max-h-[90vh] overflow-y-auto mx-4 rounded-2xl"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid rgba(214,208,196,0.6)',
              boxShadow: '0 20px 60px rgba(28,25,23,0.15)',
            }}
          >
            {/* Modal Header */}
            <div
              className="p-4 flex items-center justify-between sticky top-0 z-10"
              style={{
                backgroundColor: '#FFFFFF',
                borderBottom: '1px solid rgba(214,208,196,0.5)',
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
              }}
            >
              <div className="flex items-center gap-2">
                {isCreating ? <Plus size={16} color="#C8322B" /> : <Edit size={16} color="#3B7EA1" />}
                <h2
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 800,
                    fontSize: 18,
                    color: '#1C1917',
                  }}
                >
                  {isCreating ? 'Create New Content Type' : 'Edit Content Type'}
                </h2>
              </div>
              <button
                onClick={() => {
                  setIsEditing(false)
                  setIsCreating(false)
                  setEditedType({})
                }}
                className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors"
                style={{ color: '#78716C' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 md:p-6 space-y-6">
              {/* Basic Info */}
              <div>
                <AdminSectionLabel>Basic Information</AdminSectionLabel>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      style={{
                        fontFamily: 'var(--font-system)',
                        fontSize: 11,
                        fontWeight: 600,
                        color: '#44403C',
                        display: 'block',
                        marginBottom: 6,
                      }}
                    >
                      Name
                    </label>
                    <input
                      className="admin-input"
                      value={editedType.name || ''}
                      onChange={(e) => setEditedType(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Content type name..."
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        fontFamily: 'var(--font-system)',
                        fontSize: 11,
                        fontWeight: 600,
                        color: '#44403C',
                        display: 'block',
                        marginBottom: 6,
                      }}
                    >
                      Icon
                    </label>
                    <select
                      className="admin-select"
                      value={editedType.icon || 'FileText'}
                      onChange={(e) => setEditedType(prev => ({ ...prev, icon: e.target.value }))}
                    >
                      {iconOptions.map(icon => (
                        <option key={icon} value={icon}>{icon}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    style={{
                      fontFamily: 'var(--font-system)',
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#44403C',
                      display: 'block',
                      marginBottom: 6,
                    }}
                  >
                    Description
                  </label>
                  <textarea
                    className="admin-input"
                    value={editedType.description || ''}
                    onChange={(e) => setEditedType(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of this content type..."
                    rows={2}
                    style={{ resize: 'vertical' }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      fontFamily: 'var(--font-system)',
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#44403C',
                      display: 'block',
                      marginBottom: 6,
                    }}
                  >
                    Color
                  </label>
                  <select
                    className="admin-select"
                    value={editedType.color || 'blue'}
                    onChange={(e) => setEditedType(prev => ({ ...prev, color: e.target.value }))}
                  >
                    {colorOptions.map(color => (
                      <option key={color.value} value={color.value}>{color.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Custom Fields */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <AdminSectionLabel>Custom Fields</AdminSectionLabel>
                  <AdminButton onClick={addField} size="sm" variant="secondary">
                    <Plus size={12} />
                    Add Field
                  </AdminButton>
                </div>

                <div className="space-y-3">
                  {editedType.fields?.map((field, index) => (
                    <div
                      key={field.id}
                      className="admin-card-inset rounded-xl p-4"
                    >
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                        <div>
                          <label
                            style={{
                              fontFamily: 'var(--font-system)',
                              fontSize: 10,
                              fontWeight: 600,
                              color: '#78716C',
                              display: 'block',
                              marginBottom: 4,
                            }}
                          >
                            Field Name
                          </label>
                          <input
                            className="admin-input"
                            value={field.name}
                            onChange={(e) => updateField(field.id, { name: e.target.value })}
                            placeholder="fieldName"
                          />
                        </div>

                        <div>
                          <label
                            style={{
                              fontFamily: 'var(--font-system)',
                              fontSize: 10,
                              fontWeight: 600,
                              color: '#78716C',
                              display: 'block',
                              marginBottom: 4,
                            }}
                          >
                            Label
                          </label>
                          <input
                            className="admin-input"
                            value={field.label}
                            onChange={(e) => updateField(field.id, { label: e.target.value })}
                            placeholder="Display Label"
                          />
                        </div>

                        <div>
                          <label
                            style={{
                              fontFamily: 'var(--font-system)',
                              fontSize: 10,
                              fontWeight: 600,
                              color: '#78716C',
                              display: 'block',
                              marginBottom: 4,
                            }}
                          >
                            Type
                          </label>
                          <select
                            className="admin-select"
                            value={field.type}
                            onChange={(e) => updateField(field.id, { type: e.target.value as ContentField['type'] })}
                          >
                            {fieldTypes.map(type => (
                              <option key={type.value} value={type.value}>{type.label}</option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-end gap-2">
                          <label className="flex items-center gap-2 cursor-pointer flex-1">
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={(e) => updateField(field.id, { required: e.target.checked })}
                              className="rounded"
                              style={{ accentColor: '#C8322B' }}
                            />
                            <span
                              style={{
                                fontFamily: 'var(--font-system)',
                                fontSize: 11,
                                color: '#44403C',
                              }}
                            >
                              Required
                            </span>
                          </label>
                          <AdminButton
                            variant="ghost"
                            size="sm"
                            onClick={() => removeField(field.id)}
                          >
                            <Trash2 size={12} color="#C8322B" />
                          </AdminButton>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label
                            style={{
                              fontFamily: 'var(--font-system)',
                              fontSize: 10,
                              fontWeight: 600,
                              color: '#78716C',
                              display: 'block',
                              marginBottom: 4,
                            }}
                          >
                            Placeholder
                          </label>
                          <input
                            className="admin-input"
                            value={field.placeholder || ''}
                            onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                            placeholder="Placeholder text..."
                          />
                        </div>

                        {field.type === 'select' && (
                          <div>
                            <label
                              style={{
                                fontFamily: 'var(--font-system)',
                                fontSize: 10,
                                fontWeight: 600,
                                color: '#78716C',
                                display: 'block',
                                marginBottom: 4,
                              }}
                            >
                              Options (comma-separated)
                            </label>
                            <input
                              className="admin-input"
                              value={field.options?.join(', ') || ''}
                              onChange={(e) => updateField(field.id, {
                                options: e.target.value.split(',').map(o => o.trim()).filter(Boolean)
                              })}
                              placeholder="Option 1, Option 2, Option 3..."
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Content Template */}
              <div>
                <AdminSectionLabel>Content Template</AdminSectionLabel>
                <textarea
                  className="admin-input"
                  value={editedType.contentTemplate || ''}
                  onChange={(e) => setEditedType(prev => ({ ...prev, contentTemplate: e.target.value }))}
                  placeholder="Content template with {{variables}}..."
                  rows={8}
                  style={{
                    fontFamily: 'var(--font-system)',
                    fontSize: 11,
                    resize: 'vertical',
                    lineHeight: 1.6,
                  }}
                />
              </div>

              {/* Actions */}
              <div
                className="flex justify-end gap-2 pt-4"
                style={{ borderTop: '1px solid rgba(214,208,196,0.5)' }}
              >
                <AdminButton
                  variant="secondary"
                  onClick={() => {
                    setIsEditing(false)
                    setIsCreating(false)
                    setEditedType({})
                  }}
                >
                  Cancel
                </AdminButton>
                <AdminButton
                  variant={isCreating ? 'primary' : 'success'}
                  onClick={isCreating ? handleCreateType : handleSaveType}
                  disabled={!editedType.name}
                >
                  <Save size={12} />
                  {isCreating ? 'Create' : 'Save'} Content Type
                </AdminButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
