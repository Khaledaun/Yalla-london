'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/components/language-provider'
import { getTranslation } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Mail, Phone, MapPin, Send, MessageSquare, Star } from 'lucide-react'
import { toast } from 'sonner'
import { SITES, getDefaultSiteId } from '@/config/sites'

const SITE_DOMAIN = SITES[getDefaultSiteId()]?.domain || Object.values(SITES)[0]?.domain || 'zenitha.luxury'
const CONTACT_EMAIL = `hello@${SITE_DOMAIN}`
const PRESS_EMAIL = `press@${SITE_DOMAIN}`

interface ContactFormData {
  name: string
  email: string
  phone?: string
  subject: string
  category: string
  message: string
  priority: 'low' | 'medium' | 'high'
  consent: boolean
  newsletter: boolean
}

export default function YallaContactPage() {
  const { language, isRTL } = useLanguage()
  const t = (key: string) => getTranslation(language, key)

  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    phone: '',
    subject: '',
    category: '',
    message: '',
    priority: 'medium',
    consent: false,
    newsletter: false
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const categories = [
    { value: 'general', label: 'General Inquiry' },
    { value: 'feedback', label: 'Feedback' },
    { value: 'suggestion', label: 'Content Suggestion' },
    { value: 'partnership', label: 'Partnership' },
    { value: 'press', label: 'Press Inquiry' },
    { value: 'technical', label: 'Technical Issue' },
    { value: 'legal', label: 'Legal/Privacy' },
    { value: 'other', label: 'Other' }
  ]

  const handleInputChange = (field: keyof ContactFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.consent) {
      toast?.error?.('Please accept our privacy policy to continue') || alert('Please accept our privacy policy to continue')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setSubmitted(true)
        toast?.success?.('Thank you! Your message has been sent successfully.') || alert('Thank you! Your message has been sent successfully.')

        // Reset form
        setFormData({
          name: '',
          email: '',
          phone: '',
          subject: '',
          category: '',
          message: '',
          priority: 'medium',
          consent: false,
          newsletter: false
        })
      } else {
        throw new Error('Failed to send message')
      }
    } catch (error) {
      toast?.error?.('Something went wrong. Please try again later.') || alert('Something went wrong. Please try again later.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className={`container mx-auto px-6 py-12 max-w-2xl ${isRTL ? 'rtl' : 'ltr'}`}>
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-cream-100 rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="h-8 w-8 text-forest" />
            </div>
            <CardTitle className="text-2xl text-forest">Message Sent!</CardTitle>
            <CardDescription>
              Thank you for contacting us. We&apos;ll get back to you within 24 hours.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => setSubmitted(false)} variant="outline">
              Send Another Message
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={`container mx-auto px-6 py-12 max-w-6xl ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-charcoal mb-4">
          {t('contactUs') || 'Contact Us'}
        </h1>
        <p className="text-stone text-lg">
          Get in touch with the Yalla London team. We&apos;d love to hear from you!
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Contact Information */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Get in Touch</CardTitle>
              <CardDescription>
                Multiple ways to reach us
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-yalla-gold-500 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-medium">Email</h4>
                  <p className="text-sm text-stone">{CONTACT_EMAIL}</p>
                  <p className="text-sm text-stone">For general inquiries</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Star className="h-5 w-5 text-yalla-gold-500 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-medium">Press & Partnerships</h4>
                  <p className="text-sm text-stone">{PRESS_EMAIL}</p>
                  <p className="text-sm text-stone">For media and collaboration</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-yalla-gold-500 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-medium">Location</h4>
                  <p className="text-sm text-stone">London, United Kingdom</p>
                  <p className="text-sm text-stone">Covering all of London</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Response Times</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span>General inquiries:</span>
                  <span className="font-medium">24 hours</span>
                </div>
                <div className="flex justify-between">
                  <span>Press requests:</span>
                  <span className="font-medium">48 hours</span>
                </div>
                <div className="flex justify-between">
                  <span>Technical issues:</span>
                  <span className="font-medium">12 hours</span>
                </div>
                <div className="flex justify-between">
                  <span>Partnerships:</span>
                  <span className="font-medium">3-5 days</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contact Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Send us a Message</CardTitle>
              <CardDescription>
                Fill out the form below and we&apos;ll get back to you as soon as possible
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      required
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      required
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Phone (Optional)</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="+44 ..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => handleInputChange('category', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="subject">Subject *</Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => handleInputChange('subject', e.target.value)}
                    required
                    placeholder="Brief description of your inquiry"
                  />
                </div>

                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => handleInputChange('priority', value as 'low' | 'medium' | 'high')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low - General inquiry</SelectItem>
                      <SelectItem value="medium">Medium - Standard request</SelectItem>
                      <SelectItem value="high">High - Urgent matter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="message">Message *</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => handleInputChange('message', e.target.value)}
                    required
                    placeholder="Please provide detailed information about your inquiry..."
                    rows={6}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="consent"
                      checked={formData.consent}
                      onCheckedChange={(checked) => handleInputChange('consent', checked as boolean)}
                      required
                    />
                    <Label htmlFor="consent" className="text-sm">
                      I agree to the{' '}
                      <Link href="/privacy" className="text-thames-500 hover:underline">
                        Privacy Policy
                      </Link>{' '}
                      and consent to my data being processed for this inquiry. *
                    </Label>
                  </div>

                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="newsletter"
                      checked={formData.newsletter}
                      onCheckedChange={(checked) => handleInputChange('newsletter', checked as boolean)}
                    />
                    <Label htmlFor="newsletter" className="text-sm">
                      Subscribe to our newsletter for London updates and recommendations (optional)
                    </Label>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting || !formData.consent}
                  className="w-full"
                >
                  {isSubmitting ? (
                    'Sending...'
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send Message
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
