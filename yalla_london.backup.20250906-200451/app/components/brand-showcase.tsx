
'use client';

import { useState } from 'react';
import { useBrandConfig } from '@/hooks/use-brand-config';
import { brandTemplates, type BusinessType } from '@/config/brand-templates';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function BrandShowcase() {
  const { config, translations, colors } = useBrandConfig();
  const [selectedBrand, setSelectedBrand] = useState<BusinessType>(config.businessType);

  const handleBrandSwitch = (brandType: BusinessType) => {
    // In a real implementation, this would trigger a page reload with new config
    console.log(`Switching to brand: ${brandType}`);
    alert(`To switch brands, run: node scripts/switch-brand.js ${brandType}`);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-center">
            🎨 Brand Platform Demonstration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold gradient-brand-text mb-2">
              {translations.siteName}
            </h2>
            <p className="text-lg text-gray-600 mb-4">
              {translations.tagline}
            </p>
            <p className="text-gray-600">
              {translations.description}
            </p>
          </div>

          <div className="flex justify-center space-x-4 mb-6">
            <div 
              className="w-16 h-16 rounded-lg flex items-center justify-center text-white font-bold text-xl"
              style={{ backgroundColor: colors.primary }}
            >
              {translations.siteName.charAt(0)}
            </div>
            <div 
              className="w-16 h-16 rounded-lg flex items-center justify-center text-white font-bold text-xl"
              style={{ backgroundColor: colors.secondary }}
            >
              {translations.siteName.charAt(1) || '★'}
            </div>
            <div 
              className="w-16 h-16 rounded-lg flex items-center justify-center text-white font-bold text-xl"
              style={{ backgroundColor: colors.accent }}
            >
              {translations.siteName.charAt(2) || '✦'}
            </div>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-500 mb-4">
              Current Brand: <span className="font-semibold">{config.businessType}</span>
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Available Brand Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {Object.entries(brandTemplates).map(([key, template]) => (
              <div 
                key={key}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedBrand === key 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedBrand(key as BusinessType)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold">{template.siteName}</h3>
                    <p className="text-sm text-gray-600">{template.tagline}</p>
                    <div className="flex space-x-2 mt-2">
                      <div 
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: template.colors.primary }}
                      />
                      <div 
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: template.colors.secondary }}
                      />
                      <div 
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: template.colors.accent }}
                      />
                    </div>
                  </div>
                  <Button
                    variant={selectedBrand === key ? "default" : "outline"}
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBrandSwitch(key as BusinessType);
                    }}
                  >
                    {selectedBrand === key ? 'Current' : 'Switch'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>CLI Commands</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
            <div># Switch brand configurations</div>
            <div>npm run switch-brand kids-retail</div>
            <div>npm run switch-brand real-estate</div>
            <div>npm run switch-brand luxury-guide</div>
            <br />
            <div># Create new brand template</div>
            <div>npm run create-brand</div>
            <br />
            <div># Deploy with specific brand</div>
            <div>NEXT_PUBLIC_BRAND_TYPE=kids-retail npm run build</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
