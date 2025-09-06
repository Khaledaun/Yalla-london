
'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from './language-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Shield, Eye, EyeOff } from 'lucide-react'

interface AdminAuthProps {
  onAuthenticated: (isAuth: boolean) => void
}

export function AdminAuth({ onAuthenticated }: AdminAuthProps) {
  const { language } = useLanguage()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Check if already authenticated
    const isAuth = localStorage.getItem('yalla-admin-auth') === 'true'
    if (isAuth) {
      onAuthenticated(true)
    }
  }, [onAuthenticated])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    // Simple password check (in production, this should be server-side with proper hashing)
    const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'YallaLondon2024!'
    
    if (password === adminPassword) {
      localStorage.setItem('yalla-admin-auth', 'true')
      onAuthenticated(true)
    } else {
      setError(language === 'en' ? 'Invalid password' : 'كلمة مرور خاطئة')
    }
    
    setIsLoading(false)
  }

  const handleLogout = () => {
    localStorage.removeItem('yalla-admin-auth')
    onAuthenticated(false)
    setPassword('')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-md border-0 luxury-shadow">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="h-8 w-8 text-purple-600" />
          </div>
          <CardTitle className="text-2xl text-gray-900">
            {language === 'en' ? 'Admin Access' : 'دخول المدير'}
          </CardTitle>
          <p className="text-gray-600">
            {language === 'en' 
              ? 'Enter your password to access the admin dashboard'
              : 'أدخل كلمة المرور للوصول إلى لوحة الإدارة'
            }
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="password">
                {language === 'en' ? 'Password' : 'كلمة المرور'}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={language === 'en' ? 'Enter admin password' : 'أدخل كلمة مرور المدير'}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-500" />
                  )}
                </Button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full bg-purple-800 hover:bg-purple-900"
              disabled={isLoading}
            >
              {isLoading 
                ? (language === 'en' ? 'Verifying...' : 'جاري التحقق...') 
                : (language === 'en' ? 'Access Dashboard' : 'دخول اللوحة')
              }
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              {language === 'en'
                ? 'For security purposes, please use a strong password and log out after use.'
                : 'لأغراض الأمان، يرجى استخدام كلمة مرور قوية وتسجيل الخروج بعد الاستخدام.'
              }
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function AdminLogoutButton({ onLogout }: { onLogout: () => void }) {
  const { language } = useLanguage()
  
  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={onLogout}
      className="border-red-200 text-red-600 hover:bg-red-50"
    >
      {language === 'en' ? 'Logout' : 'خروج'}
    </Button>
  )
}
