import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { encode } from 'next-auth/jwt'
import { logAuditEvent } from '@/lib/rbac'

/**
 * Custom Login Endpoint
 *
 * Bypasses the NextAuth [...nextauth] route handler entirely.
 * Verifies credentials directly, creates a NextAuth-compatible JWT,
 * and sets the session cookie. This avoids PrismaAdapter conflicts
 * and CSRF middleware issues with the standard NextAuth flow.
 */

const isProduction = process.env.NODE_ENV === 'production'
const COOKIE_NAME = isProduction
  ? '__Secure-next-auth.session-token'
  : 'next-auth.session-token'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    })

    if (!user || !user.isActive) {
      if (user) {
        await logAuditEvent({
          userId: user.id,
          action: 'login',
          resource: 'authentication',
          success: false,
          errorMessage: 'Account inactive',
        }).catch(() => {})
      }
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    if (!user.passwordHash) {
      return NextResponse.json(
        { error: 'No password set for this account. Use Google SSO or contact admin.' },
        { status: 401 }
      )
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash)
    if (!isValid) {
      await logAuditEvent({
        userId: user.id,
        action: 'login',
        resource: 'authentication',
        success: false,
        errorMessage: 'Invalid credentials',
      }).catch(() => {})
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Create JWT token (same format NextAuth expects)
    const secret = process.env.NEXTAUTH_SECRET
    if (!secret) {
      console.error('NEXTAUTH_SECRET is not set')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const maxAge = parseInt(process.env.SESSION_MAX_AGE_SECONDS || '28800', 10)

    const token = await encode({
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

    // Update last login time (don't fail on error)
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    }).catch(() => {})

    await logAuditEvent({
      userId: user.id,
      action: 'login',
      resource: 'authentication',
      success: true,
    }).catch(() => {})

    // Set the NextAuth session cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    })

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge,
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Login failed. Please try again.' },
      { status: 500 }
    )
  }
}
