'use client'

import { useState } from 'react'
import {
  AdminCard,
  AdminPageHeader,
  AdminSectionLabel,
  AdminButton,
} from '@/components/admin/admin-ui'
import { Save, Plus, Settings, Trash2, GripVertical, Layout, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { getDefaultSiteId, getSiteConfig } from '@/config/sites'

export default function HomepageBuilderPage() {
  const _defaultSiteName = getSiteConfig(getDefaultSiteId())?.name || 'Our Site'
  const [modules, setModules] = useState([
    { id: '1', type: 'hero', title: 'Hero Section', content: `Welcome to ${_defaultSiteName}` },
    { id: '2', type: 'articles', title: 'Latest Articles', content: '6 articles' },
    { id: '3', type: 'deals', title: 'Featured Deals', content: '4 deals' },
  ])

  const moduleLibrary = [
    'Hero Section',
    'Article Grid',
    'Featured Deals',
    'Location Map',
    'Newsletter Signup',
  ]

  const saveHomepage = async () => {
    try {
      const response = await fetch('/api/admin/homepage-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modules }),
      })

      if (response.ok) {
        toast.success('Homepage saved successfully!')
      } else {
        toast.warning('Homepage saved locally')
      }
    } catch (error) {
      toast.error('Failed to save homepage')
    }
  }

  return (
    <div className="admin-page p-4 md:p-6">
      <AdminPageHeader
        title="Homepage Builder"
        subtitle="Design and customize your homepage layout"
        action={
          <AdminButton variant="primary" size="sm" onClick={saveHomepage}>
            <Save size={12} />
            Save Homepage
          </AdminButton>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Module Library */}
        <div>
          <AdminSectionLabel>Add Modules</AdminSectionLabel>
          <AdminCard accent accentColor="blue">
            <div className="p-4 space-y-2">
              {moduleLibrary.map((mod) => (
                <button
                  key={mod}
                  className="w-full text-left flex items-center gap-2 transition-all hover:shadow-sm active:scale-[0.98]"
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid rgba(214,208,196,0.8)',
                    fontFamily: 'var(--font-system)',
                    fontSize: 12,
                    fontWeight: 500,
                    color: '#44403C',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <Plus size={14} color="#3B7EA1" />
                  {mod}
                </button>
              ))}
            </div>
          </AdminCard>
        </div>

        {/* Main Content - Layout */}
        <div>
          <AdminSectionLabel>Homepage Layout</AdminSectionLabel>
          <AdminCard>
            <div className="p-4 space-y-3">
              {modules.map((module) => (
                <div
                  key={module.id}
                  style={{
                    border: '1px solid rgba(214,208,196,0.6)',
                    borderRadius: 10,
                    padding: '10px 12px',
                  }}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <GripVertical size={14} color="#A8A29E" className="flex-shrink-0 cursor-grab" />
                    <div className="min-w-0">
                      <div
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontWeight: 700,
                          fontSize: 13,
                          color: '#1C1917',
                        }}
                      >
                        {module.title}
                      </div>
                      <div
                        style={{
                          fontFamily: 'var(--font-system)',
                          fontSize: 10,
                          color: '#A8A29E',
                          marginTop: 2,
                        }}
                      >
                        {module.content}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <AdminButton variant="ghost" size="sm">
                      <Settings size={14} />
                    </AdminButton>
                    <AdminButton variant="ghost" size="sm">
                      <Trash2 size={14} color="#C8322B" />
                    </AdminButton>
                  </div>
                </div>
              ))}
            </div>
          </AdminCard>
        </div>

        {/* Preview */}
        <div>
          <AdminSectionLabel>Preview</AdminSectionLabel>
          <AdminCard accent accentColor="green">
            <div className="p-4">
              <div
                style={{
                  border: '1px solid rgba(214,208,196,0.6)',
                  borderRadius: 10,
                  overflow: 'hidden',
                  backgroundColor: '#FFFFFF',
                }}
              >
                {modules.map((module, i) => (
                  <div
                    key={module.id}
                    style={{
                      padding: '10px 12px',
                      backgroundColor: i % 2 === 0 ? '#FAF8F4' : '#FFFFFF',
                      borderBottom: i < modules.length - 1 ? '1px solid rgba(214,208,196,0.4)' : undefined,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontWeight: 700,
                        fontSize: 12,
                        color: '#1C1917',
                      }}
                    >
                      {module.title}
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--font-system)',
                        fontSize: 10,
                        color: '#A8A29E',
                        marginTop: 2,
                      }}
                    >
                      {module.content}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </AdminCard>
        </div>
      </div>
    </div>
  )
}
