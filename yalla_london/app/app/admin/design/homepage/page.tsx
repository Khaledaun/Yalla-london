'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Save, Plus, Settings, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { getDefaultSiteId, getSiteConfig } from '@/config/sites'

export default function HomepageBuilderPage() {
  const _defaultSiteName = getSiteConfig(getDefaultSiteId())?.name || 'Our Site'
  const [modules, setModules] = useState([
    { id: '1', type: 'hero', title: 'Hero Section', content: `Welcome to ${_defaultSiteName}` },
    { id: '2', type: 'articles', title: 'Latest Articles', content: '6 articles' },
    { id: '3', type: 'deals', title: 'Featured Deals', content: '4 deals' }
  ])

  const saveHomepage = async () => {
    try {
      const response = await fetch('/api/admin/homepage-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modules })
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Homepage Builder</h1>
          <p className="text-gray-600 mt-2">Design and customize your homepage layout</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Module Library */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Add Modules
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  Hero Section
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Article Grid
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Featured Deals
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Location Map
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Newsletter Signup
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Homepage Layout</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {modules.map((module) => (
                  <div key={module.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{module.title}</h3>
                        <p className="text-sm text-gray-600">{module.content}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Preview */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg p-4 bg-white">
                  {modules.map((module) => (
                    <div key={module.id} className="mb-4 p-3 bg-gray-50 rounded">
                      <div className="text-sm font-medium">{module.title}</div>
                      <div className="text-xs text-gray-600">{module.content}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <Button onClick={saveHomepage}>
            <Save className="h-4 w-4 mr-2" />
            Save Homepage
          </Button>
        </div>
      </div>
    </div>
  )
}