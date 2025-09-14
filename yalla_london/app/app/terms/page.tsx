'use client'

import { useLanguage } from '@/components/language-provider'
import { getTranslation } from '@/lib/i18n'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function TermsOfUse() {
  const { language, isRTL } = useLanguage()
  const t = (key: string) => getTranslation(language, key)

  return (
    <div className={`container mx-auto px-6 py-12 max-w-4xl ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          {t('termsOfUse') || 'Terms of Use'}
        </h1>
        <p className="text-gray-600">
          Last updated: {new Date().toLocaleDateString()}
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Acceptance of Terms</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">
              By accessing and using the Yalla London website, you accept and agree to be bound by the terms and 
              provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Description of Service</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">
              Yalla London provides information, recommendations, and content about London lifestyle, travel, dining, 
              events, and experiences. Our content is for informational purposes and to help users discover London.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Responsibilities</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 mb-3">You agree to use our website responsibly and:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              <li>Provide accurate information when contacting us</li>
              <li>Not use the site for any unlawful purpose</li>
              <li>Not attempt to harm or disrupt our services</li>
              <li>Respect intellectual property rights</li>
              <li>Not transmit spam, malware, or harmful content</li>
              <li>Comply with all applicable laws and regulations</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Content and Intellectual Property</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Our Content</h3>
              <p className="text-gray-700">
                All content on Yalla London, including text, images, graphics, logos, and design, is protected by 
                copyright and other intellectual property laws. You may view and print content for personal use only.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">User-Generated Content</h3>
              <p className="text-gray-700">
                Any content you submit to us (comments, feedback, suggestions) may be used by us without restriction. 
                You warrant that you own or have the right to submit such content.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Disclaimers and Limitations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Information Accuracy</h3>
              <p className="text-gray-700">
                While we strive to provide accurate and up-to-date information about London, we cannot guarantee 
                the accuracy, completeness, or timeliness of all content. Prices, hours, and availability may change.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">External Links</h3>
              <p className="text-gray-700">
                Our website may contain links to external websites. We are not responsible for the content, 
                privacy practices, or availability of external sites.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Limitation of Liability</h3>
              <p className="text-gray-700">
                To the fullest extent permitted by law, Yalla London shall not be liable for any indirect, 
                incidental, special, consequential, or punitive damages resulting from your use of our website.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Privacy and Data Protection</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">
              Your privacy is important to us. Please review our Privacy Policy to understand how we collect, 
              use, and protect your personal information in compliance with GDPR and UK data protection laws.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Changes to Terms</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">
              We reserve the right to modify these terms at any time. Changes will be effective immediately upon 
              posting on this page. Your continued use of the website constitutes acceptance of any changes.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Governing Law</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">
              These terms are governed by the laws of England and Wales. Any disputes shall be subject to the 
              exclusive jurisdiction of the courts of England and Wales.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">
              If you have any questions about these Terms of Use, please contact us:
            </p>
            <div className="mt-3 text-gray-700">
              <p>Email: legal@yalla-london.com</p>
              <p>Address: London, United Kingdom</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}