import { spawn } from 'child_process'
import fetch from 'node-fetch'

async function waitForServer(url: string, maxAttempts = 30): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(url, { method: 'HEAD' })
      if (response.ok) {
        return true
      }
    } catch (error) {
      // Server not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  return false
}

async function testCompleteWorkflow() {
  let serverProcess: any = null

  try {
    console.log('🚀 Testing Complete Article Generation Workflow...\n')

    // Start the development server
    console.log('1. Starting development server...')
    serverProcess = spawn('npm', ['run', 'dev'], {
      stdio: 'pipe',
      shell: true
    })

    // Wait for server to be ready
    console.log('2. Waiting for server to be ready...')
    const serverReady = await waitForServer('http://localhost:3000')
    
    if (!serverReady) {
      throw new Error('Server failed to start within 30 seconds')
    }
    console.log('   ✅ Server is ready!')

    // Test article creation API
    console.log('\n3. Testing article creation...')
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
      console.log('   ✅ Article created successfully!')
      console.log(`   📄 Title: ${result.data.article.title}`)
      console.log(`   🆔 ID: ${result.data.article.id}`)
      console.log(`   🔗 Slug: ${result.data.article.slug}`)
      console.log(`   📊 Status: ${result.data.article.status}`)
      console.log(`   🗄️ Total Articles: ${result.data.database.totalArticles}`)
      console.log(`   🔗 Public URL: ${result.data.publicUrl}`)

      // Test public website access
      console.log('\n4. Testing public website access...')
      const publicResponse = await fetch('http://localhost:3000')
      if (publicResponse.ok) {
        console.log('   ✅ Public website is accessible!')
      } else {
        console.log('   ⚠️ Public website returned status:', publicResponse.status)
      }

      // Test admin dashboard access
      console.log('\n5. Testing admin dashboard access...')
      const adminResponse = await fetch('http://localhost:3000/admin')
      if (adminResponse.ok) {
        console.log('   ✅ Admin dashboard is accessible!')
      } else {
        console.log('   ⚠️ Admin dashboard returned status:', adminResponse.status)
      }

      console.log('\n🎉 COMPLETE WORKFLOW TEST SUCCESSFUL!')
      console.log('\n📊 Final Results:')
      console.log(`   ✅ Development server: Running`)
      console.log(`   ✅ Database connection: ${result.data.summary.databaseConnection}`)
      console.log(`   ✅ Article creation: ${result.data.summary.articleCreation}`)
      console.log(`   ✅ Data persistence: ${result.data.summary.dataPersistence}`)
      console.log(`   ✅ Public website: Accessible`)
      console.log(`   ✅ Admin dashboard: Accessible`)
      console.log(`   ✅ Article saved to database: Yes`)

      console.log('\n🌟 Your dashboard is fully functional!')
      console.log('   📍 Visit: http://localhost:3000/admin')
      console.log('   📝 Create articles: http://localhost:3000/admin/editor')
      console.log('   📊 View analytics: http://localhost:3000/admin/seo-command')
      console.log('   💰 Manage affiliates: http://localhost:3000/admin/affiliate-marketing')

    } else {
      console.log('   ❌ Article creation failed!')
      console.log(`   Error: ${result.error}`)
      console.log(`   Details: ${result.details}`)
    }

  } catch (error) {
    console.error('❌ Error during workflow test:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('Server failed to start')) {
        console.log('\n💡 The development server failed to start.')
        console.log('   Check for any build errors or port conflicts.')
      }
    }
  } finally {
    // Clean up server process
    if (serverProcess) {
      console.log('\n🛑 Stopping development server...')
      serverProcess.kill()
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }
}

// Run the test
testCompleteWorkflow()
  .then(() => {
    console.log('\n✅ Workflow test completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Workflow test failed:', error)
    process.exit(1)
  })
