export const dynamic = 'force-dynamic';
export const revalidate = 0;


import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    // Get table count
    const tableResult = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `
    const totalTables = Number(tableResult[0].count)

    // Get total record count across all tables
    const tables = await prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename 
      FROM pg_catalog.pg_tables 
      WHERE schemaname = 'public'
    `

    let totalRecords = 0
    for (const table of tables) {
      try {
        const result = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${table.tablename}"`)
        totalRecords += Number((result as any)[0].count)
      } catch (error) {
        console.error(`Error counting records in ${table.tablename}:`, error)
      }
    }

    // Get database size
    const sizeResult = await prisma.$queryRaw<[{ size: string }]>`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size
    `
    const databaseSize = sizeResult[0].size

    // Get last backup
    const lastBackup = await prisma.databaseBackup.findFirst({
      where: { status: 'completed' },
      orderBy: { created_at: 'desc' },
      select: { created_at: true }
    })

    return NextResponse.json({
      totalTables,
      totalRecords,
      databaseSize,
      lastBackup: lastBackup?.created_at || null
    })
  } catch (error) {
    console.error('Error fetching database stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch database statistics' },
      { status: 500 }
    )
  }
}
