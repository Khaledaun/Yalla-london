import { NextRequest, NextResponse } from 'next/server'

/**
 * Custom Session Endpoint
 *
 * Decodes the NextAuth-compatible JWT directly from the session cookie.
 * This bypasses the [...nextauth] handler entirely, avoiding any
 * circular dependency or module-loading issues in the auth chain.
 *
 * GET  → Returns current session (or { authenticated: false })
 * DELETE → Clears session cookies (sign out)
 */

export async function GET(request: NextRequest) {
  try {
    const { decode } = await import('next-auth/jwt')
    const secret = process.env.NEXTAUTH_SECRET

    if (!secret) {
      return NextResponse.json({ authenticated: false })
    }

    // Try both cookie name variants (secure + plain)
    const secureCookie = request.cookies.get('__Secure-next-auth.session-token')?.value
    const plainCookie = request.cookies.get('next-auth.session-token')?.value
    const tokenValue = secureCookie || plainCookie

    if (!tokenValue) {
      return NextResponse.json({ authenticated: false })
    }

    const decoded = await decode({ secret, token: tokenValue })

    if (!decoded || !decoded.email) {
      return NextResponse.json({ authenticated: false })
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: (decoded.id || decoded.sub) as string,
        email: decoded.email as string,
        name: (decoded.name as string) || null,
        role: (decoded.role as string) || 'viewer',
      },
    })
  } catch (error) {
    console.error('Session decode error:', error)
    return NextResponse.json({ authenticated: false })
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true })

  // Clear both session cookie variants
  response.cookies.set('__Secure-next-auth.session-token', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  response.cookies.set('next-auth.session-token', '', {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })

  return response
}
