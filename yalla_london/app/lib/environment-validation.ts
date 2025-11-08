/**
 * Environment Variable Validation
 * Validates all required environment variables at startup
 */

export interface EnvironmentValidationResult {
  isValid: boolean;
  missingRequired: string[];
  missingOptional: string[];
  warnings: string[];
  errors: string[];
}

export interface EnvironmentVariable {
  name: string;
  required: boolean;
  description: string;
  validator?: (value: string) => boolean;
  defaultValue?: string;
}

const REQUIRED_ENV_VARS: EnvironmentVariable[] = [
  // Database
  {
    name: 'DATABASE_URL',
    required: true,
    description: 'PostgreSQL database connection URL',
    validator: (val) => val.startsWith('postgresql://'),
  },
  {
    name: 'DIRECT_URL',
    required: true,
    description: 'Direct database connection for migrations',
    validator: (val) => val.startsWith('postgresql://'),
  },

  // Authentication
  {
    name: 'NEXTAUTH_SECRET',
    required: true,
    description: 'NextAuth JWT encryption secret (32+ characters)',
    validator: (val) => val.length >= 32,
  },
  {
    name: 'NEXTAUTH_URL',
    required: true,
    description: 'Application URL for authentication',
    validator: (val) => val.startsWith('http://') || val.startsWith('https://'),
  },

  // Supabase
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    required: true,
    description: 'Supabase project URL',
    validator: (val) => val.includes('supabase.co'),
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    required: true,
    description: 'Supabase service role key for server operations',
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    required: true,
    description: 'Supabase anonymous key for client operations',
  },
];

const OPTIONAL_ENV_VARS: EnvironmentVariable[] = [
  // AI Providers
  {
    name: 'ABACUSAI_API_KEY',
    required: false,
    description: 'AbacusAI API key for AI content generation (primary provider)',
  },
  {
    name: 'OPENAI_API_KEY',
    required: false,
    description: 'OpenAI API key for AI content generation (fallback provider)',
  },

  // AWS S3
  {
    name: 'AWS_ACCESS_KEY_ID',
    required: false,
    description: 'AWS access key for S3 media storage',
  },
  {
    name: 'AWS_SECRET_ACCESS_KEY',
    required: false,
    description: 'AWS secret key for S3 media storage',
  },
  {
    name: 'AWS_REGION',
    required: false,
    description: 'AWS region for S3 bucket',
    defaultValue: 'us-east-1',
  },
  {
    name: 'AWS_S3_BUCKET',
    required: false,
    description: 'S3 bucket name for media uploads',
  },

  // Feature Flags
  {
    name: 'FEATURE_PHASE4B_ENABLED',
    required: false,
    description: 'Enable Phase 4B features (0 or 1)',
    validator: (val) => val === '0' || val === '1',
    defaultValue: '0',
  },
  {
    name: 'FEATURE_CONTENT_PIPELINE',
    required: false,
    description: 'Enable content pipeline automation (0 or 1)',
    validator: (val) => val === '0' || val === '1',
    defaultValue: '0',
  },
  {
    name: 'FEATURE_AI_SEO_AUDIT',
    required: false,
    description: 'Enable AI-powered SEO audits (0 or 1)',
    validator: (val) => val === '0' || val === '1',
    defaultValue: '0',
  },
  {
    name: 'FEATURE_AUTO_PUBLISHING',
    required: false,
    description: 'Enable automatic content publishing (0 or 1)',
    validator: (val) => val === '0' || val === '1',
    defaultValue: '0',
  },
  {
    name: 'TOPIC_RESEARCH',
    required: false,
    description: 'Enable automated topic research (0 or 1)',
    validator: (val) => val === '0' || val === '1',
    defaultValue: '0',
  },

  // Cron
  {
    name: 'CRON_SECRET',
    required: false,
    description: 'Secret token for authenticating cron job requests',
    validator: (val) => val.length >= 16,
  },

  // Analytics
  {
    name: 'NEXT_PUBLIC_GOOGLE_ANALYTICS_ID',
    required: false,
    description: 'Google Analytics measurement ID',
  },

  // Pipeline Configuration
  {
    name: 'PIPELINE_POSTS_PER_DAY',
    required: false,
    description: 'Number of posts to auto-publish per day',
    validator: (val) => !isNaN(parseInt(val)) && parseInt(val) > 0,
    defaultValue: '2',
  },
  {
    name: 'PIPELINE_AUTO_PUBLISH',
    required: false,
    description: 'Enable auto-publishing in pipeline (true or false)',
    validator: (val) => val === 'true' || val === 'false',
    defaultValue: 'true',
  },
  {
    name: 'PIPELINE_AUTO_PUBLISH_QUALITY_THRESHOLD',
    required: false,
    description: 'Minimum SEO score for auto-publishing (0-100)',
    validator: (val) => !isNaN(parseInt(val)) && parseInt(val) >= 0 && parseInt(val) <= 100,
    defaultValue: '85',
  },
];

