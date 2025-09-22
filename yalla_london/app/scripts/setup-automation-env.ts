#!/usr/bin/env tsx

/**
 * Setup script for "Launch and Forget" automation
 * Configures environment variables and validates setup
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

interface EnvConfig {
  [key: string]: string;
}

const REQUIRED_ENV_VARS = {
  // Feature Flags
  'FEATURE_PHASE4B_ENABLED': 'true',
  'FEATURE_TOPIC_RESEARCH': 'true', 
  'FEATURE_AUTO_PUBLISHING': 'true',
  'FEATURE_CONTENT_PIPELINE': 'true',
  'FEATURE_AI_SEO_AUDIT': 'true',
  'FEATURE_ANALYTICS_DASHBOARD': 'true',
  'FEATURE_MEDIA_ENRICH': 'true',
  
  // Cron Configuration
  'CRON_SECRET': 'generate-secure-random-secret',
  
  // AI Services
  'OPENAI_API_KEY': 'your-openai-api-key',
  'ABACUSAI_API_KEY': 'your-abacusai-api-key',
  
  // Database
  'DATABASE_URL': 'your-database-url',
  'DIRECT_URL': 'your-direct-database-url',
  
  // Supabase
  'NEXT_PUBLIC_SUPABASE_URL': 'your-supabase-url',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': 'your-supabase-anon-key',
  'SUPABASE_SERVICE_ROLE_KEY': 'your-supabase-service-key',
  
  // App Configuration
  'NEXTAUTH_SECRET': 'your-nextauth-secret',
  'NEXTAUTH_URL': 'https://your-domain.vercel.app',
  'NEXT_PUBLIC_SITE_URL': 'https://your-domain.vercel.app'
};

function generateSecureSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function loadEnvFile(filePath: string): EnvConfig {
  if (!existsSync(filePath)) {
    return {};
  }
  
  const content = readFileSync(filePath, 'utf-8');
  const config: EnvConfig = {};
  
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        config[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
  
  return config;
}

function saveEnvFile(filePath: string, config: EnvConfig): void {
  const content = Object.entries(config)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  
  writeFileSync(filePath, content + '\n');
}

function validateSetup(): { isValid: boolean; missing: string[]; warnings: string[] } {
  const missing: string[] = [];
  const warnings: string[] = [];
  
  // Check if .env.local exists
  const envPath = join(process.cwd(), '.env.local');
  if (!existsSync(envPath)) {
    missing.push('.env.local file not found');
    return { isValid: false, missing, warnings };
  }
  
  const envConfig = loadEnvFile(envPath);
  
  // Check required variables
  Object.keys(REQUIRED_ENV_VARS).forEach(key => {
    if (!envConfig[key] || envConfig[key] === REQUIRED_ENV_VARS[key]) {
      missing.push(key);
    }
  });
  
  // Check for placeholder values
  Object.entries(envConfig).forEach(([key, value]) => {
    if (value.includes('your-') || value.includes('generate-')) {
      warnings.push(`${key} appears to be a placeholder value`);
    }
  });
  
  return {
    isValid: missing.length === 0,
    missing,
    warnings
  };
}

function setupAutomation(): void {
  console.log('🚀 Setting up "Launch and Forget" Automation');
  console.log('=============================================\n');
  
  const envPath = join(process.cwd(), '.env.local');
  const existingConfig = loadEnvFile(envPath);
  
  // Generate secure cron secret if not set
  if (!existingConfig.CRON_SECRET || existingConfig.CRON_SECRET === 'generate-secure-random-secret') {
    existingConfig.CRON_SECRET = generateSecureSecret();
    console.log('✅ Generated secure CRON_SECRET');
  }
  
  // Set up feature flags
  Object.entries(REQUIRED_ENV_VARS).forEach(([key, value]) => {
    if (key.startsWith('FEATURE_') && !existingConfig[key]) {
      existingConfig[key] = value;
      console.log(`✅ Enabled feature flag: ${key}`);
    }
  });
  
  // Save updated configuration
  saveEnvFile(envPath, existingConfig);
  
  console.log('\n📋 Environment Configuration Complete!');
  console.log('\n🔧 Next Steps:');
  console.log('1. Update placeholder values in .env.local with your actual API keys');
  console.log('2. Deploy to Vercel to activate cron jobs');
  console.log('3. Test cron endpoints manually');
  console.log('4. Monitor automation logs');
  
  console.log('\n⚠️  Required API Keys:');
  console.log('- OPENAI_API_KEY: For AI content generation');
  console.log('- ABACUSAI_API_KEY: For advanced AI features');
  console.log('- Database URLs: For content storage');
  console.log('- Supabase Keys: For real-time features');
  
  console.log('\n🧪 Test Commands:');
  console.log('yarn test:content    # Test content generation');
  console.log('yarn test:sync       # Test admin sync');
  console.log('yarn health          # Health check');
}

function main(): void {
  const command = process.argv[2];
  
  switch (command) {
    case 'setup':
      setupAutomation();
      break;
      
    case 'validate':
      const validation = validateSetup();
      if (validation.isValid) {
        console.log('✅ Environment setup is valid!');
        if (validation.warnings.length > 0) {
          console.log('\n⚠️  Warnings:');
          validation.warnings.forEach(warning => console.log(`- ${warning}`));
        }
      } else {
        console.log('❌ Environment setup is incomplete:');
        validation.missing.forEach(missing => console.log(`- ${missing}`));
        console.log('\nRun: tsx scripts/setup-automation-env.ts setup');
      }
      break;
      
    default:
      console.log('Usage:');
      console.log('  tsx scripts/setup-automation-env.ts setup    # Setup automation');
      console.log('  tsx scripts/setup-automation-env.ts validate # Validate setup');
      break;
  }
}

if (require.main === module) {
  main();
}

