#!/usr/bin/env tsx

/**
 * Test Pipeline API
 * Tests the pipeline API endpoint
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function testPipelineAPI() {
  console.log('🧪 Testing Pipeline API...\n');

  try {
    // Test the pipeline API endpoint
    const response = await fetch('http://localhost:3000/api/admin/pipeline?include_history=true', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Pipeline API response:');
      console.log(JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log('❌ Pipeline API error:');
      console.log(errorText);
    }

  } catch (error) {
    console.error('❌ Pipeline API test failed:', error);
  }
}

// Run the test
testPipelineAPI().catch(console.error);
