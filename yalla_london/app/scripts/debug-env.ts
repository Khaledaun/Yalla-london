#!/usr/bin/env tsx

/**
 * Debug Environment Variables Script
 * Shows what environment variables are actually loaded
 */

console.log('🔍 Debugging Environment Variables...\n');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

console.log('📋 All Environment Variables:');
Object.keys(process.env)
  .filter(key => key.startsWith('FEATURE_') || key.includes('DATABASE') || key.includes('NEXTAUTH') || key.includes('CRON'))
  .sort()
  .forEach(key => {
    const value = process.env[key];
    const displayValue = key.includes('SECRET') || key.includes('KEY') 
      ? '***HIDDEN***' 
      : value;
    console.log(`   ${key}: ${displayValue}`);
  });

console.log('\n🔍 Specific Variables Check:');
const specificVars = [
  'DATABASE_URL',
  'DIRECT_URL', 
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
  'FEATURE_PHASE4B_ENABLED',
  'FEATURE_TOPIC_RESEARCH',
  'FEATURE_AUTO_PUBLISHING',
  'FEATURE_CONTENT_PIPELINE',
  'FEATURE_AI_SEO_AUDIT',
  'FEATURE_INTERNAL_LINKS',
  'FEATURE_RICH_EDITOR',
  'FEATURE_HOMEPAGE_BUILDER',
  'CRON_SECRET',
  'NODE_ENV'
];

specificVars.forEach(key => {
  const value = process.env[key];
  const status = value ? '✅' : '❌';
  const displayValue = key.includes('SECRET') || key.includes('KEY') 
    ? '***HIDDEN***' 
    : value || 'NOT SET';
  console.log(`   ${status} ${key}: ${displayValue}`);
});

console.log('\n📊 Summary:');
const presentCount = specificVars.filter(key => process.env[key]).length;
console.log(`   Present: ${presentCount}/${specificVars.length}`);
console.log(`   Missing: ${specificVars.length - presentCount}/${specificVars.length}`);
