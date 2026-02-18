'use client'

import { useState } from 'react'
import { 
  Edit3, 
  Eye, 
  Save, 
  Upload,
  Brain,
  Globe,
  Smartphone,
  Monitor,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Clock,
  Tag,
  Link,
  Image,
  Video,
  MapPin,
  Hash,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  DollarSign
} from 'lucide-react'

export default function PastePreviewEditor() {
  const [activeView, setActiveView] = useState('split') // 'edit', 'preview', 'split'
  const [deviceView, setDeviceView] = useState('desktop') // 'desktop', 'mobile'
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')
  const [titleAr, setTitleAr] = useState('')
  const [slug, setSlug] = useState('')
  const [locale, setLocale] = useState('en')
  const [pageType, setPageType] = useState('guide')
  const [primaryKeyword, setPrimaryKeyword] = useState('')
  const [longTail1, setLongTail1] = useState('')
  const [longTail2, setLongTail2] = useState('')
  const [authorityLink1, setAuthorityLink1] = useState('')
  const [authorityLink2, setAuthorityLink2] = useState('')
  const [authorityLink3, setAuthorityLink3] = useState('')
  const [authorityLink4, setAuthorityLink4] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [tags, setTags] = useState('')
  const [ogImage, setOgImage] = useState('')
  const [ogVideo, setOgVideo] = useState('')
  const [isRewriting, setIsRewriting] = useState(false)
  const [seoScore, setSeoScore] = useState(0)

  const handlePasteFromWord = () => {
    // Simulate pasting from Word
    const wordContent = `
# Best Luxury Hotels in Mayfair

Mayfair is one of London's most prestigious areas, home to some of the world's finest luxury hotels. Here's our guide to the best options.

## The Ritz London

The Ritz London is an iconic luxury hotel that has been welcoming guests since 1906. Located on Piccadilly, it offers:

- 136 elegantly appointed rooms and suites
- Michelin-starred dining at The Ritz Restaurant
- The world-famous Afternoon Tea in The Palm Court
- A luxurious spa and fitness center

## The Connaught

The Connaught is a sophisticated hotel that combines traditional British elegance with contemporary luxury. Features include:

- 121 individually designed rooms and suites
- Three Michelin-starred restaurants
- The Connaught Bar, one of the world's best cocktail bars
- A holistic wellness spa

## The Berkeley

The Berkeley offers a modern take on luxury hospitality with:

- 190 contemporary rooms and suites
- Rooftop pool with stunning London views
- Michelin-starred dining at Marcus
- The Blue Bar, a chic cocktail destination

## Conclusion

These luxury hotels in Mayfair offer unparalleled service, exquisite dining, and sumptuous accommodations. Whether you're visiting for business or pleasure, you'll find the perfect base for your London stay.
    `
    setContent(wordContent)
    setTitle('Best Luxury Hotels in Mayfair')
    setSlug('best-luxury-hotels-mayfair')
    setPrimaryKeyword('luxury hotels mayfair')
    setLongTail1('best luxury hotels mayfair london')
    setLongTail2('5 star hotels mayfair london')
    setExcerpt('Discover the finest luxury hotels in Mayfair, London\'s most prestigious area. From The Ritz to The Connaught, find your perfect stay.')
    setTags('hotels, mayfair, luxury, london')
  }

  const handleRewriteWithAI = async () => {
    setIsRewriting(true)
    // Simulate AI rewriting
    setTimeout(() => {
      const rewrittenContent = `
# The Ultimate Guide to Mayfair's Most Luxurious Hotels

Mayfair stands as London's crown jewel of sophistication, where history meets contemporary luxury in perfect harmony. This prestigious district is home to some of the world's most celebrated hotels, each offering an unparalleled experience of British elegance and world-class service.

## The Ritz London: A Timeless Icon

Since its grand opening in 1906, The Ritz London has epitomized luxury hospitality. This magnificent hotel on Piccadilly continues to set the standard for opulent accommodation with:

- **136 Exquisite Rooms and Suites**: Each space is a masterpiece of Edwardian elegance, featuring original architectural details and modern amenities
- **Michelin-Starred Culinary Excellence**: The Ritz Restaurant offers an unforgettable dining experience with innovative British cuisine
- **World-Famous Afternoon Tea**: The Palm Court's legendary tea service is a quintessential London experience
- **Luxury Wellness**: A state-of-the-art spa and fitness center for complete relaxation

## The Connaught: Sophisticated Elegance

The Connaught represents the perfect fusion of traditional British charm and contemporary luxury. This distinguished hotel offers:

- **121 Individually Crafted Suites**: Each room tells a unique story of refined taste and comfort
- **Triple Michelin-Starred Dining**: Three exceptional restaurants showcase the finest in culinary artistry
- **Award-Winning Cocktails**: The Connaught Bar is globally recognized as one of the world's premier cocktail destinations
- **Holistic Wellness**: A comprehensive spa offering treatments that restore both body and soul

## The Berkeley: Modern Luxury Redefined

The Berkeley brings a fresh perspective to luxury hospitality with its contemporary approach:

- **190 Stylish Rooms and Suites**: Modern design meets timeless comfort in every space
- **Rooftop Oasis**: A stunning pool area offering panoramic views of London's skyline
- **Culinary Innovation**: Marcus restaurant delivers Michelin-starred dining with a modern twist
- **Trendsetting Bar Scene**: The Blue Bar sets the standard for sophisticated nightlife

## Your Perfect Mayfair Experience Awaits

These exceptional hotels in Mayfair don't just provide accommodation—they offer gateways to London's most exclusive experiences. Whether you're seeking a romantic getaway, a business retreat, or a cultural adventure, these luxury establishments provide the perfect foundation for an unforgettable London stay.

Each hotel's unique character and world-class amenities ensure that your visit to Mayfair will be nothing short of extraordinary.
      `
      setContent(rewrittenContent)
      setSeoScore(92)
      setIsRewriting(false)
    }, 3000)
  }

  const handleSave = async () => {
    if (!content) {
      alert('Please add some content before saving')
      return
    }

    if (!title) {
      alert('Please add a title before saving')
      return
    }

    try {
      const response = await fetch('/api/admin/editor/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          titleAr,
          slug,
          locale,
          pageType,
          primaryKeyword,
          longTail1,
          longTail2,
          authorityLink1,
          authorityLink2,
          authorityLink3,
          authorityLink4,
          excerpt,
          tags,
          content,
          ogImage,
          ogVideo,
          seoScore
        })
      })

      if (response.ok) {
        const result = await response.json()
        alert(`Article saved successfully! ID: ${result.id}`)
        console.log('Article saved:', result)
      } else {
        const error = await response.json()
        alert(`Failed to save article: ${error.error || 'Unknown error'}`)
        console.error('Save error:', error)
      }
    } catch (error) {
      console.error('Error saving article:', error)
      alert('Failed to save article. Please try again.')
    }
  }

  const handleAiReview = async () => {
    if (!content) {
      alert('Please paste some content first')
      return
    }

    setIsRewriting(true)
    try {
      // Simulate AI review and auto-generation
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Auto-generate title if not provided
      if (!title) {
        const generatedTitle = content.split('\n')[0].replace(/^#+\s*/, '').substring(0, 60)
        setTitle(generatedTitle)
      }
      
      // Auto-generate slug if not provided
      if (!slug) {
        const generatedSlug = title.toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .substring(0, 50)
        setSlug(generatedSlug)
      }
      
      // Auto-generate keywords based on content
      const contentLower = content.toLowerCase()
      const keywordSuggestions = []
      if (contentLower.includes('hotel')) keywordSuggestions.push('hotels')
      if (contentLower.includes('restaurant')) keywordSuggestions.push('restaurants')
      if (contentLower.includes('london')) keywordSuggestions.push('london')
      if (contentLower.includes('luxury')) keywordSuggestions.push('luxury')
      if (contentLower.includes('mayfair')) keywordSuggestions.push('mayfair')
      if (contentLower.includes('travel')) keywordSuggestions.push('travel')
      if (contentLower.includes('guide')) keywordSuggestions.push('guide')
      
      if (keywordSuggestions.length > 0) {
        setPrimaryKeyword(keywordSuggestions.join(', '))
      }
      
      // Auto-generate longtails
      const generatedLongtails = [
        `best ${keywordSuggestions[0] || 'places'} in london`,
        `london ${keywordSuggestions[0] || 'guide'} 2024`,
        `top london ${keywordSuggestions[0] || 'attractions'}`
      ]
      setLongTail1(generatedLongtails[0])
      setLongTail2(generatedLongtails[1])
      
      // Auto-detect locale
      const hasArabic = /[\u0600-\u06FF]/.test(content)
      setLocale(hasArabic ? 'ar' : 'en')
      
      // Auto-generate excerpt
      if (!excerpt) {
        const firstParagraph = content.split('\n\n')[1] || content.split('\n')[1] || content
        const generatedExcerpt = firstParagraph.substring(0, 160) + '...'
        setExcerpt(generatedExcerpt)
      }
      
      // TODO: connect to real SEO scoring API
      setSeoScore(0)
      
      alert('AI Review completed! All fields have been auto-generated based on your content.')
    } catch (error) {
      console.error('AI review failed:', error)
      alert('AI review failed. Please try again.')
    } finally {
      setIsRewriting(false)
    }
  }

  const embeds = [
    { type: 'youtube', name: 'YouTube Video', icon: Video },
    { type: 'instagram', name: 'Instagram Post', icon: Image },
    { type: 'tiktok', name: 'TikTok Video', icon: Video },
    { type: 'maps', name: 'Google Maps', icon: MapPin },
    { type: 'affiliate', name: 'Affiliate Link', icon: DollarSign }
  ]

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Edit3 className="h-6 w-6 text-blue-500" />
              Paste & Preview Editor
            </h1>
            <p className="text-gray-600 text-sm">Word paste, rewrite, embeds, save to DB</p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* View Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveView('edit')}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  activeView === 'edit' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Edit3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setActiveView('split')}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  activeView === 'split' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Eye className="h-4 w-4" />
              </button>
              <button
                onClick={() => setActiveView('preview')}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  activeView === 'preview' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Monitor className="h-4 w-4" />
              </button>
            </div>

            {/* Device Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDeviceView('desktop')}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  deviceView === 'desktop' ? 'bg-gray-100 text-gray-700' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Monitor className="h-4 w-4" />
              </button>
              <button
                onClick={() => setDeviceView('mobile')}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  deviceView === 'mobile' ? 'bg-gray-100 text-gray-700' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Smartphone className="h-4 w-4" />
              </button>
            </div>

            {/* Action Buttons */}
            <button
              onClick={handlePasteFromWord}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
            >
              <Upload className="h-4 w-4" />
              Paste from Word
            </button>
            
            <button
              onClick={handleRewriteWithAI}
              disabled={isRewriting}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors disabled:opacity-50"
            >
              <Brain className="h-4 w-4" />
              {isRewriting ? 'Rewriting...' : 'Rewrite with AI'}
            </button>
            
            <button
              onClick={handleAiReview}
              disabled={isRewriting}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors disabled:opacity-50"
            >
              <CheckCircle className="h-4 w-4" />
              {isRewriting ? 'Analyzing...' : 'AI Review'}
            </button>
            
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              <Save className="h-4 w-4" />
              Save
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Form */}
        {(activeView === 'edit' || activeView === 'split') && (
          <div className="w-1/3 bg-white border-r border-gray-200 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Article Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Title (EN)</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter article title"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Title (AR)</label>
                    <input
                      type="text"
                      value={titleAr}
                      onChange={(e) => setTitleAr(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter Arabic title"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Slug</label>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="article-slug"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Locale</label>
                      <select
                        value={locale}
                        onChange={(e) => setLocale(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="en">English</option>
                        <option value="ar">Arabic</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Page Type</label>
                      <select
                        value={pageType}
                        onChange={(e) => setPageType(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="guide">Guide</option>
                        <option value="event">Event</option>
                        <option value="shopping">Shopping</option>
                        <option value="general">General</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* SEO Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">SEO Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Primary Keyword</label>
                    <input
                      type="text"
                      value={primaryKeyword}
                      onChange={(e) => setPrimaryKeyword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="primary keyword"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Long-tail 1</label>
                    <input
                      type="text"
                      value={longTail1}
                      onChange={(e) => setLongTail1(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="first long-tail keyword"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Long-tail 2</label>
                    <input
                      type="text"
                      value={longTail2}
                      onChange={(e) => setLongTail2(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="second long-tail keyword"
                    />
                  </div>
                </div>
              </div>

              {/* Authority Links */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Authority Links</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Authority Link 1</label>
                    <input
                      type="url"
                      value={authorityLink1}
                      onChange={(e) => setAuthorityLink1(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://example.com"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Authority Link 2</label>
                    <input
                      type="url"
                      value={authorityLink2}
                      onChange={(e) => setAuthorityLink2(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://example.com"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Authority Link 3</label>
                    <input
                      type="url"
                      value={authorityLink3}
                      onChange={(e) => setAuthorityLink3(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://example.com"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Authority Link 4</label>
                    <input
                      type="url"
                      value={authorityLink4}
                      onChange={(e) => setAuthorityLink4(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://example.com"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Excerpt</label>
                    <textarea
                      value={excerpt}
                      onChange={(e) => setExcerpt(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Article excerpt"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                    <input
                      type="text"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="tag1, tag2, tag3"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">OG Image</label>
                    <input
                      type="url"
                      value={ogImage}
                      onChange={(e) => setOgImage(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">OG Video</label>
                    <input
                      type="url"
                      value={ogVideo}
                      onChange={(e) => setOgVideo(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://example.com/video.mp4"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Right Panel - Editor/Preview */}
        <div className="flex-1 flex flex-col">
          {/* Editor Toolbar */}
          {(activeView === 'edit' || activeView === 'split') && (
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-2">
              <div className="flex items-center gap-2">
                <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded">
                  <Bold className="h-4 w-4" />
                </button>
                <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded">
                  <Italic className="h-4 w-4" />
                </button>
                <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded">
                  <Underline className="h-4 w-4" />
                </button>
                <div className="w-px h-6 bg-gray-300 mx-2"></div>
                <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded">
                  <AlignLeft className="h-4 w-4" />
                </button>
                <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded">
                  <AlignCenter className="h-4 w-4" />
                </button>
                <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded">
                  <AlignRight className="h-4 w-4" />
                </button>
                <div className="w-px h-6 bg-gray-300 mx-2"></div>
                <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded">
                  <List className="h-4 w-4" />
                </button>
                <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded">
                  <ListOrdered className="h-4 w-4" />
                </button>
                <div className="w-px h-6 bg-gray-300 mx-2"></div>
                <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded">
                  <Link className="h-4 w-4" />
                </button>
                <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded">
                  <Image className="h-4 w-4" />
                </button>
                <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded">
                  <Video className="h-4 w-4" />
                </button>
                <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded">
                  <MapPin className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Editor/Preview Content */}
          <div className="flex-1 flex">
            {/* Editor */}
            {(activeView === 'edit' || activeView === 'split') && (
              <div className={`${activeView === 'split' ? 'w-1/2' : 'w-full'} flex flex-col`}>
                <div className="flex-1 p-4">
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full h-full border border-gray-300 rounded-md p-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Start writing your article here, or paste content from Word..."
                  />
                </div>
              </div>
            )}

            {/* Preview */}
            {(activeView === 'preview' || activeView === 'split') && (
              <div className={`${activeView === 'split' ? 'w-1/2' : 'w-full'} flex flex-col border-l border-gray-200`}>
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">Preview</span>
                      <span className="text-xs text-gray-500">
                        {deviceView === 'desktop' ? 'Desktop' : 'Mobile'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">SEO Score:</span>
                      <span className={`text-sm font-medium ${
                        seoScore === 0 ? 'text-gray-400' :
                        seoScore >= 90 ? 'text-green-600' :
                        seoScore >= 70 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {seoScore === 0 ? 'Not scored' : `${seoScore}%`}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 p-4 overflow-y-auto">
                  <div className={`${deviceView === 'mobile' ? 'max-w-sm mx-auto' : 'max-w-4xl mx-auto'}`}>
                    {content ? (
                      <div className="prose prose-lg max-w-none">
                        <div dangerouslySetInnerHTML={{ 
                          __html: content
                            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
                            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
                            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
                            .replace(/^\* (.*$)/gim, '<li>$1</li>')
                            .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
                            .replace(/\*(.*)\*/gim, '<em>$1</em>')
                            .replace(/\n/gim, '<br>')
                        }} />
                      </div>
                    ) : (
                      <div className="text-center text-gray-500 py-12">
                        <Edit3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>Start writing to see the preview</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
