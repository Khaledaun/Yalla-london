
import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;
  
  console.log(`🚀 Starting global setup for staging tests at: ${baseURL}`);
  
  // Launch a browser to verify the staging site is accessible
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Check if the staging site is reachable
    console.log('🔍 Checking staging site availability...');
    await page.goto(baseURL || 'http://localhost:3000');
    await page.waitForSelector('body', { timeout: 10000 });
    
    // Verify essential elements are present
    const title = await page.title();
    if (!title.includes('Yalla London')) {
      throw new Error(`Unexpected page title: ${title}`);
    }
    
    console.log('✅ Staging site is accessible');
    
    // Check API health endpoint
    const response = await page.request.get('/api/health');
    if (!response.ok()) {
      throw new Error(`Health check failed: ${response.status()}`);
    }
    
    console.log('✅ API health check passed');
    
    // Seed test data if needed
    if (process.env.SEED_TEST_DATA === '1') {
      console.log('🌱 Seeding test data...');
      await page.request.post('/api/test/seed-data');
      console.log('✅ Test data seeded');
    }
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
  
  console.log('🎉 Global setup completed successfully');
}

export default globalSetup;
