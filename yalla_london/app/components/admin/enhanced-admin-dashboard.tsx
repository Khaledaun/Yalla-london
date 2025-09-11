
'use client'

import { useState } from 'react'
import { useLanguage } from '@/components/language-provider'
import { getTranslation } from '@/lib/i18n'
import { AdminAuth, AdminLogoutButton } from '@/components/admin-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Wand2, 
  Loader2, 
  FileText, 
  Lightbulb, 
  Save, 
  Languages, 
  Sparkles, 
  Shield, 
  Search, 
  BarChart3, 
  Target,
  TrendingUp,
  Users,
  DollarSign,
  Eye,
  Palette,
  Calendar,
  Settings,
  BookOpen
} from 'lucide-react'
import { motion } from 'framer-motion'
import { SeoManagementDashboard } from '@/components/admin/seo-dashboard'
import { ContentOptimizer } from '@/components/admin/content-optimizer'
import { ContentAutomationPanel } from '@/components/admin/content-automation-panel'
import { BrandCustomizationPanel } from '@/components/admin/brand-customization-panel'
import { SEOPerformanceDashboard } from '@/components/admin/seo-performance-dashboard'
import { ApiSettingsPanel } from '@/components/admin/api-settings-panel'
import { ContentCalendar } from '@/components/admin/content-calendar'
import { SocialEmbedsManager } from '@/components/admin/social-embeds-manager'
import { MediaLibrary } from '@/components/admin/media-library'
import { HomepageBuilder } from '@/components/admin/homepage-builder'
import { DatabaseBackupManager } from '@/components/admin/database-backup-manager'
import { TopicManager } from '@/components/admin/phase4b/TopicManager'

interface GeneratedContent {
  id: string
  type: string
  prompt: string
  content: string
  language: string
  created_at: string
}

