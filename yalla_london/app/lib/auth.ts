
import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from '@/lib/db'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { logAuditEvent } from '@/lib/rbac'

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

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          }
        })

        if (!user || !user.isActive) {
          return null
        }

        // For the test user john@doe.com, check the password
        if (credentials.email === 'john@doe.com' && credentials.password === 'johndoe123') {
          // Update last login time
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() }
          });

          // Log successful login
          await logAuditEvent({
            userId: user.id,
            action: 'login',
            resource: 'authentication',
            success: true
          });

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
          }
        } else {
          // Log failed login attempt
          await logAuditEvent({
            userId: user.id,
            action: 'login',
            resource: 'authentication',
            success: false,
            errorMessage: 'Invalid credentials'
          });
          
          return null // Invalid credentials
        }
      }
    })
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
    async signIn({ user, account, profile }: any) {
      // Additional sign-in validation can be added here
      return true;
    }
  },
  pages: {
    signIn: '/admin',
  },
  secret: process.env.NEXTAUTH_SECRET,
  events: {
    async signIn({ user, account, profile }) {
      // Additional login event logging
      console.log(`User ${user.email} signed in`);
    },
    async signOut({ token }) {
      // Log logout event
      if (token?.id) {
        await logAuditEvent({
          userId: token.id as string,
          action: 'logout',
          resource: 'authentication',
          success: true
        });
      }
      console.log(`User signed out`);
    }
  }
}
