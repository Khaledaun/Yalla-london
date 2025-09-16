'use client'

import React, { useState, useEffect } from 'react'
import { PremiumAdminLayout } from '@/src/components/admin/premium-admin-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
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
  CheckCircle2,
  AlertTriangle,
  Tag
} from 'lucide-react'

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

const mockContentTypes: ContentType[] = [
  {
    id: '1',
    name: 'Travel Guide',
    slug: 'travel-guide',
    description: 'Comprehensive travel guides for London areas and attractions',
    icon: 'MapPin',
    color: 'blue',
    isActive: true,
    fields: [
      {
        id: 'f1',
        name: 'location',
        type: 'text',
        label: 'Location',
        placeholder: 'e.g., Covent Garden, London',
        required: true,
        validation: { minLength: 5, maxLength: 100 }
      },
      {
        id: 'f2',
        name: 'bestTimeToVisit',
        type: 'select',
        label: 'Best Time to Visit',
        required: false,
        options: ['Morning', 'Afternoon', 'Evening', 'Weekend', 'Weekday', 'Any time']
      },
      {
        id: 'f3',
        name: 'priceRange',
        type: 'select',
        label: 'Price Range',
        required: false,
        options: ['Free', '£', '££', '£££', '££££']
      },
      {
        id: 'f4',
        name: 'duration',
        type: 'text',
        label: 'Recommended Duration',
        placeholder: 'e.g., 2-3 hours',
        required: false
      }
    ],
    seoTemplate: {
      titleTemplate: 'Ultimate Guide to {{location}} - Yalla London',
      descriptionTemplate: 'Discover the best of {{location}} with our comprehensive guide. Find top attractions, hidden gems, and local tips for your London adventure.',
      keywordsTemplate: '{{location}}, London guide, travel, attractions, things to do'
    },
    contentTemplate: `# Ultimate Guide to {{location}}

## Overview
{{location}} is one of London's most captivating destinations, offering a perfect blend of history, culture, and modern attractions.

## Best Time to Visit
{{bestTimeToVisit}}

## What to Expect
- Price Range: {{priceRange}}
- Recommended Duration: {{duration}}

## Top Attractions
[To be filled with specific attractions]

## Local Tips
[To be filled with insider knowledge]

## Getting There
[To be filled with transport information]`,
    articleCount: 23,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-10T00:00:00Z'
  },
  {
    id: '2',
    name: 'Restaurant Review',
    slug: 'restaurant-review',
    description: 'Detailed reviews of London restaurants, focusing on halal options',
    icon: 'Utensils',
    color: 'green',
    isActive: true,
    fields: [
      {
        id: 'r1',
        name: 'restaurantName',
        type: 'text',
        label: 'Restaurant Name',
        required: true,
        validation: { minLength: 2, maxLength: 100 }
      },
      {
        id: 'r2',
        name: 'cuisine',
        type: 'select',
        label: 'Cuisine Type',
        required: true,
        options: ['Middle Eastern', 'Turkish', 'Pakistani', 'Indian', 'Mediterranean', 'British', 'International']
      },
      {
        id: 'r3',
        name: 'halalCertified',
        type: 'boolean',
        label: 'Halal Certified',
        required: true
      },
      {
        id: 'r4',
        name: 'priceRange',
        type: 'select',
        label: 'Price Range',
        required: true,
        options: ['£', '££', '£££', '££££']
      },
      {
        id: 'r5',
        name: 'address',
        type: 'text',
        label: 'Address',
        placeholder: 'Full address including postcode',
        required: true
      },
      {
        id: 'r6',
        name: 'rating',
        type: 'number',
        label: 'Rating (1-5)',
        required: true,
        validation: { minLength: 1, maxLength: 5 }
      }
    ],
    seoTemplate: {
      titleTemplate: '{{restaurantName}} Review - {{cuisine}} Restaurant in London',
      descriptionTemplate: 'Read our detailed review of {{restaurantName}}, a {{cuisine}} restaurant in London. {{#halalCertified}}Halal certified. {{/halalCertified}}Price range: {{priceRange}}.',
      keywordsTemplate: '{{restaurantName}}, {{cuisine}} restaurant London, halal food, restaurant review'
    },
    contentTemplate: `# {{restaurantName}} Review

## Overview
{{restaurantName}} is a {{cuisine}} restaurant located in the heart of London, offering an authentic dining experience.

## Key Details
- **Cuisine**: {{cuisine}}
- **Halal Certified**: {{halalCertified}}
- **Price Range**: {{priceRange}}
- **Our Rating**: {{rating}}/5
- **Address**: {{address}}

## Atmosphere & Ambiance
[To be filled with atmosphere description]

## Menu Highlights
[To be filled with menu recommendations]

## Service Quality
[To be filled with service review]

## Final Verdict
[To be filled with conclusion and recommendation]`,
    articleCount: 67,
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-08T00:00:00Z'
  },
  {
    id: '3',
    name: 'Event Coverage',
    slug: 'event-coverage',
    description: 'Coverage of London events, festivals, and cultural happenings',
    icon: 'Calendar',
    color: 'purple',
    isActive: true,
    fields: [
      {
        id: 'e1',
        name: 'eventName',
        type: 'text',
        label: 'Event Name',
        required: true
      },
      {
        id: 'e2',
        name: 'eventDate',
        type: 'date',
        label: 'Event Date',
        required: true
      },
      {
        id: 'e3',
        name: 'venue',
        type: 'text',
        label: 'Venue',
        required: true
      },
      {
        id: 'e4',
        name: 'ticketPrice',
        type: 'text',
        label: 'Ticket Price',
        placeholder: 'e.g., Free, £15, £20-£50',
        required: false
      },
      {
        id: 'e5',
        name: 'eventType',
        type: 'select',
        label: 'Event Type',
        required: true,
        options: ['Festival', 'Exhibition', 'Concert', 'Conference', 'Cultural', 'Food & Drink', 'Family', 'Sports']
      }
    ],
    seoTemplate: {
      titleTemplate: '{{eventName}} {{eventDate}} - London Event Guide',
      descriptionTemplate: 'Everything you need to know about {{eventName}} happening on {{eventDate}} at {{venue}}. {{ticketPrice}} tickets.',
      keywordsTemplate: '{{eventName}}, London events, {{eventType}}, {{venue}}'
    },
    contentTemplate: `# {{eventName}} - London Event Guide

## Event Overview
Join us for {{eventName}}, an exciting {{eventType}} event happening in London.

## Event Details
- **Date**: {{eventDate}}
- **Venue**: {{venue}}
- **Type**: {{eventType}}
- **Tickets**: {{ticketPrice}}

## What to Expect
[To be filled with event description]

## How to Get There
[To be filled with transport information]

## Tips for Attendees
[To be filled with practical advice]`,
    articleCount: 34,
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-05T00:00:00Z'
  }
]

