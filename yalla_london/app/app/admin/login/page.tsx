'use client'

import { useState, useEffect } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Lock, Mail, User, Shield } from 'lucide-react'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [needsSetup, setNeedsSetup] = useState(false)
  const [checkingSetup, setCheckingSetup] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Check if initial setup is needed + handle NextAuth error redirects
  useEffect(() => {
    // NextAuth redirects here with ?error= on auth failures
    const authError = searchParams.get('error')
    if (authError) {
      const errorMessages: Record<string, string> = {
        CredentialsSignin: 'Invalid email or password.',
        Configuration: 'Server configuration error. Please contact support.',
        AccessDenied: 'Access denied.',
        Default: 'An authentication error occurred.',
      }
      setError(errorMessages[authError] || errorMessages.Default)
    }

    async function checkSetup() {
      try {
        const res = await fetch('/api/admin/setup')
        const data = await res.json()
        setNeedsSetup(data.needsSetup === true)
      } catch {
        // If check fails, show normal login
        setNeedsSetup(false)
      } finally {
        setCheckingSetup(false)
      }
    }
    checkSetup()
  }, [searchParams])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        // Show the actual error type for debugging
        if (result.error === 'CredentialsSignin') {
          setError('Invalid email or password.')
        } else {
          setError(`Login error: ${result.error}`)
        }
      } else if (result?.ok) {
        const session = await getSession()
        if (session) {
          router.push('/admin')
        } else {
          setError('Login succeeded but session not found. Please try again.')
        }
      } else {
        setError('Login failed. Please try again.')
      }
    } catch (err) {
      setError(`Connection error: ${err instanceof Error ? err.message : 'Please try again.'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setSuccess('Admin account created! Signing you in...')
        // Auto-sign in after creating account
        const result = await signIn('credentials', {
          email,
          password,
          redirect: false,
        })

        if (result?.error) {
          setSuccess('')
          setError('Account created but auto-login failed. Please sign in manually.')
          setNeedsSetup(false)
        } else {
          const session = await getSession()
          if (session) {
            router.push('/admin')
          } else {
            setNeedsSetup(false)
            setSuccess('Account created! Please sign in.')
          }
        }
      } else {
        setError(data.error || 'Setup failed. Please try again.')
      }
    } catch {
      setError('Connection error. Please check your network and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (checkingSetup) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center shadow-lg shadow-purple-500/30 mx-auto mb-4 animate-pulse">
            <span className="text-white font-bold text-xl">Y</span>
          </div>
          <p className="text-sm text-gray-500">Checking system status...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-md">
        <div className="flex justify-center">
          <div className="w-14 h-14 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30">
            <span className="text-white font-bold text-2xl sm:text-xl">Y</span>
          </div>
        </div>
        <h2 className="mt-5 text-center text-2xl sm:text-3xl font-extrabold text-gray-900">
          {needsSetup ? 'Welcome to Yalla Admin' : 'Admin Login'}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {needsSetup
            ? 'Create your admin account to get started'
            : 'Sign in to the Yalla London dashboard'}
        </p>
      </div>

      <div className="mt-6 sm:mt-8 mx-auto w-full max-w-md">
        <div className="bg-white py-6 sm:py-8 px-5 sm:px-10 shadow-sm sm:shadow rounded-xl sm:rounded-lg">
          {needsSetup && (
            <div className="mb-5 p-3 bg-purple-50 border border-purple-200 rounded-lg flex items-start gap-3">
              <Shield className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-purple-900">First-time setup</p>
                <p className="text-xs text-purple-700 mt-0.5">
                  No admin account exists yet. Create one to access the dashboard.
                </p>
              </div>
            </div>
          )}

          <form className="space-y-5 sm:space-y-6" onSubmit={needsSetup ? handleSetup : handleLogin}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                {success}
              </div>
            )}

            {needsSetup && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Your name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="appearance-none block w-full pl-10 pr-3 py-3 sm:py-2.5 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-base sm:text-sm"
                    placeholder="Your name"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full pl-10 pr-3 py-3 sm:py-2.5 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-base sm:text-sm"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={needsSetup ? 'new-password' : 'current-password'}
                  required
                  minLength={needsSetup ? 8 : undefined}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full pl-10 pr-12 py-3 sm:py-2.5 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-base sm:text-sm"
                  placeholder={needsSetup ? 'Choose a password (8+ characters)' : 'Enter your password'}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <button
                    type="button"
                    className="p-1 text-gray-400 hover:text-gray-500 focus:outline-none"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
              {needsSetup && (
                <p className="mt-1.5 text-xs text-gray-500">
                  Minimum 8 characters. This will be your admin login.
                </p>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3 sm:py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-base sm:text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
              >
                {isLoading
                  ? (needsSetup ? 'Creating account...' : 'Signing in...')
                  : (needsSetup ? 'Create Admin Account' : 'Sign in')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
