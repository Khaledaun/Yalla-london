'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSession } from 'next-auth/react'
import { AdminAuth } from '@/components/admin-auth'

export default function AdminLoginPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      const session = await getSession()
      if (session?.user) {
        router.push('/admin')
      }
    }
    checkAuth()
  }, [router])

  const handleAuthenticated = (isAuth: boolean) => {
    setIsAuthenticated(isAuth)
    if (isAuth) {
      router.push('/admin')
    }
  }

  return (
    <div className="min-h-screen">
      <AdminAuth onAuthenticated={handleAuthenticated} />
    </div>
  )
}