import { Client } from 'pg'

async function testSimpleDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  })

  try {
    console.log('🔌 Testing Simple Database Connection...\n')

    // Connect to database
    await client.connect()
    console.log('✅ Connected to database successfully!')

    // Test basic query
    const result = await client.query('SELECT NOW() as current_time')
    console.log(`⏰ Database time: ${result.rows[0].current_time}`)

    // Check if tables exist
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `)
    
    console.log(`\n📋 Existing tables: ${tablesResult.rows.length}`)
    tablesResult.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.table_name}`)
    })

    // Create a simple test table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS test_articles (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('\n✅ Test table created/verified')

    // Insert a test article
    const insertResult = await client.query(`
      INSERT INTO test_articles (title, content) 
      VALUES ($1, $2) 
      RETURNING id, title, created_at
    `, [
      'Test Article: Best Hidden Gems in London',
      'This is a test article to verify database functionality. London has many hidden gems waiting to be discovered!'
    ])

    const newArticle = insertResult.rows[0]
    console.log(`\n📝 Test article created:`)
    console.log(`   ID: ${newArticle.id}`)
    console.log(`   Title: ${newArticle.title}`)
    console.log(`   Created: ${newArticle.created_at}`)

    // Retrieve the article
    const selectResult = await client.query(`
      SELECT * FROM test_articles 
      WHERE id = $1
    `, [newArticle.id])

    if (selectResult.rows.length > 0) {
      console.log('\n✅ Article retrieved successfully!')
      console.log(`   Content: ${selectResult.rows[0].content.substring(0, 100)}...`)
    }

    // Count total articles
    const countResult = await client.query('SELECT COUNT(*) as total FROM test_articles')
    console.log(`\n📊 Total test articles: ${countResult.rows[0].total}`)

    // Test public URL generation
    const publicUrl = `http://localhost:3000/blog/test-article-${newArticle.id}`
    console.log(`\n🔗 Generated public URL: ${publicUrl}`)

    console.log('\n🎉 Simple Database Test Completed Successfully!')
    console.log('\n📊 Summary:')
    console.log(`   ✅ Database connection: Working`)
    console.log(`   ✅ Table creation: Successful`)
    console.log(`   ✅ Article insertion: Successful`)
    console.log(`   ✅ Article retrieval: Working`)
    console.log(`   ✅ Data persistence: Verified`)
    console.log(`   ✅ Public URL: Generated`)

  } catch (error) {
    console.error('❌ Error during database test:', error)
    throw error
  } finally {
    await client.end()
  }
}

// Load environment variables
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

// Run the test
testSimpleDatabase()
  .then(() => {
    console.log('\n✅ Test completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  })
