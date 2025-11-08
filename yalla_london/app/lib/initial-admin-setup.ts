/**
 * Initial Admin User Setup Script
 * Creates the initial admin user with credentials admin/YallaLondon24!
 */

import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

export interface InitialAdminUser {
  email: string
  username: string
  password: string
  tempPassword: boolean
}

export const INITIAL_ADMIN_CREDENTIALS: InitialAdminUser = {
  email: 'admin@yallalondon.com',
  username: 'admin',
  password: 'YallaLondon24!',
  tempPassword: true
}

/**
 * Create or update the initial admin user
 */
export async function createInitialAdminUser(): Promise<{ success: boolean; user?: any; error?: string }> {
  try {
    // Check if admin user already exists
    const existingAdmin = await prisma.user.findFirst({
      where: {
        OR: [
          { email: INITIAL_ADMIN_CREDENTIALS.email },
          { email: 'admin' } // Handle legacy username-based login
        ]
      }
    })

    if (existingAdmin) {
      // Update existing admin user
      const updatedUser = await prisma.user.update({
        where: { id: existingAdmin.id },
        data: {
          email: INITIAL_ADMIN_CREDENTIALS.email,
          name: 'Initial Admin User',
          role: 'admin',
          permissions: ['*'], // All permissions
          isActive: true,
          // Keep lastLoginAt as null to force password change
          lastLoginAt: existingAdmin.lastLoginAt
        }
      })

      return {
        success: true,
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          role: updatedUser.role,
          mustChangePassword: updatedUser.lastLoginAt === null
        }
      }
    }

    // Create new admin user
    const hashedPassword = await bcrypt.hash(INITIAL_ADMIN_CREDENTIALS.password, 12)
    
    const newAdmin = await prisma.user.create({
      data: {
        email: INITIAL_ADMIN_CREDENTIALS.email,
        name: 'Initial Admin User',
        role: 'admin',
        permissions: ['*'], // All permissions
        isActive: true,
        emailVerified: new Date(),
        // Leave lastLoginAt as null to force password change on first login
        lastLoginAt: null
      }
    })

    return {
      success: true,
      user: {
        id: newAdmin.id,
        email: newAdmin.email,
        name: newAdmin.name,
        role: newAdmin.role,
        mustChangePassword: true
      }
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
 * Verify initial admin credentials
 */
export async function verifyInitialAdminCredentials(
  username: string, 
  password: string
): Promise<{ valid: boolean; user?: any; mustChangePassword?: boolean }> {
  try {
    // Check for initial admin credentials
    if ((username === 'admin' || username === INITIAL_ADMIN_CREDENTIALS.email) && 
        password === INITIAL_ADMIN_CREDENTIALS.password) {
      
      // Find or create admin user
      const result = await createInitialAdminUser()
      
      if (result.success && result.user) {
        return {
          valid: true,
          user: result.user,
          mustChangePassword: result.user.mustChangePassword
        }
      }
    }

    return { valid: false }

  } catch (error) {
    console.error('Failed to verify initial admin credentials:', error)
    return { valid: false }
  }
}

/**
 * Force password change for initial admin user
 */
export async function changeInitialAdminPassword(
  userId: string, 
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate password strength
    if (newPassword.length < 8) {
      return {
        success: false,
        error: 'Password must be at least 8 characters long'
      }
    }

    if (newPassword === INITIAL_ADMIN_CREDENTIALS.password) {
      return {
        success: false,
        error: 'New password cannot be the same as the temporary password'
      }
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12)

    // Update user with new password and mark as logged in
    await prisma.user.update({
      where: { id: userId },
      data: {
        // Note: We don't actually store the password in the User model yet
        // This would need to be implemented based on your auth strategy
        lastLoginAt: new Date() // Mark as having logged in
      }
    })

    // TODO: Store hashed password in appropriate field when implemented

    return { success: true }

  } catch (error) {
    console.error('Failed to change initial admin password:', error)
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
  adminNeedsPasswordChange: boolean
  adminUser?: any
}> {
  try {
    const adminUser = await prisma.user.findFirst({
      where: {
        role: 'admin',
        isActive: true
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        lastLoginAt: true,
        createdAt: true
      }
    })

    return {
      hasAdminUser: !!adminUser,
      adminNeedsPasswordChange: adminUser ? adminUser.lastLoginAt === null : false,
      adminUser: adminUser || undefined
    }

  } catch (error) {
    console.error('Failed to get admin setup status:', error)
    return {
      hasAdminUser: false,
      adminNeedsPasswordChange: false
    }
  }
}

/**
 * Setup instructions for Google Auth (when SSO is enabled)
 */
export function getGoogleAuthSetupInstructions(): {
  title: string
  steps: string[]
  configRequired: { key: string; description: string }[]
} {
  return {
    title: 'Google Authentication Setup',
    steps: [
      '1. Go to the Google Cloud Console (https://console.cloud.google.com/)',
      '2. Create a new project or select an existing one',
      '3. Enable the Google+ API',
      '4. Go to Credentials → Create Credentials → OAuth 2.0 Client IDs',
      '5. Configure the consent screen with your application details',
      '6. Add authorized redirect URIs for your domain',
      '7. Copy the Client ID and Client Secret to your environment variables',
      '8. Test the configuration using the admin interface'
    ],
    configRequired: [
      {
        key: 'GOOGLE_CLIENT_ID',
        description: 'OAuth 2.0 Client ID from Google Cloud Console'
      },
      {
        key: 'GOOGLE_CLIENT_SECRET',
        description: 'OAuth 2.0 Client Secret from Google Cloud Console'
      },
      {
        key: 'NEXTAUTH_URL',
        description: 'Your application URL (e.g., https://yourdomain.com)'
      },
      {
        key: 'NEXTAUTH_SECRET',
        description: 'Random secret for NextAuth.js (generate with openssl rand -base64 32)'
      }
    ]
  }
}

/**
 * CLI script to create initial admin user
 */
export async function runAdminSetupScript() {
  console.log('🚀 Setting up initial admin user...')
  
  const result = await createInitialAdminUser()
  
  if (result.success) {
    console.log('✅ Initial admin user created successfully!')
    console.log(`📧 Email: ${INITIAL_ADMIN_CREDENTIALS.email}`)
    console.log(`👤 Username: ${INITIAL_ADMIN_CREDENTIALS.username}`)
    console.log(`🔑 Password: ${INITIAL_ADMIN_CREDENTIALS.password}`)
    console.log('')
    console.log('⚠️  IMPORTANT: Change this password on first login!')
    console.log('')
    console.log('🌐 Access admin interface at: /admin')
    
    if (process.env.FEATURE_ENHANCED_AUTH === 'true') {
      console.log('')
      console.log('🔐 Google Auth Setup Required:')
      const instructions = getGoogleAuthSetupInstructions()
      instructions.configRequired.forEach(config => {
        const isSet = !!process.env[config.key]
        console.log(`   ${isSet ? '✅' : '❌'} ${config.key}: ${config.description}`)
      })
    }
  } else {
    console.error('❌ Failed to create initial admin user:', result.error)
  }
}

// Run script if called directly
if (require.main === module) {
  runAdminSetupScript().then(() => {
    process.exit(0)
  }).catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })
}