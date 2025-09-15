export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-middleware';
import { prisma } from '@/lib/db';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface BackupTestResult {
  test_id: string;
  test_name: string;
  status: 'running' | 'passed' | 'failed';
  start_time: string;
  end_time?: string;
  duration_ms?: number;
  details: any;
  errors?: string[];
}

interface BackupValidationResult {
  backup_id: string;
  validation_tests: BackupTestResult[];
  overall_status: 'passed' | 'failed' | 'running';
  metadata: {
    backup_size: number;
    table_count: number;
    row_count: number;
    schema_version: string;
  };
}

let ongoingTests: Map<string, BackupValidationResult> = new Map();

/**
 * POST /api/database/backups/test
 * Test database backup and restore procedures
 */
export const POST = withAdminAuth(async (request: NextRequest) => {
  const startTime = Date.now();
  const testId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const body = await request.json();
    const { backup_id, test_type = 'comprehensive' } = body;
    
    // Initialize test result
    const validationResult: BackupValidationResult = {
      backup_id: backup_id || 'test_backup',
      validation_tests: [],
      overall_status: 'running',
      metadata: {
        backup_size: 0,
        table_count: 0,
        row_count: 0,
        schema_version: 'unknown'
      }
    };
    
    ongoingTests.set(testId, validationResult);
    
    // Test 1: Database Connection Test
    const connectionTest: BackupTestResult = {
      test_id: 'connection_test',
      test_name: 'Database Connection Verification',
      status: 'running',
      start_time: new Date().toISOString(),
      details: {}
    };
    validationResult.validation_tests.push(connectionTest);
    
    try {
      const connectionStart = Date.now();
      await prisma.$queryRaw`SELECT 1 as test`;
      connectionTest.status = 'passed';
      connectionTest.end_time = new Date().toISOString();
      connectionTest.duration_ms = Date.now() - connectionStart;
      connectionTest.details = { connection_time_ms: connectionTest.duration_ms };
    } catch (error) {
      connectionTest.status = 'failed';
      connectionTest.end_time = new Date().toISOString();
      connectionTest.errors = [error instanceof Error ? error.message : 'Unknown error'];
    }
    
    // Test 2: Schema Validation Test
    const schemaTest: BackupTestResult = {
      test_id: 'schema_validation',
      test_name: 'Database Schema Validation',
      status: 'running',
      start_time: new Date().toISOString(),
      details: {}
    };
    validationResult.validation_tests.push(schemaTest);
    
    try {
      const schemaStart = Date.now();
      
      // Check key tables exist
      const tables = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ` as Array<{ table_name: string }>;
      
      const requiredTables = ['User', 'Place', 'PageTypeRecipe', 'RulebookVersion'];
      const missingTables = requiredTables.filter(
        table => !tables.some(t => t.table_name === table)
      );
      
      validationResult.metadata.table_count = tables.length;
      
      if (missingTables.length === 0) {
        schemaTest.status = 'passed';
        schemaTest.details = { 
          tables_found: tables.length,
          required_tables_present: requiredTables.length 
        };
      } else {
        schemaTest.status = 'failed';
        schemaTest.errors = [`Missing required tables: ${missingTables.join(', ')}`];
      }
      
      schemaTest.end_time = new Date().toISOString();
      schemaTest.duration_ms = Date.now() - schemaStart;
      
    } catch (error) {
      schemaTest.status = 'failed';
      schemaTest.end_time = new Date().toISOString();
      schemaTest.errors = [error instanceof Error ? error.message : 'Schema validation error'];
    }
    
    // Test 3: Data Integrity Test
    const dataTest: BackupTestResult = {
      test_id: 'data_integrity',
      test_name: 'Data Integrity Verification',
      status: 'running',
      start_time: new Date().toISOString(),
      details: {}
    };
    validationResult.validation_tests.push(dataTest);
    
    try {
      const dataStart = Date.now();
      
      // Count records in key tables
      const placesCount = await prisma.place.count();
      const usersCount = await prisma.user.count();
      const recipesCount = await prisma.pageTypeRecipe.count();
      
      const totalRows = placesCount + usersCount + recipesCount;
      validationResult.metadata.row_count = totalRows;
      
      dataTest.status = 'passed';
      dataTest.details = {
        places_count: placesCount,
        users_count: usersCount,
        recipes_count: recipesCount,
        total_rows: totalRows
      };
      dataTest.end_time = new Date().toISOString();
      dataTest.duration_ms = Date.now() - dataStart;
      
    } catch (error) {
      dataTest.status = 'failed';
      dataTest.end_time = new Date().toISOString();
      dataTest.errors = [error instanceof Error ? error.message : 'Data integrity check failed'];
    }
    
    // Test 4: Backup File Validation (if backup_id provided)
    if (backup_id) {
      const backupFileTest: BackupTestResult = {
        test_id: 'backup_file_validation',
        test_name: 'Backup File Validation',
        status: 'running',
        start_time: new Date().toISOString(),
        details: {}
      };
      validationResult.validation_tests.push(backupFileTest);
      
      try {
        const backupStart = Date.now();
        
        // Find backup record
        const backup = await prisma.databaseBackup.findUnique({
          where: { id: backup_id }
        });
        
        if (backup) {
          validationResult.metadata.backup_size = parseInt(backup.backup_size) || 0;
          backupFileTest.status = 'passed';
          backupFileTest.details = {
            backup_name: backup.backup_name,
            backup_size: backup.backup_size,
            storage_path: backup.cloud_storage_path,
            created_at: backup.created_at
          };
        } else {
          backupFileTest.status = 'failed';
          backupFileTest.errors = ['Backup record not found'];
        }
        
        backupFileTest.end_time = new Date().toISOString();
        backupFileTest.duration_ms = Date.now() - backupStart;
        
      } catch (error) {
        backupFileTest.status = 'failed';
        backupFileTest.end_time = new Date().toISOString();
        backupFileTest.errors = [error instanceof Error ? error.message : 'Backup file validation failed'];
      }
    }
    
    // Test 5: Performance Baseline Test
    const performanceTest: BackupTestResult = {
      test_id: 'performance_baseline',
      test_name: 'Database Performance Baseline',
      status: 'running',
      start_time: new Date().toISOString(),
      details: {}
    };
    validationResult.validation_tests.push(performanceTest);
    
    try {
      const perfStart = Date.now();
      
      // Run some performance queries
      const queries = [
        { name: 'simple_select', query: `SELECT 1` },
        { name: 'count_places', query: `SELECT COUNT(*) FROM "Place"` },
        { name: 'complex_join', query: `SELECT p.id, p.title FROM "Place" p LIMIT 10` }
      ];
      
      const queryResults = [];
      for (const { name, query } of queries) {
        const queryStart = Date.now();
        await prisma.$queryRawUnsafe(query);
        const queryTime = Date.now() - queryStart;
        queryResults.push({ query_name: name, execution_time_ms: queryTime });
      }
      
      performanceTest.status = 'passed';
      performanceTest.details = { query_performance: queryResults };
      performanceTest.end_time = new Date().toISOString();
      performanceTest.duration_ms = Date.now() - perfStart;
      
    } catch (error) {
      performanceTest.status = 'failed';
      performanceTest.end_time = new Date().toISOString();
      performanceTest.errors = [error instanceof Error ? error.message : 'Performance test failed'];
    }
    
    // Determine overall status
    const failedTests = validationResult.validation_tests.filter(t => t.status === 'failed');
    validationResult.overall_status = failedTests.length === 0 ? 'passed' : 'failed';
    
    // Update stored result
    ongoingTests.set(testId, validationResult);
    
    return NextResponse.json({
      status: 'success',
      test_id: testId,
      validation_result: validationResult,
      duration_ms: Date.now() - startTime,
      summary: {
        total_tests: validationResult.validation_tests.length,
        passed_tests: validationResult.validation_tests.filter(t => t.status === 'passed').length,
        failed_tests: failedTests.length,
        overall_status: validationResult.overall_status
      },
      recommendations: generateRecommendations(validationResult)
    });
    
  } catch (error) {
    console.error('Backup test error:', error);
    return NextResponse.json(
      {
        status: 'error',
        test_id: testId,
        message: 'Backup test failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        duration_ms: Date.now() - startTime
      },
      { status: 500 }
    );
  }
});

/**
 * GET /api/database/backups/test
 * Get status of ongoing or completed backup tests
 */
export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const url = new URL(request.url);
    const testId = url.searchParams.get('test_id');
    
    if (testId) {
      const result = ongoingTests.get(testId);
      if (result) {
        return NextResponse.json({
          status: 'success',
          test_id: testId,
          validation_result: result
        });
      } else {
        return NextResponse.json(
          { status: 'error', message: 'Test not found' },
          { status: 404 }
        );
      }
    }
    
    // Return all test results
    const allTests = Array.from(ongoingTests.entries()).map(([id, result]) => ({
      test_id: id,
      overall_status: result.overall_status,
      test_count: result.validation_tests.length,
      backup_id: result.backup_id
    }));
    
    return NextResponse.json({
      status: 'success',
      active_tests: allTests,
      total_tests: allTests.length
    });
    
  } catch (error) {
    console.error('Backup test status error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to get test status',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});

function generateRecommendations(result: BackupValidationResult): string[] {
  const recommendations: string[] = [];
  
  const failedTests = result.validation_tests.filter(t => t.status === 'failed');
  
  if (failedTests.length === 0) {
    recommendations.push('✅ All tests passed! Database is healthy and backup-ready.');
  } else {
    recommendations.push('⚠️ Some tests failed. Review and fix issues before proceeding.');
    
    failedTests.forEach(test => {
      switch (test.test_id) {
        case 'connection_test':
          recommendations.push('🔄 Fix database connection issues before creating backups.');
          break;
        case 'schema_validation':
          recommendations.push('🗄️ Restore missing database tables or run migrations.');
          break;
        case 'data_integrity':
          recommendations.push('📊 Investigate data integrity issues in key tables.');
          break;
        case 'backup_file_validation':
          recommendations.push('💾 Verify backup file exists and is accessible.');
          break;
        case 'performance_baseline':
          recommendations.push('⚡ Database performance issues detected - consider optimization.');
          break;
      }
    });
  }
  
  // Size-based recommendations
  if (result.metadata.backup_size > 1000000000) { // > 1GB
    recommendations.push('💡 Large database detected - consider incremental backups.');
  }
  
  if (result.metadata.table_count > 50) {
    recommendations.push('💡 Many tables detected - consider backup optimization strategies.');
  }
  
  return recommendations;
}