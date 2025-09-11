#!/usr/bin/env node

/**
 * Phase 4B Implementation Validation Script
 * Validates that all Phase 4B components are properly installed and configured
 */

const fs = require('fs');
const path = require('path');

const results = [];

function checkFile(filePath, description) {
  const exists = fs.existsSync(filePath);
  results.push({
    type: 'file',
    description,
    status: exists ? 'PASS' : 'FAIL',
    path: filePath
  });
  return exists;
}

function checkFileContent(filePath, searchText, description) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const found = content.includes(searchText);
    results.push({
      type: 'content',
      description,
      status: found ? 'PASS' : 'FAIL',
      path: filePath,
      searched: searchText
    });
    return found;
  } catch (error) {
    results.push({
      type: 'content',
      description,
      status: 'ERROR',
      path: filePath,
      error: error.message
    });
    return false;
  }
}

function validatePhase4B() {
  console.log('🔍 Validating Phase 4B Implementation...\n');

  // Check core files
  checkFile('.env.example', 'Environment template');
  checkFile('vercel.json', 'Vercel configuration');
  checkFile('lib/feature-flags.ts', 'Feature flags system');
  checkFile('prisma/schema.prisma', 'Prisma schema');

  // Check API routes
  checkFile('app/api/phase4b/topics/research/route.ts', 'Topic research API');
  checkFile('app/api/phase4b/content/generate/route.ts', 'Content generation API');
  checkFile('app/api/phase4b/content/publish/route.ts', 'Content publishing API');
  checkFile('app/api/phase4b/seo/audit/route.ts', 'SEO audit API');
  checkFile('app/api/phase4b/analytics/refresh/route.ts', 'Analytics refresh API');

  // Check admin components
  checkFile('components/admin/phase4b/ContentPipeline.tsx', 'Content pipeline component');
  checkFile('components/admin/phase4b/TopicManager.tsx', 'Topic manager component');

  // Check services
  checkFile('lib/services/content-pipeline.ts', 'Content pipeline service');
  checkFile('lib/services/cron-manager.ts', 'Cron manager service');

  // Check documentation
  checkFile('VERCEL-DEPLOYMENT.md', 'Deployment guide');
  checkFile('PHASE-4B-TROUBLESHOOTING.md', 'Troubleshooting guide');
  checkFile('ENVIRONMENT-VARIABLES-VERCEL.md', 'Environment variables guide');

  // Check tests
  checkFile('__tests__/api/phase4b/endpoints.test.ts', 'API endpoint tests');

  // Content validation
  checkFileContent('package.json', '"axios"', 'Axios dependency in package.json');
  checkFileContent('package.json', '"node-cron"', 'Node-cron dependency in package.json');
  checkFileContent('.env.example', 'PERPLEXITY_API_KEY', 'Perplexity API key in env template');
  checkFileContent('.env.example', 'FEATURE_PHASE4B_ENABLED=false', 'Phase 4B disabled by default');
  checkFileContent('prisma/schema.prisma', 'TopicProposal', 'TopicProposal model in schema');
  checkFileContent('prisma/schema.prisma', 'SeoAudit', 'SeoAudit model in schema');
  checkFileContent('lib/feature-flags.ts', 'PHASE4B_ENABLED', 'Phase 4B feature flags');
  checkFileContent('vercel.json', 'phase4b', 'Phase 4B routes in Vercel config');

  // Feature flag validation
  checkFileContent('lib/feature-flags.ts', 'TOPIC_RESEARCH', 'Topic research feature flag');
  checkFileContent('lib/feature-flags.ts', 'AUTO_CONTENT_GENERATION', 'Content generation feature flag');
  checkFileContent('lib/feature-flags.ts', 'SEO_AUTOMATION', 'SEO automation feature flag');

  // Print results
  console.log('📊 Validation Results:\n');
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const errors = results.filter(r => r.status === 'ERROR').length;

  results.forEach(result => {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${icon} ${result.description}`);
    if (result.status !== 'PASS') {
      console.log(`   Path: ${result.path}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    }
  });

  console.log(`\n📈 Summary: ${passed} passed, ${failed} failed, ${errors} errors`);
  
  if (failed === 0 && errors === 0) {
    console.log('\n🎉 Phase 4B implementation validation PASSED!');
    console.log('✨ Ready for deployment to Vercel');
    return true;
  } else {
    console.log('\n🚨 Phase 4B implementation validation FAILED!');
    console.log('❗ Please fix the issues before deploying');
    return false;
  }
}

// Run validation
const success = validatePhase4B();
process.exit(success ? 0 : 1);