export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { BrandShowcase } from '@/components/brand-showcase';

export default function BrandShowcasePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12">
      <BrandShowcase />
    </div>
  );
}

export const metadata = {
  title: 'Brand Platform Showcase',
  description: 'Demonstration of the multi-brand platform system'
};
