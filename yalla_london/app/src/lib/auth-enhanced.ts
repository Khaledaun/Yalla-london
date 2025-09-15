import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from '@/lib/db'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import bcrypt from 'bcryptjs'
import { logAuditEvent } from '@/lib/rbac'
import { generateMagicLink, validateMagicLink } from '@/src/lib/magic-links'
import { isPremiumFeatureEnabled } from '@/src/lib/feature-flags'

/**
 * Enhanced authentication options with premium features
 * - Email/password with initial admin user
 * - SSO (Google/Microsoft) when enabled
 * - Magic links for invites
 * - Enhanced audit logging
 * - RBAC integration
 */
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    // Credentials provider with initial admin user
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        magicToken: { label: 'Magic Token', type: 'text' }
      },
      async authorize(credentials) {
        if (!credentials?.email) {
          return null
        }

        // Handle magic link authentication
        if (credentials.magicToken) {
          try {
            const result = await validateMagicLink(credentials.magicToken, credentials.email)
            if (result.valid && result.user) {
              await logAuditEvent({
                userId: result.user.id,
                action: 'login',
                resource: 'authentication',
                details: { method: 'magic_link' },
                success: true
              })
              return result.user
            }
          } catch (error) {
            console.error('Magic link validation failed:', error)
          }
          return null
        }

        // Regular password authentication
        if (!credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })

        if (!user || !user.isActive) {
          await logAuditEvent({
            userId: user?.id,
            action: 'login',
            resource: 'authentication',
            details: { email: credentials.email, reason: 'user_inactive_or_not_found' },
            success: false,
            errorMessage: 'User not found or inactive'
          })
          return null
        }

        // Initial admin user check
        if ((credentials.email === 'admin' || credentials.email === 'admin@yallalondon.com') && credentials.password === 'YallaLondon24!') {
          // Create or update admin user
          let adminUser = await prisma.user.findUnique({
            where: { email: 'admin@yallalondon.com' }
          })

          if (!adminUser) {
            // Create initial admin user
            const hashedPassword = await bcrypt.hash('YallaLondon24!', 12)
            adminUser = await prisma.user.create({
              data: {
                email: 'admin@yallalondon.com',
                name: 'Admin User',
                role: 'admin',
                permissions: ['*'], // All permissions
                isActive: true,
                // Force password change on first login
                lastLoginAt: null
              }
            })
          }

          // Update last login time
          await prisma.user.update({
            where: { id: adminUser.id },
            data: { lastLoginAt: new Date() }
          })

          await logAuditEvent({
            userId: adminUser.id,
            action: 'login',
            resource: 'authentication',
            details: { method: 'initial_admin' },
            success: true
          })

          return {
            id: adminUser.id,
            email: adminUser.email,
            name: adminUser.name,
            role: adminUser.role,
            mustChangePassword: adminUser.lastLoginAt === null
          }
        }

        // Regular user password verification
        try {
          // For now, handle the test user (will be replaced with proper hashing)
          if (credentials.email === 'john@doe.com' && credentials.password === 'johndoe123') {
            await prisma.user.update({
              where: { id: user.id },
              data: { lastLoginAt: new Date() }
            })

            await logAuditEvent({
              userId: user.id,
              action: 'login',
              resource: 'authentication',
              details: { method: 'credentials' },
              success: true
            })

            return {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role
            }
          }

          // TODO: Implement proper password hashing for production
          await logAuditEvent({
            userId: user.id,
            action: 'login',
            resource: 'authentication',
            details: { email: credentials.email, reason: 'invalid_credentials' },
            success: false,
            errorMessage: 'Invalid credentials'
          })
          
          return null
        } catch (error) {
          console.error('Authentication error:', error)
          return null
        }
      }
    }),

    // Google SSO Provider (when enabled)
    ...(isPremiumFeatureEnabled('ENHANCED_AUTH') ? [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        authorization: {
          params: {
            prompt: "consent",
            access_type: "offline",
            response_type: "code"
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
    async jwt({ token, user, account }: any) {
      if (user) {
        return {
          ...token,
          id: user.id,
          role: user.role,
          mustChangePassword: user.mustChangePassword || false
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
          role: token.role as string,
          mustChangePassword: token.mustChangePassword || false
        }
      }
    },
    async signIn({ user, account, profile }: any) {
      try {
        // Enhanced sign-in validation for SSO
        if (account?.provider === 'google' && isPremiumFeatureEnabled('ENHANCED_AUTH')) {
          // Check if user is allowed to sign in with this email domain
          const email = user.email || profile?.email
          if (!email) {
            return false
          }

          // Check if user exists and is active
          const existingUser = await prisma.user.findUnique({
            where: { email }
          })

          if (existingUser && !existingUser.isActive) {
            await logAuditEvent({
              userId: existingUser.id,
              action: 'login',
              resource: 'authentication',
              details: { provider: account.provider, reason: 'user_inactive' },
              success: false,
              errorMessage: 'User account is inactive'
            })
            return false
          }

          // If user doesn't exist, create them (if domain is allowed)
          if (!existingUser) {
            // TODO: Add domain whitelist check
            const newUser = await prisma.user.create({
              data: {
                email,
                name: user.name || profile?.name || 'Unknown',
                role: 'viewer', // Default role for SSO users
                isActive: true,
                emailVerified: new Date() // SSO users are pre-verified
              }
            })

            await logAuditEvent({
              userId: newUser.id,
              action: 'create',
              resource: 'user',
              details: { provider: account.provider, auto_created: true },
              success: true
            })
          }

          await logAuditEvent({
            userId: existingUser?.id || user.id,
            action: 'login',
            resource: 'authentication',
            details: { provider: account.provider },
            success: true
          })
        }

        return true
      } catch (error) {
        console.error('Sign-in callback error:', error)
        return false
      }
    }
  },
  pages: {
    signIn: '/admin/login',
    error: '/admin/auth/error',
  },
  secret: process.env.NEXTAUTH_SECRET,
  events: {
    async signIn({ user, account, profile }) {
      console.log(`User ${user.email} signed in via ${account?.provider || 'credentials'}`)
    },
    async signOut({ token }) {
      if (token?.id) {
        await logAuditEvent({
          userId: token.id as string,
          action: 'logout',
          resource: 'authentication',
          success: true
        })
      }
      console.log(`User signed out`)
    },
    async createUser({ user }) {
      await logAuditEvent({
        userId: user.id,
        action: 'create',
        resource: 'user',
        details: { email: user.email },
        success: true
      })
      console.log(`New user created: ${user.email}`)
    }
  },
  // Enhanced debug logging for development
  debug: process.env.NODE_ENV === 'development',
}