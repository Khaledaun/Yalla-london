
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (question) => {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
};

async function createBrandTemplate() {
  console.log('🎨 Create New Brand Template\n');
  
  try {
    const brandKey = await askQuestion('Enter brand key (e.g., my-restaurant): ');
    const siteName = await askQuestion('Enter site name (e.g., My Restaurant Guide): ');
    const siteNameAr = await askQuestion('Enter Arabic site name: ');
    const tagline = await askQuestion('Enter tagline: ');
    const taglineAr = await askQuestion('Enter Arabic tagline: ');
    const description = await askQuestion('Enter description: ');
    const descriptionAr = await askQuestion('Enter Arabic description: ');
    const primaryColor = await askQuestion('Enter primary color (hex, e.g., #FF6B9D): ');
    const secondaryColor = await askQuestion('Enter secondary color (hex): ');
    const email = await askQuestion('Enter contact email: ');
    
    const template = `
// ${siteName} Brand Template
export const ${brandKey.replace(/-/g, '')}Template: BrandConfig = {
  siteName: "${siteName}",
  siteNameAr: "${siteNameAr}",
  tagline: "${tagline}",
  taglineAr: "${taglineAr}",
  description: "${description}",
  descriptionAr: "${descriptionAr}",
  businessType: '${brandKey}' as BusinessType,
  
  colors: {
    primary: "${primaryColor}",
    secondary: "${secondaryColor}",
    accent: "#EC4899",
    background: "#FFFFFF",
    text: "#1F2937",
    muted: "#6B7280"
  },
  
  navigation: [
    { key: 'home', labelEn: 'Home', labelAr: 'الرئيسية', href: '/' },
    { key: 'content', labelEn: 'Content', labelAr: 'المحتوى', href: '/blog' },
    { key: 'directory', labelEn: 'Directory', labelAr: 'الدليل', href: '/recommendations' },
    { key: 'events', labelEn: 'Events', labelAr: 'الفعاليات', href: '/events' },
    { key: 'about', labelEn: 'About', labelAr: 'حولنا', href: '/about' },
  ],
  
  categories: [
    {
      slug: 'category-1',
      nameEn: 'Category 1',
      nameAr: 'الفئة الأولى',
      descriptionEn: 'Description for category 1',
      descriptionAr: 'وصف الفئة الأولى',
      icon: 'star'
    }
    // Add more categories as needed
  ],
  
  contact: {
    email: '${email}',
    social: {
      instagram: 'https://instagram.com/${brandKey}',
    }
  },
  
  seo: {
    keywords: '${siteName.toLowerCase()}, ${tagline.toLowerCase()}',
    author: '${siteName}',
  },
  
  contentTypes: [
    {
      type: 'item',
      nameEn: 'Item',
      nameAr: 'عنصر',
      fields: ['name', 'description', 'category', 'rating']
    }
  ]
};`;
    
    console.log('\n📝 Generated brand template:');
    console.log(template);
    
    const shouldSave = await askQuestion('\nSave this template to brand-templates.ts? (y/n): ');
    
    if (shouldSave.toLowerCase() === 'y') {
      // Read current file
      const templatesPath = path.join(__dirname, '..', 'config', 'brand-templates.ts');
      let content = fs.readFileSync(templatesPath, 'utf8');
      
      // Add new business type
      content = content.replace(
        /export type BusinessType = [^;]+;/,
        `export type BusinessType = 'luxury-guide' | 'kids-retail' | 'real-estate' | '${brandKey}';`
      );
      
      // Add template before export
      const insertPoint = content.lastIndexOf('// Export all templates');
      content = content.slice(0, insertPoint) + template + '\n\n' + content.slice(insertPoint);
      
      // Add to exports
      content = content.replace(
        /export const brandTemplates = {[^}]+}/,
        `export const brandTemplates = {
  'luxury-guide': luxuryGuideTemplate,
  'kids-retail': kidsRetailTemplate, 
  'real-estate': realEstateTemplate,
  '${brandKey}': ${brandKey.replace(/-/g, '')}Template,
} as const;`
      );
      
      fs.writeFileSync(templatesPath, content);
      console.log('✅ Template saved successfully!');
      console.log(`\nTo use this template, run: npm run switch-brand ${brandKey}`);
    }
    
  } catch (error) {
    console.error('❌ Error creating template:', error.message);
  } finally {
    rl.close();
  }
}

createBrandTemplate();
