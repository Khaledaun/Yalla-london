#!/usr/bin/env node
/**
 * Automated Backup Scheduling and Retention Management
 * Enhanced backup system with automated scheduling, retention policies, and monitoring
 */

import cron from 'node-cron';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import { logAuditEvent } from '../lib/rbac';
import { performanceMonitor } from '../lib/performance-monitoring';

const execAsync = promisify(exec);

interface BackupConfig {
  databaseUrl: string;
  s3Bucket?: string;
  s3Prefix?: string;
  retentionDays: number;
  environment: 'development' | 'staging' | 'production';
}

interface BackupSchedule {
  development: {
    frequency: string; // cron format
    retention: number; // days
    enabled: boolean;
  };
  staging: {
    frequency: string;
    retention: number;
    enabled: boolean;
  };
  production: {
    incremental: string;
    full: string;
    retention: number;
    enabled: boolean;
  };
}

interface BackupResult {
  success: boolean;
  filename?: string;
  size?: number;
  duration: number;
  error?: string;
  s3Location?: string;
}

class BackupScheduler {
  private config: BackupConfig;
  private schedule: BackupSchedule;
  private logFile: string;
  private runningBackups: Set<string> = new Set();

  constructor() {
    this.config = {
      databaseUrl: process.env.DATABASE_URL || '',
      s3Bucket: process.env.AWS_BUCKET_NAME,
      s3Prefix: process.env.AWS_FOLDER_PREFIX || 'backups/',
      retentionDays: this.getRetentionDays(),
      environment: (process.env.NODE_ENV as any) || 'development'
    };

    this.schedule = {
      development: {
        frequency: '0 2 * * *', // Daily at 2 AM
        retention: 7,
        enabled: process.env.BACKUP_ENABLED !== 'false'
      },
      staging: {
        frequency: '0 1 * * *', // Daily at 1 AM
        retention: 30,
        enabled: process.env.BACKUP_ENABLED !== 'false'
      },
      production: {
        incremental: '0 */6 * * *', // Every 6 hours
        full: '0 0 * * 0', // Weekly on Sunday at midnight
        retention: 365 * 7, // 7 years for compliance
        enabled: process.env.BACKUP_ENABLED !== 'false'
      }
    };

    this.logFile = path.join(process.cwd(), 'logs', 'backup.log');
    this.ensureLogDirectory();
    this.initializeScheduler();
  }

  private getRetentionDays(): number {
    const env = process.env.NODE_ENV;
    const customRetention = process.env.BACKUP_RETENTION_DAYS;
    
    if (customRetention) {
      return parseInt(customRetention);
    }
    
    switch (env) {
      case 'production':
        return 365 * 7; // 7 years
      case 'staging':
        return 30;
      default:
        return 7;
    }
  }

