'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import {
  Sparkles, FileText, Download, Eye, RefreshCw, Wand2,
  MapPin, Utensils, ShoppingBag, Hotel, Ticket, Star,
  Clock, Check, AlertCircle, Loader2, Copy, Image as ImageIcon
} from 'lucide-react'

// PDF Templates
const templates = [
  {
    id: 'travel-guide',
    name: 'Travel Guide',
    description: 'Comprehensive city guide with attractions, tips, and maps',
    icon: MapPin,
    color: 'bg-blue-500',
    sections: ['Introduction', 'Top Attractions', 'Getting Around', 'Local Tips', 'Essential Info']
  },
  {
    id: 'restaurant-guide',
    name: 'Restaurant Guide',
    description: 'Curated list of restaurants with reviews and details',
    icon: Utensils,
    color: 'bg-green-500',
    sections: ['Introduction', 'Fine Dining', 'Casual Eats', 'Cafes', 'Street Food']
  },
  {
    id: 'shopping-guide',
    name: 'Shopping Guide',
    description: 'Best shops, malls, and boutiques with insider tips',
    icon: ShoppingBag,
    color: 'bg-pink-500',
    sections: ['Introduction', 'Luxury Shopping', 'High Street', 'Markets', 'Outlet Deals']
  },
  {
    id: 'hotel-guide',
    name: 'Hotel Guide',
    description: 'Top accommodations with amenities and booking tips',
    icon: Hotel,
    color: 'bg-purple-500',
    sections: ['Introduction', 'Luxury Hotels', 'Mid-Range', 'Budget Friendly', 'Booking Tips']
  },
  {
    id: 'event-guide',
    name: 'Event Guide',
    description: 'Upcoming events, shows, and experiences',
    icon: Ticket,
    color: 'bg-orange-500',
    sections: ['Introduction', 'Sports Events', 'Theatre & Shows', 'Concerts', 'Festivals']
  },
]

// Sample generated content structure
interface GeneratedSection {
  title: string
  content: string
  images?: string[]
}

interface GeneratedPDF {
  id: string
  title: string
  template: string
  sections: GeneratedSection[]
  createdAt: string
  status: 'generating' | 'complete' | 'error'
  progress: number
}

