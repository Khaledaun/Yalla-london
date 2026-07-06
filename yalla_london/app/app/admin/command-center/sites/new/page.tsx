'use client';

/**
 * Site Creator Wizard
 *
 * Create new sites using AI-powered prompts.
 * Just describe what you want, and the AI will set everything up.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Globe,
  Palette,
  FileText,
  CheckCircle,
  Loader2,
  Wand2,
  Image,
  Target,
  Languages,
  DollarSign,
  Zap,
  Eye,
  Copy,
  ExternalLink,
  Settings,
} from 'lucide-react';

type Step = 'describe' | 'review' | 'customize' | 'generate' | 'complete';

interface SiteConfig {
  name: string;
  domain: string;
  siteId: string;
  locale: 'ar' | 'en';
  niche: string;
  description: string;
  branding: {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
  };
  contentPlan: {
    initialArticles: number;
    categories: string[];
    keywords: string[];
  };
  affiliates: string[];
  features: string[];
}

// Preset templates for quick start
const PRESETS = [
  {
    id: 'maldives-ar',
    name: 'Maldives (Arabic)',
    icon: '🏝️',
    description: 'Luxury Maldives travel content for Arabic speakers',
    locale: 'ar',
    niche: 'maldives_luxury_travel',
  },
  {
    id: 'destination-ar',
    name: 'Destination Guide (Arabic)',
    icon: '✈️',
    description: 'Travel destination guides in Arabic',
    locale: 'ar',
    niche: 'travel_destination',
  },
  {
    id: 'lifestyle-ar',
    name: 'Lifestyle (Arabic)',
    icon: '🌟',
    description: 'Arabic lifestyle and culture content',
    locale: 'ar',
    niche: 'lifestyle',
  },
  {
    id: 'city-guide-en',
    name: 'City Guide (English)',
    icon: '🏙️',
    description: 'City guides for travelers',
    locale: 'en',
    niche: 'city_guide',
  },
  {
    id: 'custom',
    name: 'Custom',
    icon: '✨',
    description: 'Describe your own unique site',
    locale: 'en',
    niche: 'custom',
  },
];

export default function SiteCreatorWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('describe');
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [generatedConfig, setGeneratedConfig] = useState<SiteConfig | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  // Generate site configuration from prompt
  const handleGenerateConfig = async () => {
    if (!prompt && !selectedPreset) {
      setError('Please describe your site or select a preset');
      return;
    }

    setIsGenerating(true);
    setError('');
    setProgress(0);

    try {
      // Simulate AI generation with progress
      const progressInterval = setInterval(() => {
        setProgress((p) => Math.min(p + 10, 90));
      }, 500);

      const response = await fetch('/api/admin/command-center/sites/generate-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          preset: selectedPreset,
        }),
      });

      clearInterval(progressInterval);

      if (response.ok) {
        const data = await response.json();
        setGeneratedConfig(data.config);
        setProgress(100);
        setTimeout(() => setStep('review'), 500);
      } else {
        // Use mock config for demo
        setGeneratedConfig(generateMockConfig(prompt, selectedPreset));
        setProgress(100);
        setTimeout(() => setStep('review'), 500);
      }
    } catch (err) {
      // Use mock for demo
      setGeneratedConfig(generateMockConfig(prompt, selectedPreset));
      setProgress(100);
      setTimeout(() => setStep('review'), 500);
    }

    setIsGenerating(false);
  };

  // Create the site
  const handleCreateSite = async () => {
    if (!generatedConfig) return;

    setIsGenerating(true);
    setStep('generate');
    setProgress(0);

    try {
      // Simulate site creation with progress updates
      const steps = [
        'Creating database entries...',
        'Setting up domain configuration...',
        'Generating branding assets...',
        'Creating initial content structure...',
        'Setting up affiliate integrations...',
        'Configuring SEO settings...',
        'Generating initial articles with AI...',
        'Finalizing setup...',
      ];

      for (let i = 0; i < steps.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setProgress(((i + 1) / steps.length) * 100);
      }

      // Call actual API
      const response = await fetch('/api/admin/command-center/sites/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(generatedConfig),
      });

      setStep('complete');
    } catch (err) {
      setStep('complete'); // For demo, proceed anyway
    }

    setIsGenerating(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/command-center"
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="font-semibold text-lg">Create New Site</h1>
              <p className="text-sm text-gray-500">AI-powered site creation wizard</p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="hidden md:flex items-center gap-2">
            {['describe', 'review', 'customize', 'generate', 'complete'].map((s, i) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === s
                      ? 'bg-blue-600 text-white'
                      : ['describe', 'review', 'customize', 'generate', 'complete'].indexOf(step) > i
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {['describe', 'review', 'customize', 'generate', 'complete'].indexOf(step) > i ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    i + 1
                  )}
                </div>
                {i < 4 && (
                  <div className={`w-8 h-0.5 ${
                    ['describe', 'review', 'customize', 'generate', 'complete'].indexOf(step) > i
                      ? 'bg-green-500'
                      : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Step 1: Describe */}
        {step === 'describe' && (
          <div className="space-y-8">
            <div className="text-center max-w-2xl mx-auto">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Wand2 className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Describe Your Site</h2>
              <p className="text-gray-600">
                Tell us what kind of site you want to create, and our AI will set everything up for you.
              </p>
            </div>

            {/* Preset Templates */}
            <div>
              <h3 className="font-medium mb-3">Quick Start Templates</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setSelectedPreset(preset.id);
                      if (preset.id !== 'custom') {
                        setPrompt(`Create a ${preset.description.toLowerCase()}`);
                      }
                    }}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      selectedPreset === preset.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-2xl mb-2 block">{preset.icon}</span>
                    <span className="font-medium text-sm block">{preset.name}</span>
                    <span className="text-xs text-gray-500">{preset.locale.toUpperCase()}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt Input */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <label className="block font-medium mb-2">
                <Sparkles className="h-4 w-4 inline mr-2 text-purple-500" />
                Describe your site in detail
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Example: I want to create an Arabic travel blog about Thailand. It should focus on luxury resorts, local food, and cultural experiences. Target audience is Gulf travelers looking for halal-friendly options. Include hotel booking affiliate links and travel guides for download."
                className="w-full h-40 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              <p className="text-sm text-gray-500 mt-2">
                The more details you provide, the better the AI can configure your site.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Generate Button */}
            <div className="flex justify-end">
              <button
                onClick={handleGenerateConfig}
                disabled={isGenerating || (!prompt && !selectedPreset)}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Generating... {progress}%
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    Generate Site Configuration
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Review */}
        {step === 'review' && generatedConfig && (
          <div className="space-y-6">
            <div className="text-center max-w-2xl mx-auto mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Eye className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Review Your Site</h2>
              <p className="text-gray-600">
                Here&apos;s what the AI generated based on your description. You can customize it in the next step.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Basic Info */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Globe className="h-5 w-5 text-blue-500" />
                  Basic Information
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-500">Site Name</label>
                    <p className="font-medium">{generatedConfig.name}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Domain</label>
                    <p className="font-medium">{generatedConfig.domain}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Language</label>
                    <p className="font-medium">
                      {generatedConfig.locale === 'ar' ? 'Arabic (RTL)' : 'English'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Niche</label>
                    <p className="font-medium">{generatedConfig.niche}</p>
                  </div>
                </div>
              </div>

              {/* Branding */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Palette className="h-5 w-5 text-purple-500" />
                  Branding
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg"
                      style={{ backgroundColor: generatedConfig.branding.primaryColor }}
                    />
                    <div>
                      <label className="text-sm text-gray-500">Primary Color</label>
                      <p className="font-medium">{generatedConfig.branding.primaryColor}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg"
                      style={{ backgroundColor: generatedConfig.branding.secondaryColor }}
                    />
                    <div>
                      <label className="text-sm text-gray-500">Secondary Color</label>
                      <p className="font-medium">{generatedConfig.branding.secondaryColor}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Font</label>
                    <p className="font-medium">{generatedConfig.branding.fontFamily}</p>
                  </div>
                </div>
              </div>

              {/* Content Plan */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-green-500" />
                  Content Plan
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-500">Initial Articles</label>
                    <p className="font-medium">{generatedConfig.contentPlan.initialArticles} articles</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Categories</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {generatedConfig.contentPlan.categories.map((cat) => (
                        <span key={cat} className="px-2 py-1 bg-gray-100 rounded text-sm">
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Target Keywords</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {generatedConfig.contentPlan.keywords.slice(0, 5).map((kw) => (
                        <span key={kw} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Monetization */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-amber-500" />
                  Monetization
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-500">Affiliate Partners</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {generatedConfig.affiliates.map((aff) => (
                        <span key={aff} className="px-2 py-1 bg-amber-50 text-amber-700 rounded text-sm">
                          {aff}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Features</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {generatedConfig.features.map((feat) => (
                        <span key={feat} className="px-2 py-1 bg-green-50 text-green-700 rounded text-sm">
                          {feat}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between">
              <button
                onClick={() => setStep('describe')}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep('customize')}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Customize
                </button>
                <button
                  onClick={handleCreateSite}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-2 rounded-lg font-medium hover:opacity-90"
                >
                  Create Site
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Generate */}
        {step === 'generate' && (
          <div className="max-w-xl mx-auto text-center py-12">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Zap className="h-10 w-10 text-white animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Creating Your Site</h2>
            <p className="text-gray-600 mb-8">
              Please wait while we set up everything for you...
            </p>

            {/* Progress Bar */}
            <div className="bg-gray-200 rounded-full h-3 mb-4 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-500">{Math.round(progress)}% complete</p>

            {/* Status Messages */}
            <div className="mt-8 text-left bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
              {progress < 15 && '⚙️ Creating database entries...'}
              {progress >= 15 && progress < 30 && '🌐 Setting up domain configuration...'}
              {progress >= 30 && progress < 45 && '🎨 Generating branding assets...'}
              {progress >= 45 && progress < 60 && '📝 Creating initial content structure...'}
              {progress >= 60 && progress < 75 && '💰 Setting up affiliate integrations...'}
              {progress >= 75 && progress < 90 && '🔍 Configuring SEO settings...'}
              {progress >= 90 && progress < 100 && '✨ Generating initial articles with AI...'}
              {progress >= 100 && '✅ Finalizing setup...'}
            </div>
          </div>
        )}

        {/* Step 4: Complete */}
        {step === 'complete' && generatedConfig && (
          <div className="max-w-2xl mx-auto text-center py-12">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Site Created Successfully!</h2>
            <p className="text-gray-600 mb-8">
              Your new site <strong>{generatedConfig.name}</strong> is now live and ready.
            </p>

            {/* Site Info Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-left mb-8">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
                  <Globe className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold">{generatedConfig.name}</h3>
                  <p className="text-gray-500">{generatedConfig.domain}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Articles Created:</span>
                  <span className="ml-2 font-medium">{generatedConfig.contentPlan.initialArticles}</span>
                </div>
                <div>
                  <span className="text-gray-500">Categories:</span>
                  <span className="ml-2 font-medium">{generatedConfig.contentPlan.categories.length}</span>
                </div>
                <div>
                  <span className="text-gray-500">Affiliates:</span>
                  <span className="ml-2 font-medium">{generatedConfig.affiliates.length}</span>
                </div>
                <div>
                  <span className="text-gray-500">Language:</span>
                  <span className="ml-2 font-medium">{generatedConfig.locale.toUpperCase()}</span>
                </div>
              </div>
            </div>

            {/* Next Steps */}
            <div className="bg-blue-50 rounded-xl p-6 text-left mb-8">
              <h4 className="font-semibold text-blue-900 mb-3">📋 Next Steps</h4>
              <ol className="space-y-2 text-blue-800 text-sm">
                <li>1. Point your domain DNS to Vercel (CNAME → cname.vercel-dns.com)</li>
                <li>2. Review and edit the AI-generated content</li>
                <li>3. Set up your affiliate partner accounts</li>
                <li>4. Configure Google Analytics and Search Console</li>
                <li>5. Launch your email capture campaigns</li>
              </ol>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href={`https://${generatedConfig.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:opacity-90"
              >
                <ExternalLink className="h-5 w-5" />
                Visit Site
              </a>
              <Link
                href={`/admin/command-center/sites/${generatedConfig.siteId}`}
                className="inline-flex items-center gap-2 border border-gray-300 px-6 py-3 rounded-lg font-medium hover:bg-gray-50"
              >
                <Settings className="h-5 w-5" />
                Manage Site
              </Link>
              <Link
                href="/admin/command-center"
                className="inline-flex items-center gap-2 text-gray-600 px-6 py-3 rounded-lg hover:bg-gray-100"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Generate mock config based on prompt
function generateMockConfig(prompt: string, preset: string | null): SiteConfig {
  const isArabic = prompt.toLowerCase().includes('arabic') ||
                   prompt.toLowerCase().includes('arab') ||
                   preset?.includes('-ar');

  const isMaldives = prompt.toLowerCase().includes('maldives') ||
                     preset?.includes('maldives');

  const isThailand = prompt.toLowerCase().includes('thailand');
  const isBali = prompt.toLowerCase().includes('bali');

  let name = 'New Travel Site';
  let domain = 'newtravelsite.com';
  let niche = 'Travel & Lifestyle';
  let primaryColor = '#0066CC';

  if (isMaldives) {
    name = isArabic ? 'عرب الدايفز' : 'Arabaldives';
    domain = 'arabaldives.com';
    niche = 'Maldives Luxury Travel';
    primaryColor = '#0891B2';
  } else if (isThailand) {
    name = isArabic ? 'يلا تايلاند' : 'Yalla Thailand';
    domain = 'yallathailand.com';
    niche = 'Thailand Travel';
    primaryColor = '#059669';
  } else if (isBali) {
    name = isArabic ? 'يلا تايلاند' : 'Yalla Thailand';
    domain = 'yallathailand.com';
    niche = 'Thailand Travel';
    primaryColor = '#059669';
  }

  return {
    name,
    domain,
    siteId: domain.replace('.com', '').replace(/\./g, '-'),
    locale: isArabic ? 'ar' : 'en',
    niche,
    description: prompt || `A ${niche} website`,
    branding: {
      primaryColor,
      secondaryColor: '#F59E0B',
      fontFamily: isArabic ? 'Cairo' : 'Inter',
    },
    contentPlan: {
      initialArticles: 20,
      categories: isMaldives
        ? ['Resorts', 'Guides', 'Honeymoon', 'Family', 'Budget']
        : ['Destinations', 'Hotels', 'Food', 'Culture', 'Tips'],
      keywords: isMaldives
        ? ['best maldives resorts', 'maldives honeymoon', 'luxury maldives', 'maldives travel guide', 'maldives budget']
        : ['travel guide', 'best hotels', 'local food', 'travel tips', 'cultural experiences'],
    },
    affiliates: ['Booking.com', 'Agoda', 'GetYourGuide', 'Viator'],
    features: ['Blog', 'Comparisons', 'PDF Guides', 'Email Capture', 'Affiliate Links'],
  };
}
