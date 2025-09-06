
import { chromium, FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  const { baseURL } = config.projects[0].use;
  
  console.log(`🧹 Starting global teardown for staging tests at: ${baseURL}`);
  
  // Launch a browser to clean up test data
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    await page.goto(baseURL || 'http://localhost:3000');
    
    // Clean up test data if needed
    if (process.env.CLEANUP_TEST_DATA === '1') {
      console.log('🗑️ Cleaning up test data...');
      
      // Delete test content created during E2E tests
      await page.request.delete('/api/test/cleanup-data');
      
      console.log('✅ Test data cleaned up');
    }
    
    // Generate test report summary
    console.log('📊 Generating test summary...');
    
  } catch (error) {
    console.error('⚠️ Global teardown warning:', error);
    // Don't fail the build if teardown has issues
  } finally {
    await browser.close();
  }
  
  console.log('🎯 Global teardown completed');
}

export default globalTeardown;
