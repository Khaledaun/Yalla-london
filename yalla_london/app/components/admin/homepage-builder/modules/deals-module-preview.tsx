'use client'

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tag, Star, MapPin, Clock } from 'lucide-react';

export interface DealsModulePreviewProps {
  module: {
    content: {
      title: string;
      maxItems: number;
      layout: 'grid' | 'carousel' | 'list';
      showPrices: boolean;
    };
  };
}

// Sample deals data for preview
const sampleDeals = [
  {
    id: 1,
    title: 'London Bridge Tower Experience',
    description: 'Skip-the-line access to the famous glass bridge with panoramic city views',
    image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400',
    originalPrice: 45,
    dealPrice: 29,
    discount: 36,
    rating: 4.8,
    location: 'London Bridge',
    duration: '2 hours',
    badge: 'Best Seller'
  },
  {
    id: 2,
    title: 'Thames River Cruise & Dinner',
    description: 'Evening cruise with 3-course dinner and live entertainment',
    image: 'https://images.unsplash.com/photo-1520637836862-4d197d17c90a?w=400',
    originalPrice: 85,
    dealPrice: 65,
    discount: 24,
    rating: 4.6,
    location: 'Westminster Pier',
    duration: '3 hours',
    badge: 'Limited Time'
  },
  {
    id: 3,
    title: 'Royal Palaces Walking Tour',
    description: 'Guided tour of Buckingham Palace, Westminster Abbey, and more',
    image: 'https://images.unsplash.com/photo-1529655683826-3c8ca8f67e1c?w=400',
    originalPrice: 55,
    dealPrice: 39,
    discount: 29,
    rating: 4.9,
    location: 'Central London',
    duration: '4 hours',
    badge: 'New'
  },
  {
    id: 4,
    title: 'Borough Market Food Tour',
    description: 'Taste the best of London\'s food scene with local guide',
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400',
    originalPrice: 40,
    dealPrice: 28,
    discount: 30,
    rating: 4.7,
    location: 'Borough Market',
    duration: '2.5 hours',
    badge: 'Popular'
  },
  {
    id: 5,
    title: 'West End Theatre Package',
    description: 'Premium seats to a top West End show with pre-theatre dinner',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    originalPrice: 120,
    dealPrice: 89,
    discount: 26,
    rating: 4.8,
    location: 'West End',
    duration: '5 hours',
    badge: 'Premium'
  },
  {
    id: 6,
    title: 'Camden Market & Street Art Tour',
    description: 'Explore vibrant Camden with street art and market discoveries',
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400',
    originalPrice: 35,
    dealPrice: 25,
    discount: 29,
    rating: 4.5,
    location: 'Camden',
    duration: '3 hours',
    badge: 'Local Favorite'
  }
];

export function DealsModulePreview({ module }: DealsModulePreviewProps) {
  const { content } = module;
  const deals = sampleDeals.slice(0, content.maxItems);

  const getLayoutClass = () => {
    switch (content.layout) {
      case 'grid':
        return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
      case 'list':
        return 'space-y-4';
      case 'carousel':
        return 'flex gap-6 overflow-x-auto pb-4';
      default:
        return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
    }
  };

  return (
    <section className="py-16 px-4 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {content.title || 'Featured Deals'}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Discover amazing experiences and save money with our exclusive offers
          </p>
        </div>

        <div className={getLayoutClass()}>
          {deals.map((deal) => (
            <DealCard 
              key={deal.id} 
              deal={deal} 
              showPrices={content.showPrices}
              layout={content.layout}
            />
          ))}
        </div>

        {content.maxItems < sampleDeals.length && (
          <div className="text-center mt-12">
            <Button size="lg">
              View All Deals
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

interface DealCardProps {
  deal: typeof sampleDeals[0];
  showPrices: boolean;
  layout: 'grid' | 'carousel' | 'list';
}

function DealCard({ deal, showPrices, layout }: DealCardProps) {
  if (layout === 'list') {
    return (
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <div className="flex">
          <div className="w-48 h-32 relative">
            <img
              src={deal.image}
              alt={deal.title}
              className="w-full h-full object-cover"
            />
            {deal.badge && (
              <Badge className="absolute top-2 left-2 bg-red-500">
                {deal.badge}
              </Badge>
            )}
          </div>
          
          <CardContent className="flex-1 p-4">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">
                {deal.title}
              </h3>
              {showPrices && (
                <div className="text-right">
                  <div className="text-sm text-gray-500 line-through">
                    £{deal.originalPrice}
                  </div>
                  <div className="text-xl font-bold text-green-600">
                    £{deal.dealPrice}
                  </div>
                </div>
              )}
            </div>
            
            <p className="text-gray-600 text-sm mb-3 line-clamp-2">
              {deal.description}
            </p>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  {deal.rating}
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {deal.location}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {deal.duration}
                </div>
              </div>
              
              <Button size="sm">
                Book Now
              </Button>
            </div>
          </CardContent>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`overflow-hidden hover:shadow-lg transition-shadow ${layout === 'carousel' ? 'min-w-[300px]' : ''}`}>
      <div className="relative">
        <img
          src={deal.image}
          alt={deal.title}
          className="w-full h-48 object-cover"
        />
        {deal.badge && (
          <Badge className="absolute top-3 left-3 bg-red-500">
            {deal.badge}
          </Badge>
        )}
        {showPrices && deal.discount > 0 && (
          <Badge className="absolute top-3 right-3 bg-green-500">
            -{deal.discount}%
          </Badge>
        )}
      </div>
      
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
            {deal.title}
          </h3>
        </div>
        
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
          {deal.description}
        </p>
        
        <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            {deal.rating}
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {deal.location}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {deal.duration}
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          {showPrices && (
            <div>
              <div className="text-sm text-gray-500 line-through">
                £{deal.originalPrice}
              </div>
              <div className="text-xl font-bold text-green-600">
                £{deal.dealPrice}
              </div>
            </div>
          )}
          
          <Button size="sm" className="ml-auto">
            <Tag className="h-3 w-3 mr-1" />
            Book Now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}