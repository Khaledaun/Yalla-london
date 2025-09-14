#!/usr/bin/env node

/**
 * Build preparation script for Vercel deployment
 * Handles Prisma client generation with fallback strategies
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Preparing build for deployment...');

// Check if Prisma client already exists
const prismaClientPath = path.join(__dirname, '../node_modules/@prisma/client');
const prismaSchemaPath = path.join(__dirname, '../prisma/schema.prisma');

if (!fs.existsSync(prismaSchemaPath)) {
    console.log('❌ Prisma schema not found, skipping client generation');
    process.exit(0);
}

try {
    console.log('📦 Generating Prisma client...');
    
    // Try to generate Prisma client
    execSync('npx prisma generate --schema prisma/schema.prisma', {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
    });
    
    console.log('✅ Prisma client generated successfully');
    
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
}

console.log('✅ Build preparation complete');