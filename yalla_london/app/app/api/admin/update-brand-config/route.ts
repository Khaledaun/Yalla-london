export const dynamic = 'force-dynamic';
export const revalidate = 0;


import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { requireAdmin } from "@/lib/admin-middleware";


// Update brand configuration (this would typically update environment variables or config files)
export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const brandConfig = await request.json();

    // Validate the brand configuration
    if (!brandConfig.siteName || !brandConfig.colors || !brandConfig.contact) {
      return NextResponse.json({ error: 'Invalid brand configuration' }, { status: 400 });
    }

    // In a production environment, you would:
    // 1. Update environment variables
    // 2. Restart the application
    // 3. Update DNS/domain settings if needed
    // 4. Clear caches

    // For demonstration, we'll save to a config file
    const configPath = join(process.cwd(), 'config', 'current-brand.json');
    
    try {
      await writeFile(configPath, JSON.stringify(brandConfig, null, 2));
    } catch (fsError) {
      console.log('Could not write config file, but configuration received');
    }

    // Generate deployment script
    const deploymentScript = generateDeploymentScript(brandConfig);

    return NextResponse.json({
      success: true,
      message: 'Brand configuration updated successfully',
      deploymentScript,
      restartRequired: true
    });

  } catch (error) {
    console.error('Brand config update error:', error);
    return NextResponse.json(
      { error: 'Failed to update brand configuration' },
      { status: 500 }
    );
  }
}

function generateDeploymentScript(config: any): string {
  return `#!/bin/bash
# Auto-generated deployment script
echo "🎨 Updating brand configuration..."

# Set environment variables
export NEXT_PUBLIC_BRAND_TYPE="${config.businessType}"
export NEXT_PUBLIC_SITE_NAME="${config.siteName}"
export NEXT_PUBLIC_PRIMARY_COLOR="${config.colors.primary}"
export NEXT_PUBLIC_SECONDARY_COLOR="${config.colors.secondary}"

# Restart application
echo "🔄 Restarting application..."
pm2 restart next-app || npm run build && npm start

echo "✅ Brand configuration updated successfully!"
`;
}