export default function ContentTypesPage() {
  const [contentTypes, setContentTypes] = useState<ContentType[]>(mockContentTypes)
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
        titleTemplate: '{{title}} - Yalla London',
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

  return (
    <PremiumAdminLayout 
      title="Content Types"
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Content Types' }
      ]}
      actions={
        <Button 
          onClick={() => setIsCreating(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Content Type
        </Button>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Content Types List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Content Types
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-2">
                {contentTypes.map((type) => (
                  <div 
                    key={type.id}
                    className={`p-3 cursor-pointer border-l-4 hover:bg-gray-50 ${
                      selectedType?.id === type.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-transparent'
                    }`}
                    onClick={() => setSelectedType(type)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {renderIcon(type.icon, 16)}
                          <h3 className="font-medium text-sm text-gray-900">{type.name}</h3>
                          <Badge className={getColorClass(type.color)}>
                            {type.articleCount}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 mb-2">{type.description}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {type.slug}
                          </Badge>
                          {type.isActive ? (
                            <div className="flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3 text-green-500" />
                              <span className="text-xs text-green-600">Active</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3 text-gray-400" />
                              <span className="text-xs text-gray-500">Inactive</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleToggleActive(type.id)
                          }}
                        >
                          {type.isActive ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedType(type)
                            setEditedType({ ...type })
                            setIsEditing(true)
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteType(type.id)
                          }}
                        >
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content Type Details */}
        <div className="lg:col-span-2">
          {selectedType ? (
            <div className="space-y-6">
              {/* Overview */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {renderIcon(selectedType.icon, 24)}
                      <div>
                        <CardTitle>{selectedType.name}</CardTitle>
                        <p className="text-sm text-gray-600">{selectedType.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setEditedType({ ...selectedType })
                          setIsEditing(true)
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">Slug:</span>
                      <code className="ml-2 bg-gray-100 px-2 py-1 rounded text-xs">
                        {selectedType.slug}
                      </code>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Articles:</span>
                      <Badge className={`ml-2 ${getColorClass(selectedType.color)}`}>
                        {selectedType.articleCount}
                      </Badge>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Status:</span>
                      {selectedType.isActive ? (
                        <span className="ml-2 text-green-600 text-sm">Active</span>
                      ) : (
                        <span className="ml-2 text-gray-500 text-sm">Inactive</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Fields */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    Custom Fields
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedType.fields.length > 0 ? (
                    <div className="space-y-3">
                      {selectedType.fields.map((field) => (
                        <div key={field.id} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <h4 className="font-medium text-sm">{field.label}</h4>
                              <Badge variant="outline" className="text-xs">
                                {field.type}
                              </Badge>
                              {field.required && (
                                <Badge variant="destructive" className="text-xs">
                                  Required
                                </Badge>
                              )}
                            </div>
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                              {`{{${field.name}}}`}
                            </code>
                          </div>
                          {field.placeholder && (
                            <p className="text-xs text-gray-500 mb-1">
                              Placeholder: {field.placeholder}
                            </p>
                          )}
                          {field.options && (
                            <div className="text-xs text-gray-500">
                              Options: {field.options.join(', ')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">
                      No custom fields defined for this content type.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* SEO Template */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    SEO Templates
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Title Template</label>
                    <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                      {selectedType.seoTemplate.titleTemplate}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Description Template</label>
                    <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                      {selectedType.seoTemplate.descriptionTemplate}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Keywords Template</label>
                    <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                      {selectedType.seoTemplate.keywordsTemplate}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Content Template */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Content Template
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 p-4 rounded">
                    <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
                      {selectedType.contentTemplate}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Layers className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Select a Content Type
                </h3>
                <p className="text-gray-500">
                  Choose a content type from the list to view and manage its configuration.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Edit/Create Modal */}
      {(isEditing || isCreating) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {isCreating ? <Plus className="h-5 w-5" /> : <Edit className="h-5 w-5" />}
                {isCreating ? 'Create New Content Type' : 'Edit Content Type'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Name</label>
                  <Input
                    value={editedType.name || ''}
                    onChange={(e) => setEditedType(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Content type name..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Icon</label>
                  <Select 
                    value={editedType.icon || 'FileText'} 
                    onValueChange={(value) => setEditedType(prev => ({ ...prev, icon: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {iconOptions.map(icon => (
                        <SelectItem key={icon} value={icon}>
                          <div className="flex items-center gap-2">
                            {renderIcon(icon, 16)}
                            {icon}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <Textarea
                    value={editedType.description || ''}
                    onChange={(e) => setEditedType(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of this content type..."
                    rows={2}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Color</label>
                  <Select 
                    value={editedType.color || 'blue'} 
                    onValueChange={(value) => setEditedType(prev => ({ ...prev, color: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {colorOptions.map(color => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded ${color.class}`}></div>
                            {color.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Custom Fields */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">Custom Fields</h3>
                  <Button onClick={addField} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Field
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {editedType.fields?.map((field, index) => (
                    <div key={field.id} className="border rounded-lg p-4">
                      <div className="grid grid-cols-4 gap-4 mb-3">
                        <div>
                          <label className="block text-sm font-medium mb-1">Field Name</label>
                          <Input
                            value={field.name}
                            onChange={(e) => updateField(field.id, { name: e.target.value })}
                            placeholder="fieldName"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-1">Label</label>
                          <Input
                            value={field.label}
                            onChange={(e) => updateField(field.id, { label: e.target.value })}
                            placeholder="Display Label"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-1">Type</label>
                          <Select 
                            value={field.type} 
                            onValueChange={(value) => updateField(field.id, { type: value as any })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {fieldTypes.map(type => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="flex items-end gap-2">
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={field.required}
                              onCheckedChange={(checked) => updateField(field.id, { required: checked })}
                            />
                            <label className="text-sm">Required</label>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => removeField(field.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Placeholder</label>
                          <Input
                            value={field.placeholder || ''}
                            onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                            placeholder="Placeholder text..."
                          />
                        </div>
                        
                        {field.type === 'select' && (
                          <div>
                            <label className="block text-sm font-medium mb-1">Options (comma-separated)</label>
                            <Input
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

              {/* Templates */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Content Template</label>
                  <Textarea
                    value={editedType.contentTemplate || ''}
                    onChange={(e) => setEditedType(prev => ({ ...prev, contentTemplate: e.target.value }))}
                    placeholder="Content template with {{variables}}..."
                    rows={8}
                    className="font-mono"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsEditing(false)
                    setIsCreating(false)
                    setEditedType({})
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={isCreating ? handleCreateType : handleSaveType}
                  disabled={!editedType.name}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isCreating ? 'Create' : 'Save'} Content Type
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PremiumAdminLayout>
  )
}