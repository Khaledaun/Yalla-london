#!/usr/bin/env node

/**
 * Integration Testing Script for Yalla London
 * 
 * This script tests all integrations to ensure they're properly configured.
 * Run this after setting up your environment variables.
 */

const https = require('https');

// Test configuration
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

// Test individual integrations
const tests = {
  
  async testGoogleAnalytics() {
    console.log('🔍 Testing Google Analytics...');
    const gaId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;
    
    if (!gaId || gaId === 'GA_MEASUREMENT_ID_HERE') {
      console.log('❌ Google Analytics not configured');
      return false;
    }
    
    console.log('✅ Google Analytics ID configured:', gaId);
    return true;
  },

  async testEmailMarketing() {
    console.log('📧 Testing Email Marketing...');
    const providers = [
      { name: 'Mailchimp', key: 'MAILCHIMP_API_KEY' },
      { name: 'ConvertKit', key: 'CONVERTKIT_API_KEY' },
      { name: 'SendGrid', key: 'SENDGRID_API_KEY' }
    ];
    
    const configured = providers.filter(p => 
      process.env[p.key] && process.env[p.key] !== `YOUR_${p.key}_HERE`
    );
    
    if (configured.length === 0) {
      console.log('❌ No email marketing provider configured');
      return false;
    }
    
    console.log('✅ Email providers configured:', configured.map(p => p.name).join(', '));
    return true;
  },

  async testSocialMediaAPIs() {
    console.log('📱 Testing Social Media APIs...');
    const instagram = process.env.INSTAGRAM_ACCESS_TOKEN;
    const tiktok = process.env.TIKTOK_CLIENT_KEY;
    
    let configured = [];
    if (instagram && instagram !== 'YOUR_INSTAGRAM_ACCESS_TOKEN_HERE') {
      configured.push('Instagram');
    }
    if (tiktok && tiktok !== 'YOUR_TIKTOK_CLIENT_KEY_HERE') {
      configured.push('TikTok');
    }
    
    if (configured.length === 0) {
      console.log('⚠️  No social media APIs configured (optional)');
      return true; // Optional
    }
    
    console.log('✅ Social media APIs configured:', configured.join(', '));
    return true;
  },

  async testPaymentSystem() {
    console.log('💳 Testing Payment System...');
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    
    if (!stripeKey || stripeKey === 'YOUR_STRIPE_SECRET_KEY_HERE') {
      console.log('⚠️  Stripe not configured (optional for MVP)');
      return true; // Optional for now
    }
    
    console.log('✅ Stripe configured');
    return true;
  },

  async testNotifications() {
    console.log('🔔 Testing Notifications...');
    const slack = process.env.SLACK_WEBHOOK_URL;
    const discord = process.env.DISCORD_WEBHOOK_URL;
    
    let configured = [];
    if (slack && slack !== 'YOUR_SLACK_WEBHOOK_URL_HERE') {
      configured.push('Slack');
    }
    if (discord && discord !== 'YOUR_DISCORD_WEBHOOK_URL_HERE') {
      configured.push('Discord');
    }
    
    if (configured.length === 0) {
      console.log('⚠️  No notification systems configured (optional)');
      return true; // Optional
    }
    
    console.log('✅ Notification systems configured:', configured.join(', '));
    return true;
  },

  async testNewsletterAPI() {
    console.log('📬 Testing Newsletter API...');
    
    try {
      const response = await fetch(`${BASE_URL}/api/newsletter/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          language: 'en',
          source: 'integration_test'
        })
      });
      
      if (response.ok) {
        console.log('✅ Newsletter API working');
        return true;
      } else {
        console.log('❌ Newsletter API failed:', response.status);
        return false;
      }
    } catch (error) {
      console.log('❌ Newsletter API error:', error.message);
      return false;
    }
  },

  async testContentGeneration() {
    console.log('🤖 Testing Content Generation...');
    const apiKey = process.env.ABACUSAI_API_KEY;
    
    if (!apiKey) {
      console.log('❌ AbacusAI API key not configured');
      return false;
    }
    
    try {
      const response = await fetch(`${BASE_URL}/api/generate-content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'Test content generation for luxury London travel',
          type: 'blog_topic',
          language: 'en'
        })
      });
      
      if (response.ok) {
        console.log('✅ Content generation working');
        return true;
      } else {
        console.log('❌ Content generation failed:', response.status);
        return false;
      }
    } catch (error) {
      console.log('❌ Content generation error:', error.message);
      return false;
    }
  }

};

// Run all tests
async function runTests() {
  console.log('🧪 Starting Yalla London Integration Tests...\n');
  
  const results = [];
  
  for (const [testName, testFunction] of Object.entries(tests)) {
    try {
      const result = await testFunction();
      results.push({ test: testName, passed: result });
    } catch (error) {
      console.log(`❌ ${testName} failed:`, error.message);
      results.push({ test: testName, passed: false, error: error.message });
    }
    console.log(''); // Empty line for readability
  }
  
  // Summary
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const critical = results.filter(r => !r.passed && !['testSocialMediaAPIs', 'testPaymentSystem', 'testNotifications'].includes(r.test)).length;
  
  console.log('📊 Test Summary:');
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${total - passed}/${total}`);
  console.log(`🚨 Critical failures: ${critical}`);
  
  if (critical === 0) {
    console.log('\n🎉 All critical integrations working! Ready for Phase 2.');
  } else {
    console.log('\n⚠️  Some critical integrations need attention. Check the setup guide.');
  }
  
  return results;
}

// Configuration checker
function checkEnvironmentVariables() {
  console.log('🔧 Checking Environment Variables...\n');
  
  const required = [
    'DATABASE_URL',
    'ABACUSAI_API_KEY', 
    'NEXTAUTH_SECRET',
    'NEXT_PUBLIC_ADMIN_PASSWORD'
  ];
  
  const missing = required.filter(var_name => !process.env[var_name]);
  
  if (missing.length > 0) {
    console.log('❌ Missing required environment variables:', missing);
    return false;
  }
  
  console.log('✅ All required environment variables configured\n');
  return true;
}

// Performance check
async function checkPerformance() {
  console.log('⚡ Checking Performance...\n');
  
  try {
    const start = Date.now();
    const response = await fetch(`${BASE_URL}/`);
    const loadTime = Date.now() - start;
    
    console.log(`📊 Homepage load time: ${loadTime}ms`);
    
    if (loadTime < 2000) {
      console.log('✅ Good performance');
    } else if (loadTime < 5000) {
      console.log('⚠️  Moderate performance');
    } else {
      console.log('❌ Poor performance - optimization needed');
    }
    
  } catch (error) {
    console.log('❌ Performance check failed:', error.message);
  }
  
  console.log('');
}

// Main execution
async function main() {
  console.log('🚀 Yalla London - Phase 2 Integration Checker\n');
  
  // Check environment variables first
  if (!checkEnvironmentVariables()) {
    console.log('Please configure required environment variables before running tests.');
    process.exit(1);
  }
  
  // Run performance check
  await checkPerformance();
  
  // Run integration tests
  const results = await runTests();
  
  // Exit with appropriate code
  const criticalFailures = results.filter(r => 
    !r.passed && !['testSocialMediaAPIs', 'testPaymentSystem', 'testNotifications'].includes(r.test)
  ).length;
  
  process.exit(criticalFailures > 0 ? 1 : 0);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { runTests, checkEnvironmentVariables };
