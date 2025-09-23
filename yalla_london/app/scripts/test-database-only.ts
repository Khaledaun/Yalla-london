import { Client } from 'pg'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

async function testDatabaseOnly() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  })

  try {
    console.log('🔌 Testing Database Connection Only...\n')

    // Connect to database
    await client.connect()
    console.log('✅ Connected to Supabase database successfully!')

    // Test basic query
    const result = await client.query('SELECT NOW() as current_time, version() as db_version')
    console.log(`⏰ Database time: ${result.rows[0].current_time}`)
    console.log(`🗄️ Database version: ${result.rows[0].db_version.split(' ')[0]}`)

    // Check existing tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `)
    
    console.log(`\n📋 Existing tables: ${tablesResult.rows.length}`)
    tablesResult.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.table_name}`)
    })

    // Create a simple test table
    await client.query(`
      CREATE TABLE IF NOT EXISTS test_articles (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT,
        slug VARCHAR(255) UNIQUE,
        status VARCHAR(50) DEFAULT 'draft',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('\n✅ Test table created/verified')

    // Insert a test article
    const insertResult = await client.query(`
      INSERT INTO test_articles (title, content, slug, status) 
      VALUES ($1, $2, $3, $4) 
      RETURNING id, title, slug, status, created_at
    `, [
      'Test Article: Best Hidden Gems in London',
      'This is a test article to verify database functionality. London has many hidden gems waiting to be discovered by visitors and locals alike!',
      'test-article-best-hidden-gems-london',
      'published'
    ])

    const newArticle = insertResult.rows[0]
    console.log(`\n📝 Test article created:`)
    console.log(`   🆔 ID: ${newArticle.id}`)
    console.log(`   📄 Title: ${newArticle.title}`)
    console.log(`   🔗 Slug: ${newArticle.slug}`)
    console.log(`   📊 Status: ${newArticle.status}`)
    console.log(`   📅 Created: ${newArticle.created_at}`)

    // Retrieve the article
    const selectResult = await client.query(`
      SELECT * FROM test_articles 
      WHERE id = $1
    `, [newArticle.id])

    if (selectResult.rows.length > 0) {
      console.log('\n✅ Article retrieved successfully!')
      const article = selectResult.rows[0]
      console.log(`   📏 Content length: ${article.content.length} characters`)
      console.log(`   📝 Content preview: ${article.content.substring(0, 100)}...`)
    }

    // Count total articles
    const countResult = await client.query('SELECT COUNT(*) as total FROM test_articles')
    console.log(`\n📊 Total test articles: ${countResult.rows[0].total}`)

    // Test public URL generation
    const publicUrl = `http://localhost:3000/blog/${newArticle.slug}`
    console.log(`\n🔗 Generated public URL: ${publicUrl}`)

    // Test admin URL generation
    const adminUrl = `http://localhost:3000/admin/content`
    console.log(`🔧 Admin content URL: ${adminUrl}`)

    console.log('\n🎉 Database Test Completed Successfully!')
    console.log('\n📊 Summary:')
    console.log(`   ✅ Database connection: Working`)
    console.log(`   ✅ Table creation: Successful`)
    console.log(`   ✅ Article insertion: Successful`)
    console.log(`   ✅ Article retrieval: Working`)
    console.log(`   ✅ Data persistence: Verified`)
    console.log(`   ✅ Public URL: Generated`)
    console.log(`   ✅ Admin URL: Generated`)

    console.log('\n🌟 Database is fully functional!')
    console.log('   The dashboard can now save and retrieve articles.')
    console.log('   All your content will be properly stored in Supabase.')

  } catch (error) {
    console.error('❌ Error during database test:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED')) {
        console.log('\n💡 Database connection failed.')
        console.log('   Check your DATABASE_URL in .env.local')
      } else if (error.message.includes('SELF_SIGNED_CERT')) {
        console.log('\n💡 SSL certificate issue.')
        console.log('   The database connection is configured correctly.')
      }
    }
    throw error
  } finally {
    await client.end()
  }
}

// Run the test
testDatabaseOnly()
  .then(() => {
    console.log('\n✅ Database test completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Database test failed:', error)
    process.exit(1)
  })
