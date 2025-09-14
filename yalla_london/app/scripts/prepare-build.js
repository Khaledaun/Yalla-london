#!/usr/bin/env node

/**
 * Build preparation script for Vercel deployment
 * Handles Prisma client generation with fallback strategies
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Preparing build for deployment...');

// Detect CI environment and prevent infinite loops
const isCI = process.env.CI === 'true' || 
             process.env.GITHUB_ACTIONS === 'true' || 
             process.env.VERCEL === '1';

const isSecurityWorkflow = process.env.GITHUB_WORKFLOW && 
                          process.env.GITHUB_WORKFLOW.includes('Security');

if (isCI && isSecurityWorkflow) {
    console.log('🔒 Detected security workflow in CI - skipping Prisma generation to prevent loops');
    console.log('✅ Build preparation complete (security mode)');
    process.exit(0);
}

// Check if Prisma client already exists
const prismaClientPath = path.join(__dirname, '../node_modules/@prisma/client');
const prismaSchemaPath = path.join(__dirname, '../prisma/schema.prisma');

if (!fs.existsSync(prismaSchemaPath)) {
    console.log('❌ Prisma schema not found, skipping client generation');
    process.exit(0);
}

// Additional safeguard - check if we're in a repetitive execution
const executionMarker = path.join(__dirname, '../.prisma-generation-attempt');
if (fs.existsSync(executionMarker)) {
    const markerTime = fs.statSync(executionMarker).mtime;
    const timeDiff = Date.now() - markerTime.getTime();
    
    if (timeDiff < 60000) { // If less than 1 minute ago
        console.log('⚠️  Recent Prisma generation attempt detected, skipping to prevent loops');
        console.log('✅ Build preparation complete (loop prevention)');
        process.exit(0);
    }
}

// Create execution marker
fs.writeFileSync(executionMarker, new Date().toISOString());

try {
    console.log('📦 Generating Prisma client...');
    
    // Try to generate Prisma client
    execSync('npx prisma generate --schema prisma/schema.prisma', {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
    });
    
    console.log('✅ Prisma client generated successfully');
    
    // Clean up execution marker on success
    if (fs.existsSync(executionMarker)) {
        fs.unlinkSync(executionMarker);
    }
    
} catch (error) {
    console.log('⚠️  Prisma client generation failed, checking for existing client...');
    
    if (fs.existsSync(prismaClientPath)) {
        console.log('✅ Using existing Prisma client');
    } else {
        console.log('❌ No Prisma client found. Build may fail if database features are used.');
        console.log('📋 To fix this:');
        console.log('   1. Add binaries.prisma.sh to Vercel allowlist');
        console.log('   2. Or use a pre-built Prisma client');
        console.log('   3. Or disable database features during build');
        
        // Don't fail the build, let it continue
        console.log('🔄 Continuing with build process...');
    }
    
    // Clean up execution marker on failure too
    if (fs.existsSync(executionMarker)) {
        fs.unlinkSync(executionMarker);
    }
}

console.log('✅ Build preparation complete');