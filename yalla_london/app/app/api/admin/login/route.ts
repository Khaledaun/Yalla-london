export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

/**
 * Custom Login Endpoint
 *
 * Bypasses the NextAuth [...nextauth] route handler entirely.
 * Verifies credentials directly, creates a NextAuth-compatible JWT,
 * and sets the session cookie.
 *
 * Each step has its own error handling so failures are diagnosable.
 */

export async function POST(request: NextRequest) {
  let step = 'parse-body'

  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Step 1: Check NEXTAUTH_SECRET exists
    step = 'check-secret'
    const secret = process.env.NEXTAUTH_SECRET
    if (!secret) {
      return NextResponse.json(
        { error: 'Server config error: NEXTAUTH_SECRET not set' },
        { status: 500 }
      )
    }

    // Step 2: Load Prisma (dynamic import to get a clear error if it fails)
    step = 'load-prisma'
    const { prisma } = await import('@/lib/db')

    // Step 3: Find user
    step = 'find-user'
    const user = await prisma.user.findUnique({
      where: { email: email.trim() },
    })

    if (!user) {
      // Try case-insensitive fallback
      const users = await prisma.user.findMany({
        where: { email: { equals: email.trim(), mode: 'insensitive' as any } },
        take: 1,
      })
      if (users.length === 0) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        )
      }
      // Use the found user
      return await processLogin(users[0], password, secret, request)
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Account is inactive' },
        { status: 401 }
      )
    }

    return await processLogin(user, password, secret, request)

  } catch (error: any) {
    console.error(`Login error at step [${step}]:`, error)
    return NextResponse.json(
      {
        error: 'Login failed. Please try again.',
      },
      { status: 500 }
    )
  }
}

async function processLogin(
  user: any,
  password: string,
  secret: string,
  request: NextRequest
) {
  const isProduction = process.env.NODE_ENV === 'production'

  // Step 4: Check password hash exists
  if (!user.passwordHash) {
    return NextResponse.json(
      { error: 'No password set for this account' },
      { status: 401 }
    )
  }

  // Step 5: Verify password
  let isValid: boolean
  try {
    isValid = await bcrypt.compare(password, user.passwordHash)
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Password verification error', detail: err?.message },
      { status: 500 }
    )
  }

  if (!isValid) {
    return NextResponse.json(
      { error: 'Invalid email or password' },
      { status: 401 }
    )
  }

  // Step 6: Create JWT token
  let token: string
  try {
    const { encode } = await import('next-auth/jwt')
    const maxAge = parseInt(process.env.SESSION_MAX_AGE_SECONDS || '28800', 10)

    token = await encode({
      secret,
      token: {
        sub: user.id,
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + maxAge,
      },
      maxAge,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: 'JWT creation failed', detail: err?.message },
      { status: 500 }
    )
  }

  // Step 7: Update last login (non-blocking)
  try {
    const { prisma } = await import('@/lib/db')
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })
  } catch {
    // Non-critical — don't fail login
  }

  // Step 8: Set cookie and return
  const maxAge = parseInt(process.env.SESSION_MAX_AGE_SECONDS || '28800', 10)

  const response = NextResponse.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  })

  // NextAuth picks __Secure- or plain cookie name based on the URL protocol,
  // which can differ from NODE_ENV on preview deployments.
  // Set BOTH names so NextAuth finds whichever one it expects.
  response.cookies.set('__Secure-next-auth.session-token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge,
  })
  response.cookies.set('next-auth.session-token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge,
  })

  return response
}

// GET handler for diagnostics — requires admin auth to prevent info leakage
export async function GET(request: NextRequest) {
  const { requireAdmin } = await import('@/lib/admin-middleware')
  const authError = await requireAdmin(request)
  if (authError) return authError

  const checks: Record<string, string> = {}

  // Check env vars (only presence, never values)
  checks.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET ? 'SET' : 'MISSING'
  checks.DATABASE_URL = process.env.DATABASE_URL ? 'SET' : 'MISSING'
  checks.NODE_ENV = process.env.NODE_ENV || 'unknown'

  // Check Prisma connection
  try {
    const { prisma } = await import('@/lib/db')
    await prisma.user.count()
    checks.database = 'connected'
  } catch {
    checks.database = 'error'
  }

  // Check bcrypt
  try {
    const hash = await bcrypt.hash('test', 4)
    const valid = await bcrypt.compare('test', hash)
    checks.bcrypt = valid ? 'working' : 'broken'
  } catch {
    checks.bcrypt = 'error'
  }

  // Check next-auth/jwt
  try {
    const { encode } = await import('next-auth/jwt')
    checks.nextAuthJwt = typeof encode === 'function' ? 'available' : 'not a function'
  } catch {
    checks.nextAuthJwt = 'error'
  }

  return NextResponse.json({ status: 'diagnostic', checks })
}
