import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

/**
 * Admin Setup Endpoint
 *
 * GET  — Check if initial setup is needed (any admin users exist?)
 * POST — Create the first admin user (only works when no admin users exist)
 *
 * This endpoint is intentionally NOT behind withAdminAuth because it's
 * used to bootstrap the very first admin account.
 */

export async function GET() {
  try {
    const adminCount = await prisma.user.count({
      where: {
        role: 'admin',
        isActive: true,
      },
    })

    return NextResponse.json({
      needsSetup: adminCount === 0,
    })
  } catch (error) {
    // If the database is not connected or tables don't exist,
    // we still need setup
    return NextResponse.json({
      needsSetup: true,
      dbError: true,
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Only allow setup when no admin users exist
    const adminCount = await prisma.user.count({
      where: {
        role: 'admin',
        isActive: true,
      },
    })

    if (adminCount > 0) {
      return NextResponse.json(
        { error: 'Setup already complete. Admin users already exist.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { email, password, name } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    // Check if user with this email already exists
    const existing = await prisma.user.findUnique({
      where: { email },
    })

    if (existing) {
      // Upgrade existing user to admin
      await prisma.user.update({
        where: { email },
        data: {
          role: 'admin',
          passwordHash: await hashPassword(password),
          isActive: true,
          name: name || existing.name,
        },
      })
    } else {
      // Create new admin user
      await prisma.user.create({
        data: {
          email,
          name: name || 'Admin',
          role: 'admin',
          passwordHash: await hashPassword(password),
          isActive: true,
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Admin account created. You can now sign in.',
    })
  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json(
      { error: 'Failed to create admin account. Check database connection.' },
      { status: 500 }
    )
  }
}
