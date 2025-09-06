
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { uploadFile } from '@/lib/s3'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'

const execAsync = promisify(exec)

export async function GET() {
  try {
    const backups = await prisma.databaseBackup.findMany({
      orderBy: { created_at: 'desc' }
    })

    return NextResponse.json(backups)
  } catch (error) {
    console.error('Error fetching database backups:', error)
    return NextResponse.json(
      { error: 'Failed to fetch database backups' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { backupName, backupType = 'manual' } = body

    // Create backup record
    const backup = await prisma.databaseBackup.create({
      data: {
        backup_name: backupName,
        backup_size: 'Calculating...',
        cloud_storage_path: '',
        backup_type: backupType,
        status: 'in-progress'
      }
    })

    // Start backup process in background
    createDatabaseBackup(backup.id, backupName, backupType)
      .catch(error => {
        console.error('Backup process failed:', error)
        // Update backup status to failed
        prisma.databaseBackup.update({
          where: { id: backup.id },
          data: {
            status: 'failed',
            error_message: error.message
          }
        })
      })

    return NextResponse.json(backup, { status: 201 })
  } catch (error) {
    console.error('Error creating database backup:', error)
    return NextResponse.json(
      { error: 'Failed to create database backup' },
      { status: 500 }
    )
  }
}

async function createDatabaseBackup(backupId: string, backupName: string, backupType: string) {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `backup_${timestamp}_${backupName.replace(/\s+/g, '_')}.sql`
    const tempPath = `/tmp/${filename}`
    
    // Get database URL and parse it
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      throw new Error('DATABASE_URL not configured')
    }

    // Extract database connection details
    const url = new URL(databaseUrl)
    const dbName = url.pathname.slice(1)
    const host = url.hostname
    const port = url.port || '5432'
    const username = url.username
    const password = url.password

    // Create pg_dump command
    const pgDumpCommand = `PGPASSWORD="${password}" pg_dump -h ${host} -p ${port} -U ${username} -d ${dbName} -f ${tempPath}`
    
    // Execute pg_dump
    await execAsync(pgDumpCommand)

    // Get file stats
    const stats = await fs.stat(tempPath)
    const fileSizeBytes = stats.size
    const fileSize = formatBytes(fileSizeBytes)

    // Read file and upload to S3
    const fileBuffer = await fs.readFile(tempPath)
    const cloudStoragePath = await uploadFile(fileBuffer, filename)

    // Get database statistics
    const tableCount = await getDatabaseTableCount()
    const recordCount = await getDatabaseRecordCount()

    // Update backup record
    await prisma.databaseBackup.update({
      where: { id: backupId },
      data: {
        backup_size: fileSize,
        cloud_storage_path: cloudStoragePath,
        tables_count: tableCount,
        records_count: recordCount,
        status: 'completed'
      }
    })

    // Clean up temp file
    await fs.unlink(tempPath)

    console.log(`Backup ${backupName} completed successfully`)
  } catch (error) {
    console.error('Database backup failed:', error)
    throw error
  }
}

async function getDatabaseTableCount(): Promise<number> {
  try {
    const result = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `
    return Number(result[0].count)
  } catch (error) {
    console.error('Error getting table count:', error)
    return 0
  }
}

async function getDatabaseRecordCount(): Promise<number> {
  try {
    // Get all table names
    const tables = await prisma.$queryRaw<[{ tablename: string }]>`
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

    return totalRecords
  } catch (error) {
    console.error('Error getting total record count:', error)
    return 0
  }
}

function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`
}
