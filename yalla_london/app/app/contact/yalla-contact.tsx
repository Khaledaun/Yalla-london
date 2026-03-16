'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/components/language-provider'
import { getTranslation } from '@/lib/i18n'
import { Mail, MapPin, Send, MessageSquare, Star } from 'lucide-react'
import { toast } from 'sonner'
import { SITES, getDefaultSiteId } from '@/config/sites'
import { TriBar, BrandButton, BrandCardLight, SectionLabel, WatermarkStamp, Breadcrumbs } from '@/components/brand-kit'

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
    name: '', email: '', phone: '', subject: '', category: '', message: '',
    priority: 'medium', consent: false, newsletter: false
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (response.ok) {
        setSubmitted(true)
        toast?.success?.('Thank you! Your message has been sent successfully.') || alert('Thank you! Your message has been sent successfully.')
        setFormData({ name: '', email: '', phone: '', subject: '', category: '', message: '', priority: 'medium', consent: false, newsletter: false })
      } else {
        throw new Error('Failed to send message')
      }
    } catch {
      toast?.error?.('Something went wrong. Please try again later.') || alert('Something went wrong. Please try again later.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className={`bg-yl-cream min-h-screen pt-28 ${isRTL ? 'rtl' : 'ltr'}`}>
        <div className="max-w-2xl mx-auto px-7 py-12">
          <BrandCardLight className="p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-yl-cream rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="h-8 w-8 text-yl-red" />
            </div>
            <h2 className="text-2xl font-heading font-bold text-yl-charcoal mb-2">Message Sent!</h2>
            <p className="text-yl-gray-500 font-body mb-6">
              Thank you for contacting us. We&apos;ll get back to you within 24 hours.
            </p>
            <BrandButton variant="outline" onClick={() => setSubmitted(false)}>
              Send Another Message
            </BrandButton>
          </BrandCardLight>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-yl-cream min-h-screen ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Hero */}
      <section className="bg-yl-dark-navy pt-28 pb-12 relative overflow-hidden">
        <WatermarkStamp />
        <div className="relative z-10 max-w-7xl mx-auto px-7 text-center">
          <Breadcrumbs items={[
            { label: 'Home', href: '/' },
            { label: 'Contact' },
          ]} />
          <SectionLabel>Get in Touch</SectionLabel>
          <h1 className="text-3xl md:text-4xl font-heading font-bold text-white mb-4">
            Contact Us
          </h1>
          <p className="text-yl-gray-400 text-lg font-body">
            Get in touch with the Yalla London team. We&apos;d love to hear from you!
          </p>
        </div>
      </section>

      <TriBar />

      <div className="max-w-7xl mx-auto px-7 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Information */}
          <div className="lg:col-span-1 space-y-6">
            <BrandCardLight className="p-6">
              <h3 className="font-heading font-bold text-yl-charcoal text-lg mb-1">Get in Touch</h3>
              <p className="text-sm text-yl-gray-500 font-body mb-6">Multiple ways to reach us</p>
              <div className="space-y-6">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-yl-gold mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-heading font-medium text-yl-charcoal">Email</h4>
                    <p className="text-sm text-yl-gray-500 font-body">{CONTACT_EMAIL}</p>
                    <p className="text-sm text-yl-gray-500 font-body">For general inquiries</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Star className="h-5 w-5 text-yl-gold mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-heading font-medium text-yl-charcoal">Press & Partnerships</h4>
                    <p className="text-sm text-yl-gray-500 font-body">{PRESS_EMAIL}</p>
                    <p className="text-sm text-yl-gray-500 font-body">For media and collaboration</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-yl-gold mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-heading font-medium text-yl-charcoal">Location</h4>
                    <p className="text-sm text-yl-gray-500 font-body">London, United Kingdom</p>
                    <p className="text-sm text-yl-gray-500 font-body">Covering all of London</p>
                  </div>
                </div>
              </div>
            </BrandCardLight>

            <BrandCardLight className="p-6">
              <h3 className="font-heading font-bold text-yl-charcoal text-lg mb-4">Response Times</h3>
              <div className="space-y-3 text-sm font-body">
                <div className="flex justify-between">
                  <span className="text-yl-gray-500">General inquiries:</span>
                  <span className="font-medium text-yl-charcoal">24 hours</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-yl-gray-500">Press requests:</span>
                  <span className="font-medium text-yl-charcoal">48 hours</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-yl-gray-500">Technical issues:</span>
                  <span className="font-medium text-yl-charcoal">12 hours</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-yl-gray-500">Partnerships:</span>
                  <span className="font-medium text-yl-charcoal">3-5 days</span>
                </div>
              </div>
            </BrandCardLight>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <BrandCardLight className="p-6 md:p-8">
              <h3 className="font-heading font-bold text-yl-charcoal text-lg mb-1">Send us a Message</h3>
              <p className="text-sm text-yl-gray-500 font-body mb-6">
                Fill out the form below and we&apos;ll get back to you as soon as possible
              </p>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block font-mono text-[10px] tracking-wider uppercase text-yl-gray-500 mb-1.5">Name *</label>
                    <input id="name" value={formData.name} onChange={(e) => handleInputChange('name', e.target.value)} required placeholder="Your full name"
                      className="w-full px-4 py-2.5 border border-yl-gray-200 rounded-[14px] font-body focus:outline-none focus:ring-2 focus:ring-yl-gold/30 focus:border-yl-gold" />
                  </div>
                  <div>
                    <label htmlFor="email" className="block font-mono text-[10px] tracking-wider uppercase text-yl-gray-500 mb-1.5">Email *</label>
                    <input id="email" type="email" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} required placeholder="your@email.com"
                      className="w-full px-4 py-2.5 border border-yl-gray-200 rounded-[14px] font-body focus:outline-none focus:ring-2 focus:ring-yl-gold/30 focus:border-yl-gold" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="phone" className="block font-mono text-[10px] tracking-wider uppercase text-yl-gray-500 mb-1.5">Phone (Optional)</label>
                    <input id="phone" type="tel" value={formData.phone} onChange={(e) => handleInputChange('phone', e.target.value)} placeholder="+44 ..."
                      className="w-full px-4 py-2.5 border border-yl-gray-200 rounded-[14px] font-body focus:outline-none focus:ring-2 focus:ring-yl-gold/30 focus:border-yl-gold" />
                  </div>
                  <div>
                    <label htmlFor="category" className="block font-mono text-[10px] tracking-wider uppercase text-yl-gray-500 mb-1.5">Category *</label>
                    <select id="category" value={formData.category} onChange={(e) => handleInputChange('category', e.target.value)}
                      className="w-full px-4 py-2.5 border border-yl-gray-200 rounded-[14px] font-body text-sm appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-yl-gold/30 focus:border-yl-gold">
                      <option value="">Select a category</option>
                      {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="subject" className="block font-mono text-[10px] tracking-wider uppercase text-yl-gray-500 mb-1.5">Subject *</label>
                  <input id="subject" value={formData.subject} onChange={(e) => handleInputChange('subject', e.target.value)} required placeholder="Brief description of your inquiry"
                    className="w-full px-4 py-2.5 border border-yl-gray-200 rounded-[14px] font-body focus:outline-none focus:ring-2 focus:ring-yl-gold/30 focus:border-yl-gold" />
                </div>

                <div>
                  <label htmlFor="priority" className="block font-mono text-[10px] tracking-wider uppercase text-yl-gray-500 mb-1.5">Priority</label>
                  <select id="priority" value={formData.priority} onChange={(e) => handleInputChange('priority', e.target.value as 'low' | 'medium' | 'high')}
                    className="w-full px-4 py-2.5 border border-yl-gray-200 rounded-[14px] font-body text-sm appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-yl-gold/30 focus:border-yl-gold">
                    <option value="low">Low - General inquiry</option>
                    <option value="medium">Medium - Standard request</option>
                    <option value="high">High - Urgent matter</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="block font-mono text-[10px] tracking-wider uppercase text-yl-gray-500 mb-1.5">Message *</label>
                  <textarea id="message" value={formData.message} onChange={(e) => handleInputChange('message', e.target.value)} required
                    placeholder="Please provide detailed information about your inquiry..." rows={6}
                    className="w-full px-4 py-2.5 border border-yl-gray-200 rounded-[14px] font-body focus:outline-none focus:ring-2 focus:ring-yl-gold/30 focus:border-yl-gold resize-none" />
                </div>

                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={formData.consent} onChange={(e) => handleInputChange('consent', e.target.checked)} required
                      className="mt-1 w-4 h-4 rounded border-yl-gray-300 text-yl-red focus:ring-yl-gold/30" />
                    <span className="text-sm text-yl-gray-500 font-body">
                      I agree to the{' '}
                      <Link href="/privacy" className="text-yl-red hover:underline">Privacy Policy</Link>{' '}
                      and consent to my data being processed for this inquiry. *
                    </span>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={formData.newsletter} onChange={(e) => handleInputChange('newsletter', e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-yl-gray-300 text-yl-red focus:ring-yl-gold/30" />
                    <span className="text-sm text-yl-gray-500 font-body">
                      Subscribe to our newsletter for London updates and recommendations (optional)
                    </span>
                  </label>
                </div>

                <BrandButton type="submit" variant="primary" className="w-full" disabled={isSubmitting || !formData.consent}>
                  {isSubmitting ? 'Sending...' : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send Message
                    </>
                  )}
                </BrandButton>
              </form>
            </BrandCardLight>
          </div>
        </div>
      </div>
    </div>
  )
}
