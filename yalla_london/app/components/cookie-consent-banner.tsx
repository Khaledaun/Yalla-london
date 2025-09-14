'use client'

import { useState, useEffect } from 'react'
import { X, Settings, Cookie } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { useLanguage } from '@/components/language-provider'
import { getTranslation } from '@/lib/i18n'

interface CookiePreferences {
  necessary: boolean
  analytics: boolean
  marketing: boolean
  functional: boolean
}

export function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true, // Always required
    analytics: false,
    marketing: false,
    functional: false
  })

  const { language } = useLanguage()
  const t = (key: string) => getTranslation(language, key)

  useEffect(() => {
    // Check if user has already made a choice
    const cookieConsent = localStorage.getItem('cookieConsent')
    if (!cookieConsent) {
      setIsVisible(true)
    } else {
      // Load saved preferences
      try {
        const savedPrefs = JSON.parse(cookieConsent)
        setPreferences(savedPrefs)
        applyCookieSettings(savedPrefs)
      } catch (error) {
        setIsVisible(true)
      }
    }
  }, [])

  const applyCookieSettings = (prefs: CookiePreferences) => {
    // Apply analytics cookies
    if (prefs.analytics && typeof window !== 'undefined') {
      // Enable Google Analytics
      if (process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID) {
        const script = document.createElement('script')
        script.src = `https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID}`
        document.head.appendChild(script)
        
        const script2 = document.createElement('script')
        script2.innerHTML = `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID}', {
            anonymize_ip: true,
            cookie_flags: 'secure;samesite=strict'
          });
        `
        document.head.appendChild(script2)
      }
    }

    // Apply functional cookies (preferences, language settings, etc.)
    if (prefs.functional) {
      // Enable preference cookies
      document.cookie = 'functional_cookies=enabled; path=/; secure; samesite=strict; max-age=31536000'
    }

    // Apply marketing cookies
    if (prefs.marketing) {
      // Enable marketing/advertising cookies
      document.cookie = 'marketing_cookies=enabled; path=/; secure; samesite=strict; max-age=31536000'
    }
  }

  const handleAcceptAll = () => {
    const allAccepted = {
      necessary: true,
      analytics: true,
      marketing: true,
      functional: true
    }
    setPreferences(allAccepted)
    localStorage.setItem('cookieConsent', JSON.stringify(allAccepted))
    applyCookieSettings(allAccepted)
    setIsVisible(false)
  }

  const handleAcceptSelected = () => {
    localStorage.setItem('cookieConsent', JSON.stringify(preferences))
    applyCookieSettings(preferences)
    setIsVisible(false)
  }

  const handleRejectAll = () => {
    const rejected = {
      necessary: true, // Always required
      analytics: false,
      marketing: false,
      functional: false
    }
    setPreferences(rejected)
    localStorage.setItem('cookieConsent', JSON.stringify(rejected))
    applyCookieSettings(rejected)
    setIsVisible(false)
  }

  const handlePreferenceChange = (key: keyof CookiePreferences, value: boolean) => {
    if (key === 'necessary') return // Cannot disable necessary cookies
    setPreferences(prev => ({ ...prev, [key]: value }))
  }

  if (!isVisible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-black bg-opacity-50">
      <Card className="max-w-4xl mx-auto">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cookie className="h-5 w-5" />
              <CardTitle className="text-lg">Cookie Preferences</CardTitle>
            </div>
            {!showSettings && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsVisible(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          {!showSettings ? (
            <div>
              <p className="text-sm text-gray-600 mb-4">
                We use cookies to enhance your experience, analyze site usage, and provide personalized content. 
                You can choose which cookies to accept below. Essential cookies are always active.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  onClick={handleAcceptAll}
                  className="flex-1"
                >
                  Accept All
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => setShowSettings(true)}
                  className="flex-1"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Customize
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={handleRejectAll}
                  className="flex-1"
                >
                  Reject Non-Essential
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4">
                {/* Necessary Cookies */}
                <div className="flex items-center justify-between p-3 border rounded">
                  <div className="flex-1">
                    <h4 className="font-medium">Necessary Cookies</h4>
                    <p className="text-sm text-gray-600">
                      Essential for website functionality, security, and basic features.
                    </p>
                  </div>
                  <Switch checked={true} disabled />
                </div>

                {/* Analytics Cookies */}
                <div className="flex items-center justify-between p-3 border rounded">
                  <div className="flex-1">
                    <h4 className="font-medium">Analytics Cookies</h4>
                    <p className="text-sm text-gray-600">
                      Help us understand how visitors interact with our website.
                    </p>
                  </div>
                  <Switch 
                    checked={preferences.analytics}
                    onCheckedChange={(checked) => handlePreferenceChange('analytics', checked)}
                  />
                </div>

                {/* Functional Cookies */}
                <div className="flex items-center justify-between p-3 border rounded">
                  <div className="flex-1">
                    <h4 className="font-medium">Functional Cookies</h4>
                    <p className="text-sm text-gray-600">
                      Remember your preferences and enhance functionality.
                    </p>
                  </div>
                  <Switch 
                    checked={preferences.functional}
                    onCheckedChange={(checked) => handlePreferenceChange('functional', checked)}
                  />
                </div>

                {/* Marketing Cookies */}
                <div className="flex items-center justify-between p-3 border rounded">
                  <div className="flex-1">
                    <h4 className="font-medium">Marketing Cookies</h4>
                    <p className="text-sm text-gray-600">
                      Used to show relevant advertisements and measure campaign effectiveness.
                    </p>
                  </div>
                  <Switch 
                    checked={preferences.marketing}
                    onCheckedChange={(checked) => handlePreferenceChange('marketing', checked)}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleAcceptSelected} className="flex-1">
                  Save Preferences
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowSettings(false)}
                  className="flex-1"
                >
                  Back
                </Button>
              </div>
            </div>
          )}
          
          <p className="text-xs text-gray-500 mt-4">
            By continuing to use our website, you agree to our{' '}
            <a href="/privacy" className="underline hover:text-gray-700">Privacy Policy</a> and{' '}
            <a href="/terms" className="underline hover:text-gray-700">Terms of Use</a>.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}