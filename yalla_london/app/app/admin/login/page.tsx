'use client'

import { useState, useEffect } from 'react'
import { Eye, EyeOff, Lock, Mail, User, Shield, RefreshCw } from 'lucide-react'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [needsSetup, setNeedsSetup] = useState(false)
  const [needsMigration, setNeedsMigration] = useState(false)
  const [isMigrating, setIsMigrating] = useState(false)
  const [checkingSetup, setCheckingSetup] = useState(true)
  const [systemHealth, setSystemHealth] = useState<Record<string, string> | null>(null)
  const [showResetOption, setShowResetOption] = useState(false)

  // Handle ?error= from NextAuth redirects (e.g. after failed signIn)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const err = params.get('error')
    if (err) {
      if (err === 'CredentialsSignin') {
        setError('Invalid email or password.')
      } else {
        setError(`Sign-in error: ${err}`)
      }
      // Clean the URL so it doesn't persist on refresh
      window.history.replaceState({}, '', '/admin/login')
    }
  }, [])

  // Check migration → setup → health sequentially to avoid race conditions
  useEffect(() => {
    async function initChecks() {
      try {
        const migRes = await fetch('/api/admin/migrate')
        const migData = await migRes.json()
        if (migData.needsMigration) {
          setNeedsMigration(true)
          setNeedsSetup(true)
          setCheckingSetup(false)
          return
        }
      } catch { /* ignore */ }

      try {
        const setupRes = await fetch('/api/admin/setup')
        const setupData = await setupRes.json()
        setNeedsSetup(setupData.needsSetup === true)
        if (setupData.dbError) {
          setNeedsMigration(true)
        }
      } catch {
        setNeedsSetup(false)
      } finally {
        setCheckingSetup(false)
      }

      try {
        const healthRes = await fetch('/api/admin/login')
        const healthData = await healthRes.json()
        if (healthData.checks) {
          setSystemHealth(healthData.checks)
        }
      } catch { /* ignore */ }
    }
    initChecks()
  }, [])

  const handleMigration = async () => {
    setIsMigrating(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/admin/migrate', { method: 'POST' })
      const data = await res.json()

      if (data.status === 'ok' || data.status === 'partial') {
        setSuccess(data.message || 'Database updated successfully!')
        setNeedsMigration(false)
        const setupRes = await fetch('/api/admin/setup')
        const setupData = await setupRes.json()
        setNeedsSetup(setupData.needsSetup === true)
      } else {
        setError(`Migration failed: ${data.error || 'Unknown error'}`)
      }
    } catch {
      setError('Migration request failed. Check network connection.')
    } finally {
      setIsMigrating(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      // Single step: POST to /api/admin/login which:
      // 1. Verifies credentials (with specific error messages)
      // 2. Creates a NextAuth-compatible JWT
      // 3. Sets the session cookie in the response
      // No NextAuth route handler involved at all.
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        const msg = data.error || 'Login failed'
        const detail = data.detail ? `\n${data.detail}` : ''

        if (res.status === 401) {
          setShowResetOption(true)
        }

        if (msg.includes('NEXTAUTH_SECRET')) {
          setError('NEXTAUTH_SECRET is not set in your Vercel environment variables. Add it and redeploy.')
        } else if (msg.includes('column') || msg.includes('does not exist')) {
          setNeedsMigration(true)
          setError('Database schema is outdated. Run the migration above.')
        } else {
          setError(msg + detail)
        }
        return
      }

      // Session cookie is set. Redirect to dashboard.
      setSuccess('Signed in! Redirecting...')
      window.location.href = '/admin'
    } catch (err) {
      setIsLoading(false)
      setSuccess('')
      setError(`Connection error: ${err instanceof Error ? err.message : 'Please try again.'}`)
    }
  }

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      const setupRes = await fetch('/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, name: name.trim() }),
      })

      const setupData = await setupRes.json()

      if (!setupRes.ok || !setupData.success) {
        const msg = setupData.error || 'Setup failed. Please try again.'
        const detail = setupData.detail ? `\n${setupData.detail}` : ''
        setError(msg + detail)
        return
      }

      setSuccess('Admin account created! Signing you in...')

      // Now login to set the session cookie
      const loginRes = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })

      if (loginRes.ok) {
        window.location.href = '/admin'
        return
      }
    } catch {
      setIsLoading(false)
      setSuccess('')
      setError('Connection error. Please check your network and try again.')
    }
  }

  const handleResetAdmin = async () => {
    setShowResetOption(false)
    setNeedsSetup(true)
    setError('')
    setSuccess('Enter your email and a NEW password below to reset your admin account.')
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
                  {needsMigration
                    ? 'Run the database migration below, then create your account.'
                    : 'Create your admin account to access the dashboard.'}
                </p>
              </div>
            </div>
          )}

          {needsMigration && (
            <div className="mb-5 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm font-medium text-amber-900">Database Update Required</p>
              <p className="text-xs text-amber-700 mt-1">
                The database is missing columns needed for authentication. Run the migration to add them.
              </p>
              <button
                type="button"
                onClick={handleMigration}
                disabled={isMigrating}
                className="mt-2 px-3 py-1.5 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-md disabled:opacity-50"
              >
                {isMigrating ? 'Updating database...' : 'Run Database Migration'}
              </button>
            </div>
          )}

          <form className="space-y-5 sm:space-y-6" onSubmit={needsSetup ? handleSetup : handleLogin}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm whitespace-pre-wrap">
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
                disabled={isLoading || needsMigration}
                className="w-full flex justify-center py-3 sm:py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-base sm:text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
              >
                {needsMigration
                  ? 'Run migration first'
                  : isLoading
                    ? (needsSetup ? 'Creating account...' : 'Signing in...')
                    : (needsSetup ? 'Create Admin Account' : 'Sign in')}
              </button>
            </div>
          </form>

          {/* Reset admin option — shown when login fails with wrong credentials */}
          {showResetOption && !needsSetup && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleResetAdmin}
                className="w-full flex items-center justify-center gap-2 py-2 text-sm text-purple-600 hover:text-purple-700 font-medium"
              >
                <RefreshCw className="h-4 w-4" />
                Forgot password? Reset admin account
              </button>
            </div>
          )}
        </div>

        {/* System health indicator */}
        {systemHealth && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs font-medium text-gray-500 mb-2">System Status</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(systemHealth).map(([key, value]) => {
                const isOk = value === 'SET' || value === 'working' || value === 'available' || value.startsWith('connected')
                const isMissing = value === 'MISSING' || value.startsWith('error') || value.startsWith('import error')
                return (
                  <span
                    key={key}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                      isOk ? 'bg-green-100 text-green-700' :
                      isMissing ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isOk ? 'bg-green-500' : isMissing ? 'bg-red-500' : 'bg-gray-400'}`} />
                    {key}: {value}
                  </span>
                )
              })}
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