/**
 * Validate all environment variables
 */
export function validateEnvironment(): EnvironmentValidationResult {
  const result: EnvironmentValidationResult = {
    isValid: true,
    missingRequired: [],
    missingOptional: [],
    warnings: [],
    errors: [],
  };

  // Check required variables
  for (const envVar of REQUIRED_ENV_VARS) {
    const value = process.env[envVar.name];

    if (!value) {
      result.isValid = false;
      result.missingRequired.push(envVar.name);
      result.errors.push(`❌ Missing required env var: ${envVar.name} - ${envVar.description}`);
      continue;
    }

    // Run validator if provided
    if (envVar.validator && !envVar.validator(value)) {
      result.isValid = false;
      result.errors.push(`❌ Invalid value for ${envVar.name} - ${envVar.description}`);
    }
  }

  // Check optional variables
  for (const envVar of OPTIONAL_ENV_VARS) {
    const value = process.env[envVar.name];

    if (!value) {
      result.missingOptional.push(envVar.name);
      result.warnings.push(`⚠️  Optional env var not set: ${envVar.name} - ${envVar.description}`);

      // Set default value if provided
      if (envVar.defaultValue) {
        result.warnings.push(`   → Using default value: ${envVar.defaultValue}`);
      }
      continue;
    }

    // Run validator if provided
    if (envVar.validator && !envVar.validator(value)) {
      result.warnings.push(`⚠️  Invalid value for ${envVar.name} - ${envVar.description}`);
    }
  }

  // Check for AI provider availability
  const hasAbacusAI = !!process.env.ABACUSAI_API_KEY;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;

  if (!hasAbacusAI && !hasOpenAI) {
    result.errors.push('❌ No AI provider configured - need at least one of ABACUSAI_API_KEY or OPENAI_API_KEY');
    result.isValid = false;
  } else if (!hasAbacusAI) {
    result.warnings.push('⚠️  ABACUSAI_API_KEY not set - using OpenAI as only provider (no fallback)');
  } else if (!hasOpenAI) {
    result.warnings.push('⚠️  OPENAI_API_KEY not set - using AbacusAI as only provider (no fallback)');
  }

  // Check AWS S3 configuration (all or nothing)
  const awsVars = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION', 'AWS_S3_BUCKET'];
  const awsConfigured = awsVars.filter(v => !!process.env[v]);

  if (awsConfigured.length > 0 && awsConfigured.length < awsVars.length) {
    result.warnings.push(`⚠️  Partial AWS S3 configuration detected. Need all of: ${awsVars.join(', ')}`);
  }

  return result;
}

/**
 * Print environment validation results
 */
export function printValidationResults(result: EnvironmentValidationResult): void {
  console.log('\n📋 Environment Variable Validation\n');
  console.log('═'.repeat(60));

  if (result.isValid) {
    console.log('✅ All required environment variables are set and valid\n');
  } else {
    console.log('❌ Environment validation FAILED\n');
  }

  // Print errors
  if (result.errors.length > 0) {
    console.log('🔴 ERRORS:');
    result.errors.forEach(err => console.log(`  ${err}`));
    console.log('');
  }

  // Print warnings
  if (result.warnings.length > 0) {
    console.log('⚠️  WARNINGS:');
    result.warnings.forEach(warn => console.log(`  ${warn}`));
    console.log('');
  }

  // Print summary
  console.log('📊 SUMMARY:');
  console.log(`  Required variables: ${REQUIRED_ENV_VARS.length - result.missingRequired.length}/${REQUIRED_ENV_VARS.length} configured`);
  console.log(`  Optional variables: ${OPTIONAL_ENV_VARS.length - result.missingOptional.length}/${OPTIONAL_ENV_VARS.length} configured`);
  console.log('═'.repeat(60));
  console.log('');

  if (!result.isValid) {
    console.log('💡 TIP: Copy .env.example to .env and configure all required variables\n');
  }
}

/**
 * Validate and throw error if invalid (use in production)
 */
export function validateEnvironmentOrThrow(): void {
  const result = validateEnvironment();

  if (!result.isValid) {
    printValidationResults(result);
    throw new Error('Environment validation failed - missing required variables');
  }

  // Print warnings even if valid
  if (result.warnings.length > 0 && process.env.NODE_ENV !== 'production') {
    printValidationResults(result);
  }
}

/**
 * Get feature flags validation summary
 */
export function getFeatureFlagsStatus(): Record<string, boolean> {
  return {
    PHASE4B_ENABLED: process.env.FEATURE_PHASE4B_ENABLED === '1',
    CONTENT_PIPELINE: process.env.FEATURE_CONTENT_PIPELINE === '1',
    AI_SEO_AUDIT: process.env.FEATURE_AI_SEO_AUDIT === '1',
    AUTO_PUBLISHING: process.env.FEATURE_AUTO_PUBLISHING === '1',
    TOPIC_RESEARCH: process.env.TOPIC_RESEARCH === '1',
  };
}
