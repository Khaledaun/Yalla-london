import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from '@/lib/db'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import bcrypt from 'bcryptjs'
import { logAuditEvent } from '@/lib/rbac'

/**
 * Consolidated authentication configuration.
 *
 * SECURITY:
 * - Passwords verified via bcrypt.compare() against User.passwordHash field.
 * - No hardcoded credentials. Initial admin seeded via CLI script with env vars.
 * - Google SSO enabled when GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set.
 */

/** Admin email whitelist from environment only */
export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()).filter(Boolean)) || []
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
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

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email }
          })

          if (!user || !user.isActive) {
            if (user) {
              await logAuditEvent({
                userId: user.id,
                action: 'login',
                resource: 'authentication',
                success: false,
                errorMessage: 'Account inactive or deleted'
              })
            }
            return null
          }

          // Verify password via bcrypt — no hardcoded credentials
          if (!user.passwordHash) {
            await logAuditEvent({
              userId: user.id,
              action: 'login',
              resource: 'authentication',
              success: false,
              errorMessage: 'No password set for this account'
            })
            return null
          }

          const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash)

          if (!isPasswordValid) {
            await logAuditEvent({
              userId: user.id,
              action: 'login',
              resource: 'authentication',
              success: false,
              errorMessage: 'Invalid credentials'
            })
            return null
          }

          // Update last login time
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() }
          })

          await logAuditEvent({
            userId: user.id,
            action: 'login',
            resource: 'authentication',
            success: true
          })

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
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        authorization: {
          params: {
            prompt: 'consent',
            access_type: 'offline',
            response_type: 'code'
          }
        }
      })
    ] : [])
  ],
  session: {
    strategy: 'jwt' as const,
    maxAge: 24 * 60 * 60, // 24 hours
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
      if (account?.provider === 'google') {
        const email = user.email
        if (!email) return false
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
    }
  },
  pages: {
    signIn: '/admin/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
  events: {
    async signOut({ token }) {
      if (token?.id) {
        await logAuditEvent({
          userId: token.id as string,
          action: 'logout',
          resource: 'authentication',
          success: true
        })
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
