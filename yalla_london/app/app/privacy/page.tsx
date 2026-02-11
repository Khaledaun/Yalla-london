'use client'

import { useLanguage } from '@/components/language-provider'
import { getTranslation } from '@/lib/i18n'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function PrivacyPolicy() {
  const { language, isRTL } = useLanguage()
  const t = (key: string) => getTranslation(language, key)

  return (
    <div className={`container mx-auto px-6 py-12 max-w-4xl ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-charcoal mb-4">
          {t('privacyPolicy') || 'Privacy Policy'}
        </h1>
        <p className="text-stone">
          Last updated: {new Date().toLocaleDateString()}
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Information We Collect</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Personal Information</h3>
              <p className="text-stone">
                When you contact us, subscribe to our newsletter, or interact with our services, we may collect:
              </p>
              <ul className="list-disc list-inside mt-2 text-stone space-y-1">
                <li>Name and email address</li>
                <li>Contact preferences</li>
                <li>Location data (for London-specific content)</li>
                <li>Communication history</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Usage Information</h3>
              <p className="text-stone">
                We automatically collect information about how you use our website:
              </p>
              <ul className="list-disc list-inside mt-2 text-stone space-y-1">
                <li>Pages visited and time spent</li>
                <li>Device and browser information</li>
                <li>IP address (anonymized)</li>
                <li>Referral sources</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How We Use Your Information</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside text-stone space-y-2">
              <li>Provide and improve our London travel and lifestyle content</li>
              <li>Send you newsletters and updates (with your consent)</li>
              <li>Respond to your inquiries and provide customer support</li>
              <li>Analyze usage patterns to enhance user experience</li>
              <li>Ensure website security and prevent fraud</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Protection & Your Rights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-stone">
              Under GDPR and UK data protection laws, you have the right to:
            </p>
            <ul className="list-disc list-inside text-stone space-y-1">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Request data deletion</li>
              <li>Object to data processing</li>
              <li>Data portability</li>
              <li>Withdraw consent at any time</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cookies & Tracking</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-stone mb-3">
              We use cookies and similar technologies to:
            </p>
            <ul className="list-disc list-inside text-stone space-y-1">
              <li>Remember your preferences and settings</li>
              <li>Analyze website performance and usage</li>
              <li>Provide social media features</li>
              <li>Show relevant content and advertisements</li>
            </ul>
            <p className="text-stone mt-3">
              You can control cookies through your browser settings or our cookie consent banner.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Security</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-stone">
              We implement appropriate technical and organizational measures to protect your personal data, including:
            </p>
            <ul className="list-disc list-inside mt-2 text-stone space-y-1">
              <li>SSL encryption for data transmission</li>
              <li>Secure server infrastructure</li>
              <li>Regular security audits</li>
              <li>Access controls and authentication</li>
              <li>Data anonymization where possible</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Third-Party Services</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-stone mb-3">
              Our website may integrate with third-party services:
            </p>
            <ul className="list-disc list-inside text-stone space-y-1">
              <li>Google Analytics (for website analytics)</li>
              <li>Social media platforms (for content sharing)</li>
              <li>Email marketing services (for newsletters)</li>
              <li>Content delivery networks (for performance)</li>
            </ul>
            <p className="text-stone mt-3">
              These services have their own privacy policies which we encourage you to review.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact Us</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-stone">
              For any privacy-related questions or to exercise your rights, please contact us:
            </p>
            <div className="mt-3 text-stone">
              <p>Email: privacy@yalla-london.com</p>
              <p>Address: London, United Kingdom</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}