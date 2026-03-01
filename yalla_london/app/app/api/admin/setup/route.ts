export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

/**
 * Admin Setup Endpoint
 *
 * GET  — Check if initial setup is needed (any admin with a password?)
 * POST — Create/bootstrap the first admin user, or set a password for
 *         an existing passwordless admin.
 *
 * This endpoint is intentionally NOT behind withAdminAuth because it's
 * used to bootstrap the very first admin account.
 *
 * Uses dynamic imports for prisma to avoid module-level crashes.
 * Uses bcrypt directly instead of importing from @/lib/auth to avoid
 * pulling in the full auth module (PrismaAdapter, providers, etc).
 */

export async function GET() {
  try {
    const { prisma } = await import('@/lib/db')

    // An admin is only "set up" when they have a password they can log in with.
    // Admin users created via OAuth without a passwordHash leave the system
    // in a state where nobody can access the admin panel via credentials.
    const loginableAdminCount = await prisma.user.count({
      where: {
        role: 'admin',
        isActive: true,
        passwordHash: { not: null },
      },
    })

    return NextResponse.json({
      needsSetup: loginableAdminCount === 0,
    })
  } catch (error: any) {
    // If the database is not connected or tables don't exist,
    // we still need setup
    return NextResponse.json({
      needsSetup: true,
      dbError: true,
      detail: error?.message?.substring(0, 200),
    })
  }
}

export async function POST(request: NextRequest) {
  let step = 'parse-body'

  try {
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

    // Load Prisma dynamically
    step = 'load-prisma'
    const { prisma } = await import('@/lib/db')

    // Only allow setup when no admin user with a password exists.
    // This covers: fresh DB, OAuth-only admins without passwordHash, etc.
    step = 'check-existing-admins'
    const loginableAdminCount = await prisma.user.count({
      where: {
        role: 'admin',
        isActive: true,
        passwordHash: { not: null },
      },
    })

    if (loginableAdminCount > 0) {
      // SECURITY: Setup already completed. Password changes must go through
      // the authenticated password reset flow, not this unauthenticated endpoint.
      return NextResponse.json(
        { error: 'Setup already completed. Use password reset flow.' },
        { status: 403 }
      )
    }

    // Hash password directly with bcrypt (cost factor 12)
    step = 'hash-password'
    const passwordHash = await bcrypt.hash(password, 12)

    // Check if user with this email already exists
    step = 'find-user'
    const existing = await prisma.user.findUnique({
      where: { email: email.trim() },
    })

    step = 'create-or-update-user'
    if (existing) {
      // Upgrade existing user to admin / set their password
      await prisma.user.update({
        where: { email: email.trim() },
        data: {
          role: 'admin',
          passwordHash,
          isActive: true,
          name: name || existing.name,
        },
      })
    } else {
      // Create new admin user
      await prisma.user.create({
        data: {
          email: email.trim(),
          name: name || 'Admin',
          role: 'admin',
          passwordHash,
          isActive: true,
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Admin account created. You can now sign in.',
    })
  } catch (error: any) {
    console.error(`Setup error at step [${step}]:`, error)
    return NextResponse.json(
      {
        error: `Setup failed at step: ${step}`,
        detail: error?.message || String(error),
      },
      { status: 500 }
    )
  }
}
