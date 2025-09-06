
/**
 * Enhanced schema validation script for structured data
 * Validates JSON-LD schemas with comprehensive checks for Rich Results
 */

const fs = require('fs');
const path = require('path');

// Schema validation patterns with enhanced checks
const schemaPatterns = {
  Organization: /"@type":\s*"Organization"/,
  Website: /"@type":\s*"Website"/,
  Article: /"@type":\s*"Article"/,
  Event: /"@type":\s*"Event"/,
  Place: /"@type":\s*"Place"/,
  FAQPage: /"@type":\s*"FAQPage"/,
  HowTo: /"@type":\s*"HowTo"/,
  BreadcrumbList: /"@type":\s*"BreadcrumbList"/,
  VideoObject: /"@type":\s*"VideoObject"/
};

// Required fields for each schema type
const requiredFields = {
  Organization: ['name', 'url'],
  Website: ['name', 'url'],
  Article: ['headline', 'author', 'datePublished', 'publisher'],
  Event: ['name', 'startDate', 'location'],
  Place: ['name', 'address'],
  FAQPage: ['mainEntity'],
  HowTo: ['name', 'step'],
  BreadcrumbList: ['itemListElement'],
  VideoObject: ['name', 'description', 'contentUrl']
};

// Google Rich Results requirements
const richResultsRequirements = {
  Article: {
    required: ['headline', 'author', 'datePublished', 'publisher', 'mainEntityOfPage'],
    recommended: ['image', 'dateModified', 'articleBody']
  },
  Event: {
    required: ['name', 'startDate', 'location'],
    recommended: ['description', 'image', 'offers', 'organizer', 'performer']
  },
  Organization: {
    required: ['name'],
    recommended: ['url', 'logo', 'contactPoint', 'sameAs']
  }
};

/**
 * Extract JSON-LD schemas from HTML content
 */
function extractSchemas(html) {
  const schemas = [];
  const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  
  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const jsonContent = match[1].trim();
      if (jsonContent) {
        const schema = JSON.parse(jsonContent);
        // Handle both single schemas and arrays
        if (Array.isArray(schema)) {
          schemas.push(...schema);
        } else {
          schemas.push(schema);
        }
      }
    } catch (error) {
      console.warn('Failed to parse JSON-LD schema:', error.message);
      console.warn('Schema content:', match[1].substring(0, 200) + '...');
    }
  }
  
  return schemas;
}

/**
 * Validate URL format
 */
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Check if date is in valid ISO format
 */
