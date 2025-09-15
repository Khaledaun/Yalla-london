
'use client'

import { useState, useEffect } from 'react'
import { signIn, getSession, signOut } from 'next-auth/react'
import { useLanguage } from './language-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Shield, Eye, EyeOff, Mail } from 'lucide-react'

interface AdminAuthProps {
  onAuthenticated: (isAuth: boolean) => void
}

export function AdminAuth({ onAuthenticated }: AdminAuthProps) {
  const { language } = useLanguage()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Check if already authenticated with NextAuth
    const checkAuth = async () => {
      const session = await getSession()
      if (session?.user) {
        onAuthenticated(true)
      }
    }
    checkAuth()
  }, [onAuthenticated])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email: username, // Can accept either username or email
        password: password,
        redirect: false
      })

      if (result?.ok) {
        onAuthenticated(true)
      } else {
        setError(language === 'en' ? 'Invalid username or password' : 'اسم مستخدم أو كلمة مرور خاطئة')
      }
    } catch (error) {
      console.error('Login error:', error)
      setError(language === 'en' ? 'Login failed. Please try again.' : 'فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.')
    }
    
    setIsLoading(false)
  }

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    setError('')

    try {
      const result = await signIn('google', {
        redirect: false,
        callbackUrl: '/admin'
      })

      if (result?.ok) {
        onAuthenticated(true)
      } else if (result?.error) {
        setError(language === 'en' ? 'Google sign-in failed. Please try again.' : 'فشل تسجيل الدخول عبر جوجل. يرجى المحاولة مرة أخرى.')
      }
    } catch (error) {
      console.error('Google sign-in error:', error)
      setError(language === 'en' ? 'Google sign-in failed. Please try again.' : 'فشل تسجيل الدخول عبر جوجل. يرجى المحاولة مرة أخرى.')
    }

    setIsLoading(false)
  }

  const handleLogout = async () => {
    await signOut({ redirect: false })
    onAuthenticated(false)
    setUsername('')
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
              <Label htmlFor="username">
                {language === 'en' ? 'Username or Email' : 'اسم المستخدم أو البريد الإلكتروني'}
              </Label>
              <div className="relative">
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={language === 'en' ? 'Enter username or email' : 'أدخل اسم المستخدم أو البريد الإلكتروني'}
                  required
                />
                <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>

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
                  placeholder={language === 'en' ? 'Enter password' : 'أدخل كلمة المرور'}
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

          {/* Google Sign-in Section */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">
                  {language === 'en' ? 'Or continue with' : 'أو تابع مع'}
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full mt-4 border-gray-300 hover:bg-gray-50"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {language === 'en' ? 'Sign in with Google' : 'تسجيل الدخول عبر جوجل'}
            </Button>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              {language === 'en'
                ? 'Default credentials: admin / YallaLondon24! • For security purposes, please log out after use.'
                : 'بيانات افتراضية: admin / YallaLondon24! • لأغراض الأمان، يرجى تسجيل الخروج بعد الاستخدام.'
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
  
  const handleLogout = async () => {
    await signOut({ redirect: false })
    onLogout()
  }
  
  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleLogout}
      className="border-red-200 text-red-600 hover:bg-red-50"
    >
      {language === 'en' ? 'Logout' : 'خروج'}
    </Button>
  )
}
