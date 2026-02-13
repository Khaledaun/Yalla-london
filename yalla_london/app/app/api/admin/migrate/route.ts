import { NextResponse } from 'next/server'

/**
 * Database Migration Endpoint
 *
 * GET  — Check which columns are missing from the users table
 * POST — Add missing columns needed for auth (passwordHash, role, isActive, etc.)
 *
 * This is a one-time migration endpoint. Once columns exist, it becomes a no-op.
 * Safe to run multiple times (idempotent).
 */

// Columns that the auth system needs on the users table
const REQUIRED_COLUMNS = [
  { name: 'passwordHash', sql: 'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT' },
  { name: 'role', sql: `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" TEXT DEFAULT 'viewer'` },
  { name: 'permissions', sql: `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "permissions" TEXT[] DEFAULT '{}'` },
  { name: 'isActive', sql: 'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true' },
  { name: 'deletedAt', sql: 'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3)' },
  { name: 'lastLoginAt', sql: 'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3)' },
]

export async function GET() {
  try {
    const { prisma } = await import('@/lib/db')

    // Check which columns exist on the users table
    const result: any[] = await prisma.$queryRawUnsafe(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position`
    )

    const existingColumns = result.map((r: any) => r.column_name)
    const missing = REQUIRED_COLUMNS.filter(c => !existingColumns.includes(c.name))

    return NextResponse.json({
      status: 'ok',
      existingColumns,
      missingColumns: missing.map(c => c.name),
      needsMigration: missing.length > 0,
    })
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      error: error?.message?.substring(0, 300),
    }, { status: 500 })
  }
}

export async function POST() {
  const results: Array<{ column: string; status: string; error?: string }> = []

  try {
    const { prisma } = await import('@/lib/db')

    // Check existing columns first
    const existing: any[] = await prisma.$queryRawUnsafe(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'users'`
    )
    const existingColumns = new Set(existing.map((r: any) => r.column_name))

    for (const col of REQUIRED_COLUMNS) {
      if (existingColumns.has(col.name)) {
        results.push({ column: col.name, status: 'already exists' })
        continue
      }

      try {
        await prisma.$executeRawUnsafe(col.sql)
        results.push({ column: col.name, status: 'added' })
      } catch (err: any) {
        results.push({ column: col.name, status: 'error', error: err?.message?.substring(0, 100) })
      }
    }

    // Also create indexes if they don't exist
    const indexes = [
      { name: 'users_role_idx', sql: 'CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users"("role")' },
      { name: 'users_isActive_idx', sql: 'CREATE INDEX IF NOT EXISTS "users_isActive_idx" ON "users"("isActive")' },
      { name: 'users_createdAt_idx', sql: 'CREATE INDEX IF NOT EXISTS "users_createdAt_idx" ON "users"("createdAt")' },
    ]

    for (const idx of indexes) {
      try {
        await prisma.$executeRawUnsafe(idx.sql)
        results.push({ column: idx.name, status: 'index ok' })
      } catch {
        // Indexes are non-critical
      }
    }

    const added = results.filter(r => r.status === 'added').length
    const errors = results.filter(r => r.status === 'error').length

    return NextResponse.json({
      status: errors > 0 ? 'partial' : 'ok',
      message: `Migration complete. ${added} columns added, ${errors} errors.`,
      results,
    })
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      error: error?.message?.substring(0, 300),
      results,
    }, { status: 500 })
  }
}
