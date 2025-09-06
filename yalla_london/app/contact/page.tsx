
'use client'

import { useState } from 'react'
import { useLanguage } from '@/components/language-provider'
import { getTranslation } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Mail, MapPin, Phone, MessageSquare } from 'lucide-react'
import { motion } from 'framer-motion'

export default function ContactPage() {
  const { language, isRTL } = useLanguage()
  const t = (key: string) => getTranslation(language, key)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // Simulate form submission
    setTimeout(() => {
      setIsSubmitting(false)
      setSubmitted(true)
    }, 2000)
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-8"
        >
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <MessageSquare className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {language === 'en' ? 'Thank You!' : 'شكراً لك!'}
          </h2>
          <p className="text-gray-600 mb-6">
            {language === 'en' 
              ? 'Your message has been sent. We\'ll get back to you soon!'
              : 'تم إرسال رسالتك. سنعاود الاتصال بك قريباً!'
            }
          </p>
          <Button onClick={() => setSubmitted(false)}>
            {language === 'en' ? 'Send Another Message' : 'إرسال رسالة أخرى'}
          </Button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gray-50 py-20 ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="max-w-6xl mx-auto px-6">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-4xl font-bold gradient-text mb-4">
            {language === 'en' ? 'Get in Touch' : 'تواصل معنا'}
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {language === 'en' 
              ? 'Have questions about London? Need personalized recommendations? We\'re here to help make your London experience unforgettable.'
              : 'لديك أسئلة حول لندن؟ تحتاج توصيات شخصية؟ نحن هنا لمساعدتك في جعل تجربتك في لندن لا تُنسى.'
            }
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <Card className="border-0 luxury-shadow">
              <CardHeader>
                <CardTitle className="text-2xl text-gray-900">
                  {language === 'en' ? 'Send us a message' : 'أرسل لنا رسالة'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">
                        {language === 'en' ? 'First Name' : 'الاسم الأول'}
                      </Label>
                      <Input id="firstName" required />
                    </div>
                    <div>
                      <Label htmlFor="lastName">
                        {language === 'en' ? 'Last Name' : 'اسم العائلة'}
                      </Label>
                      <Input id="lastName" required />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="email">
                      {language === 'en' ? 'Email Address' : 'عنوان البريد الإلكتروني'}
                    </Label>
                    <Input id="email" type="email" required />
                  </div>
                  
                  <div>
                    <Label htmlFor="subject">
                      {language === 'en' ? 'Subject' : 'الموضوع'}
                    </Label>
                    <Input id="subject" required />
                  </div>
                  
                  <div>
                    <Label htmlFor="message">
                      {language === 'en' ? 'Message' : 'الرسالة'}
                    </Label>
                    <Textarea 
                      id="message" 
                      rows={6} 
                      required 
                      placeholder={language === 'en' ? 'Tell us how we can help...' : 'أخبرنا كيف يمكننا المساعدة...'}
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-purple-800 hover:bg-purple-900" 
                    disabled={isSubmitting}
                  >
                    {isSubmitting 
                      ? (language === 'en' ? 'Sending...' : 'جاري الإرسال...') 
                      : (language === 'en' ? 'Send Message' : 'إرسال الرسالة')
                    }
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          {/* Contact Information */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="space-y-8"
          >
            <Card className="border-0 luxury-shadow">
              <CardContent className="p-8">
                <h3 className="text-xl font-bold text-gray-900 mb-6">
                  {language === 'en' ? 'Contact Information' : 'معلومات التواصل'}
                </h3>
                
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Mail className="h-6 w-6 text-purple-800" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">
                        {language === 'en' ? 'Email' : 'البريد الإلكتروني'}
                      </h4>
                      <p className="text-gray-600">hello@yalla-london.com</p>
                      <p className="text-gray-600">partnerships@yalla-london.com</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Phone className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">
                        {language === 'en' ? 'Phone' : 'الهاتف'}
                      </h4>
                      <p className="text-gray-600">+44 20 7123 4567</p>
                      <p className="text-sm text-gray-500">
                        {language === 'en' ? 'Mon-Fri, 9AM-6PM GMT' : 'الإثنين-الجمعة، 9ص-6م توقيت غرينتش'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <MapPin className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">
                        {language === 'en' ? 'Location' : 'الموقع'}
                      </h4>
                      <p className="text-gray-600">
                        {language === 'en' 
                          ? 'London, United Kingdom'
                          : 'لندن، المملكة المتحدة'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 luxury-shadow bg-gradient-to-br from-purple-900 to-yellow-600 text-white">
              <CardContent className="p-8">
                <h3 className="text-xl font-bold mb-4">
                  {language === 'en' ? 'Follow Our Journey' : 'تابع رحلتنا'}
                </h3>
                <p className="mb-6 text-purple-100">
                  {language === 'en' 
                    ? 'Stay updated with the latest London discoveries and exclusive tips.'
                    : 'ابق على اطلاع بأحدث اكتشافات لندن والنصائح الحصرية.'
                  }
                </p>
                <div className="flex gap-4">
                  <Button 
                    variant="outline" 
                    className="border-white text-white hover:bg-white/10"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.open(process.env.NEXT_PUBLIC_INSTAGRAM_URL || 'https://instagram.com/yallalondon', '_blank');
                      }
                    }}
                  >
                    Instagram
                  </Button>
                  <Button 
                    variant="outline" 
                    className="border-white text-white hover:bg-white/10"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.open(process.env.NEXT_PUBLIC_TIKTOK_URL || 'https://tiktok.com/@yallalondon', '_blank');
                      }
                    }}
                  >
                    TikTok
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
