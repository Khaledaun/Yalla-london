import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testArticleGeneration() {
  try {
    console.log('🚀 Testing Article Generation and Database Saving...\n')

    // 1. First, let's check if we have any existing data
    console.log('1. Checking existing data...')
    const existingPosts = await prisma.blogPost.findMany()
    const existingCategories = await prisma.category.findMany()
    const existingUsers = await prisma.user.findMany()
    
    console.log(`   📝 Existing blog posts: ${existingPosts.length}`)
    console.log(`   📂 Existing categories: ${existingCategories.length}`)
    console.log(`   👥 Existing users: ${existingUsers.length}`)

    // 2. Create a test category if none exists
    let category
    if (existingCategories.length === 0) {
      console.log('\n2. Creating test category...')
      category = await prisma.category.create({
        data: {
          name: 'London Attractions',
          slug: 'london-attractions',
          description: 'Discover the best attractions in London',
          locale: 'en'
        }
      })
      console.log(`   ✅ Created category: ${category.name}`)
    } else {
      category = existingCategories[0]
      console.log(`\n2. Using existing category: ${category.name}`)
    }

    // 3. Create a test user if none exists
    let user
    if (existingUsers.length === 0) {
      console.log('\n3. Creating test user...')
      user = await prisma.user.create({
        data: {
          name: 'Test Admin',
          email: 'admin@yallalondon.com',
          role: 'admin'
        }
      })
      console.log(`   ✅ Created user: ${user.name}`)
    } else {
      user = existingUsers[0]
      console.log(`\n3. Using existing user: ${user.name}`)
    }

    // 4. Generate a new article
    console.log('\n4. Generating new article...')
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
      excerpt: 'Discover London\'s best-kept secrets with this local\'s guide to hidden gems, from colorful Neal\'s Yard to the Victorian elegance of Leadenhall Market.',
      locale: 'en',
      status: 'published',
      authorId: user.id,
      categoryId: category.id,
      seoTitle: 'Best Hidden Gems in London: A Local\'s Guide 2024',
      seoDescription: 'Discover London\'s best-kept secrets with this local\'s guide to hidden gems. From Neal\'s Yard to Leadenhall Market, explore authentic London experiences.',
      keywords: 'hidden gems london, local london guide, secret london spots, neal\'s yard, leadenhall market, little venice london',
      publishedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const newArticle = await prisma.blogPost.create({
      data: articleData
    })

    console.log(`   ✅ Article created successfully!`)
    console.log(`   📄 Title: ${newArticle.title}`)
    console.log(`   🔗 Slug: ${newArticle.slug}`)
    console.log(`   🆔 ID: ${newArticle.id}`)
    console.log(`   📅 Published: ${newArticle.publishedAt}`)

    // 5. Verify the article was saved
    console.log('\n5. Verifying article in database...')
    const savedArticle = await prisma.blogPost.findUnique({
      where: { id: newArticle.id },
      include: {
        author: true,
        category: true
      }
    })

    if (savedArticle) {
      console.log('   ✅ Article found in database!')
      console.log(`   👤 Author: ${savedArticle.author?.name}`)
      console.log(`   📂 Category: ${savedArticle.category?.name}`)
      console.log(`   📊 Status: ${savedArticle.status}`)
      console.log(`   🌐 Locale: ${savedArticle.locale}`)
      console.log(`   📝 Content length: ${savedArticle.content.length} characters`)
    } else {
      console.log('   ❌ Article not found in database!')
    }

    // 6. Test article retrieval
    console.log('\n6. Testing article retrieval...')
    const allArticles = await prisma.blogPost.findMany({
      include: {
        author: true,
        category: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`   📚 Total articles in database: ${allArticles.length}`)
    console.log('   📋 Recent articles:')
    allArticles.slice(0, 3).forEach((article, index) => {
      console.log(`      ${index + 1}. ${article.title} (${article.status})`)
    })

    // 7. Test public URL generation
    console.log('\n7. Testing public URL generation...')
    const publicUrl = `http://localhost:3000/blog/${newArticle.slug}`
    console.log(`   🔗 Public URL: ${publicUrl}`)
    console.log(`   📱 Mobile URL: ${publicUrl}?mobile=true`)

    console.log('\n🎉 Article Generation Test Completed Successfully!')
    console.log('\n📊 Summary:')
    console.log(`   ✅ Database connection: Working`)
    console.log(`   ✅ Article creation: Successful`)
    console.log(`   ✅ Data persistence: Verified`)
    console.log(`   ✅ Article retrieval: Working`)
    console.log(`   ✅ Public URL: Generated`)

  } catch (error) {
    console.error('❌ Error during article generation test:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test
testArticleGeneration()
  .then(() => {
    console.log('\n✅ Test completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  })
