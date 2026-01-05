/**
 * Environment Configuration
 * Centralized environment detection and configuration for multi-environment deployments
 */

export type Environment = 'development' | 'staging' | 'production';

/**
 * Detect current environment based on various signals
 */
export function getEnvironment(): Environment {
  // Explicit environment variable takes precedence
  const explicitEnv = process.env.APP_ENV || process.env.NEXT_PUBLIC_APP_ENV;
  if (explicitEnv === 'staging' || explicitEnv === 'production' || explicitEnv === 'development') {
    return explicitEnv;
  }

  // Vercel-specific detection
  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv === 'production') return 'production';
  if (vercelEnv === 'preview') return 'staging';
  if (vercelEnv === 'development') return 'development';

  // Branch-based detection (for Vercel deployments)
  const gitBranch = process.env.VERCEL_GIT_COMMIT_REF || process.env.GITHUB_REF_NAME;
  if (gitBranch === 'main' || gitBranch === 'master') return 'production';
  if (gitBranch === 'staging' || gitBranch === 'develop') return 'staging';

  // URL-based detection
  const url = process.env.VERCEL_URL || process.env.NEXTAUTH_URL || '';
  if (url.includes('staging') || url.includes('preview')) return 'staging';
  if (url.includes('localhost') || url.includes('127.0.0.1')) return 'development';

  // Default to development for safety
  return process.env.NODE_ENV === 'production' ? 'production' : 'development';
}

/**
 * Environment-specific configuration
 */
export interface EnvConfig {
  environment: Environment;
  isProduction: boolean;
  isStaging: boolean;
  isDevelopment: boolean;

  // Feature flags
  features: {
    aiContent: boolean;
    autopilot: boolean;
    socialPosting: boolean;
    emailCampaigns: boolean;
    pdfGeneration: boolean;
    analyticsSync: boolean;
    debugMode: boolean;
  };

  // Rate limits (requests per minute)
  rateLimits: {
    api: number;
    aiGeneration: number;
    socialPosting: number;
  };

  // Logging
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    verbose: boolean;
  };
}

/**
 * Get environment-specific configuration
 */
export function getEnvConfig(): EnvConfig {
  const env = getEnvironment();

  const baseConfig = {
    environment: env,
    isProduction: env === 'production',
    isStaging: env === 'staging',
    isDevelopment: env === 'development',
  };

  // Environment-specific overrides
  switch (env) {
    case 'production':
      return {
        ...baseConfig,
        features: {
          aiContent: process.env.ENABLE_AI_CONTENT === 'true',
          autopilot: process.env.ENABLE_AUTOPILOT === 'true',
          socialPosting: process.env.ENABLE_SOCIAL_POSTING === 'true',
          emailCampaigns: process.env.ENABLE_EMAIL_CAMPAIGNS === 'true',
          pdfGeneration: process.env.ENABLE_PDF_GENERATION === 'true',
          analyticsSync: process.env.ENABLE_ANALYTICS_SYNC === 'true',
          debugMode: false,
        },
        rateLimits: {
          api: 100,
          aiGeneration: 20,
          socialPosting: 10,
        },
        logging: {
          level: 'warn',
          verbose: false,
        },
      };

    case 'staging':
      return {
        ...baseConfig,
        features: {
          aiContent: true,
          autopilot: true,
          socialPosting: false, // Disabled in staging for safety
          emailCampaigns: false, // Disabled in staging for safety
          pdfGeneration: true,
          analyticsSync: true,
          debugMode: true,
        },
        rateLimits: {
          api: 200, // Higher limits for testing
          aiGeneration: 50,
          socialPosting: 5,
        },
        logging: {
          level: 'debug',
          verbose: true,
        },
      };

    case 'development':
    default:
      return {
        ...baseConfig,
        features: {
          aiContent: true,
          autopilot: true,
          socialPosting: true,
          emailCampaigns: true,
          pdfGeneration: true,
          analyticsSync: true,
          debugMode: true,
        },
        rateLimits: {
          api: 1000, // No limits in dev
          aiGeneration: 100,
          socialPosting: 100,
        },
        logging: {
          level: 'debug',
          verbose: true,
        },
      };
  }
}

// Export singleton config
export const envConfig = getEnvConfig();
export const currentEnv = getEnvironment();
