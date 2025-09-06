
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { downloadFile } from '@/lib/s3'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import https from 'https'

const execAsync = promisify(exec)

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const backup = await prisma.databaseBackup.findUnique({
      where: { id: params.id }
    })

    if (!backup) {
      return NextResponse.json(
        { error: 'Backup not found' },
        { status: 404 }
      )
    }

    if (backup.status !== 'completed' || !backup.cloud_storage_path) {
      return NextResponse.json(
        { error: 'Backup is not available for restore' },
        { status: 400 }
      )
    }

    // Start restore process in background
    restoreDatabase(backup.id, backup.cloud_storage_path)
      .catch(error => {
        console.error('Restore process failed:', error)
      })

    return NextResponse.json({ 
      success: true, 
      message: 'Database restore started' 
    })
  } catch (error) {
    console.error('Error starting database restore:', error)
    return NextResponse.json(
      { error: 'Failed to start database restore' },
      { status: 500 }
    )
  }
}

async function restoreDatabase(backupId: string, cloudStoragePath: string) {
  try {
    // Get signed download URL
    const downloadUrl = await downloadFile(cloudStoragePath)
    
    // Download backup file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const tempPath = `/tmp/restore_${timestamp}.sql`
    
    await downloadBackupFile(downloadUrl, tempPath)

    // Get database connection details
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      throw new Error('DATABASE_URL not configured')
    }

    const url = new URL(databaseUrl)
    const dbName = url.pathname.slice(1)
    const host = url.hostname
    const port = url.port || '5432'
    const username = url.username
    const password = url.password

    // Create restore command
    const restoreCommand = `PGPASSWORD="${password}" psql -h ${host} -p ${port} -U ${username} -d ${dbName} -f ${tempPath}`
    
    // Execute restore
    await execAsync(restoreCommand)

    // Clean up temp file
    await fs.unlink(tempPath)

    console.log(`Database restore from backup ${backupId} completed successfully`)
  } catch (error) {
    console.error('Database restore failed:', error)
    throw error
  }
}

function downloadBackupFile(url: string, filepath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.open(filepath, 'w')
    
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`))
        return
      }

      file.then(fileHandle => {
        const writeStream = fileHandle.createWriteStream()
        response.pipe(writeStream)
        
        writeStream.on('finish', () => {
          fileHandle.close()
          resolve()
        })
        
        writeStream.on('error', (error) => {
          fileHandle.close()
          reject(error)
        })
      }).catch(reject)
    }).on('error', reject)
  })
}