  private ensureLogDirectory(): void {
    const logDir = path.dirname(this.logFile);
    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true });
    }
  }

  private log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
    
    try {
      writeFileSync(this.logFile, logEntry, { flag: 'a' });
      console.log(logEntry.trim());
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  private async initializeScheduler(): Promise<void> {
    if (!this.config.databaseUrl) {
      this.log('❌ DATABASE_URL not configured, backup scheduler disabled', 'error');
      return;
    }

    const envConfig = this.schedule[this.config.environment];
    
    if (this.config.environment === 'production') {
      // Production has both incremental and full backups
      if (envConfig.enabled) {
        this.log(`🚀 Initializing production backup scheduler...`);
        this.log(`📅 Incremental backups: ${envConfig.incremental}`);
        this.log(`📅 Full backups: ${envConfig.full}`);
        
        // Incremental backups
        cron.schedule(envConfig.incremental, () => {
          this.runScheduledBackup('incremental');
        });
        
        // Full backups
        cron.schedule(envConfig.full, () => {
          this.runScheduledBackup('full');
        });
      }
    } else {
      // Development and staging use simple daily backups
      if (envConfig.enabled) {
        this.log(`🚀 Initializing ${this.config.environment} backup scheduler...`);
        this.log(`📅 Backup frequency: ${envConfig.frequency}`);
        
        cron.schedule(envConfig.frequency, () => {
          this.runScheduledBackup('full');
        });
      }
    }

    // Schedule cleanup every day at 3 AM
    cron.schedule('0 3 * * *', () => {
      this.cleanupOldBackups();
    });

    this.log(`✅ Backup scheduler initialized for ${this.config.environment} environment`);
  }

  private async runScheduledBackup(type: 'incremental' | 'full'): Promise<void> {
    const backupId = `${type}-${Date.now()}`;
    
    if (this.runningBackups.has(type)) {
      this.log(`⚠️ ${type} backup already running, skipping`, 'warn');
      return;
    }

    this.runningBackups.add(type);
    
    try {
      this.log(`🚀 Starting scheduled ${type} backup...`);
      
      const result = await this.createBackup(type);
      
      if (result.success) {
        this.log(`✅ ${type} backup completed: ${result.filename} (${this.formatBytes(result.size || 0)}, ${result.duration}ms)`);
        
        // Log to audit system
        await logAuditEvent({
          action: 'backup_created',
          resource: 'database',
          details: {
            backup_type: type,
            filename: result.filename,
            size_bytes: result.size,
            duration_ms: result.duration,
            s3_location: result.s3Location,
            environment: this.config.environment
          },
          success: true
        });

        // Track performance metric
        await performanceMonitor.trackPerformance({
          name: 'backup_duration',
          value: result.duration,
          unit: 'ms',
          timestamp: new Date(),
          tags: {
            type,
            environment: this.config.environment,
            size: this.formatBytes(result.size || 0)
          }
        });
        
      } else {
        this.log(`❌ ${type} backup failed: ${result.error}`, 'error');
        
        await logAuditEvent({
          action: 'backup_failed',
          resource: 'database',
          details: {
            backup_type: type,
            error_message: result.error,
            environment: this.config.environment
          },
          success: false,
          errorMessage: result.error
        });

        // Send error to monitoring
        await performanceMonitor.captureError(
          new Error(`Backup failed: ${result.error}`),
          {
            backup_type: type,
            environment: this.config.environment
          }
        );
      }
      
    } catch (error) {
      this.log(`❌ Backup error: ${error instanceof Error ? error.message : error}`, 'error');
    } finally {
      this.runningBackups.delete(type);
    }
  }

  private async createBackup(type: 'incremental' | 'full'): Promise<BackupResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${this.config.environment}-${type}-${timestamp}.sql`;
    const localPath = path.join(process.cwd(), 'backups', filename);
    
    try {
      // Ensure backup directory exists
      const backupDir = path.dirname(localPath);
      if (!existsSync(backupDir)) {
        mkdirSync(backupDir, { recursive: true });
      }

      // Create database dump
      let command: string;
      
      if (type === 'incremental' && this.config.environment === 'production') {
        // For incremental backups, we could implement WAL-based backups
        // For now, we'll do a full backup but mark it as incremental
        command = `pg_dump "${this.config.databaseUrl}" --no-owner --no-acl --compress=9 > "${localPath}.gz"`;
      } else {
        command = `pg_dump "${this.config.databaseUrl}" --no-owner --no-acl --compress=9 > "${localPath}.gz"`;
      }

      const { stdout, stderr } = await execAsync(command);
      
      if (stderr && !stderr.includes('WARNING')) {
        throw new Error(`pg_dump error: ${stderr}`);
      }

      // Get file size
      const { stdout: sizeOutput } = await execAsync(`ls -la "${localPath}.gz" | awk '{print $5}'`);
      const size = parseInt(sizeOutput.trim());

      // Upload to S3 if configured
      let s3Location: string | undefined;
      if (this.config.s3Bucket) {
        const s3Key = `${this.config.s3Prefix}${filename}.gz`;
        const uploadCommand = `aws s3 cp "${localPath}.gz" "s3://${this.config.s3Bucket}/${s3Key}" --storage-class STANDARD_IA`;
        
        try {
          await execAsync(uploadCommand);
          s3Location = `s3://${this.config.s3Bucket}/${s3Key}`;
          this.log(`📤 Backup uploaded to S3: ${s3Location}`);
          
          // Remove local file after successful upload (production only)
          if (this.config.environment === 'production') {
            await execAsync(`rm "${localPath}.gz"`);
          }
        } catch (uploadError) {
          this.log(`⚠️ S3 upload failed: ${uploadError}`, 'warn');
          // Don't fail the backup if S3 upload fails
        }
      }

      const duration = Date.now() - startTime;
      
      return {
        success: true,
        filename: `${filename}.gz`,
        size,
        duration,
        s3Location
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        success: false,
        duration,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async cleanupOldBackups(): Promise<void> {
    this.log('🧹 Starting backup cleanup...');
    
    try {
      const retentionDate = new Date();
      retentionDate.setDate(retentionDate.getDate() - this.config.retentionDays);
      
      // Clean up local backups
      const backupDir = path.join(process.cwd(), 'backups');
      if (existsSync(backupDir)) {
        const { stdout } = await execAsync(`find "${backupDir}" -name "*.sql*" -type f -mtime +${this.config.retentionDays} -ls`);
        
        if (stdout.trim()) {
          this.log(`📋 Found old backups to delete:\n${stdout}`);
          await execAsync(`find "${backupDir}" -name "*.sql*" -type f -mtime +${this.config.retentionDays} -delete`);
          this.log('🗑️ Local backup cleanup completed');
        } else {
          this.log('✅ No old local backups to clean up');
        }
      }

      // Clean up S3 backups
      if (this.config.s3Bucket) {
        const cutoffDate = retentionDate.toISOString().split('T')[0];
        const listCommand = `aws s3 ls "s3://${this.config.s3Bucket}/${this.config.s3Prefix}" --recursive`;
        
        try {
          const { stdout } = await execAsync(listCommand);
          const oldFiles = stdout
            .split('\n')
            .filter(line => line.trim())
            .filter(line => {
              const dateStr = line.substring(0, 10);
              return dateStr < cutoffDate;
            })
            .map(line => line.split(' ').pop())
            .filter(Boolean);

          if (oldFiles.length > 0) {
            this.log(`📋 Found ${oldFiles.length} old S3 backups to delete`);
            
            for (const file of oldFiles) {
              await execAsync(`aws s3 rm "s3://${this.config.s3Bucket}/${file}"`);
            }
            
            this.log('🗑️ S3 backup cleanup completed');
          } else {
            this.log('✅ No old S3 backups to clean up');
          }
        } catch (s3Error) {
          this.log(`⚠️ S3 cleanup failed: ${s3Error}`, 'warn');
        }
      }

      // Log cleanup completion
      await logAuditEvent({
        action: 'backup_cleanup',
        resource: 'database',
        details: {
          retention_days: this.config.retentionDays,
          cutoff_date: retentionDate.toISOString(),
          environment: this.config.environment
        },
        success: true
      });
      
    } catch (error) {
      this.log(`❌ Backup cleanup failed: ${error}`, 'error');
      
      await logAuditEvent({
        action: 'backup_cleanup',
        resource: 'database',
        details: {
          error_message: error instanceof Error ? error.message : String(error),
          environment: this.config.environment
        },
        success: false,
        errorMessage: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Manual backup trigger
   */
  async triggerManualBackup(type: 'incremental' | 'full' = 'full'): Promise<BackupResult> {
    this.log(`🔧 Manual ${type} backup triggered`);
    
    const result = await this.createBackup(type);
    
    await logAuditEvent({
      action: 'manual_backup_triggered',
      resource: 'database',
      details: {
        backup_type: type,
        result: result.success ? 'success' : 'failed',
        filename: result.filename,
        error: result.error
      },
      success: result.success,
      errorMessage: result.error
    });
    
    return result;
  }

  /**
   * Get backup status and statistics
   */
  async getBackupStatus(): Promise<{
    scheduler: {
      environment: string;
      enabled: boolean;
      nextRun?: string;
      runningBackups: string[];
    };
    recent: Array<{
      filename: string;
      size: number;
      date: string;
      location: 'local' | 's3' | 'both';
    }>;
    storage: {
      local: {
        count: number;
        totalSize: number;
      };
      s3?: {
        count: number;
        estimatedSize: number;
      };
    };
  }> {
    // This would implement status checking logic
    return {
      scheduler: {
        environment: this.config.environment,
        enabled: this.schedule[this.config.environment].enabled,
        runningBackups: Array.from(this.runningBackups)
      },
      recent: [],
      storage: {
        local: { count: 0, totalSize: 0 }
      }
    };
  }
}

// Initialize scheduler if running as main module
if (require.main === module) {
  const scheduler = new BackupScheduler();
  
  // Handle CLI commands
  const command = process.argv[2];
  
  if (command === 'backup') {
    const type = (process.argv[3] as 'full' | 'incremental') || 'full';
    scheduler.triggerManualBackup(type)
      .then(result => {
        console.log('✅ Manual backup completed:', result);
        process.exit(result.success ? 0 : 1);
      })
      .catch(error => {
        console.error('❌ Manual backup failed:', error);
        process.exit(1);
      });
  } else if (command === 'status') {
    scheduler.getBackupStatus()
      .then(status => {
        console.log('📊 Backup Status:', JSON.stringify(status, null, 2));
        process.exit(0);
      })
      .catch(error => {
        console.error('❌ Failed to get backup status:', error);
        process.exit(1);
      });
  } else {
    // Start scheduler daemon
    console.log('🚀 Starting backup scheduler daemon...');
    
    // Keep process alive
    process.on('SIGINT', () => {
      console.log('\n🛑 Backup scheduler shutting down...');
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      console.log('\n🛑 Backup scheduler shutting down...');
      process.exit(0);
    });
  }
}

export { BackupScheduler };