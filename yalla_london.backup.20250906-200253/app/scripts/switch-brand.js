
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Available brand types
const brandTypes = {
  'luxury-guide': 'Yalla London - Luxury Guide',
  'kids-retail': 'Little Stars Fashion - Kids Retail',
  'real-estate': 'Prime Properties Guide - Real Estate'
};

// Get command line arguments
const args = process.argv.slice(2);
const brandType = args[0];

if (!brandType || !brandTypes[brandType]) {
  console.log('🏷️  Brand Platform Switcher\n');
  console.log('Usage: npm run switch-brand <brand-type>\n');
  console.log('Available brand types:');
  Object.entries(brandTypes).forEach(([key, name]) => {
    console.log(`  ${key.padEnd(15)} - ${name}`);
  });
  console.log('\nExample: npm run switch-brand kids-retail');
  process.exit(1);
}

console.log(`🔄 Switching to brand: ${brandTypes[brandType]}`);

// Update environment variable
const envPath = path.join(__dirname, '..', '.env.local');
let envContent = '';

if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
}

// Remove existing NEXT_PUBLIC_BRAND_TYPE if it exists
envContent = envContent.replace(/NEXT_PUBLIC_BRAND_TYPE=.*/g, '');
envContent = envContent.trim();

// Add new brand type
if (envContent) {
  envContent += '\n';
}
envContent += `NEXT_PUBLIC_BRAND_TYPE=${brandType}`;

fs.writeFileSync(envPath, envContent);

console.log(`✅ Environment updated: NEXT_PUBLIC_BRAND_TYPE=${brandType}`);

// Restart development server if running
try {
  console.log('🔄 Restarting development server...');
  execSync('pkill -f "next dev"', { stdio: 'ignore' });
  console.log('🚀 Development server stopped. Run "npm run dev" to start with new brand.');
} catch (error) {
  console.log('ℹ️  No development server was running. Run "npm run dev" to start with new brand.');
}

console.log(`\n✨ Brand switched successfully to ${brandTypes[brandType]}!`);
console.log('\nNext steps:');
console.log('1. Run "npm run dev" to see your changes');
console.log('2. Customize colors and content in /config/brand-templates.ts');
console.log('3. Deploy with "npm run build" when ready');
