'use client';

/**
 * PDF Guide Generator
 *
 * Create and manage downloadable PDF travel guides for lead capture
 * and monetization.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  FileText,
  Plus,
  Download,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  Globe,
  Sparkles,
  Loader2,
  CheckCircle,
  Clock,
  DollarSign,
  Users,
  TrendingUp,
  BookOpen,
  Layout,
  Image,
  Type,
  Palette,
  Settings,
  Send,
  Copy,
  ExternalLink,
} from 'lucide-react';

interface PDFGuide {
  id: string;
  title: string;
  description: string;
  site: string;
  locale: 'ar' | 'en';
  status: 'draft' | 'generating' | 'published';
  template: string;
  pages: number;
  fileSize: string;
  downloadUrl: string | null;
  createdAt: string;
  updatedAt: string;
  stats: {
    downloads: number;
    leadsGenerated: number;
    revenue: number;
  };
  pricing: {
    type: 'free' | 'paid' | 'email_gate';
    price: number | null;
  };
}

interface PDFTemplate {
  id: string;
  name: string;
  description: string;
  preview: string;
  category: 'guide' | 'comparison' | 'checklist' | 'itinerary';
  pages: string;
  color: string;
}

const TEMPLATES: PDFTemplate[] = [
  {
    id: 'maldives-guide',
    name: 'Destination Guide',
    description: 'Comprehensive travel guide with tips, recommendations, and maps',
    preview: '📖',
    category: 'guide',
    pages: '20-30',
    color: 'blue',
  },
  {
    id: 'resort-comparison',
    name: 'Resort Comparison',
    description: 'Side-by-side comparison of top resorts with scores and verdicts',
    preview: '📊',
    category: 'comparison',
    pages: '10-15',
    color: 'purple',
  },
  {
    id: 'packing-checklist',
    name: 'Packing Checklist',
    description: 'Interactive packing list with destination-specific items',
    preview: '✅',
    category: 'checklist',
    pages: '5-8',
    color: 'green',
  },
  {
    id: 'itinerary-planner',
    name: 'Itinerary Planner',
    description: 'Day-by-day itinerary template with activities and reservations',
    preview: '📅',
    category: 'itinerary',
    pages: '8-12',
    color: 'amber',
  },
];

export default function PDFGeneratorPage() {
  const [guides, setGuides] = useState<PDFGuide[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreator, setShowCreator] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [generatorStep, setGeneratorStep] = useState<'template' | 'content' | 'style' | 'generate'>('template');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);

  // Generator form state
  const [guideTitle, setGuideTitle] = useState('');
  const [guideDescription, setGuideDescription] = useState('');
  const [selectedSite, setSelectedSite] = useState('arabaldives');
  const [selectedLocale, setSelectedLocale] = useState<'ar' | 'en'>('ar');
  const [pricingType, setPricingType] = useState<'free' | 'paid' | 'email_gate'>('email_gate');
  const [price, setPrice] = useState<number>(0);

  useEffect(() => {
    loadGuides();
  }, []);

  const loadGuides = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/command-center/products/pdf');
      if (response.ok) {
        const data = await response.json();
        setGuides(data.guides);
      } else {
        setGuides(mockGuides);
      }
    } catch (error) {
      setGuides(mockGuides);
    }
    setIsLoading(false);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerationProgress(0);

    // Simulate generation progress
    const progressInterval = setInterval(() => {
      setGenerationProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 10;
      });
    }, 500);

    try {
      await fetch('/api/admin/command-center/products/pdf/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: selectedTemplate,
          title: guideTitle,
          description: guideDescription,
          site: selectedSite,
          locale: selectedLocale,
          pricing: { type: pricingType, price: pricingType === 'paid' ? price : null },
        }),
      });

      // Wait for completion
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Refresh guides
      loadGuides();
      setShowCreator(false);
      resetForm();
    } catch (error) {
      console.error('Failed to generate PDF:', error);
    }

    clearInterval(progressInterval);
    setIsGenerating(false);
  };

  const resetForm = () => {
    setSelectedTemplate(null);
    setGeneratorStep('template');
    setGuideTitle('');
    setGuideDescription('');
    setPricingType('email_gate');
    setPrice(0);
  };

  // Calculate totals
  const totalDownloads = guides.reduce((sum, g) => sum + g.stats.downloads, 0);
  const totalLeads = guides.reduce((sum, g) => sum + g.stats.leadsGenerated, 0);
  const totalRevenue = guides.reduce((sum, g) => sum + g.stats.revenue, 0);

  const copyDownloadLink = async (url: string) => {
    await navigator.clipboard.writeText(url);
    // Show toast
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/admin/command-center"
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="font-semibold text-lg flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-red-600" />
                  PDF Guide Generator
                </h1>
                <p className="text-sm text-gray-500">
                  Create downloadable guides for lead capture
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowCreator(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-pink-600 text-white px-4 py-2 rounded-lg hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Create Guide
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500 text-sm">Total Guides</span>
              <FileText className="h-5 w-5 text-blue-500" />
            </div>
            <div className="text-2xl font-bold">{guides.length}</div>
            <div className="text-sm text-gray-500 mt-1">published</div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500 text-sm">Downloads</span>
              <Download className="h-5 w-5 text-green-500" />
            </div>
            <div className="text-2xl font-bold">{totalDownloads.toLocaleString()}</div>
            <div className="text-sm text-green-600 flex items-center gap-1 mt-1">
              <TrendingUp className="h-4 w-4" />
              +15% this month
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500 text-sm">Leads Generated</span>
              <Users className="h-5 w-5 text-purple-500" />
            </div>
            <div className="text-2xl font-bold">{totalLeads.toLocaleString()}</div>
            <div className="text-sm text-gray-500 mt-1">from guides</div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500 text-sm">Revenue</span>
              <DollarSign className="h-5 w-5 text-amber-500" />
            </div>
            <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
            <div className="text-sm text-gray-500 mt-1">from paid guides</div>
          </div>
        </div>

        {/* Guides Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {guides.map((guide) => (
            <div
              key={guide.id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              {/* Preview */}
              <div className="h-32 bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center">
                <FileText className="h-12 w-12 text-white/80" />
              </div>

              <div className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-medium">{guide.title}</h3>
                    <p className="text-sm text-gray-500 line-clamp-2">
                      {guide.description}
                    </p>
                  </div>
                </div>

                {/* Meta */}
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                  <span className="flex items-center gap-1">
                    <Globe className="h-4 w-4" />
                    {guide.site}
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    {guide.pages} pages
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs ${
                      guide.locale === 'ar'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {guide.locale.toUpperCase()}
                  </span>
                </div>

                {/* Pricing */}
                <div className="mb-3">
                  {guide.pricing.type === 'free' && (
                    <span className="text-green-600 font-medium">Free Download</span>
                  )}
                  {guide.pricing.type === 'email_gate' && (
                    <span className="text-blue-600 font-medium flex items-center gap-1">
                      <Send className="h-4 w-4" />
                      Email Required
                    </span>
                  )}
                  {guide.pricing.type === 'paid' && (
                    <span className="text-amber-600 font-medium">
                      ${guide.pricing.price}
                    </span>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 text-center bg-gray-50 rounded-lg p-2 mb-3">
                  <div>
                    <div className="text-sm font-medium">{guide.stats.downloads}</div>
                    <div className="text-xs text-gray-500">downloads</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">{guide.stats.leadsGenerated}</div>
                    <div className="text-xs text-gray-500">leads</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-green-600">
                      ${guide.stats.revenue}
                    </div>
                    <div className="text-xs text-gray-500">revenue</div>
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center justify-between text-sm">
                  <span
                    className={`px-2 py-1 rounded-full ${
                      guide.status === 'published'
                        ? 'bg-green-100 text-green-700'
                        : guide.status === 'generating'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {guide.status}
                  </span>
                  <span className="text-gray-400">{guide.updatedAt}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="border-t border-gray-100 px-4 py-2 flex justify-between">
                <button className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  Preview
                </button>
                <button
                  onClick={() => guide.downloadUrl && copyDownloadLink(guide.downloadUrl)}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <Copy className="h-4 w-4" />
                  Copy Link
                </button>
                <button className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
                  <Edit className="h-4 w-4" />
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Create Guide Modal */}
        {showCreator && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Sparkles className="h-6 w-6 text-red-600" />
                    Create PDF Guide
                  </h2>
                  <button
                    onClick={() => {
                      setShowCreator(false);
                      resetForm();
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    ×
                  </button>
                </div>

                {/* Steps */}
                <div className="flex gap-2 mt-4">
                  {['template', 'content', 'style', 'generate'].map((step, i) => (
                    <div
                      key={step}
                      className={`flex-1 h-2 rounded-full ${
                        ['template', 'content', 'style', 'generate'].indexOf(generatorStep) >= i
                          ? 'bg-red-500'
                          : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="p-6">
                {/* Step 1: Template Selection */}
                {generatorStep === 'template' && (
                  <div className="space-y-6">
                    <h3 className="font-semibold text-lg">Choose a Template</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {TEMPLATES.map((template) => (
                        <button
                          key={template.id}
                          onClick={() => setSelectedTemplate(template.id)}
                          className={`p-4 rounded-xl border-2 text-left transition-all ${
                            selectedTemplate === template.id
                              ? 'border-red-500 bg-red-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <span className="text-4xl mb-3 block">{template.preview}</span>
                          <h4 className="font-medium">{template.name}</h4>
                          <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                          <p className="text-xs text-gray-400 mt-2">{template.pages} pages</p>
                        </button>
                      ))}
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={() => setGeneratorStep('content')}
                        disabled={!selectedTemplate}
                        className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 2: Content */}
                {generatorStep === 'content' && (
                  <div className="space-y-6">
                    <h3 className="font-semibold text-lg">Guide Content</h3>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Target Site
                        </label>
                        <select
                          value={selectedSite}
                          onChange={(e) => setSelectedSite(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="arabaldives">Arabaldives</option>
                          <option value="yalla-london">Yalla London</option>
                          <option value="gulf-maldives">Gulf Maldives</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Language
                        </label>
                        <select
                          value={selectedLocale}
                          onChange={(e) => setSelectedLocale(e.target.value as 'ar' | 'en')}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="ar">Arabic (العربية)</option>
                          <option value="en">English</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Guide Title
                      </label>
                      <input
                        type="text"
                        value={guideTitle}
                        onChange={(e) => setGuideTitle(e.target.value)}
                        placeholder="e.g., The Ultimate Maldives Travel Guide 2024"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        value={guideDescription}
                        onChange={(e) => setGuideDescription(e.target.value)}
                        placeholder="Describe what this guide covers..."
                        className="w-full h-24 px-4 py-2 border border-gray-300 rounded-lg resize-none"
                      />
                    </div>

                    <div className="flex justify-between">
                      <button
                        onClick={() => setGeneratorStep('template')}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Back
                      </button>
                      <button
                        onClick={() => setGeneratorStep('style')}
                        disabled={!guideTitle}
                        className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3: Style & Pricing */}
                {generatorStep === 'style' && (
                  <div className="space-y-6">
                    <h3 className="font-semibold text-lg">Style & Pricing</h3>

                    {/* Pricing */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Distribution Method
                      </label>
                      <div className="grid grid-cols-3 gap-4">
                        <button
                          onClick={() => setPricingType('free')}
                          className={`p-4 rounded-xl border-2 text-center ${
                            pricingType === 'free'
                              ? 'border-green-500 bg-green-50'
                              : 'border-gray-200'
                          }`}
                        >
                          <Download className="h-6 w-6 mx-auto mb-2 text-green-600" />
                          <div className="font-medium">Free</div>
                          <div className="text-xs text-gray-500">No restrictions</div>
                        </button>
                        <button
                          onClick={() => setPricingType('email_gate')}
                          className={`p-4 rounded-xl border-2 text-center ${
                            pricingType === 'email_gate'
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200'
                          }`}
                        >
                          <Send className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                          <div className="font-medium">Email Gate</div>
                          <div className="text-xs text-gray-500">Capture leads</div>
                        </button>
                        <button
                          onClick={() => setPricingType('paid')}
                          className={`p-4 rounded-xl border-2 text-center ${
                            pricingType === 'paid'
                              ? 'border-amber-500 bg-amber-50'
                              : 'border-gray-200'
                          }`}
                        >
                          <DollarSign className="h-6 w-6 mx-auto mb-2 text-amber-600" />
                          <div className="font-medium">Paid</div>
                          <div className="text-xs text-gray-500">Sell directly</div>
                        </button>
                      </div>
                    </div>

                    {pricingType === 'paid' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Price (USD)
                        </label>
                        <input
                          type="number"
                          value={price}
                          onChange={(e) => setPrice(Number(e.target.value))}
                          placeholder="9.99"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    )}

                    <div className="flex justify-between">
                      <button
                        onClick={() => setGeneratorStep('content')}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Back
                      </button>
                      <button
                        onClick={() => setGeneratorStep('generate')}
                        className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700"
                      >
                        Generate PDF
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 4: Generate */}
                {generatorStep === 'generate' && (
                  <div className="text-center py-8">
                    {isGenerating ? (
                      <>
                        <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                          <Loader2 className="h-10 w-10 text-white animate-spin" />
                        </div>
                        <h3 className="font-semibold text-lg mb-2">Generating Your PDF</h3>
                        <p className="text-gray-500 mb-6">
                          AI is creating your guide with beautiful layouts and content...
                        </p>

                        {/* Progress Bar */}
                        <div className="max-w-md mx-auto bg-gray-200 rounded-full h-3 mb-4 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-red-500 to-pink-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${generationProgress}%` }}
                          />
                        </div>
                        <p className="text-sm text-gray-500">{generationProgress}% complete</p>

                        <div className="mt-6 text-left max-w-md mx-auto bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
                          {generationProgress < 20 && '📝 Analyzing content requirements...'}
                          {generationProgress >= 20 && generationProgress < 40 && '🎨 Creating layouts and designs...'}
                          {generationProgress >= 40 && generationProgress < 60 && '✍️ Generating content with AI...'}
                          {generationProgress >= 60 && generationProgress < 80 && '🖼️ Adding images and graphics...'}
                          {generationProgress >= 80 && generationProgress < 100 && '📄 Compiling final PDF...'}
                          {generationProgress >= 100 && '✅ PDF ready!'}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                          <Sparkles className="h-10 w-10 text-white" />
                        </div>
                        <h3 className="font-semibold text-lg mb-2">Ready to Generate</h3>
                        <p className="text-gray-500 mb-6">
                          Your PDF guide will be generated using AI with beautiful layouts.
                        </p>

                        <div className="bg-gray-50 rounded-lg p-4 max-w-md mx-auto text-left mb-6">
                          <h4 className="font-medium mb-2">Summary</h4>
                          <div className="space-y-1 text-sm text-gray-600">
                            <p>Template: {TEMPLATES.find((t) => t.id === selectedTemplate)?.name}</p>
                            <p>Title: {guideTitle}</p>
                            <p>Site: {selectedSite}</p>
                            <p>Language: {selectedLocale.toUpperCase()}</p>
                            <p>Pricing: {pricingType === 'paid' ? `$${price}` : pricingType}</p>
                          </div>
                        </div>

                        <div className="flex justify-center gap-4">
                          <button
                            onClick={() => setGeneratorStep('style')}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                          >
                            Back
                          </button>
                          <button
                            onClick={handleGenerate}
                            className="bg-gradient-to-r from-red-600 to-pink-600 text-white px-8 py-2 rounded-lg hover:opacity-90 flex items-center gap-2"
                          >
                            <Sparkles className="h-4 w-4" />
                            Generate PDF
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Mock data
const mockGuides: PDFGuide[] = [
  {
    id: '1',
    title: 'الدليل الشامل للمالديف 2024',
    description: 'كل ما تحتاج معرفته عن السفر للمالديف من اختيار المنتجع للحجز',
    site: 'Arabaldives',
    locale: 'ar',
    status: 'published',
    template: 'maldives-guide',
    pages: 28,
    fileSize: '4.2 MB',
    downloadUrl: 'https://arabaldives.com/guides/maldives-guide-2024.pdf',
    createdAt: '2024-01-10',
    updatedAt: '2 days ago',
    stats: { downloads: 1250, leadsGenerated: 890, revenue: 0 },
    pricing: { type: 'email_gate', price: null },
  },
  {
    id: '2',
    title: 'مقارنة أفضل 10 منتجعات للعائلات',
    description: 'مقارنة تفصيلية بين أفضل منتجعات المالديف المناسبة للعائلات',
    site: 'Arabaldives',
    locale: 'ar',
    status: 'published',
    template: 'resort-comparison',
    pages: 15,
    fileSize: '2.8 MB',
    downloadUrl: 'https://arabaldives.com/guides/family-resorts-comparison.pdf',
    createdAt: '2024-01-15',
    updatedAt: '1 week ago',
    stats: { downloads: 680, leadsGenerated: 520, revenue: 0 },
    pricing: { type: 'email_gate', price: null },
  },
  {
    id: '3',
    title: 'Premium Honeymoon Planning Guide',
    description: 'Expert tips for planning the perfect Maldives honeymoon',
    site: 'Gulf Maldives',
    locale: 'en',
    status: 'published',
    template: 'maldives-guide',
    pages: 22,
    fileSize: '3.5 MB',
    downloadUrl: 'https://gulfmaldives.com/guides/honeymoon-guide.pdf',
    createdAt: '2024-01-05',
    updatedAt: '3 days ago',
    stats: { downloads: 420, leadsGenerated: 180, revenue: 840 },
    pricing: { type: 'paid', price: 9.99 },
  },
  {
    id: '4',
    title: 'قائمة التجهيز للسفر للمالديف',
    description: 'قائمة شاملة بكل ما تحتاج تحزيمه لرحلة المالديف',
    site: 'Arabaldives',
    locale: 'ar',
    status: 'published',
    template: 'packing-checklist',
    pages: 6,
    fileSize: '1.2 MB',
    downloadUrl: 'https://arabaldives.com/guides/packing-checklist.pdf',
    createdAt: '2024-01-20',
    updatedAt: 'Yesterday',
    stats: { downloads: 2100, leadsGenerated: 1450, revenue: 0 },
    pricing: { type: 'free', price: null },
  },
];