function isValidDate(dateString) {
  if (!dateString) return false;
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

/**
 * Validate a single schema with Rich Results requirements
 */
function validateSchema(schema, expectedType = null) {
  const errors = [];
  const warnings = [];
  const richResultsIssues = [];
  
  // Check @context
  if (!schema['@context']) {
    errors.push('Missing @context');
  } else if (!schema['@context'].toString().includes('schema.org')) {
    errors.push('Invalid @context - must include schema.org');
  }
  
  // Check @type
  if (!schema['@type']) {
    errors.push('Missing @type');
    return { valid: false, errors, warnings, richResultsIssues };
  }
  
  const schemaType = schema['@type'];
  
  // Check if expected type matches
  if (expectedType && schemaType !== expectedType) {
    warnings.push(`Expected ${expectedType}, found ${schemaType}`);
  }
  
  // Check required fields
  const required = requiredFields[schemaType] || [];
  required.forEach(field => {
    if (!schema[field] || schema[field] === '') {
      errors.push(`Missing required field: ${field}`);
    }
  });
  
  // Rich Results validation
  const richResultsReqs = richResultsRequirements[schemaType];
  if (richResultsReqs) {
    // Required for Rich Results
    richResultsReqs.required.forEach(field => {
      if (!schema[field] || schema[field] === '') {
        richResultsIssues.push(`Missing Rich Results required field: ${field}`);
      }
    });
    
    // Recommended for Rich Results
    richResultsReqs.recommended.forEach(field => {
      if (!schema[field] || schema[field] === '') {
        warnings.push(`Missing recommended field for Rich Results: ${field}`);
      }
    });
  }
  
  // Schema-specific validations
  if (schemaType === 'Article') {
    // Date validations
    if (schema.datePublished && !isValidDate(schema.datePublished)) {
      errors.push('Invalid datePublished format - use ISO 8601');
    }
    if (schema.dateModified && !isValidDate(schema.dateModified)) {
      errors.push('Invalid dateModified format - use ISO 8601');
    }
    
    // Author validation
    if (schema.author) {
      if (typeof schema.author === 'object' && !schema.author.name) {
        errors.push('Author object must have a name');
      }
    }
    
    // Publisher validation
    if (schema.publisher && typeof schema.publisher === 'object' && !schema.publisher.name) {
      errors.push('Publisher object must have a name');
    }
    
    // Image validation
    if (schema.image && !isValidUrl(schema.image.toString())) {
      warnings.push('Article image should be a valid URL');
    }
  }
  
  if (schemaType === 'Event') {
    // Date validations
    if (schema.startDate && !isValidDate(schema.startDate)) {
      errors.push('Invalid startDate format - use ISO 8601');
    }
    if (schema.endDate && !isValidDate(schema.endDate)) {
      errors.push('Invalid endDate format - use ISO 8601');
    }
    
    // Date logic validation
    if (schema.startDate && schema.endDate) {
      const start = new Date(schema.startDate);
      const end = new Date(schema.endDate);
      if (start > end) {
        errors.push('Event startDate cannot be after endDate');
      }
    }
    
    // Location validation
    if (schema.location && typeof schema.location === 'object') {
      if (!schema.location.name) {
        errors.push('Event location must have a name');
      }
      if (!schema.location.address) {
        warnings.push('Event location should have an address for better SEO');
      }
    }
  }
  
  if (schemaType === 'Organization') {
    // URL validation
    if (schema.url && !isValidUrl(schema.url)) {
      errors.push('Organization URL must be valid');
    }
    
    // Logo validation
    if (schema.logo && !isValidUrl(schema.logo.toString())) {
      warnings.push('Organization logo should be a valid URL');
    }
  }
  
  return {
    valid: errors.length === 0,
    richResultsReady: richResultsIssues.length === 0,
    errors,
    warnings,
    richResultsIssues,
    type: schemaType
  };
}

/**
 * Test hreflang implementation
 */
function validateHreflang(html) {
  const results = {
    hasHreflang: false,
    languages: [],
    issues: []
  };
  
  // Check for hreflang tags
  const hreflangRegex = /<link[^>]*hreflang=["']([^"']+)["'][^>]*>/gi;
  let match;
  
  while ((match = hreflangRegex.exec(html)) !== null) {
    results.hasHreflang = true;
    const lang = match[1];
    results.languages.push(lang);
  }
  
  // Check for required languages
  const requiredLangs = ['en', 'ar'];
  requiredLangs.forEach(lang => {
    if (!results.languages.includes(lang)) {
      results.issues.push(`Missing hreflang for language: ${lang}`);
    }
  });
  
  // Check for x-default
  if (results.hasHreflang && !results.languages.includes('x-default')) {
    results.issues.push('Missing x-default hreflang tag');
  }
  
  return results;
}

/**
 * Main validation function
 */
function validatePage(html, expectedSchemas = []) {
  const schemas = extractSchemas(html);
  const hreflangResults = validateHreflang(html);
  
  const results = {
    totalSchemas: schemas.length,
    validSchemas: 0,
    invalidSchemas: 0,
    richResultsReady: 0,
    hreflang: hreflangResults,
    details: []
  };
  
  console.log(`Found ${schemas.length} JSON-LD schemas`);
  
  if (schemas.length === 0) {
    console.warn('⚠️  No JSON-LD schemas found in page');
  }
  
  schemas.forEach((schema, index) => {
    const validation = validateSchema(schema);
    results.details.push({
      index,
      ...validation
    });
    
    if (validation.valid) {
      results.validSchemas++;
      console.log(`✅ Schema ${index + 1} (${validation.type}) is valid`);
    } else {
      results.invalidSchemas++;
      console.log(`❌ Schema ${index + 1} (${validation.type || 'unknown'}) has errors:`);
      validation.errors.forEach(error => console.log(`   - ${error}`));
    }
    
    if (validation.richResultsReady) {
      results.richResultsReady++;
      console.log(`🌟 Schema ${index + 1} is Rich Results ready`);
    } else if (validation.richResultsIssues.length > 0) {
      console.log(`📋 Schema ${index + 1} Rich Results issues:`);
      validation.richResultsIssues.forEach(issue => console.log(`   - ${issue}`));
    }
    
    if (validation.warnings.length > 0) {
      console.log(`⚠️  Schema ${index + 1} warnings:`);
      validation.warnings.forEach(warning => console.log(`   - ${warning}`));
    }
  });
  
  // Hreflang validation
  console.log('\n--- Hreflang Validation ---');
  if (hreflangResults.hasHreflang) {
    console.log(`✅ Found hreflang tags for: ${hreflangResults.languages.join(', ')}`);
    if (hreflangResults.issues.length > 0) {
      console.log('⚠️  Hreflang issues:');
      hreflangResults.issues.forEach(issue => console.log(`   - ${issue}`));
    }
  } else {
    console.log('❌ No hreflang tags found');
  }
  
  return results;
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const pageType = args[0] || 'homepage';
  
  console.log(`\n🔍 Validating schemas for: ${pageType}`);
  console.log('='.repeat(50));
  
  // Read from stdin (piped from curl)
  let html = '';
  
  if (process.stdin.isTTY) {
    console.error('❌ This script expects HTML input from stdin (e.g., curl http://localhost:3000 | node validate-schema.js)');
    process.exit(1);
  }
  
  process.stdin.on('data', chunk => {
    html += chunk;
  });
  
  process.stdin.on('end', () => {
    if (!html.trim()) {
      console.error('❌ No HTML content received');
      process.exit(1);
    }
    
    const results = validatePage(html);
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 VALIDATION SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total schemas: ${results.totalSchemas}`);
    console.log(`Valid schemas: ${results.validSchemas}`);
    console.log(`Invalid schemas: ${results.invalidSchemas}`);
    console.log(`Rich Results ready: ${results.richResultsReady}`);
    console.log(`Hreflang status: ${results.hreflang.hasHreflang ? '✅' : '❌'}`);
    
    if (results.invalidSchemas > 0) {
      console.error(`\n❌ Validation failed: ${results.invalidSchemas} invalid schemas found`);
      process.exit(1);
    } else if (results.validSchemas === 0) {
      console.error('\n❌ Validation failed: No valid schemas found');
      process.exit(1);
    } else {
      console.log(`\n✅ Validation passed: All ${results.validSchemas} schemas are valid`);
      process.exit(0);
    }
  });
  
  // Handle timeout
  setTimeout(() => {
    if (!html.trim()) {
      console.error('❌ Timeout: No HTML content received within 10 seconds');
      process.exit(1);
    }
  }, 10000);
}

module.exports = {
  validatePage,
  validateSchema,
  extractSchemas,
  validateHreflang
};
