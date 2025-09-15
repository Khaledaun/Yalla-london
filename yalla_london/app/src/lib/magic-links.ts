import { prisma } from '@/lib/db'
import { randomBytes, createHash } from 'crypto'
import { isPremiumFeatureEnabled } from './feature-flags'

export interface MagicLinkResult {
  valid: boolean
  user?: any
  error?: string
}

export interface MagicLinkInvite {
  email: string
  siteId: string
  role: string
  invitedBy: string
  token: string
  expiresAt: Date
}

/**
 * Generate a secure magic link for user invites
 */
export async function generateMagicLink(
  email: string, 
  siteId: string, 
  role: string, 
  invitedBy: string
): Promise<string | null> {
  if (!isPremiumFeatureEnabled('ENHANCED_AUTH')) {
    throw new Error('Magic links are not enabled')
  }

  try {
    // Generate secure token
    const token = randomBytes(32).toString('hex')
    const tokenHash = createHash('sha256').update(token).digest('hex')
    
    // Set expiration (24 hours)
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)

    // Store invitation in database
    await prisma.verificationToken.create({
      data: {
        identifier: `magic-invite:${email}:${siteId}`,
        token: tokenHash,
        expires: expiresAt
      }
    })

    // Store additional invite metadata
    const inviteMetadata = {
      email,
      siteId,
      role,
      invitedBy,
      createdAt: new Date().toISOString()
    }

    // You could store this in a separate table or Redis for better performance
    // For now, we'll use the identifier field to encode the metadata
    await prisma.verificationToken.create({
      data: {
        identifier: `magic-metadata:${tokenHash}`,
        token: JSON.stringify(inviteMetadata),
        expires: expiresAt
      }
    })

    // Return the original token (not the hash)
    return token
  } catch (error) {
    console.error('Failed to generate magic link:', error)
    return null
  }
}

/**
 * Validate a magic link token and return user info
 */
export async function validateMagicLink(
  token: string, 
  email: string
): Promise<MagicLinkResult> {
  if (!isPremiumFeatureEnabled('ENHANCED_AUTH')) {
    return { valid: false, error: 'Magic links are not enabled' }
  }

  try {
    const tokenHash = createHash('sha256').update(token).digest('hex')
    
    // Find the token in database
    const storedToken = await prisma.verificationToken.findFirst({
      where: {
        identifier: {
          contains: `magic-invite:${email}`
        },
        token: tokenHash,
        expires: {
          gt: new Date()
        }
      }
    })

    if (!storedToken) {
      return { valid: false, error: 'Invalid or expired magic link' }
    }

    // Get invite metadata
    const metadataToken = await prisma.verificationToken.findFirst({
      where: {
        identifier: `magic-metadata:${tokenHash}`
      }
    })

    if (!metadataToken) {
      return { valid: false, error: 'Invite metadata not found' }
    }

    const metadata = JSON.parse(metadataToken.token)

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      // Create new user from invite
      user = await prisma.user.create({
        data: {
          email,
          name: email.split('@')[0], // Use email prefix as default name
          role: metadata.role,
          isActive: true,
          emailVerified: new Date()
        }
      })

      // Add user to site if specified
      if (metadata.siteId && metadata.siteId !== 'global') {
        try {
          await prisma.siteMemberPremium.create({
            data: {
              siteId: metadata.siteId,
              userId: user.id,
              role: metadata.role.toUpperCase(),
              createdById: metadata.invitedBy,
              updatedById: metadata.invitedBy,
              invited_at: new Date(),
              joined_at: new Date()
            }
          })
        } catch (error) {
          console.error('Failed to add user to site:', error)
          // Continue anyway, user is created
        }
      }
    } else {
      // Update existing user's role if needed
      if (user.role !== metadata.role) {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: metadata.role }
        })
      }
    }

    // Clean up used tokens
    await prisma.verificationToken.deleteMany({
      where: {
        OR: [
          { id: storedToken.id },
          { id: metadataToken.id }
        ]
      }
    })

    return {
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    }
  } catch (error) {
    console.error('Magic link validation error:', error)
    return { valid: false, error: 'Failed to validate magic link' }
  }
}

/**
 * Send magic link email (placeholder implementation)
 */
export async function sendMagicLinkEmail(
  email: string,
  token: string,
  inviterName: string,
  siteName?: string
): Promise<boolean> {
  try {
    const magicLink = `${process.env.NEXTAUTH_URL}/admin/auth/magic?token=${token}&email=${encodeURIComponent(email)}`
    
    // TODO: Integrate with your email service (SendGrid, SES, etc.)
    console.log(`Magic link for ${email}: ${magicLink}`)
    console.log(`Invited by: ${inviterName}`)
    
    // For development, just log the link
    if (process.env.NODE_ENV === 'development') {
      console.log('=== MAGIC LINK EMAIL ===')
      console.log(`To: ${email}`)
      console.log(`From: ${inviterName}`)
      console.log(`Site: ${siteName || 'Yalla London'}`)
      console.log(`Link: ${magicLink}`)
      console.log('========================')
    }

    return true
  } catch (error) {
    console.error('Failed to send magic link email:', error)
    return false
  }
}

/**
 * Clean up expired magic link tokens
 */
export async function cleanupExpiredMagicLinks(): Promise<number> {
  try {
    const result = await prisma.verificationToken.deleteMany({
      where: {
        identifier: {
          startsWith: 'magic-'
        },
        expires: {
          lt: new Date()
        }
      }
    })

    return result.count
  } catch (error) {
    console.error('Failed to cleanup expired magic links:', error)
    return 0
  }
}

/**
 * Get pending invites for a site
 */
export async function getPendingInvites(siteId: string): Promise<MagicLinkInvite[]> {
  try {
    const tokens = await prisma.verificationToken.findMany({
      where: {
        identifier: {
          startsWith: 'magic-invite:'
        },
        expires: {
          gt: new Date()
        }
      }
    })

    const invites: MagicLinkInvite[] = []

    for (const token of tokens) {
      try {
        // Extract email and site from identifier
        const parts = token.identifier.split(':')
        if (parts.length >= 3) {
          const email = parts[1]
          const tokenSiteId = parts[2]

          if (tokenSiteId === siteId) {
            // Get metadata
            const metadataToken = await prisma.verificationToken.findFirst({
              where: {
                identifier: `magic-metadata:${token.token}`
              }
            })

            if (metadataToken) {
              const metadata = JSON.parse(metadataToken.token)
              invites.push({
                email,
                siteId: tokenSiteId,
                role: metadata.role,
                invitedBy: metadata.invitedBy,
                token: token.token,
                expiresAt: token.expires
              })
            }
          }
        }
      } catch (error) {
        console.error('Failed to parse invite token:', error)
      }
    }

    return invites
  } catch (error) {
    console.error('Failed to get pending invites:', error)
    return []
  }
}