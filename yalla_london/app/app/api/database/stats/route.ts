export const dynamic = 'force-dynamic';
export const revalidate = 0;


import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/admin-middleware'

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;
  try {
    // Get table count
    const tableResult = await (prisma as any).$queryRaw`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ` as { count: bigint }[];
    const totalTables = Number(tableResult[0]?.count || 0);

    // Get total record count across all tables
    const tables = await (prisma as any).$queryRaw`
      SELECT tablename
      FROM pg_catalog.pg_tables
      WHERE schemaname = 'public'
    ` as { tablename: string }[];

    let totalRecords = 0
    for (const table of tables) {
      try {
        const result = await (prisma as any).$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${table.tablename}"`)
        totalRecords += Number((result as any)[0]?.count || 0)
      } catch (error) {
        console.error(`Error counting records in ${table.tablename}:`, error)
      }
    }

    // Get database size
    const sizeResult = await (prisma as any).$queryRaw`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size
    ` as { size: string }[];
    const databaseSize = sizeResult[0]?.size || 'Unknown';

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
