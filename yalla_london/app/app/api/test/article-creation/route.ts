import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'pg'

export async function POST(request: NextRequest) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  })

  try {
    console.log('🔌 Testing Article Creation via API...')

    // Connect to database
    await client.connect()
    console.log('✅ Connected to database successfully!')

    // Create test table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS test_articles (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT,
        slug VARCHAR(255) UNIQUE,
        status VARCHAR(50) DEFAULT 'draft',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('✅ Test table created/verified')

    // Generate a new article
    const articleData = {
      title: 'Best Hidden Gems in London: A Local\'s Guide',
      slug: 'best-hidden-gems-london-locals-guide',
      content: `# Best Hidden Gems in London: A Local's Guide

London is full of well-known attractions, but the real magic lies in its hidden gems. As a local, I've discovered some incredible places that most tourists never see. Here's my guide to London's best-kept secrets.

## Neal's Yard - Covent Garden's Colorful Secret

Tucked away behind Seven Dials, Neal's Yard is a tiny courtyard that feels like stepping into a different world. The colorful buildings and independent cafes make it a perfect spot for Instagram photos and quiet coffee breaks.

**Why it's special:**
- Vibrant, Instagram-worthy setting
- Independent cafes and shops
- Peaceful escape from busy Covent Garden
- Free to visit

## Leadenhall Market - Victorian Elegance

This covered market in the City of London is a masterpiece of Victorian architecture. It's where parts of Diagon Alley were filmed for the Harry Potter movies, but it's also a working market with excellent food stalls.

**What to expect:**
- Stunning Victorian architecture
- Great food and drink options
- Harry Potter filming location
- Historic atmosphere

## Little Venice - London's Answer to Amsterdam

This charming area around Paddington Basin features canals, houseboats, and waterside cafes. It's perfect for a peaceful walk or a canal boat trip.

**Activities:**
- Canal boat trips
- Waterside dining
- Houseboat spotting
- Peaceful walks

## Conclusion

These hidden gems offer a different perspective on London, away from the crowds and tourist traps. Each location has its own unique charm and provides an authentic London experience that you won't find in guidebooks.

Whether you're a first-time visitor or a long-time resident, these spots are worth exploring for a truly local London experience.`,
      status: 'published'
    }

    // Insert the article
    const insertResult = await client.query(`
      INSERT INTO test_articles (title, content, slug, status) 
      VALUES ($1, $2, $3, $4) 
      RETURNING id, title, slug, status, created_at
    `, [articleData.title, articleData.content, articleData.slug, articleData.status])

    const newArticle = insertResult.rows[0]
    console.log(`✅ Article created: ${newArticle.title} (ID: ${newArticle.id})`)

    // Retrieve the article to verify
    const selectResult = await client.query(`
      SELECT * FROM test_articles 
      WHERE id = $1
    `, [newArticle.id])

    const retrievedArticle = selectResult.rows[0]

    // Count total articles
    const countResult = await client.query('SELECT COUNT(*) as total FROM test_articles')
    const totalArticles = countResult.rows[0].total

    // Generate public URL
    const publicUrl = `http://localhost:3000/blog/${newArticle.slug}`

    return NextResponse.json({
      success: true,
      message: 'Article created and saved successfully!',
      data: {
        article: {
          id: newArticle.id,
          title: newArticle.title,
          slug: newArticle.slug,
          status: newArticle.status,
          createdAt: newArticle.created_at,
          contentLength: retrievedArticle.content.length
        },
        database: {
          connection: 'Working',
          totalArticles: parseInt(totalArticles),
          tableExists: true
        },
        publicUrl: publicUrl,
        summary: {
          databaseConnection: 'Working',
          articleCreation: 'Successful',
          dataPersistence: 'Verified',
          articleRetrieval: 'Working',
          publicUrl: 'Generated'
        }
      }
    })

  } catch (error) {
    console.error('❌ Error during article creation:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create article',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  } finally {
    await client.end()
  }
}