export function PDFGenerator() {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [topic, setTopic] = useState('')
  const [audience, setAudience] = useState('')
  const [additionalNotes, setAdditionalNotes] = useState('')
  const [language, setLanguage] = useState<'en' | 'ar'>('en')
  const [pageCount, setPageCount] = useState('20')
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [generatedPDFs, setGeneratedPDFs] = useState<GeneratedPDF[]>([])
  const [previewContent, setPreviewContent] = useState<GeneratedSection[] | null>(null)

  const handleGenerate = async () => {
    if (!selectedTemplate || !topic) return

    setIsGenerating(true)
    setProgress(0)

    const newPDF: GeneratedPDF = {
      id: Date.now().toString(),
      title: topic,
      template: selectedTemplate,
      sections: [],
      createdAt: new Date().toISOString(),
      status: 'generating',
      progress: 0
    }

    setGeneratedPDFs(prev => [newPDF, ...prev])

    // Simulate generation progress
    const template = templates.find(t => t.id === selectedTemplate)
    const totalSections = template?.sections.length || 5

    for (let i = 0; i <= totalSections; i++) {
      await new Promise(resolve => setTimeout(resolve, 1500))
      const currentProgress = Math.round((i / totalSections) * 100)
      setProgress(currentProgress)

      setGeneratedPDFs(prev => prev.map(pdf =>
        pdf.id === newPDF.id
          ? { ...pdf, progress: currentProgress }
          : pdf
      ))
    }

    // Complete generation with mock content
    const mockSections: GeneratedSection[] = template?.sections.map(section => ({
      title: section,
      content: `This is the generated content for the "${section}" section of your ${topic} guide. The AI has crafted comprehensive, engaging content tailored for ${audience || 'Arab visitors to London'}.

Key highlights include:
- Detailed recommendations and insider tips
- Practical information and contact details
- Cultural considerations and local customs
- Money-saving advice and best practices

${additionalNotes ? `\nAdditional notes incorporated: ${additionalNotes}` : ''}`
    })) || []

    setGeneratedPDFs(prev => prev.map(pdf =>
      pdf.id === newPDF.id
        ? { ...pdf, status: 'complete', progress: 100, sections: mockSections }
        : pdf
    ))

    setPreviewContent(mockSections)
    setIsGenerating(false)
    setProgress(100)
  }

  const selectedTemplateData = templates.find(t => t.id === selectedTemplate)

  return (
    <div className="space-y-8">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Wand2 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{generatedPDFs.length}</div>
              <div className="text-sm text-gray-500">PDFs Generated</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {generatedPDFs.filter(p => p.status === 'complete').length}
              </div>
              <div className="text-sm text-gray-500">Completed</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{templates.length}</div>
              <div className="text-sm text-gray-500">Templates</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Sparkles className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">Claude</div>
              <div className="text-sm text-gray-500">AI Powered</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Generator Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              Generate New PDF
            </CardTitle>
            <CardDescription>
              Use Claude AI to create professional PDF guides automatically
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Template Selection */}
            <div className="space-y-3">
              <Label>Select Template</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {templates.map((template) => {
                  const Icon = template.icon
                  return (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template.id)}
                      className={`p-4 rounded-xl border-2 text-center transition-all ${
                        selectedTemplate === template.id
                          ? 'border-[#C8322B] bg-[#C8322B]/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`w-10 h-10 mx-auto mb-2 ${template.color} rounded-lg flex items-center justify-center`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="font-medium text-sm">{template.name}</div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Topic */}
            <div className="space-y-2">
              <Label>Guide Topic / Title</Label>
              <Input
                placeholder="e.g., Best Halal Restaurants in London 2026"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>

            {/* Target Audience */}
            <div className="space-y-2">
              <Label>Target Audience</Label>
              <Input
                placeholder="e.g., Arab families visiting London for the first time"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
              />
            </div>

            {/* Language & Page Count */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Language</Label>
                <Select value={language} onValueChange={(v) => setLanguage(v as 'en' | 'ar')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ar">Arabic (RTL)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Target Pages</Label>
                <Select value={pageCount} onValueChange={setPageCount}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 Pages</SelectItem>
                    <SelectItem value="20">20 Pages</SelectItem>
                    <SelectItem value="30">30 Pages</SelectItem>
                    <SelectItem value="50">50 Pages</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Additional Notes */}
            <div className="space-y-2">
              <Label>Additional Instructions (Optional)</Label>
              <Textarea
                placeholder="Any specific requirements, topics to cover, or style preferences..."
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                rows={3}
              />
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={!selectedTemplate || !topic || isGenerating}
              className="w-full bg-gradient-to-r from-[#1C1917] to-[#3D3835] hover:from-[#3D3835] hover:to-[#1C1917]"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating... {progress}%
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Generate PDF with AI
                </>
              )}
            </Button>

            {/* Progress Bar */}
            {isGenerating && (
              <div className="space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-gray-500 text-center">
                  Generating section {Math.ceil(progress / 20)} of {selectedTemplateData?.sections.length || 5}...
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preview Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-500" />
              Preview
            </CardTitle>
            <CardDescription>
              Preview generated content before downloading
            </CardDescription>
          </CardHeader>
          <CardContent>
            {previewContent ? (
              <div className="space-y-6 max-h-[500px] overflow-y-auto">
                {previewContent.map((section, i) => (
                  <div key={i} className="border rounded-lg p-4">
                    <h4 className="font-semibold text-lg text-[#1C1917] mb-2 flex items-center gap-2">
                      <span className="w-6 h-6 bg-[#C8322B] text-white rounded-full text-sm flex items-center justify-center">
                        {i + 1}
                      </span>
                      {section.title}
                    </h4>
                    <p className="text-sm text-gray-600 whitespace-pre-line">
                      {section.content}
                    </p>
                  </div>
                ))}

                <div className="flex gap-3">
                  <Button className="flex-1 bg-[#C8322B] hover:bg-[#a82520]">
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                  <Button variant="outline" className="flex-1">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Regenerate
                  </Button>
                </div>
              </div>
            ) : (
              <div className="h-[400px] flex flex-col items-center justify-center text-gray-400">
                <FileText className="w-16 h-16 mb-4" />
                <p className="text-center">
                  Select a template and generate content<br />to see preview here
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Generations */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Generations</CardTitle>
          <CardDescription>Previously generated PDF guides</CardDescription>
        </CardHeader>
        <CardContent>
          {generatedPDFs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No PDFs generated yet. Create your first one above!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {generatedPDFs.map((pdf) => {
                const template = templates.find(t => t.id === pdf.template)
                const Icon = template?.icon || FileText

                return (
                  <div key={pdf.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 ${template?.color || 'bg-gray-500'} rounded-lg flex items-center justify-center`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-medium">{pdf.title}</h4>
                        <p className="text-sm text-gray-500">
                          {template?.name} • {new Date(pdf.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {pdf.status === 'generating' ? (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          {pdf.progress}%
                        </Badge>
                      ) : pdf.status === 'complete' ? (
                        <>
                          <Badge variant="default" className="bg-green-500">Complete</Badge>
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="sm">
                            <Download className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <Badge variant="destructive">Error</Badge>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
