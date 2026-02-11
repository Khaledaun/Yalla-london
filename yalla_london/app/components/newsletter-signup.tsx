
'use client'

import { useState } from 'react'
import { useLanguage } from './language-provider'
import { getTranslation } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Mail, Gift, Check } from 'lucide-react'
import { motion } from 'framer-motion'

export function NewsletterSignup() {
  const { language } = useLanguage()
  const t = (key: string) => getTranslation(language, key)
  const [email, setEmail] = useState('')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setIsLoading(true)
    
    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          language,
          source: 'homepage_signup'
        })
      })

      const data = await response.json()

      if (data.success) {
        setIsSubscribed(true)
      } else {
        console.error('Subscription failed:', data.error)
        // Handle error - you might want to show an error message
      }
    } catch (error) {
      console.error('Subscription error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isSubscribed) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center p-6 bg-cream rounded-lg"
      >
        <div className="w-16 h-16 bg-cream-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="h-8 w-8 text-forest" />
        </div>
        <h3 className="text-xl font-bold text-forest mb-2">
          {language === 'en' ? 'Welcome to Yalla London!' : 'مرحباً بك في يالا لندن!'}
        </h3>
        <p className="text-forest">
          {language === 'en' 
            ? 'Check your email for your free London luxury guide'
            : 'تحقق من بريدك الإلكتروني للحصول على دليل لندن الفاخر المجاني'
          }
        </p>
      </motion.div>
    )
  }

  return (
    <Card className="border-0 luxury-shadow bg-gradient-to-br from-cream to-cream-100">
      <CardContent className="p-8">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 bg-london-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Gift className="h-6 w-6 text-london-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-charcoal mb-2">
              {language === 'en' 
                ? 'Get Your Free London Luxury Guide' 
                : 'احصل على دليل لندن الفاخر المجاني'
              }
            </h3>
            <p className="text-stone text-sm">
              {language === 'en'
                ? 'Exclusive insider tips, hidden gems, and luxury experiences delivered to your inbox'
                : 'نصائح حصرية من الداخل وكنوز مخفية وتجارب فاخرة تصل إلى صندوق الوارد'
              }
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-stone" />
              <Input
                type="email"
                placeholder={language === 'en' ? 'Enter your email' : 'أدخل بريدك الإلكتروني'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
            <Button 
              type="submit" 
              className="bg-london-800 hover:bg-london-900 px-6"
              disabled={isLoading}
            >
              {isLoading 
                ? (language === 'en' ? 'Sending...' : 'جاري الإرسال...') 
                : (language === 'en' ? 'Get Guide' : 'احصل على الدليل')
              }
            </Button>
          </div>
          
          <p className="text-xs text-stone">
            {language === 'en'
              ? 'No spam, unsubscribe anytime. Your email is safe with us.'
              : 'لا رسائل مزعجة، إلغاء الاشتراك في أي وقت. بريدك الإلكتروني آمن معنا.'
            }
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