export function EnhancedAdminDashboard() {
  const { language, isRTL } = useLanguage()
  const t = (key: string) => getTranslation(language, key)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [activeMainTab, setActiveMainTab] = useState('overview')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent[]>([])
  const [selectedTopic, setSelectedTopic] = useState('')
  const [customPrompt, setCustomPrompt] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'ar'>('en')
  const [contentType, setContentType] = useState('blog_topic')

  const predefinedTopics = {
    en: [
      'Luxury dining trends in London 2025',
      'Hidden Michelin-starred restaurants in London',
      'Best afternoon tea experiences in luxury hotels',
      'Exclusive shopping destinations in Mayfair',
      'Private art gallery viewings in London',
      'VIP experiences at London football matches',
      'Luxury spa retreats within London',
      'Fine dining with skyline views',
      'Historic pubs with royal connections',
      'Boutique hotel recommendations for couples'
    ],
    ar: [
      'اتجاهات الطعام الفاخر في لندن 2025',
      'مطاعم مخفية حاصلة على نجوم ميشلان في لندن',
      'أفضل تجارب شاي بعد الظهر في الفنادق الفاخرة',
      'وجهات التسوق الحصرية في مايفير',
      'عروض المعارض الفنية الخاصة في لندن',
      'تجارب VIP في مباريات كرة القدم في لندن',
      'منتجعات السبا الفاخرة في لندن',
      'تناول الطعام الراقي مع إطلالة على الأفق',
      'الحانات التاريخية ذات الصلات الملكية',
      'توصيات الفنادق البوتيك للأزواج'
    ]
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
  }

  const generateContent = async (prompt: string) => {
    if (!prompt.trim()) return

    setIsGenerating(true)
    try {
      const response = await fetch('/api/content/auto-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: contentType === 'blog_topic' ? 'blog_post' : contentType,
          category: selectedTopic || 'london-experiences',
          language: selectedLanguage,
          keywords: prompt.split(' ').slice(0, 5),
          customPrompt: prompt
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success && data.content) {
        const newContent: GeneratedContent = {
          id: data.content.id || Date.now().toString(),
          type: contentType,
          prompt: prompt,
          content: typeof data.content === 'string' ? data.content : JSON.stringify(data.content, null, 2),
          language: selectedLanguage,
          created_at: new Date().toISOString()
        }
        
        setGeneratedContent(prev => [newContent, ...prev])
      } else {
        console.error('Generation failed:', data.error || 'Unknown error')
      }
    } catch (error) {
      console.error('Error generating content:', error)
    }
    
    setIsGenerating(false)
  }

  if (!isAuthenticated) {
    return <AdminAuth onAuthenticated={setIsAuthenticated} />
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(language === 'en' ? 'en-US' : 'ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Admin Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Shield className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {language === 'en' ? 'Admin Dashboard' : 'لوحة الإدارة'}
              </h1>
              <p className="text-sm text-gray-500">
                {language === 'en' ? 'Yalla London Content Management & SEO' : 'إدارة محتوى وتحسين محركات البحث - يالا لندن'}
              </p>
            </div>
          </div>
          <AdminLogoutButton onLogout={handleLogout} />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 lg:grid-cols-13 mb-8">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              {language === 'en' ? 'Overview' : 'نظرة عامة'}
            </TabsTrigger>
            <TabsTrigger value="topics" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              {language === 'en' ? 'Topics' : 'المواضيع'}
            </TabsTrigger>
            <TabsTrigger value="automation" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              {language === 'en' ? 'Content Automation' : 'أتمتة المحتوى'}
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {language === 'en' ? 'Content Calendar' : 'تقويم المحتوى'}
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              {language === 'en' ? 'API Settings' : 'إعدادات API'}
            </TabsTrigger>
            <TabsTrigger value="brand" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              {language === 'en' ? 'Brand Config' : 'إعدادات العلامة'}
            </TabsTrigger>
            <TabsTrigger value="seo-performance" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              {language === 'en' ? 'SEO & Performance' : 'السيو والأداء'}
            </TabsTrigger>
            <TabsTrigger value="seo" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              {language === 'en' ? 'SEO Tools' : 'أدوات السيو'}
            </TabsTrigger>
            <TabsTrigger value="optimizer" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              {language === 'en' ? 'Content Optimizer' : 'محسن المحتوى'}
            </TabsTrigger>
            <TabsTrigger value="embeds" className="flex items-center gap-2">
              🎬
              {language === 'en' ? 'Social Embeds' : 'التضمينات'}
            </TabsTrigger>
            <TabsTrigger value="media" className="flex items-center gap-2">
              📸
              {language === 'en' ? 'Media Library' : 'مكتبة الوسائط'}
            </TabsTrigger>
            <TabsTrigger value="homepage" className="flex items-center gap-2">
              🏗️
              {language === 'en' ? 'Homepage' : 'الصفحة الرئيسية'}
            </TabsTrigger>
            <TabsTrigger value="database" className="flex items-center gap-2">
              🗄️
              {language === 'en' ? 'Database' : 'قاعدة البيانات'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {language === 'en' ? 'Total Visitors' : 'إجمالي الزوار'}
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">12,543</div>
                  <p className="text-xs text-muted-foreground">
                    {language === 'en' ? '+23% from last month' : '+23% من الشهر الماضي'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {language === 'en' ? 'Page Views' : 'مشاهدات الصفحة'}
                  </CardTitle>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">45,231</div>
                  <p className="text-xs text-muted-foreground">
                    {language === 'en' ? '+12% from last week' : '+12% من الأسبوع الماضي'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {language === 'en' ? 'Newsletter Subscribers' : 'مشتركو النشرة الإخبارية'}
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">2,456</div>
                  <p className="text-xs text-muted-foreground">
                    {language === 'en' ? '+89 this week' : '+89 هذا الأسبوع'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {language === 'en' ? 'Booking Revenue' : 'إيرادات الحجز'}
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">£12,450</div>
                  <p className="text-xs text-muted-foreground">
                    {language === 'en' ? '+34% from last month' : '+34% من الشهر الماضي'}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>
                    {language === 'en' ? 'Recent Activity' : 'النشاط الأخير'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <span className="text-sm">New blog post published: "Luxury Hotels in Mayfair"</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      <span className="text-sm">SEO score improved to 95% for homepage</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-purple-500 rounded-full" />
                      <span className="text-sm">142 new newsletter subscribers this week</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-orange-500 rounded-full" />
                      <span className="text-sm">Event "Wine Tasting at The Shard" fully booked</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>
                    {language === 'en' ? 'Quick Actions' : 'إجراءات سريعة'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    onClick={() => setActiveMainTab('content')} 
                    className="w-full justify-start"
                    variant="outline"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    {language === 'en' ? 'Generate New Content' : 'إنشاء محتوى جديد'}
                  </Button>
                  <Button 
                    onClick={() => setActiveMainTab('seo')} 
                    className="w-full justify-start"
                    variant="outline"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    {language === 'en' ? 'Check SEO Health' : 'فحص صحة تحسين محركات البحث'}
                  </Button>
                  <Button 
                    onClick={() => setActiveMainTab('optimizer')} 
                    className="w-full justify-start"
                    variant="outline"
                  >
                    <Target className="h-4 w-4 mr-2" />
                    {language === 'en' ? 'Optimize Content' : 'تحسين المحتوى'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="content" className="space-y-6">
            {/* Original Content Generation UI */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Content Generation Panel */}
              <div className="lg:col-span-2">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  <Card className="border-0 luxury-shadow">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-purple-600" />
                        {t('contentGeneration')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Settings */}
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="content-type">Content Type</Label>
                          <Select value={contentType} onValueChange={setContentType}>
                            <SelectTrigger id="content-type">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="blog_topic">
                                {language === 'en' ? 'Blog Topics' : 'مواضيع المدونة'}
                              </SelectItem>
                              <SelectItem value="blog_content">
                                {language === 'en' ? 'Blog Content' : 'محتوى المدونة'}
                              </SelectItem>
                              <SelectItem value="recommendation">
                                {language === 'en' ? 'Recommendations' : 'التوصيات'}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="language">
                            <Languages className="inline h-4 w-4 mr-1" />
                            Language
                          </Label>
                          <Select value={selectedLanguage} onValueChange={(value: 'en' | 'ar') => setSelectedLanguage(value)}>
                            <SelectTrigger id="language">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="en">English</SelectItem>
                              <SelectItem value="ar">العربية</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Topic Selection */}
                      <Tabs defaultValue="predefined" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="predefined" className="flex items-center gap-2">
                            <Lightbulb className="h-4 w-4" />
                            {language === 'en' ? 'Suggested Topics' : 'مواضيع مقترحة'}
                          </TabsTrigger>
                          <TabsTrigger value="custom" className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {language === 'en' ? 'Custom Prompt' : 'موضوع مخصص'}
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="predefined" className="space-y-4">
                          <div className="grid gap-2 max-h-64 overflow-y-auto">
                            {predefinedTopics[selectedLanguage].map((topic, index) => (
                              <motion.div
                                key={index}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <Button
                                  variant={selectedTopic === topic ? "default" : "ghost"}
                                  className="w-full justify-start h-auto p-3 text-left"
                                  onClick={() => setSelectedTopic(topic)}
                                >
                                  {topic}
                                </Button>
                              </motion.div>
                            ))}
                          </div>
                          
                          <Button
                            onClick={() => generateContent(selectedTopic)}
                            disabled={!selectedTopic || isGenerating}
                            className="w-full"
                            size="lg"
                          >
                            {isGenerating ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {language === 'en' ? 'Generating...' : 'جاري الإنشاء...'}
                              </>
                            ) : (
                              <>
                                <Wand2 className="mr-2 h-4 w-4" />
                                {t('generateContent')}
                              </>
                            )}
                          </Button>
                        </TabsContent>

                        <TabsContent value="custom" className="space-y-4">
                          <div>
                            <Label htmlFor="custom-prompt">
                              {language === 'en' ? 'Custom Topic or Prompt' : 'موضوع أو موجه مخصص'}
                            </Label>
                            <Textarea
                              id="custom-prompt"
                              placeholder={language === 'en' 
                                ? 'Enter your custom topic or detailed prompt...' 
                                : 'أدخل موضوعك المخصص أو الموجه المفصل...'
                              }
                              value={customPrompt}
                              onChange={(e) => setCustomPrompt(e.target.value)}
                              className="min-h-[100px] mt-2"
                            />
                          </div>
                          
                          <Button
                            onClick={() => generateContent(customPrompt)}
                            disabled={!customPrompt.trim() || isGenerating}
                            className="w-full"
                            size="lg"
                          >
                            {isGenerating ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {language === 'en' ? 'Generating...' : 'جاري الإنشاء...'}
                              </>
                            ) : (
                              <>
                                <Wand2 className="mr-2 h-4 w-4" />
                                {t('generateContent')}
                              </>
                            )}
                          </Button>
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Generated Content Display */}
              {generatedContent.length > 0 && (
                <div className="lg:col-span-2">
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                  >
                    <Card className="border-0 luxury-shadow">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-green-600" />
                          {language === 'en' ? 'Generated Content' : 'المحتوى المُنشأ'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4 max-h-96 overflow-y-auto">
                          {generatedContent.map((content, index) => (
                            <motion.div
                              key={content.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.4, delay: index * 0.1 }}
                              className="p-4 bg-gray-50 rounded-lg"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant={content.language === 'en' ? 'default' : 'secondary'}>
                                    {content.language.toUpperCase()}
                                  </Badge>
                                  <Badge variant="outline">
                                    {content.type}
                                  </Badge>
                                </div>
                                <span className="text-xs text-gray-500">
                                  {formatDate(content.created_at)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">
                                <strong>{language === 'en' ? 'Prompt:' : 'الموجه:'}</strong> {content.prompt}
                              </p>
                              <div className="text-sm text-gray-800 whitespace-pre-wrap border-t pt-2">
                                {content.content}
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="topics">
            <TopicManager />
          </TabsContent>

          <TabsContent value="automation">
            <ContentAutomationPanel />
          </TabsContent>

          <TabsContent value="calendar">
            <ContentCalendar />
          </TabsContent>

          <TabsContent value="settings">
            <ApiSettingsPanel />
          </TabsContent>

          <TabsContent value="brand">
            <BrandCustomizationPanel />
          </TabsContent>

          <TabsContent value="seo-performance">
            <SEOPerformanceDashboard />
          </TabsContent>

          <TabsContent value="seo">
            <SeoManagementDashboard />
          </TabsContent>

          <TabsContent value="optimizer">
            <ContentOptimizer />
          </TabsContent>

          <TabsContent value="embeds">
            <SocialEmbedsManager />
          </TabsContent>

          <TabsContent value="media">
            <MediaLibrary />
          </TabsContent>

          <TabsContent value="homepage">
            <HomepageBuilder />
          </TabsContent>

          <TabsContent value="database">
            <DatabaseBackupManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
