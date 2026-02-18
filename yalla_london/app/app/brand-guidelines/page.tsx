export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { Metadata } from 'next';
import { BrandGuidelinesContent } from './brand-guidelines-content';

export const metadata: Metadata = {
  title: 'Brand Guidelines - Yalla London',
  description: 'Official brand guidelines for Yalla London. Logo usage, color palette, typography, iconography, and UI components.',
  robots: { index: false, follow: false },
  openGraph: {
    title: 'Yalla London Brand Guidelines',
    description: 'Official brand guidelines and design system for Yalla London.',
    type: 'website',
  },
};

export default function BrandGuidelinesPage() {
  return <BrandGuidelinesContent />;
}
