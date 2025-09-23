#!/usr/bin/env tsx

/**
 * Environment Variables and Feature Flags Test Script
 * Tests all required environment variables and feature flags
 */

async function testEnvironmentVariables() {
  console.log('🔧 Testing Environment Variables and Feature Flags...\n');

  try {
    // Test 1: Required Environment Variables
    console.log('1. Testing Required Environment Variables...');
    
    const requiredEnvVars = [
      // Database
      'DATABASE_URL',
      'DIRECT_URL',
      
      // Authentication
      'NEXTAUTH_SECRET',
      'NEXTAUTH_URL',
      
      // Feature Flags
      'FEATURE_PHASE4B_ENABLED',
      'FEATURE_TOPIC_RESEARCH',
      'FEATURE_AUTO_PUBLISHING',
      'FEATURE_CONTENT_PIPELINE',
      'FEATURE_AI_SEO_AUDIT',
      'FEATURE_INTERNAL_LINKS',
      'FEATURE_RICH_EDITOR',
      'FEATURE_HOMEPAGE_BUILDER',
      
      // Automation
      'CRON_SECRET',
      
      // Optional but important
      'NODE_ENV',
      'SKIP_ENV_VALIDATION'
    ];

    const missingEnvVars = [];
    const presentEnvVars = [];

    requiredEnvVars.forEach(envVar => {
      if (process.env[envVar]) {
        presentEnvVars.push(envVar);
      } else {
        missingEnvVars.push(envVar);
      }
    });

    console.log(`✅ Present environment variables: ${presentEnvVars.length}`);
    presentEnvVars.forEach(envVar => {
      const value = process.env[envVar];
      const displayValue = envVar.includes('SECRET') || envVar.includes('KEY') 
        ? '***HIDDEN***' 
        : value;
      console.log(`   - ${envVar}: ${displayValue}`);
    });

    if (missingEnvVars.length > 0) {
      console.log(`\n⚠️  Missing environment variables: ${missingEnvVars.length}`);
      missingEnvVars.forEach(envVar => {
        console.log(`   - ${envVar}`);
      });
    }

    // Test 2: Feature Flags Status
    console.log('\n2. Testing Feature Flags Status...');
    
    const featureFlags = [
      { name: 'FEATURE_PHASE4B_ENABLED', description: 'Phase 4B Features' },
      { name: 'FEATURE_TOPIC_RESEARCH', description: 'Topic Research & Generation' },
      { name: 'FEATURE_AUTO_PUBLISHING', description: 'Automated Content Publishing' },
      { name: 'FEATURE_CONTENT_PIPELINE', description: 'Content Pipeline Management' },
      { name: 'FEATURE_AI_SEO_AUDIT', description: 'AI-Powered SEO Audit' },
      { name: 'FEATURE_INTERNAL_LINKS', description: 'Internal Link Suggestions' },
      { name: 'FEATURE_RICH_EDITOR', description: 'Rich Text Editor' },
      { name: 'FEATURE_HOMEPAGE_BUILDER', description: 'Homepage Builder' }
    ];

    const enabledFlags = [];
    const disabledFlags = [];
    const missingFlags = [];

    featureFlags.forEach(flag => {
      const value = process.env[flag.name];
      if (value === 'true') {
        enabledFlags.push(flag);
      } else if (value === 'false') {
        disabledFlags.push(flag);
      } else {
        missingFlags.push(flag);
      }
    });

    console.log(`✅ Enabled feature flags: ${enabledFlags.length}`);
    enabledFlags.forEach(flag => {
      console.log(`   - ${flag.name}: ${flag.description}`);
    });

    if (disabledFlags.length > 0) {
      console.log(`\n⚠️  Disabled feature flags: ${disabledFlags.length}`);
      disabledFlags.forEach(flag => {
        console.log(`   - ${flag.name}: ${flag.description}`);
      });
    }

    if (missingFlags.length > 0) {
      console.log(`\n❌ Missing feature flags: ${missingFlags.length}`);
      missingFlags.forEach(flag => {
        console.log(`   - ${flag.name}: ${flag.description}`);
      });
    }

    // Test 3: Environment Configuration Status
    console.log('\n3. Environment Configuration Status...');
    
    const envStatus = {
      databaseConfigured: !!(process.env.DATABASE_URL && process.env.DIRECT_URL),
      authenticationConfigured: !!(process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_URL),
      featureFlagsConfigured: missingFlags.length === 0,
      automationConfigured: !!process.env.CRON_SECRET,
      environmentMode: process.env.NODE_ENV || 'development'
    };

    console.log('📊 Environment Configuration Status:');
    console.log(`   - Database: ${envStatus.databaseConfigured ? '✅' : '❌'}`);
    console.log(`   - Authentication: ${envStatus.authenticationConfigured ? '✅' : '❌'}`);
    console.log(`   - Feature Flags: ${envStatus.featureFlagsConfigured ? '✅' : '⚠️'}`);
    console.log(`   - Automation: ${envStatus.automationConfigured ? '✅' : '❌'}`);
    console.log(`   - Environment Mode: ${envStatus.environmentMode}`);

    // Test 4: Production Readiness
    console.log('\n4. Production Readiness Assessment...');
    
    const productionReady = envStatus.databaseConfigured && 
                           envStatus.authenticationConfigured && 
                           envStatus.automationConfigured;

    if (productionReady) {
      console.log('🎉 Environment is PRODUCTION READY');
    } else {
      console.log('⚠️  Environment needs configuration for production');
      console.log('   Required for production:');
      if (!envStatus.databaseConfigured) console.log('   - Set DATABASE_URL and DIRECT_URL');
      if (!envStatus.authenticationConfigured) console.log('   - Set NEXTAUTH_SECRET and NEXTAUTH_URL');
      if (!envStatus.automationConfigured) console.log('   - Set CRON_SECRET');
    }

    // Test 5: Recommended Environment Variables
    console.log('\n5. Recommended Environment Variables for Production...');
    
    const recommendedEnvVars = {
      'DATABASE_URL': 'postgresql://user:password@host:port/database',
      'DIRECT_URL': 'postgresql://user:password@host:port/database',
      'NEXTAUTH_SECRET': 'your-super-secret-nextauth-key',
      'NEXTAUTH_URL': 'https://your-domain.com',
      'FEATURE_PHASE4B_ENABLED': 'true',
      'FEATURE_TOPIC_RESEARCH': 'true',
      'FEATURE_AUTO_PUBLISHING': 'true',
      'FEATURE_CONTENT_PIPELINE': 'true',
      'FEATURE_AI_SEO_AUDIT': 'true',
      'FEATURE_INTERNAL_LINKS': 'true',
      'FEATURE_RICH_EDITOR': 'true',
      'FEATURE_HOMEPAGE_BUILDER': 'true',
      'CRON_SECRET': 'your-secure-cron-secret',
      'NODE_ENV': 'production',
      'SKIP_ENV_VALIDATION': 'true'
    };

    console.log('📋 Copy these to your .env.local or Vercel environment variables:');
    Object.entries(recommendedEnvVars).forEach(([key, value]) => {
      console.log(`${key}=${value}`);
    });

  } catch (error) {
    console.error('❌ Environment variables test failed:', error);
    process.exit(1);
  }
}

// Run the test
testEnvironmentVariables().catch(console.error);
