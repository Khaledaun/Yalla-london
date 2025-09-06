
// Deployment Scripts for Platform Duplication

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

echo "🚀 Deploying ${config.siteName} with brand type: ${config.brandType}"

# Set environment variables
cat > .env.production << EOF
${envVars}
EOF

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Build application
npm run build

# Deploy to Vercel (if using Vercel)
vercel --prod ${config.customDomain ? `--scope ${config.customDomain}` : ''}

echo "✅ Deployment completed for ${config.siteName}"
`;
};

// Quick deployment configurations
export const quickDeployConfigs = {
  kidsClothing: {
    brandType: 'kids-retail',
    siteName: 'Little Stars Fashion',
    envOverrides: {
      'NEXT_PUBLIC_PRIMARY_COLOR': '#FF6B9D',
      'NEXT_PUBLIC_SECONDARY_COLOR': '#4ECDC4'
    }
  },
  realEstate: {
    brandType: 'real-estate', 
    siteName: 'Prime Properties Guide',
    envOverrides: {
      'NEXT_PUBLIC_PRIMARY_COLOR': '#1E40AF',
      'NEXT_PUBLIC_SECONDARY_COLOR': '#059669'
    }
  },
  restaurantGuide: {
    brandType: 'restaurant-guide',
    siteName: 'Foodie Paradise',
    envOverrides: {
      'NEXT_PUBLIC_PRIMARY_COLOR': '#DC2626',
      'NEXT_PUBLIC_SECONDARY_COLOR': '#F59E0B'
    }
  }
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
    `npm install`,
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
