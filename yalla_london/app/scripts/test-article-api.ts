import fetch from 'node-fetch'

async function testArticleCreation() {
  try {
    console.log('🚀 Testing Article Creation via API...\n')

    // Wait for server to be ready
    console.log('⏳ Waiting for server to be ready...')
    await new Promise(resolve => setTimeout(resolve, 5000))

    // Test the API endpoint
    const response = await fetch('http://localhost:3000/api/test/article-creation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()

    if (result.success) {
      console.log('✅ Article Creation Test Successful!')
      console.log('\n📊 Results:')
      console.log(`   📄 Article ID: ${result.data.article.id}`)
      console.log(`   📝 Title: ${result.data.article.title}`)
      console.log(`   🔗 Slug: ${result.data.article.slug}`)
      console.log(`   📊 Status: ${result.data.article.status}`)
      console.log(`   📅 Created: ${result.data.article.createdAt}`)
      console.log(`   📏 Content Length: ${result.data.article.contentLength} characters`)
      console.log(`   🗄️ Total Articles: ${result.data.database.totalArticles}`)
      console.log(`   🔗 Public URL: ${result.data.publicUrl}`)

      console.log('\n🎉 Summary:')
      console.log(`   ✅ Database connection: ${result.data.summary.databaseConnection}`)
      console.log(`   ✅ Article creation: ${result.data.summary.articleCreation}`)
      console.log(`   ✅ Data persistence: ${result.data.summary.dataPersistence}`)
      console.log(`   ✅ Article retrieval: ${result.data.summary.articleRetrieval}`)
      console.log(`   ✅ Public URL: ${result.data.summary.publicUrl}`)

      console.log('\n🌟 The dashboard is fully functional and connected to the database!')
      console.log('   You can now create articles through the admin dashboard.')
      console.log('   Visit: http://localhost:3000/admin/editor')

    } else {
      console.log('❌ Article Creation Test Failed!')
      console.log(`   Error: ${result.error}`)
      console.log(`   Details: ${result.details}`)
    }

  } catch (error) {
    console.error('❌ Error during API test:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED')) {
        console.log('\n💡 Solution: Make sure the development server is running:')
        console.log('   Run: npm run dev')
        console.log('   Then visit: http://localhost:3000')
      } else if (error.message.includes('fetch')) {
        console.log('\n💡 Solution: The API endpoint might not be accessible.')
        console.log('   Check if the server is running on http://localhost:3000')
      }
    }
  }
}

// Run the test
testArticleCreation()
  .then(() => {
    console.log('\n✅ Test completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  })
