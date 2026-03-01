'use client'

import { useState, useEffect, useCallback } from 'react'

interface AdminUser {
  id: string
  email: string
  name: string | null
  role: string
}

interface AdminSession {
  user: AdminUser
}

type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated'

/**
 * Custom session hook that calls /api/admin/session directly.
 * Replaces useSession() from next-auth/react to avoid dependency
 * on the [...nextauth] handler which has module-loading issues.
 */
export function useAdminSession() {
  const [session, setSession] = useState<AdminSession | null>(null)
  const [status, setStatus] = useState<SessionStatus>('loading')

  useEffect(() => {
    let cancelled = false

    async function checkSession() {
      try {
        const res = await fetch('/api/admin/session')
        const data = await res.json()

        if (cancelled) return

        if (data.authenticated && data.user) {
          setSession({ user: data.user })
          setStatus('authenticated')
        } else {
          setSession(null)
          setStatus('unauthenticated')
        }
      } catch {
        if (!cancelled) {
          setSession(null)
          setStatus('unauthenticated')
        }
      }
    }

    checkSession()

    return () => { cancelled = true }
  }, [])

  const signOut = useCallback(async () => {
    try {
      await fetch('/api/admin/session', { method: 'DELETE' })
    } catch {
      // Best-effort cookie clearing
    }
    setSession(null)
    setStatus('unauthenticated')
    window.location.href = '/admin/login'
  }, [])

  return { data: session, status, signOut }
}
