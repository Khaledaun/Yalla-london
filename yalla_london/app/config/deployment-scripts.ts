
/**
 * Deployment Scripts — Zenitha.Luxury LLC Content Network
 *
 * Generates deployment scripts for sites in the Zenitha content arm.
 * Each site uses the luxury-guide brand template with per-site color overrides.
 */

export interface DeploymentConfig {
  brandType: string;
  siteName: string;
  customDomain?: string;
  envOverrides?: Record<string, string>;
}

// Deployment script generator
export const generateDeploymentScript = (config: DeploymentConfig): string => {
  const envVars = [
    `NEXT_PUBLIC_BRAND_TYPE=${config.brandType}`,
    `NEXT_PUBLIC_SITE_NAME="${config.siteName}"`,
    ...(config.customDomain ? [`NEXT_PUBLIC_SITE_URL=https://${config.customDomain}`] : []),
    ...Object.entries(config.envOverrides || {}).map(([key, value]) => `${key}=${value}`)
  ].join('\n');

  return `#!/bin/bash
# Automated deployment script for ${config.siteName}
# Part of the Zenitha.Luxury LLC content network

echo "Deploying ${config.siteName} with brand type: ${config.brandType}"

# Set environment variables
cat > .env.production << EOF
${envVars}
EOF

# Install dependencies
npm install --legacy-peer-deps

# Generate Prisma client
npx prisma generate

# Build application
npm run build

# Deploy to Vercel (if using Vercel)
vercel --prod ${config.customDomain ? `--scope ${config.customDomain}` : ''}

echo "Deployment completed for ${config.siteName}"
`;
};

// Quick deployment configurations for Zenitha content network sites
export const quickDeployConfigs = {
  yallaLondon: {
    brandType: 'luxury-guide',
    siteName: 'Yalla London',
    customDomain: 'yalla-london.com',  // Intentional: this is the actual production domain for Yalla London deployments
    envOverrides: {
      'NEXT_PUBLIC_PRIMARY_COLOR': '#C8322B',
      'NEXT_PUBLIC_SECONDARY_COLOR': '#C49A2A'
    }
  },
  arabaldives: {
    brandType: 'luxury-guide',
    siteName: 'Arabaldives',
    customDomain: 'arabaldives.com',
    envOverrides: {
      'NEXT_PUBLIC_PRIMARY_COLOR': '#0891B2',
      'NEXT_PUBLIC_SECONDARY_COLOR': '#06B6D4'
    }
  },
};

// CLI command generator
export const generateCLICommands = (brandType: string): string[] => {
  return [
    `# Clone the platform`,
    `git clone [your-repo-url] ${brandType}-site`,
    `cd ${brandType}-site`,
    ``,
    `# Set brand configuration`,
    `echo "NEXT_PUBLIC_BRAND_TYPE=${brandType}" > .env.local`,
    ``,
    `# Install and setup`,
    `npm install --legacy-peer-deps`,
    `npx prisma generate`,
    `npx prisma db push`,
    `npx prisma db seed`,
    ``,
    `# Start development`,
    `npm run dev`,
    ``,
    `# Or deploy to production`,
    `npm run build`,
    `vercel --prod`
  ];
};
