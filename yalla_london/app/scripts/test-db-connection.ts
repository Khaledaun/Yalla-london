#!/usr/bin/env tsx

/**
 * Test Database Connection
 * Tests the actual database connection string
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function testDbConnection() {
  console.log('🔌 Testing Database Connection String...\n');

  console.log('Environment Variables:');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
  console.log('DIRECT_URL:', process.env.DIRECT_URL ? 'SET' : 'NOT SET');

  if (process.env.DATABASE_URL) {
    console.log('\nDATABASE_URL value:', process.env.DATABASE_URL.substring(0, 50) + '...');
  }

  // Try to connect using the connection string directly
  try {
    const { PrismaClient } = require('@prisma/client');
    
    // Create client with explicit connection string
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      }
    });

    console.log('\n1. Testing connection...');
    await prisma.$connect();
    console.log('✅ Connected successfully');

    console.log('\n2. Testing basic query...');
    const result = await prisma.$queryRaw`SELECT current_database() as db_name, current_user as user_name`;
    console.log('✅ Database info:', result);

    console.log('\n3. Testing table creation...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS test_connection (
        id SERIAL PRIMARY KEY,
        test_data TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✅ Test table created');

    console.log('\n4. Testing data insertion...');
    await prisma.$executeRaw`
      INSERT INTO test_connection (test_data) VALUES ('connection test successful')
      ON CONFLICT DO NOTHING
    `;
    console.log('✅ Test data inserted');

    console.log('\n5. Testing data retrieval...');
    const testData = await prisma.$queryRaw`SELECT * FROM test_connection`;
    console.log('✅ Test data retrieved:', testData);

    console.log('\n6. Testing table listing...');
    const tables = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    console.log('✅ Tables in database:', tables);

    console.log('\n7. Cleaning up...');
    await prisma.$executeRaw`DROP TABLE IF EXISTS test_connection`;
    console.log('✅ Test table cleaned up');

    await prisma.$disconnect();
    console.log('\n✅ Database connection test completed successfully!');

  } catch (error) {
    console.error('❌ Database connection test failed:', error);
  }
}

// Run the test
testDbConnection().catch(console.error);
