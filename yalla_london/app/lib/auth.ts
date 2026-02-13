import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'

/**
 * Consolidated authentication configuration.
 *
 * SECURITY:
 * - Passwords verified via bcrypt.compare() against User.passwordHash field.
 * - No hardcoded credentials. Initial admin seeded via CLI script with env vars.
 * - Google SSO enabled when GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set.
 *
 * IMPORTANT: All database access (prisma) and audit logging (logAuditEvent)
 * use dynamic imports inside callbacks. This prevents the module from crashing
 * at import time if the database is temporarily unavailable, and avoids a
 * circular dependency with rbac.ts (which imports authOptions from this file).
 */

const hasGoogleOAuth = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)

/** Admin email whitelist from environment only */
export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()).filter(Boolean)) || []
}

export const authOptions: NextAuthOptions = {
  // PrismaAdapter is only used when Google OAuth is enabled.
  // We lazy-load it to avoid crashing the module if prisma fails to connect.
  ...(hasGoogleOAuth ? {
    adapter: (() => {
      try {
        const { PrismaAdapter } = require('@next-auth/prisma-adapter')
        const { prisma } = require('@/lib/db')
        return PrismaAdapter(prisma)
      } catch (e) {
        console.error('PrismaAdapter failed to load:', e)
        return undefined
      }
    })()
  } : {}),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const email = credentials.email.trim()

        try {
          const { prisma } = await import('@/lib/db')

          const user = await prisma.user.findUnique({
            where: { email }
          })

          if (!user || !user.isActive) {
            return null
          }

          if (!user.passwordHash) {
            return null
          }

          const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash)

          if (!isPasswordValid) {
            return null
          }

          // Update last login time (non-blocking)
          prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() }
          }).catch(() => {})

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
          }
        } catch (error) {
          console.error('Authentication error:', error)
          return null
        }
      }
    }),
    // Google SSO — only when credentials are configured
    ...(hasGoogleOAuth ? [
      (() => {
        const GoogleProvider = require('next-auth/providers/google').default
        return GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          authorization: {
            params: {
              prompt: 'consent',
              access_type: 'offline',
              response_type: 'code'
            }
          }
        })
      })()
    ] : [])
  ],
  session: {
    strategy: 'jwt' as const,
    maxAge: parseInt(process.env.SESSION_MAX_AGE_SECONDS || '28800', 10),
    updateAge: 15 * 60,
  },
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        return {
          ...token,
          id: user.id,
          role: user.role
        }
      }
      return token
    },
    async session({ session, token }: any) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.id as string,
          role: token.role as string
        }
      }
    },
    async signIn({ user, account }: any) {
      try {
        if (account?.provider === 'google') {
          const email = user.email
          if (!email) return false
          const { prisma } = await import('@/lib/db')
          const existing = await prisma.user.findUnique({ where: { email } })
          if (existing && !existing.isActive) return false
          if (!existing) {
            await prisma.user.create({
              data: {
                email,
                name: user.name || 'Unknown',
                role: 'viewer',
                isActive: true,
                emailVerified: new Date()
              }
            })
          }
        }
        return true
      } catch (error) {
        console.error('signIn callback error:', error)
        return true
      }
    }
  },
  pages: {
    signIn: '/admin/login',
    error: '/admin/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
  events: {
    async signOut({ token }) {
      try {
        if (token?.id) {
          const { logAuditEvent } = await import('@/lib/rbac')
          await logAuditEvent({
            userId: token.id as string,
            action: 'logout',
            resource: 'authentication',
            success: true
          })
        }
      } catch {
        // Don't block signout on audit log failure
      }
    }
  },
  debug: process.env.NODE_ENV === 'development',
}

/** Hash a password using bcrypt with cost factor 12 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

/** Verify a password against a bcrypt hash */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}
