'use client'

import React, { useState, useEffect, useRef } from 'react'
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
  const emailRef = useRef<HTMLInputElement>(null)

  // Handle ?error= from NextAuth redirects
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const err = params.get('error')
    if (err) {
      if (err === 'CredentialsSignin') {
        setError('Invalid email or password.')
      } else {
        setError(`Sign-in error: ${err}`)
      }
      window.history.replaceState({}, '', '/admin/login')
    }
  }, [])

  // Check migration → setup → health sequentially
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

  // Auto-focus email field after setup check
  useEffect(() => {
    if (!checkingSetup && emailRef.current) {
      emailRef.current.focus()
    }
  }, [checkingSetup])

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

  // Shared input styles (neumorphic, large tap targets)
  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--neu-bg, #EDE9E1)',
    boxShadow: 'var(--neu-inset, inset 2px 2px 5px #CAC5BC, inset -2px -2px 5px #FFFFFF)',
    border: 'none',
    borderRadius: 12,
    fontSize: 15,
    color: '#1C1917',
    minHeight: 52,
  }

  const labelStyle: React.CSSProperties = {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 10,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: '#78716C',
    display: 'block',
    marginBottom: 8,
  }

  if (checkingSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center"
           style={{ backgroundColor: 'var(--neu-bg, #EDE9E1)' }}>
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse"
               style={{
                 backgroundColor: '#C8322B',
                 boxShadow: '4px 4px 12px var(--neu-shadow-dark, #CAC5BC), -2px -2px 6px rgba(200,50,43,0.2)',
               }}>
            <span style={{ fontFamily: "'Anybody', sans-serif", fontWeight: 800, fontSize: 22, color: '#FAF8F4' }}>Y</span>
          </div>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#78716C', textTransform: 'uppercase', letterSpacing: 1.5 }}>
            Checking system...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-5 py-8"
         style={{ backgroundColor: 'var(--neu-bg, #EDE9E1)' }}>
      <div className="mx-auto w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
               style={{
                 backgroundColor: '#C8322B',
                 boxShadow: '5px 5px 15px var(--neu-shadow-dark, #CAC5BC), -3px -3px 8px rgba(200,50,43,0.15)',
               }}>
            <span style={{ fontFamily: "'Anybody', sans-serif", fontWeight: 800, fontSize: 28, color: '#FAF8F4' }}>Y</span>
          </div>
        </div>

        <h1 className="mt-6 text-center" style={{
          fontFamily: "'Anybody', sans-serif",
          fontWeight: 800,
          fontSize: 22,
          color: '#1C1917',
        }}>
          {needsSetup ? 'Welcome' : 'Sign In'}
        </h1>
        <p className="mt-2 text-center" style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 11,
          color: '#78716C',
          letterSpacing: 0.5,
        }}>
          {needsSetup
            ? 'Create your admin account'
            : 'Yalla London Dashboard'}
        </p>

        {/* Card */}
        <div className="mt-8 rounded-2xl p-6"
             style={{ backgroundColor: 'var(--neu-bg, #EDE9E1)', boxShadow: 'var(--neu-raised, 6px 6px 16px #CAC5BC, -6px -6px 16px #FFFFFF)' }}>

          {/* Setup banner */}
          {needsSetup && (
            <div className="mb-5 p-4 rounded-xl flex items-start gap-3"
                 style={{ backgroundColor: 'rgba(200,50,43,0.06)', borderLeft: '3px solid #C8322B' }}>
              <Shield style={{ width: 18, height: 18, color: '#C8322B', flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#1C1917' }}>First-time setup</p>
                <p style={{ fontSize: 11, color: '#78716C', marginTop: 2 }}>
                  {needsMigration
                    ? 'Run the database migration, then create your account.'
                    : 'Create your admin account to access the dashboard.'}
                </p>
              </div>
            </div>
          )}

          {/* Migration banner */}
          {needsMigration && (
            <div className="mb-5 p-4 rounded-xl"
                 style={{ backgroundColor: 'rgba(217,119,6,0.06)', borderLeft: '3px solid #D97706' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#1C1917' }}>Database Update Required</p>
              <p style={{ fontSize: 11, color: '#78716C', marginTop: 2 }}>
                Missing columns needed for authentication.
              </p>
              <button
                type="button"
                onClick={handleMigration}
                disabled={isMigrating}
                className="mt-3 px-4 py-2.5 rounded-xl transition-all active:scale-[0.97] disabled:opacity-50"
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  color: '#FAF8F4',
                  backgroundColor: '#D97706',
                  minHeight: 44,
                }}
              >
                {isMigrating ? 'Updating...' : 'Run Migration'}
              </button>
            </div>
          )}

          <form className="space-y-5" onSubmit={needsSetup ? handleSetup : handleLogin}>
            {/* Error */}
            {error && (
              <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(200,50,43,0.08)', borderLeft: '3px solid #C8322B' }}>
                <p style={{ fontSize: 12, color: '#C8322B', whiteSpace: 'pre-wrap' }}>{error}</p>
              </div>
            )}

            {/* Success */}
            {success && (
              <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(22,163,74,0.08)', borderLeft: '3px solid #16A34A' }}>
                <p style={{ fontSize: 12, color: '#16A34A' }}>{success}</p>
              </div>
            )}

            {/* Name (setup only) */}
            {needsSetup && (
              <div>
                <label htmlFor="name" style={labelStyle}>Your name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User style={{ width: 18, height: 18, color: '#78716C' }} />
                  </div>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full pl-12 pr-4 py-3"
                    style={inputStyle}
                    placeholder="Your name"
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="email" style={labelStyle}>Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail style={{ width: 18, height: 18, color: '#78716C' }} />
                </div>
                <input
                  ref={emailRef}
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-12 pr-4 py-3"
                  style={inputStyle}
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" style={labelStyle}>Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock style={{ width: 18, height: 18, color: '#78716C' }} />
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
                  className="block w-full pl-12 pr-14 py-3"
                  style={inputStyle}
                  placeholder={needsSetup ? '8+ characters' : 'Enter password'}
                />
                <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
                  <button
                    type="button"
                    className="p-2 rounded-lg transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ color: '#78716C', minHeight: 44, minWidth: 44 }}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff style={{ width: 18, height: 18 }} /> : <Eye style={{ width: 18, height: 18 }} />}
                  </button>
                </div>
              </div>
              {needsSetup && (
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#A8A29E', marginTop: 6 }}>
                  Minimum 8 characters. This will be your admin login.
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading || needsMigration}
              className="w-full rounded-xl transition-all active:scale-[0.97] disabled:opacity-50"
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 12,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 1.5,
                color: '#FAF8F4',
                backgroundColor: '#C8322B',
                boxShadow: '4px 4px 12px var(--neu-shadow-dark, #CAC5BC), -2px -2px 6px rgba(200,50,43,0.15)',
                minHeight: 52,
              }}
            >
              {needsMigration
                ? 'Run migration first'
                : isLoading
                  ? (needsSetup ? 'Creating account...' : 'Signing in...')
                  : (needsSetup ? 'Create Admin Account' : 'Sign In')}
            </button>
          </form>

          {/* Reset option */}
          {showResetOption && !needsSetup && (
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(120,113,108,0.12)' }}>
              <button
                type="button"
                onClick={handleResetAdmin}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl transition-all"
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  color: '#C8322B',
                  minHeight: 44,
                }}
              >
                <RefreshCw style={{ width: 14, height: 14 }} />
                Reset admin account
              </button>
            </div>
          )}
        </div>

        {/* System health */}
        {systemHealth && (
          <div className="mt-5 p-4 rounded-xl"
               style={{ backgroundColor: 'var(--neu-bg, #EDE9E1)', boxShadow: 'var(--neu-inset, inset 2px 2px 5px #CAC5BC, inset -2px -2px 5px #FFFFFF)' }}>
            <p style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 9,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: 1.5,
              color: '#78716C',
              marginBottom: 8,
            }}>
              System Status
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(systemHealth).map(([key, value]) => {
                const strVal = value as string
                const isOk = strVal === 'SET' || strVal === 'working' || strVal === 'available' || strVal.startsWith('connected')
                const isMissing = strVal === 'MISSING' || strVal.startsWith('error') || strVal.startsWith('import error')
                const dotColor = isOk ? '#16A34A' : isMissing ? '#C8322B' : '#78716C'
                return (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg"
                    style={{
                      fontSize: 10,
                      color: isOk ? '#16A34A' : isMissing ? '#C8322B' : '#78716C',
                      backgroundColor: isOk ? 'rgba(22,163,74,0.08)' : isMissing ? 'rgba(200,50,43,0.08)' : 'rgba(120,113,108,0.08)',
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dotColor }} />
                    {key}
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
