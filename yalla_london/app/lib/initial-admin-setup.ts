/**
 * Initial Admin User Setup Script
 *
 * SECURITY: All credentials loaded from environment variables only.
 * No hardcoded passwords or emails in source code.
 *
 * Required env vars:
 *   INITIAL_ADMIN_EMAIL - The admin email address
 *   INITIAL_ADMIN_PASSWORD - The admin password (min 12 chars)
 */

import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

/**
 * Create or update the initial admin user using env var credentials.
 */
export async function createInitialAdminUser(): Promise<{ success: boolean; user?: { id: string; email: string }; error?: string }> {
  const email = process.env.INITIAL_ADMIN_EMAIL
  const password = process.env.INITIAL_ADMIN_PASSWORD

  if (!email || !password) {
    return {
      success: false,
      error: 'INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD environment variables are required'
    }
  }

  if (password.length < 12) {
    return {
      success: false,
      error: 'INITIAL_ADMIN_PASSWORD must be at least 12 characters'
    }
  }

  try {
    const existingAdmin = await prisma.user.findUnique({
      where: { email }
    })

    const hashedPassword = await bcrypt.hash(password, 12)

    if (existingAdmin) {
      const updatedUser = await prisma.user.update({
        where: { id: existingAdmin.id },
        data: {
          name: 'Admin',
          role: 'admin',
          permissions: ['*'],
          isActive: true,
          passwordHash: hashedPassword
        }
      })

      return {
        success: true,
        user: { id: updatedUser.id, email: updatedUser.email }
      }
    }

    const newAdmin = await prisma.user.create({
      data: {
        email,
        name: 'Admin',
        role: 'admin',
        permissions: ['*'],
        isActive: true,
        emailVerified: new Date(),
        passwordHash: hashedPassword
      }
    })

    return {
      success: true,
      user: { id: newAdmin.id, email: newAdmin.email }
    }
  } catch (error) {
    console.error('Failed to create initial admin user:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Change admin password (stores bcrypt hash in passwordHash field)
 */
export async function changeAdminPassword(
  userId: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  if (newPassword.length < 12) {
    return { success: false, error: 'Password must be at least 12 characters long' }
  }

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 12)

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: hashedPassword,
        lastLoginAt: new Date()
      }
    })

    return { success: true }
  } catch (error) {
    console.error('Failed to change admin password:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Get admin setup status
 */
export async function getAdminSetupStatus(): Promise<{
  hasAdminUser: boolean
  adminUser?: { id: string; email: string; name: string | null }
}> {
  try {
    const adminUser = await prisma.user.findFirst({
      where: { role: 'admin', isActive: true },
      select: { id: true, email: true, name: true }
    })

    return {
      hasAdminUser: !!adminUser,
      adminUser: adminUser || undefined
    }
  } catch (error) {
    console.error('Failed to get admin setup status:', error)
    return { hasAdminUser: false }
  }
}

/**
 * CLI entry point
 */
export async function runAdminSetupScript() {
  console.log('Setting up initial admin user...')
  const result = await createInitialAdminUser()
  if (result.success && result.user) {
    console.log(`Admin user created/updated: ${result.user.email}`)
  } else {
    console.error('Failed:', result.error)
    process.exit(1)
  }
}
