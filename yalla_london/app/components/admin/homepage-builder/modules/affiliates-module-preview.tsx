'use client'

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Star } from 'lucide-react';

export interface AffiliatesModulePreviewProps {
  module: {
    content: {
      title: string;
      layout: 'carousel' | 'grid';
      showLogos: boolean;
    };
  };
}

const sampleAffiliates = [
  {
    id: 1,
    name: 'TripAdvisor',
    logo: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=200',
    description: 'Book experiences with confidence',
    rating: 4.8,
    specialOffer: '10% off your first booking',
    category: 'Travel'
  },
  {
    id: 2,
    name: 'Booking.com',
    logo: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=200',
    description: 'Find the perfect accommodation',
    rating: 4.6,
    specialOffer: 'Free cancellation on most hotels',
    category: 'Hotels'
  },
  {
    id: 3,
    name: 'GetYourGuide',
    logo: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=200',
    description: 'Skip-the-line tours and activities',
    rating: 4.7,
    specialOffer: '15% off guided tours',
    category: 'Tours'
  },
  {
    id: 4,
    name: 'Viator',
    logo: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=200',
    description: 'Unique experiences worldwide',
    rating: 4.5,
    specialOffer: 'Buy one get one 50% off',
    category: 'Experiences'
  },
  {
    id: 5,
    name: 'OpenTable',
    logo: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200',
    description: 'Reserve tables instantly',
    rating: 4.4,
    specialOffer: '20% off dinner reservations',
    category: 'Dining'
  },
  {
    id: 6,
    name: 'Klook',
    logo: 'https://images.unsplash.com/photo-1516997121675-4c2d1684aa3e?w=200',
    description: 'Activities and transport tickets',
    rating: 4.6,
    specialOffer: 'Flash sale - up to 30% off',
    category: 'Activities'
  }
];

export function AffiliatesModulePreview({ module }: AffiliatesModulePreviewProps) {
  const { content } = module;

  return (
    <section className="py-16 px-4 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {content.title || 'Our Partners'}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Book with confidence through our trusted partners and get exclusive deals
          </p>
        </div>

        <div className={`${
          content.layout === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
            : 'flex gap-6 overflow-x-auto pb-4'
        }`}>
          {sampleAffiliates.map((affiliate) => (
            <AffiliateCard 
              key={affiliate.id} 
              affiliate={affiliate} 
              showLogos={content.showLogos}
              layout={content.layout}
            />
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-sm text-gray-500 mb-4">
            Yalla London may earn a commission from bookings made through partner links
          </p>
          <Button variant="outline">
            View All Partners
            <ExternalLink className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </section>
  );
}

interface AffiliateCardProps {
  affiliate: typeof sampleAffiliates[0];
  showLogos: boolean;
  layout: 'carousel' | 'grid';
}

function AffiliateCard({ affiliate, showLogos, layout }: AffiliateCardProps) {
  return (
    <Card className={`overflow-hidden hover:shadow-lg transition-shadow ${
      layout === 'carousel' ? 'min-w-[280px]' : ''
    }`}>
      <CardContent className="p-6">
        {/* Logo and Name */}
        <div className="flex items-center gap-4 mb-4">
          {showLogos && (
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
              <img
                src={affiliate.logo}
                alt={`${affiliate.name} logo`}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {affiliate.name}
            </h3>
            <Badge variant="outline" className="text-xs">
              {affiliate.category}
            </Badge>
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-600 text-sm mb-4">
          {affiliate.description}
        </p>

        {/* Rating */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="font-medium">{affiliate.rating}</span>
          </div>
          <span className="text-gray-500 text-sm">Trusted partner</span>
        </div>

        {/* Special Offer */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
          <div className="text-sm font-medium text-green-800">
            Special Offer
          </div>
          <div className="text-sm text-green-700">
            {affiliate.specialOffer}
          </div>
        </div>

        {/* CTA Button */}
        <Button className="w-full" size="sm">
          Visit {affiliate.name}
          <ExternalLink className="h-3 w-3 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}